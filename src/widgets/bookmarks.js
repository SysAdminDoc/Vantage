// Vantage — Browser Bookmarks panel widget.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";

export function renderBookmarks(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.bookmarks;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("bookmark", { size: 14 }), " Bookmarks"])
    ]),
    el("div", { class: "panel-header__right" })
  ]);

  const body = el("div", { class: "panel-body bookmarks-body" });

  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));

  if (!chrome?.bookmarks) {
    body.appendChild(el("p", { class: "panel-empty" }, [
      "Bookmarks API unavailable. Make sure the bookmarks permission is granted."
    ]));
    return;
  }

  chrome.bookmarks.getTree().then((tree) => {
    const flat = flattenBookmarks(tree, cfg.maxItems || 24);
    if (flat.length === 0) {
      body.appendChild(el("p", { class: "panel-empty" }, ["No bookmarks found."]));
      return;
    }
    const grid = el("div", { class: "bookmarks-grid" });
    for (const bm of flat) {
      const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bm.url)}&sz=32`;
      const item = el("a", {
        href: bm.url,
        class: "bookmark-item",
        title: bm.title || bm.url,
        "aria-label": bm.title || bm.url
      }, [
        el("img", { src: favicon, class: "bookmark-favicon", width: "16", height: "16", "aria-hidden": "true",
          onError: (e) => { e.target.style.display = "none"; } }),
        el("span", { class: "bookmark-title" }, [bm.title || "Untitled"])
      ]);
      grid.appendChild(item);
    }
    body.appendChild(grid);
  }).catch(() => {
    body.appendChild(el("p", { class: "panel-empty" }, ["Could not load bookmarks."]));
  });
}

function flattenBookmarks(nodes, max, out = []) {
  for (const node of nodes) {
    if (out.length >= max) break;
    if (node.url) {
      out.push({ title: node.title, url: node.url });
    } else if (node.children) {
      flattenBookmarks(node.children, max, out);
    }
  }
  return out;
}
