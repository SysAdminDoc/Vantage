// Vantage — service worker. Opens a new tab when the toolbar action is clicked.
// Firefox exposes `browser` as a global; Chrome does not. We use whichever is present.
// Chrome navigates to chrome://newtab so the override fires; Firefox opens a blank tab
// which Firefox itself routes to our overridden newtab page.
const isFirefox = typeof browser !== "undefined";
const ext = isFirefox ? browser : chrome;

ext.action.onClicked.addListener(() => {
  isFirefox ? ext.tabs.create({}) : ext.tabs.create({ url: "chrome://newtab" });
});

// Side panel (Chrome 114+) — re-apply the user's saved
// "openOnActionClick" preference each time the worker spins up.
// Without this, the action button reverts to its default behavior
// after the worker idles. Silently no-ops on Firefox + older Chrome.
async function applySidePanelBehavior() {
  if (isFirefox || !ext.sidePanel?.setPanelBehavior) return;
  try {
    const stored = await ext.storage.local.get("vantageSettings");
    const flag = !!stored?.vantageSettings?.sidePanel?.openOnActionClick;
    await ext.sidePanel.setPanelBehavior({ openPanelOnActionClick: flag });
  } catch { /* ignore — feature is optional */ }
}
applySidePanelBehavior();
ext.runtime?.onStartup?.addListener?.(applySidePanelBehavior);
ext.runtime?.onInstalled?.addListener?.(applySidePanelBehavior);
ext.storage?.onChanged?.addListener?.((changes, area) => {
  if (area === "local" && changes.vantageSettings) applySidePanelBehavior();
});
