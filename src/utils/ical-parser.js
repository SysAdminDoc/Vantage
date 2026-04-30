// Vantage v0.6.0 — minimal iCal / ICS parser.
// Handles VEVENT blocks with DTSTART / DTEND / SUMMARY / DESCRIPTION / LOCATION.
// Supports: UTC timestamps (Z suffix), floating timestamps, DATE-only values.
// Does NOT handle RRULE (recurring events) — fetches next-occurrence only.

export function parseICal(text) {
  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n");

  const events = [];
  let inEvent = false;
  let current = {};

  for (const rawLine of unfolded.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "BEGIN:VEVENT") { inEvent = true; current = {}; continue; }
    if (line === "END:VEVENT")   { inEvent = false; events.push(current); continue; }
    if (!inEvent) continue;

    // Split "PROPERTY;PARAMS:value" — value starts after first colon
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const propFull = line.slice(0, colonIdx).toUpperCase();
    const value    = line.slice(colonIdx + 1);

    // Strip parameters (e.g. DTSTART;TZID=America/New_York → DTSTART)
    const prop = propFull.split(";")[0];
    // Extract TZID if present for future use
    const tzidMatch = propFull.match(/TZID=([^;:]+)/);
    const tzid = tzidMatch ? tzidMatch[1] : null;

    switch (prop) {
      case "DTSTART": current.start    = parseICalDate(value, tzid); break;
      case "DTEND":   current.end      = parseICalDate(value, tzid); break;
      case "SUMMARY": current.title    = unescapeIcal(value); break;
      case "DESCRIPTION": current.description = unescapeIcal(value); break;
      case "LOCATION": current.location = unescapeIcal(value); break;
      case "UID":     current.uid      = value; break;
      case "STATUS":  current.status   = value; break;
    }
  }

  return events
    .filter(e => e.start && e.title && e.status !== "CANCELLED")
    .sort((a, b) => a.start - b.start);
}

function parseICalDate(str, tzid) {
  if (!str) return null;
  str = str.trim();

  // DATE-only: 20260501 → treat as local midnight
  if (/^\d{8}$/.test(str)) {
    const y = +str.slice(0, 4), m = +str.slice(4, 6) - 1, d = +str.slice(6, 8);
    return new Date(y, m, d);
  }

  // UTC datetime: 20260501T140000Z
  if (str.endsWith("Z")) {
    return new Date(str.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z"));
  }

  // Floating or TZID datetime: 20260501T140000
  // Treat as local time (browser's timezone) — best-effort without a full TZDB.
  const m = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  }

  return null;
}

function unescapeIcal(s) {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}
