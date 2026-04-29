<div align="center">

<img src="assets/banner.png" alt="Vantage" width="100%"/>

# Vantage

**A privacy-first new tab dashboard for Chromium browsers — bring your search engine, your feeds, your weather, your links.**

[![Version](https://img.shields.io/badge/version-0.1.0-cba6f7?style=flat-square)](https://github.com/SysAdminDoc/Vantage/releases)
[![License](https://img.shields.io/badge/license-MIT-89b4fa?style=flat-square)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-V3-a6e3a1?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Vivaldi-94e2d5?style=flat-square)](#install)

</div>

---

## Why another new tab extension?

Most new tab dashboards (Momentum, Tabliss, Bonjourr, Mue, Renewed Tab, Horizon) lock you to one search engine — usually Google. **Vantage treats the search engine as a first-class setting**: switch between Google, DuckDuckGo, Startpage, Brave, Kagi, Ecosia, Qwant, SearXNG, Perplexity, or your own self-hosted endpoint with one click, right from the new tab.

Beyond that, Vantage gives you the dashboard staples — clock, weather, RSS, news, quick links — without any API keys, account signups, or third-party tracking.

## Features

- **10 search engines built-in + custom URL** — Google · Bing · DuckDuckGo · Startpage · Brave · Kagi · Ecosia · SearXNG · Qwant · Perplexity · custom (use `%s` for the query).
- **Open-Meteo weather** — no API key required. Geolocation auto-detect or manual city. °F / °C.
- **Live clock** — 12 / 24 hr, optional seconds, full date.
- **Multi-feed RSS reader** — add any RSS or Atom feed. Sorted by date across all feeds, deduplicated, fetched in parallel with graceful per-feed failure handling.
- **News widget** — same engine as RSS, separate config so you can keep "general news" and "personal subscriptions" in their own panes.
- **Quick links** — favicon-backed bookmark grid. Add / remove from settings.
- **Catppuccin Mocha by default · Latte for light mode** — no `backdrop-filter`, no glassmorphism performance traps.
- **All local** — `chrome.storage.local` only. No analytics, no telemetry, no remote config server. The only outbound calls are: Open-Meteo (weather), the RSS feeds you configure, and (fallback only) a public CORS proxy for feeds that block direct fetches.
- **Cross-tab sync** — change a setting in one tab, every other open new tab updates instantly.

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
├── newtab.html                Static HTML shell with mount points
├── src/
│   ├── main.js                Entry — loads settings, mounts widgets, wires settings panel
│   ├── background.js          Service worker (toolbar action → open new tab)
│   ├── style.css              Catppuccin Mocha + Latte themes, all UI styles
│   ├── storage.js             chrome.storage.local wrapper with deep-merged defaults
│   ├── search-engines.js      Engine catalog + URL builder
│   ├── settings.js            Settings panel renderer
│   ├── widgets/
│   │   ├── search.js          Search bar (engine selector + input)
│   │   ├── clock.js           Live clock + date
│   │   ├── weather.js         Open-Meteo current conditions
│   │   ├── quicklinks.js      Bookmark grid
│   │   ├── feed-list.js       Shared multi-feed renderer (used by RSS + News)
│   │   ├── rss.js             RSS panel
│   │   └── news.js            News panel
│   └── utils/
│       ├── dom.js             Tiny `el()` builder + toast helper
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
