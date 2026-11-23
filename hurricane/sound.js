// Hurricane eye sound in Web Audio. Muted by default; the kit holds the context.
// A bed while awake: four turboprops, the rain roar, the wind.
// One-shots: thunder late by distance, a thump and a rattle on each jolt.
// quiet() stops every node, so an idle page runs no audio.
import { BOLTS, JOLTS, T_BREAK } from './track.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Sound crosses a kilometre in about 2.9 s.
const SPEED = 0.343;

export function makeSound(kit) {
  let bed = null;
  let lastTau = -1;
  const pending = new Set();

  function noiseSrc(ac) {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = true;
    s.start(ac.currentTime, Math.random() * 0.9);
    return s;
  }

  // The bed: engines through a low pass, rain as filtered noise, a soft wind.
  function build(ac) {
    const out = ac.createGain();
    out.gain.value = 0;
    out.connect(kit.out);
    const eng = ac.createGain();
    eng.gain.value = 0.11;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.7;
    eng.connect(lp).connect(out);
    // Four engines, each a little off the others: they beat slowly.
    const oscs = [67.6, 68.1, 68.9, 69.4].map((f, i) => {
      const o = ac.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'square';
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = i % 2 ? 0.25 : 0.12;
      o.connect(g).connect(eng);
      o.start();
      return o;
    });
    // The turbines' whine sits high and quiet.
    const whine = ac.createOscillator();
    whine.frequency.value = 2380;
    const wg = ac.createGain();
    wg.gain.value = 0.006;
    whine.connect(wg).connect(out);
    whine.start();
    oscs.push(whine);
    // Rain on the skin: a broad roar and a hiss on the glass.
    const rainN = noiseSrc(ac);
    const rb = ac.createBiquadFilter();
    rb.type = 'bandpass'; rb.frequency.value = 900; rb.Q.value = 0.4;
    const rg = ac.createGain();
    rg.gain.value = 0;
    rainN.connect(rb).connect(rg).connect(out);
    const hissN = noiseSrc(ac);
    const hh = ac.createBiquadFilter();
    hh.type = 'highpass'; hh.frequency.value = 3500;
    const hg = ac.createGain();
    hg.gain.value = 0;
    hissN.connect(hh).connect(hg).connect(out);
    // The slipstream: low wind, louder in the wall.
    const windN = noiseSrc(ac);
    const wl = ac.createBiquadFilter();
    wl.type = 'lowpass'; wl.frequency.value = 380;
    const windG = ac.createGain();
    windG.gain.value = 0.05;
    windN.connect(wl).connect(windG).connect(out);
    out.gain.setTargetAtTime(1, ac.currentTime, 0.4);
    return { out, oscs, srcs: [rainN, hissN, windN], rg, hg, windG, eng };
  }

  // Thunder: a crack, then a long low roll, late by the distance.
  function thunder(ac, km, k) {
    const t = ac.currentTime + km / SPEED;
    const s = noiseSrc(ac);
    s.stop(t + 7);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900 / (1 + km);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5 * k, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.18 * k, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 6.5);
    s.connect(lp).connect(g).connect(kit.out);
    pending.add(s);
    s.onended = () => pending.delete(s);
  }

  // A jolt: the airframe thumps and loose things rattle.
  function jolt(ac, k) {
    const t = ac.currentTime + 0.01;
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.25);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * k, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(kit.out);
    o.start(t); o.stop(t + 0.45);
    const n = noiseSrc(ac);
    n.stop(t + 0.5);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.12 * k, t + 0.02);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    n.connect(bp).connect(ng).connect(kit.out);
    for (const x of [o, n]) { pending.add(x); x.onended = () => pending.delete(x); }
  }

  // Called each step. rain is 0 to 1; calm softens the jolts.
  function update(fly, shape, rain, calm) {
    const ac = kit.live();
    if (!ac || !kit.noise) { lastTau = fly.tau; return; }
    if (!bed) bed = build(ac);
    const now = ac.currentTime;
    // The roar follows the rain and stops with it at the break.
    bed.rg.gain.setTargetAtTime(0.32 * rain, now, 0.12);
    bed.hg.gain.setTargetAtTime(0.06 * fly.wet, now, 0.2);
    const inWall = fly.tau < T_BREAK ? 1 : 0;
    bed.windG.gain.setTargetAtTime(0.03 + 0.06 * inWall, now, 0.3);
    // A fade masks the restart.
    bed.out.gain.setTargetAtTime(1 - fly.fade, now, 0.08);
    // One-shots fire as the track time crosses their marks.
    if (fly.tau > lastTau && fly.tau - lastTau < 1) {
      for (const [t, ahead] of BOLTS) if (lastTau < t && fly.tau >= t) thunder(ac, Math.max(0.3, ahead), 1);
      for (const [t] of JOLTS) if (lastTau < t && fly.tau >= t) jolt(ac, clamp(shape.jolt, 0.3, 1) * (calm ? 0.5 : 1));
    }
    lastTau = fly.tau;
  }

  // Stops the bed and every pending sound.
  function quiet() {
    for (const s of pending) { try { s.stop(); } catch { /* already stopped */ } }
    pending.clear();
    if (!bed) return;
    const b = bed;
    bed = null;
    const ac = kit.ac;
    const t = ac ? ac.currentTime : 0;
    try { b.out.gain.setTargetAtTime(0, t, 0.05); } catch { /* context gone */ }
    setTimeout(() => {
      for (const o of [...b.oscs, ...b.srcs]) { try { o.stop(); } catch { /* already stopped */ } }
      b.out.disconnect();
    }, 300);
  }

  function restart() { lastTau = -1; }

  return { update, quiet, restart, get busy() { return !!bed || pending.size > 0; } };
}
