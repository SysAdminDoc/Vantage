#!/usr/bin/env node
// Regression tests for partial settings import coverage.

import { strict as assert } from "node:assert";
import { normalizeImportedSettings } from "../src/settings.js";
import { getDefaults } from "../src/storage.js";
import { opfsMarker } from "../src/utils/opfs.js";
import { buildFullStateRestorePlan, getImportSectionCoverage } from "../src/utils/partial-import.js";

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

test("full-state restore plan preserves local stores and flags recovery work", () => {
  const current = getDefaults();
  current.security = {
    encryptKeys: true,
    salt: "current-salt",
    iv: "current-iv",
    encryptedBlob: "current-ciphertext"
  };
  current.hostPermissions = {
    deniedOrigins: ["https://feeds.example.com/*"],
    lastDeniedAt: "2026-06-30T00:00:00.000Z"
  };
  current.onboardingComplete = true;
  current.crypto = { ...current.crypto, enabled: true, apiKey: "live-crypto-key" };
  current.photo = { ...current.photo, enabled: true, source: "nasa", nasaKey: "live-nasa-key" };

  const imported = normalizeImportedSettings({
    theme: "latte",
    background: {
      ...current.background,
      kind: "video-upload",
      videoData: opfsMarker("restored-video.webm")
    },
    feedArchive: { enabled: true, cap: 25_000 },
    workspaces: {
      active: "restored",
      list: [
        {
          id: "restored",
          name: "Restored workspace",
          snapshot: {
            background: {
              kind: "video-upload",
              videoData: opfsMarker("workspace-video.webm")
            },
            layout: { panels: ["rss", "news"] },
            quicklinks: {
              enabled: true,
              items: [{ title: "Docs", url: "https://example.com/docs" }],
              groups: []
            },
            enabled: { rss: true, news: true }
          }
        }
      ]
    },
    hostPermissions: { deniedOrigins: ["https://imported.example/*"] },
    security: { encryptKeys: false, salt: null, iv: null, encryptedBlob: null },
    crypto: { ...current.crypto, enabled: true, apiKey: "" },
    photo: { ...current.photo, enabled: true, source: "nasa", nasaKey: "" },
    futureDurableStore: { enabled: true }
  });

  const plan = buildFullStateRestorePlan(current, imported, {
    availableOpfsKeys: ["workspace-video.webm"]
  });

  assert.equal(plan.merged.theme, "latte");
  assert.equal(plan.merged.feedArchive.enabled, true);
  assert.equal(plan.merged.workspaces.active, "restored");
  assert.equal(plan.merged.workspaces.list[0].snapshot.background.videoData, opfsMarker("workspace-video.webm"));
  assert.deepEqual(plan.merged.security, current.security);
  assert.deepEqual(plan.merged.hostPermissions, current.hostPermissions);
  assert.equal(plan.merged.onboardingComplete, true);
  assert.equal(plan.merged.crypto.apiKey, "live-crypto-key");
  assert.equal(plan.merged.photo.nasaKey, "live-nasa-key");
  assert.deepEqual(plan.unknownImportedKeys, ["futureDurableStore"]);
  assert.ok(plan.localOnlyPreservedKeys.includes("security"));
  assert.ok(plan.localOnlyPreservedKeys.includes("hostPermissions"));

  const opfsWarning = plan.warnings.find(w => w.type === "opfs-missing" && w.key === "restored-video.webm");
  assert.ok(opfsWarning);
  assert.ok(opfsWarning.message.includes("re-select the file"));
  assert.ok(!plan.warnings.some(w => w.key === "workspace-video.webm"));

  const archiveWarning = plan.warnings.find(w => w.type === "indexeddb-feed-archive");
  assert.ok(archiveWarning);
  assert.ok(archiveWarning.message.includes("Re-open feeds"));
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
        registryTrust: {
          id: "sample-widget",
          name: "Sample Widget",
          manifestUrl: "https://widgets.example.com/manifest.json",
          manifestDigest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          network: {
            hosts: ["https://widgets.example.com"],
            analytics: false
          },
          permissions: ["external-fetch"],
          reviewedAt: "2026-06-30T00:00:00.000Z"
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
  assert.equal(normalized.externalWidgets[0].registryTrust.manifestDigest, "sha256:1111111111111111111111111111111111111111111111111111111111111111");
  assert.deepEqual(normalized.externalWidgets[0].registryTrust.network.hosts, ["https://widgets.example.com"]);
  assert.deepEqual(normalized.externalWidgets[0].data, { compact: true });
  assert.equal(normalized.externalWidgets[1].manifestUrl, "https://widgets.example.com/reload.json");
  assert.equal(normalized.externalWidgets[1].manifest, undefined);
  assert.equal(normalized.externalWidgets[1].error, "Manifest needs reload");
});

console.log(`\n${passed} passed`);
