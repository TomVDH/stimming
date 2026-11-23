// The pick sequence and the complex lights. Pure; a test steps it by hand.
// Times are in seconds from the pick.
import type { Phase } from './machine.ts';
import { SHUTTER_S } from './dome.ts';

export type Shot = 'edge' | 'slit' | 'lift' | 'roll' | 'glass' | 'mirror';
// Each cut is a locked camera.
// fov: the vertical field of view in degrees, fixed for the cut.
// phase: the machine phase the cut shows.
export type Cut = { shot: Shot; fov: number; phase: 'open' | 'slew' };

// edge: low and close, the dome on the stars; it turns while the leaves part.
// slit: the lower leaf drops.
// The slit opens on the tube.
// lift: inside, the tube lifts toward the slit and the stars.
// roll: outside, the tube in the slit.
// The cupola carries it round.
// glass: close on the objective glass, with tonight's stars in it.
// The glass rises into the frame, stops and holds.
// mirror: the reflector's extra shot, after the glass shot.
// A fast push: the secondary's white disk wipes up over the camera.
// The focus pulls to the primary, with the starry sky in it.
export const CUTS: Cut[] = [
  { shot: 'edge', fov: 18, phase: 'open' },
  { shot: 'slit', fov: 17, phase: 'open' },
  { shot: 'lift', fov: 34, phase: 'slew' },
  { shot: 'roll', fov: 9, phase: 'slew' },
  { shot: 'glass', fov: 20, phase: 'slew' },
  { shot: 'mirror', fov: 40, phase: 'slew' },
];
export const cutOf = (shot: Shot): Cut => CUTS.find(c => c.shot === shot)!;

/* ---------- the timing: from the machine's own lift ---------- */
// The two shutter shots share its travel.
// The edge shot takes the larger share, so the cupola's turn reads.
export const EDGE_CUT = SHUTTER_S * 0.65;
export const SLIT_CUT = SHUTTER_S - EDGE_CUT;
// The lift shot holds this many seconds.
// The slew starts from rest, so a shot needs time.
export const LIFT_CUT = 2.5;
// The roll always plays.
// It holds this long at least and this long at most.
export const ROLL_MIN = 2.5, ROLL_MAX = 9;
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
// No shot shows for less than this.
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
// extra: the mirror shot follows the glass shot.
export type Seq = { shot: Shot; t: number; total: number; settled: number; done: boolean; extra: boolean };
// The mirror shot pushes in for MIRROR_PUSH seconds, a fast wipe.
// It then holds on the primary until MIRROR_S.
export const MIRROR_PUSH = 1.4, MIRROR_S = 5;

// Seconds until the glass shot is due.
// It is due with GLASS_ENTER degrees left to lift.
// It is due early when its rise would last under GLASS_RISE.
// The time to GLASS_ENTER takes the lift's mean speed.
function dueIn(m: Lift): number {
  if (m.altLeft <= GLASS_ENTER || m.altEta <= GLASS_RISE) return 0;
  return Math.min(m.altEta - GLASS_RISE, (m.altLeft - GLASS_ENTER) * m.altEta / m.altLeft);
}

// Enters a shot.
const enter = (s: Seq, shot: Shot): Seq => ({ ...s, shot, t: 0, settled: 0 });

// The sequence at the pick.
// A shut shutter opens first.
// An open shutter starts the slew at once, with the lift shot.
// extra: true for the reflector, which adds the mirror shot.
export function startSeq(phase: Phase, m: Lift, extra = false): Seq {
  const s: Seq = { shot: 'edge', t: 0, total: 0, settled: 0, done: false, extra };
  void m;
  return phase === 'open' ? s : enter(s, 'lift');
}

// One frame of the sequence.
// The shutter shots follow the shutter.
// The glass shot never starts before the shutter is open.
export function stepSeq(s: Seq, dt: number, m: Lift): Seq {
  if (s.done) return s;
  const n: Seq = { ...s, t: s.t + dt, total: s.total + dt };
  switch (s.shot) {
    case 'edge': return n.t >= EDGE_CUT ? enter(n, 'slit') : n;
    case 'slit': return n.t >= SLIT_CUT ? enter(n, 'lift') : n;
    case 'lift': return n.t >= LIFT_CUT ? enter(n, 'roll') : n;
    case 'roll':
      // The roll never gives way early.
      // A short lift then gives the glass a smaller entry.
      if ((n.t >= ROLL_MIN && dueIn(m) <= 0) || n.t >= ROLL_MAX) return enter(n, 'glass');
      return n;
    case 'glass': {
      const settled = m.altLeft <= SETTLE ? s.settled + dt : 0;
      const end = settled >= GLASS_HOLD - 1e-9 || n.t >= GLASS_MAX;
      if (end && s.extra) return enter(n, 'mirror');
      return { ...n, settled, done: end };
    }
    case 'mirror': return { ...n, done: n.t >= MIRROR_S };
  }
}

/* ---------- the film cadence: the cuts render 30 frames a second ---------- */
// Tom, 2026-11-23: "make the cuts 30 fps", with frame blending.
export const CUT_FPS = 30;
// acc: real seconds since the last rendered beat.
export type Cadence = { acc: number };
// One display frame: true when this frame renders.
// It renders on the frame that reaches each 1/30 s beat.
// The remainder carries over.
// So the beats keep 30 a second on any display.
// At 60 and 120 Hz a beat is 2 or 4 frames, always even.
// At 144 Hz the beats alternate 4 and 5 frames.
// The blend in view/cuts.ts hides that.
export function cadence(c: Cadence, dt: number, fps = CUT_FPS): boolean {
  const beat = 1 / fps;
  c.acc += dt;
  if (c.acc < beat - 1e-6) return false;
  c.acc -= beat;
  // The carry stays under one display frame.
  // So a stall or the first frame never makes a burst.
  if (c.acc >= Math.min(dt, beat) - 1e-6) c.acc = 0;
  return true;
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
