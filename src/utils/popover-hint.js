// Vantage v1.2.0 — Native popover="hint" helper
//
// Creates accessible, non-dismissible tooltips using the Popover API.
// Falls back to native title="" attribute on unsupported browsers.
//
// Usage:
//   const label = createPopoverHint("Click to sort", "Sort by date");
//   button.appendChild(label);
//
// The returned element is a container with an invisible popovertarget
// anchor + popover hint. Automatically closes on focus/hover leave.

const SUPPORTS_POPOVER = typeof HTMLElement !== "undefined" &&
  HTMLElement.prototype.hasOwnProperty("popover");

/**
 * Create a wrapper element with a popover="hint" tooltip.
 * 
 * @param {string} text - the visible label text
 * @param {string} hint - the popover hint text
 * @returns {HTMLElement} the wrapper (can be appended or used as textContent)
 */
export function createPopoverHint(text, hint) {
  if (!SUPPORTS_POPOVER) {
    // Fallback: return a simple span with title attribute
    const span = document.createElement("span");
    span.textContent = text;
    span.title = hint;
    return span;
  }

  const id = `popover-hint-${Math.random().toString(36).slice(2, 9)}`;
  
  const wrapper = document.createElement("span");
  wrapper.style.position = "relative";
  
  // Visible text (triggers the popover on hover/focus)
  const label = document.createElement("span");
  label.textContent = text;
  label.popovertarget = id;
  label.style.cursor = "help";
  
  // Hidden popover hint
  const popoverHint = document.createElement("div");
  popoverHint.id = id;
  popoverHint.popover = "hint";
  popoverHint.className = "popover-hint";
  popoverHint.textContent = hint;
  
  wrapper.appendChild(label);
  wrapper.appendChild(popoverHint);
  
  return wrapper;
}

/**
 * Check if popover="hint" is supported in this browser.
 */
export function supportsPopoverHint() {
  return SUPPORTS_POPOVER;
}
