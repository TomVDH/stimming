// Glowing tide sound in Web Audio. Muted by default; the kit holds the context.
// A low surf bed; each break a crash that swells as it peels; swash hiss on the sand.
// A stir swishes, and a few soft high tones glint with the sparks.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeSound(kit) {
  let bed = null, swish = null, pending = 0;

  function voice(ac, pan) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(kit.out);
    return { g, p };
  }
  function loopNoise(ac) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    src.loopStart = 0; src.loopEnd = kit.noise.duration;
    return src;
  }
  const track = node => { pending++; node.onended = () => { pending--; }; };

  // The bed: low, slow surf far off. level runs 0 to 1.
  function surf(level) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) {
      const src = loopNoise(ac);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 380;
      lp.Q.value = 0.4;
      const v = voice(ac, 0);
      src.connect(lp).connect(v.g);
      src.start(0, Math.random() * 0.9);
      bed = { src, lp, g: v.g };
    }
    bed.g.gain.setTargetAtTime(0.05 + 0.1 * level, ac.currentTime, 0.6);
    bed.lp.frequency.setTargetAtTime(300 + 380 * level, ac.currentTime, 0.6);
  }

  // A break: a soft rise as the lip falls, then a long roar that darkens.
  // pan runs -1 to 1; size is the wave height in metres.
  function crash(pan, size) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.02;
    const k = clamp(size / 1.3, 0.3, 1.5);
    const len = (2.4 + 1.6 * k) * jit(0.12);
    const src = loopNoise(ac);
    const bp = ac.createBiquadFilter();
    bp.type = 'lowpass';
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(700 * jit(0.15), t);
    bp.frequency.linearRampToValueAtTime(2300 * k * jit(0.15), t + 0.5);
    bp.frequency.exponentialRampToValueAtTime(420, t + len);
    const v = voice(ac, pan * 0.7);
    v.p.pan.linearRampToValueAtTime(clamp(pan * 0.3, -1, 1), t + len * 0.6);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(0.22 * k * jit(0.2), t + 0.35 * jit(0.2));
    v.g.gain.setTargetAtTime(0.0, t + 0.6, len / 3.2);
    src.connect(bp).connect(v.g);
    src.start(t, Math.random() * 0.9);
    src.stop(t + len + 0.6);
    track(src);
    // The thump: the lip hits the trough.
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(70 * jit(0.15), t + 0.25);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.9);
    const og = voice(ac, pan * 0.5).g;
    og.gain.setValueAtTime(0, t + 0.22);
    og.gain.linearRampToValueAtTime(0.18 * k, t + 0.3);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
    o.connect(og);
    o.start(t + 0.2); o.stop(t + 1.2);
  }

  // The swash: a hiss that runs up the sand, then a fizz as it drains.
  function swash(pan, size) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.02;
    const up = (1.5 + 0.8 * size) * jit(0.1);
    const src = loopNoise(ac);
    const hp = ac.createBiquadFilter();
    hp.type = 'bandpass';
    hp.Q.value = 0.6;
    hp.frequency.setValueAtTime(2600 * jit(0.15), t);
    hp.frequency.exponentialRampToValueAtTime(5200 * jit(0.1), t + up * 2);
    const v = voice(ac, pan * 0.5);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(0.07 * clamp(size, 0.4, 1.4) * jit(0.2), t + up * 0.4);
    v.g.gain.linearRampToValueAtTime(0.03, t + up);
    v.g.gain.exponentialRampToValueAtTime(0.0005, t + up * 2.3);
    src.connect(hp).connect(v.g);
    src.start(t, Math.random() * 0.9);
    src.stop(t + up * 2.4);
    track(src);
  }

  // The stir: water parts under the hand. speed runs 0 to 1; pan -1 to 1.
  function stir(speed, pan, sea) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!swish) {
      const src = loopNoise(ac);
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.1;
      const v = voice(ac, 0);
      src.connect(bp).connect(v.g);
      src.start(0, Math.random() * 0.9);
      swish = { src, bp, g: v.g, p: v.p };
    }
    const now = ac.currentTime;
    swish.g.gain.setTargetAtTime(clamp(speed, 0, 1) * (sea ? 0.12 : 0.05), now, 0.06);
    swish.bp.frequency.setTargetAtTime((sea ? 600 : 1800) + 1400 * speed, now, 0.08);
    swish.p.pan.setTargetAtTime(clamp(pan * 0.8, -1, 1), now, 0.05);
  }

  // A glint: one small high tone for a burst of sparks.
  function glint(pan, level = 1) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.01 + Math.random() * 0.05;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = (2400 + Math.random() * 2600);
    const v = voice(ac, pan * 0.8 + (Math.random() - 0.5) * 0.3);
    const peak = 0.018 * level * jit(0.4);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(peak, t + 0.004);
    v.g.gain.exponentialRampToValueAtTime(0.0002, t + 0.25 * jit(0.4));
    o.connect(v.g);
    o.start(t); o.stop(t + 0.4);
    track(o);
  }

  // The loop sleeps: loops fade and stop.
  function quiet() {
    const ac = kit.ac;
    if (!ac) return;
    for (const l of [bed, swish]) {
      if (!l) continue;
      l.g.gain.setTargetAtTime(0, ac.currentTime, 0.15);
      l.src.stop(ac.currentTime + 0.8);
    }
    bed = null; swish = null;
  }
  // Stops the swish only, when the hand lifts.
  function lift() {
    const ac = kit.ac;
    if (ac && swish) swish.g.gain.setTargetAtTime(0, ac.currentTime, 0.12);
  }

  return { surf, crash, swash, stir, glint, quiet, lift, get busy() { return pending > 0; } };
}
