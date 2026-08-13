#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const headed = process.argv.includes("--headed");
const extensionPath = resolve(ROOT, argValue("--extension-dir") || "dist/unpacked-firefox");
const manifestPath = join(extensionPath, "manifest.json");

if (!existsSync(manifestPath)) {
  throw new Error(`Firefox extension build not found: ${manifestPath}. Run npm run build:unpacked:firefox first.`);
}

const firefoxPath = resolveFirefoxPath();
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.deepEqual(
  manifest.background?.scripts,
  ["src/background.js"],
  "Firefox MV3 must use a background event-page script"
);
assert.equal(
  manifest.background?.type,
  undefined,
  "Firefox 109 compatibility requires the classic event-page declaration"
);
assert.equal(
  manifest.background?.service_worker,
  undefined,
  "Firefox does not support background.service_worker"
);

const profile = await mkdtemp(join(tmpdir(), "vantage-firefox-smoke-"));
let browser;
try {
  const { default: puppeteer } = await import("puppeteer");
  browser = await puppeteer.launch({
    browser: "firefox",
    executablePath: firefoxPath,
    headless: !headed,
    userDataDir: profile,
    enableExtensions: true,
    timeout: 30000
  });

  const expectedId = manifest.browser_specific_settings?.gecko?.id;
  const firstId = await browser.installExtension(extensionPath);
  assert.equal(firstId, expectedId, "Firefox returned an unexpected add-on ID");
  console.log(`  PASS  Firefox install - ${manifest.name} v${manifest.version} (${firstId})`);
  console.log("  PASS  Firefox background - MV3 event-page manifest accepted");

  await browser.uninstallExtension(firstId);
  const secondId = await browser.installExtension(extensionPath);
  assert.equal(secondId, expectedId, "Firefox add-on ID changed after reinstall");
  console.log("  PASS  Firefox lifecycle - temporary uninstall and reinstall preserve the declared ID");
  console.log(`  Browser: ${await browser.version()}`);
} finally {
  if (browser) await browser.close();
  await rm(profile, { recursive: true, force: true });
}

function argValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function resolveFirefoxPath() {
  const explicit = argValue("--firefox-path") || process.env.FIREFOX_BINARY;
  const candidates = [
    explicit,
    process.platform === "win32" ? "C:/Program Files/Firefox Developer Edition/firefox.exe" : "",
    process.platform === "win32" ? "C:/Program Files/Mozilla Firefox/firefox.exe" : "",
    process.platform === "darwin" ? "/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox" : "",
    process.platform === "darwin" ? "/Applications/Firefox.app/Contents/MacOS/firefox" : "",
    process.platform === "linux" ? "/usr/bin/firefox-developer-edition" : "",
    process.platform === "linux" ? "/usr/bin/firefox" : ""
  ].filter(Boolean);
  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) {
    throw new Error("Firefox binary not found. Pass --firefox-path or set FIREFOX_BINARY.");
  }
  return found;
}
