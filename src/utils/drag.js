// Vantage v0.3.0 — small drag-to-reorder helper using HTML5 drag/drop.
// Used for quick-link pills and reading panels.

/**
 * Make an array of elements reorderable.
 *
 * @param {Object} opts
 * @param {HTMLElement[]} opts.items - DOM nodes (e.g. quicklinks, panels)
 * @param {function(number, number): void} opts.onReorder - called with (fromIdx, toIdx)
 * @param {string} [opts.dragClass="is-dragging"]
 * @param {string} [opts.targetClass="is-drop-target"]
 * @param {function(HTMLElement): HTMLElement} [opts.handle] - optional accessor for the drag-handle inside an item.
 *        If provided, only the handle starts the drag.
 * @returns {function(): void} cleanup
 */
export function makeReorderable({ items, onReorder, dragClass = "is-dragging", targetClass = "is-drop-target", handle }) {
  if (!items || !items.length) return () => {};

  let srcIdx = -1;

  const cleanups = [];

  items.forEach((item, idx) => {
    const trigger = handle ? handle(item) : item;
    if (!trigger) return;
    trigger.setAttribute("draggable", "true");
    trigger.style.cursor = "grab";

    const onStart = (e) => {
      srcIdx = idx;
      item.classList.add(dragClass);
      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(idx));
        // Make the drag image be the whole item (not just the handle) when handle is used
        if (handle && item !== trigger) {
          e.dataTransfer.setDragImage(item, 12, 12);
        }
      } catch { /* some browsers throw on dataTransfer */ }
    };
    const onEnd = () => {
      item.classList.remove(dragClass);
      items.forEach((el) => el.classList.remove(targetClass));
      srcIdx = -1;
    };

    const onOver = (e) => {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "move"; } catch {}
      if (srcIdx === -1 || srcIdx === idx) return;
      item.classList.add(targetClass);
    };
    const onLeave = () => item.classList.remove(targetClass);
    const onDrop = (e) => {
      e.preventDefault();
      item.classList.remove(targetClass);
      if (srcIdx === -1 || srcIdx === idx) return;
      onReorder(srcIdx, idx);
      srcIdx = -1;
    };

    trigger.addEventListener("dragstart", onStart);
    trigger.addEventListener("dragend", onEnd);
    item.addEventListener("dragover", onOver);
    item.addEventListener("dragleave", onLeave);
    item.addEventListener("drop", onDrop);

    cleanups.push(() => {
      trigger.removeEventListener("dragstart", onStart);
      trigger.removeEventListener("dragend", onEnd);
      item.removeEventListener("dragover", onOver);
      item.removeEventListener("dragleave", onLeave);
      item.removeEventListener("drop", onDrop);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

/** Move an array element from one index to another, returning a new array. */
export function arrayMove(arr, from, to) {
  const out = arr.slice();
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}
