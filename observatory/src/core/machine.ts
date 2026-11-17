// The telescope machine: shutter, main dome, tube. Pure; a test steps it by hand.
// Angles are in degrees. The loop feeds it the target's sky position each step.
// Each part is a heavy axis or a heavy shutter from dome.ts.
// No phase change stops a part at once: each one runs down.
import type { Star } from './catalog.ts';
import {
  atRest, azDelta, brakeAxis, leadOf, lockAxis, makeAxis, makeShutter, settled, shutterAtRest,
  stepAxis, stepShutter, unlockAxis, type Axis, type Limits, type Shutter,
} from './dome.ts';

export type Phase = 'aim' | 'open' | 'slew' | 'track' | 'hold' | 'lost';
export type MachineCtx = {
  targetAlt: number;
  targetAz: number;
  // True when the sky runs fast enough to draw trails.
  trails: boolean;
  // In aim, the cupola turns after this azimuth.
  aimAz?: number;
};
export type Machine = {
  phase: Phase;
  target: Star | null;
  cupolaAz: number;
  tubeAlt: number;
  tubeAz: number;
  // The shutter for the models, 0 to 1.
  shutter01: number;
  tracking: boolean;
  // True while any axis or the shutter moves.
  readonly moving: boolean;
  // The axes and the shutter, for tests and QA.
  readonly axes: { readonly cupola: Readonly<Axis>; readonly alt: Readonly<Axis>; readonly az: Readonly<Axis> };
  readonly shutter: Readonly<Shutter>;
  pick(s: Star): void;
  // Back to aim. Only a lost machine leaves its target this way.
  release(): void;
  // Back to aim, then the shutter shuts and the tube parks.
  // Only the ?cuts review switch calls it.
  shut(): void;
  step(dt: number, ctx: MachineCtx): void;
};

// Tom, 2026-11-17: the cupola runs at 2 degrees a second.
// It speeds up and slows down at 0.6 degrees a second squared.
export const CUPOLA: Limits = { cap: 2, accel: 0.6, wrap: true };
// The tube runs at 1.5 degrees a second on both axes.
// It speeds up and slows down at 0.5 degrees a second squared.
export const TUBE: Limits = { cap: 1.5, accel: 0.5, wrap: false };
const TUBE_AZ: Limits = { ...TUBE, wrap: true };
// The tube parks low.
// So each pick lifts it from below into the slit.
// world/observatory.ts takes this value from here.
export const TUBE_PARK_ALT = 5;
// The tube starts to lift when the shutter is half open.
export const LIFT_AT = 0.5;
// The shutter shuts only once the tube is under this altitude.
export const TUBE_CLEAR_ALT = 20;
// A target faster than this has jumped to a new place.
const RATE_MAX = 1;
// The cupola waits until the star is this far off the slit, then steps after it.
const CUPOLA_BAND = 1;
// A tracking tube off by more than this goes back to slew.
const LOSE_TRACK = 2;
// A target under this altitude is lost.
const MIN_ALT = 5;

// An angle in 0 to 360 stays exact.
// So a rest compares equal.
const wrap360 = (x: number): number => (x >= 0 && x < 360 ? x : ((x % 360) + 360) % 360);

export function makeMachine(opts: { az?: number; shutter01?: number } = {}): Machine {
  const sh = makeShutter(opts.shutter01 ?? 0);
  // The shutter's goal: 1 after a pick, 0 after shut().
  let goal = sh.p >= 1 ? 1 : 0;
  const cup = makeAxis(opts.az ?? 0);
  const alt = makeAxis(TUBE_PARK_ALT);
  const az = makeAxis(opts.az ?? 0);
  // Outside track the tube az rides the cupola.
  // So it stays in the slit.
  // off holds its lead over the cupola.
  const off = makeAxis(0);
  let riding = true;
  // The cupola is stepping after a star that left the band.
  let catching = false;
  // The star's last place, and its speed in altitude and azimuth.
  let pAlt = NaN, pAz = NaN, rAlt = 0, rAz = 0;
  // In track the tube locks on the creeping star.
  // A locked tube reports no speed, so the loop can sleep.
  let locked = false;

  // The tube az joins the cupola.
  // off takes the tube's lead and speed over the cupola.
  const join = (): void => leadOf(az, cup, off);
  // A riding tube az is the cupola plus its lead.
  const ride = (): void => {
    az.pos = wrap360(cup.pos + off.pos); az.vel = cup.vel + off.vel;
    az.drv = wrap360(cup.drv + off.drv); az.dvel = cup.dvel + off.dvel;
  };
  // The models never see the tube under its park.
  // A lowering tube settles a hair below it, so this clamps that.
  const tubeAlt = (): number => Math.max(TUBE_PARK_ALT, alt.pos);

  const m: Machine = {
    phase: 'aim',
    target: null,
    cupolaAz: cup.pos,
    tubeAlt: tubeAlt(),
    tubeAz: az.pos,
    shutter01: sh.value,
    tracking: false,
    get moving() {
      return !atRest(cup) || !atRest(alt) || !atRest(az) || !shutterAtRest(sh) || sh.p !== goal || this.phase === 'open';
    },
    axes: { cupola: cup, alt, az },
    shutter: sh,
    pick(s) {
      m.target = s;
      // A new star has no speed yet.
      pAlt = pAz = NaN;
      m.tracking = false;
      catching = false;
      goal = 1;
      m.phase = sh.p === 1 ? 'slew' : 'open';
    },
    release() {
      m.phase = 'aim';
      m.target = null;
      m.tracking = false;
      catching = false;
    },
    shut() {
      m.release();
      goal = 0;
    },
    step(dt, ctx) {
      const { targetAlt: tAlt, targetAz: tAz } = ctx;
      // The star's speed from its last place.
      // A jump means a new target or a wake, not a speed.
      let nAlt = 0, nAz = 0, steady = false;
      if (dt > 0) {
        if (Number.isFinite(pAlt)) {
          nAlt = (tAlt - pAlt) / dt;
          nAz = azDelta(pAz, tAz) / dt;
          // A star is not steady if it outruns the tube's acceleration.
          steady = Math.abs(nAlt) <= RATE_MAX && Math.abs(nAz) <= RATE_MAX
            && Math.abs(nAlt - rAlt) <= TUBE.accel * dt && Math.abs(nAz - rAz) <= TUBE.accel * dt;
        }
        pAlt = tAlt; pAz = tAz;
      }
      const chasing = m.phase === 'slew' || m.phase === 'track' || m.phase === 'hold';
      if (chasing && tAlt < MIN_ALT) {
        m.phase = 'lost'; m.tracking = false; catching = false;
      } else if (chasing && ctx.trails) {
        // Fast time: run down and wait.
        m.phase = 'hold'; m.tracking = false;
      } else if (m.phase === 'hold') {
        // A slow sky starts the slew again in this same step.
        m.phase = 'slew';
      }
      // A locked tube leaves the lock at the star's last speed.
      // So nothing steps.
      if (locked && (m.phase !== 'track' || (dt > 0 && !steady))) {
        unlockAxis(alt, rAlt);
        unlockAxis(az, rAz);
        locked = false;
      }
      if (dt > 0) {
        const fast = !(Math.abs(nAlt) <= RATE_MAX && Math.abs(nAz) <= RATE_MAX);
        rAlt = fast ? 0 : nAlt; rAz = fast ? 0 : nAz;
      }
      const rides = m.phase !== 'track';
      if (rides && !riding) join();
      riding = rides;
      // The shutter stays open until the tube clears it.
      stepShutter(sh, goal === 0 && alt.pos >= TUBE_CLEAR_ALT ? 1 : goal, dt);

      switch (m.phase) {
        case 'aim': {
          if (ctx.aimAz !== undefined) stepAxis(cup, ctx.aimAz, dt, CUPOLA);
          else brakeAxis(cup, dt, CUPOLA);
          stepAxis(alt, TUBE_PARK_ALT, dt, TUBE);
          stepAxis(off, 0, dt, TUBE);
          break;
        }
        case 'open': {
          // The cupola runs down while the shutter opens.
          brakeAxis(cup, dt, CUPOLA);
          // The tube lifts at its own pace from the half-open shutter.
          if (sh.value >= LIFT_AT) stepAxis(alt, tAlt, dt, TUBE);
          else brakeAxis(alt, dt, TUBE);
          stepAxis(off, 0, dt, TUBE);
          if (sh.p === 1) m.phase = 'slew';
          break;
        }
        case 'slew': {
          // The cupola and the tube altitude each run at their own limits.
          // The tube az rides the cupola until both have arrived.
          stepAxis(cup, tAz, dt, CUPOLA, 1, rAz);
          stepAxis(alt, tAlt, dt, TUBE, 1, rAlt);
          stepAxis(off, 0, dt, TUBE);
          // Track starts once both move with the star, with no lead.
          if (settled(cup, tAz, rAz, true) && settled(alt, tAlt, rAlt, false) && atRest(off) && off.pos === 0) {
            m.phase = 'track'; m.tracking = true;
          }
          break;
        }
        case 'track': {
          // The tube az leaves the cupola on the star.
          // So it takes no step.
          // A settled tube on a steady star locks on it.
          if (!locked && steady && settled(alt, tAlt, rAlt, false) && settled(az, tAz, rAz, true)) locked = true;
          if (locked) {
            lockAxis(alt, tAlt, false);
            lockAxis(az, tAz, true);
          } else {
            stepAxis(alt, tAlt, dt, TUBE, 1, rAlt);
            stepAxis(az, tAz, dt, TUBE_AZ, 1, rAz);
          }
          if (Math.abs(azDelta(cup.pos, tAz)) > CUPOLA_BAND) catching = true;
          if (catching) {
            stepAxis(cup, tAz, dt, CUPOLA, 1, rAz);
            // On the star, the cupola stops and waits for the next step.
            if (settled(cup, tAz, rAz, true)) catching = false;
          } else brakeAxis(cup, dt, CUPOLA);
          // A long sleep leaves the tube behind: slew to the star again.
          if (Math.abs(tAlt - alt.pos) > LOSE_TRACK || Math.abs(azDelta(az.pos, tAz)) > LOSE_TRACK) {
            m.phase = 'slew'; m.tracking = false;
          }
          break;
        }
        case 'hold': {
          brakeAxis(cup, dt, CUPOLA);
          brakeAxis(alt, dt, TUBE);
          brakeAxis(off, dt, TUBE);
          break;
        }
        case 'lost': {
          // The tube lowers to its park.
          // The cupola and the tube az run down where they stand.
          stepAxis(alt, TUBE_PARK_ALT, dt, TUBE);
          brakeAxis(cup, dt, CUPOLA);
          brakeAxis(off, dt, TUBE);
          break;
        }
        default: break;
      }
      if (riding) ride();
      m.cupolaAz = cup.pos;
      m.tubeAlt = tubeAlt();
      m.tubeAz = az.pos;
      m.shutter01 = sh.value;
    },
  };
  return m;
}
