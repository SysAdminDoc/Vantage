#!/usr/bin/env node
// Regression tests for the external widget manifest trust boundary.

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import {
  buildWidgetRegistryReview,
  fetchManifest,
  fetchTrustedRegistryManifest,
  normalizeWidgetHttpsUrl,
  sanitizeWidgetSize,
  sha256Hex,
  validateManifest,
  validateRegistryEntry
} from "../src/utils/widget-host.js";

const VALID_MANIFEST = Object.freeze({
  id: "sample-widget",
  name: "Sample Widget",
  src: "https://widgets.example.com/widget.html",
  version: "1.0.0"
});

const VALID_MANIFEST_TEXT = JSON.stringify(VALID_MANIFEST);

async function registryEntryForManifest(manifestText = VALID_MANIFEST_TEXT, overrides = {}) {
  const digest = `sha256:${await sha256Hex(manifestText)}`;
  return {
    id: "sample-widget",
    name: "Sample Widget",
    manifestUrl: "https://widgets.example.com/widget.json",
    manifestDigest: digest,
    homepage: "https://widgets.example.com/",
    publisher: "Example Widgets",
    description: "Small sample widget.",
    network: {
      hosts: ["https://widgets.example.com"],
      analytics: false,
      notes: "Loads only the widget iframe and manifest."
    },
    permissions: ["external-fetch"],
    ...overrides
  };
}

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

await test("docs and settings copy stay HTTPS-only", async () => {
  const docs = await readFile(new URL("../docs/widget-api.md", import.meta.url), "utf8");
  const settings = await readFile(new URL("../src/settings.js", import.meta.url), "utf8");
  assert.ok(docs.includes("https://localhost:8000/manifest.json"));
  assert.ok(!docs.includes("http://localhost:8000/manifest.json"));
  assert.ok(settings.includes("HTTPS widget manifest URL"));
  assert.ok(settings.includes("HTTPS-only"));
  assert.ok(settings.includes("Review registry entry"));
  assert.ok(settings.includes("No remote widget registry is enabled by default."));
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

await test("registry review accepts digest-pinned disclosures", async () => {
  const review = buildWidgetRegistryReview(await registryEntryForManifest());
  assert.equal(review.valid, true);
  assert.equal(review.review.manifestDigest.startsWith("sha256:"), true);
  assert.deepEqual(review.review.network.hosts, ["https://widgets.example.com"]);
  assert.deepEqual(review.review.permissions, ["external-fetch"]);
  assert.ok(review.review.disclosures.some(item => item.includes("Analytics: no")));
});

await test("registry review rejects missing digest and network disclosures", () => {
  const errors = validateRegistryEntry({
    id: "sample-widget",
    name: "Sample Widget",
    manifestUrl: "https://widgets.example.com/widget.json",
    network: { hosts: ["http://widgets.example.com"], analytics: "no" }
  });
  assert.ok(errors.includes("manifestDigest must be sha256:<64 hex chars>"));
  assert.ok(errors.includes("network hosts must be HTTPS origins"));
  assert.ok(errors.includes("network analytics disclosure is required"));
});

await test("trusted registry manifests verify SHA-256 before install", async () => {
  const entry = await registryEntryForManifest();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => String(VALID_MANIFEST_TEXT.length) },
    text: async () => VALID_MANIFEST_TEXT
  });
  try {
    const { manifest, review } = await fetchTrustedRegistryManifest(entry);
    assert.deepEqual(manifest, VALID_MANIFEST);
    assert.equal(review.id, "sample-widget");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("trusted registry manifests reject digest mismatches", async () => {
  const entry = await registryEntryForManifest();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => null },
    text: async () => JSON.stringify({ ...VALID_MANIFEST, name: "Changed Widget" })
  });
  try {
    await assert.rejects(() => fetchTrustedRegistryManifest(entry), /Manifest digest mismatch/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("trusted registry manifests require disclosed widget frame origin", async () => {
  const manifestText = JSON.stringify({
    ...VALID_MANIFEST,
    src: "https://cdn.widgets.example/widget.html"
  });
  const entry = await registryEntryForManifest(manifestText);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => null },
    text: async () => manifestText
  });
  try {
    await assert.rejects(() => fetchTrustedRegistryManifest(entry), /does not disclose widget frame origin/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log(`\n${passed} passed`);
