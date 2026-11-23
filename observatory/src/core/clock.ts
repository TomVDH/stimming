// The sky clock.
// Sky time is real time at speed 1.
// A higher speed runs the sky faster.
// Time comes in through nowMs.
// So a test can move it by hand.

// Sky seconds per real second.
// At or above this speed, the stars draw trails.
export const TRAIL_SPEED = 120;
// A wake eases the sky to real time in this many seconds.
const EASE_S = 1;
// A step older than this many ms means the loop was asleep.
const SLEEP_GAP_MS = 1000;

export type Clock = {
  skyMs(): number;
  speed: number;
  setSpeed(x: number): void;
  setLag(ms: number): void;
  trails(): boolean;
  easing(): boolean;
  wake(): void;
  step(dtReal: number): void;
  shiftTo(ms: number, easeS: number): void;
  shifting(): boolean;
  shiftRate(): number;
};

export function makeClock(nowMs: () => number): Clock {
  let speed = 1;
  // Sky time is anchorSky plus the real time since anchorReal, times speed.
  let anchorReal = nowMs(), anchorSky = anchorReal;
  // What the last step showed, and when.
  // A gap since then means the loop slept.
  let lastStepReal = anchorReal, shown = anchorSky;
  // Before the first step, a wake has nothing to ease.
  let stepped = false;
  // The wake catch-up: the sky starts off0 ms behind.
  // It closes the gap over EASE_S.
  let off0 = 0, p = 1;
  // The named night: the sky runs shift ms from real time.
  // A change eases from sh0 to sh1 over shS seconds.
  let sh0 = 0, sh1 = 0, shS = 0, q = 1;

  const base = (): number => anchorSky + (nowMs() - anchorReal) * speed;
  const offset = (): number => {
    const k = Math.min(1, p);
    return off0 * (1 - k * k * (3 - 2 * k));
  };
  const shift = (): number => sh0 + (sh1 - sh0) * smooth(q);
  const skyMs = (): number => base() + offset() + shift();

  return {
    skyMs,
    get speed() { return speed; },
    set speed(x: number) { this.setSpeed(x); },
    setSpeed(x) {
      // Re-anchor so the sky time does not jump.
      const now = nowMs(), s = base();
      anchorReal = now; anchorSky = s; speed = x;
    },
    setLag(ms) {
      // The sky runs ms behind real time.
      // The speed stays.
      // A wake ease in progress ends here.
      const now = nowMs();
      anchorReal = now; anchorSky = now - ms; off0 = 0; p = 1;
    },
    trails: () => speed >= TRAIL_SPEED,
    easing: () => p < 1,
    wake() {
      if (!stepped || nowMs() - lastStepReal < SLEEP_GAP_MS) return;
      // The shift is in the shown time already.
      off0 = shown - base() - shift(); p = 0;
    },
    step(dtReal) {
      if (p < 1) p = Math.min(1, p + dtReal / EASE_S);
      // A float sum of steps can stop just short of 1.
      if (q < 1) { q += dtReal / shS; if (q > 1 - 1e-9) q = 1; }
      lastStepReal = nowMs(); shown = skyMs(); stepped = true;
    },
    shiftTo(ms, easeS) {
      // A new shift starts from where the old one stands.
      sh0 = shift(); sh1 = ms; shS = easeS;
      q = easeS > 0 ? 0 : 1;
    },
    shifting: () => q < 1,
    // The smoothstep's slope times the mean rate, in sky s per real s.
    shiftRate: () => (q < 1 ? 6 * q * (1 - q) * (sh1 - sh0) / 1000 / shS : 0),
  };
}

// Ease in and out over 0 to 1.
function smooth(k: number): number {
  return k * k * (3 - 2 * k);
}
