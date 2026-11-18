// Renders each menu icon at rest to shared/favicons/<id>.png for toy-page favicons.
// Run after a menu icon changes: node tools/favicons.mjs [base-url] [ids...]
// The base URL serves this checkout, for example python -m http.server.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const base = process.argv[2] || 'http://127.0.0.1:8000';
const only = process.argv.slice(3);
const out = new URL('../shared/favicons/', import.meta.url);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
// The art draws at about 106 px; this scale gives a 64 px favicon.
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 0.6, reducedMotion: 'reduce' });
// The main shelf shows in ?all, the Lab in ?lab.
const done = new Set();
let made = 0;
for (const view of ['?all', '?lab']) {
  await page.goto(`${base}/${view}`);
  await page.waitForTimeout(3000);
  // Show every tile at rest: no reveal, no hover.
  await page.addStyleTag({ content: '.toy, .toy * { animation: none !important; transition: none !important; } .toy { opacity: 1 !important; transform: none !important; } html, body, body *:not(svg *) { background: transparent !important; box-shadow: none !important; }' });
  const ids = (await page.$$eval('a.toy', as => as.filter(a => a.offsetParent).map(a => a.id))).filter(id => !done.has(id) && (!only.length || only.includes(id)));
  for (const id of ids) {
    const art = await page.$(`a.toy#${id} .obj svg`);
    if (!art) continue;
    // A tile that never settles is skipped and named.
    try {
      await art.scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(60);
      await art.screenshot({ path: fileURLToPath(new URL(`${id}.png`, out)), omitBackground: true, timeout: 5000 });
      done.add(id);
      made++;
    } catch { console.log(`skipped ${id}`); }
  }
}
console.log(`${made} favicons in shared/favicons/`);
await browser.close();
