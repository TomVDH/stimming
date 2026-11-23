// Contour map sound in Web Audio. Muted by default; the kit holds the context.
// Earth rumbles while the land moves; each contour under the brush ticks;
// the sea washes in with the flood front; lakes trickle as they rise;
// rivers babble as they run; a new summit mark pips.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The ticks walk a minor pentatonic upward with the height.
const SCALE = [0, 3, 5, 7, 10];
const noteOf = deg => {
  const o = Math.floor(deg / SCALE.length), i = ((deg % SCALE.length) + SCALE.length) % SCALE.length;
  return 12 * o + SCALE[i];
};
// Above this rate the ticks thin out.
const MAX_TICKS = 24;

export function makeSound(kit) {
  let bus = null, brown = null, pending = 0, tickGate = 0;
  let earthV = null, washV = null, earthOn = false, washOn = false, washLvl = 0;
  // Held loops by name: sand, fill, stream. Each has a level that eases.
  const held = {};
  const live = new Set();

  function ensureBus(ac) {
    if (bus) return bus;
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.002; lim.release.value = 0.15;
    lim.connect(kit.out);
    const dry = ac.createGain();
    dry.gain.value = 0.85;
    dry.connect(lim);
    // A small room: the desk and the paper, not a hall.
    const room = ac.createConvolver();
    room.buffer = roomIR(ac);
    const wet = ac.createGain();
    wet.gain.value = 0.22;
    dry.connect(room).connect(wet).connect(lim);
    bus = { dry, lim };
    return bus;
  }
  function roomIR(ac) {
    const sr = ac.sampleRate, n = Math.round(sr * 1.4);
    const b = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const k = 0.45 * Math.exp(-t * 2.5) + 0.04;
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.exp(-t * 4) * Math.min(1, t / 0.01);
      }
    }
    return b;
  }
  // Brown noise: deep and soft, the ground's own voice.
  function brownBuf(ac) {
    if (brown) return brown;
    const sr = ac.sampleRate, n = sr * 2;
    brown = ac.createBuffer(1, n, sr);
    const d = brown.getChannelData(0);
    let v = 0, peak = 0;
    for (let i = 0; i < n; i++) { v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = v; peak = Math.max(peak, Math.abs(v)); }
    // A crossfade over the loop point hides the seam.
    const x = Math.round(sr * 0.05);
    for (let i = 0; i < x; i++) { const f = i / x; d[i] = d[i] * f + d[n - x + i] * (1 - f); }
    for (let i = 0; i < n; i++) d[i] /= peak;
    return brown;
  }
  // A one-shot node chain; it counts as busy until it ends.
  function own(src, nodes, stopAt) {
    pending++;
    const v = { src };
    live.add(v);
    src.onended = () => { pending--; live.delete(v); nodes.forEach(nd => nd.disconnect()); };
    src.stop(stopAt);
  }
  function panner(ac, pan) {
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1) * 0.7;
    return p;
  }

  // A contour passes under the brush: a soft pencil tick, pitched by height.
  // Index lines tick lower and a little fuller.
  function tick(level, index, pan) {
    const ac = kit.live();
    if (!ac) return;
    const t = Math.max(ac.currentTime + 0.005, tickGate);
    if (t > ac.currentTime + 0.08) return;
    tickGate = t + (1 / MAX_TICKS) * jit(0.3);
    const b = ensureBus(ac);
    const deg = Math.round(clamp(level, -400, 1900) / 20);
    const f = 330 * 2 ** (noteOf(deg) / 12 / 2.2) * (index ? 0.5 : 1) * jit(0.006);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.04, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const g = ac.createGain();
    const lv = (index ? 0.16 : 0.09) * jit(0.15) * (level < 0 ? 0.7 : 1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lv, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, t + (index ? 0.32 : 0.16));
    // The graphite: a short band of noise on the attack.
    const n = ac.createBufferSource();
    n.buffer = kit.noise;
    n.playbackRate.value = jit(0.2);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3800 * jit(0.2); bp.Q.value = 1.4;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.05 * jit(0.3), t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.025);
    const p = panner(ac, pan + (Math.random() - 0.5) * 0.1);
    o.connect(g).connect(p);
    n.connect(bp).connect(ng).connect(p);
    p.connect(b.dry);
    o.start(t); n.start(t, Math.random() * 0.5);
    n.stop(t + 0.04);
    own(o, [o, g, n, bp, ng, p], t + (index ? 0.36 : 0.2));
  }

  // The press lands: a soft low knock on the table.
  function press(dig, pan) {
    const ac = kit.live();
    if (!ac) return;
    const b = ensureBus(ac), t = ac.currentTime + 0.005;
    const o = ac.createOscillator();
    o.type = 'sine';
    const f = (dig ? 62 : 78) * jit(0.05);
    o.frequency.setValueAtTime(f * 1.8, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32 * jit(0.1), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.22);
    const p = panner(ac, pan);
    o.connect(g).connect(p).connect(b.dry);
    o.start(t);
    own(o, [o, g, p], t + 0.25);
  }

  // A held loop: brown noise through a low-pass, for the earth or the sea.
  function loop(ac, freq, q, type = 'lowpass') {
    const b = ensureBus(ac);
    const src = ac.createBufferSource();
    src.buffer = brownBuf(ac);
    src.loop = true;
    src.playbackRate.value = jit(0.05);
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    src.connect(f).connect(g).connect(p).connect(b.dry);
    src.start(ac.currentTime, Math.random() * 1.5);
    return { src, f, g, p };
  }
  function drop(v) { try { v.src.stop(); } catch { /* stopped */ } }

  // The earth: a rumble that grows with the land's rate under the brush.
  // Digging adds grit: a higher band of the same noise.
  function earth(rate, dig, pan) {
    const ac = kit.live();
    const want = clamp(Math.log10(1 + rate / 40) / 1.2, 0, 1);
    if (!ac) { if (earthV) { drop(earthV); earthV = null; } earthOn = false; return; }
    if (!earthV && want > 0.02) earthV = loop(ac, 140, 0.8);
    if (!earthV) return;
    const t = ac.currentTime;
    earthV.g.gain.setTargetAtTime(want * (dig ? 0.5 : 0.42), t, 0.08);
    earthV.f.frequency.setTargetAtTime((dig ? 260 : 90) + 260 * want, t, 0.12);
    earthV.p.pan.setTargetAtTime(clamp(pan, -1, 1) * 0.5, t, 0.1);
    earthOn = want > 0.02;
    if (!earthOn && earthV.g.gain.value < 0.003) { drop(earthV); earthV = null; }
  }

  // The sea: a wash that follows the length of the flood front.
  function wash(reached, pan) {
    const ac = kit.live();
    washLvl += (clamp(Math.sqrt(reached) / 14, 0, 1) - washLvl) * 0.15;
    if (washLvl < 0.004) washLvl = 0;
    if (!ac) { if (washV) { drop(washV); washV = null; } washOn = false; return; }
    if (!washV && washLvl > 0.02) washV = loop(ac, 900, 0.7, 'bandpass');
    if (!washV) return;
    const t = ac.currentTime;
    washV.g.gain.setTargetAtTime(washLvl * 0.9, t, 0.12);
    washV.f.frequency.setTargetAtTime(600 + 900 * washLvl * jit(0.1), t, 0.2);
    washV.p.pan.setTargetAtTime(clamp(pan, -1, 1) * 0.4, t, 0.3);
    washOn = washLvl > 0.004;
    if (!washOn && washV.g.gain.value < 0.003) { drop(washV); washV = null; }
  }

  // A held loop of white noise through one filter, faded by its level.
  // A silent loop stops, so the context can sleep.
  function hold(name, want, { type, freq, q, gain, pan = 0, wobble = 0 }) {
    const ac = kit.live();
    let v = held[name];
    if (!ac || !kit.noise) { if (v) { drop(v); delete held[name]; } return; }
    if (!v && want > 0.02) {
      const b = ensureBus(ac);
      const src = ac.createBufferSource();
      src.buffer = kit.noise; src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = type; f.Q.value = q; f.frequency.value = freq;
      const g = ac.createGain(); g.gain.value = 0;
      const p = ac.createStereoPanner();
      src.connect(f).connect(g).connect(p).connect(b.dry);
      src.start(ac.currentTime, Math.random() * 0.8);
      v = held[name] = { src, f, g, p, on: true };
    }
    if (!v) return;
    const t = ac.currentTime;
    v.g.gain.setTargetAtTime(want * gain, t, 0.08);
    // A babble: the band jumps a little, at random, each frame.
    v.f.frequency.setTargetAtTime(freq * (1 + wobble * (Math.random() * 2 - 1)), t, wobble ? 0.03 : 0.15);
    v.p.pan.setTargetAtTime(clamp(pan, -1, 1) * 0.5, t, 0.2);
    v.on = want > 0.02;
    if (!v.on && v.g.gain.value < 0.003) { drop(v); delete held[name]; }
  }
  // Smoothing: a soft rasp, like a hand brushing sand.
  function sand(level, pan) { hold('sand', clamp(level, 0, 1), { type: 'bandpass', freq: 2600, q: 0.8, gain: 0.07, pan }); }
  // Rising lakes: a trickle that grows with the water's climb.
  function fill(rising, pan) { hold('fill', clamp(Math.sqrt(rising / 30), 0, 1), { type: 'bandpass', freq: 1300, q: 3, gain: 0.09, pan: pan * 0.5, wobble: 0.35 }); }
  // A river running out: a light, quick babble.
  function stream(growing) { hold('stream', clamp(growing * 0.6, 0, 1), { type: 'bandpass', freq: 2100, q: 4, gain: 0.07, wobble: 0.45 }); }

  // A new summit mark lands: one small high pip, pitched by the height.
  function pip(h, pan) {
    const ac = kit.live();
    if (!ac) return;
    const b = ensureBus(ac), t = ac.currentTime + 0.01;
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 880 * 2 ** (clamp(h, 0, 1900) / 1900) * jit(0.01);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06 * jit(0.1), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
    const p = panner(ac, pan);
    o.connect(g).connect(p).connect(b.dry);
    o.start(t);
    own(o, [o, g, p], t + 0.37);
  }

  // The land breaks the surface, or the sea pours into a cut.
  function splash(pan, k = 1) {
    const ac = kit.live();
    if (!ac) return;
    const b = ensureBus(ac), t = ac.currentTime + 0.01;
    const n = ac.createBufferSource();
    n.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(1800 * jit(0.2), t);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22 * k * jit(0.15), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.4);
    const p = panner(ac, pan);
    n.connect(bp).connect(g).connect(p).connect(b.dry);
    n.start(t, Math.random() * 0.5);
    own(n, [n, bp, g, p], t + 0.42);
    // Two or three bubbles rise after the splash.
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const tb = t + 0.05 + Math.random() * 0.2;
      const o = ac.createOscillator();
      const f = 500 + Math.random() * 700;
      o.frequency.setValueAtTime(f, tb);
      o.frequency.exponentialRampToValueAtTime(f * 1.9, tb + 0.06);
      const og = ac.createGain();
      og.gain.setValueAtTime(0, tb);
      og.gain.linearRampToValueAtTime(0.05 * k, tb + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0005, tb + 0.07);
      const op = panner(ac, pan + (Math.random() - 0.5) * 0.3);
      o.connect(og).connect(op).connect(b.dry);
      o.start(tb);
      own(o, [o, og, op], tb + 0.08);
    }
  }

  // A new land: a sheet slides over the desk, then the ground settles.
  function newLand() {
    const ac = kit.live();
    if (!ac) return;
    const b = ensureBus(ac), t = ac.currentTime + 0.01;
    const n = ac.createBufferSource();
    n.buffer = kit.noise;
    n.loop = true;
    const hp = ac.createBiquadFilter();
    hp.type = 'bandpass'; hp.Q.value = 0.6;
    hp.frequency.setValueAtTime(2400, t);
    hp.frequency.exponentialRampToValueAtTime(5200, t + 0.5);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.12);
    g.gain.setTargetAtTime(0, t + 0.35, 0.12);
    const p = panner(ac, -0.4);
    p.pan.linearRampToValueAtTime(0.4, t + 0.6);
    n.connect(hp).connect(g).connect(p).connect(b.dry);
    n.start(t);
    own(n, [n, hp, g, p], t + 1.2);
    const r = ac.createBufferSource();
    r.buffer = brownBuf(ac);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 160;
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0, t);
    rg.gain.linearRampToValueAtTime(0.32, t + 0.5);
    rg.gain.setTargetAtTime(0, t + 0.9, 0.3);
    r.connect(lp).connect(rg).connect(b.dry);
    r.start(t, Math.random());
    own(r, [r, lp, rg], t + 2.4);
  }

  function quiet() {
    for (const v of live) { try { v.src.stop(); } catch { /* stopped */ } }
    live.clear();
    if (earthV) { drop(earthV); earthV = null; }
    if (washV) { drop(washV); washV = null; }
    for (const k of Object.keys(held)) { drop(held[k]); delete held[k]; }
    earthOn = washOn = false; washLvl = 0;
  }

  return {
    tick, press, earth, wash, splash, newLand, quiet, sand, fill, stream, pip,
    get busy() { return pending > 0 || earthOn || washOn || Object.values(held).some(v => v.on); },
    // A held loop still fading out keeps the frame loop awake.
    get tail() { return !!(earthV || washV) || Object.keys(held).length > 0; },
  };
}
