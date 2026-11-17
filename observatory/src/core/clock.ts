// The sky clock. Sky time is real time at speed 1; a higher speed runs the sky faster.
// Time comes in through nowMs, so a test can move it by hand.

// Sky seconds per real second. At or above this, the stars draw trails.
export const TRAIL_SPEED = 120;
// A wake eases the sky to real time in this many seconds.
const EASE_S = 1;
// A step older than this many ms means the loop was asleep.
const SLEEP_GAP_MS = 1000;

export type Clock = {
  skyMs(): number;
  speed: number;
  setSpeed(x: number): void;
  trails(): boolean;
  easing(): boolean;
  wake(): void;
  step(dtReal: number): void;
};

export function makeClock(nowMs: () => number): Clock {
  let speed = 1;
  // Sky time is anchorSky plus the real time since anchorReal, times speed.
  let anchorReal = nowMs(), anchorSky = anchorReal;
  // What the last step showed, and when. A gap since then means the loop slept.
  let lastStepReal = anchorReal, shown = anchorSky;
  // The wake catch-up: the sky starts off0 ms behind and closes that over EASE_S.
  let off0 = 0, p = 1;

  const base = (): number => anchorSky + (nowMs() - anchorReal) * speed;
  const offset = (): number => {
    const k = Math.min(1, p);
    return off0 * (1 - k * k * (3 - 2 * k));
  };
  const skyMs = (): number => base() + offset();

  return {
    skyMs,
    get speed() { return speed; },
    set speed(x: number) { this.setSpeed(x); },
    setSpeed(x) {
      // Re-anchor so the sky time does not jump.
      const now = nowMs(), s = base();
      anchorReal = now; anchorSky = s; speed = x;
    },
    trails: () => speed >= TRAIL_SPEED,
    easing: () => p < 1,
    wake() {
      if (nowMs() - lastStepReal < SLEEP_GAP_MS) return;
      off0 = shown - base(); p = 0;
    },
    step(dtReal) {
      if (p < 1) p = Math.min(1, p + dtReal / EASE_S);
      lastStepReal = nowMs(); shown = skyMs();
    },
  };
}
