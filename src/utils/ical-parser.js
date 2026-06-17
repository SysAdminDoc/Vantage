// Vantage v0.6.0 — minimal iCal / ICS parser.
// Handles VEVENT blocks with DTSTART / DTEND / SUMMARY / DESCRIPTION / LOCATION.
// Supports: UTC timestamps (Z suffix), TZID datetimes, floating timestamps, DATE-only values.
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
    const propFull = line.slice(0, colonIdx);
    const propFullUpper = propFull.toUpperCase();
    const value    = line.slice(colonIdx + 1);

    // Strip parameters (e.g. DTSTART;TZID=America/New_York → DTSTART)
    const prop = propFullUpper.split(";")[0];
    const tzid = getParam(propFull, "TZID");

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
  const m = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) {
    const parts = {
      year: +m[1],
      month: +m[2],
      day: +m[3],
      hour: +m[4],
      minute: +m[5],
      second: +m[6]
    };
    if (tzid) {
      return zonedDateTimeToDate(parts, tzid) ||
        new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    }
    return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  }

  return null;
}

function getParam(propFull, name) {
  const target = name.toUpperCase();
  for (const part of propFull.split(";").slice(1)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).toUpperCase() !== target) continue;
    const raw = part.slice(eq + 1).trim();
    return raw.replace(/^"|"$/g, "") || null;
  }
  return null;
}

function zonedDateTimeToDate(parts, timeZone) {
  if (timeZone.toUpperCase() === "UTC") {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  }
  try {
    const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    let offset = timeZoneOffsetMs(timeZone, new Date(utcGuess));
    let corrected = utcGuess - offset;
    const correctedOffset = timeZoneOffsetMs(timeZone, new Date(corrected));
    if (correctedOffset !== offset) corrected = utcGuess - correctedOffset;
    return new Date(corrected);
  } catch {
    return null;
  }
}

function timeZoneOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const values = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return asUtc - date.getTime();
}

function unescapeIcal(s) {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}
