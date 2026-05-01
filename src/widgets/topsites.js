// Vantage v0.8.0 — Most-visited sites widget (chrome.topSites).

import { el, clear } from "../utils/dom.js";

export async function renderTopsites(mount, settings) {
  clear(mount);
  const cfg = settings.topsites;
  if (!cfg?.enabled) { mount.style.display = "none"; return; }
  mount.style.display = "";

  const chromeApi = globalThis.chrome;
  if (!chromeApi?.topSites?.get) {
    mount.style.display = "none";
    return;
  }

  let sites = [];
  try {
    sites = await chromeApi.topSites.get();
  } catch {
    mount.style.display = "none";
    return;
  }

  const max = Math.min(cfg.maxItems ?? 8, sites.length);
  if (!max) { mount.style.display = "none"; return; }

  const row = el("div", { class: "topsites" });
  for (const site of sites.slice(0, max)) {
    const link = el("a", {
      class: "topsite",
      href: site.url,
      title: site.title || site.url,
      "aria-label": site.title || site.url
    }, [
      el("img", {
        class: "topsite__favicon",
        src: faviconFor(site.url),
        alt: "",
        loading: "lazy",
        referrerpolicy: "no-referrer",
        onError: (e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }
      }),
      el("span", { class: "topsite__fallback", "aria-hidden": "true" }, [
        (site.title?.[0] || "?").toUpperCase()
      ]),
      el("span", { class: "topsite__label" }, [site.title || hostnameShort(site.url)])
    ]);
    row.appendChild(link);
  }
  mount.appendChild(row);
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch { return ""; }
}

function hostnameShort(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}
