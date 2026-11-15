// Ascent cameras: static hull mounts with a Dutch roll each.
// A mount is a place on the hull, a view direction and a lens.
// Places are in the rocket frame: angle around the body, height, radius.
import * as THREE from 'three';
import { EV } from './flight.js';

const D2R = Math.PI / 180;

// at: angle around the body, a height key from the rocket's dims plus metres,
// and a radius key plus metres. Metres scale with the rocket's length.
// view: 'aft' looks down the body, 'fwd' looks up it, 'side' looks out.
// tilt pushes the view away from the hull, in degrees.
export const CAMS = {
  // The engine cam faces the lagoon and the marsh at liftoff.
  engine: { label: 'Engine', stage: 1, at: [160, 's1Top', -3.5, 'r', 0.45], view: 'aft', tilt: 20, dutch: -13, fov: 68 },
  fin: { label: 'Fin', stage: 1, at: [200, 'bell', 3.6, 'r', 0.5], view: 'fwd', tilt: 7, dutch: 16, fov: 70 },
  upper: { label: 'Upper', stage: 2, at: [0, 'upperTop', -0.6, 'rf', 0.15], view: 'aft', tilt: 7, dutch: 11, fov: 58 },
  payload: { label: 'Payload', stage: 2, at: [90, 'payload', 0.5, 'rf', -0.8], view: 'fwd', tilt: 24, dutch: -9, fov: 74 },
  window: { label: 'Window', stage: 2, at: [0, 'upperTop', -4, 'ru', 0.1], view: 'side', tilt: 74, dutch: 6, fov: 50 },
  // Probe mounts use plain points in the probe's frame: eye, target, up.
  probe: { label: 'Probe', stage: 3, eye: [-2.4, 3.4, 4.6], target: [2.6, 1.2, 0.0], dutch: 9, fov: 60 },
  lonely: { label: 'Lonely', stage: 3, eye: [1.15, 2.1, 1.3], target: [6.0, -3.6, -0.6], dutch: -14, fov: 80 },
};
export const CAM_IDS = Object.keys(CAMS);

// The director's cuts: a start time and a camera.
export const CUTS = [
  [0, 'engine'], [12, 'fin'], [24, 'engine'], [50, 'fin'], [70, 'engine'],
  [EV.sep - 4, 'upper'], [EV.fairing - 2, 'payload'], [EV.fairing + 14, 'upper'], [EV.seco - 6, 'window'],
  [EV.tli - 3, 'upper'], [EV.probeSep - 1, 'probe'], [EV.deployEnd + 8, 'lonely'],
  [EV.far + 15, 'probe'], [EV.far + 75, 'lonely'],
];
export function cutAt(t) {
  let id = CUTS[0][1];
  for (const [s, c] of CUTS) if (t >= s) id = c;
  return id;
}

// The mount's pose in its body's frame; d is the rocket's dims.
const m4 = new THREE.Matrix4(), zero = new THREE.Vector3();
export function mountPose(id, d) {
  const c = CAMS[id];
  if (c.eye) {
    const pos = new THREE.Vector3(...c.eye);
    m4.lookAt(pos, new THREE.Vector3(...c.target), new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m4);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), c.dutch * D2R));
    return { pos, q, fov: c.fov };
  }
  const a = c.at[0] * D2R, k = d.L / 55;
  const rad = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const pos = rad.clone().multiplyScalar(d[c.at[3]] + c.at[4] * Math.min(1, k)).setY(d[c.at[1]] + c.at[2] * k);
  const tl = c.tilt * D2R;
  let dir, up;
  if (c.view === 'side') {
    // Out from the hull, angled toward the nose and the way ahead.
    dir = rad.clone().multiplyScalar(Math.sin(tl)).add(new THREE.Vector3(0, Math.cos(tl), 0)).normalize();
    up = new THREE.Vector3(0, 1, 0);
  } else {
    const y = c.view === 'aft' ? -1 : 1;
    dir = new THREE.Vector3(0, y * Math.cos(tl), 0).addScaledVector(rad, Math.sin(tl)).normalize();
    up = rad.clone();
  }
  m4.lookAt(zero, dir, up);
  const q = new THREE.Quaternion().setFromRotationMatrix(m4);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), c.dutch * D2R));
  return { pos, q, fov: c.fov };
}
