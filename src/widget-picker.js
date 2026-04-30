// Vantage v0.7.0 — Quick widget picker: toggle any widget on/off from the new tab page.

import { el, clear, toggle, toast } from "./utils/dom.js";
import { iconNode } from "./icons.js";

const WIDGET_GROUPS = [
  {
    label: "Hero",
    items: [
      { key: "clock",      path: "clock.enabled",      icon: "clock",          label: "Clock" },
      { key: "greeting",   path: "greeting.enabled",   icon: "circle-check",   label: "Greeting" },
      { key: "quicklinks", path: "quicklinks.enabled",  icon: "link",           label: "Quick Links" },
      { key: "topsites",   path: "topsites.enabled",    icon: "star",           label: "Top Sites" },
      { key: "worldclock", path: "worldclock.enabled",  icon: "globe",          label: "World Clocks" },
      { key: "quote",      path: "quote.enabled",       icon: "message-square", label: "Quote of the Day" },
    ]
  },
  {
    label: "Status Bar",
    items: [
      { key: "weather",    path: "weather.enabled",     icon: "cloud",          label: "Weather" },
      { key: "airquality", path: "airquality.enabled",  icon: "alert",          label: "Air Quality" },
    ]
  },
  {
    label: "Timer",
    items: [
      { key: "pomodoro",   path: "pomodoro.enabled",    icon: "timer",          label: "Pomodoro" },
      { key: "countdown",  path: "countdown.enabled",   icon: "hourglass",      label: "Countdowns" },
    ]
  },
  {
    label: "Reading Panels",
    items: [
      { key: "news",       path: "news.enabled",        icon: "newspaper",      label: "News" },
      { key: "rss",        path: "rss.enabled",         icon: "rss",            label: "RSS / Reading List" },
      { key: "calendar",   path: "calendar.enabled",    icon: "calendar",       label: "Calendar" },
      { key: "windy",      path: "windy.enabled",       icon: "wind",           label: "Windy Radar" },
      { key: "background", path: "background.enabled",  icon: "image",          label: "Animated Background" },
    ]
  },
  {
    label: "Tools & Content",
    items: [
      { key: "todo",       path: "todo.enabled",        icon: "check-square",   label: "To-Do List" },
      { key: "notes",      path: "notes.enabled",       icon: "note",           label: "Notes" },
      { key: "bookmarks",  path: "bookmarks.enabled",   icon: "bookmark",       label: "Bookmarks" },
      { key: "crypto",     path: "crypto.enabled",      icon: "trending-up",    label: "Crypto Prices" },
      { key: "github",     path: "github.enabled",      icon: "github",         label: "GitHub" },
      { key: "photo",      path: "photo.enabled",       icon: "image",          label: "Photo of the Day" },
      { key: "converter",  path: "converter.enabled",   icon: "calculator",     label: "Unit Converter" },
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

  function open() {
    isOpen = true;
    rebuildPicker();
    pickerEl.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => pickerEl.classList.add("widget-picker--open"));
    setTimeout(() => pickerEl.querySelector(".widget-picker__inner")?.focus?.(), 50);
  }

  function close() {
    isOpen = false;
    pickerEl.classList.remove("widget-picker--open");
    toggleBtn.setAttribute("aria-expanded", "false");
    setTimeout(() => { pickerEl.hidden = true; }, 220);
    toggleBtn.focus({ preventScroll: true });
  }

  toggleBtn.addEventListener("click", () => isOpen ? close() : open());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });

  document.addEventListener("mousedown", (e) => {
    if (isOpen && !pickerEl.contains(e.target) && !toggleBtn.contains(e.target)) close();
  });

  function rebuildPicker() {
    clear(pickerEl);
    const settings = getSettings();

    const inner = el("div", { class: "widget-picker__inner", tabindex: "-1" });

    const pickerHeader = el("div", { class: "widget-picker__header" }, [
      el("span", { class: "widget-picker__title" }, ["Widgets"]),
      el("button", {
        type: "button",
        class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": "Close widget picker",
        onClick: close
      }, [iconNode("close", { size: 14 })])
    ]);
    inner.appendChild(pickerHeader);

    for (const group of WIDGET_GROUPS) {
      inner.appendChild(el("div", { class: "widget-picker__group-label" }, [group.label]));
      for (const item of group.items) {
        inner.appendChild(buildRow(item, settings, onSave, rebuildPicker));
      }
    }

    // Embeds section
    inner.appendChild(el("div", { class: "widget-picker__group-label" }, ["Embeds"]));

    const embeds = settings.embeds || [];
    if (embeds.length === 0) {
      inner.appendChild(el("p", { class: "widget-picker__empty-embeds" }, [
        "No embeds configured — add one below."
      ]));
    }
    for (const embed of embeds) {
      inner.appendChild(buildEmbedRow(embed, settings, onSave, rebuildPicker, openSettingsPanel));
    }

    inner.appendChild(buildAddEmbedRow(settings, onSave, rebuildPicker));

    pickerEl.appendChild(inner);
  }
}

function buildRow(item, settings, onSave, rebuildPicker) {
  const [section, prop] = item.path.split(".");
  const checked = settings[section]?.[prop] ?? false;

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
      el("span", { class: "widget-picker__row-label" }, [item.label])
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
      const next = { ...settings, embeds: settings.embeds.filter(e => e.id !== embed.id) };
      onSave(next);
      rebuildPicker();
    }
  }, [iconNode("trash", { size: 12 })]);

  return el("div", { class: "widget-picker__row" }, [
    el("div", { class: "widget-picker__row-left" }, [
      el("span", { class: "widget-picker__row-icon" }, [iconNode("plane", { size: 14 })]),
      el("span", { class: "widget-picker__row-label" }, [embed.title || "Untitled Embed"])
    ]),
    el("div", { class: "widget-picker__row-right" }, [editBtn, delBtn, tog])
  ]);
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
      onInput: (e) => { newTitle = e.target.value; }
    });
    const urlIn = el("input", {
      type: "url",
      class: "text-input",
      placeholder: "https://…",
      "aria-label": "Embed URL",
      onInput: (e) => { newUrl = e.target.value; }
    });
    const saveBtn = el("button", {
      type: "button",
      class: "button button--ghost button--small",
      onClick: () => {
        if (!newTitle.trim()) { toast("Enter a title.", "warning"); return; }
        const newEmbed = {
          id: String(Date.now()),
          title: newTitle.trim(),
          url: newUrl.trim(),
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
