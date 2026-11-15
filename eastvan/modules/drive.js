// East Van walk, module 5: the lane comes out on Commercial Drive.
// A square slice of the city data at the lane's real mouth (data n 38.9).
// Its numbers are the data frame: x runs north (n), z runs east (e).
// YAW turns that frame, so the lane runs along the walk's x.
import { driveParts } from '../drive.js';

export const ID = 'drive';
export const SIZE = [30, 30];
// The lane's centre line sits 2 m behind the middle, as in lane.js.
export const ORIGIN = [36.9, 0, -3];
export const JOIN = 'east';
export const YAW = Math.PI / 2;
export const STOP = { at: [36.9, 1.6, -3], yaw: Math.PI / 2 + 0.5, pitch: 0.82, w: 52, tall: 54, h: 38, band: 9, range: 24 };
// The slice in the data frame: e is east of the corner, n is north of it.
export const RECT = { kind: 'rect', e0: -18, n0: 21.9, e1: 12, n1: 51.9 };

// The parts come from the baked city data on the first visit.
export async function load() {
  const d = await (await fetch(new URL('../data/drive.json', import.meta.url))).json();
  return driveParts(d, RECT);
}
