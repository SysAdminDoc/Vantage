---
layout: default
title: Widgets
---

# Widgets

Every widget in Vantage. Each entry lists what it does, what it costs
(network / storage / permissions), and how to configure it. Widgets
default to **off** unless noted; turn them on via Settings or the
Widget Picker.

## Hero / utility bar

### Search

Hero search bar with 10 built-in engines (Google, DuckDuckGo, Brave,
Kagi, Startpage, Bing, Yahoo, Wikipedia, YouTube, GitHub) and a custom
URL slot using `%s` as the query placeholder. **Shift+Enter** opens a
quick-pick popover for one-shot per-query engine switching without
changing your saved default. Press `/` to focus.

- **Network:** none (the form posts to the chosen engine).
- **Storage:** `settings.search` (engine + customUrl).
- **Permissions:** none.
- **Settings → Search**

### Weather chip

Open-Meteo current conditions (no API key). Compact pill in the utility
bar with temperature + weather icon + location; hover for the full read
including feels-like, precipitation probability, dew point, humidity,
visibility, UV index, and atmospheric pressure. Optional
**agricultural / atmospheric variable set** adds CAPE, vapour-pressure
deficit, soil moisture (3 depths), and soil temperature (3 depths).
Optional **forecast confidence chip** adds an Open-Meteo Ensemble
50-member spread → high / moderate / low confidence label.

- **Network:** `api.open-meteo.com`, `geocoding-api.open-meteo.com`,
  optionally `ensemble-api.open-meteo.com`.
- **Permissions:** Geolocation (only if you choose auto-detect; manual
  city skips this entirely).
- **Settings → Weather**

### Air quality

Open-Meteo Air Quality. AQI + PM2.5 + PM10 + 6 pollen species (alder,
birch, grass, mugwort, olive, ragweed). Pill shape mirrors weather.

- **Network:** `air-quality-api.open-meteo.com`.
- **Settings → Air quality**

### Marine weather

Wave height (m or ft per units), wave direction (16-point cardinal),
sea surface temperature, and ocean current velocity in knots. **Inland
heuristic:** auto-hides on locations the API returns nulls for.

- **Network:** `marine-api.open-meteo.com`.
- **Settings → Marine weather**

### River flood risk

GloFAS v4 daily river discharge vs 7-day ensemble max → relative risk
band (Low / Moderate / Elevated / High), color-coded green / yellow /
peach / red. Auto-hides for locations not near a major river.

- **Network:** `flood-api.open-meteo.com`.
- **Settings → River flood risk**

## Reading

### News

Curated headlines and news sources via RSS / Atom / JSON Feed v1.1.
Includes "Mark all read", per-feed favicons, hover-revealed Star and
Save-to-Reading-list (Chrome 120+) actions per item. Filter rules
(mute / highlight regex with ReDoS guards) and one-click presets for
Reddit and a Dev bundle (HN front / best / Show / Ask, Lobsters,
DEV.to, GitHub Trending All / JS / TS / Python / Rust / Go).

- **Network:** each configured feed URL; CORS proxy fallback chain
  (`api.allorigins.win` → `corsproxy.io`); favicons via
  `s2/favicons`; optional `chrome.readingList` for save.
- **Settings → News**

### Reading list (RSS)

Same widget as News, separate URL list. Use one for "personal" and the
other for "curated" if you want the visual distinction; otherwise the
two stack arbitrarily.

- **Settings → Reading list**

### Calendar

Render any `.ics` URL as a 7-day-ahead event list. Vendored micro-parser;
no OAuth.

- **Network:** each `.ics` URL; CORS proxy fallback as needed.
- **Settings → Calendar**

### Windy radar

Embedded Windy.com radar map. Layer picker (wind / gust / rain / temp /
clouds / pressure / humidity / precip-accumulation), zoom slider,
centers on your weather location.

- **Network:** `embed.windy.com` iframe.
- **Settings → Radar**

### Embed

Generic iframe panel — paste any URL. Sandbox controls. Multiple
embed instances supported.

- **Settings → Embeds**

### Starred

Pinned headlines from any News / Reading list row (hover-revealed star
icon to add). All data in `chrome.storage.local`. Hard cap default 100,
configurable 10–500.

- **Settings → Starred items**

### History

Inline browser-history search. **Strict opt-in**: enabling triggers
`chrome.permissions.request({permissions: ["history"]})` so the browser
shows its native grant dialog. Disabling revokes. 220 ms debounced.

- **Permissions:** `history` (optional, granted at toggle time).
- **Settings → History search**

## Productivity

### To-Do

Drag-reorder list. Auto-focus mode hides completed items. `chrome.storage.local`.

### Notes

Markdown-aware (headings, lists, checkboxes, code spans). Per-note color.
**Focus / teleprompter mode** opens the note in a full-viewport overlay
with large clamped-fluid type and an auto-scroll slider (0–4 px / 30 ms
tick).

### Pomodoro

Tab-blur auto-pause, `<title>` countdown, Web Notifications, cross-tab
`navigator.locks` arbitration. Configurable work / break / long-break
lengths. **Custom alarm tone** (3 Web-Audio synthesized presets +
200 KB upload + Test button + square-law volume taper).

### Countdown

Multiple events with date / time, label, color. Lives below the hero.

### Bookmarks

Tile grid of your browser's bookmarks (uses `chrome.bookmarks`).

- **Permissions:** `bookmarks`.

### Top sites

Most-visited tiles via `chrome.topSites`.

- **Permissions:** `topSites`.

### Ambient sounds

Five Web-Audio-synthesized soundscapes (rain, white / pink / brown
noise, café murmur). **No shipped audio assets**; everything is
generated on-the-fly. Square-law volume. Pauses on tab blur. Pink
noise via Voss-McCartney; café via 3 LFO-modulated formants at
400 / 1700 / 2400 Hz.

## Information

### Quote

Daily quote from a bundled offline pack. Category filters choose among
inspirational, technology, and life entries locally. Click the cited author to
open their Wikipedia page.

### Photo

Daily photo from Picsum (no key) or NASA APOD (your free DEMO_KEY or
personal API key). APOD responses are cached per calendar day; DEMO_KEY
rate-limit responses are cached for one hour with an actionable API-key hint.
On APOD video days, renders the official `thumbnail_url` with a play-badge overlay.

- **Network:** `picsum.photos` OR `api.nasa.gov`.

### Crypto

CoinGecko price ticker for selected coins. Refresh every N minutes.
Requires a free CoinGecko **demo API key** (one click from the Settings
hint to register and paste). Sets `x-cg-demo-api-key` header.

- **Network:** `api.coingecko.com`.

### GitHub

Public events stream + optional trending repos for a user / language.
Tablist view (Activity / Trending).

- **Network:** `api.github.com`.

### World clocks

Compact horizontal strip of clocks for multiple timezones.

### Converter

Unit converter (length, mass, temperature, etc.). Local-only.

## Visual

### Animated weather background

Full sun-arc + cloud / rain / snow / fog / storm overlays driven by
real local sunrise / sunset (NREL SPA via Open-Meteo, with `sun-calc.js`
fallback). 9 time-of-day phases, civil / nautical / astronomical
twilight, golden / blue hour bands, palm / mountain / lake / forest /
urban / coastal / polar regional variants. Reduced-motion users get a
static fallback.

- **Settings → Background**

### Other background kinds

- **Solid** — single color (Catppuccin or hex).
- **Gradient** — two-color linear with adjustable angle.
- **Image URL** — any image URL with blur + brightness sliders.
- **Image upload** — local file (4 MB cap, base64-in-storage).
- **Video upload** — local WebM / MP4 (50 MB cap on browsers with OPFS;
  8 MB fallback). Loops automatically; pauses on tab blur.
- **Bing daily** — daily wallpaper from Bing.
- **NASA APOD** — daily astronomy picture (with thumbnail fallback for
  video days).

## See also

- [Privacy practices]({{ "/privacy-practices-cws.html" | relative_url }})
- [Widget API spec (third-party widgets)]({{ "/widget-api.html" | relative_url }})
- [FAQ]({{ "/faq.html" | relative_url }})
