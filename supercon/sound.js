// Superconductor track: sound. Raw Web Audio on the shared kit, muted by default.
// Short banks are rendered once; each hit picks one and jitters pitch and level.
import { TRACK, boil, pose } from './sim.js';

const TAU = Math.PI * 2;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const LEAD = 0.012;      // schedule a little ahead of the audio clock
const PER_FRAME = 5;     // most bead ticks voiced in one frame

function bank(ac) {
  const sr = ac.sampleRate;
  const make = (ms, fill) => {
    const n = Math.round(sr * ms / 1000), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
    fill(d, sr);
    let pk = 1e-6;
    for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < n; i++) d[i] /= pk;
    // A short fade at the end, so no buffer clicks off.
    const f = Math.min(n, Math.round(sr * 0.008));
    for (let i = 0; i < f; i++) d[n - 1 - i] *= i / f;
    return b;
  };
  const noise = () => Math.random() * 2 - 1;
  // Boil: one tiny pop of a bubble on the cold film.
  const pops = [0, 1, 2, 3, 4, 5].map(() => make(14, (d, sr) => {
    const f = 3800 + Math.random() * 4200;
    let hp = 0, prev = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, x = noise();
      hp = x - prev + 0.9 * hp; prev = x;
      d[i] = (Math.sin(TAU * f * t) * 0.6 + hp * 0.7) * Math.exp(-t / 0.0018);
    }
  }));
  // Film crinkle: a burst of dry plastic ticks.
  const crinkles = [0, 1, 2].map(() => make(260, (d, sr) => {
    let hp = 0, prev = 0, env = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      if (Math.random() < 0.0016 * Math.exp(-t / 0.12)) env = 0.4 + Math.random() * 0.8;
      env *= 0.991;
      const x = noise() * env;
      hp = x - prev + 0.75 * hp; prev = x;
      d[i] = hp;
    }
  }));
  // A pin lets go: a tiny dry tick with a high ring.
  const ticks = [0, 1, 2, 3].map(() => make(40, (d, sr) => {
    const f = 5200 + Math.random() * 2400;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.006) * 0.6 + noise() * Math.exp(-t / 0.0007);
    }
  }));
  // Ceramic on nickel: a hard clack, a short bright ring, a body knock.
  const clacks = [0, 1, 2].map(() => make(180, (d, sr) => {
    const f = 2900 + Math.random() * 900, g = 2.43 + Math.random() * 0.3, b0 = 820 + Math.random() * 200;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = (Math.sin(TAU * f * t) + 0.55 * Math.sin(TAU * f * g * t) * Math.exp(-t / 0.006)) * Math.exp(-t / 0.028) * 0.7
        + Math.sin(TAU * b0 * t) * Math.exp(-t / 0.012) * 0.9 + noise() * Math.exp(-t / 0.0012) * 1.2;
    }
  }));
  // A short scrape of the puck's edge on the plating.
  const scrapes = [0, 1, 2].map(() => make(90, (d, sr) => {
    let bp = 0, lp = 0;
    const f = 0.25 + Math.random() * 0.15;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, x = noise();
      lp += (x - lp) * f; bp = x - lp;
      d[i] = bp * Math.sin(Math.PI * t / 0.09) * (0.6 + 0.4 * Math.sin(TAU * 70 * t));
    }
  }));
  // A bead of nitrogen hops: a glassy tick.
  const beads = [0, 1, 2, 3, 4].map(() => make(24, (d, sr) => {
    const f = 7000 + Math.random() * 3500;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.003) + noise() * 0.3 * Math.exp(-t / 0.0005);
    }
  }));
  // The pour: liquid falls, splashes and boils hard on the cold puck.
  const pour = make(2400, (d, sr) => {
    let lp = 0, hp = 0, prev = 0, gl = 0, gp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, x = noise();
      // The stream: a band of noise that gurgles.
      gp += TAU * (7 + 5 * Math.sin(t * 9)) / sr;
      lp += (x - lp) * 0.22;
      gl = lp * (0.6 + 0.4 * Math.sin(gp));
      const stream = gl * clamp(t / 0.05) * clamp((1.15 - t) / 0.1);
      // The boil: a hiss with dense pops that rise and then thin.
      hp = x - prev + 0.6 * hp; prev = x;
      const b = Math.max(0, t - 0.14);
      const boilE = clamp(b / 0.25) * Math.exp(-b / 0.9);
      const pop = Math.random() < 0.02 * boilE ? noise() * 3 : 0;
      d[i] = stream * 0.8 + (hp * 0.55 + pop) * boilE;
    }
  });
  // A small lab: a short, bright, close room.
  const ir = ac.createBuffer(2, Math.round(sr * 0.7), sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.5;
      const slap = Math.exp(-((t - 0.021 - c * 0.004) ** 2) / 0.000004) * 0.6;
      d[i] = lp * (Math.exp(-t / 0.16) * 0.7 * Math.min(1, t / 0.004) + slap);
    }
  }
  return { pops, crinkles, ticks, clacks, scrapes, beads, pour, ir };
}

export function puckSound(kit) {
  let V = null, popAcc = 0, lastScrape = 0;
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    const B = bank(ac);
    const verb = ac.createConvolver();
    verb.buffer = B.ir;
    const wet = ac.createGain(); wet.gain.value = 0.22;
    verb.connect(wet).connect(kit.out);
    // Boil: a soft, high hiss off the cold puck; it pans with the puck.
    const pan = ac.createStereoPanner();
    pan.connect(kit.out);
    const loop = (f, q, type = 'bandpass') => {
      const src = ac.createBufferSource();
      src.buffer = kit.noise; src.loop = true;
      src.playbackRate.value = 0.7 + Math.random() * 0.6;
      const bp = ac.createBiquadFilter(); bp.type = type; bp.frequency.value = f; bp.Q.value = q;
      const g = ac.createGain(); g.gain.value = 0;
      src.connect(bp).connect(g).connect(pan);
      src.start();
      return { src, bp, g };
    };
    const hiss = loop(6200, 0.6);
    // Air: a faint rush that follows the puck's speed.
    const air = loop(900, 0.8);
    V = { ac, B, verb, pan, hiss, air };
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
    return s;
  }
  const pick = a => a[(Math.random() * a.length) | 0];

  // Called once a frame with the frame's events.
  function tick(dt, sim, events, panOf) {
    const v = voices();
    if (!v) return;
    const now = v.ac.currentTime, t0 = now + LEAD;
    const p = pose(sim), pp = panOf(p.x, p.y, p.z);
    let beadN = 0, n = 0;
    for (const e of events) {
      // Events in one frame spread a little, never on a grid.
      const t = t0 + n++ * 0.003 + Math.random() * 0.004;
      switch (e.type) {
        case 'grab': shot(v, pick(v.B.crinkles), t, jit(0.1), 0.12 * jit(0.25), pp, 0.1); break;
        case 'release': shot(v, pick(v.B.crinkles), t, 1.15 * jit(0.1), 0.06 * jit(0.3), pp, 0.1); break;
        case 'push': shot(v, pick(v.B.crinkles), t, 0.85 * jit(0.1), 0.1 * jit(0.2), pp, 0.1); break;
        case 'snap': shot(v, pick(v.B.ticks), t, jit(0.12), (0.05 + 0.1 * e.k) * jit(0.25), pp, 0.15); break;
        case 'clack': {
          const k = clamp(e.v / 0.5, 0.1, 1);
          shot(v, pick(v.B.clacks), t, jit(0.06), 0.55 * k * jit(0.15), pp, 0.3);
          break;
        }
        case 'scrape':
          if (now - lastScrape > 0.05) { lastScrape = now; shot(v, pick(v.B.scrapes), t, jit(0.15), clamp(e.v / 1.2, 0.03, 0.4) * 0.3, pp, 0.1); }
          break;
        case 'bead':
          if (beadN++ < PER_FRAME) shot(v, pick(v.B.beads), t, jit(0.2), clamp(e.v / 2, 0.02, 0.3) * 0.25 * jit(0.3), panOf(e.x, e.y, e.z), 0.2);
          break;
        case 'pour': shot(v, v.B.pour, t, jit(0.04), 0.5 * jit(0.08), pp, 0.3); break;
      }
    }
    // The boil follows the cold and the pour; pops scatter at random.
    const k = sim.landed ? 0 : boil(sim);
    const pourK = sim.pour ? clamp(1 - sim.pour.t / 2) : 0;
    v.hiss.g.gain.setTargetAtTime(0.035 * k + 0.05 * pourK, now, 0.15);
    v.pan.pan.setTargetAtTime(pp, now, 0.05);
    popAcc += dt * (16 * k * k + 40 * pourK);
    while (popAcc >= 1) {
      popAcc -= 1;
      shot(v, pick(v.B.pops), t0 + Math.random() * dt, jit(0.25), 0.04 * jit(0.5) * (0.4 + k), clamp(pp + (Math.random() - 0.5) * 0.15, -1, 1), 0.08);
    }
    const sp = Math.abs(sim.om * TRACK.r);
    const a = clamp(sp / 1.6);
    v.air.g.gain.setTargetAtTime(0.06 * a * a, now, 0.08);
    v.air.bp.frequency.setTargetAtTime(600 + 900 * a, now, 0.08);
  }
  // Quiet the loops when the loop stops.
  function hush() {
    if (!V) return;
    V.hiss.g.gain.setTargetAtTime(0, V.ac.currentTime, 0.05);
    V.air.g.gain.setTargetAtTime(0, V.ac.currentTime, 0.05);
  }
  return { tick, hush };
}
