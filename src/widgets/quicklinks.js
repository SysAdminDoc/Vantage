// Vantage v0.8.0 → v1.0.0 — quick-link pills + folder groups with drag-to-reorder + favicon caching.
// Vantage v1.2.0 — Tab Groups quick-link support (Chrome 88+)

import { el, clear, hostnameLabel } from "../utils/dom.js";
import { makeReorderable, arrayMove } from "../utils/drag.js";
import { iconNode } from "../icons.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";
import { SUPPORTS_TAB_GROUPS, activateTabGroup, getColorClass } from "../utils/tab-groups.js";

export function renderQuickLinks(mount, settings, { onChange } = {}) {
  clear(mount);
  const cfg = settings.quicklinks;
  if (!cfg?.enabled || (!cfg.items?.length && !cfg.groups?.length)) {
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
  const pills = (cfg.items || []).map((item) => {
    // Tab Group item (v1.2.0): pinned Tab Group from chrome.tabGroups
    if (item.groupId && SUPPORTS_TAB_GROUPS) {
      const btn = el("button", {
        type: "button",
        class: `quicklink quicklink--tab-group ${getColorClass(item.groupColor)}`,
        title: `Activate: ${item.title}\nDrag to reorder`,
        "aria-label": `Tab Group: ${item.title}`,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          activateTabGroup(item.groupId);
        }
      }, [
        el("span", { class: "quicklink__tab-group-icon", "aria-hidden": "true" }, [
          iconNode("folder", { size: 14 })
        ]),
        el("span", {}, [item.title])
      ]);
      
      if (item.cellOverride && typeof cols === "number") {
        const { row, col } = item.cellOverride;
        if (typeof row === "number" && typeof col === "number") {
          btn.style.gridRow = String(row + 1);
          btn.style.gridColumn = String(col + 1);
        }
      }
      
      btn.addEventListener("dragstart", () => btn.classList.add("quicklink--dragging-self"));
      return btn;
    }
    
    // Regular URL item
    const link = el("a", {
      class: "quicklink",
      href: item.url,
      title: `${item.title} — ${hostnameLabel(item.url)}\nDrag to reorder`,
      "aria-label": `${item.title} (${hostnameLabel(item.url)})`
    }, [
      el("img", {
        class: "quicklink__favicon",
        src: "", // Will be populated async
        alt: "",
        loading: "lazy",
        referrerpolicy: "no-referrer",
        onError: (e) => { e.target.style.visibility = "hidden"; }
      }),
      el("span", {}, [item.title])
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
    getFaviconUrl(item.url).then(dataUrl => {
      if (dataUrl) {
        imgEl.src = dataUrl;
      } else {
        // No favicon available; show text label letter icon
        imgEl.style.display = "none";
      }
    }).catch(() => {
      imgEl.style.display = "none";
    });
    
    link.addEventListener("dragstart", () => link.classList.add("quicklink--dragging-self"));
    return link;
  });

  pills.forEach((p) => mount.appendChild(p));

  makeReorderable({
    items: pills,
    onReorder: (from, to) => {
      cfg.items = arrayMove(cfg.items, from, to);
      onChange?.(settings);
    }
  });

  // Group folder buttons
  for (const group of (cfg.groups || [])) {
    mount.appendChild(buildGroupButton(group, mount));
  }
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
    el("span", {}, [group.name])
  ]);

  let popover = null;
  let closeTimer = null;
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
      addDocumentListeners();
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
      "aria-label": `${group.name} links`
    });

    for (const item of (group.items || [])) {
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

    if (!group.items?.length) {
      popover.appendChild(el("p", { class: "ql-group-empty" }, ["No links in this group."]));
    }

    wrap.appendChild(popover);
    addDocumentListeners();
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

  function addDocumentListeners() {
    document.addEventListener("pointerdown", onDocPointerDown, true);
    document.addEventListener("keydown", onDocKeydown);
  }

  function removeDocumentListeners() {
    document.removeEventListener("pointerdown", onDocPointerDown, true);
    document.removeEventListener("keydown", onDocKeydown);
  }

  function onDocPointerDown(e) {
    if (popover && !wrap.contains(e.target)) closePopover();
  }

  function onDocKeydown(e) {
    if (e.key === "Escape" && popover) {
      closePopover();
      btn.focus({ preventScroll: true });
    }
  }

  return wrap;
}

// Favicon loading moved to favicon-cache.js for shared use by all widgets
// and to implement caching + fallback system (v1.0.0+ reliability)
