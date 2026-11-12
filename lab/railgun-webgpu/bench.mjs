// Runs each variant at each count in headless Edge at 1280 x 800.
// Usage: PW=<path to playwright-core> node lab/railgun-webgpu/bench.mjs [base URL]
// Needs a static server at the base URL (default http://localhost:8013).
// Each page times bursts of 60 frames with one GPU sync per burst.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright-core');
const base = process.argv[2] || 'http://localhost:8013';
const COUNTS = (process.env.COUNTS || '2400,20000,100000,400000,1000000').split(',').map(Number);
const VARIANTS = [['gl.html', 'WebGL2 CPU step'], ['gpu.html', 'WebGPU compute'], ['gpu.html?webgl', 'TSL on WebGL2 fallback']];

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
});
const rows = [];
for (const n of COUNTS) {
  for (const [file, name] of VARIANTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    const sep = file.includes('?') ? '&' : '?';
    await page.goto(`${base}/lab/railgun-webgpu/${file}${sep}n=${n}&bench`);
    let r = null;
    try {
      await page.waitForFunction(() => window.__bench, null, { timeout: 60000 });
      r = await page.evaluate(() => window.__bench);
    } catch { /* A timeout leaves r empty. */ }
    rows.push({ variant: name, n, ...(r || {}), errors: errs.slice(0, 3) });
    console.log(name.padEnd(24), String(n).padStart(8), r ? `frame ${r.frame.toFixed(2)} ms (${r.frameMin.toFixed(2)} to ${r.frameMax.toFixed(2)}), js ${r.js.toFixed(2)} ms, ${r.label}` : 'no result', errs.length ? errs[0] : '');
    await page.close();
  }
}
const gpu = await (async () => {
  const p = await browser.newPage();
  await p.goto(`${base}/lab/railgun-webgpu/motes.js`);
  const info = await p.evaluate(async () => {
    const a = await navigator.gpu?.requestAdapter();
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return { vendor: a?.info?.vendor, arch: a?.info?.architecture, desc: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null };
  });
  await p.close();
  return info;
})();
await browser.close();
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), browser: 'Edge headless', viewport: '1280x800', gpu, rows }, null, 2) + '\n');
