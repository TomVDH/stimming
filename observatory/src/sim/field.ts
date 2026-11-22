// The sky in the tube: catalog stars, then procedural faint stars and galaxies.
// Directions are shell unit vectors from core/sky.ts shellDir.
// The same sky cell always grows the same stars.
import type { Star } from '../core/catalog.ts';
import { shellDir, type Vec3 } from '../core/sky.ts';
import { bvToTeff, classFromTeff, starRGB, teffFromSpect, type GalaxyType } from './spectrum.ts';

export type Body = {
  x: number; y: number; z: number;
  mag: number;
  teff: number;
  name: string;
  spect: string;
  catalog: boolean;
  galaxy: GalaxyType;
  // Galaxies only: effective radius in arcsec, axis ratio, angle in radians.
  re: number; q: number; pa: number;
  redshift: number;
  // Linear colour, brightest channel at 1.
  rgb: [number, number, number];
};

const RAD = Math.PI / 180;
// Cell size in degrees.
const CELL = 0.5;
// The catalog's faint limit; procedural stars start here.
const MAG0 = 6.5;
// Procedural stars stop at this magnitude.
export const MAG_GEN = 16.5;
// Stars per square degree brighter than MAG0, on average.
const DENS0 = 0.22;
// Star counts grow by this power of ten per magnitude.
const SLOPE = 0.42;
// The north galactic pole, J2000.
const NGP = shellDir(192.859, 27.128);

// A small seeded generator (mulberry32).
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(r: () => number): number {
  return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2831853 * r());
}

// Galactic latitude in degrees of a shell direction.
export function galLat(d: Vec3): number {
  return Math.asin(Math.max(-1, Math.min(1, d.x * NGP.x + d.y * NGP.y + d.z * NGP.z))) / RAD;
}

// A designation from RA and Dec, such as "J142339+190723".
function designation(prefix: string, ra: number, dec: number): string {
  const h = ra / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = Math.floor(((h - hh) * 60 - mm) * 60);
  const a = Math.abs(dec), dd = Math.floor(a), dm = Math.floor((a - dd) * 60), ds = Math.floor(((a - dd) * 60 - dm) * 60);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${prefix} J${p(hh)}${p(mm)}${p(ss)}${dec < 0 ? '-' : '+'}${p(dd)}${p(dm)}${p(ds)}`;
}

/* ---------- catalog ---------- */
let catalog: Body[] = [];

export function setCatalog(stars: readonly Star[]): void {
  catalog = stars.map((s) => {
    const d = shellDir(s.ra, s.dec);
    const teff = teffFromSpect(s.spect) ?? (Number.isNaN(s.ci) ? 5800 : bvToTeff(s.ci));
    return {
      ...d, mag: s.mag, teff, spect: s.spect || classFromTeff(teff),
      name: s.name || s.bayer || (s.hip ? `HIP ${s.hip}` : designation('HYG', s.ra, s.dec)),
      catalog: true, galaxy: 'none', re: 0, q: 1, pa: 0, redshift: 0, rgb: starRGB(teff),
    };
  });
}

export const catalogBodies = (): readonly Body[] => catalog;

/* ---------- procedural cells ---------- */
const BANDS = Math.round(180 / CELL);
const perBand = (i: number): number => {
  const dec = -90 + (i + 0.5) * CELL;
  return Math.max(1, Math.round((360 * Math.cos(dec * RAD)) / CELL));
};

const cache = new Map<number, Body[]>();

// The bodies in one cell, grown from its seed.
function cell(i: number, j: number): Body[] {
  const key = i * 4096 + j;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 600) cache.clear();
  const n = perBand(i);
  const dec0 = -90 + i * CELL, dec1 = dec0 + CELL;
  const span = 360 / n, ra0 = j * span;
  const s0 = Math.sin(dec0 * RAD), s1 = Math.sin(dec1 * RAD);
  const area = (s1 - s0) * span * RAD / (RAD * RAD);
  const mid = shellDir(ra0 + span / 2, (dec0 + dec1) / 2);
  const b = Math.abs(galLat(mid));
  const r = rng(key * 2654435761 + 12345);
  const out: Body[] = [];

  const place = (): { ra: number; dec: number; d: Vec3 } => {
    const dec = Math.asin(s0 + r() * (s1 - s0)) / RAD, ra = ra0 + r() * span;
    return { ra, dec, d: shellDir(ra, dec) };
  };

  // Stars: denser toward the galactic plane.
  const g = 0.35 + 2.6 * Math.exp(-b / 12);
  const top = Math.pow(10, SLOPE * (MAG_GEN - MAG0)) - 1;
  const mean = DENS0 * top * area * g;
  const count = Math.max(0, Math.round(mean + normal(r) * Math.sqrt(mean)));
  for (let k = 0; k < count; k++) {
    const { ra, dec, d } = place();
    // Inverse of the cumulative count, so faint stars dominate.
    const mag = MAG0 + Math.log10(1 + r() * top) / SLOPE;
    const u = r();
    const bv = Math.max(-0.3, Math.min(2.0, u < 0.7 ? 0.9 + 0.35 * normal(r) : u < 0.9 ? 0.45 + 0.2 * normal(r) : 1.5 + 0.2 * normal(r)));
    const teff = bvToTeff(bv);
    out.push({
      ...d, mag, teff, spect: `${classFromTeff(teff)}V`, name: designation('FS', ra, dec),
      catalog: false, galaxy: 'none', re: 0, q: 1, pa: 0, redshift: 0, rgb: starRGB(teff),
    });
  }

  // Galaxies: few, and fewer behind the Milky Way's dust.
  const gg = 1 - 0.95 * Math.exp(-b / 15);
  const ng = Math.round(2.5 * area * gg + r() - 0.5);
  for (let k = 0; k < ng; k++) {
    const { ra, dec, d } = place();
    const mag = 10.5 + Math.log10(1 + r() * (Math.pow(10, 0.6 * 5.5) - 1)) / 0.6;
    const re = 30 * Math.pow(10, -0.2 * (mag - 12)) * (0.6 + 0.8 * r());
    const spiral = r() < 0.6;
    out.push({
      ...d, mag, teff: 4800, spect: spiral ? 'Sc' : 'E', name: designation('GX', ra, dec),
      catalog: false, galaxy: spiral ? 'spiral' : 'elliptical',
      re, q: spiral ? 0.2 + 0.8 * r() : 0.55 + 0.45 * r(), pa: r() * Math.PI,
      redshift: 0.003 * Math.pow(10, 0.2 * (mag - 11)) * (0.8 + 0.4 * r()),
      rgb: starRGB(spiral ? 5600 : 4600),
    });
  }
  cache.set(key, out);
  return out;
}

// Every body within radius degrees of the direction c.
export function bodiesNear(c: Vec3, radius: number): Body[] {
  const cosR = Math.cos(radius * RAD);
  const out: Body[] = [];
  for (const s of catalog) if (s.x * c.x + s.y * c.y + s.z * c.z > cosR) out.push(s);
  const dec = Math.asin(Math.max(-1, Math.min(1, c.z))) / RAD;
  const ra = ((Math.atan2(-c.y, c.x) / RAD) % 360 + 360) % 360;
  const i0 = Math.max(0, Math.floor((dec - radius + 90) / CELL));
  const i1 = Math.min(BANDS - 1, Math.floor((dec + radius + 90) / CELL));
  for (let i = i0; i <= i1; i++) {
    const n = perBand(i);
    const edge = Math.max(Math.abs(-90 + i * CELL), Math.abs(-90 + (i + 1) * CELL));
    const cosE = Math.cos(Math.min(89.9, edge) * RAD);
    const wide = edge > 89 || radius / cosE >= 180;
    const span = 360 / n;
    const half = wide ? 180 : radius / cosE + span;
    const j0 = Math.floor((ra - half) / span), j1 = Math.floor((ra + half) / span);
    const seen = new Set<number>();
    for (let jj = j0; jj <= j1; jj++) {
      const j = ((jj % n) + n) % n;
      if (seen.has(j)) continue;
      seen.add(j);
      for (const s of cell(i, j)) if (s.x * c.x + s.y * c.y + s.z * c.z > cosR) out.push(s);
    }
  }
  return out;
}
