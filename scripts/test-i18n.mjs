#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = join(ROOT, "_locales");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function keysOf(catalog) {
  return Object.keys(catalog).sort();
}

function placeholders(message) {
  return [...String(message).matchAll(/\$([A-Za-z0-9_]+)\$/g)]
    .map(match => match[1])
    .filter(name => !/^\d+$/.test(name))
    .sort();
}

async function collectSourceKeys() {
  const files = [
    "newtab.html",
    "sidepanel.html",
    "src/main.js",
    "src/sidepanel.js",
    "src/onboarding.js",
    "src/widget-picker.js"
  ];
  const keys = new Set();
  const patterns = [
    /\bi18n\("([^"]+)"/g,
    /data-i18n(?:-[a-z-]+)?="([^"]+)"/g
  ];
  for (const file of files) {
    const source = await readFile(join(ROOT, file), "utf8");
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

async function testLocaleParity() {
  const localeNames = (await readdir(LOCALES_DIR)).sort();
  assert.ok(localeNames.includes("en"), "English locale must exist");

  const catalogs = new Map();
  for (const name of localeNames) {
    catalogs.set(name, await readJson(join(LOCALES_DIR, name, "messages.json")));
  }

  const en = catalogs.get("en");
  const expectedKeys = keysOf(en);
  const expectedSet = new Set(expectedKeys);
  for (const [locale, catalog] of catalogs) {
    const actualKeys = keysOf(catalog);
    assert.deepEqual(actualKeys, expectedKeys, `${locale} locale keys must match en exactly`);
    for (const key of expectedKeys) {
      assert.equal(typeof catalog[key]?.message, "string", `${locale}.${key} must have a message`);
      assert.notEqual(catalog[key].message.trim(), "", `${locale}.${key} must not be empty`);
      assert.deepEqual(
        placeholders(catalog[key].message),
        placeholders(en[key].message),
        `${locale}.${key} placeholders must match en`
      );
    }
  }

  const sourceKeys = await collectSourceKeys();
  for (const key of sourceKeys) {
    assert.ok(expectedSet.has(key), `source references missing i18n key: ${key}`);
  }
}

async function testRuntimeFallbacks() {
  const mod = await import(`${pathToFileURL(join(ROOT, "src/utils/i18n.js")).href}?test=${Date.now()}`);
  const { FALLBACK_MESSAGES, i18n, localizeDocument, setupRTL } = mod;
  const en = await readJson(join(LOCALES_DIR, "en", "messages.json"));
  for (const key of Object.keys(FALLBACK_MESSAGES)) {
    assert.ok(en[key], `fallback key must exist in en catalog: ${key}`);
  }

  delete globalThis.browser;
  delete globalThis.chrome;
  assert.equal(i18n("setupStepOf", [2, 3]), "Step 2 of 3");
  assert.equal(i18n("noItems", ["bookmarks"]), "No bookmarks yet");

  const textNode = { dataset: { i18n: "widgets" }, textContent: "" };
  const ariaNode = { dataset: { i18nAriaLabel: "refreshFeeds" }, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  localizeDocument({
    querySelectorAll(selector) {
      if (selector === "[data-i18n]") return [textNode];
      if (selector === "[data-i18n-aria-label]") return [ariaNode];
      return [];
    }
  });
  assert.equal(textNode.textContent, "Widgets");
  assert.equal(ariaNode.attrs["aria-label"], "Refresh feeds");

  const attrs = {};
  globalThis.document = { documentElement: { setAttribute(k, v) { attrs[k] = v; } } };
  globalThis.browser = { i18n: { getUILanguage: () => "ar-EG" } };
  setupRTL();
  assert.equal(attrs.lang, "ar-EG");
  assert.equal(attrs.dir, "rtl");
  globalThis.browser = { i18n: { getUILanguage: () => "es" } };
  setupRTL();
  assert.equal(attrs.lang, "es");
  assert.equal(attrs.dir, "ltr");
  delete globalThis.document;
  delete globalThis.browser;
}

await testLocaleParity();
await testRuntimeFallbacks();

console.log("i18n tests");
console.log("  PASS  locale keys and placeholders are in parity");
console.log("  PASS  source references resolve to locale messages");
console.log("  PASS  fallback substitutions, DOM localization, and RTL setup");
