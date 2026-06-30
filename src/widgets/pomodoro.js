// Vantage v0.6.0 — Pomodoro focus timer.
//
// State is kept in chrome.storage.local under "vantagePomodoro" (separate from
// main settings). All open new-tab pages sync state via chrome.storage.onChanged.
//
// Cross-tab completion: navigator.locks prevents multiple tabs from
// simultaneously firing the transition + notification when the timer ends.
//
// Tab-visibility: auto-pauses when the tab goes to the background and
// auto-resumes when it comes back (unless the user manually paused).

import { el, clear, toast } from "../utils/dom.js";
import { iconNode, iconString } from "../icons.js";
import { playAlarm } from "../utils/alarm-audio.js";
import { i18n } from "../utils/i18n.js";

const STORAGE_KEY = "vantagePomodoro";
const POMODORO_BUTTON_LABELS = {
  Start: "start",
  Pause: "pause",
  Skip: "skip",
  Reset: "reset"
};

// ---- State helpers -------------------------------------------------------

async function readState() {
  const chromeApi = globalThis.chrome;
  if (!chromeApi?.storage?.local) return null;
  const d = await chromeApi.storage.local.get(STORAGE_KEY);
  return d[STORAGE_KEY] || null;
}

async function writeState(state) {
  const chromeApi = globalThis.chrome;
  if (!chromeApi?.storage?.local) return;
  await chromeApi.storage.local.set({ [STORAGE_KEY]: state });
}

function freshState(cfg) {
  return {
    phase:           "idle",
    endTimeMs:       0,
    sessionCount:    0,
    paused:          false,
    autopaused:      false,
    pausedRemainingMs: 0,
    settings: {
      workMinutes:             cfg.workMinutes             ?? 25,
      breakMinutes:            cfg.breakMinutes            ?? 5,
      longBreakMinutes:        cfg.longBreakMinutes        ?? 15,
      sessionsBeforeLongBreak: cfg.sessionsBeforeLongBreak ?? 4
    }
  };
}

function phaseLabel(phase) {
  return {
    idle: i18n("ready", null, "Ready"),
    work: i18n("focus", null, "Focus"),
    break: i18n("break", null, "Break"),
    "long-break": i18n("longBreak", null, "Long Break")
  }[phase] || phase;
}

function phaseDuration(phase, s) {
  if (phase === "work")        return s.workMinutes * 60_000;
  if (phase === "break")       return s.breakMinutes * 60_000;
  if (phase === "long-break")  return s.longBreakMinutes * 60_000;
  return 0;
}

function nextPhase(state) {
  if (state.phase !== "work") return "work";
  const sessions = state.sessionCount + 1;
  if (sessions % state.settings.sessionsBeforeLongBreak === 0) return "long-break";
  return "break";
}

function formatMs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60), s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---- Notification --------------------------------------------------------

function notify(title, body) {
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/icons/icon48.png", silent: false });
}

async function requestNotificationPermission() {
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

// ---- Render --------------------------------------------------------------

export function renderPomodoro(mount, settings) {
  clear(mount);
  const cfg = settings.pomodoro;
  if (!cfg?.enabled) return;

  // DOM
  const phaseEl    = el("span", { class: "pom-phase" }, [i18n("ready", null, "Ready")]);
  const timerEl    = el("span", { class: "pom-time"  }, ["25:00"]);
  const dotsEl     = el("div",  { class: "pom-dots"  });
  const startBtn   = el("button", { type: "button", class: "pom-btn pom-btn--primary", "aria-label": i18n("start", null, "Start") }, [iconNode("play",         { size: 16 })]);
  const pauseBtn   = el("button", { type: "button", class: "pom-btn pom-btn--ghost",   "aria-label": i18n("pause", null, "Pause") }, [iconNode("pause",        { size: 16 })]);
  const skipBtn    = el("button", { type: "button", class: "pom-btn pom-btn--ghost",   "aria-label": i18n("skip", null, "Skip") }, [iconNode("skip-forward", { size: 16 })]);
  const resetBtn   = el("button", { type: "button", class: "pom-btn pom-btn--ghost",   "aria-label": i18n("reset", null, "Reset") }, [iconNode("refresh",      { size: 16 })]);

  const hasPip = "documentPictureInPicture" in globalThis;
  const pipBtn = hasPip
    ? el("button", { type: "button", class: "pom-btn pom-btn--ghost", "aria-label": i18n("popOutTimer", null, "Pop out timer"), title: i18n("pictureInPicture", null, "Picture-in-Picture") }, [iconNode("picture-in-picture", { size: 16 })])
    : null;

  const controlBtns = [startBtn, pauseBtn, skipBtn, resetBtn];
  if (pipBtn) controlBtns.push(pipBtn);

  const widget = el("div", { class: "pom-widget" }, [
    el("div", { class: "pom-display" }, [phaseEl, timerEl]),
    dotsEl,
    el("div", { class: "pom-controls" }, controlBtns)
  ]);
  mount.appendChild(widget);

  // ---- Local tick loop --------------------------------------------------

  let tickId = null;
  let localState = null;
  let autopausing = false;

  function renderState(state) {
    localState = state;
    if (!state || state.phase === "idle") {
      phaseEl.textContent = i18n("ready", null, "Ready");
      timerEl.textContent = formatMs(phaseDuration("work", state?.settings || cfg) || (cfg.workMinutes * 60_000));
      startBtn.hidden = false; pauseBtn.hidden = true;
      updateDots(state?.sessionCount || 0, state?.settings?.sessionsBeforeLongBreak || cfg.sessionsBeforeLongBreak);
      document.title = i18n("newTabTitle", null, "New Tab");
      return;
    }

    phaseEl.textContent = phaseLabel(state.phase);
    updateDots(state.sessionCount, state.settings.sessionsBeforeLongBreak);

    if (state.paused || state.autopaused) {
      timerEl.textContent = formatMs(state.pausedRemainingMs);
      startBtn.hidden = false; pauseBtn.hidden = true;
      document.title = `⏸ ${formatMs(state.pausedRemainingMs)} — ${phaseLabel(state.phase)}`;
    } else {
      const remaining = state.endTimeMs - Date.now();
      timerEl.textContent = formatMs(remaining);
      startBtn.hidden = true; pauseBtn.hidden = false;
      document.title = `⏱ ${formatMs(remaining)} — ${phaseLabel(state.phase)}`;
    }
  }

  function updateDots(count, total) {
    clear(dotsEl);
    for (let i = 0; i < total; i++) {
      dotsEl.appendChild(el("span", { class: `pom-dot${i < count % total ? " pom-dot--filled" : ""}` }));
    }
  }

  function startTick() {
    stopTick();
    tickId = setInterval(async () => {
      if (!localState || localState.phase === "idle" || localState.paused || localState.autopaused) return;
      const remaining = localState.endTimeMs - Date.now();
      timerEl.textContent = formatMs(remaining);
      document.title = `⏱ ${formatMs(remaining)} — ${phaseLabel(localState.phase)}`;
      if (remaining <= 0) {
        await handleComplete(localState);
      }
    }, 500);
  }

  function stopTick() {
    if (tickId) { clearInterval(tickId); tickId = null; }
  }

  async function handleComplete(state) {
    stopTick();
    // Use navigator.locks so only the first tab to see the completion fires the handler.
    await navigator.locks.request(
      "vantage-pomodoro-complete",
      { ifAvailable: true },
      async (lock) => {
        if (!lock) return; // another tab handled it
        const newSessionCount = state.phase === "work" ? state.sessionCount + 1 : state.sessionCount;
        const next = nextPhase({ ...state, sessionCount: newSessionCount });
        const duration = phaseDuration(next, state.settings);
        const newState = {
          ...state,
          phase:        next,
          endTimeMs:    Date.now() + duration,
          sessionCount: newSessionCount,
          paused:       false,
          autopaused:   false,
          pausedRemainingMs: duration
        };
        await writeState(newState);
        // Alarm tone fires before notification — keeps the order of
        // attention-grabbing signals consistent (bell → toast → OS notif).
        playAlarm(cfg.alarm).catch(() => {});
        notify(
          next === "work" ? i18n("timeToFocus", null, "Time to focus!") : i18n("breakTime", null, "Break time!"),
          next === "work"
            ? i18n("focusSessionStarting", [state.settings.workMinutes], "$1 min focus session starting.")
            : i18n("takeBreakMinutes", [next === "long-break" ? state.settings.longBreakMinutes : state.settings.breakMinutes], "Take a $1 min break.")
        );
        toast(i18n("pomodoroSessionStarted", [phaseLabel(next)], "$1 session started."), "info");
      }
    );
  }

  // ---- Button handlers --------------------------------------------------

  startBtn.addEventListener("click", async () => {
    await requestNotificationPermission();
    let state = await readState();
    if (!state) state = freshState(cfg);
    if (state.phase === "idle") {
      const duration = phaseDuration("work", state.settings);
      state = { ...state, phase: "work", endTimeMs: Date.now() + duration, paused: false, autopaused: false, pausedRemainingMs: duration };
    } else if (state.paused || state.autopaused) {
      state = { ...state, endTimeMs: Date.now() + state.pausedRemainingMs, paused: false, autopaused: false };
    }
    await writeState(state);
    renderState(state);
    startTick();
  });

  pauseBtn.addEventListener("click", async () => {
    if (!localState || localState.phase === "idle") return;
    const remaining = Math.max(0, localState.endTimeMs - Date.now());
    const newState = { ...localState, paused: true, autopaused: false, pausedRemainingMs: remaining };
    await writeState(newState);
    renderState(newState);
    stopTick();
    document.title = i18n("newTabTitle", null, "New Tab");
  });

  skipBtn.addEventListener("click", async () => {
    let state = await readState();
    if (!state) state = freshState(cfg);
    const newSessionCount = state.phase === "work" ? state.sessionCount + 1 : state.sessionCount;
    const next = nextPhase({ ...state, sessionCount: newSessionCount });
    const duration = phaseDuration(next, state.settings);
    const newState = {
      ...state,
      phase: next,
      endTimeMs: Date.now() + duration,
      sessionCount: newSessionCount,
      paused: false, autopaused: false,
      pausedRemainingMs: duration
    };
    await writeState(newState);
    renderState(newState);
    startTick();
  });

  resetBtn.addEventListener("click", async () => {
    stopTick();
    const blank = freshState(cfg);
    await writeState(blank);
    renderState(blank);
    document.title = i18n("newTabTitle", null, "New Tab");
  });

  // ---- Document Picture-in-Picture ----------------------------------------

  let pipWindow = null;
  let pipTickId = null;
  let pipStorageUnlisten = null;

  function closePip() {
    if (pipTickId) { clearInterval(pipTickId); pipTickId = null; }
    pipStorageUnlisten?.();
    pipStorageUnlisten = null;
    try { pipWindow?.close(); } catch {}
    pipWindow = null;
  }

  async function openPip() {
    if (pipWindow && !pipWindow.closed) { pipWindow.focus(); return; }

    const win = await documentPictureInPicture.requestWindow({
      width: 320, height: 200
    });
    pipWindow = win;

    const doc = win.document;
    doc.title = i18n("pomodoro", null, "Pomodoro");

    const style = doc.createElement("style");
    style.textContent = PIP_CSS;
    doc.head.appendChild(style);

    const pipPhase = doc.createElement("div");
    pipPhase.className = "pip-phase";
    const pipTime = doc.createElement("div");
    pipTime.className = "pip-time";
    const pipDots = doc.createElement("div");
    pipDots.className = "pip-dots";

    const mkBtn = (label, cls) => {
      const b = doc.createElement("button");
      b.className = `pip-btn ${cls}`;
      b.setAttribute("aria-label", i18n(POMODORO_BUTTON_LABELS[label], null, label));
      b.innerHTML = iconString(label === "Start" ? "play" : label === "Pause" ? "pause" : label === "Skip" ? "skip-forward" : "refresh", 14);
      return b;
    };
    const pStart = mkBtn("Start", "pip-btn--primary");
    const pPause = mkBtn("Pause", "pip-btn--ghost");
    const pSkip  = mkBtn("Skip", "pip-btn--ghost");
    const pReset = mkBtn("Reset", "pip-btn--ghost");

    const controls = doc.createElement("div");
    controls.className = "pip-controls";
    controls.append(pStart, pPause, pSkip, pReset);

    const root = doc.createElement("div");
    root.className = "pip-root";
    root.append(pipPhase, pipTime, pipDots, controls);
    doc.body.appendChild(root);

    let pipState = null;

    function renderPip(state) {
      pipState = state;
      if (!state || state.phase === "idle") {
        pipPhase.textContent = i18n("ready", null, "Ready");
        pipTime.textContent = formatMs(phaseDuration("work", state?.settings || cfg) || (cfg.workMinutes * 60_000));
        pStart.hidden = false; pPause.hidden = true;
        renderPipDots(pipDots, doc, state?.sessionCount || 0, state?.settings?.sessionsBeforeLongBreak || cfg.sessionsBeforeLongBreak);
        return;
      }
      pipPhase.textContent = phaseLabel(state.phase);
      renderPipDots(pipDots, doc, state.sessionCount, state.settings.sessionsBeforeLongBreak);
      if (state.paused || state.autopaused) {
        pipTime.textContent = formatMs(state.pausedRemainingMs);
        pStart.hidden = false; pPause.hidden = true;
      } else {
        pipTime.textContent = formatMs(state.endTimeMs - Date.now());
        pStart.hidden = true; pPause.hidden = false;
      }
    }

    function startPipTick() {
      if (pipTickId) clearInterval(pipTickId);
      pipTickId = setInterval(() => {
        if (!pipState || pipState.phase === "idle" || pipState.paused || pipState.autopaused) return;
        pipTime.textContent = formatMs(pipState.endTimeMs - Date.now());
      }, 500);
    }

    pStart.addEventListener("click", () => startBtn.click());
    pPause.addEventListener("click", () => pauseBtn.click());
    pSkip.addEventListener("click", () => skipBtn.click());
    pReset.addEventListener("click", () => resetBtn.click());

    const chromeApi = globalThis.chrome;
    if (chromeApi?.storage?.onChanged) {
      const handler = (changes, area) => {
        if (area !== "local" || !changes[STORAGE_KEY]) return;
        const ns = changes[STORAGE_KEY].newValue;
        renderPip(ns);
        if (ns && !ns.paused && !ns.autopaused && ns.phase !== "idle") startPipTick();
        else { if (pipTickId) { clearInterval(pipTickId); pipTickId = null; } }
      };
      chromeApi.storage.onChanged.addListener(handler);
      pipStorageUnlisten = () => chromeApi.storage.onChanged.removeListener(handler);
    }

    win.addEventListener("pagehide", () => closePip());

    const state = await readState() || freshState(cfg);
    renderPip(state);
    if (state.phase !== "idle" && !state.paused && !state.autopaused) startPipTick();
  }

  function renderPipDots(container, doc, count, total) {
    container.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const dot = doc.createElement("span");
      dot.className = i < count % total ? "pip-dot pip-dot--filled" : "pip-dot";
      container.appendChild(dot);
    }
  }

  if (pipBtn) pipBtn.addEventListener("click", () => openPip().catch(() => {}));

  // ---- Tab visibility auto-pause ----------------------------------------

  const onVisibility = async () => {
    const state = await readState();
    if (!state || state.phase === "idle") return;

    if (document.hidden) {
      // Tab going to background — auto-pause if running
      if (!state.paused && !state.autopaused) {
        autopausing = true;
        const remaining = Math.max(0, state.endTimeMs - Date.now());
        const newState = { ...state, autopaused: true, pausedRemainingMs: remaining };
        await writeState(newState);
        stopTick();
      }
    } else {
      // Tab coming to foreground — resume if we auto-paused it
      if (state.autopaused && !state.paused) {
        const newState = { ...state, autopaused: false, endTimeMs: Date.now() + state.pausedRemainingMs };
        await writeState(newState);
        renderState(newState);
        startTick();
      } else {
        renderState(state);
        if (!state.paused && !state.autopaused) startTick();
      }
      autopausing = false;
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  // ---- Cross-tab sync via storage.onChanged ----------------------------

  let storageUnlisten = null;
  const chromeApi = globalThis.chrome;
  if (chromeApi?.storage?.onChanged) {
    const handler = (changes, area) => {
      if (area !== "local" || !changes[STORAGE_KEY]) return;
      const newState = changes[STORAGE_KEY].newValue;
      renderState(newState);
      if (newState && !newState.paused && !newState.autopaused && newState.phase !== "idle") {
        startTick();
      } else {
        stopTick();
      }
    };
    chromeApi.storage.onChanged.addListener(handler);
    storageUnlisten = () => chromeApi.storage.onChanged.removeListener(handler);
  }

  // ---- Initial load -------------------------------------------------------

  (async () => {
    let state = await readState();
    if (!state) state = freshState(cfg);
    // Sync settings (in case work/break minutes changed in settings panel)
    state.settings = {
      workMinutes:             cfg.workMinutes             ?? 25,
      breakMinutes:            cfg.breakMinutes            ?? 5,
      longBreakMinutes:        cfg.longBreakMinutes        ?? 15,
      sessionsBeforeLongBreak: cfg.sessionsBeforeLongBreak ?? 4
    };
    renderState(state);
    if (state.phase !== "idle" && !state.paused && !state.autopaused) {
      if (state.endTimeMs > Date.now()) startTick();
      else await handleComplete(state);
    }
  })();

  // Return teardown so main.js can clean up on settings change
  return () => {
    stopTick();
    closePip();
    document.removeEventListener("visibilitychange", onVisibility);
    storageUnlisten?.();
    document.title = i18n("newTabTitle", null, "New Tab");
  };
}

// Inline CSS for the Document PiP window (can't load extension stylesheets).
const PIP_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #1e1e2e; color: #cdd6f4;
    display: flex; align-items: center; justify-content: center;
    height: 100vh; overflow: hidden; user-select: none;
  }
  .pip-root {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 16px;
  }
  .pip-phase {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.12em; color: #cba6f7;
  }
  .pip-time {
    font-size: 42px; font-weight: 800; font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px; line-height: 1;
  }
  .pip-dots { display: flex; gap: 6px; }
  .pip-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #45475a;
  }
  .pip-dot--filled { background: #cba6f7; }
  .pip-controls { display: flex; gap: 6px; }
  .pip-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border: 1px solid #45475a;
    border-radius: 6px; background: transparent; color: #cdd6f4;
    cursor: pointer; transition: background 0.15s, border-color 0.15s;
  }
  .pip-btn:hover { background: rgba(203,166,247,0.1); border-color: rgba(203,166,247,0.4); color: #cba6f7; }
  .pip-btn--primary { background: #cba6f7; color: #1e1e2e; border-color: #cba6f7; }
  .pip-btn--primary:hover { background: #b48def; border-color: #b48def; }
  .pip-btn svg { width: 14px; height: 14px; }
`;
