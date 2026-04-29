// Vantage v0.1.0 — quick-links widget (favicons + titles)

import { el, clear } from "../utils/dom.js";

export function renderQuickLinks(mount, settings) {
  clear(mount);
  if (!settings.quicklinks.enabled || !settings.quicklinks.items.length) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  mount.appendChild(el("div", { class: "widget-title" }, ["Quick Links"]));

  const list = el("div", { class: "quicklinks-list" });
  for (const item of settings.quicklinks.items) {
    const favicon = faviconFor(item.url);
    const link = el("a", { class: "quicklink", href: item.url, title: item.url }, [
      el("img", { class: "quicklink-favicon", src: favicon, alt: "", loading: "lazy", referrerpolicy: "no-referrer" }),
      el("span", {}, [item.title])
    ]);
    list.appendChild(link);
  }
  mount.appendChild(list);
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    // Google's favicon service is a privacy-acceptable choice for v0.1.0; replaceable in settings.
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}
