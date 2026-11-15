// East Van postcards: the lane behind East 4th. One card.
// The lane runs east-west. The viewer stands in it and looks west.
// North is the open side: yards, the poles, the laneway house.
import { THREE, V, col, rng, lerp, smooth, tex, std, glow, ico } from '../kit.js';

export const cards = [
  { cap: 'The lane · 12:10 pm · Overcast', hour: 12,
    cam: { pos: [0, 1.5, 0.5], yaw: 87, pitch: 0, up: 28, down: 18, minHalf: 0.36 },
    sun: [0.25, 0.9, 0.35], sunCol: col(0.95, 0.01, 250), sunI: 0.8, hemi: [col(0.93, 0.015, 250), col(0.66, 0.015, 100), 2.7],
    fog: col(0.84, 0.015, 245), fogD: 0.011,
    sky: { cloudA: 0.97, cov: 0.02, cloud: col(0.74, 0.012, 250), cloudLit: col(0.9, 0.008, 250), hazeA: 0.9, hazeK: 5, disc: 0, stars: 0, sunCol: col(0.95, 0.01, 90, 0.4) },
    exposure: 1, win: 1.3, rain: 0, rainLamp: [0, -99, 900], wet: true, leaves: 18, wind: -0.25, smoke: 0,
    shadow: { at: [-20, 0, 0], r: 36 },
    bloom: [0.3, 0.7, 0.98], grade: { con: 1.04, sat: 1.04, vig: 0.3, grain: 0.06, lift: [0.008, 0.012, 0.02] } },
];

export function build(k) {
  const { box, put, win, gableHouse, fence, cart, pole, wire } = k;
  const R = rng(19), pick = n => Math.floor(R() * n);
  // LZ is the fence line. GZ is the garage front.
  const LZ = 3.6, GZ = 3.8;

  /* ----- materials ----- */
  const lines = (w, h, dx, dy) => tex(w, h, g => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.3)';
    for (let x = 0; dx && x < w; x += dx) g.fillRect(x, 0, 2, h);
    for (let y = 0; dy && y < h; y += dy) g.fillRect(0, y, w, 2);
  });
  const boards = lines(64, 8, 16, 0), slats = lines(8, 64, 0, 16);
  const WOOD = [[0.6, 0.07, 70], [0.55, 0.02, 85], [0.36, 0.04, 50]].map(c => std(...c, { map: boards }));
  const DOOR = [[0.62, 0.11, 195], [0.55, 0.17, 28], [0.78, 0.14, 90], [0.5, 0.11, 255], [0.9, 0.01, 90], [0.52, 0.1, 150]].map(c => std(...c, { map: slats }));
  const WALL = ['stucco', 'h2', 'h6', 'found', 'h3', 'h4'];
  const weed = std(0.55, 0.11, 132, { flatShading: true }), ivy = std(0.31, 0.07, 152, { flatShading: true });
  const dark = std(0.3, 0.02, 250), rust = std(0.72, 0.1, 80), rim = std(0.62, 0.2, 40), lens = glow(0.85, 0.02, 90, 0.6);
  // The scribble door: loops and strokes, no words.
  const graf = std(1, 0, 0, { map: tex(512, 256, (g, w, h) => {
    g.fillStyle = '#aeb9c2'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
    const Q = rng(5), inks = ['#e0457b', '#27b3a6', '#f2c230', '#2b2b33', '#f4f1ea'];
    g.lineCap = g.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      let x = 30 + Q() * (w - 60), y = 50 + Q() * (h - 100);
      g.strokeStyle = inks[i % 5]; g.lineWidth = 6 + Q() * 12;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0, n = 3 + Math.floor(Q() * 4); j < n; j++) {
        const nx = x + (Q() - 0.3) * 130, ny = 40 + Q() * (h - 80);
        g.bezierCurveTo(x + (Q() - 0.5) * 160, y - 90 * Q(), nx + (Q() - 0.5) * 160, ny + 90 * Q(), nx, ny);
        x = nx; y = ny;
      }
      g.stroke();
    }
  }) });

  /* ----- helpers: s is 1 for the south side, -1 for the north ----- */
  // A plank fence from x0 west to x1. lean tips its top to the lane.
  function planks(m, x0, x1, s, h, lean = 0) {
    const len = x0 - x1, g = new THREE.BoxGeometry(len, h, 0.05), uv = g.attributes.uv, n = Math.ceil(len / 2.4);
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 0.6);
    put(m, g, (x0 + x1) / 2, h / 2, s * LZ, -s * lean);
    for (let j = 0; j <= n; j++) box(m, 0.1, h, 0.1, lerp(x0, x1, j / n), h / 2, s * (LZ + 0.07), -s * lean);
    if (!lean) box(m, len, 0.05, 0.1, (x0 + x1) / 2, h + 0.025, s * LZ);
  }
  // A garage, 6 m deep, its door on the lane. gable is the roof rise.
  function garage(xc, s, w, h, wall, door, { gable = 0, dw = 2.7, dh = 2.1 } = {}) {
    const zc = s * (GZ + 3);
    if (gable) gableHouse({ x: xc, zf: s * GZ, w, d: 6, base: 0, wall: h, rise: gable, body: wall, dir: -s, ov: 0.3 });
    else { box(wall, w, h, 6, xc, h / 2, zc); box('roof', w + 0.3, 0.14, 6.3, xc, h + 0.07, zc); }
    box(door, dw, dh, 0.08, xc, dh / 2, s * (GZ - 0.02));
    box('trim', dw + 0.24, 0.12, 0.1, xc, dh + 0.06, s * (GZ - 0.03));
    box('conc', w, 0.08, 0.8, xc, 0.01, s * (GZ - 0.4));
  }

  /* ----- ground and lane ----- */
  box('lawn', 900, 0.2, 300, -150, -0.1, -153); box('lawn', 900, 0.2, 300, -150, -0.1, 153);
  box('road', 900, 0.1, 6, -150, -0.1, 0);
  k.wetRoad(900, 6, -150, 0, 0, col(0.42, 0.012, 255));
  for (const s of [-1, 1]) { box(weed, 900, 0.03, 0.22, -150, 0.012, s * 3.13); box('gravel', 900, 0.03, 0.5, -150, 0.01, s * 3.49); }
  for (let i = 0; i < 90; i++) {
    const h = 0.1 + R() * 0.16;
    put(weed, new THREE.ConeGeometry(0.04 + R() * 0.05, h, 5), 2 - R() * 70, h / 2, (R() < 0.5 ? -1 : 1) * (3.05 + R() * 0.5));
  }

  /* ----- the south side: a wall of garages and fences ----- */
  planks(WOOD[2], 3, -4.7, 1, 2);
  garage(-7.3, 1, 5, 2.5, 'h6', DOOR[2], { gable: 1 });
  // The hoop hangs on the gable, above the door.
  box('trim', 1.1, 0.7, 0.04, -7.3, 2.87, 3.74);
  put(rim, new THREE.TorusGeometry(0.22, 0.016, 6, 16).rotateX(Math.PI / 2), -7.3, 2.68, 3.5);
  garage(-12.9, 1, 5.4, 2.8, 'found', graf, { dw: 4.4, dh: 2.2 });
  planks(WOOD[0], -15.7, -21, 1, 1.6);
  // A mattress leans on the fence.
  box(std(0.88, 0.02, 85), 1.9, 1.35, 0.22, -17.25, 0.69, 3.33, 0.2);
  cart('binK', -19, 3.25); cart('binG', -19.75, 3.25, 0.12); cart('binK', -20.5, 3.25);
  box('binB', 0.52, 0.3, 0.4, -21.3, 0.15, 3.3); box('binB', 0.52, 0.3, 0.4, -21.3, 0.45, 3.3, 0, 0.2);
  fence(-21.1, LZ, -27.1, LZ, 1.5);
  garage(-29.7, 1, 5, 2.7, 'stucco', DOOR[1]);
  planks(WOOD[1], -32.3, -37.3, 1, 1.5, 0.16);
  for (let i = 0; i < 5; i++) put(ivy, ico(0.6 + R() * 0.4, 0.5 + R() * 0.3, 0.3), -33 - i * 0.9, 0.9 + R() * 0.5, 3.62);
  garage(-40, 1, 5.2, 2.5, 'h4', DOOR[4], { gable: 0.9 });

  /* ----- the north side: low fences, yards, the laneway house ----- */
  planks(WOOD[1], 3, -8, -1, 1.8);
  // Blackberry and ivy climb over the fence.
  for (let i = 0; i < 12; i++) put(i % 3 ? 'bush' : ivy, ico(0.7 + R() * 0.5, 0.45 + R() * 0.35, 0.4 + R() * 0.15), 1 - i * 0.78 + R() * 0.3, 1.25 + R() * 0.75, -3.62 + R() * 0.1);
  fence(-8.1, -LZ, -19.74, -LZ, 1.2); fence(-21.06, -LZ, -24.5, -LZ, 1.2); fence(-24.5, -LZ, -24.5, -13, 1.2);
  // The gate.
  box('wood', 0.12, 1.5, 0.12, -19.8, 0.75, -LZ); box('wood', 0.12, 1.5, 0.12, -21, 0.75, -LZ);
  box(WOOD[0], 1.08, 1.25, 0.04, -20.4, 0.7, -LZ);
  // A stack of pallets.
  for (let i = 0; i < 5; i++) k.at(-11.2, i * 0.13, -3.1, () => {
    box('wood', 1.2, 0.03, 0.8, 0, 0.115, 0);
    for (const dx of [-0.55, 0, 0.55]) box('wood', 0.1, 0.1, 0.8, dx, 0.05, 0);
  }, (R() - 0.5) * 0.12);
  // Collection day: carts, a blue box and a bag by the pole.
  cart('binG', -15.4, -3.25, 0.1); cart('binK', -16.15, -3.25);
  box('binB', 0.52, 0.3, 0.4, -16.95, 0.15, -3.3); put('bagY', ico(0.22, 0.2, 0.2), -14.7, 0.19, -3.3);
  // The yard: a raised bed, a bush, a young fir.
  box('wood', 2.6, 0.36, 1.2, -12, 0.18, -6); box('soil', 2.44, 0.05, 1.04, -12, 0.37, -6);
  for (let i = 0; i < 4; i++) put('kale', new THREE.ConeGeometry(0.17, 0.42, 6), -12.9 + i * 0.6, 0.58, -6, Math.PI);
  put('bush', ico(1, 0.7, 0.9), -17.5, 0.6, -8.5);
  put('fir', new THREE.ConeGeometry(2, 9, 7), -12, 6.1, -11.5); put('bark', new THREE.CylinderGeometry(0.2, 0.25, 1.8, 6), -12, 0.9, -11.5);
  // The clothesline: two posts, one line, three plain sheets.
  for (const z of [-6.4, -12.4]) { box('wood', 0.1, 2.25, 0.1, -22, 1.125, z); box('wood', 0.9, 0.08, 0.08, -22, 2.2, z); }
  wire(V(-22, 2.2, -6.4), V(-22, 2.2, -12.4), 0.12, 0.008, 0.015);
  const sheets = [[-7.5, 1.25, 0.95, 0.01, 90], [-9.1, 1.05, 0.86, 0.05, 240], [-10.7, 1.25, 0.9, 0.06, 95]].map(([z, h, L, C, hue]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, h).rotateY(Math.PI / 2).translate(0, -h / 2, 0), std(L, C, hue, { side: THREE.DoubleSide }));
    const u = (-6.4 - z) / 6;
    m.position.set(-22, 2.19 - 0.48 * u * (1 - u), z);
    m.castShadow = true;
    k.group.add(m);
    return m;
  });
  // The carport and the old pickup, tail to the lane.
  box('gravel', 4.8, 0.05, 8.2, -27, 0.005, -7.85);
  for (const x of [-24.95, -29.05]) for (const z of [-6.5, -11.3]) box('trim', 0.12, 2.8, 0.12, x, 1.4, z);
  box('roof', 4.5, 0.12, 5.4, -27, 2.86, -8.9);
  k.at(-27, 0, -6.4, () => {
    box(rust, 5, 0.5, 1.8, 0, 0.65, 0); box(rust, 1.7, 0.7, 1.7, 0.5, 1.25, 0);
    box('winDim', 1.74, 0.38, 1.5, 0.5, 1.33, 0); box('winDim', 1.4, 0.38, 1.74, 0.5, 1.33, 0);
    for (const z of [-0.86, 0.86]) box(rust, 2.3, 0.3, 0.08, -1.35, 1.05, z);
    box(rust, 0.08, 0.3, 1.8, -2.46, 1.05, 0); box('steel', 0.1, 0.14, 1.84, -2.54, 0.48, 0);
    for (const [wx, wz] of [[-1.55, -0.82], [1.6, -0.82], [-1.55, 0.82], [1.6, 0.82]]) put('binK', new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10).rotateX(Math.PI / 2), wx, 0.36, wz);
  }, Math.PI / 2);
  // The laneway house: dark siding, one warm window to the east.
  gableHouse({ x: -32.8, zf: -4.4, w: 5.6, d: 7.4, base: 0.15, wall: 3.5, rise: 2, body: dark, gable: 'wood', dir: 1 });
  win('winLit', 1, 1.2, -29.99, 2.3, -7.6, true); win('winDim', 0.6, 1.6, -29.99, 2.1, -10.2, true);
  win('winDim', 1.2, 0.9, -32.8, 4.5, -4.37); win('winDim', 1.6, 1.1, -32, 1.9, -4.37);
  box('door', 0.95, 2.05, 0.06, -34.2, 1.175, -4.37); box('conc', 1.2, 0.15, 0.5, -34.2, 0.075, -4.1);
  planks(WOOD[2], -35.8, -37.3, -1, 1.8);
  garage(-40, -1, 5.2, 2.8, 'h2', DOOR[0]);

  /* ----- the far lane, both sides ----- */
  for (let x = -42.9; x > -170; x -= 5.8) for (const s of [-1, 1]) {
    const r = R();
    if (r < 0.5) garage(x - 2.9, s, 5.2, 2.5 + R() * 0.4, WALL[pick(6)], DOOR[pick(6)], { gable: R() < 0.4 ? 0.9 : 0 });
    else if (r < 0.8) planks(WOOD[pick(3)], x - 0.1, x - 5.7, s, 1.4 + R() * 0.6);
    else fence(x - 0.1, s * LZ, x - 5.7, s * LZ, 1.2);
    if (R() < 0.6) cart(R() < 0.5 ? 'binK' : 'binG', x - 0.6 - R() * 2.2, s * 3.25);
  }

  /* ----- the big houses, their backs to the lane ----- */
  const keys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'purple', 'stucco'], drops = [];
  for (let i = 0; i < 18; i++) for (const s of [-1, 1]) {
    const x = (s < 0 ? 10.5 : 13.5) - i * 10, w = 6.8 + R(), b = 0.8 + R() * 0.5, wall = R() < 0.4 ? 3.1 + R() * 0.5 : 5.2 + R() * 0.6;
    const zb = s * (15 + R() * 4), f = zb - s * 0.03;
    gableHouse({ x, zf: zb, w, d: 10, base: b, wall, rise: 2.2 + R() * 1.4, body: keys[pick(9)], dir: -s });
    // The back deck, its rail and its stairs.
    box('deck', 3.4, 0.14, 2, x + 1.2, b - 0.07, zb - s);
    box('trim', 3.4, 0.06, 0.06, x + 1.2, b + 0.9, zb - s * 1.97);
    for (const dx of [-0.46, 2.86]) box('trim', 0.1, b + 0.9, 0.1, x + dx, (b + 0.9) / 2, zb - s * 1.95);
    for (let j = 1; j <= 5; j++) { const h = b * (1 - j / 6); box('deck', 0.29, h, 1, x - 0.5 - (j - 0.5) * 0.29, h / 2, zb - s * 1.4); }
    box('door', 0.95, 2.05, 0.06, x + 1.6, b + 1.025, f);
    win('winDim', 1.1, 1.3, x - 1.7, b + 1.6, f);
    if (wall > 4.5) for (const dx of [-1.7, 1.7]) win('winDim', 1.1, 1.2, x + dx, b + wall - 1.2, f);
    drops.push([x - 2.6, b + wall - 0.3, zb - s * 0.05]);
  }
  // Tall firs stand behind the roofs.
  for (let i = 0; i < 24; i++) {
    const x = 12 - i * 7.5 + R() * 4, z = (i % 2 ? 1 : -1) * (33.5 + R() * 8), h = 12 + R() * 8;
    put('fir', new THREE.ConeGeometry(2.3 + R(), h, 7), x, 2 + h / 2, z); put('bark', new THREE.CylinderGeometry(0.25, 0.3, 2.4, 6), x, 1.2, z);
  }

  /* ----- poles, lamp, wires ----- */
  // The poles stand at the asphalt edge, clear of the garage eaves.
  const PZ = -3.1, POLES = [17, -18, -53, -88, -123, -158];
  for (const x of POLES) pole(x, PZ);
  // The can hangs north of the pole, clear of the wires.
  put('steel', new THREE.CylinderGeometry(0.3, 0.3, 0.85, 10), -18, 7.9, PZ - 0.44);
  box('iron', 0.3, 0.42, 0.2, -18, 5.6, PZ - 0.25);
  box('steel', 0.07, 0.07, 2.5, -18, 8.25, PZ + 1.25, -0.1); box('steel', 0.3, 0.1, 0.62, -18, 8.42, PZ + 2.55);
  box(lens, 0.22, 0.03, 0.44, -18, 8.36, PZ + 2.57);
  // Three power lines on the arm, then the heavy bundle below.
  const LINES = [[-1, 10.15, 0.5, 0.018], [0, 10.62, 0.5, 0.018], [1, 10.15, 0.5, 0.018], [0.2, 8.9, 0.6, 0.018], [0.2, 7.7, 0.75, 0.022], [0.22, 6.9, 0.95, 0.03], [0.22, 6.45, 1.05, 0.035], [0.22, 6.05, 1.1, 0.02]];
  let perch;
  for (let i = 1; i < POLES.length; i++) for (const [dz, y, sag, r] of LINES) {
    const w = wire(V(POLES[i - 1], y, PZ + dz), V(POLES[i], y, PZ + dz), sag, r);
    if (i === 1 && y === 6.05) perch = w;
  }
  // A service drop runs from the nearest pole to each house.
  for (const [x, y, z] of drops) wire(V(POLES[Math.min(5, Math.max(0, Math.round((17 - x) / 35)))], 7.7, PZ + 0.2), V(x, y, z), 0.4, 0.02, 0.03);
  wire(V(-18, 7.7, PZ + 0.2), V(-30, 3.45, -4.9), 0.5, 0.02, 0.03);

  /* ----- the street tree and its leaves ----- */
  const TX = -24, TZ = 4.8;
  k.tree(TX, TZ, 7, { hero: true, size: 0.95 });
  k.litter(300, Q => {
    const a = Q() * 6.2832, r = Math.sqrt(-2 * Math.log(1 - Q() * 0.98)) * 2.2, z = TZ + Math.sin(a) * r;
    return [TX + Math.cos(a) * r * 1.6, Math.abs(z) < 3 ? 0.012 : 0.035, z];
  });
  k.litter(160, Q => [4 - Q() * 60, 0.012, (Q() < 0.5 ? -1 : 1) * (2.95 - Q() * Q() * 1.8)], 4);
  k.fall(30, Q => [TX + (Q() - 0.5) * 7, 4 + Q() * 3.5, 3.2 + (Q() - 0.5) * 5]);

  /* ----- life: two crows and a cat ----- */
  const pecker = k.crow(), caller = k.crow();
  // One crow stands on a cart lid.
  pecker.obj.position.set(-16.15, 1.035, -3.25);
  // The cat: a few boxes. Its legs and tail turn at their top or base.
  const catM = std(0.66, 0.14, 62), cat = new THREE.Group(), legs = [];
  const part = (w, h, d, x, y, z, py = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, py, 0), catM);
    m.position.set(x, y, z); m.castShadow = true; cat.add(m);
    return m;
  };
  part(0.42, 0.15, 0.13, 0, 0.245, 0); part(0.13, 0.12, 0.12, 0.26, 0.33, 0);
  part(0.03, 0.05, 0.03, 0.27, 0.41, 0.04); part(0.03, 0.05, 0.03, 0.27, 0.41, -0.04);
  const tail = part(0.04, 0.3, 0.04, -0.2, 0.3, 0, 0.15);
  for (const [x, z] of [[0.15, 0.04], [0.15, -0.04], [-0.15, 0.04], [-0.15, -0.04]]) legs.push(part(0.04, 0.17, 0.04, x, 0.17, z, -0.085));
  cat.rotation.order = 'YXZ';
  k.group.add(cat);

  // The wire crow sits at fraction U of its span.
  const U = 0.886, K = 4 * U * (1 - U), A = perch.a, B = perch.b;
  k.onFrame(t => {
    pecker.pose(t, 'peck', 1.2);
    const sw = K * perch.amp * Math.sin(t * 1.3 + perch.ph);
    caller.obj.position.set(lerp(A.x, B.x, U) + perch.n1.x * sw, lerp(A.y, B.y, U) - perch.sag * K + K * perch.amp * 0.35 * Math.sin(t * 0.9 + perch.ph * 1.7) + 0.02, lerp(A.z, B.z, U) + perch.n1.z * sw);
    caller.pose(t + 3, 'caw', 1.9);
    for (let i = 0; i < 3; i++) sheets[i].rotation.z = Math.sin(t * 0.9 + i * 1.3) * 0.07 + Math.sin(t * 2.1 + i * 2.9) * 0.025;
    // The cat walks west, sits, turns, walks back: 24 s.
    const p = t % 24, walk = p < 9 || (p >= 12 && p < 21);
    const go = p < 9 ? p / 9 : p < 12 ? 1 : p < 21 ? 1 - (p - 12) / 9 : 0, mv = walk ? Math.sin(Math.PI * (p % 12) / 9) : 0;
    cat.position.set(lerp(-15.9, -20.8, smooth(0, 1, go)), 1.65 + Math.abs(Math.sin(t * 8)) * 0.008 * mv, LZ);
    cat.rotation.y = Math.PI * (p < 9 ? 1 : p < 12 ? 1 - smooth(9.5, 11.5, p) : p < 21 ? 0 : smooth(21.5, 23.5, p));
    for (let i = 0; i < 4; i++) legs[i].rotation.z = Math.sin(t * 8 + (i === 1 || i === 2 ? Math.PI : 0)) * 0.5 * mv;
    tail.rotation.z = 0.5 + Math.sin(t * 1.7) * 0.25;
  });
}
