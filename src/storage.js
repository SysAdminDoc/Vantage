// Vantage v0.8.0 — chrome.storage.local wrapper with deep-merged defaults.

const DEFAULTS = {
  theme: "mocha",
  accent: "mauve",
  customCSS: "",
  greeting: {
    enabled: true,
    name: "",
    birthday: "",          // "MM-DD" — when set, triggers balloons all day
    custom: {              // Per-slot override; empty string falls back to defaults
      morning: "",
      afternoon: "",
      evening: "",
      night: ""
    }
  },
  appearance: {
    // "auto" | "coastal" | "urban" | "forest" | "lake" | "mountain"
    // | "desert" | "polar" | "tropical" | "meadow" | "default"
    locality: "auto"
  },
  search: {
    engine: "google",
    customUrl: "https://example.com/search?q=%s"
  },
  weather: {
    enabled: true,
    location: null,
    units: "fahrenheit"
  },
  clock: {
    enabled: true,
    format24: false,
    showSeconds: false
  },
  layout: {
    panels: ["news", "rss"]
  },
  background: {
    enabled: true,
    kind: "animated",       // "animated" | "solid" | "gradient" | "image-url" | "image-upload" | "bing-daily" | "video-upload"
    motion: "system",        // "system" | "still" | "calm" | "full"
    atmosphere: "balanced",  // "soft" | "balanced" | "vivid"
    readability: "standard", // "minimal" | "standard" | "high"
    solid: "#1e1e2e",
    gradient: { from: "#1e1e2e", to: "#313244", angle: 135 },
    imageUrl: "",
    imageData: null,         // base64 data-uri for uploaded image
    videoData: null,         // base64 data-uri for uploaded WebM video (8 MB cap)
    bingDailyCache: null,    // { url: string, date: "YYYY-MM-DD" }
    blur: 0,                 // 0–20 px  (image/bing/upload/video only)
    brightness: 100          // 50–150 % (image/bing/upload/video only)
  },
  quicklinks: {
    enabled: true,
    items: [
      { title: "GitHub", url: "https://github.com" },
      { title: "Reddit", url: "https://reddit.com" },
      { title: "YouTube", url: "https://youtube.com" },
      { title: "Hacker News", url: "https://news.ycombinator.com" },
      { title: "Gmail", url: "https://mail.google.com" },
      { title: "Calendar", url: "https://calendar.google.com" }
    ],
    groups: [],              // [{ id, name, items: [{ title, url }] }]
    itemsPerRow: "auto",     // "auto" | 3 | 4 | 5 | 6 | 8 | 10
    iconRadius: "rounded"    // "square" | "rounded" | "circle"
  },
  topsites: {
    enabled: false,
    maxItems: 8
  },
  rss: {
    enabled: true,
    feeds: [
      { title: "Hacker News", url: "https://hnrss.org/frontpage" }
    ],
    maxItems: 15,
    readItems: []
  },
  news: {
    enabled: true,
    feeds: [
      { title: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
      { title: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
      { title: "The Verge", url: "https://www.theverge.com/rss/index.xml" }
    ],
    maxItems: 15,
    readItems: []
  },
  feedFilters: {
    rules: []                // [{ id, pattern, field:"title"|"url", action:"mute"|"highlight", color:null }]
  },
  airquality: {
    enabled: false
  },
  windy: {
    enabled: false,
    overlay: "wind",
    zoom: 5
  },
  embeds: [],
  calendar: {
    enabled: false,
    feeds: [],
    maxItems: 10,
    daysAhead: 7
  },
  pomodoro: {
    enabled: false,
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    alarm: {
      tone: "bell",          // "none" | "bell" | "chime" | "digital" | "custom"
      volume: 60,            // 0-100
      customAudio: ""        // base64 data-uri (only when tone === "custom")
    }
  },
  todo: {
    enabled: false,
    items: [],
    showCompleted: true,
    maxItems: 100
  },
  notes: {
    enabled: false,
    items: []
  },
  bookmarks: {
    enabled: false,
    maxItems: 24
  },
  worldclock: {
    enabled: false,
    clocks: [
      { label: "UTC",      tz: "UTC" },
      { label: "New York", tz: "America/New_York" },
      { label: "London",   tz: "Europe/London" },
      { label: "Tokyo",    tz: "Asia/Tokyo" }
    ]
  },
  crypto: {
    enabled: false,
    coins: ["bitcoin", "ethereum", "solana"],
    currency: "usd",
    refreshMinutes: 5,
    apiKey: ""               // CoinGecko demo API key (x-cg-demo-api-key)
  },
  github: {
    enabled: false,
    username: "",
    showTrending: true,
    language: ""
  },
  quote: {
    enabled: false,
    category: "random",
    cached: null
  },
  photo: {
    enabled: false,
    source: "picsum",
    nasaKey: ""
  },
  countdown: {
    enabled: false,
    events: []
  },
  starred: {
    // "Starred items" panel — collects feed-list rows the user pinned
    // via the per-row star button (v1.1.0). All data lives in
    // chrome.storage.local; nothing leaves the browser.
    enabled: false,
    maxItems: 100,           // hard cap; oldest dropped on overflow
    items: []                // [{ url, title, sourceTitle, sourceHost, published, savedAt }]
  },
  converter: {
    enabled: false,
    defaultCategory: "length"
  },
  workspaces: {
    active: null,            // workspace id or null (null = base settings)
    list: []                 // [{ id, name, snapshot: { theme, accent, appearance, background, layout, quicklinks, enabled:{} } }]
  },
  containerMap: {},          // Firefox-only: { cookieStoreId: workspaceId }
  onboardingComplete: false,
  // Right-click context menu on the dashboard surface. When disabled
  // the browser's native menu always wins, even on the background.
  contextMenu: {
    enabled: true
  }
};

export const READ_CAP = 500;

export function pushRead(existingArr, urls) {
  const set = new Set(existingArr);
  for (const u of urls) set.add(u);
  const out = [...set];
  return out.length > READ_CAP ? out.slice(out.length - READ_CAP) : out;
}

export async function hasStoredSettings() {
  const chromeApi = globalThis.chrome;
  if (!chromeApi?.storage?.local) return false;
  const stored = await chromeApi.storage.local.get("vantageSettings");
  return !!stored.vantageSettings;
}

export async function loadSettings() {
  navigator.storage?.persist?.();

  const chromeApi = globalThis.chrome;
  if (!chromeApi?.storage?.local) {
    return structuredClone(DEFAULTS);
  }
  const stored = await chromeApi.storage.local.get("vantageSettings");
  const merged = mergeDeep(structuredClone(DEFAULTS), stored.vantageSettings || {});

  // v0.6.x → v0.7.0: singular embed → embeds array
  if (merged.embed !== undefined) {
    if (!merged.embeds || merged.embeds.length === 0) {
      if (merged.embed?.url) {
        merged.embeds = [{
          id: "1",
          title: merged.embed.title || "Embed",
          url: merged.embed.url,
          enabled: merged.embed.enabled ?? false
        }];
      }
    }
    delete merged.embed;
  }

  // v0.7.x → v0.8.0: quicklinks.items flat array → quicklinks object shape
  if (Array.isArray(merged.quicklinks)) {
    merged.quicklinks = { enabled: true, items: merged.quicklinks, groups: [] };
  }

  return merged;
}

export async function saveSettings(settings) {
  const chromeApi = globalThis.chrome;
  if (!chromeApi?.storage?.local) return;
  await chromeApi.storage.local.set({ vantageSettings: settings });
}

export function getDefaults() {
  return structuredClone(DEFAULTS);
}

export function onSettingsChanged(callback) {
  const chromeApi = globalThis.chrome;
  if (!chromeApi?.storage?.onChanged) return () => {};
  const handler = (changes, area) => {
    if (area === "local" && changes.vantageSettings) {
      callback(changes.vantageSettings.newValue);
    }
  };
  chromeApi.storage.onChanged.addListener(handler);
  return () => chromeApi.storage.onChanged.removeListener(handler);
}

function mergeDeep(target, source) {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (
      srcVal &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      target[key] = mergeDeep(target[key], srcVal);
    } else {
      target[key] = srcVal;
    }
  }
  return target;
}
