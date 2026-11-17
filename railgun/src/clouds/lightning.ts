// Load order: clouds/probe runs first.
import './probe.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { state, type ShaftCloud } from '../state.ts';
import { camera, rad } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { hs1, shaftList } from './shafts.ts';
import { BAND, ROCK_FAR } from './bands.ts';
import { CLOUD_U, GIANTS, TOWERS, cloudLayer } from './clouds.ts';

/* ---------- storm lightning: flashes inside the towers and the giant ---------- */
// After Window seat: a burst of one to five strokes, 50 to 220 ms apart.
// Brightness is log-normal: most flashes are dim, a few blaze.
// Most sit mid-level in the core; a mature storm sends some through its anvil.
// A storm recharges between bursts: one somewhere every 6 to 22 s.
export const STORM_SPOTS = [...shaftList(TOWERS), ...shaftList(GIANTS)];
// One stroke: start time, world place, light level, reach in metres.
export interface Stroke { t0: number; P: THREE.Vector3; L: number; r: number; }
// vol: the storm probe is on, so flashes sit inside its narrower towers.
export const stormFl = { rate: 1, next: 4, strokes: [] as Stroke[], vol: false };
const flV = new THREE.Vector3();
// A storm's centre as the card shader drifts it, at the cloud clock t.
export function stormAt(c: ShaftCloud, t: number, out: THREE.Vector3) {
  const ph = (((t * (0.6 + 0.8 * hs1(c.sd))) / 360 + hs1(c.sd + 1)) % 1 + 1) % 1, a = (ph - 0.5) * rad(16) * 0.2;
  return out.set(c.p.x * Math.cos(a) - c.p.z * Math.sin(a), 0, c.p.x * Math.sin(a) + c.p.z * Math.cos(a));
}
// One spot in a storm: across the card at the eye's right, at a height.
function stormSpot(c: ShaftCloud, P0: THREE.Vector3, out: THREE.Vector3) {
  const fx = P0.x - camera.position.x, fz = P0.z - camera.position.z, fl = Math.hypot(fx, fz) || 1;
  const anvil = Math.random() < 0.25;
  // The probe's tower is narrower: its core spans about a quarter of its height.
  const rc = 3.4 * c.H / 14, vol = stormFl.vol;
  const across = vol ? (Math.random() - 0.5) * 1.2 * rc : (anvil ? 0.1 + 0.5 * Math.random() : (Math.random() - 0.5) * 0.5) * c.W;
  const up = vol ? (anvil ? 12.2 : 3 + 7 * Math.random()) / 14 : anvil ? 0.8 : 0.25 + 0.45 * Math.random();
  out.set(P0.x + (-fz / fl) * across, c.base + c.H * up, P0.z + (fx / fl) * across);
  return out;
}
// A burst rumbles through one storm: two to five spots light in turn.
// Each spot fires one to four strokes; now and then a cell boils over.
export function stormBurst() {
  const c = STORM_SPOTS[Math.floor(Math.random() * STORM_SPOTS.length)], P0 = stormAt(c, state.simT, new THREE.Vector3());
  const boil = Math.random() < 0.15;
  const spots = boil ? 6 + Math.floor(Math.random() * 6) : 2 + Math.floor(Math.random() * 4);
  let t = state.simT;
  for (let j = 0; j < spots; j++) {
    const P = stormSpot(c, P0, new THREE.Vector3());
    // Log-normal light; a sheet flash is wide, a pulse is tight.
    const L = Math.exp(-0.3 + 0.8 * (Math.random() + Math.random() + Math.random() - 1.5)) * 2.8, r = stormFl.vol ? (3.4 * c.H / 14) * (0.4 + 0.8 * Math.random()) : c.W * (0.1 + 0.22 * Math.random());
    const n = 1 + Math.floor(Math.random() * Math.random() * 4);
    let ts = t;
    for (let k = 0; k < n; k++) { stormFl.strokes.push({ t0: ts, P: P.clone().add(flV.set((Math.random() - 0.5) * 0.1 * c.W, (Math.random() - 0.5) * 0.06 * c.H, 0)), L: L * (k ? 0.5 + 0.6 * Math.random() : 1), r }); ts += 0.05 + 0.17 * Math.random(); }
    // The next spot answers 0.1 to 0.9 s later; a boiling cell fires faster.
    t += (boil ? 0.08 : 0.15) + (boil ? 0.3 : 0.75) * Math.random();
  }
}
export function stepStorms() {
  const u = CLOUD_U.uFl.value;
  if (stormFl.rate > 0.01 && !reduced() && state.simT >= stormFl.next) {
    stormBurst();
    stormFl.next = state.simT + (6 + 16 * Math.random()) / stormFl.rate;
  }
  // Each stroke snaps on, then dies in a tenth of a second with a flicker.
  stormFl.strokes = stormFl.strokes.filter(s => state.simT - s.t0 < 0.6);
  const live = stormFl.strokes.filter(s => state.simT >= s.t0).map(s => { const a = state.simT - s.t0; return { s, v: s.L * Math.exp(-a / 0.07) * (0.75 + 0.25 * Math.sin(a * 140)) }; }).sort((a, b) => b.v - a.v);
  for (let i = 0; i < 4; i++) {
    const e = live[i];
    if (e) { u[i].set(e.s.P.x, e.s.P.y, e.s.P.z, e.v); CLOUD_U.uFlR.value.setComponent(i, e.s.r); } else u[i].w = 0;
  }
}
// A middle deck: heaps four to six kilometres up fill the middle of the sky.
// They stand 23 to 34 km out, 10 degrees up or more, clear of the crests.
export const MIDS = [
  [-14, 30000, 5000, 3000, 1500, 0], [2, 24000, 4600, 2400, 1300, 0], [16, 33000, 5800, 3800, 1900, 0], [31, 26000, 4800, 2400, 1300, 0],
  [40, 34000, 5600, 3400, 1800, 0], [53, 23000, 4500, 2000, 1100, 0], [62, 31000, 5200, 3000, 1600, 0], [74, 27000, 4700, 2400, 1300, 0],
];
// Mids past the rock draw behind it; the rest draw in front.
const mids = cloudLayer(MIDS, BAND.mids, c => c[1] <= ROCK_FAR);
const farMids = cloudLayer(MIDS, BAND.far, c => c[1] > ROCK_FAR);
// The deck stands in for the middle heaps; they show only with the deck off.
export function setDeck(v: number) {
  U.uDeck.value = v;
  mids.visible = farMids.visible = v < 0.01;
  state.shaftOcc = null;
}
