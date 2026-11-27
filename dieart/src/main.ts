// Die art: physically-based WebGL2 metallurgical optical microscope over silicon dies.

import {
  audioKit,
  fitCanvas,
  initPage,
  onQuality,
  onReducedChange,
  pageReady,
  reduced,
  stage as mark,
  whenVisible,
} from '../../shared/stim.js';
import { intro as playIntro } from '../../shared/intro.js';
import {
  bind,
  free,
  linked,
  onContextLoss,
  program,
  renderable,
  target,
  tri,
  TRI_VS,
  type Prog,
  type Target,
} from '../../shared/gl.js';
import {
  CHIP_BY_ID,
  CHIPS,
  focusNormToUm,
  focusPlaneLabel,
  FOV_MAX_UM,
  FOV_MIN_UM,
  magFromFov,
  MODE_INDEX,
  naFromMag,
  nearestObjective,
  OBJECTIVE_BY_KEY,
  OBJECTIVES,
  PAN_LIMIT_UM,
  type ChipId,
  type IlluminationMode,
  type ObjectiveKey,
} from './chips.ts';
import { DIE_FS, OPTICS_FS } from './shaders.ts';
import { createMicroscopeSound } from './sound.ts';

mark('libs');

const ID = 'dieart';
const STORE_CHIP = `stimming.${ID}.chip`;

/* ---------- subtle monochrome/optical Bar v3 mode icons ---------- */
const MODE_ICONS: Record<IlluminationMode, string> = {
  brightfield:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="oklch(0.86 0.02 90)" stroke="currentColor" stroke-width="1.4"/></svg>',
  darkfield:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="oklch(0.12 0.01 265)" stroke="oklch(0.92 0.04 90)" stroke-width="1.8"/><circle cx="12" cy="12" r="3.4" fill="none" stroke="oklch(0.82 0.09 80)" stroke-width="1.2"/></svg>',
  dic:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="da-dic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.92 0.06 88)"/><stop offset="0.52" stop-color="oklch(0.54 0.02 270)"/><stop offset="1" stop-color="oklch(0.24 0.04 265)"/></linearGradient></defs><circle cx="12" cy="12" r="7" fill="url(#da-dic)" stroke="currentColor" stroke-width="1.3"/></svg>',
  nir:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="oklch(0.32 0.01 260)" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 12h7M12 8.5v7" stroke="oklch(0.9 0.01 260)" stroke-width="1.3"/></svg>',
};

/* ---------- state ---------- */
function savedChip(): ChipId {
  try {
    const v = localStorage.getItem(STORE_CHIP);
    if (v === 'nmos79' || v === 'cmos94' || v === 'rfsoc') return v;
  } catch { /* ignore storage errors */ }
  return 'nmos79';
}

let chipId: ChipId = savedChip();
let mode: IlluminationMode = 'brightfield';
let isReduced = reduced();
let autoFocus = true;
let showScale = true;

// Stage position (microns), zoom (half-FOV in microns), focal plane (normalized 0..1), condenser tilt.
const initChip = CHIP_BY_ID[chipId];
const camCur = { x: initChip.startX, y: initChip.startY, fov: 27000 / initChip.startMag };
const camTgt = { x: initChip.startX, y: initChip.startY, fov: 27000 / initChip.startMag };

// Ideal focus norm for the active metal surface (~2.1 um).
const AUTO_FOCUS_NORM = 0.48;
let focusCur = AUTO_FOCUS_NORM;
let focusTgt = AUTO_FOCUS_NORM;
let lastFocusBucket = -1;

const tiltCur = { x: 0.18, y: 0.22 };
const tiltTgt = { x: 0.18, y: 0.22 };

// Smooth mode blend weights: [Brightfield, Darkfield, DIC, NIR].
const modeCur = [1, 0, 0, 0];
const modeTgt = [1, 0, 0, 0];

/* ---------- sound ---------- */
const kit = audioKit({
  keys: new Set(['1', '2', '3', '4', 'c', 'C', 'o', 'O', 'r', 'R', 'q', 'Q', 'e', 'E', 'f', 'F']),
  sleepMs: 1200,
});
const sfx = createMicroscopeSound(kit);

/* ---------- DOM ---------- */
const stageEl = document.getElementById('stage')!;
const failEl = stageEl.querySelector('.fail') as HTMLElement;
const scaleHudEl = document.getElementById('da-scale-hud')!;
const scaleChipEl = document.getElementById('da-scale-chip')!;
const scaleOptEl = document.getElementById('da-scale-opt')!;
const scaleBarEl = document.getElementById('da-scale-bar')!;
const scaleValEl = document.getElementById('da-scale-val')!;

const canvas = document.createElement('canvas');
stageEl.prepend(canvas);

/* ---------- scale bar calculation (nice optical 1-2-5 sequence) ---------- */
const NICE_UM = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
let lastHudText = '';

function updateScaleHud() {
  if (!showScale) return;
  const hCss = Math.max(1, stageEl.clientHeight);
  const umPerCssPx = (2 * camCur.fov) / hCss;
  const wantUm = umPerCssPx * 92; // aim for ~92 px physical bar
  let pick = NICE_UM[NICE_UM.length - 1];
  for (const n of NICE_UM) {
    if (n >= wantUm * 0.72) {
      pick = n;
      break;
    }
  }
  const barPx = Math.max(28, Math.min(132, Math.round(pick / Math.max(0.01, umPerCssPx))));
  const valStr = pick >= 1000 ? `${pick / 1000} mm` : `${pick} μm`;
  const mag = magFromFov(camCur.fov);
  const na = naFromMag(mag);
  const zUm = focusNormToUm(focusCur);
  const chip = CHIP_BY_ID[chipId];
  const optStr = `${Math.round(mag)}× · NA ${na.toFixed(2)} · ${focusPlaneLabel(zUm)}`;
  const key = `${chip.shortLabel}|${optStr}|${barPx}|${valStr}`;
  if (key === lastHudText) return;
  lastHudText = key;

  scaleChipEl.textContent = `${chip.shortLabel} · ${chip.process}`;
  scaleOptEl.textContent = optStr;
  scaleBarEl.style.width = `${barPx}px`;
  scaleValEl.textContent = valStr;
}

/* ---------- setters ---------- */
function setMode(next: IlluminationMode, silent = false) {
  mode = next;
  const idx = MODE_INDEX[next];
  for (let i = 0; i < 4; i++) modeTgt[i] = i === idx ? 1 : 0;
  if (isReduced) {
    for (let i = 0; i < 4; i++) modeCur[i] = modeTgt[i];
  }
  if (!silent) sfx.filterClick();
  wake();
}

function setChip(next: ChipId, silent = false) {
  chipId = next;
  try { localStorage.setItem(STORE_CHIP, next); } catch { /* ignore */ }
  const spec = CHIP_BY_ID[next];
  camTgt.x = spec.startX;
  camTgt.y = spec.startY;
  camTgt.fov = 27000 / spec.startMag;
  if (autoFocus) {
    focusTgt = AUTO_FOCUS_NORM;
    ui.slider?.set(focusTgt, false);
  }
  if (isReduced) {
    camCur.x = camTgt.x;
    camCur.y = camTgt.y;
    camCur.fov = camTgt.fov;
    focusCur = focusTgt;
  }
  ui.setting('chip')?.set(next, false);
  ui.setting('objective')?.set(nearestObjective(camTgt.fov).key, false);
  if (!silent) sfx.stageSwap();
  wake();
}

function nextChip() {
  const idx = (CHIP_BY_ID[chipId].index + 1) % CHIPS.length;
  setChip(CHIPS[idx].id);
}

function setObjective(key: ObjectiveKey, silent = false) {
  const ob = OBJECTIVE_BY_KEY[key];
  if (!ob) return;
  camTgt.fov = ob.fovHalfUm;
  if (isReduced) camCur.fov = ob.fovHalfUm;
  ui.setting('objective')?.set(key, false);
  if (!silent) sfx.turretClick(0.86 + OBJECTIVES.indexOf(ob) * 0.08);
  wake();
}

function nextObjective() {
  const cur = nearestObjective(camTgt.fov);
  const idx = (OBJECTIVES.indexOf(cur) + 1) % OBJECTIVES.length;
  setObjective(OBJECTIVES[idx].key);
}

function resetView() {
  const spec = CHIP_BY_ID[chipId];
  camTgt.x = spec.startX;
  camTgt.y = spec.startY;
  camTgt.fov = 27000 / spec.startMag;
  tiltTgt.x = 0.18;
  tiltTgt.y = 0.22;
  focusTgt = AUTO_FOCUS_NORM;
  autoFocus = true;
  if (isReduced) {
    camCur.x = camTgt.x;
    camCur.y = camTgt.y;
    camCur.fov = camTgt.fov;
    tiltCur.x = tiltTgt.x;
    tiltCur.y = tiltTgt.y;
    focusCur = focusTgt;
  }
  ui.slider?.set(focusTgt, false);
  ui.setting('autofocus')?.set(true, false);
  ui.setting('condenser')?.set(0.18, false);
  ui.setting('objective')?.set(nearestObjective(camTgt.fov).key, false);
  sfx.turretClick(0.9);
  wake();
}

function clampStage() {
  camTgt.fov = Math.max(FOV_MIN_UM, Math.min(FOV_MAX_UM, camTgt.fov));
  camTgt.x = Math.max(-PAN_LIMIT_UM, Math.min(PAN_LIMIT_UM, camTgt.x));
  camTgt.y = Math.max(-PAN_LIMIT_UM, Math.min(PAN_LIMIT_UM, camTgt.y));
}

/* ---------- Bar v2/v3 ---------- */
const ui = initPage({
  id: ID,
  bar: {
    choice: {
      label: 'Light',
      value: 'brightfield',
      options: [
        { value: 'brightfield', label: 'Brightfield', icon: MODE_ICONS.brightfield, key: '1' },
        { value: 'darkfield',   label: 'Darkfield',   icon: MODE_ICONS.darkfield,   key: '2' },
        { value: 'dic',         label: 'DIC',         icon: MODE_ICONS.dic,         key: '3' },
        { value: 'nir',         label: 'NIR 1050',    icon: MODE_ICONS.nir,         key: '4' },
      ],
      onPick: (v: string) => setMode(v as IlluminationMode),
    },
    slider: {
      label: 'Focus',
      min: 0,
      max: 1,
      step: 0.005,
      value: focusTgt,
      onInput: (v: number) => {
        focusTgt = v;
        if (isReduced) focusCur = v;
        autoFocus = false;
        ui.setting('autofocus')?.set(false, false);
        const bucket = Math.floor(v * 14);
        if (bucket !== lastFocusBucket) {
          lastFocusBucket = bucket;
          sfx.focusTick(bucket);
        }
        wake();
      },
    },
    actions: [
      { verb: 'chip', label: 'Chip', key: 'C', onPress: nextChip },
      { verb: 'turret', label: 'Objective', key: 'O', onPress: nextObjective },
      { verb: 'reset', label: 'Reset', key: 'R', onPress: resetView },
    ],
    settings: [
      {
        type: 'choice',
        id: 'chip',
        group: 'Specimen',
        label: 'Die',
        display: 'segments',
        value: chipId,
        options: CHIPS.map(c => ({ value: c.id, label: c.shortLabel })),
        onPick: (v: string) => setChip(v as ChipId),
      },
      {
        type: 'choice',
        id: 'objective',
        group: 'Optics',
        label: 'Objective',
        display: 'segments',
        value: nearestObjective(camTgt.fov).key,
        options: OBJECTIVES.map(o => ({ value: o.key, label: o.label })),
        onPick: (v: string) => setObjective(v as ObjectiveKey),
      },
      {
        type: 'slider',
        id: 'condenser',
        group: 'Optics',
        label: 'Condenser tilt',
        min: -1,
        max: 1,
        step: 0.02,
        value: tiltTgt.x,
        onInput: (v: number) => {
          tiltTgt.x = v;
          if (isReduced) tiltCur.x = v;
          wake();
        },
      },
      {
        type: 'toggle',
        id: 'autofocus',
        group: 'Optics',
        label: 'Auto-focus',
        value: true,
        persist: true,
        onToggle: (v: boolean) => {
          autoFocus = v;
          if (v) {
            focusTgt = AUTO_FOCUS_NORM;
            ui.slider?.set(focusTgt, false);
          }
          wake();
        },
      },
      {
        type: 'toggle',
        id: 'scale',
        group: 'Optics',
        label: 'Scale bar',
        value: true,
        persist: true,
        onToggle: (v: boolean) => {
          showScale = v;
          scaleHudEl.hidden = !v;
          if (v) updateScaleHud();
        },
      },
    ],
    quality: true,
    keys: [
      ['drag', 'pan stage'],
      ['scroll', 'zoom'],
      ['shift+drag', 'tilt light'],
      ['q / e', 'focus'],
    ],
    help: [
      ['drag', 'Pan the X-Y micrometer stage'],
      ['scroll', 'Zoom smoothly from 4× to 160×'],
      ['pinch', 'Zoom on touchscreens'],
      ['double-click', 'Step in to 50× macro or back out'],
      ['shift+drag', 'Tilt condenser / Wollaston prism angle'],
      ['q / e', 'Rack fine focus across silicon, metal and wirebonds'],
      ['1 – 4', 'Switch Brightfield, Darkfield, DIC or NIR 1050 nm'],
      ['c / o', 'Swap silicon die or click objective turret'],
    ],
  },
});

const introDone = playIntro({ ready: pageReady() });

/* ---------- WebGL2 optical pipeline ---------- */
const gl = canvas.getContext('webgl2', {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false,
});

if (!gl) {
  failEl.hidden = false;
  mark('first-frame');
  throw new Error('WebGL 2 is required for Die art.');
}

interface GLState {
  die: Prog;
  optics: Prog;
  vao: WebGLVertexArrayObject;
  rt: Target;
  fmt: number;
}

let glState: GLState | null = null;
let visible = true;
let contextLost = false;
let rafId = 0;
let lastMs = 0;
let dirty = true;

function pickFormat(ctx: WebGL2RenderingContext): number {
  ctx.getExtension('EXT_color_buffer_float');
  if (renderable(ctx, ctx.RGBA16F)) return ctx.RGBA16F;
  return ctx.RGBA8;
}

function allocTarget(ctx: WebGL2RenderingContext, fmt: number): Target {
  const w = Math.max(2, ctx.canvas.width);
  const h = Math.max(2, ctx.canvas.height);
  return target(ctx, w, h, { format: fmt, filter: ctx.LINEAR, check: true });
}

async function initGL(ctx: WebGL2RenderingContext): Promise<GLState> {
  const progs = await linked(ctx, {
    die: program(ctx, TRI_VS, DIE_FS),
    optics: program(ctx, TRI_VS, OPTICS_FS),
  });
  const vao = ctx.createVertexArray();
  if (!vao) throw new Error('Could not create VAO.');
  const fmt = pickFormat(ctx);
  fitCanvas(canvas, { maxDpr: 2, budget: 2.4e6 });
  const rt = allocTarget(ctx, fmt);
  return { die: progs.die, optics: progs.optics, vao, rt, fmt };
}

function resizeGL() {
  if (!gl || !glState || contextLost) return;
  const prevW = canvas.width;
  const prevH = canvas.height;
  fitCanvas(canvas, { maxDpr: 2, budget: 2.4e6 });
  if (canvas.width !== prevW || canvas.height !== prevH || glState.rt.w !== canvas.width || glState.rt.h !== canvas.height) {
    free(gl, glState.rt);
    glState.rt = allocTarget(gl, glState.fmt);
  }
  updateScaleHud();
  wake();
}

function render(nowMs: number) {
  if (!gl || !glState || contextLost) return;
  try {
    const w = canvas.width;
    const h = canvas.height;
    const tSec = nowMs * 0.001;
    const mag = magFromFov(camCur.fov);
    const na = naFromMag(mag);
    const focusUm = focusNormToUm(focusCur);

    // Pass 1: Physical multi-layer die lithography + illumination into offscreen float target.
    const dProg = glState.die;
    gl.useProgram(dProg.p);
    gl.uniform2f(dProg.u.uRes, w, h);
    gl.uniform2f(dProg.u.uCamUm, camCur.x, camCur.y);
    gl.uniform1f(dProg.u.uFovHalfUm, camCur.fov);
    gl.uniform1f(dProg.u.uFocusUm, focusUm);
    gl.uniform1f(dProg.u.uNA, na);
    gl.uniform1i(dProg.u.uChip, CHIP_BY_ID[chipId].index);
    gl.uniform4f(dProg.u.uModeW, modeCur[0], modeCur[1], modeCur[2], modeCur[3]);
    gl.uniform2f(dProg.u.uTilt, tiltCur.x, tiltCur.y);
    tri(gl, glState.rt, glState.vao);

    // Pass 2: Optical PSF bokeh, Kohler falloff, edge chromatic dispersion, CMOS micro-grain, tonemap.
    const oProg = glState.optics;
    gl.useProgram(oProg.p);
    bind(gl, oProg, 'uSrc', 0, glState.rt);
    gl.uniform2f(oProg.u.uRes, w, h);
    gl.uniform1f(oProg.u.uTime, tSec);
    gl.uniform1f(oProg.u.uReduced, isReduced ? 1.0 : 0.0);
    gl.uniform1f(oProg.u.uDarkfield, modeCur[1]);
    tri(gl, null, glState.vao);
  } finally {
    gl.bindVertexArray(null);
  }
}

function step(dt: number): boolean {
  const k = isReduced ? 1 : 1 - Math.exp(-dt * 14);
  const kMode = isReduced ? 1 : 1 - Math.exp(-dt * 11);

  camCur.x += (camTgt.x - camCur.x) * k;
  camCur.y += (camTgt.y - camCur.y) * k;
  // Log-space FOV interpolation feels optically constant-velocity across 5x..100x.
  const logCur = Math.log(camCur.fov);
  const logTgt = Math.log(camTgt.fov);
  camCur.fov = Math.exp(logCur + (logTgt - logCur) * k);

  focusCur += (focusTgt - focusCur) * k;
  tiltCur.x += (tiltTgt.x - tiltCur.x) * k;
  tiltCur.y += (tiltTgt.y - tiltCur.y) * k;

  let modeDelta = 0;
  for (let i = 0; i < 4; i++) {
    modeCur[i] += (modeTgt[i] - modeCur[i]) * kMode;
    modeDelta += Math.abs(modeTgt[i] - modeCur[i]);
  }

  const moving =
    Math.abs(camTgt.x - camCur.x) > 0.08 ||
    Math.abs(camTgt.y - camCur.y) > 0.08 ||
    Math.abs(logTgt - Math.log(camCur.fov)) > 0.0004 ||
    Math.abs(focusTgt - focusCur) > 0.0004 ||
    Math.abs(tiltTgt.x - tiltCur.x) > 0.0008 ||
    Math.abs(tiltTgt.y - tiltCur.y) > 0.0008 ||
    modeDelta > 0.001;

  if (!moving) {
    camCur.x = camTgt.x;
    camCur.y = camTgt.y;
    camCur.fov = camTgt.fov;
    focusCur = focusTgt;
    tiltCur.x = tiltTgt.x;
    tiltCur.y = tiltTgt.y;
    for (let i = 0; i < 4; i++) modeCur[i] = modeTgt[i];
  }
  return moving;
}

function tick(nowMs: number) {
  rafId = 0;
  if (!visible || contextLost || !glState) return;
  const dt = lastMs ? Math.min(0.05, (nowMs - lastMs) * 0.001) : 1 / 60;
  lastMs = nowMs;

  const stillMoving = step(dt);
  updateScaleHud();
  render(nowMs);
  dirty = false;

  if (stillMoving) {
    rafId = requestAnimationFrame(tick);
  } else {
    lastMs = 0;
  }
}

function wake() {
  dirty = true;
  if (!visible || contextLost || !glState || rafId) return;
  rafId = requestAnimationFrame(tick);
}

/* ---------- pointer, wheel, pinch & keyboard stage input ---------- */
interface ActivePtr {
  x: number;
  y: number;
  startX: number;
  startY: number;
  tiltMode: boolean;
}
const pointers = new Map<number, ActivePtr>();
let pinchDist0 = 0;
let pinchFov0 = 0;
let lastTapAt = 0;
let lastTapX = 0;
let lastTapY = 0;

function screenToWorldOffset(clientX: number, clientY: number, fovHalfUm: number): { dx: number; dy: number } {
  const rect = canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
  const ny = 1 - ((clientY - rect.top) / Math.max(1, rect.height)) * 2;
  const aspect = rect.width / Math.max(1, rect.height);
  return { dx: nx * aspect * fovHalfUm, dy: ny * fovHalfUm };
}

function zoomAtClient(clientX: number, clientY: number, scaleFactor: number) {
  const before = screenToWorldOffset(clientX, clientY, camTgt.fov);
  const nextFov = Math.max(FOV_MIN_UM, Math.min(FOV_MAX_UM, camTgt.fov * scaleFactor));
  const after = screenToWorldOffset(clientX, clientY, nextFov);
  camTgt.x += before.dx - after.dx;
  camTgt.y += before.dy - after.dy;
  camTgt.fov = nextFov;
  clampStage();
  ui.setting('objective')?.set(nearestObjective(camTgt.fov).key, false);
  wake();
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  const tiltMode = e.button === 2 || e.shiftKey;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, tiltMode });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist0 = Math.hypot(a.x - b.x, a.y - b.y);
    pinchFov0 = camTgt.fov;
  } else {
    stageEl.classList.add(tiltMode ? 'tilting' : 'dragging');
  }
});

canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;

  if (pointers.size === 2) {
    p.x = e.clientX;
    p.y = e.clientY;
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist0 > 10 && dist > 10) {
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const wantFov = Math.max(FOV_MIN_UM, Math.min(FOV_MAX_UM, pinchFov0 * (pinchDist0 / dist)));
      zoomAtClient(mx, my, wantFov / camTgt.fov);
    }
    return;
  }

  const dxPx = e.clientX - p.x;
  const dyPx = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;

  if (p.tiltMode) {
    tiltTgt.x = Math.max(-1, Math.min(1, tiltTgt.x + dxPx * 0.006));
    tiltTgt.y = Math.max(-1, Math.min(1, tiltTgt.y - dyPx * 0.006));
    ui.setting('condenser')?.set(tiltTgt.x, false);
    wake();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const umPerCssPx = (2 * camTgt.fov) / Math.max(1, rect.height);
  camTgt.x -= dxPx * umPerCssPx;
  camTgt.y += dyPx * umPerCssPx;
  clampStage();
  wake();
});

function endPointer(e: PointerEvent, allowTap: boolean) {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    stageEl.classList.remove('dragging', 'tilting');
  }
  if (allowTap && p && !p.tiltMode && pointers.size === 0) {
    const moved = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    if (moved < 8) {
      const now = performance.now();
      if (now - lastTapAt < 340 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 28) {
        // Double-click/tap: step cleanly between 50x macro inspection and 10x overview.
        const targetFov = camTgt.fov > 800 ? OBJECTIVE_BY_KEY['50x'].fovHalfUm : OBJECTIVE_BY_KEY['10x'].fovHalfUm;
        zoomAtClient(e.clientX, e.clientY, targetFov / camTgt.fov);
        sfx.turretClick(targetFov < 800 ? 1.15 : 0.9);
        lastTapAt = 0;
      } else {
        lastTapAt = now;
        lastTapX = e.clientX;
        lastTapY = e.clientY;
      }
    }
  }
}

canvas.addEventListener('pointerup', e => endPointer(e, true));
canvas.addEventListener('pointercancel', e => endPointer(e, false));
canvas.addEventListener('lostpointercapture', e => endPointer(e, false));

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = Math.exp(Math.max(-120, Math.min(120, e.deltaY)) * 0.0018);
  zoomAtClient(e.clientX, e.clientY, factor);
}, { passive: false });

window.addEventListener('keydown', e => {
  const tgt = e.target as HTMLElement | null;
  if (tgt && tgt.closest('input, textarea, select')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') {
    const dir = e.key === 'e' || e.key === 'E' ? 1 : -1;
    focusTgt = Math.max(0, Math.min(1, focusTgt + dir * 0.035));
    autoFocus = false;
    ui.slider?.set(focusTgt, false);
    ui.setting('autofocus')?.set(false, false);
    sfx.focusTick(Math.floor(focusTgt * 14));
    wake();
  } else if (e.key === 'f' || e.key === 'F') {
    autoFocus = true;
    focusTgt = AUTO_FOCUS_NORM;
    ui.slider?.set(focusTgt, false);
    ui.setting('autofocus')?.set(true, false);
    sfx.focusTick(7);
    wake();
  }
});

/* ---------- lifecycle ---------- */
onReducedChange((r: boolean) => {
  isReduced = r;
  wake();
});

onQuality(() => resizeGL());
window.addEventListener('resize', resizeGL);

whenVisible(stageEl, (v: boolean) => {
  visible = v;
  if (!v) {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    sfx.cancel();
  } else if (dirty || glState) {
    wake();
  }
});

onContextLoss(canvas, {
  lost() {
    contextLost = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    glState = null;
  },
  async restored() {
    contextLost = false;
    if (!gl) return;
    glState = await initGL(gl);
    wake();
  },
  failed() {
    failEl.hidden = false;
  },
});

/* ---------- boot ---------- */
mark('build');
initGL(gl)
  .then(state => {
    glState = state;
    updateScaleHud();
    render(performance.now());
    canvas.classList.add('on');
    mark('first-frame');
    return introDone;
  })
  .then(() => {
    wake();
  })
  .catch(() => {
    failEl.hidden = false;
    mark('first-frame');
  });
