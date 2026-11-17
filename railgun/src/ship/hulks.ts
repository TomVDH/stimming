// @ts-nocheck
// Load order: fx/blast runs first.
import '../fx/blast.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { HULL } from '../../ship.js';
import { state } from '../state.ts';
import { camera, ui } from '../setup.ts';
import { IMP_U } from '../sky/impacts.ts';
import { BAND } from '../clouds/bands.ts';
import { PLANET_R } from '../world/ground.ts';
import { ast, placeAst } from '../rock/asteroid.ts';
import { SHIP_SCALE, hulkSite, newShip, ship, shipMeshes, shipOff } from './battleship.ts';
import { PU } from '../rock/trail.ts';
import { prewarmEmbers } from '../rock/fragments.ts';
import { makeVol, volSteps } from '../fx/volfx.ts';
import { hailLights } from '../fx/hail.ts';
import { respawn, stepAim } from './hit.ts';
import { fill, resetReady, spin } from '../play/reset.ts';
import { kit, pend } from '../sound/kit.ts';
import { roarSet, sfxQueue, shipRumble } from '../sound/ship.ts';

/* ---------- the hulks land: a flash, a dust dome, a late rumble ---------- */
// A dome lives 60 s.
// The next ship rises once the last dome is that old.
const DOME_LIFE = 60;
// A landed streak fades over 25 s.
export const LINGER = 25;
// The dust drifts downwind, metres per second.
const DOME_WIND = new THREE.Vector3(6, 0, 2);
// uDm: age, size in metres, seed, flash level.
// uDc: the dome's foot, carried by the wind.
export const domeVols = HULL.sections.map(() => makeVol(/* glsl */`
// The domes take less of the haze.
// They then read at sixty kilometres.
#define VHAZE 0.3
// The dome shades itself in closed form.
// It skips the march toward the sun.
#define VSHADE
uniform vec4 uDm;
uniform vec3 uDc, uDustC, uImpC;
// The dome climbs fast, then spreads as it settles.
float dH(float a) { return uDm.y * (0.12 + 0.88 * (1.0 - exp(-a / 7.0))); }
float dR(float a) { return uDm.y * 0.7 * (0.3 + 0.7 * (1.0 - exp(-a / 5.0))) * (1.0 + 0.35 * smoothstep(10.0, 60.0, a)); }
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  float a = uDm.x, S = uDm.y, Hd = dH(a), Rd = dR(a);
  vec3 q = p - uDc;
  float old = smoothstep(8.0, 50.0, a);
  // The wind shears the top over.
  q.x -= q.y * 0.25 * old;
  // A round dome over a flat skirt.
  float rd = length(vec3(q.x / Rd, q.y / Hd, q.z / Rd));
  float rs = length(vec3(q.x / (1.7 * Rd), q.y / (0.22 * Hd), q.z / (1.7 * Rd)));
  float r = min(rd, rs);
  if (r > 1.4) return 0.0;
  vec3 w = q / S * 2.2 + vec3(uDm.z, -a * 0.012, 0.0);
  // A slow curl warp tears the dome into billows.
  w += (texture(uVol, w * 0.5 + vec3(a * 0.004)).rgb - 0.5) * 0.35;
  float n = 0.6 * texture(uVol, w * 0.45).r + 0.28 * texture(uVol, w * 1.1).r + 0.12 * texture(uVol, w * 2.6).g;
  float shape = smoothstep(1.0, 0.8, r + (0.62 - n) * 1.2);
  // The dust settles from the rim and its thin parts.
  float er = smoothstep(20.0, 60.0, a);
  float d = clamp((shape - er * (0.15 + 0.7 * (1.0 - n) + 0.3 * r)) / max(1.0 - 0.7 * er, 0.15), 0.0, 1.0);
  // The flash glows in the dome's foot.
  em = uImpC * uDm.w * exp(-max(q.y, 0.0) / (0.2 * Hd)) * d * 6.0 / S;
  return d * 6.0 / S * (1.0 - smoothstep(40.0, 60.0, a));
}
vec3 alb(vec3 p) { return uDustC; }
// The dome's foot sits in its own shade.
// Its crown takes the sun.
// The side away from the sun sits in shade too.
float vshade(vec3 p, float d) {
  vec3 q = p - uDc;
  float away = max(-dot(q / max(length(q), 1.0), uSun), 0.0);
  return 0.8 * (1.0 - clamp(q.y / dH(uDm.x), 0.0, 1.0)) + 1.6 * away + 0.1 * d * uDm.y;
}
// The flash lights the dust from its foot.
vec3 vlight(vec3 p) { vec3 b = p - uDc; return uImpC * uDm.w * 4.0 * uDm.y * uDm.y / (dot(b, b) + uDm.y * uDm.y); }`, {
  uDm: { value: new THREE.Vector4() }, uDc: { value: new THREE.Vector3() },
  uDustC: { value: new THREE.Vector3(...linFit(0.72, 0.05, 65)) }, uImpC: IMP_U.uImpC,
}));
for (const m of domeVols) {
  // Mesas stand in front of the domes.
  m.material.depthTest = true;
  // The far storm towers draw first.
  // The near heaps draw after.
  m.renderOrder = BAND.domes;
}
// shipDomes: { m, t0, i, P, S } for each landed hulk.
// shipRumbles: the audio handles of every started ship sound.
// shipDue: the sounds that wait for their sim time.
// shipVoice: per hulk, its groan and roar state.
// shipSfxLog: every ship sound, for QA.
export const shipDomes = [], shipRumbles = [], shipDue = [], shipVoice = [], shipSfxLog = [];
// impK is a QA switch.
// 1 draws the impacts in full.
// 0 draws no impact.
// 2 keeps the domes and drops the flash's sky and cloud light.
// 3 drops only the cloud light.
state.impK = 1;
// The flash is a hard spike.
// A glow follows for some seconds.
// Reduced motion halves it.
export const flashOf = a => (a < 0 ? 0 : (reduced() ? 0.5 : 1) * (Math.exp(-a / 0.3) + 0.35 * Math.exp(-a / 2.5) + 0.06 * Math.exp(-a / 12)));
export const domeAlive = d => state.simT - d.t0 < DOME_LIFE;
// Each landing gets a dome and a rumble.
// A Reset's spin lets no new impact land.
// The next target comes when the last dome settles.
export function stepImpacts() {
  if (state.tgtKind !== 'ship' || spin || (fill && !fill.cut)) return;
  ship.hulks.forEach((h, i) => {
    if (h.landedAt === null || h.domed) return;
    h.domed = true;
    const m = shipMeshes[i];
    shipDomes.push({ m: domeVols[i], t0: h.landedAt, i, P: hulkSite(i, new THREE.Vector3()), S: 3500 + 1.5 * m.geometry.boundingSphere.radius * SHIP_SCALE });
    h.rumbleAt = h.landedAt + h.rumbleDelay;
    // The frame loop starts the rumble when its time comes.
    const rs = shipMeshes.map(x => x.geometry.boundingSphere.radius), k = 0.6 + 0.4 * rs[i] / Math.max(...rs);
    sfxQueue('rumble', h.rumbleAt, 8, i, k, h.landedAt, ac => shipRumble(ac, k));
  });
  if (ship.state === 'gone' && ship.hulks.every(h => state.simT - h.landedAt >= DOME_LIFE)) nextTarget();
}
// The domes and the flash lights follow the clock.
export function updateDomes() {
  const L = IMP_U.uImp.value;
  for (const v of L) v.w = 0;
  for (const m of domeVols) m.visible = false;
  for (const d of shipDomes) {
    const a = state.simT - d.t0;
    if (a < 0 || !domeAlive(d) || !state.impK) continue;
    const f = flashOf(a);
    L[d.i].set(d.P.x, d.P.y, d.P.z, state.impK === 2 ? 0 : f);
    const u = d.m.material.uniforms, Hd = d.S * (0.12 + 0.88 * (1 - Math.exp(-a / 7))), Rd = d.S * 0.7 * (0.3 + 0.7 * (1 - Math.exp(-a / 5))) * (1 + 0.35 * THREE.MathUtils.smoothstep(a, 10, 60));
    u.uDc.value.copy(d.P).addScaledVector(DOME_WIND, a);
    // The dome stands on the curved ground.
    u.uDc.value.y -= ((u.uDc.value.x - camera.position.x) ** 2 + (u.uDc.value.z - camera.position.z) ** 2) / (2 * PLANET_R);
    u.uDm.value.set(a, d.S, 0.37 * d.i + 0.11, f);
    // The bound holds the sheared dome and its skirt.
    u.uC.value.copy(u.uDc.value);
    u.uC.value.y += 0.35 * Hd;
    u.uC.value.x += 0.15 * Hd;
    u.uR.value = 1.25 * Math.hypot(1.75 * Rd, 0.8 * Hd);
    // A far dome draws before the storm towers in front of it.
    d.m.renderOrder = d.P.distanceTo(camera.position) > 70000 ? BAND.far : BAND.domes;
    // The domes are small on screen.
    // More steps hide the grain at little cost.
    u.uVSteps.value = Math.min(48, Math.round(volSteps() * 1.5));
    d.m.visible = true;
  }
  // Hail landings take the slots no dome holds.
  if (state.impK && state.tgtKind === 'rock') hailLights(L);
}
export function killVoice(r) {
  for (const n of r.nodes) { try { n.stop(); } catch { /* not started */ } try { n.disconnect(); } catch { /* gone */ } }
  pend.delete(r);
  roarSet.delete(r);
}
// The Reset click stops every ship sound.
export function stopRumbles() {
  for (const r of shipRumbles) killVoice(r);
  for (const v of shipVoice) if (v?.roar) killVoice(v.roar);
  shipRumbles.length = 0; shipVoice.length = 0; shipDue.length = 0; shipSfxLog.length = 0;
}
// Reset's white and the next ship clear the impacts.
// The rumbles stop.
// The domes and flashes go.
export function clearShip() {
  stopRumbles();
  shipDomes.length = 0;
  for (const m of domeVols) m.visible = false;
  for (const v of IMP_U.uImp.value) v.w = 0;
}
// True while a ship sound waits or plays.
export function rumbleDue() {
  if (shipDue.length) return true;
  if (!shipRumbles.length) return false;
  const now = kit.ac?.currentTime ?? 0;
  return shipRumbles.some(r => pend.has(r) && r.end >= now);
}
// The next target follows the stored Target.
// A ship rises from the horizon.
function nextTarget() {
  clearShip();
  resetReady(false);
  state.tgtKind = ui.setting('target').value;
  if (state.tgtKind === 'ship') { newShip(0); return; }
  shipOff();
  respawn();
  ast.s = 0;
  PU.uTrail.value = 1;
  placeAst();
  stepAim(0, true);
  prewarmEmbers();
}
