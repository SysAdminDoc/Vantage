#!/usr/bin/env node
// Regression tests for local integration health diagnostics.

import { strict as assert } from "node:assert";
import {
  buildIntegrationDiagnostics,
  clearIntegrationHealth,
  formatIntegrationDiagnostics,
  getIntegrationDescriptors,
  readIntegrationHealth,
  recordIntegrationEvent,
  redactEndpoint,
  redactSecrets
} from "../src/utils/integration-health.js";

let passed = 0;
const storage = {};

globalThis.chrome = {
  storage: {
    local: {
      async get(key) {
        return { [key]: storage[key] };
      },
      async set(value) {
        Object.assign(storage, value);
      },
      async remove(key) {
        delete storage[key];
      }
    }
  }
};

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

console.log("Integration health tests\n");

await test("lists enabled integrations from settings", () => {
  const descriptors = getIntegrationDescriptors({
    weather: { enabled: true, forecastEnabled: true },
    background: { enabled: true, kind: "bing-daily" },
    rss: { enabled: true, feeds: [{ url: "https://example.com/rss.xml" }] },
    news: { enabled: false, feeds: [{ url: "https://example.com/news.xml" }] },
    feedPreWarm: { enabled: true },
    calendar: { enabled: true, feeds: [{ url: "https://example.com/calendar.ics" }] },
    github: { enabled: true },
    crypto: { enabled: true },
    photo: { enabled: true, source: "nasa" },
    quicklinks: { enabled: true, items: [{ url: "https://example.com" }], groups: [] }
  }).filter(item => item.enabled).map(item => item.id);

  assert.ok(descriptors.includes("weather-open-meteo"));
  assert.ok(descriptors.includes("feeds"));
  assert.ok(descriptors.includes("feed-prewarm"));
  assert.ok(descriptors.includes("calendar-feeds"));
  assert.ok(descriptors.includes("github-api"));
  assert.ok(descriptors.includes("coingecko"));
  assert.ok(descriptors.includes("photo"));
  assert.ok(descriptors.includes("bing-daily"));
  assert.ok(descriptors.includes("favicons"));
});

await test("records and reads redacted integration events", async () => {
  await clearIntegrationHealth();
  await recordIntegrationEvent("coingecko", {
    label: "CoinGecko prices",
    kind: "success",
    endpoint: "https://api.coingecko.com/api/v3/simple/price?api_key=secret-value&ids=bitcoin",
    source: "x-cg-demo-api-key: secret-value",
    message: "token=secret-value success",
    count: 1
  });

  const records = await readIntegrationHealth();
  assert.equal(records.coingecko.lastStatus, "ok");
  assert.equal(records.coingecko.count, 1);
  assert.match(records.coingecko.endpoint, /api_key=REDACTED/);
  assert.doesNotMatch(JSON.stringify(records.coingecko), /secret-value/);
});

await test("builds diagnostics with pending rows and recorded rows", () => {
  const rows = buildIntegrationDiagnostics({
    crypto: { enabled: true },
    github: { enabled: true }
  }, {
    coingecko: {
      id: "coingecko",
      label: "CoinGecko prices",
      lastStatus: "ok",
      lastSuccessAt: "2026-06-30T12:00:00.000Z",
      endpoint: "api.coingecko.com"
    }
  });

  assert.equal(rows.find(row => row.id === "coingecko")?.statusLabel, "OK");
  assert.equal(rows.find(row => row.id === "github-api")?.statusLabel, "Pending");
});

await test("formats copyable diagnostics without leaking secrets", async () => {
  const records = await readIntegrationHealth();
  const text = formatIntegrationDiagnostics({
    crypto: { enabled: true },
    photo: { enabled: true, source: "nasa" }
  }, records);

  assert.match(text, /Vantage integration diagnostics/);
  assert.match(text, /CoinGecko prices/);
  assert.doesNotMatch(text, /secret-value/);
});

await test("redacts common secret spellings", () => {
  assert.equal(redactSecrets("Authorization: Bearer abc123"), "Authorization: Bearer REDACTED");
  assert.equal(redactEndpoint("https://example.com/?token=abc&ok=1"), "https://example.com/?token=REDACTED&ok=1");
});

await test("clears stored diagnostics", async () => {
  await clearIntegrationHealth();
  assert.deepEqual(await readIntegrationHealth(), {});
});

console.log(`\n${passed} passed`);
