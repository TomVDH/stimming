// Rain stick sound: raw Web Audio on the shared audio kit.
// No samples: every click is drawn into a small buffer at start.
// Each hit plays one voice; past the cap, a crackle bed takes the surplus.
// All voices feed a hollow tube resonance.

// Hit voices per second; the bed carries the rest.
const CAP = 60;
// The tube's lowest mode: c / 2L for a 1 m tube.
const TUBE_HZ = 171.5;
const VARIANTS = 8;

// A seeded random source, so the buffers are the same each load.
function seeded(s) {
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// One click: a noise tick, then a few damped partials.
// parts holds [Hz, decay seconds, level] rows.
function click(ac, rnd, len, tick, parts, tickHz) {
  const n = Math.round(ac.sampleRate * len), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  const sr = ac.sampleRate;
  // A one-pole high pass keeps the tick bright.
  let prev = 0, hp = 0;
  const a = Math.exp((-2 * Math.PI * tickHz) / sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = rnd() * 2 - 1;
    hp = a * (hp + w - prev); prev = w;
    let v = hp * tick * Math.exp(-t / 0.0022);
    for (const [f, dec, lv] of parts) v += Math.sin(2 * Math.PI * f * t) * lv * Math.exp(-t / dec);
    // A 0.4 ms attack ramp stops a hard step.
    d[i] = v * Math.min(1, t / 0.0004);
  }
  return buf;
}

// The bed: two seconds of dense small ticks, looped.
function crackle(ac, rnd) {
  const sr = ac.sampleRate, n = sr * 2, buf = ac.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let t = 0;
    while (t < n) {
      t += Math.round((-Math.log(1 - rnd()) / 520) * sr);
      const amp = 0.15 + rnd() * rnd() * 0.85, f = 2600 + rnd() * 5200, dec = 0.003 + rnd() * 0.009;
      const span = Math.min(n - t, Math.round(sr * dec * 5));
      for (let i = 0; i < span; i++) {
        const tt = i / sr;
        d[t + i] += Math.sin(2 * Math.PI * f * tt) * amp * Math.exp(-tt / dec) * 0.5;
      }
    }
  }
  return buf;
}

/**
 * Builds the rain stick's voices on the kit.
 * @param {ReturnType<import('../shared/stim.js').audioKit>} kit
 */
export function makeVoice(kit) {
  let g = null, tokens = CAP / 4, surplus = 0, surplusPan = 0, surplusN = 0, bedOn = 0, lastBed = 0, whooshEnd = 0;

  // The graph builds on the first live sound.
  function graph(ac) {
    if (g && g.ac === ac) return g;
    const rnd = seeded(65);
    const dry = ac.createGain();
    dry.gain.value = 0.9;
    dry.connect(kit.out);
    // The tube body: a feedback comb at the tube's mode, through a low pass.
    const send = ac.createGain();
    send.gain.value = 0.55;
    const comb = ac.createDelay(0.05);
    comb.delayTime.value = 1 / TUBE_HZ;
    const fb = ac.createGain();
    fb.gain.value = 0.78;
    const damp = ac.createBiquadFilter();
    damp.type = 'lowpass'; damp.frequency.value = 2200; damp.Q.value = 0.4;
    send.connect(comb); comb.connect(damp); damp.connect(fb); fb.connect(comb);
    const bodyOut = ac.createGain();
    bodyOut.gain.value = 0.22;
    damp.connect(bodyOut);
    // A low band pass gives the hollow hum under a full trickle.
    const hum = ac.createBiquadFilter();
    hum.type = 'bandpass'; hum.frequency.value = TUBE_HZ; hum.Q.value = 7;
    const humOut = ac.createGain();
    humOut.gain.value = 1.4;
    send.connect(hum); hum.connect(humOut);
    bodyOut.connect(kit.out); humOut.connect(kit.out);

    // Glass bead on a brass pin: a bright tick, a pin ring and a glass tink.
    const pin = Array.from({ length: VARIANTS }, () => {
      const f0 = 2900 + rnd() * 1300;
      return click(ac, rnd, 0.16, 0.9, [
        [f0, 0.03, 0.22], [f0 * 2.76, 0.016, 0.16], [f0 * 5.4, 0.008, 0.1],
        [5600 + rnd() * 2600, 0.012, 0.18],
      ], 1800);
    });
    // Bead on the glass wall: a duller, shorter knock.
    const wall = Array.from({ length: 4 }, () => {
      const f0 = 1500 + rnd() * 700;
      return click(ac, rnd, 0.08, 0.5, [[f0, 0.012, 0.25], [f0 * 2.3, 0.006, 0.12]], 700);
    });

    // The bed runs only while a rush lasts.
    const bedGain = ac.createGain();
    bedGain.gain.value = 0;
    const bedPan = ac.createStereoPanner();
    const bedBand = ac.createBiquadFilter();
    bedBand.type = 'highpass'; bedBand.frequency.value = 1500;
    bedBand.connect(bedGain); bedGain.connect(bedPan); bedPan.connect(dry); bedGain.connect(send);
    g = { ac, dry, send, pin, wall, bedBuf: crackle(ac, rnd), bedBand, bedGain, bedPan, bedSrc: null };
    return g;
  }

  // One voice: buffer, gain and pan, into dry and the tube.
  function play(ac, buf, level, pan, rate, at) {
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const gn = ac.createGain();
    gn.gain.value = level;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(gn); gn.connect(p); p.connect(g.dry); gn.connect(g.send);
    src.start(at);
    src.onended = () => { src.disconnect(); gn.disconnect(); p.disconnect(); };
  }

  return {
    /** Pin hit: pin index, strike speed and screen pan from -1 to 1. */
    hit(pin, speed, pan) {
      const ac = kit.live();
      if (!ac) return;
      graph(ac);
      if (tokens < 1) { surplus += speed / 60; surplusPan += pan; surplusN++; return; }
      tokens -= 1;
      const v = Math.min(1, speed / 110);
      // Each pin keeps its own pitch; jitter rides on top.
      const own = 0.88 + ((Math.imul(pin + 7, 2654435761) >>> 0) / 4294967296) * 0.3;
      const rate = own * (0.94 + Math.random() * 0.12);
      const at = ac.currentTime + Math.random() * 0.008;
      play(ac, g.pin[(Math.random() * VARIANTS) | 0], 0.06 + 0.5 * v ** 1.5 * (0.8 + Math.random() * 0.4), pan, rate, at);
    },
    /** A bead knocks the glass wall. */
    knock(speed, pan) {
      const ac = kit.live();
      if (!ac || tokens < 2) return;
      graph(ac);
      tokens -= 0.5;
      const v = Math.min(1, speed / 140);
      play(ac, g.wall[(Math.random() * 4) | 0], 0.25 * v * v, pan, 0.9 + Math.random() * 0.2, ac.currentTime + Math.random() * 0.006);
    },
    /** The beads slide down the glass as the tube turns over. */
    whoosh(pan) {
      const ac = kit.live();
      if (!ac || !kit.noise) return;
      graph(ac);
      const t = ac.currentTime;
      const src = ac.createBufferSource();
      src.buffer = kit.noise; src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 1.3;
      bp.frequency.setValueAtTime(700, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + 0.55);
      bp.frequency.exponentialRampToValueAtTime(1400, t + 0.9);
      const gn = ac.createGain();
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.16, t + 0.35);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      const p = ac.createStereoPanner();
      p.pan.setValueAtTime(-pan * 0.6, t);
      p.pan.linearRampToValueAtTime(pan * 0.6, t + 0.9);
      src.connect(bp); bp.connect(gn); gn.connect(p); p.connect(g.dry);
      src.start(t); src.stop(t + 1);
      src.onended = () => { src.disconnect(); bp.disconnect(); gn.disconnect(); p.disconnect(); };
      whooshEnd = performance.now() + 1000;
    },
    /** Once a frame: refill the cap, then set the bed level. */
    tick(dt) {
      tokens = Math.min(CAP / 4, tokens + CAP * dt);
      const ac = kit.live();
      const rate = surplus / Math.max(dt, 1 / 120);
      const pan = surplusN ? surplusPan / surplusN : 0;
      surplus = 0; surplusPan = 0; surplusN = 0;
      bedOn += (Math.min(1, rate / 40) - bedOn) * Math.min(1, dt * 6);
      if (!ac || !g) return;
      const now = performance.now();
      if (bedOn > 0.01) {
        lastBed = now;
        if (!g.bedSrc) {
          const src = ac.createBufferSource();
          src.buffer = g.bedBuf; src.loop = true;
          src.loopStart = Math.random();
          src.connect(g.bedBand);
          src.start(ac.currentTime, Math.random() * 2);
          g.bedSrc = src;
        }
        g.bedGain.gain.setTargetAtTime(0.5 * bedOn, ac.currentTime, 0.05);
        g.bedPan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, pan)), ac.currentTime, 0.1);
      } else {
        g.bedGain.gain.setTargetAtTime(0, ac.currentTime, 0.08);
        if (g.bedSrc && now - lastBed > 600) { g.bedSrc.stop(); g.bedSrc.disconnect(); g.bedSrc = null; }
      }
    },
    /** True while a whoosh or the bed still sounds. */
    busy() { return performance.now() < whooshEnd || !!g?.bedSrc; },
  };
}
