// Solar loop sound in Web Audio. Muted by default; the kit holds the context.
// Space is silent, so the sound is a sonification: each part has a visible cause.
// A flare: the brass blast, a rush as the rope lifts, a low roar,
// a slow chord while the arcade glows, then soft drips as the rain drains.
// A drag: a low wind that follows the speed of the turn.
// A tap on empty sky: a soft low note.
// Awake: a soft angelic organ choir over a constant deep surround rumble; flares land on a low brass blast.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The key falls as the star grows: the hypergiant hums lowest.
const ROOT = { neutron: 440, siriusb: 392, wise: 329.63, luhman: 293.66, proxima: 261.63, epseri: 233.08, sun: 220, procyon: 207.65, sirius: 196, vega: 185, ttauri: 185, regulus: 174.61, zetaoph: 164.81, rigel: 146.83, arcturus: 138.59, betelgeuse: 123.47, vycma: 110 };

export function makeSound(kit) {
  let pending = 0;
  // Every scheduled source, so mute or a hidden tab can stop them.
  const live = new Set();
  const track = node => {
    pending++;
    live.add(node);
    node.onended = () => { pending--; live.delete(node); };
    return node;
  };

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
    return track(src);
  }
  function osc(ac, type, f, t, len) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(t); o.stop(t + len);
    return track(o);
  }
  function filt(ac, type, f, q = 0.7) {
    const b = ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  function env(g, t, peak, rise, fall) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.exponentialRampToValueAtTime(0.0002, t + rise + fall);
  }
  // A wide hall: three long echoes, low passed.
  let hall = null;
  function hallOf(ac) {
    if (hall && hall.ac === ac) return hall.in;
    const inp = ac.createGain();
    const lp = filt(ac, 'lowpass', 3200);
    inp.connect(lp);
    for (const [d, g, p] of [[0.11, 0.3, -0.6], [0.23, 0.22, 0.6], [0.41, 0.15, 0]]) {
      const dl = ac.createDelay(1);
      dl.delayTime.value = d;
      const gn = ac.createGain();
      gn.gain.value = g;
      const pn = ac.createStereoPanner();
      pn.pan.value = p;
      lp.connect(dl).connect(gn).connect(pn).connect(kit.out);
    }
    hall = { ac, in: inp };
    return inp;
  }
  function send(ac, g, amt) {
    const s = ac.createGain();
    s.gain.value = amt;
    g.connect(s).connect(hallOf(ac));
  }

  // A soft clip gives the blast its brass edge.
  let clip = null;
  function clipOf(ac) {
    if (clip && clip.context === ac) return clip;
    clip = ac.createWaveShaper();
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    clip.curve = c;
    return clip;
  }
  // The blast: stacked saws an octave and a fifth apart, a filter that opens and closes.
  function braam(ac, t, pan, band, K, len = 6) {
    const root = (ROOT[band] || 220) / 4;
    const g = voice(ac, pan * 0.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2 * K, t + 0.22);
    g.gain.setTargetAtTime(0.0001, t + 1.1, len / 4);
    const lp = filt(ac, 'lowpass', 110, 3);
    lp.frequency.setValueAtTime(110, t);
    lp.frequency.exponentialRampToValueAtTime(260 + 700 * K, t + 0.45);
    lp.frequency.exponentialRampToValueAtTime(140, t + len);
    const sh = ac.createGain();
    sh.gain.value = 0.5;
    sh.connect(clipOf(ac)).connect(lp);
    lp.connect(g);
    for (const m of [0.5, 1, 1.004, 1.498, 2, 2.996]) osc(ac, 'sawtooth', root * m * jit(0.002), t, len + 1).connect(sh);
    send(ac, g, 0.7);
  }

  // The star's voice while the toy is awake, in two layers.
  // The space rumble: a constant, dense, deep surround drone, a seamless loop.
  // The hum: a soft angelic organ choir, steady; its top voice slowly sings.
  // A major pentatonic for the top voice, in semitones above the chord's root.
  const SING = [12, 14, 16, 19, 21, 24, 21, 19, 16, 14];
  // Organ drawbars by harmonic: 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1'.
  const BARS = { 1: 1, 2: 0.7, 3: 0.42, 4: 0.5, 5: 0.12, 6: 0.22, 8: 0.18 };
  // "Ah" formants: centre in Hz, width, weight.
  const AH = [[700, 130, 1], [1150, 160, 0.6], [2600, 260, 0.28], [3300, 300, 0.12]];
  const TAIL = 0.2;
  // One wave per note: organ partials plus a choir's vowel shape over the harmonics.
  const waves = new Map();
  function waveFor(ac, f) {
    const key = Math.round(f);
    const hit = waves.get(key);
    if (hit && hit.ac === ac) return hit.w;
    // Harmonics reach 11 kHz, so the top is open and crisp.
    const N = clamp(Math.floor(11000 / f), 8, 200);
    const re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let h = 1; h <= N; h++) {
      const hz = h * f;
      let vow = 0;
      for (const [c, w, a] of AH) vow += a * Math.exp(-(((hz - c) / w) ** 2));
      const organ = BARS[h] || 0;
      // A tail that falls 6 dB an octave fills the air above the vowel.
      const tail = TAIL / h;
      im[h] = 0.62 * organ + 0.38 * vow / Math.pow(h, 0.35) + tail;
    }
    const w = ac.createPeriodicWave(re, im);
    waves.set(key, { ac, w });
    return w;
  }
  // The space rumble: a constant, dense, deep surround drone.
  // It renders once per star into a stereo loop whose end crossfades into its start.
  const LOOP = 24, FADE = 3;
  // Folds the tail past LOOP back over the head with an equal-power fade, so the loop has no seam.
  function seal(buf, ac) {
    const sr = buf.sampleRate, n = LOOP * sr, f = FADE * sr;
    const out = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const a = buf.getChannelData(ch), o = out.getChannelData(ch);
      o.set(a.subarray(0, n));
      for (let i = 0; i < f; i++) {
        const k = i / f;
        o[i] = a[i] * Math.sin(k * Math.PI / 2) + a[n + i] * Math.cos(k * Math.PI / 2);
      }
    }
    return out;
  }
  // Two independent deep noise beds, one per side, and a cluster of low sines spread wide.
  async function renderBed(ac, root) {
    const sr = ac.sampleRate, len = LOOP + FADE;
    const c = new OfflineAudioContext(2, len * sr, sr);
    const merge = c.createChannelMerger(2);
    merge.connect(c.destination);
    for (let ch = 0; ch < 2; ch++) {
      const b = c.createBuffer(1, len * sr, sr);
      const d = b.getChannelData(0);
      let x = 0;
      for (let i = 0; i < d.length; i++) { x = (x + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = x * 3.5; }
      const s = c.createBufferSource();
      s.buffer = b;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 140; lp.Q.value = 0.7;
      const lp2 = c.createBiquadFilter();
      lp2.type = 'lowpass'; lp2.frequency.value = 140; lp2.Q.value = 0.7;
      s.connect(lp).connect(lp2).connect(merge, 0, ch);
      s.start(0);
    }
    // The tonal floor: twelve low sines round the root two octaves down, each placed in the field.
    const tone = c.createGain();
    tone.gain.value = 0.05;
    tone.connect(c.destination);
    for (let k = 0; k < 12; k++) {
      const o = c.createOscillator();
      o.frequency.value = root * [0.25, 0.375, 0.5][k % 3] * (1 + (k - 5.5) * 0.0016);
      const p = c.createStereoPanner();
      p.pan.value = ((k * 5) % 12) / 5.5 - 1;
      o.connect(p).connect(tone);
      o.start(0);
    }
    return seal(await c.startRendering(), ac);
  }
  let bed = null;
  let drone = null;
  // Which layers sound: the Dev toggles set them.
  const layers = { hum: true, rumble: true, lvl: 1 };
  // `near` is 1 on the long lens, 0 on the full star, below 0 zoomed out.
  // The rumble grows as the view closes in on the star (Tom).
  // Level in dB by closeness, against the old fixed level (Tom).
  // Long lens +2.3, wide view +1, full star 0; it fades only far out.
  const RUMBLE = [[-1.4, -9], [-0.7, 0], [0, 0], [0.69, 1], [1, 2.3]];
  function rumbleAt(near) {
    const P = RUMBLE, x = clamp(near, P[0][0], P[P.length - 1][0]);
    let i = 1;
    while (i < P.length - 1 && x > P[i][0]) i++;
    const [x0, y0] = P[i - 1], [x1, y1] = P[i];
    return Math.pow(10, (y0 + (y1 - y0) * (x - x0) / (x1 - x0)) / 20);
  }
  function mixLayers(hum, rumble, near = 0) {
    const lvl = rumble ? rumbleAt(near) : 0;
    if (layers.hum === hum && Math.abs(layers.lvl - lvl) < 0.01) return;
    layers.hum = hum; layers.rumble = rumble; layers.lvl = lvl;
    if (!drone) return;
    const t = drone.ac.currentTime;
    drone.humOn.gain.setTargetAtTime(hum ? 1 : 0, t, 0.4);
    drone.rumOn.gain.setTargetAtTime(lvl, t, 0.4);
  }

  // Queues the top voice's next notes: one every 7 to 11 s, gliding between them.
  function singOn(d, from) {
    const ac = d.ac;
    let t = Math.max(from, ac.currentTime);
    for (let k = 0; k < 24; k++) {
      d.step = (d.step + (Math.random() < 0.7 ? 1 : SING.length - 1)) % SING.length;
      const f = d.root * Math.pow(2, SING[d.step] / 12);
      for (const o of d.lead) o.frequency.setTargetAtTime(f, t, 1.4);
      t += 7 + Math.random() * 4;
    }
    d.until = t;
  }
  function hum(band) {
    const ac = kit.live();
    if (!ac) return;
    if (drone && drone.ac === ac && drone.band === band) {
      if (ac.currentTime > drone.until - 40) singOn(drone, drone.until);
      return;
    }
    const t = ac.currentTime + 0.01;
    if (drone && drone.ac === ac) {
      drone.g.gain.setTargetAtTime(0, t, 1.2);
      for (const o of drone.os) { try { o.stop(t + 6); } catch { /* stopped */ } }
    }
    const root = (ROOT[band] || 220) / 2;
    const os = [];
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 6);
    g.connect(kit.out);
    send(ac, g, 0.8);

    // The space rumble: a seamless rendered loop, added once it is ready.
    const rumOn = ac.createGain();
    rumOn.gain.value = layers.rumble ? layers.lvl : 0;
    rumOn.connect(g);
    const me = { ac, band };
    const bedP = bed && bed.ac === ac && bed.root === root ? Promise.resolve(bed.b) : renderBed(ac, root).then(b => (bed = { ac, root, b }).b);
    bedP.then(b => {
      // A newer star, mute, or a hidden tab won the race: drop this one.
      if (drone !== me.d || kit.live() !== ac) return;
      const s = track(ac.createBufferSource());
      s.buffer = b;
      s.loop = true;
      const a = ac.createGain();
      a.gain.value = 0.12;
      s.connect(a).connect(rumOn);
      s.start(ac.currentTime + 0.02, Math.random() * LOOP);
      os.push(s);
    });

    // The organ choir: each note is three voices a few cents apart, so it shimmers.
    const choir = ac.createGain();
    choir.gain.value = 0.022;
    const air = filt(ac, 'highshelf', 3000, 0.7);
    air.gain.value = 3;
    const top = filt(ac, 'lowpass', 9000, 0.5);
    const humOn = ac.createGain();
    humOn.gain.value = layers.hum ? 1 : 0;
    choir.connect(air).connect(top).connect(humOn).connect(g);
    const note = (f, amp) => {
      const vo = ac.createGain();
      vo.gain.value = amp;
      vo.connect(choir);
      const set = [];
      for (const c of [-7, 0, 7]) {
        const o = ac.createOscillator();
        o.setPeriodicWave(waveFor(ac, f));
        o.frequency.value = f;
        o.detune.value = c;
        o.start(t); o.stop(t + 1e5);
        track(o).connect(vo);
        os.push(o);
        set.push(o);
      }
      return set;
    };
    // A 16' bass, then root, fifth, octave and the major tenth.
    for (const [m, a] of [[0.5, 0.55], [1, 1], [1.5, 0.7], [2, 0.6], [2.5198, 0.4]]) note(root * m, a);
    const lead = note(root * 2, 0.5);
    drone = { ac, band, g, os, root, lead, step: 0, until: 0, humOn, rumOn };
    me.d = drone;
    singOn(drone, t + 9);
  }

  // A prominence lifts off: the blast, a long rising rush, a tone that bends up.
  function rise(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const K = clamp(k, 0.3, 1);
    braam(ac, t, pan, band, K, 9);
    const r = voice(ac, pan * 0.6);
    r.gain.setValueAtTime(0, t);
    r.gain.linearRampToValueAtTime(0.12 * K, t + 6);
    r.gain.exponentialRampToValueAtTime(0.0002, t + 15);
    const bp = filt(ac, 'bandpass', 90, 1.2);
    bp.frequency.setValueAtTime(90, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 13);
    noise(ac, t, 15.2, 0.6).connect(bp).connect(r);
    send(ac, r, 0.7);
    const root = (ROOT[band] || 220) / 2;
    const tg = voice(ac, pan * 0.4);
    tg.gain.setValueAtTime(0, t + 1);
    tg.gain.linearRampToValueAtTime(0.05 * K, t + 7);
    tg.gain.exponentialRampToValueAtTime(0.0002, t + 18);
    const o = osc(ac, 'triangle', root, t + 1, 17.5);
    o.frequency.setValueAtTime(root, t + 1);
    o.frequency.exponentialRampToValueAtTime(root * 1.498, t + 14);
    o.connect(tg);
    send(ac, tg, 0.6);
  }

  // The flare: every layer starts now or later on the audio clock.
  function flare(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const K = clamp(k, 0.3, 1);
    braam(ac, t, pan, band, K * 0.7, 6);
    // No crack on the tap (Tom): the brass blast carries the hit.
    // The rush: noise swept upward as the rope lifts away.
    const r = voice(ac, pan * 0.7);
    r.gain.setValueAtTime(0, t + 0.1);
    r.gain.linearRampToValueAtTime(0.14 * K, t + 1.3);
    r.gain.exponentialRampToValueAtTime(0.0002, t + 4.6);
    const bp = filt(ac, 'bandpass', 160, 1.4);
    bp.frequency.setValueAtTime(160 * jit(0.1), t + 0.1);
    bp.frequency.exponentialRampToValueAtTime(1500 * jit(0.12), t + 3.6);
    noise(ac, t + 0.1, 4.7, 0.8).connect(bp).connect(r);
    send(ac, r, 0.6);
    // The roar: a low buzz under the whole eruption.
    const lo = voice(ac, pan * 0.4);
    lo.gain.setValueAtTime(0, t);
    lo.gain.linearRampToValueAtTime(0.09 * K, t + 0.6);
    lo.gain.exponentialRampToValueAtTime(0.0002, t + 7);
    const lp = filt(ac, 'lowpass', 220, 0.9);
    for (const f of [41.2, 41.2 * 1.006]) osc(ac, 'sawtooth', f * jit(0.02), t, 7.1).connect(lp);
    lp.connect(lo);
    // The glow: a slow chord while the arcade shines.
    const root = (ROOT[band] || 220) / 2;
    const pad = voice(ac, pan * 0.5);
    pad.gain.setValueAtTime(0, t + 1.5);
    pad.gain.linearRampToValueAtTime(0.05 * K, t + 8);
    pad.gain.setValueAtTime(0.05 * K, t + 16);
    pad.gain.exponentialRampToValueAtTime(0.0002, t + 34);
    const plp = filt(ac, 'lowpass', 900, 0.5);
    plp.connect(pad);
    for (const m of [1, 1.4983, 2, 2.9966]) {
      const a = osc(ac, 'triangle', root * m * jit(0.004), t + 1.5, 33);
      a.detune.value = (Math.random() - 0.5) * 12;
      a.connect(plp);
    }
    send(ac, pad, 0.4);
    // The rain: soft drips, each a falling note, as the arcade drains.
    const n = 9 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const at = t + 12 + Math.random() * 18;
      const d = voice(ac, clamp(pan + (Math.random() - 0.5) * 0.4, -1, 1));
      env(d, at, 0.05 * K * jit(0.4), 0.004, 0.22 * jit(0.3));
      const f = 900 * jit(0.25);
      const s = osc(ac, 'sine', f, at, 0.3);
      s.frequency.exponentialRampToValueAtTime(f * 0.55, at + 0.18);
      s.connect(d);
      send(ac, d, 0.5);
    }
  }

  // The turn: a low wind whose level follows the drag speed.
  let wind = null;
  function turn(speed) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!wind || wind.ac !== ac) {
      const g = voice(ac, 0);
      const lp = filt(ac, 'lowpass', 240, 0.9);
      const src = ac.createBufferSource();
      src.buffer = kit.noise; src.loop = true; src.playbackRate.value = 0.5;
      src.connect(lp).connect(g);
      src.start();
      track(src);
      wind = { ac, g, lp, src };
    }
    const v = clamp(speed / 900, 0, 1);
    wind.g.gain.setTargetAtTime(0.16 * v, ac.currentTime, 0.06);
    wind.lp.frequency.setTargetAtTime(160 + 520 * v, ac.currentTime, 0.08);
  }
  function endTurn() {
    if (!wind) return;
    const { ac, g, src } = wind;
    g.gain.setTargetAtTime(0, ac.currentTime, 0.12);
    try { src.stop(ac.currentTime + 0.8); } catch { /* already stopped */ }
    wind = null;
  }

  // A tap on empty sky: a soft low note, an octave under the star's key.
  function hush(pan, band) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.004;
    const f = (ROOT[band] || 220) * 0.5 * jit(0.004);
    const g = voice(ac, pan);
    env(g, t, 0.05, 0.08, 1.8);
    osc(ac, 'sine', f, t, 2).connect(g);
    const h = ac.createGain();
    h.gain.value = 0.2;
    osc(ac, 'triangle', f * 1.5, t, 1.4).connect(h).connect(g);
    send(ac, g, 0.8);
  }

  // A pulsar's tick: a dry click on a short low thump, each time a beam sweeps past.
  function tick() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.003;
    const c = voice(ac, 0);
    env(c, t, 0.12, 0.001, 0.05);
    noise(ac, t, 0.08, 1.4).connect(filt(ac, 'bandpass', 2400, 2)).connect(c);
    const th = voice(ac, 0);
    env(th, t, 0.16, 0.002, 0.14);
    const o = osc(ac, 'sine', 120, t, 0.2);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    o.connect(th);
    send(ac, c, 0.3);
  }

  // The Carrington storm reaches the earth: a far telegraph sounder clacks, its line sparks.
  // In 1859 operators sent messages on the storm's current alone.
  function telegraph() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t0 = ac.currentTime + 0.02;
    const pan = Math.random() < 0.5 ? -0.55 : 0.55;
    const bar = (at, f, lvl) => {
      const g = voice(ac, pan);
      env(g, at, lvl, 0.0015, 0.05);
      noise(ac, at, 0.07, 1.2).connect(filt(ac, 'bandpass', f, 6)).connect(g);
      send(ac, g, 0.6);
    };
    // The sounder: a click as the key goes down, a clack as it comes up.
    let at = t0;
    for (let i = 0; i < 22; i++) {
      const len = Math.random() < 0.35 ? 0.2 : 0.07;
      bar(at, 1500 * jit(0.05), 0.09);
      bar(at + len, 900 * jit(0.05), 0.06);
      at += len + (Math.random() < 0.2 ? 0.3 : 0.09);
    }
    // Sparks: short crackles where the current jumps at the instrument.
    for (let i = 0; i < 9; i++) {
      const sp = t0 + Math.random() * (at - t0);
      const g = voice(ac, clamp(pan + (Math.random() - 0.5) * 0.3, -1, 1));
      env(g, sp, 0.07 * jit(0.5), 0.001, 0.03 + 0.05 * Math.random());
      noise(ac, sp, 0.12, 2).connect(filt(ac, 'highpass', 3500, 0.7)).connect(g);
    }
  }

  // The Great Dimming: a chord that falls and muffles as the light goes.
  function dim(band) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const root = (ROOT[band] || 220) / 2;
    const pad = voice(ac, 0);
    pad.gain.setValueAtTime(0, t);
    pad.gain.linearRampToValueAtTime(0.05, t + 3);
    pad.gain.setTargetAtTime(0.0001, t + 12, 5);
    const plp = filt(ac, 'lowpass', 1200, 0.5);
    plp.frequency.exponentialRampToValueAtTime(160, t + 10);
    plp.connect(pad);
    for (const m of [1, 1.189, 1.498]) {
      const o = osc(ac, 'triangle', root * m, t, 30);
      o.frequency.exponentialRampToValueAtTime(root * m * 0.94, t + 10);
      o.connect(plp);
    }
    send(ac, pad, 0.5);
  }

  // Stops every sound now: mute, a hidden tab, or sleep.
  function quiet() {
    wind = null;
    drone = null;
    for (const n of live) { try { n.stop(); } catch { /* not started */ } }
  }
  return { flare, rise, hum, mixLayers, hush, tick, telegraph, dim, turn, endTurn, quiet, get busy() { return pending > 0; } };
}
