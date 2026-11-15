// Calaeno and her escort: two airframes, one material.
// One unit is one metre. x is the right wing, y is up, negative z is the nose.
// Calaeno's plan follows Tom's top view (2026-11-15), at 2 metres per pixel:
// tandem wings, three bodies, a dome, twelve pusher engines.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AIR, AIR_U } from './air.js';

/* ---------- builders ---------- */
const flip = pts => pts.map(([x, z]) => [-x, z]);
// A whole outline from its right half; points on the centre line stay single.
const mirror = pts => [...pts, ...flip(pts).reverse().filter(([x]) => x !== 0)];
// A flat panel from a planform outline, t metres thick, centred on y.
// The bevel thins the edges, as on a wing.
function panel(pts, t, y = 0) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))), {
    depth: t * 0.4, bevelEnabled: true, bevelThickness: t * 0.3, bevelSize: t * 0.9, bevelOffset: -t * 0.9, bevelSegments: 2, steps: 1,
  });
  // The outline's y turns to z; the depth turns to negative y.
  g.rotateX(Math.PI / 2);
  g.translate(0, y + t * 0.2, 0);
  g.deleteAttribute('uv');
  return g;
}
// A body of elliptical sections. Each station: z, half width, half height.
function loft(st, seg = 16) {
  const pos = [], idx = [];
  for (const [z, w, h] of st) for (let i = 0; i < seg; i++) {
    const a = i / seg * Math.PI * 2;
    pos.push(Math.cos(a) * w, Math.sin(a) * h, z);
  }
  for (let s = 0; s < st.length - 1; s++) for (let i = 0; i < seg; i++) {
    const a = s * seg + i, b = s * seg + (i + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}
const at = (g, x, y, z) => g.translate(x, y, z);
// A fin: a panel stood up, then leaned out by cant radians.
function fin(pts, t, x, y, cant) {
  const g = panel(pts, t);
  g.rotateZ(Math.PI / 2 - Math.sign(x) * cant);
  return at(g, x, y, 0);
}
// The half width of a loft at z, for the shade test.
function widthAt(st, z) {
  for (let i = 1; i < st.length; i++) if (z <= st[i][0]) {
    const [z0, w0] = st[i - 1], [z1, w1] = st[i];
    return z < z0 ? 0 : w0 + (w1 - w0) * (z - z0) / (z1 - z0);
  }
  return 0;
}
function inside(poly, x, z) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/* ---------- Calaeno: 3860 m across, 1100 m long ---------- */
// The main wing: swept 21 degrees, with clipped tips.
const MAIN = mirror([[0, -250], [300, -260], [1850, 330], [1930, 404], [1920, 460], [520, 180], [210, 275], [0, 250]]);
// The front wing sweeps forward; each tip turns back into a winglet.
const FRONT = [[120, -270], [896, -396], [960, -250], [940, -240], [908, -318], [200, -70]];
const HULL = [[-530, 1, 1], [-500, 14, 12], [-420, 24, 20], [-330, 44, 28], [-250, 96, 40], [-100, 128, 46], [100, 118, 44], [200, 80, 36], [300, 44, 26], [480, 16, 12], [572, 1, 1]];
// Two outrigger bodies run from the front wing to the tail.
const RIG_X = 450;
const RIG = [[-430, 1, 1], [-400, 20, 18], [-330, 22, 20], [-100, 26, 22], [250, 30, 24], [450, 16, 14], [582, 1, 1]];
// Each pusher engine: x, then z at its propeller.
const ENGINES = [[330, 30], [640, -110], [240, 350], [760, 304], [1076, 360], [1400, 410]].flatMap(([x, z]) => [[x, z], [-x, z]]);
const NACELLE = [[-190, 1, 1], [-160, 13, 12], [-30, 13, 12], [-4, 7, 7]];
const TIP_X = 1620;
const TIP_POD = [[110, 1, 1], [135, 9, 9], [380, 9, 9], [412, 1, 1]];
// The dome stands through the hull: a disc above and below.
const DOME = { z: -130, r: 126, h: 62 };
// Six plume heads: each stands for a pair of engines.
const HEADS = [[285, 360], [700, 312], [1240, 392]].flatMap(([x, z]) => [[x, z], [-x, z]]);

function calaenoGeometry() {
  const dome = new THREE.SphereGeometry(1, 28, 14).toNonIndexed();
  dome.deleteAttribute('uv');
  dome.scale(DOME.r, DOME.h, DOME.r);
  const parts = [
    panel(MAIN, 34), panel(FRONT, 22, 6), panel(flip(FRONT), 22, 6),
    loft(HULL, 20), at(dome, 0, 0, DOME.z),
    at(loft(RIG), RIG_X, 0, 0), at(loft(RIG), -RIG_X, 0, 0),
    at(loft(TIP_POD, 10), TIP_X, 0, 0), at(loft(TIP_POD, 10), -TIP_X, 0, 0),
  ];
  // The nacelles hang under the wings.
  for (const [x, z] of ENGINES) parts.push(at(loft(NACELLE, 10), x, -14, z));
  return mergeGeometries(parts);
}
// Each propeller is a blur: one thin disc behind its nacelle.
function propGeometry() {
  return mergeGeometries(ENGINES.map(([x, z]) => at(new THREE.CircleGeometry(62, 24), x, -14, z + 4)));
}

/* ---------- the escort: a delta dart, 58 m long ---------- */
const E_WING = mirror([[2.4, -9], [20, 15], [20, 19.5], [2.4, 18]]);
const E_TAIL = mirror([[2, 19], [9.5, 27], [9.5, 30], [2, 26.5]]);
const E_HULL = [[-30, 0.2, 0.2], [-24, 1.5, 1.3], [-8, 2.6, 2.2], [14, 2.9, 2.3], [26, 2.3, 1.9], [28, 0.3, 0.3]];
const E_FIN = [[0, 14], [0, 26], [7.5, 29], [7.5, 23]];

function escortGeometry() {
  return mergeGeometries([
    panel(E_WING, 1.1), panel(E_TAIL, 0.7), loft(E_HULL, 12),
    fin(E_FIN, 0.5, 2.4, 1, 0.42), fin(E_FIN, 0.5, -2.4, 1, 0.42),
  ]);
}

/* ---------- material ---------- */
const VERT = /* glsl */`
varying vec3 vWP, vWN, vL;
void main() {
  vL = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWP = w.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */`
varying vec3 vWP, vWN, vL;
uniform vec3 uPaint, uAccent;
uniform float uMark, uAlpha;
${AIR}
void main() {
  vec3 N = normalize(vWN), V = normalize(cameraPosition - vWP);
  if (!gl_FrontFacing) N = -N;
  // The escort has a hot nose; Calaeno is one pale grey.
  vec3 alb = uMark > 0.5 ? uPaint : mix(uPaint, uAccent, step(vL.z, -19.0));
  // The belly sees the ground; the back sees the sky.
  vec3 amb = mix(uHorC * 0.22, uZenC * 0.5 + uHorC * 0.5, smoothstep(-1.0, 1.0, N.y));
  vec3 col = alb * (amb + uSunC * max(dot(N, uSun), 0.0));
  // Against the sun, the edges catch a thin line of light.
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  float back = pow(max(dot(-V, uSun), 0.0), 6.0);
  col += uSunC * fr * (0.02 + 0.45 * back);
  vec3 H = normalize(uSun + V);
  col += uSunC * 0.3 * pow(max(dot(N, H), 0.0), 60.0);
  gl_FragColor = vec4(caAir(col, vWP, 1.0) * uAlpha, uAlpha);
}`;

const lin = (r, g, b) => ({ value: new THREE.Vector3(r, g, b) });
// alpha below 1 makes a see-through part: a propeller's blur.
function craftMaterial(mark, alpha = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { ...AIR_U, uPaint: alpha < 1 ? lin(0.02, 0.022, 0.026) : lin(0.4, 0.42, 0.45), uAccent: lin(0.85, 0.16, 0.03), uMark: { value: mark }, uAlpha: { value: alpha } },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    // Transparent for the draw order: the craft draws after the plumes.
    transparent: true, depthWrite: alpha >= 1,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

/* ---------- lamps: tip lamps and strobes ---------- */
// Each lamp: x, y, z, size, r, g, b, period in seconds, phase, share lit.
function lamps(list, uPx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap(l => l.slice(0, 3)), 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(list.map(l => l[3]), 1));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(list.flatMap(l => l.slice(4, 7)), 3));
  g.setAttribute('aBlink', new THREE.Float32BufferAttribute(list.flatMap(l => l.slice(7, 10)), 3));
  const m = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { ...AIR_U, uPx },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
    attribute float aSize; attribute vec3 aCol, aBlink;
    uniform float uPx, uTime;
    varying vec3 vCol;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      // A steady lamp has a full share; a strobe is lit for its share.
      float on = aBlink.z >= 1.0 ? 1.0 : step(fract(uTime / aBlink.x + aBlink.y), aBlink.z);
      vCol = aCol * on;
      gl_Position = projectionMatrix * viewMatrix * w;
      gl_PointSize = aSize * uPx;
    }`,
    fragmentShader: /* glsl */`
    varying vec3 vCol;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      gl_FragColor = vec4(vCol * exp(-d * d * 5.0) * smoothstep(1.0, 0.7, d), 1.0);
    }`,
  }));
  m.frustumCulled = false;
  return m;
}

const RED = [9, 0.5, 0.3], GREEN = [0.4, 8, 1.2], WHITE = [9, 9, 9];

// Calaeno: the mesh, the propellers, the lamps, the plume heads, the shade tests.
export function makeCalaeno(uPx) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(calaenoGeometry(), craftMaterial(1));
  const props = new THREE.Mesh(propGeometry(), craftMaterial(1, 0.3));
  mesh.frustumCulled = props.frustumCulled = false;
  const lights = lamps([
    [-1925, 0, 430, 5, ...RED, 1, 0, 1], [1925, 0, 430, 5, ...GREEN, 1, 0, 1],
    // Strobes: the three tails, the belly under the dome.
    [0, -6, 572, 6, ...WHITE, 1.7, 0, 0.05], [-RIG_X, -6, 582, 5, ...WHITE, 1.7, 0.12, 0.05], [RIG_X, -6, 582, 5, ...WHITE, 1.7, 0.24, 0.05],
    [0, -DOME.h, DOME.z, 6, ...RED, 1.7, 0.6, 0.08],
  ], uPx);
  group.add(mesh, props, lights);
  const frontL = flip(FRONT);
  return {
    group, mesh, props, lights, span: 3860,
    // The plume heads sit just behind the propellers.
    heads: HEADS.map(([x, z]) => new THREE.Vector3(x, -14, z)),
    // True where the craft blocks a ray through local x, z.
    shade(x, z) {
      const ax = Math.abs(x);
      if (ax < widthAt(HULL, z) || Math.abs(ax - RIG_X) < widthAt(RIG, z)) return true;
      if (Math.hypot(x, z - DOME.z) < DOME.r) return true;
      return inside(MAIN, x, z) || inside(FRONT, x, z) || inside(frontL, x, z);
    },
    // Shadow casters for the sun rays: x, y, z, across radius, upright radius.
    casters: [
      [0, 0, 0, 300, 60],
      ...[[560, 30, 300], [1150, 190, 300], [1680, 370, 220], [520, -260, 280]].flatMap(([x, z, r]) => [[x, 0, z, r, 40], [-x, 0, z, r, 40]]),
    ],
  };
}

// The escort: the mesh, the lamps and one plume head.
export function makeEscort(uPx) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(escortGeometry(), craftMaterial(0));
  mesh.frustumCulled = false;
  const lights = lamps([
    [-20, 0, 19, 3, ...RED, 1, 0, 1], [20, 0, 19, 3, ...GREEN, 1, 0, 1],
    [0, -2.5, 4, 4, ...WHITE, 1.1, 0.4, 0.07],
  ], uPx);
  group.add(mesh, lights);
  return { group, mesh, lights, heads: [new THREE.Vector3(0, 0, 30)] };
}
