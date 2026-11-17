// Star pick.
// A tap picks the brightest star near the tap point.
import type { Star } from './catalog.ts';
import { toAltAz, type AltAz } from './sky.ts';

const RAD = Math.PI / 180;
// A star under this altitude cannot be picked.
const MIN_ALT = 5;

// Angle between two sky directions in degrees.
function sep(a: AltAz, b: AltAz): number {
  const s = Math.sin(a.alt * RAD) * Math.sin(b.alt * RAD)
    + Math.cos(a.alt * RAD) * Math.cos(b.alt * RAD) * Math.cos((a.az - b.az) * RAD);
  return Math.acos(Math.max(-1, Math.min(1, s))) / RAD;
}

// The brightest star within radiusDeg of the aim, above 5 degrees.
// Of two equal stars, the first in the list wins.
// It gives null when no star is near.
export function pickStar(stars: Star[], aim: AltAz, lstDeg: number, latDeg: number, radiusDeg = 3): Star | null {
  let best: Star | null = null;
  for (const s of stars) {
    if (best && s.mag >= best.mag) continue;
    const p = toAltAz(s.ra, s.dec, lstDeg, latDeg);
    if (p.alt > MIN_ALT && sep(p, aim) <= radiusDeg) best = s;
  }
  return best;
}
