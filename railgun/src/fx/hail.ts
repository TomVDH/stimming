// @ts-nocheck
// Load order: fx/volumes runs first.
import './volumes.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { camera, rnd } from '../setup.ts';
import { yUp } from '../world/axis.ts';
import { PLANET_R } from '../world/ground.ts';
import { makeFragTrail } from '../rock/fragments.ts';
import { puff } from './dust.ts';
import { starMat, writeStar } from './burst.ts';
import { dustP, dustV } from '../play/charge.ts';
import { makeFlare } from './flares.ts';
import { flare } from './bowshock.ts';
import { SHARD_MAX, sPos, sSeed, sVel, shardGeo } from '../rock/shards.ts';
import { flashOf } from '../ship/hulks.ts';
import { chunks, shardAt } from './volumes.ts';
import { bp, bv } from '../play/shot.ts';

/* ---------- hail: the pieces land along the horizon ---------- */
// Each piece that survives the fall lands with a flash.
// It throws a splash of embers and a plume of dust.
// Its light reaches the horizon sky and the cloud bases.
// The pieces land 25 to 45 km out, just past the horizon.
// hailT: each shard's landing age; zero for none.
export const hailT = new Float32Array(SHARD_MAX), hailDone = new Uint8Array(SHARD_MAX);
// Eight flash cards serve the landings in turn.
const hailCards = Array.from({ length: 8 }, () => makeFlare(linFit(0.86, 0.13, 58)));
for (const m of hailCards) m.material.depthTest = true;
// hails: { P, t0, r, card } for each landing, newest last.
export const hails = [];
let hailCard = 0;
const hailP = new THREE.Vector3(), hailV = new THREE.Vector3();
// Most pieces land on the plain in front of the ranges: 16 to 34 km out.
// The rest land behind the first ranges: 95 to 125 km out.
const HAIL_NEAR = 16000, HAIL_FAR = 34000, HAIL_BACK = [95000, 125000], HAIL_BACK_K = 0.4;
// The shatter aims each piece's sideways throw at that band.
// The fall's time stays; only the sideways speed changes.
export function aimHail(n) {
  const P = sPos.array, V = sVel.array, S = sSeed.array, kh = 0.035, cx = camera.position.x, cz = camera.position.z;
  let ux = P[0] - cx, uz = P[2] - cz;
  const ul = Math.hypot(ux, uz) || 1;
  ux /= ul; uz /= ul;
  for (let i = 0; i < n; i++) {
    const vt = 260 + 480 * ((S[i * 4] * 3.7) % 1);
    const yAt = t => P[i * 3 + 1] + V[i * 4 + 1] * (1 - Math.exp(-0.1 * t)) / 0.1 - vt * (t - (1 - Math.exp(-0.2 * t)) / 0.2);
    let T = 58;
    if (yAt(58) < 15) { let lo = 0; for (let b = 0; b < 20; b++) { const m = 0.5 * (lo + T); if (yAt(m) < 15) T = m; else lo = m; } }
    // Big pieces land nearer the middle of the band; crumbs scatter wider.
    const d = rnd() < HAIL_BACK_K ? HAIL_BACK[0] + (HAIL_BACK[1] - HAIL_BACK[0]) * rnd() : HAIL_NEAR + (HAIL_FAR - HAIL_NEAR) * rnd(), side = (rnd() - 0.5) * (0.35 + 0.25 * rnd()) * d;
    const tx = cx + ux * d - uz * side, tz = cz + uz * d + ux * side, e = (1 - Math.exp(-kh * T)) / kh;
    V[i * 4] = (tx - P[i * 3]) / e; V[i * 4 + 2] = (tz - P[i * 3 + 2]) / e;
  }
  sVel.needsUpdate = true;
}
// Ribbons: the main rock's smoke, cheap, behind the biggest loose pieces.
const hailRibs = Array.from({ length: 12 }, () => ({ m: makeFragTrail(true), i: -1 }));
const ribV = new THREE.Vector3();
function stepRibs() {
  const S = sSeed.array, n = state.simT <= state.shardsEnd ? shardGeo.instanceCount : 0;
  hailRibs.forEach(r => { r.m.visible = false; });
  if (!n || reduced()) return;
  // The biggest loose pieces take the ribbons, once per shatter.
  if (hailRibs[0].i < 0) {
    const ids = [];
    for (let i = chunks.length; i < n; i++) ids.push(i);
    ids.sort((a, b) => S[b * 4 + 1] - S[a * 4 + 1]);
    hailRibs.forEach((r, j) => { r.i = j < ids.length ? ids[j] : -2; });
  }
  for (const r of hailRibs) {
    if (r.i < 0) continue;
    const age = state.simT - S[r.i * 4 + 2], rad = S[r.i * 4 + 1];
    const shr = ((S[r.i * 4] * 5.13) % 1) < 0.5 ? 1 - THREE.MathUtils.smoothstep(age, 8, 22) : 1;
    shardAt(r.i, age, bp, ribV);
    const landed = hailT[r.i] && age >= hailT[r.i];
    const lAge = landed ? age - hailT[r.i] : 0;
    // The ribbon fades as the piece slows, burns away or lands.
    const on = Math.min(1, age / 1.5) * Math.max(shr, 0) * (landed ? Math.exp(-lAge / 3) : 1) * (1 - THREE.MathUtils.smoothstep(age, 50, 58));
    if (on < 0.01) continue;
    const u = r.m.material.uniforms;
    u.uRes.value.copy(starMat.uniforms.uRes.value); u.uDpr.value = starMat.uniforms.uDpr.value;
    u.uP.value.copy(bp);
    // The ribbon trails back along the path the piece just flew.
    shardAt(r.i, Math.max(age - 6, 0), ribV, bv);
    u.uAway.value.subVectors(ribV, bp);
    u.uLen.value = Math.max(u.uAway.value.length(), 1);
    u.uAway.value.divideScalar(u.uLen.value);
    u.uSide.value.crossVectors(u.uAway.value, yUp).normalize();
    u.uR.value = 0.6 * rad; u.uOn.value = on;
    u.uLift.value.set(0, 0, 1);
    r.m.visible = true;
  }
}
// The shatter finds each piece's landing age by bisection.
export function armHail(n) {
  hailRibs.forEach(r => { r.i = -1; });
  const P = sPos.array, V = sVel.array, S = sSeed.array;
  hailDone.fill(0); hailT.fill(0); hails.length = 0;
  for (let i = 0; i < n; i++) {
    const vt = 260 + 480 * ((S[i * 4] * 3.7) % 1);
    const yAt = t => P[i * 3 + 1] + V[i * 4 + 1] * (1 - Math.exp(-0.1 * t)) / 0.1 - vt * (t - (1 - Math.exp(-0.2 * t)) / 0.2);
    if (yAt(58) >= 15) continue;
    let lo = 0, hi = 58;
    for (let b = 0; b < 20; b++) { const m = 0.5 * (lo + hi); if (yAt(m) < 15) hi = m; else lo = m; }
    hailT[i] = hi;
  }
}
// The plain drops away with the planet's curve.
const curveY = p => -((p.x - camera.position.x) ** 2 + (p.z - camera.position.z) ** 2) / (2 * PLANET_R);
function hailLand(i) {
  const S = sSeed.array, age = hailT[i];
  // A piece that burned away in the air lands as nothing.
  const shr = ((S[i * 4] * 5.13) % 1) < 0.5 ? 1 - THREE.MathUtils.smoothstep(age, 8, 22) : 1;
  if (shr < 0.3) return;
  shardAt(i, age, hailP, hailV);
  hailP.y = curveY(hailP);
  const r = S[i * 4 + 1] * shr, sp = r / 120;
  const card = hailCards[hailCard++ % hailCards.length];
  hails.push({ P: hailP.clone(), t0: state.simT, r, card });
  if (hails.length > 24) hails.shift();
  if (reduced()) return;
  // A splash of embers leaps up and falls back.
  for (let n = 0; n < 8 + Math.round(10 * sp); n++) {
    const a = rnd() * Math.PI * 2, h = (25 + 70 * rnd()) * Math.min(sp, 3);
    hailV.set(Math.cos(a) * h * 0.7, h * (0.8 + rnd()), Math.sin(a) * h * 0.7);
    writeStar(hailP, state.simT + rnd() * 0.08, hailV, 0.25 + 0.2 * rnd(), 2, 1.6 + 1.6 * rnd(), 0.25, 1 + rnd(), 3, 0.5 + 0.4 * rnd());
  }
  // The dust plume: a tall lifted core and a low skirt.
  for (let n = 0; n < 7; n++) {
    const a = rnd() * Math.PI * 2, out = 4 + 10 * rnd();
    puff(dustP.copy(hailP).setY(hailP.y + 0.3 * r), dustV.set(Math.cos(a) * out, 10 + 22 * rnd() * (n < 4 ? 1 : 0.3), Math.sin(a) * out), 10 + 6 * rnd(), r * (0.9 + 1.2 * rnd()));
  }
}
// Each frame: land the due pieces, then drive their flashes.
export function stepHail() {
  stepRibs();
  if (state.simT <= state.shardsEnd) {
    const n = shardGeo.instanceCount, S = sSeed.array;
    // The four trained chunks land in stepChunks.
    for (let i = chunks.length; i < n; i++) if (hailT[i] && !hailDone[i] && state.simT - S[i * 4 + 2] >= hailT[i]) { hailDone[i] = 1; hailLand(i); }
  }
  for (const m of hailCards) m.visible = false;
  for (const h of hails) {
    const a = state.simT - h.t0;
    if (a < 0 || a > 6) continue;
    // A white spike, then a red glow that sinks into the plain.
    flare(h.card, h.P, h.r * (5 + 4 * (1 - Math.exp(-a / 0.4))), (Math.exp(-a / 0.12) * 2.2 + 0.5 * Math.exp(-a / 1.6)) * Math.min(1, h.r / 150));
  }
}
// The newest landings light the horizon in the free impact slots.
export function hailLights(L) {
  let k = hails.length - 1;
  for (const v of L) {
    if (v.w > 0) continue;
    for (; k >= 0; k--) {
      const h = hails[k], f = 0.35 * Math.min(1, h.r / 200) * flashOf(state.simT - h.t0);
      if (f > 0.004) { v.set(h.P.x, h.P.y, h.P.z, f); k--; break; }
    }
  }
}
