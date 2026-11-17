// Load order: post/grade runs first.
import './grade.ts';
// Copied from railgun/src/post/chain.ts and settings.ts; FXAA and the Dev rows are trimmed.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { reduced } from '../../../shared/stim.js';
import { camera, onLeave, renderer, scene } from '../setup.ts';
import { makeBloom } from './bloom.ts';
import { makeGrade } from './grade.ts';

/* ---------- post chain: render, bloom, grade, tone map ---------- */
// Railgun's look values: bloom strength, radius, threshold; tint, vignette, grain.
const POST = { bloom: [0.5, 0.5, 2.0] as const, tint: [0.0008, 0.0009, 0.0016] as [number, number, number], vig: 0.6, vigIn: 0.38, grain: 0.075 };
// The output pass maps the tones with ACES, as Railgun does by default.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// Railgun's night exposure: 2.2 for the night times 0.55 for the setting.
renderer.toneMappingExposure = 2.2 * 0.55;

// The scene renders with 4x multisampling into a half-float target.
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
composer.addPass(makeBloom(...POST.bloom));
const grade = makeGrade(POST);
composer.addPass(grade);
composer.addPass(new OutputPass());
// The composer frees its two targets.
// Each pass frees its own targets and materials.
onLeave(() => { for (const p of composer.passes) p.dispose(); composer.dispose(); });

// Sizes the chain to the canvas; w and h in CSS pixels.
export function resizePost(w: number, h: number): void {
  const dpr = renderer.getPixelRatio();
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  grade.uniforms.uRes.value.set(w * dpr, h * dpr);
}

// Draws one frame through the chain.
export function renderPost(): void {
  // The grain moves with each frame; reduced motion keeps it still.
  if (!reduced()) grade.uniforms.uSeed.value = (grade.uniforms.uSeed.value % 997) + 1;
  composer.render();
}
