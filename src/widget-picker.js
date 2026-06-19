// Vantage v0.8.0 — Quick widget picker: toggle any widget on/off from the new tab page.

import { el, clear, toggle, toast } from "./utils/dom.js";
import { iconNode } from "./icons.js";
import { registerOverlay } from "./utils/overlay-stack.js";
import { normalizeWebUrl } from "./utils/url-safety.js";

const WIDGET_GROUPS = [
  {
    label: "Hero",
    items: [
      { key: "clock",      path: "clock.enabled",      icon: "clock",          label: "Clock",            hint: "Time and date" },
      { key: "greeting",   path: "greeting.enabled",   icon: "circle-check",   label: "Greeting",         hint: "Personal welcome" },
      { key: "quicklinks", path: "quicklinks.enabled",  icon: "link",           label: "Quick Links",      hint: "Pinned shortcuts" },
      { key: "topsites",   path: "topsites.enabled",    icon: "star",           label: "Top Sites",        hint: "Frequent visits" },
      { key: "worldclock", path: "worldclock.enabled",  icon: "globe",          label: "World Clocks",     hint: "Saved time zones" },
      { key: "quote",      path: "quote.enabled",       icon: "message-square", label: "Quote of the Day", hint: "Daily reflection" },
    ]
  },
  {
    label: "Status Bar",
    items: [
      { key: "weather",    path: "weather.enabled",     icon: "cloud",          label: "Weather",     hint: "Local conditions" },
      { key: "airquality", path: "airquality.enabled",  icon: "alert",          label: "Air Quality", hint: "AQI and pollen" },
    ]
  },
  {
    label: "Timer",
    items: [
      { key: "pomodoro",   path: "pomodoro.enabled",    icon: "timer",          label: "Pomodoro",   hint: "Focus sessions" },
      { key: "countdown",  path: "countdown.enabled",   icon: "hourglass",      label: "Countdowns", hint: "Important dates" },
    ]
  },
  {
    label: "Reading Panels",
    items: [
      { key: "news",       path: "news.enabled",        icon: "newspaper",      label: "News",                hint: "Curated headlines" },
      { key: "rss",        path: "rss.enabled",         icon: "rss",            label: "RSS / Reading List",  hint: "Personal feeds" },
      { key: "calendar",   path: "calendar.enabled",    icon: "calendar",       label: "Calendar",            hint: "iCal agenda" },
      { key: "windy",      path: "windy.enabled",       icon: "wind",           label: "Windy Radar",         hint: "Weather map" },
      { key: "background", path: "background.enabled",  icon: "image",          label: "Animated Background", hint: "Live sky scene" },
      { key: "marine",     path: "marine.enabled",      icon: "wind",           label: "Marine Weather",      hint: "Waves and currents" },
      { key: "flood",      path: "flood.enabled",       icon: "layers",         label: "River Flood Risk",    hint: "Local river risk" },
      { key: "solarRadiation", path: "solarRadiation.enabled", icon: "sun",     label: "Solar Radiation",    hint: "UV and irradiance" },
    ]
  },
  {
    label: "Tools & Content",
    items: [
      { key: "todo",       path: "todo.enabled",          icon: "check-square", label: "To-Do List",      hint: "Task capture" },
      { key: "notes",      path: "notes.enabled",         icon: "note",         label: "Notes",           hint: "Scratch notes" },
      { key: "zenShelf",   path: "zenShelf.enabled",      icon: "note",         label: "Zen Shelf",       hint: "Visual stickers" },
      { key: "bookmarks",  path: "bookmarks.enabled",     icon: "bookmark",     label: "Bookmarks",       hint: "Browser bookmarks" },
      { key: "starred",    path: "starred.enabled",       icon: "star",         label: "Starred Items",   hint: "Pinned reads" },
      { key: "inbox",      path: "inbox.enabled",         icon: "bookmark",     label: "Inbox",           hint: "Read-later queue" },
      { key: "ambient",    path: "ambient.enabled",       icon: "play",         label: "Ambient Sounds",  hint: "Focus sound" },
      { key: "history",    path: "historySearch.enabled", icon: "clock",        label: "History Search",  hint: "Opt-in browser history" },
      { key: "crypto",     path: "crypto.enabled",        icon: "trending-up",  label: "Crypto Prices",   hint: "Market prices" },
      { key: "github",     path: "github.enabled",        icon: "github",       label: "GitHub",          hint: "Repository activity" },
      { key: "photo",      path: "photo.enabled",         icon: "image",        label: "Photo of the Day", hint: "NASA APOD" },
      { key: "converter",  path: "converter.enabled",     icon: "calculator",   label: "Unit Converter",  hint: "Quick conversions" },
    ]
  },
];

/**
 * Wire the widget picker button to open/close the picker popover.
 * @param {HTMLElement} toggleBtn
 * @param {HTMLElement} pickerEl
 * @param {() => object} getSettings — live settings getter
 * @param {(next: object) => void} onSave — save + remount callback
 * @param {() => void} openSettingsPanel — opens the full settings sidebar
 */
export function renderWidgetPicker(toggleBtn, pickerEl, getSettings, onSave, openSettingsPanel) {
  let isOpen = false;
  let closeTimer = null;
  let unregisterOverlay = null;

  function open() {
    clearTimeout(closeTimer);
    isOpen = true;
    rebuildPicker();
    pickerEl.classList.add("widget-picker--open");
    pickerEl.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
    pickerEl.setAttribute("aria-hidden", "false");
    setTimeout(() => pickerEl.querySelector(".widget-picker__inner")?.focus?.(), 50);
    unregisterOverlay?.();
    unregisterOverlay = registerOverlay({
      id: "widget-picker",
      root: pickerEl,
      trigger: toggleBtn,
      close: ({ reason }) => close({ restoreFocus: reason !== "outside" })
    });
  }

  function close({ restoreFocus = true, immediate = false } = {}) {
    unregisterOverlay?.();
    unregisterOverlay = null;
    isOpen = false;
    pickerEl.classList.remove("widget-picker--open");
    toggleBtn.setAttribute("aria-expanded", "false");
    pickerEl.setAttribute("aria-hidden", "true");
    if (immediate) {
      clearTimeout(closeTimer);
      pickerEl.hidden = true;
    } else {
      closeTimer = setTimeout(() => { pickerEl.hidden = true; }, 220);
    }
    if (restoreFocus) toggleBtn.focus({ preventScroll: true });
  }

  toggleBtn.addEventListener("click", () => isOpen ? close() : open());

  function rebuildPicker() {
    clear(pickerEl);
    const settings = getSettings();

    const inner = el("div", { class: "widget-picker__inner", tabindex: "-1" });

    const pickerHeader = el("div", { class: "widget-picker__header" }, [
      el("div", { class: "widget-picker__heading" }, [
        el("h2", { id: "widget-picker-title", class: "widget-picker__title" }, ["Widgets"]),
        el("p", { class: "widget-picker__subtitle" }, ["Toggle dashboard modules and add live embeds."])
      ]),
      el("button", {
        type: "button",
        class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Close widget picker",
        onClick: close
      }, [iconNode("close", { size: 14 })])
    ]);
    inner.appendChild(pickerHeader);

    for (const group of WIDGET_GROUPS) {
      inner.appendChild(buildGroupLabel(group.label, `${activeCountForGroup(group, settings)}/${group.items.length} on`));
      for (const item of group.items) {
        inner.appendChild(buildRow(item, settings, onSave, rebuildPicker));
      }
    }

    // Embeds section
    const embeds = settings.embeds || [];
    const activeEmbeds = embeds.filter(embed => embed.enabled).length;
    inner.appendChild(buildGroupLabel("Embeds", embeds.length ? `${activeEmbeds}/${embeds.length} on` : "0 custom"));
    if (embeds.length === 0) {
      inner.appendChild(el("p", { class: "widget-picker__empty-embeds" }, [
        "Add a trusted web page when it belongs beside your dashboard."
      ]));
    }
    for (const embed of embeds) {
      inner.appendChild(buildEmbedRow(embed, settings, onSave, rebuildPicker, () => {
        close({ restoreFocus: false, immediate: true });
        openSettingsPanel?.();
      }));
    }

    inner.appendChild(buildAddEmbedRow(settings, onSave, rebuildPicker));

    pickerEl.appendChild(inner);
  }
}

function buildGroupLabel(label, countText) {
  return el("div", { class: "widget-picker__group-label" }, [
    el("span", {}, [label]),
    countText ? el("span", { class: "widget-picker__group-count" }, [countText]) : null
  ]);
}

function activeCountForGroup(group, settings) {
  return group.items.reduce((count, item) => count + (getPathValue(settings, item.path) ? 1 : 0), 0);
}

function getPathValue(settings, path) {
  const [section, prop] = path.split(".");
  return settings[section]?.[prop] ?? false;
}

function buildRow(item, settings, onSave, rebuildPicker) {
  const [section, prop] = item.path.split(".");
  const checked = getPathValue(settings, item.path);

  const tog = toggle({
    checked,
    ariaLabel: `Toggle ${item.label}`,
    onChange: (val) => {
      const next = {
        ...settings,
        [section]: { ...(settings[section] || {}), [prop]: val }
      };
      onSave(next);
      rebuildPicker();
    }
  });

  return el("div", { class: "widget-picker__row" }, [
    el("div", { class: "widget-picker__row-left" }, [
      el("span", { class: "widget-picker__row-icon" }, [iconNode(item.icon, { size: 14 })]),
      el("span", { class: "widget-picker__row-text" }, [
        el("span", { class: "widget-picker__row-label" }, [item.label]),
        item.hint ? el("span", { class: "widget-picker__row-hint" }, [item.hint]) : null
      ])
    ]),
    tog
  ]);
}

function buildEmbedRow(embed, settings, onSave, rebuildPicker, openSettingsPanel) {
  const tog = toggle({
    checked: embed.enabled ?? false,
    ariaLabel: `Toggle ${embed.title || "Embed"}`,
    onChange: (val) => {
      const next = {
        ...settings,
        embeds: settings.embeds.map(e => e.id === embed.id ? { ...e, enabled: val } : e)
      };
      onSave(next);
      rebuildPicker();
    }
  });

  const editBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--tiny",
    title: "Configure in Settings",
    "aria-label": "Open settings for this embed",
    onClick: () => openSettingsPanel?.()
  }, [iconNode("settings", { size: 12 })]);

  const delBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--tiny",
    title: "Remove embed",
    "aria-label": "Remove this embed",
    onClick: () => {
      const idx = settings.embeds.findIndex(e => e.id === embed.id);
      const next = { ...settings, embeds: settings.embeds.filter(e => e.id !== embed.id) };
      onSave(next);
      rebuildPicker();
      toast(`Removed "${embed.title || "Embed"}".`, "warning", 6500, {
        label: "Undo",
        onClick: () => {
          const restored = [...(next.embeds || [])];
          restored.splice(Math.max(0, idx), 0, embed);
          onSave({ ...settings, embeds: restored });
          rebuildPicker();
        }
      });
    }
  }, [iconNode("trash", { size: 12 })]);

  return el("div", { class: "widget-picker__row" }, [
    el("div", { class: "widget-picker__row-left" }, [
      el("span", { class: "widget-picker__row-icon" }, [iconNode("plane", { size: 14 })]),
      el("span", { class: "widget-picker__row-text" }, [
        el("span", { class: "widget-picker__row-label" }, [embed.title || "Untitled Embed"]),
        el("span", { class: "widget-picker__row-hint" }, [embedHostLabel(embed.url)])
      ])
    ]),
    el("div", { class: "widget-picker__row-right" }, [editBtn, delBtn, tog])
  ]);
}

function embedHostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "Custom web embed";
  } catch {
    return "Custom web embed";
  }
}

function buildAddEmbedRow(settings, onSave, rebuildPicker) {
  let newTitle = "";
  let newUrl   = "";
  let formOpen = false;

  const container = el("div", { class: "widget-picker__add-embed" });

  function renderForm() {
    clear(container);
    if (!formOpen) {
      container.appendChild(el("button", {
        type: "button",
        class: "button button--ghost button--small button--block",
        onClick: () => { formOpen = true; renderForm(); }
      }, [iconNode("plus", { size: 14 }), " Add embed"]));
      return;
    }

    const titleIn = el("input", {
      type: "text",
      class: "text-input",
      placeholder: "Title (e.g. Flight Tracker)",
      "aria-label": "Embed title",
      onInput: (e) => {
        newTitle = e.target.value;
        e.target.removeAttribute("aria-invalid");
      }
    });
    const urlIn = el("input", {
      type: "url",
      class: "text-input",
      placeholder: "example.com/dashboard",
      "aria-label": "Embed URL",
      onInput: (e) => {
        newUrl = e.target.value;
        e.target.removeAttribute("aria-invalid");
      }
    });
    const saveBtn = el("button", {
      type: "button",
      class: "button button--ghost button--small",
      onClick: () => {
        if (!newTitle.trim()) {
          titleIn.setAttribute("aria-invalid", "true");
          titleIn.focus({ preventScroll: true });
          toast("Enter a title for the embed.", "warning");
          return;
        }
        if (!newUrl.trim()) {
          urlIn.setAttribute("aria-invalid", "true");
          urlIn.focus({ preventScroll: true });
          toast("Enter the embed URL.", "warning");
          return;
        }
        const normalizedUrl = normalizeWebUrl(newUrl, { assumeHttps: true });
        if (!normalizedUrl) {
          urlIn.setAttribute("aria-invalid", "true");
          urlIn.focus({ preventScroll: true });
          toast("Enter a valid web URL without a username or password.", "error");
          return;
        }
        const newEmbed = {
          id: String(Date.now()),
          title: newTitle.trim(),
          url: normalizedUrl,
          enabled: true
        };
        const next = { ...settings, embeds: [...(settings.embeds || []), newEmbed] };
        onSave(next);
        rebuildPicker();
      }
    }, ["Add"]);
    const cancelBtn = el("button", {
      type: "button",
      class: "button button--ghost button--small",
      onClick: () => { formOpen = false; renderForm(); }
    }, ["Cancel"]);

    container.appendChild(el("div", { class: "widget-picker__embed-form" }, [
      titleIn, urlIn,
      el("div", { class: "widget-picker__embed-form-btns" }, [saveBtn, cancelBtn])
    ]));
    requestAnimationFrame(() => titleIn.focus({ preventScroll: true }));
  }

  renderForm();
  return container;
}
