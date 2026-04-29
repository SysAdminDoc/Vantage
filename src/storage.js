// Vantage v0.2.0 — chrome.storage.local wrapper with deep-merged defaults.

const DEFAULTS = {
  theme: "mocha",
  greeting: {
    enabled: true,
    name: ""
  },
  search: {
    engine: "google",
    customUrl: "https://example.com/search?q=%s"
  },
  weather: {
    enabled: true,
    location: null, // { name, latitude, longitude } — autodetected on first run
    units: "fahrenheit" // or "celsius"
  },
  clock: {
    enabled: true,
    format24: false,
    showSeconds: false
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
    ]
  },
  rss: {
    enabled: true,
    feeds: [
      { title: "Hacker News", url: "https://hnrss.org/frontpage" }
    ],
    maxItems: 15
  },
  news: {
    enabled: true,
    feeds: [
      { title: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
      { title: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
      { title: "The Verge", url: "https://www.theverge.com/rss/index.xml" }
    ],
    maxItems: 15
  }
};

export async function loadSettings() {
  if (!chrome?.storage?.local) {
    return structuredClone(DEFAULTS);
  }
  const stored = await chrome.storage.local.get("vantageSettings");
  const merged = mergeDeep(structuredClone(DEFAULTS), stored.vantageSettings || {});
  return merged;
}

export async function saveSettings(settings) {
  if (!chrome?.storage?.local) return;
  await chrome.storage.local.set({ vantageSettings: settings });
}

export function getDefaults() {
  return structuredClone(DEFAULTS);
}

export function onSettingsChanged(callback) {
  if (!chrome?.storage?.onChanged) return () => {};
  const handler = (changes, area) => {
    if (area === "local" && changes.vantageSettings) {
      callback(changes.vantageSettings.newValue);
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
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
