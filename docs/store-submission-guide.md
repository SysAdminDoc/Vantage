# Vantage v1.0.0 Store Submission Guide

This document walks through submitting Vantage to CWS, AMO, Edge Add-ons, and Opera Add-ons.

---

## Prerequisites

- [ ] Extension version bumped to v1.0.0 in `manifest.json`
- [ ] All "Now" tier features complete (see ROADMAP.md)
- [ ] WCAG 2.2 AA audit complete (`docs/accessibility-report.md`)
- [ ] i18n scaffolding complete (`_locales/{en,es,de,fr,ja}/messages.json`)
- [ ] RTL support complete (CSS rules in `style.css`)
- [ ] Privacy docs created (`docs/privacy-practices-cws.md`, `PRIVACY.md`, `docs/store-listing-content.md`)
- [ ] Widget API locked (`docs/widget-api.md`)
- [ ] Source ZIP built and tested locally (Load Unpacked in Chrome)

---

## Screenshots & Assets

### Capture Requirements

**Vantage runs at 125% DPI on this system.** Screenshots must be captured at 1280×800 logical pixels (will appear as 1920×1200 physical pixels due to DPI scaling). Use `SetProcessDPIAware()` to normalize before capture.

### Screenshots Needed (1280×800 each)

1. **Dashboard overview (Mocha dark theme)**
   - Show: weather widget, news feed panel, todo + note widgets, quick links
   - No settings modal open
   - Clean, representative layout

2. **Dashboard overview (Latte light theme)**
   - Same layout as Screenshot 1, but light theme
   - Shows theme customization capability

3. **Widget variety**
   - Close-up of 3-4 different widgets: weather, RSS headline, Pomodoro timer, quote
   - Showcase the breadth of functionality

4. **Settings panel**
   - Open the Settings modal
   - Show theme selector, accent color picker, workspace switcher
   - Demonstrates customization depth

5. **Animated background (optional)**
   - Screenshot showing the weather-driven animated background
   - Shows visual polish and attention to detail

### Store Icon

- **Size**: 128×128 PNG
- **Vantage logo** (current repo logo at 128×128)
- Ensure legibility at small size

### Promotional Tiles (Optional but Recommended)

- **Small promo tile**: 440×280 PNG/JPEG
- **Marquee promo tile**: 1400×560 PNG/JPEG
- Design should match Vantage branding (Catppuccin colors, clean typography)

---

## Chrome Web Store (CWS) Submission

### Step 1: Prepare Extension Package

```bash
# In ~/repos/Vantage/
# Option A: Use existing ZIP from GitHub Release (if available)
# Option B: Build locally
zip -r Vantage-1.0.0.zip manifest.json src/ _locales/ PRIVACY.md -x "*.md:docs/*" "*.git*"

# Verify ZIP contents
unzip -l Vantage-1.0.0.zip | head -20
```

### Step 2: Set Up CWS Developer Account

1. Go to https://chrome.google.com/webstore/devconsole
2. Log in with GitHub account (or create new account if needed)
3. Accept developer agreement ($5 one-time fee if first submission)
4. Complete developer profile (name, contact email)

### Step 3: Create New Item on CWS

1. **CWS Dashboard** → "New Item" button
2. Upload `Vantage-1.0.0.zip`
3. Confirm manifest validation passes
4. CWS assigns an Item ID (note this for future updates)

### Step 4: Fill Out Store Listing

Navigate to **Store Listing** tab:

- **Title**: "Vantage"
- **Short description**: (copy from `docs/store-listing-content.md`, English section)
- **Detailed description**: (copy from same)
- **Category**: Productivity or New Tab (whichever CWS allows)
- **Language**: English (set to English initially; add other locales below)

### Step 5: Upload Assets

- **Store icon**: 128×128 PNG (Vantage logo)
- **Screenshot 1–5**: Upload all 5 screenshots (1280×800)
- **Optional**: Small promo tile (440×280) — recommended but not required
- **Optional**: Marquee tile (1400×560) — for featured placement (request separately)

### Step 6: Add Localized Listings

For each locale (Spanish, German, French, Japanese):

1. Click **"Select a language"** dropdown in Store Listing section
2. Choose language (e.g., "Spanish")
3. Fill in localized description (copy from `docs/store-listing-content.md`)
4. Upload locale-specific screenshots (same 1280×800 dimensions)
5. Click "Save" after each locale

### Step 7: Fill Out Privacy Practices Tab

1. Navigate to **Privacy Practices** tab
2. **Single purpose**: "A customizable new tab page with widgets for weather, news feeds, todos, and more"
3. **Permission justifications**: (copy from `docs/privacy-practices-cws.md`)
4. **Remote code**: Select "No, I do not use remote code"
5. **Data collection**:
   - Check: "User-provided data" (settings, feeds, todos stay on-device)
   - Certify: "I confirm extension only uses data for stated purpose" ✅
   - Certify: "I confirm extension does not sell, use for ads, or share data" ✅
6. **Privacy policy URL**: https://github.com/SysAdminDoc/Vantage/blob/main/PRIVACY.md
7. **Permissions justification**:
   ```
   storage: Store user settings, widgets, feeds, preferences locally
   alarms: Schedule clock updates, Pomodoro reminders, countdown notifications
   tabs: Detect tab blur to auto-pause Pomodoro timer
   topSites: Power Most Visited widget
   readingList: Optional integration to save headlines to Reading List
   host_permissions: Fetch user-configured RSS feeds
   ```

### Step 8: Fill Out Distribution Tab

1. **Geographic distribution**: Worldwide (unless legally restricted)
2. **Category**: Productivity or New Tab
3. **Homepage**: https://github.com/SysAdminDoc/Vantage
4. **Support URL**: https://github.com/SysAdminDoc/Vantage/issues
5. **Official URL** (optional): Verify GitHub repo ownership (via Search Console if desired)

### Step 9: Submit for Review

1. Scroll to top of Store Listing page
2. Click **"Submit for Review"** button
3. Accept final checklist (all required fields filled)
4. CWS receives submission

**Expected review time**: 24–72 hours (typically <24h for benign extensions)

### Step 10: Monitor Review Status

- **Dashboard**: "Items" tab shows status (Pending Review → In Review → Published)
- **Email**: Notifications sent on approval/rejection
- **If rejected**: CWS provides rejection reason; fix issues and resubmit

---

## Firefox Add-ons (AMO) Submission

### Step 1: Prepare Extension Package

Firefox uses the same ZIP as CWS. No conversion needed.

```bash
# Same ZIP as CWS (if you built it, it already works for Firefox)
# Verify firefox-compatible manifest:
grep -A5 "browser_specific_settings" manifest.json
# Output should show:
# "browser_specific_settings": { "gecko": { "id": "vantage@example.com", ... } }
```

### Step 2: Set Up AMO Developer Account

1. Go to https://addons.mozilla.org/developers/
2. Create Mozilla account (or log in)
3. Complete developer profile (username, email, website)
4. Accept Terms of Service

### Step 3: Create New Add-on on AMO

1. **Dashboard** → "Submit a New Add-on"
2. Choose "Continue" for self-hosted ZIP upload
3. Upload `Vantage-1.0.0.zip`
4. Mozilla validates: should pass if `browser_specific_settings.gecko.id` is present

### Step 4: Fill Out Add-on Listing

**General Details**:
- **Name**: Vantage
- **Summary**: (use short description from `docs/store-listing-content.md`)
- **Description**: (use detailed description)
- **Category**: Productivity
- **License**: MIT
- **Homepage**: https://github.com/SysAdminDoc/Vantage
- **Support email**: (your GitHub profile email)
- **Support website**: https://github.com/SysAdminDoc/Vantage/issues

**Previews**:
- Upload icon + 5 screenshots (same 1280×800 as CWS)

### Step 5: Fill Out Privacy Section

1. **Data policies**: Select "This add-on does not collect or transmit any user data"
2. **Privacy policy**: Link to https://github.com/SysAdminDoc/Vantage/blob/main/PRIVACY.md

### Step 6: Submit for Review

1. **Dashboard** → Add-on → "Submit for Review"
2. Accept Terms
3. Submit

**Expected review time**: 24–72 hours for initial review (slightly longer than CWS)

### Step 7: Monitor Status

- **Dashboard**: Shows "Awaiting Review → In Review → Approved"
- **Email**: Notifications sent on decision
- **If rejected**: Follow Mozilla's specific feedback; most common issue is clarity on data handling

---

## Microsoft Edge Add-ons Submission

### Step 1: Register Partner Center Account

1. Go to https://partner.microsoft.com/dashboard
2. Create Microsoft account (or log in with GitHub)
3. Enroll in "Microsoft Edge Program" (free)
4. Verify email

### Step 2: Create New Extension

1. **Partner Center Dashboard** → "Create new extension"
2. Fill in basic info (name, version, category)
3. Upload ZIP (same as CWS/AMO)

### Step 3: Fill Out Store Listing

- **Store listing name**: Vantage
- **Short description**: (from docs)
- **Long description**: (from docs)
- **Category**: Productivity
- **Supported languages**: English (+ es, de, fr, ja if you localize asset uploads)
- **Upload icon** + screenshots (same 1280×800)

### Step 4: Fill Out Privacy & Security

- **Privacy policy**: Link to PRIVACY.md
- **Support URL**: GitHub Issues
- **No remote code**: Declare

### Step 5: Submit

- **Partner Center** → "Submit"
- Microsoft typically approves within 24 hours

---

## Opera Add-ons Submission

### Step 1: Register on Opera Add-ons

1. Go to https://addons.opera.com
2. Click "Register" / "Sign up" (or log in if existing developer)
3. Verify email

### Step 2: Upload Extension

1. **My Extensions** → "Submit a new extension"
2. Select "Upload a ZIP file"
3. Upload `Vantage-1.0.0.zip`
4. Opera validates

### Step 3: Fill Out Store Listing

- **Name**: Vantage
- **Category**: Productivity / Productivity Tools
- **Description**: (copy from docs)
- **Version**: 1.0.0
- **Icon** + screenshots (1280×800)
- **Permissions**: Automatically parsed from manifest

### Step 4: Submit

- **My Extensions** → "Submit for review"
- Opera typically approves within 24–48 hours

---

## Post-Submission Checklist

After all submissions are approved:

- [ ] Create GitHub Release for v1.0.0
  - Attach ZIP + CRX3 file
  - Add release notes (copy from ROADMAP.md "v1.0.0" section)
  - Tag: `v1.0.0`
  
- [ ] Update README.md
  - Add CWS, AMO, Edge, Opera install badges (standard badges from shields.io or store provider)
  - Example:
    ```markdown
    [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/EXTENSION_ID)](https://chrome.google.com/webstore/detail/...)
    [![Firefox Add-ons](https://img.shields.io/amo/v/vantage)](https://addons.mozilla.org/firefox/addon/vantage/)
    ```

- [ ] Update ROADMAP.md
  - Move v1.0.0 items from "Now" to "Shipped"
  - Mark all distribution items as ✅ done

- [ ] Announce on social / GitHub
  - GitHub Releases page (will auto-notify watchers)
  - Optional: Reddit `/r/firefox`, `/r/chrome`, `/r/startpages` announcement posts

---

## Troubleshooting

### CWS Rejects: "Unclear Purpose"
**Fix**: Clarify that Vantage is a **new tab page replacement**, not a general utility. CWS requires single-purpose extensions.

### AMO Rejects: "Data Practices Unclear"
**Fix**: Explicitly state: "This add-on does not collect any user data. All settings stay on your device."

### Edge Rejects: "Missing Privacy Policy"
**Fix**: Ensure privacy policy URL is direct (no redirects). Test the link manually.

### Opera Upload Fails: "Manifest Invalid"
**Fix**: Verify Opera doesn't require special `opera_specific_settings` key. Most Chromium extensions work as-is.

---

## Support Escalation

If a store rejects Vantage and the reason is unclear:

1. **CWS**: Reply to review email with clarification; include link to WCAG audit + source code
2. **AMO**: Use Mozilla Add-ons forums or email support with detailed explanation
3. **Edge**: Contact Microsoft Edge Extensions support via Partner Center
4. **Opera**: Email Opera Add-ons team (support contact on addons.opera.com)

All stores value **clear communication** and **transparent data practices** — Vantage should pass without issues.

---

## Timeline

| Step | Time | Notes |
|---|---|---|
| Prepare assets (screenshots, icon) | 1.5d | Can parallelize with code prep |
| CWS submission + approval | 1d + 1d | Submission is 15 min; approval typically <24h |
| AMO submission + approval | 1d + 1d | Same day or next day approval |
| Edge submission + approval | 0.5d + 0.5d | Quick process, <24h review |
| Opera submission + approval | 0.5d + 0.5d | Fastest store; <24h review |
| Post-release comms | 0.5d | GitHub Release, README updates |
| **TOTAL** | **~5–6 days** | Assuming simultaneous submissions + parallel approvals |

---

**Vantage v1.0.0 Store Submission Checklist**  
*Updated 2026-05-02*

