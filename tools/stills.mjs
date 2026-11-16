#!/usr/bin/env node
// Captures one still per main-shelf toy for the menu's hover circle.
// Output: shared/stills/<id>.webp, 512 x 512, a centre crop of the stage.
//
// Run from the repo root, with the dev server up (python3 -m http.server 8000):
//
//   npx -y -p playwright@1.63.0 node tools/stills.mjs [id ...]
//
// No ids renews every main-shelf toy. Ids renew only those toys.
// Playwright comes from the npx cache; package.json stays untouched.
// cwebp must be on PATH (brew install webp).
// Playwright 1.63.0 pairs with the cached chromium_headless_shell-1243.
// A different version needs: npx -y playwright@<version> install chromium
//
// Environment:
//   STILLS_BASE  page root (default: this checkout under http://localhost:8000)
//   STILLS_TMP   folder for the raw PNG crops (default: the OS temp folder)
//   STILLS_JOBS  browsers that run at one time (default: 3)
//   STILLS_KEEP  set to 1 to keep the raw PNG crops

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'shared', 'stills');
const TMP = process.env.STILLS_TMP || join(tmpdir(), 'stimming-stills');
const JOBS = Number(process.env.STILLS_JOBS) || 3;
const SIZE = 512, QUALITY = 72, FINE = 90, MIN_BYTES = 15 * 1024, MAX_BYTES = 50 * 1024;
const VIEW = { width: 1000, height: 800 };
const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-unsafe-webgpu'];
// The scene settles this long after the intro leaves.
const SETTLE = 3000;
// A page gets this many loads before the still counts as weak.
const TRIES = 3;

// A worktree sits inside the main checkout, which the server serves.
function base() {
  if (process.env.STILLS_BASE) return process.env.STILLS_BASE.replace(/\/$/, '');
  const at = ROOT.indexOf(`${sep}.worktrees${sep}`);
  const path = at < 0 ? '' : '/' + relative(ROOT.slice(0, at), ROOT).split(sep).join('/');
  return `http://localhost:8000${path}`;
}

// The main shelf is every toy link before the Lab section.
function shelf() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const from = html.indexOf('<main'), to = html.indexOf('<section class="lab"');
  const ids = [...html.slice(from, to).matchAll(/<a class="toy"[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
  return ids.filter(id => existsSync(join(ROOT, id, 'index.html')));
}

// npx puts its cache on PATH; ESM import does not search it.
async function playwright() {
  try { return await import('playwright'); } catch { /* not installed here */ }
  const require = createRequire(import.meta.url);
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir.endsWith(join('node_modules', '.bin'))) continue;
    try { return require(join(dir, '..', 'playwright')); } catch { /* next entry */ }
  }
  throw new Error('Playwright not found. Run: npx -y -p playwright@1.63.0 node tools/stills.mjs');
}

// The shot hides the shell and every control; layout stays as it is.
const HIDE = `
  .stim-ui, .intro, header, .bar, .about, dl.how, .how, .stim-set, .stim-sets, .stim-edge,
  footer, [data-shell] { visibility: hidden !important; }
  .stage, .stage * { cursor: none !important; }
`;

// Pokes: what a visitor does before the shot, keyed by toy id.
// Coordinates are fractions of the stage: [0, 0] top left, [1, 1] bottom right.
//   ['click', x, y]              one tap
//   ['drag', x1, y1, x2, y2, ms] press, move for ms, release
//   ['hold', x, y, ms]           press for ms, then release
//   ['down', x, y]               press and keep the button down for the shot
//   ['move', x, y]               move the pointer, no button
//   ['button', 'Name']           click a shell button by its label
//   ['key', 'Space']             press a key on the stage
//   ['wait', ms]                 let the scene run
const CUT = [['key', 'Space'], ['wait', 1600]];
const POKES = {
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

// Tighter crops: the share of the centred square that the still keeps.
const CROP = {
  // The bubble sheet is shorter than its stage.
  pop: 0.86,
  // The putty bar is shorter than its stage.
  putty: 0.84,
};

const sleep = ms => new Promise(done => setTimeout(done, ms));

async function poke(page, box, steps) {
  const at = (x, y) => [box.x + x * box.width, box.y + y * box.height];
  for (const [verb, ...a] of steps) {
    if (verb === 'wait') await sleep(a[0]);
    if (verb === 'move') await page.mouse.move(...at(a[0], a[1]), { steps: 8 });
    if (verb === 'click') await page.mouse.click(...at(a[0], a[1]));
    if (verb === 'key') {
      // A key needs focus on the stage, as after a visitor's click.
      await page.evaluate(() => { if (document.activeElement === document.body) document.querySelector('.stage[tabindex], .stage [tabindex]')?.focus(); });
      await page.keyboard.press(a[0]);
    }
    if (verb === 'button') await page.getByRole('button', { name: a[0], exact: true }).first().click();
    if (verb === 'down' || verb === 'hold') {
      await page.mouse.move(...at(a[0], a[1]));
      await page.mouse.down();
      if (verb === 'hold') { await sleep(a[2] ?? 600); await page.mouse.up(); }
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

// A dark still is small.
// It gets the fine quality against banding.
// A busy still steps the quality down until the file fits the budget.
function encode(png, webp) {
  const run = q => {
    execFileSync('cwebp', ['-quiet', '-q', String(q), '-m', '6', '-resize', String(SIZE), String(SIZE), png, '-o', webp]);
    return statSync(webp).size;
  };
  let q = QUALITY, bytes = run(q);
  if (bytes < MIN_BYTES) bytes = run(q = FINE);
  while (bytes > MAX_BYTES && q - 8 >= 40) bytes = run(q -= 8);
  return q;
}

async function shoot(browser, id) {
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await context.newPage();
  const notes = [];
  page.on('pageerror', e => notes.push(`error: ${e.message.split('\n')[0]}`));
  try {
    // The dev server drops connections in a burst.
    // A lost file or a stuck intro gets a reload.
    const lost = [];
    page.on('requestfailed', r => { if (r.url().startsWith(base())) lost.push(r.url()); });
    for (let attempt = 1; ; attempt++) {
      lost.length = 0;
      await page.goto(`${base()}/${id}/index.html`, { waitUntil: 'load', timeout: 60000 });
      // The intro removes itself when the toy is ready.
      const gone = await page.waitForSelector('.intro', { state: 'detached', timeout: 30000 }).then(() => true, () => false);
      if (gone && !lost.length) break;
      if (attempt === TRIES) { notes.push(gone ? `lost ${lost.length} files` : 'intro stayed'); break; }
      await sleep(700 * attempt);
    }
    // A WebGPU toy can send the page to its Classic build.
    if (!page.url().endsWith(`/${id}/index.html`)) notes.push(`landed on ${page.url().split('/').slice(-2).join('/')}`);
    await sleep(SETTLE);
    const stage = page.locator('.stage').first();
    await stage.scrollIntoViewIfNeeded();
    let box = await stage.boundingBox();
    if (POKES[id]) await poke(page, box, POKES[id]);
    await page.addStyleTag({ content: HIDE });
    await sleep(120);
    // The crop is the largest centred square in the visible stage.
    box = await stage.boundingBox();
    const x0 = Math.max(0, box.x), y0 = Math.max(0, box.y);
    const w = Math.min(VIEW.width, box.x + box.width) - x0, h = Math.min(VIEW.height, box.y + box.height) - y0;
    const side = Math.floor(Math.min(w, h) * (CROP[id] ?? 1));
    const clip = { x: Math.round(x0 + (w - side) / 2), y: Math.round(y0 + (h - side) / 2), width: side, height: side };
    const png = join(TMP, `${id}.png`), webp = join(OUT, `${id}.webp`);
    await page.screenshot({ path: png, clip });
    await page.mouse.up().catch(() => {});
    const q = encode(png, webp);
    if (!process.env.STILLS_KEEP) rmSync(png);
    const kb = (statSync(webp).size / 1024).toFixed(1);
    console.log(`${id.padEnd(10)} ${kb.padStart(5)} KB  q${q}  ${side}px${notes.length ? '  ' + notes.join('; ') : ''}`);
    return true;
  } catch (e) {
    console.log(`${id.padEnd(10)} FAILED  ${String(e.message).split('\n')[0]}${notes.length ? '  ' + notes.join('; ') : ''}`);
    return false;
  } finally {
    await context.close();
  }
}

const all = shelf(), asked = process.argv.slice(2);
const unknown = asked.filter(id => !all.includes(id));
if (unknown.length) { console.error(`Not on the main shelf: ${unknown.join(', ')}`); process.exit(1); }
const ids = asked.length ? asked : all;
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const { chromium } = await playwright();
const queue = [...ids], failed = [];
// Each worker owns a browser, so its page is always in front.
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
  const browser = await chromium.launch({ headless: true, args: GPU });
  for (let id; (id = queue.shift());) if (!(await shoot(browser, id))) failed.push(id);
  await browser.close();
}));
console.log(failed.length ? `Failed: ${failed.join(', ')}` : `Done: ${ids.length} stills in ${relative(process.cwd(), OUT) || OUT}`);
process.exit(failed.length ? 1 : 0);
