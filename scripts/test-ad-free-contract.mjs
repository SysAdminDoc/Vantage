#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json"]);
const PROHIBITED_RUNTIME_MARKERS = [
  /doubleclick\.net/i,
  /googlesyndication\.com/i,
  /googleadservices\.com/i,
  /amazon-adsystem\.com/i,
  /taboola\.com/i,
  /outbrain\.com/i,
  /\badsbygoogle\b/i,
  /\bgoogletag\b/i,
  /data-ad-client/i,
  /data-ad-slot/i
];

async function collectTextFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const next = join(path, entry.name);
    if (entry.isDirectory()) return collectTextFiles(next);
    return TEXT_EXTENSIONS.has(extname(entry.name)) ? [next] : [];
  }));
  return nested.flat();
}

const runtimeFiles = [
  join(ROOT, "newtab.html"),
  join(ROOT, "sidepanel.html"),
  join(ROOT, "manifest.json"),
  join(ROOT, "manifest.firefox.json"),
  ...(await collectTextFiles(join(ROOT, "src")))
];

for (const file of runtimeFiles) {
  const source = await readFile(file, "utf8");
  for (const marker of PROHIBITED_RUNTIME_MARKERS) {
    assert.equal(marker.test(source), false, `${file} contains prohibited ad-runtime marker ${marker}`);
  }
}

const embedSource = await readFile(join(ROOT, "src", "widgets", "embed.js"), "utf8");
const windySource = await readFile(join(ROOT, "src", "widgets", "windy.js"), "utf8");
const externalWidgetSource = await readFile(join(ROOT, "src", "widgets", "external-widget.js"), "utf8");
const settingsSource = await readFile(join(ROOT, "src", "settings.js"), "utf8");

assert.match(embedSource, /sandbox = "allow-scripts allow-same-origin allow-popups allow-forms"/);
assert.doesNotMatch(embedSource, /sandbox !== false/);
assert.match(windySource, /sandbox: "allow-scripts allow-same-origin allow-popups"/);
assert.match(embedSource, /panel-provider-boundary/);
assert.match(windySource, /panel-provider-boundary/);
assert.match(externalWidgetSource, /panel-provider-boundary/);
assert.match(settingsSource, /cannot remove provider content, ads, or tracking/i);

console.log("ad-free contract tests");
console.log("  PASS  first-party runtime has no known ad SDK or ad-network markers");
console.log("  PASS  third-party frames are sandboxed and visibly disclosed");
