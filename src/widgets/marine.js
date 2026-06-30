// Vantage v1.1.0 — Marine weather pill in the utility bar.
//
// Open-Meteo Marine API (free, no key) — coastal-only data: wave
// height / direction / period, sea surface temperature, ocean current
// vector, sea level. Off by default; reuses the user's weather
// location so coastal users get marine info without a second
// settings round-trip.
//
// Inland locations: Open-Meteo returns nulls across the board. The
// pill hides itself silently in that case (no error toast — that's
// just where the user lives).

import { el, clear } from "../utils/dom.js";
import { iconString } from "../icons.js";
import { detectLocation } from "../utils/weather-source.js";
import { i18n } from "../utils/i18n.js";
import { recordIntegrationEvent } from "../utils/integration-health.js";

const MARINE_BASE = "https://marine-api.open-meteo.com/v1/marine";
const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

async function fetchMarine(lat, lon, units = "fahrenheit") {
  const key = `${lat},${lon},${units}`;
  const hit = cache.get(key);
  if (hit && (Date.now() - hit.ts) < TTL_MS) {
    recordIntegrationEvent("marine-weather", {
      label: "Marine weather (Open-Meteo)",
      kind: "cache",
      message: "marine weather served from cache",
      endpoint: MARINE_BASE,
      source: "marine-cache",
      cacheAgeMs: Date.now() - hit.ts
    });
    return hit.data;
  }
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current:   "wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction,sea_level_height_msl",
    timezone:  "auto",
    temperature_unit: units === "celsius" ? "celsius" : "fahrenheit"
  });
  const endpoint = `${MARINE_BASE}?${params}`;
  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) throw new Error(`Marine API ${res.status}`);
    const data = await res.json();
    cache.set(key, { ts: Date.now(), data });
    recordIntegrationEvent("marine-weather", {
      label: "Marine weather (Open-Meteo)",
      kind: "success",
      message: "marine weather fetched",
      endpoint,
      source: "marine"
    });
    return data;
  } catch (err) {
    recordIntegrationEvent("marine-weather", {
      label: "Marine weather (Open-Meteo)",
      kind: "error",
      message: err?.message || "marine weather failed",
      endpoint,
      source: "marine"
    });
    throw err;
  }
}

// Cardinal direction from a degrees-from-north heading. 16-point
// resolution matches what users see in marine forecasts.
const CARDINALS_16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
function cardinal(deg) {
  if (deg == null || isNaN(deg)) return "";
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return CARDINALS_16[idx];
}

function formatHeight(meters, units) {
  if (meters == null) return null;
  if (units === "celsius") return `${meters.toFixed(1)} m`;
  // Imperial users prefer feet for surf reports.
  return `${(meters * 3.28084).toFixed(1)} ft`;
}

function formatVelocity(kmh, units) {
  if (kmh == null) return null;
  // Marine convention: knots regardless of system. 1 km/h ≈ 0.5400 kt.
  const kts = kmh * 0.539957;
  return `${kts.toFixed(1)} kt`;
}

export function renderMarine(mount, settings) {
  clear(mount);
  if (!settings.marine?.enabled) return;

  // Skeleton placeholder
  mount.appendChild(el("div", { class: "aq-pill aq-pill--skeleton", "aria-label": i18n("marineLoading", null, "Marine loading") }));

  (async () => {
    try {
      let loc = settings.weather?.location || null;
      if (!loc) loc = await detectLocation();
      if (!loc) throw new Error(i18n("noLocation", null, "No location"));

      const data = await fetchMarine(loc.latitude, loc.longitude, settings.weather?.units);
      const cur = data.current || {};

      // Inland heuristic — every marine field null means we're not
      // near a coast. Hide rather than show a confusing empty pill.
      const allNull = ["wave_height","wave_direction","wave_period","sea_surface_temperature","ocean_current_velocity"].every(k => cur[k] == null);
      if (allNull) {
        clear(mount);
        return;
      }

      const waveH = formatHeight(cur.wave_height, settings.weather?.units);
      const waveDir = cardinal(cur.wave_direction);
      const wavePer = cur.wave_period != null ? `${Math.round(cur.wave_period)}s` : null;
      const sst = cur.sea_surface_temperature;
      const sstUnit = settings.weather?.units === "celsius" ? "°C" : "°F";
      const sstText = sst != null ? `SST ${Math.round(sst)}${sstUnit}` : null;
      const currVel = formatVelocity(cur.ocean_current_velocity, settings.weather?.units);
      const currDir = cardinal(cur.ocean_current_direction);

      const summaryParts = [];
      if (waveH) summaryParts.push(i18n("marineWaveSummary", [waveH, waveDir ? ` ${waveDir}` : ""], "Wave $1$2"));
      if (wavePer) summaryParts.push(wavePer);
      if (sstText) summaryParts.push(sstText);
      if (currVel) summaryParts.push(i18n("marineCurrentSummary", [currVel, currDir ? ` ${currDir}` : ""], "Current $1$2"));
      const tooltipText = summaryParts.join(" - ") || i18n("marineDataUnavailable", null, "Marine data unavailable");

      clear(mount);
      const pill = el("div", {
        class: "aq-pill",
        title: tooltipText,
        "aria-label": tooltipText,
        style: { "--aq-color": "var(--blue, var(--accent))" }
      }, [
        el("span", { class: "aq-pill__icon", innerHTML: iconString("wind", 13) }),
        el("span", { class: "aq-pill__aqi" }, [waveH || "-"]),
        el("span", { class: "aq-pill__label" }, [waveDir || i18n("marine", null, "Marine")])
      ]);
      mount.appendChild(pill);
    } catch (err) {
      // Non-fatal — quietly remove the skeleton.
      console.warn("[marine] fetch failed:", err.message);
      clear(mount);
    }
  })();
}
