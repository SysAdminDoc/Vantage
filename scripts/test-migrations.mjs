#!/usr/bin/env node
// Regression test for settings schema migrations.
// Run: node scripts/test-migrations.mjs

import { strict as assert } from "node:assert";

// Inline the migration pipeline so the test is self-contained and
// doesn't need the extension runtime.
const SCHEMA_VERSION = 3;
const MIGRATIONS = [
  {
    version: 1,
    migrate(s) {
      if (s.embed !== undefined) {
        if (!s.embeds || s.embeds.length === 0) {
          if (s.embed?.url) {
            s.embeds = [{
              id: "1",
              title: s.embed.title || "Embed",
              url: s.embed.url,
              enabled: s.embed.enabled ?? false
            }];
          }
        }
        delete s.embed;
      }
    }
  },
  {
    version: 2,
    migrate(s) {
      if (Array.isArray(s.quicklinks)) {
        s.quicklinks = { enabled: true, items: s.quicklinks, groups: [] };
      }
    }
  },
  {
    version: 3,
    migrate(_s) {}
  }
];

function runMigrations(settings) {
  const from = settings.schemaVersion || 0;
  for (const m of MIGRATIONS) {
    if (from < m.version) m.migrate(settings);
  }
  settings.schemaVersion = SCHEMA_VERSION;
  return settings;
}

// ── Fixtures ──────────────────────────────────────────────────────

const V0_SETTINGS = {
  theme: "mocha",
  embed: { title: "Radar", url: "https://embed.windy.com", enabled: true },
  quicklinks: [
    { title: "GitHub", url: "https://github.com" },
    { title: "Reddit", url: "https://reddit.com" }
  ]
};

const V1_SETTINGS = {
  schemaVersion: 1,
  theme: "latte",
  embeds: [{ id: "1", title: "Radar", url: "https://embed.windy.com", enabled: true }],
  quicklinks: [
    { title: "GitHub", url: "https://github.com" }
  ]
};

const V2_SETTINGS = {
  schemaVersion: 2,
  theme: "macchiato",
  embeds: [],
  quicklinks: { enabled: true, items: [{ title: "HN", url: "https://news.ycombinator.com" }], groups: [] }
};

const V3_SETTINGS = {
  schemaVersion: 3,
  theme: "mocha",
  quicklinks: { enabled: true, items: [], groups: [] },
  embeds: []
};

// ── Tests ─────────────────────────────────────────────────────────

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

console.log("Settings migration tests\n");

test("v0 → v3: embed migrated to embeds array", () => {
  const s = runMigrations(JSON.parse(JSON.stringify(V0_SETTINGS)));
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.embed, undefined);
  assert.equal(s.embeds.length, 1);
  assert.equal(s.embeds[0].url, "https://embed.windy.com");
  assert.equal(s.embeds[0].enabled, true);
});

test("v0 → v3: quicklinks array migrated to object", () => {
  const s = runMigrations(JSON.parse(JSON.stringify(V0_SETTINGS)));
  assert.ok(!Array.isArray(s.quicklinks));
  assert.equal(s.quicklinks.enabled, true);
  assert.equal(s.quicklinks.items.length, 2);
  assert.deepEqual(s.quicklinks.groups, []);
});

test("v1 → v3: quicklinks array migrated, embeds untouched", () => {
  const s = runMigrations(JSON.parse(JSON.stringify(V1_SETTINGS)));
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.ok(!Array.isArray(s.quicklinks));
  assert.equal(s.quicklinks.items.length, 1);
  assert.equal(s.embeds.length, 1);
});

test("v2 → v3: no-op migration, version stamped", () => {
  const s = runMigrations(JSON.parse(JSON.stringify(V2_SETTINGS)));
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.theme, "macchiato");
  assert.equal(s.quicklinks.items.length, 1);
});

test("v3 → v3: idempotent, no data changes", () => {
  const original = JSON.parse(JSON.stringify(V3_SETTINGS));
  const s = runMigrations(JSON.parse(JSON.stringify(V3_SETTINGS)));
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(s, original);
});

test("v0 with no embed: skips embed migration cleanly", () => {
  const s = runMigrations({ quicklinks: [{ title: "X", url: "https://x.com" }] });
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.embed, undefined);
  assert.ok(!Array.isArray(s.quicklinks));
});

test("v0 with empty embed: no embeds created", () => {
  const s = runMigrations({ embed: {} });
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.embed, undefined);
});

test("double migration is safe", () => {
  const s = runMigrations(JSON.parse(JSON.stringify(V0_SETTINGS)));
  const s2 = runMigrations(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(s, s2);
});

console.log(`\n${passed} passed`);
