// Load order: fx/glints runs first.
import './glints.ts';
import * as THREE from 'three';
import { state } from '../state.ts';
import { gfx, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from '../clouds/bands.ts';
import { volRT } from './volnoise.ts';
// A sphere proxy bounds each volume; the march runs from entry to exit.
// Each material declares dens, alb and vlight before this chunk.
import VOLFX from './volfx.glsl';

/* ---------- VOLFX: raymarched volumes for the plume and the fireball ---------- */
// Rungs 2 and 3 march in fewer steps.
export const volSteps = () => Math.min(48, Math.round((state.rung >= 3 ? 10 : state.rung >= 2 ? 16 : 24) * gfx.detail));
export const volLSteps = () => (state.rung >= 2 ? 2 : 3);
// Ground dust is thin and wide: it takes more steps.
export const dustSteps = () => Math.min(48, Math.round((state.rung >= 3 ? 14 : state.rung >= 2 ? 22 : 34) * gfx.detail));
export function makeVol(decl: string, extra: Record<string, THREE.IUniform>) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.ShaderMaterial({
    // uLs: the first light step in metres. uSlab: the top of the slab.
    uniforms: { ...U, uVol: { value: volRT.texture }, uC: { value: new THREE.Vector3() }, uR: { value: 1 }, uVSteps: { value: volSteps() }, uLSteps: { value: volLSteps() }, uLs: { value: 20 }, uSlab: { value: 1e7 }, ...extra },
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`uniform vec3 uC; uniform float uR; varying vec3 vP;
    void main() { vP = uC + position * uR * 1.08; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`,
    fragmentShader: /* glsl */`precision highp sampler3D;
// The noise has no mipmaps: level 0 always.
// An explicit level needs no derivatives, so samples after a discard or in a branch stay stable on Direct3D.
#define texture(s, p) textureLod(s, p, 0.0)
    varying vec3 vP;
    uniform sampler3D uVol;
    uniform sampler2D uGunD; uniform vec2 uDRes, uNF; uniform vec3 uCamFwd;
    uniform vec3 uC; uniform float uR, uLs, uSlab; uniform int uVSteps, uLSteps;
    ${HEAD}
    ${AIR}
    // Two octaves at an odd ratio, turned apart, hide the tile.
    float dustN(vec3 w) {
      vec3 a = vec3(0.8 * w.x - 0.6 * w.z, w.y, 0.6 * w.x + 0.8 * w.z) * 0.41 + vec3(0.37, 0.11, 0.73);
      return clamp((0.6 * texture(uVol, a).r + 0.4 * texture(uVol, w).r - 0.5) * 1.45 + 0.5, 0.0, 1.0);
    }
    ${decl}
    ${VOLFX}`,
  }));
  m.frustumCulled = false; m.renderOrder = BAND.plume; m.visible = false;
  scene.add(m);
  return m;
}
// A raymarched volume on a bounding sphere.
export type Vol = ReturnType<typeof makeVol>;
