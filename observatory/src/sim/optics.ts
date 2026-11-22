// Telescope optics: the tube's pose, the eyepieces and the sky in view.
// Angles are in degrees. Azimuth runs from north through east.
// Scene axes: x east, y up, z north.
import { toAltAz } from '../core/sky.ts';
import type { Star } from '../core/catalog.ts';

export type Vec3 = { x: number; y: number; z: number };
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

// The simulated tube's focal length in mm.
export const FOCAL_MM = 1200;

export const EYEPIECES: readonly Eyepiece[] = [
  { label: '40 mm', mm: 40, afov: 52 },
  { label: '20 mm', mm: 20, afov: 52 },
  { label: '10 mm', mm: 10, afov: 60 },
  { label: '6 mm', mm: 6, afov: 52 },
];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Magnification: the focal length over the eyepiece's focal length.
export const magnification = (e: Eyepiece): number => FOCAL_MM / e.mm;

// True field in degrees: the apparent field over the magnification.
export const trueField = (e: Eyepiece): number => e.afov / magnification(e);

// Clamps the tube's altitude and wraps its azimuth to 0 to 360.
export function clampPose(alt: number, az: number): Pose {
  return { alt: clamp(alt, ALT_MIN, ALT_MAX), az: ((az % 360) + 360) % 360 };
}

// The unit direction of an alt and az in scene axes.
// hero-scope.ts uses z south; this module uses z north.
export function dirOf(alt: number, az: number): Vec3 {
  const a = alt * RAD, z = az * RAD;
  return { x: Math.sin(z) * Math.cos(a), y: Math.sin(a), z: Math.cos(z) * Math.cos(a) };
}

const dot = (p: Vec3, q: Vec3): number => p.x * q.x + p.y * q.y + p.z * q.z;

// The eyepiece frame for a pose: image right, image up, and the view direction.
// Image right is east.
export function frameOf(p: Pose): Frame {
  const f = dirOf(p.alt, p.az);
  const z = p.az * RAD;
  const r = { x: Math.cos(z), y: 0, z: -Math.sin(z) };
  // Cross product of f and r: image up.
  const u = { x: f.y * r.z - f.z * r.y, y: f.z * r.x - f.x * r.z, z: f.x * r.y - f.y * r.x };
  return { r, u, f };
}

// A direction on the eyepiece in units of the field radius, or null behind the tube.
// The projection is gnomonic.
// A star's offset grows with the tangent of its angle.
export function eyeXY(d: Vec3, fr: Frame, halfField: number): { x: number; y: number } | null {
  const z = dot(d, fr.f);
  if (z <= 0) return null;
  const k = Math.tan(halfField * RAD);
  return { x: dot(d, fr.r) / z / k, y: dot(d, fr.u) / z / k };
}

// A catalog star's altitude and azimuth at a local sidereal time.
export function altAzOf(s: Star, lstDeg: number): { alt: number; az: number } {
  return toAltAz(s.ra, s.dec, lstDeg, LAT);
}

// Relative brightness of a magnitude: 1 at magnitude 6.
const bright = (mag: number): number => Math.pow(10, -0.4 * (mag - 6));

// Dot radius in device-independent pixels.
export function starRadius(mag: number): number {
  return Math.min(4.5, 0.5 + 1.6 * Math.sqrt(bright(mag)));
}

// Dot opacity: bright stars are solid, faint ones stay visible.
export function starAlpha(mag: number): number {
  return Math.min(1, 0.3 + 0.6 * Math.sqrt(bright(mag)));
}

// Star colour from the B-V index: blue when small, orange when large.
export function starRGB(ci: number): [number, number, number] {
  if (Number.isNaN(ci)) return [255, 255, 255];
  if (ci < 0.6) {
    const a = clamp((0.6 - ci) / 0.9, 0, 1);
    return [255 - 105 * a, 255 - 75 * a, 255];
  }
  const a = clamp((ci - 0.6) / 1.2, 0, 1);
  return [255, 255 - 55 * a, 255 - 120 * a];
}
