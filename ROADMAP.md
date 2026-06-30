# Vantage Roadmap

Only incomplete work belongs here. Completed items live in git history and CHANGELOG.md.
Blocked items live in Roadmap_Blocked.md.

## Research-Driven Additions

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
