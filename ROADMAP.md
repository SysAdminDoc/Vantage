# Vantage Roadmap

Items checked off as they ship. Versions are aspirational targets, not commitments.

## v0.2.0 — Layout & polish
- [ ] Drag-to-reposition widget grid with persisted layout per profile.
- [ ] Unread-count badges on RSS / News panels (delta since last seen).
- [ ] Click-to-mark-read on feed items.
- [ ] Per-feed favicon next to each headline.
- [ ] Search history dropdown with `chrome.history` integration (opt-in).
- [ ] Keyboard navigation for search engine switching (e.g. `g` for Google, `d` for DuckDuckGo).

## v0.3.0 — Wallpapers & vibe
- [ ] Wallpaper backgrounds — Unsplash topic feeds, local upload, solid color.
- [ ] Bing daily image option (no auth).
- [ ] Greeting widget ("Good morning, Matt").
- [ ] Quote-of-the-day widget (offline-bundled quote pack, refreshes daily).
- [ ] Custom accent color picker beyond Mocha/Latte.

## v0.4.0 — Productivity widgets
- [ ] Todo widget with `chrome.storage.local` persistence + drag-to-reorder.
- [ ] Notes widget with markdown rendering (no remote sync — local only).
- [ ] Pomodoro timer.
- [ ] Calendar widget (read-only `.ics` URL feed).

## v0.5.0 — Power-user features
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
