// Chip architectures and objective turret specs for the metallurgical microscope.

export type ChipId = 'nmos79' | 'cmos94' | 'rfsoc';
export type IlluminationMode = 'brightfield' | 'darkfield' | 'dic' | 'nir';
export type ObjectiveKey = '5x' | '10x' | '20x' | '50x' | '100x';

export interface ChipSpec {
  id: ChipId;
  index: number;
  label: string;
  shortLabel: string;
  process: string;
  dieSizeUm: number;
  startX: number;
  startY: number;
  startMag: number;
}

export interface ObjectiveSpec {
  key: ObjectiveKey;
  label: string;
  mag: number;
  na: number;
  /** Half-height of field of view in microns at this objective. */
  fovHalfUm: number;
}

export const CHIPS: readonly ChipSpec[] = [
  {
    id: 'nmos79',
    index: 0,
    label: 'NMOS-79 · 8-bit CPU',
    shortLabel: 'NMOS-79',
    process: '5 μm NMOS · 1M',
    dieSizeUm: 8000,
    startX: -120,
    startY: 180,
    startMag: 12,
  },
  {
    id: 'cmos94',
    index: 1,
    label: 'CMOS-94 · RISC Core',
    shortLabel: 'CMOS-94',
    process: '0.6 μm CMOS · 4M',
    dieSizeUm: 8000,
    startX: 160,
    startY: -120,
    startMag: 12,
  },
  {
    id: 'rfsoc',
    index: 2,
    label: 'RF-SOC · Mixed-Signal',
    shortLabel: 'RF-SOC',
    process: '180 nm Cu RF · Sensor',
    dieSizeUm: 8000,
    startX: 240,
    startY: 220,
    startMag: 12,
  },
];

export const CHIP_BY_ID: Record<ChipId, ChipSpec> = {
  nmos79: CHIPS[0],
  cmos94: CHIPS[1],
  rfsoc: CHIPS[2],
};

export const MODE_INDEX: Record<IlluminationMode, number> = {
  brightfield: 0,
  darkfield: 1,
  dic: 2,
  nir: 3,
};

// Standard metallurgical dry objectives (DIN / Zeiss Epiplan-Neofluar).
// At 5x the full 8 mm die + ceramic wirebond ring sits comfortably inside the viewport.
export const OBJECTIVES: readonly ObjectiveSpec[] = [
  { key: '5x',   label: '5×',   mag: 5,   na: 0.15, fovHalfUm: 5400 },
  { key: '10x',  label: '10×',  mag: 10,  na: 0.30, fovHalfUm: 2700 },
  { key: '20x',  label: '20×',  mag: 20,  na: 0.45, fovHalfUm: 1350 },
  { key: '50x',  label: '50×',  mag: 50,  na: 0.80, fovHalfUm: 540 },
  { key: '100x', label: '100×', mag: 100, na: 0.90, fovHalfUm: 270 },
];

export const OBJECTIVE_BY_KEY: Record<ObjectiveKey, ObjectiveSpec> = {
  '5x':   OBJECTIVES[0],
  '10x':  OBJECTIVES[1],
  '20x':  OBJECTIVES[2],
  '50x':  OBJECTIVES[3],
  '100x': OBJECTIVES[4],
};

// Continuous zoom range in half-FOV microns (3.8x overview down to 160x extreme macro).
export const FOV_MIN_UM = 165;
export const FOV_MAX_UM = 7100;
export const PAN_LIMIT_UM = 5200;

/** Effective magnification from half-FOV in microns. */
export function magFromFov(fovHalfUm: number): number {
  return 27000 / Math.max(FOV_MIN_UM, fovHalfUm);
}

/** Smooth effective numerical aperture matching the active magnification. */
export function naFromMag(mag: number): number {
  if (mag <= 5) return 0.15;
  if (mag <= 10) return 0.15 + ((mag - 5) / 5) * 0.15;
  if (mag <= 20) return 0.30 + ((mag - 10) / 10) * 0.15;
  if (mag <= 50) return 0.45 + ((mag - 20) / 30) * 0.35;
  return Math.min(0.95, 0.80 + ((mag - 50) / 50) * 0.10);
}

/** Nearest objective turret stop for UI readout. */
export function nearestObjective(fovHalfUm: number): ObjectiveSpec {
  const logFov = Math.log(fovHalfUm);
  let best = OBJECTIVES[0];
  let bestD = Infinity;
  for (const ob of OBJECTIVES) {
    const d = Math.abs(Math.log(ob.fovHalfUm) - logFov);
    if (d < bestD) {
      bestD = d;
      best = ob;
    }
  }
  return best;
}

/** Map normalized slider [0..1] to physical focal Z in microns (-2.5 to +36 um). */
export function focusNormToUm(t: number): number {
  // Lower 78% of the knob spans the silicon metal stack (-1.5 .. 4.5 um) with fine control.
  // Upper 22% racks smoothly up to the arching gold wirebonds (+4.5 .. +42 um).
  if (t <= 0.78) {
    return -1.5 + (t / 0.78) * 6.0;
  }
  const u = (t - 0.78) / 0.22;
  return 4.5 + u * u * 37.5;
}

/** Physical focal plane label for the subtle readout. */
export function focusPlaneLabel(zUm: number): string {
  if (zUm < 0.2) return 'Si / Diff';
  if (zUm < 0.85) return 'Poly';
  if (zUm < 1.7) return 'M1';
  if (zUm < 2.8) return 'M2';
  if (zUm < 5.0) return 'Top M / Pad';
  return `Wire +${Math.round(zUm)} μm`;
}
