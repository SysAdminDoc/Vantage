// Vantage v0.3.0 — quick-link pills with drag-to-reorder

import { el, clear, hostnameLabel } from "../utils/dom.js";
import { makeReorderable, arrayMove } from "../utils/drag.js";

export function renderQuickLinks(mount, settings, { onChange } = {}) {
  clear(mount);
  if (!settings.quicklinks.enabled || !settings.quicklinks.items.length) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const pills = settings.quicklinks.items.map((item) => {
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
    // Suppress click during drag operations.
    link.addEventListener("dragstart", () => link.classList.add("quicklink--dragging-self"));
    return link;
  });

  pills.forEach((p) => mount.appendChild(p));

  makeReorderable({
    items: pills,
    onReorder: (from, to) => {
      settings.quicklinks.items = arrayMove(settings.quicklinks.items, from, to);
      onChange?.(settings);
    }
  });
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}
