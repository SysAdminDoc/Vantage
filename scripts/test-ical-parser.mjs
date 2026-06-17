#!/usr/bin/env node
// Regression tests for the iCal parser.

import { strict as assert } from "node:assert";
import { parseICal } from "../src/utils/ical-parser.js";

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

function eventWith(line) {
  return [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    line,
    "DTEND:20260501T150000Z",
    "SUMMARY:Demo",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

console.log("iCal parser tests\n");

test("UTC datetime keeps Z instant", () => {
  const [event] = parseICal(eventWith("DTSTART:20260501T140000Z"));
  assert.equal(event.start.toISOString(), "2026-05-01T14:00:00.000Z");
});

test("TZID datetime converts from named zone to UTC", () => {
  const [event] = parseICal(eventWith("DTSTART;TZID=America/New_York:20260501T140000"));
  assert.equal(event.start.toISOString(), "2026-05-01T18:00:00.000Z");
});

test("quoted TZID parameter is supported", () => {
  const [event] = parseICal(eventWith('DTSTART;TZID="Europe/Berlin":20260115T090000'));
  assert.equal(event.start.toISOString(), "2026-01-15T08:00:00.000Z");
});

test("invalid TZID falls back to floating local time", () => {
  const [event] = parseICal(eventWith("DTSTART;TZID=Not/AZone:20260501T140000"));
  assert.equal(event.start.getFullYear(), 2026);
  assert.equal(event.start.getMonth(), 4);
  assert.equal(event.start.getDate(), 1);
  assert.equal(event.start.getHours(), 14);
});

console.log(`\n${passed} passed`);
