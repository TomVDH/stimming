// The 1 m reflector's hardware: mount, camera, filter wheel, focuser, guider, cooler.
// State and physics only; os.ts draws the operator screen.
import type { Vec3 } from '../core/sky.ts';

export type Filter = 'L' | 'R' | 'G' | 'B' | 'Hα';

// The camera's sensor in pixels; each pixel is 3.76 um.
export const SENSOR_W = 6248;
export const SENSOR_H = 4176;
// One pixel's angle at 3 m focal length, in radians.
export const PIXEL_RAD = 3.76e-6 / 3.0;
export const PIXEL_ARCSEC = (PIXEL_RAD * 180 * 3600) / Math.PI;
// The focal ratio sets how fast a star blurs out of focus.
const F_RATIO = 3;
// One focuser step moves the camera 1 um.
const STEP_UM = 1;
// The sky stays in focus at this position when the tube is cold.
const BEST0 = 25000;
const AMBIENT = 8;

// Filter weights on linear R, G and B light, per channel.
export const FILTERS: Record<Filter, [number, number, number]> = {
  L: [0.34, 0.36, 0.3],
  R: [0.31, 0.02, 0],
  G: [0.02, 0.31, 0.02],
  B: [0, 0.03, 0.31],
  // A 7 nm hydrogen filter passes a sliver of the band.
  'Hα': [0.012, 0, 0],
};

// The software shows each filter's picture in that filter's colour.
// L stays grey: it passes all the light.
export const TINTS: Record<Filter, [number, number, number]> = {
  L: [1, 1, 1],
  R: [1, 0.32, 0.26],
  G: [0.34, 1, 0.4],
  B: [0.38, 0.56, 1],
  'Hα': [1, 0.2, 0.28],
};

export const rig = {
  /* camera */
  looping: true,
  liveStack: true,
  exposure: 5,
  filter: 'L' as Filter,
  coolerSet: -10,
  sensorTemp: AMBIENT,
  coolerPower: 0,
  /* the view: zoom over fit, pan as tangent offsets in radians */
  zoom: 1,
  panX: 0,
  panY: 0,
  overlay: { cross: true, stars: false, labels: false },
  // Past 1:1, drizzle draws detail finer than a sensor pixel.
  drizzle: true,
  /* mount */
  tracking: true,
  jog: { n: 0, e: 0 },
  slew: null as null | { from: Vec3; to: Vec3; t: number; dur: number },
  /* focuser */
  focus: BEST0 + 160,
  best: BEST0,
  autofocus: false,
  /* guider: errors in arcsec, one sample per second */
  guiding: true,
  errRA: 0,
  errDec: 0,
  guideClock: 0,
  guideT: 0,
  history: [] as [number, number][],
};

const gauss = (): number => Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(6.2831853 * Math.random());

// The out-of-focus blur radius in arcsec.
export function defocusArcsec(): number {
  const um = Math.abs(rig.focus - rig.best) * STEP_UM;
  return (um / (2 * F_RATIO)) / 3.76 * PIXEL_ARCSEC;
}

// Half-flux radius in sensor pixels for a seeing FWHM in arcsec.
// A focuser at pos gives the V-curve; noise makes it a real measurement.
export function hfrAt(pos: number, fwhm: number, noisy = true): number {
  const um = Math.abs(pos - rig.best) * STEP_UM;
  const blur = (um / (2 * F_RATIO)) / 3.76;
  const seeing = (0.55 * fwhm) / PIXEL_ARCSEC;
  const h = Math.hypot(seeing, 0.62 * blur);
  return noisy ? h * (1 + 0.03 * gauss()) : h;
}

// Advances the hardware by dt seconds.
export function stepRig(dt: number): void {
  // The tube cools through the night, so focus creeps.
  rig.best += 0.12 * dt;
  // The cooler pulls the sensor down at about 0.5 degrees a second.
  const d = rig.coolerSet - rig.sensorTemp;
  rig.sensorTemp += Math.max(-0.5 * dt, Math.min(0.5 * dt, d));
  rig.coolerPower = Math.max(0, Math.min(100, 25 + (AMBIENT - rig.sensorTemp) * 3.2 + (Math.abs(d) > 0.3 ? 30 : 0)));
  // The guider reads the star once a second.
  rig.guideClock += dt;
  while (rig.guideClock >= 1) {
    rig.guideClock -= 1;
    rig.guideT += 1;
    if (rig.guiding) {
      rig.errRA = 0.6 * rig.errRA + 0.32 * gauss();
      rig.errDec = 0.6 * rig.errDec + 0.26 * gauss();
    } else {
      // The worm gear's periodic error, and a slow drift in Dec.
      rig.errRA += (7 * 2 * Math.PI / 480) * Math.cos((2 * Math.PI * rig.guideT) / 480) + 0.15 * gauss();
      rig.errDec += 0.06 + 0.08 * gauss();
    }
    rig.history.push([rig.errRA, rig.errDec]);
    if (rig.history.length > 120) rig.history.shift();
  }
}

// Dark current in electrons per second per pixel: it doubles every 6 degrees.
export const darkRate = (): number => 0.002 * Math.pow(2, (rig.sensorTemp + 10) / 6);

// Guide RMS over the history, in arcsec: RA, Dec, total.
export function guideRms(): [number, number, number] {
  const h = rig.history.slice(-60);
  if (!h.length) return [0, 0, 0];
  const ra = Math.sqrt(h.reduce((s, v) => s + v[0] * v[0], 0) / h.length);
  const dec = Math.sqrt(h.reduce((s, v) => s + v[1] * v[1], 0) / h.length);
  return [ra, dec, Math.hypot(ra, dec)];
}
