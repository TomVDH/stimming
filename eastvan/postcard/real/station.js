// East Van postcards, realistic: the station over Broadway, in a drizzle.
// Same lens, plan and loop as block-out card 10.
import { THREE, V, col, rng, mBox, mCyl, mPlane, canvasTex, mergeGeometries, UP } from './rkit.js';

const PI = Math.PI, lampCol = col(0.84, 0.13, 68), coolCol = col(0.92, 0.04, 235);
const RED = col(0.6, 0.23, 28), AMB = col(0.82, 0.16, 78), GRN = col(0.8, 0.17, 162);
// P: the loop period, in seconds.
const P = 44;
export const card = {
  cap: 'The station · 10:15 pm · Drizzle', blockout: 10,
  cam: { pos: [44, 1.6, 0.8], yaw: 90, pitch: 0, up: 27, down: 13, minHalf: 0.36, upMax: 38 },
  // The cloud hides the moon; the city lights it from below.
  hour: 22, sun: [0.4, 0.7, 0.5], fill: [col(0.7, 0.05, 255), 0.12],
  fog: col(0.2, 0.045, 325), fogD: 0.009, exposure: 1.4, env: 5,
  sky: { cloudA: 0.95, cov: 0.2, cloud: col(0.19, 0.04, 320), cloudLit: col(0.3, 0.06, 45), hazeA: 0.8, hazeK: 6, stars: 0, sunCol: col(0.6, 0.1, 50, 0.2) },
  rain: 0.14, rainLamp: [26, 9.3, -7.6], mtn: null, flock: 0,
  // The focus sits on the guideway's near edge.
  bloom: [0.45, 0.65, 1.0], focus: 40, aperture: 0.00012,
  lens: { con: 1.06, sat: 1.1, lift: [0.012, 0.01, 0.036], vig: 0.4, grain: 0.075 },
};

export function build(k) {
  const { M, box, put, limb, at, sash, room, door, kerb, pole, wire, std, paint, glow, signMat } = k;
  // RW: the kerb line. WZ: the building line. RY: the road surface.
  // PY: the paint's height. PLAT: the platform floor.
  // GF: the shopfront height.
  const R = rng(61), RW = 9.6, WZ = 13.1, RY = -0.145, PY = RY + 0.002, PLAT = 9.4, GF = 3.1, conc = M.found;
  const pick = a => a[Math.floor(R() * a.length)], Q = new THREE.Quaternion(), mono = px => `700 ${px}px ui-monospace, monospace`;
  const shape = pts => new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  // A profile pulled along z, from 0 to len.
  const prism = (s, len) => new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 6 });
  // A tapered tube from a to b, as a geometry.
  const tube = (a, b, r0, r1 = r0, n = 6) => { const d = V(0, 0, 0).subVectors(b, a), len = d.length(); return mCyl(r1, r0, len, n).translate(0, len / 2, 0).applyQuaternion(Q.setFromUnitVectors(UP, d.normalize())).translate(a.x, a.y, a.z); };
  // Collects parts by material; done() makes one mesh for each.
  const bin = () => {
    const parts = new Map(), g = new THREE.Group();
    const add = (m, geo, x = 0, y = 0, z = 0) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push((geo.index ? geo.toNonIndexed() : geo).translate(x, y, z)); };
    const done = () => {
      for (const [m, list] of parts) { const o = new THREE.Mesh(mergeGeometries(list), m); o.castShadow = !(m.isMeshBasicMaterial || m.transparent); o.receiveShadow = true; if (m.transparent) k.ghost(o); g.add(o); }
      return g;
    };
    return { add, b: (m, w, h, d, x, y, z) => add(m, mBox(w, h, d), x, y, z), done };
  };

  /* ----- materials ----- */
  // The offset keeps thin paint clear of the road at a distance.
  const thin = { roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  const tar = std(col(0.16, 0.008, 262), { roughness: 0.3 }), lineW = std(col(0.8, 0.01, 90), thin), lineY = std(col(0.74, 0.13, 92), thin);
  const steel = paint(0.5, 0.035, 235), shade = std(col(0.1, 0.01, 260), { roughness: 0.5 }), dkGlass = std(col(0.08, 0.02, 250), { roughness: 0.08, envMapIntensity: 2 });
  // The roof's underside takes the tube light along its whole length.
  const shell = std(col(0.6, 0.012, 240), { metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide, emissive: coolCol, emissiveIntensity: 0.3 });
  const white = paint(0.9, 0.012, 230, { roughness: 0.35 }), teal = paint(0.5, 0.11, 215);
  const tubeC = glow(col(0.93, 0.04, 232, 6.5)), tubeW = glow(col(0.92, 0.07, 85, 6)), beam = glow(col(0.95, 0.04, 90, 8)), tail = glow(col(0.6, 0.24, 28, 3));
  // Rooms with no lamp of their own glow instead.
  const coolIn = glow(col(0.88, 0.04, 220, 0.62)), warmIn = glow(col(0.8, 0.1, 75, 0.6)), goldIn = glow(col(0.78, 0.12, 62, 0.62)), cabin = glow(col(0.86, 0.06, 88, 0.65));
  // The frame hook sets the three signal colours.
  const sigR = glow(RED), sigA = glow(AMB), sigG = glow(GRN);
  const boardM = signMat('COMMERCIAL–BROADWAY', { w: 1024, h: 80, bg: '#0c1a30', fg: '#eaf2ff', font: mono(60), k: 1.4 });
  const destM = signMat('HARBOUR END', { w: 512, h: 96, bg: '#0a0a0a', fg: '#ffb43c', font: mono(64), k: 1.6 });
  const busF = signMat('77 SALTGRASS', { w: 640, h: 112, bg: '#0c0c0c', fg: '#ffb43c', font: mono(76), k: 1.6 }), busR = signMat('77', { w: 128, h: 64, bg: '#0c0c0c', fg: '#ffb43c', font: mono(52), k: 1.6 });
  const names = [['NIGHT OWL PIZZA', '#2a0808', '#ff6a4d'], ['SALMONBERRY CAFE', '#06231f', '#7dffd8'], ['GOLDEN CRANE NOODLE', '#2b1d02', '#ffcf5a'], ['RAINCOAT RECORDS', '#160a2e', '#c9a2ff'], ['LATE GROCER', '#f3ead8', '#b3261e']]
    .map(([t, bg, fg]) => signMat(t, { w: 768, h: 96, bg, fg, font: mono(64), k: 1.4 }));
  // The shelter's poster: a sun over dark water, no words.
  const adM = k.noCast(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.5), map: canvasTex(256, 384, 1, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#16324a'); gr.addColorStop(1, '#e8703a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f6e7b4'; g.beginPath(); g.arc(w * 0.6, h * 0.42, 70, 0, 7); g.fill();
    g.fillStyle = '#0e1a26';
    for (let i = 0; i < 5; i++) g.fillRect(0, h * 0.62 + i * 28, w, 9 + i * 3);
  }) }));
  const brickT = c => std(c, { map: M.brick.map, bumpMap: M.brick.bumpMap, bumpScale: 1.5, roughness: 0.7 });
  const walls = [M.brick, M.stucco, brickT(col(0.5, 0.04, 30)), paint(0.45, 0.05, 250, { roughness: 0.7 })], awns = [paint(0.42, 0.13, 28, { roughness: 0.7 }), paint(0.36, 0.08, 160, { roughness: 0.7 })];
  const lits = [warmIn, goldIn, coolIn], backs = [M.curtainW, M.curtainC, M.blind, M.blind, M.dark, M.dark], doors = [M.door, M.trim, M.iron], goods = [...awns, lineY, teal, white];
  // Wet coats are dark and smooth.
  const coats = [[0.17, 0.015, 265], [0.24, 0.06, 25], [0.26, 0.05, 150]].map(c => std(col(...c), { roughness: 0.3 })), skin = std(col(0.45, 0.04, 50), { roughness: 0.6 });
  const brollies = [[0.14, 0.01, 265], [0.5, 0.19, 27], [0.7, 0.08, 210]].map(c => std(col(...c), { roughness: 0.3, side: THREE.DoubleSide, flatShading: true }));

  /* ----- ground: one mirror road, slab walks, worn paint ----- */
  box(M.dark, 700, 0.1, 420, 0, -0.36, 0);
  k.mirrorRoad(700, RW * 2, 0, RY, 0);
  for (const s of [-1, 1]) {
    // The cross street at x = -52 breaks walks and kerbs.
    box(tar, 12, 0.1, 190, -52, RY - 0.05, s * (RW + 95));
    kerb(246, s > 0 ? 200 : -46, s * RW, -s * PI / 2); kerb(192, s > 0 ? -58 : -250, s * RW, -s * PI / 2);
    for (let i = 0; i < 57; i++) for (const c of [0, 1]) { const lift = R() < 0.08 ? R() * 0.02 : 0; box(M.walk, 1.488, 0.1, 1.648, -45.25 + i * 1.5, -0.03 + lift, s * (10.61 + c * 1.66), 0, 0, lift * 0.4); }
    box(M.walk, 160.5, 0.1, 3.32, 119.75, -0.03, s * 11.44); box(M.walk, 192, 0.1, 3.32, -154, -0.03, s * 11.44);
    // A storm drain at the kerb: a frame and five slots.
    box(M.iron, 0.62, 0.004, 0.42, 22 + s * 5.5, PY, s * (RW - 0.23));
    for (let i = 0; i < 5; i++) box(M.dark, 0.5, 0.002, 0.03, 22 + s * 5.5, PY + 0.003, s * (RW - 0.38 + i * 0.075));
  }
  // The plaza under the guideway, north of the street.
  box(conc, 13, 0.1, 150, 0, -0.03, -88);
  // Concrete pads take the buses at the two stops.
  box(conc, 24, 0.006, 3, 6, RY + 0.003, -8.05); box(conc, 22, 0.006, 3, -19, RY + 0.003, 8.05);
  // Lane dashes wear thin; some are gone.
  for (let x = -148; x < 64; x += 9) for (const z of [-6.4, -3.2, 3.2, 6.4]) if (Math.abs(x - 22) > 4 && R() < 0.8) box(lineW, 1.6 + R() * 1.4, 0.002, 0.12, x, PY, z);
  for (let x = 90; x > -300;) {
    const len = 0.6 + R() * 3;
    if (R() < 0.8 && Math.abs(x - len / 2 - 22) > 3.5 + len / 2) for (const z of [-0.14, 0.14]) box(lineY, len, 0.002, 0.1, x - len / 2, PY, z);
    x -= len + 0.1 + R() * R() * 2;
  }
  // The crosswalk and its two stop lines.
  for (let z = -9; z <= 9.01; z += 1.2) if (R() < 0.9) box(lineW, 3, 0.002, 0.6, 22, PY, z);
  box(lineW, 0.4, 0.002, 9.3, 24.6, PY, -4.8); box(lineW, 0.4, 0.002, 9.3, 19.4, PY, 4.8);
  for (const [x, z] of [[31, -2.1], [13, 4.9], [-9, -5]]) put(M.iron, mCyl(0.34, 0.34, 0.004, 20), x, PY, z);

  /* ----- the guideway: box girder spans on round piers ----- */
  const SPAN = 22.4, girder = shape([[-4, 8.9], [-4, 8.62], [-2.3, 8.2], [-2, 7.5], [2, 7.5], [2.3, 8.2], [4, 8.62], [4, 8.9]]);
  // A gap at each pier is the expansion joint.
  for (let i = -7; i <= 7; i++) put(conc, prism(girder, SPAN - 0.05), 0, 0, i * SPAN - SPAN / 2 + 0.025);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      // The station's piers carry wide caps for the platform girders.
      const z = s * (SPAN / 2 + i * SPAN), w = i < 2 ? 6.5 : 2.6;
      put(conc, mCyl(0.8, 0.85, 6.3, 20), 0, 2.85, z); put(conc, mCyl(0.9, 0.8, 0.4, 20), 0, 6.1, z);
      put(conc, prism(shape([[-w, 7.3], [-w, 6.95], [-1.15, 6.3], [1.15, 6.3], [w, 6.95], [w, 7.3]]), 1.8), 0, 0, z - 0.9);
      if (i > 2) continue;
      // Bearing pads, then a downpipe on the street side.
      for (const x of [-1.15, 1.15]) for (const d of [-0.5, 0.5]) box(M.plastK, 0.5, 0.2, 0.4, x, 7.4, z + d);
      if (i < 2) for (const x of [-5.3, 5.3]) box(M.plastK, 0.6, 0.15, 0.5, x, 7.375, z);
      put(M.galv, mCyl(0.06, 0.06, 7.5, 8), 0, 3.75, z - s * 0.97);
      for (const y of [1.2, 3.4, 5.6]) box(M.galv, 0.2, 0.04, 0.16, 0, y, z - s * 0.93);
    }
    // Parapets with a coping and a drip edge, clear of the station.
    for (const x of [-3.9, 3.9]) { box(M.curb, 0.2, 0.95, 138, x, 9.375, s * 99); box(M.curb, 0.3, 0.06, 138, x, 9.88, s * 99); box(conc, 0.06, 0.05, 138, x * 1.013, 8.6, s * 99); }
    // Conduits hang under the soffit, clear of the pads.
    put(M.galv, mCyl(0.04, 0.04, 336, 6).rotateX(PI / 2), s * 1.75, 7.44, 0);
    for (const x of [1.28, 2.72]) box(M.galv, 0.07, 0.13, 336, s * x, 8.965, 0);
  }
  box(M.galv, 0.45, 0.06, 336, 0, 7.45, 0);

  /* ----- the station: deck, platforms, fascia, name board ----- */
  box(conc, 13, 0.5, 60, 0, 8.7, 0);
  for (const s of [-1, 1]) {
    box(conc, 0.9, 1, 69, s * 5.3, 7.95, 0); box(conc, 3, 0.45, 60, s * 5, 9.175, 0);
    // The tactile strip marks the platform edge.
    box(lineY, 0.4, 0.012, 60, s * 3.75, PLAT + 0.006, 0);
    box(M.curb, 0.16, 1.5, 60, s * 6.48, 8.7, 0); box(M.curb, 0.05, 0.06, 60, s * 6.53, 7.92, 0);
    // Lamps under the soffit show in the wet road.
    for (const z of [-9, -3, 3, 9]) box(tubeC, 0.5, 0.04, 0.5, s, 7.47, z);
  }
  box(M.iron, 0.03, 0.9, 10.12, 6.565, 8.5, 0); put(boardM, new THREE.PlaneGeometry(10, 0.78), 6.59, 8.5, 0, 0, PI / 2);
  for (const z of [-18, -6, 6, 18]) { box(M.galv, 0.45, 0.05, 1.8, 5.95, PLAT + 0.45, z); box(M.galv, 0.05, 0.45, 1.6, 5.95, PLAT + 0.22, z); }
  // The next-train display hangs over the east platform.
  box(M.iron, 0.12, 0.34, 1.7, 5, 12.2, -9); put(destM, new THREE.PlaneGeometry(1.5, 0.26), 5.065, 12.2, -9, 0, PI / 2);
  for (const d of [-0.7, 0.7]) box(M.iron, 0.02, 1.75, 0.02, 5, 13.245, -9 + d);

  /* ----- the canopy: steel ribs, a curved roof, glazed screens ----- */
  put(shell, new THREE.CylinderGeometry(6.52, 6.52, 60, 28, 1, true, 2.007, 2.269).rotateX(PI / 2).scale(1, 0.6, 1), 0, 11.6, 0);
  for (const a of [0.5, 1.05, PI / 2, PI - 1.05, PI - 0.5]) put(steel, mCyl(0.05, 0.05, 60, 6).rotateX(PI / 2), 6.44 * Math.cos(a), 11.6 + 3.86 * Math.sin(a), 0);
  for (let z = -30; z <= 30; z += 6) {
    put(steel, new THREE.TorusGeometry(6.5, 0.09, 6, 24, PI).scale(1, 0.6, 1), 0, 11.6, z);
    for (const s of [-1, 1]) {
      box(steel, 0.16, 2.2, 0.16, s * 6.42, 10.5, z);
      if (z === 30) continue;
      // A windscreen: glass in a slim frame.
      put(M.glass, new THREE.PlaneGeometry(5.8, 1.9), s * 6.42, 10.45, z + 3, 0, PI / 2);
      for (const y of [9.5, 11.4]) box(steel, 0.05, 0.05, 5.84, s * 6.42, y, z + 3);
      for (const d of [1.55, 4.45]) box(steel, 0.04, 1.9, 0.04, s * 6.42, 10.45, z + d);
      // Three tube lamps hang in each bay.
      for (const d of [1, 3, 5]) { box(steel, 0.16, 0.05, 1.4, s * 4.6, 13.3, z + d); box(tubeC, 0.05, 0.04, 1.3, s * 4.6, 13.255, z + d); box(steel, 0.02, 1.05, 0.02, s * 4.6, 13.85, z + d); }
    }
  }

  /* ----- the station house, south of the street ----- */
  at(-1, 0, WZ, () => {
    box(conc, 16, 5.9, 17, 0, 6.35, -8.5); box(M.dark, 15.9, 3.4, 12.6, 0, 1.7, -10.6); box(conc, 15.6, 0.04, 4.3, 0, 0.02, -2.15);
    for (const x of [-7.8, -2.6, 2.6, 7.8]) box(conc, 0.5, 3.4, 0.5, x, 1.7, -0.25);
    for (const s of [-1, 1]) box(conc, 0.3, 3.4, 4.3, s * 7.85, 1.7, -2.15);
    // The concourse: plate glass, a lit back wall, fare gates.
    put(M.glass, new THREE.PlaneGeometry(15.1, 3.1), 0, 1.75, -0.12); put(coolIn, mPlane(15.6, 3.3), 0, 1.7, -4.2);
    for (let x = -7.15; x < 7.2; x += 1.3) box(steel, 0.05, 3.2, 0.08, x, 1.7, -0.12);
    for (let x = -3; x <= 3; x++) box(M.galv, 0.25, 1, 1.3, x, 0.54, -2.2);
    for (const x of [5.1, 6]) box(teal, 0.7, 1.8, 0.5, x, 0.94, -3.7);
    for (const x of [-5, 0, 5]) box(tubeC, 2.4, 0.04, 0.07, x, 3.34, -2);
    put(boardM, new THREE.PlaneGeometry(6, 0.47), 0, 3.8, 0.03);
  }, PI);

  /* ----- the stair and the escalator, in glass, on the east wall ----- */
  // N risers climb from the walk to the platform.
  const N = 55, Z0 = 14.5, RISE = (PLAT - 0.02) / N, RUN = 0.246, ANG = Math.atan2(RISE, RUN), sa = Math.sin(ANG), ca = Math.cos(ANG);
  const SL = N * Math.hypot(RISE, RUN), MY = 0.02 + N * RISE / 2, MZ = Z0 + N * RUN / 2;
  // A box on the slope: u runs along it, v off it.
  const ramp = (m, w, h, len, x, u, v) => box(m, w, h, len, x, MY + u * sa + v * ca, MZ + u * ca - v * sa, -ANG);
  for (let i = 1; i <= N; i++) {
    const y = 0.02 + i * RISE, z = Z0 + (i - 0.5) * RUN;
    box(conc, 1.5, 0.04, RUN + 0.03, 7.95, y - 0.02, z - 0.015); box(conc, 1.5, RISE, 0.03, 7.95, y - RISE / 2, z - RUN / 2);
    box(M.galv, 0.9, 0.03, RUN, 9.55, y - 0.015, z);
  }
  ramp(steel, 3.3, 0.3, SL, 8.7, 0, -0.3); ramp(steel, 3.7, 0.12, SL - 0.5, 8.7, 0.6, 3.35); ramp(coolIn, 0.02, 2.2, SL - 1.8, 7.03, 0.7, 1.5);
  // The stair has stainless rails; the escalator has glass and rubber.
  for (const x of [7.25, 8.65]) { ramp(M.galv, 0.045, 0.045, SL, x, 0, 0.95); for (let u = -7.5; u <= 7.5; u += 1.5) ramp(M.galv, 0.035, 0.9, 0.035, x, u, 0.5); }
  for (const x of [9.03, 10.07]) { ramp(M.glass, 0.012, 0.8, SL, x, 0, 0.55); ramp(M.plastK, 0.08, 0.05, SL + 0.6, x, 0, 0.98); }
  // The east wall: one raked pane, two rails, eight mullions.
  ramp(M.glass, 0.02, 3.2, SL - 1.4, 10.4, 0.6, 1.65);
  for (const v of [0.05, 3.25]) ramp(steel, 0.08, 0.08, SL - 1.4, 10.4, 0.6, v);
  for (let u = -6; u <= 8; u += 2) ramp(steel, 0.06, 3.2, 0.06, 10.4, u, 1.65);
  for (const u of [-6, -3, 0, 3, 6]) ramp(tubeC, 0.06, 0.04, 1.2, 8, u, 3.2);
  for (const [z, h] of [[20.5, 3.65], [26, 7.45]]) box(conc, 0.4, h, 0.4, 9.8, h / 2, z);
  // The landing at the top, and the canopy over the entry.
  box(conc, 3.9, 0.3, 2.2, 8.45, 9.25, 29.1); box(steel, 3.7, 0.12, 3.9, 8.7, 12.4, 28.35); put(M.glass, new THREE.PlaneGeometry(2.2, 3), 10.4, 10.9, 29.1, 0, PI / 2);
  box(steel, 3.8, 0.14, 2.4, 8.7, 3.55, 13.5); box(M.galv, 0.3, 0.05, 0.3, 8.7, 3.455, 13.3); box(tubeC, 0.22, 0.02, 0.22, 8.7, 3.42, 13.3);
  // An open forecourt keeps the stair in view; the block-out hides it.
  // A lit pylon and a row of bollards mark its edge.
  box(M.walk, 17.1, 0.1, 17, 15.45, -0.03, 21.6); box(steel, 0.9, 4.4, 0.25, 23.2, 2.2, 14); put(coolIn, mPlane(0.7, 1.2), 23.2, 3.5, 13.87, 0, PI); box(teal, 0.92, 0.3, 0.27, 23.2, 2.6, 14);
  for (let x = 12; x < 22; x += 2.4) put(M.galv, mCyl(0.07, 0.07, 0.9, 10), x, 0.47, 13.4);

  /* ----- the lift: a glass shaft from the north walk to the platform ----- */
  at(7.75, 0, -11, () => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(steel, 0.12, 12.4, 0.12, sx, 6.2, sz);
    for (let y = 0.07; y < 12.5; y += 2.46) for (const s of [-1, 1]) { box(steel, 2, 0.1, 0.08, 0, y, s); box(steel, 0.08, 0.1, 2, s, y, 0); }
    put(M.glass, new THREE.PlaneGeometry(1.9, 12.3), 1, 6.2, 0, 0, PI / 2); put(M.glass, new THREE.PlaneGeometry(1.9, 12.3), 0, 6.2, 1);
    // The car waits at the street; its back wall glows.
    box(M.galv, 1.7, 0.08, 1.7, 0, 0.1, 0); box(M.galv, 1.7, 0.2, 1.7, 0, 2.55, 0); box(cabin, 1.6, 0.03, 1.6, 0, 2.43, 0); box(coolIn, 0.03, 2.2, 1.6, -0.82, 1.3, 0);
    for (const s of [-1, 1]) box(M.galv, 0.05, 12.2, 0.05, -0.9, 6.2, s * 0.5);
    box(steel, 2.3, 0.3, 2.3, 0, 12.5, 0);
  });

  /* ----- the street walls: shops below, flats above ----- */
  // One building; in its own frame the front faces +z.
  // n: its floors. far: a plain box with lit panes.
  // o: one shop's own parts.
  function front(w, n, far, o = {}) {
    const wall = o.wall || pick(walls), H = 4.6 + (n - 1) * 3.2, pane = o.pane || pick(lits), sign = o.sign || (R() < 0.7 ? pick(names) : null), awn = R() < 0.5 && !o.bare ? pick(awns) : null;
    const gw = w - 1, nw = Math.max(1, Math.floor((w - 1.4) / 2.6)), wx = i => (i - (nw - 1) / 2) * 2.6;
    if (far) {
      box(wall, w - 0.1, H, 16, 0, H / 2, -8); put(pane, mPlane(gw - 0.6, 2.3), 0, 1.6, 0.02); box(M.trim, w - 0.1, 0.2, 0.3, 0, H - 0.3, 0.1);
      if (sign) put(sign, new THREE.PlaneGeometry(5.6, 0.7), 0, 3.55, 0.03);
      for (let f = 1; f < n; f++) for (let i = 0; i < nw; i++) put(pick(backs), mPlane(1.1, 1.7), wx(i), 3 + f * 3.2, 0.02);
      return;
    }
    // The floors above: wall round the sashes, a cornice, a coping.
    box(wall, w - 0.1, H - GF, 15.6, 0, (H + GF) / 2, -8.2);
    for (let f = 1; f < n; f++) {
      const yc = 3 + f * 3.2, bb = f > 1 ? yc - 1.6 : GF, bt = f < n - 1 ? yc + 1.6 : H;
      box(wall, w - 0.1, yc - 0.85 - bb, 0.4, 0, (yc - 0.85 + bb) / 2, -0.2); box(wall, w - 0.1, bt - yc - 0.85, 0.4, 0, (bt + yc + 0.85) / 2, -0.2);
      let a = -w / 2 + 0.05;
      for (let i = 0; i < nw; i++) { const x = wx(i); box(wall, x - 0.55 - a, 1.7, 0.4, (x - 0.55 + a) / 2, yc, -0.2); a = x + 0.55; sash(x, yc, 0, 1.1, 1.7, pick(backs)); }
      box(wall, w / 2 - 0.05 - a, 1.7, 0.4, (w / 2 - 0.05 + a) / 2, yc, -0.2);
    }
    if (n < 2) box(wall, w - 0.1, H - GF, 0.4, 0, (H + GF) / 2, -0.2);
    box(M.trim, w - 0.1, 0.2, 0.34, 0, H - 0.3, 0.12); box(M.galv, w - 0.06, 0.06, 0.5, 0, H + 0.03, -0.2);
    // The shopfront: side walls, a riser, plate glass, a door.
    for (const s of [-1, 1]) box(wall, 0.4, GF, 16, s * (w / 2 - 0.25), GF / 2, -8);
    box(wall, gw, 0.45, 0.14, 0, 0.225, -0.07); put(M.glass, new THREE.PlaneGeometry(gw, 2.6), 0, 1.76, -0.07);
    const nm = Math.round(gw / 1.7);
    for (let i = 0; i <= nm; i++) box(M.iron, 0.05, 2.62, 0.08, -gw / 2 + i * gw / nm, 1.76, -0.07);
    box(M.iron, gw, 0.06, 0.09, 0, 2.5, -0.07); door(gw / 2 - 0.85, 0.02, 0.06, pick(doors));
    // The room: a lit back wall and dark shapes before it.
    if (o.real) o.real(gw);
    else {
      put(pane, mPlane(gw, GF - 0.1), 0, GF / 2, -3.4); box(M.floor, gw, 0.04, 3.4, 0, 0.02, -1.7); box(M.wood, 1.8, 0.95, 0.6, -gw / 4, 0.5, -2.4);
      for (let x = -gw / 2 + 0.6; x < gw / 2 - 0.5; x += 0.9) if (R() < 0.6) { const h = 0.5 + R() * 1.2; box(shade, 0.6, h, 0.4, x, h / 2 + 0.04, -3); }
    }
    box(pane === coolIn ? tubeC : tubeW, gw * 0.5, 0.04, 0.07, 0, GF - 0.08, -1.6);
    // The sign band, and sometimes an awning on two arms.
    box(M.iron, w - 0.5, 0.8, 0.1, 0, 3.55, 0.05);
    if (sign) put(sign, new THREE.PlaneGeometry(5.6, 0.7), 0, 3.55, 0.105);
    if (!awn) return;
    box(awn, gw, 0.04, 1.6, 0, 2.86, 0.8, 0.33); box(awn, gw, 0.24, 0.025, 0, 2.47, 1.56);
    for (const s of [-1, 1]) limb(M.galv, V(s * (gw / 2 - 0.03), 2.4, 0.03), V(s * (gw / 2 - 0.03), 2.58, 1.55), 0.014, 0.014, 5);
  }
  // One row of fronts from x1 west to x0.
  // side: 1 is the south row.
  function row(side, x1, x0) {
    for (let x = x1; x > x0 + 0.1;) {
      let w = 8 + R() * 7;
      if (x - w - x0 < 7) w = x - x0;
      const n = 1 + Math.floor(R() * R() * 4), far = x < -57 || x - w > 30, cx = x - w / 2;
      at(cx, 0, side * WZ, () => front(w, n, far), side > 0 ? PI : 0);
      x -= w;
    }
  }
  // The grocer has a real room: shelves, a counter, bins.
  const grocer = gw => {
    room(-gw / 2, gw / 2, 0, GF, -0.12, -5.6, warmIn);
    for (let i = 0; i < 4; i++) {
      box(M.wood, gw - 0.6, 0.04, 0.4, 0, 0.5 + i * 0.5, -5.3);
      for (let x = -gw / 2 + 0.5; x < gw / 2 - 0.4; x += 0.5) { const h = 0.2 + R() * 0.2; box(pick(goods), 0.4, h, 0.3, x, 0.52 + i * 0.5 + h / 2, -5.3); }
    }
    box(M.wood, 2, 0.95, 0.6, gw / 4, 0.5, -2.6);
    for (let x = -gw / 2 + 1; x < 0; x += 1.4) box(M.wood, 1, 1.2, 2.6, x, 0.62, -3);
  };
  // The lift and the shelter stand before a front with no awning.
  row(-1, 60, 24.5); at(19.5, 0, -WZ, () => front(10, 2, false, { sign: names[4], pane: warmIn, wall: M.brick, real: grocer })); at(10.5, 0, -WZ, () => front(8, 2, false, { bare: true }));
  row(-1, -6.5, -46); row(-1, -58, -190); row(1, 60, 24); row(1, -9, -46); row(1, -58, -190);

  /* ----- poles, sodium lamps, trolley wires ----- */
  const SX = [66, 26, -14, -54, -94, -134];
  SX.forEach((x, i) => {
    for (const s of [-1, 1]) pole(x, s * 10.4, 9.6, null);
    // A span wire crosses the street; hangers hold the contact wires.
    wire(V(x, 6.6, -10.4), V(x, 6.6, 10.4), 0.5, 0.01, 0.01);
    for (const z of [-8.3, -7.7, 7.7, 8.3]) { box(M.iron, 0.02, 0.5, 0.02, x, 6.08, z); if (i) wire(V(SX[i - 1], 5.8, z), V(x, 5.8, z), 0.1, 0.012, 0.012); }
    // The cobra heads alternate from side to side.
    const s = i % 2 ? -1 : 1;
    limb(M.galv, V(x, 9.3, s * 10.4), V(x, 9.5, s * 7.9), 0.05, 0.035, 8); box(M.galv, 0.3, 0.11, 0.72, x, 9.46, s * 7.6); box(M.lampLens, 0.2, 0.03, 0.46, x, 9.395, s * 7.6);
  });
  // A signal head: three lenses with visors; they face east.
  const head = (x, y, z, lit = true) => {
    box(M.plastK, 0.26, 1.1, 0.34, x, y, z);
    if (lit) [sigR, sigA, sigG].forEach((m, j) => { put(m, mCyl(0.11, 0.11, 0.03, 14).rotateZ(PI / 2), x + 0.14, y + 0.35 - j * 0.35, z); box(M.plastK, 0.2, 0.02, 0.3, x + 0.22, y + 0.49 - j * 0.35, z); });
  };
  // A mast with an arm over the lanes.
  const mast = (x, s) => { put(M.galv, mCyl(0.1, 0.13, 6.8, 10), x, 3.4, s * 10.5); limb(M.galv, V(x, 6.3, s * 10.5), V(x, 6.55, s * 2.9), 0.08, 0.05, 8); };
  for (const x of [24.2, -45.4]) { mast(x, -1); head(x, 5.86, -4.8); head(x, 3.3, -10.2); }
  // The eastbound mast shows its back.
  mast(19.8, 1); head(19.8, 5.86, 4.8, false);

  /* ----- the bus shelter and the small things on the north walk ----- */
  at(11.5, 0.02, -11.2, () => {
    box(M.galv, 5.2, 0.07, 1.7, 0, 2.5, 0); put(M.glass, new THREE.PlaneGeometry(4.8, 2), 0, 1.35, -0.75);
    for (const x of [-2.45, 2.45]) for (const z of [-0.75, 0.75]) box(M.galv, 0.07, 2.5, 0.07, x, 1.25, z);
    for (const y of [0.33, 2.36]) box(M.galv, 4.9, 0.05, 0.05, 0, y, -0.75);
    for (let i = 0; i < 3; i++) box(M.wood, 3, 0.03, 0.11, -0.5, 0.5, -0.5 + i * 0.13);
    for (const x of [-1.8, 0.8]) box(M.iron, 0.05, 0.5, 0.4, x, 0.25, -0.37);
    // The lit poster stands at the east end.
    box(M.iron, 0.16, 2, 1.34, 2.6, 1.25, 0); put(adM, new THREE.PlaneGeometry(1.2, 1.8), 2.685, 1.25, 0, 0, PI / 2);
  });
  // A newspaper box, a bin, the stop's pole and plate.
  box(M.plastB, 0.45, 0.7, 0.42, 17.4, 0.77, -10.4); box(M.iron, 0.08, 0.42, 0.08, 17.4, 0.23, -10.4); box(M.trim, 0.01, 0.26, 0.3, 17.628, 0.86, -10.4); box(M.galv, 0.04, 0.1, 0.12, 17.5, 1.17, -10.4);
  put(M.plastK, mCyl(0.3, 0.26, 0.9, 12), 15.3, 0.47, -10.5); put(M.galv, mCyl(0.31, 0.31, 0.05, 12), 15.3, 0.93, -10.5);
  put(M.galv, mCyl(0.035, 0.035, 3, 8), 16.2, 1.52, -10.1); box(teal, 0.03, 0.5, 0.5, 16.2, 2.74, -10.1);
  // A hydrant on the south walk: barrel, bonnet, two caps.
  put(M.door, mCyl(0.1, 0.12, 0.5, 12), 28.5, 0.27, 10.2); put(M.door, new THREE.SphereGeometry(0.105, 12, 8), 28.5, 0.52, 10.2); put(M.door, mCyl(0.05, 0.05, 0.34, 8).rotateX(PI / 2), 28.5, 0.4, 10.2); put(M.door, mCyl(0.065, 0.065, 0.3, 8).rotateZ(PI / 2), 28.5, 0.36, 10.2);

  /* ----- people: few, small, wet, mostly under umbrellas ----- */
  // One figure through add(m, geo): feet at the origin, facing +x.
  function figure(add, coat, h, brolly, stride = 0) {
    const s = h / 1.7;
    for (const d of [-1, 1]) {
      add(M.plastK, tube(V(d * stride, 0, d * 0.09), V(0, 0.9 * s, d * 0.08), 0.045, 0.085));
      add(coat, tube(V(0.02, 1.4 * s, d * 0.24), V(0.05 - d * stride * 0.5, 0.86 * s, d * 0.27), 0.055, 0.045));
    }
    add(coat, new THREE.CapsuleGeometry(0.2, 0.5, 4, 10).scale(0.7, s, 1.22).translate(0, 1.05 * s, 0));
    add(skin, new THREE.SphereGeometry(0.1, 10, 8).translate(0, 1.63 * s, 0));
    if (!brolly) return;
    // The umbrella: a shallow dome of eight panels on a thin shaft.
    add(brolly, new THREE.SphereGeometry(0.66, 8, 3, 0, PI * 2, 0, 1).scale(1, 0.55, 1).translate(0.08, 2.08 * s - 0.363, 0.12));
    add(M.iron, tube(V(0.2, 1.2 * s, 0.26), V(0.08, 2.05 * s, 0.12), 0.008));
  }
  const stand = (x, y, z, ry, coat, brolly) => figure((m, g) => put(m, g, x, y, z, 0, ry), coat, 1.58 + R() * 0.22, brolly);
  // Two wait in the shelter; three wait to cross.
  stand(10.2, 0.02, -11.3, 0.3, coats[0]); stand(12.3, 0.02, -11.1, 1.2, coats[2]);
  stand(21.2, 0.02, -10.4, 1.5, coats[1], brollies[0]); stand(22.6, 0.02, -10.9, 1.9, coats[0], brollies[1]); stand(21.6, 0.02, 10.4, -1.5, coats[2], brollies[2]);
  // One waits in the forecourt; one rides the escalator.
  // Two wait behind the east windscreen.
  stand(14.2, 0.02, 15.6, 2.2, coats[1], brollies[0]);
  stand(9.55, 0.02 + 21 * RISE, Z0 + 20.5 * RUN, -PI / 2, coats[2]); stand(5.3, PLAT, -7.5, 3, coats[0]); stand(5.7, PLAT, 2.5, 2.6, coats[1]);
  // A walker is one group, held in mid-stride.
  const walker = (coat, brolly, z, ry) => {
    const b = bin();
    figure(b.add, coat, 1.72, brolly, 0.24);
    const g = b.done();
    g.position.set(0, 0.02, z); g.rotation.y = ry;
    return g;
  };
  const w1 = walker(coats[0], brollies[1], -12.55, PI), w2 = walker(coats[2], brollies[0], -12.55, PI), w3 = walker(coats[1], brollies[2], 12.55, 0);

  /* ----- the train: four cars; the head is the -z end ----- */
  const tr = bin(), CL = 12.6, roofS = new THREE.Shape();
  roofS.moveTo(-1.25, 2.8); roofS.lineTo(1.25, 2.8); roofS.lineTo(1.25, 3.1); roofS.absarc(0.9, 3.1, 0.35, 0, PI / 2, false); roofS.lineTo(-0.9, 3.45); roofS.absarc(-0.9, 3.1, 0.35, PI / 2, PI, false);
  for (let c = 0; c < 4; c++) {
    const z = (c - 1.5) * (CL + 0.5);
    // The shell: skirt, bogies, stripe, lower panel, roof.
    tr.b(shade, 2.3, 0.45, CL - 0.6, 0, 0.3, z); tr.b(teal, 2.52, 0.3, CL, 0, 0.7, z); tr.b(white, 2.5, 1, CL, 0, 1.35, z); tr.add(white, prism(roofS, CL), 0, 0, z - CL / 2);
    for (const d of [-4.1, 4.1]) tr.b(shade, 2.4, 0.4, 2.3, 0, 0.22, z + d);
    if (c < 3) tr.b(shade, 2.2, 2.9, 0.5, 0, 1.9, z + CL / 2 + 0.25);
    // Inside: a dark floor, a lit ceiling, two tubes, rails, poles, seats.
    tr.b(shade, 2.4, 0.02, CL - 0.1, 0, 1.86, z); tr.b(cabin, 2.3, 0.02, CL - 0.4, 0, 2.785, z);
    for (const x of [-0.5, 0.5]) { tr.b(tubeW, 0.08, 0.03, CL - 1, x, 2.76, z); tr.add(M.galv, mCyl(0.015, 0.015, CL - 1, 6).rotateX(PI / 2), x * 1.6, 2.6, z); }
    for (const d of [-3.1, 0, 3.1]) tr.add(M.galv, mCyl(0.02, 0.02, 0.93, 6), 0, 2.32, z + d);
    for (const sx of [-1, 1]) {
      for (const d of [-4.95, -1.2, 1.2, 4.95]) tr.b(coats[1], 0.1, 0.3, 2.1, sx * 1.12, 2.02, z + d);
      // Window posts; the thin ones are the door seams.
      for (const [d, w] of [[-6.15, 0.3], [-3.8, 0.14], [-3.1, 0.04], [-2.4, 0.14], [0, 0.14], [2.4, 0.14], [3.1, 0.04], [3.8, 0.14], [6.15, 0.3]]) tr.b(shade, 0.05, 0.95, w, sx * 1.235, 2.325, z + d);
      tr.add(M.glass, new THREE.PlaneGeometry(CL - 0.3, 0.95).rotateY(sx * PI / 2), sx * 1.262, 2.325, z);
    }
    for (const d of [-3.8, -3.1, -2.4, 2.4, 3.1, 3.8]) tr.b(shade, 0.012, 1.3, 0.025, 1.252, 1.2, z + d);
    tr.add(destM, new THREE.PlaneGeometry(1.5, 0.26).rotateY(PI / 2), 1.256, 2.96, z + 0.9);
    // Riders: shoulders and a head above the sill.
    for (let i = 0; i < 5; i++) {
      const x = (i % 2 ? -1 : 1) * 0.86, d = -5 + i * 2.3 + R();
      tr.add(coats[0], new THREE.SphereGeometry(0.21, 8, 6).scale(0.8, 0.9, 1.2), x, 2, z + d); tr.add(skin, new THREE.SphereGeometry(0.1, 8, 6), x, 2.34, z + d);
    }
  }
  // Each end is half a cylinder, squashed along the train.
  for (const e of [-1, 1]) {
    for (const [m, r, h, y] of [[shade, 1.15, 0.45, 0.3], [teal, 1.26, 0.3, 0.7], [white, 1.25, 1, 1.35], [dkGlass, 1.24, 0.95, 2.325], [white, 1.25, 0.65, 3.125]]) tr.add(m, new THREE.CylinderGeometry(r, r, h, 16, 1, false, e > 0 ? -PI / 2 : PI / 2, PI).scale(1, 1, 0.5), 0, y, e * 25.95);
    for (const x of [-0.75, 0.75]) tr.add(e < 0 ? beam : tail, new THREE.SphereGeometry(0.09, 10, 8), x, 1.05, e * 26.45);
  }
  tr.add(destM, new THREE.PlaneGeometry(1.3, 0.24).rotateY(PI), 0, 3, -26.59);
  const train = tr.done();
  train.position.set(2, 8.9, 70);

  /* ----- the trolley buses: two sections and a bellows; the front is -x ----- */
  const bu = bin();
  for (const [len, cx] of [[10.5, -3.25], [6, 6]]) {
    bu.b(teal, len, 0.95, 2.55, cx, 0.825, 0); bu.b(white, len, 0.3, 2.55, cx, 1.45, 0); bu.b(white, len, 0.55, 2.55, cx, 2.875, 0);
    bu.b(shade, len - 0.2, 0.02, 2.4, cx, 1.61, 0); bu.b(cabin, len - 0.3, 0.02, 2.3, cx, 2.59, 0); bu.b(tubeW, len - 1, 0.03, 0.08, cx, 2.57, 0);
    for (const d of [-1, 1]) bu.add(M.glass, new THREE.PlaneGeometry(len - 0.1, 1).rotateY(d > 0 ? 0 : PI), cx, 2.1, d * 1.282);
  }
  // Window posts and seat backs; the bellows has neither.
  for (let x = -8.2, i = 0; x < 8.7; x += 0.85, i++) {
    if (Math.abs(x - 2.5) < 0.9) continue;
    for (const d of [-1, 1]) {
      bu.b(coats[1], 0.08, 0.36, 0.85, x, 1.8, d * 0.78);
      if (i % 2 === 0) bu.b(shade, 0.14, 1, 0.05, x, 2.1, d * 1.255);
    }
    // A rider in every third seat.
    if (i % 3 === 1) { const z = (i % 2 ? -1 : 1) * 0.78; bu.add(coats[0], new THREE.SphereGeometry(0.21, 8, 6).scale(0.8, 0.9, 1.2), x - 0.25, 1.86, z); bu.add(skin, new THREE.SphereGeometry(0.1, 8, 6), x - 0.25, 2.2, z); }
  }
  bu.b(shade, 1, 2.7, 2.4, 2.5, 1.75, 0);
  for (let i = 0; i < 5; i++) bu.b(shade, 0.05, 2.8, 2.5, 2.1 + i * 0.2, 1.75, 0);
  // The rounded front: half a cylinder, squashed along the bus.
  for (const [m, r, h, y] of [[teal, 1.275, 0.95, 0.825], [white, 1.275, 0.3, 1.45], [dkGlass, 1.265, 1, 2.1], [white, 1.275, 0.55, 2.875]]) bu.add(m, new THREE.CylinderGeometry(r, r, h, 16, 1, false, PI, PI).scale(0.4, 1, 1), -8.5, y, 0);
  bu.b(shade, 0.2, 0.36, 1.8, -8.92, 2.9, 0); bu.add(busF, new THREE.PlaneGeometry(1.7, 0.3).rotateY(-PI / 2), -9.025, 2.9, 0);
  bu.b(dkGlass, 0.04, 0.9, 2.2, 9.01, 2.15, 0); bu.add(busR, new THREE.PlaneGeometry(0.7, 0.36).rotateY(PI / 2), 9.035, 2.85, 0.6);
  for (const d of [-1, 1]) {
    bu.add(beam, mCyl(0.1, 0.1, 0.05, 12).rotateZ(PI / 2), -8.88, 0.8, d * 0.9); bu.b(tail, 0.05, 0.3, 0.2, 9.02, 1, d * 0.95); bu.b(tail, 0.05, 0.1, 0.24, 9.02, 2.95, d * 1.05);
    // Each pole trails back from the roof to its wire.
    bu.add(shade, tube(V(4.6, 3.2, d * 0.3), V(9.3, 5.92, d * 0.3), 0.03));
    for (const x of [-6.6, 0.6, 6.9]) bu.add(M.plastK, mCyl(0.48, 0.48, 0.32, 16).rotateX(PI / 2), x, 0.48, d * 1.14);
  }
  for (const x of [-6.6, 0.6, 6.9]) bu.b(shade, 1.35, 0.8, 2.57, x, 0.75, 0);
  bu.b(shade, 3, 0.25, 1.4, 5.5, 3.27, 0);
  // Bus A heads west and stops; bus B heads east and passes.
  const busA = bu.done(), busB = busA.clone();
  busB.traverse(o => { if (o.isMesh && o.material.transparent) k.ghost(o); });
  busA.position.set(76, RY, -8); busB.position.set(-230, RY, 8); busB.rotation.y = PI;
  // One headlight rides on bus A; it throws no shadow.
  const headL = new THREE.SpotLight(col(0.95, 0.04, 90), 320, 45, 0.5, 0.7, 1.6);
  headL.position.set(-9.1, 0.85, 0); headL.target.position.set(-25, -0.6, 0);
  busA.add(headL, headL.target);
  // One car heads west on the green.
  // One side profile makes its body.
  const cc = bin();
  cc.add(std(col(0.3, 0.1, 25), { roughness: 0.25, metalness: 0.5 }), prism(shape([[-2.15, 0.25], [2.15, 0.25], [2.2, 0.55], [2.1, 0.78], [0.95, 0.86], [0.35, 1.36], [-1.05, 1.38], [-1.7, 0.9], [-2.2, 0.84], [-2.22, 0.5]]), 1.72), 0, 0, -0.86);
  cc.add(dkGlass, prism(shape([[0.84, 0.9], [0.33, 1.3], [-1, 1.32], [-1.55, 0.93]]), 1.76), 0, 0, -0.88);
  for (const z of [-0.62, 0.62]) {
    cc.b(beam, 0.04, 0.12, 0.3, 2.19, 0.66, z); cc.b(tail, 0.04, 0.1, 0.32, -2.22, 0.66, z);
    for (const x of [-1.32, 1.32]) cc.add(M.plastK, mCyl(0.31, 0.31, 0.2, 14).rotateX(PI / 2), x, 0.31, z * 1.26);
  }
  const car = cc.done();
  car.position.set(76, RY, -4.8); car.rotation.y = PI;

  /* ----- lights: six in all ----- */
  // The near street lamp throws the long shadows.
  const lamp = new THREE.SpotLight(lampCol, 600, 44, 1.15, 0.6, 1.8);
  lamp.position.set(26, 9.3, -7.6); lamp.target.position.set(26, 0, -6.6);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0015;
  // The stair light falls down the flight and out onto the walk.
  const entry = new THREE.SpotLight(coolCol, 200, 26, 1, 0.7, 1.6);
  entry.position.set(8.3, 5.5, 17.2); entry.target.position.set(8.9, 0.3, 14.2);
  entry.castShadow = true; entry.shadow.mapSize.set(2048, 2048); entry.shadow.bias = -0.002;
  // The platform, the train's cabin and the grocer: no shadows.
  // The cabin light stays in the scene, so the light count holds.
  // A slow decay spreads the platform light along the white train.
  const platL = new THREE.PointLight(coolCol, 5, 40, 1), cabinL = new THREE.PointLight(col(0.9, 0.07, 80), 20, 12, 1.6), shopL = new THREE.PointLight(col(0.9, 0.08, 78), 30, 12, 1.8);
  platL.position.set(6, 12.3, -2); cabinL.position.set(2.8, 11.2, 70); shopL.position.set(19.5, 2.3, -13.7);
  k.group.add(train, busA, busB, car, w1, w2, w3, lamp, lamp.target, entry, entry.target, platL, cabinL, shopL);
  // The drizzle shows in the two nearest lamp cones.
  k.lampCone(V(26, 9.38, -7.6), 5.5, 9.4, lampCol, 0.045); k.lampCone(V(-14, 9.38, 7.6), 5.5, 9.4, lampCol, 0.03);

  k.onFrame(t => {
    const s = t % P;
    // The train brakes into the platform, waits, then pulls out north.
    const zt = s < 4 ? 70 : s < 14 ? 70 * (1 - (s - 4) / 10) ** 2 : s < 26 ? 0 : s < 36 ? -70 * ((s - 26) / 10) ** 2 : -70;
    train.position.z = cabinL.position.z = zt; train.visible = Math.abs(zt) < 69.5; cabinL.intensity = train.visible ? 20 : 0;
    // Bus A passes the viewer, stops, then leaves into the haze.
    busA.position.x = s < 9 ? 6 + 70 * (1 - s / 9) ** 2 : s < 22 ? 6 : 6 - 236 * ((s - 22) / 22) ** 1.7;
    // Its beam fades in, so the loop's seam does not flash.
    headL.intensity = 320 * Math.min(1, s / 2);
    busB.position.x = -230 + 9.5 * ((s + P - 14) % P);
    const c = (s + P - 26) % P;
    car.position.x = 76 - 13 * c; car.visible = c < 24.5;
    // The signal holds red while the bus and the train wait.
    const go = s >= 20 || s < 7, warn = s >= 7 && s < 9.5;
    sigG.color.copy(GRN).multiplyScalar(go ? 6 : 0.1); sigA.color.copy(AMB).multiplyScalar(warn ? 6 : 0.1); sigR.color.copy(RED).multiplyScalar(go || warn ? 0.1 : 6);
    // The walkers pass the shopfronts and come again from out of frame.
    w1.position.x = 31 - (t * 1.2) % 76; w2.position.x = 31 - (t * 1.2 + 38) % 76; w3.position.x = -45 + (t * 1.3 + 20) % 76;
  });
}
