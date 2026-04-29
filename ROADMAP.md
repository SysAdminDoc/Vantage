# Vantage Roadmap

Items checked off as they ship. Versions are aspirational targets, not commitments.

## v0.2.0 — Premium polish — ✅ shipped 2026-04-29
- [x] Design system: tokens for color, type, spacing, radii, shadows, motion.
- [x] Custom engine picker dropdown replacing native `<select>`.
- [x] UI primitives: toggle switch, segmented control, icon button, chip.
- [x] Skeleton loading + last-updated timestamps + refresh-with-spinner on feeds.
- [x] Time-aware greeting hero with optional name.
- [x] Settings panel as a proper modal dialog (sticky header, backdrop, scroll lock, focus management).
- [x] Inline SVG icon library across the app.
- [x] `/` keyboard shortcut to focus search.
- [x] `prefers-reduced-motion` support, focus rings, ARIA pass.

## v0.3.0 — Layout & feed depth — ✅ shipped 2026-04-29
- [x] Drag-to-reorder quick links.
- [x] Drag-to-reorder reading panels (grip handle in each panel header).
- [x] Click-to-mark-read on feed items, with cross-tab persistence + LRU cap.
- [x] Unread-count badges on Reading list / News panels.
- [x] "Mark all read" button per panel.
- [x] Per-feed favicon next to each headline.
- [x] Keyboard navigation on the engine picker — arrow keys, Home/End, Enter, Esc, plus type-ahead.

Deferred to a later milestone:
- [ ] Search history dropdown with `chrome.history` integration (opt-in) — needs new permission + privacy review.

## v0.4.0 — Animated weather background — ✅ shipped 2026-04-29
- [x] Time-of-day phase system (9 phases) with @property color interpolation.
- [x] Sun arc driven by real sunrise/sunset for the user's locality.
- [x] Weather-driven overlays (clouds, rain, snow, fog, lightning, storm).
- [x] Palm-tree silhouette during golden hour + sunset.
- [x] Stars at dusk + night.
- [x] Shared Open-Meteo fetch with 10-minute cache.
- [x] Settings toggle.
- [x] `prefers-reduced-motion` support.

## v0.5.0 — Wallpapers & vibe
- [ ] Wallpaper backgrounds — Unsplash topic feeds, local upload, solid color.
- [ ] Bing daily image option (no auth).
- [ ] Greeting widget ("Good morning, Matt").
- [ ] Quote-of-the-day widget (offline-bundled quote pack, refreshes daily).
- [ ] Custom accent color picker beyond Mocha/Latte.

## v0.6.0 — Productivity widgets
- [ ] Todo widget with `chrome.storage.local` persistence + drag-to-reorder.
- [ ] Notes widget with markdown rendering (no remote sync — local only).
- [ ] Pomodoro timer.
- [ ] Calendar widget (read-only `.ics` URL feed).

## v0.7.0 — Power-user features
- [ ] Import / export settings JSON.
- [ ] OPML import for RSS feeds (drop-in from Feedly, Inoreader, NetNewsWire).
- [ ] Keyboard shortcut configuration screen.
- [ ] Multi-profile / "workspaces" — switch between Home, Work, Hobby layouts.
- [ ] Firefox port (manifest V2 fork — Mozilla still ships MV2 alongside MV3).

## v1.0.0 — Stable
- [ ] Locked widget API (third-party widget loading).
- [ ] Comprehensive accessibility audit (WCAG AA).
- [ ] i18n — at minimum en, es, de, fr, ja.
- [ ] Chrome Web Store listing (after gathering enough feedback to lock the API).

## Always-on
- [ ] Track upstream changes in Catppuccin palette versions.
- [ ] Refresh `manifest.json` `host_permissions` on every release — only request what's actually used.
- [ ] Verify clean profile install before every release.
- [ ] Re-capture README screenshots whenever the UI shifts.
