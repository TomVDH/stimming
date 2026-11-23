// Milk crown sound in Web Audio. Muted by default; the kit holds the context.
// The moment plays slowed down, so its sounds are slow and low too.
// One-shots: the release, the impact, the crown, beads, the jet, the pinch, the return.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeSound(kit) {
  let pending = 0, lastTick = 0;
  const track = node => { pending++; node.onended = () => { pending--; }; };

  function voice(ac, pan, dest = kit.out) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(dest);
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
  function filt(ac, type, f, q = 0.7) {
    const b = ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  // An envelope: a quick rise to the peak, then a fall to silence.
  function env(g, t, peak, rise, fall) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.exponentialRampToValueAtTime(0.0002, t + rise + fall);
  }
  // A small studio room: two short echoes, low passed.
  let room = null;
  function roomOf(ac) {
    if (room && room.ac === ac) return room.in;
    const inp = ac.createGain();
    const lp = filt(ac, 'lowpass', 2400);
    const d1 = ac.createDelay(0.2), d2 = ac.createDelay(0.2);
    d1.delayTime.value = 0.037; d2.delayTime.value = 0.061;
    const g1 = ac.createGain(), g2 = ac.createGain();
    g1.gain.value = 0.22; g2.gain.value = 0.14;
    inp.connect(lp);
    lp.connect(d1).connect(g1).connect(kit.out);
    lp.connect(d2).connect(g2).connect(kit.out);
    room = { ac, in: inp };
    return inp;
  }
  function send(ac, g, amt) {
    const s = ac.createGain();
    s.gain.value = amt;
    g.connect(s).connect(roomOf(ac));
  }

  // The release: a soft valve tick and a breath of air.
  function release() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.004;
    const g = voice(ac, 0);
    env(g, t, 0.05 * jit(0.2), 0.002, 0.05);
    noise(ac, t, 0.08).connect(filt(ac, 'bandpass', 2600 * jit(0.1), 1.6)).connect(g);
    const a = voice(ac, 0);
    env(a, t, 0.018, 0.12, 0.5);
    noise(ac, t, 0.7, 0.5).connect(filt(ac, 'bandpass', 900 * jit(0.1), 0.6)).connect(a);
  }

  // The impact, slowed: a deep soft body and a plunk.
  function impact(s) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.003;
    const k = clamp(s, 0.4, 1.4);
    const g = voice(ac, 0);
    env(g, t, 0.24 * k * jit(0.1), 0.012, 0.9);
    const o = osc(ac, 'sine', 92 * jit(0.05), t, 1.0);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.8);
    o.connect(g);
    send(ac, g, 0.5);
    const n = voice(ac, 0);
    env(n, t, 0.09 * k, 0.02, 0.7);
    const bp = filt(ac, 'bandpass', 380 * jit(0.08), 1.8);
    bp.frequency.exponentialRampToValueAtTime(180, t + 0.6);
    noise(ac, t, 0.8, 0.6).connect(bp).connect(n);
    send(ac, n, 0.4);
  }
  // The crown rising: a slow airy swell that opens and closes.
  function crown(s) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.003;
    const g = voice(ac, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * clamp(s, 0.4, 1.3), t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0002, t + 1.9);
    const bp = filt(ac, 'bandpass', 420, 1.1);
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(1600 * jit(0.05), t + 0.8);
    bp.frequency.exponentialRampToValueAtTime(700, t + 1.9);
    noise(ac, t, 2.0, 0.7).connect(bp).connect(g);
    send(ac, g, 0.3);
  }
  // A bead pinches off: a small round tick, high and soft.
  function bead(pan) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.003 + Math.random() * 0.02;
    const g = voice(ac, pan);
    env(g, t, 0.022 * jit(0.4), 0.003, 0.14);
    const f = 1500 * jit(0.25);
    const o = osc(ac, 'sine', f, t, 0.18);
    o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.1);
    o.connect(g);
    send(ac, g, 0.25);
  }
  // A bead falls back: a tiny plip with a rising pitch.
  function plip(pan, k = 1) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.003 + Math.random() * 0.03;
    const g = voice(ac, pan);
    env(g, t, 0.02 * k * jit(0.4), 0.004, 0.12);
    const f = 700 * jit(0.2);
    const o = osc(ac, 'sine', f, t, 0.16);
    o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.1);
    o.connect(g);
  }
  // The jet rising: a low glide up, with water under it.
  function jet(s) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.003;
    const g = voice(ac, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07 * clamp(s, 0.4, 1.3), t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0002, t + 1.5);
    const o = osc(ac, 'sine', 110, t, 1.6);
    o.frequency.exponentialRampToValueAtTime(240 * jit(0.05), t + 1.2);
    o.connect(g);
    const n = voice(ac, 0);
    n.gain.setValueAtTime(0, t);
    n.gain.linearRampToValueAtTime(0.03, t + 0.4);
    n.gain.exponentialRampToValueAtTime(0.0002, t + 1.3);
    noise(ac, t, 1.4, 0.5).connect(filt(ac, 'lowpass', 600)).connect(n);
    send(ac, g, 0.3);
  }
  // The pinch-off: a slowed bloop whose pitch climbs, as a closing neck rings.
  function pinch(s) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.003;
    const g = voice(ac, 0);
    env(g, t, 0.12 * clamp(s, 0.4, 1.3) * jit(0.1), 0.01, 0.55);
    const f = 300 * jit(0.06);
    const o = osc(ac, 'sine', f, t, 0.6);
    o.frequency.exponentialRampToValueAtTime(f * 2.1, t + 0.35);
    o.connect(g);
    const h = voice(ac, 0);
    env(h, t, 0.025, 0.01, 0.3);
    osc(ac, 'triangle', f * 2.02, t, 0.35).connect(h);
    send(ac, g, 0.5);
  }
  // The droplet's return: a fuller plunk.
  function land(s) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.003;
    const g = voice(ac, 0);
    env(g, t, 0.08 * clamp(s, 0.4, 1.3) * jit(0.1), 0.006, 0.4);
    const f = 420 * jit(0.06);
    const o = osc(ac, 'sine', f, t, 0.45);
    o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.18);
    o.connect(g);
    const n = voice(ac, 0);
    env(n, t, 0.03, 0.004, 0.2);
    noise(ac, t, 0.25).connect(filt(ac, 'bandpass', 900, 1.2)).connect(n);
    send(ac, g, 0.45);
  }

  function cue(kind, v, pan) {
    if (kind === 'impact') impact(v);
    else if (kind === 'crown') crown(v);
    else if (kind === 'bead') bead(pan);
    else if (kind === 'beadland') plip(pan, 0.7);
    else if (kind === 'jet') jet(v);
    else if (kind === 'pinch') pinch(v);
    else if (kind === 'land') land(v);
  }
  // A scrub: one film frame clicks past the gate.
  function tick(dir, pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const now = performance.now();
    if (now - lastTick < 28) return;
    lastTick = now;
    const t = ac.currentTime + 0.002;
    const g = voice(ac, pan * 0.4);
    env(g, t, 0.022 * jit(0.3), 0.001, 0.025);
    noise(ac, t, 0.04).connect(filt(ac, 'bandpass', (dir > 0 ? 3400 : 2700) * jit(0.06), 3)).connect(g);
  }
  // A hold: the gate shuts on one frame.
  function freeze() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.002;
    const g = voice(ac, 0);
    env(g, t, 0.035, 0.001, 0.06);
    noise(ac, t, 0.08).connect(filt(ac, 'bandpass', 1800, 2.2)).connect(g);
  }
  function quiet() { /* one-shots only: nothing holds on */ }

  return { release, cue, tick, freeze, quiet, get busy() { return pending > 0; } };
}
