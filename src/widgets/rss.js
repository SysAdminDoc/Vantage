// Vantage v0.2.0 — RSS panel

import { renderFeedList } from "./feed-list.js";

export function renderRss(mount, settings) {
  if (!settings.rss.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const draw = (initiator) => renderFeedList(mount, {
    title: "Reading list",
    iconName: "rss",
    feeds: settings.rss.feeds,
    maxItems: settings.rss.maxItems,
    emptyHint: "Add an RSS or Atom feed URL in settings.",
    initiator,
    onRefresh: () => draw("refresh")
  });
  draw();
}
