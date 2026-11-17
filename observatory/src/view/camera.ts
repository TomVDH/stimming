// Load order: sky/stars runs first.
import '../sky/stars.ts';
import { camera } from '../setup.ts';
import { hillHeight } from '../world/hill.ts';

/* ---------- camera: low, wide and locked off, facing south ---------- */
// The eye stands north of the dome on the slope and looks south, up at the ridge.
// The dome sits a third from the right; the sky fills three quarters.
// eye: x and z in metres, h in metres over the ground.
// pitch: degrees up; yaw: the azimuth it faces, from north through east; fov: vertical degrees.
export type View = { eye: { x: number; z: number; h: number }; pitch: number; yaw: number; fov: number };

// Landscape and square frames.
export const WIDE: View = { eye: { x: 0, z: -70, h: 1.6 }, pitch: 21, yaw: 166, fov: 50 };
// Portrait frames: a taller lens, turned near the dome so it stays in frame.
export const TALL: View = { eye: { x: 0, z: -70, h: 1.6 }, pitch: 28, yaw: 176, fov: 68 };

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
