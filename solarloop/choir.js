// Solar loop choir: one voice for every star, shaped by a preset.
// The Sun's preset is the voice Tom set by ear (2026-11-24).
// The choir lab (lab.html) tunes presets live; the toy plays them.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const R = st => 2 ** (st / 12);

// Sci-fi filters, in chain order.
export const FX = [['machine', 'Machine'], ['sweep', 'Sweep'], ['screech', 'Screech'], ['dark', 'Dark'], ['radio', 'Transmission'], ['echo', 'Deep echo']];
export const WAVES = { sawtooth: 'Saw (choir)', organ: 'Organ', square: 'Square (reed)', triangle: 'Triangle (flute)', pulse: 'Pulse (analog synth)', fm: 'FM (glass synth)' };
export const MODES = ['Ionian', 'pentatonic', 'harmonic minor', 'harmonic series'];
export const TAP_WAVES = { sawtooth: 'Saw (brass)', square: 'Square (hollow)', triangle: 'Triangle (soft)', sine: 'Sine (pure)' };
// The glow chord as ratios: major, minor, or overtones with the 7th.
export const CHORDS = { major: [1, 1.4983, 2, 2.9966], minor: [1, 1.1892, 1.4983, 2], overtone: [1, 1.5, 1.75, 2.25] };
// Default motion: all movement on; the chord crossfades Ionian and pentatonic.
export const MOTION = { drift: true, swell: true, melody: true, scale: 'cross' };

const fx0 = () => Object.fromEntries(FX.map(([k]) => [k, { on: false, amt: 0.5 }]));
const fxOn = o => { const f = fx0(); for (const k in o) f[k] = { on: true, amt: o[k] }; return f; };
// wave: the source. voice: 1 is a full choir, 0 the bare instrument.
// vowel scales the formants: below 1 is "oo", above 1 is "ee".
// metal: ring modulation mix. det: unison detune in cents.
// res: synth filter Q. fmot: synth filter sweep depth.
// dist: distance, 0 near, 1 far. gain: loudness trim against the Sun.
// The tap: blastWave and glowWave are the sources, chord the glow's notes.
export const SUN = { wave: 'sawtooth', voice: 1, vowel: 1, metal: 0, bright: 1, det: 0, res: 0.5, fmot: 0, step: 8, swD: 0.2, swR: 0.12, dist: 0, rev: 7, mix: 1, width: 1, oct: [1, 0.5, 0.6], gain: 1, blastWave: 'sawtooth', glowWave: 'triangle', chord: 'major', blastLvl: 1, glowLvl: 1, fx: fx0() };
const P = o => ({ ...SUN, ...o, oct: o.oct || SUN.oct, fx: o.fx ? fxOn(o.fx) : fx0() });
// First presets (2026-11-24): giants and odd stars are synths, far and cold.
// Gains match each star's loudness to the Sun, measured offline.
export const VOICES = {
  sun: SUN,
  zetaoph: P({ chord: 'overtone', det: 12, res: 5, fmot: 0.45, voice: 0.35, vowel: 1.3, metal: 0.3, bright: 1.4, step: 9, dist: 0.5, rev: 10, mix: 1.3, width: 1.5, oct: [1, 0.6, 0.6], swR: 0.07, swD: 0.12, fx: { sweep: 0.45, screech: 0.2 }, gain: 0.66 }),
  regulus: P({ wave: 'square', voice: 0.75, vowel: 1.2, metal: 0.1, bright: 1.3, step: 6, dist: 0.1, width: 1.4, swR: 0.18, gain: 0.72 }),
  vega: P({ wave: 'triangle', voice: 0.55, vowel: 1.25, metal: 0.3, bright: 1.25, step: 7, dist: 0.15, width: 1.3, oct: [1, 0.5, 0.4], swD: 0.15, gain: 0.75 }),
  sirius: P({ wave: 'organ', voice: 0.6, vowel: 1.2, metal: 0.08, bright: 1.25, step: 7, dist: 0.05, width: 1.2, oct: [1, 0.5, 0.5], swD: 0.15, gain: 0.45 }),
  procyon: P({ voice: 0.85, vowel: 1.1, bright: 1.1, step: 7.5, oct: [1, 0.5, 0.55], gain: 0.77 }),
  epseri: P({ voice: 0.9, vowel: 0.9, metal: 0.05, bright: 0.9, rev: 6.5, swR: 0.15, swD: 0.25, oct: [1, 0.5, 0.5], gain: 0.95 }),
  proxima: P({ wave: 'square', voice: 0.8, vowel: 0.8, bright: 0.75, step: 9, rev: 6, dist: 0.2, oct: [1, 0.5, 0.4], swR: 0.1, swD: 0.25, gain: 0.61 }),
  luhman: P({ chord: 'minor', wave: 'pulse', det: 6, res: 4, fmot: 0.35, voice: 0.4, vowel: 0.7, metal: 0.2, bright: 0.6, step: 11, dist: 0.65, rev: 11, mix: 1.5, width: 1.6, oct: [0.8, 0.5, 0.5], swR: 0.05, swD: 0.1, fx: { dark: 0.45, sweep: 0.35 }, gain: 0.21 }),
  wise: P({ glowWave: 'sine', chord: 'minor', wave: 'fm', res: 3, fmot: 0.3, voice: 0.3, vowel: 0.6, metal: 0.25, bright: 0.5, step: 13, dist: 0.85, rev: 13, mix: 1.7, width: 1.8, oct: [0.7, 0.5, 0.6], swR: 0.04, swD: 0.08, fx: { dark: 0.6, echo: 0.5, sweep: 0.3 }, gain: 0.15 }),
  ttauri: P({ wave: 'pulse', det: 9, res: 3, fmot: 0.4, voice: 0.45, vowel: 0.9, metal: 0.12, bright: 0.85, step: 9, dist: 0.55, rev: 10, mix: 1.4, width: 1.7, swR: 0.2, swD: 0.3, fx: { sweep: 0.3, echo: 0.35 }, gain: 0.3 }),
  arcturus: P({ glowWave: 'sawtooth', det: 7, res: 3, fmot: 0.25, voice: 0.55, vowel: 0.85, bright: 0.8, step: 10, rev: 10, width: 1.3, oct: [1, 0.6, 0.8], swR: 0.08, gain: 0.86 }),
  rigel: P({ glowWave: 'sawtooth', wave: 'pulse', det: 8, res: 5, fmot: 0.3, voice: 0.4, vowel: 1.3, metal: 0.18, bright: 1.3, step: 10, dist: 0.3, rev: 10, mix: 1.2, width: 1.6, oct: [1, 0.6, 0.8], swR: 0.08, gain: 0.43 }),
  betelgeuse: P({ glowWave: 'sawtooth', chord: 'minor', det: 10, res: 4, fmot: 0.4, voice: 0.5, vowel: 0.75, metal: 0.05, bright: 0.7, step: 12, dist: 0.35, rev: 11, mix: 1.2, width: 1.6, oct: [0.9, 0.7, 1], swR: 0.05, swD: 0.3, fx: { dark: 0.25 }, gain: 0.4 }),
  vycma: P({ glowWave: 'sawtooth', chord: 'minor', det: 14, res: 6, fmot: 0.5, voice: 0.35, vowel: 0.65, metal: 0.15, bright: 0.6, step: 14, dist: 0.7, rev: 12, mix: 1.5, width: 1.8, oct: [0.8, 0.7, 1], swR: 0.04, swD: 0.25, fx: { dark: 0.4, echo: 0.4 }, gain: 0.27 }),
  siriusb: P({ glowWave: 'sine', chord: 'overtone', wave: 'fm', res: 5, fmot: 0.3, voice: 0.2, vowel: 1.3, metal: 0.55, bright: 1.3, step: 9, dist: 0.6, rev: 10, mix: 1.5, width: 1.5, oct: [1, 0.4, 0.15], swR: 0.1, swD: 0.1, fx: { machine: 0.4, echo: 0.4 }, gain: 0.45 }),
  neutron: P({ blastWave: 'square', glowWave: 'sine', chord: 'overtone', wave: 'fm', res: 8, fmot: 0.6, voice: 0.1, vowel: 1.4, metal: 0.7, bright: 1.2, step: 6, dist: 0.8, rev: 12, mix: 1.7, width: 1.7, oct: [1, 0.4, 0], swR: 0.03, swD: 0.06, fx: { machine: 0.6, screech: 0.35, radio: 0.4 }, gain: 0.07 }),
};
export const preset = band => VOICES[band] || SUN;

// Level per wave against the saw, measured through the formants.
const WG = { sawtooth: 1, square: 0.62, triangle: 1, organ: 0.95, pulse: 1.9, fm: 0.68 };
// Organ drawbars by harmonic: 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1'.
const BARS = { 1: 1, 2: 0.7, 3: 0.42, 4: 0.5, 5: 0.12, 6: 0.22, 8: 0.18 };
// Sawtooth waves pass a low pass, then four "ooh" and "ah" band passes.
const FORMANTS = [[400, 4, 1], [750, 6, 0.8], [1150, 7, 0.45], [2700, 9, 0.15]];
// Semitones above the base: root, fifth, ninth and major third.
// Ionian adds the major seventh; pentatonic adds the sixth.
const SHARED = [[-12, 1, -0.4], [-5, 0.8, 0.4], [2, 0.6, -0.2], [4, 0.55, 0.2]];
const ION = [-1, 0.6, 0], PEN = [9, 0.4, 0];
const LINES = [[0, 2, 4, 5, 7, 9, 11, 12].map(R), [0, 2, 4, 7, 9, 12].map(R)];
// A held scale: its chord as frequency ratios, and its top voice line.
// The harmonic series sits on the overtones of a note two octaves down.
const HELD = {
  2: { chord: [[R(-12), 1, -0.4], [R(-5), 0.8, 0.4], [R(2), 0.6, -0.2], [R(3), 0.55, 0.2], [R(-1), 0.6, 0], [R(8), 0.4, 0]], line: [0, 2, 3, 5, 7, 8, 11, 12].map(R) },
  3: { chord: [[0.5, 1, -0.4], [0.75, 0.8, 0.4], [1.25, 0.55, -0.2], [1.5, 0.5, 0.2], [1.75, 0.45, 0], [2.75, 0.2, 0]], line: [1, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 1.875, 2] },
};
// Octave voices and their levels: middle, tenor and bass (Tom).
// The plain choir, then the slowed choir with a wave an octave down.
const LAYERS = [{ lp: 3000, amp: 0.7, parts: [[1, 1]] }, { lp: 1800, amp: 0.4, parts: [[1, 1.41], [0.5, 1]] }];

// Waves, curves and reverbs, made once per audio context.
const kits = new WeakMap();
function kitOf(ac) {
  let k = kits.get(ac);
  if (k) return k;
  const wave = (N, f) => {
    const re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let h = 1; h <= N; h++) im[h] = f(h);
    return ac.createPeriodicWave(re, im);
  };
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.5 * x) / Math.tanh(2.5); }
  // An 18 percent pulse: thin and nasal.
  k = { organ: wave(60, h => BARS[h] || 0), pulse: wave(80, n => 2 / (n * Math.PI) * Math.sin(n * Math.PI * 0.18)), curve, irs: new Map() };
  kits.set(ac, k);
  return k;
}
// A reverb: decaying noise that darkens as it fades.
// The Sun's 7 s reverb has a 1.8 s decay; others scale with length.
function irOf(ac, rev) {
  const k = kitOf(ac);
  if (k.irs.has(rev)) return k.irs.get(rev);
  const sr = ac.sampleRate, n = Math.floor(sr * (rev + 0.5)), b = ac.createBuffer(2, n, sr), tau = 1.8 * rev / 7;
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, x = (Math.random() * 2 - 1) * Math.exp(-t / tau) * Math.min(1, t / 0.04);
      y += (x - y) * (0.5 - 0.38 * Math.min(1, t / rev));
      d[i] = y;
    }
  }
  k.irs.set(rev, b);
  return b;
}

// The space rumble: a constant, dense, deep surround drone.
// It renders once per star into a stereo loop whose end crossfades into its start.
export const LOOP = 24;
const FADE = 3;
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
export async function renderBed(ac, root) {
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

// The choir for one star.
// o.base: the top voice's home note in Hz, two octaves over the hum's root.
// o.out: the node it plays into. o.os: an array that collects every source.
// o.track: registers a source with the caller. o.onEvent: scale and melody steps.
// Returns the voice: v.cv takes a send into its reverb; v.sing(until) queues moves.
export function choir(ac, { t, base, p, out, motion = MOTION, os = [], track = n => n, onEvent = () => {} }) {
  const k = kitOf(ac), d = p.dist;
  const G = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const src = (o, at) => { o.start(at); os.push(o); return track(o); };
  const lfo = (rate, depth, param) => { const o = ac.createOscillator(); o.frequency.value = rate; src(o, t).connect(G(depth)).connect(param); };

  // Output: the distance lifts the level so a far star stays as loud.
  const g = G((1 + 0.35 * d) * p.gain);
  g.connect(out);
  let tail = g;
  // Air absorbs the top on far stars.
  if (d > 0) { const air = filt('lowpass', Math.max(2500, 14000 * (1 - 0.78 * d)), 0.5); air.connect(tail); tail = air; }
  // Width: mid and side, with the side scaled.
  if (p.width !== 1) {
    const sp = ac.createChannelSplitter(2), mg = ac.createChannelMerger(2);
    const mid = G(0.5), side = G(0.5 * p.width), inv = G(-1), sideN = G(-1);
    sp.connect(mid, 0); sp.connect(mid, 1); sp.connect(side, 0); sp.connect(inv, 1); inv.connect(side); side.connect(sideN);
    mid.connect(mg, 0, 0); side.connect(mg, 0, 0); mid.connect(mg, 0, 1); sideN.connect(mg, 0, 1);
    mg.connect(tail);
    tail = sp;
  }
  // Distance moves sound from the dry path to a later reverb.
  const dry = G(0.5 * (1 - 0.8 * d));
  dry.connect(tail);
  const cv = ac.createConvolver();
  cv.buffer = irOf(ac, p.rev);
  cv.connect(G(1.2 * p.mix)).connect(tail);
  let wetIn = cv;
  if (d > 0) { const pre = ac.createDelay(1); pre.delayTime.value = 0.13 * d; pre.connect(cv); wetIn = pre; }

  // The level swell, the metal and the sci-fi filters sit between the choir and the room.
  const sw = ac.createGain();
  const fxIn = G(1);
  sw.connect(G(1 - 0.7 * p.metal)).connect(fxIn);
  if (p.metal > 0) {
    // Ring modulation at an off-key ratio gives the clang.
    const vca = G(0), car = ac.createOscillator();
    car.frequency.value = base * Math.SQRT2;
    src(car, t).connect(G(1.41)).connect(vca.gain);
    sw.connect(vca).connect(filt('lowpass', 6000, 0.5)).connect(G(p.metal)).connect(fxIn);
  }
  const fxOut = sciFi(ac, p, base, t, fxIn, { G, filt, lfo, curve: k.curve });
  fxOut.connect(dry);
  fxOut.connect(wetIn);
  if (motion.swell) lfo(p.swR, p.swD, sw.gain);
  // One shared pitch drift: 3 cents at 0.2 Hz (Tom).
  const drift = G(motion.drift ? 3 : 0);
  { const o = ac.createOscillator(); o.frequency.value = 0.2; src(o, t).connect(drift); }
  // The synth filter sweeps once every 20 s.
  let sweep = null;
  if (p.fmot > 0) { sweep = ac.createOscillator(); sweep.frequency.value = 0.05; src(sweep, t); }
  // Resonance raises the level; this pulls it back.
  const rc = 1 / (1 + 0.09 * (p.res - 0.5));

  const mode0 = motion.scale === 'cross' ? 1 : motion.scale, held = HELD[mode0];
  const v = { cv, g, ion: [], pen: [], leads: [[], []], li: 0, mode: mode0, step: 0, until: t, line: held ? held.line : null };
  const kk = p.step / 8;
  let nextMode = motion.scale === 'cross' ? t + (10 + Math.random() * 2) * kk : Infinity;
  let nextLead = motion.melody ? t + p.step : Infinity;

  // One note: its waves, and a gain that fades it.
  // Three unison voices sum about root 3 louder, so each takes 1 over root 3.
  const unison = p.det > 0 ? [-p.det, 0, p.det] : [0], ug = p.det > 0 ? 1 / Math.sqrt(3) : 1;
  function osc(f, amp, dest) {
    const sets = [];
    for (const dt of unison) {
      const o = ac.createOscillator();
      if (p.wave === 'organ') o.setPeriodicWave(k.organ);
      else if (p.wave === 'pulse') o.setPeriodicWave(k.pulse);
      else o.type = p.wave === 'fm' ? 'sine' : p.wave;
      o.frequency.value = f;
      o.detune.value = dt;
      drift.connect(o.detune);
      // FM: a modulator a fifth up, index 2.2, gives the glassy synth.
      let m = null, mg = null;
      if (p.wave === 'fm') {
        m = ac.createOscillator();
        m.frequency.value = f * 1.5;
        m.detune.value = dt;
        mg = G(f * 1.5 * 2.2);
        src(m, t).connect(mg).connect(o.frequency);
      }
      src(o, t).connect(G(amp * ug)).connect(dest);
      sets.push((nf, at) => {
        o.frequency.setValueAtTime(nf, at);
        if (m) { m.frequency.setValueAtTime(nf * 1.5, at); mg.gain.setValueAtTime(nf * 1.5 * 2.2, at); }
      });
    }
    return (nf, at) => { for (const s of sets) s(nf, at); };
  }
  const oct = [[0, p.oct[0]], [-1, p.oct[1]], [-2, p.oct[2]]];
  for (const [o, lvl] of oct) {
    if (lvl <= 0) continue;
    const sh = 2 ** o;
    for (const L of LAYERS) {
      const cut = clamp(L.lp * p.bright, 500, 11000);
      const mix = ac.createGain(), soft = filt('lowpass', cut, p.res);
      mix.connect(soft);
      if (sweep) sweep.connect(G(cut * 0.6 * p.fmot)).connect(soft.frequency);
      // Level 0.35 of the tuning player, split over two layers, set by ear (Tom).
      const bus = G(0.00735 * lvl * WG[p.wave] * rc);
      if (p.voice > 0) for (const [f, q, a] of FORMANTS) soft.connect(filt('bandpass', Math.min(f * p.vowel, 18000), q)).connect(G(a * 4 * p.voice)).connect(bus);
      // The bare path is 1.4 times quieter than the formants, so it gains 1.4.
      if (p.voice < 1) soft.connect(G(1.4 * (1 - p.voice))).connect(bus);
      bus.connect(sw);
      const note = (f, a, pan, on = true) => {
        const ng = ac.createGain();
        ng.level = a * L.amp;
        ng.gain.value = on ? ng.level : 0;
        const pn = ac.createStereoPanner();
        pn.pan.value = clamp(pan * p.width, -1, 1);
        ng.connect(pn).connect(mix);
        ng.waves = L.parts.map(([m, amp]) => { const set = osc(f * m, amp, ng); return (fl, at) => set(fl * m * sh, at); });
        return ng;
      };
      if (held) for (const [r, a, pan] of held.chord) note(base * r * sh, a, pan);
      else {
        for (const [st, a, pan] of SHARED) note(base * R(st) * sh, a, pan);
        v.ion.push(note(base * R(ION[0]) * sh, ION[1], ION[2], mode0 === 0));
        v.pen.push(note(base * R(PEN[0]) * sh, PEN[1], PEN[2], mode0 === 1));
      }
      // Two top voices take turns, so each step crossfades.
      v.leads[0].push(note(base * sh, 0.45, 0));
      v.leads[1].push(note(base * sh, 0.45, 0, false));
    }
  }
  onEvent({ t, mode: MODES[mode0], lead: base });

  const fade = (gn, at, a, b, len) => { gn.gain.setValueAtTime(a, at); gn.gain.linearRampToValueAtTime(b, at + len); };
  // Queues the scale crossfades and top voice steps up to `until` on the audio clock.
  // Every 10 to 12 s the chord crossfades to the other scale over 4 s.
  // Every step the top voice crossfades over 2 s to the next note.
  // A slower star stretches both.
  v.sing = until => {
    while (Math.min(nextMode, nextLead) < until) {
      if (nextMode <= nextLead) {
        v.mode = 1 - v.mode;
        const ion = v.mode === 0, len = Math.max(1.5, 4 * kk);
        for (const gn of v.ion) fade(gn, nextMode, ion ? 0 : gn.level, ion ? gn.level : 0, len);
        for (const gn of v.pen) fade(gn, nextMode, ion ? gn.level : 0, ion ? 0 : gn.level, len);
        onEvent({ t: nextMode, mode: MODES[v.mode] });
        nextMode += (10 + Math.random() * 2) * kk;
      } else {
        const line = v.line || LINES[v.mode];
        v.step = (v.step + (Math.random() < 0.7 ? 1 : line.length - 1)) % line.length;
        const f = base * line[v.step], at = nextLead, len = Math.max(0.8, 2 * kk);
        for (const gn of v.leads[v.li]) fade(gn, at, gn.level, 0, len);
        v.li ^= 1;
        for (const gn of v.leads[v.li]) { for (const set of gn.waves) set(f, at); fade(gn, at, 0, gn.level, len); }
        onEvent({ t: at, lead: f });
        nextLead += p.step;
      }
    }
    v.until = until;
    return until;
  };
  return v;
}

// The sci-fi filters, each on its own switch, in a fixed order.
function sciFi(ac, p, base, t, inp, { G, filt, lfo, curve }) {
  const F = p.fx;
  let n = inp;
  // A parallel stage: dry and processed, mixed.
  const par = (a, proc, dryAmt = 1 - a) => { const o = G(1); n.connect(G(dryAmt)).connect(o); proc(n).connect(G(a)).connect(o); n = o; };
  if (F.machine.on) {
    // A comb tuned an octave under the base: a pipe or robot ring.
    const a = F.machine.amt;
    par(a * 0.9, x => {
      const dl = ac.createDelay(0.2);
      dl.delayTime.value = 2 / base;
      x.connect(dl);
      dl.connect(filt('lowpass', 5000, 0.5)).connect(G(0.55 + 0.38 * a)).connect(dl);
      return dl;
    }, 1 - a * 0.5);
  }
  if (F.sweep.on) {
    // A four-stage phaser, swept once every 20 s.
    par(F.sweep.amt * 0.8, x => {
      let y = x;
      for (const f0 of [300, 700, 1300, 2300]) { const ap = filt('allpass', f0, 0.7); lfo(0.05, f0 * 0.6, ap.frequency); y.connect(ap); y = ap; }
      return y;
    }, 1);
  }
  if (F.screech.on) {
    // A narrow peak that roams 2.3 to 5.3 kHz.
    const pk = ac.createBiquadFilter();
    pk.type = 'peaking'; pk.frequency.value = 3800; pk.Q.value = 9; pk.gain.value = 4 + F.screech.amt * 16;
    lfo(0.035, 1500, pk.frequency);
    n.connect(pk); n = pk;
  }
  if (F.dark.on) {
    // A steep low pass and a little low shelf.
    const a = F.dark.amt, fc = 400 + 4600 * (1 - a) ** 2;
    const ls = ac.createBiquadFilter();
    ls.type = 'lowshelf'; ls.frequency.value = 220; ls.gain.value = 5 * a;
    const mk = G(1 + 0.6 * a);
    n.connect(filt('lowpass', fc, 0.6)).connect(filt('lowpass', fc, 0.6)).connect(ls).connect(mk);
    n = mk;
  }
  if (F.radio.on) {
    // A narrow band, driven into a soft clip.
    const a = F.radio.amt;
    par(a, x => {
      const ws = ac.createWaveShaper();
      ws.curve = curve;
      const mk = G(2.2 / (1 + a));
      x.connect(filt('highpass', 300 + 300 * a, 1.2)).connect(filt('lowpass', 3400 - 1400 * a, 1.2)).connect(G(1 + 3 * a)).connect(ws).connect(mk);
      return mk;
    });
  }
  if (F.echo.on) {
    // A ping-pong echo, 0.62 and 0.93 s, darker each pass.
    const o = G(1);
    n.connect(o);
    const dl = ac.createDelay(2), dr = ac.createDelay(2);
    dl.delayTime.value = 0.62; dr.delayTime.value = 0.93;
    const lpl = filt('lowpass', 1800, 0.5), lpr = filt('lowpass', 1800, 0.5), mg = ac.createChannelMerger(2);
    n.connect(dl);
    dl.connect(lpl).connect(G(0.5)).connect(dr);
    dr.connect(lpr).connect(G(0.5)).connect(dl);
    lpl.connect(mg, 0, 0); lpr.connect(mg, 0, 1);
    mg.connect(G(F.echo.amt * 0.7)).connect(o);
    n = o;
  }
  return n;
}

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
// Tap source levels against the saw blast and the triangle glow, set by ear.
const BLAST_LVL = { sawtooth: 1, square: 0.6, triangle: 1.4, sine: 1.6 };
const GLOW_LVL = { triangle: 1, sine: 0.85, sawtooth: 0.7, square: 0.6 };
// The brass blast: six voices an octave and a fifth apart, through a soft clip.
// Its filter opens in 0.45 s and closes over `len`.
// The 1.004 voice beats slowly against the root, so the blast sounds like many.
// o.root: the star's key two octaves down. o.K: the tap strength, 0.3 to 1.
// Returns the blast's gain; the caller pans it and sends it on.
export function blast(ac, { t, root, K, len = 6, p = SUN, out, track = n => n }) {
  const k = kitOf(ac);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.2 * K * p.blastLvl * BLAST_LVL[p.blastWave], t + 0.22);
  g.gain.setTargetAtTime(0.0001, t + 1.1, len / 4);
  g.connect(out);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(110, t);
  lp.frequency.exponentialRampToValueAtTime(260 + 700 * K, t + 0.45);
  lp.frequency.exponentialRampToValueAtTime(140, t + len);
  const sh = ac.createGain();
  sh.gain.value = 0.5;
  if (!k.clip) {
    k.clip = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; k.clip[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
  }
  const ws = ac.createWaveShaper();
  ws.curve = k.clip;
  sh.connect(ws).connect(lp).connect(g);
  for (const m of [0.5, 1, 1.004, 1.498, 2, 2.996]) {
    const o = ac.createOscillator();
    o.type = p.blastWave;
    o.frequency.value = root * m * jit(0.002);
    o.start(t); o.stop(t + len + 1);
    track(o).connect(sh);
  }
  return g;
}
// The glow: four soft voices that swell for 8 s and fade by 34 s.
// Each voice sits up to 6 cents off, so the chord shimmers like a chorus.
// o.root: the star's key one octave down.
// Returns the glow's gain; the caller pans it and sends it on.
export function glow(ac, { t, root, K, p = SUN, out, track = n => n }) {
  const lvl = 0.05 * K * p.glowLvl * GLOW_LVL[p.glowWave];
  const pad = ac.createGain();
  pad.gain.setValueAtTime(0, t + 1.5);
  pad.gain.linearRampToValueAtTime(lvl, t + 8);
  pad.gain.setValueAtTime(lvl, t + 16);
  pad.gain.exponentialRampToValueAtTime(0.0002, t + 34);
  pad.connect(out);
  const plp = ac.createBiquadFilter();
  plp.type = 'lowpass'; plp.frequency.value = 900; plp.Q.value = 0.5;
  plp.connect(pad);
  for (const m of CHORDS[p.chord]) {
    const o = ac.createOscillator();
    o.type = p.glowWave;
    o.frequency.value = root * m * jit(0.004);
    o.detune.value = (Math.random() - 0.5) * 12;
    o.start(t + 1.5); o.stop(t + 34.5);
    track(o).connect(plp);
  }
  return pad;
}
