// OPML 2.0 generator + parser for Vantage RSS / News feeds.
// Export bundles both panels into one file; import distributes by category attr.

import { normalizeWebUrl } from "./url-safety.js";

export function exportOPML(settings) {
  const date = new Date().toUTCString();
  const rssFeeds  = settings.rss?.feeds  || [];
  const newsFeeds = settings.news?.feeds || [];

  const outlineEl = (feed, category) =>
    `      <outline type="rss" text="${escXml(feed.title || feed.url)}" xmlUrl="${escXml(feed.url)}" category="${category}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Vantage Feeds</title>
    <dateCreated>${date}</dateCreated>
  </head>
  <body>
    <outline text="Reading list">
${rssFeeds.map(f => outlineEl(f, "rss")).join("\n")}
    </outline>
    <outline text="News">
${newsFeeds.map(f => outlineEl(f, "news")).join("\n")}
    </outline>
  </body>
</opml>`;
}

export function importOPML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid OPML — could not parse XML");

  const rss = [], news = [];
  doc.querySelectorAll("outline[xmlUrl]").forEach((o) => {
    const url = normalizeWebUrl(o.getAttribute("xmlUrl"));
    if (!url) return;
    const feed = {
      title: o.getAttribute("text") || o.getAttribute("title") || url,
      url
    };
    // Use category attr if present; otherwise check parent outline text.
    const cat = (o.getAttribute("category") || "").toLowerCase();
    const parentText = (o.parentElement?.getAttribute("text") || "").toLowerCase();
    if (cat === "news" || parentText === "news") {
      news.push(feed);
    } else {
      rss.push(feed);
    }
  });
  return { rss, news };
}

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
