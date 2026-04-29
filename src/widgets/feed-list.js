// Vantage v0.2.0 — shared multi-feed renderer with skeleton, last-updated,
// graceful per-feed failure, and a refresh button that shows progress.

import { el, clear, relativeTime, hostnameLabel } from "../utils/dom.js";
import { iconNode } from "../icons.js";
import { fetchFeed } from "../utils/rss-parser.js";

export async function renderFeedList(mount, options) {
  const {
    title,
    iconName,
    feeds,
    maxItems,
    onRefresh,
    emptyHint = "Add a feed in settings to get started.",
    initiator
  } = options;

  // Build static shell once per render call.
  clear(mount);

  const titleNode = el("h2", { class: "panel__title" }, [
    el("span", { class: "panel__title-dot", "aria-hidden": "true" }),
    title
  ]);

  const updatedNode = el("span", { class: "panel__updated", "data-updated": "" });
  const refreshBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    "aria-label": `Refresh ${title}`,
    title: `Refresh ${title}`,
    onClick: () => onRefresh?.()
  }, [iconNode("refresh", { size: 14 })]);

  const meta = el("div", { class: "panel__meta" }, [updatedNode, refreshBtn]);
  mount.appendChild(el("header", { class: "panel__header" }, [titleNode, meta]));

  const listHost = el("div", { class: "panel__list" });
  mount.appendChild(listHost);

  if (initiator === "refresh") {
    refreshBtn.dataset.loading = "true";
  }

  if (!feeds.length) {
    listHost.appendChild(buildEmpty(iconName, "No feeds yet", emptyHint));
    updatedNode.textContent = "";
    return;
  }

  // Show skeleton while we fetch.
  listHost.appendChild(buildSkeleton(Math.min(5, maxItems || 5)));

  const results = await Promise.allSettled(
    feeds.map(async (cfg) => {
      const feed = await fetchFeed(cfg.url);
      return feed.items.slice(0, maxItems).map((item) => ({
        ...item,
        sourceTitle: cfg.title || feed.title || hostnameLabel(cfg.url)
      }));
    })
  );

  refreshBtn.dataset.loading = "false";

  const merged = [];
  const errors = [];
  results.forEach((r, idx) => {
    if (r.status === "fulfilled") merged.push(...r.value);
    else errors.push(feeds[idx].title || hostnameLabel(feeds[idx].url));
  });

  merged.sort((a, b) => {
    const at = a.published?.getTime() ?? 0;
    const bt = b.published?.getTime() ?? 0;
    return bt - at;
  });

  clear(listHost);

  if (!merged.length) {
    listHost.appendChild(buildEmpty(
      "alert",
      errors.length ? "Couldn’t load feeds" : "Nothing to show yet",
      errors.length
        ? `Failed: ${errors.join(", ")}. Check your connection or these feed URLs.`
        : emptyHint
    ));
    updatedNode.textContent = "";
    return;
  }

  const list = el("ul", { class: "feed-list" });
  for (const item of merged.slice(0, maxItems)) {
    const li = el("li", { class: "feed-item" }, [
      el("a", {
        href: item.link,
        target: "_blank",
        rel: "noopener noreferrer"
      }, [
        el("p", { class: "feed-item__title" }, [item.title]),
        el("div", { class: "feed-item__meta" }, [
          el("span", { class: "feed-item__source" }, [item.sourceTitle]),
          item.published ? el("span", { class: "feed-item__separator" }, [relativeTime(item.published)]) : null
        ])
      ])
    ]);
    list.appendChild(li);
  }
  listHost.appendChild(list);

  if (errors.length) {
    listHost.appendChild(el("p", { class: "feed-error-note" }, [
      `${errors.length} feed${errors.length > 1 ? "s" : ""} failed: ${errors.join(", ")}`
    ]));
  }

  // Updated timestamp ticks live for the lifetime of this panel render.
  const stamp = new Date();
  const updateStamp = () => { updatedNode.textContent = `Updated ${relativeTime(stamp)}`; };
  updateStamp();
  const interval = setInterval(updateStamp, 30_000);
  // Clean up if mount is removed/cleared by next render.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(updatedNode)) {
      clearInterval(interval);
      observer.disconnect();
    }
  });
  observer.observe(mount, { childList: true });
}

function buildSkeleton(rows) {
  const wrap = el("ul", { class: "feed-list", "aria-label": "Loading" });
  for (let i = 0; i < rows; i++) {
    wrap.appendChild(el("li", { class: "feed-skeleton", "aria-hidden": "true" }, [
      el("div", { class: "skel-line skel-line--title" }),
      el("div", { class: "skel-line skel-line--meta" })
    ]));
  }
  return wrap;
}

function buildEmpty(iconName, title, hint) {
  return el("div", { class: "empty" }, [
    el("div", { class: "empty__icon" }, [iconNode(iconName || "info", { size: 18 })]),
    el("p", { class: "empty__title" }, [title]),
    el("p", { class: "empty__hint" }, [hint])
  ]);
}
