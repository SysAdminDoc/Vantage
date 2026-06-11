// Vantage — Daily Quote widget (slim banner between hero and reading panels).

import { el, clear } from "../utils/dom.js";
import { iconNode } from "../icons.js";

const QUOTES = [
  { content: "The best way to predict the future is to invent it.", author: "Alan Kay", categories: ["technology", "inspirational"] },
  { content: "Simplicity is the soul of efficiency.", author: "Austin Freeman", categories: ["technology"] },
  { content: "Make it work, make it right, make it fast.", author: "Kent Beck", categories: ["technology"] },
  { content: "First, solve the problem. Then, write the code.", author: "John Johnson", categories: ["technology"] },
  { content: "The function of good software is to make the complex appear simple.", author: "Grady Booch", categories: ["technology"] },
  { content: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House", categories: ["technology"] },
  { content: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson", categories: ["technology"] },
  { content: "The most dangerous phrase in the language is 'we've always done it this way.'", author: "Grace Hopper", categories: ["technology", "life"] },
  { content: "Act as if what you do makes a difference. It does.", author: "William James", categories: ["life", "inspirational"] },
  { content: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", categories: ["life", "inspirational"] },
  { content: "Well done is better than well said.", author: "Benjamin Franklin", categories: ["life", "inspirational"] },
  { content: "The secret of getting ahead is getting started.", author: "Mark Twain", categories: ["inspirational"] },
  { content: "Energy and persistence conquer all things.", author: "Benjamin Franklin", categories: ["inspirational"] },
  { content: "Lost time is never found again.", author: "Benjamin Franklin", categories: ["life"] },
];

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
    quote = pickQuote(cfg.category || "random");
    const next = { ...settings, quote: { ...cfg, cached: { ...quote, date: today } } };
    onSave?.(next);
  }

  const refreshBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--tiny quote-refresh",
    "aria-label": "New quote",
    title: "Refresh quote",
    onClick: async () => {
      const fresh = pickQuote(cfg.category || "random");
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

function pickQuote(category) {
  const pool = category && category !== "random"
    ? QUOTES.filter((q) => q.categories.includes(category))
    : QUOTES;
  const quote = (pool.length ? pool : QUOTES)[Math.floor(Math.random() * (pool.length || QUOTES.length))];
  return { content: quote.content, author: quote.author };
}
