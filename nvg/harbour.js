// Harbour at 3 a.m.: a quay, moored yachts, breakwaters, a far town and a lighthouse.
// Water absorbs the near infrared, so it reads black except for reflections.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise2D } from 'simplex-noise';
import { rng, lerp, smooth, makeAir, fogify, buildSky, buildStars, Emitters, lambert, FOG_GLSL } from './atmos.js';

const R = rng(31415);
const n2 = createNoise2D(rng(11));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// The far shore wanders around 1.5 km out.
const coastZ = x => -1500 - 160 * n2(x / 900, 0.3) - 50 * n2(x / 210, 4.1);
function shoreHeight(x, z) {
  const c = coastZ(x);
  if (z > c) return -2;
  const back = c - z;
  let h = smooth(0, 260, back) * (40 + 90 * (0.5 + 0.5 * n2(x / 700, 2.2))) + 14 * n2(x / 120, z / 120);
  // The lighthouse headland juts out on the left.
  h += 70 * Math.exp(-(((x + 700) / 240) ** 2) - (((z - coastZ(-700) + 60) / 160) ** 2));
  return Math.max(h, smooth(0, 30, back) * 3);
}

/* ---------- water ---------- */
function buildWater(air) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...air, tRefl: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uStreak: { value: 1.4 }, uTime: { value: 0 }, uMoon: { value: new THREE.Vector3(0, 1, 0) }, uMoonI: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tRefl;
      uniform vec2 uRes;
      uniform float uStreak, uTime, uMoonI;
      uniform vec3 uMoon;
      varying vec3 vW;
      float gh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      ${FOG_GLSL}
      // Deep-water waves: speed follows wavelength.
      vec2 waves(vec2 p, float fade) {
        vec2 g = vec2(0.0);
        for (int i = 0; i < 7; i++) {
          float fi = float(i);
          float a = fi * 2.17 + 0.6;
          vec2 dir = vec2(cos(a), sin(a));
          float k = 0.35 * pow(1.55, fi);
          float amp = 0.12 / pow(1.62, fi);
          float ph = dot(dir, p) * k - uTime * sqrt(9.8 * k) + fi * 1.3;
          g += dir * k * amp * cos(ph) * mix(1.0, fade, smoothstep(0.0, 6.0, fi));
        }
        return g;
      }
      void main() {
        vec3 toCam = cameraPosition - vW;
        float dist = length(toCam);
        vec3 Vd = toCam / dist;
        // Fine ripples fade with distance to keep the far water calm.
        float fade = 1.0 - smoothstep(30.0, 400.0, dist);
        vec2 g = waves(vW.xz, fade) * (0.55 + 0.45 * fade);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, Vd), 0.0), 5.0);
        vec2 suv = gl_FragCoord.xy / uRes;
        // Wave slopes stretch reflections into tall columns.
        vec2 off = vec2(N.x * 0.25, N.z * 1.0) * uStreak * 0.18;
        vec3 refl = texture2D(tRefl, clamp(suv + off, 0.001, 0.999)).rgb;
        vec3 body = applyFog(vec3(0.04), cameraPosition, vW);
        // Moon glitter: capillary facets flash where they mirror the moon.
        vec2 gp = vW.xz * 5.0;
        vec2 cell = floor(gp);
        float tick = floor(uTime * 4.0 + gh(cell) * 4.0);
        vec2 jit = vec2(gh(cell + tick), gh(cell.yx + tick + 7.0)) - 0.5;
        vec3 Nf = normalize(N + vec3(jit.x, 0.0, jit.y) * 0.2 * fade);
        // Each facet is a small round flash, not a square.
        float dot2 = smoothstep(0.5, 0.15, length(fract(gp) - 0.5));
        float spec = pow(max(dot(reflect(-Vd, Nf), uMoon), 0.0), 900.0) * uMoonI * mix(1.0, dot2, fade);
        float T = exp(-fogDepth(cameraPosition, vW));
        gl_FragColor = vec4(refl * F + body * (1.0 - F) + vec3(spec * F * T), 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1).rotateX(-Math.PI / 2), mat);
  m.frustumCulled = false;
  return m;
}

/* ---------- boats ---------- */
// Hull from stations: fine bow, round bilge, sheer rising forward, flat transom.
// Waterline is y = 0; the bow points to -z; a dark boot stripe rides the waterline.
function hullGeo(L, B, D, paint = 0.78) {
  const NS = 28, NP = 12, pos = [], col = [], idx = [];
  const half = u => (u < 0.62 ? Math.pow(Math.sin((u / 0.62) * Math.PI / 2), 0.75) : 1 - 0.14 * ((u - 0.62) / 0.38) ** 2) * B / 2;
  const sheer = u => D + 0.38 * (1 - u) ** 2;
  const keel = u => -0.45 * Math.pow(Math.sin(Math.min(1, u * 1.05) * Math.PI), 0.45) - 0.05;
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, z = -L / 2 + u * L, w = Math.max(0.02, half(u)), top = sheer(u), bot = keel(u);
    for (let j = 0; j <= NP; j++) {
      const ph = (j / NP - 0.5) * Math.PI;
      const x = w * Math.sin(ph), y = bot + (top - bot) * Math.pow(Math.abs(Math.sin(ph)), 2.4);
      pos.push(x, y, z);
      const a = y > -0.04 && y < 0.16 ? 0.16 : paint;
      col.push(a, a, a);
    }
  }
  const row = NP + 1;
  for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) {
    const a = i * row + j, b = a + row;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // Deck: a strip between the two sheer lines.
  const d0 = pos.length / 3;
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, z = -L / 2 + u * L, w = Math.max(0.02, half(u)) * 0.98, top = sheer(u) - 0.02;
    pos.push(-w, top, z, w, top, z);
    col.push(paint * 0.8, paint * 0.8, paint * 0.8, paint * 0.8, paint * 0.8, paint * 0.8);
    if (i) { const a = d0 + (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  // Transom: a fan over the stern section.
  const c0 = pos.length / 3, sz = L / 2;
  pos.push(0, (sheer(1) + keel(1)) / 2, sz);
  col.push(paint, paint, paint);
  for (let j = 0; j <= NP; j++) {
    const k = NS * row + j;
    pos.push(pos[k * 3], pos[k * 3 + 1], sz);
    col.push(paint, paint, paint);
    if (j) idx.push(c0, c0 + j, c0 + j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const HULL = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });

function rod(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 5, 1), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

const M = {
  gel: lambert(0.78), deck: lambert(0.55), dark: lambert(0.12), cover: lambert(0.42), metal: lambert(0.5),
  wire: lambert(0.62), paint: lambert(0.24), house: lambert(0.7), rope: lambert(0.5),
};

function buildYacht(L) {
  const B = L * 0.32, g = new THREE.Group(), free = 1.1;
  g.add(new THREE.Mesh(hullGeo(L, B, free), HULL));
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(B * 0.55, 0.55, L * 0.34), M.deck);
  cabin.position.set(0, free + 0.4, L * 0.02);
  g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(B * 0.56, 0.14, L * 0.26), M.dark);
  glass.position.set(0, free + 0.45, L * 0.02);
  g.add(glass);
  const H = L * 1.35 + R() * 2;
  const mastZ = -L * 0.12;
  const foot = V(0, free, mastZ), top = V(0, free + H, mastZ);
  g.add(rod(foot, top, 0.07, M.metal));
  // A sail cover rides on the boom.
  const boom = rod(V(0, free + 1.4, mastZ), V(0, free + 1.4, mastZ + L * 0.42), 0.05, M.metal);
  g.add(boom);
  const cov = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, L * 0.34, 3, 6), M.cover);
  cov.rotation.x = Math.PI / 2;
  cov.position.set(0, free + 1.62, mastZ + L * 0.21);
  g.add(cov);
  // Standing rigging: forestay, backstay, two shrouds.
  g.add(rod(top, V(0, free + 0.2, -L / 2 + 0.3), 0.012, M.wire));
  g.add(rod(top, V(0, free + 0.2, L / 2 - 0.2), 0.012, M.wire));
  g.add(rod(V(0, free + H * 0.98, mastZ), V(B * 0.42, free + 0.1, mastZ + 0.4), 0.012, M.wire));
  g.add(rod(V(0, free + H * 0.98, mastZ), V(-B * 0.42, free + 0.1, mastZ + 0.4), 0.012, M.wire));
  // A pulpit rail at the bow.
  g.add(rod(V(-B * 0.2, free + 0.75, -L / 2 + 0.6), V(B * 0.2, free + 0.75, -L / 2 + 0.6), 0.02, M.metal));
  return { g, top, cabinY: free + 0.45, L, B };
}

function buildFisher() {
  const L = 19, B = 5.6, g = new THREE.Group();
  g.add(new THREE.Mesh(hullGeo(L, B, 2.1, 0.3), HULL));
  const bulwark = new THREE.Mesh(new THREE.BoxGeometry(B * 0.86, 0.5, L * 0.55), M.paint);
  bulwark.position.set(0, 2.25, L * 0.12);
  g.add(bulwark);
  const wh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 4.2), M.house);
  wh.position.set(0, 3.2, -L * 0.18);
  g.add(wh);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.18, 4.5), M.house);
  roof.position.set(0, 4.45, -L * 0.18);
  g.add(roof);
  const mast = V(0, 4.5, -L * 0.18 + 0.8), mtop = V(0, 11.5, -L * 0.18 + 0.8);
  g.add(rod(mast, mtop, 0.1, M.metal));
  g.add(rod(V(-1.4, 9, mtop.z), V(1.4, 9, mtop.z), 0.06, M.metal));
  // A gantry over the stern.
  g.add(rod(V(-2.2, 2.2, L * 0.42), V(-2.2, 7, L * 0.42), 0.12, M.metal));
  g.add(rod(V(2.2, 2.2, L * 0.42), V(2.2, 7, L * 0.42), 0.12, M.metal));
  g.add(rod(V(-2.2, 7, L * 0.42), V(2.2, 7, L * 0.42), 0.12, M.metal));
  g.add(rod(mtop, V(0, 7, L * 0.42), 0.02, M.wire));
  g.add(rod(mtop, V(0, 2.4, -L / 2 + 0.5), 0.02, M.wire));
  return { g, L, B, mtop, windows: [V(-1.2, 3.6, -L * 0.18 - 2.12), V(0, 3.6, -L * 0.18 - 2.12), V(1.2, 3.6, -L * 0.18 - 2.12)], flood: V(0, 8.6, mtop.z + 0.4) };
}

function buildGull() {
  const g = new THREE.Group(), w = lambert(0.8);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 3, 6), w);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const wings = [-1, 1].map(sx => {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.22), w);
    m.position.x = sx * 0.33;
    piv.add(m);
    g.add(piv);
    return piv;
  });
  return { g, wings };
}

/* ---------- lighthouse beams ---------- */
function buildBeams(air) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...air, uLen: { value: 1500 }, uGain: { value: 1.6 } },
    vertexShader: /* glsl */`
      varying vec3 vW, vL, vN;
      void main() {
        vL = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uLen, uGain;
      varying vec3 vW, vL, vN;
      ${FOG_GLSL}
      void main() {
        // Local y runs along the beam from the lamp.
        float along = clamp(vL.y / uLen, 0.0, 1.0);
        vec3 Vd = normalize(cameraPosition - vW);
        // Silhouette edges fade, so the cone reads as a soft shaft.
        float edge = abs(dot(normalize(vN), Vd));
        float spread = 1.0 / (0.15 + along * 6.0);
        // Only haze makes a beam visible.
        float haze = uFog.x * exp(-uFog.y * abs(vW.y)) + uFog.z * 40.0;
        float T = exp(-fogDepth(cameraPosition, vW));
        float v = uGain * edge * spread * (1.0 - smoothstep(0.7, 1.0, along)) * smoothstep(0.0, 0.02, along) * haze * 400.0 * T;
        gl_FragColor = vec4(vec3(v), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const geo = new THREE.CylinderGeometry(85, 1.6, 1500, 28, 1, true);
  geo.translate(0, 750, 0);
  // Two beams back to back on one turning head.
  const head = new THREE.Group();
  for (const s of [1, -1]) {
    const b = new THREE.Mesh(geo, mat);
    b.rotation.z = s * Math.PI / 2;
    b.frustumCulled = false;
    head.add(b);
  }
  return { head, mat };
}

/* ---------- scene ---------- */
export function buildHarbour() {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 6000);
  const air = makeAir();
  // Sea haze: a dense layer over the water and a tall thin veil.
  air.uFog.value.set(0.0045, 0.2, 0.00032, 1 / 500);
  air.uFogCol.value.setScalar(5.2);
  air.uFogGlow.value.set(-0.1, 0.9, 0.45);
  air.uSky.value.set(6.8, 1.5, 6.0, 0.36);

  root.add(new THREE.HemisphereLight(new THREE.Color(1, 1, 1), new THREE.Color(0.12, 0.12, 0.12), 26));
  // A low waning moon to the right lights hull sides and lays a glitter path.
  const MOON = V(0.62, 0.2, -0.76).normalize();
  const moonLight = new THREE.DirectionalLight(0xffffff, 11);
  moonLight.position.copy(MOON).multiplyScalar(100);
  root.add(moonLight, moonLight.target);
  root.add(buildSky(air));
  const stars = buildStars(air, R);
  root.add(stars);
  const water = buildWater(air);
  scene.add(water);
  const emit = new Emitters(640, air);
  root.add(emit.points);
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), up = V(0, 1, 0);

  /* quay under the viewer */
  const quay = new THREE.Mesh(new THREE.BoxGeometry(80, 6, 16), lambert(0.34));
  quay.position.set(-28, -0.8, 6.5);
  root.add(quay);
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(80, 0.25, 0.5), lambert(0.5));
  kerb.position.set(-28, 2.32, -1.25);
  root.add(kerb);
  // The quay face is wet and dark near the waterline.
  const face = new THREE.Mesh(new THREE.PlaneGeometry(80, 2.4), lambert(0.14));
  face.position.set(-28, 0.9, -1.51);
  face.rotation.y = Math.PI;
  root.add(face);
  const bollard = mergeGeometries([new THREE.CylinderGeometry(0.22, 0.26, 0.6, 10).translate(0, 0.3, 0), new THREE.CylinderGeometry(0.32, 0.3, 0.12, 10).translate(0, 0.62, 0)]);
  const bollards = [-4.5, -14, -24, -34, -44, -54].map(x => {
    const b = new THREE.Mesh(bollard, lambert(0.28));
    b.position.set(x, 2.2, -0.9);
    root.add(b);
    return b;
  });
  // A ladder drops into the water.
  for (const x of [3.6, 4.2]) root.add(rod(V(x, 2.3, -1.6), V(x, -1, -1.6), 0.03, M.metal));
  for (let y = -0.6; y < 2.2; y += 0.35) root.add(rod(V(3.6, y, -1.6), V(4.2, y, -1.6), 0.02, M.metal));
  // A sodium lamp behind and left lights the quay; it stays out of view.
  const quayLamp = new THREE.PointLight(0xffffff, 1400, 0, 2);
  quayLamp.position.set(-9, 8, 2.5);
  root.add(quayLamp);
  root.add(rod(V(-9, 2.2, 3), V(-9, 8.2, 3), 0.09, M.metal));
  // Warehouses line the quay to the left.
  for (let i = 0; i < 5; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(18, 9 + R() * 5, 14), lambert(0.3 + R() * 0.1));
    w.position.set(-75 - i * 22, 4.5, 14 + R() * 4);
    w.rotation.y = 0.05;
    root.add(w);
  }
  const farLamps = [V(-58, 8, -1), V(-96, 8, -1), V(-140, 8, -2)];

  /* pontoons and moored yachts */
  const pont = new THREE.Group();
  const deckM = lambert(0.42);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(76, 0.45, 2.4), deckM);
  walk.position.set(-22, 0.3, -27);
  pont.add(walk);
  const fingers = [];
  for (let k = 0; k <= 9; k++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 12), deckM);
    f.position.set(-58 + k * 8, 0.25, -34.2);
    pont.add(f);
    fingers.push(f.position.x);
  }
  // A gangway climbs from the pontoon to the quay.
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 25.6), lambert(0.5));
  ramp.position.set(12, 1.25, -14.2);
  ramp.rotation.x = -Math.atan2(1.9, 25);
  pont.add(ramp);
  root.add(pont);
  const pontLights = [];
  for (let k = 0; k <= 9; k++) pontLights.push(V(-58 + k * 8, 1.0, -28.1));

  const yachts = [];
  for (let k = 0; k < 9; k++) {
    if (k === 4) continue;
    const y = buildYacht(9 + R() * 4);
    const x = -54 + k * 8;
    y.g.position.set(x, 0, -34.5 + (R() - 0.5));
    y.g.rotation.y = (R() - 0.5) * 0.08;
    y.phase = R() * 10;
    // Old boats burn incandescent anchor lights; newer ones use dim LEDs.
    y.lamp = R() < 0.4 ? 1600 : 50;
    y.lit = R() < 0.3;
    root.add(y.g);
    yachts.push(y);
  }
  // Two yachts swing on moorings in the basin.
  for (const [x, z] of [[-30, -95], [22, -120]]) {
    const y = buildYacht(10 + R() * 3);
    y.g.position.set(x, 0, z);
    y.g.rotation.y = 0.6 + R();
    y.phase = R() * 10; y.lamp = 1200; y.lit = false; y.swing = true;
    root.add(y.g);
    yachts.push(y);
  }

  const fisher = buildFisher();
  fisher.g.position.set(-31, 0, -5.4);
  fisher.g.rotation.y = Math.PI / 2;
  root.add(fisher.g);
  const flood = new THREE.PointLight(0xffffff, 900, 0, 2);
  root.add(flood);
  // Mooring lines run from the fishing boat to the bollards.
  root.add(rod(V(-24, 2.6, -2.9), V(-24, 2.8, -0.9), 0.03, M.rope));
  root.add(rod(V(-39.5, 2.6, -2.9), V(-44, 2.8, -0.9), 0.03, M.rope));

  /* breakwaters */
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = [];
  const arm = (pts, n) => {
    const c = new THREE.CatmullRomCurve3(pts);
    for (let i = 0; i < n; i++) {
      const p = c.getPointAt(i / (n - 1));
      for (let k = 0; k < 3; k++) rocks.push([p.x + (R() - 0.5) * 9, (R() - 0.2) * 2.4, p.z + (R() - 0.5) * 9, 1.4 + R() * 1.8]);
    }
    return c;
  };
  arm([V(-620, 0, -150), V(-300, 0, -185), V(-60, 0, -200), V(52, 0, -205)], 300);
  arm([V(420, 0, -120), V(250, 0, -175), V(132, 0, -215)], 160);
  const rockMesh = new THREE.InstancedMesh(rockGeo, lambert(0.4), rocks.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(1, 1, 1), e = new THREE.Euler();
  rocks.forEach(([x, y, z, s], i) => {
    e.set(R() * 6, R() * 6, R() * 6); q.setFromEuler(e);
    sc.set(s * (0.8 + R() * 0.5), s * (0.6 + R() * 0.4), s * (0.8 + R() * 0.5));
    mtx.compose(V(x, y, z), q, sc);
    rockMesh.setMatrixAt(i, mtx);
  });
  root.add(rockMesh);
  // Light towers at both heads.
  const towerG = V(52, 0, -205), towerR = V(132, 0, -215);
  for (const t of [towerG, towerR]) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 9, 12), lambert(0.65));
    tw.position.set(t.x, 4.5, t.z);
    root.add(tw);
  }

  /* channel buoys */
  const buoys = [[96, -330, 'g'], [150, -345, 'r'], [80, -470, 'g'], [165, -490, 'r']].map(([x, z, c], i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(c === 'g' ? new THREE.ConeGeometry(1.0, 2.2, 10) : new THREE.CylinderGeometry(0.9, 0.9, 2.0, 10), lambert(c === 'g' ? 0.3 : 0.5));
    body.position.y = 1.0;
    g.add(body);
    g.add(rod(V(0, 2, 0), V(0, 3.4, 0), 0.05, M.metal));
    g.position.set(x, 0, z);
    root.add(g);
    return { g, c, ph: i * 1.7 };
  });

  /* far shore, town and lighthouse */
  const shore = new THREE.PlaneGeometry(9000, 2400, 360, 90);
  shore.rotateX(-Math.PI / 2);
  shore.translate(0, 0, -2500);
  const sp = shore.attributes.position, sc2 = new Float32Array(sp.count * 3);
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getZ(i);
    sp.setY(i, shoreHeight(x, z));
    const a = 0.26 + 0.12 * n2(x / 60, z / 60);
    sc2.set([a, a, a], i * 3);
  }
  shore.setAttribute('color', new THREE.BufferAttribute(sc2, 3));
  shore.computeVertexNormals();
  root.add(new THREE.Mesh(shore, new THREE.MeshLambertMaterial({ vertexColors: true })));

  // Town: houses up the slope, windows and street lamps.
  const townLights = [];
  const houseGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const houses = new THREE.InstancedMesh(houseGeo, lambert(0.55), 1400);
  let hi = 0;
  const place = (x0, x1, depth, n, lampP) => {
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, R()), c = coastZ(x), z = c - 15 - Math.pow(R(), 1.6) * depth;
      const h = shoreHeight(x, z);
      if (hi < 1400) {
        const s = 8 + R() * 10;
        mtx.compose(V(x, h - 1, z), q.setFromAxisAngle(up, R() * 3), V(s, 6 + R() * 8, s * (0.7 + R() * 0.6)));
        houses.setMatrixAt(hi++, mtx);
      }
      if (R() < lampP) {
        // Sodium street lamps glow hard in the tube; LED windows barely.
        const sodium = R() < 0.45;
        townLights.push({ p: V(x + (R() - 0.5) * 6, h + 3 + R() * 6, z + 8), I: sodium ? 380 + R() * 900 : 30 + R() * 110, s: sodium ? 1.9 : 1.4 });
      }
    }
  };
  place(-520, 260, 420, 900, 0.28);
  place(300, 2200, 300, 400, 0.18);
  houses.count = hi;
  root.add(houses);
  // A coast road with street lamps in a string.
  for (let x = -2400; x < 2600; x += 38 + R() * 12) townLights.push({ p: V(x, shoreHeight(x, coastZ(x) - 20) + 8, coastZ(x) - 20), I: 300 + R() * 400, s: 1.6 });

  const lhBase = V(-700, 0, coastZ(-700) - 60);
  lhBase.y = shoreHeight(lhBase.x, lhBase.z);
  const lhTower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 28, 14), lambert(0.75));
  lhTower.position.set(lhBase.x, lhBase.y + 14, lhBase.z);
  root.add(lhTower);
  const lamp = V(lhBase.x, lhBase.y + 30, lhBase.z);
  const beams = buildBeams(air);
  beams.head.position.copy(lamp);
  root.add(beams.head);

  // A freighter rides at anchor offshore.
  const ship = new THREE.Group();
  const shipHull = new THREE.Mesh(new THREE.BoxGeometry(24, 9, 170), lambert(0.3));
  shipHull.position.y = 3;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 16), lambert(0.6));
  bridge.position.set(0, 14, 66);
  ship.add(shipHull, bridge);
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(20, 6 + R() * 3, 18), lambert(0.25 + R() * 0.25));
    st.position.set(0, 10, -60 + i * 21);
    ship.add(st);
  }
  ship.position.set(820, 0, -1050);
  ship.rotation.y = 1.1;
  root.add(ship);

  /* gulls */
  const gulls = Array.from({ length: 5 }, (_, i) => {
    const gl = buildGull();
    root.add(gl.g);
    return { ...gl, r: 18 + R() * 30, cx: -20 + R() * 40, cz: -60 - R() * 40, h: 12 + R() * 18, w: (0.25 + R() * 0.15) * (R() < 0.5 ? -1 : 1), ph: R() * 6 };
  });

  /* IR illuminator and the laser */
  const ir = new THREE.SpotLight(0xffffff, 0, 0, 0.3, 0.8, 2);
  root.add(ir, ir.target);
  // Easter egg: someone on the breakwater sweeps an IR laser now and then.
  const laserMat = new THREE.ShaderMaterial({
    uniforms: { ...air, uOn: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vW; varying float vY;
      void main() { vY = position.y; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uOn;
      varying vec3 vW; varying float vY;
      ${FOG_GLSL}
      void main() {
        float T = exp(-fogDepth(cameraPosition, vW));
        float scatter = (uFog.x * exp(-uFog.y * abs(vW.y)) + uFog.z * 40.0) * 900.0;
        gl_FragColor = vec4(vec3(uOn * scatter * T * (0.6 + 0.4 * fract(sin(vY * 0.37 + uFogTime * 40.0) * 43758.5))), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const laserGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 6, 1, true).translate(0, 0.5, 0);
  const laser = new THREE.Mesh(laserGeo, laserMat);
  laser.frustumCulled = false;
  root.add(laser);
  const laserSrc = V(40, 3.2, -203);

  const eye = V(0, 3.9, 0);
  camera.position.copy(eye);

  const lobe = (p, f, power) => Math.pow(Math.max(0, f.dot(tmp2.subVectors(camera.position, p).normalize())), power);
  const ray = new THREE.Raycaster();
  const hitList = [quay, face, walk, ramp, rockMesh, fisher.g, ...yachts.map(y => y.g)];

  function update(t, dt, { irOn }) {
    air.uFogTime.value = t;
    water.material.uniforms.uTime.value = t;
    emit.begin();

    // Yachts roll, pitch and heave out of step; masts draw arcs.
    for (const y of yachts) {
      const p = t + y.phase;
      y.g.rotation.z = 0.045 * Math.sin(p * 0.9) + 0.018 * Math.sin(p * 2.3 + 1);
      y.g.rotation.x = 0.014 * Math.sin(p * 0.7 + 2);
      y.g.position.y = 0.06 * Math.sin(p * 1.1);
      if (y.swing) y.g.rotation.y += 0.004 * Math.sin(t * 0.05 + y.phase) * dt;
      y.g.updateMatrixWorld();
      emit.add(y.g.localToWorld(tmp.copy(y.top).add(tmp2.set(0, 0.25, 0))), y.lamp, 1.8);
      if (y.lit) {
        for (const s of [-1, 1]) emit.add(y.g.localToWorld(tmp.set(s * y.B * 0.28, y.cabinY, y.L * 0.05)), 140, 1.5);
      }
    }
    fisher.g.rotation.z = 0.012 * Math.sin(t * 0.6);
    fisher.g.position.y = 0.04 * Math.sin(t * 0.8 + 1);
    fisher.g.updateMatrixWorld();
    for (const w of fisher.windows) emit.add(fisher.g.localToWorld(tmp.copy(w)), 320, 2.2);
    emit.add(fisher.g.localToWorld(tmp.copy(fisher.mtop).add(tmp2.set(0, 0.3, 0))), 1400, 1.8);
    const fl = fisher.g.localToWorld(tmp.copy(fisher.flood));
    flood.position.copy(fl);
    flood.position.y -= 0.6;
    emit.add(fl, 4200, 2.6);

    pontLights.forEach((p, i) => emit.add(tmp.copy(p).add(tmp2.set(0, 0.04 * Math.sin(t * 0.9 + i), 0)), 26, 1.4));
    farLamps.forEach(p => emit.add(p, 2600, 2.4));

    // Harbour lights: green flashes every 3 s, red every 4 s.
    const fg = (t % 3) < 0.5, fr = ((t + 1.1) % 4) < 0.6;
    emit.add(tmp.copy(towerG).setY(9.6), fg ? 600 : 0, 2.2);
    emit.add(tmp.copy(towerR).setY(9.6), fr ? 1500 : 0, 2.2);
    for (const b of buoys) {
      b.g.position.y = 0.25 * Math.sin(t * 1.2 + b.ph);
      b.g.rotation.z = 0.12 * Math.sin(t * 0.9 + b.ph);
      b.g.rotation.x = 0.1 * Math.sin(t * 0.7 + b.ph * 2);
      b.g.updateMatrixWorld();
      const on = ((t + b.ph) % 4) < 0.45;
      emit.add(b.g.localToWorld(tmp.set(0, 3.5, 0)), on ? (b.c === 'r' ? 1100 : 380) : 0, 2);
    }

    for (const L of townLights) emit.add(L.p, L.I, L.s);
    emit.add(tmp.copy(MOON).multiplyScalar(3300).add(camera.position), 2600, 12);
    water.material.uniforms.uMoon.value.copy(MOON);
    water.material.uniforms.uMoonI.value = 1800;

    // Coast road: two cars trace the shore with their beams ahead.
    for (let k = 0; k < 2; k++) {
      const s = ((t * 18 + k * 2600) % 5200) - 2600;
      const x = k ? -s : s, z = coastZ(x) - 22, yv = shoreHeight(x, z) + 1;
      const f = tmp.set(k ? -1 : 1, 0, 0);
      emit.add(V(x, yv, z), 3000 * (0.05 + lobe(V(x, yv, z), f, 6)), 1.8);
    }

    // The lighthouse turns once in 12 s; a beam on the eye flashes hard.
    const ang = (t / 12) * Math.PI * 2;
    beams.head.rotation.y = ang;
    const bdir = tmp.set(Math.cos(ang), 0, -Math.sin(ang));
    const toEye = tmp2.subVectors(camera.position, lamp).setY(0).normalize();
    const face1 = Math.max(0, bdir.dot(toEye)), face2 = Math.max(0, -bdir.dot(toEye));
    emit.add(lamp, 160 + 26000 * (Math.pow(face1, 400) + Math.pow(face2, 400)), 2.4);

    // Freighter: deck lights in a row, a masthead light, a rare IR blink.
    ship.updateMatrixWorld();
    for (let i = 0; i < 9; i++) emit.add(ship.localToWorld(tmp.set(i % 2 ? 9 : -9, 9, -78 + i * 18)), 900, 1.6);
    emit.add(ship.localToWorld(tmp.set(0, 32, 66)), 1300, 1.8);
    emit.add(ship.localToWorld(tmp.set(0, 26, -84)), 1000, 1.7);
    // Easter egg: an IR strobe on the forward mast, invisible to the eye.
    if ((t % 2.4) < 0.05) emit.add(ship.localToWorld(tmp.set(0, 27, -84)), 22000, 2.2);

    // Gulls circle, glide and flap in bursts.
    for (const gl of gulls) {
      const a = t * gl.w + gl.ph;
      gl.g.position.set(gl.cx + Math.cos(a) * gl.r, gl.h + Math.sin(a * 2.3) * 1.5, gl.cz + Math.sin(a) * gl.r);
      gl.g.rotation.set(0, -a + (gl.w > 0 ? 0 : Math.PI), Math.sign(gl.w) * 0.35);
      const flap = Math.sin(t * 9 + gl.ph) * (Math.sin(t * 0.4 + gl.ph) > 0.3 ? 0.7 : 0.08);
      gl.wings[0].rotation.z = flap; gl.wings[1].rotation.z = -flap;
    }

    // Easter egg: the laser wanders for ten seconds out of every eighty.
    const lt = (t + 30) % 80;
    const laserOn = lt < 10 ? smooth(0, 0.4, lt) * smooth(10, 9.4, lt) : 0;
    laser.visible = laserOn > 0;
    if (laserOn > 0) {
      const aim = V(-6 + 30 * Math.sin(lt * 0.37) + 1.5 * Math.sin(lt * 7.1), 0.8 + 1.2 * Math.sin(lt * 0.53), -18 + 10 * Math.sin(lt * 0.21));
      const dir = aim.clone().sub(laserSrc).normalize();
      ray.set(laserSrc, dir);
      ray.far = 400;
      const hit = ray.intersectObjects(hitList, true)[0];
      const len = hit ? hit.distance : 400;
      laser.position.copy(laserSrc);
      laser.quaternion.setFromUnitVectors(up, dir);
      laser.scale.set(1, len, 1);
      laserMat.uniforms.uOn.value = laserOn;
      if (hit) emit.add(hit.point, 9000 * laserOn, 2.0);
    }

    camera.getWorldDirection(tmp);
    ir.position.copy(camera.position);
    ir.target.position.copy(camera.position).addScaledVector(tmp, 20).add(tmp2.set(0, 0.5, 0));
    ir.intensity = irOn ? 120000 : 0;

    emit.end();
  }

  function setPx(px) {
    emit.mat.uniforms.uPx.value = px;
    stars.material.uniforms.uPx.value = px;
  }

  // Mirror pass: the whole world flipped under the water, rendered at half size.
  let reflRT = null;
  const clip = [new THREE.Plane(V(0, -1, 0), 0.02)];
  function pre(r, cam, target) {
    const w = Math.max(8, target.width >> 1), h = Math.max(8, target.height >> 1);
    if (!reflRT || reflRT.width !== w || reflRT.height !== h) {
      reflRT?.dispose();
      reflRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true });
    }
    root.scale.y = -1;
    root.updateMatrixWorld(true);
    water.visible = false;
    r.clippingPlanes = clip;
    r.setRenderTarget(reflRT);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(scene, cam);
    r.clippingPlanes = [];
    water.visible = true;
    root.scale.y = 1;
    root.updateMatrixWorld(true);
    const u = water.material.uniforms;
    u.tRefl.value = reflRT.texture;
    u.uRes.value.set(target.width, target.height);
  }

  fogify(root, air);
  return { scene, camera, eye, update, setPx, pre, air, look: { yaw: [-1.4, 1.4], pitch: [-0.4, 0.5], start: -0.03 }, expo: 3.6 };
}
