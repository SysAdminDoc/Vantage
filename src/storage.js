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
    units: "fahrenheit",
    // Append agricultural / atmospheric variables (CAPE, VPD, soil
    // moisture / temperature) to the existing Open-Meteo current= query
    // and surface them in the hover title. Useful for gardeners,
    // cyclists, and allergy sufferers; off by default to keep the
    // baseline title readable.
    showAgricultural: false
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
  feedArchive: {
    // Permanent IndexedDB archive of every feed item ever rendered,
    // searchable from Settings → Feed archive. Strict opt-in (default
    // off — IDB grows without explicit caps and we don't want to
    // surprise users on a clean install).
    enabled: false,
    cap: 10_000              // pruned by archivedAt; 50k+ degrades search
  },
  feedAlerts: {
    // Web Notifications when a feed item title contains a user-supplied
    // keyword. Strict opt-in (default off + permission prompt). Only
    // notifies once per URL via the notifiedUrls LRU.
    enabled: false,
    keywords: [],            // string[] — case-insensitive substring matches by default
    caseSensitive: false,
    notifiedUrls: []         // LRU of already-notified item URLs (cap 500)
  },
  airquality: {
    enabled: false
  },
  marine: {
    // Open-Meteo Marine API (free, no key) — coastal data only.
    // Wave height/direction/period, sea surface temperature, ocean
    // current vector, sea level. Pill in the utility bar; absent for
    // inland locations (the API returns nulls and the widget hides).
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
  ambient: {
    // Web Audio synthesized ambient soundscapes (white/pink/brown
    // noise, rain, cafe murmur). No shipped audio assets — all
    // generated on-the-fly to keep the install ≤ 1 MB. Pauses on
    // tab blur; never auto-plays.
    enabled: false,
    sound: "rain",           // "white" | "pink" | "brown" | "rain" | "cafe"
    volume: 50,              // 0-100
    autoStart: false         // resume last sound on tab open
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
  security: {
    // Opt-in passphrase encryption for stored API keys (CoinGecko,
    // NASA APOD). When enabled, plaintext crypto.apiKey + photo.nasaKey
    // are zeroed and the ciphertext lives here. PBKDF2-derived AES-GCM-256.
    encryptKeys: false,
    salt: null,        // base64 PBKDF2 salt
    iv: null,          // base64 AES-GCM IV
    encryptedBlob: null  // base64 ciphertext of {crypto: "...", nasa: "..."}
  },
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
