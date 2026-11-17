// @ts-nocheck
// Load order: post/settings runs first.
import './post/settings.ts';
import * as THREE from 'three';
import { rangeUniforms, landValues } from '../ranges.js';
import { sound } from '../../shared/stim.js';
import { hulkAt } from '../ship.js';
import { ROUND_C } from '../salvo.js';
import { state } from './state.ts';
import { act, camera, canvas, chargeMix, clamp, gfx, opts, rad, renderer, shotMix, ui } from './setup.ts';
import { MUZZLE, barrelPt } from './world/axis.ts';
import { U } from './world/uniforms.ts';
import { aimSky, setSun, skyTrail } from './sky/sun.ts';
import { IMP_U } from './sky/impacts.ts';
import { FAR_U, FS_U, GRID_U, farBake, farGrid, farGridUpdate, farPass, fbStart, fbStep, setFarMode, setRockCol } from './world/farcountry.ts';
import { CLOUD_U, giants, tower } from './clouds/clouds.ts';
import { setStormProbe } from './clouds/probe.ts';
import { STORM_SPOTS, stormAt, stormBurst, stormFl } from './clouds/lightning.ts';
import { gun } from './gun/gun.ts';
import { caseMesh, ejectCase, stepCase } from './gun/case.ts';
import { gunDepthMesh, gunDepthScene } from './world/shadows.ts';
import { ast, astMat, astMesh, astSize, placeAst, retune } from './rock/asteroid.ts';
import { glideOf, hulkDrift, hulkPos, hulkSite, ship, shipAim, shipArc, shipMat, shipMeshes, shipP, shipQ, shipTh, shipTrains } from './ship/battleship.ts';
import { PU, smoke } from './rock/trail.ts';
import { ablN, frags, shedN } from './rock/fragments.ts';
import { stars } from './fx/burst.ts';
import { grade } from './post/chain.ts';
import { sightMarks } from './view/sight.ts';
import { aimAst, cam, easeLook, frame, look, lookTo, lookV, sight, toggleSight } from './view/camera.ts';
import { draw, drawN, resize } from './view/render.ts';
import { amb, ambStart, farGaps, farPlaces } from './play/ambient.ts';
import { stepAst } from './play/approach.ts';
import { chaos, charge, heldOf, ranging, stageOf, stepCharge, ventT } from './play/charge.ts';
import { bow, halo } from './fx/bowshock.ts';
import { ionMat, tracers } from './fx/ion.ts';
import { caseDustV, chargeDust, jets, plume, shellMesh, shotDust, spike } from './gun/muzzle.ts';
import { flapMesh, frameMesh, portMesh } from './gun/flap.ts';
import { laser, lzB } from './gun/laser.ts';
import { fireball } from './fx/blast.ts';
import { domeAlive, shipDomes, shipDue, shipRumbles, shipSfxLog, shipVoice } from './ship/hulks.ts';
import { chunks, hitShellA, hitShellB } from './fx/volumes.ts';
import { hailT, hails } from './fx/hail.ts';
import { SALVO_CAP, bq, rounds, tgtLive } from './play/shot.ts';
import { aimNow, endShot, kick, manual, recoilRoom, setAim, shipBusy, shipLaid, stepAim, stepShot, sway, ventN } from './ship/hit.ts';
import { fill, fillEl, resetOn, resetToy, spin, spinSpeed, stepSpin } from './play/reset.ts';
import { shipShot, stepShipShot } from './ship/shipshot.ts';
import { stepStrike, strikeP, strikeU } from './rock/strike.ts';
import { busy } from './loop.ts';
import { kit, pend, prune } from './sound/kit.ts';
import { bed } from './sound/wind.ts';
import { chargeBus, hum } from './sound/hum.ts';
import { goBus, goSurge, surgeOver } from './sound/gameover.ts';
import { playShot } from './sound/shot.ts';
import { sfxN } from './sound/hit.ts';
import { roarSet } from './sound/ship.ts';
import { clunks, motor } from './sound/motor.ts';
import { setBloom } from './post/settings.ts';

window.__qa = {
  // The sun and the moon: elevation in degrees, screen place in NDC.
  skyQ() { const f = d => { const p = camera.position.clone().addScaledVector(d, 1e5).project(camera); return { el: +(Math.asin(d.y) * 57.3).toFixed(1), x: +p.x.toFixed(2), y: +p.y.toFixed(2), front: p.z < 1 }; }; return { sun: f(U.uSunD.value), moon: f(U.uMoonD.value), moonK: +U.uMoonK.value.toFixed(2) }; },
  stormProbe(on = true) { setStormProbe(on); draw(); },
  // One repeatable still for tools/clouds-check.mjs.
  // It freezes the clocks, stops random events and pins the rung.
  // o: sun (the Time slider), fall (the rock's place), t (the sim clock), rung.
  still(o = {}) {
    state.qaFreeze = true; state.visible = true; state.rungPin = true;
    stormFl.rate = 0; stormFl.strokes = []; CLOUD_U.uFl.value.forEach(v => { v.w = 0; });
    amb.next = 1e9;
    // The cirrus takes a random offset at load; the still fixes it.
    U.uWisp.value.set(80, 120, 0.8);
    const r = o.rung ?? 0;
    if (state.rung !== r) { state.rung = r; resize(); }
    state.simT = o.t ?? 15; U.uTime.value = state.simT;
    if (o.sun !== undefined) { opts.sun = o.sun; setSun(); }
    ast.s = o.fall ?? 0.45; placeAst(); astSize();
    frame(); draw();
    return { rung: state.rung, simT: state.simT, sun: opts.sun };
  },
  // Each storm's base centre as drawn now, its height and its half width, in metres.
  // Shows one storm (its index in stormsQ), none (-1) or all (null).
  // A hidden storm's card gets zero width; the march never runs there.
  stormSolo(k = null) {
    let j = 0;
    for (const m of [tower, giants]) {
      const a = m.geometry.getAttribute('aC');
      a.qaW0 ??= Array.from({ length: a.count }, (_, i) => a.getW(i));
      for (let i = 0; i < a.count; i++, j++) a.setW(i, k === null || k === j ? a.qaW0[i] : 0);
      a.needsUpdate = true;
    }
    draw();
  },
  stormsQ: () => STORM_SPOTS.map(c => { const P = stormAt(c, state.simT, new THREE.Vector3()); return { P: [P.x, c.base, P.z], H: c.H, W: c.W, kind: c.kind }; }),
  // Fire one lightning burst in a storm now; storms() lists the live strokes.
  stormFlash() { stormBurst(); },
  storms: () => stormFl.strokes.map(k => ({ age: state.simT - k.t0, L: k.L, P: k.P.toArray() })),
  sun(v) { opts.sun = v; setSun(); },
  simT: () => state.simT,
  draws: () => drawN,
  rung: () => state.rung,
  marks: () => { const m = sightMarks(); return { state: m.state, rdot: m.rdot, rock: !!m.rock, hit: m.hit ? { x: m.hit.x, y: m.hit.y } : null }; },
  laserQ: () => ({ on: laser.visible, end: lzB.toArray(), live: tgtLive() }),
  info: () => ({ ...renderer.info.render, programs: renderer.info.programs.length, ...renderer.info.memory }),
  size: v => { opts.size = v; retune(); },
  // Jump the rock to fall fraction s; past 1 the strike starts.
  fall(s) { ast.s = s; placeAst(); astSize(); },
  strikeQ: () => (state.strike ? { u: strikeU(), s1: state.strike.s1, hit: state.strike.hit } : null),
  ast: () => ({ s: ast.s, state: ast.state, R: ast.R, th: THREE.MathUtils.radToDeg(ast.th), pos: ast.pos.toArray() }),
  // Hold at a level: the charge starts as if held for c.
  charge(c) { c = clamp(c, 0.12, 1.25); act.press('pointer', true); charge.t0 = state.simT - heldOf(c); stepCharge(0); frame(); draw(); },
  // Hold as if pressed t seconds ago.
  hold(t) { act.press('pointer', true); if (charge) charge.t0 = state.simT - t; stepCharge(0); frame(); draw(); },
  // A real press: ranging first, then the charge.
  press() { act.press('pointer'); },
  ranging: () => (ranging ? state.simT - ranging.t0 : -1),
  level: () => (charge ? charge.c : 0),
  stage: () => (charge ? stageOf(state.simT - charge.t0) : state.simT - ventT < 3 ? 'vent' : 'idle'),
  holding: () => !!charge,
  // Salvo: pick the fire mode, read the live one, read the bank.
  mode(m) { ui.setting('firemode').set(m); },
  fireMode: () => state.fireMode,
  bank: () => charge?.bank ?? 0,
  recoil: () => ({ slide: U.uRecoil.value, room: recoilRoom(), pitch: THREE.MathUtils.radToDeg(kick.p) }),
  heat: () => U.uHeat.value,
  rockKind: () => astMesh.geometry.userData.kind,
  spin: () => (spin ? { t: spin.t } : null),
  reset() { resetToy(); },
  tgt: () => state.tgtKind,
  shipFire() { shipShot(); },
  shipShot: () => (state.sshot ? { state: state.sshot.state, age: state.simT - state.sshot.t0, pos: state.sshot.pos.toArray(), to: state.sshot.to.toArray() } : { state: 'idle', age: 0, pos: null }),
  // A ground point in NDC, its eye distance and its gun distance.
  projectPt(x, y, z) { const q = new THREE.Vector3(x, y, z), d = q.distanceTo(camera.position); q.project(camera); return { nx: q.x, ny: q.y, dist: d, gun: Math.hypot(x, z) }; },
  landing() {
    if (!state.sshot) return null;
    const q = state.sshot.to.clone().project(camera);
    return { dist: state.sshot.to.distanceTo(camera.position), nx: q.x, ny: q.y, gun: Math.hypot(state.sshot.to.x, state.sshot.to.z) };
  },
  shipFireEnabled: () => !ui.setting('shipfire').disabled,
  ship: () => ({ state: ship.state, wounds: ship.wound ? 1 : 0, bend: THREE.MathUtils.radToDeg(shipMat.uniforms.uWound.value.y), smoulder: shipMat.uniforms.uWound.value.z, arc: THREE.MathUtils.radToDeg(shipArc(state.simT)), part: ship.hulks.map((h, i) => hulkDrift(i, state.simT)), breakAt: ship.hulks.map(h => h.breakAt), aim: shipAim(state.simT, new THREE.Vector3()).toArray(), alive: ship.hulks.filter(h => h.breakAt !== null && h.landedAt === null).length, landed: ship.hulks.filter(h => h.landedAt !== null).length, th: shipTh(), entry: ship.hulks.map(h => (h.breakAt === null ? 0 : hulkAt(h, state.simT - h.breakAt).entry)),
    uEntry: shipMeshes.map(m => m.material.uniforms.uEntry.value.w), f: ship.hulks.map(h => (h.breakAt === null ? 0 : hulkAt(h, state.simT - h.breakAt).f)),
    fallT: ship.hulks.map(h => h.fallT), pos: shipMeshes.map(m => m.position.toArray()), vis: shipMeshes.map(m => m.visible),
    tumble: shipMeshes.map(m => m.quaternion.angleTo(shipQ)), lit: shipMeshes.map(m => m.material.uniforms.uLit.value), halo: U.uAstR.value,
    trains: shipTrains.map(t => ({ on: t.m.visible || (!!t.rib && t.rib.visible), cheap: t.cheap, len: t.cheap ? t.rib.material.uniforms.uLen.value : t.pu.uLen.value, lift: t.cheap ? (t.rib.material.uniforms.uLift.value.y ? t.rib.material.uniforms.uLift.value.x * t.rib.material.uniforms.uLen.value : 0) : t.pu.uLift.value.y ? t.pu.uLift.value.x : 0 })),
    steps: PU.uSteps.value, vent: ventN, shed: shedN,
    domes: shipDomes.filter(domeAlive).length, landedF: ship.hulks.map(h => h.landedAt !== null), rumbleAt: ship.hulks.map(h => h.rumbleAt ?? null),
    rumbles: shipRumbles.length, rise: state.simT - ship.t0, flash: IMP_U.uImp.value.map(v => v.w) }),
  // Each live dome: hulk, age, foot and distance from the eye.
  domesQ: () => shipDomes.filter(domeAlive).map(d => ({ i: d.i, age: state.simT - d.t0, S: d.S, P: d.P.toArray(), dist: d.P.distanceTo(camera.position), vis: d.m.visible })),
  // Each hail landing: age, size and eye distance.
  hailsQ: () => ({ due: [...hailT].filter(t => t > 0).sort((a, b) => a - b), landed: hails.map(h => ({ age: state.simT - h.t0, r: h.r, dist: h.P.distanceTo(camera.position) })) }),
  rumbleDelay: i => ship.hulks[i].rumbleDelay,
  // Each pending sound: seconds left and its source count.
  pendQ: () => [...pend].map(h => ({ left: h.end - (kit.ac?.currentTime ?? 0), n: h.nodes.length, ship: shipRumbles.includes(h) })),
  // Start the audio context as a gesture would.
  wakeAudio() { kit.wake(); },
  // Record the sound output; stop() resolves to a data URL.
  // tap 'go' or 'charge': that sound alone, with no other sound.
  record(tap) {
    const ac = kit.live(), d = ac.createMediaStreamDestination(), src = tap === 'go' ? goBus(ac) : tap === 'charge' ? chargeBus(ac) : kit.out;
    src.connect(d);
    const r = new MediaRecorder(d.stream), parts = [];
    r.ondataavailable = e => parts.push(e.data);
    r.start();
    return { stop: () => new Promise(res => {
      r.onstop = () => { src.disconnect(d); const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(new Blob(parts, { type: r.mimeType })); };
      r.stop();
    }) };
  },
  // Draw the same frame with no impact, for the night check.
  // impOff(2) keeps the domes and drops only the flash light.
  // impOff(3) drops only the cloud light.
  impOff(on) { state.impK = on === 2 || on === 3 ? on : on ? 0 : 1; IMP_U.uImpCK.value = state.impK === 3 ? 0 : 1; draw(); },
  // The gun's own pixels in CSS pixels, every step device pixels.
  // Edge pixels drop out.
  // A gun pixel needs gun all round it.
  gunMask(step = 3, pad = 3) {
    const w = renderer.domElement.width, h = renderer.domElement.height, rt = new THREE.WebGLRenderTarget(w, h);
    const mat = gunDepthMesh.material, cw = mat.colorWrite, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    mat.colorWrite = true;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(gunDepthScene, camera);
    const px = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    renderer.setRenderTarget(null); renderer.setClearColor(cc, ca); mat.colorWrite = cw; rt.dispose();
    const r = canvas.getBoundingClientRect(), k = r.width / w, out = [];
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4] > 128;
    for (let y = pad; y < h - pad; y += step) for (let x = pad; x < w - pad; x += step) {
      if (!on(x, y) || !on(x - pad, y) || !on(x + pad, y) || !on(x, y - pad) || !on(x, y + pad)) continue;
      out.push([Math.round(r.left + x * k), Math.round(r.top + (h - 1 - y) * k)]);
    }
    return out;
  },
  // Set the bloom strength, as the Settings slider does.
  bloom(v) { gfx.bloom = v; setBloom(); },
  // Set the sun rays' gain, as the Dev slider does.
  shafts(v) { state.shaftGain = v; draw(); },
  // Pick a view at once, with no move.
  // Turn the dusk sun v degrees right of the look.
  swing(v) { state.sunSwing = v; aimSky(); setSun(); },
  hulkPos: (i, t) => hulkPos(i, t, new THREE.Vector3()).toArray(),
  hulkSite: i => hulkSite(i, new THREE.Vector3()).toArray(),
  // The ground ease g at age a after the break.
  hulkG: (i, a) => glideOf(hulkAt(ship.hulks[i], a).f),
  busy: () => busy(),
  shipBusyQ: () => shipBusy(),
  // The ship's centre and its hull's screen bounds, in CSS pixels.
  shipScreen() {
    const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
    const px = q => { q.project(camera); return [r.left + (q.x * 0.5 + 0.5) * r.width, r.top + (0.5 - q.y * 0.5) * r.height]; };
    const [x, y] = px(shipP.clone()), b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    for (const m of shipMeshes) {
      m.updateMatrixWorld();
      const bb = m.geometry.boundingBox;
      for (let i = 0; i < 8; i++) {
        const [sx, sy] = px(v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(m.matrixWorld));
        b.x0 = Math.min(b.x0, sx); b.x1 = Math.max(b.x1, sx); b.y0 = Math.min(b.y0, sy); b.y1 = Math.max(b.y1, sy);
      }
    }
    return { x, y, ...b };
  },
  // Zoom the lens z times onto the ship.
  // A z of 1 restores it.
  shipLens(z) {
    cam.zoom = 1; look.yaw = look.pitch = lookTo.yaw = lookTo.pitch = lookV.yaw = lookV.pitch = 0;
    frame();
    // The zoom moves the horizon's pitch.
    // Two passes settle the aim.
    for (let i = 0; z > 1 && i < 2; i++) {
      cam.zoom = 1 / z;
      frame();
      const d = shipP.clone().sub(camera.position).normalize(), f = camera.getWorldDirection(new THREE.Vector3());
      look.yaw = lookTo.yaw += Math.atan2(-d.x, -d.z) - Math.atan2(-f.x, -f.z);
      look.pitch = lookTo.pitch += Math.asin(d.y) - Math.asin(f.y);
    }
    frame(); draw();
  },
  // Set the choice only, as the Settings sheet does.
  pick(k) { ui.setting('target').set(k); },
  // Set the choice and reset at once.
  target(k) { ui.setting('target').set(k); resetToy(); },
  sight: () => sight,
  toggleSight() { toggleSight(); },
  look: () => ({ yaw: THREE.MathUtils.radToDeg(look.yaw), pitch: THREE.MathUtils.radToDeg(look.pitch), to: THREE.MathUtils.radToDeg(lookTo.yaw) }),
  blastState: () => {
    const u = fireball.material.uniforms, b = U.uBlast.value, T = u.uFb.value.x;
    return { fire: fireball.visible, w: b.w, off: state.blastFx ? +(state.blastFx.P.distanceTo(b) / state.blastFx.R).toFixed(2) : -1, size: state.blastFx ? +(u.uR.value / 1.6 / state.blastFx.R).toFixed(2) : 0,
      hot: state.blastFx ? Math.exp(-T / 5) + 0.8 * Math.exp(-T / 0.6) : 0, shellA: hitShellA.visible ? Math.round(hitShellA.material.uniforms.uR.value) : 0,
      shellB: hitShellB.visible ? Math.round(hitShellB.material.uniforms.uR.value) : 0, rings: false, astW: U.uAst.value.w, hitFlash: state.hitFlash };
  },
  frags: () => frags.filter(f => f.on).map(f => ({ visible: f.m.visible, gap: +(f.pos.distanceTo(ast.pos) / ast.R).toFixed(2), r: Math.round(f.k * ast.R) })),
  // Fall fractions where pending pieces break off.
  splits: () => frags.filter(f => !f.on && f.splitS >= 0 && f.broke < 0).map(f => f.splitS),
  // The newest split piece: its place and its age in seconds.
  lastSplit() { const f = frags.filter(g => g.on && g.splitT > 0).sort((a, b) => b.splitT - a.splitT)[0]; return f ? { pos: f.pos.toArray(), age: state.simT - f.splitT } : null; },
  ablation: () => ablN,
  ion: () => ({ visible: tracers.some(t => t.line.visible || t.puffs.visible), glow: tracers[0].round ? Math.exp(-ionMat.uniforms.uI.value.x / 0.35) : 0 }),
  // Salvo: the rounds in flight, and a salvo of n rounds fired at once.
  // Pose the barrel's slide in metres, for clearance stills.
  slide(m) { U.uRecoil.value = m; state.shadowDirty = true; frame(); draw(); },
  // Throw the spent case now, for stills.
  eject() { ejectCase(); },
  caseP: () => (state.spent ? state.spent.p.toArray() : null),
  // Lay the gun by degrees for clearance stills: yaw left, elevation up.
  lay(y, e) { setAim(rad(y), rad(e)); state.shadowDirty = true; frame(); draw(); },
  // Pose a close eye on the gun for stills: place, target, field of view.
  eye(p, t, fov = 30) { camera.position.set(...p); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(...t); camera.updateMatrixWorld(); draw(); },
  cap: () => SALVO_CAP,
  rings: () => U.uShocks.value.map(v => +v.w.toFixed(3)),
  tally: () => ({ ...ast.tally }),
  sfx: () => ({ ...sfxN }),
  flash: () => state.hitFlash,
  hitAt: () => ast.hitAt,
  craters: () => astMat.uniforms.uCrater.value.filter(c => c.w >= 0 && state.simT - c.w < 20).length,
  hunted: () => chunks.filter(ch => ch.burstAt).length,
  rounds: () => rounds.map(r => ({ j: r.j, age: state.simT - r.s0, hit: r.hit, res: r.res, canHit: !!r.canHit })),
  salvo(n) { ui.setting('firemode').set('salvo'); state.fireMode = 'salvo'; state.fire(ROUND_C, n, true); frame(); draw(); },
  muzzle: () => ({ plume: plume.visible, jets: jets.some(j => j.visible), spike: spike.visible, rings: false, shell: shellMesh.visible ? shellMesh.material.uniforms.uR.value : 0 }),
  aim: () => ({ dy: aimNow.dy, de: aimNow.de, err: aimNow.err, elev: aimNow.elev, yaw: aimNow.yaw, vy: aimNow.vy, ve: aimNow.ve, sp: sway.p, sy: sway.y }),
  release() { act.release('pointer'); },
  // Jump the clock by t seconds.
  // The rock and the charge catch up.
  jump(t) { state.simT += t; U.uTime.value = state.simT; stepAst(t); stepAim(t, true); stepCharge(Math.min(t, 0.1)); frame(); draw(); },
  glowK(k) { state.rockGlowK = k; aimAst(); draw(); },
  setS(v) { ast.s = v; ast.state = v >= 1 ? 'hold' : 'approach'; placeAst(); astSize(); stepAim(0, true); frame(); draw(); },
  charged: () => U.uCharge.value,
  chaos: () => chaos,
  audio: () => ({ state: kit.ac?.state ?? null, hum: !!hum, bed: !!bed, pend: (prune(), pend.size), salvoPend: [...pend].filter(h => h.tag === 'salvo').length, voices: hum ? hum.voices.length : 0, locked: !!hum?.locked, sour: hum ? hum.sour : 0, motor: motor ? (motor.on ? 'on' : 'idle') : null, clunks, shotMix, chargeMix, layers: (hum?.surge || (hum?.stack && hum))?.voices.filter(v => v.vg.gain.value > 0.005).length ?? null }),
  // Drive the game-over surge by hand: d is { u, vol, over } or null.
  surgeOver(d) { surgeOver(kit.live(), d); },
  surgeLive: () => (goSurge ? { locked: goSurge.locked, layers: goSurge.voices.filter(v => v.vg.gain.value > 0.005).length } : null),
  // Play one shot take now, at charge c.
  take(name, c = 1) { const ac = kit.live(); if (ac) playShot(ac, ac.currentTime + 0.05, Math.min(c, 1.25), name); },
  mute(on) { sound.set(!on); },
  // The ship's voices: each queued sound, its due and start times.
  shipSfx: () => ({ simT: state.simT, roarSrc: [...roarSet].filter(r => pend.has(r)).length, hit: ship.fx ? ship.fx.t0 : null, joints: ship.fx ? ship.fx.joints.length : 0, due: shipDue.length, roars: ship.hulks.map((h, i) => !!(shipVoice[i]?.roar && !shipVoice[i].done && pend.has(shipVoice[i].roar))), log: shipSfxLog.map(({ kind, i, k, due, ref, started, ctx }) => ({ kind, i, k, due, ref, started, ctx })) }),
  // A peak meter on the output bus, polled at 50 Hz.
  tap() {
    if (state.meter || !kit.ac) return !!state.meter;
    const an = kit.ac.createAnalyser(), buf = new Float32Array(2048);
    an.fftSize = 2048; kit.out.connect(an);
    state.meter = { peak: 0, id: setInterval(() => { an.getFloatTimeDomainData(buf); for (const x of buf) state.meter.peak = Math.max(state.meter.peak, Math.abs(x)); }, 20) };
    return true;
  },
  peak(reset = true) { const p = state.meter ? state.meter.peak : -1; if (reset && state.meter) state.meter.peak = 0; return p; },
  shoot(c) { state.fire(c); frame(); draw(); },
  // Freeze the clock, then run it t seconds in frame steps.
  // A frozen page draws even when hidden, for stills from a background tab.
  // The lens state: the hold's push, the watch's loom, the star arc.
  lens: () => ({ push: cam.push, loom: cam.loom, trail: skyTrail.span }),
  // Fire one ambient event; amb() reads the director.
  ambient(kind) { ambStart(kind); },
  // The far guns' places: screen x, distance, and whether a bake found them.
  farGaps: () => ({ baked: !!farGaps(), places: farPlaces().map(q => ({ sx: +q.sx.toFixed(2), D: Math.round(q.D), notchY: Math.round(q.notch.y) })) }),
  amb: () => ({ live: amb.live.map(e => ({ kind: e.kind, age: state.simT - e.t0, dur: e.dur })), next: amb.next - state.simT, due: amb.due.length, deadSince: amb.deadSince }),
  freeze(on = true) { state.qaFreeze = on; if (on) state.visible = true; },
  // The far pass: the mode, and how often it baked and relit.
  // Set the far ranges' face bump.
  bump(v) { FAR_U.uBump.value = v; draw(); },
  // Set the ranges' light (sun, sky, effects) and rock colour.
  rangeLight(x, y, z, rock) { FAR_U.uRangeL.value.set(x, y, z); if (rock) setRockCol(rock); draw(); },
  // Try a range table and landscape knobs live; the grid and the bake follow.
  ranges(table, land) {
    const { rg, ra } = rangeUniforms(table);
    FAR_U.uRg.value.forEach((v, i) => v.set(...(rg[i] || [0, 0, 0, 0])));
    FAR_U.uRa.value.forEach((v, i) => v.set(...(ra[i] || [0, 0, 0, 0])));
    if (land) FAR_U.uLand.value = landValues(land);
    farBake.dirty = true;
  },
  farSkip(on) { GRID_U.uGridOn.value = on ? 1 : 0; farBake.dirty = true; },
  grid: () => ({ half: farGrid.half, cell: GRID_U.uGrid.value.z, builds: farGrid.builds }),
  far(mode, ero) { if (mode) setFarMode(mode === 'bake'); if (ero != null) { FAR_U.uEro.value = ero; farBake.dirty = true; } if (arguments[2] != null) { FAR_U.uForms.value = arguments[2]; farBake.dirty = true; } return { on: farBake.on, bakes: farBake.bakes, hard: farBake.hard, lights: farBake.lights, size: FS_U.uBakeSize.value.toArray() }; },
  // GPU time in ms over n frames: what 'far' for the far pass, 'all' for the frame.
  async gpuMs(what = 'far', n = 30) {
    const gl = renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!ext) return null;
    const qs = [];
    let q = null;
    const on = () => { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }, off = () => { gl.endQuery(ext.TIME_ELAPSED_EXT); qs.push(q); };
    const b0 = farPass.onBeforeRender, a0 = farPass.onAfterRender;
    if (what === 'far') { farPass.onBeforeRender = (...a) => { b0(...a); on(); }; farPass.onAfterRender = off; }
    // 'farup' times the bake's own work in each frame.
    const u0 = state.farBakeUpdate;
    if (what === 'farup') state.farBakeUpdate = () => { on(); u0(); off(); };
    // 'bake' times a full rebake; 'light' times a relight alone.
    // 'full' times a whole bake in one go, for reference.
    // 'grid' times a rebuild of the height grid.
    if (what === 'grid') { this.run(1 / 30); for (let i = 0; i < n; i++) { farGrid.key = ''; on(); farGridUpdate(); off(); } farBake.dirty = false; }
    else if (what === 'full') { this.run(1 / 30); for (let i = 0; i < n; i++) { on(); fbStart(camera); fbStep(true); off(); } }
    else if (what === 'bake' || what === 'light') { this.run(1 / 30); for (let i = 0; i < n; i++) { if (what === 'bake') farBake.dirty = true; else farBake.sun.set(0, 0, 0); on(); state.farBakeUpdate(); off(); } }
    else for (let i = 0; i < n; i++) { if (what === 'all') on(); this.run(1 / 30); if (what === 'all') off(); }
    farPass.onBeforeRender = b0; farPass.onAfterRender = a0;
    state.farBakeUpdate = u0;
    const ms = [];
    for (const x of qs) {
      while (!gl.getQueryParameter(x, gl.QUERY_RESULT_AVAILABLE)) await new Promise(r => setTimeout(r, 5));
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) ms.push(gl.getQueryParameter(x, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(x);
    }
    const seq = ms.map(v => +v.toFixed(1));
    ms.sort((a, b) => a - b);
    return { median: ms[ms.length >> 1], min: ms[0], max: ms[ms.length - 1], n: ms.length, seq };
  },
  // Rock parts off the camera's layer, so a frame time shows what they cost.
  // partsOff([]) puts every part back.
  partsOff(names) {
    const parts = { rock: [astMesh], smoke: [smoke], glows: [bow, halo], frags: frags.map(f => f.m), fragTrails: frags.map(f => f.trail), fragGlows: frags.map(f => f.glow), sparks: [stars] };
    for (const [k, ms] of Object.entries(parts)) for (const m of ms) m.layers.set(names.includes(k) ? 31 : 0);
    frame(); draw();
  },
  run(t, dt = 1 / 30) { for (let k = 0; k < t - 1e-6; k += dt) { stepSpin(dt); const sdt = dt * spinSpeed(); state.simT += sdt; U.uTime.value = state.simT; stepAst(sdt); stepAim(sdt); stepCharge(sdt); stepShot(sdt); stepShipShot(sdt); stepStrike(sdt); stepCase(sdt); easeLook(dt); } frame(); draw(); },
  shot: () => (state.shot ? { age: state.simT - state.shot.t0, T: state.shot.T, hitT: state.shot.hitT, hit: state.shot.hit, arrive: state.shot.arrive, sfx: state.shot.sfx, canHit: state.shot.canHit, res: state.shot.res ?? null, target: state.shot.target.toArray(), muzzle: state.shot.muzzle.toArray(), bore: THREE.MathUtils.radToDeg(state.shot.ax.angleTo(bq.copy(state.shot.target).sub(state.shot.muzzle))) } : null),
  // End the live shot at once, so the next one can fire.
  endShot() { if (state.shot) endShot(); },
  shipLaidQ: () => shipLaid(),
  // Free aim: lay the gun at yaw and elevation in degrees.
  aimFree(y, e) { ui.setting('aim').set('free', true); if (y != null) { manual.yaw = rad(y); manual.elev = rad(e); } },
  aimTrack() { ui.setting('aim').set('track', true); },
  // The rock's centre and radius in CSS pixels, for cropped stills.
  astScreen() { const p = ast.pos.clone().project(camera), q = ast.pos.clone().addScaledVector(camera.up, ast.R).project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (0.5 - p.y * 0.5) * r.height, R: Math.abs(q.y - p.y) * 0.5 * r.height }; },
  // The muzzle in CSS pixels, for cropped stills.
  // Any barrel point in CSS pixels: a along, x across, u up.
  screenOf(a, x = 0, u = 0) { const p = barrelPt(a, x, u, new THREE.Vector3()).project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (0.5 - p.y * 0.5) * r.height }; },
  muzzleScreen() { const p = MUZZLE.clone().project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (0.5 - p.y * 0.5) * r.height }; },
  spent: () => (state.spent ? { y: state.spent.p.y, bounce: state.spent.bounce, landed: state.spent.lt >= 0, r: Math.hypot(state.spent.p.x, state.spent.p.z), visible: caseMesh.visible } : null),
  resetReady: () => resetOn,
  dust: () => ({ charge: chargeDust.visible, shot: shotDust.visible, kase: caseDustV.visible }),
  chunkSegs: () => chunks.map(ch => ch.segs.map(t => (t.m.visible ? [t.pu.uX0.value | 0, t.pu.uSeg.value | 0] : null))),
  // Put the rock at the end of its grace hold: the strike starts next step.
  strike() { ast.s = 1; ast.state = 'approach'; stepAst(0); frame(); draw(); },
  // Put a live strike at nearness u, 0 at the horizon line, 1 at contact.
  strikeAt(u) { if (!state.strike) this.strike(); ast.s = 1 + u * (state.strike.s1 - 1); placeAst(); astSize(); stepStrike(0); frame(); draw(); },
  fast(on) { state.fastRock = on; },
  strikeState: () => (state.strike ? { tb: state.strike.tb, u: strikeU(), hit: state.strike.hit, out: state.strike.out, s: ast.s, s1: state.strike.s1, y: ast.pos.y, dist: ast.pos.distanceTo(camera.position), ground: strikeP.distanceTo(camera.position), fill: +fillEl.style.opacity, flash: grade.uniforms.uFlash.value, lf: grade.uniforms.uLF2.value.z, god: grade.uniforms.uGod.value.z } : { state: ast.state, s: ast.s, fill: +fillEl.style.opacity, spin: !!spin, fillOn: !!fill }),
  // Pose the blast on the clouds t seconds after a hit at the rock.
  blast(t) { state.hitFlash = Math.exp(-t / 0.4) + 0.3 * Math.exp(-t / 5); U.uHit.value.w = state.hitFlash; U.uHitP.value.set(ast.pos.x, ast.pos.y, ast.pos.z, state.simT - t); U.uHitR.value = ast.R; U.uBlast.value.set(ast.pos.x, ast.pos.y, ast.pos.z, state.hitFlash); U.uBk.value = 1; frame(); draw(); },
};

// The gun's meshes, for model exports from a dev script.
window.__models = () => ({ gun, flapMesh, portMesh, frameMesh });
