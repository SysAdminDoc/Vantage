// Vantage v0.3.0 — RSS / Reading list panel

import { renderFeedList } from "./feed-list.js";
import { saveSettings, pushRead } from "../storage.js";
import { toggleStar, canonicalize as canonicalizeStarred } from "../utils/starred-feed.js";
import { findAlertMatches, fireAlerts, markNotified } from "../utils/feed-alerts.js";
import { archiveItems, pruneToCap } from "../utils/feed-archive.js";

export function renderRss(mount, settings, { onAttachDragHandle } = {}) {
  if (!settings.rss.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const buildStarredSet = () => new Set(
    (settings.starred?.items || []).map(it => canonicalizeStarred(it.url))
  );

  const draw = (initiator) => renderFeedList(mount, {
    title: "Reading list",
    iconName: "rss",
    feeds: settings.rss.feeds,
    maxItems: settings.rss.maxItems,
    readItems: settings.rss.readItems || [],
    filterRules: settings.feedFilters?.rules || [],
    starredSet: buildStarredSet(),
    emptyHint: "Add an RSS or Atom feed URL in Settings → Reading list.",
    initiator,
    onRefresh: () => draw("refresh"),
    onMarkRead: async (urls) => {
      settings.rss.readItems = pushRead(settings.rss.readItems || [], urls);
      await saveSettings(settings);
    },
    onToggleStar: async (item) => {
      const nowStarred = toggleStar(settings, { ...item, url: item.link });
      await saveSettings(settings);
      return nowStarred;
    },
    onItemsLoaded: async (items) => {
      // Archive first — alerts shouldn't gate persistence.
      if (settings.feedArchive?.enabled) {
        try {
          await archiveItems(items);
          // Lazy prune — no need to do this on every render. Once per
          // 25-render burst at random keeps the cap honest without
          // blowing latency on every refresh.
          if (Math.random() < 0.04) {
            await pruneToCap(settings.feedArchive.cap || 10000);
          }
        } catch (err) {
          console.warn("[archive] rss persist failed:", err.message);
        }
      }
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
