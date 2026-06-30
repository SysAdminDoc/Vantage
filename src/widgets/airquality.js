// Vantage v0.6.0 — Air quality pill using Open-Meteo Air Quality API.
// Renders a compact pill in the utility bar alongside the weather widget.
// Fetches current us_aqi, pm2_5, pm10, and key pollen counts.
// Reuses the weather location — no extra user config needed.

import { el, clear, toast } from "../utils/dom.js";
import { iconString } from "../icons.js";
import { detectLocation } from "../utils/weather-source.js";
import { i18n } from "../utils/i18n.js";

const AQ_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

const AQI_LEVELS = [
  { max: 50,  label: "Good",             key: "aqiGood",            color: "var(--green)"  },
  { max: 100, label: "Moderate",         key: "aqiModerate",        color: "var(--yellow)" },
  { max: 150, label: "Sensitive groups", key: "aqiSensitiveGroups", color: "var(--peach)"  },
  { max: 200, label: "Unhealthy",        key: "aqiUnhealthy",       color: "var(--red)"    },
  { max: 300, label: "Very unhealthy",   key: "aqiVeryUnhealthy",   color: "var(--mauve)"  },
  { max: Infinity, label: "Hazardous",   key: "aqiHazardous",       color: "var(--maroon)" }
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
    { field: "alder_pollen", key: "pollenAlder", label: "Alder" },
    { field: "birch_pollen", key: "pollenBirch", label: "Birch" },
    { field: "grass_pollen", key: "pollenGrass", label: "Grass" },
    { field: "mugwort_pollen", key: "pollenMugwort", label: "Mugwort" },
    { field: "olive_pollen", key: "pollenOlive", label: "Olive" },
    { field: "ragweed_pollen", key: "pollenRagweed", label: "Ragweed" }
  ];
  const active = POLLEN_KEYS
    .filter(({ field }) => current[field] != null && current[field] > 0)
    .sort((a, b) => current[b.field] - current[a.field])
    .slice(0, 3)
    .map(({ field, key, label }) => `${i18n(key, null, label)} ${Math.round(current[field])}`);
  return active.length ? active.join(" · ") : null;
}

export function renderAirQuality(mount, settings) {
  clear(mount);
  if (!settings.airquality?.enabled) return;

  // Skeleton placeholder
  mount.appendChild(el("div", { class: "aq-pill aq-pill--skeleton", "aria-label": i18n("airQualityLoading", null, "Air quality loading") }));

  (async () => {
    try {
      let loc = settings.weather?.location || null;
      if (!loc) loc = await detectLocation();
      if (!loc) throw new Error(i18n("noLocation", null, "No location"));

      const data = await fetchAirQuality(loc.latitude, loc.longitude);
      const cur  = data.current || {};
      const aqi  = cur.us_aqi;
      const info = aqiInfo(aqi ?? 0);
      const pm25 = cur.pm2_5 != null ? `PM2.5 ${Math.round(cur.pm2_5)}` : null;
      const pm10 = cur.pm10  != null ? `PM10 ${Math.round(cur.pm10)}`  : null;
      const pollenStr = formatPollens(cur);

      const lines = [pm25, pm10, pollenStr].filter(Boolean);
      const label = i18n(info.key, null, info.label);
      const tooltipText = `AQI ${aqi ?? "-"} - ${label}${lines.length ? "\n" + lines.join(" - ") : ""}`;

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
        el("span", { class: "aq-pill__aqi" }, [String(aqi ?? "-")]),
        el("span", { class: "aq-pill__label" }, [label])
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
