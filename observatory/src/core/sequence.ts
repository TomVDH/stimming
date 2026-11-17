// The pick sequence and the complex lights. Pure; a test steps it by hand.
// Times are in seconds from the pick.
import type { Phase } from './machine.ts';

export type Shot = 'edge' | 'slit' | 'roll' | 'gear';
// Each cut is a locked camera.
// fov: the vertical field of view in degrees, fixed for the cut.
// phase: the machine phase the cut shows.
export type Cut = { at: number; shot: Shot; dur: number; fov: number; phase: 'open' | 'slew' };

// The shutter opens from 0 to 4 s.
// The slew starts at 4 s.
// edge: the shutter starts to slide, tight on the slit edge.
// slit: the shutter opens further, the whole slit.
// gear: the cupola starts to turn on its ring as the slew begins.
// roll: the tube rolls in the open slit, against the sky.
// The lens cut joins at the end later, as a fifth cut.
export const CUTS: Cut[] = [
  { at: 0, shot: 'edge', dur: 2, fov: 16, phase: 'open' },
  { at: 2, shot: 'slit', dur: 2, fov: 17, phase: 'open' },
  { at: 4, shot: 'gear', dur: 2, fov: 8, phase: 'slew' },
  { at: 6, shot: 'roll', dur: 2, fov: 9, phase: 'slew' },
];
export const cutsTotal = CUTS.reduce((s, c) => s + c.dur, 0);

// The sequence time to start at, from the machine's phase after the pick.
// A shut shutter opens first, so the sequence plays from 0.
// An open shutter starts the slew at once.
// Then the sequence starts at the first slew cut.
export function startAt(phase: Phase): number {
  if (phase === 'open') return 0;
  return CUTS.find(c => c.phase === 'slew')?.at ?? 0;
}

// One locked camera per cut, from a maker the caller gives.
// The first ask in a cut makes its camera.
// Later asks in that cut give the same camera back.
export type Locks<C> = { of(cut: Cut): C; at(t: number): C | null; clear(): void };
export function makeLocks<C>(make: (cut: Cut) => C): Locks<C> {
  const made = new Map<Shot, C>();
  const of = (cut: Cut): C => {
    let c = made.get(cut.shot);
    if (c === undefined) { c = make(cut); made.set(cut.shot, c); }
    return c;
  };
  return {
    of,
    at(t) { const cut = cutAt(t); return cut ? of(cut) : null; },
    clear() { made.clear(); },
  };
}

// A portrait lens is at most this much wider than the cut's lens.
const PORTRAIT_MAX = 1.5;
// The lens for a frame of this aspect, width over height.
// tall: true for a portrait frame, which aims at its own point.
export function lens(fov: number, aspect: number): { fov: number; tall: boolean } {
  if (aspect >= 1) return { fov, tall: false };
  // A portrait frame takes a wider lens, so the subject still fits across.
  return { fov: fov * Math.min(PORTRAIT_MAX, 1 / Math.sqrt(aspect)), tall: true };
}

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
