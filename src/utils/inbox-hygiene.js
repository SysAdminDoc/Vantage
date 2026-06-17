// Inbox and bookmark hygiene utilities.
//
// All operations are local-only: no network calls except the
// user-initiated broken-link check, which uses HEAD requests
// with a clear disclosure in the UI.

const DAY_MS = 86_400_000;

export function findDuplicateUrls(items) {
  const seen = new Map();
  for (const item of items) {
    const key = normalizeUrl(item.url);
    if (!key) continue;
    const group = seen.get(key) || [];
    group.push(item);
    seen.set(key, group);
  }
  return [...seen.values()].filter(g => g.length > 1);
}

export function findForgotten(items, daysOld = 30) {
  const cutoff = Date.now() - daysOld * DAY_MS;
  return items.filter(i => i.savedAt && i.savedAt < cutoff);
}

export async function checkBrokenLinks(urls, { signal, onProgress } = {}) {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    if (signal?.aborted) break;
    const url = urls[i];
    try {
      const resp = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000)
      });
      results.push({ url, status: resp.status, ok: resp.ok || resp.type === "opaque" });
    } catch (err) {
      results.push({ url, status: 0, ok: false, error: err.message });
    }
    onProgress?.(i + 1, urls.length);
  }
  return results;
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return "";
  }
}
