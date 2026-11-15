// East Van walk, module 4: the lane runs on toward the Drive.
// It uses the Lane module's numbers, so the two lanes line up.
// Near side: an open garage with a car on blocks, a mural fence, a closed garage.
// Far side: a fence with a cherry tree over it.
import { box, cyl, blob, beam } from '../lot.js';
import { A, ground, fence, panel, on } from './parts.js';

export const ID = 'run';
export const SIZE = [14, 12];
export const ORIGIN = [0, 0, -22.5];
export const JOIN = 'east';
export const STOP = { at: [0, 1.4, -22.5], yaw: Math.PI + 0.5, pitch: 0.78, w: 21, tall: 24, h: 16, band: 5, range: 12 };

// A closed garage that faces the lane.
const garage = (x, w, c) => [
  box([x, 1.45, -19.65], [w, 2.5, 5.3], c, A, { k: 'wall' }),
  { t: 'prism', p: [x, 2.7, -19.65], s: [w, 0.8, 5.3], c, L: A },
  { t: 'roof', p: [x, 2.7, -19.65], s: [w, 0.8, 5.8], over: 0.3, th: 0.14, courses: 5, c: 'roof', L: A },
  box([x - w / 2 + 0.6, 1.25, -22.33], [0.16, 2.1, 0.06], 'cream', A), box([x + w / 2 - 0.6, 1.25, -22.33], [0.16, 2.1, 0.06], 'cream', A),
  box([x, 2.32, -22.33], [w - 1.04, 0.16, 0.06], 'cream', A),
];

export const PARTS = [
  // Ground: the backs of two lots, their garage pads, the lane, the far verge.
  ground([0, 0.1, -19.4], [14, 0.2, 5.8], 'grass'),
  ground([-3, 0.11, -19.75], [5.4, 0.22, 5.5], 'concrete'),
  ground([3.6, 0.11, -19.75], [5, 0.22, 5.5], 'concrete'),
  ground([0, 0, -24.5], [14, 0.1, 4], 'lane'),
  ground([0, 0.06, -27.5], [14, 0.22, 2], 'verge'),

  // The open garage: three walls and a roof, a work lamp, a car on blocks.
  box([-5.6, 1.45, -19.65], [0.12, 2.5, 5.3], 'brick', A, { k: 'wall' }), box([-0.4, 1.45, -19.65], [0.12, 2.5, 5.3], 'brick', A, { k: 'wall' }),
  box([-3, 1.45, -17.06], [5.3, 2.5, 0.12], 'brick', A, { k: 'wall' }),
  { t: 'prism', p: [-3, 2.7, -19.65], s: [5.3, 0.8, 5.3], c: 'brick', L: A },
  { t: 'roof', p: [-3, 2.7, -19.65], s: [5.3, 0.8, 5.8], over: 0.3, th: 0.14, courses: 5, c: 'roof', L: A },
  box([-3, 2.45, -22.33], [5.3, 0.3, 0.12], 'brick', A),
  box([-4.9, 1.1, -17.3], [1.2, 0.08, 0.5], 'cedar', A), box([-4.9, 0.6, -17.3], [1.1, 0.9, 0.45], 'wood', A),
  box([-3, 2.2, -17.3], [0.3, 0.08, 0.14], 'lamp', A, { k: 'lens', sw: 'worklamp', on: true, gain: 2.2 }),
  // The car sits on blocks, its nose out of the door. Its bonnet lifts.
  ...[-1.2, 1.2].flatMap(dz => [-0.75, 0.75].map(dx => box([-3 + dx, 0.32, -20.6 + dz], [0.3, 0.3, 0.3], 'concrete', A))),
  box([-3, 0.85, -20.6], [1.7, 0.6, 4.2], 'teal', A), box([-3, 1.4, -20.3], [1.5, 0.5, 2.2], 'glassDark', A),
  box([-3, 1.68, -20.3], [1.45, 0.06, 2.1], 'teal', A),
  box([-3, 0.85, -22.72], [1.5, 0.3, 0.04], 'chrome', A),
  ...on('bonnet', [-3, 1.17, -21.45], [box([-3, 1.17, -22.05], [1.66, 0.05, 1.2], 'teal', A)]),
  box([-3, 1.0, -21.95], [1.2, 0.3, 0.9], 'crow', A),

  // A fence with a mural between the garages, and a hydrant at the lane edge.
  fence('x', -0.2, 1, -22.25),
  cyl([0.4, 1.0, -22.21], 0.5, 0.02, 'bulbTeal', A, { ax: 'z' }), cyl([0.6, 1.4, -22.2], 0.25, 0.02, 'mustard', A, { ax: 'z' }),
  cyl([0.75, 0.32, -22.75], 0.12, 0.45, 'red', A), blob([0.75, 0.6, -22.75], 0.13, 'red', A),
  ...on('cap', [0.75, 0.72, -22.75], [cyl([0.75, 0.74, -22.75], 0.06, 0.06, 'mustard', A)]),
  // The jet: an arc of drops that grows out of the hydrant.
  ...on('jet', [0.75, 0.75, -22.75], Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 9;
    return blob([0.75 - 0.2 * t, 0.75 + 1.6 * t - 1.4 * t * t, -22.75 - 2.2 * t], 0.07 + 0.05 * t, 'white', A, { k: 'flower' });
  })),

  // The closed garage, with a door and a wall lamp.
  ...garage(3.6, 4.8, 'garage'),
  ...[0, 1, 2, 3].map(i => box([3.6, 0.47 + 0.525 * i, -22.37], [3.4, 0.5, 0.05], 'cream', A)),
  ...panel(-6.85, -22.25, -16.5), ...panel(6.85, -22.25, -16.5),

  // The lane pole and its lamp.
  cyl([1.6, 4.6, -23.9], 0.13, 9, 'wood', A),
  box([1.6, 8.5, -23.9], [0.14, 0.14, 2.4], 'wood', A), box([1.6, 7.6, -23.9], [0.12, 0.12, 1.6], 'wood', A),
  beam([1.6, 7.05, -24], [3, 7.5, -24.6], 0.08, 'can', A),
  box([3.2, 7.5, -24.7], [0.6, 0.12, 0.28], 'can', A),
  box([3.2, 7.43, -24.7], [0.44, 0.04, 0.2], 'lamp', A, { k: 'lens', sw: 'lane2', on: true, gain: 2.4 }),

  // The far side: a fence, and a cherry tree that leans over it.
  fence('x', -6.7, 6.7, -27.4, 1.6),
  cyl([5.4, 1.8, -27.9], 0.17, 3.3, 'trunk', A),
  blob([5.4, 4.6, -27.6], 1.4, 'blossom', A, { k: 'crown', pivot: [5.4, 0.2, -27.9] }), blob([4.4, 4, -27.2], 1, 'blossom2', A, { k: 'crown' }),
  blob([6.3, 4.1, -27.4], 0.95, 'blossom2', A, { k: 'crown' }), blob([5.6, 5.6, -27.8], 0.9, 'blossom', A, { k: 'crown' }),
];

// The lane wires run on from the Lane module along x.
const span = (y, z) => [
  { a: [-12, y - 0.3, z], b: [1.6, y, z], sag: 0.7 },
  { a: [1.6, y, z], b: [12, y + 0.3, z], sag: 0.6 },
];
export const WIRES = [
  ...span(8.6, -23.9), ...span(8.6, -25), ...span(8.6, -22.8), ...span(7.68, -23.3), ...span(7.68, -24.5),
];

export const POKES = [
  { id: 'worklamp', at: [-3, 2.2, -17.3], r: 0.5 }, { id: 'bonnet', at: [-3, 1.2, -22], r: 0.8 },
  { id: 'lane2', at: [3.2, 7.45, -24.7], r: 0.6 }, { id: 'hydrant', at: [0.75, 0.6, -22.75], r: 0.5 },
];

export const MOVES = {
  // The bonnet turns up about its back edge.
  bonnet: (g, k) => { g.rotation.x = -1.1 * k; },
  cap: (g, k, h) => { g.position.y = h[1] + 0.25 * k; g.rotation.z = k * 4; },
  jet: (g, k) => { g.visible = k > 0.02; g.scale.setScalar(Math.max(0.02, k)); },
};

export const ACTS = {
  bonnet: [['swing', 'bonnet', { duration: 0.5, ease: 'back.out(1.8)' }, { duration: 0.3, ease: 'power2.in' }]],
  lane2: [['flip', 'lane2', true]],
  hydrant: [['pulse', 'cap', 0.15, 1.6, 0.4, 'power2.in'], ['pulse', 'jet', 0.35, 1.2, 0.8, 'power2.in']],
};

export const LAMPS = [
  { col: [0.88, 0.13, 68], at: [-3, 2, -18.5], power: 18, range: 8, of: 'sw:worklamp' },
  { col: [0.86, 0.14, 65], at: [3.2, 7.4, -24.7], to: [3.4, 0, -24.2], power: 420, range: 20, of: 'sw:lane2' },
];
