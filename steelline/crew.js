// Steel line crew: tiny figures on the floors and gantries of each step.
// Each worker keeps to one walkway: walk to a post, work there, walk on.
// A rushed step calls more hands; they walk in from the yard.
import { P } from './works.js';

// Walkways: x from, x to, floor height, step.
export const WALKS = [
  [2, 15, 0.35, 'yard'], [33, 40, 0.35, 'yard'], [P.tunnelX0 + 2, P.tunnelX1 - 2, P.tunnelY - 1.5, 'yard'],
  [P.ovenX0 + 1, P.ovenX1 - 1, P.ovenY1 + 1.8, 'yard'], [P.ovenX1 + 1, P.quenchX + 12, 0.35, 'yard'],
  [P.stockX0 + 1.2, P.stockX1 - 1.2, 5.6, 'furnace'], [P.stockX0 + 1.2, P.stockX1 - 1.2, 22, 'furnace'],
  [P.bfX + 9, P.bfX + 33, P.castY, 'furnace'], [P.bfX - 15, P.bfX - 9, P.castY, 'furnace'],
  [P.bfX - 8, P.bfX + 8, 64.5, 'furnace'], [P.bfX + 9, P.bfX + 13, 23, 'furnace'], [P.stoveXs[0] - 6, P.stoveXs[2] + 8, 0.35, 'furnace'],
  [P.shopX0 + 2, P.convX - 8.5, P.floorY, 'converter'], [P.convX + 8.5, P.shopX1 - 2, P.floorY, 'converter'],
  [P.pitX + 10, P.shopX1 - 13, 0.35, 'converter'], [P.shopX0 + 18, P.shopX0 + 32, P.floorY + 9, 'converter'],
  [P.castX0 + 2, P.turretX - 2.5, 24.6, 'caster'], [P.tundishX + 8.5, P.castX1 - 2, 24.6, 'caster'], [P.tundishX + 14, P.castX1 - 2, 0.35, 'caster'],
  [P.millX0 + 2, P.reheatX0 - 1, 0.35, 'mill'], [P.reheatX1 + 1, P.roughX - 3, 0.35, 'mill'], [P.standX0 + 9, P.standX0 + 19, 17, 'mill'],
  [P.yardX0 + 2, P.yardX1 - 2, 0.35, 'mill'],
];
// The crew a step keeps, and the extra hands a rush calls.
const BASE = { yard: 7, furnace: 9, converter: 7, caster: 5, mill: 7 };
const RUSH = 5;
const VESTS = [[0.9, 0.32, 0.04], [0.62, 0.8, 0.06], [0.85, 0.5, 0.05]];

export function makeCrew(seed = 1) {
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const crew = [];
  const walksOf = s => WALKS.filter(w => w[3] === s);
  function hire(step, extra = false) {
    const ws = walksOf(step), w = ws[Math.floor(rnd() * ws.length)];
    const x = w[0] + rnd() * (w[1] - w[0]);
    crew.push({ step, walk: w, x, y: w[2], to: x, wait: rnd() * 4, step_: rnd() * 6, phase: rnd() * 6, extra, gone: false,
      vest: VESTS[Math.floor(rnd() * VESTS.length)].map(c => c * 0.6), dir: 1, walking: 0 });
  }
  for (const s of Object.keys(BASE)) for (let i = 0; i < BASE[s]; i++) hire(s);

  // busy: how hard each step works now, 0 to 1. rush: seconds left per step.
  function step(dt, busy, rush) {
    for (const s of Object.keys(BASE)) {
      const extra = crew.filter(w => w.step === s && w.extra && !w.gone).length;
      if (rush[s] > 0 && extra < RUSH) hire(s, true);
      if (rush[s] <= 0) for (const w of crew) if (w.step === s && w.extra) w.gone = true;
    }
    for (let i = crew.length - 1; i >= 0; i--) {
      const w = crew[i], b = busy[w.step] ?? 0.5;
      const v = (1.1 + 0.5 * b) * (rush[w.step] > 0 ? 1.6 : 1);
      if (w.wait > 0) { w.wait -= dt; w.walking = Math.max(0, w.walking - dt * 4); continue; }
      const d = w.to - w.x;
      if (Math.abs(d) < 0.05) {
        // A leaver walks off its walkway's end and goes.
        if (w.gone) { crew.splice(i, 1); continue; }
        // Idle hands stand longer; a busy step keeps them moving.
        w.wait = (0.8 + rnd() * 3.5) * (1.6 - b);
        w.to = w.walk[0] + rnd() * (w.walk[1] - w.walk[0]);
        continue;
      }
      if (w.gone) w.to = w.walk[0];
      const s = Math.sign(d) * Math.min(Math.abs(d), v * dt);
      w.x += s; w.dir = Math.sign(d);
      w.step_ += Math.abs(s) * 5.2;
      w.walking = Math.min(1, w.walking + dt * 4);
    }
  }
  return { crew, step };
}
