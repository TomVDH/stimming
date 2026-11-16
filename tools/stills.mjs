#!/usr/bin/env node
// Captures one still per main-shelf toy for the menu's hover circle.
// Output: shared/stills/<id>.webp, 512 x 512, a square crop of the stage.
// The framing of each toy is its SETUP entry in tools/capture.mjs.
//
// Run from the repo root, with the dev server up (python3 -m http.server 8000):
//
//   npx -y -p playwright@1.63.0 node tools/stills.mjs [id ...]
//
// No ids renews every main-shelf toy. Ids renew only those toys.
// Playwright comes from the npx cache; package.json stays untouched.
// The poke table and the page helpers live in tools/capture.mjs.
// tools/loops.mjs shares them.
// cwebp must be on PATH (brew install webp).
// Never run this script and tools/loops.mjs at one time.
// Two pages of one WebGPU toy fail together and give a blank picture.
// Playwright 1.63.0 pairs with the cached chromium_headless_shell-1243.
// A different version needs: npx -y playwright@<version> install chromium
//
// Environment:
//   STILLS_BASE  page root (default: this checkout under http://localhost:8000)
//   STILLS_OUT   folder for the stills, for a trial run (default: shared/stills)
//   STILLS_TMP   folder for the raw PNG crops (default: the OS temp folder)
//   STILLS_JOBS  browsers that run at one time (default: 3)
//   STILLS_KEEP  set to 1 to keep the raw PNG crops

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { GPU, POKES, ROOT, SETTLE, SETUP, base, context as openContext, hideCss, open, playwright, poke, shelf, sleep, square } from './capture.mjs';

const OUT = process.env.STILLS_OUT || join(ROOT, 'shared', 'stills');
const TMP = process.env.STILLS_TMP || join(tmpdir(), 'stimming-stills');
const JOBS = Number(process.env.STILLS_JOBS) || 3;
const SIZE = 512, QUALITY = 72, FINE = 90, MIN_BYTES = 15 * 1024, MAX_BYTES = 50 * 1024;
const BASE = base(process.env.STILLS_BASE);
const HIDE = hideCss('visibility: hidden');

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
  const context = await openContext(browser, id);
  const page = await context.newPage();
  const notes = [];
  page.on('pageerror', e => notes.push(`error: ${e.message.split('\n')[0]}`));
  try {
    await open(page, id, BASE, notes);
    await sleep(SETTLE);
    const stage = page.locator('.stage').first();
    await stage.scrollIntoViewIfNeeded();
    const steps = [...(SETUP[id]?.first ?? []), ...(POKES[id] ?? [])];
    if (steps.length) await poke(page, await stage.boundingBox(), steps);
    await page.addStyleTag({ content: HIDE });
    await sleep(120);
    const clip = square(await stage.boundingBox(), id);
    const side = clip.width;
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

const { chromium } = await playwright('stills.mjs');
const queue = [...ids], failed = [];
// Each worker owns a browser, so its page is always in front.
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
  const browser = await chromium.launch({ headless: true, args: GPU });
  for (let id; (id = queue.shift());) if (!(await shoot(browser, id))) failed.push(id);
  await browser.close();
}));
console.log(failed.length ? `Failed: ${failed.join(', ')}` : `Done: ${ids.length} stills in ${relative(process.cwd(), OUT) || OUT}`);
process.exit(failed.length ? 1 : 0);
