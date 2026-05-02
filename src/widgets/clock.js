// Vantage v0.2.0 — greeting + datetime hero (replaces standalone clock card)

import { el, clear, timeOfDayGreeting, timeSlot } from "../utils/dom.js";

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
      const slot = timeSlot(now.getHours());
      const defaultGreet = timeOfDayGreeting(now.getHours());
      const customGreet = (settings.greeting?.custom?.[slot] || "").trim();
      const name = (settings.greeting?.name || "").trim();
      clear(hello);
      // Custom string can include a literal `[name]` token. If it does,
      // the user has handled name placement themselves; otherwise we keep
      // the historic ", <em>name</em>" suffix so existing setups don't
      // change behavior.
      if (customGreet) {
        renderCustomGreeting(hello, customGreet, name);
      } else if (name) {
        hello.append(`${defaultGreet}, `, el("em", {}, [name]));
      } else {
        hello.append(defaultGreet);
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

// Render a user-customised greeting string. Splits on the literal `[name]`
// token (if present) and appends an <em> for the name in that position.
// Plain text is set via textContent so the user can't inject markup.
function renderCustomGreeting(target, template, name) {
  const TOKEN = "[name]";
  if (!template.includes(TOKEN)) {
    if (name) target.append(`${template}, `, el("em", {}, [name]));
    else target.append(template);
    return;
  }
  const parts = template.split(TOKEN);
  parts.forEach((part, i) => {
    if (part) target.append(document.createTextNode(part));
    if (i < parts.length - 1) {
      if (name) target.append(el("em", {}, [name]));
      // If [name] is present in the template but the user hasn't set a name,
      // we just drop the token silently.
    }
  });
}
