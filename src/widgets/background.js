// Vantage v0.4.0 — animated weather + time-of-day background.
//
// Layers (z-index inside the mount, low to high):
//   .bg-stars       night-sky stars (twinkle)
//   .bg-cloud-N     drifting cloud blobs (weather-driven)
//   .bg-fog         fog/haze overlay (foggy weather)
//   .bg-rain        rain streaks (rain / drizzle / storm)
//   .bg-snow        snow flakes (snow)
//   .bg-flash       lightning flash (storm)
//   .bg-sun         sun or moon disc, positioned along an arc
//   .bg-palm        palm-tree silhouette (golden hour / sunset)
//
// The mount carries data-phase + data-weather attributes so all visual
// styling lives in CSS. JS only sets state and positions the sun.

import { getWeatherData, detectLocation } from "../utils/weather-source.js";
import { getSunTimes } from "../utils/sun-calc.js";

const HOUR = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR;

// Sky + sun color keyframes anchored to a fractional-day timeline:
//   t = 0   -> sunrise
//   t = 1   -> sunset
//   t < 0   -> before sunrise (negative numbers = fraction of day length)
//   t > 1   -> after sunset
// Between any two keyframes we lerp every channel, so the sky moves
// continuously through the day instead of snapping at phase boundaries.
// This is what makes sunset actually feel like a sunset (starts at golden-
// hour brightness, progressively darkens) rather than holding one static
// color for 30 minutes.
const SKY_KEYFRAMES = [
  { t: -0.40, top:'#02030f', mid:'#070a22', bot:'#01020a', sun:'#e8e8f0', glow:'rgba(220,220,240,0.30)' },
  { t: -0.08, top:'#0c1230', mid:'#3a2a55', bot:'#7a4258', sun:'#f0c4a0', glow:'rgba(255,180,140,0.45)' },
  { t: -0.02, top:'#3b2855', mid:'#a85a5e', bot:'#ec8e5a', sun:'#fff0c2', glow:'rgba(255,180,120,0.60)' },
  { t:  0.02, top:'#7faecf', mid:'#f0a888', bot:'#fcd99a', sun:'#fff7c0', glow:'rgba(255,220,160,0.70)' },
  { t:  0.10, top:'#5fa4d8', mid:'#9cc9ed', bot:'#cbe4f1', sun:'#fff7c8', glow:'rgba(255,240,180,0.65)' },
  { t:  0.30, top:'#3e84d2', mid:'#79bee6', bot:'#bce2f3', sun:'#fff8d8', glow:'rgba(255,250,200,0.62)' },
  { t:  0.50, top:'#3478c8', mid:'#74bdec', bot:'#bbe0f5', sun:'#fffce0', glow:'rgba(255,252,210,0.60)' },
  { t:  0.70, top:'#4385c8', mid:'#80c0e0', bot:'#cdd0d8', sun:'#fff0b0', glow:'rgba(255,235,160,0.65)' },
  { t:  0.85, top:'#5b6a9c', mid:'#c08570', bot:'#f5b878', sun:'#ffd485', glow:'rgba(255,160,90,0.78)'  },
  { t:  0.93, top:'#5e3461', mid:'#ed7651', bot:'#fab86b', sun:'#ffc070', glow:'rgba(255,120,60,0.85)'  },
  { t:  0.98, top:'#48214e', mid:'#cf5050', bot:'#f06a3a', sun:'#ff8a4c', glow:'rgba(245,90,40,0.90)'   },
  { t:  1.02, top:'#1f0f30', mid:'#7a2a48', bot:'#b03c30', sun:'#d75030', glow:'rgba(180,50,30,0.75)'   },
  { t:  1.06, top:'#0d1130', mid:'#2c2147', bot:'#5b366a', sun:'#a8a0c8', glow:'rgba(150,150,200,0.45)' },
  { t:  1.15, top:'#06091e', mid:'#10122e', bot:'#1a1838', sun:'#d8d8e8', glow:'rgba(200,200,220,0.30)' },
  { t:  1.40, top:'#02030f', mid:'#070a22', bot:'#01020a', sun:'#e8e8f0', glow:'rgba(220,220,240,0.30)' }
];

function parseColor(s) {
  s = s.trim();
  if (s.startsWith('#')) {
    return [parseInt(s.substr(1,2),16), parseInt(s.substr(3,2),16), parseInt(s.substr(5,2),16), 1];
  }
  const m = s.match(/rgba?\s*\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(x => parseFloat(x));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return [0, 0, 0, 1];
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    a[3] + (b[3] - a[3]) * t
  ];
}

function colorToCss(c) {
  if (c[3] >= 0.999) return `rgb(${c[0]},${c[1]},${c[2]})`;
  return `rgba(${c[0]},${c[1]},${c[2]},${c[3].toFixed(2)})`;
}

function computeSkyColors(t) {
  // Clamp t to the keyframe range so we always have something to interpolate.
  if (t <= SKY_KEYFRAMES[0].t) {
    const k = SKY_KEYFRAMES[0];
    return { top: k.top, mid: k.mid, bot: k.bot, sun: k.sun, glow: k.glow };
  }
  if (t >= SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1].t) {
    const k = SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1];
    return { top: k.top, mid: k.mid, bot: k.bot, sun: k.sun, glow: k.glow };
  }
  let i = 0;
  while (i < SKY_KEYFRAMES.length - 1 && SKY_KEYFRAMES[i + 1].t <= t) i++;
  const k0 = SKY_KEYFRAMES[i];
  const k1 = SKY_KEYFRAMES[i + 1];
  const span = k1.t - k0.t;
  const u = span === 0 ? 0 : (t - k0.t) / span;
  return {
    top:  colorToCss(lerpColor(parseColor(k0.top),  parseColor(k1.top),  u)),
    mid:  colorToCss(lerpColor(parseColor(k0.mid),  parseColor(k1.mid),  u)),
    bot:  colorToCss(lerpColor(parseColor(k0.bot),  parseColor(k1.bot),  u)),
    sun:  colorToCss(lerpColor(parseColor(k0.sun),  parseColor(k1.sun),  u)),
    glow: colorToCss(lerpColor(parseColor(k0.glow), parseColor(k1.glow), u))
  };
}

const CODE_TO_WEATHER = {
  0: "clear", 1: "clear",
  2: "cloudy",
  3: "overcast",
  45: "fog", 48: "fog",
  51: "drizzle", 53: "drizzle", 55: "drizzle",
  56: "drizzle", 57: "drizzle",
  61: "rain", 63: "rain", 65: "heavy-rain",
  66: "rain", 67: "rain",
  71: "snow", 73: "snow", 75: "heavy-snow", 77: "snow",
  80: "rain", 81: "rain", 82: "heavy-rain",
  85: "snow", 86: "heavy-snow",
  95: "storm", 96: "storm", 99: "storm"
};

// Per-weather sky palette overrides. We replace the keyframe-computed
// time-of-day colors with these flat slate gradients when the weather is
// wet or overcast — this is the canonical pattern from open-source
// rain-effect references (e.g. css-rain demos): dark sky gradient + bright
// blue-white rain streaks read as actual water. Critically we do NOT use a
// CSS `filter:` on the .bg container, because it cascades to the rain
// overlays and makes them invisible. Override stays slightly time-of-day
// aware via the `nightShift` helper below: storm at noon vs storm at
// midnight should still differ.
const STORMY_SKY = {
  drizzle:      { top: '#6e7c8c', mid: '#7c8a9a', bot: '#8c98a6', cloud: 0.7 },
  overcast:     { top: '#7f9ba6', mid: '#94a4ae', bot: '#a8b5bd', cloud: 0.85 },
  rain:         { top: '#4a5a6a', mid: '#566879', bot: '#6c757d', cloud: 0.88 },
  'heavy-rain': { top: '#3a4452', mid: '#48535f', bot: '#5a6478', cloud: 0.95 },
  storm:        { top: '#1f2933', mid: '#2b3540', bot: '#4e5969', cloud: 1.00 },
  snow:         { top: '#b8c5d1', mid: '#cdd5dc', bot: '#e0e6ec', cloud: 0.7 },
  'heavy-snow': { top: '#9ba8b6', mid: '#b0bbc5', bot: '#c5ced8', cloud: 0.85 }
};

// At night we further darken stormy palettes so a storm at 2am isn't a
// gray daytime sky. `nightFactor` 0=day, 1=full night.
function darkenForNight(hex, factor) {
  const c = parseColor(hex);
  return colorToCss([
    Math.round(c[0] * (1 - factor * 0.7)),
    Math.round(c[1] * (1 - factor * 0.7)),
    Math.round(c[2] * (1 - factor * 0.65)),
    1
  ]);
}

// Stylized coconut palm. Static inline SVG only: no reusable SVG references,
// so the silhouette survives offline rasterizers as well as Chromium. The crown
// uses broad arched plume fronds with irregular leaflet edges, matching a
// classic palm icon silhouette rather than a comb-like feather.
const PALM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320" preserveAspectRatio="xMidYEnd meet">
  <g fill="#0a0a0d">
    <g transform="translate(109 130) rotate(-154) scale(0.62)">
      <path d="M 0 0 C 22 -22 58 -36 98 -34 C 122 -32 139 -24 151 -10 C 130 -14 113 -13 96 -8 L 116 6 C 96 -4 80 -3 66 4 L 83 18 C 66 9 52 11 38 19 L 52 31 C 36 23 20 20 7 23 L 19 34 C 9 25 3 13 0 0 Z"/>
    </g>
    <g transform="translate(109 126) rotate(-126) scale(0.72)">
      <path d="M 0 0 C 24 -25 64 -41 107 -36 C 131 -34 149 -25 160 -12 C 138 -16 120 -15 103 -10 L 126 4 C 104 -6 88 -5 72 1 L 91 16 C 72 6 57 8 42 16 L 57 29 C 39 20 23 17 8 21 L 22 33 C 10 24 3 12 0 0 Z"/>
    </g>
    <g transform="translate(111 124) rotate(-92) scale(0.68)">
      <path d="M 0 0 C 20 -19 52 -30 86 -29 C 109 -28 126 -20 138 -8 C 119 -12 103 -11 88 -7 L 107 6 C 88 -3 73 -1 59 6 L 75 19 C 59 11 45 13 32 20 L 45 32 C 31 25 18 23 6 25 L 17 35 C 8 26 2 14 0 0 Z"/>
    </g>
    <g transform="translate(112 126) rotate(-62) scale(0.74)">
      <path d="M 0 0 C 24 -25 64 -41 107 -36 C 131 -34 149 -25 160 -12 C 138 -16 120 -15 103 -10 L 126 4 C 104 -6 88 -5 72 1 L 91 16 C 72 6 57 8 42 16 L 57 29 C 39 20 23 17 8 21 L 22 33 C 10 24 3 12 0 0 Z"/>
    </g>
    <g transform="translate(112 130) rotate(-24) scale(0.68)">
      <path d="M 0 0 C 22 -22 58 -36 98 -34 C 122 -32 139 -24 151 -10 C 130 -14 113 -13 96 -8 L 116 6 C 96 -4 80 -3 66 4 L 83 18 C 66 9 52 11 38 19 L 52 31 C 36 23 20 20 7 23 L 19 34 C 9 25 3 13 0 0 Z"/>
    </g>
    <g transform="translate(110 134) rotate(18) scale(0.64)">
      <path d="M 0 0 C 20 -19 52 -30 86 -29 C 109 -28 126 -20 138 -8 C 119 -12 103 -11 88 -7 L 107 6 C 88 -3 73 -1 59 6 L 75 19 C 59 11 45 13 32 20 L 45 32 C 31 25 18 23 6 25 L 17 35 C 8 26 2 14 0 0 Z"/>
    </g>
    <g transform="translate(109 138) rotate(62) scale(0.58)">
      <path d="M 0 0 C 20 -19 52 -30 86 -29 C 109 -28 126 -20 138 -8 C 119 -12 103 -11 88 -7 L 107 6 C 88 -3 73 -1 59 6 L 75 19 C 59 11 45 13 32 20 L 45 32 C 31 25 18 23 6 25 L 17 35 C 8 26 2 14 0 0 Z"/>
    </g>
    <g transform="translate(106 138) rotate(124) scale(0.58)">
      <path d="M 0 0 C 20 -19 52 -30 86 -29 C 109 -28 126 -20 138 -8 C 119 -12 103 -11 88 -7 L 107 6 C 88 -3 73 -1 59 6 L 75 19 C 59 11 45 13 32 20 L 45 32 C 31 25 18 23 6 25 L 17 35 C 8 26 2 14 0 0 Z"/>
    </g>
    <g transform="translate(106 134) rotate(162) scale(0.64)">
      <path d="M 0 0 C 22 -22 58 -36 98 -34 C 122 -32 139 -24 151 -10 C 130 -14 113 -13 96 -8 L 116 6 C 96 -4 80 -3 66 4 L 83 18 C 66 9 52 11 38 19 L 52 31 C 36 23 20 20 7 23 L 19 34 C 9 25 3 13 0 0 Z"/>
    </g>
    <path d="M 78 320 C 89 314 102 310 113 313 C 102 274 99 237 101 198 C 104 162 109 137 116 128 L 128 128 C 124 151 121 177 121 210 C 121 248 127 286 143 320 Z"/>
    <g fill="#1a1a22">
      <path d="M 113 308 Q 124 314 134 308 L 133 303 Q 124 309 114 302 Z"/>
      <path d="M 104 277 Q 115 281 126 277 L 126 272 Q 115 277 105 272 Z"/>
      <path d="M 104 249 Q 113 253 123 249 L 123 244 Q 113 248 105 244 Z"/>
      <path d="M 102 220 Q 110 224 119 220 L 119 215 Q 110 219 103 215 Z"/>
      <path d="M 103 192 Q 111 195 119 192 L 119 187 Q 111 190 104 187 Z"/>
      <path d="M 108 164 Q 114 167 121 164 L 121 159 Q 114 162 109 159 Z"/>
      <path d="M 111 140 Q 117 143 124 140 L 124 135 Q 117 138 112 135 Z"/>
    </g>
    <ellipse cx="111" cy="134" rx="5.3" ry="6.2" stroke="#1a1a22" stroke-width="1"/>
    <ellipse cx="120" cy="134" rx="5" ry="6" stroke="#1a1a22" stroke-width="1"/>
    <ellipse cx="116" cy="142" rx="4.6" ry="5.5" stroke="#1a1a22" stroke-width="1"/>
    <ellipse cx="125" cy="142" rx="4.4" ry="5.2" stroke="#1a1a22" stroke-width="1"/>
  </g>
</svg>`;

export async function renderBackground(mount, settings, saveSettings) {
  const enabled = settings.background?.enabled !== false;
  if (!enabled) {
    mount.innerHTML = "";
    delete mount.dataset.phase;
    delete mount.dataset.weather;
    return () => {};
  }

  // Build the scaffold once
  mount.innerHTML = `
    <div class="bg-stars" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--1" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--2" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--3" aria-hidden="true"></div>
    <div class="bg-fog" aria-hidden="true"></div>
    <div class="bg-rain" aria-hidden="true"></div>
    <div class="bg-rain bg-rain--2" aria-hidden="true"></div>
    <div class="bg-snow" aria-hidden="true"></div>
    <div class="bg-flash" aria-hidden="true"></div>
    <div class="bg-sun" aria-hidden="true"></div>
    <div class="bg-palm" aria-hidden="true">${PALM_SVG}</div>
  `;

  // ---- Render IMMEDIATELY with sensible defaults so the user never sees
  // a dark void while we wait on geolocation (~6s) and the weather fetch.
  // We refine in place once real data arrives.
  let weather = "clear";
  // Sun-event times for the location, recomputed daily. Default values
  // are placeholder times for "today, somewhere temperate" — they get
  // overwritten by getSunTimes(...) as soon as we know the lat/lon.
  const today = new Date();
  let sunTimes = {
    sunrise: new Date(today.setHours(6, 30, 0, 0)),
    sunset:  new Date(new Date().setHours(19, 30, 0, 0)),
    dawn:    new Date(new Date().setHours(6, 0, 0, 0)),
    dusk:    new Date(new Date().setHours(20, 0, 0, 0)),
    noon:    new Date(new Date().setHours(13, 0, 0, 0)),
    alwaysDay: false,
    alwaysNight: false
  };
  updateScene(mount, weather, sunTimes);

  // ---- Now resolve real location + weather in the background.
  let location = settings.weather?.location || null;

  if (!location) {
    try {
      location = await detectLocation();
      if (settings.weather) {
        settings.weather.location = location;
        await saveSettings?.(settings);
      }
    } catch { /* defaults stay */ }
  }

  // Compute sun-event times. Strategy:
  //   1) Open-Meteo's `daily.sunrise[0]` / `daily.sunset[0]` (requested
  //      with timezone=UTC, parsed with 'Z' suffix → absolute UTC moments).
  //      Open-Meteo uses NREL SPA which is the NIST-accuracy gold standard
  //      (±30 seconds, accounts for atmospheric refraction model variation
  //      and topography).
  //   2) Local astronomical sun-calc.js as a fallback (NOAA / SunCalc
  //      simplified algorithm, ±1-2 minutes) — runs when offline, when
  //      Open-Meteo is unavailable, and pre-fetch on first paint.
  //   3) Civil twilight (dawn/dusk) always comes from the local calc;
  //      Open-Meteo does not return civil twilight in the free tier.
  // Parse Open-Meteo's naive timezone=auto ISO string into an absolute-UTC
  // Date object using the response's utc_offset_seconds. The naive string
  // (e.g. "2026-04-29T06:05") represents location-local time; we treat
  // the digits as if they were UTC, then subtract the offset to recover
  // the actual UTC moment. Example: "06:05" with offset -18000s (CDT) →
  // parse as 06:05 UTC → subtract -5h → 11:05 UTC = 06:05 CDT ✓.
  const parseLocationLocal = (naive, utcOffsetSeconds) => {
    const ms = new Date(naive + "Z").getTime() - utcOffsetSeconds * 1000;
    return new Date(ms);
  };

  const recomputeSunTimes = (openMeteoData = null) => {
    if (!location) return;
    // Always start from the local astronomical calc — gives us civil
    // twilight + handles polar regions + works offline.
    const local = getSunTimes(new Date(), location.latitude, location.longitude);
    // If Open-Meteo returned daily sunrise/sunset, prefer those values
    // (NREL SPA, ±30s ground truth) over the local calc (±1-2 min).
    // Keep dawn/dusk/noon from the local calc since Open-Meteo's free
    // tier doesn't include civil twilight.
    const om = openMeteoData;
    if (om?.daily?.sunrise?.[0] && om?.daily?.sunset?.[0] && typeof om.utc_offset_seconds === "number") {
      sunTimes = {
        ...local,
        sunrise: parseLocationLocal(om.daily.sunrise[0], om.utc_offset_seconds),
        sunset:  parseLocationLocal(om.daily.sunset[0],  om.utc_offset_seconds)
      };
    } else {
      sunTimes = local;
    }
  };
  recomputeSunTimes();
  updateScene(mount, weather, sunTimes);

  if (location) {
    try {
      const data = await getWeatherData(location, settings.weather?.units || "fahrenheit");
      weather = CODE_TO_WEATHER[data.current?.weather_code] || "clear";
      recomputeSunTimes(data); // upgrade to NREL SPA precision
      updateScene(mount, weather, sunTimes);
    } catch { /* keep current scene */ }
  }

  const tick = () => updateScene(mount, weather, sunTimes);
  // Update every minute to keep sun position + phase fresh.
  const interval = setInterval(tick, 60_000);

  // Re-fetch weather every 10 minutes so storms / clearing skies follow reality.
  // The same fetch refreshes sunrise/sunset to NREL precision.
  const refreshInterval = setInterval(async () => {
    if (!location) return;
    try {
      const data = await getWeatherData(location, settings.weather?.units || "fahrenheit", { force: true });
      weather = CODE_TO_WEATHER[data.current?.weather_code] || "clear";
      recomputeSunTimes(data);
      tick();
    } catch { /* keep last-known */ }
  }, 10 * 60 * 1000);

  // Day-rollover watcher — recomputes sunrise/sunset right after the
  // current civil-day boundary at the location. We schedule a one-shot
  // timer for the moment the calendar day flips at the location's
  // longitude, then chain another. This ensures sunrise/sunset always
  // reflects "today" at the location, year-round, through DST.
  let rolloverTimeout = null;
  const scheduleRollover = () => {
    // Fire ~5 minutes past local midnight so DST jumps + leap seconds
    // settle. Compute "next local midnight at location" as solar noon
    // ± 12h: noon is the most stable astronomical anchor we have.
    const noon = sunTimes.noon || new Date();
    const nextMidnight = new Date(noon.getTime() + 12 * HOUR);
    if (nextMidnight <= new Date()) {
      nextMidnight.setTime(nextMidnight.getTime() + DAY_MS);
    }
    const ms = (nextMidnight - new Date()) + 5 * 60 * 1000;
    rolloverTimeout = setTimeout(() => {
      recomputeSunTimes();
      tick();
      scheduleRollover();
    }, Math.max(60_000, ms));
  };
  scheduleRollover();

  return () => {
    clearInterval(interval);
    clearInterval(refreshInterval);
    if (rolloverTimeout) clearTimeout(rolloverTimeout);
  };
}

// Tracks whether we've painted yet, so the very first call snaps to the
// correct colors instead of CSS-interpolating from the @property dark-gray
// initial values (which made early-evening loads feel like a sunrise).
let firstScenePainted = false;

function updateScene(mount, weather, sunTimes) {
  const now = new Date();
  const { sunrise, sunset } = sunTimes;
  const phase = computePhase(now, sunTimes);
  const sunPos = computeSunPosition(now, sunrise, sunset);

  // Time as fraction of day-length: 0 at sunrise, 1 at sunset. <0 before, >1 after.
  const dayMs = sunset - sunrise;
  const t = dayMs > 0 ? (now - sunrise) / dayMs : 0;
  let colors = computeSkyColors(t);

  // Wet/overcast weather overrides the time-of-day gradient with a flat
  // stormy palette — see STORMY_SKY above for the rationale. We still
  // apply a night-darkening factor so a storm at 2am is darker than a
  // storm at noon.
  const stormy = STORMY_SKY[weather];
  if (stormy) {
    let nightFactor = 0;
    if (t < 0)        nightFactor = Math.min(1, -t * 2);   // before sunrise
    else if (t > 1)   nightFactor = Math.min(1, (t - 1) * 2); // after sunset
    colors = {
      top:  darkenForNight(stormy.top, nightFactor),
      mid:  darkenForNight(stormy.mid, nightFactor),
      bot:  darkenForNight(stormy.bot, nightFactor),
      sun:  colors.sun,    // sun gets hidden anyway via opacity
      glow: colors.glow
    };
  }

  const apply = () => {
    mount.dataset.phase = phase;
    mount.dataset.weather = weather;
    mount.style.setProperty("--sky-top",    colors.top);
    mount.style.setProperty("--sky-mid",    colors.mid);
    mount.style.setProperty("--sky-bottom", colors.bot);
    mount.style.setProperty("--sun-color",  colors.sun);
    mount.style.setProperty("--sun-glow",   colors.glow);

    // Wet/heavy weather hides or dims the sun behind the cloud deck. Rain
    // gets full hide because a visible warm sun behind rain streaks reads
    // unnatural. Drizzle keeps a faint sun (it's light rain). Overcast and
    // heavy-snow dim heavily but leave a cool diffuse disc.
    const sunHide = weather === "storm" || weather === "heavy-rain" || weather === "rain";
    const sunDim  = weather === "overcast" || weather === "heavy-snow" || weather === "drizzle";

    const sun = mount.querySelector(".bg-sun");
    if (sun) {
      if (sunPos) {
        sun.style.left = `${(sunPos.x * 100).toFixed(2)}%`;
        sun.style.top  = `${(sunPos.y * 100).toFixed(2)}%`;
        if (sunHide)      sun.style.opacity = "0";
        else if (sunDim)  sun.style.opacity = "0.3";
        else              sun.style.opacity = "1";
      } else {
        sun.style.left = "82%";
        sun.style.top  = "16%";
        if (sunHide)                sun.style.opacity = "0";
        else if (phase === "night") sun.style.opacity = "1";
        else                        sun.style.opacity = "0.4";
      }
    }
  };

  if (!firstScenePainted) {
    // Snap the first paint to the correct colors so we never visibly
    // transition from the @property dark-gray initial values.
    mount.classList.add("bg--no-transition");
    apply();
    // Force a reflow before re-enabling transitions.
    void mount.offsetWidth;
    mount.classList.remove("bg--no-transition");
    firstScenePainted = true;
  } else {
    apply();
  }
}

/**
 * Map "now" relative to the day's astronomical events to a phase name.
 *
 * Phase boundaries use civil twilight (h = -6°) for the "pre-dawn" /
 * "dusk" cutoffs instead of fixed hour offsets — civil twilight is when
 * the sky genuinely starts brightening / finishes darkening, and its
 * duration varies by latitude and time of year (~30 min near the
 * equator, ~90 min in summer at northern latitudes). This makes the
 * sky transition feel right anywhere on Earth.
 *
 * Polar regions: when the sun never rises (alwaysNight) we hold "night";
 * when it never sets (alwaysDay) we hold "midday".
 */
function computePhase(now, sunTimes) {
  const { sunrise, sunset, dawn, dusk, alwaysDay, alwaysNight } = sunTimes;

  if (alwaysNight) return "night";
  if (alwaysDay)   return "midday";

  // Before today's civil dawn → fully dark
  if (dawn && now < dawn) return "night";

  // Civil dawn → sunrise = "pre-dawn" (sky brightening, sun still below)
  if (sunrise && now < sunrise) return "pre-dawn";

  // After sunset → dusk progression
  if (sunset && now > sunset) {
    if (dusk && now < dusk) {
      // 0..1 progress from sunset to dusk
      const span = dusk - sunset;
      const k = (now - sunset) / span;
      return k < 0.5 ? "sunset" : "dusk";
    }
    return "night";
  }

  // Daytime — split by fraction of day length
  const dayMs = sunset - sunrise;
  const t = (now - sunrise) / dayMs;     // 0..1
  if (t < 0.05) return "sunrise";        // first ~5% of day = orange-warm
  if (t < 0.40) return "morning";
  if (t < 0.60) return "midday";
  if (t < 0.82) return "afternoon";
  if (t < 0.95) return "golden-hour";
  return "sunset";                        // last 5% of day before actual sunset event
}

/**
 * Returns { x, y } in 0..1 viewport-relative coordinates while the sun is up,
 * or null when below the horizon. East (rise) is left, west (set) is right.
 */
function computeSunPosition(now, sunrise, sunset) {
  const t = (now - sunrise) / (sunset - sunrise);
  if (t < 0 || t > 1) return null;
  const x = 0.06 + t * 0.88;                   // 6% to 94% horizontal
  const arc = Math.sin(t * Math.PI);            // 0..1..0 (peaks at noon)
  const y = 0.86 - arc * 0.72;                  // 86% (low horizon) → 14% (high noon)
  return { x, y };
}
