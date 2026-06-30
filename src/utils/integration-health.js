// Vantage integration health diagnostics.
//
// Local-only status ledger for optional external integrations. Widgets and
// helper modules record short redacted events here; Settings renders/copies
// the ledger so users can diagnose failures without DevTools or telemetry.

const STORAGE_KEY = "vantageIntegrationHealth";
const MAX_RECORDS = 80;
const SECRET_KEY_RE = /(?:api[_-]?key|token|authorization|password|passphrase|secret|x-cg-demo-api-key)/i;

export async function recordIntegrationEvent(id, event = {}) {
  try {
    const api = storageApi();
    if (!api?.get || !api?.set || !id) return;
    const stored = await api.get(STORAGE_KEY);
    const records = stored?.[STORAGE_KEY] && typeof stored[STORAGE_KEY] === "object"
      ? stored[STORAGE_KEY]
      : {};
    const cleanId = safeId(id);
    const now = isoNow(event.at);
    const current = records[cleanId] || { id: cleanId };
    const next = {
      ...current,
      id: cleanId,
      updatedAt: now,
      label: sanitizeText(event.label || current.label || humanizeId(cleanId), 120)
    };

    if (event.endpoint) next.endpoint = redactEndpoint(event.endpoint);
    if (event.source) next.source = sanitizeText(event.source, 80);
    if (event.cacheAgeMs != null) next.cacheAgeMs = safeNumber(event.cacheAgeMs);
    if (event.count != null) next.count = safeNumber(event.count);

    const kind = event.kind || event.status || "success";
    if (kind === "error") {
      next.lastStatus = "error";
      next.lastErrorAt = now;
      next.lastError = sanitizeText(redactSecrets(event.message || event.error?.message || event.error || "unknown error"), 260);
    } else if (kind === "cache") {
      next.lastStatus = "cached";
      next.lastCacheAt = now;
      next.lastMessage = sanitizeText(redactSecrets(event.message || "served from cache"), 180);
    } else {
      next.lastStatus = "ok";
      next.lastSuccessAt = now;
      next.lastMessage = sanitizeText(redactSecrets(event.message || "success"), 180);
    }

    records[cleanId] = next;
    await api.set({ [STORAGE_KEY]: pruneRecords(records) });
  } catch {
    // Diagnostics must never break the integration being diagnosed.
  }
}

export async function readIntegrationHealth() {
  try {
    const api = storageApi();
    if (!api?.get) return {};
    const stored = await api.get(STORAGE_KEY);
    const records = stored?.[STORAGE_KEY];
    return records && typeof records === "object" ? records : {};
  } catch {
    return {};
  }
}

export async function clearIntegrationHealth() {
  try {
    const api = storageApi();
    if (!api?.remove) return;
    await api.remove(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function getIntegrationDiagnostics(settings = {}) {
  const records = await readIntegrationHealth();
  return buildIntegrationDiagnostics(settings, records);
}

export function buildIntegrationDiagnostics(settings = {}, records = {}) {
  const now = Date.now();
  return getIntegrationDescriptors(settings)
    .filter(item => item.enabled)
    .map(item => {
      const record = records[item.id] || {};
      const status = record.lastStatus || "pending";
      const lastAt = record.lastSuccessAt || record.lastCacheAt || record.lastErrorAt || record.updatedAt || "";
      return {
        ...item,
        status,
        statusLabel: statusLabel(status),
        lastAt,
        lastAgo: lastAt ? formatAge(now - Date.parse(lastAt)) : "No local activity yet",
        lastSuccessAt: record.lastSuccessAt || "",
        lastErrorAt: record.lastErrorAt || "",
        lastCacheAt: record.lastCacheAt || "",
        lastError: record.lastError || "",
        lastMessage: record.lastMessage || "",
        source: record.source || "",
        endpoint: record.endpoint || item.endpoint || "",
        count: record.count,
        cacheAgeMs: record.cacheAgeMs
      };
    });
}

export function getIntegrationDescriptors(settings = {}) {
  const rssCount = enabledFeedCount(settings.rss);
  const newsCount = enabledFeedCount(settings.news);
  const calendarCount = settings.calendar?.enabled ? (settings.calendar.feeds || []).filter(feed => feed?.url).length : 0;
  const faviconConsumers =
    (settings.quicklinks?.enabled && ((settings.quicklinks.items || []).length || (settings.quicklinks.groups || []).length)) ||
    rssCount || newsCount || settings.bookmarks?.enabled || settings.topsites?.enabled || settings.historySearch?.enabled;
  const animatedBackground =
    settings.background?.enabled !== false && (settings.background?.kind || "animated") === "animated";

  return [
    {
      id: "weather-open-meteo",
      label: "Weather and forecast (Open-Meteo)",
      endpoint: "api.open-meteo.com",
      enabled: !!settings.weather?.enabled || animatedBackground || !!settings.weather?.forecastEnabled || !!settings.weather?.showEnsembleConfidence
    },
    {
      id: "air-quality",
      label: "Air quality (Open-Meteo)",
      endpoint: "air-quality-api.open-meteo.com",
      enabled: !!settings.airquality?.enabled
    },
    {
      id: "marine-weather",
      label: "Marine weather (Open-Meteo)",
      endpoint: "marine-api.open-meteo.com",
      enabled: !!settings.marine?.enabled
    },
    {
      id: "flood-risk",
      label: "River flood risk (Open-Meteo)",
      endpoint: "flood-api.open-meteo.com",
      enabled: !!settings.flood?.enabled
    },
    {
      id: "solar-radiation",
      label: "Solar radiation (Open-Meteo)",
      endpoint: "api.open-meteo.com",
      enabled: !!settings.solarRadiation?.enabled
    },
    {
      id: "feeds",
      label: `RSS and News feeds (${rssCount + newsCount})`,
      endpoint: "user feeds, allorigins.win, corsproxy.io",
      enabled: rssCount + newsCount > 0
    },
    {
      id: "feed-prewarm",
      label: "Feed pre-warm cache",
      endpoint: "chrome.storage.local",
      enabled: !!settings.feedPreWarm?.enabled && rssCount + newsCount > 0
    },
    {
      id: "calendar-feeds",
      label: `Calendar feeds (${calendarCount})`,
      endpoint: "user iCal URLs, allorigins.win",
      enabled: calendarCount > 0
    },
    {
      id: "github-api",
      label: "GitHub API",
      endpoint: "api.github.com",
      enabled: !!settings.github?.enabled
    },
    {
      id: "coingecko",
      label: "CoinGecko prices",
      endpoint: "api.coingecko.com",
      enabled: !!settings.crypto?.enabled
    },
    {
      id: "photo",
      label: settings.photo?.source === "nasa" ? "NASA APOD photo" : "Picsum photo",
      endpoint: settings.photo?.source === "nasa" ? "api.nasa.gov" : "picsum.photos",
      enabled: !!settings.photo?.enabled
    },
    {
      id: "bing-daily",
      label: "Bing daily wallpaper",
      endpoint: "bing.com",
      enabled: settings.background?.enabled !== false && settings.background?.kind === "bing-daily"
    },
    {
      id: "favicons",
      label: "Favicon services",
      endpoint: "google.com, duckduckgo.com, user origins",
      enabled: !!faviconConsumers
    }
  ];
}

export function formatIntegrationDiagnostics(settings = {}, records = {}) {
  const rows = buildIntegrationDiagnostics(settings, records);
  const header = [
    "# Vantage integration diagnostics",
    `- generated: ${new Date().toISOString()}`,
    `- enabledIntegrations: ${rows.length}`,
    "",
    "```log"
  ];
  const lines = [];
  for (const row of rows) {
    lines.push(`[${row.statusLabel}] ${row.label}`);
    lines.push(`  last: ${row.lastAgo}`);
    if (row.endpoint) lines.push(`  endpoint: ${redactEndpoint(row.endpoint)}`);
    if (row.source) lines.push(`  source: ${redactSecrets(row.source)}`);
    if (row.lastSuccessAt) lines.push(`  lastSuccess: ${row.lastSuccessAt}`);
    if (row.lastCacheAt) lines.push(`  lastCache: ${row.lastCacheAt}`);
    if (row.lastErrorAt) lines.push(`  lastErrorAt: ${row.lastErrorAt}`);
    if (row.lastError) lines.push(`  lastError: ${redactSecrets(row.lastError)}`);
    if (row.lastMessage) lines.push(`  message: ${redactSecrets(row.lastMessage)}`);
    if (row.cacheAgeMs != null) lines.push(`  cacheAge: ${formatAge(row.cacheAgeMs)}`);
    if (row.count != null) lines.push(`  count: ${row.count}`);
    lines.push("");
  }
  const body = lines.join("\n").replace(/```/g, "'''");
  return [...header, body, "```"].join("\n");
}

export function redactSecrets(value) {
  return String(value || "")
    .replace(/(x-cg-demo-api-key\s*[:=]\s*)[^\s,;&]+/gi, "$1REDACTED")
    .replace(/(authorization\s*[:=]\s*Bearer\s+)[^\s,;&]+/gi, "$1REDACTED")
    .replace(/((?:api[_-]?key|token|password|passphrase|secret)\s*[=:]\s*)[^\s,;&]+/gi, "$1REDACTED");
}

export function redactEndpoint(value) {
  const raw = redactSecrets(value);
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_KEY_RE.test(key)) url.searchParams.set(key, "REDACTED");
    }
    return url.toString();
  } catch {
    return sanitizeText(raw, 220);
  }
}

export function formatAge(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  if (ms < 1000) return "just now";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  return `${days}d ago`;
}

function statusLabel(status) {
  if (status === "ok") return "OK";
  if (status === "cached") return "Cached";
  if (status === "error") return "Error";
  return "Pending";
}

function enabledFeedCount(section) {
  if (!section?.enabled) return 0;
  return (section.feeds || []).filter(feed => feed?.url).length;
}

function storageApi() {
  return globalThis.chrome?.storage?.local || globalThis.browser?.storage?.local || null;
}

function pruneRecords(records) {
  const entries = Object.entries(records)
    .sort(([, a], [, b]) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))
    .slice(0, MAX_RECORDS);
  return Object.fromEntries(entries);
}

function safeId(value) {
  return String(value || "integration").toLowerCase().replace(/[^a-z0-9_.:-]+/g, "-").slice(0, 80) || "integration";
}

function humanizeId(id) {
  return String(id).replace(/[-_:]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function isoNow(value) {
  const date = value ? new Date(value) : new Date();
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function sanitizeText(value, maxLength) {
  return redactSecrets(String(value || ""))
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .slice(0, maxLength);
}
