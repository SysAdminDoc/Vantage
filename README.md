<div align="center">

<img src="assets/banner.png" alt="Vantage" width="100%"/>

# Vantage

**A new tab dashboard for Chromium and Firefox — bring your search engine, your feeds, your weather, your links.**

[![Version](https://img.shields.io/badge/version-0.8.0-cba6f7?style=flat-square)](https://github.com/SysAdminDoc/Vantage/releases)
[![License](https://img.shields.io/badge/license-MIT-89b4fa?style=flat-square)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-V3-a6e3a1?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Firefox-94e2d5?style=flat-square)](#install)

</div>

---

<img width="1616" height="883" alt="Vantage screenshot" src="https://github.com/user-attachments/assets/0afeef81-dbf9-4093-8497-8d5115c35744" />


## Why another new tab extension?

Most new tab dashboards (Momentum, Tabliss, Bonjourr, Mue, Renewed Tab, Horizon) lock you to one search engine — usually Google. **Vantage treats the search engine as a first-class setting**: switch between Google, DuckDuckGo, Startpage, Brave, Kagi, Ecosia, Qwant, SearXNG, Perplexity, or your own self-hosted endpoint with one click, right from the new tab.

Beyond that: 22 toggleable widgets, a place- and time-aware animated sky, multi-profile workspaces, and zero API keys / signups / tracking.

## Features

### Search
- **10 engines built-in + custom URL** — Google · Bing · DuckDuckGo · Startpage · Brave · Kagi · Ecosia · SearXNG · Qwant · Perplexity · custom (use `%s` for the query). Custom dropdown picker, not a native `<select>`.
- **Full keyboard navigation on the engine picker** — `↑/↓/Home/End/Enter/Esc` plus type-ahead (`d` jumps to DuckDuckGo, `b` to Bing, etc.).
- **`/` to focus search** — keyboard shortcut hint shown inline.

### Widgets
22 toggleable widgets, all locally stored, all togglable from a popover quick-picker without opening settings.

| Hero | Status bar | Reading panels | Tools |
|---|---|---|---|
| Clock | Weather | News | Pomodoro |
| Greeting | Air quality | RSS / Reading list | Unit converter |
| Search | | Calendar (iCal) | |
| Quick links | | Weather radar (Windy) | |
| Top sites | | To-Do | |
| World clocks | | Notes | |
| Quote of the day | | Bookmarks | |
| | | Crypto prices | |
| | | GitHub activity | |
| | | Photo of the day | |
| | | Countdowns | |
| | | Custom iframe embeds | |

- **Drag-to-reorder** — quick-link pills, reading panels, even custom embed panels remember the order you arrange them in.
- **Click-to-mark-read** — feed items dim out, panel headers show unread-count badges, one-click "mark all read" per panel. State persists across tabs.
- **Quick-link folder groups** — bundle related links into a popover folder pill.
- **Feed dedup + filter rules** — paste the same article URL across multiple feeds and it appears once. Optional regex rules can mute or highlight feeds by title/URL.
- **Per-feed favicons** in headline rows.
- **Skeleton loading + last-updated timestamp + refresh-with-spinner** on every async panel.

### Animated background

The reason the dashboard feels alive. Toggleable; defaults on.

**Time-of-day sky** with 15 color keyframes — pre-dawn, civil/nautical/astronomical twilight, golden hour, sunrise, midday, afternoon, golden hour, sunset, dusk, deep night. Sun arcs across the sky on its actual NREL SPA path; the moon shows the **real current lunar phase** computed from the synodic cycle.

**Weather-driven layers** — clouds drift at three depths, rain streaks scroll over a darkened sky palette, snow falls (with **fat lazy flakes for the first 24h after the first snow of the season**), fog hazes, lightning flashes (full sky for storms, soft horizon glow for distant rain), sun halos through cirrus, sun pillars at sunrise/sunset, **rainbow for 3 minutes after rain → clear**.

**Locality-aware foreground** based on your weather location:

| Latitude | Tree | Notes |
|---|---|---|
| Tropical (\|lat\|<23°) | Coconut palm | Default for warm climates |
| Temperate (23-50°) | Oak / deciduous | Sways in the wind |
| Boreal (50-66°) | Pine | Slow narrow oscillation |
| Polar (>66°) | None — bare horizon | Open to aurora |
| Desert (Sahara, Sonoran, Atacama, Australian outback, Kalahari, etc.) | Saguaro cactus | Auto-detected from lat/lon rectangles |

**Three-layer parallax mountains** with subtle mouse-driven parallax shift. Optional **coastal scenery** (lighthouse with rotating beam + occasional whale-fluke breach) and **urban scenery** (distant city skyline with twinkling windows).

**Astronomical extras** — Milky Way streak across the deep summer/autumn night sky (hemisphere-aware), Big Dipper / Southern Cross constellations (hemisphere-aware), Venus as the morning/evening star, **shooting stars** at random intervals at night (frequency boosted 4× on Perseids, Geminids, Leonids, Quadrantids, and 5 other meteor-shower peak dates), **aurora borealis** at \|lat\|≥55° on clear nights, plane lights crossing the sky.

**Wildlife** — V-formation bird flock during clear days, **bats replace birds at dusk** for Halloween mood, butterflies in spring/summer temperate, deer silhouette at dawn in temperate/boreal forests, fireflies in summer twilight.

**Seasonal particles** — cherry blossoms drift in spring temperate, autumn leaves fall in autumn temperate.

**Holidays — full 24h, all day** (using the user's local timezone):
- 🎃 **Halloween** (Oct 31): jack-o'-lantern row across horizon, bats replace birds at dusk
- 🎅 **Christmas Eve / Day** (Dec 24-25): Santa's sleigh + reindeer crosses the sky on loop
- 🎆 **New Year's Eve / Day** (Dec 31 / Jan 1): random firework bursts every 4-13 seconds, all day, with random hues and 24-spike radial blooms
- 🎈 **Birthday** (user-set MM-DD): balloons drift up across the screen

**Subtle interactivity** — mouse parallax on the three mountain layers, page-load shooting star within 8 seconds of opening, all transitions honor `prefers-reduced-motion`.

### Wallpapers (alternative to the animated background)

Six wallpaper modes:
- **Animated** (default — the place-aware sky above)
- **Solid color** — single color picker
- **Gradient** — two-color picker + angle
- **Image URL** — any direct image URL with blur + brightness sliders
- **Image upload** — local file → base64 in storage
- **Bing daily** — pulls the current Bing image of the day, cached per-day

Animated mode includes **Motion** controls (System / Still / Calm / Full) and **Atmosphere** controls (Soft / Balanced / Vivid), so the live scene can be calmer, fully still, or more visually present without changing the dashboard layout.

### Personalization
- **System, Catppuccin Mocha, Macchiato, Frappe, and Latte themes** with full design-token system, careful tonal layering, refined shadows, and ambient gradient backdrop.
- **9-color accent picker** — Mauve · Blue · Green · Peach · Teal · Lavender · Red · Flamingo · Sky.
- **Custom CSS injection** — paste any CSS into the textarea; live-applies as you type.
- **Locality scenery override** — pick coastal / urban / desert / default, or auto.
- **Multi-profile workspaces** — snapshot your current theme, scenery, background, and layout, then switch profiles with View Transitions. (Firefox: optional container → workspace mapping.)
- **Onboarding wizard** on first run — three layout presets (Minimal, Standard, Full) plus optional name + weather location.
- **Reddit feed presets** — one-click add for popular subreddits.

### Productivity
- **OPML import + export** — one-click export of all RSS + News feeds; merge-import from any OPML file (Feedly, Inoreader, NetNewsWire compatible).
- **Settings JSON export / import** — download your full config as JSON, restore it on any device.
- **Config share link** — copy a URL that encodes your entire settings as a base64 fragment; open it on any device with Vantage installed.
- **Pomodoro timer** — focus / break / long-break cycles with tab-blur auto-pause, cross-tab `navigator.locks` single-completion guarantee, Web Notifications on phase change, and live `<title>` countdown.
- **Storage quota panel** — see how much of your `chrome.storage.local` quota you're using.

### Privacy & UX
- **All local** — `chrome.storage.local` only. No analytics, no telemetry, no remote config server. The only outbound calls are listed in the [Privacy table](#privacy--network).
- **No API keys required** — every external service used is free and open.
- **Cross-tab sync** — change a setting in one tab, every other open new tab updates instantly.
- **Multi-proxy CORS fallback** — RSS and calendar feeds try direct → allorigins.win → corsproxy.io before failing.
- **Custom UI primitives** — toggle switches, segmented controls, icon buttons. No native checkboxes or selects on the primary surface.
- **Accessibility-aware** — visible focus rings, ARIA-labelled controls, `prefers-reduced-motion` support, semantic landmarks, dialog-pattern settings panel with focus trap and Esc-to-close, Windows High Contrast support.

## Install

Three paths for Chromium browsers, one for Firefox. Pick the one that fits.

### Option A — One-line PowerShell installer (Windows, recommended, Chromium only)

Downloads the latest release, extracts to `%LOCALAPPDATA%\Vantage\extension`, and adds `--load-extension="<that path>"` to every Brave / Chrome / Edge / Vivaldi / Opera shortcut on the system (Start Menu, Desktop, Taskbar pin — user-level and system-wide). Relaunch the browser from any of those shortcuts and Vantage loads.

**Run from any PowerShell window** (auto-elevates to write system shortcuts):

```powershell
irm https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 | iex
```

UAC prompts → approve → menu lists detected browsers → pick which ones → done. Fully quit and re-open the browser.

```powershell
# Verify which shortcuts carry the flag
$f="$env:TEMP\vantage-install.ps1"; iwr https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 -OutFile $f -UseBasicParsing; & $f -Verify

# Update to a newer release (re-runs the download + extract)
irm https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 | iex

# Uninstall (strips the flag, deletes the extension files)
$f="$env:TEMP\vantage-install.ps1"; iwr https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 -OutFile $f -UseBasicParsing; & $f -Uninstall
```

### Option B — Load unpacked from the ZIP (Chromium, any OS, no admin)

1. Download the latest **`Vantage-vX.Y.Z.zip`** from [Releases](https://github.com/SysAdminDoc/Vantage/releases).
2. Right-click → **Extract All** to a permanent folder (e.g. `C:\Tools\Vantage\`). **Don't delete this folder** — your browser reads from it on every startup.
3. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`, `vivaldi://extensions`).
4. Toggle **Developer mode** on (top-right corner).
5. Click **Load unpacked** and select the extracted folder.
6. Open a new tab. Welcome to Vantage.

When the browser asks for location permission (for weather), allow it — or skip and set a city manually in settings. To update: download the new ZIP, extract over the same folder, hit the refresh icon on the extension card.

### Option C — Firefox (109+)

Download **`Vantage-vX.Y.Z-firefox.xpi`** from [Releases](https://github.com/SysAdminDoc/Vantage/releases).

**Temporary install (any Firefox, resets on restart):**
1. Open `about:debugging` → **This Firefox**.
2. Click **Load Temporary Add-on…** → pick the `.xpi` file.
3. Open a new tab. Welcome to Vantage.

**Permanent install (survives restarts):** Firefox requires extensions to be signed by Mozilla for permanent installation on Release and Beta channels. Options:
- **Firefox Developer Edition / Nightly**: go to `about:config`, set `xpinstall.signatures.required` to `false`, then drag-drop the XPI onto `about:addons` or use **Install Add-on From File**.
- **Firefox ESR with enterprise policy**: set `ExtensionSettings` via `policies.json` to allow unsigned extensions from a local path.
- **AMO unlisted submission**: submit the XPI to addons.mozilla.org as an unlisted add-on; Mozilla signs it within minutes and you get back a signed XPI that installs permanently on any Firefox. This path is on the roadmap.

To update: download the new XPI, repeat the install step — the old version is replaced automatically.

### Why no Enterprise Policy install? (Chromium)

I tried. Modern Chromium browsers (Chrome 137+, Brave 147+) now silently filter self-hosted CRX URLs out of `ExtensionInstallForcelist` — the registry policy is accepted but never propagates to the extension service. The only update_urls that actually install through that policy are Chrome Web Store entries. The launch-flag path above is the reliable alternative.

### Why no `.crx` drag-install?

Stock Chrome / Brave / Edge reject every self-signed CRX dragged onto the extensions page with `CRX_REQUIRED_PROOF_MISSING` — upstream Chromium policy since version 75 (2019). The `.crx` asset on the release exists only for Vivaldi and browsers launched with `--load-extension`; everyone else uses the installer or ZIP path above.

## Customize

Click the gear icon in the top-right of any new tab. Or click the layout-grid icon next to it for a quick widget toggle popover.

Highlights:

- **Theme** — System, Mocha, Macchiato, Frappe, or Latte, plus 9 accent colors and a custom CSS textarea.
- **Background** — Animated / Solid / Gradient / Image URL / Image upload / Bing daily. Animated includes Motion and Atmosphere controls.
- **Greeting** — display name + birthday (MM-DD; triggers all-day balloons on the day).
- **Scenery** — Auto / Coastal / Urban / Desert / None — overrides the auto-detected biome scenery.
- **Search** — pick the default engine, or supply a custom URL like `https://my-searx.example.com/search?q=%s`.
- **Weather** — type a city name and hit "Set", or click "Reset to auto-detect" to use geolocation.
- **Workspaces** — name multiple visual/layout profiles, snapshot the current one, switch between them.
- **Embeds** — add any iframe-friendly URL as a custom reading panel (flight tracker, dashboard, internal tool, anything).
- **Filter rules** — regex `mute` or `highlight` rules over RSS / News by title or URL.
- **Data** — JSON export, JSON import, OPML export, OPML import, share-link, re-run the setup wizard.
- **Reset** — wipe back to defaults if you make a mess.

## Architecture

Pure vanilla JS modules. No build step. No bundler. No framework. Ships exactly as you read it on disk — every file in `src/` is what runs in your browser.

```
Vantage/
├── manifest.json              MV3 manifest (chrome_url_overrides → newtab.html)
├── manifest.firefox.json      Firefox variant (no module worker)
├── newtab.html                Static HTML shell
├── src/
│   ├── main.js                Entry — settings, mounts, keyboard, workspace bar
│   ├── background.js          Service worker (toolbar action → open new tab)
│   ├── style.css              Design tokens, type, motion, all UI styles
│   ├── storage.js             chrome.storage.local wrapper with deep-merged defaults
│   ├── search-engines.js      Engine catalog + URL builder
│   ├── settings.js            Settings panel — composed from primitives
│   ├── widget-picker.js       Quick-toggle popover for widgets + embeds
│   ├── onboarding.js          First-run setup wizard
│   ├── icons.js               Inline SVG icon library (Lucide-style stroke set)
│   ├── widgets/
│   │   ├── search.js          Hero search + custom engine picker
│   │   ├── clock.js           Time-aware greeting + datetime
│   │   ├── weather.js         Open-Meteo weather pill
│   │   ├── airquality.js      AQI pill (Open-Meteo Air Quality API)
│   │   ├── background.js      Animated sky / weather / locality / holidays
│   │   ├── quicklinks.js      Pill-row links + folder groups
│   │   ├── topsites.js        chrome.topSites widget
│   │   ├── worldclock.js      World clocks strip
│   │   ├── pomodoro.js        Cross-tab focus timer
│   │   ├── feed-list.js       Shared multi-feed renderer (used by RSS + News)
│   │   ├── rss.js             RSS / Reading-list panel
│   │   ├── news.js            News panel
│   │   ├── calendar.js        iCal panel
│   │   ├── windy.js           Windy radar embed panel
│   │   ├── embed.js           Generic iframe embed panel
│   │   ├── todo.js            To-do list panel
│   │   ├── notes.js           Sticky notes panel
│   │   ├── bookmarks.js       Browser bookmarks panel
│   │   ├── crypto.js          Crypto prices (CoinGecko)
│   │   ├── github.js          GitHub activity / trending repos
│   │   ├── quote.js           Daily quote banner
│   │   ├── photo.js           Daily photo (Picsum / NASA APOD)
│   │   └── countdown.js       Countdown events panel
│   └── utils/
│       ├── dom.js             el() builder + toggle/segmented/toast primitives
│       ├── drag.js            Drag-to-reorder helper
│       ├── ical-parser.js     iCal RFC 5545 parser
│       ├── opml.js            OPML 2.0 import/export
│       ├── rss-parser.js      RSS / Atom parser via DOMParser, CORS fallback
│       ├── sun-calc.js        SunCalc-style astronomical computation
│       ├── weather-source.js  Open-Meteo client with 10-min cache
│       └── workspace.js       Workspace snapshot + apply
└── icons/                     16/48/128/256/512 PNGs + master SVG
```

### Privacy & network

| Outbound call | Triggered by | Why |
|---|---|---|
| `api.open-meteo.com` | Weather | Current temperature + sunrise/sunset (NREL SPA) |
| `geocoding-api.open-meteo.com` | Settings ("Set city") | Resolve city name to lat/lon |
| `air-quality-api.open-meteo.com` | Air quality widget | AQI / PM / pollen |
| Each configured RSS / News feed URL | RSS / News widgets | Direct fetch first |
| Each configured iCal feed URL | Calendar widget | Direct fetch first |
| `api.allorigins.win` | RSS / News / Calendar (fallback) | Used **only** when direct fetch is blocked by CORS |
| `corsproxy.io` | RSS / News / Calendar (second fallback) | Tried after allorigins fails |
| `www.google.com/s2/favicons` | Quick Links / Top Sites / Bookmarks / Feeds | 32-64px favicon images |
| `api.coingecko.com` | Crypto widget | Current prices for selected coins |
| `api.github.com` | GitHub widget | Public events / trending repos |
| `api.quotable.io` | Quote widget | Quote of the day |
| `picsum.photos` | Photo widget (default) | Random daily photo |
| `api.nasa.gov` | Photo widget (NASA APOD mode) | Astronomy picture of the day |
| `www.bing.com` | Background → Bing daily | Daily wallpaper image |

Nothing else. No analytics, no error reporting, no auto-update server.

## Roadmap

See [ROADMAP.md](ROADMAP.md). Short version: AMO unlisted Firefox signing, Chrome Web Store listing, more meteor-shower-style "celebrate this date" calendar events, and continued biome / locality refinement.

## License

MIT — see [LICENSE](LICENSE).

## Credits

- [Open-Meteo](https://open-meteo.com/) — free, no-API-key weather + geocoding + air quality.
- [Catppuccin](https://github.com/catppuccin/catppuccin) — color palette.
- [allorigins](https://allorigins.win/) and [corsproxy.io](https://corsproxy.io/) — CORS proxy fallbacks.
- [Lucide](https://lucide.dev/) — icon stroke style.
- [SunCalc](https://github.com/mourner/suncalc) — astronomical algorithm reference.
- [CoinGecko](https://www.coingecko.com/), [Quotable](https://github.com/lukePeavey/quotable), [Picsum](https://picsum.photos/), [NASA APOD](https://api.nasa.gov/) — free APIs.
- Inspired by Epiboard, Tabliss, Bonjourr, Mue, Renewed Tab, Horizon, and Fluent — each great in their own way; Vantage is just my flavor.
