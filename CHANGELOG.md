# Changelog

All notable changes to Vantage are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/spec/v2.0.0.html).

## v0.4.14 — 2026-04-29

### Fixed
- **Purple inner outline on focused search input ("box inside a box").** The global `:focus-visible { box-shadow: var(--ring) }` rule was applying the focus ring to `.search-input` *and* the wrapper `.search-form` was already showing its own ring via `:focus-within`. Result: two concentric purple rectangles. Suppressed the inner input's `:focus-visible` ring so only the wrapper highlights.

## v0.4.13 — 2026-04-29

### Fixed
- **v0.4.12's `timezone=UTC` regressed phase computation across the UTC date boundary.** Open-Meteo's `daily.sunrise[0]` is "today's" sunrise per the requested timezone. With `timezone=UTC`, "today" means UTC today — so at 19:20 CDT (= 00:20 UTC the next day), Open-Meteo returned the **next location-day's** sunrise (06:04 CDT tomorrow morning), 11 hours in the future. The phase logic then thought we were 11h before sunrise and rendered "pre-dawn" colors at sunset. **Fix:** request `timezone=auto` (returns daily values for the location's local day) and parse the naive ISO string into an absolute-UTC Date using the response's `utc_offset_seconds` field. New `parseLocationLocal(naive, offset)` helper handles the conversion: parse digits as if they were UTC, then subtract the offset to recover the actual moment. Independent of browser timezone, correct across DST, correct in any hemisphere.

## v0.4.12 — 2026-04-29

### Changed
- **Hybrid sun-time strategy: Open-Meteo NREL SPA primary + local SunCalc fallback.** v0.4.11 used purely local astronomical calc (~±1-2 min vs ground truth). Now Open-Meteo is the primary source — it uses NREL Solar Position Algorithm which is NIST-accuracy (±30 seconds, accounts for atmospheric refraction model variation). Local sun-calc.js is the fallback for first paint (before the API responds), offline use, and any API failure. Civil twilight (dawn/dusk) always comes from the local calc since Open-Meteo's free tier doesn't include it.
- **Open-Meteo URL switched from `timezone=auto` to `timezone=UTC`.** Resolves the original timezone bug end-to-end: with auto mode, `daily.sunrise[0]` was a localized ISO string with no TZ suffix that JS parsed as browser-local time. With UTC mode, we just append 'Z' and get correct absolute moments. The `utc_offset_seconds` field in the response remains available if any UI element needs to display location-local time.

## v0.4.11 — 2026-04-29

### Changed
- **Sunrise / sunset / civil-twilight times now computed locally from the location coordinates instead of read from Open-Meteo.** Open-Meteo's `daily.sunrise[0]` returns a localized ISO string with no timezone suffix; `new Date(str)` parses it as **browser-local** time, so if browser TZ != location TZ, sunrise was off by hours. The new `src/utils/sun-calc.js` (vendored NOAA Solar Calculator algorithm, ~120 LOC, no dependency) returns absolute-UTC moments for `sunrise`, `sunset`, civil-twilight `dawn` and `dusk`, and solar `noon` — accurate to the second, year-round, through DST, and at any latitude including polar regions (handles the always-day / always-night cases explicitly).
- **Phase boundaries use civil twilight instead of fixed hour offsets.** "pre-dawn" now begins at civil dawn (sun 6° below horizon) and ends at sunrise; "dusk" begins at sunset and ends at civil dusk. Civil twilight duration varies by latitude / time of year (~30 min equator, ~90 min summer-north), so transitions feel right anywhere on Earth.
- **Day-rollover watcher** schedules a one-shot timer for ~5 minutes past the location's local midnight, recomputes sunrise/sunset for the new day, and chains the next rollover. The page no longer drifts off "today's" sun events if you leave the tab open across midnight.
- Open-Meteo is still queried for current weather (rain / storm / etc.) — only the sunrise/sunset usage moved local.

## v0.4.10 — 2026-04-29

### Fixed
- **Rain rendered as horizontal LCD-stripe bands instead of falling streaks.** The original implementation used `linear-gradient(180deg, transparent, white, transparent)` with `background-size: 1px 80px` and CSS tiling. Tiling that 1px-wide strip horizontally meant every column had the same vertical gradient, so the bright center band rendered as a continuous **horizontal** stripe across the full viewport — not vertical streaks. Animating background-position scrolled those horizontal stripes down, producing a "broken-LCD" look. **Fix:** rain layers now use inline-SVG tiles (220×240 foreground, 280×320 background-parallax) containing 22 / 16 actual `<line>` elements at scattered x-positions with a 4px wind-shear tilt. Background-position scrolls each tile by exactly its own height for a seamless loop. Two layers run at different durations (0.55s vs 0.85s) for parallax depth. Reads as actual rain now.

## v0.4.9 — 2026-04-29

### Fixed
- **Rain streaks were invisible against the darkened storm sky.** v0.4.7/v0.4.8 darkened the sky by applying `filter: saturate(...) brightness(...)` to the `.bg` container — but CSS filters cascade to every descendant, including the `.bg-rain` streak overlays. Result: streaks at 0.65–1.0 opacity were getting their luminance halved by the parent filter, leaving a muddy gray wash with no visible rain. Researched how OSS rain-effect libraries (Aaron Rickle's CSS rain pen, MillerTime's canvas rain, Apple Weather's icon palette) handle this: the canonical pattern is **change the sky's color tokens directly per weather, never filter the parent**. Bright blue-white rain streaks at 60–90% opacity then render correctly on top of an already-slate sky.

### Changed
- **Per-weather sky palette overrides**, applied inline by JS in `updateScene()`. New `STORMY_SKY` map carries flat slate gradients for each wet/overcast condition (drizzle / overcast / rain / heavy-rain / storm / snow / heavy-snow), keyed off Apple Weather + community storm-weather palettes. `darkenForNight()` helper folds in a nighttime darkening factor so a 2am storm is darker than a noon storm.
- **Rain streak color shifted from white → cool blue-white** (`rgba(190,210,240,0.55)` → `rgba(220,235,255,0.85)` in the gradient stops), matching the rain-on-stormy-sky reference palette. Streaks visibly read as water now instead of a gray haze.
- **Rain opacity bumped per tier:** rain 0.78→0.80, heavy-rain 0.85→0.95, storm 0.90→1.0, plus the back layer for parallax depth.
- **Removed `filter:` rules on `.bg[data-weather="rain"|"heavy-rain"|"storm"|"overcast"|...]`.** Fog still gets a filter (it's a haze layer, not raindrops). Drizzle keeps cloud filter dimming but not parent darkening.

## v0.4.8 — 2026-04-29

### Fixed
- **Plain "rain" still rendered as a sunny sunset.** v0.4.7 darkened the sky and hid the sun/palm only for `storm` and `heavy-rain`. But Open-Meteo's most common precip code in temperate climates is **63 ("rain")**, not 65 ("heavy-rain") or 95+ ("thunderstorm"). Verified live against Monroeville, AL: API returned `weather_code: 63` while the user expected stormy visuals. Extended the dark-sky / no-sun / no-palm treatment to `rain` (sky `saturate(0.5) brightness(0.55)`, sun opacity 0, palm hidden, cloud opacity bumped 0.78→0.88). Tiered the rest: drizzle gets a gentle `brightness(0.85)` with a faint sun (it's light rain); overcast and heavy-snow get a 0.3-opacity diffuse cool disc. Now any precipitation reads as overcast wet-sky, not "raindrops on a bright sunset."

## v0.4.7 — 2026-04-29

### Fixed
- **Storms and heavy rain rendered as clear sunsets.** Three bugs stacked: (1) the `.bg[data-weather="heavy-rain"].bg-cloud` and `.bg[data-weather="heavy-snow"].bg-cloud` selectors were missing the descendant-combinator space — written as compound selectors that could never match, since `.bg-cloud` is a child of `.bg`. So heavy rain showed zero cloud cover. (2) The `saturate(0.65) brightness(0.78)` filter on storm/heavy-rain was too gentle to overcome warm sunset gradient colors, leaving the sky reading "muted sunset" instead of "downpour." (3) The sun stayed at full opacity during heavy weather and the palm-tree silhouette stayed visible during golden-hour/sunset phases even when the location was actively storming. **Fix:** restored space in cloud selectors; bumped storm filter to `saturate(0.25) brightness(0.32)` and heavy-rain to `saturate(0.35) brightness(0.45)`; sun opacity is forced to 0 in JS when weather is `storm`/`heavy-rain` (and 0.35 for `overcast`/`heavy-snow`); palm is hidden via CSS for stormy weather. Reproduced live against Monroeville, AL during code 65 (heavy rain) — sky now reads as a properly leaden downpour with rain streaks and dense cloud deck.

## v0.4.6 — 2026-04-29

### Changed
- **Sky colors are now a continuous function of time of day** instead of nine static phase palettes. Replaced the per-phase `.bg[data-phase="X"] { --sky-top: ... }` snapshots with a 15-keyframe timeline keyed to the user's actual sunrise/sunset times; every minute, JS computes the lerp between surrounding keyframes and writes inline `--sky-top` / `--sky-mid` / `--sky-bottom` / `--sun-color` / `--sun-glow` on `.bg`. The CSS @property transition smooths the change between ticks (now 60s, matching the update interval). Within a single phase the sky now actually progresses — sunset starts at golden-hour brightness and progressively darkens through deep red into dusk into night, instead of holding one color for 30 minutes.
- **First paint snaps to the correct colors** instead of cross-fading from the @property dark-gray initial values. Adding `.bg--no-transition` for one frame around the first JS color application kills the 60s "starting dark, getting brighter" sweep on page load — which was reading like a sunrise even when it was actually evening.

### Fixed
- Trunk frond-scar bands sized against the actual trunk silhouette width at each y so they no longer overshoot near the base. (was v0.4.5; folded into the v0.4.6 description above for completeness)

## v0.4.5 — 2026-04-29

### Fixed
- **Trunk banding rings poked out past the trunk silhouette near the base.** Codex's v0.4.4 trunk path widens significantly at the base (root flare from x≈78 to x≈143 at y=320, narrowing to x≈111-137 at y≈305) — but the banding paths kept the same x-range across the height, so the lowest three bands extended up to 24px past the trunk on the left, showing as horizontal dashes coming off the trunk. Re-derived each band's x-range against the actual trunk width at its y-level: now every ring sits with a 1-2px inset on both sides.

## v0.4.4 — 2026-04-29

### Changed
- **Palm tree silhouette rebuilt as a classic coconut-palm icon.** Replaced the repeated crescent frond with nine broad arched SVG plume fronds using irregular leaflet edges, closer to the supplied palm reference silhouettes. The trunk keeps a stronger S-curve taper with secondary frond-scar banding, and the coconut bunch is visible under the crown. Verified by extracting `PALM_SVG` from `src/widgets/background.js` and rasterizing it to `dist/palm-preview.png`.

## v0.4.3 — 2026-04-29

### Changed
- **Palm tree redesigned again — this time it actually looks like a palm tree.** v0.4.2's "feathered" leaflet zigzag was too aggressive and made fronds look like sun rays. v0.4.3 uses wide leaf-shaped fronds — top edge arches UP, bottom edge dips DOWN through the middle, so each frond has real ~25-unit bow width instead of the v0.4.2 7-unit whip. 8 fronds at varied scales (0.85–1.15) for a layered crown. Verified by rasterizing the SVG to PNG offline before shipping.

## v0.4.2 — 2026-04-29

Cosmetic refresh.

### Changed
- **Palm tree silhouette redesigned to look like an actual coconut palm.** Single feathered-frond template (the leaflet zigzag is baked into the path with subtle leaflet-height variation so it reads organic instead of mechanical) is rotated into 10 placements around the crown anchor — back layer at 85-90% scale for depth, front layer full size, drooping pair just below horizontal. Trunk now has a real S-curve taper from a wide base to a slim crown, with frond-scar ring banding as a subtle secondary fill. Coconut bunch tucked under the crown.

## v0.4.1 — 2026-04-29

Hotfix on top of v0.4.0 — the animated background was rendering correctly at the data layer but was invisible to the user.

### Fixed
- **Animated background was hidden behind the body's solid color.** The `.bg` layer is `position: fixed; z-index: -1` so it paints below body content. v0.4.0 also left the body's background as a solid `var(--bg-canvas)`, which paints *above* a negative-z fixed element. Result: the sky gradient was correct in the DOM (verified — `data-phase="golden-hour"`, `--sky-top: rgb(75, 45, 82)`, etc.) but you couldn't see it because the body was painting over it. **Fix:** body is now transparent; the static fallback gradient (used when the animated background is off) now lives on the HTML root via `html:has(.bg:empty)`.
- **First scene render took ~6 seconds.** The widget waited for the geolocation timeout before drawing anything. **Fix:** the widget now paints an immediate scene using time-of-day defaults (6:30am sunrise / 7:30pm sunset, "clear" weather) and refines in place once the real Open-Meteo response arrives.

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
