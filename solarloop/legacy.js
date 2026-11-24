// Solar loop choir: the older sounds of each star, as full presets.
// The choir lab loads them to compare and to start new work from them.
// None of these plays in the toy.
import { SUN, FX } from './choir.js';

const fxs = o => Object.fromEntries(FX.map(([k]) => [k, o && o[k] != null ? { on: true, amt: o[k] } : { on: false, amt: 0.5 }]));
// The tap as it was before 24 November: a long glow, no limit on taps.
const OLD_TAP = { glowStyle: 'chord', glowRise: 6.5, glowHold: 8, glowFade: 18, stack: true };
const P = o => ({ ...SUN, ...OLD_TAP, ...o, oct: o.oct || SUN.oct, fx: fxs(o.fx) });

// The synth draft (2026-11-24, inline player): synths for the giants, no loudness match.
const SYNTH = {
  sun: P({}),
  zetaoph: P({ chord: 'overtone', det: 12, res: 5, fmot: 0.45, voice: 0.35, vowel: 1.3, metal: 0.3, bright: 1.4, step: 9, dist: 0.5, rev: 10, mix: 1.3, width: 1.5, oct: [1, 0.6, 0.6], swR: 0.07, swD: 0.12, fx: { sweep: 0.45, screech: 0.2 }, gain: 1 }),
  regulus: P({ wave: 'square', voice: 0.75, vowel: 1.2, metal: 0.1, bright: 1.3, step: 6, dist: 0.1, width: 1.4, swR: 0.18, gain: 1 }),
  vega: P({ wave: 'triangle', voice: 0.55, vowel: 1.25, metal: 0.3, bright: 1.25, step: 7, dist: 0.15, width: 1.3, oct: [1, 0.5, 0.4], swD: 0.15, gain: 1 }),
  sirius: P({ wave: 'organ', voice: 0.6, vowel: 1.2, metal: 0.08, bright: 1.25, step: 7, dist: 0.05, width: 1.2, oct: [1, 0.5, 0.5], swD: 0.15, gain: 1 }),
  procyon: P({ voice: 0.85, vowel: 1.1, bright: 1.1, step: 7.5, oct: [1, 0.5, 0.55], gain: 1 }),
  epseri: P({ voice: 0.9, vowel: 0.9, metal: 0.05, bright: 0.9, rev: 6.5, swR: 0.15, swD: 0.25, oct: [1, 0.5, 0.5], gain: 1 }),
  proxima: P({ wave: 'square', voice: 0.8, vowel: 0.8, bright: 0.75, step: 9, rev: 6, dist: 0.2, oct: [1, 0.5, 0.4], swR: 0.1, swD: 0.25, gain: 1 }),
  luhman: P({ chord: 'minor', wave: 'pulse', det: 6, res: 4, fmot: 0.35, voice: 0.4, vowel: 0.7, metal: 0.2, bright: 0.6, step: 11, dist: 0.65, rev: 11, mix: 1.5, width: 1.6, oct: [0.8, 0.5, 0.5], swR: 0.05, swD: 0.1, fx: { dark: 0.45, sweep: 0.35 }, gain: 1 }),
  wise: P({ glowWave: 'sine', chord: 'minor', wave: 'fm', res: 3, fmot: 0.3, voice: 0.3, vowel: 0.6, metal: 0.25, bright: 0.5, step: 13, dist: 0.85, rev: 13, mix: 1.7, width: 1.8, oct: [0.7, 0.5, 0.6], swR: 0.04, swD: 0.08, fx: { dark: 0.6, echo: 0.5, sweep: 0.3 }, gain: 1 }),
  ttauri: P({ wave: 'pulse', det: 9, res: 3, fmot: 0.4, voice: 0.45, vowel: 0.9, metal: 0.12, bright: 0.85, step: 9, dist: 0.55, rev: 10, mix: 1.4, width: 1.7, swR: 0.2, swD: 0.3, fx: { sweep: 0.3, echo: 0.35 }, gain: 1 }),
  arcturus: P({ glowWave: 'sawtooth', det: 7, res: 3, fmot: 0.25, voice: 0.55, vowel: 0.85, bright: 0.8, step: 10, rev: 10, width: 1.3, oct: [1, 0.6, 0.8], swR: 0.08, gain: 1 }),
  rigel: P({ glowWave: 'sawtooth', wave: 'pulse', det: 8, res: 5, fmot: 0.3, voice: 0.4, vowel: 1.3, metal: 0.18, bright: 1.3, step: 10, dist: 0.3, rev: 10, mix: 1.2, width: 1.6, oct: [1, 0.6, 0.8], swR: 0.08, gain: 1 }),
  betelgeuse: P({ glowWave: 'sawtooth', chord: 'minor', det: 10, res: 4, fmot: 0.4, voice: 0.5, vowel: 0.75, metal: 0.05, bright: 0.7, step: 12, dist: 0.35, rev: 11, mix: 1.2, width: 1.6, oct: [0.9, 0.7, 1], swR: 0.05, swD: 0.3, fx: { dark: 0.25 }, gain: 1 }),
  vycma: P({ glowWave: 'sawtooth', chord: 'minor', det: 14, res: 6, fmot: 0.5, voice: 0.35, vowel: 0.65, metal: 0.15, bright: 0.6, step: 14, dist: 0.7, rev: 12, mix: 1.5, width: 1.8, oct: [0.8, 0.7, 1], swR: 0.04, swD: 0.25, fx: { dark: 0.4, echo: 0.4 }, gain: 1 }),
  siriusb: P({ glowWave: 'sine', chord: 'overtone', wave: 'fm', res: 5, fmot: 0.3, voice: 0.2, vowel: 1.3, metal: 0.55, bright: 1.3, step: 9, dist: 0.6, rev: 10, mix: 1.5, width: 1.5, oct: [1, 0.4, 0.15], swR: 0.1, swD: 0.1, fx: { machine: 0.4, echo: 0.4 }, gain: 1 }),
  neutron: P({ blastWave: 'square', glowWave: 'sine', chord: 'overtone', wave: 'fm', res: 8, fmot: 0.6, voice: 0.1, vowel: 1.4, metal: 0.7, bright: 1.2, step: 6, dist: 0.8, rev: 12, mix: 1.7, width: 1.7, oct: [1, 0.4, 0], swR: 0.03, swD: 0.06, fx: { machine: 0.6, screech: 0.35, radio: 0.4 }, gain: 1 }),
};

// The first draft (2026-11-24, inline player): choirs, organs, reeds and flutes; no synths.
const DRAFT = {
  sun: P({}),
  zetaoph: P({ voice: 0.5, vowel: 1.3, metal: 0.3, bright: 1.4, step: 9, dist: 0.5, rev: 10, mix: 1.3, width: 1.5, oct: [1, 0.6, 0.6], swR: 0.07, swD: 0.12, fx: { sweep: 0.45, screech: 0.2 } }),
  regulus: P({ wave: 'square', voice: 0.75, vowel: 1.2, metal: 0.1, bright: 1.3, step: 6, dist: 0.1, width: 1.4, swR: 0.18 }),
  vega: P({ wave: 'triangle', voice: 0.55, vowel: 1.25, metal: 0.3, bright: 1.25, step: 7, dist: 0.15, width: 1.3, oct: [1, 0.5, 0.4], swD: 0.15 }),
  sirius: P({ wave: 'organ', voice: 0.6, vowel: 1.2, metal: 0.08, bright: 1.25, step: 7, dist: 0.05, width: 1.2, oct: [1, 0.5, 0.5], swD: 0.15 }),
  procyon: P({ voice: 0.85, vowel: 1.1, bright: 1.1, step: 7.5, oct: [1, 0.5, 0.55] }),
  epseri: P({ voice: 0.9, vowel: 0.9, metal: 0.05, bright: 0.9, rev: 6.5, swR: 0.15, swD: 0.25, oct: [1, 0.5, 0.5] }),
  proxima: P({ wave: 'square', voice: 0.8, vowel: 0.8, bright: 0.75, step: 9, rev: 6, dist: 0.2, oct: [1, 0.5, 0.4], swR: 0.1, swD: 0.25 }),
  luhman: P({ wave: 'triangle', voice: 0.6, vowel: 0.7, metal: 0.2, bright: 0.6, step: 11, dist: 0.65, rev: 11, mix: 1.5, width: 1.6, oct: [0.8, 0.5, 0.5], swR: 0.05, swD: 0.1, fx: { dark: 0.45, sweep: 0.35 } }),
  wise: P({ wave: 'triangle', voice: 0.45, vowel: 0.6, metal: 0.25, bright: 0.5, step: 13, dist: 0.85, rev: 13, mix: 1.7, width: 1.8, oct: [0.7, 0.5, 0.6], swR: 0.04, swD: 0.08, fx: { dark: 0.6, echo: 0.5, sweep: 0.3 } }),
  ttauri: P({ voice: 0.7, vowel: 0.9, metal: 0.12, bright: 0.85, step: 9, dist: 0.55, rev: 10, mix: 1.4, width: 1.7, swR: 0.2, swD: 0.3, fx: { sweep: 0.3, echo: 0.35 } }),
  arcturus: P({ wave: 'organ', voice: 0.7, vowel: 0.85, bright: 0.8, step: 10, rev: 10, width: 1.3, oct: [1, 0.6, 0.8], swR: 0.08 }),
  rigel: P({ voice: 0.6, vowel: 1.3, metal: 0.18, bright: 1.3, step: 10, dist: 0.3, rev: 10, mix: 1.2, width: 1.6, oct: [1, 0.6, 0.8], swR: 0.08 }),
  betelgeuse: P({ wave: 'organ', voice: 0.8, vowel: 0.75, metal: 0.05, bright: 0.7, step: 12, dist: 0.35, rev: 11, mix: 1.2, width: 1.6, oct: [0.9, 0.7, 1], swR: 0.05, swD: 0.3 }),
  vycma: P({ wave: 'organ', voice: 0.7, vowel: 0.65, metal: 0.15, bright: 0.6, step: 14, dist: 0.7, rev: 12, mix: 1.5, width: 1.8, oct: [0.8, 0.7, 1], swR: 0.04, swD: 0.25, fx: { dark: 0.4, echo: 0.4 } }),
  siriusb: P({ wave: 'triangle', voice: 0.3, vowel: 1.3, metal: 0.55, bright: 1.3, step: 9, dist: 0.6, rev: 10, mix: 1.5, width: 1.5, oct: [1, 0.4, 0.15], swR: 0.1, swD: 0.1, fx: { machine: 0.4, echo: 0.4 } }),
  neutron: P({ wave: 'square', voice: 0.15, vowel: 1.4, metal: 0.7, bright: 1.2, step: 6, dist: 0.8, rev: 12, mix: 1.7, width: 1.7, oct: [1, 0.4, 0], swR: 0.03, swD: 0.06, fx: { machine: 0.6, screech: 0.35, radio: 0.4 } }),
};

// The organ choir: what every star but the Sun sang before 24 November.
// Bodies added later have no older versions.
// The old organ wave, three voices 7 cents apart, one octave of notes.
// Bass, root, fifth, octave and tenth; the top voice slides along a pentatonic line.
// It sang through the toy's echo hall, with no swell. Its low pass sat at 9 kHz.
// gain matches its old level, measured offline against the old code.
export const ORGAN_GAIN = 9.25;
const ORGAN = P({
  wave: 'organAh', voice: 0, det: 7, oct: [1, 0, 0], slowed: false, bright: 3, res: 0.5,
  voicing: 'organ', melody: 'glide', leadOct: -1, step: 9, swD: 0, echo: 'hall', mix: 1,
  harmony: 1, prog: [{ deg: 0, kind: 'triad', len: 16 }], gain: ORGAN_GAIN,
});

export const VERSIONS = {
  synth: { name: 'Synth draft', desc: 'The current synths, with no loudness match. Taps use the old sound.', of: id => SYNTH[id] },
  draft: { name: 'First draft', desc: 'Choirs, organs, reeds and flutes. No synths. No loudness match. Taps use the old sound.', of: id => DRAFT[id] },
  organ: { name: 'Organ choir', desc: 'The sound of all stars but the Sun before 24 November. Taps use the old sound.', of: id => id === 'sun' ? SYNTH.sun : SYNTH[id] ? ORGAN : undefined },
};
