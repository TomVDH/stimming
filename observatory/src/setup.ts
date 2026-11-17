import { BufferGeometry, InstancedMesh, PerspectiveCamera, Scene, ShaderMaterial, Texture, WebGLRenderer } from 'three';
import type { Material, Object3D } from 'three';
import { initPage } from '../../shared/stim.js';
import { loadStars } from './core/catalog.ts';

// The Bar v2 spec and the Dev rows come in later tasks.
export const ui = initPage({ id: 'observatory', bar: {} });

export const stageEl = document.getElementById('stage')!;
const failEl = stageEl.querySelector<HTMLElement>('.fail')!;

export let renderer: WebGLRenderer;

/* ---------- failures: the stage's fail line ---------- */
// Shows the fail line and hides the canvas and the controls.
// Without a text, the line keeps its WebGL 2 text.
export function fail(text?: string): void {
  if (text) failEl.textContent = text;
  failEl.hidden = false;
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
