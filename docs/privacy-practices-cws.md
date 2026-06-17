# Vantage CWS Privacy Practices

This document contains all privacy-related content for Chrome Web Store submission.

---

## Single Purpose

"A customizable new tab page with widgets for weather, news feeds, todos, productivity tools, and more — all stored locally, no telemetry."

---

## Permission Justifications

### `storage`
**Why**: Store user settings, widget configurations, feed cache, read status, todo items, notes, and workspace preferences locally in your browser. Vantage does not send any of this data to external servers.

### `alarms`
**Why**: Schedule background wake-ups for clock updates, Pomodoro timer reminders, countdown notifications, and alarm chiming. Alarms are used to display accurate time on the new tab page and trigger local notifications.

### `bookmarks`
**Why**: Power the optional Bookmarks widget from the browser's native bookmark tree. This is read-only local browser data and is never transmitted.

### `topSites`
**Why**: The "Most Visited" widget shows your browser's native most-visited site list. This is read-only and never sent anywhere.

### `readingList` (Chrome 120+)
**Why**: Optional integration: when enabled in settings, a "Save to Reading List" button appears on feed headlines, letting you save articles to Chrome's native Reading List without leaving the NTP.

### `sidePanel` (Chrome 114+)
**Why**: Optional integration: lets users read the combined News + Reading list feed in Chrome's native side panel. The toolbar-click behavior is user-controlled in Settings.

### `history` (optional permission)
**Why**: Optional integration: the History Search widget calls `chrome.history.search` only after the user enables it in Settings and accepts the browser permission prompt. Turning the setting off revokes the permission when supported.

### `contextualIdentities` (Firefox only, not used in Chrome)
**Why**: Firefox-only integration that maps container tabs to Vantage workspaces locally. Chrome Web Store builds do not request this permission.

### `host_permissions`
**Why**: Fetch user-configured RSS/Atom/JSON feeds, iCal URLs, feed-discovery URLs, custom wallpaper/image URLs, favicon fallbacks, generic iframe embeds, and optional widget endpoints. Vantage does not inject content scripts or scrape arbitrary pages in the background. Fixed service hosts are declared explicitly (`api.open-meteo.com`, `geocoding-api.open-meteo.com`, `air-quality-api.open-meteo.com`, `marine-api.open-meteo.com`, `flood-api.open-meteo.com`, `ensemble-api.open-meteo.com`, `api.allorigins.win`, `corsproxy.io`, `www.bing.com`, `www.google.com`, `api.github.com`, `gist.githubusercontent.com`, `api.coingecko.com`, `api.nasa.gov`, `picsum.photos`). User-entered feed/calendar/image/embed URLs use runtime `optional_host_permissions`, not `*://*/*` install-time host access.

---

## Remote Code Declaration

**Does your extension execute remote code (downloaded from the web)?**

**NO.** Vantage does not execute any remote code. All code is bundled with the extension and verified during store review. The extension loads external content only as follows:

- **RSS/Atom feeds**: Parsed as XML/HTML and rendered as read-only text — no JavaScript execution.
- **Images**: Weather backgrounds, NASA APOD, Bing daily, user-uploaded backgrounds, and feed favicons are displayed as `<img>` elements — no execution.
- **Iframes**: Windy radar and user-configured embeds are displayed in `<iframe>` elements. Windy is a dedicated trusted weather-radar embed; generic embeds are user-entered URLs and are tracked separately for sandbox hardening before store submission.

No `eval()`, no `innerHTML` from untrusted sources, no `<script>` injection from external URLs.

---

## Data Collection & Privacy Certification

### What data does Vantage collect?

**None.** Vantage does not collect, upload, or share any user data:

- **Settings**: Stored in `chrome.storage.local`, never sent to any server
- **Feeds**: Feed URLs are user-provided; cached locally; no tracking
- **Weather location**: User can configure city name or coordinates; sent only to Open-Meteo (user-chosen, no account required)
- **Open-Meteo optional data**: Air quality, marine, river-flood, and ensemble-confidence requests use the same weather location only when those widgets/settings are enabled
- **Widgets**: All widget data (todos, notes, countdowns) stays on-device
- **Bookmarks / top sites**: Read-only native browser data for the Bookmarks and Most Visited widgets; never transmitted
- **Browsing history**: Only read after the user enables History Search and grants the optional `history` permission; never transmitted
- **Local error logs**: 50-entry ring buffer stored locally for user-copyable debugging; no crash reporting endpoint
- **Gist transfer**: Public Gist imports are user-triggered and token-free; public Gist creation uses an optional one-shot GitHub token with Gists write permission and the token is never stored

### Certifications

- [ ] **I confirm that this extension does not collect or use user data for personalized advertising.**
- [ ] **I confirm that this extension does not collect or use user data for other purposes.**
- [ ] **I confirm that this extension complies with the Limited Use requirements.**

---

## Privacy Policy

**Link**: https://github.com/SysAdminDoc/Vantage#privacy

### Inline (for submission form if needed)

Vantage is a privacy-first new tab page extension. All settings, preferences, and data are stored locally in your browser using the `chrome.storage.local` API. No data is collected, transmitted, or shared with any server or third party.

**External integrations** (all optional, user-configured):
- **Weather**: Open-Meteo weather/geocoding/air-quality/marine/flood/ensemble APIs (no auth required; your configured location is sent only for enabled weather surfaces)
- **RSS/News feeds**: User-configured URLs plus optional presets such as Reddit, Hacker News, and GitHub Trending RSS mirror feeds; Vantage fetches only selected URLs
- **Feed discovery**: Optional scan of a URL the user enters to find RSS / Atom / JSON Feed links
- **Calendar**: User-configured `.ics` URLs
- **CORS proxy** (if needed): allorigins.win, corsproxy.io, or a self-hosted proxy selected by the user
- **Images**: Bing Daily, Picsum, NASA APOD, user-entered image URLs, and Google s2/favicon/page favicon fallbacks as standard HTTP GETs
- **GitHub / CoinGecko**: Optional GitHub widget/Gist transfer and CoinGecko crypto prices
- **Embeds**: Optional Windy radar and user-entered iframe embeds
- **Settings transfer**: Optional GitHub Gist import/export. Creating a Gist requires a one-shot token; users can choose token-free JSON export or share-link copy instead.

Vantage does not use analytics, telemetry, remote config, crash reporting, or any tracking. The extension is open-source at https://github.com/SysAdminDoc/Vantage.

---

## Default Permission Justifications (CWS Form Fields)

Copy-paste into the CWS "Justify permissions" field:

```
storage: Store user settings, widgets, feeds, and preferences locally in your browser.

alarms: Schedule clock updates, Pomodoro reminders, and countdown notifications.

bookmarks: Power the optional Bookmarks widget from your local browser bookmarks.

topSites: Power the "Most Visited" widget using your browser's native site list.

readingList (if enabled): Optional; save feed headlines to Chrome Reading List.

sidePanel (if enabled): Optional Chrome side-panel feed reader.

history (optional): Optional History Search panel after an explicit user grant.

host_permissions (*://...): Fetch user-configured RSS/news feeds, iCal URLs, feed-discovery URLs, favicon/image/embed URLs, and optional widget endpoints. Vantage does not inject content scripts or run broad scraping.
```

---

## CWS Data Usage Checklist

### Data Collection (check all that apply to Vantage)
- [ ] **User-provided data**: Settings, feed URLs, todo items, notes, countdowns (all stay on-device)
- [ ] **Technical data**: None — no crash reporting, no analytics
- [ ] **Personally identifiable information**: None collected or transmitted
- [ ] **Financial information**: None
- [ ] **Authentication information**: None (no accounts)
- [ ] **Location information**: Only if user enters a city name, grants geolocation, or saves coordinates in weather settings (sent to Open-Meteo/Windy only for enabled weather/radar surfaces)

### Data Usage Restrictions
- [ ] "I confirm that this extension only uses the data for the stated purpose."
- [ ] "I confirm that this extension does not:
  - [ ] Sell user data
  - [ ] Use data for personalized advertising
  - [ ] Use data for remarketing or profiling
  - [ ] Share data with third parties except as necessary for the stated purpose"

---

## Screenshots & Promotional Assets

### Required
- **Store Icon**: 128×128 PNG/JPEG
- **Screenshots**: 1280×800 PNG/JPEG, at least 1, up to 5 (localized per language)
- **Promo Tile (small)**: 440×280 PNG/JPEG (optional)
- **Promo Tile (marquee)**: 1400×560 PNG/JPEG (optional)
- **YouTube promo video**: Link (optional)

### Recommendations
- Screenshot 1: Dashboard overview (dark theme, shows variety of widgets)
- Screenshot 2: Dashboard overview (light theme)
- Screenshot 3: Widget showcase (weather, news, todos side-by-side)
- Screenshot 4: Settings panel (customization options)
- Screenshot 5: Workspace switching (optional, shows multi-profile feature)

---

## Distribution Preferences

- **Geographic distribution**: Worldwide (unless legally restricted)
- **Category**: Productivity or New Tab
- **Homepage**: https://github.com/SysAdminDoc/Vantage
- **Support**: https://github.com/SysAdminDoc/Vantage/issues
- **Verified publisher**: (if applicable, set GitHub repo as official)
- **Content rating**: Not adult

---

## Notes

- **Accessibility**: Vantage passes WCAG 2.2 AA audit (see `docs/accessibility-report.md`)
- **i18n**: Supports English, Spanish, German, French, Japanese; RTL-aware (Arabic, Hebrew ready in v1.1.0)
- **Open source**: https://github.com/SysAdminDoc/Vantage (MIT license)
- **No tracking**: See https://github.com/SysAdminDoc/Vantage#privacy for the full Privacy Table (all external endpoints documented)

