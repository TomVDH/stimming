// Load order: qa runs first.
import './qa.ts';
import * as THREE from 'three';
import { buildSteps, later } from '../../shared/stim.js';
import { state } from './state.ts';
import { DETAIL, camera, canvas, gfx, markReady, opts, renderer, scene, stage, ui } from './setup.ts';
import { U } from './world/uniforms.ts';
import { aimSky, sun, sunDeg } from './sky/sun.ts';
import { farBakeG, farBakeL, farGridC, farGridF, farPass, fbCam, fbQuad, fbScene } from './world/farcountry.ts';
import { CLOUD_U, giants } from './clouds/clouds.ts';
import { setStormProbe } from './clouds/probe.ts';
import { setCloudPass } from './clouds/pass.ts';
import { setDeck, stormFl } from './clouds/lightning.ts';
import { gunMat } from './gun/gun.ts';
import { astSize, placeAst } from './rock/asteroid.ts';
import { newShip } from './ship/battleship.ts';
import { prewarmEmbers, seedFrags } from './rock/fragments.ts';
import { composer } from './post/chain.ts';
import { draw, resize } from './view/render.ts';
import { setAimMode, stepAim } from './ship/hit.ts';
import { wake } from './loop.ts';
import { SAMPLES } from './sound/rumble.ts';
import { setBloom, setBox, setGrain, setLens, setTone } from './post/settings.ts';

/* ---------- ready ---------- */
// The intro holds until shaders compile and the first frame draws.
// Its load line: the scene stands, the scene compiles, the hidden pieces compile, the first frame draws.
const built = buildSteps(4);
built();
sun(sunDeg(opts.sun));
seedFrags();
placeAst();
astSize();
ui.setting('shipfire').disabled = true;
// A stored Target applies at load too.
state.tgtKind = ui.setting('target').value;
if (state.tgtKind === 'ship') newShip();
stepAim(0, true);
if (state.tgtKind === 'rock') prewarmEmbers();
setBox(ui.setting('letterbox').value);
// A stored Free aim takes the gun from where it parks.
setAimMode(ui.setting('aim').value);
// The stored graphics settings apply before the first frame.
gunMat.uniforms.uMetalF0.value = ui.setting('gunmetal').value; gunMat.uniforms.uMetalR.value = ui.setting('gunrough').value; gunMat.uniforms.uWear.value = ui.setting('basewear').value;
gfx.res = ui.setting('res').value; gfx.detail = DETAIL[ui.setting('detail').value as keyof typeof DETAIL] || 1; gfx.bloom = ui.setting('bloom').value; gfx.fxaa = ui.setting('fxaa').value; state.shaftGain = ui.setting('shafts').value; state.sunSwing = ui.setting('sunaz').value; aimSky(); sun(sunDeg(opts.sun));
// The layered air's two knobs.
U.uLayer.value.set(ui.setting('farhaze').value, ui.setting('valfog').value);
U.uAirK.value.set(ui.setting('airray').value, ui.setting('airdust').value, ui.setting('airdusth').value, ui.setting('airglow').value);
U.uAir.value = 0.7 * ui.setting('airray').value;
U.uHaze.value = 0.00013 * ui.setting('neardust').value; U.uHazeH.value = ui.setting('neardusth').value;
setDeck(ui.setting('deck').value);
setStormProbe(ui.setting('stormprobe').value);
setCloudPass(ui.setting('cloudpass').value);
CLOUD_U.uStormSoft.value = ui.setting('stormsoft').value;
stormFl.rate = ui.setting('stormfl').value;
giants.visible = ui.setting('giants').value;
gfx.tone = ui.setting('tone').value; gfx.exp = ui.setting('exposure').value; gfx.con = ui.setting('contrast').value; gfx.sat = ui.setting('saturation').value; gfx.bri = ui.setting('brightness').value;
gfx.pal = ui.setting('palette').value; gfx.pull = ui.setting('pull').value; gfx.lift = ui.setting('lift').value;
gfx.mist = ui.setting('mist').value; gfx.hal = ui.setting('halation').value; gfx.vig = ui.setting('vignette').value; gfx.gsize = ui.setting('grainsize').value;
setBloom(); setTone(); setLens();
setGrain();
resize();
renderer.compileAsync(scene, camera).then(async () => {
  built();
  // Warm every hidden piece once behind the intro.
  // The first charge, shot and hit then link no programs and upload no buffers.
  const hidden: THREE.Object3D[] = [];
  scene.traverse(o => { if (((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints) && !o.visible) { hidden.push(o); o.visible = true; } });
  // A failed warm-up falls through to the normal start; the first shot then warms itself.
  // The far bake's two passes link in parallel with the scene.
  fbQuad.material = farBakeL;
  const fbL = new THREE.Mesh(farPass.geometry, farBakeG);
  fbL.frustumCulled = false; fbScene.add(fbL);
  // The height grid's two passes link with them.
  const fbW = [farGridF, farGridC].map(m => { const q = new THREE.Mesh(farPass.geometry, m); q.frustumCulled = false; fbScene.add(q); return q; });
  try { await Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(fbScene, fbCam)]); built(); composer.render(); } catch (err) { console.warn('railgun warm-up', err); }
  fbScene.remove(fbL, ...fbW);
  for (const o of hidden) o.visible = false;
  // The shot's sound files download now; they decode on first use.
  later(() => Object.values(SAMPLES).forEach(f => fetch(f)));
  state.compiled = true;
  draw();
  canvas.classList.add('on');
  markReady();
  wake();
}, err => {
  stage.querySelector<HTMLElement>('.fail')!.hidden = false; ui.hideControls(); markReady();
  throw err;
});
