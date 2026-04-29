// Vantage v0.1.0 — settings panel renderer

import { el, clear, toast } from "./utils/dom.js";
import { SEARCH_ENGINES } from "./search-engines.js";
import { geocodeCity } from "./widgets/weather.js";
import { saveSettings, getDefaults } from "./storage.js";

export function renderSettingsPanel(panel, settings, onChange) {
  clear(panel);
  panel.appendChild(el("div", { class: "settings-header" }, [
    el("h2", {}, ["Settings"]),
    el("button", {
      class: "settings-close",
      "aria-label": "Close settings",
      onClick: () => closePanel(panel)
    }, ["×"])
  ]));

  panel.appendChild(buildAppearanceSection(settings, onChange));
  panel.appendChild(buildSearchSection(settings, onChange));
  panel.appendChild(buildWeatherSection(settings, onChange));
  panel.appendChild(buildClockSection(settings, onChange));
  panel.appendChild(buildLinksSection(settings, onChange));
  panel.appendChild(buildFeedsSection(settings, onChange, "rss", "RSS Feeds"));
  panel.appendChild(buildFeedsSection(settings, onChange, "news", "News Feeds"));
  panel.appendChild(buildResetSection(onChange));
}

export function openPanel(panel) {
  panel.dataset.open = "true";
  panel.setAttribute("aria-hidden", "false");
}

export function closePanel(panel) {
  panel.dataset.open = "false";
  panel.setAttribute("aria-hidden", "true");
}

function section(title) {
  return el("section", { class: "settings-section" }, [el("h3", {}, [title])]);
}

function buildAppearanceSection(settings, onChange) {
  const sec = section("Appearance");
  const themeSelect = el("select", {
    onChange: () => {
      settings.theme = themeSelect.value;
      document.documentElement.setAttribute("data-theme", settings.theme);
      onChange(settings);
    }
  }, [
    el("option", { value: "mocha", selected: settings.theme === "mocha" }, ["Catppuccin Mocha (dark)"]),
    el("option", { value: "latte", selected: settings.theme === "latte" }, ["Catppuccin Latte (light)"])
  ]);
  sec.appendChild(el("div", { class: "settings-row" }, [
    el("label", {}, ["Theme"]),
    themeSelect
  ]));
  return sec;
}

function buildSearchSection(settings, onChange) {
  const sec = section("Search");
  const engineSelect = el("select", {
    onChange: () => {
      settings.search.engine = engineSelect.value;
      onChange(settings);
      customRow.style.display = settings.search.engine === "custom" ? "" : "none";
    }
  });
  for (const [key, eng] of Object.entries(SEARCH_ENGINES)) {
    engineSelect.appendChild(el("option", {
      value: key,
      selected: settings.search.engine === key
    }, [eng.name]));
  }

  sec.appendChild(el("div", { class: "settings-row" }, [
    el("label", {}, ["Default engine"]),
    engineSelect
  ]));

  const customInput = el("input", {
    type: "text",
    placeholder: "https://example.com/search?q=%s",
    value: settings.search.customUrl || "",
    onInput: () => {
      settings.search.customUrl = customInput.value;
      onChange(settings);
    }
  });
  const customRow = el("div", { class: "settings-input-block" }, [
    el("label", {}, ["Custom search URL (use %s for query)"]),
    customInput
  ]);
  customRow.style.display = settings.search.engine === "custom" ? "" : "none";
  sec.appendChild(customRow);
  return sec;
}

function buildWeatherSection(settings, onChange) {
  const sec = section("Weather");

  const enabled = el("input", {
    type: "checkbox",
    checked: settings.weather.enabled,
    onChange: () => {
      settings.weather.enabled = enabled.checked;
      onChange(settings);
    }
  });
  sec.appendChild(el("div", { class: "settings-row" }, [
    el("label", {}, ["Enabled"]),
    enabled
  ]));

  const unitsSelect = el("select", {
    onChange: () => {
      settings.weather.units = unitsSelect.value;
      onChange(settings);
    }
  }, [
    el("option", { value: "fahrenheit", selected: settings.weather.units === "fahrenheit" }, ["Fahrenheit (°F)"]),
    el("option", { value: "celsius", selected: settings.weather.units === "celsius" }, ["Celsius (°C)"])
  ]);
  sec.appendChild(el("div", { class: "settings-row" }, [
    el("label", {}, ["Units"]),
    unitsSelect
  ]));

  const cityInput = el("input", {
    type: "text",
    placeholder: "City name (e.g. Phoenix, AZ)"
  });
  const cityBtn = el("button", {
    class: "settings-add-btn",
    onClick: async () => {
      const q = cityInput.value.trim();
      if (!q) return;
      try {
        const loc = await geocodeCity(q);
        settings.weather.location = loc;
        onChange(settings);
        toast(`Location set: ${loc.name}`, "success");
        cityInput.value = "";
      } catch (err) {
        toast(`Geocode failed: ${err.message}`, "error");
      }
    }
  }, ["Set city"]);

  sec.appendChild(el("div", { class: "settings-input-block" }, [
    el("label", {}, [`Location: ${settings.weather.location?.name || "(auto-detect)"}`]),
    cityInput,
    cityBtn
  ]));

  const autoBtn = el("button", {
    class: "settings-secondary-btn",
    onClick: () => {
      settings.weather.location = null;
      onChange(settings);
      toast("Will auto-detect on next load", "success");
    }
  }, ["Reset to auto-detect"]);
  sec.appendChild(autoBtn);

  return sec;
}

function buildClockSection(settings, onChange) {
  const sec = section("Clock");
  const enabled = el("input", {
    type: "checkbox",
    checked: settings.clock.enabled,
    onChange: () => {
      settings.clock.enabled = enabled.checked;
      onChange(settings);
    }
  });
  sec.appendChild(el("div", { class: "settings-row" }, [el("label", {}, ["Enabled"]), enabled]));

  const fmt24 = el("input", {
    type: "checkbox",
    checked: settings.clock.format24,
    onChange: () => {
      settings.clock.format24 = fmt24.checked;
      onChange(settings);
    }
  });
  sec.appendChild(el("div", { class: "settings-row" }, [el("label", {}, ["24-hour format"]), fmt24]));

  const showSeconds = el("input", {
    type: "checkbox",
    checked: settings.clock.showSeconds,
    onChange: () => {
      settings.clock.showSeconds = showSeconds.checked;
      onChange(settings);
    }
  });
  sec.appendChild(el("div", { class: "settings-row" }, [el("label", {}, ["Show seconds"]), showSeconds]));

  return sec;
}

function buildLinksSection(settings, onChange) {
  const sec = section("Quick Links");

  const enabled = el("input", {
    type: "checkbox",
    checked: settings.quicklinks.enabled,
    onChange: () => {
      settings.quicklinks.enabled = enabled.checked;
      onChange(settings);
    }
  });
  sec.appendChild(el("div", { class: "settings-row" }, [el("label", {}, ["Enabled"]), enabled]));

  const list = el("ul", { class: "settings-list" });
  const refreshList = () => {
    clear(list);
    settings.quicklinks.items.forEach((item, idx) => {
      list.appendChild(el("li", {}, [
        el("span", { title: item.url }, [item.title]),
        el("button", {
          onClick: () => {
            settings.quicklinks.items.splice(idx, 1);
            onChange(settings);
            refreshList();
          }
        }, ["Remove"])
      ]));
    });
  };
  refreshList();
  sec.appendChild(list);

  const titleInput = el("input", { type: "text", placeholder: "Title (e.g. GitHub)" });
  const urlInput = el("input", { type: "text", placeholder: "https://github.com" });
  const addBtn = el("button", {
    class: "settings-add-btn",
    onClick: () => {
      const title = titleInput.value.trim();
      const url = urlInput.value.trim();
      if (!title || !url) {
        toast("Title and URL required", "error");
        return;
      }
      try { new URL(url); } catch {
        toast("Invalid URL", "error");
        return;
      }
      settings.quicklinks.items.push({ title, url });
      onChange(settings);
      titleInput.value = "";
      urlInput.value = "";
      refreshList();
    }
  }, ["Add link"]);

  sec.appendChild(el("div", { class: "settings-input-block" }, [
    el("label", {}, ["Add link"]),
    titleInput,
    urlInput,
    addBtn
  ]));

  return sec;
}

function buildFeedsSection(settings, onChange, key, title) {
  const sec = section(title);
  const cfg = settings[key];

  const enabled = el("input", {
    type: "checkbox",
    checked: cfg.enabled,
    onChange: () => {
      cfg.enabled = enabled.checked;
      onChange(settings);
    }
  });
  sec.appendChild(el("div", { class: "settings-row" }, [el("label", {}, ["Enabled"]), enabled]));

  const maxInput = el("input", {
    type: "number",
    min: "5",
    max: "50",
    value: cfg.maxItems,
    onChange: () => {
      const v = parseInt(maxInput.value, 10);
      if (!isNaN(v) && v >= 5 && v <= 50) {
        cfg.maxItems = v;
        onChange(settings);
      }
    }
  });
  sec.appendChild(el("div", { class: "settings-row" }, [el("label", {}, ["Max items"]), maxInput]));

  const list = el("ul", { class: "settings-list" });
  const refreshList = () => {
    clear(list);
    cfg.feeds.forEach((feed, idx) => {
      list.appendChild(el("li", {}, [
        el("span", { title: feed.url }, [feed.title || feed.url]),
        el("button", {
          onClick: () => {
            cfg.feeds.splice(idx, 1);
            onChange(settings);
            refreshList();
          }
        }, ["Remove"])
      ]));
    });
  };
  refreshList();
  sec.appendChild(list);

  const titleInput = el("input", { type: "text", placeholder: "Feed title (e.g. BBC)" });
  const urlInput = el("input", { type: "text", placeholder: "https://example.com/feed.xml" });
  const addBtn = el("button", {
    class: "settings-add-btn",
    onClick: () => {
      const t = titleInput.value.trim();
      const u = urlInput.value.trim();
      if (!u) {
        toast("Feed URL required", "error");
        return;
      }
      try { new URL(u); } catch {
        toast("Invalid URL", "error");
        return;
      }
      cfg.feeds.push({ title: t || u, url: u });
      onChange(settings);
      titleInput.value = "";
      urlInput.value = "";
      refreshList();
    }
  }, ["Add feed"]);

  sec.appendChild(el("div", { class: "settings-input-block" }, [
    el("label", {}, ["Add feed"]),
    titleInput,
    urlInput,
    addBtn
  ]));

  return sec;
}

function buildResetSection(onChange) {
  const sec = section("Reset");
  const btn = el("button", {
    class: "settings-secondary-btn",
    onClick: async () => {
      if (!confirm("Reset Vantage to defaults? Your custom feeds and links will be lost.")) return;
      const fresh = getDefaults();
      await saveSettings(fresh);
      onChange(fresh);
      toast("Settings reset to defaults", "success");
    }
  }, ["Reset to defaults"]);
  sec.appendChild(btn);
  return sec;
}
