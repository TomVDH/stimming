// Wave machine: sound. Raw Web Audio on the shared kit, muted by default.
// The moving rods swish; a flicked rod rings; the clamp knocks.

const TAU = Math.PI * 2;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const LEAD = 0.01;       // schedule a little ahead of the audio clock

// Short banks, made once and normalised.
function bank(ac) {
  const sr = ac.sampleRate;
  const make = (ms, fill) => {
    const n = Math.round(sr * ms / 1000), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
    fill(d, sr);
    let pk = 1e-6;
    for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < n; i++) d[i] /= pk;
    return b;
  };
  // A rod rings in free bending modes: partials 1, 2.76 and 5.40.
  const rings = [];
  for (let k = 0; k < 4; k++) {
    const f0 = 196 * (1 + k * 0.035);
    rings.push(make(1400, (d, sr) => {
      const ph = [Math.random(), Math.random(), Math.random()].map(p => p * TAU);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, att = Math.min(1, t / 0.002);
        d[i] = att * (Math.sin(TAU * f0 * t + ph[0]) * Math.exp(-t / 0.42)
          + 0.45 * Math.sin(TAU * f0 * 2.756 * t + ph[1]) * Math.exp(-t / 0.2)
          + 0.22 * Math.sin(TAU * f0 * 5.404 * t + ph[2]) * Math.exp(-t / 0.08));
      }
    }));
  }
  // A tick: a fingertip on a steel rod.
  const ticks = [];
  for (let k = 0; k < 4; k++) {
    const f0 = 2600 + Math.random() * 1400;
    ticks.push(make(35, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.sin(TAU * f0 * t) + 0.5 * Math.sin(TAU * f0 * 2.31 * t)) * Math.exp(-t / 0.006)
          + (Math.random() * 2 - 1) * Math.exp(-t / 0.0007) * 0.7;
      }
    }));
  }
  // A knock: the clamp takes the twist; a dull thud and a short steel ring.
  const knocks = [];
  for (let k = 0; k < 3; k++) {
    const f0 = 120 + Math.random() * 30, fr = 1500 + Math.random() * 500;
    knocks.push(make(260, (d, sr) => {
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        lp += ((Math.random() * 2 - 1) - lp) * 0.25;
        d[i] = Math.sin(TAU * f0 * t * (1 - t * 0.6)) * Math.exp(-t / 0.035)
          + 0.5 * lp * Math.exp(-t / 0.004)
          + 0.16 * Math.sin(TAU * fr * t) * Math.exp(-t / 0.05);
      }
    }));
  }
  // A whip: the flicked rod cuts the air.
  const whips = [];
  for (let k = 0; k < 3; k++) {
    whips.push(make(320, (d, sr) => {
      let a = 0, b = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, u = t / 0.32;
        // A band of noise that sweeps up, then down.
        const fc = 500 + 2200 * Math.sin(Math.PI * u) ** 2, g = 1 - Math.exp(-TAU * fc / sr);
        const n = Math.random() * 2 - 1;
        a += (n - a) * g; b += (a - b) * g;
        d[i] = (a - b) * Math.sin(Math.PI * u) ** 1.5;
      }
    }));
  }
  return { rings, ticks, knocks, whips };
}

export function machineSound(kit) {
  let V = null;
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    // The swish: air off the moving rods, a band of noise.
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.9;
    const sw = ac.createGain(); sw.gain.value = 0;
    const pan = ac.createStereoPanner();
    src.connect(bp).connect(sw).connect(pan).connect(kit.out);
    // The body: a low rumble of the rail under a big wave.
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 2;
    const rb = ac.createGain(); rb.gain.value = 0;
    src.connect(lp).connect(rb).connect(pan);
    src.start();
    V = { ac, bp, sw, rb, pan, bank: bank(ac), e: 0 };
    return V;
  }
  function shot(v, buf, t, rate, gain, p) {
    const s = v.ac.createBufferSource(), g = v.ac.createGain(), pn = v.ac.createStereoPanner();
    s.buffer = buf;
    s.playbackRate.value = rate;
    g.gain.value = gain;
    pn.pan.value = p;
    s.connect(g).connect(pn).connect(kit.out);
    s.start(t);
    s.onended = () => { g.disconnect(); pn.disconnect(); };
  }
  const pick = a => a[(Math.random() * a.length) | 0];

  // Called once a frame with the frame's events and the line's state.
  function tick(dt, L, events, panOf, { energy, centre }) {
    const v = voices();
    if (!v) return;
    const now = v.ac.currentTime, t0 = now + LEAD;
    // Heavier weights ring lower.
    const low = Math.sqrt(L.s / 40);
    let n = 0;
    for (const e of events) {
      const t = t0 + n++ * 0.003 + Math.random() * 0.004;
      const p = e.i != null ? panOf(e.i / 95) : 0;
      switch (e.type) {
        case 'touch':
          shot(v, pick(v.bank.ticks), t, jit(0.06), 0.06 * jit(0.25), p);
          break;
        case 'grab':
          shot(v, pick(v.bank.rings), t, low * jit(0.02), 0.035 * jit(0.2), p);
          break;
        case 'flick': {
          const k = clamp(Math.abs(e.a) / 0.52);
          shot(v, pick(v.bank.whips), t, jit(0.08), 0.1 * k * jit(0.15), p);
          shot(v, pick(v.bank.rings), t + 0.02, low * jit(0.02), 0.09 * k * jit(0.15), p);
          break;
        }
        case 'release': {
          const k = clamp(Math.abs(e.spin) / 6);
          if (k > 0.08) shot(v, pick(v.bank.rings), t, low * jit(0.02), 0.08 * k * jit(0.15), p);
          break;
        }
        case 'clamp': {
          const k = clamp(e.a / 0.4);
          shot(v, pick(v.bank.knocks), t, jit(0.05), 0.24 * k * jit(0.15), panOf(1));
          break;
        }
        case 'still':
          shot(v, pick(v.bank.whips), t, 0.55 * jit(0.05), 0.07 * jit(0.15), 0);
          break;
      }
    }
    // The swish follows the line's energy; it pans with the motion.
    v.e += (energy - v.e) * clamp(dt * 12);
    const k = clamp(Math.sqrt(v.e) / 9);
    v.sw.gain.setTargetAtTime(0.11 * k * k, now, 0.05);
    v.rb.gain.setTargetAtTime(0.5 * k * k * k, now, 0.08);
    v.bp.frequency.setTargetAtTime(600 + 2000 * k, now, 0.06);
    v.pan.pan.setTargetAtTime(panOf(centre), now, 0.08);
  }
  // Quiet the swish when the loop stops.
  function hush() {
    if (!V) return;
    V.sw.gain.setTargetAtTime(0, V.ac.currentTime, 0.03);
    V.rb.gain.setTargetAtTime(0, V.ac.currentTime, 0.03);
    V.e = 0;
  }
  return { tick, hush };
}
