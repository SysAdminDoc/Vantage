// Vantage v1.1.0 — Inline browser-history search.
//
// Strict opt-in. The `history` permission is registered in
// `optional_permissions`; users grant it via Settings → History
// search by triggering `chrome.permissions.request()`. When the
// permission is absent the widget shows a brief opt-in prompt
// instead of the search box, so disabled installs never see
// history-related UI accidentally.

import { el, clear, relativeTime, hostnameLabel } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";
import { i18n } from "../utils/i18n.js";

const SEARCH_DEBOUNCE_MS = 220;

export function renderHistorySearch(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.historySearch;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const dragSpan = el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) });
  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      dragSpan,
      el("h2", { class: "panel-header__title" }, [iconNode("clock", { size: 14 }), ` ${i18n("history", null, "History")}`])
    ]),
    el("div", { class: "panel-header__right" })
  ]);
  mount.appendChild(header);
  if (onAttachDragHandle) onAttachDragHandle(dragSpan);

  const body = el("div", { class: "panel-body history-search-body" });
  mount.appendChild(body);

  const ext = globalThis.chrome || globalThis.browser;

  // Verify the permission is actually granted at render time. Users
  // can revoke optional permissions via the browser's UI without
  // touching our settings, in which case the toggle would say
  // "enabled" but chrome.history would be undefined.
  (async () => {
    const granted = !!ext?.permissions?.contains
      ? await ext.permissions.contains({ permissions: ["history"] })
      : !!ext?.history;
    if (!granted || !ext?.history) {
      body.appendChild(el("p", { class: "panel-empty" }, [
        i18n("historyPermissionPrompt", null, "History permission not granted. Enable it from Settings -> History search to use this panel.")
      ]));
      return;
    }

    const searchInput = el("input", {
      type: "search",
      class: "text-input",
      placeholder: i18n("historySearchPlaceholder", null, "Search browsing history..."),
      autocomplete: "off",
      "aria-label": i18n("historySearchAria", null, "Search browser history")
    });
    body.appendChild(searchInput);

    const resultsHost = el("div", { class: "history-search-results", role: "list" });
    body.appendChild(resultsHost);

    let lastQueryToken = 0;
    let debounceTimer = null;

    const runSearch = async (query) => {
      const token = ++lastQueryToken;
      clear(resultsHost);
      try {
        const items = await ext.history.search({
          text: query || "",
          maxResults: cfg.maxResults || 20,
          startTime: 0
        });
        if (token !== lastQueryToken) return;
        if (!items.length) {
          resultsHost.appendChild(el("p", { class: "panel-empty" }, [
            query
              ? i18n("historyNoQueryMatches", [query], "No history entries matching \"$1\".")
              : i18n("historyNoRecent", null, "No recent browser history.")
          ]));
          return;
        }
        for (const it of items) {
          const url = it.url || "";
          if (!url) continue;
          const titleEl = el("a", {
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "history-search-row__title",
            role: "listitem"
          }, [it.title || hostnameLabel(url) || url]);

          const favicon = el("img", {
            class: "history-search-row__favicon",
            src: "", alt: "", loading: "lazy",
            onError: (e) => { e.target.style.display = "none"; }
          });
          getFaviconUrl(url).then(dataUrl => {
            if (dataUrl) favicon.src = dataUrl;
            else favicon.style.display = "none";
          }).catch(() => { favicon.style.display = "none"; });

          const meta = el("span", { class: "history-search-row__meta" }, [
            hostnameLabel(url),
            it.lastVisitTime ? " · " : null,
            it.lastVisitTime ? relativeTime(new Date(it.lastVisitTime)) : null,
            typeof it.visitCount === "number" && it.visitCount > 1 ? ` · ${it.visitCount} visits` : null
          ]);

          resultsHost.appendChild(el("div", { class: "history-search-row" }, [
            favicon,
            el("div", { class: "history-search-row__main" }, [titleEl, meta])
          ]));
        }
      } catch (err) {
        if (token !== lastQueryToken) return;
        resultsHost.appendChild(el("p", { class: "panel-error" }, [
          i18n("historySearchFailed", [err?.message?.toLowerCase() || "unknown error"], "History search failed - $1.")
        ]));
      }
    };

    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(searchInput.value.trim()), SEARCH_DEBOUNCE_MS);
    });

    // Initial render shows the most-recent N entries so the panel
    // isn't empty on first paint.
    runSearch("");
  })();
}
