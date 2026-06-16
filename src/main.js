// Vantage v0.8.0 — entry point. Loads settings, mounts widgets, wires UI.

import { loadSettings, saveSettings, onSettingsChanged, hasStoredSettings } from "./storage.js";
import { iconNode } from "./icons.js";
import { setupRTL } from "./utils/i18n.js";
import { renderSearch }     from "./widgets/search.js";
import { renderGreeting }   from "./widgets/clock.js";
import { renderWeather }    from "./widgets/weather.js";
import { renderWeatherForecast } from "./widgets/weather-forecast.js";
import { renderQuickLinks } from "./widgets/quicklinks.js";
import { renderRss }        from "./widgets/rss.js";
import { renderNews }       from "./widgets/news.js";
import { renderBackground, onReducedMotionChange } from "./widgets/background.js";
import { renderAirQuality } from "./widgets/airquality.js";
import { renderMarine }     from "./widgets/marine.js";
import { renderFlood }      from "./widgets/flood.js";
import { renderSolarRadiation } from "./widgets/solar-radiation.js";
import { renderCalendar }   from "./widgets/calendar.js";
import { renderWindy }      from "./widgets/windy.js";
import { renderEmbed }      from "./widgets/embed.js";
import { renderPomodoro }   from "./widgets/pomodoro.js";
import { renderTodo }       from "./widgets/todo.js";
import { renderNotes }      from "./widgets/notes.js";
import { renderBookmarks }  from "./widgets/bookmarks.js";
import { renderStarred }    from "./widgets/starred.js";
import { renderAmbient }    from "./widgets/ambient.js";
import { renderHistorySearch } from "./widgets/history-search.js";
import { renderWorldClock } from "./widgets/worldclock.js";
import { renderCrypto }     from "./widgets/crypto.js";
import { renderGithub }     from "./widgets/github.js";
import { renderQuote }      from "./widgets/quote.js";
import { renderPhoto }      from "./widgets/photo.js";
import { renderCountdown }  from "./widgets/countdown.js";
import { renderConverter }  from "./widgets/converter.js";
import { renderTopsites }   from "./widgets/topsites.js";
import { renderSettingsPanel, openPanel, closePanel, normalizeImportedSettings, reviewHostPermissionsForSettings } from "./settings.js";
import { showPartialImportDialog } from "./utils/partial-import.js";
import { showOnboarding } from "./onboarding.js";
import { renderWidgetPicker } from "./widget-picker.js";
import { toast } from "./utils/dom.js";
import { makeReorderable, arrayMove } from "./utils/drag.js";
import { applyThemePreference, onSystemThemeChange } from "./utils/theme.js";
import { applyWorkspace, getActiveWorkspace, captureSnapshot, resolveWorkspaceSettings } from "./utils/workspace.js";
import { BACKGROUND_PREVIEW_EVENT } from "./utils/background-preview.js";
import { applyVisualQaOverrides } from "./utils/visual-qa.js";
import { attachThemeColorListener, applyThemeColorFromSettings } from "./utils/theme-color.js";
import { attachContextMenu } from "./utils/context-menu.js";
import { THEME_OPTIONS } from "./utils/theme.js";
import { attachErrorListeners } from "./utils/error-log.js";
import { markHostPermissionsDenied, onHostPermissionsRemoved } from "./utils/host-permissions.js";
import { hasOpenOverlay } from "./utils/overlay-stack.js";
window._vantageWorkspaceHelpers = { captureSnapshot: () => captureSnapshot(currentSettings) };

let currentSettings;
let greetingTeardown   = null;
let backgroundTeardown = null;
let pomodoroTeardown   = null;
let worldclockTeardown = null;
let countdownTeardown  = null;
let panelDragCleanup   = null;
let systemThemeCleanup   = null;
let reducedMotionCleanup = null;
let settingsPanelOnChange = null;
let contextMenuCleanup   = null;
let hostPermissionCleanup = null;

// Fixed panel kinds (static mounts in newtab.html)
const FIXED_PANEL_KINDS = [
  "news", "rss", "calendar", "windy",
  "todo", "notes", "bookmarks", "starred", "ambient", "history", "crypto", "github", "photo", "countdown", "converter"
];

function getPanelKinds() {
  const embedKinds = (currentSettings.embeds || []).map(e => `embed-${e.id}`);
  return [...FIXED_PANEL_KINDS, ...embedKinds];
}

async function init() {
  // Wire global error listeners FIRST so any failure in init() itself
  // gets logged for the Copy-debug-log button to surface.
  attachErrorListeners();
  
  // Setup RTL support if browser language is right-to-left (v1.0.0)
  setupRTL();

  // Handle shared-config URL fragment (#import=<base64-json>) — gated
  // through the partial-import dialog so users see what would change
  // before anything is overwritten (Q1 audit follow-up).
  let sharedImportNotice = null;
  let sharedImportedSettings = null;
  const hash = location.hash;
  if (hash.startsWith("#import=")) {
    try {
      const encoded = hash.slice(8);
      const imported = normalizeImportedSettings(JSON.parse(decodeURIComponent(escape(atob(encoded)))));
      const existing = await loadSettings();
      const merged = await showPartialImportDialog(existing, imported, "the shared link");
      if (merged) {
        const mergedWithPermissions = await reviewHostPermissionsForSettings(merged, "the shared link");
        await saveSettings(mergedWithPermissions);
        sharedImportedSettings = mergedWithPermissions;
        sharedImportNotice = { message: "Shared settings imported.", kind: "success" };
      } else {
        sharedImportNotice = { message: "Shared import canceled.", kind: "info" };
      }
    } catch (err) {
      console.warn("[Vantage] Failed to import shared config from URL hash", err);
      sharedImportNotice = { message: "Couldn't import shared settings. The link may be invalid.", kind: "error" };
    } finally {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
  }

  currentSettings = sharedImportedSettings || await loadSettings();

  // Encrypted API key vault — if enabled, decrypt-once-per-session.
  // Session cache prevents re-prompting on every new tab; the cache is
  // wiped on browser restart so a fresh launch always demands the
  // passphrase. Decrypted values live in `currentSettings` IN MEMORY
  // ONLY; they're never written back to chrome.storage.local.
  await unlockVaultIfNeeded();

  // Firefox container mapping — detect active container, apply workspace
  await applyContainerWorkspace();

  const initialEffectiveSettings = getVisualEffectiveSettings();
  applyTheme(initialEffectiveSettings);
  applyAccent(initialEffectiveSettings);
  applyCustomCSS(currentSettings.customCSS);
  applyFontPreferenceFromSettings(currentSettings);
  applySpeculationRulesFromSettings(currentSettings);
  injectStaticIcons();
  attachThemeColorListener();
  applyThemeColorFromSettings(initialEffectiveSettings);
  watchSystemTheme();
  watchReducedMotion();
  watchHostPermissionRemovals();

  const isFirstInstall = !sharedImportedSettings && !(await hasStoredSettings());
  if (isFirstInstall && !currentSettings.onboardingComplete) {
    await new Promise((resolve) => {
      showOnboarding(currentSettings, async (next) => {
        currentSettings = next;
        applyTheme(currentSettings);
        await saveSettings(currentSettings);
        resolve();
      });
    });
  }

  mountAll();
  wireSettings();
  wireWidgetPicker();
  wireKeyboard();
  wireContextMenu();
  if (sharedImportNotice) {
    requestAnimationFrame(() => toast(sharedImportNotice.message, sharedImportNotice.kind));
  }
  onSettingsChanged((next) => {
    if (!next) return;
    currentSettings = next;
    applyTheme(currentSettings);
    applyAccent(currentSettings);
    applyCustomCSS(currentSettings.customCSS);
    mountAll();
  });
}

/** If the user has the encrypted API key vault enabled, fetch the
 *  session-cached decrypted values OR prompt for the passphrase, then
 *  inject the decrypted keys into `currentSettings.crypto.apiKey` /
 *  `.photo.nasaKey` IN MEMORY ONLY. The on-disk values stay
 *  encrypted. Failure (wrong passphrase, no SubtleCrypto, user
 *  canceled) leaves the keys empty — widgets that need them will
 *  show their existing empty-state copy. */
async function unlockVaultIfNeeded() {
  const sec = currentSettings.security;
  if (!sec?.encryptKeys || !sec.encryptedBlob) return;

  const { decryptKeys, applyDecryptedToSettings, readCached, cacheDecrypted } =
    await import("./utils/api-key-vault.js");

  // Fast path: session cache from a previous tab in the same browser session.
  const cached = await readCached();
  if (cached) {
    applyDecryptedToSettings(currentSettings, cached);
    return;
  }

  // Slow path: prompt the user for the passphrase. Native `prompt()`
  // is sufficient here — full modal would interfere with init paint
  // ordering and the operation only happens once per browser session.
  const pp = window.prompt("Vantage vault — enter your passphrase to decrypt API keys (cancel to skip):");
  if (!pp) return; // user canceled — keep keys empty for this session
  try {
    const decrypted = await decryptKeys(pp, sec);
    applyDecryptedToSettings(currentSettings, decrypted);
    await cacheDecrypted(decrypted);
  } catch (err) {
    toast(err?.message || "Vault unlock failed.", "error", 6000);
  }
}

async function applyContainerWorkspace() {
  try {
    if (typeof browser === "undefined" || !browser.tabs?.getCurrent) return;
    const tab = await browser.tabs.getCurrent();
    const storeId = tab?.cookieStoreId;
    if (!storeId || storeId === "firefox-default") return;
    const wsId = currentSettings.containerMap?.[storeId];
    if (!wsId) return;
    const ws = currentSettings.workspaces?.list?.find(w => w.id === wsId);
    if (ws) {
      currentSettings = applyWorkspace(currentSettings, ws);
      currentSettings.workspaces = { ...currentSettings.workspaces, active: wsId };
    }
  } catch { /* not Firefox or no tab API */ }
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

  // Apply active workspace snapshot once; reused for all mounts below
  const effectiveSettings = getEffectiveSettings();
  const visualSettings = getVisualEffectiveSettings(effectiveSettings);
  applyTheme(visualSettings);
  applyAccent(visualSettings);

  // Background
  applyThemeColorFromSettings(visualSettings);
  renderBackground(
    document.getElementById("background-mount"),
    visualSettings,
    saveSettings
  ).then((teardown) => { backgroundTeardown = teardown; })
   .catch((err) => console.error("[Vantage] background failed", err));

  // Workspace bar
  renderWorkspaceBar(effectiveSettings);

  // Hero
  greetingTeardown = renderGreeting(document.getElementById("greeting-mount"), effectiveSettings);
  renderSearch(document.getElementById("search-mount"), effectiveSettings, persist);
  renderWeather(document.getElementById("weather-mount"), effectiveSettings, saveSettings);
  renderAirQuality(document.getElementById("airquality-mount"), effectiveSettings);
  renderMarine(document.getElementById("marine-mount"), effectiveSettings);
  renderFlood(document.getElementById("flood-mount"), effectiveSettings);
  renderSolarRadiation(document.getElementById("solar-radiation-mount"), effectiveSettings);
  renderWeatherForecast(document.getElementById("weather-forecast-mount"), effectiveSettings);
  renderTopsites(document.getElementById("topsites-mount"), effectiveSettings);
  renderQuickLinks(
    document.getElementById("quicklinks-mount"),
    effectiveSettings,
    { onChange: persist }
  );

  // World clock strip
  worldclockTeardown = renderWorldClock(
    document.getElementById("worldclock-mount"),
    effectiveSettings
  );

  // Quote banner
  renderQuote(
    document.getElementById("quote-mount"),
    effectiveSettings,
    { onSave: persist }
  );

  // Pomodoro
  pomodoroTeardown = renderPomodoro(
    document.getElementById("pomodoro-mount"),
    effectiveSettings
  );

  // Sync dynamic embed mounts before applying order
  syncEmbedMounts(effectiveSettings);
  applyPanelOrder(effectiveSettings);

  // Collect drag handles; wire reorder after all renders complete
  const panelHandles = {};
  const onAttach = (kind) => (handle) => {
    if (handle) panelHandles[kind] = handle;
  };

  // Fixed panels
  renderNews(document.getElementById("news-mount"), effectiveSettings, { onAttachDragHandle: onAttach("news") });
  renderRss(document.getElementById("rss-mount"),  effectiveSettings, { onAttachDragHandle: onAttach("rss") });
  renderCalendar(document.getElementById("calendar-mount"), effectiveSettings, { onAttachDragHandle: onAttach("calendar") });
  renderWindy(document.getElementById("windy-mount"), effectiveSettings, { onAttachDragHandle: onAttach("windy") });
  renderTodo(document.getElementById("todo-mount"), effectiveSettings, { onChange: persist, onAttachDragHandle: onAttach("todo") });
  renderNotes(document.getElementById("notes-mount"), effectiveSettings, { onChange: persist, onAttachDragHandle: onAttach("notes") });
  renderBookmarks(document.getElementById("bookmarks-mount"), effectiveSettings, { onAttachDragHandle: onAttach("bookmarks") });
  renderAmbient(document.getElementById("ambient-mount"), effectiveSettings, { onAttachDragHandle: onAttach("ambient"), onChange: persist });
  renderHistorySearch(document.getElementById("history-mount"), effectiveSettings, { onAttachDragHandle: onAttach("history") });
  renderStarred(document.getElementById("starred-mount"), effectiveSettings, {
    onAttachDragHandle: onAttach("starred"),
    onChange: (next) => {
      currentSettings.starred = next.starred;
      // Re-render the feed panels so their star icons reflect the change.
      renderRss(document.getElementById("rss-mount"),   effectiveSettings, { onAttachDragHandle: onAttach("rss")  });
      renderNews(document.getElementById("news-mount"), effectiveSettings, { onAttachDragHandle: onAttach("news") });
    }
  });
  renderCrypto(document.getElementById("crypto-mount"), effectiveSettings, { onAttachDragHandle: onAttach("crypto") });
  renderGithub(document.getElementById("github-mount"), effectiveSettings, { onAttachDragHandle: onAttach("github") });
  renderPhoto(document.getElementById("photo-mount"), effectiveSettings, { onAttachDragHandle: onAttach("photo"), onSave: persist });
  countdownTeardown = renderCountdown(document.getElementById("countdown-mount"), effectiveSettings, { onChange: persist, onAttachDragHandle: onAttach("countdown") });
  renderConverter(document.getElementById("converter-mount"), effectiveSettings, { onAttachDragHandle: onAttach("converter") });

  // Dynamic embed panels
  for (const embed of (effectiveSettings.embeds || [])) {
    const kind  = `embed-${embed.id}`;
    const mount = document.getElementById(`${kind}-mount`);
    if (mount) renderEmbed(mount, embed, { onAttachDragHandle: onAttach(kind) });
  }

  // Wire drag-to-reorder after all renders finish
  requestAnimationFrame(() => wirePanelReorder(panelHandles));
}

function renderWorkspaceBar(settings) {
  const bar = document.getElementById("workspace-bar");
  if (!bar) return;
  const list = settings.workspaces?.list || [];
  if (list.length === 0) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }
  bar.hidden = false;
  bar.innerHTML = "";

  const activeId = settings.workspaces.active;

  const baseBtn = document.createElement("button");
  baseBtn.type = "button";
  baseBtn.className = `workspace-pill${!activeId ? " workspace-pill--active" : ""}`;
  baseBtn.textContent = "Base";
  baseBtn.setAttribute("aria-pressed", String(!activeId));
  baseBtn.addEventListener("click", async () => {
    await switchWorkspace(null);
  });
  bar.appendChild(baseBtn);

  // Feature-detect CSS Anchor Positioning so we can render a stylable
  // tooltip on supporting browsers (Chrome 125+ / Firefox 147+ / Edge
  // 125+). Falls back to the native title attribute everywhere else.
  const supportsAnchor = CSS.supports?.("anchor-name", "--x") || false;

  for (const ws of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `workspace-pill${ws.id === activeId ? " workspace-pill--active" : ""}`;
    // Plain text node, not textContent on the button, so we can append
    // a tooltip span as a child without nuking the label.
    btn.appendChild(document.createTextNode(ws.name));
    btn.setAttribute("aria-pressed", String(ws.id === activeId));
    btn.addEventListener("click", async () => {
      await switchWorkspace(ws.id);
    });

    // Build a one-line snapshot summary so the user can confirm what
    // they're switching to before clicking.
    const summary = describeWorkspaceSnapshot(ws);
    if (summary) {
      if (supportsAnchor) {
        const anchorName = `--ws-${ws.id}`;
        btn.style.setProperty("anchor-name", anchorName);
        const tip = document.createElement("span");
        tip.className = "workspace-pill__tooltip";
        tip.textContent = summary;
        tip.setAttribute("role", "tooltip");
        tip.style.setProperty("position-anchor", anchorName);
        btn.appendChild(tip);
      } else {
        btn.title = summary;
      }
    }

    bar.appendChild(btn);

    if (ws.id === activeId && ws.presets?.length) {
      const presetBar = document.createElement("span");
      presetBar.className = "workspace-presets";
      ws.presets.forEach((preset, idx) => {
        const pb = document.createElement("button");
        pb.type = "button";
        pb.className = `workspace-preset-pill${ws.activePreset === idx ? " workspace-preset-pill--active" : ""}`;
        pb.textContent = preset.name || `Preset ${idx + 1}`;
        pb.setAttribute("aria-pressed", String(ws.activePreset === idx));
        pb.addEventListener("click", async (e) => {
          e.stopPropagation();
          ws.activePreset = ws.activePreset === idx ? null : idx;
          await saveSettings(currentSettings);
          mountAll();
        });
        presetBar.appendChild(pb);
      });
      bar.appendChild(presetBar);
    }
  }
}

/** One-line summary of a workspace snapshot for the hover tooltip. */
function describeWorkspaceSnapshot(ws) {
  const s = ws?.snapshot;
  if (!s) return "No snapshot captured yet — click to switch and capture later.";
  const parts = [];
  if (s.theme)             parts.push(s.theme);
  if (s.background?.kind)  parts.push(s.background.kind.replace(/-/g, " "));
  if (Array.isArray(s.quicklinks?.items)) {
    const n = s.quicklinks.items.length;
    if (n) parts.push(`${n} quick link${n === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

async function switchWorkspace(id) {
  const doSwitch = async () => {
    currentSettings.workspaces = { ...currentSettings.workspaces, active: id };
    await autoSaveContainerMapping(id);
    await saveSettings(currentSettings);
    mountAll();
  };
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(doSwitch);
  } else {
    await doSwitch();
  }
}

async function autoSaveContainerMapping(workspaceId) {
  try {
    if (typeof browser === "undefined" || !browser.tabs?.getCurrent) return;
    if (!currentSettings.containerAutoMap) return;
    const tab = await browser.tabs.getCurrent();
    const storeId = tab?.cookieStoreId;
    if (!storeId || storeId === "firefox-default") return;
    if (!currentSettings.containerMap) currentSettings.containerMap = {};
    if (workspaceId) {
      currentSettings.containerMap[storeId] = workspaceId;
    } else {
      delete currentSettings.containerMap[storeId];
    }
  } catch { /* not Firefox or no tab API */ }
}

/** Create or remove embed mount divs to match settings.embeds. */
function syncEmbedMounts(effectiveSettings) {
  const section = document.querySelector(".reading");
  if (!section) return;

  const neededIds = new Set((effectiveSettings.embeds || []).map(e => `embed-${e.id}-mount`));

  // Remove stale embed mounts
  section.querySelectorAll(".embed-dynamic-mount").forEach((el) => {
    if (!neededIds.has(el.id)) el.remove();
  });

  // Add missing embed mounts
  for (const embed of (effectiveSettings.embeds || [])) {
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

function applyPanelOrder(effectiveSettings) {
  const panelKinds = getPanelKinds();
  const saved  = (effectiveSettings.layout?.panels || []).filter(k => panelKinds.includes(k));
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
      applyPanelOrder(currentSettings);
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
    applyTheme(currentSettings);
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
    applyTheme(currentSettings);
    applyAccent(currentSettings);
    applyCustomCSS(currentSettings.customCSS);
    await saveSettings(currentSettings);
    mountAll();
  };
  settingsPanelOnChange = onChange;

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

  globalThis.addEventListener(BACKGROUND_PREVIEW_EVENT, () => {
    mountAll();
    rerenderSettingsPanelIfOpen();
  });

}

function wireContextMenu() {
  // Wire once. The actions list is regenerated on every right-click
  // so it always reflects current settings (theme, accent, background
  // kind) without needing to re-attach the listener.
  if (contextMenuCleanup) { contextMenuCleanup(); contextMenuCleanup = null; }
  contextMenuCleanup = attachContextMenu(() => {
    if (currentSettings.contextMenu?.enabled === false) return [];

    const themeIdx = THEME_OPTIONS.findIndex(t => t.value === currentSettings.theme);
    const nextTheme = THEME_OPTIONS[(themeIdx + 1) % THEME_OPTIONS.length];

    const ACCENTS = ["mauve","blue","green","peach","teal","lavender","red","flamingo","sky"];
    const accentIdx = ACCENTS.indexOf(currentSettings.accent);
    const nextAccent = ACCENTS[(accentIdx + 1) % ACCENTS.length];

    const BG_KINDS = ["animated","solid","gradient","image-url","image-upload","bing-daily"];
    const bgKind = currentSettings.background?.kind || "animated";
    const bgIdx = BG_KINDS.indexOf(bgKind);
    const nextBg = BG_KINDS[(bgIdx + 1) % BG_KINDS.length];

    return [
      {
        label: "Cycle theme",
        hint: `→ ${nextTheme.label}`,
        icon: "palette",
        onSelect: async () => {
          currentSettings = { ...currentSettings, theme: nextTheme.value };
          applyTheme(currentSettings);
          applyThemeColorFromSettings(currentSettings);
          await saveSettings(currentSettings);
        }
      },
      {
        label: "Cycle accent",
        hint: `→ ${nextAccent[0].toUpperCase() + nextAccent.slice(1)}`,
        icon: "circle-check",
        onSelect: async () => {
          currentSettings = { ...currentSettings, accent: nextAccent };
          applyAccent(currentSettings, true);
          await saveSettings(currentSettings);
        }
      },
      {
        label: "Cycle background",
        hint: `→ ${nextBg}`,
        icon: "image",
        onSelect: async () => {
          currentSettings.background = { ...currentSettings.background, kind: nextBg };
          await saveSettings(currentSettings);
          mountAll();
        }
      },
      "divider",
      {
        label: "Customize widgets",
        icon: "layout-grid",
        onSelect: () => {
          document.getElementById("widget-picker-toggle")?.click();
        }
      },
      {
        label: "Open settings",
        icon: "settings",
        onSelect: () => {
          document.getElementById("settings-toggle")?.click();
        }
      }
    ];
  });
}

function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    const tag    = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
    if (hasOpenOverlay()) return;
    e.preventDefault();
    document.querySelector(".search-input")?.focus();
  });
}

function applyAccent(settings, animate = false) {
  const accent = settings.accent || "mauve";
  const apply = () => {
    if (accent === "mauve") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", accent);
    }
  };
  if (animate && typeof document.startViewTransition === "function") {
    document.startViewTransition(apply);
  } else {
    apply();
  }
}

function rerenderSettingsPanelIfOpen() {
  const panel = document.getElementById("settings-panel");
  if (panel?.dataset.open !== "true" || !settingsPanelOnChange) return;
  renderSettingsPanel(panel, currentSettings, settingsPanelOnChange, { showWizard: launchWizard });
}

function applyTheme(settings) {
  applyThemePreference(settings?.theme || "mocha");
}

/** Apply Local-Font-Access selections to the live page. Called from
 *  init() and from settings.js after the user picks a font. Empty
 *  values restore the default font stack via removeProperty. */
async function applyFontPreferenceFromSettings(settings) {
  const fontPref = settings?.appearance?.font;
  if (!fontPref) return;
  if (!fontPref.body && !fontPref.display) return;
  try {
    const { applyFontPreference } = await import("./utils/local-fonts.js");
    applyFontPreference(fontPref);
  } catch { /* helper unavailable — keep default font stack */ }
}

/** Install / remove the <script type="speculationrules"> hover-prefetch
 *  block based on `quicklinks.speculate`. Chrome/Edge act on it;
 *  Firefox + Safari silently ignore. */
async function applySpeculationRulesFromSettings(settings) {
  try {
    const { applySpeculationRules } = await import("./utils/speculation-rules.js");
    applySpeculationRules(!!settings?.quicklinks?.speculate);
  } catch { /* ignore */ }
}

function getEffectiveSettings() {
  return resolveWorkspaceSettings(currentSettings);
}

function getVisualEffectiveSettings(base = getEffectiveSettings()) {
  return applyVisualQaOverrides(base);
}

function watchSystemTheme() {
  if (systemThemeCleanup) return;
  systemThemeCleanup = onSystemThemeChange(() => {
    const effectiveSettings = getVisualEffectiveSettings();
    if (effectiveSettings?.theme === "system") {
      applyTheme(effectiveSettings);
      // Keep <meta name=theme-color> in sync — backgrounds that read --base
      // (image/upload/bing/disabled) otherwise leave the browser chrome on
      // the prior light/dark color until a full remount.
      applyThemeColorFromSettings(effectiveSettings);
    }
  });
}

function watchReducedMotion() {
  if (reducedMotionCleanup) return;
  reducedMotionCleanup = onReducedMotionChange(() => {
    const effectiveSettings = getVisualEffectiveSettings();
    const background = effectiveSettings?.background;
    const isLiveBackground =
      background?.enabled !== false &&
      (background?.kind || "animated") === "animated";
    if (isLiveBackground) {
      mountAll();
      rerenderSettingsPanelIfOpen();
    }
  });
}

function watchHostPermissionRemovals() {
  if (hostPermissionCleanup) return;
  hostPermissionCleanup = onHostPermissionsRemoved(async (origins) => {
    if (!currentSettings || !origins?.length) return;
    markHostPermissionsDenied(currentSettings, origins);
    await saveSettings(currentSettings);
    mountAll();
    toast("Host access was removed in the browser. Affected URLs now show Grant access in Settings.", "warning", 9000);
  });
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
