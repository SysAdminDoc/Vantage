# Changelog

All notable changes to Vantage are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/spec/v2.0.0.html).

## v0.4.0 — 2026-04-29

### Added
- **Animated weather + time-of-day background.** The new tab page now sits on top of a live scene that reflects the current time, sun position, and weather at your location.
  - **Sky** transitions through nine phases — night, pre-dawn, sunrise, morning, midday, afternoon, golden hour, sunset, dusk — each with hand-tuned multi-stop gradients, smoothly animated via CSS `@property` color interpolation.
  - **Sun / moon** moves along an arc derived from your real sunrise / sunset times (Open-Meteo `daily.sunrise` / `daily.sunset`), east-to-west across the viewport, peaking near the top at solar noon. Sun grows and warms during golden hour and sunset; a small moon takes its place at night.
  - **Weather overlays** drive the scene per Open-Meteo's WMO code: drifting clouds (cloudy / overcast), rain streaks (drizzle / rain / heavy rain), snow particles (snow / heavy snow), white haze (fog), darkened sky + lightning flashes (storm). Weather refreshes every 10 minutes.
  - **Palm-tree silhouette** appears in the bottom-right during golden hour and sunset only. Subtle sway animation.
  - **Stars** twinkle at dusk and night.
  - **`prefers-reduced-motion`** disables the loop animations cleanly while keeping the correct phase colors and sun position.
  - Toggle: **Settings → Background → Animated background**. Off restores the static Catppuccin gradient.

- **Shared weather source** (`src/utils/weather-source.js`) — single Open-Meteo fetch with a 10-minute TTL cache used by both the weather chip and the animated background, so they don't double-fetch.

### Fixed
- **Engine-picker dropdown wouldn't close.** `.engine-picker__popover { display: flex }` and the user-agent `[hidden] { display: none }` had equal CSS specificity, and the author class won — `popover.hidden = true` did nothing visually. Fixed with a global `[hidden] { display: none !important; }` rule near the top of the stylesheet, which also keeps `panel__badge` and any future `[hidden]`-toggled elements working correctly.

## v0.3.0 — 2026-04-29

Layout, feed depth, interaction polish, and a one-command Enterprise Policy installer.

### Added — install path
- **`scripts/install.ps1`** — Windows PowerShell installer. Downloads the latest release ZIP, extracts to `%LOCALAPPDATA%\Vantage\extension`, finds every Brave / Chrome / Edge / Vivaldi / Opera `.lnk` shortcut on the system (Start Menu, Desktop, Taskbar pin, system-wide and per-user), and appends `--load-extension="<that path>"` to each one's arguments. The browser then loads Vantage on every launch. Idempotent (re-runs don't double-add). Auto-elevates for system-wide shortcuts. `-Uninstall` strips the flag and deletes the extension files. `-Verify` shows which shortcuts carry the flag. One-liner: `irm https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 | iex`.
- **`scripts/build-crx.py`** — pure stdlib + openssl Python implementation of CRX3 packing (used by the release workflow).

### Why not Enterprise Policy?
The original v0.3.0 build of `install.ps1` wrote `ExtensionInstallForcelist` registry values pointing at a self-hosted Omaha update feed. **Modern Chromium browsers (Chrome 137+, Brave 147+) silently filter non-CWS update URLs out of that policy** — the registry value is accepted but never reaches the extension updater. Verified empirically against Brave 147.1.89.143 with verbose extension-updater logging: even `ExtensionSettings` (the modern JSON form) is ignored for self-hosted update_urls. The launch-flag approach now used in the installer bypasses the policy machinery entirely and works on every Chromium browser.



### Added
- **Drag-to-reorder quick links.** Drag any pill to a new position; the order is persisted to settings and survives a page reload.
- **Drag-to-reorder reading panels.** A small grip handle in each panel header (visible on hover) lets you swap the news and reading-list panels. Order persists in `settings.layout.panels` and is applied via CSS `order` so DOM nodes stay stable.
- **Click-to-mark-read** on every feed item. Read items dim out (`feed-item--read` class) — the title shifts to the secondary text color, the favicon and meta dim. Read state is stored per-panel (`rss.readItems`, `news.readItems`), capped at 500 URLs each (LRU eviction via `pushRead()`), and syncs across tabs.
- **Unread-count badge** in each panel header, hidden when zero. Caps display at "99+".
- **"Mark all read" button** in panel headers (icon-button next to refresh). Disabled when nothing unread.
- **Per-feed favicon** next to the source name in each headline's meta row, lazy-loaded with graceful failure (errored favicons hide cleanly).
- **Engine picker keyboard navigation** — `↓` / `↑` / `Home` / `End` / `Enter` / `Space` / `Esc` plus type-ahead (e.g. `d` jumps to DuckDuckGo, `s` to Startpage). `Tab` closes the popover and lets focus continue naturally. Pressing `↓` on the trigger when closed opens the popover with first option focused; `↑` opens with last focused.
- **Reusable drag-reorder helper** at `src/utils/drag.js` — used by both quick-links and panels.
- **Two new icons** — `circle-check`, `check-all`, `grip`.

### Changed
- **Feed item meta line** redesigned. Source is plain text (no longer a pill) preceded by the favicon, with a separator dot before the relative timestamp. Less visual noise, more scannable.
- **Panel header layout** — drag handle | mark-all-read | refresh — all in the meta cluster. Drag handle is opacity 0.35 at rest, full opacity on panel hover.
- **Storage schema** — added `layout.panels`, `rss.readItems`, `news.readItems`. Existing v0.2 users deep-merge transparently.

### A11y / UX
- Keyboard popover focus is fully managed: no focus trap leak, focus returns to trigger on Esc.
- Drop-target states have a visible accent ring (not color-only).
- Drag handle has `aria-label` and is reachable by tooltip but excluded from the click flow.

## v0.2.0 — 2026-04-29

Premium polish pass — design system, primitives, motion, and microcopy refinement.

### Added
- **Design system in CSS** — explicit token layer for color, typography, spacing, radii, shadows, and motion. Catppuccin Mocha + Latte both refined. Ambient radial-gradient backdrop tuned per theme.
- **Greeting hero** — time-aware salutation (“Good morning / afternoon / evening / night”) with optional name (`greeting.name` setting) and accent-gradient highlight on the name.
- **Custom search engine picker** — replaces the native `<select>`. Avatar + label trigger pill, popover listbox with `aria-selected` state and check icon, outside-click and Esc dismissal.
- **UI primitives library** — toggle switch, segmented control, icon button (with ghost / small variants), chip, button (default / primary / danger / block). All used consistently across settings.
- **Skeleton loading** for RSS / News panels (shimmer animation) replaces italic “Loading…” text. Weather pill shows a shimmering placeholder before data arrives.
- **Last-updated timestamps** on feed panels (live, ticks every 30s).
- **Refresh button with spinner state** — feeds button shows a spinning refresh icon during fetch.
- **Keyboard shortcut** — press `/` to focus the search input (with inline `kbd` hint inside the search bar).
- **Settings panel polish** — sticky header with backdrop blur, dim backdrop with click-to-close, body scroll lock when open, focus moves into panel on open and back to toggle on close, structured sections with category icons, grouped rows with title + hint.
- **SVG icon library** (`src/icons.js`) — Lucide-style stroke set used everywhere (search, refresh, settings, palette, cloud, clock, link, etc.).
- **Empty states** — proper iconified empty / error layouts on feed panels with explanatory hint text.
- **Toast redesign** — top-right slot, animated entrance / exit, semantic icon + accent stripe, success / error / warning variants.
- **`prefers-reduced-motion` support** — animations and transitions disabled cleanly.
- **Better focus rings** — visible 2-ring offset using accent token; consistent across all interactive elements.

### Changed
- **Layout restructured** — top utility bar (weather chip + settings) → hero (greeting / search / quick links) → reading grid (news + RSS). Search is visually elevated as the primary action.
- **Quick links** are now a horizontal pill row with subtle favicons instead of a card-with-grid.
- **Weather** moved from a header card to a compact pill in the utility bar — no longer competes with the greeting.
- **Microcopy refresh** — “RSS” → “Reading list”, “Reset to defaults” → “Reset everything”, friendlier error messages, helper text under every settings row.
- **Settings panel sections** all use the same row pattern (title + hint + control) for consistency. Toggles replace native checkboxes; segmented controls replace dropdowns where there are 2 options.
- **Feed item design** — title clamped to 2 lines, source rendered as a small uppercase pill in accent-secondary color, separator dot before the relative time.
- **Typography scale** — explicit 11–56px scale, `font-variant-numeric: tabular-nums` on time displays, `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`.

### Fixed
- Toast no longer competed with quick links (now top-right).
- Engine picker is reachable without a mouse and announces itself as a listbox.
- Settings panel is now a proper modal dialog (`role="dialog"`, `aria-modal`, focus moves into the panel on open).

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
