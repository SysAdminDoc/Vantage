#!/usr/bin/env node
// Regression tests for partial settings import coverage.

import { strict as assert } from "node:assert";
import { normalizeImportedSettings } from "../src/settings.js";
import { getDefaults } from "../src/storage.js";
import { getImportSectionCoverage } from "../src/utils/partial-import.js";

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("Partial import coverage tests\n");

const defaults = getDefaults();
const { sections, allKeys, localOnlyKeys } = getImportSectionCoverage();

test("every default top-level setting is classified for import", () => {
  const classified = new Set([...allKeys, ...localOnlyKeys]);
  const missing = Object.keys(defaults)
    .filter(key => !classified.has(key))
    .sort();
  assert.deepEqual(missing, []);
});

test("import sections do not claim the same setting twice", () => {
  const seen = new Map();
  const duplicates = [];
  for (const section of sections) {
    for (const key of section.keys) {
      if (seen.has(key)) duplicates.push(`${key} (${seen.get(key)}, ${section.id})`);
      seen.set(key, section.id);
    }
  }
  assert.deepEqual(duplicates, []);
});

test("local-only import decisions point at real settings", () => {
  const unknown = localOnlyKeys
    .filter(key => !(key in defaults))
    .sort();
  assert.deepEqual(unknown, []);
});

test("sensitive and device-local state remains local-only", () => {
  assert.ok(localOnlyKeys.includes("security"));
  assert.ok(localOnlyKeys.includes("hostPermissions"));
  assert.ok(localOnlyKeys.includes("onboardingComplete"));
});

test("malformed imported external widgets are normalized before restore", () => {
  const normalized = normalizeImportedSettings({
    externalWidgets: [
      {
        id: "bad id!",
        manifestUrl: "javascript:alert(1)",
        manifest: {
          id: "bad id!",
          name: { nested: true },
          src: "javascript:alert(1)",
          version: "1"
        }
      },
      {
        id: "sample-widget",
        manifestUrl: " https://widgets.example.com/manifest.json ",
        manifest: {
          id: "sample-widget",
          name: "Sample Widget",
          src: "https://widgets.example.com/widget.html",
          version: "1.0.0",
          homepage: "https://widgets.example.com/"
        },
        enabled: true,
        data: { compact: true }
      },
      {
        id: "reloadable-widget",
        manifestUrl: "https://widgets.example.com/reload.json",
        manifest: {
          id: "reloadable-widget",
          name: { nested: true },
          src: "https://widgets.example.com/widget.html",
          version: "1.0.0"
        },
        enabled: true
      }
    ]
  });

  assert.equal(normalized.externalWidgets.length, 2);
  assert.equal(normalized.externalWidgets[0].manifestUrl, "https://widgets.example.com/manifest.json");
  assert.equal(normalized.externalWidgets[0].manifest.name, "Sample Widget");
  assert.deepEqual(normalized.externalWidgets[0].data, { compact: true });
  assert.equal(normalized.externalWidgets[1].manifestUrl, "https://widgets.example.com/reload.json");
  assert.equal(normalized.externalWidgets[1].manifest, undefined);
  assert.equal(normalized.externalWidgets[1].error, "Manifest needs reload");
});

console.log(`\n${passed} passed`);
