# Changelog

All notable changes to Vantage are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/spec/v2.0.0.html).

## v0.1.0 — 2026-04-29

Initial release.

### Added
- Manifest V3 new tab override (`chrome_url_overrides.newtab`).
- Customizable search bar with 10 built-in engines (Google, Bing, DuckDuckGo, Startpage, Brave, Kagi, Ecosia, SearXNG, Qwant, Perplexity) plus custom URL support (`%s` placeholder).
- Live clock widget — 12/24 hour, optional seconds, full date.
- Open-Meteo weather widget — no API key required. Geolocation auto-detect plus manual city geocoding via Open-Meteo's geocoding API. °F and °C.
- RSS widget — generic RSS / Atom feed reader with parallel fetch, date-sorted merging across feeds, per-feed failure tolerance.
- News widget — same engine as RSS, separate configuration. Defaults to BBC, Ars Technica, The Verge.
- Quick Links widget — favicon-backed bookmark grid, add/remove from settings.
- Settings panel — slide-out drawer with sections for theme, search, weather, clock, quick links, RSS, news, reset.
- Catppuccin Mocha (dark, default) and Latte (light) themes via CSS custom properties.
- `chrome.storage.local` persistence with deep-merged defaults; cross-tab sync via `chrome.storage.onChanged`.
- CORS-safe RSS fetch — direct fetch first, falls back to `api.allorigins.win` raw proxy when blocked.
- Service worker stub — toolbar action click opens a fresh new tab.
- Icons (16/48/128/256/512 PNG, master SVG) generated from a single SVG source.
- README with banner, install instructions, architecture map, privacy/network table, and credits.
