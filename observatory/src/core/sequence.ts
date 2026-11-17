// The pick sequence and the complex lights. Pure; a test steps it by hand.
// Times are in seconds from the pick.
import type { Phase } from './machine.ts';
import { SHUTTER_S } from './dome.ts';

export type Shot = 'edge' | 'slit' | 'lift' | 'roll' | 'glass';
// Each cut is a locked camera.
// fov: the vertical field of view in degrees, fixed for the cut.
// phase: the machine phase the cut shows.
export type Cut = { shot: Shot; fov: number; phase: 'open' | 'slew' };

// edge: the upper leaf slides back off the seam, over the crown.
// slit: the lower leaf drops.
// The slit opens on the tube.
// lift: inside, the tube lifts toward the slit and the stars.
// roll: outside, the tube in the slit.
// The cupola carries it round.
// glass: close on the objective glass, with tonight's stars in it.
// The glass rises into the frame, stops and holds.
export const CUTS: Cut[] = [
  { shot: 'edge', fov: 16, phase: 'open' },
  { shot: 'slit', fov: 19, phase: 'open' },
  { shot: 'lift', fov: 50, phase: 'slew' },
  { shot: 'roll', fov: 18, phase: 'slew' },
  { shot: 'glass', fov: 20, phase: 'slew' },
];
export const cutOf = (shot: Shot): Cut => CUTS.find(c => c.shot === shot)!;

/* ---------- the timing: from the machine's own lift ---------- */
// The two shutter shots share its travel.
export const OPEN_CUT = SHUTTER_S / 2;
// The lift shot holds this many seconds.
// The slew starts from rest, so a shot needs time.
export const LIFT_CUT = 2.5;
// The roll holds this long at most.
export const ROLL_MAX = 9;
// The glass shot starts with this many degrees still to lift.
// Then the glass enters from under the frame.
export const GLASS_ENTER = 6;
// The glass rises this many seconds at least before it stops.
export const GLASS_RISE = 2;
// The glass shot holds this long on the settled glass.
export const GLASS_HOLD = 1.5;
// Within this many degrees of its goal the tube looks still.
// The hold starts there, not at the machine's last slow settle.
export const SETTLE = 0.05;
// A shot shows this long at least, or not at all.
export const MIN_SHOT = 1.2;
// The glass shot ends after this many seconds anyway.
export const GLASS_MAX = 16;

// What the sequence reads from the machine each frame.
// altLeft: degrees the tube still has to lift, 0 when it rests.
// altEta: seconds until the tube arrives.
export type Lift = { altLeft: number; altEta: number };
// shot: the shot that shows.
// t: seconds in it.
// total: seconds since the pick.
// settled: seconds since the tube came to rest, in the glass shot.
export type Seq = { shot: Shot; t: number; total: number; settled: number; done: boolean };

// Seconds until the glass shot is due.
// It is due with GLASS_ENTER degrees left to lift.
// It is due early when its rise would last under GLASS_RISE.
// The time to GLASS_ENTER takes the lift's mean speed.
function dueIn(m: Lift): number {
  if (m.altLeft <= GLASS_ENTER || m.altEta <= GLASS_RISE) return 0;
  return Math.min(m.altEta - GLASS_RISE, (m.altLeft - GLASS_ENTER) * m.altEta / m.altLeft);
}

// Enters a shot.
// A lift or roll under MIN_SHOT long gives way to the glass.
function enter(s: Seq, shot: Shot, m: Lift): Seq {
  const next = (shot === 'lift' || shot === 'roll') && dueIn(m) < MIN_SHOT ? 'glass' : shot;
  return { ...s, shot: next, t: 0, settled: 0 };
}

// The sequence at the pick.
// A shut shutter opens first.
// An open shutter starts the slew at once, with the lift shot.
export function startSeq(phase: Phase, m: Lift): Seq {
  const s: Seq = { shot: 'edge', t: 0, total: 0, settled: 0, done: false };
  return phase === 'open' ? s : enter(s, 'lift', m);
}

// One frame of the sequence.
// The shutter shots follow the shutter.
// The glass shot never starts before the shutter is open.
export function stepSeq(s: Seq, dt: number, m: Lift): Seq {
  if (s.done) return s;
  const n: Seq = { ...s, t: s.t + dt, total: s.total + dt };
  switch (s.shot) {
    case 'edge': return n.t >= OPEN_CUT ? enter(n, 'slit', m) : n;
    case 'slit': return n.t >= OPEN_CUT ? enter(n, 'lift', m) : n;
    case 'lift':
      if (dueIn(m) <= 0) return enter(n, 'glass', m);
      return n.t >= LIFT_CUT ? enter(n, 'roll', m) : n;
    case 'roll':
      if (dueIn(m) <= 0 || n.t >= ROLL_MAX) return enter(n, 'glass', m);
      return n;
    case 'glass': {
      const settled = m.altLeft <= SETTLE ? s.settled + dt : 0;
      return { ...n, settled, done: settled >= GLASS_HOLD - 1e-9 || n.t >= GLASS_MAX };
    }
  }
}

// A tap or Esc ends the sequence at once.
export const skipSeq = (s: Seq): Seq => ({ ...s, done: true });

// One locked camera per cut, from a maker the caller gives.
// The first ask in a cut makes its camera.
// Later asks in that cut give the same camera back.
export type Locks<C> = { of(cut: Cut): C; clear(): void };
export function makeLocks<C>(make: (cut: Cut) => C): Locks<C> {
  const made = new Map<Shot, C>();
  return {
    of(cut) {
      let c = made.get(cut.shot);
      if (c === undefined) { c = make(cut); made.set(cut.shot, c); }
      return c;
    },
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
