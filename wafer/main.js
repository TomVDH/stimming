// Wafer hunt: a whole wafer under a brightfield microscope, with two real chip layouts and fifteen hidden doodles.
import { initPage, whenVisible, fitCanvas, onQuality, reduced, onReducedChange, stage as mark, pageReady, buildSteps, idle } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { TRI_VS, program, linked, target, renderable, free, onContextLoss } from '../shared/gl.js';
import { earclip } from './tri.js';
import { DOODLES, segs } from './doodles.js';
import { WAFER_FS, MESH_VS, MESH_FS, DOODLE_VS, DOODLE_FS, POST_FS } from './shaders.js';
import { buildLut, filmColour, LUT_W, ROWS } from './optics.js';
mark('libs');

const stage = document.getElementById('stage');
const canvas = stage.querySelector('canvas');
const hud = stage.querySelector('.hud');
const toast = stage.querySelector('.toast');
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/* ---------- world ---------- */
// Microns, y down. A round wafer of 15 by 15 dies, shot as 3 by 3 reticle fields, with a flat at the bottom.
const P = 4600, D = 4400, R = 36000;
const B = R * 1.05;
const BAKE = 2048;
const dieId = (i, j) => (j + 7) * 15 + (i + 7);
const FIELD = [3, 1, 2, 1, 3, 1, 0, 3, 2, 1, 2, 3, 0, 3, 2, 1, 2, 3, 0, 1, 3, 1, 2, 1, 3];
// Which hero chip a die holds: 0 the 6502, 1 the 6800, -1 a generated die.
function heroAt(i, j) {
  const gx = i + 7, gy = j + 7, fx = (gx / 3) | 0, fy = (gy / 3) | 0, sx = gx - fx * 3, sy = gy - fy * 3;
  const ret = FIELD[fy * 5 + fx], slot = sy * 3 + sx;
  if (ret === 0) return slot === 4 ? 0 : slot === 1 ? 1 : -1;
  if (ret === 1 && slot === 6) return 0;
  if (ret === 2 && slot === 2) return 1;
  return -1;
}
// Hero chips: the 6502 and the 6800, scaled to sit inside a die.
const HEROES = [
  { file: '6502.bin', fit: 4000, name: 'MOS 6502' },
  { file: '6800.bin', fit: 3900, name: '6800' },
];
// Hero dies seen on the wafer, for the vector pass.
const heroDies = [];
for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) {
  const k = heroAt(i, j);
  if (k >= 0 && Math.hypot(i * P, j * P) < R - 2500) heroDies.push({ k, x: i * P, y: j * P });
}
// Doodle spots: die (i, j) and a position inside it, in microns. Corners are the pad ring's empty cells.
// A hero spot gives chip units instead: [i, j, chip, ux, uy].
const SPOTS = {
  owl: [0, 0, 0, 624, 72], rabbit: [-3, -4, 1, 72, 72], invader: [5, 4, 0, 8712, 9576], robot: [7, -1, 1, 3048, 6072],
  biplane: [-6, 2, 1990, -1990], cheetah: [4, -5, 1500, 1700], lander: [-2, 5, -1990, 1990], snail: [6, 1, -1200, 1780],
  dragon: [-5, -4, 1990, 1990], fish: [2, 3, 1750, -900], cup: [-4, 0, -1990, -1990], tv: [1, -6, 1990, -1990],
  cat: [-6, -3, -1990, 1990], rocket: [5, -3, -1500, -1500], sailboat: [-1, 6, 1200, 1500],
};
const chips = HEROES.map(h => ({ ...h, unit: 0, w: 0, h: 0, bufs: {}, bake: null, data: null, sub: filmColour(0, 300) }));
const doodles = DOODLES.map(d => {
  const sp = SPOTS[d.id], [i, j] = sp;
  let lx, ly;
  if (sp.length === 5) {
    // Hero spot: chip units to microns, with the chip centred in the die.
    const dims = [[8769, 9628, 4000 / 9628], [6400, 6133, 3900 / 6400]][sp[2]];
    lx = (sp[3] - dims[0] / 2) * dims[2]; ly = (sp[4] - dims[1] / 2) * dims[2];
  } else { lx = sp[2]; ly = sp[3]; }
  return { ...d, die: dieId(i, j), lx, ly, x: i * P + lx, y: j * P + ly, segs: segs(d), hero: sp.length === 5 };
});
const store = {
  get(k) { try { return localStorage.getItem(`stimming.wafer.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.wafer.${k}`, v); } catch { /* storage is optional */ } },
};
let found = new Set();
try { found = new Set(JSON.parse(store.get('found') || '[]').filter(id => doodles.some(d => d.id === id))); } catch { /* a bad record starts afresh */ }

/* ---------- bar ---------- */
const act = { hint() {}, fit() {}, metal() {}, reset() {}, zoom() {} };
const ui = initPage({ id: 'wafer', bar: {
  slider: { label: 'Zoom', min: 0, max: 1, step: 0.001, value: 0, onInput: v => act.zoom(v) },
  actions: [
    { verb: 'hint', label: 'Hint', key: 'H', onPress: () => act.hint() },
    { verb: 'layers', label: 'Metal', key: 'M', onPress: () => act.metal() },
    { verb: 'fit', label: 'Fit', key: 'F', onPress: () => act.fit() },
  ],
  settings: [
    { type: 'toggle', id: 'metal', label: 'Metal layers', value: true, persist: true, onToggle: on => { metalOn = on; bakeAll(); wake(); } },
  ],
  reset: () => act.reset(),
  quality: true,
  keys: [['drag', 'pan the wafer'], ['scroll', 'zoom in or out'], ['double-click', 'zoom in'], ['click', 'spot a doodle']],
  help: [['drag', 'Pan the wafer'], ['arrows', 'Pan the wafer'], ['scroll', 'Zoom in or out'], ['pinch', 'Zoom in or out'], ['+ -', 'Zoom in or out'],
    ['double-click', 'Zoom in'], ['click', 'Mark a doodle you spotted'], ['H', 'Fly toward a hidden doodle'], ['F', 'Fit the whole strip']],
} });
let metalOn = ui.setting('metal')?.value ?? true;
const introDone = playIntro({ ready: pageReady() });

/* ---------- camera ---------- */
let cssW = 1, cssH = 1, dpr = 1, W = 1, H = 1, fit = 0.014, sMax = 8;
const cam = { x: 0, y: 0, ls: Math.log(0.014) };
const tgt = { x: 0, y: 0, ls: Math.log(0.014) };
let flying = false, raf = 0, visible = true, last = 0, lastInput = 0;
const sOf = ls => Math.exp(ls);
const clampTgt = () => {
  tgt.ls = clamp(tgt.ls, Math.log(fit), Math.log(sMax));
  const s = sOf(tgt.ls);
  for (const [k, half, b] of [['x', cssW / 2 / s, B], ['y', cssH / 2 / s, B]]) {
    const m = b - half;
    tgt[k] = m <= 0 ? 0 : clamp(tgt[k], -m, m);
  }
};
// Zoom the target by a factor, keeping the world point under (px, py) still.
function zoomAt(factor, px = cssW / 2, py = cssH / 2) {
  const s0 = sOf(tgt.ls);
  const wx = tgt.x + (px - cssW / 2) / s0, wy = tgt.y + (py - cssH / 2) / s0;
  tgt.ls += Math.log(factor);
  clampTgt();
  const s1 = sOf(tgt.ls);
  tgt.x = wx - (px - cssW / 2) / s1;
  tgt.y = wy - (py - cssH / 2) / s1;
  clampTgt();
}
function panBy(dx, dy) {
  const s = sOf(tgt.ls);
  tgt.x -= dx / s; tgt.y -= dy / s;
  clampTgt();
}
const zoomValue = () => (cam.ls - Math.log(fit)) / (Math.log(sMax) - Math.log(fit));

/* ---------- hero data ---------- */
async function readChip(h) {
  const a = new Uint8Array(await (await fetch(new URL(h.file, import.meta.url))).arrayBuffer());
  const dv = new DataView(a.buffer);
  const np = dv.getUint16(0, true), nc = dv.getUint16(2, true), w = dv.getUint16(4, true), hh = dv.getUint16(6, true);
  let o = 8;
  const u = () => { let r = 0, m = 1, b; do { b = a[o++]; r += (b & 127) * m; m *= 128; } while (b & 128); return r; };
  const z = () => { const v = u(); return v & 1 ? -(v + 1) / 2 : v / 2; };
  const polys = [];
  for (let i = 0; i < np; i++) {
    const layer = a[o++], n = u(), p = new Array(n * 2);
    p[0] = u(); p[1] = u();
    for (let j = 1; j < n; j++) { p[j * 2] = p[j * 2 - 2] + z(); p[j * 2 + 1] = p[j * 2 - 1] + z(); }
    polys.push({ layer, p });
  }
  const contacts = [];
  let cx = 0, cy = 0;
  for (let i = 0; i < nc; i++) { cx += z(); cy += z(); contacts.push(cx, cy); }
  return { polys, contacts, w, h: hh };
}
// Triangle lists per layer, as Int16 pairs in chip units.
function cut(chip) {
  const by = {};
  for (const { layer, p } of chip.polys) {
    const idx = earclip(p), arr = by[layer] || (by[layer] = []);
    for (const i of idx) arr.push(p[i * 2], p[i * 2 + 1]);
  }
  const c = by[6] = [];
  for (let i = 0; i < chip.contacts.length; i += 2) {
    const x = chip.contacts[i], y = chip.contacts[i + 1], r = 6;
    c.push(x - r, y - r, x + r, y - r, x + r, y + r, x - r, y - r, x + r, y + r, x - r, y + r);
  }
  by.base = [0, 0, chip.w, 0, chip.w, chip.h, 0, 0, chip.w, chip.h, 0, chip.h];
  return by;
}

/* ---------- GL ---------- */
let gl, progs, vaoE, segTex, lutTex, scene = null, lutData = null;
// Layers of a chip: id, film row, oxide thickness in nm. Colours come from the thin-film table.
const DIFF = [[1, 0, 150], [3, 0, 115], [4, 0, 190], [2, 0, 80]];
const POLY = [5, 0, 690], METAL = [0, 2, 150], SUBSTRATE = 300;
const DARK = [0.012, 0.011, 0.018, 0.8];

async function initGL() {
  gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL 2 unavailable');
  gl.getExtension('EXT_color_buffer_float');
  progs = await linked(gl, {
    wafer: program(gl, TRI_VS, WAFER_FS), mesh: program(gl, MESH_VS, MESH_FS, ['aPos']),
    doodle: program(gl, DOODLE_VS, DOODLE_FS), post: program(gl, TRI_VS, POST_FS),
  });
  vaoE = gl.createVertexArray();
  // The film table: reflectance of each oxide stack, as linear colour.
  lutData = lutData || buildLut();
  lutTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, lutTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, LUT_W, ROWS, 0, gl.RGBA, gl.FLOAT, lutData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  for (const c of chips) {
    c.bufs = {};
    for (const [layer, arr] of Object.entries(c.tris)) {
      const vao = gl.createVertexArray(), buf = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, Int16Array.from(arr), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.SHORT, false, 0, 0);
      c.bufs[layer] = { vao, n: arr.length / 2 };
    }
    c.bake = target(gl, BAKE, BAKE, { format: gl.SRGB8_ALPHA8, mips: true });
  }
  // Doodle segments: one row per doodle, one texel per segment.
  const data = new Float32Array(128 * 16 * 4);
  doodles.forEach((d, r) => d.segs.forEach((sg, i) => data.set(sg, (r * 128 + i) * 4)));
  segTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, segTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, 128, 16);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, 16, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  scene = null;
}

// The scene renders in linear light, in half floats when the device allows, into a multisampled buffer.
function makeScene() {
  if (scene) { free(gl, scene.res); if (scene.ms) { gl.deleteFramebuffer(scene.ms.fb); gl.deleteRenderbuffer(scene.ms.rb); } }
  const hdr = renderable(gl, gl.RGBA16F), fmt = hdr ? gl.RGBA16F : gl.RGBA8;
  const res = target(gl, W, H, { format: fmt, filter: gl.LINEAR });
  let ms = null;
  if (rung < 2) {
    const fb = gl.createFramebuffer(), rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, fmt, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) ms = { fb, rb };
    else { gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(rb); }
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  scene = { res, ms, w: W, h: H };
}

// Paints one chip's layers. rel is the chip's top left from the camera, in microns.
// Poly and diffusion lie under the oxide, so they draw dim and soft; the aluminium on top draws sharp,
// with a bright rim on the upper left and a shadow on the lower right.
function paint(c, rel, s, rw, rh, relief, px) {
  const m = progs.mesh;
  gl.useProgram(m.p);
  gl.uniform2f(m.u.uRel, rel[0], rel[1]);
  gl.uniform1f(m.u.uUnit, c.unit);
  gl.uniform2f(m.u.uRes, rw, rh);
  gl.uniform1f(m.u.uS, s);
  gl.uniform3f(m.u.uBase, c.sub[0], c.sub[1], c.sub[2]);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, lutTex);
  gl.uniform1i(m.u.uLut, 3);
  const fillLayer = (layer, row, d, mix, alpha, tone, ox, oy) => {
    const b = c.bufs[layer];
    if (!b) return;
    gl.uniform1f(m.u.uMode, 0);
    gl.uniform1f(m.u.uRow, row);
    gl.uniform1f(m.u.uD, d);
    gl.uniform1f(m.u.uMix, mix);
    gl.uniform1f(m.u.uAlpha, alpha);
    gl.uniform1f(m.u.uTone, tone);
    gl.uniform2f(m.u.uOff, ox * px, oy * px);
    gl.bindVertexArray(b.vao);
    gl.drawArrays(gl.TRIANGLES, 0, b.n);
  };
  const flat = (layer, col, ox = 0, oy = 0) => {
    const b = c.bufs[layer];
    if (!b) return;
    gl.uniform1f(m.u.uMode, 1);
    gl.uniform4f(m.u.uFlat, col[0], col[1], col[2], col[3]);
    gl.uniform2f(m.u.uOff, ox * px, oy * px);
    gl.bindVertexArray(b.vao);
    gl.drawArrays(gl.TRIANGLES, 0, b.n);
  };
  // A soft layer: the shape drawn a few times around a ring, so its edge blurs by about a pixel.
  const soft = (layer, row, d, mix) => {
    if (!relief) { fillLayer(layer, row, d, mix, 1, 1, 0, 0); return; }
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      fillLayer(layer, row, d, mix, 0.34, 1, Math.cos(a) * 1.3, Math.sin(a) * 1.3);
    }
    fillLayer(layer, row, d, mix, 0.7, 1, 0, 0);
  };
  gl.disable(gl.BLEND);
  fillLayer('base', 0, SUBSTRATE, 1, 1, 1, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  for (const [l, row, d] of DIFF) soft(l, row, d, 0.5);
  soft(POLY[0], POLY[1], POLY[2], 0.62);
  if (metalOn) {
    if (relief) {
      // A faint step edge all round, then the shadow, then the bright rim.
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) flat(METAL[0], [DARK[0], DARK[1], DARK[2], 0.3], ox, oy);
      flat(METAL[0], [DARK[0], DARK[1], DARK[2], 0.62], 1.7, 1.7);
      flat(METAL[0], [DARK[0], DARK[1], DARK[2], 0.35], 2.6, 2.6);
      fillLayer(METAL[0], METAL[1], METAL[2], 1, 1, 1.4, -1.1, -1.1);
    }
    fillLayer(METAL[0], METAL[1], METAL[2], 1, 1, 1, 0, 0);
    flat(6, [0.04, 0.035, 0.06, 0.7]);
  }
  gl.disable(gl.BLEND);
}
function bake(c) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, c.bake.fb);
  gl.viewport(0, 0, BAKE, BAKE);
  gl.clearColor(c.sub[0], c.sub[1], c.sub[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const rel = [-c.w * c.unit / 2, -c.h * c.unit / 2];
  paint(c, rel, BAKE / D, BAKE, BAKE, false, 1);
  gl.bindTexture(gl.TEXTURE_2D, c.bake.tex);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function bakeAll() { if (gl && !gl.isContextLost()) chips.forEach(bake); }

/* ---------- render ---------- */
const flash = { id: null, t0: 0 };
const flashAmt = now => {
  if (!flash.id) return 0;
  const t = (now - flash.t0) / 1000;
  if (reduced()) return t < 2.5 ? 0.8 : 0;
  return t < 2.2 ? Math.pow(1 - t / 2.2, 1.2) : 0;
};
function render(now = performance.now()) {
  if (!gl || gl.isContextLost() || !scene) return;
  const s = sOf(cam.ls) * dpr;
  gl.bindFramebuffer(gl.FRAMEBUFFER, scene.ms ? scene.ms.fb : scene.res.fb);
  gl.viewport(0, 0, W, H);
  gl.disable(gl.BLEND);
  gl.bindVertexArray(vaoE);
  const w = progs.wafer;
  gl.useProgram(w.p);
  gl.uniform2f(w.u.uRes, W, H);
  gl.uniform2f(w.u.uCam, cam.x, cam.y);
  gl.uniform1f(w.u.uS, s);
  gl.uniform1f(w.u.uMetal, metalOn ? 1 : 0);
  chips.forEach((c, k) => {
    gl.activeTexture(gl.TEXTURE0 + k);
    gl.bindTexture(gl.TEXTURE_2D, c.bake.tex);
    gl.uniform1i(w.u[`uBake${k}`], k);
  });
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, lutTex);
  gl.uniform1i(w.u.uLut, 3);
  gl.uniform4fv(w.u.uHero, chips.flatMap(c => [0, 0, c.w * c.unit, c.h * c.unit]));
  gl.uniform4fv(w.u.uDoo, doodles.flatMap(d => [d.lx, d.ly, 34, d.die]));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // Vector layers, once a hero chip is large on screen.
  for (const hd of heroDies) {
    const c = chips[hd.k];
    const wpx = c.w * c.unit * s, hpx = c.h * c.unit * s;
    if (Math.max(wpx, hpx) < 1100) continue;
    const cx = (hd.x - cam.x) * s + W / 2, cy = (hd.y - cam.y) * s + H / 2;
    if (cx + wpx / 2 < 0 || cx - wpx / 2 > W || cy + hpx / 2 < 0 || cy - hpx / 2 > H) continue;
    paint(c, [hd.x - cam.x - c.w * c.unit / 2, hd.y - cam.y - c.h * c.unit / 2], s, W, H, true, dpr);
  }
  // Doodles.
  const dd = progs.doodle, amp = flashAmt(now);
  gl.useProgram(dd.p);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(vaoE);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, segTex);
  gl.uniform1i(dd.u.uSegs, 2);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, lutTex);
  gl.uniform1i(dd.u.uLut, 3);
  gl.uniform2f(dd.u.uRes, W, H);
  gl.uniform1f(dd.u.uS, s);
  doodles.forEach((d, r) => {
    const px = d.size * s, half = d.size / 2;
    const sx = (d.x - cam.x) * s + W / 2, sy = (d.y - cam.y) * s + H / 2, ext = px + 4;
    if (px < 1.5 || sx + ext < 0 || sx - ext > W || sy + ext < 0 || sy - ext > H) return;
    gl.uniform2f(dd.u.uRel, d.x - cam.x, d.y - cam.y);
    gl.uniform1f(dd.u.uHalf, half);
    gl.uniform1i(dd.u.uRow, r);
    gl.uniform1i(dd.u.uN, d.segs.length);
    gl.uniform1f(dd.u.uPx, px);
    gl.uniform1f(dd.u.uFlash, flash.id === d.id ? amp : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  gl.disable(gl.BLEND);
  // Resolve, then the microscope optics onto the canvas.
  if (scene.ms) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, scene.ms.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, scene.res.fb);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  const pp = progs.post;
  gl.useProgram(pp.p);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, scene.res.tex);
  gl.uniform1i(pp.u.uScene, 4);
  gl.uniform2f(pp.u.uRes, W, H);
  gl.uniform1f(pp.u.uDof, clamp((sOf(cam.ls) - 2) / 6, 0, 1));
  gl.uniform1f(pp.u.uExp, 0.8);
  // The lamp sits up and left of the wafer centre.
  const sc = sOf(cam.ls) * dpr;
  gl.uniform4f(pp.u.uSpec, W / 2 + (-9000 - cam.x) * sc, H / 2 - (-14000 - cam.y) * sc, 24500 * sc, 0.04 * (1 - clamp((sOf(cam.ls) - 0.03) / 0.2, 0, 1)));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ---------- loop ---------- */
// The loop runs only while the camera or a flash moves.
let rung = 0, slowT = 0, runT = 0;
const BUDGETS = [2.0e6, 1.2e6, 0.7e6];
function tick(t) {
  raf = 0;
  if (!visible) return;
  const dt = Math.min(0.05, (t - (last || t - 16)) / 1000);
  last = t;
  const rate = reduced() ? 60 : flying ? 3.2 : 12;
  const f = 1 - Math.exp(-dt * rate);
  cam.x += (tgt.x - cam.x) * f; cam.y += (tgt.y - cam.y) * f; cam.ls += (tgt.ls - cam.ls) * f;
  const s = sOf(cam.ls);
  const still = Math.abs(tgt.x - cam.x) * s < 0.05 && Math.abs(tgt.y - cam.y) * s < 0.05 && Math.abs(tgt.ls - cam.ls) < 0.0008;
  if (still) { cam.x = tgt.x; cam.y = tgt.y; cam.ls = tgt.ls; flying = false; }
  try { render(t); } finally { /* a failed frame must not stop the loop */ }
  syncUI();
  const fl = flashAmt(t) > 0;
  if (flash.id && !fl) { flash.id = null; render(t); }
  // A slow frame while moving steps the pixel ratio down one rung.
  if (!still) {
    runT += dt;
    if (runT > 4 && dt > 1 / 38) slowT += dt; else if (dt < 1 / 45) slowT = Math.max(0, slowT - dt);
    if (slowT > 2 && rung < 2) { rung++; slowT = runT = 0; layout(); }
  } else runT = 0;
  if (!still || fl) raf = requestAnimationFrame(tick);
  else last = 0;
}
function wake() {
  lastInput = performance.now();
  if (!raf && visible) raf = requestAnimationFrame(tick);
}

function layout() {
  const r = fitCanvas(canvas, { budget: BUDGETS[rung] });
  const resized = W !== r.W || H !== r.H;
  cssW = r.w; cssH = r.h; dpr = r.dpr; W = r.W; H = r.H;
  if (gl && !gl.isContextLost() && (resized || !scene)) makeScene();
  fit = Math.min(cssW, cssH) / (2 * B);
  sMax = Math.max(fit * 600, 8);
  const first = cam.ls === Math.log(0.014);
  if (first) { cam.ls = tgt.ls = Math.log(fit); }
  clampTgt();
  if (first || reduced()) { cam.x = tgt.x; cam.y = tgt.y; cam.ls = tgt.ls; }
}

let uiKey = '';
function syncUI() {
  const s = sOf(cam.ls), z = s / fit, vw = cssW / s;
  const text = `×${z < 10 ? z.toFixed(1) : Math.round(z)}  ·  ${vw >= 1000 ? (vw / 1000).toFixed(vw < 10000 ? 1 : 0) + ' mm' : Math.round(vw) + ' µm'} across`;
  if (text !== uiKey) { uiKey = text; if (!flash.id && !toastOn) hud.textContent = text; }
  ui.slider?.set(clamp(zoomValue(), 0, 1));
}

/* ---------- tally, names, hint ---------- */
let toastOn = false, toastTo = 0;
function say(msg) {
  toast.textContent = msg;
  toast.classList.add('on');
  toastOn = true;
  hud.style.visibility = 'hidden';
  clearTimeout(toastTo);
  toastTo = setTimeout(() => { toast.classList.remove('on'); hud.style.visibility = ''; toastOn = false; uiKey = ''; syncUI(); }, 2600);
}
function tally() {
  const n = found.size;
  const label = document.querySelector('.s2-chip[aria-keyshortcuts="H"] .s2-label');
  if (label) label.textContent = n >= doodles.length ? `${n} of ${doodles.length}` : `Hint · ${n} of ${doodles.length}`;
  const h = ui.action('hint');
  if (h) h.disabled = n >= doodles.length;
  stage.setAttribute('aria-label', `A wafer strip of microchips hides ${doodles.length} tiny doodles. ${n} found. Drag to pan, scroll or pinch to zoom, click a doodle to mark it.`);
}
function hit(px, py) {
  const s = sOf(cam.ls);
  const wx = cam.x + (px - cssW / 2) / s, wy = cam.y + (py - cssH / 2) / s;
  let best = null, bd = 1e9;
  for (const d of doodles) {
    if (d.size * s < 20) continue;
    const dd = Math.max(Math.abs(wx - d.x), Math.abs(wy - d.y));
    if (dd < Math.max(d.size * 0.62, 12 / s) && dd < bd) { best = d; bd = dd; }
  }
  return best;
}
function mark1(d) {
  const fresh = !found.has(d.id);
  found.add(d.id);
  store.set('found', JSON.stringify([...found]));
  flash.id = d.id; flash.t0 = performance.now();
  say(fresh ? `${d.name}  ·  ${found.size} of ${doodles.length}` : d.name);
  tally();
  wake();
}
act.hint = () => {
  const left = doodles.filter(d => !found.has(d.id));
  if (!left.length) return;
  const d = left[Math.floor(Math.random() * left.length)];
  const s = Math.max(0.75, fit * 20);
  tgt.ls = Math.log(Math.min(sMax, s));
  const a = Math.random() * 6.283, off = (Math.min(cssW, cssH) * 0.3) / s;
  tgt.x = d.x + Math.cos(a) * off; tgt.y = d.y + Math.sin(a) * off;
  clampTgt();
  flying = true;
  say('Look closer');
  wake();
};
act.fit = () => { tgt.x = 0; tgt.y = 0; tgt.ls = Math.log(fit); flying = true; wake(); };
act.metal = () => {
  const row = ui.setting('metal');
  if (row) row.set(!row.value, true); else { metalOn = !metalOn; bakeAll(); wake(); }
};
act.zoom = v => {
  tgt.ls = Math.log(fit) + clamp(v, 0, 1) * (Math.log(sMax) - Math.log(fit));
  clampTgt();
  wake();
};
act.reset = () => {
  found.clear();
  store.set('found', '[]');
  flash.id = null;
  tally();
  say('Found marks cleared');
  wake();
};

/* ---------- input ---------- */
const ptrs = new Map();
let drag = null, pinch = null, lastTap = { t: 0, x: 0, y: 0 }, vel = { x: 0, y: 0 }, inertia = 0;
const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function glide() {
  inertia = 0;
  if (Math.hypot(vel.x, vel.y) < 0.05 || reduced()) return;
  const step = () => {
    panBy(vel.x * 16, vel.y * 16);
    vel.x *= 0.92; vel.y *= 0.92;
    wake();
    if (Math.hypot(vel.x, vel.y) > 0.03) inertia = requestAnimationFrame(step);
  };
  inertia = requestAnimationFrame(step);
}
canvas.addEventListener('pointerdown', e => {
  if (e.button > 0 && e.pointerType === 'mouse') return;
  cancelAnimationFrame(inertia);
  flying = false;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  ptrs.set(e.pointerId, { x, y });
  if (ptrs.size === 1) { drag = { x, y, t: e.timeStamp, moved: false, lt: e.timeStamp }; vel = { x: 0, y: 0 }; stage.classList.add('grab'); }
  else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    drag = null;
  }
});
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  const [x, y] = local(e);
  if (pinch && ptrs.size === 2) {
    ptrs.set(e.pointerId, { x, y });
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    panBy(cx - pinch.cx, cy - pinch.cy);
    if (d > 4 && pinch.d > 4) zoomAt(d / pinch.d, cx, cy);
    pinch = { d, cx, cy };
    wake();
    return;
  }
  if (drag) {
    const dx = x - p.x, dy = y - p.y;
    if (!drag.moved && Math.hypot(x - drag.x, y - drag.y) > 8) drag.moved = true;
    if (drag.moved) {
      panBy(dx, dy);
      const dt = Math.max(1, e.timeStamp - drag.lt);
      vel.x = vel.x * 0.6 + dx / dt * 0.4;
      vel.y = vel.y * 0.6 + dy / dt * 0.4;
      drag.lt = e.timeStamp;
      wake();
    }
  }
  ptrs.set(e.pointerId, { x, y });
});
function release(e) {
  const had = ptrs.delete(e.pointerId);
  if (!had) return;
  if (ptrs.size < 2) pinch = null;
  if (!ptrs.size) stage.classList.remove('grab');
  if (drag && e.type === 'pointerup') {
    const [x, y] = local(e);
    if (!drag.moved && e.timeStamp - drag.t < 260 + 200) {
      const d = hit(x, y);
      const dbl = e.timeStamp - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30;
      if (d) mark1(d);
      else if (dbl) { zoomAt(sOf(tgt.ls) > sMax * 0.7 ? 0.2 : 4, x, y); wake(); }
      lastTap = { t: e.timeStamp, x, y };
    } else if (drag.moved && e.timeStamp - drag.lt < 80) glide();
  }
  drag = null;
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => canvas.addEventListener(t, release));
canvas.addEventListener('dblclick', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  flying = false;
  const [x, y] = local(e);
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0016)), x, y);
  wake();
}, { passive: false });
stage.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const step = 0.12, k = e.key;
  if (k === 'ArrowLeft') panBy(cssW * step, 0);
  else if (k === 'ArrowRight') panBy(-cssW * step, 0);
  else if (k === 'ArrowUp') panBy(0, cssH * step);
  else if (k === 'ArrowDown') panBy(0, -cssH * step);
  else if (k === '+' || k === '=') zoomAt(1.5);
  else if (k === '-' || k === '_') zoomAt(1 / 1.5);
  else if (k === '0') act.fit();
  else return;
  e.preventDefault();
  flying = false;
  wake();
});

/* ---------- boot ---------- */
mark('build');
const step = buildSteps(4, ['Reading the 6502 layout', 'Cutting the polygons', 'Lighting the lamp', 'Baking the die photos']);
try {
  const data = await Promise.all(chips.map(readChip));
  step();
  await idle();
  chips.forEach((c, i) => {
    c.data = data[i];
    // The 6502 fits by height, the 6800 by width.
    c.unit = c.fit / (i === 0 ? c.data.h : c.data.w);
    c.w = c.data.w; c.h = c.data.h;
    c.tris = cut(c.data);
    c.data = null;
  });
  step();
  await initGL();
  step();
  layout();
  bakeAll();
  step();
  render();
  gl.finish();
  canvas.classList.add('on');
  syncUI();
  tally();
  mark('first-frame');
} catch (err) {
  stage.querySelector('.fail').hidden = false;
  ui.hideControls?.();
  throw err;
}

new ResizeObserver(() => { layout(); wake(); }).observe(stage);
onReducedChange(() => { layout(); wake(); });
onQuality(() => { rung = 0; slowT = runT = 0; layout(); wake(); });
whenVisible(stage, v => {
  visible = v;
  if (!v) { cancelAnimationFrame(raf); raf = 0; return; }
  wake();
});
onContextLoss(canvas, {
  lost: () => { cancelAnimationFrame(raf); raf = 0; },
  restored: async () => { await initGL(); layout(); bakeAll(); wake(); },
});
Promise.race([introDone, new Promise(r => setTimeout(r, 9000))]).then(() => wake());
// Test hook for the QA captures.
window.__wafer = { cam, tgt, doodles, wake, found, get fit() { return fit; } };
