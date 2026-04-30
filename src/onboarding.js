// Vantage — first-run setup wizard.

import { el, clear } from "./utils/dom.js";
import { iconNode } from "./icons.js";
import { geocodeCity, detectLocation } from "./utils/weather-source.js";

const PRESETS = [
  {
    id: "minimal",
    label: "Minimal",
    tagline: "Just the search bar. Distraction-free.",
    features: ["Search"],
    needsPersonalize: false,
    apply(s) {
      s.greeting.enabled   = false;
      s.clock.enabled      = false;
      s.weather.enabled    = false;
      s.airquality.enabled = false;
      s.quicklinks.enabled = false;
      s.rss.enabled        = false;
      s.news.enabled       = false;
      s.calendar.enabled   = false;
      s.pomodoro.enabled   = false;
    }
  },
  {
    id: "standard",
    label: "Standard",
    tagline: "Search, weather, and daily news.",
    features: ["Search", "Clock & greeting", "Weather", "Quick links", "News"],
    needsPersonalize: true,
    apply(s) {
      s.greeting.enabled   = true;
      s.clock.enabled      = true;
      s.weather.enabled    = true;
      s.airquality.enabled = false;
      s.quicklinks.enabled = true;
      s.rss.enabled        = false;
      s.news.enabled       = true;
      s.calendar.enabled   = false;
      s.pomodoro.enabled   = false;
    }
  },
  {
    id: "full",
    label: "Full",
    tagline: "Every widget: feeds, air quality, Pomodoro.",
    features: ["Search", "Clock & greeting", "Weather", "Air quality", "Quick links", "RSS", "News", "Pomodoro"],
    needsPersonalize: true,
    apply(s) {
      s.greeting.enabled   = true;
      s.clock.enabled      = true;
      s.weather.enabled    = true;
      s.airquality.enabled = true;
      s.quicklinks.enabled = true;
      s.rss.enabled        = true;
      s.news.enabled       = true;
      s.calendar.enabled   = false;
      s.pomodoro.enabled   = true;
    }
  }
];

/**
 * Show the setup wizard overlay.
 * @param {object} settings — current settings object (will be cloned before modification)
 * @param {(updatedSettings: object) => void} onComplete — called with the final settings
 */
export function showOnboarding(settings, onComplete) {
  let preset = PRESETS[1]; // default: Standard
  let pendingLocation = null;
  let pendingName = "";
  let step = 0;

  const overlay = el("div", {
    class: "onboard-overlay",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Vantage setup"
  });
  const card = el("div", { class: "onboard-card", tabindex: "-1" });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => card.focus());

  function stepNames() {
    return preset.needsPersonalize
      ? ["layout", "personalize", "done"]
      : ["layout", "done"];
  }

  function currentStep() {
    return stepNames()[step];
  }

  function goNext() { step++; render(); }
  function goBack() { step--; render(); }

  function render() {
    clear(card);
    const names = stepNames();

    card.appendChild(
      el("div", { class: "onboard-dots" },
        names.map((_, i) =>
          el("span", { class: `onboard-dot${i === step ? " onboard-dot--active" : ""}` })
        )
      )
    );

    const content = el("div", { class: "onboard-content" });
    card.appendChild(content);

    const s = currentStep();
    if (s === "layout")      renderLayout(content);
    else if (s === "personalize") renderPersonalize(content);
    else                     renderDone(content);
  }

  /* ---------- Step: layout ---------- */
  function renderLayout(content) {
    content.appendChild(el("div", { class: "onboard-header" }, [
      el("h2", { class: "onboard-title" }, ["Welcome to Vantage"]),
      el("p",  { class: "onboard-subtitle" }, [
        "Choose a starting layout. Everything can be changed later in settings."
      ])
    ]));

    const grid = el("div", { class: "onboard-presets" });
    for (const p of PRESETS) {
      const selected = p === preset;
      const presetCard = el("div", {
        class: `onboard-preset${selected ? " onboard-preset--selected" : ""}`,
        role: "button",
        tabindex: "0",
        "aria-pressed": String(selected),
        onClick: () => selectPreset(p),
        onKeydown: (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPreset(p); }
        }
      }, [
        el("div", { class: "onboard-preset__label" }, [p.label]),
        el("div", { class: "onboard-preset__tagline" }, [p.tagline]),
        el("ul", { class: "onboard-preset__features" },
          p.features.map(f => el("li", { class: "onboard-preset__feature" }, [f]))
        )
      ]);
      grid.appendChild(presetCard);
    }
    content.appendChild(grid);

    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--primary", onClick: goNext }, ["Next"])
    ]));
  }

  function selectPreset(p) {
    // If switching to a preset without a personalize step while currently on step > 0, reset
    if (!p.needsPersonalize && step > 0) step = 0;
    preset = p;
    render();
  }

  /* ---------- Step: personalize ---------- */
  function renderPersonalize(content) {
    content.appendChild(el("div", { class: "onboard-header" }, [
      el("h2", { class: "onboard-title" }, ["Personalize"]),
      el("p",  { class: "onboard-subtitle" }, [
        "Set your name and location for weather. Both optional — skip freely."
      ])
    ]));

    const fields = el("div", { class: "onboard-fields" });

    // Name field
    const nameInput = el("input", {
      type: "text",
      placeholder: "Your name",
      value: pendingName || settings.greeting?.name || "",
      "aria-label": "Your name for the greeting"
    });
    nameInput.addEventListener("input", () => { pendingName = nameInput.value.trim(); });
    fields.appendChild(el("div", { class: "onboard-field" }, [
      el("label", {}, [
        "Name ",
        el("span", { class: "onboard-optional" }, ["optional"])
      ]),
      nameInput
    ]));

    // Location field
    const statusEl = el("div", { class: "onboard-location-status" });
    const cityInput = el("input", {
      type: "text",
      placeholder: "City — e.g. Chicago",
      value: pendingLocation?.name || settings.weather?.location?.name || "",
      "aria-label": "City for weather"
    });
    const setBtn = el("button", {
      type: "button",
      class: "button button--small",
      onClick: () => geocodeFromInput(cityInput, statusEl)
    }, ["Set"]);
    const detectBtn = el("button", {
      type: "button",
      class: "button button--ghost button--small",
      onClick: () => detectFromGeo(cityInput, statusEl)
    }, ["Detect location"]);

    cityInput.addEventListener("keydown", e => { if (e.key === "Enter") setBtn.click(); });

    fields.appendChild(el("div", { class: "onboard-field" }, [
      el("label", {}, [
        "Weather location ",
        el("span", { class: "onboard-optional" }, ["optional"])
      ]),
      el("div", { class: "onboard-location-row" }, [cityInput, setBtn]),
      detectBtn,
      statusEl
    ]));

    content.appendChild(fields);
    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--ghost", onClick: goBack }, ["Back"]),
      el("button", { type: "button", class: "button button--primary", onClick: goNext }, ["Next"])
    ]));

    async function geocodeFromInput(input, status) {
      const q = input.value.trim();
      if (!q) return;
      status.textContent = "Looking up\u2026";
      status.className = "onboard-location-status";
      try {
        pendingLocation = await geocodeCity(q);
        input.value = pendingLocation.name;
        status.textContent = `Set to ${pendingLocation.name}`;
        status.className = "onboard-location-status onboard-location-status--ok";
      } catch (err) {
        status.textContent = err.message;
        status.className = "onboard-location-status onboard-location-status--err";
      }
    }

    async function detectFromGeo(input, status) {
      status.textContent = "Detecting\u2026";
      status.className = "onboard-location-status";
      try {
        pendingLocation = await detectLocation();
        input.value = pendingLocation.name;
        status.textContent = `Detected: ${pendingLocation.name}`;
        status.className = "onboard-location-status onboard-location-status--ok";
      } catch (err) {
        status.textContent = err.message;
        status.className = "onboard-location-status onboard-location-status--err";
      }
    }
  }

  /* ---------- Step: done ---------- */
  function renderDone(content) {
    content.appendChild(el("div", { class: "onboard-done" }, [
      el("div", { class: "onboard-done__check" }, [iconNode("check", { size: 28 })]),
      el("h2", { class: "onboard-title" }, ["You're all set!"]),
      el("p",  { class: "onboard-subtitle" }, [
        `Using the "${preset.label}" layout. Open settings anytime to add feeds, ` +
        `change your search engine, or enable more widgets.`
      ])
    ]));
    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--ghost", onClick: goBack }, ["Back"]),
      el("button", { type: "button", class: "button button--primary", onClick: finish }, ["Open Vantage"])
    ]));
  }

  /* ---------- Finish ---------- */
  function finish() {
    const s = structuredClone(settings);
    preset.apply(s);
    if (pendingName)     s.greeting.name      = pendingName;
    if (pendingLocation) s.weather.location   = pendingLocation;
    s.onboardingComplete = true;
    overlay.remove();
    onComplete(s);
  }

  render();
}
