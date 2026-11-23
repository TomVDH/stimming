// Glowing pickle: the three.js scene. A gherkin on a plate, a fork in each end, a dim room.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSteam } from './steam.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Sizes in metres. The pickle lies along x; its right end glows.
export const P = { len: 0.122, r: 0.0185, well: 0.0062, plateR: 0.132, rimY: 0.021 };
P.y = P.well + P.r * 0.94;
// The hot point sits just inside the right end, at the fork's tines.
export const HOT = new THREE.Vector3(P.len / 2 - 0.007, P.y - 0.001, 0.0);
// The forks stand out of the pickle at this angle from the table.
const FORK_A = 0.52;
// Low-pressure sodium, 589 nm, as linear RGB.
export const NA = new THREE.Color(1.0, 0.46, 0.055);
const ROOM = new THREE.Color(0.5, 0.6, 0.82);
const HAZE = new THREE.Color(0.006, 0.007, 0.009);

const NOISE = /* glsl */`
  float hh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vn(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hh(i), hh(i + vec3(1, 0, 0)), f.x), mix(hh(i + vec3(0, 1, 0)), hh(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hh(i + vec3(0, 0, 1)), hh(i + vec3(1, 0, 1)), f.x), mix(hh(i + vec3(0, 1, 1)), hh(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

/* ---------- the pickle's shape ---------- */
// A gherkin: a fat cylinder with blunt ends, a slight bow, and warts.
// Seeded, so each fresh pickle differs a little.
function pickleGeometry(seed) {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const NU = 72, NV = 48;
  const warts = [];
  for (let i = 0; i < 70; i++) warts.push([0.06 + rnd() * 0.88, rnd() * Math.PI * 2, 0.4 + rnd() * 0.6]);
  const bow = 0.004 + rnd() * 0.003, fat = 0.94 + rnd() * 0.1;
  const pos = [], nrm = [], uv = [], wart = [], idx = [];
  const radius = (u, a) => {
    // Blunt ends: the stem end tapers more than the flower end.
    const e = Math.sin(Math.PI * u);
    const taper = Math.pow(e, u < 0.5 ? 0.42 : 0.34);
    // Shallow ribs run along the body.
    const rib = 1 + 0.025 * Math.cos(a * 7 + u * 2.3);
    let w = 0;
    for (const [wu, wa, wk] of warts) {
      const du = (u - wu) * P.len / P.r, da = Math.atan2(Math.sin(a - wa), Math.cos(a - wa));
      const d2 = du * du * 0.9 + da * da;
      if (d2 < 0.12) w += wk * Math.exp(-d2 / 0.018);
    }
    return [P.r * fat * taper * rib * (1 + 0.075 * w * e), w];
  };
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    for (let j = 0; j <= NV; j++) {
      const a = (j / NV) * Math.PI * 2;
      const [r, w] = radius(u, a);
      const x = (u - 0.5) * P.len;
      // The bow lifts the middle in z, as a gherkin curves on its side.
      const cz = bow * (1 - (2 * u - 1) ** 2);
      pos.push(x, Math.sin(a) * r, Math.cos(a) * r + cz);
      uv.push(u, j / NV);
      wart.push(w);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const a = i * (NV + 1) + j, b = a + NV + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('wart', new THREE.Float32BufferAttribute(wart, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  // The seam at v = 0 and v = 1 shares one normal.
  const n = g.attributes.normal;
  for (let i = 0; i <= NU; i++) {
    const a = i * (NV + 1), b = a + NV;
    const x = (n.getX(a) + n.getX(b)) / 2, y = (n.getY(a) + n.getY(b)) / 2, z = (n.getZ(a) + n.getZ(b)) / 2;
    n.setXYZ(a, x, y, z); n.setXYZ(b, x, y, z);
  }
  // The end caps close to a point: one smooth normal along the axis.
  for (let j = 0; j <= NV; j++) { n.setXYZ(j, -1, 0, 0); n.setXYZ(NU * (NV + 1) + j, 1, 0, 0); }
  g.translate(0, P.y, 0);
  return g;
}

/* ---------- the fork ---------- */
// A dinner fork from its outline, 2 mm thick, bent at the neck.
function forkGeometry() {
  const s = new THREE.Shape();
  // Outline in the fork's plane: x along the fork, tines at x < 0.
  const tw = 0.0105, gap = 0.0028, tine = (2 * tw - 3 * gap) / 4;
  const tl = 0.036;
  s.moveTo(0.19, 0.0055);
  s.bezierCurveTo(0.17, 0.0085, 0.12, 0.009, 0.085, 0.0042);
  s.bezierCurveTo(0.065, 0.0032, 0.05, 0.0034, 0.03, tw);
  s.lineTo(-tl, tw);
  s.quadraticCurveTo(-tl - 0.003, tw - tine / 2, -tl, tw - tine);
  // Each slot between two tines.
  let y = tw - tine;
  for (let k = 0; k < 3; k++) {
    s.lineTo(-0.004, y);
    s.quadraticCurveTo(-0.003, y - gap / 2, -0.004, y - gap);
    y -= gap;
    s.lineTo(-tl, y);
    s.quadraticCurveTo(-tl - 0.003, y - tine / 2, -tl, y - tine);
    y -= tine;
  }
  s.lineTo(0.03, -tw);
  s.bezierCurveTo(0.05, -0.0034, 0.065, -0.0032, 0.085, -0.0042);
  s.bezierCurveTo(0.12, -0.009, 0.17, -0.0085, 0.19, -0.0055);
  s.quadraticCurveTo(0.196, 0, 0.19, 0.0055);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0004, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -0.0009);
  // A dessert fork: 15 cm long.
  g.scale(0.8, 0.9, 1);
  // Lie flat: the fork's plane is the table's plane.
  g.rotateX(-Math.PI / 2);
  // A soft bend lifts the handle; the tines stay level.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const lift = x > 0.016 ? Math.min(1, (x - 0.016) / 0.04) ** 2 * 0.004 + Math.max(0, x - 0.056) * -0.03 : 0;
    p.setY(i, p.getY(i) + lift);
    // The bowl of the tines curves a little.
    if (x < 0.016) p.setY(i, p.getY(i) + (p.getZ(i) / 0.0095) ** 2 * 0.0012);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- the plate ---------- */
function plateGeometry() {
  const R = P.plateR;
  // Profile from the centre out: foot ring, well, the rim's lip.
  const pts = [
    [0, P.well], [0.07, P.well], [0.082, P.well + 0.0012], [0.1, P.well + 0.006], [0.118, 0.0175], [R - 0.004, P.rimY], [R, P.rimY - 0.0012],
    [R + 0.0006, P.rimY - 0.0035], [R - 0.003, P.rimY - 0.0042], [0.115, 0.0128], [0.098, 0.0042], [0.072, 0.0018], [0.07, 0], [0.06, 0], [0.058, 0.0016], [0, 0.0016],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // The lathe faces out along the profile's left side: run it underside first.
  return new THREE.LatheGeometry(pts.reverse(), 96);
}

/* ---------- a clip lead ---------- */
// An alligator clip in a rubber boot, and its lead to the mains.
function clipLead(color, keep) {
  const g = new THREE.Group();
  const boot = keep(new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  const steel = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.5, 0.48, 0.45), metalness: 1, roughness: 0.5 }));
  // The boot tapers toward the jaws.
  const bootG = keep(new THREE.CylinderGeometry(0.0042, 0.0062, 0.03, 18).rotateZ(Math.PI / 2));
  const b = new THREE.Mesh(bootG, boot);
  b.position.x = 0.022;
  const jawG = keep(new THREE.BoxGeometry(0.02, 0.0016, 0.007));
  const j1 = new THREE.Mesh(jawG, steel), j2 = new THREE.Mesh(jawG, steel);
  j1.position.set(0.0, 0.0022, 0); j1.rotation.z = -0.12;
  j2.position.set(0.0, -0.0022, 0); j2.rotation.z = 0.12;
  g.add(b, j1, j2);
  for (const m of g.children) { m.castShadow = true; m.receiveShadow = true; }
  return g;
}

export function createScene(canvas, { onLost } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  scene.background = HAZE.clone();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 20);
  const disposables = [];
  const keep = x => (disposables.push(x), x);
  const U = {
    uGlow: { value: 0 }, uScorch: { value: 0 }, uEmber: { value: 0 }, uHeat: { value: 0 }, uT: { value: 0 },
    uHot: { value: HOT }, uNa: { value: NA },
  };

  /* ---------- light ---------- */
  // The room: a dim cool light from a window behind the blinds, upper left.
  const room = new THREE.DirectionalLight(ROOM, 1.5);
  room.position.set(-0.9, 1.3, 0.35);
  room.castShadow = true;
  room.shadow.mapSize.set(1024, 1024);
  const sc = room.shadow.camera;
  sc.left = -0.3; sc.right = 0.3; sc.top = 0.3; sc.bottom = -0.3; sc.near = 0.5; sc.far = 3;
  room.shadow.bias = -0.0008; room.shadow.normalBias = 0.004; room.shadow.radius = 6;
  scene.add(room);
  // A dark room with one soft window gives the steel and the glaze their glints.
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0.004, 0.004, 0.005);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.38, 0.52), side: THREE.DoubleSide }));
  pane.position.set(-2.2, 2.4, 0.8); pane.lookAt(0, 0, 0);
  const fillPane = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.03, 0.03, 0.035), side: THREE.DoubleSide }));
  fillPane.position.set(1.5, 1.2, 2.5); fillPane.lookAt(0, 0, 0);
  envScene.add(pane, fillPane);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = keep(pmrem.fromScene(envScene, 0.02));
  pmrem.dispose();
  pane.geometry.dispose(); pane.material.dispose(); fillPane.geometry.dispose(); fillPane.material.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1;
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.1, 0.12, 0.17), new THREE.Color(0.03, 0.025, 0.02), 0.35));
  // The glow: a sodium point light at the hot end.
  const glow = new THREE.PointLight(NA, 0, 0, 2);
  glow.position.copy(HOT);
  glow.castShadow = true;
  glow.shadow.mapSize.set(512, 512);
  glow.shadow.camera.near = 0.002; glow.shadow.camera.far = 4;
  glow.shadow.bias = -0.002; glow.shadow.radius = 3;
  scene.add(glow);
  // The ember: dull red from the scorched end once the power is off.
  const ember = new THREE.PointLight(new THREE.Color(1, 0.18, 0.03), 0, 0, 2);
  ember.position.copy(glow.position);
  scene.add(ember);

  /* ---------- room ---------- */
  // A dark table top: oiled wood, broad grain, a few rings.
  const tableMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.06, 0.04, 0.03), roughness: 0.55 }));
  tableMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vG;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvG = vec3(position.x, 0.0, -position.y);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vG;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 p = vG;
          float w = vn(vec3(p.x * 3.0, 0.0, p.z * 60.0)) * 0.6 + vn(vec3(p.x * 9.0, 1.0, p.z * 160.0)) * 0.4;
          float grain = sin((p.z + w * 0.02) * 420.0) * 0.5 + 0.5;
          diffuseColor.rgb *= 0.75 + 0.35 * w + 0.12 * grain;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = 0.45 + 0.2 * vn(vG * 40.0);`);
  };
  const table = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 6)), tableMat);
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);
  // The back wall, far off in the dark; the glow just reaches it.
  const wallMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.26, 0.25, 0.23), roughness: 0.95 }));
  const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(8, 4)), wallMat);
  wall.position.set(0, 1.4, -1.25);
  wall.receiveShadow = true;
  scene.add(wall);

  /* ---------- plate ---------- */
  const plateMat = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.82, 0.81, 0.78), roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.14 }));
  const plate = new THREE.Mesh(keep(plateGeometry()), plateMat);
  plate.castShadow = true; plate.receiveShadow = true;
  scene.add(plate);

  /* ---------- pickle ---------- */
  const pickleMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38 }));
  pickleMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wart; varying float vWart; varying vec2 vPU; varying vec3 vL;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWart = wart; vPU = uv; vL = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uGlow, uScorch, uEmber, uHeat, uT; uniform vec3 uHot, uNa;
      varying float vWart; varying vec2 vPU; varying vec3 vL;
      float vChar = 0.0;
      ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 p = vL * 160.0;
          float a = vPU.y * 6.2831853;
          // Dark green skin, pale stripes along the ribs, yellow wart tips.
          float stripe = smoothstep(0.3, 0.9, sin(a * 11.0 + vn(p * 0.3) * 2.5) * 0.5 + 0.5) * (0.6 + 0.4 * vn(p * 0.15 + 3.0));
          float mott = vn(p * 0.6) * 0.6 + vn(p * 2.2) * 0.4;
          vec3 skin = mix(vec3(0.028, 0.05, 0.012), vec3(0.09, 0.115, 0.03), stripe * (0.5 + 0.5 * mott));
          skin = mix(skin, vec3(0.2, 0.2, 0.06), clamp(vWart * 0.9, 0.0, 1.0) * 0.6);
          // The ends are browner where the stem and the flower were.
          float endz = smoothstep(0.06, 0.0, min(vPU.x, 1.0 - vPU.x));
          skin = mix(skin, vec3(0.08, 0.07, 0.025), endz * 0.7);
          // Scorch spreads from the hot end with a ragged edge.
          float d = length(vL - uHot);
          float reach = 0.004 + 0.034 * uScorch;
          vChar = uScorch > 0.0 ? smoothstep(reach, reach * 0.45, d + (vn(p * 0.5) - 0.5) * 0.012) : 0.0;
          // Char: black and blistered, with grey ash flecks and brown edges.
          float ash = smoothstep(0.6, 0.85, vn(p * 4.0 + 7.0));
          vec3 charC = mix(vec3(0.01, 0.008, 0.006), vec3(0.07, 0.045, 0.02), vn(p * 3.0));
          charC = mix(charC, vec3(0.16, 0.15, 0.14), ash * 0.7);
          float rim = smoothstep(reach * 1.25, reach * 0.8, d) * (1.0 - smoothstep(reach * 0.8, reach * 0.5, d));
          skin = mix(skin, vec3(0.09, 0.06, 0.02), rim * step(0.001, uScorch));
          diffuseColor.rgb = mix(skin, charC, vChar);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.3 + 0.12 * vn(vL * 900.0), 0.92, vChar);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // Pores and fine pimples, as a bump on the screen-space normal.
          // The bump fades where a pore is under a pixel, so it never sparkles.
          float fw = clamp(1.0 - length(fwidth(vL)) * 900.0, 0.0, 1.0);
          float hgt = (0.00018 * vn(vL * 900.0) - 0.0003 * vChar * vn(vL * 400.0)) * fw;
          vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
          float hx = dFdx(hgt), hy = dFdy(hgt);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          normal = normalize(abs(det) * normal - sign(det) * (hx * r1 + hy * r2));
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // Light from the arc scatters through the flesh.
          // The skin filters it: stripes and warts show dark against it.
          float d = length(vL - uHot);
          float core = exp(-d / 0.0055), body = exp(-d / 0.019), far = exp(-d / 0.045);
          // Pale stripes pass more light; dark skin and warts pass less.
          float filt = mix(0.62, 1.0, smoothstep(0.045, 0.11, diffuseColor.g)) * (1.0 - 0.35 * clamp(vWart, 0.0, 1.0));
          vec3 g = uNa * (core * 70.0 + body * 6.0 * filt + far * 1.4 * filt);
          float crack = smoothstep(0.62, 0.8, vn(vL * 700.0));
          g *= mix(1.0, 0.25 + 1.6 * crack, vChar);
          totalEmissiveRadiance += g * uGlow;
          // Hot char glows dull red after the power goes off.
          vec3 ember = vec3(1.0, 0.16, 0.02) * (0.5 + crack * 1.5) * vChar;
          totalEmissiveRadiance += ember * uEmber * 2.2;
        }`);
  };
  pickleMat.emissive = new THREE.Color(0, 0, 0);
  let pickleG = keep(pickleGeometry(3));
  const pickle = new THREE.Mesh(pickleG, pickleMat);
  pickle.castShadow = true; pickle.receiveShadow = true;
  // The arc's light leaves through the flesh: the pickle casts no glow shadow.
  // Point-light shadows use the distance material only.
  const noShadow = keep(new THREE.MeshDistanceMaterial());
  noShadow.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() { discard;'); };
  pickle.customDistanceMaterial = noShadow;
  scene.add(pickle);

  // A soft contact shade grounds the pickle; the glow casts no pickle shadow.
  const contactMat = keep(new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv;
      void main() {
        vec2 q = (vUv - 0.5) * 2.0;
        float k = exp(-dot(q * vec2(1.0, 1.6), q * vec2(1.0, 1.6)) * 3.2);
        gl_FragColor = vec4(vec3(1.0 - 0.8 * k), 1.0);
      }`,
    blending: THREE.MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false,
  }));
  const contact = new THREE.Mesh(keep(new THREE.PlaneGeometry(P.len * 1.15, P.r * 2.6)), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, P.well + 0.0004, 0.003);
  scene.add(contact);

  /* ---------- forks and leads ---------- */
  const forkMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.7, 0.69, 0.66), metalness: 1, roughness: 0.34 }));
  const forkG = keep(forkGeometry());
  const forks = [1, -1].map(side => {
    const f = new THREE.Mesh(forkG, forkMat);
    // The tines go in from the top near each end; the handle leans out.
    const dir = new THREE.Vector3(Math.cos(FORK_A) * side, Math.sin(FORK_A), 0);
    const tip = new THREE.Vector3(side * (P.len / 2 - 0.012), P.y - 0.003, 0);
    f.position.copy(tip).addScaledVector(dir, 0.036 * 0.8);
    f.rotation.set(0, side > 0 ? 0.06 : Math.PI - 0.08, FORK_A);
    f.castShadow = true; f.receiveShadow = true;
    scene.add(f);
    return f;
  });
  [[forks[0], new THREE.Color(0.55, 0.035, 0.03), 1], [forks[1], new THREE.Color(0.02, 0.02, 0.022), -1]].forEach(([f, col, s]) => {
    const clip = clipLead(col, keep);
    // The clip bites the handle near its end.
    f.updateMatrixWorld();
    const at = new THREE.Vector3(0.128, 0.0, 0).applyMatrix4(f.matrixWorld);
    clip.position.copy(at);
    clip.quaternion.copy(f.quaternion);
    scene.add(clip);
    // The lead leaves the boot, sags to the table and runs back out of the light.
    const tail = new THREE.Vector3(0.04, 0, 0).applyMatrix4(f.matrixWorld.clone().setPosition(at));
    const curve = new THREE.CatmullRomCurve3([
      tail,
      tail.clone().add(new THREE.Vector3(s * 0.016, -0.004, 0.002)),
      new THREE.Vector3(tail.x + s * 0.03, tail.y * 0.4, tail.z - 0.004),
      new THREE.Vector3(tail.x + s * 0.035, 0.0032, tail.z - 0.03),
      new THREE.Vector3(tail.x + s * 0.07, 0.0032, tail.z - 0.07),
      new THREE.Vector3(tail.x + s * 0.2, 0.0032, tail.z - 0.1),
      new THREE.Vector3(tail.x + s * 0.5, 0.0032, tail.z - 0.2),
    ], false, 'centripetal');
    const wire = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 160, 0.0028, 10)), keep(new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 })));
    wire.castShadow = true; wire.receiveShadow = true;
    scene.add(wire);
  });

  /* ---------- sparks ---------- */
  // Spits of boiling brine. Under the arc they burn sodium yellow.
  const NS = 96;
  const spk = { p: new Float32Array(NS * 3), v: new Float32Array(NS * 3), life: new Float32Array(NS), age: new Float32Array(NS), hot: new Float32Array(NS), n: 0 };
  const sparkG = keep(new THREE.BufferGeometry());
  const sPos = new Float32Array(NS * 3), sCol = new Float32Array(NS * 4);
  sparkG.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
  sparkG.setAttribute('col', new THREE.BufferAttribute(sCol, 4).setUsage(THREE.DynamicDrawUsage));
  const sparkMat = keep(new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 } },
    vertexShader: `attribute vec4 col; uniform float uScale; varying vec4 vC;
      void main() {
        vC = col;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.5, uScale * (0.0014 + 0.0009 * col.a) / -mv.z);
      }`,
    fragmentShader: `varying vec4 vC;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r = dot(q, q);
        if (r > 1.0) discard;
        gl_FragColor = vec4(vC.rgb * (1.0 - r) * (1.0 - r), 1.0);
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  const sparkPts = new THREE.Points(sparkG, sparkMat);
  sparkPts.frustumCulled = false;
  scene.add(sparkPts);
  function sparks(x, y, z, n, hot, big) {
    for (let k = 0; k < n; k++) {
      // A full pool overwrites the oldest spark.
      let i = spk.n < NS ? spk.n++ : (Math.random() * NS) | 0;
      const a = Math.random() * Math.PI * 2, up = 0.35 + Math.random() * 0.65;
      const sp = (0.25 + Math.random() * 0.55) * (0.7 + 0.5 * big);
      spk.p.set([x, y, z], i * 3);
      spk.v.set([Math.cos(a) * sp * (1 - up * 0.6), up * sp * 1.3, Math.sin(a) * sp * (1 - up * 0.6)], i * 3);
      spk.life[i] = 0.25 + Math.random() * 0.45;
      spk.age[i] = 0;
      spk.hot[i] = hot;
    }
  }
  // Ballistic drops; each lands on the plate and goes out. Returns true while any fly.
  function stepSparks(dt) {
    let live = 0;
    for (let i = 0; i < spk.n; i++) {
      if (spk.age[i] >= spk.life[i]) { sPos[i * 3 + 1] = -9; continue; }
      spk.age[i] += dt;
      const o = i * 3;
      spk.v[o + 1] -= 9.8 * dt;
      // Air drag on a 0.3 mm drop.
      const k = Math.exp(-dt * 2.2);
      spk.v[o] *= k; spk.v[o + 1] *= k; spk.v[o + 2] *= k;
      spk.p[o] += spk.v[o] * dt; spk.p[o + 1] += spk.v[o + 1] * dt; spk.p[o + 2] += spk.v[o + 2] * dt;
      if (spk.p[o + 1] < P.well + 0.001) spk.age[i] = spk.life[i];
      sPos.set(spk.p.subarray(o, o + 3), o);
      const u = spk.age[i] / spk.life[i], f = (1 - u) * (1 - u);
      // Hot spits glow sodium; cold ones are dim, wet glints.
      const h = spk.hot[i];
      sCol.set([(NA.r * 6 * h + 0.25 * (1 - h)) * f, (NA.g * 6 * h + 0.27 * (1 - h)) * f, (NA.b * 6 * h + 0.3 * (1 - h)) * f, h], i * 4);
      live++;
    }
    sparkG.attributes.position.needsUpdate = true;
    sparkG.attributes.col.needsUpdate = true;
    sparkG.setDrawRange(0, spk.n);
    if (!live) spk.n = 0;
    return live > 0;
  }

  /* ---------- steam ---------- */
  const steam = createSteam(renderer, { glow: glow.position, keep });

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(steam.pass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.55, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // Sodium light is one line: the glow drains colour from the room.
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSeed: { value: 0 }, uAspect: { value: 1 }, uMono: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSeed, uAspect, uMono; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        // The hue of sodium light in display space.
        vec3 na = vec3(1.0, 0.72, 0.26);
        float l = dot(c, vec3(0.3, 0.6, 0.1));
        vec3 mono = na * l / dot(na, vec3(0.3, 0.6, 0.1));
        // Near white stays white: the core blinds.
        mono = mix(mono, c, smoothstep(0.75, 1.0, l));
        c = mix(c, mono, uMono);
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        c *= 1.0 - 0.5 * smoothstep(0.35, 1.2, length(q));
        c += (h(vUv * 913.0) - 0.5) * 0.012;
        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }`,
  });
  composer.addPass(grade);

  /* ---------- shot ---------- */
  const look = new THREE.Vector3();
  // Low, at three-quarters, from the front left; a tall frame looks along the pickle.
  function frame(w, h, cov = 0) {
    const aspect = w / h, tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 36 : 26;
    const az = tall ? 0.08 : 0.2, el = tall ? 0.52 : 0.34;
    const dist = tall ? 0.86 : 0.7;
    look.set(tall ? 0.012 : 0.006, tall ? 0.05 : 0.036, -0.01);
    camera.position.set(look.x + Math.sin(az) * Math.cos(el) * dist, look.y + Math.sin(el) * dist, look.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(look);
    camera.setViewOffset(w, h, 0, (cov * h) / 2, w, h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    grade.uniforms.uAspect.value = aspect;
    sparkMat.uniforms.uScale.value = h / Math.tan(camera.fov * Math.PI / 360) * 0.5 * renderer.getPixelRatio();
  }

  function resize(w, h, dpr, { bloomScale = 0.5, samples = 4, steamScale = 0.5 } = {}) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    if (composer.readBuffer.samples !== samples) {
      composer.readBuffer.samples = samples;
      composer.readBuffer.dispose();
    }
    composer.writeBuffer.samples = 0;
    bloom.setSize(Math.round(w * dpr * bloomScale), Math.round(h * dpr * bloomScale));
    steam.resize(Math.round(w * dpr * steamScale), Math.round(h * dpr * steamScale));
  }

  const sp = new THREE.Vector3(), glowC = new THREE.Color(), tmpC = new THREE.Color();
  function toScreen(v) { sp.copy(v).project(camera); return [(sp.x + 1) / 2, (1 - sp.y) / 2]; }

  /* ---------- sync ---------- */
  // st: glow, scorch, ember, heat, mono, t.
  function update(st) {
    U.uGlow.value = st.glow;
    U.uScorch.value = st.scorch;
    // The ember shows only as the yellow goes.
    const em = st.ember * (1 - clamp(st.glow * 4));
    U.uEmber.value = em;
    U.uHeat.value = st.heat;
    U.uT.value = st.t;
    glow.intensity = (st.glow + st.flare * 0.8) * 0.06;
    // The eye adapts: a bright glow pushes the dim room down.
    renderer.toneMappingExposure = 1 / (1 + 1.1 * st.glow + 0.4 * st.flare);
    ember.intensity = em * em * 0.0035;
    grade.uniforms.uMono.value = clamp((st.glow + st.flare) * 1.4) * 0.85;
    // Bloom serves the glow; with the power off, glints stay tight.
    bloom.strength = 0.3 + 0.5 * clamp(st.glow + st.flare + em);
  }
  function freshPickle(seed) {
    pickle.geometry.dispose();
    pickle.geometry = pickleGeometry(seed);
  }
  function render(t = 0) {
    grade.uniforms.uSeed.value = t % 100;
    // The steam sees the glow and the ember as one point source.
    glowC.copy(NA).multiplyScalar(glow.intensity * 0.05).add(tmpC.copy(ember.color).multiplyScalar(ember.intensity * 0.02));
    steam.prepare(scene, camera, t, glowC);
    composer.render();
  }
  async function warm(st) {
    update(st);
    await renderer.compileAsync(scene, camera);
    steam.warm(scene, camera);
  }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    pickle.geometry.dispose();
    steam.dispose();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, scene, camera, steam, sparks, stepSparks, frame, resize, toScreen, update, render, warm, freshPickle, dispose };
}
