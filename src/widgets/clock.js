// Vantage v0.2.0 — greeting + datetime hero (replaces standalone clock card)

import { el, clear, timeOfDayGreeting } from "../utils/dom.js";

export function renderGreeting(mount, settings) {
  clear(mount);
  if (!settings.greeting?.enabled && !settings.clock.enabled) {
    mount.style.display = "none";
    return () => {};
  }
  mount.style.display = "";

  const hello = el("h1", { class: "greeting__hello" });
  const meta = el("p", { class: "greeting__meta" });
  if (settings.greeting?.enabled !== false) mount.appendChild(hello);
  if (settings.clock.enabled) mount.appendChild(meta);

  const tick = () => {
    const now = new Date();
    if (settings.greeting?.enabled !== false) {
      const greet = timeOfDayGreeting(now.getHours());
      const name = (settings.greeting?.name || "").trim();
      clear(hello);
      if (name) {
        hello.append(`${greet}, `, el("em", {}, [name]));
      } else {
        hello.append(greet);
      }
    }

    if (settings.clock.enabled) {
      const dateStr = now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
      });
      const hours24 = now.getHours();
      const hours = settings.clock.format24 ? hours24 : ((hours24 % 12) || 12);
      const mins = String(now.getMinutes()).padStart(2, "0");
      const secs = String(now.getSeconds()).padStart(2, "0");
      const suffix = settings.clock.format24 ? "" : (hours24 >= 12 ? " PM" : " AM");
      const timeStr = settings.clock.showSeconds
        ? `${hours}:${mins}:${secs}${suffix}`
        : `${hours}:${mins}${suffix}`;
      meta.textContent = `${dateStr} · ${timeStr}`;
    }
  };

  tick();
  const interval = setInterval(tick, settings.clock.showSeconds ? 1000 : 15000);
  return () => clearInterval(interval);
}
