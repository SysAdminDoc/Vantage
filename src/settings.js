// Vantage v1.1.0 — settings panel built with primitives (toggle, segmented, icon-button).
// Sections render as grouped rows with hints and icons. Sticky header with close button.

import { el, clear, toggle, segmented, toast, hostnameLabel } from "./utils/dom.js";
import { playAlarm as playAlarmTone } from "./utils/alarm-audio.js";
import { showPartialImportDialog } from "./utils/partial-import.js";
import { captureScreenshot } from "./utils/screenshot.js";
import { iconNode } from "./icons.js";
import { SEARCH_ENGINES, validateCustomSearchUrl } from "./search-engines.js";
import { geocodeCity } from "./widgets/weather.js";
import { saveSettings, getDefaults } from "./storage.js";
import { exportOPML, importOPML } from "./utils/opml.js";
import { createSettingsGist, loadSettingsFromGist, generateShareUrl } from "./utils/gist-sync.js";
import { THEME_OPTIONS, applyThemePreference } from "./utils/theme.js";
import { clearFaviconCache, getFaviconCacheStats } from "./utils/favicon-cache.js";
import {
  collectUserUrlPermissionTargets,
  hasDeniedHostOrigin,
  hostPermissionLabel,
  hostPermissionOrigin,
  markHostPermissionsDenied,
  missingHostPermissionTargets,
  requestHostPermission,
  requestHostPermissions
} from "./utils/host-permissions.js";
import {
  clearBackgroundPreview,
  getBackgroundPreview,
  hasBackgroundPreview,
  PREVIEW_DATE_OPTIONS,
  PREVIEW_HOLIDAY_OPTIONS,
  PREVIEW_LOCALITY_OPTIONS,
  PREVIEW_TIME_OPTIONS,
  PREVIEW_WEATHER_OPTIONS,
  setBackgroundPreview
} from "./utils/background-preview.js";
import { registerOverlay } from "./utils/overlay-stack.js";

export function renderSettingsPanel(panel, settings, onChange, { showWizard } = {}) {
  clear(panel);
  delete panel.dataset.filtering;

  // Sticky header
  panel.appendChild(el("header", { class: "settings-panel__header" }, [
    el("h2", { id: "settings-panel-title", class: "settings-panel__title" }, ["Settings"]),
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

  // Search / filter
  const searchWrap = el("div", { class: "settings-search-wrap" });
  const searchIn = el("input", {
    type: "search",
    class: "text-input settings-search",
    placeholder: "Filter sections…",
    "aria-label": "Filter settings sections",
    onInput: (e) => {
      const q = e.target.value.toLowerCase().trim();
      let visibleCount = 0;
      body.querySelectorAll(".settings-section").forEach(sec => {
        const matches = !q || sec.textContent.toLowerCase().includes(q);
        const title = sec.querySelector(".settings-section__title");
        const region = sec.querySelector(".settings-section__body");
        sec.style.display = matches ? "" : "none";
        if (q && matches) sec.dataset.filterMatch = "true";
        else delete sec.dataset.filterMatch;
        region?.setAttribute("aria-hidden", String(!(q && matches) && title?.getAttribute("aria-expanded") !== "true"));
        if (matches) visibleCount++;
      });
      panel.dataset.filtering = q ? "true" : "false";
      filterEmpty.hidden = !q || visibleCount > 0;
    }
  });
  searchWrap.appendChild(searchIn);
  body.appendChild(searchWrap);

  const filterEmpty = el("p", {
    class: "panel-empty settings-filter-empty",
    hidden: true
  }, ["No matching sections."]);
  body.appendChild(filterEmpty);

  body.appendChild(buildAppearance(settings, onChange));
  body.appendChild(buildBackground(settings, onChange));
  body.appendChild(buildGreeting(settings, onChange));
  body.appendChild(buildLocalitySection(settings, onChange));
  body.appendChild(buildSearchSection(settings, onChange));
  body.appendChild(buildWeatherSection(settings, onChange));
  body.appendChild(buildClockSection(settings, onChange));
  body.appendChild(buildLinksSection(settings, onChange));
  body.appendChild(buildTopSitesSection(settings, onChange));
  body.appendChild(buildFeedsSection(settings, onChange, "rss", "Reading list", "rss",
    "URLs you want to follow personally — RSS or Atom."));
  body.appendChild(buildFeedsSection(settings, onChange, "news", "News", "newspaper",
    "Curated headlines and news sources."));
  body.appendChild(buildFeedFiltersSection(settings, onChange));
  body.appendChild(buildFeedAlertsSection(settings, onChange));
  body.appendChild(buildFeedArchiveSection(settings, onChange));
  body.appendChild(buildFeedPreWarmSection(settings, onChange));
  body.appendChild(buildAirQualitySection(settings, onChange));
  body.appendChild(buildMarineSection(settings, onChange));
  body.appendChild(buildFloodSection(settings, onChange));
  body.appendChild(buildWindySection(settings, onChange));
  body.appendChild(buildEmbedsSection(settings, onChange));
  body.appendChild(buildCalendarSection(settings, onChange));
  body.appendChild(buildPomodoroSection(settings, onChange));
  body.appendChild(buildAmbientSection(settings, onChange));
  body.appendChild(buildTodoSection(settings, onChange));
  body.appendChild(buildNotesSection(settings, onChange));
  body.appendChild(buildBookmarksSection(settings, onChange));
  body.appendChild(buildStarredSection(settings, onChange));
  body.appendChild(buildWorldClockSection(settings, onChange));
  body.appendChild(buildCryptoSection(settings, onChange));
  body.appendChild(buildGithubSection(settings, onChange));
  body.appendChild(buildQuoteSection(settings, onChange));
  body.appendChild(buildPhotoSection(settings, onChange));
  body.appendChild(buildCountdownSection(settings, onChange));
  body.appendChild(buildConverterSection(settings, onChange));
  body.appendChild(buildWorkspacesSection(settings, onChange));
  const containerSec = buildContainerMapSection(settings, onChange);
  if (containerSec) body.appendChild(containerSec);
  body.appendChild(buildCustomCSSSection(settings, onChange));
  body.appendChild(buildTypographySection(settings, onChange));
  body.appendChild(buildStorageQuotaSection(settings));
  body.appendChild(buildSecuritySection(settings, onChange));
  body.appendChild(buildSidePanelSection(settings, onChange));
  body.appendChild(buildHistorySearchSection(settings, onChange));
  body.appendChild(buildDataSection(settings, onChange, showWizard));
  body.appendChild(buildResetSection(onChange));
}

let _panelTrapHandler = null;
let _panelFocusTimer = null;
let _backdropHideTimer = null;
let _panelOverlayCleanup = null;

export function openPanel(panel) {
  clearTimeout(_panelFocusTimer);
  clearTimeout(_backdropHideTimer);
  if (_panelTrapHandler) {
    document.removeEventListener("keydown", _panelTrapHandler);
    _panelTrapHandler = null;
  }
  _panelOverlayCleanup?.();
  _panelOverlayCleanup = registerOverlay({
    id: "settings-panel",
    root: panel,
    trigger: () => document.getElementById("settings-toggle"),
    close: () => closePanel(panel),
    closeOnEscape: () => !document.querySelector("dialog[open]"),
    closeOnOutside: true
  });
  panel.dataset.open = "true";
  panel.setAttribute("aria-hidden", "false");
  document.getElementById("settings-toggle")?.setAttribute("aria-expanded", "true");
  const backdrop = document.getElementById("settings-backdrop");
  if (backdrop) {
    backdrop.hidden = false;
    requestAnimationFrame(() => { backdrop.dataset.open = "true"; });
  }
  document.body.style.overflow = "hidden";
  // Focus first interactive element after transition.
  _panelFocusTimer = setTimeout(() => {
    if (panel.dataset.open !== "true") return;
    const first = panel.querySelector(".settings-panel__body button, .settings-panel__body input, .settings-panel__body [tabindex]:not([tabindex='-1'])");
    if (first) first.focus({ preventScroll: true });
  }, 280);

  // Focus trap — Tab/Shift+Tab cycles within the panel
  _panelTrapHandler = (e) => {
    if (e.key !== "Tab" || panel.dataset.open !== "true") return;
    const focusable = panel.querySelectorAll(
      'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const visible = [...focusable].filter(el => el.offsetParent !== null);
    if (!visible.length) return;
    const first = visible[0];
    const last  = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", _panelTrapHandler);
}

export function closePanel(panel) {
  clearTimeout(_panelFocusTimer);
  _panelOverlayCleanup?.();
  _panelOverlayCleanup = null;
  panel.dataset.open = "false";
  panel.setAttribute("aria-hidden", "true");
  document.getElementById("settings-toggle")?.setAttribute("aria-expanded", "false");
  const backdrop = document.getElementById("settings-backdrop");
  if (backdrop) {
    backdrop.dataset.open = "false";
    _backdropHideTimer = setTimeout(() => {
      if (panel.dataset.open !== "true") backdrop.hidden = true;
    }, 280);
  }
  document.body.style.overflow = "";
  if (_panelTrapHandler) {
    document.removeEventListener("keydown", _panelTrapHandler);
    _panelTrapHandler = null;
  }
  document.getElementById("settings-toggle")?.focus({ preventScroll: true });
}

/* ---- Section builders -------------------------------------------------- */

function section(title, iconName, { defaultOpen = false } = {}) {
  const slug = title.replace(/\W+/g, "").toLowerCase();
  const key = `v-sec-${slug}`;
  const saved = sessionStorage.getItem(key);
  const isOpen = saved !== null ? saved === "1" : defaultOpen;
  const titleId = `${key}-title`;
  const bodyId = `${key}-body`;

  const shell = el("section", {
    class: `settings-section${isOpen ? " settings-section--open" : ""}`
  });

  const titleEl = el("button", {
    type: "button",
    class: "settings-section__title",
    id: titleId,
    "aria-expanded": String(isOpen),
    "aria-controls": bodyId,
    onClick: () => {
      const nowOpen = !shell.classList.contains("settings-section--open");
      shell.classList.toggle("settings-section--open", nowOpen);
      titleEl.setAttribute("aria-expanded", String(nowOpen));
      body.setAttribute("aria-hidden", String(!nowOpen));
      sessionStorage.setItem(key, nowOpen ? "1" : "0");
    }
  }, [
    iconName ? iconNode(iconName, { size: 14 }) : null,
    el("span", { class: "settings-section__title-text" }, [title]),
    el("span", { class: "settings-section__chevron", "aria-hidden": "true" },
      [iconNode("chevron-down", { size: 14 })])
  ]);

  shell.appendChild(titleEl);

  const body = el("div", {
    id: bodyId,
    class: "settings-section__body",
    role: "region",
    "aria-labelledby": titleId,
    "aria-hidden": String(!isOpen)
  });
  shell.appendChild(body);

  // Route all subsequent appendChild calls to body so callers don't need to change
  const origAppend = shell.appendChild.bind(shell);
  shell.appendChild = (child) => body.appendChild(child);
  shell._origAppend = origAppend;

  return shell;
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

function rangeWithValue({ min, max, step, value, ariaLabel, format, onInput }) {
  const out = el("output", { class: "range-value" }, [format(value)]);
  const input = el("input", {
    type: "range",
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value),
    "aria-label": ariaLabel,
    onInput: (e) => {
      const next = parseInt(e.target.value, 10);
      out.textContent = format(next);
      onInput(next);
    }
  });
  return el("div", { class: "range-control" }, [input, out]);
}

function cloneValue(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function insertAt(list, index, item) {
  list.splice(Math.max(0, Math.min(index, list.length)), 0, item);
}

function toastUndo(message, onUndo) {
  toast(message, "warning", 6500, { label: "Undo", onClick: onUndo });
}

/* ---- Appearance -------------------------------------------------------- */

const ACCENT_COLORS = [
  { value: "mauve",    label: "Mauve"    },
  { value: "blue",     label: "Blue"     },
  { value: "green",    label: "Green"    },
  { value: "peach",    label: "Peach"    },
  { value: "teal",     label: "Teal"     },
  { value: "lavender", label: "Lavender" },
  { value: "red",      label: "Red"      },
  { value: "flamingo", label: "Flamingo" },
  { value: "sky",      label: "Sky"      },
];

function buildAppearance(settings, onChange) {
  const sec = section("Appearance", "palette", { defaultOpen: true });
  const g = group();
  g.appendChild(rowColumn(
    "Theme",
    segmented({
      ariaLabel: "Theme",
      value: settings.theme,
      options: THEME_OPTIONS,
      onChange: (v) => {
        settings.theme = v;
        applyThemePreference(v);
        onChange(settings);
      }
    }),
    "System follows your browser or OS color scheme. Mocha, Macchiato, and Frappe are dark; Latte is light."
  ));

  const currentAccent = settings.accent || "mauve";
  const accentRow = el("div", { class: "accent-picker" });
  for (const ac of ACCENT_COLORS) {
    accentRow.appendChild(el("button", {
      type: "button",
      class: `accent-swatch accent-swatch--${ac.value}${currentAccent === ac.value ? " accent-swatch--active" : ""}`,
      title: ac.label,
      "aria-label": `Accent: ${ac.label}`,
      "aria-pressed": String(currentAccent === ac.value),
      onClick: () => {
        settings.accent = ac.value;
        const a = ac.value === "mauve"
          ? document.documentElement.removeAttribute("data-accent")
          : document.documentElement.setAttribute("data-accent", ac.value);
        void a;
        onChange(settings);
      }
    }));
  }
  g.appendChild(row("Accent color", "Color for buttons, toggles, and highlights.", accentRow));

  if (!settings.contextMenu) settings.contextMenu = { enabled: true };
  g.appendChild(row(
    "Right-click context menu",
    "Right-click on the dashboard surface for quick actions (cycle theme, accent, background; open settings or widget picker). Right-clicks on text, links, and inputs always fall through to the browser's native menu.",
    toggle({
      checked: settings.contextMenu.enabled !== false,
      ariaLabel: "Right-click context menu",
      onChange: (v) => {
        settings.contextMenu = { ...settings.contextMenu, enabled: v };
        onChange(settings);
      }
    })
  ));

  sec.appendChild(g);
  return sec;
}

/* ---- Background -------------------------------------------------------- */

const THEME_WALLPAPER_DEFAULTS = {
  mocha: {
    solid: "#1e1e2e",
    gradient: { from: "#1e1e2e", to: "#313244", angle: 135 }
  },
  macchiato: {
    solid: "#24273a",
    gradient: { from: "#24273a", to: "#363a4f", angle: 140 }
  },
  frappe: {
    solid: "#303446",
    gradient: { from: "#303446", to: "#414559", angle: 145 }
  },
  latte: {
    solid: "#eff1f5",
    gradient: { from: "#eff1f5", to: "#dce0e8", angle: 135 }
  }
};

const BACKGROUND_PRESETS = [
  {
    id: "focus",
    title: "Focus",
    hint: "Still, soft, high contrast",
    patch: {
      motion: "still",
      atmosphere: "soft",
      readability: "high",
      locality: "default"
    }
  },
  {
    id: "ambient",
    title: "Ambient",
    hint: "Calm live scene",
    patch: {
      motion: "calm",
      atmosphere: "balanced",
      readability: "standard",
      locality: "auto"
    }
  },
  {
    id: "showcase",
    title: "Showcase",
    hint: "Full motion, vivid sky",
    patch: {
      motion: "full",
      atmosphere: "vivid",
      readability: "minimal",
      locality: "auto"
    }
  },
  {
    id: "wallpaper",
    title: "Wallpaper",
    hint: "Coastal, vivid, minimal overlay",
    patch: {
      motion: "full",
      atmosphere: "vivid",
      readability: "minimal",
      locality: "coastal"
    }
  }
];

function ensureVisualSettings(settings) {
  const defaults = getDefaults();
  settings.background = { ...defaults.background, ...(settings.background || {}) };
  settings.appearance = { ...defaults.appearance, ...(settings.appearance || {}) };
  return settings.background;
}

function resolvedThemeId(settings) {
  const requested = settings.theme || "mocha";
  if (requested === "system") {
    const resolved = document.documentElement.dataset.theme;
    return THEME_WALLPAPER_DEFAULTS[resolved] ? resolved : "mocha";
  }
  return THEME_WALLPAPER_DEFAULTS[requested] ? requested : "mocha";
}

function themeWallpaperDefaults(settings) {
  return THEME_WALLPAPER_DEFAULTS[resolvedThemeId(settings)] || THEME_WALLPAPER_DEFAULTS.mocha;
}

function titleCaseToken(value) {
  return String(value || "auto")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function themeLabel(settings) {
  const requested = settings.theme || "mocha";
  const base = THEME_OPTIONS.find((item) => item.value === requested)?.label || titleCaseToken(requested);
  return requested === "system"
    ? `${base} (${titleCaseToken(resolvedThemeId(settings))})`
    : base;
}

function applyBackgroundPreset(settings, preset) {
  ensureVisualSettings(settings);
  settings.background = {
    ...settings.background,
    enabled: true,
    kind: "animated",
    motion: preset.patch.motion,
    atmosphere: preset.patch.atmosphere,
    readability: preset.patch.readability
  };
  settings.appearance = {
    ...settings.appearance,
    locality: preset.patch.locality
  };
}

function buildBackgroundPresets(settings, onChange, rerender) {
  const wrap = el("div", { class: "visual-preset-grid" });
  for (const preset of BACKGROUND_PRESETS) {
    wrap.appendChild(el("button", {
      type: "button",
      class: "visual-preset",
      onClick: () => {
        applyBackgroundPreset(settings, preset);
        onChange(settings);
        rerender();
        toast(`Applied ${preset.title} background preset.`, "success");
      }
    }, [
      el("strong", {}, [preset.title]),
      el("span", {}, [preset.hint])
    ]));
  }
  return wrap;
}

function stateBadge(label, value, tone = "") {
  return el("span", { class: `visual-state-badge${tone ? ` visual-state-badge--${tone}` : ""}` }, [
    el("span", { class: "visual-state-badge__label" }, [label]),
    el("strong", {}, [value || "Auto"])
  ]);
}

function buildBackgroundStateGrid(settings) {
  const bg = settings.background || {};
  const mount = document.getElementById("background-mount");
  const preview = getBackgroundPreview();
  const items = [
    stateBadge("Theme", themeLabel(settings)),
    stateBadge("Accent", titleCaseToken(settings.accent || "mauve")),
    stateBadge("Style", titleCaseToken(bg.kind || "animated")),
    stateBadge("Motion", titleCaseToken(mount?.dataset.motion || bg.motion || "system")),
    stateBadge("Atmosphere", titleCaseToken(mount?.dataset.atmosphere || bg.atmosphere || "balanced")),
    stateBadge("Readability", titleCaseToken(mount?.dataset.readability || bg.readability || "standard")),
    stateBadge("Scenery", titleCaseToken(mount?.dataset.locality || settings.appearance?.locality || "auto")),
    stateBadge("Weather", titleCaseToken(mount?.dataset.weather || "pending")),
    stateBadge("Phase", titleCaseToken(mount?.dataset.phase || "pending"))
  ];
  if (hasBackgroundPreview(preview)) items.push(stateBadge("Preview", "On", "active"));
  return el("div", { class: "visual-state-grid" }, items);
}

function previewSegment(label, key, options, preview, rerender) {
  return el("div", { class: "preview-control" }, [
    el("span", { class: "preview-control__label" }, [label]),
    segmented({
      ariaLabel: `${label} preview`,
      value: preview[key] || "",
      options,
      onChange: (v) => {
        setBackgroundPreview({ [key]: v });
        rerender();
      }
    })
  ]);
}

function buildScenePreviewControls(rerender) {
  const preview = getBackgroundPreview();
  const clearBtn = el("button", {
    type: "button",
    class: "button button--ghost",
    disabled: !hasBackgroundPreview(preview),
    onClick: () => {
      clearBackgroundPreview();
      rerender();
      toast("Background preview cleared.", "info");
    }
  }, [iconNode("refresh", { size: 14 }), " Reset preview"]);

  return el("div", { class: "scene-preview" }, [
    el("div", { class: "scene-preview__grid" }, [
      previewSegment("Time", "time", PREVIEW_TIME_OPTIONS, preview, rerender),
      previewSegment("Season", "date", PREVIEW_DATE_OPTIONS, preview, rerender),
      previewSegment("Weather", "weather", PREVIEW_WEATHER_OPTIONS, preview, rerender),
      previewSegment("Scenery", "locality", PREVIEW_LOCALITY_OPTIONS, preview, rerender),
      previewSegment("Event", "holiday", PREVIEW_HOLIDAY_OPTIONS, preview, rerender)
    ]),
    clearBtn
  ]);
}

function buildBackground(settings, onChange) {
  const sec = section("Background", "image");
  const bg  = ensureVisualSettings(settings);
  const g   = group();

  g.appendChild(row(
    "Show background",
    "Turn off to use the theme fallback gradient.",
    toggle({
      checked: bg.enabled !== false,
      ariaLabel: "Show background",
      onChange: (v) => { settings.background.enabled = v; onChange(settings); renderKindRows(); }
    })
  ));

  // Kind selector
  const kindSeg = segmented({
    ariaLabel: "Background style",
    value: bg.kind || "animated",
    options: [
      { value: "animated",      label: "Live" },
      { value: "solid",         label: "Solid" },
      { value: "gradient",      label: "Gradient" },
      { value: "image-url",     label: "URL" },
      { value: "image-upload",  label: "Upload" },
      { value: "video-upload",  label: "Video" },
      { value: "bing-daily",    label: "Bing Daily" },
    ],
    onChange: (v) => {
      settings.background.kind = v;
      onChange(settings);
      renderKindRows();
    }
  });
  g.appendChild(rowColumn("Style", kindSeg, "Choose a live scene, flat color, gradient, local image, URL image, video, or daily Bing wallpaper."));
  g.appendChild(rowColumn(
    "Presets",
    buildBackgroundPresets(settings, onChange, renderKindRows),
    "Apply a complete motion, atmosphere, readability, and scenery profile."
  ));
  sec.appendChild(g);

  // Dynamic sub-options container
  const kindHost = el("div", { class: "settings-bg-kind-host" });
  sec.appendChild(kindHost);

  function renderKindRows() {
    clear(kindHost);
    const kind = settings.background.kind || "animated";
    const themeDefaults = themeWallpaperDefaults(settings);

    kindHost.appendChild(rowColumn(
      "Current state",
      buildBackgroundStateGrid(settings),
      "Resolved values after theme, system motion, weather, scenery, and preview overrides."
    ));

    if (kind === "animated") {
      const reducedMotionActive =
        globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
      const motionHint = reducedMotionActive
        ? "System is currently Still because browser/OS reduced motion is on. Calm keeps ambient sky/weather movement and disables rare flyovers, bursts, and parallax."
        : "System currently uses Full motion. Calm keeps ambient sky/weather movement and disables rare flyovers, bursts, and parallax.";
      kindHost.appendChild(el("p", { class: "settings-section__hint" }, [
        "Live sky follows time, local weather, season, moon phase, and the Scenery setting."
      ]));
      kindHost.appendChild(rowColumn(
        "Preview scene",
        buildScenePreviewControls(renderKindRows),
        "Session-only preview controls for testing live background variants without saving them."
      ));
      kindHost.appendChild(rowColumn(
        "Motion",
        segmented({
          ariaLabel: "Animated background motion",
          value: settings.background.motion || "system",
          options: [
            { value: "system", label: "System" },
            { value: "still",  label: "Still"  },
            { value: "calm",   label: "Calm"   },
            { value: "full",   label: "Full"   }
          ],
          onChange: (v) => {
            settings.background.motion = v;
            onChange(settings);
            renderKindRows();
          }
        }),
        motionHint
      ));
      kindHost.appendChild(rowColumn(
        "Atmosphere",
        segmented({
          ariaLabel: "Animated background atmosphere",
          value: settings.background.atmosphere || "balanced",
          options: [
            { value: "soft",     label: "Soft"     },
            { value: "balanced", label: "Balanced" },
            { value: "vivid",    label: "Vivid"    }
          ],
          onChange: (v) => {
            settings.background.atmosphere = v;
            onChange(settings);
            renderKindRows();
          }
        }),
        "Soft favors readability and haze. Vivid reduces the overlay so sky, weather, and foreground detail come through more strongly."
      ));
      kindHost.appendChild(rowColumn(
        "Readability",
        segmented({
          ariaLabel: "Animated background readability",
          value: settings.background.readability || "standard",
          options: [
            { value: "minimal",  label: "Minimal"  },
            { value: "standard", label: "Standard" },
            { value: "high",     label: "High"     }
          ],
          onChange: (v) => {
            settings.background.readability = v;
            onChange(settings);
            renderKindRows();
          }
        }),
        "High strengthens the page overlay independent of sky intensity. Minimal gives live scenes more room."
      ));
    }

    if (kind === "solid") {
      const inp = el("input", {
        type: "color", class: "color-input",
        value: settings.background.solid || themeDefaults.solid,
        "aria-label": "Background color",
        onInput: (e) => { settings.background.solid = e.target.value; onChange(settings); }
      });
      const defaultBtn = el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => {
          settings.background.solid = themeDefaults.solid;
          onChange(settings);
          renderKindRows();
        }
      }, [iconNode("palette", { size: 14 }), " Use theme color"]);
      kindHost.appendChild(row("Color", null, inp));
      kindHost.appendChild(row("", null, defaultBtn));
    }

    if (kind === "gradient") {
      const gd = settings.background.gradient || themeDefaults.gradient;
      const fromIn = el("input", {
        type: "color", class: "color-input",
        value: gd.from,
        "aria-label": "Gradient start color",
        onInput: (e) => { settings.background.gradient = { ...gd, from: e.target.value }; onChange(settings); }
      });
      const toIn = el("input", {
        type: "color", class: "color-input",
        value: gd.to,
        "aria-label": "Gradient end color",
        onInput: (e) => { settings.background.gradient = { ...gd, to: e.target.value }; onChange(settings); }
      });
      const angleIn = el("input", {
        type: "number", class: "text-input number-input",
        min: "0", max: "360", value: String(gd.angle ?? 135),
        "aria-label": "Gradient angle",
        onChange: (e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) { settings.background.gradient = { ...gd, angle: v }; onChange(settings); }
        }
      });
      kindHost.appendChild(row("From color", null, fromIn));
      kindHost.appendChild(row("To color", null, toIn));
      kindHost.appendChild(row("Angle (deg)", "0–360°", angleIn));
      const defaultBtn = el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => {
          settings.background.gradient = cloneValue(themeDefaults.gradient);
          onChange(settings);
          renderKindRows();
        }
      }, [iconNode("palette", { size: 14 }), " Use theme gradient"]);
      kindHost.appendChild(row("", null, defaultBtn));
    }

    if (kind === "image-url") {
      const inp = el("input", {
        type: "url", class: "text-input",
        placeholder: "https://…/wallpaper.jpg",
        value: settings.background.imageUrl || "",
        "aria-label": "Image URL",
        onChange: async (e) => {
          const value = e.target.value.trim();
          settings.background.imageUrl = value;
          if (value) await requestAndRecordHostAccess(settings, value, "background image loading");
          onChange(settings);
          renderKindRows();
        }
      });
      kindHost.appendChild(rowColumn(
        "Image URL",
        inp,
        "Use a direct image URL. Vantage falls back to the theme gradient until one is set."
      ));
      const grant = hostPermissionAction(settings, onChange, settings.background.imageUrl, "background image loading", renderKindRows);
      if (grant) kindHost.appendChild(row("", null, grant));
    }

    if (kind === "image-upload") {
      const fileIn = el("input", {
        type: "file", accept: "image/*",
        style: { display: "none" },
        onChange: (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            settings.background.imageData = ev.target.result;
            onChange(settings);
            toast("Image set.", "success");
          };
          reader.readAsDataURL(file);
        }
      });
      const uploadBtn = el("button", {
        type: "button", class: "button button--ghost",
        onClick: () => fileIn.click()
      }, [iconNode("upload", { size: 14 }), " Choose image"]);
      kindHost.appendChild(fileIn);
      kindHost.appendChild(row("Upload image", "Stored locally in your browser; cleared images fall back to the theme gradient.", uploadBtn));
      if (settings.background.imageData) {
        const clearBtn = el("button", {
          type: "button", class: "button button--ghost",
          onClick: () => { settings.background.imageData = null; onChange(settings); renderKindRows(); }
        }, [iconNode("trash", { size: 14 }), " Clear image"]);
        kindHost.appendChild(row("", null, clearBtn));
      }
    }

    if (kind === "video-upload") {
      // OPFS upgrade: when navigator.storage.getDirectory is
      // available (Chrome 102+, Firefox 111+, Safari 15.2+), the
      // video lives in the Origin Private File System keyed by
      // 'background-video' and `settings.background.videoData` is
      // set to the marker `opfs:background-video`. This raises the
      // effective cap to 50 MB and keeps chrome.storage.local
      // payload tiny. Older browsers fall back to the original
      // 8 MB base64 data-URL path.
      const fileIn = el("input", {
        type: "file", accept: "video/webm,video/mp4",
        style: { display: "none" },
        onChange: async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const { isOpfsAvailable, putBlob, opfsMarker, removeBlob } = await import("./utils/opfs.js");
          const useOpfs = isOpfsAvailable();
          const cap = useOpfs ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
          if (file.size > cap) {
            toast(`Video must be under ${useOpfs ? "50" : "8"} MB.`, "error");
            return;
          }
          try {
            if (useOpfs) {
              await putBlob("background-video", file);
              settings.background.videoData = opfsMarker("background-video");
              onChange(settings);
              toast(`Video stored in OPFS (${(file.size / 1024 / 1024).toFixed(1)} MB). Loops automatically.`, "success");
            } else {
              const reader = new FileReader();
              reader.onload = (ev) => {
                settings.background.videoData = ev.target.result;
                onChange(settings);
                toast("Video set (legacy storage). Loops automatically. Pauses when tab is hidden.", "success");
              };
              reader.readAsDataURL(file);
            }
          } catch (err) {
            // OPFS write failed — fall back to data URL within the
            // 8 MB cap, otherwise surface the failure.
            if (file.size <= 8 * 1024 * 1024) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                settings.background.videoData = ev.target.result;
                onChange(settings);
                toast("OPFS unavailable; stored as base64 instead.", "warning");
              };
              reader.readAsDataURL(file);
            } else {
              toast(`OPFS write failed (${err?.message?.toLowerCase() || "unknown error"}). File too large for fallback storage.`, "error");
            }
          }
        }
      });
      const uploadBtn = el("button", {
        type: "button", class: "button button--ghost",
        onClick: () => fileIn.click()
      }, [iconNode("upload", { size: 14 }), " Choose video"]);
      kindHost.appendChild(fileIn);
      const hint = navigator.storage?.getDirectory
        ? "WebM or MP4 (max 50 MB via OPFS). Loops automatically and pauses when tab is hidden."
        : "WebM or MP4 (max 8 MB; OPFS unavailable in this browser). Loops and pauses on hidden.";
      kindHost.appendChild(row("Upload video", hint, uploadBtn));
      if (settings.background.videoData) {
        const clearBtn = el("button", {
          type: "button", class: "button button--ghost",
          onClick: async () => {
            const { isOpfsMarker, removeBlob, opfsKeyFromMarker } = await import("./utils/opfs.js");
            if (isOpfsMarker(settings.background.videoData)) {
              try { await removeBlob(opfsKeyFromMarker(settings.background.videoData)); } catch {}
            }
            settings.background.videoData = null;
            onChange(settings);
            renderKindRows();
          }
        }, [iconNode("trash", { size: 14 }), " Clear video"]);
        kindHost.appendChild(row("", null, clearBtn));
      }
    }

    if (kind === "image-url" || kind === "image-upload" || kind === "video-upload" || kind === "bing-daily") {
      const blurIn = rangeWithValue({
        min: 0,
        max: 20,
        step: 1,
        value: settings.background.blur ?? 0,
        ariaLabel: "Blur",
        format: (v) => `${v} px`,
        onInput: (v) => { settings.background.blur = v; onChange(settings); }
      });
      const brightIn = rangeWithValue({
        min: 50,
        max: 150,
        step: 5,
        value: settings.background.brightness ?? 100,
        ariaLabel: "Brightness",
        format: (v) => `${v}%`,
        onInput: (v) => { settings.background.brightness = v; onChange(settings); }
      });
      kindHost.appendChild(row("Blur", "Softens image and video wallpapers only.", blurIn));
      kindHost.appendChild(row("Brightness", "Tunes image and video wallpapers behind panels.", brightIn));
    }

    if (kind === "bing-daily") {
      const cache = settings.background.bingDailyCache;
      const hint = cache?.date
        ? `Cached from ${cache.date}. Uses the cached image if today's fetch fails.`
        : "Fetches from Bing on first load; falls back to the theme gradient if the network is unavailable.";
      kindHost.appendChild(el("p", { class: "settings-section__hint" }, [hint]));
      const refreshBtn = el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => {
          settings.background.bingDailyCache = null;
          onChange(settings);
          renderKindRows();
          toast("Bing daily image will refresh.", "info");
        }
      }, [iconNode("refresh", { size: 14 }), " Refresh image"]);
      kindHost.appendChild(row("", null, refreshBtn));
    }
  }

  renderKindRows();
  return sec;
}

/* ---- Top Sites --------------------------------------------------------- */

function buildTopSitesSection(settings, onChange) {
  const cfg = settings.topsites || {};
  const sec = section("Top Sites", "star");
  const g   = group();
  g.appendChild(row(
    "Show top sites",
    "Your most-visited pages from Chrome / Firefox history, displayed as a favicon row.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Show top sites",
      onChange: (v) => { settings.topsites = { ...cfg, enabled: v }; onChange(settings); }
    })
  ));
  const maxIn = el("input", {
    type: "number", min: "4", max: "20",
    value: String(cfg.maxItems ?? 8), class: "text-input number-input",
    "aria-label": "Max top sites",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 4 && v <= 20) { settings.topsites = { ...cfg, maxItems: v }; onChange(settings); }
    }
  });
  g.appendChild(row("Max items", "4–20 sites shown.", maxIn));
  sec.appendChild(g);
  return sec;
}

/* ---- Feed Filters ------------------------------------------------------ */

function buildFeedFiltersSection(settings, onChange) {
  const sec   = section("Feed Filters", "filter");
  const rules = settings.feedFilters?.rules ?? [];

  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Mute or highlight feed items by title or URL regex. Applied to both RSS and News panels."
  ]));

  const listEl = el("div", { class: "item-list" });

  function refreshRules() {
    clear(listEl);
    const current = settings.feedFilters?.rules ?? [];
    if (!current.length) {
      listEl.appendChild(el("div", { class: "item-list__empty" }, ["No filter rules yet."]));
      return;
    }
    current.forEach((rule, idx) => {
      const patIn = el("input", {
        type: "text", class: "text-input", value: rule.pattern || "",
        placeholder: "Pattern (regex)", "aria-label": "Filter pattern",
        onChange: (e) => { rule.pattern = e.target.value; onChange(settings); }
      });
      const fieldSel = el("select", { class: "text-input", "aria-label": "Match field" }, [
        el("option", { value: "title", selected: rule.field !== "url" }, ["Title"]),
        el("option", { value: "url",   selected: rule.field === "url"  }, ["URL"])
      ]);
      fieldSel.addEventListener("change", () => { rule.field = fieldSel.value; onChange(settings); });

      const actionSel = el("select", { class: "text-input", "aria-label": "Filter action" }, [
        el("option", { value: "mute",      selected: rule.action !== "highlight" }, ["Mute"]),
        el("option", { value: "highlight", selected: rule.action === "highlight" }, ["Highlight"])
      ]);
      actionSel.addEventListener("change", () => {
        rule.action = actionSel.value;
        onChange(settings);
        refreshRules();
      });

      const del = el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Remove rule", title: "Remove",
        onClick: () => {
          const removed = cloneValue(rule);
          settings.feedFilters.rules.splice(idx, 1);
          onChange(settings);
          refreshRules();
          toastUndo("Filter rule removed.", () => {
            if (!settings.feedFilters) settings.feedFilters = { rules: [] };
            insertAt(settings.feedFilters.rules, idx, removed);
            onChange(settings);
            refreshRules();
          });
        }
      }, [iconNode("trash", { size: 14 })]);

      const row1 = el("div", { class: "filter-rule-row" }, [patIn, fieldSel, actionSel]);
      if (rule.action === "highlight") {
        const colorIn = el("input", {
          type: "color", class: "color-input",
          value: rule.color || "#f9e2af",
          "aria-label": "Highlight color",
          onInput: (e) => { rule.color = e.target.value; onChange(settings); }
        });
        row1.appendChild(colorIn);
      }
      row1.appendChild(del);
      listEl.appendChild(row1);
    });
  }

  refreshRules();
  sec.appendChild(listEl);

  const addBtn = el("button", {
    type: "button", class: "button button--ghost",
    onClick: () => {
      if (!settings.feedFilters) settings.feedFilters = { rules: [] };
      settings.feedFilters.rules.push({ id: String(Date.now()), pattern: "", field: "title", action: "mute", color: null });
      onChange(settings);
      refreshRules();
    }
  }, [iconNode("plus", { size: 14 }), " Add rule"]);
  sec.appendChild(addBtn);
  return sec;
}

/* ---- Feed alerts (keyword Web Notifications) -------------------------- */

function buildFeedAlertsSection(settings, onChange) {
  const cfg = settings.feedAlerts || { enabled: false, keywords: [], caseSensitive: false, notifiedUrls: [] };
  const sec = section("Feed alerts", "alert");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Get a Web Notification when a News or Reading list headline contains one of your keywords. Strict opt-in: requires browser notification permission. Each item is notified only once."
  ]));

  const g = group();

  // Enable toggle
  g.appendChild(row(
    "Enable alerts",
    "When enabled, Vantage scans newly-loaded items and fires a notification on the first match per article.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Enable feed alerts",
      onChange: async (v) => {
        if (v) {
          // Lazy-import so the helper isn't pulled into settings.js's
          // hot path for users who never enable alerts.
          const { requestNotificationPermission } = await import("./utils/feed-alerts.js");
          const result = await requestNotificationPermission();
          if (result !== "granted") {
            toast(`Notification permission ${result}. Enable it in your browser's site settings to receive alerts.`, "warning", 6000);
            return;
          }
        }
        settings.feedAlerts = { ...cfg, enabled: v };
        onChange(settings);
      }
    })
  ));

  // Keywords textarea — one per line for readability
  const kwArea = el("textarea", {
    class: "text-input",
    rows: "4",
    placeholder: "One keyword per line\nExamples:\nNVIDIA\nlayoffs\nHacker News",
    "aria-label": "Alert keywords",
    style: { width: "100%", fontFamily: "var(--font-mono, monospace)" }
  });
  kwArea.value = (cfg.keywords || []).join("\n");
  kwArea.addEventListener("change", () => {
    const kws = kwArea.value.split(/\r?\n/).map(k => k.trim()).filter(Boolean);
    settings.feedAlerts = { ...cfg, keywords: kws };
    onChange(settings);
  });
  g.appendChild(row(
    "Keywords",
    "Plain-text matching, case-insensitive by default. One per line.",
    kwArea
  ));

  // Case-sensitive toggle
  g.appendChild(row(
    "Case-sensitive matching",
    "When off, “nvidia” matches “NVIDIA” and vice versa.",
    toggle({
      checked: cfg.caseSensitive || false,
      ariaLabel: "Case-sensitive keyword matching",
      onChange: (v) => {
        settings.feedAlerts = { ...cfg, caseSensitive: v };
        onChange(settings);
      }
    })
  ));

  // Test + reset
  const notifiedCount = (cfg.notifiedUrls || []).length;
  g.appendChild(row(
    "Already notified",
    `${notifiedCount} item${notifiedCount === 1 ? "" : "s"} marked as notified. Reset to re-fire on next match.`,
    el("div", { class: "compose__row" }, [
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: async () => {
          const { fireAlerts, requestNotificationPermission } = await import("./utils/feed-alerts.js");
          const perm = await requestNotificationPermission();
          if (perm !== "granted") {
            toast(`Notification permission ${perm}.`, "warning");
            return;
          }
          fireAlerts([{
            keyword: "demo",
            item: { title: "This is what a Vantage feed alert looks like.", link: "https://example.com" }
          }]);
          toast("Test notification fired.", "success");
        }
      }, [iconNode("alert", { size: 14 }), " Send test"]),
      el("button", {
        type: "button", class: "button button--ghost",
        disabled: notifiedCount === 0,
        onClick: () => {
          settings.feedAlerts = { ...cfg, notifiedUrls: [] };
          onChange(settings);
          toast("Alert history cleared.", "success");
        }
      }, [iconNode("trash", { size: 14 }), " Reset history"])
    ])
  ));

  sec.appendChild(g);
  return sec;
}

/* ---- Feed archive (IndexedDB) ----------------------------------------- */

function buildFeedArchiveSection(settings, onChange) {
  const cfg = settings.feedArchive || { enabled: false, cap: 10_000 };
  const sec = section("Feed archive", "hard-drive");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Permanent IndexedDB-backed archive of every feed item your dashboard renders. Searchable below. Strict opt-in: storage grows over time and is bounded only by the cap. Stays in your browser — never uploaded."
  ]));

  const g = group();

  g.appendChild(row(
    "Enable archive",
    "When on, every News + Reading list item is persisted to IndexedDB on render. Disabling stops new writes but keeps the existing data — clear below if you want to wipe.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Enable feed archive",
      onChange: (v) => {
        settings.feedArchive = { ...cfg, enabled: v };
        onChange(settings);
      }
    })
  ));

  const capInput = el("input", {
    type: "number", min: "100", max: "100000", step: "100",
    value: String(cfg.cap ?? 10_000),
    class: "text-input number-input",
    "aria-label": "Maximum archived items",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 100 && v <= 100_000) {
        settings.feedArchive = { ...cfg, cap: v };
        onChange(settings);
      }
    }
  });
  g.appendChild(row(
    "Cap",
    "Oldest items are pruned when the archive exceeds this many entries. 100–100,000.",
    capInput
  ));

  // Live archive size readout + clear-all
  const sizeChip = el("span", { class: "chip" }, ["—"]);
  const refreshSize = async () => {
    try {
      const { archiveSize } = await import("./utils/feed-archive.js");
      const n = await archiveSize();
      sizeChip.replaceChildren(`${n.toLocaleString()} item${n === 1 ? "" : "s"}`);
    } catch {
      sizeChip.replaceChildren("Unavailable");
    }
  };
  refreshSize();

  g.appendChild(row(
    "Stored",
    "Live count from IndexedDB.",
    el("div", { class: "compose__row" }, [
      sizeChip,
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: async () => {
          if (!confirm("Wipe the entire feed archive? This cannot be undone.")) return;
          try {
            const { clearArchive } = await import("./utils/feed-archive.js");
            const n = await clearArchive();
            await refreshSize();
            toast(`Cleared ${n.toLocaleString()} archived item${n === 1 ? "" : "s"}.`, "success");
          } catch (err) {
            toast(err.message || "Couldn't clear archive.", "error");
          }
        }
      }, [iconNode("trash", { size: 14 }), " Clear archive"])
    ])
  ));

  // Search box + results
  const searchInput = el("input", {
    type: "search", class: "text-input",
    placeholder: "Search title or source…",
    "aria-label": "Search archived feed items"
  });
  const resultsHost = el("div", { class: "feed-archive-results" });
  let lastQueryToken = 0;
  const runSearch = async () => {
    const token = ++lastQueryToken;
    clear(resultsHost);
    resultsHost.appendChild(el("p", { class: "settings-section__hint" }, ["Searching…"]));
    try {
      const { searchArchive } = await import("./utils/feed-archive.js");
      const out = await searchArchive(searchInput.value, { limit: 50 });
      if (token !== lastQueryToken) return; // stale response
      clear(resultsHost);
      if (!out.length) {
        resultsHost.appendChild(el("p", { class: "settings-section__hint" }, [
          searchInput.value.trim() ? "No matches." : "Archive is empty — enable above and load some feeds."
        ]));
        return;
      }
      const list = el("ul", { class: "feed-archive-list" });
      for (const it of out) {
        list.appendChild(el("li", { class: "feed-archive-row" }, [
          el("a", {
            href: it.origUrl || `https://${it.url}`,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "feed-archive-row__title"
          }, [it.title || it.url]),
          el("span", { class: "feed-archive-row__meta" }, [
            it.sourceTitle || it.sourceHost || hostnameLabel(it.url),
            " · ",
            new Date(it.archivedAt || Date.now()).toLocaleDateString()
          ])
        ]));
      }
      resultsHost.appendChild(list);
      // Custom Highlights API — paint match ranges via CSS::highlight
      // without wrapping <mark> elements (no DOM mutation, no
      // repaint cost on long lists). Chrome 105+, Safari 17.2+,
      // Firefox 140+. Falls through silently otherwise.
      paintSearchHighlights(list, searchInput.value.trim());
    } catch (err) {
      if (token !== lastQueryToken) return;
      clear(resultsHost);
      resultsHost.appendChild(el("p", { class: "panel-error" }, [
        `Couldn't search archive — ${err?.message?.toLowerCase() || "unknown error"}.`
      ]));
    }
  };
  let searchDebounce = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(runSearch, 200);
  });

  g.appendChild(row(
    "Search archive",
    "Substring match on title + source. Newest first; up to 50 results.",
    el("div", { class: "compose__column" }, [searchInput, resultsHost])
  ));

  sec.appendChild(g);
  return sec;
}

/* ---- Feed pre-warming ------------------------------------------------- */

function buildFeedPreWarmSection(settings, onChange) {
  const cfg = settings.feedPreWarm || { enabled: false, intervalMinutes: 60 };
  const sec = section("Feed pre-warming", "rss");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Background-fetch all RSS + News feeds on a periodic interval (chrome.alarms — no extra permission). The cache is consulted before every render so a fresh new tab paints feeds instantly. Off by default; the alarm runs at most every 15 minutes."
  ]));

  const g = group();

  g.appendChild(row(
    "Enable pre-warming",
    "When on, the service worker fetches all configured feed URLs at the chosen interval and stores the parsed result in chrome.storage.local for the next new tab.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Enable feed pre-warming",
      onChange: (v) => {
        settings.feedPreWarm = { ...cfg, enabled: v };
        onChange(settings);
      }
    })
  ));

  const intervalIn = el("input", {
    type: "number", min: "15", max: "720", step: "5",
    value: String(cfg.intervalMinutes ?? 60),
    class: "text-input number-input",
    "aria-label": "Pre-warm interval in minutes",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 15 && v <= 720) {
        settings.feedPreWarm = { ...cfg, intervalMinutes: v };
        onChange(settings);
      }
    }
  });
  g.appendChild(row("Interval (minutes)", "Between 15 (4×/h) and 720 (twice a day).", intervalIn));

  g.appendChild(row(
    "Cache",
    "Clearing wipes the pre-warm cache without disabling the alarm. Useful if a stale entry persists past the TTL.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: async () => {
        const { clearPrewarmCache } = await import("./utils/feed-prewarm.js");
        await clearPrewarmCache();
        toast("Pre-warm cache cleared.", "success");
      }
    }, [iconNode("trash", { size: 14 }), " Clear pre-warm cache"])
  ));

  sec.appendChild(g);
  return sec;
}

/** Paint substring matches in the archive search results via the
 *  Custom Highlights API (CSS Highlight + CSS.highlights registry).
 *  Falls through silently when the API is unavailable (older Chrome,
 *  Firefox < 140) — the rendered text stays unchanged. The companion
 *  `::highlight(vantage-search)` rule in style.css gives the matches
 *  their accent-tinted background. */
function paintSearchHighlights(rootEl, needle) {
  const HIGHLIGHT_KEY = "vantage-search";
  // Always clear the previous highlight so stale ranges don't paint
  // through the next render.
  if (typeof CSS !== "undefined" && CSS.highlights) {
    CSS.highlights.delete(HIGHLIGHT_KEY);
  }
  if (!needle || typeof Highlight === "undefined" || !CSS?.highlights) return;
  const lower = needle.toLowerCase();
  const ranges = [];
  const titleNodes = rootEl.querySelectorAll(".feed-archive-row__title");
  for (const titleEl of titleNodes) {
    const textNode = titleEl.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;
    const text = textNode.textContent.toLowerCase();
    let pos = 0;
    while (true) {
      const idx = text.indexOf(lower, pos);
      if (idx < 0) break;
      try {
        const range = new Range();
        range.setStart(textNode, idx);
        range.setEnd(textNode, idx + lower.length);
        ranges.push(range);
      } catch { /* malformed range — skip */ }
      pos = idx + lower.length;
    }
  }
  if (ranges.length) {
    try { CSS.highlights.set(HIGHLIGHT_KEY, new Highlight(...ranges)); }
    catch { /* unsupported overload — fall through */ }
  }
}

/* ---- Workspaces -------------------------------------------------------- */

function buildWorkspacesSection(settings, onChange) {
  const sec = section("Workspaces", "layers2");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Named profiles — each can override theme, accent, scenery, background, layout, quick links, and per-widget toggles."
  ]));

  const list = settings.workspaces?.list ?? [];
  const listEl = el("div", { class: "item-list" });

  function refreshWorkspaceList() {
    clear(listEl);
    const current = settings.workspaces?.list ?? [];
    if (!current.length) {
      listEl.appendChild(el("div", { class: "item-list__empty" }, ["No workspaces yet."]));
      return;
    }
    current.forEach((ws, idx) => {
      const nameIn = el("input", {
        type: "text", class: "text-input",
        value: ws.name, placeholder: "Workspace name",
        "aria-label": "Workspace name",
        onChange: (e) => { ws.name = e.target.value.trim() || "Workspace"; onChange(settings); }
      });
      const captureBtn = el("button", {
        type: "button", class: "button button--ghost button--small",
        title: "Save current visual profile and layout to this workspace",
        onClick: () => {
          const { captureSnapshot } = window._vantageWorkspaceHelpers || {};
          if (captureSnapshot) {
            ws.snapshot = captureSnapshot(settings);
            onChange(settings);
            toast(`Snapshot saved for "${ws.name}".`, "success");
          }
        }
      }, [iconNode("download", { size: 12 }), " Capture"]);

      const sceneTime = ws.snapshot?.background?.qaTime || "";
      const sceneTimeIn = el("input", {
        type: "time",
        class: "text-input number-input",
        value: sceneTime,
        title: "Lock this workspace to a specific time of day for the animated background (leave blank for real time)",
        "aria-label": "Scene time override",
        onChange: (e) => {
          if (!ws.snapshot) ws.snapshot = {};
          if (!ws.snapshot.background) ws.snapshot.background = {};
          ws.snapshot.background.qaTime = e.target.value || "";
          onChange(settings);
        }
      });

      // Per-workspace JSON export — copies a single workspace + its
      // snapshot to the clipboard. EclipseTab v1.3 ships this as a
      // right-click action; we surface it as a button per row since
      // workspace tabs don't have a dedicated context menu.
      const exportBtn = el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": `Export workspace "${ws.name}" as JSON`,
        title: "Export workspace as JSON",
        onClick: async () => {
          try {
            const payload = {
              vantageWorkspace: 1,
              exportedAt: new Date().toISOString(),
              workspace: cloneValue(ws)
            };
            const json = JSON.stringify(payload, null, 2);
            await navigator.clipboard.writeText(json);
            toast(`Workspace "${ws.name}" copied to clipboard (${(json.length / 1024).toFixed(1)} KB).`, "success");
          } catch (err) {
            toast(`Couldn't copy — ${err?.message?.toLowerCase() || "clipboard denied"}.`, "error");
          }
        }
      }, [iconNode("share", { size: 14 })]);
      const del = el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Remove workspace", title: "Remove",
        onClick: () => {
          const removed = cloneValue(ws);
          const activeBefore = settings.workspaces.active;
          settings.workspaces.list.splice(idx, 1);
          if (settings.workspaces.active === ws.id) settings.workspaces.active = null;
          onChange(settings);
          refreshWorkspaceList();
          toastUndo(`Removed workspace "${removed.name}".`, () => {
            insertAt(settings.workspaces.list, idx, removed);
            if (activeBefore === removed.id) settings.workspaces.active = removed.id;
            onChange(settings);
            refreshWorkspaceList();
          });
        }
      }, [iconNode("trash", { size: 14 })]);
      listEl.appendChild(el("div", { class: "workspace-item" }, [nameIn, captureBtn, sceneTimeIn, exportBtn, del]));
    });
  }
  refreshWorkspaceList();
  sec.appendChild(listEl);

  const addBtn = el("button", {
    type: "button", class: "button button--ghost",
    onClick: () => {
      if (!settings.workspaces) settings.workspaces = { active: null, list: [] };
      settings.workspaces.list.push({ id: String(Date.now()), name: "Workspace", snapshot: null });
      onChange(settings);
      refreshWorkspaceList();
    }
  }, [iconNode("plus", { size: 14 }), " Add workspace"]);

  // Per-workspace JSON import — prompts for a paste, validates the
  // shape from `vantageWorkspace: 1`, then appends as a new workspace
  // with a fresh id (so importing your own export onto the same
  // device doesn't collide with the existing copy).
  const importBtn = el("button", {
    type: "button", class: "button button--ghost",
    onClick: async () => {
      let raw = "";
      try { raw = await navigator.clipboard.readText(); } catch {}
      const pasted = prompt("Paste a workspace JSON (from another device or backup):", raw && raw.trim().startsWith("{") ? raw : "");
      if (!pasted?.trim()) return;
      try {
        const parsed = JSON.parse(pasted);
        const ws = parsed?.workspace ?? parsed; // accept the bare workspace shape too
        if (!ws || typeof ws !== "object" || !ws.snapshot) {
          throw new Error("doesn't look like a Vantage workspace export");
        }
        const fresh = {
          id: String(Date.now()),
          name: ws.name ? `${ws.name} (imported)` : "Imported workspace",
          snapshot: cloneValue(ws.snapshot)
        };
        if (!settings.workspaces) settings.workspaces = { active: null, list: [] };
        settings.workspaces.list.push(fresh);
        onChange(settings);
        refreshWorkspaceList();
        toast(`Imported "${fresh.name}".`, "success", 6500, {
          label: "Undo",
          onClick: () => {
            const idx = settings.workspaces.list.findIndex(w => w.id === fresh.id);
            if (idx >= 0) settings.workspaces.list.splice(idx, 1);
            onChange(settings);
            refreshWorkspaceList();
          }
        });
      } catch (err) {
        toast(`Couldn't import workspace — ${err?.message?.toLowerCase() || "invalid JSON"}.`, "error");
      }
    }
  }, [iconNode("upload", { size: 14 }), " Import workspace"]);

  // Tab snapshot — capture the user's currently-open tabs as a fresh
  // workspace pre-populated with quick-links from each tab. Useful
  // for "save my current research session as a re-openable thing".
  // Uses chrome.tabs.query; URL + title visibility comes from the
  // existing `*://*/*` host_permissions, so no extra permission ask.
  const tabSnapshotBtn = el("button", {
    type: "button", class: "button button--ghost",
    onClick: async () => {
      const ext = globalThis.chrome || globalThis.browser;
      if (!ext?.tabs?.query) {
        toast("Tab access is unavailable in this browser.", "error");
        return;
      }
      try {
        const tabs = await ext.tabs.query({ currentWindow: true });
        const items = [];
        const seen = new Set();
        for (const t of tabs) {
          if (!t.url) continue;
          // Skip our own newtab override + browser-internal URLs +
          // duplicates of the same URL across pinned/duplicated tabs.
          if (/^(chrome|edge|brave|vivaldi|opera|moz-extension|chrome-extension|about|file|view-source):/i.test(t.url)) continue;
          if (seen.has(t.url)) continue;
          seen.add(t.url);
          const title = (t.title || new URL(t.url).hostname).slice(0, 80);
          items.push({ title, url: t.url });
        }
        if (!items.length) {
          toast("No saveable tabs in the current window.", "warning");
          return;
        }
        if (!settings.workspaces) settings.workspaces = { active: null, list: [] };
        const baseSnapshot = (window._vantageWorkspaceHelpers?.captureSnapshot?.() || {});
        const fresh = {
          id: String(Date.now()),
          name: `Tabs ${new Date().toLocaleDateString()}`,
          snapshot: {
            ...baseSnapshot,
            quicklinks: {
              ...(baseSnapshot.quicklinks || {}),
              items,
              groups: []
            }
          }
        };
        settings.workspaces.list.push(fresh);
        onChange(settings);
        refreshWorkspaceList();
        toast(`Saved ${items.length} tab${items.length === 1 ? "" : "s"} as "${fresh.name}".`, "success", 6500, {
          label: "Undo",
          onClick: () => {
            const idx = settings.workspaces.list.findIndex(w => w.id === fresh.id);
            if (idx >= 0) settings.workspaces.list.splice(idx, 1);
            onChange(settings);
            refreshWorkspaceList();
          }
        });
      } catch (err) {
        toast(`Couldn't read tabs — ${err?.message?.toLowerCase() || "unknown error"}.`, "error");
      }
    }
  }, [iconNode("layout-grid", { size: 14 }), " Save tabs as workspace"]);

  sec.appendChild(el("div", { class: "compose__row" }, [addBtn, importBtn, tabSnapshotBtn]));
  return sec;
}

/* ---- Storage Quota ----------------------------------------------------- */

function buildStorageQuotaSection(settings) {
  const sec = section("Storage", "hard-drive");
  const g   = group();

  const barWrap = el("div", { class: "quota-bar-wrap" });
  const bar     = el("div", { class: "quota-bar", role: "progressbar", "aria-label": "Storage used", "aria-valuemin": "0", "aria-valuemax": "100" });
  const label   = el("span", { class: "quota-label" }, ["Loading…"]);
  barWrap.appendChild(bar);
  barWrap.appendChild(label);
  g.appendChild(el("div", { class: "settings-row settings-row--column" }, [
    el("div", { class: "settings-row__label" }, [
      el("span", { class: "settings-row__title" }, ["Storage used"]),
      el("span", { class: "settings-row__hint" }, ["Chrome extension storage (chrome.storage.local)"])
    ]),
    barWrap
  ]));

  if (navigator.storage?.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      if (!quota) return;
      const pct = Math.round((usage / quota) * 100);
      bar.style.width = `${pct}%`;
      bar.setAttribute("aria-valuenow", String(pct));
      bar.classList.toggle("quota-bar--warn", pct > 80);
      const fmt = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
      label.textContent = `${fmt(usage)} of ${fmt(quota)} (${pct}%)`;
    }).catch(() => { label.textContent = "Estimate unavailable."; });
  } else {
    label.textContent = "Not available in this browser.";
  }

  sec.appendChild(g);
  return sec;
}

/* ---- Security (encrypted API key vault) ------------------------------- */

function buildSecuritySection(settings, onChange) {
  const sec = section("Security", "alert");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Encrypt API keys (CoinGecko, NASA APOD) at rest with a passphrase. AES-GCM-256 + PBKDF2 (600k iterations). Strict opt-in. Re-prompts once per browser session — keys are decrypted in memory only. Lose the passphrase, lose the keys (no recovery)."
  ]));

  const sec2 = settings.security || {};
  const encrypted = !!sec2.encryptKeys;

  const g = group();

  if (!encrypted) {
    // Not yet configured — render the enable flow.
    const ppInput  = el("input", { type: "password", class: "text-input", placeholder: "Choose a passphrase (≥8 chars)", "aria-label": "Vault passphrase" });
    const ppConfirm = el("input", { type: "password", class: "text-input", placeholder: "Confirm passphrase", "aria-label": "Confirm passphrase" });
    const enableBtn = el("button", {
      type: "button", class: "button button--primary",
      onClick: async () => {
        const pp1 = ppInput.value;
        const pp2 = ppConfirm.value;
        if (!pp1 || pp1.length < 8) { toast("Passphrase must be at least 8 characters.", "error"); return; }
        if (pp1 !== pp2) { toast("Passphrases don't match.", "error"); return; }
        try {
          const { encryptKeys, cacheDecrypted } = await import("./utils/api-key-vault.js");
          // Capture the ORIGINAL plaintext BEFORE we zero the storage
          // fields — otherwise we'd cache empty strings and the
          // current-page widgets would lose access to their keys.
          const originalCrypto = settings.crypto?.apiKey || "";
          const originalNasa   = settings.photo?.nasaKey  || "";
          const payload = await encryptKeys(pp1, {
            cryptoApiKey: originalCrypto,
            photoNasaKey: originalNasa
          });
          settings.security = payload;
          if (settings.crypto) settings.crypto = { ...settings.crypto, apiKey: "" };
          if (settings.photo)  settings.photo  = { ...settings.photo,  nasaKey: "" };
          // Cache the original plaintext in session storage so widgets
          // continue to function until the browser restarts (at which
          // point the user gets the unlock prompt).
          await cacheDecrypted({ crypto: originalCrypto, nasa: originalNasa });
          onChange(settings);
          toast("API keys encrypted. Re-prompt on next browser session.", "success", 6000);
        } catch (err) {
          toast(`Couldn't encrypt — ${err?.message?.toLowerCase() || "unknown error"}.`, "error");
        }
      }
    }, [iconNode("alert", { size: 14 }), " Encrypt API keys"]);

    g.appendChild(row(
      "Enable encryption",
      "Choose a passphrase. The plaintext API key fields will be cleared from storage and replaced with ciphertext.",
      el("div", { class: "compose__column" }, [ppInput, ppConfirm, enableBtn])
    ));
  } else {
    // Already configured — show status + disable flow.
    g.appendChild(row(
      "Status",
      "API keys are encrypted at rest. Decryption happens once per browser session.",
      el("span", { class: "chip", style: { background: "var(--green)", color: "var(--accent-fg)" } }, [
        iconNode("check", { size: 12 }), " Encrypted"
      ])
    ));

    const disableBtn = el("button", {
      type: "button", class: "button button--ghost",
      onClick: async () => {
        const pp = prompt("Enter your vault passphrase to decrypt and disable encryption:");
        if (!pp) return;
        try {
          const { decryptKeys, clearCached } = await import("./utils/api-key-vault.js");
          const decrypted = await decryptKeys(pp, settings.security);
          if (settings.crypto) settings.crypto = { ...settings.crypto, apiKey: decrypted.crypto || "" };
          if (settings.photo)  settings.photo  = { ...settings.photo,  nasaKey: decrypted.nasa  || "" };
          settings.security = { encryptKeys: false, salt: null, iv: null, encryptedBlob: null };
          await clearCached();
          onChange(settings);
          toast("API keys decrypted and stored as plaintext. You can re-encrypt anytime.", "success", 6000);
        } catch (err) {
          toast(err?.message || "Decryption failed.", "error");
        }
      }
    }, [iconNode("trash", { size: 14 }), " Disable encryption"]);
    g.appendChild(row(
      "Disable encryption",
      "Enter your passphrase to decrypt the keys and store them as plaintext again.",
      disableBtn
    ));
  }

  sec.appendChild(g);
  return sec;
}

/* ---- Side Panel -------------------------------------------------------- */

function buildSidePanelSection(settings, onChange) {
  const sec = section("Side panel", "rss");
  const chromeSupported = !!globalThis.chrome?.sidePanel;
  const firefoxSupported = !!globalThis.browser?.sidebarAction;
  const supported = chromeSupported || firefoxSupported;
  const cfg = settings.sidePanel || {};

  if (!supported) {
    sec.appendChild(el("p", { class: "settings-section__hint" }, [
      "Side panel requires Chrome 114+ or Firefox 109+. The feed reader sidebar will appear here when you switch to a supporting browser."
    ]));
    return sec;
  }

  const hint = firefoxSupported
    ? "Read your News + Reading list in Firefox's sidebar. Open from View → Sidebar → Vantage, or enable the toolbar-click shortcut below."
    : "Read your News + Reading list in Chrome's native side panel. Open from the side-panel button next to the bookmarks bar (\"Vantage\" entry), or enable the toolbar-click shortcut below.";
  sec.appendChild(el("p", { class: "settings-section__hint" }, [hint]));
  const g = group();

  g.appendChild(row(
    "Open side panel on toolbar click",
    "When on, clicking the Vantage toolbar icon opens the sidebar instead of a new tab. Off keeps the original new-tab behavior.",
    toggle({
      checked: cfg.openOnActionClick || false,
      ariaLabel: "Open side panel on toolbar click",
      onChange: async (v) => {
        settings.sidePanel = { ...cfg, openOnActionClick: v };
        onChange(settings);
        if (chromeSupported) {
          try {
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: v });
          } catch (err) {
            toast(`Couldn't update side panel behavior — ${err?.message?.toLowerCase() || "API missing"}.`, "error");
          }
        }
      }
    })
  ));

  sec.appendChild(g);
  return sec;
}

/* ---- History search --------------------------------------------------- */

function buildHistorySearchSection(settings, onChange) {
  const sec = section("History search", "clock");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Inline search of your browser history. Strict opt-in — enabling requests the `history` permission via `chrome.permissions.request()` so the browser shows its native grant dialog. Disabling revokes the permission. Vantage never sees your history unless you grant access here."
  ]));

  const cfg = settings.historySearch || {};
  const g = group();

  const ext = globalThis.chrome || globalThis.browser;
  const supportsOptional = !!ext?.permissions?.request;
  if (!supportsOptional) {
    g.appendChild(el("p", { class: "settings-section__hint" }, [
      "Optional permissions API not available — history search can't be enabled in this browser."
    ]));
    sec.appendChild(g);
    return sec;
  }

  g.appendChild(row(
    "Enable history panel",
    "When on, the History panel shows a search box backed by `chrome.history.search`. Disable any time to revoke.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Enable history search",
      onChange: async (v) => {
        if (v) {
          let granted = false;
          try {
            granted = await ext.permissions.request({ permissions: ["history"] });
          } catch (err) {
            toast(`Permission request failed — ${err?.message?.toLowerCase() || "unknown error"}.`, "error");
            return;
          }
          if (!granted) {
            toast("History permission denied. The panel stays disabled.", "warning");
            return;
          }
          settings.historySearch = { ...cfg, enabled: true };
          onChange(settings);
        } else {
          settings.historySearch = { ...cfg, enabled: false };
          onChange(settings);
          // Best-effort revoke; not fatal if the user already revoked
          // via the browser's own UI.
          try { await ext.permissions.remove({ permissions: ["history"] }); } catch {}
        }
      }
    })
  ));

  const maxIn = el("input", {
    type: "number", min: "5", max: "100", step: "5",
    value: String(cfg.maxResults ?? 20),
    class: "text-input number-input",
    "aria-label": "Maximum history results",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 5 && v <= 100) {
        settings.historySearch = { ...cfg, maxResults: v };
        onChange(settings);
      }
    }
  });
  g.appendChild(row("Max results", "Cap on items returned per search (5–100). chrome.history.search defaults to 100.", maxIn));

  sec.appendChild(g);
  return sec;
}

/* ---- Container Map (Firefox-only) -------------------------------------- */

function buildContainerMapSection(settings, onChange) {
  const isFirefox = typeof browser !== "undefined";
  if (!isFirefox) return null;

  const sec = section("Container Workspaces", "folder");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Map Firefox container tabs to workspaces. When you open a new tab in the selected container, that workspace will activate automatically."
  ]));

  const workspaces = settings.workspaces?.list ?? [];
  if (!workspaces.length) {
    sec.appendChild(el("p", { class: "settings-section__hint" }, [
      "No workspaces configured. Add workspaces above first."
    ]));
    return sec;
  }

  const autoGroup = group();
  autoGroup.appendChild(row(
    "Auto-save container mapping",
    "When you switch workspace in a container tab, automatically remember that mapping for next time.",
    toggle({
      checked: settings.containerAutoMap || false,
      ariaLabel: "Auto-save container mapping",
      onChange: (v) => {
        settings.containerAutoMap = v;
        onChange(settings);
      }
    })
  ));
  sec.appendChild(autoGroup);

  const mapHost = el("div", { class: "item-list" });
  const mapEl = settings.containerMap || {};

  let containers = [];
  const renderMap = () => {
    clear(mapHost);
    if (!containers.length) {
      mapHost.appendChild(el("div", { class: "item-list__empty" }, [
        "No Firefox containers found. Create containers in Firefox settings."
      ]));
      return;
    }
    for (const c of containers) {
      const sel = el("select", { class: "text-input", "aria-label": `Workspace for ${c.name}` }, [
        el("option", { value: "", selected: !mapEl[c.cookieStoreId] }, ["(none)"]),
        ...workspaces.map(ws =>
          el("option", { value: ws.id, selected: mapEl[c.cookieStoreId] === ws.id }, [ws.name])
        )
      ]);
      sel.addEventListener("change", () => {
        if (!settings.containerMap) settings.containerMap = {};
        if (sel.value) settings.containerMap[c.cookieStoreId] = sel.value;
        else delete settings.containerMap[c.cookieStoreId];
        onChange(settings);
      });
      const dot = el("span", {
        class: "container-dot",
        style: `background:${c.colorCode || "#aaa"}`,
        "aria-hidden": "true"
      });
      mapHost.appendChild(el("div", { class: "item-list__row" }, [
        el("div", { class: "item-list__row-content" }, [dot, el("span", { class: "item-list__title" }, [c.name])]),
        sel
      ]));
    }
  };

  try {
    browser.contextualIdentities?.query({}).then(result => {
      containers = result || [];
      renderMap();
    }).catch(() => renderMap());
  } catch { renderMap(); }

  sec.appendChild(mapHost);
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
    "Optional — appears as 'Good evening, Matthew'.",
    nameInput
  ));

  // Birthday — MM-DD format. When today's MM-DD matches, the background
  // shows balloons drifting up across the screen for 24 hours.
  const birthdayInput = el("input", {
    type: "text",
    class: "text-input text-input--inline",
    placeholder: "MM-DD (e.g. 04-15)",
    pattern: "\\d{2}-\\d{2}",
    maxlength: "5",
    value: settings.greeting.birthday || "",
    "aria-label": "Birthday in MM-DD format",
    onChange: (e) => {
      const v = e.target.value.trim();
      if (v && !/^\d{2}-\d{2}$/.test(v)) {
        toast("Birthday must be in MM-DD format (e.g. 04-15).", "error");
        e.target.value = settings.greeting.birthday || "";
        return;
      }
      settings.greeting.birthday = v;
      onChange(settings);
    }
  });
  g.appendChild(row(
    "Birthday",
    "Optional — MM-DD. Triggers floating balloons all day on your birthday.",
    birthdayInput
  ));
  sec.appendChild(g);

  // Custom greetings per time slot. Empty input falls back to the
  // built-in "Good morning / afternoon / evening / night" phrasing.
  // The literal `[name]` token expands inline; if a custom string omits
  // the token but a display name is set, the name is appended after
  // a comma exactly like the default greeting would do.
  if (!settings.greeting.custom) {
    settings.greeting.custom = { morning: "", afternoon: "", evening: "", night: "" };
  }
  const customGroup = group();
  customGroup.appendChild(el("p", { class: "settings-row__hint" }, [
    "Override the built-in greeting for any time slot. Use [name] to drop your display name into the phrase. Leave blank to keep the default."
  ]));
  const slotLabels = [
    ["morning",   "Morning",   "5:00 a.m. – 11:59 a.m.", "e.g. Rise and shine, [name]"],
    ["afternoon", "Afternoon", "12:00 p.m. – 4:59 p.m.", "e.g. Hey [name], make it count"],
    ["evening",   "Evening",   "5:00 p.m. – 9:59 p.m.",  "e.g. Welcome back, [name]"],
    ["night",     "Night",     "10:00 p.m. – 4:59 a.m.", "e.g. Burning the midnight oil, [name]"]
  ];
  for (const [slot, title, hint, placeholder] of slotLabels) {
    const input = el("input", {
      type: "text",
      class: "text-input",
      maxlength: "120",
      value: settings.greeting.custom[slot] || "",
      placeholder,
      "aria-label": `${title} greeting override`,
      onChange: (e) => {
        settings.greeting.custom = {
          ...settings.greeting.custom,
          [slot]: e.target.value
        };
        onChange(settings);
      }
    });
    customGroup.appendChild(rowColumn(`${title} greeting`, input, hint));
  }
  sec.appendChild(customGroup);
  return sec;
}

/* ---- Locality (scenery override) -------------------------------------- */

function buildLocalitySection(settings, onChange) {
  const sec = section("Scenery", "image");
  if (!settings.appearance) settings.appearance = { locality: "auto" };
  const g = group();
  g.appendChild(rowColumn(
    "Locality scenery",
    segmented({
      ariaLabel: "Locality scenery",
      value: settings.appearance.locality || "auto",
      options: [
        { value: "auto",     label: "Auto"     },
        { value: "coastal",  label: "Coastal"  },
        { value: "urban",    label: "Urban"    },
        { value: "forest",   label: "Forest"   },
        { value: "mountain", label: "Mountain" },
        { value: "lake",     label: "Lake"     },
        { value: "meadow",   label: "Meadow"   },
        { value: "tropical", label: "Tropical" },
        { value: "desert",   label: "Desert"   },
        { value: "polar",    label: "Polar"    },
        { value: "default",  label: "None"     }
      ],
      onChange: (v) => {
        settings.appearance.locality = v;
        onChange(settings);
      }
    }),
    "Auto blends location, biome, and region into urban, coastal, lake, mountain, forest, desert, tropical, polar, or meadow scenery, with regional atmosphere variants where available."
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Search ------------------------------------------------------------ */

function buildSearchSection(settings, onChange) {
  const sec = section("Search", "search", { defaultOpen: true });
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
    onChange: (e) => {
      const next = e.target.value;
      const v = validateCustomSearchUrl(next);
      if (!v.ok) {
        toast(v.reason, "error");
        e.target.value = settings.search.customUrl || "";
        return;
      }
      settings.search.customUrl = v.normalized;
      onChange(settings);
    }
  });
  const customRow = rowColumn(
    "Custom URL",
    customInput,
    "Must be https:// for public hosts. http:// is allowed for localhost, RFC1918 private IPs, .local mDNS, and Tailscale CGNAT. Use %s where the query goes. Invalid URLs fall back to DuckDuckGo."
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

  // Agricultural / atmospheric variable set — appends CAPE, VPD, soil
  // moisture (3 depths), and soil temperature (3 depths) to the weather
  // chip's hover title. No new endpoint, no new permissions.
  g.appendChild(row(
    "Agricultural / atmospheric variables",
    "Adds CAPE (thunderstorm potential), vapour-pressure deficit, and soil moisture / temperature at 3 depths to the weather hover title. Useful for gardeners, cyclists, and allergy sufferers.",
    toggle({
      checked: settings.weather.showAgricultural || false,
      ariaLabel: "Show agricultural variables",
      onChange: (v) => { settings.weather.showAgricultural = v; onChange(settings); }
    })
  ));

  // Dual temperature units — shows °C and °F side-by-side in the
  // headline. Conversion is client-side from the unit Open-Meteo
  // already returned, so no extra fetch.
  g.appendChild(row(
    "Show both °C and °F",
    "Render the other unit alongside the headline temperature (e.g. \"72°F · 22°C\"). Useful for travelers and cross-region work.",
    toggle({
      checked: settings.weather.dualUnits || false,
      ariaLabel: "Show both temperature units",
      onChange: (v) => { settings.weather.dualUnits = v; onChange(settings); }
    })
  ));

  // Ensemble forecast confidence — narrow spread = high confidence.
  // Adds one outbound call to ensemble-api.open-meteo.com per
  // location every 30 min (cached on top).
  g.appendChild(row(
    "Forecast confidence",
    "Adds an Open-Meteo Ensemble (50-member ICON-EU) confidence chip to the weather hover. Narrow temperature spread = high confidence; wide spread = uncertain. Adds one extra outbound call per 30-min cache cycle.",
    toggle({
      checked: settings.weather.showEnsembleConfidence || false,
      ariaLabel: "Show forecast confidence",
      onChange: (v) => { settings.weather.showEnsembleConfidence = v; onChange(settings); }
    })
  ));

  // 5-day extended forecast — min/max temps, precipitation, UV index,
  // wind speed, weather code. No new API host; reuses api.open-meteo.com.
  g.appendChild(row(
    "Show 5-day forecast",
    "Renders a 5-day extended forecast panel below the current weather (min/max temps, precipitation chance, UV index, wind). Adds one extra outbound call per location every 10-min cache cycle.",
    toggle({
      checked: settings.weather.forecastEnabled || false,
      ariaLabel: "Show 5-day forecast",
      onChange: (v) => { settings.weather.forecastEnabled = v; onChange(settings); }
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
        toast(`Couldn't find "${q}".`, "error");
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
  if (settings.quicklinks.itemsPerRow == null) settings.quicklinks.itemsPerRow = "auto";
  g.appendChild(row(
    "Items per row",
    "Auto fills the row based on pill width. A fixed count gives a tidy grid regardless of label length.",
    segmented({
      ariaLabel: "Quick links per row",
      value: String(settings.quicklinks.itemsPerRow),
      options: [
        { value: "auto", label: "Auto" },
        { value: "3",    label: "3"    },
        { value: "4",    label: "4"    },
        { value: "5",    label: "5"    },
        { value: "6",    label: "6"    },
        { value: "8",    label: "8"    }
      ],
      onChange: (v) => {
        settings.quicklinks.itemsPerRow = v === "auto" ? "auto" : parseInt(v, 10);
        onChange(settings);
      }
    })
  ));
  if (settings.quicklinks.iconRadius == null) settings.quicklinks.iconRadius = "rounded";
  g.appendChild(row(
    "Icon roundness",
    "Shape of the quick link icon corners.",
    segmented({
      ariaLabel: "Quick link icon roundness",
      value: String(settings.quicklinks.iconRadius),
      options: [
        { value: "square", label: "Square" },
        { value: "rounded", label: "Rounded" },
        { value: "circle", label: "Circle" }
      ],
      onChange: (v) => {
        settings.quicklinks.iconRadius = v;
        onChange(settings);
      }
    })
  ));

  // Speculation Rules hover-prefetch (Chrome 109+ / Edge 109+;
  // Firefox + Safari silently ignore the script tag).
  g.appendChild(row(
    "Hover prefetch",
    "Inject a <script type=\"speculationrules\"> block so Chromium browsers prefetch quick-link destinations on hover (~200 ms). Uses background bandwidth; off by default.",
    toggle({
      checked: settings.quicklinks.speculate || false,
      ariaLabel: "Hover-prefetch quick links",
      onChange: async (v) => {
        settings.quicklinks.speculate = v;
        onChange(settings);
        try {
          const { applySpeculationRules } = await import("./utils/speculation-rules.js");
          applySpeculationRules(v);
        } catch { /* ignore */ }
      }
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
        // Manual cell placement button (v1.1.0): show grid icon if itemsPerRow is a number
        ...(typeof settings.quicklinks.itemsPerRow === "number" ? [
          el("button", {
            type: "button",
            class: "icon-button icon-button--ghost icon-button--small",
            "aria-label": `Set grid position for ${item.title}`,
            title: "Set grid position",
            onClick: () => {
              openCellPlacementDialog(item, idx, settings, onChange, refreshList);
            }
          }, [iconNode("grid", { size: 14 })])
        ] : []),
        el("button", {
          type: "button",
          class: "icon-button icon-button--ghost icon-button--small",
          "aria-label": `Remove ${item.title}`,
          title: `Remove ${item.title}`,
          onClick: () => {
            const removed = cloneValue(item);
            settings.quicklinks.items.splice(idx, 1);
            onChange(settings);
            refreshList();
            toastUndo(`Removed "${removed.title}".`, () => {
              insertAt(settings.quicklinks.items, idx, removed);
              onChange(settings);
              refreshList();
            });
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
        toast("That doesn't look like a valid URL.", "error");
        return;
      }
      settings.quicklinks.items.push({ title: t, url: u });
      onChange(settings);
      titleInput.value = "";
      urlInput.value = "";
      refreshList();
      toast(`${t} added.`, "success");
    }
  }, [iconNode("plus", { size: 14 }), " Add link"]);

  sec.appendChild(el("div", { class: "compose" }, [
    titleInput,
    el("div", { class: "compose__row" }, [urlInput, addBtn])
  ]));

  // Tab Groups section (v1.2.0+): Pin Tab Groups as quick-links
  if (chrome?.tabGroups) {
    const tabGroupsDiv = el("div", { class: "tab-groups-section" });
    
    const tabGroupsList = el("ul", { class: "item-list" });
    const refreshTabGroupsList = async () => {
      clear(tabGroupsList);
      try {
        const { getTabGroups } = await import("./utils/tab-groups.js");
        const groups = await getTabGroups();
        
        if (!groups.length) {
          tabGroupsList.appendChild(el("li", { class: "item-list__empty" }, ["No Tab Groups found. Create one in Chrome/Edge to pin it here."]));
          return;
        }
        
        groups.forEach((group) => {
          const isPinned = settings.quicklinks.items.some(item => item.groupId === group.id);
          tabGroupsList.appendChild(el("li", { class: "item-list__row" }, [
            el("div", { class: "item-list__row-content" }, [
              el("span", { class: "item-list__title" }, [group.title]),
              el("span", { class: "item-list__hint" }, [`${group.title.length} tabs`])
            ]),
            el("button", {
              type: "button",
              class: "icon-button icon-button--ghost icon-button--small",
              "aria-label": isPinned ? `Unpin ${group.title}` : `Pin ${group.title}`,
              title: isPinned ? "Pinned" : "Pin to quick-links",
              onClick: () => {
                if (isPinned) {
                  const idx = settings.quicklinks.items.findIndex(i => i.groupId === group.id);
                  if (idx >= 0) {
                    const removed = cloneValue(settings.quicklinks.items[idx]);
                    settings.quicklinks.items.splice(idx, 1);
                    onChange(settings);
                    refreshTabGroupsList();
                    toastUndo(`Unpinned "${removed.title}".`, () => {
                      insertAt(settings.quicklinks.items, idx, removed);
                      onChange(settings);
                      refreshTabGroupsList();
                    });
                  }
                } else {
                  settings.quicklinks.items.push({
                    title: group.title,
                    groupId: group.id,
                    groupColor: group.color
                  });
                  onChange(settings);
                  refreshTabGroupsList();
                  toast(`Pinned "${group.title}".`, "success");
                }
              }
            }, [iconNode(isPinned ? "star-fill" : "star", { size: 14 })])
          ]));
        });
      } catch (e) {
        console.warn("Failed to load Tab Groups:", e);
        tabGroupsList.appendChild(el("li", { class: "item-list__empty" }, ["Error loading Tab Groups"]));
      }
    };
    
    tabGroupsDiv.appendChild(el("h3", { class: "section-title" }, ["Pin Tab Groups (Chrome/Edge)"]));
    tabGroupsDiv.appendChild(tabGroupsList);
    
    sec.appendChild(tabGroupsDiv);
    
    // Load Tab Groups on next tick so the section is visible
    setTimeout(() => refreshTabGroupsList(), 0);
  }

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
      const grant = hostPermissionAction(settings, onChange, feed.url, `${title} feed`, refreshList);
      list.appendChild(el("li", { class: "item-list__row" }, [
        el("div", { class: "item-list__row-content" }, [
          el("span", { class: "item-list__title" }, [feed.title || feed.url]),
          el("span", { class: "item-list__hint" }, [hostnameLabel(feed.url)])
        ]),
        grant,
        el("button", {
          type: "button",
          class: "icon-button icon-button--ghost icon-button--small",
          "aria-label": `Remove ${feed.title || feed.url}`,
          title: "Remove",
          onClick: () => {
            const removed = cloneValue(feed);
            cfg.feeds.splice(idx, 1);
            onChange(settings);
            refreshList();
            toastUndo(`Removed "${removed.title || hostnameLabel(removed.url)}".`, () => {
              insertAt(cfg.feeds, idx, removed);
              onChange(settings);
              refreshList();
            });
          }
        }, [iconNode("trash", { size: 14 })])
      ].filter(Boolean)));
    });
  };
  refreshList();
  sec.appendChild(list);

  const titleInput = el("input", { type: "text", class: "text-input", placeholder: "Label, e.g. BBC" });
  const urlInput = el("input", { type: "text", class: "text-input", placeholder: "https://example.com or https://example.com/feed" });
  
  let discoveredFeeds = [];
  const discoveredList = el("ul", { class: "item-list item-list--discovered" });
  const discoveryStatus = el("div", { class: "discovery-status", style: "display: none; padding: var(--s-2) var(--s-3); background: var(--bg-elevated); border-radius: var(--r-md); color: var(--subtext0); font-size: var(--text-sm);" }, []);
  
  const discoverBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost",
    title: "Auto-detect feeds on this website",
    "aria-label": "Discover feeds",
    onClick: async () => {
      const u = urlInput.value.trim();
      if (!u) {
        toast("Website URL is required.", "error");
        return;
      }
      let url;
      try { 
        url = new URL(u);
        // If user entered just a domain, assume https://
        if (!url.protocol) url = new URL("https://" + u);
      } catch {
        toast("That doesn't look like a valid URL.", "error");
        return;
      }
      
      discoverBtn.disabled = true;
      discoveryStatus.style.display = "block";
      discoveryStatus.textContent = "Discovering feeds...";
      
      try {
        const permission = await requestAndRecordHostAccess(settings, url.href, "feed discovery");
        if (permission.required && !permission.granted) {
          onChange(settings);
          discoveryStatus.textContent = "Host access was not granted, so Vantage could not inspect that site for feeds.";
          return;
        }
        const { discoverFeeds } = await import("./utils/feed-discovery.js");
        discoveredFeeds = await discoverFeeds(url.href);
        
        clear(discoveredList);
        if (!discoveredFeeds.length) {
          discoveryStatus.textContent = "No feeds found on this website. Try entering a feed URL directly.";
          return;
        }
        
        discoveryStatus.textContent = `Found ${discoveredFeeds.length} feed(s):`;
        
        discoveredFeeds.forEach((feed) => {
          const li = el("li", { class: "item-list__row" }, [
            el("div", { class: "item-list__row-content" }, [
              el("span", { class: "item-list__title" }, [feed.title]),
              el("span", { class: "item-list__hint" }, [hostnameLabel(feed.url)])
            ]),
            el("button", {
              type: "button",
              class: "icon-button icon-button--primary icon-button--small",
              "aria-label": `Subscribe to ${feed.title}`,
              title: "Subscribe",
              onClick: async () => {
                await requestAndRecordHostAccess(settings, feed.url, "feed loading");
                cfg.feeds.push({ title: feed.title, url: feed.url });
                onChange(settings);
                clear(discoveredList);
                discoveryStatus.style.display = "none";
                urlInput.value = "";
                titleInput.value = "";
                refreshList();
                toast(`"${feed.title}" added.`, "success");
              }
            }, [iconNode("plus", { size: 14 })])
          ]);
          discoveredList.appendChild(li);
        });
      } catch (e) {
        console.error("Feed discovery error:", e);
        discoveryStatus.textContent = `Error: ${e.message}`;
      } finally {
        discoverBtn.disabled = false;
      }
    }
  }, [iconNode("search", { size: 14 })]);
  
  const addBtn = el("button", {
    type: "button",
    class: "button button--primary",
    onClick: async () => {
      const t = titleInput.value.trim();
      const u = urlInput.value.trim();
      if (!u) {
        toast("Feed URL is required.", "error");
        return;
      }
      try { new URL(u); } catch {
        toast("That doesn't look like a valid URL.", "error");
        return;
      }
      await requestAndRecordHostAccess(settings, u, "feed loading");
      cfg.feeds.push({ title: t || hostnameLabel(u), url: u });
      onChange(settings);
      titleInput.value = "";
      urlInput.value = "";
      clear(discoveredList);
      discoveryStatus.style.display = "none";
      refreshList();
      toast(`Feed added.`, "success");
    }
  }, [iconNode("plus", { size: 14 }), " Add feed"]);

  sec.appendChild(el("div", { class: "compose" }, [
    titleInput,
    el("div", { class: "compose__row" }, [urlInput, discoverBtn, addBtn]),
    discoveryStatus,
    discoveredList
  ]));

  // Preset bundles — collapsible groups of one-click feed adds. Reddit
  // (anonymous .rss) shipped in v0.8.0; the Dev bundle (HN + Lobsters +
  // GitHub Trending + DEV.to) closes the v1.1.0 ROADMAP "Multi-source
  // aggregated dev feed" item — single panel, deduped + date-sorted by
  // the existing feed-list path.
  //
  // GitHub Trending has no native RSS; mshibanami.github.io/GitHubTrendingRSS
  // is the de-facto unofficial mirror (static GH Pages, no auth, scraped
  // daily). All five GH-Trending presets below cover the most-used
  // languages plus the language-agnostic "all" feed.
  const REDDIT_PRESETS = [
    { title: "Reddit — All",           url: "https://www.reddit.com/r/all/.rss" },
    { title: "Reddit — Popular",       url: "https://www.reddit.com/r/popular/.rss" },
    { title: "Reddit — Technology",    url: "https://www.reddit.com/r/technology/.rss" },
    { title: "Reddit — World News",    url: "https://www.reddit.com/r/worldnews/.rss" },
    { title: "Reddit — Programming",   url: "https://www.reddit.com/r/programming/.rss" },
    { title: "Reddit — Science",       url: "https://www.reddit.com/r/science/.rss" },
  ];

  const DEV_PRESETS = [
    { title: "Hacker News — Front page",  url: "https://news.ycombinator.com/rss" },
    { title: "Hacker News — Best",        url: "https://hnrss.org/best" },
    { title: "Hacker News — Show HN",     url: "https://hnrss.org/show" },
    { title: "Hacker News — Ask HN",      url: "https://hnrss.org/ask" },
    { title: "Lobsters",                  url: "https://lobste.rs/rss" },
    { title: "DEV.to",                    url: "https://dev.to/feed" },
    { title: "GitHub Trending — All",     url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml" },
    { title: "GitHub Trending — JavaScript", url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/javascript.xml" },
    { title: "GitHub Trending — TypeScript", url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/typescript.xml" },
    { title: "GitHub Trending — Python",  url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/python.xml" },
    { title: "GitHub Trending — Rust",    url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/rust.xml" },
    { title: "GitHub Trending — Go",      url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/go.xml" },
  ];

  sec.appendChild(buildPresetGroup("Dev presets",    DEV_PRESETS,    cfg, onChange, refreshList, settings));
  sec.appendChild(buildPresetGroup("Reddit presets", REDDIT_PRESETS, cfg, onChange, refreshList, settings));

  return sec;
}

/** Render a collapsible <details> group of one-click feed-add buttons.
 *  Buttons that match an already-subscribed URL are disabled and show a
 *  check mark instead of a plus, mirroring the original Reddit-presets
 *  pattern — extracted so the Dev presets reuse it without duplication.
 */
function buildPresetGroup(label, presets, cfg, onChange, refreshList, settings) {
  const wrap = el("details", { class: "feed-presets" }, [
    el("summary", { class: "feed-presets__toggle" }, [label])
  ]);
  for (const p of presets) {
    const already = cfg.feeds.some(f => f.url === p.url);
    const btn = el("button", {
      type: "button",
      class: `button button--ghost button--small${already ? " button--muted" : ""}`,
      disabled: already,
      onClick: async () => {
        if (already) return;
        await requestAndRecordHostAccess(settings, p.url, "feed loading");
        cfg.feeds.push({ title: p.title, url: p.url });
        onChange(settings);
        refreshList();
        toast(`${p.title} added.`, "success");
      }
    }, [already ? iconNode("check", { size: 12 }) : iconNode("plus", { size: 12 }), ` ${p.title}`]);
    wrap.appendChild(btn);
  }
  return wrap;
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

/* ---- Marine weather --------------------------------------------------- */

function buildMarineSection(settings, onChange) {
  const sec = section("Marine weather", "wind");
  const g = group();
  g.appendChild(row(
    "Show marine pill",
    "Wave height + direction + period, sea surface temperature, ocean current vector via Open-Meteo Marine API. Coastal locations only — the pill hides automatically when the API returns nulls (inland).",
    toggle({
      checked: settings.marine?.enabled || false,
      ariaLabel: "Show marine pill",
      onChange: (v) => {
        if (!settings.marine) settings.marine = {};
        settings.marine.enabled = v;
        onChange(settings);
      }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Flood risk ------------------------------------------------------- */

function buildFloodSection(settings, onChange) {
  const sec = section("River flood risk", "layers");
  const g = group();
  g.appendChild(row(
    "Show flood-risk pill",
    "GloFAS v4 river discharge for the nearest river via Open-Meteo Flood API. Auto-hides when the API returns nulls (no major river near your location).",
    toggle({
      checked: settings.flood?.enabled || false,
      ariaLabel: "Show flood-risk pill",
      onChange: (v) => {
        if (!settings.flood) settings.flood = {};
        settings.flood.enabled = v;
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

function buildEmbedsSection(settings, onChange) {
  const sec  = section("Embeds", "plane");
  const hint = el("p", { class: "settings-section__hint" }, [
    "Add any website as a panel — flight tracker, traffic map, custom dashboard, etc. " +
    "Some sites block embedding; the panel shows an \u201copen in new tab\u201d fallback."
  ]);
  sec.appendChild(hint);

  const embeds = settings.embeds || [];
  const listEl = el("div", { class: "item-list embeds-list" });

  function refreshList() {
    clear(listEl);
    const current = settings.embeds || [];
    if (!current.length) {
      listEl.appendChild(el("div", { class: "item-list__empty" }, ["No embeds configured yet."]));
      return;
    }
    current.forEach((embed, idx) => {
      const titleIn = el("input", {
        type: "text", class: "text-input",
        value: embed.title || "",
        placeholder: "Title",
        "aria-label": "Embed title",
        onChange: (e) => {
          embed.title = e.target.value.trim() || "Embed";
          onChange(settings);
        }
      });
      const urlIn = el("input", {
        type: "url", class: "text-input",
        value: embed.url || "",
        placeholder: "https://…",
        "aria-label": "Embed URL",
        onChange: async (e) => {
          embed.url = e.target.value.trim();
          if (embed.url) await requestAndRecordHostAccess(settings, embed.url, "embed loading");
          onChange(settings);
          refreshList();
        }
      });
      const tog = toggle({
        checked: embed.enabled ?? false,
        ariaLabel: "Enable this embed",
        onChange: async (v) => {
          if (v && embed.url) await requestAndRecordHostAccess(settings, embed.url, "embed loading");
          embed.enabled = v;
          onChange(settings);
          refreshList();
        }
      });
      const grant = hostPermissionAction(settings, onChange, embed.url, "embed loading", refreshList);
      const del = el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Remove embed", title: "Remove",
        onClick: () => {
          const removed = cloneValue(embed);
          settings.embeds = settings.embeds.filter(e => e.id !== embed.id);
          onChange(settings);
          refreshList();
          toastUndo(`Removed "${removed.title || "Embed"}".`, () => {
            if (!settings.embeds) settings.embeds = [];
            insertAt(settings.embeds, idx, removed);
            onChange(settings);
            refreshList();
          });
        }
      }, [iconNode("trash", { size: 14 })]);

      const sandboxTog = toggle({
        checked: embed.sandbox !== false,
        ariaLabel: "Sandbox this embed",
        onChange: (v) => { embed.sandbox = v; onChange(settings); }
      });
      const geoTog = toggle({
        checked: embed.allowGeolocation || false,
        ariaLabel: "Allow geolocation",
        onChange: (v) => { embed.allowGeolocation = v; onChange(settings); }
      });
      const sandboxRow = el("div", { class: "embed-item__sandbox" }, [
        el("label", { class: "embed-item__label" }, [sandboxTog, " Sandbox"]),
        el("label", { class: "embed-item__label" }, [geoTog, " Geolocation"])
      ]);

      listEl.appendChild(el("div", { class: "embed-item" }, [
        el("div", { class: "embed-item__row" }, [
          tog,
          el("div", { class: "embed-item__inputs" }, [titleIn, urlIn, grant].filter(Boolean)),
          del
        ]),
        sandboxRow
      ]));
    });
  }
  refreshList();
  sec.appendChild(listEl);

  const addBtn = el("button", {
    type: "button", class: "button button--ghost",
    onClick: () => {
      if (!settings.embeds) settings.embeds = [];
      settings.embeds.push({ id: String(Date.now()), title: "Embed", url: "", enabled: false });
      onChange(settings);
      refreshList();
    }
  }, [iconNode("plus", { size: 14 }), " Add embed"]);
  sec.appendChild(addBtn);
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
      const grant = hostPermissionAction(settings, onChange, feed.url, "calendar loading", refreshList);
      list.appendChild(el("li", { class: "item-list__row" }, [
        el("div", { class: "item-list__row-content" }, [
          el("span", { class: "item-list__title" }, [feed.title || feed.url]),
          el("span", { class: "item-list__hint" }, [hostnameLabel(feed.url)])
        ]),
        grant,
        el("button", {
          type: "button", class: "icon-button icon-button--ghost icon-button--small",
          "aria-label": `Remove ${feed.title || feed.url}`, title: "Remove",
          onClick: () => {
            const removed = cloneValue(feed);
            settings.calendar.feeds.splice(idx, 1);
            onChange(settings);
            refreshList();
            toastUndo(`Removed "${removed.title || hostnameLabel(removed.url)}".`, () => {
              insertAt(settings.calendar.feeds, idx, removed);
              onChange(settings);
              refreshList();
            });
          }
        }, [iconNode("trash", { size: 14 })])
      ].filter(Boolean)));
    });
  };
  refreshList();
  sec.appendChild(list);

  const titleInput = el("input", { type: "text", class: "text-input", placeholder: "Label, e.g. Work" });
  const urlInput   = el("input", { type: "text", class: "text-input", placeholder: "https://calendar.google.com/…/basic.ics" });
  const addBtn = el("button", {
    type: "button", class: "button button--primary",
    onClick: async () => {
      const t = titleInput.value.trim(), u = urlInput.value.trim();
      if (!u) { toast("iCal URL is required.", "error"); return; }
      try { new URL(u); } catch { toast("That doesn't look like a valid URL.", "error"); return; }
      await requestAndRecordHostAccess(settings, u, "calendar loading");
      if (!settings.calendar) settings.calendar = { enabled: false, feeds: [], maxItems: 10, daysAhead: 7 };
      settings.calendar.feeds.push({ title: t || hostnameLabel(u), url: u });
      onChange(settings);
      titleInput.value = ""; urlInput.value = "";
      refreshList();
      toast("Calendar added.", "success");
    }
  }, [iconNode("plus", { size: 14 }), " Add calendar"]);

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

  // Alarm tone — synthesized via Web Audio (see utils/alarm-audio.js).
  if (!cfg.alarm) {
    settings.pomodoro.alarm = { tone: "bell", volume: 60, customAudio: "" };
  }
  const alarmGroup = group();
  alarmGroup.appendChild(row(
    "Alarm tone",
    "Plays once when a work or break period ends. Synthesized in-browser; no audio assets shipped with the extension.",
    segmented({
      ariaLabel: "Alarm tone",
      value: settings.pomodoro.alarm.tone,
      options: [
        { value: "none",    label: "Off"     },
        { value: "bell",    label: "Bell"    },
        { value: "chime",   label: "Chime"   },
        { value: "digital", label: "Digital" },
        { value: "custom",  label: "Custom"  }
      ],
      onChange: (v) => {
        settings.pomodoro.alarm = { ...settings.pomodoro.alarm, tone: v };
        onChange(settings);
      }
    })
  ));

  // Volume slider
  const volInput = el("input", {
    type: "range",
    min: "0", max: "100", step: "5",
    value: String(settings.pomodoro.alarm.volume ?? 60),
    "aria-label": "Alarm volume",
    onInput: (e) => {
      settings.pomodoro.alarm = { ...settings.pomodoro.alarm, volume: parseInt(e.target.value, 10) };
      onChange(settings);
    }
  });
  alarmGroup.appendChild(row("Volume", null, volInput));

  // Test button — fires the configured tone once. Live demo is more
  // reliable than text descriptions for choosing a tone.
  alarmGroup.appendChild(row(
    "Test alarm",
    "Plays the selected tone once at the configured volume.",
    el("button", {
      type: "button",
      class: "button button--ghost",
      onClick: () => {
        playAlarmTone(settings.pomodoro.alarm).catch(() => {});
      }
    }, [iconNode("play", { size: 14 }), " Test"])
  ));

  // Custom audio uploader — only meaningful when tone === "custom"
  const fileInput = el("input", {
    type: "file",
    accept: "audio/*",
    style: { display: "none" },
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      // 200 KB cap — keeps chrome.storage usage bounded; longer alarms
      // are excessive for "session-end ding" purposes anyway.
      if (file.size > 200 * 1024) {
        toast("Custom alarm must be 200 KB or smaller.", "error");
        e.target.value = "";
        return;
      }
      try {
        const dataUri = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = () => reject(r.error);
          r.readAsDataURL(file);
        });
        settings.pomodoro.alarm = {
          ...settings.pomodoro.alarm,
          tone: "custom",
          customAudio: dataUri
        };
        onChange(settings);
        toast(`Custom alarm set (${(file.size / 1024).toFixed(1)} KB).`, "success");
      } catch (err) {
        toast("Couldn't read that audio file.", "error");
      }
      e.target.value = "";
    }
  });
  alarmGroup.appendChild(fileInput);
  alarmGroup.appendChild(rowColumn(
    "Custom audio",
    el("div", { class: "compose__row" }, [
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => fileInput.click()
      }, [iconNode("upload", { size: 14 }), " Upload audio"]),
      settings.pomodoro.alarm.customAudio
        ? el("button", {
            type: "button",
            class: "button button--ghost",
            onClick: () => {
              settings.pomodoro.alarm = {
                ...settings.pomodoro.alarm,
                tone: settings.pomodoro.alarm.tone === "custom" ? "bell" : settings.pomodoro.alarm.tone,
                customAudio: ""
              };
              onChange(settings);
              toast("Custom alarm cleared.", "success");
            }
          }, [iconNode("trash", { size: 14 }), " Clear"])
        : null
    ]),
    "MP3 / OGG / WAV / M4A, max 200 KB. Switches the tone to 'Custom' on upload."
  ));

  sec.appendChild(alarmGroup);
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
      }, [iconNode("settings", { size: 14 }), " Run wizard"])
    ));
  }

  // JSON export
  g.appendChild(row(
    "Export settings",
    "Download all settings as a JSON file. Secrets (CoinGecko API key, NASA key) are stripped from the export.",
    el("button", {
      type: "button", class: "button button--primary",
      onClick: () => {
        const safe = stripSecrets(settings);
        const json = JSON.stringify(safe, null, 2);
        triggerDownload(json, `vantage-settings-${isoDate()}.json`, "application/json");
        toast("Settings exported (secrets stripped).", "success");
      }
    }, [iconNode("download", { size: 14 }), " Export JSON"])
  ));

  // JSON import — surfaces the partial-restore dialog so users opt-in
  // to which sections overwrite their current settings (data-safety win
  // requested by ROADMAP, also closes the Q1 audit follow-up about the
  // import path being a UI-control / network-beacon primitive).
  const jsonImportInput = el("input", {
    type: "file", accept: ".json,application/json",
    style: { display: "none" },
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const previous = cloneValue(settings);
        const imported = normalizeImportedSettings(JSON.parse(text));
        const merged = await showPartialImportDialog(settings, imported, file.name);
        if (!merged) {
          toast("Import canceled.", "info");
          jsonImportInput.value = "";
          return;
        }
        const mergedWithPermissions = await reviewHostPermissionsForSettings(merged, file.name);
        await saveSettings(mergedWithPermissions);
        onChange(mergedWithPermissions);
        toast(`Settings imported from ${file.name}.`, "success", 8000, {
          label: "Undo",
          onClick: async () => {
            await saveSettings(previous);
            onChange(previous);
            toast("Import undone.", "success");
          }
        });
      } catch (err) {
        toast(err.message || "Invalid JSON file.", "error");
      }
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
    }, [iconNode("upload", { size: 14 }), " Import JSON"])
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
    }, [iconNode("download", { size: 14 }), " Export OPML"])
  ));

  // OPML import
  const opmlImportInput = el("input", {
    type: "file", accept: ".opml,.xml,text/x-opml,application/xml",
    style: { display: "none" },
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const previous = cloneValue(settings);
        const text = await file.text();
        const { rss, news } = importOPML(text);
        if (!settings.rss)  settings.rss  = { enabled: true, feeds: [], maxItems: 15, readItems: [] };
        if (!settings.news) settings.news = { enabled: true, feeds: [], maxItems: 15, readItems: [] };
        const mergeFeeds = (existing, incoming) => {
          const seen = new Set(existing.map(f => f.url));
          const added = [];
          for (const feed of incoming) {
            if (!feed?.url || seen.has(feed.url)) continue;
            seen.add(feed.url);
            added.push(feed);
          }
          return { feeds: [...existing, ...added], added };
        };
        const rssMerge = mergeFeeds(settings.rss.feeds, rss);
        const newsMerge = mergeFeeds(settings.news.feeds, news);
        settings.rss.feeds = rssMerge.feeds;
        settings.news.feeds = newsMerge.feeds;
        const addedCount = rssMerge.added.length + newsMerge.added.length;
        if (!addedCount) {
          toast(`No new feeds found in ${file.name}.`, "info");
          return;
        }
        await reviewHostPermissionsForSettings(settings, `${file.name} OPML import`);
        await saveSettings(settings);
        onChange(settings);
        toast(`Imported ${addedCount} new feed${addedCount === 1 ? "" : "s"} from ${file.name}.`, "success", 8000, {
          label: "Undo",
          onClick: async () => {
            await saveSettings(previous);
            onChange(previous);
            toast("Feed import undone.", "success");
          }
        });
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
    }, [iconNode("upload", { size: 14 }), " Import OPML"])
  ));

  // YouTube OPML recipe
  g.appendChild(row(
    "Import YouTube subscriptions",
    "Export your YouTube subscriptions as OPML via Google Takeout, then import them as RSS feeds.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => {
        const takeoutUrl = "https://takeout.google.com/settings/takeout";
        const recipeText = `1. Go to Google Takeout (link will open in a new tab)
2. Deselect all, then scroll down and select only "YouTube and YouTube Music"
3. Click "Next step" and "Create export"
4. Wait for the export to complete, then download the ZIP
5. Extract the ZIP → YouTube → subscriptions.xml
6. Come back here and click "Import OPML" to import subscriptions.xml

This will add all your YouTube channels as RSS feeds (when available).`;
        window.open(takeoutUrl, "takeout");
        toast(recipeText, "info", 12000);
      }
    }, [iconNode("external", { size: 14 }), " Import YouTube"])
  ));

  // Pocket HTML import
  const pocketInput = el("input", { type: "file", accept: ".html,.htm", hidden: true });
  pocketInput.addEventListener("change", async () => {
    const file = pocketInput.files?.[0];
    if (!file) return;
    try {
      const html = await file.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const links = [...doc.querySelectorAll("a[href]")];
      if (!links.length) { toast("No links found in file.", "error"); return; }
      const items = links.map(a => ({
        url: a.href,
        title: a.textContent?.trim() || a.href
      })).filter(it => it.url.startsWith("http"));
      if (!settings.quicklinks) settings.quicklinks = { items: [] };
      if (!settings.quicklinks.items) settings.quicklinks.items = [];
      let added = 0;
      const existing = new Set(settings.quicklinks.items.map(it => it.url));
      for (const it of items) {
        if (!existing.has(it.url)) {
          settings.quicklinks.items.push({ url: it.url, label: it.title });
          existing.add(it.url);
          added++;
        }
      }
      onChange(settings);
      toast(`Imported ${added} link${added !== 1 ? "s" : ""} from Pocket (${items.length - added} duplicates skipped).`, "success");
    } catch (err) {
      toast(`Pocket import failed — ${err?.message || "invalid file"}.`, "error");
    }
    pocketInput.value = "";
  });
  g.appendChild(row(
    "Import from Pocket",
    "Import your Pocket export (HTML) as quick links. Export from getpocket.com/export first.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => pocketInput.click()
    }, [iconNode("upload", { size: 14 }), " Import Pocket HTML"])
  ));

  // Instapaper CSV import
  const instaInput = el("input", { type: "file", accept: ".csv", hidden: true });
  instaInput.addEventListener("change", async () => {
    const file = instaInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split("\n").slice(1).filter(l => l.trim());
      if (!lines.length) { toast("No entries found in CSV.", "error"); return; }
      if (!settings.quicklinks) settings.quicklinks = { items: [] };
      if (!settings.quicklinks.items) settings.quicklinks.items = [];
      let added = 0;
      const existing = new Set(settings.quicklinks.items.map(it => it.url));
      for (const line of lines) {
        const match = line.match(/^"?([^",]+)"?,\s*"?([^"]*)"?/);
        if (!match) continue;
        const [, url, title] = match;
        if (!url.startsWith("http") || existing.has(url)) continue;
        settings.quicklinks.items.push({ url, label: title?.trim() || url });
        existing.add(url);
        added++;
      }
      onChange(settings);
      toast(`Imported ${added} link${added !== 1 ? "s" : ""} from Instapaper.`, "success");
    } catch (err) {
      toast(`Instapaper import failed — ${err?.message || "invalid file"}.`, "error");
    }
    instaInput.value = "";
  });
  g.appendChild(row(
    "Import from Instapaper",
    "Import your Instapaper export (CSV) as quick links. Export from instapaper.com/export first.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => instaInput.click()
    }, [iconNode("upload", { size: 14 }), " Import Instapaper CSV"])
  ));

  // Share config URL
  g.appendChild(row(
    "Share config",
    "Copy a link that loads your settings into Vantage on any device where the extension is installed. Secrets (API keys) are stripped — destination devices need to re-enter them.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => {
        try {
          const safe = stripSecrets(settings);
          const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(safe))));
          const url = new URL(location.href);
          url.hash = `import=${encoded}`;
          navigator.clipboard.writeText(url.href).then(() => {
            toast("Share link copied (secrets stripped).", "success");
          }).catch(() => { toast("Clipboard access denied.", "error"); });
        } catch { toast("Couldn't generate share link.", "error"); }
      }
    }, [iconNode("share", { size: 14 }), " Copy share link"])
  ));

  // Gist-based settings sync (v1.1.0+) — multi-device friendly
  g.appendChild(row(
    "Sync via GitHub Gist",
    "Import public Gists without a token. Creating a Gist requires a one-shot GitHub token with Gists: write; manual JSON and share-link copy stay token-free. Secrets are stripped.",
    el("div", { class: "compose__row" }, [
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: async () => {
          const safe = stripSecrets(settings);
          const json = JSON.stringify(safe, null, 2);
          try {
            const action = await showGistExportDialog(safe);
            if (!action) return;
            if (action.type === "json") {
              await copyText(json);
              toast(`Gist JSON copied (${(json.length / 1024).toFixed(1)} KB). Paste it into a new GitHub Gist.`, "success", 8000);
              return;
            }
            if (action.type === "share") {
              await copyText(generateShareUrl(safe));
              toast("Share link copied (secrets stripped).", "success");
              return;
            }
            toast("Creating Gist...", "info");
            const { gistUrl } = await createSettingsGist(safe, action.token);
            try {
              await copyText(gistUrl);
              toast(`Gist created and URL copied: ${gistUrl}`, "success", 8000);
            } catch {
              toast(`Gist created: ${gistUrl}`, "success", 8000);
            }
          } catch (err) {
            toast(err.message || "Failed to export Gist.", "error", 10000, {
              label: "Copy JSON",
              onClick: async () => {
                try {
                  await copyText(json);
                  toast("Gist JSON copied.", "success");
                } catch {
                  toast("Clipboard access denied.", "error");
                }
              }
            });
          }
        }
      }, [iconNode("upload", { size: 14 }), " Export to Gist"]),
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: async () => {
          const gistUrl = prompt("Paste Gist URL or ID:\n\nExamples:\nhttps://gist.github.com/abc123\nabc123");
          if (!gistUrl?.trim()) return;
          try {
            toast("Loading Gist…", "info");
            const previous = cloneValue(settings);
            const imported = normalizeImportedSettings(await loadSettingsFromGist(gistUrl));
            const merged = await showPartialImportDialog(settings, imported, "GitHub Gist");
            if (!merged) {
              toast("Gist import canceled.", "info");
              return;
            }
            const mergedWithPermissions = await reviewHostPermissionsForSettings(merged, "GitHub Gist");
            await saveSettings(mergedWithPermissions);
            onChange(mergedWithPermissions);
            toast("Settings imported from Gist.", "success", 8000, {
              label: "Undo",
              onClick: async () => {
                await saveSettings(previous);
                onChange(previous);
                toast("Gist import undone.", "success");
              }
            });
          } catch (err) {
            toast(err.message || "Failed to load Gist.", "error");
          }
        }
      }, [iconNode("download", { size: 14 }), " Import from Gist"])
    ])
  ));

  // Dashboard screenshot export — community-friendly sharing (r/startpages, etc)
  g.appendChild(row(
    "Export dashboard screenshot",
    "Save a PNG screenshot of your current dashboard for sharing on Reddit's r/startpages or other communities.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: async () => {
        try {
          toast("Capturing screenshot…", "info");
          const { success, filename } = await captureScreenshot();
          if (success) {
            toast(`Screenshot saved: ${filename}`, "success");
          }
        } catch (err) {
          toast(err.message || "Failed to capture screenshot.", "error");
        }
      }
    }, [iconNode("image", { size: 14 }), " Take screenshot"])
  ));

  // Per-widget config clipboard export — extends the partial-import
  // section-checklist down to widget granularity. Pick the widget(s)
  // you want to share, copy as JSON, paste on another device through
  // the existing import flow.
  const WIDGET_EXPORTS = [
    { id: "rss",         label: "Reading list (RSS)" },
    { id: "news",        label: "News feeds" },
    { id: "calendar",    label: "Calendar feeds" },
    { id: "feedFilters", label: "Feed filter rules" },
    { id: "feedAlerts",  label: "Feed keyword alerts" },
    { id: "quicklinks",  label: "Quick links" },
    { id: "todo",        label: "To-do" },
    { id: "notes",       label: "Notes" },
    { id: "countdown",   label: "Countdown events" },
    { id: "worldclock",  label: "World clocks" },
    { id: "crypto",      label: "Crypto watchlist" },
    { id: "github",      label: "GitHub" },
    { id: "pomodoro",    label: "Pomodoro" },
    { id: "windy",       label: "Windy radar" },
    { id: "embeds",      label: "Embeds" },
    { id: "starred",     label: "Starred items" },
    { id: "ambient",     label: "Ambient sounds" }
  ];
  const widgetCheckHost = el("div", { class: "widget-export-grid" });
  for (const w of WIDGET_EXPORTS) {
    const cb = el("input", { type: "checkbox", id: `wexp-${w.id}` });
    cb.dataset.key = w.id;
    widgetCheckHost.appendChild(el("label", { class: "widget-export-row", htmlFor: `wexp-${w.id}` }, [
      cb,
      el("span", {}, [w.label])
    ]));
  }
  g.appendChild(row(
    "Per-widget clipboard export",
    "Pick widgets, copy a partial JSON to the clipboard, then paste it through the existing JSON import on another device. API keys are scrubbed.",
    el("div", { class: "compose__column" }, [
      widgetCheckHost,
      el("div", { class: "compose__row" }, [
        el("button", {
          type: "button", class: "button button--ghost button--small",
          onClick: () => {
            const all = widgetCheckHost.querySelectorAll('input[type="checkbox"]');
            const allChecked = [...all].every(c => c.checked);
            for (const c of all) c.checked = !allChecked;
          }
        }, ["Toggle all"]),
        el("button", {
          type: "button", class: "button button--primary",
          onClick: async () => {
            const checked = [...widgetCheckHost.querySelectorAll('input[type="checkbox"]:checked')];
            if (!checked.length) {
              toast("Pick at least one widget to export.", "warning");
              return;
            }
            const safe = stripSecrets(settings);
            const partial = {};
            for (const c of checked) {
              const k = c.dataset.key;
              if (safe[k] !== undefined) partial[k] = safe[k];
            }
            const payload = { vantageSettings: 1, exportedAt: new Date().toISOString(), partial };
            const json = JSON.stringify(payload, null, 2);
            try {
              await navigator.clipboard.writeText(json);
              toast(`Copied ${checked.length} widget config${checked.length === 1 ? "" : "s"} (${(json.length / 1024).toFixed(1)} KB).`, "success");
            } catch (err) {
              toast(`Couldn't copy — ${err?.message?.toLowerCase() || "clipboard denied"}.`, "error");
            }
          }
        }, [iconNode("share", { size: 14 }), " Copy selected"])
      ])
    ])
  ));

  // Dashboard screenshot — share-friendly PNG of the live dashboard.
  // Uses SVG foreignObject rasterization (no extra permissions). Cross-
  // origin background images and iframe widgets are stripped by the
  // browser's tainted-canvas rules — documented in the toast.
  g.appendChild(row(
    "Capture dashboard screenshot",
    "Save a PNG of the current dashboard for sharing on r/startpages, your README, etc. Cross-origin backgrounds (Bing/NASA APOD, favicons) and iframe widgets won't appear — bundled themes capture cleanly.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: async (ev) => {
        const btn = ev.currentTarget;
        const wasDisabled = btn.disabled;
        btn.disabled = true;
        toast("Capturing dashboard…", "info");
        try {
          const { filename, bytes } = await captureScreenshot();
          const kb = (bytes / 1024).toFixed(1);
          toast(`Saved ${filename} (${kb} KB).`, "success");
        } catch (err) {
          toast(err.message || "Couldn't capture screenshot.", "error");
        } finally {
          btn.disabled = wasDisabled;
        }
      }
    }, [iconNode("image", { size: 14 }), " Capture screenshot"])
  ));

  // Debug log — local-only ring buffer of unhandled errors for issue
  // reports. Strict opt-in to copy; never auto-uploaded anywhere.
  g.appendChild(row(
    "Debug log",
    "Vantage logs unhandled errors locally (max 50 entries). Copy includes browser version + extension version. Nothing leaves your browser unless you paste it somewhere yourself.",
    el("div", { class: "compose__row" }, [
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: async () => {
          const { formatErrorLog } = await import("./utils/error-log.js");
          const text = await formatErrorLog();
          try {
            await navigator.clipboard.writeText(text);
            toast(`Debug log copied (${text.length} chars).`, "success");
          } catch {
            toast("Clipboard access denied. Tip: open the dev console and paste from settings storage.", "error");
          }
        }
      }, [iconNode("download", { size: 14 }), " Copy debug log"]),
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: async () => {
          const { clearErrorLog } = await import("./utils/error-log.js");
          await clearErrorLog();
          toast("Debug log cleared.", "success");
        }
      }, [iconNode("trash", { size: 14 }), " Clear log"])
    ])
  ));
  
  // Favicon cache — displays cache stats and clear button (v1.0.0+)
  g.appendChild(row(
    "Favicon cache",
    "Vantage caches icon images locally for faster loading and reliability. Cache TTL: 30 days.",
    el("div", { class: "compose__row" }, [
      el("span", {
        class: "icon-button icon-button--ghost icon-button--small",
        style: { pointerEvents: "none", padding: "0.5rem 0.75rem", fontSize: "0.875rem", opacity: "0.7" }
      }, [
        (() => {
          const stats = getFaviconCacheStats();
          return `${stats.count} icons, ${(stats.size / 1024).toFixed(1)} KB`;
        })()
      ]),
      el("button", {
        type: "button", class: "button button--ghost",
        onClick: () => {
          clearFaviconCache();
          toast("Favicon cache cleared.", "success");
        }
      }, [iconNode("trash", { size: 14 }), " Clear cache"])
    ])
  ));

  sec.appendChild(g);
  return sec;
}

function showGistExportDialog(safeSettings) {
  return new Promise((resolve) => {
    const json = JSON.stringify(safeSettings, null, 2);
    const dialog = el("dialog", {
      class: "import-dialog",
      "aria-labelledby": "gist-export-title",
      closedby: "any"
    });
    const tokenInput = el("input", {
      type: "password",
      class: "text-input",
      autocomplete: "off",
      spellcheck: false,
      placeholder: "github_pat_... or ghp_...",
      "aria-label": "GitHub token with Gists write access"
    });
    const createButton = el("button", {
      type: "button",
      class: "button button--primary",
      disabled: true
    }, ["Create public Gist"]);

    let resolved = false;
    let unregisterOverlay = null;
    const close = (result) => {
      if (resolved) return;
      resolved = true;
      unregisterOverlay?.();
      unregisterOverlay = null;
      tokenInput.value = "";
      try { dialog.close(); } catch {}
      dialog.remove();
      resolve(result);
    };

    tokenInput.addEventListener("input", () => {
      createButton.disabled = !tokenInput.value.trim();
    });
    createButton.addEventListener("click", () => {
      const token = tokenInput.value.trim();
      if (!token) return;
      close({ type: "create", token });
    });
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(null); });
    dialog.addEventListener("close", () => close(null));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close(null);
    });

    dialog.appendChild(el("header", { class: "import-dialog__header" }, [
      el("h2", { id: "gist-export-title" }, ["Export settings"]),
      el("p", {}, [
        "GitHub requires a token with Gists: write to create a Gist. Vantage uses it once for this request and never stores it."
      ])
    ]));
    dialog.appendChild(el("div", { class: "import-dialog__sections" }, [
      el("label", { class: "import-dialog__section" }, [
        el("div", { class: "import-dialog__section-text" }, [
          el("span", { class: "import-dialog__section-title" }, ["GitHub token"]),
          el("span", { class: "import-dialog__section-hint" }, [
            "Leave blank and use Copy JSON or Copy share link for a token-free transfer."
          ]),
          tokenInput
        ])
      ])
    ]));
    dialog.appendChild(el("p", { class: "import-dialog__extra-note" }, [
      `Secrets are stripped. Payload size: ${(json.length / 1024).toFixed(1)} KB. Public Gist imports do not need a token.`
    ]));
    dialog.appendChild(el("footer", { class: "import-dialog__actions" }, [
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => close({ type: "json" })
      }, ["Copy JSON"]),
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => close({ type: "share" })
      }, ["Copy share link"]),
      el("span", { class: "import-dialog__spacer" }),
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => close(null)
      }, ["Cancel"]),
      createButton
    ]));

    document.body.appendChild(dialog);
    try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    unregisterOverlay = registerOverlay({
      id: "gist-export-dialog",
      root: dialog,
      close: () => close(null),
      closeOnOutside: false
    });
    requestAnimationFrame(() => tokenInput.focus());
  });
}

async function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is unavailable.");
  }
  await navigator.clipboard.writeText(text);
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

async function requestAndRecordHostAccess(settings, rawUrl, label = "this URL") {
  const origin = hostPermissionOrigin(rawUrl);
  if (!origin) return { required: false, granted: true };
  toast(`Vantage will ask your browser for scoped access to ${hostPermissionLabel(rawUrl)} for ${label}.`, "info", 5000);
  const result = await requestHostPermission(origin, settings);
  if (result.granted) {
    toast(`Host access granted for ${hostPermissionLabel(rawUrl)}.`, "success");
  } else {
    toast(`Host access was not granted for ${hostPermissionLabel(rawUrl)}. You can grant it later from Settings.`, "warning", 9000);
  }
  return result;
}

function hostPermissionAction(settings, onChange, rawUrl, label, refresh) {
  if (!hasDeniedHostOrigin(settings, rawUrl)) return null;
  return el("button", {
    type: "button",
    class: "button button--ghost button--small",
    onClick: async () => {
      await requestAndRecordHostAccess(settings, rawUrl, label);
      onChange(settings);
      refresh?.();
    }
  }, [iconNode("globe", { size: 12 }), " Grant access"]);
}

export async function reviewHostPermissionsForSettings(settings, source = "import") {
  const targets = await missingHostPermissionTargets(collectUserUrlPermissionTargets(settings));
  if (!targets.length) return settings;

  return new Promise((resolve) => {
    const dialog = el("dialog", {
      class: "import-dialog",
      "aria-labelledby": "host-permission-title",
      closedby: "any"
    });

    let resolved = false;
    let unregisterOverlay = null;
    const close = (nextSettings) => {
      if (resolved) return;
      resolved = true;
      unregisterOverlay?.();
      unregisterOverlay = null;
      try { dialog.close(); } catch {}
      dialog.remove();
      resolve(nextSettings);
    };

    dialog.addEventListener("cancel", (e) => { e.preventDefault(); });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        markHostPermissionsDenied(settings, targets.map(t => t.origin));
        close(settings);
      }
    });

    const list = el("div", { class: "import-dialog__sections" });
    for (const target of targets.slice(0, 12)) {
      list.appendChild(el("div", { class: "import-dialog__section", style: "cursor: default;" }, [
        el("div", { class: "import-dialog__section-text" }, [
          el("span", { class: "import-dialog__section-title" }, [target.label || hostPermissionLabel(target.url)]),
          el("span", { class: "import-dialog__section-hint" }, [target.origin])
        ])
      ]));
    }
    if (targets.length > 12) {
      list.appendChild(el("p", { class: "import-dialog__extra-note" }, [
        `${targets.length - 12} additional origin${targets.length - 12 === 1 ? "" : "s"} will be requested in the same browser prompt.`
      ]));
    }

    dialog.appendChild(el("header", { class: "import-dialog__header" }, [
      el("h2", { id: "host-permission-title" }, ["Grant host access"]),
      el("p", {}, [
        `${source} includes user URLs that need scoped browser host access for direct feed, calendar, image, or embed loading.`
      ])
    ]));
    dialog.appendChild(list);
    dialog.appendChild(el("footer", { class: "import-dialog__actions" }, [
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => {
          markHostPermissionsDenied(settings, targets.map(t => t.origin));
          toast("Imported URLs saved without host access. Grant access later from Settings if a widget cannot load directly.", "warning", 9000);
          close(settings);
        }
      }, ["Skip for now"]),
      el("span", { class: "import-dialog__spacer" }),
      el("button", {
        type: "button",
        class: "button button--primary",
        onClick: async () => {
          const result = await requestHostPermissions(targets.map(t => t.origin), settings);
          if (result.granted) {
            toast("Host access granted for imported URLs.", "success");
          } else {
            toast("Some imported origins were not granted. Grant buttons will appear beside affected URLs.", "warning", 9000);
          }
          close(settings);
        }
      }, [iconNode("globe", { size: 14 }), " Grant access"])
    ]));

    document.body.appendChild(dialog);
    try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    unregisterOverlay = registerOverlay({
      id: "host-permission-dialog",
      root: dialog,
      close: () => {
        markHostPermissionsDenied(settings, targets.map(t => t.origin));
        close(settings);
      },
      closeOnOutside: false
    });
  });
}

/** Return a deep clone of settings with secret fields cleared.
 *
 *  The export and share-link paths both serialize the full settings object;
 *  without this scrub a CoinGecko demo key (or NASA APOD key) would land in
 *  any file the user emails to themselves or any link they paste in chat.
 *  We zero the field rather than delete it so the destination knows the
 *  field exists — they just need to fill it in again.
 */
function stripSecrets(s) {
  const c = cloneValue(s);
  if (c.crypto && typeof c.crypto === "object") c.crypto.apiKey = "";
  if (c.photo  && typeof c.photo  === "object") c.photo.nasaKey = "";
  // Encrypted vault is also a secret — pass-phrase-derived ciphertext
  // is useless on a destination device but exposes the salt + IV +
  // existence of a vault, none of which need to travel.
  if (c.security && typeof c.security === "object") {
    c.security = { encryptKeys: false, salt: null, iv: null, encryptedBlob: null };
  }
  return c;
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Hard cap on imported pomodoro custom-audio size. Mirrors the 200 KB
// upload cap in the settings UI but enforced on EVERY import path so a
// malicious or merely oversized JSON / share-link can't blow up storage.
// 200 KB binary → ~280 KB as a data: URI in base64.
const MAX_CUSTOM_AUDIO_DATA_URI_LEN = 290 * 1024;

export function normalizeImportedSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Import file must contain a Vantage settings object.");
  }
  // Per-widget clipboard exports use a `{vantageSettings: 1, partial: {...}}`
  // envelope; unwrap it before the merge so the section-checklist
  // partial-import dialog can compute diffs against it normally.
  let raw = value;
  if (raw.vantageSettings === 1 && raw.partial && typeof raw.partial === "object") {
    raw = raw.partial;
  }
  const merged = mergeSettings(getDefaults(), raw);
  if (Array.isArray(merged.quicklinks)) {
    merged.quicklinks = { enabled: true, items: merged.quicklinks, groups: [] };
  }
  if (merged.embed !== undefined) {
    if ((!merged.embeds || merged.embeds.length === 0) && merged.embed?.url) {
      merged.embeds = [{
        id: "1",
        title: merged.embed.title || "Embed",
        url: merged.embed.url,
        enabled: merged.embed.enabled ?? false
      }];
    }
    delete merged.embed;
  }
  // Strip oversized or suspiciously-shaped custom Pomodoro audio. The
  // settings-page uploader caps at 200 KB; imports must obey the same
  // bound. Failed validation falls back to the bell preset rather than
  // failing the whole import.
  const audio = merged.pomodoro?.alarm?.customAudio;
  if (typeof audio === "string" && audio.length > 0) {
    const tooLong = audio.length > MAX_CUSTOM_AUDIO_DATA_URI_LEN;
    const notDataUri = !audio.startsWith("data:");
    if (tooLong || notDataUri) {
      merged.pomodoro.alarm = {
        ...merged.pomodoro.alarm,
        tone: merged.pomodoro.alarm.tone === "custom" ? "bell" : merged.pomodoro.alarm.tone,
        customAudio: ""
      };
    }
  }
  // Re-run the search customUrl validator on imports — stored values
  // from older exports (or third-party-edited JSON) might fail the
  // post-Iter2 scheme check. Fall through to the default sentinel so
  // the user notices in Settings rather than silently re-saving a
  // dangerous URL.
  const cu = merged.search?.customUrl;
  if (typeof cu === "string" && cu.length > 0) {
    const v = validateCustomSearchUrl(cu);
    if (!v.ok) {
      merged.search.customUrl = getDefaults().search.customUrl;
    }
  }
  return merged;
}

function mergeSettings(base, incoming) {
  for (const [key, value] of Object.entries(incoming)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      base[key] = mergeSettings({ ...base[key] }, value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

/* ---- Ambient sounds --------------------------------------------------- */

function buildAmbientSection(settings, onChange) {
  const cfg = settings.ambient || {};
  const sec = section("Ambient sounds", "play");
  const g   = group();
  g.appendChild(row(
    "Show Ambient panel",
    "Five Web-Audio-synthesized soundscapes (rain, white / pink / brown noise, café). No shipped audio assets — all generated on the fly.",
    toggle({
      checked: cfg.enabled || false,
      ariaLabel: "Show ambient panel",
      onChange: (v) => { settings.ambient = { ...cfg, enabled: v }; onChange(settings); }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- To-Do ------------------------------------------------------------- */

function buildTodoSection(settings, onChange) {
  const cfg = settings.todo || {};
  const sec = section("To-Do List", "check-square");
  const g   = group();
  g.appendChild(row("Show to-do panel", "A personal task list that persists across sessions.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show to-do panel",
      onChange: (v) => { settings.todo = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  g.appendChild(row("Show completed tasks", "Keep done items visible (strikethrough) rather than hiding them.",
    toggle({ checked: cfg.showCompleted !== false, ariaLabel: "Show completed",
      onChange: (v) => { settings.todo = { ...cfg, showCompleted: v }; onChange(settings); } })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Notes ------------------------------------------------------------- */

function buildNotesSection(settings, onChange) {
  const cfg = settings.notes || {};
  const sec = section("Notes", "note");
  const g   = group();
  g.appendChild(row("Show notes panel", "Color-coded sticky notes stored in your browser.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show notes panel",
      onChange: (v) => { settings.notes = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Bookmarks --------------------------------------------------------- */

function buildBookmarksSection(settings, onChange) {
  const cfg = settings.bookmarks || {};
  const sec = section("Bookmarks", "bookmark");
  const g   = group();
  g.appendChild(row("Show bookmarks panel", "Tiles from your browser\u2019s bookmark library.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show bookmarks panel",
      onChange: (v) => { settings.bookmarks = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  const maxIn = el("input", {
    type: "number", min: "4", max: "100",
    value: String(cfg.maxItems ?? 24), class: "text-input number-input",
    "aria-label": "Max bookmarks",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 4) { settings.bookmarks = { ...cfg, maxItems: v }; onChange(settings); }
    }
  });
  g.appendChild(row("Max items", "Maximum number of bookmarks to display.", maxIn));
  sec.appendChild(g);
  return sec;
}

/* ---- Starred items ----------------------------------------------------- */

function buildStarredSection(settings, onChange) {
  const cfg = settings.starred || {};
  const sec = section("Starred items", "star");
  const g   = group();
  g.appendChild(row(
    "Show Starred panel",
    "Star a feed headline (★ icon on hover) to pin it here. All data stays in your browser.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show starred panel",
      onChange: (v) => { settings.starred = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  const maxIn = el("input", {
    type: "number", min: "10", max: "500",
    value: String(cfg.maxItems ?? 100), class: "text-input number-input",
    "aria-label": "Max starred items",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 10 && v <= 500) {
        settings.starred = { ...cfg, maxItems: v };
        onChange(settings);
      }
    }
  });
  g.appendChild(row("Max items", "Hard cap; oldest entries drop off when exceeded (10–500).", maxIn));

  const count = (cfg.items || []).length;
  g.appendChild(row(
    "Stored",
    `${count} item${count === 1 ? "" : "s"} starred.`,
    el("button", {
      type: "button", class: "button button--ghost",
      disabled: count === 0,
      onClick: () => {
        if (!cfg.items?.length) return;
        const removed = cfg.items.slice();
        settings.starred = { ...cfg, items: [] };
        onChange(settings);
        toastUndo(`Cleared ${removed.length} starred item${removed.length === 1 ? "" : "s"}.`, () => {
          settings.starred = { ...cfg, items: removed };
          onChange(settings);
        });
      }
    }, [iconNode("trash", { size: 14 }), " Clear all"])
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- World Clock ------------------------------------------------------- */

function buildWorldClockSection(settings, onChange) {
  const cfg = settings.worldclock || {};
  const sec = section("World Clocks", "globe");
  const g   = group();
  g.appendChild(row("Show world clocks", "A compact strip of clocks for multiple time zones, shown below the hero.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show world clocks",
      onChange: (v) => { settings.worldclock = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  sec.appendChild(g);

  const clocks = cfg.clocks || [];
  const listEl = el("ul", { class: "item-list" });

  function refreshClockList() {
    clear(listEl);
    if (!clocks.length) {
      listEl.appendChild(el("li", { class: "item-list__empty" }, ["No clocks yet."]));
      return;
    }
    clocks.forEach((clock, idx) => {
      const labelIn = el("input", { type: "text", class: "text-input", value: clock.label, placeholder: "Label",
        "aria-label": "Clock label",
        onChange: (e) => { clock.label = e.target.value; settings.worldclock = { ...cfg, clocks }; onChange(settings); }
      });
      const tzIn = el("input", { type: "text", class: "text-input", value: clock.tz, placeholder: "e.g. America/Chicago",
        "aria-label": "IANA timezone",
        onChange: (e) => { clock.tz = e.target.value; settings.worldclock = { ...cfg, clocks }; onChange(settings); }
      });
      const del = el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Remove clock",
        onClick: () => {
          const removed = cloneValue(clock);
          clocks.splice(idx, 1);
          settings.worldclock = { ...cfg, clocks };
          onChange(settings);
          refreshClockList();
          toastUndo(`Removed "${removed.label || "Clock"}".`, () => {
            insertAt(clocks, idx, removed);
            settings.worldclock = { ...cfg, clocks };
            onChange(settings);
            refreshClockList();
          });
        }
      }, [iconNode("trash", { size: 14 })]);
      listEl.appendChild(el("li", { class: "item-list__row" }, [
        el("div", { class: "item-list__row-content" }, [labelIn, tzIn]), del
      ]));
    });
  }
  refreshClockList();
  sec.appendChild(listEl);

  const addBtn = el("button", {
    type: "button", class: "button button--ghost",
    onClick: () => {
      clocks.push({ label: "New clock", tz: "UTC" });
      settings.worldclock = { ...cfg, clocks };
      onChange(settings);
      refreshClockList();
    }
  }, [iconNode("plus", { size: 14 }), " Add clock"]);
  sec.appendChild(addBtn);
  return sec;
}

/* ---- Crypto ------------------------------------------------------------ */

function buildCryptoSection(settings, onChange) {
  const cfg = settings.crypto || {};
  const sec = section("Crypto Prices", "trending-up");
  const g   = group();
  g.appendChild(row("Show crypto panel", "Live prices from CoinGecko. A free demo API key is recommended — without one, CoinGecko rate-limits aggressively.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show crypto panel",
      onChange: (v) => { settings.crypto = { ...cfg, enabled: v }; onChange(settings); } })
  ));

  const apiKeyIn = el("input", {
    type: "text", class: "text-input",
    value: cfg.apiKey || "",
    placeholder: "CG-XXXX… (optional but strongly recommended)",
    "aria-label": "CoinGecko demo API key",
    autocomplete: "off",
    spellcheck: false,
    onChange: (e) => { settings.crypto = { ...cfg, apiKey: e.target.value.trim() }; onChange(settings); }
  });
  g.appendChild(rowColumn(
    "Demo API key",
    apiKeyIn,
    "Sign up free at coingecko.com/en/api → My Account → Demo API key. Sent as the x-cg-demo-api-key header. Stored locally; never leaves your browser except to CoinGecko."
  ));

  const coinsIn = el("input", {
    type: "text", class: "text-input",
    value: (cfg.coins || ["bitcoin","ethereum","solana"]).join(", "),
    placeholder: "bitcoin, ethereum, solana",
    "aria-label": "CoinGecko coin IDs",
    onChange: (e) => {
      const coins = e.target.value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      settings.crypto = { ...cfg, coins };
      onChange(settings);
    }
  });
  g.appendChild(row("Coins", "Comma-separated CoinGecko IDs (e.g. bitcoin, ethereum, solana, dogecoin).", coinsIn));

  g.appendChild(row("Currency",
    "Display prices in this fiat currency.",
    segmented({
      ariaLabel: "Currency",
      value: cfg.currency || "usd",
      options: [{ value: "usd", label: "USD" }, { value: "eur", label: "EUR" }, { value: "gbp", label: "GBP" }],
      onChange: (v) => { settings.crypto = { ...cfg, currency: v }; onChange(settings); }
    })
  ));

  const refreshIn = el("input", {
    type: "number", min: "1", max: "60",
    value: String(cfg.refreshMinutes ?? 5), class: "text-input number-input",
    "aria-label": "Refresh interval minutes",
    onChange: (e) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 1) { settings.crypto = { ...cfg, refreshMinutes: v }; onChange(settings); }
    }
  });
  g.appendChild(row("Refresh (minutes)", "How often to poll for new prices.", refreshIn));
  sec.appendChild(g);
  return sec;
}

/* ---- GitHub ------------------------------------------------------------ */

function buildGithubSection(settings, onChange) {
  const cfg = settings.github || {};
  const sec = section("GitHub", "github");
  const g   = group();
  g.appendChild(row("Show GitHub panel", "Your public activity and trending repos from the GitHub API.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show GitHub panel",
      onChange: (v) => { settings.github = { ...cfg, enabled: v }; onChange(settings); } })
  ));

  const userIn = el("input", {
    type: "text", class: "text-input",
    value: cfg.username || "",
    placeholder: "your-github-username",
    "aria-label": "GitHub username",
    onChange: (e) => { settings.github = { ...cfg, username: e.target.value.trim() }; onChange(settings); }
  });
  g.appendChild(row("Username", "Your GitHub handle — used for the Activity tab. Leave blank to show only Trending.", userIn));

  g.appendChild(row("Show trending", "Show the Trending tab (top repos created in the last 7 days).",
    toggle({ checked: cfg.showTrending !== false, ariaLabel: "Show trending tab",
      onChange: (v) => { settings.github = { ...cfg, showTrending: v }; onChange(settings); } })
  ));

  const langIn = el("input", {
    type: "text", class: "text-input",
    value: cfg.language || "",
    placeholder: "e.g. typescript (leave blank for all)",
    "aria-label": "Filter trending by language",
    onChange: (e) => { settings.github = { ...cfg, language: e.target.value.trim() }; onChange(settings); }
  });
  g.appendChild(row("Trending language", "Filter trending repos to a specific programming language.", langIn));
  sec.appendChild(g);
  return sec;
}

/* ---- Quote ------------------------------------------------------------- */

function buildQuoteSection(settings, onChange) {
  const cfg = settings.quote || {};
  const sec = section("Quote of the Day", "message-square");
  const g   = group();
  g.appendChild(row("Show quote banner", "A daily quote shown between the hero and the reading panels.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show quote banner",
      onChange: (v) => { settings.quote = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  g.appendChild(row("Category",
    "Theme used when choosing from the bundled offline quote pack.",
    segmented({
      ariaLabel: "Quote category",
      value: cfg.category || "random",
      options: [
        { value: "random",        label: "Random" },
        { value: "inspirational", label: "Inspired" },
        { value: "technology",    label: "Tech" },
        { value: "life",          label: "Life" },
      ],
      onChange: (v) => { settings.quote = { ...cfg, category: v, cached: null }; onChange(settings); }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Photo ------------------------------------------------------------- */

function buildPhotoSection(settings, onChange) {
  const cfg = settings.photo || {};
  const sec = section("Photo of the Day", "image");
  const g   = group();
  g.appendChild(row("Show photo panel", "A daily photo panel — changes every day.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show photo panel",
      onChange: (v) => { settings.photo = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  g.appendChild(row("Source",
    "Picsum requires no configuration. NASA APOD shows astronomy imagery and is cached per day to protect DEMO_KEY rate limits.",
    segmented({
      ariaLabel: "Photo source",
      value: cfg.source || "picsum",
      options: [{ value: "picsum", label: "Picsum" }, { value: "nasa", label: "NASA APOD" }],
      onChange: (v) => { settings.photo = { ...cfg, source: v }; onChange(settings); }
    })
  ));
  if (cfg.source === "nasa") {
    const keyIn = el("input", {
      type: "text", class: "text-input",
      value: cfg.nasaKey || "",
      placeholder: "DEMO_KEY or your NASA API key",
      "aria-label": "NASA API key",
      onChange: (e) => { settings.photo = { ...cfg, nasaKey: e.target.value.trim() }; onChange(settings); }
    });
    g.appendChild(row("NASA API key", "Get a free key at api.nasa.gov — removes rate limits.", keyIn));
  }
  sec.appendChild(g);
  return sec;
}

/* ---- Countdown --------------------------------------------------------- */

function buildCountdownSection(settings, onChange) {
  const cfg = settings.countdown || {};
  const sec = section("Countdowns", "hourglass");
  const g   = group();
  g.appendChild(row("Show countdowns panel", "Count down (or up) to named dates — launches, vacations, deadlines.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show countdowns panel",
      onChange: (v) => { settings.countdown = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Converter --------------------------------------------------------- */

function buildConverterSection(settings, onChange) {
  const cfg = settings.converter || {};
  const sec = section("Unit Converter", "calculator");
  const g   = group();
  g.appendChild(row("Show converter panel", "Convert between length, weight, temperature, area, volume, speed, and data units.",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show converter panel",
      onChange: (v) => { settings.converter = { ...cfg, enabled: v }; onChange(settings); } })
  ));
  g.appendChild(row("Default category",
    "Which unit category to show first when the panel loads.",
    segmented({
      ariaLabel: "Default category",
      value: cfg.defaultCategory || "length",
      options: [
        { value: "length",      label: "Length" },
        { value: "weight",      label: "Weight" },
        { value: "temperature", label: "Temp" },
        { value: "speed",       label: "Speed" },
        { value: "data",        label: "Data" },
      ],
      onChange: (v) => { settings.converter = { ...cfg, defaultCategory: v }; onChange(settings); }
    })
  ));
  sec.appendChild(g);
  return sec;
}

/* ---- Custom CSS -------------------------------------------------------- */

function buildCustomCSSSection(settings, onChange) {
  const sec = section("Custom CSS", "code");
  const g   = group();
  const hint = el("p", { class: "settings-section__hint" }, [
    "Injected as a ",
    el("code", {}, ["<style>"]),
    " tag on every new tab. Use CSS custom properties (",
    el("code", {}, ["--accent"]),
    ", ",
    el("code", {}, ["--base"]),
    ", etc.) for theme-aware overrides."
  ]);
  g.appendChild(hint);
  const ta = el("textarea", {
    class: "text-input custom-css-input",
    placeholder: "/* e.g. .hero { gap: 2rem; } */",
    rows: "8",
    "aria-label": "Custom CSS",
    onInput: (e) => {
      settings.customCSS = e.target.value;
      // Live-apply so users see changes without saving
      let style = document.getElementById("vantage-custom-css");
      if (!style) {
        style = document.createElement("style");
        style.id = "vantage-custom-css";
        document.head.appendChild(style);
      }
      style.textContent = e.target.value;
      onChange(settings);
    }
  });
  ta.value = settings.customCSS || "";
  g.appendChild(ta);
  sec.appendChild(g);
  return sec;
}

/* ---- Reset ------------------------------------------------------------- */

/* ---- Typography (Local Font Access API) ------------------------------- */

function buildTypographySection(settings, onChange) {
  const sec = section("Typography", "code");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Pick fonts installed on your machine for body and display text. Uses the Local Font Access API (Chrome 103+, Edge 103+); no Google Fonts request, no network call. The browser asks for permission the first time you open the picker. Default = Vantage's built-in system stack."
  ]));

  const cfg = settings.appearance?.font || { body: "", display: "" };
  const g = group();

  // Manual text inputs always work — local-font picker is a power-user
  // upgrade on top.
  const bodyInput = el("input", {
    type: "text", class: "text-input",
    value: cfg.body || "",
    placeholder: "(default — system sans)",
    "aria-label": "Body font family"
  });
  bodyInput.addEventListener("change", () => {
    if (!settings.appearance) settings.appearance = {};
    settings.appearance.font = { ...cfg, body: bodyInput.value.trim() };
    applyFontPreference(settings.appearance.font);
    onChange(settings);
  });
  g.appendChild(row("Body font", "Used for paragraph text, list items, and most UI surfaces.", bodyInput));

  const displayInput = el("input", {
    type: "text", class: "text-input",
    value: cfg.display || "",
    placeholder: "(default — same as body)",
    "aria-label": "Display font family"
  });
  displayInput.addEventListener("change", () => {
    if (!settings.appearance) settings.appearance = {};
    settings.appearance.font = { ...cfg, display: displayInput.value.trim() };
    applyFontPreference(settings.appearance.font);
    onChange(settings);
  });
  g.appendChild(row("Display font", "Used for headings, the greeting hero, and large numerical displays.", displayInput));

  // Local Font Access picker — only present when the API is available.
  // Opens a dropdown listing all installed font families (deduped,
  // sorted) for one-click pick.
  if (typeof window?.queryLocalFonts === "function") {
    const pickBody = el("button", {
      type: "button", class: "button button--ghost",
      onClick: async () => {
        try {
          const { listFontFamilies } = await import("./utils/local-fonts.js");
          const fonts = await listFontFamilies();
          await pickFontDialog(fonts, "Pick body font", (chosen) => {
            bodyInput.value = chosen;
            bodyInput.dispatchEvent(new Event("change"));
          });
        } catch (err) {
          toast(`Couldn't read local fonts — ${err?.message?.toLowerCase() || "permission denied"}.`, "error");
        }
      }
    }, [iconNode("layout-grid", { size: 14 }), " Pick body font…"]);

    const pickDisplay = el("button", {
      type: "button", class: "button button--ghost",
      onClick: async () => {
        try {
          const { listFontFamilies } = await import("./utils/local-fonts.js");
          const fonts = await listFontFamilies();
          await pickFontDialog(fonts, "Pick display font", (chosen) => {
            displayInput.value = chosen;
            displayInput.dispatchEvent(new Event("change"));
          });
        } catch (err) {
          toast(`Couldn't read local fonts — ${err?.message?.toLowerCase() || "permission denied"}.`, "error");
        }
      }
    }, [iconNode("layout-grid", { size: 14 }), " Pick display font…"]);

    g.appendChild(row(
      "Local font picker",
      "Browse installed fonts. The browser will ask for permission the first time you click.",
      el("div", { class: "compose__row" }, [pickBody, pickDisplay])
    ));
  } else {
    g.appendChild(row(
      "Local font picker",
      "Local Font Access API isn't available in this browser. Type a family name above to override the default stack.",
      el("span", { class: "chip" }, ["Unavailable"])
    ));
  }

  // Reset button — clears both fields.
  g.appendChild(row(
    "Reset to default",
    "Clears both font selections; the built-in system stack reapplies.",
    el("button", {
      type: "button", class: "button button--ghost",
      onClick: () => {
        if (!settings.appearance) settings.appearance = {};
        settings.appearance.font = { body: "", display: "" };
        bodyInput.value = "";
        displayInput.value = "";
        applyFontPreference(settings.appearance.font);
        onChange(settings);
        toast("Fonts reset to default.", "success");
      }
    }, [iconNode("trash", { size: 14 }), " Reset"])
  ));

  sec.appendChild(g);
  return sec;
}

// Helper: lazy-import applyFontPreference and call it. Wrapped so the
// settings-section builder doesn't pay the import cost per render.
async function applyFontPreference(fontPref) {
  try {
    const { applyFontPreference: apply } = await import("./utils/local-fonts.js");
    apply(fontPref);
  } catch { /* ignore */ }
}

// Modal-ish font picker. Uses a native <dialog> with a search filter
// so users can find a font in 1500+ entries quickly. Closes on
// click-outside via closedby="any" + manual fallback.
function pickFontDialog(fonts, title, onPick) {
  return new Promise((resolve) => {
    const dialog = el("dialog", {
      class: "import-dialog font-picker-dialog",
      "aria-labelledby": "font-picker-title",
      closedby: "any"
    });
    let resolved = false;
    let unregisterOverlay = null;
    const close = () => {
      if (resolved) return;
      resolved = true;
      unregisterOverlay?.();
      unregisterOverlay = null;
      try { dialog.close(); } catch {}
      dialog.remove();
      resolve();
    };
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dialog.addEventListener("close", close);
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });

    const header = el("header", { class: "import-dialog__header" }, [
      el("h2", { id: "font-picker-title" }, [title])
    ]);
    const filter = el("input", {
      type: "search", class: "text-input",
      placeholder: `Filter ${fonts.length.toLocaleString()} fonts…`,
      "aria-label": "Filter fonts",
      style: { margin: "var(--s-3) var(--s-5)" }
    });

    const listHost = el("div", {
      class: "font-picker-list",
      role: "listbox",
      tabindex: "-1"
    });

    const renderList = () => {
      clear(listHost);
      const needle = filter.value.trim().toLowerCase();
      const matches = needle
        ? fonts.filter(f => f.toLowerCase().includes(needle))
        : fonts;
      const cap = 200; // perf cap — typical 1500+ fonts × searchable list
      for (const f of matches.slice(0, cap)) {
        listHost.appendChild(el("button", {
          type: "button",
          class: "font-picker-row",
          style: { fontFamily: `"${f.replace(/"/g, '\\"')}"` },
          onClick: () => { onPick(f); close(); }
        }, [f]));
      }
      if (matches.length > cap) {
        listHost.appendChild(el("p", { class: "settings-section__hint", style: { padding: "var(--s-2) var(--s-3)" } }, [
          `Showing first ${cap}; refine the filter to narrow results.`
        ]));
      }
      if (!matches.length) {
        listHost.appendChild(el("p", { class: "panel-empty" }, ["No matches."]));
      }
    };

    let debounceTimer = null;
    filter.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(renderList, 120);
    });

    dialog.appendChild(header);
    dialog.appendChild(filter);
    dialog.appendChild(listHost);
    document.body.appendChild(dialog);
    try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    unregisterOverlay = registerOverlay({
      id: "font-picker-dialog",
      root: dialog,
      close,
      closeOnOutside: false
    });
    renderList();
    requestAnimationFrame(() => filter.focus());
  });
}

function buildResetSection(onChange) {
  const sec = section("Reset", "alert");
  let confirmReset = false;
  let confirmTimer = null;
  const btn = el("button", {
    type: "button",
    class: "button button--danger button--block",
    onClick: async () => {
      if (!confirmReset) {
        confirmReset = true;
        btn.classList.add("button--confirming");
        clear(btn);
        btn.append(iconNode("alert", { size: 14 }), " Confirm reset");
        clearTimeout(confirmTimer);
        confirmTimer = setTimeout(() => {
          confirmReset = false;
          btn.classList.remove("button--confirming");
          clear(btn);
          btn.append(iconNode("trash", { size: 14 }), " Reset everything");
        }, 6000);
        toast("Click Confirm reset to erase feeds, links, location, and custom settings.", "warning", 6000);
        return;
      }
      clearTimeout(confirmTimer);
      const fresh = getDefaults();
      await saveSettings(fresh);
      onChange(fresh);
      document.getElementById("settings-toggle")?.setAttribute("aria-expanded", "false");
      const settingsPanel = document.getElementById("settings-panel");
      if (settingsPanel) closePanel(settingsPanel);
      toast("Settings reset to defaults.", "success");
    }
  }, [iconNode("trash", { size: 14 }), " Reset everything"]);
  sec.appendChild(btn);
  return sec;
}

// Manual cell placement dialog (v1.1.0+): allows users to set explicit
// grid row/col for a quicklink when itemsPerRow is a number (not "auto").
function openCellPlacementDialog(item, idx, settings, onChange, refreshList) {
  return new Promise((resolve) => {
    const cols = settings.quicklinks.itemsPerRow;
    const maxCols = typeof cols === "number" ? cols : 6;
    const dialog = el("dialog", {
      class: "import-dialog cell-placement-dialog",
      "aria-labelledby": "cell-placement-title",
      closedby: "any"
    });
    
    let resolved = false;
    let unregisterOverlay = null;
    const close = () => {
      if (resolved) return;
      resolved = true;
      unregisterOverlay?.();
      unregisterOverlay = null;
      try { dialog.close(); } catch {}
      dialog.remove();
      resolve();
    };
    
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dialog.addEventListener("close", close);
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });

    const header = el("header", { class: "import-dialog__header" }, [
      el("h2", { id: "cell-placement-title" }, [`Set grid position for "${item.title}"`])
    ]);

    const currentOverride = item.cellOverride || { row: 0, col: 0 };
    const rowInput = el("input", {
      type: "number",
      min: "0",
      step: "1",
      class: "text-input",
      value: String(currentOverride.row || 0),
      "aria-label": "Row (0-indexed)"
    });
    const colInput = el("input", {
      type: "number",
      min: "0",
      max: String(maxCols - 1),
      step: "1",
      class: "text-input",
      value: String(currentOverride.col || 0),
      "aria-label": "Column (0-indexed)"
    });

    const form = el("div", { class: "compose", style: { padding: "var(--s-4)" } }, [
      el("label", {}, [
        el("span", { style: { display: "block", marginBottom: "0.5rem" } }, ["Row (0-indexed)"]),
        rowInput
      ]),
      el("label", {}, [
        el("span", { style: { display: "block", marginBottom: "0.5rem" } }, [`Column (0-indexed, max ${maxCols - 1})`]),
        colInput
      ]),
      el("div", { class: "compose__row", style: { gap: "0.5rem", marginTop: "var(--s-3)" } }, [
        el("button", {
          type: "button",
          class: "button button--primary",
          onClick: () => {
            const row = Math.max(0, parseInt(rowInput.value, 10) || 0);
            const col = Math.max(0, Math.min(maxCols - 1, parseInt(colInput.value, 10) || 0));
            item.cellOverride = { row, col };
            onChange(settings);
            refreshList();
            toast(`Position set to row ${row}, col ${col}.`, "success");
            close();
          }
        }, ["Set position"]),
        el("button", {
          type: "button",
          class: "button button--ghost",
          onClick: () => {
            delete item.cellOverride;
            onChange(settings);
            refreshList();
            toast("Position cleared; link will flow normally.", "success");
            close();
          }
        }, ["Clear override"])
      ])
    ]);

    dialog.appendChild(header);
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    unregisterOverlay = registerOverlay({
      id: "cell-placement-dialog",
      root: dialog,
      close,
      closeOnOutside: false
    });
    requestAnimationFrame(() => rowInput.focus());
  });
}
