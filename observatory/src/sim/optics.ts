// Telescope optics: the tube's pose, the eyepieces, the camera and the light.
// Angles are in degrees. Azimuth runs from north through east.
// Scene axes here: x east, y up, z north.
import { skyRows, type Vec3 } from '../core/sky.ts';

export type Pose = { alt: number; az: number };
export type Frame = { r: Vec3; u: Vec3; f: Vec3 };
export type Eyepiece = { label: string; mm: number; afov: number };

const RAD = Math.PI / 180;

// Copied from sky/stars.ts, LAT and LON: the site's latitude and longitude.
export const LAT = 51;
export const LON = 0;

// The tube stops at these altitudes, so the field never reaches the horizon.
export const ALT_MIN = 10;
export const ALT_MAX = 88;

// The simulated refractor: aperture and focal length in mm.
export const APERTURE_MM = 150;
export const FOCAL_MM = 1200;

export const EYEPIECES: readonly Eyepiece[] = [
  { label: '40 mm', mm: 40, afov: 52 },
  { label: '20 mm', mm: 20, afov: 52 },
  { label: '10 mm', mm: 10, afov: 60 },
  { label: '6 mm', mm: 6, afov: 52 },
];

// The camera's sensor in mm, an APS-C size.
export const SENSOR = { w: 23.5, h: 15.6 };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Magnification: the focal length over the eyepiece's focal length.
export const magnification = (e: Eyepiece): number => FOCAL_MM / e.mm;

// True field in degrees: the apparent field over the magnification.
export const trueField = (e: Eyepiece): number => e.afov / magnification(e);

// The sensor's field in degrees, width and height.
export const sensorField = (): { w: number; h: number } => ({
  w: 2 * Math.atan(SENSOR.w / 2 / FOCAL_MM) / RAD,
  h: 2 * Math.atan(SENSOR.h / 2 / FOCAL_MM) / RAD,
});

// The faintest star the eye sees in this aperture, under a dark sky.
export const EYE_LIMIT = 2.7 + 5 * Math.log10(APERTURE_MM);

// Star light in simulation units: magnitude 10 gives 1.
export const flux = (mag: number): number => Math.pow(10, -0.4 * (mag - 10));

// Air mass at an altitude (Rozenberg).
export function airmass(alt: number): number {
  const s = Math.sin(Math.max(1, alt) * RAD);
  return 1 / (s + 0.025 * Math.exp(-11 * s));
}

// Magnitudes lost to the air at an altitude.
export const extinction = (alt: number): number => 0.2 * (airmass(alt) - 1);

// Seeing in arcsec grows toward the horizon.
export const seeingAt = (zenith: number, alt: number): number => zenith * Math.pow(airmass(alt), 0.6);

// The diffraction limit in arcsec: the Airy disc's FWHM for green light.
export const DIFFRACTION = (1.03 * 550e-9 / (APERTURE_MM * 1e-3)) / RAD * 3600;

// Clamps the tube's altitude and wraps its azimuth to 0 to 360.
export function clampPose(alt: number, az: number): Pose {
  return { alt: clamp(alt, ALT_MIN, ALT_MAX), az: ((az % 360) + 360) % 360 };
}

// The unit direction of an alt and az in this module's scene axes.
// hero-scope.ts uses z south; this module uses z north.
export function dirOf(alt: number, az: number): Vec3 {
  const a = alt * RAD, z = az * RAD;
  return { x: Math.sin(z) * Math.cos(a), y: Math.sin(a), z: Math.cos(z) * Math.cos(a) };
}

// The eyepiece frame for a pose: image right, up and forward.
// Image right is east.
export function frameOf(p: Pose): Frame {
  const f = dirOf(p.alt, p.az);
  const z = p.az * RAD;
  const r = { x: Math.cos(z), y: 0, z: -Math.sin(z) };
  // Cross product of f and r: image up.
  const u = { x: f.y * r.z - f.z * r.y, y: f.z * r.x - f.x * r.z, z: f.x * r.y - f.y * r.x };
  return { r, u, f };
}

/* ---------- scene and shell ---------- */
// The sky matrix turns shell directions into scene axes with z south.
// Its transpose turns them back.
export function toShell(v: Vec3, rows: number[]): Vec3 {
  const x = v.x, y = v.y, z = -v.z;
  return {
    x: rows[0] * x + rows[3] * y + rows[6] * z,
    y: rows[1] * x + rows[4] * y + rows[7] * z,
    z: rows[2] * x + rows[5] * y + rows[8] * z,
  };
}

// A shell direction as an alt and az at the sky's LST.
export function shellToPose(s: Vec3, rows: number[]): Pose {
  const x = rows[0] * s.x + rows[1] * s.y + rows[2] * s.z;
  const y = rows[3] * s.x + rows[4] * s.y + rows[5] * s.z;
  const z = rows[6] * s.x + rows[7] * s.y + rows[8] * s.z;
  return { alt: Math.asin(clamp(y, -1, 1)) / RAD, az: ((Math.atan2(x, -z) / RAD) % 360 + 360) % 360 };
}

// The eyepiece frame in shell axes.
// Each star then needs one dot product per axis.
export function shellFrame(p: Pose, lstDeg: number): Frame {
  const rows = skyRows(lstDeg, LAT);
  const fr = frameOf(p);
  return { r: toShell(fr.r, rows), u: toShell(fr.u, rows), f: toShell(fr.f, rows) };
}

export { skyRows };
