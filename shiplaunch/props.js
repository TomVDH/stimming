// Ship launch props: the drag-chain wires and heaps, the crowd, the bunting.
import * as THREE from 'three';
import { CANAL, PIER, HULL, wayTop, buntingLine } from './yard.js';
import { FIG_GLSL } from './figures.js';

// The wires leave lugs on the inboard deck edge at these stations.
export const WIRE_X = [-30, -10, 10, 30];
const SEG = 18;

/* ---------- wires and heaps ---------- */
export function makeChains(mats) {
  const grp = new THREE.Group();
  // One thin bar per wire segment, placed each frame along a sagging curve.
  const bar = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
  const wire = new THREE.InstancedMesh(bar, mats.wire, WIRE_X.length * SEG);
  wire.castShadow = true;
  wire.frustumCulled = false;
  grp.add(wire);
  // A heap: a low, lumpy mound of rusty chain.
  const heapGeo = new THREE.IcosahedronGeometry(1, 3);
  const pos = heapGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + 0.18 * Math.sin(x * 9.1 + z * 7.3) * Math.cos(y * 8.7 + x * 3.1) + 0.1 * Math.sin(z * 23.0 + y * 17.0);
    pos.setXYZ(i, x * n * 1.7, Math.max(-0.1, y) * n * 0.75, z * n * 1.2);
  }
  heapGeo.computeVertexNormals();
  const heaps = WIRE_X.map(() => {
    const h = new THREE.Mesh(heapGeo, mats.rust);
    h.castShadow = h.receiveShadow = true;
    grp.add(h);
    return h;
  });
  const m = new THREE.Matrix4(), a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), fwd = new THREE.Vector3(0, 0, 1);
  const pts = Array.from({ length: SEG + 1 }, () => new THREE.Vector3());
  /** Lays the wires from the hull's lugs to the heaps. */
  function update(hull, L, drop, slack) {
    let n = 0;
    WIRE_X.forEach((x, k) => {
      const hz = L.heap + (k % 2 ? 0.6 : -0.4);
      const hy = wayTop(hz, drop);
      heaps[k].position.set(x + (k - 1.5) * 0.6, hy, hz - 1.0);
      heaps[k].rotation.y = k * 1.7;
      a.set(x, HULL.D, -HULL.B / 2).applyMatrix4(hull.matrixWorld);
      b.set(x, hy + 0.5, hz);
      const d = a.distanceTo(b);
      // A slack wire sags like a chain; a taut one runs straight.
      const sag = Math.sqrt(Math.max(0, slack * slack - d * d)) * 0.45;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        pts[i].lerpVectors(b, a, t);
        pts[i].y -= sag * 4 * t * (1 - t);
        // The wire lies on the ground where it sags under it.
        const g = wayTop(pts[i].z, drop) + 0.05;
        if (pts[i].z < CANAL.zYard && pts[i].y < g) pts[i].y = g;
      }
      for (let i = 0; i < SEG; i++) {
        const len = pts[i].distanceTo(pts[i + 1]);
        q.setFromUnitVectors(fwd, s.subVectors(pts[i + 1], pts[i]).normalize());
        m.compose(pts[i], q, s.set(0.09, 0.09, len));
        wire.setMatrixAt(n++, m);
      }
    });
    wire.instanceMatrix.needsUpdate = true;
  }
  return { grp, update };
}

/* ---------- the crowd ---------- */
// Flat figures in profile, as Frietkot draws them: ink with a sunlit rim.
// Builds, as walker() reads them: 0 average, 1 tall, 2 broad, 3 child, 4 old, 5 coat and hat, 6 hood, 7 cap, 8 long hair.
const BUILDS = [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 8];
// Poses while they wait: free, hands in pockets, arms crossed, a phone.
const WAIT = [0, 1, 1, 1, 2, 2, 3];
const FIG_VS = /* glsl */`
attribute vec4 aPos;
attribute vec4 aVar;
uniform vec3 uCam;
varying vec2 vQ;
varying vec4 vVar;
varying vec3 vW;
void main() {
  vVar = aVar;
  // aPos.w: the height scale, its sign the way the figure faces.
  float k = abs(aPos.w);
  vQ = vec2(position.x * sign(aPos.w), position.y) / k;
  // Upright cards: they turn to the lens round the vertical only.
  vec3 to = vec3(uCam.x - aPos.x, 0.0, uCam.z - aPos.z);
  vec3 right = normalize(vec3(to.z, 0.0, -to.x) + 1e-5);
  vec3 w = aPos.xyz + right * position.x + vec3(0.0, position.y, 0.0);
  vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;
const FIG_FS = /* glsl */`
uniform vec3 uSun, uSunCol, uSky, uFog, uCam;
uniform float uFogD, uT;
varying vec2 vQ;
varying vec4 vVar;
varying vec3 vW;
${FIG_GLSL}
void main() {
  vec2 hand;
  float d = walker(vQ, 0.0, 0.0, 0.0, -1.0, vVar.x, vVar.y, uT, vVar.z, hand);
  float aa = max(fwidth(d), 0.003);
  float a = smoothstep(aa, -aa, d);
  if (a < 0.02) discard;
  // Against the low sun the figures go dark; the sun rims their edges.
  vec3 v = normalize(vW - uCam);
  float back = pow(max(0.0, dot(v, uSun)), 3.0);
  float rim = smoothstep(-0.022, 0.0, d);
  vec3 coat = mix(vec3(0.004, 0.0038, 0.0036), vec3(0.012, 0.008, 0.006), vVar.w);
  vec3 c = coat + uSky * 0.008 + uSunCol * rim * (0.03 + 0.35 * back);
  float dist = length(vW - uCam);
  c = mix(c, uFog, 1.0 - exp(-uFogD * uFogD * dist * dist));
  gl_FragColor = vec4(c, a);
}`;
export function makeCrowd() {
  const people = [];
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = a => a[Math.floor(r() * a.length)];
  // rx, rz: the way a person steps back from the water.
  const add = (x, z, yard = false, rx = 0, rz = 1, y = CANAL.quayTop) => {
    const build = pick(BUILDS);
    people.push({ x, z, x0: x, z0: z, rx, rz, y, h: build === 3 ? 1 : 0.94 + r() * 0.12, build, wait: pick(WAIT), pose: 0, seed: r(), tone: r(), back: 0, yard });
  };
  const P = PIER, pt = P.top;
  // The pier head: a row at the very edge, and along the east side toward the berth.
  for (let i = 0; i < 12; i++) add(P.x0 + 0.5 + (i + r() * 0.6) * (P.x1 - P.x0 - 1) / 12, P.z0 + 0.5 + r() * 0.9, false, 0, 1, pt);
  for (let i = 0; i < 6; i++) add(P.x1 - 0.5 - r() * 0.9, P.z0 + 2 + i * 0.9 + r() * 0.4, false, -1, 0, pt);
  // The north quay, far across the basin.
  for (let i = 0; i < 40; i++) add(-90 + r() * 200, CANAL.zQuay + 0.8 + r() * 2, false);
  // The yard's own crowd, on the banks beside the berth.
  for (let i = 0; i < 28; i++) add(-86 + r() * 18, -30 - r() * 14, true);
  for (let i = 0; i < 28; i++) add(68 + r() * 18, -30 - r() * 14, true);
  people.forEach(p => { p.pose = p.wait; });
  const n = people.length;
  const quad = new THREE.PlaneGeometry(2, 2.1).translate(0, 1.05, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.getAttribute('position'));
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  const aVar = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  geo.setAttribute('aPos', aPos);
  geo.setAttribute('aVar', aVar);
  geo.instanceCount = n;
  const U = {
    uCam: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.8, 0.6) },
    uSky: { value: new THREE.Color(0.5, 0.55, 0.65) }, uFog: { value: new THREE.Color() }, uFogD: { value: 0 }, uT: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: FIG_VS, fragmentShader: FIG_FS, side: THREE.DoubleSide, alphaToCoverage: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  // Everyone faces the berth's middle, seen from where they stand.
  const look = new THREE.Vector3(), cam = new THREE.Vector3();
  /** Places everyone; the pier crowd steps back from water on the deck. */
  function update(dt, wetAt, yardY, camera, t) {
    cam.copy(camera.position);
    people.forEach((p, i) => {
      if (!p.yard) {
        // Water at their feet or a step toward the edge.
        const wet = Math.max(wetAt(p.x0 + p.rx * p.back, p.z0 + p.rz * p.back), wetAt(p.x0 - p.rx * 1.2, p.z0 - p.rz * 1.2));
        // They step back 3.5 m at most, so no one walks into the lens.
        const goal = wet > 0.02 ? Math.min(3.5, 1.5 + wet * 30) : Math.max(0, p.back - dt * 0.4);
        p.back += (goal - p.back) * Math.min(1, dt * 2.5);
        p.x = p.x0 + p.rx * p.back;
        p.z = p.z0 + p.rz * p.back;
      } else p.y = yardY(p.z, p.x);
      // Facing: the sign of the berth on the card's screen right.
      look.set(0 - p.x, 0, -27 - p.z);
      const face = Math.sign(look.x * (cam.z - p.z) - look.z * (cam.x - p.x)) || 1;
      aPos.setXYZW(i, p.x, p.y, p.z, face * p.h);
      aVar.setXYZW(i, p.build, p.pose, p.seed, p.tone);
    });
    aPos.needsUpdate = aVar.needsUpdate = true;
    U.uCam.value.copy(cam);
    U.uT.value = t;
  }
  /** After the hit some wave and point; on a reset all wait again. */
  function cheer(on) {
    people.forEach(p => { p.pose = on && p.build !== 4 ? (p.seed < 0.35 ? 5 : p.seed < 0.5 ? 6 : p.wait) : p.wait; });
  }
  const grp = new THREE.Group();
  grp.add(mesh);
  return { grp, update, cheer, people, U };
}

/* ---------- bunting ---------- */
const FLAGS = [0xc8302a, 0xe8c23a, 0x2a5fa8, 0xf2f2ee, 0x2f8a4a];
export function makeBunting(mats) {
  const line = buntingLine();
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.35, 0, 0, 0.35, 0, 0, 0, -0.75, 0], 3));
  tri.computeVertexNormals();
  const flags = [];
  for (let k = 0; k < line.length - 1; k++) {
    const a = new THREE.Vector3(...line[k]), b = new THREE.Vector3(...line[k + 1]);
    const n = Math.round(a.distanceTo(b) / 1.3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const p = a.clone().lerp(b, t);
      // The line sags between its ends.
      p.y -= 1.2 * 4 * t * (1 - t);
      flags.push({ p, ph: flags.length * 0.7 });
    }
  }
  const mat = mats.flag.clone();
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.InstancedMesh(tri, mat, flags.length);
  const col = new THREE.Color();
  flags.forEach((f, i) => mesh.setColorAt(i, col.setHex(FLAGS[i % FLAGS.length])));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
  /** Flutters each pennant in the breeze; reduced motion holds them still. */
  function update(t, still) {
    flags.forEach((f, i) => {
      const w = still ? 0.35 : 0.35 + 0.25 * Math.sin(t * 5.3 + f.ph) + 0.1 * Math.sin(t * 11.7 + f.ph * 2.1);
      e.set(w, Math.PI / 2 + 0.3 * Math.sin(t * 1.3 + f.ph), 0);
      m.compose(f.p, q.setFromEuler(e), s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, true);
  return { mesh, update };
}
