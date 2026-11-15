// East Van postcards, realistic: Commercial Drive at East 4th, after rain.
// Same lens, plan and bus loop as block-out card 4.
import { THREE, V, col, rng, hash, lerp, UP, mCyl, mPlane, canvasTex } from './rkit.js';

const lampCol = col(0.84, 0.13, 68), MOON = col(0.9, 0.15, 95, 5), PI = Math.PI;
export const card = {
  cap: 'The Drive · 5:40 pm · After rain', blockout: 4,
  cam: { pos: [5.6, 1.5, 15], yaw: 0, pitch: 0, up: 30, down: 16, minHalf: 0.44 },
  hour: 18.9, sun: [-0.7, 0.09, -0.6], fill: [col(0.74, 0.09, 40), 0.3],
  fog: col(0.3, 0.055, 274), fogD: 0.008, exposure: 1.15, env: 2.8,
  sky: { cloudA: 0.8, cov: 0.4, cloud: col(0.24, 0.04, 270), cloudLit: col(0.58, 0.12, 25), hazeA: 0.6, hazeK: 7, stars: 0, sunCol: col(0.7, 0.15, 40, 1.2) },
  rain: 0, mtn: col(0.42, 0.07, 286), flock: 40, flockDir: 1,
  bloom: [0.42, 0.7, 1.0], focus: 16.5, aperture: 0.00012,
  lens: { con: 1.07, sat: 1.1, lift: [0.008, 0.006, 0.026], vig: 0.42, grain: 0.07 },
};

export function build(k) {
  const { M, box, put, limb, sash, room, door, pole, wire, tree, std, paint, glow, signMat } = k;
  // FX is the shop front line. RY is the road surface. GF is the shopfront height.
  const R = rng(19), FX = 10.5, RY = -0.145, GF = 3.1, pick = a => a[Math.floor(R() * a.length)];
  const disc = (r, n = 28) => mCyl(r, r, 0.03, n).rotateX(PI / 2), ball = r => new THREE.IcosahedronGeometry(r, 1);

  /* ----- materials ----- */
  const brickT = c => std(c, { map: M.brick.map, bumpMap: M.brick.bumpMap, bumpScale: 1.5, roughness: 0.7 });
  const stripe = (a, b) => std(0xffffff, { map: canvasTex(64, 8, 0.44, (g, w, h) => { g.fillStyle = b; g.fillRect(0, 0, w, h); g.fillStyle = a; g.fillRect(0, 0, w / 2, h); }), roughness: 0.7 });
  const walls = [M.brick, M.stucco, brickT(col(0.5, 0.04, 30)), brickT(col(0.95, 0.03, 85)), paint(0.62, 0.07, 62, { roughness: 0.7 }), paint(0.45, 0.07, 330, { roughness: 0.7 }), M.siding, M.sidingP];
  const awns = [paint(0.5, 0.17, 28, { roughness: 0.7 }), paint(0.42, 0.09, 150, { roughness: 0.7 }), paint(0.36, 0.08, 262, { roughness: 0.7 }), paint(0.76, 0.14, 86, { roughness: 0.7 }), stripe('#3b3f52', '#e8e2d2')];
  // Rooms with no lamp of their own glow instead.
  const lit = [glow(col(0.8, 0.1, 75, 0.6)), glow(col(0.78, 0.12, 62, 0.65)), glow(col(0.88, 0.04, 215, 0.65)), glow(col(0.6, 0.14, 350, 0.55)), glow(col(0.5, 0.06, 60, 0.25))];
  const [warmIn, goldIn, coolIn, pinkIn] = lit;
  const goods = [[0.62, 0.17, 30], [0.75, 0.14, 90], [0.55, 0.12, 150], [0.5, 0.12, 250], [0.85, 0.03, 90], [0.4, 0.1, 320]].map(c => glow(col(...c, 0.75)));
  const bands = [glow(col(0.6, 0.16, 30, 1.2)), glow(col(0.7, 0.12, 150, 1.1)), glow(col(0.7, 0.1, 250, 1.2)), M.iron, M.iron, M.trim];
  const backs = [M.curtainW, M.curtainC, M.blind, M.blind, M.dark], frames = [M.iron, M.trim, M.galv];
  const tubeW = glow(col(0.9, 0.08, 80, 6)), tubeC = glow(col(0.92, 0.04, 220, 6)), bulb = glow(col(0.86, 0.13, 72, 8));
  const neonP = glow(col(0.68, 0.25, 350, 9)), neonC = glow(col(0.82, 0.14, 200, 7)), moon = glow(MOON);
  const fruit = [[0.72, 0.17, 60], [0.56, 0.2, 28], [0.72, 0.17, 128], [0.88, 0.17, 100], [0.42, 0.12, 320]].map(c => paint(...c, { roughness: 0.4 }));
  const white = paint(0.92, 0.01, 220, { roughness: 0.35 }), green = paint(0.36, 0.09, 155), chair = paint(0.55, 0.15, 28);
  const text = (w, h, bg, fg, font, lines) => std(0xffffff, { roughness: 0.6, map: canvasTex(w, h, 1, g => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((t, i) => g.fillText(t, w / 2, h * (i + 0.5) / lines.length + 2)); }) });

  /* ----- ground: the wet road, slabs, kerbs, worn paint ----- */
  box(M.dark, 160, 0.1, 400, 0, -0.36, -130);
  k.mirrorRoad(14, 350, 0, RY, -135);
  // East 4th crosses between z = -37 and z = -49.
  const tar = std(col(0.16, 0.008, 262), { roughness: 0.3 }), pits = [[-1, 1], [-1, -30], [1, -16.5], [1, -30]];
  for (const s of [-1, 1]) {
    box(tar, 60, 0.1, 12, s * 37, RY - 0.05, -43);
    // Slabs with joints; a root lifts the ones beside a tree.
    for (let i = 0; i < 35; i++) for (const c of [0, 1]) {
      const z = 14.75 - i * 1.5, root = c === 0 && pits.some(p => p[0] === s && Math.abs(p[1] - z) < 2.2), lift = root ? 0.01 + R() * 0.03 : 0;
      box(M.walk, 1.648, 0.1, 1.488, s * (8.01 + c * 1.66), -0.03 + lift, z, root ? (R() - 0.5) * 0.03 : 0, 0, (R() - 0.5) * 0.012);
    }
    box(M.walk, 3.32, 0.1, 24.5, s * 8.84, -0.03, 27.75); box(M.walk, 3.32, 0.1, 251, s * 8.84, -0.03, -174.5);
  }
  for (const [s, z] of pits) box(M.soil, 1.1, 0.05, 1.1, s * 7.78, 0.02, z);
  k.kerb(77, 7, -37, 0); k.kerb(251, 7, -300, 0); k.kerb(77, -7, 40, PI); k.kerb(251, -7, -49, PI);
  const lineY = std(col(0.74, 0.13, 92), { roughness: 0.5 }), lineW = std(col(0.8, 0.01, 90), { roughness: 0.5 });
  for (let z = 14; z > -300;) { const len = 0.5 + R() * 2.4; if (R() < 0.75 && (z > -37 || z < -49)) box(lineY, 0.11, 0.002, len, 0, RY + 0.002, z - len / 2); z -= len + 0.15 + R() * R() * 3; }
  for (let x = -6; x <= 6; x += 1.2) if (R() < 0.85) box(lineW, 0.5, 0.002, 2.8, x, RY + 0.002, -38.6);

  /* ----- storefront parts; in the local frame the front faces +z ----- */
  // A fabric awning: a sloped top, a valance, a front bar, two arms.
  function awning(w, m, val = m) {
    const a = w - 0.8;
    box(m, a, 0.04, 1.7, 0, 2.83, 0.82, 0.33); box(val, a, 0.26, 0.025, 0, 2.43, 1.625); box(M.galv, a, 0.03, 0.03, 0, 2.55, 1.6);
    for (const s of [-1, 1]) limb(M.galv, V(s * (a / 2 - 0.03), 2.35, 0.03), V(s * (a / 2 - 0.03), 2.54, 1.6), 0.014, 0.014, 5);
  }
  // The ground floor: piers, riser, plate glass, transom, recessed entry, room.
  function shopfront(w, side, { wall, frame = M.iron, riser = wall, doorM = M.door, wallIn = warmIn, tube = tubeW, inside = stock }) {
    const x0 = -w / 2 + 0.3, x1 = w / 2 - 0.3, ex = side * (x1 - 0.75), rx = ex - side * 0.75, gw = x1 - x0 - 1.5, ga = side > 0 ? x0 : x0 + 1.5, gx = ga + gw / 2, n = Math.max(2, Math.round(gw / 1.6));
    for (const s of [-1, 1]) box(wall, 0.3, GF, 12, s * (w / 2 - 0.15), GF / 2, -6);
    box(riser, gw, 0.45, 0.14, gx, 0.225, -0.07); box(frame, gw + 0.04, 0.05, 0.2, gx, 0.475, -0.06);
    put(M.glass, new THREE.PlaneGeometry(gw, 2), gx, 1.5, -0.07); put(M.glass, new THREE.PlaneGeometry(gw, 0.52), gx, 2.8, -0.07);
    for (let i = 0; i <= n; i++) box(frame, 0.05, 2.6, 0.08, ga + i * gw / n, 1.8, -0.07);
    box(frame, gw, 0.07, 0.09, gx, 2.5, -0.07); box(frame, w - 0.6, 0.08, 0.14, 0, GF - 0.04, -0.06);
    // The entry: a glass return, a tiled step, the door and its lights.
    put(M.glass, new THREE.PlaneGeometry(0.95, 2), rx, 1.5, -0.55, 0, side * PI / 2); box(riser, 0.14, 0.45, 0.95, rx, 0.225, -0.55);
    box(frame, 0.06, GF, 0.06, rx, GF / 2, -1.02); box(frame, 0.05, 0.07, 0.95, rx, 2.5, -0.55);
    box(M.found, 1.5, 0.04, 1.02, ex, 0.045, -0.5); box(wall, 0.06, GF, 1.0, ex + side * 0.72, GF / 2, -0.5); box(frame, 1.5, 0.06, 1.0, ex, GF - 0.08, -0.5);
    door(ex, 0.065, -1.0, doorM); put(M.glass, new THREE.PlaneGeometry(1.16, 0.78), ex, 2.65, -1.03);
    for (const s of [-1, 1]) box(frame, 0.17, GF, 0.06, ex + s * 0.665, GF / 2, -1.0);
    room(x0, x1, 0, GF, -0.12, -5.6, wallIn);
    for (let i = 0; i < 3; i++) box(tube, 0.07, 0.04, 2.2, lerp(x0, x1, (i + 0.5) / 3), GF - 0.1, -2.8);
    inside(x0, x1);
  }
  // The floor above: wall round the windows, sashes, cornice, coping.
  function upper(w, H, wall, wins) {
    const lap = wall === M.siding || wall === M.sidingP, y0 = 5.15, y1 = 6.85, mid = (H + GF) / 2;
    if (!wins.length) box(wall, w, H - GF, 12, 0, mid, -6);
    else {
      box(wall, w, H - GF, 11.6, 0, mid, -6.2);
      if (lap) {
        k.lapWall(wall, -w / 2, w / 2, GF, H, -0.02, wins.map(([x]) => [x - 0.55, x + 0.55, y0, y1]));
        for (const s of [-1, 1]) box(M.trim, 0.12, H - GF, 0.42, s * (w / 2 - 0.06), mid, -0.19);
      } else {
        box(wall, w, y0 - GF, 0.4, 0, (y0 + GF) / 2, -0.2); box(wall, w, H - y1, 0.4, 0, (H + y1) / 2, -0.2);
        let a = -w / 2;
        for (const [x] of wins) { box(wall, x - 0.55 - a, 1.7, 0.4, (x - 0.55 + a) / 2, 6, -0.2); a = x + 0.55; }
        box(wall, w / 2 - a, 1.7, 0.4, (w / 2 + a) / 2, 6, -0.2);
      }
      for (const [x, back] of wins) sash(x, 6, lap ? -0.02 : 0, 1.1, 1.7, back);
    }
    box(M.trim, w - 0.02, 0.12, 0.16, 0, H - 0.62, 0.08); box(M.trim, w - 0.02, 0.2, 0.36, 0, H - 0.46, 0.18); box(M.galv, w, 0.06, 0.52, 0, H + 0.03, -0.2);
    for (let x = -w / 2 + 0.2; x < w / 2 - 0.1; x += 0.36) box(M.trim, 0.16, 0.12, 0.1, x, H - 0.62, 0.2);
  }
  // Stock for a shop with no name: a counter and three shelves.
  function stock(x0, x1) {
    box(M.wood, 1.8, 0.95, 0.6, 0, 0.52, -3.4);
    for (let i = 0; i < 3; i++) { box(M.wood, x1 - x0 - 0.6, 0.04, 0.3, 0, 0.8 + i * 0.55, -5.4); for (let x = x0 + 0.6; x < x1 - 0.5; x += 0.7) box(pick(goods), 0.5, 0.3, 0.2, x, 0.97 + i * 0.55, -5.4); }
  }
  // One building. s: 1 is the east row, -1 the west. zc, w: centre and width.
  function shop(s, zc, w, o = {}) {
    const wall = o.wall || pick(walls), two = o.two ?? R() < 0.6, H = two ? 8.2 : 4.9 + R() * 0.6;
    const awn = 'awn' in o ? o.awn : R() < 0.7 ? pick(awns) : null, pane = o.lit || pick(lit), band = o.band || pick(bands), frame = o.frame || pick(frames);
    // A shop out of view or past East 4th is a box with lit panels.
    const far = zc < -45 || zc - w / 2 > (s > 0 ? 9 : -5);
    k.at(s * FX, 0, zc, () => {
      if (far) {
        box(wall, w, H, 12, 0, H / 2, -6); put(pane, mPlane(w - 2, 2.3), 0, 1.6, 0.02); box(band, w - 0.6, 0.7, 0.06, 0, 3.5, 0.03); box(M.trim, w - 0.02, 0.2, 0.3, 0, H - 0.46, 0.15);
        if (awn) box(awn, w - 0.8, 0.05, 1.7, 0, 2.83, 0.82, 0.33);
        if (two) for (const x of [-w / 4, w / 4]) put(pick(backs), mPlane(1.1, 1.7), x, 6, 0.02);
        return;
      }
      shopfront(w, s, { wallIn: pane, ...o, wall, frame });
      box(o.name ? frame : band, w - 0.3, 0.8, 0.1, 0, 3.5, 0.05);
      if (o.name) put(signMat(o.name, { w: Math.round(128 * (w - 1.4) / 0.72), ...o.sign }), new THREE.PlaneGeometry(w - 1.4, 0.72), 0, 3.5, 0.105);
      if (awn) awning(w, awn, o.val);
      upper(w, H, wall, two ? (w > 7.6 ? [-w / 3.2, 0, w / 3.2] : [-w / 4, w / 4]).map(x => [x, pick(backs)]) : []);
    }, -s * PI / 2);
  }
  // Fills a row from z = a north to z = b with uneven shops.
  function fill(s, a, b) {
    const n = Math.max(1, Math.round((a - b) / 7.4)), st = (a - b) / n;
    for (let i = 1, z = a; i <= n; i++) { const zn = i < n ? a - (i + (R() - 0.5) * 0.2) * st : b; shop(s, (z + zn) / 2, z - zn); z = zn; }
  }

  /* ----- the rows ----- */
  fill(1, 30, 7.5);
  shop(1, 3, 9, { name: "NORMA'S PRODUCE", wall: M.siding, two: true, lit: warmIn, awn: stripe('#2f7d4f', '#efe6cf'), val: awns[1], frame: green, riser: M.deck, doorM: green, sign: { bg: '#1f5d3a', fg: '#fff3d0' },
    inside: (x0, x1) => {
      // Shelves of boxed fruit, a counter with a till, a cold case.
      for (let i = 0; i < 3; i++) { box(M.wood, x1 - x0 - 0.4, 0.04, 0.5, 0, 0.7 + i * 0.6, -5.25); for (let x = x0 + 0.5, j = i; x < x1 - 0.4; x += 0.62, j++) box(goods[j % 6], 0.5, 0.28, 0.36, x, 0.86 + i * 0.6, -5.25); }
      box(M.wood, 0.8, 0.95, 2.2, x0 + 1.2, 0.52, -3); box(M.iron, 0.36, 0.3, 0.36, x0 + 1.2, 1.15, -2.4);
      box(white, 2.2, 1.9, 0.7, 1.4, 1.0, -3.6); box(lit[2], 2.0, 1.5, 0.02, 1.4, 1.1, -3.24);
    } });
  shop(1, -5, 7, { name: 'LUCKY MOON LAUNDRY', wall: M.stucco, two: false, lit: coolIn, awn: null, tube: tubeC, frame: M.galv, riser: white, doorM: M.trim, sign: { bg: '#e9eef2', fg: '#1d4fa8', k: 1 },
    inside: (x0, x1) => {
      // Washers below, dryers above, a folding table, a basket.
      for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.8) {
        box(white, 0.72, 0.9, 0.66, x, 0.5, -5.2); box(white, 0.72, 0.95, 0.66, x, 1.5, -5.2); box(M.galv, 0.6, 0.07, 0.02, x, 0.88, -4.86);
        for (const [y, r] of [[0.5, 0.2], [1.5, 0.26]]) { put(M.plastK, disc(r, 18), x, y, -4.86); put(M.galv, new THREE.TorusGeometry(r, 0.022, 6, 18), x, y, -4.85); }
      }
      box(M.wood, 2.4, 0.05, 0.8, -0.4, 0.92, -2.6); box(M.plastB, 0.5, 0.32, 0.36, -0.9, 1.11, -2.6);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(M.galv, 0.04, 0.85, 0.04, -0.4 + sx * 1.1, 0.475, -2.6 + sz * 0.33);
    } });
  shop(1, -12, 7, { name: 'HERON BOOKS', wall: brickT(col(0.62, 0.05, 20)), two: true, lit: goldIn, awn: awns[2], frame: paint(0.25, 0.04, 300), sign: { bg: '#2a2440', fg: '#f2c66a', font: '700 76px serif' },
    inside: (x0, x1) => {
      // Books are coloured strips on six shelves; stacks sit in the window.
      for (let i = 0; i < 6; i++) {
        box(M.wood, x1 - x0 - 0.2, 0.03, 0.26, 0, 0.3 + i * 0.4, -5.42);
        for (let x = x0 + 0.15; x < x1 - 0.4;) { const bw = 0.1 + R() * 0.24, bh = 0.2 + R() * 0.1; box(pick(goods), bw, bh, 0.16, x + bw / 2, 0.315 + i * 0.4 + bh / 2, -5.42); x += bw + 0.006; }
      }
      box(M.wood, 2.2, 0.06, 0.9, x0 + 1.6, 0.75, -0.75); box(M.dark, 2.0, 0.7, 0.7, x0 + 1.6, 0.4, -0.75);
      for (let j = 0; j < 5; j++) { const h = 0.08 + R() * 0.2; box(pick(goods), 0.22, h, 0.3, x0 + 0.75 + j * 0.42, 0.78 + h / 2, -0.75, 0, R() - 0.5); }
    } });
  fill(1, -15.5, -37); fill(1, -49, -280);
  fill(-1, 30, -13);
  shop(-1, -17, 8, { name: 'CAFFÈ LUCCIOLA', wall: M.brick, two: true, lit: goldIn, awn: stripe('#a3262a', '#f0e6d0'), val: awns[0], frame: paint(0.3, 0.1, 25), doorM: M.trim, sign: { bg: '#7a1d1d', fg: '#ffe9c2', font: 'italic 700 80px serif' },
    inside: () => {
      // The bar, the machine, a shelf of bottles, three lamps over tables.
      box(M.wood, 4, 1.05, 0.7, 1, 0.575, -4.2); box(M.iron, 4.1, 0.04, 0.8, 1, 1.12, -4.2); box(M.galv, 0.8, 0.45, 0.5, 0.2, 1.37, -4.2); box(M.wood, 4, 0.04, 0.25, 1, 1.9, -5.4);
      for (let i = 0; i < 14; i++) put(goods[i % 6], mCyl(0.035, 0.04, 0.26, 6), -0.8 + i * 0.27, 2.05, -5.4);
      for (const x of [0, 1.6, 3]) { limb(M.iron, V(x, 2.3, -1.2), V(x, GF - 0.05, -1.2), 0.006, 0.006, 4); put(bulb, new THREE.SphereGeometry(0.07, 10, 8), x, 2.25, -1.2); put(M.galv, mCyl(0.3, 0.3, 0.03, 14), x, 0.78, -1.3); put(M.iron, mCyl(0.03, 0.12, 0.72, 8), x, 0.41, -1.3); }
    } });
  shop(-1, -24.5, 7, { name: 'THIMBLE RECORDS', wall: paint(0.3, 0.03, 300, { roughness: 0.6 }), two: true, lit: pinkIn, awn: null, frame: M.iron, doorM: M.dark, sign: { bg: '#141018', fg: '#ff6fae' },
    inside: (x0, x1) => {
      // Sleeves on the back wall; four bins of records on legs.
      for (let i = 0; i < 3; i++) for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.36) box(pick(goods), 0.31, 0.31, 0.02, x, 1.3 + i * 0.4, -5.5);
      for (const z of [-1.7, -3.3]) for (const x of [0.3, 2.0]) {
        box(M.wood, 1.4, 0.3, 0.7, x, 0.85, z); for (const sx of [-1, 1]) box(M.wood, 0.05, 0.7, 0.6, x + sx * 0.65, 0.35, z);
        for (let j = 0; j < 8; j++) box(pick(goods), 0.31, 0.31, 0.012, x + (j % 2 ? 0.33 : -0.33), 1.08, z - 0.24 + (j >> 1) * 0.14, -0.15);
      }
    } });
  fill(-1, -28, -37); fill(-1, -49, -280);
  // A sign that hangs over the sidewalk and faces south.
  function blade(s, z, name, o) {
    box(M.iron, 1.7, 0.62, 0.1, s * (FX - 0.95), 4.5, z); box(M.iron, 1.9, 0.04, 0.04, s * (FX - 0.95), 4.84, z);
    put(signMat(name, { w: 394, ...o }), new THREE.PlaneGeometry(1.6, 0.52), s * (FX - 0.95), 4.5, z + 0.055);
  }
  blade(1, 3, "NORMA'S", { bg: '#1f5d3a', fg: '#fff3d0' });
  blade(1, -9, 'BOOKS', { bg: '#2a2440', fg: '#f2c66a', font: '700 76px serif' });
  blade(-1, -13.5, 'CAFFÈ', { bg: '#7a1d1d', fg: '#ffe9c2', font: 'italic 700 80px serif' });
  // The laundry: a lit moon in a neon ring, and OPEN behind the glass.
  box(M.iron, 1.5, 1.5, 0.1, 9.5, 4.9, -2); box(M.iron, 1.9, 0.04, 0.04, 9.55, 5.68, -2);
  put(moon, disc(0.6), 9.5, 4.9, -1.93); put(M.iron, disc(0.5), 9.72, 5.0, -1.9); put(neonC, new THREE.TorusGeometry(0.66, 0.018, 6, 40), 9.5, 4.9, -1.93);
  put(signMat('OPEN', { w: 320, bg: '#120808', fg: '#ff5a4a', k: 2.2 }), new THREE.PlaneGeometry(0.9, 0.36), FX + 0.12, 2.2, -4.4, 0, -PI / 2);
  // The record shop: a neon ring round a record, and two neon tubes.
  box(M.iron, 2.0, 0.05, 0.05, -9.5, 5.74, -21.5);
  for (const d of [-0.4, 0.4]) limb(M.iron, V(-9.5 + d, 5.58, -21.5), V(-9.5 + d, 5.73, -21.5), 0.008, 0.008, 4);
  put(neonP, new THREE.TorusGeometry(0.8, 0.03, 8, 48), -9.5, 4.9, -21.5); put(M.plastK, disc(0.7), -9.5, 4.9, -21.5); put(neonC, disc(0.25), -9.5, 4.9, -21.48); put(M.plastK, disc(0.04, 10), -9.5, 4.9, -21.46);
  put(neonP, mCyl(0.02, 0.02, 5.6, 6).rotateX(PI / 2), -FX + 0.14, 3.98, -24.5); put(neonC, mCyl(0.02, 0.02, 5.6, 6).rotateX(PI / 2), -FX + 0.14, 3.02, -24.5);

  /* ----- Norma's stand: three tilted trays of crates ----- */
  // A point on a tray: u runs up the slope, v stands off the board.
  const TA = 0.3, ca = Math.cos(TA), sa = Math.sin(TA), tx = (u, v) => 9.6 + u * ca - v * sa, ty = (u, v) => 0.86 + u * sa + v * ca;
  const price = text(96, 64, '#f4ecd2', '#b3261e', '700 40px ui-monospace, monospace', ['1.49']);
  for (let i = 0; i < 3; i++) {
    const z = 4.1 - i * 2.15;
    for (const d of [-0.92, 0.92]) { box(M.wood, 0.07, 0.64, 0.07, 9.02, 0.34, z + d); box(M.wood, 0.07, 1.04, 0.07, 10.25, 0.54, z + d); box(M.wood, 1.3, 0.07, 0.05, 9.63, 0.35, z + d); }
    box(M.deck, 1.2, 0.03, 1.9, 9.65, 0.4, z); box(M.wood, 0.5, 0.28, 0.4, 9.7, 0.555, z + 0.4 - i * 0.3, 0, 0.2);
    box(M.wood, 1.5, 0.03, 2.0, 9.6, 0.86, z, 0, 0, TA); box(M.wood, 0.03, 0.09, 2.0, tx(-0.74, 0.05), ty(-0.74, 0.05), z, 0, 0, TA);
    for (let j = 0; j < 6; j++) {
      const u = j < 3 ? -0.37 : 0.37, cz = z + (j % 3 - 1) * 0.64, m = fruit[(i * 2 + j) % 5];
      // One slat of a crate: offsets du, v, dz; then its size.
      const slat = (du, v, dz, w, h, d) => box(M.wood, w, h, d, tx(u + du, v), ty(u + du, v), cz + dz, 0, 0, TA);
      slat(0, 0.022, 0, 0.62, 0.012, 0.56); slat(-0.3, 0.17, 0, 0.006, 0.12, 0.006);
      for (const e of [-1, 1]) { slat(e * 0.304, 0.085, 0, 0.012, 0.13, 0.56); slat(0, 0.05, e * 0.274, 0.6, 0.045, 0.012); slat(0, 0.115, e * 0.274, 0.6, 0.045, 0.012); }
      for (let f = 0; f < 16; f++) { const fu = u + (f % 4 - 1.5) * 0.14 + (R() - 0.5) * 0.03, fz = cz + ((f >> 2) - 1.5) * 0.125 + (R() - 0.5) * 0.02; put(m, ball(0.055 + R() * 0.012), tx(fu, 0.1), ty(fu, 0.1), fz); }
      put(price, new THREE.PlaneGeometry(0.13, 0.09), tx(u - 0.3, 0.26), ty(u - 0.3, 0.26), cz, 0, -PI / 2);
    }
  }
  // The scale hangs from the awning: a chain, a dial, a pan.
  limb(M.galv, V(9.1, 2.05, 3.03), V(9.1, 2.6, 3.03), 0.004, 0.004, 4);
  put(white, mCyl(0.13, 0.13, 0.05, 20).rotateZ(PI / 2), 9.1, 1.92, 3.03); put(M.galv, new THREE.TorusGeometry(0.13, 0.012, 6, 20).rotateY(PI / 2), 9.07, 1.92, 3.03); box(fruit[1], 0.004, 0.1, 0.008, 9.07, 1.95, 3.03, 0.6);
  for (const a of [0, 2.1, 4.2]) limb(M.galv, V(9.1 + Math.cos(a) * 0.16, 1.45, 3.03 + Math.sin(a) * 0.16), V(9.1, 1.79, 3.03), 0.003, 0.003, 4);
  put(M.galv, mCyl(0.17, 0.1, 0.06, 16), 9.1, 1.42, 3.03);
  // The awning lamp, spare crates by the door, one orange on the walk.
  box(M.iron, 0.12, 0.1, 0.12, 9.4, 2.63, 2); put(M.bulb, new THREE.SphereGeometry(0.04, 10, 8), 9.4, 2.56, 2);
  box(M.wood, 0.5, 0.3, 0.4, 10.2, 0.17, 7.3); box(M.wood, 0.5, 0.3, 0.4, 10.2, 0.47, 7.3, 0, 0.3); box(M.wood, 0.5, 0.3, 0.4, 9.65, 0.17, 7.3, 0, -0.2);
  put(fruit[0], ball(0.045), 8.0, 0.065, 8.6);

  /* ----- the caffè patio: tables, planters, a string of bulbs ----- */
  for (const z of [-15, -17, -19]) {
    put(M.galv, mCyl(0.36, 0.36, 0.04, 14), -9.5, 0.76, z); put(M.iron, mCyl(0.04, 0.16, 0.72, 8), -9.5, 0.39, z);
    for (const d of [-0.62, 0.62]) { box(chair, 0.4, 0.04, 0.4, -9.5, 0.47, z + d); box(chair, 0.4, 0.4, 0.03, -9.5, 0.75, z + d * 1.3); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(M.galv, 0.025, 0.45, 0.025, -9.5 + sx * 0.17, 0.235, z + d + sz * 0.17); }
  }
  // The cord holds still, so the bulbs stay on it.
  const string = (a, b, sag, n) => {
    wire(a, b, sag, 0.006, 0);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; put(bulb, new THREE.SphereGeometry(0.04, 8, 6), lerp(a.x, b.x, u), lerp(a.y, b.y, u) - sag * 4 * u * (1 - u) - 0.045, lerp(a.z, b.z, u)); }
  };
  for (const z of [-14.4, -20.4]) {
    box(M.wood, 0.45, 0.5, 1.4, -8.5, 0.27, z); put(M.bush, new THREE.IcosahedronGeometry(1, 2).scale(0.3, 0.3, 0.6), -8.5, 0.7, z); put(M.iron, mCyl(0.03, 0.03, 2.5, 6), -8.5, 1.75, z);
    string(V(-FX + 0.05, 4.1, z), V(-8.5, 2.98, z), 0.12, 5);
  }
  string(V(-8.5, 2.98, -14.4), V(-8.5, 2.98, -20.4), 0.3, 12);

  /* ----- small truths on the east walk ----- */
  // The bus stop: a pole and its plate.
  put(M.galv, mCyl(0.035, 0.035, 3, 8), 7.35, 1.52, 3.0); box(M.galv, 0.52, 0.52, 0.03, 7.35, 2.75, 3.02);
  put(signMat('BUS', { w: 128, bg: '#1b4f9c', fg: '#fff', font: '700 52px ui-monospace, monospace', k: 0.7 }), new THREE.PlaneGeometry(0.46, 0.46), 7.35, 2.75, 3.04);
  // The hydrant: barrel, bonnet, three caps, a chain.
  const hyd = paint(0.56, 0.2, 30);
  put(hyd, mCyl(0.1, 0.12, 0.5, 12), 7.5, 0.27, 7.2); put(hyd, mCyl(0.14, 0.14, 0.04, 12), 7.5, 0.04, 7.2); put(hyd, new THREE.SphereGeometry(0.105, 12, 8), 7.5, 0.52, 7.2); put(hyd, mCyl(0.03, 0.03, 0.06, 6), 7.5, 0.65, 7.2);
  put(hyd, mCyl(0.05, 0.05, 0.34, 8).rotateX(PI / 2), 7.5, 0.4, 7.2); put(hyd, mCyl(0.065, 0.065, 0.3, 8).rotateZ(PI / 2), 7.42, 0.36, 7.2);
  wire(V(7.5, 0.4, 7.38), V(7.61, 0.44, 7.2), 0.09, 0.004, 0);
  // The newspaper box: a window on the south face, a coin head.
  box(M.plastB, 0.45, 0.7, 0.42, 7.55, 0.77, 4.6); box(M.iron, 0.08, 0.42, 0.08, 7.55, 0.23, 4.6); box(M.iron, 0.4, 0.03, 0.36, 7.55, 0.035, 4.6);
  box(M.trim, 0.3, 0.26, 0.01, 7.55, 0.86, 4.808); put(M.glass, new THREE.PlaneGeometry(0.34, 0.3), 7.55, 0.86, 4.816); box(M.galv, 0.12, 0.1, 0.04, 7.55, 1.17, 4.7);
  // The bike rack, and one bike that leans on it.
  for (const z of [1.2, -0.3]) { for (const d of [-0.35, 0.35]) put(M.galv, mCyl(0.025, 0.025, 0.84, 8), 7.6, 0.44, z + d); put(M.galv, mCyl(0.025, 0.025, 0.72, 8).rotateX(PI / 2), 7.6, 0.86, z); }
  const BX = 7.86, A = V(BX, 0.37, 0.97), F = V(BX, 0.37, -0.07), BB = V(BX, 0.3, 0.52), S = V(BX, 0.88, 0.68), H = V(BX, 0.9, 0.08);
  for (const p of [A, F]) { put(M.plastK, new THREE.TorusGeometry(0.33, 0.018, 6, 28).rotateY(PI / 2), p.x, p.y, p.z); put(M.galv, mCyl(0.02, 0.02, 0.1, 6).rotateZ(PI / 2), p.x, p.y, p.z); }
  for (const [a, b] of [[BB, S], [S, H], [BB, V(BX, 0.72, 0.05)], [A, BB], [A, V(BX, 0.8, 0.66)], [H, F]]) limb(chair, a, b, 0.016, 0.014, 6);
  limb(M.galv, S, V(BX, 0.98, 0.71), 0.012, 0.012, 6); box(M.plastK, 0.12, 0.04, 0.26, BX, 1.0, 0.73);
  limb(M.galv, H, V(BX, 1.04, 0.1), 0.012, 0.012, 6); box(M.plastK, 0.46, 0.03, 0.03, BX, 1.05, 0.1);
  // A sandwich board by the laundry door; chalk on the south face.
  box(M.wood, 0.6, 0.95, 0.03, 8.4, 0.49, -2.26, -0.28); box(M.wood, 0.6, 0.95, 0.03, 8.4, 0.49, -2.54, 0.28);
  put(text(128, 200, '#22352c', '#efe9d6', '700 34px ui-monospace, monospace', ['WASH', 'DRY', 'FOLD', '7 – 10']), new THREE.PlaneGeometry(0.5, 0.8), 8.4, 0.496, -2.238, -0.28);

  /* ----- trolley overhead, lamps and banners ----- */
  const flags = [paint(0.6, 0.17, 30), paint(0.75, 0.14, 90), paint(0.55, 0.12, 200)];
  for (let z = 26, i = 0; z > -250; z -= 30, i++) {
    for (const s of [-1, 1]) {
      pole(s * 7.4, z, 8.6, null);
      // A cobra-head lamp on its arm.
      limb(M.galv, V(s * 7.4, 8.0, z), V(s * 5.6, 8.28, z), 0.045, 0.03, 8); box(M.galv, 0.7, 0.11, 0.28, s * 5.3, 8.24, z); box(M.lampLens, 0.44, 0.03, 0.2, s * 5.3, 8.175, z);
      box(M.iron, 0.7, 0.04, 0.04, s * 7.8, 5.78, z); box(flags[(i + (s > 0)) % 3], 0.6, 1.5, 0.02, s * 7.85, 5.0, z);
    }
    // A span wire crosses the street; hangers hold the contact wires.
    wire(V(-7.4, 6.3, z), V(7.4, 6.3, z), 0.4, 0.01, 0.01);
    for (const x of [-2.6, -2, 2, 2.6]) {
      box(M.iron, 0.02, 0.34, 0.02, x, 5.77, z);
      if (z > -220) wire(V(x, 5.6, z), V(x, 5.6, z - 30), 0.08, 0.012, 0.012);
    }
  }

  /* ----- trees in their pits, wet leaves ----- */
  const crown = std(col(0.34, 0.09, 70), { roughness: 0.7, flatShading: true });
  pits.forEach(([s, z], i) => tree(s * 7.7, z, 300 + i * 7, { leaves: 0.4, size: 0.62 }));
  for (let z = -53, i = 0; z > -270; z -= 16, i++) for (const [x, zz] of [[-7.7, z], [7.7, z - 5]]) {
    if (z > -90) { tree(x, zz, 340 + i * 2 + (x > 0), { leaves: 0.4, size: 0.6 }); continue; }
    // A far tree is a trunk and one ragged crown.
    put(M.bark, mCyl(0.1, 0.16, 3, 6), x, 1.5, zz); put(crown, new THREE.IcosahedronGeometry(1, 1).scale(2 + hash(i), 1.6, 2 + hash(i + 9)), x, 4.3, zz);
  }
  k.litter(320, r => [(r() < 0.5 ? -1 : 1) * (6.95 - r() * r() * 1.2), RY + 0.007, 14 - r() * 50], 6);
  k.litter(160, r => [(r() < 0.5 ? -1 : 1) * (7.3 + r() * 3.1), 0.03, 12 - r() * 48], 7);
  pits.forEach(([s, z], i) => k.litter(70, r => { const a = r() * 6.283, d = 0.3 + r() * 1.6, x = s * 7.75 + Math.cos(a) * d, ax = Math.abs(x); return [x, ax < 7 ? RY + 0.007 : ax < 7.2 ? 0.045 : d < 0.55 ? 0.052 : 0.035, z + Math.sin(a) * d]; }, 20 + i));
  k.fall(6, r => [7.7 + (r() - 0.5) * 4, 3 + r() * 3, -16.5 + (r() - 0.5) * 4], -0.3);

  /* ----- parked cars, west side, nose to the south ----- */
  const carGlass = std(col(0.08, 0.02, 250), { roughness: 0.08, envMapIntensity: 2 }), red = std(col(0.5, 0.2, 28), { roughness: 0.3, emissive: col(0.5, 0.2, 28), emissiveIntensity: 0.4 });
  const side = (pts, w) => new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))), { depth: w, bevelEnabled: false }).translate(0, 0, -w / 2);
  [[-3.2, col(0.2, 0.04, 262)], [-9.4, col(0.16, 0.01, 260)], [-22.5, col(0.24, 0.07, 25)], [-28.8, col(0.26, 0.05, 150)], [-58, col(0.3, 0.01, 250)]].forEach(([z, c]) => k.at(-5.8, RY, z, () => {
    // One side profile makes the body; a second makes the glass band.
    put(std(c, { roughness: 0.25, metalness: 0.5 }), side([[-2.15, 0.25], [2.15, 0.25], [2.2, 0.55], [2.1, 0.78], [0.95, 0.86], [0.35, 1.36], [-1.05, 1.38], [-1.7, 0.9], [-2.2, 0.84], [-2.22, 0.5]], 1.72));
    put(carGlass, side([[0.84, 0.9], [0.33, 1.3], [-1.0, 1.32], [-1.55, 0.93]], 1.76));
    box(carGlass, 0.7, 0.02, 1.5, 0.658, 1.119, 0, 0, 0, -0.695); box(carGlass, 0.72, 0.02, 1.5, -1.382, 1.15, 0, 0, 0, 0.636);
    for (const sz of [-1, 1]) {
      for (const sx of [-1.32, 1.32]) { put(M.plastK, mCyl(0.31, 0.31, 0.2, 14).rotateX(PI / 2), sx, 0.31, sz * 0.78); put(M.galv, mCyl(0.17, 0.17, 0.21, 10).rotateX(PI / 2), sx, 0.31, sz * 0.78); }
      box(M.galv, 0.03, 0.12, 0.3, 2.16, 0.66, sz * 0.6); box(red, 0.02, 0.1, 0.3, -2.21, 0.66, sz * 0.6); box(red, 0.12, 0.05, 0.02, -2.0, 0.62, sz * 0.865);
    }
  }, -PI / 2));

  /* ----- the trolley bus: southbound in the west lane ----- */
  const bus = new THREE.Group(), cream = paint(0.9, 0.02, 95), teal = paint(0.5, 0.11, 215), shade = std(col(0.1, 0.01, 260), { roughness: 0.5 });
  const part = (m, g, x, y, z, cast = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = cast; bus.add(o); return o; };
  const slab = (m, w, h, d, x, y, z, cast) => part(m, new THREE.BoxGeometry(w, h, d), x, y, z, cast);
  // The rounded front: half a cylinder, squashed along the bus.
  const nose = (m, h, y, r = 1.275, cast) => part(m, new THREE.CylinderGeometry(r, r, h, 18, 1, false, -PI / 2, PI).scale(1, 1, 0.36), 0, y, 5.6, cast);
  const rod = (m, a, b, r) => { const d = V(0, 0, 0).subVectors(b, a), len = d.length(); part(m, new THREE.CylinderGeometry(r, r, len, 6), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2).quaternion.setFromUnitVectors(UP, d.normalize()); };
  for (const [m, h, y] of [[teal, 0.95, 0.825], [cream, 0.3, 1.45], [cream, 0.55, 2.875]]) { slab(m, 2.55, h, 11.6, 0, y, -0.2); nose(m, h, y); }
  // The lit inside shows through the dark window band.
  slab(lit[0], 2.4, 1.0, 11.2, 0, 2.1, -0.2, false); slab(tubeW, 2.42, 0.05, 10.8, 0, 2.55, -0.2, false); slab(shade, 2.5, 1.0, 0.1, 0, 2.1, -5.95);
  for (let z = -5.6; z <= 5.3; z += 1.35) slab(shade, 2.56, 1.0, 0.12, 0, 2.1, z);
  for (let z = -5; z <= 4.7; z += 0.8) slab(shade, 2.44, 0.4, 0.1, 0, 1.85, z);
  for (const d of [-1, 1]) k.ghost(part(M.glass, new THREE.PlaneGeometry(11.5, 1.0).rotateY(d * PI / 2), d * 1.292, 2.1, -0.2, false));
  nose(shade, 1.0, 2.1, 1.2); k.ghost(nose(M.glass, 1.0, 2.1, 1.28, false));
  slab(shade, 1.8, 0.34, 0.14, 0, 2.88, 6.0); slab(shade, 2.3, 0.22, 0.2, 0, 0.47, 5.98); slab(M.galv, 1.5, 0.28, 5, 0, 3.29, -1);
  part(signMat('20 DOWNTOWN', { w: 832, bg: '#0c0c0c', fg: '#ffb43c', k: 2.2 }), new THREE.PlaneGeometry(1.7, 0.26), 0, 2.88, 6.075, false);
  const beam = glow(col(0.95, 0.04, 90, 8)), tail = glow(col(0.6, 0.24, 28, 3));
  for (const d of [-1, 1]) {
    part(beam, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14).rotateX(PI / 2), d * 0.85, 0.78, 5.95, false); slab(tail, 0.18, 0.3, 0.06, d, 1, -6.01, false);
    slab(shade, 2.57, 0.8, 1.35, 0, 0.75, d * 3.9);
    for (const sx of [-1, 1]) part(M.plastK, new THREE.CylinderGeometry(0.5, 0.5, 0.32, 18).rotateZ(PI / 2), sx * 1.14, 0.5, d * 3.9);
    // Each pole trails back from the roof to its wire.
    rod(M.iron, V(d * 0.3, 3.4, -1.5), V(d * 0.3, 5.73, -6.3), 0.03);
  }
  // One headlight travels with the bus; it throws no shadow.
  const head = new THREE.SpotLight(col(0.95, 0.04, 90), 320, 45, 0.5, 0.7, 1.6);
  head.position.set(0, 0.85, 6.2); head.target.position.set(0, -0.6, 22);
  bus.add(head, head.target);
  bus.position.set(-2.3, RY, -60);

  /* ----- lights: six in all ----- */
  // The street lamp throws real shadows across the wet road.
  const LAMP = V(5.3, 8.1, -4), lamp = new THREE.SpotLight(lampCol, 520, 40, 1.15, 0.6, 1.8);
  lamp.position.copy(LAMP); lamp.target.position.set(6.2, 0, -3);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0015;
  // The awning lamp lights the fruit; every crate throws a shadow.
  const awnSpot = new THREE.SpotLight(col(0.86, 0.13, 72), 34, 14, 1.2, 0.7, 1.6);
  awnSpot.position.set(9.4, 2.5, 2); awnSpot.target.position.set(9.2, 0, 2);
  awnSpot.castShadow = true; awnSpot.shadow.mapSize.set(1024, 1024); awnSpot.shadow.bias = -0.002;
  // Two shop rooms and the pink neon light the walk; no shadows.
  const wash = new THREE.PointLight(col(0.85, 0.07, 215), 12, 10, 1.8), cafe = new THREE.PointLight(col(0.86, 0.13, 70), 18, 12, 1.8), neonL = new THREE.PointLight(col(0.65, 0.25, 350), 14, 12, 1.8);
  wash.position.set(11.6, 2.6, -5); cafe.position.set(-11.6, 2.4, -17.2); neonL.position.set(-9.2, 3.2, -24.5);
  k.group.add(bus, lamp, lamp.target, awnSpot, awnSpot.target, wash, cafe, neonL);
  k.lampCone(V(5.3, 8.16, -4), 5, 8.2, lampCol, 0.045);

  // A crow pecks at the orange.
  const crow = k.crow();
  crow.obj.position.set(7.9, 0.02, 8.4);
  k.onFrame(t => {
    // The bus runs 280 m, then comes again out of the haze.
    bus.position.z = -240 + (t * 6.5 + 56) % 280;
    // The moon sign buzzes now and then.
    moon.color.copy(MOON).multiplyScalar(t % 7.3 < 0.6 && hash(Math.floor(t * 20)) < 0.5 ? 0.2 : 1);
    crow.pose(t, 'peck', 0.45);
  });
}
