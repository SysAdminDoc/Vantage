// Vantage v0.4.0 — single Open-Meteo fetcher used by the weather widget AND
// the background scene. Cached for 10 minutes per (lat, lon, units) tuple
// so widgets that mount in parallel don't double-fetch, and so the
// background tick (every minute) doesn't hit the network repeatedly.

const TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // key -> { ts, data }
const inflight = new Map(); // key -> Promise

function keyFor(location, units, agri) {
  return `${location.latitude},${location.longitude},${units},${agri ? "agri" : "base"}`;
}

/**
 * Fetch `current` weather + `daily` sunrise/sunset from Open-Meteo.
 *
 * @param {{latitude: number, longitude: number, name?: string}} location
 * @param {"fahrenheit"|"celsius"} units
 * @param {{force?: boolean}} [opts]
 * @returns {Promise<object>} the parsed Open-Meteo response
 */
export async function getWeatherData(location, units = "fahrenheit", { force = false, agricultural = false } = {}) {
  const key = keyFor(location, units, agricultural);
  const now = Date.now();

  if (!force) {
    const hit = cache.get(key);
    if (hit && (now - hit.ts) < TTL_MS) return hit.data;
    if (inflight.has(key)) return inflight.get(key);
  }

  const tempUnit = units === "celsius" ? "celsius" : "fahrenheit";

  // Optional agricultural / atmospheric variable set — same `current=`
  // endpoint, just additional names. Open-Meteo supports all of these
  // in the current snapshot. Off by default; enabled in Settings →
  // Weather → "Agricultural / atmospheric variables".
  const baseCurrent = "temperature_2m,apparent_temperature,weather_code,is_day,cloud_cover,wind_speed_10m,precipitation_probability,dew_point_2m,visibility,relative_humidity_2m,uv_index,pressure_msl";
  const agriCurrent = agricultural
    ? ",cape,vapour_pressure_deficit,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_27_to_81cm,soil_temperature_0cm,soil_temperature_18cm,soil_temperature_54cm"
    : "";
  // `timezone=auto` is the right mode here: Open-Meteo returns the daily
  // sunrise/sunset for the LOCATION's local day, which is what we want
  // (e.g. at 19:20 CDT = 00:20 UTC next day, we want today's events,
  // not tomorrow's). The returned `daily.sunrise[0]` is a naive ISO
  // string in location-local time; the response also includes
  // `utc_offset_seconds`, which we use in background.js to parse the
  // naive string into an absolute-UTC Date that compares correctly
  // against `Date.now()` regardless of the browser's own timezone.
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&current=${baseCurrent}${agriCurrent}` +
    `&daily=sunrise,sunset` +
    `&temperature_unit=${tempUnit}` +
    `&timezone=auto`;

  const fetchPromise = (async () => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(key, { ts: Date.now(), data });
    inflight.delete(key);
    return data;
  })().catch((err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, fetchPromise);
  return fetchPromise;
}

const ENSEMBLE_TTL_MS = 30 * 60 * 1000;
const ensembleCache = new Map();

/** Fetch a 51-member ensemble temperature forecast for the next 12 h
 *  and return the current-hour spread (max - min) in the requested
 *  units. Used by the weather widget's forecast-confidence chip
 *  when `weather.showEnsembleConfidence` is on. Cached 30 min per
 *  (lat, lon, units) tuple — ensemble runs every ~6 h upstream so
 *  this is plenty fresh.
 *
 *  Returns null on any error so the caller falls back to the
 *  baseline forecast cleanly.
 */
export async function getEnsembleSpread(location, units = "fahrenheit") {
  const tempUnit = units === "celsius" ? "celsius" : "fahrenheit";
  const key = `${location.latitude},${location.longitude},${tempUnit}`;
  const hit = ensembleCache.get(key);
  if (hit && (Date.now() - hit.ts) < ENSEMBLE_TTL_MS) return hit.spread;

  // Members 01..50 (m00 is the deterministic control run; we exclude
  // it from the spread so the metric reflects ensemble disagreement
  // rather than control vs. mean drift).
  const members = Array.from({ length: 50 }, (_, i) =>
    `temperature_2m_member${String(i + 1).padStart(2, "0")}`
  ).join(",");
  const url =
    `https://ensemble-api.open-meteo.com/v1/ensemble` +
    `?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&hourly=${members}` +
    `&forecast_days=1` +
    `&temperature_unit=${tempUnit}` +
    `&timezone=auto`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hourly = data.hourly || {};
    // Find the current-hour index. The `time` array is naive ISO
    // strings in the location's local time; pick the closest entry
    // to the user's current local hour.
    const times = hourly.time || [];
    if (!times.length) throw new Error("Empty ensemble response");
    const now = new Date();
    let idx = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      const delta = Math.abs(t.getTime() - now.getTime());
      if (delta < bestDelta) { bestDelta = delta; idx = i; }
    }
    const samples = [];
    for (let i = 1; i <= 50; i++) {
      const k = `temperature_2m_member${String(i).padStart(2, "0")}`;
      const arr = hourly[k];
      if (Array.isArray(arr) && typeof arr[idx] === "number") samples.push(arr[idx]);
    }
    if (samples.length < 5) throw new Error("Too few ensemble members");
    const max = Math.max(...samples);
    const min = Math.min(...samples);
    const spread = max - min;
    ensembleCache.set(key, { ts: Date.now(), spread });
    return spread;
  } catch (err) {
    // Cache the failure for one minute to avoid hammering on repeated
    // renders when the API is unreachable.
    ensembleCache.set(key, { ts: Date.now() - ENSEMBLE_TTL_MS + 60_000, spread: null });
    return null;
  }
}

/** Geolocation API → location. Wraps the browser API as a Promise. */
export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        name: "Current location",
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }),
      (err) => reject(new Error(err.message || "Location denied")),
      { timeout: 6000, maximumAge: 1000 * 60 * 30 }
    );
  });
}

/** City-name → lat/lon via Open-Meteo geocoding. */
export async function geocodeCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error("City not found");
  const first = data.results[0];
  return {
    name: `${first.name}${first.admin1 ? ", " + first.admin1 : ""}${first.country_code ? ", " + first.country_code : ""}`,
    latitude: first.latitude,
    longitude: first.longitude
  };
}
