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

export function buildSearchUrl(engineKey, query, customUrl) {
  const encoded = encodeURIComponent(query);
  if (engineKey === "custom") {
    if (!customUrl || !customUrl.includes("%s")) {
      return `https://duckduckgo.com/?q=${encoded}`;
    }
    return customUrl.replace("%s", encoded);
  }
  const engine = SEARCH_ENGINES[engineKey] || SEARCH_ENGINES.google;
  return engine.url.replace("%s", encoded);
}
