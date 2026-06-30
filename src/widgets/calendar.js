// Vantage v0.6.0 — iCal calendar panel.
// Fetches .ics feeds via the same CORS proxy chain as RSS, then renders
// upcoming events grouped by date inside a panel card.

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { parseICal } from "../utils/ical-parser.js";
import { hasHostPermission } from "../utils/host-permissions.js";
import { i18n } from "../utils/i18n.js";
import { recordIntegrationEvent } from "../utils/integration-health.js";

const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

async function fetchICal(url, auth) {
  const headers = {};
  if (auth?.type === "bearer" && auth.token) {
    headers["Authorization"] = `Bearer ${auth.token}`;
  } else if (auth?.type === "basic" && auth.username) {
    const raw = `${auth.username}:${auth.password || ""}`;
    headers["Authorization"] = `Basic ${btoa(unescape(encodeURIComponent(raw)))}`;
  }
  const hasAuth = !!headers["Authorization"];

  try {
    if (!(await hasHostPermission(url))) throw new Error(i18n("hostAccessNotGranted", null, "Host access not granted"));
    const r = await fetch(url, { cache: "no-store", headers });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    recordCalendar("success", "calendar fetched", url, "direct");
    return text;
  } catch (directErr) {
    if (hasAuth) {
      recordCalendar("error", directErr?.message || "calendar fetch failed", url, "direct");
      throw directErr;
    }
    for (const proxy of PROXIES) {
      try {
        const endpoint = proxy(url);
        const r = await fetch(endpoint, { cache: "no-store" });
        if (!r.ok) throw new Error(`Proxy ${r.status}`);
        const text = await r.text();
        recordCalendar("success", "calendar fetched through proxy", endpoint, "proxy");
        return text;
      } catch { /* try next */ }
    }
    recordCalendar("error", "calendar fetch failed", url, "proxy-fallback");
    throw new Error(i18n("failedToFetchUrl", [url], "Failed to fetch $1"));
  }
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function dayLabel(date, today) {
  if (isSameDay(date, today)) return i18n("today", null, "Today");
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, tomorrow)) return i18n("tomorrow", null, "Tomorrow");
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function timeLabel(event) {
  // DATE-only events have midnight time and no end — show "All day"
  const s = event.start;
  if (s.getHours() === 0 && s.getMinutes() === 0 && !event.end) return i18n("allDay", null, "All day");
  return s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function renderCalendar(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.calendar;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  // Panel scaffold
  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2",  { class: "panel-header__title" }, [iconNode("calendar", { size: 14 }), ` ${i18n("calendar")}`])
    ]),
    el("div", { class: "panel-header__right" }, [
      el("button", {
        type: "button", class: "icon-button icon-button--ghost icon-button--small",
        "aria-label": i18n("refreshCalendar", null, "Refresh calendar"), title: i18n("refresh", null, "Refresh"),
        onClick: () => { renderCalendar(mount, settings, { onAttachDragHandle }); }
      }, [iconNode("refresh", { size: 14 })])
    ])
  ]);

  const body = el("div", { class: "panel-body" });
  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) {
    onAttachDragHandle(header.querySelector(".panel-header__drag"));
  }

  if (!cfg.feeds?.length) {
    body.appendChild(el("p", { class: "panel-empty" }, [i18n("calendarEmptyHint", null, "Add an iCal URL in Settings -> Calendar.")]));
    return;
  }

  // Show skeleton rows while loading (reuses the shared skel-line shimmer)
  for (let i = 0; i < 4; i++) {
    body.appendChild(el("div", { class: "feed-skeleton", "aria-hidden": "true" }, [
      el("div", { class: "skel-line skel-line--title" }),
      el("div", { class: "skel-line skel-line--meta"  })
    ]));
  }

  (async () => {
    try {
      const results = await Promise.allSettled(cfg.feeds.map(f => fetchICal(f.url, f.auth)));
      let events = [];
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          try { events.push(...parseICal(r.value)); } catch { /* skip malformed */ }
        }
      });

      const today  = new Date(); today.setHours(0, 0, 0, 0);
      const cutoff = new Date(today); cutoff.setDate(today.getDate() + (cfg.daysAhead ?? 7));

      events = events.filter(e => e.start >= today && e.start < cutoff);
      events.sort((a, b) => a.start - b.start);
      events = events.slice(0, cfg.maxItems ?? 10);

      clear(body);

      if (!events.length) {
        body.appendChild(el("p", { class: "panel-empty" }, [i18n("calendarNoEvents", [cfg.daysAhead ?? 7], "No events in the next $1 days.")]));
        return;
      }

      // Group by day
      let lastDay = null;
      for (const event of events) {
        const day = new Date(event.start); day.setHours(0, 0, 0, 0);
        if (!lastDay || !isSameDay(day, lastDay)) {
          lastDay = day;
          body.appendChild(el("div", { class: "cal-day-label" }, [dayLabel(day, today)]));
        }
        const item = el("div", { class: "cal-event" }, [
          el("div", { class: "cal-event__time" }, [timeLabel(event)]),
          el("div", { class: "cal-event__info" }, [
            el("span", { class: "cal-event__title" }, [event.title]),
            event.location ? el("span", { class: "cal-event__location" }, [event.location]) : null
          ].filter(Boolean))
        ]);
        body.appendChild(item);
      }
    } catch (err) {
      clear(body);
      body.appendChild(el("p", { class: "panel-error" }, [i18n("calendarLoadError", [err.message.toLowerCase()], "Couldn't load calendar - $1.")]));
    }
  })();
}

function recordCalendar(kind, message, endpoint, source) {
  recordIntegrationEvent("calendar-feeds", {
    label: "Calendar feeds",
    kind,
    message,
    endpoint,
    source
  });
}
