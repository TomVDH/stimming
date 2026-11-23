// Steelworks hall: the furnace, the cast floor, the channels and the roof.
// Static parts merge into one mesh; the drill and the clay gun move.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FURNACE, TAP, TAP_DIR, TAP_Y, EDGE_X, LOW_Y, ROOF_Y, HALL, COL_X, CHANNELS, CARVE, SKIM, LADLE, SLAG_PIT, FRONT_Z, WIN, polyLength, polyAt, polyNear } from './layout.js';
import { HALL_VS, HALL_FS, NL } from './shaders.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// Palette: low albedo; the light does the work.
const C = {
  sand: [0.13, 0.11, 0.095], bed: [0.05, 0.045, 0.04], kerb: [0.18, 0.14, 0.11], shell: [0.1, 0.1, 0.105],
  steel: [0.1, 0.1, 0.11], rust: [0.22, 0.13, 0.08], wall: [0.12, 0.12, 0.13], roof: [0.07, 0.07, 0.075], clay: [0.3, 0.2, 0.14],
};

export function hallMaterial() {
  const lp = [], lc = [];
  for (let i = 0; i < NL; i++) { lp.push(new THREE.Vector4(0, -50, 0, 1)); lc.push(new THREE.Vector3()); }
  const uniforms = {
    uLP: { value: lp }, uLC: { value: lc },
    uShaftC: { value: new THREE.Vector3(0.3, 0.42, 0.62) },
    uAmb: { value: new THREE.Vector3(0.01, 0.013, 0.02) },
    uGlowC: { value: new THREE.Vector3(1.0, 0.4, 0.08) }, uGlowK: { value: 1 }, uHot: { value: 0 },
  };
  return new THREE.ShaderMaterial({ vertexShader: HALL_VS, fragmentShader: HALL_FS, uniforms });
}

// The floor round the channels: a height field carved by each channel.
function floorAt(x, z) {
  let carve = 0, rim = 0, wet = 0;
  for (const ch of CHANNELS) {
    const [d, sAt] = polyNear(ch.pts, x, z);
    const half = ch.w / 2, L = polyLength(ch.pts);
    const bed = ch.y0 + (ch.y1 - ch.y0) * Math.min(1, sAt / L);
    if (d < half + 0.14) {
      const k = Math.max(0, Math.min(1, (d - half) / 0.14));
      carve = Math.min(carve, bed + (0 - bed) * k * k * (3 - 2 * k));
      wet = Math.max(wet, 1 - k);
    }
    // A low ridge of sand along each side, where the runner was cut.
    rim = Math.max(rim, 0.07 * Math.exp(-(((d - half - 0.32) / 0.16) ** 2)));
  }
  return [carve < -1e-4 ? carve : rim, wet];
}
function carvedFloor() {
  const { x0, x1, z0, z1, cell } = CARVE;
  const nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const P = g.attributes.position, n = P.count, col = new Float32Array(n * 3), glow = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), z = P.getZ(i);
    // The patch's own edges stay level, so they meet the blocks round it.
    const edge = x <= x0 + 1e-3 || x >= x1 - 1e-3 || z <= z0 + 1e-3 || z >= z1 - 1e-3;
    const [y, wet] = edge ? [Math.min(0, floorAt(x, z)[0]), 0] : floorAt(x, z);
    P.setY(i, y);
    const c = C.sand.map((v, j) => v + (C.bed[j] - v) * wet);
    col.set(c, i * 3);
  }
  g.computeVertexNormals();
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('glow', new THREE.BufferAttribute(glow, 1));
  g.deleteAttribute('uv');
  return g;
}

export function buildHall(mat) {
  const parts = [];
  // Adds a geometry with a flat colour and a glow weight.
  function add(g, col, glow = 0) {
    g = g.index ? g : g;
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3), k = new Float32Array(n).fill(glow);
    for (let i = 0; i < n; i++) c.set(col, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('glow', new THREE.BufferAttribute(k, 1));
    g.deleteAttribute('uv');
    parts.push(g);
    return g;
  }
  const box = (x0, y0, z0, x1, y1, z1, col, glow) => add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), col, glow);
  // A box from a to b, w wide and h tall, its top at the segment.
  function beam(a, b, w, h, col, glow, up = UP) {
    const d = b.clone().sub(a), len = d.length();
    const z = d.normalize(), x = new THREE.Vector3().crossVectors(up, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
    const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(a.clone().add(b).multiplyScalar(0.5));
    return add(new THREE.BoxGeometry(w, h, len).applyMatrix4(m), col, glow);
  }
  // A round bar from a to b.
  function bar(a, b, r, col, glow, seg = 10) {
    const d = b.clone().sub(a), len = d.length();
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return add(g, col, glow);
  }
  const cyl = (x, z, y0, y1, r0, r1, col, seg = 48, glow = 0) => add(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, true).translate(x, (y0 + y1) / 2, z), col, glow);

  /* the floors */
  // The cast floor: a solid block, open on top where the channels are carved.
  box(HALL.x0, LOW_Y, HALL.z0, EDGE_X, -0.75, FRONT_Z, C.sand);
  box(HALL.x0, -0.75, HALL.z0, CARVE.x0, 0, FRONT_Z, C.sand);
  box(CARVE.x0, -0.75, HALL.z0, EDGE_X, 0, CARVE.z0, C.sand);
  parts.push(carvedFloor());
  box(EDGE_X - 0.05, -0.75, CARVE.z0, EDGE_X, -0.03, FRONT_Z, C.sand);
  box(CARVE.x0, -0.75, FRONT_Z - 0.05, EDGE_X, -0.03, FRONT_Z, C.sand);
  box(EDGE_X, LOW_Y - 0.5, HALL.z0, HALL.x1, LOW_Y, FRONT_Z, C.sand.map(v => v * 0.7));
  box(HALL.x0, LOW_Y - 0.5, FRONT_Z, HALL.x1, LOW_Y, HALL.z1, C.sand.map(v => v * 0.7));
  // The slag pot: a squat bowl under the slag runner's lip.
  cyl(SLAG_PIT.x, SLAG_PIT.z, LOW_Y + 0.3, LOW_Y + 2.8, 1.2, 1.9, C.steel, 28);
  cyl(SLAG_PIT.x, SLAG_PIT.z, LOW_Y + 2.6, LOW_Y + 2.9, 2.0, 2.0, C.rust, 28);
  for (const rx of [-1.1, 1.1]) box(LADLE.x + rx - 0.08, LOW_Y, HALL.z0, LADLE.x + rx + 0.08, LOW_Y + 0.18, HALL.z1, C.steel);

  /* the furnace: hearth, bosh, mantle, stack, bustle pipe, tuyeres */
  const { x: fx, z: fz, r: fr } = FURNACE;
  cyl(fx, fz, -0.8, 7.2, fr, fr, C.shell);
  cyl(fx, fz, 7.2, 13, fr, fr + 1.4, C.shell);
  cyl(fx, fz, 13, 13.6, fr + 2.6, fr + 2.6, C.rust);
  add(new THREE.RingGeometry(fr + 1.4, fr + 2.6, 48).rotateX(-Math.PI / 2).translate(fx, 13, fz), C.rust);
  cyl(fx, fz, 13.6, ROOF_Y + 6, fr + 1.4, fr - 0.4, C.shell);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.atan2(TAP_DIR.y, TAP_DIR.x) + Math.PI / 8;
    beam(V(fx + Math.cos(a) * (fr + 2.4), 0, fz + Math.sin(a) * (fr + 2.4)), V(fx + Math.cos(a) * (fr + 2.4), 13, fz + Math.sin(a) * (fr + 2.4)), 0.7, 0.7, C.steel, 0, V(1, 0, 0));
  }
  add(new THREE.TorusGeometry(fr + 3.6, 0.85, 12, 64).rotateX(Math.PI / 2).translate(fx, 11, fz), C.rust);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const p0 = V(fx + ca * (fr + 3.6), 10.4, fz + sa * (fr + 3.6));
    const p1 = V(fx + ca * (fr + 1.5), 5.6, fz + sa * (fr + 1.5));
    const p2 = V(fx + ca * (fr + 0.1), 5.0, fz + sa * (fr + 0.1));
    bar(p0, p1, 0.24, C.steel);
    bar(p1, p2, 0.2, C.steel);
    // The peephole: a glowing eye at the blowpipe's elbow.
    add(new THREE.CircleGeometry(0.16, 10).lookAt(V(ca, 0.3, sa)).translate(p1.x + ca * 0.25, p1.y + 0.05, p1.z + sa * 0.25), C.steel, 1.0);
  }
  // Cooling staves: rings of plates on the hearth.
  for (let y = 1.6; y < 7; y += 1.3) cyl(fx, fz, y, y + 0.1, fr + 0.06, fr + 0.06, C.rust);

  /* the taphole: a clay mass on the hearth wall */
  const tp = V(TAP.x, TAP_Y, TAP.y), tn = V(TAP_DIR.x, 0, TAP_DIR.y);
  add(new THREE.SphereGeometry(0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.85, 0.65, 0.22).rotateX(Math.PI / 2)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), tn)).translate(tp.x - tn.x * 0.1, tp.y, tp.z - tn.z * 0.1), C.clay, 2);

  /* the hood over the taphole, and its duct */
  const hc = tp.clone().addScaledVector(tn, 2.4);
  const side = V(-tn.z, 0, tn.x);
  const hood = [hc.clone().addScaledVector(side, -2.6).addScaledVector(tn, -1.8), hc.clone().addScaledVector(side, 2.6).addScaledVector(tn, -1.8)];
  beam(hood[0].clone().setY(6.4), hood[1].clone().setY(6.4), 0.3, 0.3, C.steel);
  for (const s of [-2.6, 2.6]) beam(hc.clone().addScaledVector(side, s).addScaledVector(tn, -1.8).setY(6.2), hc.clone().addScaledVector(side, s).addScaledVector(tn, 2.4).setY(5.2), 0.12, 1.2, C.steel, 0, UP);
  beam(hc.clone().addScaledVector(tn, -1.8).setY(6.6), hc.clone().addScaledVector(tn, 2.6).setY(5.4), 5.4, 0.12, C.steel, 0, UP);
  bar(hc.clone().addScaledVector(tn, -0.4).setY(6.4), hc.clone().addScaledVector(tn, -0.4).setY(ROOF_Y + 2), 1.0, C.rust);

  /* the spouts: short lined lips past the floor's edge */
  for (const ch of CHANNELS.filter(c => c.id !== 'trough')) {
    const n = ch.pts.length, a = ch.pts[n - 2], b = ch.pts[n - 1];
    const d = b.clone().sub(a).normalize(), s0 = b.clone().addScaledVector(d, -1.1);
    beam(V(s0.x, ch.y1 - 0.02, s0.y), V(b.x, ch.y1 - 0.02, b.y), ch.w + 0.3, 0.3, C.steel).translate(0, -0.15, 0);
  }
  // The skimmer: a block across the trough; iron runs under it.
  {
    const a = SKIM.clone().addScaledVector(TAP_DIR, -0.5), nx = -TAP_DIR.y, nz = TAP_DIR.x;
    beam(V(a.x - nx * 0.85, 0.7, a.y - nz * 0.85), V(a.x + nx * 0.85, 0.7, a.y + nz * 0.85), 0.45, 0.95, C.kerb).translate(0, -0.47, 0);
  }

  /* the ladle under the spout */
  cyl(LADLE.x, LADLE.z, LOW_Y + 0.4, LOW_Y + 4.0, 1.8, 2.2, C.steel, 32);
  add(new THREE.CircleGeometry(1.8, 32).rotateX(-Math.PI / 2).translate(LADLE.x, LOW_Y + 0.4, LADLE.z), C.steel);
  cyl(LADLE.x, LADLE.z, LOW_Y + 3.8, LOW_Y + 4.1, 2.35, 2.35, C.rust, 32);
  box(LADLE.x - 2.4, LOW_Y, LADLE.z - 3, LADLE.x + 2.4, LOW_Y + 0.9, LADLE.z + 3, C.steel);

  /* the hall: columns, crane runways, trusses, roof, walls */
  for (let z = HALL.z0 + 3; z <= HALL.z1; z += 7) {
    const [xa, xb] = COL_X, xm = (xa + xb) / 2, half = (xb - xa) / 2;
    beam(V(xa, 0, z), V(xa, ROOF_Y, z), 0.7, 0.5, C.steel, 0, V(1, 0, 0));
    beam(V(xb, LOW_Y, z), V(xb, ROOF_Y, z), 0.7, 0.5, C.steel, 0, V(1, 0, 0));
    // A truss: two chords and diagonals.
    beam(V(xa, ROOF_Y, z), V(xb, ROOF_Y, z), 0.25, 0.4, C.steel);
    beam(V(xa, ROOF_Y + 1.2, z), V(xm, ROOF_Y + 3.4, z), 0.25, 0.4, C.steel);
    beam(V(xm, ROOF_Y + 3.4, z), V(xb, ROOF_Y + 1.2, z), 0.25, 0.4, C.steel);
    const top = x => ROOF_Y + 1.2 + 2.2 * (1 - Math.abs(x - xm) / half);
    for (let k = 0; k < 10; k++) {
      const x0 = xa + (k * (xb - xa)) / 10, x1 = xa + ((k + 1) * (xb - xa)) / 10;
      beam(k % 2 ? V(x0, top(x0), z) : V(x0, ROOF_Y, z), k % 2 ? V(x1, ROOF_Y, z) : V(x1, top(x1), z), 0.14, 0.14, C.steel);
    }
  }
  for (const x of [COL_X[0] + 0.6, COL_X[1] - 0.6]) beam(V(x, 19, HALL.z0), V(x, 19, HALL.z1), 0.8, 1.6, C.steel);
  box(HALL.x0, ROOF_Y + 3.6, HALL.z0, HALL.x1, ROOF_Y + 3.9, HALL.z1, C.roof);
  box(HALL.x0 - 0.4, LOW_Y, HALL.z0, HALL.x0, ROOF_Y + 4, HALL.z1, C.wall);
  box(HALL.x0, LOW_Y, HALL.z0 - 0.4, HALL.x1, ROOF_Y + 4, HALL.z0, C.wall);
  // The right wall, with a strip of windows: the panes glow faintly cool.
  box(HALL.x1, LOW_Y, HALL.z0, HALL.x1 + 0.4, WIN.y0, HALL.z1, C.wall);
  box(HALL.x1, WIN.y1, HALL.z0, HALL.x1 + 0.4, ROOF_Y + 4, HALL.z1, C.wall);
  for (let z = WIN.z0; z < WIN.z1; z += WIN.bay) {
    box(HALL.x1 + 0.1, WIN.y0, z, HALL.x1 + 0.4, WIN.y1, z + 0.3, C.wall);
    box(HALL.x1 + 0.1, WIN.y0, z + 0.3 + WIN.w, HALL.x1 + 0.4, WIN.y1, z + WIN.bay, C.wall);
    box(HALL.x1 + 0.3, WIN.y0, z + 0.3, HALL.x1 + 0.35, WIN.y1, z + 0.3 + WIN.w, [0.02, 0.025, 0.035], -1);
  }

  const geo = mergeGeometries(parts, false);
  parts.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(geo, mat);
  mesh.matrixAutoUpdate = false;
  return mesh;
}

// The drill and the clay gun: each swings on its own post.
export function buildGear(mat) {
  const tn = V(TAP_DIR.x, 0, TAP_DIR.y), side = V(-tn.z, 0, tn.x);
  const tp = V(TAP.x, TAP_Y, TAP.y);
  function rig(sideK, len, parts) {
    const g = new THREE.Group();
    const post = tp.clone().addScaledVector(tn, 4.2).addScaledVector(side, sideK);
    g.position.set(post.x, 0, post.z);
    const arm = new THREE.Group();
    g.add(arm);
    for (const [geo, col] of parts) {
      const n = geo.attributes.position.count, c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) c.set(col, i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
      geo.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n), 1));
      arm.add(new THREE.Mesh(geo, mat));
    }
    // The aim: from the post to the taphole.
    const to = tp.clone().sub(post);
    const yaw = Math.atan2(to.x, to.z);
    return { g, arm, post, yaw, reach: Math.hypot(to.x, to.z) - len };
  }
  const steel = [0.08, 0.08, 0.085], dark = [0.04, 0.04, 0.04], clay = [0.22, 0.15, 0.1];
  // The drill: a frame on a boom; the rod points along +z.
  const drill = rig(-2.3, 0, [
    // The drill hangs from a thin rod under the hood: no post on the floor.
    [new THREE.CylinderGeometry(0.07, 0.07, 5.2, 8).translate(0, TAP_Y + 0.6 + 2.6, 1.2), steel],
    [new THREE.BoxGeometry(0.3, 0.3, 4.2).translate(0, TAP_Y + 0.35, 1.9), steel],
    [new THREE.BoxGeometry(0.4, 0.4, 0.7).translate(0, TAP_Y + 0.25, 0.9), dark],
    [new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8).rotateX(Math.PI / 2).translate(0, TAP_Y, 3.0), dark],
  ]);
  const rod = drill.arm.children[3];
  // The clay gun: a squat barrel with a nose.
  const gun = rig(2.6, 0, [
    [new THREE.CylinderGeometry(0.22, 0.3, 1.5, 10).translate(0, 0.75, 0), steel],
    [new THREE.BoxGeometry(0.3, 0.3, 3.0).translate(0, 1.5, 1.4), steel],
    [new THREE.CylinderGeometry(0.38, 0.38, 2.0, 14).rotateX(Math.PI / 2).translate(0, TAP_Y + 0.15, 2.8), steel],
    [new THREE.CylinderGeometry(0.2, 0.32, 0.6, 12).rotateX(Math.PI / 2).translate(0, TAP_Y + 0.15, 4.0), clay],
  ]);
  return { drill, gun, rod };
}
