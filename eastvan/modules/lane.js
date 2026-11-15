// East Van walk, module 3: the rear of the lot and the lane behind it.
// The garage, the back fence and gate, then the lane along x.
// Its parts keep the alley's numbers; z runs toward the house.
import { box, cyl, blob, beam } from '../lot.js';
import { A, ground, fence, panel, on } from './parts.js';

export const ID = 'lane';
export const SIZE = [14, 12];
export const ORIGIN = [0, 0, -22.5];
export const JOIN = 'east';
export const STOP = { at: [0, 1.4, -22.5], yaw: Math.PI + 0.5, pitch: 0.78, w: 21, tall: 24, h: 16, band: 5, range: 12 };

// A lane bin. The lid turns on its fence-side edge.
const bin = (x, c, id) => [
  box([x, 0.57, -22.78], [0.62, 1, 0.72], c, A, { k: 'bin' }),
  box([x, 1.11, -22.78], [0.7, 0.08, 0.8], c, A, { k: 'lid', dyn: id, hinge: [x, 1.07, -22.38] }),
];

export const PARTS = [
  // Ground: grass by the garage, the garage slab, the lane, the far verge.
  ground([0, 0.1, -19.4], [14, 0.2, 5.8], 'grass'),
  ground([3.5, 0.11, -19.75], [5.8, 0.22, 5.5], 'concrete'),
  ground([0, 0, -24.5], [14, 0.1, 4], 'lane'),
  ground([0, 0.06, -27.5], [14, 0.22, 2], 'verge'),

  // Side fences, then the back fence along the lane with its gate.
  ...panel(-6.85, -22.25, -16.5), ...panel(6.85, -17, -16.5),
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
  ...[[-6.2, 0.6], [-4.9, 0.45], [2.4, 0.5], [3.4, 0.4]].map(([x, r]) => blob([x, 0.17 + r * 0.7, -27.2], r, 'hedge', A)),

  // A neighbour's garage across the lane, cut open like a doll's house:
  // no roof and no back wall, so the lit workshop shows from above.
  box([-1, 0.15, -27.65], [4.6, 0.1, 1.7], 'concrete', A),
  box([-3.25, 1.45, -27.65], [0.12, 2.5, 1.7], 'mustard', A, { k: 'wall' }), box([1.25, 1.45, -27.65], [0.12, 2.5, 1.7], 'mustard', A, { k: 'wall' }),
  box([-1, 2.5, -26.86], [4.6, 0.4, 0.12], 'mustard', A), box([-3, 1.25, -26.86], [0.5, 2.1, 0.12], 'mustard', A), box([1, 1.25, -26.86], [0.5, 2.1, 0.12], 'mustard', A),
  box([-1, 2.72, -26.86], [4.8, 0.06, 0.2], 'cream', A),
  box([-2, 0.65, -28.15], [1.8, 0.9, 0.55], 'wood', A), box([-2, 1.12, -28.15], [1.9, 0.05, 0.6], 'cedar', A),
  box([-3.17, 1.6, -27.7], [0.04, 0.9, 1.1], 'cedar', A),
  box([0.4, 0.45, -28], [0.5, 0.6, 0.4], 'tomato', A), box([0.4, 0.8, -28], [0.4, 0.1, 0.3], 'crow', A),
  box([-1, 2.1, -28.3], [0.3, 0.08, 0.12], 'lamp', A, { k: 'lens', sw: 'shop2', on: true, gain: 2.2 }),
  ...on('garage2', [-1, 2.27, -26.78], [0, 1, 2, 3].map(i => box([-1, 0.45 + 0.52 * i, -26.78], [3.4, 0.5, 0.05], 'white', A))),

  // A bike locked to the far fence.
  ...[4.85, 6.05].map(x => ({ t: 'ring', p: [x, 0.52, -26.95], r: 0.34, tube: 0.035, c: 'tyre', L: A, ax: 'z' })).slice(1),
  beam([4.85, 0.52, -26.95], [5.35, 0.95, -26.95], 0.05, 'tomato', A), beam([5.35, 0.95, -26.95], [6.05, 0.52, -26.95], 0.05, 'tomato', A),
  beam([5.35, 0.95, -26.95], [5.5, 0.52, -26.95], 0.05, 'tomato', A), beam([4.85, 0.52, -26.95], [5.5, 0.52, -26.95], 0.05, 'tomato', A),
  box([5.35, 1.05, -26.95], [0.28, 0.06, 0.12], 'crow', A), beam([4.85, 0.52, -26.95], [4.95, 1.15, -26.95], 0.04, 'chrome', A),
  box([4.95, 1.17, -26.95], [0.06, 0.04, 0.45], 'chrome', A),
  ...on('bike', [4.85, 0.52, -26.95], [{ t: 'ring', p: [4.85, 0.52, -26.95], r: 0.34, tube: 0.035, c: 'tyre', L: A, ax: 'z' }, box([4.85, 0.52, -26.95], [0.62, 0.025, 0.02], 'chrome', A), box([4.85, 0.52, -26.95], [0.025, 0.62, 0.02], 'chrome', A)]),

  // A compost bin by the garage. Its lid is in laneLife.
  box([-0.3, 0.6, -17.3], [0.8, 0.8, 0.8], 'binGreen', A),
  box([-0.3, 0.55, -16.89], [0.5, 0.3, 0.02], 'hedge', A),

  // The pulley line: a peg on the garage wall.
  box([0.55, 2.4, -19.6], [0.1, 0.1, 0.1], 'can', A),
];

// The lane wires run along x on the lane pole.
const span = (y, z) => [
  { a: [-12, y + 0.3, z], b: [-5.9, y, z], sag: 0.4 },
  { a: [-5.9, y, z], b: [12, y + 0.35, z], sag: 0.9 },
];
export const WIRES = [
  ...span(8.6, -23.9), ...span(8.6, -25), ...span(8.6, -22.8), ...span(7.68, -23.3), ...span(7.68, -24.5),
  // The washing line runs on a pulley from the garage wall to the pole.
  { a: [0.55, 2.4, -19.6], b: [-5.85, 4.4, -23.8], sag: 0.25 },
];

export const POKES = [
  { id: 'backgate', at: [-2.4, 1.1, -22.25], r: 0.7 },
  { id: 'garage', at: [3.5, 1.3, -22.6], r: 1.4 }, { id: 'sensor', at: [5.9, 2.72, -22.6], r: 0.45 },
  { id: 'lane', at: [-4.3, 7.45, -24.7], r: 0.6 }, { id: 'lidC', at: [-5.3, 0.9, -22.8], r: 0.5 }, { id: 'lidD', at: [-4.5, 0.9, -22.8], r: 0.5 },
  { id: 'puddle', at: [-0.5, 0.1, -24.7], r: 0.8 }, { id: 'tv', at: [1.25, 0.4, -23.1], r: 0.45 },
  { id: 'garage2', at: [-1, 1.3, -26.8], r: 1.4 }, { id: 'bike', at: [5.4, 0.7, -26.95], r: 0.7 },
  { id: 'shop2', at: [-1, 2.1, -28.2], r: 0.5 },
];

export const MOVES = {
  backgate: (g, k) => { g.rotation.y = -1.3 * k; },
  // The door rolls up: it shrinks toward its top edge.
  garage: (g, k) => { g.scale.y = 1 - 0.94 * k; },
  garage2: (g, k) => { g.scale.y = 1 - 0.94 * k; },
  // The front wheel spins about its hub.
  bike: (g, k) => { g.rotation.z = -k * Math.PI * 8; },
  lidC: (g, k) => { g.rotation.x = 1.9 * k; },
  lidD: (g, k) => { g.rotation.x = 1.9 * k; },
  raccoon: (g, k, h) => { g.position.y = h[1] + 0.42 * k; },
  // A ripple: the ring grows and thins out.
  puddle: (g, k) => { g.visible = k > 0.01 && k < 0.99; g.scale.set(0.3 + 1.6 * k, 1 - k, 0.3 + 1.6 * k); },
};

export const ACTS = {
  backgate: [['swing', 'backgate', { duration: 0.9, ease: 'elastic.out(1, 0.5)' }, { duration: 0.5, ease: 'power2.in' }]],
  garage: [['swing', 'garage', { duration: 1.3, ease: 'power1.inOut' }, { duration: 1, ease: 'power1.inOut' }]],
  garage2: [['swing', 'garage2', { duration: 1.3, ease: 'power1.inOut' }, { duration: 1, ease: 'power1.inOut' }]],
  bike: [['run', 'bike', 2.2]],
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
  { col: [0.88, 0.13, 68], at: [-1, 1.8, -27.7], power: 14, range: 7, of: 'sw:shop2' },
];
