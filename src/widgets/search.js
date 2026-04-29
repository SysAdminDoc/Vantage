// Vantage v0.2.0 — hero search bar with custom engine picker

import { el, clear } from "../utils/dom.js";
import { iconNode } from "../icons.js";
import { SEARCH_ENGINES, buildSearchUrl } from "../search-engines.js";

export function renderSearch(mount, settings, onChange) {
  clear(mount);

  const input = el("input", {
    class: "search-input",
    type: "search",
    name: "q",
    placeholder: "Search the web",
    "aria-label": "Search query",
    autocomplete: "off",
    autocapitalize: "none",
    autocorrect: "off",
    spellcheck: false
  });

  const submit = el("button", {
    type: "submit",
    class: "search-submit",
    "aria-label": "Run search"
  }, [iconNode("arrow-right", { size: 18 })]);

  const kbd = el("kbd", { class: "search-kbd", "aria-hidden": "true" }, ["/"]);
  input.addEventListener("focus", () => { kbd.style.visibility = "hidden"; });
  input.addEventListener("blur",  () => { if (!input.value) kbd.style.visibility = ""; });

  const enginePicker = buildEnginePicker(settings, onChange, () => input.focus());

  const form = el("form", {
    class: "search-form",
    role: "search",
    onSubmit: (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      window.location.href = buildSearchUrl(settings.search.engine, q, settings.search.customUrl);
    }
  }, [enginePicker, input, kbd, submit]);

  mount.appendChild(form);

  // Autofocus shortly after mount so it doesn't fight panel transitions.
  requestAnimationFrame(() => input.focus());
}

function buildEnginePicker(settings, onChange, refocusInput) {
  const picker = el("div", { class: "engine-picker" });

  const trigger = el("button", {
    type: "button",
    class: "engine-picker__trigger",
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
    "aria-label": "Choose search engine"
  });

  const popover = el("div", {
    class: "engine-picker__popover",
    role: "listbox",
    hidden: true
  });

  const closePopover = () => {
    if (popover.hidden) return;
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outsideHandler, true);
    document.removeEventListener("keydown", keyHandler, true);
  };

  const outsideHandler = (e) => {
    if (!picker.contains(e.target)) closePopover();
  };

  const keyHandler = (e) => {
    if (e.key === "Escape") {
      closePopover();
      refocusInput?.();
    }
  };

  const openPopover = () => {
    if (!popover.hidden) return;
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", outsideHandler, true);
    document.addEventListener("keydown", keyHandler, true);
  };

  trigger.addEventListener("click", () => {
    popover.hidden ? openPopover() : closePopover();
  });

  // Build options once
  for (const [key, eng] of Object.entries(SEARCH_ENGINES)) {
    const initial = eng.name[0].toUpperCase();
    const opt = el("button", {
      type: "button",
      class: "engine-option",
      role: "option",
      "data-engine": key,
      "aria-selected": String(key === settings.search.engine),
      onClick: () => {
        settings.search.engine = key;
        onChange?.(settings);
        updateTrigger();
        for (const child of popover.children) {
          child.setAttribute("aria-selected", String(child.dataset.engine === key));
        }
        closePopover();
        refocusInput?.();
      }
    }, [
      el("span", { class: "engine-avatar", "aria-hidden": "true" }, [initial]),
      el("span", { class: "engine-option__name" }, [eng.name]),
      iconNode("check", { size: 14, className: "engine-option__check" })
    ]);
    popover.appendChild(opt);
  }

  function updateTrigger() {
    const eng = SEARCH_ENGINES[settings.search.engine] || SEARCH_ENGINES.google;
    const initial = eng.name[0].toUpperCase();
    clear(trigger);
    trigger.append(
      el("span", { class: "engine-avatar", "aria-hidden": "true" }, [initial]),
      el("span", { class: "engine-picker__name" }, [eng.name]),
      iconNode("chevron-down", { size: 14, className: "engine-picker__chevron" })
    );
  }
  updateTrigger();

  picker.append(trigger, popover);
  return picker;
}
