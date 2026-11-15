// Washing line look: cloth passes, line ribbons, pegs and pulley wheels.
// The physics lives in core.js; this file only draws it.
import * as THREE from 'three';
import { ropeAt } from './core.js';

/* ---------- cloth materials ---------- */
// Three passes, each free of draw order:
// 1. Max lifts the scene behind a piece to the sun's light through it.
// 2. Multiply tints that light with the cloth, so overlaps mix.
// 3. Add puts front light and sky light on the face we see.
const VS = /* glsl */ `
  varying vec3 vW, vN, vCol;
  varying vec2 vUv;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = mat3(modelMatrix) * normal; vUv = uv;
    #ifdef USE_COLOR
      vCol = color;
    #else
      vCol = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const HEAD = /* glsl */ `
  varying vec3 vW, vN, vCol;
  varying vec2 vUv;
  uniform vec3 uSun, uSunCol, uT, uAlb, uAmbHi, uAmbLo; uniform float uB, uTau; uniform vec2 uSize;
  vec3 faceN(out vec3 v) {
    v = normalize(cameraPosition - vW);
    vec3 n = normalize(vN);
    return dot(n, v) < 0.0 ? -n : n;
  }
  float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + 1.0), f.x), f.y);
  }
  // Layers of cloth the light passes: two at the hems, a little slub between.
  float layers() {
    if (uSize.x <= 0.0) return 1.0;
    vec2 m = vUv * uSize, e = min(m, uSize - m);
    float hem = 1.0 - step(0.035, min(e.x, e.y));
    float slub = 0.12 * (vn(m * 9.0) - 0.5) + 0.06 * (vn(vec2(m.x * 60.0, m.y * 3.0)) - 0.5);
    return 1.0 + hem + slub;
  }`;
const PASS = {
  // The sun's light through the cloth; it brightens toward the sun's disc.
  max: `void main() { vec3 v; vec3 n = faceN(v);
    float through = 0.35 + 0.65 * max(dot(-n, uSun), 0.0);
    float fwd = 1.0 + 1.1 * pow(max(dot(-v, uSun), 0.0), 8.0);
    float k = layers();
    gl_FragColor = vec4(uSunCol * uB * uTau * 0.6 * through * fwd / k, 1.0); }`,
  // The tint deepens with the path length through the weave.
  mul: `void main() { vec3 v; vec3 n = faceN(v);
    float c = max(abs(dot(n, v)), 0.3);
    vec3 T = pow(uT * vCol, vec3(layers() / c));
    gl_FragColor = vec4(mix(vec3(0.05), T, uB * uTau + (1.0 - uB) * 0.04), 1.0); }`,
  add: `void main() { vec3 v; vec3 n = faceN(v);
    float sun = max(dot(n, uSun), 0.0);
    vec3 amb = mix(uAmbLo, uAmbHi, 0.5 + 0.5 * n.y) * (0.75 - 0.45 * uB);
    gl_FragColor = vec4(uAlb * vCol * (uSunCol * sun * 0.6 + amb), 1.0); }`,
};
const ORDER = { max: 10, mul: 11, add: 12 };

function clothMat(shared, kind, alb, tr, size, vcol) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...shared, uAlb: { value: new THREE.Vector3(...alb) }, uT: { value: new THREE.Vector3(...tr) }, uSize: { value: new THREE.Vector2(...size) } },
    vertexShader: VS, fragmentShader: HEAD + PASS[kind], vertexColors: vcol,
    side: THREE.DoubleSide, depthWrite: false, transparent: true, blending: THREE.CustomBlending,
  });
  m.blendEquation = kind === 'max' ? THREE.MaxEquation : THREE.AddEquation;
  m.blendSrc = kind === 'mul' ? THREE.DstColorFactor : THREE.OneFactor;
  m.blendDst = kind === 'mul' ? THREE.ZeroFactor : THREE.OneFactor;
  return m;
}

/* ---------- ribbons ---------- */
// A ribbon faces the camera and keeps a minimum width in pixels.
function ribbon(n, col) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 6);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const idx = [];
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  const u = { uCol: { value: new THREE.Vector3(...col) } };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, side: THREE.DoubleSide,
    vertexShader: `void main() { gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }` }));
  m.frustumCulled = false;
  return { mesh: m, pos, u, n };
}
function fillRibbon(rb, X, Y, Z, cam, pxM, minPx, hw) {
  const cp = cam.position, n = rb.n;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const tx = X[b] - X[a], ty = Y[b] - Y[a], tz = Z[b] - Z[a];
    const vx = cp.x - X[i], vy = cp.y - Y[i], vz = cp.z - Z[i];
    let sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
    const sl = Math.hypot(sx, sy, sz) || 1;
    // pxM is metres per pixel at one metre from the camera.
    const w = Math.max(hw, Math.hypot(vx, vy, vz) * pxM * minPx * 0.5);
    sx *= w / sl; sy *= w / sl; sz *= w / sl;
    const o = i * 6;
    rb.pos[o] = X[i] + sx; rb.pos[o + 1] = Y[i] + sy; rb.pos[o + 2] = Z[i] + sz;
    rb.pos[o + 3] = X[i] - sx; rb.pos[o + 4] = Y[i] - sy; rb.pos[o + 5] = Z[i] - sz;
  }
  rb.mesh.geometry.attributes.position.needsUpdate = true;
}

/* ---------- the look ---------- */
// It binds one line; a place change builds a new look.
export function makeLook(scene, line, { cord, peg, amb }) {
  const shared = {
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3(1, 1, 1) },
    uB: { value: 0 }, uTau: { value: 0.62 },
    uAmbHi: { value: new THREE.Vector3(...amb.hi) }, uAmbLo: { value: new THREE.Vector3(...amb.lo) },
  };
  const group = new THREE.Group();
  scene.add(group);

  // The carrying strand follows the rope; the return strand sags less above it.
  const r = line.rope, n = r.n;
  const top = ribbon(n, cord), back = ribbon(n, cord);
  top.mesh.castShadow = true;
  group.add(top.mesh, back.mesh);
  const bx = new Float32Array(n), by = new Float32Array(n), bz = new Float32Array(n);
  const GAP = 0.13;

  // Each pulley is a small wheel at its anchor, in the line's plane.
  const wheelGeo = new THREE.TorusGeometry(GAP / 2, 0.012, 8, 20);
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5, metalness: 0.6 });
  const dir = new THREE.Vector3(...line.b).sub(new THREE.Vector3(...line.a)).normalize();
  for (const p of [line.a, line.b]) {
    const w = new THREE.Mesh(wheelGeo, metal);
    w.position.set(p[0], p[1] + GAP / 2, p[2]);
    // The wheel's axis is horizontal and normal to the line.
    w.lookAt(w.position.clone().add(new THREE.Vector3(-dir.z, 0, dir.x)));
    w.castShadow = true;
    group.add(w);
  }

  const PEG_MAX = 48;
  const pegs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.07, 0.022),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...peg), roughness: 0.75 }), PEG_MAX);
  pegs.frustumCulled = false;
  pegs.castShadow = true;
  group.add(pegs);

  const pieces = new Map();
  function addPiece(c, pal) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(c.n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // Grid UVs let the shader find the hems.
    const uv = new Float32Array(c.n * 2);
    for (let k = 0; k < c.n; k++) { uv[k * 2] = (k % c.cols) / (c.cols - 1); uv[k * 2 + 1] = Math.floor(k / c.cols) / (c.rows - 1); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(c.tris, 1));
    const meshes = ['max', 'mul', 'add'].map(kind => {
      const m = new THREE.Mesh(g, clothMat(shared, kind, pal.alb, pal.tr, [c.w, c.h], false));
      m.renderOrder = ORDER[kind];
      m.frustumCulled = false;
      group.add(m);
      return m;
    });
    // Only one pass casts a shadow.
    meshes[2].castShadow = true;
    pieces.set(c, { g, pos, meshes });
  }
  function removePiece(c) {
    const p = pieces.get(c);
    if (!p) return;
    for (const m of p.meshes) { group.remove(m); m.material.dispose(); }
    p.g.dispose();
    pieces.delete(c);
  }

  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const at = new THREE.Vector3(), o = [0, 0, 0], o2 = [0, 0, 0];
  // flyers are loose pegs in the air: position and spin.
  function sync(camera, viewH, flyers = []) {
    for (const [c, p] of pieces) {
      for (let k = 0; k < c.n; k++) { p.pos[k * 3] = c.x[k]; p.pos[k * 3 + 1] = c.y[k]; p.pos[k * 3 + 2] = c.z[k]; }
      p.g.attributes.position.needsUpdate = true;
      p.g.computeVertexNormals();
    }
    const pxM = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / viewH;
    fillRibbon(top, r.x, r.y, r.z, camera, pxM, 1.7, 0.005);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), sx = line.a[0] + (line.b[0] - line.a[0]) * t;
      const sy = line.a[1] + (line.b[1] - line.a[1]) * t, sz = line.a[2] + (line.b[2] - line.a[2]) * t;
      bx[i] = sx + (r.x[i] - sx) * 0.35;
      by[i] = sy + (r.y[i] - sy) * 0.35 + GAP;
      bz[i] = sz + (r.z[i] - sz) * 0.35;
    }
    fillRibbon(back, bx, by, bz, camera, pxM, 1.3, 0.004);
    let k = 0;
    for (const c of line.pieces) for (const g of c.pegs) {
      if (k >= PEG_MAX) break;
      ropeAt(r, g.s - 0.05, o); ropeAt(r, g.s + 0.05, o2);
      e.set(0, -Math.atan2(o2[2] - o[2], o2[0] - o[0]), Math.atan2(o2[1] - o[1], Math.hypot(o2[0] - o[0], o2[2] - o[2])), 'YZX');
      q.setFromEuler(e);
      ropeAt(r, g.s, o);
      at.set(o[0], o[1] - 0.01, o[2]);
      pegs.setMatrixAt(k++, mtx.compose(at, q, one));
    }
    for (const f of flyers) {
      if (k >= PEG_MAX) break;
      pegs.setMatrixAt(k++, mtx.compose(at.set(f.x, f.y, f.z), q.setFromEuler(e.set(f.rx, f.ry, f.rz, 'XYZ')), one));
    }
    pegs.count = k;
    pegs.instanceMatrix.needsUpdate = true;
  }
  // Still cloth elsewhere in the place glows the same way.
  // size is the piece in metres; 0 skips the hems.
  function addStatic(geo, pal, { size = [0, 0], vcol = false, at = null, shadow = true } = {}) {
    const meshes = ['max', 'mul', 'add'].map(kind => {
      const m = new THREE.Mesh(geo, clothMat(shared, kind, pal.alb, pal.tr, size, vcol));
      m.renderOrder = ORDER[kind];
      if (at) m.matrix.copy(at), m.matrixAutoUpdate = false;
      group.add(m);
      return m;
    });
    meshes[2].castShadow = shadow;
    return meshes;
  }
  function setSun(dir, col, b) {
    shared.uSun.value.copy(dir);
    shared.uSunCol.value.copy(col);
    shared.uB.value = b;
  }
  function setCord(rgb) { top.u.uCol.value.set(...rgb); back.u.uCol.value.set(...rgb); }
  function dispose() { scene.remove(group); }
  return { addPiece, removePiece, addStatic, sync, setSun, setCord, dispose };
}
