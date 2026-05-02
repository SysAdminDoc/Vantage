---
layout: default
title: Vantage
description: Customizable new tab dashboard for Chromium + Firefox.
---

# Vantage

A customizable new-tab dashboard for Chromium-based browsers (Chrome, Brave,
Edge, Vivaldi, Opera) and Firefox 109+. Privacy-first. No accounts. No
telemetry. No remote config.

> **Read in 30 seconds:** Vantage replaces your new tab page with a
> dashboard that brings together search, weather, RSS / news, your quick
> links, productivity widgets (To-Do, Notes, Pomodoro, Countdown), and
> visualisation widgets (animated weather background, world clocks,
> crypto, GitHub activity, photo-of-the-day, calendar). Everything lives
> on your device. The only network calls Vantage makes are the ones you
> ask for: weather data, the RSS feed URLs you've configured, and a
> handful of opt-in services like NASA APOD or Bing daily backgrounds.

## Highlights

- **27 widgets** (and counting) — search, weather, RSS, news, calendar,
  pomodoro, todo, notes, bookmarks, starred items, ambient sounds,
  history search, crypto, GitHub, photo-of-the-day, countdown, world
  clocks, converter, top sites, embeds, Windy radar, marine weather,
  river flood risk.
- **Privacy-first** — every outbound endpoint is documented in the
  [Privacy Table]({{ "/privacy-practices-cws.html" | relative_url }}).
  No analytics, no error reporting, no auto-update server.
- **Workspaces** — multiple named profiles per browser; each can override
  theme, accent, scenery, background, layout, and per-widget toggles.
  Firefox containers auto-map to workspaces.
- **Animated weather background** — full sun-arc + cloud / rain / snow /
  fog / storm overlays driven by Open-Meteo and your real local sunrise
  / sunset times.
- **Side panel reader** (Chrome 114+) — same combined RSS + News stream
  in Chrome's native side panel.
- **Encrypted API key vault** — opt-in AES-GCM-256 + PBKDF2 600k for
  CoinGecko + NASA APOD keys at rest.
- **OPFS video backgrounds** (Chrome 102+ / Firefox 111+ / Safari 15.2+)
  — 50 MB cap on supporting browsers.
- **No build step** — vanilla JS modules; the extension ships exactly as
  the source. You can read every line.

## Getting started

See the [Getting started guide]({{ "/getting-started.html" | relative_url }})
for install + first-run.

## Widgets reference

The [Widgets page]({{ "/widgets.html" | relative_url }}) walks through every
widget Vantage ships with — what it does, what it costs (network /
storage / permissions), and how to configure it.

## FAQ

The [FAQ]({{ "/faq.html" | relative_url }}) covers the most-asked questions:
permissions, data exports, syncing across devices, store policies, and
how to contribute.

## Source

[github.com/SysAdminDoc/Vantage](https://github.com/SysAdminDoc/Vantage) ·
MIT license · Releases include Chrome ZIP + CRX3 + Firefox XPI + SHA256SUMS.
