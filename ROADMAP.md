# Vantage Roadmap

Only incomplete work belongs here. Completed items live in git history and CHANGELOG.md.
Blocked items live in Roadmap_Blocked.md.

## Research-Driven Additions

- [ ] P0 - Move optional browser-data features behind runtime permission grants
  Why: Install-time `bookmarks`, `topSites`, and `readingList` prompts weaken store trust for widgets that are off or user-triggered.
  Evidence: `manifest.json`, `manifest.firefox.json`, `src/widgets/bookmarks.js`, `src/widgets/topsites.js`, `src/widgets/feed-list.js`, Chrome optional permissions docs.
  Touches: `manifest.json`, `manifest.firefox.json`, `src/settings.js`, `src/widgets/bookmarks.js`, `src/widgets/topsites.js`, `src/widgets/feed-list.js`, `src/utils/host-permissions.js`, smoke tests.
  Acceptance: Fresh Chromium install prompt excludes browser-data permissions where supported; enabling each affected widget requests permission, denial shows recovery copy, and granted/revoked states survive reloads.
  Complexity: L

- [ ] P0 - Reconcile external-widget docs with runtime security
  Why: The widget host requires HTTPS manifests, but `docs/widget-api.md` tells developers to test with `http://localhost`.
  Evidence: `src/utils/widget-host.js`, `docs/widget-api.md`, Chrome MV3 remote-code policy, OWASP extension messaging guidance.
  Touches: `src/utils/widget-host.js`, `docs/widget-api.md`, `scripts/test-widget-host.mjs`, `src/settings.js`.
  Acceptance: Either localhost HTTP is explicitly allowed only for loopback development with tests, or docs require HTTPS; the widget-add UI and tests match the chosen behavior.
  Complexity: M

- [ ] P1 - Finish production i18n and locale parity checks
  Why: `_locales` are partial and `i18n()` is not used by app modules, so current localized builds still show mostly hardcoded English UI.
  Evidence: `_locales/*/messages.json`, `src/utils/i18n.js`, `src/settings.js`, `src/widgets/*`, Chrome i18n docs, Mue locale crash reports.
  Touches: `src/utils/i18n.js`, `src/settings.js`, `src/onboarding.js`, `src/widget-picker.js`, `src/widgets/*`, `_locales/*/messages.json`, test scripts.
  Acceptance: User-visible strings route through message keys, locale files have equal required-key sets, missing/extra keys fail tests, and RTL smoke covers at least Arabic/Hebrew browser-language simulation.
  Complexity: XL

- [ ] P1 - Expand browser workflow smoke coverage
  Why: Current smoke tests cover happy-path basics but not the permission, import, side-panel, localization, and recovery flows most likely to break in stores.
  Evidence: `scripts/smoke-test.mjs`, `scripts/accessibility-audit.mjs`, Chrome Puppeteer extension testing docs, TablissNG/Mue/Bonjourr issue patterns.
  Touches: `scripts/smoke-test.mjs`, `scripts/accessibility-audit.mjs`, `scripts/build-unpacked.ps1`, fixtures under `scripts/`.
  Acceptance: Headless smoke covers optional-permission grant/deny/revoke, host-permission recovery, JSON/share import sections, side panel/sidebar behavior, external-widget failure, i18n fallback, and first-run recovery.
  Complexity: L

- [ ] P1 - Generate deterministic store evidence locally
  Why: Store submission needs reproducible screenshots, permission justifications, privacy claims, and audit artifacts now that workflow artifacts are gone.
  Evidence: Chrome Web Store screenshot docs, `docs/privacy-practices-cws.md`, `PRIVACY.md`, `README.md`, `scripts/accessibility-audit.mjs`.
  Touches: `scripts/`, `qa-scenes.html`, `docs/privacy-practices-cws.md`, `PRIVACY.md`, `README.md`.
  Acceptance: A local command outputs 1280x800 screenshots, a permission/network diff, accessibility JSON/HTML or markdown report, and a store-ready artifact checklist under `dist/`.
  Complexity: M

- [ ] P1 - Add full-state export and restore verification
  Why: Settings import is hardened, but no verifier exercises every durable store together across settings, IndexedDB, OPFS, denied origins, workspaces, and encrypted keys.
  Evidence: `src/storage.js`, `src/utils/partial-import.js`, `src/utils/opfs.js`, `src/utils/feed-archive.js`, `src/utils/api-key-vault.js`, Bonjourr issue #819.
  Touches: `scripts/test-partial-import.mjs`, `src/utils/partial-import.js`, `src/utils/opfs.js`, `src/utils/feed-archive.js`, `src/utils/api-key-vault.js`.
  Acceptance: Test fixtures round-trip representative full-state exports, preserve encrypted-key behavior, detect unknown keys, and prove OPFS/IndexedDB references degrade with actionable recovery copy.
  Complexity: L

- [ ] P2 - Add metadata enrichment for manually saved links
  Why: Competitor issue demand centers on faster link setup: title/icon autofill, custom icons, and less manual editing.
  Evidence: Anori issues #279 and #304, Mue issue #1170, `src/settings.js`, `src/widgets/inbox.js`, `src/utils/favicon-cache.js`.
  Touches: `src/settings.js`, `src/widgets/inbox.js`, `src/widgets/quicklinks.js`, `src/utils/favicon-cache.js`, `src/utils/url-safety.js`.
  Acceptance: Adding a quick link or inbox URL can fill title/favicon from safe local fetches or existing favicon cache, failures are non-blocking, and credentialed/non-web URLs remain rejected.
  Complexity: M

- [ ] P2 - Add duplicate workspace/group actions
  Why: Heavy dashboard users want to branch layouts and folders without rebuilding them by hand.
  Evidence: Anori issues #289 and #269, `src/utils/workspace.js`, `src/settings.js`, Vantage quick-link groups and workspace snapshots.
  Touches: `src/settings.js`, `src/utils/workspace.js`, `src/widgets/quicklinks.js`, `src/storage.js`.
  Acceptance: Users can duplicate a workspace or quick-link group with contents, generated IDs never collide, and imports preserve source data without overwriting existing names.
  Complexity: M

- [ ] P2 - Add integration health diagnostics
  Why: Vantage depends on many optional external services, and failures should be diagnosable without opening DevTools.
  Evidence: `src/utils/error-log.js`, `src/utils/weather-source.js`, `src/utils/rss-parser.js`, `src/widgets/github.js`, `src/widgets/crypto.js`, Mue/TablissNG API/cache issue reports.
  Touches: `src/utils/error-log.js`, `src/settings.js`, `src/widgets/*`, `src/utils/feed-prewarm.js`, `src/utils/favicon-cache.js`.
  Acceptance: Settings includes a local diagnostics view showing last success/error/cache age per enabled integration, with copyable redacted output and no background telemetry.
  Complexity: M

- [ ] P3 - Gate any external-widget registry behind a local trust review model
  Why: A curated registry could help discover widgets, but arbitrary remote widgets increase store-review and user-trust risk.
  Evidence: `src/utils/widget-host.js`, `docs/widget-api.md`, Chrome MV3 remote-code policy, Homepage/Dashy/Homarr registry patterns.
  Touches: `src/utils/widget-host.js`, `src/settings.js`, `docs/widget-api.md`, `scripts/test-widget-host.mjs`.
  Acceptance: Registry entries are signed or pinned by digest, disclose network/analytics behavior, can be reviewed before add, and the default install ships with no remote registry enabled.
  Complexity: XL
