// Vantage v0.3.0 — hero search bar with custom engine picker.
// Picker supports full keyboard navigation: ↑/↓/Home/End/Enter/Esc plus type-ahead.

import { el, clear } from "../utils/dom.js";
import { iconNode } from "../icons.js";
import { SEARCH_ENGINES, buildSearchUrl } from "../search-engines.js";
import { registerOverlay } from "../utils/overlay-stack.js";

// The stock customUrl shipped in storage.js DEFAULTS — using it as a real
// destination is almost certainly accidental. Treat it as "not configured".
const CUSTOM_URL_SENTINEL = "https://example.com/search?q=%s";

/** Build the placeholder string for the search input from the active engine.
 *  Custom engines surface the host so users can verify which destination
 *  their typed query will hit (e.g. "Search kagi.com"). The default
 *  example.com sentinel is treated as unconfigured. */
function placeholderFor(engineKey, customUrl) {
  if (engineKey === "custom") {
    if (!customUrl || customUrl === CUSTOM_URL_SENTINEL || !customUrl.includes("%s")) {
      return "Set a custom search URL in settings";
    }
    try {
      const host = new URL(customUrl).hostname.replace(/^www\./, "");
      if (host && host !== "example.com") return `Search ${host}`;
    } catch { /* malformed customUrl — fall through */ }
    return "Search the web";
  }
  const engine = SEARCH_ENGINES[engineKey];
  if (!engine) return "Search the web";
  return `Search ${engine.name}`;
}

export function renderSearch(mount, settings, onChange) {
  clear(mount);

  const input = el("input", {
    class: "search-input",
    type: "search",
    name: "q",
    placeholder: placeholderFor(settings.search.engine, settings.search.customUrl),
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

  const enginePicker = buildEnginePicker(settings, onChange, () => input.focus(), () => {
    // Re-derive placeholder when the engine changes — keeps the input in sync
    // without a full re-mount.
    input.placeholder = placeholderFor(settings.search.engine, settings.search.customUrl);
  });

  // Per-query engine switch: Shift-modifier on Enter or submit-click
  // routes through a one-shot picker without changing the saved
  // default. SubmitEvent doesn't expose shiftKey at the spec level, so
  // we capture the modifier on the originating keydown / click and
  // stash it on a closure-local flag, ALWAYS cleared after submit so a
  // stale shift can't leak into a later plain Enter.
  let pendingAltSubmit = false;

  const form = el("form", {
    class: "search-form",
    role: "search",
    onSubmit: (e) => {
      e.preventDefault();
      const q = input.value.trim();
      const useAlt = pendingAltSubmit;
      pendingAltSubmit = false; // ALWAYS clear, even on early-return paths
      if (!q) return;
      if (useAlt) {
        openQuickPick(form, q, settings);
        return;
      }
      window.location.href = buildSearchUrl(settings.search.engine, q, settings.search.customUrl);
    }
  }, [enginePicker, input, kbd, submit]);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") pendingAltSubmit = e.shiftKey;
  });
  submit.addEventListener("click", (e) => {
    pendingAltSubmit = e.shiftKey;
  });

  mount.appendChild(form);

  // Focus on first new-tab paint, but do not steal focus from settings,
  // widget forms, or other active controls after a settings remount.
  requestAnimationFrame(() => {
    const settingsOpen = document.getElementById("settings-panel")?.dataset.open === "true";
    const pickerOpen = document.getElementById("widget-picker")?.hidden === false;
    const canAutofocus = document.activeElement === document.body && !settingsOpen && !pickerOpen;
    if (canAutofocus) input.focus();
  });
}

// Quick-pick popover: pick a one-shot engine for the current query
// without changing the saved default. Anchored under the search form.
// Closes on Esc, outside click, or after pick.
function openQuickPick(form, query, settings) {
  // Tear down any open instance.
  document.querySelector(".quickpick")?.remove();

  const popover = el("div", {
    class: "quickpick",
    role: "dialog",
    "aria-label": "Search this query with"
  });

  popover.appendChild(el("div", { class: "quickpick__title" }, [`Search "${query}" with…`]));

  const list = el("div", { class: "quickpick__list", role: "listbox" });
  const items = [];
  const allKeys = Object.keys(SEARCH_ENGINES);
  // Default sentinel is the placeholder shipped in storage.js DEFAULTS;
  // a fresh / unconfigured Vantage install would otherwise list
  // 'Custom (example.com)' as a real one-shot destination.
  const SENTINEL_CUSTOM = "https://example.com/search?q=%s";
  for (const key of allKeys) {
    if (key === settings.search.engine) continue;
    if (key === "custom") {
      const cu = settings.search.customUrl;
      if (!cu || cu === SENTINEL_CUSTOM || !cu.includes("%s")) continue;
    }
    const eng = SEARCH_ENGINES[key];
    const label = key === "custom"
      ? `Custom (${(() => { try { return new URL(settings.search.customUrl).hostname.replace(/^www\./, ""); } catch { return "url"; } })()})`
      : eng.name;
    const btn = el("button", {
      type: "button",
      class: "quickpick__item",
      role: "option",
      "data-engine": key,
      tabindex: "-1",
      onClick: () => {
        const url = buildSearchUrl(key, query, settings.search.customUrl);
        close();
        window.location.href = url;
      }
    }, [
      el("span", { class: "engine-avatar", "aria-hidden": "true" }, [(label[0] || "?").toUpperCase()]),
      el("span", {}, [label])
    ]);
    items.push(btn);
    list.appendChild(btn);
  }
  popover.appendChild(list);
  popover.appendChild(el("div", { class: "quickpick__hint" }, ["Esc to cancel · default engine unchanged"]));

  form.appendChild(popover);

  let unregisterOverlay = null;
  function close({ restoreFocus = false } = {}) {
    unregisterOverlay?.();
    unregisterOverlay = null;
    popover.removeEventListener("keydown", onKey);
    popover.remove();
    if (restoreFocus) form.querySelector(".search-input")?.focus();
  }
  function onKey(e) {
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1 + items.length) % items.length]?.focus(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); return; }
    if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); return; }
    if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); return; }
  }
  requestAnimationFrame(() => {
    popover.addEventListener("keydown", onKey);
    unregisterOverlay = registerOverlay({
      id: "search-quickpick",
      root: popover,
      close: ({ reason }) => close({ restoreFocus: reason === "escape" })
    });
    items[0]?.focus({ preventScroll: true });
  });
}

function buildEnginePicker(settings, onChange, refocusInput, onEngineChange) {
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
    tabindex: "-1",
    hidden: true
  });

  // Type-ahead state
  let typeAheadBuffer = "";
  let typeAheadTimer = null;
  let unregisterOverlay = null;

  const closePopover = ({ restoreFocus = false } = {}) => {
    if (popover.hidden) return;
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    unregisterOverlay?.();
    unregisterOverlay = null;
    if (restoreFocus) trigger.focus({ preventScroll: true });
  };

  const openPopover = ({ focusFirst = false, focusLast = false } = {}) => {
    if (!popover.hidden) return;
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    unregisterOverlay?.();
    unregisterOverlay = registerOverlay({
      id: "engine-picker",
      root: picker,
      close: ({ reason }) => closePopover({ restoreFocus: reason === "escape" })
    });
    requestAnimationFrame(() => {
      const opts = popover.querySelectorAll(".engine-option");
      if (focusFirst) opts[0]?.focus();
      else if (focusLast) opts[opts.length - 1]?.focus();
      else {
        // Focus the currently-selected option if visible, else first.
        const selected = popover.querySelector('.engine-option[aria-selected="true"]') || opts[0];
        selected?.focus();
      }
    });
  };

  trigger.addEventListener("click", () => {
    popover.hidden ? openPopover() : closePopover();
  });

  trigger.addEventListener("keydown", (e) => {
    if (popover.hidden) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPopover({ focusFirst: true });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        openPopover({ focusLast: true });
      }
    }
  });

  const selectEngine = (key) => {
    settings.search.engine = key;
    onChange?.(settings);
    updateTrigger();
    for (const child of popover.children) {
      child.setAttribute("aria-selected", String(child.dataset.engine === key));
    }
    closePopover();
    onEngineChange?.(key);
    refocusInput?.();
  };

  // Build options once.
  const allKeys = Object.keys(SEARCH_ENGINES);
  for (const key of allKeys) {
    const eng = SEARCH_ENGINES[key];
    const initial = eng.name[0].toUpperCase();
    const opt = el("button", {
      type: "button",
      class: "engine-option",
      role: "option",
      "data-engine": key,
      "data-name": eng.name.toLowerCase(),
      tabindex: "-1",
      "aria-selected": String(key === settings.search.engine),
      onClick: () => selectEngine(key)
    }, [
      el("span", { class: "engine-avatar", "aria-hidden": "true" }, [initial]),
      el("span", { class: "engine-option__name" }, [eng.name]),
      iconNode("check", { size: 14, className: "engine-option__check" })
    ]);
    popover.appendChild(opt);
  }

  popover.addEventListener("keydown", (e) => {
    const opts = [...popover.querySelectorAll(".engine-option")];
    if (!opts.length) return;
    const activeIdx = opts.indexOf(document.activeElement);

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = activeIdx < opts.length - 1 ? activeIdx + 1 : 0;
        opts[next].focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = activeIdx > 0 ? activeIdx - 1 : opts.length - 1;
        opts[prev].focus();
        break;
      }
      case "Home":
        e.preventDefault();
        opts[0].focus();
        break;
      case "End":
        e.preventDefault();
        opts[opts.length - 1].focus();
        break;
      case "Escape":
        e.preventDefault();
        closePopover({ restoreFocus: true });
        break;
      case "Tab":
        // Tab leaves the popover; close it and let the focus go where it goes.
        closePopover();
        break;
      case "Enter":
      case " ": {
        // Default click behavior on the focused button — but ensure it fires.
        e.preventDefault();
        const focused = opts[activeIdx];
        if (focused) focused.click();
        break;
      }
      default:
        // Type-ahead: single printable characters
        if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
          typeAheadBuffer += e.key.toLowerCase();
          clearTimeout(typeAheadTimer);
          typeAheadTimer = setTimeout(() => { typeAheadBuffer = ""; }, 600);
          // Find first option whose name starts with the buffer (after current focus).
          const startIdx = activeIdx >= 0 ? activeIdx : 0;
          const ordered = [...opts.slice(startIdx + 1), ...opts.slice(0, startIdx + 1)];
          let match = ordered.find((o) => o.dataset.name.toLowerCase().startsWith(typeAheadBuffer));
          if (!match && typeAheadBuffer.length === 1) {
            match = ordered.find((o) => o.dataset.name.toLowerCase().startsWith(typeAheadBuffer));
          }
          if (match) {
            e.preventDefault();
            match.focus();
          }
        }
        break;
    }
  });

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
