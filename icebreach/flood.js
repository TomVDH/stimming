// Ice breach flood: sea water spills from the hole over the floe and soaks in.
// A virtual-pipe shallow-water grid on the CPU, in frame metres, over the floe top.
import * as THREE from 'three';
import { X0, X1, Z0, Z1 } from './ice.js';

export const CELL = 0.8;
const MX = 24;
export const FX0 = X0 - MX, FZ0 = Z0 - MX;
export const NX = Math.round((X1 - X0 + 2 * MX) / CELL), NZ = Math.round((Z1 - Z0 + 2 * MX) / CELL);
const G = 9.81;

/** Builds the grid and maps each cell inside the field to its slab. */
export function makeFlood(F) {
  const n = NX * NZ;
  const h = new Float32Array(n), stain = new Float32Array(n);
  const fL = new Float32Array(n), fR = new Float32Array(n), fT = new Float32Array(n), fB = new Float32Array(n);
  const slabOf = new Int16Array(n).fill(-1), open = new Uint8Array(n);
  const vx = new Float32Array(n), vz = new Float32Array(n);
  // Each slab's box first, then a point-in-outline test.
  F.slabs.forEach((s, k) => {
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (const [x, z] of s.poly) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, z); d = Math.max(d, z); }
    for (let j = Math.max(0, Math.floor((c - FZ0) / CELL)); j <= Math.min(NZ - 1, Math.ceil((d - FZ0) / CELL)); j++) {
      for (let i = Math.max(0, Math.floor((a - FX0) / CELL)); i <= Math.min(NX - 1, Math.ceil((b - FX0) / CELL)); i++) {
        const x = FX0 + (i + 0.5) * CELL, z = FZ0 + (j + 0.5) * CELL;
        if (inside(s.poly, x, z)) slabOf[j * NX + i] = k;
      }
    }
  });
  const data = new Uint8Array(n * 4);
  const tex = new THREE.DataTexture(data, NX, NZ, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return { h, stain, fL, fR, fT, fB, slabOf, open, vx, vz, data, tex, active: false, wetSum: 0 };
}

function inside(poly, x, z) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
  }
  return true;
}

/** Marks cells open where their slab has left its place. */
export function markOpen(W, F) {
  const moved = F.slabs.map(s => Math.hypot(s.x.x - s.home.x, s.x.z - s.home.z) > 0.25 || Math.abs(s.x.y - s.home.y) > 0.2 || (1 - 2 * (s.q.x * s.q.x + s.q.z * s.q.z)) < 0.995);
  let any = false;
  for (let k = 0; k < W.open.length; k++) {
    const s = W.slabOf[k];
    const o = s >= 0 && moved[s] ? 1 : 0;
    if (W.open[k] && !o) W.h[k] = 0;
    W.open[k] = o;
    any = any || o === 1;
  }
  return any;
}

/**
 * Steps the flood: level is the hole's water over the floe top, in metres.
 * Returns true while water still runs; still water soaks in slowly.
 */
export function stepFlood(W, dt, level) {
  const { h, fL, fR, fT, fB, open, stain } = W;
  const k = dt * G * CELL, damp = 0.985;
  const H = i => open[i] ? level : h[i];
  let live = false;
  // Outflows along the four pipes, scaled so no cell gives more than it has.
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const c = j * NX + i, hc = H(c);
    if (!open[c] && h[c] <= 1e-5) { fL[c] = fR[c] = fT[c] = fB[c] = 0; continue; }
    if (open[c] && level <= 0) { fL[c] = fR[c] = fT[c] = fB[c] = 0; continue; }
    fL[c] = i > 0 ? Math.max(0, fL[c] * damp + k * (hc - H(c - 1))) : 0;
    fR[c] = i < NX - 1 ? Math.max(0, fR[c] * damp + k * (hc - H(c + 1))) : 0;
    fT[c] = j > 0 ? Math.max(0, fT[c] * damp + k * (hc - H(c - NX))) : 0;
    fB[c] = j < NZ - 1 ? Math.max(0, fB[c] * damp + k * (hc - H(c + NX))) : 0;
    if (!open[c]) {
      const out = (fL[c] + fR[c] + fT[c] + fB[c]) * dt;
      const vol = h[c] * CELL * CELL;
      if (out > vol && out > 0) { const s = vol / out; fL[c] *= s; fR[c] *= s; fT[c] *= s; fB[c] *= s; }
    }
  }
  // Volume change; open cells are the sea and take or give any amount.
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const c = j * NX + i;
    if (open[c]) { h[c] = 0; continue; }
    const inF = (i > 0 ? fR[c - 1] : 0) + (i < NX - 1 ? fL[c + 1] : 0) + (j > 0 ? fB[c - NX] : 0) + (j < NZ - 1 ? fT[c + NX] : 0);
    const outF = fL[c] + fR[c] + fT[c] + fB[c];
    const flow = (inF - outF) * dt / (CELL * CELL);
    if (Math.abs(flow) > 2e-5) live = true;
    let d = h[c] + flow;
    // Snow soaks some up; the rest lies and slowly freezes.
    d = Math.max(0, d - dt * 0.004);
    h[c] = d;
    W.vx[c] = ((i > 0 ? fR[c - 1] : 0) - fL[c] + fR[c] - (i < NX - 1 ? fL[c + 1] : 0)) / (2 * CELL * Math.max(d, 0.02));
    W.vz[c] = ((j > 0 ? fB[c - NX] : 0) - fT[c] + fB[c] - (j < NZ - 1 ? fT[c + NX] : 0)) / (2 * CELL * Math.max(d, 0.02));
    if (d > 0.002) stain[c] = Math.max(stain[c], Math.min(1, d * 30));
  }
  return live || level > 0;
}

/** Packs depth, stain and flow into the texture. freeze greys the stain over time. */
export function uploadFlood(W) {
  const { h, stain, vx, vz, data } = W;
  for (let c = 0; c < h.length; c++) {
    const o = c * 4;
    data[o] = Math.min(255, h[c] / 0.6 * 255);
    data[o + 1] = stain[c] * 255;
    data[o + 2] = 127.5 + Math.max(-1, Math.min(1, vx[c])) * 127;
    data[o + 3] = 127.5 + Math.max(-1, Math.min(1, vz[c])) * 127;
  }
  W.tex.needsUpdate = true;
}
