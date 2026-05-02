// Vantage v1.1.0 — keyword-driven Web Notifications for feed items.
//
// Strict opt-in: requires `feedAlerts.enabled` AND a user-granted
// `Notification.permission === "granted"`. Only fires once per item URL
// via the notifiedUrls LRU so re-renders, refreshes, and tab-reopens
// don't re-notify the same headline.
//
// Substring matching is intentional — no regex from the user surface
// here. Regex lives in `feedFilters.rules` and has its own ReDoS
// guards; alerts are meant to be effortless ("ping me if 'NVIDIA'
// shows up") so we keep it to plain-text contains.

export const NOTIFIED_CAP = 500;

/** Collect items whose title matches any configured keyword AND haven't
 *  already been notified. Caller should pass merged feed items.
 *
 *  Returns the new matches; the caller is responsible for marking them
 *  notified via `markNotified`.
 */
export function findAlertMatches(items, alerts) {
  if (!alerts?.enabled) return [];
  const keywords = (alerts.keywords || []).map(k => k.trim()).filter(Boolean);
  if (!keywords.length) return [];
  const notified = new Set(alerts.notifiedUrls || []);

  const ci = !alerts.caseSensitive;
  const needles = ci ? keywords.map(k => k.toLowerCase()) : keywords;

  const matches = [];
  for (const item of items) {
    if (!item?.link || notified.has(item.link)) continue;
    const haystack = ci ? (item.title || "").toLowerCase() : (item.title || "");
    const hit = needles.find(n => haystack.includes(n));
    if (hit) matches.push({ item, keyword: hit });
  }
  return matches;
}

/** Append URLs to the notified LRU and trim to NOTIFIED_CAP. Mutates
 *  `alerts` in place — caller saves settings. */
export function markNotified(alerts, urls) {
  if (!alerts) return;
  const set = new Set(alerts.notifiedUrls || []);
  for (const u of urls) set.add(u);
  const out = [...set];
  alerts.notifiedUrls = out.length > NOTIFIED_CAP ? out.slice(out.length - NOTIFIED_CAP) : out;
}

/** Fire a Web Notification per match. Silently no-ops if the Notification
 *  API is unavailable or permission isn't granted. Returns the array of
 *  URLs that were actually notified (so the caller can pass them to
 *  `markNotified` even if some browsers throw mid-loop). */
export function fireAlerts(matches) {
  if (!matches?.length) return [];
  if (typeof Notification === "undefined") return [];
  if (Notification.permission !== "granted") return [];

  const fired = [];
  for (const { item, keyword } of matches) {
    try {
      const n = new Notification(`Vantage — “${keyword}” mentioned`, {
        body: item.title || item.link,
        // The same URL fires once per session; the tag dedupes if the
        // browser would otherwise stack identical notifications.
        tag: `vantage-alert-${item.link}`,
        // No icon here — extension page can't reliably resolve a packed
        // resource path from the Notification constructor cross-browser.
      });
      n.onclick = () => {
        try { window.open(item.link, "_blank", "noopener"); } catch {}
        n.close();
      };
      fired.push(item.link);
    } catch {
      // Some browsers throw if the API is gated by a deeper permission
      // flag — treat as a soft fail and skip.
    }
  }
  return fired;
}

/** One-shot helper — request the OS notification permission. Returns
 *  the resulting permission string ("granted" | "denied" | "default").
 *  Browsers that don't support the API resolve to "denied". */
export async function requestNotificationPermission() {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
