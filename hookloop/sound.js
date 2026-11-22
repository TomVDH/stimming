// Hook and loop: sound. Raw Web Audio on the shared kit, muted by default.
// Each fibre snap is one click; the peel speed sets their rate, pitch and level.

const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const CAP = 40;          // most clicks in one frame
const LEAD = 0.012;      // schedule a little ahead of the audio clock

// Short sample banks, made once: clicks, crunches and a pat.
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
  // A click: a bright noise tick and a short ring, as a nylon loop slips a hook.
  const clicks = [];
  for (let k = 0; k < 18; k++) {
    const tau = 0.0004 + Math.random() * 0.0011, f = 2400 + Math.random() * 4200, rt = 0.0005 + Math.random() * 0.0012;
    const bright = 0.4 + Math.random() * 0.6;
    clicks.push(make(9, (d, sr) => {
      let prev = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, w = Math.random() * 2 - 1;
        const hp = w - prev * (1 - bright); prev = w;
        d[i] = hp * Math.exp(-t / tau) + 0.5 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / rt);
      }
    }));
  }
  // A crunch: a few dull ticks close together, as hooks bed into the pile.
  const crunch = [];
  for (let k = 0; k < 8; k++) {
    crunch.push(make(24, (d, sr) => {
      let lp = 0;
      const hits = 3 + Math.floor(Math.random() * 4), at = Array.from({ length: hits }, () => Math.random() * 0.016);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let e = 0;
        for (const a of at) if (t >= a) e += Math.exp(-(t - a) / 0.0012);
        lp += ((Math.random() * 2 - 1) * e - lp) * 0.35;
        d[i] = lp;
      }
    }));
  }
  // A pat: the thumb lands on the strap.
  const pat = make(60, (d, sr) => {
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += ((Math.random() * 2 - 1) - lp) * 0.08;
      d[i] = (lp * 2.2 + 0.6 * Math.sin(2 * Math.PI * 150 * t)) * Math.exp(-t / 0.012);
    }
  });
  return { clicks, crunch, pat };
}

export function strapSound(kit) {
  let V = null;
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    // One bus pans with the peel line; one with the thumb.
    const bus = () => {
      const g = ac.createGain(), p = ac.createStereoPanner();
      g.connect(p).connect(kit.out);
      return { g, p };
    };
    const rip = bus(), seal = bus();
    // The rip bed: band-passed noise under the clicks of a fast rip.
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
    const bed = ac.createGain();
    bed.gain.value = 0;
    src.connect(bp).connect(bed).connect(rip.g);
    src.start();
    V = { ac, rip, seal, bp, bed, bank: bank(ac), next: 0, src };
    return V;
  }
  function play(v, buf, t, rate, gain, dest) {
    const s = v.ac.createBufferSource(), g = v.ac.createGain();
    s.buffer = buf;
    s.playbackRate.value = rate;
    g.gain.value = gain;
    s.connect(g).connect(dest);
    s.start(t);
    s.onended = () => g.disconnect();
  }

  let speed = 0;
  // Called once a frame with the frame's events.
  function tick(dt, st, events, panOf, grip) {
    const v = voices();
    let snaps = 0, seals = 0, vs = 0, es = 0, sx = 0, tx = null, pressX = null;
    for (const e of events) {
      if (e.type === 'snap') { snaps++; vs += e.v; es += e.e; sx += e.x; }
      else if (e.type === 'seal') { seals++; tx = e.x; }
      else if (e.type === 'press') pressX = e.x;
    }
    // Peel speed in mm/s, eased, from how fast the lifting tape moved.
    const sp = snaps ? vs / snaps : 0;
    speed += ((snaps ? sp : 0) - speed) * (1 - Math.exp(-dt / (snaps ? 0.03 : 0.12)));
    if (!v) return;
    const now = v.ac.currentTime, t0 = now + LEAD;
    const k = clamp(speed / 420);
    if (snaps) v.rip.p.pan.setTargetAtTime(clamp(panOf(sx / snaps), -1, 1), now, 0.03);
    // A new strap holds harder and cracks louder.
    const loud = 0.55 + 0.6 * grip;
    const n = Math.min(snaps, CAP), boost = Math.sqrt(snaps / Math.max(1, n));
    for (let i = 0; i < n; i++) {
      const e = es / snaps;
      const rate = (0.72 + 0.85 * k) * jit(0.14);
      const g = loud * (0.18 + 0.32 * k) * (0.7 + 0.3 * clamp(e / 3)) * jit(0.3) * boost * (1 - 0.35 * k);
      // Clicks spread over the frame, never on a grid.
      const at = Math.max(t0 + Math.random() * dt, v.next);
      v.next = at + 0.0004;
      play(v, v.bank.clicks[(Math.random() * v.bank.clicks.length) | 0], at, rate, g, v.rip.g);
    }
    // The bed swells only with a fast rip; a slow peel is clicks alone.
    const bedTo = clamp((st.snapRate - 120) / 900) * 0.32 * loud;
    v.bed.gain.setTargetAtTime(bedTo, now, 0.025);
    v.bp.frequency.setTargetAtTime(900 + 2600 * k, now, 0.03);
    // Sealing: soft crunches, about one for every few hooks that catch.
    if (seals) {
      if (tx != null) v.seal.p.pan.setTargetAtTime(clamp(panOf(tx), -1, 1), now, 0.05);
      const m = Math.min(6, Math.ceil(seals / 5));
      for (let i = 0; i < m; i++) {
        play(v, v.bank.crunch[(Math.random() * v.bank.crunch.length) | 0], t0 + Math.random() * dt, 0.8 * jit(0.12), 0.09 * jit(0.3), v.seal.g);
      }
    }
    if (pressX != null) {
      v.seal.p.pan.setValueAtTime(clamp(panOf(pressX), -1, 1), now);
      play(v, v.bank.pat, t0, 0.9 * jit(0.08), 0.32 * jit(0.15), v.seal.g);
    }
  }
  // Quiet the bed when the loop stops.
  function hush() {
    speed = 0;
    if (V) V.bed.gain.setTargetAtTime(0, V.ac.currentTime, 0.02);
  }
  return { tick, hush };
}
