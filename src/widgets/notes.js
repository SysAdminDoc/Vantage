// Vantage — Sticky Notes panel widget.

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { registerOverlay } from "../utils/overlay-stack.js";

let _uid = Date.now();
function uid() { return String(++_uid); }

const NOTE_COLORS = ["blue", "green", "yellow", "red", "mauve"];

// Track which note is expanded per mount element.
const expandedMap = new WeakMap();

export function renderNotes(mount, settings, { onChange, onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.notes;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const expandedId = expandedMap.get(mount) ?? null;
  let items = [...(cfg.items || [])];

  function saveItems() {
    const next = { ...settings, notes: { ...cfg, items } };
    onChange?.(next);
  }

  function rerender(newExpandedId) {
    expandedMap.set(mount, newExpandedId ?? null);
    renderNotes(mount, { ...settings, notes: { ...cfg, items } }, { onChange, onAttachDragHandle });
  }

  const addBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    title: "New note", "aria-label": "Add note",
    onClick: () => {
      const note = { id: uid(), title: "", content: "", color: "blue", updatedAt: Date.now() };
      items.unshift(note);
      saveItems();
      rerender(note.id);
    }
  }, [iconNode("plus", { size: 14 })]);

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("note", { size: 14 }), " Notes"])
    ]),
    el("div", { class: "panel-header__right" }, [addBtn])
  ]);

  const grid = el("div", { class: "notes-grid" });

  if (items.length === 0) {
    grid.appendChild(el("p", { class: "panel-empty" }, ["No notes yet — click + to add one."]));
  }

  for (const note of items) {
    const isExpanded = note.id === expandedId;
    grid.appendChild(isExpanded
      ? buildEditor(note, items, cfg, settings, saveItems, rerender, onAttachDragHandle, mount)
      : buildPreview(note, items, cfg, settings, saveItems, rerender));
  }

  const body = el("div", { class: "panel-body notes-body" }, [grid]);
  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));
}

function buildPreview(note, items, cfg, settings, saveItems, rerender) {
  const card = el("div", {
    class: `note-card note-card--${note.color}`,
    role: "button",
    tabindex: "0",
    "aria-label": `Edit note: ${note.title || "Untitled"}`,
    style: { cursor: "pointer" },
    onClick: () => rerender(note.id),
    onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rerender(note.id); } }
  });

  if (note.title) card.appendChild(el("div", { class: "note-preview__title" }, [note.title]));
  card.appendChild(
    note.content
      ? el("div", { class: "note-preview__content" }, [note.content.slice(0, 140) + (note.content.length > 140 ? "…" : "")])
      : el("div", { class: "note-preview__empty" }, ["Empty — click to edit"])
  );
  return card;
}

function buildEditor(note, items, cfg, settings, saveItems, rerender, onAttachDragHandle, mount) {
  const card = el("div", { class: `note-card note-card--expanded note-card--${note.color}` });

  // Color picker
  const colorRow = el("div", { class: "note-colors" });
  for (const color of NOTE_COLORS) {
    colorRow.appendChild(el("button", {
      type: "button",
      class: `note-color-btn note-color-btn--${color}${note.color === color ? " note-color-btn--active" : ""}`,
      "aria-label": color.charAt(0).toUpperCase() + color.slice(1),
      onClick: () => { note.color = color; saveItems(); rerender(note.id); }
    }));
  }

  const titleInput = el("input", {
    type: "text",
    class: "note-title-input",
    placeholder: "Title",
    value: note.title,
    "aria-label": "Note title",
    onInput: (e) => { note.title = e.target.value; },
    onBlur: () => { note.updatedAt = Date.now(); saveItems(); }
  });

  const contentArea = el("textarea", {
    class: "note-content-input",
    placeholder: "Write something…",
    "aria-label": "Note content",
    rows: "6",
    onInput: (e) => { note.content = e.target.value; },
    onBlur: () => { note.updatedAt = Date.now(); saveItems(); }
  });
  contentArea.value = note.content;

  const delBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    "aria-label": "Delete note",
    onClick: () => {
      const idx = items.indexOf(note);
      if (idx > -1) items.splice(idx, 1);
      saveItems();
      rerender(null);
      toast("Note deleted.", "warning", 6500, {
        label: "Undo",
        onClick: () => {
          items.splice(Math.max(0, idx), 0, note);
          saveItems();
          rerender(note.id);
        }
      });
    }
  }, [iconNode("trash", { size: 14 })]);

  const doneBtn = el("button", {
    type: "button",
    class: "button button--ghost button--small",
    onClick: () => { note.updatedAt = Date.now(); saveItems(); rerender(null); }
  }, ["Done"]);

  // Focus / teleprompter mode — full-screen overlay with large type and
  // optional auto-scroll. Distraction-free for long notes / cue cards.
  const focusBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    title: "Focus mode (full-screen)",
    "aria-label": "Open note in focus mode",
    onClick: () => openFocusMode(note, () => { saveItems(); rerender(note.id); })
  }, [iconNode("layout-grid", { size: 14 })]);

  card.appendChild(colorRow);
  card.appendChild(titleInput);
  card.appendChild(contentArea);
  card.appendChild(el("div", { class: "note-actions" }, [delBtn, focusBtn, doneBtn]));

  requestAnimationFrame(() => titleInput.focus({ preventScroll: true }));
  return card;
}

/** Open a note in a full-screen overlay with large centered text and an
 *  optional auto-scroll teleprompter. Closes on Esc / click-outside /
 *  the close button. Edits flow back through the supplied saver. */
function openFocusMode(note, onSave) {
  // Reuse if already open (multi-click guard).
  if (document.getElementById("notes-focus-overlay")) return;

  let scrollTimer = null;
  let scrollSpeed = 0;             // px / tick — 0 = paused
  let unregisterOverlay = null;

  const titleEl = el("input", {
    type: "text",
    class: "notes-focus__title",
    value: note.title || "",
    placeholder: "Untitled",
    "aria-label": "Note title",
    onInput: (e) => { note.title = e.target.value; },
    onBlur: () => { onSave?.(); }
  });

  const bodyEl = el("textarea", {
    class: "notes-focus__body",
    rows: "20",
    spellcheck: "true",
    "aria-label": "Note content",
    placeholder: "Type… or paste lyrics, a script, a speech.",
    onInput: (e) => { note.content = e.target.value; },
    onBlur: () => { onSave?.(); }
  });
  bodyEl.value = note.content || "";

  const speedSlider = el("input", {
    type: "range",
    min: "0", max: "100", step: "1", value: "0",
    class: "notes-focus__speed",
    "aria-label": "Auto-scroll speed",
    onInput: (e) => {
      scrollSpeed = (parseInt(e.target.value, 10) || 0) / 25; // 0–4 px / tick
    }
  });

  const close = () => {
    unregisterOverlay?.();
    unregisterOverlay = null;
    onSave?.();
    if (scrollTimer) { clearInterval(scrollTimer); scrollTimer = null; }
    overlay.remove();
  };

  const closeBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost",
    "aria-label": "Close focus mode",
    title: "Close (Esc)",
    onClick: close
  }, [iconNode("close", { size: 18 })]);

  const overlay = el("div", {
    id: "notes-focus-overlay",
    class: `notes-focus notes-focus--${note.color || "blue"}`,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Focus mode"
  }, [
    el("div", { class: "notes-focus__bar" }, [
      el("span", { class: "notes-focus__bar-label" }, ["Auto-scroll"]),
      speedSlider,
      closeBtn
    ]),
    titleEl,
    bodyEl
  ]);

  // Click outside the editor surfaces (title / body) closes.
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  unregisterOverlay = registerOverlay({
    id: "notes-focus",
    root: overlay,
    close
  });

  scrollTimer = setInterval(() => {
    if (scrollSpeed > 0 && bodyEl) {
      bodyEl.scrollTop = Math.min(bodyEl.scrollHeight, bodyEl.scrollTop + scrollSpeed);
    }
  }, 30);

  requestAnimationFrame(() => bodyEl.focus({ preventScroll: false }));
}
