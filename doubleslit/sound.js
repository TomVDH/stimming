// Double slit sound in Web Audio. Muted by default; the kit holds the context.
// Each landing clicks softly, and no two clicks are the same.
// A dense stream thins the clicks and lets a soft rain rise under them.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
// Above this rate a landing clicks only by chance.
const MAX_CLICKS = 38;

export function makeSound(kit) {
  let rain = null;
  let pending = 0;

  function voice(ac, pan) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return g;
  }

  // One landing: a short noise burst through a resonant band, and a faint body.
  // x is the plate position, -1 to 1; delay is in seconds; rate is photons per second.
  function click(x, delay, rate) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (rate > MAX_CLICKS && Math.random() > MAX_CLICKS / rate) return;
    const t = ac.currentTime + 0.012 + delay + Math.random() * 0.004;
    const level = 0.32 * jit(0.35) * (rate > 12 ? 0.75 : 1);
    const g = voice(ac, x * 0.75);
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2100 + Math.random() * 2600;
    bp.Q.value = 4 + Math.random() * 5;
    const len = 0.012 + Math.random() * 0.016;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.0007);
    g.gain.exponentialRampToValueAtTime(0.0004, t + len);
    src.connect(bp).connect(g);
    src.start(t, Math.random() * (kit.noise.duration - 0.05), len + 0.01);
    // The body: a low sine tap that softens the tick.
    const o = ac.createOscillator();
    o.frequency.value = 190 * jit(0.2);
    const og = voice(ac, x * 0.75);
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(level * 0.28, t + 0.0015);
    og.gain.exponentialRampToValueAtTime(0.0003, t + 0.03);
    o.connect(og);
    o.start(t); o.stop(t + 0.04);
    pending++;
    o.onended = () => { pending--; };
  }

  // The rain: filtered noise that rises with the stream.
  function stream(rate) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const want = Math.max(0, Math.min(1, (rate - 18) / 120)) * 0.075;
    if (!rain && want > 0.002) {
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      src.loop = true;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const bp = ac.createBiquadFilter();
      bp.type = 'peaking';
      bp.frequency.value = 4200;
      bp.gain.value = 6;
      const g = voice(ac, 0);
      src.connect(hp).connect(bp).connect(g);
      src.start();
      rain = { src, g };
    }
    if (rain) rain.g.gain.setTargetAtTime(want, ac.currentTime, 0.25);
  }

  // A slit cover slides: a short scrape, then a soft stop.
  function shutter(open) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.2;
    const f0 = open ? 2400 : 1300, f1 = open ? 1300 : 2400;
    bp.frequency.setValueAtTime(f0 * jit(0.08), t);
    bp.frequency.exponentialRampToValueAtTime(f1 * jit(0.08), t + 0.16);
    const g = voice(ac, open ? 0.25 : -0.25);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.03);
    g.gain.linearRampToValueAtTime(0.06, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.2);
    src.connect(bp).connect(g);
    src.start(t, Math.random() * 0.5, 0.25);
    // The stop: a dull tap.
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(420 * jit(0.06), t + 0.17);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.22);
    const og = voice(ac, open ? 0.25 : -0.25);
    og.gain.setValueAtTime(0, t + 0.17);
    og.gain.linearRampToValueAtTime(0.16, t + 0.172);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.26);
    o.connect(og);
    o.start(t + 0.16); o.stop(t + 0.28);
  }

  // Clear: a soft wipe across the plate, left to right.
  function wipe() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(2600 * jit(0.1), t);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.6);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7);
    const p = ac.createStereoPanner();
    p.pan.setValueAtTime(-0.6, t);
    p.pan.linearRampToValueAtTime(0.6, t + 0.6);
    src.connect(bp).connect(g).connect(p).connect(kit.out);
    src.start(t); src.stop(t + 0.75);
  }

  // The loop sleeps: the rain fades and stops.
  function quiet() {
    const ac = kit.ac;
    if (!ac || !rain) return;
    const r = rain;
    rain = null;
    r.g.gain.setTargetAtTime(0, ac.currentTime, 0.08);
    r.src.stop(ac.currentTime + 0.5);
  }

  return { click, stream, shutter, wipe, quiet, get busy() { return !!rain || pending > 0; } };
}
