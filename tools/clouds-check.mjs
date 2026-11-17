#!/usr/bin/env node
// Checks the railgun's clouds and storms against fixed stills and a golden set.
// Plan: docs/plans/railgun-clouds-review.md, sections 6 and 8. Rig: docs/qa/railgun-clouds/README.md.
//
// Run from the repo root:
//
//   npx -y -p playwright@1.63.0 node tools/clouds-check.mjs [options]
//
// Options:
//   --update-golden  write the matrix as the new golden set (only after Tom approves the look)
//   --try <name>     apply a test change to the served page only; names: lobe
//   --out <dir>      folder for the stills and report.md (default: a new folder in the OS temp folder)
//
// The script serves this checkout on a free port; no dev server is needed.
// Patches change only the served copy; the files on disk never change.
// Exit code: 0 when every check passes, 1 when a check fails, 2 when the harness fails.

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GPU, ROOT, playwright } from './capture.mjs';

const args = process.argv.slice(2);
const arg = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const UPDATE = args.includes('--update-golden');
const TRY = arg('--try');
const OUT = arg('--out') || join(tmpdir(), `clouds-check-${Date.now()}`);
const GOLD = join(ROOT, 'docs/qa/railgun-clouds/golden');

// The matrix: two frames, and suns as Time slider values.
const WIDE = { width: 1280, height: 800 }, PHONE = { width: 375, height: 812 };
const SUNS = [0.05, 0.2, 0.36, 0.5, 0.72, 1.0];
const PHONE_SUNS = [0.36, 0.5];
// The probes run at blue hour, the first look and noon.
const PROBE_SUNS = [0.2, 0.5, 1.0];
// Each still: the rock at fall 0.45, the sim clock at 15 s, then 0.2 s of run.
const STILL = { fall: 0.45, t: 15 };

// Thresholds, calibrated on main at 649313f3 (2026-11-16).
// px: a pixel counts as changed past this channel difference, out of 255.
// bounds, steps, gold: the most changed share of the storm mask.
// visible: the fewest storm pixels in the wide frame at the first look.
// flags: the most pixels where cloud may touch a bound.
// mask: a storm pixel differs from the stormless frame past this; bloom stays under it.
const T = { px: 15, mask: 10, flags: 20, steps: 0.03, gold: 0.02, visible: 2500 };

// Served-page patches. A missing anchor stops the run: the code moved, so update the patch.
const steps = k => [
  { file: 'storms', re: /float dt = \(t1 - t0\) \/ ([\d.]+);/, to: (m, n) => `float dt = (t1 - t0) / ${(+n * k).toFixed(1)};` },
  { file: 'storms', re: /for \(int i = 0; i < (\d+); i\+\+\) \{/, to: (m, n) => `for (int i = 0; i < ${+n * k}; i++) {` },
];
// The bound flags: the shader marks a ray whose cloud touches a bound.
// Green: the card's edge. Magenta: the cylinder's wall. Blue: the top cut.
// The check compares each flag still with the same still unflagged.
function flagPatches() {
  const html = readFileSync(join(ROOT, MAIN), 'utf8');
  const card = html.match(/vec2 uv = position\.xy \* vec2\(([\d.]+), ([\d.]+)\) - vec2\(0\.0, ([\d.]+)\);'\)/);
  if (!card) throw new Harness('the storm card line moved; update flagPatches() in tools/clouds-check.mjs');
  const [X, Y, B] = card.slice(1).map(Number), f = v => v.toFixed(3);
  return [
    { file: 'storms', re: /(\n)(vec4 marchStorm\()/, to: (m, n, v) => `${n}float gClip;\n${v}` },
    { file: 'storms', re: /(float Tc = 1\.0, t = t0 \+ dt \* jit;)/, to: (m, v) => `${v} gClip = 0.0;` },
    { file: 'storms', re: /(\n(\s*)float gap, d = dens\(p, true, gap\);)/, to: (m, v, sp) => `${v}\n${sp}if (i == 0 && d > 0.05) gClip = 1.0;` },
    { file: 'storms', re: /if \(p\.y > sTop \+ ([\d.]+) && rd\.y > 0\.0\) break;/, to: (m, n) => `if (p.y > sTop + ${n} && rd.y > 0.0) { if (densL(p) > 0.05) gClip = 2.0; break; }` },
    { file: 'index', re: /(\n(\s*)gl_FragColor = vec4\(col, a\);)(\n\s*\/\/ The depth of the first cloud on the ray)/, to: (m, v, sp, rest) =>
      `${v}\n${sp}float qaEdge = min(${f(X)} - abs(vUv.x), min(vUv.y + ${f(B)}, ${f(Y - B)} - vUv.y));\n${sp}if (a > 0.1 && qaEdge < ${f(0.012 * Y)}) gl_FragColor = vec4(0.0, 60.0, 0.0, 1.0);\n${sp}if (gClip > 1.5) gl_FragColor = vec4(0.0, 0.0, 60.0, 1.0); else if (gClip > 0.5) gl_FragColor = vec4(60.0, 0.0, 60.0, 1.0);${rest}` },
  ];
}
// Test changes: each one must make a check fail.
const TRIES = {
  // The ambient session's lobed anvil: it grows past the card.
  lobe: [{ file: 'storms', re: /float fan = min\(mix\(sR1, sR2, k\) - abs\(uv\.x\), min\(uv\.y \+ sR1, sLen \+ sR2 \* 0\.4 - uv\.y\)\);/, to: () => 'float fan = min(mix(sR1, sR2, k) * 1.5 + 2.5 * sin(uv.y * 0.9 + sSeed) - abs(uv.x), min(uv.y + sR1, sLen * 1.3 + sR2 * 0.4 - uv.y));' }],
};

class Harness extends Error {}
// The toy's source; the page loads its bundle, railgun/dist/main.js.
const MAIN = 'railgun/src/main.ts';
const sha = f => createHash('sha1').update(readFileSync(join(ROOT, f))).digest('hex').slice(0, 7);

async function freePort() {
  return new Promise(res => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}

async function serve() {
  const port = await freePort();
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${url}/railgun/storms.js`)).ok) return { url, proc }; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill();
  throw new Harness('the static server did not start');
}

// One page load with its patches; it waits for the shaders to build.
async function load(browser, url, view, patches) {
  const ctx = await browser.newContext({ viewport: view, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [], missing = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  if (patches.length) {
    await page.route(/\/railgun\/(dist\/main\.js|storms\.js)(\?[^/]*)?$/, async route => {
      const file = /storms\.js/.test(route.request().url()) ? 'storms' : 'index';
      // A request cut short by a closing page must not stop the run.
      try {
        const r = await route.fetch();
        let body = await r.text();
        for (const p of patches.filter(q => q.file === file)) {
          if (!p.re.test(body)) { missing.push(`${file}: ${p.re.source.slice(0, 50)}`); continue; }
          body = body.replace(p.re, p.to);
        }
        await route.fulfill({ response: r, body });
      } catch { await route.continue().catch(() => {}); }
    });
  }
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* storage off */ } });
  await page.goto(`${url}/railgun/?sleep=999999&dev`);
  await page.waitForFunction(() => window.__qa && window.__qa.still && window.__qa.stormSolo, null, { timeout: 60000 })
    .catch(() => { throw new Harness(`the toy did not start: ${errs.slice(0, 3).join(' | ') || 'no __qa.still'}`); });
  await page.evaluate(() => window.__qa.freeze(true));
  await page.waitForTimeout(7000);
  if (missing.length) throw new Harness(`a patch anchor is missing, so the code moved; update tools/clouds-check.mjs:\n  ${missing.join('\n  ')}`);
  return { ctx, page, errs };
}

// solo: null for every storm, -1 for none, k for storm k alone.
async function shot(page, sun, solo = null, jpg = false) {
  return page.evaluate(({ sun, solo, jpg, still }) => {
    const qa = window.__qa;
    qa.stormSolo(solo);
    qa.still({ ...still, sun });
    qa.run(0.2);
    const cv = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return { png: cv.toDataURL('image/png'), jpg: jpg ? cv.toDataURL('image/jpeg', 0.95) : null };
  }, { sun, solo, jpg, still: STILL });
}

const tag = s => `s${String(Math.round(s * 100)).padStart(3, '0')}`;
const saveTo = (path, url) => writeFileSync(path, Buffer.from(url.split(',')[1], 'base64'));
const save = (name, url) => saveTo(join(OUT, name), url);

// Pixel work runs in a blank page: the browser decodes PNG and JPEG for free.
const ANALYSIS = () => {
  window.IM = {};
  window.put = async (name, url) => {
    const bm = await createImageBitmap(await (await fetch(url)).blob());
    const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d');
    g.drawImage(bm, 0, 0);
    IM[name] = g.getImageData(0, 0, bm.width, bm.height);
  };
  const same = (a, b) => a.width === b.width && a.height === b.height;
  // Pixels where two stills differ past thr, grown by r pixels.
  window.mask = (na, nb, thr, r) => {
    const a = IM[na], b = IM[nb], w = a.width, h = a.height, m = new Uint8Array(w * h);
    if (!same(a, b)) return null;
    for (let i = 0; i < w * h; i++) {
      const j = i * 4;
      if (Math.max(Math.abs(a.data[j] - b.data[j]), Math.abs(a.data[j + 1] - b.data[j + 1]), Math.abs(a.data[j + 2] - b.data[j + 2])) > thr) m[i] = 1;
    }
    if (!r) return m;
    const o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < w && Y < h) o[Y * w + X] = 1;
      }
    }
    return o;
  };
  window.M = {};
  window.keep = (name, na, nb, thr, r) => { M[name] = mask(na, nb, thr, r); return M[name] ? M[name].reduce((s, v) => s + v, 0) : -1; };
  window.full = (name, ref) => { M[name] = new Uint8Array(IM[ref].width * IM[ref].height).fill(1); return M[name].length; };
  window.union = (name, ...ns) => { const ms = ns.map(n => M[n]); M[name] = ms[0].map((v, i) => (ms.some(m => m[i]) ? 1 : 0)); return M[name].reduce((s, v) => s + v, 0); };
  // Pixels the bound flags marked, against the same still without flags.
  // Green rises on the card edge, red and blue on the wall, blue on the top cut.
  window.flags = (na, nb) => {
    const d = IM[na].data, e = IM[nb].data, n = { card: 0, wall: 0, top: 0 };
    if (!same(IM[na], IM[nb])) return { card: -1, wall: -1, top: -1 };
    for (let j = 0; j < d.length; j += 4) {
      const r = d[j] - e[j], g = d[j + 1] - e[j + 1], b = d[j + 2] - e[j + 2];
      if (g > 60 && g > r + 30 && g > b + 30) n.card++;
      else if (r > 60 && b > 60 && g < Math.min(r, b) - 30) n.wall++;
      else if (b > 60 && b > r + 30 && b > g + 30) n.top++;
    }
    return n;
  };
  // A 3 x 3 box blur, so a step's jitter does not count as a change.
  const blur = im => {
    const w = im.width, h = im.height, s = im.data, o = new Float32Array(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
      let t = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < w && Y < h) { t += s[(Y * w + X) * 4 + c]; n++; }
      }
      o[(y * w + x) * 3 + c] = t / n;
    }
    return o;
  };
  // The share of mask pixels where two blurred stills differ past px.
  window.fracB = (na, nb, mn, px) => {
    const a = IM[na], b = IM[nb], m = M[mn];
    if (!same(a, b)) return { err: `size ${a.width}x${a.height} against ${b.width}x${b.height}` };
    const A = blur(a), B = blur(b);
    let n = 0, d = 0;
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      n++;
      if (Math.max(Math.abs(A[i * 3] - B[i * 3]), Math.abs(A[i * 3 + 1] - B[i * 3 + 1]), Math.abs(A[i * 3 + 2] - B[i * 3 + 2])) > px) d++;
    }
    return { share: n ? d / n : 0, n };
  };
  // The share of mask pixels where two stills differ past px.
  window.frac = (na, nb, mn, px) => {
    const a = IM[na], b = IM[nb], m = M[mn];
    if (!same(a, b)) return { err: `size ${a.width}x${a.height} against ${b.width}x${b.height}` };
    let n = 0, d = 0;
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      n++;
      const j = i * 4;
      if (Math.max(Math.abs(a.data[j] - b.data[j]), Math.abs(a.data[j + 1] - b.data[j + 1]), Math.abs(a.data[j + 2] - b.data[j + 2])) > px) d++;
    }
    return { share: n ? d / n : 0, n };
  };
  // OKLCH of the storm pixels: the lit third, and the lightness spread.
  window.colour = (na, mn) => {
    const a = IM[na], m = M[mn], px = [];
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      const j = i * 4, r = lin(a.data[j]), g = lin(a.data[j + 1]), b = lin(a.data[j + 2]);
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
      const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      px.push([0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s]);
    }
    if (px.length < 50) return null;
    px.sort((p, q) => p[0] - q[0]);
    const q = f => px[Math.min(px.length - 1, Math.floor(f * px.length))][0];
    const lit = px.slice(Math.floor(px.length * 0.7));
    const A = lit.reduce((s, p) => s + p[1], 0) / lit.length, B = lit.reduce((s, p) => s + p[2], 0) / lit.length;
    const C = lit.reduce((s, p) => s + Math.hypot(p[1], p[2]), 0) / lit.length;
    const h = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
    return { L: +(lit.reduce((s, p) => s + p[0], 0) / lit.length).toFixed(3), C: +C.toFixed(3), h: Math.round(h), p5: +q(0.05).toFixed(3), p95: +q(0.95).toFixed(3) };
  };
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  const extra = TRY ? TRIES[TRY] : [];
  if (TRY && !extra) throw new Harness(`no test change named ${TRY}; names: ${Object.keys(TRIES).join(', ')}`);
  const { chromium } = await playwright('clouds-check.mjs');
  // The page loads the bundle, so build it from the source first.
  execFileSync('node', ['tools/build.mjs'], { cwd: ROOT, stdio: 'ignore' });
  const server = await serve();
  const browser = await chromium.launch({ headless: true, args: GPU });
  const res = { checks: [], notes: [] };
  const fail = (name, ok, detail) => res.checks.push({ name, ok, detail });
  const files = {};
  try {
    // Load 1: the wide frame as it is: the matrix, the masks, the solo storms, the frame time.
    let L = await load(browser, server.url, WIDE, extra);
    const storms = await L.page.evaluate(() => window.__qa.stormsQ());
    for (const s of SUNS) {
      const r = await shot(L.page, s, null, true);
      files[`w-${tag(s)}`] = r.png; save(`w-${tag(s)}.png`, r.png); files[`w-${tag(s)}.jpg`] = r.jpg;
    }
    for (const s of PROBE_SUNS) { const r = await shot(L.page, s, -1); files[`none-${tag(s)}`] = r.png; save(`none-${tag(s)}.png`, r.png); }
    for (let k = 0; k < storms.length; k++) { const r = await shot(L.page, 0.5, k); files[`solo${k}`] = r.png; save(`solo${k}-s050.png`, r.png); }
    await L.page.evaluate(() => { window.__qa.stormSolo(null); window.__qa.still({ sun: 0.5, fall: 0.45, t: 15 }); });
    const gpuAll = await L.page.evaluate(() => window.__qa.gpuMs('all', 30));
    await L.page.evaluate(() => window.__qa.stormSolo(-1));
    const gpuNone = await L.page.evaluate(() => window.__qa.gpuMs('all', 30));
    if (L.errs.length) res.notes.push(`console errors (wide): ${L.errs.slice(0, 3).join(' | ')}`);
    await L.ctx.close();
    // Load 2: four times the steps. Load 3: the bound flags.
    L = await load(browser, server.url, WIDE, [...steps(4), ...extra]);
    for (const s of PROBE_SUNS) files[`hq-${tag(s)}`] = (await shot(L.page, s)).png;
    await L.ctx.close();
    L = await load(browser, server.url, WIDE, [...flagPatches(), ...extra]);
    for (const s of PROBE_SUNS) { files[`flag-${tag(s)}`] = (await shot(L.page, s)).png; save(`bounds-flags-${tag(s)}.png`, files[`flag-${tag(s)}`]); }
    await L.ctx.close();
    // Load 4: the phone frame.
    L = await load(browser, server.url, PHONE, extra);
    for (const s of PHONE_SUNS) { const r = await shot(L.page, s, null, true); files[`p-${tag(s)}`] = r.png; save(`p-${tag(s)}.png`, r.png); files[`p-${tag(s)}.jpg`] = r.jpg; }
    await L.ctx.close();

    // Analysis.
    const ctx = await browser.newContext();
    const A = await ctx.newPage();
    await A.evaluate(ANALYSIS);
    const put = async (n, url) => A.evaluate(([n, url]) => window.put(n, url), [n, url]);
    for (const [n, u] of Object.entries(files)) if (u && !n.endsWith('.jpg')) await put(n, u);
    const ev = (fn, ...a) => A.evaluate(([fn, a]) => window[fn](...a), [fn, a]);
    // The storm mask: where any storm changes the frame, at each probe sun.
    for (const s of PROBE_SUNS) await ev('keep', `m-${tag(s)}`, `w-${tag(s)}`, `none-${tag(s)}`, T.mask, 3);
    await ev('union', 'storms', ...PROBE_SUNS.map(s => `m-${tag(s)}`));

    // 1. Bounds: no storm may touch its card, its cylinder or its top cut.
    for (const s of PROBE_SUNS) {
      const n = await ev('flags', `flag-${tag(s)}`, `w-${tag(s)}`);
      const ok = n.card + n.wall + n.top <= T.flags;
      fail(`bounds ${tag(s)}`, ok, `cloud touches the card edge on ${n.card} px, the cylinder wall on ${n.wall} px, the top cut on ${n.top} px (limit ${T.flags} in all)`);
    }
    // 2. Steps: four times the steps must not change the storms much.
    for (const s of PROBE_SUNS) {
      const f = await ev('fracB', `w-${tag(s)}`, `hq-${tag(s)}`, 'storms', T.px);
      fail(`steps ${tag(s)}`, !f.err && f.share <= T.steps, f.err || `${(f.share * 100).toFixed(2)}% of storm pixels change at four times the steps, blurred 3 x 3 (limit ${(T.steps * 100).toFixed(0)}%)`);
    }
    // 3. Visibility: each storm shows in the wide frame at the first look.
    const vis = [];
    for (let k = 0; k < storms.length; k++) {
      const px = await ev('keep', `v${k}`, `solo${k}`, 'none-s050', T.mask, 0);
      vis.push(px);
      const d = Math.round(Math.hypot(storms[k].P[0], storms[k].P[2]) / 1000);
      fail(`visible storm ${k}`, px >= T.visible, `${px} px (limit ${T.visible}); ${storms[k].H / 1000} km tall, about ${d} km out`);
    }
    // 4. Colour: OKLCH of each storm, lit third and spread, at the first look and noon.
    const col = {};
    for (const s of [0.5, 1.0]) for (let k = 0; k < storms.length; k++) {
      if (vis[k] < 50) continue;
      col[`${k}-${tag(s)}`] = await ev('colour', `w-${tag(s)}`, `v${k}`);
    }
    const gstats = existsSync(join(GOLD, 'stats.json')) ? JSON.parse(readFileSync(join(GOLD, 'stats.json'), 'utf8')) : null;
    for (const [key, c] of Object.entries(col)) {
      if (!c) continue;
      const blue = c.C >= 0.03 && c.h >= 200 && c.h <= 290, flat = c.p95 - c.p5 < 0.08;
      const g = gstats?.colour?.[key];
      const dh = g ? Math.min(Math.abs(c.h - g.h), 360 - Math.abs(c.h - g.h)) : 0;
      const drift = g ? Math.abs(c.L - g.L) > 0.06 || Math.abs(c.C - g.C) > 0.03 || (c.C > 0.02 && dh > 25) : false;
      fail(`colour storm ${key}`, !blue && !flat && !drift, `lit L ${c.L} C ${c.C} h ${c.h}; spread ${c.p5} to ${c.p95}${blue ? '; lit side reads blue' : ''}${flat ? '; flat' : ''}${drift ? `; drifted from golden (L ${g.L} C ${g.C} h ${g.h})` : ''}`);
    }
    // 5. Golden: the look matches the approved set inside the storm mask.
    const names = [...SUNS.map(s => `w-${tag(s)}`), ...PHONE_SUNS.map(s => `p-${tag(s)}`)];
    if (UPDATE) {
      mkdirSync(GOLD, { recursive: true });
      for (const n of names) saveTo(join(GOLD, `${n}.jpg`), files[`${n}.jpg`]);
      writeFileSync(join(GOLD, 'stats.json'), JSON.stringify({ storms: storms.length, visible: vis, colour: col, from: { storms: sha('railgun/storms.js'), main: sha(MAIN) } }, null, 1) + '\n');
      res.notes.push(`golden set written to ${GOLD}`);
    } else if (!existsSync(join(GOLD, 'w-s050.jpg'))) {
      res.notes.push('no golden set yet: run with --update-golden after Tom approves the look');
    } else {
      // The phone frame has no storm mask: compare the whole frame there.
      for (const n of names) {
        const gp = join(GOLD, `${n}.jpg`);
        if (!existsSync(gp)) { fail(`golden ${n}`, false, 'missing from the golden set'); continue; }
        await put(`g-${n}`, `data:image/jpeg;base64,${readFileSync(gp).toString('base64')}`);
        let mn = 'storms';
        if (n.startsWith('p-')) { await ev('full', `all-${n}`, n); mn = `all-${n}`; }
        const f = await ev('frac', n, `g-${n}`, mn, T.px);
        fail(`golden ${n}`, !f.err && f.share <= T.gold, f.err || `${(f.share * 100).toFixed(2)}% of ${mn === 'storms' ? 'storm' : 'frame'} pixels differ from the golden still (limit ${(T.gold * 100).toFixed(0)}%)`);
      }
    }
    // 6. Frame time: a note only. Headless GPU time on a busy machine is noise.
    // Judge the 30 fps budget in a real browser on Standard.
    if (gpuAll) res.notes.push(`frame time, headless, rung 0: GPU ${gpuAll.median.toFixed(1)} ms a frame; the storms about ${(gpuAll.median - (gpuNone?.median ?? 0)).toFixed(1)} ms`);
    else res.notes.push('no GPU timer in this browser: no frame time');
    await ctx.close();
  } finally {
    await browser.close();
    server.proc.kill();
  }

  const failed = res.checks.filter(c => !c.ok);
  const head = `# clouds-check\n\nstorms.js ${sha('railgun/storms.js')}, main.ts ${sha(MAIN)}${TRY ? `, test change: ${TRY}` : ''}\n\n| Check | Result | Detail |\n|---|---|---|\n`;
  const rows = res.checks.map(c => `| ${c.name} | ${c.ok ? 'pass' : '**FAIL**'} | ${c.detail} |`).join('\n');
  writeFileSync(join(OUT, 'report.md'), head + rows + '\n\n' + res.notes.map(n => `- ${n}`).join('\n') + '\n');
  for (const c of res.checks) console.log(`${c.ok ? 'pass' : 'FAIL'}  ${c.name}: ${c.detail}`);
  for (const n of res.notes) console.log(`note  ${n}`);
  console.log(`stills and report: ${OUT}`);
  console.log(failed.length ? `clouds-check: FAIL (${failed.map(c => c.name).join(', ')})` : `clouds-check: PASS storms.js@${sha('railgun/storms.js')} main.ts@${sha(MAIN)}`);
  return failed.length ? 1 : 0;
}

main().then(code => process.exit(code), e => { console.error(e instanceof Harness ? `clouds-check: harness: ${e.message}` : e); process.exit(2); });
