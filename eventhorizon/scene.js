// Event horizon renderer: raw WebGL2.
// Passes: sky cube (once), stream splat, geodesic trace, bloom, grade.
// Units: one Schwarzschild radius.
// The hole sits at the origin; the disc lies in y = 0.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { GRADE } from '../shared/grade.js';

const HEAD = `#version 300 es
precision highp float;
`;
// The disc runs from the ISCO to ROUT.
// The emission map spans EM each way.
export const RIN = 3, ROUT = 14, EM = 26;
const SKY_N = 256, MAP_N = 1024, NOISE_N = 256;
// The sky cube holds light up to SKYMAX; sRGB keeps the faint band smooth.
const SKYMAX = 1;

// A hash of an integer cell: four values from 0 to 1.
const H4 = `
vec4 h4(vec3 p) {
  uvec3 q = uvec3(ivec3(p) + 32768);
  uint n = q.x * 1597334677u ^ q.y * 3812015801u ^ q.z * 2741598577u;
  uvec4 m = uvec4(n, n * 16807u, n * 48271u, n * 69621u);
  m ^= m >> 15u; m *= 2246822519u; m ^= m >> 13u; m *= 3266489917u; m ^= m >> 16u;
  return vec4(m) / 4294967295.0;
}`;

// A blackbody colour in linear RGB, from a temperature in kelvin.
// A fit to the Planck locus; each pow base stays positive.
const BB = `
vec3 bb(float T) {
  float t = clamp(T, 900.0, 40000.0) / 100.0;
  vec3 c;
  c.r = t <= 66.0 ? 1.0 : clamp(1.292936 * pow(t - 60.0, -0.1332048), 0.0, 1.0);
  c.g = t <= 66.0 ? clamp(0.3900816 * log(t) - 0.6318414, 0.0, 1.0) : clamp(1.1298909 * pow(t - 60.0, -0.0755148), 0.0, 1.0);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.5432068 * log(t - 10.0) - 1.1962541, 0.0, 1.0));
  return pow(c, vec3(2.2));
}`;

/* ---------- sky: stars and the band of the galaxy, into a cube ---------- */
const SKY = `${HEAD}
uniform int uFace;
in vec2 vUv;
out vec4 o;
${BB}
${H4}
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h4(i).x, b = h4(i + vec3(1, 0, 0)).x, c = h4(i + vec3(0, 1, 0)).x, d = h4(i + vec3(1, 1, 0)).x;
  float e = h4(i + vec3(0, 0, 1)).x, g = h4(i + vec3(1, 0, 1)).x, h = h4(i + vec3(0, 1, 1)).x, k = h4(i + vec3(1, 1, 1)).x;
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
vec3 faceDir(vec2 s) {
  if (uFace == 0) return vec3(1.0, -s.y, -s.x);
  if (uFace == 1) return vec3(-1.0, -s.y, s.x);
  if (uFace == 2) return vec3(s.x, 1.0, s.y);
  if (uFace == 3) return vec3(s.x, -1.0, -s.y);
  if (uFace == 4) return vec3(s.x, -s.y, 1.0);
  return vec3(-s.x, -s.y, -1.0);
}
void main() {
  vec3 d = normalize(faceDir(vUv * 2.0 - 1.0));
  // The galaxy band: a great circle, a brighter core, dust lanes on its line.
  vec3 gn = normalize(vec3(0.32, 0.88, -0.36));
  vec3 gc = normalize(vec3(-0.7, 0.12, -0.7));
  float lat = dot(d, gn);
  float band = exp(-lat * lat / 0.028);
  float core = exp(-(1.0 - dot(d, gc)) * 2.6);
  float cl = fbm(d * 5.0);
  float dust = smoothstep(0.42, 0.7, fbm(d * 9.0 + 3.0)) * exp(-lat * lat / 0.004);
  vec3 c = mix(vec3(0.62, 0.7, 1.0), vec3(1.0, 0.8, 0.58), core) * band * (0.25 + 1.4 * core) * smoothstep(0.25, 0.75, cl) * (1.0 - 0.8 * dust) * 0.035;
  o = vec4(min(c / ${SKYMAX}.0, vec3(1.0)), 1.0);
}`;

/* ---------- splat: stream particles into the disc-plane map ---------- */
const SPLAT_VS = `#version 300 es
precision highp float;
in vec4 aP;
uniform float uPs;
out vec2 vI;
void main() {
  gl_Position = vec4(aP.x / ${EM}.0, aP.y / ${EM}.0, 0.0, 1.0);
  gl_PointSize = uPs;
  vI = aP.zw;
}`;
const SPLAT_FS = `${HEAD}
in vec2 vI;
out vec4 o;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float k = exp(-dot(d, d) * 14.0);
  // r: light, g: light times temperature in kK, b: cover.
  o = vec4(vI.x * k, vI.x * vI.y * k, k * 0.32, 0.0);
}`;

/* ---------- trace: one light ray per pixel, backward from the eye ---------- */
const TRACE = `${HEAD}
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform vec3 uLens;
uniform samplerCube uSky;
uniform sampler2D uNoise, uEmit;
uniform float uTime, uEmitOn, uFlare, uDiscK;
// The intact star: xyz and radius; its stretch axis and stretch factor.
uniform vec4 uStar, uStarD;
uniform vec3 uStarC;
// A uniform zero keeps D3D from unrolling the march.
uniform int uZero;
in vec2 vUv;
out vec4 o;
const float RIN = ${RIN}.0, ROUT = ${ROUT}.0, EM = ${EM}.0, REXIT = 44.0, TAU = 6.2831853;
${BB}
${H4}
// Point stars from a direction; one chance per cell of a grid.
// fw is the sky angle one pixel spans: wide pixels spread a star, flux kept.
vec3 stars(vec3 d, float fw) {
  vec3 g = d * 96.0;
  vec3 c0 = floor(g - 0.5);
  vec3 acc = vec3(0.0);
  float s0 = 0.0005, s = max(s0, fw * 0.55), k0 = s0 * s0 / (s * s);
  for (int i = 0; i < 8; i++) {
    vec3 cc = c0 + vec3(float(i & 1), float((i >> 1) & 1), float((i >> 2) & 1));
    vec4 h = h4(cc);
    if (h.w > 0.2) continue;
    vec3 sp = normalize(cc + h.xyz);
    vec3 q = d - sp;
    vec4 k = h4(cc + 911.0);
    // Most stars are faint; a few are bright.
    float br = 0.01 + 0.09 * pow(k.y, 3.0) + 2.6 * pow(k.x, 40.0);
    acc += bb(mix(3300.0, 12000.0, pow(k.z, 1.5))) * br * k0 * exp(-dot(q, q) / (2.0 * s * s));
  }
  return acc;
}
// Gas light at a disc crossing: rgb light, a its cover.
// p: the crossing; v: the ray's backward direction; n: the crossing count.
vec4 disc(vec3 p, vec3 v, float n) {
  float r = length(p.xz);
  float phi = atan(p.z, p.x);
  // Kepler: the inner gas turns faster; streaks shear and reset unseen.
  float om = sqrt(0.5 / (r * r * r));
  float x = uTime * om / 1.5708;
  float fa = fract(x), fb = fract(x + 0.5);
  float wa = 1.0 - abs(2.0 * fa - 1.0);
  float lod = 0.6 * n;
  vec2 ua = vec2((phi - 1.5708 * fa) / TAU + 0.37 * floor(x), log(r) * 1.1);
  vec2 ub = vec2((phi - 1.5708 * fb) / TAU + 0.37 * floor(x + 0.5) + 0.5, log(r) * 1.1 + 0.31);
  vec2 na = textureLod(uNoise, ua, lod).rg, nb = textureLod(uNoise, ub, lod).rg;
  vec2 ns = na * wa + nb * (1.0 - wa);
  float tur = ns.r * 0.6 + textureLod(uNoise, ua * vec2(2.0, 1.4) + vec2(0.0, 0.13), lod).g * 0.4 * wa
            + textureLod(uNoise, ub * vec2(2.0, 1.4) + vec2(0.0, 0.13), lod).g * 0.4 * (1.0 - wa);
  float dens = mix(0.45, 1.4, smoothstep(0.2, 0.8, tur));
  // Temperature after Novikov and Thorne, softened at the ISCO.
  float q = RIN / r;
  float f = pow(q, 0.75) * pow(max(1.0 - 0.94 * sqrt(q), 0.0), 0.25) / 0.52;
  float flare = uFlare * exp(-r / 6.0);
  float T = 6400.0 * pow(f, 1.5) * (1.0 + 0.45 * flare);
  float I = pow(f, 3.2) * dens * uDiscK * (1.0 + 5.0 * flare);
  float a = smoothstep(ROUT, ROUT - 5.0, r) * smoothstep(RIN - 0.35, RIN + 0.25, r) * clamp(0.5 + 0.55 * dens, 0.0, 0.97);
  // The torn star's gas: a thin hot slab, so light grows with the path through it.
  if (uEmitOn > 0.5 && r < EM) {
    float sl = min(0.3 / max(abs(v.y), 0.04), 3.0);
    vec2 w = normalize(v.xz + 1e-5) * min(sl, 1.2) * 0.12 / (2.0 * EM);
    vec2 m = p.xz / (2.0 * EM) + 0.5;
    vec4 e = textureLod(uEmit, m, 0.0) * 0.3;
    e += (textureLod(uEmit, m + w, 0.0) + textureLod(uEmit, m - w, 0.0)) * 0.22;
    e += (textureLod(uEmit, m + 2.0 * w, 0.0) + textureLod(uEmit, m - 2.0 * w, 0.0)) * 0.13;
    e.rgb *= vec3(sl, sl, min(sl, 1.5));
    float Ie = e.r * (1.0 + 0.5 * flare);
    T = (I * T + e.g * 1000.0) / max(I + e.r, 1e-5);
    I += Ie;
    a = 1.0 - (1.0 - a) * exp(-e.b);
  }
  // The gas moves on circles; its speed seen by a static observer.
  float beta = sqrt(0.5 / max(r - 1.0, 0.2));
  vec3 ph = vec3(-p.z, 0.0, p.x) / r;
  float g = sqrt(max(1.0 - 1.0 / r, 0.0)) * sqrt(max(1.0 - beta * beta, 0.0)) / (1.0 + beta * dot(ph, v));
  vec3 c = bb(T * g) * I * g * g * g * g;
  return vec4(c, a);
}
void main() {
  vec2 s = vUv * 2.0 - 1.0;
  s.y -= uLens.z;
  vec3 v = normalize(uCamRot * vec3(s.x * uLens.x, s.y * uLens.y, -1.0));
  vec3 x = uCamPos;
  vec3 hv = cross(x, v);
  float h2 = dot(hv, hv);
  vec3 col = vec3(0.0);
  float tr = 1.0, gone = 0.0, n = 0.0;
  for (int i = uZero; i < 300; i++) {
    float r = length(x);
    if (r < 1.0) { gone = 1.0; break; }
    if (r > REXIT && dot(x, v) > 0.0) break;
    // Small steps near the photon sphere; long ones far out.
    float dt = clamp(0.045 * r * r, 0.025, min(0.3 * r, 2.4));
    vec3 x0 = x, v0 = v;
    // RK4 on x'' = -1.5 h^2 x / r^5: the Schwarzschild bend of light.
    vec3 k1 = v, a1 = -1.5 * h2 * x / pow(dot(x, x), 2.5);
    vec3 xb = x + 0.5 * dt * k1;
    vec3 k2 = v + 0.5 * dt * a1, a2 = -1.5 * h2 * xb / pow(dot(xb, xb), 2.5);
    vec3 xc = x + 0.5 * dt * k2;
    vec3 k3 = v + 0.5 * dt * a2, a3 = -1.5 * h2 * xc / pow(dot(xc, xc), 2.5);
    vec3 xd = x + dt * k3;
    vec3 k4 = v + dt * a3, a4 = -1.5 * h2 * xd / pow(dot(xd, xd), 2.5);
    x += dt / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
    v += dt / 6.0 * (a1 + 2.0 * a2 + 2.0 * a3 + a4);
    // The star: the nearest point of this step to a stretched sphere.
    if (uStar.w > 0.0) {
      vec3 q0 = x0 - uStar.xyz, q1 = x - uStar.xyz;
      q0 += (1.0 / uStarD.w - 1.0) * dot(q0, uStarD.xyz) * uStarD.xyz;
      q1 += (1.0 / uStarD.w - 1.0) * dot(q1, uStarD.xyz) * uStarD.xyz;
      vec3 e = q1 - q0;
      float t = clamp(-dot(q0, e) / max(dot(e, e), 1e-9), 0.0, 1.0);
      float dd = length(q0 + e * t) / uStar.w;
      col += tr * uStarC * 0.05 * exp(-dd * dd * 0.5);
      if (dd < 1.0) { col += tr * uStarC * (1.0 - 0.55 * dd * dd); tr = 0.0; break; }
    }
    // The disc: shade where this step crosses the plane.
    if (x0.y * x.y < 0.0) {
      float t = x0.y / (x0.y - x.y);
      vec3 p = mix(x0, x, t);
      float rp = length(p.xz);
      if (rp > RIN - 0.4 && (rp < ROUT || (uEmitOn > 0.5 && rp < EM))) {
        vec4 dc = disc(p, normalize(mix(v0, v, t)), n);
        col += tr * dc.rgb * dc.a;
        tr *= 1.0 - dc.a;
        n += 1.0;
        if (tr < 0.01) break;
      }
    }
  }
  // Past the exit sphere: the weak-field rest of the bend, then the sky.
  vec3 vn = normalize(v);
  float b = sqrt(h2);
  float cosT = dot(normalize(x), vn);
  float al = (1.0 - cosT) / max(b, 1e-3);
  vec3 perp = x - dot(x, vn) * vn;
  vec3 dir = normalize(vn * cos(al) - normalize(perp + 1e-6) * sin(al));
  float fw = length(fwidth(dir));
  vec3 sky = texture(uSky, dir).rgb * ${SKYMAX}.0 + stars(dir, fw);
  col += tr * (1.0 - gone) * sky;
  o = vec4(col, 1.0);
}`;

/* ---------- grade: bloom, tone, vignette, grain ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK, uExp;
uniform vec2 uRes;
in vec2 vUv;
out vec4 o;
${GRADE}
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c = film(c * uExp);
  c *= gdVignette(vUv, uRes.x / uRes.y, 0.5, 0.3);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (gdHash(gl_FragCoord.xy + vec2(uFrame * 37.0, uFrame * 91.0)) - 0.5) * 0.014;
  o = vec4(c, 1.0);
}`;

// A tileable noise: value noise on a lattice that wraps, five octaves, two channels.
function noiseData(n) {
  const out = new Uint8Array(n * n * 2);
  for (let ch = 0; ch < 2; ch++) {
    const acc = new Float32Array(n * n);
    let amp = 1, sum = 0;
    for (let o = 0; o < 5; o++) {
      const g = 4 << o;
      const lat = new Float32Array(g * g).map(() => Math.random());
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const fx = (x / n) * g, fy = (y / n) * g;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        let tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        const L = (a, b) => lat[((b % g) * g) + (a % g)];
        const v = (L(ix, iy) * (1 - tx) + L(ix + 1, iy) * tx) * (1 - ty) + (L(ix, iy + 1) * (1 - tx) + L(ix + 1, iy + 1) * tx) * ty;
        acc[y * n + x] += v * amp;
      }
      sum += amp; amp *= 0.55;
    }
    for (let i = 0; i < n * n; i++) out[i * 2 + ch] = Math.round(Math.min(1, Math.max(0, (acc[i] / sum - 0.5) * 1.8 + 0.5)) * 255);
  }
  return out;
}

export async function makeScene(gl, { particles = 0 } = {}) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    sky: program(gl, TRI_VS, SKY),
    splat: program(gl, SPLAT_VS, SPLAT_FS, ['aP']),
    trace: program(gl, TRI_VS, TRACE),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });

  // The sky cube: drawn once, face by face, then mipmapped.
  const sky = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky);
  gl.texStorage2D(gl.TEXTURE_CUBE_MAP, Math.log2(SKY_N) + 1, gl.SRGB8_ALPHA8, SKY_N, SKY_N);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, SKY_N, SKY_N);
  gl.useProgram(P.sky.p);
  gl.bindVertexArray(empty);
  for (let f = 0; f < 6; f++) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, sky, 0);
    gl.uniform1i(P.sky.u.uFace, f);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

  // The disc's turbulence: a tileable two-channel noise.
  const noise = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noise);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, NOISE_N, NOISE_N, 0, gl.RG, gl.UNSIGNED_BYTE, noiseData(NOISE_N));
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  // The stream map and its particle buffer.
  const map = target(gl, MAP_N, MAP_N, { check: true, clear: true });
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, Math.max(1, particles) * 16, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  gl.bindVertexArray(null);

  let hdr = null, W = 0, H = 0, outW = 0, outH = 0;
  // w, h: the canvas. k scales the trace target under it.
  function resize(w, h, k = 1) {
    outW = Math.max(2, w); outH = Math.max(2, h);
    gl.canvas.width = outW; gl.canvas.height = outH;
    W = Math.max(2, Math.round(outW * k)); H = Math.max(2, Math.round(outH * k));
    free(gl, hdr);
    hdr = target(gl, W, H);
  }

  // Splats n packed particles into the map.
  function splat(buf, n) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, map.fb);
    gl.viewport(0, 0, MAP_N, MAP_N);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (n <= 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf, 0, n * 4);
    const s = P.splat;
    gl.useProgram(s.p);
    gl.uniform1f(s.u.uPs, 6);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  // Draws one frame to the screen from the view state v.
  function frame(v, { frameNo = 0, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    const emitOn = v.stream.n > 0;
    if (emitOn || v.stream.wasOn) splat(v.stream.buf, v.stream.n);
    gl.disable(gl.BLEND);
    const t = P.trace;
    gl.useProgram(t.p);
    gl.uniform3fv(t.u.uCamPos, v.cam.pos);
    gl.uniformMatrix3fv(t.u.uCamRot, false, v.cam.rot);
    gl.uniform3fv(t.u.uLens, v.cam.lens);
    gl.uniform1f(t.u.uTime, v.time);
    gl.uniform1f(t.u.uEmitOn, emitOn ? 1 : 0);
    gl.uniform1f(t.u.uFlare, v.flare);
    gl.uniform1f(t.u.uDiscK, v.discK);
    gl.uniform4fv(t.u.uStar, v.star);
    gl.uniform4fv(t.u.uStarD, v.starD);
    gl.uniform3fv(t.u.uStarC, v.starC);
    gl.uniform1i(t.u.uZero, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky);
    gl.uniform1i(t.u.uSky, 0);
    bind(gl, t, 'uNoise', 1, noise);
    bind(gl, t, 'uEmit', 2, map);
    tri(gl, hdr, empty);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.7, cap: 8, levels: bloomLevels });
    const fp = P.final;
    gl.useProgram(fp.p);
    bind(gl, fp, 'uHdr', 0, hdr);
    bind(gl, fp, 'uBloom', 1, bt);
    gl.uniform1f(fp.u.uBloomK, v.bloomK);
    gl.uniform1f(fp.u.uExp, v.exposure);
    gl.uniform1f(fp.u.uFrame, frameNo % 64);
    gl.uniform2f(fp.u.uRes, outW, outH);
    tri(gl, null, empty);
  }

  return { resize, frame };
}
