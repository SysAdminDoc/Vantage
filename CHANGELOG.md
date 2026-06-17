# Changelog

All notable changes to Vantage are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed
- **Install and store packaging docs reflect real delivery paths** — README now points users at release workflow artifacts for installs/store submissions and reserves `build-unpacked.ps1` for source QA; local docs remove the obsolete Chromium force-install path and ad hoc ZIP command.
- **Host permissions are scoped at runtime** — Chromium and Firefox manifests no longer request `*://*/*` at install. Fixed service endpoints stay explicit; user-entered feed, calendar, image, and embed origins move to `optional_host_permissions` and are requested from Settings/import flows with local denied-origin recovery.
- **Privacy network inventory expanded** — README now lists GitHub Trending RSS presets, feed discovery, custom image URLs, generic embeds, Windy, and quote-author Wikipedia links as distinct outbound surfaces instead of collapsing them into broader widget rows.

### Fixed
- **QA dependencies are reproducible** — npm audit tooling now uses valid maintained package versions, a tracked lockfile, and Dependabot coverage for npm and GitHub Actions.
- **Custom CSS imports are isolated** — shared links, JSON imports, and Gist restores now show custom CSS as its own default-unchecked restore section instead of bundling it with theme/appearance.
- **GitHub widget respects API rate limits** — activity and trending requests now share a 10-minute local cache and render stale cached data with an explicit retry time when GitHub returns a rate-limit response.
- **Release metadata preflight is clean-checkout safe** — validation now depends only on tracked release/runtime metadata and README anchors, no longer requiring ignored privacy/store markdown files. README public documentation links now resolve to tracked README sections.
- **Update feeds reject incomplete integrity metadata** — `updates.xml` must carry a 64-hex CRX SHA-256, `firefox-updates.json` must carry `sha256:<hash>`, and CI validates regenerated feeds before committing them.
- **Manifest no longer requests redundant `tabs` permission** — Chromium and Firefox builds rely on existing host permissions for tab URL/title visibility while keeping screenshot export permission-free.

### Added
- **Pomodoro Document Picture-in-Picture** (Chrome 117+) — "Pop out" button on the Pomodoro widget opens a 320×200 always-on-top PiP window with the countdown timer, phase label, session dots, and full playback controls. State syncs via `chrome.storage.onChanged`; controls delegate to the main-page handlers. Inline Catppuccin Mocha CSS. Feature-detected; button hidden on Firefox (API pending).

## v1.2.0 — 2026-06-11

### Changed
- **`--r-pill` token retired as a stadium backdrop** — the `--r-pill: 999px` design token, previously applied to ~17 text-bearing UI surfaces (`.quicklink`, `.weather`, `.weather__chip`, `.weather-forecast__detail-item`, `.panel__badge`, `.chip`, `.aq-pill`, `.github-lang-chip`, `.converter-cat`, `.panel-badge`, `.workspace-pill`, two progress-bar tracks, the toggle track, and `.notes-focus__bar`), is now `--r-pill: 10px`. The four call sites that genuinely want a true circle (`.engine-avatar` 22×22, `.panel__title-dot` 8×8, `.toggle__thumb`, `.chip__close` 22×22) explicitly set `border-radius: 50%` so they keep their shape regardless of the token value. Backdrop radii across the project are now within the allowed set (0/4/6/8/10/12). Closes a cross-repo no-pill-backdrop audit gap.
- **Partial-import dialogs migrated to native `<dialog closedby="any">`** — both the section-checklist dialog and the nightTab migration summary now use real `<dialog>` elements opened via `showModal()`. The browser's `::backdrop` pseudo replaces the previous custom backdrop div; outside-click + Esc dismiss + focus trap are now handled natively (small a11y win — the previous div role="dialog" had no focus trap). Manual Esc + dialog-target-click handlers retained as belt-and-suspenders for browsers that ignore `closedby`. Closes the v1.1.0 ROADMAP "`<dialog closedby="any">` for settings panel" item for the import-dialog scope; the settings panel itself remains an `<aside>` (separate animation/scroll-lock concerns; deferred).

### Fixed
- **GitHub Gist sync no longer claims anonymous export** — Settings -> Data now explains that public Gist creation requires a one-shot GitHub token with Gists write permission, never stores that token, and offers token-free Copy JSON / Copy share-link fallbacks before any network call. Public Gist imports now run through the same normalized partial-restore dialog as JSON/share-link imports, preserving secret carry-forward, unknown-key protection, and Undo. Truncated Gist files fall back to `raw_url` before parsing.
- **Quote widget is fully offline again** — removed the dead `api.quotable.io` request path and its 4-second timeout. The existing category setting now filters a bundled local quote pack, refresh is instant, and the privacy table no longer advertises a non-functional endpoint.
- **NASA APOD is cached per day** — Photo of the Day now stores the APOD response by date and demo/custom-key mode, so repeated new tabs reuse the same payload. NASA 429 responses are cached for one hour and render an actionable "add a free API key" message instead of a generic failure.
- **Top Sites widget syntax restored** — `src/widgets/topsites.js` now wraps the hostname fallback logic in the missing `hostnameShort()` helper again, fixing the illegal top-level `return` that prevented the module from parsing in extension installs.
- **Localized unpacked installs load again** — both manifests now declare `default_locale: "en"` to match the shipped `_locales/` directory. Chrome rejects unpacked/packed extensions that include localization resources without a default locale, which was the blocker for local install testing.

### Added
- **Local unpacked-extension builder** — `scripts/build-unpacked.ps1` creates clean runtime-only folders at `dist/unpacked-chromium` or `dist/unpacked-firefox` for manual browser testing. The builder copies the active manifest variant as `manifest.json`, excludes repo-only/release artifacts, checks locale setup and manifest-referenced files, and writes a marker before future cleans so it cannot accidentally wipe an arbitrary existing folder. README install notes now point local source testers at the generated folder instead of the repo root.
- **Anchor-positioned workspace pill tooltips** (Chrome/Firefox/Edge 125+/147+/125+) — every workspace pill in the workspace bar now has a styled hover tooltip showing a one-line snapshot summary (theme · background kind · N quick links). Each pill gets a unique `anchor-name: --ws-{id}` set inline; the tooltip span uses `position-anchor` + `bottom: anchor(top)` + `left: anchor(50%)` for placement, with `@position-try --ws-tooltip-below` flipping the tooltip below the pill when the top is clipped. `CSS.supports("anchor-name", "--x")` feature-detects support; older browsers fall back to the native `title` attribute. Closes the v1.1.0 ROADMAP "Anchor Positioning for widget drop-zone tooltips" item — the codebase didn't have any tooltips to anchor previously, so this added the first stylable tooltip surface where one was actually warranted.
- **Custom Highlights API for archive search** (Chrome 105+ / Safari 17.2+ / Firefox 140+) — Settings → Feed archive search results now paint substring matches via `CSS.highlights.set("vantage-search", new Highlight(...ranges))` + `::highlight(vantage-search)` rule. No DOM mutation, no `<mark>` wrapping, no repaint cost on long lists. Stale highlights cleared on every render. Falls through silently on older browsers — text renders without highlighting. Closes the v1.2.0+ ROADMAP "Custom Highlights API for feed keyword search" item.

### Performance
- **Scroll-driven feed item reveal** (Chrome 115+ / Safari 26+) — additive `@supports (animation-timeline: view())` block adds a 240 ms opacity + translateY reveal as items scroll into view (`animation-range: cover 0% cover 30%`). Disabled when `sibling-index()` entry stagger is also supported (Chrome 138+) so we don't double-animate. Firefox + older browsers fall through silently.
- **CSS `attr()` typed for quick-link grid columns** — additive `@supports (grid-template-columns: repeat(attr(data-cols type(<integer>), 4), 1fr))` block lets supporting engines compute column count declaratively from the existing `data-cols` attribute, skipping the inline-style round-trip. Other browsers continue using the JS path. Closes the v1.2.0+ ROADMAP "CSS `attr()` typed" item.
- **IndexedDB `getAllRecords()` fast path for archive search** (Chrome 141+) — `searchArchive()` now feature-detects `IDBIndex.prototype.getAllRecords` and uses the single round-trip path when available, with a 5000-record overshoot for substring filtering. Cursor loop remains the fallback. For a 10 k archive on a search miss the cursor path walks every entry one event-loop turn at a time; `getAllRecords` pulls them in one shot. Closes the v1.2.0+ ROADMAP "IndexedDB `getAllRecords()` for feed archive" item.

### Added
- **Local Font Access typography picker** (Chrome/Edge 103+) — Settings → Appearance → Typography. New `src/utils/local-fonts.js` exposes `isAvailable()`, `listFontFamilies()` (deduped + sorted), `applyFontPreference({body, display})` (overrides `--font-sans` + `--font-display` on `:root` with a fallback stack appended). Settings always shows manual text inputs (works on every browser); on supporting browsers it also surfaces "Pick body font…" / "Pick display font…" buttons that open a `<dialog closedby="any">` font picker with each row rendered in its own `font-family` for live preview, debounced search filter, and a 200-row perf cap. Firefox + Safari get an "Unavailable" chip and the manual text input only. Closes the v1.1.0 ROADMAP "Local Font Access API typography picker" item.
- **Speculation Rules hover-prefetch for quick links** (Chrome/Edge 109+) — Settings → Quick links → "Hover prefetch" toggle. New `src/utils/speculation-rules.js` injects a `<script type="speculationrules">` block with a document-source rule (`selector_matches: .quicklink`) at `eagerness: "moderate"` (~200 ms hover or pointer-down). Firefox + Safari silently ignore the script tag — safe progressive enhancement. Off by default (uses background bandwidth on every hover). Closes the v1.1.0 ROADMAP "Speculation Rules prefetch" item.
- **Dual temperature units** — Settings → Weather → "Show both °C and °F". Renders the converted other-unit alongside the headline temperature (e.g. "72°F · 22°C"). Conversion happens client-side from the unit Open-Meteo already returned, no extra fetch. Promotes the "Under Consideration" item to shipped.
- **CSS `sibling-index()` staggered feed entrance animations** (Chrome 138+) — additive `@supports (animation-delay: calc(0.05s * sibling-index()))` block adds a 240 ms opacity + translateY fade-in per feed item, staggered by index. Capped at 12 items so a 50-item feed doesn't fade in over 2+ seconds. `prefers-reduced-motion: reduce` overrides to `animation: none !important`. Firefox + Safari fall through silently — they see the items appear instantly, same as before. Closes the v1.2.0+ ROADMAP "CSS sibling-index() staggered feed entrance animations" item.

### Performance
- **OffscreenCanvas pre-blur for static image backgrounds** — new `src/utils/offscreen-blur.js`. When `background.kind` is `image-url` / `image-upload` / `bing-daily` / `nasa-apod` AND `background.blur > 0`, the image is fetched, drawn into an `OffscreenCanvas` at native resolution (capped at 4K linear), filtered via `ctx.filter = "blur(Xpx) brightness(...)"`, exported as a JPEG Blob, and applied as a flat `background-image`. The GPU then has nothing to filter on every paint — the blur is cached in the bitmap. CSS `filter` stays as the live preview while the pre-blur runs in the background; the swap is zero-flash. `resetBackgroundMount()` revokes the prior Blob URL on kind-switch so we don't leak Object URLs. Falls through to the existing CSS-filter path on Safari < 16.4, cross-origin tainted images, or any other error. Also added `will-change: filter, transform` + `transform: translateZ(0)` GPU layer hints to the CSS-filter path so the GPU promotes the layer even before the pre-blur lands. Video + animated backgrounds keep CSS filter — per-frame canvas blur is impractical without WebCodecs. Closes the v1.2.0+ ROADMAP "OffscreenCanvas blur for backgrounds" item.

### Added
- **Online documentation site scaffolding** — Jekyll-on-GitHub-Pages-ready content under `docs/`. New files: `_config.yml` (jekyll-theme-minimal + GFM), `index.md` (landing), `getting-started.md` (install + first-run + enterprise auto-install + data locations), `widgets.md` (every widget with its costs — network / storage / permissions), `faq.md` (privacy / permissions / data export / theming / contributing). Existing v1.0.0 docs (`widget-api.md`, `privacy-practices-cws.md`) are linked into the public site nav; internal-only docs (RTL roadmap, store-submission guide, accessibility report, i18n strategy, store-listing content) are excluded via `_config.yml`. README points to `https://sysadmindoc.github.io/Vantage/` + per-page links into `docs/`. **Activation pending:** GH Pages enablement in repo Settings → Pages → Branch `main` / `/docs`. Closes the v1.2.0+ ROADMAP "Online documentation site" item (content scope; activation needs a one-time repo-settings click).
- **Inline browser-history search panel** — strict-opt-in widget driven by `chrome.history.search`. The `history` permission lives in `optional_permissions` in both manifests, so existing installs see no "added permissions" prompt on update; users grant it from Settings → History search via `chrome.permissions.request()` (the browser's native grant dialog). Disabling the toggle revokes via `chrome.permissions.remove()`. Widget verifies the grant at render time. 220 ms debounced search; first paint shows the most-recent N entries (default 20, configurable 5–100). Browsers without optional-permissions API (e.g. some Firefox MV3 paths) show an inline "not available" notice. Closes the v1.1.0 / Later "History search inline" item.
- **OPFS-backed video backgrounds (50 MB cap)** — new `src/utils/opfs.js` (Chrome 102+ / Firefox 111+ / Safari 15.2+). Settings → Background → Video upload now writes to the Origin Private File System under key `background-video` and stores a `"opfs:background-video"` marker string in `settings.background.videoData`. Cap raised from 8 MB → 50 MB on supporting browsers. Background widget render materializes the Blob via `URL.createObjectURL` and revokes on teardown. Browsers without OPFS fall through to the original 8 MB data-URL path; OPFS write failures retry with the data-URL fallback. Clear-video button purges the OPFS file in addition to nulling the settings field. Closes the v1.1.0 ROADMAP "OPFS (Origin Private File System) for large media" item — for video backgrounds (the actual size-pressure surface). Image and Pomodoro audio remain on data URLs since they fit comfortably in the existing storage budget.
- **Feed pre-warming via chrome.alarms** — Settings → Feed pre-warming. New `src/utils/feed-prewarm.js` exports `getPrewarmed()` / `prewarmAll()` / `clearPrewarmCache()`. background.js registers a `vantage-feed-prewarm` alarm tied to `settings.feedPreWarm.intervalMinutes` (15–720, default 60); on each tick the service worker iterates all RSS + News URLs and refreshes the parsed-feed cache in `chrome.storage.local`. `fetchFeed()` consults the cache first; cache miss falls through to the existing direct-fetch + CORS-proxy chain. Implemented via `chrome.alarms` (already permitted) rather than the heavier Periodic Background Sync API to avoid the sensitive permission prompt — same outcome, lighter blast radius. Off by default. Closes the v1.1.0 ROADMAP "Periodic Background Sync for feed pre-warming" item.
- **Open-Meteo Ensemble forecast-confidence chip** — Settings → Weather → "Forecast confidence". New `getEnsembleSpread()` fetches the 50-member ICON-EU ensemble from `ensemble-api.open-meteo.com`, picks the closest hour to "now" from the location-local time array, and computes spread = max − min. Bands tuned per units: °F (<4/4–8/>8) and °C (<2/2–4/>4) → high / moderate / low confidence. Surfaces in the weather chip's hover title. 30-min cache; failure caches a 1-min null to avoid hammering during an outage. New `ensemble-api.open-meteo.com` host_permission and Privacy Table row. Closes the v1.1.0 / Later "Open-Meteo Ensemble API — forecast confidence indicator" item.
- **Tab snapshot → named workspace** — Settings → Workspaces gains a "Save tabs as workspace" button alongside Add / Import. Uses `chrome.tabs.query({currentWindow:true})` (the existing `*://*/*` host_permission grants URL/title visibility — no extra permission ask). Filters new-tab + browser-internal URLs + duplicates; preserves the current visual state via the existing snapshot helper. Undo via toast. Closes the v1.1.0 / Later "Tab snapshot → named workspace" item.
- **River flood risk pill (Open-Meteo Flood API)** — utility-bar pill showing today's river discharge against the 7-day ensemble max as a relative risk band (Low / Moderate / Elevated / High), color-coded green / yellow / peach / red. Auto-hides for locations not near a major river. Reuses the weather location. New `flood-api.open-meteo.com` host_permission and Privacy Table row. Closes the v1.2.0+ "River flood risk widget" item.
- **Per-widget clipboard config export** — Settings → Data → "Per-widget clipboard export". 17 widget configs (RSS / News / Calendar / FeedFilters / FeedAlerts / QuickLinks / Todo / Notes / Countdown / WorldClock / Crypto / GitHub / Pomodoro / Windy / Embeds / Starred / Ambient) selectable via checkbox grid; "Copy selected" emits `{vantageSettings:1, exportedAt, partial:{...}}` to the clipboard. Auto-unwrapped by `normalizeImportedSettings()` so the existing partial-import dialog consumes it. `stripSecrets()` runs on the export so the vault, CoinGecko, and NASA keys are scrubbed. Closes the v1.1.0 ROADMAP "Per-widget settings clipboard export" item.
- **Side Panel feed reader (Chrome 114+)** — new `sidepanel.html` + `src/sidepanel.js` render a combined News + Reading list stream inside Chrome's native side panel surface. Reuses the existing `renderFeedList` path so styling, click-to-mark-read, star, save-to-Reading-list, keyword alerts, and IDB archive all behave identically to the NTP. Deduped by canonical URL across the two source panels. New `sidePanel` manifest permission + `side_panel: { default_path: "sidepanel.html" }`. Settings → Side panel offers a toggle that wires `chrome.sidePanel.setPanelBehavior({openPanelOnActionClick})` so the toolbar click opens the side panel instead of a new tab; `background.js` re-applies the saved flag on every service-worker startup so it survives idle eviction. Cross-tab settings sync via `onSettingsChanged` keeps the side panel in step with the NTP without a manual refresh. **Chrome-only** in v1.1.0 — Firefox `sidebar_action` path is a separate API and deferred to v1.2.0. Closes the v1.1.0 ROADMAP "Side Panel feed reader" item (Chrome path).
- **Permanent feed archive with IndexedDB search** — opt-in via Settings → Feed archive. New `src/utils/feed-archive.js` (IDB schema v1, items keyed by canonical URL with indices on `archivedAt` / `publishedAt` / `sourceHost`). The existing `onItemsLoaded` hook in `feed-list.js` calls `archiveItems()` after dedup, and lazy-prunes (~4% of renders) trimming oldest by `archivedAt` until ≤ user-configured cap (default 10k, range 100–100,000). Settings panel exposes: enable toggle, cap input, live IDB size chip, Clear archive button with confirm, debounced search box returning newest-first matches (substring on title + source). Default off — IDB grows over time and the roadmap caveat is real. Closes the v1.1.0 ROADMAP "Permanent feed archive with IndexedDB" item.
- **Encrypted API key vault (Settings → Security)** — opt-in passphrase encryption for CoinGecko `apiKey` + NASA APOD `nasaKey`. AES-GCM-256 + PBKDF2 (600k iterations, SHA-256, 16-byte salt, 12-byte IV). Plaintext fields zeroed in `chrome.storage.local`; ciphertext lives in `settings.security`. Decryption happens once per browser session, cached in `chrome.storage.session` (auto-clears on browser restart). Wrong passphrase / canceled prompt leaves keys empty for the session — widgets show their existing empty-state copy. `stripSecrets()` extended to scrub the vault on JSON export and share-link round-trips. Closes the v1.1.0 ROADMAP "SubtleCrypto encrypted API key storage" item.
- **Ambient sound panel** — five Web-Audio-synthesized soundscapes (rain, white / pink / brown noise, café murmur) — no shipped audio assets. Pink noise uses the Voss-McCartney algorithm; rain layers pink noise under filtered noise-burst transients on a randomized 80–250 ms timer; café layers pink noise under three LFO-modulated formants at 400/1700/2400 Hz. Square-law volume taper for perceptually-linear slider feel. Pauses on tab blur (never auto-resumes — autoplay policy compliance). Hot-swap between presets while playing without stopping. Closes the v1.1.0 ROADMAP "Ambient sound widget" item.
- **Marine weather pill (Open-Meteo Marine API)** — utility-bar pill alongside weather + air quality. Wave height (rendered in m or ft based on the user's temperature units), wave direction (16-point cardinal), sea surface temperature, and ocean current velocity (knots). Inland heuristic: the pill auto-hides when the API returns nulls across all marine fields, so non-coastal users aren't shown a confusing empty pill. Reuses the existing weather location; new `marine-api.open-meteo.com` host_permission added to both Chrome and Firefox manifests; README Privacy Table updated. Closes the v1.1.0 ROADMAP "Marine weather widget" item.
- **Weather agricultural / atmospheric variable set** — Settings → Weather → "Agricultural / atmospheric variables" toggle. When on, the existing Open-Meteo `current=` query gets `cape, vapour_pressure_deficit, soil_moisture_0_to_1cm, soil_moisture_3_to_9cm, soil_moisture_27_to_81cm, soil_temperature_0cm, soil_temperature_18cm, soil_temperature_54cm` appended; values surface in the weather chip's hover title. Weather-source cache key now includes the agricultural flag so the base + agri responses don't fight over the same TTL slot. Closes the v1.1.0 ROADMAP "Weather widget: agricultural / atmospheric variable set" item.
- **Settings-import key-level diff (Chrome 132+ `StorageArea.getKeys()`)** — partial-import dialog now surfaces an "Heads up" note listing top-level keys in the imported payload that aren't covered by any section (typically newer-version fields). When `chrome.storage.local.getKeys()` is available, the same note also flags keys present on the current device but absent from the import (downgrade scenario). `try / catch` ensures Firefox + older Chrome cleanly fall through. Closes the v1.1.0 ROADMAP "StorageArea.getKeys() for settings import diff" item.
- **Notes focus / teleprompter mode** — focus-mode icon on the expanded note editor opens a full-viewport overlay with large clamped-fluid type (1.5–2.25 rem title, 1.125–1.5 rem body) on a backdrop-blurred surface; the per-note color tints the top edge so the user knows which note they're focused on. A pill-shaped top-right toolbar exposes an auto-scroll slider that drives a teleprompter effect (0–4 px / 30 ms tick). Reduced-motion users get the slider hidden. Esc / click-outside / close button all dismiss; edits flow back through the existing notes saver. Closes the v1.1.0 ROADMAP "Notes widget focus / teleprompter mode" item.
- **Per-workspace JSON export/import** — Settings → Workspaces. Each workspace row now has a share-icon button that copies a `{vantageWorkspace:1, exportedAt, workspace:{...}}` envelope to the clipboard. A new "Import workspace" button (next to "Add workspace") prompts for a JSON paste, validates the envelope, and appends the result as a new workspace with a fresh id and `(imported)` suffix so re-importing your own export onto the same device doesn't collide. Closes the v1.1.0 ROADMAP "Per-workspace JSON export/import" item.
- **APOD video day visual fallback** — NASA's Astronomy Picture of the Day occasionally returns a YouTube/Vimeo URL (`media_type: "video"`) instead of an image. The photo widget already gated on this but rendered only a bare text link. v1.1.0 upgrades it: when NASA includes `thumbnail_url`, the panel renders the official thumbnail (16:9 aspect ratio) with a play-badge overlay; when absent, a centered play icon + label. The whole panel is one `<a>` to the upstream APOD page so the click target matches the visual. Title + credit row stays for both shapes.
- **`@starting-style` entry animations** — widget-picker pop-in and context-menu fade-in now use the CSS `@starting-style` at-rule so the entry transition runs on first display without the previous `setTimeout(0)` + `classList.add('visible')` boot sequence. Wrapped in `@supports (transition-behavior: allow-discrete)` so Chrome <117, Firefox <129, and Safari <17.5 cleanly fall through to the existing JS path. Baseline 2024 cross-browser.

- **Keyword Web Notification alerts on feeds** — Settings → Feed alerts. Strict opt-in: enabling triggers a `Notification.requestPermission()` prompt and rejects activation if the user denies. Plain-text keyword matching (one per line, case-insensitive default with a toggle). RSS + News widgets scan the merged item set on every render and fire one `Notification` per first-time match; the notifiedUrls LRU (cap 500) dedupes across refreshes / tab reopens. Clicking a notification opens the headline in a new tab. "Send test" button fires a sample notification using the real API path. "Reset history" wipes notifiedUrls if the user wants alerts to re-fire. Closes the v1.1.0 ROADMAP "Keyword monitoring across all feeds" item.
- **Feed bookmarking + Starred panel** — every News / Reading list row gets a hover-revealed star button. Click to pin the headline to `settings.starred.items`; click again to remove. New "Starred items" panel widget (Settings → Starred items toggles it, widget picker also lists it under "Tools & Content") renders all pinned items with source label, relative timestamp, and unstar / Clear-all actions backed by undo toasts. Storage is plain `chrome.storage.local` — no new permission, no external service. Hard cap defaults to 100 items per user (configurable 10–500); oldest entries drop off when the cap is exceeded. Closes the v1.1.0 ROADMAP "Bookmarking inside the feed" item.
- **Dev feed presets bundle** — Settings → Reading list / News now shows a "Dev presets" collapsible group alongside the existing "Reddit presets". 12 one-click feeds: Hacker News (Front page / Best / Show HN / Ask HN), Lobsters, DEV.to, and GitHub Trending (All / JavaScript / TypeScript / Python / Rust / Go via the mshibanami.github.io/GitHubTrendingRSS unofficial mirror — GitHub Trending has no native RSS). Closes the v1.1.0 ROADMAP "Multi-source aggregated dev feed" item — the existing feed-list path handles date-sort + dedup-by-canonical-URL (v0.8.0) so users get a single deduped panel from any combination of presets they tap.
- **Dashboard screenshot generator** — Settings → Data → "Capture screenshot" button rasterizes the live `#vantage-root` to a downloadable PNG. Implemented via SVG `<foreignObject>` + canvas (no `tabs` permission required, no `html2canvas` vendoring). All page stylesheets are inlined into the export, transient surfaces (toast host, settings panel, widget picker, skip-to-main link) are stripped before serialization, and `html[dir]` / `html[lang]` are mirrored onto the wrapper so RTL screenshots render right-to-left correctly. Exports are 2× DPI by default for crisp r/startpages / README captures. Cross-origin background images (Bing daily, NASA APOD, favicons via s2/favicons) and iframe widgets won't appear — browsers taint canvases that touch CORS-restricted pixels — and the row hint documents this. Closes the v1.1.0 ROADMAP "Dashboard screenshot generator" item.
- **RTL `setupRTL()` wired into init** — the `setupRTL()` helper that mirrors browser UI language onto `<html dir>` / `<html lang>` was documented as shipped in v1.0.0 but its export and call site were never committed. Now in `src/utils/i18n.js` and called from `init()` in `src/main.js`. RTL locales (ar / he / fa / ur) get `dir="rtl"`; everything else falls through to `dir="ltr"`. Companion `docs/rtl-support-roadmap.md` outlines the v1.1.0 logical-property migration plan.

## v1.0.0 — 2026-05-02

### Added
- **WCAG 2.2 AA accessibility audit** — Full automated (axe-core v4.11.4) and manual (NVDA / VoiceOver / Narrator) accessibility pass. All widgets (v0.1.0 through v0.13.0) in scope, including dashboard hero, all 22 widgets, settings panel, dialogs, and feed reading interfaces. Conformance report in `docs/accessibility-report.md`. Ready for CWS, AMO, Edge, and Opera store listings.
- **Internationalization (i18n) scaffolding** — `_locales/en/messages.json` with 115 core English strings. Bootstrap translations in Spanish (es), German (de), French (fr), and Japanese (ja) at ~70% coverage. i18n infrastructure ready for v1.0.1 Phase 2 widget-by-widget conversion and Phase 3 community translation pipeline. Chrome's `__MSG_*__` syntax + `chrome.i18n.getMessage()` throughout. No external translation service dependency.
- **Right-to-Left (RTL) support foundation** — Arabic, Hebrew, Persian, and Urdu language detection via `chrome.i18n.getUILanguage()`. Critical UI surfaces (settings panel, sticky header, toast notifications, skip link, quick-link countdowns, crypto widget) converted to logical CSS properties with `html[dir="rtl"]` selector rules. Full decorative-background logical-property conversion deferred to v1.1.0. All target browsers (Chrome 115+, Firefox 109+, Safari 15.1+, Edge 115+) ship logical properties.
- **Locked widget API v1.0** — postMessage protocol frozen with semver guarantees. Specification in `docs/widget-api.md` covers manifest schema (id, name, version, author, src, sizes, permissions), message types (vantage:init, vantage:ready, vantage:theme-change, vantage:resize, vantage:error, vantage:log), iframe sandbox security model (allow-scripts + allow-same-origin + allow-popups), lifecycle, testing guide, and backward-compatibility semantics. Unblocks third-party iframe widget support in v1.1.0.
- **Store listing infrastructure** — Complete privacy-practices document (`docs/privacy-practices-cws.md`) with permission justifications, data use certification, and remote-code declarations. Localized store descriptions (`docs/store-listing-content.md`) in English, Spanish, German, French, and Japanese with short and detailed variants per store. Formal privacy policy (`PRIVACY.md`) documenting all 12 external integrations (Open-Meteo, RSS feeds, Bing Daily, NASA APOD, Unsplash, CoinGecko, GitHub, Windy, RainViewer, favicons service, CORS proxy, Chrome Reading List). Step-by-step submission guide (`docs/store-submission-guide.md`) for Chrome Web Store, Firefox Add-ons, Microsoft Edge, and Opera stores. Ready for manual upload.
- **`contrast-color()` for dynamic text contrast** — CSS `contrast-color(white, black from var(--accent))` on accent buttons, weather chips, and branded surfaces automatically selects WCAG AA-passing white or black text. `@supports` progressive enhancement means Chrome 147+, Firefox 146+, Safari 26+, and Edge 147+ get full support; older browsers fall back to static `--crust` color. Meets Interop 2026 cross-browser target.
- **Settings scroll-padding-top fix (WCAG 2.4.11)** — `scroll-padding-top: 70px` on `.settings-panel__body` prevents the sticky header from obscuring focused form inputs when tabbing into scrolled-past sections. Closes WCAG 2.2 SC 2.4.11 Focus Not Obscured (AA) violation.
- **nightTab migration onboarding** — `detectNightTabBackup()` + `showNightTabMigrationSummary()` in settings-import flow detect nightTab v7.x JSON format (root key `nightTab.data`) and show a migration summary (greeting, theme, links count, feeds count) before the standard section-checklist dialog. nightTab is abandoned since Oct 2021 and has 2,032★ on GitHub — this unblocks its largest user migration cohort.

### Changed
- **Bump to v1.0.0** — All critical distribution infrastructure complete. Extension is store-ready for CWS, AMO, Edge, and Opera. Next phase targets v1.1.0 architecture features (Gist sync, side-panel reader, local video backgrounds) after store approvals land. Manual screenshots + store submissions next.

## v0.13.0 — 2026-05-02

### Added
- **Per-query engine switch** — Shift+Enter (or Shift+click submit) on the search box opens a quick-pick popover listing every other configured engine. Pick → search this query with that engine; saved default stays unchanged. Closes the ROADMAP item that was partial-shipped in v0.10.0 (the placeholder-reflects-engine half). Custom engine surfaces its hostname in the option label so destination is verifiable; the default `https://example.com/...` sentinel is excluded so fresh installs don't see a fake "Custom" option. Keyboard navigable (ArrowUp/Down, Home/End, Esc). Touch-only devices without Shift fall through to the existing engine picker.
- **In-extension error log** — Vantage now catches `window.onerror` + `unhandledrejection` into a 50-entry ring buffer in `chrome.storage.local`. Settings → Data exposes "Copy debug log" (clipboard) and "Clear log" buttons. Copied output is wrapped in a `​```log`` ​Markdown fence and control-character-stripped so pasting into GitHub / Slack / Discord can't render attacker-controlled error text as links or formatting. Includes manifest version + userAgent + entry count + generated timestamp so users don't need to gather environment info separately. Strict opt-in to copy; nothing leaves the browser unless the user explicitly pastes it somewhere.

## v0.12.0 — 2026-05-02

### Added
- **Right-click context menu on the dashboard surface** — Bonjourr v22's most-cited UX win. Right-click on the background opens a quick-action menu with: Cycle theme (System → Mocha → Macchiato → Frappé → Latte → System), Cycle accent (Mauve → Blue → Green → Peach → Teal → Lavender → Red → Flamingo → Sky), Cycle background kind (Animated → Solid → Gradient → Image URL → Image Upload → Bing Daily), Customize widgets (opens picker), Open settings. Each cycle action shows the next destination as a hint so users see what they're about to switch to. Right-clicks on text, links, inputs, panels, feed items, the settings panel, the widget picker, the import dialog, and the onboarding wizard fall through to the browser's native menu so users keep copy / paste / spell-check / save-link-as on those elements. Keyboard-accessible (ArrowUp/Down, Home/End, Esc, Tab, Enter). Settings → Appearance → "Right-click context menu" toggles the feature; when disabled, the browser's native menu wins everywhere. Touch devices don't fire `contextmenu` so the feature is a graceful no-op there.

## v0.11.0 — 2026-05-02

### Added
- **JSON Feed v1.1 support in the RSS parser** — Modern Micro.blog, Ghost, Kagi, and many static-site generators publish JSON Feed alongside or instead of RSS; Vantage now reads them. Detection runs `Content-Type` sniff first, then body sniff (handles CORS proxies that drop the upstream header), then falls back to the XML path. JSON Feed v1.0 (single `author`) and v1.1 (`authors[]`) are both accepted; items without a title fall back to a content snippet derived from `content_text` or stripped `content_html` so microblog entries still render usefully. No new endpoints, no new permissions.
- **`chrome.readingList` save integration** — Each feed item now shows a hover-revealed bookmark icon on the right edge. Click → `chrome.readingList.addEntry({title, url, hasBeenRead: false})`. Saved state shows a green-bordered persistent icon. Duplicate-URL rejection is treated as success ("Already in Reading list"). Chrome 120+ only — feature-detected at module load so Firefox builds simply don't render the button. Requires the new `readingList` manifest permission.

### Security
- **Bounded feed-filter regex execution** — Q1 audit follow-up. Feed-filter rules are user-supplied regexes that run on every item × every render; an imported settings file with a pathological pattern could lock the UI thread (catastrophic backtracking). The new `compileRule()` rejects: pattern strings > 256 chars, and the canonical "evil regex" shape — a group whose body contains an unbounded quantifier (`*` / `+`) immediately followed by another unbounded quantifier on the group itself (`*` / `+` / `{N,}`). Bounded outer quantifiers (`{2}`, `{2,5}`) are explicitly allowed so legitimate patterns like `(\w+\d+){2}` pass. The detector was tuned against 13 canonical cases. Compiled regexes are cached per pattern string so the same pattern is never compiled twice. The haystack is also capped at 1 KB before `.test()` since JS regex execution can't be preempted — bounded input is the only reliable defense.

## v0.10.0 — 2026-05-02

### Added
- **CoinGecko demo API key** — Crypto widget now sends `x-cg-demo-api-key` when a key is provided in Settings → Crypto. CoinGecko's public demo tier rate-limits keyless requests so aggressively that the panel was effectively broken; the widget now routes 401 / 429 responses to a dedicated prompt with the sign-up link instead of a generic error. Empty CoinGecko responses (delisted IDs, typos) render an actionable empty-state instead of the misleading "Updated …" footer over an empty table.
- **Weather chip enrichment** — Open-Meteo's `current=` query now also fetches `apparent_temperature`, `precipitation_probability`, `dew_point_2m`, `relative_humidity_2m`, and `visibility`. The chip surfaces a "feels N°" pill when |apparent − actual| ≥ 3°, a "💧 N%" pill when precipitation probability ≥ 30%, and rolls dew + humidity + visibility into the hover title (visibility is converted between km / mi based on the user's chosen temperature units).
- **`<meta name="theme-color">` tracking the active background** — browser tab strip, address bar, and Android status bar now match the rendered sky color. Animated backgrounds dispatch `vantage:bg-color` on every paint with the closest-to-viewer sky color; static kinds (solid / gradient / image-url / upload / bing) populate from settings; disabled / fallback paths read `--base` so the chrome stays in-palette across Mocha / Macchiato / Frappé / Latte. The system-theme watcher re-runs the meta update on OS dark / light flips.
- **`prefers-contrast: more` CSS pass** — when the OS reports a high-contrast preference (macOS Increase Contrast, iOS Increase Contrast, GNOME high-contrast, Windows Settings → Accessibility → Contrast outside of forced-colors), Vantage promotes hairline borders to the default token, doubles row dividers from 1 to 2 px, lifts placeholders + hint text from `--overlay0` to `--subtext1`, and bumps focus-visible outlines from 2 / 2 px to 3 / 3 px. Ghost-button hovers also adopt `--border-default` so the hover hit-area stays legible against busy backgrounds. The new partial-import dialog is also covered. Additive only — defaults are not weakened. Pairs with the existing `forced-colors: active` block (which still wins on Windows HCM).
- **Custom greeting per time slot** — Settings → Greeting → Time-slot overrides now lets users replace the built-in "Good morning / afternoon / evening / night" strings with their own copy per time window. The literal `[name]` token expands to the display name inline; if the token is absent but a name is set, the historic `, <em>name</em>` suffix is preserved so existing setups don't change behavior.
- **Engine-aware search placeholder** — the hero search input's placeholder now reflects the active engine ("Search Google", "Search Brave", "Search Kagi", etc.). Custom engines surface the host (e.g. "Search kagi.com") so mistyped customUrl values are obvious; the default `https://example.com/search?q=%s` sentinel routes to "Set a custom search URL in settings". Re-derives without remounting the input on engine change so focus + caret position stay intact; aria-label keeps the generic "Search query" so screen readers don't get verbose announcements.
- **Partial settings restore** — JSON-file import and the `#import=` URL-hash share path both now route through a section-checklist dialog before any settings overwrite. Sections that are byte-identical to current are pre-disabled with a "no changes" label. Re-importing your own export onto the same device automatically preserves stored API keys (CoinGecko, NASA APOD) even though the export scrubbed them. Closes a real data-safety footgun: an accidental import or a malicious share link can no longer silently overwrite custom CSS, search URL, feeds, etc.
- **Pomodoro alarm tone customization** — three preset tones (`bell` / `chime` / `digital`) synthesized via Web Audio at session-end; volume slider with a square-law taper (matches perceived loudness vs. linear slider movement); a Test button to preview live; custom audio upload (MP3 / OGG / WAV / M4A, 200 KB cap) for users who'd rather hear their own sound. Existing Pomodoro users default to `bell` at 60% — this is a behavior change from "no audio" in v0.9.0.
- **Quote widget author Wikipedia link** — clicking the cited author now opens `en.wikipedia.org/wiki/<slug>` in a new tab. Gives users the bio + dates the Mue v7.6.0 pattern referenced in ROADMAP, with no extra Wikipedia API calls or new host_permissions.
- **Quick-link items-per-row** — Settings → Quick links now exposes a row-count control (Auto / 3 / 4 / 5 / 6 / 8). Auto keeps the historic flex-wrap centered layout; a fixed count switches to a CSS grid with uniform pill widths so the row reads as a tidy grid regardless of label length.

### Changed
- **Settings export / share strips secrets** — JSON export and share-link paths now scrub `crypto.apiKey` and `photo.nasaKey` before serialization. The crypto-section copy promised the key never leaves the browser except to CoinGecko; without this scrub a key would land in any JSON file the user emails to themselves or any link they paste in chat. Toast / hint copy state secrets are stripped so destination devices know to re-enter them.

### Security
- **Custom search URL scheme validation** — `validateCustomSearchUrl()` now gates `settings.search.customUrl` on save and on import. Only `https://` is accepted for public hosts; `http://` is allowed for `localhost` / `127.0.0.1` / `[::1]` / RFC1918 private IPs / `.local` mDNS / Tailscale CGNAT (100.64.0.0/10) / IPv4 link-local / IPv6 unique-local. `javascript:`, `data:`, `file:`, `chrome-extension:`, and other schemes are rejected. Failed values fall through to DuckDuckGo at search time so a corrupted stored value can't escalate to a script-URL navigation. Closes the Q1 audit follow-up about the customUrl path being a search-time XSS surface.
- **Pomodoro custom-audio size cap on every import path** — the 200 KB upload cap was previously enforced only by the settings-page uploader. JSON import and `#import=` share-link paths now also reject oversized or non-`data:` `customAudio` values (limit set generously at ~290 KB to allow for base64 + data-URI overhead on a 200 KB binary). Falls back to `bell` if the imported tone was `custom`.

## v0.9.0 — 2026-05-01

### Added
- **Theme expansion** — Appearance now supports System, Mocha, Macchiato, Frappe, and Latte. System resolves from `prefers-color-scheme` and updates live when the browser or OS color scheme changes.
- **Animated background controls** — Live backgrounds now expose Motion (System, Still, Calm, Full) and Atmosphere (Soft, Balanced, Vivid) controls. Reduced-motion preferences always force Still; Calm keeps ambient sky/weather movement while disabling rare flyovers, bursts, and parallax.
- **Workspace visual profiles** — workspace snapshots now include theme and scenery, and switching workspaces reapplies the effective theme/accent alongside the saved background.
- **Workspace system-theme refresh** — active workspaces that use the System theme now respond to browser/OS color-scheme changes even when the base profile uses a fixed theme.
- **Live reduced-motion refresh** — animated backgrounds now re-resolve Motion when browser/OS reduced-motion preferences change while Vantage is open.
- **Motion settings clarity** — the Background panel now explains whether System motion currently resolves to Full or Still.
- **Accent-aware fallback atmosphere** — the theme gradient shown when backgrounds are off now follows the active accent color instead of fixed mauve/blue tones.
- **Visual background presets and readability** — Background settings now include Focus, Ambient, Showcase, and Wallpaper presets, plus a Readability control that tunes overlay strength independently from Atmosphere.
- **Scene preview controls and state badges** — Live background settings now show resolved theme/motion/weather/scenery state badges and session-only preview controls for time, season, weather, scenery, and holiday variants.
- **Background QA gallery** — `qa-scenes.html` renders a grid of forced live-scene variants, with `node scripts/qa-scenes-smoke.mjs` covering the gallery and visual-control hooks.
- **Local visual QA shim** — local-server runs now get a guarded `chrome.storage` shim so the new tab and QA gallery can render outside the extension runtime without changing installed-extension behavior.
- **Visual QA URL overrides** — QA URLs now support deterministic theme, accent, motion, atmosphere, readability, and scenery overrides without saving those choices to user settings.

## v0.8.0 — 2026-04-30

### Added
- **Wallpaper / background subsystem** — six background kinds selectable from Settings → Appearance: Animated (existing sun-cycle), Solid color, Gradient (from/to + angle), Image URL, Image Upload (base64-stored), Bing Daily (fresh photo each day, cached per date). Shared blur (0–20 px) and brightness (50–150%) sliders for image-based kinds.
- **Multi-profile workspaces** — named layout profiles in Settings → Workspaces. Each workspace stores a snapshot of accent, background, layout, quicklinks config, and per-widget enabled flags. A workspace bar renders pill buttons below the utility bar when 2+ workspaces exist; switching wraps in `document.startViewTransition()` for a smooth cross-fade. Workspace settings never mutate the base profile — computed as `effectiveSettings` each mount.
- **Quick-link folder groups** — link items can be placed in named groups. Groups render as pill buttons; clicking opens a floating popover grid of that group's links. Popover closes on Esc or outside click. MutationObserver cleans up event listeners on unmount.
- **Top Sites widget** — reads `chrome.topSites.get()` and renders a favicon pill row in the hero area. Falls back to initials if the favicon is unavailable. Hidden automatically on Firefox builds where the API is absent.
- **Feed deduplication** — after merging all feeds in `feed-list.js`, items are deduplicated by normalized URL (hostname + pathname, lowercase, trailing slash stripped) using a Set.
- **Feed filter rules** — per-panel mute/highlight rules in Settings → RSS / News. Each rule has a regex pattern, field (title or URL), action (mute hides the item; highlight adds a colored left-border accent), and optional color. Rules are applied post-fetch before render.
- **Reddit feed presets** — a collapsible presets block in the RSS and News feed settings with one-click add buttons for r/all, r/popular, r/technology, r/worldnews, r/programming, and r/science.
- **View Transitions API** — `document.startViewTransition()` wraps workspace switches and accent color changes for smooth page transitions (graceful no-op on browsers without support).
- **Storage quota panel** — Settings → Storage shows `navigator.storage.estimate()` usage and quota as a color-coded progress bar (yellow at 80%, red at 95%) plus a human-readable label.
- **Firefox container → workspace mapping** — Firefox-only section in Settings. Reads `browser.contextualIdentities.query({})` to list all containers and lets you assign each to a workspace. On page load the active container is detected via `browser.tabs.getCurrent().cookieStoreId` and the mapped workspace is applied automatically.
- **AMO update feed** — CI release workflow now generates `firefox-updates.json` (AMO-compatible format) and commits it alongside `updates.xml`. Firefox manifest's `gecko.update_url` points to the raw GitHub URL so self-hosted XPI updates are auto-detected by the browser.
- New SVG icons: `folder`, `folder-open`, `layers2`, `star`, `filter`, `hard-drive`.

### Changed
- `manifest.json` — `topSites` added to permissions; `https://www.bing.com/*` added to host_permissions.
- `manifest.firefox.json` — `topSites`, `contextualIdentities`, `tabs` added to permissions; `https://www.bing.com/*` added to host_permissions; `gecko.update_url` now set.
- `src/main.js` — `mountAll()` computes `effectiveSettings` once from the active workspace before rendering all widgets; workspace bar rendered when workspaces are configured; Firefox container detection runs on init.
- `src/storage.js` — defaults extended with `background`, `topsites`, `workspaces`, `feedFilters`, `containerMap` keys (done in prior v0.8.0 prep pass).
- `.github/workflows/release.yml` — "Update Omaha feed" step also generates `firefox-updates.json` and commits both files.

## v0.7.2 — 2026-04-30

### Added
- **Firefox port** — `manifest.firefox.json` ships alongside `manifest.json`. The CI release workflow now builds a `Vantage-vX.Y.Z-firefox.xpi` from the same source tree (Firefox manifest injected at package time). Requires Firefox 109+ (MV3 + service worker support).
- Background script (`src/background.js`) detects Firefox via `typeof browser !== "undefined"` and opens a blank new tab (which Firefox routes to the overridden newtab page) instead of the Chrome-only `chrome://newtab` URL.
- SHA256SUMS.txt in every release now includes the Firefox XPI hash.
- Release notes updated to include Firefox install instructions (temporary via `about:debugging`, permanent via DevEdition/Nightly or enterprise policy).

### Technical
- `manifest.firefox.json` includes `browser_specific_settings.gecko` (id: `vantage@sysadmindoc`, strict_min_version: `109.0`) and omits `"type": "module"` from the background service worker declaration (ES module SW requires Firefox 128+; plain SW works from 109+).
- All `chrome.*` API calls in the extension page scripts are compatible with Firefox's `chrome` namespace alias — no polyfill required.

## v0.7.1 — 2026-04-30

### Added
- **Collapsible settings sections** — every section in the settings panel now has a click-to-expand/collapse header. State persists across opens via `sessionStorage`. Appearance and Search default open; all others default closed.
- **Settings filter** — search input at the top of the settings panel filters visible sections by keyword as you type.
- **Accent color picker** — 9 Catppuccin color options (Mauve, Blue, Green, Peach, Teal, Lavender, Red, Flamingo, Sky) selectable from color swatches in Appearance settings. Applied instantly via `data-accent` attribute on `<html>`. Persists in settings.
- **Custom CSS injection** — new "Custom CSS" settings section with a monospaced textarea. CSS is injected as `<style id="vantage-custom-css">` on every load. Changes apply live while the settings panel is open. Supports all CSS custom properties (`--accent`, `--base`, etc.).
- New SVG icons: `code`, `chevron-right`.

### Changed
- `src/storage.js` — added `accent: "mauve"` and `customCSS: ""` to defaults.
- `src/main.js` — added `applyAccent()` and `applyCustomCSS()` called on init and every settings change.

## v0.7.0 — 2026-04-30

Major widget expansion — 10 new panels, a quick widget picker, and multi-embed support.

### Added
- **Widget picker** — floating popover (grid icon in utility bar) to toggle any widget on/off without opening settings. Groups widgets by category. Inline embed management (add/remove/toggle each embed).
- **To-Do List panel** — add tasks, check them off, clear completed. Unread badge shows open task count.
- **Notes panel** — sticky-note grid with 5 color variants (blue/green/yellow/red/mauve). Click to expand inline editor with title, body, and color picker. Notes persist in settings.
- **Bookmarks panel** — reads Chrome bookmarks API and renders them as a favicon grid. Requires new `bookmarks` manifest permission.
- **World Clocks strip** — slim horizontal strip below the hero section showing time in configurable IANA timezones.
- **Crypto Prices panel** — live prices via CoinGecko free API. Configurable coin list and fiat currency. Auto-refreshes every 5 minutes. Shows 24-hour change with color coding.
- **GitHub panel** — two tabs: Activity (your public event feed) and Trending (repos created in the last 7 days sorted by stars). Optional language filter.
- **Quote of the Day banner** — daily rotating quote from Quotable API (with 10 offline fallbacks). Cached per-day to avoid repeated fetches. Configurable tag filter. Manual refresh button.
- **Photo of the Day panel** — daily Picsum photo (seed-stable per date). Optional NASA APOD with API key.
- **Countdown Timer panel** — add labeled countdown events with target dates and color coding. Auto-removes past events (or shows "X days ago").
- **Unit Converter panel** — 7 categories: Length, Weight, Temperature, Volume, Speed, Data, and Area. Swap button to reverse conversion. Pure client-side math.
- **Multiple embeds** — `settings.embeds[]` array replaces the single `embed` object. Add unlimited named iframes. Settings includes an embeds list with per-embed toggle + edit + delete. Existing single-embed settings auto-migrated.
- 15 new SVG icons: `note`, `square`, `check-square`, `trending-up`, `message-square`, `hourglass`, `calculator`, `layout-grid`, `pencil`, `github`, `dollar-sign`, `arrow-left`, `arrows-up-down`, `plane` (reused), `layers` (reused).

### Changed
- `src/widgets/embed.js` — signature changed from `renderEmbed(mount, settings)` to `renderEmbed(mount, embedCfg, opts)` where `embedCfg` is one entry from `settings.embeds[]`.
- `src/main.js` — `FIXED_PANEL_KINDS` expanded; dynamic embed mounts synced in `syncEmbedMounts()`; panel reorder wired after `requestAnimationFrame`.

### Fixed
- Style comment updated to v0.7.0.

## v0.6.2 — 2026-04-29

### Added
- **Windy radar panel** — embeds `embed.windy.com` centered on your weather city. Configurable overlay (wind, gusts, rain, temperature, clouds, pressure, humidity) and zoom level. Drag-to-reorder with the other reading panels.
- **Embed panel** — generic configurable iframe for any external service (e.g. ADS-B Exchange flight tracker). Set a title and URL in Settings → Embed. Shows an "Open in new tab" link in the panel header and a graceful fallback if the site blocks embedding.
- New SVG icons: `plane` (embed panel header), `layers` (used by overlay picker).

## v0.6.1 — 2026-04-30

### Fixed
- Disabled panel widgets (calendar, and alignment of news/rss) now set `display:none` on their mount element so a gray card box never shows when the widget is off.
- Added missing `button--ghost` CSS modifier (was referenced in settings but not defined, causing ghost buttons to render with the default surface background).

### Added
- **First-run setup wizard** — shown automatically on new installs. Three layout presets: Minimal (search only), Standard (search + clock + weather + quick links + news), Full (all widgets). Optional personalize step lets you set your name and weather city (geocode or auto-detect). Wizard marks itself complete so it doesn't repeat on reload.
- **Re-launch wizard from settings** — Settings → Data → "Run wizard" button lets you switch layout presets or update your name/location at any time without manually toggling each widget.

## v0.6.0 — 2026-04-29

Major feature wave driven by a 96-source research pass: three new widgets (air quality, calendar, Pomodoro), full data portability (JSON + OPML + share link), multi-proxy CORS resilience, storage persistence, extended twilight phases, and a full accessibility skip-link.

### New widgets
- **Air quality** — live US AQI, PM2.5, PM10, and six pollen types from Open-Meteo Air Quality API (`air-quality-api.open-meteo.com`). No account or API key required. Reuses the weather location. Compact pill in the utility bar; click to expand pollen detail. Color-coded by AQI band (green → maroon → hazardous).
- **iCal calendar** — add any standard `.ics` URL (Google Calendar → "Get shareable link → iCal", Outlook → "Publish calendar", any CalDAV feed). Events shown as upcoming list grouped by day, within a configurable window (1–30 days). CORS proxy fallback chain for hosted calendars.
- **Pomodoro timer** — 25/5/15 work-break-long-break cycle (all durations configurable). Tab-blur auto-pauses; tab-focus auto-resumes. `navigator.locks` ensures only the active tab fires the phase-transition notification even when multiple new-tab pages are open. Web Notifications on completion. Live `<title>` countdown. Session-dot progress bar. Cross-tab state sync via `chrome.storage.onChanged`.

### Data portability
- **Settings JSON export** — download current settings as `vantage-settings-YYYY-MM-DD.json`.
- **Settings JSON import** — load from file; replaces all settings.
- **OPML export** — download all RSS + News feeds as `vantage-feeds-YYYY-MM-DD.opml` (Feedly / Inoreader / NetNewsWire compatible). Category attribute distinguishes rss vs news panels.
- **OPML import** — merge feeds from any OPML file (no duplicates by URL; parent-outline or category attr determines panel).
- **Config share link** — copy a `chrome-extension://<id>/newtab.html#import=<base64>` URL; opening it on any device with Vantage installed loads the encoded settings. Hash is consumed and stripped from the URL immediately.

### Reliability
- **Multi-proxy CORS chain** — RSS and iCal fetches now walk `allorigins.win → corsproxy.io` before failing. Single-proxy failure no longer breaks all feeds.
- **`navigator.storage.persist()`** — called on startup to ask the browser not to evict Vantage data under storage pressure.
- **`corsproxy.io` added to host_permissions** in manifest so MV3 allows the fallback fetch.

### Animated background — extended twilight
- **`sun-calc.js` now returns eight twilight/golden-hour events** in addition to the existing sunrise/sunset/dawn/dusk/noon: `goldenHourEnd`, `goldenHourStart` (sun at +6°), `nauticalDawn`, `nauticalDusk` (sun at -12°), `astronomicalDawn`, `astronomicalDusk` (sun at -18°).
- **`computePhase()` uses these for granular phase labels**: `astronomical-night → astronomical-dawn → nautical-dawn → pre-dawn → sunrise → morning/midday/afternoon → golden-hour → sunset → dusk → nautical-dusk → astronomical-dusk → astronomical-night`. The sky gradient is driven by the same continuous t-interpolation as before; phases now control star visibility with correct opacity at each twilight band.
- **Star opacity ladder**: `astronomical-night` (100%) → `astronomical-dawn/dusk` (90%) → `nautical-dawn/dusk` (60%) → `dusk` (55%) → `pre-dawn` (25%).
- **Golden-hour boundaries** are now event-driven (actual +6° moment) rather than a fixed 5% fraction of day length — more accurate at high latitudes.

### Accessibility
- **Skip-to-main link** — first focusable element in `newtab.html`; visually hidden until focused. Resolves WCAG SC 2.4.1.
- **Toast host upgraded** — `aria-live="assertive"` + `role="status"` so Pomodoro phase-change toasts are announced immediately by screen readers.
- **Calendar panel** uses standard panel-body structure; drag handle and refresh button follow existing ARIA patterns.

## v0.5.0 — 2026-04-29

The animated background is production-ready. v0.5.0 rolls up the v0.4.7–v0.4.14 patch series: weather that actually reads as weather, sunrise/sunset times accurate to the second, and a clean focus state on the search bar.

### Animated weather backgrounds — accurate, not decorative
- **Storms render as storms.** Wet/overcast weather (drizzle, overcast, rain, heavy-rain, storm, snow, heavy-snow) now overrides the time-of-day sky gradient with a flat slate palette via inline JS, sourced from the Apple Weather + community storm-weather color references. The previous `filter: saturate brightness` approach cascaded to and dimmed the rain streak overlays themselves; we now never apply a parent filter to `.bg`. Sun is forced to opacity 0 during heavy weather, palm-tree silhouette is hidden — a beachy silhouette undercuts the downpour mood.
- **Rain looks like rain, not LCD bands.** Rain streak overlays moved from a tiled gradient (which produced full-width horizontal stripes) to inline-SVG tiles with discrete `<line>` elements at scattered x-positions and a 4px wind-shear tilt. Two layers (220×240 foreground, 280×320 parallax) at different durations for depth. Streaks are cool blue-white (`rgba(220,235,255,0.85)`) so they read as water on a slate sky.
- **Storm tiers match precipitation level.** Open-Meteo's most common precip code in temperate climates is 63 ("rain"), not 65 ("heavy-rain") or 95+ ("storm"). The dark-sky / no-sun / no-palm treatment extends down to plain `rain` so any precipitation reads as overcast wet-sky. Drizzle gets the gentlest treatment.

### Sunrise / sunset accuracy
- **NREL SPA primary, local NOAA fallback.** Open-Meteo's `daily.sunrise` / `daily.sunset` (NREL SPA, ±30 seconds) is the source of truth, parsed via `utc_offset_seconds` into absolute-UTC moments — independent of browser timezone, correct across DST, correct in any hemisphere. New `src/utils/sun-calc.js` (vendored NOAA Solar Calculator algorithm, ~120 LOC, no dependency) provides the offline fallback and supplies civil-twilight `dawn`/`dusk` since OM's free tier doesn't include them.
- **Civil-twilight phase boundaries.** "pre-dawn" begins at civil dawn (sun 6° below horizon) and ends at sunrise; "dusk" begins at sunset and ends at civil dusk. Civil-twilight duration varies by latitude / time of year (~30 min equator, ~90 min summer-north), so transitions feel right anywhere.
- **Day-rollover watcher.** A one-shot timer fires ~5 minutes past the location's local midnight, recomputes sunrise/sunset for the new day, and chains the next rollover. Pages left open across midnight always reflect "today's" events.
- **Polar regions handled.** When the sun never rises (alwaysNight) or never sets (alwaysDay) — possible above ~66.5° latitude — sun-calc returns flags that the phase computation respects.

### UI polish
- **No more box-inside-a-box on the search input.** The global `:focus-visible` ring no longer paints inside the search wrapper's own focus-within ring. Single clean border on focus.

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
