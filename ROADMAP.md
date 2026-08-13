# Vantage Roadmap

Incomplete work only, ordered by priority.

## P1 - Prove native installed-extension journeys in Chromium and Firefox

- Hook: `dist/unpacked-chromium`, `dist/unpacked-firefox`, browser permission prompts, Chrome `sidePanel`, Firefox `sidebar_action`, and `contextualIdentities`.
- Need: verify install/update, first run, runtime host grants and denials, Bookmarks/Top Sites/History/Reading List prompts, toolbar side-panel behavior, Firefox container mapping, and persistence after browser restart.
- Acceptance: a documented browser/version matrix with native screenshots and network evidence; no local HTTP shim fallback; smoke fails visibly when the extension is not actually loaded.
- Blocker: this pass's automated Chromium launch did not expose an extension ID, so native-only behavior remains unverified.

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
