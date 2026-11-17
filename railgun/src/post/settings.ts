// @ts-nocheck
// Load order: input runs first.
import '../input.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { gfx, renderer, ui } from '../setup.ts';
import { lerp } from '../sky/sun.ts';
import { POST, bloomPass, grade } from './chain.ts';
import { draw } from '../view/render.ts';

export function setBox(on) { grade.uniforms.uBox.value = on ? 1 : 0; draw(); }
export function setGrain() { grade.uniforms.uGrain.value = POST.grain * ui.setting('grain').value; draw(); }
// Mist at full: the bloom's threshold and its knee width.
const MIST = [0.5, 2.5];
export function setBloom() {
  bloomPass.strength = POST.bloom[0] * gfx.bloom;
  // Mist lowers the threshold: mid tones feed the glow.
  bloomPass.threshold = lerp(POST.bloom[2], MIST[0], gfx.mist);
  bloomPass.highPassUniforms.smoothWidth.value = lerp(5.0, MIST[1], gfx.mist);
  // Halation: the two widest levels turn red.
  const k = gfx.hal, tc = bloomPass.bloomTintColors;
  tc[3].set(1, Math.max(0, 1 - 0.28 * k), Math.max(0, 1 - 0.45 * k));
  tc[4].set(1, Math.max(0, 1 - 0.45 * k), Math.max(0, 1 - 0.62 * k));
  draw();
}
export function setLens() { grade.uniforms.uVig.value = POST.vig * gfx.vig; grade.uniforms.uGrainPx.value = gfx.gsize; draw(); }
// Villeneuve runs in the grade; the output pass then maps no tones.
const TONES = { agx: THREE.AgXToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping, villeneuve: THREE.NoToneMapping };
export function setTone() {
  renderer.toneMapping = TONES[gfx.tone] ?? THREE.AgXToneMapping;
  const g = grade.uniforms;
  g.uVil.value = gfx.tone === 'villeneuve' ? 1 : 0;
  g.uCon.value = gfx.con; g.uSat.value = gfx.sat; g.uBri.value = gfx.bri;
  g.uPull.value = gfx.pull; g.uLift.value = gfx.lift;
  draw();
}
// The key hues, each at a luminance of one: desert sand and cold slate.
const lum1 = c => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return c.map(x => x / l); };
const KEY_SAND = lum1(linFit(0.8, 0.1, 68)), KEY_SLATE = lum1(linFit(0.8, 0.05, 228));
export function vilKey() {
  const k = gfx.pal === 'sand' ? 1 : gfx.pal === 'slate' ? 0 : state.keyDay;
  grade.uniforms.uKey.value.set(lerp(KEY_SLATE[0], KEY_SAND[0], k), lerp(KEY_SLATE[1], KEY_SAND[1], k), lerp(KEY_SLATE[2], KEY_SAND[2], k));
}

/* QA hooks: Dusk, the sim clock, draw count. Not for the UI. */
