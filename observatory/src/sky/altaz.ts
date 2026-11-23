// Directions on the sky as world vectors.
import { MathUtils, Vector3 } from 'three';
import type { AltAz } from '../core/sky.ts';

const DEG = MathUtils.DEG2RAD;

// Unit vector for an altitude and azimuth: -Z is north, +X is east.
export function altAzDir(a: AltAz, out = new Vector3()): Vector3 {
  const c = Math.cos(a.alt * DEG);
  return out.set(c * Math.sin(a.az * DEG), Math.sin(a.alt * DEG), -c * Math.cos(a.az * DEG));
}
