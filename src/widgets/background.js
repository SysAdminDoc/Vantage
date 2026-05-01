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
//   .bg-sun           sun disc, positioned along the daytime arc
//   .bg-moon          textured lunar phase disc for twilight/night
//   .bg-birds         V-formation flock crossing sky (clear daylight)
//   .bg-mountains     distant atmospheric mountain ridges (3-layer parallax)
//   .bg-scene-depth   locality-aware haze and ground atmosphere
//   .bg-ocean         coastal water plane with subtle wave drift
//   .bg-meadow        low meadow foreground for inland temperate scenes
//   .bg-forestline    distant tree line for forest/boreal scenes
//   .bg-lake          reflective lake foreground
//   .bg-dunes         desert dune foreground
//   .bg-icefield      polar ice/snow foreground
//   .bg-tree          biome-aware foreground tree (palm/pine/oak)
//   .bg-holiday-glow  holiday-specific atmosphere accents
//
// The mount carries data-phase + data-weather + data-biome + data-season
// + data-hemisphere + data-locality + data-region attributes so all visual
// styling lives in CSS.
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

const WEATHER_VALUES = new Set(Object.values(CODE_TO_WEATHER));
const LOCALITY_VALUES = new Set([
  "auto",
  "coastal",
  "urban",
  "forest",
  "lake",
  "mountain",
  "desert",
  "polar",
  "tropical",
  "meadow",
  "default"
]);

function normalizeWeatherOverride(value) {
  return WEATHER_VALUES.has(value) ? value : null;
}

function normalizeLocalityOverride(value) {
  return LOCALITY_VALUES.has(value) ? value : null;
}

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
const PALM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320" preserveAspectRatio="xMidYMax meet">
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
const PINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 320" preserveAspectRatio="xMidYMax meet">
  <g fill="#0a0a0d">
    <path d="M80 14 L52 78 L62 78 L40 132 L54 132 L28 192 L48 192 L18 252 L72 252 L72 320 L88 320 L88 252 L142 252 L112 192 L132 192 L106 132 L120 132 L98 78 L108 78 Z"/>
  </g>
</svg>`;

// Stylized deciduous (oak/maple) silhouette — temperate latitudes (23–50°).
// Bushy multi-lobed crown over a tapered trunk with a couple of low branches.
const OAK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320" preserveAspectRatio="xMidYMax meet">
  <g fill="#0a0a0d">
    <path d="M110 30 C 70 30 36 56 36 100 C 16 110 6 132 14 156 C 4 178 14 204 38 212 C 28 232 44 254 70 252 C 76 270 102 278 122 268 C 144 280 174 264 178 240 C 200 236 216 212 208 190 C 220 170 218 144 200 132 C 206 102 184 70 150 64 C 144 42 128 30 110 30 Z"/>
    <path d="M104 200 L98 320 L122 320 L116 200 Z"/>
    <path d="M104 240 Q 78 252 60 246 L 76 256 Q 96 264 104 256 Z"/>
    <path d="M116 232 Q 142 240 158 230 L 144 246 Q 124 254 116 244 Z"/>
  </g>
</svg>`;

// Distant mountain ranges — three atmospheric ridge layers for parallax. Each
// layer is its own SVG so it can be opacity/blur tuned independently in CSS.
const MOUNTAINS_FAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice">
  <path fill="currentColor" d="M0 200 L0 150 C62 143 106 145 150 132 C210 116 252 120 306 100 C372 76 436 102 492 82 C558 58 626 96 690 80 C748 66 798 102 856 88 C924 70 982 110 1048 98 C1104 88 1156 104 1200 98 L1200 200 Z"/>
  <path class="mountain-snowcap" fill="#edf4f7" opacity="0.12" d="M462 91 C474 84 486 84 500 91 L485 90 L474 86 L466 94 Z M604 88 C618 79 632 82 648 95 L630 92 L616 85 L608 96 Z M910 98 C924 89 940 92 958 106 L936 102 L924 94 L916 108 Z"/>
</svg>`;
const MOUNTAINS_MID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice">
  <path fill="currentColor" d="M0 220 L0 174 C66 160 126 166 188 138 C250 110 304 134 358 94 C420 52 480 126 536 88 C600 46 660 118 728 86 C790 56 850 130 920 102 C990 74 1040 136 1104 112 C1142 98 1174 112 1200 126 L1200 220 Z"/>
  <path class="mountain-snowcap" fill="#eff6f8" opacity="0.17" d="M326 120 C344 101 360 94 380 105 L362 107 L348 118 L336 130 Z M492 114 C510 90 528 86 552 104 L528 100 L512 94 L500 122 Z M788 112 C814 88 838 88 866 118 L838 108 L820 98 L804 130 Z"/>
</svg>`;
const MOUNTAINS_NEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice">
  <path fill="currentColor" d="M0 240 L0 214 C72 194 126 202 196 154 C260 108 318 160 382 104 C448 46 522 154 590 118 C664 80 718 168 790 114 C862 60 930 168 1008 134 C1088 98 1144 138 1200 150 L1200 240 Z"/>
  <path class="mountain-snowcap" fill="#f1f7f8" opacity="0.20" d="M206 160 C224 136 238 128 262 146 L240 144 L228 134 L216 166 Z M338 134 C356 108 376 96 406 116 L378 114 L360 106 L346 142 Z M678 136 C696 108 716 94 746 116 L720 112 L706 104 L690 144 Z M846 132 C864 116 882 112 910 138 L884 134 L870 122 L858 144 Z"/>
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

// ---- New silhouettes for additional biomes / events ----

const SAGUARO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320" preserveAspectRatio="xMidYMax meet">
  <g fill="#0a0a0d">
    <path d="M105 320 L105 260 Q 105 220 80 200 Q 60 192 50 200 L50 130 Q 50 110 65 110 Q 80 110 80 130 L80 175 Q 92 175 100 168 Q 108 160 108 145 L108 90 Q 108 60 130 60 Q 152 60 152 90 L152 165 Q 152 178 162 178 Q 172 178 172 168 L172 130 Q 172 112 188 112 Q 200 112 200 130 L200 200 Q 195 210 175 210 Q 152 215 138 230 Q 130 240 130 260 L130 320 Z"/>
  </g>
</svg>`;

const LIGHTHOUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 220" preserveAspectRatio="xMidYMax meet">
  <g fill="#0a0a0d">
    <rect x="32" y="60" width="16" height="120"/>
    <path d="M22 180 L58 180 L62 220 L18 220 Z"/>
    <rect x="28" y="40" width="24" height="14"/>
    <rect x="34" y="20" width="12" height="22"/>
    <path d="M32 12 L48 12 L40 0 Z"/>
  </g>
  <circle cx="40" cy="32" r="3" fill="rgba(255,235,180,0.95)" class="lighthouse-bulb"/>
</svg>`;

const CITY_SKYLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMax slice">
  <g fill="#0a0a0d">
    <rect x="0"    y="120" width="80"  height="60"/>
    <rect x="80"   y="90"  width="60"  height="90"/>
    <rect x="140"  y="60"  width="40"  height="120"/>
    <rect x="180"  y="100" width="70"  height="80"/>
    <rect x="250"  y="40"  width="30"  height="140"/>
    <rect x="280"  y="80"  width="60"  height="100"/>
    <rect x="340"  y="110" width="80"  height="70"/>
    <rect x="420"  y="70"  width="50"  height="110"/>
    <rect x="470"  y="20"  width="40"  height="160"/>
    <rect x="510"  y="100" width="70"  height="80"/>
    <rect x="580"  y="50"  width="36"  height="130"/>
    <rect x="616"  y="90"  width="60"  height="90"/>
    <rect x="676"  y="120" width="80"  height="60"/>
    <rect x="756"  y="80"  width="44"  height="100"/>
    <rect x="800"  y="30"  width="50"  height="150"/>
    <rect x="850"  y="60"  width="40"  height="120"/>
    <rect x="890"  y="100" width="60"  height="80"/>
    <rect x="950"  y="50"  width="30"  height="130"/>
    <rect x="980"  y="80"  width="50"  height="100"/>
    <rect x="1030" y="100" width="70"  height="80"/>
    <rect x="1100" y="70"  width="50"  height="110"/>
    <rect x="1150" y="120" width="50"  height="60"/>
  </g>
  <g class="city-windows" fill="#fef0a0" fill-opacity="0">
    <rect x="14"  y="135" width="3" height="4"/><rect x="30" y="155" width="3" height="4"/>
    <rect x="92"  y="105" width="3" height="4"/><rect x="118" y="125" width="3" height="4"/><rect x="100" y="155" width="3" height="4"/>
    <rect x="150" y="80"  width="3" height="4"/><rect x="166" y="110" width="3" height="4"/><rect x="156" y="140" width="3" height="4"/>
    <rect x="195" y="115" width="3" height="4"/><rect x="222" y="135" width="3" height="4"/>
    <rect x="258" y="60"  width="3" height="4"/><rect x="265" y="100" width="3" height="4"/><rect x="261" y="135" width="3" height="4"/>
    <rect x="295" y="100" width="3" height="4"/><rect x="320" y="125" width="3" height="4"/>
    <rect x="358" y="125" width="3" height="4"/><rect x="395" y="145" width="3" height="4"/>
    <rect x="432" y="90"  width="3" height="4"/><rect x="450" y="120" width="3" height="4"/><rect x="448" y="150" width="3" height="4"/>
    <rect x="478" y="40"  width="3" height="4"/><rect x="490" y="70"  width="3" height="4"/><rect x="488" y="100" width="3" height="4"/><rect x="498" y="135" width="3" height="4"/>
    <rect x="525" y="120" width="3" height="4"/><rect x="555" y="140" width="3" height="4"/>
    <rect x="588" y="70"  width="3" height="4"/><rect x="600" y="105" width="3" height="4"/><rect x="595" y="140" width="3" height="4"/>
    <rect x="630" y="105" width="3" height="4"/><rect x="660" y="135" width="3" height="4"/>
    <rect x="690" y="135" width="3" height="4"/><rect x="725" y="150" width="3" height="4"/>
    <rect x="765" y="100" width="3" height="4"/><rect x="785" y="135" width="3" height="4"/>
    <rect x="810" y="50"  width="3" height="4"/><rect x="820" y="85"  width="3" height="4"/><rect x="830" y="120" width="3" height="4"/>
    <rect x="858" y="80"  width="3" height="4"/><rect x="876" y="110" width="3" height="4"/><rect x="868" y="145" width="3" height="4"/>
    <rect x="905" y="120" width="3" height="4"/><rect x="935" y="145" width="3" height="4"/>
    <rect x="958" y="70"  width="3" height="4"/><rect x="965" y="110" width="3" height="4"/>
    <rect x="990" y="100" width="3" height="4"/><rect x="1015" y="140" width="3" height="4"/>
    <rect x="1042" y="125" width="3" height="4"/><rect x="1070" y="145" width="3" height="4"/>
    <rect x="1110" y="90"  width="3" height="4"/><rect x="1130" y="125" width="3" height="4"/>
    <rect x="1160" y="135" width="3" height="4"/>
  </g>
</svg>`;

// Bat — replaces birds at dusk. Single SVG with five irregular silhouettes.
const BATS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet">
  <g fill="#0a0a0d">
    <path class="bat bat-1" d="M40 30 Q 30 20 22 28 Q 30 26 36 32 L 38 28 Q 40 24 42 28 L 44 32 Q 50 26 58 28 Q 50 20 40 30 Z"/>
    <path class="bat bat-2" d="M80 50 Q 70 40 62 48 Q 70 46 76 52 L 78 48 Q 80 44 82 48 L 84 52 Q 90 46 98 48 Q 90 40 80 50 Z"/>
    <path class="bat bat-3" d="M120 24 Q 110 14 102 22 Q 110 20 116 26 L 118 22 Q 120 18 122 22 L 124 26 Q 130 20 138 22 Q 130 14 120 24 Z"/>
    <path class="bat bat-4" d="M160 44 Q 150 34 142 42 Q 150 40 156 46 L 158 42 Q 160 38 162 42 L 164 46 Q 170 40 178 42 Q 170 34 160 44 Z"/>
  </g>
</svg>`;

// Whale fluke breaching for coastal locations.
const WHALE_FLUKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" preserveAspectRatio="xMidYMax meet">
  <g fill="#0a0a0d">
    <path d="M80 100 Q 88 80 96 60 Q 100 40 90 20 Q 84 14 78 18 Q 86 28 86 40 Q 84 52 78 60 Q 96 56 110 60 Q 124 56 142 60 Q 136 52 134 40 Q 134 28 142 18 Q 136 14 130 20 Q 120 40 124 60 Q 132 80 140 100 Z"/>
  </g>
  <ellipse cx="100" cy="98" rx="60" ry="3" fill="rgba(255,255,255,0.4)"/>
</svg>`;

// Deer silhouette — boreal/temperate dawn.
const DEER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 160" preserveAspectRatio="xMidYMax meet">
  <g fill="#0a0a0d">
    <path d="M48 80 L48 130 L40 145 L46 150 L52 130 L62 130 L62 145 L70 150 L72 130 L88 130 L88 145 L96 150 L100 130 L110 130 L110 145 L118 150 L120 130 L122 90 Q 122 75 105 75 L 70 75 Q 50 70 48 80 Z"/>
    <path d="M40 75 Q 36 70 38 60 Q 26 56 28 50 L 38 52 L 36 38 L 42 50 L 46 32 L 48 50 L 56 38 L 52 56 Q 58 60 60 70 Q 56 78 48 75 Z"/>
    <circle cx="44" cy="68" r="1.5" fill="#fff" opacity="0.6"/>
  </g>
</svg>`;

// Butterfly — small fluttering for spring/summer temperate.
const BUTTERFLY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 50" preserveAspectRatio="xMidYMid meet">
  <g fill="#d97c52" fill-opacity="0.85">
    <path class="bf-wing-l" d="M30 25 Q 12 8 8 18 Q 4 30 14 32 Q 22 30 30 25 Z"/>
    <path class="bf-wing-r" d="M30 25 Q 48 8 52 18 Q 56 30 46 32 Q 38 30 30 25 Z"/>
  </g>
  <ellipse cx="30" cy="25" rx="1.5" ry="6" fill="#0a0a0d"/>
</svg>`;

// Jack-o'-lantern (Halloween) — small pumpkin with carved face.
const JACK_O_LANTERN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
  <g>
    <ellipse cx="25" cy="30" rx="20" ry="17" fill="#e87b1c"/>
    <ellipse cx="12" cy="30" rx="6" ry="14" fill="#c25e10" opacity="0.45"/>
    <ellipse cx="38" cy="30" rx="6" ry="14" fill="#c25e10" opacity="0.45"/>
    <path d="M22 12 Q 22 6 28 6 L 26 12 Z" fill="#3a5e2a"/>
    <path d="M14 27 L 19 23 L 19 30 Z" fill="#1a0a0a"/>
    <path d="M36 27 L 31 23 L 31 30 Z" fill="#1a0a0a"/>
    <path d="M14 38 Q 18 34 22 36 L 22 40 Q 18 38 14 41 Z" fill="#1a0a0a"/>
    <path d="M28 36 Q 32 34 36 38 L 36 41 Q 32 38 28 40 Z" fill="#1a0a0a"/>
    <rect x="22" y="34" width="2" height="4" fill="#1a0a0a"/>
    <rect x="26" y="34" width="2" height="4" fill="#1a0a0a"/>
  </g>
</svg>`;

// Santa's sleigh + reindeer (Christmas Eve).
const SLEIGH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70">
  <g fill="#0a0a0d">
    <path d="M150 40 Q 160 28 180 30 L 200 32 Q 210 36 208 50 L 200 56 L 156 56 Q 146 56 148 46 Z"/>
    <rect x="180" y="22" width="6" height="14"/>
    <path d="M148 56 L 210 56" stroke="#0a0a0d" stroke-width="2"/>
    <path d="M30 50 Q 40 35 60 38 L 75 38 Q 78 50 75 56 L 60 56 Q 50 56 48 50 Z"/>
    <path d="M58 38 L 60 28 L 56 28 L 60 24 L 64 28 L 60 38" stroke-linecap="round"/>
    <line x1="75" y1="48" x2="148" y2="48" stroke="#0a0a0d" stroke-width="1.5"/>
    <circle cx="90"  cy="48" r="2"/>
    <circle cx="105" cy="48" r="2"/>
    <circle cx="120" cy="48" r="2"/>
    <circle cx="135" cy="48" r="2"/>
  </g>
  <circle cx="62" cy="34" r="1.5" fill="#ff4040"/>
</svg>`;

// Balloon for birthdays — single bunch of three.
const BALLOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90">
  <g>
    <ellipse cx="20" cy="20" rx="10" ry="13" fill="#f38ba8"/>
    <ellipse cx="40" cy="14" rx="10" ry="13" fill="#89b4fa"/>
    <ellipse cx="30" cy="32" rx="10" ry="13" fill="#a6e3a1"/>
    <path d="M20 33 Q 22 50 26 60 Q 28 75 24 88" stroke="rgba(255,255,255,0.55)" stroke-width="0.8" fill="none"/>
    <path d="M40 27 Q 36 50 30 60 Q 28 75 30 88" stroke="rgba(255,255,255,0.55)" stroke-width="0.8" fill="none"/>
    <path d="M30 45 Q 30 60 30 75 Q 28 82 28 88" stroke="rgba(255,255,255,0.55)" stroke-width="0.8" fill="none"/>
  </g>
</svg>`;

// ---- Astronomical helpers ----

/** Lunar phase 0..1. 0/1 = new moon, 0.5 = full moon. */
function getMoonPhase(date) {
  // Reference: 2000-01-06 18:14 UTC, a known new moon.
  const ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const synodic = 29.530588853;
  const days = date.getTime() / 86400000 - ref;
  const p = ((days % synodic) + synodic) % synodic / synodic;
  return p;
}

/** Generate an SVG of the moon at the given phase. Uses a mask of an
 *  offset circle to carve the dark side out of the bright disc. The
 *  offset formula is correct for both waxing (mask on left, light on
 *  right) and waning (mask on right, light on left). */
const MOON_VISIBLE_PHASES = new Set([
  "dusk",
  "nautical-dusk",
  "astronomical-dusk",
  "night",
  "astronomical-night",
  "astronomical-dawn",
  "nautical-dawn"
]);

function moonSVG(phase) {
  const R = 50;
  const d = phase < 0.5 ? -4 * R * phase : 4 * R * (1 - phase);
  // Unique mask id per render so multiple SVGs in the document don't clash.
  const mid = "moonM_" + Math.random().toString(36).slice(2, 8);
  const pid = "moonT_" + Math.random().toString(36).slice(2, 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
    <defs>
      <mask id="${mid}">
        <rect width="100" height="100" fill="white"/>
        <circle cx="${50 + d}" cy="50" r="50" fill="black"/>
      </mask>
      <pattern id="${pid}" patternUnits="userSpaceOnUse" width="100" height="100">
        <image href="assets/backgrounds/moon-surface.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>
      </pattern>
    </defs>
    <circle cx="50" cy="50" r="48" fill="#f0f0f5" mask="url(#${mid})"/>
    <circle cx="50" cy="50" r="48" fill="url(#${pid})" mask="url(#${mid})" opacity="0.82"/>
    <g fill="#d8d8e0" mask="url(#${mid})" opacity="0.16">
      <circle cx="36" cy="38" r="4"/>
      <circle cx="58" cy="32" r="3"/>
      <circle cx="68" cy="56" r="5"/>
      <circle cx="40" cy="62" r="3.5"/>
      <circle cx="56" cy="70" r="2.5"/>
    </g>
  </svg>`;
}

/** Returns an integer multiplier for shooting star frequency on known
 *  meteor-shower peak dates (1 = normal, 4 = peak burst). */
function meteorShowerBoost(date) {
  const m = date.getMonth() + 1; // 1..12
  const d = date.getDate();
  // Peak ±1 day window.
  const peaks = [
    [1,  3], [1,  4],   // Quadrantids
    [4, 22], [4, 23],   // Lyrids
    [5,  5], [5,  6],   // Eta Aquariids
    [8, 12], [8, 13],   // Perseids (most famous)
    [10, 8], [10, 9],   // Draconids
    [10,21], [10,22],   // Orionids
    [11,17], [11,18],   // Leonids
    [12,13], [12,14],   // Geminids
    [12,22], [12,23],   // Ursids
  ];
  return peaks.some(([pm, pd]) => pm === m && pd === d) ? 4 : 1;
}

/** Returns the active holiday key or null. Holidays apply for the full
 *  24h of their date in the user's local timezone. */
function getHoliday(date, birthdayMMDD) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 10 && d === 31) return "halloween";
  if (m === 12 && d === 24) return "christmas-eve";
  if (m === 12 && d === 25) return "christmas-day";
  if (m === 12 && d === 31) return "nye";
  if (m === 1  && d === 1)  return "new-year-day";
  if (birthdayMMDD) {
    const [bm, bd] = birthdayMMDD.split("-").map(s => parseInt(s, 10));
    if (m === bm && d === bd) return "birthday";
  }
  return null;
}

function parseSceneDateOverride(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date();
  date.setFullYear(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseSceneTimeOverride(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function parseSceneCoordinate(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function sceneNow(mount) {
  const current = new Date();
  const override = mount?._bgDateOverride;
  const timeOverride = mount?._bgTimeOverride;
  if (!override && !timeOverride) return current;
  const source = override || current;
  return new Date(
    source.getFullYear(),
    source.getMonth(),
    source.getDate(),
    timeOverride?.hours ?? current.getHours(),
    timeOverride?.minutes ?? current.getMinutes(),
    current.getSeconds(),
    current.getMilliseconds()
  );
}

/** Whether the Milky Way's galactic core is up at a given hour for the
 *  current month + hemisphere. Northern: Jun-Sep midnight. Southern:
 *  Apr-Aug midnight. We approximate "up" as deep-night phases during
 *  the appropriate months. */
function milkyWayActive(date, hemisphere) {
  const m = date.getMonth(); // 0..11
  if (hemisphere === "S") return m >= 3 && m <= 7;  // Apr-Aug
  return m >= 5 && m <= 8;                          // Jun-Sep
}

// Major desert lat/lon rectangles. Used to flag arid biomes that shouldn't
// show oak trees + leaves; we render saguaros + dust devils instead.
const DESERT_REGIONS = [
  // [latMin, latMax, lonMin, lonMax, name]
  [15, 30,   -10,   40, "sahara"],
  [15, 30,    35,   55, "arabian"],
  [25, 45,    45,  110, "central-asia"],
  [25, 40,  -120, -100, "sonoran"],
  [-30,-15,  -75,  -65, "atacama"],
  [-35,-20,  115,  145, "australian"],
  [-30,-20,   15,   25, "kalahari"],
];

// Coarse metro rectangles used only for "Auto" scenery. This avoids rendering
// generic mountain horizons for obvious city locations such as New York.
const URBAN_REGIONS = [
  // [latMin, latMax, lonMin, lonMax, name]
  [40.3, 41.1, -74.35, -73.55, "new-york"],
  [33.6, 34.4, -118.75, -117.60, "los-angeles"],
  [37.2, 38.2, -122.75, -121.70, "san-francisco-bay"],
  [41.5, 42.2,  -88.10,  -87.30, "chicago"],
  [38.6, 39.1,  -77.35,  -76.80, "washington-dc"],
  [42.1, 42.6,  -71.35,  -70.80, "boston"],
  [43.4, 44.0,  -79.85,  -79.05, "toronto"],
  [47.3, 47.9, -122.55, -121.95, "seattle"],
  [51.2, 51.8,   -0.55,    0.35, "london"],
  [48.6, 49.1,    2.00,    2.70, "paris"],
  [52.2, 52.8,   13.00,   13.80, "berlin"],
  [41.6, 42.0,   12.25,   12.75, "rome"],
  [40.2, 40.7,   -3.95,   -3.45, "madrid"],
  [1.15, 1.55,  103.55,  104.10, "singapore"],
  [35.4, 36.0,  139.30,  140.20, "tokyo"]
];

const COASTAL_REGIONS = [
  // [latMin, latMax, lonMin, lonMax, name]
  [32.4, 33.3, -117.45, -116.90, "san-diego"],
  [21.0, 21.8, -158.30, -157.40, "honolulu"],
  [25.3, 26.3,  -80.60,  -79.80, "miami"],
  [36.7, 37.3,  -76.50,  -75.70, "virginia-beach"],
  [43.0, 49.5, -125.20, -122.00, "pacific-northwest"],
  [41.0, 42.9,  -71.60,  -69.80, "new-england"],
  [36.4, 38.8, -123.10, -121.70, "central-california"],
  [51.0, 52.0,    3.70,    4.70, "dutch-coast"],
  [38.3, 39.2,   -9.60,   -8.70, "lisbon"],
  [41.1, 41.7,    1.75,    2.55, "barcelona"],
  [33.4, 34.2,  150.50,  151.50, "sydney"],
  [-23.2, -22.5, -43.80,  -42.70, "rio"],
  [-34.4, -33.4,  18.00,   19.00, "cape-town"],
  [-37.2, -36.4, 174.40,  175.20, "auckland"]
];

const LAKE_REGIONS = [
  // [latMin, latMax, lonMin, lonMax, name]
  [41.3, 49.2,  -93.20,  -75.00, "great-lakes"],
  [38.7, 39.4, -120.30, -119.75, "tahoe"],
  [45.6, 46.3,    8.40,   10.10, "italian-lakes"],
  [46.0, 47.2,    6.00,    7.80, "geneva"],
  [47.4, 47.9,    8.20,    8.80, "zurich"],
  [45.1, 45.7,    5.60,    6.30, "annecy"],
  [35.0, 36.8,  137.80,  139.10, "fuji-five-lakes"]
];

const MOUNTAIN_REGIONS = [
  // [latMin, latMax, lonMin, lonMax, name]
  [35.0, 49.5, -118.00, -104.00, "rockies"],
  [31.0, 36.8, -112.80, -105.00, "southwest-highlands"],
  [44.0, 48.5,    5.00,   16.50, "alps"],
  [27.0, 36.5,   72.00,   95.00, "himalaya"],
  [-45.0, -5.0,  -75.50,  -65.00, "andes"],
  [35.0, 37.0,  137.00,  139.50, "japanese-alps"],
  [60.0, 69.5,    5.00,   31.00, "scandes"],
  [-46.0, -40.0, 167.00,  174.00, "southern-alps-nz"]
];

function matchRegion(regions, lat, lon) {
  if (lat == null || lon == null) return null;
  const match = regions.find(([la, lb, oa, ob]) => lat >= la && lat <= lb && lon >= oa && lon <= ob);
  return match?.[4] || null;
}

/** Returns true if (lat, lon) falls inside a known desert region. */
function isDesertLocation(lat, lon) {
  return !!matchRegion(DESERT_REGIONS, lat, lon);
}

/** Returns true if (lat, lon) falls inside a known major metro region. */
function isUrbanLocation(lat, lon) {
  return !!matchRegion(URBAN_REGIONS, lat, lon);
}

function isRegionMatch(regions, lat, lon) {
  return !!matchRegion(regions, lat, lon);
}

function inferSceneRegion(lat, lon, locality = null) {
  if (locality === "urban") return matchRegion(URBAN_REGIONS, lat, lon);
  if (locality === "coastal" || locality === "tropical") return matchRegion(COASTAL_REGIONS, lat, lon);
  if (locality === "lake") return matchRegion(LAKE_REGIONS, lat, lon);
  if (locality === "mountain") return matchRegion(MOUNTAIN_REGIONS, lat, lon);
  if (locality === "desert") return matchRegion(DESERT_REGIONS, lat, lon);
  if (locality && locality !== "auto") return null;

  return (
    matchRegion(URBAN_REGIONS, lat, lon) ||
    matchRegion(COASTAL_REGIONS, lat, lon) ||
    matchRegion(LAKE_REGIONS, lat, lon) ||
    matchRegion(MOUNTAIN_REGIONS, lat, lon) ||
    matchRegion(DESERT_REGIONS, lat, lon) ||
    null
  );
}

function inferLocality(lat, lon, biome) {
  if (isUrbanLocation(lat, lon)) return "urban";
  if (biome === "tropical") return "tropical";
  if (isRegionMatch(COASTAL_REGIONS, lat, lon)) return "coastal";
  if (isRegionMatch(LAKE_REGIONS, lat, lon)) return "lake";
  if (isRegionMatch(MOUNTAIN_REGIONS, lat, lon)) return "mountain";
  if (biome === "desert") return "desert";
  if (biome === "boreal") return "forest";
  if (biome === "polar") return "polar";
  return "meadow";
}

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

const BACKGROUND_DATA_KEYS = [
  "phase",
  "weather",
  "biome",
  "season",
  "hemisphere",
  "aurora",
  "milkyWay",
  "locality",
  "region",
  "holiday",
  "rainbow",
  "firstSnow",
  "backgroundState"
];

function resetBackgroundMount(mount) {
  mount.innerHTML = "";
  mount.style.cssText = "";
  mount.classList.remove("bg--no-transition");
  for (const key of BACKGROUND_DATA_KEYS) delete mount.dataset[key];
  mount._bgLat = null;
  mount._bgLon = null;
  mount._bgBirthday = null;
  mount._bgLocality = null;
  mount._bgDateOverride = null;
  mount._bgTimeOverride = null;
  mount._bgFirstSnowAt = 0;
  mount._bgPrevWeather = null;
  mount._bgRainbowUntil = 0;
  mount._meteorBoost = 1;
  mount._bgFirstScenePainted = false;
}

function applyFallbackBackground(mount, state = "fallback") {
  resetBackgroundMount(mount);
  mount.dataset.backgroundState = state;
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

export async function renderBackground(mount, settings, saveSettings) {
  const bg = settings.background || {};
  const enabled = bg.enabled !== false;
  if (!enabled) {
    resetBackgroundMount(mount);
    return () => {};
  }

  const kind = bg.kind || "animated";

  // ---- Static background kinds (no animation loop needed) ----
  if (kind === "solid") {
    resetBackgroundMount(mount);
    mount.style.background = bg.solid || "#1e1e2e";
    return () => {};
  }

  if (kind === "gradient") {
    resetBackgroundMount(mount);
    const g = bg.gradient || { from: "#1e1e2e", to: "#313244", angle: 135 };
    mount.style.background = `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
    return () => {};
  }

  if (kind === "image-url" || kind === "image-upload") {
    const src = kind === "image-url" ? bg.imageUrl : bg.imageData;
    if (!src) {
      applyFallbackBackground(mount, "missing");
      return () => {};
    }
    applyImageBackground(mount, src, bg);
    return () => {};
  }

  if (kind === "bing-daily") {
    applyFallbackBackground(mount, "loading");

    const today = new Date().toISOString().slice(0, 10);
    const cached = bg.bingDailyCache;
    let hasImage = false;

    const applyBing = (url) => {
      hasImage = true;
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
          applyBing(url);
          if (typeof saveSettings === "function") {
            settings.background.bingDailyCache = { url, date: today };
            await saveSettings(settings);
          }
        }
        if (!hasImage) applyFallbackBackground(mount, "error");
      } catch {
        if (!hasImage) applyFallbackBackground(mount, "error");
      }
    }
    return () => {};
  }

  // ---- Animated (default) ----
  resetBackgroundMount(mount);

  // Build the scaffold once. Layers are ordered low-to-high so cascade
  // matches z-stacking — sky-tinted background first, foreground last.
  mount.innerHTML = `
    <div class="bg-stars" aria-hidden="true"></div>
    <div class="bg-milky-way" aria-hidden="true"></div>
    <div class="bg-aurora" aria-hidden="true"></div>
    <div class="bg-constellation bg-constellation--north" aria-hidden="true">${BIG_DIPPER_SVG}</div>
    <div class="bg-constellation bg-constellation--south" aria-hidden="true">${SOUTHERN_CROSS_SVG}</div>
    <div class="bg-venus" aria-hidden="true"></div>
    <div class="bg-shooting-star-host" aria-hidden="true"></div>
    <div class="bg-plane-host" aria-hidden="true"></div>
    <div class="bg-fireworks-host" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--1" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--2" aria-hidden="true"></div>
    <div class="bg-cloud bg-cloud--3" aria-hidden="true"></div>
    <div class="bg-rays" aria-hidden="true"></div>
    <div class="bg-sun-pillar" aria-hidden="true"></div>
    <div class="bg-halo" aria-hidden="true"></div>
    <div class="bg-rainbow" aria-hidden="true"></div>
    <div class="bg-fog" aria-hidden="true"></div>
    <div class="bg-rain" aria-hidden="true"></div>
    <div class="bg-rain bg-rain--2" aria-hidden="true"></div>
    <div class="bg-snow" aria-hidden="true"></div>
    <div class="bg-petals" aria-hidden="true"></div>
    <div class="bg-leaves" aria-hidden="true"></div>
    <div class="bg-fireflies" aria-hidden="true"></div>
    <div class="bg-butterflies-host" aria-hidden="true"></div>
    <div class="bg-flash" aria-hidden="true"></div>
    <div class="bg-horizon-flash" aria-hidden="true"></div>
    <div class="bg-heat-shimmer" aria-hidden="true"></div>
    <div class="bg-sun" aria-hidden="true"></div>
    <div class="bg-moon" aria-hidden="true"></div>
    <div class="bg-birds-host" aria-hidden="true"></div>
    <div class="bg-bats-host" aria-hidden="true">${BATS_SVG}</div>
    <div class="bg-scene-depth" aria-hidden="true"></div>
    <div class="bg-mountains bg-mountains--far"  aria-hidden="true">${MOUNTAINS_FAR_SVG}</div>
    <div class="bg-mountains bg-mountains--mid"  aria-hidden="true">${MOUNTAINS_MID_SVG}</div>
    <div class="bg-mountains bg-mountains--near" aria-hidden="true">${MOUNTAINS_NEAR_SVG}</div>
    <div class="bg-lake" aria-hidden="true"></div>
    <div class="bg-meadow" aria-hidden="true"></div>
    <div class="bg-forestline" aria-hidden="true"></div>
    <div class="bg-dunes" aria-hidden="true"></div>
    <div class="bg-icefield" aria-hidden="true"></div>
    <div class="bg-ocean" aria-hidden="true"></div>
    <div class="bg-skyline" aria-hidden="true">${CITY_SKYLINE_SVG}</div>
    <div class="bg-lighthouse" aria-hidden="true">${LIGHTHOUSE_SVG}</div>
    <div class="bg-whale-host" aria-hidden="true"></div>
    <div class="bg-deer" aria-hidden="true">${DEER_SVG}</div>
    <div class="bg-tree bg-tree--palm"    aria-hidden="true">${PALM_SVG}</div>
    <div class="bg-tree bg-tree--pine"    aria-hidden="true">${PINE_SVG}</div>
    <div class="bg-tree bg-tree--oak"     aria-hidden="true">${OAK_SVG}</div>
    <div class="bg-tree bg-tree--saguaro" aria-hidden="true">${SAGUARO_SVG}</div>
    <div class="bg-holiday-glow" aria-hidden="true"></div>
    <div class="bg-pumpkins" aria-hidden="true"></div>
    <div class="bg-sleigh" aria-hidden="true">${SLEIGH_SVG}</div>
    <div class="bg-balloons-host" aria-hidden="true"></div>
  `;

  // ---- Render IMMEDIATELY with sensible defaults so the user never sees
  // a dark void while we wait on geolocation (~6s) and the weather fetch.
  // We refine in place once real data arrives.
  const qaParams = new URLSearchParams(globalThis.location?.search || "");
  const forcedWeather = normalizeWeatherOverride(qaParams.get("qaWeather"));
  const forcedLocality = normalizeLocalityOverride(qaParams.get("qaLocality"));
  const forcedLat = parseSceneCoordinate(qaParams.get("qaLat"), -90, 90);
  const forcedLon = parseSceneCoordinate(qaParams.get("qaLon"), -180, 180);
  const forcedLocation = forcedLat == null || forcedLon == null
    ? null
    : { latitude: forcedLat, longitude: forcedLon, label: "QA scene" };
  let weather = forcedWeather || "clear";
  let location = forcedLocation || settings.weather?.location || null;
  const qaDate = qaParams.get("qaDate");
  const qaTime = qaParams.get("qaTime");

  // Seed saved scene context before the first paint. Without this, the
  // immediate render defaults to generic meadow/default scenery and the real
  // locality then fades in over the long atmospheric transition.
  mount._bgLat          = location?.latitude  ?? null;
  mount._bgLon          = location?.longitude ?? null;
  mount._bgBirthday     = settings.greeting?.birthday || null; // "MM-DD"
  mount._bgLocality     = forcedLocality || settings.appearance?.locality || "auto";
  mount._bgDateOverride = parseSceneDateOverride(qaDate || settings.background?.qaDate);
  mount._bgTimeOverride = parseSceneTimeOverride(qaTime || settings.background?.qaTime);

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
  if (!location && !forcedLocation) {
    try {
      location = await detectLocation();
      if (settings.weather) {
        settings.weather.location = location;
        await saveSettings?.(settings);
      }
    } catch { /* defaults stay */ }
  }

  // Stash locality data on the mount so updateScene + spawners can derive
  // biome/season/hemisphere/holiday without re-threading through args.
  mount._bgLat       = location?.latitude  ?? null;
  mount._bgLon       = location?.longitude ?? null;
  mount._bgBirthday  = settings.greeting?.birthday || null; // "MM-DD"
  mount._bgLocality  = forcedLocality || settings.appearance?.locality || "auto";
  // Hidden QA hook for screenshots: ?qaDate=YYYY-MM-DD forces seasonal and
  // holiday evaluation without changing the user's clock.
  mount._bgDateOverride = parseSceneDateOverride(qaDate || settings.background?.qaDate);
  mount._bgTimeOverride = parseSceneTimeOverride(qaTime || settings.background?.qaTime);

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
    const local = getSunTimes(sceneNow(mount), location.latitude, location.longitude);
    // If Open-Meteo returned daily sunrise/sunset, prefer those values
    // (NREL SPA, ±30s ground truth) over the local calc (±1-2 min).
    // Keep dawn/dusk/noon from the local calc since Open-Meteo's free
    // tier doesn't include civil twilight.
    const om = openMeteoData;
    if (!mount._bgDateOverride && om?.daily?.sunrise?.[0] && om?.daily?.sunset?.[0] && typeof om.utc_offset_seconds === "number") {
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

  // First-snow tracking: chrome.storage holds the timestamp of the first
  // snow detection in the current "snow season". If it's been > 30 days
  // since the last record (i.e., a new winter), reset the date. The
  // _bgFirstSnowAt field is read by updateScene to set data-first-snow.
  const FIRST_SNOW_KEY = "vantageFirstSnow";
  const SNOW_SEASON_GAP = 30 * 86400000; // 30 days
  const FIRST_SNOW_WINDOW = 86400000;    // 24 h
  async function loadFirstSnow() {
    const chromeApi = globalThis.chrome;
    if (!chromeApi?.storage?.local) return 0;
    try {
      const r = await chromeApi.storage.local.get(FIRST_SNOW_KEY);
      return r[FIRST_SNOW_KEY] || 0;
    } catch { return 0; }
  }
  async function saveFirstSnow(ms) {
    const chromeApi = globalThis.chrome;
    if (!chromeApi?.storage?.local) return;
    try { await chromeApi.storage.local.set({ [FIRST_SNOW_KEY]: ms }); } catch {}
  }
  mount._bgFirstSnowAt = await loadFirstSnow();
  const checkFirstSnow = async () => {
    const isSnow = weather === "snow" || weather === "heavy-snow";
    if (!isSnow) return;
    const last = mount._bgFirstSnowAt || 0;
    if (!last || (Date.now() - last) > SNOW_SEASON_GAP) {
      mount._bgFirstSnowAt = Date.now();
      await saveFirstSnow(mount._bgFirstSnowAt);
    }
  };

  // Trigger a rainbow when weather transitions from rain* → clear.
  const checkRainbowTransition = () => {
    const wasRain = ["rain", "heavy-rain", "drizzle"].includes(mount._bgPrevWeather);
    const nowClear = weather === "clear";
    if (wasRain && nowClear) {
      mount._bgRainbowUntil = Date.now() + 3 * 60 * 1000;
    }
    mount._bgPrevWeather = weather;
  };

  if (location) {
    try {
      const data = await getWeatherData(location, settings.weather?.units || "fahrenheit");
      weather = forcedWeather || CODE_TO_WEATHER[data.current?.weather_code] || "clear";
      checkRainbowTransition();
      await checkFirstSnow();
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
      weather = forcedWeather || CODE_TO_WEATHER[data.current?.weather_code] || "clear";
      checkRainbowTransition();
      await checkFirstSnow();
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

  const motionAllowed = () => !prefersReducedMotion();

  // ---- Shooting stars: random transient streaks during night phases.
  // Frequency boosts on known meteor-shower peak dates. We always fire
  // one within the first 8s of load so users immediately see the system
  // is alive (per UX brief — page-load celebration).
  const shootingHost = mount.querySelector(".bg-shooting-star-host");
  const isNightPhase = (p) =>
    p === "night" || p === "astronomical-night" ||
    p === "astronomical-dusk" || p === "astronomical-dawn" ||
    p === "nautical-dusk" || p === "nautical-dawn";

  function spawnShootingStar() {
    if (!shootingHost || !motionAllowed()) return;
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

  let shootingTimer = null;
  function scheduleShootingStar() {
    const boost = mount._meteorBoost || 1; // 4 on shower nights
    // Base 30-90s, boosted nights compress to 8-22s for a visible storm.
    const min = 30000 / boost;
    const max = 90000 / boost;
    const delay = min + Math.random() * (max - min);
    shootingTimer = setTimeout(() => {
      const allowed = isNightPhase(mount.dataset.phase) &&
        weather !== "storm" && weather !== "rain" && weather !== "heavy-rain" &&
        weather !== "fog" && weather !== "overcast";
      if (motionAllowed() && allowed) spawnShootingStar();
      scheduleShootingStar();
    }, delay);
  }
  if (motionAllowed()) scheduleShootingStar();

  // Page-load celebration: one star within ~3-8 s of load whenever the
  // sky can show one (regardless of meteor schedule).
  const initialStarTimer = motionAllowed()
    ? setTimeout(() => {
      const allowed = isNightPhase(mount.dataset.phase) &&
        weather !== "storm" && weather !== "rain" && weather !== "heavy-rain" &&
        weather !== "fog" && weather !== "overcast";
      if (motionAllowed() && allowed) spawnShootingStar();
    }, 3000 + Math.random() * 5000)
    : null;

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
      if (motionAllowed() && birdsHost && dayPhase && calm) {
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
  const initialBirdTimer = motionAllowed()
    ? setTimeout(() => {
      const dayPhase = ["morning", "midday", "afternoon", "golden-hour", "sunrise"].includes(mount.dataset.phase);
      const calm = weather === "clear" || weather === "cloudy";
      if (motionAllowed() && birdsHost && dayPhase && calm) {
        birdsHost.style.setProperty("--bird-y", `${15 + Math.random() * 30}%`);
        birdsHost.classList.add("bg-birds-host--flying");
      }
    }, 5000)
    : null;
  if (motionAllowed()) scheduleBirdFlock();

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
      if (motionAllowed() && planeHost && eligible && calm) {
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
  if (motionAllowed()) schedulePlane();

  // ---- Bats: same V-formation pattern as birds but at dusk only.
  const batsHost = mount.querySelector(".bg-bats-host");
  let batTimer = null;
  function scheduleBatFlock() {
    const delay = 45000 + Math.random() * 90000; // 45s-2.25min
    batTimer = setTimeout(() => {
      const dusky = ["dusk", "nautical-dusk", "astronomical-dusk"].includes(mount.dataset.phase);
      const calm = weather === "clear" || weather === "cloudy";
      if (motionAllowed() && batsHost && dusky && calm) {
        batsHost.style.setProperty("--bat-y", `${20 + Math.random() * 40}%`);
        batsHost.classList.remove("bg-bats-host--flying");
        void batsHost.offsetWidth;
        batsHost.classList.add("bg-bats-host--flying");
      }
      scheduleBatFlock();
    }, delay);
  }
  if (motionAllowed()) scheduleBatFlock();

  // ---- Butterflies: spring/summer temperate, daytime, low altitude.
  const butterfliesHost = mount.querySelector(".bg-butterflies-host");
  let butterflyTimer = null;
  function scheduleButterfly() {
    const delay = 60000 + Math.random() * 120000;
    butterflyTimer = setTimeout(() => {
      const eligibleSeason = ["spring", "summer"].includes(mount.dataset.season);
      const eligibleBiome  = mount.dataset.biome === "temperate";
      const dayPhase = ["morning", "midday", "afternoon", "golden-hour"].includes(mount.dataset.phase);
      const calm = weather === "clear" || weather === "cloudy";
      if (motionAllowed() && butterfliesHost && eligibleSeason && eligibleBiome && dayPhase && calm) {
        const bf = document.createElement("div");
        bf.className = "bg-butterfly";
        bf.style.setProperty("--bf-y", `${50 + Math.random() * 25}%`);
        bf.style.setProperty("--bf-tone", `hsl(${Math.floor(Math.random() * 60)}, 65%, 55%)`);
        bf.innerHTML = BUTTERFLY_SVG;
        butterfliesHost.appendChild(bf);
        bf.addEventListener("animationend", () => bf.remove());
      }
      scheduleButterfly();
    }, delay);
  }
  if (motionAllowed()) scheduleButterfly();

  // ---- NYE fireworks: random bursts all day on Dec 31. Each burst is a
  // single SVG bloom of N radial spikes spawned at a random sky position.
  const fireworksHost = mount.querySelector(".bg-fireworks-host");
  let fireworksTimer = null;
  const fireworkBurstTimers = [];
  function spawnFirework() {
    if (!fireworksHost || !motionAllowed() || !isFireworksHoliday()) return;
    const fw = document.createElement("div");
    fw.className = "bg-firework";
    fw.style.setProperty("--fw-x", `${10 + Math.random() * 80}%`);
    fw.style.setProperty("--fw-y", `${10 + Math.random() * 45}%`);
    // Random hue per burst.
    const hue = Math.floor(Math.random() * 360);
    fw.style.setProperty("--fw-color", `hsl(${hue}, 95%, 60%)`);
    // 24 spikes radially.
    const spikes = Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * 360;
      return `<i class="spike" style="--spike-angle:${angle}deg"></i>`;
    }).join("");
    fw.innerHTML = `<div class="bg-firework__core"></div>${spikes}`;
    fireworksHost.appendChild(fw);
    setTimeout(() => fw.remove(), 1800);
  }
  function queueFirework(delay) {
    const timer = setTimeout(() => {
      const idx = fireworkBurstTimers.indexOf(timer);
      if (idx >= 0) fireworkBurstTimers.splice(idx, 1);
      spawnFirework();
    }, delay);
    fireworkBurstTimers.push(timer);
  }
  function scheduleFirework() {
    const delay = 4000 + Math.random() * 9000; // 4-13s between bursts
    fireworksTimer = setTimeout(() => {
      if (motionAllowed() && fireworksHost && isFireworksHoliday()) {
        spawnFirework();
        // Burst sometimes spawns 2-3 in quick succession for finale feel.
        if (Math.random() < 0.3) queueFirework(250);
        if (Math.random() < 0.15) queueFirework(500);
      }
      scheduleFirework();
    }, delay);
  }
  function isFireworksHoliday() {
    return mount.dataset.holiday === "nye" || mount.dataset.holiday === "new-year-day";
  }
  if (motionAllowed()) {
    scheduleFirework();
    queueFirework(900);
    queueFirework(1800);
  }

  // ---- Birthday balloons: drift up across the whole sky.
  const balloonsHost = mount.querySelector(".bg-balloons-host");
  let balloonTimer = null;
  function spawnBalloon() {
    if (!motionAllowed() || !balloonsHost || mount.dataset.holiday !== "birthday") return;
    const b = document.createElement("div");
    b.className = "bg-balloon";
    b.style.setProperty("--b-x", `${5 + Math.random() * 90}%`);
    b.style.setProperty("--b-sway", Math.random() < 0.5 ? "1" : "-1");
    b.innerHTML = BALLOON_SVG;
    balloonsHost.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  }
  function scheduleBalloon() {
    const delay = 18000 + Math.random() * 30000;
    balloonTimer = setTimeout(() => {
      spawnBalloon();
      scheduleBalloon();
    }, delay);
  }
  const initialBalloonTimer = motionAllowed()
    ? setTimeout(spawnBalloon, 1200)
    : null;
  if (motionAllowed()) scheduleBalloon();

  // ---- Whale fluke: rare breach for coastal locations during daylight.
  const whaleHost = mount.querySelector(".bg-whale-host");
  let whaleTimer = null;
  function scheduleWhale() {
    const delay = 180000 + Math.random() * 240000; // 3-7min
    whaleTimer = setTimeout(() => {
      if (motionAllowed() && whaleHost && mount.dataset.locality === "coastal" &&
          ["morning", "midday", "afternoon", "golden-hour"].includes(mount.dataset.phase) &&
          (weather === "clear" || weather === "cloudy")) {
        const w = document.createElement("div");
        w.className = "bg-whale";
        w.style.setProperty("--w-x", `${20 + Math.random() * 60}%`);
        w.innerHTML = WHALE_FLUKE_SVG;
        whaleHost.appendChild(w);
        w.addEventListener("animationend", () => w.remove());
      }
      scheduleWhale();
    }, delay);
  }
  if (motionAllowed()) scheduleWhale();

  // ---- Rainbow tracking happens via mount fields so the closures used
  // by updateScene + the weather refresh interval can both update it.
  // mount._bgPrevWeather: last seen weather string, updated only when
  //   the weather actually changes
  // mount._bgRainbowUntil: epoch ms when the rainbow effect should end
  // updateScene reads _bgRainbowUntil and sets data-rainbow each tick
  // so the effect auto-clears when its 3-min window expires.
  mount._bgPrevWeather  = weather;
  mount._bgRainbowUntil = 0;

  // ---- Mouse parallax: mountains shift left/right slightly with cursor.
  // Use one global handler on the document; ignore if reduced motion.
  const onMouseMove = (e) => {
    if (!motionAllowed()) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
    mount.style.setProperty("--parallax-x", x.toFixed(3));
  };
  if (motionAllowed()) document.addEventListener("mousemove", onMouseMove, { passive: true });

  return () => {
    clearInterval(interval);
    clearInterval(refreshInterval);
    if (rolloverTimeout) clearTimeout(rolloverTimeout);
    if (shootingTimer) clearTimeout(shootingTimer);
    if (initialStarTimer) clearTimeout(initialStarTimer);
    if (birdTimer) clearTimeout(birdTimer);
    if (initialBirdTimer) clearTimeout(initialBirdTimer);
    if (planeTimer) clearTimeout(planeTimer);
    if (batTimer) clearTimeout(batTimer);
    if (butterflyTimer) clearTimeout(butterflyTimer);
    if (fireworksTimer) clearTimeout(fireworksTimer);
    for (const timer of fireworkBurstTimers) clearTimeout(timer);
    if (initialBalloonTimer) clearTimeout(initialBalloonTimer);
    if (balloonTimer) clearTimeout(balloonTimer);
    if (whaleTimer) clearTimeout(whaleTimer);
    document.removeEventListener("mousemove", onMouseMove);
  };
}

function applyImageBackground(mount, src, bg) {
  resetBackgroundMount(mount);
  mount.dataset.backgroundState = "image";
  const blur = Math.min(20, Math.max(0, bg.blur ?? 0));
  const brightness = Math.min(150, Math.max(50, bg.brightness ?? 100));
  mount.style.backgroundImage    = `url(${JSON.stringify(src)})`;
  mount.style.backgroundSize     = "cover";
  mount.style.backgroundPosition = "center";
  mount.style.backgroundRepeat   = "no-repeat";
  mount.style.filter = (blur > 0 || brightness !== 100)
    ? `blur(${blur}px) brightness(${brightness / 100})`
    : "";
}

function updateScene(mount, weather, sunTimes) {
  const now = sceneNow(mount);
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
    const lon = mount._bgLon;
    if (lat != null) {
      const hemi = getHemisphere(lat);
      mount.dataset.hemisphere = hemi;
      mount.dataset.season     = getSeason(now, hemi);
      // Desert overrides the lat-based biome where applicable.
      const biome = isDesertLocation(lat, lon) ? "desert" : getBiome(lat);
      mount.dataset.biome = biome;
      // Aurora eligibility: high latitude (|lat|>=55°) AND clear-ish night.
      const auroraEligible = Math.abs(lat) >= 55 &&
        (weather === "clear" || weather === "cloudy") &&
        (phase === "night" || phase === "astronomical-night" ||
         phase === "astronomical-dusk" || phase === "astronomical-dawn");
      mount.dataset.aurora = auroraEligible ? "on" : "off";
      // Milky Way: galactic core up during these hemisphere-month windows
      // AND deep-night phase AND clear weather.
      const mwUp = milkyWayActive(now, hemi) &&
        (phase === "astronomical-night" || phase === "night") &&
        (weather === "clear" || weather === "cloudy");
      mount.dataset.milkyWay = mwUp ? "on" : "off";
    } else {
      mount.dataset.biome      = "temperate";
      mount.dataset.hemisphere = "N";
      mount.dataset.season     = getSeason(now, "N");
      mount.dataset.aurora     = "off";
      mount.dataset.milkyWay   = "off";
    }

    // Locality override (settings.appearance.locality): user can pin broad
    // scene families. Auto can infer known metro/coast/lake/mountain regions.
    const localityOverride = mount._bgLocality;
    if (localityOverride && localityOverride !== "auto") {
      mount.dataset.locality = localityOverride;
    } else {
      mount.dataset.locality = inferLocality(lat, lon, mount.dataset.biome);
    }
    const region = inferSceneRegion(lat, lon, mount.dataset.locality);
    if (region) mount.dataset.region = region;
    else delete mount.dataset.region;

    // Holiday: 24h banner — Halloween, Christmas Eve / Day, NYE, New Year,
    // user birthday. CSS gates jack-o-lanterns / sleigh / fireworks / balloons.
    const holiday = getHoliday(now, mount._bgBirthday);
    if (holiday) mount.dataset.holiday = holiday;
    else delete mount.dataset.holiday;

    // Moon phase: paint the moon SVG in 0.05 increments to avoid re-render
    // churn. Only update when the bucketed phase changes.
    const moon = mount.querySelector(".bg-moon");
    if (moon) {
      if (!MOON_VISIBLE_PHASES.has(phase)) {
        moon.hidden = true;
        if (moon._phase !== null) {
          moon._phase = null;
          moon.innerHTML = "";
          delete moon.dataset.phaseFrac;
        }
      } else {
        moon.hidden = false;
        const phaseFrac = getMoonPhase(now);
        const bucket = Math.round(phaseFrac * 20) / 20; // 21 distinct values
        if (moon._phase !== bucket) {
          moon._phase = bucket;
          moon.innerHTML = moonSVG(bucket);
          moon.dataset.phaseFrac = bucket.toFixed(2);
        }
      }
    }

    // Meteor shower boost stored on mount for spawner to read.
    mount._meteorBoost = meteorShowerBoost(now);

    // Rainbow auto-expires 3 minutes after the rain → clear transition.
    // _bgRainbowUntil is set in checkRainbowTransition (in renderBackground).
    const rainbowUntil = mount._bgRainbowUntil || 0;
    mount.dataset.rainbow = (now.getTime() < rainbowUntil) ? "on" : "off";

    // First-snow window: 24h after the first snow of the season.
    // _bgFirstSnowAt is loaded from chrome.storage.local on init.
    const firstSnowAt = mount._bgFirstSnowAt || 0;
    const isSnow = weather === "snow" || weather === "heavy-snow";
    const inFirstSnowWindow = isSnow && firstSnowAt > 0 &&
      (now.getTime() - firstSnowAt) < 86400000;
    mount.dataset.firstSnow = inFirstSnowWindow ? "on" : "off";

    // Wet/heavy weather hides or dims the solar disc behind the cloud deck.
    // The moon is rendered by .bg-moon; .bg-sun is always hidden below the
    // horizon so twilight/night never produces duplicate lunar discs.
    const sunHide = weather === "storm" || weather === "heavy-rain" || weather === "rain";
    const sunDim  = weather === "overcast" || weather === "heavy-snow" || weather === "drizzle";

    const sun = mount.querySelector(".bg-sun");
    if (sun) {
      if (sunPos) {
        sun.style.left = `${(sunPos.x * 100).toFixed(2)}%`;
        sun.style.top  = `${(sunPos.y * 100).toFixed(2)}%`;
        mount.style.setProperty("--solar-x", `${(sunPos.x * 100).toFixed(2)}%`);
        mount.style.setProperty("--solar-y", `${(sunPos.y * 100).toFixed(2)}%`);
        const solarOpacity = computeSolarOpacity(phase, sunPos);
        if (sunHide)      sun.style.opacity = "0";
        else if (sunDim)  sun.style.opacity = Math.min(solarOpacity, 0.3).toFixed(2);
        else              sun.style.opacity = solarOpacity.toFixed(2);
      } else {
        sun.style.opacity = "0";
      }
    }
  };

  if (!mount._bgFirstScenePainted) {
    // Snap the first paint to the correct colors so we never visibly
    // transition from the @property dark-gray initial values.
    mount.classList.add("bg--no-transition");
    apply();
    // Force a reflow, then release transitions after the first painted frame.
    // Typed custom properties can otherwise animate from their CSS initial
    // values, leaving a midday scene visually stuck in night for seconds.
    void mount.offsetWidth;
    const releaseTransitions = () => mount.classList.remove("bg--no-transition");
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(releaseTransitions);
      });
    } else {
      setTimeout(releaseTransitions, 0);
    }
    mount._bgFirstScenePainted = true;
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
  const y = 0.84 - arc * 0.76;                  // 84% (low horizon) -> 8% (high noon)
  return { x, y };
}

function computeSolarOpacity(phase, sunPos) {
  let opacity = 0.78;
  if (phase === "morning" || phase === "afternoon") opacity = 0.72;
  if (phase === "sunrise" || phase === "golden-hour" || phase === "sunset") opacity = 0.58;

  // Keep the solar disc atmospheric when its arc crosses the greeting band.
  // The UI keeps contrast, while the rays/halo still preserve time-of-day mood.
  if (sunPos && sunPos.x > 0.36 && sunPos.x < 0.72 && sunPos.y > 0.16 && sunPos.y < 0.34) {
    opacity *= 0.72;
  }

  return Math.max(0.38, Math.min(0.86, opacity));
}
