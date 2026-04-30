// Vantage — background subsystem.
// background.kind dispatch: "animated" | "solid" | "gradient" | "image-url" | "image-upload" | "bing-daily"
//
// Animated-mode layers (z-index inside the mount, low to high):
//   .bg-stars         night-sky stars (twinkle)
//   .bg-aurora        aurora borealis (high latitude, clear night)
//   .bg-constellation constellation outlines (deep night, hemisphere-aware)
//   .bg-shooting-star transient streak across the sky (night phases)
//   .bg-cloud-N       drifting cloud blobs (weather-driven)
//   .bg-rays          crepuscular sun rays (golden hour through cloud breaks)
//   .bg-fog           fog/haze overlay (foggy weather)
//   .bg-rain          rain streaks (rain / drizzle / storm)
//   .bg-snow          snow flakes (snow)
//   .bg-petals        spring cherry-blossom drift (temperate, spring)
//   .bg-leaves        autumn falling leaves (temperate, autumn)
//   .bg-fireflies     summer twilight fireflies (temperate, summer)
//   .bg-flash         full lightning flash (storm)
//   .bg-horizon-flash distant lightning at horizon (rain without storm)
//   .bg-sun           sun or moon disc, positioned along an arc
//   .bg-birds         V-formation flock crossing sky (clear daylight)
//   .bg-mountains     distant mountain silhouettes (3-layer parallax)
//   .bg-tree          biome-aware foreground tree (palm/pine/oak)
//
// The mount carries data-phase + data-weather + data-biome + data-season
// + data-hemisphere attributes so all visual styling lives in CSS.
// JS only sets state and positions the sun + spawns transient particles.

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

// Stylized pine tree silhouette — boreal latitudes (50–66°).
// Stacked triangular crown layers narrow toward the top; thin trunk.
const PINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 320" preserveAspectRatio="xMidYEnd meet">
  <g fill="#0a0a0d">
    <path d="M80 14 L52 78 L62 78 L40 132 L54 132 L28 192 L48 192 L18 252 L72 252 L72 320 L88 320 L88 252 L142 252 L112 192 L132 192 L106 132 L120 132 L98 78 L108 78 Z"/>
  </g>
</svg>`;

// Stylized deciduous (oak/maple) silhouette — temperate latitudes (23–50°).
// Bushy multi-lobed crown over a tapered trunk with a couple of low branches.
const OAK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320" preserveAspectRatio="xMidYEnd meet">
  <g fill="#0a0a0d">
    <path d="M110 30 C 70 30 36 56 36 100 C 16 110 6 132 14 156 C 4 178 14 204 38 212 C 28 232 44 254 70 252 C 76 270 102 278 122 268 C 144 280 174 264 178 240 C 200 236 216 212 208 190 C 220 170 218 144 200 132 C 206 102 184 70 150 64 C 144 42 128 30 110 30 Z"/>
    <path d="M104 200 L98 320 L122 320 L116 200 Z"/>
    <path d="M104 240 Q 78 252 60 246 L 76 256 Q 96 264 104 256 Z"/>
    <path d="M116 232 Q 142 240 158 230 L 144 246 Q 124 254 116 244 Z"/>
  </g>
</svg>`;

// Distant mountain ranges — three layers for parallax. Each layer is its
// own SVG so it can be opacity/blur tuned independently in CSS.
const MOUNTAINS_FAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 200" preserveAspectRatio="xMidYEnd slice">
  <path fill="#0a0a0d" d="M0 200 L0 140 L80 110 L160 130 L240 80 L320 110 L420 60 L500 100 L580 70 L680 110 L760 50 L860 90 L940 70 L1040 100 L1120 60 L1200 90 L1200 200 Z"/>
</svg>`;
const MOUNTAINS_MID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 220" preserveAspectRatio="xMidYEnd slice">
  <path fill="#0a0a0d" d="M0 220 L0 160 L100 120 L200 150 L300 90 L420 130 L540 80 L660 120 L780 70 L880 110 L980 80 L1080 120 L1200 90 L1200 220 Z"/>
</svg>`;
const MOUNTAINS_NEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYEnd slice">
  <path fill="#0a0a0d" d="M0 240 L0 200 L120 130 L260 180 L400 100 L540 160 L680 110 L820 170 L960 120 L1080 180 L1200 140 L1200 240 Z"/>
</svg>`;

// V-formation bird flock. Each bird is two arcs forming the wing-flap shape.
// CSS animates the flock translation across the sky.
const BIRDS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
  <g fill="none" stroke="#0a0a0d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path class="bird bird-1" d="M50 20 Q 56 14 62 20 Q 68 14 74 20"/>
    <path class="bird bird-2" d="M70 32 Q 76 26 82 32 Q 88 26 94 32"/>
    <path class="bird bird-3" d="M90 18 Q 96 12 102 18 Q 108 12 114 18"/>
    <path class="bird bird-4" d="M110 28 Q 116 22 122 28 Q 128 22 134 28"/>
    <path class="bird bird-5" d="M130 14 Q 136 8 142 14 Q 148 8 154 14"/>
  </g>
</svg>`;

// Big Dipper (Ursa Major) — visible in northern hemisphere mid-latitudes.
// Seven stars connected by faint lines at canonical relative positions.
const BIG_DIPPER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 120">
  <g fill="white" stroke="rgba(255,255,255,0.18)" stroke-width="0.8">
    <line x1="40" y1="50" x2="90" y2="58"/>
    <line x1="90" y1="58" x2="135" y2="50"/>
    <line x1="135" y1="50" x2="170" y2="56"/>
    <line x1="170" y1="56" x2="210" y2="42"/>
    <line x1="210" y1="42" x2="240" y2="28"/>
    <line x1="170" y1="56" x2="200" y2="78"/>
    <line x1="135" y1="50" x2="155" y2="80"/>
    <line x1="155" y1="80" x2="200" y2="78"/>
    <circle cx="40"  cy="50" r="2.8"/>
    <circle cx="90"  cy="58" r="2.4"/>
    <circle cx="135" cy="50" r="2.6"/>
    <circle cx="170" cy="56" r="2.4"/>
    <circle cx="210" cy="42" r="3.2"/>
    <circle cx="240" cy="28" r="2.5"/>
    <circle cx="200" cy="78" r="2.6"/>
    <circle cx="155" cy="80" r="2.2"/>
  </g>
</svg>`;

// Southern Cross (Crux) — visible in southern hemisphere.
const SOUTHERN_CROSS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200">
  <g fill="white" stroke="rgba(255,255,255,0.18)" stroke-width="0.8">
    <line x1="80" y1="20" x2="80" y2="170"/>
    <line x1="30" y1="100" x2="125" y2="90"/>
    <circle cx="80"  cy="20"  r="3"/>
    <circle cx="80"  cy="170" r="3.4"/>
    <circle cx="30"  cy="100" r="2.6"/>
    <circle cx="125" cy="90"  r="2.8"/>
    <circle cx="60"  cy="120" r="1.8"/>
  </g>
</svg>`;

// ---- Locality + season helpers ----

/** Returns the biome name for a given latitude. */
function getBiome(lat) {
  if (lat == null) return "temperate";
  const abs = Math.abs(lat);
  if (abs < 23.5) return "tropical";
  if (abs < 50)   return "temperate";
  if (abs < 66.5) return "boreal";
  return "polar";
}

/** Returns "N" or "S" hemisphere from a latitude. */
function getHemisphere(lat) {
  return lat == null ? "N" : (lat >= 0 ? "N" : "S");
}

/** Returns season for a given date + hemisphere. Northern: Mar-May spring,
 *  Jun-Aug summer, Sep-Nov autumn, Dec-Feb winter. Southern: shifted 6 mo. */
function getSeason(date, hemisphere) {
  const m = date.getMonth(); // 0..11
  const offset = hemisphere === "S" ? 6 : 0;
  const a = (m + offset) % 12;
  if (a >= 2 && a <= 4) return "spring";
  if (a >= 5 && a <= 7) return "summer";
  if (a >= 8 && a <= 10) return "autumn";
  return "winter";
}

const BING_ENDPOINT = "https://www.bing.com/HPImageArchive.aspx?format=js&n=1&mkt=en-US";

export async function renderBackground(mount, settings, saveSettings) {
  const bg = settings.background || {};
  const enabled = bg.enabled !== false;
  if (!enabled) {
    mount.innerHTML = "";
    mount.style.cssText = "";
    delete mount.dataset.phase;
    delete mount.dataset.weather;
    return () => {};
  }

  const kind = bg.kind || "animated";

  // ---- Static background kinds (no animation loop needed) ----
  if (kind === "solid") {
    mount.innerHTML = "";
    delete mount.dataset.phase;
    delete mount.dataset.weather;
    mount.style.background = bg.solid || "#1e1e2e";
    return () => {};
  }

  if (kind === "gradient") {
    mount.innerHTML = "";
    delete mount.dataset.phase;
    delete mount.dataset.weather;
    const g = bg.gradient || { from: "#1e1e2e", to: "#313244", angle: 135 };
    mount.style.background = `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
    return () => {};
  }

  if (kind === "image-url" || kind === "image-upload") {
    const src = kind === "image-url" ? bg.imageUrl : bg.imageData;
    if (!src) {
      mount.innerHTML = "";
      mount.style.background = "#1e1e2e";
      return () => {};
    }
    applyImageBackground(mount, src, bg);
    return () => {};
  }

  if (kind === "bing-daily") {
    mount.innerHTML = "";
    delete mount.dataset.phase;
    delete mount.dataset.weather;

    const today = new Date().toISOString().slice(0, 10);
    const cached = bg.bingDailyCache;

    const applyBing = (url) => {
      applyImageBackground(mount, url, bg);
    };

    if (cached?.date === today && cached.url) {
      applyBing(cached.url);
    } else {
      if (cached?.url) applyBing(cached.url);
      try {
        const res  = await fetch(BING_ENDPOINT);
        const data = await res.json();
        const path = data?.images?.[0]?.url;
        if (path) {
          const url = `https://www.bing.com${path}`;
          if (typeof saveSettings === "function") {
            settings.background.bingDailyCache = { url, date: today };
            await saveSettings(settings);
          }
          applyBing(url);
        }
      } catch { /* keep cached or blank */ }
    }
    return () => {};
  }

  // ---- Animated (default) ----

  // Build the scaffold once. Layers are ordered low-to-high so cascade
  // matches z-stacking — sky-tinted background first, foreground last.
  mount.innerHTML = `
    <div class="bg-stars" aria-hidden="true"></div>
    <div class="bg-aurora" aria-hidden="true"></div>
    <div class="bg-constellation bg-constellation--north" aria-hidden="true">${BIG_DIPPER_SVG}</div>
    <div class="bg-constellation bg-constellation--south" aria-hidden="true">${SOUTHERN_CROSS_SVG}</div>
    <div class="bg-shooting-star-host" aria-hidden="true"></div>
    <div class="bg-plane-host" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--1" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--2" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--3" aria-hidden="true"></div>
    <div class="bg-rays" aria-hidden="true"></div>
    <div class="bg-fog" aria-hidden="true"></div>
    <div class="bg-rain" aria-hidden="true"></div>
    <div class="bg-rain bg-rain--2" aria-hidden="true"></div>
    <div class="bg-snow" aria-hidden="true"></div>
    <div class="bg-petals" aria-hidden="true"></div>
    <div class="bg-leaves" aria-hidden="true"></div>
    <div class="bg-fireflies" aria-hidden="true"></div>
    <div class="bg-flash" aria-hidden="true"></div>
    <div class="bg-horizon-flash" aria-hidden="true"></div>
    <div class="bg-sun" aria-hidden="true"></div>
    <div class="bg-birds-host" aria-hidden="true"></div>
    <div class="bg-mountains bg-mountains--far"  aria-hidden="true">${MOUNTAINS_FAR_SVG}</div>
    <div class="bg-mountains bg-mountains--mid"  aria-hidden="true">${MOUNTAINS_MID_SVG}</div>
    <div class="bg-mountains bg-mountains--near" aria-hidden="true">${MOUNTAINS_NEAR_SVG}</div>
    <div class="bg-tree bg-tree--palm" aria-hidden="true">${PALM_SVG}</div>
    <div class="bg-tree bg-tree--pine" aria-hidden="true">${PINE_SVG}</div>
    <div class="bg-tree bg-tree--oak"  aria-hidden="true">${OAK_SVG}</div>
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
    sunrise:          new Date(today.setHours(6, 30, 0, 0)),
    sunset:           new Date(new Date().setHours(19, 30, 0, 0)),
    dawn:             new Date(new Date().setHours(6, 0, 0, 0)),
    dusk:             new Date(new Date().setHours(20, 0, 0, 0)),
    goldenHourEnd:    new Date(new Date().setHours(7, 15, 0, 0)),
    goldenHourStart:  new Date(new Date().setHours(18, 45, 0, 0)),
    nauticalDawn:     new Date(new Date().setHours(5, 30, 0, 0)),
    nauticalDusk:     new Date(new Date().setHours(20, 30, 0, 0)),
    astronomicalDawn: new Date(new Date().setHours(5, 0, 0, 0)),
    astronomicalDusk: new Date(new Date().setHours(21, 0, 0, 0)),
    noon:             new Date(new Date().setHours(13, 0, 0, 0)),
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

  // Stash latitude on the mount so updateScene + spawners can derive
  // biome/season/hemisphere without re-threading the value through args.
  mount._bgLat = location?.latitude ?? null;

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

  // ---- Shooting stars: random transient streaks during night phases.
  // A new streak appears every 30-90 seconds. We append a div, animate
  // it via CSS keyframes, then remove on animationend.
  const shootingHost = mount.querySelector(".bg-shooting-star-host");
  const isNightPhase = (p) =>
    p === "night" || p === "astronomical-night" ||
    p === "astronomical-dusk" || p === "astronomical-dawn" ||
    p === "nautical-dusk" || p === "nautical-dawn";

  let shootingTimer = null;
  function scheduleShootingStar() {
    const delay = 30000 + Math.random() * 60000; // 30-90s
    shootingTimer = setTimeout(() => {
      if (shootingHost && isNightPhase(mount.dataset.phase) &&
          weather !== "storm" && weather !== "rain" && weather !== "heavy-rain" &&
          weather !== "fog" && weather !== "overcast") {
        const star = document.createElement("div");
        star.className = "bg-shooting-star";
        // Random position in the upper half of the sky.
        star.style.setProperty("--ss-x", `${5 + Math.random() * 60}%`);
        star.style.setProperty("--ss-y", `${5 + Math.random() * 35}%`);
        // Vary streak angle slightly so they don't all look identical.
        star.style.setProperty("--ss-angle", `${20 + Math.random() * 25}deg`);
        shootingHost.appendChild(star);
        star.addEventListener("animationend", () => star.remove());
      }
      scheduleShootingStar();
    }, delay);
  }
  scheduleShootingStar();

  // ---- Bird flock: V-formation crossing the sky during clear daytime.
  // Reuses a single hosted SVG; we trigger a CSS animation by toggling
  // a class for one full cross-sky pass every few minutes.
  const birdsHost = mount.querySelector(".bg-birds-host");
  if (birdsHost) birdsHost.innerHTML = BIRDS_SVG;
  let birdTimer = null;
  function scheduleBirdFlock() {
    const delay = 90000 + Math.random() * 180000; // 1.5-4.5min between flyovers
    birdTimer = setTimeout(() => {
      const dayPhase = ["morning", "midday", "afternoon", "golden-hour", "sunrise"].includes(mount.dataset.phase);
      const calm = weather === "clear" || weather === "cloudy";
      if (birdsHost && dayPhase && calm) {
        // Vary altitude per pass.
        birdsHost.style.setProperty("--bird-y", `${15 + Math.random() * 30}%`);
        // Re-trigger the keyframe by removing/adding the active class.
        birdsHost.classList.remove("bg-birds-host--flying");
        // Force reflow so the animation actually restarts.
        void birdsHost.offsetWidth;
        birdsHost.classList.add("bg-birds-host--flying");
      }
      scheduleBirdFlock();
    }, delay);
  }
  // Trigger one flyover ~5s after first paint so users see the feature
  // sooner than the 1.5-min cadence would otherwise allow.
  const initialBirdTimer = setTimeout(() => {
    const dayPhase = ["morning", "midday", "afternoon", "golden-hour", "sunrise"].includes(mount.dataset.phase);
    const calm = weather === "clear" || weather === "cloudy";
    if (birdsHost && dayPhase && calm) {
      birdsHost.style.setProperty("--bird-y", `${15 + Math.random() * 30}%`);
      birdsHost.classList.add("bg-birds-host--flying");
    }
  }, 5000);
  scheduleBirdFlock();

  // ---- Plane lights: small blinking dot crossing the sky at dusk/night.
  // Cheaper than birds — just one element with a long linear translation
  // and a separate blink animation on a child light.
  const planeHost = mount.querySelector(".bg-plane-host");
  let planeTimer = null;
  function schedulePlane() {
    const delay = 60000 + Math.random() * 180000; // 1-4 min
    planeTimer = setTimeout(() => {
      const eligible = ["dusk", "nautical-dusk", "astronomical-dusk", "night",
                        "astronomical-night", "astronomical-dawn", "nautical-dawn"]
                       .includes(mount.dataset.phase);
      const calm = weather === "clear" || weather === "cloudy";
      if (planeHost && eligible && calm) {
        const plane = document.createElement("div");
        plane.className = "bg-plane";
        plane.style.setProperty("--plane-y", `${10 + Math.random() * 25}%`);
        // Reverse direction half the time for variety.
        plane.style.setProperty("--plane-dir", Math.random() < 0.5 ? "1" : "-1");
        planeHost.appendChild(plane);
        plane.addEventListener("animationend", () => plane.remove());
      }
      schedulePlane();
    }, delay);
  }
  schedulePlane();

  return () => {
    clearInterval(interval);
    clearInterval(refreshInterval);
    if (rolloverTimeout) clearTimeout(rolloverTimeout);
    if (shootingTimer) clearTimeout(shootingTimer);
    if (birdTimer) clearTimeout(birdTimer);
    if (initialBirdTimer) clearTimeout(initialBirdTimer);
    if (planeTimer) clearTimeout(planeTimer);
  };
}

function applyImageBackground(mount, src, bg) {
  mount.innerHTML = "";
  delete mount.dataset.phase;
  delete mount.dataset.weather;
  const blur = Math.min(20, Math.max(0, bg.blur ?? 0));
  const brightness = Math.min(150, Math.max(50, bg.brightness ?? 100));
  mount.style.backgroundImage    = `url(${CSS.escape ? src : JSON.stringify(src)})`;
  mount.style.backgroundSize     = "cover";
  mount.style.backgroundPosition = "center";
  mount.style.backgroundRepeat   = "no-repeat";
  mount.style.filter = (blur > 0 || brightness !== 100)
    ? `blur(${blur}px) brightness(${brightness / 100})`
    : "";
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

    // Locality-driven attributes — read by CSS to choose tree/mountains/aurora/season particles.
    // We attach the latitude on the mount as a closure-shared field so the
    // spawners can read it without needing to thread it through arguments.
    const lat = mount._bgLat;
    if (lat != null) {
      mount.dataset.biome      = getBiome(lat);
      mount.dataset.hemisphere = getHemisphere(lat);
      mount.dataset.season     = getSeason(now, getHemisphere(lat));
      // Aurora eligibility: high latitude (|lat|>=55°) AND clear-ish night.
      const auroraEligible = Math.abs(lat) >= 55 &&
        (weather === "clear" || weather === "cloudy") &&
        (phase === "night" || phase === "astronomical-night" ||
         phase === "astronomical-dusk" || phase === "astronomical-dawn");
      mount.dataset.aurora = auroraEligible ? "on" : "off";
    } else {
      mount.dataset.biome      = "temperate";
      mount.dataset.hemisphere = "N";
      mount.dataset.season     = getSeason(now, "N");
      mount.dataset.aurora     = "off";
    }

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
 * Map "now" to a phase name using the full set of astronomical events.
 *
 * Phases (night-to-night):
 *   astronomical-night → astronomical-dawn → nautical-dawn → pre-dawn
 *   → sunrise → golden-hour-am → morning → midday → afternoon
 *   → golden-hour → sunset → dusk → nautical-dusk → astronomical-dusk
 *   → astronomical-night
 *
 * CSS uses data-phase for star/moon visibility and subtle overlay accents.
 * The sky gradient is driven by t (fraction of day) independently.
 *
 * Polar regions: alwaysNight → "astronomical-night"; alwaysDay → "midday".
 */
function computePhase(now, sunTimes) {
  const {
    sunrise, sunset, dawn, dusk,
    goldenHourEnd, goldenHourStart,
    nauticalDawn, nauticalDusk,
    astronomicalDawn, astronomicalDusk,
    alwaysDay, alwaysNight
  } = sunTimes;

  if (alwaysNight) return "astronomical-night";
  if (alwaysDay)   return "midday";

  // ---- Night / pre-dawn progression (ascending) ----
  if (astronomicalDawn && now < astronomicalDawn) return "astronomical-night";
  if (nauticalDawn      && now < nauticalDawn)     return "astronomical-dawn";
  if (dawn              && now < dawn)             return "nautical-dawn";
  if (sunrise           && now < sunrise)          return "pre-dawn";

  // ---- After sunset descending progression ----
  if (sunset && now > sunset) {
    if (dusk              && now < dusk)             {
      const span = dusk - sunset;
      const k = (now - sunset) / span;
      return k < 0.5 ? "sunset" : "dusk";
    }
    if (nauticalDusk      && now < nauticalDusk)     return "nautical-dusk";
    if (astronomicalDusk  && now < astronomicalDusk) return "astronomical-dusk";
    return "astronomical-night";
  }

  // ---- Daytime — driven by actual golden-hour event times ----
  // Morning golden hour: sunrise → goldenHourEnd (sun at +6°)
  if (goldenHourEnd && now < goldenHourEnd) return "sunrise";

  // Evening golden hour: goldenHourStart (sun drops to +6°) → sunset
  if (goldenHourStart && now > goldenHourStart) return "golden-hour";

  // Mid-day split by fraction of the remaining daylight window
  const dayStart = goldenHourEnd  || sunrise;
  const dayEnd   = goldenHourStart || sunset;
  const dayMs    = dayEnd - dayStart;
  const t        = dayMs > 0 ? (now - dayStart) / dayMs : 0;   // 0..1

  if (t < 0.33) return "morning";
  if (t < 0.60) return "midday";
  return "afternoon";
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
