// Vantage v1.2.0 — 5-day weather forecast collapsible panel.
//
// Open-Meteo daily forecast endpoint (free, no key): min/max temperature,
// precipitation, UV index, wind speed, weather code, sunrise/sunset for the
// next 5 days. Collapsible below the current weather chip (or standalone
// widget if weather is disabled). Off by default; users opt-in via Settings.
//
// Reuses the user's weather location and temperature units. Does not add
// new API hosts to the manifest (uses the same api.open-meteo.com endpoint).

import { el, clear } from "../utils/dom.js";
import { getDailyForecast, detectLocation } from "../utils/weather-source.js";
import { i18n } from "../utils/i18n.js";
import { weatherCodeMeta } from "../utils/weather-labels.js";

export async function renderWeatherForecast(mount, settings) {
  clear(mount);
  if (!settings.weather?.forecastEnabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  // Loading skeleton
  const skeleton = el("div", { class: "weather-forecast weather-forecast--skeleton", "aria-label": i18n("loadingForecast", null, "Loading forecast") });
  mount.appendChild(skeleton);

  try {
    let location = settings.weather?.location;
    if (!location) {
      location = await detectLocation();
    }
    if (!location) {
      throw new Error(i18n("noLocation", null, "No location"));
    }

    const data = await getDailyForecast(location, settings.weather?.units);
    const daily = data.daily || {};
    const timezone = data.timezone || "UTC";
    const unit = settings.weather?.units === "celsius" ? "°C" : "°F";

    clear(mount);
    const container = el("div", { class: "weather-forecast" });

    // Build a 5-day forecast grid.
    // daily.time[0] is today, [1] is tomorrow, etc.
    const times = daily.time || [];
    const codes = daily.weather_code || [];
    const maxTemps = daily.temperature_2m_max || [];
    const minTemps = daily.temperature_2m_min || [];
    const precip = daily.precipitation_sum || [];
    const precipProb = daily.precipitation_probability_max || [];
    const uvMax = daily.uv_index_max || [];
    const windMax = daily.wind_speed_10m_max || [];

    // Render each day as a row
    for (let i = 0; i < Math.min(5, times.length); i++) {
      const dateStr = times[i];
      const date = new Date(dateStr + "T00:00:00");
      const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
      const dateLabel = date.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });

      const code = codes[i];
      const meta = weatherCodeMeta(code);

      const maxTemp = Math.round(maxTemps[i] || 0);
      const minTemp = Math.round(minTemps[i] || 0);
      const precipAmount = precip[i] || 0;
      const precipChance = precipProb[i] || 0;
      const uv = uvMax[i] || 0;
      const wind = windMax[i] || 0;

      // Convert wind to user-friendly unit (km/h to mph if needed)
      let windLabel = "";
      if (settings.weather?.units === "celsius") {
        windLabel = `${Math.round(wind)} km/h`;
      } else {
        // Convert km/h to mph
        windLabel = `${Math.round(wind * 0.621371)} mph`;
      }

      // Build the row
      const row = el("div", { class: "weather-forecast__day" }, [
        el("div", { class: "weather-forecast__date" }, [
          el("div", { class: "weather-forecast__day-name" }, [dayName]),
          el("div", { class: "weather-forecast__date-label" }, [dateLabel])
        ]),
        el("div", { class: "weather-forecast__condition" }, [
          el("span", { class: "weather-forecast__icon", "aria-hidden": "true" }, [meta.icon]),
          el("span", { class: "weather-forecast__description", title: meta.label }, [meta.label.substring(0, 12)])
        ]),
        el("div", { class: "weather-forecast__temps" }, [
          el("span", { class: "weather-forecast__high" }, [`${maxTemp}${unit}`]),
          el("span", { class: "weather-forecast__separator" }, [" / "]),
          el("span", { class: "weather-forecast__low" }, [`${minTemp}${unit}`])
        ]),
        el("div", { class: "weather-forecast__details", title: i18n("forecastDetailsTitle", [precipAmount.toFixed(1), precipChance, uv.toFixed(1), windLabel], "Precip: $1 mm / $2% - UV: $3 - Wind: $4") }, [
          el("span", { class: "weather-forecast__detail-item" }, [`🌧️ ${precipChance}%`]),
          el("span", { class: "weather-forecast__detail-item" }, [`☀️ ${i18n("uvShort", null, "UV")} ${uv.toFixed(1)}`]),
          el("span", { class: "weather-forecast__detail-item" }, [`💨 ${windLabel}`])
        ])
      ]);
      container.appendChild(row);
    }

    mount.appendChild(container);
  } catch (err) {
    clear(mount);
    mount.appendChild(el("div", {
      class: "weather-forecast weather-forecast--error",
      "aria-label": i18n("forecastUnavailable", null, "Forecast unavailable")
    }, [i18n("forecastUnavailable", null, "Forecast unavailable")]));
  }
}
