// Field: a moonless meadow, a treeline, a shed, a road and ground fog.
// Albedo values are near-infrared reflectance, so foliage reads bright.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise2D } from 'simplex-noise';
import { rng, lerp, smooth, makeAir, fogify, buildSky, buildStars, Emitters, lambert } from './atmos.js';

const R = rng(20261109);
const n2 = createNoise2D(rng(7));

// The road runs out of the forest through a gap, at the viewer, then right.
const ROAD = new THREE.CatmullRomCurve3([
  [300, 0, -440], [140, 0, -270], [62, 0, -170], [24, 0, -116], [22, 0, -72], [56, 0, -54], [130, 0, -48], [330, 0, -70],
].map(p => new THREE.Vector3(...p)), false, 'centripetal');
const ROAD_PTS = ROAD.getSpacedPoints(400);
function roadDist(x, z) {
  let d = 1e9;
  for (const p of ROAD_PTS) d = Math.min(d, (p.x - x) ** 2 + (p.z - z) ** 2);
  return Math.sqrt(d);
}
// The treeline edge sits about 85 m out and wanders.
const edgeZ = x => -104 - 18 * n2(x / 70, 3.1) - 7 * n2(x / 19, 8.4);

// Terrain height: soft rolls, a lift behind the treeline, a far ridge.
export function height(x, z) {
  let h = 0.7 * n2(x / 70, z / 70) + 0.22 * n2(x / 17, z / 17) + 0.05 * n2(x / 4, z / 4);
  h += smooth(-90, -260, z) * (10 + 8 * n2(x / 120, 1.7));
  h += smooth(-500, -900, z) * (60 + 40 * n2(x / 260, 5.3));
  // The road bed is flat.
  const rd = roadDist(x, z);
  if (rd < 9) h = lerp(h, h * 0.4, smooth(9, 3, rd));
  return h;
}

function buildGround() {
  const g = new THREE.PlaneGeometry(2400, 2400, 300, 300);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    // Denser vertices sit near the viewer.
    let x = pos.getX(i), z = pos.getZ(i);
    const k = 1 + 3 * smooth(80, 1200, Math.hypot(x, z));
    x = Math.sign(x) * Math.pow(Math.abs(x) / 1200, k) * 1200;
    z = Math.sign(z) * Math.pow(Math.abs(z) / 1200, k) * 1200;
    pos.setXYZ(i, x, height(x, z), z);
    // Mown patches, wet hollows and the dark road surface.
    let a = 0.44 + 0.1 * n2(x / 9, z / 9) + 0.06 * n2(x / 2.2, z / 2.2) - 0.08 * smooth(0.2, 0.8, n2(x / 40 + 9, z / 40));
    const rd = roadDist(x, z);
    a = lerp(a, 0.11, smooth(4.2, 2.6, rd));
    a = lerp(a, 0.26, smooth(5.5, 4.2, rd) * (1 - smooth(4.2, 2.6, rd)));
    col.set([a, a, a], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

function buildGrass(count, uTime) {
  // One blade: a tapered strip of three segments.
  const w = 0.028, pts = [[-w, 0], [w, 0], [-w * 0.8, 0.35], [w * 0.8, 0.35], [-w * 0.5, 0.7], [w * 0.5, 0.7], [0, 1]];
  const pos = [], nor = [], idx = [];
  pts.forEach(([x, y]) => { pos.push(x, y, 0); nor.push(0, 0.85, 0.53); });
  idx.push(0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float gust = sin(uTime * 0.7 + ip.x * 0.05 - ip.z * 0.04);
      float wv = sin(uTime * 1.9 + ip.x * 0.31 + ip.z * 0.23) * 0.6 + sin(uTime * 3.3 + ip.x * 0.9) * 0.25;
      float bend = (0.12 + 0.18 * max(gust, 0.0)) * wv + 0.12;
      transformed.z += bend * transformed.y * transformed.y;
      transformed.y -= 0.25 * bend * bend * transformed.y;`);
  };
  const mesh = new THREE.InstancedMesh(g, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  let i = 0;
  while (i < count) {
    const r = 1.2 + 52 * Math.pow(R(), 1.7), a = R() * Math.PI * 2;
    const x = Math.sin(a) * r, z = -Math.cos(a) * r;
    if (roadDist(x, z) < 5) continue;
    // Seed heads stand taller in clumps.
    const clump = 0.5 + 0.5 * n2(x / 5, z / 5);
    const hgt = (0.25 + 0.75 * clump) * (0.6 + 0.6 * R());
    p.set(x, height(x, z) - 0.02, z);
    e.set((R() - 0.5) * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.5);
    q.setFromEuler(e);
    s.set(1 + R(), hgt, 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    const al = 0.36 + 0.24 * R() + 0.12 * clump;
    mesh.setColorAt(i, c.setRGB(al, al, al));
    i++;
  }
  mesh.frustumCulled = false;
  return mesh;
}

function coniferGeometry(tiers, slim) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.05, 0.09, 1, 6);
  trunk.translate(0, 0.5, 0);
  paint(trunk, 0.16);
  parts.push(trunk);
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1);
    const rad = lerp(0.42, 0.1, t) * slim, h = lerp(0.34, 0.2, t);
    const cone = new THREE.ConeGeometry(rad, h, 11, 3, true);
    cone.translate(0, 0.16 + t * 0.78 + h / 2, 0);
    // Branch tips droop and break the cone edge.
    const pp = cone.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), a = Math.atan2(z, x);
      const j = 1 + 0.32 * Math.sin(a * 5 + k * 1.7) * Math.sin(a * 3 - k) + 0.18 * (R() - 0.5);
      pp.setXYZ(i, x * j, y + 0.03 * (R() - 0.5), z * j);
    }
    cone.computeVertexNormals();
    // Inner shade: lower tiers sit darker.
    paint(cone, lerp(0.12, 0.36, t), 0.1);
    parts.push(cone);
  }
  return mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)));
}
function broadleafGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.03, 0.06, 0.55, 6);
  trunk.translate(0, 0.27, 0);
  paint(trunk, 0.34);
  parts.push(trunk);
  for (let k = 0; k < 6; k++) {
    const b = new THREE.IcosahedronGeometry(0.2 + 0.1 * R(), 1);
    const pp = b.attributes.position;
    for (let i = 0; i < pp.count; i++) pp.setXYZ(i, pp.getX(i) * (0.85 + 0.3 * R()), pp.getY(i) * (0.85 + 0.3 * R()), pp.getZ(i) * (0.85 + 0.3 * R()));
    b.computeVertexNormals();
    b.translate((R() - 0.5) * 0.4, 0.55 + R() * 0.35, (R() - 0.5) * 0.4);
    paint(b, 0.22 + 0.12 * R(), 0.12);
    parts.push(b);
  }
  return mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)));
}
// Foliage shade varies per vertex, so crowns read as clumps.
function paint(g, a, jitter = 0) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.fill(Math.max(0.02, a + jitter * (R() - 0.5) * 2), i * 3, i * 3 + 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
}

function buildForest() {
  const kinds = [coniferGeometry(7, 1), coniferGeometry(9, 0.75), broadleafGeometry()];
  const spots = [[], [], []];
  for (let x = -420; x < 420; x += 2.6 + R() * 2.4) {
    // Rows stack deeper into the wood.
    for (let row = 0; row < 9; row++) {
      const z = edgeZ(x) - row * (7 + R() * 6) - R() * 4;
      const xx = x + (R() - 0.5) * 3;
      if (roadDist(xx, z) < 11) continue;
      if (row === 0 && R() < 0.18) continue;
      const kind = R() < 0.2 ? 2 : R() < 0.5 ? 1 : 0;
      const hgt = kind === 2 ? 7 + R() * 7 : 8 + R() * 11 * R() + R() * 5 + row * 0.5;
      spots[kind].push([xx, z, hgt]);
    }
  }
  // A few loose trees stand out in the field.
  [[-40, -52, 13], [-44, -57, 9], [34, -38, 7], [-70, -40, 15]].forEach(s => spots[2].push(s));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return kinds.map((geo, k) => {
    const mesh = new THREE.InstancedMesh(geo, mat, spots[k].length);
    spots[k].forEach(([x, z, h], i) => {
      p.set(x, height(x, z) - 0.3, z);
      q.setFromAxisAngle(up, R() * 6.283);
      const w = h * (k === 2 ? 0.9 + R() * 0.4 : 0.7 + R() * 0.35);
      s.set(w, h, w);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    return mesh;
  });
}

function buildShed(lights) {
  const g = new THREE.Group();
  const wood = lambert(0.42), roofM = lambert(0.22);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 4.2), wood);
  walls.position.y = 1.4;
  g.add(walls);
  // A pitched roof from two slabs.
  for (const sx of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.12, 2.6), roofM);
    slab.position.set(0, 3.25, sx * 1.05);
    slab.rotation.x = sx * 0.5;
    g.add(slab);
  }
  const gable = new THREE.Shape([new THREE.Vector2(-2.1, 0), new THREE.Vector2(2.1, 0), new THREE.Vector2(0, 1.15)]);
  for (const sx of [-1, 1]) {
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), wood);
    gm.rotation.y = Math.PI / 2 * sx;
    gm.position.set(sx * 3.0, 2.8, 0);
    g.add(gm);
  }
  // The door stands half open on a warm bulb.
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(60) }));
  inside.position.set(-1.2, 1.0, 2.11);
  g.add(inside);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.06), lambert(0.36));
  door.position.set(-1.2 - 0.5 + 0.5 * Math.cos(1.1), 1.0, 2.11 + 0.5 * Math.sin(1.1));
  door.rotation.y = -1.1;
  g.add(door);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(22) }));
  win.position.set(1.4, 1.7, 2.11);
  g.add(win);
  const spill = new THREE.PointLight(0xffffff, 320, 0, 2);
  spill.position.set(-1.2, 1.2, 3.6);
  g.add(spill);
  lights.door = spill;
  return g;
}

function buildFence() {
  const posts = [], wires = [];
  let prev = null;
  for (let x = -62; x <= 40; x += 3.2) {
    const z = -27 - 3 * n2(x / 30, 2) + x * 0.05;
    const top = new THREE.Vector3(x + (R() - 0.5) * 0.3, height(x, z) + 1.25 + (R() - 0.5) * 0.12, z);
    posts.push(top);
    if (prev) wires.push([prev, top]);
    prev = top;
  }
  const postGeo = new THREE.BoxGeometry(0.11, 1.5, 0.11);
  postGeo.translate(0, -0.75, 0);
  const pm = new THREE.InstancedMesh(postGeo, lambert(0.38), posts.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
  posts.forEach((p, i) => { e.set((R() - 0.5) * 0.12, R() * 3, (R() - 0.5) * 0.12); q.setFromEuler(e); m.compose(p, q, s); pm.setMatrixAt(i, m); });
  // Two strands of wire sag between posts.
  const wireGeo = new THREE.BoxGeometry(1, 0.018, 0.018);
  const wm = new THREE.InstancedMesh(wireGeo, lambert(0.5), wires.length * 2);
  const d = new THREE.Vector3(), mid = new THREE.Vector3(), x1 = new THREE.Vector3(1, 0, 0);
  wires.forEach(([a, b], i) => {
    for (let k = 0; k < 2; k++) {
      const drop = k ? 0.45 : 0.08;
      d.subVectors(b, a);
      mid.addVectors(a, b).multiplyScalar(0.5);
      mid.y -= drop + 0.05;
      q.setFromUnitVectors(x1, d.clone().normalize());
      s.set(d.length(), 1, 1);
      m.compose(mid, q, s);
      wm.setMatrixAt(i * 2 + k, m);
    }
  });
  return [pm, wm];
}

function buildRoad() {
  const pts = ROAD.getSpacedPoints(600), pos = [], idx = [];
  const side = new THREE.Vector3(), t = new THREE.Vector3();
  pts.forEach((p, i) => {
    t.copy(ROAD.getTangentAt(i / (pts.length - 1)));
    side.set(-t.z, 0, t.x).normalize().multiplyScalar(2.9);
    for (const sg of [-1, 1]) {
      const x = p.x + side.x * sg, z = p.z + side.z * sg;
      pos.push(x, height(x, z) + 0.05, z);
    }
    if (i) { const b = (i - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: new THREE.Color(0.1, 0.1, 0.1), side: THREE.DoubleSide }));
}

function buildCar(lights) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 4.4), lambert(0.3));
  body.position.y = 0.62;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), lambert(0.18));
  cab.position.set(0, 1.25, -0.3);
  g.add(body, cab);
  const beam = new THREE.SpotLight(0xffffff, 0, 0, 0.42, 0.7, 2);
  beam.position.set(0, 0.7, 2.3);
  beam.target.position.set(0, -1.2, 30);
  g.add(beam, beam.target);
  lights.car = beam;
  return g;
}

// A walker: capsule limbs on hip and shoulder pivots.
function buildFigure() {
  const g = new THREE.Group(), cloth = lambert(0.3), skin = lambert(0.55);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.5, 4, 8), cloth);
  torso.position.y = 1.25;
  torso.scale.z = 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), skin);
  head.position.y = 1.7;
  g.add(torso, head);
  const limb = (r, len, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 6), cloth);
    m.position.y = -len / 2 - r;
    pivot.add(m);
    g.add(pivot);
    return pivot;
  };
  const legs = [limb(0.075, 0.72, -0.1, 0.92), limb(0.075, 0.72, 0.1, 0.92)];
  const arms = [limb(0.055, 0.56, -0.25, 1.48), limb(0.055, 0.56, 0.25, 1.48)];
  return { g, legs, arms, head, torso };
}

function buildDeer() {
  const g = new THREE.Group(), coat = lambert(0.55);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), coat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.95;
  g.add(body);
  for (const [x, z] of [[-0.16, 0.45], [0.16, 0.45], [-0.16, -0.45], [0.16, -0.45]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.8, 5), coat);
    leg.position.set(x, 0.4, z);
    g.add(leg);
  }
  const neck = new THREE.Group();
  neck.position.set(0, 1.1, 0.55);
  const nm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 3, 6), coat);
  nm.position.y = 0.28;
  const hm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.2, 3, 6), coat);
  hm.rotation.x = Math.PI / 2;
  hm.position.set(0, 0.55, 0.12);
  const ears = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.02), coat);
  ears.position.set(0, 0.66, 0.02);
  neck.add(nm, hm, ears);
  g.add(neck);
  return { g, neck };
}

/* ---------- scene ---------- */
export function buildField({ grass = 60000 } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 6000);
  // A thin ground fog pools in hollows; a faint haze greys the ridge.
  const air = makeAir();
  air.uFog.value.set(0.016, 0.55, 0.00035, 1 / 700);
  air.uFogCol.value.setScalar(3.4);
  air.uFogGlow.value.set(-0.9, 0.5, 0.6);
  air.uSky.value.set(4.4, 0.75, 3.2, 0);
  const uTime = { value: 0 };
  const lights = {};

  // Starlight and airglow come from the whole sky.
  scene.add(new THREE.HemisphereLight(new THREE.Color(1, 1, 1), new THREE.Color(0.22, 0.22, 0.22), 17.5));

  const sky = buildSky(air);
  const stars = buildStars(air, R);
  scene.add(sky, stars, buildGround(), buildRoad());
  const grassMesh = buildGrass(grass, uTime);
  scene.add(grassMesh);
  buildForest().forEach(m => scene.add(m));
  buildFence().forEach(m => scene.add(m));

  const shed = buildShed(lights);
  shed.position.set(-24, height(-24, -47) - 0.1, -47);
  shed.rotation.y = 0.45;
  scene.add(shed);

  const car = buildCar(lights);
  scene.add(car);

  const fig = buildFigure();
  scene.add(fig.g);

  const deer = buildDeer();
  deer.g.position.set(-13, height(-13, -72), -72);
  deer.g.rotation.y = 0.5;
  scene.add(deer.g);

  // A marker strobe stands on a stake in the field.
  const strobePos = new THREE.Vector3(-8, height(-8, -64) + 1.1, -64);
  const stake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), lambert(0.3));
  stake.position.set(strobePos.x, strobePos.y - 0.55, strobePos.z);
  scene.add(stake);

  // The IR illuminator rides on the goggle and points where it looks.
  const ir = new THREE.SpotLight(0xffffff, 0, 0, 0.3, 0.8, 2);
  scene.add(ir, ir.target);
  // The walker's torch.
  const torch = new THREE.SpotLight(0xffffff, 0, 0, 0.3, 0.6, 2);
  scene.add(torch, torch.target);

  const emit = new Emitters(64, air);
  scene.add(emit.points);

  const eye = new THREE.Vector3(0, height(0, 0) + 1.7, 0);
  camera.position.copy(eye);

  const roadLen = ROAD.getLength();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), fwd = new THREE.Vector3(), toCam = new THREE.Vector3();
  const walker = { x: -26, dir: 1, pause: 0, torch: 0 };

  // Brightness of a lamp facing direction f, as seen from the camera.
  const lobe = (p, f, power) => {
    toCam.subVectors(camera.position, p).normalize();
    return Math.pow(Math.max(0, f.dot(toCam)), power);
  };

  function update(t, dt, { irOn, look }) {
    uTime.value = t;
    air.uFogTime.value = t;
    emit.begin();

    // The car loops: a drive along the road, then a quiet spell.
    const drive = roadLen / 17, cycle = drive + 24;
    const ct = ((t + 0.44 * drive - 12) % cycle + cycle) % cycle / drive;
    if (ct < 1) {
      car.visible = true;
      ROAD.getPointAt(ct, tmp);
      ROAD.getTangentAt(ct, fwd);
      car.position.set(tmp.x, height(tmp.x, tmp.z) + 0.02, tmp.z);
      car.rotation.y = Math.atan2(fwd.x, fwd.z);
      lights.car.intensity = 80000;
      const side = tmp2.set(fwd.z, 0, -fwd.x).normalize();
      for (const sg of [-0.68, 0.68]) {
        const hp = tmp.copy(car.position).addScaledVector(fwd, 2.25).addScaledVector(side, sg);
        hp.y += 0.72;
        emit.add(hp, 25000 * (0.004 + lobe(hp, fwd, 10)), 3.2);
        const tp = tmp.copy(car.position).addScaledVector(fwd, -2.2).addScaledVector(side, sg);
        tp.y += 0.8;
        emit.add(tp, 260 * (0.05 + lobe(tp, fwd.clone().negate(), 3)), 2.4);
      }
    } else {
      car.visible = false;
      lights.car.intensity = 0;
    }

    // The walker paces the fence line, pauses, sometimes shines a torch.
    const W = walker;
    if (W.pause > 0) {
      W.pause -= dt;
      if (W.pause <= 0) W.dir *= -1;
    } else {
      W.x += W.dir * 1.25 * dt;
      if (W.x > 22 || W.x < -30) { W.pause = 3 + R() * 4; W.torch = R() < 0.6 ? W.pause : 0; }
    }
    W.torch = Math.max(0, W.torch - dt);
    const fz = -36 - 2 * Math.sin(W.x / 9);
    const walking = W.pause <= 0;
    const ph = W.x * 3.4;
    fig.g.position.set(W.x, height(W.x, fz), fz);
    const heading = walking ? (W.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (W.dir > 0 ? 0.9 : -0.9) + Math.PI * 0.08;
    fig.g.rotation.y += (heading - fig.g.rotation.y) * Math.min(1, dt * 4);
    const sw = walking ? Math.sin(ph) * 0.45 : 0;
    fig.legs[0].rotation.x = sw; fig.legs[1].rotation.x = -sw;
    fig.arms[0].rotation.x = -sw * 0.7; fig.arms[1].rotation.x = W.torch > 0 ? -1.25 : sw * 0.7;
    fig.g.position.y += walking ? Math.abs(Math.cos(ph)) * 0.04 : 0;
    if (W.torch > 0) {
      fig.g.updateMatrixWorld();
      const hand = fig.arms[1].localToWorld(tmp.set(0, -0.7, 0.1));
      fwd.set(Math.sin(fig.g.rotation.y), -0.25, Math.cos(fig.g.rotation.y)).normalize();
      emit.add(hand, 24000 * (0.002 + lobe(hand, fwd, 14)), 2.4);
      torch.position.copy(hand);
      torch.target.position.copy(hand).addScaledVector(fwd, 10);
      torch.intensity = 4000 * smooth(0, 0.3, W.torch);
    } else torch.intensity = 0;

    // The deer grazes and lifts its head now and then.
    const up = smooth(-0.3, 0.3, Math.sin(t * 0.37) + 0.4 * Math.sin(t * 0.11));
    deer.neck.rotation.x = lerp(1.5, 0.15, up);
    deer.neck.rotation.y = up * 0.5;

    // Eyeshine needs the illuminator on the deer and the head raised.
    deer.g.updateMatrixWorld();
    const eyeP = deer.neck.localToWorld(tmp.set(0, 0.58, 0.24));
    fwd.subVectors(eyeP, camera.position).normalize();
    camera.getWorldDirection(tmp2);
    const inBeam = irOn ? smooth(0.955, 0.99, fwd.dot(tmp2)) : 0;
    const shine = inBeam * up * 9000 / Math.max(1, eyeP.distanceToSquared(camera.position) / 400);
    for (const sg of [-0.05, 0.05]) {
      const e = tmp.copy(eyeP);
      e.x += sg;
      emit.add(e, shine, 1.6);
    }

    // The strobe fires one short flash a second.
    const sp = (t * 1.07) % 1;
    if (sp < 0.035) emit.add(strobePos, 30000 * (1 - sp / 0.035), 2.6);

    // An airliner crosses high up: a white double strobe, a red beacon.
    const at = (t % 80) / 80;
    const az = lerp(-1.6, 1.4, at), el = 0.42 + 0.05 * Math.sin(at * 3);
    const ap = tmp.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(1400).add(camera.position);
    const st = (t % 1.3);
    emit.add(ap, (st < 0.04 || (st > 0.16 && st < 0.2)) ? 4200 : 0, 2.2);
    emit.add(ap.clone().add(tmp2.set(0, -3, 0)), Math.sin(t * 6.3) > 0.6 ? 700 : 0, 2.2);
    emit.add(ap, 40, 2);
    // Two satellites drift on steady arcs.
    for (let k = 0; k < 2; k++) {
      const s = ((t + k * 50) % 110) / 110;
      const a2 = lerp(-1 + k, 1.5 - k * 2.4, s), e2 = 0.6 + 0.4 * Math.sin(s * 3.1 + k);
      emit.add(tmp.set(Math.sin(a2) * Math.cos(e2), Math.sin(e2), -Math.cos(a2) * Math.cos(e2)).multiplyScalar(1400).add(camera.position), 14 + 8 * k, 1.9);
    }

    // The IR beam follows the view.
    camera.getWorldDirection(fwd);
    ir.position.copy(camera.position).add(tmp.set(0.08, -0.06, 0));
    ir.target.position.copy(camera.position).addScaledVector(fwd, 20).add(tmp.set(0, 1.6, 0));
    ir.intensity = irOn ? 120000 : 0;

    emit.end();
  }

  function setPx(px) {
    emit.mat.uniforms.uPx.value = px;
    stars.material.uniforms.uPx.value = px;
  }

  fogify(scene, air);
  return { scene, camera, eye, update, setPx, car, air, look: { yaw: [-1.3, 1.3], pitch: [-0.3, 0.6] }, expo: 1 };
}
