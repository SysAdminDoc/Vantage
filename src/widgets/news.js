// Vantage v0.1.0 — News widget (re-uses shared feed-list renderer)

import { renderFeedList } from "./feed-list.js";

export function renderNews(mount, settings) {
  if (!settings.news.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const draw = () => renderFeedList(
    mount,
    "News",
    settings.news.feeds,
    settings.news.maxItems,
    draw
  );
  draw();
}
