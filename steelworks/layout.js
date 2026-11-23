// Steelworks layout: the cast house in metres.
// The cast floor is y = 0; x points right, z toward the eye.
import * as THREE from 'three';

const v2 = (x, z) => new THREE.Vector2(x, z);

// The furnace: hearth centre on the floor plan, and its radius.
export const FURNACE = { x: -10, z: -13, r: 6 };
// The taphole faces this way, along the trough.
export const TAP_DIR = v2(1, 0.35).normalize();
export const TAP = v2(FURNACE.x + TAP_DIR.x * FURNACE.r, FURNACE.z + TAP_DIR.y * FURNACE.r);
export const TAP_Y = 1.15;
// The cast floor ends at this x; below it lies the ladle track.
export const EDGE_X = 13.5;
export const LOW_Y = -5.5;
export const ROOF_Y = 24;
export const HALL = { x0: -24, x1: 24, z0: -36, z1: 20 };
// Column lines, left and right.
export const COL_X = [-18, 19.5];

// Channels: a polyline on the floor plan, a bed width, and bed heights.
// The trough runs from the taphole to the skimmer.
const S = TAP.clone().addScaledVector(TAP_DIR, 10.5);
const J = TAP.clone().addScaledVector(TAP_DIR, 9.2);
export const SKIM = S;
export const CHANNELS = [
  { id: 'trough', pts: [TAP.clone(), S.clone()], w: 1.0, y0: -0.66, y1: -0.74 },
  { id: 'iron', pts: [S.clone(), v2(S.x + 2.4, S.y + 1.3), v2(S.x + 5.4, S.y + 3.0), v2(EDGE_X + 0.35, S.y + 3.5)], w: 0.62, y0: -0.44, y1: -0.74 },
  { id: 'slag', pts: [J.clone(), v2(J.x - 0.6, J.y + 2.4), v2(J.x - 2.0, J.y + 5.8), v2(J.x - 3.6, J.y + 9.2)], w: 0.56, y0: -0.4, y1: -0.66 },
];
// The carved floor: the patch round the channels, and its cell size.
export const CARVE = { x0: -7, x1: EDGE_X, z0: -14, z1: J.y + 8.9, cell: 0.16 };
// The ladle under the spout, on the low track.
export const LADLE = new THREE.Vector3(EDGE_X + 1.25, LOW_Y, S.y + 3.5);
// The cast floor's front edge; the slag runner spills over it.
export const FRONT_Z = J.y + 8.9;
// The slag pot below the front edge, on the low floor.
export const SLAG_PIT = new THREE.Vector3(J.x - 3.75, LOW_Y, J.y + 10.4);

// The eye and the aim, for a wide stage.
export const EYE = new THREE.Vector3(15, 6.5, 11);
export const AIM = new THREE.Vector3(-1.5, 4.2, -11);

// The yard lights shine in through the right wall's high windows.
// Light travels along SHAFT.
export const SHAFT = new THREE.Vector3(-0.62, -0.52, 0.22).normalize();
export const WIN = { x: HALL.x1, y0: 12.5, y1: 20.5, bay: 7.0, w: 4.6, z0: -34, z1: 15 };

// Distance from a floor point to a polyline, and the arc length there.
export function polyNear(pts, x, z) {
  let best = 1e9, bs = 0, acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.y - a.y, l2 = dx * dx + dz * dz, l = Math.sqrt(l2);
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.y) * dz) / l2));
    const d = Math.hypot(x - a.x - dx * t, z - a.y - dz * t);
    if (d < best) { best = d; bs = acc + t * l; }
    acc += l;
  }
  return [best, bs];
}

// Arc length along a polyline: the total and the point at s.
export function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
  return L;
}
export function polyAt(pts, s, out = new THREE.Vector2(), dir = null) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = a.distanceTo(b);
    if (s <= l || i === pts.length - 1) {
      const t = Math.max(0, Math.min(1, s / l));
      out.copy(a).lerp(b, t);
      if (dir) dir.copy(b).sub(a).normalize();
      return out;
    }
    s -= l;
  }
  return out.copy(pts[pts.length - 1]);
}
