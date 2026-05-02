// Vantage v1.1.0 — Ambient sound panel.
//
// Five Web-Audio-synthesized soundscapes (white / pink / brown noise,
// rain, café). No shipped audio assets. Pauses on tab blur,
// resumes on tab focus IF currently playing. Never auto-plays
// without a user gesture (autoplay policy compliance).

import { el, clear, toast } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { saveSettings } from "../storage.js";
import { playAmbient, stopAmbient, setVolume, isPlaying } from "../utils/ambient-audio.js";

const SOUNDS = [
  { value: "rain",  label: "Rain"        },
  { value: "white", label: "White noise" },
  { value: "pink",  label: "Pink noise"  },
  { value: "brown", label: "Brown noise" },
  { value: "cafe",  label: "Café murmur" }
];

let blurHandlerInstalled = false;

export function renderAmbient(mount, settings, { onAttachDragHandle, onChange } = {}) {
  clear(mount);
  const cfg = settings.ambient;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const persist = async () => {
    await saveSettings(settings);
    onChange?.(settings);
  };

  // Pause-on-blur — install once per page lifetime.
  if (!blurHandlerInstalled) {
    blurHandlerInstalled = true;
    document.addEventListener("visibilitychange", () => {
      // Only stop if currently playing — don't auto-restart on focus.
      // Users who re-enter the tab can hit play again; surprise audio
      // is the worst possible UX.
      if (document.hidden && isPlaying()) stopAmbient();
    });
  }

  const dragSpan = el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) });
  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      dragSpan,
      el("h2", { class: "panel-header__title" }, [iconNode("play", { size: 14 }), " Ambient"])
    ]),
    el("div", { class: "panel-header__right" })
  ]);
  mount.appendChild(header);
  if (onAttachDragHandle) onAttachDragHandle(dragSpan);

  const body = el("div", { class: "panel-body ambient-body" });
  mount.appendChild(body);

  const playing = isPlaying();

  const select = el("select", { class: "text-input ambient-sound-select", "aria-label": "Ambient sound" },
    SOUNDS.map(s => el("option", { value: s.value, selected: cfg.sound === s.value }, [s.label]))
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
    "aria-label": "Volume",
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
        stopAmbient();
        playBtn.classList.remove("ambient-play-btn--playing");
        playBtn.setAttribute("aria-pressed", "false");
        playBtn.replaceChildren(iconNode("play", { size: 14 }), document.createTextNode(" Play"));
      } else {
        try {
          await playAmbient(cfg.sound, cfg.volume);
          playBtn.classList.add("ambient-play-btn--playing");
          playBtn.setAttribute("aria-pressed", "true");
          playBtn.replaceChildren(iconNode("pause", { size: 14 }), document.createTextNode(" Stop"));
        } catch (err) {
          toast(`Couldn't start audio — ${err?.message?.toLowerCase() || "unknown error"}.`, "error");
        }
      }
    }
  }, [
    iconNode(playing ? "pause" : "play", { size: 14 }),
    document.createTextNode(playing ? " Stop" : " Play")
  ]);

  body.appendChild(el("div", { class: "ambient-controls" }, [select, playBtn]));
  body.appendChild(el("div", { class: "ambient-volume-row" }, [
    el("span", { class: "ambient-volume-label", "aria-hidden": "true" }, ["Vol"]),
    volSlider
  ]));
}
