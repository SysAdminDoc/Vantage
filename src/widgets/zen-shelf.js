// Vantage — Zen Shelf: free-position text and image stickers on the dashboard canvas.

import { el, clear, toast } from "../utils/dom.js";
import { iconNode } from "../icons.js";
import { normalizeWebUrl } from "../utils/url-safety.js";
import { i18n } from "../utils/i18n.js";

const STICKER_COLORS = [
  "#fef3c7",
  "#dbeafe",
  "#dcfce7",
  "#fce7f3",
  "#f3e8ff"
];

const STICKER_TEXT_COLOR = "#1e1e2e";

let _uid = Date.now();
function uid() { return String(++_uid); }

export function renderZenShelf(mount, settings, { onSave } = {}) {
  clear(mount);
  const cfg = settings.zenShelf;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  let stickers = [...(cfg.stickers || [])];

  function persist() {
    const next = { ...settings, zenShelf: { ...cfg, stickers } };
    onSave?.(next);
  }

  for (const sticker of stickers) {
    mount.appendChild(buildSticker(sticker, stickers, persist, mount, settings, cfg, onSave));
  }

  const addBtn = el("button", {
    type: "button",
    class: "zen-shelf__add",
    title: i18n("addSticker", null, "Add sticker"),
    "aria-label": i18n("addSticker", null, "Add sticker"),
    onClick: () => {
      const colorIdx = stickers.length % STICKER_COLORS.length;
      const s = {
        id: uid(),
        type: "text",
        content: "",
        x: Math.round(window.innerWidth / 2 - 80),
        y: Math.round(window.innerHeight / 2 - 50),
        width: 180,
        height: 140,
        color: STICKER_COLORS[colorIdx]
      };
      stickers.push(s);
      persist();
      renderZenShelf(mount, { ...settings, zenShelf: { ...cfg, stickers } }, { onSave });
    }
  }, [iconNode("plus", { size: 18 })]);

  mount.appendChild(addBtn);
}

function buildSticker(sticker, stickers, persist, mount, settings, cfg, onSave) {
  const stickerEl = el("div", {
    class: "zen-sticker",
    style: {
      left: `${sticker.x}px`,
      top: `${sticker.y}px`,
      width: `${sticker.width}px`,
      height: `${sticker.height}px`,
      backgroundColor: sticker.color,
      color: STICKER_TEXT_COLOR
    }
  });

  // Header bar (drag handle + close)
  const closeBtn = el("button", {
    type: "button",
    class: "zen-sticker__close",
    "aria-label": i18n("deleteSticker", null, "Delete sticker"),
    onClick: () => {
      const idx = stickers.indexOf(sticker);
      if (idx > -1) stickers.splice(idx, 1);
      persist();
      renderZenShelf(mount, { ...settings, zenShelf: { ...cfg, stickers } }, { onSave });
    }
  }, ["×"]);

  const bar = el("div", { class: "zen-sticker__bar" }, [
    el("span", {}, [sticker.type === "image" ? i18n("image", null, "Image") : i18n("note", null, "Note")]),
    closeBtn
  ]);

  // Drag
  bar.addEventListener("mousedown", (e) => {
    if (e.target === closeBtn || closeBtn.contains(e.target)) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = sticker.x;
    const origY = sticker.y;

    const onMove = (ev) => {
      sticker.x = Math.max(0, origX + ev.clientX - startX);
      sticker.y = Math.max(0, origY + ev.clientY - startY);
      stickerEl.style.left = `${sticker.x}px`;
      stickerEl.style.top = `${sticker.y}px`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      persist();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  // Body
  let body;
  if (sticker.type === "image") {
    const imageUrl = normalizeWebUrl(sticker.content);
    body = el("div", { class: "zen-sticker__body" }, imageUrl
      ? [el("img", {
          src: imageUrl,
          alt: i18n("stickerImage", null, "Sticker image"),
          draggable: "false",
          style: { maxWidth: "100%", height: "auto" }
        })]
      : [i18n("stickerImageEmpty", null, "Double-click to add an image URL.")]);
    body.addEventListener("dblclick", () => {
      const url = prompt(i18n("imageUrlPrompt", null, "Image URL:"), sticker.content || "");
      if (url !== null) {
        const nextUrl = normalizeWebUrl(url);
        if (url.trim() && !nextUrl) {
          toast(i18n("addValidImageUrl", null, "Add a valid image URL."), "error");
          return;
        }
        sticker.content = nextUrl;
        persist();
        renderZenShelf(mount, { ...settings, zenShelf: { ...cfg, stickers } }, { onSave });
      }
    });
  } else {
    body = el("div", {
      class: "zen-sticker__body",
      contentEditable: "false"
    });
    if (sticker.content) body.textContent = sticker.content;

    body.addEventListener("dblclick", () => {
      body.contentEditable = "true";
      body.focus();
    });
    body.addEventListener("blur", () => {
      body.contentEditable = "false";
      sticker.content = body.textContent;
      persist();
    });
    body.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        body.contentEditable = "false";
        sticker.content = body.textContent;
        persist();
      }
    });
  }

  // Resize handle
  const resizeHandle = el("div", { class: "zen-sticker__resize" });
  resizeHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = sticker.width;
    const origH = sticker.height;

    const onMove = (ev) => {
      sticker.width = Math.max(120, origW + ev.clientX - startX);
      sticker.height = Math.max(80, origH + ev.clientY - startY);
      stickerEl.style.width = `${sticker.width}px`;
      stickerEl.style.height = `${sticker.height}px`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      persist();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  stickerEl.appendChild(bar);
  stickerEl.appendChild(body);
  stickerEl.appendChild(resizeHandle);

  return stickerEl;
}
