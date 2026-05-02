// Vantage v1.1.0 — permanent feed archive in IndexedDB.
//
// Every item that flows through the feed-list `onItemsLoaded` hook
// gets stored in IDB keyed by canonical URL. The keyword-alert path
// already calls into here; users can search the archive from the
// Settings → Feed archive panel.
//
// Hard cap (default 10k, configurable via `settings.feedArchive.cap`)
// — the chrome.storage 5 MB limit doesn't apply to IndexedDB, but
// search latency degrades past ~50k items so we trim by archivedAt.

const DB_NAME = "vantage-feed-archive";
const STORE   = "items";
const SCHEMA_VERSION = 1;

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "url" });
        store.createIndex("archivedAt", "archivedAt");
        store.createIndex("publishedAt", "publishedAt");
        store.createIndex("sourceHost", "sourceHost");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IDB open failed"));
  });
  return _dbPromise;
}

function canonicalize(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch { return String(url).toLowerCase(); }
}

/** Bulk-insert merged feed items. Existing entries (same canonical URL)
 *  are left alone — we treat the first archive timestamp as canonical
 *  so deduped items don't keep shifting up the "newest" sort.
 *
 *  Returns the count of newly-archived items.
 */
export async function archiveItems(items) {
  if (!items?.length) return 0;
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  let added = 0;
  for (const item of items) {
    const key = canonicalize(item.link || item.url);
    if (!key) continue;
    // Use add() so existing entries silently fail. .onerror is called
    // per-failure; we don't await each one — IDB batches the
    // transaction itself.
    const entry = {
      url: key,
      origUrl: item.link || item.url || "",
      title: item.title || "",
      sourceTitle: item.sourceTitle || "",
      sourceHost: item.sourceHost || "",
      publishedAt: item.published instanceof Date
        ? item.published.getTime()
        : (typeof item.published === "number" ? item.published : Date.now()),
      archivedAt: Date.now()
    };
    try {
      const r = store.add(entry);
      r.onsuccess = () => added++;
      r.onerror = () => { /* duplicate key — ignore */ };
    } catch { /* schema mismatch — ignore */ }
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(added);
    tx.onerror = () => reject(tx.error || new Error("archive tx failed"));
    tx.onabort = () => reject(tx.error || new Error("archive tx aborted"));
  });
}

/** Substring (case-insensitive) search across title + sourceTitle.
 *  Returns up to `limit` items, sorted newest-first by `archivedAt`.
 *  An empty query returns the most-recent `limit` items.
 *
 *  Fast path: when `IDBIndex.prototype.getAllRecords` is available
 *  (Chrome 141+ / Firefox pending — Interop 2026), we fetch a single
 *  batch sorted descending and filter in memory. The cursor loop
 *  remains the fallback for browsers that haven't shipped the API. */
export async function searchArchive(query, { limit = 100 } = {}) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const idx = store.index("archivedAt");
  const needle = (query || "").toLowerCase().trim();

  // Fast path — getAllRecords (Chrome 141+) returns key + value
  // tuples in one round-trip, eliminating the per-item event-loop
  // turnaround the cursor loop pays. For a 10k archive on a search
  // miss the cursor walks all 10k entries; getAllRecords pulls them
  // in one go and we filter in-memory.
  if (typeof idx.getAllRecords === "function") {
    return new Promise((resolve, reject) => {
      // direction:'prev' = newest-first by archivedAt.
      // Open question: not all engines accept the options bag yet —
      // try / catch falls back to the cursor path if the call throws.
      let req;
      try {
        req = idx.getAllRecords({
          direction: "prev",
          // Pull a generous overshoot when filtering so we can still
          // hit `limit` matches after the substring filter trims.
          count: needle ? 5000 : limit
        });
      } catch (err) {
        // API present but signature mismatch — fall through.
        return cursorPath(idx, needle, limit).then(resolve, reject);
      }
      req.onsuccess = () => {
        const records = req.result || [];
        const out = [];
        for (const r of records) {
          const v = r.value || r; // some engines return raw values
          if (!needle) {
            out.push(v);
          } else {
            const hay = `${v.title} ${v.sourceTitle}`.toLowerCase();
            if (hay.includes(needle)) out.push(v);
          }
          if (out.length >= limit) break;
        }
        resolve(out);
      };
      req.onerror = () => cursorPath(idx, needle, limit).then(resolve, reject);
    });
  }

  return cursorPath(idx, needle, limit);
}

function cursorPath(idx, needle, limit) {
  const out = [];
  return new Promise((resolve, reject) => {
    const req = idx.openCursor(null, "prev");
    req.onsuccess = (e) => {
      const cur = e.target.result;
      if (!cur || out.length >= limit) { resolve(out); return; }
      if (!needle) {
        out.push(cur.value);
      } else {
        const hay = `${cur.value.title} ${cur.value.sourceTitle}`.toLowerCase();
        if (hay.includes(needle)) out.push(cur.value);
      }
      cur.continue();
    };
    req.onerror = () => reject(req.error || new Error("archive search failed"));
  });
}

/** Number of items currently archived. */
export async function archiveSize() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("archive count failed"));
  });
}

/** Trim oldest entries until size ≤ cap. Returns the count removed. */
export async function pruneToCap(cap) {
  const db = await openDB();
  const size = await archiveSize();
  if (size <= cap) return 0;
  const toRemove = size - cap;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const idx = tx.objectStore(STORE).index("archivedAt");
    let removed = 0;
    const req = idx.openCursor(null, "next");
    req.onsuccess = (e) => {
      const cur = e.target.result;
      if (!cur || removed >= toRemove) { return; }
      cur.delete();
      removed++;
      cur.continue();
    };
    tx.oncomplete = () => resolve(removed);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Wipe every entry. Returns count removed. */
export async function clearArchive() {
  const db = await openDB();
  const size = await archiveSize();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve(size);
    tx.onerror = () => reject(tx.error);
  });
}
