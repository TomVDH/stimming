// Famous deep-sky objects, drawn as procedural images.
// Each sits at its real place in the sky, at its real size.
// Kinds: 0 emission nebula, 1 supernova remnant, 2 planetary nebula, 3 spiral galaxy.

export type Showpiece = {
  name: string;
  // RA and Dec in degrees.
  ra: number; dec: number;
  // Size in arcminutes: across the long axis, and the short over the long.
  size: number; q: number;
  // Position angle in degrees, from north through east.
  pa: number;
  // The brightest part's surface brightness, in magnitudes per square arcsecond.
  sb: number;
  kind: 0 | 1 | 2 | 3;
  // 1 for a planetary with two lobes, as the Dumbbell.
  lobes: number;
  // A seed for the procedural detail.
  seed: number;
  // One line for the target list.
  note: string;
};

export const SHOWPIECES: Showpiece[] = [
  { name: 'Orion Nebula M42', ra: 83.82, dec: -5.39, size: 65, q: 0.92, pa: 0, sb: 16.5, kind: 0, lobes: 0, seed: 3.1, note: 'gas cloud' },
  { name: 'Crab Nebula M1', ra: 83.633, dec: 22.015, size: 7, q: 0.72, pa: 125, sb: 19.0, kind: 1, lobes: 0, seed: 7.7, note: 'star remnant' },
  { name: 'Ring Nebula M57', ra: 283.396, dec: 33.029, size: 1.4, q: 0.75, pa: 60, sb: 17.5, kind: 2, lobes: 0, seed: 1.9, note: 'dying star' },
  { name: 'Dumbbell M27', ra: 299.9, dec: 22.72, size: 8, q: 0.72, pa: 30, sb: 19.0, kind: 2, lobes: 1, seed: 5.3, note: 'dying star' },
  { name: 'Whirlpool M51', ra: 202.47, dec: 47.195, size: 11.2, q: 0.62, pa: 163, sb: 18.5, kind: 3, lobes: 0, seed: 2.6, note: 'galaxy' },
];
