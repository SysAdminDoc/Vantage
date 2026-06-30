// Vantage v1.1.0 — Ambient sound panel.
//
// Five Web-Audio-synthesized soundscapes (white / pink / brown noise,
// rain, café). No shipped audio assets. Pauses on tab blur,
// resumes on tab focus only after the user had started playback.
// Never starts fresh without a user gesture (autoplay policy compliance).

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { saveSettings } from "../storage.js";
import { playAmbient, stopAmbient, setVolume, isPlaying } from "../utils/ambient-audio.js";
import { i18n } from "../utils/i18n.js";

const SOUNDS = [
  { value: "rain",  label: "Rain",        key: "ambientSoundRain" },
  { value: "white", label: "White noise", key: "ambientSoundWhiteNoise" },
  { value: "pink",  label: "Pink noise",  key: "ambientSoundPinkNoise" },
  { value: "brown", label: "Brown noise", key: "ambientSoundBrownNoise" },
  { value: "cafe",  label: "Cafe murmur", key: "ambientSoundCafeMurmur" }
];

let blurHandlerInstalled = false;
let ambientSettingsRef = null;
let shouldResumeAfterBlur = false;
let resumeUiCallback = null;

export function renderAmbient(mount, settings, { onAttachDragHandle, onChange } = {}) {
  clear(mount);
  const cfg = settings.ambient;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    ambientSettingsRef = null;
    resumeUiCallback = null;
    shouldResumeAfterBlur = false;
    if (isPlaying()) stopAmbient();
    return;
  }
  mount.style.display = "";

  const persist = async () => {
    await saveSettings(settings);
    onChange?.(settings);
  };
  ambientSettingsRef = cfg;

  // Pause-on-blur — install once per page lifetime.
  if (!blurHandlerInstalled) {
    blurHandlerInstalled = true;
    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) {
        shouldResumeAfterBlur = isPlaying();
        if (shouldResumeAfterBlur) stopAmbient();
        return;
      }
      if (!shouldResumeAfterBlur || !ambientSettingsRef) return;
      shouldResumeAfterBlur = false;
      try {
        await playAmbient(ambientSettingsRef.sound, ambientSettingsRef.volume);
        resumeUiCallback?.();
      } catch (err) {
        toast(i18n("ambientResumeError", [err?.message?.toLowerCase() || i18n("unknownError", null, "unknown error")], "Couldn't resume audio - $1."), "error");
      }
    });
  }

  const dragSpan = el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) });
  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      dragSpan,
      el("h2", { class: "panel-header__title" }, [iconNode("play", { size: 14 }), ` ${i18n("ambientSounds")}`])
    ]),
    el("div", { class: "panel-header__right" })
  ]);
  mount.appendChild(header);
  if (onAttachDragHandle) onAttachDragHandle(dragSpan);

  const body = el("div", { class: "panel-body ambient-body" });
  mount.appendChild(body);

  const playing = isPlaying();
  const setButtonPlaying = (nextPlaying) => {
    playBtn.classList.toggle("ambient-play-btn--playing", nextPlaying);
    playBtn.setAttribute("aria-pressed", String(nextPlaying));
    playBtn.replaceChildren(
      iconNode(nextPlaying ? "pause" : "play", { size: 14 }),
      document.createTextNode(` ${nextPlaying ? i18n("stop", null, "Stop") : i18n("play", null, "Play")}`)
    );
  };

  const select = el("select", { class: "text-input ambient-sound-select", "aria-label": i18n("ambientSoundAria", null, "Ambient sound") },
    SOUNDS.map(s => el("option", { value: s.value, selected: cfg.sound === s.value }, [i18n(s.key, null, s.label)]))
  );
  select.addEventListener("change", async () => {
    cfg.sound = select.value;
    await persist();
    if (isPlaying()) {
      // Hot-swap: restart with new preset at the same volume.
      await playAmbient(cfg.sound, cfg.volume);
    }
  });

  const volSlider = el("input", {
    type: "range", min: "0", max: "100", step: "1",
    value: String(cfg.volume ?? 50),
    class: "ambient-volume-slider",
    "aria-label": i18n("volume", null, "Volume"),
    onInput: (e) => {
      cfg.volume = parseInt(e.target.value, 10);
      setVolume(cfg.volume);
    },
    onChange: () => persist()
  });

  const playBtn = el("button", {
    type: "button",
    class: `button button--ghost ambient-play-btn${playing ? " ambient-play-btn--playing" : ""}`,
    "aria-pressed": String(playing),
    onClick: async () => {
      if (isPlaying()) {
        shouldResumeAfterBlur = false;
        stopAmbient();
        setButtonPlaying(false);
      } else {
        try {
          await playAmbient(cfg.sound, cfg.volume);
          setButtonPlaying(true);
        } catch (err) {
          toast(i18n("ambientStartError", [err?.message?.toLowerCase() || i18n("unknownError", null, "unknown error")], "Couldn't start audio - $1."), "error");
        }
      }
    }
  }, [
    iconNode(playing ? "pause" : "play", { size: 14 }),
    document.createTextNode(` ${playing ? i18n("stop", null, "Stop") : i18n("play", null, "Play")}`)
  ]);
  resumeUiCallback = () => setButtonPlaying(true);

  body.appendChild(el("div", { class: "ambient-controls" }, [select, playBtn]));
  body.appendChild(el("div", { class: "ambient-volume-row" }, [
    el("span", { class: "ambient-volume-label", "aria-hidden": "true" }, [i18n("volumeShort", null, "Vol")]),
    volSlider
  ]));
}
