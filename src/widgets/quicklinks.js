// Vantage v0.2.0 — quick links as a horizontal pill row

import { el, clear, hostnameLabel } from "../utils/dom.js";

export function renderQuickLinks(mount, settings) {
  clear(mount);
  if (!settings.quicklinks.enabled || !settings.quicklinks.items.length) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  for (const item of settings.quicklinks.items) {
    const link = el("a", {
      class: "quicklink",
      href: item.url,
      title: item.url,
      "aria-label": `${item.title} (${hostnameLabel(item.url)})`
    }, [
      el("img", {
        class: "quicklink__favicon",
        src: faviconFor(item.url),
        alt: "",
        loading: "lazy",
        referrerpolicy: "no-referrer",
        onError: (e) => { e.target.style.visibility = "hidden"; }
      }),
      el("span", {}, [item.title])
    ]);
    mount.appendChild(link);
  }
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}
