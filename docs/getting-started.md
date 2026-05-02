---
layout: default
title: Getting started
---

# Getting started

## Install

### Chromium-based browsers (Chrome, Brave, Edge, Vivaldi, Opera)

1. Grab the latest **`Vantage-vX.Y.Z.zip`** from the
   [Releases page](https://github.com/SysAdminDoc/Vantage/releases).
2. Extract the ZIP to a permanent folder on your machine
   (don't delete it — Vantage runs from this folder until you uninstall).
3. Open `chrome://extensions` (or your browser's equivalent — `brave://extensions`,
   `edge://extensions`, `vivaldi://extensions`, etc.).
4. Toggle **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the extracted folder.
6. Open a new tab — Vantage takes over.

> **Why ZIP and "Load unpacked"?** Chromium 75+ blocks self-signed CRX
> drag-and-drop installs (`CRX_REQUIRED_PROOF_MISSING`). The CRX file in
> the release is still useful for the **enterprise force-install** path
> (see *Enterprise auto-install* below), but for individual users the
> Load-unpacked flow is the supported route.

### Firefox 109+

1. Grab the latest **`Vantage-vX.Y.Z-firefox.xpi`** from the
   [Releases page](https://github.com/SysAdminDoc/Vantage/releases).
2. Open `about:debugging#/runtime/this-firefox` and click **Load Temporary
   Add-on…**, then select the XPI.

> Firefox Release / Beta won't permanently install unsigned XPIs. For a
> permanent install, use Firefox Developer Edition / Nightly with
> `xpinstall.signatures.required = false`, the ESR enterprise policy
> path, or wait for the AMO listing.

## First run

The first time you open a new tab after install, the **first-run wizard**
walks you through three preset choices (Minimal / Standard / Full),
optional display name, and optional location for weather. You can skip
this step and configure everything later via Settings.

After the wizard you can:

- **Click the gear icon** (top-right) to open the Settings panel.
- **Click the grid icon** (top-right) to open the Widget Picker —
  per-widget on/off toggles without opening full Settings.
- **Right-click anywhere on the background** for the quick-action context
  menu (cycle theme / accent / background, customize widgets, open
  settings). Disable in Settings → Appearance if you prefer the
  browser's native menu everywhere.

## Enterprise auto-install (Windows / Chromium)

Vantage ships an Omaha update feed (`updates.xml`) at the repo root.
The included `scripts/install.ps1` writes the policy entry that
force-installs the extension on Chrome / Brave / Edge / Vivaldi / Opera /
Chromium:

```powershell
irm https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 | iex
```

The script auto-elevates and adds Vantage to
`HKLM\Software\Policies\<vendor>\<browser>\ExtensionInstallForcelist`.
`-Uninstall` removes only Vantage's entry, leaving any other forced
extensions untouched.

## Updating

- **Manual install:** download the new ZIP from Releases, replace the
  extracted folder, then click the **Reload** button on the extension
  card in `chrome://extensions`.
- **Enterprise auto-install:** browsers re-check `updates.xml` every few
  hours and pull the new CRX automatically. Restart the browser to apply.
- **Firefox:** the same XPI is served via `firefox-updates.json`; Firefox
  Developer Edition with the `update_url` honors the AMO update manifest
  on its own schedule.

## Where your data lives

Everything is stored locally:

- **`chrome.storage.local`** — settings, feed read-state, starred items,
  notes, todos, countdown events, world clocks, encrypted API key vault.
- **`chrome.storage.session`** — vault decryption cache (auto-clears on
  browser restart).
- **OPFS** (Origin Private File System) — large media (video
  backgrounds, ≥ Chrome 102 / Firefox 111 / Safari 15.2).
- **IndexedDB** — permanent feed archive (opt-in).

You can wipe all of it from `Settings → Data → Reset` or by uninstalling
the extension.
