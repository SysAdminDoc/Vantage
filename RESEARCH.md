# Research - Vantage

## Snapshot

- Observed: 2026-08-13, desktop 1440x900, public/local new-tab, onboarding, settings, side-panel shell, default feed state, and public GitHub project/release pages. No authentication exists and no login handoff was needed.
- Target: `C:\Users\--\repos\Vantage`, branch `main`. `C:\Users\--\repos\Vigil\ntp-extension` is a distinct bundled privacy NTP for Vigil Browser and was inspected but not edited.
- Public status: GitHub `main` was active (481 commits observed), while the latest public release page still exposed v1.1.0. Local 1.2.0 therefore already exceeded the published channel before this pass; v1.3.0 must not be described as published until artifacts are uploaded.
- Product: local-first Manifest V3 new-tab dashboard for Chromium and Firefox. The runtime is readable vanilla modules with `chrome.storage.local`, session storage, IndexedDB feed archive, optional OPFS media, fixed provider endpoints, and runtime-granted user URL origins.

## Verified Surface and Data Contracts

| Surface / contract | 2026-08-13 status | Stability and failure signal |
|---|---|---|
| `newtab.html` -> `src/main.js` | Verified in the in-app browser; onboarding, search, widget picker, dashboard, settings, and reset/recovery entry points render | Static IDs and module paths are stable; smoke waits for `.search-form`, `#settings-toggle`, and the storage API |
| Settings `<dialog id="settings-panel">` | Verified across Personalize, Feeds & sources, Widgets, Workspaces & browser, and Privacy & data | Native dialog UA positioning is a collision risk; CSS must set the full inset and smoke asserts centered width/placement |
| Settings section registry | 47 Chromium-applicable sections and 48 Firefox sections; every existing section is mounted once under a destination | `browser` existence is not a Firefox signal because the local shim aliases namespaces; feature-detect `contextualIdentities` |
| Side panel / Firefox sidebar | Side-panel shell verified locally; native installed-browser integration is unverified | Requires a genuinely loaded extension and supported browser API; local HTTP fallback cannot prove toolbar/sidebar behavior |
| Feed and calendar sources | Direct fetch after scoped grant, then documented proxy fallback; default feed UI verified | User endpoints and proxy availability are external contracts; integration diagnostics and visible inline failure are the signal |
| Browser data APIs | Bookmarks, history, reading list, tabs, and top sites are optional or user-triggered; Firefox containers are required only in Firefox | Permission helpers must fail closed when the API is absent; manifest/helper tests enforce placement |
| External widget protocol | HTTPS manifest/src, bounded schema, digest review, exact-origin messaging, sandboxed frame | Provider frame/network declarations remain user-controlled and need review; widget-host tests fail on drift |

## Ad Surface and Network Map

Vantage has no host website or account surface; its covered desktop surfaces are the new tab, settings, onboarding, side panel, and extension-owned widgets.

| Placement | DOM / initiator | Endpoint / timing | Result |
|---|---|---|---|
| First-party dashboard, settings, onboarding, side panel | Extension HTML and `src/` modules | Cold load and local navigation | No ad container, sponsored label, affiliate unit, ad SDK, header bidder, or ad-network host found |
| Default feed records | Feed-list rows from configured feed JSON/XML | Feed refresh / new-tab load | Sampled 30 items; no sponsored/promoted records or ad-shaped shell observed |
| Generic embeds | User-created iframe in `src/widgets/embed.js` | User-granted arbitrary web origin when enabled | Provider content is inseparable cross-origin; mandatory sandbox and visible boundary shipped. Provider ads/tracking remain outside Vantage control |
| External widgets | Digest-reviewed HTTPS iframe in `src/utils/widget-host.js` | User install/enable | Same provider boundary; exact-origin messages, sandbox, visible label, and settings disclosure |
| Windy radar | `embed.windy.com` iframe | Only when enabled with a weather location | Third-party provider frame; sandboxed and visibly labeled |

Cold-load proof on 2026-08-13: 115 requests / 115 unique URLs; observed hosts were local runtime, Open-Meteo, allorigins, Google favicon, and DuckDuckGo favicon services. Zero URLs matched known ad-network patterns. The rendered DOM contained zero matches for sponsored, promoted, advertisement, ad choices, or ads-by labels, no iframe was active in the default state, and the repaired permission broker did not fetch article destination pages for metadata. `scripts/test-ad-free-contract.mjs` now rejects known ad endpoints/creative hooks and enforces sandbox/disclosure invariants.

No Declarative Net Request blocker was added. Chrome documents DNR as a required permission rather than an optional permission. Adding a broad request blocker to an extension whose own runtime has no ads would expand install trust, while still being unable to edit a cross-origin provider frame's DOM. The bounded solution is to keep Vantage first-party surfaces ad-free, prevent ungranted destination fetches, and make third-party boundaries explicit.

## UX and Settings Conclusions

- The old 440px drawer exposed 48 flat collapsible sections, forcing long scrolling and noisy full-text search. Native `<dialog>` left positioning also placed the drawer at x=0 in Chromium.
- v1.3 groups the unchanged controls into five persistent destinations, adds targeted section metadata, `Ctrl/Cmd+K` search, automatic destination routing, session-persisted destination/section state, an autosave footer, and a local-first privacy callout.
- Search now uses curated keywords first and section body text only as a fallback. The previous query `data` surfaced unrelated weather/converter copy; it now targets the Data section under Privacy & data.
- First-run preset previews promised two/three/four reading panels but the always-on Starred default added a hidden extra panel. Presets now explicitly disable Starred and the Balanced journey is smoke-tested through completion.
- Mockups and implemented captures live in `design/mockups/` and `design/implemented/` for all five destinations. ImageGen established the Catppuccin desktop shell; implementation preserved real values and control behavior instead of copying invented sample data.

## Competitive Conclusions

- [Anori](https://anori.app/) emphasizes folders, optional permissions, and a focused widget set. Its current issue stream still asks for better bookmark prefill and folder organization. Vantage's title enrichment, duplicate workspaces, and link groups are differentiators; clearer settings navigation was the more urgent parity gap.
- [TablissNG](https://github.com/BookCatKid/TablissNG) is an actively maintained fork with deep per-widget customization and translations. Current requests around navigation, alignment, and location permissions reinforce Vantage's destination shell and runtime permission recovery; professional locale review remains a gap.
- [Bonjourr](https://github.com/victrme/Bonjourr/issues) issues in 2026 include settings opening/state reset, stale date, and lock-settings needs. Vantage's rebuild-on-open settings architecture avoids stale controls, while session destination state and smoke coverage reduce navigation regression risk.
- [Mue](https://muetab.com/docs/introduction/) remains a polished, free, open-source new-tab product with widgets and a marketplace. Vantage should retain its no-account/local-first identity and keep remote widget registries disabled by default.
- [Renewed Tab](https://renewedtab.com/) demonstrates extensive per-widget/global settings with local privacy and optional permissions. Vantage now reaches similar settings discoverability without adding account or remote configuration dependencies.

## Priorities

| Disposition | Opportunity | Evidence / hook | Impact | Effort / risk |
|---|---|---|---:|---|
| Now - shipped | Five-destination settings redesign | 48-section drawer, native dialog collision, existing section builders | 5 | L; no schema/permission change |
| Now - shipped | Fail-closed host metadata fetches | Local shim lacked `permissions.contains` and fetched destination pages | 5 | S; regression tested and network verified |
| Now - shipped | Honest third-party content boundary | User iframe, external widget, and Windy hooks | 5 | M; sandbox compatibility needs real provider testing |
| Now - shipped | Accurate onboarding panel promises | Existing preset `apply()` and preview count | 4 | S; end-to-end smoke verified |
| Next | Real installed-extension matrix | Native side panel/sidebar and extension permission prompts | 5 | M; Chromium/Firefox browser sessions needed |
| Next | Release/public-channel reconciliation | GitHub releases lag local metadata | 5 | S plus owner-controlled upload |
| Next | Professional translation review | Five catalogs are structurally complete; new destination copy is translated but unreviewed | 4 | M; human language review |
| Later | Full-state browser round-trip | Existing restore planner, OPFS, IndexedDB | 4 | L; multi-store fixtures/profile lifecycle |
| Rejected | Broad DNR ad blocker | No first-party ads; DNR expands required permissions and cannot inspect provider DOM | 2 | M/high review risk |
| Rejected | Account sync or remote registry default | Conflicts with local-first product trust | 2 | XL/high privacy risk |

## Sources (accessed 2026-08-13)

### Platform

- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions

### Product and competitors

- https://github.com/SysAdminDoc/Vantage
- https://github.com/SysAdminDoc/Vantage/releases
- https://anori.app/
- https://github.com/OlegWock/anori/issues
- https://github.com/BookCatKid/TablissNG
- https://github.com/BookCatKid/TablissNG/issues
- https://github.com/victrme/Bonjourr/issues
- https://muetab.com/docs/introduction/
- https://renewedtab.com/
