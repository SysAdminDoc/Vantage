# Research - Vantage

## Executive Summary
Vantage is a local-first Manifest V3 new-tab dashboard for Chromium and Firefox. Its strongest current shape is readable vanilla JavaScript, no telemetry, no account requirement, rich local widgets, explicit privacy posture, and release packaging that already favors runtime allowlists over bundler complexity. The highest-value direction is not another widget; it is making the product safer and easier to publish, then tightening the capture, localization, and evidence workflows that make daily use trustworthy. Top opportunities, in order: repair the Inbox/tab-capture workflow under the current permission model; settle whether public docs and privacy policy are tracked or folded into README anchors; harden the external widget host before promoting it; formalize settings schema migrations; generate deterministic store screenshots; make accessibility evidence non-mutating and CI-friendly; finish i18n/RTL conversion; add browser workflow smoke tests; add artifact provenance; and keep commercial-style bookmark intelligence local-first.

## Product Map
- Core workflows: open a new tab, search with a selected engine, scan weather/feed/productivity widgets, manage quick links/bookmarks/inbox items, customize themes/backgrounds/workspaces, import/export settings, and install from GitHub release ZIP/XPI or the Windows shortcut installer.
- User personas: privacy-conscious browser customizers, RSS/news readers, search-engine power users, users migrating from Bonjourr/TablissNG/nightTab/Renewed Tab, and operators who want a standard local dashboard without accounts.
- Platforms and distribution: Chromium MV3 (`manifest.json`), Firefox 109+ (`manifest.firefox.json`), GitHub Releases, local unpacked builds (`scripts/build-unpacked.ps1`), Windows shortcut `--load-extension`, pending CWS/AMO/Edge/Opera/Samsung listings, and local-only docs under `docs/`.
- Key integrations and data flows: `chrome.storage.local`, optional `history`, IndexedDB feed archive, OPFS media, Open-Meteo APIs, user RSS/Atom/JSON Feed and iCal URLs, CORS proxies, Google/DuckDuckGo favicon fallbacks, Bing, GitHub API/Gists, CoinGecko, NASA APOD, Picsum, Windy iframe, browser bookmarks/top sites/reading list, and user-provided iframe/widget URLs.
- Mobile and multi-user scope: mobile apps, team workspaces, and account-backed collaboration are intentionally out of scope because the product is a desktop browser NTP and its trust model is local-first/no-account.

## Competitive Landscape
- Bonjourr: does lightweight visual polish, localization, store distribution, and user feedback loops well. Vantage should learn from its settings search, translation, and background bug reports; avoid dependence on remote visual providers that weaken privacy clarity.
- TablissNG: proves abandoned NTP users will move to an actively maintained fork. Vantage should learn from its cache/quota and weather-location issues; avoid `storage.sync` quota traps and framework churn that conflicts with Vantage's no-build model.
- Anori: strong at widget composition, folders, customization, and extension-oriented widgets. Vantage should learn from its folder/widget organization and translation demand; avoid losing the search-first dashboard identity.
- Renewed Tab: strong reference for multi-instance widgets, resizable grids, RSS/weather/backgrounds, and multilingual positioning. Vantage should copy the predictable widget-placement ergonomics, not the heavier widget sprawl.
- Linkflare, Raindrop.io, start.me, Momentum, and Workona: commercial value clusters around capture, inboxes, permanent libraries, focus workflows, sync, and workspace limits. Vantage's opportunity is local-first capture and recovery without accounts, caps, telemetry, or server-side enrichment.
- Homepage, Dashy, Homarr, and Heimdall: adjacent dashboards show durable demand for integrations, icon catalogs, status surfaces, and user-editable layouts. Vantage should learn from registry contracts and layout tooling; avoid credential-heavy homelab integrations that do not belong in a browser NTP.

## Security, Privacy, and Reliability
- [Verified] `manifest.json` and `manifest.firefox.json` no longer request `tabs` or `activeTab`, while `src/widgets/inbox.js` uses `tabs.query({ active: true, currentWindow: true })` from the NTP and `src/settings.js` tab snapshots depend on URL/title visibility. This is likely to save the Vantage tab or fail to capture arbitrary pages under the least-privilege model.
- [Verified] `docs/*.md`, `PRIVACY.md`, `CHANGELOG.md`, `CLAUDE.md`, and most markdown remain ignored by `.gitignore`; `git ls-files docs PRIVACY.md CHANGELOG.md` returns no tracked public docs. Store-submission content exists locally, but clean-checkout/public documentation policy is still ambiguous.
- [Verified] `scripts/runtime-allowlist.json` is shared by local builds and the release workflow; `scripts/validate-release-metadata.ps1`, `npm audit`, and `scripts/qa-scenes-smoke.mjs` pass locally. The packaging baseline is materially stronger than older roadmap notes.
- [Verified] `.github/workflows/release.yml` pins `actions/checkout` and `actions/setup-python` to full commit SHAs and `.github/dependabot.yml` covers npm and GitHub Actions. Release provenance still stops at `SHA256SUMS.txt`; no GitHub artifact attestations are generated.
- [Verified] `src/utils/widget-host.js` runs external widgets in sandboxed iframes, but posts host messages with `targetOrigin: "*"`, accepts messages by `event.source` only, and does not validate message schema or declared widget origin. `docs/widget-api.md` also claims a strict iframe CSP that the host cannot impose on an arbitrary remote iframe URL.
- [Verified] `scripts/accessibility-audit.mjs` writes `docs/accessibility-report.md` and `docs/accessibility-results.json`, but the generated report path is local/ignored and not tied to release CI artifacts. It is useful, but not yet reliable store evidence.
- [Verified] `_locales` counts are uneven (`en` 70, `es` 61, `de/fr/ja` 59 each), while many user-visible strings in widgets/settings remain hardcoded. `docs/i18n-strategy.md` is stale about counts and still lists Phase 2 as in progress.
- [Verified] RTL foundation exists (`setupRTL()` and CSS rules), but Arabic/Hebrew locales and decorative/responsive RTL QA are not complete.
- [Verified] `src/storage.js` has ad hoc shape migrations but no durable `schemaVersion` or migration fixture suite, despite many settings surfaces, imports, Gist transfer, workspaces, encrypted API keys, OPFS, IndexedDB, and host-permission state.
- [Likely] CWS/AMO review friction will come from broad optional host access, external iframe/widget claims, and inconsistent public documentation unless the reviewer packet and public privacy story are made clean-checkout reproducible.

## Architecture Assessment
- Strengths: no-bundler MV3 modules, explicit widget files, local-first persistence, runtime allowlisted packages, pinned release actions, no analytics, privacy table discipline, and progressive browser API usage.
- Main boundary improvements: tab capture needs a background/action/context-menu capture model; external widgets need an origin-aware host contract; storage needs versioned migrations; docs need a tracked/public policy.
- Refactor candidates: `src/widgets/inbox.js`, `src/settings.js` tab snapshot flow, `src/utils/widget-host.js`, `docs/widget-api.md`, `src/storage.js`, `scripts/accessibility-audit.mjs`, and release workflow provenance.
- Testing gaps: QA scenes verify visual presets, but there is no browser workflow smoke suite for onboarding, settings search, import/export, host permission denial, inbox capture, side panel, external widget failure, or first-run recovery.
- Documentation gaps: store guide, privacy policy, accessibility report, widget API, i18n strategy, and RTL roadmap are present locally but not consistently tracked or validated as public release assets.

## Rejected Ideas
- Add more weather/environment widgets now: rejected because weather depth is already strong and trust/capture gaps are higher impact; source: Vantage `src/widgets/*`, Open-Meteo docs, Bonjourr/TablissNG comparison.
- Add account-backed sync or team collaboration: rejected because it contradicts Vantage's no-account/no-telemetry model; source: Momentum, Workona, start.me commercial positioning.
- Replace the vanilla no-build stack with React/WXT/Plasmo/Vite: rejected because readable authored source is a review, supply-chain, and project-philosophy advantage; source: repo `CLAUDE.md`, Chrome Web Store review guidance on hard-to-review code.
- Launch a remote widget marketplace before hardening the widget host: rejected because MV3 remote code policy permits sandboxed remote content only when behavior and data use remain reviewable; source: Chrome MV3 requirements, `src/utils/widget-host.js`.
- Build a Safari/mobile port now: rejected because current install paths, APIs, and QA target desktop Chromium/Firefox; source: `manifest*.json`, README install section, Bonjourr Safari discontinuation signal.
- Add credential-heavy homelab integrations: rejected because Homepage/Dashy/Homarr patterns require API credentials and server status checks that are outside a privacy-first NTP's core purpose.
- Add remote AI features now: rejected because remote AI would introduce account/network/privacy disclosure complexity; on-device summarization can be reconsidered only after store-readiness and local capture are solid.
- Keep historical shipped items in ROADMAP: rejected because the user explicitly requires ROADMAP to contain only incomplete work.

## Sources
**Official platform and store**
- https://developer.chrome.com/docs/webstore/review-process
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/extensions/reference/api/i18n
- https://developer.chrome.com/docs/extensions/develop/concepts/browser-namespace
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- https://developer.chrome.com/docs/extensions/how-to/test/puppeteer
- https://extensionworkshop.com/documentation/manage/updating-your-extension/
- https://extensionworkshop.com/documentation/publish/self-distribution/
- https://blog.mozilla.org/addons/2026/04/23/webextensions-api-changes-firefox-149-152/
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions

**Security, QA, dependencies**
- https://cheatsheetseries.owasp.org/cheatsheets/Browser_Extension_Vulnerabilities_Cheat_Sheet.html
- https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations
- https://docs.github.com/en/actions/reference/security/secure-use
- https://pptr.dev/CHANGELOG
- https://www.npmjs.com/package/%40axe-core/puppeteer?activeTab=versions
- https://docs.deque.com/devtools-for-web/4/en/rn-node/

**Competitors and analogous products**
- https://github.com/victrme/Bonjourr
- https://github.com/BookCatKid/tablissNG
- https://github.com/OlegWock/anori
- https://renewedtab.com/en/
- https://linkflare.io/articles/best-new-tab-extensions-2026/
- https://momentumdash.com/plus
- https://raindrop.io/pro/buy
- https://support.start.me/en/articles/9182794-watch-our-introduction-video
- https://github.com/gethomepage/homepage
- https://github.com/Lissy93/dashy
- https://github.com/homarr-labs/homarr
- https://github.com/jnmcfly/awesome-startpage

## Open Questions
- Should `docs/`, `PRIVACY.md`, and `CHANGELOG.md` become tracked public release assets, or should public links collapse to README sections and release artifacts only?
- Should Inbox/tab capture use `activeTab` plus toolbar/context-menu capture, request `tabs`, or remove "Save current tab" until a least-privilege capture model is implemented?
- Should external widgets be supported as arbitrary user-provided remote manifests before store submission, or limited to generic embeds/curated manifests until a reviewer-friendly trust model exists?
- Should accessibility reports be committed, generated as CI artifacts, or both?
