// Vantage v1.1.0 — Speculation Rules API for hover-prefetch.
//
// `<script type="speculationrules">` is the modern replacement for
// `<link rel="prefetch">`. Chrome 109+ / Edge 109+ honor it; Firefox
// + Safari silently ignore (the spec is conservative — they parse
// the JSON without acting on it). Safe progressive enhancement.
//
// We use the document-source rule with a CSS selector so the rule
// auto-tracks our quick links without re-injecting on every layout
// change. Eagerness "moderate" triggers prefetch on hover ~200ms or
// pointerdown — feels instant on follow-through, doesn't waste
// bandwidth on accidental hovers.

const SCRIPT_ID = "vantage-speculation-rules";

const RULES = {
  prefetch: [{
    source: "document",
    where: {
      and: [
        { href_matches: "https://*/*" },
        { selector_matches: ".quicklink" }
      ]
    },
    eagerness: "moderate"
  }]
};

/** Install the speculation-rules script in the document head. Idempotent
 *  — calling repeatedly with the same config is a no-op. */
export function installSpeculationRules() {
  // Browsers without HTMLScriptElement support for the type attribute
  // will simply ignore the script tag, so no feature detect needed.
  let existing = document.getElementById(SCRIPT_ID);
  if (existing) return; // already installed
  const script = document.createElement("script");
  script.type = "speculationrules";
  script.id = SCRIPT_ID;
  script.textContent = JSON.stringify(RULES);
  document.head.appendChild(script);
}

/** Remove the speculation-rules script. Used when the user disables
 *  the feature in Settings. */
export function removeSpeculationRules() {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) existing.remove();
}

/** Convenience: apply install/remove based on a boolean flag. */
export function applySpeculationRules(enabled) {
  if (enabled) installSpeculationRules();
  else removeSpeculationRules();
}
