// Vantage v0.3.0 — News panel

import { renderFeedList } from "./feed-list.js";
import { saveSettings, pushRead } from "../storage.js";

export function renderNews(mount, settings, { onAttachDragHandle } = {}) {
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
    readItems: settings.news.readItems || [],
    emptyHint: "Add a news feed URL in settings.",
    initiator,
    onRefresh: () => draw("refresh"),
    onMarkRead: async (urls) => {
      settings.news.readItems = pushRead(settings.news.readItems || [], urls);
      await saveSettings(settings);
    },
    onDragHandleAttach: onAttachDragHandle
  });
  draw();
}
