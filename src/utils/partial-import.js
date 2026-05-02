// Vantage — partial settings-restore dialog.
//
// Auto-applying every imported setting wholesale is a real footgun:
//
//   1. nightTab v7.3 ship users specifically asked for "let me pick what
//      to restore" because they had been wiped out by accidental imports.
//   2. The Q1 security audit flagged the URL-hash #import= path as a
//      strong UI-control / network-beacon primitive — a malicious link
//      could overwrite customCSS, customUrl, feeds, etc., on click.
//
// This dialog runs BEFORE the merged settings are saved. The user picks
// which top-level sections to overwrite from the import; everything else
// stays on the current values.
//
// Usage:
//   const merged = await showPartialImportDialog(current, imported, source);
//   if (!merged) return; // user canceled
//   await saveSettings(merged);
//
// `source` is a short label ("vantage-settings-2026-04-30.json", "shared
// link") used in the dialog header so users know what they're applying.

import { el, clear } from "./dom.js";

// Detect and summarize nightTab backup format.
// nightTab stores settings under root.nightTab.data (v7.x structure).
// This detection runs before the section-checklist restore dialog to surface
// migration mapping to users (nightTab is abandoned since Oct 2021, 2,032★).
function detectNightTabBackup(imported) {
  if (!imported || typeof imported !== "object") return null;
  
  // nightTab v7.x structure: root.nightTab.data contains the actual settings
  const nightTabData = imported.nightTab?.data;
  if (!nightTabData || typeof nightTabData !== "object") return null;
  
  // Looks like nightTab! Extract mappings.
  const mapping = {
    greeting: nightTabData.name || "(no name set)",
    theme: nightTabData.theme === "dark" ? "Mocha" : nightTabData.theme === "light" ? "Latte" : "Custom",
    links: Array.isArray(nightTabData.links) ? nightTabData.links.length : 0,
    feeds: Array.isArray(nightTabData.feeds) ? nightTabData.feeds.length : 0
  };
  
  return mapping;
}

// Show nightTab migration summary panel before the standard import dialog.
// Returns the original imported object so the caller can proceed with the normal flow.
function showNightTabMigrationSummary(mapping) {
  return new Promise((resolve) => {
    const dialog = el("div", { class: "import-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "nighttab-title" });
    const backdrop = el("div", { class: "import-dialog__backdrop" });
    
    const close = (result) => {
      document.removeEventListener("keydown", onEscape);
      backdrop.remove();
      dialog.remove();
      resolve(result);
    };
    const onEscape = (e) => { if (e.key === "Escape") close(false); };
    document.addEventListener("keydown", onEscape);
    backdrop.addEventListener("click", () => close(false));
    
    const header = el("header", { class: "import-dialog__header" }, [
      el("h2", { id: "nighttab-title" }, ["nightTab detected!"]),
      el("p", {}, ["Your backup looks like nightTab v7. Here's what will be imported:"])
    ]);
    
    const list = el("div", { class: "import-dialog__sections" }, [
      el("div", { class: "import-dialog__section", style: "cursor: default; border: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface0) 20%, transparent);" }, [
        el("div", { class: "import-dialog__section-text" }, [
          el("span", { class: "import-dialog__section-title" }, ["Display name"]),
          el("span", { class: "import-dialog__section-hint" }, [mapping.greeting])
        ])
      ]),
      el("div", { class: "import-dialog__section", style: "cursor: default; border: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface0) 20%, transparent);" }, [
        el("div", { class: "import-dialog__section-text" }, [
          el("span", { class: "import-dialog__section-title" }, ["Theme"]),
          el("span", { class: "import-dialog__section-hint" }, [mapping.theme])
        ])
      ]),
      el("div", { class: "import-dialog__section", style: "cursor: default; border: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface0) 20%, transparent);" }, [
        el("div", { class: "import-dialog__section-text" }, [
          el("span", { class: "import-dialog__section-title" }, ["Quick links"]),
          el("span", { class: "import-dialog__section-hint" }, [`${mapping.links} links ready to migrate`])
        ])
      ]),
      el("div", { class: "import-dialog__section", style: "cursor: default; border: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface0) 20%, transparent);" }, [
        el("div", { class: "import-dialog__section-text" }, [
          el("span", { class: "import-dialog__section-title" }, ["Feeds"]),
          el("span", { class: "import-dialog__section-hint" }, [`${mapping.feeds} feed(s) found`])
        ])
      ])
    ]);
    
    const actions = el("footer", { class: "import-dialog__actions" }, [
      el("span", { class: "import-dialog__spacer" }),
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => close(false)
      }, ["Cancel"]),
      el("button", {
        type: "button",
        class: "button button--primary",
        onClick: () => close(true)
      }, ["Continue →"])
    ]);
    
    dialog.appendChild(header);
    dialog.appendChild(list);
    dialog.appendChild(actions);
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
    
    requestAnimationFrame(() => {
      actions.querySelector(".button--primary").focus();
    });
  });
}

// Top-level setting keys → human-friendly section. Keys are grouped so
// related state moves as a unit (you don't typically want "import
// quicklinks but not their groups", for example).
const SECTIONS = [
  {
    id: "appearance",
    title: "Theme & appearance",
    hint: "Theme, accent, custom CSS, scenery, background settings.",
    keys: ["theme", "accent", "customCSS", "appearance", "background"]
  },
  {
    id: "greeting",
    title: "Greeting & clock",
    hint: "Display name, birthday, custom greetings, clock format.",
    keys: ["greeting", "clock"]
  },
  {
    id: "search",
    title: "Search",
    hint: "Active engine + custom URL.",
    keys: ["search"]
  },
  {
    id: "weather",
    title: "Weather & air quality",
    hint: "Location, units, air-quality settings.",
    keys: ["weather", "airquality"]
  },
  {
    id: "links",
    title: "Quick links & top sites",
    hint: "Pinned links, link groups, items-per-row, top-sites toggle.",
    keys: ["quicklinks", "topsites"]
  },
  {
    id: "reading",
    title: "Reading panels",
    hint: "RSS feeds, News feeds, calendar feeds, embeds, filter rules.",
    keys: ["rss", "news", "calendar", "embeds", "feedFilters", "windy"]
  },
  {
    id: "productivity",
    title: "Productivity widgets",
    hint: "To-do, notes, bookmarks, pomodoro, countdown, converter.",
    keys: ["todo", "notes", "bookmarks", "pomodoro", "countdown", "converter"]
  },
  {
    id: "info",
    title: "Information widgets",
    hint: "Crypto, GitHub, photo, quote, world clocks.",
    keys: ["crypto", "github", "photo", "quote", "worldclock"]
  },
  {
    id: "workspace",
    title: "Layout & workspaces",
    hint: "Panel order, workspace profiles, Firefox container mappings.",
    keys: ["layout", "workspaces", "containerMap"]
  }
];

const ALL_KEYS = new Set(SECTIONS.flatMap(s => s.keys));

/**
 * Render the partial-import dialog. Returns a Promise that resolves to
 * a merged settings object the caller should save, or `null` if the
 * user canceled.
 *
 * @param {object} current   The currently-active settings (will be mostly
 *                           preserved, with selected sections overwritten).
 * @param {object} imported  The normalized imported settings.
 * @param {string} source    Short label shown in dialog header.
 * @returns {Promise<object|null>}
 */
export function showPartialImportDialog(current, imported, source) {
  return new Promise(async (resolve) => {
    // Check for nightTab backup and show migration summary if detected.
    const nightTabMapping = detectNightTabBackup(imported);
    if (nightTabMapping) {
      const shouldContinue = await showNightTabMigrationSummary(nightTabMapping);
      if (!shouldContinue) {
        resolve(null);
        return;
      }
    }
    // Detect which sections have anything DIFFERENT in imported. Sections
    // that are byte-identical to current are pre-unchecked because there's
    // nothing to restore there. Secret-only diffs (apiKey/nasaKey blanked
    // by export's stripSecrets) are normalised to current's values before
    // diffing — otherwise re-importing your own export looks like the
    // info section "changed" when in reality only the export-scrub did.
    const importedForDiff = JSON.parse(JSON.stringify(imported || {}));
    for (const [section, field] of PRESERVE_IF_IMPORTED_EMPTY) {
      const v = importedForDiff?.[section]?.[field];
      if ((v === "" || v == null) && current?.[section]) {
        importedForDiff[section] = importedForDiff[section] || {};
        importedForDiff[section][field] = current[section][field] || "";
      }
    }
    const sectionDiffers = new Map();
    for (const sec of SECTIONS) {
      const diffs = sec.keys.some(k => !shallowEqual(current?.[k], importedForDiff?.[k]));
      sectionDiffers.set(sec.id, diffs);
    }

    const checkboxes = new Map();
    const dialog = el("div", { class: "import-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "import-dialog-title" });
    const backdrop = el("div", { class: "import-dialog__backdrop" });

    const close = (result) => {
      document.removeEventListener("keydown", onEscape);
      backdrop.remove();
      dialog.remove();
      resolve(result);
    };
    const onEscape = (e) => { if (e.key === "Escape") close(null); };
    document.addEventListener("keydown", onEscape);
    backdrop.addEventListener("click", () => close(null));

    const header = el("header", { class: "import-dialog__header" }, [
      el("h2", { id: "import-dialog-title" }, ["Choose what to import"]),
      el("p", {}, [`From ${source}. Unchecked sections keep your current values.`])
    ]);

    // Surface keys in the imported payload that aren't covered by any
    // known section. These are usually fields from a newer version of
    // Vantage (e.g. someone exporting from v1.2 importing into v1.1)
    // or the `notifiedUrls` LRU and other private state that isn't
    // worth showing in the section list. We list them as a heads-up
    // so the user knows the backup is a strict superset of what we
    // can restore — the fields stay in storage, we just won't
    // overwrite them.
    //
    // Uses `chrome.storage.local.getKeys()` (Chrome 132+) when
    // available to also flag keys that exist in current storage but
    // aren't in the imported payload (downgrade scenario). Graceful
    // no-op on Firefox / older Chrome — the section-level diff is
    // already sufficient for the normal case.
    const importedTopKeys = new Set(Object.keys(imported || {}));
    const unknownInImport = [...importedTopKeys].filter(k => !ALL_KEYS.has(k) && k !== "schemaVersion");
    let extraNote = null;
    if (unknownInImport.length) {
      extraNote = el("p", { class: "import-dialog__extra-note" }, [
        `Heads up: the import has ${unknownInImport.length} key${unknownInImport.length === 1 ? "" : "s"} (${unknownInImport.slice(0, 4).join(", ")}${unknownInImport.length > 4 ? "…" : ""}) outside the sections above — usually from a newer version of Vantage. They'll be left untouched in your storage.`
      ]);
    }

    // Optional getKeys() probe — if supported, additionally flag keys
    // currently in storage that the import doesn't include. Useful for
    // diagnosing "I imported but my X is gone" reports — they're not
    // gone, the import just didn't carry them and we kept the existing
    // values per the section-level merge.
    try {
      const sa = globalThis.chrome?.storage?.local;
      if (sa?.getKeys) {
        const liveKeys = await sa.getKeys();
        const settingsBlob = liveKeys.find(k => k === "vantageSettings");
        if (settingsBlob) {
          const currentTopKeys = new Set(Object.keys(current || {}));
          const missingInImport = [...currentTopKeys].filter(k => !importedTopKeys.has(k) && !ALL_KEYS.has(k));
          if (missingInImport.length && extraNote) {
            extraNote.appendChild(el("br"));
            extraNote.appendChild(document.createTextNode(
              ` ${missingInImport.length} private key${missingInImport.length === 1 ? "" : "s"} only on this device (${missingInImport.slice(0, 3).join(", ")}${missingInImport.length > 3 ? "…" : ""}) will stay.`
            ));
          }
        }
      }
    } catch { /* getKeys not supported — no-op */ }

    const list = el("div", { class: "import-dialog__sections" });
    for (const sec of SECTIONS) {
      const differs = sectionDiffers.get(sec.id);
      const cb = el("input", {
        type: "checkbox",
        id: `import-${sec.id}`,
        checked: differs,
        disabled: !differs
      });
      checkboxes.set(sec.id, cb);
      const labelText = differs ? sec.title : `${sec.title} (no changes)`;
      list.appendChild(el("label", { class: "import-dialog__section", htmlFor: `import-${sec.id}` }, [
        cb,
        el("div", { class: "import-dialog__section-text" }, [
          el("span", { class: "import-dialog__section-title" }, [labelText]),
          el("span", { class: "import-dialog__section-hint" }, [sec.hint])
        ])
      ]));
    }

    // Quick toggles
    const selectAll = (checked) => {
      for (const sec of SECTIONS) {
        const cb = checkboxes.get(sec.id);
        if (sectionDiffers.get(sec.id)) cb.checked = checked;
      }
    };

    const actions = el("footer", { class: "import-dialog__actions" }, [
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => selectAll(true)
      }, ["Select all"]),
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => selectAll(false)
      }, ["Select none"]),
      el("span", { class: "import-dialog__spacer" }),
      el("button", {
        type: "button",
        class: "button button--ghost",
        onClick: () => close(null)
      }, ["Cancel"]),
      el("button", {
        type: "button",
        class: "button button--primary",
        onClick: () => {
          const merged = applySelected(current, imported, checkboxes);
          close(merged);
        }
      }, ["Apply selected"])
    ]);

    dialog.appendChild(header);
    dialog.appendChild(list);
    if (extraNote) dialog.appendChild(extraNote);
    dialog.appendChild(actions);

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);

    // Focus the first checkbox so keyboard users land in the live region.
    requestAnimationFrame(() => {
      const firstActive = [...checkboxes.values()].find(cb => !cb.disabled);
      (firstActive || actions.querySelector("button")).focus();
    });
  });
}

// Fields that are intentionally cleared by the export/share scrub
// (stripSecrets in settings.js). When the user re-imports their own
// export onto the same device, we want the imported value to win for
// everything EXCEPT these — re-importing should never wipe an API key
// the user is currently using just because the export form had it
// blanked out for sharing safety.
const PRESERVE_IF_IMPORTED_EMPTY = [
  ["crypto", "apiKey"],
  ["photo",  "nasaKey"]
];

function applySelected(current, imported, checkboxes) {
  // Start with a clone of current so unchecked sections are preserved.
  const merged = JSON.parse(JSON.stringify(current));
  for (const sec of SECTIONS) {
    const cb = checkboxes.get(sec.id);
    if (!cb || !cb.checked) continue;
    for (const key of sec.keys) {
      if (key in imported) {
        merged[key] = JSON.parse(JSON.stringify(imported[key]));
      }
    }
  }
  // Carry secrets forward from current when the imported payload had
  // them blanked. Closes the round-trip footgun: export -> import on
  // same device must not wipe live API keys.
  for (const [section, field] of PRESERVE_IF_IMPORTED_EMPTY) {
    const importedSection = imported?.[section];
    const importedHasKey = importedSection && typeof importedSection === "object";
    const importedVal = importedHasKey ? importedSection[field] : undefined;
    const importedIsEmpty = importedVal === "" || importedVal == null;
    if (importedIsEmpty && current?.[section] && merged[section]) {
      merged[section][field] = current[section][field] || "";
    }
  }
  // Top-level keys that aren't covered by any section (e.g. onboardingComplete)
  // are kept from current — never overwritten by import. This is intentional:
  // import shouldn't reset onboarding state.
  return merged;
}

function shallowEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return false;
  if (typeof a !== "object") return false;
  // Stringify is fine here — settings are plain JSON-shaped data and
  // sections are small; we don't need a hot-path deep-equal.
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
