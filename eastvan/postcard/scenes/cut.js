// East Van postcards: the Grandview Cut. One card.
// The viewer stands on the Commercial Drive bridge and looks east.
// The Cut runs along x. Its floor is y = 0. Its rim is y = 12.
import { THREE, V, M, col, rng, lerp, clamp, tex, std, glow, ico, mergeGeometries } from '../kit.js';

// RIM: rim height. FZ, RZ: half-widths of floor and rim. CZ: the camera's z.
const RIM = 12, FZ = 8, RZ = 22.5, CZ = -1;
// Long parts start under the bridge and end far past the fog.
const X0 = -80, LEN = 680, XM = X0 + LEN / 2;
// The next bridges to the east.
const BRIDGES = [115, 225, 335];
// The train's run along x, and the seconds for one pass.
const FAR = 420, NEAR = -45, PASS = 25;

export const cards = [
  { cap: 'Grandview Cut · 8:40 am · Clear', hour: 7.6,
    cam: { pos: [0, 14, CZ], yaw: -90, pitch: -10, up: 20, down: 20, minHalf: 0.22 },
    sun: [0.85, 0.22, 0.45], sunCol: col(0.9, 0.1, 68), sunI: 3.6, hemi: [col(0.8, 0.06, 245), col(0.62, 0.07, 75), 1.1],
    fog: col(0.88, 0.055, 72), fogD: 0.0055,
    sky: { cloudA: 0.18, cov: 0.62, cloud: col(0.86, 0.03, 60), cloudLit: col(0.98, 0.04, 80), hazeA: 0.9, hazeK: 7, disc: 1, sunCol: col(0.93, 0.11, 72, 6) },
    exposure: 0.95, win: 0.6, glow: 0.25, mist: 0.16,
    leaves: 40, wind: 0.2, smoke: 0.3, smokeCol: col(0.95, 0.03, 75), flock: 16, flockDir: -1, flockCol: col(0.2, 0.02, 280),
    crow: { yaw: 1.25, mode: 'caw' },
    bloom: [0.5, 0.8, 0.9], tilt: [0.6, 0.18, 1.4], shadow: { at: [50, 4, 0], r: 40 },
    grade: { con: 1.06, sat: 1.1, vig: 0.3, grain: 0.05, lift: [0.025, 0.012, 0], gain: [1, 0.99, 0.96] } },
];

export function build(k) {
  const { box, put, gableHouse, fence, pole, wire, tree } = k;
  // The banks cast no shadow: the shadow box covers only the near Cut.
  const bank = std(0.36, 0.07, 140, { roughness: 1, noCast: true }), ivy = std(0.31, 0.07, 150, { flatShading: true });
  const ballast = std(0.46, 0.015, 60, { roughness: 1, noCast: true }), tie = std(0.27, 0.03, 50, { noCast: true });
  // Smooth, bright steel: the rail heads catch the low sun.
  const rail = std(0.8, 0.01, 250, { roughness: 0.28, metalness: 0.45 });
  const slopeY = z => clamp((Math.abs(z) - FZ) / (RZ - FZ)) * RIM;
  const clear = (x, d = 8) => !BRIDGES.some(b => Math.abs(x - b) < d);
  // A street lamp: a steel pole, an arm along x, a head.
  const lamp = (x, y, z, s = 1) => {
    put('steel', new THREE.CylinderGeometry(0.07, 0.09, 7, 6), x, y + 3.5, z);
    box('steel', 1.6, 0.07, 0.07, x + s * 0.75, y + 6.95, z);
    box('trim', 0.6, 0.1, 0.25, x + s * 1.4, y + 6.87, z);
  };

  /* ----- the ground: floor, banks, rim ----- */
  box('gravel', LEN, 2, 22, XM, -1, 0);
  const TH = Math.atan2(RIM, RZ - FZ), SL = Math.hypot(RIM, RZ - FZ) + 2, T = 3;
  for (const s of [-1, 1]) {
    // The slab's top face ends on the rim edge. Its foot lies under the floor.
    box(bank, LEN, T, SL, XM, RIM - Math.sin(TH) * SL / 2 - Math.cos(TH) * T / 2, s * (RZ - Math.cos(TH) * SL / 2 + Math.sin(TH) * T / 2), -s * TH);
    box('lawn', LEN, 14, 300, XM, RIM - 7, s * (RZ + 150));
  }

  /* ----- the transit guideway: north side of the floor ----- */
  box('conc', LEN, 0.6, 6.4, XM, 0.3, -3.8);
  for (const tz of [-5.4, -2.2]) {
    // The flat strip between the rails drives the train.
    box('steel', LEN, 0.05, 0.3, XM, 0.625, tz);
    for (const d of [-0.72, 0.72]) box(rail, LEN, 0.15, 0.07, XM, 0.675, tz + d);
  }
  fence(-20, -0.3, 300, -0.3, 1.8);

  /* ----- the freight track: south side of the floor ----- */
  box(ballast, LEN, 0.35, 4.2, XM, 0.175, 3.6);
  // The fog hides the track past the last sleeper.
  for (let x = 12; x < 190; x += 0.7) box(tie, 0.24, 0.12, 2.6, x, 0.4, 3.6);
  for (const d of [-0.72, 0.72]) box(rail, LEN, 0.15, 0.07, XM, 0.52, 3.6 + d);
  // Parked cars far down the line. Each second car is a low hopper.
  ['brick', std(0.74, 0.12, 92), std(0.4, 0.07, 160), 'brick', std(0.3, 0.01, 260)].forEach((m, i) => {
    const x = 140 + i * 16.6, h = i % 2 ? 2.8 : 3.4;
    box(m, 15, h, 2.9, x, 1.45 + h / 2, 3.6);
    for (const d of [-5.2, 5.2]) box('iron', 2.6, 0.9, 2.3, x + d, 1.05, 3.6);
  });
  // A signal and a relay cabinet beside the track.
  put('iron', new THREE.CylinderGeometry(0.06, 0.06, 4.5, 6), 70, 2.25, 6.4);
  box('iron', 0.5, 1.1, 0.3, 70, 4.3, 6.4);
  put(glow(0.8, 0.2, 150, 3), new THREE.SphereGeometry(0.1, 8, 6), 69.84, 4.5, 6.4);
  box('steel', 1.2, 1.5, 0.7, 73, 0.75, 6.6);

  /* ----- the bridges ahead: a beam on three piers ----- */
  for (const bx of BRIDGES) {
    box('conc', 9, 1.2, 49, bx, RIM - 0.35, 0);
    for (const [z, d] of [[-9.5, 1.1], [0.6, 0.8], [9.5, 1.1]]) box('conc', 5, 12, d, bx, 5.2, z);
    for (const e of [-4.3, 4.3]) {
      box('conc', 0.3, 0.8, 49, bx + e, RIM + 0.65, 0);
      box('steel', 0.06, 0.06, 49, bx + e, RIM + 1.55, 0);
      for (let z = -24; z <= 24; z += 4) box('steel', 0.06, 0.5, 0.06, bx + e, RIM + 1.3, z);
    }
    for (const z of [-13, 13]) lamp(bx - 3.9, RIM + 0.25, z);
  }

  /* ----- the bridge under the viewer ----- */
  box('conc', 22, 1.3, 49, -9, 11.65, 0);
  box('conc', 0.4, 0.8, 49, 1.7, 12.7, 0);
  // A low steel rail on the parapet. The crow sits on it.
  put('steel', new THREE.CylinderGeometry(0.025, 0.025, 49, 8).rotateX(Math.PI / 2), 1.7, 13.3, 0);
  for (let z = CZ - 9.3; z < 10; z += 1.5) box('steel', 0.04, 0.2, 0.04, 1.7, 13.2, z);
  // The safety screen stands on the south side only, to frame the view.
  k.at(0, 13.1, 0, () => fence(1.7, CZ + 0.95, 1.7, CZ + 9, 1.9));

  /* ----- the rim: house backs, yard fences, one chimney ----- */
  let smokeAt;
  k.at(0, RIM, 0, () => {
    const R = rng(52), keys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], yard = ['wood', 'trim', 'deck'];
    for (const s of [-1, 1]) for (let i = 0; i < 30; i++) {
      const x = 16 + i * 11 + R() * 1.5, w = 6.4 + R() * 1.2, base = 0.6 + R() * 0.6, wall = 2.8 + R() * 0.6, rise = 2.4 + R() * 1.4;
      const zf = s * (29 + R() * 2), body = keys[Math.floor(R() * 6)], lit = R() < 0.3 ? 'winLit' : 'winDim';
      // A street meets each bridge: no house stands there.
      if (!clear(x, 9)) continue;
      gableHouse({ x, zf, w, d: 9, base, wall, rise, body, dir: -s });
      k.win(lit, 1.1, 1.3, x - 1.6, base + 1.5, zf - s * 0.03);
      k.win('winDim', 1.0, 1.3, x - w / 2 - 0.01, base + 1.5, zf + s * 3, true);
      const fh = 1.4 + (i % 3) * 0.2;
      box(yard[i % 3], 10.6, fh, 0.08, 16.75 + i * 11, fh / 2, s * 26);
      if (s < 0 && i === 11) {
        // The chimney foot stays inside the roof.
        const top = base + wall + rise;
        box('brick', 0.62, 3.2, 0.62, x + 1.6, top - 1.0, zf + s * 4); box('conc', 0.74, 0.1, 0.74, x + 1.6, top + 0.65, zf + s * 4);
        smokeAt = [x + 1.6, RIM + top + 0.72, zf + s * 4];
      }
    }
    // A wire fence along each rim edge, open at the bridges.
    for (const s of [-1, 1]) {
      let x0 = 4;
      for (const b of BRIDGES) { fence(x0, s * 23, b - 5, s * 23, 1.2); x0 = b + 5; }
    }
    lamp(75, 0, -24); lamp(58, 0, 24.2);
  });
  k.smoke(...smokeAt);

  /* ----- poles and wires along both rims ----- */
  // Wires stay in world space, so their heights add the rim.
  for (const [z, x0, step, n] of [[-24.6, 18, 40, 8], [24.6, 40, 44, 7]]) {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step;
      k.at(0, RIM, 0, () => pole(x, z));
      if (!i) continue;
      for (const [dz, y, sag] of [[-1, 10.15, 0.5], [1, 10.15, 0.5], [0.15, 8.4, 0.7]]) wire(V(x - step, RIM + y, z + dz), V(x, RIM + y, z + dz), sag);
    }
  }

  /* ----- the green: brambles, ivy, fall trees, firs ----- */
  const R = rng(7);
  for (const s of [-1, 1]) {
    // Low blobs cover each bank. They are small near the tracks.
    for (let i = 0; i < 150; i++) {
      const f = 0.05 + R() * 0.95, r = (0.5 + f) * (1 + R() * 1.2), x = 8 + R() * R() * 380;
      put(R() < 0.6 ? 'bush' : ivy, ico(r * (1 + R() * 0.6), r * 0.45, r * 0.8), x, f * RIM + r * 0.1, s * lerp(FZ, RZ, f));
    }
    // Slope trees. Near the viewer they stay high, clear of the view.
    for (let i = 0; i < 22; i++) {
      const x = 16 + R() * R() * 320, f = lerp(x < 60 ? 0.6 : 0.3, 0.95, R()), size = 0.75 + R() * 0.5;
      if (clear(x)) k.at(x, f * RIM - 0.3, s * lerp(FZ, RZ, f), () => tree(0, 0, 300 + i + s * 50, { size }));
    }
    // Yard trees stand between the fences and the houses.
    for (let i = 0; i < 12; i++) {
      const x = 12 + R() * 320, z = s * (26.8 + R() * 1.5), size = 0.8 + R() * 0.4;
      if (clear(x)) k.at(x, RIM, z, () => tree(0, 0, 500 + i + s * 50, { size }));
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = 30 + i * 36 + R() * 14, z = (i % 2 ? 1 : -1) * (17 + R() * 4), h = 9 + R() * 6, r = 2 + R(), y = slopeY(z);
    if (!clear(x)) continue;
    put('fir', new THREE.ConeGeometry(r, h, 7), x, y + 1.6 + h / 2, z); put('bark', new THREE.CylinderGeometry(0.25, 0.3, 2.6, 6), x, y + 0.7, z);
  }
  // Leaves fall from the slope trees. Most end inside the brambles.
  k.fall(60, R => [18 + R() * 70, 7 + R() * 8, (R() < 0.5 ? -1 : 1) * (7.2 + R() * 8)], 0.04, 11);

  /* ----- mist: three pale sheets low in the Cut ----- */
  // The alpha map fades each sheet at its sides and its near end.
  const mistMap = tex(64, 64, (g, w, h) => {
    const a = g.createLinearGradient(0, 0, 0, h), b = g.createLinearGradient(0, 0, w, 0);
    a.addColorStop(0, '#000'); a.addColorStop(0.5, '#fff'); a.addColorStop(1, '#000');
    b.addColorStop(0, '#000'); b.addColorStop(0.2, '#fff');
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = b; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  // A repeat would wrap the far end onto the near edge.
  mistMap.wrapS = mistMap.wrapT = THREE.ClampToEdgeWrapping;
  const mistMat = new THREE.MeshBasicMaterial({ color: col(0.97, 0.03, 80), alphaMap: mistMap, transparent: true, depthWrite: false, opacity: 0 });
  const mist = [1.1, 2.3, 3.6].map((y, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(420, 17 + i * 5).rotateX(-Math.PI / 2), mistMat);
    m.position.set(250, y, 0);
    k.group.add(m);
    return m;
  });

  /* ----- the train: four short cars, nose toward -x ----- */
  const train = new THREE.Group();
  {
    const white = std(0.95, 0.008, 250, { roughness: 0.5 }), blue = std(0.5, 0.17, 258);
    const body = [], band = [], stripe = [], under = [], head = [], tail = [];
    const part = (list, w, h, d, x, y, z = 0) => list.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 12.6;
      part(body, 12, 2.9, 2.5, x, 2.55); part(band, 12.04, 0.8, 2.54, x, 3.05);
      part(stripe, 12.05, 0.2, 2.55, x, 2.35); part(under, 10.4, 0.5, 2.0, x, 1.0);
    }
    for (const z of [-0.8, 0.8]) { part(head, 0.06, 0.16, 0.3, -24.93, 1.6, z); part(tail, 0.06, 0.12, 0.3, 24.93, 1.6, z); }
    for (const [list, m] of [[body, white], [band, M.winDim], [stripe, blue], [under, M.iron], [head, glow(0.96, 0.08, 95, 5)], [tail, glow(0.62, 0.22, 28, 2.5)]]) {
      const mesh = new THREE.Mesh(mergeGeometries(list), m);
      mesh.castShadow = !m.userData.noCast; mesh.receiveShadow = true;
      train.add(mesh);
    }
  }
  k.group.add(train);

  const crow = k.crow();
  crow.obj.position.set(1.7, 13.325, CZ - 0.85);
  k.onCard(c => { mistMat.opacity = c.mist; });
  k.onFrame((t, c) => {
    // The offset puts the train in view on the first frame.
    const n = (t + 43.5) / PASS, u = n - Math.floor(n), away = Math.floor(n) % 2 === 1;
    // Each pass is slow near the bridge: a station lies behind the viewer.
    const v = away ? 1 - u : u, e = v * (1.3 - 0.3 * v);
    // Toward the viewer on the north track; away on the south track.
    train.position.set(lerp(FAR, NEAR, e), 0, away ? -2.2 : -5.4);
    train.rotation.y = away ? Math.PI : 0;
    for (let i = 0; i < 3; i++) mist[i].position.set(250 + Math.sin(t * 0.07 + i * 2.1) * 8, mist[i].position.y, Math.sin(t * 0.05 + i) * 0.6);
    crow.pose(t, c.crow.mode, c.crow.yaw);
  });
}
