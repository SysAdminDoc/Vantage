// Vantage v1.3.0 — Theme marketplace client.
//
// Fetches a theme manifest from a GitHub raw URL, presents a browsable
// list, and applies selected themes by merging their tokens into settings.
// No remote marketplace fetch happens without user action — constraint #4.

const MANIFEST_URL = "https://raw.githubusercontent.com/SysAdminDoc/vantage-themes/main/manifest.json";
const CACHE_KEY = "vantageThemeMarketplace";
const CACHE_TTL = 60 * 60 * 1000;

export async function fetchThemeManifest() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached?.ts && Date.now() - cached.ts < CACHE_TTL && cached.themes?.length) {
      return cached.themes;
    }
  } catch {}

  const res = await fetch(MANIFEST_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const themes = data?.themes || [];

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ themes, ts: Date.now() }));
  } catch {}

  return themes;
}

export function applyThemeBundle(settings, theme) {
  if (theme.colors) {
    const style = document.documentElement.style;
    for (const [key, val] of Object.entries(theme.colors)) {
      style.setProperty(`--${key}`, val);
    }
  }
  if (theme.accent) settings.accent = theme.accent;
  if (theme.background?.kind) {
    settings.background = { ...settings.background, ...theme.background };
  }
  if (theme.greeting) {
    settings.greeting = { ...settings.greeting, ...theme.greeting };
  }
  if (theme.font) {
    if (!settings.appearance) settings.appearance = {};
    settings.appearance.font = { ...settings.appearance.font, ...theme.font };
  }
  return settings;
}

export function validateThemeBundle(theme) {
  const errors = [];
  if (!theme?.id) errors.push("missing id");
  if (!theme?.name) errors.push("missing name");
  if (!theme?.colors || typeof theme.colors !== "object") errors.push("missing colors object");
  return errors;
}
