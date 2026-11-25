#!/usr/bin/env node
// Saves one share card per main-shelf toy: the og:image, 1200 x 630.
// Output: shared/cards/<id>.jpg. The card is accesslab/share-card.js, drawn by accesslab/card.html.
//
// Run from the repo root, with the dev server up (npm run dev, or python3 -m http.server 8000):
//
//   npx -y -p playwright@1.63.0 node tools/sharecards.mjs [id ...]
//
// No ids renews every main-shelf toy. Ids renew only those toys.
// Playwright comes from the npx cache; package.json stays untouched.
//
// Environment:
//   CARDS_BASE  page root (default: this checkout under http://localhost:8000)
//   CARDS_OUT   folder for the cards, for a trial run (default: shared/cards)
//   CARDS_JOBS  pages that draw at one time (default: 3)

import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, base, playwright } from './capture.mjs';

const OUT = process.env.CARDS_OUT || join(ROOT, 'shared', 'cards');
const JOBS = Number(process.env.CARDS_JOBS) || 3;
const BASE = base(process.env.CARDS_BASE);
// JPEG at this quality keeps a card near 150 KB; crawlers take JPEG everywhere.
const QUALITY = 86;

// The main shelf comes from toys.json: a card needs no toy folder, so eastvan/postcard counts too.
const toys = JSON.parse(readFileSync(join(ROOT, 'toys.json'), 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(toys).filter(id => toys[id].number != null);
mkdirSync(OUT, { recursive: true });
const { chromium } = await playwright('sharecards');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: 'dark' });

const failed = [];
let next = 0;
// Each worker takes the next id until none are left.
async function worker() {
  const page = await ctx.newPage();
  for (let id = ids[next++]; id; id = ids[next++]) {
    const file = join(OUT, `${id}.jpg`);
    try {
      await page.goto(`${BASE}/accesslab/card.html?toy=${encodeURIComponent(id)}`, { waitUntil: 'load' });
      await page.waitForSelector('html[data-ready]', { timeout: 20000 });
      const state = await page.evaluate(() => document.documentElement.dataset.ready);
      if (state !== '1') throw new Error(`card says ${state}`);
      await page.locator('#card').screenshot({ path: file, type: 'jpeg', quality: QUALITY });
      console.log(`${id}  ${Math.round(statSync(file).size / 1024)} KB`);
    } catch (e) {
      failed.push(id);
      console.error(`${id}  failed: ${/** @type {Error} */ (e).message.split('\n')[0]}`);
    }
  }
  await page.close();
}
await Promise.all(Array.from({ length: Math.min(JOBS, ids.length) }, worker));
await browser.close();
console.log(`${ids.length - failed.length} of ${ids.length} cards in ${relative(ROOT, OUT)}/`);
if (failed.length) { console.error(`Failed: ${failed.join(' ')}`); process.exitCode = 1; }
