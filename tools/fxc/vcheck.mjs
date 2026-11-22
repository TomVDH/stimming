// Checks the vehicles' mesh pictures on headless ANGLE GL.
// Alpha never goes above 1, and no picture is null.
// From behind, near vehicles show faces a depth sort must hide.
// Usage: node vcheck.mjs <url with ?qa>
import { chromium } from 'file:///C:/Users/tmlns/AppData/Local/npm-cache/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=gl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 160)); });
await page.goto(process.argv[2], { waitUntil: 'commit' });
// The pictures before the meshes link: a blank, never null.
await page.waitForFunction(() => window.__qa && window.__qa.vd, null, { timeout: 300000, polling: 50 });
const early = await page.evaluate(() => ({ ready: window.__qa.vd.st.ready, nul: ['far', 'near'].some(g => [0, 1].some(s => window.__qa.vd.tex(g, s) === null)) }));
await page.waitForFunction(() => window.__qa.vd.st.ready, null, { timeout: 300000, polling: 200 });
const r = await page.evaluate(async () => {
  const q = window.__qa, T = q.traf, gl = q.env.gl;
  const nul = ['far', 'near'].flatMap(g => [0, 1].map(s => q.vd.tex(g, s) === null)).some(Boolean);
  q.trafficRun(T, 0); T.auto = true;
  // All three drive away, close: noses stand behind their cabs.
  T.veh.forEach((v, i) => { v.z = [-12, -20, -30][i]; v.dir = -1; v.t0 = 0; });
  await new Promise(res => setTimeout(res, 1500));
  // Covered pixels, and those solid: a body seen whole is solid inside, partial only at its edge.
  let max = 0, cover = 0, solid = 0;
  const fb = gl.createFramebuffer(), w = q.canvas.width, h = q.canvas.height;
  for (const g of ['far', 'near']) for (const s of [0, 1]) {
    const tex = q.vd.tex(g, s);
    q.hold(true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    // Read the whole picture row by row: the largest alpha.
    const buf = new Float32Array(w * 4);
    for (let y = 0; y < h; y += 2) { gl.readPixels(0, y, w, 1, gl.RGBA, gl.FLOAT, buf); for (let i = 3; i < buf.length; i += 4) { const a = buf[i]; max = Math.max(max, a); if (a > 0.05) cover++; if (a > 0.95) solid++; } }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    q.hold(false);
  }
  // Night: the sun down, no shadow map; the frame still draws clean.
  q.tod(21);
  await new Promise(res => setTimeout(res, 1000));
  return { nul, max, solid: +(solid / Math.max(cover, 1)).toFixed(3) };
});
console.log(JSON.stringify({ early, ...r }), errs.length ? 'console: ' + errs.slice(0, 3).join(' | ') : 'console clean');
await browser.close();
process.exit(!early.nul && !r.nul && r.max <= 1.001 && r.solid > 0.5 && !errs.length ? 0 : 1);
