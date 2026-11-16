// East Van postcards, realistic: the house lot on East 4th in the rain.
// Same lens, hour and weather as block-out card 1.
import { THREE, V, col, rng, hash, lerp, R0, mCyl, mPlane } from './rkit.js';

export const card = {
  cap: 'East 4th · 4:52 pm · Rain', blockout: 1,
  cam: { pos: [0.4, 1.2, 12.6], yaw: 0, pitch: 0, up: 31, down: 19, minHalf: 0.34 },
  rainLamp: [5.6, 8.3, 4.75],
};

export function build(k) {
  const { M, box, put, limb, lapWall, sash, room, roofOn, gableFront, porch, door, fence, kerb, cart, pole, wire, tree } = k;

  /* ----- the house ----- */
  const ZF = -6.5, BASE = 1.3, EAVE = 4.3;
  const bay = [0.85, 3.15, 1.85, 3.8], doorH = [-0.98, -0.02, BASE, BASE + 2.1], winL = [-2.95, -1.95, 2.05, 3.55];
  lapWall(M.siding, -3.6, 3.6, BASE, EAVE, ZF, [bay, doorH, winL]);
  for (const s of [-1, 1]) box(M.trim, 0.12, EAVE - BASE, 0.12, s * 3.57, (BASE + EAVE) / 2, ZF + 0.02);
  box(M.trim, 7.3, 0.16, 0.05, 0, BASE + 0.02, ZF + 0.04);
  box(M.found, 7.2, BASE, 0.2, 0, BASE / 2, ZF - 0.08);
  // Side and back walls, floor and ceiling close the shell.
  for (const s of [-1, 1]) box(M.siding, 0.15, EAVE, 9, s * 3.53, EAVE / 2, ZF - 4.5);
  box(M.dark, 7.2, EAVE, 0.15, 0, EAVE / 2, ZF - 9); box(M.dark, 7.2, 0.12, 9, 0, BASE - 0.06, ZF - 4.5); box(M.dark, 7.2, 0.12, 9, 0, EAVE - 0.06, ZF - 4.5);
  box(M.dark, 0.1, 3, 4, -1.1, 2.8, ZF - 2); box(M.dark, 2.5, 3, 0.1, -2.35, 2.8, ZF - 0.5);
  gableFront(M.gable, 0, EAVE, 7.2, 3.3, ZF, [-0.5, 0.5, 0.55, 1.65]);
  roofOn(0, ZF, 7.2, 9, EAVE, 3.3);
  sash(0, EAVE + 1.1, ZF, 1.0, 1.1);
  sash(-2.45, 2.8, ZF, 1.0, 1.5, M.blind);
  door(-0.5, BASE, ZF, M.door);
  // The hall behind the door, the living room behind the bay, the attic.
  room(-1.05, 0.55, BASE, EAVE, ZF - 0.1, ZF - 3.2);
  room(0.6, 3.5, BASE, EAVE, ZF - 0.1, ZF - 4);
  room(-1.2, 1.2, EAVE, EAVE + 2.0, ZF - 0.1, ZF - 3);
  box(M.tv, 0.9, 0.5, 0.03, 0.75, EAVE + 0.9, ZF - 1.6, 0, -1.1);
  // The bay: three sides of glass on a panelled base.
  box(M.trim, 2.3, 0.55, 0.5, 2.0, 2.12, ZF + 0.25); box(M.trim, 2.42, 0.06, 0.58, 2.0, 2.42, ZF + 0.27, 0.06);
  box(M.trim, 2.3, 0.26, 0.5, 2.0, 3.68, ZF + 0.25); box(M.roof, 2.5, 0.08, 0.72, 2.0, 3.86, ZF + 0.3, 0.14);
  for (const bx of [0.88, 1.63, 2.37, 3.12]) box(M.trim, 0.07, 1.14, 0.07, bx, 2.99, ZF + 0.47);
  for (const bx of [1.255, 2.0, 2.745]) { put(M.glass, new THREE.PlaneGeometry(0.68, 1.1), bx, 2.99, ZF + 0.47); box(M.trim, 0.68, 0.04, 0.04, bx, 2.99, ZF + 0.47); }
  for (const s of [-1, 1]) put(M.glass, new THREE.PlaneGeometry(0.42, 1.1), 2.0 + s * 1.13, 2.99, ZF + 0.25, 0, s * Math.PI / 2);
  // Inside: curtains at the sides, a floor lamp, a sofa, a cat on the sill.
  for (const s of [-1, 1]) put(M.curtainW, mPlane(0.5, 1.5), 2.0 + s * 0.98, 3.05, ZF + 0.36);
  box(M.couch, 1.8, 0.45, 0.8, 2.3, BASE + 0.3, ZF - 2.6); box(M.couch, 1.8, 0.5, 0.2, 2.3, BASE + 0.7, ZF - 2.95);
  put(M.bulb, mCyl(0.16, 0.22, 0.28, 12), 1.0, BASE + 1.55, ZF - 2.4); put(M.iron, mCyl(0.015, 0.015, 1.4, 6), 1.0, BASE + 0.7, ZF - 2.4);
  box(M.room, 0.7, 0.5, 0.03, 2.4, 3.3, ZF - 3.9); box(M.dark, 0.6, 0.4, 0.035, 2.4, 3.3, ZF - 3.9);
  put(M.cat, new THREE.IcosahedronGeometry(1, 2).scale(0.11, 0.13, 0.09), 2.35, 2.58, ZF + 0.3); put(M.cat, new THREE.IcosahedronGeometry(1, 2).scale(0.065, 0.06, 0.06), 2.35, 2.75, ZF + 0.31);
  for (const s of [-1, 1]) put(M.cat, new THREE.ConeGeometry(0.022, 0.05, 4), 2.35 + s * 0.035, 2.82, ZF + 0.31);
  limb(M.cat, V(2.44, 2.47, ZF + 0.3), V(2.6, 2.5, ZF + 0.33), 0.016, 0.012);
  const PF = porch({ x: 0, w: 7.2, zf: ZF, base: BASE, sx: -0.5, post: [-3.5, -1.3, 0.3, 3.5] });
  // The porch lantern, the plate, the couch.
  box(M.iron, 0.1, 0.03, 0.1, 0.28, 3.22, ZF + 0.08); box(M.iron, 0.1, 0.02, 0.1, 0.28, 3.0, ZF + 0.08); put(M.bulb, new THREE.SphereGeometry(0.045, 10, 8), 0.28, 3.11, ZF + 0.09);
  put(M.plate, new THREE.PlaneGeometry(0.3, 0.13), 0.28, 2.7, ZF + 0.03);
  box(M.couch, 1.6, 0.3, 0.62, -2.45, BASE + 0.25, ZF + 0.5); box(M.couch, 1.6, 0.5, 0.18, -2.45, BASE + 0.55, ZF + 0.22);
  for (const s of [-1, 1]) box(M.couch, 0.18, 0.42, 0.62, -2.45 + s * 0.78, BASE + 0.36, ZF + 0.5);
  box(M.brick, 0.62, 2.5, 0.62, 1.9, 6.85, -12.5); box(M.found, 0.74, 0.1, 0.74, 1.9, 8.12, -12.5);

  /* ----- the neighbours ----- */
  // Left: brick below, stucco above, an iron balcony, a low roof.
  box(M.brick, 8, 2.7, 1.2, -10.2, 1.35, -6.6); box(M.brick, 8, 2.7, 10, -10.2, 1.35, -12.2); box(M.found, 8.1, 0.12, 1.3, -10.2, 2.74, -6.6);
  box(M.stucco, 8, 2.6, 10.8, -10.2, 4.0, -12.6);
  put(M.stucco, new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-4, 0), new THREE.Vector2(4, 0), new THREE.Vector2(0, 1.15)])), -10.2, 5.3, -7.19);
  roofOn(-10.2, -7.2, 8, 11, 5.3, 1.15, 0.7);
  box(M.iron, 8, 0.045, 0.045, -10.2, 3.72, -6.05); box(M.iron, 8, 0.03, 0.03, -10.2, 2.9, -6.05);
  for (let x = -14.15; x <= -6.2; x += 0.115) box(M.iron, 0.016, 0.82, 0.016, x, 3.31, -6.05);
  box(M.trim, 3.3, 0.09, 0.12, -10.2, 4.98, -7.16); for (const s of [-1, 0, 1]) box(M.trim, 0.07, 1.9, 0.1, -10.2 + s * 1.6, 4.0, -7.16);
  for (const s of [-1, 1]) put(M.glass, new THREE.PlaneGeometry(1.5, 1.86), -10.2 + s * 0.8, 4.0, -7.15);
  put(M.curtainC, mPlane(3.1, 1.86), -10.2, 4.0, -7.185);
  sash(-12.4, 1.5, -5.84, 1.3, 1.0, M.blind); door(-8.3, 0, -5.99, M.dark);
  // Right: a taller gabled house in purple.
  const ZP = -6, bP = 1.0, eP = 4.1;
  lapWall(M.sidingP, 7, 13.6, bP, eP, ZP, [[7.8, 8.8, 1.85, 3.35], [9.82, 10.78, bP, bP + 2.1], [11.8, 12.8, 1.85, 3.35]]);
  for (const s of [-1, 1]) box(M.trim, 0.12, eP - bP, 0.12, 10.3 + s * 3.27, (bP + eP) / 2, ZP + 0.02);
  box(M.found, 6.6, bP, 0.2, 10.3, bP / 2, ZP - 0.08); box(M.sidingP, 0.15, eP, 9, 7.07, eP / 2, ZP - 4.5); box(M.dark, 6.5, eP, 0.1, 10.3, eP / 2, ZP - 0.4);
  gableFront(M.sidingP, 10.3, eP, 6.6, 3.6, ZP, [-0.5, 0.5, 0.6, 1.7]);
  roofOn(10.3, ZP, 6.6, 9, eP, 3.6);
  sash(8.3, 2.6, ZP, 1.0, 1.5, M.curtainC); sash(12.3, 2.6, ZP, 1.0, 1.5, M.blind); sash(10.3, eP + 1.15, ZP, 1.0, 1.1, M.blind);
  door(10.3, bP, ZP, M.trim);
  porch({ x: 10.3, w: 6.6, zf: ZP, base: bP, sx: 10.3, post: [7.15, 9.45, 11.15, 13.45], depth: 1.6 });
  // Beyond the frame edges: plain dark houses, tall firs.
  for (const x of [-20.5, 20.7]) { box(M.dark, 7, 4.2, 9, x, 2.1, -11); roofOn(x, -6.5, 7, 9, 4.2, 3); put(M.dark, new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-3.5, 0), new THREE.Vector2(3.5, 0), new THREE.Vector2(0, 3)])), x, 4.2, -6.5); }
  {
    const R = rng(41);
    for (let i = 0; i < 9; i++) {
      const x = -34 + i * 8.5 + R() * 4, z = -19 - R() * 8, h = 11 + R() * 8, r = 2.2 + R();
      // One cone with a ragged outline reads as a fir at night.
      const g = new THREE.ConeGeometry(r, h, 22, 30, true), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const j = 0.62 + 0.6 * hash(Math.floor(p.getY(k) * 3.1) * 7 + Math.floor(Math.atan2(p.getZ(k), p.getX(k)) * 3.5) * 13 + i); p.setX(k, p.getX(k) * j); p.setZ(k, p.getZ(k) * j); }
      put(M.fir, g, x, 2 + h / 2, z);
      put(M.twig, mCyl(0.2, 0.3, 3, 6), x, 1.5, z);
    }
  }

  /* ----- ground: lawn, sidewalk slabs, kerb, path, fence, bed, bins ----- */
  box(M.lawn, 90, 0.2, 66, 0, -0.1, -30); box(M.lawn, 90, 0.2, 10, 0, -0.1, 19);
  for (let x = -27; x < 27; x += 1.5) { const lift = R0() < 0.15 ? R0() * 0.03 : 0; box(M.walk, 1.488, 0.1, 1.5, x + 0.75, -0.03 + lift, 0.45, 0, 0, (R0() - 0.5) * 0.012); }
  kerb(90, -45, 3.14, Math.PI / 2); kerb(90, 45, 13.86, -Math.PI / 2);
  box(M.walk, 1.4, 0.06, 2.95, -0.5, 0.0, -1.75);
  fence(-5, -0.55, -1.3, -0.55); fence(0.3, -0.55, 5, -0.55); fence(-5, -0.55, -5, -6.5); fence(5, -0.55, 5, -6.5);
  for (const s of [-1, 1]) for (const h of [0.03, 0.34]) box(M.wood, 2.6, 0.17, 0.04, 2.9, 0.1 + h, -2.3 + s * 0.6);
  for (const s of [-1, 1]) box(M.wood, 0.04, 0.36, 1.2, 2.9 + s * 1.3, 0.18, -2.3);
  box(M.soil, 2.52, 0.05, 1.12, 2.9, 0.33, -2.3);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) put(M.kale, new THREE.ConeGeometry(0.035, 0.34, 4), 1.95 + (i % 4) * 0.62 + Math.cos(j * 1.26) * 0.09, 0.5, -2.55 + Math.floor(i / 4) * 0.5 + Math.sin(j * 1.26) * 0.09, Math.PI + Math.sin(j * 1.26) * 0.5, 0, Math.cos(j * 1.26) * 0.5);
  put(M.bush, new THREE.IcosahedronGeometry(1, 2).scale(1.1, 0.8, 1.0), -3.8, 0.7, -5.4); put(M.bush, new THREE.IcosahedronGeometry(1, 2).scale(0.7, 0.55, 0.7), -2.6, 0.45, -5.0);
  cart(M.plastK, 6.5, 2.5); cart(M.plastG, 7.25, 2.5, 0.1);
  box(M.plastB, 0.52, 0.3, 0.4, 7.95, 0.15, 2.55); put(M.bagY, new THREE.IcosahedronGeometry(1, 2).scale(0.22, 0.2, 0.2), 8.5, 0.19, 2.6);
  k.mirrorRoad(90, 10.72, 0, -0.145, 8.5);

  /* ----- pole, lamp, wires ----- */
  const PX = 5.6, PZ = 2.2, PW = -40.4, PE = 51.6, LAMP = V(PX, 8.3, 4.75);
  for (const x of [PW, PX, PE]) pole(x, PZ);
  put(M.galv, mCyl(0.3, 0.3, 0.85, 16), PX - 0.44, 7.9, PZ); put(M.galv, mCyl(0.31, 0.31, 0.04, 16), PX - 0.44, 8.34, PZ);
  for (const a of [0.6, -0.6]) put(M.trim, mCyl(0.03, 0.045, 0.2, 8), PX - 0.44 + Math.sin(a) * 0.16, 8.46, PZ + Math.cos(a) * 0.16);
  limb(M.galv, V(PX, 8.05, PZ + 0.1), V(PX, 8.42, LAMP.z - 0.3), 0.035, 0.03, 8);
  box(M.galv, 0.26, 0.1, 0.62, PX, 8.42, LAMP.z); box(M.lampLens, 0.19, 0.03, 0.4, PX, 8.36, LAMP.z + 0.03);
  box(M.iron, 0.3, 0.42, 0.2, PX - 1.1, 5.95, PZ + 0.22);
  let perch;
  for (const [dz, y, sag, r] of [[-1, 10.15, 0.55, 0.012], [0, 10.74, 0.55, 0.012], [1, 10.15, 0.55, 0.012], [0.18, 8.9, 0.65, 0.012], [0.2, 7.7, 0.75, 0.017], [0.22, 6.5, 0.95, 0.02], [0.22, 6.05, 1.0, 0.016]]) {
    const w = wire(V(PW, y, PZ + dz), V(PX, y, PZ + dz), sag, r);
    wire(V(PX, y, PZ + dz), V(PE, y, PZ + dz), sag, r);
    if (y === 6.5) perch = w;
  }
  wire(V(PX, 7.7, PZ), V(3.3, 4.75, ZF + 0.3), 0.4, 0.014, 0.03); wire(V(PX, 7.7, PZ), V(9.0, 5.0, -5.8), 0.35, 0.014, 0.03); wire(V(PW, 7.7, PZ), V(-13.5, 5.6, -7), 0.5, 0.014, 0.03);

  /* ----- the tree, its last leaves, the litter ----- */
  const TX = -4.4, TZ = 2.1;
  tree(TX, TZ, 7);
  k.litter(400, R => { const a = R() * 6.2832, r = Math.sqrt(-2 * Math.log(1 - R() * 0.98)) * 2.3, z = TZ + Math.sin(a) * r; return [TX + Math.cos(a) * r * 1.5, z > 3.2 && z < 13.8 ? -0.138 : z > -0.3 && z < 1.2 ? 0.03 : 0.012, z]; });
  k.litter(160, R => [-16 + R() * 28, -0.138, 3.3 + R() * R() * 1.2], 4);
  k.litter(140, R => { const z = -5 + R() * 7.5; return [-14 + R() * 28, z > -0.3 && z < 1.2 ? 0.03 : 0.012, z]; }, 5);
  k.fall(8, R => [TX + (R() - 0.5) * 5.5, 4 + R() * 4, TZ + (R() - 0.5) * 5]);

  /* ----- lights ----- */
  // The street lamp throws real shadows across the wet road.
  const lampCol = col(0.84, 0.13, 68);
  const lamp = new THREE.SpotLight(lampCol, 520, 40, 1.2, 0.6, 1.8);
  lamp.position.copy(LAMP); lamp.target.position.set(PX, 0, LAMP.z + 0.6);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0015;
  // The porch lantern is a point: every rail throws its own shadow.
  const lantern = new THREE.PointLight(col(0.86, 0.13, 72), 14, 16, 1.8);
  lantern.position.set(0.28, 3.1, ZF + 0.22);
  lantern.castShadow = true; lantern.shadow.mapSize.set(1024, 1024); lantern.shadow.bias = -0.003;
  const living = new THREE.PointLight(col(0.86, 0.13, 70), 9, 7, 1.7);
  living.position.set(1.3, BASE + 1.7, ZF - 2.2);
  const tvBase = col(0.7, 0.14, 250, 3), tvL = new THREE.PointLight(col(0.7, 0.14, 250), 7, 3.2, 1.6);
  tvL.position.set(0.5, EAVE + 1.0, ZF - 1.4);
  // The string of bulbs under the porch roof, on its wire.
  const BULBS = [col(0.65, 0.22, 28), col(0.8, 0.17, 85), col(0.7, 0.19, 145), col(0.62, 0.16, 250), col(0.65, 0.22, 340)];
  const string = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5) }), 26), o = new THREE.Object3D();
  const sy = u => 3.52 - Math.abs(Math.sin(u * Math.PI * 5)) * 0.1;
  for (let i = 0; i < 26; i++) {
    const u = i / 25;
    o.position.set(lerp(-3.55, 3.55, u), sy(u), PF); o.updateMatrix();
    string.setMatrixAt(i, o.matrix); string.setColorAt(i, BULBS[i % 5]);
    if (i) wire(V(lerp(-3.55, 3.55, (i - 1) / 25), sy((i - 1) / 25) + 0.03, PF), V(o.position.x, o.position.y + 0.03, PF), 0, 0.004, 0);
  }
  k.group.add(lamp, lamp.target, lantern, living, tvL, string);
  k.lampCone(LAMP, 5.2, 8.6, lampCol, 0.14);

  const crow = k.crow();
  k.onFrame(t => {
    // The TV flickers in the attic.
    const fl = 0.55 + 0.45 * hash(Math.floor(t * 3.3));
    tvL.intensity = 7 * fl; M.tv.color.copy(tvBase).multiplyScalar(fl);
    // The crow rides the wire, hunched.
    k.wireAt(perch, 0.859, t, crow.obj.position); crow.obj.position.y += 0.02;
    crow.pose(t, 'rain', 0.25);
  });
}
