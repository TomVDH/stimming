// Phaeton rig: the strobe studio, the bench, the gun, the flash heads, the slug.
// Units are metres. The slug flies along +x; the camera looks from +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { linFit } from '../shared/stim.js';

export const TABLE = { x0: -1.55, x1: 1.3, z: 0.5, y: 0 };
export const BORE = 0.3, MUZZLE = -0.8, SPEED = 380;
export const SLOTS = [-0.45, -0.19, 0.07, 0.33, 0.59, 0.85];
// The row's hue runs from the accent's orange to its blue, through red.
export const hueAt = i => (55 - (i / (SLOTS.length - 1)) * 147 + 360) % 360;
export const col = (L, C, h) => new THREE.Color().setRGB(...linFit(L, C, h), THREE.LinearSRGBColorSpace);

const std = (L, C, h, rough, metal = 0) => new THREE.MeshStandardMaterial({ color: col(L, C, h), roughness: rough, metalness: metal });
const MAT = {
  table: std(0.055, 0.006, 265, 0.5),
  anod: std(0.2, 0.012, 265, 0.42, 0.85),
  black: std(0.12, 0.005, 265, 0.5, 0.2),
  chrome: std(0.92, 0.005, 250, 0.1, 1),
  copper: std(0.68, 0.11, 50, 0.24, 1),
  brass: std(0.78, 0.09, 88, 0.3, 1),
  cream: std(0.9, 0.035, 90, 0.4),
  rubber: std(0.14, 0.004, 265, 0.75),
  cherry: std(0.48, 0.19, 25, 0.35),
  can: std(0.3, 0.05, 255, 0.3, 0.6),
};
export { MAT };

function mesh(geo, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w, h, d, r = 0.004) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
const rod = (r, len, seg = 20) => new THREE.CylinderGeometry(r, r, len, seg);

/* ---------- the room ---------- */
// The softboxes exist only as reflections: two back strips, a top panel, a low front fill.
function softboxes(renderer) {
  const room = new THREE.Scene();
  const panel = (w, h, x, y, z, power) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(power, power, power), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0.3, 0);
    room.add(m);
  };
  panel(0.55, 2.6, -2.6, 1.3, -1.9, 26);
  panel(0.55, 2.6, 2.6, 1.3, -1.9, 26);
  panel(2.6, 1.1, 0, 3.1, 0.4, 7);
  panel(1.6, 0.5, 0, 0.5, 3.6, 1.6);
  // A wide dim fill gives every glass face a faint sheen.
  panel(5, 3, 0.8, 2.4, 3.2, 0.7);
  // A grid of small hot lamps gives the glass many crisp glints.
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) panel(0.11, 0.11, -1.9 + i * 0.34, 1.7 + j * 0.34, 2.6, 70);
  for (let i = 0; i < 5; i++) panel(0.08, 0.5, 1.2 + i * 0.3, 2.2, 1.6, 40);
  const gen = new THREE.PMREMGenerator(renderer), env = gen.fromScene(room, 0).texture;
  gen.dispose();
  room.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return env;
}

/**
 * The scene, its lights, and one call that sets every light level.
 * @param {THREE.WebGLRenderer} renderer
 */
export function makeStudio(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environment = softboxes(renderer);
  // The key is the flash: hard, with the one shadow.
  const key = new THREE.SpotLight(0xffffff, 0, 8, 0.9, 0.4, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 6;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.0015;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffffff, 0);
  scene.add(rim, rim.target);
  const heads = [];
  /**
   * @param {number} lit The flash and the house lights, 0 to 1 and over.
   * @param {number} dim The modelling light, 0 to 1.
   * @param {number} x The x the lights aim at.
   * @param {number} tight 0 for the wide shot, 1 for a photo.
   * @param {number} hue The rim hue in degrees.
   */
  function light(lit, dim, x, tight, hue) {
    key.intensity = 30 * lit + 2 * dim;
    key.angle = 0.9 - 0.62 * tight;
    key.position.set(x - 0.55, 1.2, 1.3);
    key.target.position.set(x, 0.24, 0);
    rim.intensity = 5 * lit + 0.6 * dim;
    rim.color.copy(col(0.78, 0.15, hue));
    rim.position.set(x + 0.6, 0.7, -1.2);
    rim.target.position.set(x, 0.28, 0);
    scene.environmentIntensity = 1.0 * lit + 0.22 * dim;
    for (const h of heads) h.color.setScalar(0.04 + 34 * lit + 0.5 * dim);
  }
  return { scene, key, rim, heads, light };
}

/* ---------- the bench ---------- */
// The ruler on the rail: a tick per centimetre, a number per ten.
function rulerMap() {
  const c = document.createElement('canvas');
  c.width = 4096; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#17181c';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#cfd3da';
  g.font = '600 22px Gabarito, sans-serif';
  g.textBaseline = 'top';
  const cm = c.width / 250;
  for (let i = 0; i <= 250; i++) {
    const x = Math.round(i * cm), ten = i % 10 === 0, five = i % 5 === 0;
    g.fillRect(x, c.height - (ten ? 30 : five ? 20 : 12), ten ? 3 : 2, 30);
    if (ten && i < 250) g.fillText(String(i), x + 6, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The table, the optical rail, and a carrier and a post for each slot. */
export function makeBench(scene) {
  const g = new THREE.Group();
  const W = TABLE.x1 - TABLE.x0, cx = (TABLE.x0 + TABLE.x1) / 2;
  mesh(box(W, 0.05, TABLE.z * 2, 0.006), MAT.table, cx, -0.025, 0, g, false);
  // The rail: a dovetail bar with a ruler on its top face.
  mesh(box(2.5, 0.028, 0.09, 0.003), MAT.anod, -0.12, 0.014, 0, g);
  mesh(box(2.5, 0.012, 0.05, 0.002), MAT.anod, -0.12, 0.034, 0, g);
  const ruler = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.016), new THREE.MeshStandardMaterial({ map: rulerMap(), roughness: 0.45, metalness: 0.6 }));
  ruler.rotation.x = -Math.PI / 2;
  ruler.position.set(-0.12, 0.0282, 0.036);
  ruler.receiveShadow = true;
  g.add(ruler);
  SLOTS.forEach((x, i) => {
    // The carriers carry the row's colour.
    const anod = new THREE.MeshStandardMaterial({ color: col(0.6, 0.15, hueAt(i)), roughness: 0.38, metalness: 0.9 });
    mesh(box(0.07, 0.03, 0.12, 0.004), anod, x, 0.049, 0, g);
    const knob = mesh(rod(0.009, 0.022, 24), MAT.chrome, x + 0.018, 0.049, 0.068, g);
    knob.rotation.x = Math.PI / 2;
    mesh(rod(0.0045, 0.115), MAT.chrome, x, 0.1215, 0, g);
  });
  scene.add(g);
  return g;
}

/* ---------- the gun ---------- */
/** A first pass: two copper rails in a ceramic sandwich, a breech, a capacitor bank. */
export function makeGun(scene) {
  const g = new THREE.Group(), x0 = -1.36, len = MUZZLE - x0, mid = (x0 + MUZZLE) / 2;
  // The base plate rides the rail on two carriers.
  for (const x of [x0 + 0.1, MUZZLE - 0.1]) mesh(box(0.08, 0.03, 0.12, 0.004), MAT.anod, x, 0.049, 0, g);
  mesh(box(len + 0.04, 0.018, 0.15, 0.004), MAT.black, mid, 0.073, 0, g);
  for (const x of [x0 + 0.12, mid, MUZZLE - 0.12]) mesh(box(0.024, BORE - 0.082 - 0.045, 0.06, 0.004), MAT.black, x, (BORE - 0.045 + 0.082) / 2, 0, g);
  // The barrel: copper above and under the bore, ceramic at the sides.
  for (const s of [-1, 1]) {
    mesh(box(len, 0.016, 0.03, 0.002), MAT.copper, mid, BORE + s * 0.019, 0, g);
    mesh(box(len - 0.03, 0.022, 0.008, 0.002), MAT.cream, mid - 0.01, BORE, s * 0.012, g);
  }
  // Clamp frames hold the sandwich shut against the shot.
  for (let i = 0; i < 6; i++) {
    const x = x0 + 0.1 + (i / 5) * (len - 0.2);
    for (const s of [-1, 1]) {
      mesh(box(0.03, 0.012, 0.075, 0.003), MAT.black, x, BORE + s * 0.034, 0, g);
      mesh(box(0.03, 0.08, 0.012, 0.003), MAT.black, x, BORE, s * 0.032, g);
      mesh(rod(0.004, 0.008, 12), MAT.chrome, x, BORE + 0.043, s * 0.022, g);
    }
  }
  // The muzzle: a chrome collar.
  const collar = mesh(new THREE.TorusGeometry(0.03, 0.006, 16, 40), MAT.chrome, MUZZLE, BORE, 0, g);
  collar.rotation.y = Math.PI / 2;
  // The breech block, with a lever knob for the later loading step.
  mesh(box(0.11, 0.12, 0.1, 0.008), MAT.black, x0 - 0.02, BORE, 0, g);
  const lever = mesh(rod(0.005, 0.11), MAT.chrome, x0 - 0.02, BORE + 0.1, 0.03, g);
  lever.rotation.x = 0.35;
  mesh(new THREE.SphereGeometry(0.014, 24, 16), MAT.cherry, x0 - 0.02, BORE + 0.152, 0.049, g);
  // The capacitor bank and its two leads.
  const lamps = [];
  for (let i = 0; i < 6; i++) {
    const x = x0 + 0.02 + (i % 3) * 0.085, z = -0.2 - Math.floor(i / 3) * 0.085;
    mesh(rod(0.034, 0.17, 32), MAT.can, x, 0.085, z, g);
    mesh(rod(0.036, 0.008, 32), MAT.chrome, x, 0.174, z, g);
    mesh(rod(0.006, 0.02, 12), MAT.brass, x, 0.188, z, g);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.012, 0.004) }));
    lamp.position.set(x + 0.02, 0.181, z + 0.018);
    g.add(lamp);
    lamps.push(lamp.material);
  }
  const lead = (z, mat) => {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0 + 0.1, 0.2, -0.24), new THREE.Vector3(x0 + 0.05, 0.3, -0.2),
      new THREE.Vector3(x0 - 0.02, 0.34, -0.1), new THREE.Vector3(x0 - 0.02, BORE + 0.02, z),
    ]);
    return mesh(new THREE.TubeGeometry(path, 40, 0.007, 10), mat, 0, 0, 0, g);
  };
  lead(-0.055, MAT.cherry);
  lead(-0.05, MAT.rubber).position.x = 0.03;
  scene.add(g);
  return { group: g, lamps };
}

/* ---------- the flash heads ---------- */
/** Two strobe heads behind the table. Their tubes glow with the flash. */
export function makeHeads(scene, studio) {
  const profile = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; profile.push(new THREE.Vector2(0.025 + 0.085 * Math.sqrt(t), 0.11 * t)); }
  for (const [x, y, z] of [[-0.6, 0.95, -0.9], [1.15, 0.85, -0.85]]) {
    const head = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), new THREE.MeshStandardMaterial({ color: col(0.9, 0.004, 250), roughness: 0.28, metalness: 1, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI / 2;
    head.add(dish);
    const body = new THREE.Mesh(rod(0.045, 0.16, 28), MAT.black);
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.08;
    head.add(body);
    const tube = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 10, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.04, 0.04, 0.04) }));
    tube.position.z = 0.012;
    head.add(tube);
    studio.heads.push(tube.material);
    head.position.set(x, y, z);
    head.lookAt(x * 0.3 + 0.2, 0.3, 0);
    scene.add(head);
    // The heads hang from above, so no stand crosses a photo.
    const pole = new THREE.Mesh(rod(0.009, 3), MAT.black);
    pole.position.set(x, y + 1.56, z - 0.06);
    scene.add(pole);
  }
}

/* ---------- the slug ---------- */
/** A hot copper slug with a short glowing wake. */
export function makeSlug(scene) {
  const g = new THREE.Group();
  const hot = new THREE.MeshStandardMaterial({ color: col(0.7, 0.1, 55), roughness: 0.25, metalness: 1, emissive: new THREE.Color(0.5, 0.13, 0.02) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 16), hot);
  body.rotation.z = -Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.012, 16), hot);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 0.017;
  // The wake fades to its tail through vertex colours.
  const wakeGeo = new THREE.CylinderGeometry(0.0016, 0.0003, 0.26, 10, 6, true), n = wakeGeo.attributes.position.count, cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const t = (wakeGeo.attributes.position.getY(i) / 0.26 + 0.5) ** 2; cols.set([1.1 * t, 0.36 * t, 0.08 * t], i * 3); }
  wakeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const wake = new THREE.Mesh(wakeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending }));
  wake.rotation.z = -Math.PI / 2;
  wake.position.x = -0.141;
  g.add(body, nose, wake);
  g.visible = false;
  g.position.set(MUZZLE, BORE, 0);
  scene.add(g);
  return g;
}
