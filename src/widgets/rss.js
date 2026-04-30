// Vantage v0.3.0 — RSS / Reading list panel

import { renderFeedList } from "./feed-list.js";
import { saveSettings, pushRead } from "../storage.js";

export function renderRss(mount, settings, { onAttachDragHandle } = {}) {
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
    readItems: settings.rss.readItems || [],
    filterRules: settings.feedFilters?.rules || [],
    emptyHint: "Add an RSS or Atom feed URL in Settings → Reading list.",
    initiator,
    onRefresh: () => draw("refresh"),
    onMarkRead: async (urls) => {
      settings.rss.readItems = pushRead(settings.rss.readItems || [], urls);
      await saveSettings(settings);
    },
    onDragHandleAttach: onAttachDragHandle
  });
  draw();
}
