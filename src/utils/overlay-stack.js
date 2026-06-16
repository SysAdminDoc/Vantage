// Shared LIFO close priority for modal-ish UI surfaces.
//
// Individual overlays still own their local behavior (arrow-key menu
// navigation, focus traps, animations). This module owns the global
// questions: which open surface gets Escape first, and which one closes
// when the user clicks outside.

const stack = [];
let listenersAttached = false;
let suppressNextClick = false;

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resolveNode(value) {
  return typeof value === "function" ? value() : value;
}

function containsTarget(entry, target) {
  const nodes = [...entry.roots, ...entry.triggers].map(resolveNode).filter(Boolean);
  return nodes.some(node => node === target || node.contains?.(target));
}

function cleanupDeadEntries() {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const entry = stack[i];
    const roots = entry.roots.map(resolveNode).filter(Boolean);
    const active = entry.isActive?.() ?? roots.some(node => document.contains(node));
    if (!active) stack.splice(i, 1);
  }
  if (!stack.length) detachListeners();
}

function topEntry() {
  cleanupDeadEntries();
  return stack[stack.length - 1] || null;
}

function shouldHandle(option, event, entry) {
  if (typeof option === "function") return option(event, entry) !== false;
  return option !== false;
}

function closeEntry(entry, reason, event) {
  unregisterEntry(entry);
  try {
    entry.close?.({ reason, event });
  } catch (err) {
    console.warn("[Vantage] overlay close failed", err);
  }
}

function onKeydown(event) {
  if (event.key !== "Escape") return;
  const entry = topEntry();
  if (!entry || !shouldHandle(entry.closeOnEscape, event, entry)) return;
  event.preventDefault();
  event.stopPropagation();
  closeEntry(entry, "escape", event);
}

function onPointerDown(event) {
  const entry = topEntry();
  if (!entry || !shouldHandle(entry.closeOnOutside, event, entry)) return;
  if (containsTarget(entry, event.target)) return;
  suppressNextClick = true;
  event.preventDefault();
  event.stopPropagation();
  closeEntry(entry, "outside", event);
}

function onClick(event) {
  if (!suppressNextClick) return;
  suppressNextClick = false;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function attachListeners() {
  if (listenersAttached) return;
  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("click", onClick, true);
  listenersAttached = true;
}

function detachListeners() {
  if (!listenersAttached) return;
  document.removeEventListener("keydown", onKeydown, true);
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("click", onClick, true);
  listenersAttached = false;
  suppressNextClick = false;
}

function unregisterEntry(entry) {
  const idx = stack.indexOf(entry);
  if (idx !== -1) stack.splice(idx, 1);
  if (!stack.length) detachListeners();
}

export function registerOverlay({
  id,
  roots,
  root,
  triggers,
  trigger,
  close,
  closeOnEscape = true,
  closeOnOutside = true,
  isActive
} = {}) {
  const entry = {
    id: id || `overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    roots: [...toArray(roots), ...toArray(root)],
    triggers: [...toArray(triggers), ...toArray(trigger)],
    close,
    closeOnEscape,
    closeOnOutside,
    isActive
  };
  stack.push(entry);
  attachListeners();
  return () => unregisterEntry(entry);
}

export function hasOpenOverlay() {
  return Boolean(topEntry());
}

export function topOverlayId() {
  return topEntry()?.id || null;
}
