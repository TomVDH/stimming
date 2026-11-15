// East Van postcards: the wooden coaster at Hastings Park. One card.
// The ride runs away to the north-north-west; the sun sets to its left.
// Ride space: the lift climbs along +x; the viewer stands on the -z side.
import { THREE, V, M, col, rng, lerp, smooth, tex, signTex, std, glow, ico, ni, mergeGeometries, WARM, RAD, UP } from '../kit.js';

// RY turns ride space into the world.
const RY = 112 * RAD, CR = Math.cos(RY), SR = Math.sin(RY);
// ZA: the lift lane. ZB: the return lane. CHAIN: the lift speed, m/s.
const ZA = -7, ZB = 7, G = 9.8, CHAIN = 2.4, WAIT = 7, CARS = 5;
// The track: a closed loop in ride space. It starts at the station.
const PTS = [
  [-32, 3.2, ZA], [-27, 3.2, ZA], [-23, 4, ZA], [-12, 8.74, ZA], [0, 14.08, ZA], [10, 18.53, ZA], [15.5, 20.3, ZA],
  [21, 19, ZA], [29, 11, ZA], [35, 5, ZA], [40, 3.2, ZA], [47.95, 3.6, -4.95], [50, 5.4, 0], [47.95, 8, 4.95],
  [42, 10.4, ZB], [35, 12.5, ZB], [26, 5, ZB], [17, 11.5, ZB], [8, 4.5, ZB], [-1, 10, ZB], [-10, 4.5, ZB], [-19, 8.5, ZB],
  [-28, 4.5, ZB], [-36, 6.5, ZB], [-43, 4.2, ZB], [-50.95, 3.8, 4.95], [-53, 3.5, 0], [-50.95, 3.3, -4.95], [-45, 3.2, ZA], [-38, 3.2, ZA],
];

export const cards = [
  { cap: 'Hastings Park · 8:40 pm · Summer', hour: 18.2,
    // The viewer looks north, 22 degrees off the line of the ride.
    cam: { pos: [1.7, 1.7, 68.3], yaw: -5.7, pitch: 0, up: 25, down: 9, minHalf: 0.37, upMax: 42 },
    // The sun stands low in the north-west: it lights the west flank.
    sun: [-0.85, 0.16, -0.49], sunCol: col(0.86, 0.13, 60), sunI: 3.6, hemi: [col(0.74, 0.07, 265), col(0.55, 0.07, 55), 1.1],
    fog: col(0.8, 0.08, 50), fogD: 0.0022,
    sky: { cloudA: 0.35, cov: 0.5, cloud: col(0.68, 0.07, 320), cloudLit: col(0.93, 0.1, 45), hazeA: 0.85, hazeK: 7, disc: 1, sunCol: col(0.9, 0.14, 60, 5) },
    exposure: 0.95, bulbs: 4, lamp: 50,
    leaves: 0, smoke: 0, flock: 36, flockDir: 1, flockCol: col(0.14, 0.02, 280),
    mtn: [col(0.62, 0.07, 305), col(0.54, 0.08, 290)], ski: false,
    shadow: { at: [0, 0, 5], r: 62 },
    bloom: [0.55, 0.75, 0.9], tilt: [0.42, 0.26, 0.7], grade: { con: 1.06, sat: 1.14, vig: 0.34, grain: 0.05, lift: [0.03, 0.012, 0], gain: [1, 0.98, 0.95] } },
];

export function build(k) {
  const { box, put, at } = k;
  const timber = std(0.93, 0.015, 95), red = std(0.55, 0.2, 28, { roughness: 0.5 }), steel = std(0.9, 0.01, 250, { roughness: 0.6 });
  const asph = std(0.5, 0.012, 60, { noCast: true }), prize = glow(0.86, 0.13, 72, 1.6);
  const stripes = (a, b, rx) => std(1, 0, 0, { map: tex(64, 8, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.fillRect(0, 0, w / 2, h); }, { rx }) });
  const roofM = stripes('#f3e6c4', '#c2372c', 9), tentA = stripes('#f3e6c4', '#2f7f8f', 4), tentB = stripes('#f6d24a', '#c2372c', 4);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex('THE WOODEN COASTER', { w: 1024, h: 128, bg: '#b3261e', fg: '#f6e7b4', font: '700 76px ui-monospace, monospace' }), color: new THREE.Color(1.3, 1.3, 1.3) });
  signMat.userData.noCast = true;
  const D = V(0, 0, 0), T = V(0, 0, 0), Lt = V(0, 0, 0), Nn = V(0, 0, 0), Q = new THREE.Quaternion(), mB = new THREE.Matrix4(), o = new THREE.Object3D();
  // A square beam from point a to point b.
  const beam = (m, ax, ay, az, bx, by, bz, th = 0.13) => {
    D.set(bx - ax, by - ay, bz - az);
    const len = D.length();
    put(m, new THREE.BoxGeometry(th, len, th).applyQuaternion(Q.setFromUnitVectors(UP, D.normalize())), (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  };

  /* ----- the track: samples, then speed and time tables ----- */
  const curve = new THREE.CatmullRomCurve3(PTS.map(p => V(...p)), true);
  curve.arcLengthDivisions = 3000;
  // P holds N + 1 points at equal steps of ds metres.
  const N = 1400, ds = curve.getLength() / N, P = new Float32Array((N + 1) * 3);
  curve.getSpacedPoints(N).forEach((p, i) => p.toArray(P, i * 3));
  // iTop: the crest of the lift. iBrake: the brakes start here.
  let iTop = 0, iBrake = 0, best = 1e9;
  for (let i = 0; i < N; i++) if (P[i * 3 + 1] > P[iTop * 3 + 1]) iTop = i;
  for (let i = iTop; i < N; i++) { const d = Math.hypot(P[i * 3] + 43, P[i * 3 + 2] - ZB); if (d < best) { best = d; iBrake = i; } }
  // The chain sets the speed to the crest; then height sets it.
  // The brakes bite hard, then the train rolls slowly home.
  const vel = new Float32Array(N + 1), tAt = new Float32Array(N + 1), yTop = P[iTop * 3 + 1];
  for (let i = 0; i <= N; i++) {
    const free = Math.sqrt(CHAIN * CHAIN + 2 * G * 0.8 * Math.max(0, yTop - P[i * 3 + 1])), q = (i - iBrake) / (N - iBrake), vB = vel[iBrake - 1];
    vel[i] = i <= iTop ? 0.5 + (CHAIN - 0.5) * smooth(0, 5, i * ds) : i < iBrake ? free : q < 0.5 ? Math.sqrt(vB * vB + (12.25 - vB * vB) * q * 2) : 3.5 - 2.7 * smooth(0.5, 1, q);
    if (i) tAt[i] = tAt[i - 1] + ds * 2 / (vel[i] + vel[i - 1]);
  }
  // sOf: the sample the train reaches at each step of DT seconds.
  const RUN = tAt[N], DT = 0.05, K = Math.ceil(RUN / DT) + 1, sOf = new Float32Array(K + 1), GAP = 2.55 / ds;
  for (let j = 0, i = 0; j <= K; j++) {
    const tt = Math.min(j * DT, RUN);
    while (i < N - 1 && tAt[i + 1] < tt) i++;
    sOf[j] = i + (tt - tAt[i]) / (tAt[i + 1] - tAt[i]);
  }
  // A box along the track from sample i to sample j; w lies level.
  // side moves it across the track; lift moves it off the bed.
  const span = (m, i, j, w, h, side, lift) => {
    const a = i * 3, b = j * 3;
    T.set(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]);
    const len = T.length();
    T.normalize(); Lt.set(T.z, 0, -T.x).normalize(); Nn.crossVectors(T, Lt);
    put(m, new THREE.BoxGeometry(w, h, len + 0.04).applyMatrix4(mB.makeBasis(Lt, Nn, T)),
      (P[a] + P[b]) / 2 + Lt.x * side + Nn.x * lift, (P[a + 1] + P[b + 1]) / 2 + Nn.y * lift, (P[a + 2] + P[b + 2]) / 2 + Lt.z * side + Nn.z * lift);
  };

  let trackBulbs, eaveBulbs;
  at(0, 0, 0, () => {
    /* ----- the lattice: bents, ledgers, braces ----- */
    // A bent: two posts under the track, tied at each 2.5 m.
    const bents = [];
    for (let i = 0, run = 9; i < N; i++) {
      const p = i * 3, hx = P[p + 3] - P[p], hz = P[p + 5] - P[p + 2], hd = Math.hypot(hx, hz);
      run += hd;
      if (run < 2.5) continue;
      run = 0;
      const b = { y: P[p + 1], x: [0, 0], z: [0, 0] };
      for (const s of [0, 1]) {
        b.x[s] = P[p] + hz / hd * (s * 2 - 1) * 0.85; b.z[s] = P[p + 2] - hx / hd * (s * 2 - 1) * 0.85;
        box(timber, 0.18, b.y - 0.3, 0.18, b.x[s], (b.y - 0.3) / 2, b.z[s]);
      }
      for (let h = 2.5; h < b.y - 0.4; h += 2.5) beam(timber, b.x[0], h, b.z[0], b.x[1], h, b.z[1]);
      bents.push(b);
    }
    // Each bay gets a ledger and one brace per level, on both sides.
    bents.forEach((a, n) => {
      const b = bents[(n + 1) % bents.length], top = Math.min(a.y, b.y) - 0.4;
      for (let h = 2.5, l = 0; h < top; h += 2.5, l++) for (const s of [0, 1]) {
        const up = (n + l) % 2;
        beam(timber, a.x[s], h, a.z[s], b.x[s], h, b.z[s]);
        beam(timber, a.x[s], h - (up ? 2.5 : 0), a.z[s], b.x[s], h - (up ? 0 : 2.5), b.z[s], 0.12);
      }
    });
    // The bed, the handrails, their posts, and a bulb on each post.
    const lamps = [];
    for (let i = 0; i < N; i += 7) {
      span(timber, i, i + 7, 1.5, 0.3, 0, -0.15);
      for (const s of [-1, 1]) {
        span(timber, i, i + 7, 0.12, 0.12, s * 0.95, 1);
        const x = P[i * 3] + Lt.x * s * 0.95, y = P[i * 3 + 1], z = P[i * 3 + 2] + Lt.z * s * 0.95;
        beam(timber, x, y, z, x + Nn.x, y + Nn.y, z + Nn.z, 0.12);
        lamps.push(V(x + Nn.x * 1.16, y + Nn.y * 1.16, z + Nn.z * 1.16));
      }
    }
    trackBulbs = k.bulbs(lamps, [WARM], 0.1);

    /* ----- the station ----- */
    // A boarded base, two platforms, a striped roof on posts.
    const SX = -40, eave = [];
    box('h2', 15.5, 2.9, 9, SX, 1.45, ZA);
    for (const s of [-1, 1]) {
      box('deck', 15.5, 0.2, 2.4, SX, 3, ZA + s * 2.6);
      box(timber, 15.5, 0.12, 0.12, SX, 4, ZA + s * 3.75);
      for (let x = -47.5; x <= -32.4; x += 1.5) box(timber, 0.12, 1, 0.12, x, 3.55, ZA + s * 3.75);
      for (const x of [-47.4, SX, -32.6]) box(timber, 0.2, 3.4, 0.2, x, 4.8, ZA + s * 4.1);
      box(red, 16.6, 0.45, 0.14, SX, 6.3, ZA + s * 4.5);
      for (let x = -48; x <= -32; x += 0.55) eave.push(V(x, 6.02, ZA + s * 4.6));
    }
    for (let z = -4; z <= 4; z += 0.55) eave.push(V(-48.4, 6.02, ZA + z));
    box(roofM, 16.6, 0.2, 9.2, SX, 6.6, ZA);
    // The sign stands on the west end of the roof.
    box('iron', 0.14, 1.3, 8.9, -48.3, 7.45, ZA);
    put(signMat, new THREE.PlaneGeometry(8.6, 1.05), -48.38, 7.45, ZA, 0, -Math.PI / 2);
    // The ramp climbs to the near platform.
    box('deck', 6.7, 0.2, 1.8, -50.75, 1.4, ZA - 2.7, 0, 0, 0.4636);
    eaveBulbs = k.bulbs(eave, [WARM], 0.07);
    // Riders wait on the near platform.
    k.person('binB', -45, ZA - 2.6, Math.PI / 2, 3.1); k.person('bagY', -43.6, ZA - 2.9, 1.2, 3.1, { h: 1.3 }); k.person('h1', -37, ZA - 2.5, 0.3, 3.1, { h: 1.62 });
    // A low rail fence keeps the crowd off the lift.
    for (const y of [0.55, 1.05]) box(timber, 76, 0.12, 0.12, 8, y, ZA - 3.2);
    for (let x = -30; x <= 46; x += 3.8) box(timber, 0.14, 1.15, 0.14, x, 0.575, ZA - 3.2);
  }, RY);

  /* ----- the train ----- */
  // ride holds the cars in ride space.
  const ride = new THREE.Group(), cars = [], shirts = ['binB', 'bagY', 'h3', 'trim', 'purple'];
  ride.rotation.y = RY;
  const bx = (w, h, d, x, y, z) => ni(new THREE.BoxGeometry(w, h, d)).translate(x, y, z);
  const bodyG = mergeGeometries([bx(1.15, 0.55, 2.3, 0, 0.45, 0), bx(1, 0.3, 0.45, 0, 0.82, 1), bx(1.05, 0.5, 0.1, 0, 0.95, -0.95), bx(1.05, 0.5, 0.1, 0, 0.95, -0.05)]);
  const shirtG = [], skinG = [];
  // Four riders a car; the front pair hold their arms up.
  for (const [rz, arms] of [[-0.6, 0], [0.3, 1]]) for (const s of [-1, 1]) {
    shirtG.push(bx(0.4, 0.45, 0.24, s * 0.27, 0.98, rz));
    skinG.push(ico(0.13, 0.14, 0.13).translate(s * 0.27, 1.34, rz));
    if (arms) skinG.push(bx(0.08, 0.5, 0.08, s * 0.5, 1.42, rz + 0.05));
  }
  const shirtGeo = mergeGeometries(shirtG), skinGeo = mergeGeometries(skinG);
  for (let c = 0; c < CARS; c++) {
    const car = new THREE.Group(), body = new THREE.Mesh(bodyG, red);
    body.castShadow = true;
    car.add(body, new THREE.Mesh(shirtGeo, M[shirts[c]]), new THREE.Mesh(skinGeo, M.skin));
    car.rotation.order = 'YXZ';
    ride.add(car); cars.push(car);
  }
  k.group.add(ride);

  /* ----- the ferris wheel, behind the ride ----- */
  const WR = 14, HUB = 23, WX = 33, WZ = -37, WY = 0.25;
  const hubG = new THREE.Group(), wheel = new THREE.Group(), wp = [ni(new THREE.CylinderGeometry(0.7, 0.7, 3.4, 10)).rotateX(Math.PI / 2)];
  for (const s of [-1, 1]) {
    wp.push(ni(new THREE.TorusGeometry(WR, 0.16, 5, 48)).translate(0, 0, s * 1.2), ni(new THREE.TorusGeometry(WR * 0.55, 0.12, 5, 32)).translate(0, 0, s * 1.2));
    for (let i = 0; i < 16; i++) wp.push(bx(0.14, WR, 0.14, 0, WR / 2, 0).rotateZ(i * Math.PI / 8).translate(0, 0, s * 1.2));
  }
  for (let i = 0; i < 16; i++) wp.push(bx(0.14, 0.14, 2.4, WR, 0, 0).rotateZ(i * Math.PI / 8));
  const frame = new THREE.Mesh(mergeGeometries(wp), steel);
  frame.castShadow = true;
  // Bulbs ride the rim and the spokes, on the side that faces south.
  const wheelBulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 6, 4), new THREE.MeshBasicMaterial(), 96);
  for (let i = 0; i < 96; i++) {
    const a = i < 48 ? i / 48 * 6.2832 : (i % 16) * Math.PI / 8, r = i < 48 ? WR : WR * (0.3 + 0.2 * Math.floor((i - 48) / 16));
    o.position.set(Math.cos(a) * r, Math.sin(a) * r, 1.42); o.updateMatrix();
    wheelBulbs.setMatrixAt(i, o.matrix); wheelBulbs.setColorAt(i, WARM);
  }
  // The gondolas hang level: each frame sets them.
  const gond = new THREE.InstancedMesh(mergeGeometries([bx(1.5, 0.9, 1.6, 0, -1.75, 0), ni(new THREE.ConeGeometry(1.15, 0.5, 8)).translate(0, -0.55, 0), bx(0.1, 1.3, 0.1, 0, -0.9, 0)]), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 16);
  const GC = [col(0.6, 0.2, 28), col(0.85, 0.15, 90), col(0.6, 0.1, 200), col(0.92, 0.03, 90)];
  for (let i = 0; i < 16; i++) gond.setColorAt(i, GC[i % 4]);
  gond.castShadow = true;
  wheel.add(frame, wheelBulbs); hubG.add(wheel, gond);
  hubG.position.set(WX, HUB, WZ); hubG.rotation.y = WY;
  k.group.add(hubG);
  // Four legs carry the hub; a boarded platform stands below.
  at(WX, 0, WZ, () => {
    for (const s of [-1, 1]) for (const e of [-1, 1]) beam(steel, e * 8, 0, s * 2.1, 0, HUB, s * 1.75, 0.4);
    box('h1', 8, 6.2, 4.6, 0, 3.1, 0); box('trim', 8.3, 0.2, 4.9, 0, 6.3, 0);
  }, WY);

  /* ----- the midway: ground, tents, trees, people ----- */
  box('lawn', 900, 0.2, 700, 0, -0.1, -150);
  box(asph, 170, 0.06, 150, 0, 0, 15);
  // A game tent: a counter, four posts, a striped roof, a lit back wall.
  const tent = (x, z, ry, base, roof, w = 4.6) => at(x, 0, z, () => {
    box(base, w, 1.05, w * 0.7, 0, 0.525, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(timber, 0.14, 1.9, 0.14, sx * (w / 2 - 0.1), 2, sz * (w * 0.35 - 0.1));
    put(roof, new THREE.ConeGeometry(w * 0.74, 1.9, 4).rotateY(Math.PI / 4).scale(1, 1, 0.7), 0, 3.9, 0);
    box(prize, w - 0.5, 1.5, 0.1, 0, 2.1, -w * 0.3);
  }, ry);
  tent(-14.3, 18.3, 0.5, red, tentA); tent(-24.5, -6.7, 0.3, 'binB', tentB, 5.2);
  // Poplars and firs stand in a row to the north.
  const R = rng(17);
  for (let x = -170; x < 190; x += 7 + R() * 4) {
    const z = -78 - R() * 16, h = 15 + R() * 9;
    if (R() < 0.6) put('bush', ico(2 + R(), h / 2, 2 + R()), x, h / 2 + 1.5, z); else put('fir', new THREE.ConeGeometry(3 + R(), h, 7), x, 2 + h / 2, z);
    put('bark', new THREE.CylinderGeometry(0.3, 0.4, 3, 6), x, 1.5, z);
  }
  // The crowd: a couple, a walker, a child with a balloon, two who watch.
  k.person('h4', 0.4, 55.3, Math.PI, 0.03, { h: 1.76 }); k.person('door', 1.05, 55.2, Math.PI, 0.03, { h: 1.62 });
  k.person('h3', -3.1, 47.3, Math.PI / 2, 0.03, { stride: 0.35 });
  k.person('bagY', 5.2, 52.3, 2.8, 0.03, { h: 1.15 });
  put(std(0.6, 0.22, 28, { roughness: 0.3 }), ico(0.22, 0.27, 0.22), 5.5, 2.25, 52.3); box('trim', 0.03, 1.2, 0.03, 5.48, 1.42, 52.3);
  k.person('purple', 1.1, 36.3, 2.9, 0.03); k.person('trim', 0.2, 36.8, -2.9, 0.03, { h: 1.6 });
  // A swag of coloured bulbs crosses the top of the view.
  const A = V(-10, 8.6, 53), B = V(13.5, 8.6, 51), swag = [];
  for (const p of [A, B]) put('iron', new THREE.CylinderGeometry(0.08, 0.11, 8.7, 6), p.x, 4.35, p.z);
  k.wire(A, B, 1.5, 0.018, 0);
  for (let i = 1; i < 36; i++) { const u = i / 36; swag.push(V(lerp(A.x, B.x, u), 8.52 - 6 * u * (1 - u), lerp(A.z, B.z, u))); }
  const swagBulbs = k.bulbs(swag, [col(0.65, 0.22, 28), col(0.85, 0.16, 88), col(0.7, 0.18, 150), col(0.65, 0.15, 250), col(0.7, 0.2, 340)], 0.075);
  // A crow stands on a waste drum, near the viewer.
  put('binG', new THREE.CylinderGeometry(0.3, 0.3, 0.95, 12), 4.5, 0.505, 61.3);
  box(red, 0.13, 0.2, 0.09, 5.2, 0.08, 61.6, 1.4, 0.5);
  const crow = k.crow();
  crow.obj.position.set(4.5, 0.98, 61.52);

  // One warm lamp hangs under the station roof.
  const lamp = new THREE.PointLight(WARM, 0, 16, 1.6);
  lamp.position.set(-40 * CR + ZA * SR, 5.7, 40 * SR + ZA * CR);
  k.group.add(lamp);

  k.onCard(c => {
    lamp.intensity = c.lamp;
    trackBulbs.material.color.setScalar(c.bulbs); eaveBulbs.material.color.setScalar(c.bulbs);
    wheelBulbs.material.color.setScalar(c.bulbs); swagBulbs.material.color.setScalar(c.bulbs * 0.8);
  });
  k.onFrame(t => {
    // The train climbs, runs, brakes, then waits at the station.
    const u = t % (RUN + WAIT), a = Math.min(u, RUN) / DT, j = Math.floor(a), f = lerp(sOf[j], sOf[j + 1], a - j);
    for (let c = 0; c < CARS; c++) {
      let g = f - c * GAP;
      if (g < 0) g += N;
      const i = Math.min(N - 1, Math.floor(g)), w = g - i, p = i * 3;
      const tx = P[p + 3] - P[p], ty = P[p + 4] - P[p + 1], tz = P[p + 5] - P[p + 2];
      cars[c].position.set(P[p] + tx * w, P[p + 1] + ty * w, P[p + 2] + tz * w);
      cars[c].rotation.set(-Math.atan2(ty, Math.hypot(tx, tz)), Math.atan2(tx, tz), 0);
    }
    // The wheel turns once in a minute.
    const th = t * 0.105;
    wheel.rotation.z = th;
    for (let i = 0; i < 16; i++) {
      o.position.set(Math.cos(th + i * Math.PI / 8) * WR, Math.sin(th + i * Math.PI / 8) * WR, 0); o.updateMatrix();
      gond.setMatrixAt(i, o.matrix);
    }
    gond.instanceMatrix.needsUpdate = true;
    crow.pose(t, 'peck', 2.6);
  });
}
