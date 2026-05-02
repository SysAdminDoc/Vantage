// Vantage v1.1.0 — Origin Private File System (OPFS) helper.
//
// Used for media that's too big for chrome.storage.local's soft 5 MB
// limit (e.g. video backgrounds at >8 MB). OPFS is supported in
// Chrome 102+, Firefox 111+, Safari 15.2+ — all our target browsers.
//
// Falls back to non-OPFS data URLs for browsers that don't expose
// `navigator.storage.getDirectory()`.

const OPFS_MARKER = "opfs:";

export function opfsMarker(key) {
  return `${OPFS_MARKER}${key}`;
}

export function isOpfsMarker(value) {
  return typeof value === "string" && value.startsWith(OPFS_MARKER);
}

export function opfsKeyFromMarker(value) {
  if (!isOpfsMarker(value)) return null;
  return value.slice(OPFS_MARKER.length);
}

export function isOpfsAvailable() {
  return !!navigator.storage?.getDirectory;
}

async function getRoot() {
  if (!isOpfsAvailable()) throw new Error("OPFS unavailable");
  return navigator.storage.getDirectory();
}

/** Write a Blob to OPFS at the given filename. Overwrites if exists.
 *  Returns the same key for caller convenience. */
export async function putBlob(key, blob) {
  const root = await getRoot();
  const fh = await root.getFileHandle(key, { create: true });
  // Prefer the OPFS sync writer when available (Chrome) — non-async
  // worker-only API; we use the regular createWritable() here since
  // we're called from the main thread.
  const writable = await fh.createWritable();
  try {
    await writable.write(blob);
    await writable.close();
  } catch (err) {
    try { await writable.abort(); } catch {}
    throw err;
  }
  return key;
}

/** Read a Blob from OPFS and return an object URL. The caller is
 *  responsible for revoking the URL when the element no longer needs
 *  it (typically: never — backgrounds live for the page lifetime,
 *  and the URL dies with the page). */
export async function getBlobUrl(key) {
  const root = await getRoot();
  const fh = await root.getFileHandle(key, { create: false });
  const file = await fh.getFile();
  return URL.createObjectURL(file);
}

/** Read raw bytes back as a Blob (caller may want to re-export to a
 *  Data URL for legacy storage). */
export async function getBlob(key) {
  const root = await getRoot();
  const fh = await root.getFileHandle(key, { create: false });
  return fh.getFile();
}

export async function removeBlob(key) {
  const root = await getRoot();
  try { await root.removeEntry(key); } catch { /* not present — fine */ }
}

/** Estimate total OPFS bytes used by this origin. Useful for the
 *  storage-quota panel when OPFS becomes a meaningful contributor. */
export async function estimateUsage() {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch { return null; }
}
