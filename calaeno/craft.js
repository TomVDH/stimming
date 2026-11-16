// Calaeno, her two sisters and their escort: one builder, one material.
// One unit is one metre. x is the right wing, y is up, negative z is the nose.
// Calaeno's plan follows Tom's top view (2026-11-15), at 2 metres per pixel.
// Alcyone and Merope are proposals in the same family.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AIR, AIR_U } from './air.js';

/* ---------- builders ---------- */
const flip = pts => pts.map(([x, z]) => [-x, z]);
// A whole outline from its right half; points on the centre line stay single.
const mirror = pts => [...pts, ...flip(pts).reverse().filter(([x]) => x !== 0)];
const both = list => list.flatMap(([x, ...r]) => [[x, ...r], [-x, ...r]]);
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
// A dome that stands through a body: a disc above and below.
function dome(z, r, h) {
  const g = new THREE.SphereGeometry(1, 28, 14).toNonIndexed();
  g.deleteAttribute('uv');
  g.scale(r, h, r);
  return at(g, 0, 0, z);
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

/* ---------- the three craft ---------- */
// Each spec: panels (outline, thickness, y), bodies (stations, x), domes (z, radius, height),
// engines (x, z at the propeller), lamps, and discs that cast the sun rays.
const NACELLE = [[-190, 1, 1], [-160, 13, 12], [-30, 13, 12], [-4, 7, 7]];
const RED = [9, 0.5, 0.3], GREEN = [0.4, 8, 1.2], WHITE = [9, 9, 9];
const strobe = (x, y, z, ph, c = WHITE, size = 6) => [x, y, z, size, ...c, 1.7, ph, 0.05];
const tips = (x, z) => [[-x, 0, z, 5, ...RED, 1, 0, 1], [x, 0, z, 5, ...GREEN, 1, 0, 1]];

// Calaeno: tandem wings, three bodies, a dome, twelve engines. 3860 m across.
const C_FRONT = [[120, -270], [896, -396], [960, -250], [940, -240], [908, -318], [200, -70]];
const C_RIG = [[-430, 1, 1], [-400, 20, 18], [-330, 22, 20], [-100, 26, 22], [250, 30, 24], [450, 16, 14], [582, 1, 1]];
const C_POD = [[110, 1, 1], [135, 9, 9], [380, 9, 9], [412, 1, 1]];
const CALAENO = {
  span: 3860, spread: 1400,
  panels: [
    [mirror([[0, -250], [300, -260], [1850, 330], [1930, 404], [1920, 460], [520, 180], [210, 275], [0, 250]]), 34, 0],
    [C_FRONT, 22, 6], [flip(C_FRONT), 22, 6],
  ],
  bodies: [
    [[[-530, 1, 1], [-500, 14, 12], [-420, 24, 20], [-330, 44, 28], [-250, 96, 40], [-100, 128, 46], [100, 118, 44], [200, 80, 36], [300, 44, 26], [480, 16, 12], [572, 1, 1]], 0],
    ...both([[450, C_RIG], [1620, C_POD]]).map(([x, st]) => [st, x]),
  ],
  domes: [[-130, 126, 62]],
  engines: both([[330, 30], [640, -110], [240, 350], [760, 304], [1076, 360], [1400, 410]]),
  lamps: [...tips(1925, 430), strobe(0, -6, 572, 0), strobe(-450, -6, 582, 0.12, WHITE, 5), strobe(450, -6, 582, 0.24, WHITE, 5), strobe(0, -62, -130, 0.6, RED)],
  casters: [[0, 0, 0, 300, 60], ...both([[560, 0, 30, 300, 40], [1150, 0, 190, 300, 40], [1680, 0, 370, 220, 40], [520, 0, -260, 280, 40]])],
};

// Alcyone: a crescent wing on two hulls, with a bridge at each end. 3920 m across.
const A_HULL = [[-720, 1, 1], [-680, 22, 18], [-560, 40, 30], [-200, 58, 40], [150, 56, 38], [420, 34, 24], [560, 10, 8], [582, 1, 1]];
const ALCYONE = {
  span: 3920, spread: 1650,
  panels: [
    [mirror([[0, -120], [520, -200], [1300, 60], [1900, 520], [1960, 640], [1880, 680], [1300, 330], [520, 150], [0, 200]]), 36, 0],
    [[[-540, -540], [0, -600], [540, -540], [540, -450], [0, -505], [-540, -450]], 18, 4],
    [[[-540, 440], [540, 440], [620, 540], [-620, 540]], 16, 8],
  ],
  bodies: [
    ...both([[520, A_HULL]]).map(([x, st]) => [st, x]),
    [[[-260, 1, 1], [-200, 40, 26], [60, 60, 34], [240, 30, 20], [300, 1, 1]], 0],
  ],
  domes: [[-20, 92, 46]],
  engines: both([[200, 211], [820, 249], [1080, 309], [1340, 384], [1600, 541]]),
  lamps: [...tips(1950, 650), strobe(-520, -6, 582, 0), strobe(520, -6, 582, 0.2), strobe(0, -46, -20, 0.6, RED)],
  casters: [...both([[520, 0, -100, 260, 50], [300, 0, 40, 300, 40], [950, 0, 170, 330, 40], [1500, 0, 400, 300, 40]]), [0, 0, -520, 300, 30]],
};

// Merope: two wings joined at their tips round one long hull. 3100 m across.
const M_FRONT = [[60, -480], [1500, 80], [1500, 180], [60, -330]];
const M_REAR = [[60, 520], [1500, 110], [1500, 215], [60, 690]];
const MEROPE = {
  span: 3100, spread: 1250,
  panels: [[M_FRONT, 28, 6], [flip(M_FRONT), 28, 6], [M_REAR, 28, -6], [flip(M_REAR), 28, -6]],
  bodies: [
    [[[-900, 1, 1], [-860, 18, 16], [-700, 46, 34], [-300, 70, 46], [300, 72, 46], [650, 44, 30], [820, 12, 10], [852, 1, 1]], 0],
    ...both([[1500, [[-30, 1, 1], [10, 22, 18], [240, 22, 18], [300, 1, 1]]]]).map(([x, st]) => [st, x]),
  ],
  domes: [[60, 112, 58]],
  engines: both([[300, 632], [600, 534], [900, 436], [1200, 338], [450, -162], [900, -3]]),
  lamps: [...tips(1500, 300), strobe(0, -6, 852, 0), strobe(0, -58, 60, 0.6, RED), strobe(0, -10, -900, 0.3, WHITE, 5)],
  casters: [[0, 0, -200, 260, 60], [0, 0, 400, 260, 60], ...both([[450, 0, -280, 260, 40], [1000, 0, -60, 280, 40], [450, 0, 520, 260, 40], [1000, 0, 320, 280, 40], [1500, 0, 150, 160, 40]])],
};

export const CRAFT = { calaeno: CALAENO, alcyone: ALCYONE, merope: MEROPE };

/* ---------- the escort: a delta dart, 58 m long ---------- */
const E_WING = mirror([[2.4, -9], [20, 15], [20, 19.5], [2.4, 18]]);
const E_TAIL = mirror([[2, 19], [9.5, 27], [9.5, 30], [2, 26.5]]);
const E_HULL = [[-30, 0.2, 0.2], [-24, 1.5, 1.3], [-8, 2.6, 2.2], [14, 2.9, 2.3], [26, 2.3, 1.9], [28, 0.3, 0.3]];
const E_FIN = [[0, 14], [0, 26], [7.5, 29], [7.5, 23]];
const escortGeometry = () => mergeGeometries([
  panel(E_WING, 1.1), panel(E_TAIL, 0.7), loft(E_HULL, 12),
  fin(E_FIN, 0.5, 2.4, 1, 0.42), fin(E_FIN, 0.5, -2.4, 1, 0.42),
]);

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
uniform float uMark;
${AIR}
void main() {
  vec3 N = normalize(vWN), V = normalize(cameraPosition - vWP);
  if (!gl_FrontFacing) N = -N;
  // The escort has a hot nose; a big craft is one pale grey.
  vec3 alb = uMark > 0.5 ? uPaint : mix(uPaint, uAccent, step(vL.z, -19.0));
  // The belly sees the ground; the back sees the sky.
  vec3 amb = mix(uHorC * 0.22, uZenC * 0.3 + uHorC * 0.3, smoothstep(-1.0, 1.0, N.y));
  vec3 col = alb * (amb + uSunC * max(dot(N, uSun), 0.0));
  // Against the sun, the edges catch a thin line of light.
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  float back = pow(max(dot(-V, uSun), 0.0), 6.0);
  col += uSunC * fr * (0.02 + 0.45 * back);
  vec3 H = normalize(uSun + V);
  col += uSunC * 0.3 * pow(max(dot(N, H), 0.0), 60.0);
  gl_FragColor = vec4(caAir(col, vWP, 1.0), 1.0);
}`;
const lin = (r, g, b) => ({ value: new THREE.Vector3(r, g, b) });
function craftMaterial(mark) {
  return new THREE.ShaderMaterial({
    uniforms: { ...AIR_U, uPaint: lin(0.4, 0.42, 0.45), uAccent: lin(0.85, 0.16, 0.03), uMark: { value: mark } },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    // Transparent for the draw order: the craft draws after the contrails.
    transparent: true, depthWrite: true,
  });
}

/* ---------- propellers: two rows that turn against each other ---------- */
// Each propeller is one disc behind its nacelle; the shader draws its blades.
// aHub holds the disc's centre and its turn: 1 or -1.
const PROP_R = 62;
function propGeometry(engines) {
  return mergeGeometries(engines.map(([x, z], i) => {
    const g = at(new THREE.CircleGeometry(PROP_R, 32), x, -14, z + 4);
    const n = g.attributes.position.count, hub = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) hub.set([x, -14, i % 2 ? -1 : 1], v * 3);
    g.setAttribute('aHub', new THREE.BufferAttribute(hub, 3));
    return g;
  }));
}
function propMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...AIR_U },
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`
    attribute vec3 aHub;
    varying vec3 vWP, vHub;
    varying vec2 vQ;
    void main() {
      vQ = (position.xy - aHub.xy) / ${PROP_R.toFixed(1)};
      vHub = aHub;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWP = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
    fragmentShader: /* glsl */`
    varying vec3 vWP, vHub;
    varying vec2 vQ;
    ${AIR}
    // A scimitar blade's half chord at radius r, in disc radii.
    // It is widest past mid span and rounds off at the tip.
    float chord(float r) { return 0.058 * (0.45 + 1.7 * r * (1.25 - r)) * smoothstep(1.0, 0.86, r); }
    // One row of six blades. turn is 1 or -1; a is the angle at this pixel.
    // Six taps trail each blade with a short smear of motion.
    float row(float a, float r, float turn, float t) {
      // The blades curve back toward their tips.
      float base = a - turn * (t + 0.75 * r * r);
      float w = chord(r) * 6.0 / (6.2832 * max(r, 0.05));
      float acc = 0.0;
      for (int i = 0; i < 6; i++) {
        float d = abs(fract((base + turn * float(i) * 0.03) * 6.0 / 6.2832) - 0.5);
        acc += smoothstep(0.5 - w - 0.015, 0.5 - w + 0.015, d) * (1.0 - 0.16 * float(i));
      }
      return min(acc / 2.6, 1.0);
    }
    void main() {
      float r = length(vQ), a = atan(vQ.y, vQ.x);
      if (r > 1.0) discard;
      // Each engine starts at its own angle.
      float t = uTime * 2.4 + vHub.x * 0.017;
      float span = smoothstep(0.13, 0.17, r);
      float front = row(a, r, vHub.z, t) * span, rear = row(a + 0.5, r, -vHub.z, t * 0.86) * span;
      float hub = smoothstep(0.16, 0.13, r);
      // A faint disc of blur, the rear row, the front row, then the spinner.
      float al = 0.05 * smoothstep(1.0, 0.92, r);
      al = al + (1.0 - al) * 0.8 * rear;
      al = al + (1.0 - al) * 0.95 * front;
      al = max(al, hub);
      // Graphite blades with pale tips; the front row sits in more light.
      vec3 paint = mix(vec3(0.03, 0.032, 0.038), vec3(0.5, 0.46, 0.3), smoothstep(0.86, 0.9, r) * (1.0 - hub));
      paint *= mix(0.6, 1.0, front);
      // The spinner is a pale cone with a soft glint.
      paint = mix(paint, vec3(0.3, 0.31, 0.33) * (0.6 + 0.8 * smoothstep(0.14, 0.0, length(vQ - vec2(-0.04, 0.05)))), hub);
      // Each blade flashes as it turns through the sun's side.
      float glint = pow(max(cos(a - 2.2), 0.0), 10.0) * front;
      vec3 col = paint * (uHorC * 0.5 + uZenC * 0.4 + uSunC * (0.05 + 0.5 * glint));
      gl_FragColor = vec4(caAir(col, vWP, 1.0) * al, al);
    }`,
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

// One big craft from its spec: the mesh, the propellers, the lamps.
// heads holds each engine's propeller hub: a contrail starts there.
export function makeCraft(spec, uPx) {
  const group = new THREE.Group();
  const parts = [
    ...spec.panels.map(([pts, t, y]) => panel(pts, t, y)),
    ...spec.bodies.map(([st, x]) => at(loft(st, x === 0 ? 20 : 12), x, 0, 0)),
    ...spec.domes.map(([z, r, h]) => dome(z, r, h)),
    // The nacelles hang under the wings.
    ...spec.engines.map(([x, z]) => at(loft(NACELLE, 10), x, -14, z)),
  ];
  const mesh = new THREE.Mesh(mergeGeometries(parts), craftMaterial(1));
  const props = new THREE.Mesh(propGeometry(spec.engines), propMaterial());
  mesh.frustumCulled = props.frustumCulled = false;
  const lights = lamps(spec.lamps, uPx);
  group.add(mesh, props, lights);
  return {
    group, mesh, props, lights, span: spec.span, spread: spec.spread, casters: spec.casters,
    heads: spec.engines.map(([x, z]) => new THREE.Vector3(x, -14, z + 4)),
    // True where the craft blocks a ray through local x, z.
    shade(x, z) {
      if (spec.bodies.some(([st, bx]) => Math.abs(x - bx) < widthAt(st, z))) return true;
      if (spec.domes.some(([dz, r]) => Math.hypot(x, z - dz) < r)) return true;
      return spec.panels.some(([pts]) => inside(pts, x, z));
    },
  };
}

// The escorts share one geometry and one material.
let escGeo = null, escMat = null;
export function makeEscort(uPx) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(escGeo ??= escortGeometry(), escMat ??= craftMaterial(0));
  mesh.frustumCulled = false;
  const lights = lamps([
    [-20, 0, 19, 3, ...RED, 1, 0, 1], [20, 0, 19, 3, ...GREEN, 1, 0, 1],
    [0, -2.5, 4, 4, ...WHITE, 1.1, 0.4, 0.07],
  ], uPx);
  group.add(mesh, lights);
  return { group, mesh, lights, head: new THREE.Vector3(0, 0, 30) };
}
