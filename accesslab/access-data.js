// @ts-check
// Access data shared by the desk and the access kit. Plan: docs/plans/access.md.

/** The audit of 2026-11-24, code reading only. Section 7 of the plan. */
export const REC = {
  fireworks: { flash: 'strobe', motor: [], colour: 'hint', motion: 'calm' },
  plasma: { flash: 'strobe', motor: [], colour: 'none', motion: 'calm' },
  railgun: { flash: 'strobe', motor: ['hold'], colour: 'none', motion: 'strong' },
  lichtenberg: { flash: 'soft', motor: [], colour: 'none', motion: 'calm' },
  spark: { flash: 'soft', motor: [], colour: 'hint', motion: 'calm' },
  flametest: { flash: 'soft', motor: [], colour: 'needed', motion: 'calm' },
  steelwool: { flash: 'none', motor: [], colour: 'none', motion: 'calm' },
  pop: { flash: 'none', motor: [], colour: 'hint', motion: 'calm' },
  pins: { flash: 'none', motor: [], colour: 'none', motion: 'calm' },
  domino: { flash: 'none', motor: ['drag'], colour: 'hint', motion: 'strong' },
};
/** @type {Record<string, string>} */
export const WORD = { flash: 'Flashing', taps: 'Fast taps', hold: 'Long hold', drag: 'Precise drag', colour: 'Colour', motion: 'Strong motion', sound: 'Sound' };

// Tech tags from tools/techtags.mjs; `node tools/hubdata.mjs` rewrites this line.
const PACK = { morpher: "three", pop: "three", fidget: "dom", domino: "three", pins: "three", galaxy: "three+gpu", prism: "three", kaleido: "webgl2", ferro: "three", neon: "webgl2", magnet: "three", soap: "three", glass: "three", chladni: "webgl2", pendulum: "three", pool: "webgl2", putty: "webgl2", scope: "webgl2", walker: "three", fire: "three+gpu", rain: "webgl2", tvtree: "three", balloons: "three", bubbles: "three", lava: "webgl2", eyes: "webgl2", sonar: "webgl2", trails: "webgl2", shadyos: "webgl2", chamber: "webgl2", ink: "three+gpu", window: "three", windmap: "webgl2", vortex: "webgl2", dijkstra: "webgl2", fireworks: "three", launch: "three", frietkot: "three", railgun: "three", trainride: "three", washline: "three", cauldron: "three+gpu", meshball: "webgl2", washer: "webgl2", spark: "three+gpu", oilslick: "webgl2", ladder: "webgl2", windtunnel: "webgl2", schlieren: "webgl2", lichtenberg: "webgl2", steelwool: "webgl2", postcard: "dom", motorway: "three", foil: "webgl2", kintsugi: "webgl2", crossing: "canvas2d", marble: "webgl2", rupert: "webgl2", bowl: "webgl2", observatory: "three", nvg: "three", plasma: "webgl2", drone: "three", snow: "three", tornado: "webgl2", windfarm: "three", subway: "three", carwash: "webgl2", harmono: "canvas2d", wires: "webgl2", contour: "webgl2", sorting: "webgl2", aquarium: "three", ascent: "three", beer: "three", bench: "webgl2", bismuth: "webgl2", bread: "three", breakers: "webgl2", calaeno: "three", calmjar: "webgl2", calving: "three", canal: "three", chemgarden: "three", chocolate: "webgl2", chromatography: "webgl2", meteor: "three", coil: "three", cuttle: "webgl2", dandelion: "three", deepvent: "webgl2", eclipse: "webgl2", desirepaths: "webgl2", dichroic: "webgl2", doubleslit: "webgl2", hookloop: "three", epicycles: "webgl2", eventhorizon: "webgl2", eastvan: "three", fireflies: "webgl2", aurora: "webgl2", flametest: "webgl2", foghorn: "webgl2", forge: "three", fruit: "three", frost: "webgl2", gasgiant: "webgl2", gears: "canvas2d", geoboard: "three", glow: "webgl2", tide: "webgl2", glowworm: "webgl2", greenwave: "three", cloudbottle: "webgl2", honey: "webgl2", hotice: "webgl2", humpyard: "three", hurricane: "webgl2", icebreach: "three", ice: "three", cube: "three", interchange: "webgl2", jellyfish: "three", jethover: "three+gpu", lanterns: "webgl2", lavacoast: "webgl2", lavaskin: "webgl2", leafshadows: "webgl2", milkcrown: "webgl2", flock: "webgl2", musicbox: "canvas2d", viaduct: "three", orbits: "webgl2", opal: "webgl2", peapod: "three", peel: "webgl2", phaeton: "three", pickle: "three", piwalk: "webgl2", purr: "webgl2", rainstick: "webgl2", rosewindow: "webgl2", rubens: "webgl2", sequin: "webgl2", shiplaunch: "three", slime: "webgl2", starchart: "webgl2", spillway: "webgl2", top: "three", flap: "canvas2d", steelline: "webgl2", steelworks: "three", stirbar: "webgl2", harp: "canvas2d", moire: "webgl2", tablecloth: "three", terrarium: "three", tesseract: "three", traffic: "webgl2", turing: "webgl2", ulam: "three", volcano: "three", waterwheel: "webgl2", wavemachine: "three", spectrogram: "webgl2", bz: "webgl2", wheat: "webgl2", whiteout: "webgl2", stone: "webgl2", supercon: "three", wreckingball: "three", sand: "webgl2", zipper: "canvas2d" };
/** @type {Record<string, { tier: string, webgpu: boolean }>} */
export const TECH = Object.fromEntries(Object.entries(PACK).map(([k, v]) => [k, { tier: v.replace('+gpu', ''), webgpu: v.endsWith('+gpu') }]));
/** @type {Record<string, string>} */
const TAG = { dom: 'DOM', canvas2d: '2D', webgl2: 'GL', three: '3D', webgpu: 'GPU' };
/** @type {Record<string, string>} */
const TAG_NAME = { dom: 'DOM, SVG, CSS', canvas2d: 'Canvas 2D', webgl2: 'WebGL2', three: 'three.js', webgpu: 'WebGPU' };
/**
 * Outline: supported. Filled: runs now. A WebGPU toy without WebGPU runs GL.
 * @param {string} id @param {boolean} [noGpu]
 */
export function techHTML(id, noGpu = false) {
  const t = TECH[id];
  if (!t) return '';
  const tag = (/** @type {string} */ k, /** @type {string} */ cls) => `<span class="tag ${cls}" title="${TAG_NAME[k]}">${TAG[k]}</span>`;
  if (!t.webgpu) return `<span class="tags">${tag(t.tier, 'now')}</span>`;
  // @ts-ignore navigator.gpu is not in every lib.
  return navigator.gpu && !noGpu ? `<span class="tags">${tag(t.tier, '')}${tag('webgpu', 'now')}</span>`
    : `<span class="tags">${tag(t.tier, '')}${tag('webgpu', 'off')}${tag('webgl2', 'now')}</span>`;
}

/* ColorSym from a colour: OKLCH hue picks the family. */
/** @param {number} L @param {number} C @param {number} h */
export const symOf = (L, C, h) => {
  if (C < 0.04) return L > 0.8 ? 'W' : null;
  if (h >= 335 || h < 10) return 'P';
  if (h < 42) return L < 0.5 ? 'N' : 'R';
  if (h < 75) return L < 0.55 ? 'N' : 'O';
  if (h < 120) return 'Y';
  if (h < 195) return 'G';
  if (h < 275) return 'B';
  return 'V';
};
/** The OKLCH stops of a colour or gradient string. @param {string} css */
export const stops = css => [...String(css || '').matchAll(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)/g)].map(m => [+m[1], +m[2], +m[3]]);
/** The first stop as a CSS colour: the toy's ink. @param {string} css */
export const inkOf = css => { const s = stops(css)[0]; return s ? `oklch(${s.join(' ')})` : '#fff'; };
/** One ColorSym mark as SVG. @param {string|null} k */
export const mark = k => (k ? `<svg aria-hidden="true"><use href="#cs-${k}"/></svg>` : '');
/** The marks of an accent, one per stop, repeats dropped. @param {string} accent */
export const marksOf = accent => [...new Set(stops(accent).map(s => symOf(s[0], s[1], s[2])).filter(Boolean))];
/** A glyph by name. @param {string} id */
export const glyph = id => `<svg class="g" aria-hidden="true"><use href="#g-${id}"/></svg>`;

/**
 * The flags a record turns on, warnings first.
 * @param {string} id @param {any} toy
 * @returns {[string, string[]?][]}
 */
export function flags(id, toy) {
  const r = /** @type {any} */ (REC)[id], out = /** @type {[string, string[]?][]} */ ([]);
  if (!r) return out;
  if (r.flash === 'strobe') out.push(['flash']);
  r.motor.forEach((/** @type {string} */ m) => out.push([m]));
  if (r.colour === 'needed') out.push(['colour', /** @type {string[]} */ (marksOf(toy?.accent || ''))]);
  if (r.motion === 'strong') out.push(['motion']);
  return out;
}
/** Glyph and word per flag, as the intro's access row shows them. @param {string} id @param {any} toy */
export const flagsHTML = (id, toy) => flags(id, toy).map(([k, m]) => `<span class="acc-i">${glyph(k)}<b>${WORD[k]}</b>${m ? `<span class="marks">${m.map(mark).join('')}</span>` : ''}</span>`).join('');
