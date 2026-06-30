// Vantage v1.1.0 — Starred items panel.
//
// Surfaces feed-list items the user starred via the per-row star button
// in News / Reading list. Each row is an external link with the source
// label + relative timestamp; an unstar button removes it without
// opening any extra UI. Emptied rows save immediately and the panel
// re-renders so undo via the toast is the recovery path (matches
// existing patterns in todo.js / countdown.js).

import { el, clear, relativeTime, hostnameLabel, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { saveSettings } from "../storage.js";
import { unstarByUrl, clearStarred } from "../utils/starred-feed.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";
import { i18n } from "../utils/i18n.js";

const toastUndo = (message, onUndo) =>
  toast(message, "warning", 6500, { label: i18n("undo", null, "Undo"), onClick: onUndo });

export function renderStarred(mount, settings, { onAttachDragHandle, onChange } = {}) {
  clear(mount);
  const cfg = settings.starred;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const persist = async () => {
    await saveSettings(settings);
    onChange?.(settings);
  };

  const draw = () => {
    clear(mount);

    const dragSpan = el("span", {
      class: "panel-header__drag",
      "aria-hidden": "true",
      innerHTML: iconString("grip", 14)
    });

    const clearBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost icon-button--small",
      "aria-label": i18n("clearAllStarred", null, "Clear all starred"),
      title: i18n("clearAllStarred", null, "Clear all starred"),
      onClick: async () => {
        if (!cfg.items?.length) return;
        const removed = clearStarred(settings);
        await persist();
        draw();
        toastUndo(i18n("starredClearedItems", [removed.length], "Cleared $1 starred item(s)."), async () => {
          settings.starred.items = removed;
          await persist();
          draw();
        });
      }
    }, [iconNode("trash", { size: 14 })]);

    const header = el("div", { class: "panel-header" }, [
      el("div", { class: "panel-header__left" }, [
        dragSpan,
        el("h2", { class: "panel-header__title" }, [iconNode("star", { size: 14 }), ` ${i18n("starredItems")}`])
      ]),
      el("div", { class: "panel-header__right" }, [clearBtn])
    ]);
    mount.appendChild(header);
    if (onAttachDragHandle) onAttachDragHandle(dragSpan);

    const body = el("div", { class: "panel-body" });
    mount.appendChild(body);

    const items = (cfg.items || []);
    if (!items.length) {
      body.appendChild(el("p", { class: "panel-empty" }, [
        i18n("starredEmpty", null, "No starred items yet - tap the star icon on any feed headline to pin it here.")
      ]));
      return;
    }

    const list = el("ul", { class: "feed-list starred-list" });
    for (const entry of items) {
      const published = entry.published ? new Date(entry.published) : null;
      const titleEl = el("p", { class: "feed-item__title" }, [entry.title || entry.url]);

      const favicon = el("img", {
        class: "feed-item__favicon",
        src: "",
        alt: "",
        loading: "lazy",
        referrerpolicy: "no-referrer",
        onError: (e) => { e.target.style.display = "none"; }
      });
      getFaviconUrl(entry.url).then(dataUrl => {
        if (dataUrl) favicon.src = dataUrl;
        else favicon.style.display = "none";
      }).catch(() => { favicon.style.display = "none"; });

      const meta = el("div", { class: "feed-item__meta" }, [
        favicon,
        el("span", { class: "feed-item__source" }, [entry.sourceTitle || hostnameLabel(entry.url)]),
        published ? el("span", { class: "feed-item__separator", "aria-hidden": "true" }, ["·"]) : null,
        published ? el("span", {}, [relativeTime(published)]) : null
      ]);

      const link = el("a", {
        href: entry.url,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "feed-item__link"
      }, [titleEl, meta]);

      const unstarBtn = el("button", {
        type: "button",
        class: "feed-item__action feed-item__action--star feed-item__action--starred",
        "aria-label": i18n("removeFromStarred", null, "Remove from starred"),
        title: i18n("removeFromStarred", null, "Remove from starred"),
        onClick: async (e) => {
          e.preventDefault();
          e.stopPropagation();
          unstarBtn.disabled = true;
          const removed = unstarByUrl(settings, entry.url);
          await persist();
          draw();
          if (removed) {
            toastUndo(i18n("starredRemovedItem", [(removed.title || hostnameLabel(removed.url)).slice(0, 60)], "Removed \"$1\"."), async () => {
              if (!settings.starred.items) settings.starred.items = [];
              settings.starred.items.unshift(removed);
              await persist();
              draw();
            });
          }
        }
      }, [iconNode("star", { size: 14 })]);

      list.appendChild(el("li", {
        class: "feed-item",
        "data-url": entry.url
      }, [link, unstarBtn]));
    }
    body.appendChild(list);
  };

  draw();
}
