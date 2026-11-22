// Geoboard: sound. Raw Web Audio on the shared kit, muted by default.
// Each run twangs at its own pitch; the board body colours every voice.

const TAU = Math.PI * 2;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const LEAD = 0.01;       // schedule a little ahead of the audio clock
const MAXV = 14;         // most twangs at once

// Karplus-Strong, rendered ahead: a delay loop with a damping filter.
// Rubber damps fast and buzzes when plucked hard.
function twang(ac, f, p, amp, t60) {
  const sr = ac.sampleRate, len = Math.floor(sr * Math.min(1.8, t60 * 1.25 + 0.05));
  const D = sr / f - 0.5, N = Math.max(2, Math.floor(D - 0.1)), eta = D - N, C = (1 - eta) / (1 + eta);
  const line = new Float32Array(N), k = Math.max(1, Math.round(p * N));
  // A pulse split at the pluck point gives the plucked spectrum.
  for (let i = 0; i < N; i++) line[i] = (i < k ? 1 - k / N : -k / N) + (Math.random() * 2 - 1) * 0.1;
  // A soft fingertip on soft rubber: a dark start.
  const fc = clamp(f * (2.2 + 9 * amp), 300, 6500), al = 1 - Math.exp(-TAU * fc / sr);
  for (let pass = 0; pass < 2; pass++) {
    let s = 0;
    for (let i = 0; i < N; i++) { s += (line[i] - s) * al; line[i] = s; }
  }
  const rho = 10 ** (-3 / (t60 * f)), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const fadeIn = Math.floor(sr * 0.0015), fadeOut = Math.floor(sr * 0.06);
  // Hard plucks slap the rubber about: a soft clip adds the buzz.
  const drive = 1 + 3.2 * amp * amp, norm = 1 / Math.tanh(drive);
  let idx = 0, prev = 0, ax = 0, ay = 0, hx = 0, hy = 0, peak = 1e-6;
  for (let n = 0; n < len; n++) {
    const x = line[idx], avg = rho * (0.55 * x + 0.45 * prev), y = C * avg + ax - C * ay;
    prev = x; ax = avg; ay = y;
    line[idx] = y;
    if (++idx === N) idx = 0;
    hy = x - hx + 0.995 * hy; hx = x;
    d[n] = hy;
    peak = Math.max(peak, Math.abs(hy));
  }
  for (let n = 0; n < len; n++) {
    const v = Math.tanh(drive * d[n] / peak) * norm;
    d[n] = v * (n < fadeIn ? n / fadeIn : n > len - fadeOut ? (len - n) / fadeOut : 1);
  }
  return buf;
}

// Short banks, made once: nail ticks, a finger tap, a rubber slap.
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
  // A tick: rubber snaps onto a steel nail; a few inharmonic rings.
  const ticks = [];
  for (let k = 0; k < 6; k++) {
    const f0 = 2300 + Math.random() * 1600;
    ticks.push(make(40, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.sin(TAU * f0 * t) + 0.6 * Math.sin(TAU * f0 * 2.76 * t) * Math.exp(-t / 0.004) + 0.4 * Math.sin(TAU * f0 * 0.53 * t)) * Math.exp(-t / 0.008)
          + (Math.random() * 2 - 1) * Math.exp(-t / 0.0008) * 0.8;
      }
    }));
  }
  // A tap: the fingertip meets the band.
  const tap = make(45, (d, sr) => {
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += ((Math.random() * 2 - 1) - lp) * 0.12;
      d[i] = (lp * 1.6 + 0.5 * Math.sin(TAU * 180 * t)) * Math.exp(-t / 0.009);
    }
  });
  // A slap: rubber whips into line and hits the nails and the wood.
  const slaps = [];
  for (let k = 0; k < 4; k++) {
    slaps.push(make(90, (d, sr) => {
      let lp = 0;
      const f0 = 120 + Math.random() * 50;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        lp += ((Math.random() * 2 - 1) - lp) * 0.3;
        d[i] = lp * Math.exp(-t / 0.006) * 1.4 + Math.sin(TAU * f0 * t * (1 - t * 2)) * Math.exp(-t / 0.03);
      }
    }));
  }
  return { ticks, tap, slaps };
}

export function bandSound(kit) {
  let V = null;
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    // The board body: a box of wood with two low peaks and a soft top.
    const lo = ac.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = 110; lo.gain.value = -4;
    const p1 = ac.createBiquadFilter(); p1.type = 'peaking'; p1.frequency.value = 220; p1.Q.value = 1.5; p1.gain.value = 5;
    const p2 = ac.createBiquadFilter(); p2.type = 'peaking'; p2.frequency.value = 540; p2.Q.value = 2.2; p2.gain.value = 3.5;
    const hi = ac.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 3200; hi.gain.value = -5;
    const body = ac.createGain();
    body.connect(lo).connect(p1).connect(p2).connect(hi).connect(kit.out);
    // Squeak: rubber sticks and slips on steel while it stretches.
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 7;
    const sq = ac.createGain(); sq.gain.value = 0;
    const chop = ac.createGain(); chop.gain.value = 0.5;
    const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 30;
    const depth = ac.createGain(); depth.gain.value = 0.5;
    lfo.connect(depth).connect(chop.gain);
    const sqPan = ac.createStereoPanner();
    src.connect(bp).connect(chop).connect(sq).connect(sqPan).connect(kit.out);
    src.start(); lfo.start();
    V = { ac, body, bp, sq, lfo, sqPan, bank: bank(ac), pool: [] };
    return V;
  }
  function shot(v, buf, t, rate, gain, pan, dest = kit.out) {
    const s = v.ac.createBufferSource(), g = v.ac.createGain(), p = v.ac.createStereoPanner();
    s.buffer = buf;
    s.playbackRate.value = rate;
    g.gain.value = gain;
    p.pan.value = pan;
    s.connect(g).connect(p).connect(dest);
    s.start(t);
    s.onended = () => { g.disconnect(); p.disconnect(); };
  }
  function pluck(v, e, t, pan) {
    const scale = e.type === 'quiet' ? 0.35 : e.type === 'drop' ? 0.6 : 1;
    const amp = clamp(e.amp * scale, 0.05, 1);
    // Past the cap, the oldest voice gives way.
    while (v.pool.length >= MAXV) { const o = v.pool.shift(); o.g.gain.setTargetAtTime(0, v.ac.currentTime, 0.01); try { o.s.stop(v.ac.currentTime + 0.08); } catch { /* already stopped */ } }
    const f = e.f * jit(0.004);
    const s = v.ac.createBufferSource(), g = v.ac.createGain(), p = v.ac.createStereoPanner();
    s.buffer = twang(v.ac, f, clamp(e.s, 0.05, 0.95), amp, e.t60 * jit(0.08));
    // A hard pluck starts sharp: the swing adds tension, then settles.
    const glide = 0.012 + 0.05 * amp * amp;
    s.playbackRate.setValueAtTime(1 + glide, t);
    s.playbackRate.setTargetAtTime(1, t, 0.06 + 0.05 * amp);
    g.gain.value = 0.34 * amp ** 1.1 * (200 / f) ** 0.18 * jit(0.08);
    p.pan.value = pan;
    s.connect(g).connect(p).connect(v.body);
    s.start(t);
    const vo = { s, g };
    v.pool.push(vo);
    s.onended = () => { const i = v.pool.indexOf(vo); if (i >= 0) v.pool.splice(i, 1); g.disconnect(); p.disconnect(); };
  }

  // Called once a frame with the frame's events.
  function tick(dt, bd, events, panOf) {
    const v = voices();
    if (!v) return;
    const now = v.ac.currentTime, t0 = now + LEAD;
    let n = 0;
    for (const e of events) {
      const pan = panOf(e.x);
      // Events in one frame spread a little, never on a grid.
      const t = t0 + n++ * 0.002 + Math.random() * 0.003;
      switch (e.type) {
        case 'pluck': case 'strum': case 'snap': case 'drop': case 'quiet':
          if (e.type === 'pluck') shot(v, v.bank.tap, t, jit(0.1), 0.12 * jit(0.2), pan);
          pluck(v, e, t + (e.type === 'snap' ? 0.004 : 0), pan);
          break;
        case 'tick':
          shot(v, v.bank.ticks[(Math.random() * v.bank.ticks.length) | 0], t, jit(0.06), (e.soft ? 0.05 : 0.1) * jit(0.25), pan);
          break;
        case 'hook':
          shot(v, v.bank.ticks[(Math.random() * v.bank.ticks.length) | 0], t, 0.85 * jit(0.05), 0.14 * jit(0.2), pan);
          shot(v, v.bank.tap, t + 0.006, 0.8 * jit(0.1), 0.16 * jit(0.2), pan, v.body);
          break;
        case 'grab':
          shot(v, v.bank.tap, t, 1.1 * jit(0.1), 0.18 * jit(0.2), pan);
          break;
        case 'slap': {
          const k = clamp(e.speed / 1800);
          shot(v, v.bank.slaps[(Math.random() * v.bank.slaps.length) | 0], t, (0.85 + 0.3 * k) * jit(0.06), (0.08 + 0.32 * k) * jit(0.15), pan, v.body);
          break;
        }
      }
    }
    // The squeak follows how fast the held band stretches or slides.
    const held = bd.bands.find(b => b.hand);
    const k = held ? clamp((bd.creak - 25) / 500) : 0;
    v.sq.gain.setTargetAtTime(0.05 * k * k, now, 0.04);
    v.lfo.frequency.setTargetAtTime(20 + 55 * k, now, 0.05);
    v.bp.frequency.setTargetAtTime(1100 + 1600 * k * clamp((held?.lam ?? 1) / 4, 0.4, 1.6), now, 0.05);
    if (held) v.sqPan.pan.setTargetAtTime(panOf(held.hand.x), now, 0.05);
  }
  // Quiet the squeak when the loop stops.
  function hush() {
    if (V) V.sq.gain.setTargetAtTime(0, V.ac.currentTime, 0.02);
  }
  return { tick, hush };
}
