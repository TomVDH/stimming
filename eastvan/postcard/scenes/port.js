// East Van postcards: the port, seen from the hill. One card.
// The street runs downhill to the north.
// The quay is y = 0.
// The water lies 1.5 m lower.
import { THREE, V, M, col, rng, tex, ridgeTex, std, glow, ico, mergeGeometries, WARM } from '../kit.js';

// The hill is one ramp.
// It meets the flat port at z = ZB.
const S = 0.146, ZB = -30, TH = Math.atan(S), C = Math.cos(TH), SN = Math.sin(TH);
const sy = z => (z - ZB) * S;
const RED = col(0.6, 0.23, 28);

export const cards = [
  { cap: 'The port · 4:25 pm · Last light', hour: 18.4,
    cam: { pos: [0, 28.61, 155], yaw: 0, pitch: -3, up: 11, down: 12, minHalf: 0.15 },
    // The sun stands high enough to clear the west roofs.
    sun: [-0.74, 0.22, 0.6], sunCol: col(0.84, 0.14, 58), sunI: 4.2, hemi: [col(0.72, 0.07, 262), col(0.52, 0.07, 50), 1.1],
    fog: col(0.79, 0.085, 45), fogD: 0.0015,
    sky: { cloudA: 0.2, cov: 0.55, cloud: col(0.62, 0.07, 330), cloudLit: col(0.9, 0.1, 35), hazeA: 0.85, hazeK: 7, disc: 1, sunCol: col(0.9, 0.14, 60, 5) },
    exposure: 0.95, win: 1.2, glow: 0.3, porch: 14,
    wet: true, rain: 0, leaves: 30, wind: 0.5, smoke: 0.14, smokeCol: col(0.92, 0.04, 60), flock: 60, flockDir: 1,
    mtn: [col(0.72, 0.09, 20), col(0.6, 0.08, 330)], ski: true,
    shadow: { at: [0, 20, 95], r: 40 },
    bloom: [0.45, 0.7, 0.9], tilt: [0.5, 0.27, 0.8], grade: { con: 1.06, sat: 1.12, vig: 0.34, grain: 0.05, lift: [0.03, 0.01, 0.01], gain: [1, 0.98, 0.96] } },
];

export function build(k) {
  const { box, put, at, win, gableHouse, pole, wire, tree } = k;
  const R = rng(58), pick = a => a[Math.floor(R() * a.length)];
  // A strip of the hill.
  // Its top runs from z0 down to z1.
  const ramp = (m, w, x, z0, z1, lift = 0, th = 0.4) =>
    box(m, w, th, (z0 - z1) / C, x, sy((z0 + z1) / 2) + lift - th / 2 * C, (z0 + z1) / 2 + th / 2 * SN, -TH);

  /* ----- the hill and the street ----- */
  // A cross street cuts the rows between X0 and X1.
  const TOP = 230, X0 = 104, X1 = 112;
  for (const [z0, z1] of [[TOP, X1], [X0, ZB]]) for (const s of [-1, 1]) {
    ramp('lawn', 345, s * 178.1, z0, z1);
    ramp('curb', 0.3, s * 5.75, z0, z1, 0.03);
    ramp('conc', 1.5, s * 7.6, z0, z1, 0.04, 0.3);
  }
  ramp('road', 11.6, 0, TOP, ZB, -0.15);
  ramp('road', 700, 0, X1, X0, -0.15);
  ramp(std(0.8, 0.13, 90, { noCast: true }), 0.14, 0, TOP, ZB, -0.13, 0.1);
  ramp('trim', 5, 2.9, 113.2, 112.7, -0.13, 0.1);
  // The stop sign: a red octagon on a white rim.
  const octagon = (r, t) => new THREE.CylinderGeometry(r, r, t, 8).rotateY(Math.PI / 8).rotateX(Math.PI / 2);
  put('steel', new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), 6.4, sy(113.6) + 1.3, 113.6);
  put('trim', octagon(0.42, 0.02), 6.4, sy(113.6) + 2.45, 113.63);
  put(std(0.52, 0.2, 27), octagon(0.38, 0.03), 6.4, sy(113.6) + 2.45, 113.66);

  // A parked car that leans with the hill.
  // k.car stays level, so it does not fit here.
  const car = (m, x, z) => {
    const y0 = sy(z) - 0.15, b = (mm, w, h, d, ly, lz) => box(mm, w, h, d, x, y0 + ly * C + lz * SN, z - ly * SN + lz * C, -TH);
    b(m, 1.75, 0.62, 4.3, 0.62, 0); b(m, 1.58, 0.55, 2.4, 1.2, 0.2);
    b('winDim', 1.62, 0.4, 2.2, 1.22, 0.2); b('winDim', 1.36, 0.4, 2.44, 1.22, 0.2);
    for (const lz of [-1.4, 1.4]) for (const dx of [-0.8, 0.8]) put('binK', new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10).rotateZ(Math.PI / 2), x + dx, y0 + 0.32 * C + lz * SN, z - 0.32 * SN + lz * C);
  };
  for (const [m, x, z] of [['trim', 4.7, 125], ['door', 4.7, 92], ['binB', 4.7, 66], ['steel', 4.7, 34], ['couch', -4.7, 137], ['iron', -4.7, 95], ['trim', -4.7, 71], ['binG', -4.7, 46]]) car(m, x, z);

  /* ----- the houses ----- */
  const keys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'purple'], lit = () => (R() < 0.45 ? 'winLit' : 'winDim');
  const bulb = glow(0.86, 0.13, 72, 5), lamps = [];
  // One lot: s is 1 on the east side.
  // The front faces the street.
  // The foundation sinks into the hill, so no wall floats.
  const house = (s, zc, extra) => {
    const w = 6.2 + R() * 0.8, base = 1.5 + R() * 0.4, wall = 2.8 + R() * 0.5, rise = 2.5 + R() * 1.2, y0 = sy(zc) - 0.75;
    at(s * 12.5, y0, zc, () => {
      gableHouse({ x: 0, zf: 0, w, d: 9, base, wall, rise, body: pick(keys) });
      // The porch: a block, two steps, two posts, a roof.
      box('found', w, base, 1.6, 0, base / 2, 0.8);
      for (const i of [1, 2]) box('deck', 1.4, base - i * 0.35, 0.5, 0, (base - i * 0.35) / 2, 1.35 + i * 0.5);
      for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) box('trim', 0.15, 2.5, 0.15, x, base + 1.25, 1.5);
      box('roof', w + 0.3, 0.12, 1.95, 0, base + 2.55, 0.9, 0.2);
      box('door', 0.95, 2.05, 0.06, 0, base + 1.03, 0.03);
      win(lit(), 1.1, 1.4, -1.9, base + 1.5, 0.03); win(lit(), 1.1, 1.4, 1.9, base + 1.5, 0.03);
      win(lit(), 0.9, 1.0, 0, base + wall + rise * 0.38, 0.03);
      // The south wall faces the camera.
      for (const z of [-2.6, -6.2]) win(lit(), 1.0, 1.3, s * (w / 2 + 0.01), base + 1.5, z, true);
      box('brick', 0.6, 1.8, 0.6, 1.2, base + wall + rise * 0.6 + 0.5, -5);
      put('bush', ico(0.9, 0.7, 0.9), pick([-2.3, 2.3]), 1, 2.9);
      if (extra === 'lamp') put(bulb, new THREE.SphereGeometry(0.09, 8, 6), 0.9, base + 2.25, 0.2);
    }, -s * Math.PI / 2);
    if (extra === 'smoke') k.smoke(s * 17.5, y0 + base + wall + rise * 0.6 + 1.45, zc + s * 1.2);
    if (extra === 'lamp') {
      const p = new THREE.PointLight(WARM, 0, 9, 2);
      p.position.set(s * 11.6, y0 + base + 2.1, zc + s * 0.9);
      k.group.add(p); lamps.push(p);
    }
  };
  const EXTRA = { '-118': 'lamp', '-78': 'lamp', '88': 'smoke', '-58': 'smoke' };
  for (const s of [-1, 1]) {
    for (let z = 168; z > 115; z -= 10) house(s, z, EXTRA[s * z]);
    for (let z = 98; z > 15; z -= 10) house(s, z, EXTRA[s * z]);
  }

  /* ----- trees, poles, wires ----- */
  // Trees stay near the camera: far crowns would hide the port.
  const T = (x, z, seed, o) => at(x, sy(z) - 0.05, z, () => tree(0, 0, seed, o));
  T(-6.35, 146, 7, { hero: true, size: 0.85 }); T(-6.35, 124, 8, { hero: true, size: 0.6 }); T(6.35, 100, 9, { size: 0.45 });
  k.litter(300, P => { const z = 100 + P() * 52, s = P() < 0.5 ? -1 : 1; return [s * (5.5 - P() * P() * 3), sy(z) - 0.13, z]; }, 4);
  k.litter(120, P => { const z = 120 + P() * 30; return [-10 + P() * 4, sy(z) + 0.05, z]; }, 5);
  k.fall(40, P => [-6.35 + (P() - 0.5) * 5, sy(124) + 2 + P() * 3, 124 + (P() - 0.5) * 2.4], sy(124) - 0.1);
  // The poles run down the west side.
  const PZ = [158, 118, 78, 38, -2], PX = -6.3;
  for (const z of PZ) at(PX, sy(z) - 0.05, z, () => pole(0, 0, 10.6, 'x'));
  for (let i = 0; i < 4; i++) for (const [dx, h, sag, r] of [[-1, 10.15, 0.5, 0.018], [0, 10.62, 0.5, 0.018], [1, 10.15, 0.5, 0.018], [0.2, 8.9, 0.6, 0.02], [0.22, 7.7, 0.7, 0.022], [0.22, 6.9, 0.9, 0.02]])
    wire(V(PX + dx, sy(PZ[i]) + h, PZ[i]), V(PX + dx, sy(PZ[i + 1]) + h, PZ[i + 1]), sag, r);
  // Service drops run to the gables.
  for (const [pz, s, hz] of [[118, 1, 118], [118, -1, 118], [78, -1, 78], [38, -1, 38]]) wire(V(PX, sy(pz) + 7.7, pz), V(s * 12.5, sy(hz) + 4.6, hz + 1.6), 0.35, 0.016, 0.03);

  /* ----- the port: ground, rail, shed, boxes ----- */
  const yard = std(0.4, 0.014, 255, { noCast: true }), ballast = std(0.56, 0.02, 70, { noCast: true }), under = std(0.2, 0.01, 260);
  const lampG = glow(0.9, 0.09, 80, 4), whiteG = glow(0.95, 0.02, 90, 4), redA = glow(0.6, 0.23, 28, 3), redB = glow(0.6, 0.23, 28, 3), xa = glow(0.6, 0.23, 28, 0.35), xb = glow(0.6, 0.23, 28, 0.35);
  box(yard, 1400, 4, 100, 0, -2, -68);
  // The pier: its west face is the berth.
  const Q = 20;
  box(yard, 690, 4, 76, Q + 345, -2, -155);
  box(ballast, 1400, 0.4, 16, 0, 0, -41);
  for (const z of [-36, -41, -46]) box('soil', 1400, 0.2, 1.7, 0, 0.22, z);
  box('road', 11.6, 0.4, 27, 0, 0.16, -39.5);
  // Crossing signals at the foot of the street.
  for (const s of [-1, 1]) {
    put('steel', new THREE.CylinderGeometry(0.07, 0.07, 4.2, 6), s * 7.2, 2.5, -27.5);
    for (const a of [-0.7, 0.7]) box('trim', 1.9, 0.26, 0.06, s * 7.2, 4.2, -27.45, 0, 0, a);
    box('iron', 1.5, 0.12, 0.1, s * 7.2, 3.2, -27.48);
    box(xa, 0.4, 0.4, 0.2, s * 7.2 - 0.5, 3.2, -27.4); box(xb, 0.4, 0.4, 0.2, s * 7.2 + 0.5, 3.2, -27.4);
  }
  // The long shed: its gable end looks east.
  at(-9, 0, -61, () => {
    gableHouse({ x: 0, zf: 0, w: 14, d: 53, base: 0, wall: 4.5, rise: 1.7, body: std(0.7, 0.03, 220), roof: std(0.42, 0.09, 35), ov: 0.3 });
    for (let i = 0; i < 4; i++) box(under, 0.1, 3.6, 5, -7.03, 1.8, -8 - i * 12);
  }, Math.PI / 2);
  // Container colours: oxide, blue, green, orange, grey, white, teal.
  const BOXES = [std(0.45, 0.13, 32), std(0.45, 0.11, 255), std(0.5, 0.1, 150), std(0.66, 0.16, 55), std(0.6, 0.01, 250), std(0.9, 0.01, 95), std(0.5, 0.08, 200)];
  for (let i = -5; i <= 5; i++) for (let b = 0; b < 3; b++) {
    // The middle columns stay low: the water shows over them.
    const mid = Math.abs(i) <= 1;
    if (i < 0 ? b === 0 || mid : mid && b > 0) continue;
    for (let r = 0; r < 3; r++) {
      const n = mid ? 1 + Math.floor(R() * 2) : 2 + Math.floor(R() * 4);
      for (let j = 0; j < n; j++) box(pick(BOXES), 12.2, 2.6, 2.44, 1.5 + i * 12.8, 1.3 + j * 2.6, -60 - b * 14 - r * 2.6);
    }
  }
  // Yard light masts.
  for (const [x, z] of [[-28, -69.5], [22, -69.5], [66, -69.5], [78, -140], [100, -165]]) {
    put('steel', new THREE.CylinderGeometry(0.25, 0.4, 36, 6), x, 18, z);
    box('steel', 5, 0.6, 1.2, x, 36.2, z); box(lampG, 4.6, 0.25, 1, x, 35.85, z);
  }

  /* ----- grain silos and the headhouse ----- */
  const pale = std(0.84, 0.02, 85);
  for (let i = 0; i < 5; i++) put(pale, new THREE.CylinderGeometry(4.25, 4.25, 34, 16), -42 - i * 8.5, 17, -103);
  box(pale, 44, 4, 6, -59, 36, -103);
  box(pale, 9, 52, 10, -33, 26, -103); box('roof', 9.6, 0.5, 10.6, -33, 52.2, -103);
  for (const y of [20, 30, 40, 48]) for (const dx of [-2.2, 2.2]) box('winLit', 1.4, 1.8, 0.1, -33 + dx, y, -97.95);

  /* ----- gantry cranes ----- */
  // Each crane stands in profile.
  // Its boom reaches west over the berth.
  const craneM = std(0.6, 0.19, 38);
  const crane = zc => {
    for (const dz of [-9, 9]) {
      for (const x of [Q + 3, Q + 27]) box(craneM, 1.5, 39, 1.5, x, 19.5, zc + dz);
      box(craneM, 25.5, 1.3, 1.3, Q + 15, 15, zc + dz);
      box(craneM, 33.2, 0.9, 0.9, Q + 15, 26.5, zc + dz, 0, 0, -0.764);
    }
    for (const x of [Q + 3, Q + 27]) { box(craneM, 1.3, 1.3, 18, x, 6, zc); box(craneM, 1.3, 1.3, 18, x, 38.3, zc); }
    box(craneM, 82, 2.2, 3.4, Q - 3, 40, zc);
    // The A-frame and its two stays.
    box(craneM, 1.2, 20, 1.2, Q + 6, 50.5, zc, 0, 0, -0.306); box(craneM, 1.2, 20.7, 1.2, Q + 13, 50.5, zc, 0, 0, 0.399);
    box(craneM, 50.7, 0.5, 0.5, Q - 14.5, 50.5, zc, 0, 0, 0.384); box(craneM, 33, 0.5, 0.5, Q + 22.5, 50.5, zc, 0, 0, -0.613);
    box('trim', 11, 4.6, 6, Q + 24, 43.4, zc);
    box(redA, 0.9, 0.9, 0.9, Q + 9, 60.6, zc); box(redA, 0.8, 0.8, 0.8, Q - 43.5, 41.5, zc);
    for (const x of [Q - 30, Q - 12, Q + 6]) box(lampG, 1, 0.5, 0.3, x, 39.3, zc + 1.85);
  };
  for (const z of [-124, -150, -176]) crane(z);
  // The trolley cab of the near crane.
  // It hangs under the boom.
  const trolley = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 3.6), M.trim), cabWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 0.1), M.winLit);
  cabWin.position.set(0, 0.3, 1.82);
  const rig = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(6.2, 0.5, 2.6).translate(0, -4.7, 0), new THREE.BoxGeometry(0.12, 3.05, 0.12).translate(-1.3, -2.93, 0), new THREE.BoxGeometry(0.12, 3.05, 0.12).translate(1.3, -2.93, 0)]), under);
  trolley.add(cab, cabWin, rig);
  trolley.position.set(Q - 19, 37.5, -124);
  k.group.add(trolley);

  /* ----- the inlet: ship, tug, far shore, water ----- */
  const hull = std(0.22, 0.02, 262), band = std(0.5, 0.17, 28), SZ = -225;
  // The ship lies at anchor past the pier, stern to the east.
  box(hull, 90, 10, 14, -25, 6, SZ); box(band, 90.2, 3, 14.2, -25, -0.5, SZ);
  for (let i = 0; i < 6; i++) { const n = 2 + Math.floor(R() * 3); for (let j = 0; j < n; j++) box(pick(BOXES), 12.2, 2.6, 12.6, -63.5 + i * 12.6, 12.3 + j * 2.6, SZ); }
  box('trim', 10, 17, 13, 11, 19.5, SZ); box('trim', 7, 3, 15, 11, 29.5, SZ);
  box('winLit', 6, 1.1, 0.1, 11, 29.7, SZ + 7.52);
  for (const y of [14, 18, 22, 26]) box('winLit', 8, 0.6, 0.1, 11, y, SZ + 6.52);
  box(hull, 3, 22, 5, 17.8, 22, SZ); box(band, 3.1, 2, 5.1, 17.8, 31, SZ);
  put('steel', new THREE.CylinderGeometry(0.2, 0.2, 7, 6), 11, 34.5, SZ);
  box(whiteG, 0.9, 0.9, 0.9, 11, 38.4, SZ); box(redB, 0.9, 0.9, 0.9, 17.8, 33.45, SZ);
  // The tug.
  box(hull, 11, 2.6, 4.6, -8, -0.4, -186); box('gable', 4.6, 2.8, 3.4, -9, 2.3, -186);
  box('winLit', 3, 0.7, 0.1, -9, 3, -184.28);
  put(hull, new THREE.CylinderGeometry(0.45, 0.45, 2.2, 8), -4.4, 2, -186);
  box(whiteG, 0.6, 0.6, 0.6, -9, 4, -186);
  // The north shore: a low dark strip with its first lights.
  box(std(0.38, 0.05, 300, { noCast: true }), 1400, 6, 40, 0, 1, -320);
  for (let i = 0; i < 36; i++) box(lampG, 1.3, 1.1, 0.3, -220 + R() * 480, 0.8 + R() * 2.6, -299.8);
  // The water mirrors the scene.
  // A plain sea lies just below it.
  box(std(0.25, 0.04, 250, { noCast: true }), 1600, 2, 600, 0, -2.6, -400);
  k.wetRoad(1600, 600, 0, -1.5, -400, col(0.22, 0.035, 250));
  // Two sheets of pale streaks drift apart: the shimmer.
  const g1 = tex(256, 256, (g, w, h) => {
    const P = rng(5);
    g.fillStyle = '#fff';
    for (let i = 0; i < 46; i++) { g.globalAlpha = 0.25 + P() * 0.6; g.beginPath(); g.ellipse(P() * w, P() * h, 8 + P() * 22, 4 + P() * 5, 0, 0, 7); g.fill(); }
  }, { rx: 12, ry: 5 });
  const g2 = g1.clone();
  g2.repeat.set(9, 4); g2.needsUpdate = true;
  const sea = new THREE.PlaneGeometry(1600, 600).rotateX(-Math.PI / 2);
  for (const [t, y] of [[g1, -1.4], [g2, -1.3]]) {
    const m = new THREE.Mesh(sea, new THREE.MeshBasicMaterial({ map: t, color: col(0.9, 0.07, 50), transparent: true, opacity: 0.3, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    m.position.set(0, y, -400);
    k.group.add(m);
  }
  // One more ridge, far and tall.
  // Snow lies above a set height.
  const snow = tex(4, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#ffd6c8'); gr.addColorStop(0.48, '#f4b3a6'); gr.addColorStop(0.56, '#b596ad'); gr.addColorStop(1, '#a08fb0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  snow.wrapT = THREE.ClampToEdgeWrapping;
  const ridge = new THREE.Mesh(new THREE.PlaneGeometry(1700, 150), new THREE.MeshBasicMaterial({ map: snow, alphaMap: ridgeTex(14, false), alphaTest: 0.5, alphaToCoverage: true, fog: false }));
  ridge.position.set(0, 71, -560);
  k.group.add(ridge);

  /* ----- the freight train ----- */
  // The engine leads at x = 0.
  // The cars trail to the east.
  const train = new THREE.Group(), parts = new Map();
  const tp = (m, g, x, y) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g.translate(x, y, 0)); };
  const tb = (m, w, h, d, x, y) => tp(m, new THREE.BoxGeometry(w, h, d), x, y);
  const locoM = std(0.36, 0.07, 160), tankM = std(0.18, 0.01, 260), hopM = std(0.62, 0.03, 80);
  tb(locoM, 17, 3, 2.9, 0, 2.6); tb(locoM, 3.2, 1.1, 3, -4, 4.65); tb(std(0.82, 0.15, 90), 17.05, 0.4, 2.95, 0, 1.5);
  tb(whiteG, 0.3, 0.4, 0.8, -8.6, 3.6);
  for (const dx of [-5, 5]) tb(under, 4, 1.1, 2.6, dx, 0.55);
  for (let i = 1; i <= 16; i++) {
    const cx = 1.3 + i * 15.4, type = Math.floor(R() * 5);
    tb(under, 14, 0.3, 2.6, cx, 0.95);
    for (const dx of [-4.8, 4.8]) tb(under, 2.4, 0.8, 2.4, cx + dx, 0.4);
    if (type === 0) tb(pick(BOXES), 14, 3.4, 2.9, cx, 2.8);
    else if (type === 1) { tp(pick([tankM, pale]), new THREE.CylinderGeometry(1.45, 1.45, 13, 12).rotateZ(Math.PI / 2), cx, 2.55); tb(under, 1.2, 0.5, 1.2, cx, 4.2); }
    else if (type === 2) { tb(hopM, 14, 3, 2.9, cx, 2.6); tb(under, 14.1, 0.3, 3, cx, 4.2); }
    else if (type === 3) { tb(pick(BOXES), 12.2, 2.6, 2.44, cx, 2.4); tb(pick(BOXES), 12.2, 2.6, 2.44, cx, 5); }
    else { tb(pick(BOXES), 14, 1.6, 2.9, cx, 1.9); tb(M.soil, 13, 0.5, 2.4, cx, 2.8); }
  }
  for (const [m, list] of parts) train.add(new THREE.Mesh(mergeGeometries(list), m));
  train.position.set(60, 0.32, -36);
  k.group.add(train);

  // A crow stands on the roof of the white car.
  const crow = k.crow();
  crow.obj.position.set(4.7, sy(125) + 1.34, 125);
  k.onCard(c => { for (const p of lamps) p.intensity = c.porch; });
  k.onFrame(t => {
    // The train crosses the foot of the street and comes again.
    const X = 60 - (t * 4.5) % 420, on = X < 40 && X > -290, ph = Math.floor(t * 1.6) % 2;
    train.position.x = X;
    xa.color.copy(RED).multiplyScalar(on && ph ? 6 : 0.35);
    xb.color.copy(RED).multiplyScalar(on && !ph ? 6 : 0.35);
    // The cab stays seaward of the portal beams.
    trolley.position.x = Q - 19 + 17 * Math.sin(t * 0.11);
    redA.color.copy(RED).multiplyScalar(0.5 + 5 * (0.5 + 0.5 * Math.sin(t * 1.5)) ** 3);
    redB.color.copy(RED).multiplyScalar(0.5 + 5 * (0.5 + 0.5 * Math.sin(t * 1.1 + 2)) ** 3);
    g1.offset.x = t * 0.004; g2.offset.set(-t * 0.003, t * 0.002);
    crow.pose(t, 'caw', 2.7);
  });
}
