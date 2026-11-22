// The slit's offset for the hero's German mount. Pure; a test checks it.
// The tube rides beside the polar axis, so it looks out off the dome's centre.
// The slit turns to where the tube's line of sight leaves the dome.
// Sizes are in dome units at size 1, as in world/hero-scope.ts.
// +Y is up, -Z is north, +X is east. Angles are in degrees.

import { D_OFF, targetPose } from './clearance.ts';

const DEG = Math.PI / 180;
// Copied from world/hero-scope.ts: the site's latitude.
const LAT = 51;
// Copied from world/hero-scope.ts: the axes cross 0.35 over the drum top.
const AXES_UP = 0.35;
// Copied from world/observatory.ts: the cupola's radius.
const DOME_R = 3.3;

const wrap180 = (x: number): number => ((x % 360) + 540) % 360 - 180;

// The slit azimuth that centres the tube, for a tube pointing at alt and az.
export function slitAzFor(alt: number, az: number): number {
  const a = alt * DEG, z = az * DEG;
  // The tube's direction.
  const tx = Math.sin(z) * Math.cos(a), ty = Math.sin(a), tz = -Math.cos(z) * Math.cos(a);
  // The mount's RA joint, from the same rule world/hero-scope.ts uses.
  const L = LAT * DEG;
  // The tube axis's foot: D_OFF along x, turned by ra about Y, then by LAT - 90 about X.
  const th = targetPose(alt, az, 0).ra, phi = L - Math.PI / 2;
  const x1 = D_OFF * Math.cos(th), z1 = -D_OFF * Math.sin(th);
  const ox = x1, oy = AXES_UP - z1 * Math.sin(phi), oz = z1 * Math.cos(phi);
  // Where the line of sight meets the dome's sphere.
  const b = ox * tx + oy * ty + oz * tz, c = ox * ox + oy * oy + oz * oz - DOME_R * DOME_R;
  const s = -b + Math.sqrt(b * b - c);
  const px = ox + s * tx, pz = oz + s * tz;
  // Near the zenith the point has no azimuth; the slit keeps the tube's.
  if (Math.hypot(px, pz) < 1e-6) return az;
  return (Math.atan2(px, -pz) / DEG + 360) % 360;
}

// The offset fades out from FADE_LO to FADE_HI degrees of altitude.
// Near the zenith a small side shift is a large azimuth, so the dome would swing.
// The slit runs past the zenith, so the tube stays in it there.
const FADE_LO = 60, FADE_HI = 80;
// The slit never turns more than this past the tube.
const MAX_OFF = 12;
// Degrees the slit turns past the tube's azimuth.
export function slitOffset(alt: number, az: number): number {
  const k = Math.min(1, Math.max(0, (FADE_HI - alt) / (FADE_HI - FADE_LO)));
  const o = wrap180(slitAzFor(alt, az) - az) * k;
  return Math.max(-MAX_OFF, Math.min(MAX_OFF, o));
}
