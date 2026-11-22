// Renders one exact Tornado alley frame on ANGLE GL, for a same-frame check.
// Math.random has a fixed seed; the clock steps 1/60 s per frame.
// Three vehicles stand in place: one far and two near, or all three near ('near').
// Usage: node same.mjs <url with ?qa&buildup=0> <out-prefix> [frames] [near]
// It writes <out>.raw (RGBA rows, bottom first), <out>.json (size) and <out>.png.
// The repo's pinned Playwright 1.63.0, from the npx cache: its headless shell runs main on ANGLE GL; Edge's does not.
import { chromium } from 'file:///C:/Users/tmlns/AppData/Local/npm-cache/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const [url, out, frames, scene] = process.argv.slice(2);
const init = ([N, near]) => {
  let a = 12345;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 0, n = -1;
  performance.now = () => now;
  const raf = window.requestAnimationFrame.bind(window);
  let queue = [];
  let ready = 0;
  const tick = () => {
    // The funnel links on a timer: the frames wait for it, then 3 s more for late parts.
    if (window.__qa && n < 0) {
      if (!window.__qa.fun.prog) { raf(tick); return; }
      if (!ready) ready = Date.now();
      if (Date.now() - ready < 3000) { raf(tick); return; }
    }
    now += 1000 / 60;
    const q = queue;
    queue = [];
    if (window.__qa && n < 0) {
      // The vehicles, all under way.
      const T = window.__qa.traf;
      window.__qa.trafficRun(T, 0);
      T.auto = true;
      // After N frames the near set stands 35 to 55 m out.
      const z = near ? [-50 - 34 * N / 60, -5, -20] : [-320, -24, -46];
      T.veh.forEach((v, i) => { v.z = z[i]; v.t0 = 0; });
      n = 0;
    }
    if (n >= N) { queue = q; return; }
    for (const cb of q) cb(now);
    if (n >= 0 && ++n === N) {
      // Read the frame in the task that drew it: the buffer is still whole.
      const c = document.querySelector('canvas'), gl = c.getContext('webgl2');
      const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const px = new Uint8Array(c.width * c.height * 4);
      gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      window.__shot = { w: c.width, h: c.height, px };
      return;
    }
    raf(tick);
  };
  window.requestAnimationFrame = cb => { queue.push(cb); if (queue.length === 1) raf(tick); return 0; };
};
const browser = await chromium.launch({ headless: true, args: ['--use-angle=gl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 200)); });
await page.addInitScript(init, [Number(frames || 60), scene === 'near']);
await page.goto(url, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__shot, null, { timeout: 600000, polling: 500 });
const shot = await page.evaluate(() => {
  const { w, h, px } = window.__shot;
  // The PNG, top row first.
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  g.putImageData(img, 0, 0);
  let s = '';
  for (let i = 0; i < px.length; i += 0x8000) s += String.fromCharCode.apply(null, px.subarray(i, i + 0x8000));
  return { w, h, raw: btoa(s), png: c.toDataURL('image/png').split(',')[1] };
});
writeFileSync(out + '.raw', Buffer.from(shot.raw, 'base64'));
writeFileSync(out + '.png', Buffer.from(shot.png, 'base64'));
writeFileSync(out + '.json', JSON.stringify({ w: shot.w, h: shot.h }));
console.log('frame', shot.w, 'x', shot.h);
await browser.close();
