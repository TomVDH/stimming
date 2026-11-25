// Shared parts of the capture scripts: tools/stills.mjs and tools/loops.mjs.
// Both open a main-shelf toy in headless Playwright and poke it.

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// A square viewport gives a near-square stage, so the crop keeps most of it.
export const VIEW = { width: 1100, height: 1100 };
// The menu's round tube shows this share of the picture's width.
export const CIRCLE = 0.8;
export const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-unsafe-webgpu'];
// The scene settles this long after the intro leaves.
export const SETTLE = 3000;
// A page gets this many loads before the capture counts as weak.
export const TRIES = 3;

// A worktree sits inside the main checkout, which the server serves.
export function base(override) {
  if (override) return override.replace(/\/$/, '');
  const at = ROOT.indexOf(`${sep}.worktrees${sep}`);
  const path = at < 0 ? '' : '/' + relative(ROOT.slice(0, at), ROOT).split(sep).join('/');
  return `http://localhost:8000${path}`;
}

// The main shelf is every toy link before the Lab section.
export function shelf() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const from = html.indexOf('<main'), to = html.indexOf('<section class="lab"');
  const ids = [...html.slice(from, to).matchAll(/<a class="toy"[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
  return ids.filter(id => existsSync(join(ROOT, id, 'index.html')));
}

// npx puts its cache on PATH; ESM import does not search it.
export async function playwright(script) {
  try { return await import('playwright'); } catch { /* not installed here */ }
  const require = createRequire(import.meta.url);
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir.endsWith(join('node_modules', '.bin'))) continue;
    try { return require(join(dir, '..', 'playwright')); } catch { /* next entry */ }
  }
  throw new Error(`Playwright not found. Run: npx -y -p playwright@1.63.0 node tools/${script}`);
}

// The capture hides the shell and every control; layout stays as it is.
// A still uses visibility; a loop uses opacity, so buttons still take clicks.
export const hideCss = how => `
  .stim-ui, .intro, header, .bar, .about, dl.how, .how, .stim-set, .stim-sets, .stim-edge,
  footer, [data-shell] { ${how} !important; }
  .stage, .stage * { cursor: none !important; }
`;

// Pokes: what a visitor does before the shot, keyed by toy id.
// Coordinates are fractions of the stage: [0, 0] top left, [1, 1] bottom right.
//   ['click', x, y]              one tap
//   ['dblclick', x, y]           two fast taps
//   ['drag', x1, y1, x2, y2, ms] press, move for ms, release
//   ['hold', x, y, ms]           press for ms, then release
//   ['down', x, y]               press and keep the button down
//   ['up']                       release the button
//   ['move', x, y]               move the pointer, no button
//   ['glide', x1, y1, x2, y2, ms] move the pointer for ms, no button change
//   ['orbit', cx, cy, rx, ry, ms, turns, phase]
//                                the pointer runs an ellipse for ms, no button change
//   ['button', 'Name']           click a shell button by its label
//   ['key', 'Space']             press a key on the stage
//   ['keydown', 'ArrowRight']    press a key and keep it down
//   ['keyup', 'ArrowRight']      release that key
//   ['type', 'text', ms]         type text, ms between keys
//   ['wheel', x, y, dy, n]       turn the wheel by dy at a place, n times
//   ['stroke', [[x, y], ...], ms] press, move through the points for ms, release
//   ['wait', ms]                 let the scene run
const CUT = [['key', 'Space'], ['wait', 1600]];
export const POKES = {
  // Space tips the first tile.
  // The shot catches the run halfway.
  domino: [['key', 'Space'], ['wait', 550]],
  // Eight cuts with Space, then Enter pops the grid.
  soap: [...Array(8).fill(CUT).flat(), ['key', 'Enter'], ['wait', 1000]],
  // Two hammer taps crack the pane.
  glass: [['click', 0.5, 0.45], ['wait', 250], ['click', 0.3, 0.62], ['wait', 300]],
  // Three smears, then a held hand.
  // The heat fades in seconds, so the shot follows at once.
  putty: [['drag', 0.25, 0.35, 0.7, 0.4, 700], ['drag', 0.7, 0.45, 0.3, 0.6, 700], ['drag', 0.3, 0.65, 0.75, 0.7, 700], ['hold', 0.5, 0.5, 1500], ['wait', 100]],
  // Space blows a stream.
  // The wand moves through it.
  bubbles: [['key', 'Space'], ['move', 0.3, 0.6], ['move', 0.7, 0.4], ['key', 'Space'], ['move', 0.4, 0.3], ['move', 0.6, 0.7], ['wait', 1200]],
  // The boot text ends first.
  // Then one click sends a ping.
  sonar: [['wait', 5000], ['click', 0.62, 0.35], ['wait', 900]],
  // Space starts a cosmic shower.
  chamber: [['key', 'Space'], ['wait', 1300]],
  // Space adds two drops.
  // The rings need time to break up.
  ink: [['key', 'Space'], ['wait', 1500], ['key', 'Space'], ['wait', 7500]],
  // A click sets a source; the search floods out from it.
  dijkstra: [['click', 0.45, 0.45], ['wait', 2200]],
  // A held press ranges and charges; the release fires.
  // The bolt strikes the rock about ten seconds later; the shot shows the fireball.
  railgun: [['down', 0.5, 0.5], ['wait', 6500], ['up'], ['wait', 11000]],
  // T throws in two things.
  cauldron: [['key', 't'], ['wait', 900], ['key', 't'], ['wait', 1500]],
  // Two clicks fire two rings.
  // The second ring crosses the laser sheet at the shot.
  vortex: [['click', 0.5, 0.4], ['wait', 700], ['click', 0.65, 0.5], ['wait', 300]],
  // Three shells go up; a held press makes a bigger shell.
  // The shells burst about three seconds later.
  fireworks: [['hold', 0.35, 0.3, 500], ['wait', 400], ['hold', 0.65, 0.25, 800], ['wait', 300], ['click', 0.5, 0.4], ['wait', 3600]],
  // The rocket clears the pad about fourteen seconds after Launch.
  launch: [['button', 'Launch'], ['wait', 14000]],
  // The opening caption leaves and the customers arrive.
  frietkot: [['wait', 9000]],
  // H sounds the horn.
  // The ship's light answers.
  foghorn: [['key', 'h'], ['wait', 1000]],
  // The train gets up to speed along the lake.
  trainride: [['wait', 6000]],
};

// Setups: how each toy opens and how its picture is framed, keyed by toy id.
// The still and the loop share one setup, so the picture does not jump.
//   view   the viewport, [width, height] (default: VIEW)
//   query  the address query, with its question mark
//   store  localStorage entries; the page reads them when it loads
//   seed   a number; the page's random numbers then repeat on each load
//   css    a style sheet the page gets when it loads
//   first  steps before the still's pokes and before the loop's recipe
//   crop   the share of the stage's short side that the picture keeps (default: 1)
//          Above 1 the crop takes in page round the stage; `css` must match its colour.
//   at     the centre of the crop, in stage fractions (default: [0.5, 0.5])
// The tube shows the middle circle only: CIRCLE of the width.
// The subject and its action stay inside that circle.
export const SETUP = {
  // The shape scales with the stage, so the stage shrinks to zoom out.
  // The page round it takes the stage's flat colour, so no edge shows.
  morpher: { css: '.stage { transform: scale(0.72); border-radius: 0 !important; } html, body { background: var(--stage) !important; }', crop: 1 / 0.72 },
  // The bubble sheet is smaller than its stage.
  pop: { crop: 0.84, at: [0.5, 0.48] },
  // Key 5 picks the Coral bar; the default bar is random.
  // Tom: not the three-colour Layers bar.
  soap: { first: [['key', '5'], ['wait', 600]] },
  // The putty slab is a little smaller than its stage.
  putty: { crop: 0.9 },
  // The wide view: the walker stands small, left of the sun.
  walker: { crop: 0.6, at: [0.42, 0.6] },
  // Noon, so the scene shows clearly (Tom).
  // The head sits back and low: the whole window shows, with the horizon.
  window: { query: '?hour=noon&peer=0.06,-0.1,-0.14', crop: 0.92, at: [0.43, 0.48] },
  // Dark field is the Light choice in Settings; the page stores it (Tom).
  ink: { store: { 'stimming.ink.light': 'dark' } },
  // Night, so the impact lights the sky (Tom); the seed fixes the rock's path.
  // The crop holds the rock's head, where the bolt strikes it.
  railgun: { store: { 'stimming.railgun.time': '0.03' }, seed: 11, crop: 0.6, at: [0.67, 0.55] },
  // The page picks a city at random; the seed keeps one city for both pictures.
  dijkstra: { seed: 99 },
  // Noon by Lake Zurich (Tom): the ride starts past Au ZH, on the open shore.
  // With ?x= the train does not wait at a station first.
  trainride: { query: '?time=noon&x=21050' },
  // The opening glides in from far out for 6.5 s; the card, rail and clock stay off the still.
  starchart: { store: { 'stimming.starchart.star': 'sun' }, first: [['wait', 7000]], css: '.sl-card, .sl-rail, .sl-clock, .sg-emblem { display: none !important; }' },
};

export const sleep = ms => new Promise(done => setTimeout(done, ms));

// The steps stop early when the clock passes `until`.
export async function poke(page, box, steps, until = Infinity) {
  const at = (x, y) => [box.x + x * box.width, box.y + y * box.height];
  const late = () => Date.now() >= until;
  // A wait never runs past the deadline.
  const rest = ms => sleep(Math.max(0, Math.min(ms, until - Date.now())));
  // A timed path follows the clock, so its length is exact.
  const path = async (ms, spot) => {
    const start = Date.now();
    for (let t = 0; t < ms && !late(); t = Date.now() - start) {
      await page.mouse.move(...at(...spot(t / ms)));
      await sleep(12);
    }
    if (!late()) await page.mouse.move(...at(...spot(1)));
  };
  for (const [verb, ...a] of steps) {
    if (late()) break;
    if (verb === 'wait') await rest(a[0]);
    if (verb === 'move') await page.mouse.move(...at(a[0], a[1]), { steps: 8 });
    if (verb === 'click') await page.mouse.click(...at(a[0], a[1]));
    if (verb === 'dblclick') await page.mouse.dblclick(...at(a[0], a[1]));
    if (verb === 'up') await page.mouse.up();
    if (verb === 'key' || verb === 'type' || verb === 'keydown') {
      // A key needs focus on the stage, as after a visitor's click.
      await page.evaluate(() => { if (document.activeElement === document.body) document.querySelector('.stage[tabindex], .stage [tabindex]')?.focus(); });
      if (verb === 'key') await page.keyboard.press(a[0]);
      else if (verb === 'keydown') await page.keyboard.down(a[0]);
      else await page.keyboard.type(a[0], { delay: a[1] ?? 120 });
    }
    if (verb === 'keyup') await page.keyboard.up(a[0]);
    if (verb === 'button') await page.getByRole('button', { name: a[0], exact: true }).first().click();
    if (verb === 'down' || verb === 'hold') {
      await page.mouse.move(...at(a[0], a[1]));
      await page.mouse.down();
      if (verb === 'hold') { await rest(a[2] ?? 600); await page.mouse.up(); }
    }
    if (verb === 'wheel') {
      await page.mouse.move(...at(a[0], a[1]));
      for (let i = 0; i < (a[3] ?? 1) && !late(); i++) { await page.mouse.wheel(0, a[2]); await sleep(60); }
    }
    if (verb === 'stroke') {
      const pts = a[0], legs = pts.length - 1;
      await page.mouse.move(...at(...pts[0]));
      await page.mouse.down();
      // A hand starts slow, speeds up and slows down again.
      await path(a[1] ?? 500, t => {
        const e = t * t * (3 - 2 * t) * legs, i = Math.min(legs - 1, Math.floor(e)), f = e - i;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
      });
      await page.mouse.up();
    }
    if (verb === 'glide') await path(a[4] ?? 500, t => [a[0] + (a[2] - a[0]) * t, a[1] + (a[3] - a[1]) * t]);
    if (verb === 'orbit') {
      const turns = a[5] ?? 1, phase = a[6] ?? 0;
      await path(a[4] ?? 2500, t => {
        const angle = (phase + t * turns) * Math.PI * 2;
        return [a[0] + a[2] * Math.cos(angle), a[1] + a[3] * Math.sin(angle)];
      });
    }
    if (verb === 'drag') {
      const ms = a[4] ?? 500, n = Math.max(4, Math.round(ms / 16));
      await page.mouse.move(...at(a[0], a[1]));
      await page.mouse.down();
      // One step per frame, so the toy sees a real stroke.
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        await page.mouse.move(...at(a[0] + (a[2] - a[0]) * t, a[1] + (a[3] - a[1]) * t));
        await sleep(ms / n);
      }
      await page.mouse.up();
    }
  }
}

// Opens a toy page and waits for its intro to leave.
// The dev server drops connections in a burst.
// A lost file or a stuck intro gets a reload.
export async function open(page, id, root, notes) {
  const lost = [];
  page.on('requestfailed', r => { if (r.url().startsWith(root)) lost.push(r.url()); });
  for (let attempt = 1; ; attempt++) {
    lost.length = 0;
    const landed = await page.goto(`${root}/${id}/index.html${SETUP[id]?.query ?? ''}`, { waitUntil: 'load', timeout: 60000 }).then(() => true, () => false);
    // The intro removes itself when the toy is ready.
    const gone = landed && await page.waitForSelector('.intro', { state: 'detached', timeout: 30000 }).then(() => true, () => false);
    if (gone && !lost.length) break;
    if (attempt === TRIES) {
      if (!landed) throw new Error('the page did not load');
      notes.push(gone ? `lost ${lost.length} files` : 'intro stayed');
      break;
    }
    await sleep(700 * attempt);
  }
  // A WebGPU toy can send the page to its Classic build.
  if (!page.url().split('?')[0].endsWith(`/${id}/index.html`)) notes.push(`landed on ${page.url().split('/').slice(-2).join('/')}`);
}

// A toy's viewport: its own, or the shared one.
export function view(id) {
  const [width, height] = SETUP[id]?.view ?? [VIEW.width, VIEW.height];
  return { width, height };
}

// Opens a browser context in the toy's viewport, with its stored choices.
// `video` is a folder; the context then records the page into it.
export async function context(browser, id, video) {
  const viewport = view(id);
  const made = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: 'dark', ...(video ? { recordVideo: { dir: video, size: viewport } } : {}) });
  const store = SETUP[id]?.store;
  // The toy reads its stored choices when it loads.
  if (store) await made.addInitScript(all => { for (const [k, v] of all) localStorage.setItem(k, v); }, Object.entries(store));
  // The toy's own style sheet goes in as the page loads.
  if (SETUP[id]?.css) await made.addInitScript(css => {
    addEventListener('DOMContentLoaded', () => document.head.append(Object.assign(document.createElement('style'), { textContent: css })));
  }, SETUP[id].css);
  // A seeded generator stands in for Math.random, so a random pick repeats.
  if (SETUP[id]?.seed != null) await made.addInitScript(seed => {
    let a = seed >>> 0;
    Math.random = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, SETUP[id].seed);
  return made;
}

// The crop is a square in the visible stage: the largest, or the toy's share of it.
// It stays inside the stage, so the picture has no bars.
export function square(box, id) {
  const { width: vw, height: vh } = view(id), { crop = 1, at = [0.5, 0.5] } = SETUP[id] ?? {};
  const x0 = Math.max(0, box.x), y0 = Math.max(0, box.y);
  const w = Math.min(vw, box.x + box.width) - x0, h = Math.min(vh, box.y + box.height) - y0;
  const side = Math.floor(Math.min(w, h) * crop);
  // A crop larger than the stage stays centred, inside the viewport.
  const fit = (lo, len, c, view) => Math.round(side > len
    ? Math.min(Math.max(lo + len * c - side / 2, 0), view - side)
    : Math.min(Math.max(lo + len * c - side / 2, lo), lo + len - side));
  return { x: fit(x0, w, at[0], vw), y: fit(y0, h, at[1], vh), width: side, height: side };
}
