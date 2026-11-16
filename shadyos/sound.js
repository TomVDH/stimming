// ShadyOS sound: all synthesized, all through the shared kit.
// Every hit jitters in pitch, time and level, and pans with its window.
import { audioKit } from '../shared/stim.js';

export const kit = audioKit({ keys: new Set([' ']) });
const J = (a = 1, k = 0.06) => a * (1 + (Math.random() - 0.5) * 2 * k);
let hum = null, whine = null, hummed = 'low', chimed = false;
const HUM = { off: 0, low: 0.012, on: 0.03 };

function out(ac, pan = 0) {
  if (!pan || !ac.createStereoPanner) return kit.out;
  const p = ac.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, pan)); p.connect(kit.out);
  return p;
}
function startHum(ac) {
  if (hum) return;
  hum = ac.createGain(); hum.gain.value = HUM[hummed]; hum.connect(kit.out);
  [60, 120, 180].forEach((f, i) => { const o = ac.createOscillator(); o.frequency.value = f; const gg = ac.createGain(); gg.gain.value = [1, 0.5, 0.25][i]; o.connect(gg); gg.connect(hum); o.start(); });
  // The inverter whine: thin and high, under the hum.
  whine = ac.createGain(); whine.gain.value = hummed === 'off' ? 0 : 0.0016; whine.connect(kit.out);
  const o = ac.createOscillator(); o.frequency.value = 7800; o.connect(whine); o.start();
}
export function setHum(level) {
  hummed = level;
  if (!hum) return;
  const t = hum.context.currentTime;
  hum.gain.setTargetAtTime(HUM[level] ?? HUM.low, t, 0.2);
  whine.gain.setTargetAtTime(level === 'off' ? 0 : 0.0016, t, 0.2);
}
export function voice() { const ac = kit.live(); if (ac) { startHum(ac); if (!chimed) { chimed = true; chime(ac); } } return ac; }

function noise(ac, { type = 'bandpass', f = 2600, q = 2, gain = 0.2, dur = 0.03, pan = 0, at = 0, rate = 1 } = {}) {
  if (!kit.noise) return;
  const s = ac.createBufferSource(); s.buffer = kit.noise; s.playbackRate.value = J(rate, 0.15);
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = J(f, 0.15); fl.Q.value = q;
  const gg = ac.createGain(), t = ac.currentTime + at + Math.random() * 0.006;
  gg.gain.setValueAtTime(J(gain, 0.2), t); gg.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(fl); fl.connect(gg); gg.connect(out(ac, pan)); s.start(t, Math.random() * 0.5, dur + 0.05);
}
function tone(ac, f, { type = 'sine', gain = 0.08, at = 0, dur = 0.9, attack = 0.005, pan = 0, bend = 0 } = {}) {
  const o = ac.createOscillator(), gg = ac.createGain(), t = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(J(f, 0.003), t);
  if (bend) o.frequency.exponentialRampToValueAtTime(f * bend, t + dur);
  gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(J(gain, 0.15), t + attack); gg.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(gg); gg.connect(out(ac, pan)); o.start(t); o.stop(t + dur + 0.05);
}

export function click(pan = 0) { const ac = voice(); if (ac) noise(ac, { pan, gain: 0.2 }); }
// A glassy two-note ding, one step higher per dialog.
export function ding(i = 0, pan = 0) {
  const ac = voice(); if (!ac) return;
  const base = 440 * Math.pow(2, (i * 2 + Math.random() * 0.2) / 12);
  [[base, 0.09], [base * 1.5, 0.05], [base * 2.76, 0.025]].forEach(([f, a], k) => tone(ac, f, { gain: a, at: k * 0.06, pan }));
}
export function whoosh(down, pan = 0) {
  const ac = voice(); if (!ac || !kit.noise) return;
  const s = ac.createBufferSource(); s.buffer = kit.noise; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
  const t = ac.currentTime; f.frequency.setValueAtTime(down ? 2400 : 400, t); f.frequency.exponentialRampToValueAtTime(down ? 380 : 2400, t + 0.5);
  const gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(J(0.12), t + 0.1); gg.gain.linearRampToValueAtTime(0, t + 0.55);
  s.connect(f); f.connect(gg); gg.connect(out(ac, pan)); s.start(t); s.stop(t + 0.6);
}
// The startup chord: slow bells that sag a little out of tune.
export function chime(ac = kit.live()) {
  if (!ac) return;
  [[196, 0], [293.7, 0.12], [370, 0.26], [587.3, 0.42], [740, 0.6]].forEach(([f, at], i) => {
    tone(ac, f, { gain: 0.05, at, dur: 3.2, attack: 0.04, bend: 0.985 - i * 0.002 });
    tone(ac, f * 2.01, { gain: 0.012, at, dur: 2.2, attack: 0.02, bend: 0.98 });
  });
}
// Paper and glass crumpled into the Bin.
export function crunch(pan = 0) {
  const ac = voice(); if (!ac) return;
  for (let i = 0; i < 9; i++) noise(ac, { type: 'highpass', f: 1500 + Math.random() * 3000, q: 0.7, gain: 0.12, dur: 0.04 + Math.random() * 0.05, at: i * 0.03 + Math.random() * 0.02, pan });
}
// The nudge: a low angry buzz.
export function buzz() {
  const ac = voice(); if (!ac) return;
  tone(ac, 55, { type: 'square', gain: 0.05, dur: 0.45, attack: 0.01 });
  tone(ac, 82, { type: 'sawtooth', gain: 0.03, dur: 0.4, attack: 0.01 });
}
// A crash: one ugly tone down, and noise.
export function crashTone() {
  const ac = voice(); if (!ac) return;
  tone(ac, 440, { type: 'square', gain: 0.05, dur: 0.6, bend: 0.25 });
  noise(ac, { type: 'lowpass', f: 900, q: 0.5, gain: 0.15, dur: 0.5 });
}
// A short boop for menus.
export function tick(pan = 0) { const ac = voice(); if (ac) tone(ac, 1800, { gain: 0.02, dur: 0.05, pan }); }
export function corner() {
  const ac = voice(); if (!ac) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, { type: 'triangle', gain: 0.06, at: i * 0.08, dur: 0.4 }));
}

// Dragging glass makes a soft rub that follows speed.
let rubber = null;
export function rub(on) {
  const ac = voice();
  if (on && ac && kit.noise && !rubber) {
    const s = ac.createBufferSource(); s.buffer = kit.noise; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.4;
    const gg = ac.createGain(); gg.gain.value = 0;
    s.connect(f); f.connect(gg); gg.connect(kit.out); s.start();
    rubber = { s, f, g: gg };
  } else if (!on && rubber) {
    const r = rubber; rubber = null; const t = r.g.context.currentTime;
    r.g.gain.setTargetAtTime(0, t, 0.05); r.s.stop(t + 0.3);
  }
}
export function rubSpeed(sp) {
  if (!rubber) return;
  const t = rubber.g.context.currentTime;
  rubber.g.gain.setTargetAtTime(Math.min(sp * 0.08, 0.09), t, 0.04);
  rubber.f.frequency.setTargetAtTime(600 + sp * 500, t, 0.05);
}

// The media player's loop: a sad little arpeggio over a bass.
let loop = null;
export function music(on) {
  if (!on) { if (loop) { clearTimeout(loop.t); loop = null; } return; }
  const ac = voice(); if (!ac || loop) return;
  const notes = [57, 60, 64, 67, 64, 60, 57, 55, 53, 57, 60, 65, 60, 57, 53, 52];
  const hz = n => 440 * Math.pow(2, (n - 69) / 12), stepT = 0.18;
  loop = { i: 0, next: ac.currentTime + 0.05, t: 0 };
  const run = () => {
    if (!loop) return;
    while (loop.next < ac.currentTime + 0.4) {
      const n = notes[loop.i % notes.length], at = loop.next - ac.currentTime;
      tone(ac, hz(n + 12), { type: 'triangle', gain: 0.035, at, dur: 0.3 });
      if (loop.i % 4 === 0) tone(ac, hz(n - 12), { type: 'sine', gain: 0.06, at, dur: 0.7 });
      if (loop.i % 2 === 1) noise(ac, { type: 'highpass', f: 7000, q: 0.5, gain: 0.03, dur: 0.03, at });
      loop.i++; loop.next += stepT;
    }
    loop.t = setTimeout(run, 120);
  };
  run();
}
export const playing = () => !!loop;
