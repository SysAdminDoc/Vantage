// Vantage v0.8.0 → v1.0.0 — shared multi-feed renderer with dedupe + feed filter rules + favicon caching.
// Adds: per-item favicons (cached), click-to-mark-read state (with cross-tab persistence),
// unread count badge, "mark all read" button, skeleton loading, last-updated stamp,
// URL-based deduplication, mute/highlight feed filter rules.

import { el, clear, relativeTime, hostnameLabel, toast } from "../utils/dom.js";
import { iconNode } from "../icons.js";
import { fetchFeed } from "../utils/rss-parser.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";
import { canonicalize as canonicalizeStarred } from "../utils/starred-feed.js";
import { requestBrowserPermission } from "../utils/browser-permissions.js";
import { isFirefox } from "../utils/ext.js";
import { i18n } from "../utils/i18n.js";

// chrome.readingList requires Chrome 120+ and the optional "readingList"
// permission. Firefox has no equivalent yet; Chromium users see the
// action and grant access only when they save an item.
function canShowReadingListAction() {
  return !isFirefox && (!!globalThis.chrome?.readingList?.addEntry || !!globalThis.chrome?.permissions?.request);
}

// Video URL detection for inline feed embeds.
const YT_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;
const MP4_RE = /\.mp4(\?|#|$)/i;

function detectVideo(url) {
  if (!url) return null;
  const yt = YT_RE.exec(url);
  if (yt) return { type: "youtube", id: yt[1] };
  const vm = VIMEO_RE.exec(url);
  if (vm) return { type: "vimeo", id: vm[1] };
  if (MP4_RE.test(url)) return { type: "mp4", url };
  return null;
}

export async function renderFeedList(mount, options) {
  const {
    title,
    iconName,
    feeds,
    maxItems,
    readItems = [],
    filterRules = [],
    onRefresh,
    onMarkRead,           // (urls: string[]) => Promise<void>
    onDragHandleAttach,   // (handleEl) => void; lets caller wire panel-level drag
    onToggleStar,         // (item) => Promise<boolean> | boolean — returns new starred state
    starredSet,           // Set<canonicalUrl> — pre-computed by caller for O(1) lookup
    onItemsLoaded,        // (mergedItems) => void — called after dedupe + sort, before render
    emptyHint = i18n("feedDefaultEmptyHint", null, "Add a feed in settings to get started."),
    initiator
  } = options;

  clear(mount);

  // ---- Header ----
  const titleNode = el("h2", { class: "panel__title" }, [
    el("span", { class: "panel__title-dot", "aria-hidden": "true" }),
    title
  ]);
  const unreadBadge = el("span", { class: "panel__badge", hidden: true, "aria-live": "polite" });
  titleNode.appendChild(unreadBadge);

  const updatedNode = el("span", { class: "panel__updated" });

  // Drag handle (caller wires it).
  const dragHandle = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small panel__drag",
    "aria-label": i18n("reorderNamed", [title], "Reorder $1"),
    title: i18n("dragToReorder", null, "Drag to reorder"),
    tabindex: "-1"
  }, [iconNode("grip", { size: 14 })]);
  dragHandle.addEventListener("click", (e) => e.preventDefault());

  const markAllBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    "aria-label": i18n("feedMarkAllReadAria", [title], "Mark all $1 read"),
    title: i18n("feedMarkAllReadTitle", null, "Mark all as read"),
    onClick: () => markAllVisibleRead()
  }, [iconNode("check-all", { size: 14 })]);

  const refreshBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    "aria-label": i18n("feedRefreshAria", [title], "Refresh $1"),
    title: i18n("refresh", null, "Refresh"),
    onClick: () => onRefresh?.()
  }, [iconNode("refresh", { size: 14 })]);

  const meta = el("div", { class: "panel__meta" }, [updatedNode, dragHandle, markAllBtn, refreshBtn]);
  mount.appendChild(el("header", { class: "panel__header" }, [titleNode, meta]));
  onDragHandleAttach?.(dragHandle);

  const listHost = el("div", { class: "panel__list" });
  mount.appendChild(listHost);

  if (initiator === "refresh") {
    refreshBtn.dataset.loading = "true";
  }

  if (!feeds.length) {
    listHost.appendChild(buildEmpty(iconName, i18n("feedsEmptyTitle", null, "No feeds yet"), emptyHint));
    updatedNode.textContent = "";
    markAllBtn.disabled = true;
    return;
  }

  // ---- Skeleton while we fetch ----
  listHost.appendChild(buildSkeleton(Math.min(5, maxItems || 5)));

  const results = await Promise.allSettled(
    feeds.map(async (cfg) => {
      const feed = await fetchFeed(cfg.url);
      const sourceTitle = cfg.title || feed.title || hostnameLabel(cfg.url);
      const sourceHost = hostnameLabel(cfg.url);
      return feed.items.slice(0, maxItems).map((item) => ({
        ...item,
        sourceTitle,
        sourceHost
      }));
    })
  );

  refreshBtn.dataset.loading = "false";

  const merged = [];
  const errors = [];
  const seenLinks = new Set();

  results.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        const key = normalizeUrl(item.link);
        if (key && seenLinks.has(key)) continue;
        if (key) seenLinks.add(key);
        merged.push(item);
      }
    } else {
      errors.push(feeds[idx].title || hostnameLabel(feeds[idx].url));
    }
  });

  merged.sort((a, b) => {
    const at = a.published?.getTime() ?? 0;
    const bt = b.published?.getTime() ?? 0;
    return bt - at;
  });

  // Hook for keyword alerts / future side-effects on the merged item set.
  // Errors here must not break rendering, so swallow them after logging.
  if (onItemsLoaded) {
    try { onItemsLoaded(merged); }
    catch (err) { console.warn("[feed-list] onItemsLoaded threw:", err); }
  }

  clear(listHost);

  if (!merged.length) {
    listHost.appendChild(buildEmpty(
      "alert",
      errors.length
        ? i18n("feedsLoadErrorTitle", null, "Couldn't load feeds")
        : i18n("feedsNothingTitle", null, "Nothing to show yet"),
      errors.length
        ? i18n("feedsFailedDetail", [errors.join(", ")], "Failed: $1. Check your connection or these feed URLs.")
        : emptyHint
    ));
    updatedNode.textContent = "";
    markAllBtn.disabled = true;
    return;
  }

  const readSet = new Set(readItems);
  const showReadingListAction = canShowReadingListAction();
  const list = el("ul", { class: "feed-list" });
  let unreadCount = 0;

  const visible = [];
  for (const item of merged) {
    if (visible.length >= maxItems) break;
    const rule = matchRule(item, filterRules);
    if (rule?.action === "mute") continue;
    visible.push({ item, rule });
  }

  for (const { item, rule } of visible) {
    const isRead = readSet.has(item.link);
    if (!isRead) unreadCount++;

    const isHighlight = rule?.action === "highlight";
    const hlStyle = isHighlight && rule.color ? `border-left: 3px solid ${rule.color}` : "";

    const titleEl = el("p", { class: "feed-item__title" }, [item.title]);
    const favicon = el("img", {
      class: "feed-item__favicon",
      src: "", // Will be populated async
      alt: "",
      loading: "lazy",
      referrerpolicy: "no-referrer",
      onError: (e) => { e.target.style.display = "none"; }
    });

    // Populate favicon asynchronously using cache
    getFaviconUrl(item.link).then(dataUrl => {
      if (dataUrl) {
        favicon.src = dataUrl;
      } else {
        favicon.style.display = "none";
      }
    }).catch(() => {
      favicon.style.display = "none";
    });

    const video = detectVideo(item.link);
    const videoCard = video ? buildVideoCard(video, item) : null;

    const link = el("a", {
      href: item.link,
      target: "_blank",
      rel: "noopener noreferrer",
      class: "feed-item__link"
    }, [
      videoCard,
      titleEl,
      el("div", { class: "feed-item__meta" }, [
        favicon,
        el("span", { class: "feed-item__source" }, [item.sourceTitle]),
        item.published ? el("span", { class: "feed-item__separator", "aria-hidden": "true" }, ["·"]) : null,
        item.published ? el("span", {}, [relativeTime(item.published)]) : null
      ])
    ]);

    const liChildren = [link];

    // Star toggle — saves to settings.starred.items (local-only, no
    // permission). The star icon is filled when the item is already
    // starred. Caller passes a precomputed Set for O(1) lookup so we
    // don't walk settings.starred.items per row.
    if (onToggleStar) {
      const startsStarred = starredSet?.has(canonicalizeStarred(item.link)) ?? false;
      const starBtn = el("button", {
        type: "button",
        class: `feed-item__action feed-item__action--star${startsStarred ? " feed-item__action--starred" : ""}`,
        "aria-label": startsStarred ? i18n("unstarThisItem", null, "Unstar this item") : i18n("starThisItem", null, "Star this item"),
        "aria-pressed": String(startsStarred),
        title: startsStarred ? i18n("starredClickToRemove", null, "Starred - click to remove") : i18n("starThisItem", null, "Star this item"),
        onClick: async (e) => {
          e.preventDefault();
          e.stopPropagation();
          starBtn.disabled = true;
          try {
            const nowStarred = await onToggleStar(item);
            starBtn.classList.toggle("feed-item__action--starred", nowStarred);
            starBtn.setAttribute("aria-pressed", String(nowStarred));
            starBtn.setAttribute("aria-label", nowStarred ? i18n("unstarThisItem", null, "Unstar this item") : i18n("starThisItem", null, "Star this item"));
            starBtn.title = nowStarred ? i18n("starredClickToRemove", null, "Starred - click to remove") : i18n("starThisItem", null, "Star this item");
            toast(nowStarred ? i18n("starredToast", null, "Starred.") : i18n("unstarredToast", null, "Unstarred."), "success", 2000);
          } catch (err) {
            toast(err?.message || i18n("feedStarError", null, "Couldn't star item."), "error");
          } finally {
            starBtn.disabled = false;
          }
        }
      }, [iconNode("star", { size: 14 })]);
      liChildren.push(starBtn);
    }

    // Save-to-Reading-List button (Chrome 120+ only). Tucked into a
    // hover-revealed action group so the row stays visually quiet
    // when the user is just scanning.
    if (showReadingListAction) {
      const saveBtn = el("button", {
        type: "button",
        class: "feed-item__action feed-item__action--save",
        // Keep aria-label terse — long feed titles produce noisy SR
        // announcements; the row link itself already names the article.
        "aria-label": i18n("readingListSaveAria", null, "Save to Reading list"),
        title: i18n("readingListSaveAria", null, "Save to Reading list"),
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          saveToReadingList(item, saveBtn);
        }
      }, [iconNode("bookmark", { size: 14 })]);
      liChildren.push(saveBtn);
    }

    const li = el("li", {
      class: `feed-item${isRead ? " feed-item--read" : ""}${isHighlight ? " feed-item--highlight" : ""}`,
      "data-url": item.link,
      ...(hlStyle ? { style: hlStyle } : {})
    }, liChildren);

    link.addEventListener("click", () => {
      if (li.classList.contains("feed-item--read")) return;
      li.classList.add("feed-item--read");
      decrementBadge();
      onMarkRead?.([item.link]);
    });

    list.appendChild(li);
  }
  listHost.appendChild(list);

  if (errors.length) {
    listHost.appendChild(el("p", { class: "feed-error-note" }, [
      `${errors.length} feed${errors.length > 1 ? "s" : ""} failed: ${errors.join(", ")}`
    ]));
  }

  updateBadge();
  markAllBtn.disabled = unreadCount === 0;

  function decrementBadge() {
    unreadCount = Math.max(0, unreadCount - 1);
    updateBadge();
    markAllBtn.disabled = unreadCount === 0;
  }
  function updateBadge() {
    if (unreadCount > 0) {
      unreadBadge.hidden = false;
      unreadBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      unreadBadge.setAttribute("aria-label", i18n("feedUnreadCount", [unreadCount], "$1 unread"));
    } else {
      unreadBadge.hidden = true;
      unreadBadge.textContent = "";
    }
  }

  function markAllVisibleRead() {
    const urls = [];
    for (const liEl of list.querySelectorAll(".feed-item:not(.feed-item--read)")) {
      liEl.classList.add("feed-item--read");
      urls.push(liEl.dataset.url);
    }
    if (!urls.length) return;
    unreadCount = 0;
    updateBadge();
    markAllBtn.disabled = true;
    onMarkRead?.(urls);
  }

  // ---- Live timestamp ----
  const stamp = new Date();
  const updateStamp = () => { updatedNode.textContent = i18n("feedUpdated", [relativeTime(stamp)], "Updated $1"); };
  updateStamp();
  const interval = setInterval(updateStamp, 30_000);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(updatedNode)) {
      clearInterval(interval);
      observer.disconnect();
    }
  });
  observer.observe(mount, { childList: true });
}

// Save a feed item to chrome.readingList. addEntry() rejects when the
// URL is already saved — we treat that as a success ("already saved")
// because that's the user-meaningful outcome.
async function saveToReadingList(item, btn) {
  let api = globalThis.chrome?.readingList;
  if (btn) btn.disabled = true;
  try {
    if (!api?.addEntry) {
      const result = await requestBrowserPermission("readingList");
      if (!result.granted) {
        toast(i18n("readingListPermissionDeniedSave", null, "Reading List permission denied. Grant access to save feed items."), "warning");
        return;
      }
      api = globalThis.chrome?.readingList;
    }
    if (!api?.addEntry) {
      toast(i18n("readingListUnavailable", null, "Reading List is unavailable in this browser."), "warning");
      return;
    }
    await api.addEntry({
      title: item.title || item.link,
      url: item.link,
      hasBeenRead: false
    });
    if (btn) btn.classList.add("feed-item__action--saved");
    toast(i18n("readingListSaved", null, "Saved to Reading list."), "success");
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (/duplicate|already|exists/i.test(msg)) {
      if (btn) btn.classList.add("feed-item__action--saved");
      toast(i18n("readingListAlreadySaved", null, "Already in Reading list."), "info");
    } else {
      toast(i18n("readingListSaveFailed", [msg.toLowerCase() || "unknown error"], "Couldn't save - $1."), "error");
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Pre-compiled RegExp cache keyed by pattern source. Avoids re-compiling
// the same pattern on every item across every render — typical render
// is ~30 items × N rules; with the cache it becomes N compiles.
const RULE_RE_CACHE = new Map();
function compileRule(pattern) {
  if (!pattern) return null;
  const cached = RULE_RE_CACHE.get(pattern);
  if (cached !== undefined) return cached; // cached null = known-bad
  // Reject obviously catastrophic patterns BEFORE handing them to the
  // engine. Q1 audit follow-up: feed-filter rules are user-supplied
  // regexes that run on every render; an imported settings file with a
  // pathological pattern could lock the UI thread (ReDoS).
  //
  // Real user filters are simple text/URL matches. We reject the
  // canonical "evil regex" shapes — nested unbounded quantifiers
  // (a+)+, (a*)+, (a+)*, etc. The 1024-byte haystack cap below is the
  // belt to this suspenders: even if a pattern slips through, the
  // bounded input keeps execution time finite.
  if (pattern.length > 256) { RULE_RE_CACHE.set(pattern, null); return null; }
  if (looksCatastrophic(pattern)) { RULE_RE_CACHE.set(pattern, null); return null; }
  let re;
  try { re = new RegExp(pattern, "i"); }
  catch { RULE_RE_CACHE.set(pattern, null); return null; }
  RULE_RE_CACHE.set(pattern, re);
  return re;
}

// Look for "nested quantifier" shapes: a group whose body ends in an
// unbounded quantifier, where the group itself is followed by another
// quantifier (or {n,}). Those are the patterns most likely to produce
// catastrophic backtracking on hostile input. Examples that should be
// rejected: `(.+)+`, `(.*)+`, `(a*)*`, `(\w+)+`, `(\S*)+`,
// `((ab)+)+`, `([abc]+){2,}`, `(.+)*$`.
//
// Examples that should NOT be rejected (false-positive guard):
// `^(?:foo|bar){0,5}$`, `https?://[^/]+/path`, `(\w+\d+){2}` (the inner
// group ends in {2}, not a bare * or +), `(.{10,20})` (bounded inner).
// Match only TRUE unbounded outer quantifiers: `*`, `+`, or `{N,}`.
// `{2}` and `{2,5}` have an upper bound, so a sequence like `(\w+\d+){2}`
// is finite-time and must NOT trip this gate (that case was an
// audit-cited false-positive).
const NESTED_QUANTIFIER_RE =
  /\([^()]*?[+*][^()]*?\)\s*(?:[*+]|\{\d+,\})/;

function looksCatastrophic(pattern) {
  // Strip escaped parens so `\(` / `\)` literals don't trick the check.
  const stripped = pattern.replace(/\\[(){}*+?]/g, "");
  return NESTED_QUANTIFIER_RE.test(stripped);
}

// Apply a compiled regex to a string with a hard wall-clock budget.
// JS regex execution can't be preempted; the best we can do is bound
// the haystack length so a polynomial-time pattern can't run for >>ms
// on a 4-KB title or absurdly long URL.
const HAYSTACK_MAX = 1024;

function matchRule(item, rules) {
  if (!rules?.length) return null;
  for (const rule of rules) {
    if (!rule.pattern) continue;
    const re = compileRule(rule.pattern);
    if (!re) continue;
    let haystack = rule.field === "url" ? (item.link || "") : (item.title || "");
    if (haystack.length > HAYSTACK_MAX) haystack = haystack.slice(0, HAYSTACK_MAX);
    if (re.test(haystack)) return rule;
  }
  return null;
}

function normalizeUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch { return url.toLowerCase(); }
}

function buildSkeleton(rows) {
  const wrap = el("ul", { class: "feed-list", "aria-label": i18n("loading", null, "Loading...") });
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

// Favicon loading moved to favicon-cache.js for shared use and caching (v1.0.0+)

function buildVideoCard(video, item) {
  if (video.type === "youtube") {
    const thumb = el("div", { class: "feed-video" }, [
      el("img", {
        class: "feed-video__thumb",
        src: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
        alt: item.title || i18n("videoThumbnail", null, "Video thumbnail"),
        loading: "lazy",
        referrerpolicy: "no-referrer",
        onError: (e) => { e.target.parentElement.remove(); }
      }),
      el("span", { class: "feed-video__badge", "aria-hidden": "true" }, [
        iconNode("play", { size: 16 })
      ])
    ]);
    return thumb;
  }
  if (video.type === "vimeo") {
    return el("div", { class: "feed-video feed-video--vimeo" }, [
      el("span", { class: "feed-video__badge feed-video__badge--standalone", "aria-hidden": "true" }, [
        iconNode("play", { size: 16 })
      ]),
      el("span", { class: "feed-video__label" }, ["Vimeo"])
    ]);
  }
  if (video.type === "mp4") {
    const vid = el("video", {
      class: "feed-video__player",
      preload: "metadata",
      muted: true,
      playsinline: true,
      onError: (e) => { e.target.parentElement?.remove(); }
    });
    const source = el("source", { src: video.url, type: "video/mp4" });
    vid.appendChild(source);
    return el("div", { class: "feed-video" }, [vid,
      el("span", { class: "feed-video__badge", "aria-hidden": "true" }, [
        iconNode("play", { size: 16 })
      ])
    ]);
  }
  return null;
}
