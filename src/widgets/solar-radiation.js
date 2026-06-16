// Vantage v1.2.0 — Satellite radiation pill in the utility bar.
//
// Open-Meteo Forecast API (free, no key) — satellite-derived solar
// radiation data integrating EUMETSAT CM SAF SARAH3, JMA Himawari-9,
// and DWD MTG at 2.5-5 km resolution. Surfaces GHI (shortwave),
// DNI (direct normal), DHI (diffuse), direct radiation, global tilted
// irradiance, and terrestrial radiation. Useful for gardeners, solar
// panel owners, and outdoor enthusiasts.
//
// The pill shows GHI (shortwave_radiation) in W/m². Hover title
// lists all radiation values. Auto-hides when every field is null
// (e.g. API outage or unsupported location).

import { el, clear } from "../utils/dom.js";
import { iconString } from "../icons.js";
import { detectLocation } from "../utils/weather-source.js";

const RADIATION_BASE = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

const VARIABLES = [
  "shortwave_radiation",
  "direct_radiation",
  "diffuse_radiation",
  "direct_normal_irradiance",
  "global_tilted_irradiance",
  "terrestrial_radiation"
];

async function fetchRadiation(lat, lon) {
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit && (Date.now() - hit.ts) < TTL_MS) return hit.data;
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current:   VARIABLES.join(","),
    timezone:  "auto"
  });
  const res = await fetch(`${RADIATION_BASE}?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Radiation API ${res.status}`);
  const data = await res.json();
  cache.set(key, { ts: Date.now(), data });
  return data;
}

const LABELS = {
  shortwave_radiation:       "GHI",
  direct_radiation:          "Direct",
  diffuse_radiation:         "Diffuse",
  direct_normal_irradiance:  "DNI",
  global_tilted_irradiance:  "GTI",
  terrestrial_radiation:     "Terrestrial"
};

function radiationColor(ghi) {
  if (ghi == null) return "var(--overlay0)";
  if (ghi >= 800) return "var(--red)";
  if (ghi >= 500) return "var(--peach)";
  if (ghi >= 200) return "var(--yellow)";
  return "var(--green)";
}

export function renderSolarRadiation(mount, settings) {
  clear(mount);
  if (!settings.solarRadiation?.enabled) return;

  // Skeleton placeholder
  mount.innerHTML = `<div class="aq-pill aq-pill--skeleton" aria-label="Solar radiation loading"></div>`;

  (async () => {
    try {
      let loc = settings.weather?.location || null;
      if (!loc) loc = await detectLocation();
      if (!loc) throw new Error("No location");

      const data = await fetchRadiation(loc.latitude, loc.longitude);
      const cur = data.current || {};

      // All null means data is unavailable — hide silently.
      const allNull = VARIABLES.every(k => cur[k] == null);
      if (allNull) {
        clear(mount);
        return;
      }

      const ghi = cur.shortwave_radiation;
      const unit = data.current_units?.shortwave_radiation || "W/m²";

      // Build tooltip with all radiation values
      const tooltipParts = [];
      for (const v of VARIABLES) {
        if (cur[v] != null) {
          const u = data.current_units?.[v] || "W/m²";
          tooltipParts.push(`${LABELS[v]} ${Math.round(cur[v])} ${u}`);
        }
      }
      const tooltipText = tooltipParts.join(" · ") || "Solar radiation data unavailable";

      const headline = ghi != null ? `${Math.round(ghi)}` : "—";
      const label = ghi != null ? unit : "Solar";

      clear(mount);
      const pill = el("div", {
        class: "aq-pill",
        title: tooltipText,
        "aria-label": tooltipText,
        style: { "--aq-color": radiationColor(ghi) }
      }, [
        el("span", { class: "aq-pill__icon", innerHTML: iconString("sun", 13) }),
        el("span", { class: "aq-pill__aqi" }, [headline]),
        el("span", { class: "aq-pill__label" }, [label])
      ]);
      mount.appendChild(pill);
    } catch (err) {
      // Non-fatal — quietly remove the skeleton.
      console.warn("[solar-radiation] fetch failed:", err.message);
      clear(mount);
    }
  })();
}
