// @ts-check
// The share card: one toy's 1200 x 630 og:image, drawn live in the page.
// The Share tab and docs/qa/share-cards/preview.html both use it. Look: Tom, 2026-11-25. Bean stimming-s4zf.
// The icon is the toy's emblem as a luminance mask in white, its own light and shade (Tom: "the luminosity mask ones, not the gradient ones").
import { TECH, TAG } from './access-data.js';

const ROOT = new URL('../', import.meta.url).href;
const FONT = (/** @type {string} */ f) => new URL(`../shared/fonts/${f}`, import.meta.url).href;

// Grid: 72 px margins. Left: the still. Right: one column from x 640 to 1128.
// In the column: the name group on the card's middle line, the foot row on the bottom margin.
const STYLE = `
@font-face { font-family: "SC Slab"; font-weight: 800; src: url(${FONT('IosevkaTermSlab-ExtraBold.woff2')}) format("woff2"); }
.sc { --m: 72px; position: relative; width: 1200px; height: 630px; overflow: hidden; background: #0e0e10; color: #f3f1ec; font-family: "SC Slab", monospace; }
/* The still fills the left side to the card's edges; its right edge is a dithered arc. */
/* A light blur softens it; a sparse dither runs through the whole picture. */
.sc-still { position: absolute; left: 0; top: 0; width: 620px; height: 630px; object-fit: cover; opacity: 0.72; filter: blur(2.5px);
  -webkit-mask: var(--sc-dither) 0 0 / 100% 100% no-repeat; mask: var(--sc-dither) 0 0 / 100% 100% no-repeat; }
/* A soft mesh of the toy's accent colours rises from the bottom-right corner. */
/* Three washes, the two stops and their mix, blurred into one field; it bleeds off the card. */
.sc-mesh { position: absolute; right: -90px; bottom: -90px; width: 760px; height: 500px; opacity: 0.26; mix-blend-mode: screen; filter: blur(30px); pointer-events: none;
  background: radial-gradient(44% 54% at 86% 84%, var(--c1), #0000 70%), radial-gradient(40% 48% at 56% 96%, var(--c2), #0000 72%), radial-gradient(34% 42% at 97% 50%, color-mix(in oklch, var(--c1), var(--c2)), #0000 70%); }
/* The name group: icon, title, motto, flush on one edge at x 640. */
.sc-name { position: absolute; left: 640px; top: 315px; translate: 0 -50%; width: 488px; display: flex; flex-direction: column; align-items: flex-start; }
/* emblemBox() sizes this box to the emblem's art: 150 px tall, its left edge on the text's edge. */
.sc-ic { width: 150px; height: 150px; margin-bottom: 30px; background: #f3f1ec;
  -webkit-mask: var(--emblem) var(--mx, 0) var(--my, 0) / var(--ms, 100%) no-repeat; mask: var(--emblem) var(--mx, 0) var(--my, 0) / var(--ms, 100%) no-repeat; mask-mode: luminance; }
/* The title row: the title, then the tech tags small at its cap line, like a footnote mark. */
.sc-trow { display: flex; align-items: flex-start; gap: 14px; }
.sc-badges { display: flex; gap: 0.6em; flex: none; margin-top: 0.55em; font: 800 14px/1 "SC Slab", monospace; letter-spacing: 0.14em; color: #f3f1ec80; }
.sc-badges b { font-weight: 800; }
.sc-t { font-weight: 800; font-size: var(--ts, 74px); line-height: 1; letter-spacing: -0.025em; white-space: nowrap; }
.sc-tag { margin-top: 16px; font: 400 24px/1.3 B612, sans-serif; color: #f3f1ecb8; max-width: 24ch; }
/* The foot row: the lab line at left, the wordmark at right, on one centre line. */
.sc-foot { position: absolute; left: 640px; right: var(--m); bottom: var(--m); display: flex; align-items: center; justify-content: space-between; }
.sc-facts { display: flex; align-items: center; gap: 8px; font: 400 19px/1 B612, sans-serif; color: #f3f1ec99; }
/* The wordmark closes the foot row at the right margin. */
.sc-wm { display: flex; align-items: baseline; gap: 0.01em; font: 500 46px/0.8 Gabarito, sans-serif; letter-spacing: -0.02em; }
.sc-wm .l { display: inline-block; color: var(--c); font-weight: var(--w); transform-origin: 50% 70%; }
`;

// The menu's resting tilt and drop for each letter.
const REST = [[-8, 2], [6, -4], [-3, 3], [4, -2], [-5, 4], [7, -5], [-4, 1], [3, -3]];

/** @type {Promise<string> | null} */
let wmHTML = null;
// The menu's wordmark, every letter in its own colour, askew as at rest.
async function wordmark() {
  wmHTML ||= fetch(`${ROOT}index.html`).then(r => r.text()).then(t => {
    const src = new DOMParser().parseFromString(t, 'text/html').querySelector('#title > [aria-hidden]');
    const d = document.createElement('div');
    d.innerHTML = src?.outerHTML ?? 'Stimming';
    d.querySelectorAll('.l').forEach((l, i) => { /** @type {HTMLElement} */ (l).style.transform = `translateY(${REST[i][1]}px) rotate(${REST[i][0]}deg)`; });
    return d.innerHTML;
  });
  return wmHTML;
}

/** Two mesh colours from the accent: its stops, or one colour and a hue 40 degrees on. @param {string} [accent] */
export function meshColours(accent = '') {
  const cs = accent.match(/oklch\([^)]*\)|#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) || ['oklch(0.7 0.1 280)'];
  if (cs.length > 1) return cs.slice(0, 2);
  const m = cs[0].match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  return m ? [cs[0], `oklch(${(+m[1] - 0.08).toFixed(2)} ${m[2]} ${(+m[3] + 40) % 360})`] : [cs[0], cs[0]];
}

/** The tier the toy runs on, then GPU when it can use WebGPU. @param {string} id */
const tech = id => { const t = /** @type {any} */ (TECH)[id]; return t ? `<b>${TAG[t.tier]}</b>${t.webgpu ? `<b>${TAG.webgpu}</b>` : ''}` : ''; };

/** The still's mask: a ramp in from an arced right edge, thresholded by an 8 x 8 Bayer matrix in 4 px cells. */
function ditherMask(w = 620, h = 630, cell = 4) {
  const B = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  // The edge bulges outward: x 500 at the top and bottom, x 610 at the middle.
  // The ramp runs 280 px in from that edge; inside it, one dot in sixteen stays out.
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
    const t = (y + cell / 2 - h / 2) / (h / 2), edge = 500 + 110 * (1 - t * t);
    const u = Math.min(1, Math.max(0, (edge - x - cell / 2) / 280)), v = 0.94 * u * u * (3 - 2 * u);
    if (v > (B[((y / cell) % 8) * 8 + ((x / cell) % 8)] + 0.5) / 64) g.fillRect(x, y, cell, cell);
  }
  return c.toDataURL();
}

let ready = false;
// Adds the card's CSS and the dither mask once per page.
function install() {
  if (ready) return;
  ready = true;
  const st = document.createElement('style');
  st.textContent = STYLE;
  document.head.append(st);
  document.documentElement.style.setProperty('--sc-dither', `url(${ditherMask()})`);
}

/** A still with one retry; null when the toy has none. @param {string} id @param {number} [tries] @returns {Promise<string | null>} */
const loadStill = (id, tries = 2) => new Promise(res => {
  const img = new Image();
  img.onload = () => res(img.src);
  img.onerror = () => (tries > 1 ? setTimeout(() => loadStill(id, tries - 1).then(res), 600) : res(null));
  img.src = `${ROOT}shared/stills/${id}.webp`;
});

/** @type {HTMLElement | null} */
let probe = null;
/**
 * The emblem's art box in its 128-unit view box, measured from the drawn SVG.
 * @param {string} url @returns {Promise<{ x: number, y: number, w: number, h: number, vw: number }>}
 */
async function emblemBox(url) {
  const fallback = { x: 0, y: 0, w: 128, h: 128, vw: 128 };
  try {
    const text = await fetch(url).then(r => r.text());
    probe ||= document.body.appendChild(Object.assign(document.createElement('div'), { style: 'position:absolute;left:-9999px;top:0;width:128px;height:128px;visibility:hidden' }));
    probe.innerHTML = text;
    const svg = /** @type {SVGSVGElement | null} */ (probe.querySelector('svg'));
    if (!svg) return fallback;
    const b = svg.getBBox(), v = svg.viewBox.baseVal;
    const vx = v?.width ? v.x : 0, vy = v?.width ? v.y : 0, vw = v?.width || 128, vh = v?.height || 128;
    // The drawing, clipped to the view box.
    const x0 = Math.max(b.x, vx), y0 = Math.max(b.y, vy), x1 = Math.min(b.x + b.width, vx + vw), y1 = Math.min(b.y + b.height, vy + vh);
    return x1 > x0 && y1 > y0 ? { x: x0 - vx, y: y0 - vy, w: x1 - x0, h: y1 - y0, vw } : fallback;
  } catch { return fallback; }
}

/**
 * Draws one toy's card into host, at full size; the caller scales host.
 * @param {HTMLElement} host
 * @param {string} id  The toy's id in toys.json.
 * @param {any} t  The toy's record in toys.json.
 * @returns {Promise<HTMLElement>} The card, drawn whole.
 */
export async function drawCard(host, id, t) {
  install();
  await Promise.all(['800 74px "SC Slab"', '400 24px B612', '500 46px Gabarito'].map(f => document.fonts.load(f)));
  const emblem = t.emblem ? `${ROOT}${t.emblem}` : null;
  const [still, wm, box] = await Promise.all([loadStill(id), wordmark(), emblem ? emblemBox(emblem) : null]);
  const [c1, c2] = meshColours(t.accent);
  host.innerHTML = `<div class="sc" data-id="${id}">
    ${still ? `<img class="sc-still" alt="" src="${still}">` : ''}
    <div class="sc-mesh" style="--c1: ${c1}; --c2: ${c2}"></div>
    <div class="sc-name">${emblem ? `<div class="sc-ic" style="--emblem: url(${emblem})"></div>` : ''}<div class="sc-trow"><div class="sc-t">${t.name}</div><div class="sc-badges">${tech(id)}</div></div>${t.tag ? `<div class="sc-tag">${t.tag}</div>` : ''}</div>
    <div class="sc-foot"><div class="sc-facts">${t.sub || ''}</div><div class="sc-wm">${wm}</div></div>
  </div>`;
  const card = /** @type {HTMLElement} */ (host.firstElementChild);
  // A long title steps down until it and its badges fit the column on one line.
  const title = /** @type {HTMLElement} */ (card.querySelector('.sc-t')), badges = /** @type {HTMLElement} */ (card.querySelector('.sc-badges'));
  const room = 488 - (badges.offsetWidth ? badges.offsetWidth + 14 : 0);
  if (title.scrollWidth > room) title.style.setProperty('--ts', `${Math.max(40, Math.floor(74 * room / title.scrollWidth))}px`);
  // The art fits 150 px tall, 240 px wide at most; the mask shifts so the art meets the edge.
  const ic = /** @type {HTMLElement | null} */ (card.querySelector('.sc-ic'));
  if (ic && box) {
    const k = Math.min(150 / box.h, 240 / box.w);
    Object.assign(ic.style, { width: `${box.w * k}px`, height: `${box.h * k}px` });
    ic.style.setProperty('--ms', `${box.vw * k}px`);
    ic.style.setProperty('--mx', `${-box.x * k}px`);
    ic.style.setProperty('--my', `${-box.y * k}px`);
  }
  return card;
}
