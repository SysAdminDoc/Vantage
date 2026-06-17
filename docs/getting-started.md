---
layout: default
title: Getting started
---

# Getting started

## Install

### Chromium-based browsers (Chrome, Brave, Edge, Vivaldi, Opera)

Recommended on Windows:

```powershell
irm https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 | iex
```

The installer downloads the latest release ZIP, extracts it to
`%LOCALAPPDATA%\Vantage\extension`, and adds a persistent
`--load-extension="<path>"` launch flag to selected Chromium browser shortcuts.
Re-run the same command to update. Use `-Verify` to inspect shortcuts and
`-Uninstall` to remove the launch flag and local files.

Manual install on any OS:

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
> drag-and-drop installs (`CRX_REQUIRED_PROOF_MISSING`). Modern Chromium
> browsers also filter self-hosted CRX URLs out of `ExtensionInstallForcelist`;
> Chrome Web Store IDs are the only reliable force-install target for that
> policy path. The release CRX is a secondary asset for Vivaldi and compatible
> Chromium forks that still accept self-signed packages.

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

## Local Source Testing

From a checkout, build a runtime-only unpacked folder:

```powershell
.\scripts\build-unpacked.ps1
```

Then load `dist\unpacked-chromium` with **Load unpacked**. For Firefox source
testing, run:

```powershell
.\scripts\build-unpacked.ps1 -Target firefox
```

and select `dist\unpacked-firefox\manifest.json` from
`about:debugging#/runtime/this-firefox`.

## Updating

- **Manual install:** download the new ZIP from Releases, replace the
  extracted folder, then click the **Reload** button on the extension
  card in `chrome://extensions`.
- **Shortcut installer:** re-run the PowerShell installer; it downloads the
  current release ZIP, replaces the local extension folder, and preserves the
  shortcut launch flags.
- **Firefox:** download the new XPI and repeat the temporary install step.
  AMO-signed or enterprise-managed Firefox installs update through their
  configured signed package channel.

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
