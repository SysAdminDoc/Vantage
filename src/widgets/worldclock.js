// Vantage — World Clock widget (compact strip, not a reading panel).

import { el, clear } from "../utils/dom.js";

export function renderWorldClock(mount, settings) {
  clear(mount);
  const cfg = settings.worldclock;
  if (!cfg?.enabled || !cfg.clocks?.length) {
    mount.style.display = "none";
    return () => {};
  }
  mount.style.display = "";

  const use24 = settings.clock?.format24 ?? false;

  const strip = el("div", { class: "worldclock-strip", role: "list", "aria-label": "World clocks" });

  function tick() {
    const now = Date.now();
    for (const face of strip.querySelectorAll(".worldclock-face")) {
      const tz = face.dataset.tz;
      try {
        const fmt = new Intl.DateTimeFormat([], {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          ...(use24 ? { hour12: false } : { hour12: true })
        });
        const timeStr = fmt.format(now);
        const timeEl = face.querySelector(".worldclock-time");
        if (timeEl) timeEl.textContent = timeStr;
      } catch { /* bad tz — skip */ }
    }
  }

  for (const clock of cfg.clocks) {
    const face = el("div", { class: "worldclock-face", role: "listitem", "data-tz": clock.tz }, [
      el("span", { class: "worldclock-label" }, [clock.label]),
      el("span", { class: "worldclock-time" }, ["--:--"])
    ]);
    strip.appendChild(face);
  }

  mount.appendChild(strip);
  tick();
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}
