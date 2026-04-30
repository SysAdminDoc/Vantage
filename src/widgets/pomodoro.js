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
import { iconNode } from "../icons.js";

const STORAGE_KEY = "vantagePomodoro";

// ---- State helpers -------------------------------------------------------

async function readState() {
  if (!chrome?.storage?.local) return null;
  const d = await chrome.storage.local.get(STORAGE_KEY);
  return d[STORAGE_KEY] || null;
}

async function writeState(state) {
  if (!chrome?.storage?.local) return;
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
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
  return { idle: "Ready", work: "Focus", break: "Break", "long-break": "Long Break" }[phase] || phase;
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
  const phaseEl    = el("span", { class: "pom-phase" }, ["Ready"]);
  const timerEl    = el("span", { class: "pom-time"  }, ["25:00"]);
  const dotsEl     = el("div",  { class: "pom-dots"  });
  const startBtn   = el("button", { type: "button", class: "pom-btn pom-btn--primary", "aria-label": "Start"  }, [iconNode("play",         { size: 16 })]);
  const pauseBtn   = el("button", { type: "button", class: "pom-btn pom-btn--ghost",   "aria-label": "Pause"  }, [iconNode("pause",        { size: 16 })]);
  const skipBtn    = el("button", { type: "button", class: "pom-btn pom-btn--ghost",   "aria-label": "Skip"   }, [iconNode("skip-forward", { size: 16 })]);
  const resetBtn   = el("button", { type: "button", class: "pom-btn pom-btn--ghost",   "aria-label": "Reset"  }, [iconNode("refresh",      { size: 16 })]);

  const widget = el("div", { class: "pom-widget" }, [
    el("div", { class: "pom-display" }, [phaseEl, timerEl]),
    dotsEl,
    el("div", { class: "pom-controls" }, [startBtn, pauseBtn, skipBtn, resetBtn])
  ]);
  mount.appendChild(widget);

  // ---- Local tick loop --------------------------------------------------

  let tickId = null;
  let localState = null;
  let autopausing = false;

  function renderState(state) {
    localState = state;
    if (!state || state.phase === "idle") {
      phaseEl.textContent = "Ready";
      timerEl.textContent = formatMs(phaseDuration("work", state?.settings || cfg) || (cfg.workMinutes * 60_000));
      startBtn.hidden = false; pauseBtn.hidden = true;
      updateDots(state?.sessionCount || 0, state?.settings?.sessionsBeforeLongBreak || cfg.sessionsBeforeLongBreak);
      document.title = "New Tab";
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
        notify(
          next === "work" ? "Time to focus!" : "Break time!",
          next === "work"
            ? `${state.settings.workMinutes} min focus session starting.`
            : `Take a ${next === "long-break" ? state.settings.longBreakMinutes : state.settings.breakMinutes} min break.`
        );
        toast(`${phaseLabel(next)} session started.`, "info");
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
    document.title = "New Tab";
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
    document.title = "New Tab";
  });

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
  if (chrome?.storage?.onChanged) {
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
    chrome.storage.onChanged.addListener(handler);
    storageUnlisten = () => chrome.storage.onChanged.removeListener(handler);
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
    document.removeEventListener("visibilitychange", onVisibility);
    storageUnlisten?.();
    document.title = "New Tab";
  };
}
