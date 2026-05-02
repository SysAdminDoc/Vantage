// Vantage v1.1.0 — feed pre-warming cache.
//
// Populated by a chrome.alarms periodic alarm in background.js (NOT
// the Periodic Background Sync API — chrome.alarms is already
// permitted and avoids the sensitive permission prompt). fetchFeed
// reads from this cache first; cache misses fall through to the
// normal direct-fetch + CORS-proxy chain.
//
// Cache lives in chrome.storage.local under "vantageFeedPrewarm":
//   { [canonical_url]: { parsed: <FeedResult>, cachedAt: <epoch_ms> } }
// Total size kept bounded by capping per-feed item count at the
// feed-list maxItems and by removing entries with no recent reads.

const CACHE_KEY = "vantageFeedPrewarm";
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000; // 1 h — matches default interval

function canonicalize(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}${u.search}`.toLowerCase();
  } catch { return String(url).toLowerCase(); }
}

async function loadCache() {
  const ext = globalThis.chrome || globalThis.browser;
  if (!ext?.storage?.local) return {};
  try {
    const stored = await ext.storage.local.get(CACHE_KEY);
    return stored[CACHE_KEY] || {};
  } catch { return {}; }
}

async function saveCache(cache) {
  const ext = globalThis.chrome || globalThis.browser;
  if (!ext?.storage?.local) return;
  try { await ext.storage.local.set({ [CACHE_KEY]: cache }); } catch {}
}

/** Return the cached parsed feed if fresh, else null. The fetchFeed
 *  hot path calls this to short-circuit network traffic when the
 *  background alarm already populated the cache. */
export async function getPrewarmed(url, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const cache = await loadCache();
  const entry = cache[canonicalize(url)];
  if (!entry?.parsed || !entry.cachedAt) return null;
  if (Date.now() - entry.cachedAt > maxAgeMs) return null;
  // Re-hydrate Date instances — chrome.storage round-trips them as ISO
  // strings via structured clone, which then drops their Date type
  // when read back. The renderer expects item.published to be a Date.
  if (Array.isArray(entry.parsed.items)) {
    for (const it of entry.parsed.items) {
      if (typeof it.published === "string") {
        const d = new Date(it.published);
        if (!isNaN(d.getTime())) it.published = d;
      }
    }
  }
  return entry.parsed;
}

/** Bulk pre-warm: fetch each URL via the network path and write the
 *  parsed result into the cache. Called from background.js on the
 *  chrome.alarms tick. Failures per-feed are silent — partial cache
 *  is better than no cache. */
export async function prewarmAll(feedUrls) {
  if (!feedUrls?.length) return { ok: 0, failed: 0 };
  const { fetchFeed } = await import("./rss-parser.js");
  const cache = await loadCache();
  let ok = 0, failed = 0;
  // Sequential to avoid CORS-proxy rate-limit storms.
  for (const url of feedUrls) {
    try {
      const parsed = await fetchFeed(url, { skipPrewarmRead: true });
      // Serialize Date -> ISO so chrome.storage round-trip is clean.
      const serialized = {
        ...parsed,
        items: (parsed.items || []).map(it => ({
          ...it,
          published: it.published instanceof Date ? it.published.toISOString() : it.published
        }))
      };
      cache[canonicalize(url)] = { parsed: serialized, cachedAt: Date.now() };
      ok++;
    } catch {
      failed++;
    }
  }
  await saveCache(cache);
  return { ok, failed };
}

export async function clearPrewarmCache() {
  const ext = globalThis.chrome || globalThis.browser;
  if (!ext?.storage?.local) return;
  try { await ext.storage.local.remove(CACHE_KEY); } catch {}
}
