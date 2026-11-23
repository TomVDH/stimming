// Tablecloth yank: sound. Raw Web Audio on the shared kit, muted by default.
// Short banks are rendered once; each hit picks one and jitters pitch, time and level.

const TAU = Math.PI * 2;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const LEAD = 0.012;      // schedule a little ahead of the audio clock
const PER_FRAME = 8;     // most hits voiced in one frame

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
  // A struck body: a few inharmonic modes, each with its own decay, and a click.
  const modes = (ms, list, click = 0.5, clickT = 0.0012) => make(ms, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let v = noise() * click * Math.exp(-t / clickT);
      for (const [f, a, tau] of list) v += Math.sin(TAU * f * t) * a * Math.exp(-t / tau);
      d[i] = v;
    }
  });
  const r = (a, b) => a + Math.random() * (b - a);
  // Porcelain: hard, bright, short.
  const china = [0, 1, 2, 3, 4].map(() => { const f = r(1500, 2400); return modes(220, [[f, 1, 0.05], [f * 2.18, 0.7, 0.03], [f * 3.9, 0.4, 0.015], [f * 0.53, 0.3, 0.06]], 0.8); });
  // Stemmed glass: a long pure ring. Tumbler glass: thicker, shorter.
  const wineRing = [0, 1, 2, 3].map(() => { const f = r(820, 1150); return modes(1100, [[f, 1, 0.35], [f * 2.32, 0.45, 0.16], [f * 4.25, 0.25, 0.06], [f * 6.1, 0.12, 0.03]], 0.4, 0.0008); });
  const tumbler = [0, 1, 2, 3].map(() => { const f = r(1700, 2500); return modes(320, [[f, 1, 0.07], [f * 2.6, 0.5, 0.035], [f * 0.62, 0.3, 0.05]], 0.7); });
  // Steel cutlery: thin, bright, a quick shimmer.
  const steel = [0, 1, 2, 3, 4].map(() => { const f = r(2600, 4200); return modes(260, [[f, 1, 0.07], [f * 1.47, 0.6, 0.05], [f * 2.73, 0.4, 0.03], [f * 0.41, 0.25, 0.04]], 0.6); });
  // Brass candlestick: a warm clang.
  const brass = [0, 1, 2].map(() => { const f = r(620, 780); return modes(900, [[f, 1, 0.22], [f * 2.76, 0.5, 0.12], [f * 5.4, 0.3, 0.05], [f * 1.5, 0.25, 0.15]], 0.5); });
  // A piece set down on wood or on cloth: a dull tock.
  const tock = [0, 1, 2, 3].map(() => make(120, (d, sr) => {
    const f = r(180, 280);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.12;
      d[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.02) + lp * 2 * Math.exp(-t / 0.012);
    }
  }));
  // The floorboards: a hollow thud.
  const thud = [0, 1, 2].map(() => make(260, (d, sr) => {
    const f = r(90, 130);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.06;
      d[i] = Math.sin(TAU * f * t * (1 - t * 0.6)) * Math.exp(-t / 0.06) + Math.sin(TAU * f * 2.3 * t) * 0.3 * Math.exp(-t / 0.03) + lp * 2.4 * Math.exp(-t / 0.02);
    }
  }));
  // A crash: the first crack, a spray of grains, a thinning tail of tinkles.
  const crash = (ms, lo, hi, dens, tail) => make(ms, (d, sr) => {
    let lp = 0, hp = 0, prev = 0;
    const pings = Array.from({ length: 26 }, () => ({ t: Math.random() ** 1.8 * tail, f: r(lo, hi), a: r(0.2, 0.9) }));
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      const den = Math.exp(-t / dens);
      const grain = Math.random() < 0.003 + 0.08 * den ? noise() * (0.4 + Math.random()) : 0;
      lp += (grain + noise() * 0.4 * den - lp) * 0.55;
      hp = lp - prev + 0.96 * hp; prev = lp;
      let v = hp * (1.6 * Math.exp(-t / 0.015) + 0.9 * den);
      for (const p of pings) if (t > p.t) { const u = t - p.t; v += Math.sin(TAU * p.f * u) * p.a * Math.exp(-u / 0.03) * 0.35; }
      d[i] = v;
    }
  });
  const crashGlass = [0, 1].map(() => crash(1300, 2400, 6800, 0.09, 0.7));
  const crashChina = [0, 1].map(() => crash(1000, 1400, 3800, 0.06, 0.45));
  const tinks = [0, 1, 2, 3, 4, 5].map(() => { const f = r(3200, 7000); return modes(90, [[f, 1, 0.012], [f * 1.7, 0.5, 0.008]], 0.3, 0.0004); });
  // Cloth: a short rustle, and the crack of the hem as it snaps clear.
  const rustle = [0, 1, 2].map(() => make(260, (d, sr) => {
    let lp = 0, hp = 0, prev = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.3; hp = lp - prev + 0.9 * hp; prev = lp;
      const env = Math.sin(Math.PI * Math.min(1, t / 0.26)) * (0.6 + 0.4 * Math.random());
      d[i] = hp * env;
    }
  }));
  const snap = [0, 1].map(() => make(220, (d, sr) => {
    let lp = 0, hp = 0, prev = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.7; hp = lp - prev + 0.8 * hp; prev = lp;
      // Two cracks close together: the hem, then the far edge.
      d[i] = hp * (Math.exp(-t / 0.006) + 0.6 * Math.exp(-Math.max(0, t - 0.018) / 0.01) * (t > 0.018 ? 1 : 0)) + Math.sin(TAU * 140 * t) * Math.exp(-t / 0.03) * 0.4;
    }
  }));
  // Liquid: a slosh, and a drip that rises in pitch.
  const slosh = [0, 1, 2].map(() => make(380, (d, sr) => {
    let lp = 0, lp2 = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.04; lp2 += (lp - lp2) * 0.08;
      d[i] = lp2 * Math.sin(Math.PI * Math.min(1, t / 0.38)) * (0.6 + 0.4 * Math.sin(TAU * 11 * t));
    }
  }));
  const drip = [0, 1, 2].map(() => make(70, (d, sr) => {
    const f0 = r(700, 1300);
    let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      ph += TAU * f0 * (1 + t * 22) / sr;
      d[i] = Math.sin(ph) * Math.exp(-t / 0.012);
    }
  }));
  const splash = [0, 1].map(() => make(600, (d, sr) => {
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.25;
      d[i] = lp * (Math.exp(-t / 0.05) + 0.4 * Math.exp(-t / 0.2)) * (0.5 + 0.5 * Math.random());
    }
  }));
  // Fire: a whoosh as the cloth catches, the spit of hot wax, and crackles.
  const whoosh = [0, 1].map(() => make(1100, (d, sr) => {
    let lp = 0, lp2 = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, k = 0.02 + 0.25 * Math.min(1, t / 0.35);
      lp += (noise() - lp) * k; lp2 += (lp - lp2) * k;
      d[i] = lp2 * Math.min(1, t / 0.08) * Math.exp(-Math.max(0, t - 0.3) / 0.35) + Math.sin(TAU * 55 * t) * Math.exp(-t / 0.12) * 0.5;
    }
  }));
  const spit = [0, 1].map(() => make(360, (d, sr) => {
    let hp = 0, prev = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, n = noise() * (Math.random() < 0.02 ? 3 : 0.5);
      hp = n - prev + 0.7 * hp; prev = n;
      d[i] = hp * Math.exp(-t / 0.09);
    }
  }));
  const crackle = [0, 1, 2, 3, 4].map(() => { const f = r(900, 2600); return modes(60, [[f, 1, 0.006], [f * 1.9, 0.6, 0.004]], 1.6, 0.0007); });
  // A small dining room: a short, warm tail.
  const ir = ac.createBuffer(2, Math.round(sr * 0.9), sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.35;
      const slap = Math.exp(-((t - 0.011 - c * 0.003) ** 2) / 0.000004) * 0.6 + Math.exp(-((t - 0.024 + c * 0.002) ** 2) / 0.00001) * 0.4;
      d[i] = lp * (Math.exp(-t / 0.22) * 0.5 * Math.min(1, t / 0.006) + slap);
    }
  }
  return { china, wineRing, tumbler, steel, brass, tock, thud, crashGlass, crashChina, tinks, rustle, snap, slosh, drip, splash, whoosh, spit, crackle, ir };
}

export function tableSound(kit) {
  let V = null, lastPour = 0, lastSlosh = 0;
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    const B = bank(ac);
    const verb = ac.createConvolver();
    verb.buffer = B.ir;
    const wet = ac.createGain(); wet.gain.value = 0.3;
    verb.connect(wet).connect(kit.out);
    // The cloth hiss: noise through a band that rises with the slide.
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    const hiss = ac.createGain(); hiss.gain.value = 0;
    const hissPan = ac.createStereoPanner();
    src.connect(bp).connect(hiss).connect(hissPan).connect(kit.out);
    src.start();
    // The fire's roar: low rumble and a fluttering band, both on looped noise.
    const fsrc = ac.createBufferSource();
    fsrc.buffer = kit.noise; fsrc.loop = true; fsrc.playbackRate.value = 0.83;
    const rumble = ac.createBiquadFilter(); rumble.type = 'lowpass'; rumble.frequency.value = 260;
    const flutter = ac.createBiquadFilter(); flutter.type = 'bandpass'; flutter.frequency.value = 1100; flutter.Q.value = 0.6;
    const fg = ac.createGain(); fg.gain.value = 0;
    const flg = ac.createGain(); flg.gain.value = 0.35;
    const fPan = ac.createStereoPanner();
    fsrc.connect(rumble).connect(fg);
    fsrc.connect(flutter).connect(flg).connect(fg);
    fg.connect(fPan).connect(kit.out);
    fsrc.start();
    V = { ac, B, verb, bp, hiss, hissPan, fg, flg, fPan };
    return V;
  }
  function shot(v, buf, t, rate, gain, pan, send = 0.25, lp = 0) {
    const s = v.ac.createBufferSource(), g = v.ac.createGain(), p = v.ac.createStereoPanner();
    s.buffer = buf;
    s.playbackRate.value = rate;
    g.gain.value = gain;
    p.pan.value = pan;
    let head = s, f = null;
    // A hit through the cloth is muffled.
    if (lp) { f = v.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); head = f; }
    head.connect(g).connect(p).connect(kit.out);
    let sg = null;
    if (send > 0) { sg = v.ac.createGain(); sg.gain.value = send; p.connect(sg).connect(v.verb); }
    s.start(t);
    s.onended = () => { g.disconnect(); p.disconnect(); f?.disconnect(); sg?.disconnect(); };
  }
  const pick = a => a[(Math.random() * a.length) | 0];
  // Each piece's own voice.
  function voice(v, kind) {
    switch (kind) {
      case 'plate': return [v.B.china, 1, 0.9];
      case 'wine': return [v.B.wineRing, 1, 0.55];
      case 'tumbler': return [v.B.tumbler, 1, 0.75];
      case 'knife': case 'fork': return [v.B.steel, kind === 'fork' ? 1.08 : 1, 0.55];
      case 'stick': return [v.B.brass, 1, 0.7];
    }
    return [v.B.tock, 1, 0.5];
  }

  // Called once a frame with the frame's events.
  function tick(dt, sim, events, panOf) {
    const v = voices();
    if (!v) return;
    const now = v.ac.currentTime, t0 = now + LEAD;
    // Loud hits first, so the cap drops the quiet ones.
    const evs = events.length > PER_FRAME ? [...events].sort((a, b) => (b.v || 0) - (a.v || 0)) : events;
    let n = 0, hits = 0, tinks = 0;
    for (const e of evs) {
      const pan = e.x != null ? panOf(e.x, e.y, e.z) : 0;
      // Events in one frame spread a little, never on a grid.
      const t = t0 + n++ * 0.003 + Math.random() * 0.005;
      switch (e.type) {
        case 'grab': shot(v, pick(v.B.rustle), t, jit(0.1), 0.12, 0.5, 0.1); break;
        case 'release': shot(v, pick(v.B.rustle), t, 0.8 * jit(0.1), 0.07, 0.5, 0.1); break;
        case 'yank': shot(v, pick(v.B.rustle), t, 1.4 * jit(0.05), clamp(e.v / 6, 0.2, 1) * 0.3, 0.55, 0.15); break;
        case 'clear': if (e.v > 2.5) shot(v, pick(v.B.snap), t, jit(0.08), clamp(e.v / 7, 0.3, 1) * 0.55, 0.6, 0.3); break;
        case 'kick': {
          if (hits++ >= PER_FRAME) break;
          // The setting rattles as the trailing edge slips out.
          const [b, rt, g] = voice(v, e.kind);
          const k = clamp(e.v, 0.2, 1);
          shot(v, pick(b), t, rt * jit(0.06), g * 0.22 * k * jit(0.2), pan, 0.2);
          if (e.kind === 'plate' || e.kind === 'knife' || e.kind === 'fork') shot(v, pick(b), t + 0.025 + Math.random() * 0.03, rt * jit(0.08), g * 0.1 * k, pan, 0.15);
          if ((e.kind === 'wine' || e.kind === 'tumbler') && now - lastSlosh > 0.05) { lastSlosh = now; shot(v, pick(v.B.slosh), t + 0.03, jit(0.15), 0.12 * k, pan, 0.1); }
          break;
        }
        case 'knock': {
          if (hits++ >= PER_FRAME) break;
          const [b, rt, g] = voice(v, e.kind), k = clamp(e.v / 2.5, 0.05, 1);
          shot(v, pick(b), t, rt * jit(0.06), g * 0.5 * k * jit(0.2), pan, 0.2, e.cloth ? 2200 : 0);
          shot(v, pick(v.B.tock), t, jit(0.1), 0.25 * k, pan, 0.1, e.cloth ? 900 : 0);
          break;
        }
        case 'clink': {
          if (hits++ >= PER_FRAME) break;
          const [b, rt, g] = voice(v, e.kind), k = clamp(e.v / 2, 0.05, 1);
          shot(v, pick(b), t, rt * jit(0.06), g * 0.45 * k * jit(0.2), pan, 0.25);
          if (e.other !== e.kind) { const [b2, r2, g2] = voice(v, e.other); shot(v, pick(b2), t + 0.002, r2 * jit(0.06), g2 * 0.3 * k, pan, 0.2); }
          break;
        }
        case 'floor': {
          if (hits++ >= PER_FRAME) break;
          const [b, rt, g] = voice(v, e.kind), k = clamp(e.v / 3.5, 0.05, 1);
          shot(v, pick(v.B.thud), t, jit(0.08), 0.6 * k * (e.kind === 'knife' || e.kind === 'fork' ? 0.4 : 1), pan, 0.3);
          shot(v, pick(b), t, rt * 0.97 * jit(0.08), g * 0.6 * k, pan, 0.3);
          break;
        }
        case 'shatter': {
          const k = clamp(e.v / 3.8, 0.5, 1.2);
          shot(v, pick(e.kind === 'plate' ? v.B.crashChina : v.B.crashGlass), t, jit(0.06), 0.9 * k, pan, 0.45);
          shot(v, pick(v.B.thud), t, 1.1 * jit(0.08), 0.45 * k, pan, 0.2);
          if (e.kind !== 'plate') shot(v, pick(v.B.splash), t + 0.01, jit(0.1), 0.35, pan, 0.25);
          break;
        }
        case 'tink':
          if (tinks++ >= 3) break;
          shot(v, pick(v.B.tinks), t, (e.sub === 'plate' ? 0.6 : 1) * jit(0.15), clamp(e.v / 2, 0.02, 0.4) * 0.35, pan, 0.2);
          break;
        case 'pour':
          if (now - lastPour < 0.09) break;
          lastPour = now;
          shot(v, pick(v.B.slosh), t, 1.4 * jit(0.2), 0.14 * e.v, pan, 0.15);
          break;
        case 'drip': shot(v, pick(v.B.drip), t, jit(0.2), 0.05 * jit(0.4), pan, 0.2); break;
        case 'snuff': shot(v, pick(v.B.rustle), t, 2.2, 0.05, pan, 0.05); break;
        case 'ignite': shot(v, pick(v.B.whoosh), t, jit(0.08), 0.5, pan, 0.35); break;
        case 'spit': shot(v, pick(v.B.spit), t, jit(0.1), 0.25, pan, 0.2); break;
        case 'reset': shot(v, pick(v.B.rustle), t, 0.6, 0.1, 0, 0.2); break;
        case 'lay': shot(v, pick(v.B.rustle), t, 0.5 * jit(0.05), 0.18, 0, 0.2); break;
        case 'set': {
          const [b, rt, g] = voice(v, e.kind);
          shot(v, pick(b), t, rt * jit(0.04), g * 0.12 * jit(0.2), pan, 0.25, 3000);
          break;
        }
      }
    }
    // The hiss follows the cloth's slide while a hand or the air moves it.
    const cl = sim.cloth, moving = cl.awake && (sim.hand.pins || cl.flying > 0);
    const k = moving ? clamp((cl.speed - 0.3) / 6) : 0;
    v.hiss.gain.setTargetAtTime(0.22 * k * k + (moving ? 0.01 : 0), now, 0.03);
    v.bp.frequency.setTargetAtTime(500 + 2600 * k, now, 0.04);
    v.hissPan.pan.setTargetAtTime(0.45, now, 0.1);
    // The roar swells with the fire; it wavers, and crackles pop at random.
    const f = sim.reset ? 0 : clamp(Math.sqrt(sim.burning) / 28);
    v.fg.gain.setTargetAtTime(0.5 * f * (0.8 + 0.4 * Math.random()), now, 0.08);
    v.flg.gain.setTargetAtTime(0.25 + 0.3 * Math.random(), now, 0.05);
    if (f > 0) v.fPan.pan.setTargetAtTime(panOf(sim.fireC[0], sim.fireC[1], sim.fireC[2]), now, 0.2);
    for (let c = 0; c < 3; c++) {
      if (Math.random() < f * dt * 14) shot(v, pick(v.B.crackle), now + LEAD + Math.random() * dt, jit(0.2), 0.12 * jit(0.5), v.fPan.pan.value + (Math.random() - 0.5) * 0.4, 0.2);
    }
  }
  // Quiet the hiss when the loop stops.
  function hush() {
    if (V) { V.hiss.gain.setTargetAtTime(0, V.ac.currentTime, 0.03); V.fg.gain.setTargetAtTime(0, V.ac.currentTime, 0.05); }
  }
  return { tick, hush };
}
