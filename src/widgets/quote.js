// Vantage — Daily Quote widget (slim banner between hero and reading panels).

import { el, clear } from "../utils/dom.js";
import { iconNode } from "../icons.js";

const FALLBACK_QUOTES = [
  { content: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { content: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { content: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { content: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { content: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { content: "The function of good software is to make the complex appear simple.", author: "Grady Booch" },
  { content: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { content: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { content: "The most dangerous phrase in the language is 'we've always done it this way.'", author: "Grace Hopper" },
  { content: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
];

const TAG_MAP = {
  random:        "",
  inspirational: "inspirational",
  technology:    "technology",
  life:          "life",
};

export async function renderQuote(mount, settings, { onSave } = {}) {
  clear(mount);
  const cfg = settings.quote;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const today = new Date().toISOString().slice(0, 10);
  let quote   = null;

  // Use cached quote if still today
  if (cfg.cached?.date === today && cfg.cached.content) {
    quote = cfg.cached;
  } else {
    quote = await fetchQuote(cfg.category || "random");
    if (quote) {
      const next = { ...settings, quote: { ...cfg, cached: { ...quote, date: today } } };
      onSave?.(next);
    } else {
      quote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    }
  }

  const refreshBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--tiny quote-refresh",
    "aria-label": "New quote",
    title: "Refresh quote",
    onClick: async () => {
      const fresh = await fetchQuote(cfg.category || "random") || FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      const next  = { ...settings, quote: { ...cfg, cached: { ...fresh, date: today } } };
      onSave?.(next);
      renderQuote(mount, next, { onSave });
    }
  }, [iconNode("refresh", { size: 12 })]);

  // Author name links to Wikipedia. Direct slug first; if Wikipedia
  // doesn't have the article the user lands on the search page, which
  // is still better than a dead anchor. We don't fetch from Wikipedia
  // here — that would mean adding wikipedia.org to host_permissions
  // and an extra request on every new tab. Click-through-to-Wikipedia
  // gives users the bio + dates the ROADMAP item asked for, with zero
  // privacy / permission cost.
  const authorHref = wikipediaLinkFor(quote.author);
  const authorEl = authorHref
    ? el("a", {
        class: "quote-author quote-author--link",
        href: authorHref,
        target: "_blank",
        rel: "noopener noreferrer",
        title: `Look up ${quote.author} on Wikipedia`
      }, ["\u2014 ", quote.author])
    : el("cite", { class: "quote-author" }, ["\u2014 ", quote.author]);

  mount.appendChild(el("div", { class: "quote-banner", role: "complementary", "aria-label": "Quote of the day" }, [
    el("div", { class: "quote-content" }, [
      el("q", { class: "quote-text" }, [quote.content]),
      authorEl
    ]),
    refreshBtn
  ]));
}

function wikipediaLinkFor(author) {
  if (!author || typeof author !== "string") return null;
  const trimmed = author.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown" || trimmed.toLowerCase() === "anonymous") {
    return null;
  }
  // Wikipedia article slugs use underscores; encodeURIComponent handles the
  // rest (accents, ampersands, em-dashes in pen names, etc.).
  const slug = encodeURIComponent(trimmed.replace(/\s+/g, "_"));
  return `https://en.wikipedia.org/wiki/${slug}`;
}

async function fetchQuote(category) {
  try {
    const tag  = TAG_MAP[category] || "";
    const url  = tag
      ? `https://api.quotable.io/quotes/random?limit=1&tags=${tag}`
      : `https://api.quotable.io/quotes/random?limit=1`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return null;
    const [q] = await resp.json();
    return q ? { content: q.content, author: q.author } : null;
  } catch {
    return null;
  }
}
