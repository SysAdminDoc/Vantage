---
layout: default
title: FAQ
---

# Frequently asked questions

## Privacy

**Does Vantage send my data anywhere?** No analytics, no error reporting,
no auto-update server, no usage telemetry. The only outbound calls are
the ones you ask for — see the
[Privacy Table]({{ "/privacy-practices-cws.html" | relative_url }})
for every endpoint.

**Where do my settings live?** Locally, in `chrome.storage.local`.
Some larger media (video backgrounds) lives in OPFS. The opt-in
permanent feed archive lives in IndexedDB. None of it is uploaded
anywhere.

**Can I sync across devices?** Yes — Settings → Data → "Sync via GitHub
Gist" creates a public, anonymous Gist (no GitHub account required) and
returns a URL you paste on the second device's import flow. Secrets
(API keys, encrypted vault) are stripped from the Gist payload — you
re-enter them on the destination device. The "Copy share link" button
does the same as a fragment URL (`#import=base64...`).

**What about the encrypted API key vault?** Optional. Settings →
Security. AES-GCM-256 + PBKDF2 (600k iterations, SHA-256, 16-byte
salt, 12-byte IV). Decryption happens once per browser session; the
derived key lives in `chrome.storage.session` (auto-clears on
restart). Lose the passphrase, lose the keys — there's no recovery
because there's no server.

## Permissions

**Why does Vantage ask for `*://*/*`?** So you can add arbitrary RSS /
Atom / JSON Feed URLs. Without a wildcard host permission, every new
feed URL would prompt the user for a per-host grant. The Privacy
Table documents every concrete endpoint Vantage actually uses.

**Why does the install prompt list `bookmarks`, `topSites`, and
`readingList`?** They power the Bookmarks panel (`chrome.bookmarks`),
the Top Sites panel (`chrome.topSites`), and the Save-to-Reading-list
hover-action on feed items (`chrome.readingList`, Chrome 120+). Disable
those widgets if you don't want them — Vantage never reads from those
APIs unless the corresponding panel is enabled.

**`history` is in the `optional_permissions` block** — it's only
requested when you flip Settings → History search → Enable, which
fires `chrome.permissions.request()` and shows the browser's native
grant dialog. Disabling the toggle revokes the permission via
`chrome.permissions.remove()`.

## Data export / import

**Can I export my entire setup?** Settings → Data → "Export settings
as JSON". You get a single JSON file with every setting except secrets
(API keys + encrypted vault are scrubbed). Re-import via the same
section's "Import from JSON" button, which routes through a
section-checklist dialog so you can pick which sections to restore.

**Can I export just one widget?** Settings → Data → "Per-widget
clipboard export". 17 widget configs in a checkbox grid; "Copy
selected" emits a `{vantageSettings:1, partial:{...}}` envelope to the
clipboard that the standard import flow auto-unwraps.

**Per-workspace export?** Settings → Workspaces — every row has a
share-icon button that copies a `{vantageWorkspace:1, workspace:{...}}`
envelope. The "Import workspace" button accepts that envelope and
appends it as a new workspace with a fresh id and `(imported)` suffix.

## Storage

**How big can a video background be?** 50 MB on browsers that ship
OPFS (Chrome 102+, Firefox 111+, Safari 15.2+). 8 MB on older
browsers (data-URL fallback within the `chrome.storage.local` budget).

**The feed archive is opt-in. Why?** IndexedDB has no soft 5 MB cap, so
the archive grows over time. Settings → Feed archive lets you cap it
(default 10,000 items, range 100–100,000); old entries are pruned
probabilistically (~4% of renders) to keep search latency snappy.

**Can I clear the favicon cache?** Settings → Data → "Clear cache".
Cache TTL is 30 days.

## Stores

**Why is Vantage not on the Chrome Web Store yet?** v1.0.0 shipped
all the distribution infrastructure (privacy practices doc, store
listings in 5 languages, formal Privacy Policy, submission guide).
The submission itself is in progress; releases will continue via
GitHub in parallel. Manual install via "Load unpacked" works
identically.

**AMO / Microsoft Edge Add-ons / Opera Add-ons / Samsung Internet?**
Same submission pipeline — each store accepts the same ZIP package
plus a manifest tweak. Tracked in the
[ROADMAP](https://github.com/SysAdminDoc/Vantage/blob/main/ROADMAP.md).

## Development

**Can I read the source?** Yes — Vantage ships **without a build
step**, by design. Open the `src/` folder and read every line. The
exact files in the release ZIP are the ones in the repo. There is no
minified bundle.

**How do I run from source for development?** `git clone`, then "Load
unpacked" against the cloned folder. Reload the extension in
`chrome://extensions` after every code change.

**Can I write a third-party widget?** v1.0.0 shipped a frozen
[postMessage protocol]({{ "/widget-api.html" | relative_url }}) for
iframe-sandboxed third-party widgets. The host runtime that *consumes*
that protocol is on the v1.2 roadmap.

## Theming

**Where do the color palettes come from?** [Catppuccin](https://catppuccin.com/) —
five flavors (System / Mocha / Macchiato / Frappé / Latte). Plus 9
accent colors and a hex picker for custom.

**Can I write custom CSS?** Settings → Appearance → Custom CSS — live
textarea, applied via injected `<style>`. Stored in
`chrome.storage.local`.

**Can I change the icon roundness on quick links?** Settings → Quick
links → Icon shape — Square / Rounded / Circle.

## Bugs / feedback

[GitHub Issues](https://github.com/SysAdminDoc/Vantage/issues) is the
canonical place. The "Copy debug log" button in Settings → Data
copies the local error ring buffer as a markdown-fenced, control-char-
stripped block — paste that into the issue and you're 80% of the way
to a reproducible report.
