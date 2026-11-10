// East Van: one 33 ft house lot as plain data.
// Units are metres. x runs right, y runs up, z runs to the street.
// town.js builds the 3D scene from this file.

// Colours are OKLCH: [L, C, h].
export const COL = {
  teal: [0.6, 0.1, 195], cream: [0.94, 0.035, 90], tomato: [0.62, 0.19, 30], mustard: [0.78, 0.13, 85],
  roof: [0.32, 0.03, 285], concrete: [0.72, 0.012, 90], found: [0.46, 0.035, 250], deck: [0.55, 0.04, 60],
  brick: [0.5, 0.12, 35], glass: [0.88, 0.12, 82], glassDark: [0.4, 0.05, 250], lamp: [0.96, 0.1, 88],
  grass: [0.58, 0.12, 142], verge: [0.64, 0.13, 136], hedge: [0.46, 0.1, 152], hydrangea: [0.7, 0.12, 300],
  asphalt: [0.36, 0.015, 270], kerb: [0.8, 0.01, 90], earth: [0.3, 0.04, 50],
  trunk: [0.36, 0.04, 40], blossom: [0.85, 0.085, 355], blossom2: [0.77, 0.115, 350],
  wood: [0.42, 0.05, 55], can: [0.62, 0.012, 250], wire: [0.2, 0.02, 270],
  hall: [0.82, 0.13, 68], tomatoDark: [0.55, 0.18, 30], brass: [0.76, 0.12, 85], soil: [0.25, 0.035, 55], rock: [0.4, 0.02, 270],
  binGreen: [0.5, 0.12, 150], binGrey: [0.34, 0.012, 260], binBlue: [0.52, 0.14, 255], crow: [0.17, 0.02, 280],
};

// The paper theatre stands one flat at each depth.
export const LAYERS = [
  { name: 'house', z: -1.5 }, { name: 'porch', z: 0.45 }, { name: 'yard', z: 3 },
  { name: 'street', z: 6.2 }, { name: 'road', z: 8.8 },
];
const HOUSE = 0, PORCH = 1, YARD = 2, STREET = 3, ROAD = 4;

const box = (p, s, c, L, o = {}) => ({ t: 'box', p, s, c, L, ...o });
const cyl = (p, r, h, c, L, o = {}) => ({ t: 'cyl', p, r, h, c, L, ...o });
const blob = (p, r, c, L, o = {}) => ({ t: 'blob', p, r, c, L, ...o });
// A window is a cream frame with a pane in front of it.
const win = (x, y, w, h, z, L, lit = true) => [
  box([x, y, z], [w + 0.26, h + 0.26, 0.08], 'cream', L, { k: 'frame' }),
  box([x, y, z + 0.04], [w, h, 0.06], lit ? 'glass' : 'glassDark', L, { k: 'pane', lit }),
  box([x, y - h / 2 + h * 0.62, z + 0.08], [w, 0.06, 0.04], 'cream', L, { k: 'mullion' }),
  ...(w > 0.6 ? [box([x, y, z + 0.08], [0.06, h, 0.04], 'cream', L, { k: 'mullion' })] : []),
];
// The same window on a side wall. The paper theatre skips it.
const sideWin = (x, y, z, d, h, lit) => [
  box([x, y, z], [0.08, h + 0.26, d + 0.26], 'cream', HOUSE, { k: 'frame', side: true }),
  box([x + Math.sign(x) * 0.04, y, z], [0.06, h, d], lit ? 'glass' : 'glassDark', HOUSE, { k: 'pane', lit, side: true }),
  box([x + Math.sign(x) * 0.08, y - h / 2 + h * 0.62, z], [0.04, 0.06, d], 'cream', HOUSE, { k: 'mullion', side: true }),
];
// Tilted boards on a wall: each row throws its own ink line.
const boards = (face, at, out, a, b, y0, y1, h, c, o = {}) => ({ t: 'boards', face, at, out, a, b, y0, y1, h, c, L: HOUSE, ...o });
const beam = (a, b, w, c, L) => ({ t: 'beam', a, b, w, c, L });
const steps = [0, 1, 2, 3, 4].map(i => {
  const top = 1.2 - 0.2 * i;
  return box([1.8, (0.2 + top) / 2, 0.65 + 0.3 * i], [1.7, top - 0.2, 0.3], 'concrete', PORCH, { k: 'step' });
});
// A wheeled bin: a body and a lid that turns on its back edge.
const bin = (x, c, id) => [
  box([x, 0.72, 2.9], [0.62, 1, 0.72], c, YARD, { k: 'bin' }),
  box([x, 1.26, 2.9], [0.7, 0.08, 0.8], c, YARD, { k: 'lid', dyn: id, hinge: [x, 1.22, 2.5] }),
];

// The porch lamp hangs beside the door, clear of the posts.
const LAMP = [2.78, 3.45, -1.38];

export const PARTS = [
  // Ground. The paper theatre draws each slab as a band under its flat.
  // under is the height where a second band starts on the paper.
  box([0, -0.225, -0.5], [14, 0.35, 21], 'soil', HOUSE, { k: 'plinth' }),
  box([0, -0.7, -0.5], [13.9, 0.6, 20.9], 'earth', HOUSE, { k: 'plinth' }),
  box([0, -1.175, -0.5], [14, 0.35, 21], 'rock', HOUSE, { k: 'plinth' }),
  box([0, 0.1, -3.5], [14, 0.2, 15], 'grass', HOUSE, { k: 'ground' }),
  ...[-6, -4, -2, 0, 2, 4, 6].map(x => box([x, 0.075, 4.7], [1.96, 0.15, 1.4], 'concrete', STREET, { k: 'ground' })),
  box([0, 0.075, 6.1], [14, 0.15, 1.4], 'verge', STREET, { k: 'ground', under: -0.4 }),
  box([0, 0.075, 6.9], [14, 0.15, 0.2], 'kerb', ROAD, { k: 'ground' }),
  box([0, -0.025, 8.5], [14, 0.05, 3], 'asphalt', ROAD, { k: 'ground', under: -0.05 }),

  // House: a front gable on a raised basement.
  box([0, 0.8, -5.75], [7, 1.2, 8.5], 'found', HOUSE, { k: 'found' }),
  box([0, 2.9, -5.75], [7, 3, 8.5], 'teal', HOUSE, { k: 'wall' }),
  { t: 'prism', p: [0, 4.4, -5.75], s: [7, 2.9, 8.5], c: 'mustard', L: HOUSE, k: 'gable' },
  boards('z', -1.5, 1, -3.5, 3.5, 1.4, 4.4, 0.25, 'teal'),
  boards('x', 3.5, 1, -10, -1.5, 1.4, 4.4, 0.25, 'teal'), boards('x', -3.5, -1, -10, -1.5, 1.4, 4.4, 0.25, 'teal'),
  boards('z', -1.5, 1, -3.5, 3.5, 4.4, 7.3, 0.29, 'mustard', { tri: true }),
  box([-1.9, 6.8, -6.5], [0.7, 2.4, 0.7], 'brick', HOUSE, { k: 'chimney' }),
  box([-1.9, 8.06, -6.5], [0.92, 0.12, 0.92], 'concrete', HOUSE, { k: 'cap' }),
  { t: 'roof', p: [0, 4.4, -5.7], s: [7, 2.9, 9.4], over: 0.5, th: 0.22, courses: 8, c: 'roof', L: HOUSE, k: 'roof' },
  // Barge boards trim the front edge of the roof.
  { t: 'roof', p: [0, 4.18, -1.02], s: [7, 2.9, 0.1], over: 0.5, th: 0.2, c: 'cream', L: HOUSE, k: 'barge' },
  box([3.62, 2.3, -1.62], [0.09, 3.9, 0.09], 'cream', HOUSE, { k: 'downspout' }),
  ...win(-1.6, 3, 2.2, 1.5, -1.46, HOUSE),
  ...win(0, 5.45, 1, 1, -1.46, HOUSE, false),
  // The door frame is three pieces, so the open door shows the hall.
  box([1.225, 2.5, -1.46], [0.15, 2.3, 0.08], 'cream', HOUSE, { k: 'frame' }),
  box([2.375, 2.5, -1.46], [0.15, 2.3, 0.08], 'cream', HOUSE, { k: 'frame' }),
  box([1.8, 3.575, -1.46], [1.3, 0.15, 0.08], 'cream', HOUSE, { k: 'frame' }),
  box([1.8, 2.45, -1.455], [1, 2.1, 0.04], 'hall', HOUSE, { k: 'pane', lit: true }),
  ...[
    box([1.8, 2.45, -1.4], [1, 2.1, 0.06], 'tomato', HOUSE, { k: 'door' }),
    box([1.8, 3, -1.365], [0.5, 0.6, 0.03], 'glass', HOUSE, { k: 'pane', lit: true }),
    box([1.8, 1.95, -1.365], [0.7, 0.75, 0.03], 'tomatoDark', HOUSE, { k: 'panel' }),
    blob([2.2, 2.4, -1.34], 0.05, 'brass', HOUSE, { k: 'knob' }),
  ].map(q => ({ ...q, dyn: 'door', hinge: [1.3, 2.45, -1.4] })),
  box([2.78, 2.55, -1.37], [0.32, 0.2, 0.12], 'binGrey', HOUSE, { k: 'mailbox' }),
  box(LAMP, [0.2, 0.28, 0.16], 'lamp', HOUSE, { k: 'lamp', id: 'lamp', poke: 'light' }),
  ...sideWin(3.56, 3, -4, 1.2, 1.4, true), ...sideWin(3.56, 3, -7.6, 1.2, 1.4, false),
  ...sideWin(-3.56, 3, -4, 1.2, 1.4, false), ...sideWin(-3.56, 3, -7.6, 1.2, 1.4, true),

  // Porch: a deck, three posts, a flat roof and five steps.
  box([0, 0.75, 0.47], [7, 1.1, 0.06], 'found', PORCH, { k: 'lattice' }),
  box([0, 1.3, -0.5], [7.1, 0.2, 2.1], 'deck', PORCH, { k: 'deck' }),
  box([0, 4.2, -0.4], [7.6, 0.22, 2.6], 'roof', PORCH, { k: 'porchroof' }),
  box([0, 4, 0.86], [7.5, 0.2, 0.08], 'cream', PORCH, { k: 'trim' }),
  ...[-3.3, 0.8, 3.3].map(x => box([x, 2.65, 0.35], [0.24, 2.5, 0.24], 'cream', PORCH, { k: 'post' })),
  box([-1.25, 2.3, 0.4], [4.1, 0.09, 0.09], 'cream', PORCH, { k: 'rail' }),
  { t: 'pickets', a: -3.1, b: 0.6, at: 0.4, y: 1.4, h: 0.9, n: 15, w: 0.07, c: 'cream', L: PORCH, k: 'baluster' },
  box([2.98, 2.3, 0.4], [0.64, 0.09, 0.09], 'cream', PORCH, { k: 'rail' }),
  { t: 'pickets', a: 2.82, b: 3.12, at: 0.4, y: 1.4, h: 0.9, n: 2, w: 0.07, c: 'cream', L: PORCH, k: 'baluster' },
  ...[-3.3, 3.3].flatMap(x => [
    box([x, 2.3, -0.55], [0.09, 0.09, 1.8], 'cream', PORCH, { k: 'rail', side: true }),
    { t: 'pickets', ax: 'z', a: -1.35, b: 0.15, at: x, y: 1.4, h: 0.9, n: 7, w: 0.07, c: 'cream', L: PORCH, k: 'baluster', side: true },
  ]),
  ...steps,
  // Stair rails: a sloped rail and a newel post on each side.
  ...[0.92, 2.68].flatMap(x => [
    beam([x, 2.3, 0.45], [x, 1.3, 2.05], 0.09, 'cream', PORCH),
    box([x, 0.75, 2.05], [0.14, 1.1, 0.14], 'cream', PORCH, { k: 'newel' }),
  ]),

  // Yard: shrubs, a picket fence, a path, two bins and a blue box.
  blob([-2.6, 0.85, 1.3], 0.75, 'hedge', YARD), blob([-1.4, 0.7, 1.5], 0.6, 'hedge', YARD),
  blob([-0.4, 0.66, 1.3], 0.5, 'hydrangea', YARD), blob([3.25, 0.7, 1.2], 0.55, 'hedge', YARD),
  box([1.8, 0.205, 3.15], [1.3, 0.02, 1.7], 'concrete', YARD, { k: 'path' }),
  { t: 'pickets', a: -6.8, b: 1, at: 3.9, y: 0.2, h: 0.85, n: 30, w: 0.12, c: 'cream', L: YARD, k: 'fence' },
  box([-2.9, 0.75, 3.86], [7.9, 0.07, 0.05], 'cream', YARD, { k: 'rail' }),
  ...bin(3.95, 'binGreen', 'lidA'), ...bin(4.75, 'binGrey', 'lidB'),
  box([3.2, 0.4, 3.35], [0.55, 0.36, 0.42], 'binBlue', YARD, { k: 'bluebox' }),

  // Street: a cherry tree in bloom, a power pole and its wires.
  cyl([-5, 1.75, 6.1], 0.17, 3.2, 'trunk', STREET, { k: 'trunk' }),
  blob([-5, 4.9, 6.1], 1.6, 'blossom', STREET, { k: 'crown' }), blob([-6.1, 4.2, 6], 1.1, 'blossom2', STREET, { k: 'crown' }),
  blob([-3.95, 4.3, 6.3], 1.15, 'blossom2', STREET, { k: 'crown' }), blob([-4.7, 6, 6], 1, 'blossom', STREET, { k: 'crown' }),
  blob([-5.8, 5.4, 6.3], 0.85, 'blossom', STREET, { k: 'crown' }),
  cyl([3.9, 4.65, 6.2], 0.13, 9, 'wood', STREET, { k: 'pole' }),
  box([3.9, 8.5, 6.2], [0.14, 0.14, 2.4], 'wood', STREET, { k: 'arm', span: 1.5 }),
  box([3.9, 7.6, 6.2], [0.12, 0.12, 1.6], 'wood', STREET, { k: 'arm', span: 1 }),
  cyl([4.27, 6.7, 6.2], 0.27, 0.8, 'can', STREET, { k: 'can' }),
];

// Wires hang between two points. ey lifts a wire on the flat paper only.
const span = (id, y, z, ey) => [
  { id: id + 'a', a: [-12, y + 0.3, z], b: [3.9, y, z], sag: 0.75, ey, L: STREET },
  { id: id + 'b', a: [3.9, y, z], b: [12, y + 0.2, z], sag: 0.5, ey, L: STREET },
];
export const WIRES = [
  ...span('top', 8.6, 6.2, 0), ...span('left', 8.6, 5.1, -0.16), ...span('right', 8.6, 7.3, 0.16),
  ...span('low', 7.68, 5.5, -0.1), ...span('low2', 7.68, 6.9, 0.1),
  { id: 'drop', a: [3.9, 7.6, 6.2], b: [1.7, 5.9, -1.3], sag: 0.35, ey: 0, L: PORCH },
];
// The height of a wire at x: a parabola between its ends.
export function wireY(w, x) {
  const t = (x - w.a[0]) / (w.b[0] - w.a[0]);
  return w.a[1] + (w.b[1] - w.a[1]) * t - w.sag * 4 * t * (1 - t);
}

// The crow sits on the top wire.
const perch = WIRES[0];
export const CROW = { home: [-0.4, wireY(perch, -0.4), perch.a[2]], L: STREET };

// Poke targets: a point and a reach, in metres.
export const POKES = [
  { id: 'light', at: LAMP, r: 0.55, L: HOUSE },
  { id: 'crow', at: CROW.home, r: 0.7, L: STREET },
  { id: 'lidA', at: [3.95, 1, 2.9], r: 0.55, L: YARD },
  { id: 'lidB', at: [4.75, 1, 2.9], r: 0.55, L: YARD },
  { id: 'door', at: [1.8, 2.3, -1.4], r: 0.8, L: HOUSE },
];
