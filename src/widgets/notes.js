// Vantage — Sticky Notes panel widget.

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { registerOverlay } from "../utils/overlay-stack.js";
import { i18n } from "../utils/i18n.js";

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const NOTE_COLORS = ["blue", "green", "yellow", "red", "mauve"];

function colorLabel(color) {
  if (color === "blue") return i18n("colorBlue", null, "Blue");
  if (color === "green") return i18n("colorGreen", null, "Green");
  if (color === "yellow") return i18n("colorYellow", null, "Yellow");
  if (color === "red") return i18n("colorRed", null, "Red");
  if (color === "mauve") return i18n("colorMauve", null, "Mauve");
  return color.charAt(0).toUpperCase() + color.slice(1);
}

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
    title: i18n("newNote", null, "New note"), "aria-label": i18n("addNote", null, "Add note"),
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
      el("h2", { class: "panel-header__title" }, [iconNode("note", { size: 14 }), ` ${i18n("notes")}`])
    ]),
    el("div", { class: "panel-header__right" }, [addBtn])
  ]);

  const grid = el("div", { class: "notes-grid" });

  if (items.length === 0) {
    grid.appendChild(el("p", { class: "panel-empty" }, [i18n("notesEmpty", null, "No notes yet - click + to add one.")]));
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
    "aria-label": i18n("editNoteAria", [note.title || i18n("untitled", null, "Untitled")], "Edit note: $1"),
    style: { cursor: "pointer" },
    onClick: () => rerender(note.id),
    onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rerender(note.id); } }
  });

  if (note.title) card.appendChild(el("div", { class: "note-preview__title" }, [note.title]));
  card.appendChild(
    note.content
      ? el("div", { class: "note-preview__content" }, [note.content.slice(0, 140) + (note.content.length > 140 ? "…" : "")])
      : el("div", { class: "note-preview__empty" }, [i18n("noteEmptyClickEdit", null, "Empty - click to edit")])
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
      "aria-label": colorLabel(color),
      onClick: () => { note.color = color; saveItems(); rerender(note.id); }
    }));
  }

  const titleInput = el("input", {
    type: "text",
    class: "note-title-input",
    placeholder: i18n("title", null, "Title"),
    value: note.title,
    "aria-label": i18n("noteTitle", null, "Note title"),
    onInput: (e) => { note.title = e.target.value; },
    onBlur: () => { note.updatedAt = Date.now(); saveItems(); }
  });

  const contentArea = el("textarea", {
    class: "note-content-input",
    placeholder: i18n("writeSomethingPlaceholder", null, "Write something..."),
    "aria-label": i18n("noteContent", null, "Note content"),
    rows: "6",
    onInput: (e) => { note.content = e.target.value; },
    onBlur: () => { note.updatedAt = Date.now(); saveItems(); }
  });
  contentArea.value = note.content;

  const delBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    "aria-label": i18n("deleteNote", null, "Delete note"),
    onClick: () => {
      const idx = items.indexOf(note);
      if (idx > -1) items.splice(idx, 1);
      saveItems();
      rerender(null);
      toast(i18n("noteDeleted", null, "Note deleted."), "warning", 6500, {
        label: i18n("undo", null, "Undo"),
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
  }, [i18n("done", null, "Done")]);

  // Focus / teleprompter mode — full-screen overlay with large type and
  // optional auto-scroll. Distraction-free for long notes / cue cards.
  const focusBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    title: i18n("focusModeFullScreen", null, "Focus mode (full-screen)"),
    "aria-label": i18n("openNoteFocusMode", null, "Open note in focus mode"),
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
    placeholder: i18n("untitled", null, "Untitled"),
    "aria-label": i18n("noteTitle", null, "Note title"),
    onInput: (e) => { note.title = e.target.value; },
    onBlur: () => { onSave?.(); }
  });

  const bodyEl = el("textarea", {
    class: "notes-focus__body",
    rows: "20",
    spellcheck: "true",
    "aria-label": i18n("noteContent", null, "Note content"),
    placeholder: i18n("noteFocusPlaceholder", null, "Type... or paste lyrics, a script, a speech."),
    onInput: (e) => { note.content = e.target.value; },
    onBlur: () => { onSave?.(); }
  });
  bodyEl.value = note.content || "";

  const speedSlider = el("input", {
    type: "range",
    min: "0", max: "100", step: "1", value: "0",
    class: "notes-focus__speed",
    "aria-label": i18n("autoScrollSpeed", null, "Auto-scroll speed"),
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
    "aria-label": i18n("closeFocusMode", null, "Close focus mode"),
    title: i18n("close", null, "Close"),
    onClick: close
  }, [iconNode("close", { size: 18 })]);

  const overlay = el("div", {
    id: "notes-focus-overlay",
    class: `notes-focus notes-focus--${note.color || "blue"}`,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": i18n("focusMode", null, "Focus mode")
  }, [
    el("div", { class: "notes-focus__bar" }, [
      el("span", { class: "notes-focus__bar-label" }, [i18n("autoScroll", null, "Auto-scroll")]),
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
