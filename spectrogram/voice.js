// Spectrogram voices: one model drives the sound and the picture.
// Each voice is a partial table, a two-pole low-pass and an envelope.
// The waterfall reads the model, so it draws while the sound is muted.
import { sound, linFit } from '../shared/stim.js';

// Pitch runs in semitones from C2, 0 to 60, up the stage.
export const F_LO = 65.406, SPAN = 60, K_MAX = 28;
export const hz = p => F_LO * Math.pow(2, p / 12);
const Q_DB = -3, Q_LIN = Math.pow(10, Q_DB / 20);

// Partial tables, index 1 is the fundamental.
const table = fn => Float32Array.from({ length: K_MAX + 1 }, (_, k) => (k ? fn(k) : 0));
export const KINDS = {
  // Glass: few soft partials and a long ring.
  glass: { amps: table(k => (k <= 7 ? 1 / (k * k * k * 0.6 + 0.4) : 0)), attack: 0.035, release: 0.6, close: 1.2, chiff: 0.35, gain: 0.3 },
  // Reed: odd partials only, so the brush has gaps.
  reed: { amps: table(k => (k % 2 ? 1 / k : 0)), attack: 0.018, release: 0.2, close: 0.16, chiff: 0.5, gain: 0.2 },
  // Bow: every partial, like a bowed string.
  bow: { amps: table(k => 1 / k), attack: 0.07, release: 0.3, close: 0.25, chiff: 0.7, gain: 0.17 },
};

// The two-pole low-pass at f, as Web Audio's biquad draws it.
function lp(f, fc) {
  const r = f / fc;
  return 1 / Math.sqrt((1 - r * r) * (1 - r * r) + (r / Q_LIN) * (r / Q_LIN));
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);

// The ink colour of a pitch: once round the hue wheel per octave.
// A table of 48 hues, read with a blend, keeps culori out of the frame.
const HUES = Array.from({ length: 49 }, (_, i) => linFit(0.8, 0.16, (i / 48) * 360 + 35));
export function inkOf(p, out = [0, 0, 0]) {
  const x = ((((p % 12) + 12) % 12) / 12) * 48, i = Math.floor(x), f = x - i, a = HUES[i], b = HUES[i + 1];
  for (let j = 0; j < 3; j++) out[j] = a[j] + (b[j] - a[j]) * f;
  return out;
}

/* ---------- the model ---------- */
let nextId = 1;
export function makeVoices() {
  const list = [];
  const S = { kind: 'bow', list, chiffs: [] };

  // A note starts at pitch p, brightness b, pan x.
  S.on = (p, b, pan = 0, tag = null) => {
    // The oldest fading voice gives way past eight.
    if (list.length >= 8) {
      const old = list.find(v => !v.gate) || list[0];
      old.dead = true;
      list.splice(list.indexOf(old), 1);
    }
    const K = KINDS[S.kind];
    const v = {
      id: nextId++, tag, kind: S.kind, K, gate: true, dead: false,
      p, pT: p, b, bT: b, pan, env: 0, held: 0, rel: 0, vibAmt: 0,
      vib: Math.random() * 6.28, rate: jit(5.5, 0.08), depth: jit(0.22, 0.2), ink: inkOf(p),
      chiff: K.chiff * jit(1, 0.25), audio: null,
    };
    list.push(v);
    return v;
  };
  S.off = v => { if (v && v.gate) { v.gate = false; v.rel = 0; } };
  S.offAll = () => list.forEach(S.off);
  S.find = tag => list.find(v => v.tag === tag && v.gate);

  // One step of every voice.
  S.step = (dt, calm = false) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const v = list[i], K = v.K;
      // A short glide joins the pointer's jumps.
      v.p += (v.pT - v.p) * (1 - Math.exp(-dt / 0.028));
      v.b += (v.bT - v.b) * (1 - Math.exp(-dt / 0.06));
      v.vib += 2 * Math.PI * v.rate * dt;
      v.chiff *= Math.exp(-dt / 0.03);
      if (v.gate) {
        v.held += dt;
        v.env = Math.min(1, v.env + dt / K.attack);
      } else {
        v.rel += dt;
        v.env *= Math.exp(-dt / K.release);
        if (v.env < 0.012) { v.dead = true; list.splice(i, 1); continue; }
      }
      inkOf(v.p, v.ink);
      // A held note grows a vibrato after a third of a second.
      v.vibAmt = calm ? 0 : v.depth * smooth(0.35, 1.2, v.held);
    }
  };
  // The sounding pitch, with vibrato.
  S.pitch = v => v.p + v.vibAmt * Math.sin(v.vib);
  // The low-pass cutoff: it tracks brightness and closes on release.
  S.cutoff = v => hz(S.pitch(v)) * (1.1 + 15 * Math.pow(v.b, 1.6)) * (v.gate ? 1 : Math.max(0.35, Math.exp(-v.rel / v.K.close)));
  // The level of partial k, before the envelope.
  S.partial = (v, k, f0, fc) => v.K.amps[k] * lp(k * f0, fc);
  S.busy = () => list.length > 0;
  return S;
}

/* ---------- the sound ---------- */
// Raw Web Audio on the shared kit. It follows the model each frame.
export function voiceSound(kit) {
  let room = null, waves = null, bus = null, rush = null;
  const ctx = () => (sound.on && kit.ac ? kit.live() : null);

  // A short synthetic room: a stereo tail of soft noise.
  function build(ac) {
    waves = {};
    for (const [name, K] of Object.entries(KINDS)) {
      const n = K_MAX + 1, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = K.amps[k];
      waves[name] = ac.createPeriodicWave(re, im);
    }
    bus = ac.createGain();
    bus.gain.value = 1;
    bus.connect(kit.out);
    const len = Math.round(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lo = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ac.sampleRate;
        // The tail darkens as it decays.
        lo += (Math.random() * 2 - 1 - lo) * (0.5 * Math.exp(-t * 1.6) + 0.05);
        d[i] = lo * Math.exp(-t * 2.6) * (t < 0.012 ? t / 0.012 : 1);
      }
    }
    room = ac.createConvolver();
    room.buffer = ir;
    const wet = ac.createGain();
    wet.gain.value = 0.32;
    room.connect(wet).connect(kit.out);
  }

  function start(ac, v, S) {
    if (!waves) build(ac);
    const t = ac.currentTime;
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), pn = ac.createStereoPanner();
    o.setPeriodicWave(waves[v.kind]);
    o.frequency.value = hz(S.pitch(v));
    f.type = 'lowpass'; f.Q.value = Q_DB; f.frequency.value = Math.min(18000, S.cutoff(v));
    g.gain.value = 0;
    pn.pan.value = v.pan;
    o.connect(f).connect(g).connect(pn);
    pn.connect(bus); pn.connect(room);
    o.start(t);
    // The onset chiff: a puff of filtered noise round the cutoff.
    if (kit.noise && v.chiff > 0.05) {
      const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
      n.buffer = kit.noise;
      bp.type = 'bandpass'; bp.frequency.value = Math.min(9000, jit(S.cutoff(v) * 0.8, 0.2)); bp.Q.value = 1.2;
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(jit(0.05, 0.3) * v.chiff, t + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + jit(0.06, 0.2));
      n.connect(bp).connect(ng).connect(pn);
      n.start(t, Math.random() * 0.5); n.stop(t + 0.1);
    }
    v.audio = { o, f, g, pn, lvl: jit(1, 0.06) };
  }
  function drop(v) {
    const a = v.audio;
    if (!a) return;
    v.audio = null;
    const t = kit.ac ? kit.ac.currentTime : 0;
    a.g.gain.cancelScheduledValues(t);
    a.g.gain.setTargetAtTime(0, t, 0.02);
    try { a.o.stop(t + 0.12); } catch { /* already stopped */ }
    a.o.onended = () => a.pn.disconnect();
  }
  // Every voice that holds audio nodes.
  const live = new Set();

  return {
    // Per frame: each live voice follows its model.
    update(S) {
      const ac = ctx();
      // A voice the model dropped stops here.
      for (const v of live) if (v.dead || !v.audio) { drop(v); live.delete(v); }
      if (!ac || !kit.out) { for (const v of live) drop(v); live.clear(); return; }
      const t = ac.currentTime;
      for (const v of S.list) {
        if (!v.audio) { if (v.gate) { start(ac, v, S); live.add(v); } else continue; }
        const a = v.audio;
        // High notes play softer, as the ear hears them louder.
        const lvl = v.K.gain * a.lvl * (1 - 0.45 * Math.min(1, v.p / SPAN));
        a.o.frequency.setTargetAtTime(hz(S.pitch(v)), t, 0.006);
        a.f.frequency.setTargetAtTime(Math.min(18000, S.cutoff(v)), t, 0.015);
        a.g.gain.setTargetAtTime(v.env * lvl, t, 0.008);
        a.pn.pan.setTargetAtTime(v.pan, t, 0.05);
      }
    },
    // Clear: a soft rush of noise that falls in pitch.
    rush() {
      const ac = ctx();
      if (!ac || !kit.noise) return;
      if (!waves) build(ac);
      const t = ac.currentTime, n = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(), pn = ac.createStereoPanner();
      n.buffer = kit.noise; n.loop = true;
      bp.type = 'bandpass'; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(jit(3200, 0.1), t);
      bp.frequency.exponentialRampToValueAtTime(jit(380, 0.1), t + 0.6);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(jit(0.09, 0.2), t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      pn.pan.setValueAtTime(0.5, t);
      pn.pan.linearRampToValueAtTime(-0.7, t + 0.65);
      n.connect(bp).connect(g).connect(pn).connect(kit.out);
      n.start(t); n.stop(t + 0.75);
      rush = n;
      n.onended = () => { pn.disconnect(); if (rush === n) rush = null; };
    },
    busy: () => !!rush || live.size > 0,
    hide() { for (const v of live) drop(v); live.clear(); try { rush?.stop(); } catch { /* already stopped */ } kit.ac?.suspend()?.catch(() => {}); },
  };
}
