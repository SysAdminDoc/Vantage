// Vantage v0.4.0 — Open-Meteo weather chip in the utility bar.
// Uses the shared weather-source so the background widget and this widget
// hit Open-Meteo at most once per 10 minutes.

import { el, clear } from "../utils/dom.js";
import { getWeatherData, detectLocation, geocodeCity } from "../utils/weather-source.js";

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
    const data = await getWeatherData(location, settings.weather.units);
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

    // Build the title (hover) and aria-label (spoken). Title is dense, aria
    // stays terse to avoid SR fatigue.
    const titleParts = [`${meta.label}`, `feels like ${feelsLike}${unit}`];
    if (showPrecip) titleParts.push(`precip ${precipProb}%`);
    if (dewPoint != null) titleParts.push(`dew ${Math.round(dewPoint)}${unit}`);
    if (humidity != null) titleParts.push(`humidity ${Math.round(humidity)}%`);
    if (visibility) titleParts.push(`visibility ${visibility}`);
    const title = titleParts.join(" · ");

    const ariaParts = [`${temp} degrees ${unitLabel}`, meta.label, locName];
    if (showFeelsLike) ariaParts.push(`feels like ${feelsLike} degrees`);
    if (showPrecip) ariaParts.push(`${precipProb}% chance of precipitation`);
    const ariaLabel = ariaParts.join(", ");

    const children = [
      el("span", { class: "weather__icon", "aria-hidden": "true" }, [meta.icon]),
      el("span", { class: "weather__temp" }, [`${temp}${unit}`])
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
