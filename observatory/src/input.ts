// Load order: view/camera runs first.
import './view/camera.ts';
import { Raycaster, Vector2 } from 'three';
import type { AltAz } from './core/sky.ts';
import { classify } from './core/gesture.ts';
import { camera, stageEl } from './setup.ts';

/* ---------- pointer: aim with a move or a drag, pick with a tap ---------- */
const DEG = 180 / Math.PI;

const aimFns: ((a: AltAz) => void)[] = [];
const tapFns: ((a: AltAz) => void)[] = [];
export const onAim = (fn: (a: AltAz) => void): void => { aimFns.push(fn); };
export const onTap = (fn: (a: AltAz) => void): void => { tapFns.push(fn); };
const escFns: (() => void)[] = [];
export const onEsc = (fn: () => void): void => { escFns.push(fn); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') for (const fn of escFns) fn(); });

const ray = new Raycaster(), ndc = new Vector2();
// The camera ray through a client point, as altitude and azimuth.
export function pointerAltAz(clientX: number, clientY: number): AltAz {
  const r = stageEl.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, 1 - ((clientY - r.top) / r.height) * 2);
  ray.setFromCamera(ndc, camera);
  const d = ray.ray.direction;
  const az = Math.atan2(d.x, -d.z) * DEG;
  return { alt: Math.asin(Math.max(-1, Math.min(1, d.y))) * DEG, az: (az + 360) % 360 };
}

let press: { id: number; x: number; y: number; t: number } | null = null;
const aim = (e: PointerEvent) => { const a = pointerAltAz(e.clientX, e.clientY); for (const fn of aimFns) fn(a); };

stageEl.addEventListener('pointerdown', e => {
  // A press on the bar, a sheet or a button is not a tap on the sky.
  if (e.button > 0 || press || !(e.target instanceof HTMLCanvasElement)) return;
  stageEl.setPointerCapture(e.pointerId);
  press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  aim(e);
});
// A mouse aims on a move.
// A finger aims on a drag.
stageEl.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' && (!press || press.id !== e.pointerId)) return;
  aim(e);
});
const end = (e: PointerEvent) => {
  if (!press || press.id !== e.pointerId) return;
  const tap = e.type === 'pointerup'
    && classify(e.clientX - press.x, e.clientY - press.y, performance.now() - press.t) === 'tap';
  press = null;
  if (!tap) return;
  const a = pointerAltAz(e.clientX, e.clientY);
  for (const fn of tapFns) fn(a);
};
stageEl.addEventListener('pointerup', end);
stageEl.addEventListener('pointercancel', end);
stageEl.addEventListener('lostpointercapture', end);
