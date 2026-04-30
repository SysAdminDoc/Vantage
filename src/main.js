// Vantage v0.6.0 — entry point. Loads settings, mounts widgets, wires UI.

import { loadSettings, saveSettings, onSettingsChanged } from "./storage.js";
import { iconNode } from "./icons.js";
import { renderSearch }     from "./widgets/search.js";
import { renderGreeting }   from "./widgets/clock.js";
import { renderWeather }    from "./widgets/weather.js";
import { renderQuickLinks } from "./widgets/quicklinks.js";
import { renderRss }        from "./widgets/rss.js";
import { renderNews }       from "./widgets/news.js";
import { renderBackground } from "./widgets/background.js";
import { renderAirQuality } from "./widgets/airquality.js";
import { renderCalendar }   from "./widgets/calendar.js";
import { renderPomodoro }   from "./widgets/pomodoro.js";
import { renderSettingsPanel, openPanel, closePanel } from "./settings.js";
import { makeReorderable, arrayMove } from "./utils/drag.js";

let currentSettings;
let greetingTeardown  = null;
let panelDragCleanup  = null;
let backgroundTeardown = null;
let pomodoroTeardown  = null;

const PANEL_KINDS = ["news", "rss", "calendar"];

async function init() {
  // Handle shared-config URL fragment (#import=<base64-json>)
  const hash = location.hash;
  if (hash.startsWith("#import=")) {
    try {
      const encoded = hash.slice(8);
      const imported = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      await saveSettings(imported);
      history.replaceState(null, "", location.pathname);
    } catch {
      console.warn("[Vantage] Failed to import shared config from URL hash");
    }
  }

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
  if (greetingTeardown)   { greetingTeardown();   greetingTeardown  = null; }
  if (panelDragCleanup)   { panelDragCleanup();   panelDragCleanup  = null; }
  if (backgroundTeardown) { backgroundTeardown(); backgroundTeardown = null; }
  if (pomodoroTeardown)   { pomodoroTeardown();   pomodoroTeardown  = null; }

  // Kick off animated background asynchronously — don't block the rest.
  renderBackground(
    document.getElementById("background-mount"),
    currentSettings,
    saveSettings
  ).then((teardown) => { backgroundTeardown = teardown; })
   .catch((err) => console.error("[Vantage] background failed", err));

  greetingTeardown = renderGreeting(document.getElementById("greeting-mount"), currentSettings);
  renderSearch(document.getElementById("search-mount"), currentSettings, persist);
  renderWeather(document.getElementById("weather-mount"), currentSettings, saveSettings);
  renderAirQuality(document.getElementById("airquality-mount"), currentSettings);
  renderQuickLinks(
    document.getElementById("quicklinks-mount"),
    currentSettings,
    { onChange: persist }
  );

  // Pomodoro — returns a teardown fn
  pomodoroTeardown = renderPomodoro(
    document.getElementById("pomodoro-mount"),
    currentSettings
  );

  // Apply persisted panel order via CSS `order` so we don't move DOM nodes.
  applyPanelOrder();

  // Each panel's renderer hands its drag handle back to us so we can wire reorder.
  const panelHandles = {};
  const onAttach = (kind) => (handle) => {
    panelHandles[kind] = handle;
    if (Object.keys(panelHandles).length === PANEL_KINDS.length) {
      wirePanelReorder(panelHandles);
    }
  };

  renderNews(document.getElementById("news-mount"), currentSettings, { onAttachDragHandle: onAttach("news") });
  renderRss(document.getElementById("rss-mount"),  currentSettings, { onAttachDragHandle: onAttach("rss") });
  renderCalendar(document.getElementById("calendar-mount"), currentSettings, { onAttachDragHandle: onAttach("calendar") });
}

function applyPanelOrder() {
  const order = (currentSettings.layout?.panels || PANEL_KINDS).filter((k) => PANEL_KINDS.includes(k));
  for (const k of PANEL_KINDS) if (!order.includes(k)) order.push(k);
  order.forEach((kind, i) => {
    const mount = document.getElementById(`${kind}-mount`);
    if (mount) mount.style.order = String(i);
  });
}

function wirePanelReorder(handles) {
  const items = PANEL_KINDS.map((k) => document.getElementById(`${k}-mount`));
  if (items.some((el) => !el)) return;

  panelDragCleanup = makeReorderable({
    items,
    handle: (panelEl) => {
      const kind = panelEl.id.replace("-mount", "");
      return handles[kind];
    },
    onReorder: async (from, to) => {
      const ordered = arrayMove(items, from, to);
      const newKinds = ordered.map((el) => el.id.replace("-mount", ""));
      currentSettings.layout = { ...(currentSettings.layout || {}), panels: newKinds };
      applyPanelOrder();
      await saveSettings(currentSettings);
    }
  });
}

function wireSettings() {
  const toggle   = document.getElementById("settings-toggle");
  const panel    = document.getElementById("settings-panel");
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
      const popoverOpen = panel.querySelector(".engine-picker__popover:not([hidden])");
      if (!popoverOpen) close();
    }
  });
}

function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
    if (document.getElementById("settings-panel")?.dataset.open === "true") return;
    e.preventDefault();
    document.querySelector(".search-input")?.focus();
  });
}

async function persist(next) {
  currentSettings = next;
  await saveSettings(currentSettings);
}

init().catch((err) => {
  console.error("[Vantage] init failed", err);
});
