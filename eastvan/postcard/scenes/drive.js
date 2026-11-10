// East Van postcards: Commercial Drive at East 4th. One card.
// The Drive runs north. The viewer stands in the east bus zone.
import { THREE, V, col, rng, hash, tex, signTex, std, glow, ico, M, WARM } from '../kit.js';

const lampCol = col(0.84, 0.13, 68), MOON = col(0.9, 0.15, 95, 4);
export const cards = [
  { cap: 'The Drive · 5:40 pm · After rain', hour: 18.9,
    cam: { pos: [5.6, 1.5, 15], yaw: 0, pitch: 0, up: 30, down: 16, minHalf: 0.44 },
    sun: [-0.7, 0.09, -0.6], sunCol: col(0.78, 0.1, 40), sunI: 0.6, hemi: [col(0.56, 0.07, 266), col(0.34, 0.04, 295), 1.05],
    fog: col(0.33, 0.055, 272), fogD: 0.009,
    sky: { cloudA: 0.8, cov: 0.4, cloud: col(0.27, 0.04, 270), cloudLit: col(0.6, 0.12, 25), hazeA: 0.6, hazeK: 7, disc: 0, stars: 0, sunCol: col(0.7, 0.15, 40, 1.2) },
    exposure: 1.05, win: 1.1, awn: 22, lamp: 380, cafe: 45, neon: 35, wash: 40,
    rain: 0, rainLamp: [5.3, 8.1, -4], wet: true, wind: 0.2, flock: 40,
    mtn: [col(0.29, 0.07, 300), col(0.22, 0.05, 280)], shadow: { at: [0, 0, -12], r: 40 },
    bloom: [0.5, 0.65, 0.98], grade: { con: 1.07, sat: 1.12, vig: 0.4, grain: 0.06, lift: [0.01, 0.005, 0.03] } },
];

export function build(k) {
  const { box, put, win, pole, wire, tree, car } = k;
  // FX is the shop front line, each side of the street.
  const R = rng(19), FX = 10.5, pick = a => a[Math.floor(R() * a.length)];
  const disc = r => new THREE.CylinderGeometry(r, r, 0.03, 24).rotateX(Math.PI / 2);
  const glass = (L, C, h, i) => std(0.2, 0.03, 250, { roughness: 0.25, noCast: true, emissive: col(L, C, h), emissiveIntensity: i * 0.6 });
  const stripe = (css, n) => std(0.95, 0.01, 90, { map: tex(8, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = css; g.fillRect(0, 0, w, h / 2); }, { ry: n }) });
  const walls = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'brick', 'stucco', std(0.7, 0.1, 62), std(0.5, 0.08, 330)];
  const awns = [std(0.5, 0.17, 28), std(0.42, 0.09, 150), std(0.36, 0.08, 262), std(0.76, 0.14, 86), std(0.3, 0.02, 262)];
  const coolG = glass(0.9, 0.05, 215, 1.25), pinkG = glass(0.72, 0.16, 350, 1.3), goldG = glass(0.84, 0.14, 62, 1.6), bookG = glass(0.86, 0.1, 95, 1.4);
  const panes = ['winLit', 'winLit', 'winDim', goldG, bookG, coolG];
  const neonP = glow(0.68, 0.25, 350, 5), neonC = glow(0.82, 0.14, 200, 4), moon = glow(0.9, 0.15, 95, 4), bulb = glow(0.86, 0.13, 72, 5), head = glow(0.84, 0.13, 68, 6);
  const fruit = [[0.72, 0.17, 60], [0.56, 0.2, 28], [0.72, 0.17, 128], [0.88, 0.17, 100], [0.42, 0.12, 320]].map(c => std(...c, { flatShading: true }));

  /* ----- ground: wet road, sidewalks, curbs ----- */
  // The wet walk is dark and smooth, with slab joints.
  const walk = std(0.5, 0.015, 265, { roughness: 0.45, map: tex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h - 2, w, 2); g.fillRect(w / 2, 0, 1, h); }) });
  box('road', 700, 0.2, 380, 0, -0.25, -120);
  k.wetRoad(14, 350, 0, -0.145, -135);
  box(std(0.8, 0.14, 95, { noCast: true }), 0.12, 0.012, 350, 0, -0.136, -135);
  // East 4th crosses between z = -37 and z = -49.
  for (const s of [-1, 1]) for (const [a, b] of [[40, -37], [-49, -300]]) {
    const g = new THREE.BoxGeometry(3.5, 0.18, a - b), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (a - b) / 1.75);
    put(walk, g, s * 8.75, -0.065, (a + b) / 2);
    box('curb', 0.18, 0.2, a - b, s * 7.05, -0.055, (a + b) / 2);
  }
  k.litter(260, r => { const s = r() < 0.5 ? -1 : 1, gut = r() < 0.4; return [s * (gut ? 6.9 - r() * r() * 1.2 : 7.2 + r() * 3), gut ? -0.14 : 0.03, 16 - r() * 52]; }, 6);

  /* ----- the shop rows ----- */
  // A lit sign: text on a plane. k above 1 feeds the bloom.
  function sign(text, w, h, x, y, z, ry, { k: g = 1.3, ...o } = {}) {
    const m = new THREE.MeshBasicMaterial({ map: signTex(text, { w: Math.round(128 * w / h), h: 128, ...o }), color: new THREE.Color(g, g, g) });
    m.userData.noCast = true;
    put(m, new THREE.PlaneGeometry(w, h), x, y, z, 0, ry);
  }
  // A sign that hangs over the sidewalk and faces south.
  function blade(s, z, text, o) {
    box('iron', 1.7, 0.62, 0.1, s * (FX - 0.95), 4.5, z); box('iron', 1.9, 0.05, 0.05, s * (FX - 0.95), 4.84, z);
    sign(text, 1.6, 0.52, s * (FX - 0.95), 4.5, z + 0.06, 0, o);
  }
  // One storefront. s: 1 is east, -1 is west. zc, w: centre and width.
  function shop(s, zc, w, o = {}) {
    const wall = o.wall || pick(walls), two = o.two ?? R() < 0.6, H = two ? 8.2 : 4.9 + R() * 0.6;
    const pane = o.glass || pick(panes), awn = 'awn' in o ? o.awn : R() < 0.75 ? pick(awns) : null, plain = o.val || awn;
    const fx = s * FX, ww = w - 2.9, zw = zc - 0.75, zd = zc + w / 2 - 1.1, n = Math.round(ww / 1.5);
    box(wall, 12, H + 0.2, w, s * (FX + 6), H / 2 - 0.1, zc); box('trim', 0.5, 0.16, w, s * (FX + 0.1), H + 0.08, zc);
    // The shop window with its mullions, then the door.
    box(pane, 0.08, 2.2, ww, fx, 1.6, zw);
    for (let i = 0; i <= n; i++) box('iron', 0.12, 2.2, 0.07, fx, 1.6, zw - ww / 2 + i * ww / n);
    box(plain || 'door', 0.1, 2.3, 1.0, fx, 1.15, zd); box(pane, 0.12, 1.4, 0.62, fx, 1.45, zd);
    if (o.name) sign(o.name, w - 1.4, 0.72, fx - s * 0.05, 3.5, zc, -s * Math.PI / 2, o.sign);
    else box(plain || 'trim', 0.08, 0.6, w - 1.4, fx, 3.5, zc);
    if (awn) { box(awn, 1.7, 0.06, w - 0.8, s * (FX - 0.8), 2.78, zc, 0, 0, s * 0.33); box(plain, 0.05, 0.26, w - 0.8, s * (FX - 1.6), 2.38, zc); }
    if (!two) return;
    // The flat above: one bay window and one flat window.
    const zb = zc + w / 4 - 0.3, lit = () => (R() < 0.45 ? 'winLit' : 'winDim');
    box(wall, 0.7, 2.7, 2.4, s * (FX - 0.3), 5.95, zb); box('roof', 0.9, 0.1, 2.6, s * (FX - 0.3), 7.35, zb);
    win(lit(), 1.5, 1.7, s * (FX - 0.66), 6.0, zb, true); win(lit(), 1.1, 1.7, s * (FX - 0.01), 6.0, zc - w / 4, true);
  }
  // Fills a row from z = a north to z = b with uneven shops.
  function fill(s, a, b) {
    const n = Math.max(1, Math.round((a - b) / 7.4)), st = (a - b) / n;
    for (let i = 1, z = a; i <= n; i++) { const zn = i < n ? a - (i + (R() - 0.5) * 0.2) * st : b; shop(s, (z + zn) / 2, z - zn); z = zn; }
  }
  fill(1, 30, 7.5);
  shop(1, 3, 9, { name: "NORMA'S PRODUCE", wall: 'h2', two: true, glass: 'winLit', awn: stripe('#2f7d4f', 10), val: awns[1], sign: { bg: '#1f5d3a', fg: '#fff3d0' } });
  shop(1, -5, 7, { name: 'LUCKY MOON LAUNDRY', wall: 'stucco', two: false, glass: coolG, awn: null, sign: { bg: '#e9eef2', fg: '#1d4fa8', k: 1 } });
  shop(1, -12, 7, { name: 'HERON BOOKS', wall: 'h4', two: true, glass: bookG, awn: awns[2], sign: { bg: '#2a2440', fg: '#f2c66a', font: '700 76px serif' } });
  fill(1, -15.5, -37); fill(1, -49, -280);
  fill(-1, 30, -13);
  shop(-1, -17, 8, { name: 'CAFFÈ LUCCIOLA', wall: 'brick', two: true, glass: goldG, awn: stripe('#a3262a', 9), val: awns[0], sign: { bg: '#7a1d1d', fg: '#ffe9c2', font: 'italic 700 80px serif' } });
  shop(-1, -24.5, 7, { name: 'THIMBLE RECORDS', wall: std(0.3, 0.03, 300), two: true, glass: pinkG, awn: null, sign: { bg: '#141018', fg: '#ff6fae' } });
  fill(-1, -28, -37); fill(-1, -49, -280);
  blade(1, 3, "NORMA'S", { bg: '#1f5d3a', fg: '#fff3d0' });
  blade(1, -9, 'BOOKS', { bg: '#2a2440', fg: '#f2c66a', font: '700 76px serif' });
  blade(-1, -13.5, 'CAFFÈ', { bg: '#7a1d1d', fg: '#ffe9c2', font: 'italic 700 80px serif' });
  // The laundry: a neon moon, and a small sign in the window.
  box('iron', 1.5, 1.5, 0.1, 9.5, 4.9, -2); box('iron', 1.9, 0.05, 0.05, 9.55, 4.3, -2);
  put(moon, disc(0.6), 9.5, 4.9, -1.93); put('iron', disc(0.5), 9.72, 5.0, -1.89);
  sign('OPEN', 0.9, 0.36, FX - 0.07, 2.3, -4.4, -Math.PI / 2, { bg: '#120808', fg: '#ff5a4a', k: 2.2 });
  // The record shop: a neon ring round a record, and two neon tubes.
  box('iron', 2.0, 0.06, 0.06, -9.5, 5.72, -21.5);
  put(neonP, disc(0.8), -9.5, 4.9, -21.5); put('binK', disc(0.7), -9.5, 4.9, -21.46); put(neonC, disc(0.25), -9.5, 4.9, -21.42); put('binK', disc(0.05), -9.5, 4.9, -21.38);
  box(neonP, 0.05, 0.05, 5.6, -FX + 0.1, 3.95, -24.5); box(neonC, 0.05, 0.05, 5.6, -FX + 0.1, 3.05, -24.5);

  /* ----- the produce stand: three tilted trays of crates ----- */
  const TA = 0.3, ca = Math.cos(TA), sa = Math.sin(TA);
  for (let i = 0; i < 3; i++) {
    const z = 4.1 - i * 2.15;
    box('deck', 1.2, 0.62, 2.0, 9.7, 0.335, z); box('deck', 0.5, 0.9, 2.0, 10.1, 0.475, z);
    box('wood', 1.5, 0.06, 2.0, 9.6, 0.86, z, 0, 0, TA);
    for (let j = 0; j < 6; j++) {
      const u = j < 3 ? -0.36 : 0.36, cx = 9.6 + u * ca, cy = 0.95 + u * sa, cz = z + (j % 3 - 1) * 0.64, m = fruit[(i * 2 + j) % 5];
      box('wood', 0.62, 0.12, 0.56, cx, cy, cz, 0, 0, TA);
      for (let f = 0; f < 6; f++) { const v = (f % 3 - 1) * 0.18; put(m, ico(0.09, 0.09, 0.09, 0), cx + v * ca, cy + 0.11 + v * sa, cz + (f < 3 ? -0.13 : 0.13)); }
    }
  }
  // Spare crates by the door, and one orange on the walk.
  box('wood', 0.5, 0.3, 0.4, 10.2, 0.175, 7.2); box('wood', 0.5, 0.3, 0.4, 10.2, 0.475, 7.2, 0, 0.3); box('wood', 0.5, 0.3, 0.4, 9.65, 0.175, 7.25, 0, -0.2);
  put(fruit[0], ico(0.09, 0.09, 0.09, 0), 8.05, 0.11, 8.7);

  /* ----- the caffè patio: tables, planters, a string of bulbs ----- */
  const chair = std(0.55, 0.15, 28);
  for (const z of [-15, -17, -19]) {
    put('steel', new THREE.CylinderGeometry(0.36, 0.36, 0.04, 12), -9.5, 0.76, z); put('iron', new THREE.CylinderGeometry(0.04, 0.16, 0.72, 8), -9.5, 0.385, z);
    for (const d of [-0.62, 0.62]) { box(chair, 0.4, 0.05, 0.4, -9.5, 0.47, z + d); box(chair, 0.4, 0.45, 0.04, -9.5, 0.72, z + d * 1.3); box('iron', 0.34, 0.42, 0.34, -9.5, 0.235, z + d); }
  }
  for (const z of [-14.4, -20.4]) {
    box('wood', 0.45, 0.5, 1.4, -8.5, 0.275, z); put('bush', ico(0.3, 0.3, 0.6), -8.5, 0.7, z);
    put('iron', new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6), -8.5, 1.75, z);
  }
  // The cord holds still, so the bulbs stay on it.
  const string = (a, b, sag, n) => {
    wire(a, b, sag, 0.012, 0);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; put(bulb, new THREE.SphereGeometry(0.055, 8, 6), a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u) - 0.05, a.z + (b.z - a.z) * u); }
  };
  string(V(-8.5, 2.95, -14.4), V(-8.5, 2.95, -20.4), 0.3, 12);
  for (const z of [-14.4, -20.4]) string(V(-FX + 0.05, 4.1, z), V(-8.5, 2.95, z), 0.12, 5);

  /* ----- small truths on the east walk ----- */
  // The bus stop: a pole and its plate.
  put('steel', new THREE.CylinderGeometry(0.035, 0.035, 3, 6), 7.35, 1.525, 3.0); box('steel', 0.52, 0.52, 0.03, 7.35, 2.75, 3.02);
  sign('BUS', 0.5, 0.5, 7.35, 2.75, 3.05, 0, { bg: '#1b4f9c', fg: '#fff', k: 0.7 });
  const hyd = std(0.56, 0.2, 30);
  put(hyd, new THREE.CylinderGeometry(0.11, 0.13, 0.55, 8), 7.5, 0.3, 7.2); put(hyd, ico(0.12, 0.1, 0.12), 7.5, 0.6, 7.2); box(hyd, 0.36, 0.1, 0.1, 7.5, 0.42, 7.2);
  // A newspaper box.
  box('binB', 0.45, 0.95, 0.42, 7.55, 0.5, 4.6); box('trim', 0.34, 0.3, 0.02, 7.55, 0.72, 4.82);
  // A bike rack, and one bike that leans on it.
  for (const z of [1.2, -0.3]) { box('steel', 0.05, 0.85, 0.05, 7.6, 0.45, z - 0.35); box('steel', 0.05, 0.85, 0.05, 7.6, 0.45, z + 0.35); box('steel', 0.05, 0.05, 0.75, 7.6, 0.87, z); }
  for (const d of [-0.52, 0.52]) put('binK', new THREE.CylinderGeometry(0.33, 0.33, 0.04, 14).rotateZ(Math.PI / 2), 7.85, 0.36, 0.45 + d);
  box(chair, 0.04, 0.05, 1.0, 7.85, 0.66, 0.45); box(chair, 0.04, 0.5, 0.04, 7.85, 0.78, 0.75); box(chair, 0.04, 0.6, 0.04, 7.85, 0.8, 0);
  box('binK', 0.44, 0.04, 0.04, 7.85, 1.1, 0); box('binK', 0.1, 0.05, 0.24, 7.85, 1.04, 0.75);
  // A sandwich board by the laundry door.
  const chalk = std(0.88, 0.1, 95);
  box(chalk, 0.6, 0.95, 0.04, 8.4, 0.49, -2.26, -0.28); box(chalk, 0.6, 0.95, 0.04, 8.4, 0.49, -2.54, 0.28);

  /* ----- trolley overhead, lamps and banners ----- */
  const flags = [std(0.6, 0.17, 30), std(0.75, 0.14, 90), std(0.55, 0.12, 200)];
  for (let z = 26, i = 0; z > -250; z -= 30, i++) {
    for (const s of [-1, 1]) {
      pole(s * 7.4, z, 8.6, false);
      box('steel', 2.3, 0.07, 0.07, s * 6.3, 8.25, z); box('steel', 0.6, 0.1, 0.3, s * 5.3, 8.2, z); box(head, 0.5, 0.03, 0.24, s * 5.3, 8.14, z);
      box('iron', 0.7, 0.04, 0.04, s * 7.8, 5.78, z); box(flags[(i + (s > 0)) % 3], 0.6, 1.5, 0.03, s * 7.85, 5.0, z);
    }
    // A span wire crosses the street; hangers hold the contact wires.
    wire(V(-7.4, 6.3, z), V(7.4, 6.3, z), 0.4, 0.016, 0.01);
    for (const x of [-2.6, -2, 2, 2.6]) {
      box('iron', 0.02, 0.34, 0.02, x, 5.77, z);
      if (z > -220) wire(V(x, 5.6, z), V(x, 5.6, z - 30), 0.08, 0.02, 0.012);
    }
  }

  /* ----- trees and parked cars ----- */
  [1, -30].forEach((z, i) => tree(-7.7, z, 300 + i, { size: 0.62 }));
  [-16.5, -30].forEach((z, i) => tree(7.7, z, 320 + i, { size: 0.62 }));
  for (let z = -53, i = 0; z > -270; z -= 16, i++) { tree(-7.7, z, 340 + i, { size: 0.62 }); tree(7.7, z - 5, 380 + i, { size: 0.62 }); }
  const paint = ['binK', 'steel', 'stucco', 'brick', std(0.42, 0.09, 255, { roughness: 0.5 }), std(0.5, 0.1, 150, { roughness: 0.5 }), std(0.55, 0.16, 28, { roughness: 0.5 })];
  for (let z = 3; z > -230; z -= 6.2) for (const s of [-1, 1]) {
    // No car stands in the crossing or in the bus zone.
    if ((z < -33 && z > -53) || (s > 0 && z > -13) || R() < 0.3) continue;
    car(pick(paint), s * 5.8, z + R(), s * Math.PI / 2, -0.15);
  }

  /* ----- the trolley bus: southbound in the west lane ----- */
  const bus = new THREE.Group();
  const part = (m, g, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = !m.userData.noCast; bus.add(o); return o; };
  const slab = (m, w, h, d, x, y, z) => part(m, new THREE.BoxGeometry(w, h, d), x, y, z);
  const beam = glow(0.95, 0.04, 90, 6), tail = glow(0.6, 0.24, 28, 3);
  slab(std(0.9, 0.02, 95, { roughness: 0.5 }), 2.55, 2.75, 12, 0, 1.78, 0); slab(std(0.5, 0.11, 215, { roughness: 0.5 }), 2.58, 0.75, 12.02, 0, 0.9, 0);
  slab(M.steel, 1.5, 0.28, 5, 0, 3.29, -1);
  slab(M.winDim, 2.6, 0.95, 11.2, 0, 2.2, -0.1); slab(M.winDim, 2.3, 1.25, 0.06, 0, 2.05, 6);
  slab(glow(0.82, 0.16, 75, 3), 1.7, 0.26, 0.06, 0, 2.9, 6);
  for (const d of [-1, 1]) {
    slab(beam, 0.32, 0.16, 0.06, d * 0.9, 0.72, 6); slab(tail, 0.18, 0.3, 0.06, d, 1, -6);
    part(M.binK, new THREE.CylinderGeometry(0.5, 0.5, 2.62, 12).rotateZ(Math.PI / 2), 0, 0.5, d * 3.9);
    // Each pole trails back from the roof to its wire.
    part(M.iron, new THREE.CylinderGeometry(0.03, 0.03, 5.35, 6), d * 0.3, 4.575, -3.9).rotation.x = -Math.atan2(4.8, 2.35);
  }
  bus.position.set(-2.3, -0.15, -60);

  /* ----- lights ----- */
  // The awning lamp lights the fruit; only it casts shadows.
  const awnSpot = new THREE.SpotLight(WARM, 0, 14, 1.2, 0.7, 1.6);
  awnSpot.position.set(9.4, 2.5, 2);
  awnSpot.target.position.set(9.2, 0, 2);
  awnSpot.castShadow = true;
  awnSpot.shadow.mapSize.set(1024, 1024);
  awnSpot.shadow.bias = -0.002;
  const lamp = new THREE.SpotLight(lampCol, 0, 34, 1.15, 0.9, 1.7);
  lamp.position.set(5.3, 8.1, -4);
  lamp.target.position.set(6.2, 0, -3);
  const cafe = new THREE.PointLight(WARM, 0, 12, 2), neonL = new THREE.PointLight(col(0.65, 0.25, 350), 0, 12, 2), wash = new THREE.PointLight(col(0.85, 0.07, 215), 0, 10, 2);
  cafe.position.set(-8.3, 2.5, -17); neonL.position.set(-9.2, 3.2, -24.5); wash.position.set(9.2, 2.4, -5);
  k.group.add(bus, awnSpot, awnSpot.target, lamp, lamp.target, cafe, neonL, wash);

  // A crow pecks at the orange.
  const crow = k.crow();
  crow.obj.position.set(7.9, 0.03, 8.4);
  k.onCard(c => { awnSpot.intensity = c.awn; lamp.intensity = c.lamp; cafe.intensity = c.cafe; neonL.intensity = c.neon; wash.intensity = c.wash; });
  k.onFrame(t => {
    // The bus runs 280 m, then comes again out of the haze.
    bus.position.z = -240 + (t * 6.5 + 56) % 280;
    // The moon sign buzzes now and then.
    moon.color.copy(MOON).multiplyScalar(t % 7.3 < 0.6 && hash(Math.floor(t * 20)) < 0.5 ? 0.2 : 1);
    crow.pose(t, 'peck', 0.45);
  });
}
