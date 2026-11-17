// Star catalog decoder. Source: HYG v4.4 (CC BY-SA 4.0), cut by tools/hyg-cut.mjs.

export type Star = {
  hip: number; // Hipparcos id, 0 when the star has none
  ra: number; // degrees
  dec: number; // degrees
  mag: number;
  ci: number; // colour index B-V, NaN when unknown
  dist: number; // parsecs, NaN when unknown
  spect: string;
  name: string; // proper name or ''
  bayer: string; // e.g. "α CMa", or ''
};

export type StarMeta = {
  names: Record<number, string>; // keyed by star index
  bayer: Record<number, string>; // keyed by star index
  spect: string[];
};

// One record: ra f32, dec f32, mag i16 (x100), ci i16 (x1000, -32768 = unknown),
// dist f32 (NaN = unknown), hip u32, spect u16 (index into meta.spect). Little endian.
export const STAR_BYTES = 22;
export const CI_UNKNOWN = -32768;

export function decodeStars(bin: ArrayBuffer, meta: StarMeta): Star[] {
  const v = new DataView(bin);
  const n = Math.floor(bin.byteLength / STAR_BYTES);
  const out: Star[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * STAR_BYTES;
    const ci = v.getInt16(o + 10, true);
    out[i] = {
      ra: v.getFloat32(o, true),
      dec: v.getFloat32(o + 4, true),
      mag: v.getInt16(o + 8, true) / 100,
      ci: ci === CI_UNKNOWN ? NaN : ci / 1000,
      dist: v.getFloat32(o + 12, true),
      hip: v.getUint32(o + 16, true),
      spect: meta.spect[v.getUint16(o + 20, true)] ?? '',
      name: meta.names[i] ?? '',
      bayer: meta.bayer[i] ?? '',
    };
  }
  return out;
}

export async function loadStars(url: string): Promise<Star[]> {
  const base = url.replace(/[^/]*$/, '');
  const [bin, meta] = await Promise.all([
    fetch(`${base}stars.bin`).then((r) => r.arrayBuffer()),
    fetch(`${base}stars.json`).then((r) => r.json() as Promise<StarMeta>),
  ]);
  return decodeStars(bin, meta);
}
