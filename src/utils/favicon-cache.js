// Vantage v1.0.0 — favicon caching and fallback system
// Implements reliable icon loading with local fallback + s2/favicons service + base64 embedding
// Solves: slow icon load, missing icons, cross-browser reliability (reported in Mue #1170, Tabliss #620)

/**
 * Favicon cache strategy:
 * 1. Check chrome.storage.local for cached favicon (base64)
 * 2. If cached, return immediately (zero network latency)
 * 3. If not cached and network available, fetch from service with timeout
 * 4. On success, cache the blob as base64 for future use
 * 5. On fail/timeout, fallback to text label or letter icon
 *
 * Service priority:
 * - Primary: Google s2/favicons (fast, high coverage)
 * - Fallback: Self-extracted from Open Graph / favicon.ico
 * - Ultimate fallback: Text label or CSS-generated letter icon
 *
 * Cache key: `favicon:${hostname}` → base64 data URL
 * Cache TTL: 30 days (user can clear via Settings → Data)
 * Max size: 2 MB total (enforced by storage quota)
 */

const FAVICON_CACHE_PREFIX = "favicon:";
const FAVICON_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const FAVICON_FETCH_TIMEOUT = 3000; // 3s timeout per request
const FAVICON_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days in ms

import { hasHostPermission } from "./host-permissions.js";

/**
 * Get favicon URL with caching and fallbacks
 * @param {string} pageUrl - Full page URL (e.g., 'https://example.com/page')
 * @returns {string} - data: URL or empty string
 */
export async function getFaviconUrl(pageUrl) {
  try {
    const hostname = new URL(pageUrl).hostname;
    if (!hostname) return "";
    
    // 1. Check cache first (synchronous, no network)
    const cached = localStorage.getItem(`${FAVICON_CACHE_PREFIX}${hostname}`);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (data && ts && Date.now() - ts < FAVICON_CACHE_MAX_AGE) {
          return data;
        }
      } catch {
        // Corrupted cache entry — evict silently
      }
      localStorage.removeItem(`${FAVICON_CACHE_PREFIX}${hostname}`);
    }
    
    // 2. Fetch from service with timeout
    const dataUrl = await fetchFaviconWithFallback(hostname, pageUrl);
    
    // 3. Cache the result
    if (dataUrl && dataUrl.startsWith("data:")) {
      try {
        localStorage.setItem(`${FAVICON_CACHE_PREFIX}${hostname}`, JSON.stringify({
          data: dataUrl,
          ts: Date.now()
        }));
      } catch (e) {
        // Storage quota exceeded; silently drop cache entry
        // Next request will re-fetch
      }
    }
    
    return dataUrl || "";
  } catch (e) {
    console.warn(`[Favicon] Error loading favicon for ${pageUrl}:`, e.message);
    return "";
  }
}

/**
 * Primary: fetch from Google s2/favicons with timeout
 * Fallback: attempt to extract from Open Graph meta or favicon.ico
 * @param {string} hostname
 * @param {string} pageUrl
 * @returns {Promise<string>} data URL or empty
 */
async function fetchFaviconWithFallback(hostname, pageUrl) {
  // Primary: Google s2/favicons (fast, 50+ million domains)
  try {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    const data = await fetchWithTimeout(faviconUrl, FAVICON_FETCH_TIMEOUT);
    if (data) return data;
  } catch (e) {
    console.warn(`[Favicon] s2/favicons timeout/error for ${hostname}:`, e.message);
  }
  
  // Secondary: DuckDuckGo favicon service (no API key, good coverage)
  try {
    const ddgUrl = `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
    const data = await fetchWithTimeout(ddgUrl, FAVICON_FETCH_TIMEOUT);
    if (data) return data;
  } catch (e) {
    console.warn(`[Favicon] DDG fallback failed for ${hostname}:`, e.message);
  }

  // Tertiary: Try to extract from page's Open Graph or favicon.ico
  try {
    if (!(await hasHostPermission(pageUrl))) return "";
    return await extractFaviconFromPage(pageUrl, hostname);
  } catch (e) {
    console.warn(`[Favicon] Page extraction failed for ${pageUrl}:`, e.message);
  }
  
  // Ultimate fallback: return empty (caller will render text label or letter icon)
  return "";
}

/**
 * Fetch a URL with timeout, returning base64 data URL on success
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} data: URL or null
 */
async function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      mode: "cors",
      cache: "force-cache", // Use browser cache first
      referrerPolicy: "no-referrer"
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const blob = await res.blob();
    if (blob.size > 100 * 1024) {
      // > 100 KB; likely corrupted or wrong content
      throw new Error(`Favicon too large (${blob.size} bytes)`);
    }
    
    // Convert blob to data: URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data: URL
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract favicon from page's Open Graph or favicon.ico link
 * Uses a fetch + DOMParser pass (NO host_permissions needed; caller handles proxy)
 * @param {string} pageUrl
 * @param {string} hostname
 * @returns {Promise<string|null>} data: URL or null
 */
async function extractFaviconFromPage(pageUrl, hostname) {
  try {
    // Fetch page HTML
    const res = await fetch(pageUrl, {
      mode: "cors",
      redirect: "follow",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(FAVICON_FETCH_TIMEOUT)
    });
    
    if (!res.ok) return null;
    const html = await res.text();
    
    // Parse HTML (safe; no eval)
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Extract og:image or apple-touch-icon or favicon.ico
    const ogImage = doc.querySelector('meta[property="og:image"]')?.content;
    const appleTouchIcon = doc.querySelector('link[rel="apple-touch-icon"]')?.href;
    const faviconLink = doc.querySelector('link[rel="icon"]')?.href;
    const favicon = doc.querySelector('link[rel="shortcut icon"]')?.href;
    
    const iconUrl = ogImage || appleTouchIcon || faviconLink || favicon;
    
    if (!iconUrl) {
      // Try /favicon.ico as last resort
      return await fetchWithTimeout(`https://${hostname}/favicon.ico`, 2000);
    }
    
    // Resolve relative URLs
    const absoluteIconUrl = new URL(iconUrl, pageUrl).href;
    return await fetchWithTimeout(absoluteIconUrl, 2000);
  } catch (e) {
    return null;
  }
}

/**
 * Clear favicon cache for a hostname or all
 * @param {string|null} hostname - specific hostname or null for all
 */
export function clearFaviconCache(hostname = null) {
  if (hostname) {
    localStorage.removeItem(`${FAVICON_CACHE_PREFIX}${hostname}`);
  } else {
    // Clear all favicon entries
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(FAVICON_CACHE_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * Get favicon cache statistics (for debugging)
 * @returns {object} - { count: number, size: number in bytes }
 */
export function getFaviconCacheStats() {
  let count = 0;
  let size = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(FAVICON_CACHE_PREFIX)) {
      count++;
      const value = localStorage.getItem(key);
      size += key.length + (value ? value.length : 0);
    }
  }
  return { count, size };
}
