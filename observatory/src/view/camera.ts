// Load order: sky/stars runs first.
import '../sky/stars.ts';
import { Vector3 } from 'three';
import { camera } from '../setup.ts';
import { EYE_H, RISE, hillHeight } from '../world/hill.ts';
import { OPENING_S } from '../core/opening.ts';

/* ---------- camera: from the rise, a little above the treetops ---------- */
// The eye stands on the rise 300 m north of the complex and looks south at it.
// The sky fills the upper 60% of the frame.
// These are the Dev rows: eye, pitch, yaw, fov.
// eye: x and z in metres, h in metres over the ground.
// pitch: degrees up; yaw: the azimuth it faces, from north through east; fov: vertical degrees.
export type View = { eye: { x: number; z: number; h: number }; pitch: number; yaw: number; fov: number };

// Landscape and square frames.
export const WIDE: View = { eye: { x: RISE.x, z: RISE.z, h: EYE_H }, pitch: 4, yaw: 177, fov: 40 };
// Portrait frames: a taller lens, so the complex stays in frame.
export const TALL: View = { eye: { x: RISE.x, z: RISE.z, h: EYE_H }, pitch: 6, yaw: 179, fov: 58 };

const DEG = Math.PI / 180;

export function applyCamera(aspect: number, v: View = aspect < 1 ? TALL : WIDE): void {
  camera.aspect = aspect;
  camera.fov = v.fov;
  eyeAt(v, camera.position);
  // Yaw first, then pitch: the horizon stays level.
  camera.rotation.order = 'YXZ';
  camera.rotation.set(v.pitch * DEG, -v.yaw * DEG, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/* ---------- the sweep: the opening's camera move onto the wide shot ---------- */
// The opening starts on the dusk sky, toward the sunset's glow.
// The camera pans and tilts down onto the dome as night falls.
// It stays on the rise: the woods and the land are built for its view.
// The start differs from the end view by these amounts.
// The eye stands at most 10 m higher, the woods' test eye.
const SWEEP = { yaw: 26, pitch: 11, fov: 6, h: 10 };
// The pan leads; the tilt starts later and lands with it.
const TILT_FROM = 0.15;
// Smooth at both ends, so the move starts and lands without a jerk.
const smoother = (k: number): number => k * k * k * (k * (6 * k - 15) + 10);
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const swept: View = { eye: { x: 0, z: 0, h: 0 }, pitch: 0, yaw: 0, fov: 0 };

// The sweep at t seconds into the opening.
// At OPENING_S and after, it is the end view exactly.
export function applySweep(aspect: number, t: number): void {
  const end = aspect < 1 ? TALL : WIDE;
  const k = clamp01(t / OPENING_S);
  const pan = 1 - smoother(k), tilt = 1 - smoother(clamp01((k - TILT_FROM) / (1 - TILT_FROM)));
  swept.eye.x = end.eye.x;
  swept.eye.z = end.eye.z;
  swept.eye.h = end.eye.h + SWEEP.h * tilt;
  swept.yaw = end.yaw + SWEEP.yaw * pan;
  swept.pitch = end.pitch + SWEEP.pitch * tilt;
  swept.fov = end.fov + SWEEP.fov * pan;
  applyCamera(aspect, swept);
}

// The eye of a view in world space.
export function eyeAt(v: View = WIDE, out = new Vector3()): Vector3 {
  return out.set(v.eye.x, hillHeight(v.eye.x, v.eye.z) + v.eye.h, v.eye.z);
}

// A close shot: an eye, the point it looks at, a vertical fov in degrees.
// The cut sequence sets it each frame; a resize keeps it.
export function applyShot(aspect: number, eye: Vector3, look: Vector3, fov: number): void {
  camera.aspect = aspect;
  camera.fov = fov;
  camera.position.copy(eye);
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// Changes one view's rows and applies the camera again; the caller draws.
export function setView(which: 'wide' | 'tall', rows: Partial<Omit<View, 'eye'>> & { eye?: Partial<View['eye']> }): void {
  const v = which === 'wide' ? WIDE : TALL;
  const { eye, ...rest } = rows;
  Object.assign(v, rest);
  if (eye) Object.assign(v.eye, eye);
  applyCamera(camera.aspect);
}
