// Vantage v0.1.0 — entry point. Loads settings, mounts widgets, wires the settings panel.

import { loadSettings, saveSettings, onSettingsChanged } from "./storage.js";
import { renderSearch } from "./widgets/search.js";
import { renderClock } from "./widgets/clock.js";
import { renderWeather } from "./widgets/weather.js";
import { renderQuickLinks } from "./widgets/quicklinks.js";
import { renderRss } from "./widgets/rss.js";
import { renderNews } from "./widgets/news.js";
import { renderSettingsPanel, openPanel, closePanel } from "./settings.js";

let currentSettings;
let clockTeardown = null;

async function init() {
  currentSettings = await loadSettings();
  document.documentElement.setAttribute("data-theme", currentSettings.theme);
  mountAll();
  wireSettingsToggle();
  // Cross-tab sync: if another tab updates storage, re-render here.
  onSettingsChanged((next) => {
    if (!next) return;
    currentSettings = next;
    document.documentElement.setAttribute("data-theme", currentSettings.theme);
    mountAll();
  });
}

function mountAll() {
  if (clockTeardown) { clockTeardown(); clockTeardown = null; }

  renderSearch(document.getElementById("search-mount"), currentSettings, persist);
  clockTeardown = renderClock(document.getElementById("clock-mount"), currentSettings);
  renderWeather(document.getElementById("weather-mount"), currentSettings, saveSettings);
  renderQuickLinks(document.getElementById("quicklinks-mount"), currentSettings);
  renderRss(document.getElementById("rss-mount"), currentSettings);
  renderNews(document.getElementById("news-mount"), currentSettings);
}

function wireSettingsToggle() {
  const toggle = document.getElementById("settings-toggle");
  const panel = document.getElementById("settings-panel");
  toggle.addEventListener("click", () => {
    renderSettingsPanel(panel, currentSettings, async (next) => {
      currentSettings = next;
      await saveSettings(currentSettings);
      mountAll();
    });
    openPanel(panel);
  });

  // Click-outside-to-close
  document.addEventListener("click", (e) => {
    if (panel.dataset.open !== "true") return;
    if (panel.contains(e.target) || toggle.contains(e.target)) return;
    closePanel(panel);
  });

  // Esc-to-close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.dataset.open === "true") {
      closePanel(panel);
    }
  });
}

async function persist(next) {
  currentSettings = next;
  await saveSettings(currentSettings);
}

init().catch((err) => {
  console.error("[Vantage] init failed", err);
});
