// Solar loop sound in Web Audio. Muted by default; the kit holds the context.
// Space is silent, so the sound is a sonification: each part has a visible cause.
// A flare: the deep synth, then a slow glow chord. A lifting prominence: the synth only. A drag is silent.
// Awake: a voice over a constant deep surround rumble.
// The Sun's voice is a choir and a slowed choir; the other stars keep an organ choir for now.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The key falls as the star grows: the hypergiant hums lowest.
// The Sun sits in A sharp (Tom, 2026-11-24), set by ear with its choir.
const ROOT = { neutron: 440, siriusb: 392, wise: 329.63, luhman: 293.66, proxima: 261.63, epseri: 233.08, sun: 233.08, procyon: 207.65, sirius: 196, vega: 185, ttauri: 185, regulus: 174.61, zetaoph: 164.81, rigel: 146.83, arcturus: 138.59, betelgeuse: 123.47, vycma: 110 };

// `opt(id)` reads a Dev row; a missing row means on, at level 1.
export function makeSound(kit, opt = () => undefined) {
  const on = id => opt(id) ?? true;
  const lvl = id => opt(id) ?? 1;
  let pending = 0;
  // Every scheduled source, so mute or a hidden tab can stop them.
  const live = new Set();
  const track = node => {
    pending++;
    live.add(node);
    node.onended = () => { pending--; live.delete(node); };
    return node;
  };

  // Interaction sounds share one bus, so one Dev level sets them all.
  let fx = null;
  function fxOf(ac) {
    if (!fx || fx.ac !== ac) {
      const dry = ac.createGain(), wet = ac.createGain();
      dry.connect(kit.out);
      wet.connect(hallOf(ac));
      fx = { ac, dry, wet };
    }
    fx.dry.gain.value = fx.wet.gain.value = lvl('sndFxLvl');
    return fx;
  }
  function voice(ac, pan, dest = fxOf(ac).dry) {
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
  function send(ac, g, amt, to = fxOf(ac).wet) {
    const s = ac.createGain();
    s.gain.value = amt;
    g.connect(s).connect(to);
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
  const layers = { hum: true, rumble: true, h: 1, lvl: 1 };
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
    const h = hum ? lvl('sndHumLvl') : 0;
    const r = rumble ? rumbleAt(near) * lvl('sndRumbleLvl') : 0;
    if (Math.abs(layers.h - h) < 0.01 && Math.abs(layers.lvl - r) < 0.01) return;
    layers.hum = hum; layers.rumble = rumble; layers.h = h; layers.lvl = r;
    if (!drone) return;
    const t = drone.ac.currentTime;
    drone.humOn.gain.setTargetAtTime(h, t, 0.4);
    drone.rumOn.gain.setTargetAtTime(r, t, 0.4);
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
  // The Sun's voice (Tom, 2026-11-24): two choir layers in a long reverb.
  // Sawtooth waves pass a low pass, then four "ooh" and "ah" band passes.
  const FORMANTS = [[400, 4, 1], [750, 6, 0.8], [1150, 7, 0.45], [2700, 9, 0.15]];
  // Semitones above the base, an A two octaves over the hum's root.
  // Both scales share A3 E4 B4 C#5; Ionian adds G#4, pentatonic adds F#5.
  // Every 10 to 12 s the two crossfade over 4 s, so no pitch bends (Tom).
  const SHARED = [[-12, 1, -0.4], [-5, 0.8, 0.4], [2, 0.6, -0.2], [4, 0.55, 0.2]];
  const ION = [-1, 0.6, 0], PEN = [9, 0.4, 0];
  const LINES = [[0, 2, 4, 5, 7, 9, 11, 12], [0, 2, 4, 7, 9, 12]];
  // A 7 s reverb: decaying noise that darkens as it fades.
  let ir = null;
  function irOf(ac) {
    if (ir && ir.ac === ac) return ir.b;
    const sr = ac.sampleRate, n = Math.floor(sr * 7.5), b = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, x = (Math.random() * 2 - 1) * Math.exp(-t / 1.8) * Math.min(1, t / 0.04);
        y += (x - y) * (0.5 - 0.38 * Math.min(1, t / 7));
        d[i] = y;
      }
    }
    ir = { ac, b };
    return b;
  }
  // Two choir layers, at half level each (Tom, 2026-11-24).
  // The plain choir: one sawtooth wave per note, low passed at 3 kHz.
  // The slowed choir adds a wave an octave down, low passed at 1.8 kHz.
  // Each wave sits at exact pitch, so nothing beats (Tom: no wobble).
  // Octave voices and their levels: middle, tenor and bass (Tom).
  const SUN_OCTAVES = [[0, 1], [-1, 0.5], [-2, 0.6]];
  const SUN_LAYERS = [
    { lp: 3000, amp: 0.7, parts: [[1, 1]] },
    { lp: 1800, amp: 0.4, parts: [[1, 1.41], [0.5, 1]] },
  ];
  function sunChoir(ac, t, base, out, os) {
    const dry = ac.createGain();
    dry.gain.value = 0.5;
    const cv = ac.createConvolver();
    cv.buffer = irOf(ac);
    const wet = ac.createGain();
    wet.gain.value = 1.2;
    dry.connect(out);
    cv.connect(wet).connect(out);
    // A slow level swell: 20 percent at 0.12 Hz (Tom).
    const sw = ac.createGain();
    sw.connect(dry);
    sw.connect(cv);
    const swl = ac.createGain();
    swl.gain.value = 0.2;
    os.push(osc(ac, 'sine', 0.12, t, 1e5));
    os.at(-1).connect(swl).connect(sw.gain);
    // A slow pitch drift: 3 cents at 0.2 Hz, shared by every wave (Tom).
    const drift = ac.createGain();
    drift.gain.value = 3;
    os.push(osc(ac, 'sine', 0.2, t, 1e5));
    os.at(-1).connect(drift);
    const at = st => base * 2 ** (st / 12);
    const v = { ion: [], pen: [], leads: [[], []], li: 0, base, mode: 1, step: 0, nextMode: t + 10 + Math.random() * 2, nextLead: t + 8 };
    for (const [oct, lvl] of SUN_OCTAVES) {
      const sh = 2 ** oct;
      for (const L of SUN_LAYERS) {
        const mix = ac.createGain();
        const soft = filt(ac, 'lowpass', L.lp, 0.5);
        mix.connect(soft);
        // Level 0.35 of the tuning player, split over two layers, set by ear (Tom).
        const bus = ac.createGain();
        bus.gain.value = 0.00735 * lvl;
        for (const [f, q, a] of FORMANTS) {
          const ga = ac.createGain();
          ga.gain.value = a * 4;
          soft.connect(filt(ac, 'bandpass', f, q)).connect(ga).connect(bus);
        }
        bus.connect(sw);
        // One note: its waves, and a gain that fades it.
        const note = (f, a, pan, on = true) => {
          const g = ac.createGain();
          g.level = a * L.amp;
          g.gain.value = on ? g.level : 0;
          const p = ac.createStereoPanner();
          p.pan.value = pan;
          g.connect(p).connect(mix);
          g.waves = L.parts.map(([k, amp]) => {
            const o = ac.createOscillator();
            o.type = 'sawtooth';
            o.frequency.value = f * k;
            drift.connect(o.detune);
            const w = ac.createGain();
            w.gain.value = amp;
            o.start(t); o.stop(t + 1e5);
            track(o).connect(w).connect(g);
            os.push(o);
            return [o, k * sh];
          });
          return g;
        };
        for (const [st, a, pan] of SHARED) note(at(st) * sh, a, pan);
        v.ion.push(note(at(ION[0]) * sh, ION[1], ION[2], false));
        v.pen.push(note(at(PEN[0]) * sh, PEN[1], PEN[2]));
        // Two top voices take turns, so each step crossfades.
        v.leads[0].push(note(base * sh, 0.45, 0));
        v.leads[1].push(note(base * sh, 0.45, 0, false));
      }
    }
    return v;
  }
  function fade(g, t, from, to, len) {
    g.gain.setValueAtTime(from, t);
    g.gain.linearRampToValueAtTime(to, t + len);
  }
  // Queues the Sun's moves for four minutes on the audio clock.
  // Every 10 to 12 s the chord crossfades to the other scale over 4 s.
  // Every 8 s the top voice crossfades over 2 s to the next note of the scale.
  function sunSing(d) {
    const v = d.voice, end = Math.max(v.nextMode, v.nextLead) + 240;
    while (Math.min(v.nextMode, v.nextLead) < end) {
      if (v.nextMode <= v.nextLead) {
        v.mode = 1 - v.mode;
        const ion = v.mode === 0;
        for (const g of v.ion) fade(g, v.nextMode, ion ? 0 : g.level, ion ? g.level : 0, 4);
        for (const g of v.pen) fade(g, v.nextMode, ion ? g.level : 0, ion ? 0 : g.level, 4);
        v.nextMode += 10 + Math.random() * 2;
      } else {
        const line = LINES[v.mode];
        v.step = (v.step + (Math.random() < 0.7 ? 1 : line.length - 1)) % line.length;
        const f = v.base * 2 ** (line[v.step] / 12), t = v.nextLead;
        for (const g of v.leads[v.li]) fade(g, t, g.level, 0, 2);
        v.li ^= 1;
        for (const g of v.leads[v.li]) {
          for (const [o, k] of g.waves) o.frequency.setValueAtTime(f * k, t);
          fade(g, t, 0, g.level, 2);
        }
        v.nextLead += 8;
      }
    }
    d.until = end;
  }
  function hum(band) {
    const ac = kit.live();
    if (!ac) return;
    if (drone && drone.ac === ac && drone.band === band) {
      if (ac.currentTime > drone.until - 40) drone.voice ? sunSing(drone) : singOn(drone, drone.until);
      return;
    }
    const t = ac.currentTime + 0.01;
    if (drone && drone.ac === ac) {
      for (const x of [drone.g, drone.gc]) x?.gain.setTargetAtTime(0, t, 1.2);
      for (const o of drone.os) { try { o.stop(t + 6); } catch { /* stopped */ } }
    }
    const root = (ROOT[band] || 220) / 2;
    const os = [];
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 6);
    g.connect(kit.out);
    send(ac, g, 0.8, hallOf(ac));

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

    const humOn = ac.createGain();
    humOn.gain.value = layers.h;
    if (band === 'sun') {
      // The Sun's choir skips the echo hall: its own reverb carries it.
      const gc = ac.createGain();
      gc.gain.setValueAtTime(0, t);
      gc.gain.linearRampToValueAtTime(1, t + 4);
      humOn.connect(gc).connect(kit.out);
      const voice = sunChoir(ac, t, root * 4, humOn, os);
      drone = { ac, band, g, gc, os, voice, until: 0, humOn, rumOn };
      me.d = drone;
      sunSing(drone);
      return;
    }
    // The organ choir: each note is three voices a few cents apart, so it shimmers.
    const choir = ac.createGain();
    choir.gain.value = 0.022;
    const air = filt(ac, 'highshelf', 3000, 0.7);
    air.gain.value = 3;
    const top = filt(ac, 'lowpass', 9000, 0.5);
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

  // A prominence lifts off: the brass blast only (Tom).
  function rise(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac || !on('sndLift')) return;
    braam(ac, ac.currentTime + 0.005, pan, band, clamp(k, 0.3, 1), 9);
  }

  // A tap: the brass blast, then the glow chord (Tom: only these two).
  function flare(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const K = clamp(k, 0.3, 1);
    if (on('sndBlast')) braam(ac, t, pan, band, K * 0.7, 6);
    if (!on('sndGlow')) return;
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
  }

  // A pulsar's tick: a dry click on a short low thump, each time a beam sweeps past.
  function tick() {
    const ac = kit.live();
    if (!ac || !kit.noise || !on('sndTick')) return;
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
    if (!ac || !kit.noise || !on('sndTelegraph')) return;
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
    if (!ac || !on('sndDim')) return;
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
    drone = null;
    for (const n of live) { try { n.stop(); } catch { /* not started */ } }
  }
  return { flare, rise, hum, mixLayers, tick, telegraph, dim, quiet, get busy() { return pending > 0; } };
}
