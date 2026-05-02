// Vantage v0.3.0 — News panel

import { renderFeedList } from "./feed-list.js";
import { saveSettings, pushRead } from "../storage.js";
import { toggleStar, canonicalize as canonicalizeStarred } from "../utils/starred-feed.js";
import { findAlertMatches, fireAlerts, markNotified } from "../utils/feed-alerts.js";

export function renderNews(mount, settings, { onAttachDragHandle } = {}) {
  if (!settings.news.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const buildStarredSet = () => new Set(
    (settings.starred?.items || []).map(it => canonicalizeStarred(it.url))
  );

  const draw = (initiator) => renderFeedList(mount, {
    title: "News",
    iconName: "newspaper",
    feeds: settings.news.feeds,
    maxItems: settings.news.maxItems,
    readItems: settings.news.readItems || [],
    filterRules: settings.feedFilters?.rules || [],
    starredSet: buildStarredSet(),
    emptyHint: "Add a news feed URL in Settings → News.",
    initiator,
    onRefresh: () => draw("refresh"),
    onMarkRead: async (urls) => {
      settings.news.readItems = pushRead(settings.news.readItems || [], urls);
      await saveSettings(settings);
    },
    onToggleStar: async (item) => {
      const nowStarred = toggleStar(settings, { ...item, url: item.link });
      await saveSettings(settings);
      return nowStarred;
    },
    onItemsLoaded: async (items) => {
      const matches = findAlertMatches(items, settings.feedAlerts);
      if (!matches.length) return;
      const fired = fireAlerts(matches);
      if (fired.length) {
        markNotified(settings.feedAlerts, fired);
        await saveSettings(settings);
      }
    },
    onDragHandleAttach: onAttachDragHandle
  });
  draw();
}
