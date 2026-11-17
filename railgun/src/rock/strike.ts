// @ts-nocheck
// Load order: ship/shipshot runs first.
import '../ship/shipshot.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { SIZES, camera, clamp, goMix, opts, rnd } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { lerp } from '../sky/sun.ts';
import { ast, astAt, astMat, astMesh, astSize, placeAst } from './asteroid.ts';
import { grade } from '../post/chain.ts';
import { cam, sight } from '../view/camera.ts';
import { fallT } from '../play/approach.ts';
import { cancelHold, charge, ranging } from '../play/charge.ts';
import { flare, hitFlare, hitGlow, rockGlobe } from '../fx/bowshock.ts';
import { bq } from '../play/shot.ts';
import { fill, fillEl, resetReady, resetToy, spin } from '../play/reset.ts';
import { wake } from '../loop.ts';
import { kit } from '../sound/kit.ts';
import { humStart, humStop, humUpdate } from '../sound/hum.ts';
import { surgeOver, surgeOverStop } from '../sound/gameover.ts';

/* ---------- the strike: an unshot rock hits the planet ---------- */
// The rock never holds: past the horizon line it falls on, at one speed.
// Its strike runs from the horizon line, s = 1, to the ground, s = s1.
// The glow, the rays, the flare, the bow and the surge grow with u.
// The surge is the strike's only sound; it peaks at contact.
// u is the share of that last stretch the rock has covered.
// A bolt can still save the planet until contact.
// At contact the blast goes off there and the frame burns to white.
// Under the white the toy cuts to a fresh start, as Reset does.
// The burn to white and the held white, in seconds.
// The chord resolves at contact and holds CLIMAX_T seconds.
// Then the orchestra stops; only the hall tail rings on.
// The orchestra then stops dead; only its echo rings.
// The white holds WHITE_T seconds under the echo; then the rewind starts.
const BURN_T = 4, CLIMAX_T = 7.5, WHITE_T = 2.5;
// The game over's white is warm: a white-yellow glow.
export const FILL_WARM = '#fff1cf', FILL_COOL = '#fffaf3';
// The strike's light climbs over the last seconds before contact.
const NEAR_T = 5;
// The blink after the contact flash, in seconds.
const BLINK_T = 0.5;
// The chorus is complete this many seconds before contact.
const GO_FULL = 4;
// The ground point the rock strikes.
export const strikeP = new THREE.Vector3(), strikeF = new THREE.Vector3();
// The horizon's drop at ground distance d, as hzFade draws it.
const dropAt = d => d * d / 3.2e6;
// The fall fraction at contact: the centre half a radius over the curved ground.
// It caches per size and path, and leaves the ground point in strikeP.
let contactKey = '', contactS1 = 1;
export function contactS() {
  const key = opts.size + ':' + ast.turn, R = SIZES[opts.size].R;
  if (key === contactKey) return contactS1;
  let s = 1;
  for (; s < 2; s += 0.002) { astAt(s, strikeP); if (strikeP.y - dropAt(Math.hypot(strikeP.x, strikeP.z)) <= 0.5 * R) break; }
  strikeP.y -= 0.5 * R;
  contactKey = key; contactS1 = s;
  return s;
}
export function startStrike() {
  state.strike = { s1: contactS(), hit: false, out: false, tb: 0 };
  ast.state = 'strike';
  resetReady(false);
  wake();
}
// A bolt saves the planet: the strike and its surge stop.
export function endStrike() {
  if (!state.strike) return;
  state.strike = null;
  state.rockGlowK = 1; grade.uniforms.uGhost.value = 1; rockGlobe.visible = false;
  gameOverSound(kit.live(), null);
}
// The game-over sound: one seam, so another charge mix can take it over.
// d.u: nearness to the ground, 0 to 1; it holds at 1 after contact.
// d.vol: fades in over the first tenth; it cuts as the white comes.
// d.over: the strain, up to 1 in the burn. Null stops the sound.
// d.choir: the choir's layers, 0 to 1, full at 60 percent of the fall.
// d.lock: the chord resolves at contact; it holds through the burn.
// Today it drives the charge hum; a live charge owns the hum.
// hold: with null, the sound holds this many seconds, then cuts.
export function gameOverSound(ac, d, hold = 0) {
  // A surge mix takes the seam; Hum falls through to the charge hum.
  if (goMix !== 'hum' && typeof surgeOver === 'function') { surgeOver(ac, d, hold); return; }
  if (!d) { humStop(ac); return; }
  if (!ac || charge) return;
  humStart(ac);
  const ch = Math.pow(d.u, 0.8);
  humUpdate(ac, { c: 0.12 + 0.88 * Math.pow(d.u, 1.4), chaos: ch, rage: THREE.MathUtils.smoothstep(ch, 0.55, 0.85), over: d.over, vol: d.vol });
}
// The climax's end: the dry take stops dead; its echo rings on.
function gameOverCut(ac) {
  if (goMix === 'hum' || typeof surgeOverStop !== 'function') { gameOverSound(ac, null); return; }
  surgeOverStop(false, 0, true);
}
// Strike test: the rock jumps to the horizon line.
export function strikeSoon() {
  if (state.tgtKind !== 'rock' || ast.state !== 'approach') return;
  ast.s = Math.max(ast.s, 0.995);
  placeAst(); astSize(); wake();
}
export const strikeU = () => clamp((ast.s - 1) / Math.max(state.strike.s1 - 1, 1e-3), 0, 1);
const burnT = () => (reduced() ? 1.6 : 1) * BURN_T;
// The burn, 0 to 1: it starts after the blink and ends at burnT.
const burnOf = tb => clamp((tb - BLINK_T) / (burnT() - BLINK_T), 0, 1);
// The blink, 0 to 1: the dark beat after the contact flash.
const blinkOf = tb => THREE.MathUtils.smoothstep(tb, 0.05, 0.18) * (1 - THREE.MathUtils.smoothstep(tb, 0.3, BLINK_T + 0.4));
export function stepStrike(dt) {
  if (!state.strike) return;
  // During the Reset's rewind the blast light dies away.
  if (spin) { state.hitFlash *= Math.exp(-dt / 0.3); U.uHit.value.w = state.hitFlash; if (state.blastFx) U.uBlast.value.w = state.hitFlash; return; }
  const ac = kit.live();
  if (!state.strike.hit) {
    const u = strikeU();
    const T0 = (state.strike.s1 - 1) * fallT(), el = u * T0, full = Math.min(GO_FULL, 0.3 * T0);
    // L: the strike's light, 0 to 1; most of it comes in the last seconds.
    const L = state.strike.L = 0.25 * Math.pow(u, 4) + 0.75 * Math.exp(-(T0 - el) / NEAR_T);
    // The face burns white as the air thickens.
    astMat.uniforms.uBurn.value = 1 + 2.5 * u * u * u;
    // The ground shakes under the lens as the rock comes down.
    if (!reduced()) cam.shake = Math.max(cam.shake, 0.8 * L * L);
    // The ground glow lights the world before contact.
    state.hitFlash = 0.8 * L;
    // The rock lights the heaps and the tower harder as it comes down.
    state.rockGlowK = 1 + 5 * L;
    // The orchestra builds as the rock nears; layers enter low to high.
    // The chorus is complete GO_FULL seconds before contact.
    const choir = clamp(el / Math.max(T0 - full, 0.1), 0, 1);
    // The phrases breathe in slow swells; the swells settle near contact.
    const br = 1 + 0.3 * Math.sin(2 * Math.PI * el / 7) * (1 - choir);
    gameOverSound(ac, { u: Math.pow(u, 1.6), vol: br * THREE.MathUtils.smoothstep(u, 0, 0.1), over: 0, crush: 0, choir, lock: false });
    if (ast.s >= state.strike.s1) strikeHit();
  } else {
    state.strike.tb += dt;
    const tb = state.strike.tb, b = burnOf(tb);
    // The blast light: a short flash, then it climbs with the burn.
    // The blink thins the haze, so the fireball and the skirt show.
    state.hitFlash = (1.2 * Math.exp(-tb / 0.25) + 0.3 + 1.2 * b * b) * (1 - 0.6 * blinkOf(tb));
    // The chord resolves at contact and holds as the climax.
    // It swells through the burn, as before; at CLIMAX_T it stops.
    if (!state.strike.cut) gameOverSound(ac, { u: 1, vol: 1 + 0.15 * b, over: 0, crush: 0, choir: 1, lock: true });
    if (!state.strike.cut && tb >= CLIMAX_T) { state.strike.cut = true; gameOverCut(ac); }
    // The silent white holds, then the button's Reset rewinds to the start.
    if (!state.strike.out && tb >= Math.max(burnT(), CLIMAX_T) + WHITE_T) { state.strike.out = true; gameOverSound(ac, null); resetToy(true); }
  }
  U.uHit.value.w = state.hitFlash;
  if (state.blastFx) U.uBlast.value.w = state.hitFlash;
}
function strikeHit() {
  state.strike.hit = true;
  ast.state = 'struck';
  astMesh.visible = false;
  // A live charge or ranging ends with the planet.
  if (charge || ranging) cancelHold();
  const R = ast.R, P = strikeP.clone().setY(strikeP.y + 0.3 * R);
  // Three late bursts break inside the fire.
  const bursts = [0, 1, 2].map(i => ({ t: 0.4 + 0.6 * i + 0.3 * rnd(), k: 0.7 + 0.3 * rnd(), done: false, off: new THREE.Vector3(rnd() - 0.5, 0.4 * rnd(), rnd() - 0.5).multiplyScalar(3 * R) }));
  fillEl.style.background = FILL_WARM;
  state.blastFx = { t0: state.simT, P, R, k: 1, seed: rnd() * 10, bursts };
  U.uHit.value.set(U.uAst.value.x, U.uAst.value.y, U.uAst.value.z, 1);
  U.uHitP.value.set(P.x, P.y, P.z, state.simT); U.uHitR.value = R;
  if (!reduced()) cam.shake += 2.4;
}
// The strike's light, each drawn frame, after the bolt and the blast.
export function updateStrike() {
  if (!state.strike) return;
  // After the white, the Reset's rewind shows through as the white clears.
  // The strike's flares and rays go with the white.
  if (state.strike.out) {
    const k = spin ? 1 - THREE.MathUtils.smoothstep(spin.t, 0, 1.6) : 0;
    if (spin && !fill) fillEl.style.opacity = k.toFixed(3);
    for (const v of [grade.uniforms.uLF2.value, grade.uniforms.uLF.value]) v.z *= k;
    grade.uniforms.uGod.value.z *= k; grade.uniforms.uGod.value.w *= k;
    hitGlow.visible = hitFlare.visible = rockGlobe.visible = false;
    return;
  }
  // The glow stops growing past the Moon: Aerosmith would white the frame early.
  const u = strikeU(), L = state.strike.L ?? 0, tb = state.strike.tb, R = ast.R, Rg = Math.min(R, SIZES.moon.R), hit = state.strike.hit;
  const e = x => 1 - Math.exp(-Math.max(x, 0));
  // A bright globe of glow wraps the rock as it nears the ground.
  if (!hit) flare(rockGlobe, ast.pos, Rg * (3 + 5 * u), 0.15 * L + 1.6 * Math.pow(L, 3)); else rockGlobe.visible = false;
  // The ground glows under the rock and swells after contact.
  flare(hitGlow, strikeP, Rg * (hit ? 24 + 30 * e(tb / 0.8) : 8 + 16 * u), hit ? (0.7 + 0.8 * e(tb / 0.3)) * (1 - 0.6 * blinkOf(tb)) : 0.6 * L * L * L);
  // A white core grows in the last seconds; contact blows it up.
  flare(hitFlare, strikeP, Rg * (hit ? 4 + 6 * e(tb / 0.4) : 1.5 + 2 * u), hit ? 14 * Math.exp(-tb / 0.3) + 4 : 6 * Math.pow(L, 6));
  // The anamorphic flare rides the rock's leading face down to the ground.
  // It starts at about a third of the way down and grows until contact.
  if (hit) strikeF.copy(strikeP); else strikeF.copy(ast.pos).setY(ast.pos.y - 0.5 * R);
  strikeF.project(camera);
  const rm = reduced() ? 0.5 : 1, onF = strikeF.z < 1 && Math.abs(strikeF.x) < 1.4 && Math.abs(strikeF.y) < 1.4 && !sight;
  const lf = hit ? 2.4 * Math.exp(-tb / 0.6) + 0.8 : 2.4 * Math.pow(L, 2.2);
  // No ghosts in the game over: the flare stays one level streak.
  grade.uniforms.uGhost.value = 0;
  // The level streak carries the flare; the warm veil sits under it.
  // The streak burns the rock's colour, hotter toward contact.
  grade.uniforms.uLF2C.value.set(1.0, lerp(0.5, 0.68, u), lerp(0.18, 0.36, u));
  // The impact flare's veil is wide; a low gain keeps the gun's silhouette.
  grade.uniforms.uLF2.value.set(strikeF.x * 0.5 + 0.5, strikeF.y * 0.5 + 0.5, onF ? rm * 1.0 * lf : 0);
  grade.uniforms.uLF.value.set(strikeF.x * 0.5 + 0.5, strikeF.y * 0.5 + 0.5, onF ? rm * 0.15 * lf : 0);
  bq.copy(strikeP).project(camera);
  const on = bq.z < 1 && Math.abs(bq.x) < 1.4 && Math.abs(bq.y) < 1.4 && !sight;
  // God rays rise from the glow and fill the sky at contact.
  const gk = on ? (reduced() ? 0.4 : 1) * (hit ? 1 : L * L * L) : 0;
  grade.uniforms.uGod.value.set(bq.x * 0.5 + 0.5, bq.y * 0.5 + 0.5, gk, gk);
  if (!hit) return;
  // Contact: a white flash, then a blink of dark, then the burn.
  // The blink shows the fireball and the ground before the white takes them.
  const b = burnOf(tb), rk = reduced() ? 0.3 : 1;
  state.flashNow += 10 * b * b * b + rk * 2.4 * Math.exp(-tb / 0.07) - 0.45 * blinkOf(tb);
  if (!fill) fillEl.style.opacity = THREE.MathUtils.smoothstep(b, 0.35, 1).toFixed(3);
}
