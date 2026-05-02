// Vantage v1.1.0 — OffscreenCanvas pre-blur for static image backgrounds.
//
// CSS `filter: blur()` is fine for most cases — it's GPU-accelerated and
// the result is cached as a compositor layer. The trouble surfaces with
// very large images (4K+) on hardware where the GPU's blur shader runs
// at lower priority than widget repaints; users see stutter when
// dragging panels or scrolling feeds.
//
// This module pre-blurs static images ONCE via OffscreenCanvas + the
// Canvas2D `filter` property, then hands the resulting Blob URL back
// to the caller for direct `background-image` use. The browser then
// has nothing to filter on every paint — it's already a flat bitmap.
//
// Animated background and video backgrounds keep CSS `filter` (the
// pre-blur strategy doesn't help when the source pixels change every
// frame).
//
// Falls through to the original URL on any error: missing
// OffscreenCanvas (Safari < 16.4), tainted-canvas (cross-origin
// without CORS), or blur radius 0.

export function isOffscreenBlurAvailable() {
  return typeof OffscreenCanvas !== "undefined" &&
         typeof OffscreenCanvas.prototype.getContext === "function" &&
         typeof createImageBitmap === "function";
}

/** Pre-blur a static image via OffscreenCanvas. Returns a Blob URL of
 *  the blurred result, or the original `src` if pre-blur isn't
 *  applicable. The caller is responsible for revoking the returned URL
 *  when the background swaps to something else. */
export async function preblurImage(src, { blur = 0, brightness = 100 } = {}) {
  if (!isOffscreenBlurAvailable() || blur <= 0) return src;
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    // Render at native resolution so high-DPI displays don't lose
    // detail — the blur softens it anyway. Cap at 4K linear so we
    // don't pay 8K canvas cost on huge wallpapers.
    const cap = 3840;
    const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width  * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas2D context missing");
    const brightnessPart = brightness !== 100 ? ` brightness(${brightness / 100})` : "";
    ctx.filter = `blur(${blur}px)${brightnessPart}`;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    return URL.createObjectURL(out);
  } catch {
    return src;
  }
}
