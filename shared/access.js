// @ts-check
// Access glyphs, flags and tech tags for the intro and the workbenches.
// Plan: docs/plans/access.md. Data: each toy's "access" and "tech" in toys.json.

// Glyphs: 24 by 16 hairlines in Bar v3's How to play idiom.
// The left half is the subject, the right half the modifier.
export const SPRITE = `<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
    <symbol id="g-flash" viewBox="0 0 24 16"><rect fill="currentColor" stroke="none" x="2.5" y="4" width="8" height="8"/><path d="M15 4.5v7M18 4.5v7M21 4.5v7"/></symbol>
    <symbol id="g-taps" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="6.5" cy="8" r="2"/><circle cx="6.5" cy="8" r="4.5"/><path d="M15 4.5v7M18 4.5v7M21 4.5v7"/></symbol>
    <symbol id="g-hold" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="6.5" cy="8" r="2"/><circle cx="6.5" cy="8" r="4.5"/><path d="M13.5 5.5v5M13.5 8h7M20.5 5.5v5"/></symbol>
    <symbol id="g-drag" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="6.5" cy="8" r="2"/><circle cx="6.5" cy="8" r="4.5"/><path d="M12.6 8h3.6" stroke-dasharray="0.01 1.8"/><circle cx="20" cy="8" r="2.4"/><circle fill="currentColor" stroke="none" cx="20" cy="8" r="0.7"/></symbol>
    <symbol id="g-colour" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="9" cy="8" r="4.5"/><circle cx="15" cy="8" r="4.5"/></symbol>
    <symbol id="g-sound" viewBox="0 0 24 16"><path d="M5.5 11.5V8a6.5 6.5 0 0 1 13 0v3.5"/><rect fill="currentColor" stroke="none" x="4.2" y="9.2" width="3.2" height="5" rx="0.9"/><rect fill="currentColor" stroke="none" x="16.6" y="9.2" width="3.2" height="5" rx="0.9"/></symbol>
    <symbol id="g-motion" viewBox="0 0 24 16"><rect x="2.5" y="4" width="8.5" height="8" rx="1"/><path d="M18.2 4.5a3.5 3.5 0 1 1-3.03 1.75M13.1 7l2.07-.75.38 2.17"/></symbol>
</defs></svg>`;

/** Puts the glyph sprite in the page once. @param {Document} [doc] */
export function injectSprite(doc = document) {
  if (doc.getElementById('access-glyphs')) return;
  const host = doc.createElement('div');
  host.id = 'access-glyphs';
  host.innerHTML = SPRITE;
  doc.body.prepend(host);
}

/** @type {Record<string, string>} */
export const WORD = { flash: 'Flashing', taps: 'Fast taps', hold: 'Long hold', drag: 'Precise drag', multi: 'Two fingers', keys: 'Keyboard', colour: 'Colour', motion: 'Strong motion', sound: 'Sound' };
/** @type {Record<string, string>} */
export const TAG = { dom: 'DOM', canvas2d: '2D', webgl2: 'GL', three: '3D', webgpu: 'GPU' };
/** @type {Record<string, string>} */
export const TAG_NAME = { dom: 'DOM, SVG, CSS', canvas2d: 'Canvas 2D', webgl2: 'WebGL2', three: 'three.js', webgpu: 'WebGPU' };

/** A glyph by name. @param {string} id */
export const glyph = id => `<svg class="g" aria-hidden="true"><use href="#g-${id}"/></svg>`;
/** The first OKLCH stop of a colour or gradient: the toy's ink. @param {string} css */
export const inkOf = css => { const m = String(css || '').match(/oklch\([^)]*\)/); return m ? m[0] : '#fff'; };

/**
 * The flags an access record turns on, warnings first. A null record shows none.
 * @param {any} access
 * @returns {string[]}
 */
export function flags(access) {
  if (!access) return [];
  const out = [];
  if (access.flash === 'strobe') out.push('flash');
  for (const m of access.motor || []) if (WORD[m]) out.push(m);
  if (access.colour === 'needed') out.push('colour');
  if (access.motion === 'strong') out.push('motion');
  return out;
}
/** Glyph and word per flag. @param {any} access */
export const flagsHTML = access => flags(access).map(k => `<span class="acc-i">${glyph(k)}<b>${WORD[k]}</b></span>`).join('');
/** The flags in words, for a screen reader. @param {any} access */
export const flagsText = access => flags(access).map(k => WORD[k]).join(', ');

/**
 * Tech tags. Outline: supported. Filled: runs now. A WebGPU toy without WebGPU runs GL.
 * @param {{ tier: string, webgpu: boolean } | null | undefined} tech
 * @param {boolean} [noGpu]
 */
export function techHTML(tech, noGpu = false) {
  if (!tech || !TAG[tech.tier]) return '';
  const tag = (/** @type {string} */ k, /** @type {string} */ cls) => `<span class="tag ${cls}" title="${TAG_NAME[k]}">${TAG[k]}</span>`;
  if (!tech.webgpu) return `<span class="tags">${tag(tech.tier, 'now')}</span>`;
  // @ts-ignore navigator.gpu is not in every lib.
  return navigator.gpu && !noGpu ? `<span class="tags">${tag(tech.tier, '')}${tag('webgpu', 'now')}</span>`
    : `<span class="tags">${tag(tech.tier, '')}${tag('webgpu', 'off')}${tag('webgl2', 'now')}</span>`;
}
