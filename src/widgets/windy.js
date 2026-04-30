// Vantage — Windy.com radar embed panel.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";

export const WINDY_OVERLAYS = [
  { value: "wind",             label: "Wind" },
  { value: "gust",             label: "Gusts" },
  { value: "rain",             label: "Rain" },
  { value: "rainAccumulation", label: "Precip accumulation" },
  { value: "temp",             label: "Temperature" },
  { value: "clouds",           label: "Clouds" },
  { value: "pressure",         label: "Pressure" },
  { value: "rh",               label: "Humidity" },
];

function buildSrc(cfg, location) {
  const lat     = location?.latitude  ?? 39;
  const lon     = location?.longitude ?? -98;
  const zoom    = cfg.zoom    ?? 5;
  const overlay = cfg.overlay ?? "wind";
  const params  = new URLSearchParams({
    lat, lon, detailLat: lat, detailLon: lon,
    zoom, level: "surface", overlay, product: "ecmwf",
    menu: "", message: "true", marker: "", calendar: "now",
    type: "map", location: "coordinates",
    metricWind: "default", metricTemp: "default"
  });
  return `https://embed.windy.com/embed2.html?${params}`;
}

export function renderWindy(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.windy;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const location = settings.weather?.location;

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("wind", { size: 14 }), " Radar"])
    ]),
    el("div", { class: "panel-header__right" }, [
      el("button", {
        type: "button",
        class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Reload radar", title: "Reload",
        onClick: () => renderWindy(mount, settings, { onAttachDragHandle })
      }, [iconNode("refresh", { size: 14 })])
    ])
  ]);

  const body = el("div", { class: "panel-body panel-body--map" });

  if (!location) {
    body.appendChild(el("p", { class: "panel-empty" }, [
      "Set a city in Settings \u2192 Weather to center the radar."
    ]));
  } else {
    const iframe = el("iframe", {
      src: buildSrc(cfg, location),
      class: "map-iframe",
      allowfullscreen: "true",
      "aria-label": "Windy weather radar"
    });
    iframe.setAttribute("loading", "lazy");
    body.appendChild(iframe);
  }

  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) {
    onAttachDragHandle(header.querySelector(".panel-header__drag"));
  }
}
