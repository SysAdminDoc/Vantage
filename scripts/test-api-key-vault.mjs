#!/usr/bin/env node
// Regression tests for encrypted API key vault behavior.

import { strict as assert } from "node:assert";
import { decryptKeys, encryptKeys } from "../src/utils/api-key-vault.js";

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

console.log("API key vault tests\n");

await test("encrypts and decrypts API key bundle", async () => {
  const payload = await encryptKeys("correct horse battery staple", {
    cryptoApiKey: "cg-demo",
    photoNasaKey: "nasa-demo"
  });
  assert.deepEqual(await decryptKeys("correct horse battery staple", payload), {
    crypto: "cg-demo",
    nasa: "nasa-demo"
  });
});

await test("wrong passphrase returns generic vault error", async () => {
  const payload = await encryptKeys("correct horse battery staple", {
    cryptoApiKey: "cg-demo",
    photoNasaKey: "nasa-demo"
  });
  await assert.rejects(() => decryptKeys("wrong passphrase", payload), /Wrong passphrase or corrupt vault/);
});

await test("corrupt base64 returns generic vault error", async () => {
  await assert.rejects(() => decryptKeys("anything", {
    encryptKeys: true,
    salt: "!!!",
    iv: "not-base64",
    encryptedBlob: "not-base64"
  }), /Wrong passphrase or corrupt vault/);
});

console.log(`\n${passed} passed`);
