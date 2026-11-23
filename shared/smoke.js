// @ts-check
// Shared GLSL: Fire's smoke light, for raw WebGL2 and three.js.
// The source is shared/fire.js, volume(), in TSL.
// Paste SMOKE into a shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
// Whiteout is the reference. Plan: docs/plans/smoke.md.
//
// Use, at each step of the toy's own march:
//   float tau = <the toy's taps toward the light> * smAbsorb;
//   float L = smLight(tau, smMulti, smPowder, smAmbient);
//   vec3 c = lightC * dens * L * smPhase(dot(toEye, toLight), smG) * 12.56637;
// smConsts(SM_FIRE) declares smAbsorb, smAmbient, smPowder, smMulti and smG.
// The toy keeps its taps, its density and the scale of tau.

export const SMOKE = /* glsl */`
// The light share through optical depth tau.
// Beer, plus a slower lobe for multiple scatter.
// The powder term darkens thin edges.
float smTransmit(float tau, float multi, float powder) {
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, multi);
  float pw = 1.0 - exp(-tau * 2.0);
  return mix(base, base * pw, powder);
}
// The light share with an ambient floor.
// Shadowed smoke never goes black.
float smLight(float tau, float multi, float powder, float ambient) {
  return clamp(smTransmit(tau, multi, powder) + ambient, 0.0, 1.0);
}
// Henyey-Greenstein, per steradian.
// c is the cosine between the eye and the light, seen from the smoke.
float smPhase(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577;
}
`;

/**
 * A smoke look.
 * @typedef {Readonly<{ absorb: number, ambient: number, powder: number, multi: number, g: number }>} SmLook
 * absorb scales tau.
 * ambient is the floor.
 * powder and multi run from 0 to 1.
 * g is the phase.
 */

/**
 * The numbers the GLSL copies share.
 * Fire's own asymmetry default is 0; the copies use 0.55.
 * @type {SmLook}
 */
export const SM_FIRE = Object.freeze({ absorb: 2.0, ambient: 0.5, powder: 0.59, multi: 1.0, g: 0.55 });

/**
 * A look as GLSL constants: smAbsorb, smAmbient, smPowder, smMulti, smG.
 * A shader takes one smConsts() line.
 * A second look passes its numbers to smLight() directly.
 * @param {SmLook} [look] SM_FIRE by default.
 * @returns {string} One `const float` line.
 */
export function smConsts(look = SM_FIRE) {
  const keys = /** @type {const} */ (['absorb', 'ambient', 'powder', 'multi', 'g']);
  const out = keys.map(k => {
    const x = look[k];
    if (!Number.isFinite(x)) throw new RangeError(`smConsts: ${k} is ${x}`);
    const name = 'sm' + (k === 'g' ? 'G' : k[0].toUpperCase() + k.slice(1));
    return `${name} = ${Number.isInteger(x) ? x.toFixed(1) : String(x)}`;
  });
  return `const float ${out.join(', ')};\n`;
}
