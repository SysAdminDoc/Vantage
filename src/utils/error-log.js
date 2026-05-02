// Vantage — in-extension error logging.
//
// ROADMAP item: catch unhandled widget errors into a circular buffer in
// chrome.storage.local; expose a "Copy debug log" button in settings.
// Lets users diagnose / report issues without telemetry — Vantage's
// privacy stance forbids any "phone home" pattern, so we keep the log
// entirely local and let the user paste it into a GitHub issue.
//
// Buffer is capped at 50 entries (~10 KB; well under the local-storage
// quota even when full). Entries are ring-buffered: oldest dropped on
// overflow.

const STORAGE_KEY = "vantageErrorLog";
const MAX_ENTRIES = 50;

/** Push a log entry. Best-effort; failures here must not throw. */
export async function logError(entry) {
  try {
    const chromeApi = globalThis.chrome;
    if (!chromeApi?.storage?.local) return;
    const stored = await chromeApi.storage.local.get(STORAGE_KEY);
    const log = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
    log.push({
      ts: new Date().toISOString(),
      message: String(entry?.message || "unknown error").slice(0, 500),
      stack: entry?.stack ? String(entry.stack).slice(0, 2000) : "",
      source: entry?.source ? String(entry.source).slice(0, 80) : "",
      url: entry?.url ? String(entry.url).slice(0, 200) : ""
    });
    while (log.length > MAX_ENTRIES) log.shift();
    await chromeApi.storage.local.set({ [STORAGE_KEY]: log });
  } catch { /* logging must never throw */ }
}

/** Read the buffer for the Copy-debug-log UX. */
export async function readErrorLog() {
  try {
    const chromeApi = globalThis.chrome;
    if (!chromeApi?.storage?.local) return [];
    const stored = await chromeApi.storage.local.get(STORAGE_KEY);
    return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  } catch {
    return [];
  }
}

/** Format the buffer as a single text blob ready for clipboard paste
 *  into a GitHub issue. Adds a header with browser + extension version
 *  so we don't need users to gather it separately. The whole entries
 *  body is wrapped in a Markdown ```log``` fence so attacker-controlled
 *  error text can't render as links / mentions / formatting when
 *  pasted into GitHub / Slack / Discord / any markdown surface. */
export async function formatErrorLog() {
  const entries = await readErrorLog();
  const chromeApi = globalThis.chrome;
  const manifest = chromeApi?.runtime?.getManifest?.() || {};
  const ua = navigator.userAgent || "unknown";
  const lines = [
    `# Vantage debug log`,
    `- version: ${manifest.version || "?"}`,
    `- userAgent: ${ua}`,
    `- entries: ${entries.length}`,
    `- generated: ${new Date().toISOString()}`,
    ``,
    "```log"
  ];
  for (const e of entries) {
    // Strip control chars so escape sequences don't survive into
    // terminals or note-taking tools that render them.
    const clean = (s) => String(s || "").replace(/[\u0000-\u001F\u007F]+/g, " ");
    lines.push(`[${clean(e.ts)}] ${e.source ? `(${clean(e.source)}) ` : ""}${clean(e.message)}`);
    if (e.url) lines.push(`  at ${clean(e.url)}`);
    if (e.stack) lines.push(`  ${clean(e.stack).split("\n").slice(0, 5).join("\n  ")}`);
    lines.push("");
  }
  // Defense in depth: if any entry happened to contain a literal
  // ``` we'd close the fence early and the rest would render. Replace
  // with a homoglyph so the fence stays intact.
  const body = lines.slice(6).join("\n").replace(/```/g, "ʼʼʼ");
  return [...lines.slice(0, 6), body, "```"].join("\n");
}

/** Wipe the buffer. */
export async function clearErrorLog() {
  try {
    const chromeApi = globalThis.chrome;
    if (!chromeApi?.storage?.local) return;
    await chromeApi.storage.local.remove(STORAGE_KEY);
  } catch { /* ignore */ }
}

/** Wire window.onerror + onunhandledrejection. Idempotent. */
export function attachErrorListeners() {
  if (window._vantageErrorListenersAttached) return;
  window._vantageErrorListenersAttached = true;
  window.addEventListener("error", (e) => {
    logError({
      message: e.message || (e.error && e.error.message) || "error",
      stack: e.error?.stack || "",
      source: "window.onerror",
      url: `${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}`
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    logError({
      message: reason?.message || String(reason || "unhandled rejection"),
      stack: reason?.stack || "",
      source: "unhandledrejection",
      url: ""
    });
  });
}
