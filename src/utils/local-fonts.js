// Vantage v1.1.0 — Local Font Access API helper.
//
// Chrome 103+ / Edge 103+ ships `window.queryLocalFonts()`. Firefox +
// Safari don't yet. The first call triggers the browser's native
// "allow access to your local fonts" prompt; users can revoke via
// the URL bar's site-permissions UI.
//
// Privacy-aligned: no outbound network call. Fonts load from disk.
// Returned font names DO leak which fonts are installed on the
// machine — the API explicitly requires user consent for that
// reason. Vantage only calls this when the user explicitly opens
// the picker in Settings → Appearance → Typography.

export function isAvailable() {
  return typeof window?.queryLocalFonts === "function";
}

/** Query installed fonts and return a deduped, sorted list of family
 *  names. Each entry is the FontData.family string from the API.
 *  Throws on permission denial or API absence so the caller can show
 *  an inline notice. */
export async function listFontFamilies() {
  if (!isAvailable()) throw new Error("Local Font Access API unavailable");
  const fonts = await window.queryLocalFonts();
  if (!Array.isArray(fonts)) throw new Error("Empty font list");
  const families = new Set();
  for (const f of fonts) {
    if (f?.family && typeof f.family === "string") families.add(f.family);
  }
  return [...families].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** Apply user-selected fonts to the live page by overriding the
 *  --font-sans + --font-display custom properties on :root. Empty
 *  values clear the override so the built-in stack reapplies. */
export function applyFontPreference({ body = "", display = "" } = {}) {
  const root = document.documentElement;
  if (body) {
    // Quote the family name to survive spaces ("Source Sans Pro").
    // Append the existing stack as a fallback so a missing font
    // doesn't blank the page on a different machine.
    root.style.setProperty("--font-sans", `"${body.replace(/"/g, '\\"')}", ui-sans-serif, system-ui, sans-serif`);
  } else {
    root.style.removeProperty("--font-sans");
  }
  if (display) {
    root.style.setProperty("--font-display", `"${display.replace(/"/g, '\\"')}", var(--font-sans)`);
  } else {
    root.style.removeProperty("--font-display");
  }
}
