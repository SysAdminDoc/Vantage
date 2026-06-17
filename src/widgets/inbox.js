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
import { ext } from "../utils/ext.js";
import { findDuplicateUrls, findForgotten, checkBrokenLinks } from "../utils/inbox-hygiene.js";

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

    const addItem = async (url, title) => {
      if ((cfg.items || []).some(i => i.url === url)) {
        toast("Already in your inbox.", "info");
        return;
      }
      if (!cfg.items) cfg.items = [];
      const maxItems = cfg.maxItems || 200;
      cfg.items.unshift({
        url,
        title: title || hostnameLabel(url),
        hostname: hostnameLabel(url),
        savedAt: Date.now()
      });
      if (cfg.items.length > maxItems) cfg.items = cfg.items.slice(0, maxItems);
      await persist();
      draw();
      toast("Saved to inbox.", "success");
    };

    const saveTabBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost icon-button--small",
      "aria-label": "Save previous tab",
      title: "Save the tab you were viewing",
      onClick: async () => {
        saveTabBtn.disabled = true;
        try {
          if (!ext?.runtime?.sendMessage) {
            toast("Tab capture is unavailable.", "error");
            return;
          }
          // Ensure we have the tabs permission so the service worker
          // can read the previous tab's URL and title.
          if (ext.permissions?.request) {
            const has = await ext.permissions.contains({ permissions: ["tabs"] }).catch(() => false);
            if (!has) {
              const granted = await ext.permissions.request({ permissions: ["tabs"] }).catch(() => false);
              if (!granted) {
                toast("Tab permission denied — use Add URL instead.", "warning");
                return;
              }
            }
          }
          const resp = await ext.runtime.sendMessage({ type: "vantage:get-capture-tab" });
          if (!resp?.tab?.url) {
            toast("No saveable tab found in this window.", "warning");
            return;
          }
          await addItem(resp.tab.url, resp.tab.title);
        } catch (err) {
          toast("Couldn't save tab.", "error");
        } finally {
          saveTabBtn.disabled = false;
        }
      }
    }, [iconNode("plus", { size: 14 })]);

    const addUrlBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost icon-button--small",
      "aria-label": "Add URL to inbox",
      title: "Add a URL manually",
      onClick: () => {
        const existing = mount.querySelector(".inbox-url-form");
        if (existing) { existing.remove(); return; }
        const urlInput = el("input", {
          type: "url",
          class: "text-input inbox-url-input",
          placeholder: "https://example.com/article",
          "aria-label": "URL to save"
        });
        const submitBtn = el("button", {
          type: "submit",
          class: "button button--small",
          onClick: async (e) => {
            e.preventDefault();
            const raw = urlInput.value.trim();
            if (!raw) return;
            try { new URL(raw); } catch {
              toast("Enter a valid URL.", "warning");
              return;
            }
            await addItem(raw, "");
          }
        }, ["Save"]);
        const form = el("div", { class: "inbox-url-form" }, [urlInput, submitBtn]);
        body.insertBefore(form, body.firstChild);
        urlInput.focus();
      }
    }, [iconNode("link", { size: 14 })]);

    const hygieneBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost icon-button--small",
      "aria-label": "Inbox hygiene tools",
      title: "Find duplicates, forgotten items, or broken links",
      onClick: () => {
        const existing = mount.querySelector(".inbox-hygiene-menu");
        if (existing) { existing.remove(); return; }

        const menu = el("div", { class: "inbox-hygiene-menu" }, [
          el("button", {
            type: "button", class: "button button--ghost button--small",
            onClick: () => {
              menu.remove();
              const items = cfg.items || [];
              const dupes = findDuplicateUrls(items);
              if (!dupes.length) { toast("No duplicate URLs found.", "success"); return; }
              const total = dupes.reduce((s, g) => s + g.length - 1, 0);
              toast(`${total} duplicate${total === 1 ? "" : "s"} across ${dupes.length} URL${dupes.length === 1 ? "" : "s"}. Keeping newest, removing older copies.`, "info");
              const keep = new Set();
              for (const group of dupes) {
                group.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
                keep.add(group[0]);
              }
              cfg.items = items.filter(i => {
                const isDupe = dupes.some(g => g.includes(i));
                return !isDupe || keep.has(i);
              });
              persist().then(draw);
            }
          }, ["Find duplicates"]),
          el("button", {
            type: "button", class: "button button--ghost button--small",
            onClick: () => {
              menu.remove();
              const forgotten = findForgotten(cfg.items || [], 30);
              if (!forgotten.length) { toast("No items older than 30 days.", "success"); return; }
              toast(`${forgotten.length} item${forgotten.length === 1 ? "" : "s"} saved more than 30 days ago.`, "info");
              searchQuery = "";
              const host = mount.querySelector(".inbox-list-host");
              if (host) {
                clear(host);
                const list = el("ul", { class: "feed-list inbox-list" });
                for (const entry of forgotten) {
                  list.appendChild(el("li", { class: "feed-item inbox-item inbox-item--forgotten" }, [
                    el("a", { href: entry.url, target: "_blank", rel: "noopener noreferrer", class: "feed-item__link" }, [
                      el("p", { class: "feed-item__title" }, [entry.title || entry.url]),
                      el("div", { class: "feed-item__meta" }, [
                        el("span", {}, [relativeTime(new Date(entry.savedAt))])
                      ])
                    ])
                  ]));
                }
                host.appendChild(list);
              }
            }
          }, ["Forgotten (30d+)"]),
          el("button", {
            type: "button", class: "button button--ghost button--small",
            onClick: async () => {
              menu.remove();
              const urls = (cfg.items || []).map(i => i.url).filter(Boolean);
              if (!urls.length) { toast("No items to check.", "info"); return; }
              toast(`Checking ${urls.length} link${urls.length === 1 ? "" : "s"} — this sends HEAD requests to each URL.`, "info");
              const ctrl = new AbortController();
              const results = await checkBrokenLinks(urls, {
                signal: ctrl.signal,
                onProgress: (done, total) => {
                  if (done === total) toast(`Link check complete.`, "success");
                }
              });
              const broken = results.filter(r => !r.ok);
              if (!broken.length) { toast("All links are reachable.", "success"); return; }
              toast(`${broken.length} link${broken.length === 1 ? "" : "s"} may be broken.`, "warning");
            }
          }, ["Check links"])
        ]);
        body.insertBefore(menu, body.firstChild);
      }
    }, [iconNode("filter", { size: 14 })]);

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
      el("div", { class: "panel-header__right" }, [saveTabBtn, addUrlBtn, hygieneBtn, clearBtn])
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
