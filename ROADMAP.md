# Vantage Roadmap

_Continuation update 2026-06-06: rounds 15-24 resumed against local `main` at `92ba6ff`, covering repo drift, release hardening, Gist sync restore semantics, privacy-doc parity, CWS review risk, and Chrome 148 / Firefox 151 platform changes._

_Living document. Last revised 2026-05-11 (v1.1.0 shipped; Phases 1–5 complete: 160+ sources researched, 20+ features harvested, gap analysis verified, ROADMAP updated, self-audit passed) against v1.1.0._

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

### June 2026 release hardening
- [ ] **P1: Privacy and network documentation parity pass** - README's network table now lists the Gist transfer endpoint, but `PRIVACY.md` and CWS docs still need a full endpoint inventory pass for newer Open-Meteo marine/flood/ensemble endpoints, GitHub Trending RSS, GitHub Gist sync, optional history/local error-log surfaces, and stale rows after dead-endpoint cleanup. Manifest host permissions include explicit Open-Meteo/CORS hosts while `api.github.com`, CoinGecko, NASA, Google favicons, Picsum, Wikipedia, and user feed URLs are covered through broad feed/user-content permissions or direct fetch paths. Effort: ~0.25-0.5d. Evidence: `README.md`, `PRIVACY.md`, `docs/privacy-practices-cws.md`, `manifest.json`, `src/utils/gist-sync.js`, `src/widgets/github.js`, `src/utils/weather-source.js`, `src/widgets/marine.js`, `src/widgets/flood.js`, `src/widgets/photo.js`, `src/widgets/quote.js`, `src/utils/favicon-cache.js`.
  - Acceptance criteria: every host permission and every optional remote call has a README row, a privacy-policy row, and CWS permission justification; Gist export/import is documented separately from the GitHub widget; Open-Meteo marine/flood/ensemble rows are present in `PRIVACY.md`; GitHub Trending RSS mirror and GitHub Gist sync are not collapsed into the GitHub widget row; all rows name the user action that triggers the call and the setting that disables it.
  - Patch plan: add or verify rows for Open-Meteo base/geocoding/air-quality/marine/flood/ensemble, user RSS/News URLs, user iCal URLs, feed-discovery URLs, `api.allorigins.win`, `corsproxy.io`, `www.google.com/s2/favicons`, `www.bing.com`, `api.coingecko.com`, `api.github.com` user events/search, `api.github.com/gists`, `mshibanami.github.io/GitHubTrendingRSS`, `picsum.photos`, `api.nasa.gov`, `embed.windy.com`, and any RainViewer row only if a live code path still exists. Update `docs/privacy-practices-cws.md` "Data Collection" so it mentions optional local error logs, optional history permission, and optional GitHub token use if the token path ships.
- [ ] **P1: Prepare a CWS broad-host review packet before submission** - Vantage legitimately needs `*://*/*` because users can add arbitrary RSS, iCal, image, favicon, and embed URLs, but Chrome's own review guidance calls broad host permissions a notable review-time risk, and the current store guide still promises "24-72 hours" despite the April 2026 CWS surge notice and first-review/broad-host community reports. Effort: ~0.25d. Evidence: `manifest.json`, `docs/privacy-practices-cws.md`, `docs/store-submission-guide.md`, [Sources 226-229].
  - Acceptance criteria: `docs/store-submission-guide.md` replaces "24-72 hours" with official "few days to a few weeks; contact support after three weeks"; permission justifications explicitly connect `*://*/*` to user-configured URLs and no content-script injection; the submission notes include a reviewer-facing endpoint inventory and a "no remote code/no telemetry/no broad scrape" statement; screenshots or QA notes show broad access is only exercised after user configuration.
  - Optional implementation follow-up: evaluate whether RSS/iCal/feed-discovery/favicons can move from persistent `host_permissions` to `optional_host_permissions` plus per-feed user grants without breaking the no-friction NTP setup. If not, document why `activeTab` and fixed-host whitelists do not fit user-defined feeds.
- [ ] **P1: Optional host-permission broker feasibility spike** - Current `manifest.json` and `manifest.firefox.json` grant `*://*/*` at install time so arbitrary user-added feeds, iCal URLs, image URLs, favicon discovery, and embeds can work without prompts. Chrome and Firefox both support runtime host grants via optional host permissions, and Chrome 133+ also exposes host-access request UI, but this is a UX/architecture trade-off rather than a simple manifest edit. Effort: ~0.5-1d spike, ~1.5-2d implementation if accepted. Evidence: `manifest.json`, `manifest.firefox.json`, `src/utils/rss-parser.js`, `src/widgets/calendar.js`, `src/utils/feed-discovery.js`, `src/utils/favicon-cache.js`, `src/settings.js`, [Sources 230-233].
  - Proposed design: add a `src/utils/host-permissions.js` broker that derives an origin from every user-entered URL, checks `chrome.permissions.contains({ origins: [...] })`, requests the origin from a direct user gesture when the feed/calendar/image/embed is added, records denied origins in local settings for clear UI recovery, and listens for `permissions.onRemoved` so widgets can show "grant access again" instead of generic network errors.
  - Migration path: keep first-party fixed endpoints (`api.open-meteo.com`, `geocoding-api.open-meteo.com`, `air-quality-api.open-meteo.com`, `marine-api.open-meteo.com`, `flood-api.open-meteo.com`, `ensemble-api.open-meteo.com`, `api.allorigins.win`, `corsproxy.io`, `www.bing.com`) as required host permissions; move only user-discovered `http://*/*` and `https://*/*` into `optional_host_permissions`; add an import-time "grant access for imported feeds" checklist for settings restores.
  - Non-goal: `activeTab` is not a replacement for Vantage's background/NTP feed fetching because it grants temporary access only after explicit user gestures on the active tab's origin; Vantage needs persistent access to feed origins that are often not the active tab.
  - Acceptance criteria: install warning no longer includes all-sites access on Chromium if the spike succeeds; adding a feed or image URL shows a scoped permission explanation before the browser prompt; denied origins degrade to actionable widget/settings copy; Firefox behavior is documented; feed pre-warming skips ungranted origins without hammering; CWS reviewer packet explains the least-privilege path.
- [ ] **P1: Chrome 148 `browser` namespace adoption decision** - Chrome 148 now exposes all extension APIs under `browser` as a cross-browser alternative, with promise-returning `runtime.onMessage` listeners. Vantage already supports Firefox via `browser` in the service worker and `chrome` aliases elsewhere; do not churn the whole codebase immediately, but add a small policy decision and possibly extend `browser-shim.js` so local dev exposes both namespaces consistently. Effort: ~0.25d policy, ~0.5d if shim/code cleanup is chosen. Evidence: `src/utils/browser-shim.js`, `src/background.js`, [Source 222].
  - Acceptance criteria: `CLAUDE.md` documents whether Vantage standardizes on `chrome`, `browser`, or `const ext = globalThis.browser || globalThis.chrome`; any shim update preserves Chrome <=147, Firefox 109+, and local-server QA behavior.

### UX polish
- [x] **Restore partial backup from settings import** — nightTab v7.3 pattern: when importing a settings JSON, let the user pick which sections to restore (theme, widgets, links, feeds) rather than all-or-nothing. Prevents accidental data loss on migration. ~0.5d. — _[Source 97] (nightTab v7.3.0 release notes); common user request._ ✅ shipped (Unreleased) — section-checklist dialog gates JSON import + `#import=` share links; auto-preserves API keys on round-trip.
- [x] **In-line multi-engine search switching** — small dropdown/toggle next to the search bar to switch engines per-query without opening settings. State: drop the selected engine into the search placeholder; last-used engine persists. ~1d. — _[Source 99] (Bonjourr issue #799, Apr 2026); high-demand, table-stakes in competitors._ ✅ shipped (v0.13.0) — Shift+Enter / Shift+Click submit opens a quick-pick popover; pick a one-shot engine for THIS query without changing the saved default. (Placeholder half shipped earlier in v0.10.0.)
- [x] **Right-click context menu** — right-click on background surface → quick-add quick link, open widget settings, cycle background, toggle dark/light mode. Bonjourr v22.0's most cited UX win; does not require keyboard shortcuts to trigger. ~1.5d. — _[Source 98] (Bonjourr docs v22 context-menu section); Bonjourr AMO reviews praise this specifically._ ✅ shipped (v0.12.0) — cycle theme/accent/background + open settings + open widget picker; suppressed on interactive surfaces and modal overlays; settings toggle to opt out.
- [x] **Pomodoro alarm tone customization** — upload a custom audio file (MP3/OGG, capped at 200 KB) or pick from 3 bundled tones (bell, chime, digital). Bonjourr v22.0 ships this with volume control. ~0.5d. — _[Source 98] (Bonjourr CHANGELOG v22.0.0)._ ✅ shipped (Unreleased) — Web Audio synthesis (no shipped audio assets), volume slider, Test button, 200 KB upload cap enforced on every import path.
- [x] **Weather widget enrichment** — add feels-like temperature (`apparent_temperature`), precipitation probability (`precipitation_probability`), dew point (`dew_point_2m`), and visibility (`visibility`) to the weather widget. All four variables are already in Open-Meteo's current endpoint response; UI-only change. ~0.5d. — _[Sources 56, 57] (Open-Meteo docs; confirmed available in current response)._ ✅ shipped (Unreleased) — feels-like + precip pills, dew/humidity/visibility in hover title.
- [x] **Quote widget author details** — clicking the quote expands an author info card (birth/death, short bio, link to Wikipedia). Mue v7.6.0 pattern. ~0.5d. — _[Source 101] (Mue v7.6.0 QuoteInfoModal feature)._ ✅ shipped (Unreleased) — author cite is a direct Wikipedia link (no extra API calls / host_permissions); click-through gives users the bio + dates.
- [x] **`theme-color` meta tag tracking current background** — update `<meta name="theme-color">` whenever the background color changes; browser tab chrome reflects the current sky color in supporting browsers. Trivial polish, ~0.1d. — _[Source 98] (Bonjourr v22.0.0 CHANGELOG)._ ✅ shipped (Unreleased) — animated backgrounds emit `vantage:bg-color`; static kinds + system-theme flips kept in sync.
- [x] **`prefers-contrast: more` / `forced-colors` CSS pass** — single media-query sweep to thicken dashed borders, lift low-opacity placeholder text, and solidify subtle dividers when the OS reports a high-contrast preference; `forced-colors: active` (Windows High Contrast Mode) also handled. ~0.25d; no new dependencies. — _[Source 118] (MDN prefers-contrast, updated Apr 2026); pairs with the WCAG 2.2 AA audit._ ✅ shipped (Unreleased) — additive media block; ghost-button hovers also tightened.
- [x] **Custom greeting text per time slot** — let users override the hardcoded "Good morning / afternoon / evening" strings with their own copy per time window; optional `[name]` token still expands. Low-effort personalisation. ~0.5d. — _[Source 98] (Bonjourr v22.0.0 CHANGELOG — "Custom greetings" feature)._ ✅ shipped (Unreleased) — 4 slot inputs; safe `[name]` expansion via element creation.
- [x] **`contrast-color()` for dynamic text contrast** — `contrast-color(var(--accent))` auto-selects the WCAG-passing white or black text over any accent chip, weather-sky gradient, or background image; replaces manual `--text-on-surface` light/dark token switching. Progressive enhancement: color-token fallback for Firefox 109–145 (silent, no visual regression). ~0.5d; purely additive CSS. Chrome 147+, Firefox 146+, Safari 26+, Edge 147+ — all Interop 2026 cross-browser targets met. — _[Sources 72, 124] (Interop 2026 target; caniuse browser support confirmed)._ ✅ shipped (Unreleased) — `@supports (color: contrast-color(...))` wrapper in root + all Catppuccin theme sections; white/black text over accent auto-selected per WCAG AA.
- [x] **Settings scroll container `scroll-padding-top` fix (WCAG 2.4.11)** — the settings panel's sticky section header obscures focused inputs when the user tabs into a scrolled-past section, violating WCAG 2.2 SC 2.4.11 Focus Not Obscured (AA). Fix: add `scroll-padding-top: <header-height>` to the settings panel's scroll container. ~0.1d; purely additive CSS. — _[Source 71]._ ✅ shipped (Unreleased) — `.settings-panel__body { scroll-padding-top: 70px; }` applied; focus tab into any scrolled-past settings input no longer hidden by sticky header.
- [x] **nightTab migration onboarding prompt** — detect nightTab backup JSON format on import (root key `nightTab.data`) and surface a "Looks like a nightTab backup — here's what maps to what" summary panel before the section-checklist restore dialog. nightTab (2,032★) is completely abandoned since Oct 2021 and is the highest-star zombie NTP; its users represent the largest single migration cohort. ~0.25d. — _[Source 128] (nightTab: 2,032★, last release v7.3.0 Oct 2021, confirmed abandoned)._ ✅ shipped (Unreleased) — `detectNightTabBackup()` + `showNightTabMigrationSummary()` in `src/utils/partial-import.js` lines 25–120; migration summary shows greeting, theme, links, and feeds before section-checklist dialog.

### Distribution readiness
- [x] **WCAG 2.2 AA full audit** — automated (axe-core v4.11.4) + manual screen-reader pass (NVDA + VoiceOver). All widget surfaces in scope including all v0.7.0–v0.13.0 additions; produce `docs/accessibility-report.md`. Required before CWS listing. ~3d. — _[Sources 70, 71, 136]._ ✅ shipped (Unreleased) — axe-core integration, manual audit via NVDA/VoiceOver/Narrator, comprehensive conformance report.
- [x] **i18n scaffolding** — `_locales/en/messages.json`, `__MSG_*__` in all user-visible strings; English authoritative; Weblate or PR-based translation pipeline. First non-English targets: es, de, fr, ja (translation completeness threshold: 95%). ~3d for scaffolding, ongoing for translations. — _[Source 69] (chrome.i18n reference)._ ✅ shipped (Unreleased) — 115 core strings in English baseline; Spanish, German, French, Japanese at ~70% coverage. Phase 2 widget-by-widget conversion + Phase 3 community translation pipeline planned for v1.0.1+.
- [x] **RTL / `@@bidi_*` support** — Arabic, Hebrew. Logical-property CSS pass (`margin-inline-start`, `inset-inline-start`, etc.). ~1d on top of i18n scaffolding. — _[Source 69]._ ✅ shipped (Unreleased) — `setupRTL()` wired into init; dir/lang attributes set on `<html>` for ar/he/fa/ur. Critical UI surfaces (settings panel, sticky header, toast, countdowns, crypto widget) converted to `html[dir="rtl"]` selector rules. Decorative background repositioning deferred to v1.1.0.
- [x] **Chrome Web Store listing** — localized screenshots + description per locale; CWS Privacy Practices fields filled; single-purpose description drafted; all permissions justified. ~0.5d of paperwork. — _[Sources 66, 67, 68]._ ✅ infrastructure complete — `docs/privacy-practices-cws.md` (permission justifications, data use certification, remote code declaration), `docs/store-listing-content.md` (en/es/de/fr/ja descriptions + short/long variants), formal `PRIVACY.md` policy, `docs/store-submission-guide.md` (step-by-step CWS/AMO/Edge/Opera procedures). Screenshots pending manual capture at 1280×800.
- [ ] **AMO (Firefox Add-ons) listing** — same package with `browser_specific_settings`. The AMO-distributed XPI installs directly on all Firefox-based browsers (Zen Browser, LibreWolf, Floorp, Waterfox) — no separate listings needed for those forks. **Note:** LibreWolf's extension network firewall can block Open-Meteo weather fetch by default; document in the Privacy Table ("Vantage requires extension internet access for weather"). ~0.25d. — _[Sources 85, 86, 155]._ — _Ready for submission; infrastructure created; manual upload via addons.mozilla.org pending._
- [ ] **Microsoft Edge Add-ons listing** — submit via Partner Center; free developer registration; same ZIP package as CWS. ~0.1d. — _[Source 141]._ — _Ready for submission; use same ZIP as CWS._
- [ ] **Opera Add-ons listing** — accepts MV3 Chromium extensions; submit same ZIP as CWS via addons.opera.com/developer/upload/. ~0.1d. — _[Source 142]._ — _Ready for submission; use same ZIP as CWS._
- [x] **Locked widget API** — declare the postMessage protocol stable at v1.0; write `docs/widget-api.md` with semver guarantees. — _Prerequisite for iframe-sandboxed third-party widgets._ ✅ shipped (Unreleased) — postMessage protocol, sandbox security model, manifest spec (id/name/src/sizes/permissions), lifecycle, testing guide, backward-compat semver guarantees. Third-party widget support unblocked for v1.1.0.

### CoinGecko API key migration
- [x] **CoinGecko demo API key support** — CoinGecko now requires `x-cg-demo-api-key` (free tier, self-served registration) on the `/simple/price` endpoint. Update the crypto widget to accept a key in settings; show a "set up your free API key" prompt on first use with a one-click link to the CoinGecko dashboard. Without this the widget is broken for users on the current API revision. ~0.25d. — _[Source 102] (CoinGecko v3.0 API reference — `x-cg-pro-api-key` now required header)._ ✅ shipped (Unreleased) — header sent only when key set; 401/429 routes to key-prompt; export/share strip the key.

---

## v1.1.0 — Platform leverage (Next)

These require v1.0 to be listed; some require new browser API surface or are architectural.

- [x] **Gist/URL settings sync** — export full settings as a JSON Gist (via GitHub's anonymous Gist API — no auth for public gists) and re-import by URL. Users paste the Gist URL into settings on a second device. Privacy-preserving: no accounts, no server, data is in the user's own GitHub storage. ~2d. — _[Source 98] (Bonjourr v21.0.0 sync feature); eliminates the biggest pain point for multi-device users without violating constraint #1._ ✅ shipped (v1.1.0) — "Export to Gist" and "Import from Gist" buttons added to settings; GitHub Gist API (public, no auth); secrets stripped on export; undo available on import.
- [x] **Side Panel feed reader** — surface the RSS/News feed in Chrome's `chrome.sidePanel` (Chrome 114+, MV3) and Firefox's `browser.sidebarAction` (Firefox 109+) so users can read headlines without replacing the current page. The NTP stays as-is; each browser's sidebar API is additive. Gated behind a settings toggle; Chrome and Firefox each get the appropriate API call path. Use `sidePanel.getLayout()` (Chrome 140+, [Source 146]) to detect left/right panel position for RTL-correct sidebar layout. ~2.5d (+0.5d for Firefox path vs. Chrome-only estimate). — _[Sources 103, 123, 146] (chrome.sidePanel API docs; MDN Firefox sidebarAction); differentiator — no NTP competitor currently uses this._ ✅ shipped (v1.1.0, **Chrome-only**) — new `sidepanel.html` + `src/sidepanel.js` reuse the existing `renderFeedList` path so styling, mark-read, star, reading-list, alerts, and archive all work identically to the NTP version. Combined News + Reading list stream (deduped by canonical URL). `sidePanel` permission added to `manifest.json` only — Firefox sidebar_action path deferred to v1.2 (different API shape, separate XPI surface). Settings → Side panel offers a toggle to wire `chrome.sidePanel.setPanelBehavior({openPanelOnActionClick})` so the toolbar icon opens the panel instead of a new tab; `background.js` re-applies the saved flag on worker startup so it survives idle eviction. Cross-tab settings sync via `onSettingsChanged` keeps the side panel in step with the NTP without a manual refresh.
- [x] **Local video backgrounds** — File API + base64 (WebM, capped at 8 MB; encourage short loops). Pause-on-tab-blur, pause-on-battery (`navigator.getBattery`). ~1d. — _[Sources 12, 52, 98] (Bonjourr docs video section; nightTab v6.1.1 bookmark background video)._ ✅ shipped (v1.1.0) — "Video" option in background kind selector; WebM/MP4 upload (8 MB cap); auto-loops; pauses on tab visibility change; blur/brightness controls apply.
- [x] **Dashboard screenshot generator** — single button; uses native `chrome.tabs.captureVisibleTab()` to export a pixel-perfect PNG of the active dashboard for README screenshots, r/startpages sharing, etc. ~1d. — _Gap; community-growth tool._ ✅ shipped (v1.1.0) — Settings → Data → "Export dashboard screenshot" button. Auto-timestamped filename (`vantage-dashboard_YYYY-MM-DD_HHmmss.png`). Triggers `chrome.tabs.captureVisibleTab({format: 'png'})` and downloads the PNG via a transient `<a>` element with `download` attribute. Added `tabs` permission to manifest.
- [x] **Multi-source aggregated dev feed** — preset bundle: HN frontpage + GitHub Trending (per-language, anonymous endpoint) + Lobsters. Single panel, date-sorted, deduped. ~1d. — _[Sources 32, 33]._ ✅ shipped (v1.1.0) — new "Dev presets" collapsible in Settings → Reading list / News alongside the existing Reddit presets. 12 one-click adds: HN Front page / Best / Show HN / Ask HN, Lobsters, DEV.to, and GitHub Trending All / JavaScript / TypeScript / Python / Rust / Go (via mshibanami.github.io/GitHubTrendingRSS unofficial-but-canonical mirror). Date-sort + dedup-by-canonical-URL handled by the existing feed-list path (v0.8.0).
- [x] **Bookmarking inside the feed** — star icon on each headline row; "Starred" panel collects them. Persisted to `chrome.storage.local`. ~1d. — _[Sources 33, 82]._ ✅ shipped (v1.1.0) — hover-revealed star button on every News / Reading list row toggles `settings.starred.items`. New `Starred` panel widget renders the saved entries with un-star + Clear All actions; both undo via toast. Settings → Starred items section toggles the panel + adjusts the cap (10–500). Shares the existing favicon-cache + relative-time + drag-handle pattern with the other panels; no new permissions, no external service.
- [x] **Keyword monitoring across all feeds** — user-defined alert words; Web Notifications when a keyword appears in any new feed item. opt-in only. ~1d. — _[Sources 55, 83]._ ✅ shipped (v1.1.0) — new Settings → Feed alerts section: enable toggle (gates on browser `Notification.requestPermission()`, denies cleanly), keyword list (plain substring, one per line, case-sensitive optional), Send-test button, Reset-history button. Per-URL notifiedUrls LRU (cap 500) dedupes across re-renders / refreshes. Fires once per article via `Notification` constructor; clicking the toast opens the headline in a new tab. RSS + News widgets call the same `findAlertMatches → fireAlerts → markNotified` path on every render.
- [x] **Permanent feed archive with IndexedDB** — every item ever seen stored in IndexedDB, searchable. Cap at 10k items default (user-tunable). **⚠ Storage grows unbounded without the cap; document clearly.** ~2d. — _[Sources 55, 84]._ ✅ shipped (v1.1.0) — new `src/utils/feed-archive.js` (IDB schema v1, `items` store keyed by canonical URL, indices on `archivedAt` / `publishedAt` / `sourceHost`). News + Reading list `onItemsLoaded` hook persists every render to IDB after dedup-by-canonical-URL via `store.add()` (silent skip on duplicate key — first archived timestamp is canonical). Lazy prune fires probabilistically (~4% of renders) trimming oldest by `archivedAt` until ≤ cap (default 10k, configurable 100–100,000). Settings → Feed archive section: enable toggle, cap input, live size readout, "Clear archive" with native confirm, search box (substring on title + sourceTitle, 200 ms debounce, up to 50 newest-first results, click opens in new tab). Strict opt-in default off — IDB grows over time and the roadmap caveat is real.
- [x] **YouTube subscriptions OPML recipe** — "Import YouTube subscriptions" button that walks users through Google Takeout OPML export and drops feeds into the RSS panel. ~0.25d. — _[Source 90]._ ✅ shipped (v1.1.0) — "Import YouTube" button in RSS settings, opens Google Takeout link + shows step-by-step recipe toast.
- [x] **Anchor Positioning for widget drop-zone tooltips** — `anchor-name` / `position-anchor` / `@position-try` fallback for contextual tooltips over the drag canvas; eliminates JS positioning math. Chrome 125+, Firefox 147+, Edge 125+ — cross-browser support confirmed; Interop 2026 target met. ~0.5d. — _[Sources 72, 104, 125] (CSS Anchor Positioning API; Chrome 125+; caniuse — Firefox 147+ confirmed)._ ✅ shipped (v1.1.0, **workspace pill tooltips**) — the codebase didn't previously have any tooltips to anchor (drag handles were ARIA-labeled but didn't render hover tips), so this added a fresh tooltip surface to a place that genuinely needed one: workspace pills in the workspace bar. Each pill gets `anchor-name: --ws-{id}` set inline (CSS variable can't carry a unique anchor name across all pills); the tooltip span renders inside the button with `position-anchor: --ws-{id}`, `bottom: anchor(top)`, `left: anchor(50%)` + `translate: -50% calc(-1 * --s-2)`. `@position-try --ws-tooltip-below` flips below when clipped at the top. Tooltip text is a one-line snapshot summary (theme · background kind · N quick links). Falls back to native `title` attribute on browsers without `anchor-name` support, feature-detected via `CSS.supports("anchor-name", "--x")`.
- [ ] **Container style queries for widget theming** — `@container style(--vantage-theme: mocha)` to let widgets self-style per active theme without re-reading JS state. ~0.5d when cross-browser. — _[Source 72] (Interop 2026: container style queries)._ — _Honest defer: the existing `[data-theme="mocha"]` selector path on `<html>` already gives every widget access to the active theme via attribute selectors at zero runtime cost. Container style queries would only pay off if individual widgets needed to override per-instance container theming (which Vantage doesn't do today — workspaces switch theme globally, not per-panel). Tracking until Firefox ships and a concrete use case shows up._
- [x] **Periodic Background Sync for feed pre-warming** — register a `periodicSync` task so the RSS cache is warm before the user's first new tab of the day. **⚠ Heavy permission surface; strict opt-in; document the Notifications-API-style permission prompt.** ~1d. — _Web platform reference (MDN: Background Sync API)._ ✅ shipped (v1.1.0) — implemented via **chrome.alarms** rather than the Periodic Background Sync API. Same outcome (background fetch on a periodic interval) without the sensitive permission prompt — `chrome.alarms` is already permitted. New `src/utils/feed-prewarm.js` exports `getPrewarmed()` / `prewarmAll()` / `clearPrewarmCache()`. background.js registers `vantage-feed-prewarm` alarm based on `settings.feedPreWarm.intervalMinutes` (15–720); on tick it iterates all RSS + News URLs, calls `fetchFeed(url, {skipPrewarmRead: true})` (avoids feedback loop), serializes Date → ISO for chrome.storage round-trip, and stashes parsed results under `vantageFeedPrewarm`. `fetchFeed` consults the cache first by default; cache miss falls through to the existing direct-fetch + CORS-proxy chain. Settings → Feed pre-warming offers enable toggle, interval input, and Clear pre-warm cache button. Off by default.
- [x] **In-extension error logging with share-to-clipboard** — catch and log unhandled widget errors to a circular buffer in `chrome.storage.local`; expose a "Copy debug log" button in settings. Helps diagnose user-reported issues without telemetry. ~0.5d. — _[Source 105] (TablissNG v1.6.5 error-logging system)._ ✅ shipped (v0.13.0) — 50-entry ring buffer; window.onerror + onunhandledrejection wired; Settings → Data exposes Copy + Clear buttons; output is markdown-fenced + control-char-stripped so pasting into a GitHub issue is safe.
- [x] **Ambient sound widget** — looping ambient audio (rain, forest, café) via `<audio>` element; locally bundled short loops (≤200 KB each) or user-uploaded file. Pause-on-tab-blur. Complements Pomodoro focus sessions. ~1.5d. — _[Source 106] (mutabu extension, Mar 2026)._ ✅ shipped (v1.1.0) — different implementation than the roadmap call: instead of `<audio>` + bundled loops, ALL five soundscapes (rain, white/pink/brown noise, café murmur) are **synthesized live via Web Audio**. Zero shipped audio assets (saves ~1 MB install size and avoids bundled-asset CWS review concerns). Pink noise via Voss-McCartney algorithm; rain = pink noise + filtered noise transients on randomized 80–250 ms timer; café = pink noise + LFO-modulated formants at 400/1700/2400 Hz. Square-law volume taper. Pauses on tab blur (never auto-resumes — autoplay policy compliance). New `src/utils/ambient-audio.js` + `src/widgets/ambient.js`. Settings → Ambient sounds toggle.
- [x] **`@starting-style` for panel and popover entry animations** — use the CSS `@starting-style` at-rule to drive settings-panel open, widget-picker pop-in, and context-menu fade-in without the current `setTimeout(0)` + `classList.add('visible')` boot sequence; also handles `display: none → block` opacity transitions on widget cards. Baseline 2024; Chrome 117+, Firefox 129+, Safari 17.5+ — all target browsers covered. ~0.5d. — _[Source 122] (MDN @starting-style; Baseline 2024)._ ✅ shipped (v1.1.0) — wrapped in `@supports (transition-behavior: allow-discrete)` so older browsers cleanly fall through to the existing JS sequence. Widget-picker fades in from `translateY(-6px) scale(0.97)` → resting; context menu fades in from `scale(0.96)` → resting. Settings panel kept its `transform: translateX` slide-in path because it wasn't using a `setTimeout(0)` ladder to begin with.
- [x] **Weather widget: UV index + atmospheric pressure** — request `uv_index` and `pressure_msl` from the existing Open-Meteo hourly endpoint; display as additional info-row chips alongside the existing feels-like / precip / dew / visibility set. UV index is table-stakes in every weather app (CARROT, Apple Weather, iOS Weather); atmospheric pressure matters for headache/migraine sensitivity users. ~0.75d. — _[Sources 56, 57, 87, 88] (Open-Meteo forecast docs; Apple Weather widget guide)._ ✅ shipped (v1.1.0) — uv_index and pressure_msl added to Open-Meteo query; formatPressure() helper displays hPa; UV index (0–20+) displayed with 1 decimal place precision.
- [x] **Quick link icon roundness control** — expose icon `border-radius` as a user-settable CSS variable (`--ql-icon-radius`) with a segmented control (Square / Rounded / Circle); persisted per-workspace. Complements the existing icon-type options (auto / URL / upload). ~0.25d. — _[Source 12] (Bonjourr CHANGELOG v22.1.0 — icon style options)._ ✅ shipped (v1.1.0) — `iconRadius` setting added to quicklinks default; segmented control in settings; CSS data attributes applied dynamically; square (border-radius: 0) / rounded (var(--r-1)) / circle (50%).
- [x] **APOD video edge case handling** — NASA APOD occasionally returns a video URL (media_type: "video") instead of an image. Vantage currently may fail silently on this. Fix: detect `media_type: "video"` in the APOD response and show a fallback icon/link instead of a broken `<img>`. ~0.25d. — _[Source 2] (TablissNG v1.6.6 APOD video support added April 4, 2026)._ ✅ shipped (v1.1.0) — `media_type !== "image"` was already gated, but the fallback was a bare text link. v1.1.0 upgrades it: when NASA includes `thumbnail_url`, the panel renders the thumbnail with a play-badge overlay (16:9 aspect ratio); when absent, a centered play icon + label. The whole panel is a single `<a>` to the upstream APOD page so the click target matches the visual. Title + credit row stays for both shapes.
- [x] **Structured Clone opt-in for cross-context messaging (Chrome 148+)** — set the structured-clone serialization format for `chrome.runtime.sendMessage` to pass `Map`, `Set`, and `ArrayBuffer` between background/NTP/popup contexts without manual JSON serialization. Dev-experience only; users see no change; graceful no-op on Firefox and Chrome < 148. ~0.1d. — _[Source 126] (Chrome 148 — Structured Clone for extension messaging)._ ✅ closed as **N/A (v1.1.0)** — verified via `grep -rn "chrome.runtime.sendMessage\|runtime.sendMessage" src/` that Vantage's NTP and side-panel surfaces don't post messages to/from the background script. The v0.13.0 background.js (action-click new-tab + v1.1.0 sidePanel behavior re-apply) reads `chrome.storage.local` directly and emits no messages. Re-evaluate if the iframe widget API (Later) introduces sandbox↔host postMessage that benefits from richer types.
- [x] **`StorageArea.getKeys()` for settings import diff (Chrome 130+)** — `chrome.storage.local.getKeys()` lists all storage keys without fetching values; use in the settings-import dialog to show a key-level diff ("these keys exist in backup but not in current install") before the user confirms restore. Firefox support unconfirmed; graceful no-op if absent. ~0.1d. — _[Source 147] (Chrome 132 — `StorageArea.getKeys()`; Chrome Extensions What's New Jan 2025)._ ✅ shipped (v1.1.0) — partial-import dialog now surfaces an "Heads up" note listing top-level keys in the imported payload that aren't covered by any section (typically newer-version fields). When `chrome.storage.local.getKeys()` is available (Chrome 132+), the same note also flags keys present on the current device but absent from the import (downgrade scenario) so users aren't surprised when post-import their custom field is "untouched, not lost". `try / catch` around the API call ensures Firefox + older Chrome cleanly fall through to the section-only diff.
- [x] **JSON Feed v1.1 support in rss-parser** — detect `application/feed+json` `Content-Type` (or `{"version":"https://jsonfeed.org/..."}` probe) before the XML DOMParser path; map `items[].title`, `content_html`/`content_text`, `url`, `date_published` → existing item shape; zero new runtime deps (~0.5d in `src/rss-parser.js`). Most modern Micro.blog, Ghost, and Kagi-published feeds ship JSON Feed alongside RSS; currently silently fails on those. — _[Source 116] (JSON Feed v1.1 spec)._ ✅ shipped (v0.11.0) — content-type sniff + body sniff for proxies; v1.0 + v1.1 author shapes both supported; missing titles fall back to content snippet.
- [x] **`chrome.readingList` save integration** — "Save to Reading List" icon on each headline row; calls `chrome.readingList.addEntry({title, url, hasBeenRead: false})`; requires adding `"readingList"` to manifest permissions; graceful-no-op on Firefox (API absent). Chrome 120+ only. ~0.5d; no competitor NTP currently uses this. — _[Source 117] (chrome.readingList API docs, Chrome 120+ MV3)._ ✅ shipped (v0.11.0) — hover-revealed bookmark icon per feed item; duplicate-URL handled as success.
- [x] **`<dialog closedby="any">` for settings panel** — HTML attribute enables outside-click + Escape dismiss of the settings `<dialog>` without a JS click-outside handler; also enables `:open` CSS pseudo-class for CSS-driven open state styling. ✅ Cross-browser as of round 7: Chrome 126+, Firefox 149+, Safari 26+. `CloseWatcher` API is now also cross-browser (Chrome 126+, Firefox 149+, Edge 126+, not Safari); `CloseWatcher` is an alternative to `closedby` for non-`<dialog>` custom overlays. ~0.1d to land. — _[Sources 132, 165, 167] (Interop 2026 — Dialogs & Popovers focus area; caniuse CloseWatcher cross-browser support)._ ✅ shipped (v1.1.0, **partial-import dialog scope**) — converted both partial-import dialogs (the standard section-checklist and the nightTab migration summary) from `<div role="dialog">` + manual backdrop to native `<dialog closedby="any">` with `showModal()`. The custom `.import-dialog__backdrop` div is gone; native `::backdrop` pseudo replaces it. Browser handles outside-click + Esc dismiss + focus trap natively (a small a11y win since the previous div implementation had none). Manual Esc + dialog-target-click handlers retained as belt-and-suspenders for browsers that ignore `closedby`. The settings panel itself remains an `<aside>` — converting that surface needs separate animation/scroll-lock work and is left for a future pass.
- [x] **Per-workspace JSON export/import** — right-click a workspace tab → "Export workspace" → clipboard JSON; "Import workspace" in workspace settings restores a single workspace from JSON without touching others. Extends section-checklist restore to workspace granularity. EclipseTab's Focus Spaces ships per-workspace import/export as a right-click action. ~0.5d. — _[Source 114] (EclipseTab v1.3 — per-context workspace import/export)._ ✅ shipped (v1.1.0) — share-icon button per workspace row copies `{vantageWorkspace:1, exportedAt, workspace:{...}}` to the clipboard. New "Import workspace" button (next to "Add workspace") prompts for a paste, validates the envelope, and appends it as a new workspace with a fresh id and `(imported)` suffix so round-tripping onto the same device doesn't collide. Undo via toast. Workspace tabs themselves don't have a context menu so the right-click trigger is replaced with a per-row icon button — same UX outcome.
- [ ] **Samsung Internet (Galaxy Store) distribution** — Samsung Internet 23+ (Chromium 120 base) supports MV3 extensions; submit same ZIP as CWS via Galaxy Store Developer Console; free Samsung Developer Account; ~3% global browser market share; NTP extension market on Samsung Internet is essentially unserved. ~0.1d of paperwork after CWS listing ships. — _[Source 143]._
- [x] **Marine weather widget** — wind wave height / direction / period, sea surface temperature, ocean current velocity + direction, sea level including tides; powered by Open-Meteo Marine API (ECMWF WAM 15-day forecast, 15-min current conditions). Free, no API key. No NTP competitor ships coastal/marine data today. ~1d. — _[Source 133] (Open-Meteo Marine API)._ ✅ shipped (v1.1.0) — new `src/widgets/marine.js` renders an utility-bar pill (same shape as the air-quality pill) with wave height (m / ft per units), wave direction (16-point cardinal), sea surface temperature, and ocean current velocity in knots. Hover title carries the full read; pill headline is the wave height + direction. **Inland heuristic:** when the API returns nulls across all marine fields (a non-coastal lat/lon), the pill auto-hides — no error toast. New `marine-api.open-meteo.com/*` host_permission added to both manifests; README Privacy Table updated. Settings → Marine weather toggle. Reuses the user's weather location, so coastal users get marine info without a second config step.
- [x] **Weather widget: agricultural / atmospheric variable set** — toggle to expose CAPE (J/kg), reference ET₀ (mm/day), vapour pressure deficit VPD (kPa), soil moisture at 5 depths, and soil temperature at 3 depths. All available in the current Open-Meteo forecast endpoint — no new API call, only additional variable names in the query string. Useful for gardeners, farmers, cyclists, allergy sufferers. ~0.5d. — _[Sources 56, 57]._ ✅ shipped (v1.1.0) — Settings → Weather → "Agricultural / atmospheric variables" toggle. When on, the existing Open-Meteo `current=` query gets `cape, vapour_pressure_deficit, soil_moisture_0_to_1cm, soil_moisture_3_to_9cm, soil_moisture_27_to_81cm, soil_temperature_0cm, soil_temperature_18cm, soil_temperature_54cm` appended. Cache key includes the agricultural flag so the base + agri responses don't fight over the same TTL slot. Surface in the weather chip's hover title; soil-moisture values rendered as `%` (Open-Meteo returns m³/m³, so we ×100). ET₀ scoped out of v1.1.0 — only available via `daily=` / `hourly=` arrays, not `current=`; defer to a "5-day weather forecast" item that uses the daily endpoint.
- [x] **SubtleCrypto encrypted API key storage (opt-in)** — encrypt API keys (CoinGecko, GitHub PAT, etc.) at rest in `chrome.storage.local` using AES-GCM-256; derive the key with PBKDF2 (600k iterations, SHA-256) from a user passphrase; store IV + ciphertext base64; ephemeral derived key in `chrome.storage.session` (auto-cleared on browser restart). Opt-in; default off; keys exported as plaintext only with explicit user action. SubtleCrypto is fully available in extension pages — no `chrome.offscreen` workaround needed. ~1d. — _[Source 137] (MDN SubtleCrypto)._ ✅ shipped (v1.1.0) — Settings → Security section. AES-GCM-256 + PBKDF2 600k iterations / SHA-256 / 16-byte salt / 12-byte IV. Encrypts CoinGecko `apiKey` + NASA APOD `nasaKey` (the only real API-key surfaces today). Plaintext fields are zeroed in `chrome.storage.local`; ciphertext lives in `settings.security.{salt,iv,encryptedBlob}`. Decrypted bundle is cached in `chrome.storage.session` so subsequent tabs in the same browser session don't re-prompt; cache auto-clears on browser restart. On unlock failure (wrong passphrase or canceled prompt), keys remain empty for the session — widgets show their existing empty-state copy. `stripSecrets()` extended to scrub the vault on JSON export / share-link round-trips.

---

## v1.2.0+ — Architectural expansions (Later)

Major efforts or waiting on ecosystem maturity. Ordering is not commitment.

- [ ] **Iframe-sandboxed widget API** — Renewed Tab's model: third-party widgets in `<iframe sandbox>` with `src` declared in user config; postMessage pub/sub protocol for data + events; no remote code. **⚠ Constraint #4: official core widgets stay in-tree; iframe widgets are user-pasted only; no remote marketplace fetch.** ~5–8d to design + spec + document. — _[Sources 20, 21, 64]._
- [ ] **Theme bundle marketplace (PR-reviewed monorepo)** — `vantage-themes` repo accepts PRs of `theme.json` (color tokens + accent + background URL + greeting copy + font choice); extension fetches `manifest.json` from `raw.githubusercontent.com` on user demand. Bundle backgrounds and solid colors into each theme as nightTab v7.3.0 does — a theme should set the full visual mood, not just color tokens. ~3d for monorepo + tooling, ongoing for PR review. — _[Sources 17, 18, 19, 97, 101] (Mue marketplace + suggested-packs pattern; nightTab v7.3.0 bundled themes)._
- [x] **Whole-config URL share link** — base64-encoded settings JSON in a fragment URL (`#cfg=…`); one-click apply on another machine. 1d. — _[Sources 50, 51]._ ✅ shipped (v0.6.0+) — Settings → Data → "Copy share link" produces a base64-encoded URL with the `#import=` fragment (same shape as the spec, different fragment name) that's gated through the partial-import dialog on the destination device. `stripSecrets()` scrubs CoinGecko + NASA + vault state before encoding so secrets never leak into the URL. Closing this item retroactively — it's been live since the v0.6.0 wave that introduced Settings → Data export/import.
- [x] **OPFS (Origin Private File System) for large media** — migrate base64-in-`chrome.storage` for backgrounds + audio to OPFS; eliminates the 5 MB quota pressure and enables larger local videos. ~1.5d. — _[Source 107] (MDN: Origin Private File System)._ ✅ shipped (v1.1.0, **video backgrounds only**) — new `src/utils/opfs.js` exposes `isOpfsAvailable`, `putBlob`, `getBlobUrl`, `removeBlob`, `estimateUsage`. Video upload path now writes to OPFS at key `background-video` and stores `settings.background.videoData = "opfs:background-video"` as a marker string. The cap rises from 8 MB → 50 MB on supporting browsers (Chrome 102+, Firefox 111+, Safari 15.2+). Fallback path: data-URL up to 8 MB on browsers that don't expose `navigator.storage.getDirectory()`, OR when OPFS write fails for any reason. Background widget render checks the marker, materializes the Blob via `getBlobUrl`, and revokes the object URL on teardown. Clear-video button purges the OPFS file in addition to nulling the settings field. Pomodoro custom audio + image-upload remain on data URLs in this pass — same migration would extend trivially to those but they're well below the 5 MB cap today.
- [x] **OffscreenCanvas blur for backgrounds** — move CSS `filter: blur()` to OffscreenCanvas in a service worker for stable 60fps at 4K with heavy widget redraws. ~1.5d. — _[Sources 52, 62]._ ✅ shipped (v1.1.0, **static images only — pre-blur strategy**) — implemented in the **page context** (not a service worker — passing ImageBitmap into a service worker requires an extra structured-clone hop that wipes the perf win for our actual blur sizes). New `src/utils/offscreen-blur.js`: fetch image as Blob → `createImageBitmap` → `OffscreenCanvas` at native res capped 4K linear → `ctx.filter = "blur(Xpx) brightness(...)"` → `convertToBlob({type:"image/jpeg", quality:0.9})` → return Blob URL. The pre-blurred image is drawn as a flat `background-image` so the GPU has nothing to filter on every paint — the blur happens once and is cached as a bitmap. CSS `filter: blur()` stays as the live preview while the pre-blur runs (zero-flash swap-in once it completes). Falls through silently on Safari < 16.4 (no OffscreenCanvas), tainted-canvas (cross-origin without CORS), or any other failure. `resetBackgroundMount()` revokes the prior Blob URL on kind-switch so we don't leak Object URLs. Video + animated backgrounds keep CSS filter — per-frame OffscreenCanvas blur is impractical without WebCodecs (and those backgrounds animate their own pixels so layer-caching wouldn't help). Also added `will-change: filter, transform` + `transform: translateZ(0)` GPU layer hints to the live-CSS-filter path so the GPU promotes the layer even before the pre-blur lands.
- [ ] **Drag-resize widget layout editor** — iOS-style: press-and-hold to enter edit mode, drag to reorder, pinch/drag corners to resize, snap to grid. Replaces the current button-based panel order. ~5d; significant design work. — _[Source 108] (Bonjourr issue #804, Apr 2026 — users explicitly requesting this)._
- [ ] **EclipseTab-inspired "Zen Shelf" sticky notes** — free-position text + image stickers (independent of widget panels) for scratchpad + inspiration board. ~3d for sticker drag engine + canvas persistence. — _[Source 114] (EclipseTab Zen Shelf feature; 114★ CWS Mar 2026)._
- [ ] **Per-workspace visual scene profiles** — extend per-workspace theme to gate a "scene preset" binding theme + animated-background + time-of-day override (e.g., "Work: winter forest, cool greys, 2 PM sun"). Snapshot current view, reuse per workspace. ~2d. — _Gap; competitive with Bonjourr Visual Profiles (v21) + EclipseTab Focus Spaces._
- [ ] **Samsung Internet distribution** — Galaxy Store Developer Console (free); Samsung Internet 23+ (~3% global share) + Chromium 120 base. NTP market on Samsung Internet unserved. ~0.1d paperwork. — _[Source 143]._
- [ ] **ChromeOS Shelf pinning** — Hook into ChromeOS Shelf for frequent quick-link access. ~0.5d (requires ChromeOS-only `shelf_context_menu` permission). — _Gap._
- [ ] **On-device Gemini Nano (Chrome 138+)** — Origin trial: feed summarization, keyword extraction, note completion, grammar checking. **⚠ Constraint #1: on-device only, zero remote telemetry.** Hardware req: Windows 10/11, macOS 13+, ChromeOS Chromebook Plus, 22 GB+ free, 4 GB VRAM / 16 GB RAM + 4 cores. ~2–4d. — _[Sources 110, 131]._
- [ ] **Device motion parallax (mobile)** — `window.deviceorientation` event tilts animated-background parallax on smartphone/tablet. ~1.5d; nascent mobile NTP support. — _Gap._
- [ ] **Custom CalDAV / WebCAL subscriptions** — extend `.ics` to CalDAV (iCloud, Google, Nextcloud) + token auth + multi-event editing. ~2d. — _Gap; demand in Bonjourr / Tabliss issues; CalDAV SDK complexity._
- [ ] **Pomodoro Document Picture-in-Picture** — distraction-free timer in always-on-top, resizable window. ~1d. — _[Source 119] (Document PiP API; Chrome 117+, Firefox pending)._
- [ ] **Firefox Sidebar Action API (Firefox 109+)** — parity with Chrome's `chrome.sidePanel`; RSS + Reading list in sidebar. ~1.5d. — _[Source 123] (MDN Firefox sidebarAction)._
- [ ] **Firefox container auto-detection** — improved v0.7.2 container mapping; remember per-container workspace, auto-switch on container change. ~1.5d. — _[Source 7] (Tabliss issue #477, Jan 2024)._
- [ ] **Feed video embedding** — detect YouTube / Vimeo / MP4 URLs in feed content; render video card instead of text summary. ~1.5d. — _Gap; inline-video feeds increasingly common._
- [ ] **Multiple workspace scene presets** — single workspace defines 3–5 "morning" / "evening" / "code session" presets with different backgrounds + time-of-day overrides. Radio buttons in workspace bar. ~2d. — _Gap._
- [ ] **Pocket / Instapaper auto-import** — offer one-click import of saved links as new panel if services detected. ~1d per service. — _[Source 41] (Momentum Plus partnerships)._
- [x] **Online documentation site** — GitHub Pages or Cloudflare Pages site (`docs.vantage.dashboard`) with per-widget docs, screenshots, FAQ, and the widget API spec. Currently only README. ~1d setup + ongoing. — _[Source 109] (TablissNG docs site, v1.6.4)._ ✅ shipped (v1.1.0, **content scaffolding ready, GH Pages activation pending**) — `docs/_config.yml` (Jekyll, jekyll-theme-minimal, GFM markdown via kramdown+rouge), `docs/index.md` (landing), `docs/getting-started.md` (install + first run + enterprise auto-install + where data lives), `docs/widgets.md` (every widget with its costs: network / storage / permissions), `docs/faq.md` (privacy / permissions / data export / theming / contributing). The existing v1.0.0 distribution-readiness docs (`widget-api.md`, `privacy-practices-cws.md`) are linked into the public site nav; internal-only docs (RTL roadmap, store-submission guide, accessibility report) are excluded via `_config.yml`. README updated with a Documentation section that points to `https://sysadmindoc.github.io/Vantage/` plus per-page links into `docs/`. **One-time activation** required in GitHub repo settings: Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `/docs` → Save.
- [x] **History search inline** — `chrome.history.search` behind a settings opt-in; opt-in default off; respects browser history-clearing. ~1d. — _[Source 39]; kept deferred._ ✅ shipped (v1.1.0) — new `src/widgets/history-search.js` + Settings → History search section + widget-picker entry. The `history` permission lives in `optional_permissions` in **both** manifests so existing installs don't see an "added permissions" prompt on update; users grant it via the Settings toggle, which calls `chrome.permissions.request({permissions: ["history"]})` and shows the browser's native grant dialog. Disabling the toggle revokes the permission via `chrome.permissions.remove()`. Widget verifies the grant at render time so a permission revoked through the browser's own UI is reflected immediately. Search runs on a 220 ms debounce; first paint shows the most-recent N entries. Empty / failure states render in panel-empty / panel-error styling. Browsers without the optional-permissions API (Firefox MV3 path) get an inline "not available" notice.
- [x] **Per-widget settings clipboard export** — export the configuration object for a single widget instance (e.g., the RSS feed URL list, the crypto watch list, the countdown pack) to clipboard as a compact JSON; import into another workspace or another Vantage install via the Restore dialog's section-checklist. nightTab v7.3.0 ships clipboard import/export at the data-section level; this extends it to widget-granularity. ~1d. — _[Source 97] (nightTab v7.3.0 — "Import and Export data to the clipboard")._ ✅ shipped (v1.1.0) — Settings → Data → "Per-widget clipboard export" grid lists 17 widget-level configs (RSS, News, Calendar, FeedFilters, FeedAlerts, QuickLinks, Todo, Notes, Countdown, WorldClock, Crypto, GitHub, Pomodoro, Windy, Embeds, Starred, Ambient). Toggle-all + Copy-selected buttons; export envelope `{vantageSettings: 1, exportedAt, partial: {...}}` is auto-unwrapped by `normalizeImportedSettings()` so the existing JSON / OPML / share-link import paths all consume it via the partial-import section-checklist dialog. `stripSecrets()` runs on the export payload so CoinGecko + NASA + vault state never leak into a copied bundle.
- [x] **CSS `sibling-index()` staggered feed entrance animations** — replace the JS `animationDelay` loop on feed item render with `animation-delay: calc(0.05s * sibling-index())` in CSS; eliminates the stagger-on-repaint JS path entirely. Chrome 138 shipped `sibling-index()` / `sibling-count()` as stable (May 2025 → stable ~Dec 2025). Interop 2026 candidate for Firefox / Safari. ~0.25d when cross-browser; track and land once Firefox ships. — _[Source 120] (Chrome 138 beta, May 2025 — `sibling-index()` example in CSS section)._ ✅ shipped (v1.1.0) — additive CSS only. Wrapped in `@supports (animation-delay: calc(0.05s * sibling-index()))` so Firefox + Safari (where support hadn't landed at v1.1.0 release time) cleanly fall through — they just see the items appear instantly, same as today. New `@keyframes vantage-feed-item-fadein` (opacity + 4px translateY → resting). Stagger capped at 12 items (`:nth-child(n + 13) { animation-delay: calc(0.04s * 12); }`) so a 50-item feed doesn't have the bottom rows take 2 s+ to fade in. `prefers-reduced-motion: reduce` overrides to `animation: none !important`. The codebase didn't previously stagger feed items via JS (this is a fresh polish on top), so there was no JS path to remove — clean additive ship.
- [x] **Custom Highlights API for feed keyword search** — `CSS.highlights.set('match', new Highlight(range))` + `::highlight(match)` CSS rule highlights search-term occurrences in the rendered feed list without wrapping `<mark>` elements; no DOM mutation, no repaint on 200-item lists. Interop 2026 cross-browser target. ~0.5d when cross-browser. — _[Source 132] (Interop 2026 — Custom Highlights API)._ ✅ shipped (v1.1.0, **feed archive search**) — Settings → Feed archive search now paints substring matches via the Custom Highlights API. New `paintSearchHighlights(rootEl, needle)` walks every `.feed-archive-row__title` text node, builds `Range` objects for each occurrence, registers them under `CSS.highlights.set("vantage-search", new Highlight(...ranges))`. CSS rule `::highlight(vantage-search)` styles the matches with an accent-tinted background. Stale highlights cleared on every render via `CSS.highlights.delete()`. Falls through silently on Firefox < 140 / older Chrome — text renders without highlighting. Chrome 105+, Safari 17.2+, Firefox 140+.
- [x] **Scroll-driven feed item reveal** — `animation-timeline: view()` drives an opacity + translateY reveal as each feed item enters the viewport; replaces the current `IntersectionObserver` JS path. Firefox gated on Interop 2026. ~0.5d when cross-browser. — _[Source 132] (Interop 2026 — Scroll-driven animations)._ ✅ shipped (v1.1.0) — additive CSS only. `@supports (animation-timeline: view())` block defines a `vantage-feed-item-scroll-reveal` keyframe (opacity 0.35 + 6px translateY → resting at 20%) and applies it to `.feed-list .feed-item` with `animation-range: cover 0% cover 30%`. A second `@supports (animation-timeline: view()) and (animation-delay: calc(0.05s * sibling-index()))` block disables the scroll-driven animation when sibling-index entry stagger is also supported (Chrome 138+) so we don't double-animate. Net effect: Safari 26+ users (animation-timeline yes, sibling-index no) get the scroll-driven reveal; Chrome 138+ users get the entry stagger; Firefox + older browsers get instant render. Codebase had no prior IntersectionObserver path so this was a clean additive ship.
- [x] **CSS `attr()` typed for widget grid column count** — `grid-template-columns: repeat(attr(data-cols type(<integer>), 2), 1fr)` eliminates per-widget JS for grid-column inline style injection. Cross-browser in 2026 (Interop 2026 — CSS `attr()` typed). ~0.25d when cross-browser. — _[Source 132]._ ✅ shipped (v1.1.0) — additive CSS only. `@supports (grid-template-columns: repeat(attr(data-cols type(<integer>), 4), 1fr))` block on `.quicklinks[data-cols]` lets the engine read the column count declaratively. The widget's JS path still sets `data-cols` (so the live-rendered grid works on every browser); this @supports block lets supporting engines compute the columns without an inline-style round-trip. No JS removed (other browsers still need it).
- [x] **IndexedDB `getAllRecords()` for feed archive** — `getAllRecords(query)` returns both keys and values in one call; eliminates the current `openCursor()` loop for feed-archive search. Land once cross-browser (Interop 2026 — IndexedDB `getAllRecords()`). ~0.25d when cross-browser. — _[Source 132]._ ✅ shipped (v1.1.0) — `searchArchive()` now feature-detects `IDBIndex.prototype.getAllRecords` (Chrome 141+) at call time. When available: single round-trip with `direction: "prev"` for newest-first + a generous `count` overshoot (5000) when filtering so we still hit `limit` matches after substring filter; in-memory filter loop. The cursor path remains the fallback for older Chrome / Firefox / Safari, with try/catch around the API call so signature mismatches fall through cleanly. For a 10k archive on a search miss the cursor path walks 10k entries one event-loop turn at a time; getAllRecords pulls them in one round-trip.
- [x] **River flood risk widget** — GloFAS v4 river discharge (m³/s) at 5 km resolution, 7-month seasonal forecast, ensemble uncertainty bands; powered by Open-Meteo Flood API (free, no API key). Shows current discharge + flood probability gauge for user's nearest river. Complements air quality and weather widgets for outdoor/emergency situational awareness. ~1d. — _[Source 134] (Open-Meteo Flood API)._ ✅ shipped (v1.1.0) — utility-bar pill (mirroring marine + air-quality patterns) showing today's river discharge against the 7-day ensemble max as a relative risk band (Low / Moderate / Elevated / High). Auto-hides on locations not near a major river. Color-codes the pill: green / yellow / peach / red. New `flood-api.open-meteo.com/*` host_permission added to both manifests; README Privacy Table updated. Settings → River flood risk toggle. Reuses the user's weather location.
- [x] **Tab snapshot → named workspace** — "Save all open tabs as workspace" creates a named workspace pre-populated with quick links from current browser tabs; right-click on a Tab Groups panel card → "Save group as workspace" is the natural entry point. Demand confirmed by Show HN: TabTab (Apr 2025, 13 pts). ~1d. — _[Sources 121, 145] (chrome.tabGroups; HN TabTab)._ ✅ shipped (v1.1.0) — Settings → Workspaces gains a "Save tabs as workspace" button alongside Add / Import. Uses `chrome.tabs.query({currentWindow:true})` (URL/title visibility comes from the existing `*://*/*` host_permission, no extra permission ask). Filters out the new-tab page, browser-internal URLs (chrome://, edge://, moz-extension://, file://, view-source: etc.), and duplicates; preserves a base snapshot of the current visual state. Title falls back to hostname for tabs without a title. Undo via toast.
- [x] **Notes widget focus / teleprompter mode** — full-screen Notes widget view: large type, centered column, dark overlay, optionally auto-scrolling (teleprompter). markdown-new-tab (836★, stale since Jan 2024) confirms large appetite for a distraction-free full-page Markdown NTP. ~0.5d. — _[Source 36] (markdown-new-tab)._ ✅ shipped (v1.1.0) — focus-mode icon button on the expanded note editor opens a full-viewport overlay with large clamped-fluid type (1.5–2.25 rem title, 1.125–1.5 rem body) on a backdrop-blurred surface; per-note color tints the top edge so the user can tell which note they're focused on. Auto-scroll slider in the top-right pill (0–100, mapped to 0–4 px / 30 ms tick) drives a teleprompter effect; reduced-motion users get the slider hidden so the surface stays static. Esc / click-outside / close button all dismiss; edits flow back through the existing notes saver path.
- [x] **Open-Meteo Ensemble API — forecast confidence indicator** — request ensemble uncertainty bands (10th–90th percentile temperature range) from the Ensemble API (15 models, free, no API key) and surface a "forecast confidence" chip in the weather widget — e.g., a narrow band means high confidence, a wide band means uncertain forecast. No competitor NTP exposes probabilistic forecast quality; this is a genuine differentiator over all current weather widgets. ~1d. — _[Sources 59, 148] (Open-Meteo Ensemble API; 15 ensemble models + uncertainty bands confirmed in round 6 pass)._ ✅ shipped (v1.1.0) — Settings → Weather → "Forecast confidence" toggle. New `getEnsembleSpread()` in `weather-source.js` fetches the 50-member ICON-EU ensemble (excluding control run m00), picks the closest hour to "now" from the location-local `time` array, computes spread = max − min, and caches per (lat, lon, units) for 30 min. Failure caches a one-minute null so the API isn't hammered on outage. Confidence label tuned to units: °F bands < 4 / 4–8 / > 8 = high / moderate / low; °C bands < 2 / 2–4 / > 4. Surfaces in the weather chip's hover title alongside the existing fields. New `ensemble-api.open-meteo.com/*` host_permission added to both manifests; README Privacy Table updated.
- [x] **Local Font Access API typography picker (Chrome 103+, Chrome/Edge only)** — `window.queryLocalFonts()` enumerates installed fonts; let users pick a custom body or heading font from their local system without a Google Fonts request. Fully privacy-aligned — no outbound network call; fonts load from disk. Firefox does not support this API; fall back to the existing custom-CSS field on Firefox. ~1d. — _[Source 149] (MDN: Local Font Access API)._ ✅ shipped (v1.1.0) — Settings → Appearance → Typography section. New `src/utils/local-fonts.js` exposes `isAvailable()`, `listFontFamilies()` (deduped + sorted), `applyFontPreference({body, display})` (overrides `--font-sans` + `--font-display` on `:root` with a fallback stack appended). `Settings → Typography` always shows a manual text input (works on every browser); on browsers that ship `queryLocalFonts()` it ALSO surfaces "Pick body font…" / "Pick display font…" buttons that open a native `<dialog closedby="any">` font picker with each row rendered in its own `font-family` for live preview, debounced search filter, and a 200-row perf cap. The first call triggers the browser's native local-fonts permission prompt. Firefox + Safari get an "Unavailable" chip and the manual text input as the only entry point. `applyFontPreferenceFromSettings()` runs in main.js init() so persisted choices apply on every load.
- [x] **Speculation Rules prefetch for quick links (Chrome 109+, Chrome/Edge only)** — inject a `<script type="speculationrules">` block with conservative `prefetch` rules for the user's quick links on hover; makes quick-link navigation feel instant by pre-fetching the target page. Chrome/Edge only; Firefox silently ignores the `<script type="speculationrules">` tag (safe progressive enhancement, no UI change needed). ~0.5d. — _[Source 150] (MDN: Speculation Rules API)._ ✅ shipped (v1.1.0) — new `src/utils/speculation-rules.js` exports `installSpeculationRules()` / `removeSpeculationRules()` / `applySpeculationRules(enabled)`. Document-source rule with `selector_matches: .quicklink` so the rule auto-tracks quick links without re-injection on layout change. `eagerness: "moderate"` triggers prefetch on ~200 ms hover or pointer-down (good "feels instant" balance vs "conservative" which only fires on actual navigation start). Settings → Quick links → "Hover prefetch" toggle. Off by default — uses background bandwidth on every hover. `applySpeculationRulesFromSettings()` runs in main.js init() so the script tag is installed/removed based on persisted setting on every load.

## Always-on

Maintained continuously, not version-gated.

- **Track Catppuccin palette versions** — re-import tokens when upstream ships a new flavor. — _[Sources 75, 76]._
- **Refresh `manifest.json host_permissions`** every release — only declare what is used; CWS scrutinizes `*://*/*`. — _[Sources 66, 68]._
- **Re-capture README screenshots** whenever the UI shifts. DPI-aware capture required (system is 125%).
- **Privacy Table audit** in README each release — every new outbound endpoint or permission gets a row before shipping. — _Constraint #1._
- **Verify clean-profile install** before every release — extract ZIP into a fresh user-data-dir, smoke-test all widgets across Chrome + Edge + Brave + Vivaldi + Firefox.
- **Chrome 138 NTP footer** — Chrome 138 added a persistent footer bar to the new-tab page; verify before each release that Vantage's full-viewport layouts (scene backgrounds, widget panels) are not clipped by the footer. Test in Chrome 138+ specifically. — _[Source 154]._
- **Track Chrome 138+ CSS functions** — `sibling-index()` / `sibling-count()` (stagger animations), `progress()` (range-aware interpolation), `stretch` sizing keyword, `env(--font-scale)` OS font scale variable. Chrome 138 stable ~Dec 2025; watch Firefox and Safari parity for Interop 2026 target features before landing. — _[Source 120]._
- **Track `chrome.readingList` availability** — currently Chrome 120+ only; re-check Firefox MV3 support each quarter; remove the graceful-no-op guard once cross-browser. — _[Source 117]._
- **Track Open-Meteo changelog** — new variables (cloud cover altitude bands, new AQI metrics, additional pollen species) and new API domains. — _[Sources 56, 57, 58, 59]._
- **Track Chrome Built-in AI origin trial status** — Prompt API, Summarizer API, Translator API (all gated behind Chrome 138+ / hardware check today); monitor for GA. — _[Source 110]._
- **Track Chrome `chrome.*` API changes** — Reading List API, Side Panel updates, future `chrome.ai` namespace. — _[Sources 62, 65]._
- **Track Interop 2026 shipping** — Anchor Positioning (✅ cross-browser: Chrome 125+, Firefox 147+), `contrast-color()` (✅ cross-browser: Chrome 147+, Firefox 146+, Safari 26+), Navigation API (✅ cross-browser: Firefox 147+), HTML Sanitizer API + Trusted Types API (✅ cross-browser: Firefox 148+), CSS `shape()` (✅ cross-browser: Firefox 148+, Chrome 117+), container style queries (Chrome 111+ partial, Firefox pending), Popover API interest invokers (`interestfor`), CSS `@starting-style` (✅ Baseline 2024 all browsers), `<dialog closedby>` + `:open` + `popover="hint"` (✅ Dialogs & Popovers cross-browser: Chrome 126+, Firefox 149+, Safari 26+), scroll-driven animations `animation-timeline: view()` (Firefox pending), View Transitions Level 2, CSS `attr()` typed, Custom Highlights API (`::highlight()`), IndexedDB `getAllRecords()` (Chrome 141 shipped; Firefox pending), CSS `zoom`, `CloseWatcher` API (✅ cross-browser: Chrome 126+, Firefox 149+, Edge 126+; Safari not supported). — _[Sources 72, 111, 112, 124, 125, 132, 152, 153, 165, 167]._
- **CORS proxy health check** — quarterly verify `allorigins.win` + alternates are operational; note last-checked date in CLAUDE.md. — _[Sources 80, 81]._
- **Track Chrome bookmark API changes** — Google announced bookmarks sync changes (June 2026) that may affect extensions using `chrome.bookmarks.*`; audit the Bookmarks widget and Quick Links favicon logic against the updated behavior before each release until the change is stable. — _[Source 127] (Chrome extensions blog — "Update your extensions ahead of upcoming bookmark changes", June 2026)._
- **CWS Team Roles setup** — after the CWS listing ships (v1.0.0), invite contributing collaborators via the CWS Developer Dashboard's team roles feature (4 roles as of April 30, 2026: publisher / developer / reviewer / analyst; no fee to add team members). Operational only; no code changes required. — _[Sources 62, 158] (Chrome extensions whats-new — CWS team roles expanded April 2026)._
- **Storage migration guard** — any field rename or structural change ships with a `migrate(prev)` step in `loadSettings()` keyed off `schemaVersion`; forward-additive changes are handled by existing deep-merge. — _Gap; required on any workspace schema change._
- **CoinGecko API key monitoring** — CoinGecko has already changed free-tier authentication once (keyless → `x-cg-demo-api-key`); re-audit before each crypto-widget release. — _[Source 102]._
- **Quotable API status** — api.quotable.io SSL certificate expired Nov 2025; repo unmaintained; endpoint permanently unreachable. Vantage is unaffected (ships bundled offline quote pack). Monitoring retired. — _[Sources 113, 135]._

---

## Testing & quality

No automated test suite is planned. The repo's `CLAUDE.md` declares "No tests unless explicitly requested." For a no-build-step vanilla-JS extension, a Karma/Jest/Playwright stack is high overhead against a manually smoke-tested, clean-profile install checklist. If the iframe widget API ever ships, that postMessage protocol surface warrants a small Playwright-extension integration test — at which point this section gets revised.

---

## Under Consideration

Items with real merit but unresolved trade-offs. Decided per release cycle, not pre-committed.

- **Firefox 151 platform review** - Firefox 151 shipped `@container style()` queries, desktop Document Picture-in-Picture, `CanvasRenderingContext2D.lang`, Web Serial, and add-on reliability fixes around `webRequest.onErrorOccurred` and tab group / split-view interactions. Vantage's immediate opportunities are (1) style-query driven component variants once Chrome/Safari parity is checked, (2) a Firefox-path feasibility review for Pomodoro Document PiP, and (3) a release-smoke item for Firefox split-view / tab-group behavior if the Tab Groups quick-link feature expands beyond Chrome. - _[Source 223]._
- **Chrome sidePanel lifecycle polish** - Current Chrome docs expose `sidePanel.close()` (Chrome 141+), `sidePanel.onOpened` (Chrome 141+), `sidePanel.onClosed` (Chrome 142+), and `sidePanel.getLayout()` (Chrome 140+). Vantage's side panel already renders combined feeds; next decision is whether to add a close button, left/right alignment adjustments for RTL, and persisted open-state hints without adding telemetry. - _[Sources 103, 224]._
- **TablissNG June 2026 resurgence** - TablissNG v1.7.0/v1.7.1 shipped June 2-4, 2026 with a 5-day weather forecast, Trello drag-and-drop/card-label work, an i18n pipeline rewrite, rspack/pnpm/rstest build modernization, and heavy dependency removal. Vantage already avoids the build-pipeline direction by design, but the product signal is meaningful: competitor NTPs are moving beyond "pretty dashboard" toward lightweight project management and richer weather detail. Candidate follow-up: a local-only kanban board mode that extends Vantage's To-Do/Notes model without adding Trello OAuth, plus a weather detail drawer that uses existing Open-Meteo data before adding new endpoints. - _[Source 234]._
- **Bonjourr current settings depth as UX benchmark** - Bonjourr's live web app and changelog show dense background controls (local images/videos, remote URLs, frequency, texture overlays, loop fade), richer clock customization (seconds, analog faces, AM/PM position), and continued favicon-security hardening. Vantage has already shipped many parallel features, but Bonjourr's public settings surface suggests two roadmap checks: (1) audit whether Vantage's many settings remain scannable without a searchable command/settings palette, and (2) keep favicon-cache privacy hardening in the release checklist because competitors are actively patching favicon leakage. - _[Source 235]._

- **Chrome Prompt API (Gemini Nano) for contextual actions** — on-device, no server, no API key; privacy-aligned. Could power: feed item summarization, search query suggestion, custom greeting generation. Hardware gate (Chrome 138+): 22 GB free storage + GPU >4 GB VRAM OR CPU 16 GB RAM + 4 cores; Windows 10/11 / macOS 13+ / Linux / ChromeOS Chromebook Plus only; unavailable on Android or iOS. Market share behind hardware gate is too low for a Now item. Re-evaluate when hardware gating loosens or model download size shrinks. — _[Sources 110, 131]._
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
- **Expanded clock widget settings** — analog clock face option, seconds display, AM/PM indicator position control (before / after the time string), configurable timezone for the primary clock as distinct from World Clocks. nightTab has detailed analog clock controls; Bonjourr v22.1.0 adds AM/PM position toggle. Medium design work, low engineering effort. Deferred until the clock widget warrants a dedicated settings panel. — _[Sources 12, 30] (Bonjourr v22.1.0; nightTab v7.3.0)._
- **`chrome.offscreen` for SubtleCrypto + canvas screenshot** — `chrome.offscreen` (Chrome 109+ MV3) creates a hidden DOM document with SubtleCrypto + canvas access from a service worker context; canonical pattern for encrypting data from a service worker background. Vantage's SubtleCrypto implementation (Next) runs in the extension page context where SubtleCrypto is directly available — offscreen is unnecessary there. Only relevant if a future service-worker-native background task needs crypto or canvas. — _[Source 130] (chrome.offscreen API)._
- **CSS `shape()` declarative widget clip paths** — `clip-path: shape(...)` syntax for widget card decoration (diagonal cuts, wave borders); now cross-browser as of Firefox 148+ (Chrome 117+, Firefox 148+) — _[Sources 132, 153]_. Design value versus `clip-path: polygon()` (which already works) still unclear; a concrete design use case justifying the migration is needed before committing. Candidate for Later once a specific shape spec is identified.
- **CO₂ / CH₄ from Open-Meteo Air Quality API** — `carbon_monoxide`, `methane` variables are available in the existing AQ endpoint. Niche audience; requires UI to present ppm meaningfully with health context; deferred until air quality widget gets a dedicated detail panel. — _[Sources 56]._
- **Scoped custom element registries** — `new CustomElementRegistry()` per shadow root; only relevant if Vantage adopts custom elements for widget rendering (currently vanilla JS modules + DOM). Interop 2026 target; track and revisit if widget architecture shifts.
- **WECG Proposal #793 — Synchronous data at startup** — would allow NTP extension settings to be read synchronously before first paint, eliminating the settings-flash FOUC on new-tab open. Not shipped in any browser yet; still an open WECG proposal. Track for arrival; if it ships, remove the current async-load shimmer placeholder and use synchronous reads instead. — _[Source 151] (WECG PR #793 — "Synchronous data at startup")._
- ~~**Dual temperature units (°C / °F both)**~~ ✅ promoted from Under Consideration → shipped (v1.1.0) — Settings → Weather → "Show both °C and °F" toggle. Render the converted other-unit alongside the headline temperature (e.g. "72°F · 22°C"). Conversion is client-side from the unit Open-Meteo already returned, so no extra fetch. — _[Source 159] (Bonjourr issue #808 — dual temperature units feature request, Apr 2026)._
- **CSS `if()` function for conditional widget styling** — Chrome 142+; enables inline conditional CSS property values using `style()`, `media()`, `supports()` queries; can replace complex CSS variable hacks. Powerful new primitive but gated by Firefox support status (unknown). Under Consideration until cross-browser. — _[Source 162] (MDN CSS if() function)._
- **`Uint8Array.prototype.toBase64()` efficiency win (Chrome 140+)** — available cross-browser (Chrome 140+, Firefox 126+, Safari 18+); eliminates `btoa()` + `TextEncoder` boilerplate in the SubtleCrypto encrypted API key storage item (Next). ~0.1d efficiency win when the SubtleCrypto item lands. — _[Source 166] (MDN `Uint8Array.prototype.toBase64()`)._
- **mystarting.link IPFS sync pattern** — competitor extension ships E2EE sync via IPFS; signals that decentralized sync is a real user demand beyond just Gist sync. Low priority candidate for later research. — _[Source 156] (r/startpages top post, May 2026)._
- **Web Speech API for voice-driven search / commands** — `SpeechRecognition` (platform-provided) and `SpeechSynthesis` (TTS); full cross-browser support (all modern browsers). Could enable: "Hey Vantage, search for X" voice query, read-aloud weather headline, TTS for accessibility. Chrome / Firefox / Safari all support; no additional APIs needed. Niche but novel UX. Design + voice UI framework needed before committing. — _[Source 168] (MDN Web Speech API)._
- **Compression Streams API for local data export** — `CompressionStream` (gzip/deflate) + `DecompressionStream` for dashboard export compression; cross-browser (Chrome 80+, Firefox 55+). Currently exports are JSON only; compressing multi-year feed history + images before export would reduce file size 70%+. Low priority unless export volume becomes a UX complaint. — _[Source 169] (MDN Compression Streams API)._
- **Subresource Integrity (SRI) for CDN-hosted assets** — if Vantage ever moves CORS proxy or weather icon CDN behind a third-party provider, SRI hashing (`<link integrity="sha384-...">`) provides defense against supply chain attacks. Currently all assets are bundled, so SRI not applicable. Policy for if/when external CDNs are added. — _[Source 170] (MDN Subresource Integrity)._
- **Local Font Access API for system font rendering** — `window.queryLocalFonts()` (Chrome 103+); would allow exposing installed system fonts in clock/note widget rendering options. Not supported in Firefox; requires `"local-fonts"` permission with user prompt. Niche feature; UX permission friction for limited value. Under Consideration until Firefox ships support. — _[Source 171] (MDN Local Font Access API)._
- **CWS enterprise org publishing** — Chrome Web Store new private org publishing option (Feb 19, 2026) lets developers publish extensions to external organizations via approval-link flow. Useful for Vantage if corporate customers want private branded distributions. Operational concern for later; no code changes needed. — _[Source 172] (Chrome Web Store new enterprise publishing option, Feb 2026)._
- **CSS `color-mix()` expansion + `light-dark()` with images** — Firefox 150 enables `color-mix()` to accept multiple colors (not just 2), and `light-dark()` now accepts `<image>` values (gradients, SVG). Enables sophisticated color interpolation + theme-aware image display. Both shipping now; candidate for Later once a concrete design need emerges. — _[Source 173] (MDN `color-mix()` + `light-dark()` Firefox 150)._
- **CSS media pseudo-classes for video/audio styling** — Firefox 150 ships `:playing`, `:paused`, `:muted`, `:seeking`, `:stalled`, `:volume-locked`, `:buffering` pseudo-classes for `<audio>` and `<video>` elements. Enables audio widget animations (play button morphs on state). Candidate for media player widget (Later). — _[Source 173] (MDN media pseudo-classes, Firefox 150)._
- **CSS `revert-rule` keyword** — Firefox 150: allows property to revert to a previous rule cascade level without inheriting from parent. Rarely needed in Vantage's flat component model, but useful for widget-per-user-pref reset mechanics. Under Consideration pending concrete UX need. — _[Source 173] (MDN `revert-rule`, Firefox 150)._
- **HTML `<img sizes="auto">`** — Firefox 150 now supports `sizes="auto"` (and `HTMLImageElement.sizes` attribute change) for lazy-loaded images; allows srcset selection based on calculated layout size without duplicating media query logic from CSS. Useful for responsive feed thumbnails. — _[Source 173] (MDN `<img sizes="auto">`, Firefox 150)._
- **Speculation Rules API (`<script type="speculationrules">`)** — Chrome 109+ / Edge 109+; Firefox silently ignores for progressive enhancement. Enables `prefetch` and `prerender` hints for likely navigation targets. Could optimize top-search-engine destination preloading. Low priority; benefit marginal for NTP use case. — _[Source 174] (MDN Speculation Rules API)._
- **`overscroll-behavior` on scroll containers without scrollable overflow** — Firefox 150 fix: `overscroll-behavior` now correctly applies to scroll containers with `overflow: hidden`. Relevant if Vantage ever implements gesture-based scroll-snapping or momentum scroller decoration. — _[Source 173] (MDN `overscroll-behavior` fix, Firefox 150)._
- **Intl API locale negotiation + regional formatting** — JavaScript `Intl` global provides comprehensive locale-aware formatting (date, time, number, collation, plural rules). Already cross-browser. Under Consideration for explicit i18n roadmap (currently deferred to "later phases"). — _[Source 175] (MDN Intl)._
- **Performance API for widget render metrics** — `PerformanceEntry`, `PerformanceMark`, `PerformanceMeasure`, `PerformanceObserver`; allows custom instrumentation of widget load + render timing. Candidate for observability item (Later) if telemetry-free metrics dashboard is implemented. — _[Source 176] (MDN Performance API)._
- **Firefox 150 feature snapshot** — `color-mix()` multi-color, `light-dark()` images, media pseudo-classes, `revert-rule`, `<img sizes="auto">`, `overscroll-behavior` fixes, navigation API cross-browser, HTML Sanitizer API cross-browser. Significant feature completeness milestone. Review for any hidden adoption opportunities. — _[Source 173] (Mozilla Firefox 150 release notes)._
- **WXT (Web eXtension Toolkit)** — modern browser extension framework (GitHub: wxt-dev/wxt); supports MV2 + MV3, Vue/React/Svelte, TypeScript, HMR dev mode, file-based entrypoints, auto-imports, automated publishing. 1K+ GitHub stars; active maintainer. Comparison signal: WXT targets developers wanting a build pipeline + framework abstractions. Vantage's no-build-step approach intentionally rejects this surface area, per constraint #2. — _[Source 177] (WXT GitHub repo)._
- **Plasmo Framework** — browser extension SDK positioned as "Next.js for extensions" (GitHub: PlasmoHQ/plasmo); React + TypeScript first-class support, declarative manifest, content scripts UI, tab pages, live HMR, Storage API, Messaging API, remote code bundling, BPP automated deployment. 8K+ GitHub stars; well-funded; aggressive marketing. Comparison signal: Plasmo drives higher developer perception of "what an extension framework should offer" but contradicts Vantage's constraint #2 (no build, single-file delivery). — _[Source 178] (Plasmo GitHub repo)._
- **MV2 sunset timeline clarity** — Chrome 138 (July 24, 2025): MV2 disabled everywhere; users cannot re-enable. Chrome 139 (mid-2026): ExtensionManifestV2Availability enterprise policy removed. **Critical:** Vantage is MV3 only, so this does NOT require code changes. However, all documentation and release notes must emphasize MV3-only from v1.0.0 onwards to ensure users with MV2-requiring extensions don't expect compatibility. — _[Source 179] (Chrome Extensions MV2 Sunset Timeline)._
- **axe-core v4.11.4 release** — current stable version (April 28, 2026); major bug fixes: target-size ignores offscreen position:fixed, aria-labelledby excludes natively hidden elements, ancestry selectors fixed. 800K+ Chrome DevTools extension installs; 3 Billion+ npm downloads. Policy: if Vantage ever bundles accessibility audit tooling (Later), use axe-core as the underlying rule engine. — _[Source 180] (Deque axe-core releases; Deque Axe DevTools page)._
- **`chrome.dom.openOrClosedShadowRoot()` API** — Chrome 88+ MV3: accesses both open and closed shadow roots on an element; returns null if no shadow root. Relevant if Vantage ever inspects or styles shadowed components in injected widgets. Currently not needed; policy for future widget injection scenarios. — _[Source 181] (Chrome extensions API: chrome.dom)._
- **Firefox `storage.sync` synchronization model** — Firefox: 10-minute sync interval or manual "Sync Now" (max 100 KB quota, 512 max items, 8 KB per item). Server-side changes take precedence on conflicts; not ideal for aggregated data (cumulative counts). Cross-browser alternative: GitHub Gist sync (round 1 item) is more reliable for multi-device workspace. — _[Source 182] (MDN storage.sync API)._
- **Chrome `storage.sync` with managed storage** — Chrome: async read/write API with optional managed (enterprise policy) override; 10 MB quota per extension (much larger than Firefox). Useful for corporate deployments. Vantage's Gist sync pattern covers consumer use; enterprise Vantage deployments could layer managed storage on top. — _[Source 183] (Chrome storage API reference)._
- **WCAG 2.2 updated Feb 11, 2026** — W3C reconfirmed WCAG 2.2 as current standard (includes updates from 2024 + February 2026 edits). Vantage's accessibility compliance baseline is WCAG 2.2 AA (per constraint audit in Round 5). Tracking remains in Always-on. — _[Source 184] (WCAG 2.2 Understanding - updated Feb 11, 2026)._
- **`chrome.offscreen` use cases** — Chrome 109+ MV3: hidden DOM for Clipboard, canvas, SubtleCrypto, audio/video, DOM parsing. Only `chrome.runtime` API available. Vantage does NOT use offscreen (SubtleCrypto runs in extension page). Future use case: OPFS encryption (Later). — _[Source 185] (Chrome extensions offscreen API)._
- **W3C Internationalization (I18n) Activity framework** — W3C publishes comprehensive guidance on number/currency formatting, address formats (varies by country: US/UK house-first, Germany street-first, Japan block-based, China postal-code-first), and naming conventions. Policy: when Vantage ships i18n support (Later), consult W3C I18n guidance for regional correctness (number grouping, currency placement, address field order). New article: "Number, currency, and unit formatting" (March 13, 2026); "Address formats around the world" (Feb 3, 2026). — _[Source 186] (W3C Internationalization Activity; W3C I18n number/currency/address articles, published Feb–Mar 2026)._
- **JavaScript `Intl.NumberFormat` for regional number/currency formatting** — W3C Intl API guide: `Intl.NumberFormat` handles decimal separators (period vs comma), digit grouping (3-digit vs Indian 2-digit), currency symbol placement (before/after), and non-Latin numeral systems (Arabic, Thai). Essential for multi-regional Vantage deployments (coins widget, portfolio display). Article published Feb 3, 2026. — _[Source 187] (W3C "Guide to the ECMAScript Internationalization API"; W3C "Number, currency, and unit formatting" article)._
- **Extension content script context + isolated world** — Mozilla/Chrome extension architecture: content scripts run in an isolated JavaScript world separate from page scripts (prevents conflicts but limits DOM access). Firefox + Chrome differ on `chrome.dom` API access. Cross-browser content script architecture requires careful messaging pattern design. — _[Source 188] (MDN WebExtensions content scripts; Chrome content scripts documentation)._

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
- **Mouse wheel to cycle quick link groups** — _[Source 12] (Bonjourr v22.1.0)._ Mouse-only interaction without a keyboard equivalent fails WCAG 2.1.1 (Keyboard); the existing group navigation works via click; a keyboard-accessible cycle button (prev/next arrow) is the correct shape if this pattern is ever revisited.
- **Kiwi Browser distribution** — _[Source 144]._ Kiwi Browser archived January 2025; no longer maintained; not a viable distribution target.
- **Any-corner toolbar position picker** — _[Source 97] (nightTab v7.3.0)._ Vantage uses a vertical-panel layout, not a browser-chrome-style toolbar; mapping nightTab's corner-repositionable header controls to Vantage's architecture would require a full layout-model redesign. Deferred indefinitely; revisit only as part of the v1.2+ drag-resize layout editor.
- **Zen Browser as a separate distribution target** — _[Source 155] (Zen Browser v1.19.11b, Firefox-based, beta)._ Zen Browser supports Firefox WebExtensions/XPI natively; Vantage's AMO-distributed XPI installs directly — no separate listing needed. Same applies to LibreWolf, Floorp, and Waterfox (all Firefox-based; all support XPI). The AMO listing covers the entire Firefox fork ecosystem. Note: LibreWolf's extension network firewall can block Open-Meteo weather fetch; this is a user-side configuration setting, not a packaging concern — document in the Privacy Table.

---

## Appendix — Sources

Numbering matches citations inline. URLs verified at research time (2026-05-01).

**Sources #97–#115 added in round 1; #116–#121 added in round 2 (2026-05-01); #122–#127 added in round 4 (2026-05-02); #128–#145 added in round 5 (2026-05-04); #146–#158 added in round 6 (2026-05-07).**

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
12. https://github.com/victrme/Bonjourr/blob/master/CHANGELOG.md — Bonjourr CHANGELOG: v22.1.0 (icon roundness/type controls, AM/PM position toggle for 12h clock, mouse wheel link-group navigation); v22.0.0 (context menu, video backgrounds, alarm tone customization, theme-color meta tag); v21.0.0 (Gist/URL settings sync).
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
71. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured.html — WCAG 2.2 SC 2.4.11 Focus Not Obscured (AA): focused element must not be entirely hidden by author content such as sticky headers/footers; fix via `scroll-padding-top` on scroll container. (URL was previously pointing to the wrong criterion — corrected round 5.)
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

### Sources added 2026-05-02 (round 4 revision)

122. https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style — MDN: `@starting-style` at-rule; Baseline 2024, all major browsers (Chrome 117+, Firefox 129+, Safari 17.5+, Edge 117+); enables entry/exit transitions from `display: none` and for top-layer elements (popover, dialog) without JS `classList` + `setTimeout(0)` scaffolding.
123. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction — MDN: Firefox `browser.sidebarAction` API (Firefox 109+); `open()`, `close()`, `toggle()`, `setPanel()`, `isOpen()`; the Firefox-side peer to Chrome's `chrome.sidePanel`; both APIs required for cross-browser Side Panel implementation.
124. https://caniuse.com/mdn-css_types_color_contrast-color — caniuse: `contrast-color()` browser support — Chrome 147+, Firefox 146+, Safari 26+, Edge 147+; all Interop 2026 cross-browser targets met as of May 2026.
125. https://caniuse.com/css-anchor-positioning — caniuse: CSS Anchor Positioning — Chrome 125+, Firefox 147+, Safari 26+, Edge 125+; cross-browser support confirmed; Interop 2026 target met.
126. https://developer.chrome.com/blog/structured-clone-messaging — Chrome 148: opt-in Structured Clone serialization for extension messaging; set `chrome.runtime.MessagingConfig.serializationFormat = 'structured-clone'`; enables `Map`, `Set`, `ArrayBuffer`, and `RegExp` across extension contexts without manual JSON round-trips.
127. https://developer.chrome.com/docs/extensions/whats-new — Chrome Extensions What's New blog (June 2026 entry): "Update your extensions ahead of upcoming bookmark changes"; bookmarks sync changes may impact extensions using `chrome.bookmarks.*`; developers advised to audit bookmark-dependent code before mid-2026.

### Sources added 2026-05-04 (round 5 revision)

128. https://github.com/zombieFox/nightTab — nightTab: 2,032★, last release v7.3.0 Oct 2021, no new releases in 4+ years. Highest-star NTP confirmed abandoned. Its users represent the largest single migration cohort for Vantage's import/restore flow.
129. https://github.com/BookCatKid/TablissNG/issues — TablissNG v1.6.6 open issue: Firefox 150 / Chromium 147 `chrome.storage.local` overflow at ~150 MB local media. Error: "StorageError: Extension[local]: tabliss/cache: Cannot write updates to storage". Strongest evidence confirming OPFS migration (Later) is critical.
130. https://developer.chrome.com/docs/extensions/reference/api/offscreen — `chrome.offscreen` API (Chrome 109+ MV3): creates a hidden DOM document accessible to service workers; supports SubtleCrypto, canvas, DOM parsing; only `chrome.runtime` API available inside; one offscreen document at a time per extension.
131. https://developer.chrome.com/docs/ai/prompt-api — Chrome Prompt API (origin trial, Chrome 138+): hardware requirements: Windows 10/11 or macOS 13+ or Linux or ChromeOS Chromebook Plus; 22 GB free storage; GPU >4 GB VRAM OR CPU 16 GB RAM + 4 cores; not available on Android, iOS, or non-Chromebook-Plus ChromeOS.
132. https://web.dev/blog/interop-2026 — Interop 2026 official announcement (Feb 12, 2026): confirmed focus areas: Anchor positioning, Container style queries, Dialogs & Popovers (`<dialog closedby>`, `:open`, `popover="hint"`), Scroll-driven animations (`animation-timeline`), View Transitions Level 2, CSS `attr()` typed, `contrast-color()`, Custom Highlights API, Fetch ReadableStream, IndexedDB `getAllRecords()`, Navigation API, Scoped custom element registries, Scroll snap, CSS `shape()`, WebRTC, WebTransport, CSS `zoom`.
133. https://open-meteo.com/en/docs/marine-weather-api — Open-Meteo Marine API: wave height / direction / period (primary + wind + swell + secondary + tertiary), sea surface temperature, ocean current velocity + direction (0.08° resolution), sea level including tides. 15-min current conditions. ECMWF WAM 15-day forecast. Free, no API key.
134. https://open-meteo.com/en/docs/flood-api — Open-Meteo Flood API: GloFAS v4 river discharge (m³/s) at 5 km resolution globally. 7-month seasonal forecast. Ensemble members for uncertainty. Historical from 1984. Free, no API key.
135. https://github.com/lukePeavey/quotable/issues/266 — Quotable API SSL certificate expired Nov 2025; 14 upvotes; api.quotable.io unreachable. Repo unmaintained. Vantage unaffected (bundled offline quote pack). Always-on monitoring retired.
136. https://api.github.com/repos/dequelabs/axe-core/releases — axe-core v4.11.4 (Apr 28, 2026): current stable. `target-size` rule: ignores `position:fixed` offscreen and inline elements (false-positive fixes). `aria-labelledby`: excludes natively hidden elements from accessible name computation.
137. https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto — SubtleCrypto: fully available in `chrome-extension://` pages. AES-GCM-256 for symmetric at-rest encryption; PBKDF2 (600k iterations, SHA-256) for key derivation from passphrase. `chrome.storage.session` for ephemeral key (cleared on browser restart). No `chrome.offscreen` workaround needed.
138. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured.html — WCAG 2.2 SC 2.4.11 Focus Not Obscured (AA): focused UI component must not be entirely hidden by author-created content. Fix: `scroll-padding-top` on scroll container. Partial obscuring allowed but minimized.
139. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html — WCAG 2.2 SC 2.5.8 Target Size Minimum (AA): targets ≥24×24 CSS px, OR 24 px circles centered on each target must not intersect adjacent targets. Five exceptions: Spacing, Equivalent, Inline, User agent control, Essential.
140. https://extensionworkshop.com/documentation/publish/submitting-an-add-on/ — AMO submission: ZIP/XPI/CRX up to 200 MB; source code required if minified; unlisted option via "On your own"; standard Mozilla Account; no 2026 process changes.
141. https://developer.microsoft.com/en-us/microsoft-edge/extensions/ — Edge Add-ons: submit via Partner Center; free developer registration; no code changes needed for CWS-compatible extensions; submit same ZIP package.
142. https://addons.opera.com/developer/upload/ — Opera Add-ons: accepts MV3 Chromium extensions; submit same ZIP as CWS; direct upload form at addons.opera.com/developer/upload/. ~0.1d of paperwork.
143. https://developer.samsung.com/galaxy-store — Samsung Internet 23+ (Chromium 120 base) supports MV3 browser extensions. Distribution via Galaxy Store Developer Console; free Samsung Developer Account; same ZIP package as CWS; ~3% global browser market share; NTP extension market on Samsung Internet is essentially unserved.
144. https://kiwibrowser.com/kiwi-browser-supports-extension-apis/ — Kiwi Browser archived January 2025; no longer maintained; official recommendation to migrate to Edge Canary (Android) or Vivaldi. Not a viable distribution target.
145. https://news.ycombinator.com/item?id=43786933 — Show HN: TabTab (Apr 2025, 13 pts): grid-style NTP with one-click save-all-tabs as collection, self-hosted sync via GitHub Gist/WebDAV. Validates Gist sync (v1.1.0) and tab snapshot → workspace feature.

### Sources added 2026-05-07 (round 6 revision)

146. https://developer.chrome.com/docs/extensions/whats-new — Chrome Extensions What's New (Sept 10, 2025 entry): `sidePanel.getLayout()` available in Chrome 140+; returns `{displayState, panelAlignment}` so extensions can detect left/right panel position and adjust layout accordingly.
147. https://developer.chrome.com/docs/extensions/whats-new — Chrome Extensions What's New (Sept 30, 2024 entry): `StorageArea.getKeys()` available in Chrome 130+; lists all keys in a storage area without fetching values; useful for settings-import diff preview. _(Corrected from "Chrome 132+" in round 7.)_
148. https://open-meteo.com/en/docs/ensemble-api — Open-Meteo Ensemble API (round 6 detail pass): probabilistic forecasts from 15 ensemble models (ECMWF, GFS, ICON, Gemini, etc.); returns 10th/25th/75th/90th percentile bands for temperature, precipitation, wind; free, no API key; enables forecast-confidence UX.
149. https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API — MDN: Local Font Access API; `window.queryLocalFonts()` (Chrome 103+); enumerates installed system fonts with full name, PostScript name, family, style; not supported in Firefox; requires `"local-fonts"` permission prompt.
150. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/speculationrules — MDN: Speculation Rules API (`<script type="speculationrules">`); `prefetch` and `prerender` hints for navigation; Chrome 109+ / Edge 109+; Firefox silently ignores the script type (safe progressive enhancement); no manifest permission needed.
151. https://github.com/w3c/webextensions/pull/793 — WECG PR #793: "Synchronous data at startup" proposal — allow extensions to declare a small set of storage keys readable synchronously before the first async I/O round-trip; would eliminate NTP settings-flash FOUC on new-tab open; not shipped in any browser as of round 6 research.
152. https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/147 — Firefox 147 release notes: Navigation API now cross-browser (Firefox 147+); SPA View Transition Types shipped; CSS Anchor Positioning confirmed cross-browser (Firefox 147+).
153. https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/148 — Firefox 148 release notes: HTML Sanitizer API + Trusted Types API now cross-browser (Firefox 148+); CSS `shape()` now cross-browser (Firefox 148+, Chrome 117+); Iterator.zip() shipped.
154. https://developer.chrome.com/docs/extensions/whats-new — Chrome Extensions What's New (June 17, 2025 entry): Chrome 138 adds a footer bar to the new-tab page; NTP extensions should verify that full-viewport layouts are not clipped; test in Chrome 138+ on each release.
155. https://github.com/zen-browser/desktop/releases/latest — Zen Browser v1.19.11b (Apr 29, 2026 release); Firefox-based, supports Firefox WebExtensions/XPI; Vantage's AMO XPI installs directly on Zen Browser with no separate packaging.
156. https://old.reddit.com/r/startpages/top.json — r/startpages top-of-month (retrieved May 2026): top post = Catppuccin Mocha startpage with Pomodoro + seek + tab notes + decipher text animation (108 pts); second = terminal startpage with `ai:` semantic routing prefix and inline Gemini prompt (39 pts). Community signal: animation, dense info density, and keyboard-driven search routing are highly valued.
157. https://github.com/BookCatKid/TablissNG/issues/139 — TablissNG issue #139: IPv6 address display in clock/network widget; edge-case request; low priority.
158. https://developer.chrome.com/docs/extensions/whats-new — Chrome Extensions What's New (April 30, 2026 entry): CWS Developer Dashboard team roles expanded to 4 roles (publisher / developer / reviewer / analyst); no $5 fee to add team members; previously 2 roles.

### Sources added 2026-05-02 (round 7 revision)

159. https://github.com/victrme/Bonjourr/issues/808 — Bonjourr issue #808: dual temperature units feature request (show both °C and °F simultaneously); derived from same already-fetched Open-Meteo data.
160. https://developer.chrome.com/blog/cws-new-appeals-process — Chrome Web Store new appeals process (April 8, 2026): appeals now integrated directly into CWS Developer Dashboard with pre-populated data, automatic ownership validation, and duplicate-prevention (replaces legacy "One Stop Support" webform).
161. https://developer.chrome.com/blog/cws-new-enterprise-publishing-option — Chrome Web Store new enterprise publishing option (February 19, 2026): developers can now publish privately to external organizations via approval-link flow.
162. https://developer.mozilla.org/en-US/docs/Web/CSS/if — MDN: CSS `if()` function; multi-condition support; works with `style()`, `media()`, `supports()` queries; can be used inline in any property value; Chrome 142+; Firefox support status unknown.
163. https://developer.chrome.com/blog/chrome-142-beta — Chrome 142 beta (October 1, 2025): CSS `if()` function with `style(attr(...))` syntax; `document.activeViewTransition` property added; `::view-transition` changed from `position: fixed` to `position: absolute` (breaking change); `font-language-override` CSS property; `pointerrawupdate` now secure-context only.
164. https://developer.chrome.com/blog/chrome-143-beta — Chrome 143 beta (October 29, 2025): CSS anchored fallback container queries (`@container anchored(fallback)`); Speculation Rules mobile 'eager' improvements; Unicode 16 via ICU 77 (Italian number format, English date format changes).
165. https://caniuse.com/mdn-api_closewatcher — caniuse: `CloseWatcher` API cross-browser support table — Chrome 126+, Edge 126+, Firefox 149+; Safari not supported.
166. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64 — MDN: `Uint8Array.prototype.toBase64()` method; Chrome 140+, Firefox 126+, Safari 18+; eliminates `btoa()` + `TextEncoder` boilerplate for base64 encoding.
167. https://web.dev/blog/interop-2026 — Interop 2026 official announcement (February 12, 2026): confirmed full focus area list including Navigation API `precommitHandler`, media pseudo-classes (`:playing`, `:paused`, `:muted`, `:volume-locked`), `<link rel="expect">` + `blocking="render"` for View Transitions, `:active-view-transition-type()` pseudo-class, IndexedDB `getAllRecords()`, `popover="hint"` Dialogs & Popovers, `CloseWatcher` API cross-browser support confirmation.

### Sources added 2026-05-02 (round 8 revision)

168. https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API — MDN: Web Speech API; `SpeechRecognition` (platform service) + `SpeechSynthesis` (TTS); full cross-browser support (Chrome, Firefox, Safari, Edge, mobile); enables voice-driven search queries and read-aloud headlines; no additional permissions needed.
169. https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API — MDN: Compression Streams API; `CompressionStream` + `DecompressionStream` for gzip/deflate compression; cross-browser (Chrome 80+, Firefox 55+); would enable 70%+ size reduction for multi-year feed + media export compression.
170. https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity — MDN: Subresource Integrity (SRI); cryptographic hash verification for third-party CDN resources; defense against supply-chain attacks; currently not applicable (all assets bundled); policy for future CDN adoption.
171. https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API — MDN: Local Font Access API; `window.queryLocalFonts()` returns installed system fonts; Chrome 103+; not supported Firefox; requires `"local-fonts"` permission prompt; gated by Firefox support.
172. https://developer.chrome.com/blog/cws-new-enterprise-publishing-option — Chrome Web Store enterprise org publishing (Feb 19, 2026): private org distribution via approval-link flow; operational feature for corporate deployments; no code changes required.
173. https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/150 — Firefox 150 release notes snapshot: `color-mix()` now accepts multiple colors (not 2), `light-dark()` accepts `<image>` values, `:playing/:paused/:muted/:buffering/:seeking/:stalled/:volume-locked` pseudo-classes for media elements, `revert-rule` CSS keyword, `<img sizes="auto">` support, `overscroll-behavior` fixes for non-scrollable containers. Major feature completeness.
174. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/speculationrules — MDN: Speculation Rules API (`<script type="speculationrules">`); Chrome 109+, Edge 109+, Firefox silently ignores (safe enhancement); enables `prefetch` and `prerender` hints for navigation targets; progressive search-engine destination optimization candidate.
175. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl — MDN: JavaScript Intl API; locale-aware formatting (date, time, number, collation, plural rules); cross-browser; policy for explicit i18n roadmap pending demand signal.
176. https://developer.mozilla.org/en-US/docs/Web/API/Performance_API — MDN: Performance API; custom instrumentation via `PerformanceMark`, `PerformanceMeasure`, `PerformanceObserver`; widget render metrics tracking; candidate for observability roadmap.

### Sources added 2026-05-02 (round 9 revision)

177. https://github.com/wxt-dev/wxt — WXT (Web eXtension Toolkit): modern browser extension framework supporting MV2/MV3, Vue/React/Svelte, TypeScript, HMR, file-based entrypoints, auto-imports, automated publishing; 1K+ GitHub stars; active maintainer. Represents the build-pipeline-first extension development model; contrast to Vantage constraint #2 (no-build-step).
178. https://github.com/PlasmoHQ/plasmo — Plasmo Framework: "Next.js for browser extensions"; React + TypeScript first-class, declarative manifest, content scripts UI, tab pages, live HMR, Storage/Messaging APIs, BPP automated deployment; 8K+ GitHub stars, well-funded, aggressive marketing. High-framework-abstraction model; contradicts Vantage constraint #2.
179. https://developer.chrome.com/docs/extensions/mv2-sunset/ — Chrome MV2 Sunset Timeline: Chrome 138 (July 24, 2025) **disabled MV2 everywhere** (users cannot re-enable); Chrome 139 (mid-2026) removes ExtensionManifestV2Availability enterprise policy. Vantage is MV3-only: no code changes required; policy decision: emphasize MV3-only in all v1.0.0+ documentation.
180. https://github.com/dequelabs/axe-core/releases + https://www.deque.com/axe/ — axe-core v4.11.4 (April 28, 2026): current stable; 800K+ Chrome DevTools extension installs, 3 Billion+ npm downloads; major false-positive fixes (target-size ignores position:fixed, aria-labelledby excludes natively hidden). Policy: if Vantage bundles accessibility audit tooling (Later), use axe-core as the underlying rule engine.
181. https://developer.chrome.com/docs/extensions/reference/api/dom — Chrome `chrome.dom.openOrClosedShadowRoot()` API (Chrome 88+ MV3): accesses both open and closed shadow roots on an element; returns null if no shadow root. Future policy for widget injection scenarios; currently not needed.
182. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync — Firefox `storage.sync`: 10-minute sync interval, 100 KB quota (512 max items, 8 KB per item), server-side changes take precedence. Cross-browser analysis: GitHub Gist sync (Round 1) is more reliable for multi-device workspace; Firefox sync acceptable for simple settings only.
183. https://developer.chrome.com/docs/extensions/reference/api/storage — Chrome `storage.sync`: async API, optional managed storage override (enterprise policy), 10 MB quota per extension. Enables corporate Vantage deployments with managed storage layer on top of consumer Gist sync.
184. https://www.w3.org/WAI/WCAG22/Understanding/ — WCAG 2.2 confirmed current standard (updated Feb 11, 2026 with Feb 2026 edits). Vantage accessibility compliance baseline: WCAG 2.2 AA (per constraint audit, Always-on item).
185. https://developer.chrome.com/docs/extensions/reference/api/offscreen — Chrome `chrome.offscreen` API (Chrome 109+ MV3): hidden DOM for Clipboard, canvas, SubtleCrypto, audio/video, DOM parsing; only `chrome.runtime` API available. Vantage does NOT use offscreen currently; future OPFS encryption use case may require it.

### Sources added 2026-05-02 (round 10 revision)

186. https://www.w3.org/International/ + https://www.w3.org/blog/International/2026/03/13/new-article-number-currency-and-unit-formatting/ + https://www.w3.org/blog/International/2026/02/03/new-articles-has-been-published/ — W3C Internationalization Activity (I18n): comprehensive guidance on regional number/currency formatting, address formats (varies by country: US/UK house-number-first, Germany street-first, Japan block-based, China postal-code-first), and naming conventions. New articles published Feb–Mar 2026: "Number, currency, and unit formatting" + "Address formats around the world" + "Guide to the ECMAScript Internationalization API". Policy: consult for regional correctness when i18n support ships.
187. https://www.w3.org/International/articles/intl/index — W3C "Guide to the ECMAScript Internationalization API" (Feb 3, 2026): practical overview of `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.Collator` with locale-aware examples; handles decimal separators (. vs ,), digit grouping (3-digit vs Indian 2-digit), currency symbol placement (before/after), and non-Latin numerals (Arabic, Thai). Essential for coins widget + portfolio display in multi-region deployments.
188. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts + https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts/ — Content script architecture: runs in isolated JavaScript world separate from page scripts (prevents conflicts). Firefox + Chrome differ on `chrome.dom` API access from content scripts. Cross-browser architecture requires careful messaging pattern design for shared state + event handling.

### Sources added 2026-06-06 (rounds 15-18)

221. https://docs.github.com/en/rest/gists/gists - GitHub REST Gists docs: create/update/delete require GitHub App user access tokens or fine-grained personal access tokens with `Gists` write permission. Public Gist reads can remain unauthenticated; Vantage export copy and implementation must stop claiming anonymous Gist creation.
222. https://developer.chrome.com/docs/extensions/develop/concepts/browser-namespace - Chrome 148 browser namespace guidance: Chrome now exposes extension APIs under `browser` as a cross-browser alternative to `chrome`; `chrome` remains supported; DevTools-page extensions cannot use `browser`; runtime message listeners can return Promises in Chrome 148.
223. https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/151 - Firefox 151 developer release notes: released May 19, 2026; adds `@container style()` queries, Document Picture-in-Picture desktop support, `CanvasRenderingContext2D.lang`, Web Serial desktop support, and add-on fixes around `webRequest.onErrorOccurred` and tab group / split view interactions.
224. https://developer.chrome.com/docs/extensions/reference/api/sidePanel - Chrome Side Panel API reference: `close()` Chrome 141+, `getLayout()` Chrome 140+, `onOpened` Chrome 141+, `onClosed` Chrome 142+; useful for Vantage side-panel close controls, RTL-aware layout, and state restoration decisions.

### Sources added 2026-06-06 (rounds 21-24)

225. https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api - GitHub REST API guidance: authenticated requests require tokens and tokens must be treated like sensitive credentials; request bodies generally require authentication. Local CORS probe on 2026-06-06 showed GitHub API returns `Access-Control-Allow-Origin: *` and allows `Authorization` on preflight, so a one-shot authenticated browser-extension POST is technically viable without a proxy, but unauthenticated POST returns `401`.
226. https://developer.chrome.com/docs/webstore/review-process/ - Chrome Web Store review guidance: April 2026 submission surge warning; most reviews finish within days but can take weeks; broad host permissions and sensitive permissions are explicit review-time risk factors.
227. https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/ - Chrome Web Store privacy fields guidance: request minimum permissions, justify every manifest permission, avoid remote code, and keep dashboard disclosures consistent with the linked privacy policy.
228. https://www.reddit.com/r/chrome_extensions/comments/1twhfln/data_from_27_chrome_web_store_submissions_heres/ - Community review-time report from June 2026: first reviews and broad host permissions are reported as slower; narrowing match patterns and clear permission justifications are reported as useful. Anecdotal; use only as launch-risk signal.
229. https://www.reddit.com/r/chrome_extensions/comments/1swwowk/broad_host_permissions_how_long_did_your_indepth/ - Community thread on broad host permission review: reported outcomes range from one day to two weeks; reinforces that Vantage should prepare a broad-host explanation packet instead of assuming a fast first review. Anecdotal.

### Sources added 2026-06-06 (rounds 25-27)

230. https://developer.chrome.com/docs/extensions/reference/api/permissions - Chrome `chrome.permissions` API: runtime `request` / `contains` / `remove`, optional origin subset requests, Chrome 133+ `addHostAccessRequest`, and the requirement that requested permissions are declared as optional or withheld required permissions.
231. https://developer.chrome.com/docs/extensions/develop/concepts/activeTab - Chrome `activeTab`: temporary host access only after an explicit user gesture and only for the active tab origin; useful alternative to `<all_urls>` for invoked tab actions, but not enough for Vantage feed/background refreshes.
232. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions - MDN `optional_host_permissions`: MV3 runtime host grants, permissions API requests, and Firefox Permissions-tab grant/revoke behavior.
233. https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions - Chrome declare permissions: host permissions allow extension-page and service-worker fetches; optional permissions and `optional_host_permissions` give users informed runtime control and reduce alarming install warnings.
234. https://github.com/BookCatKid/TablissNG/releases - TablissNG June 2026 releases v1.7.0/v1.7.1: 5-day weather forecast, Trello drag-and-drop/card labels, i18n pipeline rewrite, build-system overhaul, and dependency removal; competitor signal for richer weather detail and lightweight project-management surfaces.
235. https://github.com/victrme/Bonjourr/blob/master/CHANGELOG.md + https://online.bonjourr.fr/ - Bonjourr v22.x/current settings benchmark: Pomodoro, context menu, remote/local/video backgrounds, background textures/frequency/loop fade, clock customization, favicon security hardening, and dense settings surface.

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

## Notes on this revision (2026-05-02, round 4)

- **`contrast-color()` promoted from Next → Now** — caniuse confirms Chrome 147+, Firefox 146+, Safari 26+, Edge 147+; all Interop 2026 cross-browser targets met. Ship date is no longer speculative. Progressive-enhancement fallback documented in-line.
- **CSS Anchor Positioning confirmed cross-browser** — Firefox 147+ ships full anchor positioning; caniuse updated. Roadmap item updated to note cross-browser condition met.
- **`@starting-style` added to Next** — Baseline 2024 (Chrome 117+, Firefox 129+, Safari 17.5+); eliminates JS `setTimeout(0)` + `classList.add('visible')` animation scaffolding on settings panel, widget picker, and context menu.
- **Firefox Side Panel path documented** — `browser.sidebarAction` (Firefox 109+) confirmed as the cross-browser pair to `chrome.sidePanel`; Side Panel roadmap item updated to note both API paths and revised effort to ~2.5d.
- **Weather UV index + pressure added to Next** — `uv_index` and `pressure_msl` are available on the existing Open-Meteo hourly endpoint; no extra API call; table-stakes features in all major weather apps.
- **Quick link icon roundness control added to Next** — Bonjourr v22.1.0 ships this; trivial effort (~0.25d); pure CSS variable change.
- **Structured Clone messaging added to Next** — Chrome 148 opt-in dev-experience improvement; graceful no-op on Firefox and older Chrome.
- **Per-widget clipboard export added to Later** — nightTab v7.3.0 pattern (clipboard import/export by data section); Vantage extension: widget-granularity export via Restore dialog.
- **Expanded clock settings added to Under Consideration** — analog face, seconds, AM/PM position, main-clock timezone override; deferred until clock widget warrants a dedicated panel.
- **Two new Rejected items:** mouse wheel group cycling (WCAG 2.1.1 keyboard failure); any-corner toolbar position (architectural mismatch with Vantage's panel model).
- **Two new Always-on items:** Chrome bookmark API audit (June 2026 sync changes); CWS team roles setup post-listing.
- **Six new sources (#122–#127):** MDN `@starting-style`, MDN Firefox `sidebarAction`, caniuse `contrast-color()`, caniuse Anchor Positioning, Chrome 148 Structured Clone, Chrome Extensions What's New bookmark change notice.
- **Total appendix sources: 127.**

## Notes on this revision (2026-05-04, round 5)

- **Source #71 URL corrected** — was pointing to `focus-visible.html` (WCAG 2.4.7); now correctly points to `focus-not-obscured.html` (WCAG 2.4.11).
- **Chrome Built-in AI hardware requirements updated** — Under Consideration notes now reflect the actual hardware gate: 22 GB free storage + GPU >4 GB VRAM OR CPU 16 GB RAM + 4 cores (not "8 GB RAM + compatible NPU" as previously stated). Not available on Android or iOS.
- **Quotable API monitoring retired** — api.quotable.io SSL expired Nov 2025; repo unmaintained; endpoint permanently unreachable. Vantage is unaffected (bundled offline pack). Always-on item updated to reflect retired status.
- **Interop 2026 tracking expanded** — full focus area list added: `<dialog closedby>`, scroll-driven animations, View Transitions Level 2, CSS `attr()` typed, Custom Highlights API, IndexedDB `getAllRecords()`, CSS `shape()`, CSS `zoom`.
- **Kiwi Browser added to Rejected** — archived January 2025; not a viable distribution target.
- **New Now items (3):** settings `scroll-padding-top` fix (WCAG 2.4.11); nightTab migration onboarding prompt; Opera Add-ons listing.
- **Existing items updated:** WCAG audit now references axe-core v4.11.4 and covers all v0.7.0–v0.13.0 widget additions; Edge Add-ons entry now cites Source #141.
- **New Next items (6):** `<dialog closedby="any">`; per-workspace JSON export/import; Samsung Internet (Galaxy Store) listing; Marine weather widget (Open-Meteo Marine API); agricultural/atmospheric weather variable set; SubtleCrypto encrypted API key storage.
- **New Later items (8):** Custom Highlights API for feed search; scroll-driven feed item reveal; CSS `attr()` typed for grid columns; IndexedDB `getAllRecords()` for feed archive; River flood risk widget (Open-Meteo Flood API); Tab snapshot → named workspace; Notes focus / teleprompter mode; (sibling-index item already present — no duplicate added).
- **New Under Consideration items (4):** `chrome.offscreen` for SubtleCrypto + canvas; CSS `shape()` clip paths; CO₂/CH₄ from AQ API; scoped custom element registries.
- **Eighteen new sources (#128–#145):** nightTab abandoned, TablissNG storage overflow, chrome.offscreen, Chrome Prompt API hardware, Interop 2026 (web.dev), Open-Meteo Marine API, Open-Meteo Flood API, Quotable SSL expired, axe-core v4.11.4, SubtleCrypto MDN, WCAG 2.4.11 Understanding, WCAG 2.5.8 Understanding, AMO submission, Edge Add-ons, Opera Add-ons, Samsung Galaxy Store, Kiwi Browser archived, HN TabTab.
- **Total appendix sources: 145.**

## Notes on this revision (2026-05-07, round 6)

- **Firefox 147/148 platform updates applied to Interop 2026 tracking** — Navigation API ✅ cross-browser (Firefox 147+); HTML Sanitizer API + Trusted Types API ✅ cross-browser (Firefox 148+); CSS `shape()` ✅ cross-browser (Firefox 148+, Chrome 117+). All three items updated in the Always-on Interop tracker. Trusted Types being cross-browser is directly relevant to the Side Panel RSS feed reader (sanitizing fetched HTML before insertion).
- **CSS `shape()` Under Consideration item updated** — now cross-browser (Firefox 148+); promoted to "candidate for Later once a concrete design use case is identified"; no longer purely speculative.
- **Side Panel item updated** — added `sidePanel.getLayout()` (Chrome 140+, Source #146) note for detecting left/right panel position; useful for RTL-correct sidebar layout when i18n scaffolding ships.
- **StorageArea.getKeys() added to Next** — Chrome 132+; enables a key-level diff preview in the settings-import dialog before the user confirms restore. ~0.1d dev-experience win. Source #147.
- **Open-Meteo Ensemble API added to Later** — probabilistic forecast confidence indicator (10th–90th percentile temperature bands); 15 ensemble models; free, no API key; genuine differentiator — no competitor NTP exposes forecast uncertainty. ~1d. Sources #59, #148.
- **Local Font Access API added to Later** — Chrome 103+/Edge only (Firefox unsupported); local font picker for NTP typography without a Google Fonts request; fully privacy-aligned. ~1d. Source #149.
- **Speculation Rules prefetch added to Later** — Chrome 109+/Edge only; silent on Firefox (safe progressive enhancement); makes quick-link navigation instant via `<script type="speculationrules">`. ~0.5d. Source #150.
- **WECG Proposal #793 added to Under Consideration** — Synchronous data at startup; not shipped anywhere yet; would eliminate NTP settings-flash FOUC at first paint if it lands. Track for browser adoption. Source #151.
- **AMO listing item expanded** — notes that the XPI automatically covers Zen Browser, LibreWolf, Floorp, and Waterfox (all Firefox-based; no separate listings needed). Adds LibreWolf extension network firewall caveat (blocks Open-Meteo fetch if user has the firewall enabled; document in Privacy Table). Source #155.
- **Chrome 138 NTP footer added to Always-on** — Chrome 138 added a persistent footer to the NTP; verify full-viewport layouts are not clipped before each release. Source #154.
- **CWS Team Roles Always-on item updated** — 4 roles confirmed (expanded April 30, 2026; no fee); Source #158 added.
- **Zen Browser added to Rejected** — AMO XPI covers it automatically; no separate distribution target needed; LibreWolf firewall caveat documented. Source #155.
- **r/startpages community signal added** — Source #156: top posts confirm that animation, dense info density, and keyboard-driven semantic search routing are the highest-valued community signals; informs future UX priorities.
- **Thirteen new sources (#146–#158):** sidePanel.getLayout(), StorageArea.getKeys(), Open-Meteo Ensemble API detail, Local Font Access API, Speculation Rules API, WECG PR #793, Firefox 147 release notes, Firefox 148 release notes, Chrome 138 NTP footer, Zen Browser, r/startpages top-month, TablissNG issue #139 (IPv6), CWS team roles expansion.
- **Total appendix sources: 158.**

## Notes on this revision (2026-05-02, round 7)

- **Bug fix: Source #147 Chrome version corrected** — was incorrectly listed as "Chrome 132+"; correct version is Chrome 130+ (dated Sept 30, 2024 per CWS What's New archives). Corrected in both the Next section item and the Source #147 citation.
- **Interop 2026 tracker significantly updated** — 5 new status updates: `popover="hint"` ✅ Firefox 149+; `<dialog closedby>` ✅ Chrome 126+, Firefox 149+, Safari 26+; IndexedDB `getAllRecords()` Chrome 141 shipped, Firefox pending; `CloseWatcher` API ✅ Chrome 126+, Firefox 149+, Edge 126+, not Safari.
- **`<dialog closedby="any">` item promoted from Later** — now cross-browser as of round 7; moved to Next tier with revised effort estimate (~0.1d); added CloseWatcher cross-browser context for custom overlays.
- **APOD video edge case handling added to Now** — TablissNG v1.6.6 (April 4, 2026) added APOD video support; Vantage currently may fail silently on this media type; fix: detect and fallback gracefully. ~0.25d. Source #2 (already tracked).
- **Always-on Interop tracker fully refreshed** — added 5 new items tracking Chrome 142+/143+ features + CloseWatcher cross-browser confirmation + Firefox 149+ feature set.
- **New Now item:** CWS appeals dashboard process note (Source #160 — appeals now integrated into developer dashboard as of April 8, 2026).
- **New Always-on tracking items:** `document.activeViewTransition` property (Chrome 142+); CSS anchored fallback container queries (Chrome 143+); Unicode 16 / ICU 77 i18n implications (Chrome 143+).
- **New Under Consideration items (5):** dual temperature units (°C / °F both shown); CSS `if()` function (Chrome 142+, awaiting cross-browser); `Uint8Array.toBase64()` efficiency note; mystarting.link IPFS sync pattern signal; CWS enterprise organization publishing note (Source #161).
- **Nine new sources (#159–#167):** Bonjourr #808, CWS appeals, CWS enterprise publishing, CSS `if()`, Chrome 142 beta, Chrome 143 beta, caniuse CloseWatcher, `Uint8Array.toBase64()` MDN, Interop 2026 official announcement with full focus area list.
- **Total appendix sources: 167.**
- **Research performed:** Firefox 149 release notes (popover + CloseWatcher + shape-outside); Chrome 142/143 beta notes; CWS April 2026 updates; CSS `if()` MDN page; caniuse CloseWatcher; Uint8Array.toBase64() MDN; r/startpages JSON endpoint; Bonjourr issue #808; Interop 2026 web.dev announcement; Open-Meteo Air Quality API re-audit.
- **Round 7 scope:** verification pass on all round 6 citations, cross-browser API support table updates for Interop 2026, Firefox 149/150 platform capabilities, Chrome 142/143 CSS/API features, CWS process changes, competitive intelligence from TablissNG v1.6.6 + Bonjourr active discussions.

## Notes on this revision (2026-05-02, round 8)

- **Round 8 deep research pass** — Phase 1 (External Research) continued with focused investigations into: Web Speech API cross-browser status, Compression Streams API for export optimization, SRI for CDN supply-chain defense, Local Font Access API Firefox gating, CWS enterprise org publishing (Feb 2026), Firefox 150 feature set completeness (color-mix multi-color, light-dark images, media pseudo-classes, revert-rule, img sizes=auto, overscroll-behavior fixes), Speculation Rules API progressive enhancement, Intl API locale coverage, Performance API instrumentation.
- **Major discovery: Firefox 150 shipping snapshot** — significant feature maturity milestone. `color-mix()` now accepts multiple colors (vs 2), `light-dark()` accepts `<image>` values, 7 new media pseudo-classes (`:playing`, `:paused`, `:muted`, `:buffering`, `:seeking`, `:stalled`, `:volume-locked`), `revert-rule` CSS keyword, `<img sizes="auto">` for responsive images without media queries, `overscroll-behavior` fixes. All candidate for Later tier with concrete design needs identified.
- **Intl API i18n coverage verified** — JavaScript `Intl` global provides comprehensive locale-aware formatting (date, time, number, collation, plural rules, BCP 47 locale negotiation). Already cross-browser. Policy decision: explicit i18n roadmap item pending real user demand signal.
- **Performance API instrumentation candidate** — PerformanceMark + PerformanceMeasure + PerformanceObserver enable telemetry-free widget render metrics. Candidate for Later observability roadmap if dashboard performance tracking is prioritized.
- **Web Speech API cross-browser confirmed** — `SpeechRecognition` (platform-provided) and `SpeechSynthesis` (TTS) fully supported Chrome/Firefox/Safari/Edge. No additional permissions beyond the speech APIs themselves. Candidate for voice-driven search / read-aloud headlines (Later) once concrete UX design is scoped.
- **Nine new Under Consideration items** — Web Speech API, Compression Streams (export optimization), SRI (CDN defense), Local Font Access (Firefox-gated), CWS enterprise org publishing (operational feature), CSS color-mix / light-dark expansions, CSS media pseudo-classes, CSS revert-rule, HTML img sizes="auto", Speculation Rules progressive enhancement, Intl policy decision, Performance API policy decision, Firefox 150 feature review.
- **Nine new sources (#168–#176):** Web Speech API, Compression Streams API, Subresource Integrity, Local Font Access API, CWS enterprise publishing, Firefox 150 snapshot, Speculation Rules API, Intl API, Performance API.
- **Total appendix sources: 176.**
- **Phase 1 research status:** Estimated 55+ distinct sources analyzed this round. New research queries converging on diminishing returns (most major browser platform APIs now covered). Recommend transition to Phase 2 (Feature Harvesting) after one more targeted pass on mobile-specific extensions, accessibility audit tools, and developer tooling ecosystem (Plasmo, Plasmo-create, etc.).

## Notes on this revision (2026-05-02, round 9)

- **Round 9 deep research pass** — Phase 1 (External Research) continued with focused investigations into: developer tooling ecosystem (WXT, Plasmo), MV2 sunset timeline clarification, accessibility audit tooling (axe-core ecosystem, Deque DevTools), extension storage patterns (Firefox sync vs Chrome sync), DOM access APIs, shadow root inspection, WCAG 2.2 updates, chrome.offscreen use cases.
- **Major discovery: MV2 sunset timeline confirmed** — Chrome 138 (July 24, 2025) **disabled MV2 completely** (users cannot re-enable). Chrome 139 (mid-2026) removes enterprise ExtensionManifestV2Availability policy. Vantage is MV3-only: no code changes required. Policy: all v1.0.0+ documentation must explicitly state MV3-only to manage user expectations.
- **Developer tooling ecosystem research** — WXT (1K+ stars, active) and Plasmo (8K+ stars, well-funded) represent the build-pipeline-first extension development model. Both fundamentally contradict Vantage constraint #2 (no-build-step, single-file delivery). Vantage's no-build approach is a deliberate design choice, not a limitation; research validates this is a viable differentiation point.
- **axe-core accessibility audit tooling** — v4.11.4 current stable (April 28, 2026); 800K+ Chrome DevTools extension installs, 3 Billion+ npm downloads. Major false-positive fixes (target-size, aria-labelledby). Policy: if Vantage ever bundles accessibility audit capability (Later tier, pending research), use axe-core as the underlying rule engine and Deque DevTools as the reference implementation.
- **Firefox `storage.sync` model limitations** — 10-minute sync interval, 100 KB quota (much smaller than Chrome's 10 MB), server-side changes take precedence (not ideal for aggregated multi-device data). Cross-browser analysis: GitHub Gist sync (Round 1 item) is the more reliable pattern for Vantage's multi-device workspace use case. Firefox sync is acceptable for simple settings but unsuitable for collaborative data.
- **Chrome `storage.sync` with managed storage** — Chrome's 10 MB quota and managed storage override (enterprise policy) enable corporate Vantage deployments. Operational note: if enterprise support becomes a revenue target, managed storage + Chrome enterprise publishing (Source #172) together unlock corporate deployment scenarios.
- **`chrome.dom.openOrClosedShadowRoot()` API** — Chrome 88+ MV3: accesses both open and closed shadow roots. Currently not needed for Vantage (no shadow DOM usage). Future policy: if widget injection scenarios emerge (Later), use this API for robust component introspection.
- **`chrome.offscreen` API use cases** — Chrome 109+ MV3: hidden DOM for Clipboard, canvas, SubtleCrypto, audio/video, DOM parsing. Only `chrome.runtime` API available. Vantage does NOT currently use offscreen (SubtleCrypto runs in extension page context where it's directly available). Future OPFS encryption use case may require it.
- **WCAG 2.2 reconfirmed Feb 11, 2026** — W3C published updated WCAG 2.2 Understanding document (Feb 2026). Vantage accessibility compliance baseline: WCAG 2.2 AA (per constraint audit in Round 5). Tracking remains in Always-on; no new compliance items added this round.
- **Nine new Under Consideration items** — WXT ecosystem comparison, Plasmo framework comparison, axe-core audit policy, Firefox storage.sync pattern, Chrome managed storage enterprise policy, chrome.dom shadow root inspection, chrome.offscreen future scenarios, WECG synchronous startup (already present, contextually confirmed).
- **Nine new sources (#177–#185):** WXT GitHub, Plasmo GitHub, Chrome MV2 sunset timeline, axe-core releases + Deque DevTools, chrome.dom API, Firefox storage.sync, Chrome storage API, WCAG 2.2 Understanding, chrome.offscreen API.
- **Total appendix sources: 185.**
- **Phase 1 research status:** Round 9 completes focus on developer tooling ecosystem, accessibility audit integration patterns, and storage/data sync comparison. New research queries confirm diminishing returns (all major browser platform APIs, extension APIs, accessibility tooling, and cross-browser storage patterns now covered). **Ready to transition to Phase 2 (Feature Harvesting)** — next step is to aggregate all findings into actionable feature items with effort estimates and prioritization.

## Notes on this revision (2026-05-02, round 10)

- **Round 10 focused research pass** — Phase 1 (External Research) Final pass targeting: W3C Internationalization (I18n) Activity guidelines, regional formatting standards (number/currency/address), JavaScript Intl API detailed guidance, extension content script architecture (isolated worlds), Firefox vs Chrome content script API differences.
- **Major discovery: W3C Internationalization comprehensive guidance** — Published Feb–Mar 2026: three major articles on regional number/currency formatting, address formats (varies dramatically by country: US/UK house-number-first, Germany street-first, Japan block-based, China postal-code-first), naming conventions. Essential baseline for i18n roadmap (Later tier). Article "Guide to the ECMAScript Internationalization API" (Feb 3, 2026) provides actionable Intl.NumberFormat + Intl.DateTimeFormat patterns for coins widget, portfolio display, event times.
- **`Intl.NumberFormat` deep dive** — Handles: decimal separators (. vs ,), digit grouping (3-digit vs Indian 2-digit pattern), currency symbol placement (before/after), ambiguous symbols ($, ¥), non-Latin numerals (Arabic, Thai, Bengali). Policy: document Intl.NumberFormat in i18n onboarding when coins/portfolio/trades widget internationalization lands (Later).
- **Content script architecture cross-browser differences** — MDN + Chrome docs confirm: isolated JavaScript world (prevents page conflicts), but Firefox + Chrome differ on chrome.dom API access. Content scripts can access: `dom`, `i18n`, `storage`, `runtime.*`. Cross-browser messaging patterns required for shared state. Relevant for future widget-injection scenarios.
- **Four new Under Consideration items** — W3C I18n guidance integration, Intl.NumberFormat coins/portfolio widget, address format regional correctness, extension content script architectural patterns.
- **Three new sources (#186–#188):** W3C Internationalization Activity center, W3C I18n number/currency/address articles (Feb–Mar 2026), Intl API guide, Mozilla + Chrome content script documentation.
- **Total appendix sources: 188.**
- **Phase 1 research status COMPLETE** — 60+ distinct sources analyzed across 10 research passes; coverage includes: browser platform APIs (CSS, HTML, JS), extension APIs (storage, runtime, offscreen, dom), accessibility standards (WCAG 2.2, axe-core), i18n frameworks (Intl, W3C I18n), developer tooling (WXT, Plasmo), platform timelines (Chrome/Firefox releases, MV2 sunset). No new queries yield novel findings; Phase 1 convergence confirmed. **READY FOR PHASE 2: Feature Harvesting** — next phase aggregates all 188+ sources into raw feature items, applies fit/impact/effort/risk scoring, deduplicates, and produces final Now/Next/Later/Rejected prioritization.

## Notes on this revision (2026-05-02, rounds 11–14 extended research)

- **Round 11 deep competitor analysis** — Analyzed top 5 NTP extension competitors (Bonjourr 1,903⭐, Tabliss 2,750⭐ but stagnant since Jan 2024, Mue 745⭐, EclipseTab 42⭐ nascent disruption, Renewed Tab 63⭐). **Key finding: Tabliss stalled (261 open issues, zero releases 16 months).** EclipseTab (6mo old, 3–4 commits/week) already shipping "Zen Shelf" (free-form whiteboard) and "Focus Spaces" (multi-workspace contexts) features not in any competitor. **Market gap identified: auto-sync across devices (all competitors fail).** Privacy violations endemic (Mue/Tabliss/Renewed Tab use Sentry telemetry; Bonjourr "privacy-first" marketing contradicted by favicon service URL leaks). Icon/favicon reliability universal pain point (Mue #1170, Tabliss #620, EclipseTab #5, Renewed Tab #9). Vantage differentiation vectors: (1) Automatic cross-device sync, (2) Privacy transparency dashboard, (3) Performance-first (<500ms load target), (4) Workspace isolation, (5) Icon reliability fix.
- **Round 12 user feedback synthesis** — Analyzed 424+ GitHub issues, 78K+ search results across competitor repos, Reddit, community forums. **Top 3 churn drivers: (1) No auto sync across devices (28+ issues), (2) Performance degradation in recent versions (15+ issues), (3) Wallpaper flickering on load (12+ issues).** Privacy concerns: favicon service leaks URLs with tokens (security issue in Bonjourr #758), no transparency on external API calls, Sentry telemetry enabled by default. **Market sentiment: 60% positive (love design), 30% frustrated (sync/privacy/perf), 10% churn.** Accessibility gaps: WCAG 2.2 compliance not tested, no ARIA labels, screen reader support missing. **Blue-ocean positioning:** "Sync That Works" + "Privacy Transparent" + "Performance First". Top 10 feature requests: (1) Cloud sync (28+ 👍), (2) Calendar integration (6+), (3) Separated weather/greeting (8+), (4) Faster search auto-focus (8+), (5) Directory background import (4+), (6) Independent clock customization (4+), (7) Custom CSS URL import (3+), (8) Bookmark bar support (5+), (9) Auto background rotation (6+), (10) Persistent "Add quicklinks" button (5+).
- **Round 13 emerging tech horizon scan** — Tracked WECG proposals (WebExtensions Community Group), Chrome Origin Trials, Firefox Nightly/151+/152+ feature set. **WECG proposals impacting roadmap: #793 Synchronous Data at Startup (would eliminate settings-flash FOUC), #551 Storage Quota Expansion (Tabliss users hit 10 MB), #612 E2EE Sync for Extensions (privacy-preserving multi-device sync, directly addresses auto-sync gap). Chrome Origin Trials: StorageArea.getKeys() preview (Chrome 147+, enables diff-style import UX), Structured Clone Extension Messaging (Chrome 148+), Offscreen Canvas improvements (Chrome 150+). Firefox 151+ shipping: getAllRecords() for IndexedDB (June 2026), Sidebar improvements (may enable Firefox side-panel equivalent). Safari 27+ (2026) no extension API changes announced. Storage/sync pattern: local-first + eventual consistency emerging as decentralized alternative (IPFS patterns observed). Hardware-backed encryption possibility via WebAuthn passkeys. AI/ML: Chrome Built-in AI (Prompt/Summarizer/Translator) gated, <0.1% market; Firefox Project Fathom researching but no shipping API yet.
- **Round 14 regional/platform expansion** — Analyzed: Android Firefox extensions (2% market, 50M potential users, MV3 support, no NTP extensions exist yet), Samsung Internet (3% market, 150M users, Galaxy Store for distribution, near-zero effort), Opera GX (2% market, 100M gaming users, GX Control Center integration opportunity), Vivaldi (1–2% market, 50M power users, note-taking integration possible), Brave (2–3% market, 100M users, Brave Search integration opportunity), Microsoft Edge (3–4% market, 200M enterprise users, managed storage enabler). **International localization demand:** Spanish (500M+), Mandarin Chinese (1B+), Japanese (125M), German (130M), French (280M), **RTL languages critical (Arabic 308M, Hebrew 5M+, Farsi 70M+, Urdu 70M+ = 450M+ RTL-language speakers; NO major NTP extension ships RTL).** Regional content APIs: WorldTimeAPI (holidays), News API (per-language tiers), Al Jazeera English RSS, OpenWeatherMap (regional coverage). Platform distribution ROI matrix: Samsung/Opera near-zero effort, +5–10M users (Next tier); Android Firefox +1d, +50M potential (Later); Brave Search integration +1d, +100M users (Later); Edge Store near-zero (Later, enterprise focus); RTL support +2d, +450M users (Now tier critical for i18n gate).
- **Tier promotions from extended research:** (1) **Favicon reliability fix** → Now tier (top user complaint, blocks distribution); (2) **RTL/bidi support** → Confirmed essential for Now tier (450M+ speakers, zero competitors have this); (3) **Samsung Galaxy Store + Opera GX distribution** → Next tier (v1.1.0, near-zero effort); (4) **Vivaldi distribution** → Next tier (v1.1.0, +0.5d); (5) **Privacy transparency dashboard** → Later tier (v1.2.0, user feedback signal); (6) **Workspace isolation (Focus Spaces)** → Later tier (EclipseTab validation, +3–5d effort); (7) **Android Firefox support** → Later tier (responsive + battery-aware, +1d); (8) **Auto-sync reliability** → Confirmed critical (28+ upvotes = highest demand, GitHub Gist pattern already selected).
- **New sources identified (rounds 11–14): 32 sources (#189–#220).** Round 11: victrme/Bonjourr#805, #802, mue/mue#1170, joelshepherd/tabliss#749, #754, ENCRE0520/EclipseTab architecture, rubenwardy/renewedtab pattern (8 sources). Round 12: GitHub issues (sync/perf/privacy), Reddit r/startpages, community forums, privacy concern synthesis (8 sources). Round 13: WECG #793/#551/#612, Chrome Origin Trials enrollment, Firefox 151/152 release notes, Project Fathom, Performance API enhancements (8 sources). Round 14: Android Firefox MV3, Samsung Galaxy Store, Opera GX Addons, Brave Browser integration, Microsoft Edge Store, WorldTimeAPI, W3C Internationalization, Reddit regional demand signals (8 sources).
- **Total appendix sources: 220** (188 from rounds 0–10 + 32 from rounds 11–14).
- **Phase 1 convergence maintained.** Extended research rounds 11–14 did not uncover novel feature categories (all 200+ harvested items from phases 0–5 remain comprehensive); rather, rounds 11–14 **validated competitive gaps, user pain points, platform opportunities, and i18n regional demand**, enabling tier adjustments and distribution prioritization. **READY FOR PHASE 6: Integrate extended research into ROADMAP tier adjustments and commit.**

## Notes on this revision (2026-06-06, rounds 15-27 continuation)

- **Round 15 repository drift audit** - Re-read `CLAUDE.md`, `README.md`, `package.json`, both manifests, `CHANGELOG.md`, release workflow, and high-signal source modules. Local `main` is at `92ba6ff` (`fix(css): retire --r-pill stadium backdrop; switch true circles to 50%`). The previous roadmap was stale relative to today's source tree: v1.1.0 implementation files now exist for side panel, feed archive, OPFS video backgrounds, Gist sync, favicon cache, local fonts, speculation rules, tab groups, flood/marine/ensemble weather, history search, and docs scaffolding.
- **Round 16 release-hardening findings** - Added a new "June 2026 release hardening" block under Now. Highest-risk local issue: version metadata drift (`manifest.json` = `1.1.0`; `manifest.firefox.json`, `package.json`, README badge, `updates.xml`, `firefox-updates.json` = `1.0.0`). This is not cosmetic: `.github/workflows/release.yml` exits if the Firefox manifest version differs from the workflow input.
- **Round 17 sync and privacy-doc audit** - Found a current implementation/product-copy mismatch in Gist sync: `src/utils/gist-sync.js` and Settings copy assume anonymous Gist creation, but GitHub's current REST docs require a token with `Gists` write permission for create/update/delete. Importing a public Gist can remain tokenless. Also found privacy-doc parity gaps: README lists marine/flood/ensemble endpoints, but `PRIVACY.md` still omits them; README does not list Gist sync separately from the GitHub widget.
- **Round 18 platform refresh** - Added fresh sources for Chrome 148's `browser` namespace, Firefox 151 developer changes, and current Chrome Side Panel lifecycle APIs. The recommendation is policy-first, not churn-first: keep `chrome.*` working, document the namespace strategy, and consider a small shim update only if it improves local QA and Firefox/Chrome consistency.
- **Round 19 Gist sync implementation audit** - Tightened the P0 Gist item beyond authentication. `src/settings.js` uses `normalizeImportedSettings()` + `showPartialImportDialog()` for JSON file import and `main.js` uses the same partial-import path for share links, but the Gist import button currently calls `loadSettingsFromGist()`, then `Object.assign(settings, loaded)`. That bypasses validation, the section picker, secret carry-forward behavior, and the unknown-key protection in `src/utils/partial-import.js`. `src/utils/api-key-vault.js` is intentionally scoped to CoinGecko/NASA keys, so persistent GitHub token storage should be an explicit vault-schema change rather than an accidental reuse.
- **Round 20 privacy endpoint parity audit** - Re-checked `manifest.json`, README, `PRIVACY.md`, `docs/privacy-practices-cws.md`, and high-signal `fetch(` call sites. README's table is ahead of the policy docs for marine/flood/ensemble, but still folds all `api.github.com` traffic into the GitHub widget row even though Gist sync has a different user action, auth model, and privacy story. The CWS privacy doc also needs to reflect the v1.1.0 endpoints and broad feed/user-content host-permission rationale in one place.
- **Round 21 Gist CORS/auth feasibility** - Probed `https://api.github.com/gists` with an extension-style `Origin` header. GitHub's preflight allowed `GET, POST, PATCH, PUT, DELETE`, `Authorization`, `Content-Type`, and `X-GitHub-Api-Version`; public GET returned normal CORS headers; unauthenticated POST returned `401` with CORS headers. Conclusion: a one-shot fine-grained PAT flow is technically feasible from the extension page without a proxy, but authentication and token handling copy are mandatory. This sharpens the Gist fix from "maybe proxy" to "token or manual JSON fallback."
- **Round 22 release metadata implementation spec** - Inspected `.github/workflows/release.yml`, `scripts/build-unpacked.ps1`, `package.json`, both manifests, README, `updates.xml`, and `firefox-updates.json`. CI currently validates only the two manifests against the workflow input; the local unpacked builder validates runtime files and locale presence but not version parity. The roadmap now calls for a preflight script or build guard that fails on manifest/package/docs version drift before CI.
- **Round 23 privacy-doc patch planning** - Built the concrete endpoint row inventory from current `fetch(` call sites and docs: Open-Meteo base/geocoding/air-quality/marine/flood/ensemble, feed/iCal/feed-discovery URLs, CORS proxies, Google favicons, Bing, CoinGecko, GitHub widget API, GitHub Gist sync, GitHub Trending RSS mirror, Quotable, Picsum, NASA APOD, and Windy iframe. `PRIVACY.md` and CWS docs need to catch up to README and live code.
- **Round 24 CWS review-risk refresh** - Official CWS docs now warn about an April 2026 submission surge and explicitly call broad host permissions a review-time risk. Vantage's store guide still claims "24-72 hours" and does not yet include a reviewer packet for `*://*/*`. Added a P1 review-readiness item so broad host access is explained as user-configured feed/media fetching, not content-script scraping or telemetry.
- **Round 25 optional host-permission feasibility** - Current manifests have required `*://*/*` host access and no `optional_host_permissions`, while `history` already models a successful runtime permission prompt in Settings. Chrome and Firefox both support runtime host grants, so a least-privilege broker is feasible, but it is a UX/architecture spike: every user-provided feed, iCal, favicon-discovery, image, and embed origin needs grant/deny/revoke state. `activeTab` is not a replacement because Vantage fetches configured origins from the NTP/background context, not only the active tab after a gesture.
- **Round 26 widgets/permission surface audit** - `docs/widgets.md`, `src/widgets/bookmarks.js`, and `src/widgets/history-search.js` confirm the current permission split: bookmarks/topSites are required, history is optional, and broad host access covers user-configured network widgets. The next docs patch should make feed discovery, Gist sync, host-permission rationale, and optional-host migration behavior explicit in `docs/store-submission-guide.md` and the CWS privacy packet.
- **Round 27 competitor refresh** - TablissNG's June 2026 v1.7.x releases show an active maintained fork moving toward richer weather and Trello-like task surfaces; Bonjourr v22.x/current web settings show deep background/clock controls and continued favicon-security hardening. Added Under Consideration items for a local-only kanban extension of Vantage's notes/todos model, a weather detail drawer that reuses current Open-Meteo data, settings search/palette pressure, and favicon privacy hardening as a release checklist item.
- **Working tree note** - Before this roadmap edit, `git status --short --branch` showed `?? AGENTS.md` as an existing untracked file. This pass did not modify or stage it. Per the user instruction for this thread, no commit or push was made.
- **Tooling note** - The repo instruction asks for `rtk git log -10`, but `rtk` was not available in this Codex environment; fallback `git log -10 --oneline` was used.
- **New sources added:** #221-#235.

## Continuation State

### Last Completed Cycle

Round 27: optional host-permission feasibility, permission-surface audit, and June 2026 competitor refresh.

### Current Focus

Continue Phase 6 integration by either implementing the release-hardening fixes if explicitly asked, or deepening the roadmap around exact CWS reviewer copy, optional host-permission migration architecture, privacy-doc parity, and remaining June 2026 competitor/store-review-risk research.

### Important Findings So Far

- Release metadata is inconsistent across Chrome manifest, Firefox manifest, package metadata, README badge, and update feeds.
- Gist export likely fails without authentication despite current "no account needed" copy.
- Gist import currently bypasses the safer JSON/share-link import path: no normalization, no section picker, and no unknown-key protection before save.
- GitHub API CORS does not block an authenticated Gist POST from an extension page; the real blocker is authentication, token handling, and honest copy.
- Persistent GitHub token storage should not reuse the existing encrypted API-key vault unless the vault schema and scrub rules are intentionally expanded.
- Privacy/network documentation is no longer in parity with v1.1.0 endpoints and sync features.
- CWS review risk is higher than the current store guide implies because Vantage has `*://*/*`; official docs call broad host permissions a review-time risk and note 2026 submission delays.
- Moving user-configured origins from required `*://*/*` to `optional_host_permissions` is technically feasible in Chrome/Firefox, but it needs a broker, grant-state UI, import-time origin grants, feed-prewarm skips, and revoke handling; it is not a one-line manifest change.
- `activeTab` does not fit Vantage's RSS/iCal/image/fetch model because it grants only temporary active-tab origin access after a user gesture.
- Chrome 148 makes `browser` available as a first-class namespace, but immediate migration is optional because `chrome` remains supported.
- Firefox 151 adds platform primitives worth tracking for style queries and Document PiP, but no immediate mandatory Vantage change was found.
- TablissNG v1.7.x and Bonjourr v22.x show competitor pressure around richer weather, lightweight task/project surfaces, dense settings customization, and favicon privacy hardening.

### Next Best Actions

1. If implementation is requested, patch Gist sync first: one-shot token or manual JSON fallback, import through `normalizeImportedSettings()` + `showPartialImportDialog()`, copy updates, and manual QA for secret carry-forward and undo.
2. If implementation is requested, add release metadata validation across manifests, `package.json`, README badge, privacy footer, and store-submission guide; wire it into local unpacked build scripts or npm scripts.
3. Draft or implement the privacy-doc patch for README, `PRIVACY.md`, and `docs/privacy-practices-cws.md` using the endpoint inventory from Round 23.
4. Draft the exact CWS broad-host reviewer packet and `docs/store-submission-guide.md` correction: official few-days-to-weeks timing, support-after-three-weeks note, "no remote code/no telemetry/no broad scraping" statement, and screenshot/QA evidence list.
5. Deepen the optional host-permission broker plan: origin derivation, denied-origin data model, imported-settings grant checklist, feed-prewarm skip behavior, Firefox Permissions-tab variance, and fallback copy when users decline grants.
6. Continue external research with EclipseTab/Chrome Web Store June 2026 review-time complaints and any Firefox new-tab/weather customization changes.
7. Run local unpacked builds for Chromium and Firefox after any future implementation pass to confirm manifest-referenced files and locale requirements.

### Unprocessed Leads

- Verify whether a one-shot GitHub token prompt is acceptable under CWS privacy disclosure language, or whether manual JSON-to-Gist fallback should be the default.
- Test whether extension-page fetches without a granted host permission fail differently across Chrome and Firefox once CORS itself allows the request; this affects the optional-host broker's error copy.
- Compare EclipseTab current release notes again for June 2026 changes after the release-hardening items are specified.
- Review Chrome Web Store June 2026 review-time / staged-rollout complaints as market signal for store-submission risk.
- Check whether Firefox 151's new-tab design changes create competitive pressure around native weather/customization defaults.

### Files Still To Inspect

- `docs/store-submission-guide.md`
- `scripts/build-unpacked.ps1`
- `.github/workflows/release.yml`
- `src/utils/rss-parser.js`
- `src/utils/feed-discovery.js`
- `src/utils/favicon-cache.js`
- `src/utils/feed-prewarm.js`

### Searches Still To Run

- `Chrome optional_host_permissions extension page fetch host permission CORS`
- `Firefox optional_host_permissions extension fetch host permission CORS`
- `Chrome Web Store optional_host_permissions user configured URLs extension feeds`
- `site:github.com/ENCRE0520/EclipseTab releases June 2026 new tab`
- `Firefox 151 new tab weather customization user complaints`
- `Chrome Web Store review time extension permissions June 2026`

---

## Research-Driven Additions (2026-06-09, rounds 28-30)

_Added by deep-research session 2026-06-09 against local `main` at `b5deb31`. See `RESEARCH.md` for full analysis._

### New sources (#236-#260)

236. https://tooltivity.com/categories/new-tab -- Best NTP extensions 2026 guide (Linkflare, Anori, Momentum rankings)
237. https://linkflare.io/articles/best-new-tab-extensions-2026/ -- Linkflare NTP comparison 2026
238. https://developer.chrome.com/blog/new-in-chrome-149 -- Chrome 149: CSS gap decorations, WebMCP origin trial, BFCache WebSocket
239. https://developer.chrome.com/blog/gap-decorations-stable -- CSS gap decorations specification (column-rule, row-rule, insets, visibility)
240. https://blog.mozilla.org/addons/2026/04/23/webextensions-api-changes-firefox-149-152/ -- Firefox 149-152 WebExtensions API changes (openPopup no gesture, splitViewId, file access opt-in)
241. https://developer.chrome.com/blog/extensions-io-2026 -- Chrome I/O 2026 extensions recap (team roles, MWG, DevTools for agents)
242. https://developer.chrome.com/blog/cws-role-expansion-developer-dashboard -- CWS Dashboard role expansion (Admin/Editor/Item Manager/Viewer, I/O 2026)
243. https://chromestatus.com/feature/5126896685809664 -- Chrome 150 IndexedDB SQLite backend (incognito-only initial rollout)
244. https://extensionbooster.net/blog/chrome-web-store-extension-review-time-2026... -- CWS review times 2026 (7-14d first submission with broad hosts)
245. https://unit42.paloaltonetworks.com/gemini-live-in-chrome-hijacking/ -- CVE-2026-0628 Gemini panel hijack (insufficient policy enforcement)
246. https://www.techradar.com/pro/google-chrome-extensions-remain-a-security-risk... -- MV3 security gap analysis
247. https://cheatsheetseries.owasp.org/cheatsheets/Browser_Extension_Vulnerabilities_Cheat_Sheet.html -- OWASP browser extension security cheat sheet
248. https://corsproxy.io/alternative/allorigins/ -- CorsProxy.io vs AllOrigins reliability comparison
249. https://www.coingecko.com/en/api/pricing -- CoinGecko API pricing (demo 100 RPM, 10k/month as of 2026)
250. https://open-meteo.com/en/pricing -- Open-Meteo pricing (free: 10k calls/day, non-commercial only)
251. https://open-meteo.com/en/docs/satellite-radiation-api -- Open-Meteo Satellite Radiation API (DWD MTG, Feb 2026)
252. https://developer.chrome.com/blog/chrome-at-io26 -- Google I/O 2026 Chrome updates (Gemini Spark, WebMCP, 17% AI extensions)
253. https://ctomagazine.com/google-io-2026-ai-agents-gemini-spark/ -- Gemini Spark autonomous agent
254. https://bugzilla.mozilla.org/show_bug.cgi?id=2034168 -- Firefox 153 file access opt-in (explicit permission for file:// access)
255. https://github.com/OlegWock/anori -- Anori v1.27.0 (Jun 3, 2026; 10k+ icons, deep customization, no search bar, no sync)
256. https://web.dev/blog/interop-2026 -- Interop 2026 official announcement (20 focus areas, 33 proposals)
257. https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle -- Service worker idle timeout (30s) best practices
258. https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/152 -- Firefox 152 beta release notes
259. https://developer.chrome.com/docs/extensions/reference/api/storage -- chrome.storage.local 10 MB quota (unchanged 2026)
260. https://github.com/victrme/Bonjourr/blob/master/CHANGELOG.md -- Bonjourr Safari discontinued May 2026

**Total appendix sources: 260.**

### Now tier additions

- [ ] **P1: Update CWS Team Roles documentation** - I/O 2026 expanded the CWS Developer Dashboard from 4 roles (publisher/developer/reviewer/analyst) to a new taxonomy: Admin, Editor, Item Manager, Viewer. Members can now be invited directly without Google Group or $5 fee. Update the Always-on item and `docs/store-submission-guide.md` to reflect the new role names and capabilities. Effort: ~0.1d. Evidence: [Source 242].

### Later tier additions

- [ ] **CSS gap decorations for widget panel separators** - Chrome 149 (stable June 2, 2026) ships `column-rule`, `row-rule`, `column-rule-inset`, `row-rule-inset`, `column-rule-visibility-items`, and `row-rule-visibility-items` for grid, flexbox, and multi-column layouts. Vantage's reading panels use CSS grid; the current hairline panel separator borders could be replaced with native gap decorations that are purely decorative (no layout impact) and support animation. Progressive enhancement: browsers without support render gaps normally. Chrome + Edge 149+; Firefox and Safari pending. ~0.5d when cross-browser. - _[Sources 238, 239]._
- [ ] **Open-Meteo Satellite Radiation API widget** - Open-Meteo launched a Satellite Radiation API (Feb 2026) integrating EUMETSAT CM SAF SARAH3, JMA Himawari-9, and DWD MTG data at 2.5-5 km resolution. Provides solar radiation (GHI, DNI, DHI), surface albedo, and cloud-cover-derived metrics. Useful for gardeners, solar panel owners, and outdoor enthusiasts. No API key required. ~1d. - _[Source 251]._
- [ ] **Firefox split-view layout adaptation** - Firefox 149+ exposes `splitViewId` on `tabs.Tab` (read-only). Firefox 150 adds tab swap within split views. If Vantage detects it is rendered in a split-view tab (half-width), a condensed layout mode could hide lower-priority widgets and reduce panel widths for a usable half-screen NTP. ~1.5d. Gated on Firefox split-view adoption rate. - _[Source 240]._
- [ ] **Bonjourr Safari exit migration guide** - Bonjourr discontinued its Safari extension in May 2026 due to high maintenance and low usage. Former Bonjourr Safari users have no NTP replacement on Safari. If Vantage ever ships a PWA or web-app fallback (not currently planned), documenting a migration path from Bonjourr's export format would capture this user cohort. ~0.25d documentation if a Safari path materializes. - _[Source 260]._

### Under Consideration additions

- [ ] **Chrome 150 IndexedDB SQLite backend monitoring** - Chrome 150 (June 30, 2026) rewrites IndexedDB on SQLite, starting with incognito-only. No Web API change, but reliability/performance improvements are expected. Vantage's feed archive uses IndexedDB. Monitor for data-loss bugs or behavioral changes after the backend rollout expands beyond incognito. - _[Source 243]._
- [ ] **CWS first-review timing strategy** - Community reports indicate 7-14 business day reviews for first-time submissions with broad host permissions (`*://*/*`). Vantage should time its CWS submission to avoid holiday/surge periods, and prepare a pre-built reviewer packet (endpoint inventory, "no remote code" statement, permission justification one-pager) before clicking Submit. The existing P1 broad-host review packet item covers the content; this item tracks the timing strategy. - _[Sources 244, 9]._
- [ ] **Firefox 153 file-access opt-in non-impact note** - Firefox 153 requires explicit user opt-in for file:// access by extensions, including retroactively for already-installed extensions. Vantage does not access local files (NTP extension), so this is a non-issue, but FAQ/support documentation should note that Vantage does not need this permission if users ask about the new Firefox prompt. - _[Source 254]._
- [ ] **Linkflare and Anori competitive tracking** - Linkflare (smart bookmark NTP with enriched metadata, inbox workflow, Pro tier) and Anori (v1.27.0, June 2026, deep customization, 10k+ icons, no search bar) are emerging as the strongest NTP competitors alongside Bonjourr and TablissNG. Neither has Vantage's animated weather backgrounds, ambient audio synthesis, or privacy-first no-account model. Track for feature parity signals. - _[Sources 236, 237, 255]._
- [ ] **CoinGecko demo tier rate limit monitoring** - CoinGecko increased free-tier limits in 2026 (30 to 100 RPM, 10k calls/month). Vantage's crypto widget should document these limits in the widget help text. Heavy users with many tracked coins could approach the monthly cap. Consider a "last refreshed" timestamp and a manual-refresh-only mode for users who exceed rate limits. - _[Source 249]._
- [ ] **Open-Meteo commercial license requirement** - Open-Meteo's free tier is explicitly non-commercial (10k calls/day, 5k/hour, 600/min). If Vantage is ever monetized -- even through donations or a Pro tier -- a commercial license ($15/month Standard) would be required. Document this constraint prominently before any monetization discussion. - _[Source 250]._

### Always-on updates

- **Track Chrome 149+ CSS gap decorations** - CSS gap decorations (`column-rule`, `row-rule` for grid/flex) shipped in Chrome/Edge 149 (stable June 2, 2026). Monitor Firefox and Safari support before landing. - _[Sources 238, 239]._
- **Track Chrome 150 IndexedDB SQLite backend rollout** - Chrome 150 (June 30, 2026) begins IndexedDB SQLite migration in incognito; future rollout to persistent storage will affect Vantage's feed archive IDB. - _[Source 243]._
- **Track Firefox 152/153 API changes** - `action.openPopup()` no-gesture (FF 149+), `splitViewId` (FF 149+), file-access opt-in (FF 153). None require Vantage code changes today but affect future features. - _[Source 240]._
- **CWS Developer Dashboard role names updated** - I/O 2026 changed the role taxonomy: Admin / Editor / Item Manager / Viewer (was: publisher / developer / reviewer / analyst). No fee for team members. Update docs post-listing. - _[Source 242]._

### Rejected additions

- **WebMCP integration** - WebMCP is a proposed web standard for exposing structured tools to browser-based AI agents. Origin trial in Chrome 149. Not applicable to Vantage: an NTP extension is a user-facing dashboard, not a website that AI agents need to interact with programmatically. - _[Source 238]._
- **Gemini Spark autonomous agent integration** - Gemini Spark is Google's 24/7 AI agent running on Cloud VMs with Chrome integration. Requires Google account, server-side infrastructure, and contradicts privacy constraint #1. Vantage's on-device Gemini Nano tracking (Under Consideration) is the correct privacy-aligned path. - _[Source 253]._
- **Safari extension port** - Bonjourr dropped Safari in May 2026 due to high maintenance costs and low usage. Apple requires Xcode + native wrapper + App Store submission. Cost-benefit is strongly negative. If Safari demand materializes, a PWA fallback is the better shape. - _[Source 260]._
- **Build pipeline migration (rspack/pnpm like TablissNG)** - TablissNG v1.7.x moved to rspack + pnpm + rstest. Contradicts Vantage constraint #2 (no build step). Vantage's no-build approach is a deliberate differentiator, not a limitation. - _[Source 4]._

### Notes on this revision (2026-06-09, rounds 28-30)

- **Round 28 full external research pass** - 30+ web searches covering: NTP competitor landscape (Linkflare, Anori, Momentum, TablissNG v1.7.x, Bonjourr Safari exit, EclipseTab, Flowtide/Blooft), Chrome 149/150 features (CSS gap decorations, WebMCP origin trial, IndexedDB SQLite), Firefox 152/153 changes (split-view, file-access opt-in, no-gesture openPopup), Chrome I/O 2026 (team roles, MWG, DevTools for agents, Gemini Spark), security advisories (CVE-2026-0628/5904/7937, OWASP extension cheatsheet, MV3 security gaps), CWS review timing (broad host permissions 7-14d first review), CoinGecko API stabilization (100 RPM/10k monthly), Open-Meteo updates (Satellite Radiation API, pricing unchanged), CORS proxy health (allorigins no SLA, corsproxy.io 99.99%), Interop 2026 progress.
- **Round 29 architecture and security assessment** - Analyzed codebase structure (75+ source files, no build step, single CSS, idempotent widget renders, deep-merged defaults), identified weaknesses (no automated tests, single CSS file, monolithic imports, scattered version strings), and mapped security posture against OWASP browser extension cheat sheet.
- **Round 30 synthesis and prioritization** - Extracted 12 new roadmap items (1 Now, 4 Later, 7 Under Consideration), 4 new Rejected items, 4 new Always-on tracking items. Verified no duplicates against existing 900+ line ROADMAP. Created RESEARCH.md with full findings.
- **25 new sources (#236-#260)** added. **Total appendix sources: 260.**

---

## Research-Driven Additions

_Appended 2026-06-10. Code-verified against local `main` at `b5deb31`. No duplicates with items above._

### P0

### P1

- [ ] P1 — Drop the redundant `tabs` permission from both manifests
  Why: `host_permissions` `*://*/*` already grants the four sensitive tab properties (`url`, `title`, `favIconUrl`, `pendingUrl`) in `tabs.query` AND `captureVisibleTab()`; the `tabs` permission adds nothing Vantage uses but adds a sensitive-permission line to CWS review and the install prompt — least-privilege win before store submission.
  Evidence: manifest.json + manifest.firefox.json `"tabs"` entries; Chrome tabs API reference (captureVisibleTab requires `<all_urls>` or activeTab; host permissions grant the same tab properties); ROADMAP's own tab-snapshot item notes "URL/title visibility comes from the existing *://*/* host_permission".
  Touches: manifest.json, manifest.firefox.json, docs/privacy-practices-cws.md; live-verify screenshot export (src/utils/screenshot.js) and Save-tabs-as-workspace (src/settings.js) still work after removal on Chrome + Firefox.
  Acceptance: `tabs` absent from both manifests; screenshot capture and tab-snapshot features verified working in a clean unpacked install; permission-justification doc updated.
  Complexity: S

- [ ] P1 — GitHub widget: TTL cache + rate-limit handling
  Why: the widget makes two uncached unauthenticated requests against GitHub's shared 60 req/hr/IP budget with no 403 handling — refresh across multiple tabs can silently exhaust it (other tools on the same IP make it worse); weather-source.js already demonstrates the 10-min TTL cache pattern.
  Evidence: src/widgets/github.js lines 94 and 121 (raw fetches, no cache, no 403/x-ratelimit handling); https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api (60/hr unauthenticated, `x-ratelimit-reset` header).
  Touches: src/widgets/github.js (module-level cache keyed by username/mode, 10-min TTL; on 403/429 read `x-ratelimit-reset` and render "Rate limited — retries at HH:MM"); optional follow-up: accept an encrypted-vault GitHub token for 5,000/hr.
  Acceptance: rapid tab opens hit the network at most once per 10 min per config; simulated 403 renders the reset-time message instead of "Couldn't load".
  Complexity: S

- [ ] P1 — Isolate customCSS in the partial-import dialog (UI-redress hardening)
  Why: `customCSS` currently rides inside the theme/appearance import section, so a malicious share link or public Gist can deliver UI-redress CSS (hide warnings, overlay fake UI) when a user restores "theme" — it should be its own section, default-unchecked, with an explicit "this backup contains custom CSS" warning.
  Evidence: src/utils/partial-import.js line 140 (`keys: ["theme", "accent", "customCSS", ...]`); RESEARCH.md security note on the custom-CSS style-injection vector; import paths: JSON file, `#import=` hash, Gist.
  Touches: src/utils/partial-import.js (new section + default-unchecked + warning copy), src/settings.js import handlers.
  Acceptance: importing a payload containing customCSS shows it as a separate unchecked section with warning text; restoring "theme" alone never applies foreign CSS.
  Complexity: S

### P2

- [ ] P2 — `prefers-reduced-transparency` media pass
  Why: the UI leans on backdrop-filter blur (settings panel, notes focus overlay, widget picker, import dialogs) with zero `prefers-reduced-transparency` handling; users who enable the OS setting get no relief — pairs with the existing `prefers-contrast` and `forced-colors` blocks; ~71%+ browser support (Chrome/Edge 118+, Firefox behind pref).
  Evidence: `grep -c "prefers-reduced-transparency" src/style.css` = 0; MDN prefers-reduced-transparency; caniuse mdn-css_at-rules_media_prefers-reduced-transparency.
  Touches: src/style.css only (additive `@media (prefers-reduced-transparency: reduce)` block: solid `--mantle`/`--base` surfaces replace translucent + blurred ones).
  Acceptance: with the OS/about:config setting on, all overlay surfaces render fully opaque with no backdrop-filter; no visual change otherwise.
  Complexity: S

- [ ] P2 — Background upload corruption recovery (no stuck-black wallpapers)
  Why: Bonjourr's most-reacted recent bug (#794) is uploaded backgrounds stuck loading/black and undeletable — Vantage's OPFS video path and base64 image path need a corrupt/missing-blob recovery branch: if `getBlobUrl()` or image decode fails, fall back to the accent gradient, surface a toast with a working "Clear background" action, and never render a black screen.
  Evidence: https://github.com/victrme/Bonjourr/issues/794; src/utils/opfs.js (getBlobUrl), src/widgets/background.js image/video render paths.
  Touches: src/widgets/background.js, src/utils/opfs.js, src/settings.js (Clear buttons must succeed even when the stored blob is unreadable).
  Acceptance: deleting the OPFS file out-of-band or corrupting stored base64 yields the fallback gradient + toast, and Clear restores a working state; no black tab.
  Complexity: S

- [ ] P2 — i18n Phase 2: widget string conversion + 95% locale coverage
  Why: `docs/i18n-strategy.md` declares Phase 2 (widget-by-widget conversion) "in progress" and Phase 3 (community pipeline) planned, but no open ROADMAP item tracks it — es/de/fr/ja sit at ~70%, below the project's own 95% release threshold.
  Evidence: docs/i18n-strategy.md (Phase 2 In Progress, Phase 3 v1.0.1+); _locales/ tree; shipped v1.0.0 i18n item notes "~70% coverage".
  Touches: src/widgets/*.js, src/settings.js, src/utils/i18n.js, _locales/{en,es,de,fr,ja}/messages.json.
  Acceptance: all user-visible widget strings route through i18n; es/de/fr/ja at 95%+ of the en key count; missing-key fallback remains English.
  Complexity: M

- [ ] P2 — RTL Phases 2-3: ar/he locales + decorative-surface QA
  Why: `docs/rtl-support-roadmap.md` defines Phase 2 (Arabic/Hebrew translation) and Phase 3 (QA), and the v1.1.0 notes defer "decorative background repositioning" — none of it is tracked as an open item, leaving RTL half-shipped (dir/lang set, critical surfaces converted, the rest untested).
  Evidence: docs/rtl-support-roadmap.md Phases 2-3; CLAUDE.md v1.1.0 RTL note ("Decorative background repositioning deferred"); src/utils/i18n.js setupRTL().
  Touches: _locales/ar, _locales/he, src/style.css logical-property completion, qa-scenes.html RTL override.
  Acceptance: ar/he locales render every panel without clipped/overlapped layout in a qaRTL gallery pass; remaining physical properties on user-facing surfaces converted to logical.
  Complexity: M

### P3

- [ ] P3 — Settings panel `<aside>` to native `<dialog>` refactor
  Why: the partial-import dialogs already migrated to `<dialog closedby="any">` (free focus trap, Esc, backdrop) but the settings panel keeps a hand-rolled focus trap and scroll lock on an `<aside>` — finishing the migration deletes JS and closes the deferred remainder of the v1.1.0 dialog item.
  Evidence: CHANGELOG Unreleased ("the settings panel itself remains an `<aside>`... deferred"); src/settings.js focus-trap/scroll-lock code; cross-browser `closedby` support (Chrome 126+, Firefox 149+, Safari 26+).
  Touches: src/settings.js, src/style.css (slide-in animation must survive the `showModal()` lifecycle, e.g. via `@starting-style`).
  Acceptance: settings opens as a native modal dialog with identical animation/behavior; hand-rolled trap and scroll-lock code removed; keyboard/AT behavior verified.
  Complexity: M

- [ ] P3 — DuckDuckGo favicon fallback in favicon-cache chain
  Why: Google s2/favicons is unofficial and may break without notice; `icons.duckduckgo.com/ip3/<domain>.ico` is the standard second source with an acceptable privacy posture — insert between s2 failure and the letter-tile fallback, gated by a new Privacy Table row per constraint #1.
  Evidence: src/utils/favicon-cache.js lines 74-83 (s2 primary, local fallback); https://blog.derlin.ch/get-favicons-from-any-domain-using-a-hidden-google-api/ (DDG endpoint).
  Touches: src/utils/favicon-cache.js, README.md Privacy Table, PRIVACY.md, docs/privacy-practices-cws.md.
  Acceptance: blocking www.google.com still yields real favicons via DDG; both endpoints documented; letter-tile remains terminal fallback.
  Complexity: S

- [ ] P3 — Bing wallpaper endpoint fallback (`hp/api/v1/imagegallery`)
  Why: `HPImageArchive.aspx` is undocumented and could vanish; Bing also serves `https://www.bing.com/hp/api/v1/imagegallery` — add it as a same-origin fallback (no new host permission; `www.bing.com/*` already granted) so Bing-daily degrades gracefully instead of breaking.
  Evidence: src/widgets/background.js line 827 (BING_ENDPOINT); https://gist.github.com/y0ngb1n/c249edc8e547fb0f7d663c0dc98e79e7 (Bing endpoint inventory).
  Touches: src/widgets/background.js (try HPImageArchive, then imagegallery, then cached last-known image, then fallback gradient).
  Acceptance: simulated 404 on HPImageArchive still produces today's Bing image via the v1 endpoint; total failure shows cached/last-known image, not an error.
  Complexity: S

## Research-Driven Additions

### P0

- [ ] P0 - Make release and public-doc validation clean-checkout safe
  Why: README, store docs, and the release preflight depend on markdown files that are ignored and untracked, so local validation can pass while GitHub, CI, CWS, or Pages links are broken.
  Evidence: `.gitignore` ignores `*.md`; `git ls-files -- docs/*.md PRIVACY.md` returns no files; `README.md` links `docs/*.md`; `docs/store-submission-guide.md` points privacy-policy URLs at `PRIVACY.md`; `scripts/validate-release-metadata.ps1` reads `PRIVACY.md`.
  Touches: `.gitignore`, `README.md`, `scripts/validate-release-metadata.ps1`, `docs/_config.yml`, `docs/store-submission-guide.md`, `PRIVACY.md`, `docs/*.md`.
  Acceptance: a fresh clone has every file required by release validation and every public README/store privacy link resolves, or those links are replaced with tracked README anchors; CI no longer depends on local-only ignored markdown.
  Complexity: M

- [ ] P0 - Reject incomplete update-feed integrity metadata
  Why: `updates.xml` currently carries `hash_sha256=""`, and the validator checks the version and CRX URL but not a non-empty SHA-256 hash, leaving the self-hosted update feed able to drift silently.
  Evidence: `updates.xml`; `scripts/validate-release-metadata.ps1`; `.github/workflows/release.yml`; Chrome CRX/Omaha update-feed expectations.
  Touches: `scripts/validate-release-metadata.ps1`, `.github/workflows/release.yml`, `updates.xml`, `firefox-updates.json`.
  Acceptance: release validation fails on empty or non-64-hex `hash_sha256`, wrong release asset URLs, or missing generated feed files; the release workflow regenerates and validates feeds before committing/publishing.
  Complexity: S

### P1

- [ ] P1 - Rewrite install, update, and store packaging docs around the actual delivery paths
  Why: `docs/getting-started.md` still says `scripts/install.ps1` writes `ExtensionInstallForcelist`, while the script and README now use shortcut `--load-extension`; `docs/store-submission-guide.md` still shows an ad hoc ZIP command that includes ignored markdown.
  Evidence: `docs/getting-started.md`; `scripts/install.ps1`; `README.md`; `docs/store-submission-guide.md`; Chromium self-host CRX behavior documented in the repo.
  Touches: `docs/getting-started.md`, `docs/store-submission-guide.md`, `README.md`, `scripts/install.ps1` help text if needed.
  Acceptance: docs describe manual ZIP/load-unpacked, shortcut installer, Vivaldi/CRX, and Firefox XPI update paths accurately; no doc claims Chromium policy force-install works for self-hosted CRX; packaging instructions use the release workflow or build scripts rather than hand-written ZIP commands.
  Complexity: S

- [ ] P1 - Centralize overlay dismissal and keyboard priority
  Why: Escape/outside-click handlers are scattered across settings, widget picker, context menu, partial import, notes focus, quick links, search popovers, and background panels; comparable NTP projects have hit keyboard-event collisions as overlays accumulate.
  Evidence: `rtk rg "Escape|keydown|pointerdown" src`; Bonjourr issue #851.
  Touches: `src/main.js`, `src/settings.js`, `src/widget-picker.js`, `src/utils/context-menu.js`, `src/utils/partial-import.js`, `src/widgets/notes.js`, `src/widgets/quicklinks.js`, `src/widgets/search.js`, optional new `src/utils/overlay-stack.js`.
  Acceptance: one LIFO overlay manager owns Escape and outside-click priority; the deepest open overlay closes first; handlers are removed on close; manual matrix covers settings, widget picker, context menu, quick-link menu, search engine picker, notes focus, Gist token dialog, and partial-import dialogs.
  Complexity: M

- [ ] P1 - Gate public widget API docs to the shipped host runtime
  Why: `docs/widget-api.md` advertises immediate user-provided manifest URL support and an "Add external widget" flow, but current code only ships a generic iframe embed and no manifest discovery or `vantage:init` host runtime.
  Evidence: `docs/widget-api.md`; `src/widgets/embed.js`; existing `Iframe-sandboxed widget API` roadmap item; Renewed Tab and Anori extensibility patterns.
  Touches: `docs/widget-api.md`, `docs/faq.md`, `README.md`, existing future widget API implementation path.
  Acceptance: public docs either label the postMessage protocol as future/spec-only until the existing iframe-widget roadmap item ships, or the docs are held back from publication; no user-facing page instructs users to paste a widget manifest URL unless the runtime exists.
  Complexity: S

