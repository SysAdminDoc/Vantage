// Vantage v0.4.0 — Open-Meteo weather chip in the utility bar.
// Uses the shared weather-source so the background widget and this widget
// hit Open-Meteo at most once per 10 minutes.

import { el, clear } from "../utils/dom.js";
import { getWeatherData, getEnsembleSpread, detectLocation, geocodeCity } from "../utils/weather-source.js";

export { geocodeCity }; // re-export so settings panel can keep its existing import path

const WMO_CODES = {
  0:  { label: "Clear",                 icon: "☀️"  },
  1:  { label: "Mostly clear",          icon: "🌤️" },
  2:  { label: "Partly cloudy",         icon: "⛅"  },
  3:  { label: "Overcast",              icon: "☁️"  },
  45: { label: "Fog",                   icon: "🌫️" },
  48: { label: "Rime fog",              icon: "🌫️" },
  51: { label: "Light drizzle",         icon: "🌦️" },
  53: { label: "Drizzle",               icon: "🌦️" },
  55: { label: "Heavy drizzle",         icon: "🌧️" },
  61: { label: "Light rain",            icon: "🌧️" },
  63: { label: "Rain",                  icon: "🌧️" },
  65: { label: "Heavy rain",            icon: "🌧️" },
  71: { label: "Light snow",            icon: "🌨️" },
  73: { label: "Snow",                  icon: "❄️"  },
  75: { label: "Heavy snow",            icon: "❄️"  },
  77: { label: "Snow grains",           icon: "❄️"  },
  80: { label: "Rain showers",          icon: "🌦️" },
  81: { label: "Heavy showers",         icon: "🌧️" },
  82: { label: "Violent showers",       icon: "⛈️"  },
  85: { label: "Snow showers",          icon: "🌨️" },
  86: { label: "Heavy snow showers",    icon: "❄️"  },
  95: { label: "Thunderstorm",          icon: "⛈️"  },
  96: { label: "Thunderstorm w/ hail",  icon: "⛈️"  },
  99: { label: "Severe thunderstorm",   icon: "⛈️"  }
};

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

  const skeleton = el("div", { class: "weather weather--skeleton", "aria-label": "Loading weather" });
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
        title: "Set a city in Settings → Weather to enable",
        "aria-label": "Weather unavailable — set a city in settings"
      }, ["Weather unavailable"]));
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
    const meta = WMO_CODES[code] || { label: "Unknown", icon: "❓" };
    const unit = settings.weather.units === "celsius" ? "°C" : "°F";
    const unitLabel = settings.weather.units === "celsius" ? "Celsius" : "Fahrenheit";
    const locName = location.name || "Current location";
    const temp = Math.round(cur.temperature_2m);
    const feelsLike = Math.round(cur.apparent_temperature);
    const feelsDelta = feelsLike - temp;
    const showFeelsLike = Math.abs(feelsDelta) >= FEELS_LIKE_DELTA;

    const precipProb = cur.precipitation_probability;
    const showPrecip = typeof precipProb === "number" && precipProb >= PRECIP_CHIP_THRESHOLD;

    const dewPoint = cur.dew_point_2m;
    const humidity = cur.relative_humidity_2m;
    const visibility = formatVisibility(cur.visibility, settings.weather.units);
    const uvIndex = cur.uv_index;
    const pressure = formatPressure(cur.pressure_msl);

    // Build the title (hover) and aria-label (spoken). Title is dense, aria
    // stays terse to avoid SR fatigue.
    const titleParts = [`${meta.label}`, `feels like ${feelsLike}${unit}`];
    if (showPrecip) titleParts.push(`precip ${precipProb}%`);
    if (dewPoint != null) titleParts.push(`dew ${Math.round(dewPoint)}${unit}`);
    if (humidity != null) titleParts.push(`humidity ${Math.round(humidity)}%`);
    if (visibility) titleParts.push(`visibility ${visibility}`);
    if (uvIndex != null) titleParts.push(`UV index ${Math.round(uvIndex * 10) / 10}`);
    if (pressure) titleParts.push(`pressure ${pressure}`);

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
          const conf = spread < lowCutoff ? "high" : spread < highCutoff ? "moderate" : "low";
          const unitTxt = isCelsius ? "°C" : "°F";
          titleParts.push(`forecast confidence ${conf} (±${spread.toFixed(1)}${unitTxt})`);
        }
      } catch { /* Ensemble fetch is non-fatal — continue without the chip. */ }
    }

    // Agricultural / atmospheric variable set (gated on settings).
    // Cap-style "0 J/kg" CAPE values are the most common output for
    // stable air masses; the unit is preserved so users who care
    // about thunderstorm potential can read the headline number
    // without launching a separate app.
    if (settings.weather.showAgricultural) {
      if (cur.cape != null) titleParts.push(`CAPE ${Math.round(cur.cape)} J/kg`);
      if (cur.vapour_pressure_deficit != null) titleParts.push(`VPD ${cur.vapour_pressure_deficit.toFixed(2)} kPa`);
      // Soil moisture is m³/m³ (volumetric water content); show as %.
      if (cur.soil_moisture_0_to_1cm != null) {
        titleParts.push(`soil 0-1cm ${Math.round(cur.soil_moisture_0_to_1cm * 100)}%`);
      }
      if (cur.soil_moisture_3_to_9cm != null) {
        titleParts.push(`soil 3-9cm ${Math.round(cur.soil_moisture_3_to_9cm * 100)}%`);
      }
      if (cur.soil_moisture_27_to_81cm != null) {
        titleParts.push(`soil 27-81cm ${Math.round(cur.soil_moisture_27_to_81cm * 100)}%`);
      }
      if (cur.soil_temperature_0cm != null) {
        titleParts.push(`soil-T 0cm ${Math.round(cur.soil_temperature_0cm)}${unit}`);
      }
      if (cur.soil_temperature_18cm != null) {
        titleParts.push(`soil-T 18cm ${Math.round(cur.soil_temperature_18cm)}${unit}`);
      }
      if (cur.soil_temperature_54cm != null) {
        titleParts.push(`soil-T 54cm ${Math.round(cur.soil_temperature_54cm)}${unit}`);
      }
    }
    const title = titleParts.join(" · ");

    const ariaParts = [`${temp} degrees ${unitLabel}`, meta.label, locName];
    if (showFeelsLike) ariaParts.push(`feels like ${feelsLike} degrees`);
    if (showPrecip) ariaParts.push(`${precipProb}% chance of precipitation`);
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
      }, [`feels ${feelsLike}${unit}`]));
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
      title: err.message || "Couldn't load weather",
      "aria-label": "Weather unavailable"
    }, ["Weather unavailable"]));
  }
}
