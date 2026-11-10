// East Van: the shared kit. Colour helpers, the two materials, small geometry.
import * as THREE from 'three';
import { linFit } from '../shared/stim.js';

export const lerp = (a, b, t) => a + (b - a) * t;
export const lift = (c, d) => [Math.min(1, Math.max(0, c[0] + d)), c[1], c[2]];
// OKLCH [L, C, h] in, a linear three.js colour out.
export const lin = c => new THREE.Color().setRGB(...linFit(c[0], c[1], c[2]));

// Paints a geometry: one colour on every vertex.
// Painted geometries merge, so many parts make one draw call.
// boost lifts a glow part over the others on its switch.
export function paint(geo, c, boost = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo, col = lin(c).multiplyScalar(boost), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
// The one paint: flat-shaded Lambert that reads the vertex colours.
export const PAINT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
// Lit parts carry a glow mask in alpha: the lens blooms them.
// NoBlending writes that alpha as it is.
export const glowMat = (gain = 1.5) => new THREE.MeshBasicMaterial({
  vertexColors: true, color: new THREE.Color(gain, gain, gain), transparent: true, opacity: 0.5, blending: THREE.NoBlending,
});

// A square beam from a to b.
const Z = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3(), quat = new THREE.Quaternion();
export function beamGeo(a, b, w) {
  dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = new THREE.BoxGeometry(w, w, dir.length());
  g.applyQuaternion(quat.setFromUnitVectors(Z, dir.clone().normalize()));
  return g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
