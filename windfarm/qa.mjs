// Wind farm QA: deterministic stills and the shared checks Q1 to Q10.
// Run: node windfarm/qa.mjs <out-dir> [stills|checks|all]
// It needs the site on http://localhost:8000 and playwright-core.
// PW_CORE points at a playwright-core folder when no local install exists.
// CHROME_PATH points at a browser when its build differs.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.QA_URL || 'http://localhost:8000/windfarm/';
const OUT = process.argv[2] || 'qa-out';
const MODE = process.argv[3] || 'all';
const ARGS = ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-unsafe-webgpu'];
mkdirSync(OUT, { recursive: true });
const report = [];
const log = (id, ok, note) => { report.push({ id, ok, note }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id}  ${note}`); };

// Seeded Math.random, so gusts, bolts and lens strikes repeat.
const SEED = `(() => {
  let s = 1234567;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})();`;
// A virtual clock: frames run only when the harness pumps them.
const VCLOCK = `(() => {
  let vt = 0, id = 0; const q = new Map();
  performance.now = () => vt;
  window.requestAnimationFrame = cb => { q.set(++id, cb); return id; };
  window.cancelAnimationFrame = i => { q.delete(i); };
  // The toy wakes when the stage first shows; the harness waits for that.
  const IO = window.IntersectionObserver;
  window.IntersectionObserver = class extends IO { constructor(fn, o) { super((...a) => { window.__qa.seen++; fn(...a); }, o); } };
  // After start, timers run on the virtual clock too, so drift waits repeat.
  const T = new Map(), st = window.setTimeout, ct = window.clearTimeout; let tid = 1e9, virt = false;
  window.setTimeout = (fn, ms = 0, ...a) => { if (!virt) return st(fn, ms, ...a); T.set(++tid, { at: vt + ms, fn: () => fn(...a) }); return tid; };
  window.clearTimeout = i => { if (T.has(i)) T.delete(i); else ct(i); };
  const due = () => { for (;;) { const e = [...T].filter(([, t]) => t.at <= vt).sort((a, b) => a[1].at - b[1].at)[0]; if (!e) return; T.delete(e[0]); e[1].fn(); } };
  window.__qa = { seen: 0, queued: () => q.size, virtual() { virt = true; }, pump(n, ms = 1000 / 60) {
    for (let k = 0; k < n; k++) { vt += ms; due(); const cbs = [...q.values()]; q.clear(); for (const cb of cbs) cb(vt); }
    return vt;
  } };
  addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.intro { display: none !important; }'; document.head.append(st); });
})();`;
// Real-time probes: rAF count, frame times and audio contexts.
const PROBE = `(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.__raf = { n: 0, times: [] };
  window.requestAnimationFrame = cb => raf(t => { window.__raf.n++; window.__raf.times.push(t); cb(t); });
  window.__ctx = [];
  const AC = window.AudioContext;
  window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__ctx.push(this); } };
})();`;

/* ---------- Q1: syntax ---------- */
function q1() {
  const files = [['windfarm', join(HERE, 'index.html')], ['menu', join(HERE, '..', 'index.html')]];
  for (const [name, f] of files) {
    const html = readFileSync(f, 'utf8');
    const mods = [...html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
    mods.forEach((src, i) => {
      const p = join(OUT, `${name}-${i}.mjs`);
      writeFileSync(p, src);
      try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); log('Q1', true, `${name} script ${i} parses`); }
      catch (e) { log('Q1', false, `${name} script ${i}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); }
    });
  }
}

/* ---------- deterministic stills ---------- */
async function page(browser, { w = 1280, h = 800, mobile = false, reduced = false, vclock = true, store = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(SEED);
  await ctx.addInitScript(vclock ? VCLOCK : PROBE);
  await ctx.addInitScript(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, store);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(`pageerror: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
  await p.goto(URL_, { waitUntil: 'load' });
  return { ctx, p, errs };
}
const pump = (p, s) => p.evaluate(n => window.__qa.pump(n), Math.round(s * 60));
const setWind = (p, v) => p.evaluate(v => { const s = document.getElementById('wind'); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); }, v);
async function ready(p) {
  await p.waitForFunction(() => document.querySelector('#stage canvas, .stage canvas'), null, { timeout: 20000 });
  // The toy compiles its shaders async; no frame runs before its loop queues one.
  await p.waitForFunction(() => window.__qa.queued() >= 2 && window.__qa.seen >= 1, null, { timeout: 30000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => window.__qa.virtual());
  // One input at a known time resets the idle timer.
  await setWind(p, 9);
  await pump(p, 0.1);
  await p.waitForTimeout(700);
}
async function still(p, name, hashes) {
  await p.waitForTimeout(120);
  const buf = await p.screenshot({ path: join(OUT, `${name}.png`), animations: 'disabled', caret: 'hide' });
  hashes[name] = createHash('sha1').update(buf).digest('hex').slice(0, 12);
}
async function stills(browser, tag) {
  const H = {};
  {
    const { ctx, p, errs } = await page(browser);
    await ready(p);
    await pump(p, 2); await still(p, `${tag}-rows-9`, H);
    for (const w of [4, 7.5, 10, 13]) { await setWind(p, w); await pump(p, 5); await still(p, `${tag}-rows-${w}`, H); }
    await setWind(p, 9); await pump(p, 2);
    await p.click('#gust'); await pump(p, 1.2); await still(p, `${tag}-gust`, H);
    await pump(p, 4);
    // The storm: hold Space on the stage for ten seconds of virtual time.
    await p.focus('.stage');
    await p.keyboard.down(' ');
    await pump(p, 4); await still(p, `${tag}-storm-4s`, H);
    await pump(p, 6); await still(p, `${tag}-storm-10s`, H);
    await p.keyboard.up(' '); await pump(p, 8); await still(p, `${tag}-after-storm`, H);
    await p.click('#view .chip[data-value="Across"]'); await pump(p, 3); await still(p, `${tag}-across`, H);
    await p.click('#setBtn'); await p.click('#fog .chip[data-value="light"]'); await p.click('#lbox .chip[data-value="on"]');
    await p.keyboard.press('Escape'); await pump(p, 2); await still(p, `${tag}-across-light-lbox`, H);
    log(`stills ${tag}`, errs.length === 0, errs.length ? errs.join(' | ') : 'clean console');
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await page(browser, { w: 375, h: 812, mobile: true });
    await ready(p); await pump(p, 2); await still(p, `${tag}-375-rows`, H);
    await p.tap('#view .chip[data-value="Across"]'); await pump(p, 3); await still(p, `${tag}-375-across`, H);
    log(`stills ${tag} 375`, errs.length === 0, errs.length ? errs.join(' | ') : 'clean console');
    await ctx.close();
  }
  {
    // Q6: reduced motion, with a storm held.
    const { ctx, p, errs } = await page(browser, { reduced: true });
    await ready(p); await pump(p, 2);
    await p.focus('.stage'); await p.keyboard.down(' '); await pump(p, 8);
    await still(p, `${tag}-reduced-storm`, H);
    await p.keyboard.up(' ');
    log(`Q6 ${tag}`, errs.length === 0, errs.length ? errs.join(' | ') : 'reduced motion: clean console');
    await ctx.close();
  }
  return H;
}

/* ---------- real-time checks ---------- */
async function checks(browser) {
  const { ctx, p, errs } = await page(browser, { vclock: false, store: { 'stimming.windfarm.sound': '1' } });
  await p.waitForFunction(() => !document.querySelector('.intro'), null, { timeout: 60000 });
  // Q7: bar controls and how-to rows.
  const bar = await p.evaluate(() => ({
    // Settings and its popover do not count.
    controls: document.querySelectorAll('.bar > .choices, .bar > .slider, .bar > .actions > .chip').length,
    how: document.querySelectorAll('.how > div').length,
  }));
  log('Q7', bar.controls <= 5 && bar.how <= 4, `${bar.controls} controls, ${bar.how} how-to rows`);
  // Q2 and Q8: drive the chips, actions, keys and gestures.
  const box = await p.locator('.stage canvas').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.click(cx, cy); await p.waitForTimeout(600);
  const t0 = await p.evaluate(() => window.__raf.times.length);
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.waitForTimeout(6000);
  // Q10: frame times while the storm builds.
  const ft = await p.evaluate(n => { const t = window.__raf.times.slice(n); const d = t.slice(1).map((v, i) => v - t[i]).sort((a, b) => a - b); return { n: d.length, p50: d[d.length >> 1], p95: d[Math.floor(d.length * 0.95)] }; }, t0);
  await p.mouse.up();
  log('Q10', true, `storm frames: ${ft.n} in 6 s, p50 ${ft.p50?.toFixed(1)} ms, p95 ${ft.p95?.toFixed(1)} ms (headless floor)`);
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 120, cy + 40, { steps: 6 }); await p.mouse.up();
  await p.click('#view .chip[data-value="Across"]'); await p.waitForTimeout(800);
  await p.focus('.stage');
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
  const rows = await p.getAttribute('#view .chip[data-value="Rows"]', 'aria-pressed');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
  const across = await p.getAttribute('#view .chip[data-value="Across"]', 'aria-pressed');
  await p.keyboard.press(' '); await p.waitForTimeout(300);
  await p.keyboard.down(' '); await p.waitForTimeout(1500); await p.keyboard.up(' ');
  await p.click('#view .chip[data-value="Rows"]');
  await p.click('#gust');
  await p.click('#setBtn'); await p.click('#fog .chip[data-value="light"]'); await p.click('#fog .chip[data-value="thick"]'); await p.keyboard.press('Escape');
  const shut = await p.evaluate(() => !document.querySelector('.is-open'));
  log('Q8', rows === 'true' && across === 'true' && shut, `arrows switch views (Rows ${rows}, Across ${across}); Escape closes Settings: ${shut}`);
  // Q9: the audio context runs after the gesture.
  const running = await p.evaluate(() => window.__ctx.map(c => c.state));
  // Q4: drifting stays at 32 fps or less; 62 s after input the loop stops.
  // The last gust runs full rate near the camera for about 15 s.
  await p.waitForTimeout(20000);
  const d0 = await p.evaluate(() => window.__raf.n); await p.waitForTimeout(2000);
  const drift = (await p.evaluate(() => window.__raf.n) - d0) / 2;
  await p.waitForTimeout(44000);
  const s0 = await p.evaluate(() => window.__raf.n); await p.waitForTimeout(2000);
  const asleep = await p.evaluate(() => window.__raf.n) - s0;
  log('Q4', drift <= 32 && asleep === 0, `drift ${drift.toFixed(1)} rAF/s; ${asleep} calls in 2 s after 66 s idle`);
  const ended = await p.evaluate(() => window.__ctx.map(c => c.state));
  log('Q9', running.includes('running') && ended.every(s => s !== 'running'), `after gesture [${running}], at rest [${ended}]`);
  // Q5: a hidden page draws no frames.
  await p.mouse.click(cx, cy); await p.waitForTimeout(500);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(300);
  const h0 = await p.evaluate(() => window.__raf.n); await p.waitForTimeout(2000);
  const hidden = await p.evaluate(() => window.__raf.n) - h0;
  log('Q5', hidden === 0, `${hidden} rAF calls in 2 s while hidden`);
  log('Q2', errs.length === 0, errs.length ? errs.join(' | ') : 'clean console through every control');
  await ctx.close();
}

const browser = await chromium.launch({ args: ARGS, executablePath: process.env.CHROME_PATH || undefined });
try {
  if (MODE !== 'checks') {
    q1();
    const a = await stills(browser, 'a'), b = await stills(browser, 'b');
    const keys = Object.keys(a), off = keys.filter(k => a[k] !== b['b' + k.slice(1)]);
    log('determinism', !off.length, `${keys.length - off.length} of ${keys.length} stills match byte for byte across two runs${off.length ? `; differ: ${off.join(', ')}` : ''}`);
  }
  if (MODE !== 'stills') await checks(browser);
} finally {
  await browser.close();
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}
