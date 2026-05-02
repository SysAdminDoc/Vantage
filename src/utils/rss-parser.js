// Vantage v0.6.0 — RSS / Atom feed parser via DOMParser.
// Tries direct fetch first; on CORS failure walks a proxy fallback chain.
// allorigins.win and corsproxy.io both return raw content.
//
// As of v0.11.0 the parser also handles JSON Feed v1.1
// (https://www.jsonfeed.org/version/1.1/). Modern Micro.blog, Ghost,
// Kagi, Manton's Mb-publishing tools, and many static-site generators
// publish JSON Feed alongside RSS — and silently 200 with
// `Content-Type: application/feed+json` on the same URL or a sibling
// path. Detection runs in this order before reaching DOMParser:
//   1. Content-Type header includes 'json'
//   2. Body trimmed starts with '{' (handles servers that mis-label)
//   3. Otherwise XML path

const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

export async function fetchFeed(url, opts = {}) {
  // Pre-warm cache short-circuit. Background.js maintains this when
  // the user enables Settings → Feed pre-warming. The recursive
  // skipPrewarmRead flag is what the pre-warm helper itself passes
  // when it calls back into fetchFeed to refresh the cache —
  // otherwise we'd serve the soon-to-be-overwritten stale entry.
  if (!opts.skipPrewarmRead) {
    try {
      const { getPrewarmed } = await import("./feed-prewarm.js");
      const cached = await getPrewarmed(url);
      if (cached) return cached;
    } catch { /* cache lookup failures fall through to network */ }
  }

  let body;
  let contentType = "";

  // Direct fetch first — works for most feeds that send permissive CORS headers.
  try {
    const direct = await fetch(url, { cache: "no-store" });
    if (!direct.ok) throw new Error(`HTTP ${direct.status}`);
    contentType = direct.headers.get("content-type") || "";
    body = await direct.text();
  } catch {
    // Walk the proxy chain until one succeeds. Proxies usually drop the
    // upstream content-type, so we fall back to body sniffing in that case.
    let lastErr;
    for (const proxyFn of PROXIES) {
      try {
        const proxied = await fetch(proxyFn(url), { cache: "no-store" });
        if (!proxied.ok) throw new Error(`Proxy HTTP ${proxied.status}`);
        contentType = proxied.headers.get("content-type") || contentType;
        body = await proxied.text();
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!body) throw lastErr || new Error("All proxies failed");
  }

  return parseFeed(body, url, contentType);
}

export function parseFeed(body, sourceUrl = "", contentType = "") {
  // JSON Feed sniff. Trust an explicit JSON content-type; otherwise check
  // the first non-whitespace character — survives proxies that drop the
  // Content-Type header.
  const trimmed = body.trimStart();
  const looksJson =
    /\bjson\b/i.test(contentType) ||
    trimmed.startsWith("{");
  if (looksJson) {
    try {
      const obj = JSON.parse(trimmed);
      // JSON Feed always sets a `version` URL like
      // https://jsonfeed.org/version/1 or .../1.1. If that's present we
      // treat it as a JSON feed even when content-type was misleading.
      if (typeof obj?.version === "string" && /jsonfeed\.org\/version/i.test(obj.version)) {
        return parseJsonFeed(obj, sourceUrl);
      }
      // Some hand-authored JSON feeds omit the version field but still
      // ship the canonical shape.
      if (Array.isArray(obj?.items) && (obj.title || obj.feed_url || obj.home_page_url)) {
        return parseJsonFeed(obj, sourceUrl);
      }
    } catch { /* not valid JSON — fall through to XML */ }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(body, "application/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) throw new Error("invalid feed XML");

  // Atom
  if (doc.documentElement.localName === "feed") {
    const title = textOf(doc.querySelector("feed > title"));
    const items = [...doc.querySelectorAll("feed > entry")].map((entry) => {
      const linkNode = entry.querySelector("link[rel='alternate']") || entry.querySelector("link");
      const link = linkNode?.getAttribute("href") || textOf(linkNode);
      return {
        title: textOf(entry.querySelector("title")) || "(untitled)",
        link: link || sourceUrl,
        published: parseDate(textOf(entry.querySelector("updated")) || textOf(entry.querySelector("published"))),
        author: textOf(entry.querySelector("author > name")) || ""
      };
    });
    return { title: title || sourceUrl, items };
  }

  // RSS 2.0 / RSS 1.0
  const channel = doc.querySelector("channel");
  if (channel) {
    const title = textOf(channel.querySelector("title"));
    const items = [...doc.querySelectorAll("item")].map((item) => ({
      title: textOf(item.querySelector("title")) || "(untitled)",
      link: textOf(item.querySelector("link")) || sourceUrl,
      published: parseDate(textOf(item.querySelector("pubDate")) || textOf(item.querySelector("dc\\:date"))),
      author: textOf(item.querySelector("author")) || textOf(item.querySelector("dc\\:creator")) || ""
    }));
    return { title: title || sourceUrl, items };
  }

  return { title: sourceUrl, items: [] };
}

function textOf(node) {
  return node?.textContent?.trim() ?? "";
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// JSON Feed v1.1 reference: https://www.jsonfeed.org/version/1.1/
//
// We map the JSON Feed `items[]` shape onto the same { title, link,
// published, author } shape that the existing renderer + dedup +
// filter-rule path in feed-list.js expects, so adding JSON Feed support
// requires zero downstream changes.
function parseJsonFeed(obj, sourceUrl) {
  const title = (obj.title || obj.home_page_url || obj.feed_url || sourceUrl || "").toString();
  const items = (Array.isArray(obj.items) ? obj.items : []).map((entry) => {
    // Title is optional in JSON Feed (microblogs often ship just content).
    // Fall back to a content-derived snippet so the row is still readable.
    const rawTitle = entry?.title || contentSnippet(entry?.content_text || stripHtml(entry?.content_html));
    const author = jsonFeedAuthor(entry);
    return {
      title: (rawTitle || "(untitled)").toString().trim(),
      link: (entry?.url || entry?.external_url || sourceUrl).toString(),
      published: parseDate(entry?.date_published || entry?.date_modified),
      author
    };
  });
  return { title, items };
}

function jsonFeedAuthor(entry) {
  // v1.1 uses authors[]; v1.0 used a single author object. Accept both.
  if (Array.isArray(entry?.authors) && entry.authors.length) {
    return (entry.authors[0]?.name || "").toString();
  }
  if (entry?.author && typeof entry.author === "object") {
    return (entry.author.name || "").toString();
  }
  if (typeof entry?.author === "string") return entry.author;
  return "";
}

function stripHtml(html) {
  if (!html) return "";
  // Lightweight tag-strip — JSON Feed content_html is sanitised by
  // publishers but we use it only for snippet derivation, so a regex
  // strip is enough; we never inject this anywhere.
  return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function contentSnippet(text) {
  if (!text) return "";
  const compact = String(text).replace(/\s+/g, " ").trim();
  if (compact.length <= 80) return compact;
  // Cut on word boundary near 80 chars to avoid mid-word truncation.
  return compact.slice(0, 80).replace(/\s+\S*$/, "") + "…";
}
