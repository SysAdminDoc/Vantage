// Vantage v0.1.0 — RSS widget (re-uses shared feed-list renderer)

import { renderFeedList } from "./feed-list.js";

export function renderRss(mount, settings) {
  if (!settings.rss.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const draw = () => renderFeedList(
    mount,
    "RSS",
    settings.rss.feeds,
    settings.rss.maxItems,
    draw
  );
  draw();
}
