// Vantage v0.1.0 — search engine catalog. %s is the encoded query placeholder.

export const SEARCH_ENGINES = {
  google:     { name: "Google",     url: "https://www.google.com/search?q=%s" },
  bing:       { name: "Bing",       url: "https://www.bing.com/search?q=%s" },
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
  startpage:  { name: "Startpage",  url: "https://www.startpage.com/do/search?q=%s" },
  brave:      { name: "Brave",      url: "https://search.brave.com/search?q=%s" },
  kagi:       { name: "Kagi",       url: "https://kagi.com/search?q=%s" },
  ecosia:     { name: "Ecosia",     url: "https://www.ecosia.org/search?q=%s" },
  searxng:    { name: "SearXNG",    url: "https://searx.be/search?q=%s" },
  qwant:      { name: "Qwant",      url: "https://www.qwant.com/?q=%s" },
  perplexity: { name: "Perplexity", url: "https://www.perplexity.ai/?q=%s" },
  custom:     { name: "Custom",     url: null }
};

/** Validate a custom search URL. Accepts only http(s) schemes (and a
 *  pragmatic localhost http carve-out for users running a self-hosted
 *  SearXNG / Whoogle on their own machine). Reject everything else
 *  (`javascript:`, `data:`, `file:`, `chrome-extension:`, etc.) — the
 *  return value flows directly into `window.location.href`, so a stored
 *  malicious value would otherwise execute as a script-URL navigation.
 *
 *  Returns { ok: true, normalized } on success, or { ok: false, reason }
 *  with a short user-facing reason on failure.
 */
export function validateCustomSearchUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, reason: "Custom URL is empty." };
  }
  const trimmed = raw.trim();
  if (!trimmed.includes("%s")) {
    return { ok: false, reason: "Custom URL must contain %s where the query goes." };
  }
  let parsed;
  try {
    // URL parsing rejects the literal `%s` token in some component
    // positions; substitute a benign placeholder so the parse can
    // succeed, then validate scheme + host on the parsed object.
    parsed = new URL(trimmed.replace(/%s/g, "vantageQueryPlaceholder"));
  } catch {
    return { ok: false, reason: "Custom URL is not a valid absolute URL." };
  }
  const scheme = parsed.protocol.toLowerCase();
  if (scheme !== "https:" && scheme !== "http:") {
    return { ok: false, reason: `Scheme ${scheme} is not allowed (only http or https).` };
  }
  // WHATWG URL serializes IPv6 literals with brackets ('[::1]'), so the
  // bare-form '::1' comparison would always miss. Strip brackets before
  // comparing so http://[::1]/... is accepted as the documented loopback.
  let host = parsed.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (scheme === "http:" && !isLoopback) {
    return { ok: false, reason: "Use https:// (or http://localhost for self-hosted)." };
  }
  if (!host) {
    return { ok: false, reason: "Custom URL is missing a hostname." };
  }
  return { ok: true, normalized: trimmed };
}

export function buildSearchUrl(engineKey, query, customUrl) {
  const encoded = encodeURIComponent(query);
  if (engineKey === "custom") {
    const v = validateCustomSearchUrl(customUrl);
    if (!v.ok) {
      return `https://duckduckgo.com/?q=${encoded}`;
    }
    return v.normalized.replace("%s", encoded);
  }
  const engine = SEARCH_ENGINES[engineKey] || SEARCH_ENGINES.google;
  return engine.url.replace("%s", encoded);
}
