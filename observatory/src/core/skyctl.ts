// The sky controls: named nights, named sites, the Bortle darkness.
import { lst } from './sky.ts';

// A sidereal day in ms.
const SIDEREAL_DAY_MS = 86164091;

// lstH: the local sidereal time in hours, or null for real time.
// Each season's sky stands south at about 22:00.
export const NIGHTS: { id: string; label: string; lstH: number | null }[] = [
  { id: 'tonight', label: 'Tonight', lstH: null },
  { id: 'winter', label: 'Winter', lstH: 5.5 },
  { id: 'spring', label: 'Spring', lstH: 10.5 },
  { id: 'summer', label: 'Summer', lstH: 19.5 },
  { id: 'autumn', label: 'Autumn', lstH: 23.0 },
];

// The hill and the woods stay; only the sky moves.
export const SITES: { id: string; label: string; lat: number }[] = [
  { id: 'home', label: 'Home 51° N', lat: 51 },
  { id: 'tropics', label: 'Tropics 20° N', lat: 20 },
  { id: 'equator', label: 'Equator 0°', lat: 0 },
  { id: 'andes', label: 'Andes 24° S', lat: -24 },
];

// The faintest star the eye sees, for Bortle classes 1 to 9.
const BORTLE_MAG = [7.6, 7.1, 6.6, 6.1, 5.6, 5.1, 4.6, 4.2, 4.0];

export function bortleMag(b: number): number {
  const i = Math.min(9, Math.max(1, Math.round(b))) - 1;
  return BORTLE_MAG[i];
}

// The shift in ms that puts the LST at lstH.
// It stays within half a sidereal day, so the swing is short.
export function nightShiftMs(realMs: number, lstH: number, lonDeg: number): number {
  const d = ((lstH * 15 - lst(realMs, lonDeg)) % 360 + 540) % 360 - 180;
  return d / 360 * SIDEREAL_DAY_MS;
}
