import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const requiredFiles = [
  "newtab.html",
  "qa-scenes.html",
  "src/settings.js",
  "src/widgets/background.js",
  "src/style.css",
  "src/utils/browser-shim.js",
  "src/utils/background-preview.js"
];

function fail(message) {
  console.error(`[qa-scenes] ${message}`);
  process.exit(1);
}

function readRequired(path) {
  const full = join(root, path);
  if (!existsSync(full)) fail(`Missing ${path}`);
  return readFileSync(full, "utf8");
}

for (const file of requiredFiles) readRequired(file);

const gallery = readRequired("qa-scenes.html");
const sceneUrls = [...gallery.matchAll(/<iframe[^>]+src="([^"]+)"/g)].map((match) =>
  match[1].replaceAll("&amp;", "&")
);

if (sceneUrls.length < 8) fail(`Expected at least 8 QA scenes, found ${sceneUrls.length}`);

for (const src of sceneUrls) {
  const url = new URL(src, "http://vantage.local/");
  if (!url.pathname.endsWith("/newtab.html")) fail(`Scene does not target newtab.html: ${src}`);
  for (const param of ["qaWeather", "qaTime", "qaDate", "qaLocality"]) {
    if (!url.searchParams.has(param)) fail(`Scene missing ${param}: ${src}`);
  }
}

const settings = readRequired("src/settings.js");
const background = readRequired("src/widgets/background.js");
const styles = readRequired("src/style.css");
const preview = readRequired("src/utils/background-preview.js");
const newtab = readRequired("newtab.html");

const probes = [
  [settings, "BACKGROUND_PRESETS", "settings background presets"],
  [settings, "buildScenePreviewControls", "settings scene preview controls"],
  [settings, "Readability", "settings readability control"],
  [background, "getBackgroundPreview", "renderer preview hook"],
  [background, "dataset.readability", "renderer readability data attribute"],
  [styles, ".visual-preset-grid", "preset styles"],
  [styles, ".scene-preview__grid", "preview styles"],
  [styles, "[data-readability=\"high\"]", "readability styles"],
  [preview, "BACKGROUND_PREVIEW_EVENT", "preview event export"],
  [newtab, "src/utils/browser-shim.js", "local browser API shim"]
];

for (const [source, needle, label] of probes) {
  if (!source.includes(needle)) fail(`Missing ${label}`);
}

console.log(`[qa-scenes] OK: ${sceneUrls.length} scenes and visual-control hooks verified.`);
