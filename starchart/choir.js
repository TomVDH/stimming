// Solar loop choir: one voice for every star, shaped by a preset.
// The Sun's preset is the voice Tom set by ear (2026-11-24).
// The choir lab (lab.html) tunes presets live; the toy plays them.
// A preset can carry a song: a chord progression in the star's own harmony.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const R = st => 2 ** (st / 12);

// Sci-fi filters, in chain order.
export const FX = [['machine', 'Machine'], ['sweep', 'Sweep'], ['screech', 'Screech'], ['dark', 'Dark'], ['radio', 'Transmission'], ['echo', 'Deep echo']];
export const WAVES = { sawtooth: 'Saw (choir)', analog: 'Analog pad (raw saw)', organ: 'Organ', organAh: 'Organ choir (before 24 November)', square: 'Square (reed)', triangle: 'Triangle (flute)', pulse: 'Pulse (analog synth)', fm: 'FM (glass synth)' };
export const MODES = ['Ionian', 'pentatonic', 'harmonic minor', 'harmonic series'];
export const HARMONIES = [['cross', 'Ionian and pentatonic, alternating'], ['1', 'Pentatonic: 5 notes, open'], ['0', 'Ionian: major scale, bright'], ['2', 'Harmonic minor: raised 7th, dark'], ['3', 'Harmonic series: overtones, not tempered']];
export const TAP_WAVES = { sawtooth: 'Saw (brass)', square: 'Square (hollow)', triangle: 'Triangle (soft)', sine: 'Sine (pure)' };
// The glow chord as ratios: major, minor, or overtones with the 7th.
// 'current' plays the chord the choir sings at the tap.
export const CHORDS = { major: [1, 1.4983, 2, 2.9966], minor: [1, 1.1892, 1.4983, 2], overtone: [1, 1.5, 1.75, 2.25] };
export const VOICINGS = { sun: 'Sun: root, fifth below, ninth, third', organ: 'Organ: bass, root, fifth, octave, tenth', open: 'Open: wide, two octaves', close: 'Close: inside one octave' };
export const MELODIES = { step: 'Step: one note fades into the next', glide: 'Glide: the voice slides to the next note', arp: 'Arpeggio: walks up and down the chord', off: 'Off: no melody' };
export const ECHOES = { reverb: 'Reverb: the star\'s own room', hall: 'Hall: three long echoes', both: 'Reverb and hall' };
export const MOVES = { fade: 'Fade: changed notes dip and return', glide: 'Glide: changed notes slide' };
export const KINDS = { triad: 'Triad', major: 'Major', minor: 'Minor', sus2: 'Sus 2', sus4: 'Sus 4', add9: 'Add 9', seventh: '7th', power: 'Power: root and fifth', cluster: 'Cluster' };
// The lab may switch drift and swell off for all stars.
export const MOTION = { drift: true, swell: true };

// A progression: chords on scale degrees (0 is home), each held `len` s.
// `shift` moves a chord's root by semitones, for chords outside the scale.
export const PROGRESSIONS = {
  sun: { name: 'Sun blend', desc: 'One chord. The scale changes between Ionian and pentatonic.', harmony: 'cross', chords: null },
  hold: { name: 'Hold', desc: 'One chord. It does not change.', chords: [{ deg: 0, kind: 'triad', len: 16 }] },
  rise: { name: 'Slow rise', desc: 'Home, then the fourth. Calm and open.', harmony: 0, chords: [{ deg: 0, kind: 'add9', len: 12 }, { deg: 3, kind: 'add9', len: 12 }] },
  sus: { name: 'Suspended drift', desc: 'Chords with no third. They float and do not resolve.', harmony: 0, chords: [{ deg: 0, kind: 'sus2', len: 10 }, { deg: 3, kind: 'sus2', len: 10 }, { deg: 4, kind: 'sus4', len: 10 }, { deg: 0, kind: 'sus2', len: 10 }] },
  lydian: { name: 'Lydian float', desc: 'Home, then a major chord one step up. Bright, it lifts.', harmony: 0, chords: [{ deg: 0, kind: 'major', len: 10 }, { deg: 1, kind: 'major', len: 10 }] },
  ice: { name: 'Ice', desc: 'A minor chord with a ninth, then the sixth. Cold and still.', harmony: 2, chords: [{ deg: 0, kind: 'add9', len: 12 }, { deg: 5, kind: 'add9', len: 12 }] },
  ominous: { name: 'Ominous minor', desc: 'Minor, sixth, fourth, then a tense fifth. It does not settle.', harmony: 2, chords: [{ deg: 0, kind: 'triad', len: 10 }, { deg: 5, kind: 'triad', len: 10 }, { deg: 3, kind: 'triad', len: 10 }, { deg: 4, kind: 'triad', len: 10 }] },
  descent: { name: 'Dark descent', desc: 'Four chords that step down to the fifth. Heavy.', harmony: 2, chords: [{ deg: 0, kind: 'minor', len: 9 }, { deg: 6, kind: 'major', len: 9, shift: -1 }, { deg: 5, kind: 'major', len: 9 }, { deg: 4, kind: 'major', len: 9 }] },
  phrygian: { name: 'Phrygian shadow', desc: 'Minor home, then a major chord a half step up. Dark and foreign.', harmony: 2, chords: [{ deg: 0, kind: 'minor', len: 12 }, { deg: 1, kind: 'major', len: 12, shift: -1 }] },
  overtones: { name: 'Overtones', desc: 'Chords from the natural overtones of one note, with the flat 7th.', harmony: 3, chords: [{ deg: 0, kind: 'seventh', len: 14 }, { deg: 4, kind: 'triad', len: 14 }] },
};

const fx0 = () => Object.fromEntries(FX.map(([k]) => [k, { on: false, amt: 0.5 }]));
const fxOn = o => { const f = fx0(); for (const k in o) f[k] = { on: true, amt: o[k] }; return f; };
// wave: the source. voice: 1 is a full choir, 0 the bare instrument.
// vowel scales the formants: below 1 is "oo", above 1 is "ee".
// metal: ring modulation mix. det: unison detune in cents.
// res: synth filter Q. fmot: synth filter sweep depth.
// dist: distance, 0 near, 1 far. gain: Tom's loudness trim for the star, 1 is 0 dB.
// norm: the measured factor that makes the star as loud as the Sun (NORM below).
// tapNorm: the same for the star's tap, against the Sun's tap (TAPNORM below).
// glowNorm: the glow's trim against the star's own choir (GLOWNORM below).
// key: semitones up or down from the star's home key.
// harmony, prog, voicing, melody, move, echo: the song. leadOct: the melody's octave.
// slowed: the second, slower choir layer. aDrift, chorus, swellA, swellAmt: the analog pad.
// The tap: blastWave and glowWave are the sources; chord is the glow's notes.
// glowStyle, arpGap, glowRise, glowHold, glowFade: the glow's shape. stack: old, unlimited taps.
// blastMix, glowMix: a level per tap voice, set on the lab's tap bench.
// swTurn: the swell keeps pace with the toy's Turn speed; swR is its speed at x10k.
// wob, wobBend, wobOpen, wobTail: a pulsar's choir wobbles with each beam flash (Tom, 2026-11-24).
// Tom: no ping, no notes; a subdued highlight inside the pad that swells and releases in about 0.3 s.
export const SUN = {
  wave: 'sawtooth', voice: 1, vowel: 1, metal: 0, bright: 1, det: 0, res: 0.5, fmot: 0, step: 8, swD: 0.2, swR: 0.12,
  dist: 0, rev: 7, mix: 1, width: 1, oct: [1, 0.5, 0.6], gain: 1, norm: 1, key: 0,
  harmony: 'cross', prog: null, voicing: 'sun', melody: 'step', move: 'fade', echo: 'reverb', slowed: true,
  aDrift: 0, chorus: 0, swellA: 3, swellAmt: 0,
  blastWave: 'sawtooth', glowWave: 'triangle', chord: 'major', blastLvl: 1, glowLvl: 1,
  glowStyle: 'chord', arpGap: 0.5, glowRise: 6, glowHold: 2, glowFade: 23, stack: false, leadOct: 0,
  blastMix: [1, 1, 1, 1, 1, 1], glowMix: [1, 1, 1, 1, 1], swTurn: false,
  wob: 0, wobBend: 8, wobOpen: 0.8, wobTail: 0.8, tapNorm: 1, glowNorm: 1,
  fx: fx0(),
};
const P = o => ({ ...SUN, ...o, oct: o.oct || SUN.oct, fx: o.fx ? fxOn(o.fx) : fx0() });
// A song from the library, with its harmony.
const song = id => ({ prog: PROGRESSIONS[id].chords, harmony: PROGRESSIONS[id].harmony ?? 0 });
// The analog pad: raw detuned saws, a filter swell on each chord, chorus and drift.
const ANALOG = { wave: 'analog', voice: 0, det: 12, res: 3, aDrift: 6, chorus: 0.5, swellA: 3, swellAmt: 0.7 };
// Glows on songs play the current chord as an arpeggio.
const ARP = { glowStyle: 'arp', chord: 'current' };
// First presets (2026-11-24): giants and odd stars are synths, far and cold.
// Each star's level: NORM matches it to the Sun; gain is Tom's trim on top.
export const VOICES = {
  sun: SUN,
  zetaoph: P({ ...song('lydian'), ...ARP, det: 12, res: 5, fmot: 0.45, voice: 0.35, vowel: 1.3, metal: 0.3, bright: 1.4, step: 9, dist: 0.5, rev: 10, mix: 1.3, width: 1.5, oct: [1, 0.6, 0.6], swR: 0.07, swD: 0.12, fx: { sweep: 0.45, screech: 0.2 }, gain: 1 }),
  regulus: P({ ...song('sus'), ...ARP, wave: 'square', voice: 0.75, vowel: 1.2, metal: 0.1, bright: 1.3, step: 6, dist: 0.1, width: 1.4, swR: 0.18, gain: 1 }),
  vega: P({ ...song('lydian'), ...ARP, wave: 'triangle', voice: 0.55, vowel: 1.25, metal: 0.3, bright: 1.25, step: 7, dist: 0.15, width: 1.3, oct: [1, 0.5, 0.4], swD: 0.15, gain: 1 }),
  sirius: P({ ...song('sus'), ...ARP, wave: 'organ', voice: 0.6, vowel: 1.2, metal: 0.08, bright: 1.25, step: 7, dist: 0.05, width: 1.2, oct: [1, 0.5, 0.5], swD: 0.15, gain: 1 }),
  procyon: P({ ...song('sus'), ...ARP, voice: 0.85, vowel: 1.1, bright: 1.1, step: 7.5, oct: [1, 0.5, 0.55], gain: 1 }),
  epseri: P({ ...song('rise'), ...ARP, voice: 0.9, vowel: 0.9, metal: 0.05, bright: 0.9, rev: 6.5, swR: 0.15, swD: 0.25, oct: [1, 0.5, 0.5], gain: 1 }),
  proxima: P({ ...song('rise'), ...ARP, wave: 'square', voice: 0.8, vowel: 0.8, bright: 0.75, step: 9, rev: 6, dist: 0.2, oct: [1, 0.5, 0.4], swR: 0.1, swD: 0.25, gain: 1 }),
  luhman: P({ ...song('ice'), ...ARP, wave: 'pulse', det: 6, res: 4, fmot: 0.35, voice: 0.4, vowel: 0.7, metal: 0.2, bright: 0.6, step: 11, dist: 0.65, rev: 11, mix: 1.5, width: 1.6, oct: [0.8, 0.5, 0.5], swR: 0.05, swD: 0.1, fx: { dark: 0.45, sweep: 0.35 }, gain: 1 }),
  wise: P({ ...song('ice'), ...ARP, glowWave: 'sine', wave: 'fm', res: 3, fmot: 0.3, voice: 0.3, vowel: 0.6, metal: 0.25, bright: 0.5, step: 13, dist: 0.85, rev: 13, mix: 1.7, width: 1.8, oct: [0.7, 0.5, 0.6], swR: 0.04, swD: 0.08, fx: { dark: 0.6, echo: 0.5, sweep: 0.3 }, gain: 1 }),
  ttauri: P({ ...song('sus'), ...ARP, wave: 'pulse', det: 9, res: 3, fmot: 0.4, voice: 0.45, vowel: 0.9, metal: 0.12, bright: 0.85, step: 9, dist: 0.55, rev: 10, mix: 1.4, width: 1.7, swR: 0.2, swD: 0.3, fx: { sweep: 0.3, echo: 0.35 }, gain: 1 }),
  arcturus: P({ ...song('ominous'), ...ARP, ...ANALOG, glowWave: 'sawtooth', det: 7, fmot: 0.25, vowel: 0.85, bright: 0.8, step: 10, rev: 10, width: 1.3, oct: [1, 0.6, 0.8], swR: 0.08, gain: 1 }),
  rigel: P({ ...song('descent'), ...ARP, ...ANALOG, glowWave: 'sawtooth', det: 8, res: 5, fmot: 0.3, vowel: 1.3, metal: 0.18, bright: 1.3, step: 10, dist: 0.3, rev: 10, mix: 1.2, width: 1.6, oct: [1, 0.6, 0.8], swR: 0.08, gain: 1 }),
  // Betelgeuse: Tom's standard choir, set by ear in the lab (2026-11-24).
  betelgeuse: P({ harmony: 3, glowWave: 'sawtooth', chord: 'minor', det: 10, res: 5.5, fmot: 0.35, voice: 0.5, vowel: 0.75, metal: 0.2, bright: 0.7, step: 12, dist: 0.35, rev: 11, mix: 1.2, width: 1.6, oct: [0.9, 0.7, 1], swR: 0.05, swD: 0.3, fx: { dark: 0.25 }, gain: 1 }),
  vycma: P({ ...song('descent'), ...ARP, ...ANALOG, glowWave: 'sawtooth', det: 14, res: 6, fmot: 0.5, vowel: 0.65, metal: 0.15, bright: 0.6, step: 14, dist: 0.7, rev: 12, mix: 1.5, width: 1.8, oct: [0.8, 0.7, 1], swR: 0.04, swD: 0.25, fx: { dark: 0.4, echo: 0.4 }, gain: 1 }),
  siriusb: P({ ...song('overtones'), ...ARP, glowWave: 'sine', wave: 'fm', res: 5, fmot: 0.3, voice: 0.2, vowel: 1.3, metal: 0.55, bright: 1.3, step: 9, dist: 0.6, rev: 10, mix: 1.5, width: 1.5, oct: [1, 0.4, 0.15], swR: 0.1, swD: 0.1, fx: { machine: 0.4, echo: 0.4 }, gain: 1 }),
  // WR 124: a Wolf-Rayet star, very hot, in a fast wind and a big pink shell of shed gas (M1-67).
  // A bright, airy, very wide choir: a slow phaser for the wind, long echoes for the shell.
  wr124: P({ ...song('lydian'), ...ARP, voice: 0.7, vowel: 1.35, metal: 0.1, bright: 1.45, step: 9, dist: 0.45, rev: 12, mix: 1.5, width: 2, oct: [1, 0.6, 0.5], swR: 0.09, swD: 0.22, fx: { sweep: 0.5, echo: 0.3 }, gain: 1 }),
  // S5-HVS1: an A star that Sagittarius A* threw out of the galaxy at 1,755 km/s, with a long pale wake.
  // A bright, glassy voice that lifts away; changed notes glide, the melody is quick, a long echo trails.
  s5hvs1: P({ ...song('rise'), ...ARP, wave: 'triangle', move: 'glide', voice: 0.5, vowel: 1.3, metal: 0.2, bright: 1.4, step: 5, dist: 0.6, rev: 12, mix: 1.5, width: 1.9, oct: [1, 0.5, 0.4], swR: 0.1, swD: 0.12, glowWave: 'sine', fx: { sweep: 0.25, echo: 0.55 }, gain: 1 }),
  // Beta Lyrae: a blue-white giant pours gas onto a partner hidden in a disc; they eclipse each 112 s.
  // Two chords trade places for the pair; notes and melody glide like the stream; the choir dims once per orbit.
  betalyr: P({ ...song('lydian'), ...ARP, swTurn: true, move: 'glide', melody: 'glide', voice: 0.75, vowel: 1.2, metal: 0.2, bright: 1.3, step: 10, dist: 0.35, rev: 11, mix: 1.3, width: 1.7, oct: [1, 0.6, 0.6], swR: 1 / 112, swD: 0.35, fx: { sweep: 0.3, echo: 0.3 }, gain: 1 }),
  // Fomalhaut: a white star in a narrow ring of icy dust; the ringed model's voice, moved whole (Tom).
  // A warm choir, dimmed; a phaser and a quicker swell for the belt's clumps; a little icy metal.
  fomalhaut: P({ ...song('rise'), ...ARP, voice: 0.8, vowel: 0.85, metal: 0.15, bright: 0.75, step: 9, dist: 0.4, rev: 11, mix: 1.4, width: 1.8, oct: [1, 0.6, 0.6], swR: 0.15, swD: 0.3, fx: { sweep: 0.5, echo: 0.35 }, gain: 1 }),
  // The Thorne–Żytkow object: a red supergiant with a neutron star in its core (1977 prediction).
  // It starts from the quasar's sound (Tom's reference): darker and heavier for the giant,
  // a metal ring for the core, and a slow swell for its faint pulse.
  tzo: P({ ...song('ominous'), ...ARP, ...ANALOG, wave: 'pulse', det: 12, res: 5, fmot: 0.45, aDrift: 8, metal: 0.3, bright: 0.75, step: 13, dist: 0.6, rev: 13, mix: 1.7, width: 1.8, oct: [0.8, 0.7, 1], swR: 0.08, swD: 0.3, glowWave: 'sawtooth', fx: { radio: 0.25, machine: 0.3, dark: 0.3, echo: 0.35 }, gain: 1 }),
  // The holes and the quasar: far, cold and slow (2026-11-24). Taps never fire on them.
  // Cygnus X-1: a black hole fed by a blue supergiant; X-ray hot. Glassy FM overtones.
  cygx1: P({ ...song('overtones'), ...ARP, wave: 'fm', voice: 0.1, det: 8, res: 6, fmot: 0.4, metal: 0.35, bright: 1.1, step: 10, dist: 0.75, rev: 13, mix: 1.7, width: 1.8, oct: [0.9, 0.7, 0.8], swR: 0.05, swD: 0.12, glowWave: 'sine', fx: { sweep: 0.35, dark: 0.3, echo: 0.35 }, gain: 1 }),
  // Sagittarius A*: the hole at the centre of our galaxy. The deepest, slowest pad.
  sgra: P({ ...song('phrygian'), ...ARP, ...ANALOG, det: 14, res: 5, fmot: 0.5, bright: 0.5, step: 16, dist: 0.85, rev: 14, mix: 1.8, width: 1.9, oct: [0.6, 0.8, 1.1], swR: 0.03, swD: 0.2, glowWave: 'sawtooth', fx: { dark: 0.5, echo: 0.45 }, gain: 1 }),
  // 3C 273: the first quasar, radio-loud and billions of light years away. A far transmission.
  qso: P({ ...song('sus'), ...ARP, ...ANALOG, wave: 'pulse', det: 10, res: 4, fmot: 0.45, bright: 1.3, step: 11, dist: 0.95, rev: 14, mix: 1.9, width: 1.9, oct: [1, 0.7, 0.8], swR: 0.04, swD: 0.15, glowWave: 'sine', fx: { radio: 0.35, sweep: 0.3, echo: 0.4 }, gain: 1 }),
  // The Vela pulsar, nearer the quasar (Tom, 2026-11-24: less uncomfortable): the quasar's detuned pulse pad,
  // a trace of metal and machine for the neutron star, no screech, more body in the middle and low singers.
  // Tom set it in the lab (2026-11-24): up 11 semitones to G♯5, voice drift 19 cents, filter swell 0.75.
  neutron: P({ ...song('overtones'), ...ARP, ...ANALOG, key: 11, aDrift: 19, swellAmt: 0.75, wob: 1, blastWave: 'square', glowWave: 'sine', wave: 'pulse', det: 10, res: 4, fmot: 0.45, metal: 0.25, bright: 1.2, step: 7, dist: 0.85, rev: 13, mix: 1.8, width: 1.8, oct: [1, 0.6, 0.5], swR: 0.04, swD: 0.1, fx: { radio: 0.3, sweep: 0.3, echo: 0.4, machine: 0.2 }, gain: 1 }),
};
// Normalization: each star's level against the Sun, measured offline.
// K-weighted as in ITU-R BS.1770, at 44.1 kHz, swell off, a fixed seed, 6 to 22 s of a 22 s render (2026-11-24).
// The lab's Normalize every star measures them again and writes this table out.
export const NORM = {
  sun: 1,
  zetaoph: 0.76,
  regulus: 0.75,
  vega: 0.81,
  sirius: 0.51,
  procyon: 0.94,
  epseri: 1.05,
  proxima: 0.49,
  luhman: 0.21,
  wise: 0.18,
  ttauri: 0.28,
  fomalhaut: 0.41,
  arcturus: 0.82,
  betalyr: 0.45,
  rigel: 0.68,
  betelgeuse: 0.55,
  vycma: 0.27,
  wr124: 0.31,
  siriusb: 0.5,
  neutron: 0.05,
  tzo: 0.12,
  cygx1: 0.26,
  sgra: 0.16,
  qso: 0.08,
  s5hvs1: 0.2,
};
// Tap normalization: each star's blast and glow against the Sun's, measured the same way.
// K-weighted, blast and glow on the star's key and first chord, 0.1 to 14 s (2026-11-24).
export const TAPNORM = {
  sun: 1,
  zetaoph: 1.08,
  regulus: 1.05,
  vega: 1.1,
  s5hvs1: 0.98,
  sirius: 1.04,
  procyon: 1.08,
  epseri: 1.0,
  proxima: 0.98,
  luhman: 0.99,
  wise: 0.99,
  ttauri: 1.08,
  fomalhaut: 1.0,
  arcturus: 1.24,
  betalyr: 1.06,
  rigel: 1.24,
  betelgeuse: 1.24,
  vycma: 1.34,
  wr124: 1.07,
  siriusb: 0.99,
  neutron: 1.11,
  tzo: 1.34,
  cygx1: 0.99,
  sgra: 1.41,
  qso: 1.2,
};
// Glow trim: the glow lifts each star's mix by 1.5 dB at most.
// K-weighted, glow alone in the star's choir and room, 2 s windows (2026-11-24).
// A star under 1.5 dB keeps 1: the trim never makes a glow louder.
export const GLOWNORM = {
  zetaoph: 0.84,
  regulus: 0.78,
  vega: 0.95,
  epseri: 0.9,
  proxima: 0.92,
  wr124: 0.95,
  betalyr: 0.82,
  fomalhaut: 0.68,
  cygx1: 0.67,
};
// Stephenson 2-18 sings VY CMa's choir; its root in sound.js sits lower.
VOICES.st218 = VOICES.vycma;
NORM.st218 = NORM.vycma;
TAPNORM.st218 = TAPNORM.vycma;
// WOH G64 sings Betelgeuse's choir.
VOICES.wohg64 = VOICES.betelgeuse;
NORM.wohg64 = NORM.betelgeuse;
TAPNORM.wohg64 = TAPNORM.betelgeuse;
// The quasi-star sings the Thorne-Zytkow object's choir, lower.
VOICES.quasi = VOICES.tzo;
NORM.quasi = NORM.tzo;
TAPNORM.quasi = TAPNORM.tzo;
// WR 140 sings WR 124's choir.
VOICES.wr140 = VOICES.wr124;
NORM.wr140 = NORM.wr124;
TAPNORM.wr140 = TAPNORM.wr124;
// VFTS 352 sings Zeta Ophiuchi's choir.
VOICES.vfts352 = VOICES.zetaoph;
NORM.vfts352 = NORM.zetaoph;
TAPNORM.vfts352 = TAPNORM.zetaoph;
// XX Trianguli sings Arcturus's choir.
VOICES.xxtri = VOICES.arcturus;
NORM.xxtri = NORM.arcturus;
TAPNORM.xxtri = TAPNORM.arcturus;
// Epsilon Aurigae sings Procyon's choir.
VOICES.epsaur = VOICES.procyon;
NORM.epsaur = NORM.procyon;
TAPNORM.epsaur = TAPNORM.procyon;
// Mothra sings Beta Lyrae's choir; Earendel sings Rigel's.
VOICES.mothra = VOICES.betalyr;
NORM.mothra = NORM.betalyr;
TAPNORM.mothra = TAPNORM.betalyr;
VOICES.earendel = VOICES.rigel;
NORM.earendel = NORM.rigel;
TAPNORM.earendel = TAPNORM.rigel;
// Polaris sings Procyon's choir.
VOICES.polaris = VOICES.procyon;
NORM.polaris = NORM.procyon;
TAPNORM.polaris = TAPNORM.procyon;
// R Leporis sings VY CMa's choir.
VOICES.rlep = VOICES.vycma;
NORM.rlep = NORM.vycma;
TAPNORM.rlep = TAPNORM.vycma;
// The Ring Nebula sings Sirius B's choir.
VOICES.ring = VOICES.siriusb;
NORM.ring = NORM.siriusb;
TAPNORM.ring = TAPNORM.siriusb;
// The Crab sings the pulsar's choir.
VOICES.crab = VOICES.neutron;
NORM.crab = NORM.neutron;
TAPNORM.crab = TAPNORM.neutron;
// SGR 1806-20 sings the pulsar's choir.
VOICES.magnetar = VOICES.neutron;
NORM.magnetar = NORM.neutron;
TAPNORM.magnetar = TAPNORM.neutron;
// Mira sings Betelgeuse's choir.
VOICES.mira = VOICES.betelgeuse;
NORM.mira = NORM.betelgeuse;
TAPNORM.mira = TAPNORM.betelgeuse;
// Powehi sings Sagittarius A*'s choir, lower.
VOICES.powehi = VOICES.sgra;
VOICES.gargantua = VOICES.sgra;
// A preset from a relative's: its sound, with changes; fx lists only the effects to turn on.
const from = (id, o = {}) => ({ ...VOICES[id], ...o, oct: o.oct || VOICES[id].oct, fx: o.fx ? fxOn(o.fx) : VOICES[id].fx });
// The bodies of 2026-11-24 evening (Tom: "the choir tool to have the latest bodies").
Object.assign(VOICES, {
  // Stephenson 2-18: the largest known star, thick dust. VY CMa's pad, deeper, farther and wider.
  st218: from('vycma', { step: 16, dist: 0.8, rev: 13, mix: 1.6, width: 1.95, bright: 0.5, swR: 0.05 }),
  // WOH G64: a red supergiant in an egg of glow and a dust torus. VY CMa's pad, an ominous song.
  wohg64: from('vycma', { ...song('ominous'), bright: 0.6, metal: 0.1, swR: 0.06, swD: 0.3 }),
  // The quasi-star: a black hole feeds inside a giant envelope. The Thorne-Zytkow voice, darker.
  quasi: from('tzo', { ...song('phrygian'), bright: 0.6, metal: 0.35, step: 15, rev: 14, mix: 1.8 }),
  // WR 140: a Wolf-Rayet pair puffing nested dust shells. WR 124's wide choir; a deeper, slower swell.
  wr140: from('wr124', { swR: 0.05, swD: 0.32, rev: 13, mix: 1.6 }),
  // VFTS 352: two hot O stars whose envelopes touch. Beta Lyrae's gliding choir, brighter, no orbit swell.
  vfts352: from('betalyr', { ...song('sus'), swTurn: false, bright: 1.45, metal: 0.15, swR: 0.14 }),
  // XX Trianguli: an orange giant blotched with giant spots. Arcturus's pad on a warmer song.
  xxtri: from('arcturus', { ...song('rise'), bright: 0.85, swD: 0.3 }),
  // Epsilon Aurigae: an F supergiant a dark disc crosses for two years. Rigel's pad, a held, dimming song.
  epsaur: from('rigel', { ...song('sus'), bright: 1, swR: 0.04, swD: 0.38 }),
  // Mothra: a lensed pair of stars, very far away. S5-HVS1's glassy voice, faint and distant.
  mothra: from('s5hvs1', { dist: 0.95, rev: 14, mix: 1.8, width: 1.9, bright: 1.1 }),
  // Earendel: the farthest single star seen, on a lensed arc. An airy, far choir.
  earendel: from('wr124', { voice: 0.4, dist: 1, rev: 15, mix: 1.9, bright: 1.35 }),
  // Powehi (M87*): the first black hole imaged. Sagittarius A*'s deep pad, slower and darker.
  powehi: from('sgra', { step: 18, rev: 15, bright: 0.45, det: 16 }),
  // Gargantua: a film's black hole. Sagittarius A*'s pad, wide and slow.
  gargantua: from('sgra', { step: 16, rev: 16, bright: 0.5, det: 12 }),
  // Mira: a red giant that swells and fades on a slow beat. Betelgeuse's pad, a deeper, slower swell.
  mira: from('betelgeuse', { swR: 0.05, swD: 0.38 }),
  // R Leporis: a crimson carbon star in its soot. VY CMa's pad, darker, on a slow swell.
  // SGR 1806-20: a magnetar, its field wound tight. The pulsar's choir, lower and darker, slower.
  // The Crab Nebula: the pulsar of 1054 in its glowing cage. The pulsar's choir, wider and farther.
  // The Ring Nebula: a white dwarf in its glowing shell. Sirius B's choir, wider and farther.
  ring: from('siriusb', { dist: 0.9, rev: 14, mix: 1.8, width: 1.8 }),
  crab: from('neutron', { dist: 0.95, rev: 14, mix: 1.9, width: 1.9 }),
  magnetar: from('neutron', { bright: 0.8, metal: 0.4, step: 10, swR: 0.03 }),
  // Polaris: the North Star, beating every four days. Procyon's pad, lower, on a quicker swell.
  polaris: from('procyon', { swR: 0.1, swD: 0.3 }),
  rlep: from('vycma', { bright: 0.5, swR: 0.04, swD: 0.36 }),
});
// Until the lab measures them, each new body takes its relative's levels.
for (const [id, rel] of [['st218', 'vycma'], ['wohg64', 'vycma'], ['quasi', 'tzo'], ['wr140', 'wr124'], ['vfts352', 'betalyr'], ['xxtri', 'arcturus'], ['epsaur', 'rigel'], ['mothra', 's5hvs1'], ['earendel', 'wr124'], ['powehi', 'sgra'], ['gargantua', 'sgra'], ['mira', 'betelgeuse'], ['rlep', 'vycma'], ['polaris', 'procyon'], ['magnetar', 'neutron'], ['crab', 'neutron'], ['ring', 'siriusb']]) {
  NORM[id] ??= NORM[rel];
  TAPNORM[id] ??= TAPNORM[rel];
  GLOWNORM[id] ??= GLOWNORM[rel];
}
NORM.powehi = NORM.sgra;
TAPNORM.powehi = TAPNORM.sgra;
NORM.gargantua = NORM.sgra;
TAPNORM.gargantua = TAPNORM.sgra;
for (const id in VOICES) VOICES[id] = { ...VOICES[id], norm: NORM[id] ?? 1, tapNorm: TAPNORM[id] ?? 1, glowNorm: GLOWNORM[id] ?? 1 };
export const preset = band => VOICES[band] || SUN;

// The zoom mix, one for all stars: a level and layer gains at each zoom stop.
// near: 1 on the long lens, 0 on the full star, below 0 zoomed out (x4 at -0.7, x32 at -1.75).
// choir and rumble are in dB; low, mid, high, melody and fx are gains.
export const ZOOM = [
  { stop: 'far', near: -1.75, choir: -9, rumble: -9, low: 1, mid: 0, high: 0, melody: 0, fx: 1 },
  { stop: 'out', near: -0.7, choir: -3, rumble: 0, low: 1, mid: 1, high: 0.3, melody: 0.3, fx: 1 },
  { stop: 'full', near: 0, choir: 0, rumble: 0, low: 1, mid: 1, high: 1, melody: 1, fx: 1 },
  { stop: 'wide', near: 0.69, choir: 0, rumble: 1, low: 1, mid: 1, high: 1, melody: 1.25, fx: 1 },
  { stop: 'long', near: 1, choir: 0, rumble: 2.3, low: 1, mid: 1, high: 1, melody: 1, fx: 1.3 },
];
export const ZOOM_KEYS = ['choir', 'rumble', 'low', 'mid', 'high', 'melody', 'fx'];
// The mix at a nearness, interpolated between stops.
export function zoomAt(near, keys = ZOOM) {
  const x = clamp(near, keys[0].near, keys[keys.length - 1].near);
  let i = 1;
  while (i < keys.length - 1 && x > keys[i].near) i++;
  const a = keys[i - 1], b = keys[i], k = (x - a.near) / (b.near - a.near || 1);
  return Object.fromEntries(ZOOM_KEYS.map(z => [z, a[z] + (b[z] - a[z]) * k]));
}

// Level per wave against the saw, measured through the formants.
const WG = { sawtooth: 1, analog: 1, square: 0.62, triangle: 1, organ: 0.95, organAh: 1, pulse: 1.9, fm: 0.68 };
// Organ drawbars by harmonic: 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1'.
const BARS = { 1: 1, 2: 0.7, 3: 0.42, 4: 0.5, 5: 0.12, 6: 0.22, 8: 0.18 };
// "Ah" formants of the old organ choir: centre in Hz, width, weight.
const AH = [[700, 130, 1], [1150, 160, 0.6], [2600, 260, 0.28], [3300, 300, 0.12]];
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
// Scales as ratios inside one octave.
const SCALES = { 0: [0, 2, 4, 5, 7, 9, 11].map(R), 1: [0, 2, 4, 7, 9].map(R), 2: [0, 2, 3, 5, 7, 8, 11].map(R), 3: [1, 9 / 8, 5 / 4, 11 / 8, 3 / 2, 13 / 8, 7 / 4, 15 / 8] };
// Chords stack thirds; pentatonic and the blend build chords on Ionian.
const chordScale = h => SCALES[h === 'cross' || h === 1 ? 0 : h];
const melodyScale = h => SCALES[h === 'cross' ? 0 : h];
// The scale a harmony's melody uses, and the one its chords stack on, as ratios.
export const scaleOf = h => ({ melody: melodyScale(h), chords: chordScale(h) });
const stepOf = (sc, i) => sc[((i % sc.length) + sc.length) % sc.length] * 2 ** Math.floor(i / sc.length);
// One chord: its root as a ratio over the base, and its roles over the root.
export function chordOf(c, harmony) {
  const sc = chordScale(harmony), d = c.deg, r0 = stepOf(sc, d), at = k => stepOf(sc, d + k) / r0;
  const root = r0 * R(c.shift || 0), N = at(1), T = at(2), F = at(4), Q = at(3), S = at(6);
  const roles = {
    triad: [T, F, null], major: [R(4), R(7), null], minor: [R(3), R(7), null], sus2: [N, F, null], sus4: [Q, F, null],
    add9: [T, F, 2 * N], seventh: [T, F, S], power: [null, F, null], cluster: [N, T, Q],
  }[c.kind] || [T, F, null];
  const [third, fifth, ext] = roles;
  return { root, N, third, fifth, ext, tones: [1, third, fifth, ext].filter(Boolean) };
}
// A chord's notes for a voicing: [ratio over the base, level, pan].
function voiced(ch, voicing) {
  const { root: r, N, third, fifth, ext } = ch;
  const out = {
    sun: [[r / 2, 1, -0.4], [r * fifth / 2, 0.8, 0.4], [r * N, 0.6, -0.2], third && [r * third, 0.55, 0.2], ext && [r * ext, 0.45, 0]],
    organ: [[r / 8, 0.55, 0], [r / 4, 1, -0.2], [r * fifth / 4, 0.7, 0.2], [r / 2, 0.6, -0.1], third && [r * third / 2, 0.4, 0.1]],
    open: [[r / 4, 1, -0.3], [r * fifth / 2, 0.8, 0.3], third && [r * third, 0.6, -0.15], [ext ? r * ext : r, 0.45, 0.15]],
    close: [[r / 2, 1, -0.3], third && [r * third / 2, 0.8, 0.3], [r * fifth / 2, 0.7, -0.1], ext && [r * ext / 2, 0.5, 0.1]],
  }[voicing] || [];
  return out.filter(Boolean);
}
const SLOTS = 5;
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
  k = { wave, organ: wave(60, h => BARS[h] || 0), pulse: wave(80, n => 2 / (n * Math.PI) * Math.sin(n * Math.PI * 0.18)), curve, irs: new Map(), ah: new Map() };
  kits.set(ac, k);
  return k;
}
// The old organ choir's wave: drawbars plus an "ah" shape, made per note.
// Harmonics reach 11 kHz; a tail falls 6 dB an octave above the vowel.
function organAh(ac, f) {
  const k = kitOf(ac), key = Math.round(f);
  if (k.ah.has(key)) return k.ah.get(key);
  const N = clamp(Math.floor(11000 / f), 8, 200);
  const w = k.wave(N, h => {
    let vow = 0;
    for (const [c, wd, a] of AH) vow += a * Math.exp(-(((h * f - c) / wd) ** 2));
    return 0.62 * (BARS[h] || 0) + 0.38 * vow / Math.pow(h, 0.35) + 0.2 / h;
  });
  k.ah.set(key, w);
  return w;
}
// A reverb: decaying noise that darkens as it fades.
// The Sun's 7 s reverb has a 1.8 s decay; others scale with length.
function irOf(ac, rev, rand = Math.random) {
  const k = kitOf(ac);
  if (k.irs.has(rev)) return k.irs.get(rev);
  const sr = ac.sampleRate, n = Math.floor(sr * (rev + 0.5)), b = ac.createBuffer(2, n, sr), tau = 1.8 * rev / 7;
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, x = (rand() * 2 - 1) * Math.exp(-t / tau) * Math.min(1, t / 0.04);
      y += (x - y) * (0.5 - 0.38 * Math.min(1, t / rev));
      d[i] = y;
    }
  }
  k.irs.set(rev, b);
  return b;
}
// A seeded random source, for tests that render the same notes twice.
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
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
// o.out: the node it plays into. o.hall: the toy's echo hall, for the hall echo.
// o.os: an array that collects every source. o.track: registers a source with the caller.
// o.onEvent: scale, chord and melody steps. o.rand: a random source.
// o.live: builds every optional stage, so v.set changes them without a rebuild.
// Returns the voice: v.cv takes a send into its echo; v.sing(until) queues moves.
export function choir(ac, { t, base, p, out, hall = null, motion = MOTION, os = [], track = n => n, onEvent = () => {}, live = false, rand = Math.random }) {
  p = { ...SUN, ...p, oct: [...p.oct] };
  const k = kitOf(ac);
  const G = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const src = (o, at) => { o.start(at); os.push(o); return track(o); };
  const lfo = (rate, depth, param) => { const o = ac.createOscillator(); o.frequency.value = rate; const g = G(depth); src(o, t).connect(g).connect(param); return { o, g }; };
  const n = { pans: [], layers: [], unison: [], leadG: [] };
  const layer = { low: 1, mid: 1, high: 1, melody: 1, fx: 1 };
  // The Turn speed against x10k: 1 at x10k, 0.5 at x5k, 0.0001 in real time.
  let turnK = 1;
  const echo = p.echo, useCv = echo !== 'hall';

  // Output: the distance lifts the level so a far star stays as loud.
  const g = G(1);
  g.connect(out);
  let tail = g;
  // Air absorbs the top on far stars.
  if (live || p.dist > 0 || p.wob > 0) { n.air = filt('lowpass', 20000, 0.5); n.air.connect(tail); tail = n.air; }
  // Width: mid and side, with the side scaled.
  if (live || p.width !== 1) {
    const sp = ac.createChannelSplitter(2), mg = ac.createChannelMerger(2);
    const mid = G(0.5), inv = G(-1), sideN = G(-1);
    n.side = G(0.5);
    sp.connect(mid, 0); sp.connect(mid, 1); sp.connect(n.side, 0); sp.connect(inv, 1); inv.connect(n.side); n.side.connect(sideN);
    mid.connect(mg, 0, 0); n.side.connect(mg, 0, 0); mid.connect(mg, 0, 1); sideN.connect(mg, 0, 1);
    mg.connect(tail);
    tail = sp;
  }
  // Distance moves sound from the dry path to a later echo.
  n.dry = G(0.5);
  n.dry.connect(tail);
  // The echo: the star's reverb, the toy's hall, or both.
  let cv, wetIn;
  if (useCv) {
    cv = ac.createConvolver();
    cv.buffer = irOf(ac, p.rev, rand);
    n.wet = G(1.2);
    cv.connect(n.wet).connect(tail);
    wetIn = cv;
  } else {
    cv = G(1);
    wetIn = cv;
  }
  if (echo !== 'reverb' && hall) {
    n.hallS = G(0.8);
    n.hallS.connect(hall);
    // With the hall alone, the echo input feeds the hall.
    if (!useCv) cv.connect(n.hallS);
  }
  if (live || p.dist > 0) { n.pre = ac.createDelay(1); n.pre.delayTime.value = 0; n.pre.connect(wetIn); wetIn = n.pre; }

  // The level swell, the metal and the sci-fi filters sit between the choir and the room.
  const sw = ac.createGain();
  const fxIn = G(1);
  n.mDry = G(1);
  sw.connect(n.mDry).connect(fxIn);
  if (live || p.metal > 0) {
    // Ring modulation at an off-key ratio gives the clang.
    const vca = G(0), car = ac.createOscillator();
    car.frequency.value = base * Math.SQRT2;
    src(car, t).connect(G(1.41)).connect(vca.gain);
    n.mWet = G(0);
    sw.connect(vca).connect(filt('lowpass', 6000, 0.5)).connect(n.mWet).connect(fxIn);
  }
  let fxOut = sciFi(ac, p, base, t, fxIn, { G, filt, lfo, curve: k.curve, n, live });
  // The zoom's fx layer mixes the filters against the plain choir.
  if (fxOut !== fxIn) {
    const mixd = G(1);
    n.fxDry = G(0); n.fxWet = G(1);
    fxIn.connect(n.fxDry).connect(mixd);
    fxOut.connect(n.fxWet).connect(mixd);
    fxOut = mixd;
  }
  fxOut.connect(wetIn);
  fxOut.connect(n.dry);
  if (n.hallS && useCv) fxOut.connect(n.hallS);
  if (motion.swell) n.swell = lfo(p.swR, p.swD, sw.gain);
  // One shared pitch drift: 3 cents at 0.2 Hz (Tom).
  const drift = G(motion.drift ? 3 : 0);
  { const o = ac.createOscillator(); o.frequency.value = 0.2; src(o, t).connect(drift); }
  // The pulsar wobble: the choir itself bends, opens, dips and shimmers with each flash.
  // bend (cents), open (filter and vowel) and tail (reverb) are offsets that a flash swells.
  // At a fast spin two waves at the flash rate make it a vibrato and a tremolo.
  let wob = null;
  if (live || p.wob > 0) {
    const cs = () => { const c = ac.createConstantSource(); c.offset.value = 0; src(c, t); return c; };
    wob = { bend: cs(), open: cs(), tail: cs(), air: cs(), trem: G(1), vibG: G(0), tremG: G(0), lvl: G(1) };
    // After the reverb, where it is heard: the level swells and the air opens.
    g.disconnect();
    g.connect(wob.lvl).connect(out);
    wob.air.connect(n.air.frequency);
    wob.vibO = lfo(1, 1, wob.vibG.gain).o;
    wob.vibO.disconnect();
    wob.vibO.connect(wob.vibG);
    wob.tremO = ac.createOscillator();
    wob.tremO.frequency.value = 1;
    src(wob.tremO, t).connect(wob.tremG).connect(wob.trem.gain);
  }
  // The analog pad: each unison voice drifts on its own slow wave.
  // Each of the three waves feeds the detune of one unison voice.
  if (live || p.aDrift > 0) n.aDrift = [0.07, 0.11, 0.13].map(r => lfo(r, 0, G(0).gain));
  // The synth filter sweeps once every 20 s.
  let sweep = null;
  if (live || p.fmot > 0) { sweep = ac.createOscillator(); sweep.frequency.value = 0.05; src(sweep, t); }

  const prog = p.prog && p.prog.length ? p.prog : null;
  const harmony = p.harmony;
  const mode0 = harmony === 'cross' ? 1 : harmony, held = prog ? null : HELD[mode0];
  const v = { cv, g, ion: [], pen: [], leads: [[], []], slots: [], li: 0, mode: mode0, step: 0, until: t, line: held ? held.line : null, tl: [] };
  const kk = () => p.step / 8;
  let nextMode = !prog && harmony === 'cross' ? t + (10 + rand() * 2) * kk() : Infinity;
  let nextLead = p.melody === 'off' ? Infinity : t + (p.melody === 'arp' ? arpGap() : p.step);
  function arpGap() { return Math.max(0.35, p.step / 6); }

  // Voices per note: one, or three a few cents apart.
  const spread = p.det > 0 ? [-1, 0, 1] : [0], ug = p.det > 0 ? 1 / Math.sqrt(3) : 1;
  function osc(f, amp, dest) {
    const sets = [];
    spread.forEach((u, ui) => {
      const o = ac.createOscillator();
      if (p.wave === 'organ') o.setPeriodicWave(k.organ);
      else if (p.wave === 'organAh') o.setPeriodicWave(organAh(ac, f));
      else if (p.wave === 'pulse') o.setPeriodicWave(k.pulse);
      else o.type = p.wave === 'fm' ? 'sine' : p.wave === 'analog' ? 'sawtooth' : p.wave;
      o.frequency.value = f;
      o.detune.value = u * p.det;
      if (u) n.unison.push({ o, u });
      drift.connect(o.detune);
      if (wob) { wob.bend.connect(o.detune); wob.vibG.connect(o.detune); }
      if (n.aDrift) n.aDrift[ui % 3].g.connect(o.detune);
      // FM: a modulator a fifth up, index 2.2, gives the glassy synth.
      let m = null, mg = null;
      if (p.wave === 'fm') {
        m = ac.createOscillator();
        m.frequency.value = f * 1.5;
        m.detune.value = u * p.det;
        mg = G(f * 1.5 * 2.2);
        src(m, t).connect(mg).connect(o.frequency);
      }
      src(o, t).connect(G(amp * ug)).connect(dest);
      sets.push((nf, at, slide) => {
        if (slide) o.frequency.setTargetAtTime(nf, at, slide); else o.frequency.setValueAtTime(nf, at);
        if (m) { m.frequency.setValueAtTime(nf * 1.5, at); mg.gain.setValueAtTime(nf * 1.5 * 2.2, at); }
      });
    });
    return (nf, at, slide) => { for (const s of sets) s(nf, at, slide); };
  }
  const first = prog ? chordOf(prog[0], harmony) : null;
  const firstV = first ? voiced(first, p.voicing) : null;
  const layers = p.slowed ? LAYERS : [LAYERS[0]];
  const cut0 = L => clamp(L.lp * p.bright, 500, 11000);
  for (let oi = 0; oi < 3; oi++) {
    if (!live && p.oct[oi] <= 0) continue;
    const sh = 2 ** -oi;
    for (const L of layers) {
      const mix = ac.createGain(), soft = filt('lowpass', 1000, 0.5);
      mix.connect(soft);
      const lay = { L, oi, soft, forms: [] };
      if (sweep) { lay.sweepG = G(0); sweep.connect(lay.sweepG).connect(soft.frequency); }
      lay.bus = G(0);
      for (const [f, q, a] of FORMANTS) {
        const bp = filt('bandpass', f, q), ga = G(0);
        soft.connect(bp).connect(ga).connect(lay.bus);
        lay.forms.push({ bp, ga, f, a });
      }
      // The bare path is 1.4 times quieter than the formants, so it gains 1.4.
      if (live || p.voice < 1) { lay.direct = G(0); soft.connect(lay.direct).connect(lay.bus); }
      if (wob) {
        // A flash opens the filter and lifts the vowel.
        wob.open.connect(G(cut0(L) * 0.9)).connect(soft.frequency);
        for (const fm of lay.forms) wob.open.connect(G(fm.f * 0.3)).connect(fm.bp.frequency);
        lay.bus.connect(wob.trem);
      } else lay.bus.connect(sw);
      n.layers.push(lay);
      // The melody has its own gain, for the zoom's melody layer.
      const leadG = G(1);
      leadG.connect(mix);
      n.leadG.push(leadG);
      const note = (f, a, pan, on = true, dest = mix) => {
        const ng = ac.createGain();
        ng.level = a * L.amp;
        ng.gain.value = on ? ng.level : 0;
        const pn = ac.createStereoPanner();
        n.pans.push({ pn, pan });
        ng.connect(pn).connect(dest);
        ng.waves = L.parts.map(([m, amp]) => { const set = osc(f * m, amp, ng); return (fl, at, slide) => set(fl * m * sh, at, slide); });
        ng.sh = sh; ng.amp = L.amp;
        return ng;
      };
      if (prog) {
        // A song: five note slots that take each chord's notes in turn.
        const row = [];
        for (let i = 0; i < SLOTS; i++) {
          const nv = firstV[i];
          const ng = note(base * (nv ? nv[0] : 1) * sh, nv ? nv[1] : 0, nv ? nv[2] : 0, !!nv);
          row.push(ng);
        }
        v.slots.push(row);
      } else if (held) for (const [r, a, pan] of held.chord) note(base * r * sh, a, pan);
      else {
        for (const [st, a, pan] of SHARED) note(base * R(st) * sh, a, pan);
        v.ion.push(note(base * R(ION[0]) * sh, ION[1], ION[2], mode0 === 0));
        v.pen.push(note(base * R(PEN[0]) * sh, PEN[1], PEN[2], mode0 === 1));
      }
      // Two top voices take turns, so each step crossfades.
      const lo = 2 ** (p.leadOct || 0);
      v.leads[0].push(note(base * lo * sh, 0.45, 0, p.melody !== 'off', leadG));
      v.leads[1].push(note(base * lo * sh, 0.45, 0, false, leadG));
    }
  }
  if (wob) {
    wob.trem.connect(sw);
    if (n.wet) wob.tail.connect(G(1.2 * p.mix)).connect(n.wet.gain);
    if (n.hallS) wob.tail.connect(G(0.8 * p.mix)).connect(n.hallS.gain);
  }
  // Notes sounding at once: chord notes and one lead, per octave and layer.
  const chordN = () => prog ? voiced(chordOf(prog[0], harmony), p.voicing).length : held ? held.chord.length : SHARED.length + 1;
  v.voices = () => (chordN() + (p.melody === 'off' ? 0 : 1)) * layers.reduce((s, L) => s + L.parts.length, 0) * p.oct.filter(x => x > 0).length * spread.length;

  // Sets every level and filter from the preset; smooth unless first.
  function apply(first) {
    const at = ac.currentTime;
    const set = (prm, x) => first ? (prm.value = x) : prm.setTargetAtTime(x, at, 0.05);
    const d = p.dist, rc = 1 / (1 + 0.09 * (p.res - 0.5));
    set(g.gain, (1 + 0.35 * d) * (p.norm ?? 1) * p.gain);
    if (n.air) set(n.air.frequency, d > 0 ? Math.max(2500, 14000 * (1 - 0.78 * d)) : 20000);
    // The hall carries the dry choir at full level, as the old organ did.
    set(n.dry.gain, (echo === 'hall' ? 1 : 0.5) * (1 - 0.8 * d));
    if (n.pre) set(n.pre.delayTime, 0.13 * d);
    if (n.wet) set(n.wet.gain, 1.2 * p.mix);
    if (n.hallS) set(n.hallS.gain, 0.8 * p.mix);
    if (n.side) set(n.side.gain, 0.5 * p.width);
    for (const { pn, pan } of n.pans) set(pn.pan, clamp(pan * p.width, -1, 1));
    set(n.mDry.gain, 1 - 0.7 * p.metal);
    if (n.mWet) set(n.mWet.gain, p.metal);
    if (n.fxWet) { set(n.fxWet.gain, layer.fx); set(n.fxDry.gain, Math.max(0, 1 - layer.fx)); }
    if (n.chorus) set(n.chorus.gain, p.chorus);
    if (n.swell) { set(n.swell.o.frequency, p.swR * (p.swTurn ? turnK : 1)); set(n.swell.g.gain, p.swD); }
    if (n.aDrift) for (const d2 of n.aDrift) set(d2.g.gain, p.aDrift);
    for (const { o, u } of n.unison) set(o.detune, u * p.det);
    for (const lg of n.leadG) set(lg.gain, layer.melody);
    for (const lay of n.layers) {
      const cut = clamp(lay.L.lp * p.bright, 500, 11000);
      lay.cut = cut;
      set(lay.soft.frequency, cut);
      set(lay.soft.Q, p.res);
      if (lay.sweepG) set(lay.sweepG.gain, cut * 0.6 * p.fmot);
      // Level 0.35 of the tuning player, split over two layers, set by ear (Tom).
      const zl = [layer.high, layer.mid, layer.low][lay.oi];
      set(lay.bus.gain, 0.00735 * p.oct[lay.oi] * WG[p.wave] * rc * zl);
      for (const fm of lay.forms) { set(fm.bp.frequency, Math.min(fm.f * p.vowel, 18000)); set(fm.ga.gain, fm.a * 4 * p.voice); }
      if (lay.direct) set(lay.direct.gain, 1.4 * (1 - p.voice));
    }
  }
  apply(true);
  // Changes the live settings; a structural change needs a new choir.
  v.set = np => { Object.assign(p, np, { oct: [...np.oct] }); apply(false); };
  // Sets the Turn speed as a factor of x10k; a swell with swTurn follows it.
  v.setTurn = k => { if (Math.abs(k - turnK) > turnK * 0.01) { turnK = k; apply(false); } };
  // A flash: the choir bends down and back, opens, dips, and leaves a shimmer in the reverb.
  // Each offset gets an anchor at the flash, so a ramp never starts from an older event.
  const anchor = (prm, at) => { prm.cancelScheduledValues(at); prm.setValueAtTime(prm.value, at); };
  const swell1 = (prm, at, peak, rise, tau) => { anchor(prm, at); prm.linearRampToValueAtTime(peak, at + rise); prm.setTargetAtTime(0, at + rise, tau); };
  v.pulse = (at = ac.currentTime, k = 1) => {
    if (!wob || !(p.wob > 0)) return;
    const w = p.wob * k;
    swell1(wob.bend.offset, at, -p.wobBend * w, 0.1, 0.2);
    swell1(wob.open.offset, at, p.wobOpen * w, 0.1, 0.2);
    swell1(wob.tail.offset, at, p.wobTail * w * 0.8, 0.2, 1.2);
    anchor(wob.trem.gain, at);
    wob.trem.gain.linearRampToValueAtTime(1 - 0.2 * Math.min(1, w), at + 0.08);
    wob.trem.gain.setTargetAtTime(1, at + 0.08, 0.2);
    // The breath you hear: the whole voice swells about 4 dB and brightens, then lets go.
    anchor(wob.lvl.gain, at);
    wob.lvl.gain.linearRampToValueAtTime(1 + 0.8 * w, at + 0.08);
    wob.lvl.gain.setTargetAtTime(1, at + 0.08, 0.18);
    swell1(wob.air.offset, at, 9000 * w, 0.06, 0.2);
  };
  // A fast spin, in flashes a second: the wobbles fuse into a vibrato and a tremolo at that rate.
  // The choir opens further as the rate climbs toward Vela's 11.2. Rate 0 settles it.
  v.spin = rate => {
    if (!wob) return;
    const at = ac.currentTime, k = clamp((rate - 1.2) / 3, 0, 1) * p.wob;
    wob.vibO.frequency.setTargetAtTime(Math.max(0.1, rate), at, 0.2);
    wob.tremO.frequency.setTargetAtTime(Math.max(0.1, rate), at, 0.2);
    wob.vibG.gain.setTargetAtTime(p.wobBend * 0.6 * k, at, 0.3);
    wob.tremG.gain.setTargetAtTime(0.25 * k, at, 0.3);
    wob.open.offset.setTargetAtTime(p.wobOpen * 0.5 * clamp(rate / 11.2, 0, 1) * p.wob, at, 0.5);
    wob.tail.offset.setTargetAtTime(p.wobTail * 0.4 * k, at, 0.5);
  };
  // Sets the zoom layers: low, mid, high, melody and fx gains.
  v.setLayers = z => { Object.assign(layer, z); apply(false); };
  // A filter swell: the low pass dips, then opens over swellA s.
  const swell = at => {
    if (!(p.swellAmt > 0)) return;
    for (const lay of n.layers) {
      lay.soft.frequency.setValueAtTime(lay.cut * (1 - 0.85 * p.swellAmt), at);
      lay.soft.frequency.setTargetAtTime(lay.cut, at, p.swellA / 3);
    }
  };

  // The chord that sounds at a time: its root over the base and its tones.
  if (prog) v.tl.push({ t, ...first, label: chordLabel(prog[0], harmony), len: prog[0].len });
  else {
    const tones = held ? (mode0 === 3 ? [1, 1.25, 1.5, 1.75] : [1, R(3), R(7), R(14)]) : [1, R(4), R(7), R(14)];
    v.tl.push({ t, root: 1, tones, label: MODES[mode0], len: Infinity });
  }
  v.chordAt = at => { let c = v.tl[0]; for (const e of v.tl) if (e.t <= at) c = e; return c; };
  onEvent({ t, mode: prog ? MODES[harmony === 'cross' ? 0 : harmony] : MODES[mode0], lead: base, chord: v.tl[0].label, len: v.tl[0].len });
  swell(t);

  const fade = (gn, at, a, b, len) => { gn.gain.setValueAtTime(a, at); gn.gain.linearRampToValueAtTime(b, at + len); };
  // The song: chord changes, each held for its length, round and round.
  let ci = 0, nextChord = prog ? t + prog[0].len : Infinity;
  let slotState = prog ? Array.from({ length: SLOTS }, (_, i) => firstV[i] ? { r: firstV[i][0], a: firstV[i][1] } : { r: 1, a: 0 }) : null;
  function changeChord(at) {
    ci = (ci + 1) % prog.length;
    const c = prog[ci], ch = chordOf(c, harmony), nv = voiced(ch, p.voicing);
    const xf = clamp(c.len / 3, 1, 4);
    for (let i = 0; i < SLOTS; i++) {
      const want = nv[i] ? { r: nv[i][0], a: nv[i][1] } : { r: slotState[i].r, a: 0 };
      const was = slotState[i];
      // A note the next chord keeps holds still.
      if (Math.abs(want.r / was.r - 1) < 0.001 && Math.abs(want.a - was.a) < 0.001) continue;
      const st = at + i * 0.12;
      for (const row of v.slots) {
        const ng = row[i], lvA = was.a * ng.amp, lvB = want.a * ng.amp;
        if (p.move === 'glide' && was.a > 0 && want.a > 0) {
          for (const set of ng.waves) set(base * want.r, st, xf / 3);
          fade(ng, st, lvA, lvB, xf);
        } else {
          // The note dips, changes pitch in silence, and returns.
          fade(ng, st, lvA, 0, xf / 2);
          for (const set of ng.waves) set(base * want.r, st + xf / 2);
          fade(ng, st + xf / 2, 0, lvB, xf / 2);
        }
      }
      slotState[i] = want;
    }
    v.tl.push({ t: at, ...ch, label: chordLabel(c, harmony), len: c.len });
    if (v.tl.length > 32) v.tl.splice(0, v.tl.length - 32);
    swell(at);
    onEvent({ t: at, chord: chordLabel(c, harmony), len: c.len });
    return at + c.len;
  }
  // The melody's notes: the chord's tones near the base, plus scale steps between them.
  function line(at) {
    if (!prog) return v.line || LINES[v.mode];
    const c = v.chordAt(at), sc = melodyScale(harmony), out = new Set();
    for (const tn of c.tones) { let r = c.root * tn; while (r < 1) r *= 2; while (r >= 2) r /= 2; out.add(+r.toFixed(5)); }
    if (p.melody !== 'arp') for (const s of sc) if (rand() < 0.35) out.add(+s.toFixed(5));
    return [...out].sort((a, b) => a - b);
  }
  // Queues the chord changes, scale crossfades and melody steps up to `until` on the audio clock.
  // Every 10 to 12 s the blend crossfades to the other scale over 4 s.
  // Every step the top voice moves to the next note; a slower star stretches both.
  v.sing = until => {
    while (Math.min(nextMode, nextLead, nextChord) < until) {
      if (nextChord <= nextMode && nextChord <= nextLead) {
        nextChord = changeChord(nextChord);
      } else if (nextMode <= nextLead) {
        v.mode = 1 - v.mode;
        const ion = v.mode === 0, len = Math.max(1.5, 4 * kk());
        for (const gn of v.ion) fade(gn, nextMode, ion ? 0 : gn.level, ion ? gn.level : 0, len);
        for (const gn of v.pen) fade(gn, nextMode, ion ? gn.level : 0, ion ? 0 : gn.level, len);
        swell(nextMode);
        onEvent({ t: nextMode, mode: MODES[v.mode] });
        nextMode += (10 + rand() * 2) * kk();
      } else {
        const at = nextLead, ln = line(at);
        if (p.melody === 'arp') {
          // The arpeggio walks up the chord, then down.
          v.dir = v.dir || 1;
          if (v.step + v.dir >= ln.length || v.step + v.dir < 0) v.dir = -v.dir;
          v.step = clamp(v.step + v.dir, 0, ln.length - 1);
        } else v.step = (v.step + (rand() < 0.7 ? 1 : ln.length - 1)) % ln.length;
        const f = base * ln[v.step] * 2 ** (p.leadOct || 0);
        if (p.melody === 'glide') {
          // The old organ's top voice: one voice that slides, time constant 1.4 s.
          for (const gn of v.leads[0]) for (const set of gn.waves) set(f, at, 1.4);
          nextLead += p.step * (0.78 + 0.44 * rand());
        } else {
          const len = p.melody === 'arp' ? Math.min(0.3, arpGap() * 0.5) : Math.max(0.8, 2 * kk());
          for (const gn of v.leads[v.li]) fade(gn, at, gn.level, 0, len);
          v.li ^= 1;
          for (const gn of v.leads[v.li]) { for (const set of gn.waves) set(f, at); fade(gn, at, 0, gn.level, len); }
          nextLead += p.melody === 'arp' ? arpGap() : p.step;
        }
        onEvent({ t: at, lead: f });
      }
    }
    v.until = until;
    return until;
  };
  return v;
}
// A chord's name: its scale degree in Roman numerals, then its kind.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
export function chordLabel(c, harmony) {
  const ch = chordOf(c, harmony);
  // Only chords with a real third read as minor; sus and cluster chords keep capitals.
  const minor = ['triad', 'minor', 'add9', 'seventh'].includes(c.kind) && ch.third && Math.log2(ch.third) * 12 < 3.5;
  const deg = ROMAN[c.deg] || String(c.deg + 1);
  const name = (c.shift ? (c.shift < 0 ? '♭' : '♯') : '') + (minor ? deg.toLowerCase() : deg);
  // The case shows major or minor, so those kinds need no word.
  return ['triad', 'major', 'minor'].includes(c.kind) ? name : `${name} ${KINDS[c.kind].split(':')[0].toLowerCase()}`;
}
// The degrees a progression can use in a harmony, with their names.
export function degrees(harmony) {
  const sc = chordScale(harmony);
  return sc.map((_, d) => ({ deg: d, label: chordLabel({ deg: d, kind: 'triad' }, harmony) }));
}
// Settings that need a new choir when they change.
export function structural(a, b) {
  if (['wave', 'rev', 'key', 'harmony', 'voicing', 'melody', 'echo', 'slowed', 'move', 'leadOct'].some(x => a[x] !== b[x])) return true;
  if (JSON.stringify(a.prog) !== JSON.stringify(b.prog)) return true;
  if ((a.det > 0) !== (b.det > 0)) return true;
  return FX.some(([x]) => a.fx[x].on !== b.fx[x].on || (a.fx[x].on && a.fx[x].amt !== b.fx[x].amt));
}
// The star's key: its home root, moved by the preset's key in semitones.
export const keyed = (root, p) => root * 2 ** ((p.key || 0) / 12);

// The sci-fi filters, each on its own switch, in a fixed order.
// The analog pad's chorus comes first: two delays that sway apart.
function sciFi(ac, p, base, t, inp, { G, filt, lfo, curve, n: h, live }) {
  const F = p.fx;
  let n = inp;
  // A parallel stage: dry and processed, mixed.
  const par = (a, proc, dryAmt = 1 - a) => { const o = G(1); n.connect(G(dryAmt)).connect(o); proc(n).connect(G(a)).connect(o); n = o; };
  if (live || p.chorus > 0) {
    const o = G(1), mg = ac.createChannelMerger(2);
    n.connect(o);
    h.chorus = G(0);
    for (const [ch, d0, rate] of [[0, 0.014, 0.31], [1, 0.019, 0.43]]) {
      const dl = ac.createDelay(0.05);
      dl.delayTime.value = d0;
      lfo(rate, 0.0025, dl.delayTime);
      n.connect(dl).connect(mg, 0, ch);
    }
    mg.connect(h.chorus).connect(o);
    n = o;
  }
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
// The blast's six voices: ratios over its root, and their names.
export const BLAST_VOICES = [[0.5, 'Sub octave'], [1, 'Root'], [1.004, 'Root, 7 cents up'], [1.498, 'Fifth'], [2, 'Octave'], [2.996, 'Octave and fifth']];
// Tap source levels against the saw blast and the triangle glow, set by ear.
const BLAST_LVL = { sawtooth: 1, square: 0.6, triangle: 1.4, sine: 1.6 };
const GLOW_LVL = { triangle: 1, sine: 0.85, sawtooth: 0.7, square: 0.6 };
// The brass blast: six sawtooth voices an octave and a fifth apart, through a soft clip.
// A resonant low pass opens in 0.45 s and closes over `len`: the brass "braam".
// The 1.004 voice beats slowly against the root, so the blast sounds like many.
// o.root: the chord's root two octaves down. o.K: the tap strength, 0.3 to 1.
// Returns a handle: its output gain, its level gain and its oscillators.
export function blast(ac, { t, root, K, len = 6, p = SUN, out, track = n => n }) {
  const k = kitOf(ac);
  const env = ac.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.2 * K, t + 0.22);
  env.gain.setTargetAtTime(0.0001, t + 1.1, len / 4);
  const lv = ac.createGain();
  lv.gain.value = p.blastLvl * BLAST_LVL[p.blastWave] * (p.tapNorm ?? 1);
  env.connect(lv).connect(out);
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
  sh.connect(ws).connect(lp).connect(env);
  const oscs = [], vgs = [];
  BLAST_VOICES.forEach(([m], i) => {
    const o = ac.createOscillator();
    o.type = p.blastWave;
    o.frequency.value = root * m * jit(0.002);
    o.start(t); o.stop(t + len + 1);
    const vg = ac.createGain();
    vg.gain.value = (p.blastMix || SUN.blastMix)[i] ?? 1;
    track(o).connect(vg).connect(sh);
    oscs.push(o); vgs.push(vg);
  });
  return { out: lv, lv, oscs, vgs, end: t + len + 1, t0: t, len, K };
}
// The glow: four soft voices, each up to 6 cents off, so the chord shimmers like a chorus.
// It swells over glowRise s from 1.5 s, holds glowHold s, then falls 40 dB over glowFade s.
// As an arpeggio, the notes enter one by one, arpGap s apart.
// o.root: the chord's root one octave down. o.notes: ratios over the root.
// Returns a handle: its output gain, level, envelope, oscillators and timing.
export function glow(ac, { t, root, K, p = SUN, out, notes, track = n => n }) {
  const ns = (p.chord === 'current' && notes) ? notes : CHORDS[p.chord] || CHORDS.major;
  const env = ac.createGain(), lv = ac.createGain();
  lv.gain.value = p.glowLvl * GLOW_LVL[p.glowWave] * (p.tapNorm ?? 1) * (p.glowNorm ?? 1);
  env.connect(lv).connect(out);
  const h = { out: lv, lv, env, K, t0: t + 1.5, oscs: [], root };
  shapeGlow(h, p, t + 1.5);
  const plp = ac.createBiquadFilter();
  plp.type = 'lowpass'; plp.frequency.value = 900; plp.Q.value = 0.5;
  plp.connect(env);
  const end = t + 1.5 + p.glowRise + p.glowHold + p.glowFade + 1;
  ns.slice(0, 5).forEach((m, i) => {
    const o = ac.createOscillator();
    o.type = p.glowWave;
    o.frequency.value = root * m * jit(0.004);
    o.detune.value = (Math.random() - 0.5) * 12;
    let into = plp;
    if (p.glowStyle === 'arp') {
      // Each arpeggio note opens its own gate in turn.
      const gate = ac.createGain(), at = t + 1.5 + i * p.arpGap;
      gate.gain.setValueAtTime(0, t);
      gate.gain.setValueAtTime(0, at);
      // Each note eases in over 0.6 s, so it tapers into the pad.
      gate.gain.linearRampToValueAtTime(1, at + 0.6);
      gate.connect(plp);
      into = gate;
    }
    o.start(t + 1.5); o.stop(end);
    const vg = ac.createGain();
    vg.gain.value = (p.glowMix || SUN.glowMix)[i] ?? 1;
    track(o).connect(vg).connect(into);
    h.oscs.push({ o, m, vg });
  });
  h.end = end;
  return h;
}
// Schedules a glow's envelope from `from`, or from now on a live change.
// The glow sits under the choir: at its peak it lifts the Sun's mix 1.5 dB (Tom: taper in, blend).
const GLOW_PEAK = 0.015;
// A rise on an S-curve: it starts and lands softly, with no audible edge.
const sCurve = (peak, n = 64) => Float32Array.from({ length: n }, (_, i) => peak * Math.sin(i / (n - 1) * Math.PI / 2) ** 2);
function shapeGlow(h, p, from) {
  const g = h.env.gain, peak = GLOW_PEAK * h.K, rise = h.t0 + p.glowRise, hold = rise + p.glowHold;
  if (from <= h.t0) {
    g.setValueAtTime(0, h.t0 - 0.01);
    g.setValueCurveAtTime(sCurve(peak), h.t0, p.glowRise);
  } else {
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(from); else { g.cancelScheduledValues(from); g.setValueAtTime(g.value, from); }
    if (from < rise) g.linearRampToValueAtTime(peak, rise);
  }
  g.setTargetAtTime(0, Math.max(from, hold), p.glowFade / 4.6);
}

// The tap bus: every blast and glow passes here, so taps never pile up.
// One glow sounds at a time: a new tap fades the last one over 2.5 s.
// One blast sounds at a time: a new one fades the last over 0.5 s.
// No limiter: Chrome's compressor adds make-up gain, which lifted tap tails by 11 dB.
// The one-glow and one-blast rule keeps a burst near one tap's level.
// With stack on, taps pile up with no limit, as before 24 November.
// o.out: the dry path. o.hall: the echo hall send. o.track: registers sources.
export function tapBus(ac, { out, hall, track = n => n }) {
  const bus = ac.createGain(), raw = ac.createGain();
  bus.connect(out);
  raw.connect(out);
  const live = { blast: [], glow: [] };
  const prune = (list, t) => { for (let i = list.length - 1; i >= 0; i--) if (list[i].end < t) list.splice(i, 1); };
  // Fades out the oldest sounds until there is room for one more.
  function steal(list, max, t, len) {
    prune(list, t);
    while (list.length >= max) {
      // A shell holds 1 until stolen; the fade must start at t, so it gets an anchor there.
      const { g } = list.shift();
      g.gain.setValueAtTime(1, t);
      g.gain.linearRampToValueAtTime(0, t + len);
    }
  }
  // One tap sound: a shell, a panner, the hall and the star's room.
  function route(g, pan, hallAmt, room, roomAmt, stack, dry = 1) {
    const pn = ac.createStereoPanner();
    pn.pan.value = clamp(pan, -1, 1);
    const dg = ac.createGain();
    dg.gain.value = dry;
    g.connect(dg).connect(pn).connect(stack ? raw : bus);
    const hg = ac.createGain();
    hg.gain.value = hallAmt;
    g.connect(hg).connect(hall);
    if (room && roomAmt > 0) { const r = ac.createGain(); r.gain.value = roomAmt; g.connect(r).connect(room); }
  }
  // A shell keeps each envelope apart from the steal fade.
  const shell = () => { const g = ac.createGain(); g.gain.value = 1; return g; };
  const fold = r => { while (r >= 2) r /= 2; while (r < 1) r *= 2; return r; };
  return {
    // A blast: root is the star's key two octaves down; chordRoot moves it to the chord.
    // max: how many blasts may ring at once; a tap run's triad keeps three.
    blast({ t, root, K, len = 6, p = SUN, pan = 0, room = null, chordRoot = 1, max = 1 }) {
      if (!p.stack) steal(live.blast, max, t, 0.5); else prune(live.blast, t);
      const sh = shell();
      const h = blast(ac, { t, root: root * fold(chordRoot), K, len, p, out: sh, track });
      route(sh, pan * 0.3, 0.5, room, 0.5 * p.dist, p.stack);
      live.blast.push({ g: sh, h, end: h.end });
    },
    // A glow: root is the star's key one octave down; notes are the chord's tones.
    glow({ t, root, K, p = SUN, pan = 0, room = null, chordRoot = 1, notes = null }) {
      if (!p.stack) steal(live.glow, 1, t, 2.5); else prune(live.glow, t);
      const sh = shell();
      const h = glow(ac, { t, root: root * fold(chordRoot), K, p, out: sh, notes, track });
      // Most of the glow goes into the star's own reverb, so it sits in the choir's room.
      // The choir's norm scales this send too, so a loud room cannot swamp the choir.
      route(sh, pan * 0.5, 0.2, room, 0.6 + 0.4 * p.dist, p.stack, 0.5);
      live.glow.push({ g: sh, h, end: h.end });
    },
    // A star switch: every sounding tap and its echo fade out over len s, so nothing bleeds into the next star.
    fadeAll(at = ac.currentTime, len = 1.5) {
      for (const list of [live.blast, live.glow]) {
        for (const { g, h } of list) {
          g.gain.cancelScheduledValues(at);
          g.gain.setValueAtTime(g.gain.value, at);
          g.gain.linearRampToValueAtTime(0, at + len);
          for (const o of h.oscs) { try { (o.o || o).stop(at + len + 0.1); } catch { /* stopped */ } }
        }
        list.length = 0;
      }
    },
    // The newest blast and glow, for the lab's graph.
    get last() { return { blast: live.blast.at(-1)?.h, glow: live.glow.at(-1)?.h }; },
    // Changes the taps that sound now: levels, sources, the glow's notes and shape.
    set(p, notes = null) {
      const at = ac.currentTime;
      for (const { h } of live.blast) {
        h.lv.gain.setTargetAtTime(p.blastLvl * BLAST_LVL[p.blastWave] * (p.tapNorm ?? 1), at, 0.05);
        for (const o of h.oscs) if (o.type !== p.blastWave) o.type = p.blastWave;
        h.vgs.forEach((vg, i) => vg.gain.setTargetAtTime((p.blastMix || SUN.blastMix)[i] ?? 1, at, 0.03));
      }
      for (const { h } of live.glow) {
        h.lv.gain.setTargetAtTime(p.glowLvl * GLOW_LVL[p.glowWave] * (p.tapNorm ?? 1) * (p.glowNorm ?? 1), at, 0.05);
        const ns = p.chord === 'current' ? notes : CHORDS[p.chord];
        h.oscs.forEach(({ o, vg }, i) => {
          vg.gain.setTargetAtTime((p.glowMix || SUN.glowMix)[i] ?? 1, at, 0.03);
          if (o.type !== p.glowWave) o.type = p.glowWave;
          if (ns && ns[i]) o.frequency.setTargetAtTime(h.root * ns[i], at, 0.08);
        });
        shapeGlow(h, p, at);
      }
    },
  };
}
