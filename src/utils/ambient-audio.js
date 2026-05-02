// Vantage v1.1.0 — Web Audio synthesized ambient soundscapes.
//
// Five presets, all generated on-the-fly (no shipped audio assets):
//   white  — flat-spectrum noise
//   pink   — 1/f-filtered noise (pleasant for focus)
//   brown  — 1/f² noise (low-end "ocean roar")
//   rain   — pink noise + filtered transient bursts (drips)
//   cafe   — pink noise + slow LFO-modulated formants (background murmur)
//
// One AudioContext per page (created lazily on first play to comply
// with the autoplay policy — must follow a user gesture). The
// `currentSource` ref is what we tear down when the user switches
// presets or stops playback.

let ctx = null;
let masterGain = null;
let currentSource = null;
let currentKind = null;

function ensureContext() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);
  return ctx;
}

/** Build a 2-second buffer of white noise — long enough that the
 *  loop-point isn't audible, short enough that init is instant. */
function makeWhiteNoiseBuffer(audioCtx) {
  const buf = audioCtx.createBuffer(2, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

/** Pink-noise approximation via the Voss-McCartney algorithm.
 *  Direct-implements the filter so we don't need an AudioWorklet. */
function makePinkNoiseBuffer(audioCtx) {
  const buf = audioCtx.createBuffer(2, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

/** Brown noise — integrated white, clipped. Deeper rumble. */
function makeBrownNoiseBuffer(audioCtx) {
  const buf = audioCtx.createBuffer(2, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

function startNoise(audioCtx, bufferFn) {
  const src = audioCtx.createBufferSource();
  src.buffer = bufferFn(audioCtx);
  src.loop = true;
  const filt = audioCtx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 8000;
  src.connect(filt);
  filt.connect(masterGain);
  src.start();
  return { stop: () => { try { src.stop(); } catch {} } };
}

function startRain(audioCtx) {
  // Pink noise base + occasional bandpass-filtered transient bursts
  // every 80–250 ms to sound like falling drops on a tin roof.
  const src = audioCtx.createBufferSource();
  src.buffer = makePinkNoiseBuffer(audioCtx);
  src.loop = true;

  // Hi-pass rolls off the dull rumble; bandpass colors it.
  const hi = audioCtx.createBiquadFilter();
  hi.type = "highpass";
  hi.frequency.value = 600;
  const bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.4;

  src.connect(hi);
  hi.connect(bp);
  bp.connect(masterGain);
  src.start();

  // Drop bursts via short ASR envelopes on a separate noise generator.
  let dropTimer = null;
  const scheduleDrop = () => {
    const drop = audioCtx.createBufferSource();
    drop.buffer = makeWhiteNoiseBuffer(audioCtx);
    const dropFilt = audioCtx.createBiquadFilter();
    dropFilt.type = "bandpass";
    dropFilt.frequency.value = 2000 + Math.random() * 4000;
    dropFilt.Q.value = 8;
    const dropGain = audioCtx.createGain();
    dropGain.gain.value = 0;
    drop.connect(dropFilt);
    dropFilt.connect(dropGain);
    dropGain.connect(masterGain);
    const now = audioCtx.currentTime;
    const peak = 0.05 + Math.random() * 0.1;
    dropGain.gain.setValueAtTime(0, now);
    dropGain.gain.linearRampToValueAtTime(peak, now + 0.005);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    drop.start(now);
    drop.stop(now + 0.12);
    dropTimer = setTimeout(scheduleDrop, 80 + Math.random() * 170);
  };
  scheduleDrop();

  return {
    stop: () => {
      try { src.stop(); } catch {}
      if (dropTimer) clearTimeout(dropTimer);
    }
  };
}

function startCafe(audioCtx) {
  // Pink-noise base with slow LFO-modulated formants (vowel-like
  // peaks at ~400/1700/2400 Hz) to mimic distant conversational
  // murmur. Subtle low-shelf for room tone.
  const src = audioCtx.createBufferSource();
  src.buffer = makePinkNoiseBuffer(audioCtx);
  src.loop = true;

  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3000;

  const formants = [400, 1700, 2400].map(freq => {
    const f = audioCtx.createBiquadFilter();
    f.type = "peaking";
    f.frequency.value = freq;
    f.Q.value = 8;
    f.gain.value = 6;
    return f;
  });

  src.connect(lp);
  let chain = lp;
  for (const f of formants) {
    chain.connect(f);
    chain = f;
  }
  chain.connect(masterGain);
  src.start();

  // Slow LFO on the first formant so the perceived "voice" wobbles.
  const lfo = audioCtx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 50;
  lfo.connect(lfoGain);
  lfoGain.connect(formants[0].frequency);
  lfo.start();

  return {
    stop: () => {
      try { src.stop(); } catch {}
      try { lfo.stop(); } catch {}
    }
  };
}

const STARTERS = {
  white: (c) => startNoise(c, makeWhiteNoiseBuffer),
  pink:  (c) => startNoise(c, makePinkNoiseBuffer),
  brown: (c) => startNoise(c, makeBrownNoiseBuffer),
  rain:  (c) => startRain(c),
  cafe:  (c) => startCafe(c)
};

/** Start playing the named preset. Volume is 0-100; a square-law
 *  taper matches perceived loudness. */
export async function playAmbient(kind, volume) {
  ensureContext();
  if (ctx.state === "suspended") await ctx.resume();
  stopAmbient();
  const starter = STARTERS[kind] || STARTERS.rain;
  currentSource = starter(ctx);
  currentKind = kind;
  setVolume(volume);
}

/** Stop whatever is playing. Idempotent. */
export function stopAmbient() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
    currentKind = null;
  }
  if (masterGain && ctx) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
  }
}

/** Live volume update (0-100). Square-law taper so the slider feels
 *  linear to the ear. */
export function setVolume(volume) {
  if (!masterGain || !ctx) return;
  const v = Math.max(0, Math.min(100, Number(volume) || 0)) / 100;
  const g = v * v;
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(g, ctx.currentTime + 0.05);
}

export function getCurrentKind() { return currentKind; }
export function isPlaying() { return !!currentSource; }
