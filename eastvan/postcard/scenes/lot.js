// East Van postcards: the house lot on East 4th. Three cards.
// The house faces south (+z). The viewer stands in the street.
import { THREE, V, col, rng, lerp, tex, std, glow, ico, WARM } from '../kit.js';

const lampCol = col(0.84, 0.13, 68);
// Each card: a place for the camera, an hour and its weather.
export const cards = [
  { cap: 'East 4th · 4:52 pm · Rain', hour: 19.25,
    cam: { pos: [0.4, 1.2, 12.6], yaw: 0, pitch: 0, up: 31, down: 19, minHalf: 0.34 },
    sun: [-0.5, 0.55, 0.6], sunCol: col(0.7, 0.06, 260), sunI: 0.35, hemi: [col(0.5, 0.07, 262), col(0.3, 0.03, 280), 1.0],
    fog: col(0.24, 0.05, 262), fogD: 0.011,
    sky: { cloudA: 0.92, cov: 0.22, cloud: col(0.2, 0.04, 262), cloudLit: col(0.36, 0.06, 300), hazeA: 0.7, hazeK: 7, disc: 0, stars: 0, sunCol: col(0.6, 0.12, 40, 0.3) },
    exposure: 1.15, porch: 60, lamp: 400, string: 4, win: 1.9, tv: 1.1,
    rain: 0.3, rainLamp: [5.6, 8.3, 4.75], wet: true, leaves: 8, wind: -0.5, smoke: 0.2, smokeCol: col(0.45, 0.03, 262), flock: 70,
    mtn: [col(0.2, 0.045, 262), col(0.15, 0.04, 265)], ski: true,
    crow: { u: 0.859, yaw: 0.25, mode: 'rain' },
    bloom: [0.45, 0.6, 1.0], grade: { con: 1.08, sat: 1.1, vig: 0.42, grain: 0.07, lift: [0, 0.01, 0.03] } },
  { cap: 'East 4th · 3:38 pm · Low sun', hour: 17.7,
    cam: { pos: [10.2, 1.5, 0.4], yaw: 82, pitch: 0, up: 31, down: 17, minHalf: 0.42 },
    sun: [-0.92, 0.16, 0.36], sunCol: col(0.86, 0.13, 62), sunI: 4.2, hemi: [col(0.75, 0.07, 250), col(0.55, 0.08, 80), 1.15],
    fog: col(0.8, 0.09, 68), fogD: 0.0075,
    sky: { cloudA: 0.5, cov: 0.45, cloud: col(0.75, 0.05, 300), cloudLit: col(0.95, 0.1, 60), hazeA: 0.85, hazeK: 9, disc: 1, sunCol: col(0.9, 0.14, 65, 6) },
    exposure: 0.95, porch: 0, lamp: 0, string: 0.4, win: 0.5, glow: 0.35,
    leaves: 44, wind: 0.5, smoke: 0.12, smokeCol: col(0.9, 0.04, 70),
    mtn: [col(0.66, 0.07, 300), col(0.58, 0.08, 290)],
    crow: { at: [4.2, 0.03, 0.8], yaw: 1.2, mode: 'peck' },
    bloom: [0.5, 0.8, 0.9], tilt: [0.42, 0.2, 1.0], grade: { con: 1.06, sat: 1.12, vig: 0.32, grain: 0.05, lift: [0.03, 0.012, 0], gain: [1, 0.99, 0.96] } },
  { cap: 'East 4th · 7:14 am · Fog', hour: 6.6,
    cam: { pos: [-0.6, 6.42, 4.5], yaw: -15, pitch: -7, up: 19, down: 19, minHalf: 0.37 },
    sun: [0.8, 0.3, 0.45], sunCol: col(0.88, 0.07, 55), sunI: 1.4, hemi: [col(0.9, 0.03, 60), col(0.7, 0.03, 70), 1.0],
    fog: col(0.84, 0.035, 50), fogD: 0.036,
    sky: { cloudA: 0, hazeA: 1, hazeK: 0.5, disc: 0, sunCol: col(0.9, 0.08, 50, 0.6) },
    exposure: 0.95, porch: 30, lamp: 150, string: 2.5, win: 1.6, glow: 0.1,
    leaves: 5, wind: 0.15, smoke: 0.3, smokeCol: col(0.92, 0.02, 60), flock: 22, flockDir: -1, flockCol: col(0.5, 0.03, 50),
    crow: { u: 0.889, yaw: -0.2, mode: 'caw' },
    bloom: [0.4, 0.8, 0.9], tilt: [0.56, 0.16, 1.6], grade: { con: 1.04, sat: 1.05, vig: 0.3, grain: 0.06, lift: [0.02, 0.012, 0.01] } },
];

export function build(k) {
  const { box, put, win, gableHouse, fence, cart, pole, wire, tree } = k;
  const ZF = -6.5, PF = ZF + 1.8;
  const bulb = glow(0.86, 0.13, 72), lampHead = glow(0.84, 0.13, 68);

  /* ----- the house ----- */
  gableHouse({ x: 0, zf: ZF, w: 7.2, d: 9, base: 1.3, wall: 3, rise: 3.3, body: 'body', gable: 'gable' });
  // The porch: deck, skirt, columns, beam, roof.
  box('deck', 7.2, 0.14, 1.8, 0, 1.23, ZF + 0.9);
  box('found', 2.3, 1.16, 0.05, -2.45, 0.58, PF - 0.03); box('found', 3.3, 1.16, 0.05, 1.95, 0.58, PF - 0.03);
  for (const x of [-3.5, -1.3, 0.3, 3.5]) box('trim', 0.16, 2.27, 0.16, x, 2.435, PF - 0.1);
  box('trim', 7.2, 0.18, 0.18, 0, 3.66, PF - 0.1);
  box('roof', 7.7, 0.12, 2.25, 0, 4.0, ZF + 1.08, 0.22);
  for (const [a, b] of [[-3.5, -1.3], [0.3, 3.5]]) {
    box('trim', b - a, 0.07, 0.07, (a + b) / 2, 2.15, PF - 0.1); box('trim', b - a, 0.06, 0.06, (a + b) / 2, 1.45, PF - 0.1);
    for (let x = a + 0.17; x < b - 0.05; x += 0.17) box('trim', 0.035, 0.66, 0.035, x, 1.8, PF - 0.1);
  }
  for (const x of [-3.5, 3.5]) box('trim', 0.07, 0.07, 1.6, x, 2.15, ZF + 0.85);
  // The stairs, with two rails.
  for (let i = 1; i <= 5; i++) { const h = 1.3 - i * 0.2167; box('deck', 1.5, h, 0.29, -0.5, h / 2, PF + (i - 0.5) * 0.29); }
  for (const x of [-1.3, 0.3]) { box('trim', 0.07, 0.07, 1.9, x, 1.56, PF + 0.72, 0.69); box('trim', 0.12, 1.0, 0.12, x, 0.5, PF + 1.5); }
  // The front wall: door, window, bay, attic window.
  box('door', 0.95, 2.05, 0.06, -0.5, 2.325, ZF + 0.03);
  box('trim', 1.15, 0.1, 0.1, -0.5, 3.4, ZF + 0.04); box('trim', 0.1, 2.05, 0.1, -1.03, 2.325, ZF + 0.04); box('trim', 0.1, 2.05, 0.1, 0.03, 2.325, ZF + 0.04);
  box('winLit', 0.42, 0.5, 0.03, -0.5, 2.9, ZF + 0.06);
  win('winDim', 1.0, 1.5, -2.45, 2.8, ZF + 0.03);
  box('trim', 2.3, 2.0, 0.5, 2.0, 2.8, ZF + 0.25); box('roof', 2.5, 0.1, 0.72, 2.0, 3.85, ZF + 0.3, 0.12);
  box('winDim', 0.03, 1.4, 0.3, 0.84, 2.9, ZF + 0.27); box('winDim', 0.03, 1.4, 0.3, 3.16, 2.9, ZF + 0.27);
  box('trim', 0.06, 1.4, 0.06, 1.37, 2.9, ZF + 0.52); box('trim', 0.06, 1.4, 0.06, 2.63, 2.9, ZF + 0.52);
  win('winTV', 1.0, 1.1, 0, 5.4, ZF + 0.03);
  put(bulb, new THREE.SphereGeometry(0.07, 10, 8), 0.28, 3.2, ZF + 0.14);
  // A couch on the porch.
  box('couch', 1.6, 0.32, 0.62, -2.45, 1.52, ZF + 0.5); box('couch', 1.6, 0.5, 0.16, -2.45, 1.86, ZF + 0.2);
  box('couch', 0.16, 0.44, 0.62, -3.2, 1.66, ZF + 0.5); box('couch', 0.16, 0.44, 0.62, -1.7, 1.66, ZF + 0.5);
  box('brick', 0.62, 2.5, 0.62, 1.9, 6.85, -12.5); box('conc', 0.74, 0.1, 0.74, 1.9, 8.12, -12.5);
  k.smoke(1.9, 8.15, -12.5);
  for (const z of [-9, -12.6]) { win('winDim', 1.0, 1.4, 3.61, 2.8, z, true); win('winDim', 1.0, 1.4, -3.61, 2.8, z, true); }
  win('winLit', 0.9, 0.5, 3.61, 0.8, -8, true);
  // The bay window: curtains, and a cat on the sill.
  const bayMat = std(0.2, 0.03, 250, { roughness: 0.25, emissive: WARM, noCast: true, emissiveMap: tex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(1, '#ff9d4a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,40,20,0.55)';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(46, 0); g.quadraticCurveTo(40, 70, 8, h); g.lineTo(0, h); g.fill();
    g.beginPath(); g.moveTo(w, 0); g.lineTo(w - 46, 0); g.quadraticCurveTo(w - 40, 70, w - 8, h); g.lineTo(w, h); g.fill();
    g.fillStyle = '#1a0d08';
    g.beginPath(); g.ellipse(150, 112, 22, 20, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(150, 84, 11, 0, 7); g.fill();
    g.beginPath(); g.moveTo(140, 80); g.lineTo(142, 66); g.lineTo(149, 76); g.moveTo(160, 80); g.lineTo(158, 66); g.lineTo(151, 76); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#1a0d08'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(170, 122); g.quadraticCurveTo(196, 120, 190, 100); g.stroke();
  }) });
  put(bayMat, new THREE.PlaneGeometry(1.9, 1.4), 2.0, 2.9, ZF + 0.51);
  const plateMat = new THREE.MeshStandardMaterial({ roughness: 0.7, map: tex(128, 56, (g, w, h) => {
    g.fillStyle = '#f3ead8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1c1c1c'; g.font = '700 44px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('1687', w / 2, h / 2 + 3);
  }) });
  plateMat.userData.noCast = true;
  put(plateMat, new THREE.PlaneGeometry(0.32, 0.14), 0.28, 2.85, ZF + 0.02);

  /* ----- the neighbours and the street ----- */
  // Left: a boxy two-storey with a balcony and a low roof.
  box('brick', 8, 2.7, 1.2, -10.2, 1.35, -6.6);
  gableHouse({ x: -10.2, zf: -7.2, w: 8, d: 11, base: 2.7, wall: 2.6, rise: 1.15, body: 'stucco', found: 'brick', ov: 0.6 });
  box('iron', 8, 0.05, 0.05, -10.2, 3.62, -6.05);
  for (let x = -14.1; x <= -6.2; x += 0.44) box('iron', 0.03, 0.9, 0.03, x, 3.16, -6.05);
  win('winLit', 3.0, 1.6, -10.2, 4.0, -7.17); win('winDim', 1.5, 1.0, -12.2, 1.5, -5.97);
  box('door', 0.9, 2.0, 0.06, -8.3, 1.0, -5.98);
  // Right: a taller gabled house.
  gableHouse({ x: 10.3, zf: -6, w: 6.6, d: 9, base: 1.0, wall: 3.1, rise: 3.6, body: 'purple' });
  box('deck', 6.6, 0.14, 1.6, 10.3, 0.93, -5.2); box('roof', 7, 0.12, 1.95, 10.3, 3.72, -5.1, 0.2);
  for (const x of [7.15, 9.2, 11.4, 13.45]) box('trim', 0.15, 2.5, 0.15, x, 2.25, -4.5);
  for (let i = 1; i <= 4; i++) { const h = 1.0 - i * 0.2; box('deck', 1.4, h, 0.29, 10.3, h / 2, -4.4 + (i - 0.5) * 0.29); }
  box('door', 0.95, 2.05, 0.06, 10.3, 2.02, -5.97);
  win('winLit', 1.1, 1.5, 8.3, 2.6, -5.97); win('winDim', 1.1, 1.5, 12.3, 2.6, -5.97); win('winDim', 1.0, 1.1, 10.3, 5.3, -5.97);
  win('winDim', 1.0, 1.4, 6.99, 2.6, -8.5, true);
  // The rows down both sides of the street.
  {
    const R = rng(41), keys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const row = (x, zf, dir) => {
      const w = 6.4 + R() * 1.2, base = 0.8 + R() * 0.6, wall = 2.8 + R() * 0.5, body = keys[Math.floor(R() * 6)];
      gableHouse({ x, zf, w, d: 9, base, wall, rise: 2.4 + R() * 1.4, body, dir });
      box('deck', w, 0.14, 1.6, x, base - 0.07, zf + dir * 0.8); box('roof', w + 0.3, 0.12, 1.95, x, base + 2.55, zf + dir * 0.9, dir * 0.2);
      win(R() < 0.5 ? 'winLit' : 'winDim', 1.1, 1.4, x - 1.7, base + 1.5, zf + dir * 0.03); win('winDim', 1.1, 1.4, x + 1.7, base + 1.5, zf + dir * 0.03);
    };
    for (let x = -20.5; x > -120; x -= 10) row(x, -6.3 - R(), 1);
    for (let x = 20.7; x < 80; x += 10) row(x, -6.3 - R(), 1);
    for (let x = -115; x < 50; x += 10) row(x + 3, 21 + R(), -1);
    // Tall firs stand behind the roofs.
    for (let i = 0; i < 9; i++) {
      const x = -34 + i * 8.5 + R() * 4, z = -19 - R() * 8, h = 11 + R() * 8;
      put('fir', new THREE.ConeGeometry(2.2 + R(), h, 7), x, 2 + h / 2, z); put('bark', new THREE.CylinderGeometry(0.25, 0.3, 2.4, 6), x, 1.2, z);
    }
  }

  /* ----- ground, yard, bins ----- */
  box('lawn', 700, 0.2, 264, 0, -0.1, -129);
  box('lawn', 700, 0.2, 60, 0, -0.1, 44);
  box('road', 700, 0.1, 11.2, 0, -0.2, 8.5);
  k.wetRoad(700, 11, 0, -0.145, 8.5);
  box('walk', 700, 0.04, 1.5, 0, 0.005, 0.45); box('walk', 700, 0.04, 1.5, 0, 0.005, 16.55);
  box('curb', 700, 0.19, 0.18, 0, -0.055, 3.0); box('curb', 700, 0.19, 0.18, 0, -0.055, 14.0);
  box('conc', 1.4, 0.04, 2.95, -0.5, 0.006, -1.75);
  fence(-5, -0.55, -1.3, -0.55); fence(0.3, -0.55, 5, -0.55); fence(-5, -0.55, -5, -6.5); fence(5, -0.55, 5, -6.5);
  // A raised bed with winter kale.
  box('wood', 2.6, 0.36, 1.2, 2.9, 0.18, -2.3); box('soil', 2.44, 0.05, 1.04, 2.9, 0.37, -2.3);
  for (let i = 0; i < 8; i++) put('kale', new THREE.ConeGeometry(0.17, 0.42, 6), 1.95 + (i % 4) * 0.62, 0.58, -2.55 + Math.floor(i / 4) * 0.5, Math.PI);
  put('bush', ico(1.1, 0.8, 1.0), -3.8, 0.7, -5.4); put('bush', ico(0.7, 0.55, 0.7), -2.6, 0.45, -5.0);
  // Collection day: two carts, a box and a bag at the curb.
  cart('binK', 6.5, 2.5); cart('binG', 7.25, 2.5, 0.1);
  box('binB', 0.52, 0.3, 0.4, 7.95, 0.15, 2.55); put('bagY', ico(0.22, 0.2, 0.2), 8.5, 0.19, 2.6);

  /* ----- pole, lamp, wires ----- */
  const PX = 5.6, PZ = 2.2, PW = -40.4, PE = 51.6, LAMP = V(PX, 8.3, 4.75);
  for (const x of [PW, PX, PE]) pole(x, PZ);
  put('steel', new THREE.CylinderGeometry(0.3, 0.3, 0.85, 10), PX - 0.44, 7.9, PZ);
  box('steel', 0.07, 0.07, 2.5, PX, 8.25, 3.45, -0.1); box('steel', 0.3, 0.1, 0.62, PX, 8.42, LAMP.z);
  box(lampHead, 0.22, 0.03, 0.44, PX, 8.36, LAMP.z + 0.02);
  box('iron', 0.3, 0.42, 0.2, PX - 1.1, 5.95, PZ + 0.22);
  let perch;
  for (const [dz, y, sag, r] of [[-1, 10.15, 0.45, 0.018], [0, 10.62, 0.45, 0.018], [1, 10.15, 0.45, 0.018], [0.18, 8.9, 0.55, 0.018], [0.2, 7.7, 0.65, 0.02], [0.22, 6.5, 0.85, 0.022], [0.22, 6.05, 0.9, 0.018]]) {
    const w = wire(V(PW, y, PZ + dz), V(PX, y, PZ + dz), sag, r);
    wire(V(PX, y, PZ + dz), V(PE, y, PZ + dz), sag, r);
    if (y === 6.5) perch = w;
  }
  wire(V(PX, 7.7, PZ), V(3.3, 4.75, ZF + 0.3), 0.35, 0.02, 0.03);
  wire(V(PX, 7.7, PZ), V(9.0, 5.0, -5.8), 0.3, 0.02, 0.03);
  wire(V(PW, 7.7, PZ), V(-13.5, 5.6, -7), 0.5, 0.02, 0.03);

  /* ----- trees and leaves ----- */
  const TX = -4.4, TZ = 2.1;
  tree(TX, TZ, 7, { hero: true });
  for (let x = -112, i = 0; x < 80; x += 12, i++) {
    if (Math.abs(x - TX) > 8 && Math.abs(x - PX) > 5) tree(x, TZ, 100 + i);
    tree(x + 5, 14.95, 200 + i);
  }
  // Leaf litter: round the tree, along the gutter, on the lawns.
  k.litter(380, R => { const a = R() * 6.2832, r = Math.sqrt(-2 * Math.log(1 - R() * 0.98)) * 2.3, z = TZ + Math.sin(a) * r; return [TX + Math.cos(a) * r * 1.5, z > 3.1 && z < 13.9 ? -0.14 : 0.03, z]; });
  k.litter(140, R => [-16 + R() * 28, -0.14, 3.2 + R() * R() * 1.3], 4);
  k.litter(100, R => [-14 + R() * 28, 0.03, -5 + R() * 7.5], 5);
  k.fall(48, R => [TX + (R() - 0.5) * 5.5, 4 + R() * 4, TZ + (R() - 0.5) * 5]);

  /* ----- lights ----- */
  // A string of coloured bulbs under the porch roof.
  const BULBS = [col(0.65, 0.22, 28), col(0.8, 0.17, 85), col(0.7, 0.19, 145), col(0.62, 0.16, 250), col(0.65, 0.22, 340)];
  const stringMat = new THREE.MeshBasicMaterial(), o = new THREE.Object3D();
  const string = new THREE.InstancedMesh(new THREE.SphereGeometry(0.038, 8, 6), stringMat, 26);
  for (let i = 0; i < 26; i++) {
    const u = i / 25;
    o.position.set(lerp(-3.55, 3.55, u), 3.5 - Math.abs(Math.sin(u * Math.PI * 5)) * 0.1, PF + 0.02); o.updateMatrix();
    string.setMatrixAt(i, o.matrix); string.setColorAt(i, BULBS[i % 5]);
  }
  // The porch lamp: a shadowed cone for the yard, a small glow for the wall.
  const porchSpot = new THREE.SpotLight(WARM, 0, 16, 1.3, 0.6, 1.6);
  porchSpot.position.set(-0.5, 3.45, ZF + 1.0);
  porchSpot.target.position.set(-0.5, 0, ZF + 3.4);
  porchSpot.castShadow = true;
  porchSpot.shadow.mapSize.set(1024, 1024);
  porchSpot.shadow.bias = -0.002;
  const porchGlow = new THREE.PointLight(WARM, 0, 4.5, 2);
  porchGlow.position.set(0.28, 3.0, ZF + 0.4);
  const lampLight = new THREE.SpotLight(lampCol, 0, 34, 1.15, 0.9, 1.7);
  lampLight.position.copy(LAMP);
  lampLight.target.position.set(PX, 0, LAMP.z + 0.8);
  k.group.add(string, porchSpot, porchSpot.target, porchGlow, lampLight, lampLight.target);

  const crow = k.crow();
  k.onCard(c => {
    porchSpot.intensity = c.porch; porchGlow.intensity = c.porch * 0.12; lampLight.intensity = c.lamp;
    bulb.color.copy(WARM).multiplyScalar(c.porch ? 6 : 0.4);
    lampHead.color.copy(lampCol).multiplyScalar(0.3 + c.lamp * 0.03);
    stringMat.color.setScalar(c.string);
    bayMat.emissiveIntensity = c.win;
  });
  k.onFrame((t, c) => {
    // The crow rides the wire, or stands where the card puts it.
    if (c.crow.at) crow.obj.position.set(...c.crow.at); else { crow.obj.position.copy(k.wireAt(perch, c.crow.u, t)); crow.obj.position.y += 0.02; }
    crow.pose(t, c.crow.mode, c.crow.yaw);
  });
}
