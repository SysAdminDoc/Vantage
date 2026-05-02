// Vantage v1.1.0 — dashboard screenshot export.
//
// Renders the live dashboard DOM into a PNG via SVG <foreignObject> rasterization.
// Intentionally avoids `chrome.tabs.captureVisibleTab` so we don't need the
// `tabs` permission (privacy-first, constraint #1). Also avoids vendoring
// html2canvas (~250 KB) — the foreignObject path is ~150 lines and renders
// any styled DOM the browser already lays out.
//
// Limitations (documented in the toast):
//   • External cross-origin <img> / CSS background-image (Bing daily, NASA
//     APOD, favicons from s2/favicons) won't appear in the export — browsers
//     block CORS-tainted images from rasterizing into a canvas. Bundled
//     backgrounds, animated SVG, and inline content all render correctly.
//   • Iframe widgets (Windy, generic Embed) are sandboxed origins; they
//     render as their wrapper background, not the embedded content.
//
// The button lives in Settings → Data; downstream of a user gesture, so
// no permission prompt and no autoplay-policy issues with audio/video.

const SVG_NS  = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/** Serialize every accessible stylesheet on the page into one CSS string.
 *  Cross-origin sheets throw on `cssRules` access — those are skipped with
 *  a console.warn so the user gets a graceful (if slightly off-style) image.
 */
function inlineStyleSheets() {
  const out = [];
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of rules) out.push(rule.cssText);
    } catch (err) {
      console.warn("[vantage screenshot] skipping cross-origin stylesheet:", sheet.href);
    }
  }
  return out.join("\n");
}

/** Build an SVG document whose <foreignObject> holds a clone of `node`.
 *  The clone is wrapped in a <div> so we can re-apply the <html dir/lang>
 *  attributes for RTL correctness in the exported image.
 */
function buildSVGString(node, width, height, css) {
  const clone = node.cloneNode(true);

  // Strip elements that should never appear in a shareable screenshot —
  // toasts, modals, and the settings panel itself (which the user may have
  // open when triggering capture). Also drop the skip-to-main link.
  const stripSelectors = [
    "#toast-host",
    "#settings-backdrop",
    "#settings-panel",
    "#widget-picker",
    ".skip-to-main",
    "[data-screenshot-strip]",
  ];
  for (const sel of stripSelectors) {
    for (const n of clone.querySelectorAll(sel)) n.remove();
  }

  const serializer = new XMLSerializer();
  const inner = serializer.serializeToString(clone);

  // Mirror html[dir] / html[lang] onto the wrapper so RTL renders correctly.
  const dir  = document.documentElement.getAttribute("dir")  || "ltr";
  const lang = document.documentElement.getAttribute("lang") || "en";

  // Inline the page background color so the canvas isn't transparent
  // when the live background is animated/SVG (which we strip via
  // `#background-mount` having cross-origin or canvas-rendered content
  // in some kinds).
  const bg = getComputedStyle(document.body).backgroundColor || "#1e1e2e";

  // foreignObject must contain valid namespaced XHTML; that's what the
  // serializer emits when we clone a regular HTML body.
  return `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <foreignObject width="100%" height="100%">
      <div xmlns="${XHTML_NS}" dir="${dir}" lang="${lang}" style="width:${width}px;height:${height}px;background:${bg};font-family:system-ui,sans-serif;">
        <style>${css}</style>
        ${inner}
      </div>
    </foreignObject>
  </svg>`;
}

/** Convert an SVG string into a rasterized PNG Blob via an offscreen canvas. */
async function svgToPngBlob(svgString, width, height, scale = 1) {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    // Image() in Chromium triggers `decode()` once `src` is set.
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width  = width  * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob returned null")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function timestampSlug() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Public entrypoint: capture the current dashboard surface to a PNG and
 *  trigger a browser download. Returns `{ filename, bytes }` on success.
 *  Throws with a human-readable message on failure.
 */
export async function captureScreenshot({ scale = 2 } = {}) {
  const root = document.getElementById("vantage-root") || document.body;
  const rect = root.getBoundingClientRect();
  // Use the full scrollable extent so off-screen reading panels are included.
  const width  = Math.max(rect.width,  root.scrollWidth);
  const height = Math.max(rect.height, root.scrollHeight);

  if (width < 1 || height < 1) throw new Error("Dashboard not ready — try again in a moment.");

  const css = inlineStyleSheets();
  const svg = buildSVGString(root, width, height, css);
  const png = await svgToPngBlob(svg, width, height, scale);

  const filename = `vantage-dashboard_${timestampSlug()}.png`;
  const dlUrl = URL.createObjectURL(png);
  const a = Object.assign(document.createElement("a"), { href: dlUrl, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so Firefox has time to start the download.
  setTimeout(() => URL.revokeObjectURL(dlUrl), 5_000);

  return { filename, bytes: png.size };
}
