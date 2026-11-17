// Load order: post/grade runs first.
import './grade.ts';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { state } from '../state.ts';
import { camera, renderer, scene } from '../setup.ts';
import { makeBloom } from './bloom.ts';
import { makeGrade } from './grade.ts';
import type { GradeLook } from './grade.ts';

/* ---------- post chain ---------- */
export const POST: GradeLook & { bloom: [number, number, number] } = { bloom: [0.5, 0.5, 2.0], tint: [0.0008, 0.0009, 0.0016], vig: 0.6, vigIn: 0.38, grain: 0.075 };
state.size = { w: 1, h: 1, dpr: 1 };
// The scene renders with 4x multisampling into a half-float target.
// The chain starts from it.
export const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
export const bloomPass = makeBloom(...POST.bloom);
composer.addPass(bloomPass);
export const grade = makeGrade(POST);
composer.addPass(grade);
composer.addPass(new OutputPass());
// FXAA smooths edges once multisampling is off (rung 2 and up).
export const fxaa = new ShaderPass(FXAAShader);
composer.addPass(fxaa);
export function setSamples(n: number) {
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) { if (rt.samples !== n) { rt.samples = n; rt.dispose(); } }
}
