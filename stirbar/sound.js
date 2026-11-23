// Stir vortex sound in Web Audio. Muted by default; the kit holds the context.
// A faint motor hum and the swirl of the water follow the speed.
// One-shots: knob detents, the switch, the pipette teat, the drop, the rinse.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeSound(kit) {
  let pending = 0, V = null, plopAcc = 0;
  const track = node => { pending++; node.onended = () => { pending--; }; };

  function voice(ac, pan) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(kit.out);
    return g;
  }
  function noise(ac, t, len) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    src.start(t, Math.random() * 0.9);
    src.stop(t + len);
    track(src);
    return src;
  }
  function osc(ac, type, f, t, len) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(t); o.stop(t + len);
    track(o);
    return o;
  }

  // The loops: the motor and the water. Built once, on the first live frame.
  function loops() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V && V.ac === ac) return V;
    const pan = ac.createStereoPanner();
    pan.connect(kit.out);
    // Motor: a soft electrical hum with a whir above it.
    const hum = ac.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 100;
    const humLp = ac.createBiquadFilter();
    humLp.type = 'lowpass'; humLp.frequency.value = 420; humLp.Q.value = 0.7;
    const humG = ac.createGain(); humG.gain.value = 0;
    hum.connect(humLp).connect(humG).connect(pan);
    hum.start();
    const whir = ac.createOscillator();
    whir.type = 'sine';
    whir.frequency.value = 300;
    const whirG = ac.createGain(); whirG.gain.value = 0;
    whir.connect(whirG).connect(pan);
    whir.start();
    // Swirl: water rushing round the glass, a band of noise.
    const sw = ac.createBufferSource();
    sw.buffer = kit.noise; sw.loop = true;
    sw.playbackRate.value = 0.8;
    const swBp = ac.createBiquadFilter();
    swBp.type = 'bandpass'; swBp.frequency.value = 400; swBp.Q.value = 0.8;
    const swG = ac.createGain(); swG.gain.value = 0;
    sw.connect(swBp).connect(swG).connect(pan);
    sw.start();
    V = { ac, pan, hum, humG, whir, whirG, swBp, swG };
    return V;
  }

  // Called once a frame. bar and spin are 0 to 1.
  function update(bar, spin, pan) {
    const v = loops();
    if (!v) return;
    const now = v.ac.currentTime;
    v.pan.pan.setTargetAtTime(clamp(pan, -1, 1), now, 0.1);
    // The hum rises with the motor; it never quite goes away while the motor runs.
    v.hum.frequency.setTargetAtTime(48 + 110 * bar, now, 0.12);
    v.humG.gain.setTargetAtTime(bar > 0 ? 0.012 + 0.03 * bar : 0, now, 0.12);
    v.whir.frequency.setTargetAtTime(220 + 640 * bar, now, 0.12);
    v.whirG.gain.setTargetAtTime(0.006 * bar * bar, now, 0.12);
    // The swirl wavers a little, as the funnel wanders.
    const s2 = spin * spin;
    v.swBp.frequency.setTargetAtTime((260 + 900 * spin) * jit(0.06), now, 0.2);
    v.swG.gain.setTargetAtTime(0.09 * s2 * jit(0.12), now, 0.25);
    // A deep funnel pulls air down to the bar: small gulps.
    if (spin > 0.86) {
      plopAcc += 1 / 60 * 6 * (spin - 0.86) / 0.14;
      if (plopAcc > 1 && Math.random() < 0.2) { plopAcc = 0; plip(pan + (Math.random() - 0.5) * 0.1, 0.18, true); }
    }
  }
  function quiet() {
    if (!V) return;
    const now = V.ac.currentTime;
    V.humG.gain.setTargetAtTime(0, now, 0.05);
    V.whirG.gain.setTargetAtTime(0, now, 0.05);
    V.swG.gain.setTargetAtTime(0, now, 0.08);
  }

  // A knob detent: a small dry tick. Higher on the way up.
  function tick(pan, k) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.003;
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03 * jit(0.3), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.018);
    osc(ac, 'triangle', (1900 + 600 * k) * jit(0.05), t, 0.03).connect(g);
  }
  // The switch inside the knob: a firm click on, a softer one off.
  function click(pan, on) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.003;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = (on ? 3200 : 2600) * jit(0.08); bp.Q.value = 1.4;
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime((on ? 0.16 : 0.1) * jit(0.15), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.03);
    noise(ac, t, 0.04).connect(bp).connect(g);
    const tg = voice(ac, pan);
    tg.gain.setValueAtTime(0, t);
    tg.gain.linearRampToValueAtTime(0.05, t + 0.002);
    tg.gain.exponentialRampToValueAtTime(0.0004, t + 0.05);
    osc(ac, 'sine', (on ? 720 : 560) * jit(0.05), t, 0.06).connect(tg);
  }
  // A grip on the knob: a faint rub.
  function grip(pan) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.003;
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.04);
    osc(ac, 'triangle', 820 * jit(0.1), t, 0.05).connect(g);
  }
  // The pipette swings in: a faint movement of air.
  function whoosh(pan, k) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(700 * jit(0.1), t);
    bp.frequency.exponentialRampToValueAtTime(1500 * jit(0.1), t + 0.25);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02 * k * jit(0.2), t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.32);
    noise(ac, t, 0.35).connect(bp).connect(g);
  }
  // The rubber teat squeezed: a soft squelch and a tiny squeak.
  function squeeze(pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(600 * jit(0.12), t);
    bp.frequency.exponentialRampToValueAtTime(1100 * jit(0.1), t + 0.1);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * jit(0.2), t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.14);
    noise(ac, t, 0.16).connect(bp).connect(g);
    const sg = voice(ac, pan);
    sg.gain.setValueAtTime(0, t + 0.02);
    sg.gain.linearRampToValueAtTime(0.008 * jit(0.4), t + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.0003, t + 0.12);
    const o = osc(ac, 'triangle', 1250 * jit(0.08), t + 0.02, 0.12);
    o.frequency.linearRampToValueAtTime(1500 * jit(0.08), t + 0.11);
    o.connect(sg);
  }
  // A drop into water: the bubble it traps rings and rises in pitch.
  function plip(pan, k, small = false) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.004;
    const f0 = (small ? 1400 : 850) * jit(0.12);
    const g = voice(ac, pan);
    const len = (small ? 0.05 : 0.09) * jit(0.15);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime((small ? 0.05 : 0.2) * k * jit(0.2), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0004, t + len);
    const o = osc(ac, 'sine', f0, t, len + 0.02);
    o.frequency.exponentialRampToValueAtTime(f0 * (small ? 1.5 : 2.1) * jit(0.05), t + len);
    o.connect(g);
    if (small) return;
    // The splash: a short bright spray of noise.
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 3800 * jit(0.1);
    const sg = voice(ac, pan);
    sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(0.035 * k * jit(0.25), t + 0.002);
    sg.gain.exponentialRampToValueAtTime(0.0003, t + 0.05);
    noise(ac, t, 0.06).connect(hp).connect(sg);
  }
  // Rinse: clear water runs through the beaker for a second and a half.
  function pour(pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.01;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(500 * jit(0.1), t);
    bp.frequency.linearRampToValueAtTime(1300 * jit(0.1), t + 1.3);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11 * jit(0.1), t + 0.12);
    g.gain.setValueAtTime(0.1, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 1.6);
    noise(ac, t, 1.7).connect(bp).connect(g);
    // Gulps in the pour, never on a grid.
    let u = t + 0.1;
    while (u < t + 1.4) {
      const f = 380 * jit(0.25);
      const og = voice(ac, pan + (Math.random() - 0.5) * 0.2);
      og.gain.setValueAtTime(0, u);
      og.gain.linearRampToValueAtTime(0.03 * jit(0.4), u + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0003, u + 0.06);
      const o = osc(ac, 'sine', f, u, 0.08);
      o.frequency.exponentialRampToValueAtTime(f * 1.6, u + 0.06);
      o.connect(og);
      u += 0.06 + Math.random() * 0.12;
    }
  }

  return { update, quiet, tick, click, grip, whoosh, squeeze, plip, pour, get busy() { return pending > 0; } };
}
