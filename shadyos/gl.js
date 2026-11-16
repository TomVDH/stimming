// ShadyOS renderer: raw WebGL2 passes over canvas 2D faces.
// The desktop, the smear plate, the frost, window meshes, sprites and the old screen.
import { program, uniforms } from '../shared/gl.js';

const QUAD_VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
const COPY_FS = `#version 300 es
precision highp float; uniform sampler2D uSrc; uniform float uFlip; in vec2 vUv; out vec4 o;
void main() { o = texture(uSrc, vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uFlip))); }`;
// Separable Gaussian, nine taps.
const BLUR_FS = `#version 300 es
precision highp float; uniform sampler2D uSrc; uniform vec2 uDir; in vec2 vUv; out vec4 o;
void main() {
  float w[5] = float[](0.227, 0.1945, 0.1216, 0.054, 0.0162);
  vec4 c = texture(uSrc, vUv) * w[0];
  for (int i = 1; i < 5; i++) { c += (texture(uSrc, vUv + uDir * float(i)) + texture(uSrc, vUv - uDir * float(i))) * w[i]; }
  o = c;
}`;
const FADE_FS = `#version 300 es
precision highp float; uniform float uA; out vec4 o; void main() { o = vec4(0.0, 0.0, 0.0, uA); }`;
// Mesh positions are CSS pixels, y down.
const WIN_VS = `#version 300 es
in vec2 aPos; in vec2 aUv; uniform vec2 uRes, uShift; out vec2 vUv;
void main() { vUv = aUv; vec2 p = (aPos + uShift) / uRes * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0); }`;
const WIN_FS = `#version 300 es
precision highp float;
uniform sampler2D uFace, uBlur; uniform vec2 uSize, uFb; uniform float uR, uAlpha, uWhite; uniform vec4 uTint;
in vec2 vUv; out vec4 o;
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = vUv * uSize;
  float d = sdBox(p - uSize * 0.5, uSize * 0.5, uR);
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  // The frost is whatever lies behind, blurred, lifted and tinted.
  vec3 fr = texture(uBlur, gl_FragCoord.xy / uFb).rgb;
  float l = dot(fr, vec3(0.299, 0.587, 0.114));
  fr = mix(vec3(l), fr, 1.5) * 1.1 + 0.03;
  vec3 base = mix(fr, uTint.rgb, uTint.a);
  vec4 f = texture(uFace, vUv);
  vec3 c = base * (1.0 - f.a) + f.rgb;
  // A frozen window fogs over white.
  c = mix(c, vec3(0.93), uWhite * 0.55);
  float a = inside * uAlpha;
  o = vec4(c * a, a);
}`;
// The shadow grows out of the mesh, so it bends with a jelly window.
const SHADOW_VS = `#version 300 es
in vec2 aPos; in vec2 aUv; uniform vec2 uRes, uOff; uniform float uM; out vec2 vUv;
void main() { vUv = aUv; vec2 p = (aPos + (aUv * 2.0 - 1.0) * uM + uOff) / uRes * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0); }`;
const SHADOW_FS = `#version 300 es
precision highp float;
uniform vec2 uSize; uniform float uM, uK, uR; in vec2 vUv; out vec4 o;
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = mix(vec2(-uM), uSize + uM, vUv);
  float d = sdBox(p - uSize * 0.5, uSize * 0.5, uR);
  // A wide soft drop plus a tight contact line.
  float a = exp(-max(d, 0.0) / (13.0 * uK)) * 0.5 + exp(-max(d + 2.0, 0.0) / 3.0) * 0.3;
  a *= 1.0 - smoothstep(uM * 0.7, uM, d);
  o = vec4(0.0, 0.0, 0.0, a * min(uK, 1.0));
}`;
// A textured rect in CSS pixels, with a turn and a fade.
const SPRITE_VS = `#version 300 es
in vec2 aPos; uniform vec4 uRect; uniform vec2 uRes; uniform float uRot; out vec2 vUv;
void main() {
  vUv = vec2(aPos.x, -aPos.y) * 0.5 + 0.5;
  vec2 q = (vUv - 0.5) * uRect.zw, cs = vec2(cos(uRot), sin(uRot));
  q = vec2(q.x * cs.x - q.y * cs.y, q.x * cs.y + q.y * cs.x);
  vec2 p = (uRect.xy + uRect.zw * 0.5 + q) / uRes * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
}`;
const SPRITE_FS = `#version 300 es
precision highp float; uniform sampler2D uSrc; uniform float uAlpha; in vec2 vUv; out vec4 o; void main() { o = texture(uSrc, vUv) * uAlpha; }`;
// Glitter: one point per spark, a four-ray star.
const GLIT_VS = `#version 300 es
in vec2 aPos; in float aSize; in vec4 aCol; uniform vec2 uRes; uniform float uDpr; out vec4 vCol;
void main() { vCol = aCol; vec2 p = aPos / uRes * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0); gl_PointSize = aSize * uDpr; }`;
const GLIT_FS = `#version 300 es
precision highp float; in vec4 vCol; out vec4 o;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0, a = abs(p);
  float rays = exp(-a.x * 9.0) * exp(-a.y * 2.4) + exp(-a.y * 9.0) * exp(-a.x * 2.4);
  float core = exp(-dot(p, p) * 12.0);
  float k = clamp(rays * 0.9 + core, 0.0, 1.0) * (1.0 - smoothstep(0.8, 1.0, max(a.x, a.y)));
  o = vec4(mix(vCol.rgb, vec3(1.0), core * 0.7), 1.0) * k * vCol.a;
}`;
// The aged screen: warp, warm cast, bleed, burn, grain, dust.
const POST_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uFb, uShake; uniform float uAge, uTime, uDpr, uDim, uSafe; in vec2 vUv; out vec4 o;
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec2 q = (vUv + uShake) * 2.0 - 1.0;
  q *= 1.0 + uAge * 0.018 * dot(q, q);
  vec2 uv = q * 0.5 + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  // Safe mode: big pixels and few colours.
  vec2 cell = uFb / (4.0 * uDpr);
  uv = mix(uv, (floor(uv * cell) + 0.5) / cell, uSafe);
  vec3 c = texture(uSrc, uv).rgb;
  c = mix(c, floor(c * 3.0 + 0.5) / 3.0, uSafe);
  // Old backlight: warm, uneven, a little dim.
  c = mix(c, c * vec3(1.07, 0.98, 0.84) + vec3(0.012, 0.008, 0.0), uAge);
  float bleed = exp(-length((uv - vec2(0.02, 0.05)) * vec2(1.2, 2.0)) * 4.0) * 0.12 + exp(-length((uv - vec2(0.98, 0.96)) * vec2(1.6, 2.2)) * 5.0) * 0.08
    + exp(-length((uv - vec2(0.5, -0.02)) * vec2(1.0, 4.0)) * 4.0) * 0.06;
  c += vec3(0.85, 0.8, 0.66) * bleed * uAge;
  // Faint violet in the far dark corner.
  float vio = exp(-length((uv - vec2(0.88, 0.85)) * vec2(1.5, 1.8)) * 3.0);
  c = mix(c, c * vec3(0.86, 0.78, 1.04), vio * 0.5 * uAge);
  vec2 px = gl_FragCoord.xy;
  c *= 1.0 - 0.03 * uAge * step(0.66, fract(px.y / (3.0 * uDpr)));
  c += (hash(px + fract(uTime) * 97.0) - 0.5) * (0.025 + 0.035 * uAge);
  float dust = step(0.9993, hash(floor(uv * uFb / (1.5 * uDpr))));
  c += dust * 0.05 * uAge;
  float v = smoothstep(1.35, 0.35, length(q * vec2(0.92, 1.05)));
  c *= mix(1.0, v, 0.5 + 0.3 * uAge);
  // Standby dims the backlight; the stuck pixel stays lit.
  c *= uDim;
  vec2 sp = floor(vec2(0.71, 0.63) * uFb);
  if (all(equal(floor(px), sp))) c = vec3(0.3, 1.0, 0.35);
  o = vec4(c, 1.0);
}`;

// Window grid: NX by NY vertices.
export const NX = 16, NY = 12, NV = NX * NY;
export const UVS = new Float32Array(NV * 2);
for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { UVS[(j * NX + i) * 2] = i / (NX - 1); UVS[(j * NX + i) * 2 + 1] = j / (NY - 1); }
// A flat rect for a panel.
export function flat(pos, x, y, w, h) {
  for (let k = 0; k < NV; k++) { pos[k * 2] = x + UVS[k * 2] * w; pos[k * 2 + 1] = y + UVS[k * 2 + 1] * h; }
  return pos;
}

export function createRenderer(gl) {
  function make(vs, fs, attrs) {
    const q = program(gl, vs, fs, attrs);
    if (!gl.getProgramParameter(q.p, gl.LINK_STATUS)) throw new Error(gl.getShaderInfoLog(q.f) || gl.getShaderInfoLog(q.v) || gl.getProgramInfoLog(q.p));
    return uniforms(gl, q);
  }
  const Q = ['aPos'], M = ['aPos', 'aUv'];
  const P = {
    copy: make(QUAD_VS, COPY_FS, Q), blur: make(QUAD_VS, BLUR_FS, Q), fade: make(QUAD_VS, FADE_FS, Q), post: make(QUAD_VS, POST_FS, Q),
    win: make(WIN_VS, WIN_FS, M), shadow: make(SHADOW_VS, SHADOW_FS, M),
    sprite: make(SPRITE_VS, SPRITE_FS, Q), glit: make(GLIT_VS, GLIT_FS, ['aPos', 'aSize', 'aCol']),
  };
  const quad = gl.createVertexArray(); gl.bindVertexArray(quad);
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const idx = [];
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i; idx.push(a, a + 1, a + NX, a + 1, a + NX + 1, a + NX); }
  const wvao = gl.createVertexArray(); gl.bindVertexArray(wvao);
  const posBuf = gl.createBuffer(), uvBuf = gl.createBuffer(), idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, NV * 8, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, UVS, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  // Glitter buffer: x, y, size, then premultiplied rgba per spark.
  const GMAX = 260, gdata = new Float32Array(GMAX * 7);
  const gvao = gl.createVertexArray(); gl.bindVertexArray(gvao);
  const gbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, gbuf); gl.bufferData(gl.ARRAY_BUFFER, gdata.byteLength, gl.DYNAMIC_DRAW);
  [[0, 2, 0], [1, 1, 8], [2, 4, 12]].forEach(([l, k, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, 28, o); });
  gl.bindVertexArray(null);

  function tex(w = 1, h = 1) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  }
  // Canvas faces upload premultiplied, to match the blend.
  function upload(t, src) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    return t;
  }
  function target(w, h) { const t = tex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; }
  function freeT(rt) { if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); } }
  function bindT(rt) { gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.f : null); gl.viewport(0, 0, rt ? rt.w : gl.canvas.width, rt ? rt.h : gl.canvas.height); }
  function fsq(pr) { gl.useProgram(pr.p); gl.bindVertexArray(quad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  const premul = () => { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); };

  const R = {
    P, tex, upload, target, free: freeT, bindT, fsq, premul,
    /** @type {{ W: number, H: number, FW: number, FH: number, dpr: number }} */
    size: { W: 1, H: 1, FW: 1, FH: 1, dpr: 1 },
    blurTex: null,
    copy(t, flip = 0) { gl.useProgram(P.copy.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(P.copy.u.uSrc, 0); gl.uniform1f(P.copy.u.uFlip, flip); fsq(P.copy); },
    fade(a) { gl.useProgram(P.fade.p); gl.uniform1f(P.fade.u.uA, a); fsq(P.fade); },
    // Quarter size, two Gaussian rounds; b2 ends with the frost.
    blur(src, b1, b2) {
      gl.disable(gl.BLEND);
      bindT(b1); R.copy(src.t);
      for (let it = 0; it < 2; it++) {
        bindT(b2); gl.useProgram(P.blur.p); gl.bindTexture(gl.TEXTURE_2D, b1.t); gl.uniform2f(P.blur.u.uDir, 1.6 / b1.w, 0); fsq(P.blur);
        bindT(b1); gl.bindTexture(gl.TEXTURE_2D, b2.t); gl.uniform2f(P.blur.u.uDir, 0, 1.6 / b1.h); fsq(P.blur);
      }
      bindT(b2); R.copy(b1.t);
      R.blurTex = b2.t;
    },
    // Draw a mesh: a window, a panel or a smear stamp.
    mesh(o, shiftX = 0, shiftY = 0, alpha = o.alpha ?? 1) {
      const { W, H, FW, FH } = R.size;
      gl.useProgram(P.win.p); gl.bindVertexArray(wvao);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, o.pos);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.blurTex);
      const u = P.win.u;
      gl.uniform1i(u.uFace, 0); gl.uniform1i(u.uBlur, 1);
      gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uShift, shiftX, shiftY); gl.uniform2f(u.uSize, o.w, o.h); gl.uniform2f(u.uFb, FW, FH);
      gl.uniform1f(u.uR, o.r ?? 9); gl.uniform1f(u.uAlpha, alpha); gl.uniform1f(u.uWhite, o.white || 0);
      gl.uniform4fv(u.uTint, o.tint);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      gl.activeTexture(gl.TEXTURE0);
    },
    shadow(o, k) {
      const { W, H } = R.size, m = 40;
      gl.useProgram(P.shadow.p); gl.bindVertexArray(wvao);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, o.pos);
      const u = P.shadow.u;
      gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uOff, 0, 13 * k); gl.uniform1f(u.uM, m); gl.uniform2f(u.uSize, o.w, o.h);
      gl.uniform1f(u.uK, k); gl.uniform1f(u.uR, (o.r ?? 9) + 1);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    },
    sprite(t, x, y, w, h, alpha = 1, rot = 0) {
      const { W, H } = R.size;
      gl.useProgram(P.sprite.p); gl.bindVertexArray(quad);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
      const u = P.sprite.u;
      gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uRes, W, H); gl.uniform4f(u.uRect, x, y, w, h); gl.uniform1f(u.uAlpha, alpha); gl.uniform1f(u.uRot, rot);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    glitter(sparks, colours) {
      if (!sparks.length) return;
      const n = Math.min(GMAX, sparks.length);
      for (let i = 0; i < n; i++) {
        const p = sparks[i], a = Math.pow(p.life, 1.4) * (0.65 + 0.35 * Math.sin(p.life * 40 + p.ph)), c = colours[p.c], o = i * 7;
        gdata[o] = p.x; gdata[o + 1] = p.y; gdata[o + 2] = p.s;
        gdata[o + 3] = c[0] * a; gdata[o + 4] = c[1] * a; gdata[o + 5] = c[2] * a; gdata[o + 6] = a;
      }
      gl.useProgram(P.glit.p); gl.bindVertexArray(gvao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gbuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, gdata, 0, n * 7);
      gl.uniform2f(P.glit.u.uRes, R.size.W, R.size.H); gl.uniform1f(P.glit.u.uDpr, R.size.dpr);
      gl.drawArrays(gl.POINTS, 0, n);
    },
    post(src, { age, time, dim, safe, shake }) {
      const { FW, FH, dpr } = R.size;
      gl.disable(gl.BLEND); bindT(null);
      gl.useProgram(P.post.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t);
      const u = P.post.u;
      gl.uniform1i(u.uSrc, 0); gl.uniform2f(u.uFb, FW, FH); gl.uniform1f(u.uAge, age); gl.uniform1f(u.uTime, time); gl.uniform1f(u.uDpr, dpr);
      gl.uniform1f(u.uDim, dim); gl.uniform1f(u.uSafe, safe); gl.uniform2f(u.uShake, shake[0], shake[1]);
      fsq(P.post);
    },
  };
  return R;
}
