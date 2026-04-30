// Vantage v0.8.0 — settings panel built with primitives (toggle, segmented, icon-button).
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

  // Search / filter
  const searchWrap = el("div", { class: "settings-search-wrap" });
  const searchIn = el("input", {
    type: "search",
    class: "text-input settings-search",
    placeholder: "Filter sections…",
    "aria-label": "Filter settings sections",
    onInput: (e) => {
      const q = e.target.value.toLowerCase().trim();
      body.querySelectorAll(".settings-section").forEach(sec => {
        sec.style.display = (!q || sec.textContent.toLowerCase().includes(q)) ? "" : "none";
      });
    }
  });
  searchWrap.appendChild(searchIn);
  body.appendChild(searchWrap);

  body.appendChild(buildAppearance(settings, onChange));
  body.appendChild(buildBackground(settings, onChange));
  body.appendChild(buildGreeting(settings, onChange));
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
  body.appendChild(buildAirQualitySection(settings, onChange));
  body.appendChild(buildWindySection(settings, onChange));
  body.appendChild(buildEmbedsSection(settings, onChange));
  body.appendChild(buildCalendarSection(settings, onChange));
  body.appendChild(buildPomodoroSection(settings, onChange));
  body.appendChild(buildTodoSection(settings, onChange));
  body.appendChild(buildNotesSection(settings, onChange));
  body.appendChild(buildBookmarksSection(settings, onChange));
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
  body.appendChild(buildStorageQuotaSection(settings));
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

function section(title, iconName, { defaultOpen = false } = {}) {
  const key = `v-sec-${title.replace(/\W+/g, "")}`;
  const saved = sessionStorage.getItem(key);
  const isOpen = saved !== null ? saved === "1" : defaultOpen;

  const shell = el("section", {
    class: `settings-section${isOpen ? " settings-section--open" : ""}`
  });

  const titleEl = el("button", {
    type: "button",
    class: "settings-section__title",
    "aria-expanded": String(isOpen),
    onClick: () => {
      const nowOpen = !shell.classList.contains("settings-section--open");
      shell.classList.toggle("settings-section--open", nowOpen);
      titleEl.setAttribute("aria-expanded", String(nowOpen));
      sessionStorage.setItem(key, nowOpen ? "1" : "0");
    }
  }, [
    iconName ? iconNode(iconName, { size: 14 }) : null,
    el("span", { class: "settings-section__title-text" }, [title]),
    el("span", { class: "settings-section__chevron", "aria-hidden": "true" },
      [iconNode("chevron-down", { size: 14 })])
  ]);

  shell.appendChild(titleEl);

  const body = el("div", { class: "settings-section__body" });
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

  sec.appendChild(g);
  return sec;
}

/* ---- Background -------------------------------------------------------- */

function buildBackground(settings, onChange) {
  const sec = section("Background", "image");
  const bg  = settings.background || {};
  const g   = group();

  g.appendChild(row(
    "Show background",
    "Enables the background subsystem.",
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
      { value: "bing-daily",    label: "Bing Daily" },
    ],
    onChange: (v) => {
      settings.background.kind = v;
      onChange(settings);
      renderKindRows();
    }
  });
  g.appendChild(row("Style", null, kindSeg));
  sec.appendChild(g);

  // Dynamic sub-options container
  const kindHost = el("div", { class: "settings-bg-kind-host" });
  sec.appendChild(kindHost);

  function renderKindRows() {
    clear(kindHost);
    const kind = settings.background.kind || "animated";

    if (kind === "solid") {
      const inp = el("input", {
        type: "color", class: "color-input",
        value: settings.background.solid || "#1e1e2e",
        "aria-label": "Background color",
        onInput: (e) => { settings.background.solid = e.target.value; onChange(settings); }
      });
      kindHost.appendChild(row("Color", null, inp));
    }

    if (kind === "gradient") {
      const gd = settings.background.gradient || { from: "#1e1e2e", to: "#313244", angle: 135 };
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
    }

    if (kind === "image-url") {
      const inp = el("input", {
        type: "url", class: "text-input",
        placeholder: "https://…/wallpaper.jpg",
        value: settings.background.imageUrl || "",
        "aria-label": "Image URL",
        onChange: (e) => { settings.background.imageUrl = e.target.value.trim(); onChange(settings); }
      });
      kindHost.appendChild(rowColumn("Image URL", inp));
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
      kindHost.appendChild(row("Upload image", "Stored locally in your browser.", uploadBtn));
      if (settings.background.imageData) {
        const clearBtn = el("button", {
          type: "button", class: "button button--ghost",
          onClick: () => { settings.background.imageData = null; onChange(settings); renderKindRows(); }
        }, [iconNode("trash", { size: 14 }), " Clear image"]);
        kindHost.appendChild(row("", null, clearBtn));
      }
    }

    if (kind === "image-url" || kind === "image-upload" || kind === "bing-daily") {
      const blurIn = el("input", {
        type: "range", min: "0", max: "20", step: "1",
        value: String(settings.background.blur ?? 0),
        "aria-label": "Blur",
        onInput: (e) => { settings.background.blur = parseInt(e.target.value, 10); onChange(settings); }
      });
      const brightIn = el("input", {
        type: "range", min: "50", max: "150", step: "5",
        value: String(settings.background.brightness ?? 100),
        "aria-label": "Brightness",
        onInput: (e) => { settings.background.brightness = parseInt(e.target.value, 10); onChange(settings); }
      });
      kindHost.appendChild(row("Blur", "0–20 px", blurIn));
      kindHost.appendChild(row("Brightness", "50–150%", brightIn));
    }

    if (kind === "bing-daily") {
      const cache = settings.background.bingDailyCache;
      const hint = cache?.date
        ? `Cached from ${cache.date}. Refreshes daily.`
        : "Fetches from Bing on first load.";
      kindHost.appendChild(el("p", { class: "settings-section__hint" }, [hint]));
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
          settings.feedFilters.rules.splice(idx, 1);
          onChange(settings);
          refreshRules();
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

/* ---- Workspaces -------------------------------------------------------- */

function buildWorkspacesSection(settings, onChange) {
  const sec = section("Workspaces", "layers2");
  sec.appendChild(el("p", { class: "settings-section__hint" }, [
    "Named layout profiles — each can override accent, background, layout, quick links, and per-widget toggles."
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
        title: "Save current layout to this workspace",
        onClick: () => {
          const { captureSnapshot } = window._vantageWorkspaceHelpers || {};
          if (captureSnapshot) {
            ws.snapshot = captureSnapshot(settings);
            onChange(settings);
            toast(`Snapshot saved for "${ws.name}".`, "success");
          }
        }
      }, [iconNode("download", { size: 12 }), " Capture"]);
      const del = el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Remove workspace", title: "Remove",
        onClick: () => {
          settings.workspaces.list.splice(idx, 1);
          if (settings.workspaces.active === ws.id) settings.workspaces.active = null;
          onChange(settings);
          refreshWorkspaceList();
        }
      }, [iconNode("trash", { size: 14 })]);
      listEl.appendChild(el("div", { class: "workspace-item" }, [nameIn, captureBtn, del]));
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
  sec.appendChild(addBtn);
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
    "Optional — appears as “Good evening, Matthew”.",
    nameInput
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
  }, [iconNode("plus", { size: 14 }), " Add link"]);

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
  }, [iconNode("plus", { size: 14 }), " Add feed"]);

  sec.appendChild(el("div", { class: "compose" }, [
    titleInput,
    el("div", { class: "compose__row" }, [urlInput, addBtn])
  ]));

  // Reddit presets
  const REDDIT_PRESETS = [
    { title: "Reddit — All",           url: "https://www.reddit.com/r/all/.rss" },
    { title: "Reddit — Popular",       url: "https://www.reddit.com/r/popular/.rss" },
    { title: "Reddit — Technology",    url: "https://www.reddit.com/r/technology/.rss" },
    { title: "Reddit — World News",    url: "https://www.reddit.com/r/worldnews/.rss" },
    { title: "Reddit — Programming",   url: "https://www.reddit.com/r/programming/.rss" },
    { title: "Reddit — Science",       url: "https://www.reddit.com/r/science/.rss" },
  ];

  const presetWrap = el("details", { class: "feed-presets" }, [
    el("summary", { class: "feed-presets__toggle" }, ["Reddit presets"])
  ]);
  for (const p of REDDIT_PRESETS) {
    const already = cfg.feeds.some(f => f.url === p.url);
    const btn = el("button", {
      type: "button",
      class: `button button--ghost button--small${already ? " button--muted" : ""}`,
      disabled: already,
      onClick: () => {
        if (already) return;
        cfg.feeds.push({ title: p.title, url: p.url });
        onChange(settings);
        refreshList();
        toast(`${p.title} added.`, "success");
      }
    }, [already ? iconNode("check", { size: 12 }) : iconNode("plus", { size: 12 }), ` ${p.title}`]);
    presetWrap.appendChild(btn);
  }
  sec.appendChild(presetWrap);

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
    for (const embed of current) {
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
        onChange: (e) => {
          embed.url = e.target.value.trim();
          onChange(settings);
        }
      });
      const tog = toggle({
        checked: embed.enabled ?? false,
        ariaLabel: "Enable this embed",
        onChange: (v) => {
          embed.enabled = v;
          onChange(settings);
        }
      });
      const del = el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Remove embed", title: "Remove",
        onClick: () => {
          settings.embeds = settings.embeds.filter(e => e.id !== embed.id);
          onChange(settings);
          refreshList();
        }
      }, [iconNode("trash", { size: 14 })]);

      listEl.appendChild(el("div", { class: "embed-item" }, [
        el("div", { class: "embed-item__row" }, [
          tog,
          el("div", { class: "embed-item__inputs" }, [titleIn, urlIn]),
          del
        ])
      ]));
    }
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
    "Download all settings as a JSON file.",
    el("button", {
      type: "button", class: "button button--primary",
      onClick: () => {
        const json = JSON.stringify(settings, null, 2);
        triggerDownload(json, `vantage-settings-${isoDate()}.json`, "application/json");
        toast("Settings exported.", "success");
      }
    }, [iconNode("download", { size: 14 }), " Export JSON"])
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
    }, [iconNode("upload", { size: 14 }), " Import OPML"])
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
    }, [iconNode("share", { size: 14 }), " Copy share link"])
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
        onClick: () => { clocks.splice(idx, 1); settings.worldclock = { ...cfg, clocks }; onChange(settings); refreshClockList(); }
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
  g.appendChild(row("Show crypto panel", "Live prices from CoinGecko (no API key required).",
    toggle({ checked: cfg.enabled || false, ariaLabel: "Show crypto panel",
      onChange: (v) => { settings.crypto = { ...cfg, enabled: v }; onChange(settings); } })
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
    "Type of quotes to fetch from Quotable.",
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
    "Picsum requires no configuration. NASA APOD shows astronomy imagery (DEMO_KEY has rate limits).",
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
