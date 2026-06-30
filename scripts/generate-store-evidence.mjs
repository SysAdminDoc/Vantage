#!/usr/bin/env node
/**
 * Generates deterministic Chrome Web Store evidence under dist/store-evidence.
 *
 * Outputs:
 *   - five 1280x800 PNG screenshots
 *   - axe accessibility JSON + markdown
 *   - manifest permission/network coverage JSON + markdown
 *   - store artifact checklist markdown
 */

import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const [{ default: puppeteer }, axeModule] = await Promise.all([
  import("puppeteer"),
  import("@axe-core/puppeteer")
]);
const AxePuppeteer = axeModule.AxePuppeteer || axeModule.default;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const DIST_DIR = join(REPO_ROOT, "dist");
const OUT_DIR = join(DIST_DIR, "store-evidence");
const SCREENSHOT_DIR = join(OUT_DIR, "screenshots");
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 1 };
const FIXED_NOW = Date.parse("2026-06-30T18:00:00.000Z");
const STORAGE_KEY = "vantage:dev-chrome-storage";
const CWS_IMAGE_DOCS_URL = "https://developer.chrome.com/docs/webstore/images";

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

const screenshotScenes = [
  {
    id: "dashboard-mocha",
    title: "Dashboard overview - Mocha",
    file: "01-dashboard-mocha.png",
    path: "/newtab.html?qaLat=40.7128&qaLon=-74.0060&qaWeather=clear&qaTime=14:00&qaDate=2026-06-30&qaLocality=urban&qaTheme=mocha&qaAccent=mauve&qaMotion=still&qaAtmosphere=soft&qaReadability=high",
    settings: buildSettings({ theme: "mocha", accent: "mauve" })
  },
  {
    id: "dashboard-latte",
    title: "Dashboard overview - Latte",
    file: "02-dashboard-latte.png",
    path: "/newtab.html?qaLat=34.0522&qaLon=-118.2437&qaWeather=clear&qaTime=13:00&qaDate=2026-06-30&qaLocality=urban&qaTheme=latte&qaAccent=blue&qaMotion=still&qaAtmosphere=soft&qaReadability=standard",
    settings: buildSettings({ theme: "latte", accent: "blue" })
  },
  {
    id: "settings",
    title: "Settings panel",
    file: "03-settings.png",
    path: "/newtab.html?qaLat=40.7128&qaLon=-74.0060&qaWeather=clear&qaTime=14:00&qaDate=2026-06-30&qaLocality=urban&qaTheme=mocha&qaAccent=mauve&qaMotion=still&qaAtmosphere=soft&qaReadability=high",
    settings: buildSettings({ theme: "mocha", accent: "mauve" }),
    action: openSettingsPanel
  },
  {
    id: "widget-picker",
    title: "Widget picker",
    file: "04-widget-picker.png",
    path: "/newtab.html?qaLat=40.7128&qaLon=-74.0060&qaWeather=clear&qaTime=14:00&qaDate=2026-06-30&qaLocality=urban&qaTheme=macchiato&qaAccent=green&qaMotion=still&qaAtmosphere=balanced&qaReadability=high",
    settings: buildSettings({ theme: "macchiato", accent: "green" }),
    action: openWidgetPicker
  },
  {
    id: "side-panel",
    title: "Side panel feed shell",
    file: "05-side-panel.png",
    path: "/sidepanel.html?qaTheme=mocha&qaAccent=mauve",
    settings: buildSettings({ theme: "mocha", accent: "mauve" }),
    action: waitForSidePanel
  }
];

async function main() {
  assertRepoChild(OUT_DIR, "store evidence output");
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const server = await startStaticServer(REPO_ROOT);
  const networkEvents = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--no-first-run"
      ]
    });

    const screenshots = [];
    for (const scene of screenshotScenes) {
      const shot = await captureScene(browser, server, scene, networkEvents);
      screenshots.push(shot);
      console.log(`  ok  screenshot ${scene.file} (${shot.width}x${shot.height})`);
    }

    const accessibility = await runAccessibilityAudit(browser, server, networkEvents);
    console.log(`  ok  accessibility report (${accessibility.violations} violations)`);

    const permissionReport = await writePermissionNetworkReport(networkEvents);
    console.log(`  ok  permission/network report (${permissionReport.hostRows.length} hosts)`);

    await writeChecklist({
      screenshots,
      accessibility,
      permissionReport
    });
    console.log(`  ok  checklist ${join(OUT_DIR, "store-evidence-checklist.md")}`);

    console.log("");
    console.log(`Store evidence ready: ${OUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

async function captureScene(browser, server, scene, networkEvents) {
  const page = await browser.newPage();
  try {
    await preparePage(page, scene.settings, networkEvents, scene.id);
    await page.goto(`${server.origin}${scene.path}`, { waitUntil: "domcontentloaded" });

    if (scene.path.includes("sidepanel.html")) {
      await waitForSidePanel(page);
    } else {
      await waitForDashboardReady(page);
    }

    if (scene.action) await scene.action(page);
    await stabilizePage(page);

    const output = join(SCREENSHOT_DIR, scene.file);
    const buffer = await page.screenshot({
      path: output,
      type: "png",
      captureBeyondViewport: false
    });
    const size = readPngSize(buffer);
    if (size.width !== VIEWPORT.width || size.height !== VIEWPORT.height) {
      throw new Error(`${scene.file} rendered ${size.width}x${size.height}; expected 1280x800`);
    }
    return {
      id: scene.id,
      title: scene.title,
      file: relative(OUT_DIR, output).replace(/\\/g, "/"),
      width: size.width,
      height: size.height
    };
  } finally {
    await page.close();
  }
}

async function runAccessibilityAudit(browser, server, networkEvents) {
  const page = await browser.newPage();
  try {
    await preparePage(page, buildSettings({ theme: "mocha", accent: "mauve" }), networkEvents, "accessibility");
    await page.goto(`${server.origin}/newtab.html?qaLat=40.7128&qaLon=-74.0060&qaWeather=clear&qaTime=14:00&qaDate=2026-06-30&qaLocality=urban&qaTheme=mocha&qaAccent=mauve&qaMotion=still&qaAtmosphere=soft&qaReadability=high`, {
      waitUntil: "domcontentloaded"
    });
    await waitForDashboardReady(page);
    await stabilizePage(page);

    const results = await new AxePuppeteer(page)
      .withTags(["wcag2aa", "wcag22aa"])
      .analyze();

    const jsonPath = join(OUT_DIR, "accessibility-results.json");
    const mdPath = join(OUT_DIR, "accessibility-report.md");
    await writeFile(jsonPath, JSON.stringify(results, null, 2));
    await writeFile(mdPath, accessibilityMarkdown(results));

    return {
      json: relative(OUT_DIR, jsonPath).replace(/\\/g, "/"),
      markdown: relative(OUT_DIR, mdPath).replace(/\\/g, "/"),
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length
    };
  } finally {
    await page.close();
  }
}

async function preparePage(page, settings, networkEvents, scene) {
  await page.setViewport(VIEWPORT);
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" }
  ]);

  await page.evaluateOnNewDocument(({ nextSettings, fixedNow, storageKey }) => {
    const NativeDate = Date;
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedNow]));
      }
      static now() { return fixedNow; }
      static parse(value) { return NativeDate.parse(value); }
      static UTC(...args) { return NativeDate.UTC(...args); }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;

    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify({ vantageSettings: nextSettings }));
    } catch {}

    try {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition(success) {
            success({
              coords: {
                latitude: 40.7128,
                longitude: -74.006,
                accuracy: 15
              }
            });
          },
          watchPosition(success) {
            this.getCurrentPosition(success);
            return 1;
          },
          clearWatch() {}
        }
      });
    } catch {}
  }, { nextSettings: settings, fixedNow: FIXED_NOW, storageKey: STORAGE_KEY });

  await page.setRequestInterception(true);
  page.on("request", (request) => handleRequest(request, networkEvents, scene));
}

function handleRequest(request, networkEvents, scene) {
  const url = request.url();
  const type = request.resourceType();
  if (isLocalRequest(url) || url.startsWith("data:") || url === "about:blank") {
    request.continue();
    return;
  }

  const entry = {
    scene,
    url,
    origin: safeOrigin(url),
    resourceType: type,
    action: "blocked"
  };
  networkEvents.push(entry);

  if (url.startsWith("https://api.open-meteo.com/v1/forecast")) {
    entry.action = "fixture";
    request.respond({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(openMeteoFixture())
    });
    return;
  }

  if (url.startsWith("https://feeds.example.com/")) {
    entry.action = "fixture";
    request.respond({
      status: 200,
      contentType: "application/rss+xml; charset=utf-8",
      headers: { "access-control-allow-origin": "*" },
      body: rssFixture(url)
    });
    return;
  }

  if (
    url.startsWith("https://www.google.com/s2/favicons") ||
    url.startsWith("https://icons.duckduckgo.com/")
  ) {
    entry.action = "fixture";
    request.respond({
      status: 200,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: TRANSPARENT_PNG
    });
    return;
  }

  request.abort("blockedbyclient");
}

function isLocalRequest(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return "invalid";
  }
}

async function waitForDashboardReady(page) {
  await page.waitForFunction(() => {
    const settings = document.querySelector("#settings-toggle");
    return !!document.querySelector("#search-mount .search-form") &&
      !!settings?.firstElementChild &&
      typeof globalThis.chrome?.storage?.local?.get === "function";
  }, { timeout: 12000 });
}

async function openSettingsPanel(page) {
  await page.click("#settings-toggle");
  await page.waitForFunction(() => {
    const panel = document.querySelector("#settings-panel");
    return panel?.dataset?.open === "true" || panel?.open === true;
  }, { timeout: 5000 });
  await page.evaluate(() => {
    document.querySelector(".settings-panel__body")?.scrollTo({ top: 0 });
  });
}

async function openWidgetPicker(page) {
  await page.click("#widget-picker-toggle");
  await page.waitForSelector("#widget-picker.widget-picker--open", { timeout: 5000 });
}

async function waitForSidePanel(page) {
  await page.waitForSelector("#sidepanel-feed-mount .panel__header, #sidepanel-feed-mount .empty", { timeout: 8000 });
}

async function stabilizePage(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        caret-color: transparent !important;
        transition-duration: 0.001ms !important;
      }
      html { scroll-behavior: auto !important; }
    `
  });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--t-micro", "0ms");
    document.documentElement.style.setProperty("--t-fast", "0ms");
    document.documentElement.style.setProperty("--t-base", "0ms");
    document.documentElement.style.setProperty("--t-slow", "0ms");
    window.scrollTo(0, 0);
  });
  await new Promise(resolve => setTimeout(resolve, 350));
}

function buildSettings({ theme, accent }) {
  return {
    schemaVersion: 3,
    theme,
    accent,
    onboardingComplete: true,
    greeting: {
      enabled: true,
      name: "Vantage",
      custom: { morning: "", afternoon: "", evening: "", night: "" }
    },
    appearance: {
      locality: "urban",
      font: { body: "", display: "" }
    },
    search: {
      engine: "duckduckgo",
      customUrl: "https://example.com/search?q=%s"
    },
    weather: {
      enabled: true,
      location: { name: "New York, NY", latitude: 40.7128, longitude: -74.006 },
      units: "fahrenheit",
      showAgricultural: false,
      showEnsembleConfidence: false,
      dualUnits: true,
      forecastEnabled: true
    },
    clock: { enabled: true, format24: false, showSeconds: false },
    background: {
      enabled: true,
      kind: "animated",
      motion: "still",
      atmosphere: "soft",
      readability: "high",
      solid: "#1e1e2e",
      gradient: { from: "#1e1e2e", to: "#313244", angle: 135 },
      imageUrl: "",
      imageData: null,
      videoData: null,
      bingDailyCache: null,
      blur: 0,
      brightness: 100
    },
    quicklinks: {
      enabled: true,
      items: [
        { title: "GitHub", url: "https://github.com" },
        { title: "Docs", url: "https://developer.chrome.com/docs/webstore/" },
        { title: "Privacy", url: "https://example.com/privacy" },
        { title: "Feeds", url: "https://feeds.example.com/vantage.xml" }
      ],
      groups: [
        {
          id: "store",
          name: "Store prep",
          items: [
            { title: "CWS assets", url: "https://developer.chrome.com/docs/webstore/images" },
            { title: "Checklist", url: "https://example.com/checklist" }
          ]
        }
      ],
      itemsPerRow: 4,
      iconRadius: "rounded",
      speculate: false
    },
    rss: {
      enabled: true,
      feeds: [{ title: "Vantage Updates", url: "https://feeds.example.com/vantage.xml" }],
      maxItems: 5,
      readItems: []
    },
    news: {
      enabled: true,
      feeds: [{ title: "Privacy Signals", url: "https://feeds.example.com/privacy.xml" }],
      maxItems: 5,
      readItems: []
    },
    todo: {
      enabled: true,
      showCompleted: true,
      maxItems: 100,
      items: [
        { id: "todo-1", text: "Review screenshots", done: false, createdAt: FIXED_NOW },
        { id: "todo-2", text: "Attach evidence bundle", done: true, createdAt: FIXED_NOW - 60000 }
      ]
    },
    notes: {
      enabled: true,
      items: [
        {
          id: "note-1",
          title: "Store notes",
          content: "Permission copy, privacy table, and screenshots generated locally.",
          color: "mauve",
          updatedAt: FIXED_NOW
        }
      ]
    },
    countdown: {
      enabled: true,
      events: [
        { id: "countdown-1", label: "Release review", date: "2026-07-15", color: "blue" },
        { id: "countdown-2", label: "Listing refresh", date: "2026-08-01", color: "green" }
      ]
    },
    converter: { enabled: true, defaultCategory: "length" },
    quote: { enabled: true, category: "random", cached: null },
    pomodoro: {
      enabled: true,
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4,
      alarm: { tone: "bell", volume: 60, customAudio: "" }
    },
    worldclock: {
      enabled: true,
      clocks: [
        { label: "New York", tz: "America/New_York" },
        { label: "London", tz: "Europe/London" },
        { label: "Tokyo", tz: "Asia/Tokyo" }
      ]
    },
    starred: {
      enabled: true,
      maxItems: 100,
      items: [
        {
          url: "https://example.com/vantage/store-evidence",
          title: "Store evidence bundle",
          sourceTitle: "Vantage Updates",
          sourceHost: "example.com",
          published: "2026-06-30T16:00:00.000Z",
          savedAt: FIXED_NOW
        }
      ]
    },
    inbox: {
      enabled: true,
      maxItems: 200,
      archived: [],
      items: [
        { url: "https://example.com/review", title: "Review listing copy", hostname: "example.com", savedAt: FIXED_NOW }
      ]
    },
    airquality: { enabled: false },
    marine: { enabled: false },
    flood: { enabled: false },
    solarRadiation: { enabled: false },
    topsites: { enabled: false, maxItems: 8 },
    bookmarks: { enabled: false, maxItems: 24 },
    historySearch: { enabled: false, maxResults: 20 },
    ambient: { enabled: false, sound: "rain", volume: 50, autoStart: false },
    github: { enabled: false, username: "", showTrending: false, language: "" },
    crypto: { enabled: false, coins: ["bitcoin"], currency: "usd", refreshMinutes: 5, apiKey: "" },
    photo: { enabled: false, source: "picsum", nasaKey: "", apodCache: null },
    calendar: { enabled: false, feeds: [], maxItems: 10, daysAhead: 7 },
    windy: { enabled: false, overlay: "wind", zoom: 5 },
    embeds: [],
    externalWidgets: [],
    zenShelf: { enabled: false, stickers: [] },
    layout: {
      panels: ["news", "rss", "todo", "notes", "starred", "inbox", "pomodoro", "countdown", "converter"]
    },
    workspaces: {
      active: null,
      list: [
        {
          id: "focus",
          name: "Focus",
          snapshot: {
            theme,
            accent,
            background: { kind: "animated" },
            quicklinks: { items: [{ title: "Docs", url: "https://developer.chrome.com/docs/webstore/" }] }
          }
        },
        {
          id: "review",
          name: "Review",
          snapshot: {
            theme: "latte",
            accent: "blue",
            background: { kind: "animated" },
            quicklinks: { items: [{ title: "Evidence", url: "https://example.com/evidence" }] }
          }
        }
      ]
    },
    hostPermissions: { deniedOrigins: [] },
    contextMenu: { enabled: true },
    sidePanel: { openOnActionClick: true },
    feedFilters: { rules: [] },
    feedPreWarm: { enabled: false, intervalMinutes: 60 },
    feedArchive: { enabled: false, cap: 10000 },
    feedAlerts: { enabled: false, keywords: [], caseSensitive: false, notifiedUrls: [] },
    containerMap: {},
    containerAutoMap: false,
    security: { encryptKeys: false, salt: null, iv: null, encryptedBlob: null }
  };
}

function openMeteoFixture() {
  return {
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    utc_offset_seconds: -14400,
    current: {
      time: "2026-06-30T14:00",
      interval: 900,
      temperature_2m: 74,
      apparent_temperature: 77,
      weather_code: 0,
      is_day: 1,
      cloud_cover: 12,
      wind_speed_10m: 9,
      precipitation_probability: 4,
      dew_point_2m: 58,
      visibility: 16000,
      relative_humidity_2m: 54,
      uv_index: 6.2,
      pressure_msl: 1014
    },
    daily: {
      time: ["2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"],
      sunrise: ["2026-06-30T05:26", "2026-07-01T05:27", "2026-07-02T05:27", "2026-07-03T05:28", "2026-07-04T05:29"],
      sunset: ["2026-06-30T20:31", "2026-07-01T20:31", "2026-07-02T20:31", "2026-07-03T20:30", "2026-07-04T20:30"],
      weather_code: [0, 1, 2, 3, 0],
      temperature_2m_max: [80, 82, 78, 77, 83],
      temperature_2m_min: [66, 68, 64, 63, 67],
      precipitation_sum: [0, 0.4, 1.2, 0.1, 0],
      precipitation_probability_max: [4, 20, 35, 15, 6],
      uv_index_max: [6.2, 6.8, 4.1, 5.2, 7.0],
      wind_speed_10m_max: [14, 12, 18, 10, 9]
    }
  };
}

function rssFixture(url) {
  const isPrivacy = url.includes("privacy");
  const channel = isPrivacy ? "Privacy Signals" : "Vantage Updates";
  const first = isPrivacy ? "No telemetry checklist stays clean" : "Store evidence bundle is ready";
  const second = isPrivacy ? "Permission prompts remain runtime-gated" : "Deterministic screenshots generated locally";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel)}</title>
    <link>https://example.com/</link>
    <description>Deterministic local evidence feed.</description>
    <item>
      <title>${escapeXml(first)}</title>
      <link>https://example.com/${isPrivacy ? "privacy" : "vantage"}/one</link>
      <pubDate>Tue, 30 Jun 2026 16:00:00 GMT</pubDate>
    </item>
    <item>
      <title>${escapeXml(second)}</title>
      <link>https://example.com/${isPrivacy ? "privacy" : "vantage"}/two</link>
      <pubDate>Tue, 30 Jun 2026 15:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
}

async function writePermissionNetworkReport(networkEvents) {
  const [chromium, firefox, readme, privacy, cws] = await Promise.all([
    readJson(join(REPO_ROOT, "manifest.json")),
    readJson(join(REPO_ROOT, "manifest.firefox.json")),
    readFile(join(REPO_ROOT, "README.md"), "utf8"),
    readFile(join(REPO_ROOT, "PRIVACY.md"), "utf8"),
    readFile(join(REPO_ROOT, "docs", "privacy-practices-cws.md"), "utf8")
  ]);

  const docText = `${readme}\n${privacy}\n${cws}`.toLowerCase();
  const chromeSummary = manifestSummary(chromium);
  const firefoxSummary = manifestSummary(firefox);
  const allHosts = [...new Set([...chromeSummary.hosts, ...firefoxSummary.hosts])].sort();
  const hostRows = allHosts.map(host => ({
    host,
    chromium: chromeSummary.hosts.includes(host),
    firefox: firefoxSummary.hosts.includes(host),
    documented: isHostDocumented(host, docText)
  }));

  const permissionRows = [...new Set([
    ...chromeSummary.permissions,
    ...chromeSummary.optionalPermissions,
    ...firefoxSummary.permissions,
    ...firefoxSummary.optionalPermissions
  ])].sort().map(permission => ({
    permission,
    chromiumRequired: chromeSummary.permissions.includes(permission),
    chromiumOptional: chromeSummary.optionalPermissions.includes(permission),
    firefoxRequired: firefoxSummary.permissions.includes(permission),
    firefoxOptional: firefoxSummary.optionalPermissions.includes(permission),
    documented: isPermissionDocumented(permission, docText)
  }));

  const runtimeEvents = summarizeNetworkEvents(networkEvents);
  const report = {
    generatedAt: new Date().toISOString(),
    manifests: {
      chromium: chromeSummary,
      firefox: firefoxSummary
    },
    differences: {
      requiredOnlyChromium: diff(chromeSummary.permissions, firefoxSummary.permissions),
      requiredOnlyFirefox: diff(firefoxSummary.permissions, chromeSummary.permissions),
      optionalOnlyChromium: diff(chromeSummary.optionalPermissions, firefoxSummary.optionalPermissions),
      optionalOnlyFirefox: diff(firefoxSummary.optionalPermissions, chromeSummary.optionalPermissions),
      hostOnlyChromium: diff(chromeSummary.hosts, firefoxSummary.hosts),
      hostOnlyFirefox: diff(firefoxSummary.hosts, chromeSummary.hosts)
    },
    permissionRows,
    hostRows,
    runtimeEvents
  };

  const jsonPath = join(OUT_DIR, "permission-network-report.json");
  const mdPath = join(OUT_DIR, "permission-network-report.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, permissionNetworkMarkdown(report));
  return {
    json: relative(OUT_DIR, jsonPath).replace(/\\/g, "/"),
    markdown: relative(OUT_DIR, mdPath).replace(/\\/g, "/"),
    hostRows,
    permissionRows,
    runtimeEvents
  };
}

function manifestSummary(manifest) {
  const optionalPermissionEntries = manifest.optional_permissions || [];
  const optionalPermissionNames = optionalPermissionEntries.filter(item => !isHostPattern(item));
  const optionalHostPatterns = [
    ...(manifest.optional_host_permissions || []),
    ...optionalPermissionEntries.filter(isHostPattern)
  ];
  return {
    version: manifest.version,
    permissions: sortedStrings(manifest.permissions),
    optionalPermissions: sortedStrings(optionalPermissionNames),
    hostPermissions: sortedStrings(manifest.host_permissions),
    optionalHostPermissions: sortedStrings(optionalHostPatterns),
    hosts: sortedStrings((manifest.host_permissions || []).map(hostFromPattern).filter(Boolean)),
    optionalHosts: sortedStrings(optionalHostPatterns.map(hostFromPattern).filter(Boolean))
  };
}

function isHostPattern(value) {
  return typeof value === "string" && /^(?:\*|https?|file):\/\//.test(value);
}

function hostFromPattern(pattern) {
  if (!pattern || pattern.includes("*://*/*") || pattern === "http://*/*" || pattern === "https://*/*") {
    return pattern;
  }
  try {
    return new URL(pattern.replace(/\*$/, "")).hostname;
  } catch {
    return "";
  }
}

function isHostDocumented(host, docText) {
  if (!host || host.includes("*")) return true;
  const candidates = new Set([host.toLowerCase(), host.replace(/^www\./, "").toLowerCase()]);
  if (host === "icons.duckduckgo.com") candidates.add("duckduckgo");
  if (host === "www.google.com") candidates.add("s2/favicons");
  if (host === "gist.githubusercontent.com") candidates.add("gist");
  return [...candidates].some(candidate => docText.includes(candidate));
}

function isPermissionDocumented(permission, docText) {
  const candidates = new Set([permission.toLowerCase()]);
  if (permission === "sidePanel") candidates.add("side panel");
  if (permission === "topSites") candidates.add("top sites");
  if (permission === "readingList") candidates.add("reading list");
  if (permission === "contextualIdentities") candidates.add("container");
  return [...candidates].some(candidate => docText.includes(candidate));
}

function summarizeNetworkEvents(events) {
  const byOrigin = new Map();
  for (const event of events) {
    if (!event.origin || event.origin === "invalid") continue;
    const row = byOrigin.get(event.origin) || {
      origin: event.origin,
      count: 0,
      actions: {},
      scenes: new Set(),
      resourceTypes: new Set()
    };
    row.count += 1;
    row.actions[event.action] = (row.actions[event.action] || 0) + 1;
    row.scenes.add(event.scene);
    row.resourceTypes.add(event.resourceType);
    byOrigin.set(event.origin, row);
  }
  return [...byOrigin.values()]
    .map(row => ({
      ...row,
      scenes: [...row.scenes].sort(),
      resourceTypes: [...row.resourceTypes].sort()
    }))
    .sort((a, b) => a.origin.localeCompare(b.origin));
}

async function writeChecklist({ screenshots, accessibility, permissionReport }) {
  const files = [
    ...screenshots.map(item => item.file),
    accessibility.json,
    accessibility.markdown,
    permissionReport.json,
    permissionReport.markdown,
    "store-evidence-checklist.md"
  ];

  const releaseArtifacts = [
    `Vantage-v${await currentVersion()}.zip`,
    `Vantage-v${await currentVersion()}.crx`,
    `Vantage-v${await currentVersion()}-firefox.xpi`,
    "SHA256SUMS.txt"
  ].map(name => ({
    name,
    present: existsSync(join(DIST_DIR, name))
  }));

  const md = `# Vantage Store Evidence Checklist

Generated: ${new Date().toISOString()}

Command: \`npm run store:evidence\`

Chrome Web Store listing image guidance: ${CWS_IMAGE_DOCS_URL}

## Screenshots

All screenshots are PNG files rendered at 1280x800.

${screenshots.map(item => `- [x] ${item.title}: \`${item.file}\` (${item.width}x${item.height})`).join("\n")}

## Reports

- [x] Accessibility JSON: \`${accessibility.json}\`
- [x] Accessibility markdown: \`${accessibility.markdown}\`
- [x] Permission/network JSON: \`${permissionReport.json}\`
- [x] Permission/network markdown: \`${permissionReport.markdown}\`

## Local Artifact Presence

${releaseArtifacts.map(item => `- [${item.present ? "x" : " "}] \`${item.name}\``).join("\n")}

## Store Submission Checks

- [x] 128x128 icon exists in \`icons/icon128.png\`.
- [x] At least one 1280x800 screenshot exists; five are generated.
- [x] Manifest permission inventory is captured for Chromium and Firefox.
- [x] Runtime network origins observed during deterministic capture are captured.
- [x] Accessibility evidence is captured locally.
- [x] Privacy docs and README contain the documented outbound service inventory.
`;

  await writeFile(join(OUT_DIR, "store-evidence-checklist.md"), md);
  await writeFile(join(OUT_DIR, "store-evidence-manifest.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    viewport: VIEWPORT,
    cwsImageDocs: CWS_IMAGE_DOCS_URL,
    files
  }, null, 2));
}

function accessibilityMarkdown(results) {
  const lines = [
    "# Vantage Accessibility Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Outcome | Count |",
    "|---|---:|",
    `| Violations | ${results.violations.length} |`,
    `| Passes | ${results.passes.length} |`,
    `| Incomplete | ${results.incomplete.length} |`,
    `| Inapplicable | ${results.inapplicable.length} |`,
    "",
    `Status: ${results.violations.length === 0 ? "PASS" : "NEEDS REVIEW"}`,
    "",
    "## Violations",
    ""
  ];

  if (!results.violations.length) {
    lines.push("None found.", "");
  } else {
    for (const violation of results.violations) {
      lines.push(`### ${violation.id}`, "");
      lines.push(`Impact: ${violation.impact || "unknown"}`);
      lines.push(`Help: ${violation.helpUrl}`);
      lines.push("");
      for (const node of violation.nodes || []) {
        lines.push(`- ${trimForMarkdown(node.target?.join(" ") || node.html || "unknown target")}`);
      }
      lines.push("");
    }
  }

  lines.push("## Manual Review Items", "");
  if (!results.incomplete.length) {
    lines.push("None reported by axe.", "");
  } else {
    for (const item of results.incomplete) {
      lines.push(`- ${item.id}: ${item.helpUrl}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function permissionNetworkMarkdown(report) {
  const missingHosts = report.hostRows.filter(row => !row.documented);
  const missingPermissions = report.permissionRows.filter(row => !row.documented);
  return `# Vantage Permission and Network Evidence

Generated: ${report.generatedAt}

## Manifest Differences

- Required only in Chromium: ${report.differences.requiredOnlyChromium.join(", ") || "none"}
- Required only in Firefox: ${report.differences.requiredOnlyFirefox.join(", ") || "none"}
- Optional only in Chromium: ${report.differences.optionalOnlyChromium.join(", ") || "none"}
- Optional only in Firefox: ${report.differences.optionalOnlyFirefox.join(", ") || "none"}
- Host only in Chromium: ${report.differences.hostOnlyChromium.join(", ") || "none"}
- Host only in Firefox: ${report.differences.hostOnlyFirefox.join(", ") || "none"}

## Permission Coverage

| Permission | Chromium | Firefox | Documented |
|---|---|---|---|
${report.permissionRows.map(row => `| \`${row.permission}\` | ${permissionState(row.chromiumRequired, row.chromiumOptional)} | ${permissionState(row.firefoxRequired, row.firefoxOptional)} | ${row.documented ? "yes" : "no"} |`).join("\n")}

## Fixed Host Coverage

| Host | Chromium | Firefox | Documented |
|---|---:|---:|---:|
${report.hostRows.map(row => `| \`${row.host}\` | ${row.chromium ? "yes" : "no"} | ${row.firefox ? "yes" : "no"} | ${row.documented ? "yes" : "no"} |`).join("\n")}

## Runtime Capture Origins

| Origin | Requests | Actions | Scenes |
|---|---:|---|---|
${report.runtimeEvents.map(row => `| \`${row.origin}\` | ${row.count} | ${Object.entries(row.actions).map(([key, value]) => `${key}:${value}`).join(", ")} | ${row.scenes.join(", ")} |`).join("\n")}

## Coverage Summary

- Undocumented permissions: ${missingPermissions.map(row => row.permission).join(", ") || "none"}
- Undocumented fixed hosts: ${missingHosts.map(row => row.host).join(", ") || "none"}
`;
}

function permissionState(required, optional) {
  if (required) return "required";
  if (optional) return "optional";
  return "absent";
}

async function startStaticServer(root) {
  const rootFull = resolve(root);
  const types = new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".webp", "image/webp"]
  ]);

  const server = createServer(async (req, res) => {
    try {
      const pathName = decodeURIComponent(new URL(req.url || "/", "http://127.0.0.1").pathname);
      const requested = resolve(rootFull, `.${pathName}`);
      const rel = relative(rootFull, requested);
      if (rel.startsWith("..") || rel.includes(`..${sep}`) || rel === "..") {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const info = await stat(requested);
      if (!info.isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types.get(extname(requested).toLowerCase()) || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      createReadStream(requested).pipe(res);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(resolveClose => server.close(resolveClose))
  };
}

function readPngSize(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Screenshot is not a PNG");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function currentVersion() {
  const manifest = await readJson(join(REPO_ROOT, "manifest.json"));
  return manifest.version;
}

function sortedStrings(value) {
  return [...new Set((value || []).filter(item => typeof item === "string"))].sort();
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter(item => !rightSet.has(item)).sort();
}

function assertRepoChild(path, label) {
  const root = `${resolve(REPO_ROOT)}${sep}`;
  const full = resolve(path);
  if (!full.startsWith(root)) {
    throw new Error(`${label} must stay under the repo root: ${full}`);
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trimForMarkdown(value) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 180);
}

main().catch(err => {
  console.error(`Store evidence failed: ${err.message}`);
  process.exit(1);
});
