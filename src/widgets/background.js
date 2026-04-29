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

const PALM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 320" preserveAspectRatio="xMidYEnd meet">
<g fill="#0a0a0d">
  <!-- trunk -->
  <path d="M93 320 C 92 280 90 240 95 200 C 99 165 104 135 108 105 L 116 105 C 119 135 122 165 122 200 C 122 240 124 280 122 320 Z"/>
  <!-- trunk segments -->
  <path d="M95 305 L 121 305 L 119 295 L 96 295 Z M97 270 L 120 270 L 118 260 L 99 260 Z M100 230 L 119 230 L 117 220 L 102 220 Z M103 190 L 117 190 L 115 180 L 105 180 Z M105 150 L 116 150 L 114 142 L 107 142 Z M107 120 L 114 120 L 112 112 L 109 112 Z" fill="#000"/>
  <!-- coconuts cluster at top -->
  <circle cx="106" cy="103" r="6"/>
  <circle cx="115" cy="102" r="5"/>
  <circle cx="111" cy="108" r="5"/>
  <!-- fronds: long curved leaves radiating from top -->
  <!-- left side fronds -->
  <path d="M108 100 Q 60 80 8 60 Q 4 50 8 42 Q 60 60 110 95 Z"/>
  <path d="M108 98 Q 50 60 16 18 Q 16 8 26 4 Q 70 50 112 92 Z"/>
  <path d="M108 100 Q 65 100 22 110 Q 14 116 18 124 Q 70 116 112 102 Z"/>
  <!-- right side fronds -->
  <path d="M112 100 Q 160 80 196 56 Q 200 48 196 40 Q 152 62 110 95 Z"/>
  <path d="M112 98 Q 170 60 192 14 Q 192 6 180 4 Q 144 50 110 92 Z"/>
  <path d="M112 100 Q 158 102 192 110 Q 200 116 196 124 Q 150 118 110 102 Z"/>
  <!-- center / back fronds -->
  <path d="M110 96 Q 110 50 100 8 Q 108 0 116 8 Q 120 50 114 96 Z"/>
  <path d="M108 100 Q 95 70 70 40 Q 76 30 86 30 Q 102 60 110 96 Z"/>
  <path d="M114 100 Q 132 70 152 40 Q 146 30 136 30 Q 122 60 114 96 Z"/>
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
