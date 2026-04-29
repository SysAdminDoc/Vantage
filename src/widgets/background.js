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
      <path d="M 87 306 Q 107 313 131 307 L 130 302 Q 108 307 88 301 Z"/>
      <path d="M 93 276 Q 109 282 126 277 L 126 272 Q 110 277 94 271 Z"/>
      <path d="M 98 248 Q 110 253 123 250 L 123 245 Q 110 248 99 243 Z"/>
      <path d="M 101 220 Q 111 225 121 222 L 121 217 Q 111 220 102 215 Z"/>
      <path d="M 103 192 Q 112 196 121 194 L 121 189 Q 112 192 104 188 Z"/>
      <path d="M 108 164 Q 115 168 123 166 L 123 161 Q 115 164 109 160 Z"/>
      <path d="M 112 140 Q 118 144 126 142 L 126 138 Q 118 140 113 136 Z"/>
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
