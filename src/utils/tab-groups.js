// Vantage v1.2.0 — Chrome Tab Groups quick-link support
//
// Allows users to pin Tab Groups as quick-links. When clicked, the pinned
// group is activated (brought to focus). Dynamically determines group color
// and displays it in the quick-link UI.
//
// Requirements: Chrome 88+ (Tab Groups API)
// Feature detection: chrome.tabGroups is available (Chrome only, not Edge private)

export const SUPPORTS_TAB_GROUPS = !!globalThis.chrome?.tabGroups;

/**
 * Get all available Tab Groups for the current window.
 * 
 * @returns {Promise<Array>} Tab Groups with { id, title, color, windowId }
 */
export async function getTabGroups() {
  if (!SUPPORTS_TAB_GROUPS) return [];
  
  try {
    const groups = await globalThis.chrome.tabGroups.query({});
    return groups.map(g => ({
      id: g.id,
      title: g.title || "(unnamed group)",
      color: g.color,
      windowId: g.windowId,
      collapsed: g.collapsed
    }));
  } catch (e) {
    console.warn("Tab Groups query failed:", e);
    return [];
  }
}

/**
 * Activate a Tab Group by bringing it to focus.
 * This switches to the group's window (if needed) and makes the group visible.
 * 
 * @param {number} groupId - The Tab Group ID to activate
 * @returns {Promise<void>}
 */
export async function activateTabGroup(groupId) {
  if (!SUPPORTS_TAB_GROUPS) return;
  
  try {
    // First, uncollapse the group (if collapsed)
    await globalThis.chrome.tabGroups.update(groupId, { collapsed: false });
    
    // Get the group to find its window, then switch to that window
    const group = await globalThis.chrome.tabGroups.get(groupId);
    if (group && group.windowId) {
      await globalThis.chrome.windows.update(group.windowId, { focused: true });
    }
    
    // Get the first tab in this group to bring it to focus
    const tabs = await globalThis.chrome.tabs.query({ groupId });
    if (tabs.length > 0) {
      await globalThis.chrome.tabs.update(tabs[0].id, { active: true });
    }
  } catch (e) {
    console.warn("Failed to activate Tab Group", groupId, e);
  }
}

/**
 * Get the color label for a Tab Group color value.
 * 
 * @param {string} color - The group's color (e.g., "red", "blue", "green")
 * @returns {string} Human-readable color label
 */
export function getColorLabel(color) {
  const labels = {
    red: "Red",
    yellow: "Yellow",
    green: "Green",
    blue: "Blue",
    purple: "Purple",
    cyan: "Cyan",
    orange: "Orange",
    pink: "Pink",
    grey: "Grey"
  };
  return labels[color?.toLowerCase()] || "Grey";
}

/**
 * Get CSS-friendly color class for displaying a Tab Group color.
 * 
 * @param {string} color - The group's color
 * @returns {string} CSS class name like "tab-group-color--red"
 */
export function getColorClass(color) {
  return `tab-group-color--${color?.toLowerCase() || "grey"}`;
}
