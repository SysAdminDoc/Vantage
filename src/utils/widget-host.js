// Vantage — Sandboxed widget host runtime.
//
// Implements the postMessage protocol described in docs/widget-api.md.
// Each external widget runs in a sandboxed <iframe>; the host sends
// vantage:init / vantage:theme-change and receives vantage:ready /
// vantage:error / vantage:log from the guest.

import { logError } from "./error-log.js";

const THEME_VARS = [
  "surface0", "surface1", "surface2", "text", "subtext0", "subtext1",
  "accent", "red", "green", "yellow", "blue", "mauve", "peach", "teal"
];

const VALID_INBOUND = new Set(["vantage:ready", "vantage:error", "vantage:log"]);
const MSG_MAX_LEN = 2048;
const LOG_RATE_WINDOW = 10_000;
const LOG_RATE_CAP = 20;
const MANIFEST_MAX_BYTES = 64 * 1024;
const REGISTRY_MAX_HOSTS = 24;
const REGISTRY_MAX_PERMISSIONS = 24;
const REGISTRY_DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const REGISTRY_PERMISSION_RE = /^[a-z][a-z0-9:_-]{0,63}$/;
const DEFAULT_SIZE = Object.freeze({ width: 320, height: 240 });
const SIZE_LIMITS = Object.freeze({
  minWidth: 160,
  maxWidth: 1200,
  minHeight: 120,
  maxHeight: 900
});

function parseHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !url.hostname) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function parseHttpsOrigin(value) {
  const url = parseHttpsUrl(value);
  return url ? url.origin : "";
}

export function normalizeWidgetHttpsUrl(value) {
  return parseHttpsUrl(value)?.href || "";
}

function cleanRegistryText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeRegistryDigest(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeRegistryHosts(value, errors) {
  if (!Array.isArray(value)) {
    errors.push("network hosts disclosure is required");
    return [];
  }
  if (value.length > REGISTRY_MAX_HOSTS) {
    errors.push(`network hosts must list at most ${REGISTRY_MAX_HOSTS} origins`);
  }

  const hosts = [];
  const seen = new Set();
  for (const raw of value.slice(0, REGISTRY_MAX_HOSTS)) {
    const origin = parseHttpsOrigin(raw);
    if (!origin) {
      errors.push("network hosts must be HTTPS origins");
      continue;
    }
    if (!seen.has(origin)) {
      seen.add(origin);
      hosts.push(origin);
    }
  }
  return hosts;
}

function normalizeRegistryPermissions(value, errors) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    errors.push("permissions must be an array");
    return [];
  }
  if (value.length > REGISTRY_MAX_PERMISSIONS) {
    errors.push(`permissions must list at most ${REGISTRY_MAX_PERMISSIONS} entries`);
  }
  const permissions = [];
  const seen = new Set();
  for (const raw of value.slice(0, REGISTRY_MAX_PERMISSIONS)) {
    const permission = cleanRegistryText(raw, 64);
    if (!REGISTRY_PERMISSION_RE.test(permission)) {
      errors.push("permissions must use lowercase names");
      continue;
    }
    if (!seen.has(permission)) {
      seen.add(permission);
      permissions.push(permission);
    }
  }
  return permissions;
}

function parseManifestJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Manifest is not valid JSON");
  }
}

async function fetchManifestText(url) {
  const manifestUrl = parseHttpsUrl(url);
  if (!manifestUrl) throw new Error("Manifest URL must be HTTPS");
  const res = await fetch(manifestUrl.href, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const declaredLength = Number(res.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MANIFEST_MAX_BYTES) {
    throw new Error("Manifest is too large");
  }
  const text = await res.text();
  if (text.length > MANIFEST_MAX_BYTES) throw new Error("Manifest is too large");
  return text;
}

export async function sha256Hex(text) {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Digest verification is unavailable");
}

export function buildWidgetRegistryReview(entry) {
  const errors = [];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return { valid: false, errors: ["registry entry must be an object"] };
  }

  const id = cleanRegistryText(entry.id, 64);
  if (!id || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
    errors.push("id must be lowercase alphanumeric + dash");
  }

  const name = cleanRegistryText(entry.name, 80);
  if (!name) errors.push("name is required");

  const manifestUrl = normalizeWidgetHttpsUrl(entry.manifestUrl);
  if (!manifestUrl) errors.push("manifestUrl must be a valid HTTPS URL");

  const digest = normalizeRegistryDigest(entry.manifestDigest || entry.digest);
  if (!REGISTRY_DIGEST_RE.test(digest)) {
    errors.push("manifestDigest must be sha256:<64 hex chars>");
  }

  const homepageRaw = entry.homepage == null ? "" : entry.homepage;
  const homepage = homepageRaw === "" ? "" : normalizeWidgetHttpsUrl(homepageRaw);
  if (homepageRaw && !homepage) errors.push("homepage must be a valid HTTPS URL");

  const publisher = cleanRegistryText(entry.publisher, 80);
  const description = cleanRegistryText(entry.description, 200);
  const network = entry.network && typeof entry.network === "object" && !Array.isArray(entry.network)
    ? entry.network
    : null;
  if (!network) errors.push("network disclosure is required");

  const hosts = normalizeRegistryHosts(network?.hosts, errors);
  const manifestOrigin = parseHttpsOrigin(manifestUrl);
  if (manifestOrigin && !hosts.includes(manifestOrigin)) {
    errors.push("network hosts must include the manifest origin");
  }

  const analytics = network?.analytics;
  if (analytics !== true && analytics !== false) {
    errors.push("network analytics disclosure is required");
  }
  const notes = cleanRegistryText(network?.notes, 200);
  const permissions = normalizeRegistryPermissions(entry.permissions, errors);

  const review = {
    id,
    name,
    manifestUrl,
    manifestDigest: digest,
    homepage,
    publisher,
    description,
    network: {
      hosts,
      analytics: analytics === true,
      notes
    },
    permissions,
    disclosures: [
      `Manifest: ${manifestUrl || "invalid"}`,
      `Pinned digest: ${digest || "missing"}`,
      `Network hosts: ${hosts.length ? hosts.join(", ") : "none"}`,
      `Analytics: ${analytics === true ? "yes" : analytics === false ? "no" : "not disclosed"}`,
      permissions.length ? `Permissions: ${permissions.join(", ")}` : "Permissions: none"
    ]
  };
  if (publisher) review.disclosures.push(`Publisher: ${publisher}`);
  if (homepage) review.disclosures.push(`Homepage: ${homepage}`);
  if (description) review.disclosures.push(`Description: ${description}`);
  if (notes) review.disclosures.push(`Network notes: ${notes}`);

  return { valid: errors.length === 0, errors, review };
}

export function validateRegistryEntry(entry) {
  return buildWidgetRegistryReview(entry).errors;
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function readThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const colors = {};
  for (const name of THEME_VARS) {
    colors[name] = style.getPropertyValue(`--${name}`)?.trim() || "";
  }
  return colors;
}

export function buildThemePayload(settings) {
  return {
    name: settings?.theme || "mocha",
    colors: readThemeColors()
  };
}

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest?.id || typeof manifest.id !== "string") errors.push("missing id");
  if (!manifest?.name || typeof manifest.name !== "string") errors.push("missing name");
  if (!manifest?.src || typeof manifest.src !== "string") errors.push("missing src");
  if (!manifest?.version) errors.push("missing version");
  if (manifest.src && !parseHttpsUrl(manifest.src)) errors.push("src must be a valid HTTPS URL");
  if (manifest.homepage != null && !parseHttpsUrl(manifest.homepage)) errors.push("homepage must be a valid HTTPS URL");
  if (manifest.name && manifest.name.length > 50) errors.push("name exceeds 50 chars");
  if (manifest.version && typeof manifest.version !== "string" && typeof manifest.version !== "number") errors.push("version must be a string or number");
  if (manifest.id && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(manifest.id)) errors.push("id must be lowercase alphanumeric + dash");
  const size = manifest.sizes?.default;
  if (size != null) {
    const width = Number(size.width);
    const height = Number(size.height);
    if (!inRange(width, SIZE_LIMITS.minWidth, SIZE_LIMITS.maxWidth)) {
      errors.push(`default width must be ${SIZE_LIMITS.minWidth}-${SIZE_LIMITS.maxWidth}px`);
    }
    if (!inRange(height, SIZE_LIMITS.minHeight, SIZE_LIMITS.maxHeight)) {
      errors.push(`default height must be ${SIZE_LIMITS.minHeight}-${SIZE_LIMITS.maxHeight}px`);
    }
  }
  return errors;
}

export function sanitizeWidgetSize(size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  if (!inRange(width, SIZE_LIMITS.minWidth, SIZE_LIMITS.maxWidth)) return { ...DEFAULT_SIZE };
  if (!inRange(height, SIZE_LIMITS.minHeight, SIZE_LIMITS.maxHeight)) return { ...DEFAULT_SIZE };
  return { width, height };
}

export async function fetchManifest(url) {
  return parseManifestJson(await fetchManifestText(url));
}

export async function fetchTrustedRegistryManifest(entry) {
  const { valid, errors, review } = buildWidgetRegistryReview(entry);
  if (!valid) throw new Error(`Invalid registry entry: ${errors.join(", ")}`);

  const text = await fetchManifestText(review.manifestUrl);
  const actualDigest = `sha256:${await sha256Hex(text)}`;
  if (actualDigest !== review.manifestDigest) {
    throw new Error("Manifest digest mismatch");
  }

  const manifest = parseManifestJson(text);
  const manifestErrors = validateManifest(manifest);
  if (manifestErrors.length) {
    throw new Error(`Invalid widget manifest: ${manifestErrors.join(", ")}`);
  }
  if (manifest.id !== review.id) {
    throw new Error("Registry entry id does not match manifest id");
  }

  const widgetOrigin = parseHttpsOrigin(manifest.src);
  if (widgetOrigin && !review.network.hosts.includes(widgetOrigin)) {
    throw new Error("Registry entry does not disclose widget frame origin");
  }

  return { manifest, review };
}

export function createWidgetFrame(manifest, settings) {
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(`Invalid widget manifest: ${errors.join(", ")}`);
  const size = sanitizeWidgetSize(manifest.sizes?.default);
  const srcUrl = parseHttpsUrl(manifest.src);
  const widgetOrigin = srcUrl.origin;
  const extApi = globalThis.chrome || globalThis.browser;
  const iframe = document.createElement("iframe");
  iframe.src = srcUrl.href;
  iframe.sandbox = "allow-scripts allow-popups";
  iframe.style.width = `${size.width}px`;
  iframe.style.height = `${size.height}px`;
  iframe.style.border = "none";
  iframe.style.borderRadius = "var(--r-md)";
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("aria-label", manifest.name || "External widget");

  let readyResolve;
  const readyPromise = new Promise(r => { readyResolve = r; });
  const readyTimeout = setTimeout(() => readyResolve(false), 10000);

  let logCount = 0;
  let logWindowStart = 0;

  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (widgetOrigin && event.origin !== widgetOrigin) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (!VALID_INBOUND.has(data.type)) return;

    if (data.type === "vantage:ready") {
      clearTimeout(readyTimeout);
      readyResolve(true);
      iframe.contentWindow.postMessage({
        type: "vantage:init",
        widget: {
          id: manifest.id,
          size: "default",
          data: manifest._userData || {}
        },
        theme: buildThemePayload(settings),
        vantageVersion: extApi?.runtime?.getManifest?.()?.version || "unknown",
        userLanguage: extApi?.i18n?.getUILanguage?.() || "en"
      }, widgetOrigin);
    }

    const msg = typeof data.message === "string"
      ? data.message.slice(0, MSG_MAX_LEN) : "";

    if (data.type === "vantage:error") {
      console.warn(`[widget:${manifest.id}] error:`, msg);
      logError({
        message: msg,
        source: `widget:${manifest.id}`,
        url: event.origin || ""
      });
    }
    if (data.type === "vantage:log") {
      const now = Date.now();
      if (now - logWindowStart > LOG_RATE_WINDOW) {
        logCount = 0;
        logWindowStart = now;
      }
      if (++logCount > LOG_RATE_CAP) return;
      const level = data.level === "warn" ? "warn" : data.level === "error" ? "error" : "log";
      console[level](`[widget:${manifest.id}]`, msg);
      if (level !== "log") {
        logError({
          message: msg,
          source: `widget:${manifest.id}:${level}`,
          url: event.origin || ""
        });
      }
    }
  };

  window.addEventListener("message", onMessage);

  return {
    iframe,
    ready: readyPromise,
    sendThemeChange(settings) {
      try {
        iframe.contentWindow?.postMessage({
          type: "vantage:theme-change",
          theme: buildThemePayload(settings)
        }, widgetOrigin);
      } catch {}
    },
    destroy() {
      clearTimeout(readyTimeout);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    }
  };
}
