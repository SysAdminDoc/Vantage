// Vantage — first-run setup wizard.

import { el, clear } from "./utils/dom.js";
import { iconNode } from "./icons.js";
import { geocodeCity, detectLocation } from "./utils/weather-source.js";

const PRESETS = [
  {
    id: "minimal",
    label: "Focused",
    tagline: "Search, quick links, and two panels.",
    features: ["Private search", "Quick links", "Two reading panels"],
    needsPersonalize: true,
    apply(s) {
      s.greeting.enabled   = true;
      s.clock.enabled      = true;
      s.weather.enabled    = false;
      s.airquality.enabled = false;
      s.quicklinks.enabled = true;
      s.rss.enabled        = true;
      s.news.enabled       = true;
      s.calendar.enabled   = false;
      s.pomodoro.enabled   = false;
    }
  },
  {
    id: "standard",
    label: "Balanced",
    tagline: "Three panels for more context.",
    features: ["Private search", "Greeting", "Weather", "Quick links", "Three panels"],
    needsPersonalize: true,
    apply(s) {
      s.greeting.enabled   = true;
      s.clock.enabled      = true;
      s.weather.enabled    = true;
      s.airquality.enabled = false;
      s.quicklinks.enabled = true;
      s.rss.enabled        = true;
      s.news.enabled       = true;
      s.calendar.enabled   = true;
      s.pomodoro.enabled   = false;
    }
  },
  {
    id: "full",
    label: "Expanded",
    tagline: "Four panels for power users.",
    features: ["Private search", "Weather", "Air quality", "Feeds", "Pomodoro"],
    needsPersonalize: true,
    apply(s) {
      s.greeting.enabled   = true;
      s.clock.enabled      = true;
      s.weather.enabled    = true;
      s.airquality.enabled = true;
      s.quicklinks.enabled = true;
      s.rss.enabled        = true;
      s.news.enabled       = true;
      s.calendar.enabled   = true;
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
  const previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

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

  // Focus trap for modal a11y conformance.
  const onKeydown = (e) => {
    if (e.key !== "Tab") return;
    const focusable = card.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", onKeydown);

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
      el("div", { class: "onboard-progress" }, [
        el("span", { class: "onboard-progress__label" }, ["First-time setup"]),
        el("span", { class: "onboard-progress__step" }, [`Step ${step + 1} of ${names.length}`]),
        el("span", { class: "onboard-progress__rule", "aria-hidden": "true" })
      ])
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
      el("h2", { class: "onboard-title" }, ["Choose your layout"]),
      el("p",  { class: "onboard-subtitle" }, [
        "Pick a starting point. You can change this anytime."
      ])
    ]));

    const grid = el("div", {
      class: "onboard-presets",
      role: "radiogroup",
      "aria-label": "Choose a starting layout"
    });
    for (const p of PRESETS) {
      const selected = p === preset;
      const presetCard = el("button", {
        type: "button",
        class: `onboard-preset${selected ? " onboard-preset--selected" : ""}`,
        role: "radio",
        "aria-checked": String(selected),
        "data-preset": p.id,
        onClick: () => selectPreset(p),
        onKeydown: (e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
          const current = PRESETS.indexOf(preset);
          preset = PRESETS[(current + delta + PRESETS.length) % PRESETS.length];
          render();
          requestAnimationFrame(() => {
            card.querySelector(`.onboard-preset[data-preset="${preset.id}"]`)?.focus({ preventScroll: true });
          });
        }
      }, [
        renderPresetPreview(p.id),
        el("div", { class: "onboard-preset__label" }, [p.label]),
        el("div", { class: "onboard-preset__tagline" }, [p.tagline]),
        el("span", { class: "onboard-preset__radio", "aria-hidden": "true" })
      ]);
      grid.appendChild(presetCard);
    }
    content.appendChild(grid);

    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--ghost", onClick: skipSetup }, ["Skip setup"]),
      el("button", { type: "button", class: "button button--primary", onClick: goNext }, [
        "Next",
        iconNode("arrow-right", { size: 14 })
      ])
    ]));
  }

  function renderPresetPreview(id) {
    const count = id === "minimal" ? 2 : id === "standard" ? 3 : 4;
    return el("div", {
      class: `onboard-preset__preview onboard-preset__preview--${id}`,
      "aria-hidden": "true"
    }, [
      el("span", { class: "onboard-preset__preview-search" }),
      el("span", { class: "onboard-preset__preview-grid" },
        Array.from({ length: count }, () => el("span", {}))
      )
    ]);
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
        "Add a greeting name and a weather city. Leave either blank to start clean."
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
    const statusEl = el("div", { class: "onboard-location-status", role: "status", "aria-live": "polite" });
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
      class: "button button--ghost button--small onboard-detect-btn",
      onClick: () => detectFromGeo(cityInput, statusEl)
    }, [iconNode("globe", { size: 14 }), "Detect location"]);

    cityInput.addEventListener("keydown", e => { if (e.key === "Enter") setBtn.click(); });

    fields.appendChild(el("div", { class: "onboard-field" }, [
      el("label", {}, [
        "Weather location ",
        el("span", { class: "onboard-optional" }, ["optional"])
      ]),
      el("div", { class: "onboard-location-row" }, [cityInput, setBtn]),
      el("div", { class: "onboard-location-actions" }, [detectBtn]),
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
      setLocationBusy(true, "Looking up...");
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
      } finally {
        setLocationBusy(false);
      }
    }

    async function detectFromGeo(input, status) {
      setLocationBusy(true, "Detecting...");
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
      } finally {
        setLocationBusy(false);
      }
    }

    function setLocationBusy(isBusy, label = "") {
      setBtn.disabled = isBusy;
      detectBtn.disabled = isBusy;
      cityInput.setAttribute("aria-busy", String(isBusy));
      if (isBusy) statusEl.textContent = label;
    }
  }

  /* ---------- Step: done ---------- */
  function renderDone(content) {
    content.appendChild(el("div", { class: "onboard-done" }, [
      el("div", { class: "onboard-done__check" }, [iconNode("check", { size: 28 })]),
      el("h2", { class: "onboard-title" }, ["All set. You're ready."]),
      el("p",  { class: "onboard-subtitle" }, [
        "Your preferences are saved locally on this device. Everything stays private."
      ])
    ]));
    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--primary onboard-launch-btn", onClick: finish }, [
        "Open Vantage",
        iconNode("external", { size: 14 })
      ])
    ]));
  }

  /* ---------- Finish ---------- */
  function skipSetup() {
    const s = structuredClone(settings);
    s.onboardingComplete = true;
    closeOverlay();
    onComplete(s);
  }

  function closeOverlay() {
    document.removeEventListener("keydown", onKeydown);
    document.body.style.overflow = previousBodyOverflow;
    overlay.remove();
  }

  function finish() {
    const s = structuredClone(settings);
    preset.apply(s);
    if (pendingName)     s.greeting.name      = pendingName;
    if (pendingLocation) s.weather.location   = pendingLocation;
    s.onboardingComplete = true;
    closeOverlay();
    onComplete(s);
  }

  render();
}
