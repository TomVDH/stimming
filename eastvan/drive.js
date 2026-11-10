// East Van: the Drive. A disc of city, cut round the corner of Commercial Drive and East 4th Avenue.
// Lots, building outlines and heights, shop units, trees and poles come from city data:
// data/drive.json, baked by bake/drive.py from the City of Vancouver Open Data Portal.
// Shop names are not used. Each shop shows a neon icon for its kind of trade.
import { box, cyl, blob, beam } from './lot.js';

const A = 0;
// The data frame: e is metres east of the corner, n is metres north of it.
// The scene frame is the same: x runs north along the Drive, z runs east.
export const R = 58;
// The Drive's kerbs and lot lines, and the two legs of the avenue, read from the lots.
const KERB_W = -8.4, KERB_E = 8.9, LOT_W = -11.9, LOT_E = 12.4, MID = 0.25;
const WEST_LEG = [-20.9, -1.4], EAST_LEG = [5.2, 17.3];
const lerp = (a, b, t) => a + (b - a) * t;
const on = (dyn, hinge, parts) => parts.map(q => ({ ...q, dyn, hinge }));
const slab = (p, s, rx, c) => ({ t: 'slab', p, s, rx, c, L: A });
const poly = (ring, y, h, c, o = {}) => ({ t: 'poly', ring: ring.map(([e, n]) => [n, e]), y, h, c, L: A, ...o });
const area = r => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0)) / 2;

// The disc as a 64-sided ring. A shape is cut to it one side at a time.
const DISC = Array.from({ length: 64 }, (_, i) => [Math.cos(i / 64 * 2 * Math.PI) * R, Math.sin(i / 64 * 2 * Math.PI) * R]);
function cut(ring) {
  let out = ring;
  for (let i = 0; i < DISC.length && out.length; i++) {
    const a = DISC[i], b = DISC[(i + 1) % DISC.length], side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), next = [];
    for (let j = 0; j < out.length; j++) {
      const p = out[j], q = out[(j + 1) % out.length], sp = side(p), sq = side(q);
      if (sp >= 0) next.push(p);
      if (sp >= 0 !== sq >= 0) { const t = sp / (sp - sq); next.push([lerp(p[0], q[0], t), lerp(p[1], q[1], t)]); }
    }
    out = next;
  }
  return out;
}
const rect = (e0, n0, e1, n1) => cut([[e0, n0], [e1, n0], [e1, n1], [e0, n1]]);
// Trims a ring at one north-south line. more keeps the east side of it.
function trim(ring, limit, more) {
  const out = [], inside = p => (more ? p[0] >= limit : p[0] <= limit);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], ia = inside(a);
    if (ia) out.push(a);
    if (ia !== inside(b)) { const t = (limit - a[0]) / (b[0] - a[0]); out.push([limit, lerp(a[1], b[1], t)]); }
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
const WALL = ['brick', 'teal', 'mustard', 'hydrangea', 'cream', 'tomatoDark', 'garage'], HOUSE = ['teal', 'mustard', 'blossom2', 'hydrangea', 'cream', 'binBlue', 'tomato'];

// One shop bay: glass, a door, a sign board with its icon, a striped awning.
// zf is the wall. dir is 1 where the shop faces east, -1 where it faces west.
function shop(i, x0, x1, zf, cat, dir) {
  const w = x1 - x0, cx = (x0 + x1) / 2, t = TRADE[cat] || TRADE['Service Commercial'], sw = 'shop' + i, n = Math.max(1, Math.round(w / 4.2)), z = d => zf + dir * d;
  const lit = { k: 'pane', sw, on: true, gain: 1.15 }, out = [
    box([cx, 0.45, z(0.04)], [w - 0.3, 0.6, 0.1], 'found', A),
    box([cx, 1.95, z(0.03)], [w - 0.5, 2.3, 0.06], 'glass', A, lit),
    box([cx, 1.3, z(0.07)], [1, 2.3, 0.06], t.stripes[0], A), box([cx, 2.05, z(0.1)], [0.6, 0.6, 0.03], 'glass', A, lit),
    box([cx, 3.62, z(0.08)], [w - 0.3, 1.1, 0.14], 'roof', A),
    // The sign shares the shop's switch and burns brighter than the glass.
    ...t.icon(cx, 3.62, z(0.17)).map(q => ({ ...q, sw, on: true, boost: 1.9 })),
  ];
  for (let j = 1; j < n; j++) out.push(box([x0 + w * j / n, 1.95, z(0.07)], [0.12, 2.3, 0.06], 'cream', A));
  const strips = Math.max(1, Math.round((w - 0.4) / 0.6)), sw0 = (w - 0.4) / strips;
  for (let j = 0; j < strips; j++) out.push(slab([x0 + 0.2 + sw0 * (j + 0.5), 2.95, z(0.72)], [sw0, 0.06, 1.5], dir * 0.33, t.stripes[j % 2]));
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
// A street pole with a lamp arm over the road. side points at the road.
const pole = (x, z, side) => [
  cyl([x, 4.6, z], 0.11, 8.9, 'can', A), beam([x, 8.7, z], [x, 9.15, z + side * 2.4], 0.09, 'can', A),
  box([x, 9.15, z + side * 2.7], [0.3, 0.12, 0.7], 'can', A),
  box([x, 9.08, z + side * 2.7], [0.22, 0.04, 0.5], 'lamp', A, { k: 'lens', sw: 'lamps', on: true, gain: 2.4 }),
  box([x + 0.16, 6.3, z - 0.2], [0.04, 0.9, 0.2], 'binGreen', A), box([x + 0.16, 6.3, z], [0.04, 0.9, 0.2], 'white', A), box([x + 0.16, 6.3, z + 0.2], [0.04, 0.9, 0.2], 'tomato', A),
];

const STOP = 30, LANE = -4.3;
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
  const flat = { k: 'ground' };

  /* ---------- ground: a disc of asphalt, the lots on it, the walks ---------- */
  add(cyl([0, -0.225, 0], R, 0.35, 'soil', A, { k: 'plinth', seg: 64 }), cyl([0, -0.7, 0], R - 0.05, 0.6, 'earth', A, { k: 'plinth', seg: 64 }), cyl([0, -1.175, 0], R, 0.35, 'rock', A, { k: 'plinth', seg: 64 }));
  add(cyl([0, -0.025, 0], R, 0.05, 'asphalt', A, { k: 'ground', seg: 64 }));
  // Each lot is a low slab. What the lots leave bare is street and lane.
  d.lots.forEach((l, i) => {
    const ring = cut(l.ring.slice(0, -1));
    if (ring.length >= 3 && area(ring) > 2) add(poly(ring, 0, 0.16, /COMMERCIAL/.test(l.street || '') ? 'lane' : i % 2 ? 'grass' : 'verge', flat));
  });
  const walk = (e0, n0, e1, n1) => { const r = rect(e0, n0, e1, n1); if (r.length >= 3) add(poly(r, 0, 0.15, 'concrete', flat)); };
  walk(LOT_W, -R, KERB_W, WEST_LEG[0]); walk(LOT_W, WEST_LEG[1], KERB_W, R);
  walk(KERB_E, -R, LOT_E, EAST_LEG[0]); walk(KERB_E, EAST_LEG[1], LOT_E, R);
  walk(-R, WEST_LEG[0], KERB_W, WEST_LEG[0] + 3); walk(-R, WEST_LEG[1] - 3, KERB_W, WEST_LEG[1]);
  walk(KERB_E, EAST_LEG[0], R, EAST_LEG[0] + 1.5); walk(KERB_E, EAST_LEG[1] - 1.5, R, EAST_LEG[1]);
  // Road paint is too thin for an ink line.
  const mark = (p, s, c) => box(p, s, c, A, { k: 'ground', noInk: true });
  for (const [x0, x1] of [[-R + 3, WEST_LEG[0] - 2], [EAST_LEG[1] + 2, R - 3]]) {
    add(mark([(x0 + x1) / 2, 0.005, MID - 0.15], [x1 - x0, 0.01, 0.1], 'mustard'), mark([(x0 + x1) / 2, 0.005, MID + 0.15], [x1 - x0, 0.01, 0.1], 'mustard'));
    for (let x = x0 + 2; x < x1 - 2; x += 6) add(mark([x, 0.005, MID - 3.25], [3, 0.01, 0.12], 'white'), mark([x, 0.005, MID + 3.25], [3, 0.01, 0.12], 'white'));
  }
  // Zebra crossings: three over the Drive, one over each leg of the avenue.
  for (const x of [WEST_LEG[0] + 1.5, WEST_LEG[1] - 1.5, EAST_LEG[1] - 0.75]) for (let z = KERB_W + 0.7; z < KERB_E - 0.4; z += 1) add(mark([x, 0.005, z], [2.4, 0.01, 0.5], 'white'));
  for (let x = WEST_LEG[0] + 3.5; x < WEST_LEG[1] - 3; x += 1) add(mark([x, 0.005, LOT_W + 1.4], [0.5, 0.01, 2.4], 'white'));
  for (let x = EAST_LEG[0] + 2; x < EAST_LEG[1] - 1.5; x += 1) add(mark([x, 0.005, LOT_E - 1.4], [0.5, 0.01, 2.4], 'white'));

  /* ---------- buildings: real outlines and heights, cut to the disc ---------- */
  const fronts = [];
  d.b.forEach((b, i) => {
    // The survey outlines take in awnings. A building stops at its lot line.
    const raw = b.ring.slice(0, -1), west = raw.reduce((s, p) => s + p[0], 0) < 0, whole = trim(raw, west ? LOT_W : LOT_E, !west), ring = cut(whole);
    if (ring.length < 3 || area(ring) < 6) return;
    const es = ring.map(p => p[0]), ns = ring.map(p => p[1]), e0 = Math.min(...es), e1 = Math.max(...es), n0 = Math.min(...ns), n1 = Math.max(...ns);
    const cutOff = area(ring) < area(whole) - 0.5, pitched = b.roof !== 'Flat' && !cutOff && b.h > 4;
    if (pitched) {
      // A house: walls to the eave, then a gable roof along its long side.
      const alongX = n1 - n0 > e1 - e0, span = alongX ? e1 - e0 : n1 - n0, long = alongX ? n1 - n0 : e1 - e0;
      const rise = Math.min(b.h * 0.42, span / 2 * Math.tan((b.slope || 30) * Math.PI / 180)), eave = b.h - rise, c = HOUSE[b.id % HOUSE.length], at = [(n0 + n1) / 2, 0.16 + eave, (e0 + e1) / 2];
      add(poly(ring, 0.16, eave, c), { t: 'prism', p: at, s: [span, rise, long], c, L: A, ax: alongX ? 'x' : 'z' },
        { t: 'roof', p: [at[0], at[1], at[2]], s: [span, rise, long + 0.5], over: 0.35, th: 0.16, courses: 4, c: 'roof', L: A, ax: alongX ? 'x' : 'z' });
      return;
    }
    const side = e1 < 0 && e1 > LOT_W - 1 ? 1 : e0 > 0 && e0 < LOT_E + 1 ? -1 : 0, c = WALL[i % WALL.length], h = cutOff && b.roof !== 'Flat' ? b.h * 0.8 : b.h;
    // A flat roof gets a grey cap, so the wall colour stays on the walls.
    add(poly(ring, 0.16, h, side ? c : 'garage'), poly(ring, 0.16 + h, 0.1, 'found'));
    if (side && n1 - n0 > 3.5) fronts.push({ id: b.id, h, side, n0, n1, zf: side > 0 ? LOT_W : LOT_E, c });
  });
  // Neighbours of one height and one building make one frontage.
  const faces = [];
  for (const side of [1, -1]) {
    let last = null;
    for (const p of fronts.filter(f => f.side === side).sort((a, b) => a.n0 - b.n0)) {
      if (last && last.id === p.id && Math.abs(last.h - p.h) < 0.5 && p.n0 < last.x1 + 1) { last.x1 = Math.max(last.x1, p.n1); last.zf = side > 0 ? Math.max(last.zf, p.zf) : Math.min(last.zf, p.zf); continue; }
      last = { ...p, x0: last ? Math.max(p.n0, last.x1) : p.n0, x1: p.n1 };
      if (last.x1 - last.x0 > 3.5) faces.push(last);
    }
  }

  /* ---------- frontages: shops below, windows above, a cornice ---------- */
  let shops = 0;
  faces.forEach((f, fi) => {
    const w = f.x1 - f.x0, dir = f.side, z = o => f.zf + dir * o, mid = (f.x0 + f.x1) / 2;
    // The shop units geocoded to this frontage. Units at the rear are upstairs.
    const units = d.stores.filter(s => Math.sign(s.at[0]) === -dir && Math.abs(s.at[0]) < 38 && s.at[1] >= f.x0 - 1 && s.at[1] <= f.x1 + 1).sort((a, b) => +b.civic - +a.civic);
    const cats = (units.length ? units.map(u => u.cat) : ['Service Commercial']).slice(0, Math.max(1, Math.floor(w / 3.6)));
    cats.forEach((cat, k) => {
      const x0 = f.x0 + w * k / cats.length, x1 = f.x0 + w * (k + 1) / cats.length;
      add(shop(shops, x0, x1, f.zf, cat, dir));
      pokes.push({ id: 'shop' + shops, at: [(x0 + x1) / 2, 3.3, z(0.3)], r: 1.8 });
      acts['shop' + shops] = [['flip', 'shop' + shops, true]];
      shops++;
    });
    add(box([mid, 0.16 + f.h - 0.1, z(0.1)], [w + 0.2, 0.45, 0.35], 'cream', A), box([mid, 4.3, z(0.06)], [w, 0.2, 0.14], 'cream', A));
    // Upper windows: a row for each floor that fits.
    const cols = Math.max(1, Math.round(w / 2.7));
    let any = false;
    for (let y = 5.7; y < f.h - 1.2; y += 3) for (let j = 0; j < cols; j++) {
      const x = f.x0 + w * (j + 0.5) / cols, lit = (j * 7 + Math.round(y) + fi) % 3 !== 0;
      any ||= lit;
      add(box([x, y, z(0.03)], [1.36, 1.76, 0.06], 'cream', A), box([x, y, z(0.06)], [1.1, 1.5, 0.05], lit ? 'glass' : 'glassDark', A, lit ? { k: 'pane', sw: 'up' + fi, on: true } : {}));
    }
    if (any) pokes.push({ id: 'up' + fi, at: [mid, 5.7, z(0.2)], r: 2.2 });
  });

  /* ---------- street: trees and poles from the records ---------- */
  for (const t of d.trees) if (Math.hypot(...t.at) < R - 2.5 && t.h) add(tree(t.at[1], t.at[0], Math.min(t.h, 15), t.d, t.name));
  const lights = [];
  for (const [e, n] of d.poles) {
    if (Math.hypot(e, n) > R - 3 || Math.abs(e) > 12.5 || Math.abs(e) < 6) continue;
    const side = e < 0 ? 1 : -1;
    // Two poles can stand two metres apart: one lamp arm is enough.
    if (lights.some(l => Math.abs(l[0] - n) < 6 && l[2] === side)) continue;
    add(pole(n, e, side)); lights.push([n, e, side]);
    // A span wire crosses the street at each west pole and carries the trolley wires.
    if (side > 0) W.push({ a: [n, 6.1, e], b: [n, 6.1, KERB_E + 0.4], sag: 0.15, clip: 999 });
  }
  // Two pairs of trolley wires: one pair for each way.
  for (const z of [LANE - 0.3, LANE + 0.3, MID + 4.2, MID + 4.8]) W.push({ a: [-R - 2, 5.7, z], b: [R + 2, 5.7, z], sag: 0.1, clip: Math.sqrt(R * R - z * z) - 0.3 });

  /* ---------- life on the street ---------- */
  add(bus(LANE), car(-34, KERB_W + 1.3, 'tomato'), car(12, KERB_W + 1.3, 'mustard'), car(46, KERB_W + 1.3, 'binBlue'), car(-9, KERB_E - 1.3, 'hydrangea'), car(26, KERB_E - 1.3, 'cream'), car(-40, KERB_E - 1.3, 'binGreen'));
  // Paper boxes and a bench at the north-west corner, a fruit stand at the grocer.
  add([['binBlue', 0], ['tomato', 0.7], ['mustard', 1.4]].map(([c, dx]) => box([WEST_LEG[1] + 1.4 + dx, 0.7, KERB_W - 0.8], [0.5, 1.1, 0.45], c, A)));
  add(box([WEST_LEG[1] + 6, 0.6, KERB_W - 0.9], [1.8, 0.1, 0.5], 'cedar', A), box([WEST_LEG[1] + 5.3, 0.38, KERB_W - 0.9], [0.1, 0.45, 0.5], 'can', A), box([WEST_LEG[1] + 6.7, 0.38, KERB_W - 0.9], [0.1, 0.45, 0.5], 'can', A));
  const grocer = d.stores.find(s => s.cat === 'Convenience Goods' && s.at[0] < 0 && s.at[0] > -38 && Math.hypot(...s.at) < R - 8 && s.at[1] > 0);
  if (grocer) {
    const gx = grocer.at[1] - 1, gz = LOT_W + 0.6;
    add([0, 1, 2].map(i => box([gx + i * 1.1, 0.55, gz], [1, 0.5, 0.7], 'cedar', A)));
    add(on('fruit', [gx + 1.1, 0.8, gz], [0, 1, 2].flatMap(i => [0, 1, 2, 3, 4, 5].map(j => blob([gx + i * 1.1 - 0.3 + (j % 3) * 0.3, 0.88, gz - 0.15 + Math.floor(j / 3) * 0.3], 0.14, ['tomato', 'mustard', 'binGreen'][i], A)))));
    pokes.push({ id: 'fruit', at: [gx + 1.1, 0.9, gz], r: 1.6 });
  }
  const near = lights.slice().sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]));
  pokes.push({ id: 'bus', at: [STOP, 2, LANE], r: 3.5 }, { id: 'lamps', at: near[0] ? [near[0][0], 9.1, near[0][1] + near[0][2] * 2.7] : [0, 9, 0], r: 1.3 });

  return {
    PARTS: P, WIRES: W, POKES: pokes,
    MOVES: {
      // The bus leaves south, then comes back in from the north edge.
      bus: (g, k) => {
        const far = R + 8, u = k < 0.5 ? k / 0.5 : (k - 0.5) / 0.5, x = k < 0.5 ? STOP - (far + STOP) * u * u : far - (far - STOP) * (1 - (1 - u) * (1 - u));
        // It pops out of sight where the disc ends.
        const s = Math.min(1, Math.max(0, (R - 5 - Math.abs(x)) / 4));
        g.position.x = x; g.visible = s > 0.01; g.scale.setScalar(Math.max(s, 0.01));
      },
      fruit: (g, k, h) => { g.position.y = h[1] + 0.5 * k; g.rotation.y = 0.6 * Math.sin(k * 9.4); },
    },
    ACTS: { ...acts, bus: [['run', 'bus', 14]], fruit: [['pulse', 'fruit', 0.15, 0, 0.7, 'bounce.out']], lamps: [['flip', 'lamps', true]] },
    LAMPS: near.slice(0, 3).map(([x, z, side]) => ({ col: [0.86, 0.14, 65], at: [x, 9, z + side * 2.7], to: [x, 0, z + side * 2], power: 700, range: 26, of: 'sw:lamps' })),
    SUN: { target: [0, 3, 0], half: [R + 10, R + 10] },
  };
}

// The credit line the licence asks for. The page shows it on the Drive.
export const CREDIT = 'Contains information licensed under the Open Government Licence – Vancouver.';
