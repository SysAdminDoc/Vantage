// Vantage — Unit Converter panel widget.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";

const CATEGORIES = {
  length:      { label: "Length",      units: ["mm","cm","m","km","in","ft","yd","mi"], base: "m", factors: { mm:0.001,cm:0.01,m:1,km:1000,in:0.0254,ft:0.3048,yd:0.9144,mi:1609.344 } },
  weight:      { label: "Weight",      units: ["mg","g","kg","t","oz","lb"], base: "g", factors: { mg:0.001,g:1,kg:1000,t:1e6,oz:28.3495,lb:453.592 } },
  temperature: { label: "Temperature", units: ["°C","°F","K"], base: null, factors: null },
  area:        { label: "Area",        units: ["mm²","cm²","m²","km²","in²","ft²","ac","ha"], base: "m²", factors: { "mm²":1e-6,"cm²":0.0001,"m²":1,"km²":1e6,"in²":0.00064516,"ft²":0.092903,"ac":4046.86,"ha":10000 } },
  volume:      { label: "Volume",      units: ["ml","L","m³","tsp","tbsp","fl oz","cup","pt","qt","gal"], base: "L", factors: { ml:0.001,L:1,"m³":1000,tsp:0.00492892,tbsp:0.0147868,"fl oz":0.0295735,cup:0.236588,pt:0.473176,qt:0.946353,gal:3.78541 } },
  speed:       { label: "Speed",       units: ["m/s","km/h","mph","knot"], base: "m/s", factors: { "m/s":1,"km/h":1/3.6,"mph":0.44704,"knot":0.514444 } },
  data:        { label: "Data",        units: ["B","KB","MB","GB","TB","PB"], base: "B", factors: { B:1,KB:1024,MB:1048576,GB:1073741824,TB:1099511627776,PB:1125899906842624 } },
};

function convert(cat, value, fromUnit, toUnit) {
  if (isNaN(value)) return "";
  if (fromUnit === toUnit) return String(value);
  if (cat === "temperature") {
    let celsius;
    if (fromUnit === "°C") celsius = value;
    else if (fromUnit === "°F") celsius = (value - 32) * 5/9;
    else celsius = value - 273.15;
    if (toUnit === "°C") return celsius.toFixed(4);
    if (toUnit === "°F") return (celsius * 9/5 + 32).toFixed(4);
    return (celsius + 273.15).toFixed(4);
  }
  const f = CATEGORIES[cat].factors;
  const inBase = value * f[fromUnit];
  const result = inBase / f[toUnit];
  return result.toFixed(6).replace(/\.?0+$/, "");
}

export function renderConverter(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.converter;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  let activeCat  = cfg.defaultCategory || "length";
  let fromVal    = "1";
  let fromUnit   = CATEGORIES[activeCat].units[0];
  let toUnit     = CATEGORIES[activeCat].units[1] || CATEGORIES[activeCat].units[0];

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("calculator", { size: 14 }), " Converter"])
    ]),
    el("div", { class: "panel-header__right" })
  ]);

  const catRow = el("div", { class: "converter-cats" });
  for (const [key, meta] of Object.entries(CATEGORIES)) {
    catRow.appendChild(el("button", {
      type: "button",
      class: `converter-cat${activeCat === key ? " converter-cat--active" : ""}`,
      onClick: () => {
        activeCat = key;
        fromUnit  = CATEGORIES[key].units[0];
        toUnit    = CATEGORIES[key].units[1] || CATEGORIES[key].units[0];
        rebuildInputs();
        updateActive();
      }
    }, [meta.label]));
  }

  function updateActive() {
    catRow.querySelectorAll(".converter-cat").forEach((btn, i) => {
      btn.classList.toggle("converter-cat--active", Object.keys(CATEGORIES)[i] === activeCat);
    });
  }

  const inputArea = el("div", { class: "converter-inputs" });

  function buildUnitSelect(current, onChange) {
    const sel = el("select", { class: "text-input converter-unit-sel", "aria-label": "Unit", onChange: (e) => onChange(e.target.value) });
    for (const u of CATEGORIES[activeCat].units) {
      const opt = el("option", { value: u }, [u]);
      if (u === current) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }

  let fromInput, toInput, fromSel, toSel;

  function rebuildInputs() {
    inputArea.innerHTML = "";

    fromSel = buildUnitSelect(fromUnit, (u) => { fromUnit = u; updateResult(); });
    toSel   = buildUnitSelect(toUnit,   (u) => { toUnit   = u; updateResult(); });

    fromInput = el("input", {
      type: "number",
      class: "text-input converter-val",
      value: fromVal,
      "aria-label": "From value",
      onInput: (e) => { fromVal = e.target.value; updateResult(); }
    });

    toInput = el("input", {
      type: "text",
      class: "text-input converter-val converter-val--result",
      readonly: "true",
      "aria-label": "Result",
      "aria-readonly": "true"
    });
    toInput.value = convert(activeCat, parseFloat(fromVal), fromUnit, toUnit);

    const swapBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost converter-swap",
      "aria-label": "Swap units",
      onClick: () => {
        [fromUnit, toUnit] = [toUnit, fromUnit];
        fromVal = toInput.value;
        rebuildInputs();
      }
    }, [iconNode("arrows-up-down", { size: 16 })]);

    inputArea.appendChild(el("div", { class: "converter-row" }, [
      fromInput, fromSel
    ]));
    inputArea.appendChild(el("div", { class: "converter-swap-row" }, [swapBtn]));
    inputArea.appendChild(el("div", { class: "converter-row" }, [
      toInput, toSel
    ]));
  }

  function updateResult() {
    if (toInput) toInput.value = convert(activeCat, parseFloat(fromVal), fromUnit, toUnit);
  }

  rebuildInputs();

  const body = el("div", { class: "panel-body converter-body" }, [catRow, inputArea]);
  mount.appendChild(header);
  mount.appendChild(body);
  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));
}
