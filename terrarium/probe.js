// Terrarium probe: the jar's fill on three.js, to compare with the ray-marched toy.
// Same camera and jar profile as main.js. One unit is about 20 cm.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const qs = new URLSearchParams(location.search);
const $ = id => /** @type {HTMLInputElement} */ (document.getElementById(id));

/* ---------- small tools ---------- */
// A seeded random, so every load grows the same garden.
let seed = 7;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.03 + 5, y * 2.03) * 0.3 + vnoise(x * 4.1 + 9, y * 4.1) * 0.2;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- the jar's profile, as in main.js ---------- */
const TOP = 1.705, LID = 1.43;
function jarShape(y) {
  let r = 0.34;
  if (y < 1.0) r = 0.62;
  else if (y < 1.3) { const e = (y - 1.0) / 0.3; r = 0.34 + 0.28 * Math.sqrt(Math.max(1 - e * e, 0)); }
  const l = (y - 1.405) / 0.025;
  if (Math.abs(l) < 1) r = Math.max(r, 0.34 + 0.03 * Math.sqrt(1 - l * l));
  if (y > 1.43) {
    const fl = (y - 1.445) / 0.016, dm = (y - 1.46) / 0.1, kb = y - 1.65;
    r = Math.abs(fl) < 1 ? 0.37 + 0.02 * Math.sqrt(1 - fl * fl) : 0.37 * Math.sqrt(Math.max(1 - dm * dm, 0));
    r = Math.max(r, y < 1.63 ? 0.035 : 0);
    r = Math.max(r, Math.sqrt(Math.max(0.003025 - kb * kb, 0)));
  }
  return r - 0.05 * (1 - Math.min(1, y / 0.09)) ** 2;
}

/* ---------- the bed: sloped back to front, with two mounds ---------- */
const BED_R = 0.585;
// Height of the soil top. The back stands higher than the front, as in a built terrarium.
const bedH = (x, z) => 0.26 - 0.09 * (z / 0.55) + 0.06 * Math.exp(-((x + 0.22) ** 2 + (z + 0.12) ** 2) * 14) + 0.045 * Math.exp(-((x - 0.26) ** 2 + (z - 0.12) ** 2) * 20) + 0.01 * (fbm(x * 9, z * 9) - 0.5);
// Cushion moss sits on the two mounds.
const cushion = (x, z) => Math.max(Math.exp(-((x + 0.22) ** 2 + (z + 0.12) ** 2) * 18), Math.exp(-((x - 0.26) ** 2 + (z - 0.12) ** 2) * 26));

/* ---------- renderer, camera, light ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
// Variance shadows take a blur radius, so the grow light casts soft shadows.
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.info.autoReset = false;
document.body.prepend(renderer.domElement);
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d0a);
const FOC = 1.55;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(0.5 / FOC) * 180 / Math.PI, 1, 0.05, 40);
function placeCamera() {
  const asp = innerWidth / innerHeight;
  camera.aspect = asp;
  camera.position.set(0, 1.35, 3.45 * Math.max(1, 0.7 / asp));
  camera.lookAt(0, 0.86, 0);
  camera.updateProjectionMatrix();
}

// The grow light: a bright bar above and behind the jar.
const LAMP = new THREE.Vector3(0, 1.95, -0.9);
const lampCol = new THREE.Color(1.0, 0.93, 0.86);
const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.035, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 5.1) }));
bar.position.copy(LAMP);
const housing = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.05, 0.09), new THREE.MeshStandardMaterial({ color: 0x111312, roughness: 0.5, metalness: 0.6 }));
housing.position.copy(LAMP).add(new THREE.Vector3(0, 0.04, 0));
scene.add(bar, housing);
// Shadows come from a spot at the lamp; a rect light gives the soft broad light.
const spot = new THREE.SpotLight(lampCol, 14, 0, 0.75, 1, 2);
spot.position.copy(LAMP);
spot.target.position.set(0, 0.3, 0.05);
spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048);
spot.shadow.bias = -0.0002;
spot.shadow.normalBias = 0.008;
spot.shadow.radius = 14;
spot.shadow.blurSamples = 20;
scene.add(spot, spot.target);
const rect = new THREE.RectAreaLight(lampCol, 18, 1.4, 0.08);
rect.position.copy(LAMP);
rect.lookAt(0, 0.3, 0);
scene.add(rect);
scene.add(new THREE.HemisphereLight(0x2b4636, 0x040604, 0.5));

// The room: a dark floor and wall.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x0b0f0c, roughness: 0.85, envMapIntensity: 0.08 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshStandardMaterial({ color: 0x0a1a12, roughness: 0.95, envMapIntensity: 0.05 }));
wall.position.set(0, 3, -2.6);
scene.add(floor, wall);

// The glass reflects a small dark room: the lamp bar and two soft panels at the sides.
function makeEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020403);
  const glow = c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.08), glow(new THREE.Color(8, 7.4, 6.8)));
  b.position.copy(LAMP); b.rotation.x = Math.PI / 2;
  env.add(b);
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.0), glow(new THREE.Color(0.35, 0.38, 0.36)));
    p.position.set(sx * 2.6, 1.2, 1.6); p.rotation.y = -sx * Math.PI / 2;
    env.add(p);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02).texture;
  pm.dispose();
  return tex;
}
scene.environment = makeEnvironment();

/* ---------- the jar: transmission glass ---------- */
function lathe(y0, y1, n) {
  const pts = [new THREE.Vector2(0.0001, y0)];
  for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; pts.push(new THREE.Vector2(Math.max(jarShape(Math.min(y, TOP - 1e-4)), 0.0001), y)); }
  pts.push(new THREE.Vector2(0.0001, y1));
  return new THREE.LatheGeometry(pts, 160);
}
const glassMat = (thickness) => {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 1, ior: 1.5, thickness,
    attenuationColor: new THREE.Color(0.55, 0.86, 0.64), attenuationDistance: 0.45,
    specularIntensity: 1, envMapIntensity: 1.2, side: THREE.FrontSide,
  });
  // Near the edge the eye looks along the wall, so the glass turns deep green.
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float edge = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.5);
      outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.25, 0.55, 0.32) + vec3(0.004, 0.012, 0.007), edge);
      #include <opaque_fragment>`);
  };
  return m;
};
const body = new THREE.Mesh(lathe(0, LID, 280), glassMat(0.05));
const lid = new THREE.Mesh(lathe(LID, TOP, 140), glassMat(0.25));
scene.add(body, lid);

/* ---------- substrate: drainage stones, charcoal, soil ---------- */
const SLAB = 0.07, DRAIN = 0.15, CHAR = 0.175;
function scatter(geo, mat, n, y0, y1, rIn, size, colour) {
  const m = new THREE.InstancedMesh(geo, mat, n), o = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rIn * rIn + rnd() * (BED_R * BED_R - rIn * rIn)) - size * 0.6;
    o.position.set(Math.cos(a) * r, y0 + rnd() * (y1 - y0), Math.sin(a) * r);
    o.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
    const s = size * (0.6 + rnd() * 0.6);
    o.scale.set(s * (0.8 + rnd() * 0.5), s * (0.6 + rnd() * 0.4), s * (0.8 + rnd() * 0.5));
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    m.setColorAt(i, colour(c));
  }
  m.receiveShadow = true;
  return m;
}
const stones = scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 2400, SLAB + 0.012, DRAIN, 0.4, 0.02,
  c => c.setHSL(0.08 + rnd() * 0.05, 0.12 + rnd() * 0.1, 0.12 + rnd() * 0.22));
const charcoal = scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 1500, DRAIN + 0.004, CHAR, 0.42, 0.012,
  c => c.setHSL(0.1, 0.05, 0.02 + rnd() * 0.03));
scene.add(stones, charcoal);
// The soil: a wall at the glass, and a sloped top on a polar grid.
function soilTop() {
  const rings = 80, segs = 220, pos = [], col = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
    const r = BED_R * i / rings, a = j / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    pos.push(x, bedH(x, z), z);
    c.setHSL(0.07, 0.45, 0.035 + 0.03 * fbm(x * 30, z * 30));
    col.push(c.r, c.g, c.b);
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + segs + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const soilMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
const soil = new THREE.Mesh(soilTop(), soilMat);
soil.receiveShadow = true;
const wallG = new THREE.CylinderGeometry(BED_R, BED_R, 1, 220, 1, true);
{
  const p = wallG.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) > 0 ? bedH(x, z) : CHAR); }
  wallG.computeVertexNormals();
}
const soilWall = new THREE.Mesh(wallG, new THREE.MeshStandardMaterial({ color: 0x150c06, roughness: 1 }));
scene.add(soil, soilWall);

/* ---------- hardscape: a craggy stone and a branch ---------- */
const rockG = new THREE.IcosahedronGeometry(1, 5);
{
  const p = rockG.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + 0.28 * (fbm(v.x * 2.2 + v.y, v.z * 2.2 - v.y) - 0.5) + 0.1 * (vnoise(v.x * 9 + v.z, v.y * 9) - 0.5);
    // Flat strata planes make the stone craggy.
    v.multiplyScalar(k);
    v.y = Math.round(v.y * 7) / 7 * 0.35 + v.y * 0.65;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  rockG.computeVertexNormals();
}
const rock = new THREE.Mesh(rockG, new THREE.MeshStandardMaterial({ color: 0x4a4d48, roughness: 0.9 }));
rock.scale.set(0.15, 0.13, 0.12);
rock.position.set(0.2, bedH(0.2, -0.24) + 0.05, -0.24);
rock.rotation.y = 0.6;
rock.castShadow = rock.receiveShadow = true;
const branchCurve = new THREE.CatmullRomCurve3([[-0.56, 0, 0.12], [-0.42, 0.04, 0.08], [-0.28, 0.1, 0.0], [-0.16, 0.17, -0.06], [-0.08, 0.2, -0.04]].map(([x, dy, z]) => new THREE.Vector3(x, bedH(x, z) + dy - 0.01, z)));
const branch = new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 60, 0.018, 10), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.95 }));
branch.castShadow = branch.receiveShadow = true;
scene.add(rock, branch);
scene.updateMatrixWorld(true);

/* ---------- moss: instanced strands ---------- */
// One strand: two crossed, tapered cards, base at 0 and tip at 1.
function strandGeometry() {
  const pos = [], idx = [], rows = 5;
  for (const plane of [0, 1]) {
    const base = pos.length / 3;
    for (let i = 0; i < rows; i++) {
      const t = i / (rows - 1), w = 0.5 * (1 - 0.75 * t);
      if (plane === 0) pos.push(-w, t, 0, w, t, 0); else pos.push(0, t, -w, 0, t, w);
    }
    for (let i = 0; i < rows - 1; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // Every strand faces up, so the carpet lights as one soft surface.
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}
const U = { uWake: { value: 0 }, uTime: { value: 0 }, uLampCol: { value: lampCol.clone().multiplyScalar(1.2) }, uLampDirV: { value: new THREE.Vector3() } };
const mossMat = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide });
mossMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWake, uTime;\nvarying float vT;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float t = position.y, hs = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
      // Dry moss folds its leaves to the stem and slumps; wet moss opens.
      transformed.xz *= mix(1.0, mix(0.4, 1.0, uWake), smoothstep(0.1, 1.0, t));
      transformed.y *= mix(0.82, 1.0, uWake);
      transformed.x += (hs - 0.5) * 2.4 * t * t * (1.3 - 0.4 * uWake);
      vT = t;`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWake;\nvarying float vT;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      float lum = dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1));
      diffuseColor.rgb = mix(mix(vec3(lum), diffuseColor.rgb, 0.5) * vec3(0.9, 0.85, 0.42), diffuseColor.rgb, uWake);
      // The strand's base sits in the shade of its neighbours.
      diffuseColor.rgb *= mix(0.3, 1.0, vT);`)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.85, 0.3, uWake * vT);');
};
function growMoss(count) {
  const m = new THREE.InstancedMesh(strandGeometry(), mossMat, count), o = new THREE.Object3D(), c = new THREE.Color();
  const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  const sources = [
    { mesh: soil, share: 0.86, test: (p) => true },
    { mesh: rock, share: 0.1, test: (p, n) => n.y > 0.45 },
    { mesh: branch, share: 0.04, test: (p, n) => n.y > 0.6 },
  ].map(s => ({ ...s, sampler: new MeshSurfaceSampler(s.mesh).build(), nm: new THREE.Matrix3().getNormalMatrix(s.mesh.matrixWorld) }));
  let i = 0, tries = 0;
  while (i < count && tries < count * 20) {
    tries++;
    const r = rnd(), s = r < sources[0].share ? sources[0] : r < sources[0].share + sources[1].share ? sources[1] : sources[2];
    s.sampler.sample(pos, nrm);
    pos.applyMatrix4(s.mesh.matrixWorld);
    nrm.applyMatrix3(s.nm).normalize();
    if (!s.test(pos, nrm)) continue;
    const cu = s.mesh === soil ? cushion(pos.x, pos.z) : 0.3;
    // Moss keeps to its patches: a noise map decides where it grows.
    const patch = fbm(pos.x * 5 + 4, pos.z * 5) * 0.7 + vnoise(pos.x * 19, pos.z * 19) * 0.3;
    if (s.mesh === soil && patch < 0.34 - cu * 0.8 && rnd() > 0.04) continue;
    const h = cu > 0.35 ? 0.03 + 0.012 * rnd() + 0.015 * cu : 0.014 + 0.012 * rnd();
    const w = 0.0075 + 0.003 * rnd();
    // Strands stand along the surface, leaning a little at random.
    // Cushion strands fan out from the mound's centre, so the cushion reads as a dome.
    if (cu > 0.35) { const cx = pos.x < 0 ? -0.22 : 0.26, cz = pos.x < 0 ? -0.12 : 0.12; nrm.add(new THREE.Vector3((pos.x - cx) * 4, 0.6, (pos.z - cz) * 4)).normalize(); }
    nrm.lerp(up, s.mesh === soil ? 0.2 : 0.5).add(new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).multiplyScalar(0.25)).normalize();
    q.setFromUnitVectors(up, nrm);
    o.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(up, rnd() * Math.PI * 2));
    o.position.copy(pos);
    o.scale.set(w, h, w);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    // Two kinds: cushion moss bright and yellow-green, sheet moss darker.
    if (cu > 0.35) c.setHSL(0.23 + 0.03 * rnd(), 0.7, 0.26 + 0.12 * rnd());
    else c.setHSL(0.28 + 0.04 * rnd(), 0.6, 0.15 + 0.1 * rnd());
    m.setColorAt(i, c);
    i++;
  }
  m.count = i;
  m.receiveShadow = true;
  return m;
}
const MOSS_N = +qs.get('moss') || 120000;
const moss = growMoss(MOSS_N);
scene.add(moss);
// Spore capsules on red stalks, standing out of the cushions.
function growSpores(n) {
  const stalkG = new THREE.CylinderGeometry(0.06, 0.1, 1, 5, 1).translate(0, 0.5, 0);
  const capG = new THREE.SphereGeometry(1, 8, 6);
  const stalks = new THREE.InstancedMesh(stalkG, new THREE.MeshStandardMaterial({ color: 0x8a2a14, roughness: 0.5 }), n);
  const caps = new THREE.InstancedMesh(capG, new THREE.MeshStandardMaterial({ color: 0x5a3a12, roughness: 0.35 }), n);
  const o = new THREE.Object3D();
  let k = 0;
  for (let t = 0; t < n * 30 && k < n; t++) {
    const x = (rnd() - 0.5) * 1.1, z = (rnd() - 0.5) * 1.1;
    if (x * x + z * z > 0.5 * 0.5 || cushion(x, z) < 0.5) continue;
    const h = 0.035 + 0.025 * rnd(), lean = (rnd() - 0.5) * 0.5;
    o.position.set(x, bedH(x, z) + 0.02, z);
    o.rotation.set(lean, rnd() * 6, (rnd() - 0.5) * 0.4);
    o.scale.set(0.007, h, 0.007);
    o.updateMatrix();
    stalks.setMatrixAt(k, o.matrix);
    const tip = new THREE.Vector3(0, 1, 0).applyMatrix4(o.matrix);
    o.position.copy(tip);
    o.scale.set(0.004, 0.007, 0.004);
    o.updateMatrix();
    caps.setMatrixAt(k, o.matrix);
    k++;
  }
  stalks.count = caps.count = k;
  stalks.castShadow = caps.castShadow = true;
  return [stalks, caps];
}
scene.add(...growSpores(90));

/* ---------- ferns: fronds of instanced leaflets on rule-grown rachises ---------- */
// A leaflet: a lobed blade along +X, lying in the XY plane.
function pinnaGeometry() {
  const s = new THREE.Shape(), n = 7;
  s.moveTo(0, 0);
  for (let i = 0; i <= n; i++) { const x = i / n, w = 0.2 * Math.sin(Math.PI * Math.min(1, x * 1.15)) * (1 - 0.3 * x); s.lineTo(x, w * (i % 2 ? 0.7 : 1.0)); }
  for (let i = n; i >= 0; i--) { const x = i / n, w = 0.2 * Math.sin(Math.PI * Math.min(1, x * 1.15)) * (1 - 0.3 * x); s.lineTo(x, -w * (i % 2 ? 0.7 : 1.0)); }
  return new THREE.ShapeGeometry(s, 3);
}
const frondMat = new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide });
// Light through a leaf from the lamp behind it.
frondMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, U);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uLampCol, uLampDirV;\nuniform float uWake;')
    .replace('#include <opaque_fragment>', `
      float back = pow(max(dot(normalize(-vViewPosition), uLampDirV), 0.0), 3.0);
      outgoingLight += diffuseColor.rgb * vec3(1.1, 1.25, 0.6) * uLampCol * back * (0.5 + 0.7 * uWake);
      #include <opaque_fragment>`);
};
const PAIRS = 24, SEGS = 18;
// Crowns: [x, z, reach, base fronds, extra fronds with growth, start yaw].
const CROWNS = [[-0.12, -0.12, 0.24, 4, 4, 0.3], [0.0, -0.33, 0.2, 3, 3, 1.4], [-0.32, 0.22, 0.13, 2, 3, 2.2]];
const MAXF = CROWNS.reduce((a, c) => a + c[3] + c[4], 0);
const pinnae = new THREE.InstancedMesh(pinnaGeometry(), frondMat, MAXF * PAIRS * 2);
const rachis = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x3b4a1c, roughness: 0.6 }), MAXF * SEGS);
pinnae.castShadow = rachis.castShadow = true;
pinnae.receiveShadow = true;
scene.add(pinnae, rachis);
// The spine in its own plane: up from the crown, over, and curled at the tip when dry.
function spine(s, R, curl, lift) {
  const span = 2.99 + (5.7 - 2.99) * curl, th = 3.29 - s * span;
  const rad = R * (1 - 0.82 * curl * ss(0.3, 1, s));
  return [R + rad * Math.cos(th), (0.15 * R + rad * Math.sin(th)) * lift];
}
function buildFerns(wake, grow) {
  const o = new THREE.Object3D(), c = new THREE.Color(), m = new THREE.Matrix4();
  const P = new THREE.Vector3(), T = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
  let pi = 0, ri = 0;
  CROWNS.forEach(([cx, cz, R, n0, nx, yaw0], ci) => {
    const n = n0 + nx * grow, base = new THREE.Vector3(cx, bedH(cx, cz) - 0.005, cz);
    for (let j = 0; j < 8 && j < n; j++) {
      const young = j / Math.max(n - 1, 1), g = Math.min(1, Math.max(0, n - j));
      const Rj = R * (1.05 - 0.35 * young) * (0.85 + 0.2 * hash2(j, ci)) * (0.35 + 0.65 * g);
      const curl = Math.min(1, Math.max(0, 0.5 + 0.45 * young + 0.5 * (1 - g) - 1.1 * wake));
      const lift = 1.25 + 0.5 * young + 0.2 * wake, yaw = yaw0 + j * 2.39996;
      const out = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)), side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
      const at = s => { const [u, v] = spine(s, Rj, curl, lift); return base.clone().addScaledVector(out, u).add(new THREE.Vector3(0, v, 0)); };
      // The rachis: short cylinder segments along the spine.
      for (let k = 0; k < SEGS; k++) {
        const a = at(k / SEGS), b = at((k + 1) / SEGS), d = b.clone().sub(a), len = d.length();
        o.position.copy(a);
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        const r = 0.0035 * (1 - 0.6 * k / SEGS) * (0.6 + 0.4 * g);
        o.scale.set(r, len, r);
        o.updateMatrix();
        rachis.setMatrixAt(ri++, o.matrix);
      }
      // Leaflets in pairs, longest at mid-frond, sweeping toward the tip.
      for (let k = 0; k < PAIRS; k++) {
        const s = 0.16 + 0.84 * (k + 0.5) / PAIRS;
        P.copy(at(s));
        T.copy(at(Math.min(1, s + 0.01))).sub(at(Math.max(0, s - 0.01))).normalize();
        const L = 0.55 * Rj * Math.pow(Math.max(Math.sin(Math.PI * (s - 0.16) / 0.84), 0), 0.8) * (1 - 0.75 * curl * ss(0.25, 0.9, s));
        const fold = curl * ss(0.2, 0.9, s);
        for (const sd of [-1, 1]) {
          X.copy(side).multiplyScalar(sd).multiplyScalar(Math.cos(0.45 + fold)).addScaledVector(T, Math.sin(0.45 + fold)).normalize();
          Z.crossVectors(X, T).normalize();
          if (Z.y < 0) Z.negate();
          Y.crossVectors(Z, X).normalize();
          m.makeBasis(X.clone().multiplyScalar(Math.max(L, 0.002)), Y.clone().multiplyScalar(Math.max(L, 0.002)), Z);
          m.setPosition(P);
          pinnae.setMatrixAt(pi, m);
          // Old fronds are deep green; young ones paler; dry ones dull.
          c.setHSL(0.27 + 0.03 * young, 0.55 + 0.25 * wake, 0.1 + 0.06 * young + 0.05 * wake);
          pinnae.setColorAt(pi, c);
          pi++;
        }
      }
    }
  });
  pinnae.count = pi;
  rachis.count = ri;
  pinnae.instanceMatrix.needsUpdate = rachis.instanceMatrix.needsUpdate = true;
  if (pinnae.instanceColor) pinnae.instanceColor.needsUpdate = true;
}

/* ---------- mushrooms: wet caps glisten ---------- */
const capMat = new THREE.MeshPhysicalMaterial({ color: 0x7a4a22, roughness: 0.55, clearcoat: 0, clearcoatRoughness: 0.1 });
const stemMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a8, roughness: 0.7 });
const capG = new THREE.LatheGeometry([0, 0.3, 0.7, 0.95, 1.0, 0.92, 0.6, 0].map((r, i) => new THREE.Vector2(r, [0.55, 0.53, 0.42, 0.22, 0.05, -0.02, 0.0, 0.02][i])), 32);
for (const [x, z, h, r] of [[0.27, 0.2, 0.1, 0.045], [0.33, 0.13, 0.07, 0.034], [0.21, 0.26, 0.055, 0.028]]) {
  const y = bedH(x, z) - 0.01;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.24, h, 10).translate(0, h / 2, 0), stemMat);
  stem.position.set(x, y, z);
  const cap = new THREE.Mesh(capG, capMat);
  cap.scale.setScalar(r);
  cap.position.set(x, y + h, z);
  stem.castShadow = cap.castShadow = true;
  scene.add(stem, cap);
}

/* ---------- post: bloom, then the output curve ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.25, 0.95);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- state and loop ---------- */
let wake = +($('wake').value), grow = +($('grow').value), wakeTarget = wake, mistUntil = 0, built = '';
const controls = qs.has('orbit') ? new OrbitControls(camera, renderer.domElement) : null;
if (controls) controls.target.set(0, 0.6, 0);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
  placeCamera();
  controls?.update();
}
addEventListener('resize', resize);
resize();
function mist() { wakeTarget = 1; mistUntil = performance.now() + 9000; grow = Math.min(1, grow + 0.05); $('grow').value = String(grow); }
$('mist').addEventListener('click', mist);
addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') mist(); });
$('wake').addEventListener('input', () => { wake = wakeTarget = +$('wake').value; mistUntil = 0; });
$('grow').addEventListener('input', () => { grow = +$('grow').value; });

const stats = $('stats');
let last = performance.now(), avg = 16, frames = 0;
const lampDir = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  avg += ((now - last) - avg) * 0.05;
  last = now;
  if (mistUntil && now > mistUntil) { wakeTarget = 0; mistUntil = 0; }
  if (Math.abs(wakeTarget - wake) > 0.001) { wake += (wakeTarget - wake) * (1 - Math.exp(-dt / (wakeTarget > wake ? 1.6 : 6))); $('wake').value = String(wake); }
  U.uWake.value = wake;
  U.uTime.value += dt;
  capMat.clearcoat = wake;
  capMat.roughness = 0.55 - 0.35 * wake;
  const key = `${wake.toFixed(3)}|${grow.toFixed(3)}`;
  if (key !== built) { buildFerns(wake, grow); built = key; }
  lampDir.copy(LAMP).sub(new THREE.Vector3(0, 0.4, 0)).normalize().transformDirection(camera.matrixWorldInverse);
  U.uLampDirV.value.copy(lampDir);
  controls?.update();
  renderer.info.reset();
  composer.render();
  if (++frames % 20 === 0) {
    const i = renderer.info.render;
    stats.textContent = `${avg.toFixed(1)} ms  ${(1000 / avg).toFixed(0)} fps\n${i.calls} calls  ${(i.triangles / 1e6).toFixed(2)} M tris\nmoss ${moss.count}  leaflets ${pinnae.count}`;
  }
  if (!document.hidden) requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); } });
requestAnimationFrame(frame);
// QA drives the probe here.
Object.assign(window, { __probe: { renderer, setWake: v => { wake = wakeTarget = v; mistUntil = 0; }, setGrow: v => { grow = v; }, mist, info: () => ({ ...renderer.info.render, avg }) } });
