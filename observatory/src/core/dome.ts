// Dome and telescope motion maths. Angles are in degrees.
// Every moving part is heavy.
// It speeds up slowly and runs down slowly.
// A part settles at each stop; it never snaps.
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

// An angle in 0 to 360 stays exact.
// So a rest compares equal.
const wrap360 = (x: number): number => (x >= 0 && x < 360 ? x : ((x % 360) + 360) % 360);

/* ---------- a heavy axis: a drive, and the load on it ---------- */
// The drive runs a trapezoid.
// It speeds up, cruises at the cap and slows down.
// It arrives on the target at zero speed.
// The load hangs on the drive by a stiff, damped spring.
// The load leans back while the drive speeds up.
// It leans forward while the drive slows down.
// So the load passes the stop a little and swings back once.
// pos and vel: the load, the part on screen.
// drv and dvel: the drive.
export type Axis = { pos: number; vel: number; drv: number; dvel: number };
// cap: top speed in degrees a second.
// accel: speed change in degrees a second squared.
// wrap: true for an azimuth, which takes the short way round.
export type Limits = { cap: number; accel: number; wrap: boolean };

// Under 0.6 degrees a second squared, the load leans 0.08 degrees.
const LEAN = 0.08 / 0.6;
const W2 = 1 / LEAN;
// The damping ratio gives one swing back.
// A second swing stays too small to see.
const DAMP = 0.7;
const C = 2 * DAMP * Math.sqrt(W2);
// Sub-steps are at most this long.
// So a slow frame moves the same as a fast one.
const SUB = 1 / 120;
// A slow drive this close to its target lands on it.
const REST_DRIVE = 0.001;
// A slow load this close to its drive rests on it.
const REST_LOAD = 0.004;

export const makeAxis = (pos: number): Axis => ({ pos, vel: 0, drv: pos, dvel: 0 });

// True when the drive and the load stand still together.
export const atRest = (a: Axis): boolean => a.vel === 0 && a.dvel === 0 && a.pos === a.drv;

// Seconds a move of d degrees takes from rest to rest.
export function moveTime(d: number, cap: number, accel: number): number {
  const x = Math.abs(d);
  return x >= cap * cap / accel ? x / cap + cap / accel : 2 * Math.sqrt(x / accel);
}

// The share of the limits that makes a move take t seconds.
// It never goes over 1.
// A move cannot run faster than its limits.
export function paceFor(d: number, cap: number, accel: number, t: number): number {
  const x = Math.abs(d);
  if (x === 0 || t <= moveTime(x, cap, accel)) return 1;
  // A short move never reaches the paced cap.
  if (t <= 2 * cap / accel) return 4 * x / (accel * t * t);
  return x / (cap * (t - cap / accel));
}

// One sub-step of the load on its spring.
function load(a: Axis, h: number, accel: number, wrap: boolean): void {
  const e = wrap ? azDelta(a.pos, a.drv) : a.drv - a.pos;
  if (a.dvel === 0 && Math.abs(e) <= REST_LOAD && Math.abs(a.vel) <= accel * h) {
    a.pos = a.drv;
    a.vel = 0;
    return;
  }
  a.vel += (W2 * e + C * (a.dvel - a.vel)) * h;
  a.pos += a.vel * h;
  if (wrap) a.pos = wrap360(a.pos);
}

// One sub-step of the drive toward a target.
// pace: a share of the cap and of the speed-up.
// Paced axes arrive together.
// A star creeps less than REST_DRIVE in a frame.
// So the drive follows it in steps, at rest between frames.
function drive(a: Axis, target: number, h: number, lim: Limits, pace: number): void {
  const err = lim.wrap ? azDelta(a.drv, target) : target - a.drv;
  const full = lim.accel * h;
  if (Math.abs(err) <= REST_DRIVE && Math.abs(a.dvel) <= full) {
    a.drv = lim.wrap ? wrap360(target) : target;
    a.dvel = 0;
    return;
  }
  const cap = lim.cap * pace, acc = lim.accel * pace;
  // The fastest speed that still stops on the target in whole steps.
  const brake = acc * h * (Math.sqrt(0.25 + 2 * Math.abs(err) / (acc * h * h)) - 0.5);
  const want = Math.sign(err) * Math.min(cap, brake);
  const dv = want - a.dvel;
  // A drive slows at its full acceleration.
  // So a paced axis never overruns its target.
  const max = Math.sign(dv) === -Math.sign(a.dvel) ? full : acc * h;
  a.dvel += Math.max(-max, Math.min(max, dv));
  a.drv += a.dvel * h;
  if (lim.wrap) a.drv = wrap360(a.drv);
}

// One frame of an axis toward a target.
export function stepAxis(a: Axis, target: number, dt: number, lim: Limits, pace = 1): void {
  // The first frame after a sleep has no time: it moves nothing.
  if (!(dt > 0)) return;
  const n = Math.max(1, Math.ceil(dt / SUB - 1e-9)), h = dt / n;
  for (let i = 0; i < n; i++) {
    drive(a, target, h, lim, pace);
    load(a, h, lim.accel, lim.wrap);
  }
}

// One frame of an axis that runs down to a stop.
export function brakeAxis(a: Axis, dt: number, lim: Limits): void {
  if (!(dt > 0)) return;
  const n = Math.max(1, Math.ceil(dt / SUB - 1e-9)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const dv = lim.accel * h;
    a.dvel = Math.abs(a.dvel) <= dv ? 0 : a.dvel - Math.sign(a.dvel) * dv;
    a.drv += a.dvel * h;
    if (lim.wrap) a.drv = wrap360(a.drv);
    load(a, h, lim.accel, lim.wrap);
  }
}

/* ---------- a heavy shutter ---------- */
// Tom, 2026-11-17: a shutter travels in 6 s, eased at both ends.
export const SHUTTER_S = 6;
// A turn back mid-way reverses the travel speed in this many seconds.
const TURN_S = 2;
// At each end stop the shutter bounces back 1 percent.
const BOUNCE = 0.01;
// The bounce lasts this many seconds.
const BOUNCE_S = 0.4;

// p: the travel, 0 shut to 1 open.
// u: the travel speed in travel a second.
// bt: the time into the bounce.
// bs: -1 bounces off the open stop, 1 off the shut stop.
// bs 0: no bounce.
// value: the eased travel and the bounce, 0 to 1.
export type Shutter = { p: number; u: number; bt: number; bs: number; value: number };

// An S-curve with zero speed and zero acceleration at both ends.
const sCurve = (p: number): number => p * p * p * (p * (6 * p - 15) + 10);

function shutterValue(s: Shutter): number {
  const bounce = s.bs * BOUNCE * Math.sin(Math.PI * s.bt / BOUNCE_S) ** 2;
  return Math.min(1, Math.max(0, sCurve(s.p) + bounce));
}

export function makeShutter(open01: number): Shutter {
  const p = Math.min(1, Math.max(0, open01));
  return { p, u: 0, bt: 0, bs: 0, value: sCurve(p) };
}

export const shutterAtRest = (s: Shutter): boolean => s.u === 0 && s.bs === 0 && (s.p === 0 || s.p === 1);

// One frame of a shutter toward a goal: 0 shut, 1 open.
export function stepShutter(s: Shutter, goal: number, dt: number): void {
  if (!(dt > 0)) return;
  const speed = 1 / SHUTTER_S;
  const want = goal > s.p ? speed : goal < s.p ? -speed : 0;
  // The S-curve is flat at an end stop.
  // So the travel starts at full speed there.
  if (s.u === 0 && (s.p === 0 || s.p === 1)) s.u = want;
  else {
    const du = 2 * speed / TURN_S * dt;
    s.u += Math.max(-du, Math.min(du, want - s.u));
  }
  if (s.bs !== 0) {
    s.bt += dt;
    if (s.bt >= BOUNCE_S) { s.bs = 0; s.bt = 0; }
  }
  s.p += s.u * dt;
  // Float sums can stop a hair short.
  // A travel that close lands on the stop.
  if (s.u > 0 && s.p >= 1 - 1e-9) { s.p = 1; s.u = 0; s.bs = -1; s.bt = 0; }
  else if (s.u < 0 && s.p <= 1e-9) { s.p = 0; s.u = 0; s.bs = 1; s.bt = 0; }
  s.value = shutterValue(s);
}
