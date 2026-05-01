// Vantage — shared theme helpers.

export const THEME_OPTIONS = [
  { value: "system",    label: "System"    },
  { value: "mocha",     label: "Mocha"     },
  { value: "macchiato", label: "Macchiato" },
  { value: "frappe",    label: "Frappe"    },
  { value: "latte",     label: "Latte"     }
];

const THEME_VALUES = new Set(THEME_OPTIONS.map((theme) => theme.value));
const DARK_FALLBACK = "mocha";

function systemTheme() {
  return globalThis.matchMedia?.("(prefers-color-scheme: light)")?.matches
    ? "latte"
    : DARK_FALLBACK;
}

export function normalizeThemePreference(value) {
  return THEME_VALUES.has(value) ? value : DARK_FALLBACK;
}

export function resolveThemePreference(value) {
  const preference = normalizeThemePreference(value);
  return preference === "system" ? systemTheme() : preference;
}

export function applyThemePreference(value, root = globalThis.document?.documentElement) {
  if (!root) return DARK_FALLBACK;
  const preference = normalizeThemePreference(value);
  const resolved = resolveThemePreference(preference);
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  return resolved;
}

export function onSystemThemeChange(callback) {
  const media = globalThis.matchMedia?.("(prefers-color-scheme: light)");
  if (!media || typeof callback !== "function") return () => {};
  const handler = () => callback(systemTheme());
  if (media.addEventListener) {
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }
  if (media.addListener) {
    media.addListener(handler);
    return () => media.removeListener(handler);
  }
  return () => {};
}
