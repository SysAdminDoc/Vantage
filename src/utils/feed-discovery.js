// Vantage v1.2.0 — Feed discovery (RSS, Atom, JSON Feed)
//
// Discovers feed URLs on a given website by:
// 1. Fetching the website HTML
// 2. Looking for <link rel="alternate" type="application/rss+xml|atom+xml|feed+json">
// 3. Checking for /.well-known/feed.json (JSON Feed standard location)
// 4. Returning all discovered feeds with their type and title

export const FEED_TYPES = {
  RSS: "rss",
  ATOM: "atom",
  JSON: "json"
};

/**
 * Discover all available feeds on a website.
 * 
 * @param {string} siteUrl - The website URL to scan
 * @returns {Promise<Array>} Array of { title, url, type } objects
 */
export async function discoverFeeds(siteUrl) {
  const discovered = new Map(); // Dedupe by URL

  // Normalize the site URL to avoid /index.html issues
  const siteBase = new URL(siteUrl);
  siteBase.pathname = siteBase.pathname.replace(/\/index\.html?$/i, "/");
  const siteOrigin = siteBase.origin;

  try {
    // Fetch the HTML to look for <link rel="alternate"> tags
    const resp = await fetch(siteUrl, { 
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 Vantage/1.2.0" }
    });
    
    if (resp.ok) {
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      
      // Look for all <link rel="alternate"> tags with feed types
      const feedLinks = doc.querySelectorAll('link[rel="alternate"]');
      for (const link of feedLinks) {
        const type = link.getAttribute("type") || "";
        const href = link.getAttribute("href") || "";
        const title = link.getAttribute("title") || "";
        
        if (!href) continue;
        
        let feedType = null;
        if (/rss/i.test(type)) {
          feedType = FEED_TYPES.RSS;
        } else if (/atom/i.test(type)) {
          feedType = FEED_TYPES.ATOM;
        } else if (/json|feed\+json/i.test(type)) {
          feedType = FEED_TYPES.JSON;
        }
        
        if (feedType) {
          const feedUrl = new URL(href, siteUrl).href;
          const label = title || type.replace(/application\//i, "").toUpperCase();
          discovered.set(feedUrl, { title: label, url: feedUrl, type: feedType });
        }
      }
    }
  } catch (e) {
    // CORS or network error; continue to fallback checks
    console.debug("Feed discovery: HTML fetch failed", e);
  }

  // Check for /.well-known/feed.json (JSON Feed standard)
  try {
    const wellKnownUrl = new URL("/.well-known/feed.json", siteOrigin).href;
    const resp = await fetch(wellKnownUrl, { cache: "no-store" });
    if (resp.ok && /json|feed/.test(resp.headers.get("content-type") || "")) {
      const json = await resp.text();
      // Quick validation: starts with { and has version field
      if (json.trimStart().startsWith("{")) {
        const obj = JSON.parse(json);
        if (/jsonfeed\.org\/version/i.test(obj.version)) {
          const title = obj.title || "Feed";
          discovered.set(wellKnownUrl, { 
            title: title + " (JSON Feed)",
            url: wellKnownUrl,
            type: FEED_TYPES.JSON
          });
        }
      }
    }
  } catch (e) {
    // 404 or parse error; not every site has /.well-known/feed.json
    console.debug("Feed discovery: /.well-known/feed.json not found", e);
  }

  // Check for common feed paths if no feeds were discovered yet
  if (discovered.size === 0) {
    const commonPaths = [
      "/feed",
      "/feed.xml",
      "/feed.json",
      "/feeds/all.xml",
      "/index.xml",
      "/rss.xml",
      "/atom.xml"
    ];

    for (const path of commonPaths) {
      try {
        const checkUrl = new URL(path, siteOrigin).href;
        const resp = await fetch(checkUrl, { cache: "no-store" });
        if (resp.ok) {
          const contentType = resp.headers.get("content-type") || "";
          let feedType = null;
          let label = path.slice(1);
          
          if (/json|feed\+json/i.test(contentType)) {
            feedType = FEED_TYPES.JSON;
          } else if (/xml|rss|atom/.test(contentType)) {
            // Try to guess from path
            if (/atom/i.test(path)) feedType = FEED_TYPES.ATOM;
            else if (/json/i.test(path)) feedType = FEED_TYPES.JSON;
            else feedType = FEED_TYPES.RSS;
          }
          
          if (feedType) {
            discovered.set(checkUrl, { title: label, url: checkUrl, type: feedType });
          }
        }
      } catch (e) {
        // Continue checking other paths
      }
    }
  }

  return Array.from(discovered.values());
}
