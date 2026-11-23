// Event horizon sound in Web Audio.
// Muted by default; the kit holds the context.
// A deep drone is the disc; it swells with the flare.
// One-shots: the star's arrival chime, its rising chirp, the tear, the flare's boom.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeSound(kit) {
  let pending = 0, V = null;
  const track = node => { pending++; node.onended = () => { pending--; }; };

  function voice(ac, pan) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(kit.out);
    return g;
  }
  function noise(ac, t, len, rate = 1) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    src.playbackRate.value = rate;
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

  // The loops: the drone, the flare's roar, the star's chirp, the orbit's air.
  function loops() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V && V.ac === ac) return V;
    // Drone: two low sines a few cents apart beat slowly.
    const dG = ac.createGain(); dG.gain.value = 0;
    dG.connect(kit.out);
    const d1 = ac.createOscillator(); d1.type = 'sine'; d1.frequency.value = 41.2;
    const d2 = ac.createOscillator(); d2.type = 'sine'; d2.frequency.value = 41.2 * 1.006;
    const d3 = ac.createOscillator(); d3.type = 'triangle'; d3.frequency.value = 82.6;
    const d3G = ac.createGain(); d3G.gain.value = 0.18;
    d1.connect(dG); d2.connect(dG); d3.connect(d3G).connect(dG);
    [d1, d2, d3].forEach(o => o.start());
    // Roar: low noise through a lowpass that opens with the flare.
    const rSrc = ac.createBufferSource(); rSrc.buffer = kit.noise; rSrc.loop = true; rSrc.playbackRate.value = 0.5;
    const rLp = ac.createBiquadFilter(); rLp.type = 'lowpass'; rLp.frequency.value = 160; rLp.Q.value = 0.4;
    const rG = ac.createGain(); rG.gain.value = 0;
    rSrc.connect(rLp).connect(rG).connect(kit.out);
    rSrc.start();
    // Chirp: the star's orbit as a tone; it rises as the star falls.
    const cPan = ac.createStereoPanner(); cPan.connect(kit.out);
    const cG = ac.createGain(); cG.gain.value = 0;
    const c1 = ac.createOscillator(); c1.type = 'sine'; c1.frequency.value = 110;
    const c2 = ac.createOscillator(); c2.type = 'sine'; c2.frequency.value = 220;
    const c2G = ac.createGain(); c2G.gain.value = 0.25;
    c1.connect(cG); c2.connect(c2G).connect(cG); cG.connect(cPan);
    c1.start(); c2.start();
    // Air: the camera's swing as a soft band of noise.
    const aSrc = ac.createBufferSource(); aSrc.buffer = kit.noise; aSrc.loop = true;
    const aBp = ac.createBiquadFilter(); aBp.type = 'bandpass'; aBp.frequency.value = 500; aBp.Q.value = 0.6;
    const aG = ac.createGain(); aG.gain.value = 0;
    const aPan = ac.createStereoPanner(); aPan.connect(kit.out);
    aSrc.connect(aBp).connect(aG).connect(aPan);
    aSrc.start();
    V = { ac, dG, d1, d2, rLp, rG, cPan, cG, c1, c2, aBp, aG, aPan };
    return V;
  }

  // Once a frame. pace: 0 to 1; flare: 0 to 2.5; chirp: star state or null; swing: camera rad/s.
  function update(pace, flare, chirp, swing) {
    const v = loops();
    if (!v) return;
    const now = v.ac.currentTime;
    const f = clamp(flare, 0, 2.5);
    v.dG.gain.setTargetAtTime((0.05 + 0.05 * f) * pace, now, 0.4);
    v.d1.frequency.setTargetAtTime(41.2 * (1 + 0.04 * f), now, 0.5);
    v.d2.frequency.setTargetAtTime(41.2 * 1.006 * (1 + 0.04 * f), now, 0.5);
    v.rG.gain.setTargetAtTime(0.07 * Math.min(1, f) * pace, now, 0.3);
    v.rLp.frequency.setTargetAtTime(140 + 520 * Math.min(1.5, f) * jit(0.05), now, 0.3);
    if (chirp) {
      v.c1.frequency.setTargetAtTime(chirp.f, now, 0.05);
      v.c2.frequency.setTargetAtTime(chirp.f * 2.01, now, 0.05);
      v.cG.gain.setTargetAtTime(chirp.k * 0.05, now, 0.08);
      v.cPan.pan.setTargetAtTime(clamp(chirp.pan, -1, 1), now, 0.05);
    } else v.cG.gain.setTargetAtTime(0, now, 0.06);
    const s = clamp(Math.abs(swing.v), 0, 4);
    v.aG.gain.setTargetAtTime(0.03 * Math.min(1, s / 2), now, 0.08);
    v.aBp.frequency.setTargetAtTime(380 + 420 * Math.min(1, s / 2), now, 0.08);
    v.aPan.pan.setTargetAtTime(clamp(-swing.dir * 0.5, -1, 1), now, 0.1);
  }
  function quiet() {
    if (!V) return;
    const now = V.ac.currentTime;
    [V.dG, V.rG, V.cG, V.aG].forEach(g => g.gain.setTargetAtTime(0, now, 0.08));
  }

  // A star arrives: a clear chime with a shimmer above it.
  function arrive(pan) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.004;
    const f0 = 660 * jit(0.04);
    [[1, 0.06, 2.2], [2.76, 0.02, 1.2], [5.4, 0.008, 0.6]].forEach(([m, a, len]) => {
      const g = voice(ac, pan);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a * jit(0.2), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0003, t + len * jit(0.1));
      osc(ac, 'sine', f0 * m * jit(0.004), t, len + 0.05).connect(g);
    });
  }
  // The star tears: a ripping crackle that falls, and a low thump.
  function tear(pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.004;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(2600 * jit(0.1), t);
    bp.frequency.exponentialRampToValueAtTime(320 * jit(0.1), t + 0.9);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14 * jit(0.15), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 1.0);
    noise(ac, t, 1.05, 0.7).connect(bp).connect(g);
    // Grain in the rip: short clicks, never on a grid.
    let u = t;
    while (u < t + 0.7) {
      const cg = voice(ac, pan + (Math.random() - 0.5) * 0.3);
      cg.gain.setValueAtTime(0, u);
      cg.gain.linearRampToValueAtTime(0.05 * jit(0.5) * (1 - (u - t) / 0.8), u + 0.002);
      cg.gain.exponentialRampToValueAtTime(0.0003, u + 0.03);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800 * jit(0.3);
      noise(ac, u, 0.04).connect(hp).connect(cg);
      u += 0.015 + Math.random() * 0.06;
    }
    boom(pan, 0.6);
  }
  // A deep boom, with its pitch dropping.
  function boom(pan, k = 1) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.004;
    const g = voice(ac, pan * 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32 * k * jit(0.15), t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 2.4 * jit(0.1));
    const o = osc(ac, 'sine', 68 * jit(0.06), t, 2.5);
    o.frequency.exponentialRampToValueAtTime(30 * jit(0.05), t + 2.2);
    o.connect(g);
  }

  return { update, quiet, arrive, tear, boom, get busy() { return pending > 0; } };
}
