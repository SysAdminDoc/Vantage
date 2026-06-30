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
import { i18n } from "../utils/i18n.js";

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
  if (today == null || periodMax == null) return { label: "-", level: "none" };
  if (periodMax === 0) return { label: i18n("noRiverNearby", null, "No river nearby"), level: "none" };
  const pct = today / periodMax;
  if (pct >= 0.95) return { label: i18n("riskHigh", null, "High"), level: "high" };
  if (pct >= 0.75) return { label: i18n("riskElevated", null, "Elevated"), level: "elevated" };
  if (pct >= 0.50) return { label: i18n("riskModerate", null, "Moderate"), level: "moderate" };
  return { label: i18n("riskLow", null, "Low"), level: "low" };
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
  mount.appendChild(el("div", { class: "aq-pill aq-pill--skeleton", "aria-label": i18n("floodLoading", null, "Flood loading") }));

  (async () => {
    try {
      let loc = settings.weather?.location || null;
      if (!loc) loc = await detectLocation();
      if (!loc) throw new Error(i18n("noLocation", null, "No location"));

      const data = await fetchFlood(loc.latitude, loc.longitude);
      const daily = data.daily || {};
      const todays = daily.river_discharge?.[0];
      const validMax = Array.isArray(daily.river_discharge_max)
        ? daily.river_discharge_max.filter(v => v != null)
        : [];
      const max7 = validMax.length ? Math.max(...validMax) : null;

      if (todays == null || max7 == null || max7 <= 0 || !isFinite(max7)) {
        clear(mount);
        return;
      }

      const risk = riskLabel(todays, max7);
      const tooltip = i18n("floodTooltip", [todays.toFixed(1), max7.toFixed(1), risk.label], "River discharge $1 m3/s - 7-day max $2 m3/s - $3 risk");

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
