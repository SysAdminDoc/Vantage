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

### `tabs`
**Why**: Detect when your browser tab loses focus so the Pomodoro timer can automatically pause (user preference). This prevents the timer from running while you're working on other content.

### `topSites`
**Why**: The "Most Visited" widget shows your browser's native most-visited site list. This is read-only and never sent anywhere.

### `readingList` (Chrome 120+)
**Why**: Optional integration: when enabled in settings, a "Save to Reading List" button appears on feed headlines, letting you save articles to Chrome's native Reading List without leaving the NTP.

### `sidePanel` (Chrome 114+)
**Why**: Optional integration: future version will add a sidebar panel so you can read RSS feeds in a side panel without leaving the current webpage. This feature is fully optional and can be disabled in settings.

### `webRequest` (Firefox only, not used in Chrome)
**Why**: (Firefox) No persistent webRequest. Firefox-specific extensions use event-page messaging for communication; MV3 equivalent uses native `tabs` API for all Vantage use cases.

### `host_permissions: *://feed.rss | *://feeds.example.com | (CORS proxy)`
**Why**: Fetch user-configured RSS/Atom feeds. Users explicitly add feed URLs; Vantage fetches only from URLs the user provides. If a feed requires CORS proxy (allorigins.win, corsproxy.io, or user's own Cloudflare Worker), Vantage routes through the proxy declared in settings.

---

## Remote Code Declaration

**Does your extension execute remote code (downloaded from the web)?**

**NO.** Vantage does not execute any remote code. All code is bundled with the extension and verified during store review. The extension loads external content only as follows:

- **RSS/Atom feeds**: Parsed as XML/HTML and rendered as read-only text — no JavaScript execution.
- **Images**: Weather backgrounds, NASA APOD, Bing daily, user-uploaded backgrounds, and feed favicons are displayed as `<img>` elements — no execution.
- **Iframes**: Embed widget (YouTube, maps, Windy radar, etc.) is an `<iframe>` with `sandbox` attribute and whitelisted `allow` list (see manifest `content_security_policy`).

No `eval()`, no `innerHTML` from untrusted sources, no `<script>` injection from external URLs.

---

## Data Collection & Privacy Certification

### What data does Vantage collect?

**None.** Vantage does not collect, upload, or share any user data:

- **Settings**: Stored in `chrome.storage.local`, never sent to any server
- **Feeds**: Feed URLs are user-provided; cached locally; no tracking
- **Weather location**: User can configure city name or coordinates; sent only to Open-Meteo (user-chosen, no account required)
- **Widgets**: All widget data (todos, notes, countdowns) stays on-device
- **Browsing history**: Only the `topSites` API is used (read-only native browser data)

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
- **Weather**: Open-Meteo API (no auth required, your location is sent only when you fetch weather)
- **RSS/News feeds**: User-configured URLs; Vantage fetches from those URLs
- **CORS proxy** (if needed): User chooses allorigins.win, corsproxy.io, or self-hosted Cloudflare Worker
- **Images**: Bing Daily, NASA APOD, Unsplash, favicons — standard HTTP GET

Vantage does not use analytics, telemetry, remote config, crash reporting, or any tracking. The extension is open-source at https://github.com/SysAdminDoc/Vantage.

---

## Default Permission Justifications (CWS Form Fields)

Copy-paste into the CWS "Justify permissions" field:

```
storage: Store user settings, widgets, feeds, and preferences locally in your browser.

alarms: Schedule clock updates, Pomodoro reminders, and countdown notifications.

tabs: Detect tab blur to auto-pause the Pomodoro timer (user preference).

topSites: Power the "Most Visited" widget using your browser's native site list.

readingList (if enabled): Optional; save feed headlines to Chrome Reading List.

sidePanel (if enabled): Optional future feature; sidebar RSS reader.

host_permissions (*://...): Fetch user-configured RSS feeds and image URLs.
```

---

## CWS Data Usage Checklist

### Data Collection (check all that apply to Vantage)
- [ ] **User-provided data**: Settings, feed URLs, todo items, notes, countdowns (all stay on-device)
- [ ] **Technical data**: None — no crash reporting, no analytics
- [ ] **Personally identifiable information**: None collected or transmitted
- [ ] **Financial information**: None
- [ ] **Authentication information**: None (no accounts)
- [ ] **Location information**: Only if user enters a city name or coordinates in weather settings (sent to Open-Meteo for weather API call only when user clicks "Fetch weather")

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

