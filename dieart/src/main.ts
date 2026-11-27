// Die art: three.js optical silicon microscope doodle hunt.

import * as THREE from 'three';
import {
  audioKit,
  initPage,
  onQuality,
  onReducedChange,
  pageReady,
  pixelRatio,
  quality,
  reduced,
  stage as mark,
  whenVisible,
} from '../../shared/stim.js';
import { intro as playIntro } from '../../shared/intro.js';
import {
  createSharedOptics,
  MODE_INDEX,
  type IlluminationMode,
} from './materials.ts';
import { buildWaferDie, type WaferDie } from './wafer.ts';
import { createOpticsPipeline, type OpticsPipeline } from './post.ts';
import { createMicroscopeSound } from './sound.ts';
import type { DoodleInstance } from './doodles.ts';

mark('libs');

const ID = 'dieart';
const TOTAL_DOODLES = 10;

// Camera Z limits: 96 = full 5x die overview, 5.2 = 120x extreme macro
const Z_MIN = 5.2;
const Z_MAX = 98.0;
const PAN_LIMIT = 55.5;
const SLEEP_MS = 60_000;

const OBJECTIVES: Record<string, { label: string; z: number }> = {
  '5x':   { label: '5×',   z: 84.0 },
  '20x':  { label: '20×',  z: 36.0 },
  '50x':  { label: '50×',  z: 15.5 },
  '100x': { label: '100×', z: 7.4 },
};

const LAYER_STOPS = [
  { name: 'SiO₂', z: 0.05 },
  { name: 'M1',   z: 0.22 },
  { name: 'M2',   z: 0.42 },
  { name: 'M3',   z: 0.62 },
  { name: 'M4',   z: 0.84 },
];

/* ---------- illumination SVG icons for Bar v3 ---------- */
const MODE_ICONS: Record<IlluminationMode, string> = {
  brightfield:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="oklch(0.68 0.14 235)" stroke="oklch(0.92 0.06 215)" stroke-width="1.5"/><circle cx="10.2" cy="10.2" r="3" fill="oklch(0.95 0.05 90 / 0.85)"/></svg>',
  darkfield:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="oklch(0.12 0.02 270)" stroke="oklch(0.86 0.18 195)" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="oklch(0.88 0.16 84)" stroke-width="1.3"/></svg>',
  dic:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="da-dic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.76 0.16 175)"/><stop offset="0.5" stop-color="oklch(0.74 0.14 310)"/><stop offset="1" stop-color="oklch(0.86 0.15 78)"/></linearGradient></defs><circle cx="12" cy="12" r="7.5" fill="url(#da-dic)" stroke="oklch(0.94 0.03 250 / 0.7)" stroke-width="1.3"/></svg>',
  uv:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="oklch(0.24 0.16 285)" stroke="oklch(0.76 0.22 215)" stroke-width="1.8"/><path d="M8.5 12h7M12 8.5v7" stroke="oklch(0.88 0.18 88)" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

/* ---------- state ---------- */
let mode: IlluminationMode = 'brightfield';
let isReduced = reduced();
let highQuality = quality() === 'high';
let reticleOn = true;
let autoFocusOn = true;
let bloomBase = 0.34;
let defocusGain = 1.0;

const optics = createSharedOptics();
const modeTarget = new THREE.Vector4(1, 0, 0, 0);

// Microscope stage & camera spring state
const camCur = { x: 0, y: 0, z: 46.0 };
const camTarget = { x: 0, y: 0, z: 46.0 };
let focusCur = 0.44;
let focusTarget = 0.44;
let lastLayerIdx = 2;

// Oblique lamp angle (driven by subtle mouse tilt or right-drag)
const lampCur = { x: 0.22, y: 0.32 };
const lampTarget = { x: 0.22, y: 0.32 };

// Scan ripple & directional beacon state
let scanActive = false;
let scanAge = 0;
let beaconUntil = 0;
let beaconAngle = 0;

// Toast timer
let toastTimer = 0;

// Current die & hover tracking
let dieSeed = Math.floor(Date.now() % 100000) + 1337;
let die: WaferDie | null = null;
let foundCount = 0;
let hoveredDoodle: DoodleInstance | null = null;

/* ---------- sound ---------- */
const kit = audioKit({
  keys: new Set(['h', 'H', 'r', 'R', '1', '2', '3', '4', 'q', 'Q', 'e', 'E', ' ']),
  sleepMs: 1400,
});
const sfx = createMicroscopeSound(kit);

/* ---------- DOM references ---------- */
const stageEl = document.getElementById('stage')!;
const reticleEl = document.getElementById('da-reticle')!;
const beaconEl = document.getElementById('da-beacon')!;
const beaconRotEl = document.getElementById('da-beacon-rot')!;
const countEl = document.getElementById('da-count')!;
const magEl = document.getElementById('da-mag')!;
const layerEl = document.getElementById('da-layer')!;
const scaleBarEl = document.getElementById('da-scale-bar')!;
const scaleValEl = document.getElementById('da-scale-val')!;
const pipsEl = document.getElementById('da-pips')!;
const toastEl = document.getElementById('da-toast')!;
const toastTitleEl = document.getElementById('da-toast-title')!;
const toastMetaEl = document.getElementById('da-toast-meta')!;

const pipEls: HTMLElement[] = [];
for (let i = 0; i < TOTAL_DOODLES; i++) {
  const pip = document.createElement('span');
  pip.className = 'da-pip';
  pipsEl.append(pip);
  pipEls.push(pip);
}

function showToast(title: string, meta: string, holdMs = 3000) {
  toastTitleEl.textContent = title;
  toastMetaEl.textContent = meta;
  toastEl.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove('show');
  }, holdMs);
}

function updateHudCounter() {
  countEl.textContent = `${foundCount} / ${TOTAL_DOODLES}`;
  pipEls.forEach((p, idx) => p.classList.toggle('on', idx < foundCount));
}

function setMode(next: IlluminationMode, silent = false) {
  mode = next;
  const idx = MODE_INDEX[next];
  modeTarget.set(idx === 0 ? 1 : 0, idx === 1 ? 1 : 0, idx === 2 ? 1 : 0, idx === 3 ? 1 : 0);
  if (isReduced) optics.uModeWeights.value.copy(modeTarget);
  if (!silent) sfx.turretClick(0.9 + idx * 0.12);
  wake();
}

function setObjective(key: keyof typeof OBJECTIVES, silent = false) {
  const ob = OBJECTIVES[key];
  if (!ob) return;
  camTarget.z = ob.z;
  if (isReduced) camCur.z = ob.z;
  if (!silent) sfx.turretClick(1.15);
  wake();
}

function triggerScan() {
  if (!die) return;
  const unfound = die.doodles.filter(d => !d.found);
  optics.uScanOrigin.value.set(camCur.x, camCur.y);
  optics.uScanRadius.value = 0;
  optics.uScanStrength.value = 1.0;
  scanActive = true;
  scanAge = 0;
  sfx.scanPing();

  if (unfound.length === 0) {
    showToast('Die complete · 10 / 10', 'Press R to inspect a new silicon die', 3200);
    wake();
    return;
  }

  let nearest = unfound[0];
  let bestD2 = Infinity;
  for (const d of unfound) {
    const dx = d.worldPos.x - camCur.x;
    const dy = d.worldPos.y - camCur.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      nearest = d;
    }
  }

  const dx = nearest.worldPos.x - camCur.x;
  const dy = nearest.worldPos.y - camCur.y;
  const dist = Math.hypot(dx, dy);
  // Screen-space angle (0 deg = North / +Y)
  beaconAngle = (Math.atan2(dx, dy) * 180) / Math.PI;
  beaconRotEl.setAttribute('transform', `rotate(${beaconAngle.toFixed(1)} 120 120)`);
  beaconUntil = performance.now() + 3400;
  beaconEl.classList.add('show');

  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const sector = compass[Math.round((((beaconAngle % 360) + 360) % 360) / 45) % 8];
  const distUm = Math.max(10, Math.round(dist * 14));
  showToast(
    `Signal · ${sector} · ${distUm} μm`,
    `${nearest.spec.layer} · ${nearest.zone}`,
    3100
  );
  wake();
}

function rebuildDie(nextSeed?: number) {
  if (die) {
    scene.remove(die.root);
    die.dispose();
    die = null;
  }
  dieSeed = nextSeed ?? (dieSeed + 7919) % 999983;
  die = buildWaferDie(optics, dieSeed);
  scene.add(die.root);

  foundCount = 0;
  hoveredDoodle = null;
  beaconUntil = 0;
  beaconEl.classList.remove('show');
  updateHudCounter();

  camTarget.x = 0;
  camTarget.y = 0;
  camTarget.z = 54.0;
  focusTarget = 0.44;
  ui.slider?.set(focusTarget, false);

  showToast(`Die #${String(dieSeed % 10000).padStart(4, '0')}`, '10 hidden mask doodles · pan, zoom & rack focus', 3000);
  wake();
}

/* ---------- Bar v3 ---------- */
const ui = initPage({
  id: ID,
  bar: {
    choice: {
      label: 'Light',
      value: 'brightfield',
      options: [
        { value: 'brightfield', label: 'Brightfield', icon: MODE_ICONS.brightfield },
        { value: 'darkfield',   label: 'Darkfield',   icon: MODE_ICONS.darkfield },
        { value: 'dic',         label: 'DIC Relief',  icon: MODE_ICONS.dic },
        { value: 'uv',          label: 'UV 365 nm',   icon: MODE_ICONS.uv },
      ],
      onPick: v => setMode(v as IlluminationMode),
    },
    slider: {
      label: 'Focus',
      min: 0,
      max: 1,
      step: 0.01,
      value: focusTarget,
      onInput: v => {
        focusTarget = v;
        if (isReduced) focusCur = v;
        autoFocusOn = false;
        ui.setting('autofocus')?.set(false, false);
        wake();
      },
    },
    actions: [
      { verb: 'scan', label: 'Scan', key: 'H', onPress: triggerScan },
      { verb: 'new',  label: 'New die', key: 'R', onPress: () => { sfx.turretClick(0.8); rebuildDie(); } },
    ],
    settings: [
      {
        type: 'choice',
        id: 'objective',
        group: 'Objective',
        label: 'Turret',
        display: 'segments',
        value: '20x',
        options: [
          { value: '5x',   label: '5×' },
          { value: '20x',  label: '20×' },
          { value: '50x',  label: '50×' },
          { value: '100x', label: '100×' },
        ],
        onPick: v => setObjective(v as keyof typeof OBJECTIVES),
      },
      {
        type: 'toggle',
        id: 'reticle',
        group: 'Optics',
        label: 'Reticle',
        value: true,
        persist: true,
        onToggle: (v: boolean) => {
          reticleOn = v;
          reticleEl.hidden = !v;
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
          autoFocusOn = v;
          wake();
        },
      },
    ],
    dev: [
      {
        type: 'slider',
        id: 'exposure',
        group: 'Optics',
        label: 'Exposure',
        min: 0.65,
        max: 1.55,
        step: 0.02,
        value: 1.05,
        persist: true,
        onInput: v => { optics.uExposure.value = v; wake(); },
      },
      {
        type: 'slider',
        id: 'bloom',
        group: 'Optics',
        label: 'Bloom',
        min: 0,
        max: 0.9,
        step: 0.02,
        value: 0.34,
        persist: true,
        onInput: v => { bloomBase = v; wake(); },
      },
      {
        type: 'slider',
        id: 'filmshift',
        group: 'Wafer',
        label: 'Oxide shift',
        min: -1,
        max: 1,
        step: 0.02,
        value: 0,
        persist: true,
        onInput: v => { optics.uFilmShift.value = v; wake(); },
      },
      {
        type: 'slider',
        id: 'defocus',
        group: 'Optics',
        label: 'Shallow DoF',
        min: 0,
        max: 1.8,
        step: 0.05,
        value: 1.0,
        persist: true,
        onInput: v => { defocusGain = v; optics.uDofStrength.value = v; wake(); },
      },
    ],
    quality: true,
    reset: () => {
      setMode('brightfield', true);
      ui.choice?.set('brightfield', false);
      optics.uFilmShift.value = 0;
      optics.uExposure.value = 1.05;
      bloomBase = 0.34;
      defocusGain = 1.0;
      optics.uDofStrength.value = 1.0;
      autoFocusOn = true;
      ui.setting('autofocus')?.set(true, false);
      sfx.turretClick(0.95);
      rebuildDie();
    },
    keys: [
      ['drag', 'pan wafer'],
      ['scroll', 'zoom'],
      ['click', 'log doodle'],
      ['H', 'scan'],
    ],
    help: [
      ['drag', 'Pan across the silicon die'],
      ['scroll', 'Zoom smoothly from 5× overview to 120× macro'],
      ['click', 'Click a hidden mask doodle to inspect and log it'],
      ['right-drag', 'Tilt the oblique microscope lamp to shift thin-film iridescence'],
      ['1 2 3 4', 'Snap objective turret to 5×, 20×, 50×, or 100×'],
      ['Q / E', 'Rack focus down or up across silicon and M1–M4 metal layers'],
      ['H', 'Send an interference scan pulse toward the nearest unfound doodle'],
      ['R', 'Fabricate a fresh seeded silicon die'],
      ['WASD / Arrows', 'Fine-step the XY microscope stage'],
    ],
  },
});

// Restore persisted settings
reticleOn = ui.setting('reticle')?.value ?? true;
reticleEl.hidden = !reticleOn;
autoFocusOn = ui.setting('autofocus')?.value ?? true;
optics.uExposure.value = ui.setting('exposure')?.value ?? 1.05;
bloomBase = ui.setting('bloom')?.value ?? 0.34;
optics.uFilmShift.value = ui.setting('filmshift')?.value ?? 0;
defocusGain = ui.setting('defocus')?.value ?? 1.0;
optics.uDofStrength.value = defocusGain;

mark('build');
playIntro({ ready: pageReady(14000) });

/* ---------- WebGL2 renderer, scene, camera & post ---------- */
let renderer: THREE.WebGLRenderer;
function failBoot(err?: unknown) {
  if (err) console.error('Die art boot failed', err);
  const failEl = stageEl.querySelector<HTMLElement>('.fail');
  if (failEl) failEl.hidden = false;
  ui.hideControls?.();
  mark('first-frame');
}

try {
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  });
} catch (err) {
  failBoot(err);
  throw err;
}

renderer.setClearColor(0x090b12, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const canvas = renderer.domElement;
canvas.setAttribute('aria-hidden', 'true');
stageEl.prepend(canvas);

const scene = new THREE.Scene();
const CAMERA_FOV = 36;
const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.4, 240);
camera.position.set(0, 0, camCur.z);
camera.lookAt(0, 0, 0);

const pipeline: OpticsPipeline = createOpticsPipeline(renderer, scene, camera);

// Build initial seeded silicon die
die = buildWaferDie(optics, dieSeed);
scene.add(die.root);
updateHudCounter();

/* ---------- sizing ---------- */
let viewW = 1;
let viewH = 1;

function resize() {
  const rect = stageEl.getBoundingClientRect();
  viewW = Math.max(1, Math.round(rect.width));
  viewH = Math.max(1, Math.round(rect.height));
  const dpr = pixelRatio(viewW, viewH, {
    maxDpr: highQuality ? 2 : 1.5,
    budget: highQuality ? 2.1e6 : 1.35e6,
    quality: highQuality ? 'high' : 'standard',
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(viewW, viewH, false);
  camera.aspect = viewW / viewH;
  camera.updateProjectionMatrix();
  pipeline.resize(viewW, viewH, dpr, highQuality);
  wake();
}

const ro = new ResizeObserver(resize);
ro.observe(stageEl);

onQuality(q => {
  highQuality = q === 'high';
  resize();
});

onReducedChange((r: boolean) => {
  isReduced = r;
  pipeline.opticsPass.uniforms.uReduced.value = r ? 1 : 0;
  wake();
});
pipeline.opticsPass.uniforms.uReduced.value = isReduced ? 1 : 0;

canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  stopLoop();
});
canvas.addEventListener('webglcontextrestored', () => {
  resize();
  wake();
});

/* ---------- coordinate helpers ---------- */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const waferPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.45);
const hitPt = new THREE.Vector3();

function screenToWafer(clientX: number, clientY: number, zPlane = 0.45): THREE.Vector3 | null {
  const rect = stageEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  waferPlane.constant = -zPlane;
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(waferPlane, hitPt);
}

function findDoodleAt(wx: number, wy: number, generous = 1.0): DoodleInstance | null {
  if (!die) return null;
  // Slightly wider pick margin when zoomed out so clicks feel forgiving and crisp
  const zoomPad = THREE.MathUtils.clamp((camCur.z - 12) * 0.032, 0, 1.45);
  let best: DoodleInstance | null = null;
  let bestDist = Infinity;
  for (const d of die.doodles) {
    const dist = Math.hypot(wx - d.worldPos.x, wy - d.worldPos.y);
    const lim = (d.hitRadius + zoomPad) * generous;
    if (dist <= lim && dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

function inspectDoodle(d: DoodleInstance) {
  // Snap focus gently onto this doodle's metal layer so it jumps into crisp relief
  focusTarget = THREE.MathUtils.clamp(d.spec.layerZ, 0.08, 0.96);
  ui.slider?.set(focusTarget, false);

  // If user spotted it from medium/far zoom, smoothly glide closer for a satisfying close-up
  if (camTarget.z > 24) {
    camTarget.x = THREE.MathUtils.clamp(d.worldPos.x, -PAN_LIMIT, PAN_LIMIT);
    camTarget.y = THREE.MathUtils.clamp(d.worldPos.y, -PAN_LIMIT, PAN_LIMIT);
    camTarget.z = 16.5;
  }

  if (!d.found) {
    d.found = true;
    d.foundAt = optics.uTime.value;
    foundCount++;
    updateHudCounter();

    // Emit a subtle localized resonance pulse from the discovered doodle
    optics.uScanOrigin.value.set(d.worldPos.x, d.worldPos.y);
    optics.uScanRadius.value = 0.5;
    optics.uScanStrength.value = 0.85;
    scanActive = true;
    scanAge = 0;

    if (foundCount >= TOTAL_DOODLES) {
      sfx.complete();
      showToast(
        `${d.spec.name} · Die complete!`,
        `All ${TOTAL_DOODLES} / ${TOTAL_DOODLES} doodles logged · Press R for new die`,
        5200
      );
      beaconUntil = 0;
      beaconEl.classList.remove('show');
    } else {
      sfx.found(foundCount, TOTAL_DOODLES);
      showToast(
        `${d.spec.name}`,
        `${d.spec.layer} · ${d.spec.microns} μm · ${foundCount} of ${TOTAL_DOODLES} logged`,
        3200
      );
    }
  } else {
    sfx.turretClick(1.25);
    showToast(
      `${d.spec.name} (logged)`,
      `${d.spec.layer} · ${d.spec.microns} μm · ${d.zone}`,
      2200
    );
  }
  wake();
}

/* ---------- pointer, touch & keyboard interaction ---------- */
const pointers = new Map<number, { x: number; y: number }>();
let dragging = false;
let tiltingLamp = false;
let dragMoved = 0;
let lastPtrX = 0;
let lastPtrY = 0;
let pinchStartDist = 0;
let pinchStartZ = camTarget.z;

stageEl.addEventListener('contextmenu', e => e.preventDefault());

stageEl.addEventListener('pointerdown', e => {
  if (e.target !== canvas && e.target !== stageEl) return;
  stageEl.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 1) {
    dragging = true;
    tiltingLamp = e.button === 2 || e.shiftKey;
    dragMoved = 0;
    lastPtrX = e.clientX;
    lastPtrY = e.clientY;
    stageEl.classList.add('dragging');
  } else if (pointers.size === 2) {
    dragging = false;
    const pts = [...pointers.values()];
    pinchStartDist = Math.max(12, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
    pinchStartZ = camTarget.z;
  }
  wake();
});

stageEl.addEventListener('pointermove', e => {
  const rect = stageEl.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0 && !tiltingLamp) {
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = -(((e.clientY - rect.top) / rect.height - 0.5) * 2);
    if (!isReduced) {
      lampTarget.x = THREE.MathUtils.clamp(0.18 + nx * 0.28, -0.65, 0.65);
      lampTarget.y = THREE.MathUtils.clamp(0.28 + ny * 0.28, -0.65, 0.65);
    }
  }

  if (pointers.has(e.pointerId)) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  if (pointers.size === 2) {
    const pts = [...pointers.values()];
    const dist = Math.max(12, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
    const ratio = pinchStartDist / dist;
    camTarget.z = THREE.MathUtils.clamp(pinchStartZ * ratio, Z_MIN, Z_MAX);
    wake();
    return;
  }

  if (dragging) {
    const dx = e.clientX - lastPtrX;
    const dy = e.clientY - lastPtrY;
    lastPtrX = e.clientX;
    lastPtrY = e.clientY;
    dragMoved += Math.hypot(dx, dy);

    if (tiltingLamp) {
      lampTarget.x = THREE.MathUtils.clamp(lampTarget.x + dx * 0.0045, -0.78, 0.78);
      lampTarget.y = THREE.MathUtils.clamp(lampTarget.y - dy * 0.0045, -0.78, 0.78);
    } else {
      // Exact 1:1 world-units-per-pixel pan on the wafer plane
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5)) * camCur.z;
      const worldPerPx = visH / Math.max(1, viewH);
      camTarget.x = THREE.MathUtils.clamp(camTarget.x - dx * worldPerPx, -PAN_LIMIT, PAN_LIMIT);
      camTarget.y = THREE.MathUtils.clamp(camTarget.y + dy * worldPerPx, -PAN_LIMIT, PAN_LIMIT);
    }
    wake();
    return;
  }

  // Hover detection when close enough to visually discern doodles
  if (camCur.z < 52) {
    const wp = screenToWafer(e.clientX, e.clientY);
    const over = wp ? findDoodleAt(wp.x, wp.y, 1.05) : null;
    if (over !== hoveredDoodle) {
      hoveredDoodle = over;
      stageEl.classList.toggle('over-doodle', !!over);
      wake();
    }
  } else if (hoveredDoodle) {
    hoveredDoodle = null;
    stageEl.classList.remove('over-doodle');
  }
});

function releasePointer(e: PointerEvent) {
  const wasTap = dragging && !tiltingLamp && dragMoved < 7;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    dragging = false;
    tiltingLamp = false;
    stageEl.classList.remove('dragging');
  }

  if (wasTap) {
    const wp = screenToWafer(e.clientX, e.clientY);
    if (wp) {
      const hit = findDoodleAt(wp.x, wp.y, 1.18);
      if (hit) {
        inspectDoodle(hit);
      } else {
        sfx.miss();
      }
    }
  }
}

stageEl.addEventListener('pointerup', releasePointer);
stageEl.addEventListener('pointercancel', releasePointer);

// Intuitive smooth cursor-anchored exponential wheel zoom (scroll up = zoom in)
stageEl.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    const before = screenToWafer(e.clientX, e.clientY)?.clone();
    const delta = THREE.MathUtils.clamp(e.deltaY, -160, 160);
    const factor = Math.exp(delta * 0.00175);
    const nextZ = THREE.MathUtils.clamp(camTarget.z * factor, Z_MIN, Z_MAX);

    // Keep the silicon feature under the pointer anchored while zooming
    if (before && Math.abs(nextZ - camTarget.z) > 1e-4) {
      const scaleChange = 1 - nextZ / camTarget.z;
      camTarget.x = THREE.MathUtils.clamp(
        camTarget.x + (before.x - camTarget.x) * scaleChange * 0.72,
        -PAN_LIMIT,
        PAN_LIMIT
      );
      camTarget.y = THREE.MathUtils.clamp(
        camTarget.y + (before.y - camTarget.y) * scaleChange * 0.72,
        -PAN_LIMIT,
        PAN_LIMIT
      );
    }
    camTarget.z = nextZ;
    if (isReduced) {
      camCur.x = camTarget.x;
      camCur.y = camTarget.y;
      camCur.z = camTarget.z;
    }
    wake();
  },
  { passive: false }
);

// Keyboard navigation & turret hotkeys
const heldKeys = new Set<string>();
window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  const k = e.key.toLowerCase();

  if (k === '1') { setObjective('5x'); return; }
  if (k === '2') { setObjective('20x'); return; }
  if (k === '3') { setObjective('50x'); return; }
  if (k === '4') { setObjective('100x'); return; }
  if (k === 'q') {
    focusTarget = THREE.MathUtils.clamp(focusTarget - 0.08, 0, 1);
    autoFocusOn = false;
    ui.setting('autofocus')?.set(false, false);
    ui.slider?.set(focusTarget, false);
    wake();
    return;
  }
  if (k === 'e') {
    focusTarget = THREE.MathUtils.clamp(focusTarget + 0.08, 0, 1);
    autoFocusOn = false;
    ui.setting('autofocus')?.set(false, false);
    ui.slider?.set(focusTarget, false);
    wake();
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    heldKeys.add(k);
    wake();
  }
});

window.addEventListener('keyup', e => {
  heldKeys.delete(e.key.toLowerCase());
});

/* ---------- HUD telemetry update ---------- */
function updateOpticsTelemetry() {
  // Effective optical magnification readout (5x..120x)
  const mag = Math.round(THREE.MathUtils.clamp(440 / camCur.z, 5, 120));
  magEl.textContent = `${mag}×`;

  // Nearest active metal layer readout
  let bestIdx = 0;
  let bestDiff = Infinity;
  LAYER_STOPS.forEach((l, i) => {
    const diff = Math.abs(focusCur - l.z);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  layerEl.textContent = LAYER_STOPS[bestIdx].name;
  if (bestIdx !== lastLayerIdx) {
    lastLayerIdx = bestIdx;
    sfx.focusTick(bestIdx);
  }

  // Dynamic physical micron scale bar (1 world unit ≈ 14 μm)
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5)) * camCur.z;
  const umPerPx = (visH * 14) / Math.max(1, viewH);
  const niceSteps = [5, 10, 20, 50, 100, 200, 500];
  let chosenUm = 50;
  for (const s of niceSteps) {
    const px = s / umPerPx;
    if (px >= 34 && px <= 96) {
      chosenUm = s;
      break;
    }
  }
  const barPx = THREE.MathUtils.clamp(Math.round(chosenUm / umPerPx), 28, 104);
  scaleBarEl.style.width = `${barPx}px`;
  scaleValEl.textContent = chosenUm >= 1000 ? `${chosenUm / 1000} mm` : `${chosenUm} μm`;
}

/* ---------- animation loop with idle sleep & visibility pause ---------- */
let visible = true;
let rafId = 0;
let lastFrameMs = 0;
let lastActivityMs = performance.now();
let firstFrameDone = false;

function wake() {
  lastActivityMs = performance.now();
  if (visible && !rafId) {
    lastFrameMs = performance.now();
    rafId = requestAnimationFrame(tick);
  }
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

whenVisible(stageEl, (on: boolean) => {
  visible = on;
  if (on) {
    wake();
  } else {
    stopLoop();
    sfx.cancel();
  }
});

function tick(now: number) {
  rafId = 0;
  if (!visible) return;

  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameMs) * 0.001));
  lastFrameMs = now;
  optics.uTime.value += dt;

  // Keyboard stage panning
  if (heldKeys.size > 0) {
    const speed = camCur.z * 0.65 * dt;
    if (heldKeys.has('w') || heldKeys.has('arrowup')) camTarget.y = Math.min(PAN_LIMIT, camTarget.y + speed);
    if (heldKeys.has('s') || heldKeys.has('arrowdown')) camTarget.y = Math.max(-PAN_LIMIT, camTarget.y - speed);
    if (heldKeys.has('a') || heldKeys.has('arrowleft')) camTarget.x = Math.max(-PAN_LIMIT, camTarget.x - speed);
    if (heldKeys.has('d') || heldKeys.has('arrowright')) camTarget.x = Math.min(PAN_LIMIT, camTarget.x + speed);
    lastActivityMs = now;
  }

  // Smooth spring damping
  const camAlpha = isReduced ? 1 : 1 - Math.exp(-dt * 11.5);
  const modeAlpha = isReduced ? 1 : 1 - Math.exp(-dt * 7.5);
  const lampAlpha = isReduced ? 1 : 1 - Math.exp(-dt * 6.5);

  camCur.x += (camTarget.x - camCur.x) * camAlpha;
  camCur.y += (camTarget.y - camCur.y) * camAlpha;
  camCur.z += (camTarget.z - camCur.z) * camAlpha;

  // Gentle auto-focus when near a doodle at high zoom
  if (autoFocusOn && die && camCur.z < 28) {
    const near = findDoodleAt(camCur.x, camCur.y, 1.85);
    if (near) {
      focusTarget += (near.spec.layerZ - focusTarget) * Math.min(1, dt * 4.5);
      ui.slider?.set(focusTarget, false);
    }
  }
  focusCur += (focusTarget - focusCur) * camAlpha;
  optics.uFocusZ.value = focusCur;

  // Smooth mode blend
  optics.uModeWeights.value.lerp(modeTarget, modeAlpha);

  // Subtle lamp vector (adds tiny ambient breathing unless reduced motion)
  const breatheX = isReduced ? 0 : Math.sin(optics.uTime.value * 0.45) * 0.035;
  const breatheY = isReduced ? 0 : Math.cos(optics.uTime.value * 0.37) * 0.035;
  lampCur.x += (lampTarget.x + breatheX - lampCur.x) * lampAlpha;
  lampCur.y += (lampTarget.y + breatheY - lampCur.y) * lampAlpha;
  optics.uLightDir.value.set(lampCur.x, lampCur.y, 0.92).normalize();

  // Camera placement: subtle optical tilt gives real 3D height parallax across M1..M4 and wirebonds!
  const parallaxTilt = THREE.MathUtils.clamp((camCur.z - 12) * 0.015, 0.03, 0.14);
  camera.position.set(camCur.x + lampCur.x * parallaxTilt * 3.0, camCur.y - camCur.z * 0.065, camCur.z);
  camera.lookAt(camCur.x, camCur.y, 0.38);

  // Scan interference wave progression
  if (scanActive) {
    scanAge += dt;
    const dur = isReduced ? 1.1 : 2.2;
    const p = scanAge / dur;
    if (p >= 1) {
      scanActive = false;
      optics.uScanStrength.value = 0;
    } else {
      optics.uScanRadius.value = p * 82.0;
      optics.uScanStrength.value = (1 - p) * (1 - p);
      lastActivityMs = now;
    }
  }

  // Directional beacon auto-hide
  if (beaconUntil > 0 && now > beaconUntil) {
    beaconUntil = 0;
    beaconEl.classList.remove('show');
  }

  // Update per-doodle highlight & found verification ring
  if (die) {
    for (const d of die.doodles) {
      const targetHover = d === hoveredDoodle ? 0.55 : 0.0;
      d.hoverAmount += (targetHover - d.hoverAmount) * Math.min(1, dt * 10);

      let targetHi = d.hoverAmount;
      if (d.found) {
        const age = Math.max(0, optics.uTime.value - d.foundAt);
        const burst = Math.exp(-age * 1.45);
        targetHi = Math.max(targetHi, 0.24 + burst * 1.15);
        d.ringMaterial.uniforms.uOpacity.value = Math.min(0.88, age * 2.4);
        d.ringMaterial.uniforms.uPulse.value = Math.min(1.0, age * 1.35);
      }
      d.highlight += (targetHi - d.highlight) * Math.min(1, dt * 9);
      d.material.uniforms.uHighlight.value = d.highlight;
    }
  }

  // Post-processing dynamic optics response
  // Darkfield & UV shine with slightly richer bloom; global defocus softens if user racks far outside M1..M4
  const darkAndUv = optics.uModeWeights.value.y + optics.uModeWeights.value.w * 0.7;
  pipeline.bloom.strength = bloomBase * (0.85 + darkAndUv * 0.72);
  const stackDist = Math.max(0, Math.max(0.14 - focusCur, focusCur - 0.88));
  const magFactor = THREE.MathUtils.clamp((48 - camCur.z) / 38, 0.2, 1.0);
  pipeline.opticsPass.uniforms.uDefocus.value = stackDist * 2.6 * defocusGain * magFactor;
  pipeline.opticsPass.uniforms.uAberration.value = 0.0014 + magFactor * 0.0014;
  pipeline.opticsPass.uniforms.uTime.value = optics.uTime.value;

  updateOpticsTelemetry();
  pipeline.composer.render();

  if (!firstFrameDone) {
    firstFrameDone = true;
    canvas.classList.add('on');
    mark('first-frame');
  }

  // Idle sleep check: keep running while animating or active, sleep cleanly after 60 s idle
  const mw = optics.uModeWeights.value;
  const modeDelta =
    Math.abs(mw.x - modeTarget.x) +
    Math.abs(mw.y - modeTarget.y) +
    Math.abs(mw.z - modeTarget.z) +
    Math.abs(mw.w - modeTarget.w);
  const settled =
    Math.abs(camTarget.x - camCur.x) < 0.005 &&
    Math.abs(camTarget.y - camCur.y) < 0.005 &&
    Math.abs(camTarget.z - camCur.z) < 0.005 &&
    Math.abs(focusTarget - focusCur) < 0.002 &&
    modeDelta < 0.004 &&
    !scanActive &&
    heldKeys.size === 0;

  if (settled && now - lastActivityMs > SLEEP_MS) {
    return;
  }
  rafId = requestAnimationFrame(tick);
}

resize();
wake();
