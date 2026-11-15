// East Van postcards: New Brighton Park on a hot noon. One card.
// The viewer stands on the grass bank, south of the pool, and looks north.
// The lawn is y = 0. The inlet lies 0.6 m lower.
import { THREE, V, M, col, rng, tex, signTex, std, ico, ni, mergeGeometries } from '../kit.js';

// The bank is one ramp; its foot is at z = BZ.
const BS = 0.36, BZ = 29, TH = Math.atan(BS), bank = z => (z - BZ) * BS;
// The beach slopes down to the north from z = -12.
const beach = z => 0.02 + (z + 12) * 0.0613;
// The pool: west edge, east edge, north edge, south edge.
const PW = -13, PE = 17, PN = 3, PS = 20, WY = 0.14;

export const cards = [
  { cap: 'New Brighton · 12:30 pm · Clear', hour: 12.5,
    cam: { pos: [-4, 7.1, 44], yaw: -8, pitch: 0, up: 14.5, down: 25, minHalf: 0.34 },
    // The sun stands high in the south, behind the viewer.
    sun: [0.2, 0.88, 0.43], sunCol: col(0.99, 0.02, 90), sunI: 3.5, hemi: [col(0.85, 0.05, 240), col(0.7, 0.06, 110), 1.0],
    fog: col(0.86, 0.035, 235), fogD: 0.0013,
    sky: { cloudA: 0.85, cov: 0.6, cloud: col(0.85, 0.02, 250), cloudLit: col(0.99, 0.01, 90), hazeA: 0.5, hazeK: 12, disc: 1, sunCol: col(1, 0.03, 90, 4) },
    exposure: 0.9, win: 0.1, wet: true, rain: 0, leaves: 0, wind: 0.2, smoke: 0,
    mtn: [col(0.6, 0.05, 245), col(0.45, 0.07, 175)], ski: false,
    shadow: { at: [2, 0, 4], r: 38 },
    bloom: [0.25, 0.6, 0.97], tilt: [0.42, 0.3, 0.7], grade: { con: 1.06, sat: 1.15, vig: 0.22, grain: 0.035, gain: [1, 1, 0.99] } },
];

export function build(k) {
  const { box, put, at, limb, fence, person } = k;
  const R = rng(71), pick = a => a[Math.floor(R() * a.length)];
  const sand = std(0.82, 0.05, 85, { noCast: true, roughness: 1 }), coping = std(0.8, 0.01, 90), pale = std(0.8, 0.02, 85);
  const water = std(0.78, 0.1, 200, { roughness: 0.5, noCast: true }), shallow = std(0.85, 0.08, 195, { roughness: 0.5, noCast: true });
  const floorLine = std(0.45, 0.1, 240, { noCast: true }), leafA = std(0.5, 0.13, 140, { flatShading: true }), leafB = std(0.43, 0.11, 150, { flatShading: true });
  const SUIT = [std(0.6, 0.2, 28), std(0.55, 0.15, 255), M.bagY, std(0.65, 0.16, 150), std(0.7, 0.17, 350)];
  // A striped cloth: eight bands of two colours.
  const stripes = (a, b) => std(1, 0, 0, { map: tex(64, 4, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 8, 0, 8, h); } }), side: THREE.DoubleSide });
  const UMB = [stripes('#e2483a', '#f6efe0'), stripes('#2f7fc4', '#f6efe0'), stripes('#f2c230', '#3f8f5c')];
  const TOWEL = [stripes('#f08a2c', '#f6efe0'), stripes('#3d6fc4', '#f2c230'), stripes('#e2483a', '#f4b0c0')];

  /* ----- ground: bank, lawn, path, beach ----- */
  box('lawn', 340, 0.4, 72, 140, -0.2, 24);
  box('lawn', 120, 0.4, 31 / Math.cos(TH), 0, bank(44.5) - 0.2 * Math.cos(TH), 44.5 + 0.2 * Math.sin(TH), -TH);
  box('walk', 330, 0.06, 1.8, 135, 0, -11);
  box(sand, 330, 0.4, 15.03, 135, -0.64, -19.5, -0.0612);
  // Drift logs lie on the sand, as seats.
  for (const [x, z, ry] of [[-18, -15.5, 0.1], [-3, -17.5, -0.15], [13, -15, 0.05], [29, -17, 0.2]]) put('wood', new THREE.CylinderGeometry(0.3, 0.34, 7, 8).rotateZ(Math.PI / 2), x, beach(z) + 0.27, z, 0, ry);
  // A sunbather on a towel, head to +z. tilt leans it with the bank.
  const lie = (x, y, z, ry, towel, suit, tilt = 0) => at(x, y, z, () => {
    box(towel, 0.95, 0.03, 1.9, 0, 0.02, 0, tilt); box('skin', 0.4, 0.18, 1.45, 0, 0.13, -0.1, tilt); box(suit, 0.42, 0.19, 0.4, 0, 0.135, 0, tilt);
    put('skin', ico(0.11, 0.11, 0.12), 0, 0.15 - Math.sin(tilt) * 0.78, 0.78);
  }, ry);
  // A beach umbrella: a pole and a striped cone.
  const umbrella = (m, x, y, z, r = 1.3) => {
    put('steel', new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6), x, y + 1.05, z);
    put(m, new THREE.ConeGeometry(r, 0.5, 8, 1, true), x, y + 2.2, z, 0.12, 0, 0.08);
  };
  // A green summer tree: a trunk and four blobs.
  const gtree = (x, z, s) => {
    limb('bark', V(x, 0, z), V(x, 3.2 * s, z), 0.28 * s, 0.18 * s);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + R(), r = i ? 1.5 * s : 0, b = (1.7 + R() * 0.6) * s; put(i % 2 ? leafA : leafB, ico(b, b * 0.85, b), x + Math.cos(a) * r, (i ? 4.4 : 5.8) * s + R() * 0.6, z + Math.sin(a) * r); }
  };
  gtree(27, -8.5, 1); gtree(34, -3.5, 1.2); gtree(40, -9, 0.9); gtree(46, 4, 1.3);
  // The bank holds a few people; narrow screens see them.
  // They sit below the frame of a wide screen.
  lie(-1.6, bank(34), 34, 0.15, TOWEL[0], SUIT[1], -TH); lie(-5.4, bank(32), 32, -0.2, TOWEL[2], SUIT[4], -TH);
  person(SUIT[2], -3.6, 38.6, Math.PI, bank(38.6) - 0.38, { sit: true, legs: 'skin' }); person(SUIT[0], -2.9, 38.5, Math.PI + 0.2, bank(38.5) - 0.4, { sit: true, legs: 'skin', h: 1.25 });
  umbrella(UMB[2], -8.5, bank(31.5) - 0.1, 31.5);

  /* ----- the pool ----- */
  box('conc', 51, 0.3, 29, 4.5, -0.05, 11.5);
  box(water, PE - PW, 0.04, PS - PN, 2, WY - 0.02, 11.5);
  box(shallow, PE - PW, 0.01, 6.5, 2, WY + 0.015, 16.75);
  for (const [w, d, x, z] of [[30.7, 0.35, 2, PN - 0.175], [30.7, 0.35, 2, PS + 0.175], [0.35, 17, PW - 0.175, 11.5], [0.35, 17, PE + 0.175, 11.5]]) box(coping, w, 0.16, d, x, 0.18, z);
  // Four lanes run east to west; a rope marks the shallow end.
  const rope = std(1, 0, 0, { map: tex(4, 32, (g, w, h) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#d83a2e'; g.fillRect(0, 0, w, 8); g.fillStyle = '#2b62c0'; g.fillRect(0, 16, w, 8); }, { ry: 30 }), noCast: true });
  for (let i = 0; i < 4; i++) {
    box(floorLine, 27, 0.01, 0.25, 2, WY + 0.015, 4.3 + i * 2.6);
    put(rope, new THREE.CylinderGeometry(0.06, 0.06, 30, 6).rotateZ(Math.PI / 2), 2, WY + 0.03, 5.6 + i * 2.6);
  }
  // Two sheets of caustics drift apart over the water.
  const c1 = tex(256, 256, (g, w, h) => {
    const P = rng(31);
    g.strokeStyle = '#fff';
    for (let i = 0; i < 90; i++) {
      const x = P() * w, y = P() * h, rx = 9 + P() * 18, ry = 6 + P() * 12, a = P() * 3;
      g.globalAlpha = 0.35 + P() * 0.5; g.lineWidth = 1.5 + P() * 2;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, a, 0, 6.3); g.stroke(); }
    }
  }, { rx: 6, ry: 3.4 });
  const c2 = c1.clone();
  c2.repeat.set(4.3, 2.4); c2.needsUpdate = true;
  const sheet = new THREE.PlaneGeometry(PE - PW, PS - PN).rotateX(-Math.PI / 2);
  for (const [t, y] of [[c1, WY + 0.04], [c2, WY + 0.06]]) {
    const m = new THREE.Mesh(sheet, new THREE.MeshBasicMaterial({ map: t, color: col(0.97, 0.04, 190), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(2, y, 11.5);
    k.group.add(m);
  }
  // The fence runs round the deck; the change rooms close the east side.
  fence(-20.6, 25.6, 29.6, 25.6, 1.2); fence(-20.6, 25.6, -20.6, -2.6, 1.2); fence(-20.6, -2.6, 21, -2.6, 1.2); fence(29.6, 25.6, 29.6, 14, 1.2);
  box(std(0.88, 0.03, 220), 8, 3.4, 16, 25, 1.8, 6); box('roof', 9.2, 0.25, 17.2, 25, 3.62, 6);
  box(std(0.7, 0.11, 200), 0.06, 0.6, 16, 20.97, 3.0, 6);
  for (const z of [-0.5, 4, 8.5, 12.5]) box('door', 0.06, 2.1, 1, 20.96, 1.15, z);
  put(new THREE.MeshStandardMaterial({ map: signTex('POOL', { w: 256, h: 96, bg: '#f4efe2', fg: '#1d6f86', font: '700 76px ui-monospace, monospace' }), roughness: 0.8 }), new THREE.PlaneGeometry(2.4, 0.9), 20.93, 2.2, 6.3, 0, -Math.PI / 2);
  // The lifeguard chair stands on the north deck.
  at(-2, 0.1, 0.8, () => {
    for (const sx of [-0.4, 0.4]) for (const sz of [-0.38, 0.38]) box('trim', 0.08, 2, 0.08, sx, 1, sz);
    box('trim', 0.95, 0.08, 0.9, 0, 2.0, 0); box('trim', 0.95, 0.7, 0.06, 0, 2.4, -0.42); box('trim', 0.95, 0.06, 0.3, 0, 1.62, 0.5);
    for (let i = 1; i < 5; i++) box('trim', 0.7, 0.05, 0.05, 0, i * 0.4, -0.4);
    person(SUIT[0], 0, 0.02, 0, 1.62, { sit: true, legs: 'skin' });
    umbrella(UMB[0], 0, 2.0, -0.42, 1.1);
  });
  // People on the deck, on the edge and in the shallow end.
  person(SUIT[1], -6, 22.8, Math.PI, 0.1, { legs: 'skin' }); person(SUIT[4], -5.2, 22.5, Math.PI - 0.3, 0.1, { legs: 'skin', h: 1.15 });
  person('skin', 6.5, 23.2, Math.PI + 0.4, 0.1, { legs: SUIT[3], stride: 0.25 }); person(SUIT[3], 8, 2.82, 0, -0.16, { sit: true, legs: 'skin' });
  person(SUIT[2], 4, 17, 2.2, -0.75, { legs: 'skin' }); person('skin', 5.3, 16.3, -1.2, -0.62, { legs: 'skin', h: 1.2 }); person(SUIT[0], 9.4, 18.4, 3.6, -0.7, { legs: 'skin' });
  lie(-17, 0.1, 9, 0.1, TOWEL[1], SUIT[2]); lie(-16.4, 0.1, 15, -0.2, TOWEL[0], SUIT[4]);

  /* ----- the lawn and the beach ----- */
  for (const [x, z, ry, i] of [[-9, -6.5, 0.3, 0], [-1.5, -8, -0.4, 1], [6, -5.5, 1.4, 2], [14.5, -8.5, 0.1, 0], [19, -6, -1, 1]]) lie(x, 0, z, ry, TOWEL[i], SUIT[(i + 2) % 5]);
  for (const [x, z, i] of [[-12, -15.5, 0], [5.5, -16.5, 1], [21, -14.8, 2]]) {
    umbrella(UMB[i], x, beach(z) - 0.1, z);
    lie(x + 0.9, beach(z), z + 0.4, 0.2 - i * 0.3, TOWEL[2 - i], SUIT[i + 1]);
    person(SUIT[(i + 3) % 5], x - 0.6, z + 0.3, 2.6 + i, beach(z) - 0.4, { sit: true, legs: 'skin', h: i === 1 ? 1.2 : 1.7 });
  }
  // Two walk the waterline; a child stands in the shallows.
  person(SUIT[1], -4, -20.6, -1.4, beach(-20.6), { legs: 'skin', stride: 0.3 }); person('skin', -2.9, -20.9, -1.4, beach(-20.9), { legs: SUIT[0], stride: -0.3 });
  person(SUIT[4], 12, -23, 0.4, -0.95, { legs: 'skin', h: 1.2 });

  /* ----- the grain elevator, next door to the west ----- */
  const yard = std(0.5, 0.015, 255, { noCast: true }), under = std(0.22, 0.01, 260), gal = std(0.62, 0.03, 220);
  box(yard, 400, 4, 182, -230, -0.5, -81);
  for (const z of [-146, -154.5]) for (let i = 0; i < 8; i++) put(pale, new THREE.CylinderGeometry(4.25, 4.25, 34, 16), -104 + i * 8.5, 18.5, z);
  box(pale, 68, 3.5, 5, -74, 37.25, -150);
  box(pale, 8.5, 46, 12, -35.6, 24.5, -150); box('roof', 9.1, 0.5, 12.6, -35.6, 47.7, -150);
  for (const y of [16, 26, 36, 43]) for (const dx of [-2, 2]) box('winDim', 1.3, 1.7, 0.1, -35.6 + dx, y, -143.95);
  // An inclined gallery lifts grain from the track shed.
  limb(gal, V(-72, 5, -128), V(-37, 33, -144), 1.6, 1.6, 4);
  box(gal, 16, 5.5, 7, -78, 4.25, -128);
  // Hopper cars wait on the yard track.
  const CARS = [std(0.72, 0.06, 80), std(0.55, 0.02, 250), std(0.5, 0.08, 190), std(0.6, 0.1, 55)];
  for (let i = 0; i < 6; i++) { const x = -38 - i * 14.5; if (i === 2 || i === 3) continue; box(CARS[i % 4], 13, 3, 2.9, x, 4.1, -122); box(under, 13, 1.1, 2.4, x, 2.05, -122); }

  /* ----- the bridge, north-east ----- */
  const steel = std(0.6, 0.035, 165, { roughness: 0.7 }), dark = std(0.3, 0.015, 250), pier = std(0.74, 0.012, 90);
  // A straight member in the bridge's own x-y plane.
  const bar = (m, x0, y0, x1, y1, z, th) => box(m, Math.hypot(x1 - x0, y1 - y0), th, th, (x0 + x1) / 2, (y0 + y1) / 2, z, 0, 0, Math.atan2(y1 - y0, x1 - x0));
  // The bridge runs along its own x, from the north shore.
  at(60, 0, -290, () => {
    // DK: the road deck. P: one truss panel. TOP: the top chord, by panel.
    const DK = 24, P = 6.5, X0 = 32, N = 22, TOP = [[0, 7], [5, 27], [8, 10], [11, 12.5], [14, 10], [17, 27], [22, 7]];
    const topY = n => { let i = 0; while (i < TOP.length - 2 && n > TOP[i + 1][0]) i++; const [n0, y0] = TOP[i], [n1, y1] = TOP[i + 1]; return DK + y0 + (y1 - y0) * (n - n0) / (n1 - n0); };
    box(steel, 276, 1.2, 9.6, 138, DK, 0);
    box(steel, 32, 2.2, 7, 16, DK - 1.7, 0); box(steel, 101, 2.2, 7, 225.5, DK - 1.7, 0);
    for (const x of [8, 20, 199, 223, 247, 271]) box(pier, 2.2, 24.5, 8, x, 11.2, 0);
    for (const x of [32, 175]) box(pier, 3, 24.5, 9, x, 11.2, 0);
    for (const x of [64.5, 142.5]) box(pier, 5, 24.5, 11, x, 11.2, 0);
    // The cantilever truss: its peaks stand over the two main piers.
    for (const z of [-4.5, 4.5]) for (let i = 0; i <= N; i++) {
      const x0 = X0 + i * P, x1 = x0 + P, y0 = topY(i), y1 = topY(i + 1);
      bar(steel, x0, DK, x0, y0, z, 0.45);
      if (i === N) continue;
      bar(steel, x0, y0, x1, y1, z, 0.7);
      if (i % 2) bar(steel, x0, y0, x1, DK, z, 0.4); else bar(steel, x0, DK, x1, y1, z, 0.4);
    }
    for (let i = 0; i <= N; i++) box(steel, 0.4, 0.4, 9, X0 + i * P, topY(i), 0);
    // The railway bridge lies beyond; its lift span waits raised.
    const RZ = -20, RD = 9;
    box(dark, 80, 2.6, 5, 60, RD, RZ); box(dark, 110, 2.6, 5, 200, RD, RZ);
    for (const x of [30, 55, 78, 170, 195, 220, 245]) box(pier, 2, 10, 6, x, 4, RZ);
    for (const x of [100, 145]) {
      for (const dz of [-3, 3]) box(dark, 2, 48, 2, x, 24, RZ + dz);
      box(dark, 3.4, 4, 8.4, x, 49, RZ); box(pier, 5, 10, 9, x, 4, RZ);
      for (const y of [14, 26, 38]) box(dark, 0.5, 0.5, 6, x, y, RZ);
    }
    box(dark, 42, 0.5, 5, 122.5, 38, RZ);
    for (const dz of [-2.6, 2.6]) {
      bar(dark, 101.5, 38, 143.5, 38, RZ + dz, 0.8); bar(dark, 107, 45, 138, 45, RZ + dz, 0.7);
      bar(dark, 101.5, 38, 107, 45, RZ + dz, 0.7); bar(dark, 138, 45, 143.5, 38, RZ + dz, 0.7);
      for (let i = 0; i < 6; i++) { const x = 107 + i * 6.2; bar(dark, x, 38, x, 45, RZ + dz, 0.4); if (i < 5) bar(dark, x, i % 2 ? 45 : 38, x + 6.2, i % 2 ? 38 : 45, RZ + dz, 0.35); }
    }
  }, -0.8112);

  /* ----- the north shore ----- */
  const shore = std(0.42, 0.07, 155, { noCast: true }), sulphur = std(0.9, 0.17, 100), SHED = [pale, std(0.6, 0.03, 240), std(0.7, 0.02, 90), std(0.5, 0.09, 35), std(0.9, 0.01, 95)];
  box(shore, 1400, 5, 36, 0, 1.8, -310);
  box(shore, 70, 24, 24, 40, 11.5, -304);
  box(pier, 130, 2.4, 30, -30, 0.2, -280);
  for (let i = 0; i < 30; i++) { const w = 10 + R() * 30, h = 4 + R() * 9; box(pick(SHED), w, h, 8, -330 + i * 22 + R() * 10, h / 2 - 0.6, -288 - R() * 3); }
  // Two yellow sulphur piles stand on the far dock.
  put(sulphur, new THREE.ConeGeometry(15, 11, 24), -28, 6.9, -282); put(sulphur, new THREE.ConeGeometry(12, 9, 24), -3, 5.9, -281);
  limb(under, V(-54, 2, -282), V(-28, 13.4, -282), 0.5, 0.5, 4);
  for (const x of [-80, -68, 24]) put(SHED[4], new THREE.CylinderGeometry(5.5, 5.5, 9, 14), x, 5.9, -282);

  /* ----- the inlet ----- */
  box(std(0.3, 0.05, 235, { noCast: true }), 1500, 2, 330, 0, -1.72, -183);
  k.wetRoad(1400, 320, 0, -0.6, -180, col(0.3, 0.06, 230));
  // Two sheets of pale streaks drift apart: the shimmer.
  const g1 = tex(256, 256, (g, w, h) => {
    const P = rng(5);
    g.fillStyle = '#fff';
    for (let i = 0; i < 46; i++) { g.globalAlpha = 0.25 + P() * 0.6; g.beginPath(); g.ellipse(P() * w, P() * h, 8 + P() * 22, 3 + P() * 4, 0, 0, 7); g.fill(); }
  }, { rx: 14, ry: 4 });
  const g2 = g1.clone();
  g2.repeat.set(10, 3); g2.needsUpdate = true;
  const sea = new THREE.PlaneGeometry(1400, 320).rotateX(-Math.PI / 2);
  for (const [t, y] of [[g1, -0.5], [g2, -0.42]]) {
    const m = new THREE.Mesh(sea, new THREE.MeshBasicMaterial({ map: t, color: col(0.95, 0.02, 230), transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    m.position.set(0, y, -180);
    k.group.add(m);
  }

  /* ----- the freighter ----- */
  // The bow points east. The house stands aft.
  const ship = new THREE.Group(), parts = new Map();
  const sb = (m, w, h, d, x, y, z = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); g.translate(x, y, z); if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g); };
  const hull = std(0.36, 0.14, 28), boot = std(0.27, 0.08, 25), white = std(0.9, 0.01, 95), hatch = std(0.5, 0.06, 160), jib = std(0.82, 0.14, 90);
  sb(hull, 72, 8.5, 13, -2, 3.3); sb(hull, 6, 8.5, 9, 37, 3.3); sb(hull, 4, 8.5, 5, 42, 3.3);
  sb(boot, 72.2, 1.4, 13.2, -2, 0); sb(boot, 6.2, 1.4, 9.2, 37, 0); sb(boot, 4.2, 1.4, 5.2, 42, 0);
  for (let i = 0; i < 5; i++) {
    sb(hatch, 9, 1, 10, -18 + i * 11, 8.05);
    if (i === 4) break;
    const x = -12.5 + i * 11;
    sb(jib, 1.4, 8, 1.4, x, 11.5); sb(white, 2.4, 2, 2.4, x, 16); sb(jib, 9.5, 0.6, 0.6, x + 4.6, 17.8, 0, 0.2);
  }
  sb(white, 11, 9.5, 12, -32, 12.3); sb(white, 5, 2.2, 14, -30, 18.1);
  sb(M.winDim, 4.6, 0.9, 14.1, -30, 18.3); sb(M.winDim, 9, 0.7, 12.1, -32, 14.5);
  sb(hull, 3.5, 4, 4, -36, 19); sb(white, 3.6, 1, 4.1, -36, 19.6); sb(white, 0.3, 3.5, 0.3, -29, 20.9);
  for (const [m, list] of parts) ship.add(new THREE.Mesh(mergeGeometries(list), m));
  ship.position.set(0, 0, -215);
  k.group.add(ship);

  /* ----- swimmers, a ball, gulls ----- */
  // Each swimmer: a body, a cap, two arms that windmill, some foam.
  const bodyG = mergeGeometries([ni(new THREE.BoxGeometry(1.1, 0.14, 0.4)).translate(-0.1, 0, 0), ico(0.11, 0.12, 0.11).translate(0.6, 0.07, 0)]);
  const capG = ico(0.115, 0.09, 0.115).translate(0.6, 0.12, 0), armG = ico(0.08, 0.08, 0.08, 0), foamG = new THREE.BoxGeometry(0.6, 0.03, 0.36);
  const foamM = new THREE.MeshBasicMaterial({ color: col(0.97, 0.01, 200) });
  const SX = PW + 1.2, LAP = PE - PW - 2.4, sw = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(), body = new THREE.Mesh(bodyG, M.skin), l = new THREE.Mesh(armG, M.skin), r = new THREE.Mesh(armG, M.skin), f = new THREE.Mesh(foamG, foamM);
    body.castShadow = true;
    f.position.set(-0.9, -0.01, 0);
    g.add(body, new THREE.Mesh(capG, SUIT[i]), l, r, f);
    g.position.set(SX, WY + 0.02, 4.3 + i * 2.6);
    k.group.add(g);
    sw.push({ g, l, r, f, v: 1.0 + R() * 0.45, ph: R() * 2, w: 3.4 + R() });
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), stripes('#e2483a', '#f6efe0'));
  ball.castShadow = true;
  // A gull: two wings in a shallow V.
  const gullG = mergeGeometries([new THREE.BoxGeometry(0.9, 0.03, 0.26).rotateZ(0.3).translate(0.42, 0.12, 0), new THREE.BoxGeometry(0.9, 0.03, 0.26).rotateZ(-0.3).translate(-0.42, 0.12, 0), new THREE.BoxGeometry(0.16, 0.12, 0.5)]);
  const gulls = [0, 1, 2].map(() => new THREE.Mesh(gullG, M.trim));
  k.group.add(ball, ...gulls);

  k.onFrame(t => {
    for (let i = 0; i < sw.length; i++) {
      // Each swims a length, turns, and swims back.
      const s = sw[i], u = (t * s.v / LAP + s.ph) % 2, fwd = u < 1, a = -t * s.w + s.ph * 9;
      s.g.position.x = SX + (fwd ? u : 2 - u) * LAP;
      s.g.rotation.y = fwd ? 0 : Math.PI;
      s.l.position.set(0.25 + Math.cos(a) * 0.42, Math.sin(a) * 0.32, 0.26);
      s.r.position.set(0.25 - Math.cos(a) * 0.42, -Math.sin(a) * 0.32, -0.26);
      s.f.scale.x = 0.7 + 0.3 * Math.sin(t * 9 + i);
    }
    ball.position.set(7 + Math.sin(t * 0.21) * 0.8, WY + 0.17 + Math.sin(t * 1.7) * 0.02, 17.4 + Math.cos(t * 0.17) * 0.5);
    ball.rotation.set(t * 0.2, 0, Math.sin(t * 0.9) * 0.2);
    for (let i = 0; i < 3; i++) {
      const g = gulls[i], th = t * (0.22 + i * 0.05) + i * 2.1, r = 14 + i * 7;
      g.position.set(8 + Math.cos(th) * r, 9 + i * 2.5 + Math.sin(t * 0.4 + i) * 0.8, -42 + Math.sin(th) * r);
      g.rotation.y = -th;
      g.scale.set(1.5, 1.5 * (0.6 + 0.5 * Math.sin(t * 4 + i * 2)), 1.5);
    }
    // The freighter sails east, under the main span, and comes again.
    ship.position.x = -84 + (t * 1.1 + 110) % 320;
    c1.offset.set(t * 0.02, t * 0.013); c2.offset.set(-t * 0.016, t * 0.02);
    g1.offset.x = t * 0.004; g2.offset.set(-t * 0.003, t * 0.002);
  });
}
