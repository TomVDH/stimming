// Epicycles sound in Web Audio. Muted by default; the kit holds the context.
// The shape sounds as its own Fourier series: x on the left, y on the right.
// On a scope in XY mode, the tone draws the shape.
import { harmonics } from './fourier.js';

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
// The tone's pitch: one loop of the pen per cycle.
const BASE = 110;
// Harmonics that sound; 96 of 110 Hz reach 10.5 kHz.
const H = 96;
const LEVEL = 0.16;

export function makeSound(kit) {
  let tone = null, pen = null, pending = 0, lastWave = 0, lastCount = -1, releaseT = 0;

  // Builds one PeriodicWave per channel from the kept circles.
  function waves(ac, spec, count) {
    const h = harmonics(spec, count, H);
    // The shape's own size sets no level: its RMS radius scales to 0.8.
    if (!spec.rms) spec.rms = Math.sqrt(spec.terms.reduce((s, t) => s + t.r * t.r, 0)) || 1;
    const k = 0.8 / spec.rms;
    // The screen's y points down; a scope's y points up.
    for (let i = 0; i <= H; i++) { h.xr[i] *= k; h.xi[i] *= k; h.yr[i] *= -k; h.yi[i] *= -k; }
    const o = { disableNormalization: true };
    return [ac.createPeriodicWave(h.xr, h.xi, o), ac.createPeriodicWave(h.yr, h.yi, o)];
  }

  function startTone(ac) {
    const t = ac.currentTime + 0.01;
    const merge = ac.createChannelMerger(2);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 0.4;
    const g = ac.createGain();
    g.gain.value = 0;
    merge.connect(lp).connect(g).connect(kit.out);
    // Both channels start together, so their phases stay locked.
    const oscs = [0, 1].map(ch => {
      const o = ac.createOscillator();
      o.frequency.value = BASE;
      o.connect(merge, 0, ch);
      o.start(t);
      return o;
    });
    tone = { oscs, g, lp };
  }

  function stopTone() {
    if (!tone) return;
    const { oscs, g } = tone;
    const ac = kit.ac;
    tone = null;
    lastCount = -1;
    if (!ac) return;
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.05);
    oscs.forEach(o => o.stop(t + 0.3));
    pending++;
    oscs[0].onended = () => { pending--; g.disconnect(); };
  }

  /**
   * Keeps the shape's tone sounding with the circles of this count.
   * It fades out after hold seconds with no new call.
   */
  function sing(spec, count, hold = 1.2) {
    const ac = kit.live();
    if (!ac || !spec) return;
    if (!tone) startTone(ac);
    const now = performance.now();
    // A new wave at most 15 times a second, and only when the count moves.
    if (Math.abs(count - lastCount) > 0.02 && now - lastWave > 66) {
      const [wx, wy] = waves(ac, spec, count);
      tone.oscs[0].setPeriodicWave(wx);
      tone.oscs[1].setPeriodicWave(wy);
      lastWave = now; lastCount = count;
    }
    const t = ac.currentTime;
    tone.g.gain.cancelScheduledValues(t);
    tone.g.gain.setTargetAtTime(LEVEL, t, 0.18);
    clearTimeout(releaseT);
    releaseT = setTimeout(release, hold * 1000);
  }
  function release() {
    const ac = kit.ac;
    if (!tone || !ac) return stopTone();
    const t = ac.currentTime;
    tone.g.gain.cancelScheduledValues(t);
    tone.g.gain.setTargetAtTime(0, t, 0.5);
    releaseT = setTimeout(stopTone, 2400);
  }

  // The stroke: band-passed noise that follows the pen's speed.
  // speed is in stage widths per second; x is -1 to 1.
  function stroke(speed, x) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!pen) {
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.4;
      bp.frequency.value = 1800;
      const g = ac.createGain();
      g.gain.value = 0;
      const p = ac.createStereoPanner();
      src.connect(bp).connect(g).connect(p).connect(kit.out);
      src.start();
      pen = { src, bp, g, p };
    }
    const t = ac.currentTime, s = Math.min(1, speed / 2.5);
    pen.g.gain.setTargetAtTime(0.05 * Math.sqrt(s), t, 0.04);
    pen.bp.frequency.setTargetAtTime(1400 + 3800 * s, t, 0.06);
    pen.p.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, x * 0.8)), t, 0.05);
  }
  function lift() {
    if (!pen) return;
    const { src, g } = pen;
    pen = null;
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.04);
    src.stop(t + 0.3);
    pending++;
    src.onended = () => { pending--; g.disconnect(); };
  }

  // The pen closes its loop: a small glass chime, never the same twice.
  function chime(x) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const f = 1318.5 * jit(0.025), level = 0.09 * jit(0.25);
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-0.7, Math.min(0.7, x * 0.7));
    p.connect(kit.out);
    // A glass rod rings at partials near 1, 2.76 and 5.4.
    [[1, 1, 1.9], [2.76, 0.32, 0.9], [5.4, 0.12, 0.45]].forEach(([m, a, len], i) => {
      const o = ac.createOscillator();
      o.frequency.value = f * m * jit(0.004);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level * a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0002, t + len * jit(0.15));
      o.connect(g).connect(p);
      o.start(t); o.stop(t + len * 1.2);
      pending++;
      o.onended = () => { pending--; g.disconnect(); if (i === 0) p.disconnect(); };
    });
  }

  // Stops every sound at once, for a hidden tab.
  function quiet() {
    clearTimeout(releaseT);
    stopTone();
    lift();
  }

  return {
    sing, release: () => { clearTimeout(releaseT); release(); }, stroke, lift, chime, quiet,
    get busy() { return !!tone || !!pen || pending > 0; },
  };
}
