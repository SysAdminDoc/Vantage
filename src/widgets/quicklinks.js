// Vantage v0.8.0 → v1.0.0 — quick-link pills + folder groups with drag-to-reorder + favicon caching.
// Vantage v1.2.0 — Tab Groups quick-link support (Chrome 88+)

import { el, clear, hostnameLabel } from "../utils/dom.js";
import { makeReorderable, arrayMove } from "../utils/drag.js";
import { iconNode } from "../icons.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";
import { SUPPORTS_TAB_GROUPS, activateTabGroup, getColorClass } from "../utils/tab-groups.js";
import { registerOverlay } from "../utils/overlay-stack.js";
import { normalizeWebUrl } from "../utils/url-safety.js";
import { i18n } from "../utils/i18n.js";

export function renderQuickLinks(mount, settings, { onChange } = {}) {
  clear(mount);
  const cfg = settings.quicklinks;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    mount.removeAttribute("data-cols");
    mount.removeAttribute("data-icon-radius");
    return;
  }
  mount.style.display = "";

  // Items-per-row: drives a CSS grid via [data-cols=N] when explicit. Auto
  // falls back to the historic flex-wrap centered layout.
  const cols = cfg.itemsPerRow;
  if (cols === "auto" || cols == null) {
    mount.removeAttribute("data-cols");
  } else {
    mount.setAttribute("data-cols", String(cols));
  }

  // Icon roundness: applies via [data-icon-radius] CSS variable
  if (cfg.iconRadius && cfg.iconRadius !== "rounded") {
    mount.setAttribute("data-icon-radius", cfg.iconRadius);
  } else {
    mount.removeAttribute("data-icon-radius");
  }

  // Flat pills — favicons loaded via caching system (v1.0.0+)
  // Tab Groups (v1.2.0+) are rendered as folder-like buttons with color indicators
  if (!cfg.items?.length && !cfg.groups?.length) {
    mount.appendChild(buildAddLinkButton({ empty: true }));
    return;
  }

  const renderedItems = [];
  const pills = [];
  (cfg.items || []).forEach((item, sourceIndex) => {
    // Tab Group item (v1.2.0): pinned Tab Group from chrome.tabGroups
    if (item.groupId && SUPPORTS_TAB_GROUPS) {
      const btn = el("button", {
        type: "button",
        class: `quicklink quicklink--tab-group ${getColorClass(item.groupColor)}`,
        title: i18n("activateDragToReorder", [item.title], "Activate: $1\nDrag to reorder"),
        "aria-label": i18n("tabGroupAria", [item.title], "Tab Group: $1"),
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          activateTabGroup(item.groupId);
        }
      }, [
        el("span", { class: "quicklink__tab-group-icon", "aria-hidden": "true" }, [
          iconNode("folder", { size: 14 })
        ]),
        el("span", { class: "quicklink__label" }, [item.title])
      ]);

      if (item.cellOverride && typeof cols === "number") {
        const { row, col } = item.cellOverride;
        if (typeof row === "number" && typeof col === "number") {
          btn.style.gridRow = String(row + 1);
          btn.style.gridColumn = String(col + 1);
        }
      }

      btn.addEventListener("dragstart", () => btn.classList.add("quicklink--dragging-self"));
      renderedItems.push({ sourceIndex, node: btn });
      pills.push(btn);
      return;
    }

    const safeUrl = normalizeWebUrl(item.url);
    if (!safeUrl) return;
    const title = item.title || item.label || hostnameLabel(safeUrl);

    // Regular URL item
    const fallbackGlyph = (title || "?").trim().slice(0, 1).toUpperCase() || "?";
    const fallbackIcon = el("span", {
      class: "quicklink__fallback",
      "aria-hidden": "true",
      "data-initial": fallbackGlyph
    });
    const link = el("a", {
      class: "quicklink",
      href: safeUrl,
      title: i18n("quicklinkTitleWithHost", [title, hostnameLabel(safeUrl)], "$1 - $2\nDrag to reorder"),
      "aria-label": i18n("quicklinkAriaWithHost", [title, hostnameLabel(safeUrl)], "$1 ($2)")
    }, [
      el("img", {
        class: "quicklink__favicon",
        src: "", // Will be populated async
        alt: "",
        loading: "lazy",
        hidden: true,
        referrerpolicy: "no-referrer",
        onError: (e) => {
          e.target.hidden = true;
          fallbackIcon.hidden = false;
        }
      }),
      fallbackIcon,
      el("span", { class: "quicklink__label" }, [title])
    ]);

    // Manual cell placement override (v1.1.0+): if cellOverride is set,
    // use explicit grid positioning (row/col) instead of flex-wrap.
    // Requires itemsPerRow to be a number (not "auto").
    if (item.cellOverride && typeof cols === "number") {
      const { row, col } = item.cellOverride;
      if (typeof row === "number" && typeof col === "number") {
        // grid-row and grid-column are 1-indexed in CSS.
        link.style.gridRow = String(row + 1);
        link.style.gridColumn = String(col + 1);
      }
    }

    // Populate favicon asynchronously (cache hit = instant, miss = fallback)
    const imgEl = link.querySelector("img");
    getFaviconUrl(safeUrl).then(dataUrl => {
      if (dataUrl) {
        imgEl.src = dataUrl;
        imgEl.hidden = false;
        fallbackIcon.hidden = true;
      } else {
        // No favicon available; show text label letter icon
        imgEl.hidden = true;
        fallbackIcon.hidden = false;
      }
    }).catch(() => {
      imgEl.hidden = true;
      fallbackIcon.hidden = false;
    });

    link.addEventListener("dragstart", () => link.classList.add("quicklink--dragging-self"));
    renderedItems.push({ sourceIndex, node: link });
    pills.push(link);
  });

  pills.forEach((p) => mount.appendChild(p));

  makeReorderable({
    items: pills,
    onReorder: (from, to) => {
      const sourceFrom = renderedItems[from]?.sourceIndex;
      const sourceTo = renderedItems[to]?.sourceIndex;
      if (sourceFrom == null || sourceTo == null) return;
      cfg.items = arrayMove(cfg.items, sourceFrom, sourceTo);
      onChange?.(settings);
    }
  });

  // Group folder buttons
  for (const group of (cfg.groups || [])) {
    mount.appendChild(buildGroupButton(group, mount));
  }
  mount.appendChild(buildAddLinkButton());
}

function buildGroupButton(group, mount) {
  const menuId = `ql-group-${group.id || group.name.replace(/\W+/g, "-").toLowerCase()}-${Math.random().toString(36).slice(2)}`;
  const wrap = el("span", { class: "quicklink-group" });
  const btn = el("button", {
    type: "button",
    class: "quicklink quicklink--group",
    "aria-haspopup": "menu",
    "aria-controls": menuId,
    "aria-expanded": "false",
    title: group.name
  }, [
    el("span", { class: "quicklink__folder-icon", "aria-hidden": "true" }, [iconNode("folder", { size: 14 })]),
    el("span", { class: "quicklink__label" }, [group.name])
  ]);

  let popover = null;
  let closeTimer = null;
  let unregisterOverlay = null;
  wrap.appendChild(btn);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popover) {
      closePopover();
      return;
    }
    openPopover();
  });

  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openPopover({ focus: e.key === "ArrowUp" ? "last" : "first" });
    }
  });

  // Clean up listeners when mount is cleared by observing DOM removal
  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrap)) {
      removeDocumentListeners();
      observer.disconnect();
    }
  });
  observer.observe(mount, { childList: true });

  function openPopover({ focus = null } = {}) {
    if (popover) {
      clearTimeout(closeTimer);
      btn.setAttribute("aria-expanded", "true");
      popover.classList.add("ql-group-popover--open");
      registerPopoverOverlay();
      focusMenuItem(focus);
      return;
    }
    clearTimeout(closeTimer);
    btn.setAttribute("aria-expanded", "true");
    popover = el("div", {
      id: menuId,
      class: "ql-group-popover",
      role: "menu",
      tabindex: "-1",
      "aria-label": i18n("groupLinksAria", [group.name], "$1 links")
    });

    const safeItems = (group.items || [])
      .map(item => ({ ...item, url: normalizeWebUrl(item.url), title: item.title || item.label || "" }))
      .filter(item => item.url);

    for (const item of safeItems) {
      const a = el("a", {
        class: "ql-group-item",
        href: item.url,
        target: "_blank",
        rel: "noopener noreferrer",
        role: "menuitem"
      }, [
        el("img", {
          class: "ql-group-item__favicon",
          src: "", // Will be populated async
          alt: "",
          loading: "lazy",
          referrerpolicy: "no-referrer",
          onError: (e) => { e.target.style.display = "none"; }
        }),
        el("span", {}, [item.title])
      ]);

      // Populate favicon asynchronously
      const imgEl = a.querySelector("img");
      getFaviconUrl(item.url).then(dataUrl => {
        if (dataUrl) {
          imgEl.src = dataUrl;
        } else {
          imgEl.style.display = "none";
        }
      }).catch(() => {
        imgEl.style.display = "none";
      });

      a.addEventListener("click", () => closePopover());
      a.addEventListener("keydown", onMenuKeydown);
      popover.appendChild(a);
    }

    if (!safeItems.length) {
      popover.appendChild(el("p", { class: "ql-group-empty" }, [i18n("quicklinkGroupEmpty", null, "No links in this group.")]));
    }

    wrap.appendChild(popover);
    registerPopoverOverlay();
    requestAnimationFrame(() => {
      popover?.classList.add("ql-group-popover--open");
      focusMenuItem(focus);
    });
  }

  function closePopover() {
    if (!popover) return;
    btn.setAttribute("aria-expanded", "false");
    removeDocumentListeners();
    popover.classList.remove("ql-group-popover--open");
    closeTimer = setTimeout(() => { popover?.remove(); popover = null; }, 200);
  }

  function focusMenuItem(position) {
    if (!position || !popover) return;
    const items = [...popover.querySelectorAll(".ql-group-item")];
    if (!items.length) {
      popover.focus({ preventScroll: true });
      return;
    }
    const target = position === "last" ? items[items.length - 1] : items[0];
    target.focus({ preventScroll: true });
  }

  function onMenuKeydown(e) {
    const items = [...popover.querySelectorAll(".ql-group-item")];
    const current = items.indexOf(document.activeElement);
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[current < items.length - 1 ? current + 1 : 0].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[current > 0 ? current - 1 : items.length - 1].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePopover();
      btn.focus({ preventScroll: true });
    } else if (e.key === "Tab") {
      closePopover();
    }
  }

  function removeDocumentListeners() {
    unregisterOverlay?.();
    unregisterOverlay = null;
  }

  function registerPopoverOverlay() {
    unregisterOverlay?.();
    unregisterOverlay = registerOverlay({
      id: "quicklink-group",
      root: wrap,
      close: ({ reason }) => {
        closePopover();
        if (reason === "escape") btn.focus({ preventScroll: true });
      }
    });
  }

  return wrap;
}

function buildAddLinkButton({ empty = false } = {}) {
  return el("button", {
    type: "button",
    class: `quicklink-add${empty ? " quicklink-add--empty" : ""}`,
    onClick: () => window.dispatchEvent(new CustomEvent("vantage:open-settings-filter", {
      detail: { query: "Quick links" }
    }))
  }, [
    iconNode("plus", { size: 14 }),
    empty ? i18n("addFirstLink", null, "Add your first link") : i18n("addLink", null, "Add link")
  ]);
}

// Favicon loading moved to favicon-cache.js for shared use by all widgets
// and to implement caching + fallback system (v1.0.0+ reliability)
