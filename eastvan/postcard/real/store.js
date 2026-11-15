// East Van postcards, realistic: the corner store on a clear cold night.
// Same lens and plan as block-out card 7.
import { THREE, V, col, rng, hash, mCyl, mPlane, canvasTex } from './rkit.js';

const PI = Math.PI, lampCol = col(0.84, 0.13, 68);
export const card = {
  cap: 'Corner store · 9:40 pm · Clear', blockout: 7,
  cam: { pos: [3.4, 1.5, 9.6], yaw: 34, pitch: 0, up: 30, down: 15, minHalf: 0.4 },
  // The moon stands behind the viewer, so both fronts take its light.
  hour: 21.5, sun: [0.45, 0.6, 0.65], fill: [col(0.75, 0.05, 250), 0.3],
  // A high env value keeps the night shadows blue.
  fog: col(0.17, 0.05, 268), fogD: 0.007, exposure: 1.15, env: 8,
  sky: { cloudA: 0.1, cov: 0.55, cloud: col(0.16, 0.03, 265), cloudLit: col(0.26, 0.04, 280), hazeA: 0.6, hazeK: 9, stars: 1, sunCol: col(0.8, 0.04, 250, 0.3) },
  rain: 0, mtn: col(0.15, 0.045, 266), flock: 0,
  bloom: [0.42, 0.65, 1.0], focus: 20.6, aperture: 0.00012,
  lens: { con: 1.06, sat: 1.1, lift: [0.006, 0.016, 0.05], vig: 0.4, grain: 0.07 },
};

export function build(k) {
  const { M, box, put, limb, at, lapWall, sash, room, roofOn, gableFront, porch, door, fence, kerb, pole, wire, tree, std, paint, glow, signMat } = k;
  // RW: the kerb line. KB: the back of the kerb.
  // CR: the corner radius. RY: the road surface.
  // H1: the shop's height. H2: the top of the siding.
  // FL: the shop floor.
  const R = rng(27), RW = 4.2, KB = 4.38, CR = 1.3, RY = -0.145, H1 = 3.6, H2 = 6.7, FL = 0.16;
  const pick = a => a[Math.floor(R() * a.length)], v2 = (x, y) => new THREE.Vector2(x, y);
  const ball = (r, d = 1) => new THREE.IcosahedronGeometry(r, d), disc = (r, n = 24) => mCyl(r, r, 0.02, n).rotateX(PI / 2);
  // A flat slab from [x, z] plan points: h thick, base at y.
  const slab = (m, pts, h, y) => put(m, new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => v2(p[0], -p[1]))), { depth: h, bevelEnabled: false }).rotateX(-PI / 2), 0, y, 0);

  /* ----- materials ----- */
  const sid = std(col(0.45, 0.13, 28), { map: M.siding.map, normalMap: M.siding.normalMap, roughnessMap: M.siding.roughnessMap, roughness: 0.75 });
  const green = paint(0.36, 0.08, 160), orange = paint(0.72, 0.17, 60), catM = std(col(0.62, 0.13, 55), { roughness: 0.9 });
  const awn = std(0xffffff, { roughness: 0.75, map: canvasTex(64, 8, 0.44, (g, w, h) => { g.fillStyle = '#efe3c4'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f6d50'; g.fillRect(0, 0, w / 2, h); }) });
  const mono = px => `700 ${px}px ui-monospace, monospace`;
  const signM = signMat('LUCKY HERON GROCERY', { w: 1024, h: 160, bg: '#f6e7b4', fg: '#b3261e', font: mono(78), k: 1.4 });
  const bladeM = signMat('GROCERY', { w: 256, h: 128, bg: '#b3261e', fg: '#f6e7b4', font: mono(50), k: 1.3 });
  const phoneM = signMat('PHONE', { w: 256, h: 56, bg: '#1d4fa8', fg: '#fff', font: mono(44), k: 1.2 });
  // The stop face is dim: it reads as lit by the lamp.
  const stopM = signMat('STOP', { w: 256, h: 256, bg: '#b3261e', fg: '#fff', font: mono(92), k: 0.7 });
  // One atlas holds the painted plates: street names, arrow, ice label.
  const plateM = std(0xffffff, { roughness: 0.5, map: canvasTex(512, 256, 1, g => {
    g.fillStyle = '#1f5d3a'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#f2c230'; g.fillRect(0, 128, 128, 128); g.fillStyle = '#e9eef2'; g.fillRect(128, 128, 384, 128);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = mono(46);
    g.fillText('ALDERWICK ST', 256, 34, 480); g.fillText('E MOSSLIGHT AVE', 256, 98, 480);
    g.fillStyle = '#1d4fa8'; g.font = mono(100); g.fillText('ICE', 320, 196);
    g.fillStyle = '#161616'; g.fillRect(22, 182, 52, 20); g.beginPath(); g.moveTo(70, 158); g.lineTo(108, 192); g.lineTo(70, 226); g.fill();
  }) });
  // A plate that shows one atlas region, given in pixels.
  const plate = (w, h, x, y, pw, ph) => {
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    for (let i = 0; i < 4; i++) uv.setXY(i, (x + uv.getX(i) * pw) / 512, 1 - (y + (1 - uv.getY(i)) * ph) / 256);
    return geo;
  };
  // The neon has two states; the frame hook swaps them.
  const neonOn = col(0.66, 0.24, 22, 8), neonOff = col(0.66, 0.24, 22, 0.8), neon = glow(neonOn);
  const tube = glow(col(0.93, 0.05, 95, 6.5)), cool = glow(col(0.9, 0.05, 215, 0.6)), litW = glow(col(0.8, 0.1, 75, 0.6)), tailM = glow(col(0.55, 0.22, 28, 1.5));
  const goods = [[0.6, 0.18, 28], [0.8, 0.15, 92], [0.55, 0.13, 150], [0.5, 0.13, 255], [0.88, 0.03, 90]].map(c => paint(...c, { roughness: 0.5 }));
  goods.push(glow(col(0.8, 0.14, 85, 0.45)), glow(col(0.7, 0.13, 20, 0.35)));
  const fruit = [orange, goods[0], goods[2], goods[1]], petal = [goods[1], goods[0], M.trim, orange];
  const carGlass = std(col(0.08, 0.02, 250), { roughness: 0.08, envMapIntensity: 2 });
  const carPaint = [[0.3, 0.1, 25], [0.55, 0.01, 250], [0.22, 0.05, 240]].map(c => std(col(...c), { roughness: 0.25, metalness: 0.5 }));

  /* ----- ground: one mirror road, four blocks, the circle ----- */
  k.mirrorRoad(520, 520, -100, RY, -100);
  const C = RW + CR, F = 230, FAR = F - 36;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(M.lawn, F, 0.2, F, sx * (7 + F / 2), -0.1, sz * (7 + F / 2));
    kerb(F, sx * (C + (sx * sz > 0 ? F : 0)), sz * RW, -sz * PI / 2);
    kerb(F, sx * RW, sz * (C + (sx * sz < 0 ? F : 0)), sx < 0 ? PI : 0);
    // The corner: five short kerbs on the arc, a pad behind.
    const arc = [], px = a => sx * (C - CR * Math.cos(a)), pz = a => sz * (C - CR * Math.sin(a));
    for (let i = 0; i <= 5; i++) {
      const a = i * PI / 10, am = a - PI / 20, a0 = sx * sz > 0 ? a : a - PI / 10;
      if (i) kerb(0.42, px(a0), pz(a0), Math.atan2(-sz * Math.sin(am), sx * Math.cos(am)));
      arc.push([sx * (C - (CR - 0.17) * Math.cos(a)), sz * (C - (CR - 0.17) * Math.sin(a))]);
    }
    slab(M.walk, [[sx * KB, sz * 7], ...arc, [sx * 7, sz * KB], [sx * 7, sz * 7]], 0.1, -0.08);
    // Each sidewalk: slabs with joints near the corner, one long strip beyond.
    for (const ax of [0, 1]) {
      for (let i = 0; i < 24; i++) for (const c of [0, 1]) {
        const a = 7.75 + i * 1.5, b = KB + 0.655 + c * 1.31, lift = i > 7 && R() < 0.12 ? R() * 0.025 : 0;
        box(M.walk, ax ? 1.298 : 1.488, 0.1, ax ? 1.488 : 1.298, sx * (ax ? b : a), -0.03 + lift, sz * (ax ? a : b), 0, 0, lift * 0.3);
      }
      box(M.walk, ax ? 2.62 : FAR, 0.1, ax ? FAR : 2.62, sx * (ax ? 5.69 : 43 + FAR / 2), -0.03, sz * (ax ? 43 + FAR / 2 : 5.69));
    }
  }
  // The traffic circle: kerb ring, soil mound, shrubs, tree, sign.
  {
    const ring = new THREE.LatheGeometry([[1.9, -0.2], [1.9, 0], [1.885, 0.035], [1.85, 0.05], [1.7, 0.05], [1.7, -0.2]].map(p => v2(...p)), 40), uv = ring.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 12, uv.getY(i) * 0.6);
    put(M.curb, ring, 0, -0.01, 0);
    put(M.soil, new THREE.SphereGeometry(1.72, 28, 6, 0, PI * 2, 0, PI / 2).scale(1, 0.16, 1));
    for (let i = 0; i < 8; i++) {
      const a = i * 0.8 + R(), r = 0.5 + R() * 0.75, s = 0.28 + R() * 0.2;
      put(M.bush, ball(1, 2).scale(s, s * 0.72, s), Math.cos(a) * r, 0.14 + s * 0.5, Math.sin(a) * r);
    }
    // The tree stands east of centre, clear of the store view.
    tree(0.7, -0.4, 31, { leaves: 0.3, size: 0.34 });
    put(M.galv, mCyl(0.03, 0.03, 2.3, 8), 0.6, 1.15, 1.55); box(M.galv, 0.5, 0.5, 0.02, 0.6, 2.05, 1.57);
    put(plateM, plate(0.46, 0.46, 0, 128, 128, 128), 0.6, 2.05, 1.582);
  }

  /* ----- the store: a wood-frame house with the shop below ----- */
  // The shell: west and north walls, the roof deck, the chimney.
  box(sid, 0.15, H2, 9, -16.95, H2 / 2, -11.5); box(sid, 10, H2, 0.15, -12, H2 / 2, -15.92);
  box(M.roof, 9.9, 0.1, 8.9, -12, H2 + 0.05, -11.5);
  box(M.brick, 0.62, 1.9, 0.62, -15, 7.7, -9.5); box(M.found, 0.74, 0.1, 0.74, -15, 8.7, -9.5);
  // One street face, built to face +z, from x0 to x1.
  // w: the shopfront's width about x = 0.
  // solid: the plain wall beside it. sw: the box sign's width.
  // wins: [x, back] for each sash above.
  function face(x0, x1, w, solid, wins, sw) {
    const len = x1 - x0, mid = (x0 + x1) / 2, n = Math.round(w / 1.25), aw = w + 0.4, sh = sw / 6.4;
    const sl = solid[1] - solid[0], sm = (solid[0] + solid[1]) / 2;
    // The floor above: siding, sashes, a belt course, corner boards.
    lapWall(sid, x0, x1, H1 + 0.1, H2, 0, wins.map(([x]) => [x - 0.5, x + 0.5, 4.6, 6.1]));
    for (const [x, back] of wins) sash(x, 5.35, 0, 1, 1.5, back);
    box(M.trim, len, 0.18, 0.07, mid, H1 + 0.02, 0.03); box(M.trim, len, 0.03, 0.13, mid, H1 + 0.125, 0.05);
    for (const x of [x0 + 0.05, x1 - 0.05]) box(M.trim, 0.12, H2 - H1, 0.12, x, (H1 + H2) / 2, 0);
    // The cornice: frieze, brackets, crown, then a parapet with coping.
    box(M.trim, len, 0.26, 0.05, mid, H2 - 0.22, 0.035); box(M.trim, len + 0.7, 0.1, 0.5, mid, H2 - 0.03, 0.22); box(M.trim, len + 0.8, 0.07, 0.56, mid, H2 + 0.055, 0.25);
    for (let x = x0 + 0.25; x < x1; x += 0.62) box(M.trim, 0.09, 0.3, 0.26, x, H2 - 0.23, 0.16);
    box(sid, len, 0.36, 0.1, mid, H2 + 0.27, -0.05); box(M.galv, len + 0.06, 0.04, 0.2, mid, H2 + 0.47, -0.05);
    // The plain wall beside the shop: siding over a water table.
    lapWall(sid, solid[0], solid[1], 0.3, H1 - 0.07, 0);
    box(M.found, sl, 0.12, 0.08, sm, 0.06, 0); box(M.trim, sl, 0.2, 0.06, sm, 0.2, 0.03); box(M.trim, sl, 0.03, 0.11, sm, 0.31, 0.05, 0.25);
    box(M.trim, 0.12, H1, 0.12, solid[0] < 0 ? solid[0] + 0.05 : solid[1] - 0.05, H1 / 2, 0);
    // The shopfront: a panelled riser, plate glass, a transom of small panes.
    box(M.trim, w, 0.62, 0.1, 0, 0.31, -0.02); box(M.trim, w + 0.04, 0.05, 0.2, 0, 0.645, 0);
    for (let i = 0; i < n; i++) box(green, w / n - 0.26, 0.4, 0.03, -w / 2 + (i + 0.5) * w / n, 0.31, 0.035);
    put(M.glass, new THREE.PlaneGeometry(w, 1.9), 0, 1.62, -0.02); put(M.glass, new THREE.PlaneGeometry(w, 0.5), 0, 2.88, -0.02);
    for (let i = 0; i <= n; i++) box(M.trim, 0.06, 2.5, 0.09, -w / 2 + i * w / n, 1.92, -0.02);
    box(M.trim, w, 0.07, 0.11, 0, 2.6, -0.02);
    for (let x = -w / 2 + 0.42; x < w / 2 - 0.1; x += 0.42) box(M.trim, 0.03, 0.5, 0.05, x, 2.88, -0.02);
    box(green, aw, 0.46, 0.12, 0, 3.37, 0);
    for (const s of [-1, 1]) box(M.trim, 0.2, 3.14, 0.14, s * (w / 2 + 0.1), 1.57, 0);
    // The awning: striped slope, scalloped valance, front bar, two iron arms.
    box(awn, aw, 0.03, 1.4, 0, 2.93, 0.72, 0.4); box(awn, aw, 0.16, 0.02, 0, 2.58, 1.365); box(M.iron, aw, 0.03, 0.03, 0, 2.65, 1.345);
    for (let x = -aw / 2 + 0.11; x < aw / 2; x += 0.22) put(green, new THREE.CircleGeometry(0.11, 8, PI, PI), x, 2.5, 1.376);
    for (const s of [-1, 1]) limb(M.iron, V(s * (aw / 2 - 0.03), 2.45, 0.06), V(s * (aw / 2 - 0.03), 2.64, 1.34), 0.014, 0.014, 5);
    // The box sign sits between the awning and the sills.
    box(M.iron, sw + 0.1, sh + 0.08, 0.14, 0, 3.98, 0.09); put(signM, new THREE.PlaneGeometry(sw, sh), 0, 3.98, 0.165);
  }
  // The south front; upstairs a TV room, a blind, a curtain.
  at(-11.2, 0, -7, () => {
    face(-5.8, 4.2, 5, [-5.8, -2.7], [[1, null], [-1.7, M.blind], [-4.4, M.curtainW]], 4.6);
    room(-0.2, 2.2, H1 + 0.06, H2 - 0.1, -0.1, -3.2);
    box(M.tv, 0.03, 0.5, 0.9, -0.15, 5.5, -1.7);
    // The window display: a ledge of goods behind the south glass.
    box(M.wood, 4.8, 0.04, 0.36, 0, 0.7, -0.28);
    for (let x = -2.2; x < 2.2; x += 0.34) if (R() < 0.7) { const h = 0.14 + R() * 0.2; box(pick(goods), 0.24, h, 0.2, x, 0.72 + h / 2, -0.28, 0, R() - 0.5); }
    // OPEN in neon: thin tubes behind the glass, in a tube frame.
    const O = Array.from({ length: 13 }, (_, i) => [0.5 + 0.5 * Math.cos(i * PI / 6), 0.5 + 0.5 * Math.sin(i * PI / 6)]);
    const strokes = [[0, O], [1.55, [[0, 0], [0, 1], [0.75, 1], [1, 0.85], [1, 0.6], [0.75, 0.45], [0, 0.45]]], [3.1, [[1, 1], [0, 1], [0, 0], [1, 0]]], [3.1, [[0, 0.5], [0.8, 0.5]]],
      [4.65, [[0, 0], [0, 1], [1, 0], [1, 1]]], [0, [[-0.5, -0.35], [6.15, -0.35], [6.15, 1.35], [-0.5, 1.35], [-0.5, -0.35]]]];
    for (const [ox, pts] of strokes) for (let i = 1; i < pts.length; i++) {
      limb(neon, V(-2.33 + (ox + pts[i - 1][0]) * 0.16, 2 + pts[i - 1][1] * 0.3, -0.12), V(-2.33 + (ox + pts[i][0]) * 0.16, 2 + pts[i][1] * 0.3, -0.12), 0.011, 0.011, 5);
    }
  });
  // The east front.
  at(-7, 0, -10.6, () => face(-3.6, 5.4, 3.8, [2.1, 5.4], [[-0.2, M.blind], [3, M.curtainC]], 3.4), PI / 2);
  // The clipped corner: two piers, the door, one step, a transom.
  at(-7.75, 0, -7.75, () => {
    for (const s of [-1, 1]) box(green, 0.5, 3.14, 0.14, s * 0.81, 1.57, 0);
    box(green, 2.12, 0.46, 0.14, 0, 3.37, 0); box(M.found, 1.5, FL, 0.5, 0, FL / 2, 0.2);
    door(0, FL, 0, M.door);
    put(M.glass, new THREE.PlaneGeometry(1.12, 0.78), 0, 2.74, -0.02); box(M.trim, 0.04, 0.78, 0.05, 0, 2.74, -0.02);
  }, PI / 4);
  // The floor above keeps its square corner: a soffit, a bulb.
  slab(M.trim, [[-8.5, -7], [-7, -7], [-7, -8.5]], 0.08, 3.52);
  put(M.iron, mCyl(0.07, 0.07, 0.04, 10), -7.3, 3.5, -7.3); put(M.bulb, new THREE.SphereGeometry(0.05, 10, 8), -7.3, 3.44, -7.3);
  // The blade sign hangs off the east wall, near the corner.
  box(M.iron, 1, 0.56, 0.1, -6.5, 4.05, -8.65); box(M.iron, 1.1, 0.03, 0.03, -6.45, 4.36, -8.65);
  for (const s of [-1, 1]) put(bladeM, new THREE.PlaneGeometry(0.92, 0.46), -6.5, 4.05, -8.65 + s * 0.055, 0, s < 0 ? PI : 0);

  /* ----- inside the shop ----- */
  // The floor and the ceiling follow the clipped corner.
  // A partition closes the back.
  // No wall stands between the lamp inside and the glass.
  const plan = [[-16.85, -13], [-7.15, -13], [-7.15, -8.6], [-8.6, -7.15], [-16.85, -7.15]];
  slab(M.floor, plan, 0.06, FL - 0.06); slab(M.room, plan, 0.06, 3.5);
  box(M.room, 9.7, 3.4, 0.06, -12, 1.8, -13.03); box(M.room, 0.06, 3.4, 5.9, -16.84, 1.8, -10.1); box(M.room, 3, 3.4, 0.06, -15.4, 1.8, -7.13);
  // A shelf unit that faces +z: len wide, h tall, n shelves.
  function shelf(len, h, n) {
    box(M.wood, len, h, 0.04, 0, FL + h / 2, -0.2);
    for (const s of [-1, 1]) box(M.wood, 0.04, h, 0.4, s * len / 2, FL + h / 2, 0);
    for (let i = 0; i < n; i++) {
      const y = FL + 0.12 + i * (h - 0.2) / n;
      box(M.wood, len, 0.03, 0.4, 0, y, 0);
      // Goods come in short runs of one colour: boxes and tins.
      for (let x = -len / 2 + 0.08, j = 0, m; x < len / 2 - 0.22; j++) {
        const bw = 0.09 + R() * 0.1, bh = 0.1 + R() * 0.13;
        if (j % 3 === 0) m = pick(goods);
        if (R() < 0.3) put(m, mCyl(bw * 0.45, bw * 0.45, bh, 8), x + bw / 2, y + 0.015 + bh / 2, 0.08);
        else box(m, bw, bh, 0.15, x + bw / 2, y + 0.015 + bh / 2, 0.08);
        x += bw + 0.012;
      }
    }
  }
  at(-15.4, 0, -12.8, () => shelf(2.6, 2, 5)); at(-12.6, 0, -12.8, () => shelf(2.6, 2, 5));
  at(-16.59, 0, -10.2, () => shelf(4.4, 2, 5), PI / 2); at(-14.6, 0, -11, () => shelf(3, 1.4, 3));
  // The drinks fridge: white case, lit back, bottles on wire shelves.
  at(-10, FL, -12.97, () => {
    box(M.trim, 1.8, 2, 0.45, 0, 1, 0.225); box(M.trim, 1.8, 0.3, 0.25, 0, 1.85, 0.575); box(M.trim, 1.8, 0.14, 0.25, 0, 0.07, 0.575);
    for (const s of [-1, 1]) box(M.trim, 0.05, 1.56, 0.25, s * 0.875, 0.92, 0.575);
    put(cool, mPlane(1.7, 1.56), 0, 0.92, 0.455);
    for (let i = 0; i < 4; i++) {
      box(M.galv, 1.7, 0.015, 0.2, 0, 0.2 + i * 0.38, 0.56);
      for (let j = 0; j < 19; j++) put(goods[(i * 2 + (j / 4 | 0)) % 5], mCyl(0.03, 0.035, 0.24, 6), -0.78 + j * 0.086, 0.33 + i * 0.38, 0.56);
    }
    put(M.glass, new THREE.PlaneGeometry(1.7, 1.56), 0, 0.92, 0.7); box(M.iron, 0.04, 1.56, 0.03, 0, 0.92, 0.7);
  });
  // The counter: a till with its display, a rack of sweets.
  box(M.wood, 1.9, 0.9, 0.6, -8.9, FL + 0.45, -11.3); box(M.iron, 2, 0.04, 0.7, -8.9, FL + 0.92, -11.3);
  box(M.plastK, 0.4, 0.2, 0.36, -8.5, FL + 1.04, -11.3); box(M.plastK, 0.3, 0.22, 0.03, -8.5, FL + 1.27, -11.42, -0.3);
  for (let i = 0; i < 6; i++) box(goods[i], 0.12, 0.1 + (i % 3) * 0.04, 0.2, -9.7 + i * 0.15, FL + 0.99 + (i % 3) * 0.02, -11.25);
  // Two fluorescent tubes in their trays.
  // The clock reads 9:40.
  for (const x of [-13.2, -9.6]) { box(M.trim, 0.2, 0.05, 2.5, x, 3.475, -10.1); box(tube, 0.06, 0.04, 2.4, x, 3.43, -10.1); }
  put(M.trim, disc(0.2), -11.1, 2.75, -12.99); put(M.iron, new THREE.TorusGeometry(0.2, 0.015, 6, 24), -11.1, 2.75, -12.98);
  for (const [deg, len] of [[240, 0.16], [290, 0.11]]) box(M.iron, 0.014, len, 0.01, -11.1 + Math.sin(deg * PI / 180) * len / 2, 2.75 + Math.cos(deg * PI / 180) * len / 2, -12.975, 0, 0, -deg * PI / 180);

  /* ----- the sidewalk in front ----- */
  // The bench: wood slats on two iron frames.
  at(-12.45, 0.02, -6.6, () => {
    for (let i = 0; i < 4; i++) box(M.wood, 1.6, 0.025, 0.085, 0, 0.45, -0.15 + i * 0.1);
    for (let i = 0; i < 3; i++) box(M.wood, 1.6, 0.085, 0.025, 0, 0.6 + i * 0.11, -0.24 - i * 0.02, -0.18);
    for (const s of [-1, 1]) {
      box(M.iron, 0.04, 0.44, 0.04, s * 0.68, 0.22, 0.17); box(M.iron, 0.04, 0.04, 0.42, s * 0.68, 0.42, -0.01);
      limb(M.iron, V(s * 0.68, 0, -0.2), V(s * 0.68, 0.9, -0.31), 0.02, 0.02, 6);
    }
    // The cat sits at the east end and faces the door.
    put(catM, ball(1, 2).scale(0.17, 0.11, 0.1), 0.4, 0.57, 0); put(catM, ball(1, 2).scale(0.07, 0.065, 0.065), 0.55, 0.69, 0.01);
    for (const s of [-1, 1]) put(catM, new THREE.ConeGeometry(0.022, 0.05, 4), 0.55, 0.76, 0.01 + s * 0.035);
  });
  // The fruit stand: a tilted tray of slatted crates, on four legs.
  const TA = 0.35, ca = Math.cos(TA), sa = Math.sin(TA);
  at(-9.95, 0.02, -6.42, () => {
    for (const s of [-1, 1]) { box(M.wood, 0.06, 1, 0.06, s * 0.8, 0.5, -0.38); box(M.wood, 0.06, 0.72, 0.06, s * 0.8, 0.36, 0.38); box(M.wood, 0.05, 0.06, 0.8, s * 0.8, 0.4, 0); }
    box(M.wood, 1.75, 0.03, 0.95, 0, 0.87, 0, TA); box(M.wood, 1.75, 0.08, 0.03, 0, 0.9 - 0.46 * sa, 0.46 * ca, TA);
    for (let i = 0; i < 8; i++) {
      const cx = -0.63 + (i % 4) * 0.42, u = i < 4 ? -0.22 : 0.22, m = fruit[(i + (i > 3)) % 4];
      // A crate point: du down the slope, v off the board.
      const py = (du, v) => 0.87 - (u + du) * sa + v * ca, pz = (du, v) => (u + du) * ca + v * sa;
      const slat = (dx, du, v, w, h, d) => box(M.wood, w, h, d, cx + dx, py(du, v), pz(du, v), TA);
      slat(0, 0, 0.022, 0.38, 0.012, 0.38);
      for (const e of [-1, 1]) { slat(e * 0.186, 0, 0.07, 0.012, 0.09, 0.38); slat(0, e * 0.186, 0.045, 0.37, 0.035, 0.012); slat(0, e * 0.186, 0.095, 0.37, 0.035, 0.012); }
      for (let f = 0; f < 9; f++) { const du = ((f / 3 | 0) - 1) * 0.11; put(m, ball(0.05 + R() * 0.01), cx + (f % 3 - 1) * 0.11 + (R() - 0.5) * 0.02, py(du, 0.08), pz(du, 0.08)); }
    }
  });
  // Buckets of cut flowers: tapered pails, stems, small heads.
  for (let i = 0; i < 4; i++) {
    const x = -10.7 + i * 0.5, z = -5.72 + (i % 2) * 0.12;
    put(M.galv, mCyl(0.15, 0.11, 0.32, 14), x, 0.18, z); put(M.galv, new THREE.TorusGeometry(0.15, 0.008, 5, 16).rotateX(PI / 2), x, 0.34, z);
    for (let j = 0; j < 7; j++) {
      const a = j * 0.9 + i, r = 0.04 + R() * 0.14, top = V(x + Math.cos(a) * r, 0.6 + R() * 0.22, z + Math.sin(a) * r);
      limb(M.bush, V(x + Math.cos(a) * 0.04, 0.3, z + Math.sin(a) * 0.04), top, 0.006, 0.005, 4); put(petal[(i + (j > 4)) % 4], ball(0.035 + R() * 0.015), top.x, top.y, top.z);
    }
  }
  // The ice chest: white box, sloped lid, two hinges, a handle.
  at(-14.6, 0.02, -6.66, () => {
    box(M.trim, 1.2, 0.76, 0.6, 0, 0.42, 0); box(goods[3], 1.24, 0.05, 0.66, 0, 0.84, 0.02, 0.1);
    for (const s of [-1, 1]) { box(M.iron, 0.08, 0.03, 0.05, s * 0.4, 0.875, -0.3); box(M.iron, 0.1, 0.04, 0.5, s * 0.5, 0.02, 0); box(M.galv, 0.02, 0.02, 0.05, s * 0.19, 0.82, 0.355); }
    box(M.galv, 0.4, 0.025, 0.025, 0, 0.82, 0.385); put(plateM, plate(0.6, 0.3, 192, 136, 256, 112), 0, 0.45, 0.305);
  });
  // The pay phone: a steel hood, the set, a lit strip.
  at(-15.7, 0, -6.98, () => {
    box(M.galv, 0.5, 0.03, 0.3, 0, 1.86, 0.15); box(M.galv, 0.5, 0.8, 0.02, 0, 1.46, 0.01); box(M.galv, 0.5, 0.12, 0.04, 0, 1.93, 0.28);
    for (const s of [-1, 1]) box(M.galv, 0.02, 0.8, 0.3, s * 0.25, 1.46, 0.15);
    box(M.plastK, 0.26, 0.42, 0.09, 0.04, 1.4, 0.065); box(M.galv, 0.12, 0.14, 0.012, 0.07, 1.36, 0.115); box(M.plastK, 0.05, 0.24, 0.05, -0.13, 1.44, 0.1);
    put(phoneM, new THREE.PlaneGeometry(0.46, 0.1), 0, 1.93, 0.302);
  });
  // The notice board: paper sheets, pinned askew.
  box(M.wood, 0.9, 0.7, 0.03, -16.45, 1.5, -6.955);
  for (let i = 0; i < 6; i++) box(i % 3 ? M.trim : goods[1], 0.15, 0.2, 0.004, -16.72 + (i % 3) * 0.27, 1.64 - (i / 3 | 0) * 0.28, -6.937, 0, 0, (i % 2 ? 1 : -1) * 0.08);
  // Two newspaper boxes at the east kerb: window, coin head, pull.
  [[-8.5, goods[0]], [-9.15, goods[3]]].forEach(([z, m]) => at(-4.85, 0.02, z, () => {
    box(m, 0.45, 0.62, 0.42, 0, 0.82, 0); box(M.iron, 0.09, 0.5, 0.09, 0, 0.26, 0); box(M.iron, 0.42, 0.03, 0.38, 0, 0.015, 0);
    box(M.trim, 0.3, 0.26, 0.01, 0, 0.86, 0.213); put(M.glass, new THREE.PlaneGeometry(0.34, 0.3), 0, 0.86, 0.222); box(M.galv, 0.2, 0.02, 0.02, 0, 0.66, 0.225);
    box(M.galv, 0.14, 0.1, 0.05, 0, 1.18, 0.12); box(M.plastK, 0.05, 0.008, 0.052, 0, 1.2, 0.121);
  }, 0.4));
  // The hydrant: barrel, bonnet, three caps.
  const hyd = goods[0];
  put(hyd, mCyl(0.1, 0.12, 0.5, 12), -4.62, 0.29, -6.4); put(hyd, mCyl(0.14, 0.14, 0.04, 12), -4.62, 0.04, -6.4); put(hyd, new THREE.SphereGeometry(0.105, 12, 8), -4.62, 0.54, -6.4);
  put(hyd, mCyl(0.03, 0.03, 0.06, 6), -4.62, 0.67, -6.4); put(hyd, mCyl(0.05, 0.05, 0.34, 8).rotateX(PI / 2), -4.62, 0.42, -6.4); put(hyd, mCyl(0.065, 0.065, 0.3, 8).rotateZ(PI / 2), -4.62, 0.38, -6.4);
  // The stop sign faces the junction; two street-name blades cross above it.
  at(-6.85, 0, -4.6, () => {
    put(M.galv, mCyl(0.03, 0.03, 3.4, 8), 0, 1.72, 0);
    put(M.trim, mCyl(0.42, 0.42, 0.015, 8).rotateY(PI / 8).rotateX(PI / 2), 0, 2.45, 0.04); put(stopM, new THREE.CircleGeometry(0.39, 8, PI / 8), 0, 2.45, 0.05);
    [[3.1, PI / 4], [3.28, -PI / 4]].forEach(([y, ry], i) => {
      box(green, 0.9, 0.16, 0.02, 0, y, 0, 0, ry);
      for (const s of [1, -1]) put(plateM, plate(0.86, 0.13, 16, i * 64, 480, 64), s * Math.sin(ry) * 0.012, y, s * Math.cos(ry) * 0.012, 0, ry + (s < 0 ? PI : 0));
    });
  }, PI / 4);

  /* ----- pole, lamp, wires ----- */
  const PX = -5.1, PZ = -4.8, LAMP = V(PX + 1.8, 8.3, PZ + 1.8);
  pole(PX, PZ); pole(-50, PZ); pole(42, PZ); pole(PX, -50, 10.6, 'x'); pole(PX, 42, 10.6, 'x');
  // The cobra head reaches over the junction on its arm.
  limb(M.galv, V(PX + 0.07, 8, PZ + 0.07), V(LAMP.x - 0.2, 8.42, LAMP.z - 0.2), 0.04, 0.03, 8);
  box(M.galv, 0.26, 0.1, 0.62, LAMP.x, 8.42, LAMP.z, 0, PI / 4); box(M.lampLens, 0.19, 0.03, 0.4, LAMP.x + 0.02, 8.36, LAMP.z + 0.02, 0, PI / 4);
  let perch;
  for (const [d, y, sag, r] of [[-1, 10.15, 0.45, 0.012], [0, 10.74, 0.45, 0.012], [1, 10.15, 0.45, 0.012], [0.2, 7.7, 0.65, 0.018]]) {
    const w = wire(V(PX, y, PZ + d), V(-50, y, PZ + d), sag, r);
    wire(V(PX, y, PZ + d), V(42, y, PZ + d), sag, r);
    if (y === 7.7) perch = w;
  }
  for (const [y, sag] of [[9.1, 0.5], [6.6, 0.8]]) { wire(V(PX + 0.2, y, PZ), V(PX + 0.2, y, -50), sag); wire(V(PX + 0.2, y, PZ), V(PX + 0.2, y, 42), sag); }
  // Service drops: the store, the north-east house, a house down the row.
  wire(V(PX, 7.7, PZ), V(-7.6, 6.3, -6.98), 0.25, 0.014, 0.03); wire(V(PX, 7.7, PZ), V(9.6, 5.4, -9.9), 0.5, 0.014, 0.03); wire(V(-50, 7.7, PZ), V(-45.4, 5.2, -9.9), 0.3, 0.014, 0.03);
  // The bike leans on the pole.
  // bp: a point in the leaned plane of the frame.
  {
    const LEAN = -0.2, cl = Math.cos(LEAN), sl = Math.sin(LEAN), bp = (x, y) => V(x, y * cl, y * sl);
    at(PX - 0.52, 0.02, PZ + 0.36, () => {
      for (const s of [-1, 1]) {
        put(M.plastK, new THREE.TorusGeometry(0.33, 0.018, 6, 28), s * 0.52, 0.35 * cl, 0.35 * sl, LEAN);
        for (let j = 0; j < 8; j++) limb(M.galv, bp(s * 0.52, 0.35), bp(s * 0.52 + Math.cos(j * PI / 4 + 0.2) * 0.32, 0.35 + Math.sin(j * PI / 4 + 0.2) * 0.32), 0.004, 0.004, 3);
      }
      const A = bp(-0.52, 0.35), F = bp(0.52, 0.35), BB = bp(-0.07, 0.3), S = bp(-0.2, 0.86), H = bp(0.36, 0.9);
      for (const [a, b] of [[BB, S], [S, H], [BB, bp(0.4, 0.72)], [A, BB], [A, bp(-0.18, 0.78)], [H, F]]) limb(goods[3], a, b, 0.016, 0.014, 6);
      limb(M.galv, S, bp(-0.22, 0.97), 0.012, 0.012, 6); box(M.plastK, 0.26, 0.04, 0.12, -0.24, 0.99 * cl, 0.99 * sl, LEAN);
      limb(M.galv, H, bp(0.33, 1.04), 0.012, 0.012, 6); box(M.plastK, 0.03, 0.03, 0.46, 0.33, 1.05 * cl, 1.05 * sl, LEAN);
    });
  }

  /* ----- the other corners and the rows ----- */
  // A gabled house with a porch.
  // Its front wall is the local z = 0 plane.
  function house(m, gab, backs, doorM) {
    const B = 1, E = 4;
    lapWall(m, -3.5, 3.5, B, E, 0, [[-2.5, -1.5, 1.85, 3.35], [-0.48, 0.48, B, B + 2.1], [1.5, 2.5, 1.85, 3.35]]);
    for (const s of [-1, 1]) { box(M.trim, 0.12, E - B, 0.12, s * 3.47, (B + E) / 2, 0.02); box(m, 0.15, E, 9, s * 3.43, E / 2, -4.5); }
    box(M.found, 7, B, 0.2, 0, B / 2, -0.08); box(M.dark, 6.8, E, 0.1, 0, E / 2, -0.4); box(M.dark, 7, E, 0.15, 0, E / 2, -9);
    gableFront(gab, 0, E, 7, 3, 0, [-0.5, 0.5, 0.6, 1.7]); roofOn(0, 0, 7, 9, E, 3);
    sash(-2, 2.6, 0, 1, 1.5, backs[0]); sash(2, 2.6, 0, 1, 1.5, backs[1]); sash(0, E + 1.15, 0, 1, 1.1, backs[2]);
    door(0, B, 0, doorM);
    porch({ x: 0, w: 7, zf: 0, base: B, sx: 0, post: [-3.35, -1.05, 1.05, 3.35], depth: 1.6 });
  }
  // Past 40 m a house is a dark box with one lit pane.
  function farHouse(lit) {
    box(M.dark, 7, 4, 9, 0, 2, -4.5); roofOn(0, 0, 7, 9, 4, 3);
    put(M.dark, new THREE.ShapeGeometry(new THREE.Shape([v2(-3.5, 0), v2(3.5, 0), v2(0, 3)])), 0, 4, 0);
    if (lit) put(litW, mPlane(1, 1.4), lit * 2, 2.6, 0.02);
    if (R() < 0.3) put(litW, mPlane(0.9, 1), 0, 5.1, 0.02);
  }
  at(-22.5, 0, -10, () => {
    house(M.siding, M.gable, [M.curtainC, M.blind, M.blind], M.door);
    // The porch lantern, by the door.
    box(M.iron, 0.1, 0.03, 0.1, 0.78, 3.12, 0.08); put(M.bulb, new THREE.SphereGeometry(0.045, 10, 8), 0.78, 3.02, 0.09);
  });
  at(-32.5, 0, -10, () => house(M.sidingP, M.sidingP, [M.blind, M.curtainW, M.blind], M.trim));
  at(-10, 0, -23, () => house(M.sidingP, M.gable, [M.blind, M.curtainC, M.blind], M.trim), PI / 2);
  at(12.5, 0, -10, () => house(M.siding, M.siding, [M.curtainW, M.blind, M.curtainC], M.door));
  for (let i = 0; i < 8; i++) {
    if (i > 1) at(-22.5 - i * 10, 0, -10, () => farHouse(i % 3 - 1));
    if (i) at(-10, 0, -23 - i * 10, () => farHouse((i + 1) % 3 - 1), PI / 2);
    at(10, 0, -23 - i * 10, () => farHouse(i % 2), -PI / 2);
    if (i < 3) at(22.5 + i * 10, 0, -10, () => farHouse(0));
  }
  // The two south corners stand behind the lens.
  at(-12.5, 0, 10, () => farHouse(0), PI); at(12.5, 0, 10, () => farHouse(0), PI);
  fence(-26.3, -7.3, -23.4, -7.3); fence(-21.6, -7.3, -18.3, -7.3); fence(-18.3, -7.3, -18.3, -10);
  fence(7.3, -7.3, 11.6, -7.3); fence(13.4, -7.3, 16.3, -7.3); fence(7.3, -7.3, 7.3, -19);
  fence(-7.3, -19.2, -7.3, -22.1); fence(-7.3, -23.9, -7.3, -26.8);
  // Tall firs stand behind the store roof.
  // A ragged cone reads as a fir at night.
  for (let i = 0; i < 6; i++) {
    const x = -44 + i * 5 + R() * 2, z = -30 - R() * 12, h = 14 + R() * 8, g = new THREE.ConeGeometry(2.3 + R(), h, 22, 30, true), p = g.attributes.position;
    for (let j = 0; j < p.count; j++) { const q = 0.62 + 0.6 * hash(Math.floor(p.getY(j) * 3.1) * 7 + Math.floor(Math.atan2(p.getZ(j), p.getX(j)) * 3.5) * 13 + i); p.setX(j, p.getX(j) * q); p.setZ(j, p.getZ(j) * q); }
    put(M.fir, g, x, 2 + h / 2, z); put(M.twig, mCyl(0.2, 0.3, 3, 6), x, 1.5, z);
  }

  /* ----- parked cars ----- */
  const side = (s, w, o) => new THREE.ExtrudeGeometry(s, { depth: w, curveSegments: 8, bevelEnabled: false, ...o }).translate(0, 0, -w / 2);
  // A car: nose to +x, wheels on y = 0.
  // One side profile makes the body.
  function car(m) {
    const s = new THREE.Shape();
    s.moveTo(-2.15, 0.25); s.lineTo(-1.68, 0.25); s.absarc(-1.32, 0.25, 0.36, PI, 0, true); s.lineTo(0.96, 0.25); s.absarc(1.32, 0.25, 0.36, PI, 0, true);
    for (const p of [[2.15, 0.25], [2.2, 0.55], [2.1, 0.78], [0.95, 0.86], [0.35, 1.36], [-1.05, 1.38], [-1.7, 0.9], [-2.2, 0.84], [-2.22, 0.5]]) s.lineTo(...p);
    // The bevel rounds the shoulders; the offset keeps the profile true.
    put(m, side(s, 1.64, { bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelOffset: -0.04, bevelSegments: 2 }));
    put(carGlass, side(new THREE.Shape([[0.84, 0.9], [0.33, 1.3], [-1, 1.32], [-1.55, 0.93]].map(p => v2(...p))), 1.74));
    box(carGlass, 0.7, 0.02, 1.5, 0.658, 1.119, 0, 0, 0, -0.695); box(carGlass, 0.72, 0.02, 1.5, -1.382, 1.15, 0, 0, 0, 0.636);
    for (const sz of [-1, 1]) {
      for (const sx of [-1.32, 1.32]) { put(M.plastK, mCyl(0.3, 0.3, 0.2, 16).rotateX(PI / 2), sx, 0.3, sz * 0.78); put(M.galv, mCyl(0.16, 0.16, 0.21, 10).rotateX(PI / 2), sx, 0.3, sz * 0.78); }
      box(M.galv, 0.03, 0.12, 0.3, 2.16, 0.66, sz * 0.6); box(tailM, 0.02, 0.1, 0.3, -2.21, 0.66, sz * 0.6);
    }
  }
  // Each car points the way its lane runs.
  at(-21.5, RY, -3.2, () => car(carPaint[0]), PI); at(-3.2, RY, -18.5, () => car(carPaint[1]), -PI / 2); at(3.2, RY, -10.5, () => car(carPaint[2]), PI / 2);

  /* ----- trees, wet leaves ----- */
  // The tree on the south-west corner frames the left side.
  tree(-9, 5.2, 11, { leaves: 0.3, size: 1.1 }); box(M.soil, 1.2, 0.04, 1.2, -9, 0.03, 5.2);
  [[-21, -5], [-34, -5.1], [-47, -5], [-5, -24], [-5.1, -40], [5, -14], [5.1, -31], [-24, 5.1]].forEach(([x, z], i) => {
    tree(x, z, 12 + i, { leaves: 0.3, size: 0.8 + hash(i) * 0.3 }); box(M.soil, 1.1, 0.04, 1.1, x, 0.03, z);
  });
  // Litter: the gutters, the circle, the store walk, under the tree.
  const GY = RY + 0.007;
  k.litter(240, r => [-40 + r() * 34.4, GY, -RW + r() * r() * 1.5], 3);
  k.litter(200, r => [-34 + r() * 28.4, GY, RW - r() * r() * 1.5], 4);
  k.litter(160, r => [(r() < 0.5 ? -1 : 1) * (RW - r() * r() * 1.3), GY, -5.6 - r() * 40], 5);
  k.litter(70, r => { const a = r() * 6.283, d = 1.95 + r() * r() * 0.9; return [Math.cos(a) * d, GY, Math.sin(a) * d]; }, 6);
  k.litter(90, r => [-17 + r() * 12, 0.03, -6.8 + r() * 2.3], 7);
  k.litter(200, r => {
    const a = r() * 6.283, d = Math.sqrt(-2 * Math.log(1 - r() * 0.98)) * 2.2, x = Math.min(-5.7, -9 + Math.cos(a) * d * 1.4), z = 5.2 + Math.sin(a) * d;
    return [x, z < RW ? GY : z < KB ? 0.05 : z < 7 ? 0.03 : 0.012, z];
  }, 8);
  // A few leaves fall through the lamp light, onto the corner.
  k.fall(10, r => [-6.4 + r() * 2.3, 4 + r() * 4, -6.6 + r() * 1.8], -0.13);

  /* ----- lights: six in all ----- */
  // The shop light: one shadowed cone, through the panes to the road.
  const warm = col(0.9, 0.07, 80), bulbCol = col(0.86, 0.13, 72);
  const shop = new THREE.SpotLight(warm, 45, 28, 1.1, 0.35, 1.35);
  shop.position.set(-11.4, 2.5, -8.5); shop.target.position.set(-8.1, 0, -3.5);
  shop.castShadow = true; shop.shadow.mapSize.set(2048, 2048); shop.shadow.bias = -0.002;
  // The street lamp throws the long shadows across the junction.
  const lamp = new THREE.SpotLight(lampCol, 520, 40, 1.2, 0.6, 1.8);
  lamp.position.copy(LAMP); lamp.target.position.set(PX + 2.6, 0, PZ + 2.6);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0015;
  // The room light stays short: it must not reach the TV room.
  const inside = new THREE.PointLight(warm, 20, 6.5, 1.2), tvBase = col(0.7, 0.14, 250, 3), tvL = new THREE.PointLight(col(0.7, 0.14, 250), 9, 3.4, 1.6);
  inside.position.set(-13.2, 2.5, -10.2); tvL.position.set(-10.7, 5.4, -8.7);
  // The lamp throws the pole's shadow on the door.
  // The door's own bulb lights it.
  // The second bulb is the lantern on the first porch west.
  const doorL = new THREE.PointLight(bulbCol, 12, 8, 1.8), porchL = new THREE.PointLight(bulbCol, 7, 12, 1.8);
  doorL.position.set(-7.25, 3.25, -7.25); porchL.position.set(-21.72, 3, -9.5);
  // The tail turns about its root, at the cat's back.
  const tail = new THREE.Mesh(mCyl(0.012, 0.02, 0.3, 6).rotateZ(PI / 2).translate(-0.15, 0, 0), catM);
  tail.position.set(-12.21, 0.54, -6.6); tail.castShadow = true;
  // Moths circle the box sign.
  const MOTHS = 6, mp = new Float32Array(MOTHS * 3), mAttr = new THREE.BufferAttribute(mp, 3);
  const moths = k.ghost(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', mAttr), new THREE.PointsMaterial({ color: col(0.95, 0.06, 85, 1.6), size: 3, sizeAttenuation: false })));
  moths.frustumCulled = false;
  k.group.add(shop, shop.target, lamp, lamp.target, inside, tvL, doorL, porchL, tail, moths);
  k.lampCone(LAMP, 5, 8.2, lampCol, 0.045);

  // The crow sleeps on the low cable, west of the pole.
  const crow = k.crow();
  k.onFrame(t => {
    // The neon drops out for a moment, now and then.
    neon.color.copy(t % 9 < 0.8 && hash(Math.floor(t * 19)) < 0.5 ? neonOff : neonOn);
    // The TV flickers upstairs.
    const fl = 0.55 + 0.45 * hash(Math.floor(t * 3.3));
    tvL.intensity = 9 * fl; M.tv.color.copy(tvBase).multiplyScalar(fl);
    // The tail lies still, then flicks.
    const q = Math.max(0, Math.sin(t * 0.8)) ** 8;
    tail.rotation.set(0, Math.sin(t * 7) * 0.5 * q, -0.1 - 0.6 * q);
    for (let i = 0; i < MOTHS; i++) {
      const a = t * (0.9 + i * 0.21) + i * 2.4, r = 0.5 + 0.3 * Math.sin(t * 0.6 + i * 1.3);
      mp[i * 3] = -11.2 + Math.cos(a) * r * (1 + (i % 3)); mp[i * 3 + 1] = 4 + Math.sin(a * 1.7 + i) * 0.4; mp[i * 3 + 2] = -6.5 + Math.sin(a) * 0.22;
    }
    mAttr.needsUpdate = true;
    k.wireAt(perch, 0.09, t, crow.obj.position); crow.obj.position.y += 0.02;
    crow.pose(t, 'idle', 0.4);
  });
}
