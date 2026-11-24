// Steel line crew on K7: the floors as a road graph, posts to tend, workers.
// Each step keeps its own hands; floaters go where the hand calls.
// The stocks between steps live in K7 stores; line.js reads and writes them.
import { makeLine as makeKit } from './k7.js';
import { P } from './works.js';
import { CAPS, STEPS } from './line.js';

const G = 0.35;
// Floors above or below grade: x from, x to, height, step.
const FLOORS = {
  tunnel: [P.tunnelX0 + 2, P.tunnelX1 - 2, P.tunnelY - 1.5, 'yard'],
  ovens: [P.ovenX0 + 1, P.ovenX1 - 1, P.ovenY1 + 1.8, 'yard'],
  stockLow: [P.stockX0 + 1.2, P.stockX1 - 1.2, 5.6, 'furnace'],
  stockUp: [P.stockX0 + 1.2, P.stockX1 - 1.2, 22, 'furnace'],
  castR: [P.bfX + 9, P.bfX + 33, P.castY, 'furnace'],
  castL: [P.bfX - 15, P.bfX - 9, P.castY, 'furnace'],
  top: [P.bfX - 8, P.bfX + 8, 64.5, 'furnace'],
  tuyere: [P.bfX + 9, P.bfX + 13, 23, 'furnace'],
  convL: [P.shopX0 + 2, P.convX - 8.5, P.floorY, 'converter'],
  convR: [P.convX + 8.5, P.shopX1 - 2, P.floorY, 'converter'],
  grate: [P.shopX0 + 18, P.shopX0 + 32, P.floorY + 9, 'converter'],
  castFloorL: [P.castX0 + 2, P.turretX - 2.5, 24.6, 'caster'],
  castFloorR: [P.tundishX + 8.5, P.castX1 - 2, 24.6, 'caster'],
  pulpit: [P.standX0 + 9, P.standX0 + 19, 17, 'mill'],
};
// Posts on the ground: x from, x to, step.
const GROUND = [
  [2, 15, 'yard'], [33, 40, 'yard'], [P.ovenX1 + 1, P.quenchX + 12, 'yard'],
  [P.stoveXs[0] - 6, P.stoveXs[2] + 8, 'furnace'],
  [P.pitX + 10, P.shopX1 - 13, 'converter'],
  [P.tundishX + 14, P.castX1 - 2, 'caster'],
  [P.millX0 + 2, P.reheatX0 - 1, 'mill'], [P.reheatX1 + 1, P.roughX - 3, 'mill'], [P.yardX0 + 2, P.yardX1 - 2, 'mill'],
];
// Stairs and ladders: from floor at x, to floor at x. 'G' is the ground.
const LINKS = [
  ['G', 20, 'tunnel', 20], ['G', P.ovenX0 - 1, 'ovens', P.ovenX0 + 1],
  ['G', P.stockX0 + 1.4, 'stockLow', P.stockX0 + 6], ['stockLow', P.stockX1 - 2, 'stockUp', P.stockX1 - 2],
  ['G', P.bfX + 30, 'castR', P.bfX + 26], ['G', P.bfX - 15, 'castL', P.bfX - 15],
  ['castL', P.bfX - 11, 'top', P.bfX - 6], ['castR', P.bfX + 10, 'tuyere', P.bfX + 10],
  ['G', P.shopX0 + 2, 'convL', P.shopX0 + 2], ['G', P.shopX1 - 12, 'convR', P.shopX1 - 4], ['convL', P.shopX0 + 26, 'grate', P.shopX0 + 32],
  ['G', P.castX0 + 2, 'castFloorL', P.castX0 + 2], ['G', P.castX1 - 10, 'castFloorR', P.castX1 - 3],
  ['G', P.standX0 + 9, 'pulpit', P.standX0 + 9],
];
// The crew a step keeps, and the floaters a rush draws.
export const BASE = { yard: 7, furnace: 9, converter: 7, caster: 5, mill: 7 };
const FLOATERS = 8;
const VESTS = [[0.9, 0.32, 0.04], [0.62, 0.8, 0.06], [0.85, 0.5, 0.05]];

export function makeCrew(st, seed = 7) {
  const kit = makeKit({ speed: 1.35, seed });
  const rnd = kit.rnd;
  const floorY = f => (f === 'G' ? G : FLOORS[f][2]);
  const node = (f, x) => `${f}@${x.toFixed(1)}`;
  // Every point a floor needs: its ends, its links, its posts.
  const xs = { G: new Set([0, 690]) };
  for (const [k, [x0, x1]] of Object.entries(FLOORS)) xs[k] = new Set([x0, x1, (x0 + x1) / 2]);
  for (const [a, xa, b, xb] of LINKS) { xs[a].add(xa); xs[b].add(xb); }
  for (const [x0, x1] of GROUND) xs.G.add((x0 + x1) / 2);
  for (const [f, set] of Object.entries(xs)) {
    const list = [...set].sort((a, b) => a - b), y = floorY(f);
    list.forEach(x => kit.place(node(f, x), { x, y }));
    for (let i = 1; i < list.length; i++) kit.road(node(f, list[i - 1]), node(f, list[i]));
  }
  for (const [a, xa, b, xb] of LINKS) kit.road(node(a, xa), node(b, xb));

  // Posts: a place on each floor and ground stretch, with a standing spot on it.
  const posts = [];
  const post = (f, x0, x1, step) => {
    const id = `post${posts.length}`, mid = (x0 + x1) / 2, y = floorY(f);
    kit.place(id, { x: mid, y, spot: r => [x0 + r() * (x1 - x0), y] });
    kit.road(node(f, mid), id, [mid, y, mid, y]);
    posts.push({ id, step });
    // Tending: a worker stands a few seconds at a spot, then picks again.
    kit.step(`tend-${id}`, { at: id, time: 2.5 + rnd() * 3.5, hands: 2, job: step, pace: () => 0.6 + 0.8 * (st.busy[step] ?? 0.5) });
  };
  for (const [k, [x0, x1, , step]] of Object.entries(FLOORS)) post(k, x0, x1, step);
  for (const [x0, x1, step] of GROUND) post('G', x0, x1, step);

  // The stocks: K7 stores with the line's caps; line.js sees plain numbers.
  for (const [k, n] of Object.entries(st.stock)) {
    const s = kit.store(k, { at: posts[0].id, cap: CAPS[k] ?? Infinity, n });
    Object.defineProperty(st.stock, k, { get: () => s.n, set: v => { s.n = Math.max(0, Math.min(s.cap, v)); }, enumerable: true });
  }

  const hire = (step, jobs) => {
    const ps = posts.filter(p => !step || p.step === step), p = ps[Math.floor(rnd() * ps.length)];
    kit.hire({ at: p.id, jobs, data: { vest: VESTS[Math.floor(rnd() * VESTS.length)].map(c => c * 0.6), step } });
  };
  for (const s of STEPS) for (let i = 0; i < BASE[s]; i++) hire(s, new Set([s]));
  for (let i = 0; i < FLOATERS; i++) hire(null, null);

  // Growth: a bigger shift after the third heat; a third stack row after sixteen coils out.
  kit.milestone('crew', {
    test: () => st.heats >= 3,
    then: (k, loading) => { for (const s of STEPS) hire(s, new Set([s])); if (!loading) st.events.push({ kind: 'milestone', x: P.bfX }); },
  });
  kit.milestone('yardRow', {
    test: () => st.shipped >= 16,
    then: (k, loading) => { st.grow.coilRows = 3; kit.stores.get('coils').cap = CAPS.coils + 5; if (!loading) st.events.push({ kind: 'milestone', x: P.trainX }); },
  });

  // A rush calls workers to every post of that step for 20 s.
  function rush(step, secs = 20) { for (const p of posts) if (p.step === step) kit.call(`tend-${p.id}`, secs, 3); }

  // Hands at work per step: the line's machines run faster with more.
  function step(dt) {
    kit.tick(dt);
    for (const s of STEPS) st.hands[s] = 0;
    for (const w of kit.workers) if (w.state === 'work' || (w.state === 'go' && w.task)) st.hands[w.task?.job] = (st.hands[w.task?.job] ?? 0) + 1;
  }
  return { kit, crew: kit.workers, step, rush };
}
