// Steel line sound in Web Audio. Muted by default; the kit holds the context.
// Each building has its own bed, panned by place and loudest where the view is.
// Beats from the line: clanks, the tap, the blow, the mill's thump and whine, a horn.
// No two hits are alike.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Beds: centre on the line, filter, base level.
const BEDS = {
  belt: { x: 80, type: 'bandpass', f: 900, q: 0.8, level: 0.05 },
  furnace: { x: 262, type: 'lowpass', f: 160, q: 0.7, level: 0.14 },
  blow: { x: 408, type: 'lowpass', f: 900, q: 0.5, level: 0 },
  caster: { x: 490, type: 'highpass', f: 3000, q: 0.5, level: 0.025 },
  mill: { x: 600, type: 'bandpass', f: 300, q: 1.2, level: 0.05 },
};

export function makeSound(kit) {
  const live = new Set();
  let beds = null, whine = null;

  // Where a sound sits: its pan and its level from the view.
  function place(x, view) {
    const cx = view.x + view.w / 2, d = (x - cx) / (view.w * 0.75);
    return { pan: clamp(d, -1, 1), g: Math.exp(-d * d * 1.2) };
  }
  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(kit.out);
    g.pan = p;
    return g;
  }
  function track(node, t) { node.stop(t); live.add(node); node.onended = () => live.delete(node); }
  // Filtered noise with an attack and a fall.
  function burst(ac, t, { f, q = 1, type = 'bandpass', level, a = 0.004, len, pan = 0, sweep = 1 }) {
    const s = ac.createBufferSource();
    s.buffer = kit.noise; s.loop = true;
    const fl = ac.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (sweep !== 1) fl.frequency.exponentialRampToValueAtTime(f * sweep, t + a + len);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + len);
    s.connect(fl).connect(g);
    s.start(t, Math.random() * 0.8);
    track(s, t + a + len + 0.05);
  }
  // A struck steel part: a few detuned partials that ring out.
  function clank(ac, t, { f = 180, level = 0.12, len = 0.5, pan = 0 }) {
    const g = voice(ac, pan);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    for (const m of [1, 2.76, 5.4]) {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f * m * jit(0.03);
      const og = ac.createGain();
      og.gain.value = 1 / (m * 1.4);
      o.connect(og).connect(g);
      o.start(t);
      track(o, t + len + 0.05);
    }
    burst(ac, t, { f: f * 8, q: 1, level: level * 0.5, a: 0.001, len: 0.05, pan });
  }
  // A low thump: a falling sine.
  function thump(ac, t, { f = 60, level = 0.25, len = 0.35, pan = 0 }) {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(f * 1.8, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    o.start(t);
    track(o, t + len + 0.05);
  }
  // A two-tone horn, for a train and a milestone.
  function horn(ac, t, { level = 0.08, pan = 0, len = 1.1 }) {
    for (const f of [277, 349]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f * jit(0.004);
      const fl = ac.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = 1400;
      const g = voice(ac, pan);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level, t + 0.06);
      g.gain.setValueAtTime(level, t + len);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.4);
      o.connect(fl).connect(g);
      o.start(t);
      track(o, t + len + 0.5);
    }
  }

  // One beat from the line.
  function event(e, view) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const { pan, g } = place(e.x, view);
    if (g < 0.03) return;
    const t = ac.currentTime + Math.random() * 0.01;
    switch (e.kind) {
      case 'dump': burst(ac, t, { f: 220, q: 0.6, type: 'lowpass', level: 0.3 * g, a: 0.3, len: 2.2, pan }); break;
      case 'push': burst(ac, t, { f: 700, q: 1, level: 0.12 * g, a: 0.4, len: 2.5, pan, sweep: 0.6 }); break;
      case 'quench': burst(ac, t, { f: 5000, q: 0.4, type: 'highpass', level: 0.16 * g, a: 0.15, len: 3.2, pan }); break;
      case 'skip': clank(ac, t, { f: 140 * jit(0.1), level: 0.1 * g, len: 0.7, pan }); burst(ac, t + 0.05, { f: 400, level: 0.12 * g, a: 0.05, len: 0.8, pan }); break;
      case 'tap': thump(ac, t, { f: 48, level: 0.3 * g, pan }); burst(ac, t, { f: 300, type: 'lowpass', level: 0.18 * g, a: 1.2, len: 3, pan }); break;
      case 'plug': thump(ac, t, { f: 55, level: 0.25 * g, pan }); break;
      case 'reladle': burst(ac, t, { f: 260, type: 'lowpass', level: 0.14 * g, a: 0.8, len: 4, pan }); break;
      case 'charge': burst(ac, t, { f: 180, type: 'lowpass', level: 0.3 * g, a: 0.6, len: 4.5, pan }); thump(ac, t + 0.3, { f: 40, level: 0.25 * g, pan }); break;
      case 'blow': burst(ac, t, { f: 2000, q: 0.5, level: 0.1 * g, a: 0.08, len: 0.6, pan, sweep: 0.4 }); break;
      case 'steelTap': burst(ac, t, { f: 320, type: 'lowpass', level: 0.16 * g, a: 0.8, len: 5, pan }); break;
      case 'turret': clank(ac, t, { f: 110, level: 0.14 * g, len: 1, pan }); break;
      case 'cut': burst(ac, t, { f: 6000, q: 0.6, level: 0.06 * g, a: 0.1, len: 1.4, pan }); break;
      case 'drop': clank(ac, t, { f: 90, level: 0.12 * g, len: 0.6, pan }); break;
      case 'bite': thump(ac, t, { f: 38 * jit(0.08), level: 0.32 * g, len: 0.5, pan }); clank(ac, t, { f: 70, level: 0.06 * g, len: 0.4, pan }); break;
      case 'race': if (whine) whine.kick = 1; break;
      case 'coiled': clank(ac, t, { f: 120, level: 0.1 * g, len: 0.8, pan }); break;
      case 'stack': clank(ac, t, { f: 95 * jit(0.1), level: 0.14 * g, len: 1, pan }); break;
      case 'load': clank(ac, t, { f: 105 * jit(0.1), level: 0.12 * g, len: 0.9, pan }); break;
      case 'train': horn(ac, t, { level: 0.05, pan: -0.8, len: 0.8 }); break;
      case 'horn': horn(ac, t, { level: 0.07 * Math.max(g, 0.4), pan, len: 1.2 }); break;
    }
  }
  // A tap on a building: a short two-note bell, so the rush reads.
  function rush(step, view) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime;
    clank(ac, t, { f: 520, level: 0.06, len: 0.6 });
    clank(ac, t + 0.11, { f: 780, level: 0.05, len: 0.7 });
  }

  // Beds run while the toy is awake.
  function startBeds(ac) {
    beds = {};
    for (const [k, b] of Object.entries(BEDS)) {
      const s = ac.createBufferSource();
      s.buffer = kit.noise; s.loop = true;
      const fl = ac.createBiquadFilter();
      fl.type = b.type; fl.frequency.value = b.f; fl.Q.value = b.q;
      const g = voice(ac, 0);
      s.connect(fl).connect(g);
      s.start(ac.currentTime, Math.random() * 0.8);
      beds[k] = { s, fl, g };
    }
    // The mill's whine: two saws an interval apart, through a band.
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = o2.type = 'sawtooth';
    o1.frequency.value = 90; o2.frequency.value = 135;
    const fl = ac.createBiquadFilter();
    fl.type = 'bandpass'; fl.Q.value = 2; fl.frequency.value = 600;
    const g = voice(ac, 0);
    o1.connect(fl); o2.connect(fl); fl.connect(g);
    o1.start(); o2.start();
    whine = { o1, o2, fl, g, kick: 0 };
  }
  function stopBeds(now) {
    const ac = kit.live();
    const t = ac ? ac.currentTime : 0;
    for (const b of Object.values(beds || {})) { try { b.g.gain.setTargetAtTime(0, t, now ? 0.01 : 0.2); b.s.stop(t + (now ? 0.05 : 1)); } catch { /* already stopped */ } }
    if (whine) { try { whine.g.gain.setTargetAtTime(0, t, 0.05); whine.o1.stop(t + 0.3); whine.o2.stop(t + 0.3); } catch { /* already stopped */ } }
    beds = null; whine = null;
  }

  // Each frame: bed levels from the line and from where the view is.
  function frame({ dt, view, st, amb }) {
    const ac = kit.live();
    if (!ac || !kit.noise) { if (beds) stopBeds(true); return; }
    if (!beds) startBeds(ac);
    const t = ac.currentTime;
    const want = {
      belt: st.yard.beltLoad * 0.8 + 0.2,
      furnace: 0.6 + 0.8 * st.bf.tap,
      blow: st.conv.blow * 1.0 + st.conv.pourIn * 0.4,
      caster: st.cast.run,
      mill: st.mill.water * 0.8 + (st.mill.mode === 'rough' ? 0.6 : 0.2),
    };
    for (const [k, b] of Object.entries(beds)) {
      const { pan, g } = place(BEDS[k].x, view);
      const lv = (BEDS[k].level || 0.22) * want[k] * g * amb;
      b.g.gain.setTargetAtTime(lv, t, 0.25);
      b.g.pan.pan.setTargetAtTime(pan, t, 0.25);
    }
    // The whine climbs as the strip speeds up.
    const racing = st.mill.mode === 'finish' ? 1 : 0;
    whine.kick = Math.max(0, whine.kick - dt * 0.4);
    const { g: wg } = place(615, view);
    whine.g.gain.setTargetAtTime(0.02 * racing * wg * amb, t, 0.2);
    whine.o1.frequency.setTargetAtTime(racing ? 160 : 90, t, 0.8);
    whine.o2.frequency.setTargetAtTime(racing ? 240 : 135, t, 0.8);
  }

  function quiet(now = false) {
    if (beds) stopBeds(now);
    if (now) for (const n of live) { try { n.stop(); } catch { /* ended */ } }
  }
  return { get busy() { return false; }, event, rush, frame, quiet };
}
