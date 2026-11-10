// East Van: the alley zone as plain data. It lies behind the house lot.
// From the house back wall (z -10): backyard, garage, lane, the far fence.
// The lane runs along x at z -22.5 to -26.5.
import { box, cyl, blob, beam, boards } from './lot.js';

const A = 0;
const ground = (p, s, c) => box(p, s, c, A, { k: 'ground' });
// A board fence: wide boards with a hair of gap, so each board inks.
const fence = (ax, a, b, at, h = 1.7, c = 'cedar', o = {}) => ({ t: 'pickets', ax, a, b, at, y: 0.2, h, n: Math.round(Math.abs(b - a) / 0.46) + 1, w: 0.44, d: 0.05, c, L: A, k: 'fence', ...o });
// A side fence is one long panel with posts: boards moire at a low angle.
const panel = (x, z0, z1, n = Math.round((z1 - z0) / 2.4)) => [
  box([x, 1.0, (z0 + z1) / 2], [0.05, 1.6, z1 - z0], 'cedar', A, { k: 'fence' }), box([x, 1.84, (z0 + z1) / 2], [0.12, 0.08, z1 - z0], 'cedar', A),
  ...Array.from({ length: n + 1 }, (_, i) => box([x, 1.05, z0 + (z1 - z0) * i / n], [0.14, 1.75, 0.14], 'cedar', A)),
];
const on = (dyn, hinge, parts) => parts.map(q => ({ ...q, dyn, hinge }));
// A lane bin. The lid turns on its fence-side edge.
const bin = (x, c, id) => [
  box([x, 0.57, -22.78], [0.62, 1, 0.72], c, A, { k: 'bin' }),
  box([x, 1.11, -22.78], [0.7, 0.08, 0.8], c, A, { k: 'lid', dyn: id, hinge: [x, 1.07, -22.38] }),
];
const backSteps = [0, 1, 2, 3].map(i => box([-1.5, (0.2 + 1.15 - 0.25 * i) / 2, -11.55 - 0.3 * i], [1.5, 0.95 - 0.25 * i, 0.3], 'concrete', A, { k: 'step' }));
const legs = [0, 1, 2, 3, 4, 5].map(i => box([-3.6 + Math.cos(i * 1.047) * 1.45, 0.47, -14.5 + Math.sin(i * 1.047) * 1.45], [0.07, 0.55, 0.07], 'chrome', A));

export const PARTS = [
  // Ground: backyard grass, the garage slab, the lane, the far verge.
  ground([0, 0.1, -16.75], [14, 0.2, 11.5], 'grass'),
  ground([3.5, 0.11, -19.75], [5.8, 0.22, 5.5], 'concrete'),
  ground([0, 0, -24.5], [14, 0.1, 4], 'lane'),
  ground([0, 0.06, -27.5], [14, 0.22, 2], 'verge'),

  // The back of the house: boards, shingles, a door, a kitchen window.
  boards('z', -10, -1, -3.5, 3.5, 1.4, 4.4, 0.25, 'teal'),
  boards('z', -10, -1, -3.5, 3.5, 4.4, 7.3, 0.29, 'mustard', { tri: true }),
  { t: 'roof', p: [0, 4.18, -10.38], s: [7, 2.9, 0.1], over: 0.5, th: 0.2, c: 'cream', L: A, k: 'barge' },
  box([-1.5, 2.5, -10.04], [1.25, 2.3, 0.08], 'cream', A, { k: 'frame' }),
  box([-1.5, 2.45, -10.09], [0.95, 2.1, 0.06], 'mustard', A, { k: 'door' }),
  blob([-1.88, 2.4, -10.14], 0.05, 'brass', A),
  box([-1.5, 0.8, -10.7], [1.9, 1.2, 1.4], 'deck', A, { k: 'stoop' }),
  ...backSteps,
  box([1.8, 3, -10.04], [1.86, 1.56, 0.08], 'cream', A, { k: 'frame' }),
  box([1.8, 3, -10.08], [1.6, 1.3, 0.06], 'glass', A, { k: 'pane', sw: 'wBack', on: true }),
  box([1.8, 3, -10.12], [0.06, 1.3, 0.04], 'cream', A), box([1.8, 3.15, -10.12], [1.6, 0.06, 0.04], 'cream', A),

  // Raised beds. The greens are movers: a poke makes them wiggle.
  ...[['kale1', -12.3, 'kale'], ['kale2', -14.3, 'hedge']].flatMap(([id, z, c]) => [
    box([4.6, 0.38, z], [2.6, 0.36, 1.2], 'cedar', A), box([4.6, 0.57, z], [2.4, 0.04, 1], 'soil', A),
    ...on(id, [4.6, 0.59, z], [0, 1, 2, 3].flatMap(i => [
      blob([3.7 + i * 0.6, 0.8, z + (i % 2 ? 0.12 : -0.12)], 0.25, c, A),
      ...(id === 'kale2' ? [blob([3.82 + i * 0.6, 0.95, z - 0.1], 0.08, 'tomato', A)] : []),
    ])),
  ]),

  // A trampoline with a ball on it.
  cyl([-3.6, 0.75, -14.5], 1.5, 0.04, 'tyre', A), { t: 'ring', p: [-3.6, 0.77, -14.5], r: 1.5, tube: 0.08, c: 'binBlue', L: A },
  ...legs,
  ...on('tramp', [-3.6, 0.97, -14.5], [blob([-3.6, 0.97, -14.5], 0.2, 'tomato', A)]),

  // Cedar fences down both sides, and across the back with a gate.
  ...panel(-6.85, -22.25, -10.1), ...panel(6.85, -17, -10.1),
  fence('x', -6.7, -3.25, -22.25), fence('x', -1.55, 0.45, -22.25),
  box([-3.1, 1.1, -22.25], [0.14, 1.9, 0.14], 'cedar', A), box([-1.7, 1.1, -22.25], [0.14, 1.9, 0.14], 'cedar', A),
  ...on('backgate', [-3.03, 1.05, -22.25], [fence('x', -2.82, -1.9, -22.25), box([-2.4, 1.5, -22.29], [1.2, 0.08, 0.04], 'cedar', A), box([-2.4, 0.6, -22.29], [1.2, 0.08, 0.04], 'cedar', A)]),

  // The garage: a low gable, a mural on the yard wall, a hoop over the door.
  box([3.5, 1.55, -19.75], [5.8, 2.7, 5.5], 'garage', A, { k: 'wall' }),
  { t: 'prism', p: [3.5, 2.9, -19.75], s: [5.8, 0.9, 5.5], c: 'garage', L: A },
  { t: 'roof', p: [3.5, 2.9, -19.75], s: [5.8, 0.9, 6], over: 0.3, th: 0.14, courses: 5, c: 'roof', L: A },
  cyl([0.585, 1.95, -19.1], 0.75, 0.02, 'mustard', A, { ax: 'x' }),
  cyl([0.58, 0.22, -20.7], 1.5, 0.02, 'tomato', A, { ax: 'x' }), cyl([0.575, 0.22, -18.2], 1.15, 0.02, 'blossom2', A, { ax: 'x' }),
  cyl([0.57, 0.22, -21.6], 0.85, 0.02, 'binBlue', A, { ax: 'x' }),
  // Behind the door: a lit band room, drawn as flat shapes.
  box([3.5, 1.27, -22.515], [3, 2.1, 0.02], 'hall', A, { k: 'pane', glow: true }),
  cyl([3.3, 0.62, -22.535], 0.38, 0.01, 'crow', A, { ax: 'z' }), cyl([2.65, 0.95, -22.535], 0.2, 0.01, 'crow', A, { ax: 'z' }),
  box([2.65, 0.5, -22.535], [0.04, 0.6, 0.01], 'crow', A), box([3.95, 0.9, -22.535], [0.04, 1.4, 0.01], 'crow', A),
  box([3.95, 1.6, -22.535], [0.6, 0.04, 0.01], 'crow', A), box([4.55, 0.78, -22.535], [0.7, 1.1, 0.01], 'crow', A),
  box([1.92, 1.3, -22.56], [0.16, 2.2, 0.06], 'cream', A), box([5.08, 1.3, -22.56], [0.16, 2.2, 0.06], 'cream', A),
  box([3.5, 2.4, -22.56], [3.32, 0.16, 0.06], 'cream', A),
  // The door is four panels. They roll up toward the hinge at the top.
  ...on('garage', [3.5, 2.32, -22.57], [0, 1, 2, 3].map(i => box([3.5, 0.47 + 0.525 * i, -22.57], [3, 0.5, 0.05], 'white', A))),
  box([3.5, 3.2, -22.6], [1.2, 0.8, 0.05], 'white', A), { t: 'ring', p: [3.5, 2.95, -22.88], r: 0.23, tube: 0.025, c: 'tomato', L: A },
  box([5.9, 2.72, -22.56], [0.26, 0.16, 0.1], 'lamp', A, { k: 'lens', sw: 'sensor', on: false, gain: 2.4 }),

  // The lane: a pole with a lamp, two bins, puddles, a free couch and a TV.
  cyl([-5.9, 4.6, -23.9], 0.13, 9, 'wood', A),
  box([-5.9, 8.5, -23.9], [0.14, 0.14, 2.4], 'wood', A), box([-5.9, 7.6, -23.9], [0.12, 0.12, 1.6], 'wood', A),
  beam([-5.9, 7.05, -24], [-4.5, 7.5, -24.6], 0.08, 'can', A),
  box([-4.3, 7.5, -24.7], [0.6, 0.12, 0.28], 'can', A),
  box([-4.3, 7.43, -24.7], [0.44, 0.04, 0.2], 'lamp', A, { k: 'lens', sw: 'lane', on: true, gain: 2.4 }),
  ...bin(-5.3, 'binGreen', 'lidC'), ...bin(-4.5, 'binGrey', 'lidD'),
  // A raccoon waits inside the green bin.
  ...on('raccoon', [-5.3, 0.75, -22.78], [
    blob([-5.3, 0.85, -22.78], 0.17, 'raccoon', A), blob([-5.41, 1.01, -22.78], 0.05, 'raccoon', A), blob([-5.19, 1.01, -22.78], 0.05, 'raccoon', A),
    box([-5.3, 0.88, -22.93], [0.27, 0.07, 0.04], 'crow', A), blob([-5.3, 0.81, -22.95], 0.06, 'white', A),
    { ...blob([-5.36, 0.89, -22.955], 0.025, 'lamp', A), glow: true }, { ...blob([-5.24, 0.89, -22.955], 0.025, 'lamp', A), glow: true },
  ]),
  cyl([-0.5, 0.056, -24.7], 0.8, 0.012, 'puddle', A), cyl([4.9, 0.056, -25.4], 0.55, 0.012, 'puddle', A),
  ...on('puddle', [-0.5, 0.07, -24.7], [{ t: 'ring', p: [-0.5, 0.07, -24.7], r: 0.4, tube: 0.02, c: 'white', L: A }]),
  box([-0.6, 0.37, -22.95], [1.7, 0.34, 0.7], 'deck', A), box([-0.6, 0.75, -22.62], [1.7, 0.6, 0.16], 'deck', A),
  box([-1.37, 0.55, -22.95], [0.16, 0.5, 0.7], 'deck', A), box([0.17, 0.55, -22.95], [0.16, 0.5, 0.7], 'deck', A),
  box([1.25, 0.33, -22.85], [0.62, 0.55, 0.5], 'binGrey', A),
  box([1.25, 0.36, -23.11], [0.48, 0.38, 0.02], 'bulbTeal', A, { k: 'pane', sw: 'tv', on: false, gain: 1.8 }),

  // The far side stays low, so the camera sees the lane over it.
  fence('x', 4.2, 6.7, -27.2, 1.1),
  ...[[-6.2, 0.6], [-4.9, 0.45], [-2.6, 0.7], [-1.5, 0.5], [0.8, 0.65], [2.4, 0.5], [3.4, 0.4]].map(([x, r]) => blob([x, 0.17 + r * 0.7, -27.2], r, 'hedge', A)),
];

// The lane wires run along x on the lane pole. One drop feeds the house.
const span = (y, z) => [
  { a: [-12, y + 0.3, z], b: [-5.9, y, z], sag: 0.4 },
  { a: [-5.9, y, z], b: [12, y + 0.35, z], sag: 0.9 },
];
export const WIRES = [
  ...span(8.6, -23.9), ...span(8.6, -25), ...span(8.6, -22.8), ...span(7.68, -23.3), ...span(7.68, -24.5),
  { a: [-5.9, 7.6, -23.9], b: [-1, 6.3, -10.42], sag: 0.6 },
];

export const POKES = [
  { id: 'wBack', at: [1.8, 3, -10.1], r: 0.8 }, { id: 'kale1', at: [4.6, 0.8, -12.3], r: 0.7 }, { id: 'kale2', at: [4.6, 0.8, -14.3], r: 0.7 },
  { id: 'tramp', at: [-3.6, 1, -14.5], r: 1.1 }, { id: 'backgate', at: [-2.4, 1.1, -22.25], r: 0.7 },
  { id: 'garage', at: [3.5, 1.3, -22.6], r: 1.4 }, { id: 'sensor', at: [5.9, 2.72, -22.6], r: 0.45 },
  { id: 'lane', at: [-4.3, 7.45, -24.7], r: 0.6 }, { id: 'lidC', at: [-5.3, 0.9, -22.8], r: 0.5 }, { id: 'lidD', at: [-4.5, 0.9, -22.8], r: 0.5 },
  { id: 'puddle', at: [-0.5, 0.1, -24.7], r: 0.8 }, { id: 'tv', at: [1.25, 0.4, -23.1], r: 0.45 },
];

export const MOVES = {
  kale1: (g, k) => { g.scale.set(1 + 0.25 * k, 1 - 0.3 * k, 1 + 0.25 * k); g.rotation.y = 0.5 * Math.sin(k * 9.4); },
  kale2: (g, k) => { g.scale.set(1 + 0.25 * k, 1 - 0.3 * k, 1 + 0.25 * k); g.rotation.y = 0.5 * Math.sin(k * 9.4); },
  tramp: (g, k, h) => { g.position.y = h[1] + 2.6 * k; },
  backgate: (g, k) => { g.rotation.y = -1.3 * k; },
  // The door rolls up: it shrinks toward its top edge.
  garage: (g, k) => { g.scale.y = 1 - 0.94 * k; },
  lidC: (g, k) => { g.rotation.x = 1.9 * k; },
  lidD: (g, k) => { g.rotation.x = 1.9 * k; },
  raccoon: (g, k, h) => { g.position.y = h[1] + 0.42 * k; },
  // A ripple: the ring grows and thins out.
  puddle: (g, k) => { g.visible = k > 0.01 && k < 0.99; g.scale.set(0.3 + 1.6 * k, 1 - k, 0.3 + 1.6 * k); },
};

const wiggle = id => [['pulse', id, 0.12, 0, 0.9, 'elastic.out(1, 0.3)']];
export const ACTS = {
  kale1: wiggle('kale1'), kale2: wiggle('kale2'),
  tramp: [['pulse', 'tramp', 0.38, 0, 1.5, 'bounce.out']],
  backgate: [['swing', 'backgate', { duration: 0.9, ease: 'elastic.out(1, 0.5)' }, { duration: 0.5, ease: 'power2.in' }]],
  garage: [['swing', 'garage', { duration: 1.3, ease: 'power1.inOut' }, { duration: 1, ease: 'power1.inOut' }]],
  sensor: [['flip', 'sensor', true]], lane: [['flip', 'lane', true]], tv: [['flip', 'tv', true]],
  lidC: [['pulse', 'lidC', 0.2, 1.4, 0.5, 'bounce.out'], ['pulse', 'raccoon', 0.4, 1, 0.3, 'power2.in']],
  lidD: [['pulse', 'lidD', 0.2, 0.25, 0.6, 'bounce.out']],
  puddle: [['pulse', 'puddle', 0.8, 0, 0.01, 'none']],
};

export const LAMPS = [
  { col: [0.88, 0.13, 68], at: [3.5, 1.6, -23.6], power: 20, range: 10, of: 'mv:garage' },
  { col: [0.95, 0.06, 95], at: [5.9, 2.7, -22.7], to: [4.6, 0, -24.6], power: 160, range: 12, of: 'sw:sensor' },
  { col: [0.86, 0.14, 65], at: [-4.3, 7.4, -24.7], to: [-3.6, 0, -24.4], power: 420, range: 20, of: 'sw:lane' },
  { col: [0.84, 0.1, 190], at: [1.25, 0.5, -23.6], power: 5, range: 5, of: 'sw:tv' },
];
