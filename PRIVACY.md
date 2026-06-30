# Vantage Privacy Policy

**Last updated**: June 30, 2026

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
- **Optional history search state**: Whether the panel is enabled and its result cap; browser history itself is only read after you grant the optional `history` permission

None of this ever leaves your device unless you explicitly:
- Export settings as JSON (you control where the file goes)
- Share a settings import link
- Create or import a GitHub Gist from Settings -> Data (public Gist import is token-free; public Gist creation uses a one-shot GitHub token that Vantage never stores)

---

## External Integrations (Optional, User-Configured)

Vantage includes optional integrations with third-party services. **You choose whether to enable them.** Each is documented in the Privacy Table below:

| Integration | Data Sent | Why | Privacy | Disabler |
|---|---|---|---|---|
| **Open-Meteo Weather** | Your location (city name or lat/lon) | Fetch current weather, forecast, sunrise/sunset, and optional agricultural variables | [Open-Meteo Privacy](https://open-meteo.com/en/privacy) | Disable weather widget |
| **Open-Meteo Geocoding** | City search text | Resolve a city name to coordinates | [Open-Meteo Privacy](https://open-meteo.com/en/privacy) | Use manual coordinates / do not set city |
| **Open-Meteo Air Quality** | Your weather location | Fetch AQI, PM, and pollen values | [Open-Meteo Privacy](https://open-meteo.com/en/privacy) | Disable air quality widget |
| **Open-Meteo Marine** | Your weather location | Fetch wave height, sea temperature, and current data for coastal locations | [Open-Meteo Privacy](https://open-meteo.com/en/privacy) | Disable marine weather |
| **Open-Meteo Flood** | Your weather location | Fetch nearby river discharge / flood-risk data | [Open-Meteo Privacy](https://open-meteo.com/en/privacy) | Disable river flood risk |
| **Open-Meteo Ensemble** | Your weather location | Fetch optional forecast-confidence spread | [Open-Meteo Privacy](https://open-meteo.com/en/privacy) | Disable forecast confidence |
| **RSS / News feed URLs** | Feed URLs you add | Fetch feed content | Per feed provider | Remove feed |
| **Feed discovery URLs** | Website URL you enter | Scan for RSS / Atom / JSON Feed links | Per site provider | Do not use Discover feeds |
| **GitHub Trending RSS mirror** | Selected preset URL/language | Fetch optional GitHub Trending preset feeds from `mshibanami.github.io/GitHubTrendingRSS` | [GitHub Privacy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement) | Remove the preset feed |
| **Calendar .ics URLs** | .ics URL you provide | Parse calendar events | Per .ics provider | Remove calendar |
| **CORS Proxy** (allorigins.win / corsproxy.io / user-hosted) | Feed/calendar URLs + returned content | Bypass browser CORS on cross-origin feeds/calendars | Per proxy operator | Use same-origin feeds only |
| **Favicons** (www.google.com/s2/favicons + icons.duckduckgo.com + page fallback) | Page hostnames / favicon URL lookups | Fetch site icons for quick links, Top Sites, Bookmarks, feeds, and history rows | [Google Privacy](https://www.google.com/intl/en/policies/privacy/), DuckDuckGo favicon service, or per site | Disable affected widgets / clear favicon cache |
| **Bing Daily Image** | Geographic region (optional) | Fetch daily background image | [Microsoft Privacy](https://privacy.microsoft.com) | Switch to different background |
| **User image URLs** | Direct image URL you enter | Load a custom wallpaper image | Per image host | Switch background |
| **Picsum Photos** | Date-derived image seed | Fetch the default daily photo | [Picsum](https://picsum.photos/) | Disable photo widget or switch source |
| **NASA APOD** | Optional NASA API key, requested date | Fetch astronomy picture of the day | [NASA Privacy](https://www.nasa.gov/about/highlights/hq_privacy.html) | Disable photo widget or switch source |
| **CoinGecko Crypto Prices** | Crypto symbols in your watchlist | Fetch current prices | [CoinGecko Privacy](https://www.coingecko.com/en/privacy) | Disable crypto widget |
| **GitHub Widget** | GitHub username and selected language | Fetch public user activity and public repository search results | [GitHub Privacy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement) | Disable GitHub widget |
| **GitHub Gist Transfer** | Settings JSON; optional one-shot GitHub token for Gist creation only | Import/export settings across devices | [GitHub Privacy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement) | Use JSON export/import or share link instead |
| **Windy Radar Embed** | Your weather location | Render Windy weather radar iframe | [Windy Privacy](https://www.windy.com/privacy) | Disable Windy widget |
| **Generic iframe embeds** | Iframe URL you add | Render custom embedded dashboards/tools | Per embed provider | Remove embed |
| **Quote author link** | Author page URL only when clicked | Open an `en.wikipedia.org` author page | [Wikimedia Privacy](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy) | Do not click author link |
| **Reading List Integration** (Chrome 120+) | Headline URL + title | Save articles to Chrome Reading List | Built-in, your device | Disable reading list button |

**No account required for any integration.** All requests are made on-demand when you interact with the widget (e.g., fetch weather when you click refresh, fetch feeds on load).

---

## Permissions & Why We Request Them

### `storage`
Store all your settings, widgets, feeds, todos, notes, and preferences locally. Data never leaves your device.

### `alarms`
Schedule internal wake-up timers for clock ticking (~every minute), Pomodoro reminders, and countdown notifications. No remote timers or server involvement.

### `bookmarks`
Read your browser's bookmark tree for the Bookmarks widget. This is read-only from your device; Vantage never sends bookmark data anywhere.

### `topSites`
Read your browser's native "most visited" list for the Most Visited widget. This is read-only from your device; Vantage never sends this anywhere.

### `readingList` (Chrome 120+, optional)
Allow you to save feed headlines directly to Chrome's native Reading List. This is a local action; data stays in your Reading List.

### `sidePanel` (Chrome 114+)
Enable the optional Chrome side-panel feed reader. You control whether the toolbar button opens the side panel in Settings.

### `history` (optional)
Enable the History Search panel only after you opt in from Settings. Disabling the panel revokes the permission when the browser supports runtime permission removal.

### `contextualIdentities` (Firefox only)
Map Firefox containers to Vantage workspaces locally. Chromium builds do not request this permission.

### Host Permissions
Fetch fixed service endpoints for Open-Meteo, CORS proxy fallback, Bing wallpaper, Google and DuckDuckGo favicons, GitHub/Gist transfer, CoinGecko, NASA APOD, and Picsum through explicit manifest host entries. User-configured RSS feeds, iCal URLs, feed-discovery URLs, custom image URLs, and generic embeds use runtime `optional_host_permissions` instead of `*://*/*` install-time access. If you deny an origin, Vantage stores that denied origin locally so Settings can show a `Grant access` recovery button.

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
- **Feed cache / archive**: Retained until you refresh, export, clear archive, or remove feeds
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

**Vantage Privacy Policy v1.2.0**
*Effective June 11, 2026*

