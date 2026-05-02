// Vantage v1.1.0 — River flood risk pill.
//
// Open-Meteo Flood API (free, no key) — GloFAS v4 river discharge
// (m³/s) at 5 km resolution, with a 7-month seasonal forecast and
// ensemble uncertainty bands. Off by default; reuses the user's
// weather location.
//
// The API works for any land-based lat/lon but returns nulls when
// no major river is nearby — the widget auto-hides in that case
// rather than displaying a meaningless zero.

import { el, clear } from "../utils/dom.js";
import { iconString } from "../icons.js";
import { detectLocation } from "../utils/weather-source.js";

const FLOOD_BASE = "https://flood-api.open-meteo.com/v1/flood";
const TTL_MS = 30 * 60 * 1000; // 30 min — flood data updates much slower than weather
const cache = new Map();

async function fetchFlood(lat, lon) {
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit && (Date.now() - hit.ts) < TTL_MS) return hit.data;
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    daily:     "river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min",
    forecast_days: "7"
  });
  const res = await fetch(`${FLOOD_BASE}?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Flood API ${res.status}`);
  const data = await res.json();
  cache.set(key, { ts: Date.now(), data });
  return data;
}

/** Classify the current discharge against its 7-day ensemble band.
 *  GloFAS doesn't ship "the" flood threshold — that requires a basin
 *  rating curve we don't have — so we surface it relatively: today's
 *  discharge vs. the 7-day max sets the risk hint.
 */
function riskLabel(today, periodMax) {
  if (today == null || periodMax == null) return { label: "—", level: "none" };
  if (periodMax === 0) return { label: "No river nearby", level: "none" };
  const pct = today / periodMax;
  if (pct >= 0.95) return { label: "High",    level: "high"   };
  if (pct >= 0.75) return { label: "Elevated", level: "elevated" };
  if (pct >= 0.50) return { label: "Moderate", level: "moderate" };
  return                  { label: "Low",     level: "low"    };
}

const RISK_COLOR = {
  none:     "var(--overlay0)",
  low:      "var(--green)",
  moderate: "var(--yellow)",
  elevated: "var(--peach)",
  high:     "var(--red)"
};

export function renderFlood(mount, settings) {
  clear(mount);
  if (!settings.flood?.enabled) return;
  mount.innerHTML = `<div class="aq-pill aq-pill--skeleton" aria-label="Flood loading"></div>`;

  (async () => {
    try {
      let loc = settings.weather?.location || null;
      if (!loc) loc = await detectLocation();
      if (!loc) throw new Error("No location");

      const data = await fetchFlood(loc.latitude, loc.longitude);
      const daily = data.daily || {};
      const todays = daily.river_discharge?.[0];
      const max7 = Array.isArray(daily.river_discharge_max)
        ? Math.max(...daily.river_discharge_max.filter(v => v != null))
        : null;

      // No river / no data — silently hide.
      if (todays == null || max7 == null || max7 === 0) {
        clear(mount);
        return;
      }

      const risk = riskLabel(todays, max7);
      const tooltip = `River discharge ${todays.toFixed(1)} m³/s · 7-day max ${max7.toFixed(1)} m³/s · ${risk.label} risk`;

      clear(mount);
      const pill = el("div", {
        class: "aq-pill",
        title: tooltip,
        "aria-label": tooltip,
        style: { "--aq-color": RISK_COLOR[risk.level] }
      }, [
        el("span", { class: "aq-pill__icon", innerHTML: iconString("layers", 13) }),
        el("span", { class: "aq-pill__aqi" }, [`${todays.toFixed(1)}`]),
        el("span", { class: "aq-pill__label" }, [risk.label])
      ]);
      mount.appendChild(pill);
    } catch (err) {
      console.warn("[flood] fetch failed:", err.message);
      clear(mount);
    }
  })();
}
