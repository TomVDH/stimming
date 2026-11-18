// The opening: the golden hour into night before play.
// The module is pure.
// A test steps it by hand.
// Times are in seconds from the page load.
import type { Clock } from './clock.ts';

// The golden hour to full night takes this long.
export const OPENING_S = 10;
// A tap or Esc reaches night in this time.
export const SKIP_S = 0.8;
// After night, the beam fades in over this time.
export const BEAM_S = 1;
// The sun sinks from 3 degrees above the horizon to 18 below.
// The western ridge hides it, so only its light shows.
// At 18 degrees below, the night is full.
export const SUN_START = 3, SUN_END = -18;
// The faintest star that shows rises from magnitude -2.5 to 6.5.
// At -2.5 no star shows.
export const MAG_START = -2.5, MAG_END = 6.5;
// The first stars show from this time.
// The limit reaches MAG_END at STARS_TO.
const STARS_FROM = 2, STARS_TO = 8.5;
// The sky clock's top speed, in sky seconds per real second.
// It stays under the trail speed, 120.
export const PEAK_SPEED = 110;
// The clock holds its top speed until HOLD_S.
// Then it eases to speed 1 at full night.
export const HOLD_S = 8.5;
// A streak shows the sky's turn over this many real seconds.
// Only the turn past real time counts.
// So a streak is zero at speed 1.
// It does not follow the opening's length.
export const EXPOSURE_S = 8;
// The lamps come on between these times.
// Each lamp takes LAMP_RAMP seconds to reach full.
export const LAMP_FROM = 5, LAMP_TO = 8.5, LAMP_RAMP = 0.3;

const END = OPENING_S + BEAM_S;
// The sky turns this many degrees per second at speed 1.
const SIDEREAL = 360 / 86164.0905;
// The clock's ease from the peak to speed 1 takes this long.
const EASE_S = OPENING_S - HOLD_S;
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (k: number): number => k * k * (3 - 2 * k);
// The inverse of ease on 0 to 1.
const unease = (y: number): number => 0.5 - Math.sin(Math.asin(1 - 2 * clamp01(y)) / 3);
// The clock's ease is smoother at its ends.
// So the streaks settle without a jerk.
const smoother = (k: number): number => k * k * k * (k * (6 * k - 15) + 10);
// The area under 1 - smoother from u to 1.
// It is 0.5 at u = 0.
// It is 0 at u = 1.
const smootherRest = (u: number): number => 0.5 - u + u ** 4 * (2.5 - 3 * u + u * u);

// The clock's speed above 1, as a share of the peak's, at time t.
function fast(t: number): number {
  return t <= HOLD_S ? 1 : 1 - smoother(clamp01((t - HOLD_S) / EASE_S));
}
const speedAt = (t: number): number => 1 + (PEAK_SPEED - 1) * fast(t);
// The streak at time t, in degrees of the sky's turn.
const streakAt = (t: number): number => (speedAt(t) - 1) * EXPOSURE_S * SIDEREAL;

// The streak for a dusk w, in degrees of the sky's turn.
// The sun follows ease, so w gives the time back.
// The renderer reads dusk() alone, so it uses this.
export function streakForDusk(w: number): number {
  return w <= 0 ? 0 : streakAt(OPENING_S * unease(1 - w));
}

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
  // It is linear in the sun's altitude.
  dusk(): number;
  magLimit(): number;
  speed(): number;
  // How far the sky runs behind real time, in ms.
  lagMs(): number;
  // The star streak, in degrees of the sky's turn.
  streak(): number;
  // Lamp i of n: 0 off, 1 full.
  lamp(i: number, n: number): number;
  beam(): number;
};

export function makeOpening(reduced: boolean): Opening {
  // Reduced motion opens at night.
  let t = reduced ? END : 0;
  let skipping = false, skipFrom = 0, skipK = 0;
  // Progress through the opening, linear in time.
  const p = (): number => clamp01(t / OPENING_S);
  // The sun's descent eases in and out.
  const e = (): number => ease(p());
  // The stars come out fast, then slower.
  const stars = (): number => {
    const q = clamp01((t - STARS_FROM) / (STARS_TO - STARS_FROM));
    return 1 - (1 - q) ** 3;
  };

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
    magLimit: () => MAG_START + (MAG_END - MAG_START) * stars(),
    speed: () => speedAt(t),
    // The lag is what the fast clock still gains before night.
    // So the sky reaches real time at full night.
    lagMs: () => {
      const hold = Math.max(0, HOLD_S - t);
      const rest = EASE_S * smootherRest(clamp01((t - HOLD_S) / EASE_S));
      return (PEAK_SPEED - 1) * (hold + rest) * 1000;
    },
    streak: () => streakAt(t),
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
