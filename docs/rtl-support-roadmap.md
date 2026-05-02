# RTL / Bidirectional Text Support (v1.0.0 → v1.1.0 roadmap)

**Status:** Foundation laid in v1.0.0; full RTL rollout in v1.1.0+.

**Target languages:** Arabic (ar), Hebrew (he), Persian (fa), Urdu (ur) — ~1.5B+ speakers globally.

## What Is RTL?

Right-to-left (RTL) languages require text and UI elements to flow in the opposite direction:

| LTR (English, Spanish, German, French, Japanese) | RTL (Arabic, Hebrew, Persian, Urdu) |
|---|---|
| Text flows left → right | Text flows right → left |
| UI elements left-align | UI elements right-align |
| Margins/padding: `margin-left` | Margins/padding: `margin-right` (or `margin-inline-start`) |

---

## v1.0.0 Foundation

### Done ✅
- [x] i18n infrastructure supports RTL detection (`isRTL()` helper in `src/utils/i18n.js`)
- [x] Placeholder locale files for ar, he, fa, ur (will be populated in v1.1.0)
- [x] Documentation path clear

### Not Yet Done (v1.1.0+)
- [ ] CSS logical properties pass (left → inline-start, right → inline-end, etc.)
- [ ] `<html dir="rtl">` attribute set when user's locale is RTL
- [ ] Decorative backgrounds positioned for RTL (complex, lower priority)
- [ ] Screen-reader testing in Arabic/Hebrew
- [ ] Store listings updated (CWS/AMO/Edge Arabic store listing)

---

## CSS Logical Properties Mapping

**Physical (LTR-only):**
```css
margin-left: 16px;
padding-right: 8px;
left: 0;
right: 50%;
border-left: 1px solid;
```

**Logical (LTR/RTL-aware):**
```css
margin-inline-start: 16px;  /* left in LTR, right in RTL */
padding-inline-end: 8px;    /* right in LTR, left in RTL */
inset-inline-start: 0;      /* left: 0 in LTR, right: 0 in RTL */
inset-inline-end: 50%;      /* right: 50% in LTR, left: 50% in RTL */
border-inline-start: 1px solid; /* border-left in LTR, border-right in RTL */
```

---

## CSS Audit Results

### Critical UI (Must Fix for RTL)

| Element | Current | RTL Fix | Priority |
|---------|---------|---------|----------|
| Settings panel width padding | `padding-right: calc(var(--s-2) + 32px)` | `padding-inline-end` | HIGH |
| Sticky header margin | `margin-right: var(--s-1)` | `margin-inline-end` | HIGH |
| Scrollbar offset | `right: var(--s-2)` | `inset-inline-end` | HIGH |
| Border accents | `border-left: 1px solid` | `border-inline-start` | MEDIUM |
| Icon spacing | `margin-right: var(--s-2)` | `margin-inline-end` | MEDIUM |

### Decorative (Can Defer)

| Element | Current | Impact | Priority |
|---------|---------|--------|----------|
| Background celestial bodies | `left: var(--solar-x, 82%)` | Cosmetic; not UI-breaking | LOW |
| Mountains/trees positioning | `right: 2%` | Cosmetic; not UI-breaking | LOW |

**Decision:** Focus RTL on critical UI surfaces first (settings panel, headers); defer background repositioning to v1.2.0.

---

## Implementation Roadmap (v1.1.0)

### Phase 1: Enable RTL Stylesheet (1d)

1. **Audit CSS** — Find all physical properties (left/right/margin-left/padding-right/border-left)
2. **Replace critical UI** — Convert 20–30 rules to logical properties
3. **Set `dir` attribute** — When `isRTL()`, set `<html dir="rtl">`
4. **Test on RTL locale** — Chrome with ar_SA / he_IL language preference

**Output:** Vantage renders left-to-right on LTR browsers, right-to-left on RTL browsers.

### Phase 2: Translate Arabic & Hebrew (2w)

1. Populate `_locales/ar/messages.json` and `_locales/he/messages.json`
2. Community review (native Arabic/Hebrew speakers)
3. Update store listings (CWS Arabic storefront, etc.)

### Phase 3: Testing & QA (1w)

1. Screen-reader testing (NVDA on Arabic Windows)
2. Touch testing on Android (Arabic/Hebrew keyboard input)
3. Zip code / tel input validation for region-specific formats

---

## Technical Constraints

### Browser Support

| Browser | Logical Properties | `dir` Attribute | Status |
|---------|---|---|---|
| Chrome 90+ | ✅ Full support | ✅ | Fully supported |
| Firefox 87+ | ✅ Full support | ✅ | Fully supported |
| Safari 15.1+ | ✅ Full support | ✅ | Fully supported |
| Edge 90+ | ✅ Full support | ✅ | Fully supported |

**All target Chromium-based extension browsers support logical properties.**

### Fallback for Older Browsers

None needed — Vantage requires Chrome 115+ (via manifest.json). Logical properties are not a concern.

---

## Scope Limitation: Backgrounds

Background positioning is **not** being changed in v1.0.0–v1.1.0:

- ✅ Weather widget backgrounds (solid colors / gradients): auto-handled by browser
- ✅ App theming (CSS variables): fully RTL-aware
- ❌ Decorative celestial bodies (sun, moon, trees, mountains): positioned absolutely via `left:` — **NOT** flipped for RTL

**Rationale:** Backgrounds are cosmetic; fixing them requires precise x/y repositioning rules for 20+ elements. RTL users see *slightly* off-center artwork but lose no functionality.

---

## Testing Checklist (v1.1.0)

- [ ] Switch browser language to Arabic (ar-SA) → Vantage renders RTL
- [ ] Switch browser language to Hebrew (he-IL) → Vantage renders RTL
- [ ] Settings panel: labels and inputs visually right-aligned, padding correct
- [ ] Quick links: reorder handles work (drag right = reorder right in RTL context)
- [ ] Sticky header: margins and buttons positioned correctly
- [ ] Scrollbar: on left side of panels (LTR: right side; RTL: left side)
- [ ] Screen reader (NVDA Arabic): announces UI elements in correct order
- [ ] Touch input: tap targets remain accessible at 44×44px minimum

---

## Future Enhancements (v1.2.0+)

- [ ] Flip decorative backgrounds for RTL (sun/moon position swap)
- [ ] RTL-specific icons (arrow directions, etc.) — many are universal; review on demand
- [ ] Additional RTL languages (Farsi, Urdu, Pashto)
- [ ] Custom RTL modes for LTR-biased APIs (e.g., Windy map orientation)

---

*Last updated: 2026-01 — v1.0.0 foundation.*
