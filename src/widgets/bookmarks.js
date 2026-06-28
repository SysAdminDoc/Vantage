// Vantage → v1.0.0 — Browser Bookmarks panel widget + favicon caching.

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";
import { hasBrowserPermission, requestBrowserPermission } from "../utils/browser-permissions.js";

export async function renderBookmarks(mount, settings, { onAttachDragHandle } = {}) {
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

  const api = globalThis.browser || globalThis.chrome;
  const granted = await hasBrowserPermission("bookmarks");
  if (!granted || !api?.bookmarks?.getTree) {
    body.appendChild(permissionPrompt(() => renderBookmarks(mount, settings, { onAttachDragHandle })));
    return;
  }

  api.bookmarks.getTree().then((tree) => {
    const flat = flattenBookmarks(tree, cfg.maxItems || 24);
    if (flat.length === 0) {
      body.appendChild(el("p", { class: "panel-empty" }, ["No bookmarks found."]));
      return;
    }
    const grid = el("div", { class: "bookmarks-grid" });
    for (const bm of flat) {
      const item = el("a", {
        href: bm.url,
        class: "bookmark-item",
        title: bm.title || bm.url,
        "aria-label": bm.title || bm.url
      }, [
        el("img", { src: "", class: "bookmark-favicon", width: "16", height: "16", "aria-hidden": "true",
          onError: (e) => { e.target.style.display = "none"; } }),
        el("span", { class: "bookmark-title" }, [bm.title || "Untitled"])
      ]);
      
      // Populate favicon asynchronously using cache
      const imgEl = item.querySelector("img");
      getFaviconUrl(bm.url).then(dataUrl => {
        if (dataUrl) {
          imgEl.src = dataUrl;
        } else {
          imgEl.style.display = "none";
        }
      }).catch(() => {
        imgEl.style.display = "none";
      });
      
      grid.appendChild(item);
    }
    body.appendChild(grid);
  }).catch(() => {
    body.appendChild(el("p", { class: "panel-error" }, ["Couldn't load bookmarks."]));
  });
}

function permissionPrompt(onGranted) {
  const btn = el("button", {
    type: "button",
    class: "button button--ghost",
    onClick: async () => {
      btn.disabled = true;
      const result = await requestBrowserPermission("bookmarks");
      if (result.granted) {
        toast("Bookmarks access granted.", "success");
        onGranted?.();
      } else {
        toast("Bookmarks permission denied. Grant access to show this panel.", "warning");
        btn.disabled = false;
      }
    }
  }, [iconNode("bookmark", { size: 14 }), " Grant bookmarks access"]);

  return el("div", { class: "panel-empty" }, [
    el("p", {}, ["Bookmarks permission not granted. Vantage only reads bookmarks after you allow access."]),
    btn
  ]);
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
