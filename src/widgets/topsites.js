// Vantage v0.8.0 → v1.0.0 — Most-visited sites widget (chrome.topSites) + favicon caching.

import { el, clear } from "../utils/dom.js";
import { getFaviconUrl } from "../utils/favicon-cache.js";

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
        src: "", // Will be populated async
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
    
    // Populate favicon asynchronously using cache
    const imgEl = link.querySelector("img");
    getFaviconUrl(site.url).then(dataUrl => {
      if (dataUrl) {
        imgEl.src = dataUrl;
      } else {
        imgEl.style.display = "none";
        imgEl.nextSibling.style.display = "flex";
      }
    }).catch(() => {
      imgEl.style.display = "none";
      imgEl.nextSibling.style.display = "flex";
    });
    
    row.appendChild(link);
  }
  mount.appendChild(row);
}

// Favicon loading moved to favicon-cache.js for shared use and caching (v1.0.0+)
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}
