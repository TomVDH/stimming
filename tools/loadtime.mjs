// Measures one page: a cold load in a new context, then a warm reload.
// Run: npx -y -p playwright@1.63.0 node measure.mjs <base> <path> [menu|toy] [out.json]
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

async function playwright() {
  try { return await import('playwright'); } catch {}
  const require = createRequire(import.meta.url);
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir.endsWith(join('node_modules', '.bin'))) continue;
    try { return require(join(dir, '..', 'playwright')); } catch {}
  }
  throw new Error('no playwright');
}
const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-unsafe-webgpu'];
const [base, path, kind = 'toy', out] = process.argv.slice(2);
const { chromium } = await playwright();
const browser = await chromium.launch({ headless: true, args: GPU });
// slow4g is Chrome's slow 4G. local4g is the same link for the local server:
// that server sends no gzip, so the link is four times as wide to match Pages.
const NET = { slow4g: [150, 1.6e6 / 8, 750e3 / 8], local4g: [150, 4 * 1.6e6 / 8, 750e3 / 8], fast4g: [60, 9e6 / 8, 9e6 / 8] }[process.env.NET || ''];
const CPU = +(process.env.CPU || 1);
const VIDEO = process.env.VIDEO || '';
const VIEW = process.env.VIEW ? process.env.VIEW.split('x').map(Number) : [1280, 800];
const viewport = { width: VIEW[0], height: VIEW[1] };
const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: 'dark', ...(VIDEO ? { recordVideo: { dir: VIDEO, size: viewport } } : {}) });

// The page stamps its own events, so no poll from outside skews them.
await ctx.addInitScript(() => {
  const ev = (window.__ev = {});
  const stamp = (k) => { if (!(k in ev)) ev[k] = Math.round(performance.now()); };
  window.__long = [];
  try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch {}
  window.__errs = [];
  addEventListener('error', e => window.__errs.push(String(e.message)));
  const check = () => {
    const root = document.documentElement;
    if (document.body) stamp('body');
    if (document.querySelector('.title, .intro')) stamp('firstShell');
    // Menu.
    if (root.dataset.clock) stamp('clockOn');
    const face = document.querySelector('.clock-face');
    if (face?.hasAttribute('data-tube')) stamp('tubeReady');
    if (face?.hasAttribute('data-blink')) stamp('blink');
    const dozen = [...document.querySelectorAll('main > .shelf > li:not([data-out])')].slice(0, 12);
    if (root.dataset.clock && dozen.length === 12) {
      if (dozen.some(li => !li.hasAttribute('data-hold'))) stamp('firstToy');
      if (dozen.every(li => !li.hasAttribute('data-hold'))) stamp('lastToy');
    }
    if (document.querySelector('.credit[data-mesh]')) stamp('mesh');
    if (window.gsap) stamp('gsap');
    // Toy.
    const intro = document.querySelector('.intro');
    if (intro) stamp('introSeen');
    if (intro?.classList.contains('is-live')) stamp('introLive');
    if (ev.introSeen && !intro) stamp('introGone');
    if (root.dataset.stage) stamp('stage:' + root.dataset.stage);
    if (document.querySelector('.stim-ui') && !document.querySelector('.stim-ui[data-wait]') && ev.introGone) stamp('barIn');
  };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true });
  // Frames that come later than 50 ms show a stall.
  window.__gaps = [];
  let prev = 0;
  const loop = (t) => { if (prev && t - prev > 50) window.__gaps.push([Math.round(prev), Math.round(t - prev)]); prev = t; check(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  document.addEventListener('DOMContentLoaded', () => stamp('dcl'));
  addEventListener('load', () => stamp('load'));
  document.fonts?.ready.then(() => stamp('fontsReady'));
});

const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (NET) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: NET[0], downloadThroughput: NET[1], uploadThroughput: NET[2] }); }
if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
const logs = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
page.on('pageerror', e => logs.push('pageerror: ' + String(e).slice(0, 160)));

async function run(label) {
  logs.length = 0;
  const t0 = Date.now();
  await page.goto(base + path, { waitUntil: 'commit' });
  const done = kind === 'menu'
    ? () => !!window.__ev.lastToy && (!!window.__ev.mesh || performance.now() > 6000)
    : () => !!window.__ev.introGone;
  let timedOut = false;
  await page.waitForFunction(done, null, { timeout: 120000 }).catch(() => { timedOut = true; });
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource').map(r => ({
      url: r.name.replace(location.origin, '').slice(0, 110), type: r.initiatorType,
      start: Math.round(r.startTime), end: Math.round(r.responseEnd), kb: +(r.transferSize / 1024).toFixed(1), body: +(r.decodedBodySize / 1024).toFixed(1),
    }));
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]));
    const marks = Object.fromEntries(performance.getEntriesByType('mark').map(m => [m.name, Math.round(m.startTime)]));
    return {
      nav: { ttfb: Math.round(nav.responseStart), htmlEnd: Math.round(nav.responseEnd), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), htmlKb: +(nav.transferSize / 1024).toFixed(1), htmlBody: +(nav.decodedBodySize / 1024).toFixed(1) },
      paint, marks, ev: window.__ev, long: window.__long, gaps: window.__gaps, errs: window.__errs, res,
    };
  });
  const long = data.long.filter(([, d]) => d >= 50);
  const sum = {
    label, wallMs: Date.now() - t0, timedOut,
    nav: data.nav, paint: data.paint, marks: data.marks, ev: data.ev,
    longTasks: { n: long.length, total: long.reduce((a, [, d]) => a + d, 0), worst: long.sort((a, b) => b[1] - a[1]).slice(0, 5) },
    gaps: data.gaps.slice(0, 30),
    requests: data.res.length, transferKb: +data.res.reduce((a, r) => a + r.kb, data.nav.htmlKb).toFixed(0),
    slowest: [...data.res].sort((a, b) => b.end - a.end).slice(0, 6).map(r => `${r.end}ms ${r.kb}kb ${r.url}`),
    biggest: [...data.res].sort((a, b) => b.body - a.body).slice(0, 8).map(r => `${r.body}kb(${r.kb} wire) ${r.start}-${r.end}ms ${r.url}`),
    logs: [...logs], errs: data.errs,
  };
  return { sum, res: data.res };
}

const cold = await run('cold');
const warm = process.env.COLD_ONLY ? { sum: null } : await run('warm');
await ctx.close();
await browser.close();
const result = { url: base + path, cold: cold.sum, warm: warm.sum, coldRes: cold.res };
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
const { coldRes, ...print } = result;
console.log(JSON.stringify(print, null, 1));
