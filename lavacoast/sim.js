// Lava coast flow: a lava sim on a grid over the slope, in JS.
// Each cell holds lava thickness h (m) and heat T (1 at the vent, 0 cold).
// Hot lava runs downhill; cool lava has a yield slope, so it slows and stops.
// Lava in the sea quenches; the heat it loses there is the steam.
import { GRID, VENT, TUBE_X, coastZ, heights } from './land.js';

const N = GRID.n, CS = GRID.size / N;
// Lava under this heat no longer flows.
const T_STOP = 0.08;
// Neighbours: dx, dz, weight. Diagonals weigh less, so flows stay round.
// Mobility, yield slope when hot and its rise when cool, and the cooling rate.
export const K = { MOB: 60, YS0: 0.02, YS1: 0.4, COOL: 0.075 };
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 0.5], [-1, 1, 0.5], [1, -1, 0.5], [-1, -1, 0.5]];

export function makeSim() {
  const { MOB, YS0, YS1, COOL } = K;
  const cells = N * N;
  const b = heights(GRID);
  const h = new Float32Array(cells), Q = new Float32Array(cells);
  const dh = new Float32Array(cells), dQ = new Float32Array(cells);
  const vx = new Float32Array(cells), vz = new Float32Array(cells);
  const fx = new Float32Array(cells), fz = new Float32Array(cells);
  // Heat lost to the sea per cell since the last read.
  const steam = new Float32Array(cells);
  // Sea cells, and shore cells where the surf breaks on the lava.
  const sea = new Uint8Array(cells), shore = new Uint8Array(cells);
  for (let i = 0; i < cells; i++) { sea[i] = b[i] < -0.4 ? 1 : 0; shore[i] = b[i] < 2.5 && !sea[i] ? 1 : 0; }
  const nbOff = NB.map(([dx, dz]) => dz * N + dx);
  const nbDist = NB.map(([dx, dz]) => Math.hypot(dx, dz) * CS);

  // The vent's mouth: cells within two of its centre.
  const at = (x, z) => [Math.floor((x - GRID.x0) / CS), Math.floor((z - GRID.z0) / CS)];
  const [vi, vj] = at(VENT[0], VENT[1]);
  const ventCells = [];
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) ventCells.push((vj + j) * N + vi + i);
  // The tube spills from the cliff top, just inland of the shore.
  const [ti, tj] = at(TUBE_X, coastZ(TUBE_X) + 16);
  const tubeCell = tj * N + ti;

  // Adds lava of heat t at a cell, at rate (m/s) for dt.
  function pour(i, rate, t, dt) { const a = rate * dt; h[i] += a; Q[i] += a * t; }

  // One step. src: { vent (m/s per cell), tube (m/s) }.
  function step(dt, { vent = 0, tube = 0 }) {
    if (vent > 0) for (const i of ventCells) pour(i, vent, 1, dt);
    if (tube > 0) pour(tubeCell, tube, 0.74, dt);
    dh.fill(0); dQ.fill(0); fx.fill(0); fz.fill(0);
    const out = new Float32Array(8);
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const c = j * N + i, hc = h[c];
      if (hc < 0.02) continue;
      const T = Q[c] / hc;
      if (T < T_STOP) continue;
      const s = b[c] + hc;
      // Hot lava is runny; cool lava needs a steep slope to move.
      const k = (T - T_STOP) / (1 - T_STOP), mob = MOB * k * Math.sqrt(k) * Math.sqrt(Math.min(hc, 6));
      const ys = YS0 + YS1 * (1 - T) * (1 - T) * (1 - T);
      let total = 0;
      for (let n = 0; n < 8; n++) {
        out[n] = 0;
        const m = c + nbOff[n], d = s - b[m] - h[m];
        if (d <= 0) continue;
        const ex = d / nbDist[n] - ys;
        if (ex <= 0) continue;
        // Never move more than a third of the drop: no ping-pong.
        const f = Math.min(mob * hc * ex * NB[n][2] * dt, d * 0.3);
        out[n] = f; total += f;
      }
      if (total <= 0) continue;
      const scale = total > 0.45 * hc ? 0.45 * hc / total : 1;
      for (let n = 0; n < 8; n++) {
        const f = out[n] * scale;
        if (f <= 0) continue;
        const m = c + nbOff[n];
        dh[m] += f; dQ[m] += f * T; dh[c] -= f; dQ[c] -= f * T;
        fx[c] += NB[n][0] * f; fz[c] += NB[n][1] * f;
      }
    }
    for (let c = 0; c < cells; c++) {
      let hc = h[c] + dh[c], q = Q[c] + dQ[c];
      if (hc < 1e-4) { h[c] = 0; Q[c] = 0; continue; }
      let T = q / hc;
      if (sea[c]) {
        // The sea quenches the lava and breaks it up; its heat goes to steam.
        const T1 = T * Math.exp(-dt * 2.2), h1 = hc * Math.exp(-dt * 0.5);
        steam[c] += hc * T - h1 * T1;
        hc = h1; T = T1;
      } else if (T > 0.001) {
        // Thin lava cools fast; thick lava keeps its heat.
        const surf = shore[c] ? 4 : 1;
        const T1 = T / (1 + dt * COOL * surf * T / (0.4 + hc));
        if (shore[c]) steam[c] += 0.6 * hc * (T - T1);
        T = T1;
      }
      h[c] = hc; Q[c] = hc * T;
      // The speed the eye sees: cells a second, eased.
      const inv = 1 / Math.max(hc, 0.3);
      vx[c] += (fx[c] * inv / dt - vx[c]) * 0.15;
      vz[c] += (fz[c] * inv / dt - vz[c]) * 0.15;
    }
  }

  // The state for the land shader: h, T, vx, vz per cell.
  const tex = new Float32Array(cells * 4);
  function pack() {
    for (let c = 0; c < cells; c++) {
      const hc = h[c];
      tex[c * 4] = hc; tex[c * 4 + 1] = hc > 1e-4 ? Q[c] / hc : 0;
      tex[c * 4 + 2] = vx[c]; tex[c * 4 + 3] = vz[c];
    }
    return tex;
  }

  // The glow the lava casts: a coarse, blurred map of its light, 40 by 40.
  const GN = 40, glowMap = new Float32Array(GN * GN), tmp = new Float32Array(GN * GN);
  function glow() {
    glowMap.fill(0);
    const r = N / GN;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = j * N + i, hc = h[c];
      if (hc < 0.05) continue;
      const T = Q[c] / hc;
      if (T < 0.25) continue;
      // Light rises steeply with heat; crust hides much of it.
      const e = Math.min(hc, 1.5) * Math.pow((T - 0.25) / 0.75, 3);
      glowMap[Math.floor(j / r) * GN + Math.floor(i / r)] += e / (r * r);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
        let s = 0, w = 0;
        for (let k = -2; k <= 2; k++) { const ii = i + k; if (ii < 0 || ii >= GN) continue; const ww = 3 - Math.abs(k); s += glowMap[j * GN + ii] * ww; w += ww; }
        tmp[j * GN + i] = s / w;
      }
      for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
        let s = 0, w = 0;
        for (let k = -2; k <= 2; k++) { const jj = j + k; if (jj < 0 || jj >= GN) continue; const ww = 3 - Math.abs(k); s += tmp[jj * GN + i] * ww; w += ww; }
        glowMap[j * GN + i] = s / w;
      }
    }
    return glowMap;
  }

  // Steam sources along the shore: columns of emission, with their centres.
  // Returns [{ x, z, e }] for each column with steam, and clears the store.
  const colE = new Float32Array(N), colZ = new Float32Array(N);
  function sources(dt) {
    colE.fill(0); colZ.fill(0);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = j * N + i, e = steam[c];
      if (e <= 0) continue;
      colE[i] += e; colZ[i] += e * (GRID.z0 + (j + 0.5) * CS);
      steam[c] = 0;
    }
    const list = [];
    for (let i = 0; i < N; i++) if (colE[i] > 0) list.push({ x: GRID.x0 + (i + 0.5) * CS, z: colZ[i] / colE[i], e: colE[i] / dt });
    return list;
  }

  // Heat in flowing lava, and the hot area: for the loop and the sound.
  function stats() {
    let hot = 0, moving = 0, area = 0;
    for (let c = 0; c < cells; c++) {
      const hc = h[c];
      if (hc < 0.05) continue;
      const T = Q[c] / hc;
      if (T > 0.3) { area++; hot += hc * T; }
      if (T > T_STOP + 0.04) moving++;
    }
    return { hot, moving, area: area * CS * CS };
  }

  return { step, pack, glow, sources, stats, N, CS, GN, ventCells, get tubeCell() { return tubeCell; } };
}
