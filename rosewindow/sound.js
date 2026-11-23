// Rose window sound in Web Audio. Muted by default; the kit holds the context.
// A stone room: a long echo under every voice.
// The scrub sings like a wet finger on a glass rim; its pitch walks a D chord.
// Each half hour crossed gives a glass ping; each whole hour a far bell.
// A tap stirs the dust: a dry whisper and a few fine glints.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// D major: D4, F#4, A4, D5.
const CHORD = [293.66, 369.99, 440, 587.33];

// A stone nave's echo: 5.5 s of noise that decays and darkens.
function roomIR(ac) {
  const len = Math.round(ac.sampleRate * 5.5), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / ac.sampleRate;
      // The tail loses its top: a one-pole low-pass that closes with time.
      const k = 0.55 * Math.exp(-t / 1.6) + 0.04;
      lp += (Math.random() * 2 - 1 - lp) * k;
      // A soft onset: the first reflections come off far walls.
      d[i] = lp * Math.exp(-t / 1.25) * Math.min(1, t / 0.03) * 1.6;
    }
  }
  return ir;
}

export function makeSound(kit) {
  let bus = null, bed = null, rim = null, lastPing = 0, lastBell = 0, tailUntil = 0, lastHour = null;
  const live = new Set();

  // The echo bus starts with the first sound.
  function busOf(ac) {
    if (bus) return bus;
    const wet = ac.createGain();
    wet.gain.value = 0.9;
    const conv = ac.createConvolver();
    conv.buffer = roomIR(ac);
    wet.connect(conv).connect(kit.out);
    bus = { wet };
    return bus;
  }
  // One voice: a gain, a panner, a dry and a wet send.
  function voice(ac, pan = 0, wetK = 0.6) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    const dry = ac.createGain(), wet = ac.createGain();
    dry.gain.value = 1 - wetK * 0.7;
    wet.gain.value = wetK;
    g.connect(p);
    p.connect(dry).connect(kit.out);
    p.connect(wet).connect(busOf(ac).wet);
    return { g, p };
  }
  const track = (node, end) => {
    live.add(node);
    node.onended = () => live.delete(node);
    tailUntil = Math.max(tailUntil, end + 4);
  };

  // The room: a low air tone and a faint high hush. It brightens with the light.
  function startBed(ac) {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = true;
    const lo = ac.createBiquadFilter();
    lo.type = 'lowpass';
    lo.frequency.value = 160;
    const hi = ac.createBiquadFilter();
    hi.type = 'bandpass';
    hi.frequency.value = 900;
    hi.Q.value = 0.4;
    const vl = voice(ac, 0, 0.3), vh = voice(ac, 0, 0.9);
    s.connect(lo).connect(vl.g);
    s.connect(hi).connect(vh.g);
    s.start(0, Math.random() * 0.9);
    bed = { s, lo: vl.g, hi: vh.g };
  }
  // The rim tone: two near sines that beat, and the glass's own high partial.
  function startRim(ac) {
    const v = voice(ac, 0, 0.75);
    const os = [1, 1.0031, 2.756].map((k, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = CHORD[0] * k;
      const g = ac.createGain();
      g.gain.value = [0.5, 0.42, 0.08][i];
      o.connect(g).connect(v.g);
      o.start();
      return { o, k };
    });
    rim = { v, os, f: CHORD[0] };
  }

  // A glass ping: a few inharmonic partials, a quick strike, a long ring.
  function ping(ac, f, pan, level) {
    const t = ac.currentTime + Math.random() * 0.02;
    const v = voice(ac, pan, 0.8);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(level * jit(0.2), t + 0.004);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([k, a]) => {
      const o = ac.createOscillator();
      o.frequency.value = f * k * jit(0.004);
      const g = ac.createGain();
      g.gain.setValueAtTime(a, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / k);
      o.connect(g).connect(v.g);
      o.start(t);
      o.stop(t + 1.7);
      track(o, t + 1.7);
    });
  }
  // A far bell: hum, prime, minor third, fifth, nominal. Late, as from the tower.
  function bell(ac, level) {
    const t = ac.currentTime + 0.25 + Math.random() * 0.15;
    const f = 146.83 * jit(0.01);
    const v = voice(ac, -0.2 + Math.random() * 0.4, 1);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(level, t + 0.01);
    v.g.gain.setTargetAtTime(0, t + 0.4, 1.6);
    [[0.5, 0.5, 6], [1, 0.45, 4.5], [1.19, 0.3, 3.5], [1.5, 0.16, 2.6], [2, 0.3, 2.2], [2.52, 0.08, 1.4]].forEach(([k, a, dur]) => {
      const o = ac.createOscillator();
      o.frequency.value = f * k;
      const g = ac.createGain();
      g.gain.setValueAtTime(a, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(v.g);
      o.start(t);
      o.stop(t + dur + 0.1);
      track(o, t + dur);
    });
  }

  // Each frame: the bed follows the light; the rim follows the sun's speed.
  function frame({ dh, dt, hour, light, moving }) {
    const ac = kit.live();
    if (!ac || !kit.noise) { lastHour = hour; return; }
    if (!bed) startBed(ac);
    if (!rim) startRim(ac);
    const t = ac.currentTime;
    const day = light.day;
    bed.lo.gain.setTargetAtTime(0.16 + 0.06 * day, t, 0.5);
    bed.hi.gain.setTargetAtTime(0.012 + 0.03 * day, t, 0.5);
    // Hours a second: a brisk scrub runs about two.
    const speed = dt > 0 ? Math.abs(dh) / dt : 0;
    const sung = moving ? clamp(speed / 2.2, 0, 1) : 0;
    const f = CHORD[((Math.floor(hour * 2) % 4) + 4) % 4];
    if (f !== rim.f) {
      rim.f = f;
      rim.os.forEach(({ o, k }) => o.frequency.setTargetAtTime(f * k, t, 0.09));
    }
    // The sun's side: the light lands opposite it, so the voice pans there.
    rim.v.p.pan.setTargetAtTime(clamp(-light.sun[0] * 1.6, -0.8, 0.8), t, 0.2);
    rim.v.g.gain.setTargetAtTime(0.11 * Math.pow(sung, 0.7) * (0.35 + 0.65 * light.sunC[0] / 11), t, sung > 0.01 ? 0.06 : 0.35);
    // Crossings: a ping each half hour, a bell each whole hour.
    if (lastHour !== null && Math.floor(hour * 2) !== Math.floor(lastHour * 2)) {
      const now = performance.now();
      const pan = clamp(-light.sun[0] * 1.6, -0.8, 0.8);
      const whole = Math.floor(hour) !== Math.floor(lastHour);
      if (whole && now - lastBell > 600) { lastBell = now; bell(ac, 0.2); }
      else if (now - lastPing > 90) { lastPing = now; ping(ac, f * 2, pan, 0.05 + 0.05 * clamp(speed / 3, 0, 1)); }
    }
    lastHour = hour;
  }

  // A tap: air moves, and dust catches the light in a few fine glints.
  function stir({ pan }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    const fl = ac.createBiquadFilter();
    fl.type = 'bandpass';
    fl.Q.value = 0.7;
    fl.frequency.setValueAtTime(1400 * jit(0.15), t);
    fl.frequency.exponentialRampToValueAtTime(4200 * jit(0.15), t + 0.35);
    const v = voice(ac, pan, 0.55);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(0.09 * jit(0.2), t + 0.08);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    s.connect(fl).connect(v.g);
    s.start(t, Math.random() * 0.2);
    s.stop(t + 0.75);
    track(s, t + 0.75);
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const tt = t + 0.12 + Math.random() * 0.7;
      const o = ac.createOscillator();
      o.frequency.value = 5200 + Math.random() * 4200;
      const gv = voice(ac, pan + (Math.random() - 0.5) * 0.6, 0.85);
      gv.g.gain.setValueAtTime(0, tt);
      gv.g.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.014, tt + 0.003);
      gv.g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
      o.connect(gv.g);
      o.start(tt);
      o.stop(tt + 0.07);
      track(o, tt + 0.07);
    }
  }

  // Fades the bed and the rim and stops them. cut: also stop sounds in flight.
  function quiet(cut = false) {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (bed) {
      const b = bed;
      bed = null;
      b.lo.gain.setTargetAtTime(0, t, 0.3);
      b.hi.gain.setTargetAtTime(0, t, 0.3);
      try { b.s.stop(t + 1.5); } catch { /* stopped already */ }
    }
    if (rim) {
      const r = rim;
      rim = null;
      r.v.g.gain.setTargetAtTime(0, t, 0.15);
      r.os.forEach(({ o }) => { try { o.stop(t + 1); } catch { /* stopped already */ } });
    }
    if (cut) {
      for (const n of live) { try { n.stop(); } catch { /* not started */ } }
      live.clear();
      tailUntil = 0;
    }
  }

  return {
    frame, stir, quiet,
    // Busy while a voice or its echo still rings.
    get busy() { return live.size > 0 || (kit.ac ? kit.ac.currentTime < tailUntil : false); },
  };
}
