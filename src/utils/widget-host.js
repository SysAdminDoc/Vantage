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

function originOf(url) {
  try { return new URL(url).origin; } catch { return null; }
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
  if (manifest.src && !manifest.src.startsWith("https://")) errors.push("src must be HTTPS");
  if (manifest.name && manifest.name.length > 50) errors.push("name exceeds 50 chars");
  if (manifest.id && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(manifest.id)) errors.push("id must be lowercase alphanumeric + dash");
  return errors;
}

export async function fetchManifest(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function createWidgetFrame(manifest, settings) {
  const size = manifest.sizes?.default || { width: 320, height: 240 };
  const widgetOrigin = originOf(manifest.src);
  const iframe = document.createElement("iframe");
  iframe.src = manifest.src;
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
        vantageVersion: chrome?.runtime?.getManifest?.()?.version || "unknown",
        userLanguage: chrome?.i18n?.getUILanguage?.() || "en"
      }, widgetOrigin || "*");
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
        }, widgetOrigin || "*");
      } catch {}
    },
    destroy() {
      clearTimeout(readyTimeout);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    }
  };
}
