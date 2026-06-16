// Vantage v0.8.0 — Workspace snapshot helpers.

/**
 * Apply a workspace snapshot over the base settings, returning a merged copy.
 * Workspaces override visual atmosphere, layout.panels, quicklinks, and
 * per-widget enabled flags stored under snapshot.enabled.
 */
export function applyWorkspace(baseSettings, workspace) {
  if (!workspace?.snapshot) return baseSettings;
  const s = baseSettings;
  let snap = workspace.snapshot;

  const presetIdx = workspace.activePreset;
  if (presetIdx != null && workspace.presets?.[presetIdx]?.snapshot) {
    snap = { ...snap, ...workspace.presets[presetIdx].snapshot };
    if (snap.background && workspace.presets[presetIdx].snapshot.background) {
      snap.background = { ...workspace.snapshot.background, ...workspace.presets[presetIdx].snapshot.background };
    }
  }

  const merged = { ...s };

  if (snap.theme !== undefined)      merged.theme = snap.theme;
  if (snap.accent !== undefined)     merged.accent = snap.accent;
  if (snap.appearance !== undefined) merged.appearance = { ...s.appearance, ...snap.appearance };
  if (snap.background !== undefined) merged.background = { ...s.background, ...snap.background };
  if (snap.layout !== undefined)     merged.layout    = { ...s.layout,    ...snap.layout };
  if (snap.quicklinks !== undefined) merged.quicklinks = { ...s.quicklinks, ...snap.quicklinks };

  if (snap.enabled) {
    for (const [key, val] of Object.entries(snap.enabled)) {
      if (merged[key] && typeof merged[key] === "object") {
        merged[key] = { ...merged[key], enabled: val };
      }
    }
  }
  return merged;
}

/**
 * Resolve the settings object that should drive rendering for the current
 * active workspace.
 */
export function resolveWorkspaceSettings(settings) {
  const activeWs = getActiveWorkspace(settings);
  return activeWs ? applyWorkspace({ ...settings }, activeWs) : settings;
}

/**
 * Get the active workspace object from settings, or null.
 */
export function getActiveWorkspace(settings) {
  const id = settings?.workspaces?.active;
  if (!id) return null;
  return settings.workspaces?.list?.find(w => w.id === id) ?? null;
}

/**
 * Create a snapshot from the current settings state.
 */
export function captureSnapshot(settings) {
  const widgetKeys = ["weather","clock","greeting","quicklinks","worldclock","quote","pomodoro",
    "todo","notes","bookmarks","crypto","github","photo","countdown","converter",
    "news","rss","calendar","windy","airquality","background","topsites"];
  const enabled = {};
  for (const k of widgetKeys) {
    if (typeof settings[k]?.enabled === "boolean") enabled[k] = settings[k].enabled;
  }
  return {
    theme:      settings.theme,
    accent:     settings.accent,
    appearance: { ...settings.appearance },
    background: { ...settings.background },
    layout:     { ...settings.layout },
    quicklinks: { ...settings.quicklinks },
    enabled
  };
}
