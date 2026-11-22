// Screenshots a Cauldron page at full heat on ANGLE GL.
// Usage: node shot.mjs <url> <out.png>
import { chromium } from 'file:///C:/Users/tmlns/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=gl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('requestfailed', r => console.log('[failed]', r.url().slice(0, 120)));
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: 'commit' });
await page.waitForTimeout(35000);
const n = await page.evaluate(() => {
  const r = [...document.querySelectorAll('input[type=range]')];
  const heat = r.find(x => (x.closest('label,div')?.textContent || '').toLowerCase().includes('heat')) || r[0];
  if (!heat) return 'no slider';
  heat.value = heat.max; heat.dispatchEvent(new Event('input', { bubbles: true }));
  return 'heat ' + heat.value + ' of ' + r.length;
});
console.log(n);
await page.waitForTimeout(20000);
for (let i = 0; i < 3; i++) { await page.screenshot({ path: out.replace('.png', '-t' + i + '.png'), clip: { x: 300, y: 100, width: 680, height: 460 } }); await page.waitForTimeout(1500); }
console.log(await page.evaluate(() => { const c = document.querySelector('canvas'); const g = c && (c.getContext('webgl2')); return 'canvas ' + (c ? c.width + 'x' + c.height : 'none') + ' lost ' + (g ? g.isContextLost() : 'n/a') + ' intro ' + (document.querySelector('[class*=intro]')?.className || '-'); }));
await page.screenshot({ path: out });
await page.screenshot({ path: out.replace('.png', '-zoom.png'), clip: { x: 340, y: 230, width: 600, height: 340 } });
await browser.close();
