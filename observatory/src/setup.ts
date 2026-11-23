import { BufferGeometry, InstancedMesh, PerspectiveCamera, Scene, ShaderMaterial, Texture, WebGLRenderer } from 'three';
import type { Material, Object3D } from 'three';
import { initPage, pageReady, stage } from '../../shared/stim.js';
import { intro as playIntro } from '../../shared/intro.js';
import { loadStars } from './core/catalog.ts';

// The ?cuts review skips the intro, so it starts at once.
// initPage waits for the intro, so the element goes first.
if (new URLSearchParams(location.search).has('cuts')) document.querySelector('.intro')?.remove();

// The Dev rows' hooks; view/cuts and loop.ts fill them after load.
// key: one CamKey of view/cuts.ts.
export const camHooks: { set?(key: string, v: number): void; copy?(): void; shot?(shot: string): void } = {};
// One Dev slider for the cuts' camera.
const camRow = (key: string, label: string, min: number, max: number, step: number) =>
  ({ type: 'slider' as const, id: `cam-${key}`, group: 'Cut camera', label, min, max, step, value: 0, onInput: (v: number) => camHooks.set?.(key, v) });

export const ui = initPage({
  id: 'observatory',
  bar: {
    // Dev: the camera of the shot that shows, with ?dev.
    // Pause a shot, then move a row; Copy gives the lines for the code.
    dev: [
      // The shot that shows, 1 to 5; a pick replays the cuts from that shot.
      { type: 'choice', id: 'cam-shot', group: 'Cut camera', label: 'Shot', display: 'segments', value: 'edge',
        options: ['edge', 'slit', 'lift', 'roll', 'glass', 'mirror'].map((v, i) => ({ value: v, label: String(i + 1) })), onPick: (v: string) => camHooks.shot?.(v) },
      camRow('ex', 'Eye forward', -2, 10, 0.05),
      camRow('ey', 'Eye right', -6, 6, 0.05),
      camRow('ez', 'Eye up', -2, 4, 0.05),
      camRow('lx', 'Look forward', -1.5, 1.5, 0.01),
      camRow('ly', 'Look right', -1.5, 1.5, 0.01),
      camRow('lz', 'Look up', -1.5, 1.5, 0.01),
      camRow('fov', 'Lens (fov)', 3, 60, 0.5),
      camRow('blur', 'Blur', 0, 0.03, 0.001),
      { type: 'button', id: 'cam-copy', group: 'Cut camera', label: 'Shot lines', text: 'Copy', onClick: () => camHooks.copy?.() },
    ],
    // Bar v3 lists every input in How to play: one instruction per row.
    help: [
      ['move', 'Aim the beam'],
      ['click', 'Select a star'],
      ['esc', 'Skip ahead'],
    ],
  },
});

// The intro holds until the page, its font and the first frame are in.
// The cap keeps a failed boot from holding the intro.
playIntro({ ready: pageReady(15000) });

export const stageEl = document.getElementById('stage')!;
const failEl = stageEl.querySelector<HTMLElement>('.fail')!;

export let renderer: WebGLRenderer;

/* ---------- failures: the stage's fail line ---------- */
// Shows the fail line and hides the canvas and the controls.
// Without a text, the line keeps its WebGL 2 text.
export function fail(text?: string): void {
  if (text) failEl.textContent = text;
  failEl.hidden = false;
  // A failure frees the intro, so the fail line shows.
  stage('first-frame');
  if (renderer) renderer.domElement.style.visibility = 'hidden';
  ui.hideControls();
}

try {
  renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  fail();
  throw err;
}
renderer.setClearColor(0x000000, 1);
stageEl.prepend(renderer.domElement);

// Any other failure at boot shows this line.
let failed = false;
// A boot failure shows the line and logs the error once.
export function bootFail(err: unknown): void {
  if (failed) return;
  failed = true;
  fail('Observatory could not start.');
  console.error(err);
}
// Until the boot ends, the first uncaught error is a boot failure.
// preventDefault stops a second report of that error.
// Later errors pass through to the console.
const onError = (e: ErrorEvent): void => {
  if (failed) return;
  e.preventDefault();
  bootFail(e.error ?? e.message);
};
const onRejection = (e: PromiseRejectionEvent): void => {
  if (failed) return;
  e.preventDefault();
  bootFail(e.reason);
};
addEventListener('error', onError);
addEventListener('unhandledrejection', onRejection);
// main.ts ends the boot once the stars are in.
export function booted(): void {
  removeEventListener('error', onError);
  removeEventListener('unhandledrejection', onRejection);
}

// A lost context shows the fail line.
// three.js then skips every render, so nothing draws.
// preventDefault lets the browser give the context back.
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  fail('Observatory lost its WebGL context. Reload the page.');
});

export const scene = new Scene();
export const camera = new PerspectiveCamera(60, 1, 0.1, 5000);

/* ---------- the star catalog starts at once ---------- */
// It loads beside the pine model, which world/woods waits for.
// sky/stars builds the stars from it.
// The bundle is observatory/dist/main.js, so the catalog sits one folder up.
export const starFile = loadStars(new URL('../stars.bin', import.meta.url).href);
// sky/stars handles a failure later.
// This handler stops an early report of it as unhandled.
starFile.catch(() => {});

/* ---------- a real leave frees the GPU ---------- */
// Each module adds the GPU objects it owns with onLeave.
const leaveFns: (() => void)[] = [];
export const onLeave = (fn: () => void): void => { leaveFns.push(fn); };
// A page that goes into the back-forward cache keeps everything.
// It carries on when it comes back.
addEventListener('pagehide', (e) => {
  if (e.persisted) return;
  for (const fn of leaveFns) fn();
  renderer.dispose();
});

// Frees every geometry, material and texture under root.
export function disposeTree(root: Object3D): void {
  root.traverse((o) => {
    if (o instanceof InstancedMesh) o.dispose();
    if ('geometry' in o && o.geometry instanceof BufferGeometry) o.geometry.dispose();
    if (!('material' in o)) return;
    for (const m of ([] as Material[]).concat(o.material as Material | Material[])) {
      for (const v of Object.values(m)) if (v instanceof Texture) v.dispose();
      if (m instanceof ShaderMaterial) for (const u of Object.values(m.uniforms)) if (u.value instanceof Texture) u.value.dispose();
      m.dispose();
    }
  });
}
