// East Van walk, module 2: the backyard. Beds, a trampoline, side fences.
// Its parts keep the alley's numbers; the beds sit 1.4 m further back.
import { box, cyl, blob } from '../lot.js';
import { A, ground, panel, on } from './parts.js';

export const ID = 'yard';
export const SIZE = [14, 9];
export const ORIGIN = [0, 0, -17.4];
export const JOIN = 'back';
export const STOP = { at: [0, 1, -17.4], yaw: 1.15, pitch: 0.72, w: 26, tall: 27, h: 17, band: 5, range: 12 };

const legs = [0, 1, 2, 3, 4, 5].map(i => box([-3.6 + Math.cos(i * 1.047) * 1.45, 0.47, -14.5 + Math.sin(i * 1.047) * 1.45], [0.07, 0.55, 0.07], 'chrome', A));

export const PARTS = [
  ground([0, 0.1, -17.4], [14, 0.2, 9], 'grass'),

  // Raised beds. The greens are movers: a poke makes them wiggle.
  ...[['kale1', -13.7, 'kale'], ['kale2', -15.7, 'hedge']].flatMap(([id, z, c]) => [
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


  // A trampoline with a ball on it.
  cyl([-3.6, 0.75, -14.5], 1.5, 0.04, 'tyre', A), { t: 'ring', p: [-3.6, 0.77, -14.5], r: 1.5, tube: 0.08, c: 'binBlue', L: A },
  ...legs,
  ...on('tramp', [-3.6, 0.97, -14.5], [blob([-3.6, 0.97, -14.5], 0.2, 'tomato', A)]),

  // Side fences, and a low hedge row along the back edge.
  ...panel(-6.85, -21.9, -12.9), ...panel(6.85, -21.9, -12.9),
  ...[-5.6, -4, -2.4, -0.8, 0.8, 2.4, 4, 5.6].map((x, i) => blob([x, 0.5, -21.5], 0.45 + 0.1 * (i % 2), 'hedge', A)),
];

export const WIRES = [];
export const POKES = [
  { id: 'kale1', at: [4.6, 0.8, -13.7], r: 0.7 }, { id: 'kale2', at: [4.6, 0.8, -15.7], r: 0.7 },
  { id: 'tramp', at: [-3.6, 1, -14.5], r: 1.1 },
];
export const MOVES = {
  kale1: (g, k) => { g.scale.set(1 + 0.25 * k, 1 - 0.3 * k, 1 + 0.25 * k); g.rotation.y = 0.5 * Math.sin(k * 9.4); },
  kale2: (g, k) => { g.scale.set(1 + 0.25 * k, 1 - 0.3 * k, 1 + 0.25 * k); g.rotation.y = 0.5 * Math.sin(k * 9.4); },
  tramp: (g, k, h) => { g.position.y = h[1] + 2.6 * k; },
};
const wiggle = id => [['pulse', id, 0.12, 0, 0.9, 'elastic.out(1, 0.3)']];
export const ACTS = {
  kale1: wiggle('kale1'), kale2: wiggle('kale2'),
  tramp: [['pulse', 'tramp', 0.38, 0, 1.5, 'bounce.out']],
};
export const LAMPS = [];
