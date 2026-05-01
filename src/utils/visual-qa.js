const THEME_VALUES = new Set(["system", "mocha", "macchiato", "frappe", "latte"]);
const ACCENT_VALUES = new Set(["mauve", "blue", "green", "peach", "teal", "lavender", "red", "flamingo", "sky"]);
const MOTION_VALUES = new Set(["system", "still", "calm", "full"]);
const ATMOSPHERE_VALUES = new Set(["soft", "balanced", "vivid"]);
const READABILITY_VALUES = new Set(["minimal", "standard", "high"]);
const LOCALITY_VALUES = new Set(["auto", "coastal", "urban", "forest", "lake", "mountain", "desert", "polar", "tropical", "meadow", "default"]);

const QA_KEYS = [
  "qaTheme",
  "qaAccent",
  "qaMotion",
  "qaAtmosphere",
  "qaReadability",
  "qaLocality"
];

function cloneSettings(settings) {
  return typeof structuredClone === "function"
    ? structuredClone(settings)
    : JSON.parse(JSON.stringify(settings));
}

function getAllowed(params, key, allowed) {
  const value = params.get(key);
  return allowed.has(value) ? value : null;
}

export function hasVisualQaOverrides(query = globalThis.location?.search || "") {
  const params = new URLSearchParams(query);
  return QA_KEYS.some((key) => params.has(key));
}

export function applyVisualQaOverrides(settings, query = globalThis.location?.search || "") {
  if (!settings || !hasVisualQaOverrides(query)) return settings;

  const params = new URLSearchParams(query);
  const theme = getAllowed(params, "qaTheme", THEME_VALUES);
  const accent = getAllowed(params, "qaAccent", ACCENT_VALUES);
  const motion = getAllowed(params, "qaMotion", MOTION_VALUES);
  const atmosphere = getAllowed(params, "qaAtmosphere", ATMOSPHERE_VALUES);
  const readability = getAllowed(params, "qaReadability", READABILITY_VALUES);
  const locality = getAllowed(params, "qaLocality", LOCALITY_VALUES);

  if (!theme && !accent && !motion && !atmosphere && !readability && !locality) return settings;

  const next = cloneSettings(settings);
  if (theme) next.theme = theme;
  if (accent) next.accent = accent;

  if (motion || atmosphere || readability) {
    next.background = {
      ...(next.background || {}),
      kind: "animated",
      ...(motion ? { motion } : {}),
      ...(atmosphere ? { atmosphere } : {}),
      ...(readability ? { readability } : {})
    };
  }

  if (locality) {
    next.appearance = {
      ...(next.appearance || {}),
      locality
    };
  }

  return next;
}
