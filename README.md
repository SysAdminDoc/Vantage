<div align="center">

<img src="assets/banner.png" alt="Vantage" width="100%"/>

# Vantage

**A privacy-first new tab dashboard for Chromium browsers — bring your search engine, your feeds, your weather, your links.**

[![Version](https://img.shields.io/badge/version-0.2.0-cba6f7?style=flat-square)](https://github.com/SysAdminDoc/Vantage/releases)
[![License](https://img.shields.io/badge/license-MIT-89b4fa?style=flat-square)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-V3-a6e3a1?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Vivaldi-94e2d5?style=flat-square)](#install)

</div>

---

## Why another new tab extension?

Most new tab dashboards (Momentum, Tabliss, Bonjourr, Mue, Renewed Tab, Horizon) lock you to one search engine — usually Google. **Vantage treats the search engine as a first-class setting**: switch between Google, DuckDuckGo, Startpage, Brave, Kagi, Ecosia, Qwant, SearXNG, Perplexity, or your own self-hosted endpoint with one click, right from the new tab.

Beyond that, Vantage gives you the dashboard staples — clock, weather, RSS, news, quick links — without any API keys, account signups, or third-party tracking.

## Features

- **10 search engines built-in + custom URL** — Google · Bing · DuckDuckGo · Startpage · Brave · Kagi · Ecosia · SearXNG · Qwant · Perplexity · custom (use `%s` for the query). Custom dropdown picker, not a native `<select>`.
- **Open-Meteo weather** — no API key required. Geolocation auto-detect or manual city. °F / °C. Compact pill in the utility bar.
- **Time-aware greeting + clock** — “Good morning, Matthew” with a soft accent gradient. Optional name, optional 24-hour, optional seconds.
- **Multi-feed RSS reader** — add any RSS or Atom feed. Sorted by date across all feeds, fetched in parallel with graceful per-feed failure handling. Skeleton loading, last-updated timestamp, refresh-with-spinner.
- **News panel** — same engine as RSS, separate config and category accent. BBC + Ars Technica + The Verge by default.
- **Quick links** — clean pill row with favicons. Add / remove from settings.
- **Custom UI primitives** — toggle switches, segmented controls, icon buttons. No native checkboxes or selects on the primary surface.
- **Catppuccin Mocha (dark) + Latte (light)** with full design-token system, careful tonal layering, refined shadows, and ambient gradient backdrop.
- **`/` to focus search** — keyboard shortcut hint shown inline; Esc closes any open panel.
- **All local** — `chrome.storage.local` only. No analytics, no telemetry, no remote config server. The only outbound calls are: Open-Meteo (weather), the RSS feeds you configure, and (fallback only) a public CORS proxy for feeds that block direct fetches.
- **Cross-tab sync** — change a setting in one tab, every other open new tab updates instantly.
- **Accessibility-aware** — visible focus rings, ARIA-labelled controls, `prefers-reduced-motion` support, semantic landmarks, dialog-pattern settings panel with focus trap and Esc-to-close.

## Install

> Chromium 75+ rejects self-signed CRX files dragged onto the extensions page (`CRX_REQUIRED_PROOF_MISSING`). The recommended install path is **Load unpacked** from the ZIP.

1. Download the latest `Vantage-vX.Y.Z.zip` from [Releases](https://github.com/SysAdminDoc/Vantage/releases) (or clone this repo).
2. Extract to a permanent folder. **Do not delete this folder** — Chrome loads from it on every browser start.
3. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`, etc.).
4. Enable **Developer mode** (top right toggle).
5. Click **Load unpacked** and select the extracted folder.
6. Open a new tab. Welcome to Vantage.

When the browser asks for location permission (for weather), allow it — or skip and set a city manually in settings.

## Customize

Click the gear icon in the top-right of any new tab.

- **Theme** — Mocha (dark) or Latte (light).
- **Search** — pick the default engine, or supply a custom URL like `https://my-searx.example.com/search?q=%s`.
- **Weather** — type a city name and hit "Set city", or click "Reset to auto-detect" to use geolocation.
- **Clock** — toggle 24-hour, toggle seconds.
- **Quick Links** — add / remove. Favicons fetch via Google's `s2/favicons` service.
- **RSS / News** — separate sections. Add any RSS or Atom feed URL. Tune max items per panel.
- **Reset** — wipe back to defaults if you make a mess.

## Architecture

Pure vanilla JS modules. No build step. No bundler. No framework. Ships exactly as you read it on disk — every file in `src/` is what runs in your browser.

```
Vantage/
├── manifest.json              MV3 manifest (chrome_url_overrides → newtab.html)
├── newtab.html                Static HTML shell — utility bar, hero, reading panels
├── src/
│   ├── main.js                Entry — loads settings, mounts widgets, wires UI + keyboard
│   ├── background.js          Service worker (toolbar action → open new tab)
│   ├── style.css              Design tokens, typography, motion, all UI styles
│   ├── storage.js             chrome.storage.local wrapper with deep-merged defaults
│   ├── search-engines.js      Engine catalog + URL builder
│   ├── settings.js            Settings panel — composed from primitives below
│   ├── icons.js               Inline SVG icon library (Lucide-style stroke set)
│   ├── widgets/
│   │   ├── search.js          Hero search bar with custom engine picker dropdown
│   │   ├── clock.js           Time-aware greeting + datetime line
│   │   ├── weather.js         Open-Meteo pill with skeleton loading
│   │   ├── quicklinks.js      Pill-row link list
│   │   ├── feed-list.js       Shared multi-feed renderer with skeleton, last-updated, refresh
│   │   ├── rss.js             RSS / Reading-list panel
│   │   └── news.js            News panel
│   └── utils/
│       ├── dom.js             el() builder + toggle / segmented primitives + toast + helpers
│       └── rss-parser.js      RSS / Atom parser via DOMParser, with CORS fallback
└── icons/                     16/48/128/256/512 PNGs + master SVG
```

### Privacy & network

| Outbound call | Triggered by | Why |
|---|---|---|
| `api.open-meteo.com` | Weather widget | Current temperature + weather code |
| `geocoding-api.open-meteo.com` | Settings panel ("Set city") | Resolve city name to lat/lon |
| Each configured RSS/News feed URL | RSS / News widgets | Direct fetch first |
| `api.allorigins.win` | RSS / News (fallback) | Used **only** when direct fetch is blocked by CORS — strips the request to raw XML, no cookies forwarded |
| `www.google.com/s2/favicons` | Quick Links widget | 64×64 favicon images for the link grid |

Nothing else. No analytics, no error reporting, no auto-update server.

## Roadmap

See [ROADMAP.md](ROADMAP.md). v0.2 will add wallpapers, a todo widget, drag-to-reposition layout, and unread-count badges on RSS / News panels.

## License

MIT — see [LICENSE](LICENSE).

## Credits

- [Open-Meteo](https://open-meteo.com/) — free, no-API-key weather + geocoding.
- [Catppuccin](https://github.com/catppuccin/catppuccin) — color palette.
- [allorigins](https://allorigins.win/) — CORS proxy fallback for RSS feeds.
- Inspired by Epiboard, Tabliss, Bonjourr, Mue, Renewed Tab, Horizon, and Fluent — each great in their own way; Vantage is just my flavor.
