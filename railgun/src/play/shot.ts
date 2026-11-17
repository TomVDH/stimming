// Load order: fx/hail runs first.
import '../fx/hail.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { KILL as SHIP_KILL } from '../../ship.js';
import { landRound, makeTally, MAX_ROUNDS, LAUNCH, GAP, launchAt } from '../../salvo.js';
import { state } from '../state.ts';
import type { Cycle, ShipHit, TargetKind } from '../state.ts';
import { SIZES, camera, opts, rad, rnd } from '../setup.ts';
import { AX, AX_UP, BREECH, FALL, MUZZLE, axisAt, barrelPt, yUp } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { ejectCase } from '../gun/case.ts';
import { ast, astAt, astMat, astMesh } from '../rock/asteroid.ts';
import { SHIP_AIM_R, ship, shipAim, shipMeshes } from '../ship/battleship.ts';
import { PU } from '../rock/trail.ts';
import { armFrags } from '../rock/fragments.ts';
import { starMat, writeStar } from '../fx/burst.ts';
import { cam } from '../view/camera.ts';
import { fallT } from './approach.ts';
import { tracers } from '../fx/ion.ts';
import { chargeDust, shellMesh, shotDust } from '../gun/muzzle.ts';
import { flingMotes } from '../gun/motes.ts';
import { SHARD_MAX, sPos, sSeed, sVel, shardGeo } from '../rock/shards.ts';
import { chunks, shardAt } from '../fx/volumes.ts';
import { aimHail, armHail } from '../fx/hail.ts';
import { manual, sandStreams, shipHit } from '../ship/hit.ts';
import { contactS, endStrike } from '../rock/strike.ts';
import { wake } from '../loop.ts';
import { kit } from '../sound/kit.ts';
import { shotSound } from '../sound/shot.ts';
import { craterSound, hitSounds, huntSound, roundSound, rumble } from '../sound/hit.ts';

/* ---------- the shot ---------- */
// One shot at a time.
// The slug runs the rails in 0.3 s.
// Then the bolt crosses to the rock.
// The deepest salvo slide in metres: the breech's clearance point.
export const SALVO_CAP = 240;
// shot is the gun's firing cycle; lit is the cycle whose hit lights the sky.
state.shot = null; state.lit = null; state.hitFlash = 0; state.flashNow = 0;
export const bp = new THREE.Vector3(), bq = new THREE.Vector3(), bv = new THREE.Vector3();
// Rounds in flight.
// A round's clock starts on the rails, 0.3 s before it leaves the muzzle.
// What a landed round did; null until it lands.
export type RoundRes = ShipHit | 'miss' | ReturnType<typeof landRound>;
// A tracer slot: the bolt, the line and the puffs one round draws.
export type Tracer = typeof tracers[number];
// One round: its number, count, power, clock, cycle and slot.
export interface Round {
  j: number;
  n: number;
  c: number;
  salvo: boolean;
  T: number;
  cy: Cycle;
  s0: number;
  launched: boolean;
  hit: boolean;
  res: RoundRes | null;
  chunk: number;
  slot: Tracer | null;
  kind: TargetKind;
  // launchRound sets these three; each is undefined until then.
  target?: THREE.Vector3;
  muzzle?: THREE.Vector3;
  canHit?: boolean;
  // A hunting round's new path: start time, start, end, length.
  re?: { t: number; p0: THREE.Vector3; to: THREE.Vector3; T: number };
}
export const rounds: Round[] = [];
// Where a round is t seconds after its rail start.
export function roundAt(r: Round, t: number, out: THREE.Vector3) {
  // A hunting round leaves its path and runs slowly to its chunk.
  if (r.re && t >= r.re.t) return out.lerpVectors(r.re.p0, r.re.to, Math.min(1, (t - r.re.t) / r.re.T));
  if (t <= 0 || !r.target) return axisAt(BREECH, out);
  if (t < 0.3) return axisAt(BREECH + (1 - BREECH) * Math.pow(t / 0.3, 2), out);
  // It leaves at 2.6 times its mean speed and slows in the air: same arrival, a much quicker look.
  const x = Math.min(1, (t - 0.3) / r.T), u = 1 - Math.pow(1 - x, 2.6);
  return out.lerpVectors(r.muzzle!, r.target, u);
}
// A round's landing time on its own clock.
export const landOf = (r: Round) => (r.re ? r.re.t + r.re.T : 0.3 + r.T);
// The target seam: the rock or the capital ship.
// The live target takes the stored choice.
// It updates at load and at Reset.
state.tgtKind = 'rock';
// Where the target is now.
export function tgtPos(out: THREE.Vector3) {
  if (state.tgtKind === 'rock') return out.copy(ast.pos);
  return shipAim(state.simT, out);
}
// Where the target is after 0.3 + T seconds.
// The rock's lead stops at contact with the ground.
export function tgtLead(T: number, out: THREE.Vector3) {
  if (state.tgtKind === 'rock') return astAt(Math.min(ast.s + (0.3 + T) / fallT(), contactS()), out);
  return shipAim(state.simT + 0.3 + T, out);
}
// The target's radius, as the sight and the laser see it.
export function tgtR() { return state.tgtKind === 'rock' ? ast.R : SHIP_AIM_R; }
// True while the target holds its place.
// That means the rock or an unbroken ship.
export function tgtLive() { return state.tgtKind === 'rock' || ship.state === 'arrive' || ship.state === 'station' || ship.state === 'wounded'; }
// True while the target shows in the sky.
export function tgtShown() { return state.tgtKind === 'rock' ? astMesh.visible : shipMeshes.some(m => m.visible); }
// True while a bolt can hit the target.
export function tgtCanHit() {
  if (state.tgtKind === 'rock') return ast.state === 'approach' || ast.state === 'hold' || ast.state === 'strike';
  return ship.state === 'station' || ship.state === 'wounded';
}
// The bolt lands on the target.
// A ship round passes itself, so the hit marks its cycle.
function tgtHit(c: number, r?: Round) {
  if (state.tgtKind === 'rock') shatter(c);
  else return shipHit(c, r);
}
// True when ship rounds already in flight break the ship first.
// Each earlier round either wounds or kills.
function shipDoomed(r: Round) {
  let s = ship.state;
  for (const q of rounds) {
    if (q === r) break;
    if (q.kind !== 'ship' || !q.launched || q.hit || !q.canHit) continue;
    if (s === 'station') s = q.c >= SHIP_KILL ? 'gone' : 'wounded';
    else if (s === 'wounded') s = 'gone';
  }
  return s !== 'station' && s !== 'wounded';
}
// A round takes its aim and a tracer slot as it starts down the rails.
// Each round leads the target on its own, so Track mode leads every round.
function launchRound(r: Round) {
  r.launched = true;
  let canHit = tgtCanHit();
  // A bolt that would land after contact is too late.
  if (state.tgtKind === 'rock' && ast.s + (0.3 + r.T) / fallT() >= contactS()) canHit = false;
  // Earlier rounds may break the ship first.
  // Then this round flies on.
  if (r.kind === 'ship' && canHit && shipDoomed(r)) canHit = false;
  const target = tgtLead(r.T, new THREE.Vector3());
  // Laid by hand, the bolt hits only if the bore points within the target's disc.
  if (manual.on && canHit) {
    const D = target.distanceTo(MUZZLE), off = AX.angleTo(bq.copy(target).sub(MUZZLE));
    canHit = off < 1.2 * tgtR() / D + 0.004;
  }
  // With no rock in the sky the bolt flies where the barrel points.
  if (!canHit) target.copy(MUZZLE).addScaledVector(AX, Math.max(20000, target.distanceTo(MUZZLE)));
  r.target = target; r.muzzle = MUZZLE.clone(); r.canHit = canHit;
  // A free slot, else the oldest round's slot.
  const t = tracers.find(x => !x.round) || tracers.reduce((a, b) => (a.round!.s0 <= b.round!.s0 ? a : b));
  if (t.round) t.round.slot = null;
  t.round = r; r.slot = t;
  t.line.material.uniforms.uA.value.copy(MUZZLE); t.line.material.uniforms.uB.value.copy(target);
  t.bolt.material.uniforms.uCore.value = 3 * (0.6 + r.c);
  t.bolt.material.uniforms.uGain.value = 5 + 3 * r.c;
  if (!r.salvo) return;
  const ac = kit.live();
  if (!ac) return;
  roundSound(ac, r);
  // The round that will break the rock gets the impact prelude and the boom.
  const k = breakPower(r);
  if (k) hitSounds(ac, { canHit: true, hitT: 0.3 + r.T, c: k, target: r.target!, sfx: {}, tag: 'salvo', kind: r.kind }, () => rounds.includes(r));
}
// The tally this round would leave on landing, if it breaks the rock; else 0.
// A ship round never breaks the rock.
function breakPower(r: Round) {
  if (!r.canHit || r.kind === 'ship' || ast.tally.broken) return 0;
  const t = { ...ast.tally };
  for (const q of rounds) {
    if (!q.salvo || !q.launched || q.hit || !q.canHit) continue;
    const res = landRound(t, q.c);
    if (q === r) return res === 'break' ? t.dmg : 0;
  }
  return 0;
}
// A cycle's hit is decided: its light and its blast follow this round.
function decide(cy: Cycle, r: Round, power: number) {
  cy.decided = cy.hit = cy.canHit = true;
  cy.hitT = r.s0 - cy.t0 + 0.3 + r.T;
  cy.target.copy(r.target!);
  // The ship's hit takes no rock size.
  cy.bk = (0.75 + 0.5 * Math.min(power, 1.25)) * (r.kind === 'ship' ? 1 : SIZES[opts.size].rumble);
  state.lit = cy;
}
// A round lands.
// Rail: a round on target breaks the rock.
// Salvo: the tally says crater, break, hunt or miss.
// Ship: each round wounds or kills by its own charge, or misses.
function roundHits(r: Round) {
  const cy = r.cy;
  if (r.kind === 'ship') {
    const res = r.canHit && tgtCanHit() ? tgtHit(r.c, r) : null;
    r.res = res || 'miss';
    if (res) { decide(cy, r, r.c); cy.res = res; } else if (!cy.decided && r.j === r.n) cy.hit = true;
    return;
  }
  if (!r.salvo) {
    if (r.canHit && !ast.tally.broken && tgtCanHit()) { decide(cy, r, r.c); ast.tally.broken = true; tgtHit(r.c); huntAfter(); }
    else cy.hit = true;
    return;
  }
  r.res = r.canHit && (!ast.tally.broken || r.chunk >= 0) ? landRound(ast.tally, r.c) : 'miss';
  if (r.res === 'crater') addCrater(r);
  else if (r.res === 'break') { decide(cy, r, ast.tally.dmg); tgtHit(Math.min(1.25, ast.tally.dmg)); huntAfter(); }
  else if (r.res === 'hunt') burstChunk(r.chunk);
  // The last round lands with no break: the cycle's hit is a miss.
  if (!cy.decided && r.j === r.n) cy.hit = true;
}
// After a break, salvo rounds in flight lock onto the big chunks, the biggest first.
// Each slows in the thin air and lands HUNT_GAP s after the last.
// So each chunk bursts clear of the fireball.
const HUNT_GAP = 2.5;
function huntAfter() {
  let ci = 0, k = 0;
  for (const q of rounds) {
    if (!q.launched || q.hit || !q.canHit || !q.salvo || q.chunk >= 0) continue;
    while (ci < chunks.length && chunks[ci].i < 0) ci++;
    if (ci >= chunks.length) break;
    q.chunk = ci++;
    // The round runs from where it is now to where the chunk will be.
    const ch = chunks[q.chunk], t = state.simT - q.s0, land = state.simT + HUNT_GAP * ++k;
    const p0 = roundAt(q, t, new THREE.Vector3()), to = new THREE.Vector3();
    shardAt(ch.i, land - sSeed.array[ch.i * 4 + 2], to, bv);
    q.re = { t, p0, to, T: land - state.simT };
  }
}
// A crater: a hot pit on the face toward the gun, spall, a small flash, a shove.
const crDir = new THREE.Vector3(), crP = new THREE.Vector3(), crV = new THREE.Vector3();
function addCrater(r: Round) {
  const R = ast.R;
  crDir.copy(r.muzzle!).sub(ast.pos).normalize().add(crV.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.7)).normalize();
  crP.copy(ast.pos).addScaledVector(crDir, R);
  astMesh.updateMatrixWorld();
  crV.copy(crP); astMesh.worldToLocal(crV).normalize();
  const C = astMat.uniforms.uCrater.value, slot = C[0].w < 0 ? C[0] : C[1].w < 0 ? C[1] : (C[0].w <= C[1].w ? C[0] : C[1]);
  slot.set(crV.x, crV.y, crV.z, state.simT);
  craterSound(crP);
  // Reduced motion halves the flash.
  state.hitFlash = Math.max(state.hitFlash, reduced() ? 0.165 : 0.33);
  // uHit holds the sky direction to the rock, as the shatter sets it.
  U.uHit.value.set(U.uAst.value.x, U.uAst.value.y, U.uAst.value.z, state.hitFlash);
  ast.jolt.addScaledVector(crDir, -0.08 * R);
  if (reduced()) return;
  const sp = R / 600;
  for (let i = 0; i < 40; i++) {
    crV.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().addScaledVector(crDir, 1.2).normalize().multiplyScalar((150 + 450 * rnd()) * sp);
    writeStar(crP, state.simT + rnd() * 0.2, crV, 0.08 + 0.12 * rnd(), 2, 2 + rnd() * 6, 0.4 + 0.8 * rnd(), 0.9 + 0.7 * rnd(), 3, 0.3);
  }
}
// The rock's damage and craters clear for a new rock or a reset.
export function clearHits() {
  ast.tally = makeTally(chunks.length);
  for (const c of astMat.uniforms.uCrater.value) c.set(0, 0, 0, -1);
  ast.jolt.set(0, 0, 0);
}
// A hunted chunk bursts in the air: a flash, embers, and its trail stops.
function burstChunk(ci: number) {
  const ch = chunks[ci];
  if (!ch || ch.i < 0 || ch.burstAt) return;
  const age = state.simT - sSeed.array[ch.i * 4 + 2];
  ch.burstAt = state.simT; ch.burstAge = age; ch.r0 = sSeed.array[ch.i * 4 + 1];
  ch.burstP = new THREE.Vector3(); shardAt(ch.i, age, ch.burstP, bv);
  // The piece itself is gone.
  sSeed.array[ch.i * 4 + 1] = 0; sSeed.needsUpdate = true;
  huntSound(ch.burstP);
  if (reduced()) return;
  const sp = ast.R / 600;
  for (let n = 0; n < 70; n++) {
    crV.set(rnd() - 0.5, rnd() - 0.4, rnd() - 0.5).normalize().multiplyScalar((60 + 220 * rnd()) * sp);
    writeStar(ch.burstP, state.simT + 0.03 * rnd(), crV, 0.3 + 0.3 * rnd(), 1, 1.5 + 2 * rnd(), 0.4 + 0.4 * rnd(), 1.1 + 0.9 * rnd(), 2, 0.7, 2);
  }
}
// The gun-side power of a round: it rises round by round in a salvo.
const gunPow = (r: Round) => (r.salvo ? r.j / MAX_ROUNDS : r.c);
// The newest round out of the muzzle: its number, its clock and its power.
// Rail has one round: j 1, the clock from 0.3 s, the shot's power.
export function newest(sh: Cycle) {
  const age = state.simT - sh.t0, j = sh.salvo ? Math.max(1, Math.min(sh.n, Math.floor((age - LAUNCH) / GAP) + 1)) : 1;
  return { j, ra: age - launchAt(j), gp: sh.salvo ? j / MAX_ROUNDS : sh.c };
}
// Rounds launch, land, and leave once their contrail fades.
export function stepRounds() {
  for (const r of rounds) {
    const a = state.simT - r.s0;
    if (!r.launched && a >= 0) launchRound(r);
    if (r.launched && !r.hit && a >= landOf(r)) { r.hit = true; roundHits(r); }
  }
  // Each round's Mach ring runs out from the muzzle at 340 m/s and fades over 14 s.
  for (const s of U.uShocks.value) s.w = 0;
  for (const r of rounds) {
    if (!r.launched) continue;
    const sa = Math.max(0, state.simT - r.s0 - 0.3), k = gunPow(r);
    U.uShocks.value[r.j - 1].set(r.muzzle!.x, r.muzzle!.z, 340 * sa, sa > 14 ? 0 : k * (Math.max(0, 1 - sa / 14) + 1.5 * Math.exp(-sa / 1.5)));
  }
  for (let i = rounds.length - 1; i >= 0; i--) {
    const r = rounds[i];
    if (state.simT - r.s0 > landOf(r) + 11) { if (r.slot) r.slot.round = null; rounds.splice(i, 1); }
  }
}
state.fire = (c, n = 1, salvo = false) => {
  // A new cycle waits until the last cycle's rounds have all left.
  if (state.shot && state.simT < state.shot.t0 + launchAt(state.shot.n)) return;
  // A new cycle throws out a case the last one still holds.
  if (state.shot && !state.shot.ejected) ejectCase();
  // A weak shot takes 11.5 seconds to cross; a full one 8.5.
  const T = THREE.MathUtils.lerp(11.5, 8.5, c);
  // The barrel may still be back from the last cycle; slide0 eases it in.
  const slide0 = U.uRecoil.value;
  // kind marks a ship cycle and its rounds.
  state.shot = { slide0, t0: state.simT, c, n, salvo, T, target: new THREE.Vector3(), muzzle: MUZZLE.clone(), canHit: false, decided: false, hit: false, jolt: false, hitT: launchAt(n) + T, kind: state.tgtKind, res: null } as Cycle;
  for (let j = 1; j <= n; j++) rounds.push({ j, n, c, salvo, T, cy: state.shot, s0: state.simT + launchAt(j) - 0.3, launched: false, hit: false, res: null, chunk: -1, slot: null, kind: state.tgtKind });
  launchRound(rounds[rounds.length - n]);
  // Rail: the cycle knows its target at once.
  if (!salvo) { const r = rounds[rounds.length - 1]; state.shot.target.copy(r.target!); state.shot.canHit = r.canHit!; }
  // The Mach ring starts at the muzzle's foot.
  // It reaches the eye at the speed of sound.
  state.shot.arrive = 0.3 + Math.hypot(camera.position.x - MUZZLE.x, camera.position.z - MUZZLE.z) / 343;
  // The blast rings stand square to the barrel.
  state.shot.ax = AX.clone(); state.shot.bk = (0.75 + 0.5 * c) * (state.tgtKind === 'rock' ? SIZES[opts.size].rumble : 1); state.shot.up = AX_UP.clone(); state.shot.side = new THREE.Vector3().crossVectors(AX, AX_UP);
  shellMesh.material.uniforms.uSeed.value = rnd() * 60;
  U.uFire.value = 1;
  // The release only clunks; the big kick lands with the blast, as the slug leaves.
  cam.shake = 0.25 * c;
  // The kick lifts the ring of dust round the mount.
  state.cdust = Math.max(state.cdust, 0.9);
  // The muzzle shock throws the ring outward.
  state.blow = { t0: state.simT, k: Math.min(c, 1.25) };
  chargeDust.material.uniforms.uFw.value.set(AX.x, AX.z).normalize();
  // The shot loads the low air with dust; it settles over a minute.
  U.uDustLoad.value = Math.min(1, U.uDustLoad.value + 0.35 * Math.min(c, 1.25));
  // The blast and the Mach wall raise one dust volume.
  state.dustShot = { t0: state.simT, c, foot: new THREE.Vector3(MUZZLE.x, 0, MUZZLE.z) };
  shotDust.material.uniforms.uFwd.value.set(AX.x, AX.z).normalize();
  // Three devils wait on the plain ahead; each wakes as the front reaches it.
  { const fw = shotDust.material.uniforms.uFwd.value, base = Math.atan2(fw.y, fw.x);
    shotDust.material.uniforms.uDv.value.forEach((v: THREE.Vector4) => {
      const a = base + (rnd() - 0.5) * 2.0, d = 1800 + 1700 * rnd();
      v.set(MUZZLE.x + Math.cos(a) * d, MUZZLE.z + Math.sin(a) * d, d / 340 + 0.3, reduced() ? 0 : 0.6 + 0.3 * rnd());
    }); }
  // The kick shakes sand off the gun's ledges: thin streams that pour for a few seconds.
  if (!reduced()) for (let i = 0; i < 9; i++) sandStreams.push({ p: barrelPt(-200 + rnd() * 1050, (rnd() - 0.5) * 40, 30 + rnd() * 20, new THREE.Vector3()), t0: state.simT + rnd() * 0.4, dur: 3 + 2 * rnd(), acc: 0 });
  // The shot flings the field's motes out along the bore.
  flingMotes();
  // A salvo's hit sounds wait for the sound pass.
  // A salvo's rounds play their own reports as they launch.
  { const ac = kit.live(); if (ac && !salvo) { shotSound(ac, state.shot); hitSounds(ac, state.shot); } }
  wake();
};
function shatter(c: number) {
  endStrike();
  starMat.uniforms.uShedCut.value = state.simT + 0.3;
  ast.state = 'shatter';
  ast.hitAt = state.simT;
  // A random side for the blast's shove on the trail.
  { const a = rnd() * Math.PI * 2; PU.uSwipe.value.set(Math.cos(a), Math.sin(a), 0); }
  ast.next = rad((rnd() - 0.5) * 6);
  astMesh.visible = false;
  const N = Math.min(SHARD_MAX, Math.round(1.5 * SIZES[opts.size].shards)), R = ast.R, P = ast.pos;
  for (let i = 0; i < N; i++) {
    bp.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.2 * R);
    bv.copy(bp).addScaledVector(bq.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5), 0.4 * R).normalize();
    // Slow shards read as huge ones.
    // The blast casts each piece outward.
    // It keeps the rock's own motion.
    bv.multiplyScalar((70 + 160 * c) * (R / 600) * (0.8 + 0.4 * rnd()));
    bv.y += 0.25 * bv.length();
    bv.addScaledVector(ast.away, -FALL / fallT());
    bp.add(P);
    sPos.setXYZ(i, bp.x, bp.y, bp.z);
    sVel.setXYZW(i, bv.x, bv.y, bv.z, 0.2 + rnd() * 1.3);
    sSeed.setXYZW(i, rnd() * 100, R * (0.08 + 0.27 * Math.pow(rnd(), 2.2)), state.simT, 6 + rnd() * 4);
  }
  shardGeo.instanceCount = N;
  sPos.needsUpdate = sVel.needsUpdate = sSeed.needsUpdate = true;
  state.shardsEnd = state.simT + 60;
  // The four biggest shards drag smoke trails down with them.
  // Only they fly: small shards without a trail read as noise.
  const big = Array.from({ length: N }, (_, i) => i).sort((a, b) => sSeed.array[b * 4 + 1] - sSeed.array[a * 4 + 1]).slice(0, chunks.length);
  const keep = big.map(i => [[...sPos.array.slice(i * 3, i * 3 + 3)], [...sVel.array.slice(i * 4, i * 4 + 4)], [...sSeed.array.slice(i * 4, i * 4 + 4)]]);
  // The four fly wide apart, fast, and carry on along the rock's own arc.
  const fw = bq.copy(ast.away).negate(), sd = new THREE.Vector3().crossVectors(fw, yUp).normalize(), up = new THREE.Vector3().crossVectors(sd, fw).normalize();
  keep.forEach(([p, v, d], j) => {
    // The pieces carry on along the rock's own path, at nearly one speed.
    // The blast only fans them a little round that path and lifts them.
    // They fan out wide, each on its own lob and speed, so no two trails run parallel.
    // Uneven angles: no claw of even spokes.
    // A slower throw with more lift: each piece lobs up, slows and falls.
    const a = j * Math.PI * 2 / chunks.length + 0.4 + (rnd() - 0.5) * 1.4, sp = (150 + 220 * c) * (R / 600) * (0.6 + 0.8 * rnd());
    const go = (190 + 140 * c) * (R / 600) * (0.7 + 0.55 * rnd());
    bv.copy(sd).multiplyScalar(Math.cos(a) * sp * 0.9).addScaledVector(up, (0.45 * Math.sin(a) + 0.5 + 0.6 * rnd()) * sp).addScaledVector(fw, go);
    // Each is a small copy of the rock: a fifth to two fifths of its radius.
    sPos.setXYZ(j, ...p as [number, number, number]); sVel.setXYZW(j, bv.x, bv.y, bv.z, v[3]); sSeed.setXYZW(j, d[0], R * (0.2 + 0.2 * Math.pow(rnd(), 1.5)), d[2], d[3]);
  });
  // A crowd of big burning pieces lobs out round the trained ones.
  // They smoke through the stars, not trains, so they cost little.
  // Many small pieces and a few big ones: a hail, not a spray.
  const crowd = reduced() ? 0 : Math.min(SHARD_MAX - keep.length, 56);
  for (let j = keep.length; j < keep.length + crowd; j++) {
    const a = rnd() * Math.PI * 2, sp = (110 + 200 * c) * (R / 600) * (0.5 + 1.6 * rnd());
    bv.copy(sd).multiplyScalar(Math.cos(a) * sp * 1.6).addScaledVector(up, (0.6 * Math.sin(a) + 0.4 + 0.6 * rnd()) * sp).addScaledVector(fw, (150 + 120 * c) * (R / 600) * (0.5 + 0.8 * rnd()));
    bp.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.5 * R).add(P);
    sPos.setXYZ(j, bp.x, bp.y, bp.z); sVel.setXYZW(j, bv.x, bv.y, bv.z, 0.2 + rnd() * 1.3);
    sSeed.setXYZW(j, rnd() * 100, R * (0.07 + 0.33 * Math.pow(rnd(), 2.6)), state.simT, 14 + rnd() * 10);
  }
  shardGeo.instanceCount = keep.length + crowd;
  sPos.needsUpdate = sVel.needsUpdate = sSeed.needsUpdate = true;
  aimHail(keep.length + crowd);
  armHail(keep.length + crowd);
  chunks.forEach((ch, j) => { ch.i = j < keep.length ? j : -1; ch.landAt = 0; ch.landP = null; ch.burstAt = 0; ch.burstP = null; });
  // Embers: burning pieces fly out all round and arc down.
  const sp = R / 600;
  // The burning pieces keep part of the rock's motion along its path.
  const mo = new THREE.Vector3().copy(ast.away).negate();
  // Slow ejecta: many small burning flecks drift down from the cloud.
  // Each goes out at its own time, most long before the ground.
  if (!reduced()) for (let i = 0; i < 460; i++) {
    bv.set(rnd() - 0.5, rnd() - 0.2, rnd() - 0.5).normalize().multiplyScalar((60 + 300 * rnd()) * sp).addScaledVector(mo, (60 + 90 * rnd()) * sp);
    bq.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(4 * R);
    writeStar(bq.add(P), state.simT + rnd() * 3, bv, 0.5 + 0.6 * rnd(), rnd() < 0.5 ? 2 : 0, 4 + 22 * rnd(), 0.6 + 0.9 * rnd(), 0.9 + 1.1 * rnd(), 3, 0.18 + 0.22 * rnd());
  }
  for (let i = 0; i < N * 1.2; i++) {
    bv.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const f = rnd();
    bv.multiplyScalar((190 + 500 * f * f) * sp).addScaledVector(mo, (170 + 130 * c) * sp * (0.9 + 0.2 * rnd()));
    bq.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(R);
    // Fast pieces draw long trails.
    // Slow ones draw a short tail.
    // About a third burn out in mid-flight.
    writeStar(bq.add(P), state.simT + rnd() * 0.4, bv, 0.05 + 0.1 * rnd(), 2, rnd() < 0.35 ? 3 + 4 * rnd() : 8 + rnd() * 8, 0.4 + 1.2 * f * f + 0.3 * rnd(), 1.6 + 2 * rnd(), 3, 0.3 + 0.3 * rnd());
  }
  // Small burning pips fill the sprays; most fizzle out in mid-flight.
  for (let i = 0; i < N; i++) {
    bv.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const f = rnd();
    bv.multiplyScalar((150 + 600 * f * f) * sp).addScaledVector(mo, (170 + 130 * c) * sp * (0.85 + 0.3 * rnd()));
    bq.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(R);
    writeStar(bq.add(P), state.simT + rnd() * 0.5, bv, 0.08 + 0.12 * rnd(), 2, 2 + rnd() * 6, 0.4 + 0.8 * rnd(), 0.9 + 0.7 * rnd(), 3, 0.3);
  }
  // A fine, quick spray of sparks under them.
  for (let i = 0; i < N * 6; i++) {
    bv.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar((40 + rnd() * 160) * sp);
    writeStar(P, state.simT + rnd() * 0.05, bv, 0.25, rnd() < 0.5 ? 0 : 2, 3 + rnd() * 3, 0.5, 1.2 + rnd(), rnd() < 0.3 ? 2 : 0, 0.6);
  }
  // Two or three big pieces break late, inside the cloud.
  const bursts = Array.from({ length: rnd() < 0.6 ? 3 : 2 }, (_, i) => ({
    t: 1.3 + 1.5 * i + 1.2 * rnd(), k: 0.6 + 0.4 * rnd(), done: false,
    off: new THREE.Vector3(rnd() - 0.5, rnd() - 0.35, rnd() - 0.5).multiplyScalar(4.5 * R),
  }));
  state.blastFx = { t0: state.simT, P: P.clone(), R, k: Math.min(c, 1.25), seed: rnd() * 10, bursts };
  state.hitFlash = 1; cam.shake += 0.5 * c;
  armFrags();
  U.uHit.value.set(U.uAst.value.x, U.uAst.value.y, U.uAst.value.z, 1);
  U.uHitP.value.set(P.x, P.y, P.z, state.simT); U.uHitR.value = R;
  // The synth rumble stands in when the hit's sounds were not scheduled.
  if (!state.shot?.sfx?.boom) rumble(c);
}
