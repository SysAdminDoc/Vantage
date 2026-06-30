# Vantage Roadmap

Only incomplete work belongs here. Completed items live in git history and CHANGELOG.md.
Blocked items live in Roadmap_Blocked.md.

## Research-Driven Additions

- [ ] P3 - Gate any external-widget registry behind a local trust review model
  Why: A curated registry could help discover widgets, but arbitrary remote widgets increase store-review and user-trust risk.
  Evidence: `src/utils/widget-host.js`, `docs/widget-api.md`, Chrome MV3 remote-code policy, Homepage/Dashy/Homarr registry patterns.
  Touches: `src/utils/widget-host.js`, `src/settings.js`, `docs/widget-api.md`, `scripts/test-widget-host.mjs`.
  Acceptance: Registry entries are signed or pinned by digest, disclose network/analytics behavior, can be reviewed before add, and the default install ships with no remote registry enabled.
  Complexity: XL
