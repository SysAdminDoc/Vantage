// Vantage — configurable iframe embed panel (flight tracker, custom URLs, etc.)

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";

export function renderEmbed(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.embed;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const title = cfg.title || "Embed";
  const url   = (cfg.url || "").trim();

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("plane", { size: 14 }), " ", title])
    ]),
    el("div", { class: "panel-header__right" }, [
      url
        ? el("a", {
            href: url, target: "_blank", rel: "noopener noreferrer",
            class: "icon-button icon-button--ghost icon-button--small",
            "aria-label": `Open ${title} in new tab`, title: "Open in new tab"
          }, [iconNode("external", { size: 14 })])
        : null
    ].filter(Boolean))
  ]);

  const body = el("div", { class: "panel-body panel-body--map" });

  if (!url) {
    body.appendChild(el("p", { class: "panel-empty" }, [
      "Add a URL in Settings \u2192 Embed."
    ]));
  } else {
    const iframe = el("iframe", {
      src: url,
      class: "map-iframe",
      // Full permissions — user chose this URL explicitly.
      allow: "geolocation; fullscreen",
      "aria-label": title
    });
    iframe.setAttribute("loading", "lazy");
    // Detect X-Frame-Options block — show fallback link
    iframe.addEventListener("error", () => {
      body.innerHTML = "";
      body.appendChild(el("div", { class: "panel-empty embed-blocked" }, [
        el("p", {}, ["This site blocked embedding."]),
        el("a", {
          href: url, target: "_blank", rel: "noopener noreferrer",
          class: "button button--ghost"
        }, [iconNode("external", { size: 14 }), " Open in new tab"])
      ]));
    });
    body.appendChild(iframe);
  }

  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) {
    onAttachDragHandle(header.querySelector(".panel-header__drag"));
  }
}
