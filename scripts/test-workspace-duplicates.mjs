#!/usr/bin/env node
// Regression tests for workspace and quick-link group duplication helpers.

import { strict as assert } from "node:assert";
import {
  createWorkspaceId,
  duplicateQuickLinkGroup,
  duplicateWorkspace
} from "../src/utils/workspace.js";

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

console.log("Workspace duplicate tests\n");

await test("duplicates workspace snapshots and presets without reusing IDs", () => {
  const source = {
    id: "ws-source",
    name: "Research",
    snapshot: {
      theme: "mocha",
      quicklinks: {
        items: [{ title: "Docs", url: "https://example.com/docs" }],
        groups: [{ id: "group-source", name: "Stack", items: [{ title: "API", url: "https://example.com/api" }] }]
      }
    },
    presets: [{ name: "Morning", snapshot: { background: { qaTime: "08:00" } } }],
    activePreset: 0
  };
  const copy = duplicateWorkspace(source, [
    source,
    { id: "ws-existing", name: "Research (copy)" }
  ]);

  assert.match(copy.id, /^ws-/);
  assert.notEqual(copy.id, source.id);
  assert.equal(copy.name, "Research (copy 2)");
  assert.equal(copy.activePreset, 0);
  assert.deepEqual(copy.snapshot, source.snapshot);
  assert.deepEqual(copy.presets, source.presets);
  assert.notStrictEqual(copy.snapshot, source.snapshot);
  assert.notStrictEqual(copy.snapshot.quicklinks.items, source.snapshot.quicklinks.items);
  assert.notStrictEqual(copy.presets, source.presets);

  copy.snapshot.quicklinks.items[0].title = "Changed";
  copy.presets[0].snapshot.background.qaTime = "09:00";
  assert.equal(source.snapshot.quicklinks.items[0].title, "Docs");
  assert.equal(source.presets[0].snapshot.background.qaTime, "08:00");
});

await test("imports workspace copies with a unique imported name", () => {
  const source = {
    id: "foreign-id",
    name: "Research",
    snapshot: { layout: { panels: ["news"] } },
    presets: [{ name: "Focus", snapshot: { theme: "latte" } }]
  };
  const imported = duplicateWorkspace(source, [
    { id: "local-id", name: "Research" },
    { id: "local-import", name: "Research (imported)" }
  ], { nameSuffix: "imported" });

  assert.match(imported.id, /^ws-/);
  assert.notEqual(imported.id, source.id);
  assert.equal(imported.name, "Research (imported 2)");
  assert.deepEqual(imported.snapshot, source.snapshot);
  assert.deepEqual(imported.presets, source.presets);
});

await test("creates workspace IDs that do not reuse existing IDs", () => {
  const id = createWorkspaceId([{ id: "ws-existing" }]);
  assert.match(id, /^ws-/);
  assert.notEqual(id, "ws-existing");
});

await test("duplicates quick-link groups with contents and unique names", () => {
  const source = {
    id: "group-source",
    title: "Docs",
    items: [
      { title: "API", url: "https://example.com/api" },
      { title: "Guide", url: "https://example.com/guide" }
    ]
  };
  const copy = duplicateQuickLinkGroup(source, [
    source,
    { id: "group-existing", name: "Docs (copy)" }
  ]);

  assert.match(copy.id, /^group-/);
  assert.notEqual(copy.id, source.id);
  assert.equal(copy.name, "Docs (copy 2)");
  assert.equal(copy.title, undefined);
  assert.deepEqual(copy.items, source.items);
  assert.notStrictEqual(copy.items, source.items);

  copy.items[0].title = "Changed";
  assert.equal(source.items[0].title, "API");
});

console.log(`\n${passed} passed`);
