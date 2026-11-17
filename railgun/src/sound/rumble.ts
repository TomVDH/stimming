// @ts-nocheck
// Load order: sound/gameover runs first.
import './gameover.ts';
import * as THREE from 'three';
import { state } from '../state.ts';
import { camera, clamp } from '../setup.ts';
import { chaos, rage } from '../play/charge.ts';
import { filt, hiss, jit, kit, pend, track, trackS } from './kit.ts';
import { plainVerb } from './hum.ts';

/* ---------- arcs and rumble ---------- */
// Every hit jitters in pitch, time and level.
let lastClick = 0;
const panV = new THREE.Vector3();
state.click = arc => {
  const ac = kit.live();
  if (!ac || ac.currentTime - lastClick < 0.05 - 0.025 * rage) return;
  lastClick = ac.currentTime;
  const t = ac.currentTime, dur = 0.012 + Math.random() * 0.018;
  const s = hiss(ac, t, dur + 0.02, 1.2), bp = filt(ac, 'bandpass', 2500 + Math.random() * 3500, 3), g = ac.createGain(), pan = ac.createStereoPanner();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime((0.03 + 0.03 * chaos + 0.05 * rage) * jit(0.3), t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  pan.pan.value = clamp(panV.copy(arc.a).project(camera).x, -0.8, 0.8);
  s.connect(bp).connect(g).connect(pan).connect(kit.out);
  track(t + dur + 0.05, s);
};
// The vent: a crash and a boom under the barrel.
state.ventSound = () => {
  const ac = kit.live();
  if (!ac) return;
  const t = ac.currentTime;
  const cr = hiss(ac, t, 1.6, 0.8), bp = filt(ac, 'bandpass', 900, 0.7), crG = ac.createGain();
  crG.gain.setValueAtTime(0.5, t); crG.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  cr.connect(bp).connect(crG).connect(kit.out);
  const o = ac.createOscillator(), og = ac.createGain();
  o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(24, t + 1.2);
  og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.6, t + 0.02); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(og).connect(kit.out); o.start(t); o.stop(t + 1.5);
  echo(ac, crG, 0.3); echo(ac, og, 0.3, 500);
  track(t + 1.7, cr, o);
};
// The arm cue: a low clunk with a short metal ring.
state.armSound = () => {
  const ac = kit.live();
  if (!ac) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), r = ac.createOscillator(), rg = ac.createGain();
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  r.frequency.value = 610 * jit(0.03);
  rg.gain.setValueAtTime(0.05, t); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  o.connect(g).connect(kit.out); r.connect(rg).connect(kit.out);
  o.start(t); o.stop(t + 0.4); r.start(t); r.stop(t + 1);
  track(t + 1.1, o, r);
};
// Tom's samples: a whoosh into an impact, then a far boom.
export const SAMPLES = { impact: 'impact.mp3', boom: 'boom.mp3', shot: 'shot.mp3' };
// The impact's peak sits 1.85 s into its file.
export const IMPACT_AT = 1.85;
const sampleP = {};
// A missing or failed sample resolves null and tries again next time.
export const sample = (ac, name) => (sampleP[name] ??= fetch(SAMPLES[name])
  .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
  .then(b => ac.decodeAudioData(b))
  .catch(() => { delete sampleP[name]; return null; }));
// Send a node into the plain's echoes, darkened above dark hertz.
// dest: a send bus in front of the echoes; the plain itself by default.
export function echo(ac, node, lvl, dark = 6000, dest = plainVerb(ac)) {
  const s = ac.createGain(), lp = filt(ac, 'lowpass', dark, 0.5);
  s.gain.value = lvl;
  node.connect(s).connect(lp).connect(dest);
}
// dark: lowpass corner in hertz, with a low shelf lift; 0 plays it plain.
// wet: the send into the plain's echoes. dest: the bus it feeds.
// tag: a salvo tag, so a Reset can stop the sample.
export function playSample(ac, buf, when, gain, rate, dark = 0, wet = 0, dest = kit.out, tag = null) {
  const src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = buf; src.playbackRate.value = rate; g.gain.value = gain;
  if (dark) {
    const lp = filt(ac, 'lowpass', dark, 0.5), sh = filt(ac, 'lowshelf', 120);
    sh.gain.value = 6;
    src.connect(lp).connect(sh).connect(g).connect(dest);
  } else src.connect(g).connect(dest);
  if (wet) echo(ac, g, wet, dark || 6000);
  src.start(when);
  (tag ? trackS : track)(when + buf.duration / rate + 0.1, src);
}
// A sample from off seconds in, faded in over 30 ms, so it never clicks.
// dark: lowpass corner in hertz. Returns the source.
function playFrom(ac, buf, when, off, gain, rate, dark, dest, wet = 0) {
  const src = ac.createBufferSource(), g = ac.createGain(), lp = filt(ac, 'lowpass', dark, 0.5);
  src.buffer = buf; src.playbackRate.value = rate;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + 0.03);
  src.connect(lp).connect(g).connect(dest);
  if (wet) echo(ac, g, wet, dark);
  src.start(when, off);
  return src;
}
// A sample-only hit into a live handle; the handle exists at once.
// The tail of Tom's impact plays when the file is ready.
export function sampleHit(ac, h, t, gain, rate, dark, dest, wet = 0, name = 'impact') {
  sample(ac, name).then(buf => {
    if (!buf || !pend.has(h)) return;
    const off = name === 'impact' ? IMPACT_AT - 0.02 : 0;
    h.nodes.push(playFrom(ac, buf, Math.max(t, ac.currentTime), off, gain, rate, dark, dest, wet));
    h.end = Math.max(h.end, t + (buf.duration - off) / rate + 0.2);
  });
}
// The blast bus: the impact, the boom, the fire and the rumble.
// One limiter holds the stacked layers under the master's knee.
// Its peak output sits near -3 dBFS.
let limBus = null;
export function blastBus(ac) {
  if (limBus?.ac === ac) return limBus.in;
  const inG = ac.createGain(), lim = ac.createDynamicsCompressor(), mk = ac.createGain();
  // A slow attack keeps the limiter from bending the sub-bass waveform.
  lim.threshold.value = -14; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.03; lim.release.value = 0.6;
  mk.gain.value = 1.2;
  inG.connect(lim).connect(mk).connect(kit.out);
  limBus = { ac, in: inG, lim };
  return inG;
}
