// Vantage v0.1.0 — search bar widget

import { el, clear } from "../utils/dom.js";
import { SEARCH_ENGINES, buildSearchUrl } from "../search-engines.js";

export function renderSearch(mount, settings, onChange) {
  clear(mount);

  const select = el("select", { class: "search-engine-select", title: "Search engine" });
  for (const [key, engine] of Object.entries(SEARCH_ENGINES)) {
    const opt = el("option", { value: key, selected: key === settings.search.engine }, [engine.name]);
    select.appendChild(opt);
  }

  const input = el("input", {
    class: "search-input",
    type: "search",
    name: "q",
    placeholder: "Search the web…",
    autocomplete: "off",
    spellcheck: false
  });

  const submit = el("button", { class: "search-submit", type: "submit" }, ["Search"]);

  const form = el("form", {
    class: "search-form",
    onSubmit: (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      const url = buildSearchUrl(select.value, query, settings.search.customUrl);
      window.location.href = url;
    }
  }, [select, input, submit]);

  select.addEventListener("change", () => {
    settings.search.engine = select.value;
    onChange?.(settings);
    input.focus();
  });

  mount.appendChild(form);

  // Autofocus input on every newtab open
  requestAnimationFrame(() => input.focus());
}
