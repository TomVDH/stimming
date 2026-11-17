// Load order: post/grade runs first.
import './grade.ts';
// Copied from railgun/src/post/chain.ts and settings.ts.
// FXAA and the Dev rows are trimmed.
import { ACESFilmicToneMapping, DepthTexture, HalfFloatType, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { reduced } from '../../../shared/stim.js';
import { camera, onLeave, renderer, scene } from '../setup.ts';
import { makeBloom } from './bloom.ts';
import { makeDof } from './dof.ts';
import { makeGrade } from './grade.ts';

/* ---------- post chain: render, bloom, grade, tone map ---------- */
// Railgun's look values: the bloom's strength, radius and threshold.
// Then the tint, the vignette and the grain.
const POST = { bloom: [0.5, 0.5, 2.0] as const, tint: [0.0008, 0.0009, 0.0016] as [number, number, number], vig: 0.6, vigIn: 0.38, grain: 0.075 };
// The output pass maps the tones with ACES.
// Railgun does the same by default.
renderer.toneMapping = ACESFilmicToneMapping;
// Railgun's night exposure: 2.2 for the night times 0.55 for the setting.
renderer.toneMappingExposure = 2.2 * 0.55;

// The scene renders with 4x multisampling into a half-float target.
// The target keeps the scene's depth for the depth of field.
const composer = new EffectComposer(renderer, new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: 4, depthTexture: new DepthTexture(2, 2) }));
// The composer takes device pixels at its own pixel ratio of 1.
// Its setPixelRatio resizes every target, so a resize would allocate twice.
composer.setPixelRatio(1);
composer.addPass(new RenderPass(scene, camera));
// The depth of field runs in the cuts only.
// Off, the composer skips it.
const dof = makeDof(camera);
dof.enabled = false;
composer.addPass(dof);
composer.addPass(makeBloom(...POST.bloom));
const grade = makeGrade(POST);
composer.addPass(grade);
composer.addPass(new OutputPass());
// The composer frees its two targets.
// Each pass frees its own targets and materials.
onLeave(() => { for (const p of composer.passes) p.dispose(); composer.dispose(); });

// Sizes the chain to the canvas.
// w and h are in CSS pixels.
export function resizePost(w: number, h: number): void {
  const dpr = renderer.getPixelRatio();
  composer.setSize(w * dpr, h * dpr);
  grade.uniforms.uRes.value.set(w * dpr, h * dpr);
}

// The cuts' depth of field.
// focus: metres from the eye.
// aperture: the blur at infinity, a share of the frame's height.
// null turns it off.
export function cutFocus(f: { focus: number; aperture: number } | null): void {
  dof.enabled = f !== null;
  if (f) dof.set(f.focus, f.aperture);
}

// The cuts' grain: k 0 is the wide shot's, k 1 the cuts'.
// The cuts take twice the grain, in cells 1.6 pixels wide.
export function cutGrain(k: number): void {
  grade.uniforms.uGrain.value = POST.grain * (1 + k);
  grade.uniforms.uCell.value = 1 + 0.6 * k;
}

// Draws one frame through the chain.
export function renderPost(): void {
  // The grain moves with each frame.
  // Reduced motion keeps it still.
  if (!reduced()) grade.uniforms.uSeed.value = (grade.uniforms.uSeed.value % 997) + 1;
  composer.render();
}
