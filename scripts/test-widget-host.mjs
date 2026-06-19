#!/usr/bin/env node
// Regression tests for the external widget manifest trust boundary.

import { strict as assert } from "node:assert";
import { fetchManifest, normalizeWidgetHttpsUrl, sanitizeWidgetSize, validateManifest } from "../src/utils/widget-host.js";

const VALID_MANIFEST = Object.freeze({
  id: "sample-widget",
  name: "Sample Widget",
  src: "https://widgets.example.com/widget.html",
  version: "1.0.0"
});

let passed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result?.then) {
      return result.then(() => {
        passed++;
        console.log(`  PASS  ${name}`);
      }).catch((err) => fail(name, err));
    }
    passed++;
    console.log(`  PASS  ${name}`);
    return Promise.resolve();
  } catch (err) {
    fail(name, err);
    return Promise.resolve();
  }
}

function fail(name, err) {
  console.error(`  FAIL  ${name}`);
  console.error(`        ${err.message}`);
  process.exitCode = 1;
}

console.log("Widget host tests\n");

await test("valid manifest passes validation", () => {
  assert.deepEqual(validateManifest(VALID_MANIFEST), []);
});

await test("malformed HTTPS-like src is rejected", () => {
  const errors = validateManifest({ ...VALID_MANIFEST, src: "https://" });
  assert.ok(errors.includes("src must be a valid HTTPS URL"));
});

await test("credentialed widget src is rejected", () => {
  const errors = validateManifest({ ...VALID_MANIFEST, src: "https://user:pass@widgets.example.com/widget.html" });
  assert.ok(errors.includes("src must be a valid HTTPS URL"));
});

await test("manifest URLs normalize to HTTPS hrefs", () => {
  assert.equal(normalizeWidgetHttpsUrl(" https://widgets.example.com/widget.json "), "https://widgets.example.com/widget.json");
  assert.equal(normalizeWidgetHttpsUrl("http://widgets.example.com/widget.json"), "");
  assert.equal(normalizeWidgetHttpsUrl("https://user:pass@widgets.example.com/widget.json"), "");
});

await test("non-HTTPS homepage is rejected", () => {
  const errors = validateManifest({ ...VALID_MANIFEST, homepage: "javascript:alert(1)" });
  assert.ok(errors.includes("homepage must be a valid HTTPS URL"));
});

await test("oversized default frames are rejected", () => {
  const errors = validateManifest({
    ...VALID_MANIFEST,
    sizes: { default: { width: 5000, height: 240 } }
  });
  assert.ok(errors.includes("default width must be 160-1200px"));
});

await test("invalid widget sizes fall back to the default frame", () => {
  assert.deepEqual(sanitizeWidgetSize({ width: 5000, height: 1 }), { width: 320, height: 240 });
});

await test("fetchManifest rejects non-HTTPS manifest URLs before fetch", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("fetch should not run");
  };
  try {
    await assert.rejects(() => fetchManifest("http://widgets.example.com/widget.json"), /Manifest URL must be HTTPS/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("fetchManifest parses bounded JSON responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => null },
    text: async () => JSON.stringify(VALID_MANIFEST)
  });
  try {
    assert.deepEqual(await fetchManifest("https://widgets.example.com/widget.json"), VALID_MANIFEST);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("fetchManifest rejects oversized responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => String(70 * 1024) },
    text: async () => "{}"
  });
  try {
    await assert.rejects(() => fetchManifest("https://widgets.example.com/widget.json"), /Manifest is too large/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log(`\n${passed} passed`);
