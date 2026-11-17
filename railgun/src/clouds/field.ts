// Load order: clouds/lightning runs first.
import './lightning.ts';
import * as THREE from 'three';
import { camera, rad } from '../setup.ts';
import { PLANET_R } from '../world/ground.ts';
import { polar } from '../world/farcountry.ts';
import type { FlashSrc } from './lightning.ts';

/* ---------- the storm field: one cell list for the shapes, the bounds and the flashes ---------- */
// Plan step 3 (docs/plans/railgun-cloud-layer.md); review, section 4.
// Each cell is one of Window seat's storm towers at true scale; sizes are in km.
// The cloud pass marches each cell inside the bound that this file gives it.
export const CELL_N = 10;
// Kinds: a towering cumulus, a storm with an anvil, a dying storm.
export type CellKind = 'tcu' | 'cb' | 'old';
// One storm in the table.
// at: bearing in degrees (left of negative z, as the ranges) and range in km.
// rel: the anvil's heading in degrees from the line of sight; +90 runs right on screen.
// lean: how far the core leans downwind, in core radii. age: 0 forming, 1 mature.
// n, gap, line: a squall line of n cells, gap km apart, its row line degrees from the line of sight.
interface StormDef {
  at: [number, number]; kind: CellKind; top: number; rc: number; seed: number;
  len?: number; rel?: number; lean?: number; age?: number; spread?: number; decay?: number;
  n?: number; gap?: number; line?: number;
}
// Placed for the camera (review 4.4): the wide frame spans bearings -15 to 64, the phone -10 to 27.
// The low sun runs from bearing -20 at dusk to 0 at Time 0.72; storms stand off its path.
// Every top clears the ranges behind it: the foothills rise 3.3 degrees.
export const STORM_FIELD: StormDef[] = [
  // Depth tiers from 30 to 170 km, spread across the frame: no side holds them all.
  // Near towers at the frame edges, clear of the rock's path near bearing 16.
  { at: [60, 30], kind: 'tcu', top: 9, rc: 2.4, rel: -60, lean: 0.3, age: 0.6, seed: 7.4 },
  { at: [-10, 36], kind: 'tcu', top: 8, rc: 2.0, rel: -60, lean: 0.3, age: 0.55, seed: 11.9 },
  // A young tower over the gun.
  { at: [38, 55], kind: 'tcu', top: 10.5, rc: 2.8, rel: -60, lean: 0.4, age: 0.65, seed: 9.2 },
  // The hero: a mature storm; its anvil runs left over the gun, 60 km downwind.
  { at: [12, 80], kind: 'cb', top: 16.5, rc: 5, len: 60, rel: -80, lean: 0.6, seed: 3.1 },
  // A squall line: its row stands 55 degrees off the eye, so it never stacks end-on.
  { at: [50, 120], kind: 'cb', n: 4, gap: 10, line: 55, top: 14, rc: 3.8, len: 35, rel: -95, spread: 1.5, seed: 21.3 },
  // A dying storm near the sun's path: a thin column under a wide anvil, backlit at dusk.
  { at: [-4, 135], kind: 'old', top: 13.5, rc: 4, len: 70, rel: 80, lean: 1, decay: 0.7, seed: 5.7 },
  // A far storm beside the gun's barrel, for depth.
  { at: [26, 170], kind: 'cb', top: 17.5, rc: 5.5, len: 70, rel: -60, seed: 14.2 },
];
// The cloud base over the ground, in km.
const BASE = 2.0;
// The drift: each storm swings along its own wind, this far and this slowly.
// At the peak it moves about 13 m/s, as a storm's steering wind does.
const DRIFT_M = 5000, DRIFT_S = 2400;

// One cell, as the march reads it.
export interface Cell {
  kind: CellKind; seed: number;
  // Home in metres; the drift moves it along ax.
  hx: number; hz: number; ax: number; ph: number;
  rc: number; top: number; base: number; len: number; anv: number; spread: number; decay: number; lean: number;
  r1: number; r2: number; age: number; grow: number;
  // The bound, from the anvil's root: its reach back and forward, and its radius, in km.
  bOff: number; bR: number;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
// One function gives every size the shape and the bound use.
// The numbers follow Window seat's setTower; the shader reads them as they are.
function makeCell(d: StormDef, x: number, z: number, top: number, seed: number): Cell {
  const th = rad(d.at[0]), los = [-Math.sin(th), -Math.cos(th)], right = [Math.cos(th), -Math.sin(th)];
  const r = rad(d.rel ?? 0), axx = los[0] * Math.cos(r) + right[0] * Math.sin(r), axz = los[1] * Math.cos(r) + right[1] * Math.sin(r);
  const age = d.age ?? 1, hasAnv = d.kind === 'tcu' ? 0 : 1;
  const anv = smooth(0.3, 0.9, age) * hasAnv;
  const rc = d.rc, spread = d.spread ?? 1, decay = d.kind === 'old' ? d.decay ?? 0.7 : 0;
  // The top climbs first; the anvil spreads once the top meets the tropopause.
  const topE = BASE + 3.5 + (top - BASE - 3.5) * smooth(0.05, 0.6, age);
  const len = (d.len ?? 0) * anv + 0.3;
  const lean = rc * 0.4 * (d.lean ?? 0.5);
  const r1 = rc * (0.8 + 0.45 * anv);
  const r2 = Math.min(Math.max(rc * 0.7 + len * 0.42, r1 - len * 0.8), r1 + len * 0.8);
  // The bound: a cylinder round the core, the foot and the whole anvil fan.
  const foot = rc * 2.5 * Math.max(1, spread * 0.9);
  const back = Math.max(r1, foot) + lean, fwd = Math.max(len + r2, foot - lean);
  return {
    kind: d.kind, seed, hx: x, hz: z, ax: Math.atan2(axz, axx), ph: seed * 1.7,
    rc, top: topE, base: BASE, len, anv, spread, decay, lean, r1, r2, age, grow: smooth(0, 0.3, age),
    bOff: lean + 0.5 * (fwd - back), bR: 0.5 * (fwd + back) + rc * 0.4 * 0.5 + 0.6,
  };
}
export const CELLS: Cell[] = STORM_FIELD.flatMap(d => {
  const th = rad(d.at[0]), P = polar(th, d.at[1] * 1000);
  if (!d.n) return [makeCell(d, P.x, P.z, d.top, d.seed)];
  // A squall line: its cells in a row, each nearly as tall as the next.
  const L = rad(d.line ?? 60), lx = -Math.sin(th) * Math.cos(L) + Math.cos(th) * Math.sin(L), lz = -Math.cos(th) * Math.cos(L) - Math.sin(th) * Math.sin(L);
  return Array.from({ length: d.n }, (_, j) => {
    const o = (j - (d.n! - 1) / 2) * d.gap! * 1000, sd = d.seed + j * 3.7, h = Math.sin(sd * 91.7) * 0.5 + 0.5;
    return makeCell(d, P.x + lx * o, P.z + lz * o, d.top - 1.2 * h, sd);
  });
}).slice(0, CELL_N);

export const FIELD_U = {
  uCa: { value: Array.from({ length: CELL_N }, () => new THREE.Vector4()) },
  uCb: { value: Array.from({ length: CELL_N }, () => new THREE.Vector4()) },
  uCc: { value: Array.from({ length: CELL_N }, () => new THREE.Vector4()) },
  uCd: { value: Array.from({ length: CELL_N }, () => new THREE.Vector4()) },
  uCe: { value: Array.from({ length: CELL_N }, () => new THREE.Vector4()) },
};
// A cell's centre now: its home, moved along its own wind.
export function cellAt(c: Cell, t: number, out: THREE.Vector3) {
  const s = DRIFT_M * Math.sin((t / DRIFT_S) * 2 * Math.PI + c.ph);
  return out.set(c.hx + Math.cos(c.ax) * s, 0, c.hz + Math.sin(c.ax) * s);
}
const cp = new THREE.Vector3();
// Runs once a frame with the cloud pass on: the cells' places and sizes into the uniforms.
export function stepField(t: number) {
  const u = FIELD_U;
  for (let i = 0; i < CELL_N; i++) {
    const c = CELLS[i];
    if (!c) { u.uCe.value[i].w = 0; continue; }
    cellAt(c, t, cp);
    u.uCa.value[i].set(cp.x, cp.z, c.rc, c.top);
    u.uCb.value[i].set(c.seed, c.ax, c.len, c.base);
    u.uCc.value[i].set(c.anv, c.spread, c.decay, c.lean);
    u.uCd.value[i].set(c.r1, c.r2, c.age, c.grow);
    u.uCe.value[i].set(cp.x + Math.cos(c.ax) * c.bOff * 1000, cp.z + Math.sin(c.ax) * c.bOff * 1000, c.bR * 1000, 1);
  }
}

// Lightning in the field: the mature storms flash most; a towering cumulus seldom does.
const FLASH_K: Record<CellKind, number> = { cb: 1, old: 0.35, tcu: 0.12 };
export function fieldFlash(t: number): FlashSrc {
  const sum = CELLS.reduce((s, c) => s + FLASH_K[c.kind], 0);
  let r = Math.random() * sum, c = CELLS[0];
  for (const k of CELLS) { r -= FLASH_K[k.kind]; if (r <= 0) { c = k; break; } }
  const P0 = cellAt(c, t, new THREE.Vector3()), ax = Math.cos(c.ax), az = Math.sin(c.ax);
  // An anvil spot lights a wide sheet; a core spot is a tight pulse.
  let anvil = false;
  return {
    // A spot in the core at a height, or, two in five, along the anvil.
    spot(out) {
      anvil = c.anv > 0.5 && Math.random() < 0.4;
      const k = 0.1 + 0.7 * Math.random();
      const along = anvil ? c.len * k : 0;
      const across = (Math.random() - 0.5) * (anvil ? c.r1 + (c.r2 - c.r1) * k : 1.2 * c.rc);
      const h = anvil ? c.top - 0.5 - 1.5 * Math.random() : c.base + (c.top - c.base) * (0.15 + 0.55 * Math.random());
      out.set(P0.x + (ax * along - az * across) * 1000, 0, P0.z + (az * along + ax * across) * 1000);
      const dx = out.x - camera.position.x, dz = out.z - camera.position.z;
      out.y = h * 1000 - (dx * dx + dz * dz) / (2 * PLANET_R);
      return out;
    },
    reach: () => anvil ? c.len * 1000 * (0.08 + 0.12 * Math.random()) : c.rc * 1000 * (0.4 + 0.8 * Math.random()),
    gain: () => anvil ? 3 : 1,
    jw: c.rc * 2000, jh: (c.top - c.base) * 1000,
  };
}
