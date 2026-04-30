# Vantage Roadmap

_Living document. Last revised 2026-04-29 against v0.5.0._

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
- [x] Storm rendering: per-weather sky palette override (drizzle/overcast/rain/heavy-rain/storm/snow/heavy-snow), parent CSS `filter` removed (no longer dims the rain itself)
- [x] Rain SVG tiles with discrete vertical streaks at scattered x-positions, 4° wind-shear tilt, two-layer parallax (eliminates the prior horizontal-stripe artifact)
- [x] Sun hidden / palm hidden during wet weather
- [x] NREL SPA sunrise/sunset via Open-Meteo (`±30s`), local NOAA-algorithm `sun-calc.js` fallback for offline + civil twilight (`dawn`/`dusk`)
- [x] Civil-twilight phase boundaries (replaces fixed-hour offsets); polar regions handled
- [x] Day-rollover watcher (recompute sunrise/sunset shortly after location-local midnight)
- [x] Search input no longer renders box-inside-a-box on focus

---

## v0.6.0 — Vibe & lightweight productivity (Now)

Ship these next. Each is ≤2 days of focused work, fits constraints cleanly, and has direct user demand from competitor issue trackers or HN/Reddit threads.

### Wallpapers & vibe
- [ ] **Wallpaper subsystem** behind a single `background.kind` enum: `animated` (current), `solid`, `gradient`, `image-url`, `image-upload`, `bing-daily`, `nasa-apod`, `unsplash-collection`. One renderer per kind, all share the existing animated layer's z-index. — _Catches up to Tabliss/Bonjourr/Mue [Sources 2, 11, 17]; ~1.5d._
- [ ] **Bing daily image** — anonymous endpoint `https://www.bing.com/HPImageArchive.aspx?format=js&n=1`. No auth, no CORS proxy needed. Add to host_permissions. — _[Source 11], 0.5d._
- [ ] **Local image upload** — File API, store as base64 in `chrome.storage.local` (cap 4 MB; warn user above 2 MB to keep total under 5 MB quota). — _[Source 26], 0.5d._
- [ ] **Solid color + gradient picker** — color tokens already exist; surface a small palette + custom hex input. — _[Source 39] (Brave parity), 0.5d._
- [ ] **NASA APOD** — anonymous public endpoint `https://api.nasa.gov/planetary/apod` requires `DEMO_KEY` (50/day shared) or user-provided key in settings. Default to DEMO_KEY with a "rate limited — bring your own key" hint. — _[Source 2] (TablissNG ships it), 0.5d._
- [ ] **Quote-of-the-day** — bundled offline JSON pack of ~365 entries (one per day-of-year), refreshes daily. Optional user-supplied gist URL for custom packs. — _[Sources 11, 17, 48], 0.5d._
- [ ] **Custom accent color picker** beyond Mocha/Latte tokens — single accent applied via the existing CSS-variable system; presets (Catppuccin Frappé/Macchiato + Tokyonight + Gruvbox + Nord) plus arbitrary hex. — _[Sources 50, 75, 76], 0.5d._
- [ ] **Background blur slider** + saturation/brightness — applied to image backgrounds only, not the animated weather layer (which already self-tunes). — _[Sources 6, 32], 0.5d._

### Lightweight productivity widgets
- [ ] **Pomodoro timer** with auto-pause on tab blur, alarm shown in `<title>`, Web Notifications API for completion, `navigator.locks` to keep state coherent across multiple new tabs. — _[Sources 41, 94, 95]; surging "table-stakes" pattern; ~1.5d._
- [ ] **Todo widget** — Local-only, drag-to-reorder, click to toggle, "auto-focus" mode pulls next item into focus slot when current is checked. — _[Source 41] (Momentum's auto-focus mode); 1d._
- [ ] **Notes widget with markdown** — minimum: headings, lists, links, checkboxes, code spans. localForage/IndexedDB (5 MB+ headroom; localStorage caps at 5 MB total for the whole extension). — _[Sources 11, 36, 44, 46], 1d._
- [ ] **`.ics` URL calendar widget** — fetch any iCal URL (Google Calendar's secret ICS, Outlook share link, university timetables), parse with a vendored micro-parser (~50 LOC), render today's events. **No OAuth, no accounts.** Solves Bonjourr #416/#529. — _[Sources 15, 16, 47, 69]; underserved gap; ~1d._
- [ ] **World clocks** — multi-zone strip in the utility bar; named labels. — _[Sources 4, 11, 41, 50], 0.5d._
- [ ] **Countdown widget** — days/hours to a user-configured target date. — _[Sources 2, 17, 48], 0.5d._

### Onboarding & data hygiene
- [ ] **Settings JSON export / import** — round-trip backup; downloadable file; pasteable text. — _[Sources 22, 30, 90]; demanded across the space; 0.5d._
- [ ] **OPML import** for RSS feeds (drop-in from Feedly, Inoreader, NetNewsWire, Smart RSS Reader). Preserves folders if any. — _[Sources 22, 96]; 0.5d._
- [ ] **OPML export** — generate from current `rss.feeds` + `news.feeds`. — _[Sources 22, 96], 0.25d._
- [ ] **Storage quota panel** in settings — "you've used X of 5 MB" with a per-bucket breakdown so users see what's eating the budget (notes, read-state arrays, custom backgrounds). — _[Source 17]; underserved; 0.5d._
- [ ] **First-run onboarding tour** — three-step inline tour (search engine → location → first feed). Dismissible; never reappears. — _Gap; reduces "looks broken" first impression; 0.5d._

### Accessibility & semantic web standards
- [ ] **Skip-to-main link** — first focusable element on the page. — _[Source 70] (WCAG 2.4.1); 0.1d._
- [ ] **ARIA live region for feed-update + Pomodoro state messages** ("Feed updated 2 minutes ago", "Pomodoro complete"). — _[Source 70]; 0.25d._
- [ ] **24×24 minimum tap-target audit** — WCAG 2.2 SC 2.5.8. Sweep the icon-button + segmented control + drag-handle sizes. — _[Source 70]; 0.25d._
- [ ] **Drag-alternative buttons** — keyboard-accessible "move up / move down" on the panel grip handles for users who can't drag. — _[Source 70] (WCAG 2.5.7); 0.5d._
- [ ] **Focus-not-obscured audit** — WCAG 2.2 SC 2.4.11. Verify `position: sticky` and modal-dialog elements never cover a focused control. — _[Sources 70, 71]; 0.25d._

---

## v0.7.0 — Power-user features (Next)

These need v0.6 to land first (settings export/import is a prerequisite for workspaces; the widget set must stabilize before the API can be locked).

- [ ] **Multi-profile / workspaces** — switch between Home / Work / Hobby layouts, each with its own widgets, links, theme, and background. Storage shape: `vantageSettings.workspaces[].name + .layout`. Active workspace ID persisted separately so installs sync to a sane state. — _[Sources 7, 10, 41, 44]; surging pattern; ~3d._
- [ ] **Keyboard shortcut configuration** — surface every action that already has a default binding (`/` for search, `Esc` for panel close, etc.) and let the user remap. Stored per-action. — _[Source 93] (Raycast-style); 1.5d._
- [ ] **Firefox port** (`browser_specific_settings`, `manifest_version: 3` with event-page fallback) — split codebase via a tiny browser-detect shim; share 95% of the source. Mozilla AMO MV3 is GA. — _[Sources 85, 86]; ~2d._
- [ ] **Per-Firefox-container settings** — directly addresses Tabliss #477 (years-stale). Use `browser.contextualIdentities` to detect container and load workspace-by-container. **Firefox-only.** — _[Source 7]; underserved gap; ~1d after Firefox port._
- [ ] **Custom CSS injection** — text area in settings; injected as `<style>` into the page; saved to `chrome.storage.local`. Syntax-checked with a minimal CSS lexer; warning toast if blocked. **⚠ Lower-risk than custom HTML; no script execution.** — _[Sources 2, 11, 30]; 1d._
- [ ] **Custom icon per quick link** — replace the auto-`s2/favicons` lookup with a user-uploaded image (or letter fallback). Three modes: auto / URL / upload. — _[Sources 8, 13, 15, 17, 30]; 1d._
- [ ] **Quick-link folders / groups** — group expansion via popover. Same drag system, recursive. — _[Sources 12, 13, 14, 89]; ~1.5d._
- [ ] **Local video as background** — File API + base64 (capped at 8 MB, encourages WebM small files). Pause-on-tab-blur, pause-on-battery (`navigator.getBattery`). — _[Sources 12, 52]; 1d._
- [ ] **Most-visited + recently closed widgets** — `chrome.topSites` + `chrome.sessions`. Permission requested on first enable, not at install. — _[Sources 39, 91]; ~1d._
- [ ] **History search inline** — `chrome.history.search` behind a settings opt-in. Respects browser history-clearing. — _[Source 39]; ~1d._

### Accuracy & weather depth
- [ ] **Air quality + pollens panel** — Open-Meteo Air Quality API; reuses location. EU AQI / US AQI / pm2.5 / pm10 / O3 / pollens. — _[Source 56]; 0.5d._
- [ ] **Animated radar overlay** — RainViewer past + nowcast tile loop in the weather widget. **⚠ RainViewer 2025 terms restrict to "personal/educational use" so this is offered as opt-in for individuals; commercial users are warned in-app.** — _[Sources 60, 61]; 1d._
- [ ] **Civil / nautical / astronomical twilight overlays** in the animated background — already computing civil twilight via `sun-calc.js`; expose nautical (-12°) and astronomical (-18°) bands as togglable layers. — _[Sources 82, 84, 88]; 0.5d._
- [ ] **Golden / blue hour windows** — visual band that brightens during golden hour, cools during blue hour. Photographers love this. — _[Sources 83, 84]; 0.5d._

### Modern web platform adoption
- [ ] **View Transitions API** for theme switch, panel open/close, "mark all read" — `document.startViewTransition()` is Baseline late 2025. Single line each. — _[Sources 72, 73]; 0.5d total._
- [ ] **Anchor positioning + Popover API** for the engine picker, quick-link context menu, and settings tooltips — declarative, replaces the JS focus-mgmt code. — _[Sources 72, 74]; ~1.5d._
- [ ] **CSS `@scope`** for component-scoped selectors — applies to widget styles to avoid global selector creep. — _[Source 72]; 0.5d._

### Privacy & store readiness (incremental)
- [ ] **Privacy Table block in README** that itemizes every endpoint, the trigger, and the data sent — copy of the existing Privacy section formalized into the table format already present, audited per release. — _Per repo's privacy-first constraint #1; 0.25d._
- [ ] **In-extension geolocation disclosure banner** — first time the weather widget asks for `navigator.geolocation`, show a one-time banner explaining what's stored (lat/lon, never sent except to Open-Meteo). — _[Source 63] (Chrome MV3 geolocation guidance); CWS-required for `geolocation` justification; 0.5d._
- [ ] **Per-permission justification text** filed in CWS dashboard prep — one short sentence per declared permission and host. — _[Sources 66, 68]; 0.5d._

---

## v0.8.0 — Plugins, sharing, and platform leverage (Later)

Bigger architectural commitments. Should not start until v0.7 ships and the widget API has stabilized through 1–2 minor versions of internal use.

- [ ] **Iframe-sandboxed widget API** — Renewed Tab's pattern: third-party widgets run in `<iframe sandbox>` with `src` declared in user config; postMessage protocol for sub/pub; no remote code beyond what the user pasted into their own settings. **⚠ Constraint #4 stands: official "core" widgets stay in-tree; iframe widgets are user-pasted only, no marketplace fetch.** — _[Sources 2, 20, 21, 64]; ~5–8d to design + document._
- [ ] **Theme bundle marketplace (PR-reviewed monorepo)** — Mue's pattern adapted: `vantage-themes` repo accepts PRs of `theme.json` (color tokens + accent + background pack URL + greeting copy + font pick). The extension fetches a generated `manifest.json` once on demand from `raw.githubusercontent.com`. **Constraint #1 holds because the user opts into the fetch and the data is plain JSON.** — _[Sources 17, 18, 19]; ~3d for monorepo + tooling, ongoing for review._
- [ ] **Whole-config URL share link** — base64-encoded settings JSON in a fragment URL, `https://vantage.dashboard/import#cfg=...`, click to apply. r/startpages will explode with these. — _[Sources 50, 51]; viability proof in the startpage-emporium showcase culture; 1d._
- [ ] **Dashboard sharing screenshot generator** — single button that captures a styled OG-image of the active dashboard. Uses `html2canvas` (vendored, ~30 KB) since `chrome.tabs.captureVisibleTab` is overkill. — _Gap; community-fueled growth; 1d._
- [ ] **Vivaldi-style speed-dial groups + per-group widgets** — outer layer of "groups," inner layer of widgets. Two-step nesting; lots of design work. — _[Sources 37, 38, 89]; ~3d._
- [ ] **OffscreenCanvas blur for backgrounds** — move CSS `filter: blur()` to OffscreenCanvas in a service worker for stable 60fps even at 4K and during heavy widget redraws. — _[Sources 52, 62]; ~1.5d._
- [ ] **`navigator.locks` for true single-state across many open new tabs** — extends current cross-tab `chrome.storage.onChanged` strategy; needed for shared Pomodoro state, single live feed cache, single weather fetch in flight. — _Web platform reference (MDN: navigator.locks); ~1d._
- [ ] **Periodic Background Sync for feed pre-fetching** — pre-warm the RSS cache so the user's next new tab is instant. **⚠ Permission warning surface is heavy; gate behind opt-in toggle.** — _Web platform reference (MDN: Background Sync API); ~1d._
- [ ] **WCAG 2.2 AA full audit** — automated (axe-core) + manual screen-reader pass (NVDA + VoiceOver). All Now/Next a11y items must already be in. — _[Sources 70, 71]; ~3d._
- [ ] **i18n scaffolding** — `_locales/en/messages.json`, `__MSG_*__` everywhere; English authoritative; community-translation pipeline via Weblate or PRs against `_locales/`. **First non-English target: es, de, fr, ja.** — _[Source 69]; ~3d for scaffolding, ongoing for translations._
- [ ] **RTL / `@@bidi_*` support** — Arabic, Hebrew. Logical-property CSS pass (`margin-inline-start` etc.). — _[Source 69]; ~1d on top of i18n scaffolding._

### Reliability & resilience
- [ ] **Multiple CORS-proxy fallback chain** (allorigins.win → corsproxy.io → EveryOrigin) — randomized, sticky-per-feed for 1 hour, telemetry-free. — _[Sources 80, 81]; ~0.5d._
- [ ] **Self-hostable Cloudflare Worker recipe** for the CORS proxy — ship a `scripts/cors-worker.js` and a one-click "Deploy to Cloudflare" link; user pastes URL into settings. Eliminates the third-party-proxy dependency for power users. — _[Source 80]; ~0.5d._
- [ ] **Per-feed timeout & exponential retry** — already partial; codify policy: 8s timeout, 1 retry with 5s backoff, then mark feed errored for 10 min. — _Gap (current implementation); 0.5d._
- [ ] **Persistent storage** — call `navigator.storage.persist()` so the user's notes/read-state can't be evicted under disk pressure. — _Web platform reference (MDN: navigator.storage); 0.1d._

---

## v0.9.0 — Reader power-tools (Later)

A tightly scoped sub-roadmap for the RSS/News surface. Most demand is from r/RSS and Inoreader-refugee threads.

- [ ] **Multi-source aggregated dev feed** — preset bundle: HN frontpage + GitHub Trending (per-language) + Product Hunt + Lobsters. Single panel, sorted. — _[Sources 32, 33, 79]; 1d._
- [ ] **Reddit-as-feed integration** — subreddit RSS endpoints (anonymous, `https://reddit.com/r/<sub>/.rss`) presented as first-class feed sources. — _[Sources 33, 55, 88]; 0.25d._
- [ ] **YouTube subscriptions OPML recipe** — point at the public OPML export from Google Takeout; settings-panel button "Import YouTube subscriptions" that walks the user through it. — _[Source 90]; 0.25d._
- [ ] **Bookmarking inside the feed** — star icon on each row; bookmarks panel underneath unread. — _[Sources 33, 82]; ~1d._
- [ ] **Filter rules engine** — mute / highlight / hide rules per feed using regex on title or domain. — _[Sources 55, 85]; ~1d._
- [ ] **Keyword monitoring across all feeds** — alert via Web Notifications when "X" appears in any feed item. — _[Sources 55, 83]; ~1d._
- [ ] **Feed dedupe by canonical URL** — same article cross-posted to two sources collapses into one row. — _Gap; common reader-feature in NetNewsWire/Inoreader [Sources 54, 55]; ~0.5d._
- [ ] **Permanent feed archive** — IndexedDB store of every item ever seen, searchable. **⚠ Storage budget grows unbounded; cap at 10k items default with user-tunable limit.** — _[Sources 55, 84]; ~2d._

---

## v1.0.0 — Stable release

Locked APIs, full a11y, store-listed, internationalized.

- [ ] **Locked widget API** — third-party widgets via the iframe-sandbox path declared 1.0-stable; semver guarantees on the postMessage protocol; documented in `docs/widget-api.md`. — _Built incrementally on v0.8 plugin work._
- [ ] **WCAG 2.2 AA verified** — full report in `docs/accessibility-report.md` with all 86 SCs evaluated, axe-core CI artifact attached to each release. — _[Sources 70, 71]._
- [ ] **i18n: en, es, de, fr, ja, plus a community-driven flag** for "more available" — translation completeness threshold for shipping a locale: 95%. — _[Source 69]._
- [ ] **Chrome Web Store listing** with localized screenshots and descriptions per locale. CWS Privacy Practices fields filled per [Source 68]. — _[Sources 66, 67]._
- [ ] **AMO (Firefox add-ons) listing** — same package with `browser_specific_settings`. — _[Sources 85, 86]._
- [ ] **Microsoft Edge Add-ons listing** — same package re-listed; the cost is one form. — _Gap; trivial after CWS._

---

## Always-on themes

Maintained continuously, not version-gated.

- [ ] **Track Catppuccin palette versions** — re-import tokens when upstream ships a new flavor or revs colors. — _[Sources 75, 76]._
- [ ] **Refresh `manifest.json host_permissions`** on every release — only request what's actually used; CWS scrutinizes `*://*/*`. — _[Sources 66, 68]._
- [ ] **Re-capture README screenshots** whenever the UI shifts (per global rule). DPI-aware capture (system is 125%).
- [ ] **Privacy Table audit** in README each release — every new outbound endpoint or new permission gets a row before shipping. — _Per repo's privacy-first constraint #1._
- [ ] **Verify clean-profile install** before each release — extract ZIP into a fresh user-data-dir, smoke-test all six widgets.
- [ ] **Track Open-Meteo changelog** — new variables (apparent_temperature_max, dew_point_2m, etc.) and new domains (air-quality, marine, climate, ensemble). — _[Sources 56, 57, 58, 59]._
- [ ] **Track Chrome `chrome.*` API changes and what's-new posts** — e.g. Reading List API, Side Panel surface (we don't use them yet but they may unlock features). — _[Sources 62, 65]._
- [ ] **Track Interop project highlights** — adopt View Transitions cross-doc, Anchor Positioning, CSS `@scope`, container style queries, Popover API as they ship cross-browser. — _[Source 72]._
- [ ] **CORS proxy health monitoring** — quarterly check that `allorigins.win` + alternates are operational; document last-checked date in CLAUDE.md. — _[Sources 80, 81]._
- [ ] **Manual smoke-test before each release** — by repo convention there are no automated tests; QA is a documented checklist (six widgets render, settings round-trips, drag works, weather + RSS fetch, Brave + Chrome + Edge + Vivaldi all load the unpacked extension). The clean-profile install item above is part of this. — _Per repo `CLAUDE.md` "no tests unless explicitly requested" rule._
- [ ] **Storage migrations for breaking shape changes** — the `storage.js` deep-merge handles forward-additive fields automatically; any field rename or array→object change ships with a `migrate(prevSettings)` step in `loadSettings()` keyed off a `schemaVersion` field (added on first migration). — _Gap; required before workspaces (v0.7) since that change will move existing top-level keys under `workspaces[0]`._

---

## Testing & quality

This roadmap intentionally does not commit to an automated test suite. The repo's `CLAUDE.md` declares "No tests unless explicitly requested." For a no-build-step vanilla-JS extension, the cost/value of a Karma/Jest stack is poor; the reliable signal is the clean-profile manual smoke-test plus DevTools-protocol ad-hoc verification against a known-good live instance (the workflow used to debug v0.4.7-v0.4.14). If the project ever adopts the iframe widget API, that API surface should ship with a small Playwright suite to keep the postMessage protocol stable across browsers — at which point this section gets revised.

---

## Under Consideration

Items with real merit but unresolved trade-offs. Decided per release window, not pre-committed.

- **AI chatbot widget on the new tab** — Brave Search Answers ($4/1k, OpenAI-compatible chat completions) is the cleanest BYOK path. **Tension with constraint #1**: every query is sent to a third party. Acceptable only if (a) opt-in default off, (b) BYOK so cost lives with user, (c) clear "this query is sent to Brave" UX. Decision deferred until v0.8. — _[Sources 67, 77, 78]._
- **Search history dropdown via `chrome.history`** — declared deferred in the prior roadmap. Permission stigma + low repeat user-value vs. the work. Status: keep deferred unless the History API gets a per-page-only mode. — _Per existing v0.3 deferral note._
- **Email inbox preview (Gmail / IMAP)** — heavy OAuth surface; Google's OAuth review process for Gmail scopes is a multi-month project. Likely not worth it; users already have Gmail open. — _[Source 41] (Momentum has it via OAuth)._
- **Apple/Google Calendar OAuth** — same OAuth tax as Gmail; the `.ics` URL widget in v0.6 covers 90% of demand without it. Reconsider only if iCal turns out to be insufficient (e.g., users want event creation). — _[Sources 15, 16, 41, 47, 68]._
- **Mood-of-day curated photo collections** — Bonjourr's pattern. Easy to build but overlaps with Unsplash topic feeds; deferred until we see whether topic feeds land first. — _[Source 11]._
- **WebAuthn / passkey lock for the settings panel** — bio-lock the modify path so a shared device can't reset config. Real demand on family/work devices. Held in consideration only because the new-tab page isn't the strongest place for an auth boundary (you can still open an incognito tab). Reconsider after v0.7 workspaces ship. — _Web platform reference (MDN: Web Authentication API)._
- **Hexagon / non-rectangular tile layouts** — fun aesthetically but breaks accessibility and drag-reorder. Probably never. — _[Source 50] (referenced in startpages-emporium aesthetic showcases)._
- **GIPHY backgrounds** — animated GIF as wallpaper. Bandwidth-heavy, often offensive content surfaces. Skip unless requested. — _[Source 2] (TablissNG)._
- **Brave-style sponsored backgrounds with revenue share** — opt-in ad model. **Direct contradiction of constraint #1** unless run as a separate fork; rejected here, but noting the existence of the model. — _[Source 40]._

---

## Rejected

Each line is "feature — citation — one-sentence rejection."

- **Switch to a build pipeline (Bun, Vite, Astro, React, Vue)** — _[Sources 17, 19, 28, 50]._ ⚠ contradicts constraint #2; the no-build-step rule is core identity.
- **Embed third-party hosted widgets (Apption-style remote-code marketplace)** — _[Source 48]._ ⚠ contradicts constraint #4; no remote code.
- **Custom HTML widget** — _[Source 2]._ XSS surface that's hard to make safe inside the new-tab origin; the custom-CSS widget gives 80% of expressiveness with 5% of risk.
- **TradingView embed** — _[Source 50]._ Pulls TradingView's analytics + cookies; contradicts constraint #1.
- **Smart-home control (Hue) from new tab** — _[Source 50]._ Out of scope; needs local network discovery, breaks the "browser-extension only" model.
- **ML-driven dynamic wallpapers** — _[Source 52]._ Inference cost on every load; no offline-friendly path; bloats install size.
- **RGB hardware sync (iCUE/Chroma)** — _[Source 53]._ Out of scope for a browser extension; desktop-app feature.
- **Companion mobile app** — _[Source 53]._ Defeats the privacy-first no-account stance unless it does nothing — and a no-op app is pointless.
- **SSO / Keycloak / Authelia for settings** — _[Source 49]._ No multi-user / no auth in this product.
- **Team workspaces with cloud-shared collections** — _[Sources 41, 43, 44]._ Multi-user + server requirement contradicts constraint #1; would require an entirely separate hosted product.
- **SOC2 compliance work** — _[Source 44]._ Vantage has no server, no audit surface; nonsensical for this codebase.
- **Custom iframe widget for arbitrary URLs without sandboxing** — _[Source 47] (Plus AI's pattern)._ Same XSS rationale as custom HTML widget; the v0.8 sandboxed-iframe API is the safe path.
- **Bitcoin mempool / GitHub-contribution-calendar / IP info / jokes-API widgets** — _[Source 2]._ Niche, low repeat value, each adds an outbound endpoint; users can build one as iframe widgets after the v0.8 plugin API ships.
- **Spotify currently-playing / Strava / Twitter X-feed / Fitbit metrics widgets** — _[Source 41]._ All require user-account OAuth; same heavy-tail justification as Gmail.
- **Custom NoSQL / IndexedDB-backed sync server, peer-to-peer sync** — _[Source 89] (Group Speed Dial does this)._ No server. E2EE-via-WebDAV-or-Gist is the right shape (v0.8 candidate); a custom sync server is rejected.
- **Audit log of config changes / crash log capture as a hosted service** — _Gap (no specific competitor cited)._ Local-only crash-log file is fine; a hosted service is rejected for the same constraint reasons.

---

## Appendix — Sources

Numbering is the same used inline above. URLs verified at research time (2026-04-29).

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
11. https://github.com/victrme/Bonjourr — Bonjourr; iOS-inspired; videos as backgrounds, Pomodoro, Notes.
12. https://github.com/victrme/Bonjourr/blob/master/CHANGELOG.md — Recent: context menu, custom greetings, video sound.
13. https://bonjourr.fr/docs/overview/ — Link groups, world clocks, custom icons modes, custom CSS, Google Fonts.
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
30. https://github.com/zombieFox/nightTab — Customizable bookmark grid, JSON config import.
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

---

## Notes on this revision

- v0.5.0 (current ship) closes out the v0.4 animated-background branch by promoting the v0.4.7–v0.4.14 patch series into a stable minor.
- Items that were on the prior roadmap but are reframed below: **wallpapers + greeting + quote** (was v0.5, now v0.6 with a clearer renderer-per-kind architecture); **Notes + Pomodoro + Todo + Calendar** (was v0.6, now v0.6 with concrete API choices: localForage, `navigator.locks`, `.ics` URL); **settings JSON / OPML / multi-profile / Firefox port** (was v0.7, kept on v0.7 but split — settings + OPML moved earlier to v0.6 since they unblock workspaces).
- The prior roadmap's v1.0 items (locked widget API, WCAG AA, i18n, CWS) survive intact.
- Always-on items expanded to include CORS-proxy health, Open-Meteo changelog tracking, and Interop project tracking — all are zero-maintenance per release but real risks if neglected.
