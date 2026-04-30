// Astronomical sun-event calculator (sunrise / sunset / civil twilight)
// based on the NOAA Solar Calculator and the algorithm popularized by
// Vladimir Agafonkin's SunCalc (BSD-2-Clause). Vendored, no dependency.
//
// Why this exists: Open-Meteo's `daily.sunrise[0]` returns a localized ISO
// string with no timezone suffix. `new Date(str)` parses it as the BROWSER's
// local time, not the location's. If the user is in NY and looking at
// Hawaii, sunrise is hours wrong. Computing the events locally from
// (lat, lon, date) gives an absolute-UTC moment that's correct regardless
// of where the browser thinks it is, and stays accurate year-round through
// DST transitions, polar regions, and any future date.
//
// All inputs/outputs are absolute moments (UTC ms). The visual scene math
// only ever subtracts these from `Date.now()`, which is also absolute, so
// timezone never enters the picture.

const J1970 = 2440588;
const J2000 = 2451545;
const DAY_MS = 86400000;
const RAD = Math.PI / 180;
const E = RAD * 23.4397; // obliquity of Earth's axis

// --- Julian-day conversions ---
const toJulian   = (date) => date.valueOf() / DAY_MS - 0.5 + J1970;
const fromJulian = (j)    => new Date((j + 0.5 - J1970) * DAY_MS);
const toDays     = (date) => toJulian(date) - J2000;

// --- General solar geometry ---
function declination(l, b) {
  return Math.asin(Math.sin(b) * Math.cos(E) + Math.cos(b) * Math.sin(E) * Math.sin(l));
}
function solarMeanAnomaly(d) {
  return RAD * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(M) {
  // Equation of center
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372; // perihelion of Earth
  return M + C + P + Math.PI;
}

// --- Hour-angle / set-time helpers ---
function julianCycle(d, lw) {
  return Math.round(d - 0.0009 - lw / (2 * Math.PI));
}
function approxTransit(Ht, lw, n) {
  return 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
}
function solarTransitJ(ds, M, L) {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}
function hourAngle(h, phi, d) {
  const x = (Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d));
  // Above the polar circle in summer the sun never sets; in winter it never
  // rises. Both cases produce |x| > 1 → NaN. Caller handles the NaN by
  // falling back to "always day" or "always night" as appropriate.
  if (x < -1 || x > 1) return NaN;
  return Math.acos(x);
}
function getSetJ(h, lw, phi, dec, n, M, L) {
  const w = hourAngle(h, phi, dec);
  if (Number.isNaN(w)) return NaN;
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

/**
 * Compute sunrise / sunset / civil twilight for a given date and location.
 *
 * @param {Date}   date — any moment within the desired calendar day (UTC math takes care of the rest)
 * @param {number} lat  — latitude in degrees (-90..90)
 * @param {number} lon  — longitude in degrees (-180..180), east positive
 * @returns {{
 *   sunrise: Date,    // top-of-disc crosses horizon (h = -0.833°)
 *   sunset:  Date,
 *   dawn:    Date,    // civil twilight begins (h = -6°) — sky starts getting noticeably bright
 *   dusk:    Date,    // civil twilight ends — full dark begins
 *   noon:    Date,    // solar transit (sun at highest point in sky)
 *   alwaysDay: boolean,
 *   alwaysNight: boolean
 * }}
 */
export function getSunTimes(date, lat, lon) {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const Jnoon = solarTransitJ(ds, M, L);

  // Sun's apparent altitude at the events we care about:
  //   sunrise/sunset:  -0.833°  (atmospheric refraction + sun's apparent radius)
  //   civil twilight:  -6°
  const sunriseAlt = RAD * -0.833;
  const civilAlt   = RAD * -6;

  const Jset    = getSetJ(sunriseAlt, lw, phi, dec, n, M, L);
  const Jcdusk  = getSetJ(civilAlt,   lw, phi, dec, n, M, L);

  // If the sun never sets / never rises (polar regions), Jset is NaN.
  // Decide which case it is by sun altitude at noon.
  if (Number.isNaN(Jset)) {
    const noonAlt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec));
    const alwaysDay = noonAlt > sunriseAlt;
    const noonDate = fromJulian(Jnoon);
    return {
      sunrise: alwaysDay ? new Date(noonDate.getTime() - 12 * 60 * 60 * 1000) : null,
      sunset:  alwaysDay ? new Date(noonDate.getTime() + 12 * 60 * 60 * 1000) : null,
      dawn:    null,
      dusk:    null,
      noon:    noonDate,
      alwaysDay,
      alwaysNight: !alwaysDay
    };
  }

  const Jrise  = Jnoon - (Jset   - Jnoon);
  const Jcdawn = Jnoon - (Jcdusk - Jnoon);

  return {
    sunrise: fromJulian(Jrise),
    sunset:  fromJulian(Jset),
    dawn:    fromJulian(Jcdawn),
    dusk:    fromJulian(Jcdusk),
    noon:    fromJulian(Jnoon),
    alwaysDay: false,
    alwaysNight: false
  };
}
