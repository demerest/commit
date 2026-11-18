/* COMMIT — procedural sound only (oscillators + filtered noise, created at runtime). No audio files.
   Bed/master levels live in js/constants.js; the per-effect numbers below are each sound's
   timbre recipe (pitch, duration, filter), kept next to the effect they describe. */
"use strict";

const SND = {
  ctx: null, master: null, noiseBuf: null,
  wind: null, hum: null, slide: null,
  on: LS.get("commit.snd") !== false
};

/* Lazily build the AudioContext (first user gesture) plus the shared noise buffer
   and the continuous altitude wind bed. Returns null when muted/unsupported. */
function audio() {
  if (!SND.on) return null;
  if (!SND.ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const c = new AC();
      SND.ctx = c;
      SND.master = c.createGain();
      SND.master.gain.value = MASTER_GAIN;
      SND.master.connect(c.destination);

      const nb = c.createBuffer(1, c.sampleRate * NOISE_BUFFER_SECONDS, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      SND.noiseBuf = nb;

      /* wind bed: looped noise -> bandpass -> gain, swelled by a slow LFO */
      const src = c.createBufferSource();
      src.buffer = nb;
      src.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = WIND_FILTER_FREQ;
      bp.Q.value = WIND_FILTER_Q;
      const wg = c.createGain();
      wg.gain.value = 0;
      const lfo = c.createOscillator();
      lfo.frequency.value = WIND_LFO_RATE;
      const lg = c.createGain();
      lg.gain.value = WIND_LFO_DEPTH;
      lfo.connect(lg);
      lg.connect(wg.gain);
      src.connect(bp);
      bp.connect(wg);
      wg.connect(SND.master);
      src.start();
      lfo.start();
      SND.wind = { src, bp, wg };
    } catch (e) {
      SND.ctx = null;
      return null;
    }
  }
  if (SND.ctx.state === "suspended") SND.ctx.resume().catch(() => {});
  return SND.ctx;
}

/* one oscillator blip, optionally gliding freq -> glideTo over dur seconds */
function tone(freq, dur, type, vol, glideTo) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(SND.master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/* one filtered noise burst */
function noiseHit(dur, vol, freq, filterType) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const s = c.createBufferSource();
  s.buffer = SND.noiseBuf;
  const f = c.createBiquadFilter();
  f.type = filterType || "lowpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(SND.master);
  s.start(t);
  s.stop(t + dur + 0.02);
}

/* Named one-shot effects. opts carries context (impact speed, chain length, stage...). */
function sfx(name, opts) {
  if (!SND.on) return;
  opts = opts || {};
  try {
    switch (name) {
      case "aim": // soft pick-up blip
        tone(660, 0.05, "sine", 0.04);
        break;
      case "puff": // weak drag cancelled
        noiseHit(0.08, 0.05, 700);
        break;
      case "launch": // whoosh + rising body
        noiseHit(0.22, 0.1, 900, "bandpass");
        tone(160, 0.2, "triangle", 0.07, 440);
        break;
      case "forced": // fuse expired: harsher commit
        noiseHit(0.16, 0.12, 1400, "bandpass");
        tone(720, 0.16, "sawtooth", 0.07, 180);
        break;
      case "tick": // fuse countdown, urgent = higher/louder
        tone(opts.urgent ? 1180 : 820, 0.04, "square", opts.urgent ? 0.06 : 0.035);
        break;
      case "land": { // thud scaled by impact speed
        const i = opts.impact || 0;
        tone(80, 0.13, "sine", Math.min(0.22, 0.07 + i / 5000), 45);
        noiseHit(0.06, Math.min(0.12, 0.04 + i / 9000), 320);
        break;
      }
      case "wall": // side scrape
        noiseHit(0.05, 0.09, 500);
        tone(130, 0.06, "square", 0.04);
        break;
      case "bonk": // ceiling strike, downward blip
        tone(330, 0.09, "square", 0.07, 170);
        break;
      case "bounce": { // boing, pitch rises with chain length
        const f = 300 * (1 + (opts.chain || 0) * 0.16);
        tone(f, 0.16, "sine", 0.1, f * 2.4);
        noiseHit(0.07, 0.05, 1200, "bandpass");
        break;
      }
      case "crack": // crumble warning, stage 1..3 brightens
        noiseHit(0.09, 0.05 + (opts.stage || 0) * 0.02, 420 + (opts.stage || 0) * 260, "bandpass");
        tone(150 + (opts.stage || 0) * 60, 0.06, "square", 0.03);
        break;
      case "shatter": // ledge breaks
        noiseHit(0.34, 0.16, 300);
        tone(90, 0.34, "sawtooth", 0.1, 38);
        tone(520, 0.12, "square", 0.05, 120);
        break;
      case "reform": // ledge returns, rising glass
        tone(420, 0.18, "sine", 0.05, 880);
        noiseHit(0.1, 0.03, 1600, "bandpass");
        break;
      case "ice": { // glassy landing, brighter with impact
        const i = opts.impact || 0;
        tone(900 + i / 4, 0.14, "sine", 0.06, 2200 + i / 3);
        noiseHit(0.09, 0.045, 4200, "highpass");
        break;
      }
      case "slip": // slid off the edge
        tone(520, 0.22, "sine", 0.06, 140);
        noiseHit(0.12, 0.04, 2600, "highpass");
        break;
      case "move": { // mechanical landing clank
        const i = opts.impact || 0;
        tone(190, 0.1, "square", 0.05, 120);
        tone(760 + i / 6, 0.05, "sine", 0.04);
        noiseHit(0.07, 0.05, 900, "bandpass");
        break;
      }
      case "reverse": // conveyor reversal tick-tock, direction-pitched
        tone(opts.dir > 0 ? 520 : 390, 0.05, "square", 0.035);
        break;
      case "queue": // pre-aim latched for landing
        tone(520, 0.06, "square", 0.045, 760);
        noiseHit(0.05, 0.04, 2600, "highpass");
        break;
      case "phase": { // diegetic clock tick: soft woodblock, local = underfoot
        const vol = opts.local ? PHASE_TICK_LOCAL_VOL : PHASE_TICK_NEAR_VOL;
        tone(opts.on ? 660 : 440, 0.07, "sine", vol, opts.on ? 520 : 330);
        if (opts.local) noiseHit(0.03, 0.012, 2400, "highpass");
        break;
      }
      case "phaseout": // ghosted out from under you
        tone(320, 0.14, "sine", 0.05, 120);
        noiseHit(0.1, 0.04, 1800, "highpass");
        break;
      case "dirspring": { // boing pitched by the authored vector's angle/speed
        const a = Math.atan2(opts.vy || DIR_DEFAULT_VY, opts.vx || 0);
        const f = 300 + Math.round((a / Math.PI) * 160) + Math.abs(opts.vx || 0) / 6;
        tone(f, 0.16, "sine", 0.1, f * 2.2);
        noiseHit(0.07, 0.05, 1400, "bandpass");
        break;
      }
      case "fall": // long descending alarm
        tone(540, 0.55, "sawtooth", 0.08, 80);
        break;
      case "win": // C-major arpeggio
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, "triangle", 0.09), i * 95));
        break;
      case "ui":
        tone(880, 0.03, "sine", 0.035);
        break;
      case "erase":
        tone(180, 0.18, "sine", 0.07, 55);
        break;
      case "copy":
        tone(1046, 0.07, "sine", 0.05);
        break;
      case "unlock": // tower-unlock fanfare
        [659, 880, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.07), i * 80));
        break;
    }
  } catch (e) {}
}

/* ---------- continuous voices ---------- */
function startHum() {
  const c = audio();
  if (!c || SND.hum) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.value = HUM_FREQ;
    g.gain.value = 0;
    o.connect(g);
    g.connect(SND.master);
    o.start();
    g.gain.setTargetAtTime(HUM_GAIN, c.currentTime, HUM_GLIDE);
    SND.hum = { o, g };
  } catch (e) {}
}
function stopHum() {
  if (!SND.hum) return;
  const h = SND.hum;
  SND.hum = null;
  try {
    h.g.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.03);
    setTimeout(() => { try { h.o.stop(); } catch (e) {} }, HUM_STOP_MS);
  } catch (e) {}
}

/* quiet slick scrape while sliding on ice */
function startSlide() {
  const c = audio();
  if (!c || SND.slide) return;
  try {
    const s = c.createBufferSource();
    s.buffer = SND.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = SLIDE_FILTER_FREQ;
    const g = c.createGain();
    g.gain.value = 0;
    s.connect(f);
    f.connect(g);
    g.connect(SND.master);
    s.start();
    g.gain.setTargetAtTime(SLIDE_GAIN, c.currentTime, SLIDE_GLIDE);
    SND.slide = { s, g };
  } catch (e) {}
}
function stopSlide() {
  if (!SND.slide) return;
  const h = SND.slide;
  SND.slide = null;
  try {
    h.g.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.05);
    setTimeout(() => { try { h.s.stop(); } catch (e) {} }, SLIDE_STOP_MS);
  } catch (e) {}
}

/* ---------- mute switch ---------- */
function applySoundBtn() {
  const b = $("bSound");
  b.classList.toggle("off", !SND.on);
  b.setAttribute("aria-pressed", String(SND.on));
  b.setAttribute("aria-label", SND.on ? "Mute sound" : "Unmute sound");
}
function setSound(on, silent) {
  SND.on = on;
  LS.set("commit.snd", on);
  applySoundBtn();
  if (SND.ctx) {
    try {
      if (on) {
        SND.ctx.resume().catch(() => {});
        SND.master.gain.setTargetAtTime(MASTER_GAIN, SND.ctx.currentTime, MASTER_GLIDE);
      } else {
        SND.master.gain.setTargetAtTime(0, SND.ctx.currentTime, MASTER_GLIDE);
      }
    } catch (e) {}
  }
  if (on) sfx("ui");
  if (!silent) toast(on ? "SOUND ON" : "SOUND OFF");
}
