# Vantage Roadmap

Incomplete work only, ordered by priority.

## P1 - Complete native permission and Firefox UI journeys

- Hook: browser permission prompts, Chrome `sidePanel`, Firefox `sidebar_action` / `contextualIdentities`, the native Chromium harness, and `npm run smoke:firefox`.
- Need: exercise real grant/deny/revoke prompts for Bookmarks, Top Sites, History, Reading List, and user hosts; verify toolbar-driven side-panel behavior; verify Firefox new-tab replacement, sidebar, container mapping, signed-XPI restart, and update replacement.
- Acceptance: native screenshots and network evidence for every remaining journey across supported Chromium and Firefox versions, including persisted grants and state after a full browser restart.
- Blocker: headless Chromium does not resolve extension permission dialogs, and Firefox WebDriver BiDi rejects navigation to `about:newtab` and `moz-extension:` URLs. The remaining UI paths require isolated headed sessions; signed restart/update also requires a signed XPI or an explicitly configured test channel.

## P1 - Reconcile local and public release channels

- Hook: `manifest*.json`, `package*.json`, `updates.xml`, `firefox-updates.json`, GitHub Releases, `npm run build:release`.
- Need: decide whether to publish v1.2.0 history or release v1.3.0 directly, then upload the exact ZIP/CRX/XPI set and update feed hashes from those artifacts.
- Acceptance: public latest release, manifests, installer, README badge, update feeds, artifact filenames, checksums, and release notes all agree.
- Blocker: release upload/publishing requires explicit owner authorization and was not performed in this pass.

## P2 - Professionally review the five locale catalogs

- Hook: `_locales/de`, `en`, `es`, `fr`, `ja`; `scripts/test-i18n.mjs`; 1440x900 destination screenshots.
- Need: native-speaker review of destination, search-result, privacy-boundary, and autosave strings; check truncation and natural terminology in every settings destination.
- Acceptance: reviewed translations with unchanged placeholder/key parity and no clipping at 1440x900 or normal desktop split widths.
- Dependency: human language review; automated parity is already green.

## P2 - Add durable visual-regression baselines for settings

- Hook: deterministic QA theme/time/weather URL parameters, `design/implemented/`, existing Puppeteer smoke harness.
- Need: compare all five destinations in Mocha and Latte at 1440x900 plus one normal desktop split width, with explicit tolerances for time/network content.
- Acceptance: CI/local command fails on structural or material visual drift and produces a small diff artifact; no generated evidence is committed outside the approved design/reference path.

## P2 - Verify full-state restore across browser durable stores

- Hook: `buildFullStateRestorePlan()`, `chrome.storage.local`, IndexedDB feed archive, OPFS media, denied-origin state, encrypted key vault, workspace import.
- Need: one clean-profile export/import/restart fixture that verifies settings and recoverable local stores while accurately warning for profile-bound data.
- Acceptance: Chromium and Firefox fixtures round-trip representative data, preserve local-only secrets/denials, and surface every non-portable OPFS/IndexedDB dependency before apply.
