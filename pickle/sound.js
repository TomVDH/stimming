// Glowing pickle: sound. Raw Web Audio on the shared kit, muted by default.
// Belgian mains: 230 V at 50 Hz, so the iron hums at 100 Hz.
const TAU = Math.PI * 2;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const LEAD = 0.012;

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
  // A spit: a wet pop, then a short fizz.
  const pops = [0, 1, 2, 3, 4].map(() => make(160, (d, sr) => {
    const f = 900 + Math.random() * 900;
    let lp = 0, hp = 0, prev = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.5;
      hp = lp - prev + 0.9 * hp; prev = lp;
      d[i] = Math.sin(TAU * f * t * (1 - t * 2)) * Math.exp(-t / 0.006) * 0.8 + noise() * Math.exp(-t / 0.0015) * 1.2
        + hp * Math.exp(-t / 0.05) * 0.5 * Math.min(1, t / 0.004);
    }
  }));
  // A crackle grain: one tiny bubble bursting.
  const ticks = [0, 1, 2, 3, 4, 5].map(() => make(14, (d, sr) => {
    const f = 3000 + Math.random() * 4000;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = (Math.sin(TAU * f * t) * 0.6 + noise()) * Math.exp(-t / 0.0011);
    }
  }));
  // The arc restrikes: a sharp snap with a burst of buzz.
  const snaps = [0, 1, 2].map(() => make(220, (d, sr) => {
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.3;
      const buzz = Math.sign(Math.sin(TAU * 100 * t)) * Math.exp(-t / 0.05) * 0.35;
      d[i] = noise() * Math.exp(-t / 0.002) * 1.4 + lp * Math.exp(-t / 0.03) + buzz * (0.6 + 0.4 * noise());
    }
  }));
  // Ignition: a soft low whump under a crack.
  const whump = make(700, (d, sr) => {
    let lp = 0, lp2 = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.04; lp2 += (lp - lp2) * 0.1;
      d[i] = lp2 * 6 * Math.exp(-t / 0.12) * Math.min(1, t / 0.01) + Math.sin(TAU * 70 * t * (1 - t * 0.6)) * Math.exp(-t / 0.15) * 0.5
        + noise() * Math.exp(-t / 0.003) * 0.6;
    }
  });
  // The switch: a toggle's spring snap and the case's knock.
  const clunks = [0, 1].map(k => make(120, (d, sr) => {
    const f = k ? 1900 : 1500, g = k ? 260 : 210;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = noise() * Math.exp(-t / 0.0009) * 1.2 + Math.sin(TAU * f * t) * Math.exp(-t / 0.004) * 0.5
        + Math.sin(TAU * g * t) * Math.exp(-t / 0.02) * 0.7 + (t > 0.011 ? noise() * Math.exp(-(t - 0.011) / 0.0008) * 0.4 : 0);
    }
  }));
  // A fresh pickle laid on the plate: a wet soft tap on china.
  const plop = make(260, (d, sr) => {
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.15;
      d[i] = lp * Math.exp(-t / 0.02) * 1.5 + Math.sin(TAU * 2350 * t) * Math.exp(-t / 0.05) * 0.12 + Math.sin(TAU * 3720 * t) * Math.exp(-t / 0.03) * 0.06
        + Math.sin(TAU * 180 * t) * Math.exp(-t / 0.03) * 0.5;
    }
  });
  // A small room: a short, dull tail.
  const ir = ac.createBuffer(2, Math.round(sr * 0.7), sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += (noise() - lp) * 0.3;
      d[i] = lp * Math.exp(-t / 0.16) * Math.min(1, t / 0.006);
    }
  }
  return { pops, ticks, snaps, whump, clunks, plop, ir };
}

export function pickleSound(kit) {
  let V = null, crackAcc = 0;
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    const B = bank(ac);
    const verb = ac.createConvolver();
    verb.buffer = B.ir;
    const wet = ac.createGain(); wet.gain.value = 0.22;
    verb.connect(wet).connect(kit.out);
    const bus = ac.createStereoPanner();
    bus.pan.value = 0.12;
    bus.connect(kit.out);
    const send = ac.createGain(); send.gain.value = 1;
    bus.connect(send).connect(verb);
    // Mains hum: 50 Hz and its odd harmonics, plus the 100 Hz buzz of the iron.
    const hum = ac.createOscillator();
    const re = new Float32Array(16), im = new Float32Array(16);
    [[1, 0.5], [2, 1], [3, 0.15], [4, 0.45], [6, 0.25], [8, 0.12], [10, 0.06], [12, 0.03]].forEach(([k, a]) => { im[k] = a; });
    hum.setPeriodicWave(ac.createPeriodicWave(re, im));
    hum.frequency.value = 50;
    const humG = ac.createGain(); humG.gain.value = 0;
    hum.connect(humG).connect(bus);
    // The arc: noise chopped at 100 Hz, as the current crosses zero.
    const arcSrc = ac.createBufferSource(); arcSrc.buffer = kit.noise; arcSrc.loop = true;
    const arcBp = ac.createBiquadFilter(); arcBp.type = 'bandpass'; arcBp.frequency.value = 2200; arcBp.Q.value = 0.6;
    const arcAm = ac.createGain(); arcAm.gain.value = 0.5;
    const chop = ac.createOscillator(); chop.type = 'square'; chop.frequency.value = 100;
    const chopG = ac.createGain(); chopG.gain.value = 0.5;
    chop.connect(chopG).connect(arcAm.gain);
    const arcG = ac.createGain(); arcG.gain.value = 0;
    arcSrc.connect(arcBp).connect(arcAm).connect(arcG).connect(bus);
    // The rasp under the arc: a 100 Hz sawtooth through a high-pass.
    const rasp = ac.createOscillator(); rasp.type = 'sawtooth'; rasp.frequency.value = 100;
    const raspHp = ac.createBiquadFilter(); raspHp.type = 'highpass'; raspHp.frequency.value = 900;
    const raspG = ac.createGain(); raspG.gain.value = 0;
    rasp.connect(raspHp).connect(raspG).connect(bus);
    // Sizzle: bright noise of the brine boiling under the skin.
    const sizSrc = ac.createBufferSource(); sizSrc.buffer = kit.noise; sizSrc.loop = true; sizSrc.playbackRate.value = 0.93;
    const sizHp = ac.createBiquadFilter(); sizHp.type = 'highpass'; sizHp.frequency.value = 3200;
    const sizPk = ac.createBiquadFilter(); sizPk.type = 'peaking'; sizPk.frequency.value = 6500; sizPk.gain.value = 6;
    const sizG = ac.createGain(); sizG.gain.value = 0;
    sizSrc.connect(sizHp).connect(sizPk).connect(sizG).connect(bus);
    for (const o of [hum, arcSrc, chop, rasp, sizSrc]) o.start();
    V = { ac, B, bus, verb, humG, arcG, raspG, arcBp, sizG, sizHp };
    return V;
  }
  function shot(buf, { t = 0, rate = 1, gain = 1, pan = 0.12, send = 0.25 } = {}) {
    const v = voices();
    if (!v) return;
    const s = v.ac.createBufferSource(), g = v.ac.createGain(), p = v.ac.createStereoPanner();
    s.buffer = buf;
    s.playbackRate.value = rate;
    g.gain.value = gain;
    p.pan.value = pan;
    s.connect(g).connect(p).connect(kit.out);
    let sg = null;
    if (send > 0) { sg = v.ac.createGain(); sg.gain.value = send; p.connect(sg).connect(v.verb); }
    s.start(Math.max(v.ac.currentTime + LEAD, t));
    s.onended = () => { g.disconnect(); p.disconnect(); sg?.disconnect(); };
  }
  const pick = a => a[(Math.random() * a.length) | 0];
  const at = () => (V ? V.ac.currentTime + LEAD : 0);
  return {
    click(on) { const v = voices(); if (v) shot(v.B.clunks[on ? 0 : 1], { rate: jit(0.04), gain: 0.5 * jit(0.1), pan: -0.35, send: 0.15 }); },
    plop() { const v = voices(); if (v) shot(v.B.plop, { rate: jit(0.06), gain: 0.45 * jit(0.1), pan: 0, send: 0.2 }); },
    spit(big, pan) { const v = voices(); if (v) shot(pick(v.B.pops), { rate: (1.25 - 0.3 * big) * jit(0.12), gain: clamp(0.18 + 0.22 * big) * jit(0.25), pan: pan + (Math.random() - 0.5) * 0.1 }); },
    strike(pan) { const v = voices(); if (v) shot(pick(v.B.snaps), { rate: jit(0.1), gain: 0.32 * jit(0.25), pan }); },
    ignite(pan) {
      const v = voices();
      if (!v) return;
      shot(v.B.whump, { rate: jit(0.05), gain: 0.75, pan, send: 0.4 });
      shot(pick(v.B.snaps), { t: at() + 0.01, rate: 0.85 * jit(0.05), gain: 0.5, pan });
    },
    // Once a frame: the hum follows the current, the rasp the arc, the sizzle the heat.
    tick(dt, st, volts) {
      const v = voices();
      if (!v) return;
      const now = v.ac.currentTime;
      // The warm-up draws 6 to 7 A; once the arc burns it drops below 1 A.
      const amps = st.on ? volts * (st.lit ? 0.25 : 0.55 + 0.45 * clamp(st.heat)) : 0;
      v.humG.gain.setTargetAtTime(0.11 * amps, now, st.on ? 0.03 : 0.015);
      const g = st.glow;
      v.arcG.gain.setTargetAtTime(0.12 * g * jit(0.15), now, 0.012);
      v.raspG.gain.setTargetAtTime(0.03 * g * g, now, 0.02);
      v.arcBp.frequency.setTargetAtTime(1600 + 1800 * g * jit(0.2), now, 0.03);
      const heat = clamp((st.heat - 0.25) / 0.75);
      v.sizG.gain.setTargetAtTime(0.09 * heat * heat * (st.on ? 1 : 0.55), now, 0.08);
      v.sizHp.frequency.setTargetAtTime(2600 + 1600 * heat, now, 0.1);
      // Bubbles burst at random under the skin.
      crackAcc += dt * heat * (st.on ? 38 : 12);
      let n = 0;
      while (crackAcc >= 1 && n < 6) {
        crackAcc -= 1 + Math.random();
        shot(pick(v.B.ticks), { t: now + LEAD + Math.random() * dt, rate: jit(0.25), gain: 0.05 * heat * jit(0.6), pan: 0.12 + (Math.random() - 0.5) * 0.4, send: 0.1 });
        n++;
      }
    },
    // Quiet every bed when the loop stops or the tab hides.
    hush() {
      if (!V) return;
      const now = V.ac.currentTime;
      for (const g of [V.humG, V.arcG, V.raspG, V.sizG]) g.gain.setTargetAtTime(0, now, 0.02);
    },
  };
}
