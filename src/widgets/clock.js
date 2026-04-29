// Vantage v0.1.0 — clock widget

import { el, clear } from "../utils/dom.js";

export function renderClock(mount, settings) {
  clear(mount);
  if (!settings.clock.enabled) {
    mount.style.display = "none";
    return () => {};
  }
  mount.style.display = "";

  const time = el("div", { class: "clock-time" });
  const date = el("div", { class: "clock-date" });
  mount.appendChild(time);
  mount.appendChild(date);

  const tick = () => {
    const now = new Date();
    const hours24 = now.getHours();
    const hours = settings.clock.format24 ? hours24 : ((hours24 % 12) || 12);
    const mins = String(now.getMinutes()).padStart(2, "0");
    const secs = String(now.getSeconds()).padStart(2, "0");
    const suffix = settings.clock.format24 ? "" : (hours24 >= 12 ? " PM" : " AM");
    const timeStr = settings.clock.showSeconds
      ? `${hours}:${mins}:${secs}${suffix}`
      : `${hours}:${mins}${suffix}`;
    time.textContent = timeStr;
    date.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  tick();
  const interval = setInterval(tick, settings.clock.showSeconds ? 1000 : 15000);
  return () => clearInterval(interval);
}
