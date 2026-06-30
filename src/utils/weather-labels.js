// Shared WMO weather-code labels for current-weather and forecast widgets.

import { i18n } from "./i18n.js";

const WMO_CODES = Object.freeze({
  0:  { key: "weatherCodeClear", label: "Clear", icon: "☀️" },
  1:  { key: "weatherCodeMostlyClear", label: "Mostly clear", icon: "🌤️" },
  2:  { key: "weatherCodePartlyCloudy", label: "Partly cloudy", icon: "⛅" },
  3:  { key: "weatherCodeOvercast", label: "Overcast", icon: "☁️" },
  45: { key: "weatherCodeFog", label: "Fog", icon: "🌫️" },
  48: { key: "weatherCodeRimeFog", label: "Rime fog", icon: "🌫️" },
  51: { key: "weatherCodeLightDrizzle", label: "Light drizzle", icon: "🌦️" },
  53: { key: "weatherCodeDrizzle", label: "Drizzle", icon: "🌦️" },
  55: { key: "weatherCodeHeavyDrizzle", label: "Heavy drizzle", icon: "🌧️" },
  61: { key: "weatherCodeLightRain", label: "Light rain", icon: "🌧️" },
  63: { key: "weatherCodeRain", label: "Rain", icon: "🌧️" },
  65: { key: "weatherCodeHeavyRain", label: "Heavy rain", icon: "🌧️" },
  71: { key: "weatherCodeLightSnow", label: "Light snow", icon: "🌨️" },
  73: { key: "weatherCodeSnow", label: "Snow", icon: "❄️" },
  75: { key: "weatherCodeHeavySnow", label: "Heavy snow", icon: "❄️" },
  77: { key: "weatherCodeSnowGrains", label: "Snow grains", icon: "❄️" },
  80: { key: "weatherCodeRainShowers", label: "Rain showers", icon: "🌦️" },
  81: { key: "weatherCodeHeavyShowers", label: "Heavy showers", icon: "🌧️" },
  82: { key: "weatherCodeViolentShowers", label: "Violent showers", icon: "⛈️" },
  85: { key: "weatherCodeSnowShowers", label: "Snow showers", icon: "🌨️" },
  86: { key: "weatherCodeHeavySnowShowers", label: "Heavy snow showers", icon: "❄️" },
  95: { key: "weatherCodeThunderstorm", label: "Thunderstorm", icon: "⛈️" },
  96: { key: "weatherCodeThunderstormHail", label: "Thunderstorm w/ hail", icon: "⛈️" },
  99: { key: "weatherCodeSevereThunderstorm", label: "Severe thunderstorm", icon: "⛈️" }
});

export function weatherCodeMeta(code) {
  const meta = WMO_CODES[code] || { key: "weatherCodeUnknown", label: "Unknown", icon: "❓" };
  return {
    icon: meta.icon,
    label: i18n(meta.key, null, meta.label)
  };
}
