// Rotor sound, synthesised: one blade tone per rotor, plus air wash.
// Eight rotors at near speeds beat against each other; that beat is the drone sound.

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const BLADES = 2;
const C_AIR = 343;

/**
 * @param {ReturnType<typeof import('../shared/stim.js').audioKit>} kit
 * @param {number} rotors
 */
export function createRotorSound(kit, rotors) {
  let g = null, quiet = 0;
  // Each rotor drifts a little, so the beat never settles.
  const drift = Array.from({ length: rotors }, (_, i) => ({ ph: i * 1.7, f: .23 + i * .037 }));

  function build(ac) {
    const bus = ac.createGain();
    bus.gain.value = 0;
    // The air takes the top off a far sound.
    const air = ac.createBiquadFilter();
    air.type = 'lowpass';
    air.frequency.value = 9000;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
    bus.connect(air).connect(pan).connect(kit.out);
    // A blade tone: a strong fundamental and a buzzy, odd-heavy tail.
    const N = 28, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) im[n] = (n === 1 ? 1 : .62 / Math.pow(n, 1.05)) * (n % 2 ? 1 : .7);
    const wave = ac.createPeriodicWave(re, im);
    const osc = [], og = [];
    for (let i = 0; i < rotors; i++) {
      const o = ac.createOscillator(), gg = ac.createGain();
      o.setPeriodicWave(wave);
      o.frequency.value = 40;
      gg.gain.value = 0;
      o.connect(gg).connect(bus);
      o.start();
      osc.push(o); og.push(gg);
    }
    // Air wash: a band of noise that rises with rotor speed.
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    const band = ac.createBiquadFilter();
    band.type = 'bandpass'; band.Q.value = .8; band.frequency.value = 700;
    const bandG = ac.createGain();
    bandG.gain.value = 0;
    // A low rumble under it, the downwash itself.
    const low = ac.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = 140;
    const lowG = ac.createGain();
    lowG.gain.value = 0;
    src.connect(band).connect(bandG).connect(bus);
    src.connect(low).connect(lowG).connect(bus);
    src.start();
    return { ac, bus, air, pan, osc, og, src, band, bandG, lowG };
  }

  function stop() {
    if (!g) return;
    const n = g;
    g = null;
    const t = n.ac.currentTime;
    n.bus.gain.cancelScheduledValues(t);
    n.bus.gain.setTargetAtTime(0, t, .05);
    // The nodes stop once the fade is done.
    setTimeout(() => {
      try { n.osc.forEach(o => o.stop()); n.src.stop(); } catch { /* Already stopped. */ }
      n.pan.disconnect();
    }, 400);
    kit.rest();
  }

  return {
    get on() { return !!g; },
    /**
     * @param {{ rps: number[], load: number, dist: number, pan: number, closing: number, onboard: boolean, near: number }} s
     * @param {number} dt
     * @param {number} t
     */
    update(s, dt, t) {
      const ac = kit.live();
      const spinning = s.rps.some(r => r > 1);
      quiet = spinning ? 0 : quiet + dt;
      if (!ac || quiet > 1) { stop(); return; }
      if (!g) g = build(ac);
      const now = ac.currentTime, k = .06;
      // Doppler: a closing craft sounds higher.
      const dop = C_AIR / (C_AIR - clamp(s.closing, -80, 80));
      for (let i = 0; i < rotors; i++) {
        const d = drift[i], w = 1 + .004 * Math.sin(t * d.f * 6.283 + d.ph);
        const f = Math.max(1, s.rps[i] * BLADES * w * dop);
        g.osc[i].frequency.setTargetAtTime(f, now, k);
        g.og[i].gain.setTargetAtTime(.055 * Math.pow(clamp(s.rps[i] / 120, 0, 1), 1.4), now, k);
      }
      const mean = s.rps.reduce((a, b) => a + b, 0) / rotors;
      g.band.frequency.setTargetAtTime(300 + mean * BLADES * 3.2, now, k);
      g.bandG.gain.setTargetAtTime(.22 * clamp(s.load, 0, 2) * clamp(mean / 60, 0, 1), now, k);
      // Close to the ground the downwash rumbles.
      g.lowG.gain.setTargetAtTime(.5 * clamp(s.load, 0, 2) * s.near, now, .12);
      // Loudness falls with distance; the onboard mic sits on the frame.
      const d = s.onboard ? 1.3 : s.dist;
      g.bus.gain.setTargetAtTime(1.6 / (1 + Math.pow(d / 5, 1.35)), now, .08);
      g.air.frequency.setTargetAtTime(s.onboard ? 5200 : 14000 / (1 + d / 35), now, .1);
      if (g.pan.pan) g.pan.pan.setTargetAtTime(s.onboard ? 0 : clamp(s.pan, -1, 1) * .8, now, .08);
    },
    stop
  };
}
