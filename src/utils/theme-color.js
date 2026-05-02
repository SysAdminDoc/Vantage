// Vantage — keep `<meta name="theme-color">` in sync with the active
// background. Browsers paint their tab strip, address bar, and (on
// Android) status bar from this color, so it should match what the user
// actually sees behind widgets.
//
// Animated backgrounds dispatch `vantage:bg-color` with `{ detail: { color } }`
// each time the sky paint settles. Static backgrounds (solid / gradient /
// image / bing) call `applyThemeColorFromSettings(settings)` directly
// after they apply.

const META_ID = "vantage-theme-color";
let lastColor = null;

function ensureMeta() {
  let meta = document.getElementById(META_ID);
  if (!meta) {
    meta = document.createElement("meta");
    meta.id = META_ID;
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  return meta;
}

/** Set the active theme-color. Accepts any CSS color string. No-op on null. */
export function setThemeColor(color) {
  if (!color || color === lastColor) return;
  lastColor = color;
  ensureMeta().setAttribute("content", color);
}

/**
 * Derive a theme color directly from the user's background settings for the
 * non-animated kinds. Animated kinds live in widgets/background.js and emit
 * the `vantage:bg-color` event each paint instead.
 */
export function applyThemeColorFromSettings(settings) {
  const bg = settings?.background;
  if (!bg || bg.enabled === false) {
    // Background disabled — fall back to the resolved CSS surface variable so
    // chrome doesn't stay on a stale animated sky color.
    const surface = readCssVar("--base") || readCssVar("--surface0");
    if (surface) setThemeColor(surface);
    return;
  }

  switch (bg.kind) {
    case "solid":
      setThemeColor(bg.solid || readCssVar("--base"));
      return;
    case "gradient":
      setThemeColor(bg.gradient?.from || readCssVar("--base"));
      return;
    case "image-url":
    case "image-upload":
    case "bing-daily":
      // No reliable dominant-color extraction without canvas + cors;
      // pick the surface variable so the chrome stays in-theme.
      setThemeColor(readCssVar("--base"));
      return;
    case "animated":
    default:
      // The animated background paints; it will emit vantage:bg-color.
      // Until the first emission, use the surface base as a placeholder.
      if (lastColor == null) setThemeColor(readCssVar("--base"));
      return;
  }
}

function readCssVar(name) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || null;
  } catch {
    return null;
  }
}

/** Wire the global event listener once. Idempotent. */
export function attachThemeColorListener() {
  if (window._vantageThemeColorWired) return;
  window._vantageThemeColorWired = true;
  window.addEventListener("vantage:bg-color", (e) => {
    const color = e?.detail?.color;
    if (typeof color === "string") setThemeColor(color);
  });
}
