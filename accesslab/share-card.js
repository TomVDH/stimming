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
@font-face { font-family: "SC Slab"; font-weight: 700; src: url(${FONT('IosevkaTermSlab-Bold.woff2')}) format("woff2"); }
@font-face { font-family: "SC Slab"; font-weight: 500; src: url(${FONT('IosevkaTermSlab-Medium.woff2')}) format("woff2"); }
.sc { --m: 72px; position: relative; width: 1200px; height: 630px; overflow: hidden; background: #0e0e10; color: #f3f1ec; font-family: "SC Slab", monospace; }
.sc--main {
  background: oklch(0.16 0.012 275);
  display: grid; place-content: center; justify-items: center; text-align: center;
  gap: 24px; padding-bottom: 58px; box-sizing: border-box;
}
.sc-foot-cv {
  position: absolute; left: 0; right: 0; bottom: 0; width: 1200px; height: 340px;
  display: block; pointer-events: none; z-index: 0;
}
.sc-main-wm {
  position: relative; z-index: 1; display: flex; align-items: baseline; gap: 0.01em;
  font: 700 148px/0.92 "SC Slab", "Iosevka Term Slab", monospace; letter-spacing: -0.025em;
}
.sc-main-wm .l { display: inline-block; color: var(--c); font-weight: var(--w); transform-origin: 50% 70%; }
.sc-main-sub {
  position: relative; z-index: 1; margin: 0; max-width: 28ch; text-wrap: balance;
  font: 400 30px/1.34 B612, sans-serif; letter-spacing: 0.005em;
  color: oklch(0.80 0.016 275);
}
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
.sc-t { font-weight: 800; font-size: var(--ts, 74px); line-height: 1; letter-spacing: -0.025em; white-space: nowrap; }
.sc-tag { margin-top: 16px; font: 400 24px/1.3 B612, sans-serif; color: #f3f1ecb8; max-width: 24ch; }
/* The foot row: the lab line at left; the tech tags, then the wordmark, at right; one centre line. */
/* The tags stay minimal: small slab caps at half strength. */
.sc-end { display: flex; align-items: center; gap: 22px; }
.sc-badges { display: flex; gap: 0.6em; font: 800 14px/1 "SC Slab", monospace; letter-spacing: 0.14em; color: #f3f1ec80; }
.sc-badges b { font-weight: 800; }
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
    <div class="sc-name">${emblem ? `<div class="sc-ic" style="--emblem: url(${emblem})"></div>` : ''}<div class="sc-t">${t.name}</div>${t.tag ? `<div class="sc-tag">${t.tag}</div>` : ''}</div>
    <div class="sc-foot"><div class="sc-facts">${t.sub || ''}</div><div class="sc-end"><div class="sc-badges">${tech(id)}</div><div class="sc-wm">${wm}</div></div></div>
  </div>`;
  const card = /** @type {HTMLElement} */ (host.firstElementChild);
  // A long title steps down until it fits its column on one line.
  const title = /** @type {HTMLElement} */ (card.querySelector('.sc-t'));
  if (title.scrollWidth > 488) title.style.setProperty('--ts', `${Math.max(44, Math.floor(74 * 488 / title.scrollWidth))}px`);
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

// Draws the crisp OKLab rainbow footer gradient onto a 2D canvas (matching Signal Dial's dark subtle footer cloud).
function paintFooterCloud(canvas) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hash = (x, y) => {
    let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  };
  const vnoise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (x, y) => {
    let v = 0, amp = 0.5;
    for (let i = 0; i < 4; i++) {
      v += amp * vnoise(x, y);
      const nx = x * 1.62 - y * 1.18 + 2.3;
      const ny = x * 1.18 + y * 1.62 + 1.1;
      x = nx; y = ny; amp *= 0.5;
    }
    return v;
  };
  const oklabToSrgb = (L, a, b) => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
    return lin.map(v => {
      v = clamp(v);
      return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * (v ** (1 / 2.4)) - 0.055));
    });
  };
  const bg = oklabToSrgb(0.16, 0.012 * Math.cos(275 * Math.PI / 180), 0.012 * Math.sin(275 * Math.PI / 180));
  for (let py = 0; py < H; py++) {
    const yUp = 1 - py / H; // 0 at bottom edge, 1 at top of strip
    for (let px = 0; px < W; px++) {
      const ux = px / W;
      const sx = (ux - 0.5) * 3.1;
      const sy = yUp * 1.45;
      const wx = fbm(sx + 1.1, sy + 0.6) - 0.5;
      const wy = fbm(sx + 3.4, sy + 2.7) - 0.5;
      const n = fbm(sx + wx * 1.2, sy + wy * 1.2);
      const arch = 0.08 * Math.cos((ux - 0.5) * Math.PI * 1.45);
      const lift = 1 - sstep(0.0, 0.94, yUp - arch + (n - 0.5) * 0.22);
      const wisp = sstep(0.24, 0.86, n);
      const edge = sstep(0.0, 0.12, ux) * sstep(0.0, 0.12, 1 - ux);
      const mask = clamp((lift ** 1.45) * (0.48 + 0.52 * wisp) * (0.65 + 0.35 * edge));
      const ang = ux * 6.28318 * 1.05 + n * 2.1 + 0.85;
      const L = 0.25 + 0.14 * wisp + 0.06 * lift;
      const C = (0.08 + 0.055 * wisp) * mask;
      const col = oklabToSrgb(L, C * Math.cos(ang), C * Math.sin(ang));
      const a = clamp(mask * 0.72);
      const idx = (py * W + px) * 4;
      data[idx] = Math.round(bg[0] + (col[0] - bg[0]) * a);
      data[idx + 1] = Math.round(bg[1] + (col[1] - bg[1]) * a);
      data[idx + 2] = Math.round(bg[2] + (col[2] - bg[2]) * a);
      data[idx + 3] = Math.round(255 * clamp(lift * 1.25));
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Draws the main site SEO share card (1200 x 630): Stimming wordmark, shareholder-value tagline, and the OKLab footer gradient.
 * @param {HTMLElement} host
 * @returns {Promise<HTMLElement>}
 */
export async function drawMainCard(host) {
  install();
  await Promise.all(['700 148px "SC Slab"', '500 148px "SC Slab"', '800 148px "SC Slab"', '400 30px B612'].map(f => document.fonts.load(f)));
  const wm = await wordmark();
  host.innerHTML = `<div class="sc sc--main" data-id="main">
    <canvas class="sc-foot-cv" width="1200" height="340" aria-hidden="true"></canvas>
    <div class="sc-main-wm">${wm}</div>
    <p class="sc-main-sub">delightful and effective ways to deny shareholder value</p>
  </div>`;
  const card = /** @type {HTMLElement} */ (host.firstElementChild);
  const cv = /** @type {HTMLCanvasElement} */ (card.querySelector('.sc-foot-cv'));
  paintFooterCloud(cv);
  return card;
}
