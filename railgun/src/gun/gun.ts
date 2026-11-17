// @ts-nocheck
// Load order: clouds/lightning runs first.
import '../clouds/lightning.ts';
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createNoise3D } from 'simplex-noise';
import { linFit } from '../../../shared/stim.js';
import { rad, rnd, scene, v3 } from '../setup.ts';
import { A0, AX, BERM_R, ELEV, L, LIFT, RISE, TRUN_Y, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { GROUND_C } from '../world/ground.ts';

/* ---------- the gun: one clean artillery piece ---------- */
// Every piece is a straight block or drum; one merged mesh, one draw call.
// aPart: station, part level, seed (plus 2 when fixed), tone (2 is graphite).
// Level 0.5 elevates with the cradle; level 1 also recoils.
export const noise3 = createNoise3D(rnd);
function part(geo, recoil = 0, tone = 0, fixed = 0) {
  const p = geo.attributes.position, v = new THREE.Vector3(), seed = rnd();
  const a = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(A0);
    a.set([v.dot(AX) / L, recoil, seed + 2 * fixed, tone], i * 4);
  }
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(a, 4));
  // Each piece keeps its own normals: boxes stay crisp, drums and bevels shade smooth.
  geo.deleteAttribute('uv');
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}
// A block in the world frame; y is its centre.
const block = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
// The central pylon: half widths at the shaft and the foot, leg width.
const PYLON = { shaft: 95, foot: 250, leg: 70, d: 120, collar: 0.18 };
// The pylon seen from the front: the yoke and a short collar stand plumb.
// Below the collar the pylon spreads like an A.
// Its profile lies in x and y; it runs d metres along z, centred on the pin.
function aPylon(y0, top) {
  const S = PYLON.shaft, F = PYLON.foot, t = PYLON.leg, mid = top - (top - y0) * PYLON.collar;
  const sh = new THREE.Shape().moveTo(-F, y0).lineTo(F, y0).lineTo(S, mid).lineTo(S, top).lineTo(-S, top).lineTo(-S, mid).closePath();
  // The A's opening: sides parallel to the legs, a pointed head.
  const outX = y => F - (F - S) * (y - y0) / (mid - y0);
  const h0 = y0 + 12, h1 = mid - 34;
  sh.holes.push(new THREE.Path().moveTo(-(outX(h0) - t), h0).lineTo(outX(h0) - t, h0).lineTo(outX(h1) - t, h1).lineTo(0, mid - 8).lineTo(-(outX(h1) - t), h1).closePath());
  const g = new THREE.ExtrudeGeometry(sh, { depth: PYLON.d, curveSegments: 8, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 1 });
  // The merge needs an indexed piece, as every other piece is.
  g.deleteAttribute('uv'); g.clearGroups();
  return mergeVertices(g).translate(0, 0, -PYLON.d / 2);
}
// Narrow a box's top: kx across, kz along, then shift the top along z.
function taper(g, kx, kz, dz = 0) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * kx, p.getY(i), p.getZ(i) * kz + dz);
  g.computeVertexNormals();
  return g;
}
// The barrel frame: a along the axis, x across, u above it.
const toBarrel = (g, a0, a1, x, u) => g.translate(x, u, -(a0 + a1) / 2).rotateX(ELEV).translate(A0.x, A0.y, A0.z);
const slab = (w, h, a0, a1, x = 0, u = 0) => toBarrel(new THREE.BoxGeometry(w, h, a1 - a0), a0, a1, x, u);
// A slab with chamfered edges, r metres wide.
// One bevel step: the flat-face shading shows it as a lit edge.
function bslab(w, h, a0, a1, x = 0, u = 0, r = 4) {
  let g = new RoundedBoxGeometry(w, h, a1 - a0, 1, r);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  // Shared corners give the bevel a smooth roll of light.
  g.computeVertexNormals();
  return toBarrel(g, a0, a1, x, u);
}
const tube = (r, a0, a1, x = 0, u = 0) => toBarrel(new THREE.CylinderGeometry(r, r, a1 - a0, 24, 1).rotateX(Math.PI / 2), a0, a1, x, u);
const Z1 = new THREE.Vector3(0, 0, 1);
function beam(p, q, w, h) {
  const d = new THREE.Vector3().subVectors(q, p), len = d.length();
  const g = new THREE.BoxGeometry(w, h, len);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z1, d.normalize()));
  return g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
}
// The brake's port stations, in metres from the trunnion.
export const BRAKE_PORTS = [L - 66, L - 48, L - 30, L - 14];
// The back block's side vents: station and height, in the barrel frame.
export const VENTS = [[-288, 22], [-278, 34], [-268, 22], [-258, 34]];
// The recoil well in the deck: half width, front and back, floor.
export const WELL = { x: 72, z0: 62, z1: 370, floor: -40 };
// The antenna's station and its tip's height, in the barrel frame.
export const ANT = { a: -264, u: 250 };
// The viewfinder's station, and its optic's side offset and height.
export const VF = { a: -33, x: 21, u: 104 };
// The barrel's half width and half height at a metres from the trunnion.
export const halfW = a => a < 250 ? 62 : a < 460 ? 24 : a < L - 82 ? 18 : 22;
export const halfH = a => a < 250 ? 54 : a < 460 ? 24 : a < L - 82 ? 18 : 22;
// A square strut in the barrel frame, from (a0, u0) to (a1, u1).
const spar = (a0, u0, a1, u1, x, w) => beam(barrelPt(a0, x, u0, v3()), barrelPt(a1, x, u1, v3()), w, w);
function buildGun() {
  const pieces = [];
  // World-frame pieces rise with the berm; fixed 2 marks a piece on the ground.
  const add = (g, level = 0, tone = 0, fixed = 0) => pieces.push(part(level === 0 && fixed !== 2 ? g.translate(0, LIFT, 0) : g, level, tone, fixed));
  const drum = (r0, r1, h, y, n = 72) => new THREE.CylinderGeometry(r0, r1, h, n, 1).translate(0, y, 0);
  // The fixed plinth: an apron, a parapet, buttresses, a ramp.
  // A berm stands under it only while LIFT is above zero.
  if (LIFT > 0) add(drum(456, BERM_R, LIFT, LIFT / 2, 96), 0, 4, 2);
  // The apron steps down in two battered tiers.
  add(drum(446, 478, 10, 5), 0, 0, 1);
  add(drum(432, 446, 14, 17), 0, 0, 1);
  // Each buttress tooth leans in: a narrow top, a long sloped back.
  for (let i = 0; i < 12; i++) add(taper(new THREE.BoxGeometry(70, 30, 110), 0.62, 0.45, -24).translate(0, 15, 474).rotateY(rad(i * 30 + 15)), 0, 0, 1);
  add(beam(v3(0, LIFT + 3, 470), v3(0, 3, 1460), 46, 6), 0, 0, 2);
  // The deck turns on a dark race ring.
  add(drum(404, 404, 4, 23, 64), 0, 2);
  // The deck has a slot behind the pylon: the recoil well.
  // The breech swings down into it as the gun climbs.
  { const disc = (r, h, y) => {
      const sh = new THREE.Shape().absarc(0, 0, r, 0, Math.PI * 2, false);
      sh.holes.push(new THREE.Path().moveTo(-WELL.x, -WELL.z0).lineTo(WELL.x, -WELL.z0).lineTo(WELL.x, -WELL.z1).lineTo(-WELL.x, -WELL.z1).closePath());
      const g = new THREE.ExtrudeGeometry(sh, { depth: h, curveSegments: 64, bevelEnabled: false });
      // The merge needs an indexed piece, as every other piece is.
      g.deleteAttribute('uv'); g.clearGroups();
      return mergeVertices(g).rotateX(-Math.PI / 2).translate(0, y, 0);
    };
    add(disc(396, 12, 18));
    add(disc(384, 4, 30)); }
  // The well's walls drop below the plain; its floor is dark.
  for (const sd of [-1, 1]) add(block(6, 34 - WELL.floor, WELL.z1 - WELL.z0, sd * (WELL.x + 3), (34 + WELL.floor) / 2, (WELL.z0 + WELL.z1) / 2), 0, 2);
  for (const z of [WELL.z0, WELL.z1]) add(block(2 * WELL.x + 12, 34 - WELL.floor, 6, 0, (34 + WELL.floor) / 2, z), 0, 2);
  // A yellow lip marks the well's edge.
  for (const sd of [-1, 1]) add(block(5, 3, WELL.z1 - WELL.z0, sd * (WELL.x + 3), 35.5, (WELL.z0 + WELL.z1) / 2), 0, 3);
  // The bolts ring the deck; the well cuts none.
  for (let i = 0; i < 48; i++) add(new THREE.BoxGeometry(14, 5, 8).translate(0, 36.5, 378).rotateY(i * Math.PI / 24), 0, 2);
  // Mount: a footing, one thick pylon, a yoke for the pin.
  // The footing stops at the well's front wall.
  add(block(2 * PYLON.foot + 40, 12, 170, 0, 40, -25));
  add(aPylon(46, 140 + RISE));
  // A yellow band rings the shaft where the A spreads.
  add(block(2 * PYLON.shaft + 10, 8, PYLON.d + 10, 0, 140 + RISE - (94 + RISE) * PYLON.collar, 0), 0, 3);
  add(block(214, 10, 136, 0, 138 + RISE, 0), 0, 2);
  for (const sd of [-1, 1]) {
    add(block(26, 132, 112, sd * 80, 189 + RISE, 0));
    add(new THREE.CylinderGeometry(40, 40, 8, 32, 1).rotateZ(Math.PI / 2).translate(sd * 96, A0.y - LIFT, 0), 0, 2);
    // A braced strut climbs from the deck to the pylon's back.
    // The struts stand wide, so the well runs between them.
    add(beam(v3(sd * 112, 34, 330), v3(sd * 84, 124 + RISE, 66), 26, 20));
    add(block(40, 10, 40, sd * 112, 39, 334));
    add(block(14, 34, 14, sd * 106, 51, 230));
    // A tie runs from each strut's foot to the pylon's foot.
    add(beam(v3(sd * 112, 40, 320), v3(sd * 190, 40, 66), 10, 8), 0, 2);
    // A pinion housing drives each quadrant.
    add(block(30, 36, 50, sd * 110, 92 + RISE, 0), 0, 2);
  }
  add(new THREE.CylinderGeometry(26, 26, 240, 24, 1).rotateZ(Math.PI / 2).translate(0, A0.y - LIFT, 0), 0, 2);
  // A machinery house with louvres sits beside the far strut.
  add(block(80, 40, 90, -190, 54, 170));
  for (let z = 135; z <= 205; z += 12) add(block(83, 26, 3, -190, 56, z), 0, 2);
  // A service tower stands on the near side; a catwalk joins the yoke.
  add(block(16, 170 + RISE, 16, 170, 119 + RISE / 2, 40));
  add(block(26, 14, 26, 170, 211 + RISE, 40), 0, 2);
  add(block(72, 3, 8, 129, 200 + RISE, 40), 0, 2);
  for (const y of [76, 118, 160]) add(block(20, 3, 20, 170, y, 40), 0, 2);
  // Breech housing: one ribbed box behind the pin, a bank on its back.
  add(slab(120, 104, -250, 70, 0, 4), 0.5, 0);
  for (let a = -226; a < 60; a += 26) add(slab(128, 82, a - 3, a + 3, 0, 4), 0.5, 2);
  add(slab(84, 28, -214, -16, 0, 70), 0.5, 0);
  // The back block: a wide lower tier with the vents, a narrower upper tier.
  // A wide breech sleeve rides with the back block; at rest the housing hides it.
  // On the shot it telescopes out of the housing's back, about 270 m.
  add(tube(38, -300, 68, 0, 4), 0.8, 0);
  for (const a of [-286, -232, -178, -124, -70, -16]) add(tube(39.5, a, a + 5, 0, 4), 0.8, 2);
  add(tube(39.5, -150, -136, 0, 4), 0.8, 3);
  // Two slide rods ride the back block; on the shot they draw out of the housing.
  for (const sd of [-1, 1]) add(tube(6, -300, 40, sd * 30, -30), 0.8, 2);
  // The back block rides 0.85 of the recoil (level 0.8): on the shot it slides out of the housing.
  add(slab(100, 54, -302, -250, 0, -14), 0.8, 0);
  add(slab(84, 30, -296, -254, 0, 28), 0.8, 0);
  add(slab(102, 4, -300, -252, 0, 13), 0.8, 2);
  // Side vents: louvres on both flanks of the upper tier.
  for (const sd of [-1, 1]) for (const [a, u] of VENTS) for (const k of [-3, 0, 3]) add(slab(3, 2, a - 5, a + 5, sd * 42.5, u + k), 0.8, 2);
  // A bolted equipment module rides each flank of the lower tier.
  for (const sd of [-1, 1]) {
    add(slab(12, 40, -298, -256, sd * 56, -16), 0.8, 0);
    add(slab(14, 42, -299, -297, sd * 56, -16), 0.8, 2);
    add(slab(14, 42, -257, -255, sd * 56, -16), 0.8, 2);
    // A grille, a yellow band and a fat feed pipe up into the housing.
    for (const k of [-6, -1, 4, 9]) add(slab(13, 2, -292, -272, sd * 56, -16 + k), 0.8, 2);
    add(slab(13, 4, -298, -256, sd * 56, -34), 0.8, 3);
    add(tube(3.5, -266, -244, sd * 63, 0), 0.8, 2);
  }
  // The counterweight: one armoured mass with an end cap; only it is chamfered.
  add(bslab(88, 58, -352, -302, 0, -6, 10), 0.8, 0);
  add(bslab(70, 42, -368, -352, 0, -10, 8), 0.8, 2);
  // A yellow band marks the joint; two lugs stand on top for the crane.
  add(slab(90, 60, -306, -303, 0, -6), 0.8, 3);
  for (const sd of [-1, 1]) add(bslab(10, 12, -338, -326, sd * 24, 28, 2), 0.8, 2);
  // Coolant fins stand on the top bank.
  for (let a = -206; a < -24; a += 9) add(slab(70, 12, a, a + 3, 0, 90), 0.5, 2);
  for (const sd of [-1, 1]) {
    // Cable bundles sag from the breech housing to the cradle neck.
    // They leave the housing's flank and meet the neck.
    for (const [x0, u, sag] of [[84, 30, 40], [90, 16, 52], [80, 4, 60]]) {
      const N = 8, a0 = -130, a1 = 236, x1 = 38;
      const at = (f, out) => barrelPt(a0 + (a1 - a0) * f, sd * (x0 + (x1 - x0) * f), u - sag * Math.sin(Math.PI * f), out);
      for (let i = 0; i < N; i++) add(beam(at(i / N, v3()), at((i + 1) / N, v3()), 4, 4), 0.5, 2);
    }
    // Capacitor banks ride the flanks behind the yoke.
    for (let a = -240; a < -90; a += 21) {
      // The ejector flap's span on the near flank stays clear.
      if (sd > 0 && a < -146) continue;
      add(slab(14, 56, a, a + 15, sd * 69, 0), 0.5, 0);
      add(slab(16, 6, a - 1, a + 16, sd * 69, 31), 0.5, 2);
      add(tube(3, a + 5, a + 10, sd * 79, 12), 0.5, 2);
    }
    add(slab(4, 6, sd > 0 ? -138 : -244, -88, sd * 78, -22), 0.5, 2);
    add(tube(2.5, sd > 0 ? -136 : -240, -84, sd * 82, 24), 0.5, 2);
    // Recoil cylinders lie on the neck; their rods ride the barrel.
    add(tube(8, 60, 250, sd * 15, 34), 0.5, 0);
    add(tube(4, 250, 330, sd * 15, 34), 0.8, 2);
    // A toothed quadrant hangs under the pin.
    for (let i = 0; i < 12; i++) {
      const t0 = rad(-40 + i * 80 / 12), t1 = rad(-40 + (i + 1) * 80 / 12);
      add(spar(120 * Math.sin(t0), -120 * Math.cos(t0), 120 * Math.sin(t1), -120 * Math.cos(t1), sd * 112, 9), 0.5, 2);
    }
    for (const t of [-40, 0, 40]) add(spar(0, 0, 120 * Math.sin(rad(t)), -120 * Math.cos(rad(t)), sd * 112, 5), 0.5, 2);
    // A truss stiffens the tongue.
    add(spar(190, -35, 250, -66, sd * 18, 5), 0.5, 2);
    add(spar(250, -66, 440, -66, sd * 18, 5), 0.5, 2);
    for (let a = 250; a < 440; a += 63.3) {
      add(spar(a, -45, a, -66, sd * 18, 4), 0.5, 2);
      add(spar(a, -66, a + 63.3, -45, sd * 18, 3), 0.5, 2);
    }
    add(slab(6, 8, 250, 440, sd * 27, 24), 0.5, 2);
    // Dark rails run the barrel's flanks.
    add(slab(3, 12, 462, L - 36, sd * 16.5, 0), 0.8, 2);
  }
  // An antenna mast stands on the back block, with a beacon at its tip.
  // One straight mast in yellow and pale bands.
  add(bslab(14, 6, ANT.a - 7, ANT.a + 7, 0, 46, 2), 0.8, 2);
  // The mast stands plumb at rest, not along the barrel's tilt.
  { const b0 = barrelPt(ANT.a, 0, 49, v3()), H = ANT.u - 49, n = 8;
    for (let i = 0; i < n; i++) add(beam(v3(b0.x, b0.y + H * i / n, b0.z), v3(b0.x, b0.y + H * (i + 1) / n, b0.z), 4, 4), 0.8, i % 2 ? 0 : 3); }
  // A rangefinder bar sits on a pedestal at the housing's front.
  // The viewfinder: a squat eight-sided cupola on a ring, a dark visor,
  // and a long sighting optic along its right side, parallel to the bore.
  // The barrel frame keeps y as up, so an upright drum needs no turn.
  const up = (g, x, u, a) => toBarrel(g, a, a, x, u);
  add(up(new THREE.CylinderGeometry(19, 21, 6, 32, 1), 0, 87, VF.a), 0.5, 2);
  add(up(new THREE.CylinderGeometry(13, 16, 18, 8, 1), 0, 99, VF.a), 0.5, 0);
  add(up(new THREE.CylinderGeometry(9, 13, 4, 8, 1), 0, 110, VF.a), 0.5, 0);
  add(slab(20, 7, VF.a + 10, VF.a + 17, 0, 101), 0.5, 2);
  add(tube(4.5, VF.a - 30, VF.a + 24, VF.x, VF.u), 0.5, 0);
  add(tube(5.5, VF.a + 20, VF.a + 28, VF.x, VF.u), 0.5, 2);
  for (const a of [VF.a - 18, VF.a + 8]) add(slab(4, 10, a - 2, a + 2, VF.x - 8, VF.u - 4), 0.5, 2);
  // Cradle: a box neck, then a tongue with three collars and fins.
  add(slab(70, 62, 70, 250, 0, -4), 0.5, 0);
  add(slab(40, 18, 250, 440, 0, -36), 0.5, 0);
  for (const a of [250, 345, 440]) add(slab(62, 74, a - 8, a + 8, 0, -8), 0.5, 0);
  for (let a = 362; a < 430; a += 11) add(slab(54, 54, a, a + 2.5), 0.5, 2);
  // Barrel: a thick root, a long slender tube, a braked muzzle.
  add(tube(23, 250, 460), 1, 0);
  add(slab(44, 14, 326, 334, 0, 28), 1, 2);
  // Past the root: a thick jacket, then the tube, stepped down after a braced mid collar.
  const J = 460 + 0.3 * (L - 542), M = 460 + 0.62 * (L - 542);
  add(tube(20, 460, J), 1, 0);
  for (const a of [460, J - 4]) add(tube(22, a, a + 4), 1, 2);
  add(tube(16, J, M), 1, 0);
  add(tube(14.5, M, L - 94), 1, 0);
  // The collar: a fat ring with two flanges and four short braces to the jacket's end.
  add(tube(21, M - 9, M + 9), 1, 0);
  for (const a of [M - 12, M + 9]) add(tube(23, a, a + 3), 1, 2);
  for (const k of [0, 1, 2, 3]) {
    const th = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(th), u = Math.sin(th);
    add(beam(barrelPt(J, x * 21, u * 21, v3()), barrelPt(M - 12, x * 22, u * 22, v3()), 3, 3), 1, 2);
  }
  // Bands at even steps along the tube.
  for (let a = J + 40; a < L - 120; a += 62) if (Math.abs(a - M) > 30) add(tube(a < M ? 17.4 : 15.9, a, a + 3), 1, 2);
  // The muzzle brake: a long round sleeve with four rings of side ports.
  // A taper eases the barrel into it; a lip closes the bore.
  add(toBarrel(new THREE.CylinderGeometry(22, 14.5, 12, 32, 1).rotateX(-Math.PI / 2), L - 94, L - 82, 0, 0), 1, 0);
  add(tube(22, L - 82, L), 1, 0);
  for (const a of [L - 82, L - 3]) add(tube(24, a, a + 4), 1, 2);
  for (const a of BRAKE_PORTS) {
    // A dark port slot through each side, and a raised band behind it.
    add(slab(47, 14, a - 6, a + 6), 1, 2);
    add(tube(23.5, a + 8, a + 10), 1, 0);
  }
  add(tube(19, L - 1, L + 3), 1, 2);
  // Tone 3 is yellow paint: four bands.
  for (const [a, r, len] of [[300, 23.6, 14], [J - 22, 20.6, 14], [M + 22, 15.1, 12], [L - 140, 15.1, 14]]) add(tube(r, a, a + len), 1, 3);
  // A thin second tube hangs under the barrel to the collar's far side, on even hangers.
  add(tube(7, 440, M + 60, 0, -30), 1, 0);
  for (let a = 520; a < M + 60; a += 90) add(slab(9, 20, a - 3, a + 3, 0, -20), 1, 2);
  return mergeGeometries(pieces, false);
}
// Pale concrete, graphite mechanics, grey paint, yellow paint.
export const SHELL_C = linFit(0.62, 0.014, 80), DARK_C = linFit(0.15, 0.012, 255), HULL_C = linFit(0.68, 0.008, 235), BAND_C = linFit(0.74, 0.13, 92);
// Recoil along the axis, then a turn about the trunnion pin.
export const AIM = /* glsl */`
uniform vec3 uAxis0; uniform float uRecoil; uniform vec2 uDrop, uYaw;
// f: 0.5 elevates, 1 also recoils. g marks the turning mount.
vec3 aim(vec3 p, float f, float g) {
  float e = step(0.25, f);
  // The round barrel slides the full recoil; the back block and its sleeve 0.85.
  // The square housing and the cradle hold still.
  p -= uAxis0 * uRecoil * step(0.75, f) * mix(0.85, 1.0, step(0.95, f));
  vec2 q = vec2(p.y - ${TRUN_Y.toFixed(1)}, p.z);
  vec2 r = vec2(q.x * uDrop.x + q.y * uDrop.y, q.y * uDrop.x - q.x * uDrop.y);
  p = mix(p, vec3(p.x, r.x + ${TRUN_Y.toFixed(1)}, r.y), e);
  vec3 t = vec3(p.x * uYaw.x + p.z * uYaw.y, p.y, p.z * uYaw.x - p.x * uYaw.y);
  return mix(p, t, g);
}
// A normal turns with its piece: the climb, then the mount's yaw; no slide.
vec3 aimN(vec3 n, float f, float g) {
  vec2 r = vec2(n.y * uDrop.x + n.z * uDrop.y, n.z * uDrop.x - n.y * uDrop.y);
  n = mix(n, vec3(n.x, r.x, r.y), step(0.25, f));
  vec3 t = vec3(n.x * uYaw.x + n.z * uYaw.y, n.y, n.z * uYaw.x - n.x * uYaw.y);
  return mix(n, t, g);
}`;
// The gun and the ship share the panel seams.
export const SEAM = /* glsl */`
// A line every period metres, w metres wide, softened to a pixel.
float seam(float x, float period, float w) {
  float d = (0.5 - abs(fract(x / period) - 0.5)) * period;
  return 1.0 - smoothstep(w, w + fwidth(x), d);
}`;
// Physically based light for the gun and the spent case.
// Light units: a white Lambert face shows its irradiance, so specular takes pi.
export const PBR = /* glsl */`
uniform vec3 uGroundC;
// The sky as image-based light: zenith, horizon and the lit plain under them.
vec3 iblGround() { return uGroundC * (uSunC * 0.3 + mix(uHorC, uZenC, 0.5) * 0.15); }
vec3 iblSky() { return mix(uHorC, uZenC, 0.75) * 0.6; }
// Diffuse irradiance from the hemisphere round N.
vec3 iblIrr(vec3 N) { return mix(iblGround(), iblSky(), N.y * 0.5 + 0.5); }
// Radiance along R; roughness blurs it toward the irradiance.
vec3 iblRad(vec3 R, float rough) {
  vec3 sky = mix(uHorC, uZenC, smoothstep(0.0, 0.6, R.y)) * 0.85;
  vec3 sharp = mix(iblGround(), sky, smoothstep(-0.06, 0.04, R.y));
  return mix(sharp, iblIrr(R), rough * rough);
}
// Split-sum scale and bias for the specular, after Karis.
vec2 envBRDF(float NoV, float rough) {
  vec4 r = rough * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
  return vec2(-1.04, 1.04) * a + r.zw;
}
// One GGX lobe: D, Smith visibility, Schlick Fresnel; Lambert keeps the rest.
// E is the light's irradiance; the result is the light it sends to the eye.
vec3 pbrLight(vec3 alb, float metal, float rough, vec3 F0, vec3 N, vec3 V, vec3 L, vec3 E) {
  float NoL = max(dot(N, L), 0.0);
  if (NoL <= 0.0) return vec3(0.0);
  vec3 H = normalize(L + V);
  float NoV = max(dot(N, V), 1e-3), NoH = max(dot(N, H), 0.0), VoH = max(dot(V, H), 0.0);
  float a2 = max(pow(rough, 4.0), 2e-4), d = NoH * NoH * (a2 - 1.0) + 1.0;
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float vis = 1.0 / ((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k) * 4.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
  // The cap stops fireflies on sharp metal edges.
  vec3 spec = min(a2 / (d * d) * vis, 60.0) * F;
  return (alb * (1.0 - metal) * (1.0 - F) + spec) * NoL * E;
}
// The sky's share: diffuse irradiance and the split-sum reflection.
// ao darkens both; the reflection keeps more of its light at grazing angles.
vec3 pbrSky(vec3 alb, float metal, float rough, vec3 F0, vec3 N, vec3 V, float ao) {
  float NoV = max(dot(N, V), 1e-3);
  vec2 ab = envBRDF(NoV, rough);
  vec3 Fss = F0 * ab.x + ab.y;
  float so = clamp(pow(NoV + ao, exp2(-16.0 * rough - 1.0)) - 1.0 + ao, 0.0, 1.0);
  return alb * (1.0 - metal) * (1.0 - Fss) * iblIrr(N) * ao + iblRad(reflect(-V, N), rough) * Fss * so;
}`;
export const gunMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uShellC: { value: new THREE.Vector3(...SHELL_C) }, uDarkC: { value: new THREE.Vector3(...DARK_C) }, uHullC: { value: new THREE.Vector3(...HULL_C) }, uBandC: { value: new THREE.Vector3(...BAND_C) }, uGroundC: { value: new THREE.Vector3(...GROUND_C) }, uMetalF0: { value: 0.12 }, uMetalR: { value: 0.45 }, uWear: { value: 1 } },
  vertexShader: /* glsl */`
  attribute vec4 aPart;
  ${AIM}
  uniform vec3 uAxisUp; uniform float uOver, uTime;
  varying vec3 vP, vO, vN; varying vec4 vPart;
  void main() {
    // vO holds still, so the seams ride with the barrel.
    vO = position;
    vP = aim(vO, aPart.y, 1.0 - step(1.5, aPart.z));
    vN = aimN(normal, aPart.y, 1.0 - step(1.5, aPart.z));
    // Loose dark plates on the barrel rattle through the over-hold.
    float loose = step(1.5, aPart.w) * step(aPart.w, 2.5) * step(0.25, aPart.y);
    vP += uAxisUp * loose * uOver * 1.6 * sin(uTime * 53.0 + fract(aPart.z) * 91.0);
    vPart = vec4(aPart.x, step(0.25, aPart.y), fract(aPart.z), aPart.w);
    gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vP, vO, vN; varying vec4 vPart;
  uniform vec3 uShellC, uDarkC, uHullC, uBandC;
  uniform float uHeat, uHeatT, uMetalF0, uMetalR, uWear;
  ${HEAD}
  ${SEAM}
  ${PBR}
  void main() {
    // The piece's own normal: crisp on boxes, smooth round drums and bevels.
    // The flat face is the fallback where an interpolated normal turns away.
    vec3 Nf = normalize(cross(dFdx(vP), dFdy(vP)));
    vec3 N = normalize(vN);
    if (dot(N, Nf) < 0.2) N = Nf;
    float sand = step(3.5, vPart.w), yel = step(2.5, vPart.w) - sand, dark = step(1.5, vPart.w) - step(2.5, vPart.w), shell = 1.0 - dark, wall = step(abs(N.y), 0.5);
    vec3 alb = mix(mix(mix(uShellC, uHullC, vPart.y), uBandC, yel), uDarkC, dark) * (0.92 + 0.16 * vPart.z);
    // Age: broad stains, then rain streaks down the walls.
    alb *= 0.8 + 0.34 * k3fbm(vO * 0.011);
    float streak = k3noise(vec3(vO.x * 0.11, vO.y * 0.007, vO.z * 0.11));
    alb *= 1.0 - 0.3 * shell * wall * smoothstep(0.45, 0.85, streak);
    // Fine seams give the scale: the barrel's plates, the mount's pours.
    float plates = seam(vPart.x * uL, 28.0, 0.5);
    float pours = seam(vO.y, 9.0, 0.3) * wall;
    alb *= 1.0 - shell * mix(0.16 * pours, 0.12 * plates * (1.0 - yel), vPart.y);
    // Rows of small dark ports cross the walls.
    float along = abs(N.x) > 0.5 ? vO.z : vO.x;
    float port = seam(vO.y - 30.0, 62.0, 1.3) * seam(along, 13.0, 2.6) * wall * step(100.0, vO.y);
    alb *= 1.0 - 0.75 * shell * (1.0 - vPart.y) * port;
    alb *= mix(1.0, 0.5, vPart.y * smoothstep(0.94, 1.0, vPart.x));
    // Dust buries the feet and lies on every ledge.
    float dust = 0.7 * smoothstep(70.0, 0.0, vO.y) + 0.3 * smoothstep(0.6, 1.0, N.y);
    // The base: the deck, the race and the apron, below the pylon.
    float base = (1.0 - vPart.y) * (1.0 - sand) * smoothstep(42.0, 30.0, vO.y) * uWear;
    // Broad tone patches from sun and rain.
    alb *= mix(1.0, 0.7 + 0.55 * k3fbm(vO * 0.008 + 3.0), base);
    // Rain stains run down the battered walls from each top edge.
    float stain = smoothstep(0.4, 0.85, k3noise(vec3(vO.x * 0.06, vO.y * 0.02, vO.z * 0.06))) * smoothstep(0.85, 0.3, abs(N.y));
    alb *= 1.0 - 0.55 * base * stain;
    // Hairline cracks wander over the concrete.
    float cr = abs(k3noise(vO * 0.018 + 11.0) - 0.5) + 0.35 * abs(k3noise(vO * 0.06) - 0.5);
    float crack = 1.0 - smoothstep(0.0, 0.02 + fwidth(cr), cr);
    // Old grease darkens a band round the race ring.
    float race = smoothstep(26.0, 4.0, abs(length(vO.xz) - 402.0)) * smoothstep(0.5, 0.9, N.y) * (0.5 + 0.6 * k3fbm(vO * 0.03));
    alb *= 1.0 - base * (0.55 * crack + 0.5 * race);
    // Sand banks up at the foot and lies in patches on the tops.
    float drift = smoothstep(5.0 + 12.0 * k3noise(vO * 0.025), 0.0, vO.y);
    float lie = smoothstep(0.6, 1.0, N.y) * smoothstep(0.42, 0.75, k3fbm(vO * 0.012 + 5.0)) * (1.0 - race);
    dust = mix(dust, max(drift, 0.8 * lie), min(base, 1.0));
    alb = mix(alb, uGroundC, min(dust, 0.85));
    // The berm is the plain's sand, with its broad tone patches.
    alb = mix(alb, uGroundC * (0.94 + 0.12 * k3fbm(vO * 0.0002)) * (1.0 - 0.28 * nightK()), sand);
    // Faces low down and faces that look down see less sky.
    float occ = mix(0.55, 1.0, smoothstep(0.0, 120.0, vO.y)) * mix(0.5, 1.0, smoothstep(-0.6, 0.2, N.y));
    // Cavities: faces under a ledge or deep in the lattice see less sky.
    float cav = 1.0 - 0.35 * pours * (1.0 - vPart.y) - 0.25 * port - 0.2 * smoothstep(0.2, -0.6, N.y) * smoothstep(160.0, 40.0, vO.y);
    float ao = occ * cav;
    float nl = max(dot(N, uSun), 0.0);
    float vis = nl > 0.0 ? sunVis(vP) * smokeShade(vP) : 1.0;
    vec3 V0 = normalize(cameraPosition - vP);
    // Materials: graphite is blackened steel; concrete and paint are dielectrics.
    // Dust on a part turns it to a rough, dry dielectric.
    float dk = min(dust, 0.85);
    float metal = dark * (1.0 - dk);
    float wear = k3fbm(vO * 0.04 + 7.0) - 0.5;
    float rough = mix(mix(0.9, 0.58, vPart.y), 0.5, yel);
    rough = mix(rough, uMetalR, dark) + 0.2 * wear;
    rough = clamp(mix(rough, 0.95, dk), 0.12, 1.0);
    // Steel's own tint: a cool grey, worn brighter on the edges of the patches.
    vec3 F0 = mix(vec3(0.04), vec3(0.92, 0.95, 1.0) * uMetalF0 * (0.8 + 0.6 * smoothstep(-0.2, 0.3, wear)), metal);
    vec3 col = pbrLight(alb, metal, rough, F0, N, V0, uSun, uSunC * 2.8 * vis);
    col += pbrSky(alb, metal, rough, F0, N, V0, ao);
    // A soft bounce from the plain behind the eye lifts the shade side.
    float day = 1.0 - 0.75 * nightK();
    vec3 fill = mix(uHorC, uZenC, 0.5) * 0.18 * max(dot(N, normalize(V0 + vec3(0.0, 0.3, 0.0))), 0.0) * day;
    // Point lights: the rock, the arcs, the blast; metal takes them as sheen.
    vec3 near_ = keyLight(N) + rim(N, vP) * vis + arcLight(vP, N) + fill + blastLight(vP) * (0.2 + 0.8 * max(dot(N, normalize(uBlast.xyz - vP)), 0.0));
    col += near_ * (alb * (1.0 - metal) + F0 * metal * 0.5);
    // At night the moon draws a thin rim round the gun.
    // At night uSun and uSunC carry the moon.
    float NoV = max(dot(N, V0), 1e-3);
    col += uSunC * nightK() * pow(1.0 - NoV, 3.0) * (0.3 + 0.7 * nl) * ao * 2.6 * (1.0 - 0.4 * rough);
    // Heat glows on the barrel, hottest at the muzzle.
    // The dark rails and the brake run hotter than the hull.
    // The fast white heat, then a dull red that lingers.
    float hz = clamp((uHeat + 0.16 * uHeatT) * vPart.y * smoothstep(0.3, 1.0, vPart.x) * mix(0.6, 1.0, dark), 0.0, 1.2);
    vec3 hot = mix(vec3(0.5, 0.03, 0.0), vec3(1.7, 0.45, 0.06), smoothstep(0.2, 0.6, hz));
    hot = mix(hot, vec3(3.0, 2.3, 1.3), smoothstep(0.6, 1.0, hz));
    col += hot * hz * (0.6 + 2.4 * hz) * 4.0;
    gl_FragColor = vec4(k2haze(col, vP), 1.0);
  }`,
});
export const gun = new THREE.Mesh(buildGun(), gunMat);
gun.geometry.computeBoundingBox();
gun.frustumCulled = false;
scene.add(gun);
