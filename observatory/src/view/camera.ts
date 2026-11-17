// Load order: sky/stars runs first.
import '../sky/stars.ts';
import { camera } from '../setup.ts';
import { RISE, hillHeight } from '../world/hill.ts';

/* ---------- camera: from the rise, a little above the treetops ---------- */
// The eye stands on the rise 300 m north of the complex and looks south at it.
// The sky fills the upper 60% of the frame.
// These are the Dev rows: eye, pitch, yaw, fov.
// eye: x and z in metres, h in metres over the ground.
// pitch: degrees up; yaw: the azimuth it faces, from north through east; fov: vertical degrees.
export type View = { eye: { x: number; z: number; h: number }; pitch: number; yaw: number; fov: number };

// Landscape and square frames.
export const WIDE: View = { eye: { x: RISE.x, z: RISE.z, h: 27 }, pitch: 4, yaw: 177, fov: 40 };
// Portrait frames: a taller lens, so the complex stays in frame.
export const TALL: View = { eye: { x: RISE.x, z: RISE.z, h: 27 }, pitch: 6, yaw: 179, fov: 58 };

const DEG = Math.PI / 180;

export function applyCamera(aspect: number, v: View = aspect < 1 ? TALL : WIDE): void {
  camera.aspect = aspect;
  camera.fov = v.fov;
  camera.position.set(v.eye.x, hillHeight(v.eye.x, v.eye.z) + v.eye.h, v.eye.z);
  // Yaw first, then pitch: the horizon stays level.
  camera.rotation.order = 'YXZ';
  camera.rotation.set(v.pitch * DEG, -v.yaw * DEG, 0);
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
