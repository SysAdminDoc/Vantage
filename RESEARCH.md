# Research - Vantage

## Executive Summary
Vantage is a local-first Manifest V3 new-tab dashboard for Chromium and Firefox with an unusually broad widget set, strong privacy posture, readable vanilla JavaScript, and recent hardening around URL safety, imports, widget sandboxing, migrations, debug logging, and browser smoke tests. The highest-value direction is release trust and store readiness after the GitHub Actions removal, followed by least-privilege permission prompts, full localization, and broader browser workflow evidence. Top opportunities: restore a documented local release pipeline; clear stale Dependabot/GitHub Actions surfaces; move optional browser-data permissions to runtime prompts; reconcile external-widget docs with runtime security; finish i18n/RTL parity; expand smoke/a11y coverage; generate deterministic store evidence; verify full-state export/restore; deepen local-first capture ergonomics; and keep remote marketplace ideas gated until the widget trust model is reviewer-friendly.

## Product Map
- Core workflows: open a new tab, search through a selected engine, scan weather/feed/productivity panels, capture links into quick links/inbox/starred feeds, customize visual workspaces/backgrounds/themes, and import/export settings.
- User personas: privacy-first browser customizers, RSS/news readers, search-engine switchers, local productivity users, and users migrating from Bonjourr, TablissNG, Anori, Mue, Renewed Tab, nightTab, or commercial dashboards.
- Platforms and distribution: Chromium MV3, Firefox 109+ MV3, GitHub Releases ZIP/CRX/XPI, Windows shortcut installer, local unpacked builds, pending store listings, and public docs under `docs/`.
- Key integrations and data flows: `chrome.storage.local`, `chrome.storage.session`, IndexedDB feed archive, OPFS media, optional `history`/`tabs`, browser bookmarks/top sites/reading list/side panel, Open-Meteo services, user RSS/Atom/JSON Feed/iCal URLs, CORS proxies, favicon providers, Bing, GitHub/Gists, CoinGecko, NASA APOD, Picsum, Windy, and user iframe/widget URLs.

## Competitive Landscape
- Bonjourr: strong visual polish, localization, store packaging, and fast issue triage. Vantage should learn from its store-channel release assets and settings-import bug reports; avoid relying on remote background providers as a core trust dependency.
- Anori: strong widget/folder composition and recent schema-upgrade work. Vantage should learn from duplicate folders, bookmark-folder widgets, and schema-upgrade release notes; avoid letting a plugin model overtake the search-first dashboard identity.
- TablissNG: active fork with strong extension feedback. Its open issues show demand for per-widget toggles, cache expiry, startup URL copy, location clarity, and storage quota handling; Vantage already avoids `storage.sync` but should keep volatile state local.
- Mue: mature new-tab competitor with many locales and community translation flow. Its recent locale-shape crash, news 404 crash, favicon trim issue, and weather ambiguity point to concrete tests Vantage should add before expanding localization.
- Renewed Tab, nightTab, and Mue-style dashboards: table-stakes features include multi-widget layouts, RSS/weather/backgrounds, search, import/export, and browser-store availability. Vantage is competitive on widgets; store availability and localization remain weaker.
- Momentum, start.me, Raindrop.io, Workona, and Toby: commercial value clusters around capture, read-later workflows, workspace organization, sync, and onboarding. Vantage should copy local-first capture/recovery depth, not account-backed collaboration.
- Homepage, Dashy, Homarr, Heimdall, and awesome-startpage projects: adjacent dashboards prove durable demand for registries, icon catalogs, status surfaces, and editable layouts. Vantage should borrow registry contracts and health diagnostics only where they remain no-account and browser-local.

## Security, Privacy, and Reliability
- [Verified] `b4ac404` removed GitHub Actions workflows, but `README.md`, `CLAUDE.md`, `CHANGELOG.md`, and `scripts/runtime-allowlist.json` still reference release workflows/CI artifacts; this can mislead installers and future release agents.
- [Verified] GitHub has open Dependabot PRs #4-#7 for removed GitHub Actions dependencies. `gh pr close` failed with HTTP 401 in this session, so repo settings still need cleanup even though `.github/workflows/` and `.github/dependabot.yml` are absent from `git ls-files`.
- [Verified] `manifest.json` requests `bookmarks`, `topSites`, `readingList`, and `sidePanel` at install while those widgets/features are user-toggleable or browser-specific; `history` and `tabs` already use optional permission patterns, proving the repo has the right model for narrower install prompts.
- [Verified] `src/utils/widget-host.js` now validates widget origins, bounds manifests/messages, removes `allow-same-origin`, and uses explicit `targetOrigin`; the remaining gap is docs/runtime drift: `docs/widget-api.md` says local testing can use `http://localhost`, while `fetchManifest()` requires HTTPS.
- [Verified] `_locales` exists for English, Spanish, German, French, and Japanese, but `src/utils/i18n.js` is not used by app modules and most settings/widget strings are hardcoded. Locale files are partial seed data, not production localization.
- [Verified] `npm audit --json` reports 0 vulnerabilities. `npm outdated --json` shows `@axe-core/puppeteer` 4.11.3 -> 4.12.1 and `puppeteer` 25.1.0 -> 25.2.1.
- [Verified] Browser smoke tests cover onboarding skip, settings open/filter, quick-link add, settings serialization, and widget manifest validation; they do not yet cover optional-permission denial/regrant, host permission recovery, side panel behavior, Firefox paths, RTL/i18n, import section diffs, OPFS media, or IndexedDB archive round trips.
- [Verified] Storage quota UI exists in `src/settings.js`, OPFS is used for large video backgrounds, and feed archive is IndexedDB-backed. There is still no single full-state round-trip verifier covering settings, denied origins, vault data, OPFS references, archive data, workspaces, and imports together.

## Architecture Assessment
- Strengths: small no-bundler module graph, clear widget boundaries, runtime package allowlist, local-first persistence, URL normalization, host-permission broker, widget sandboxing, migration tests, debug log, and current browser smoke harness.
- Main boundary improvements: make browser-data permissions runtime-granted like `history`/`tabs`; separate release packaging into a local first-class script; centralize all user-facing strings behind `i18n()`; expand import/export tests to every durable store.
- Refactor candidates: `manifest.json`, `manifest.firefox.json`, `src/widgets/bookmarks.js`, `src/widgets/topsites.js`, `src/widgets/feed-list.js`, `src/background.js`, `src/settings.js`, `src/utils/host-permissions.js`, `src/utils/widget-host.js`, `docs/widget-api.md`, `scripts/build-unpacked.ps1`, and a new local release packager.
- Test and documentation gaps: local release command, stale workflow wording, optional-permission smoke tests, store screenshot generator, translation parity guard, Firefox side-panel/sidebar checks, full-state restore fixture, and external-widget local-dev docs.

## Rejected Ideas
- Add another weather/environment widget now: not recommended because weather depth is already high and release/permission/localization trust have higher user impact; sources: `src/widgets/*`, Open-Meteo docs, TablissNG weather issues.
- Add account-backed sync or team collaboration: not recommended because it conflicts with Vantage's no-account/no-telemetry model; sources: Momentum, start.me, Raindrop.io, Workona.
- Replace the vanilla module stack with React/WXT/Plasmo/Vite: not recommended because readable shipped source is a review and supply-chain advantage; sources: `CLAUDE.md`, Chrome Web Store MV3 requirements.
- Promote arbitrary external-widget registry before store submission: not recommended until docs, review packet, and manifest trust model are tighter; sources: Chrome MV3 remote-code policy, `src/utils/widget-host.js`.
- Build a mobile app or Safari port now: not recommended until desktop Chromium/Firefox packaging and store evidence are stable; sources: `manifest*.json`, README install paths, Mozilla/Chrome extension docs.
- Move volatile usage state to `storage.sync`: not recommended because competitor issues show quota failures and Vantage's local-only stance is deliberate; source: TablissNG issue #149.
- Add credential-heavy homelab integrations: not recommended because Homepage/Dashy/Homarr patterns add secrets and server status polling that do not fit a privacy-first browser NTP.

## Sources
**Official platform and store**
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/extensions/reference/api/i18n
- https://developer.chrome.com/docs/extensions/how-to/test/puppeteer
- https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/
- https://extensionworkshop.com/documentation/manage/updating-your-extension/
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions

**Security, QA, dependencies**
- https://cheatsheetseries.owasp.org/cheatsheets/Browser_Extension_Vulnerabilities_Cheat_Sheet.html
- https://pptr.dev/CHANGELOG
- https://www.npmjs.com/package/%40axe-core/puppeteer
- https://docs.deque.com/devtools-for-web/4/en/rn-node/

**Competitors and analogous products**
- https://github.com/victrme/Bonjourr
- https://github.com/OlegWock/anori
- https://github.com/BookCatKid/TablissNG
- https://github.com/mue/mue
- https://renewedtab.com/en/
- https://github.com/zombieFox/nightTab
- https://momentumdash.com/plus
- https://start.me/
- https://raindrop.io/pro/buy
- https://www.workona.com/
- https://github.com/gethomepage/homepage
- https://github.com/Lissy93/dashy
- https://github.com/homarr-labs/homarr
- https://github.com/jnmcfly/awesome-startpage

## Open Questions
- Which public store should be submitted first: Chrome Web Store, AMO, Edge Add-ons, Opera, or Samsung Internet?
- Which locales are release-blocking beyond the current English, Spanish, German, French, and Japanese seed files?
- Should local-widget development support `http://localhost` manifests, or should docs require HTTPS-only development from the start?
