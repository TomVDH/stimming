// Tornado alley: the wet pane, out of focus. The focus is on the far plain.
// A drop field is drawn at quarter size, then a disc gather blurs it.
// The runner's glass step reads the blurred field in place of the sharp drops.
// The field goes A, then B, then back to A: A holds the result.
// main.js gives GLASS_STEP and PANE_HEAD to environment(), and calls pass() in before.

import { GLASS_RAIN } from '../shared/glassrain.js';
import { WET_GLASS } from '../shared/wetglass.js';
import { program, linked, target, free, TRI_VS } from '../shared/gl.js';

// The pane pass's own uniforms, before its main.
export const PANE_HEAD = /* glsl */`
uniform sampler2D tDrops;
uniform float uNearBlur;`;

// The glass step. uNearBlur 0 keeps the runner's sharp pane.
export const GLASS_STEP = /* glsl */`
    WgPane g;
    vec2 su;
    if (uNearBlur > 0.0) {
      // tDrops holds the blurred refraction, cover and glint.
      vec4 dr = texture(tDrops, uv);
      float fg = clamp(grFog(pane, uFog, edge, uPatch) * (1.0 - dr.z * 0.95), 0.0, 1.0);
      // A soft drop darkens a little at most; its rim is gone.
      g = WgPane(dr.xy, dr.z * 0.3, dr.w, dr.z, dr.z, fg);
      su = uv + g.off / vec2(asp, 1.0);
      // The view through a soft drop is soft too.
      vec3 sharp = mix(texture(tScene, su).rgb, texture(tBok, su).rgb, smoothstep(0.0, 0.6, dr.z));
      col = wgView(g, sharp, texture(tBok, su).rgb, uScatter, vec3(0.8, 0.84, 0.81), veil, glint);
    } else {
      g = wgPane(pane, uZoom, uM, uFlow, uWet, uWind, 0.4, uFog, uPatch, edge);
      su = uv + g.off / vec2(asp, 1.0);
      col = wgView(g, texture(tScene, su).rgb, texture(tBok, su).rgb, uScatter, vec3(0.8, 0.84, 0.81), veil, glint);
    }
    rim = g.rim; cover = g.cover; fog = g.fog;`;

const HEAD = '#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 o;\n';
// The sharp drops: refraction in xy, cover in z, glint in w.
const DROP_FS = HEAD + `
uniform vec2 uRes, uM;
uniform float uFlow, uWet, uWind, uZoom;
${GLASS_RAIN}
${WET_GLASS}
void main() {
  vec2 pane = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  WgPane g = wgPane(pane, uZoom, uM, uFlow, uWet, uWind, 0.4, 0.0, 0.0, -1.0);
  o = vec4(g.off, g.cover, g.spec);
}`;
// The disc gather: 32 golden-angle taps fill the disc evenly.
const BLUR_FS = HEAD + `
uniform sampler2D tSrc;
uniform vec2 uR;
void main() {
  vec4 a = vec4(0.0);
  for (int i = 0; i < 32; i++) {
    float fi = float(i) + 0.5, t = fi * 2.39996;
    a += texture(tSrc, vUv + uR * sqrt(fi / 32.0) * vec2(cos(t), sin(t)));
  }
  o = a / 32.0;
}`;

/**
 * The soft-pane passes on the runner's context.
 * @param {WebGL2RenderingContext} gl
 */
export function paneBlur(gl) {
  /** @type {{ drop: any, blur: any } | null} */
  let P = null;
  /** @type {any} */
  let A = null, B = null;
  const vao = gl.createVertexArray();
  linked(gl, { drop: program(gl, TRI_VS, DROP_FS), blur: program(gl, TRI_VS, BLUR_FS) })
    .then(set => { P = set; })
    .catch(err => console.error('pane blur:', err));
  return {
    /** True once the programs link and a field is drawn. */
    get ready() { return !!(P && A); },
    /** The blurred field, or null before the first pass. */
    tex: () => (A ? A.tex : null),
    /**
     * Draws and blurs the drop field. It leaves the context in its default state.
     * @param {number} w Frame width.
     * @param {number} h Frame height.
     * @param {{ m: number[], flow: number, speed: number }} motion The runner's pane motion.
     * @param {{ wet: number, zoom: number }} S The runner's state.
     * @param {number} blur The disc radius in frame heights.
     */
    pass(w, h, motion, S, blur) {
      if (!P) return;
      const rw = Math.max(16, Math.round(w / 4)), rh = Math.max(16, Math.round(h / 4));
      if (!A || A.w !== rw || A.h !== rh) {
        free(gl, A); free(gl, B);
        A = target(gl, rw, rh); B = target(gl, rw, rh);
      }
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);
      let u = P.drop.u;
      gl.useProgram(P.drop.p);
      gl.uniform2f(u.uRes, rw, rh); gl.uniform2f(u.uM, motion.m[0], motion.m[1]);
      gl.uniform1f(u.uFlow, motion.flow); gl.uniform1f(u.uWet, S.wet); gl.uniform1f(u.uWind, motion.speed); gl.uniform1f(u.uZoom, S.zoom);
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb);
      gl.viewport(0, 0, rw, rh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      u = P.blur.u;
      gl.useProgram(P.blur.p);
      // Unit 7 is free of the runner's and the funnel pass's units.
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, A.tex); gl.uniform1i(u.tSrc, 7);
      gl.uniform2f(u.uR, blur * h / w, blur);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // A small second gather hides the taps of a wide disc.
      gl.bindTexture(gl.TEXTURE_2D, B.tex);
      gl.uniform2f(u.uR, 0.3 * blur * h / w, 0.3 * blur);
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
  };
}
