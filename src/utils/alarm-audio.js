// Vantage — Pomodoro alarm tone synthesis.
//
// Tones are generated via the Web Audio API rather than shipped as binary
// assets. Keeps the extension small, dodges the static-asset CSP rules in
// MV3 service workers, and matches the "vanilla JS, no build step,
// ship-readable" convention from the repo's stack file.
//
// Three preset tones are tuned to be distinct enough that users can tell
// session-end events apart by ear:
//
//   bell    — a single struck-bell at 880 Hz with a slow exponential decay.
//             Round, warm, soft attack — the "you're done, stretch" vibe.
//   chime   — a major-third arpeggio (C5, E5, G5) over 600 ms. Bright,
//             friendly, a little uplifting. Doesn't startle.
//   digital — three short square-wave beeps at 1.2 kHz. Old-school
//             timer-on-a-shelf energy. Cuts through ambient noise.
//
// All three are mixed against a master gain that scales with the user's
// configured volume (0-100). Custom uploads play through the same gain
// node so the volume slider applies to them too.

const AUDIO_CTX_SYMBOL = Symbol.for("vantage.alarmCtx");

function getAudioCtx() {
  // Lazily allocate one AudioContext per page. WebKit caps the number of
  // contexts a page can open; reusing one across alarm fires is necessary.
  let ctx = globalThis[AUDIO_CTX_SYMBOL];
  if (!ctx) {
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    globalThis[AUDIO_CTX_SYMBOL] = ctx;
  }
  // Browsers suspend the context when there's no user gesture. The
  // settings-page preview button is a gesture; the actual session-end
  // fire is timer-driven, so we resume() before scheduling — no-op if
  // already running.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function gainFor(volumeOutOfHundred) {
  const v = Math.max(0, Math.min(100, Number(volumeOutOfHundred) || 0)) / 100;
  // Square-law taper: matches how loudness is perceived against linear
  // slider movement. 60% on the slider → ~0.36 gain, which sits about
  // where users expect "noticeable but not jarring".
  return v * v;
}

function scheduleNote(ctx, master, { freq, type = "sine", startOffset, duration, peakGain = 0.4, attack = 0.01, release = null }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const env = ctx.createGain();
  env.gain.value = 0;

  osc.connect(env);
  env.connect(master);

  const t0 = ctx.currentTime + startOffset;
  const releaseTime = release ?? duration * 0.9;
  env.gain.cancelScheduledValues(t0);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(peakGain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function playBell(ctx, master) {
  // Two harmonics: fundamental at 880 Hz + octave at 1760 Hz with lower
  // gain — that ratio sounds "bell-like" without needing a wavetable.
  scheduleNote(ctx, master, { freq: 880,  type: "sine",     startOffset: 0, duration: 1.4, peakGain: 0.45, attack: 0.005 });
  scheduleNote(ctx, master, { freq: 1760, type: "triangle", startOffset: 0, duration: 1.0, peakGain: 0.18, attack: 0.005 });
}

function playChime(ctx, master) {
  // C5 (523.25), E5 (659.25), G5 (783.99) — major triad arpeggio.
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    scheduleNote(ctx, master, {
      freq,
      type: "sine",
      startOffset: i * 0.16,
      duration: 0.55,
      peakGain: 0.32,
      attack: 0.01
    });
  });
}

function playDigital(ctx, master) {
  // Three 80 ms beeps with 80 ms gaps. Square wave for the "tinny" timer feel.
  for (let i = 0; i < 3; i++) {
    scheduleNote(ctx, master, {
      freq: 1200,
      type: "square",
      startOffset: i * 0.16,
      duration: 0.08,
      peakGain: 0.22,
      attack: 0.002
    });
  }
}

const PRESET_PLAYERS = {
  bell:    playBell,
  chime:   playChime,
  digital: playDigital
};

/**
 * Play the configured alarm tone exactly once.
 *
 * @param {{ tone?: string, volume?: number, customAudio?: string }} alarm
 * @returns {Promise<void>}  resolves when the tone has finished or
 *                           rejects silently if audio is unavailable.
 */
export async function playAlarm(alarm) {
  if (!alarm || alarm.tone === "none") return;

  const ctx = getAudioCtx();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = gainFor(alarm.volume ?? 60);
  master.connect(ctx.destination);

  if (alarm.tone === "custom") {
    const data = (alarm.customAudio || "").trim();
    if (!data || !data.startsWith("data:")) return;
    try {
      // <audio> is the simplest path for arbitrary user-supplied formats
      // (mp3 / ogg / wav / m4a). Route through MediaElementSource so the
      // master gain still applies.
      const audio = new Audio(data);
      audio.crossOrigin = "anonymous";
      const src = ctx.createMediaElementSource(audio);
      src.connect(master);
      await audio.play();
    } catch {
      // Decode/play failure — silent fallback. The settings UI exposes
      // a Test button so users discover bad uploads before relying on
      // them at session-end.
    }
    return;
  }

  const player = PRESET_PLAYERS[alarm.tone] || PRESET_PLAYERS.bell;
  player(ctx, master);
}

/** Names of the preset tones, exposed for the settings UI dropdown. */
export const ALARM_PRESETS = Object.keys(PRESET_PLAYERS);
