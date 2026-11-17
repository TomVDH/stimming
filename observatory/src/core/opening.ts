// The opening: dusk into night before play.
// The module is pure.
// A test steps it by hand.
// Times are in seconds from the page load.
import type { Clock } from './clock.ts';

// Dusk to full night takes this long.
export const OPENING_S = 45;
// A tap or Esc reaches night in this time.
export const SKIP_S = 1.5;
// After night, the beam fades in over this time.
export const BEAM_S = 1;
// The sun sinks from 4 to 18 degrees below the horizon.
// At 18 degrees below, the night is full.
export const SUN_START = -4, SUN_END = -18;
// The faintest star that shows rises from magnitude 0 to 6.5.
export const MAG_START = 0, MAG_END = 6.5;
// The sky clock's top speed, in sky seconds per real second.
// It stays under the trail speed, 120.
export const PEAK_SPEED = 100;
// The lamps come on between these times.
// Each lamp takes LAMP_RAMP seconds to reach full.
export const LAMP_FROM = 14, LAMP_TO = 38, LAMP_RAMP = 1.2;

const END = OPENING_S + BEAM_S;
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (k: number): number => k * k * (3 - 2 * k);
// The area under 1 - ease from u to 1.
// It is 0.5 at u = 0.
// It is 0 at u = 1.
const easeRest = (u: number): number => 0.5 - u + u * u * u - u * u * u * u / 2;

export type Opening = {
  // Seconds on the opening's timeline.
  readonly t: number;
  // True until full night: no beam, no aim, no pick.
  readonly locked: boolean;
  // True once the beam is full.
  // Then the opening does nothing.
  readonly done: boolean;
  readonly skipping: boolean;
  step(dt: number): void;
  // Starts the eased skip to night.
  // It gives false when there is nothing to skip.
  skip(): boolean;
  // QA: puts the timeline at a time.
  seek(t: number): void;
  sunAlt(): number;
  // 1 at the start, 0 at full night.
  dusk(): number;
  magLimit(): number;
  speed(): number;
  // How far the sky runs behind real time, in ms.
  lagMs(): number;
  // Lamp i of n: 0 off, 1 full.
  lamp(i: number, n: number): number;
  beam(): number;
};

export function makeOpening(reduced: boolean): Opening {
  // Reduced motion opens at night.
  let t = reduced ? END : 0;
  let skipping = false, skipFrom = 0, skipK = 0;
  // Progress through the dusk, linear in time.
  const p = (): number => clamp01(t / OPENING_S);
  // The sun's descent eases in and out.
  const e = (): number => ease(p());

  return {
    get t() { return t; },
    get locked() { return t < OPENING_S; },
    get done() { return t >= END; },
    get skipping() { return skipping; },
    step(dt) {
      if (t >= END) return;
      if (skipping) {
        skipK = Math.min(1, skipK + dt / SKIP_S);
        // Float steps can stop a hair short of 1.
        if (skipK > 1 - 1e-9) skipK = 1;
        t = skipFrom + (OPENING_S - skipFrom) * ease(skipK);
        if (skipK === 1) { t = OPENING_S; skipping = false; }
        return;
      }
      t = Math.min(END, t + dt);
    },
    skip() {
      if (skipping || t >= OPENING_S) return false;
      skipping = true; skipFrom = t; skipK = 0;
      return true;
    },
    seek(x) {
      skipping = false;
      t = Math.min(END, Math.max(0, x));
    },
    sunAlt: () => SUN_START + (SUN_END - SUN_START) * e(),
    dusk: () => 1 - e(),
    magLimit: () => MAG_START + (MAG_END - MAG_START) * e(),
    speed: () => 1 + (PEAK_SPEED - 1) * (1 - e()),
    // The lag is what the fast clock still gains before night.
    // So the sky reaches real time at full night.
    lagMs: () => (PEAK_SPEED - 1) * OPENING_S * 1000 * easeRest(p()),
    lamp(i, n) {
      const at = n > 1 ? LAMP_FROM + (LAMP_TO - LAMP_FROM) * i / (n - 1) : LAMP_FROM;
      return clamp01((t - at) / LAMP_RAMP);
    },
    beam: () => clamp01((t - OPENING_S) / BEAM_S),
  };
}

// Sets the sky clock from the opening while it runs.
export function driveClock(op: Opening, clock: Clock): void {
  clock.setSpeed(op.speed());
  clock.setLag(op.lagMs());
}

const RAD = Math.PI / 180;

// Tonight's sunset azimuth in degrees, from north through east.
// The solar declination comes from the day of the year.
export function sunsetAz(date: Date, lat: number): number {
  const y0 = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = (date.getTime() - y0) / 86400000 + 1;
  const dec = -23.44 * RAD * Math.cos((2 * Math.PI / 365) * (day + 10));
  // The sun's centre sets 0.833 degrees below the horizon, with refraction.
  const h = -0.833 * RAD, phi = lat * RAD;
  const c = (Math.sin(dec) - Math.sin(phi) * Math.sin(h)) / (Math.cos(phi) * Math.cos(h));
  return 360 - Math.acos(Math.min(1, Math.max(-1, c))) / RAD;
}
