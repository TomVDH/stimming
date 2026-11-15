// East Van walk, module 1: the house lot, from the road to the back stoop.
// Its parts keep the house lot's numbers; z runs toward the road.
import * as lot from '../lot.js';
import { box, blob, boards } from '../lot.js';
import { A, ground, panel } from './parts.js';

export const ID = 'house';
export const SIZE = [14, 22.9];
export const ORIGIN = [0, 0, -1.45];
export const JOIN = 'back';
export const STOP = { at: [0, 2.6, 0], yaw: 0.5, w: 27, tall: 26, h: 19, band: 5, range: 14 };

const backSteps = [0, 1, 2, 3].map(i => box([-1.5, (0.2 + 1.15 - 0.25 * i) / 2, -11.55 - 0.3 * i], [1.5, 0.95 - 0.25 * i, 0.3], 'concrete', A, { k: 'step' }));

export const PARTS = [
  // The plinth comes from SIZE, so the house lot's own plinth stays out.
  ...lot.PARTS.filter(q => q.k !== 'plinth'),
  // One strip of backyard grass behind the house, to the plinth edge.
  ground([0, 0.1, -11.95], [14, 0.2, 1.9], 'grass'),
  ...panel(-6.85, -12.9, -10.1), ...panel(6.85, -12.9, -10.1),

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
];

export const WIRES = lot.WIRES;
export const POKES = [...lot.POKES, { id: 'wBack', at: [1.8, 3, -10.1], r: 0.8 }];
export const MOVES = lot.MOVES;
export const ACTS = lot.ACTS;
export const LAMPS = lot.LAMPS;
export const CROW = lot.CROW;
