// Vantage v0.1.0 — shared multi-feed renderer used by RSS + News widgets.

import { el, clear, relativeTime } from "../utils/dom.js";
import { fetchFeed } from "../utils/rss-parser.js";

export async function renderFeedList(mount, title, feedsConfig, maxItems, onRefresh) {
  clear(mount);

  const titleBar = el("div", { class: "widget-title" }, [
    title,
    el("div", { class: "widget-title-actions" }, [
      el("button", {
        class: "widget-action",
        title: "Refresh",
        onClick: () => onRefresh?.()
      }, ["Refresh"])
    ])
  ]);
  mount.appendChild(titleBar);

  if (!feedsConfig.length) {
    mount.appendChild(el("div", { class: "feed-empty" }, ["No feeds configured. Add some in settings."]));
    return;
  }

  const list = el("ul", { class: "feed-list" });
  list.appendChild(el("li", { class: "feed-loading" }, [`Loading ${feedsConfig.length} feed(s)…`]));
  mount.appendChild(list);

  // Fetch in parallel; tolerate partial failure.
  const results = await Promise.allSettled(
    feedsConfig.map(async (cfg) => {
      const feed = await fetchFeed(cfg.url);
      return feed.items.slice(0, maxItems).map((item) => ({
        ...item,
        sourceTitle: cfg.title || feed.title || cfg.url
      }));
    })
  );

  const merged = [];
  const errors = [];
  results.forEach((r, idx) => {
    if (r.status === "fulfilled") merged.push(...r.value);
    else errors.push(feedsConfig[idx].title || feedsConfig[idx].url);
  });

  merged.sort((a, b) => {
    const at = a.published?.getTime() ?? 0;
    const bt = b.published?.getTime() ?? 0;
    return bt - at;
  });

  clear(list);
  if (!merged.length) {
    list.appendChild(el("li", { class: "feed-empty" }, [
      errors.length ? `All ${errors.length} feed(s) failed to load.` : "No items."
    ]));
    return;
  }

  for (const item of merged.slice(0, maxItems)) {
    const li = el("li", { class: "feed-item" }, [
      el("a", { href: item.link, target: "_blank", rel: "noopener noreferrer" }, [item.title]),
      el("div", { class: "feed-item-meta" }, [
        el("span", { class: "feed-source" }, [item.sourceTitle]),
        item.published ? el("span", {}, [relativeTime(item.published)]) : null
      ])
    ]);
    list.appendChild(li);
  }

  if (errors.length) {
    list.appendChild(el("li", { class: "feed-empty" }, [
      `(${errors.length} feed${errors.length > 1 ? "s" : ""} failed: ${errors.join(", ")})`
    ]));
  }
}
