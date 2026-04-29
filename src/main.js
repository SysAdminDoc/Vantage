// Vantage v0.2.0 — entry point. Loads settings, mounts widgets, wires UI.

import { loadSettings, saveSettings, onSettingsChanged } from "./storage.js";
import { iconNode } from "./icons.js";
import { renderSearch } from "./widgets/search.js";
import { renderGreeting } from "./widgets/clock.js";
import { renderWeather } from "./widgets/weather.js";
import { renderQuickLinks } from "./widgets/quicklinks.js";
import { renderRss } from "./widgets/rss.js";
import { renderNews } from "./widgets/news.js";
import { renderSettingsPanel, openPanel, closePanel } from "./settings.js";

let currentSettings;
let greetingTeardown = null;

async function init() {
  currentSettings = await loadSettings();
  document.documentElement.setAttribute("data-theme", currentSettings.theme);
  injectStaticIcons();
  mountAll();
  wireSettings();
  wireKeyboard();
  onSettingsChanged((next) => {
    if (!next) return;
    currentSettings = next;
    document.documentElement.setAttribute("data-theme", currentSettings.theme);
    mountAll();
  });
}

function injectStaticIcons() {
  const settingsBtn = document.getElementById("settings-toggle");
  if (settingsBtn && !settingsBtn.firstChild) {
    settingsBtn.appendChild(iconNode("settings", { size: 18 }));
  }
}

function mountAll() {
  if (greetingTeardown) { greetingTeardown(); greetingTeardown = null; }

  greetingTeardown = renderGreeting(document.getElementById("greeting-mount"), currentSettings);
  renderSearch(document.getElementById("search-mount"), currentSettings, persist);
  renderWeather(document.getElementById("weather-mount"), currentSettings, saveSettings);
  renderQuickLinks(document.getElementById("quicklinks-mount"), currentSettings);
  renderRss(document.getElementById("rss-mount"), currentSettings);
  renderNews(document.getElementById("news-mount"), currentSettings);
}

function wireSettings() {
  const toggle = document.getElementById("settings-toggle");
  const panel = document.getElementById("settings-panel");
  const backdrop = document.getElementById("settings-backdrop");

  const open = () => {
    renderSettingsPanel(panel, currentSettings, async (next) => {
      currentSettings = next;
      await saveSettings(currentSettings);
      mountAll();
    });
    toggle.setAttribute("aria-expanded", "true");
    openPanel(panel);
  };
  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    closePanel(panel);
  };

  toggle.addEventListener("click", () => {
    panel.dataset.open === "true" ? close() : open();
  });

  backdrop.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.dataset.open === "true") {
      // Let the engine picker handle Escape first if it's open inside settings.
      const popoverOpen = panel.querySelector('.engine-picker__popover:not([hidden])');
      if (!popoverOpen) close();
    }
  });
}

function wireKeyboard() {
  // Press / to focus the search input (only when not already typing into a field).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
    if (document.getElementById("settings-panel")?.dataset.open === "true") return;
    e.preventDefault();
    const input = document.querySelector(".search-input");
    input?.focus();
  });
}

async function persist(next) {
  currentSettings = next;
  await saveSettings(currentSettings);
}

init().catch((err) => {
  console.error("[Vantage] init failed", err);
});
