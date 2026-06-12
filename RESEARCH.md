# Research - Vantage

## Executive Summary
Vantage is a privacy-first MV3 new-tab dashboard for Chromium and Firefox with a strong local-first product shape: no build step, no telemetry, local storage by default, dense widgets, animated weather scenes, feed/archive tools, workspaces, and explicit privacy copy. The highest-value direction is distribution trust before more feature growth. The live code and README are materially stronger than the public-delivery surfaces around them: markdown docs and privacy files referenced by README, store guides, and release validation are ignored and untracked; `updates.xml` currently accepts an empty Omaha hash; `docs/getting-started.md` still describes a dead Chromium policy-install path while `scripts/install.ps1` and README use shortcut `--load-extension`; and the widget API docs claim user manifest support that the current runtime does not implement. Top opportunities: (1) make release and public-doc validation clean-checkout safe, (2) reject empty/broken update-feed metadata, (3) rewrite install/update/store packaging docs around the actual release artifacts and installer, (4) centralize overlay keyboard/close handling, (5) downgrade or gate overclaiming widget API docs until the existing iframe-widget roadmap item ships, (6) continue the already-open privacy/network, host-permission, GitHub cache, i18n, RTL, favicon, APOD, and background-recovery items rather than duplicating them.

## Product Map
- Core workflows: open a new tab and search; scan weather/feed/utility widgets; personalize backgrounds, themes, workspaces, quick links, and embeds; import/export settings by JSON, share link, OPML, and Gist; install from GitHub Releases today with store listings still pending.
- User personas: privacy-conscious dashboard users, feed/news readers, self-host/search power users, sysadmins deploying across Chromium profiles, and users migrating from Bonjourr, Tabliss, nightTab, Momentum, or Anori.
- Platforms and distribution: Chrome, Edge, Brave, Vivaldi, Opera, and Firefox 109+; ZIP/load-unpacked is the primary Chromium route; `scripts/install.ps1` patches browser shortcuts with `--load-extension`; self-signed CRX remains useful mainly for Vivaldi and update-feed experiments; CWS/AMO/Edge/Opera submissions are not yet cleanly publication-ready.
- Key integrations and data flows: `chrome.storage.local`, `chrome.storage.session`, IndexedDB feed archive, OPFS media; outbound calls to Open-Meteo endpoints, user RSS/iCal/feed URLs, CORS proxies, Google favicon service, Bing, GitHub API and Gists, CoinGecko, NASA APOD, Picsum, Windy/RainViewer embeds, and user-provided iframe URLs.

## Competitive Landscape
- Bonjourr does strong daily-use customization, right-click actions, Pomodoro, Gist-style sync, and background controls. Vantage should learn from its bug reports around stuck uploaded backgrounds and keyboard event collisions; avoid cloud font/background providers that add privacy rows or third-party calls on every tab.
- TablissNG shows an active maintained fork can win abandoned users with release cadence, forecast depth, Trello-like cards, i18n work, and docs. Vantage should keep its no-build constraint rather than copying TablissNG's rspack/pnpm pipeline.
- Anori validates deep customization, folders, icon depth, Chrome/Firefox parity, and extensible widget concepts. Vantage should avoid losing search-first utility in favor of pure icon dashboards.
- Mue demonstrates a marketplace/community model and broad translations. Vantage should copy only PR-reviewed/local-first ideas; runtime remote marketplaces conflict with the no-remote-code constraint unless sandboxed and user-granted.
- Renewed Tab is the closest reference for multi-instance widget grids, RSS/weather/backgrounds, and multilingual docs. Vantage should learn from its widget composition, but keep its stronger privacy disclosures and local-first export model.
- Momentum and Linkflare show what commercial products monetize: sync, integrations, focus workflows, metadata-rich bookmarks, and inbox triage. Vantage's opportunity is local-first equivalents without accounts or server-side enrichment.
- Vimium and Zen Browser issues confirm custom new-tab pages hit browser-level focus/startup edge cases. Vantage should document realistic limitations rather than promising control over browser address-bar focus or all Firefox-derived startup surfaces.

## Security, Privacy, and Reliability
- `PRIVACY.md`, `ROADMAP.md`, `RESEARCH.md`, `CHANGELOG.md`, `CLAUDE.md`, `AGENTS.md`, and `docs/*.md` are ignored by `.gitignore`; `git ls-files -- docs/*.md PRIVACY.md` returns nothing. README links to ignored docs, `docs/_config.yml` nav references ignored pages, and store docs point privacy-policy URLs at `PRIVACY.md`. This makes the public documentation contract ambiguous and likely broken in clean clones or on GitHub.
- `scripts/validate-release-metadata.ps1` reads `PRIVACY.md` even though it is ignored and untracked, so local validation can pass while a clean CI checkout lacks the file. The same validator checks `updates.xml` version and CRX URL but not a non-empty 64-hex `hash_sha256`.
- `updates.xml` currently has `hash_sha256=""`. The release workflow computes a SHA-256 when generating the feed, but the checked-in validator does not reject the empty committed feed.
- `docs/getting-started.md` still says `scripts/install.ps1` writes `ExtensionInstallForcelist`, while the actual script and README say Chromium filters self-hosted CRX policy installs and the supported path is shortcut `--load-extension`.
- `docs/store-submission-guide.md` still uses an ad hoc `zip -r ... PRIVACY.md` package command even though the project has release workflow/build scripts and markdown is ignored.
- `docs/faq.md` still says Gist creation is public and anonymous with no GitHub account, while `src/utils/gist-sync.js` correctly requires a one-shot token for Gist creation and keeps public Gist import token-free.
- `docs/widget-api.md` claims immediate user-provided manifest URL support and "Add external widget" settings flow. The source only exposes a generic configurable iframe embed (`src/widgets/embed.js`); no manifest discovery, `vantage:init` host runtime, registry fetch, or message protocol consumer was found.
- Existing open roadmap items already cover broad-host CWS review risk, optional host-permission broker feasibility, privacy/network endpoint parity, GitHub widget TTL/rate-limit handling, `customCSS` import isolation, APOD/background recovery, accessibility follow-ups such as `prefers-reduced-transparency` and native-dialog migration, i18n Phase 2, RTL Phases 2-3, favicon fallback, and redundant `tabs` permission removal. Those should be implemented rather than re-added.

## Architecture Assessment
- Strengths: readable vanilla JS modules, MV3 manifests for Chrome and Firefox, no bundler supply chain, local-first storage, explicit migrations, progressive enhancement, and a useful split between core widgets and helper utilities.
- Release/publication boundary is weak: release validation, store docs, README links, update feeds, and ignored markdown policy do not agree. This is the main blocker before store submission or relying on GitHub Pages docs.
- Overlay handling is scattered. Independent document-level Escape/pointer handlers exist in `src/main.js`, `src/settings.js`, `src/widget-picker.js`, `src/utils/context-menu.js`, `src/utils/partial-import.js`, `src/widgets/notes.js`, `src/widgets/quicklinks.js`, and `src/widgets/search.js`. A small LIFO overlay manager would reduce collision risk as more dialogs and popovers ship.
- Third-party widget architecture is split between aspiration and runtime. `docs/widget-api.md` describes a stable protocol, but the existing `src/widgets/embed.js` is only an iframe panel. The existing `Iframe-sandboxed widget API` roadmap item should either ship the host runtime or the docs should clearly label the protocol as future.
- Documentation has visible drift and mojibake in older files. Because most markdown is ignored, docs can diverge from the clean repository without normal review gates.
- Test surface is intentionally lightweight, but release metadata and docs-link validation are cheap automation wins that fit the repo's script-first style.

## Rejected Ideas
- Add another dashboard widget before release hardening: rejected because distribution trust and clean-checkout correctness are higher leverage than more surface area.
- Runtime remote widget marketplace now: rejected because it conflicts with the no-remote-code constraint unless the existing sandboxed widget API is fully implemented and reviewed.
- Replace the no-build JS stack with WXT, Plasmo, rspack, Vite, or React: rejected because the no-build constraint is an explicit project differentiator and security/supply-chain choice.
- Use account-backed cloud sync as the default: rejected because Vantage's privacy model is no accounts, no telemetry, and user-controlled export/import.
- Promise browser address-bar focus control for all custom new-tab contexts: rejected because platform behavior constrains custom NTP focus and varies across Chrome, Firefox, Vimium, Zen, and browser startup flows.
- Safari port as near-term work: rejected because comparable NTP projects have abandoned Safari due to high maintenance and low usage; a web/PWA fallback would be a separate product decision.
- Add CoinGecko/Open-Meteo commercial features without a licensing decision: rejected until the project decides whether any paid tier or donation framing would trigger commercial API licensing.

## Sources
**Official platform and security**
- https://developer.chrome.com/docs/extensions/whats-new
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/extensions/develop/concepts/browser-namespace
- https://developer.chrome.com/docs/webstore/review-process
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/blog/extensions-io-2026
- https://blog.mozilla.org/addons/2026/04/23/webextensions-api-changes-firefox-149-152/
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions
- https://cheatsheetseries.owasp.org/cheatsheets/Browser_Extension_Vulnerabilities_Cheat_Sheet.html

**APIs and dependencies**
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://docs.github.com/en/rest/gists/gists
- https://api.nasa.gov/assets/html/authentication.html
- https://open-meteo.com/en/pricing
- https://www.coingecko.com/en/api/pricing
- https://developer.chrome.com/blog/css-prefers-reduced-transparency
- https://developer.chrome.com/blog/gap-decorations-stable
- https://developer.mozilla.org/en-US/docs/Web/API/IDBIndex/getAllRecords
- https://www.w3.org/TR/IndexedDB/

**Competitors and community**
- https://github.com/victrme/Bonjourr
- https://github.com/victrme/Bonjourr/releases
- https://github.com/victrme/Bonjourr/issues/794
- https://github.com/victrme/Bonjourr/issues/851
- https://github.com/BookCatKid/tablissNG
- https://github.com/OlegWock/anori
- https://github.com/mue/mue
- https://renewedtab.com/en/
- https://linkflare.io/articles/best-new-tab-extensions-2026/
- https://momentumdash.com/plus
- https://github.com/philc/vimium/issues/4741

## Open Questions
- Should the published repository track public documentation pages, or should README/store docs stop linking to ignored markdown and point only at README anchors or another published site?
- Should the release preflight validate only tracked files, or should `.gitignore` be changed so privacy/store docs needed by CI and CWS are reviewed and published?
- Is `docs/widget-api.md` intended to be a future spec, or should the existing `Iframe-sandboxed widget API` item be treated as a release blocker before public docs advertise "Add external widget"?
