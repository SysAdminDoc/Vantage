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

const HOUR = 60 * 60 * 1000;

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
  const today = new Date();
  let sunrise = new Date(today); sunrise.setHours(6, 30, 0, 0);
  let sunset  = new Date(today); sunset.setHours(19, 30, 0, 0);
  updateScene(mount, weather, sunrise, sunset);

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

  if (location) {
    try {
      const data = await getWeatherData(location, settings.weather?.units || "fahrenheit");
      weather = CODE_TO_WEATHER[data.current?.weather_code] || "clear";
      if (data.daily?.sunrise?.[0]) sunrise = new Date(data.daily.sunrise[0]);
      if (data.daily?.sunset?.[0])  sunset  = new Date(data.daily.sunset[0]);
      // Refine the scene now that we have real sunrise/sunset/weather.
      updateScene(mount, weather, sunrise, sunset);
    } catch { /* keep current scene */ }
  }

  const tick = () => updateScene(mount, weather, sunrise, sunset);
  // Update every minute to keep sun position + phase fresh.
  const interval = setInterval(tick, 60_000);

  // Re-fetch weather every 10 minutes so storms / clearing skies follow reality.
  const refreshInterval = setInterval(async () => {
    if (!location) return;
    try {
      const data = await getWeatherData(location, settings.weather?.units || "fahrenheit", { force: true });
      weather = CODE_TO_WEATHER[data.current?.weather_code] || "clear";
      if (data.daily?.sunrise?.[0]) sunrise = new Date(data.daily.sunrise[0]);
      if (data.daily?.sunset?.[0])  sunset  = new Date(data.daily.sunset[0]);
      tick();
    } catch { /* keep last-known */ }
  }, 10 * 60 * 1000);

  return () => {
    clearInterval(interval);
    clearInterval(refreshInterval);
  };
}

// Tracks whether we've painted yet, so the very first call snaps to the
// correct colors instead of CSS-interpolating from the @property dark-gray
// initial values (which made early-evening loads feel like a sunrise).
let firstScenePainted = false;

function updateScene(mount, weather, sunrise, sunset) {
  const now = new Date();
  const phase = computePhase(now, sunrise, sunset);
  const sunPos = computeSunPosition(now, sunrise, sunset);

  // Time as fraction of day-length: 0 at sunrise, 1 at sunset. <0 before, >1 after.
  const dayMs = sunset - sunrise;
  const t = dayMs > 0 ? (now - sunrise) / dayMs : 0;
  const colors = computeSkyColors(t);

  const apply = () => {
    mount.dataset.phase = phase;
    mount.dataset.weather = weather;
    mount.style.setProperty("--sky-top",    colors.top);
    mount.style.setProperty("--sky-mid",    colors.mid);
    mount.style.setProperty("--sky-bottom", colors.bot);
    mount.style.setProperty("--sun-color",  colors.sun);
    mount.style.setProperty("--sun-glow",   colors.glow);

    // Heavy weather hides the sun behind the cloud deck. We dim hard rather
    // than full-zero so a faint glow still leaks through, which reads more
    // naturally than a flat sky.
    const stormyHide = weather === "storm" || weather === "heavy-rain";
    const overcastDim = weather === "overcast" || weather === "heavy-snow";

    const sun = mount.querySelector(".bg-sun");
    if (sun) {
      if (sunPos) {
        sun.style.left = `${(sunPos.x * 100).toFixed(2)}%`;
        sun.style.top  = `${(sunPos.y * 100).toFixed(2)}%`;
        if (stormyHide)        sun.style.opacity = "0";
        else if (overcastDim)  sun.style.opacity = "0.35";
        else                   sun.style.opacity = "1";
      } else {
        sun.style.left = "82%";
        sun.style.top  = "16%";
        if (stormyHide)        sun.style.opacity = "0";
        else if (phase === "night") sun.style.opacity = "1";
        else                   sun.style.opacity = "0.4";
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
 * Map "now" relative to today's sunrise / sunset to a phase name.
 * Uses absolute hour offsets near the boundaries so phases feel right
 * regardless of day length (winter vs summer).
 */
function computePhase(now, sunrise, sunset) {
  if (now < sunrise) {
    const before = sunrise - now;
    if (before > 1.5 * HOUR) return "night";
    return "pre-dawn";
  }
  if (now > sunset) {
    const after = now - sunset;
    if (after < 0.5 * HOUR) return "sunset";
    if (after < 1.5 * HOUR) return "dusk";
    return "night";
  }
  // daytime — split by fraction of day length
  const dayMs = sunset - sunrise;
  const t = (now - sunrise) / dayMs;     // 0..1
  if (t < 0.08) return "sunrise";
  if (t < 0.40) return "morning";
  if (t < 0.60) return "midday";
  if (t < 0.85) return "afternoon";
  if (t < 0.95) return "golden-hour";
  return "sunset";
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
