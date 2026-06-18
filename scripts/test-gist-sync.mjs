#!/usr/bin/env node
// Regression tests for GitHub Gist settings import URL handling.

import { strict as assert } from "node:assert";
import { loadSettingsFromGist } from "../src/utils/gist-sync.js";

let passed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    process.exitCode = 1;
  }
}

function response({ ok = true, status = 200, json }) {
  return {
    ok,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json)
  };
}

console.log("Gist sync tests\n");

await test("rejects non-Gist URLs before fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("fetch should not run");
  };
  try {
    await assert.rejects(
      () => loadSettingsFromGist("https://example.com/?next=https://gist.github.com/user/abcdef"),
      /Invalid Gist URL/
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("loads settings from a valid Gist URL", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://api.github.com/gists/abcdef");
    return response({
      json: {
        files: {
          "vantage-settings.json": {
            content: "{\"theme\":\"mocha\"}",
            truncated: false
          }
        }
      }
    });
  };
  try {
    assert.deepEqual(await loadSettingsFromGist("https://gist.github.com/user/abcdef"), { theme: "mocha" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("rejects untrusted raw Gist file URLs", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response({
    json: {
      files: {
        "vantage-settings.json": {
          truncated: true,
          raw_url: "https://example.com/raw.json"
        }
      }
    }
  });
  try {
    await assert.rejects(() => loadSettingsFromGist("abcdef"), /raw file URL was not trusted/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log(`\n${passed} passed`);
