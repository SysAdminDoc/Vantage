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

// Feed pre-warming — chrome.alarms periodic alarm refreshes the
// RSS / News feed cache on a user-configured interval (default 1 h).
// Off by default; opt-in via Settings -> Feed pre-warming. Uses
// chrome.alarms (already permitted) instead of the Periodic
// Background Sync API to skip the sensitive permission prompt.
const PREWARM_ALARM = "vantage-feed-prewarm";

async function syncPrewarmAlarm() {
  if (!ext.alarms) return;
  try {
    const stored = await ext.storage.local.get("vantageSettings");
    const cfg = stored?.vantageSettings?.feedPreWarm || {};
    const enabled = !!cfg.enabled;
    const minutes = Math.max(15, Math.min(720, parseInt(cfg.intervalMinutes, 10) || 60));
    if (enabled) {
      // Reuse-or-create — alarm.create with the same name overwrites.
      ext.alarms.create(PREWARM_ALARM, { periodInMinutes: minutes });
    } else {
      ext.alarms.clear(PREWARM_ALARM);
    }
  } catch { /* ignore */ }
}
syncPrewarmAlarm();
ext.runtime?.onStartup?.addListener?.(syncPrewarmAlarm);
ext.runtime?.onInstalled?.addListener?.(syncPrewarmAlarm);
ext.storage?.onChanged?.addListener?.((changes, area) => {
  if (area === "local" && changes.vantageSettings) syncPrewarmAlarm();
});

if (ext.alarms?.onAlarm) {
  ext.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== PREWARM_ALARM) return;
    try {
      const stored = await ext.storage.local.get("vantageSettings");
      const settings = stored?.vantageSettings || {};
      const urls = [
        ...(settings.rss?.feeds  || []).map(f => f.url),
        ...(settings.news?.feeds || []).map(f => f.url)
      ].filter(Boolean);
      if (!urls.length) return;
      const { prewarmAll } = await import("./utils/feed-prewarm.js");
      await prewarmAll(urls);
    } catch (err) {
      console.warn("[vantage] feed pre-warm tick failed:", err.message);
    }
  });
}
