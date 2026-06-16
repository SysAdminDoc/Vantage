// Vantage — Inbox (local read-later queue) panel widget.
//
// Local-first bookmark triage panel. Users save the current tab
// (or any URL) for later reading; items can be archived or deleted
// with undo. All data lives in chrome.storage.local — nothing
// leaves the browser.

import { el, clear, relativeTime, hostnameLabel, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { saveSettings } from "../storage.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";

const toastUndo = (message, onUndo) =>
  toast(message, "warning", 6500, { label: "Undo", onClick: onUndo });

export function renderInbox(mount, settings, { onChange, onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.inbox;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const persist = async () => {
    await saveSettings(settings);
    onChange?.(settings);
  };

  let searchQuery = "";
  let searchTimer = null;

  const draw = () => {
    clear(mount);

    // ── Header ──────────────────────────────────────────────
    const dragSpan = el("span", {
      class: "panel-header__drag",
      "aria-hidden": "true",
      innerHTML: iconString("grip", 14)
    });

    const itemCount = (cfg.items || []).length;
    const badge = itemCount > 0
      ? el("span", { class: "panel-badge" }, [String(itemCount)])
      : null;

    const saveTabBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost icon-button--small",
      "aria-label": "Save current tab",
      title: "Save current tab to inbox",
      onClick: async () => {
        saveTabBtn.disabled = true;
        try {
          const ext = globalThis.chrome || globalThis.browser;
          if (!ext?.tabs?.query) {
            toast("Tab access is unavailable.", "error");
            return;
          }
          const tabs = await ext.tabs.query({ active: true, currentWindow: true });
          const tab = tabs?.[0];
          if (!tab?.url) {
            toast("No active tab found.", "warning");
            return;
          }
          // Deduplicate
          if ((cfg.items || []).some(i => i.url === tab.url)) {
            toast("Already in your inbox.", "info");
            return;
          }
          if (!cfg.items) cfg.items = [];
          const maxItems = cfg.maxItems || 200;
          const item = {
            url: tab.url,
            title: tab.title || hostnameLabel(tab.url),
            hostname: hostnameLabel(tab.url),
            savedAt: Date.now()
          };
          cfg.items.unshift(item);
          // Enforce cap
          if (cfg.items.length > maxItems) {
            cfg.items = cfg.items.slice(0, maxItems);
          }
          await persist();
          draw();
          toast("Saved to inbox.", "success");
        } catch (err) {
          toast("Couldn't save tab.", "error");
        } finally {
          saveTabBtn.disabled = false;
        }
      }
    }, [iconNode("plus", { size: 14 })]);

    const clearBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost icon-button--small",
      "aria-label": "Clear all inbox items",
      title: "Clear all",
      onClick: async () => {
        if (!cfg.items?.length) return;
        const removed = cfg.items.slice();
        cfg.items = [];
        await persist();
        draw();
        toastUndo(`Cleared ${removed.length} inbox item${removed.length === 1 ? "" : "s"}.`, async () => {
          cfg.items = removed;
          await persist();
          draw();
        });
      }
    }, [iconNode("trash", { size: 14 })]);

    const header = el("div", { class: "panel-header" }, [
      el("div", { class: "panel-header__left" }, [
        dragSpan,
        el("h2", { class: "panel-header__title" }, [
          iconNode("bookmark", { size: 14 }),
          " Inbox",
          ...(badge ? [" ", badge] : [])
        ])
      ]),
      el("div", { class: "panel-header__right" }, [saveTabBtn, clearBtn])
    ]);
    mount.appendChild(header);
    if (onAttachDragHandle) onAttachDragHandle(dragSpan);

    // ── Body ────────────────────────────────────────────────
    const body = el("div", { class: "panel-body" });
    mount.appendChild(body);

    // Search input
    const searchInput = el("input", {
      type: "search",
      class: "text-input inbox-search",
      placeholder: "Filter inbox…",
      "aria-label": "Filter inbox items",
      value: searchQuery,
      onInput: (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          searchQuery = e.target.value;
          renderList();
        }, 200);
      }
    });
    body.appendChild(searchInput);

    const listHost = el("div", { class: "inbox-list-host" });
    body.appendChild(listHost);

    function renderList() {
      clear(listHost);
      const items = cfg.items || [];
      const q = searchQuery.toLowerCase().trim();
      const filtered = q
        ? items.filter(i =>
            (i.title || "").toLowerCase().includes(q) ||
            (i.url || "").toLowerCase().includes(q)
          )
        : items;

      if (!filtered.length) {
        listHost.appendChild(el("p", { class: "panel-empty" }, [
          items.length === 0
            ? "Your inbox is empty. Save tabs here for later."
            : "No items match your filter."
        ]));
        return;
      }

      const list = el("ul", { class: "feed-list inbox-list" });
      for (const entry of filtered) {
        const saved = entry.savedAt ? new Date(entry.savedAt) : null;
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
          el("span", { class: "feed-item__source" }, [entry.hostname || hostnameLabel(entry.url)]),
          saved ? el("span", { class: "feed-item__separator", "aria-hidden": "true" }, ["·"]) : null,
          saved ? el("span", {}, [relativeTime(saved)]) : null
        ]);

        const link = el("a", {
          href: entry.url,
          target: "_blank",
          rel: "noopener noreferrer",
          class: "feed-item__link"
        }, [titleEl, meta]);

        // Archive button
        const archiveBtn = el("button", {
          type: "button",
          class: "feed-item__action inbox-action inbox-action--archive",
          "aria-label": "Archive",
          title: "Archive",
          onClick: async (e) => {
            e.preventDefault();
            e.stopPropagation();
            archiveBtn.disabled = true;
            const idx = cfg.items.indexOf(entry);
            if (idx > -1) cfg.items.splice(idx, 1);
            if (!cfg.archived) cfg.archived = [];
            cfg.archived.unshift(entry);
            await persist();
            draw();
            toastUndo(`Archived "${(entry.title || hostnameLabel(entry.url)).slice(0, 60)}".`, async () => {
              const ai = cfg.archived.indexOf(entry);
              if (ai > -1) cfg.archived.splice(ai, 1);
              if (!cfg.items) cfg.items = [];
              cfg.items.splice(Math.max(0, idx), 0, entry);
              await persist();
              draw();
            });
          }
        }, [iconNode("download", { size: 14 })]);

        // Delete button
        const deleteBtn = el("button", {
          type: "button",
          class: "feed-item__action inbox-action inbox-action--delete",
          "aria-label": "Delete",
          title: "Delete",
          onClick: async (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteBtn.disabled = true;
            const idx = cfg.items.indexOf(entry);
            if (idx > -1) cfg.items.splice(idx, 1);
            await persist();
            draw();
            toastUndo(`Deleted "${(entry.title || hostnameLabel(entry.url)).slice(0, 60)}".`, async () => {
              if (!cfg.items) cfg.items = [];
              cfg.items.splice(Math.max(0, idx), 0, entry);
              await persist();
              draw();
            });
          }
        }, [iconNode("trash", { size: 14 })]);

        list.appendChild(el("li", {
          class: "feed-item inbox-item",
          "data-url": entry.url
        }, [link, archiveBtn, deleteBtn]));
      }
      listHost.appendChild(list);
    }

    renderList();
  };

  draw();
}
