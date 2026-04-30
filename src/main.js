// Vantage v0.7.1 — entry point. Loads settings, mounts widgets, wires UI.

import { loadSettings, saveSettings, onSettingsChanged, hasStoredSettings } from "./storage.js";
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
import { renderWindy }      from "./widgets/windy.js";
import { renderEmbed }      from "./widgets/embed.js";
import { renderPomodoro }   from "./widgets/pomodoro.js";
import { renderTodo }       from "./widgets/todo.js";
import { renderNotes }      from "./widgets/notes.js";
import { renderBookmarks }  from "./widgets/bookmarks.js";
import { renderWorldClock } from "./widgets/worldclock.js";
import { renderCrypto }     from "./widgets/crypto.js";
import { renderGithub }     from "./widgets/github.js";
import { renderQuote }      from "./widgets/quote.js";
import { renderPhoto }      from "./widgets/photo.js";
import { renderCountdown }  from "./widgets/countdown.js";
import { renderConverter }  from "./widgets/converter.js";
import { renderSettingsPanel, openPanel, closePanel } from "./settings.js";
import { showOnboarding } from "./onboarding.js";
import { renderWidgetPicker } from "./widget-picker.js";
import { makeReorderable, arrayMove } from "./utils/drag.js";

let currentSettings;
let greetingTeardown   = null;
let backgroundTeardown = null;
let pomodoroTeardown   = null;
let worldclockTeardown = null;
let countdownTeardown  = null;
let panelDragCleanup   = null;

// Fixed panel kinds (static mounts in newtab.html)
const FIXED_PANEL_KINDS = [
  "news", "rss", "calendar", "windy",
  "todo", "notes", "bookmarks", "crypto", "github", "photo", "countdown", "converter"
];

function getPanelKinds() {
  const embedKinds = (currentSettings.embeds || []).map(e => `embed-${e.id}`);
  return [...FIXED_PANEL_KINDS, ...embedKinds];
}

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
  applyAccent(currentSettings);
  applyCustomCSS(currentSettings.customCSS);
  injectStaticIcons();

  const isFirstInstall = !(await hasStoredSettings());
  if (isFirstInstall && !currentSettings.onboardingComplete) {
    await new Promise((resolve) => {
      showOnboarding(currentSettings, async (next) => {
        currentSettings = next;
        document.documentElement.setAttribute("data-theme", currentSettings.theme);
        await saveSettings(currentSettings);
        resolve();
      });
    });
  }

  mountAll();
  wireSettings();
  wireWidgetPicker();
  wireKeyboard();
  onSettingsChanged((next) => {
    if (!next) return;
    currentSettings = next;
    document.documentElement.setAttribute("data-theme", currentSettings.theme);
    applyAccent(currentSettings);
    applyCustomCSS(currentSettings.customCSS);
    mountAll();
  });
}

function injectStaticIcons() {
  const settingsBtn = document.getElementById("settings-toggle");
  if (settingsBtn && !settingsBtn.firstChild) {
    settingsBtn.appendChild(iconNode("settings", { size: 18 }));
  }
  const pickerBtn = document.getElementById("widget-picker-toggle");
  if (pickerBtn && !pickerBtn.firstChild) {
    pickerBtn.appendChild(iconNode("layout-grid", { size: 18 }));
  }
}

function mountAll() {
  // Teardowns
  if (greetingTeardown)   { greetingTeardown();   greetingTeardown   = null; }
  if (backgroundTeardown) { backgroundTeardown(); backgroundTeardown = null; }
  if (pomodoroTeardown)   { pomodoroTeardown();   pomodoroTeardown   = null; }
  if (worldclockTeardown) { worldclockTeardown(); worldclockTeardown = null; }
  if (countdownTeardown)  { countdownTeardown();  countdownTeardown  = null; }
  if (panelDragCleanup)   { panelDragCleanup();   panelDragCleanup   = null; }

  // Crypto interval cleanup (stored on mount element)
  const cryptoMount = document.getElementById("crypto-mount");
  if (cryptoMount?._cryptoCleanup) { cryptoMount._cryptoCleanup(); cryptoMount._cryptoCleanup = null; }

  // Background
  renderBackground(
    document.getElementById("background-mount"),
    currentSettings,
    saveSettings
  ).then((teardown) => { backgroundTeardown = teardown; })
   .catch((err) => console.error("[Vantage] background failed", err));

  // Hero
  greetingTeardown = renderGreeting(document.getElementById("greeting-mount"), currentSettings);
  renderSearch(document.getElementById("search-mount"), currentSettings, persist);
  renderWeather(document.getElementById("weather-mount"), currentSettings, saveSettings);
  renderAirQuality(document.getElementById("airquality-mount"), currentSettings);
  renderQuickLinks(
    document.getElementById("quicklinks-mount"),
    currentSettings,
    { onChange: persist }
  );

  // World clock strip
  worldclockTeardown = renderWorldClock(
    document.getElementById("worldclock-mount"),
    currentSettings
  );

  // Quote banner
  renderQuote(
    document.getElementById("quote-mount"),
    currentSettings,
    { onSave: persist }
  );

  // Pomodoro
  pomodoroTeardown = renderPomodoro(
    document.getElementById("pomodoro-mount"),
    currentSettings
  );

  // Sync dynamic embed mounts before applying order
  syncEmbedMounts();
  applyPanelOrder();

  // Collect drag handles; wire reorder after all renders complete
  const panelHandles = {};
  const onAttach = (kind) => (handle) => {
    if (handle) panelHandles[kind] = handle;
  };

  // Fixed panels
  renderNews(document.getElementById("news-mount"), currentSettings, { onAttachDragHandle: onAttach("news") });
  renderRss(document.getElementById("rss-mount"),  currentSettings, { onAttachDragHandle: onAttach("rss") });
  renderCalendar(document.getElementById("calendar-mount"), currentSettings, { onAttachDragHandle: onAttach("calendar") });
  renderWindy(document.getElementById("windy-mount"), currentSettings, { onAttachDragHandle: onAttach("windy") });
  renderTodo(document.getElementById("todo-mount"), currentSettings, { onChange: persist, onAttachDragHandle: onAttach("todo") });
  renderNotes(document.getElementById("notes-mount"), currentSettings, { onChange: persist, onAttachDragHandle: onAttach("notes") });
  renderBookmarks(document.getElementById("bookmarks-mount"), currentSettings, { onAttachDragHandle: onAttach("bookmarks") });
  renderCrypto(document.getElementById("crypto-mount"), currentSettings, { onAttachDragHandle: onAttach("crypto") });
  renderGithub(document.getElementById("github-mount"), currentSettings, { onAttachDragHandle: onAttach("github") });
  renderPhoto(document.getElementById("photo-mount"), currentSettings, { onAttachDragHandle: onAttach("photo") });
  countdownTeardown = renderCountdown(document.getElementById("countdown-mount"), currentSettings, { onChange: persist, onAttachDragHandle: onAttach("countdown") });
  renderConverter(document.getElementById("converter-mount"), currentSettings, { onAttachDragHandle: onAttach("converter") });

  // Dynamic embed panels
  for (const embed of (currentSettings.embeds || [])) {
    const kind  = `embed-${embed.id}`;
    const mount = document.getElementById(`${kind}-mount`);
    if (mount) renderEmbed(mount, embed, { onAttachDragHandle: onAttach(kind) });
  }

  // Wire drag-to-reorder after all renders finish
  requestAnimationFrame(() => wirePanelReorder(panelHandles));
}

/** Create or remove embed mount divs to match settings.embeds. */
function syncEmbedMounts() {
  const section = document.querySelector(".reading");
  if (!section) return;

  const neededIds = new Set((currentSettings.embeds || []).map(e => `embed-${e.id}-mount`));

  // Remove stale embed mounts
  section.querySelectorAll(".embed-dynamic-mount").forEach((el) => {
    if (!neededIds.has(el.id)) el.remove();
  });

  // Add missing embed mounts
  for (const embed of (currentSettings.embeds || [])) {
    const id = `embed-${embed.id}-mount`;
    if (!document.getElementById(id)) {
      const div = document.createElement("div");
      div.id        = id;
      div.className = "panel panel--map embed-dynamic-mount";
      div.dataset.widget = `embed-${embed.id}`;
      section.appendChild(div);
    }
  }
}

function applyPanelOrder() {
  const panelKinds = getPanelKinds();
  const saved  = (currentSettings.layout?.panels || []).filter(k => panelKinds.includes(k));
  const order  = [...saved];
  for (const k of panelKinds) if (!order.includes(k)) order.push(k);
  order.forEach((kind, i) => {
    const mount = document.getElementById(`${kind}-mount`);
    if (mount) mount.style.order = String(i);
  });
}

function wirePanelReorder(handles) {
  const panelKinds = getPanelKinds();
  const items = panelKinds
    .map(k => document.getElementById(`${k}-mount`))
    .filter(el => el && el.style.display !== "none" && handles[el.id.replace("-mount", "")]);

  if (items.length < 2) return;

  panelDragCleanup = makeReorderable({
    items,
    handle: (panelEl) => {
      const kind = panelEl.id.replace("-mount", "");
      return handles[kind];
    },
    onReorder: async (from, to) => {
      const ordered  = arrayMove(items, from, to);
      const newKinds = ordered.map(el => el.id.replace("-mount", ""));
      currentSettings.layout = { ...(currentSettings.layout || {}), panels: newKinds };
      applyPanelOrder();
      await saveSettings(currentSettings);
    }
  });
}

function wireWidgetPicker() {
  const toggleBtn = document.getElementById("widget-picker-toggle");
  const pickerEl  = document.getElementById("widget-picker");
  if (!toggleBtn || !pickerEl) return;

  renderWidgetPicker(
    toggleBtn,
    pickerEl,
    () => currentSettings,
    async (next) => {
      currentSettings = next;
      await saveSettings(currentSettings);
      mountAll();
    },
    () => {
      // Open the full settings panel
      const panel  = document.getElementById("settings-panel");
      const toggle = document.getElementById("settings-toggle");
      renderSettingsPanel(panel, currentSettings, async (next) => {
        currentSettings = next;
        await saveSettings(currentSettings);
        mountAll();
      }, { showWizard: launchWizard });
      toggle.setAttribute("aria-expanded", "true");
      openPanel(panel);
    }
  );
}

function launchWizard() {
  const panel  = document.getElementById("settings-panel");
  const toggle = document.getElementById("settings-toggle");
  closePanel(panel);
  toggle.setAttribute("aria-expanded", "false");
  showOnboarding(currentSettings, async (next) => {
    currentSettings = next;
    document.documentElement.setAttribute("data-theme", currentSettings.theme);
    await saveSettings(currentSettings);
    mountAll();
  });
}

function wireSettings() {
  const toggle   = document.getElementById("settings-toggle");
  const panel    = document.getElementById("settings-panel");
  const backdrop = document.getElementById("settings-backdrop");

  const onChange = async (next) => {
    currentSettings = next;
    await saveSettings(currentSettings);
    mountAll();
  };

  const open = () => {
    renderSettingsPanel(panel, currentSettings, onChange, { showWizard: launchWizard });
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
    const tag    = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
    if (document.getElementById("settings-panel")?.dataset.open === "true") return;
    e.preventDefault();
    document.querySelector(".search-input")?.focus();
  });
}

function applyAccent(settings) {
  const accent = settings.accent || "mauve";
  if (accent === "mauve") {
    document.documentElement.removeAttribute("data-accent");
  } else {
    document.documentElement.setAttribute("data-accent", accent);
  }
}

function applyCustomCSS(css) {
  let style = document.getElementById("vantage-custom-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "vantage-custom-css";
    document.head.appendChild(style);
  }
  style.textContent = css || "";
}

async function persist(next) {
  currentSettings = next;
  await saveSettings(currentSettings);
}

init().catch((err) => {
  console.error("[Vantage] init failed", err);
});
