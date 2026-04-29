// Vantage v0.2.0 — Open-Meteo weather chip (compact pill in the utility bar)

import { el, clear } from "../utils/dom.js";

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

  // Skeleton chip while we load
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
        title: "Set a city in settings to enable weather"
      }, [
        "Weather unavailable"
      ]));
      return;
    }
  }

  try {
    const data = await fetchWeather(location, settings.weather.units);
    clear(mount);
    const code = data.current.weather_code;
    const meta = WMO_CODES[code] || { label: "Unknown", icon: "❓" };
    const unit = settings.weather.units === "celsius" ? "°C" : "°F";
    const locName = location.name || "Current location";

    const chip = el("div", {
      class: "weather",
      title: `${meta.label} · feels like ${Math.round(data.current.apparent_temperature)}${unit}`,
      "aria-label": `${Math.round(data.current.temperature_2m)} degrees ${unit}, ${meta.label}, ${locName}`
    }, [
      el("span", { class: "weather__icon", "aria-hidden": "true" }, [meta.icon]),
      el("span", { class: "weather__temp" }, [`${Math.round(data.current.temperature_2m)}${unit}`]),
      el("span", { class: "weather__loc" }, [locName])
    ]);
    mount.appendChild(chip);
  } catch (err) {
    clear(mount);
    mount.appendChild(el("div", {
      class: "weather weather--error",
      title: err.message || "Could not load weather"
    }, [
      "Weather offline"
    ]));
  }
}

export async function geocodeCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results || !data.results.length) {
    throw new Error("City not found");
  }
  const first = data.results[0];
  return {
    name: `${first.name}${first.admin1 ? ", " + first.admin1 : ""}${first.country_code ? ", " + first.country_code : ""}`,
    latitude: first.latitude,
    longitude: first.longitude
  };
}

async function fetchWeather(location, units) {
  const tempUnit = units === "celsius" ? "celsius" : "fahrenheit";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=${tempUnit}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        name: "Current location",
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }),
      (err) => reject(new Error(err.message || "Location denied")),
      { timeout: 6000, maximumAge: 1000 * 60 * 30 }
    );
  });
}
