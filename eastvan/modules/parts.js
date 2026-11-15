// East Van: part makers shared by the module files.
import { box } from '../lot.js';

export const A = 0;
export const ground = (p, s, c) => box(p, s, c, A, { k: 'ground' });
// A board fence: wide boards with a hair of gap, so each board inks.
export const fence = (ax, a, b, at, h = 1.7, c = 'cedar', o = {}) => ({ t: 'pickets', ax, a, b, at, y: 0.2, h, n: Math.round(Math.abs(b - a) / 0.46) + 1, w: 0.44, d: 0.05, c, L: A, k: 'fence', ...o });
// A side fence is one long panel with posts: boards moire at a low angle.
export const panel = (x, z0, z1, n = Math.max(1, Math.round((z1 - z0) / 2.4))) => [
  box([x, 1.0, (z0 + z1) / 2], [0.05, 1.6, z1 - z0], 'cedar', A, { k: 'fence' }), box([x, 1.84, (z0 + z1) / 2], [0.12, 0.08, z1 - z0], 'cedar', A),
  ...Array.from({ length: n + 1 }, (_, i) => box([x, 1.05, z0 + (z1 - z0) * i / n], [0.14, 1.75, 0.14], 'cedar', A)),
];
// Marks parts as one mover that turns or slides about its hinge.
export const on = (dyn, hinge, parts) => parts.map(q => ({ ...q, dyn, hinge }));
