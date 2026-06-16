// Vantage v1.2.0 — runtime host-permission broker.
//
// User-entered URLs (feeds, iCal, image URLs, embeds) should not force an
// all-sites install warning. Fixed first-party/service endpoints stay in
// host_permissions; user-discovered origins are requested at runtime.

export function hostPermissionOrigin(rawUrl) {
  try {
    const url = rawUrl instanceof URL ? rawUrl : new URL(String(rawUrl || ""));
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return "";
    return `${url.protocol}//${url.hostname}/*`;
  } catch {
    return "";
  }
}

export function hostPermissionLabel(rawUrl) {
  try {
    const url = rawUrl instanceof URL ? rawUrl : new URL(String(rawUrl || ""));
    return url.hostname.replace(/^www\./, "");
  } catch {
    return String(rawUrl || "");
  }
}

export function hasDeniedHostOrigin(settings, rawUrlOrOrigin) {
  const origin = normalizeOrigin(rawUrlOrOrigin);
  if (!origin) return false;
  return deniedOrigins(settings).includes(origin);
}

export function markHostPermissionsDenied(settings, origins) {
  const list = uniqueOrigins(origins);
  if (!list.length || !settings) return settings;
  settings.hostPermissions = settings.hostPermissions || {};
  const existing = new Set(deniedOrigins(settings));
  for (const origin of list) existing.add(origin);
  settings.hostPermissions.deniedOrigins = [...existing].sort();
  settings.hostPermissions.lastDeniedAt = new Date().toISOString();
  return settings;
}

export function clearHostPermissionsDenied(settings, origins) {
  const list = uniqueOrigins(origins);
  if (!list.length || !settings?.hostPermissions) return settings;
  const remove = new Set(list);
  settings.hostPermissions.deniedOrigins = deniedOrigins(settings).filter(origin => !remove.has(origin));
  if (!settings.hostPermissions.deniedOrigins.length) {
    delete settings.hostPermissions.lastDeniedAt;
  }
  return settings;
}

export async function hasHostPermission(rawUrlOrOrigin) {
  const origin = normalizeOrigin(rawUrlOrOrigin);
  if (!origin) return true;
  const ext = extensionApi();
  if (!ext?.permissions?.contains) return true;
  try {
    return await callPermission(ext, "contains", { origins: [origin] });
  } catch {
    return false;
  }
}

export async function requestHostPermission(rawUrlOrOrigin, settings = null) {
  const origin = normalizeOrigin(rawUrlOrOrigin);
  if (!origin) return { required: false, granted: true, origins: [] };
  return requestHostPermissions([origin], settings);
}

export async function requestHostPermissions(rawOrigins, settings = null) {
  const origins = uniqueOrigins(rawOrigins);
  if (!origins.length) return { required: false, granted: true, origins: [] };

  const ext = extensionApi();
  if (!ext?.permissions?.request) {
    clearHostPermissionsDenied(settings, origins);
    return { required: true, granted: true, origins, unsupported: true };
  }

  const missing = [];
  for (const origin of origins) {
    if (await hasHostPermission(origin)) {
      clearHostPermissionsDenied(settings, [origin]);
    } else {
      missing.push(origin);
    }
  }
  if (!missing.length) return { required: true, granted: true, origins };

  try {
    const granted = await callPermission(ext, "request", { origins: missing });
    if (granted) {
      clearHostPermissionsDenied(settings, missing);
      return { required: true, granted: true, origins };
    }
    markHostPermissionsDenied(settings, missing);
    return { required: true, granted: false, origins: missing };
  } catch (err) {
    markHostPermissionsDenied(settings, missing);
    return { required: true, granted: false, origins: missing, error: err };
  }
}

export async function missingHostPermissionTargets(targets) {
  const byOrigin = dedupeTargets(targets);
  const missing = [];
  for (const target of byOrigin) {
    if (!(await hasHostPermission(target.origin))) missing.push(target);
  }
  return missing;
}

export function collectUserUrlPermissionTargets(settings) {
  const targets = [];
  const add = (url, label, kind) => {
    const origin = hostPermissionOrigin(url);
    if (origin) targets.push({ url, origin, label: label || hostPermissionLabel(url), kind });
  };

  for (const feed of settings?.rss?.feeds || []) add(feed.url, feed.title || "RSS feed", "rss");
  for (const feed of settings?.news?.feeds || []) add(feed.url, feed.title || "News feed", "news");
  for (const feed of settings?.calendar?.feeds || []) add(feed.url, feed.title || "Calendar feed", "calendar");
  for (const embed of settings?.embeds || []) add(embed.url, embed.title || "Embed", "embed");

  const bg = settings?.background;
  if (bg?.kind === "image-url" && bg.imageUrl) {
    add(bg.imageUrl, "Background image", "background");
  }

  return dedupeTargets(targets);
}

export function onHostPermissionsRemoved(callback) {
  const ext = extensionApi();
  const event = ext?.permissions?.onRemoved;
  if (!event?.addListener || typeof callback !== "function") return () => {};
  const handler = (permissions) => {
    const origins = uniqueOrigins(permissions?.origins || []);
    if (origins.length) callback(origins);
  };
  event.addListener(handler);
  return () => event.removeListener?.(handler);
}

function deniedOrigins(settings) {
  const list = settings?.hostPermissions?.deniedOrigins;
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

function dedupeTargets(targets) {
  const out = new Map();
  for (const target of targets || []) {
    const origin = normalizeOrigin(target?.origin || target?.url);
    if (!origin || out.has(origin)) continue;
    out.set(origin, { ...target, origin });
  }
  return [...out.values()];
}

function uniqueOrigins(origins) {
  return [...new Set((origins || []).map(normalizeOrigin).filter(Boolean))];
}

function normalizeOrigin(rawUrlOrOrigin) {
  const raw = String(rawUrlOrOrigin || "");
  if (/^https?:\/\/[^/]+\/\*$/.test(raw)) return raw;
  return hostPermissionOrigin(raw);
}

function extensionApi() {
  return globalThis.browser || globalThis.chrome;
}

function usesPromisePermissions(ext) {
  return !!globalThis.browser?.permissions && ext?.permissions === globalThis.browser.permissions;
}

function callPermission(ext, methodName, payload) {
  const fn = ext?.permissions?.[methodName];
  if (typeof fn !== "function") return Promise.resolve(false);
  if (usesPromisePermissions(ext)) {
    return fn.call(ext.permissions, payload);
  }
  return new Promise((resolve) => {
    try {
      fn.call(ext.permissions, payload, (value) => {
        if (ext.runtime?.lastError) resolve(false);
        else resolve(!!value);
      });
    } catch {
      resolve(false);
    }
  });
}
