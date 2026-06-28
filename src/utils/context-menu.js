// Vantage — right-click context menu for the new-tab surface.
//
// Bonjourr v22's most-cited UX win: right-click anywhere on the
// dashboard background → quick actions. Vantage's twist is that we
// keep it surface-local (background + hero non-interactive areas
// only); right-clicking on text, links, inputs, or controls falls
// through to the browser's native menu so users can copy/paste/spell-
// check normally.
//
// Design constraints:
//   - vanilla JS modules; no framework
//   - keyboard-accessible (Esc, ArrowUp/Down, Enter, Tab)
//   - theme-aware via the existing CSS tokens
//   - mobile/touch graceful: contextmenu doesn't fire from a tap, so
//     this never appears on touch-only devices

import { el, clear } from "./dom.js";
import { iconNode } from "../icons.js";
import { hasOpenOverlay, registerOverlay } from "./overlay-stack.js";

// Selectors for elements where the native browser context menu must win.
// Right-clicks ON these elements fall through unchanged so users keep
// their native copy / paste / spell-check / save-link-as flows.
//
// Class list reflects what's actually rendered (audited against
// onboarding.js + widget-picker.js + settings.js). If a new modal
// surface is added, add its root class here to preserve the policy.
const NATIVE_MENU_SELECTOR = [
  "input", "textarea", "select",
  "a", "button",
  "[contenteditable='true']",
  ".feed-item", ".panel", ".weather", ".airquality-mount",
  ".settings-panel", ".widget-picker", ".import-dialog",
  ".onboard-overlay", ".onboard-card",
  ".toast"
].join(",");

let activeMenu = null;

function closeMenu() {
  if (!activeMenu) return;
  const { node, cleanup } = activeMenu;
  cleanup();
  node.remove();
  activeMenu = null;
}

/**
 * Wire the contextmenu listener. Returns a teardown.
 *
 * @param {() => Array<{label: string, icon?: string, hint?: string, onSelect: () => void}>} actionsFn
 *   Called fresh on every open so the menu can reflect current state.
 *   Returning an empty array signals "feature disabled" — the listener
 *   then NO-OPs (does NOT preventDefault) so the browser's native menu
 *   wins on the dashboard surface.
 */
export function attachContextMenu(actionsFn) {
  const onContextMenu = (e) => {
    // Suppress on interactive elements — let the browser's menu win.
    if (e.target?.closest?.(NATIVE_MENU_SELECTOR)) return;
    // Suppress when any modal-ish surface is open.
    if (hasOpenOverlay() || document.querySelector(".onboard-overlay")) return;

    // Resolve actions FIRST so we can no-op cleanly when the feature is
    // disabled. Calling preventDefault() before this would suppress the
    // browser's native menu without offering a replacement — the
    // documented contract for `enabled: false` is "native menu wins".
    const actions = actionsFn();
    if (!Array.isArray(actions) || !actions.length) return;

    e.preventDefault();
    openMenu(e.clientX, e.clientY, actions);
  };

  document.addEventListener("contextmenu", onContextMenu);
  return () => {
    document.removeEventListener("contextmenu", onContextMenu);
    closeMenu();
  };
}

function openMenu(x, y, actions) {
  closeMenu();
  if (!Array.isArray(actions) || !actions.length) return;

  const menu = el("div", {
    class: "context-menu",
    role: "menu",
    tabindex: "-1",
    "aria-label": "Vantage actions"
  });

  const items = [];
  for (const action of actions) {
    if (action === "divider") {
      menu.appendChild(el("div", { class: "context-menu__divider", role: "separator" }));
      continue;
    }
    const disabled = !action.onSelect;
    const item = el("button", {
      type: "button",
      class: `context-menu__item${disabled ? " context-menu__item--disabled" : ""}`,
      role: "menuitem",
      tabindex: "-1",
      disabled: disabled || undefined,
      onClick: () => {
        if (disabled) return;
        const fn = action.onSelect;
        // Close BEFORE invoking so the action's own UI (toast, settings
        // panel, etc.) gets focus / paint without fighting the menu.
        // Async handlers (theme/accent/background cycle each await
        // saveSettings) need explicit rejection handling — sync try/catch
        // wouldn't catch a thrown Promise.
        closeMenu();
        try {
          const result = fn();
          if (result && typeof result.catch === "function") {
            result.catch((err) => console.warn("[Vantage] context-menu action failed", err));
          }
        } catch (err) {
          console.warn("[Vantage] context-menu action failed", err);
        }
      }
    }, [
      action.icon ? el("span", { class: "context-menu__icon", "aria-hidden": "true" }, [iconNode(action.icon, { size: 14 })]) : null,
      el("span", { class: "context-menu__label" }, [action.label]),
      action.hint ? el("span", { class: "context-menu__hint" }, [action.hint]) : null
    ]);
    items.push(item);
    menu.appendChild(item);
  }

  document.body.appendChild(menu);

  // Position after mount so we know the menu's measured size and can
  // flip when it would overflow the viewport.
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = (x + rect.width  > vw) ? Math.max(8, vw - rect.width  - 8) : x;
  const top  = (y + rect.height > vh) ? Math.max(8, vh - rect.height - 8) : y;
  menu.style.left = `${left}px`;
  menu.style.top  = `${top}px`;

  // Keyboard nav
  const focusItem = (idx) => {
    const safe = (idx + items.length) % items.length;
    items[safe]?.focus({ preventScroll: true });
  };

  const onKey = (e) => {
    const current = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(current < 0 ? 0 : current + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(current < 0 ? items.length - 1 : current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(items.length - 1);
    } else if (e.key === "Tab") {
      // Tab dismisses; let focus go where the browser sends it.
      closeMenu();
    }
  };

  // Defer listener attachment so the contextmenu event that opened us
  // doesn't immediately close us via its own pointerdown.
  requestAnimationFrame(() => {
    if (!document.body.contains(menu)) return;
    const unregisterOverlay = registerOverlay({
      id: "context-menu",
      root: menu,
      close: closeMenu
    });
    menu.addEventListener("keydown", onKey);
    items[0]?.focus({ preventScroll: true });
    if (activeMenu) activeMenu.unregisterOverlay = unregisterOverlay;
  });

  activeMenu = {
    node: menu,
    unregisterOverlay: null,
    cleanup: () => {
      activeMenu?.unregisterOverlay?.();
      menu.removeEventListener("keydown", onKey);
    }
  };
}
