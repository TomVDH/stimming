// Wrecking ball: sound. Raw Web Audio on the shared kit, muted by default.
import { BALL } from './sim.js';
// Short banks are rendered once; each hit picks one and jitters pitch and level.

const TAU = Math.PI * 2;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const LEAD = 0.012;      // schedule a little ahead of the audio clock
const PER_FRAME = 7;     // most brick hits voiced in one frame

function bank(ac) {
  const sr = ac.sampleRate;
  const make = (ms, fill) => {
    const n = Math.round(sr * ms / 1000), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
    fill(d, sr);
    let pk = 1e-6;
    for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < n; i++) d[i] /= pk;
    // A short fade at the end, so no buffer clicks off.
    const f = Math.min(n, Math.round(sr * 0.01));
    for (let i = 0; i < f; i++) d[n - 1 - i] *= i / f;
    return b;
  };
  const noise = () => Math.random() * 2 - 1;
  // The impact: a sub thump that falls in pitch, a crack, a long crunch.
  const thumps = [0, 1, 2].map(() => make(900, (d, sr) => {
    const f0 = 62 + Math.random() * 10;
    let ph = 0, lp = 0, lp2 = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      ph += TAU * (f0 * (0.55 + 0.45 * Math.exp(-t / 0.08))) / sr;
      lp += (noise() - lp) * 0.06; lp2 += (lp - lp2) * 0.2;
      d[i] = Math.sin(ph) * Math.exp(-t / 0.32) * 1.2 + lp2 * Math.exp(-t / 0.05) * 3.0;
    }
  }));
  const cracks = [0, 1, 2].map(() => make(1300, (d, sr) => {
    let lp = 0, hp = 0, prev = 0, dens = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      // Mortar cracks as a burst of grains that thins out.
      dens = Math.exp(-t / 0.25);
      const grain = Math.random() < 0.004 + 0.05 * dens ? noise() * (0.5 + Math.random()) : 0;
      lp += (grain + noise() * 0.25 * dens - lp) * 0.35;
      hp = lp - prev + 0.97 * hp; prev = lp;
      d[i] = hp * (Math.exp(-t / 0.02) * 2.2 + Math.exp(-t / 0.35) * 0.9 + 0.12);
    }
  }));
  // Brick on brick: a fired-clay clack with a few short rings.
  const clacks = [0, 1, 2, 3, 4, 5].map(() => make(70, (d, sr) => {
    const f = 1500 + Math.random() * 1600, g = 2.31 + Math.random() * 0.4, h = 3.9 + Math.random() * 0.6;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = (Math.sin(TAU * f * t) + 0.6 * Math.sin(TAU * f * g * t) * Math.exp(-t / 0.004) + 0.4 * Math.sin(TAU * f * 0.47 * t)) * Math.exp(-t / 0.011)
        + noise() * Math.exp(-t / 0.0012) * 1.1;
    }
  }));
  // Brick on dirt: a dull thud with grit.
  const thuds = [0, 1, 2, 3].map(() => make(140, (d, sr) => {
    const f = 120 + Math.random() * 70;
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.08;
      d[i] = Math.sin(TAU * f * t * (1 - t * 1.5)) * Math.exp(-t / 0.035) + lp * 2.4 * Math.exp(-t / 0.02) + noise() * 0.15 * Math.exp(-t / 0.04);
    }
  }));
  // Laying back: a brick beds into fresh mortar, a soft wet tock.
  const tocks = [0, 1, 2, 3].map(() => make(160, (d, sr) => {
    const f = 380 + Math.random() * 90;
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.05;
      d[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.018) * 0.9 + Math.sin(TAU * f * 2.7 * t) * Math.exp(-t / 0.006) * 0.3 + lp * 1.8 * Math.exp(-t / 0.03);
    }
  }));
  // Chain: steel links knock together, a few bright rings each.
  const clinks = [0, 1, 2, 3, 4].map(() => make(220, (d, sr) => {
    const f = 1900 + Math.random() * 1400;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = (Math.sin(TAU * f * t) * 0.8 + Math.sin(TAU * f * 2.76 * t) * 0.5 + Math.sin(TAU * f * 5.4 * t) * 0.3 * Math.exp(-t / 0.02)) * Math.exp(-t / 0.07)
        + noise() * Math.exp(-t / 0.001) * 0.6;
    }
  }));
  // A yard's echo: a short, dark, sparse tail.
  const ir = ac.createBuffer(2, Math.round(sr * 1.6), sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.25;
      // A slap from far walls at 90 and 160 ms, then a diffuse tail.
      const slap = Math.exp(-((t - 0.09 - c * 0.007) ** 2) / 0.00002) * 0.8 + Math.exp(-((t - 0.16 + c * 0.006) ** 2) / 0.00004) * 0.5;
      d[i] = lp * (Math.exp(-t / 0.45) * 0.6 * Math.min(1, t / 0.03) + slap);
    }
  }
  return { thumps, cracks, clacks, thuds, tocks, clinks, ir };
}

export function wallSound(kit) {
  let V = null, knocks = 0, lastLay = 0;
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    const B = bank(ac);
    const verb = ac.createConvolver();
    verb.buffer = B.ir;
    const wet = ac.createGain(); wet.gain.value = 0.32;
    verb.connect(wet).connect(kit.out);
    // Air: the heavy ball pushes a low rush of wind as it swings.
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 0.9;
    const air = ac.createGain(); air.gain.value = 0;
    const airPan = ac.createStereoPanner();
    src.connect(bp).connect(air).connect(airPan).connect(kit.out);
    src.start();
    V = { ac, B, verb, bp, air, airPan, sp0: 0, dir: 0 };
    return V;
  }
  function shot(v, buf, t, rate, gain, pan, send = 0.2) {
    const s = v.ac.createBufferSource(), g = v.ac.createGain(), p = v.ac.createStereoPanner();
    s.buffer = buf;
    s.playbackRate.value = rate;
    g.gain.value = gain;
    p.pan.value = pan;
    s.connect(g).connect(p).connect(kit.out);
    let sg = null;
    if (send > 0) { sg = v.ac.createGain(); sg.gain.value = send; p.connect(sg).connect(v.verb); }
    s.start(t);
    s.onended = () => { g.disconnect(); p.disconnect(); sg?.disconnect(); };
  }
  const pick = a => a[(Math.random() * a.length) | 0];

  // Called once a frame with the frame's events.
  function tick(dt, sim, events, panOf) {
    const v = voices();
    if (!v) return;
    const now = v.ac.currentTime, t0 = now + LEAD;
    knocks = 0;
    // Loud brick hits first, so the cap drops the quiet ones.
    const evs = events.length > PER_FRAME ? [...events].sort((a, b) => (b.v || 0) - (a.v || 0)) : events;
    let n = 0, cracks = 0;
    for (const e of evs) {
      const pan = e.x != null ? panOf(e.x, e.y, e.z) : 0;
      // Events in one frame spread a little, never on a grid.
      const t = t0 + n++ * 0.0025 + Math.random() * 0.004;
      switch (e.type) {
        case 'hit': {
          const k = clamp(e.v / 5, 0.25, 1.2);
          shot(v, pick(v.B.thumps), t, 0.92 * jit(0.05), 0.95 * k, pan * 0.5, 0.45);
          shot(v, pick(v.B.cracks), t + 0.004, jit(0.06), 0.55 * k, pan, 0.35);
          break;
        }
        case 'knock':
          if (knocks++ >= PER_FRAME) break;
          shot(v, pick(v.B.clacks), t, (e.half ? 1.25 : 1) * jit(0.12), clamp(e.v / 6, 0.03, 0.5) * 0.55 * jit(0.2), pan);
          break;
        case 'land':
          if (knocks++ >= PER_FRAME) break;
          shot(v, pick(v.B.thuds), t, (e.half ? 1.2 : 1) * jit(0.1), clamp(e.v / 7, 0.04, 0.6) * 0.7 * jit(0.2), pan, 0.25);
          if (e.v > 3) shot(v, pick(v.B.clacks), t + 0.002, 0.7 * jit(0.1), clamp(e.v / 9) * 0.18, pan);
          break;
        case 'loose':
          // Mortar lets go: a few dry ticks, capped per frame.
          if (cracks++ < 3) shot(v, pick(v.B.clacks), t + Math.random() * 0.03, 0.55 * jit(0.15), 0.08 * jit(0.3), pan, 0.15);
          break;
        case 'lay': {
          // Each course beds a hair higher, so the wall climbs as it closes.
          const g = now - lastLay < 0.03 ? 0.6 : 1;
          lastLay = now;
          shot(v, pick(v.B.tocks), t, (1 + e.c * 0.012) * (e.half ? 1.15 : 1) * jit(0.05), 0.26 * g * jit(0.15), pan, 0.18);
          break;
        }
        case 'lift':
          shot(v, pick(v.B.thuds), t, 1.6 * jit(0.1), 0.05 * jit(0.3), pan, 0.05);
          break;
        case 'grab': case 'release': {
          // The chain lead rattles as the load comes on or off.
          const k = e.type === 'grab' ? 0.7 : 1;
          for (let i = 0; i < 3 + (Math.random() * 2 | 0); i++) shot(v, pick(v.B.clinks), t + i * (0.03 + Math.random() * 0.05), jit(0.08), 0.09 * k * jit(0.3), panOf(sim.ball.x, sim.ball.y + 0.6, sim.ball.z), 0.2);
          break;
        }
      }
    }
    // The whoosh follows the ball's speed; the chain ticks where the swing turns.
    const b = sim.ball, sp = Math.hypot(b.vx, b.vy, b.vz);
    const k = clamp((sp - 0.4) / 5);
    v.air.gain.setTargetAtTime(0.16 * k * k, now, 0.06);
    v.bp.frequency.setTargetAtTime(180 + 260 * k, now, 0.06);
    v.airPan.pan.setTargetAtTime(panOf(b.x, b.y, b.z), now, 0.06);
    const dir = Math.sign(b.vx);
    if (dir && v.dir && dir !== v.dir && !b.held && v.sp0 > 0.05) {
      const amp = clamp(Math.abs(b.x - BALL.rest[0]) / 3);
      if (amp > 0.05) shot(v, pick(v.B.clinks), t0, 0.9 * jit(0.08), 0.05 * amp * jit(0.3), panOf(b.x, b.y + 0.6, b.z), 0.2);
    }
    v.dir = dir || v.dir;
    v.sp0 = sp;
  }
  // Quiet the whoosh when the loop stops.
  function hush() {
    if (V) V.air.gain.setTargetAtTime(0, V.ac.currentTime, 0.03);
  }
  return { tick, hush };
}
