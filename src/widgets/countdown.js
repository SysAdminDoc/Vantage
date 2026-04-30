// Vantage — Countdown Timers panel widget.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";

let _uid = Date.now();
function uid() { return String(++_uid); }

const EVENT_COLORS = ["blue", "green", "yellow", "red", "mauve", "peach"];

export function renderCountdown(mount, settings, { onChange, onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.countdown;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return () => {};
  }
  mount.style.display = "";

  let events = [...(cfg.events || [])];
  let showForm = false;

  function persist() {
    const next = { ...settings, countdown: { ...cfg, events } };
    onChange?.(next);
  }

  function rerender() {
    renderCountdown(mount, { ...settings, countdown: { ...cfg, events } }, { onChange, onAttachDragHandle });
  }

  const addBtn = el("button", {
    type: "button",
    class: "icon-button icon-button--ghost icon-button--small",
    title: "Add countdown", "aria-label": "Add countdown event",
    onClick: () => { showForm = !showForm; rerender(); }
  }, [iconNode(showForm ? "close" : "plus", { size: 14 })]);

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("hourglass", { size: 14 }), " Countdowns"])
    ]),
    el("div", { class: "panel-header__right" }, [addBtn])
  ]);

  const body = el("div", { class: "panel-body countdown-body" });

  // Add-event form
  if (showForm) {
    let newLabel = "";
    let newDate  = new Date().toISOString().slice(0, 10);
    let newColor = "blue";

    const labelInput = el("input", {
      type: "text",
      class: "text-input",
      placeholder: "Event name",
      "aria-label": "Event name",
      onInput: (e) => { newLabel = e.target.value; }
    });

    const dateInput = el("input", {
      type: "date",
      class: "text-input",
      value: newDate,
      "aria-label": "Target date",
      onChange: (e) => { newDate = e.target.value; }
    });

    const colorPicker = el("div", { class: "note-colors" });
    for (const color of EVENT_COLORS) {
      colorPicker.appendChild(el("button", {
        type: "button",
        class: `note-color-btn note-color-btn--${color}${newColor === color ? " note-color-btn--active" : ""}`,
        "aria-label": color.charAt(0).toUpperCase() + color.slice(1),
        onClick: () => {
          newColor = color;
          colorPicker.querySelectorAll(".note-color-btn").forEach((b, i) => {
            b.classList.toggle("note-color-btn--active", EVENT_COLORS[i] === newColor);
          });
        }
      }));
    }

    const saveBtn = el("button", {
      type: "button",
      class: "button button--ghost button--small",
      onClick: () => {
        if (!newLabel.trim() || !newDate) return;
        events.push({ id: uid(), label: newLabel.trim(), date: newDate, color: newColor });
        persist();
        showForm = false;
        rerender();
      }
    }, ["Add"]);

    body.appendChild(el("div", { class: "countdown-form" }, [
      labelInput, dateInput, colorPicker,
      el("div", { class: "countdown-form__footer" }, [saveBtn])
    ]));
  }

  if (events.length === 0 && !showForm) {
    body.appendChild(el("p", { class: "panel-empty" }, ["No countdowns yet — click + to add one."]));
  }

  const now = Date.now();
  for (const ev of events) {
    const target  = new Date(ev.date + "T00:00:00").getTime();
    const diff    = target - now;
    const past    = diff < 0;
    const absDiff = Math.abs(diff);
    const days    = Math.floor(absDiff / 86400000);
    const hours   = Math.floor((absDiff % 86400000) / 3600000);
    const mins    = Math.floor((absDiff % 3600000) / 60000);

    const timeStr = past
      ? `${days}d ${hours}h ago`
      : days > 0
        ? `${days}d ${hours}h ${mins}m`
        : `${hours}h ${mins}m`;

    const delBtn = el("button", {
      type: "button",
      class: "icon-button icon-button--ghost icon-button--tiny",
      "aria-label": "Remove countdown",
      onClick: () => {
        const idx = events.indexOf(ev);
        if (idx > -1) events.splice(idx, 1);
        persist();
        rerender();
      }
    }, [iconNode("trash", { size: 12 })]);

    body.appendChild(el("div", { class: `countdown-item countdown-item--${ev.color}${past ? " countdown-item--past" : ""}` }, [
      el("div", { class: "countdown-item__left" }, [
        el("div", { class: "countdown-item__label" }, [ev.label]),
        el("div", { class: "countdown-item__date" }, [ev.date])
      ]),
      el("div", { class: "countdown-item__right" }, [
        el("div", { class: "countdown-item__time" }, [timeStr]),
        delBtn
      ])
    ]));
  }

  mount.appendChild(header);
  mount.appendChild(body);
  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));

  // Live minute tick
  const interval = setInterval(() => {
    mount.querySelectorAll(".countdown-item__time").forEach((el, i) => {
      const ev = events[i];
      if (!ev) return;
      const target  = new Date(ev.date + "T00:00:00").getTime();
      const diff    = target - Date.now();
      const past    = diff < 0;
      const absDiff = Math.abs(diff);
      const days    = Math.floor(absDiff / 86400000);
      const hours   = Math.floor((absDiff % 86400000) / 3600000);
      const mins    = Math.floor((absDiff % 3600000) / 60000);
      el.textContent = past
        ? `${days}d ${hours}h ago`
        : days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
    });
  }, 60000);

  return () => clearInterval(interval);
}
