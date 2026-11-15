// Phaeton machines: the atomic-age gun and its loading line, in the dark lab.
// The parts keep the old diorama's units inside one scaled group.
// In those units the bore is 1.3 high and the muzzle is at x = -6.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { BORE, MUZZLE, col } from './rig.js';

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
// Old units to metres.
export const S = BORE / 1.3;
const O = { BORE: 1.3, MUZZLE: -6, RACK_X: -15.2, TRAY_X: -12.4 };
const CHARGE_TIME = 2.5, MIN_HOLD = 0.15;

/* ---------- shader wear ---------- */
// Value noise in old units, shared by the wear and the patina.
const NOISE_GLSL = `
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm3(vec3 p) { float a = 0.5, v = 0.0; for (int i = 0; i < 4; i++) { v += a * n3(p); p = p * 2.07 + 3.1; a *= 0.5; } return v; }
`;
// Adds vWPos to a built-in material: the world position, back in old units.
function worldVarying(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
    .replace('#include <project_vertex>', `#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz * ${(1 / S).toFixed(4)};`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\n${NOISE_GLSL}`);
}
// Enamel wear: chips to bare metal on edges and in patches, dust near the table.
function wear(mat, amt = 1) {
  mat.onBeforeCompile = sh => {
    worldVarying(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        float edge = clamp(length(fwidth(normal)) * 5.0, 0.0, 1.0);
        float n = fbm3(vWPos * 9.0);
        float chip = smoothstep(0.74, 0.77, n + edge * 0.32) * ${amt.toFixed(2)};
        float grime = (1.0 - smoothstep(0.0, 0.9, vWPos.y)) * 0.28 + (fbm3(vWPos * vec3(2.0, 14.0, 2.0)) - 0.5) * 0.14;
        diffuseColor.rgb *= 1.0 - grime * ${amt.toFixed(2)};
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.12, 0.11), chip);
        roughnessFactor = mix(roughnessFactor, 0.55, chip);
        metalnessFactor = mix(metalnessFactor, 0.85, chip);
      }`);
  };
  mat.customProgramCacheKey = () => `phaeton-wear-${amt}`;
  return mat;
}
// Copper turns verdigris in patches: matte, pale teal, no longer metal.
function patina(mat) {
  mat.onBeforeCompile = sh => {
    worldVarying(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        float pat = smoothstep(0.52, 0.74, fbm3(vWPos * 5.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.52, 0.42), pat * 0.85);
        roughnessFactor = mix(roughnessFactor, 0.85, pat);
        metalnessFactor = mix(metalnessFactor, 0.0, pat);
      }`);
  };
  mat.customProgramCacheKey = () => 'phaeton-patina';
  return mat;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/**
 * Builds the gun, the rack, the crane, the tubes, the generator, the console and the signs.
 * @param {THREE.Scene} scene
 * @param {{ wake: () => void }} hooks wake() asks the page for frames.
 */
export function makeMachines(scene, { wake }) {
  const m = new THREE.Group();
  m.scale.setScalar(S);
  m.position.x = MUZZLE - O.MUZZLE * S;
  scene.add(m);
  const { BORE: B, MUZZLE: MZ, RACK_X, TRAY_X } = O;

  /* ---------- materials ---------- */
  // Enamel paint, chrome, Bakelite, copper.
  const enamel = (c, r = 0.32) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  const PAL = { cream: col(0.93, 0.035, 90), seafoam: col(0.74, 0.085, 180), cherry: col(0.56, 0.19, 25), mustard: col(0.8, 0.14, 85), bakelite: col(0.32, 0.06, 45) };
  const steel = new THREE.MeshStandardMaterial({ color: col(0.36, 0.012, 250), roughness: 0.5, metalness: 0.65 });
  const chrome = new THREE.MeshStandardMaterial({ color: col(0.92, 0.005, 250), roughness: 0.1, metalness: 1 });
  const paint = wear(enamel(PAL.mustard, 0.4), 1), cream = wear(enamel(PAL.cream), 0.8), seafoam = wear(enamel(PAL.seafoam), 1);
  const cherry = wear(enamel(PAL.cherry, 0.28), 0.7), bakelite = wear(enamel(PAL.bakelite, 0.3), 0.25);
  const copper = patina(new THREE.MeshStandardMaterial({ color: col(0.62, 0.12, 50), roughness: 0.3, metalness: 0.95, emissive: new THREE.Color(0) }));
  const black = new THREE.MeshStandardMaterial({ color: col(0.14, 0.005, 250), roughness: 0.6 });
  const add = (parent, geo, mat, x, y, z, shadow = true) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = shadow; o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const bx = (w, h, d, r = 0) => (r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d));
  const cylX = (r, len, seg = 20) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);
  const ringX = (r, tube) => new THREE.TorusGeometry(r, tube, 10, 40).rotateY(Math.PI / 2);
  // A lathe along x from a list of [x, radius] points.
  const latheX = pts => new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), 48).rotateZ(-Math.PI / 2);
  const hazardTex = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#e8b725'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d1a16';
    for (let x = -h; x < w + h; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  });
  function hazardMat(len) {
    const t = hazardTex.clone();
    t.needsUpdate = true;
    t.repeat.set(len / 1.2, 1);
    const mat = wear(enamel(new THREE.Color(1, 1, 1), 0.45), 1);
    mat.map = t;
    return mat;
  }

  /* ---------- the gun ---------- */
  const gun = new THREE.Group();
  m.add(gun);
  // The barrel is a streamlined seafoam nacelle with chrome rings and a flared muzzle.
  const NOSE = TRAY_X + 0.42;
  add(gun, latheX([[NOSE, 0.001], [NOSE, 0.3], [NOSE + 0.25, 0.4], [NOSE + 1.2, 0.43], [MZ - 1.2, 0.38], [MZ - 0.45, 0.3], [MZ - 0.45, 0.001]]), seafoam, 0, B, 0);
  add(gun, latheX([[MZ - 0.5, 0.001], [MZ - 0.5, 0.26], [MZ - 0.2, 0.3], [MZ, 0.44], [MZ + 0.02, 0.44], [MZ + 0.02, 0.18], [MZ - 0.3, 0.12]]), chrome, 0, B, 0);
  for (const x of [NOSE + 0.6, NOSE + 1.7, NOSE + 2.8, NOSE + 3.9, MZ - 0.8]) add(gun, ringX(0.425, 0.03), chrome, x, B, 0);
  add(gun, ringX(0.31, 0.035), cherry, MZ - 0.42, B, 0);
  // Coil portholes along the camera side glow with the charge.
  const ports = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Group();
    p.position.set(NOSE + 1.15 + i * 1.1, B, 0.39);
    add(p, new THREE.TorusGeometry(0.1, 0.022, 10, 28), chrome, 0, 0, 0.02);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color() });
    add(p, new THREE.CircleGeometry(0.09, 28), mat, 0, 0, 0.012, false);
    gun.add(p);
    ports.push(mat);
  }
  // A cherry tail fin rides on top of the breech end.
  {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(1.5, 0); s.quadraticCurveTo(0.6, 0.15, 0.1, 0.55); s.lineTo(0, 0);
    add(gun, new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), cherry, NOSE + 0.15, B + 0.36, -0.02);
  }
  // Twin copper rails run outside the nacelle on chrome standoffs.
  const rails = [], railLen = MZ - NOSE - 0.9;
  for (const s of [-1, 1]) {
    rails.push(add(gun, cylX(0.032, railLen, 12), copper, NOSE + 0.55 + railLen / 2, B + s * 0.22, 0.44, false));
    for (let x = NOSE + 0.7; x < MZ - 0.5; x += 1.1) add(gun, bx(0.05, 0.05, 0.1), chrome, x, B + s * 0.22, 0.4, false);
  }
  // Two mustard cradles with chrome rams hold the barrel.
  for (const x of [NOSE + 1.1, MZ - 1.5]) {
    const saddle = add(gun, new THREE.TorusGeometry(0.46, 0.05, 8, 24, Math.PI), paint, x, B, 0);
    saddle.rotation.set(0, Math.PI / 2, Math.PI);
    for (const z of [-1, 1]) {
      const leg = add(gun, bx(0.14, B - 0.2, 0.12, 0.03), paint, x, (B - 0.2) / 2, z * 0.42);
      leg.rotation.x = z * 0.2;
    }
    add(gun, bx(0.6, 0.1, 1.3, 0.04), paint, x, 0.05, 0);
    const ram = add(gun, new THREE.CylinderGeometry(0.035, 0.035, 0.95, 12), chrome, x - 0.35, 0.55, 0.25);
    ram.rotation.z = 0.55;
  }
  // The breech: a cream housing, a chrome tray, a sliding capsule block and a lever.
  add(gun, bx(1.7, 0.16, 0.6, 0.05), cream, TRAY_X - 0.35, B - 0.34, 0);
  add(gun, bx(0.6, 0.12, 0.5, 0.03), chrome, TRAY_X - 0.05, B - 0.22, 0);
  add(gun, ringX(0.33, 0.06), cream, NOSE - 0.03, B, 0);
  const block = add(gun, new THREE.CapsuleGeometry(0.25, 0.36, 8, 24).rotateZ(Math.PI / 2), cream, 0, B, 0);
  add(block, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24).rotateZ(Math.PI / 2), cherry, -0.43, 0, 0);
  add(block, ringX(0.255, 0.018), chrome, 0.05, 0, 0);
  const BLOCK_OPEN = TRAY_X - 1.0, BLOCK_SHUT = TRAY_X;
  const lever = new THREE.Group();
  lever.position.set(TRAY_X - 0.6, B - 0.2, 0.42);
  add(lever, new THREE.CylinderGeometry(0.028, 0.034, 0.9, 12).translate(0, 0.45, 0), chrome, 0, 0, 0);
  const knobMat = enamel(PAL.cherry, 0.18);
  knobMat.emissive = new THREE.Color(0);
  add(lever, new THREE.SphereGeometry(0.1, 20, 14), knobMat, 0, 0.94, 0);
  add(lever, cylX(0.08, 0.07).rotateY(Math.PI / 2), cherry, 0, 0, 0);
  gun.add(lever);
  const LEVER_OPEN = 0.65, LEVER_SHUT = -0.65;

  /* ---------- the rack and crane ---------- */
  // A slug is a finned chrome dart with a copper drive band.
  const slugGeo = cylX(0.07, 0.36, 18), noseGeo = new THREE.ConeGeometry(0.07, 0.14, 18).rotateZ(-Math.PI / 2);
  const bandGeo = cylX(0.077, 0.06, 18), finGeo = bx(0.14, 0.11, 0.012);
  const bandMat = new THREE.MeshStandardMaterial({ color: col(0.62, 0.12, 50), roughness: 0.3, metalness: 0.95, emissive: new THREE.Color(0) });
  function makeDart(body = chrome, band = bandMat, fin = cherry) {
    const g = new THREE.Group();
    add(g, slugGeo, body, 0, 0, 0);
    add(g, noseGeo, body, 0.25, 0, 0);
    add(g, bandGeo, band, 0.08, 0, 0);
    for (let k = 0; k < 3; k++) {
      const f = new THREE.Group();
      f.rotation.x = k * TAU / 3;
      add(f, finGeo, fin, -0.13, 0.1, 0);
      g.add(f);
    }
    return g;
  }
  const rack = new THREE.Group();
  m.add(rack);
  for (const z of [-0.34, 0.34]) add(rack, bx(0.12, 2.3, 0.12, 0.05), cream, RACK_X, 1.15, z);
  add(rack, bx(0.95, 0.12, 0.95, 0.05), cherry, RACK_X, 0.06, 0);
  add(rack, bx(0.3, 0.12, 0.85, 0.05), cherry, RACK_X, 2.3, 0);
  const RACK_N = 5, rackY = i => 0.45 + i * 0.36, rackSlugs = [];
  for (let i = 0; i < RACK_N; i++) {
    add(rack, bx(0.62, 0.04, 0.62, 0.015), chrome, RACK_X, rackY(i) - 0.11, 0);
    const s = makeDart();
    s.position.set(RACK_X, rackY(i), 0);
    rack.add(s);
    rackSlugs.push(s);
  }
  // A mustard gantry with hazard stripes; the hook is a horseshoe magnet.
  const CRANE_Y = 3.6;
  for (const x of [-16.1, -11.3]) {
    add(m, bx(0.16, CRANE_Y, 0.16, 0.04), paint, x, CRANE_Y / 2, -1.0);
    add(m, bx(0.14, 0.14, 1.1, 0.03), paint, x, CRANE_Y - 0.07, -0.5);
    add(m, bx(0.5, 0.08, 0.5, 0.03), paint, x, 0.04, -1.0);
  }
  add(m, bx(5.1, 0.2, 0.2, 0.03), hazardMat(5.1), -13.7, CRANE_Y, 0);
  const trolley = add(m, bx(0.44, 0.24, 0.38, 0.06), cherry, 0, CRANE_Y - 0.2, 0);
  for (const dx of [-0.13, 0.13]) add(trolley, new THREE.CylinderGeometry(0.06, 0.06, 0.42, 16).rotateX(Math.PI / 2), chrome, dx, 0.13, 0);
  const cable = add(m, new THREE.CylinderGeometry(0.012, 0.012, 1, 6).translate(0, -0.5, 0), black, 0, 0, 0, false);
  const hook = new THREE.Group();
  m.add(hook);
  add(hook, new THREE.TorusGeometry(0.12, 0.045, 12, 28, Math.PI), cherry, 0, 0, 0);
  for (const s of [-1, 1]) add(hook, new THREE.CylinderGeometry(0.046, 0.046, 0.08, 14), chrome, s * 0.12, -0.04, 0);
  add(hook, new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), chrome, 0, 0.17, 0);
  const gripMat = new THREE.MeshBasicMaterial({ color: col(0.85, 0.14, 230), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const grip = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.12), gripMat);
  grip.position.set(0, -0.1, 0.06);
  hook.add(grip);
  const crane = { x: -13.8, y: 2.9, magnet: 0 };
  function placeCrane() {
    trolley.position.x = crane.x;
    cable.position.set(crane.x, CRANE_Y - 0.32, 0);
    cable.scale.y = Math.max(0.01, CRANE_Y - 0.32 - crane.y - 0.2);
    hook.position.set(crane.x, crane.y + 0.02, 0);
    gripMat.opacity = crane.magnet * (0.6 + 0.4 * Math.sin(performance.now() / 40));
  }

  /* ---------- vacuum tubes, generator and console ---------- */
  // Six glass tubes on a bench; their filaments light one by one.
  const caps = [];
  const tubeGlass = new THREE.MeshPhysicalMaterial({ color: col(0.95, 0.02, 200), roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  add(m, bx(4.7, 0.5, 0.8, 0.06), paint, -9.2, 0.25, -1.7);
  for (let i = 0; i < 6; i++) {
    const x = -11 + i * 0.72;
    add(m, new THREE.CylinderGeometry(0.22, 0.25, 0.2, 24), bakelite, x, 0.6, -1.7);
    add(m, new THREE.CapsuleGeometry(0.2, 0.6, 8, 24), tubeGlass, x, 1.2, -1.7, false);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color() });
    add(m, new THREE.CylinderGeometry(0.07, 0.07, 0.55, 12, 1, true), mat, x, 1.15, -1.7, false);
    add(m, new THREE.TorusGeometry(0.1, 0.012, 6, 20).rotateX(Math.PI / 2), mat, x, 1.38, -1.7, false);
    add(m, new THREE.CylinderGeometry(0.06, 0.04, 0.08, 12), chrome, x, 1.62, -1.7);
    caps.push(mat);
  }
  add(m, cylX(0.03, 4.4, 10), copper, -9.2, 1.7, -1.7);
  add(m, new THREE.CylinderGeometry(0.03, 0.03, 1.2, 10).rotateX(Math.PI / 2), copper, -8.5, 1.7, -1.1);
  const CAP_OFF = col(0.3, 0.05, 50), CAP_ON = col(0.86, 0.17, 58).multiplyScalar(2.8);
  // A generator behind the rack: a flywheel and a stack.
  const engine = new THREE.Group();
  engine.position.set(-14.1, 0, -2.3);
  m.add(engine);
  add(engine, bx(1.5, 0.95, 0.9, 0.12), cream, 0, 0.6, 0);
  add(engine, bx(1.55, 0.2, 0.95, 0.06), seafoam, 0, 0.9, 0);
  for (let i = 0; i < 7; i++) add(engine, bx(0.03, 0.5, 0.02), chrome, 0.78, 0.55, -0.3 + i * 0.1);
  add(engine, bx(0.3, 0.12, 0.9, 0.04), paint, -0.55, 0.06, 0);
  add(engine, bx(0.3, 0.12, 0.9, 0.04), paint, 0.55, 0.06, 0);
  add(engine, new THREE.CylinderGeometry(0.07, 0.08, 2.0, 14), black, -0.5, 2.0, -0.1);
  add(engine, new THREE.CylinderGeometry(0.11, 0.08, 0.14, 14), chrome, -0.5, 3.05, -0.1);
  const flywheel = new THREE.Group();
  flywheel.position.set(0.25, 0.65, 0.5);
  engine.add(flywheel);
  add(flywheel, new THREE.TorusGeometry(0.34, 0.05, 10, 36), cherry, 0, 0, 0);
  for (let k = 0; k < 5; k++) { const sp = add(flywheel, bx(0.04, 0.62, 0.03), chrome, 0, 0, 0); sp.rotation.z = k * TAU / 5; }
  add(flywheel, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16).rotateX(Math.PI / 2), chrome, 0, 0, 0.02);
  let flySpin = 0;
  // The console: a Bakelite case, a cream dial with numbers, jewel lamps.
  const dialTex = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#f1e9d6'; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, TAU); g.fill();
    g.strokeStyle = '#2a2420'; g.fillStyle = '#2a2420'; g.lineCap = 'round';
    g.font = 'bold 22px Gabarito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // Ticks sweep 252 degrees, matching the needle; the last band is red.
    for (let i = 0; i <= 50; i++) {
      const a = (-126 + i / 50 * 252) * Math.PI / 180, big = i % 5 === 0;
      g.lineWidth = big ? 4 : 2;
      if (i >= 40) g.strokeStyle = '#c4362a';
      g.beginPath();
      g.moveTo(w / 2 + Math.sin(a) * 112, w / 2 - Math.cos(a) * 112);
      g.lineTo(w / 2 + Math.sin(a) * (big ? 92 : 102), w / 2 - Math.cos(a) * (big ? 92 : 102));
      g.stroke();
      if (big) { g.fillStyle = i >= 40 ? '#c4362a' : '#2a2420'; g.fillText(String(i / 5), w / 2 + Math.sin(a) * 74, w / 2 - Math.cos(a) * 74); }
    }
    g.font = 'bold 16px Gabarito, sans-serif'; g.fillStyle = '#2a2420';
    g.fillText('MEGAJOULES', w / 2, w / 2 + 46);
  });
  const panel = new THREE.Group();
  panel.position.set(-9.4, 0, -1.0);
  m.add(panel);
  add(panel, bx(0.1, 1.8, 0.1, 0.03), paint, 0, 0.9, 0);
  add(panel, bx(1.0, 0.66, 0.2, 0.08), bakelite, 0, 2.1, 0);
  add(panel, new THREE.CircleGeometry(0.22, 40), new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.5 }), -0.2, 2.1, 0.105, false);
  add(panel, new THREE.TorusGeometry(0.225, 0.02, 10, 40), chrome, -0.2, 2.1, 0.11);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.19, 0.008).translate(0, 0.08, 0), new THREE.MeshBasicMaterial({ color: col(0.5, 0.2, 28) }));
  needle.position.set(-0.2, 2.1, 0.12);
  panel.add(needle);
  const lamps = [0, 1, 2].map(i => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color() });
    add(panel, new THREE.SphereGeometry(0.05, 16, 10, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2), mat, 0.16 + i * 0.12, 2.16, 0.1, false);
    add(panel, new THREE.TorusGeometry(0.055, 0.012, 8, 20), chrome, 0.16 + i * 0.12, 2.16, 0.105);
    return mat;
  });
  for (let i = 0; i < 3; i++) add(panel, bx(0.04, 0.08, 0.04, 0.01), chrome, 0.16 + i * 0.12, 1.98, 0.12);
  const LAMP = { off: col(0.3, 0.03, 60), ask: col(0.82, 0.16, 75).multiplyScalar(2), ok: col(0.82, 0.18, 145).multiplyScalar(2), no: col(0.62, 0.22, 28).multiplyScalar(2.5), live: col(0.88, 0.14, 225).multiplyScalar(2.5) };
  // Signs: the lab's name and a high-voltage warning.
  function sign(w, h, draw, x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    for (const s of [-1, 1]) add(g, bx(0.06, 1.0, 0.06, 0.02), steel, s * w * 0.38, 0.5, 0);
    add(g, bx(w, h, 0.05, 0.02), new THREE.MeshStandardMaterial({ map: canvasTex(512, Math.round(512 * h / w), draw), roughness: 0.6 }), 0, 0.95 + h / 2, 0.02);
    m.add(g);
  }
  sign(1.3, 0.62, (g, w, h) => {
    g.fillStyle = '#5fb3a6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f1e9d6'; g.fillRect(10, 10, w - 20, h - 20);
    g.strokeStyle = '#c4362a'; g.lineWidth = 6;
    // An atom: three orbits and a nucleus.
    for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(110, h / 2, 70, 24, k * Math.PI / 3, 0, TAU); g.stroke(); }
    g.fillStyle = '#c4362a'; g.beginPath(); g.arc(110, h / 2, 12, 0, TAU); g.fill();
    g.fillStyle = '#2a2420'; g.font = 'bold 54px Gabarito, sans-serif'; g.textBaseline = 'middle';
    g.fillText('STROBE', 200, h / 2 - 34); g.fillText('LAB 7', 200, h / 2 + 30);
  }, -16.2, 2.7);
  sign(1.0, 0.6, (g, w) => {
    g.fillStyle = '#e8b725'; g.fillRect(0, 0, w, 400);
    g.fillStyle = '#1d1a16'; g.font = 'bold 70px Gabarito, sans-serif'; g.textAlign = 'center';
    g.fillText('DANGER', w / 2, 90);
    g.font = 'bold 40px Gabarito, sans-serif'; g.fillText('HIGH VOLTAGE', w / 2, 150);
    g.beginPath(); g.moveTo(w / 2 + 10, 170); g.lineTo(w / 2 - 30, 240); g.lineTo(w / 2, 236); g.lineTo(w / 2 - 14, 296); g.lineTo(w / 2 + 34, 220); g.lineTo(w / 2 + 4, 224); g.closePath(); g.fill();
  }, -12.6, 2.9);

  // Arcs crackle between the twin rails while the gun charges.
  const ARCS = 8, ARC_SEG = 6, arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARCS * ARC_SEG * 2 * 3), 3));
  const arcs = new THREE.LineSegments(arcGeo, new THREE.LineBasicMaterial({ color: col(0.95, 0.12, 240).multiplyScalar(2.5) }));
  arcs.frustumCulled = false;
  arcs.visible = false;
  m.add(arcs);
  function drawArcs(c) {
    arcs.visible = c > 0.02;
    if (!arcs.visible) return;
    const p = arcGeo.attributes.position.array;
    let o = 0;
    for (let a = 0; a < ARCS; a++) {
      const on = Math.random() < c * 1.2 ? 1 : 0, x = rnd(NOSE + 0.6, MZ - 0.6);
      let px = x, py = B - 0.22;
      for (let s = 0; s < ARC_SEG; s++) {
        const nx = x + (s < ARC_SEG - 1 ? rnd(-0.07, 0.07) : 0), ny = lerp(B - 0.22, B + 0.22, (s + 1) / ARC_SEG);
        p[o++] = px * on; p[o++] = py * on; p[o++] = 0.47 * on;
        p[o++] = nx * on; p[o++] = ny * on; p[o++] = 0.47 * on;
        px = nx; py = ny;
      }
    }
    arcGeo.attributes.position.needsUpdate = true;
  }

  /* ---------- the flying slug ---------- */
  // The dart in flight is hot; a thin wake fades behind it.
  const hotBody = new THREE.MeshStandardMaterial({ color: col(0.8, 0.04, 70), roughness: 0.2, metalness: 1, emissive: new THREE.Color(0.35, 0.1, 0.02) });
  const hotBand = new THREE.MeshStandardMaterial({ color: col(0.62, 0.12, 50), roughness: 0.3, metalness: 0.95, emissive: new THREE.Color(1.2, 0.35, 0.06) });
  // In flight the fins are scorched steel, so they do not read as a red block.
  const fly = makeDart(hotBody, hotBand, steel);
  const wakeGeo = new THREE.CylinderGeometry(0.009, 0.002, 3.4, 10, 6, true), n = wakeGeo.attributes.position.count, cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const t = (wakeGeo.attributes.position.getY(i) / 3.4 + 0.5) ** 2; cols.set([0.8 * t, 0.26 * t, 0.06 * t], i * 3); }
  wakeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const wakeMesh = new THREE.Mesh(wakeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending }));
  wakeMesh.rotation.z = -Math.PI / 2;
  wakeMesh.position.x = -1.9;
  fly.add(wakeMesh);
  // The dart in flight is drawn at two thirds, so it reads as a sliver.
  fly.scale.setScalar(S * 0.66);
  fly.position.set(MUZZLE, BORE, 0);
  fly.visible = false;
  scene.add(fly);

  /* ---------- the gun state ---------- */
  // empty, loading, loaded, locking, locked, charging, fired, venting.
  const G = { s: 'empty', charge: 0, held: 0, rack: RACK_N, tray: null, carry: null, blink: [0, 0, 0], busy: 0, lever: 0 };
  const api = { group: m, state: G, hover: null, slug: fly, lever, block, rack };
  const tween = (target, { done, ...vars }) => {
    G.busy++;
    wake();
    return gsap.to(target, { ...vars, onComplete() { G.busy--; done?.(); } });
  };
  // A step out of order blinks its lamp red.
  function refuse(lamp) { G.blink[lamp] = 0.6; wake(); }
  function restock() {
    G.rack = RACK_N;
    rackSlugs.forEach((s, i) => {
      s.visible = true;
      s.position.set(RACK_X - 1.2, rackY(i), 0);
      rack.add(s);
      tween(s.position, { x: RACK_X, duration: 0.35, delay: i * 0.08, ease: 'back.out(2)' });
    });
  }
  /** The crane takes the top slug to the tray. False when the step is out of order. */
  api.load = () => {
    if (G.s !== 'empty') { refuse(G.s === 'loaded' ? 1 : 0); return false; }
    G.s = 'loading';
    const i = G.rack - 1, take = rackSlugs[i];
    const tl = gsap.timeline({ onStart: () => { G.busy++; wake(); }, onComplete: () => { G.busy--; } });
    tl.to(crane, { x: RACK_X, duration: 0.55, ease: 'power2.inOut' })
      .to(crane, { y: rackY(i) + 0.13, duration: 0.4, ease: 'power2.in' })
      .to(crane, { magnet: 1, duration: 0.1 })
      // The magnet lifts the slug off its cradle.
      .add(() => { rack.remove(take); m.add(take); G.carry = take; G.rack--; })
      .to(crane, { y: 2.85, duration: 0.45, ease: 'power2.out' })
      .to(crane, { x: TRAY_X, duration: 0.7, ease: 'power2.inOut' })
      .to(crane, { y: B + 0.13, duration: 0.45, ease: 'power2.in' })
      .add(() => { G.carry = null; G.tray = take; take.position.set(TRAY_X, B, 0); })
      .to(crane, { magnet: 0, duration: 0.15 })
      .add(() => { G.s = 'loaded'; })
      .to(crane, { y: 2.9, x: -13.8, duration: 0.6, ease: 'power2.inOut' });
    // An empty rack restocks after the last slug goes.
    if (G.rack === 1) tl.add(restock, '+=0.2');
    return true;
  };
  /** The lever shuts the breech block over the slug. */
  api.lock = () => {
    if (G.s !== 'loaded') { refuse(G.s === 'empty' ? 0 : 1); return false; }
    G.s = 'locking';
    tween(G, { lever: 1, duration: 0.55, ease: 'power3.inOut', done: () => { G.s = 'locked'; } });
    return true;
  };
  api.startCharge = () => {
    if (G.s !== 'locked') { refuse(G.s === 'empty' || G.s === 'loading' ? 0 : 1); return false; }
    G.s = 'charging';
    G.held = 0;
    wake();
    return true;
  };
  /** Ends the charge. Gives the charge from 0 to 1 when the gun fires, else null. */
  api.release = () => {
    if (G.s !== 'charging') return null;
    if (G.held < MIN_HOLD) { G.s = 'locked'; G.charge = 0; wake(); return null; }
    const c = G.charge;
    G.s = 'fired';
    G.charge = 0;
    if (G.tray) { G.tray.visible = false; m.remove(G.tray); G.tray = null; }
    wake();
    return c;
  };
  /** After the shot the block opens and the lever returns. */
  api.vent = () => {
    if (G.s !== 'fired') return;
    G.s = 'venting';
    tween(G, { lever: 0, duration: 0.8, ease: 'power2.inOut', done: () => { G.s = 'empty'; } });
  };
  const HOT_KNOB = col(0.6, 0.2, 28), HOT_BAND = col(0.6, 0.12, 50), RAIL_HOT = col(0.7, 0.18, 45), PORT_ON = col(0.88, 0.12, 215).multiplyScalar(2.6), ZERO = new THREE.Color(0);
  /**
   * Runs the charge, the lamps and the moving parts.
   * @param {number} dt Real seconds.
   * @returns {boolean} True while a machine still moves.
   */
  api.step = dt => {
    if (G.s === 'charging') { G.held += dt; G.charge = clamp(G.charge + dt / CHARGE_TIME); }
    const c = G.s === 'charging' ? G.charge : 0;
    for (const r of rails) r.material.emissive.copy(RAIL_HOT).multiplyScalar(c * c * 1.6);
    drawArcs(c);
    // The flywheel turns faster as the tubes charge.
    const target = c > 0 ? 3 + 20 * c : 0;
    flySpin += (target - flySpin) * (1 - Math.exp(-dt / (c > 0 ? 0.4 : 1.2)));
    if (flySpin < 0.05) flySpin = 0;
    flywheel.rotation.z -= flySpin * dt;
    const glow = c > 0 ? 0.25 + 0.75 * c : 0;
    ports.forEach((mat, i) => mat.color.copy(CAP_OFF).lerp(PORT_ON, clamp(glow * (0.7 + 0.3 * Math.sin(performance.now() / 60 + i * 1.7)))));
    needle.rotation.z = lerp(2.2, -2.2, c);
    caps.forEach((mat, i) => mat.color.copy(CAP_OFF).lerp(CAP_ON, clamp(c * 6 - i)));
    // Lamps: load, lock, charge. Amber asks, green is done, red refuses.
    const ask = G.s === 'empty' ? 0 : G.s === 'loaded' ? 1 : G.s === 'locked' ? 2 : -1;
    const st = [G.s !== 'empty' && G.s !== 'loading', ['locked', 'charging', 'fired'].includes(G.s), G.s === 'charging' && c >= 1];
    let blinking = false;
    lamps.forEach((mat, i) => {
      G.blink[i] = Math.max(0, G.blink[i] - dt);
      if (G.blink[i] > 0) { blinking = true; mat.color.copy(Math.floor(G.blink[i] * 10) % 2 ? LAMP.no : LAMP.off); }
      else if (i === 2 && G.s === 'charging') mat.color.copy(c >= 1 ? LAMP.ok : LAMP.live).multiplyScalar(c >= 1 ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(performance.now() / 120)));
      else mat.color.copy(st[i] ? LAMP.ok : ask === i ? LAMP.ask : LAMP.off);
    });
    // The part that takes the next step glows under the pointer.
    knobMat.emissive.copy(api.hover === 'lever' && G.s === 'loaded' ? HOT_KNOB : ZERO);
    bandMat.emissive.copy(api.hover === 'rack' && G.s === 'empty' ? HOT_BAND : ZERO);
    block.position.x = lerp(BLOCK_OPEN, BLOCK_SHUT, G.lever);
    lever.rotation.z = lerp(LEVER_OPEN, LEVER_SHUT, G.lever);
    if (G.carry) G.carry.position.set(crane.x, crane.y - 0.13, 0);
    placeCrane();
    return G.busy > 0 || G.s === 'charging' || flySpin > 0 || blinking;
  };
  api.step(0);
  return api;
}
