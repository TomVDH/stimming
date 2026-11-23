// Forge smithy: the room, the hearth and its coals, the bellows, the anvil, the trough, the hammer.
// Shapes follow reference photos: a London-pattern anvil, a lung bellows, a hooded hearth.
import * as THREE from 'three';
import { HEAT, NOISE } from './shaders.js';

/* ---------- layout, in metres ---------- */
export const HEARTH = { x: -0.95, z: -0.42, w: 0.86, d: 0.8, h: 0.72 };
export const COALS = new THREE.Vector3(HEARTH.x + 0.04, HEARTH.h + 0.035, HEARTH.z + 0.06);
// The bellows stands back left; its nozzle meets the hearth's left side.
export const BELLOWS = { x: HEARTH.x - HEARTH.w / 2 - 0.25, y: 0.86, z: HEARTH.z - 0.14, L: 0.85, yaw: Math.PI - 0.56 };
export const ANVIL = { x: 0.32, z: 0.08, stump: 0.5, face: 0.82 };
export const TROUGH = { x: 1.22, z: 0.02, w: 0.72, d: 0.42, h: 0.5, water: 0.44 };
export const WINDOW = { x: 0.95, y: 1.85, z: -1.39, w: 0.6, h: 0.48 };

/* ---------- loft: rounded rectangles along a path ---------- */
// Each section: centre c, axes u and v, half sizes a and b, corner radius r.
const P = 4;
export const RING = 4 * P;
export function ringInto(pos, o, s) {
  const { c, u, v, a, b } = s;
  const r = Math.min(s.r, a, b);
  for (let k = 0; k < 4; k++) {
    const sx = k === 0 || k === 3 ? 1 : -1, sy = k < 2 ? 1 : -1;
    for (let j = 0; j < P; j++) {
      const an = (k + j / (P - 1)) * Math.PI / 2;
      const x = sx * (a - r) + Math.cos(an) * r, y = sy * (b - r) + Math.sin(an) * r;
      pos[o++] = c[0] + u[0] * x + v[0] * y;
      pos[o++] = c[1] + u[1] * x + v[1] * y;
      pos[o++] = c[2] + u[2] * x + v[2] * y;
    }
  }
  return o;
}
// Indices for n rings, with a fan cap at each end.
export function loftIndex(n) {
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < RING; j++) {
    const a = i * RING + j, b = i * RING + (j + 1) % RING, c = a + RING, d = b + RING;
    idx.push(a, c, b, b, c, d);
  }
  const e0 = n * RING, e1 = e0 + 1;
  for (let j = 0; j < RING; j++) {
    idx.push(e0, (j + 1) % RING, j);
    const o = (n - 1) * RING;
    idx.push(e1, o + j, o + (j + 1) % RING);
  }
  return idx;
}
export function loft(sections) {
  const n = sections.length;
  const pos = new Float32Array((n * RING + 2) * 3);
  let o = 0;
  for (const s of sections) o = ringInto(pos, o, s);
  pos.set(sections[0].c, o); pos.set(sections[n - 1].c, o + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(loftIndex(n));
  g.computeVertexNormals();
  return g;
}

/* ---------- textures: drawn once on canvases ---------- */
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
function speckle(g, w, h, n, cols, r0, r1) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[Math.floor(rnd() * cols.length)];
    const r = r0 + rnd() * (r1 - r0);
    g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 7); g.fill();
  }
}
// Packed earth with coal dust and old scale.
const floorTex = () => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#2a241f'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 700, ['rgba(20,17,15,0.35)', 'rgba(52,45,38,0.3)'], 6, 28);
  speckle(g, w, h, 2600, ['rgba(8,8,8,0.6)', 'rgba(60,52,44,0.4)'], 0.6, 2.4);
}, [5, 5]);
// Brick: header and stretcher courses, soot-dark mortar.
const brickTex = (base = ['#4a2a1f', '#3f251c', '#55301f', '#382019'], mortar = '#1d1815') => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = mortar; g.fillRect(0, 0, w, h);
  const bh = 32, bw = 96;
  for (let y = 0; y < h; y += bh) {
    const off = (y / bh) % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      g.fillStyle = base[Math.floor(rnd() * base.length)];
      g.fillRect(x + off + 3, y + 3, bw - 6, bh - 6);
    }
  }
  speckle(g, w, h, 1400, ['rgba(0,0,0,0.25)', 'rgba(255,220,200,0.05)'], 0.6, 3);
});
// Wood grain along x.
const woodTex = (c0 = '#3b2a1e', c1 = '#2c1f16') => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = c0; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    g.fillStyle = rnd() < 0.5 ? c1 : 'rgba(0,0,0,0.12)';
    g.globalAlpha = 0.25 + rnd() * 0.5;
    g.fillRect(0, y + Math.sin(y * 0.3) * 1.5, w, 1 + rnd() * 2);
  }
  g.globalAlpha = 1;
});
// Rough limewash over stone, darkened by soot.
const wallTex = () => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#26221f'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 220, ['rgba(50,44,38,0.18)', 'rgba(12,10,9,0.2)'], 18, 70);
  speckle(g, w, h, 2000, ['rgba(0,0,0,0.3)', 'rgba(255,240,220,0.04)'], 0.5, 2.5);
}, [3, 2]);

/* ---------- materials ---------- */
export function materials() {
  const iron = new THREE.MeshStandardMaterial({ color: 0x2b2c2f, metalness: 0.8, roughness: 0.5 });
  const face = new THREE.MeshStandardMaterial({ color: 0x6d6f73, metalness: 1, roughness: 0.24 });
  const wood = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.85 });
  const wet = new THREE.MeshStandardMaterial({ map: woodTex('#2a1e16', '#1b130e'), roughness: 0.55 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x5a2a17, roughness: 0.5, side: THREE.DoubleSide, vertexColors: true });
  const brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.92 });
  const slab = new THREE.MeshStandardMaterial({ color: 0x252220, roughness: 0.95 });
  const hood = new THREE.MeshStandardMaterial({ color: 0x1d1c1c, metalness: 0.6, roughness: 0.7, side: THREE.DoubleSide });
  const floor = new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.96 });
  const wall = new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.95 });
  const water = new THREE.MeshStandardMaterial({ color: 0x050708, roughness: 0.04, metalness: 0.0 });
  return { iron, face, wood, wet, leather, brick, slab, hood, floor, wall, water };
}

/* ---------- the room ---------- */
export function room(M) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8).rotateX(-Math.PI / 2), M.floor);
  floor.position.set(0, 0, 1.5);
  floor.receiveShadow = true;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.5), M.wall);
  back.position.set(0, 2.25, -1.4);
  back.receiveShadow = true;
  const left = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.5).rotateY(Math.PI / 2), M.wall);
  left.position.set(-2.55, 2.25, 1.1);
  left.receiveShadow = true;
  g.add(floor, back, left);
  // The high window: a cool square of dusk.
  const win = new THREE.Mesh(new THREE.PlaneGeometry(WINDOW.w, WINDOW.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.08, 0.14) }));
  win.position.set(WINDOW.x, WINDOW.y, WINDOW.z + 0.005);
  const bars = new THREE.Group();
  for (const dx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.025, WINDOW.h, 0.02), M.iron);
    b.position.set(WINDOW.x + dx * WINDOW.w / 6, WINDOW.y, WINDOW.z + 0.015);
    bars.add(b);
  }
  g.add(win, bars);
  return g;
}

/* ---------- the hearth: brick body, stone top, the hood ---------- */
export function hearth(M) {
  const g = new THREE.Group();
  const { x, z, w, d, h } = HEARTH;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.06, d), M.brick);
  body.position.set(x, (h - 0.06) / 2, z);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06), M.slab);
  top.position.set(x, h - 0.03, z);
  // The hood: a sheet-iron pyramid over the fire, then the flue.
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.74, 0.72, 4, 1, true).rotateY(Math.PI / 4), M.hood);
  hood.scale.set(1, 1, 0.86);
  hood.position.set(x, 1.86, z - 0.02);
  const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.2, 4, 1, true).rotateY(Math.PI / 4), M.hood);
  flue.position.set(x, 3.3, z - 0.02);
  [body, top, hood, flue].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  hood.castShadow = false;
  g.add(body, top, hood, flue);
  return g;
}

/* ---------- the coal bed: chunks, and the core seen between them ---------- */
const COAL_VS_HEAD = /* glsl */`
attribute float aCore;
varying float vCore;
varying vec3 vWP;
`;
export function coals() {
  const g = new THREE.Group();
  const U = { uCoal: { value: 900 }, uTime: { value: 0 }, uBlast: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 0.75, metalness: 0.0, flatShading: true });
  mat.onBeforeCompile = s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = COAL_VS_HEAD + s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vCore = aCore;
      vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`);
    s.fragmentShader = `uniform float uCoal, uTime, uBlast;\nvarying float vCore;\nvarying vec3 vWP;\n${HEAT}\n${NOISE}\n` + s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // Glow sits in the cracks and on faces turned from the eye.
      float n = vn3(vWP * 70.0 + vec3(0.0, -uTime * (0.6 + 1.2 * uBlast), uTime * 0.3));
      float n2 = vn3(vWP * 23.0 + vec3(uTime * 0.2, 0.0, 0.0));
      float crack = smoothstep(0.45, 0.85, n) * 0.7 + 0.3 * n2;
      float facing = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
      float T = uCoal * mix(0.5, 0.97, vCore) * (0.86 + 0.18 * crack) - (1.0 - vCore) * 120.0 * (1.0 - uBlast);
      // Each face of a chunk glows or not: hot edges, dark crusted tops.
      float face = vn3(floor(vWP * 160.0) + floor(normal * 3.0) * 11.0);
      float glow = pow(crack, 2.0) * (0.35 + 0.65 * smoothstep(0.3, 0.7, face));
      totalEmissiveRadiance = heatRGB(T) * (0.06 + 1.5 * glow) * (0.55 + 0.45 * facing);
      diffuseColor.rgb *= mix(1.0, 0.25, smoothstep(600.0, 900.0, T));`);
  };
  const N = 560;
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const core = new Float32Array(N);
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    // A mound: dense in the middle, a loose rim of fresh coal.
    const r = 0.33 * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
    const hgt = 0.07 * Math.max(0, 1 - (r / 0.3) ** 2);
    p.set(COALS.x + Math.cos(a) * r, COALS.y - 0.025 + hgt * (0.55 + 0.45 * rnd()), COALS.z + Math.sin(a) * r * 0.9);
    e.set(rnd() * 6, rnd() * 6, rnd() * 6);
    q.setFromEuler(e);
    const s = 0.012 + 0.017 * rnd();
    sc.set(s * (0.8 + rnd() * 0.6), s * (0.6 + rnd() * 0.4), s * (0.8 + rnd() * 0.6));
    m4.compose(p, q, sc);
    mesh.setMatrixAt(i, m4);
    core[i] = Math.max(0, 1 - r / 0.27) ** 0.6;
  }
  geo.setAttribute('aCore', new THREE.InstancedBufferAttribute(core, 1));
  mesh.castShadow = false; mesh.receiveShadow = true;
  // The deep bed: the white heart of the fire between the chunks.
  const bedMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: 'varying vec3 vWP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uCoal, uTime, uBlast;\nvarying vec3 vWP;\n${HEAT}\n${NOISE}
      void main() {
        float r = length((vWP.xz - vec2(${COALS.x.toFixed(3)}, ${COALS.z.toFixed(3)})) * vec2(1.0, 1.1));
        float n = vn3(vec3(vWP.xz * 40.0, uTime * (0.5 + uBlast)));
        float T = uCoal * (1.0 - smoothstep(0.05, 0.27, r) * 0.55) * (0.88 + 0.16 * n);
        gl_FragColor = vec4(heatRGB(T) * smoothstep(0.3, 0.2, r), 1.0);
      }`,
  });
  // A low dome, so the glow shows between the chunks from the side too.
  const bed = new THREE.Mesh(new THREE.SphereGeometry(0.29, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), bedMat);
  bed.scale.set(1, 0.17, 0.92);
  bed.position.set(COALS.x, COALS.y - 0.02, COALS.z);
  // Flames: three crossed sheets that lick up while the blast is on.
  const flameMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; varying float vSeed; void main() { vUv = uv; vSeed = position.z * 7.0 + position.x * 3.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uCoal, uTime, uBlast;\nvarying vec2 vUv;\nvarying float vSeed;\n${HEAT}\n${NOISE}
      void main() {
        float y = vUv.y, x = vUv.x - 0.5;
        float sp = 1.6 + 2.2 * uBlast;
        float n = vn3(vec3(x * 7.0 + vSeed, y * 5.0 - uTime * sp, uTime * 0.6)) * 0.65 + vn3(vec3(x * 17.0, y * 11.0 - uTime * sp * 1.6, 3.0)) * 0.35;
        float w = abs(x) * (1.3 + y * 2.2) + (n - 0.5) * 0.42;
        float body = smoothstep(0.42, 0.05, w) * (1.0 - smoothstep(0.15, 0.95, y + (n - 0.5) * 0.55)) * smoothstep(0.0, 0.1, y);
        float T = uCoal + 120.0 - y * 420.0;
        gl_FragColor = vec4(heatRGB(T) * body * (0.04 + 0.5 * uBlast * uBlast) * 0.28, 1.0);
      }`,
  });
  const flames = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.32).translate(0, 0.16, 0), flameMat);
    f.rotation.y = k * Math.PI / 3 + 0.3;
    flames.add(f);
  }
  flames.position.set(COALS.x, COALS.y + 0.01, COALS.z);
  flames.renderOrder = 2;
  g.add(bed, mesh, flames);
  return { g, U };
}

/* ---------- the bellows: two lung-shaped boards and the leather ---------- */
// Half width along the bellows: a narrow neck, a wide round tail.
function lungHW(s) {
  if (s <= 0.72) return 0.035 + 0.205 * Math.sin(Math.PI / 2 * s / 0.72) ** 0.85;
  const k = (s - 0.72) / 0.28;
  return 0.24 * Math.sqrt(Math.max(0, 1 - k * k));
}
function lungOutline(L, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const s = i / n; pts.push([s * L, lungHW(s)]); }
  for (let i = n - 1; i >= 1; i--) { const s = i / n; pts.push([s * L, -lungHW(s)]); }
  return pts;
}
export function bellows(M) {
  const { x, y, z, L } = BELLOWS;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  // Local +x runs from the nozzle to the tail: the nozzle faces the hearth.
  root.rotation.y = BELLOWS.yaw;
  const outline = lungOutline(L);
  const shape = new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)));
  const boardGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 4 }).rotateX(Math.PI / 2);
  const bottom = new THREE.Mesh(boardGeo, M.wood);
  bottom.position.y = -0.035;
  const hinge = new THREE.Group();
  const top = new THREE.Mesh(boardGeo, M.wood);
  top.position.y = 0.028;
  hinge.add(top);
  // A lever handle on the tail of the top board.
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 10), M.wood);
  handle.rotation.z = -1.1;
  handle.position.set(L + 0.08, 0.17, 0);
  hinge.add(handle);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.045, 0.2, 12).rotateZ(Math.PI / 2), M.iron);
  nozzle.position.set(-0.07, 0.0, 0);
  // The tuyere pipe runs on into the hearth's side.
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.3, 12).rotateZ(Math.PI / 2), M.iron);
  pipe.position.set(-0.3, 0.0, 0);
  // Two trestles carry it.
  const legs = new THREE.Group();
  for (const lx of [0.24, 0.62]) for (const lz of [-0.17, 0.17]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, y - 0.06, 0.05), M.wood);
    leg.position.set(lx, -(y - 0.06) / 2 - 0.065, lz);
    legs.add(leg);
  }
  for (const lx of [0.24, 0.62]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.42), M.wood);
    bar.position.set(lx, -0.09, 0);
    legs.add(bar);
  }
  // The leather: rows between the boards, bulging out.
  const ROWS = 9, nO = outline.length;
  const lpos = new Float32Array(nO * ROWS * 3);
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  // The folds: each pleat ridge catches the light, each crease is dark.
  const lcol = new Float32Array(nO * ROWS * 3);
  for (let r = 0; r < ROWS; r++) lcol.fill(r % 2 ? 0.45 : 1, r * nO * 3, (r + 1) * nO * 3);
  lgeo.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  const idx = [];
  for (let r = 0; r < ROWS - 1; r++) for (let i = 0; i < nO; i++) {
    const a = r * nO + i, b = r * nO + (i + 1) % nO;
    idx.push(a, b, a + nO, b, b + nO, a + nO);
  }
  lgeo.setIndex(idx);
  const leather = new THREE.Mesh(lgeo, M.leather);
  leather.frustumCulled = false;
  // Outward normals of the outline, in the board plane.
  const nrm = outline.map((p, i) => {
    const a = outline[(i - 1 + nO) % nO], b = outline[(i + 1) % nO];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    return [-tz / l, tx / l];
  });
  let open = -1;
  // open: the hinge angle in radians; 0.05 shut, 0.3 full.
  function pose(ang) {
    if (Math.abs(ang - open) < 1e-4) return;
    open = ang;
    hinge.rotation.z = ang;
    const c = Math.cos(ang), s = Math.sin(ang);
    let o = 0;
    for (let r = 0; r < ROWS; r++) {
      const t = r / (ROWS - 1);
      for (let i = 0; i < nO; i++) {
        const [px, pz] = outline[i];
        // The point on the top board's lower face, rotated on the hinge.
        const ty = 0.028 - 0.003;
        const tx2 = px * c - ty * s, ty2 = px * s + ty * c;
        const bx = px, by = -0.035 + 0.003;
        // Ridges stand out and creases tuck in, more where the boards gape.
        const gape = (ty2 - by) * (px / L);
        const fold = Math.sin(Math.PI * t) * (0.012 + 0.35 * gape + (r % 2 ? -1 : 1) * (0.004 + 0.08 * gape));
        lpos[o++] = bx + (tx2 - bx) * t + nrm[i][0] * fold;
        lpos[o++] = by + (ty2 - by) * t;
        lpos[o++] = pz + nrm[i][1] * fold;
      }
    }
    lgeo.attributes.position.needsUpdate = true;
    lgeo.computeVertexNormals();
  }
  pose(0.3);
  [bottom, top, handle, leather, nozzle].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  legs.children.forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  root.add(bottom, hinge, nozzle, pipe, legs, leather);
  return { g: root, pose };
}

/* ---------- the anvil on its stump ---------- */
export function anvil(M) {
  const g = new THREE.Group();
  const by = ANVIL.stump;
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
  // The top: heel, face, step, table and horn, lofted along x.
  // Proportions from a 55 lb London-pattern anvil, scaled to 0.74 m.
  const top = [
    [0.33, 0.255, 0.31, 0.045, 0.02],
    [0.315, 0.23, 0.32, 0.05, 0.012],
    [0.24, 0.205, 0.32, 0.05, 0.008],
    [0.12, 0.19, 0.32, 0.05, 0.008],
    [-0.075, 0.19, 0.32, 0.05, 0.008],
    [-0.08, 0.195, 0.3, 0.046, 0.008],
    [-0.14, 0.2, 0.3, 0.045, 0.012],
    [-0.17, 0.215, 0.297, 0.04, 0.04],
    [-0.24, 0.235, 0.293, 0.03, 0.03],
    [-0.31, 0.258, 0.29, 0.018, 0.018],
    [-0.37, 0.276, 0.287, 0.008, 0.008],
    [-0.4, 0.284, 0.286, 0.002, 0.002],
  ].map(([x, y0, y1, hz, r]) => ({ c: [x, (y0 + y1) / 2, 0], u: Z, v: Y, a: hz, b: (y1 - y0) / 2, r }));
  // The waist and feet, lofted along y; the face's top edge stays crisp.
  const body = [
    [0.0, -0.18, 0.26, 0.095, 0.012],
    [0.018, -0.17, 0.25, 0.09, 0.02],
    [0.05, -0.1, 0.17, 0.06, 0.02],
    [0.11, -0.075, 0.13, 0.042, 0.02],
    [0.165, -0.085, 0.15, 0.045, 0.02],
    [0.2, -0.11, 0.2, 0.05, 0.02],
    [0.205, -0.11, 0.2, 0.05, 0.02],
  ].map(([y, x0, x1, hz, r]) => ({ c: [(x0 + x1) / 2, y, 0], u: X, v: Z, a: (x1 - x0) / 2, b: hz, r }));
  const iron = new THREE.Mesh(loft(top), M.iron);
  const waist = new THREE.Mesh(loft(body), M.iron);
  // The face: a polished plate on the top, from heel to step.
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.405, 0.004, 0.096), M.face);
  face.position.set(0.122, 0.3205, 0);
  const a = new THREE.Group();
  a.add(iron, waist, face);
  a.position.set(ANVIL.x, by, ANVIL.z);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, by, 24), M.wood);
  stump.position.set(ANVIL.x + 0.03, by / 2, ANVIL.z);
  [iron, waist, face, stump].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  g.add(a, stump);
  return g;
}
// The face centre in world space, for the bar and the hammer.
export const FACE = new THREE.Vector3(ANVIL.x + 0.05, ANVIL.stump + 0.3225, ANVIL.z);

/* ---------- the trough ---------- */
export function trough(M) {
  const g = new THREE.Group();
  const { x, z, w, d, h, water } = TROUGH;
  const t = 0.035;
  const parts = [
    [w, t, d, 0, t / 2, 0],
    [w, h, t, 0, h / 2, d / 2 - t / 2],
    [w, h, t, 0, h / 2, -d / 2 + t / 2],
    [t, h, d - 2 * t, w / 2 - t / 2, h / 2, 0],
    [t, h, d - 2 * t, -w / 2 + t / 2, h / 2, 0],
  ];
  for (const [sx, sy, sz, px, py, pz] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), M.wet);
    m.position.set(x + px, py, z + pz);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * t, d - 2 * t, 1, 1).rotateX(-Math.PI / 2), M.water);
  surf.position.set(x, water, z);
  surf.receiveShadow = true;
  g.add(surf);
  return { g, surf };
}

/* ---------- the hammer and the tongs ---------- */
export function hammer(M) {
  // Local frame: the handle runs along +x from the head; the face points down.
  const g = new THREE.Group();
  const head = new THREE.Mesh(loft([
    { c: [0, -0.045, 0], u: [1, 0, 0], v: [0, 0, 1], a: 0.0185, b: 0.0185, r: 0.012 },
    { c: [0, -0.04, 0], u: [1, 0, 0], v: [0, 0, 1], a: 0.02, b: 0.02, r: 0.01 },
    { c: [0, 0.02, 0], u: [1, 0, 0], v: [0, 0, 1], a: 0.018, b: 0.018, r: 0.006 },
    { c: [0, 0.045, 0], u: [1, 0, 0], v: [0, 0, 1], a: 0.012, b: 0.018, r: 0.004 },
    { c: [0, 0.062, 0], u: [1, 0, 0], v: [0, 0, 1], a: 0.003, b: 0.017, r: 0.002 },
  ]), M.iron);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.36, 10).rotateZ(Math.PI / 2), M.wood);
  handle.position.set(0.19, 0.005, 0);
  head.castShadow = handle.castShadow = true;
  g.add(head, handle);
  return g;
}
export function tongs(M) {
  // Local frame: the jaws grip at the origin; the reins run along +x.
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.42, 8).rotateZ(Math.PI / 2), M.iron);
    rein.position.set(0.25, s * 0.012, s * 0.016);
    rein.rotation.y = s * 0.035;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.034), M.iron);
    jaw.position.set(-0.012, s * 0.017, 0);
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 12).rotateX(Math.PI / 2), M.iron);
    boss.position.set(0.045, 0, 0);
    [rein, jaw, boss].forEach(m => { m.castShadow = true; g.add(m); });
  }
  return g;
}

/* ---------- the environment: a dim room with a fire and a window ---------- */
export function envMap(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x040302);
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.1, 0.3) }));
  fire.position.set(-3, 0.2, -1.5);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.35, 0.55), side: THREE.DoubleSide }));
  win.position.set(1.5, 3, -3);
  win.lookAt(0, 0, 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.03, 0.02) }));
  floor.position.y = -1.2;
  s.add(fire, win, floor);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.02);
  pm.dispose();
  return rt.texture;
}
