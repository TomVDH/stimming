// The pick sequence and the complex lights. Pure; a test steps it by hand.
// Times are in seconds from the pick.
import type { Phase } from './machine.ts';

export type Shot = 'edge' | 'slit' | 'roll' | 'gear';
export type Cut = { at: number; shot: Shot; dur: number };

// The shutter opens from 0 to 4 s; the slew starts at 4 s.
// edge: the shutter starts to slide, tight on the slit edge.
// slit: the shutter opens further, the whole slit.
// gear: the cupola starts to turn on its ring as the slew begins.
// roll: the tube rolls in the open slit, against the sky.
export const CUTS: Cut[] = [
  { at: 0, shot: 'edge', dur: 1.8 },
  { at: 1.8, shot: 'slit', dur: 2 },
  { at: 3.8, shot: 'gear', dur: 1.6 },
  { at: 5.4, shot: 'roll', dur: 2 },
];
export const cutsTotal = CUTS.reduce((s, c) => s + c.dur, 0);

// The cut that shows at sequence time t; null outside the sequence.
export function cutAt(t: number): Cut | null {
  if (t < 0) return null;
  for (let i = CUTS.length - 1; i >= 0; i--) {
    const c = CUTS[i];
    if (t >= c.at) return t < c.at + c.dur ? c : null;
  }
  return null;
}

// 'inside' is the view through the telescope.
export type LightPhase = Phase | 'inside';

// Full at rest, dim while the telescope hunts, off for the survey.
export function lightGoal(phase: LightPhase): number {
  switch (phase) {
    case 'open': case 'slew': return 0.35;
    case 'track': case 'hold': case 'inside': return 0;
    default: return 1;
  }
}

// The lights fall in 2 s from full to off, and rise in 4.2 s.
const FALL = 1 / 2, RISE = 1 / 4.2;

// Steps the light level toward the phase's goal at a fixed rate.
export function lightLevel(phase: LightPhase, prev: number, dt: number): number {
  const goal = lightGoal(phase);
  const d = goal - prev;
  const max = (d > 0 ? RISE : FALL) * dt;
  return Math.abs(d) <= max ? goal : prev + Math.sign(d) * max;
}
