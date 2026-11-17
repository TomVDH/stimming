// ShadyOS: a sentient bootleg desktop, half glass and half aqua.
// The OS is the toy: drag, fling, fold, open its apps, make it crash.
import { initPage, fitCanvas, whenVisible, reduced, onReducedChange, onQuality, oklchRgb, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import {
  PD, SANS, MONO, clamp, lerp, smooth, begin, use, reseed, rnd, rr, txt, measure, fit, frost, glyph, glyphCanvas, wallpaper, flare, ghostFace,
  icons as paintIcons, watermark, burnIn, glassFace, kidFace, client, clientRect, chromeHit, GLASS, KID,
  menuSize, menuFace, balloonFace, balloonSize, barLayout, barFace, eyeFace, dockFace, CUR, arrowCursor, wheelCursor, glassCursor,
} from './paint.js';
import { createRenderer, NV, UVS, flat } from './gl.js';
import * as snd from './sound.js';
import { loadContent, fill, pick } from './content.js';
import { APPS, cardCanvas, CARD } from './apps/index.js';
import { paintBoot, paintCrash, paintPanic, paintSafeOff, paintSafeMode, KONAMI } from './eggs.js';
import { makeSaver } from './savers.js';

mark('libs');
// The intro holds until the page, the fonts and the first frame are ready.
const introDone = playIntro({ ready: pageReady() });
let reduce = reduced();
onReducedChange(v => { reduce = v; });

/* ---------- settings ---------- */
const saved = k => { try { return localStorage.getItem(`stimming.shadyos.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.shadyos.${k}`, String(v)); } catch { /* storage is optional */ } };
const opts = { mode: saved('mode') || 'smear', age: saved('age') != null ? +saved('age') : 0.6, haunt: true, hum: 'low', trail: 'dense', boot: true };
let cheats = false;
const mode = () => (cheats ? 'jelly' : opts.mode);
const devAct = a => () => act(a);
// The desktop draws its own menus and clock, so the key strip stays off.
const ui = initPage({ id: 'shadyos', bar: {
  choice: { label: 'Drag', value: opts.mode, options: [{ value: 'smear', label: 'Smear', key: '1' }, { value: 'jelly', label: 'Jelly', key: '2' }],
    onPick: v => { opts.mode = v; save('mode', v); wake(); } },
  slider: { label: 'Age', min: 0, max: 1, step: 0.01, value: opts.age, onInput: v => setAge(v, false) },
  actions: [
    { verb: 'add', noun: 'Window', key: 'N', onPress: () => act('open:random') },
    { verb: 'error', key: 'Space', onPress: () => cascade() },
    { verb: 'clear', key: 'C', onPress: () => clearPlate() },
  ],
  // The haunt: the 3:33 clock, the tidy-up, the saver, balloons and the pointer pause.
  settings: [
    { type: 'toggle', id: 'haunt', label: 'Haunt', value: true, persist: true, onToggle: v => { opts.haunt = v; } },
    { type: 'choice', id: 'hum', label: 'Hum', value: 'low', persist: true, options: [{ value: 'off', label: 'Off' }, { value: 'low', label: 'Low' }, { value: 'on', label: 'On' }], onPick: v => { opts.hum = v; snd.setHum(v); } },
    { type: 'choice', id: 'trail', label: 'Trail', value: 'dense', persist: true, options: [{ value: 'dense', label: 'Dense' }, { value: 'sparse', label: 'Sparse' }], onPick: v => { opts.trail = v; } },
    { type: 'toggle', id: 'boot', label: 'Boot screen', value: true, persist: true, onToggle: v => { opts.boot = v; } },
  ],
  dev: [
    { type: 'button', group: 'Screens', label: 'Screensaver', text: 'Start', onClick: devAct('saver') },
    { type: 'button', group: 'Screens', label: 'Blue crash', text: 'Crash', onClick: devAct('crash') },
    { type: 'button', group: 'Screens', label: 'Grey curtain', text: 'Panic', onClick: devAct('panic') },
    { type: 'button', group: 'Screens', label: 'Safe mode', text: 'Enter', onClick: devAct('safe') },
    { type: 'button', group: 'Screens', label: 'Shut down', text: 'Ask', onClick: devAct('shutdown') },
    { type: 'button', group: 'Screens', label: 'Boot', text: 'Boot', onClick: devAct('boot') },
    { type: 'button', group: 'Desktop', label: 'Clock', text: '3:33 now', onClick: () => { spookAt = 0; spookTo = 0; wake(); } },
    { type: 'button', group: 'Desktop', label: 'Balloon', text: 'Pop', onClick: () => balloonNow() },
    { type: 'button', group: 'Desktop', label: 'Content', text: 'Reload', onClick: () => reloadContent() },
  ],
  quality: true,
  keys: false,
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [['drag', 'Move a window'], ['drag fast', 'Throw a window'], ['drag', 'Remove a window at the Bin'],
    ['double-click', 'Fold a window into the dock'], ['click', 'Open an app from the dock'], ['click', 'Open a menu'],
    ['double-click', 'Open a desktop icon'], ['right-click', 'Open the desktop menu'],
    ['N', 'Add a window'], ['space', 'Raise an error'], ['C', 'Clear the smears'], ['1 2', 'Change how a window drags'],
    ['A-Z 0-9', 'Type into a window'], ['enter', 'Send the line'], ['↑ ↓', 'Select an earlier command'], ['esc', 'Close a menu']],
} });
['haunt', 'hum', 'trail', 'boot'].forEach(k => { opts[k] = ui.setting(k).value; });
snd.setHum(opts.hum);
// The untitled files survive between visits.
let untitled = Math.max(43, +saved('untitled') || 0), folderN = Math.max(33, +saved('folders') || 0);
// ?haunt=fast runs every haunt beat within a minute, for tuning.
const FAST = new URLSearchParams(location.search).get('haunt') === 'fast';
const T = FAST ? { spook: 6000, away: 2000, pause: 0, saver: 8000, standby: 20000, balloon: 9000 } : { spook: 60000 + Math.random() * 180000, away: 12000, pause: 15000, saver: 45000, standby: 58500, balloon: 70000 };

/* ---------- canvas and renderer ---------- */
mark('build');
const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// A hidden field takes typing for the focused app, and shows the phone keyboard.
const field = document.createElement('input');
Object.assign(field, { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
field.setAttribute('aria-label', 'Type into the window');
field.className = 'shady-field';
stage.append(field);
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: true });
// A failed start still frees the intro.
if (!gl) { stage.querySelector('.fail').hidden = false; ui.hideControls(); mark('first-frame'); throw new Error('no webgl2'); }
const R = createRenderer(gl);
const GLINT = [[0.86, 0.13, 200], [0.8, 0.17, 340], [0.9, 0.15, 85]].map(c => oklchRgb(...c));
const GLASS_TINT = [0.27, 0.33, 0.37, 0.34], KID_TINT = [0.04, 0.04, 0.06, 0.82], BAR_TINT = [0.2, 0.24, 0.3, 0.5], POP_TINT = [0.14, 0.16, 0.22, 0.66], DOCK_TINT = [0.62, 0.68, 0.74, 0.18], CLEAR = [0, 0, 0, 0];
const CUR_TEX = { arrow: R.upload(R.tex(), arrowCursor()), wheel: R.upload(R.tex(), wheelCursor()), hour: R.upload(R.tex(), glassCursor()) };

/* ---------- content ---------- */
let C = null, contentError = null;
const days = () => (+C.os.uptime_days || 6809) + Math.round((new Date().setHours(0, 0, 0, 0) - loadDay) / 864e5);
const loadDay = new Date().setHours(0, 0, 0, 0);
async function reloadContent() {
  const r = await loadContent(); C = r.C;
  if (r.error) notice(...corrupt(r.error));
  bake(); wins.forEach(w => { if (w.A.title && !w.fixedTitle) w.title = w.A.title(C); repaint(w); }); wake();
}
const corrupt = e => C.notices.corrupt.map(l => fill(l, e));

/* ---------- state ---------- */
let W = 0, H = 0, dpr = 1;
let deskTex = null, ghostTex = null, scene = null, acc = null, b1 = null, b2 = null;
const deskCanvas = document.createElement('canvas'), ghostCanvas = document.createElement('canvas');
/** @type {any[]} */
const wins = [];
let nextId = 1, blurDirty = true, clearing = 0, lastPhone = null;
const lay = { bar: 25, tlR: 0, trL: 1e5, foot: 1e5, dockY: 0, dockX: 0, dockW: 0, dockH: 52, key: '' };
const phone = () => W < 600;

/* ---------- layout: the shell bar sets the room ---------- */
let slots = [];
function dockSlots() {
  const list = ['orb', ...(phone() ? C.dock.slice(0, 3) : C.dock).filter(id => APPS[id]), 'bin'];
  return list.map(id => ({ id, glyph: id === 'orb' ? 'orb' : APPS[id].glyph }));
}
function measureLay() {
  let bar = 25, tlR = 0, trL = W, foot = H - 12;
  slots = dockSlots();
  const step = phone() ? 42 : 50, dw = slots.length * step + 26, dh = phone() ? 46 : 54;
  const sx0 = W / 2 - dw / 2, sx1 = W / 2 + dw / 2;
  let dockB = H - 10;
  // Each box is one bar part, in stage pixels.
  for (const { x0, y0, x1, y1 } of ui.cover().rects) {
    if (y1 < H / 2) { bar = Math.max(bar, y1 + 7); if (x0 < W / 2) tlR = Math.max(tlR, x1); else trL = Math.min(trL, x0); continue; }
    if (x1 > W / 2) foot = Math.min(foot, y0);
    if (x0 < sx1 && x1 > sx0) dockB = Math.min(dockB, y0 - 8);
  }
  Object.assign(lay, { bar: Math.round(bar), tlR, trL, foot, dockW: dw, dockH: dh, dockX: Math.round(W / 2 - dw / 2), dockY: Math.round(dockB - dh) });
  slots.forEach((s, i) => { s.x = lay.dockX + 13 + step * (i + 0.5) + (s.id === 'bin' ? 0 : 0); s.y = lay.dockY + dh / 2 - 1; s.size = phone() ? 32 : 40; });
  return [lay.bar, tlR, trL, foot, lay.dockY, W].map(Math.round).join();
}
const spotOf = id => slots.find(s => s.id === id) || slots.find(s => s.id === 'orb');

/* ---------- desktop bake ---------- */
let deskIcons = [];
function bakeDesktop() {
  reseed(5); begin(deskCanvas, W, H);
  wallpaper(W, H);
  flare(W, H, W * (phone() ? 0.8 : 0.82), H * (phone() ? 0.6 : 0.47));
  burnIn([[lay.dockX, lay.dockY, lay.dockW, lay.dockH, 14], [0, 0, W, lay.bar, 0], [W * 0.36, H * 0.4, Math.min(330, W * 0.6), 150, 9]]);
  deskIcons = [];
  if (!phone()) {
    const room = Math.floor((lay.dockY - lay.bar - 40) / 84);
    (C.desktop || []).slice(0, Math.max(0, room)).forEach((d, i) => deskIcons.push({ ...d, x: W - 56, y: lay.bar + 42 + i * 84 }));
    paintIcons(deskIcons);
  }
  const wm = C.os.watermark || [];
  if (phone()) watermark(wm, W / 2, lay.dockY - 44, 'center'); else watermark(wm, W - 16, Math.min(H - 40, lay.foot, lay.dockY) - 26, 'right');
  begin(ghostCanvas, W, H, 1); ghostFace(W, H);
}
function bake() {
  lay.key = measureLay();
  bakeDesktop();
  R.upload(deskTex, deskCanvas); R.upload(ghostTex, ghostCanvas);
  paintBar(); paintDock(); paintClock(true);
  wins.forEach(w => { if (w.spotId) w.spot = spotOf(w.spotId); });
  blurDirty = true;
}

/* ---------- panels: the menu bar, the dock, menus and balloons ---------- */
const panel = (tint, r = 0) => ({ pos: new Float32Array(NV * 2), canvas: document.createElement('canvas'), tex: R.tex(), tint, r, w: 1, h: 1, x: 0, y: 0, alpha: 1 });
const bar = panel(BAR_TINT, 0), dock = panel(DOCK_TINT, 14);
const eye = { canvas: document.createElement('canvas'), tex: R.tex(), look: [0, 0], open: 1, mood: 0, blinkT: 0, nextBlink: 3, key: '', x: 0 };
const clock = { canvas: document.createElement('canvas'), tex: R.tex(), w: 0, h: 0, x: 0, key: '' };
let barItems = [], openMenu = -1;
function paintBar() {
  const x0 = lay.tlR ? lay.tlR + 12 : 10;
  // A narrow bar between the shell corners holds no eye, menus or clock.
  bar.room = Math.min(W, lay.trL) - x0 > 120;
  eye.x = x0;
  Object.assign(bar, { x: 0, y: 0, w: W, h: lay.bar });
  begin(bar.canvas, W, lay.bar);
  const clockL = Math.min(W, lay.trL) - 12 - (clock.w || 120);
  barItems = bar.room ? barLayout(Object.keys(C.menus), x0 + 34, clockL - 8) : [];
  barFace(W, lay.bar, barItems, openMenu);
  R.upload(bar.tex, bar.canvas); flat(bar.pos, 0, 0, W, lay.bar);
}
function paintEye() {
  const key = `${eye.look[0].toFixed(2)},${eye.look[1].toFixed(2)},${eye.open.toFixed(2)},${eye.mood.toFixed(2)}`;
  if (key === eye.key) return;
  eye.key = key; begin(eye.canvas, 28, 18); eyeFace(eye.look, eye.open, eye.mood); R.upload(eye.tex, eye.canvas);
}
// Real time, a live uptime, one 3:33 a visit.
let spookAt = performance.now() + T.spook, spookTo = 0, frozenUp = '';
const pad = n => String(n).padStart(2, '0');
function clockText() {
  const d = new Date(), now = performance.now();
  if (opts.haunt && !spookTo && now >= spookAt && visible) spookTo = now + 60000;
  const spook = spookTo && now < spookTo;
  const up = `up ${days().toLocaleString('en-US')} days ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  // The uptime stops while the clock reads 3:33.
  if (spook) frozenUp ||= up; else frozenUp = '';
  return [spook ? C.os.spook_time : `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`, frozenUp || up];
}
function paintClock(force = false) {
  if (!C || !lay.bar) return;
  const [time, up] = clockText(), room = Math.min(W, lay.trL) - (barItems.length ? barItems[barItems.length - 1].x + barItems[barItems.length - 1].w : eye.x + 34) - 24;
  const showUp = measure(up, 10.5, 500, MONO) + measure(time, 12.5, 700) + 16 < room;
  const key = time + (showUp ? up : '') + lay.bar;
  if (key === clock.key && !force) return;
  clock.key = key;
  const tw = measure(time, 12.5, 700), uw = showUp ? measure(up, 10.5, 500, MONO) + 12 : 0, w = Math.ceil(tw + uw + 4), h = lay.bar;
  begin(clock.canvas, w, h);
  const by = (h - 1) / 2 + 4.5;
  txt(time, w - 2, by, 12.5, 'oklch(0.97 0.01 90)', { w: 700, align: 'right', shadow: 'oklch(0 0 0 / 0.8)' });
  if (showUp) txt(up, w - 2 - tw - 12, by, 10.5, 'oklch(0.85 0.02 90 / 0.8)', { align: 'right', font: MONO, shadow: 'oklch(0 0 0 / 0.8)' });
  R.upload(clock.tex, clock.canvas);
  const was = clock.w;
  Object.assign(clock, { w, h, x: Math.min(W, lay.trL) - 10 - w });
  if (Math.abs(was - w) > 30) paintBar();
}
const dockIcon = {};
function paintDock() {
  Object.assign(dock, { x: lay.dockX, y: lay.dockY, w: lay.dockW, h: lay.dockH });
  begin(dock.canvas, dock.w, dock.h);
  const running = new Set(wins.filter(w => !w.closing && w.app !== 'dialog').map(w => w.app));
  const sep = slots.length > 2 ? slots[slots.length - 1].x - lay.dockX - 25 : 0;
  dockFace(dock.w, dock.h, slots.map(s => ({ x: s.x - lay.dockX, running: running.has(s.id) })), sep);
  R.upload(dock.tex, dock.canvas); flat(dock.pos, dock.x, dock.y, dock.w, dock.h);
  slots.forEach(s => { dockIcon[s.glyph] ||= R.upload(R.tex(), glyphCanvas(s.glyph)); });
  dock.key = [...running].join();
}
// Magnify by distance from the pointer, mac style.
const mag = slots => slots.map(s => (ptr.on && Math.abs(ptr.y - (lay.dockY + lay.dockH / 2)) < lay.dockH * 1.2 ? 1 + 0.55 * Math.exp(-(((ptr.x - s.x) / 64) ** 2)) : 1));
let magNow = [];

let popup = null;
// A menu: items, a place, a hover row and what a pick does.
function openPopup(items, x, y, kind, onPick) {
  const [w, h] = menuSize(items), p = panel(POP_TINT, 8);
  Object.assign(p, { items, kind, onPick, hover: -1, w, h, x: clamp(x, 4, W - w - 4), y: clamp(y, lay.bar + 2, H - h - 4), t: 0 });
  popup = p; paintPopup(); snd.tick(); wake();
}
function paintPopup() {
  const p = popup; if (!p) return;
  begin(p.canvas, p.w, p.h); p.rows = menuFace(p.items, p.hover, p.w, p.h);
  R.upload(p.tex, p.canvas); flat(p.pos, p.x, p.y, p.w, p.h);
}
function closePopup() { if (!popup) return; popup = null; if (openMenu >= 0) { openMenu = -1; paintBar(); } wake(); }
function popupRow(x, y) { const p = popup; if (!p || x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) return null; return p.rows.find(r => y - p.y >= r.y && y - p.y < r.y + r.h) ?? -1; }

const balloons = [];
function say(text) {
  if (!text) return;
  const [w, h] = balloonSize(text), b = panel([0.9, 0.88, 0.8, 0.0], 10);
  Object.assign(b, { text, w, h, life: 6, alpha: 0 });
  begin(b.canvas, w, h); balloonFace(text, w, h); R.upload(b.tex, b.canvas);
  balloons.unshift(b); if (balloons.length > 2) balloons.length = 2;
  layBalloons(); snd.ding(5); wake();
}
function layBalloons() { let y = lay.bar + 8; balloons.forEach(b => { b.x = Math.max(4, Math.min(W, lay.trL + 120) - b.w - 10); b.y = y; y += b.h + 8; flat(b.pos, b.x, b.y, b.w, b.h); }); }
let nextBalloon = performance.now() + T.balloon * (0.6 + Math.random() * 0.6);
function balloonNow() { const list = C.balloons || []; if (list.length) say(list[(balloonN++) % list.length]); }
let balloonN = (Math.random() * 10) | 0;

/* ---------- windows ---------- */
function makeWin(app, o = {}) {
  const A = APPS[app]; if (!A) return null;
  const [sw, sh] = o.w ? [o.w, o.h] : A.size(W, H);
  const w = Math.min(sw, W - 16), h = Math.min(sh, lay.dockY - lay.bar - 10);
  const win = { id: nextId++, app, A, opts: o, skin: A.skin || 'glass', noZoom: !!A.noZoom, title: o.title ?? A.title?.(C) ?? 'Notice', fixedTitle: !!o.title,
    w, h, x: o.x ?? (W - w) / 2, y: o.y ?? lay.bar + 20, vx: 0, vy: 0, pos: new Float32Array(NV * 2), vel: new Float32Array(NV * 2),
    alpha: 1, state: 'open', g: 0, gTo: 0, closing: 0, canvas: document.createElement('canvas'), tex: R.tex(), dirty: true, spotId: app === 'dialog' ? 'orb' : app };
  win.x = clamp(win.x, 4, Math.max(4, W - w - 4)); win.y = clamp(win.y, lay.bar + 3, Math.max(lay.bar + 3, lay.dockY - h - 6));
  A.init?.(win, ctx);
  paintWin(win);
  const k = o.pop ? 0.82 : 1, cx = win.x + w / 2, cy = win.y + h / 2;
  for (let i = 0; i < NV; i++) { win.pos[i * 2] = cx + (UVS[i * 2] - 0.5) * w * k; win.pos[i * 2 + 1] = cy + (UVS[i * 2 + 1] - 0.5) * h * k; }
  wins.push(win);
  if (A.typing && !o.background) focus(win);
  paintDock();
  return win;
}
function paintWin(win) {
  begin(win.canvas, win.w, win.h);
  const r = clientRect(win);
  if (win.skin === 'kid') kidFace(win); else { glassFace(win); client(r.x, r.y, r.w, r.h); }
  win.A.paint?.(win, r, ctx);
  use(win.canvas).restore();
  R.upload(win.tex, win.canvas);
  win.dirty = false;
}
function repaint(win) { if (wins.includes(win)) { win.dirty = true; kick(); } }
function killWin(win) {
  const i = wins.indexOf(win); if (i < 0) return;
  win.A.close?.(win, ctx);
  gl.deleteTexture(win.tex); wins.splice(i, 1);
  if (focusWin === win) focus(null);
  paintDock();
}
function closeWin(win, quiet = false) {
  if (win.closing) return;
  win.closing = 0.0001; snd.click(panOf(win));
  if (!quiet && win.app !== 'dialog') { eye.mood = 1; if (Math.random() < 0.35) say(pick(C.notices.closed_own)); }
  wake();
}
function closeDialog(from) {
  // Cascade dialogs close together, in a ripple.
  const list = from.opts.cascade ? wins.filter(w => w.app === 'dialog' && w.opts.cascade).reverse() : [from];
  list.forEach((w, i) => setTimeout(() => { w.closing = 0.0001; snd.click(panOf(w)); wake(); }, i * 70));
}
const panOf = win => (win ? (win.x + win.w / 2) / W * 2 - 1 : 0);
const topWin = () => { for (let i = wins.length - 1; i >= 0; i--) if (wins[i].state === 'open' && !wins[i].closing) return wins[i]; return null; };
function raise(win) { wins.splice(wins.indexOf(win), 1); wins.push(win); }
let focusWin = null;
function focus(win) {
  const was = focusWin; focusWin = win;
  if (win) { field.value = ''; field.focus({ preventScroll: true }); } else if (document.activeElement === field) field.blur();
  if (was && was !== win) repaint(was);
  if (win) repaint(win);
}
function open(app, o = {}) {
  if (app === 'random') app = pick(C.apps.random || ['notes']);
  if (!APPS[app]) return null;
  // A folded window of this app comes back first.
  const folded = [...wins].reverse().find(w => w.app === app && w.state === 'min');
  if (folded && !o.fresh) { unfold(folded); return folded; }
  const n = counter('open');
  const win = makeWin(app, { x: W * 0.12 + (n * 47) % Math.max(60, W * 0.5), y: lay.bar + 16 + (n * 31) % Math.max(40, H * 0.35), pop: true, ...o });
  messy = true;
  // Keep the desktop at twelve windows.
  while (wins.filter(w => w.app !== 'dialog').length > 12) killWin(wins.find(w => w.app !== 'dialog'));
  snd.click(panOf(win)); wake();
  return win;
}
function notice(head, body, o = {}) {
  const bw = Math.min(380, W - 36);
  const win = makeWin('dialog', { title: 'Notice', head, body, x: (W - bw) / 2, y: H * 0.38, w: bw, h: 132, pop: true, ...o });
  snd.ding(1, 0); wake();
  return win;
}
const counters = {};
const counter = k => (counters[k] = (counters[k] ?? -1) + 1);

/* ---------- physics: springy windows ---------- */
const stamps = [];
let drag = null;
function bump(win) { if (Math.abs(win.vx) + Math.abs(win.vy) > 240) snd.click(panOf(win)); }
const stiff = () => (mode() === 'jelly' && !reduce ? [170, 9] : [900, 55]);
function step(win, dt) {
  // The anchor flies after a fling and bounces off the edges.
  if (drag?.win !== win && win.state === 'open' && (Math.abs(win.vx) + Math.abs(win.vy) > 1)) {
    win.x += win.vx * dt; win.y += win.vy * dt;
    const f = Math.exp(-dt * 3.2); win.vx *= f; win.vy *= f;
    const minY = lay.bar + 3, maxX = W - win.w - 2, maxY = H - win.h - 2;
    if (win.x < 2) { win.x = 2; win.vx = Math.abs(win.vx) * 0.55; bump(win); }
    if (win.x > maxX) { win.x = maxX; win.vx = -Math.abs(win.vx) * 0.55; bump(win); }
    if (win.y < minY) { win.y = minY; win.vy = Math.abs(win.vy) * 0.55; bump(win); }
    if (win.y > maxY) { win.y = maxY; win.vy = -Math.abs(win.vy) * 0.55; bump(win); }
  } else if (drag?.win !== win) { win.vx = win.vy = 0; }
  if (win.state === 'min') { win.busy = false; return true; }
  if (win.state === 'genie') return genie(win, dt);
  if (win.closing) { win.closing = Math.min(1, win.closing + dt * 5); win.alpha = 1 - win.closing; if (win.closing >= 1) { killWin(win); return false; } }
  const [K, Dm] = stiff();
  const gx = drag?.win === win ? drag.gx : win.w / 2, gy = drag?.win === win ? drag.gy : win.h / 2;
  const s = win.closing ? 1 - win.closing * 0.12 : 1;
  let energy = 0;
  const sub = 2, h = dt / sub;
  for (let it = 0; it < sub; it++) {
    for (let k = 0; k < NV; k++) {
      const rx = UVS[k * 2] * win.w, ry = UVS[k * 2 + 1] * win.h;
      const tx = win.x + win.w / 2 + (rx - win.w / 2) * s, ty = win.y + win.h / 2 + (ry - win.h / 2) * s;
      const kk = K / (1 + Math.hypot(rx - gx, ry - gy) / 140);
      const i = k * 2;
      const ax = kk * (tx - win.pos[i]) - Dm * win.vel[i], ay = kk * (ty - win.pos[i + 1]) - Dm * win.vel[i + 1];
      win.vel[i] += ax * h; win.vel[i + 1] += ay * h;
      win.pos[i] += win.vel[i] * h; win.pos[i + 1] += win.vel[i + 1] * h;
      if (it === sub - 1) energy += Math.abs(win.vel[i]) + Math.abs(win.vel[i + 1]) + Math.abs(tx - win.pos[i]) + Math.abs(ty - win.pos[i + 1]);
    }
  }
  win.busy = energy / NV > 0.05 || Math.abs(win.vx) + Math.abs(win.vy) > 1 || win.closing > 0;
  return true;
}
// Fold toward a dock spot; the bottom rows lead.
function genie(win, dt) {
  win.g = clamp(win.g + (win.gTo > win.g ? 1 : -1) * dt / (reduce ? 0.2 : 0.55));
  const sp = win.spot, p = win.g;
  for (let k = 0; k < NV; k++) {
    const u = UVS[k * 2], v = UVS[k * 2 + 1];
    const e = smooth(clamp((p * 1.5 - (1 - v) * 0.5)));
    const width = lerp(win.w, 22, Math.pow(e, 0.8));
    win.pos[k * 2] = lerp(win.x + win.w / 2, sp.x, e) + (u - 0.5) * width;
    win.pos[k * 2 + 1] = lerp(win.y + v * win.h, sp.y, e);
    win.vel[k * 2] = win.vel[k * 2 + 1] = 0;
  }
  win.alpha = 1 - smooth(clamp((p - 0.8) / 0.2));
  if (p >= 1 && win.gTo === 1) { win.state = 'min'; win.busy = false; if (win.binned) { killWin(win); return false; } }
  else if (p <= 0 && win.gTo === 0) { win.state = 'open'; win.alpha = 1; win.busy = false; }
  else win.busy = true;
  return true;
}
function fold(win, spotId = win.spotId) {
  if (win.state !== 'open') return;
  win.spot = spotOf(spotId);
  win.state = 'genie'; win.g = 0; win.gTo = 1; snd.whoosh(true, panOf(win));
  if (focusWin === win) focus(null);
  wake();
}
function unfold(win) { win.state = 'genie'; win.gTo = 0; raise(win); snd.whoosh(false, panOf(win)); wake(); }
function zoom(win) {
  if (win.noZoom || win.skin === 'kid') return;
  if (win.zoomed) Object.assign(win, win.zoomed), win.zoomed = null;
  else {
    win.zoomed = { x: win.x, y: win.y, w: win.w, h: win.h };
    Object.assign(win, { x: 8, y: lay.bar + 6, w: W - 16, h: Math.max(160, lay.dockY - lay.bar - 14) });
  }
  paintWin(win); snd.whoosh(false, 0); wake();
}
// Into the Bin: fold toward it, then gone.
function binWin(win) {
  win.binned = true; fold(win, 'bin');
  binned.push(win.title);
  snd.crunch(panOf(win));
  setTimeout(() => say(fill(C.notices.binned, { name: win.title })), 600);
}
const binned = [];

/* ---------- actions: one verb set for menus, icons, the terminal and the dock ---------- */
function act(a) {
  if (!a) return;
  a = String(a);
  if (a.startsWith('say:')) return say(a.slice(4));
  if (a.startsWith('open:')) return open(a.slice(5));
  switch (a) {
    case 'properties': return open('properties');
    case 'shutdown': return shutdown(0);
    case 'crash': return crash();
    case 'panic': return panic();
    case 'safe': return safeMode();
    case 'boot': return boot();
    case 'saver': return sleepNow();
    case 'nudge': return nudge();
    case 'clear': return clearPlate();
    case 'wait': return waitCursor(6000);
    case 'refresh': return refresh();
    case 'newfolder': folderN++; save('folders', folderN); return say(fill(C.notices.newfolder, { n: folderN }));
    case 'arrange': return arrange();
    case 'foldall': return wins.filter(w => w.state === 'open' && !w.closing).forEach((w, i) => setTimeout(() => fold(w), i * 90));
    default: if (APPS[a]) return open(a);
  }
}
let refreshes = 0, refreshT = 0;
function refresh() {
  const now = performance.now();
  refreshes = now - refreshT < 4000 ? refreshes + 1 : 1; refreshT = now;
  flickT0 = now; snd.click();
  if (refreshes >= 5) say(fill(C.notices.refresh, { n: refreshes }));
  wake();
}
function arrange() {
  const gap = phone() ? 22 : 30;
  wins.filter(w => w.state === 'open' && !w.closing).forEach((w, i) => { w.tx = (phone() ? 10 : 24) + i * gap; w.ty = lay.bar + 11 + i * gap; w.tk = 4; });
  arranging = 0.9; wake();
}
let arranging = 0;

/* ---------- eggs ---------- */
// One overlay at a time: boot, crash, panic, off.
let overlay = null, first = true, safe = 0, shakeT = 0, waitUntil = 0;
const overlayCanvas = document.createElement('canvas'), overlayTex = R.tex();
function boot() {
  focus(null); closePopup();
  overlay = { kind: 'boot', t: 0, run: false, fade: 0, key: '', len: first ? 1.6 : 2.8 };
  first = false;
  // The boot waits for the intro to finish.
  introDone.then(() => { if (overlay?.kind === 'boot') { overlay.run = true; snd.chime(); wake(); } });
  wake();
}
function crash() {
  focus(null); closePopup(); snd.crashTone();
  overlay = { kind: 'crash', t: 0, n: 0, key: '' }; wake();
}
function panic() { focus(null); closePopup(); snd.crashTone(); overlay = { kind: 'panic', t: 0, key: '' }; wake(); }
function off() { focus(null); closePopup(); overlay = { kind: 'off', t: 0, key: '' }; snd.music(false); wake(); }
function safeMode() { safe = 1; say(C.crash.safe_mode); wake(); }
let refusals = 0;
function shutdown(stepN) {
  const K = C.crash;
  if (stepN === 0) {
    const [h, b] = K.shutdown_ask;
    notice(h, b, { yes: K.shutdown_yes, no: K.shutdown_no, onYes: () => { killDialogs(); refusals < (K.shutdown_refuse || []).length ? shutdown(1) : off(); }, onNo: killDialogs });
  } else {
    const [h, b] = K.shutdown_refuse[refusals++];
    notice(h, b, { yes: 'OK', onYes: () => { killDialogs(); } });
  }
}
const killDialogs = () => wins.filter(w => w.app === 'dialog' && !w.opts.cascade).forEach(w => { w.closing = 0.0001; });
function nudge() { shakeT = 0.55; snd.buzz(); wins.forEach(w => { if (w.state === 'open') { w.vx += (Math.random() - 0.5) * 500; w.vy += (Math.random() - 0.5) * 300; } }); wake(); }
function waitCursor(ms) { waitUntil = performance.now() + ms; wake(); }
// Back from a crash: the windows sit tidied, a balloon denies it.
function endOverlay() {
  const k = overlay?.kind; overlay = null;
  if (k === 'crash' || k === 'panic') { killDialogs(); setTimeout(() => say(C.crash.after), 500); }
  if (k === 'panic' || k === 'off') boot();
  wake();
}
function paintOverlay() {
  const o = overlay;
  let key = o.kind;
  if (o.kind === 'boot') key += Math.floor(o.t * 30);
  if (o.kind === 'crash') key += o.n;
  if (o.kind === 'panic') key += Math.min(1, o.t / 1.1).toFixed(2);
  if (key === o.key) return;
  o.key = key;
  if (o.kind === 'boot') paintBoot(overlayCanvas, W, H, o.t, C, safe);
  else if (o.kind === 'crash') paintCrash(overlayCanvas, W, H, o.n, C);
  else if (o.kind === 'panic') paintPanic(overlayCanvas, W, H, o.t / 1.1, C);
  else paintSafeOff(overlayCanvas, W, H, C);
  R.upload(overlayTex, overlayCanvas);
}
let safeTex = null, safeKey = '';
function paintSafe() { const k = `${W},${H},${lay.bar}`; if (k === safeKey) return; safeKey = k; const c = document.createElement('canvas'); paintSafeMode(c, W, H, C, lay.bar); safeTex = R.upload(safeTex || R.tex(), c); }
const konami = [];

/* ---------- Patience: the winning bit, on the smear plate ---------- */
const cards = [], cardTex = {};
let cardQueue = [];
let cardWin = null;
function cascadeCards(win, spots) {
  cardQueue = []; cardWin = win;
  for (let r = 12; r >= 0; r--) for (let s = 0; s < 4; s++) cardQueue.push({ r, s, x: win.x + spots[s][0], y: win.y + spots[s][1] });
  cardT = 0; messy = true; wake();
}
let cardT = 0;
function stepCards(dt) {
  if (cardQueue.length && (cardT -= dt) <= 0) {
    const q = cardQueue.shift(); cardT = reduce ? 0.02 : 0.2;
    const dir = Math.random() < 0.5 ? -1 : 1;
    cards.push({ ...q, vx: dir * (90 + Math.random() * 220), vy: -Math.random() * 160, lx: q.x, ly: q.y });
  }
  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i];
    c.vy += 1100 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.y > H - CARD[1]) { c.y = H - CARD[1]; c.vy = -Math.abs(c.vy) * 0.74; if (Math.abs(c.vy) > 120) snd.click((c.x / W) * 2 - 1); }
    if (c.x < -CARD[0] || c.x > W) cards.splice(i, 1);
  }
  // The last card gone, the game says it won.
  if (cardWin && !cards.length && !cardQueue.length) { cardWin.finished = true; repaint(cardWin); cardWin = null; snd.ding(6); }
  return cards.length || cardQueue.length;
}
function stampCards() {
  if (!cards.length) return;
  R.bindT(acc); R.premul();
  for (const c of cards) {
    const k = `${c.r}:${c.s}`;
    const t = cardTex[k] ||= R.upload(R.tex(), cardCanvas(c.r, c.s));
    // Stamps fill the gap, so a fast card leaves a solid trail.
    const d = Math.hypot(c.x - c.lx, c.y - c.ly), n = Math.max(1, Math.min(12, Math.floor(d / 4)));
    for (let j = 1; j <= n; j++) R.sprite(t, lerp(c.lx, c.x, j / n), lerp(c.ly, c.y, j / n), CARD[0], CARD[1]);
    c.lx = c.x; c.ly = c.y;
  }
  blurDirty = true;
}

/* ---------- the ctx apps see ---------- */
const ctx = {
  get C() { return C; }, get reduce() { return reduce; }, binned,
  sound: { click: () => snd.click(), ding: i => snd.ding(i), buzz: snd.buzz, crash: snd.crashTone, crunch: () => snd.crunch(), music: snd.music, playing: snd.playing },
  repaint, wake: () => wake(), isTop: w => topWin() === w, isFocus: w => focusWin === w, focus, notice, say, act, open, closeDialog, counter,
  untitled: () => untitled, days, age: v => (v === undefined ? opts.age : setAge(v, true)), wait: waitCursor, shake: () => nudge(), cascadeCards,
  textW: (s, size, w, font) => measure(s, size, w, font),
};
function setAge(v, sync) { opts.age = v; save('age', v); if (sync) ui.slider?.set?.(v); wins.forEach(w => { if (w.app === 'control') repaint(w); }); wake(); }

/* ---------- Error: the staircase ---------- */
let cascading = false, cascades = [];
function cascade() {
  if (cascading || overlay) return;
  cascading = true; messy = true;
  // File creep: each error leaves one more untitled file behind.
  untitled++; save('untitled', untitled);
  wins.forEach(w => { if (w.app === 'files') repaint(w); });
  const now = performance.now(); cascades = cascades.filter(t => now - t < 60000); cascades.push(now);
  const list = C.errors || [], n = list.length, bw = Math.min(360, W - 40), bx = phone() ? 20 : W * 0.58, by = H * 0.12;
  for (let i = 0; i < n; i++) setTimeout(() => {
    const [head, body] = list[i];
    makeWin('dialog', { title: 'Notice', head, body, yes: C.errors_yes, x: bx + i * (phone() ? 6 : 20), y: by + i * 24, w: bw, h: 126, pop: true, cascade: true });
    snd.ding(i, 0.4); wake();
    if (i === n - 1) {
      cascading = false;
      // The third cascade in a minute is too much for it.
      if (cascades.length >= 3) { cascades = []; setTimeout(crash, 700); }
    }
  }, reduce ? 0 : i * 110);
}
function clearPlate() { clearing = 14; cards.length = 0; cardQueue = []; snd.click(); wake(); }

/* ---------- size ---------- */
let FW = 0, FH = 0;
function resize() {
  const s = fitCanvas(canvas, { budget: 2.4e6 });
  const changed = s.w !== W || s.h !== H;
  W = s.w; H = s.h; dpr = s.dpr; FW = s.W; FH = s.H;
  Object.assign(R.size, { W, H, FW, FH, dpr });
  if (!changed && scene) return;
  if (!deskTex) { deskTex = R.tex(); ghostTex = R.tex(); }
  bake();
  const old = acc;
  [scene, b1, b2].forEach(R.free);
  scene = R.target(FW, FH); acc = R.target(FW, FH);
  b1 = R.target(Math.max(1, FW >> 2), Math.max(1, FH >> 2)); b2 = R.target(b1.w, b1.h);
  R.bindT(acc); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  R.free(old);
  // A switch between phone and desk layouts lays the desktop out again.
  if (!wins.length || phone() !== lastPhone) seedScene();
  else wins.forEach(w => { w.x = clamp(w.x, 4, Math.max(4, W - w.w - 4)); w.y = clamp(w.y, lay.bar + 3, Math.max(lay.bar + 3, H - w.h - 6)); });
  lastPhone = phone();
  layBalloons(); closePopup();
  safeKey = ''; if (overlay) overlay.key = '';
  blurDirty = true;
  wake();
}
function seedScene() {
  [...wins].forEach(killWin);
  const N = C.notices;
  if (phone()) {
    makeWin('nfo', { x: 10, y: lay.bar + 9, w: W - 20, h: 236, background: true });
    makeWin('dialog', { title: 'Notice', head: N.welcome_phone[0], body: N.welcome_phone[1], yes: N.welcome_yes, x: 18, y: H * 0.5, w: W - 36, h: 132 });
  } else {
    makeWin('nfo', { x: W * 0.6, y: H * 0.08, background: true });
    makeWin('files', { x: W * 0.05, y: H * 0.12, background: true });
    makeWin('gauge', { x: W * 0.83, y: H * 0.58, background: true });
    makeWin('dialog', { title: 'Notice', head: N.welcome[0], body: N.welcome[1], yes: N.welcome_yes, no: N.welcome_no, x: W * 0.36, y: H * 0.55, w: 380, h: 132 });
  }
}
function barMoved() {
  if (!deskTex || !W) return;
  const k = lay.key;
  if (measureLay() === k) return;
  bake();
  wins.forEach(w => { w.y = clamp(w.y, lay.bar + 3, Math.max(lay.bar + 3, H - w.h - 6)); });
  layBalloons(); wake();
}

/* ---------- drawing ---------- */
const ptr = { on: false, x: 0, y: 0, dx: 0, dy: 0, lx: 0, ly: 0, run: 0 };
const sparks = [];
let saverState = null, backlight = 1, flickT0 = -1e9, nap = 0;
function render(t) {
  // Smear stamps go on the plate before the live windows draw.
  if (stamps.length) {
    R.bindT(acc); R.premul();
    stamps.forEach(([win, sx, sy]) => R.mesh(win, sx, sy, 1));
    stamps.length = 0; blurDirty = true;
  }
  stampCards();
  if (clearing > 0) {
    R.bindT(acc); gl.enable(gl.BLEND); gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA); R.fade(0.16);
    if (--clearing === 0) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    blurDirty = true;
  }
  // The base: desktop, the face in the bokeh on an old screen, then the plate.
  R.bindT(scene); gl.disable(gl.BLEND); R.copy(deskTex, 1);
  R.premul();
  const ghost = smooth(clamp((opts.age - 0.72) / 0.28)) * 0.55;
  if (ghost > 0.01) R.sprite(ghostTex, 0, 0, W, H, ghost);
  R.copy(acc.t, 0);
  if (blurDirty) { R.blur(scene, b1, b2); blurDirty = false; R.bindT(scene); }
  R.premul();
  for (const win of wins) {
    if (win.state === 'min') continue;
    win.tint = win.skin === 'kid' ? KID_TINT : GLASS_TINT; win.r = win.skin === 'kid' ? KID.r : GLASS.r; win.white = win.frozen ? 1 : 0;
    if (win.state === 'open' && win.alpha > 0.05) R.shadow(win, (drag?.win === win ? 1.25 : 1) * win.alpha);
    R.mesh(win);
  }
  // The OS chrome sits over every window.
  R.mesh(bar);
  if (bar.room) { R.sprite(eye.tex, eye.x, (lay.bar - 18) / 2, 28, 18); R.sprite(clock.tex, clock.x, 0, clock.w, clock.h); }
  R.shadow(dock, 0.7); R.mesh(dock);
  slots.forEach((s, i) => {
    // The glyph fills 86 percent of its canvas; the icon grows upward.
    const k = magNow[i] || 1, z = s.size * k, D = z * 1.16, t = dockIcon[s.glyph], cy = s.y + s.size / 2 - z / 2;
    if (t) R.sprite(t, s.x - D / 2, cy - D / 2, D, D);
  });
  if (popup) { R.shadow(popup, 0.8); R.mesh(popup); }
  balloons.forEach(b => { R.shadow(b, 0.6 * b.alpha); R.mesh(b, 0, 0, b.alpha); });
  if (saverState?.tex && saverState.alpha > 0) R.sprite(saverState.tex, 0, 0, W, H, saverState.alpha);
  if (safe && safeTex) R.sprite(safeTex, 0, 0, W, H);
  if (overlay) R.sprite(overlayTex, 0, 0, W, H, overlay.fade ? 1 - overlay.fade : 1);
  R.glitter(sparks, GLINT);
  drawPointer(t);
  const sh = shakeT > 0 ? shakeT / 0.55 : 0;
  R.post(scene, { age: opts.age, time: reduce ? 0 : t * 0.001, dim: backlight, safe: safe ? 1 : 0, shake: [Math.sin(t * 0.09) * 0.007 * sh, Math.cos(t * 0.07) * 0.005 * sh] });
}
function drawPointer(t) {
  if (!ptr.on || (overlay && overlay.kind !== 'boot' && !overlay.fade)) return;
  const wait = performance.now() < waitUntil || balk;
  if (wait) R.sprite(CUR_TEX.wheel, ptr.dx - 4, ptr.dy - 4, 22, 22, 1, reduce ? 0 : t * 0.012);
  else R.sprite(CUR_TEX.arrow, ptr.dx - 2, ptr.dy - 2, CUR[0], CUR[1]);
}

/* ---------- pointer: tap, drag, hold ---------- */
function at(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function hit(x, y) {
  for (let i = wins.length - 1; i >= 0; i--) {
    const w = wins[i];
    if (w.state !== 'open' || w.closing) continue;
    if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return w;
  }
  return null;
}
const inDock = (x, y) => x >= lay.dockX && x <= lay.dockX + lay.dockW && y >= lay.dockY - 14 && y <= lay.dockY + lay.dockH;
const slotAt = x => slots.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a), slots[0]);
let press = null, lastTap = { t: 0, id: 0, n: 0 }, lastIcon = { t: 0, i: -1 }, holdT = 0;
function track(e) {
  if (e.pointerType !== 'mouse') { if (ptr.on) { ptr.on = false; canvas.style.cursor = ''; } return; }
  const [x, y] = at(e);
  if (!ptr.on) { ptr.dx = ptr.lx = x; ptr.dy = ptr.ly = y; }
  ptr.on = true; ptr.x = x; ptr.y = y; canvas.style.cursor = 'none';
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerleave', () => { if (!press && ptr.on) { ptr.on = false; wake(); } });
canvas.addEventListener('pointerdown', e => {
  const [x, y] = at(e);
  track(e);
  const was = nap;
  wake();
  // The first touch only wakes a sleeping screen.
  if (was) return;
  if (overlay) { overlayTap(); return; }
  if (safe) { safe = 0; say(C.crash.after); return; }
  try { canvas.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer has no capture */ }
  const alt = e.button === 2;
  press = { id: e.pointerId, x0: x, y0: y, t0: performance.now(), win: null, mode: 'press', alt, hx: [[x, y, performance.now()]] };
  if (popup) { press.mode = 'popup'; return; }
  if (y < lay.bar && x > lay.tlR && x < lay.trL) { press.mode = 'bar'; return; }
  if (inDock(x, y)) { press.mode = 'dock'; return; }
  const win = hit(x, y);
  press.win = win;
  if (win) { raise(win); if (focusWin && focusWin !== win) focus(null); }
  else if (focusWin) focus(null);
  // A long touch acts as a right-click.
  if (e.pointerType !== 'mouse') holdT = setTimeout(() => { if (press?.mode === 'press') { press.mode = 'held'; press.alt = true; tap(press.x0, press.y0, press.win, true); } }, 550);
});
canvas.addEventListener('pointermove', e => {
  track(e);
  const [x, y] = at(e);
  if (popup && !press) { const r = popupRow(x, y); const i = r && r !== -1 ? r.i : -1; if (i !== popup.hover) { popup.hover = i; paintPopup(); } }
  if (!press || e.pointerId !== press.id) { if (ptr.on) wake(); return; }
  if (popup && press.mode === 'popup') { const r = popupRow(x, y); const i = r && r !== -1 ? r.i : -1; if (i !== popup.hover) { popup.hover = i; paintPopup(); } }
  const now = performance.now();
  press.hx.push([x, y, now]); if (press.hx.length > 6) press.hx.shift();
  press.px = x; press.py = y;
  if (press.mode === 'press' && Math.hypot(x - press.x0, y - press.y0) > 8) {
    clearTimeout(holdT);
    if (press.win && !press.alt) {
      press.mode = 'drag';
      drag = { win: press.win, gx: press.x0 - press.win.x, gy: press.y0 - press.win.y, t0: now, mouse: e.pointerType === 'mouse' };
      press.win.vx = press.win.vy = 0; press.win.zoomed = null;
      messy = true; snd.rub(true);
    } else press.mode = 'none';
  }
  wake();
});
// A drag follows the drawn pointer, so a pause holds the window too.
function follow() {
  if (!drag || press?.px === undefined) return;
  const win = drag.win, [x, y] = drag.mouse ? [ptr.dx, ptr.dy] : [press.px, press.py];
  win.x = x - drag.gx; win.y = clamp(y - drag.gy, lay.bar + 3 - win.h * 0.6, H - 20);
}
function endPress(e, cancel) {
  if (!press || e.pointerId !== press.id) return;
  clearTimeout(holdT);
  const [x, y] = at(e), now = performance.now(), p = press;
  press = null;
  if (p.mode === 'drag') {
    if (drag.mouse) { balk = 0; ptr.dx = ptr.x; ptr.dy = ptr.y; }
    follow();
    const h = p.hx, a = h[0], b = h[h.length - 1], dt = Math.max(16, b[2] - a[2]) / 1000, win = drag.win;
    drag = null; snd.rub(false);
    // Dropped on the Bin: gone.
    const s = inDock(x, y) && slotAt(x);
    if (!cancel && s?.id === 'bin') binWin(win);
    else if (!cancel && now - b[2] < 80) { win.vx = clamp((b[0] - a[0]) / dt, -2600, 2600); win.vy = clamp((b[1] - a[1]) / dt, -2600, 2600); }
  } else if (!cancel) {
    if (p.mode === 'popup') popupPick(x, y);
    else if (p.mode === 'bar') barTap(x);
    else if (p.mode === 'dock') dockTap(x);
    else if (p.mode === 'press') tap(x, y, p.win, p.alt);
  }
  wake();
}
canvas.addEventListener('pointerup', e => endPress(e, false));
canvas.addEventListener('pointercancel', e => endPress(e, true));
canvas.addEventListener('lostpointercapture', e => endPress(e, true));

function popupPick(x, y) {
  const r = popupRow(x, y), p = popup;
  if (r === null) { closePopup(); const m = y < lay.bar ? barItems.findIndex(b => x >= b.x && x < b.x + b.w) : -1; if (m >= 0 && m !== openMenu) barTap(x); return; }
  if (r === -1) return;
  const item = p.items[r.i];
  closePopup(); snd.click();
  p.onPick?.(item);
}
function barTap(x) {
  if (!bar.room) return;
  if (x >= eye.x && x < eye.x + 28) { eye.blinkT = 0.18; say(pick(C.balloons)); return; }
  const i = barItems.findIndex(b => x >= b.x && x < b.x + b.w);
  if (i < 0) return;
  if (openMenu === i && popup) { closePopup(); return; }
  openMenu = i; paintBar();
  const items = C.menus[barItems[i].title];
  openPopup(items, barItems[i].x, lay.bar + 2, 'menu', it => act(Array.isArray(it) ? it[1] : it));
  openMenu = i; paintBar();
}
function dockTap(x) {
  const s = slotAt(x);
  if (!s || Math.abs(s.x - x) > 26) return;
  snd.tick();
  if (s.id === 'orb') {
    const O = C.orb, items = [...O.apps, '-', ...O.places, '-', [O.shutdown, 'shutdown']];
    const [, h] = menuSize(items);
    openPopup(items, s.x - 20, lay.dockY - h - 8, 'orb', it => act(Array.isArray(it) ? it[1] : it));
    return;
  }
  // A dock icon brings back its folded window, raises an open one, or opens a new one.
  const folded = [...wins].reverse().find(w => w.app === s.id && w.state === 'min' && !w.binned);
  if (folded) return unfold(folded);
  const live = [...wins].reverse().find(w => w.app === s.id && w.state === 'open' && !w.closing);
  if (live && live !== topWin()) { raise(live); wake(); return; }
  open(s.id, { fresh: true });
}
function tap(x, y, win, alt) {
  if (win) {
    const lx = x - win.x, ly = y - win.y, top = win.skin === 'kid' ? KID.top : GLASS.top;
    if (ly < top && !alt) {
      const c = chromeHit(win, lx, ly);
      if (c === 'close') { if (win.app === 'dialog') closeDialog(win); else closeWin(win); return; }
      if (c === 'fold') { fold(win); return; }
      if (c === 'zoom') { zoom(win); return; }
      const now = performance.now();
      if (lastTap.id === win.id && now - lastTap.t < 380) { fold(win); lastTap.t = 0; lastTap.n = 0; return; }
      // Click a title bar six times fast and it stops responding.
      lastTap.n = lastTap.id === win.id && now - lastTap.t < 900 ? lastTap.n + 1 : 1;
      lastTap.t = now; lastTap.id = win.id;
      if (lastTap.n >= 6 && !win.frozen && win.skin !== 'kid') freeze(win);
      snd.click(panOf(win));
      return;
    }
    if (win.frozen) { snd.click(); return; }
    if (win.A.tap?.(win, lx, ly, ctx, alt)) return;
    if (win.A.typing) focus(win);
    snd.click(panOf(win));
    return;
  }
  if (alt) { openPopup(C.context, x, y, 'context', it => act(Array.isArray(it) ? it[1] : it)); return; }
  // Desktop icons open on a double click, or one tap on touch.
  const i = deskIcons.findIndex(d => Math.abs(d.x - x) < 40 && y > d.y - 26 && y < d.y + 52);
  if (i >= 0) {
    const now = performance.now(), touch = !ptr.on;
    if (touch || (lastIcon.i === i && now - lastIcon.t < 420)) { act(deskIcons[i].opens); lastIcon.i = -1; }
    else { lastIcon = { t: now, i }; snd.click(); }
  }
}
function freeze(win) {
  win.frozen = true; win.frozenTag = C.notices.not_responding; repaint(win); snd.crashTone();
  setTimeout(() => { win.frozen = false; repaint(win); wake(); }, 5000);
}
function overlayTap() {
  const o = overlay;
  if (o.kind === 'boot') { if (o.run) o.fade ||= 0.01; return; }
  if (o.t < 0.6) return;
  endOverlay();
}

/* ---------- keyboard: the focused app, codes and a salute ---------- */
field.addEventListener('keydown', e => {
  const w = focusWin;
  if (!w) return;
  if (e.key === 'Escape') { focus(null); return; }
  if (['Backspace', 'Enter', 'ArrowUp', 'ArrowDown'].includes(e.key) && w.A.key?.(w, e.key, ctx)) { e.preventDefault(); wake(); }
});
field.addEventListener('input', () => {
  const w = focusWin, s = field.value; field.value = '';
  if (w && s) { w.A.type?.(w, s, ctx); wake(); }
});
document.addEventListener('keydown', e => {
  if (overlay && !e.metaKey && !e.ctrlKey) { if (overlay.kind !== 'boot') overlayTap(); else overlayTap(); return; }
  if (e.key === 'Escape') { closePopup(); if (safe) safe = 0; }
  // The three-finger salute opens the Task Manager.
  if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); open('taskmgr'); say('Nice try.'); return; }
  if (e.target === field) return;
  konami.push(e.key.length === 1 ? e.key.toLowerCase() : e.key); if (konami.length > KONAMI.length) konami.shift();
  if (konami.join() === KONAMI.join()) { konami.length = 0; cheatsOn(); }
});
function cheatsOn() {
  cheats = true; say(C.crash.cheats);
  wins.forEach(w => { if (w.state === 'open') { w.vx = (Math.random() - 0.5) * 1800; w.vy = (Math.random() - 0.5) * 1400; } });
  for (let i = 0; i < 120 && sparks.length < 260; i++) sparks.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 80, life: 1, rate: 0.6 + Math.random(), s: 6 + Math.random() * 8, c: (Math.random() * 3) | 0, ph: Math.random() * 6 });
  wake();
}

/* ---------- the haunt: a tidy-up, a saver, a pause ---------- */
let messy = false, hiddenAt = 0, aways = 0, balk = 0, balked = false;
function place(win, x, y) {
  win.x = clamp(x, 4, Math.max(4, W - win.w - 4)); win.y = clamp(y, lay.bar + 3, Math.max(lay.bar + 3, H - win.h - 6));
  win.vx = win.vy = 0; win.lsx = undefined;
  for (let k = 0; k < NV; k++) { win.pos[k * 2] = win.x + UVS[k * 2] * win.w; win.pos[k * 2 + 1] = win.y + UVS[k * 2 + 1] * win.h; win.vel[k * 2] = win.vel[k * 2 + 1] = 0; }
}
// Back from a hidden tab: the desk sits tidied, and a dialog says so.
function tidy() {
  messy = false;
  wins.filter(w => w.app === 'dialog').forEach(killWin);
  R.bindT(acc); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); clearing = 0; cards.length = 0; blurDirty = true;
  const gap = phone() ? 22 : 30;
  wins.filter(w => w.state === 'open').sort((a, b) => b.w * b.h - a.w * a.h).forEach((w, i) => { place(w, (phone() ? 10 : 24) + i * gap, lay.bar + 11 + i * gap); raise(w); });
  const list = C.away || [], [head, body] = list[Math.min(aways++, list.length - 1)] || ['', ''];
  setTimeout(() => { if (!document.hidden) { notice(head, body, { yes: 'Thanks' }); wake(); } }, 700);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = performance.now(); return; }
  if (opts.haunt && messy && hiddenAt && performance.now() - hiddenAt > T.away && scene && !overlay) tidy();
});
// The line-up saver: windows drift into one line, row or column by aspect.
function lineUp() {
  const list = wins.filter(w => w.state === 'open' && !w.closing && drag?.win !== w).sort((a, b) => a.id - b.id), n = list.length;
  if (!n) return;
  const row = W >= H, last = list[n - 1], span = Math.max(0, row ? W - 32 - last.w : H - 90 - last.h);
  list.forEach((w, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    w.tx = row ? 16 + span * t : (W - w.w) / 2; w.ty = row ? Math.max(lay.bar + 15, H * 0.34 - w.h / 2) : lay.bar + 9 + span * t;
    w.tk = 0.26 + ((w.id * 7) % 5) * 0.03;
    if (reduce) place(w, w.tx, w.ty);
  });
}
let saverN = (Math.random() * 6) | 0;
function startSaver() {
  const list = (C.savers || ['lineup']).filter(Boolean);
  let kind = reduce ? 'lineup' : list[(saverN++) % list.length];
  if (kind === 'lineup') { lineUp(); return; }
  const s = makeSaver(kind, W, H, C, () => snd.corner());
  if (!s) { lineUp(); return; }
  saverState = { ...s, tex: R.tex(), alpha: 0, acc: 1 };
}
function stopSaver() { if (saverState) saverState.out = true; }
function sleepNow() { closePopup(); focus(null); lastInput = performance.now() - SAVER; clearTimeout(napT); saver(); }

/* ---------- frame loop: lively, drifting, asleep ---------- */
// nap: 0 awake, 1 saver, 2 dimming, 3 standby.
const DIM = 0.14, DIM_MS = 1500, SAVER = T.saver, STANDBY = T.standby;
let raf = 0, visible = true, last = 0, lastInput = performance.now(), lastDraw = 0, napT = 0, dimT0 = 0;
function kick() { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } }
function wake() {
  lastInput = performance.now();
  if (nap) rouse();
  clearTimeout(napT); napT = setTimeout(saver, SAVER);
  kick();
}
function rouse() {
  // Input after standby wakes the backlight with a small flicker.
  if (nap >= 2 && !reduce) flickT0 = performance.now();
  nap = 0; backlight = 1; stopSaver();
  wins.forEach(w => { w.tx = undefined; });
}
function saver() {
  if (!visible) return;
  nap = 1;
  if (opts.haunt && !overlay) startSaver();
  napT = setTimeout(() => { if (visible) { nap = 2; dimT0 = performance.now(); kick(); } }, STANDBY - SAVER);
  kick();
}
function flicker(t) { return t < 60 ? 0.3 : t < 110 ? 1 : t < 170 ? 0.55 : t < 260 ? 1.04 : 1; }
let shown = false;
function frame(now) {
  raf = 0;
  if (!scene) return;
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  let busy = !!drag || clearing > 0 || cascading;
  try {
    // The drawn pointer follows the hand, except for one pause per visit.
    if (ptr.on) {
      if (drag?.mouse && opts.haunt && !balked && now - drag.t0 > 700 && now > T.pause) { balked = true; balk = now; }
      if (balk && now - balk > 480) {
        const k = 1 - Math.exp(-dt * 14);
        ptr.dx += (ptr.x - ptr.dx) * k; ptr.dy += (ptr.y - ptr.dy) * k;
        if (Math.hypot(ptr.x - ptr.dx, ptr.y - ptr.dy) < 0.5) balk = 0;
      } else if (!balk) { ptr.dx = ptr.x; ptr.dy = ptr.y; }
      if (ptr.dx !== ptr.lx || ptr.dy !== ptr.ly) {
        busy = true;
        // The kid's glitter trail: about one spark per seven pixels.
        if (!reduce) {
          const d = Math.hypot(ptr.dx - ptr.lx, ptr.dy - ptr.ly); ptr.run += d;
          for (; ptr.run > 7 && sparks.length < 220; ptr.run -= 7) {
            const t = Math.random();
            sparks.push({ x: lerp(ptr.lx, ptr.dx, t) + (Math.random() - 0.5) * 6, y: lerp(ptr.ly, ptr.dy, t) + 6 + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 25, life: 1, rate: 1 / (0.45 + Math.random() * 0.45),
              s: 5 + Math.random() * 5, c: (Math.random() * 3) | 0, ph: Math.random() * 6.3 });
          }
          ptr.run = Math.min(ptr.run, 7);
        }
        ptr.lx = ptr.dx; ptr.ly = ptr.dy;
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt * p.rate; p.vy += 80 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); }
    }
    if (sparks.length) busy = true;
    follow();
    // The eye follows the pointer and blinks now and then.
    const ex = eye.x + 14, ey = lay.bar / 2;
    if (ptr.on) { const dx = ptr.dx - ex, dy = ptr.dy - ey, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 200); eye.look = [dx / d * k, dy / d * k]; }
    eye.nextBlink -= dt;
    if (eye.nextBlink <= 0 && !reduce) { eye.blinkT = 0.18; eye.nextBlink = 3 + Math.random() * 5; }
    if (eye.blinkT > 0) { eye.blinkT = Math.max(0, eye.blinkT - dt); eye.open = Math.abs(eye.blinkT / 0.09 - 1); busy = true; } else eye.open = nap >= 2 ? 0.15 : 1;
    if (eye.mood > 0) { eye.mood = Math.max(0, eye.mood - dt / 6); }
    paintEye();
    // Dock icons swell under the pointer.
    const want = mag(slots);
    magNow = want.map((v, i) => { const c = magNow[i] ?? 1, n = reduce ? v : c + (v - c) * Math.min(1, dt * 14); if (Math.abs(n - v) > 0.002) busy = true; return n; });
    if (dock.key !== [...new Set(wins.filter(w => !w.closing && w.app !== 'dialog').map(w => w.app))].join()) paintDock();
    // Line-up and Tidy ease each window toward its place.
    if (arranging > 0) { arranging -= dt; busy = true; if (arranging <= 0) wins.forEach(w => { if (!nap) w.tx = undefined; }); }
    if (nap || arranging > 0) for (const w of wins) if (w.tx !== undefined && w.state === 'open' && drag?.win !== w) {
      const k = 1 - Math.exp(-dt * w.tk);
      w.x += (w.tx - w.x) * k; w.y += (w.ty - w.y) * k;
    }
    if (nap === 2) {
      const k = (now - dimT0) / DIM_MS;
      backlight = reduce ? DIM : lerp(1, DIM, smooth(clamp(k)));
      if (reduce || k >= 1) { nap = 3; snd.music(false); }
    }
    const ft = now - flickT0;
    if (ft < 300) { backlight = flicker(ft); busy = true; } else if (!nap) backlight = 1;
    for (const win of [...wins]) {
      if (step(win, dt) && win.busy) busy = true;
      if (win.A.tick && wins.includes(win) && win.state === 'open' && win.A.tick(win, dt, ctx)) busy = true;
      if (win.dirty && wins.includes(win)) paintWin(win);
    }
    // Smear: stamp the moving window along its path; a frozen one always smears.
    for (const win of wins) {
      if (win.state !== 'open' || win.closing || (mode() !== 'smear' && !win.frozen)) continue;
      const moving = drag?.win === win || Math.abs(win.vx) + Math.abs(win.vy) > 30;
      if (!moving) { win.lsx = undefined; continue; }
      if (win.lsx === undefined) { win.lsx = win.x; win.lsy = win.y; continue; }
      const gap = opts.trail === 'sparse' ? 14 : 5;
      const d = Math.hypot(win.x - win.lsx, win.y - win.lsy), n = Math.min(14, Math.floor(d / gap));
      for (let j = 1; j <= n; j++) {
        const t = j / n;
        stamps.push([win, lerp(win.lsx, win.x, t) - win.x, lerp(win.lsy, win.y, t) - win.y]);
      }
      if (n) { win.lsx = win.x; win.lsy = win.y; }
    }
    if (drag) { const h = press?.hx; let sp = 0; if (h && h.length > 1) { const a = h[0], b = h[h.length - 1]; sp = Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(16, b[2] - a[2]); } snd.rubSpeed(sp); }
    if (stepCards(dt)) busy = true;
    // Popups fade in; balloons live six seconds.
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i]; b.life -= dt;
      b.alpha = Math.min(1, b.alpha + dt * 5, b.life / 0.4);
      if (b.life <= 0) { balloons.splice(i, 1); layBalloons(); }
      busy = true;
    }
    if (opts.haunt && !nap && !overlay && now > nextBalloon) { nextBalloon = now + T.balloon * (0.7 + Math.random() * 0.8); balloonNow(); }
    if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); busy = true; }
    if (waitUntil > performance.now()) busy = true;
    // The overlay: the boot runs, the crash counts up, the curtain drops.
    if (overlay) {
      const o = overlay;
      if (o.kind !== 'boot' || o.run) o.t += dt;
      if (o.kind === 'boot' && o.run && o.t > (reduce ? 0.3 : o.len)) o.fade ||= 0.01;
      if (o.fade) { o.fade += dt / 0.45; if (o.fade >= 1) { overlay = null; if (contentError) { notice(...corrupt(contentError)); contentError = null; } } }
      if (o.kind === 'crash') o.n = Math.min(100, Math.floor(o.t * 26));
      if (o.kind === 'off' && o.t > 4) endOverlay();
      if (overlay) { paintOverlay(); busy = true; }
    }
    if (safe) paintSafe();
    // The saver draws at 30 fps and fades in and out.
    if (saverState) {
      const s = saverState;
      s.alpha = clamp(s.alpha + (s.out ? -dt / 0.3 : dt / 1));
      if (s.out && s.alpha <= 0) saverState = null;
      else if (nap < 3) { s.acc += dt; if (s.acc > 1 / 30) { s.step(s.acc); s.acc = 0; R.upload(s.tex, s.canvas); } busy = true; }
    }
    paintClock();
    // Drifting grain runs at 30 fps; standby stops the loop.
    if (busy || nap === 3 || now - lastDraw > 31) { render(now); lastDraw = now; if (!shown) { shown = true; mark('first-frame'); } }
    if (busy || (!reduce && nap < 3)) raf = requestAnimationFrame(frame);
    else snd.kit.rest(() => !raf);
  } catch (err) { raf = 0; throw err; }
}
whenVisible(stage, v => { visible = v; if (v) wake(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });

/* ---------- start ---------- */
const [content] = await Promise.all([
  loadContent(),
  ...['600 12px Gabarito', '700 12px Gabarito', `500 12px ${MONO}`, `700 12px ${MONO}`].map(f => document.fonts.load(f).catch(() => {})),
]);
C = content.C; contentError = content.error;
new ResizeObserver(() => resize()).observe(stage);
// A bar that arrives, wraps or moves lays the desktop out again.
ui.onCover(() => barMoved());
// A new quality rebuilds the targets at the new pixel ratio.
onQuality(() => { W = 0; resize(); });
resize();
if (opts.boot && !reduce) boot();
else if (contentError) { notice(...corrupt(contentError)); contentError = null; }
// QA reads the state with ?qa.
if (new URLSearchParams(location.search).has('qa')) window.__shadyos = { wins, act, say, open, tidy, saver: sleepNow, cheatsOn, get overlay() { return overlay; }, get popup() { return popup; }, lay, get barItems() { return barItems; }, get nap() { return nap; }, ctx,
  // A hidden pane stops rAF; pump drives frames by timer for checks.
  pump(ms = 1000) { const end = performance.now() + ms; const go = () => { cancelAnimationFrame(raf); raf = 0; frame(performance.now()); cancelAnimationFrame(raf); raf = 0; if (performance.now() < end) setTimeout(go, 16); }; go(); },
  spook: () => { spookAt = 0; } };
