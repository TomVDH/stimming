// East Van postcards: the station at Commercial and Broadway. One card, at night.
// Broadway runs east to west. The guideway crosses over it at x = 0.
// The viewer stands on the centre line, east of the station, and looks west.
import { THREE, V, M, col, rng, signTex, std, glow, mergeGeometries } from '../kit.js';

const SOD = col(0.82, 0.14, 62), COOL = col(0.92, 0.035, 235);
const RED = col(0.6, 0.23, 28), AMB = col(0.82, 0.16, 78), GRN = col(0.8, 0.17, 162);
// P: the loop period, in seconds.
const P = 44;

export const cards = [
  { cap: 'The station · 10:15 pm · Drizzle', hour: 22,
    cam: { pos: [44, 1.6, 0.8], yaw: 90, pitch: 0, up: 27, down: 13, minHalf: 0.36, upMax: 38 },
    // The cloud hides the moon: the lamps do the work.
    sun: [0.4, 0.7, 0.5], sunCol: col(0.7, 0.05, 255), sunI: 0.25, hemi: [col(0.42, 0.06, 285), col(0.3, 0.05, 60), 0.85],
    fog: col(0.2, 0.045, 325), fogD: 0.009,
    sky: { cloudA: 0.95, cov: 0.2, cloud: col(0.19, 0.04, 320), cloudLit: col(0.3, 0.06, 45), hazeA: 0.8, hazeK: 6, disc: 0, stars: 0, sunCol: col(0.6, 0.1, 50, 0.2) },
    exposure: 1.15, lamp: 460, plat: 110, under: 90, win: 1.4,
    rain: 0.18, rainLamp: [26, 9.3, -7.6], wet: true, leaves: 0, wind: -0.3, smoke: 0,
    shadow: { at: [20, 0, 0], r: 45 },
    bloom: [0.6, 0.7, 0.95], grade: { con: 1.08, sat: 1.12, vig: 0.4, grain: 0.07, lift: [0.006, 0.006, 0.028] } },
];

export function build(k) {
  const { box, put, wire, person } = k;
  const R = rng(61), pick = a => a[Math.floor(R() * a.length)];
  // RW: half the road width. WZ: the building line. PLAT: the platform floor.
  const RW = 9.6, WZ = 13.1, PLAT = 9.4, PY = -0.12;
  const gm = std(0.6, 0.012, 90), hoopM = std(0.72, 0.03, 240, { roughness: 0.5 }), houseM = std(0.5, 0.015, 250), dark = std(0.16, 0.012, 265);
  const paintW = std(0.85, 0.01, 90, { noCast: true }), paintY = std(0.8, 0.13, 92, { noCast: true });
  const glassM = std(0.75, 0.03, 230, { transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false, noCast: true });
  const lampHead = glow(0.82, 0.14, 62, 5), coolG = glow(0.92, 0.035, 235, 4), shopCool = glow(0.9, 0.04, 220, 1.1);
  const headG = glow(0.97, 0.02, 90, 6), tailG = glow(0.6, 0.23, 28, 3.5);
  const sigR = glow(0.6, 0.23, 28), sigA = glow(0.82, 0.16, 78), sigG = glow(0.8, 0.17, 162);
  // A face that glows with its own picture.
  const lit = (map, s = 1.4) => { const m = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(s, s, s) }); m.userData.noCast = true; return m; };

  /* ----- ground: six wet lanes, two walks, one cross street ----- */
  box('road', 700, 0.1, RW * 2 + 0.2, 0, -0.2, 0);
  k.wetRoad(700, RW * 2, 0, -0.145, 0);
  for (const s of [-1, 1]) {
    box('road', 12, 0.1, 190, -52, -0.2, s * (RW + 95));
    for (const [cx, len] of [[77, 246], [-154, 192]]) { box('walk', len, 0.04, 3.5, cx, 0.005, s * 11.35); box('curb', len, 0.19, 0.18, cx, -0.055, s * RW); }
    box(paintY, 400, 0.012, 0.12, -110, PY, s * 0.14);
  }
  box('conc', 13, 0.1, 150, 0, -0.05, -88);
  // Lane dashes, the zebra crossing and two stop lines.
  for (let x = -148; x < 64; x += 9) for (const z of [-6.4, -3.2, 3.2, 6.4]) if (Math.abs(x - 22) > 4) box(paintW, 3, 0.012, 0.13, x, PY, z);
  for (let z = -9; z <= 9.01; z += 1.2) box(paintW, 3, 0.012, 0.6, 22, PY, z);
  box(paintW, 0.4, 0.012, 9.3, 24.6, PY, -4.8); box(paintW, 0.4, 0.012, 9.3, 19.4, PY, 4.8);

  /* ----- the guideway and the platform ----- */
  box(gm, 8, 1.4, 320, 0, 8.2, 0); box(gm, 13, 1.5, 60, 0, 8.2, 0);
  for (const s of [-1, 1]) {
    box(gm, 3, 0.5, 60, s * 5, 9.15, 0);
    box(hoopM, 0.1, 0.1, 60, s * 6.42, 11.55, 0);
    // Round columns stand on the walks, clear of the lanes.
    for (let i = 0; i < 7; i++) {
      const z = s * (11.2 + i * 22.4);
      put(gm, new THREE.CylinderGeometry(0.85, 0.85, 6.3, 14), 0, 3.15, z); box(gm, i ? 8 : 13, 1.2, 1.7, 0, 6.88, z);
    }
    for (const x of [-3, 3]) box(coolG, 0.5, 0.06, 0.5, x, 7.4, s * 9);
  }
  // The canopy: steel hoops, a shell above, glass screens below.
  const shellOut = std(0.3, 0.02, 250), ceil = new THREE.MeshBasicMaterial({ color: col(0.8, 0.04, 235, 0.45), side: THREE.BackSide });
  ceil.userData.noCast = true;
  const shell = () => new THREE.CylinderGeometry(6.52, 6.52, 60, 24, 1, true, 2.007, 2.269).rotateX(Math.PI / 2).scale(1, 0.6, 1);
  put(shellOut, shell(), 0, 11.6, 0); put(ceil, shell(), 0, 11.6, 0);
  for (let z = -30; z <= 30; z += 6) {
    put(hoopM, new THREE.TorusGeometry(6.5, 0.1, 5, 18, Math.PI).scale(1, 0.6, 1), 0, 11.6, z);
    for (const s of [-1, 1]) {
      box(hoopM, 0.14, 2.2, 0.14, s * 6.42, 10.5, z);
      if (z < 30) { box(glassM, 0.04, 2, 5.8, s * 6.42, 10.4, z + 3); box(coolG, 0.14, 0.07, 4.2, s * 4.6, 13.2, z + 3); }
    }
  }
  // The name board hangs on the east edge. It is a place name.
  put(lit(signTex('COMMERCIAL–BROADWAY', { w: 1024, h: 80, bg: '#0c1a30', fg: '#eaf2ff', font: '700 60px ui-monospace, monospace' })), new THREE.PlaneGeometry(10, 0.78), 6.56, 8.45, 0, 0, Math.PI / 2);
  // The station house, south of the street; a glazed stair climbs its east wall.
  box(houseM, 16, 9.3, 17, -1, 4.65, 21.6); box(shopCool, 11, 3.2, 0.08, -1, 1.9, WZ - 0.03);
  box(houseM, 2.6, 2.6, 16.45, 8.3, 5.95, 21.25, -0.608); box(shopCool, 0.05, 1.5, 15.6, 9.62, 6.05, 21.25, -0.608);

  /* ----- the street walls: low shops, flats above ----- */
  const signs = [['NIGHT OWL PIZZA', '#2a0808', '#ff6a4d'], ['SALMONBERRY CAFE', '#06231f', '#7dffd8'], ['GOLDEN CRANE NOODLE', '#2b1d02', '#ffcf5a'], ['RAINCOAT RECORDS', '#160a2e', '#c9a2ff'], ['PHARMACY', '#04162e', '#8fd0ff'], ['LATE GROCER', '#f3ead8', '#b3261e']]
    .map(([t, bg, fg]) => lit(signTex(t, { w: 512, h: 64, bg, fg, font: '700 44px ui-monospace, monospace' })));
  const bodies = ['brick', 'stucco', 'found', 'h5', 'h4', std(0.36, 0.02, 265)], shopG = [glow(0.88, 0.09, 75, 1.1), shopCool, 'winDim', glow(0.8, 0.1, 350, 0.9)];
  // One row of fronts from x1 west to x0. side is 1 on the south.
  const row = (side, x1, x0) => {
    for (let x = x1; x > x0 + 6;) {
      const w = Math.min(x - x0, 9 + R() * 9), n = 1 + Math.floor(R() * R() * 4), h = 4.6 + (n - 1) * 3.2, cx = x - w / 2, zf = side * WZ, zo = zf - side * 0.04;
      box(pick(bodies), w - 0.3, h, 16, cx, h / 2, zf + side * 8); box('trim', w - 0.2, 0.25, 0.3, cx, h, zf);
      box(pick(shopG), w - 1.6, 2.2, 0.08, cx, 1.5, zo);
      put(pick(signs), new THREE.PlaneGeometry(Math.min(w - 2, 6), 0.75), cx, 3.35, zf - side * 0.06, 0, side > 0 ? Math.PI : 0);
      for (let f = 1; f < n; f++) for (let wx = cx - w / 2 + 1.6; wx < cx + w / 2 - 1; wx += 2.7) box(R() < 0.3 ? 'winLit' : 'winDim', 1.3, 1.6, 0.06, wx, 3 + f * 3.2, zo);
      // A blade sign reaches over the walk and faces east.
      if (R() < 0.45) { const bx = cx + (R() - 0.5) * w * 0.5; box('iron', 0.1, 0.56, 1.6, bx, 4.1, zf - side * 0.95); put(pick(signs), new THREE.PlaneGeometry(1.5, 0.46), bx + 0.06, 4.1, zf - side * 0.95, 0, Math.PI / 2); }
      x -= w;
    }
  };
  row(-1, 60, 6.5); row(-1, -6.5, -46); row(-1, -58, -150);
  row(1, 60, 10.5); row(1, -9, -46); row(1, -58, -150);
  // The bus shelter: a roof, a glass back, a lit panel, a bench.
  box('steel', 5, 0.08, 1.6, 11.5, 2.5, -11.9); box(glassM, 5, 2, 0.04, 11.5, 1.4, -12.65);
  for (const x of [9.05, 13.95]) for (const z of [-12.65, -11.15]) box('steel', 0.07, 2.5, 0.07, x, 1.25, z);
  box('iron', 0.14, 1.9, 1.3, 14.1, 1.25, -11.9); box(glow(0.82, 0.12, 190, 1.8), 0.04, 1.7, 1.15, 14.18, 1.25, -11.9);
  box('wood', 3, 0.06, 0.4, 11, 0.5, -12.3); box('binK', 0.55, 0.95, 0.55, 15.3, 0.5, -10.5);

  /* ----- people: dark shapes, some under umbrellas ----- */
  const coats = [std(0.17, 0.015, 265), std(0.24, 0.05, 25), std(0.22, 0.04, 150), std(0.8, 0.15, 95)], sk = std(0.3, 0.035, 50);
  const brM = [std(0.2, 0.02, 265), std(0.5, 0.19, 27), std(0.8, 0.02, 230)];
  const who = (x, z, ry, y = 0.03, br = false, stride = 0) => {
    person(pick(coats), x, z, ry, y, { h: 1.6 + R() * 0.25, skin: sk, stride });
    if (!br) return;
    put(pick(brM), new THREE.ConeGeometry(0.58, 0.2, 10), x + 0.12, y + 2.05, z);
    put('iron', new THREE.CylinderGeometry(0.012, 0.012, 0.95, 4), x + 0.26, y + 1.52, z + 0.08);
  };
  const HP = Math.PI / 2;
  who(10, -12, HP); who(11.2, -11.9, 0.4); who(12.6, -12.1, HP);
  who(21.2, -10.3, 0, 0.03, true); who(22.6, -10.7, 0.3, 0.03, true); who(22, 10.4, Math.PI, 0.03, true); who(20.6, 10.9, 2.8);
  who(4, -10.6, HP, 0.03, true); who(2.5, -11.6, 1.2);
  who(-12, -11.2, -HP, 0.03, false, 0.35); who(-20, 11.3, HP, 0.03, true, 0.35); who(16, 11.6, -HP, 0.03, false, 0.35);
  // Riders wait on both platforms.
  for (let i = 0; i < 8; i++) who(4.4 + R() * 1.3, -24 + i * 6.5 + R() * 2, R() < 0.7 ? -HP : HP, PLAT);
  for (let i = 0; i < 4; i++) who(-5 - R(), -15 + i * 9, HP, PLAT);

  /* ----- poles, sodium lamps, trolley wires ----- */
  const SX = [66, 26, -14, -54, -94, -134];
  SX.forEach((x, i) => {
    for (const s of [-1, 1]) put('steel', new THREE.CylinderGeometry(0.11, 0.15, 9.6, 8), x, 4.8, s * 10.4);
    wire(V(x, 6.6, -10.4), V(x, 6.6, 10.4), 0.5, 0.012, 0.02);
    if (i) for (const z of [-8.3, -7.7, 7.7, 8.3]) wire(V(SX[i - 1], 5.8, z), V(x, 5.8, z), 0.1, 0.012, 0.015);
    // The lamps alternate from side to side.
    const s = i % 2 ? -1 : 1;
    box('steel', 0.08, 0.08, 2.9, x, 9.45, s * 9); box('steel', 0.34, 0.12, 0.7, x, 9.42, s * 7.6); box(lampHead, 0.26, 0.04, 0.5, x, 9.35, s * 7.6);
  });
  // A signal head: red, amber, green. Its lamps face east.
  const disc = () => new THREE.CylinderGeometry(0.13, 0.13, 0.04, 12).rotateZ(Math.PI / 2);
  const sig = (x, y, z) => { box(dark, 0.3, 1.2, 0.42, x, y, z); put(sigR, disc(), x + 0.16, y + 0.38, z); put(sigA, disc(), x + 0.16, y, z); put(sigG, disc(), x + 0.16, y - 0.38, z); };
  // A mast with an arm over the westbound lanes.
  for (const x of [24.2, -45.4]) {
    put('steel', new THREE.CylinderGeometry(0.1, 0.13, 6.6, 8), x, 3.3, -10.5); box('steel', 0.12, 0.12, 7.6, x, 6.4, -6.7);
    sig(x, 5.55, -4.8); sig(x, 3.3, -10.05);
  }
  // The eastbound mast shows its back.
  put('steel', new THREE.CylinderGeometry(0.1, 0.13, 6.6, 8), 19.8, 3.3, 10.5); box('steel', 0.12, 0.12, 7.6, 19.8, 6.4, 6.7); box(dark, 0.3, 1.2, 0.42, 19.8, 5.55, 4.8);

  /* ----- the things that move ----- */
  // Collects parts by material; done() makes one mesh for each.
  const kitOf = () => {
    const parts = new Map(), g = new THREE.Group();
    const add = (m, geo, x = 0, y = 0, z = 0) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(geo.translate(x, y, z)); };
    const b = (m, w, h, d, x, y, z) => add(m, new THREE.BoxGeometry(w, h, d), x, y, z);
    const done = () => { for (const [m, list] of parts) { const mesh = new THREE.Mesh(mergeGeometries(list), m); mesh.castShadow = !m.userData.noCast; g.add(mesh); } return g; };
    return { add, b, done };
  };
  // The train: four white cars. The head is the -z end.
  const trainW = std(0.9, 0.01, 230, { roughness: 0.5, emissive: col(0.5, 0.02, 235), emissiveIntensity: 0.2 }), trainB = std(0.42, 0.13, 255);
  const cabin = glow(0.93, 0.04, 100, 1.5), tr = kitOf(), CL = 12.6;
  for (let c = 0; c < 4; c++) {
    const z = (c - 1.5) * (CL + 0.5);
    tr.b(trainW, 2.5, 3, CL, 0, 1.9, z); tr.b(trainB, 2.52, 0.3, CL + 0.02, 0, 1.15, z); tr.b(dark, 2.2, 0.4, CL - 1.2, 0, 0.25, z);
    tr.b(cabin, 2.54, 0.9, CL - 1.2, 0, 2.35, z);
    for (const dz of [-3.1, 3.1]) tr.b(cabin, 2.55, 1.9, 1.2, 0, 1.8, z + dz);
    for (let i = 0; i < 8; i++) tr.b(dark, 2.57, 0.92, 0.16, 0, 2.35, z - 4.9 + i * 1.4);
  }
  for (const x of [-0.8, 0.8]) { tr.b(headG, 0.3, 0.2, 0.08, x, 1, -25.98); tr.b(tailG, 0.3, 0.2, 0.08, x, 1, 25.98); }
  const train = tr.done();
  train.position.set(2, 8.9, 70);
  // The bus: two sections and a bellows. The front is the -x end.
  const busBody = std(0.86, 0.01, 240, { roughness: 0.5 }), busSkirt = std(0.42, 0.12, 255, { roughness: 0.5 }), busWin = glow(0.9, 0.04, 200, 1.5);
  const amber = { bg: '#120a00', fg: '#ffb020', font: '700 60px ui-monospace, monospace' }, bu = kitOf();
  for (const [len, cx] of [[11, -3.5], [6, 6]]) { bu.b(busBody, len, 2.75, 2.55, cx, 1.72, 0); bu.b(busSkirt, len + 0.02, 0.7, 2.57, cx, 0.75, 0); bu.b(busWin, len - 0.8, 0.95, 2.58, cx, 2.2, 0); }
  bu.b(dark, 1.1, 2.6, 2.35, 2.5, 1.7, 0); bu.b(dark, 0.06, 1.1, 2.2, 9.01, 2.1, 0); bu.b(busWin, 0.06, 1.2, 2.25, -9.01, 2, 0);
  for (let x = -8.2; x < 8.6; x += 1.45) if (Math.abs(x - 2.5) > 0.9) bu.b(dark, 0.16, 0.97, 2.6, x, 2.2, 0);
  for (const z of [-0.95, 0.95]) { bu.b(headG, 0.08, 0.16, 0.32, -9.02, 0.8, z); bu.b(tailG, 0.08, 0.3, 0.2, 9.02, 1, z); bu.b(tailG, 0.08, 0.12, 0.2, 9.02, 2.95, z); }
  for (const x of [-6.6, 0.6, 6.9]) for (const z of [-1.2, 1.2]) bu.add(dark, new THREE.CylinderGeometry(0.48, 0.48, 0.3, 10).rotateX(Math.PI / 2), x, 0.48, z);
  bu.add(lit(signTex('EXPRESS', { w: 320, h: 64, ...amber }), 1.8), new THREE.PlaneGeometry(1.9, 0.38).rotateY(-Math.PI / 2), -9.03, 2.9, 0);
  bu.add(lit(signTex('77', { w: 128, h: 64, ...amber }), 1.8), new THREE.PlaneGeometry(0.7, 0.36).rotateY(Math.PI / 2), 9.03, 2.75, 0.6);
  // Bus A heads west and stops; bus B heads east and passes.
  const busA = bu.done(), busB = busA.clone();
  busA.position.set(76, -0.14, -8); busB.position.set(-230, -0.14, 8); busB.rotation.y = Math.PI;
  // One car heads west on the green.
  const cc = kitOf(), carM = std(0.4, 0.13, 25, { roughness: 0.5 });
  cc.b(carM, 4.3, 0.62, 1.75, 0, 0.62, 0); cc.b(carM, 2.4, 0.55, 1.58, 0.2, 1.2, 0); cc.b(M.winDim, 2.44, 0.4, 1.62, 0.2, 1.22, 0);
  for (const z of [-0.62, 0.62]) { cc.b(tailG, 0.06, 0.14, 0.36, 2.16, 0.72, z); cc.b(headG, 0.06, 0.14, 0.3, -2.16, 0.7, z); }
  for (const x of [-1.4, 1.4]) for (const z of [-0.8, 0.8]) cc.add(dark, new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10).rotateX(Math.PI / 2), x, 0.32, z);
  const car = cc.done();
  car.position.set(76, -0.14, -4.8);

  /* ----- lights ----- */
  // The near sodium lamp casts the one shadow.
  const lamp1 = new THREE.SpotLight(SOD, 0, 42, 1.15, 0.9, 1.7), lamp2 = new THREE.SpotLight(SOD, 0, 42, 1.15, 0.9, 1.7);
  lamp1.position.set(26, 9.3, -7.6); lamp1.target.position.set(26, 0, -6.6);
  lamp1.castShadow = true;
  lamp1.shadow.mapSize.set(1024, 1024);
  lamp1.shadow.bias = -0.002;
  lamp2.position.set(-14, 9.3, 7.6); lamp2.target.position.set(-14, 0, 6.6);
  // Two cool lights for the platform, one under the deck.
  const platA = new THREE.PointLight(COOL, 0, 40, 1.6), platB = new THREE.PointLight(COOL, 0, 40, 1.6), under = new THREE.PointLight(COOL, 0, 28, 1.7);
  platA.position.set(5, 12.9, -13); platB.position.set(5, 12.9, 13); under.position.set(3, 6.8, -7.5);
  k.group.add(train, busA, busB, car, lamp1, lamp1.target, lamp2, lamp2.target, platA, platB, under);

  k.onCard(c => {
    lamp1.intensity = c.lamp; lamp2.intensity = c.lamp * 0.8;
    platA.intensity = platB.intensity = c.plat; under.intensity = c.under;
  });
  k.onFrame(t => {
    const s = t % P;
    // The train brakes into the platform, waits, then pulls out north.
    const zt = s < 4 ? 70 : s < 14 ? 70 * (1 - (s - 4) / 10) ** 2 : s < 26 ? 0 : s < 36 ? -70 * ((s - 26) / 10) ** 2 : -70;
    train.position.z = zt; train.visible = Math.abs(zt) < 69.5;
    // Bus A comes from behind the viewer, stops, then leaves into the haze.
    busA.position.x = s < 9 ? 6 + 70 * (1 - s / 9) ** 2 : s < 22 ? 6 : 6 - 236 * ((s - 22) / 22) ** 1.7;
    busB.position.x = -230 + 9.5 * ((s + P - 14) % P);
    const c = (s + P - 26) % P;
    car.position.x = 76 - 13 * c; car.visible = c < 24.5;
    // The signal holds red while the bus and the train wait.
    const go = s >= 20 || s < 7, warn = s >= 7 && s < 9.5;
    sigG.color.copy(GRN).multiplyScalar(go ? 6 : 0.1);
    sigA.color.copy(AMB).multiplyScalar(warn ? 6 : 0.1);
    sigR.color.copy(RED).multiplyScalar(go || warn ? 0.1 : 6);
  });
}
