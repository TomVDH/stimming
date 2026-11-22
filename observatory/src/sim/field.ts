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
// A grid of equal-area cells: bands of declination, split in RA.
type CellBox = { s0: number; s1: number; ra0: number; span: number; area: number; b: number; key: number };
type Grid = { size: number; bands: number; cache: Map<number, Body[]>; grow: (cell: CellBox, r: () => number) => Body[] };

const perBand = (g: Grid, i: number): number => {
  const dec = -90 + (i + 0.5) * g.size;
  return Math.max(1, Math.round((360 * Math.cos(dec * RAD)) / g.size));
};

// The bodies in one cell, grown from its seed.
function cell(g: Grid, i: number, j: number): Body[] {
  const key = i * 16384 + j;
  const hit = g.cache.get(key);
  if (hit) return hit;
  if (g.cache.size > 600) g.cache.clear();
  const n = perBand(g, i);
  const dec0 = -90 + i * g.size, dec1 = dec0 + g.size;
  const span = 360 / n, ra0 = j * span;
  const s0 = Math.sin(dec0 * RAD), s1 = Math.sin(dec1 * RAD);
  const area = (s1 - s0) * span / RAD;
  const b = Math.abs(galLat(shellDir(ra0 + span / 2, (dec0 + dec1) / 2)));
  const out = g.grow({ s0, s1, ra0, span, area, b, key }, rng(key * 2654435761 + g.bands * 7919 + 12345));
  g.cache.set(key, out);
  return out;
}

function place(c: CellBox, r: () => number): { ra: number; dec: number; d: Vec3 } {
  const dec = Math.asin(c.s0 + r() * (c.s1 - c.s0)) / RAD, ra = c.ra0 + r() * c.span;
  return { ra, dec, d: shellDir(ra, dec) };
}

// A Poisson-like count with this mean.
const countOf = (mean: number, r: () => number): number => Math.max(0, Math.round(mean + normal(r) * Math.sqrt(mean)));

// A magnitude from m0 to m1; counts grow by 10^slope per magnitude.
function magIn(m0: number, m1: number, slope: number, r: () => number): number {
  return m0 + Math.log10(1 + r() * (Math.pow(10, slope * (m1 - m0)) - 1)) / slope;
}

// Stars per square degree from MAG0 to MAG_GEN, by galactic latitude.
const starsPerDeg2 = (b: number): number => DENS0 * (Math.pow(10, SLOPE * (MAG_GEN - MAG0)) - 1) * (0.35 + 2.6 * Math.exp(-b / 12));

// Dust hides galaxies near the galactic plane.
const clearView = (b: number): number => 1 - 0.95 * Math.exp(-b / 15);

function fieldStar(ra: number, dec: number, d: Vec3, mag: number, r: () => number): Body {
  const u = r();
  const bv = Math.max(-0.3, Math.min(2.0, u < 0.7 ? 0.9 + 0.35 * normal(r) : u < 0.9 ? 0.45 + 0.2 * normal(r) : 1.5 + 0.2 * normal(r)));
  const teff = bvToTeff(bv);
  return {
    ...d, mag, teff, spect: `${classFromTeff(teff)}V`, name: designation('FS', ra, dec),
    catalog: false, galaxy: 'none', re: 0, q: 1, pa: 0, redshift: 0, rgb: starRGB(teff),
  };
}

// A galaxy: fainter ones lie farther, so their redshift grows.
function galaxy(ra: number, dec: number, d: Vec3, mag: number, r: () => number): Body {
  const z = 0.003 * Math.pow(10, 0.2 * (mag - 11)) * (0.6 + 0.9 * r());
  const spiral = r() < (z > 1 ? 0.75 : 0.55);
  // Far galaxies shrink less than their light suggests.
  const re = Math.max(0.25, 30 * Math.pow(10, -0.2 * (mag - 12))) * (0.6 + 0.8 * r());
  const zc = Math.min(z, 1.5) / 1.5;
  return {
    ...d, mag, teff: 4800, spect: spiral ? 'Sc' : 'E', name: designation('GX', ra, dec),
    catalog: false, galaxy: spiral ? 'spiral' : 'elliptical',
    re, q: spiral ? 0.2 + 0.8 * r() : 0.55 + 0.45 * r(), pa: r() * Math.PI, redshift: z,
    rgb: starRGB(spiral ? 7000 - 2500 * zc : 4400 - 1400 * zc),
  };
}

// The shallow layer: both instruments see it.
const SHALLOW: Grid = {
  size: 0.5, bands: 360, cache: new Map(),
  grow(c, r) {
    const out: Body[] = [];
    const n = countOf(starsPerDeg2(c.b) * c.area, r);
    for (let k = 0; k < n; k++) {
      const { ra, dec, d } = place(c, r);
      out.push(fieldStar(ra, dec, d, magIn(MAG0, MAG_GEN, SLOPE, r), r));
    }
    const ng = Math.round(2.5 * c.area * clearView(c.b) + r() - 0.5);
    for (let k = 0; k < ng; k++) {
      const { ra, dec, d } = place(c, r);
      out.push(galaxy(ra, dec, d, magIn(10.5, 16, 0.6, r), r));
    }
    return out;
  },
};

// The deep layer reaches magnitude 25: only the 1 m reflector sees it.
export const MAG_DEEP = 25;
// Deep galaxies per square degree brighter than m.
const galCount = (m: number): number => 600 * Math.pow(10, 0.45 * (m - 20));

const DEEP: Grid = {
  size: 0.05, bands: 3600, cache: new Map(),
  grow(c, r) {
    const out: Body[] = [];
    // Faint star counts flatten: the galaxy's halo thins out.
    const ns = countOf(starsPerDeg2(c.b) * (Math.pow(10, 0.15 * (25 - MAG_GEN)) - 1) * c.area, r);
    for (let k = 0; k < ns; k++) {
      const { ra, dec, d } = place(c, r);
      out.push(fieldStar(ra, dec, d, magIn(MAG_GEN, 25, 0.15, r), r));
    }
    const ng = countOf((galCount(MAG_DEEP) - galCount(16)) * c.area * clearView(c.b), r);
    for (let k = 0; k < ng; k++) {
      const { ra, dec, d } = place(c, r);
      out.push(galaxy(ra, dec, d, magIn(16, MAG_DEEP, 0.45, r), r));
    }
    return out;
  },
};

function scan(g: Grid, c: Vec3, radius: number, cosR: number, out: Body[]): void {
  const dec = Math.asin(Math.max(-1, Math.min(1, c.z))) / RAD;
  const ra = ((Math.atan2(-c.y, c.x) / RAD) % 360 + 360) % 360;
  const i0 = Math.max(0, Math.floor((dec - radius + 90) / g.size));
  const i1 = Math.min(g.bands - 1, Math.floor((dec + radius + 90) / g.size));
  for (let i = i0; i <= i1; i++) {
    const n = perBand(g, i);
    const edge = Math.max(Math.abs(-90 + i * g.size), Math.abs(-90 + (i + 1) * g.size));
    const cosE = Math.cos(Math.min(89.9, edge) * RAD);
    const span = 360 / n;
    const half = edge > 89 || radius / cosE >= 180 ? 180 : radius / cosE + span;
    const j0 = Math.floor((ra - half) / span), j1 = Math.floor((ra + half) / span);
    const seen = new Set<number>();
    for (let jj = j0; jj <= j1; jj++) {
      const j = ((jj % n) + n) % n;
      if (seen.has(j)) continue;
      seen.add(j);
      for (const s of cell(g, i, j)) if (s.x * c.x + s.y * c.y + s.z * c.z > cosR) out.push(s);
    }
  }
}

// Every body within radius degrees of the direction c.
// deep adds the faint layer that the big mirror reaches.
export function bodiesNear(c: Vec3, radius: number, deep = false): Body[] {
  const cosR = Math.cos(radius * RAD);
  const out: Body[] = [];
  for (const s of catalog) if (s.x * c.x + s.y * c.y + s.z * c.z > cosR) out.push(s);
  scan(SHALLOW, c, radius, cosR, out);
  if (deep) scan(DEEP, c, radius, cosR, out);
  return out;
}
