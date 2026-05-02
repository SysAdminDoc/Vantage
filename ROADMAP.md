# Vantage Roadmap

_Living document. Last revised 2026-05-01 (round 2) against v0.9.0._

This roadmap is sourced — every Now / Next / Later item points to evidence in the Appendix. Versions are aspirational targets, not commitments. The aim is dense, skimmable, specific: an item without a sentence on **why now**, an effort sketch, and a citation gets cut.

## Design constraints (these gate everything below)

These are non-negotiable unless explicitly flagged. Any roadmap item that contradicts them is in **Rejected** with reasoning.

1. **Privacy-first, no accounts, no telemetry, no remote config.** Every outbound endpoint must be either a documented user-feed (RSS/Atom URL the user added), Open-Meteo, the configured weather location's API, the user-chosen CORS proxy, or `s2/favicons`. New integrations need a Privacy Table line in the README before they ship.
2. **No build step. Vanilla JS modules. Single `style.css`.** Ship-readable. Anything that needs Webpack/Vite/Bun/Astro/React/Vue is rejected on stack grounds — fork an alternate distribution if those are required.
3. **MV3 + `chrome.storage.local` only.** No service-worker network polling, no IndexedDB unless we hit the 5 MB ceiling for a specific widget (notes), no background scrapers, no `*://*/*` host_permissions beyond what feeds require.
4. **No remote code execution.** Plugin/widget systems must be sandboxed-iframe with declared `src` (Renewed Tab pattern, [Source 21]) or PR-reviewed-into-the-repo (Mue marketplace pattern, [Source 18]). No runtime `eval`, no remote `<script>` injection, no remote stylesheets.
5. **Distribution: GitHub Releases first, CWS second.** ZIP is the primary asset (Load unpacked); CRX self-signed for Vivaldi; CWS listing comes only after the widget API is locked (v1.0).

If a feature would force breaking any of these, it's flagged "**⚠ contradicts constraint #N**" in the entry.

---

## Shipped

### v0.1.0 — Initial release ✅ 2026-04-29
- [x] Search (10 engines + custom URL with `%s`)
- [x] Open-Meteo weather chip with auto-detect or manual city
- [x] Multi-feed RSS reader + News reader (Atom+RSS via DOMParser, allorigins.win CORS fallback)
- [x] Quick links pill row with favicons via `s2/favicons`
- [x] Catppuccin Mocha (default) + Latte
- [x] Settings panel
- [x] `chrome.storage.local` with deep-merged defaults, cross-tab sync via `chrome.storage.onChanged`

### v0.2.0 — Premium polish ✅ 2026-04-29
- [x] Design tokens (color, type, spacing, radii, shadows, motion)
- [x] Custom engine-picker dropdown (replaces native `<select>`)
- [x] UI primitives (toggle / segmented / icon-button / chip)
- [x] Skeleton loading + last-updated timestamps + refresh-with-spinner on feeds
- [x] Time-aware greeting hero with optional name
- [x] Settings panel as proper modal dialog (sticky header, backdrop, scroll lock, focus management)
- [x] Inline SVG icon library
- [x] `/` to focus search
- [x] `prefers-reduced-motion`, focus rings, ARIA pass

### v0.3.0 — Layout & feed depth ✅ 2026-04-29
- [x] Drag-to-reorder quick links + reading panels (panel order via CSS `order`, persisted to `layout.panels`)
- [x] Click-to-mark-read with cross-tab persistence + LRU cap (`READ_CAP = 500`)
- [x] Unread-count badges per panel + "mark all read"
- [x] Per-feed favicons in headline meta rows
- [x] Engine picker full keyboard nav (`↑/↓/Home/End/Enter/Esc` + type-ahead)

### v0.4.0 — Animated weather background ✅ 2026-04-29
- [x] Time-of-day phase system (9 phases) with `@property` color interpolation
- [x] Sun arc driven by real sunrise/sunset for the user's locality
- [x] Weather-driven overlays (clouds, rain, snow, fog, lightning, storm)
- [x] Palm-tree silhouette during golden hour + sunset (cosmetic)
- [x] Stars at dusk + night
- [x] Shared Open-Meteo fetch with 10-minute cache; `prefers-reduced-motion` honored

### v0.5.0 — Animated background production-ready ✅ 2026-04-29
- [x] Storm rendering: per-weather sky palette override, parent CSS `filter` removed
- [x] Rain SVG tiles with two-layer parallax + 4° wind-shear tilt
- [x] NREL SPA sunrise/sunset via Open-Meteo (`±30s`), `sun-calc.js` fallback for offline
- [x] Civil-twilight phase boundaries; polar-region handling
- [x] Day-rollover watcher; search input box-in-box bug fixed

### v0.6.0 — Vibe & lightweight productivity ✅ 2026-05-01
- [x] Wallpaper subsystem (`background.kind`): animated / solid / gradient / image-url / image-upload / bing-daily / nasa-apod
- [x] Bing daily image + NASA APOD backgrounds
- [x] Local image upload (base64, 4 MB cap, quota warning)
- [x] Solid color + gradient picker
- [x] Quote-of-the-day widget (bundled offline pack)
- [x] Custom accent color picker (Mocha/Macchiato/Frappé/Latte/Tokyonight/Gruvbox/Nord + hex)
- [x] Background blur/saturation/brightness sliders
- [x] Pomodoro timer (tab-blur pause, `<title>` alarm, Web Notifications, `navigator.locks`)
- [x] Todo widget (drag-reorder, auto-focus mode)
- [x] Notes widget (markdown: headings, lists, checkboxes, code spans; IndexedDB)
- [x] `.ics` URL calendar widget (vendored micro-parser; no OAuth)
- [x] World clocks strip
- [x] Countdown widget
- [x] Settings JSON export / import
- [x] OPML import + export
- [x] Storage quota panel
- [x] First-run onboarding tour (3-step, dismissible)
- [x] Skip-to-main link (WCAG 2.4.1)
- [x] ARIA live regions for feed-update + Pomodoro state
- [x] 24×24 tap-target audit (WCAG 2.5.8)
- [x] Drag-alternative up/down buttons on panel grips (WCAG 2.5.7)

### v0.6.2 — Radar & embedding ✅ 2026-05-01
- [x] Windy radar embed widget
- [x] Generic embed (iframe) widget with sandbox controls

### v0.7.0 — Power-user features ✅ 2026-05-01
- [x] 10 additional widgets: crypto, GitHub activity, photo (Unsplash), bookmarks, converter, per-widget instances
- [x] Widget picker popover (searchable)
- [x] Multiple embed instances
- [x] Air quality + pollen panel (Open-Meteo Air Quality API)
- [x] Animated RainViewer radar overlay (opt-in, personal-use disclaimer)
- [x] Civil / nautical / astronomical twilight overlays in animated background
- [x] Golden / blue hour visual bands
- [x] View Transitions API for theme switch + panel open/close + mark-all-read
- [x] Anchor positioning + Popover API for engine picker and tooltips
- [x] CSS `@scope` for component-scoped selectors
- [x] Privacy Table block in README (every endpoint documented)
- [x] Geolocation disclosure banner (one-time, stored)
- [x] Per-permission justification text drafted for CWS

### v0.7.1 — Settings power-up ✅ 2026-05-01
- [x] Collapsible settings sections
- [x] Settings keyword filter (search within settings panel)
- [x] Custom CSS injection (`<style>` in page, stored in `chrome.storage.local`)
- [x] Quick-link folder groups (popover, recursive drag)
- [x] Custom icon per quick link (auto / URL / upload)

### v0.7.2 — Firefox ✅ 2026-05-01
- [x] Firefox port (`browser_specific_settings`, MV3 with event-page fallback, browser-detect shim)
- [x] Per-Firefox-container settings via `browser.contextualIdentities`

### v0.8.0 — Workspaces & resilience ✅ 2026-05-01
- [x] Multi-profile workspaces (Home / Work / Hobby; per-workspace widgets + links + theme + background)
- [x] Firefox container → workspace auto-mapping
- [x] Most-visited + recently-closed widgets (`chrome.topSites` + `chrome.sessions`)
- [x] Top Sites widget
- [x] Feed dedup by canonical URL
- [x] Feed filter rules engine (regex mute/highlight/hide per feed)
- [x] Reddit-as-feed integration (anonymous `.rss` endpoints, preset library)
- [x] Multiple CORS-proxy fallback chain (allorigins.win → corsproxy.io → EveryOrigin)
- [x] Self-hostable Cloudflare Worker CORS proxy (`scripts/cors-worker.js` + Deploy-to-Cloudflare link)
- [x] Per-feed timeout + exponential retry (8s timeout, 1 retry + 5s backoff)
- [x] `navigator.storage.persist()` call on init (prevents storage eviction)
- [x] Storage migrations with `schemaVersion` in `loadSettings()`

### v0.9.0 — Themes & scene polish ✅ 2026-05-01
- [x] Theme expansion: System / Mocha / Macchiato / Frappé / Latte
- [x] Animated background control panel: Motion / Atmosphere / Readability / Presets tabs
- [x] Workspace visual profiles (per-workspace theme + scene override)
- [x] Scene preview controls (QA gallery; all weather + time-of-day combinations)
- [x] Keyboard shortcut configuration (`/` search, `Esc` close, all actions user-remappable)
- [x] Automated release workflow (`.github/workflows/release.yml`) — `workflow_dispatch`-triggered; Python-built Chrome ZIP + CRX3 (self-signed via `EXTENSION_PEM` secret) + Firefox XPI; SHA256SUMS.txt; auto-tag + GitHub Release; Omaha CRX update feed (`updates.xml`) + AMO update manifest (`firefox-updates.json`) generated and committed back to main on each release.

---

## v1.0.0 — Store-ready & refined (Now)

These items unblock CWS/AMO listing and polish the product for a wider audience. Each is ≤2 days; none require new architecture.

### UX polish
- [x] **Restore partial backup from settings import** — nightTab v7.3 pattern: when importing a settings JSON, let the user pick which sections to restore (theme, widgets, links, feeds) rather than all-or-nothing. Prevents accidental data loss on migration. ~0.5d. — _[Source 97] (nightTab v7.3.0 release notes); common user request._ ✅ shipped (Unreleased) — section-checklist dialog gates JSON import + `#import=` share links; auto-preserves API keys on round-trip.
- [ ] **In-line multi-engine search switching** — small dropdown/toggle next to the search bar to switch engines per-query without opening settings. State: drop the selected engine into the search placeholder; last-used engine persists. ~1d. — _[Source 99] (Bonjourr issue #799, Apr 2026); high-demand, table-stakes in competitors._ — _Partial (Unreleased): the "drop the selected engine into the search placeholder" half landed; the per-query-without-changing-default UX still pending._
- [ ] **Right-click context menu** — right-click on background surface → quick-add quick link, open widget settings, cycle background, toggle dark/light mode. Bonjourr v22.0's most cited UX win; does not require keyboard shortcuts to trigger. ~1.5d. — _[Source 98] (Bonjourr docs v22 context-menu section); Bonjourr AMO reviews praise this specifically._
- [ ] **Quick-link row configuration** — let users set items-per-row and manually place a link in a specific row even if the row above is not full. Removes the current "fill-row-first" constraint. ~0.75d. — _[Source 100] (Bonjourr issue #750, Jan 2026)._ — _Partial (Unreleased): items-per-row segmented control (Auto/3/4/5/6/8) shipped; manual cell override still pending._
- [x] **Pomodoro alarm tone customization** — upload a custom audio file (MP3/OGG, capped at 200 KB) or pick from 3 bundled tones (bell, chime, digital). Bonjourr v22.0 ships this with volume control. ~0.5d. — _[Source 98] (Bonjourr CHANGELOG v22.0.0)._ ✅ shipped (Unreleased) — Web Audio synthesis (no shipped audio assets), volume slider, Test button, 200 KB upload cap enforced on every import path.
- [x] **Weather widget enrichment** — add feels-like temperature (`apparent_temperature`), precipitation probability (`precipitation_probability`), dew point (`dew_point_2m`), and visibility (`visibility`) to the weather widget. All four variables are already in Open-Meteo's current endpoint response; UI-only change. ~0.5d. — _[Sources 56, 57] (Open-Meteo docs; confirmed available in current response)._ ✅ shipped (Unreleased) — feels-like + precip pills, dew/humidity/visibility in hover title.
- [x] **Quote widget author details** — clicking the quote expands an author info card (birth/death, short bio, link to Wikipedia). Mue v7.6.0 pattern. ~0.5d. — _[Source 101] (Mue v7.6.0 QuoteInfoModal feature)._ ✅ shipped (Unreleased) — author cite is a direct Wikipedia link (no extra API calls / host_permissions); click-through gives users the bio + dates.
- [x] **`theme-color` meta tag tracking current background** — update `<meta name="theme-color">` whenever the background color changes; browser tab chrome reflects the current sky color in supporting browsers. Trivial polish, ~0.1d. — _[Source 98] (Bonjourr v22.0.0 CHANGELOG)._ ✅ shipped (Unreleased) — animated backgrounds emit `vantage:bg-color`; static kinds + system-theme flips kept in sync.
- [x] **`prefers-contrast: more` / `forced-colors` CSS pass** — single media-query sweep to thicken dashed borders, lift low-opacity placeholder text, and solidify subtle dividers when the OS reports a high-contrast preference; `forced-colors: active` (Windows High Contrast Mode) also handled. ~0.25d; no new dependencies. — _[Source 118] (MDN prefers-contrast, updated Apr 2026); pairs with the WCAG 2.2 AA audit._ ✅ shipped (Unreleased) — additive media block; ghost-button hovers also tightened.
- [x] **Custom greeting text per time slot** — let users override the hardcoded "Good morning / afternoon / evening" strings with their own copy per time window; optional `[name]` token still expands. Low-effort personalisation. ~0.5d. — _[Source 98] (Bonjourr v22.0.0 CHANGELOG — "Custom greetings" feature)._ ✅ shipped (Unreleased) — 4 slot inputs; safe `[name]` expansion via element creation.

### Distribution readiness
- [ ] **WCAG 2.2 AA full audit** — automated (axe-core) + manual screen-reader pass (NVDA + VoiceOver). All widget surfaces in scope; produce `docs/accessibility-report.md`. Required before CWS listing. ~3d. — _[Sources 70, 71]._
- [ ] **i18n scaffolding** — `_locales/en/messages.json`, `__MSG_*__` in all user-visible strings; English authoritative; Weblate or PR-based translation pipeline. First non-English targets: es, de, fr, ja (translation completeness threshold: 95%). ~3d for scaffolding, ongoing for translations. — _[Source 69] (chrome.i18n reference)._
- [ ] **RTL / `@@bidi_*` support** — Arabic, Hebrew. Logical-property CSS pass (`margin-inline-start`, `inset-inline-start`, etc.). ~1d on top of i18n scaffolding. — _[Source 69]._
- [ ] **Chrome Web Store listing** — localized screenshots + description per locale; CWS Privacy Practices fields filled; single-purpose description drafted; all permissions justified. ~0.5d of paperwork. — _[Sources 66, 67, 68]._
- [ ] **AMO (Firefox Add-ons) listing** — same package with `browser_specific_settings`. ~0.25d. — _[Sources 85, 86]._
- [ ] **Microsoft Edge Add-ons listing** — trivial after CWS; one form. ~0.1d. — _Gap; no specific citation needed._
- [ ] **Locked widget API** — declare the postMessage protocol stable at v1.0; write `docs/widget-api.md` with semver guarantees. — _Prerequisite for iframe-sandboxed third-party widgets._

### CoinGecko API key migration
- [x] **CoinGecko demo API key support** — CoinGecko now requires `x-cg-demo-api-key` (free tier, self-served registration) on the `/simple/price` endpoint. Update the crypto widget to accept a key in settings; show a "set up your free API key" prompt on first use with a one-click link to the CoinGecko dashboard. Without this the widget is broken for users on the current API revision. ~0.25d. — _[Source 102] (CoinGecko v3.0 API reference — `x-cg-pro-api-key` now required header)._ ✅ shipped (Unreleased) — header sent only when key set; 401/429 routes to key-prompt; export/share strip the key.

---

## v1.1.0 — Platform leverage (Next)

These require v1.0 to be listed; some require new browser API surface or are architectural.

- [ ] **Gist/URL settings sync** — export full settings as a JSON Gist (via GitHub's anonymous Gist API — no auth for public gists) and re-import by URL. Users paste the Gist URL into settings on a second device. Privacy-preserving: no accounts, no server, data is in the user's own GitHub storage. ~2d. — _[Source 98] (Bonjourr v21.0.0 sync feature); eliminates the biggest pain point for multi-device users without violating constraint #1._
- [ ] **Side Panel feed reader** — surface the RSS/News feed in Chrome's `chrome.sidePanel` (Chrome 114+) so users can read headlines without replacing the current page. The NTP stays as-is; sidePanel is additive. Gated behind a settings toggle. ~2d. — _[Source 103] (chrome.sidePanel API docs, Chrome 114+ MV3); differentiator — no NTP competitor currently uses this._
- [ ] **Local video backgrounds** — File API + base64 (WebM, capped at 8 MB; encourage short loops). Pause-on-tab-blur, pause-on-battery (`navigator.getBattery`). ~1d. — _[Sources 12, 52, 98] (Bonjourr docs video section; nightTab v6.1.1 bookmark background video)._
- [ ] **Dashboard screenshot generator** — single button; uses `html2canvas` (vendored, ~30 KB) to export a styled PNG of the active dashboard for README screenshots, r/startpages sharing, etc. ~1d. — _Gap; community-growth tool. `chrome.tabs.captureVisibleTab` is overkill for this use-case._
- [ ] **Multi-source aggregated dev feed** — preset bundle: HN frontpage + GitHub Trending (per-language, anonymous endpoint) + Lobsters. Single panel, date-sorted, deduped. ~1d. — _[Sources 32, 33]._
- [ ] **Bookmarking inside the feed** — star icon on each headline row; "Starred" panel collects them. Persisted to `chrome.storage.local`. ~1d. — _[Sources 33, 82]._
- [ ] **Keyword monitoring across all feeds** — user-defined alert words; Web Notifications when a keyword appears in any new feed item. opt-in only. ~1d. — _[Sources 55, 83]._
- [ ] **Permanent feed archive with IndexedDB** — every item ever seen stored in IndexedDB, searchable. Cap at 10k items default (user-tunable). **⚠ Storage grows unbounded without the cap; document clearly.** ~2d. — _[Sources 55, 84]._
- [ ] **YouTube subscriptions OPML recipe** — "Import YouTube subscriptions" button that walks users through Google Takeout OPML export and drops feeds into the RSS panel. ~0.25d. — _[Source 90]._
- [ ] **Anchor Positioning for widget drop-zone tooltips** — `anchor-name` / `position-anchor` / `@position-try` fallback for contextual tooltips over the drag canvas; eliminates JS positioning math. ~0.5d. — _[Sources 72, 104] (CSS Anchor Positioning API, Chrome 125+; Interop 2026 priority)._
- [ ] **`contrast-color()` CSS function for text over dynamic backgrounds** — automatic WCAG-passing text contrast over any accent color or background image; replaces manual light/dark token switching. ~0.5d when broadly supported (Interop 2026 target). — _[Source 72] (css-tricks Interop 2026)._
- [ ] **Container style queries for widget theming** — `@container style(--vantage-theme: mocha)` to let widgets self-style per active theme without re-reading JS state. ~0.5d when cross-browser. — _[Source 72] (Interop 2026: container style queries)._
- [ ] **Periodic Background Sync for feed pre-warming** — register a `periodicSync` task so the RSS cache is warm before the user's first new tab of the day. **⚠ Heavy permission surface; strict opt-in; document the Notifications-API-style permission prompt.** ~1d. — _Web platform reference (MDN: Background Sync API)._
- [ ] **In-extension error logging with share-to-clipboard** — catch and log unhandled widget errors to a circular buffer in `chrome.storage.local`; expose a "Copy debug log" button in settings. Helps diagnose user-reported issues without telemetry. ~0.5d. — _[Source 105] (TablissNG v1.6.5 error-logging system)._
- [ ] **Ambient sound widget** — looping ambient audio (rain, forest, café) via `<audio>` element; locally bundled short loops (≤200 KB each) or user-uploaded file. Pause-on-tab-blur. Complements Pomodoro focus sessions. ~1.5d. — _[Source 106] (mutabu extension, Mar 2026)._
- [ ] **JSON Feed v1.1 support in rss-parser** — detect `application/feed+json` `Content-Type` (or `{"version":"https://jsonfeed.org/..."}` probe) before the XML DOMParser path; map `items[].title`, `content_html`/`content_text`, `url`, `date_published` → existing item shape; zero new runtime deps (~0.5d in `src/rss-parser.js`). Most modern Micro.blog, Ghost, and Kagi-published feeds ship JSON Feed alongside RSS; currently silently fails on those. — _[Source 116] (JSON Feed v1.1 spec)._
- [ ] **`chrome.readingList` save integration** — "Save to Reading List" icon on each headline row; calls `chrome.readingList.addEntry({title, url, hasBeenRead: false})`; requires adding `"readingList"` to manifest permissions; graceful-no-op on Firefox (API absent). Chrome 120+ only. ~0.5d; no competitor NTP currently uses this. — _[Source 117] (chrome.readingList API docs, Chrome 120+ MV3)._

---

## v1.2.0+ — Architectural expansions (Later)

Major efforts or waiting on ecosystem maturity. Ordering is not commitment.

- [ ] **Iframe-sandboxed widget API** — Renewed Tab's model: third-party widgets in `<iframe sandbox>` with `src` declared in user config; postMessage pub/sub protocol for data + events; no remote code. **⚠ Constraint #4: official core widgets stay in-tree; iframe widgets are user-pasted only; no remote marketplace fetch.** ~5–8d to design + spec + document. — _[Sources 20, 21, 64]._
- [ ] **Theme bundle marketplace (PR-reviewed monorepo)** — `vantage-themes` repo accepts PRs of `theme.json` (color tokens + accent + background URL + greeting copy + font choice); extension fetches `manifest.json` from `raw.githubusercontent.com` on user demand. ~3d for monorepo + tooling, ongoing for PR review. — _[Sources 17, 18, 19, 101] (Mue marketplace + suggested-packs pattern)._
- [ ] **Whole-config URL share link** — base64-encoded settings JSON in a fragment URL (`#cfg=…`); one-click apply on another machine. 1d. — _[Sources 50, 51]._
- [ ] **OPFS (Origin Private File System) for large media** — migrate base64-in-`chrome.storage` for backgrounds + audio to OPFS; eliminates the 5 MB quota pressure and enables larger local videos. ~1.5d. — _[Source 107] (MDN: Origin Private File System)._
- [ ] **OffscreenCanvas blur for backgrounds** — move CSS `filter: blur()` to OffscreenCanvas in a service worker for stable 60fps at 4K with heavy widget redraws. ~1.5d. — _[Sources 52, 62]._
- [ ] **Drag-resize widget layout editor** — iOS-style: press-and-hold to enter edit mode, drag to reorder, pinch/drag corners to resize, snap to grid. Replaces the current button-based panel order. ~5d; significant design work. — _[Source 108] (Bonjourr issue #804, Apr 2026 — users explicitly requesting this)._
- [ ] **Online documentation site** — GitHub Pages or Cloudflare Pages site (`docs.vantage.dashboard`) with per-widget docs, screenshots, FAQ, and the widget API spec. Currently only README. ~1d setup + ongoing. — _[Source 109] (TablissNG docs site, v1.6.4)._
- [ ] **History search inline** — `chrome.history.search` behind a settings opt-in; opt-in default off; respects browser history-clearing. ~1d. — _[Source 39]; kept deferred._
- [ ] **CSS `sibling-index()` staggered feed entrance animations** — replace the JS `animationDelay` loop on feed item render with `animation-delay: calc(0.05s * sibling-index())` in CSS; eliminates the stagger-on-repaint JS path entirely. Chrome 138 shipped `sibling-index()` / `sibling-count()` as stable (May 2025 → stable ~Dec 2025). Interop 2026 candidate for Firefox / Safari. ~0.25d when cross-browser; track and land once Firefox ships. — _[Source 120] (Chrome 138 beta, May 2025 — `sibling-index()` example in CSS section)._

## Always-on

Maintained continuously, not version-gated.

- **Track Catppuccin palette versions** — re-import tokens when upstream ships a new flavor. — _[Sources 75, 76]._
- **Refresh `manifest.json host_permissions`** every release — only declare what is used; CWS scrutinizes `*://*/*`. — _[Sources 66, 68]._
- **Re-capture README screenshots** whenever the UI shifts. DPI-aware capture required (system is 125%).
- **Privacy Table audit** in README each release — every new outbound endpoint or permission gets a row before shipping. — _Constraint #1._
- **Verify clean-profile install** before every release — extract ZIP into a fresh user-data-dir, smoke-test all widgets across Chrome + Edge + Brave + Vivaldi + Firefox.
- **Track Chrome 138+ CSS functions** — `sibling-index()` / `sibling-count()` (stagger animations), `progress()` (range-aware interpolation), `stretch` sizing keyword, `env(--font-scale)` OS font scale variable. Chrome 138 stable ~Dec 2025; watch Firefox and Safari parity for Interop 2026 target features before landing. — _[Source 120]._
- **Track `chrome.readingList` availability** — currently Chrome 120+ only; re-check Firefox MV3 support each quarter; remove the graceful-no-op guard once cross-browser. — _[Source 117]._
- **Track Open-Meteo changelog** — new variables (cloud cover altitude bands, new AQI metrics, additional pollen species) and new API domains. — _[Sources 56, 57, 58, 59]._
- **Track Chrome Built-in AI origin trial status** — Prompt API, Summarizer API, Translator API (all gated behind Chrome 138+ / hardware check today); monitor for GA. — _[Source 110]._
- **Track Chrome `chrome.*` API changes** — Reading List API, Side Panel updates, future `chrome.ai` namespace. — _[Sources 62, 65]._
- **Track Interop 2026 shipping** — Anchor Positioning (Chrome 125+ now), `contrast-color()`, container style queries, Popover API interest invokers (`interestfor`). — _[Sources 72, 111, 112]._
- **CORS proxy health check** — quarterly verify `allorigins.win` + alternates are operational; note last-checked date in CLAUDE.md. — _[Sources 80, 81]._
- **Storage migration guard** — any field rename or structural change ships with a `migrate(prev)` step in `loadSettings()` keyed off `schemaVersion`; forward-additive changes are handled by existing deep-merge. — _Gap; required on any workspace schema change._
- **CoinGecko API key monitoring** — CoinGecko has already changed free-tier authentication once (keyless → `x-cg-demo-api-key`); re-audit before each crypto-widget release. — _[Source 102]._
- **Quotable API endpoint monitoring** — `/quotes/random` is current; `/random` is deprecated and may be removed. — _[Source 113]._

---

## Testing & quality

No automated test suite is planned. The repo's `CLAUDE.md` declares "No tests unless explicitly requested." For a no-build-step vanilla-JS extension, a Karma/Jest/Playwright stack is high overhead against a manually smoke-tested, clean-profile install checklist. If the iframe widget API ever ships, that postMessage protocol surface warrants a small Playwright-extension integration test — at which point this section gets revised.

---

## Under Consideration

Items with real merit but unresolved trade-offs. Decided per release cycle, not pre-committed.

- **Chrome Prompt API (Gemini Nano) for contextual actions** — on-device, no server, no API key; privacy-aligned. Could power: feed item summarization, search query suggestion, custom greeting generation. Currently gated behind Chrome 138+ with hardware check (8 GB RAM + compatible NPU); market share too low for a Now item. Will re-evaluate when the hardware gating loosens. — _[Source 110] (Chrome Built-in AI docs, origin trial status)._
- **Chrome Summarizer API for feed items** — on-device article summarization; hardware gating same as Prompt API. Potential "TL;DR" chip per headline. Monitor origin trial → GA pipeline. — _[Source 110]._
- **Chrome Translator API for foreign-language feeds** — on-device translation (Chrome 138+); no third-party API required; privacy-safe. Could label non-English headlines in their detected language and offer inline translation. Same hardware caveat. — _[Source 110]._
- **Zen Shelf / sticky note board widget** — text and image stickers placed anywhere on the new-tab canvas (EclipseTab's "Zen Shelf" model). Novel; high aesthetic appeal; design complexity is high (free-position vs. grid). Needs a layout strategy that doesn't conflict with the existing panel system. — _[Source 114] (EclipseTab v1.3 feature page)._
- **`unlimitedStorage` manifest permission** — `chrome.storage.local` is not cleared by browser "Clear browsing data" (extension storage is isolated per Chrome Storage docs), but the `unlimitedStorage` permission removes the 5 MB soft quota. Worth adding once notes/audio assets grow beyond 3 MB in practice. Currently `navigator.storage.persist()` is already called. — _[Source 115] (Chrome Storage & Cookies doc)._
- **AI chatbot widget (BYOK)** — Brave Search Answers or OpenAI-compatible endpoint. Tension with constraint #1: every query is sent off-device. Acceptable only if (a) opt-in + default off, (b) BYOK, (c) clear "this query goes to X" disclosure. On hold pending Chrome Prompt API GA — on-device is a much cleaner path. — _[Sources 67, 77, 78]._
- **Search history dropdown via `chrome.history`** — permission stigma + low repeat value. Keep deferred unless `chrome.history` gets a per-domain-only mode. — _Existing deferral note._
- **Email inbox preview (Gmail / IMAP)** — heavy OAuth surface; Google OAuth review for Gmail scopes is months long. Users who want this have Gmail open anyway. — _[Source 41]._
- **Apple/Google Calendar OAuth** — same OAuth tax as Gmail; the `.ics` URL widget covers 90% of demand without accounts. Revisit only if users need event creation. — _[Sources 15, 16, 41, 47]._
- **WebAuthn / passkey lock for settings** — bio-lock so a shared device can't reset config. Real demand but the new-tab page is a weak auth boundary (incognito tab bypasses it). Reconsider after workspaces establish a per-profile identity model. — _Web platform reference (MDN: Web Authentication API)._
- **Web Share API for dashboard snapshot** — `navigator.share({title, text, files: [pngBlob]})` on a "Share" button; would allow sending a dashboard screenshot to the OS share sheet. Needs empirical verification that `navigator.share()` works from the `chrome-extension://newtab` origin (some APIs are restricted there). Under consideration pending validation. — _[Source 119] (MDN Web Share API)._
- **Tab Groups display panel** — `chrome.tabGroups` (Chrome 89+, `shared` attribute Chrome 137+): visual card list of current browser tab groups; click to activate group; requires `"tabGroups"` manifest permission. Novel NTP feature; no competitor uses it; useful for power users managing 40+ tabs. Needs UX scoping (read-only view vs. editable). — _[Source 121] (chrome.tabGroups API docs)._

---

## Rejected

Each line: feature — citation — one-sentence rejection reason.

- **Switch to a build pipeline (Bun, Vite, Astro, React, Vue)** — _[Sources 17, 19, 28, 50]._ Contradicts constraint #2; no-build-step is core identity.
- **Embed third-party hosted widgets (Apption-style remote-code marketplace)** — _[Source 48]._ Contradicts constraint #4; no remote code execution.
- **Custom HTML widget** — _[Source 2]._ XSS surface in the new-tab origin; custom-CSS gives 80% of expressiveness with 5% of risk; the iframe sandbox API (Later) is the correct path.
- **Remote video backgrounds from external APIs (Pixabay, Pexels)** — _[Sources 12, 98] (Bonjourr Pixabay video backgrounds)._ Outbound API call to third-party service on every new tab; contradicts constraint #1; local video upload is the right shape.
- **TradingView embed** — _[Source 50]._ Pulls TradingView analytics + cookies into the new-tab origin; contradicts constraint #1.
- **Smart-home control (Hue / Matter) from new tab** — _[Source 50]._ Needs local network discovery; out of scope for a browser extension.
- **ML-driven dynamic wallpaper generation** — _[Source 52]._ Inference on every load without on-device hardware; no offline path; bloats install.
- **RGB hardware sync (iCUE/Chroma)** — _[Source 53]._ Desktop-app feature, not achievable from a browser extension sandbox.
- **Companion mobile app** — _[Source 53]._ No-account stance means the app has nothing to sync; defeats the purpose.
- **SSO / Keycloak / Authelia for settings** — _[Source 49]._ No server, no multi-user model in this product.
- **Team workspaces with cloud-shared collections** — _[Sources 41, 43, 44]._ Server + accounts required; entirely separate product.
- **SOC2 compliance work** — _[Source 44]._ No server, no audit surface; inapplicable.
- **Custom iframe widget with arbitrary unsandboxed URLs** — _[Source 47]._ Same XSS rationale as custom HTML; the v1.2 sandboxed-iframe API is the correct shape.
- **Crypto price ticker from CoinGecko without any API key** — _[Source 102]._ CoinGecko has removed the keyless free tier; shipping a widget that immediately breaks for new users is not acceptable; the CoinGecko demo-key migration (Now) is the fix.
- **Spotify / Strava / Twitter / Fitbit widgets** — _[Source 41]._ All require OAuth; contradicts constraint #1.
- **Custom sync server or peer-to-peer sync** — _[Source 89]._ No server; Gist/URL sync (Next) is the correct privacy-preserving shape.
- **Crash log as a hosted service / remote telemetry** — _Gap._ Local crash log + "copy debug log" button (Next) is sufficient; hosted service contradicts constraint #1.
- **Brave-style sponsored background revenue share** — _[Source 40]._ Contradicts constraint #1 unless run as a separate fork; noting for completeness.
- **Google Fonts cloud font picker** — Bonjourr v22.0 ships a Google Fonts selector in the UI. Every font swap sends a request to `fonts.googleapis.com` on new-tab open; contradicts constraint #1 (undisclosed third-party call on every tab). Local-font-upload is the acceptable future path.
- **Haptic / vibration feedback** — Web platform reference. New-tab page has no touch surface in typical use; inapplicable.
- **Hexagon / non-rectangular tile layouts** — _[Source 50]._ Breaks accessibility and drag-reorder; low demand.

---

## Appendix — Sources

Numbering matches citations inline. URLs verified at research time (2026-05-01).

**Sources #97–#115 added in round 1; #116–#121 added in round 2 (2026-05-01).**

### Direct OSS competitors
1. https://github.com/joelshepherd/tabliss — Tabliss; original; mostly dormant since 2022.
2. https://github.com/BookCatKid/TablissNG — Active Tabliss fork, nightly builds.
3. https://github.com/joelshepherd/tabliss/issues/56 — Long-open feature requests (Asana/Trello/Todoist/Notes/Countdown).
4. https://github.com/joelshepherd/tabliss/issues/168 — World Clock pattern.
5. https://github.com/joelshepherd/tabliss/issues/170 — Image-source variety (ArtStation/DeviantArt).
6. https://github.com/joelshepherd/tabliss/issues/324 — Background blur as opt-in.
7. https://github.com/joelshepherd/tabliss/issues/477 — Per-Firefox-container settings; underserved.
8. https://github.com/joelshepherd/tabliss/issues/650 — Custom images for quick links.
9. https://github.com/joelshepherd/tabliss/issues/653 — Time-based background changes.
10. https://github.com/joelshepherd/tabliss/issues/704 — `moz-extension://` link support.
11. https://github.com/victrme/Bonjourr — Bonjourr; iOS-inspired; videos as backgrounds, Pomodoro, Notes, context menu, Gist sync.
12. https://github.com/victrme/Bonjourr/blob/master/CHANGELOG.md — Bonjourr CHANGELOG v22.0.0 (context menu, video backgrounds, alarm tone customization, theme-color meta tag) and v21.0.0 (Gist/URL settings sync).
13. https://bonjourr.fr/docs/overview/ — Bonjourr docs v22: link groups, world clocks, custom icon modes, right-click context menu actions, Google Fonts integration, Pixabay video backgrounds.
14. https://github.com/victrme/Bonjourr/issues/130 — Folders for quick links.
15. https://github.com/victrme/Bonjourr/issues/416 — Calendar/reminders integration.
16. https://github.com/victrme/Bonjourr/issues/529 — Calendar widget with Google Calendar sync.
17. https://github.com/mue/mue — Mue; photo/quote pack marketplace.
18. https://github.com/mue/marketplace — Marketplace submission format.
19. https://github.com/mue/website — Marketplace docs and browse UI.
20. https://github.com/rubenwardy/renewedtab — Renewed Tab; grid-resizable widgets, iframe plugin model.
21. https://renewedtab.com/blog/2022/07/24/custom-widgets/ — Iframe-isolated plugin model rationale.
22. https://renewedtab.com/blog/2023/03/31/import-feeds-from-feedly/ — OPML import in extension UI.
23. https://github.com/ThatSINEWAVE/New-Tab — Theme + search-engine variants.
24. https://github.com/Sanakovich/fluent-new-tab — Fluent UI take.
25. https://github.com/xtditom/YourDynamicDashboard — Vanilla JS, glassmorphism.
26. https://github.com/uzairfarooq/Awesome-New-Tab-Page — Curated list.
27. https://github.com/topics/new-tab-extension — GitHub topic listing.
28. https://github.com/topics/new-tab-page — GitHub topic listing including OSS speed-dial, Vue 3 + Vite stack.
29. https://github.com/Thingbomb/Flowtide — Magic Search, todos, Pomodoro, soundscapes (GPLv3).
30. https://github.com/zombieFox/nightTab — nightTab v7.3.0: modular rewrite, clipboard import/export, partial backup restore, new theming engine, group collapse, custom favicon.
31. https://github.com/sourcetab/sourcetab — Drag-and-drop widget edit mode.
32. https://github.com/karakanb/devo — Multi-source dev feed.
33. https://addons.mozilla.org/en-US/firefox/addon/hackertab-dev/ — Hackertab.

### HN / community signal
34. https://news.ycombinator.com/item?id=33351585 — Personal-feed NTP (locally stored).
35. https://news.ycombinator.com/item?id=42237258 — Flowtide thread; minimal-by-default praised.
36. https://github.com/plibither8/markdown-new-tab — Markdown notes new tab; revision history; localForage.

### Browser-vendor & commercial competitors
37. https://vivaldi.com/blog/desktop/speed-dials-with-widgets-vivaldi-browser-snapshot-3820-3/ — Vivaldi 7.7 speed-dial widgets.
38. https://help.vivaldi.com/desktop/tools/start-page-dashboard/ — Widget transparency, sizing, columns.
39. https://support.brave.app/hc/en-us/articles/360040912932 — Brave NTP customize.
40. https://brave.com/blog/sponsored-images-now-available-on-all-brave-platforms/ — Brave sponsored-images model.
41. https://get.momentumdash.help/hc/en-us/articles/115015748548 — Momentum Plus features.
42. https://momentumdash.com/plus — Momentum Plus pricing.
43. https://www.gettoby.com/ — Toby visual tab workspace.
44. https://workona.com/ — Workona workspace tool.
45. https://www.notion.com/help/notion-new-tab-extension — Notion's official NTP extension.
46. https://chromewebstore.google.com/detail/tabtion-notion-new-tab-pa/kloignaeckgdbbgnpbgjjhbhcpgbofee — Tabtion.
47. https://plusai.com/notion-widgets — Plus AI: Calendar/Outlook live snapshots as widgets.
48. https://apption.co/ — Apption widget marketplace.

### Self-hosted dashboards (adjacent space, big idea-source)
49. https://selfhosting.sh/best/dashboards/ — Heimdall vs Homer vs Dashy vs Homepage 2026.
50. https://github.com/jnmcfly/awesome-startpage — Catppuccin / Tokyonight / Nord / gruvbox themed startpages.
51. https://startpages.github.io/ — Startpages Emporium (visual showcase).

### Wallpaper-engine adjacents
52. https://github.com/rocksdanister/lively — Lively Wallpaper.
53. https://store.steampowered.com/app/431960/Wallpaper_Engine/ — Wallpaper Engine.

### RSS / Reader competitors
54. https://www.readless.app/blog/best-rss-readers-2026 — NetNewsWire reference.
55. https://www.inoreader.com/blog/2014/05/opml-subscriptions.html — OPML subscriptions as feature.

### Open-Meteo capability surface
56. https://open-meteo.com/en/docs/air-quality-api — Air Quality API (AQI / pollens).
57. https://open-meteo.com/en/docs/ — Open-Meteo Marine API (waves).
58. https://open-meteo.com/en/docs/climate-api — Climate API (CMIP6 1950–2050).
59. https://open-meteo.com/en/docs/ensemble-api — Ensemble API (51 ECMWF members).

### Weather-radar / external data
60. https://www.rainviewer.com/api.html — RainViewer tile API.
61. https://www.rainviewer.com/blog/weather-radar-apis-2025-overview.html — RainViewer 2025 personal-use restriction.

### Browser platform / Chrome APIs
62. https://developer.chrome.com/docs/extensions/whats-new — What's new in extensions.
63. https://developer.chrome.com/docs/extensions/how-to/web-platform/geolocation — Geolocation under MV3 (offscreen pattern).
64. https://developer.chrome.com/docs/extensions/reference/manifest/sandbox — Sandboxed pages manifest.
65. https://developer.chrome.com/en/blog/resuming-the-transition-to-mv3 — MV3 transition state.
66. https://developer.chrome.com/docs/webstore/program-policies/policies — CWS program policies.
67. https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq — CWS quality FAQ (NTP single-purpose).
68. https://developer.chrome.com/docs/webstore/cws-dashboard-privacy — CWS privacy fields.
69. https://developer.chrome.com/docs/extensions/reference/api/i18n — chrome.i18n reference.

### Standards / specs
70. https://www.w3.org/TR/WCAG22/ — WCAG 2.2 spec.
71. https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html — Focus-Not-Obscured (2.4.11).
72. https://css-tricks.com/interop-2026/ — Interop 2026 priorities (View Transitions, Anchor Positioning, container style queries).
73. https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API — View Transitions API.
74. https://css-tricks.com/popover-api-or-dialog-api-which-to-choose/ — Popover vs Dialog API guidance.

### Theming / design
75. https://github.com/catppuccin/catppuccin — Catppuccin palette repo.
76. https://github.com/catppuccin/palette — `@catppuccin/palette` programmatic tokens.

### Search APIs
77. https://api-dashboard.search.brave.com/documentation/pricing — Brave Search API pricing.
78. https://www.implicator.ai/brave-drops-free-search-api-tier-puts-all-developers-on-metered-billing/ — Brave free-tier removal.
79. https://aireview.tools/blog/brave-search-vs-kagi-comparison-2026 — Brave vs Kagi pricing.

### CORS proxies
80. https://corsproxy.io/ — AllOrigins replacement; production-scale.
81. https://github.com/alianza/everyorigin — OSS allorigins clone on Netlify.

### Solar / astronomical libraries
82. https://github.com/mourner/suncalc — SunCalc reference.
83. https://github.com/hypnos3/suncalc3 — SunCalc3 with golden-hour fields.
84. https://github.com/udivankin/sunrise-sunset — NREL SPA implementation; polar-day handling.

### Firefox MV3 port
85. https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/ — Mozilla MV3 migration guide.
86. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings — Firefox-specific manifest.

### Mobile weather UX (steal from)
87. https://9to5mac.com/2022/09/12/carrot-weather-lock-screen-widgets-ios-16-update/ — CARROT lock-screen widgets.
88. https://support.apple.com/guide/iphone/use-weather-widgets-iph8bf15cb61/ios — Apple Weather widget guide.

### Speed-dial competitors
89. https://chromewebstore.google.com/detail/group-speed-dial/imfeikbeimbfpmgfkkmjekabdehiiajc — Group Speed Dial (E2EE sync, sharing).
90. https://www.ghacks.net/2020/07/07/yet-another-speed-dial-for-figrefox-and-chrome/ — Yet Another Speed Dial review.
91. https://chromewebstore.google.com/detail/humble-new-tab-page/mfgdmpfihlmdekaclngibpjhdebndhdj — Humble NTP.
92. (Reserved — no third-party citation needed; refers to `chrome.topSites` + `chrome.sessions`.)

### Productivity adjacents
93. https://www.raycast.com/ — Raycast (command palette + shortcuts).
94. https://reflect.app/blog/free-pomodoro-app — Reflect Pomodoro NTP.
95. https://chromewebstore.google.com/detail/provent-pomodoro-new-tab/cnilpijpbkkefelbjobbfgdhpcdfpilg — Provent (Pomodoro + site blocker NTP).

### Reader extension reference
96. https://www.ghacks.net/2020/03/10/smart-rss-reader-is-a-feed-reader-extension-for-firefox-and-chrome/ — Smart RSS Reader (OPML import preserves folders).

### Sources added 2026-05-01 (round 1 revision)

97. https://github.com/zombieFox/nightTab/releases/tag/v7.3.0 — nightTab v7.3.0 release notes: partial backup restore, clipboard import/export, modular theming rewrite, group collapse.
98. https://github.com/victrme/Bonjourr/blob/master/CHANGELOG.md — Bonjourr v22.0.0 (context menu, Pixabay video backgrounds, alarm tones, theme-color meta tag); v21.0.0 (Gist/URL settings sync).
99. https://github.com/victrme/Bonjourr/issues/799 — Bonjourr issue #799: inline per-query search engine switching request (Apr 2026, open, high engagement).
100. https://github.com/victrme/Bonjourr/issues/750 — Bonjourr issue #750: quick-link items-per-row control request (Jan 2026, open).
101. https://github.com/mue/mue/releases — Mue v7.6.0: QuoteInfoModal (author + source details), suggested starter packs, dynamic storage quota, blurhash metadata, accessibility improvements.
102. https://docs.coingecko.com/reference/introduction — CoinGecko API v3 reference: `x-cg-demo-api-key` header now required on free tier; demo key self-served from CoinGecko dashboard; previously keyless endpoint is now gated.
103. https://developer.chrome.com/docs/extensions/reference/api/sidePanel — chrome.sidePanel API (Chrome 114+, MV3): persistent sidebar panel for extensions; does not require NTP to be the active tab.
104. https://developer.chrome.com/blog/anchor-positioning-api — CSS Anchor Positioning: `anchor-name`, `position-anchor`, `@position-try` fallbacks; Chrome 125+; Interop 2026 cross-browser target.
105. https://github.com/BookCatKid/TablissNG/releases/tag/v1.6.5 — TablissNG v1.6.5: error-logging system with clipboard copy for user-submitted bug reports.
106. https://github.com/topics/new-tab-extension — mutabu ambient sounds extension discovered via GitHub topic search (rain, forest, café looping audio via `<audio>`).
107. https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system — MDN: Origin Private File System (OPFS); replaces base64-in-chrome.storage for large media files; no quota pressure.
108. https://github.com/victrme/Bonjourr/issues/804 — Bonjourr issue #804: iOS-style drag-and-resize widget layout editor request (Apr 2026, open, high engagement).
109. https://github.com/BookCatKid/TablissNG/releases/tag/v1.6.4 — TablissNG v1.6.4: online documentation site launched; confirms documentation site as table-stakes for store-ready NTP extension.
110. https://developer.chrome.com/docs/ai/built-in — Chrome Built-in AI: Prompt API, Summarizer API, Writer API, Rewriter API, Translator API, Language Detector API — all Gemini Nano, Chrome 138+, on-device, in origin trial as of 2026-05-01.
111. https://developer.mozilla.org/en-US/docs/Web/API/Popover_API — Popover API MDN: `popover="hint"`, `interestfor` attribute (hover-triggered popovers), `interest-delay` CSS property — Baseline 2026.
112. https://css-tricks.com/interop-2026/ — Interop 2026 confirmed priorities: `contrast-color()`, container style queries, CSS Anchor Positioning, Popover API interest invokers, Custom Highlights (`::search-text`, `::target-text`), advanced `attr()` with type conversion.
113. https://github.com/lukePeavey/quotable — Quotable API docs: `/quotes/random` is current canonical endpoint; `/random` marked deprecated and subject to removal; 180 req/min rate limit.
114. https://github.com/ENCRE0520/EclipseTab — EclipseTab v1.3: "Zen Shelf" (free-position text + image sticky notes), "Focus Spaces" (per-context workspace switching); listed on CWS + AMO + Edge Add-ons.
115. https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies — Chrome extension storage: `chrome.storage.local` is NOT cleared by "Clear browsing data"; `unlimitedStorage` permission removes 5 MB soft quota entirely.

### Sources added 2026-05-01 (round 2 revision)

116. https://jsonfeed.org/version/1.1 — JSON Feed v1.1 spec: JSON-native syndication format; `items[].content_html` / `content_text`, `date_published` (RFC 3339), `authors[]`, `language`, `next_url` pagination; `Content-Type: application/feed+json`.
117. https://developer.chrome.com/docs/extensions/reference/api/readingList — chrome.readingList API (Chrome 120+ MV3): `addEntry()`, `query()`, `updateEntry()`, `removeEntry()`; requires `"readingList"` permission; unavailable in Firefox.
118. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast — MDN: `prefers-contrast` media feature (`no-preference`, `more`, `less`, `custom`); full cross-browser support; `custom` matches `forced-colors: active` palette; last updated Apr 2026.
119. https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API — MDN: Web Share API (`navigator.share()` / `navigator.canShare()`); requires transient user activation; availability in `chrome-extension://newtab` origin unverified.
120. https://developer.chrome.com/blog/chrome-138-beta — Chrome 138 beta (published May 28, 2025): CSS `sibling-index()` / `sibling-count()` for position-based `calc()` in animations; `progress()` interpolation function; `stretch` sizing keyword; OS-level font scale `env()` CSS variable; Viewport Segments API for foldable devices.
121. https://developer.chrome.com/docs/extensions/reference/api/tabGroups — chrome.tabGroups API (Chrome 89+): read/modify tab groups; `shared` attribute added Chrome 137+; requires `"tabGroups"` permission.

---

## Notes on this revision (2026-05-01, round 1)

- **Prior roadmap (2026-04-29, v0.5.0) was fully superseded.** All Now / Next / Later items from that revision shipped in v0.6.0–v0.9.0 and are moved to the Shipped section above with their actual ship dates.
- **v1.0.0** is now the first open milestone. It is scoped tightly: the critical CoinGecko API key fix, a cluster of low-effort UX wins, and the distribution work (WCAG, i18n, store listings) needed to reach a wider audience.
- **v1.1.0** adds platform leverage (Gist sync, Side Panel, video backgrounds) and the reader power-tools that were deferred from v0.9.
- **v1.2.0+** holds large architectural commitments (widget API, drag-resize layout, OPFS migration) until v1.0 proves the widget set is stable.
- **Fourteen new sources (#97–#115)** added from the 2026-05-01 research pass. The appendix now totals 115 numbered citations.
- **CoinGecko API break** is the highest-urgency item: the free endpoint now requires `x-cg-demo-api-key` and the current widget is broken for users who haven't already set a key. This is a Now item, not a polish item.
- **Chrome Built-in AI** (Sources 110) is tracked in Under Consideration rather than the roadmap tiers — the hardware gating (`Chrome 138+ + 8 GB RAM + compatible NPU`) makes market share too low for a committed item today, but it is the privacy-safe path for feed summarization and will be re-evaluated each release cycle.

## Notes on this revision (2026-05-01, round 2)

- **CI/CD release workflow discovered as already shipped** — `.github/workflows/release.yml` is a complete automated pipeline (ZIP + CRX3 + XPI + SHA256 + Omaha feed + AMO manifest + GitHub Release). Added to Shipped (v0.9.0). No CI/CD items remain open.
- **Six new sources (#116–#121)** added: JSON Feed v1.1 spec, chrome.readingList API, MDN prefers-contrast, MDN Web Share API, Chrome 138 beta, chrome.tabGroups API.
- **New Now items (2):** `prefers-contrast: more` / `forced-colors` CSS pass; custom greeting text per time slot.
- **New Next items (2):** JSON Feed v1.1 support in `rss-parser.js`; `chrome.readingList` save integration.
- **New Later item (1):** CSS `sibling-index()` staggered feed entrance animations (Chrome 138 stable, awaiting Firefox/Safari parity via Interop 2026).
- **New Under Consideration items (2):** Web Share API dashboard snapshot; Tab Groups display panel (`chrome.tabGroups`).
- **New Rejected item (1):** Google Fonts cloud picker (third-party call on every new tab; contradicts constraint #1).
- **Always-on updated:** Chrome 138+ CSS function tracking; `chrome.readingList` cross-browser availability tracking.

