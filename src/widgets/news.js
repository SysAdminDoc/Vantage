// Vantage v0.2.0 — News panel

import { renderFeedList } from "./feed-list.js";

export function renderNews(mount, settings) {
  if (!settings.news.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const draw = (initiator) => renderFeedList(mount, {
    title: "News",
    iconName: "newspaper",
    feeds: settings.news.feeds,
    maxItems: settings.news.maxItems,
    emptyHint: "Add a news feed URL in settings.",
    initiator,
    onRefresh: () => draw("refresh")
  });
  draw();
}
