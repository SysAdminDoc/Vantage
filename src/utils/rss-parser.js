// Vantage v0.6.0 — RSS / Atom feed parser via DOMParser.
// Tries direct fetch first; on CORS failure walks a proxy fallback chain.
// allorigins.win and corsproxy.io both return raw XML content.

const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

export async function fetchFeed(url) {
  let xmlText;

  // Direct fetch first — works for most feeds that send permissive CORS headers.
  try {
    const direct = await fetch(url, { cache: "no-store" });
    if (!direct.ok) throw new Error(`HTTP ${direct.status}`);
    xmlText = await direct.text();
  } catch {
    // Walk the proxy chain until one succeeds.
    let lastErr;
    for (const proxyFn of PROXIES) {
      try {
        const proxied = await fetch(proxyFn(url), { cache: "no-store" });
        if (!proxied.ok) throw new Error(`Proxy HTTP ${proxied.status}`);
        xmlText = await proxied.text();
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!xmlText) throw lastErr || new Error("All proxies failed");
  }

  return parseFeed(xmlText, url);
}

export function parseFeed(xmlText, sourceUrl = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) throw new Error("Could not parse feed XML");

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
