#!/usr/bin/env node
// Regression tests for user-supplied web URL normalization.

import { strict as assert } from "node:assert";
import { isSafeWebUrl, normalizeWebUrl } from "../src/utils/url-safety.js";

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

console.log("URL safety tests\n");

test("keeps valid HTTPS URLs", () => {
  assert.equal(normalizeWebUrl("https://example.com/path?q=1"), "https://example.com/path?q=1");
});

test("allows HTTP for user-owned web endpoints", () => {
  assert.equal(normalizeWebUrl("http://localhost:8080/feed.xml"), "http://localhost:8080/feed.xml");
});

test("normalizes bare domains when requested", () => {
  assert.equal(normalizeWebUrl("example.com/feed", { assumeHttps: true }), "https://example.com/feed");
});

test("rejects javascript URLs", () => {
  assert.equal(normalizeWebUrl("javascript:alert(1)"), "");
  assert.equal(isSafeWebUrl("javascript:alert(1)"), false);
});

test("rejects data URLs", () => {
  assert.equal(normalizeWebUrl("data:text/html,<h1>x</h1>"), "");
});

test("rejects credentialed URLs", () => {
  assert.equal(normalizeWebUrl("https://user:pass@example.com/"), "");
});

test("rejects malformed URLs", () => {
  assert.equal(normalizeWebUrl("https://"), "");
});

console.log(`\n${passed} passed`);
