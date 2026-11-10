// East Van: the Drive. The west side of Commercial Drive, north from East 4th Avenue.
// Building outlines and heights, shop units, trees and poles come from city data:
// data/drive.json, baked by bake/drive.py from the City of Vancouver Open Data Portal.
// Shop names are not used. Each shop shows a neon icon for its kind of trade.
import { box, cyl, blob, beam } from './lot.js';

const A = 0;
// The data frame: n is metres north of the corner, e is metres east of the centre line.
// The scene frame: x runs north along the Drive, z runs east across it.
const N0 = -21, N1 = 49.9, MID = (N0 + N1) / 2, HALF = (N1 - N0) / 2;
const BACK = -30, LINE = -12, KERB = -8, EAST = 10;
const X = n => n - MID, Z = e => e + 10;
const lerp = (a, b, t) => a + (b - a) * t;
const on = (dyn, hinge, parts) => parts.map(q => ({ ...q, dyn, hinge }));
const slab = (p, s, rx, c) => ({ t: 'slab', p, s, rx, c, L: A });

// Cuts a ring at one straight line. axis 0 is e, axis 1 is n.
function clip(ring, axis, limit, keepMore) {
  const out = [], inside = p => (keepMore ? p[axis] >= limit : p[axis] <= limit);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], ia = inside(a);
    if (ia) out.push(a);
    if (ia !== inside(b)) { const t = (limit - a[axis]) / (b[axis] - a[axis]); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]); }
  }
  return out;
}

// What each trade looks like: awning stripes, and a neon icon on the sign board.
const TRADE = {
  'Food & Beverage': { stripes: ['tomato', 'cream'], icon: (x, y, z) => [cyl([x, y, z], 0.42, 0.04, 'bulbWarm', A, { ax: 'z' }), { t: 'ring', p: [x + 0.52, y, z], r: 0.2, tube: 0.05, c: 'bulbWarm', L: A, ax: 'z' }] },
  'Convenience Goods': { stripes: ['binGreen', 'cream'], icon: (x, y, z) => [cyl([x - 0.75, y, z], 0.36, 0.04, 'tomato', A, { ax: 'z' }), cyl([x, y, z], 0.36, 0.04, 'bulbWarm', A, { ax: 'z' }), cyl([x + 0.75, y, z], 0.36, 0.04, 'bulbTeal', A, { ax: 'z' })] },
  'Comparison Goods': { stripes: ['binBlue', 'cream'], icon: (x, y, z) => [{ t: 'ring', p: [x, y, z], r: 0.42, tube: 0.07, c: 'bulbPink', L: A, ax: 'z' }, cyl([x, y, z], 0.14, 0.04, 'bulbPink', A, { ax: 'z' })] },
  'Service Commercial': { stripes: ['mustard', 'cream'], icon: (x, y, z) => [box([x - 0.45, y, z], [0.24, 0.8, 0.04], 'bulbPink', A), box([x, y, z], [0.24, 0.8, 0.04], 'white', A), box([x + 0.45, y, z], [0.24, 0.8, 0.04], 'bulbTeal', A)] },
};
const TREE = [[/CHERRY/, 'blossom'], [/MAPLE/, 'mapleRed'], [/LINDEN/, 'linden'], [/./, 'oak']];

// One shop bay: glass, a door, a sign board with its icon, a striped awning.
function shop(i, x0, x1, zf, cat) {
  const w = x1 - x0, cx = (x0 + x1) / 2, t = TRADE[cat] || TRADE['Service Commercial'], sw = 'shop' + i, n = Math.max(1, Math.round(w / 4.2));
  const lit = { k: 'pane', sw, on: true, gain: 1.15 }, out = [
    box([cx, 0.45, zf + 0.04], [w - 0.3, 0.6, 0.1], 'found', A),
    box([cx, 1.95, zf + 0.03], [w - 0.5, 2.3, 0.06], 'glass', A, lit),
    box([cx, 1.3, zf + 0.07], [1, 2.3, 0.06], t.stripes[0], A), box([cx, 2.05, zf + 0.1], [0.6, 0.6, 0.03], 'glass', A, lit),
    box([cx, 3.62, zf + 0.08], [w - 0.3, 1.1, 0.14], 'roof', A),
    // The sign is its own switch, so it burns brighter than the glass.
    ...t.icon(cx, 3.62, zf + 0.17).map(q => ({ ...q, sw: 'sign' + i, on: true, gain: 2.2 })),
  ];
  for (let j = 1; j < n; j++) out.push(box([x0 + w * j / n, 1.95, zf + 0.07], [0.12, 2.3, 0.06], 'cream', A));
  const strips = Math.round((w - 0.4) / 0.6), sw0 = (w - 0.4) / strips;
  for (let j = 0; j < strips; j++) out.push(slab([x0 + 0.2 + sw0 * (j + 0.5), 2.95, zf + 0.72], [sw0, 0.06, 1.5], 0.33, t.stripes[j % 2]));
  return out;
}

// A street tree from its record: height, trunk size and kind.
function tree(x, z, h, d, name) {
  const c = TREE.find(([re]) => re.test(name || ''))[1], r = Math.max(0.9, h * 0.2), y = h * 0.66;
  return [
    cyl([x, 0.15 + h * 0.24, z], Math.max(0.1, (d || 20) / 200), h * 0.48, 'trunk', A),
    blob([x, y, z], r, c, A), blob([x - r * 0.7, y - r * 0.35, z + r * 0.2], r * 0.72, c, A),
    blob([x + r * 0.65, y - r * 0.3, z - r * 0.25], r * 0.75, c, A), blob([x + r * 0.1, y + r * 0.7, z], r * 0.65, c, A),
  ];
}
// A parked car: two boxes and four wheels.
const car = (x, z, c) => [
  box([x, 0.62, z], [4.2, 0.7, 1.7], c, A), box([x - 0.2, 1.22, z], [2.3, 0.55, 1.5], 'glassDark', A), box([x - 0.2, 1.52, z], [2.2, 0.06, 1.45], c, A),
  ...[-1.3, 1.3].flatMap(dx => [-0.78, 0.78].map(dz => cyl([x + dx, 0.32, z + dz], 0.32, 0.22, 'tyre', A, { ax: 'z' }))),
];
// A street pole with a lamp arm over the road. side is 1 for east of it.
const pole = (x, z, side) => [
  cyl([x, 4.6, z], 0.11, 8.9, 'can', A), beam([x, 8.7, z], [x, 9.15, z + side * 2.4], 0.09, 'can', A),
  box([x, 9.15, z + side * 2.7], [0.3, 0.12, 0.7], 'can', A),
  box([x, 9.08, z + side * 2.7], [0.22, 0.04, 0.5], 'lamp', A, { k: 'lens', sw: 'lamps', on: true, gain: 2.4 }),
  box([x + 0.16, 6.3, z], [0.04, 0.9, 0.2], 'binGreen', A), box([x + 0.16, 6.3, z + 0.2], [0.04, 0.9, 0.2], 'white', A), box([x + 0.16, 6.3, z + 0.4], [0.04, 0.9, 0.2], 'tomato', A),
];

const STOP = -5;
// The trolley bus, built on the origin of its lane. Its front faces south.
const bus = z => on('bus', [0, 0, z], [
  box([0, 1.95, z], [12, 2.3, 2.5], 'white', A), box([0, 0.95, z], [12.02, 1.1, 2.52], 'binBlue', A),
  box([0, 2.3, z + 1.26], [10.6, 0.9, 0.03], 'glassDark', A), box([0, 2.3, z - 1.26], [10.6, 0.9, 0.03], 'glassDark', A),
  box([-6.01, 2.2, z], [0.03, 1.1, 2.2], 'glassDark', A), box([2, 3.2, z], [5, 0.2, 1.6], 'can', A),
  { ...box([-6.02, 2.93, z], [0.03, 0.26, 1.6], 'bulbWarm', A), glow: true },
  { ...box([-6.02, 0.8, z + 0.85], [0.03, 0.2, 0.3], 'lamp', A), glow: true }, { ...box([-6.02, 0.8, z - 0.85], [0.03, 0.2, 0.3], 'lamp', A), glow: true },
  box([6.01, 0.9, z + 0.9], [0.03, 0.2, 0.25], 'red', A), box([6.01, 0.9, z - 0.9], [0.03, 0.2, 0.25], 'red', A),
  ...[-3.9, 3.9].flatMap(dx => [-1.1, 1.1].map(dz => cyl([dx, 0.5, z + dz], 0.5, 0.3, 'tyre', A, { ax: 'z' }))),
  beam([4, 3.3, z - 0.3], [9.6, 5.68, z - 0.3], 0.06, 'crow', A), beam([4, 3.3, z + 0.3], [9.6, 5.68, z + 0.3], 0.06, 'crow', A),
]);

export async function loadDrive() {
  const d = await (await fetch(new URL('./data/drive.json', import.meta.url))).json();
  const P = [], W = [], pokes = [], acts = {};
  const add = (...q) => P.push(...q.flat());
  const wall = ['brick', 'brick', 'teal', 'mustard', 'cream'];

  /* ---------- ground ---------- */
  const len = 2 * HALF, ax0 = X(-19.4) + 2.9, ax1 = X(-2.8) - 2.9, corner = X(-2.8);
  add(box([0, -0.225, 0], [len, 0.35, 40], 'soil', A, { k: 'plinth' }), box([0, -0.7, 0], [len - 0.1, 0.6, 39.9], 'earth', A, { k: 'plinth' }), box([0, -1.175, 0], [len, 0.35, 40], 'rock', A, { k: 'plinth' }));
  const ground = (p, s, c) => box(p, s, c, A, { k: 'ground' });
  // Road paint is too thin for an ink line.
  const mark = (p, s, c) => box(p, s, c, A, { k: 'ground', noInk: true });
  // The Drive, the avenue, the yard behind the shops, the far kerb.
  add(ground([0, -0.025, (Z(KERB) + 20) / 2], [len, 0.05, 20 - Z(KERB)], 'asphalt'), ground([(ax0 + ax1) / 2, -0.025, -9], [ax1 - ax0, 0.05, 22], 'asphalt'));
  add(ground([(corner + HALF) / 2, 0.05, (Z(BACK) + Z(LINE)) / 2], [HALF - corner, 0.1, Z(LINE) - Z(BACK)], 'lane'));
  add(ground([0, 0.075, 19.25], [len, 0.15, 1.5], 'concrete'), ground([0, 0.075, 18.45], [len, 0.15, 0.1], 'kerb'));
  // Sidewalk slabs along the shops, and the walks beside the avenue.
  for (let x = corner; x < HALF - 0.1; x += 3) add(ground([Math.min(x + 1.5, (x + HALF) / 2), 0.075, (Z(LINE) + Z(KERB)) / 2 - 0.3], [Math.min(2.96, HALF - x), 0.15, Z(KERB) - Z(LINE) + 0.6], 'concrete'));
  add(ground([(ax1 + corner) / 2, 0.075, -9], [corner - ax1, 0.15, 22], 'concrete'), ground([(-HALF + ax0) / 2, 0.075, -9], [ax0 + HALF, 0.15, 22], 'concrete'));
  add(ground([(corner + HALF) / 2, 0.075, Z(KERB) + 0.05], [HALF - corner, 0.15, 0.1], 'kerb'));
  // Road paint: a double centre line, lane dashes, two zebra crossings.
  add(mark([0, 0.005, 10.1], [len, 0.01, 0.1], 'mustard'), mark([0, 0.005, 10.4], [len, 0.01, 0.1], 'mustard'));
  for (let x = -HALF + 2; x < HALF - 2; x += 6) add(mark([x, 0.005, 6.2], [3, 0.01, 0.12], 'white'), mark([x, 0.005, 14.3], [3, 0.01, 0.12], 'white'));
  for (let z = 2.8; z < 18; z += 1) add(mark([ax1 + 1.4, 0.005, z], [2.6, 0.01, 0.5], 'white'));
  for (let x = ax0 + 0.6; x < ax1; x += 1) add(mark([x, 0.005, 0.2], [0.5, 0.01, 2.6], 'white'));

  /* ---------- buildings: real outlines, cut to the slice ---------- */
  const fronts = [];
  d.b.forEach(b => {
    let ring = b.ring.slice(0, -1);
    if (ring.reduce((s, p) => s + p[0], 0) / ring.length > -5) return;
    ring = clip(clip(clip(ring, 0, BACK, true), 1, N0, true), 1, N1, false);
    if (ring.length < 3) return;
    const ns = ring.map(p => p[1]), es = ring.map(p => p[0]);
    // A cut can leave a sliver of a building at the edge. Leave it out.
    if (Math.max(...ns) - Math.min(...ns) < 2 || Math.max(...es) - Math.min(...es) < 2) return;
    const part = { id: b.id, h: b.h, n0: Math.min(...ns), n1: Math.max(...ns), e1: Math.max(...es), ring };
    if (part.e1 > -14 && part.n1 - part.n0 > 3) fronts.push(part); else part.back = true;
    (part.back ? [part] : []).forEach(q => add({ t: 'poly', ring: q.ring.map(([e, n]) => [X(n), Z(e)]), y: 0.1, h: q.h, c: 'garage', L: A }));
  });
  fronts.sort((a, b) => a.n0 - b.n0);
  // Neighbours of one height and one building make one frontage.
  const faces = [];
  fronts.forEach((p, i) => {
    add({ t: 'poly', ring: p.ring.map(([e, n]) => [X(n), Z(e)]), y: 0.1, h: p.h, c: wall[i % wall.length], L: A });
    const last = faces.at(-1), x0 = last ? Math.max(X(p.n0), last.x1) : X(p.n0);
    if (last && last.id === p.id && Math.abs(last.h - p.h) < 0.5) { last.x1 = X(p.n1); last.n1 = p.n1; last.zf = Math.max(last.zf, Z(p.e1)); }
    else faces.push({ id: p.id, h: p.h, x0, x1: X(p.n1), n0: p.n0, n1: p.n1, zf: Z(p.e1), c: wall[i % wall.length] });
  });

  /* ---------- frontages: shops below, windows above, a cornice ---------- */
  let shops = 0;
  faces.forEach((f, fi) => {
    const w = f.x1 - f.x0, zf = f.zf;
    // The shop units geocoded to this frontage. Units at the rear are upstairs.
    const units = d.stores.filter(s => s.at[0] < 0 && s.at[0] > -38 && s.at[1] >= f.n0 - 1 && s.at[1] <= f.n1 + 1 && /COMMERCIAL/.test(s.street || '')).sort((a, b) => +b.civic - +a.civic);
    const cats = units.length ? units.map(u => u.cat) : ['Service Commercial'];
    cats.forEach((cat, k) => {
      const x0 = f.x0 + w * k / cats.length, x1 = f.x0 + w * (k + 1) / cats.length;
      add(shop(shops, x0, x1, zf, cat));
      pokes.push({ id: 'shop' + shops, at: [(x0 + x1) / 2, 3.3, zf + 0.3], r: 1.8 });
      acts['shop' + shops] = [['flip', 'shop' + shops], ['flip', 'sign' + shops, true]];
      shops++;
    });
    add(box([(f.x0 + f.x1) / 2, f.h - 0.1, zf + 0.1], [w + 0.2, 0.45, 0.35], 'cream', A), box([(f.x0 + f.x1) / 2, 4.2, zf + 0.06], [w, 0.2, 0.14], 'cream', A));
    // Upper windows: a row for each floor that fits.
    const cols = Math.max(1, Math.round(w / 2.7));
    for (let y = 5.6; y < f.h - 1.3; y += 3) for (let j = 0; j < cols; j++) {
      const x = f.x0 + w * (j + 0.5) / cols, lit = (j * 7 + Math.round(y) + fi) % 3 !== 0;
      add(box([x, y, zf + 0.03], [1.36, 1.76, 0.06], 'cream', A), box([x, y, zf + 0.06], [1.1, 1.5, 0.05], lit ? 'glass' : 'glassDark', A, lit ? { k: 'pane', sw: 'up' + fi, on: true } : {}));
    }
    if (f.h > 7) pokes.push({ id: 'up' + fi, at: [(f.x0 + f.x1) / 2, 5.6, zf + 0.2], r: 2.2 });
  });

  /* ---------- street: trees and poles from the records ---------- */
  for (const t of d.trees) {
    const [e, n] = t.at;
    if (n > N0 + 1 && n < N1 && e < -5 && e > BACK + 2 && t.h) add(tree(X(n), Z(e), Math.min(t.h, 15), t.d, t.name));
  }
  const lights = [];
  for (const [e, n] of d.poles) {
    if (n < N0 + 1 || n > N1 - 1 || Math.abs(e) > 12 || Math.abs(e) < 6) continue;
    const z = e < 0 ? Z(KERB) - 0.5 : 19.2, side = e < 0 ? 1 : -1;
    // Two poles stand two metres apart at the corner: one lamp arm is enough.
    if (lights.some(l => Math.abs(l[0] - X(n)) < 5 && l[1] === z)) continue;
    add(pole(X(n), z, side)); lights.push([X(n), z, side]);
    // A span wire crosses the street at each pole and carries the trolley wires.
    W.push({ a: [X(n), 6.1, Z(KERB) - 0.5], b: [X(n), 6.1, 19.2], sag: 0.15, clip: 99 });
  }
  // Two pairs of trolley wires: one pair for each way.
  for (const z of [5.7, 6.3, 13.9, 14.5]) W.push({ a: [-HALF - 2, 5.7, z], b: [HALF + 2, 5.7, z], sag: 0.1, clip: HALF });

  /* ---------- life on the street ---------- */
  add(bus(6), car(12, 3.25, 'tomato'), car(25.5, 3.25, 'mustard'), car(-2, 16.9, 'hydrangea'));
  // Paper boxes at the corner, a bench, a fruit stand in front of the grocer.
  add([['binBlue', 0], ['tomato', 0.7], ['mustard', 1.4]].map(([c, dx]) => box([corner + 1.2 + dx, 0.7, Z(KERB) - 0.9], [0.5, 1.1, 0.45], c, A)));
  add(box([corner + 6, 0.6, Z(KERB) - 1], [1.8, 0.1, 0.5], 'cedar', A), box([corner + 5.3, 0.38, Z(KERB) - 1], [0.1, 0.45, 0.5], 'can', A), box([corner + 6.7, 0.38, Z(KERB) - 1], [0.1, 0.45, 0.5], 'can', A));
  const grocer = d.stores.find(s => s.cat === 'Convenience Goods' && s.at[0] < 0 && s.at[1] > N0 && s.at[1] < N1);
  if (grocer) {
    const gx = X(grocer.at[1]) - 1, gz = Z(LINE) + 1.1;
    add([0, 1, 2].map(i => box([gx + i * 1.1, 0.55, gz], [1, 0.5, 0.7], 'cedar', A)));
    add(on('fruit', [gx + 1.1, 0.8, gz], [0, 1, 2].flatMap(i => [0, 1, 2, 3, 4, 5].map(j => blob([gx + i * 1.1 - 0.3 + (j % 3) * 0.3, 0.88, gz - 0.15 + Math.floor(j / 3) * 0.3], 0.14, ['tomato', 'mustard', 'binGreen'][i], A)))));
    pokes.push({ id: 'fruit', at: [gx + 1.1, 0.9, gz], r: 1.6 });
  }
  pokes.push({ id: 'bus', at: [STOP, 2, 6], r: 3.5 }, { id: 'lamps', at: lights[0] ? [lights[0][0], 9.1, lights[0][1] + lights[0][2] * 2.7] : [0, 9, 4], r: 1.3 });

  return {
    PARTS: P, WIRES: W, POKES: pokes,
    MOVES: {
      // The bus leaves south, then comes back in from the north end.
      bus: (g, k) => {
        const u = k < 0.45 ? k / 0.45 : (k - 0.45) / 0.55, x = k < 0.45 ? STOP - (HALF + 8 + STOP) * u * u : HALF + 8 - (HALF + 8 - STOP) * (1 - (1 - u) * (1 - u));
        // It pops out of sight where the plinth ends.
        const s = Math.min(1, Math.max(0, (HALF + 3 - Math.abs(x)) / 4));
        g.position.x = x; g.visible = s > 0.01; g.scale.setScalar(Math.max(s, 0.01));
      },
      fruit: (g, k, h) => { g.position.y = h[1] + 0.5 * k; g.rotation.y = 0.6 * Math.sin(k * 9.4); },
    },
    ACTS: { ...acts, bus: [['run', 'bus', 11]], fruit: [['pulse', 'fruit', 0.15, 0, 0.7, 'bounce.out']], lamps: [['flip', 'lamps', true]] },
    LAMPS: lights.filter(l => l[2] === 1).slice(0, 3).map(([x, z, side]) => ({ col: [0.86, 0.14, 65], at: [x, 9, z + side * 2.7], to: [x, 0, z + side * 2], power: 700, range: 26, of: 'sw:lamps' })),
    SUN: { target: [0, 3, 0], half: [46, 34] },
  };
}

// The credit line the licence asks for. The page shows it on the Drive.
export const CREDIT = 'Contains information licensed under the Open Government Licence – Vancouver.';
