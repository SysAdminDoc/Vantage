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
    const code = data.current.weather_code;
    const meta = WMO_CODES[code] || { label: "Unknown", icon: "❓" };
    const unit = settings.weather.units === "celsius" ? "°C" : "°F";
    const unitLabel = settings.weather.units === "celsius" ? "Celsius" : "Fahrenheit";
    const locName = location.name || "Current location";
    const temp = Math.round(data.current.temperature_2m);
    const feelsLike = Math.round(data.current.apparent_temperature);

    mount.appendChild(el("div", {
      class: "weather",
      title: `${meta.label} · feels like ${feelsLike}${unit}`,
      "aria-label": `${temp} degrees ${unitLabel}, ${meta.label}, ${locName}`
    }, [
      el("span", { class: "weather__icon", "aria-hidden": "true" }, [meta.icon]),
      el("span", { class: "weather__temp" }, [`${temp}${unit}`]),
      el("span", { class: "weather__loc" }, [locName])
    ]));
  } catch (err) {
    clear(mount);
    mount.appendChild(el("div", {
      class: "weather weather--error",
      title: err.message || "Couldn't load weather",
      "aria-label": "Weather unavailable"
    }, ["Weather unavailable"]));
  }
}
