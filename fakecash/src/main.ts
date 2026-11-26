import * as THREE from 'three';
import {
  audioKit,
  buildSteps,
  initPage,
  onQuality,
  onReducedChange,
  pageReady,
  pixelRatio,
  reduced,
  stage as mark,
  whenVisible,
} from '../../shared/stim.js';
import { intro as playIntro } from '../../shared/intro.js';
import { BILLS, BILL_MAP, type BillDef, type BillId } from './bills.ts';
import { createSharedLook } from './material.ts';
import { CashField, type BillBody, type BillTextures, type SimOpts } from './physics.ts';
import { BillInspector } from './inspect.ts';
import { StudioStage } from './stage.ts';
import { InspectBackdrop } from './post.ts';
import { BillShadowMap } from './shadows.ts';
import { createCashSound } from './sound.ts';

mark('libs');

const ID = 'fakecash';

/* ---------- storage ---------- */
const store = {
  get(k: string): string | null {
    try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage optional */ }
  },
};

function savedNum(k: string, fallback: number, min: number, max: number): number {
  const raw = store.get(k);
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

/* ---------- state ---------- */
const opts: SimOpts = {
  rainRate: savedNum('rain2', 0.24, 0, 1),
  wind: 0.10,
  flutter: 1.0,
  filter: 'mix',
  maxBills: 28,
  reduced: reduced(),
};

let sprayHeld = false;
let sprayClock = 0;
let sprayOrigin = new THREE.Vector3(0, 1.4, 0);
let sprayAimX = 0;

let field: CashField | null = null;
let inspector: BillInspector | null = null;
let studio: StudioStage | null = null;
let backdrop: InspectBackdrop | null = null;
let shadows: BillShadowMap | null = null;
let inspectMix = 0;
let bgBlur = 1.0;
let bgDarken = 0.70;
const sharedLook = createSharedLook();

/* ---------- sound ---------- */
const kit = audioKit({
  keys: new Set([' ', 'i', 'I', 'f', 'F', 'r', 'R', 'ArrowLeft', 'ArrowRight']),
  sleepMs: 1200,
});
const sfx = createCashSound(kit);

/* ---------- bar v3 ---------- */
// Builds a colour-preserving inline SVG currency glyph that stays crisp on both dark glass and flash picks.
function glyphIcon(symbol: string, color: string): string {
  const size = symbol.length > 1 ? 13 : 17;
  const y = symbol.length > 1 ? 16.5 : 18;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="${y}" text-anchor="middle" font-family="Iosevka Term Slab, ui-monospace, monospace" font-weight="800" font-size="${size}" fill="${color}" stroke="oklch(0.13 0.012 275 / 0.85)" stroke-width="2.4" paint-order="stroke">${symbol}</text></svg>`;
}

const ALL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="14" height="9" rx="1.6" transform="rotate(-8 10 12.5)" fill="oklch(0.7 0.16 250)" stroke="oklch(0.13 0.012 275 / 0.85)" stroke-width="1.2"/><rect x="6" y="7" width="15" height="10" rx="1.6" transform="rotate(5 13.5 12)" fill="oklch(0.84 0.15 148)" stroke="oklch(0.13 0.012 275 / 0.85)" stroke-width="1.2"/><circle cx="13.5" cy="12" r="2.2" fill="oklch(0.88 0.15 92)"/></svg>';

const choiceOptions = [
  { value: 'mix', label: 'All bills', icon: ALL_ICON },
  ...BILLS.map(b => ({ value: b.id, label: `${b.label} · ${b.title}`, icon: glyphIcon(b.glyph, b.glyphColor) })),
];

let inspectChip: HTMLElement | null = null;
let flipChip: HTMLElement | null = null;

function syncActionChips() {
  const on = !!inspector?.isOpen;
  stageEl.classList.toggle('inspecting', on);
  if (inspectChip) inspectChip.setAttribute('aria-pressed', String(on));
  if (flipChip) flipChip.hidden = !on;
}

function openInspect(bill?: BillDef, fromBody?: BillBody) {
  if (!inspector || !field) return;
  const pick = bill
    ?? fromBody?.def
    ?? (opts.filter !== 'mix' ? BILL_MAP.get(opts.filter) : undefined)
    ?? BILLS[0];

  if (fromBody) {
    const pos = fromBody.pos.clone();
    const quat = fromBody.quat.clone();
    const wear = { ...fromBody.wear };
    field.hideBody(fromBody);
    inspector.open(pick, pos, quat, wear);
    if (wear.crinkle > 0.25 || Math.abs(wear.centerFold) > 0.1) {
      sfx.unfurl(0, Math.max(wear.crinkle, Math.abs(wear.centerFold)));
    } else {
      sfx.flip(0);
    }
  } else {
    inspector.open(pick);
    sfx.flip(0);
  }
  ui.choice?.set(pick.id, false);
  syncActionChips();
  wake();
}

function closeInspect() {
  if (!inspector || !inspector.isOpen || !field) return;
  const released = inspector.close();
  field.releaseBill(released.def, released.pos, released.quat, released.vel, released.angVel, released.wear, opts);
  ui.choice?.set(opts.filter, false);
  syncActionChips();
  sfx.flick(0, 0.9);
  wake();
}

function stepBill(dir: 1 | -1) {
  if (!inspector) return;
  const curId = inspector.isOpen ? inspector.current.id : (opts.filter === 'mix' ? BILLS[0].id : opts.filter);
  const idx = Math.max(0, BILLS.findIndex(b => b.id === curId));
  const next = BILLS[(idx + dir + BILLS.length) % BILLS.length];
  if (inspector.isOpen) {
    inspector.switchBill(next, dir);
    ui.choice?.set(next.id, false);
    sfx.flip(dir * 0.35);
  } else {
    opts.filter = next.id;
    ui.choice?.set(next.id, false);
    field?.spawnBurst(4, opts);
    sfx.burst(4);
  }
  wake();
}

function triggerRainStart() {
  if (inspector?.isOpen) closeInspect();
  sprayHeld = true;
  sprayClock = 0;
  sprayOrigin.set(0, frustumH * 0.52, -0.6);
  sprayAimX = 0;
  field?.spawnBurst(opts.reduced ? 5 : 9, opts);
  sfx.burst(opts.reduced ? 4 : 7);
  wake();
}

function triggerRainEnd() {
  sprayHeld = false;
}

const ui = initPage({
  id: ID,
  bar: {
    choice: {
      label: 'Bill',
      value: 'mix',
      options: choiceOptions,
      onPick: v => {
        if (v === 'mix') {
          opts.filter = 'mix';
          if (inspector?.isOpen) closeInspect();
          else { field?.spawnBurst(5, opts); sfx.burst(5); }
          wake();
          return;
        }
        const def = BILL_MAP.get(v as BillId);
        if (!def) return;
        opts.filter = def.id;
        if (inspector?.isOpen) {
          inspector.switchBill(def, 1);
          sfx.flip(0.2);
        } else {
          field?.spawnBurst(4, opts);
          sfx.burst(4);
        }
        wake();
      },
    },
    actions: [
      { verb: 'rain', label: 'Rain', key: 'Space', hold: true, onDown: triggerRainStart, onUp: triggerRainEnd },
      { verb: 'inspect', label: 'Inspect', key: 'I', onPress: () => { if (inspector?.isOpen) closeInspect(); else openInspect(); } },
      { verb: 'flip', label: 'Flip', key: 'F', onPress: () => { if (inspector?.isOpen) { inspector.flip(); sfx.flip(0); wake(); } } },
    ],
    slider: {
      label: 'Rain',
      min: 0,
      max: 1,
      step: 0.01,
      value: opts.rainRate,
      onInput: v => {
        opts.rainRate = v;
        store.set('rain2', v);
        wake();
      },
    },
    settings: [
      { type: 'slider', id: 'wind', group: 'Air', label: 'Wind', min: -1, max: 1, step: 0.02, value: 0.10, persist: true, onInput: v => { opts.wind = v; wake(); } },
      { type: 'slider', id: 'flutter', group: 'Air', label: 'Flutter', min: 0.2, max: 1.6, step: 0.05, value: 1.0, persist: true, onInput: v => { opts.flutter = v; wake(); } },
      { type: 'button', id: 'clear', group: 'Stage', label: 'Bills', text: 'Clear', onClick: () => { if (inspector?.isOpen) closeInspect(); field?.clear(); wake(); } },
    ],
    dev: [
      { type: 'slider', id: 'exposure2', group: 'Light', label: 'Exposure', min: 0.60, max: 1.50, step: 0.02, value: 0.94, persist: true, onInput: v => { sharedLook.uExposure.value = v; wake(); } },
      { type: 'slider', id: 'bgblur', group: 'Light', label: 'Inspect blur', min: 0, max: 2.0, step: 0.05, value: 1.0, persist: true, onInput: v => { bgBlur = v; wake(); } },
      { type: 'slider', id: 'bgdark2', group: 'Light', label: 'Inspect dim', min: 0.25, max: 0.95, step: 0.02, value: 0.58, persist: true, onInput: v => { bgDarken = v; wake(); } },
      { type: 'slider', id: 'relief2', group: 'Paper', label: 'Intaglio', min: 0, max: 1.6, step: 0.05, value: 0.82, persist: true, onInput: v => { sharedLook.uRelief.value = v; wake(); } },
      { type: 'slider', id: 'grain2', group: 'Paper', label: 'Cotton grain', min: 0, max: 2.0, step: 0.05, value: 0.85, persist: true, onInput: v => { sharedLook.uGrain.value = v; wake(); } },
      { type: 'slider', id: 'foil2', group: 'Paper', label: 'Foil glint', min: 0, max: 2.0, step: 0.05, value: 1.05, persist: true, onInput: v => { sharedLook.uFoil.value = v; wake(); } },
      { type: 'slider', id: 'trans2', group: 'Paper', label: 'Subsurface', min: 0, max: 1.8, step: 0.05, value: 0.65, persist: true, onInput: v => { sharedLook.uTrans.value = v; wake(); } },
      { type: 'slider', id: 'count2', group: 'Sim', label: 'Max bills', min: 10, max: 64, step: 2, value: 28, persist: true, onInput: v => { opts.maxBills = v; wake(); } },
    ],
    quality: true,
    reset: () => {
      opts.rainRate = 0.24;
      opts.wind = 0.10;
      opts.flutter = 1.0;
      opts.filter = 'mix';
      ui.slider?.set(0.24, false);
      store.set('rain2', 0.24);
      ui.setting('wind')?.set(0.10, true);
      ui.setting('flutter')?.set(1.0, true);
      ui.choice?.set('mix', false);
      if (inspector?.isOpen) closeInspect();
      field?.clearImmediate();
      field?.seedInitial(opts);
      sfx.burst(5);
      wake();
    },
    keys: [
      ['click', 'inspect a bill'],
      ['hold', 'make it rain'],
      ['drag', 'stir or turn'],
      ['scroll', 'zoom'],
    ],
    help: [
      ['click', 'Click a falling bill to inspect it'],
      ['hold', 'Hold the stage to make it rain'],
      ['drag', 'Drag to sweep bills or turn an inspected bill'],
      ['scroll', 'Scroll or pinch to zoom into the engraving'],
      ['space', 'Hold or tap to shower bills'],
      ['I', 'Inspect or release a bill'],
      ['F', 'Flip front and back while inspecting'],
      ['← →', 'Step through the seven designs'],
      ['R', 'Rotate the inspected bill 90 degrees'],
      ['C', 'Clear the stage'],
    ],
  },
});

const stageEl = document.getElementById('stage')!;
const chips = [...document.querySelectorAll<HTMLElement>('.s2-chip')];
inspectChip = chips.find(b => b.querySelector('.s2-label')?.textContent === 'Inspect') ?? null;
flipChip = chips.find(b => b.querySelector('.s2-label')?.textContent === 'Flip') ?? null;
if (flipChip) flipChip.hidden = true;

// Restore persisted settings before first render.
opts.wind = ui.setting('wind')?.value ?? 0.10;
opts.flutter = ui.setting('flutter')?.value ?? 1.0;
sharedLook.uExposure.value = ui.setting('exposure2')?.value ?? 0.94;
bgBlur = ui.setting('bgblur')?.value ?? 1.0;
bgDarken = ui.setting('bgdark2')?.value ?? 0.58;
sharedLook.uRelief.value = ui.setting('relief2')?.value ?? 0.82;
sharedLook.uGrain.value = ui.setting('grain2')?.value ?? 0.85;
sharedLook.uFoil.value = ui.setting('foil2')?.value ?? 1.05;
sharedLook.uTrans.value = ui.setting('trans2')?.value ?? 0.65;
opts.maxBills = ui.setting('count2')?.value ?? 28;

mark('build');
playIntro({ ready: pageReady(14000) });

/* ---------- renderer and scene ---------- */
let renderer: THREE.WebGLRenderer;
function failBoot(err?: unknown) {
  if (err) console.error('Fake Cash boot failed', err);
  const failEl = stageEl.querySelector<HTMLElement>('.fail');
  if (failEl) failEl.hidden = false;
  ui.hideControls?.();
  mark('first-frame');
}

try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
} catch (err) {
  failBoot(err);
  throw err;
}

renderer.setClearColor(0x0c0d12, 1);
const canvas = renderer.domElement;
canvas.setAttribute('aria-hidden', 'true');
stageEl.prepend(canvas);

const scene = new THREE.Scene();
const CAMERA_FOV = 38;
const CAMERA_Z = 7.2;
const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 40);
camera.position.set(0, 0, CAMERA_Z);

let viewW = 1280;
let viewH = 720;
let currentDpr = 1;
let frustumW = 6.5;
let frustumH = 3.8;
let slowRung = 0;
let contextLost = false;

function resize() {
  const r = stageEl.getBoundingClientRect();
  viewW = Math.max(1, r.width);
  viewH = Math.max(1, r.height);
  currentDpr = pixelRatio(viewW, viewH, { maxDpr: 2, budget: 1.8e6, low: slowRung > 0 });
  renderer.setPixelRatio(currentDpr);
  renderer.setSize(viewW, viewH, false);
  camera.aspect = viewW / viewH;
  camera.updateProjectionMatrix();

  const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5));
  frustumH = CAMERA_Z * tanHalf;
  frustumW = frustumH * camera.aspect;

  field?.setFrustum(frustumW, frustumH);
  backdrop?.resize(viewW * currentDpr, viewH * currentDpr);
  const cov = ui.cover?.() ?? { top: 64, bottom: 72 };
  inspector?.setViewport(viewW, viewH, CAMERA_FOV, CAMERA_Z, { top: cov.top, bottom: cov.bottom });
}

const ro = new ResizeObserver(() => { resize(); renderOnce(); });
ro.observe(stageEl);
onQuality(() => { slowRung = 0; resize(); renderOnce(); });
ui.onCover?.(() => { resize(); renderOnce(); });
onReducedChange((r: boolean) => { opts.reduced = r; wake(); });

canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  contextLost = true;
  stopLoop();
});
canvas.addEventListener('webglcontextrestored', () => {
  contextLost = false;
  resize();
  wake();
});

/* ---------- texture loader ---------- */
const loader = new THREE.TextureLoader();
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function loadTex(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      tex => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = maxAniso;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      err => reject(err),
    );
  });
}

const stepNote = buildSteps(BILLS.length + 1, [
  ...BILLS.map(b => `Printing ${b.label} ${b.title}`),
  'Warming studio lights',
]);

const loadedTextures = new Map<BillId, BillTextures>();

async function boot() {
  try {
    await Promise.all(
      BILLS.map(async def => {
        const [front, back, maskFront, maskBack] = await Promise.all([
          loadTex(def.frontUrl),
          loadTex(def.backUrl),
          loadTex(def.maskFrontUrl),
          loadTex(def.maskBackUrl),
        ]);
        loadedTextures.set(def.id, { front, back, maskFront, maskBack });
        stepNote();
      }),
    );

    studio = new StudioStage();
    shadows = new BillShadowMap();
    sharedLook.uShadowMap.value = shadows.depthTexture;
    sharedLook.uShadowMatrix.value.copy(shadows.matrix);
    field = new CashField(loadedTextures, sharedLook);
    inspector = new BillInspector(loadedTextures, sharedLook);
    backdrop = new InspectBackdrop();
    scene.add(studio.group);
    scene.add(field.group);
    scene.add(inspector.mesh);

    resize();
    field.seedInitial(opts);
    studio.update(0, sharedLook.uBackDir.value, 0, currentDpr, viewW / viewH, opts.reduced);

    await renderer.compileAsync(scene, camera);
    stepNote();
    renderOnce();
    canvas.classList.add('on');
    mark('first-frame');
    wake();
  } catch (err) {
    failBoot(err);
  }
}

/* ---------- pointer and raycast ---------- */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const rayPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const hitPt = new THREE.Vector3();
const prevWorld = new THREE.Vector3();
const gustVel = new THREE.Vector3();

function toNdc(clientX: number, clientY: number) {
  const r = stageEl.getBoundingClientRect();
  ndc.x = ((clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
  ndc.y = -((clientY - r.top) / Math.max(1, r.height)) * 2 + 1;
}

function stagePoint(clientX: number, clientY: number, out: THREE.Vector3) {
  toNdc(clientX, clientY);
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(rayPlane, out);
}

interface ActivePointer {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startT: number;
  mode: 'pending' | 'drag' | 'hold';
  hitBody: BillBody | null;
  hitHero: boolean;
  shift: boolean;
  button: number;
}

const pointers = new Map<number, { x: number; y: number }>();
let primary: ActivePointer | null = null;
let holdTimer = 0;
let lastTapT = 0;
let pinchDist = 0;

function clearHoldTimer() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
}

function endPrimary(cancelled: boolean) {
  clearHoldTimer();
  stageEl.classList.remove('held');
  if (primary?.mode === 'hold') sprayHeld = false;
  if (primary && !cancelled && inspector?.isOpen) inspector.endDrag();
  primary = null;
}

stageEl.addEventListener('pointerdown', e => {
  if (e.target !== canvas && e.target !== stageEl) return;
  if (e.button !== 0 && e.button !== 2) return;
  wake();

  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  // Two-finger pinch zooms the inspected bill smoothly on touch devices.
  if (pointers.size === 2 && inspector?.isOpen) {
    const pts = [...pointers.values()];
    pinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    clearHoldTimer();
    return;
  }

  if (primary) return;
  try { stageEl.setPointerCapture(e.pointerId); } catch { /* capture optional */ }

  toNdc(e.clientX, e.clientY);
  raycaster.setFromCamera(ndc, camera);

  const hitHero = inspector?.isOpen ? inspector.hitTest(raycaster) : false;
  const hitBody = !inspector?.isOpen && field ? field.pickBill(raycaster) : null;

  primary = {
    id: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    startT: performance.now(),
    mode: 'pending',
    hitBody,
    hitHero,
    shift: e.shiftKey,
    button: e.button,
  };

  stagePoint(e.clientX, e.clientY, prevWorld);

  if (!inspector?.isOpen) {
    clearHoldTimer();
    holdTimer = window.setTimeout(() => {
      if (!primary || primary.mode !== 'pending') return;
      primary.mode = 'hold';
      stageEl.classList.add('held');
      stagePoint(primary.lastX, primary.lastY, sprayOrigin);
      sprayAimX = ndc.x * 0.5;
      sprayHeld = true;
      sprayClock = 0;
      field?.spawnFlick(sprayOrigin, opts, sprayAimX);
      sfx.flick(ndc.x * 0.6, 1.0);
      wake();
    }, 260);
  }
});

stageEl.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  toNdc(e.clientX, e.clientY);

  // Pinch zoom when two touches are active during inspection.
  if (pointers.size === 2 && inspector?.isOpen) {
    const pts = [...pointers.values()];
    const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    if (pinchDist > 8 && d > 8) {
      inspector.zoomBy(d / pinchDist);
      pinchDist = d;
      wake();
    }
    return;
  }

  if (!primary || e.pointerId !== primary.id) {
    if (!inspector?.isOpen && e.pointerType === 'mouse' && field) {
      raycaster.setFromCamera(ndc, camera);
      stageEl.classList.toggle('over-bill', field.pickBill(raycaster) !== null);
    }
    return;
  }

  const dx = e.clientX - primary.lastX;
  const dy = e.clientY - primary.lastY;
  const moved = Math.hypot(e.clientX - primary.startX, e.clientY - primary.startY);
  primary.lastX = e.clientX;
  primary.lastY = e.clientY;

  if (primary.mode === 'pending' && moved > 8) {
    clearHoldTimer();
    primary.mode = 'drag';
    stageEl.classList.add('held');
  }

  if (inspector?.isOpen) {
    if (primary.mode === 'drag') {
      inspector.drag(dx, dy, primary.shift || primary.button === 2);
      wake();
    }
    return;
  }

  stagePoint(e.clientX, e.clientY, hitPt);
  if (primary.mode === 'hold') {
    sprayOrigin.copy(hitPt);
    sprayAimX = Math.max(-1, Math.min(1, (hitPt.x - prevWorld.x) * 4));
  } else if (primary.mode === 'drag' && field) {
    gustVel.copy(hitPt).sub(prevWorld).multiplyScalar(14);
    const spd = gustVel.length();
    if (spd > 0.3) {
      field.applyGust(hitPt, gustVel, Math.min(1.6, spd * 0.14));
      if (spd > 5) sfx.gust(ndc.x * 0.7, Math.min(1.5, spd * 0.08));
    }
    wake();
  }
  prevWorld.copy(hitPt);
});

stageEl.addEventListener('pointerup', e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
  if (!primary || e.pointerId !== primary.id) return;

  const p = primary;
  const wasTap = p.mode === 'pending';
  endPrimary(false);
  if (!wasTap) return;

  const now = performance.now();
  if (inspector?.isOpen) {
    if (p.hitHero) {
      if (now - lastTapT < 340) {
        inspector.flip();
        sfx.flip(0);
        lastTapT = 0;
      } else {
        lastTapT = now;
      }
    } else {
      closeInspect();
    }
    wake();
    return;
  }

  if (p.hitBody) {
    openInspect(p.hitBody.def, p.hitBody);
    return;
  }

  // Tapping empty air flicks a quick fan of bills from the tap spot.
  stagePoint(e.clientX, e.clientY, hitPt);
  const n = opts.reduced ? 3 : 5;
  for (let i = 0; i < n; i++) {
    field?.spawnFlick(hitPt, opts, (i / (n - 1) - 0.5) * 1.2);
  }
  sfx.burst(n);
  wake();
});

const cancelPointer = (e: PointerEvent) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
  if (primary && e.pointerId === primary.id) endPrimary(true);
};
stageEl.addEventListener('pointercancel', cancelPointer);
stageEl.addEventListener('lostpointercapture', cancelPointer);
stageEl.addEventListener('contextmenu', e => { if (inspector?.isOpen) e.preventDefault(); });

stageEl.addEventListener('wheel', e => {
  if (!inspector?.isOpen) return;
  e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0018);
  inspector.zoomBy(factor);
  wake();
}, { passive: false });

/* ---------- keyboard ---------- */
function sheetOpen(): boolean {
  return !!document.querySelector('.sg-sheet:not([hidden]), .s2-sheet:not([hidden])');
}

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || sheetOpen()) return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (e.key === 'ArrowRight') { e.preventDefault(); stepBill(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); stepBill(-1); }
  else if (e.key === 'r' || e.key === 'R') {
    if (inspector?.isOpen) { inspector.rotateQuarter(); sfx.flip(0); wake(); }
    else { field?.spawnBurst(7, opts); sfx.burst(6); wake(); }
  } else if (e.key === 'c' || e.key === 'C') {
    if (inspector?.isOpen) closeInspect();
    field?.clear();
    wake();
  } else if (e.key === '+' || e.key === '=') {
    inspector?.zoomBy(1.25); wake();
  } else if (e.key === '-' || e.key === '_') {
    inspector?.zoomBy(0.8); wake();
  } else if (e.key === '0') {
    inspector?.resetPose(); wake();
  } else if (e.key === 'Escape' && inspector?.isOpen) {
    closeInspect();
  }
});

/* ---------- loop, visibility, idle sleep, slow-frame ladder ---------- */
const IDLE_SLEEP_MS = 60_000;
const SLEEP_EASE_MS = 2_000;
let rafId = 0;
let visible = !document.hidden;
let lastInputMs = performance.now();
let lastFrameMs = performance.now();
let simTime = 0;
let activeSinceMs = performance.now();
let slowAccum = 0;
let avgFrameS = 1 / 60;

function wake() {
  lastInputMs = performance.now();
  if (!visible || contextLost || rafId) return;
  lastFrameMs = performance.now();
  activeSinceMs = lastFrameMs;
  rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function step(dt: number, ease: number) {
  const sDt = dt * ease;
  simTime += sDt;
  sharedLook.uTime.value = simTime;

  if (sprayHeld && !inspector?.isOpen && field) {
    sprayClock += dt;
    const interval = opts.reduced ? 0.14 : 0.068;
    while (sprayClock >= interval) {
      sprayClock -= interval;
      field.spawnFlick(sprayOrigin, opts, sprayAimX);
      sfx.flick(Math.max(-0.8, Math.min(0.8, sprayOrigin.x / Math.max(1, frustumW))), 0.9);
    }
  }

  const targetMix = inspector?.isOpen ? 1 : 0;
  inspectMix += (targetMix - inspectMix) * (opts.reduced ? 1 : Math.min(1, dt * 8.5));
  if (Math.abs(targetMix - inspectMix) < 0.002) inspectMix = targetMix;

  // Slow backlit sun drift keeps paper subsurface glow breathing subtly.
  const sunPhase = opts.reduced ? 0 : simTime * 0.12;
  sharedLook.uBackDir.value.set(
    -0.08 + Math.sin(sunPhase) * 0.06,
    0.22 + Math.cos(sunPhase * 0.7) * 0.04,
    -0.97,
  ).normalize();

  studio?.update(simTime, sharedLook.uBackDir.value, inspectMix, currentDpr, viewW / viewH, opts.reduced);
  field?.step(sDt, simTime, opts, !!inspector?.isOpen);
  inspector?.step(dt, simTime, opts.reduced);
}

function renderOnce() {
  if (contextLost) return;
  if (shadows && field) {
    shadows.render(renderer, field.group, field.bodies);
  }
  if (backdrop && inspector) {
    backdrop.render(renderer, scene, camera, inspector.mesh, inspectMix, bgBlur, bgDarken);
  } else {
    renderer.render(scene, camera);
  }
}

function tick(now: number) {
  rafId = 0;
  if (!visible || contextLost) return;

  const rawDt = (now - lastFrameMs) / 1000;
  const idleMs = now - lastInputMs;
  const lively = sprayHeld || primary !== null || !!inspector?.isOpen || idleMs < 6000;

  // Drift at 30 fps when ambient only; full rate during input or inspection.
  if (!lively && rawDt < 1 / 31) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  lastFrameMs = now;
  const dt = Math.min(0.05, Math.max(0.001, rawDt));

  // Reduced motion halts ambient drift once recent input settles.
  if (opts.reduced && !lively && idleMs > 6000) {
    renderOnce();
    return;
  }

  // Ease gently to a halt after 60 s idle so idle pages run no rAF loop.
  let ease = 1;
  if (idleMs > IDLE_SLEEP_MS) {
    const over = idleMs - IDLE_SLEEP_MS;
    if (over >= SLEEP_EASE_MS) {
      renderOnce();
      return;
    }
    ease = 1 - over / SLEEP_EASE_MS;
  }

  // Automatic slow-frame step-down after 4 s warm-up if avg > 1/38 s for 2 s.
  if (lively && now - activeSinceMs > 4000) {
    avgFrameS = avgFrameS * 0.9 + rawDt * 0.1;
    if (avgFrameS > 1 / 38) {
      slowAccum += dt;
      if (slowAccum > 2 && slowRung < 2) {
        slowRung++;
        slowAccum = 0;
        if (slowRung === 1) resize();
        else opts.maxBills = Math.min(opts.maxBills, 32);
      }
    } else {
      slowAccum = Math.max(0, slowAccum - dt * 0.5);
    }
  }

  try {
    step(dt, ease);
    renderOnce();
  } finally {
    if (visible && !contextLost) {
      rafId = requestAnimationFrame(tick);
    }
  }
}

whenVisible(stageEl, (on: boolean) => {
  visible = on;
  if (!on) {
    sprayHeld = false;
    sfx.cancel();
    stopLoop();
  } else {
    wake();
  }
});

addEventListener('pagehide', () => {
  stopLoop();
  sfx.cancel();
  ro.disconnect();
  studio?.dispose();
  shadows?.dispose();
  backdrop?.dispose();
  field?.dispose();
  inspector?.dispose();
  for (const t of loadedTextures.values()) {
    t.front.dispose();
    t.back.dispose();
    t.maskFront.dispose();
    t.maskBack.dispose();
  }
  renderer.dispose();
});

boot();
