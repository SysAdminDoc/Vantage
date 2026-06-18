// Shared validation for user-supplied web URLs.

const WEB_PROTOCOLS = new Set(["http:", "https:"]);

export function normalizeWebUrl(value, { assumeHttps = false } = {}) {
  let raw = String(value || "").trim();
  if (!raw) return "";
  if (assumeHttps && !/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    raw = `https://${raw}`;
  }
  try {
    const url = new URL(raw);
    if (!WEB_PROTOCOLS.has(url.protocol) || !url.hostname) return "";
    if (url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function isSafeWebUrl(value) {
  return !!normalizeWebUrl(value);
}
