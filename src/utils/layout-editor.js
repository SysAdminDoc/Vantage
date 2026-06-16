// Vantage v1.3.0 — Layout editor (press-and-hold to edit mode).
//
// When edit mode is active, panels show size controls and drag handles
// are highlighted. Long-press (500ms) on any panel or the "Edit layout"
// button in the utility bar activates edit mode.

import { el, toast } from "./dom.js";
import { iconNode } from "../icons.js";

let editMode = false;
let longPressTimer = null;
const SIZE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "1", label: "S" },
  { value: "2", label: "M" },
  { value: "3", label: "L" }
];

export function isEditMode() { return editMode; }

export function initLayoutEditor(settings, onSave) {
  const section = document.querySelector(".reading");
  if (!section) return () => {};

  section.addEventListener("pointerdown", onPointerDown);
  section.addEventListener("pointerup", onPointerUp);
  section.addEventListener("pointercancel", onPointerUp);

  function onPointerDown(e) {
    if (editMode) return;
    const panel = e.target.closest(".panel");
    if (!panel) return;
    longPressTimer = setTimeout(() => enterEditMode(section, settings, onSave), 500);
  }

  function onPointerUp() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  return () => {
    section.removeEventListener("pointerdown", onPointerDown);
    section.removeEventListener("pointerup", onPointerUp);
    section.removeEventListener("pointercancel", onPointerUp);
    clearTimeout(longPressTimer);
  };
}

function enterEditMode(section, settings, onSave) {
  if (editMode) return;
  editMode = true;
  section.classList.add("reading--editing");

  const panels = section.querySelectorAll(".panel");
  const sizes = settings.layout?.panelSizes || {};

  panels.forEach(panel => {
    const widget = panel.dataset.widget;
    if (!widget) return;

    const currentSize = sizes[widget] || "auto";
    applyPanelSize(panel, currentSize);

    const controls = el("div", { class: "panel-edit-controls" });
    for (const opt of SIZE_OPTIONS) {
      const btn = el("button", {
        type: "button",
        class: `panel-edit-btn${opt.value === currentSize ? " panel-edit-btn--active" : ""}`,
        "aria-label": `Size: ${opt.label}`,
        onClick: () => {
          if (!settings.layout) settings.layout = {};
          if (!settings.layout.panelSizes) settings.layout.panelSizes = {};
          settings.layout.panelSizes[widget] = opt.value;
          applyPanelSize(panel, opt.value);
          controls.querySelectorAll(".panel-edit-btn").forEach(b => b.classList.remove("panel-edit-btn--active"));
          btn.classList.add("panel-edit-btn--active");
          onSave(settings);
        }
      }, [opt.label]);
      controls.appendChild(btn);
    }
    panel.appendChild(controls);
  });

  const doneBtn = el("button", {
    type: "button",
    class: "layout-edit-done",
    onClick: () => exitEditMode(section)
  }, [iconNode("check", { size: 16 }), " Done"]);
  section.appendChild(doneBtn);

  toast("Layout edit mode — resize panels, drag to reorder. Tap Done when finished.", "info", 3000);
}

function exitEditMode(section) {
  editMode = false;
  section.classList.remove("reading--editing");
  section.querySelectorAll(".panel-edit-controls").forEach(c => c.remove());
  section.querySelector(".layout-edit-done")?.remove();
}

function applyPanelSize(panel, size) {
  if (size === "auto" || !size) {
    panel.style.gridColumn = "";
  } else {
    panel.style.gridColumn = `span ${size}`;
  }
}

export function applyPanelSizes(settings) {
  const sizes = settings.layout?.panelSizes || {};
  for (const [widget, size] of Object.entries(sizes)) {
    const panel = document.querySelector(`.panel[data-widget="${widget}"]`);
    if (panel) applyPanelSize(panel, size);
  }
}
