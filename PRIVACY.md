# Vantage Privacy Policy

**Last updated**: May 2, 2026

## Overview

Vantage is a privacy-first new tab page extension for Chromium-based browsers (Chrome, Edge, Brave, Vivaldi, Opera) and Firefox. This policy explains how we handle your data.

**TL;DR**: Your data stays on your device. We do not collect, store, sell, or share any personal information. All settings, preferences, and content are stored locally using your browser's built-in storage.

---

## What Data We Collect

**We collect nothing.**

Vantage does not:
- Send telemetry or analytics to any server
- Collect usage statistics or feature interaction data
- Require user accounts or logins
- Use crash reporting or error tracking (except local error logs in `chrome.storage.local`)
- Use remote configuration or feature flags
- Use advertising or behavioral tracking

---

## What Data You Create (Stored Locally)

All of the following is stored **only on your device** using `chrome.storage.local`:

- **Settings & preferences**: Theme, accent color, background, widget configuration, workspace definitions
- **Quick links**: Your bookmarks / shortcuts (just URLs + labels + favicon URLs)
- **RSS feeds**: Feed URLs you add; cached feed items; read/unread status
- **Todos & notes**: Items you create; markdown content
- **Countdowns & schedules**: Events you define
- **Pomodoro sessions**: History of completed sessions (for your personal stat tracking)
- **Crypto ticker**: Your watchlist symbols (not your holdings or account info)
- **Custom CSS**: Any custom CSS you paste into settings
- **Error logs**: Unhandled errors caught by the extension (50-entry ring buffer, local only)

None of this ever leaves your device unless you explicitly:
- Export settings as JSON (you control where the file goes)
- Share a settings import link (you choose to create + share the Gist)

---

## External Integrations (Optional, User-Configured)

Vantage includes optional integrations with third-party services. **You choose whether to enable them.** Each is documented in the Privacy Table below:

| Integration | Data Sent | Why | Privacy | Disabler |
|---|---|---|---|---|
| **Open-Meteo Weather** | Your location (city name or lat/lon) | Fetch weather forecast | [Open-Meteo Privacy](https://open-meteo.com/en/privacy) | Disable weather widget |
| **RSS Feed URLs** | Feed URLs you add | Fetch feed content | Per feed provider | Remove feed |
| **CORS Proxy** (allorigins.win / corsproxy.io / user-hosted) | Feed URLs + feed content | Bypass browser CORS on cross-origin feeds | Per proxy operator | Use same-origin feeds only |
| **Favicons** (s2.googleusercontent.com / favicon lookup) | Favicon URL lookups | Fetch site icons for quick links | [Google Privacy](https://www.google.com/intl/en/policies/privacy/) | Disable icon loading |
| **Bing Daily Image** | Geographic region (optional) | Fetch daily background image | [Microsoft Privacy](https://privacy.microsoft.com) | Switch to different background |
| **NASA APOD** | None | Fetch astronomy picture of the day | [NASA Privacy](https://www.nasa.gov/about/highlights/hq_privacy.html) | Switch background |
| **Unsplash Photos** | Search keywords (if you use Unsplash search) | Fetch random/search photos | [Unsplash Privacy](https://unsplash.com/privacy) | Switch photo provider |
| **CoinGecko Crypto Prices** | Crypto symbols in your watchlist | Fetch current prices | [CoinGecko Privacy](https://www.coingecko.com/en/privacy) | Disable crypto widget |
| **GitHub Trending** (anonymous endpoint) | None | Fetch trending repos per language | [GitHub Privacy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement) | Disable GitHub widget |
| **Windy Radar Embed** | Your location (if enabled) | Render Windy weather radar | [Windy Privacy](https://www.windy.com/privacy) | Disable Windy widget |
| **RainViewer Radar Overlay** (optional overlay) | Your location | Render rain/storm animation | [RainViewer Privacy](https://www.rainviewer.com/privacy.html) | Disable overlay |
| **Reading List Integration** (Chrome 120+) | Headline URL + title | Save articles to Chrome Reading List | Built-in, your device | Disable reading list button |
| **Calendar .ics URLs** | .ics URL you provide | Parse calendar events | Per .ics provider | Remove calendar |

**No account required for any integration.** All requests are made on-demand when you interact with the widget (e.g., fetch weather when you click refresh, fetch feeds on load).

---

## Permissions & Why We Request Them

### `storage`
Store all your settings, widgets, feeds, todos, notes, and preferences locally. Data never leaves your device.

### `alarms`
Schedule internal wake-up timers for clock ticking (~every minute), Pomodoro reminders, and countdown notifications. No remote timers or server involvement.

### `tabs`
Detect when your active browser tab loses focus so the Pomodoro timer can auto-pause (user preference). This is read-only detection on your device.

### `topSites`
Read your browser's native "most visited" list for the Most Visited widget. This is read-only from your device; Vantage never sends this anywhere.

### `readingList` (Chrome 120+, optional)
Allow you to save feed headlines directly to Chrome's native Reading List. This is a local action; data stays in your Reading List.

### `sidePanel` (Chrome 114+, optional, future feature)
Enable a sidebar feed reader for future versions. This feature is optional and can be disabled in settings.

### Host Permissions (`*://` URLs)
Fetch user-configured RSS feeds and image URLs. We only access domains you explicitly add to feeds or background image URLs.

---

## Third-Party Data Sharing

**We do not share your data with any third party.**

When you use an integration (e.g., Open-Meteo for weather), that service receives **only** what's necessary for that one function:
- Open-Meteo gets your location (if you provide it) to fetch weather
- Feed providers get the feed URL to return feed items
- Your CORS proxy sees the feed URL and content (required to bypass browser CORS)

Each service has its own privacy policy (see Privacy Table above). We do not sell, license, or share any aggregated data about how you use Vantage.

---

## Data Retention

- **Settings & widgets**: Retained until you delete the extension or clear your data
- **Feed cache**: Retained until you refresh, export, or clear history
- **Error logs**: 50-entry ring buffer; oldest entries are automatically purged
- **Read/unread status**: Retained until you click "mark all read" or export
- **Local storage**: Managed by your browser's storage quota (typically 10 MB per extension)

---

## Data Security

All data is stored in your browser's `chrome.storage.local` API, which is:
- Isolated per browser profile
- Encrypted at rest by your operating system (if OS-level encryption is enabled)
- Never transmitted unless you explicitly export or share a settings link

We do not use SSL/TLS for local storage (it's already on your device). When fetching external data (weather, feeds), standard HTTPS is used.

---

## Your Rights & Controls

You have full control of your data:

1. **View**: Open Settings → Data to see your stored data
2. **Export**: Settings → Data → Export Settings (JSON file, you control where it goes)
3. **Import**: Paste a previously exported JSON or select which sections to restore
4. **Delete**: Settings → Data → Clear All Data (or uninstall the extension)
5. **GDPR / CCPA**: All your data is on your device; there is nothing for us to delete or provide (you already have it)

---

## Children's Privacy

Vantage is not intended for users under 13. We do not knowingly collect data from children. If we become aware of collection from a child, we will delete it immediately (though our extension collects no data anyway).

---

## Policy Changes

We may update this policy to reflect new features or legal requirements. Changes will be announced in the CHANGELOG and GitHub releases. Continued use of the extension after changes constitutes acceptance.

---

## Contact

For privacy concerns or questions:
- **GitHub Issues**: https://github.com/SysAdminDoc/Vantage/issues
- **Email**: Contact info available on GitHub profile (SysAdminDoc)

---

## License & Open Source

Vantage is open-source (MIT License). You can review the full source code at https://github.com/SysAdminDoc/Vantage to verify these privacy claims yourself.

---

## Compliance

- ✅ **GDPR**: Vantage collects no personal data and processes no personal data.
- ✅ **CCPA**: Vantage collects no consumer data.
- ✅ **LGPD** (Brazil): No personal data collection.
- ✅ **ePrivacy Directive**: No cookies; all data is local.
- ✅ **Chrome Web Store**: Complies with [CWS User Data Policy](https://developer.chrome.com/docs/webstore/program-policies#protecting-user-privacy).

---

**Vantage Privacy Policy v1.0.0**
*Effective May 2, 2026*

