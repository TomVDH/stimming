// Shared parts of the capture scripts: tools/stills.mjs and tools/loops.mjs.
// Both open a main-shelf toy in headless Playwright and poke it.

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const VIEW = { width: 1000, height: 800 };
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
//   ['wait', ms]                 let the scene run
const CUT = [['key', 'Space'], ['wait', 1600]];
export const POKES = {
  // Space tips the first tile.
  // The shot catches the run halfway.
  domino: [['key', 'Space'], ['wait', 550]],
  // Key 4 picks the Layers bar; the default bar is random.
  // Eight cuts with Space, then Enter pops the grid.
  soap: [['key', '4'], ['wait', 600], ...Array(8).fill(CUT).flat(), ['key', 'Enter'], ['wait', 1000]],
  // Two hammer taps crack the pane.
  glass: [['click', 0.5, 0.45], ['wait', 250], ['click', 0.3, 0.62], ['wait', 300]],
  // Three smears, then a held hand.
  // The heat fades in seconds, so the shot follows at once.
  putty: [['drag', 0.25, 0.35, 0.7, 0.4, 700], ['drag', 0.7, 0.45, 0.3, 0.6, 700], ['drag', 0.3, 0.65, 0.75, 0.7, 700], ['hold', 0.5, 0.5, 1500], ['wait', 100]],
  // V switches to the close view.
  walker: [['key', 'v'], ['wait', 3000]],
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
  // The train leaves the station.
  // A tunnel follows at about 20 s.
  trainride: [['wait', 13000]],
};

// Tighter crops: the share of the centred square that the capture keeps.
export const CROP = {
  // The bubble sheet is shorter than its stage.
  pop: 0.86,
  // The putty bar is shorter than its stage.
  putty: 0.84,
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
    await page.goto(`${root}/${id}/index.html`, { waitUntil: 'load', timeout: 60000 });
    // The intro removes itself when the toy is ready.
    const gone = await page.waitForSelector('.intro', { state: 'detached', timeout: 30000 }).then(() => true, () => false);
    if (gone && !lost.length) break;
    if (attempt === TRIES) { notes.push(gone ? `lost ${lost.length} files` : 'intro stayed'); break; }
    await sleep(700 * attempt);
  }
  // A WebGPU toy can send the page to its Classic build.
  if (!page.url().endsWith(`/${id}/index.html`)) notes.push(`landed on ${page.url().split('/').slice(-2).join('/')}`);
}

// The crop is the largest centred square in the visible stage.
export function square(box, id) {
  const x0 = Math.max(0, box.x), y0 = Math.max(0, box.y);
  const w = Math.min(VIEW.width, box.x + box.width) - x0, h = Math.min(VIEW.height, box.y + box.height) - y0;
  const side = Math.floor(Math.min(w, h) * (CROP[id] ?? 1));
  return { x: Math.round(x0 + (w - side) / 2), y: Math.round(y0 + (h - side) / 2), width: side, height: side };
}
