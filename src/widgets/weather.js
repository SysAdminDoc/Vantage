// Vantage v0.4.0 — Open-Meteo weather chip in the utility bar.
// Uses the shared weather-source so the background widget and this widget
// hit Open-Meteo at most once per 10 minutes.

import { el, clear } from "../utils/dom.js";
import { getWeatherData, getEnsembleSpread, detectLocation, geocodeCity } from "../utils/weather-source.js";
import { i18n } from "../utils/i18n.js";
import { weatherCodeMeta } from "../utils/weather-labels.js";

export { geocodeCity }; // re-export so settings panel can keep its existing import path

// Precipitation chip kicks in past 30%. Below that the chip just adds noise.
const PRECIP_CHIP_THRESHOLD = 30;
// Feels-like chip only renders when the delta from temperature exceeds 3°
// in either direction — otherwise it's redundant with the headline temp.
const FEELS_LIKE_DELTA = 3;

function formatVisibility(meters, units) {
  if (meters == null) return null;
  if (units === "celsius") {
    const km = meters / 1000;
    if (km >= 10) return "10+ km";
    return `${km.toFixed(km < 1 ? 2 : 1)} km`;
  }
  const miles = meters / 1609.344;
  if (miles >= 10) return "10+ mi";
  return `${miles.toFixed(miles < 1 ? 2 : 1)} mi`;
}

function formatPressure(hpa) {
  if (hpa == null) return null;
  // Standard atmospheric pressure is ~1013 hPa; display as-is
  return `${Math.round(hpa)} hPa`;
}

export async function renderWeather(mount, settings, saveSettings) {
  clear(mount);
  if (!settings.weather.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const skeleton = el("div", { class: "weather weather--skeleton", "aria-label": i18n("loadingWeather", null, "Loading weather") });
  mount.appendChild(skeleton);

  let location = settings.weather.location;
  if (!location) {
    try {
      location = await detectLocation();
      settings.weather.location = location;
      await saveSettings(settings);
    } catch {
      clear(mount);
      mount.appendChild(el("div", {
        class: "weather weather--error",
        title: i18n("weatherSetCityTitle", null, "Set a city in Settings -> Weather to enable"),
        "aria-label": i18n("weatherUnavailableSetCity", null, "Weather unavailable - set a city in settings")
      }, [i18n("weatherUnavailable", null, "Weather unavailable")]));
      return;
    }
  }

  try {
    const data = await getWeatherData(location, settings.weather.units, {
      agricultural: !!settings.weather.showAgricultural
    });
    clear(mount);
    const cur = data.current || {};
    const code = cur.weather_code;
    const meta = weatherCodeMeta(code);
    const unit = settings.weather.units === "celsius" ? "°C" : "°F";
    const unitLabel = settings.weather.units === "celsius" ? i18n("celsius", null, "Celsius") : i18n("fahrenheit", null, "Fahrenheit");
    const locName = location.name || i18n("currentLocation", null, "Current location");
    if (cur.temperature_2m == null) {
      mount.appendChild(el("div", { class: "weather-chip", "aria-label": i18n("weatherDataUnavailable", null, "Weather data unavailable") }, ["-"]));
      return;
    }
    const temp = Math.round(cur.temperature_2m);
    const feelsLike = cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null;
    const feelsDelta = feelsLike != null ? feelsLike - temp : 0;
    const showFeelsLike = feelsLike != null && Math.abs(feelsDelta) >= FEELS_LIKE_DELTA;

    const precipProb = cur.precipitation_probability;
    const showPrecip = typeof precipProb === "number" && precipProb >= PRECIP_CHIP_THRESHOLD;

    const dewPoint = cur.dew_point_2m;
    const humidity = cur.relative_humidity_2m;
    const visibility = formatVisibility(cur.visibility, settings.weather.units);
    const uvIndex = cur.uv_index;
    const pressure = formatPressure(cur.pressure_msl);

    // Build the title (hover) and aria-label (spoken). Title is dense, aria
    // stays terse to avoid SR fatigue.
    const titleParts = [`${meta.label}`];
    if (feelsLike != null) titleParts.push(i18n("weatherFeelsLikeCompact", [feelsLike, unit], "feels like $1$2"));
    if (showPrecip) titleParts.push(i18n("weatherPrecipCompact", [precipProb], "precip $1%"));
    if (dewPoint != null) titleParts.push(i18n("weatherDewCompact", [Math.round(dewPoint), unit], "dew $1$2"));
    if (humidity != null) titleParts.push(i18n("weatherHumidityCompact", [Math.round(humidity)], "humidity $1%"));
    if (visibility) titleParts.push(i18n("weatherVisibilityCompact", [visibility], "visibility $1"));
    if (uvIndex != null) titleParts.push(i18n("weatherUvIndexCompact", [Math.round(uvIndex * 10) / 10], "UV index $1"));
    if (pressure) titleParts.push(i18n("weatherPressureCompact", [pressure], "pressure $1"));

    // Ensemble forecast-confidence chip — narrow spread = high
    // confidence, wide spread = uncertain. Computed lazily so users
    // who don't enable it never pay the extra fetch cost. Bands are
    // chosen so `°F` and `°C` modes both produce sensible labels.
    if (settings.weather.showEnsembleConfidence) {
      try {
        const spread = await getEnsembleSpread(location, settings.weather.units);
        if (spread != null) {
          // Bands tuned for the temperature unit at hand:
          //   °F: <4 → high · 4-8 → moderate · >8 → low
          //   °C: <2 → high · 2-4 → moderate · >4 → low
          const isCelsius = settings.weather.units === "celsius";
          const lowCutoff = isCelsius ? 2 : 4;
          const highCutoff = isCelsius ? 4 : 8;
          const conf = spread < lowCutoff
            ? i18n("confidenceHigh", null, "high")
            : spread < highCutoff
              ? i18n("confidenceModerate", null, "moderate")
              : i18n("confidenceLow", null, "low");
          const unitTxt = isCelsius ? "°C" : "°F";
          titleParts.push(i18n("weatherForecastConfidence", [conf, spread.toFixed(1), unitTxt], "forecast confidence $1 (+/-$2$3)"));
        }
      } catch { /* Ensemble fetch is non-fatal — continue without the chip. */ }
    }

    // Agricultural / atmospheric variable set (gated on settings).
    // Cap-style "0 J/kg" CAPE values are the most common output for
    // stable air masses; the unit is preserved so users who care
    // about thunderstorm potential can read the headline number
    // without launching a separate app.
    if (settings.weather.showAgricultural) {
      if (cur.cape != null) titleParts.push(i18n("weatherCapeCompact", [Math.round(cur.cape)], "CAPE $1 J/kg"));
      if (cur.vapour_pressure_deficit != null) titleParts.push(i18n("weatherVpdCompact", [cur.vapour_pressure_deficit.toFixed(2)], "VPD $1 kPa"));
      // Soil moisture is m³/m³ (volumetric water content); show as %.
      if (cur.soil_moisture_0_to_1cm != null) {
        titleParts.push(i18n("weatherSoilMoistureCompact", ["0-1cm", Math.round(cur.soil_moisture_0_to_1cm * 100)], "soil $1 $2%"));
      }
      if (cur.soil_moisture_3_to_9cm != null) {
        titleParts.push(i18n("weatherSoilMoistureCompact", ["3-9cm", Math.round(cur.soil_moisture_3_to_9cm * 100)], "soil $1 $2%"));
      }
      if (cur.soil_moisture_27_to_81cm != null) {
        titleParts.push(i18n("weatherSoilMoistureCompact", ["27-81cm", Math.round(cur.soil_moisture_27_to_81cm * 100)], "soil $1 $2%"));
      }
      if (cur.soil_temperature_0cm != null) {
        titleParts.push(i18n("weatherSoilTempCompact", ["0cm", Math.round(cur.soil_temperature_0cm), unit], "soil-T $1 $2$3"));
      }
      if (cur.soil_temperature_18cm != null) {
        titleParts.push(i18n("weatherSoilTempCompact", ["18cm", Math.round(cur.soil_temperature_18cm), unit], "soil-T $1 $2$3"));
      }
      if (cur.soil_temperature_54cm != null) {
        titleParts.push(i18n("weatherSoilTempCompact", ["54cm", Math.round(cur.soil_temperature_54cm), unit], "soil-T $1 $2$3"));
      }
    }
    const title = titleParts.join(" - ");

    const ariaParts = [i18n("weatherTemperatureAria", [temp, unitLabel], "$1 degrees $2"), meta.label, locName];
    if (showFeelsLike) ariaParts.push(i18n("weatherFeelsLikeAria", [feelsLike], "feels like $1 degrees"));
    if (showPrecip) ariaParts.push(i18n("weatherPrecipAria", [precipProb], "$1% chance of precipitation"));
    const ariaLabel = ariaParts.join(", ");

    // Dual-units rendering: when enabled, append the converted other-
    // unit alongside the headline temperature (e.g. "72°F · 22°C").
    // Conversion happens client-side from the unit Open-Meteo
    // returned, so we don't pay a second fetch.
    let headline = `${temp}${unit}`;
    if (settings.weather.dualUnits) {
      const isCelsius = settings.weather.units === "celsius";
      const otherUnit = isCelsius ? "°F" : "°C";
      const otherTemp = isCelsius
        ? Math.round((temp * 9 / 5) + 32)
        : Math.round((temp - 32) * 5 / 9);
      headline = `${temp}${unit} · ${otherTemp}${otherUnit}`;
    }

    const children = [
      el("span", { class: "weather__icon", "aria-hidden": "true" }, [meta.icon]),
      el("span", { class: "weather__temp" }, [headline])
    ];
    if (showFeelsLike) {
      children.push(el("span", {
        class: "weather__chip weather__chip--feels",
        "aria-hidden": "true"
      }, [i18n("weatherFeelsChip", [feelsLike, unit], "feels $1$2")]));
    }
    if (showPrecip) {
      children.push(el("span", {
        class: "weather__chip weather__chip--precip",
        "aria-hidden": "true"
      }, [`💧 ${precipProb}%`]));
    }
    children.push(el("span", { class: "weather__loc" }, [locName]));

    mount.appendChild(el("div", {
      class: "weather",
      title,
      "aria-label": ariaLabel
    }, children));
  } catch (err) {
    clear(mount);
    mount.appendChild(el("div", {
      class: "weather weather--error",
      title: err.message || i18n("weatherLoadErrorTitle", null, "Couldn't load weather"),
      "aria-label": i18n("weatherUnavailable", null, "Weather unavailable")
    }, [i18n("weatherUnavailable", null, "Weather unavailable")]));
  }
}
