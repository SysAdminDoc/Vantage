#!/usr/bin/env node
// Regression tests for manual link metadata enrichment.

import { strict as assert } from "node:assert";
import {
  cleanLinkTitle,
  enrichLinkMetadata,
  extractTitleFromHtml
} from "../src/utils/link-metadata.js";

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

function installLocalStorageMock(entries = {}) {
  const data = new Map(Object.entries(entries));
  globalThis.localStorage = {
    get length() { return data.size; },
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
    key: index => [...data.keys()][index] || null
  };
}

console.log("Link metadata tests\n");

await test("extracts and cleans HTML titles", () => {
  assert.equal(extractTitleFromHtml("<title> Example &amp; Docs </title>"), "Example & Docs");
  assert.equal(cleanLinkTitle("  A\n\nlong\t title  "), "A long title");
});

await test("normalizes bare domains and falls back to hostname", async () => {
  const metadata = await enrichLinkMetadata("example.com/docs", {
    fetchTitle: false,
    warmFavicon: false
  });
  assert.equal(metadata.url, "https://example.com/docs");
  assert.equal(metadata.title, "example.com");
  assert.equal(metadata.hostname, "example.com");
  assert.equal(metadata.titleSource, "fallback");
});

await test("rejects credentialed and non-web URLs", async () => {
  assert.equal(await enrichLinkMetadata("https://user:pass@example.com/", { fetchTitle: false, warmFavicon: false }), null);
  assert.equal(await enrichLinkMetadata("javascript:alert(1)", { fetchTitle: false, warmFavicon: false }), null);
});

await test("keeps manual title ahead of fetched title", async () => {
  const metadata = await enrichLinkMetadata("https://example.com/manual", {
    title: "Manual title",
    fetchTitle: false,
    warmFavicon: false
  });
  assert.equal(metadata.title, "Manual title");
  assert.equal(metadata.titleSource, "manual");
});

await test("does not fetch page title without host access", async () => {
  const previousChrome = globalThis.chrome;
  const previousFetch = globalThis.fetch;
  globalThis.chrome = {
    permissions: {
      contains(_payload, callback) { callback(false); }
    },
    runtime: {}
  };
  globalThis.fetch = async () => {
    throw new Error("fetch should not run without host access");
  };

  try {
    const metadata = await enrichLinkMetadata("https://example.com/private", {
      warmFavicon: false
    });
    assert.equal(metadata.title, "example.com");
    assert.equal(metadata.titleSource, "fallback");
  } finally {
    globalThis.chrome = previousChrome;
    globalThis.fetch = previousFetch;
  }
});

await test("reads existing favicon cache without network", async () => {
  installLocalStorageMock({
    "favicon:example.com": JSON.stringify({
      data: "data:image/png;base64,abc",
      ts: Date.now()
    })
  });
  const metadata = await enrichLinkMetadata("https://example.com/cached", {
    fetchTitle: false
  });
  assert.equal(metadata.faviconUrl, "data:image/png;base64,abc");
  assert.equal(metadata.faviconSource, "cache");
  delete globalThis.localStorage;
});

await test("fetches page title when host permission already exists", async () => {
  const previousChrome = globalThis.chrome;
  const previousFetch = globalThis.fetch;
  let fetched = false;
  globalThis.chrome = {
    permissions: {
      contains(_payload, callback) { callback(true); }
    },
    runtime: {}
  };
  globalThis.fetch = async (_url, options) => {
    fetched = true;
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    return {
      ok: true,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : "";
        }
      },
      text: async () => "<html><head><title>Fetched &amp; Ready</title></head></html>"
    };
  };

  try {
    const metadata = await enrichLinkMetadata("https://example.com/read", {
      warmFavicon: false
    });
    assert.equal(fetched, true);
    assert.equal(metadata.title, "Fetched & Ready");
    assert.equal(metadata.titleSource, "page");
  } finally {
    globalThis.chrome = previousChrome;
    globalThis.fetch = previousFetch;
  }
});

console.log(`\n${passed} passed`);
