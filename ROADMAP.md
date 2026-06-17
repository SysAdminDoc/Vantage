# Vantage Roadmap

Only incomplete work belongs here.

## Research-Driven Additions

### P0

- [ ] P0 - Repair tab-capture and Inbox save semantics
  Why: The Inbox "Save current tab" action runs from the new-tab page and the manifests no longer request `tabs` or `activeTab`, so the feature can save Vantage itself or lose URL/title access.
  Evidence: `src/widgets/inbox.js`; `src/settings.js` tab snapshot flow; `manifest.json`; `manifest.firefox.json`; Chrome permissions docs; Linkflare/Raindrop/start.me capture workflows.
  Touches: `manifest.json`, `manifest.firefox.json`, `src/background.js`, `src/widgets/inbox.js`, `src/settings.js`, `src/storage.js`, README/privacy permission copy.
  Acceptance: users can save the page they were actually viewing through a least-privilege capture path; Vantage never saves its own NTP by accident; denied permission shows a clear recovery state; tab snapshot still works or is gated honestly.
  Complexity: M

- [ ] P0 - Make release and public-doc validation clean-checkout safe
  Why: Store/privacy/accessibility/widget docs exist locally but are ignored by Git, so the public contract can diverge from clean clones, GitHub, CI, and store-review inputs.
  Evidence: `.gitignore`; `git ls-files docs PRIVACY.md CHANGELOG.md`; `docs/store-submission-guide.md`; `docs/privacy-practices-cws.md`; `scripts/validate-release-metadata.ps1`; Chrome Web Store review and image docs.
  Touches: `.gitignore`, `README.md`, `PRIVACY.md`, `CHANGELOG.md`, `docs/`, `scripts/validate-release-metadata.ps1`, `.github/workflows/release.yml`.
  Acceptance: every public README/store/privacy/a11y link resolves in a fresh clone, or links are replaced with tracked README anchors; release validation runs from clean checkout; reviewer notes explain the current required/optional host-permission model; runtime packages still exclude planning/agent markdown.
  Complexity: M

- [ ] P0 - Harden external widget host before promoting the Widget API
  Why: External widgets are sandboxed, but host messages use `targetOrigin: "*"`, inbound messages are source-only, and docs claim CSP behavior the host cannot enforce on arbitrary remote iframes.
  Evidence: `src/utils/widget-host.js`; `src/widgets/external-widget.js`; `docs/widget-api.md`; Chrome MV3 remote-code requirements; OWASP browser extension and third-party JavaScript guidance.
  Touches: `src/utils/widget-host.js`, `src/widgets/external-widget.js`, `src/settings.js`, `docs/widget-api.md`, `docs/privacy-practices-cws.md`.
  Acceptance: manifests pin a widget origin; host uses explicit `targetOrigin`; inbound messages validate origin, type, widget id, and schema; docs no longer overclaim iframe CSP; failed/unknown widgets render calm error states.
  Complexity: M

### P1

- [ ] P1 - Add versioned settings schema and migration fixtures
  Why: Vantage has many persisted surfaces and import paths, but `src/storage.js` only performs ad hoc shape fixes and has no durable schema version or regression fixtures.
  Evidence: `src/storage.js`; `src/settings.js` import handlers; `src/utils/partial-import.js`; Gist/share-link flows; TablissNG quota/cache issues.
  Touches: `src/storage.js`, `src/settings.js`, `src/utils/partial-import.js`, `src/utils/gist-sync.js`, optional test fixtures under `scripts/`.
  Acceptance: settings include `schemaVersion`; migrations are ordered and idempotent; old fixture JSON upgrades without data loss; unknown newer keys are reported during import instead of silently discarded.
  Complexity: M

- [ ] P1 - Generate deterministic store screenshot assets
  Why: Store docs require 1280x800 localized screenshots, but no script seeds state, captures dark/light/settings/widget scenes, or rejects blank/wrong-size captures.
  Evidence: `docs/store-submission-guide.md`; `qa-scenes.html`; `src/utils/screenshot.js`; Chrome Web Store image requirements.
  Touches: `scripts/`, `qa-scenes.html`, `src/utils/visual-qa.js`, optional seeded settings fixture, store docs after the docs policy is settled.
  Acceptance: one command captures required 1280x800 PNGs for approved scenes/locales, validates dimensions and nonblank pixels, and writes only to an ignored/generated output folder.
  Complexity: M

- [ ] P1 - Make accessibility audit release-evidence friendly
  Why: The axe runner exists, but it writes ignored docs directly and is not a CI artifact or a non-mutating release gate.
  Evidence: `scripts/accessibility-audit.mjs`; `docs/accessibility-report.md`; `docs/accessibility-results.json`; axe-core/Deque release notes; Chrome store accessibility expectations.
  Touches: `scripts/accessibility-audit.mjs`, `package.json`, `.github/workflows/release.yml`, `scripts/runtime-allowlist.json`.
  Acceptance: `npm run audit -- --headless` runs against the built unpacked extension, exits nonzero on violations, writes reports to an ignored artifact path, and CI uploads the report without modifying tracked markdown.
  Complexity: M

- [ ] P1 - Add release provenance and artifact-content verification
  Why: Release assets have SHA256 sums and pinned actions, but no signed build provenance and no explicit CI check that ZIP/XPI contents match `scripts/runtime-allowlist.json`.
  Evidence: `.github/workflows/release.yml`; `scripts/runtime-allowlist.json`; GitHub artifact attestation docs; GitHub Actions secure-use docs.
  Touches: `.github/workflows/release.yml`, `scripts/build-unpacked.ps1`, optional artifact-inspection script.
  Acceptance: release workflow fails on unexpected package entries, emits artifact attestations where repository visibility supports them, and documents how users verify checksums/provenance.
  Complexity: M

### P2

- [ ] P2 - Finish i18n Phase 2 with coverage gates
  Why: Locale files are uneven and most user-visible strings still bypass `i18n()`, weakening store localization and accessibility consistency.
  Evidence: `_locales/en/es/de/fr/ja/messages.json`; `docs/i18n-strategy.md`; `src/widgets/*.js`; `src/settings.js`; Chrome i18n docs; Bonjourr localization issues.
  Touches: `src/widgets/*.js`, `src/settings.js`, `src/onboarding.js`, `src/sidepanel.js`, `newtab.html`, `sidepanel.html`, `_locales/*/messages.json`, optional i18n sync script.
  Acceptance: all static user-facing strings route through the i18n helper; locale coverage is measured in CI; es/de/fr/ja reach an agreed threshold; missing keys fall back to English without layout breakage.
  Complexity: L

- [ ] P2 - Complete RTL locales and responsive RTL QA
  Why: RTL foundation exists, but Arabic/Hebrew translations and visual QA for panels, settings, widgets, and decorative surfaces are incomplete.
  Evidence: `src/utils/i18n.js`; `src/style.css` RTL block; `docs/rtl-support-roadmap.md`; Firefox/Chrome i18n support.
  Touches: `_locales/ar`, `_locales/he`, `src/style.css`, `qa-scenes.html`, `src/utils/visual-qa.js`, settings/onboarding widgets with physical left/right assumptions.
  Acceptance: ar/he locales render with `dir=rtl`; QA scenes cover RTL desktop and half-width layouts; settings, panels, quick links, popovers, and side panel have no clipping or inverted keyboard order.
  Complexity: M

- [ ] P2 - Add browser workflow smoke tests
  Why: Current smoke tests verify QA scene structure, not first-run, settings, import/export, host-permission denial, inbox capture, side panel, or widget failure flows.
  Evidence: `scripts/qa-scenes-smoke.mjs`; `scripts/accessibility-audit.mjs`; Puppeteer extension-testing docs; Puppeteer 25 extension support.
  Touches: `scripts/`, `package.json`, `scripts/build-unpacked.ps1`, seeded settings fixtures, `src/utils/browser-shim.js`.
  Acceptance: one local command loads the unpacked extension in Puppeteer and verifies onboarding skip, settings filter, quick-link add, export/import, host grant denial state, side panel render, and external-widget error state.
  Complexity: L

- [ ] P2 - Route widget-host diagnostics into the local debug log
  Why: The Widget API docs promise widget logs/debugging, but `widget-host.js` currently writes widget messages to `console` while Vantage already has a local 50-entry debug log.
  Evidence: `src/utils/widget-host.js`; `src/utils/error-log.js`; `docs/widget-api.md`.
  Touches: `src/utils/widget-host.js`, `src/utils/error-log.js`, `src/settings.js`, `docs/widget-api.md`.
  Acceptance: widget `vantage:error` and `vantage:log` messages are bounded, sanitized, origin-tagged, and included in Copy Debug Log; noisy widgets are rate-limited.
  Complexity: S

### P3

- [ ] P3 - Move shared browser APIs toward the `browser` namespace wrapper
  Why: Chrome 148 now exposes `browser.*`, while Vantage still mixes `chrome`, `browser`, callbacks, and a local shim across modules.
  Evidence: `src/utils/browser-shim.js`; `src/utils/host-permissions.js`; `src/background.js`; Chrome browser namespace docs; MDN cross-browser extension guidance.
  Touches: `src/utils/browser-shim.js`, `src/utils/host-permissions.js`, `src/background.js`, modules that call extension APIs directly.
  Acceptance: new code uses one promise-friendly wrapper; Chrome/Firefox behavior remains identical; local file/dev mode still works; no permission prompt changes.
  Complexity: M

- [ ] P3 - Add Firefox split-view and half-width dashboard adaptation
  Why: Firefox 149+ exposes split-view context and NTP dashboards can become cramped in half-width layouts.
  Evidence: Mozilla WebExtensions API changes for Firefox 149-152; `manifest.firefox.json`; `src/style.css`; `qa-scenes.html`.
  Touches: `src/main.js`, `src/style.css`, `qa-scenes.html`, optional Firefox-specific capability helper.
  Acceptance: when rendered at split-view widths, lower-priority panels collapse predictably, search and top utilities stay usable, and QA scenes cover the half-width layout.
  Complexity: M

- [ ] P3 - Add local bookmark and inbox hygiene tools
  Why: Commercial competitors paywall duplicate detection, broken-link checks, permanent libraries, and saved-link rediscovery; Vantage can provide a privacy-preserving subset on demand.
  Evidence: Raindrop.io Pro features; Linkflare bookmark/inbox positioning; start.me bookmark dashboard docs; `src/widgets/inbox.js`; `src/widgets/bookmarks.js`; `src/utils/feed-archive.js`.
  Touches: `src/widgets/inbox.js`, `src/widgets/bookmarks.js`, `src/settings.js`, `src/storage.js`, host-permission broker copy.
  Acceptance: users can find duplicate inbox/bookmark URLs, surface forgotten saved items locally, and optionally run a user-initiated broken-link check with clear network disclosure and no background crawling.
  Complexity: M
