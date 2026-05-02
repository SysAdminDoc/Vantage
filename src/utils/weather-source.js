// Vantage v0.4.0 — single Open-Meteo fetcher used by the weather widget AND
// the background scene. Cached for 10 minutes per (lat, lon, units) tuple
// so widgets that mount in parallel don't double-fetch, and so the
// background tick (every minute) doesn't hit the network repeatedly.

const TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // key -> { ts, data }
const inflight = new Map(); // key -> Promise

function keyFor(location, units) {
  return `${location.latitude},${location.longitude},${units}`;
}

/**
 * Fetch `current` weather + `daily` sunrise/sunset from Open-Meteo.
 *
 * @param {{latitude: number, longitude: number, name?: string}} location
 * @param {"fahrenheit"|"celsius"} units
 * @param {{force?: boolean}} [opts]
 * @returns {Promise<object>} the parsed Open-Meteo response
 */
export async function getWeatherData(location, units = "fahrenheit", { force = false } = {}) {
  const key = keyFor(location, units);
  const now = Date.now();

  if (!force) {
    const hit = cache.get(key);
    if (hit && (now - hit.ts) < TTL_MS) return hit.data;
    if (inflight.has(key)) return inflight.get(key);
  }

  const tempUnit = units === "celsius" ? "celsius" : "fahrenheit";
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
    `&current=temperature_2m,apparent_temperature,weather_code,is_day,cloud_cover,wind_speed_10m,precipitation_probability,dew_point_2m,visibility,relative_humidity_2m,uv_index,pressure_msl` +
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
