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
    const presetSnap = workspace.presets[presetIdx].snapshot;
    snap = { ...snap, ...presetSnap };
    if (snap.background && presetSnap.background) {
      snap.background = { ...snap.background, ...presetSnap.background };
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

export function duplicateWorkspace(workspace, existingWorkspaces = [], { nameSuffix = "copy" } = {}) {
  const source = workspace && typeof workspace === "object" ? workspace : {};
  const clone = cloneValue(source);
  clone.id = createWorkspaceId(existingWorkspaces);
  clone.name = uniqueName(source.name || "Workspace", existingWorkspaces.map(ws => ws?.name), nameSuffix);
  clone.snapshot = source.snapshot == null ? null : cloneValue(source.snapshot);
  if (Array.isArray(source.presets)) clone.presets = cloneValue(source.presets);
  if (source.activePreset != null) clone.activePreset = source.activePreset;
  return clone;
}

export function createWorkspaceId(existingWorkspaces = []) {
  return uniqueId("ws", existingWorkspaces.map(ws => ws?.id));
}

export function duplicateQuickLinkGroup(group, existingGroups = [], { nameSuffix = "copy" } = {}) {
  const source = group && typeof group === "object" ? group : {};
  const clone = cloneValue(source);
  const baseName = source.name || source.title || "Group";
  clone.id = uniqueId("group", existingGroups.map(item => item?.id));
  clone.name = uniqueName(baseName, existingGroups.map(item => item?.name || item?.title), nameSuffix);
  clone.items = Array.isArray(source.items) ? cloneValue(source.items) : [];
  delete clone.title;
  return clone;
}

function uniqueName(baseName, existingNames, suffix) {
  const base = String(baseName || "Item").trim() || "Item";
  const taken = new Set((existingNames || []).filter(Boolean).map(name => String(name).trim().toLowerCase()));
  let candidate = `${base} (${suffix})`;
  let counter = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base} (${suffix} ${counter})`;
    counter++;
  }
  return candidate;
}

function uniqueId(prefix, existingIds) {
  const taken = new Set((existingIds || []).filter(Boolean).map(String));
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = `${prefix}-${randomId()}`;
    if (!taken.has(id)) return id;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneValue(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}
