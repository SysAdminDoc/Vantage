// Vantage — Daily Photo panel widget. Sources: Picsum (no key) or NASA APOD.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";

export function renderPhoto(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.photo;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("image", { size: 14 }), " Photo of the Day"])
    ]),
    el("div", { class: "panel-header__right" })
  ]);

  const body = el("div", { class: "panel-body photo-body" });
  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));

  const dateStr = new Date().toISOString().slice(0, 10);

  if (cfg.source === "nasa") {
    loadNasa(body, cfg.nasaKey || "DEMO_KEY");
  } else {
    loadPicsum(body, dateStr);
  }
}

function loadPicsum(body, dateStr) {
  const seed = dateStr.replace(/-/g, "");
  const img  = el("img", {
    src: `https://picsum.photos/seed/${seed}/800/420`,
    class: "photo-img",
    alt: "Daily photo",
    loading: "lazy"
  });
  img.addEventListener("load", () => { img.dataset.loaded = "true"; });
  img.addEventListener("error", () => {
    body.innerHTML = "";
    body.appendChild(el("p", { class: "panel-error" }, ["Couldn't load photo."]));
  });
  const credit = el("div", { class: "photo-credit" }, [
    "Photo via ",
    el("a", { href: "https://picsum.photos", target: "_blank", rel: "noopener noreferrer" }, ["Picsum Photos"])
  ]);
  body.appendChild(img);
  body.appendChild(credit);
}

async function loadNasa(body, apiKey) {
  body.appendChild(el("div", { class: "panel-spinner" }, [iconNode("refresh", { size: 20, className: "spin" })]));
  try {
    const resp = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`);
    if (!resp.ok) throw new Error(`NASA API ${resp.status}`);
    const data = await resp.json();
    body.innerHTML = "";
    if (data.media_type !== "image") {
      // APOD video days happen ~1× / month. Render the official
      // thumbnail (when NASA includes one) with a play badge so the
      // panel still feels visual instead of an empty hint with a bare
      // text link. Falls back gracefully if `thumbnail_url` is absent.
      const wrap = el("a", {
        href: data.url || "https://apod.nasa.gov/apod/",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "photo-video-fallback",
        "aria-label": `Watch ${data.title || "today's APOD video"}`
      });
      if (data.thumbnail_url) {
        const thumb = el("img", {
          src: data.thumbnail_url,
          class: "photo-img",
          alt: data.title || "NASA APOD video thumbnail",
          loading: "lazy"
        });
        thumb.addEventListener("load", () => { thumb.dataset.loaded = "true"; });
        wrap.appendChild(thumb);
        const overlay = el("span", { class: "photo-video-fallback__overlay", "aria-hidden": "true" }, [
          iconNode("play", { size: 28 })
        ]);
        wrap.appendChild(overlay);
      } else {
        wrap.appendChild(el("span", { class: "photo-video-fallback__icon", "aria-hidden": "true" }, [
          iconNode("play", { size: 28 })
        ]));
        wrap.appendChild(el("span", { class: "photo-video-fallback__label" }, [
          "Today\u2019s APOD is a video — open in a new tab"
        ]));
      }
      const credit = el("div", { class: "photo-credit" }, [
        el("strong", {}, [data.title || "Astronomy Picture of the Day"]),
        " — NASA APOD video",
        data.copyright ? ` © ${data.copyright.trim()}` : ""
      ]);
      body.appendChild(wrap);
      body.appendChild(credit);
      return;
    }
    const img = el("img", {
      src: data.hdurl || data.url,
      class: "photo-img",
      alt: data.title || "NASA APOD",
      loading: "lazy"
    });
    img.addEventListener("load", () => { img.dataset.loaded = "true"; });
    const credit = el("div", { class: "photo-credit" }, [
      el("strong", {}, [data.title || "Astronomy Picture of the Day"]),
      " — NASA APOD",
      data.copyright ? ` © ${data.copyright.trim()}` : ""
    ]);
    body.appendChild(img);
    body.appendChild(credit);
  } catch (err) {
    body.innerHTML = "";
    body.appendChild(el("p", { class: "panel-error" }, [`Couldn't load NASA APOD — ${err.message.toLowerCase()}.`]));
  }
}
