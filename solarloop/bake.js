// Star catalog: bakes the tray's flipbooks from the toy itself (Tom, 2026-11-24).
// A dev tool, not loaded by the page. Run it in the browser pane on `?qa`:
//   const B = await import('./bake.js'); await B.bakeAll(['sun', 'sgra']);
// The local preview server takes the PUT and writes `tray/<id>.webp`.
// Each flipbook is one strip of frames: the body's full view through one turn.
// The sky keys out to alpha, so the body stands on the tray's glass.
// The strip holds two rows: colour on top, its alpha as grey below, for a luminance mask.

import { STARS, SPIN_PERIOD } from './sun.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Frames per loop, the frame's side in pixels, and the frames that blend the seam.
export const OPT = { frames: 24, size: 128, seam: 6, q: 0.75 };
// Dev rows that add screen noise or edges; the bake turns them off, then back.
const QUIET = { fxGrain: 0, fxDirt: 0, fxVig: 0, fxDenoise: 0, fxStreak: 0, fxGhost: 0 };
// The toy's time between frames, in seconds: granules and gas move on it.
const STEP = 0.25;

/** Reads the GL frame as a 2D canvas, top row first. */
function grab(S) {
  const v = S.view, W = v.W, H = v.H, px = S.snap();
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Renders one object through a turn and returns its strip as a WebP data URL.
 * @param {string} id The object's key in STARS.
 */
export async function bake(id) {
  const { frames: FRAMES, size: SIZE, seam: SEAM, q } = OPT;
  const S = /** @type {any} */ (globalThis).__solar;
  if (!S) throw new Error('bake needs ?qa');
  const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));
  const wake = () => stage.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
  // Real frames, not just time: a hidden pane slows the toy's loop.
  const frames = n => new Promise(r => { const f = () => (--n > 0 ? (wake(), requestAnimationFrame(f)) : r()); requestAnimationFrame(f); });
  S.st.star = id; wake();
  // The switch's dip runs to its end before the still.
  for (let i = 0; i < 300 && (S.shown[0] !== id || S.shown[1] >= 0); i++) { wake(); await sleep(50); }
  if (S.shown[0] !== id) throw new Error(`${id} did not show`);
  // A switch's glide would steer the zoom: it stops here.
  const c = S.cam;
  c.glide = false;
  c.to = c.aim = c.z = 2; c.v = c.va = 0;
  S.place(2); wake();
  // The eye adapts about 2 s after a jump.
  await Promise.all([sleep(3000), frames(60)]);
  const B = STARS[id], v = S.view;
  const cx = (0.5 - v.cx / v.hw * 0.5) * v.W, cy = (0.5 + v.cy / v.hh * 0.5) * v.H, side = v.H * 0.92;
  const t0 = S.st.time, spin0 = S.st.spin, turn0 = S.st.turn;
  // One loop is one turn, so frame k and frame FRAMES + k stand at the same angle.
  const turnLoop = B.day ? B.day * 86400 : 0;
  const shots = [];
  for (let k = 0; k < FRAMES + SEAM; k++) {
    S.st.time = t0 + k * STEP;
    if (turnLoop) S.st.turn = turn0 + turnLoop * k / FRAMES;
    if (B.ns) S.st.spin = spin0 + SPIN_PERIOD * k / FRAMES;
    const f = document.createElement('canvas');
    f.width = f.height = SIZE;
    /** @type {CanvasRenderingContext2D} */ (f.getContext('2d')).drawImage(grab(S), cx - side / 2, cy - side / 2, side, side, 0, 0, SIZE, SIZE);
    shots.push(f.getContext('2d').getImageData(0, 0, SIZE, SIZE).data);
  }
  S.st.time = t0; S.st.spin = spin0; S.st.turn = turn0;
  const strip = document.createElement('canvas');
  strip.width = SIZE * FRAMES; strip.height = SIZE * 2;
  const sg = /** @type {CanvasRenderingContext2D} */ (strip.getContext('2d'));
  for (let k = 0; k < FRAMES; k++) {
    const out = sg.createImageData(SIZE, SIZE), o = out.data, a = shots[k];
    const msk = sg.createImageData(SIZE, SIZE), md = msk.data;
    // The seam: the first frames blend from the loop's overrun into the start.
    const b = k < SEAM ? shots[FRAMES + k] : null, w = (k + 0.5) / SEAM;
    for (let i = 0; i < o.length; i += 4) {
      const p = i >> 2, x = p % SIZE - SIZE / 2 + 0.5, y = (p / SIZE | 0) - SIZE / 2 + 0.5;
      let r = a[i], g = a[i + 1], bl = a[i + 2];
      if (b) { r = b[i] + (r - b[i]) * w; g = b[i + 1] + (g - b[i + 1]) * w; bl = b[i + 2] + (bl - b[i + 2]) * w; }
      // Light on black keys to alpha: the brightest channel is the cover.
      const m = Math.max(r, g, bl) / 255;
      // The faint sky floor drops out; the frame's rim fades, so no edge shows.
      const rr = Math.hypot(x, y) / (SIZE / 2);
      const al = Math.min(1, Math.max(0, (m - 0.03) / 0.97)) * Math.min(1, Math.max(0, (1 - rr) / 0.14));
      // The colour row holds the light at full strength; the mask row dims it.
      const un = al > 0 ? 1 / m : 0;
      o[i] = r * un; o[i + 1] = g * un; o[i + 2] = bl * un; o[i + 3] = 255;
      md[i] = md[i + 1] = md[i + 2] = al * 255; md[i + 3] = 255;
    }
    sg.putImageData(msk, k * SIZE, SIZE);
    sg.putImageData(out, k * SIZE, 0);
  }
  return strip.toDataURL('image/webp', q);
}

/**
 * Runs fn with the noisy Dev rows off, then puts them back.
 * @param {() => Promise<any>} fn
 */
export async function quiet(fn) {
  const S = /** @type {any} */ (globalThis).__solar;
  const before = Object.fromEntries(Object.keys(QUIET).map(k => [k, S.ui.setting(k)?.value]));
  for (const [k, val] of Object.entries(QUIET)) S.ui.setting(k)?.set(val, true);
  try { return await fn(); }
  finally { for (const [k, val] of Object.entries(before)) if (val != null) S.ui.setting(k)?.set(val, true); }
}

/**
 * Bakes each object and sends its strip to the dev server.
 * Progress lands in `globalThis.bakeLog`.
 * @param {string[]} ids
 */
export async function bakeAll(ids) {
  const log = /** @type {any} */ (globalThis).bakeLog = { done: [], failed: [] };
  await quiet(async () => {
    for (const id of ids) {
      try {
        const blob = await (await fetch(await bake(id))).blob();
        const r = await fetch(`tray/${id}.webp`, { method: 'PUT', body: blob });
        (r.ok ? log.done : log.failed).push(id);
      } catch (e) { log.failed.push(`${id}: ${e}`); }
    }
  });
  log.end = true;
}
