// Vantage — first-run setup wizard.

import { el, clear } from "./utils/dom.js";
import { iconNode } from "./icons.js";
import { geocodeCity, detectLocation } from "./utils/weather-source.js";
import { i18n } from "./utils/i18n.js";

const PRESETS = [
  {
    id: "minimal",
    label: i18n("layoutPresetFocused"),
    tagline: i18n("layoutPresetFocusedTagline"),
    features: [i18n("layoutPresetFocusedFeature1"), i18n("layoutPresetFocusedFeature2"), i18n("layoutPresetFocusedFeature3")],
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
    label: i18n("layoutPresetBalanced"),
    tagline: i18n("layoutPresetBalancedTagline"),
    features: [
      i18n("layoutPresetBalancedFeature1"),
      i18n("layoutPresetBalancedFeature2"),
      i18n("layoutPresetBalancedFeature3"),
      i18n("layoutPresetBalancedFeature4"),
      i18n("layoutPresetBalancedFeature5")
    ],
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
    label: i18n("layoutPresetExpanded"),
    tagline: i18n("layoutPresetExpandedTagline"),
    features: [
      i18n("layoutPresetExpandedFeature1"),
      i18n("layoutPresetExpandedFeature2"),
      i18n("layoutPresetExpandedFeature3"),
      i18n("layoutPresetExpandedFeature4"),
      i18n("layoutPresetExpandedFeature5")
    ],
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
    "aria-label": i18n("vantageSetup")
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
        el("span", { class: "onboard-progress__label" }, [i18n("firstTimeSetup")]),
        el("span", { class: "onboard-progress__step" }, [i18n("setupStepOf", [step + 1, names.length])]),
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
      el("h2", { class: "onboard-title" }, [i18n("chooseYourLayout")]),
      el("p",  { class: "onboard-subtitle" }, [
        i18n("chooseLayoutSubtitle")
      ])
    ]));

    const grid = el("div", {
      class: "onboard-presets",
      role: "radiogroup",
      "aria-label": i18n("chooseStartingLayout")
    });
    for (const p of PRESETS) {
      const selected = p === preset;
      const presetCard = el("button", {
        type: "button",
        class: `onboard-preset${selected ? " onboard-preset--selected" : ""}`,
        role: "radio",
        "aria-checked": String(selected),
        "aria-label": i18n("presetAriaLabel", [p.label, p.tagline, p.features.slice(0, 3).join(", ")]),
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
        el("span", { class: "onboard-preset__features", "aria-hidden": "true" },
          p.features.slice(0, 3).map(feature =>
            el("span", { class: "onboard-preset__feature" }, [feature])
          )
        ),
        el("span", { class: "onboard-preset__radio", "aria-hidden": "true" })
      ]);
      grid.appendChild(presetCard);
    }
    content.appendChild(grid);

    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--ghost", onClick: skipSetup }, [i18n("skipSetup")]),
      el("button", { type: "button", class: "button button--primary", onClick: goNext }, [
        i18n("next"),
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
      el("h2", { class: "onboard-title" }, [i18n("personalize")]),
      el("p",  { class: "onboard-subtitle" }, [
        i18n("personalizeSubtitle")
      ])
    ]));

    const fields = el("div", { class: "onboard-fields" });

    // Name field
    const nameInput = el("input", {
      type: "text",
      placeholder: i18n("yourName"),
      value: pendingName || settings.greeting?.name || "",
      "aria-label": i18n("greetingNameAria")
    });
    nameInput.addEventListener("input", () => { pendingName = nameInput.value.trim(); });
    fields.appendChild(el("div", { class: "onboard-field" }, [
      el("label", {}, [
        `${i18n("name")} `,
        el("span", { class: "onboard-optional" }, [i18n("optional")])
      ]),
      nameInput
    ]));

    // Location field
    const statusEl = el("div", { class: "onboard-location-status", role: "status", "aria-live": "polite" });
    const cityInput = el("input", {
      type: "text",
      placeholder: i18n("cityPlaceholder"),
      value: pendingLocation?.name || settings.weather?.location?.name || "",
      "aria-label": i18n("cityForWeather")
    });
    const setBtn = el("button", {
      type: "button",
      class: "button button--small",
      onClick: () => geocodeFromInput(cityInput, statusEl)
    }, [i18n("set")]);
    const detectBtn = el("button", {
      type: "button",
      class: "button button--ghost button--small onboard-detect-btn",
      onClick: () => detectFromGeo(cityInput, statusEl)
    }, [iconNode("globe", { size: 14 }), i18n("detectLocation")]);

    cityInput.addEventListener("keydown", e => { if (e.key === "Enter") setBtn.click(); });

    fields.appendChild(el("div", { class: "onboard-field" }, [
      el("label", {}, [
        `${i18n("weatherLocation")} `,
        el("span", { class: "onboard-optional" }, [i18n("optional")])
      ]),
      el("div", { class: "onboard-location-row" }, [cityInput, setBtn]),
      el("div", { class: "onboard-location-actions" }, [detectBtn]),
      statusEl
    ]));

    content.appendChild(fields);
    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--ghost", onClick: goBack }, [i18n("back")]),
      el("button", { type: "button", class: "button button--primary", onClick: goNext }, [i18n("next")])
    ]));

    async function geocodeFromInput(input, status) {
      const q = input.value.trim();
      if (!q) return;
      setLocationBusy(true, i18n("lookingUp"));
      status.textContent = i18n("lookingUp");
      status.className = "onboard-location-status";
      try {
        pendingLocation = await geocodeCity(q);
        input.value = pendingLocation.name;
        status.textContent = i18n("setToLocation", [pendingLocation.name]);
        status.className = "onboard-location-status onboard-location-status--ok";
      } catch (err) {
        status.textContent = err.message;
        status.className = "onboard-location-status onboard-location-status--err";
      } finally {
        setLocationBusy(false);
      }
    }

    async function detectFromGeo(input, status) {
      setLocationBusy(true, i18n("detecting"));
      status.textContent = i18n("detecting");
      status.className = "onboard-location-status";
      try {
        pendingLocation = await detectLocation();
        input.value = pendingLocation.name;
        status.textContent = i18n("detectedLocation", [pendingLocation.name]);
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
      el("h2", { class: "onboard-title" }, [i18n("allSetReady")]),
      el("p",  { class: "onboard-subtitle" }, [
        i18n("onboardingDoneSubtitle")
      ])
    ]));
    content.appendChild(el("div", { class: "onboard-footer" }, [
      el("button", { type: "button", class: "button button--primary onboard-launch-btn", onClick: finish }, [
        i18n("openDashboard"),
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
