// Vantage v0.6.0 — Air quality pill using Open-Meteo Air Quality API.
// Renders a compact pill in the utility bar alongside the weather widget.
// Fetches current us_aqi, pm2_5, pm10, and key pollen counts.
// Reuses the weather location — no extra user config needed.

import { el, clear, toast } from "../utils/dom.js";
import { iconString } from "../icons.js";
import { detectLocation } from "../utils/weather-source.js";

const AQ_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

const AQI_LEVELS = [
  { max: 50,  label: "Good",           color: "#a6e3a1" },
  { max: 100, label: "Moderate",       color: "#f9e2af" },
  { max: 150, label: "USG",            color: "#fab387" },
  { max: 200, label: "Unhealthy",      color: "#f38ba8" },
  { max: 300, label: "Very Unhealthy", color: "#cba6f7" },
  { max: Infinity, label: "Hazardous", color: "#eba0ac" }
];

function aqiInfo(aqi) {
  return AQI_LEVELS.find(l => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

async function fetchAirQuality(lat, lon) {
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current:   "us_aqi,pm10,pm2_5,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen",
    timezone:  "auto"
  });
  const res = await fetch(`${AQ_BASE}?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`AQ API ${res.status}`);
  return res.json();
}

function formatPollens(current) {
  const POLLEN_KEYS = [
    ["alder_pollen", "Alder"],
    ["birch_pollen", "Birch"],
    ["grass_pollen", "Grass"],
    ["mugwort_pollen", "Mugwort"],
    ["olive_pollen", "Olive"],
    ["ragweed_pollen", "Ragweed"]
  ];
  const active = POLLEN_KEYS
    .filter(([k]) => current[k] != null && current[k] > 0)
    .sort((a, b) => current[b[0]] - current[a[0]])
    .slice(0, 3)
    .map(([k, name]) => `${name} ${Math.round(current[k])}`);
  return active.length ? active.join(" · ") : null;
}

export function renderAirQuality(mount, settings) {
  clear(mount);
  if (!settings.airquality?.enabled) return;

  // Skeleton placeholder
  mount.innerHTML = `<div class="aq-pill aq-pill--skeleton" aria-label="Air quality loading"></div>`;

  (async () => {
    try {
      let loc = settings.weather?.location || null;
      if (!loc) loc = await detectLocation();
      if (!loc) throw new Error("No location");

      const data = await fetchAirQuality(loc.latitude, loc.longitude);
      const cur  = data.current || {};
      const aqi  = cur.us_aqi;
      const info = aqiInfo(aqi ?? 0);
      const pm25 = cur.pm2_5 != null ? `PM2.5 ${Math.round(cur.pm2_5)}` : null;
      const pm10 = cur.pm10  != null ? `PM10 ${Math.round(cur.pm10)}`  : null;
      const pollenStr = formatPollens(cur);

      const lines = [pm25, pm10, pollenStr].filter(Boolean);
      const tooltipText = `AQI ${aqi ?? "—"} · ${info.label}${lines.length ? "\n" + lines.join(" · ") : ""}`;

      clear(mount);
      const pill = el("div", {
        class: "aq-pill",
        role: "button",
        tabindex: "0",
        "aria-expanded": "false",
        title: tooltipText,
        "aria-label": tooltipText,
        style: { "--aq-color": info.color }
      }, [
        el("span", { class: "aq-pill__icon", innerHTML: iconString("wind", 13) }),
        el("span", { class: "aq-pill__aqi" }, [String(aqi ?? "—")]),
        el("span", { class: "aq-pill__label" }, [info.label])
      ]);

      // Expand on click/keyboard to show PM + pollen detail
      let expanded = false;
      let detail = null;
      function toggleDetail() {
        expanded = !expanded;
        pill.setAttribute("aria-expanded", String(expanded));
        if (expanded) {
          detail = el("div", { class: "aq-detail" }, lines.map(l => el("span", { class: "aq-detail__row" }, [l])));
          mount.appendChild(detail);
        } else {
          detail?.remove();
          detail = null;
        }
      }
      pill.addEventListener("click", toggleDetail);
      pill.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleDetail(); } });

      mount.appendChild(pill);
    } catch {
      // Silent fail — don't show anything if AQ fetch fails
      clear(mount);
    }
  })();
}
