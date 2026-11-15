// Shared GLSL and JS: glow. Orbs round lights, and a bloom chain for raw WebGL2.
// A three.js toy keeps UnrealBloomPass; it can still use the orbs.
// Paste GLOW into a fragment shader. It declares no uniforms.
//
// Orbs, in any pass that knows where the lights are on the frame:
//   col += lightCol * gwOrb(uv, at, asp, size) * gain;
//   col = gwRoll(col);                    // once, after the last orb
// uv and at are 0 to 1 on the frame. asp is width over height. size 1 is a wide orb.
//
// Bloom, in a raw WebGL2 toy:
//   const bloom = bloomChain(gl);         // once
//   const tex = bloom.render(sceneTex, w, h, { threshold: 0.8 });   // each frame
//   then add texture(tBloom, uv).rgb * strength in the last pass.
// render() leaves its own program, framebuffer, viewport and texture units 0 and 1 bound.
// It turns blending off and binds no vertex array. Set yours again after it.
// Sources: Lichtenberg and Dijkstra (the chain), the night-scene kit (orbs).

export const GLOW = /* glsl */`
// A 13-tap downsample: it halves a frame with no flicker and no squares.
vec3 gwDown(sampler2D t, vec2 uv, vec2 texel) {
  vec3 a = texture(t, uv + vec2(-2.0, 2.0) * texel).rgb, b = texture(t, uv + vec2(0.0, 2.0) * texel).rgb, c = texture(t, uv + vec2(2.0, 2.0) * texel).rgb;
  vec3 d = texture(t, uv + vec2(-2.0, 0.0) * texel).rgb, e = texture(t, uv).rgb, f = texture(t, uv + vec2(2.0, 0.0) * texel).rgb;
  vec3 g = texture(t, uv + vec2(-2.0, -2.0) * texel).rgb, h = texture(t, uv + vec2(0.0, -2.0) * texel).rgb, i = texture(t, uv + vec2(2.0, -2.0) * texel).rgb;
  vec3 j = texture(t, uv + vec2(-1.0, 1.0) * texel).rgb, k = texture(t, uv + vec2(1.0, 1.0) * texel).rgb;
  vec3 l = texture(t, uv + vec2(-1.0, -1.0) * texel).rgb, m = texture(t, uv + vec2(1.0, -1.0) * texel).rgb;
  return e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
}
// Keeps the light above thr. cap stops a dense flash from blowing the bloom out.
vec3 gwBright(vec3 s, float thr, float cap) {
  s = min(s, vec3(cap));
  float br = max(s.r, max(s.g, s.b));
  return s * max(br - thr, 0.0) / max(br, 1e-4);
}
// A 9-tap tent upsample: it doubles a level and stays round.
vec3 gwUp(sampler2D t, vec2 uv, vec2 texel) {
  vec3 s = texture(t, uv).rgb * 4.0;
  s += (texture(t, uv + vec2(-1.0, 0.0) * texel).rgb + texture(t, uv + vec2(1.0, 0.0) * texel).rgb + texture(t, uv + vec2(0.0, -1.0) * texel).rgb + texture(t, uv + vec2(0.0, 1.0) * texel).rgb) * 2.0;
  s += texture(t, uv + vec2(-1.0, -1.0) * texel).rgb + texture(t, uv + vec2(1.0, -1.0) * texel).rgb + texture(t, uv + vec2(-1.0, 1.0) * texel).rgb + texture(t, uv + vec2(1.0, 1.0) * texel).rgb;
  return s / 16.0;
}
// An orb: a tight core and a wide skirt round a light, squashed sideways.
float gwOrb(vec2 uv, vec2 at, float asp, float size) {
  vec2 d = uv - at;
  float r = length(vec2(d.x * asp * 0.6, d.y));
  return exp(-r * 40.0 / size) + 0.35 * exp(-r * 9.0 / size);
}
// A soft roll-off above 2 keeps bloom free of square tiles.
vec3 gwRoll(vec3 c) {
  float m = max(max(c.r, c.g), c.b);
  return c * (m > 2.0 ? (2.0 + log(m - 1.0)) / m : 1.0);
}
`;

// The bloom budget at a detail level (shared/detail.js): 0 low, 1 standard, 2 high.
export const glowDetail = level => ({ levels: level > 0 ? 5 : 3 });

const VS = `#version 300 es
out vec2 vUv;
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
${GLOW}`;
const DOWN = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uTex;
uniform float uThr, uCap;
void main() {
  vec3 s = gwDown(uSrc, vUv, uTex);
  o = vec4(uThr > 0.0 ? gwBright(s, uThr, uCap) : s, 1.0);
}`;
const UP = `${HEAD}
uniform sampler2D uSrc, uAdd;
uniform vec2 uTex;
void main() { o = vec4(gwUp(uSrc, vUv, uTex) + texture(uAdd, vUv).rgb, 1.0); }`;

// A bloom chain for a raw WebGL2 context: halves down, then tents back up.
// max is the most levels it can run; render() may ask for fewer.
export function bloomChain(gl, { max = 5 } = {}) {
  const hdr = !!gl.getExtension('EXT_color_buffer_float');
  const program = fs => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    const u = {};
    for (const n of ['uSrc', 'uAdd', 'uTex', 'uThr', 'uCap']) u[n] = gl.getUniformLocation(p, n);
    return { p, u };
  };
  const down = program(DOWN), up = program(UP);
  const target = () => {
    const tex = gl.createTexture(), fb = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w: 0, h: 0 };
  };
  const size = (t, w, h) => {
    if (t.w === w && t.h === h) return;
    t.w = w; t.h = h;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  };
  const mips = Array.from({ length: max }, target), ups = Array.from({ length: max - 1 }, target);
  const draw = t => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.viewport(0, 0, t.w, t.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  return {
    // Runs the chain on a w x h source texture. Returns the bloom texture, at half size.
    render(src, w, h, { threshold = 0.8, cap = 6, levels = max } = {}) {
      const n = Math.max(2, Math.min(max, levels)), sw = w, sh = h;
      for (let i = 0; i < n; i++) {
        w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
        size(mips[i], w, h);
        if (i < n - 1) size(ups[i], w, h);
      }
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.useProgram(down.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(down.u.uSrc, 0);
      gl.uniform1f(down.u.uCap, cap);
      let from = { tex: src, w: sw, h: sh };
      for (let i = 0; i < n; i++) {
        gl.bindTexture(gl.TEXTURE_2D, from.tex);
        gl.uniform2f(down.u.uTex, 1 / from.w, 1 / from.h);
        // Only the first step takes the threshold.
        gl.uniform1f(down.u.uThr, i === 0 ? threshold : 0);
        draw(mips[i]);
        from = mips[i];
      }
      gl.useProgram(up.p);
      gl.uniform1i(up.u.uSrc, 0);
      gl.uniform1i(up.u.uAdd, 1);
      for (let i = n - 2; i >= 0; i--) {
        const s = i === n - 2 ? mips[i + 1] : ups[i + 1];
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, mips[i].tex);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, s.tex);
        gl.uniform2f(up.u.uTex, 1 / s.w, 1 / s.h);
        draw(ups[i]);
      }
      return ups[0].tex;
    },
    dispose() {
      for (const t of [...mips, ...ups]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
      gl.deleteProgram(down.p);
      gl.deleteProgram(up.p);
    },
  };
}
