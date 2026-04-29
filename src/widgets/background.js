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

// Stylized coconut palm. Frond is a single feathered path defined pointing
// along +x from the origin; each <use> rotates it to its place around the
// crown anchor. Leaflet heights vary slightly along the path so the zigzag
// reads as organic instead of pixel-art.
const PALM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320" preserveAspectRatio="xMidYEnd meet">
<defs>
  <path id="vp-frond" d="
    M 0,-2 L 4,-7 L 8,-3 L 14,-12 L 19,-3 L 27,-14 L 32,-3 L 42,-13 L 47,-3
    L 58,-11 L 63,-3 L 75,-9 L 80,-3 L 91,-6 L 96,-2 L 102,-1 L 105,0
    L 102,1 L 96,2 L 91,6 L 80,3 L 75,9 L 63,3 L 58,11 L 47,3
    L 42,13 L 32,3 L 27,14 L 19,3 L 14,12 L 8,3 L 4,7 L 0,2 Z"/>
  <g id="vp-coconuts">
    <ellipse cx="0"  cy="0"  rx="5"   ry="6"/>
    <ellipse cx="-7" cy="-1" rx="4.5" ry="5"/>
    <ellipse cx="7"  cy="-1" rx="4.5" ry="5"/>
    <ellipse cx="-3" cy="6"  rx="4"   ry="5"/>
    <ellipse cx="5"  cy="6"  rx="4"   ry="5"/>
  </g>
</defs>
<g fill="#0a0a0d">
  <!-- Trunk: tapers from a wide base to a slim crown, with a slight S-curve. -->
  <path d="M 100 320
           C 95 280,  96 240, 102 196
           C 108 160, 114 130, 117 110
           L 124 110
           C 127 130, 122 160, 119 196
           C 117 240, 121 280, 130 320 Z"/>
  <!-- Frond-scar banding (the horizontal rings left by shed fronds). -->
  <g fill="#1a1a22">
    <path d="M 98 312 Q 115 314 132 312 L 132 308 Q 115 310 98 308 Z"/>
    <path d="M 96 286 Q 114 288 129 286 L 129 282 Q 114 284 96 282 Z"/>
    <path d="M 96 256 Q 113 258 126 256 L 126 252 Q 113 254 96 252 Z"/>
    <path d="M 98 226 Q 113 228 124 226 L 124 222 Q 113 224 98 222 Z"/>
    <path d="M 102 196 Q 113 198 122 196 L 122 192 Q 113 194 102 192 Z"/>
    <path d="M 106 168 Q 114 170 121 168 L 121 164 Q 114 166 106 164 Z"/>
    <path d="M 110 140 Q 116 142 121 140 L 121 136 Q 116 138 110 136 Z"/>
  </g>
  <!-- Coconut cluster, tucked under the crown. -->
  <use href="#vp-coconuts" transform="translate(118 124)"/>
  <!-- Crown of 10 fronds radiating from the top of the trunk.
       Back layer is scaled down ~85-90% so it reads as depth, front at full size,
       and the pair around 170°/10° droops slightly below horizontal. -->
  <g transform="translate(120 112)">
    <!-- back layer -->
    <use href="#vp-frond" transform="rotate(-100) scale(0.85)"/>
    <use href="#vp-frond" transform="rotate(-80)  scale(0.85)"/>
    <use href="#vp-frond" transform="rotate(-60)  scale(0.9)"/>
    <use href="#vp-frond" transform="rotate(-120) scale(0.9)"/>
    <!-- front layer -->
    <use href="#vp-frond" transform="rotate(-150)"/>
    <use href="#vp-frond" transform="rotate(-30)"/>
    <use href="#vp-frond" transform="rotate(-170) scale(0.95)"/>
    <use href="#vp-frond" transform="rotate(-10)  scale(0.95)"/>
    <!-- drooping pair -->
    <use href="#vp-frond" transform="rotate(170)  scale(0.9)"/>
    <use href="#vp-frond" transform="rotate(10)   scale(0.9)"/>
  </g>
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

function updateScene(mount, weather, sunrise, sunset) {
  const now = new Date();
  const phase = computePhase(now, sunrise, sunset);
  const sunPos = computeSunPosition(now, sunrise, sunset);

  mount.dataset.phase = phase;
  mount.dataset.weather = weather;

  const sun = mount.querySelector(".bg-sun");
  if (sun) {
    if (sunPos) {
      sun.style.left = `${(sunPos.x * 100).toFixed(2)}%`;
      sun.style.top  = `${(sunPos.y * 100).toFixed(2)}%`;
      sun.style.opacity = "1";
    } else {
      // Night: place a moon high-right.
      sun.style.left = "82%";
      sun.style.top  = "16%";
      sun.style.opacity = phase === "night" ? "1" : "0.4";
    }
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
