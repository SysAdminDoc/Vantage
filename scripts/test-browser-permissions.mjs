#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path) {
  return JSON.parse(await readFile(join(ROOT, path), "utf8"));
}

function assertPermissionShape(manifest, { optional, requiredAbsent, label }) {
  const required = new Set(manifest.permissions || []);
  const opt = new Set(manifest.optional_permissions || []);
  for (const permission of optional) {
    assert.equal(opt.has(permission), true, `${label}: ${permission} must be optional`);
  }
  for (const permission of requiredAbsent) {
    assert.equal(required.has(permission), false, `${label}: ${permission} must not be install-time`);
  }
}

async function testManifestPermissions() {
  const chromium = await readJson("manifest.json");
  const firefox = await readJson("manifest.firefox.json");

  assertPermissionShape(chromium, {
    label: "chromium",
    optional: ["bookmarks", "topSites", "readingList"],
    requiredAbsent: ["bookmarks", "topSites", "readingList"]
  });
  assertPermissionShape(firefox, {
    label: "firefox",
    optional: ["bookmarks", "topSites"],
    requiredAbsent: ["bookmarks", "topSites"]
  });
}

async function testWidgetPickerPermissionHooks() {
  const source = await readFile(join(ROOT, "src/widget-picker.js"), "utf8");
  for (const permission of ["bookmarks", "topSites", "history"]) {
    assert.match(source, new RegExp(`permission:\\s*"${permission}"`), `widget picker gates ${permission}`);
  }
  assert.match(source, /requestBrowserPermission\(item\.permission\)/, "widget picker requests optional browser-data permissions");
  assert.match(source, /removeBrowserPermission\(item\.permission\)/, "widget picker revokes optional browser-data permissions");
}

async function testCallbackPermissions() {
  delete globalThis.browser;
  const granted = new Set(["bookmarks"]);
  globalThis.chrome = {
    runtime: { lastError: null },
    permissions: {
      contains(payload, cb) {
        cb(payload.permissions.every(permission => granted.has(permission)));
      },
      request(payload, cb) {
        for (const permission of payload.permissions) granted.add(permission);
        cb(true);
      },
      remove(payload, cb) {
        for (const permission of payload.permissions) granted.delete(permission);
        cb(true);
      }
    }
  };

  const mod = await import(`../src/utils/browser-permissions.js?callback=${Date.now()}`);
  assert.equal(await mod.hasBrowserPermission("bookmarks"), true, "callback contains granted permission");
  assert.equal(await mod.hasBrowserPermission("topSites"), false, "callback contains missing permission");
  assert.deepEqual(await mod.requestBrowserPermission("topSites"), { granted: true, unsupported: false });
  assert.equal(await mod.hasBrowserPermission("topSites"), true, "callback request grants permission");
  assert.equal(await mod.removeBrowserPermission("topSites"), true, "callback remove returns true");
  assert.equal(await mod.hasBrowserPermission("topSites"), false, "callback remove revokes permission");

  delete globalThis.chrome.permissions.request;
  assert.deepEqual(await mod.requestBrowserPermission("readingList"), { granted: false, unsupported: true });
}

async function testPromisePermissions() {
  const granted = new Set(["bookmarks"]);
  globalThis.browser = {
    permissions: {
      async contains(payload) {
        return payload.permissions.every(permission => granted.has(permission));
      },
      async request(payload) {
        for (const permission of payload.permissions) granted.add(permission);
        return true;
      },
      async remove(payload) {
        for (const permission of payload.permissions) granted.delete(permission);
        return true;
      }
    }
  };
  globalThis.chrome = undefined;

  const mod = await import(`../src/utils/browser-permissions.js?promise=${Date.now()}`);
  assert.equal(await mod.hasBrowserPermission("bookmarks"), true, "promise contains granted permission");
  assert.equal(await mod.hasBrowserPermission("topSites"), false, "promise contains missing permission");
  assert.deepEqual(await mod.requestBrowserPermission("topSites"), { granted: true, unsupported: false });
  assert.equal(await mod.hasBrowserPermission("topSites"), true, "promise request grants permission");
  assert.equal(await mod.removeBrowserPermission("topSites"), true, "promise remove returns true");
  assert.equal(await mod.hasBrowserPermission("topSites"), false, "promise remove revokes permission");
}

await testManifestPermissions();
await testWidgetPickerPermissionHooks();
await testCallbackPermissions();
await testPromisePermissions();

console.log("Browser permission tests");
console.log("  PASS  manifest browser-data permissions are optional");
console.log("  PASS  widget picker gates optional browser-data permissions");
console.log("  PASS  callback-style permissions helper");
console.log("  PASS  promise-style permissions helper");
