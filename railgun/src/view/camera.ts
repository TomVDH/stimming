// Load order: view/sight runs first.
import './sight.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { camera, clamp, rad } from '../setup.ts';
import { FALL, axisAt, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { SKY, TRAIL_MAX, skyH, skyRot0, skyTrail, sstep } from '../sky/sun.ts';
import { ground, groundGeo } from '../world/ground.ts';
import { VF } from '../gun/gun.ts';
import { ast, astMat, astMesh } from '../rock/asteroid.ts';
import { SHIP_AIM_R, shipP } from '../ship/battleship.ts';
import { PU } from '../rock/trail.ts';
import { fillPopT } from '../rock/fragments.ts';
import { grade } from '../post/chain.ts';
import { sightPass, sightSetup } from './sight.ts';
import { chaos, charge, over, rage } from '../play/charge.ts';
import { tgtCanHit, tgtLive, tgtPos } from '../play/shot.ts';
import { lastInput, wake } from '../loop.ts';

/* ---------- camera: a low eye far out on the plain ---------- */
// The gun stands left of centre; its barrel climbs to the right.
// The rock hangs past the muzzle, low over the horizon.
export const look = { yaw: 0, pitch: 0 }, lookTo = { yaw: 0, pitch: 0 };
// push: 0 wide, 1 fully pushed in on the gun and the rock.
// loom: 0 to 1, a long watch drawing the lens in.
export const cam = { zoom: 1, shake: 0, kickP: 0, kickY: 0, push: 0, swayE: 0, loom: 0 };
const pushG = new THREE.Vector3(), pushR = new THREE.Vector3();
let baseUp = 0; state.pace = reduced() ? 0 : 1; state.simT = 0;
export function frame() {
  const portrait = state.size.w < state.size.h;
  if (portrait !== state.groundTall) {
    state.groundTall = portrait;
    ground.geometry.dispose();
    ground.geometry = portrait ? groundGeo(800, 3000) : groundGeo(1670, 1990);
  }
  camera.aspect = state.size.w / state.size.h;
  // The charge pushes the lens in a little.
  // A hold pushes the lens in, slow and heavy.
  const pk = reduced() ? 0 : cam.push * cam.push * (3 - 2 * cam.push);
  const zk = cam.zoom * (1 - 0.18 * pk) * (1 - 0.07 * cam.loom);
  // The wide eye: a locked-off lens, a man's height over the dust.
  // The horizon sits low: the gun and the sky own the frame.
  const fov0 = portrait ? 74 : 55;
  camera.fov = fov0 * zk;
  baseUp = Math.atan((2 * (portrait ? 0.80 : 0.84) - 1) * Math.tan(rad(fov0 * zk / 2)));
  if (portrait) camera.position.set(800, 22, 3000); else camera.position.set(1670, 30, 1990);
  const yaw0 = portrait ? rad(8.5) : rad(24.5);
  // A locked-off camera.
  // Only the hold and the recoil move it.
  const wk = reduced() ? 0 : 1.2 * chaos * chaos + 2.2 * cam.shake + 2.6 * rage * rage + 4 * over * over, t = state.simT;
  const jit = () => (Math.random() - 0.5) * 0.0005 * (1 + 5 * rage + 8 * over);
  const wy = wk * (0.0026 * Math.sin(t * 0.61) + 0.0012 * Math.sin(t * 1.73 + 1.3) + 0.0005 * Math.sin(t * 4.9 + 0.3) + jit());
  const wp = wk * (0.002 * Math.sin(t * 0.83 + 0.4) + 0.001 * Math.sin(t * 2.11) + 0.0005 * Math.sin(t * 6.3 + 2.1) + jit());
  const wr = wk * (0.0014 * Math.sin(t * 0.47 + 2.0) + 0.0004 * Math.sin(t * 3.7));
  // The push swings toward the midpoint of the gun and the rock.
  let py = 0, pp = 0;
  if (pk > 0.001) {
    pushG.copy(axisAt(0.3, pushG)).sub(camera.position).normalize();
    // A broken ship leaves no target, so the push follows the bore.
    (tgtLive() ? tgtPos(pushR) : barrelPt(60000, 0, 0, pushR)).sub(camera.position).normalize();
    pushG.add(pushR).normalize();
    py = (Math.atan2(-pushG.x, -pushG.z) - yaw0) * 0.8 * pk;
    pp = (Math.asin(pushG.y) - baseUp) * 0.8 * pk;
  }
  // The sway leans into the cursor's motion; the bob is a slow breath.
  const sb = cam.swayE, ts = state.simT;
  camera.position.y += sb * 1.4 * Math.sin(ts * 2.1 + 0.5);
  camera.rotation.set(baseUp + pp + look.pitch + cam.kickP + wp + sb * 0.0012 * Math.sin(ts * 2.1), yaw0 + py + look.yaw + cam.kickY + wy, wr + sb * (0.003 * Math.sin(ts * 1.3) - 0.35 * lookV.yaw));
  // The sight is the gun's rangefinder: a fixed lens that looks down the bore.
  // It turns and climbs with the gun; it never follows the bolt.
  if (sight) {
    camera.fov = SIGHT_FOV * (portrait ? 1.6 : 1);
    sightEye(camera.position);
    barrelPt(1, 0, 0, sightDir).sub(barrelPt(0, 0, 0, sightTo)).normalize();
    camera.rotation.set(Math.asin(clamp(sightDir.y, -1, 1)) + wp * 0.3, Math.atan2(-sightDir.x, -sightDir.z) + wy * 0.3, 0);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
// The sight: the rangefinder's lens, 22 degrees down the bore.
const SIGHT_FOV = 22;
export let sight = false;
const sightDir = new THREE.Vector3(0, 0, -1), sightTo = new THREE.Vector3();
export function toggleSight() {
  sight = !sight;
  sightPass.enabled = sight;
  if (sight) sightSetup();
  frame();
  wake();
}
// The eye: the rangefinder's right lens; it recoils with the housing.
export const eyeP = new THREE.Vector3(), tgtP = new THREE.Vector3();
function sightEye(out: THREE.Vector3) {
  return barrelPt(VF.a + 30, VF.x, VF.u, out);
}
// A critically damped spring: the lens moves heavy and smooth.
export const lookV = { yaw: 0, pitch: 0 };
export function easeLook(dt: number) {
  // The push builds over about twelve seconds of hold and eases out slower.
  const pt = charge ? clamp((state.simT - charge.t0) / 12, 0, 1) : 0;
  cam.push += (pt - cam.push) * (1 - Math.exp(-dt / (pt > cam.push ? 1.2 : 2.5)));
  // A long watch draws the lens in slowly as the rock nears.
  // Any input lets it ease back.
  const lt = !reduced() && performance.now() - lastInput > 20000 && state.tgtKind === 'rock' && tgtCanHit() ? clamp(ast.s, 0, 1) : 0;
  cam.loom += (lt - cam.loom) * (1 - Math.exp(-dt / (lt > cam.loom ? 25 : 2.5)));
  // The star arcs fade fast once the drag stops.
  skyTrail.span *= Math.exp(-dt / 0.3);
  if (Math.abs(skyTrail.span) < 1e-4) skyTrail.span = 0;
  U.uTrailK.value = Math.abs(skyTrail.span) / TRAIL_MAX;
  U.uSkyRot0.value.setFromMatrix4(skyRot0.makeRotationAxis(SKY.P, -(skyH - skyTrail.span)));
  const W = 1.6;
  for (const k of ['yaw', 'pitch'] as const) {
    lookV[k] += (W * W * (lookTo[k] - look[k]) - 2 * W * lookV[k]) * dt;
    look[k] += lookV[k] * dt;
  }
  // Moving the cursor wakes a gentle sway and bob; it settles in a couple of seconds.
  const sw = reduced() ? 0 : clamp((Math.abs(lookV.yaw) + Math.abs(lookV.pitch)) * 60, 0, 1);
  cam.swayE += (sw - cam.swayE) * (1 - Math.exp(-dt / (sw > cam.swayE ? 0.25 : 1.8)));
  if (cam.swayE < 0.001) cam.swayE = 0;
}
// The rock's direction and light, as the shaders see them.
const tmpA = new THREE.Vector3();
// rockGlowK scales the rock's light on the clouds.
// The game-over event raises it as the rock comes down.
state.rockGlowK = 1;
export function aimAst() {
  tmpA.subVectors(ast.pos, camera.position);
  const dist = tmpA.length();
  tmpA.divideScalar(dist);
  const near = 0.35 + 0.65 * ast.s;
  ast.th = 2 * Math.atan(ast.R / dist);
  // At night the hit's flash lights the sky, not the near world: the gun stays a silhouette.
  const nk = U.uStars.value;
  U.uAst.value.set(tmpA.x, tmpA.y, tmpA.z, (0.5 + 2.5 * near * near) * astMat.uniforms.uBurn.value + 9 * state.hitFlash * (1 - 0.85 * nk) / (1 + 5 * nk));
  // In ship mode the hit's light comes from the ship.
  if (state.tgtKind === 'ship') { tmpA.subVectors(shipP, camera.position).normalize(); U.uAst.value.set(tmpA.x, tmpA.y, tmpA.z, U.uAst.value.w); }
  // The ship's halo takes the ship's aim radius, not the parked rock's.
  U.uAstR.value = state.tgtKind === 'ship' ? Math.atan(SHIP_AIM_R / shipP.distanceTo(camera.position)) : Math.atan(ast.R / dist);
  // The clouds take the rock's light, faint far out, strong near the end.
  // Past the horizon line s holds at 1; the strike drives rockGlowK instead.
  const lw = astMesh.visible ? astMat.uniforms.uBurn.value * (0.1 + 1.4 * Math.min(ast.s, 1) ** 2) * state.rockGlowK : 0;
  U.uRockL.value.set(ast.pos.x, ast.pos.y, ast.pos.z, lw);
  U.uRockR.value = 9000 + 4 * ast.R;
  // The sky fills with the rock's fire from halfway down.
  // The strike drives rockGlowK up: the fill reaches full as it comes down.
  // Each split swells it for a few seconds.
  const pop = 0.35 * Math.exp(-Math.max(state.simT - fillPopT, 0) / 2.5) * sstep(Math.min(ast.s, 1), 0.2, 0.6);
  const fk = astMesh.visible && state.tgtKind === 'rock' ? astMat.uniforms.uBurn.value * Math.min(1.15, Math.pow(sstep(Math.min(ast.s, 1), 0.45, 1), 1.3) * Math.min(1.15, 0.7 + 0.3 * state.rockGlowK) + pop) : 0;
  U.uFill.value = fk;
  // The rock's own flare: faint far out, strong near the end; the strike has its own.
  tmpA.copy(ast.pos).project(camera);
  const fon = astMesh.visible && !state.strike && !sight && tmpA.z < 1 && Math.abs(tmpA.x) < 1.3 && Math.abs(tmpA.y) < 1.3;
  grade.uniforms.uLF3.value.set(tmpA.x * 0.5 + 0.5, tmpA.y * 0.5 + 0.5, fon ? (reduced() ? 0.5 : 1) * 0.35 * U.uFill.value : 0);
  grade.uniforms.uLF2C.value.set(0.75, 0.86, 1.0);
  PU.uAstRad.value = ast.R;
  // The smoke near the rock holds still in the world.
  PU.uFlow.value = FALL * ast.s / (1.05 * ast.R) + 0.012 * state.simT;
  // The blocker sits inside the rock's thinnest outline, so no gap shows.
  PU.uSolid.value = astMesh.visible ? ({ long: 0.62, lumpy: 0.78, cratered: 0.8 } as Record<string, number>)[astMesh.geometry.userData.kind] || 0.7 : 0;
}
