// Vantage v0.8.0 — quick-link pills + folder groups with drag-to-reorder.

import { el, clear, hostnameLabel } from "../utils/dom.js";
import { makeReorderable, arrayMove } from "../utils/drag.js";

export function renderQuickLinks(mount, settings, { onChange } = {}) {
  clear(mount);
  const cfg = settings.quicklinks;
  if (!cfg?.enabled || (!cfg.items?.length && !cfg.groups?.length)) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  // Flat pills
  const pills = (cfg.items || []).map((item) => {
    const link = el("a", {
      class: "quicklink",
      href: item.url,
      title: `${item.title} — ${hostnameLabel(item.url)}\nDrag to reorder`,
      "aria-label": `${item.title} (${hostnameLabel(item.url)})`
    }, [
      el("img", {
        class: "quicklink__favicon",
        src: faviconFor(item.url),
        alt: "",
        loading: "lazy",
        referrerpolicy: "no-referrer",
        onError: (e) => { e.target.style.visibility = "hidden"; }
      }),
      el("span", {}, [item.title])
    ]);
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
  const btn = el("button", {
    type: "button",
    class: "quicklink quicklink--group",
    "aria-haspopup": "true",
    "aria-expanded": "false",
    title: group.name
  }, [
    el("span", { class: "quicklink__folder-icon", "aria-hidden": "true" }, ["\u{1F4C1}"]),
    el("span", {}, [group.name])
  ]);

  let popover = null;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popover) {
      closePopover();
      return;
    }
    openPopover();
  });

  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onDocKey);

  // Clean up listeners when mount is cleared by observing DOM removal
  new MutationObserver(() => {
    if (!document.body.contains(btn)) {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    }
  }).observe(mount, { childList: true });

  function openPopover() {
    btn.setAttribute("aria-expanded", "true");
    popover = el("div", { class: "ql-group-popover", role: "menu" });

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
          src: faviconFor(item.url),
          alt: "",
          loading: "lazy",
          referrerpolicy: "no-referrer",
          onError: (e) => { e.target.style.display = "none"; }
        }),
        el("span", {}, [item.title])
      ]);
      popover.appendChild(a);
    }

    if (!group.items?.length) {
      popover.appendChild(el("p", { class: "ql-group-empty" }, ["No links in this group."]));
    }

    btn.appendChild(popover);
    requestAnimationFrame(() => popover?.classList.add("ql-group-popover--open"));
  }

  function closePopover() {
    if (!popover) return;
    btn.setAttribute("aria-expanded", "false");
    popover.classList.remove("ql-group-popover--open");
    setTimeout(() => { popover?.remove(); popover = null; }, 200);
  }

  function onDocClick(e) {
    if (popover && !btn.contains(e.target)) closePopover();
  }
  function onDocKey(e) {
    if (e.key === "Escape" && popover) { closePopover(); btn.focus(); }
  }

  return btn;
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch { return ""; }
}
