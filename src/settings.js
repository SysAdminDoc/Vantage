// Vantage v0.6.0 — settings panel built with primitives (toggle, segmented, icon-button).
// Sections render as grouped rows with hints and icons. Sticky header with close button.

import { el, clear, toggle, segmented, toast, hostnameLabel } from "./utils/dom.js";
import { iconNode } from "./icons.js";
import { SEARCH_ENGINES } from "./search-engines.js";
import { geocodeCity } from "./widgets/weather.js";
import { saveSettings, getDefaults } from "./storage.js";
import { exportOPML, importOPML } from "./utils/opml.js";

export function renderSettingsPanel(panel, settings, onChange, { showWizard } = {}) {
  clear(panel);

  // Sticky header
  panel.appendChild(el("header", { class: "settings-panel__header" }, [
    el("h2", { class: "settings-panel__title" }, ["Settings"]),
    el("button", {
      type: "button",
      class: "icon-button icon-button--ghost",
      "aria-label": "Close settings",
      title: "Close",
      onClick: () => closePanel(panel)
    }, [iconNode("close", { size: 18 })])
  ]));

  const body = el("div", { class: "settings-panel__body" });
  panel.appendChild(body);

  body.appendChild(buildAppearance(settings, onChange));
  body.appendChild(buildBackground(settings, onChange));
  body.appendChild(buildGreeting(settings, onChange));
  body.appendChild(buildSearchSection(settings, onChange));
  body.appendChild(buildWeatherSection(settings, onChange));
  body.appendChild(buildClockSection(settings, onChange));
  body.appendChild(buildLinksSection(settings, onChange));
  body.appendChild(buildFeedsSection(settings, onChange, "rss", "Reading list", "rss",
    "URLs you want to follow personally — RSS or Atom."));
  body.appendChild(buildFeedsSection(settings, onChange, "news", "News", "newspaper",
    "Curated headlines and news sources."));
  body.appendChild(buildAirQualitySection(settings, onChange));
  body.appendChild(buildWindySection(settings, onChange));
  body.appendChild(buildEmbedSection(settings, onChange));
  body.appendChild(buildCalendarSection(settings, onChange));
  body.appendChild(buildPomodoroSection(settings, onChange));
  body.appendChild(buildDataSection(settings, onChange, showWizard));
  body.appendChild(buildResetSection(onChange));
}

export function openPanel(panel) {
  panel.dataset.open = "true";
  panel.setAttribute("aria-hidden", "false");
  const backdrop = document.getElementById("settings-backdrop");
  if (backdrop) {
    backdrop.hidden = false;
    requestAnimationFrame(() => { backdrop.dataset.open = "true"; });
  }
  document.body.style.overflow = "hidden";
  // Focus first interactive element after transition.
  setTimeout(() => {
    const first = panel.querySelector(".settings-panel__body button, .settings-panel__body input, .settings-panel__body [tabindex]:not([tabindex='-1'])");
    if (first) first.focus({ preventScroll: true });
  }, 280);
}

export function closePanel(panel) {
  panel.dataset.open = "false";
  panel.setAttribute("aria-hidden", "true");
  const backdrop = document.getElementById("settings-backdrop");
  if (backdrop) {
    backdrop.dataset.open = "false";
    setTimeout(() => { backdrop.hidden = true; }, 280);
  }
  document.body.style.overflow = "";
  document.getElementById("settings-toggle")?.focus({ preventScroll: true });
}

/* ---- Section builders -------------------------------------------------- */

function section(title, iconName) {
  const sec = el("section", { class: "settings-section" });
  sec.appendChild(el("h3", { class: "settings-section__title" }, [
    iconName ? iconNode(iconName, { size: 14 }) : null,
    title
  ]));
  return sec;
}

function group() {
  return el("div", { class: "settings-section__group" });
}

function row(title, hint, control) {
  return el("div", { class: "settings-row" }, [
    el("div", { class: "settings-row__label" }, [
      el("span", { class: "settings-row__title" }, [title]),
      hint ? el("span", { class: "settings-row__hint" }, [hint]) : null
    ]),
    el("div", { class: "settings-row__control" }, [control])
  ]);
}

function rowColumn(title, control, hint) {
  return el("div", { class: "settings-row settings-row--column" }, [
    el("div", { class: "settings-row__label" }, [
      el("span", { class: "settings-row__title" }, [title]),
      hint ? el("span", { class: "settings-row__hint" }, [hint]) : null
    ]),
    control
  ]);
}

/* ---- Appearance -------------------------------------------------------- */

function buildAppearance(settings, onChange) {
  const sec = section("Appearance", "palette");
  const g = group();
  g.appendChild(row(
    "Theme",
    "Catppuccin palette in dark or light.",
    segmented({
      ariaLabel: "Theme",
      value: settings.theme,
      options: [
        { value: "mocha", label: "Mocha" },
        { value: "latte", label: "Latte" }
      ],
      onChange: (v) => {
        settings.theme = v;
        document.documentElement.setAttribute("data-theme", v);
        onChange(settings);
      }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Background -------------------------------------------------------- */

function buildBackground(settings, onChange) {
  const sec = section("Background", "cloud");
  const g = group();
  g.appendChild(row(
    "Animated background",
    "Sky color, sun arc, weather, and time-of-day scenery driven by your live weather. Off uses a static gradient.",
    toggle({
      checked: settings.background.enabled,
      ariaLabel: "Animated background",
      onChange: (v) => { settings.background.enabled = v; onChange(settings); }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Greeting ---------------------------------------------------------- */

function buildGreeting(settings, onChange) {
  const sec = section("Greeting", "info");
  const g = group();
  g.appendChild(row(
    "Show greeting",
    "Time-aware “Good morning / evening” above the search bar.",
    toggle({
      checked: settings.greeting.enabled,
      ariaLabel: "Show greeting",
      onChange: (v) => { settings.greeting.enabled = v; onChange(settings); }
    })
  ));

  const nameInput = el("input", {
    type: "text",
    class: "text-input text-input--inline",
    placeholder: "Your name",
    value: settings.greeting.name || "",
    "aria-label": "Display name in greeting",
    onChange: (e) => { settings.greeting.name = e.target.value.trim(); onChange(settings); }
  });
  g.appendChild(row(
    "Display name",
    "Optional — appears as “Good evening, Matthew”.",
    nameInput
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Search ------------------------------------------------------------ */

function buildSearchSection(settings, onChange) {
  const sec = section("Search", "search");
  const g = group();

  const select = el("select", {
    class: "text-input text-input--inline",
    "aria-label": "Default search engine",
    onChange: (e) => {
      settings.search.engine = e.target.value;
      onChange(settings);
      customRow.style.display = settings.search.engine === "custom" ? "" : "none";
    }
  });
  for (const [key, eng] of Object.entries(SEARCH_ENGINES)) {
    const opt = el("option", { value: key, selected: settings.search.engine === key }, [eng.name]);
    select.appendChild(opt);
  }
  g.appendChild(row(
    "Default engine",
    "Used when you press Enter or hit the search button.",
    select
  ));

  const customInput = el("input", {
    type: "text",
    class: "text-input",
    placeholder: "https://example.com/search?q=%s",
    value: settings.search.customUrl || "",
    onChange: (e) => { settings.search.customUrl = e.target.value; onChange(settings); }
  });
  const customRow = rowColumn(
    "Custom URL",
    customInput,
    "Use %s where the query goes. Falls back to DuckDuckGo if missing."
  );
  customRow.style.display = settings.search.engine === "custom" ? "" : "none";
  g.appendChild(customRow);

  sec.appendChild(g);
  return sec;
}

/* ---- Weather ----------------------------------------------------------- */

function buildWeatherSection(settings, onChange) {
  const sec = section("Weather", "cloud");
  const g = group();

  g.appendChild(row(
    "Show weather",
    "Open-Meteo data — no account or API key needed.",
    toggle({
      checked: settings.weather.enabled,
      ariaLabel: "Show weather",
      onChange: (v) => { settings.weather.enabled = v; onChange(settings); }
    })
  ));

  g.appendChild(row(
    "Units",
    null,
    segmented({
      ariaLabel: "Units",
      value: settings.weather.units,
      options: [
        { value: "fahrenheit", label: "°F" },
        { value: "celsius", label: "°C" }
      ],
      onChange: (v) => { settings.weather.units = v; onChange(settings); }
    })
  ));

  // Current location chip
  const chipHost = el("div", { class: "settings-row__control", style: { flexWrap: "wrap" } });
  const refreshChip = () => {
    clear(chipHost);
    const locName = settings.weather.location?.name || "Auto";
    const chip = el("div", { class: "chip" }, [
      iconNode("globe", { size: 14 }),
      el("span", {}, [locName])
    ]);
    if (settings.weather.location) {
      const close = el("button", {
        type: "button",
        class: "chip__close",
        "aria-label": "Reset to auto-detect",
        title: "Reset to auto-detect",
        onClick: () => {
          settings.weather.location = null;
          onChange(settings);
          refreshChip();
          toast("Will auto-detect on next load.", "success");
        }
      }, [iconNode("close", { size: 12 })]);
      chip.appendChild(close);
    }
    chipHost.appendChild(chip);
  };
  refreshChip();

  g.appendChild(el("div", { class: "settings-row" }, [
    el("div", { class: "settings-row__label" }, [
      el("span", { class: "settings-row__title" }, ["Location"]),
      el("span", { class: "settings-row__hint" }, ["Auto-detected on first load. Override below."])
    ]),
    chipHost
  ]));

  // Inline geocode form
  const cityInput = el("input", {
    type: "text",
    class: "text-input",
    placeholder: "e.g. Phoenix, AZ",
    "aria-label": "City name"
  });
  const cityBtn = el("button", {
    type: "button",
    class: "button button--primary",
    onClick: async () => {
      const q = cityInput.value.trim();
      if (!q) return;
      cityBtn.disabled = true;
      try {
        const loc = await geocodeCity(q);
        settings.weather.location = loc;
        onChange(settings);
        cityInput.value = "";
        refreshChip();
        toast(`Location set to ${loc.name}.`, "success");
      } catch (err) {
        toast(`Couldn’t find "${q}".`, "error");
      } finally {
        cityBtn.disabled = false;
      }
    }
  }, ["Set"]);

  const compose = el("div", { class: "compose" }, [
    el("div", { class: "compose__row" }, [cityInput, cityBtn])
  ]);
  g.appendChild(rowColumn("Set location", compose));

  sec.appendChild(g);
  return sec;
}

/* ---- Clock ------------------------------------------------------------- */

function buildClockSection(settings, onChange) {
  const sec = section("Clock", "clock");
  const g = group();
  g.appendChild(row(
    "Show clock",
    null,
    toggle({
      checked: settings.clock.enabled,
      ariaLabel: "Show clock",
      onChange: (v) => { settings.clock.enabled = v; onChange(settings); }
    })
  ));

  g.appendChild(row(
    "Time format",
    null,
    segmented({
      ariaLabel: "Time format",
      value: settings.clock.format24 ? "24" : "12",
      options: [
        { value: "12", label: "12-hour" },
        { value: "24", label: "24-hour" }
      ],
      onChange: (v) => { settings.clock.format24 = (v === "24"); onChange(settings); }
    })
  ));

  g.appendChild(row(
    "Show seconds",
    "Slightly more battery-intensive — clock ticks once per second.",
    toggle({
      checked: settings.clock.showSeconds,
      ariaLabel: "Show seconds",
      onChange: (v) => { settings.clock.showSeconds = v; onChange(settings); }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Quick links ------------------------------------------------------- */

function buildLinksSection(settings, onChange) {
  const sec = section("Quick links", "link");
  const g = group();
  g.appendChild(row(
    "Show quick links",
    null,
    toggle({
      checked: settings.quicklinks.enabled,
      ariaLabel: "Show quick links",
      onChange: (v) => { settings.quicklinks.enabled = v; onChange(settings); }
    })
  ));
  sec.appendChild(g);

  const list = el("ul", { class: "item-list" });
  const refreshList = () => {
    clear(list);
    if (!settings.quicklinks.items.length) {
      list.appendChild(el("li", { class: "item-list__empty" }, ["No links yet."]));
      return;
    }
    settings.quicklinks.items.forEach((item, idx) => {
      list.appendChild(el("li", { class: "item-list__row" }, [
        el("div", { class: "item-list__row-content" }, [
          el("span", { class: "item-list__title" }, [item.title]),
          el("span", { class: "item-list__hint" }, [hostnameLabel(item.url)])
        ]),
        el("button", {
          type: "button",
          class: "icon-button icon-button--ghost icon-button--small",
          "aria-label": `Remove ${item.title}`,
          title: `Remove ${item.title}`,
          onClick: () => {
            settings.quicklinks.items.splice(idx, 1);
            onChange(settings);
            refreshList();
          }
        }, [iconNode("trash", { size: 14 })])
      ]));
    });
  };
  refreshList();
  sec.appendChild(list);

  const titleInput = el("input", { type: "text", class: "text-input", placeholder: "Label, e.g. GitHub" });
  const urlInput = el("input", { type: "text", class: "text-input", placeholder: "https://github.com" });
  const addBtn = el("button", {
    type: "button",
    class: "button button--primary",
    onClick: () => {
      const t = titleInput.value.trim();
      const u = urlInput.value.trim();
      if (!t || !u) {
        toast("Label and URL are both required.", "error");
        return;
      }
      try { new URL(u); } catch {
        toast("That doesn’t look like a valid URL.", "error");
        return;
      }
      settings.quicklinks.items.push({ title: t, url: u });
      onChange(settings);
      titleInput.value = "";
      urlInput.value = "";
      refreshList();
      toast(`${t} added.`, "success");
    }
  }, [iconNode("plus", { size: 14 }), "Add link"]);

  sec.appendChild(el("div", { class: "compose" }, [
    titleInput,
    el("div", { class: "compose__row" }, [urlInput, addBtn])
  ]));

  return sec;
}

/* ---- Feeds (RSS / News share this) ------------------------------------ */

function buildFeedsSection(settings, onChange, key, title, iconName, hint) {
  const cfg = settings[key];
  const sec = section(title, iconName);
  const g = group();

  g.appendChild(row(
    "Show panel",
    hint,
    toggle({
      checked: cfg.enabled,
      ariaLabel: `Show ${title}`,
      onChange: (v) => { cfg.enabled = v; onChange(settings); }
    })
  ));

  const maxInput = el("input", {
    type: "number",
    min: "5",
    max: "50",
    value: String(cfg.maxItems),
    class: "text-input number-input",
    "aria-label": "Maximum items",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 5 && v <= 50) {
        cfg.maxItems = v;
        onChange(settings);
      }
    }
  });
  g.appendChild(row("Max items", "Between 5 and 50.", maxInput));
  sec.appendChild(g);

  const list = el("ul", { class: "item-list" });
  const refreshList = () => {
    clear(list);
    if (!cfg.feeds.length) {
      list.appendChild(el("li", { class: "item-list__empty" }, ["No feeds yet."]));
      return;
    }
    cfg.feeds.forEach((feed, idx) => {
      list.appendChild(el("li", { class: "item-list__row" }, [
        el("div", { class: "item-list__row-content" }, [
          el("span", { class: "item-list__title" }, [feed.title || feed.url]),
          el("span", { class: "item-list__hint" }, [hostnameLabel(feed.url)])
        ]),
        el("button", {
          type: "button",
          class: "icon-button icon-button--ghost icon-button--small",
          "aria-label": `Remove ${feed.title || feed.url}`,
          title: "Remove",
          onClick: () => {
            cfg.feeds.splice(idx, 1);
            onChange(settings);
            refreshList();
          }
        }, [iconNode("trash", { size: 14 })])
      ]));
    });
  };
  refreshList();
  sec.appendChild(list);

  const titleInput = el("input", { type: "text", class: "text-input", placeholder: "Label, e.g. BBC" });
  const urlInput = el("input", { type: "text", class: "text-input", placeholder: "https://example.com/feed.xml" });
  const addBtn = el("button", {
    type: "button",
    class: "button button--primary",
    onClick: () => {
      const t = titleInput.value.trim();
      const u = urlInput.value.trim();
      if (!u) {
        toast("Feed URL is required.", "error");
        return;
      }
      try { new URL(u); } catch {
        toast("That doesn’t look like a valid URL.", "error");
        return;
      }
      cfg.feeds.push({ title: t || hostnameLabel(u), url: u });
      onChange(settings);
      titleInput.value = "";
      urlInput.value = "";
      refreshList();
      toast(`Feed added.`, "success");
    }
  }, [iconNode("plus", { size: 14 }), "Add feed"]);

  sec.appendChild(el("div", { class: "compose" }, [
    titleInput,
    el("div", { class: "compose__row" }, [urlInput, addBtn])
  ]));

  return sec;
}

/* ---- Air quality ------------------------------------------------------- */

function buildAirQualitySection(settings, onChange) {
  const sec = section("Air quality", "wind");
  const g = group();
  g.appendChild(row(
    "Show air quality",
    "Live AQI + PM2.5, PM10, and pollen levels via Open-Meteo. Uses your weather location.",
    toggle({
      checked: settings.airquality?.enabled || false,
      ariaLabel: "Show air quality",
      onChange: (v) => {
        if (!settings.airquality) settings.airquality = {};
        settings.airquality.enabled = v;
        onChange(settings);
      }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Windy radar ------------------------------------------------------- */

const WINDY_OVERLAYS = [
  { value: "wind",             label: "Wind" },
  { value: "gust",             label: "Gusts" },
  { value: "rain",             label: "Rain" },
  { value: "rainAccumulation", label: "Precip accumulation" },
  { value: "temp",             label: "Temperature" },
  { value: "clouds",           label: "Clouds" },
  { value: "pressure",         label: "Pressure" },
  { value: "rh",               label: "Humidity" },
];

function buildWindySection(settings, onChange) {
  const cfg = settings.windy || {};
  const sec = section("Radar", "wind");
  const g = group();

  g.appendChild(row(
    "Show Windy radar",
    "Interactive weather radar via Windy.com. Uses your weather location as the map center.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Show Windy radar",
      onChange: (v) => {
        settings.windy = { ...cfg, enabled: v };
        onChange(settings);
      }
    })
  ));

  // Layer picker
  const overlaySelect = el("select", { class: "text-input", "aria-label": "Radar layer" },
    WINDY_OVERLAYS.map(o =>
      el("option", { value: o.value, selected: (cfg.overlay ?? "wind") === o.value }, [o.label])
    )
  );
  overlaySelect.addEventListener("change", () => {
    settings.windy = { ...cfg, overlay: overlaySelect.value };
    onChange(settings);
  });
  g.appendChild(row("Layer", "Which data layer to display on the radar.", overlaySelect));

  // Zoom
  const zoomInput = el("input", {
    type: "number", class: "text-input number-input",
    min: "3", max: "12", value: String(cfg.zoom ?? 5),
    "aria-label": "Map zoom level"
  });
  zoomInput.addEventListener("change", () => {
    const z = Math.min(12, Math.max(3, parseInt(zoomInput.value, 10) || 5));
    zoomInput.value = String(z);
    settings.windy = { ...cfg, zoom: z };
    onChange(settings);
  });
  g.appendChild(row("Zoom", "Map zoom level (3 = continent, 8 = city).", zoomInput));

  sec.appendChild(g);
  return sec;
}

/* ---- Embed (flight tracker / custom URL) -------------------------------- */

function buildEmbedSection(settings, onChange) {
  const cfg = settings.embed || {};
  const sec = section("Embed", "plane");
  const g = group();

  g.appendChild(row(
    "Show embed panel",
    "Embed any website as a panel — flight tracker, traffic map, dashboard, etc. " +
    "Some sites block embedding; use the \u201copen in new tab\u201d button if the panel is blank.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Show embed panel",
      onChange: (v) => {
        settings.embed = { ...cfg, enabled: v };
        onChange(settings);
      }
    })
  ));

  const titleInput = el("input", {
    type: "text", class: "text-input",
    value: cfg.title || "Flight Tracker",
    placeholder: "Panel title",
    "aria-label": "Embed panel title"
  });
  titleInput.addEventListener("change", () => {
    settings.embed = { ...cfg, title: titleInput.value.trim() || "Embed" };
    onChange(settings);
  });
  g.appendChild(row("Title", "Label shown in the panel header.", titleInput));

  const urlInput = el("input", {
    type: "url", class: "text-input",
    value: cfg.url || "",
    placeholder: "https://globe.adsbexchange.com/",
    "aria-label": "URL to embed"
  });
  urlInput.addEventListener("change", () => {
    settings.embed = { ...cfg, url: urlInput.value.trim() };
    onChange(settings);
  });
  g.appendChild(row(
    "URL",
    "Paste the full URL to embed. ADS-B Exchange, Flightradar24, OpenStreetMap, custom dashboards, etc.",
    urlInput
  ));

  sec.appendChild(g);
  return sec;
}

/* ---- Calendar ---------------------------------------------------------- */

function buildCalendarSection(settings, onChange) {
  const cfg = settings.calendar || {};
  const sec = section("Calendar", "calendar");
  const g = group();

  g.appendChild(row(
    "Show calendar",
    "Upcoming events from iCal (.ics) URLs — Google Calendar, Outlook, or any standard feed.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Show calendar",
      onChange: (v) => {
        if (!settings.calendar) settings.calendar = { enabled: false, feeds: [], maxItems: 10, daysAhead: 7 };
        settings.calendar.enabled = v;
        onChange(settings);
      }
    })
  ));

  const daysInput = el("input", {
    type: "number", min: "1", max: "30",
    value: String(cfg.daysAhead ?? 7),
    class: "text-input number-input",
    "aria-label": "Days ahead to show",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 1 && v <= 30) { settings.calendar.daysAhead = v; onChange(settings); }
    }
  });
  g.appendChild(row("Days ahead", "How many days of upcoming events to show (1–30).", daysInput));
  sec.appendChild(g);

  const list = el("ul", { class: "item-list" });
  const refreshList = () => {
    clear(list);
    const feeds = settings.calendar?.feeds || [];
    if (!feeds.length) { list.appendChild(el("li", { class: "item-list__empty" }, ["No calendars yet."])); return; }
    feeds.forEach((feed, idx) => {
      list.appendChild(el("li", { class: "item-list__row" }, [
        el("div", { class: "item-list__row-content" }, [
          el("span", { class: "item-list__title" }, [feed.title || feed.url]),
          el("span", { class: "item-list__hint" }, [hostnameLabel(feed.url)])
        ]),
        el("button", {
          type: "button", class: "icon-button icon-button--ghost icon-button--small",
          "aria-label": `Remove ${feed.title || feed.url}`, title: "Remove",
          onClick: () => { settings.calendar.feeds.splice(idx, 1); onChange(settings); refreshList(); }
        }, [iconNode("trash", { size: 14 })])
      ]));
    });
  };
  refreshList();
  sec.appendChild(list);

  const titleInput = el("input", { type: "text", class: "text-input", placeholder: "Label, e.g. Work" });
  const urlInput   = el("input", { type: "text", class: "text-input", placeholder: "https://calendar.google.com/…/basic.ics" });
  const addBtn = el("button", {
    type: "button", class: "button button--primary",
    onClick: () => {
      const t = titleInput.value.trim(), u = urlInput.value.trim();
      if (!u) { toast("iCal URL is required.", "error"); return; }
      try { new URL(u); } catch { toast("That doesn't look like a valid URL.", "error"); return; }
      if (!settings.calendar) settings.calendar = { enabled: false, feeds: [], maxItems: 10, daysAhead: 7 };
      settings.calendar.feeds.push({ title: t || hostnameLabel(u), url: u });
      onChange(settings);
      titleInput.value = ""; urlInput.value = "";
      refreshList();
      toast("Calendar added.", "success");
    }
  }, [iconNode("plus", { size: 14 }), "Add calendar"]);

  sec.appendChild(el("div", { class: "compose" }, [
    titleInput,
    el("div", { class: "compose__row" }, [urlInput, addBtn])
  ]));
  return sec;
}

/* ---- Pomodoro ---------------------------------------------------------- */

function buildPomodoroSection(settings, onChange) {
  const cfg = settings.pomodoro || {};
  const sec = section("Pomodoro", "timer");
  const g = group();

  g.appendChild(row(
    "Show Pomodoro timer",
    "Focus timer with work / break cycles. Pauses when you leave the tab. Notifies on completion.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Show Pomodoro timer",
      onChange: (v) => {
        if (!settings.pomodoro) settings.pomodoro = { enabled: false, workMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 };
        settings.pomodoro.enabled = v;
        onChange(settings);
      }
    })
  ));

  const numRow = (title, key, min, max) => {
    const inp = el("input", {
      type: "number", min: String(min), max: String(max),
      value: String(cfg[key] ?? 25),
      class: "text-input number-input",
      "aria-label": title,
      onChange: (e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= min && v <= max) { settings.pomodoro[key] = v; onChange(settings); }
      }
    });
    return row(title, null, inp);
  };

  g.appendChild(numRow("Work (minutes)", "workMinutes", 1, 120));
  g.appendChild(numRow("Short break (minutes)", "breakMinutes", 1, 60));
  g.appendChild(numRow("Long break (minutes)", "longBreakMinutes", 5, 120));
  g.appendChild(numRow("Sessions before long break", "sessionsBeforeLongBreak", 1, 10));
  sec.appendChild(g);
  return sec;
}

/* ---- Data (export / import / share) ----------------------------------- */

function buildDataSection(settings, onChange, showWizard) {
  const sec = section("Data", "download");
  const g = group();

  // Setup wizard re-launch
  if (showWizard) {
    g.appendChild(row(
      "Setup wizard",
      "Re-run the first-time setup to change your layout preset, name, or weather location.",
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: showWizard
      }, [iconNode("settings", { size: 14 }), "Run wizard"])
    ));
  }

  // JSON export
  g.appendChild(row(
    "Export settings",
    "Download all settings as a JSON file.",
    el("button", {
      type: "button", class: "button button--primary",
      onClick: () => {
        const json = JSON.stringify(settings, null, 2);
        triggerDownload(json, `vantage-settings-${isoDate()}.json`, "application/json");
        toast("Settings exported.", "success");
      }
    }, [iconNode("download", { size: 14 }), "Export JSON"])
  ));

  // JSON import
  const jsonImportInput = el("input", {
    type: "file", accept: ".json,application/json",
    style: { display: "none" },
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        await saveSettings(parsed);
        onChange(parsed);
        toast("Settings imported.", "success");
      } catch { toast("Invalid JSON file.", "error"); }
      jsonImportInput.value = "";
    }
  });
  g.appendChild(jsonImportInput);
  g.appendChild(row(
    "Import settings",
    "Load a previously exported JSON file.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => jsonImportInput.click()
    }, [iconNode("upload", { size: 14 }), "Import JSON"])
  ));

  // OPML export
  g.appendChild(row(
    "Export feeds",
    "Download RSS + News feeds as an OPML file (compatible with Feedly, Inoreader, NetNewsWire).",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => {
        const opml = exportOPML(settings);
        triggerDownload(opml, `vantage-feeds-${isoDate()}.opml`, "text/x-opml");
        toast("Feeds exported as OPML.", "success");
      }
    }, [iconNode("download", { size: 14 }), "Export OPML"])
  ));

  // OPML import
  const opmlImportInput = el("input", {
    type: "file", accept: ".opml,.xml,text/x-opml,application/xml",
    style: { display: "none" },
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const { rss, news } = importOPML(text);
        if (!settings.rss)  settings.rss  = { enabled: true, feeds: [], maxItems: 15, readItems: [] };
        if (!settings.news) settings.news = { enabled: true, feeds: [], maxItems: 15, readItems: [] };
        // Merge by URL (no duplicates)
        const mergeFeeds = (existing, incoming) => {
          const seen = new Set(existing.map(f => f.url));
          return [...existing, ...incoming.filter(f => !seen.has(f.url))];
        };
        settings.rss.feeds  = mergeFeeds(settings.rss.feeds,  rss);
        settings.news.feeds = mergeFeeds(settings.news.feeds, news);
        await saveSettings(settings);
        onChange(settings);
        toast(`Imported ${rss.length + news.length} feed(s) from OPML.`, "success");
      } catch (err) { toast(err.message || "Invalid OPML file.", "error"); }
      opmlImportInput.value = "";
    }
  });
  g.appendChild(opmlImportInput);
  g.appendChild(row(
    "Import feeds",
    "Merge feeds from an OPML file (your existing feeds are kept).",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => opmlImportInput.click()
    }, [iconNode("upload", { size: 14 }), "Import OPML"])
  ));

  // Share config URL
  g.appendChild(row(
    "Share config",
    "Copy a link that loads your settings into Vantage on any device where the extension is installed.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => {
        try {
          const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(settings))));
          const url = new URL(location.href);
          url.hash = `import=${encoded}`;
          navigator.clipboard.writeText(url.href).then(() => {
            toast("Share link copied to clipboard.", "success");
          }).catch(() => { toast("Clipboard access denied.", "error"); });
        } catch { toast("Could not generate share link.", "error"); }
      }
    }, [iconNode("share", { size: 14 }), "Copy share link"])
  ));

  sec.appendChild(g);
  return sec;
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

/* ---- Reset ------------------------------------------------------------- */

function buildResetSection(onChange) {
  const sec = section("Reset", "alert");
  const btn = el("button", {
    type: "button",
    class: "button button--danger button--block",
    onClick: async () => {
      if (!confirm("Reset Vantage to defaults? Your custom feeds, quick links, and location will be lost.")) return;
      const fresh = getDefaults();
      await saveSettings(fresh);
      onChange(fresh);
      toast("Settings reset to defaults.", "success");
    }
  }, [iconNode("trash", { size: 14 }), "Reset everything"]);
  sec.appendChild(btn);
  return sec;
}
