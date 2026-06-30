// Vantage — Daily Photo panel widget. Sources: Picsum (no key) or NASA APOD.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { i18n } from "../utils/i18n.js";

const APOD_RATE_LIMIT_TTL_MS = 60 * 60 * 1000;
const APOD_SHORT_ERROR_TTL_MS = 5 * 60 * 1000;
const APOD_CACHED_ERROR_STATUSES = new Set([403, 404, 429]);

export function renderPhoto(mount, settings, { onAttachDragHandle, onSave } = {}) {
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
      el("h2", { class: "panel-header__title" }, [iconNode("image", { size: 14 }), ` ${i18n("photoOfTheDay")}`])
    ]),
    el("div", { class: "panel-header__right" })
  ]);

  const body = el("div", { class: "panel-body photo-body" });
  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));

  const dateStr = new Date().toISOString().slice(0, 10);

  if (cfg.source === "nasa") {
    loadNasa(body, settings, dateStr, { onSave });
  } else {
    loadPicsum(body, dateStr);
  }
}

function loadPicsum(body, dateStr) {
  const seed = dateStr.replace(/-/g, "");
  const img  = el("img", {
    src: `https://picsum.photos/seed/${seed}/800/420`,
    class: "photo-img",
    alt: i18n("dailyPhoto", null, "Daily photo"),
    loading: "lazy"
  });
  img.addEventListener("load", () => { img.dataset.loaded = "true"; });
  img.addEventListener("error", () => {
    body.innerHTML = "";
    body.appendChild(el("p", { class: "panel-error" }, [i18n("photoLoadError", null, "Couldn't load photo.")]));
  });
  const credit = el("div", { class: "photo-credit" }, [
    "Photo via ",
    el("a", { href: "https://picsum.photos", target: "_blank", rel: "noopener noreferrer" }, ["Picsum Photos"])
  ]);
  body.appendChild(img);
  body.appendChild(credit);
}

async function loadNasa(body, settings, dateStr, { onSave } = {}) {
  const cfg = settings.photo || {};
  const apiKey = cfg.nasaKey || "DEMO_KEY";
  const cacheKey = apodCacheKey(dateStr, apiKey);
  const cached = cfg.apodCache;

  if (cached?.key === cacheKey && cached.data) {
    renderNasaData(body, cached.data);
    return;
  }

  const cachedError = cached?.key === cacheKey ? cached.error : null;
  const retryAt = cachedError ? Date.parse(cachedError.retryAt || "") : 0;
  if (retryAt > Date.now()) {
    renderNasaError(body, apodErrorMessage(cachedError.status, retryAt));
    return;
  }

  body.appendChild(el("div", { class: "panel-spinner" }, [iconNode("refresh", { size: 20, className: "spin" })]));
  try {
    const resp = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}&date=${encodeURIComponent(dateStr)}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (APOD_CACHED_ERROR_STATUSES.has(resp.status)) {
      const ttl = resp.status === 429 ? APOD_RATE_LIMIT_TTL_MS : APOD_SHORT_ERROR_TTL_MS;
      const retryAtIso = new Date(Date.now() + ttl).toISOString();
      saveApodCache(settings, cfg, {
        key: cacheKey,
        fetchedAt: new Date().toISOString(),
        error: { status: resp.status, retryAt: retryAtIso }
      }, onSave);
      renderNasaError(body, apodErrorMessage(resp.status, Date.parse(retryAtIso)));
      return;
    }
    if (!resp.ok) throw new Error(`NASA API ${resp.status}`);
    const data = normalizeApodData(await resp.json());
    saveApodCache(settings, cfg, {
      key: cacheKey,
      fetchedAt: new Date().toISOString(),
      data
    }, onSave);
    renderNasaData(body, data);
  } catch (err) {
    renderNasaError(body, i18n("nasaApodLoadError", [err.message.toLowerCase()], "Couldn't load NASA APOD - $1."));
  }
}

function renderNasaData(body, data) {
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
      "aria-label": i18n("watchApodVideo", [data.title || i18n("todaysApodVideo", null, "today's APOD video")], "Watch $1")
    });
    if (data.thumbnail_url) {
      const thumb = el("img", {
        src: data.thumbnail_url,
        class: "photo-img",
        alt: data.title || i18n("nasaApodVideoThumbnail", null, "NASA APOD video thumbnail"),
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
        i18n("apodVideoOpenHint", null, "Today's APOD is a video - open in a new tab")
      ]));
    }
    const credit = el("div", { class: "photo-credit" }, [
      el("strong", {}, [data.title || i18n("astronomyPictureOfTheDay", null, "Astronomy Picture of the Day")]),
      " - NASA APOD video",
      data.copyright ? ` © ${data.copyright.trim()}` : ""
    ]);
    body.appendChild(wrap);
    body.appendChild(credit);
    return;
  }

  const img = el("img", {
    src: data.hdurl || data.url,
    class: "photo-img",
    alt: data.title || i18n("nasaApod", null, "NASA APOD"),
    loading: "lazy"
  });
  img.addEventListener("load", () => { img.dataset.loaded = "true"; });
  const credit = el("div", { class: "photo-credit" }, [
    el("strong", {}, [data.title || i18n("astronomyPictureOfTheDay", null, "Astronomy Picture of the Day")]),
    " - NASA APOD",
    data.copyright ? ` © ${data.copyright.trim()}` : ""
  ]);
  body.appendChild(img);
  body.appendChild(credit);
}

function renderNasaError(body, message) {
  body.innerHTML = "";
  body.appendChild(el("p", { class: "panel-error" }, [message]));
}

function normalizeApodData(data) {
  return {
    title: data?.title || "",
    media_type: data?.media_type || "",
    url: data?.url || "",
    hdurl: data?.hdurl || "",
    thumbnail_url: data?.thumbnail_url || "",
    copyright: typeof data?.copyright === "string" ? data.copyright : ""
  };
}

function saveApodCache(settings, cfg, apodCache, onSave) {
  if (typeof onSave !== "function") return;
  onSave({ ...settings, photo: { ...cfg, apodCache } });
}

function apodCacheKey(dateStr, apiKey) {
  const keyMode = apiKey && apiKey !== "DEMO_KEY" ? "custom" : "demo";
  return `${dateStr}:${keyMode}`;
}

function apodErrorMessage(status, retryAtMs) {
  const retry = Number.isFinite(retryAtMs)
    ? new Date(retryAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "later";
  if (status === 429) {
    return i18n("nasaApodRateLimited", [retry], "NASA APOD is rate limited - add a free API key in Settings -> Photo, or try again after $1.");
  }
  if (status === 404) {
    return i18n("nasaApodNotAvailable", [retry], "NASA APOD is not available for today's date yet - trying again after $1.");
  }
  if (status === 403) {
    return i18n("nasaApodRejected", [retry], "NASA APOD rejected this request - check the API key in Settings -> Photo, or try again after $1.");
  }
  return i18n("nasaApodRateLimited", [retry], "NASA APOD is rate limited - add a free API key in Settings -> Photo, or try again after $1.");
}
