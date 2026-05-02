// Vantage v1.1.0 — feed-item starring helpers.
//
// "Star" a headline → it joins settings.starred.items, surfaced in the
// Starred panel widget. Persistence is plain chrome.storage.local — no
// external service, no permission. Cap at settings.starred.maxItems
// (default 100); newest entries push oldest off the end.
//
// Items are keyed by canonical URL (host+path, lowercased, trailing /
// stripped) so the same article shared via tracking links doesn't
// produce duplicate entries.

export const STARRED_HARD_CAP = 500;

export function canonicalize(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch { return String(url).toLowerCase(); }
}

/** Is this URL already in the user's starred list? */
export function isStarred(settings, url) {
  const items = settings?.starred?.items || [];
  const key = canonicalize(url);
  if (!key) return false;
  return items.some(it => canonicalize(it.url) === key);
}

/** Toggle a feed item's starred state. Returns the new state (`true` =
 *  now starred, `false` = un-starred). The caller persists `settings`.
 */
export function toggleStar(settings, item) {
  if (!settings.starred) settings.starred = { enabled: true, maxItems: 100, items: [] };
  if (!Array.isArray(settings.starred.items)) settings.starred.items = [];
  if (typeof settings.starred.maxItems !== "number") settings.starred.maxItems = 100;

  const key = canonicalize(item.url || item.link);
  if (!key) return false;

  const idx = settings.starred.items.findIndex(it => canonicalize(it.url) === key);
  if (idx >= 0) {
    settings.starred.items.splice(idx, 1);
    return false;
  }

  const entry = {
    url:         item.url || item.link,
    title:       item.title || "",
    sourceTitle: item.sourceTitle || "",
    sourceHost:  item.sourceHost  || "",
    // Persist a string so JSON round-trips don't dance around Date objects.
    published:   item.published instanceof Date ? item.published.toISOString() : (item.published || null),
    savedAt:     new Date().toISOString()
  };
  settings.starred.items.unshift(entry);

  // Enforce the cap — oldest off the tail. Starred-from-import paths
  // can deliver large blobs at once; the hard cap guards storage quota.
  const cap = Math.min(settings.starred.maxItems || 100, STARRED_HARD_CAP);
  if (settings.starred.items.length > cap) {
    settings.starred.items.length = cap;
  }
  return true;
}

/** Remove a starred item by canonical URL. Returns the removed entry or
 *  `null`. */
export function unstarByUrl(settings, url) {
  if (!settings.starred?.items) return null;
  const key = canonicalize(url);
  const idx = settings.starred.items.findIndex(it => canonicalize(it.url) === key);
  if (idx < 0) return null;
  return settings.starred.items.splice(idx, 1)[0] || null;
}

/** Wipe the starred list. */
export function clearStarred(settings) {
  if (!settings.starred) return [];
  const removed = settings.starred.items || [];
  settings.starred.items = [];
  return removed;
}
