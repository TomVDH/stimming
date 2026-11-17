// The telescope machine: shutter, main dome, tube. Pure; a test steps it by hand.
// Angles are in degrees. The loop feeds it the target's sky position each step.
import type { Star } from './catalog.ts';
import { azDelta, stepAxis } from './dome.ts';

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
  shutter01: number;
  tracking: boolean;
  // True while any axis or the shutter moves.
  readonly moving: boolean;
  pick(s: Star): void;
  // Back to aim. Only a lost machine leaves its target this way.
  release(): void;
  step(dt: number, ctx: MachineCtx): void;
};

const CUPOLA_CAP = 3, CUPOLA_ACCEL = 1.5;
const TUBE_CAP = 2, TUBE_ACCEL = 1;
// The shutter takes this many seconds.
const SHUTTER_S = 4;
// Within this many degrees on every axis, the machine tracks.
const ARRIVE = 0.2;
// The cupola waits until the star is this far off the slit, then steps after it.
const CUPOLA_BAND = 1;
// A tracking tube off by more than this goes back to slew.
const LOSE_TRACK = 2;
// A target under this altitude is lost.
const MIN_ALT = 5;
// The tube rests at 45 degrees with the shutter open, parks at 30 with it shut.
// These match TUBE_REST_ALT and TUBE_PARK_ALT in world/observatory.ts.
const REST_ALT = 45, PARK_ALT = 30;

const ease = (k: number): number => k * k * (3 - 2 * k);
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

export function makeMachine(opts: { az?: number; shutter01?: number } = {}): Machine {
  // Open progress, 0 to 1; the shutter eases it.
  let openP = opts.shutter01 ?? 0;
  // Velocities of the cupola, the tube altitude and the tube azimuth.
  let vC = 0, vA = 0, vZ = 0;
  // The cupola is stepping after a star that left the band.
  let catching = false;

  const m: Machine = {
    phase: 'aim',
    target: null,
    cupolaAz: opts.az ?? 0,
    tubeAlt: openP >= 1 ? REST_ALT : PARK_ALT,
    tubeAz: opts.az ?? 0,
    shutter01: ease(openP),
    tracking: false,
    get moving() { return vC !== 0 || vA !== 0 || vZ !== 0 || this.phase === 'open'; },
    pick(s) {
      m.target = s;
      m.tracking = false;
      catching = false;
      m.phase = openP >= 1 ? 'slew' : 'open';
    },
    release() {
      m.phase = 'aim';
      m.target = null;
      m.tracking = false;
      catching = false;
    },
    step(dt, ctx) {
      const { targetAlt: tAlt, targetAz: tAz } = ctx;
      const cupola = (az: number, cap: number, acc: number) => {
        const s = stepAxis(m.cupolaAz, az, vC, dt, cap, acc, true);
        m.cupolaAz = s.pos; vC = s.vel;
      };
      const tubeAlt = (alt: number, cap: number, acc: number) => {
        const s = stepAxis(m.tubeAlt, alt, vA, dt, cap, acc, false);
        m.tubeAlt = s.pos; vA = s.vel;
      };
      const tubeAz = (az: number, cap: number, acc: number) => {
        const s = stepAxis(m.tubeAz, az, vZ, dt, cap, acc, true);
        m.tubeAz = s.pos; vZ = s.vel;
      };
      const restAlt = openP >= 1 ? REST_ALT : PARK_ALT;

      const chasing = m.phase === 'slew' || m.phase === 'track' || m.phase === 'hold';
      if (chasing && tAlt < MIN_ALT) {
        m.phase = 'lost'; m.tracking = false; catching = false;
      } else if (chasing) {
        // Fast time: stop and wait. A slow sky starts the slew again.
        if (ctx.trails) { m.phase = 'hold'; m.tracking = false; vC = vA = vZ = 0; return; }
        if (m.phase === 'hold') { m.phase = 'slew'; return; }
      }

      switch (m.phase) {
        case 'aim': {
          if (ctx.aimAz !== undefined) cupola(ctx.aimAz, CUPOLA_CAP, CUPOLA_ACCEL);
          tubeAlt(restAlt, TUBE_CAP, TUBE_ACCEL);
          m.tubeAz = m.cupolaAz;
          break;
        }
        case 'open': {
          openP = Math.min(1, openP + dt / SHUTTER_S);
          m.shutter01 = ease(openP);
          m.tubeAz = m.cupolaAz;
          if (openP >= 1) m.phase = 'slew';
          break;
        }
        case 'slew': {
          // The faster axis slows, so the dome and the tube arrive together.
          const tc = Math.abs(azDelta(m.cupolaAz, tAz)) / CUPOLA_CAP;
          const tt = Math.max(Math.abs(tAlt - m.tubeAlt), Math.abs(azDelta(m.tubeAz, tAz))) / TUBE_CAP;
          const t = Math.max(tc, tt, 1e-9);
          const kc = clamp(tc / t, 0.1, 1), kt = clamp(tt / t, 0.1, 1);
          cupola(tAz, CUPOLA_CAP * kc, CUPOLA_ACCEL * kc);
          tubeAlt(tAlt, TUBE_CAP * kt, TUBE_ACCEL * kt);
          tubeAz(tAz, TUBE_CAP * kt, TUBE_ACCEL * kt);
          if (Math.abs(azDelta(m.cupolaAz, tAz)) < ARRIVE && Math.abs(tAlt - m.tubeAlt) < ARRIVE
            && Math.abs(azDelta(m.tubeAz, tAz)) < ARRIVE) {
            m.phase = 'track'; m.tracking = true; vC = vA = vZ = 0;
          }
          break;
        }
        case 'track': {
          tubeAlt(tAlt, TUBE_CAP, TUBE_ACCEL);
          tubeAz(tAz, TUBE_CAP, TUBE_ACCEL);
          const off = Math.abs(azDelta(m.cupolaAz, tAz));
          if (off > CUPOLA_BAND) catching = true;
          if (catching) {
            cupola(tAz, CUPOLA_CAP, CUPOLA_ACCEL);
            if (Math.abs(azDelta(m.cupolaAz, tAz)) < ARRIVE) { catching = false; vC = 0; }
          }
          // A long sleep leaves the tube behind: slew to the star again.
          if (Math.abs(tAlt - m.tubeAlt) > LOSE_TRACK || Math.abs(azDelta(m.tubeAz, tAz)) > LOSE_TRACK) {
            m.phase = 'slew'; m.tracking = false;
          }
          break;
        }
        case 'lost': {
          tubeAlt(PARK_ALT, TUBE_CAP, TUBE_ACCEL);
          break;
        }
        default: break;
      }
    },
  };
  return m;
}
