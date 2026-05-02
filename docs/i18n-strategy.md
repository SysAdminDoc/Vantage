# Vantage i18n — Internationalization Strategy (v1.0.0+)

**Status:** Phase 1 infrastructure ✅ complete. Phase 2 (widget conversion) in progress.

## Overview

Vantage v1.0.0 ships with internationalization infrastructure supporting English + 4 languages:
- **English (en)** — Authoritative baseline
- **Spanish (es)** — ~70% translated
- **German (de)** — ~70% translated
- **French (fr)** — ~70% translated
- **Japanese (ja)** — ~70% translated

All 5 locale files (`_locales/{en,es,de,fr,ja}/messages.json`) follow the Chrome Extension i18n format.

---

## How It Works

### For Users

1. **Automatic locale detection** — Vantage uses `chrome.i18n.getUILanguage()` to detect the user's browser language.
2. **Fallback to English** — If a translation is missing, the English version is used.
3. **Manual override** (planned v1.1.0) — Users can override their browser language in Settings → Language.

### For Developers

Every user-visible string goes through the `i18n()` helper:

```javascript
import { i18n } from "../utils/i18n.js";

const label = i18n('appName');  // Returns "Vantage"
const msg = i18n('noItems', ['bookmarks']);  // With placeholders
```

### How Messages Are Structured

```json
{
  "appName": {
    "message": "Vantage",
    "description": "The name of the application"
  },
  "noItems": {
    "message": "No $ITEM$ yet",
    "description": "Empty state for a list",
    "placeholders": {
      "item": {
        "content": "$1",
        "example": "bookmarks"
      }
    }
  }
}
```

**Key points:**
- Every message has a `"message"` (the translated string) and `"description"` (context for translators)
- Placeholders use `$KEY$` syntax in the message and `$N$` in code
- All placeholders are optional but encouraged

---

## Translation Workflow

### Phase 1: Infrastructure (✅ Complete)

- [x] Create `_locales/en/messages.json` (115 core UI strings)
- [x] Create placeholder files for es, de, fr, ja
- [x] Add `src/utils/i18n.js` helper
- [x] Document migration strategy

**Done:** 115 messages defined + 4 locales bootstrapped (~70% each).

### Phase 2: Widget Conversion (In Progress)

Systematically update Vantage files to use i18n():

**Priority 1 (HTML/Hardcoded strings):**
- [ ] `newtab.html` — aria-labels, titles (15 strings)
- [ ] `src/settings.js` — section titles, button labels, hints (40 strings)
- [ ] `src/main.js` — greeting text, toasts (10 strings)

**Priority 2 (Widget rendering):**
- [ ] `src/widgets/weather.js` — condition names, units
- [ ] `src/widgets/clock.js` — greeting slots
- [ ] `src/widgets/quote.js` — attribution
- [ ] `src/widgets/feeds.js` — "Feed" label, empty state
- [ ] `src/widgets/quicklinks.js` — "Quick links" label
- [ ] `src/widgets/bookmarks.js` — "Bookmarks" label

**Priority 3 (Optional UI strings):**
- [ ] Error messages, toasts, confirmations
- [ ] Tooltips and hints
- [ ] Help text

### Phase 3: Community Translation (v1.0.1+)

1. **Weblate setup** (or GitHub PR pipeline)
   - Import `_locales/en/messages.json` as source
   - Invite translators for es, de, fr, ja
   - Target: 95%+ completion per language before inclusion

2. **Review & QA**
   - Native speakers validate translations
   - RTL languages tested (ar, he planned for v1.1.0)
   - String length OK (no UI breaking)

3. **Release cycle**
   - Merge translations every 2 weeks
   - Tag release with language progress
   - Announce new languages in CHANGELOG

---

## Migration Guide for Contributors

### Adding a New Translatable String

1. **Identify the string** in source code:
   ```javascript
   toast('Link added successfully');
   ```

2. **Add to `_locales/en/messages.json`:**
   ```json
   "linkAdded": {
     "message": "Link added successfully",
     "description": "Toast after successfully adding a quick link"
   }
   ```

3. **Update the source code** to use i18n():
   ```javascript
   import { i18n } from "../utils/i18n.js";
   toast(i18n('linkAdded'));
   ```

4. **Update translation files** (en only for now; translators handle the rest):
   - Run: `node scripts/i18n-sync.mjs` (TBD) to auto-sync en to all locales
   - Translators will fill in translations

### Placeholder Usage

If a string has dynamic content:

1. **Define with placeholders in en/messages.json:**
   ```json
   "itemRemoved": {
     "message": "Removed \"$ITEM$\"",
     "description": "Toast after removing an item",
     "placeholders": {
       "item": {
         "content": "$1",
         "example": "GitHub"
       }
     }
   }
   ```

2. **Use in code:**
   ```javascript
   toast(i18n('itemRemoved', ['GitHub']));
   ```

The Chrome i18n API will substitute `$1` with the first argument.

---

## File Structure

```
Vantage/
├── _locales/
│   ├── en/
│   │   └── messages.json       ← Authoritative (115 strings)
│   ├── es/
│   │   └── messages.json       ← ~70% translated (80 strings)
│   ├── de/
│   │   └── messages.json       ← ~70% translated (78 strings)
│   ├── fr/
│   │   └── messages.json       ← ~70% translated (76 strings)
│   └── ja/
│       └── messages.json       ← ~70% translated (74 strings)
├── src/
│   └── utils/
│       └── i18n.js             ← Helper functions
├── newtab.html
├── manifest.json               ← (unchanged)
└── ...
```

---

## Key Constraints & Notes

### 1. English is Authoritative

All strings are authored in English (`_locales/en/messages.json`). Other locales follow.

**Never** edit es/de/fr/ja directly during development. Use Weblate or PR-based workflow for translations.

### 2. Placeholder Syntax Limitation

Chrome's i18n API placeholders use `$1`, `$2`, etc. (positional). **Named placeholders are not supported.** Always pass values as an array:

```javascript
// ✅ Correct
i18n('noItems', ['bookmarks'])  // → "No bookmarks yet"

// ❌ Wrong (named placeholders not supported)
// i18n('noItems', { item: 'bookmarks' })
```

### 3. Dynamic Content is Not Translatable

If a string is 100% dynamic (e.g., a hostname or URL), it's not translatable. Only translate static parts:

```javascript
// ❌ Not translatable (dynamic)
const msg = `Visit ${hostname}`;

// ✅ Translatable (static parts extracted)
const msg = i18n('visitSite', [hostname]);
// messages.json: "visitSite": "Visit $SITE$"
```

### 4. RTL Support (v1.1.0)

Arabic, Hebrew, and Persian text flow right-to-left. Layout CSS will use logical properties (`margin-inline-start`, etc.) in v1.0.0; i18n will set `<html dir="rtl">` in v1.1.0.

For now, all text is LTR. RTL testing deferred to v1.1.0.

---

## Completeness & Quality Gates

### v1.0.0 (Current)

- ✅ English baseline: 115 messages (100%)
- ✅ Spanish: ~70% (80 messages) — enough for store listing
- ✅ German: ~70% (78 messages)
- ✅ French: ~70% (76 messages)
- ✅ Japanese: ~70% (74 messages)

**Threshold met:** 95% not required until v1.0.1; v1.0.0 is "partial i18n ready."

### v1.0.1 (Planned)

- [ ] All messages in all locales: 95%+ coverage
- [ ] Native-speaker review (Spanish, German, French, Japanese)
- [ ] RTL testing (Arabic, Hebrew) deferred to v1.1.0

---

## Tools & Resources

### For Translators (Weblate/GitHub)

- **English baseline:** See `_locales/en/messages.json`
- **Context:** Read the `"description"` field for each message
- **Examples:** Look at `"example"` fields in placeholders
- **Guidelines:** Keep tone consistent with Vantage's voice (casual, friendly, clear)

### For Developers

- Chrome i18n API: https://developer.chrome.com/docs/extensions/reference/i18n/
- Message format spec: https://developer.chrome.com/docs/extensions/reference/i18n/#messages
- Placeholder syntax: https://developer.chrome.com/docs/extensions/reference/i18n/#placeholders

---

## Maintenance

### Quarterly Sync

Run `scripts/i18n-sync.mjs` to:
- Check for new English strings not yet in other locales
- Flag untranslated placeholders
- Auto-populate English fallbacks in missing translations

### Before Each Release

1. Update `_locales/en/messages.json` with any new strings
2. Run sync script
3. Invite translators to update other locales
4. Document translation coverage in CHANGELOG

---

## Future Enhancements (v1.1.0+)

- [ ] RTL language support (Arabic, Hebrew, Persian, Urdu)
- [ ] Manual language picker in Settings (vs. auto-detect only)
- [ ] Plural forms handling (`chrome.i18n.getMessage()` doesn't support plurals; use helper)
- [ ] Dialect variants (pt-BR, zh-CN, es-MX)
- [ ] Transifex or Crowdin integration (vs. Weblate)

---

*Last updated: 2026-01 — v1.0.0 baseline infrastructure.*
