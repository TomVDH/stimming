// Whiteout sound in Web Audio. Muted by default; the kit holds the context.
// A wind bed follows the gusts while the storm moves. The guy wires sing in strong gusts.
// One-shots: the lamp switch and its contact chatter, cooling ticks, a gust that crosses.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function makeSound(kit) {
  let pending = 0, bed = null;
  const held = new Set();
  const track = node => {
    pending++;
    held.add(node);
    node.onended = () => { pending--; held.delete(node); };
  };

  function voice(ac, pan, dest = kit.out) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(dest);
    return { g, p };
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

  /* ---------- the bed: rumble, a moving whistle, the hiss of snow, the wires ---------- */
  function makeBed(ac) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    src.playbackRate.value = 0.5;
    const src2 = ac.createBufferSource();
    src2.buffer = kit.noise;
    src2.loop = true;
    src2.playbackRate.value = 0.83;
    // The wind comes from the right.
    const { g: out, p: pan } = voice(ac, 0.3);
    const rumble = filt(ac, 'lowpass', 220, 0.6), rg = ac.createGain();
    const howl = filt(ac, 'bandpass', 600, 2.2), hg = ac.createGain();
    const hiss = filt(ac, 'highpass', 3800, 0.5), sg = ac.createGain();
    src.connect(rumble).connect(rg).connect(out);
    src2.connect(howl).connect(hg).connect(out);
    src2.connect(hiss).connect(sg).connect(out);
    // The wires: an Aeolian tone and its fifth, with a slow waver.
    const wp = voice(ac, 0.6);
    const w1 = ac.createOscillator(), w2 = ac.createOscillator();
    w1.type = 'sine'; w2.type = 'triangle';
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 0.37; lg.gain.value = 7;
    lfo.connect(lg); lg.connect(w1.frequency); lg.connect(w2.frequency);
    const w2g = ac.createGain();
    w2g.gain.value = 0.35;
    w1.connect(wp.g); w2.connect(w2g).connect(wp.g);
    const t = ac.currentTime;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(1, t + 0.8);
    [src, src2, w1, w2, lfo].forEach(n => n.start(t));
    return { ac, src, src2, w1, w2, lfo, out, pan, rumble, rg, howl, hg, hiss, sg, wire: wp.g, wirePan: wp.p };
  }
  function stopBed(fade = 0.6) {
    if (!bed) return;
    const b = bed;
    bed = null;
    const t = b.ac.currentTime;
    b.out.gain.cancelScheduledValues(t);
    b.out.gain.setTargetAtTime(0, t, fade / 3);
    b.wire.gain.cancelScheduledValues(t);
    b.wire.gain.setTargetAtTime(0, t, fade / 3);
    [b.src, b.src2, b.w1, b.w2, b.lfo].forEach(n => { try { n.stop(t + fade + 0.05); } catch { /* stopped */ } });
  }

  // Each frame: the bed follows the wind, the gust and the storm's pace.
  function update({ wind, gust, pace, panMast }) {
    const ac = kit.live();
    if (!ac || !kit.noise || pace <= 0.001) { if (bed && (!ac || pace <= 0.001)) stopBed(1.2); return; }
    if (!bed || bed.ac !== ac) bed = makeBed(ac);
    const t = ac.currentTime, k = 0.12;
    const g = clamp(gust, 0, 1.3);
    const lvl = (0.25 + 0.75 * wind) * (0.55 + 0.6 * g) * pace;
    bed.rg.gain.setTargetAtTime(0.16 * lvl, t, k);
    bed.hg.gain.setTargetAtTime(0.06 * lvl * (0.4 + g), t, k);
    bed.howl.frequency.setTargetAtTime(380 + 520 * wind + 700 * g, t, 0.25);
    bed.rumble.frequency.setTargetAtTime(140 + 160 * g, t, 0.25);
    bed.sg.gain.setTargetAtTime(0.022 * lvl * (0.3 + wind), t, k);
    bed.pan.pan.setTargetAtTime(0.3 - 0.35 * clamp(g, 0, 1), t, 0.4);
    // Strouhal: the tone rises with the wind speed.
    const f = 240 + 260 * wind + 200 * g;
    bed.w1.frequency.setTargetAtTime(f, t, 0.3);
    bed.w2.frequency.setTargetAtTime(f * 1.5, t, 0.3);
    bed.wire.gain.setTargetAtTime(0.018 * sstep(0.45, 1.05, g) * (0.3 + wind) * pace, t, 0.2);
    bed.wirePan.pan.setTargetAtTime(clamp(panMast, -1, 1), t, 0.2);
  }

  /* ---------- one-shots ---------- */
  // A heavy toggle: a click, a body knock, and on a cold start the contact chatter.
  function switchLamp(on, pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.004;
    const c = voice(ac, pan).g;
    env(c, t, 0.13 * jit(0.2), 0.001, 0.035);
    noise(ac, t, 0.06).connect(filt(ac, 'bandpass', 3200 * jit(0.12), 2.5)).connect(c);
    const b = voice(ac, pan).g;
    env(b, t, 0.12 * jit(0.2), 0.002, 0.09);
    osc(ac, 'sine', (on ? 150 : 120) * jit(0.06), t, 0.14).connect(b);
    if (on) {
      // The chatter follows the light's two flickers.
      for (const [d, a] of [[0.03, 0.025], [0.062, 0.02], [0.096, 0.03]]) {
        const k = voice(ac, pan).g;
        env(k, t + d * jit(0.05), a * jit(0.3), 0.001, 0.012);
        noise(ac, t + d, 0.03, 1.4).connect(filt(ac, 'highpass', 5200, 0.7)).connect(k);
      }
      // A faint ring as the filament takes the current.
      const r = voice(ac, pan).g;
      env(r, t + 0.12, 0.006, 0.01, 0.5);
      osc(ac, 'sine', 2180 * jit(0.03), t + 0.12, 0.6).connect(r);
    } else {
      // The bulb ticks as it cools.
      let d = 0.35;
      for (let i = 0; i < 3; i++) {
        d += (0.3 + Math.random() * 0.5) * (1 + i * 0.6);
        const k = voice(ac, pan + (Math.random() - 0.5) * 0.1).g;
        env(k, t + d, 0.012 * jit(0.4) / (1 + i * 0.5), 0.001, 0.02);
        osc(ac, 'triangle', 3600 * jit(0.15), t + d, 0.05).connect(k);
      }
    }
  }

  // A gust front crosses from the right: a swell that pans left, and a knock on the walls.
  function gust(wind) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.01;
    const len = 4.2 * jit(0.1);
    const { g, p } = voice(ac, 0.9);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * (0.5 + wind) * jit(0.15), t + 1.1);
    g.gain.setTargetAtTime(0, t + 1.9, 0.8);
    p.pan.setValueAtTime(0.9, t);
    p.pan.linearRampToValueAtTime(-0.7, t + len);
    const bp = filt(ac, 'bandpass', 320, 1.4);
    bp.frequency.setValueAtTime(320 * jit(0.1), t);
    bp.frequency.exponentialRampToValueAtTime(1100 * jit(0.12), t + 1.2);
    bp.frequency.exponentialRampToValueAtTime(420, t + len);
    noise(ac, t, len, 0.7).connect(bp).connect(g);
    // The hut takes the blow a moment later.
    const k = voice(ac, -0.05).g;
    const kt = t + 0.9 * jit(0.15);
    env(k, kt, 0.11 * jit(0.2), 0.01, 0.35);
    noise(ac, kt, 0.4, 0.4).connect(filt(ac, 'lowpass', 160, 1.2)).connect(k);
    const cr = voice(ac, -0.1).g;
    env(cr, kt + 0.08, 0.012 * jit(0.3), 0.06, 0.4);
    const bq = filt(ac, 'bandpass', 900, 9);
    bq.frequency.setValueAtTime(700 * jit(0.1), kt);
    bq.frequency.linearRampToValueAtTime(1050 * jit(0.1), kt + 0.45);
    noise(ac, kt + 0.08, 0.5, 0.6).connect(bq).connect(cr);
  }

  return {
    get busy() { return pending > 0 || !!bed; },
    update, switchLamp, gust,
    // The loop stopped: the bed fades and its sources end.
    idle() { stopBed(1.0); },
    // A hidden tab or a mute: every sound stops now.
    quiet() {
      stopBed(0.1);
      for (const n of held) { try { n.stop(); } catch { /* not started */ } }
    },
  };
}
