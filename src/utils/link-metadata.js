// Shared metadata enrichment for user-saved web links.

import { getCachedFaviconUrl, getFaviconUrl } from "./favicon-cache.js";
import { hasHostPermission } from "./host-permissions.js";
import { normalizeWebUrl } from "./url-safety.js";

const TITLE_FETCH_TIMEOUT_MS = 3500;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_TITLE_LENGTH = 120;

export async function enrichLinkMetadata(rawUrl, {
  title = "",
  assumeHttps = true,
  fetchTitle = true,
  warmFavicon = true
} = {}) {
  const url = normalizeWebUrl(rawUrl, { assumeHttps });
  if (!url) return null;

  const hostname = hostnameLabel(url);
  let resolvedTitle = cleanLinkTitle(title);
  let titleSource = resolvedTitle ? "manual" : "fallback";

  if (!resolvedTitle && fetchTitle) {
    const fetchedTitle = await fetchPageTitle(url).catch(() => "");
    if (fetchedTitle) {
      resolvedTitle = fetchedTitle;
      titleSource = "page";
    }
  }

  if (!resolvedTitle) resolvedTitle = hostname;

  const faviconUrl = getCachedFaviconUrl(url);
  if (!faviconUrl && warmFavicon) {
    getFaviconUrl(url).catch(() => "");
  }

  return {
    url,
    title: resolvedTitle,
    hostname,
    faviconUrl,
    faviconSource: faviconUrl ? "cache" : "pending",
    titleSource
  };
}

export async function fetchPageTitle(pageUrl, { timeoutMs = TITLE_FETCH_TIMEOUT_MS } = {}) {
  if (!(await hasHostPermission(pageUrl))) return "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(pageUrl, {
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
      redirect: "follow",
      referrerPolicy: "no-referrer",
      signal: controller.signal
    });
    if (!response.ok) return "";

    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType && !/\b(html|xml)\b/i.test(contentType)) return "";

    const contentLength = Number(response.headers?.get?.("content-length") || 0);
    if (contentLength > MAX_HTML_BYTES) return "";

    const html = await response.text();
    if (!html || html.length > MAX_HTML_BYTES * 2) return "";
    return extractTitleFromHtml(html);
  } finally {
    clearTimeout(timeout);
  }
}

export function extractTitleFromHtml(html) {
  const source = String(html || "").slice(0, MAX_HTML_BYTES);
  if (!source) return "";

  if (typeof DOMParser === "function") {
    try {
      const doc = new DOMParser().parseFromString(source, "text/html");
      const parsed = cleanLinkTitle(doc.querySelector("title")?.textContent || "");
      if (parsed) return parsed;
    } catch {
      // Fall through to the tiny title matcher below.
    }
  }

  const match = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return cleanLinkTitle(decodeHtmlText(match?.[1] || ""));
}

export function cleanLinkTitle(value) {
  return decodeHtmlText(String(value || ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

function decodeHtmlText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'");
}

function hostnameLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "");
  }
}
