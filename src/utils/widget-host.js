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

export function normalizeWidgetHttpsUrl(value) {
  return parseHttpsUrl(value)?.href || "";
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
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Manifest is not valid JSON");
  }
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
