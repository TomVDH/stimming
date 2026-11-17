// @ts-nocheck
// Load order: ship/hit runs first.
import '../ship/hit.ts';
import { reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { clamp, ui } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { lerp, setSun, skyAt, skyH } from '../sky/sun.ts';
import { CLOUD_U } from '../clouds/clouds.ts';
import { caseMesh } from '../gun/case.ts';
import { ast, placeAst } from '../rock/asteroid.ts';
import { newShip, shipOff } from '../ship/battleship.ts';
import { PU } from '../rock/trail.ts';
import { prewarmEmbers } from '../rock/fragments.ts';
import { dustGeo } from '../fx/dust.ts';
import { starGeo, starMat } from '../fx/burst.ts';
import { grade } from '../post/chain.ts';
import { cancelHold } from './charge.ts';
import { rockGlobe } from '../fx/bowshock.ts';
import { bolt } from '../fx/bolt.ts';
import { tracers } from '../fx/ion.ts';
import { pulses } from '../gun/muzzle.ts';
import { shardGeo } from '../rock/shards.ts';
import { clearShip, stopRumbles } from '../ship/hulks.ts';
import { chunks } from '../fx/volumes.ts';
import { hails } from '../fx/hail.ts';
import { clearHits, rounds } from './shot.ts';
import { respawn, sandStreams, stepAim } from '../ship/hit.ts';
import { sPop, sPopGlow, sRound, sRoundGlint } from '../ship/shipshot.ts';
import { FILL_COOL, FILL_WARM, gameOverSound } from '../rock/strike.ts';
import { wake } from '../loop.ts';
import { filt, hiss, kit, pend, track } from '../sound/kit.ts';

/* ---------- reset: a short rewind into a white fill ---------- */
// The sky runs backward, half a day a second up to 1.5.
// A long shutter blends the days, so the light never strobes.
// The frame fills white; the toy cuts to its start under the white.
// The white then burns off fast, and the image springs back.
// The game over's rewind runs longer, so its white can clear slowly first.
const SPIN_T = 1.8, SPIN_GO = 3.4, DAYS_MAX = 1.5;
const spinT = () => (spin && spin.go ? SPIN_GO : SPIN_T);
// The game over's white clears slower: GO_OUT.
const FILL_IN = 0.3, FILL_HOLD = 0.1, FILL_OUT = 1.2, GO_OUT = 2.0;
export let spin = null, fill = null, cutFlash = 0;
export const fillEl = document.querySelector('.reset-fill');
// The sky values the shutter blends toward their mean over one day.
const SHUT_V = ['uSunC', 'uZenC', 'uHorC', 'uGlowC', 'uCloudSun', 'uCloudAmb', 'uGLift'], SHUT_S = ['uStars', 'uMoonK', 'uSunE'];
function dayMean(H) {
  const m = { exp: 0 }, N = 24;
  for (const k of SHUT_V) m[k] = U[k].value.clone().multiplyScalar(0);
  for (const k of SHUT_S) m[k] = 0;
  for (let i = 0; i < N; i++) {
    skyAt(H + i * Math.PI * 2 / N);
    for (const k of SHUT_V) m[k].addScaledVector(U[k].value, 1 / N);
    for (const k of SHUT_S) m[k] += U[k].value / N;
    m.exp += state.baseExp / N;
  }
  skyAt(H);
  return m;
}
// s: 0 sees one instant, 1 sees the whole day's mean.
function shutter(m, s) {
  for (const k of SHUT_V) U[k].value.lerp(m[k], s);
  for (const k of SHUT_S) U[k].value = lerp(U[k].value, m[k], s);
  state.baseExp = lerp(state.baseExp, m.exp, s);
}
// In: white eases up and the image punches in.
// Out: white falls fast, then slow; the frame settles from overexposure.
function stepFill(dt) {
  const g = grade.uniforms;
  if (!fill) return;
  fill.t += dt;
  const t = fill.t, calm = fill.calm ? 0 : 1;
  if (!fill.cut && t >= FILL_IN) { fill.cut = true; spin = null; landReset(); }
  let op, veil = 0, zoom = 1;
  if (t < FILL_IN) {
    const a = t / FILL_IN;
    op = a * a; zoom = 1 + 0.035 * a * a * calm;
  } else {
    const f = clamp((t - FILL_IN - FILL_HOLD) / (fill.out || FILL_OUT), 0, 1);
    op = Math.pow(1 - f, 2.4); veil = 0.6 * Math.pow(1 - f, 1.5); zoom = 1 + 0.06 * Math.pow(1 - f, 3) * calm;
    if (f >= 1) { fill = null; op = 0; veil = 0; zoom = 1; }
  }
  fillEl.style.opacity = op.toFixed(3);
  g.uVeil.value = veil; g.uZoom.value = zoom;
}
const wisp0 = U.uWisp.value.clone();
// force: the game over runs the same Reset after its white.
export function resetToy(force = false) {
  if (spin || (state.strike?.hit && !force)) return;
  // Only the game over's white is warm.
  fillEl.style.background = state.strike?.hit ? FILL_WARM : FILL_COOL;
  stopRumbles();
  cancelHold();
  wake();
  if (reduced()) { fill = { t: 0, calm: true }; return; }
  spin = { t: 0, H: skyH, m: dayMean(skyH), go: force };
  // The game over's chorus rings over its rewind, so it has no whoosh.
  if (!force) whoosh();
}
// The Reset chip: hidden while a rock lives, glowing after a kill.
const resetChip = [...document.querySelectorAll('.s2-chip')].find(b => b.querySelector('.s2-label')?.textContent === 'Reset');
export let resetOn = null;
export function resetReady(on) {
  if (on === resetOn || !resetChip) return;
  resetOn = on;
  resetChip.style.display = on ? '' : 'none';
  resetChip.toggleAttribute('data-glow', on);
}
resetReady(false);
// The sim runs up to thirty times faster as the days spin by.
export const spinSpeed = () => (spin ? 1 + 30 * Math.min(1, spin.t / 3) : 1);
export function stepSpin(dt) {
  cutFlash *= Math.exp(-dt / 0.5);
  stepFill(dt);
  if (!spin) return;
  spin.t += dt;
  // The rate grows e-fold every 0.8 s, then holds at DAYS_MAX.
  const w = Math.min(Math.PI * 2 * DAYS_MAX, Math.PI * Math.exp(spin.t / 0.8));
  spin.H -= w * dt;
  skyAt(spin.H);
  // The shutter opens with the speed; a faint day pulse stays.
  shutter(spin.m, 0.85 * clamp((w / (Math.PI * 2) - 0.35) / 0.9, 0, 1));
  // The clouds run back too.
  U.uWisp.value.x -= w * dt * 0.5;
  CLOUD_U.uCloudT.value -= w * dt * 0.05;
  // The white fill is full at the rewind's end.
  // The cut waits for it.
  if (spin.t >= spinT() - FILL_IN && !fill) fill = { t: 0, out: spin.go ? GO_OUT : FILL_OUT };
}
// Back to the start: the chosen time, still clouds, a fresh rock high up.
function landReset() {
  resetReady(false);
  U.uWisp.value.copy(wisp0);
  CLOUD_U.uCloudT.value = 0;
  setSun();
  state.shot = null; state.hitFlash = 0; state.flashNow = 0;
  // Boom puffs end with the shot.
  // A Reset without a shot keeps its dust.
  if (state.sshot) { dustGeo.instanceCount = 0; state.dustHead = 0; state.dustEnd = 0; }
  state.sshot = null; sRound.visible = sRoundGlint.visible = sPop.visible = sPopGlow.visible = false;
  // The old blast, its debris and the bolt's line are gone.
  state.blastFx = null; state.voidFx = null; state.muzzleFx = null; sandStreams.length = 0; U.uHeatT.value = 0; U.uBk.value = 0; U.uEat.value.w = 0; rounds.length = 0; state.lit = null; clearHits(); for (const t of tracers) { t.round = null; t.bolt.visible = false; } state.dustShot = null; state.blow = null; state.devil = 0; for (const q of pulses) q.k = 0; state.caseDust = null; state.spent = null; caseMesh.visible = false; state.shardsEnd = 0; shardGeo.instanceCount = 0; hails.length = 0; bolt.visible = false;
  for (const ch of chunks) ch.i = -1;
  // Salvo sounds still to come stop with the old rock.
  for (const h of pend) {
    if (h.tag !== 'salvo') continue;
    for (const n of h.nodes) { try { n.stop?.(); } catch { /* not started */ } try { n.disconnect(); } catch { /* gone */ } }
    pend.delete(h);
  }
  // Embers from the old rock go too.
  starGeo.instanceCount = 0; state.head = 0; state.lastDeath = 0; starMat.uniforms.uShedCut.value = 1e9;
  // The first rock's own track.
  ast.next = 0;
  // The domes and flashes go under the white.
  clearShip();
  state.tgtKind = ui.setting('target').value;
  if (state.strike) gameOverSound(kit.live(), null);
  state.strike = null;
  state.rockGlowK = 1; grade.uniforms.uGhost.value = 1; rockGlobe.visible = false;
  // The old hit's clock goes too, so the start is clean.
  U.uHitP.value.w = -1e6;
  respawn();
  ast.s = state.strikeTest ? 0.995 : 0.25;
  PU.uTrail.value = 1;
  placeAst();
  // A ship takes the rock's place in the sky.
  if (state.tgtKind === 'ship') newShip(); else shipOff();
  stepAim(0, true);
  if (state.tgtKind === 'rock') prewarmEmbers();
}
// A tape-rewind hiss falls under the spin, rushes up into the white,
// then breathes out as the white burns off.
// T: the rewind length; the button uses SPIN_T.
function whoosh(T = SPIN_T, OUT = FILL_OUT) {
  const ac = kit.live();
  if (!ac) return;
  const L = T + FILL_HOLD + OUT;
  const t = ac.currentTime, s = hiss(ac, t, L + 0.3), bp = filt(ac, 'bandpass', 2400, 0.9), g = ac.createGain();
  bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(700, t + T - FILL_IN);
  bp.frequency.exponentialRampToValueAtTime(3200, t + T); bp.frequency.exponentialRampToValueAtTime(400, t + L);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.4);
  g.gain.setValueAtTime(0.08, t + T - FILL_IN); g.gain.exponentialRampToValueAtTime(0.18, t + T);
  g.gain.exponentialRampToValueAtTime(0.0001, t + L);
  s.connect(bp).connect(g).connect(kit.out);
  track(t + L + 0.4, s);
}
