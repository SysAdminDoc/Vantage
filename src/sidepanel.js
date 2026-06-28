// Vantage v1.1.0 — Side panel entry point.
//
// Renders a combined News + Reading list feed (deduped by canonical
// URL, date-sorted) inside Chrome's chrome.sidePanel surface. Reuses
// the existing renderFeedList path so styling, mark-read, star, and
// reading-list save all work identically to the NTP versions.
//
// Firefox doesn't ship chrome.sidePanel; the manifest.firefox.json
// intentionally omits the side_panel field, so this file simply
// won't be loaded there. A separate sidebar_action path is on the
// future-work list.

import { loadSettings, saveSettings, pushRead, onSettingsChanged } from "./storage.js";
import { renderFeedList } from "./widgets/feed-list.js";
import { iconNode } from "./icons.js";
import { toggleStar, canonicalize as canonicalizeStarred } from "./utils/starred-feed.js";
import { findAlertMatches, fireAlerts, markNotified } from "./utils/feed-alerts.js";
import { archiveItems, pruneToCap } from "./utils/feed-archive.js";
import { applyThemePreference } from "./utils/theme.js";
import { i18n, localizeDocument, setupRTL } from "./utils/i18n.js";

let settings = null;

async function init() {
  setupRTL();
  localizeDocument();
  settings = await loadSettings();
  applyTheme();

  // Wire the refresh button before the first render so the icon
  // shows up immediately (renderFeedList itself wires its own button
  // for the inline icon-button group, but the side-panel header gets
  // its own dedicated affordance for one-handed use).
  const refreshBtn = document.getElementById("sidepanel-refresh");
  refreshBtn.replaceChildren(iconNode("refresh", { size: 14 }));
  refreshBtn.addEventListener("click", () => render("refresh"));

  render();

  // Cross-tab sync: when settings change in the NTP, mirror them here.
  onSettingsChanged((next) => {
    if (!next) return;
    settings = next;
    applyTheme();
    render();
  });
}

function applyTheme() {
  applyThemePreference(settings.theme || "mocha");
  if (settings.accent) document.documentElement.setAttribute("data-accent", settings.accent);
}

function buildStarredSet() {
  return new Set((settings.starred?.items || []).map(it => canonicalizeStarred(it.url)));
}

function combinedFeeds() {
  // Combine RSS + News feeds into one stream. Both already use the
  // same fetchFeed path under the hood, so dedupe-by-canonical-URL
  // handles overlap (e.g. user has the same source in both panels).
  const rss = settings.rss?.feeds || [];
  const news = settings.news?.feeds || [];
  return [...news, ...rss];
}

function combinedReadItems() {
  const rss = settings.rss?.readItems || [];
  const news = settings.news?.readItems || [];
  return [...new Set([...rss, ...news])];
}

async function persistRead(urls) {
  // Mark as read in BOTH panels so the side panel and NTP stay in
  // sync (the NTP's rss/news widgets will skip the rendered-read
  // styling since the URLs are in their own readItems arrays).
  if (settings.rss) {
    settings.rss.readItems = pushRead(settings.rss.readItems || [], urls);
  }
  if (settings.news) {
    settings.news.readItems = pushRead(settings.news.readItems || [], urls);
  }
  await saveSettings(settings);
}

function render(initiator) {
  const mount = document.getElementById("sidepanel-feed-mount");
  if (!mount) return;
  const feeds = combinedFeeds();
  const maxItems = Math.max(
    settings.rss?.maxItems || 15,
    settings.news?.maxItems || 15
  );
  renderFeedList(mount, {
    title: i18n("feeds"),
    iconName: "rss",
    feeds,
    maxItems,
    readItems: combinedReadItems(),
    filterRules: settings.feedFilters?.rules || [],
    starredSet: buildStarredSet(),
    emptyHint: i18n("sidePanelEmptyHint"),
    initiator,
    onRefresh: () => render("refresh"),
    onMarkRead: persistRead,
    onToggleStar: async (item) => {
      const nowStarred = toggleStar(settings, { ...item, url: item.link });
      await saveSettings(settings);
      return nowStarred;
    },
    onItemsLoaded: async (items) => {
      if (settings.feedArchive?.enabled) {
        try {
          await archiveItems(items);
          if (Math.random() < 0.04) {
            await pruneToCap(settings.feedArchive.cap || 10000);
          }
        } catch { /* archive is opt-in; failures are silent */ }
      }
      const matches = findAlertMatches(items, settings.feedAlerts);
      if (!matches.length) return;
      const fired = fireAlerts(matches);
      if (fired.length) {
        markNotified(settings.feedAlerts, fired);
        await saveSettings(settings);
      }
    }
  });
}

init().catch(err => console.error("[sidepanel] init failed:", err));
