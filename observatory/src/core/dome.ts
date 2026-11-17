// Dome and telescope motion maths. Angles are in degrees.
import type { AltAz } from './sky.ts';

// Keeps the aim between 5 and 85 degrees of altitude.
export function clampAim(a: AltAz): AltAz {
  return { alt: Math.min(85, Math.max(5, a.alt)), az: a.az };
}

// Signed short way from one azimuth to another, -180 to 180.
export function azDelta(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

// One step of a speed-capped axis. It brakes in time: v^2 = 2 * accel * distance.
export function stepAxis(
  cur: number, target: number, vel: number, dt: number,
  cap: number, accel: number, wrap: boolean,
): { pos: number; vel: number } {
  const err = wrap ? azDelta(cur, target) : target - cur;
  const want = Math.sign(err) * Math.min(cap, Math.sqrt(2 * accel * Math.abs(err)));
  const dv = accel * dt;
  const v = vel + Math.max(-dv, Math.min(dv, want - vel));
  const move = v * dt;
  // The step reaches or passes the target: land on it.
  if (Math.abs(move) >= Math.abs(err) && Math.sign(move) === Math.sign(err)) {
    return { pos: wrap ? ((target % 360) + 360) % 360 : target, vel: 0 };
  }
  const pos = cur + move;
  return { pos: wrap ? ((pos % 360) + 360) % 360 : pos, vel: v };
}
