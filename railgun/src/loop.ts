// Load order: rock/strike runs first.
import './rock/strike.ts';
import type * as THREE from 'three';
import { reduced, whenVisible, sound, onQuality, onReducedChange } from '../../shared/stim.js';
import { state } from './state.ts';
import { FRAME, stage } from './setup.ts';
import { U } from './world/uniforms.ts';
import { skyTrail } from './sky/sun.ts';
import { caseMat, stepCase } from './gun/case.ts';
import { astMat } from './rock/asteroid.ts';
import { ship } from './ship/battleship.ts';
import { starMat } from './fx/burst.ts';
import { arcsAlive } from './gun/arcs.ts';
import { cam, easeLook, frame, look, lookTo, lookV, sight } from './view/camera.ts';
import { draw, resize } from './view/render.ts';
import { amb } from './play/ambient.ts';
import { stepAst } from './play/approach.ts';
import { cancelHold, charge, ranging, stepCharge, ventT } from './play/charge.ts';
import { moteEnd } from './gun/motes.ts';
import { shardMat } from './rock/shards.ts';
import { domeAlive, shipDomes } from './ship/hulks.ts';
import { rounds, tgtCanHit } from './play/shot.ts';
import { aimNow, shipBusy, shipLaid, stepAim, stepShot, sway, tkeys } from './ship/hit.ts';
import { cutFlash, fill, spin, spinSpeed, stepSpin } from './play/reset.ts';
import { stepShipShot } from './ship/shipshot.ts';
import { stepStrike } from './rock/strike.ts';
import { kit, pending, stopAll } from './sound/kit.ts';
import { bed, soundBed } from './sound/wind.ts';
import { humStop } from './sound/hum.ts';
import { surgeOverStop } from './sound/gameover.ts';
import { hushRoars } from './sound/ship.ts';
import { motorStop, motorUpdate } from './sound/motor.ts';

/* Frame loop: 30 fps, idle or not; it sleeps 60 s after the last input. */
// A missing key gives null; + turns it to 0, so the default holds.
const SLEEP = +new URLSearchParams(location.search).get('sleep')! || 60000;
export let nap = 0, raf = 0, lastT = 0, lastDraw = 0, lastInput = performance.now();
state.qaFreeze = false;
// A live landing dome and a view's move keep the loop awake.
export const busy = () => !!state.sshot || shipBusy() || shipDomes.some(domeAlive) || !!ranging || (state.tgtKind === 'ship' && ship.state === 'arrive') || cam.swayE > 0.001 || tkeys.size > 0 || state.simT < moteEnd || (state.spent && state.spent.bounce < 2) || (state.caseDust && state.simT - state.caseDust.t0 < 12) || caseMat.uniforms.uCaseHeat.value > 0.02 || state.cdust > 0.02 || (state.dustShot && state.simT - state.dustShot.t0 < 16.5) || sight || !!spin || !!fill || !!state.strike || cutFlash > 0.01 || !!state.press || !!charge || !!state.shot || rounds.length > 0 || astMat.uniforms.uCrater.value.some((c: THREE.Vector4) => c.w >= 0 && state.simT - c.w < 20) || !!state.blastFx || state.simT - U.uHitP.value.w < 95 || U.uHeat.value > 0 || state.simT - ventT < 14 || U.uCharge.value > 0 || arcsAlive() || state.simT < state.dustEnd || state.simT < state.lastDeath || state.simT < state.shardsEnd || state.hitFlash > 0.01 || aimNow.err > 0.004 || Math.abs(sway.p) + Math.abs(sway.y) > 1e-5 || Math.abs(aimNow.vy) + Math.abs(aimNow.ve) > (shipLaid() ? 1e-3 : 1e-4) || Math.abs(lookTo.yaw - look.yaw) + Math.abs(lookTo.pitch - look.pitch) + Math.abs(lookV.yaw) + Math.abs(lookV.pitch) + cam.push > 1e-4 || skyTrail.span !== 0;
function tick(now: number) {
  raf = 0;
  if (!state.visible || document.hidden) { lastT = 0; return; }
  // A QA freeze holds the clock; stills land on exact times.
  const dt = lastT && !state.qaFreeze ? Math.min(0.1, (now - lastT) / 1000) : 0;
  lastT = now;
  // A falling rock or a live event keeps the scene running for a watcher.
  const awake = !reduced() && (now - lastInput < SLEEP || tgtCanHit() || amb.live.length > 0);
  state.pace = awake ? Math.min(1, state.pace + dt / 2) : Math.max(0, state.pace - dt / 2);
  const lively = busy();
  try {
    // The timelapse runs the sim faster than the clock.
    stepSpin(dt);
    const sdt = dt * spinSpeed();
    state.simT += sdt;
    U.uTime.value = state.simT;
    stepAst(sdt);
    stepAim(sdt);
    // motorUpdate takes no time step; the extra argument does nothing.
    (motorUpdate as (dt: number) => void)(dt);
    stepCharge(sdt);
    stepShot(sdt);
    stepShipShot(sdt);
    stepStrike(sdt);
    stepCase(sdt);
    easeLook(dt);
    if (now - lastDraw >= FRAME - 2) {
      frame();
      draw();
      watch(now, lively);
      lastDraw = now - lastDraw > FRAME * 3 ? now : lastDraw + FRAME;
    }
  } finally {
    soundBed();
    if (state.visible && lively) raf = requestAnimationFrame(tick);
    else if (state.visible && state.pace > 0) { raf = -1; nap = setTimeout(() => { nap = 0; raf = requestAnimationFrame(tick); }, Math.max(0, lastDraw + FRAME - 18 - performance.now())); }
    else { lastT = 0; draw(); restSoon(); }
  }
}
// The kit asks once.
// A pending rumble needs a second ask after it lands.
let restT = 0; state.meter = null;
function restSoon() {
  kit.rest(() => !busy() && !pending());
  clearTimeout(restT);
  if (pending()) restT = setTimeout(() => { if (!raf && !nap) kit.rest(() => !busy() && !pending()); }, 22000);
}
export function wake() {
  lastInput = performance.now();
  if (nap) { clearTimeout(nap); nap = 0; raf = 0; }
  if (!raf && state.visible && !document.hidden) raf = requestAnimationFrame(tick);
}
/* Performance ladder: slow frames step quality down a rung, never back up. */
let watchFrom = 0, watchN = 0, watchSum = 0, prevDraw = 0;
function watch(now: number, lively: boolean) {
  const gap = now - prevDraw;
  prevDraw = now;
  if (gap > 200) { watchFrom = now; watchN = watchSum = 0; return; }
  if (!watchFrom) watchFrom = now;
  if (now - watchFrom < 4000) return;
  watchN++; watchSum += gap;
  if (watchN < 2 || now - watchFrom < 6000) return;
  // Frames come every 33 ms by design; past 48 is slow.
  if (watchSum / watchN > (lively ? 48 : 70) && state.rung < 3 && !state.rungPin) { state.rung++; resize(); }
  watchFrom = now - 4000; watchN = watchSum = 0;
}
whenVisible(stage, (vis: boolean) => {
  state.visible = vis;
  if (!vis) {
    cancelAnimationFrame(raf); clearTimeout(nap); raf = 0; nap = 0; lastT = 0;
    // A hidden tab drops the hold.
    // No finger is on it when it returns.
    cancelHold();
    stopAll(); humStop(kit.ac, true); motorStop(true); surgeOverStop(true); hushRoars();
    if (bed) { bed.g.gain.value = 0; bed.g2.gain.value = 0; }
    kit.ac?.suspend()?.catch(() => {});
    return;
  }
  // The page had its gesture before; the context may resume on return.
  if (sound.on) kit.ac?.resume()?.catch(() => {});
  draw();
  wake();
});
new ResizeObserver(() => resize()).observe(stage);
onQuality(() => resize());
onReducedChange((on: boolean) => { starMat.uniforms.uSteady.value = on ? 1 : 0; shardMat.uniforms.uSpin.value = on ? 0 : 1; wake(); });
