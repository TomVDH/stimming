// Chromatography view: the filter paper on dark slate, seen from above.
// One program: paper, dyes by Beer-Lambert, wet greying, sheen, water beads.
import { program, linked, TRI_VS } from '../shared/gl.js';
import { N, R_CELLS, MAX_BEADS } from './sim.js';
import { FIBRE } from './paper.js';

const VIEW_FS = `#version 300 es
precision highp float;
out vec4 o;
uniform highp sampler2D uA, uB, uH;
uniform sampler2D uMap;
uniform vec2 uRes, uC;
uniform float uRp, uDpr, uLin, uWin;
uniform vec4 uBead[${MAX_BEADS}];
uniform int uBeadN;
const float NN = ${N}.0;
const float RC = ${R_CELLS}.0;

// Key light from the upper left, raking at 35 degrees.
const vec3 L = vec3(-0.5, -0.56, 0.66);
// Linear absorbance per unit dye mass: violet, magenta, cyan, yellow.
const vec3 KV = vec3(0.85, 1.4, 0.42);
const vec3 KM = vec3(0.2, 1.3, 0.58);
const vec3 KC = vec3(1.6, 0.62, 0.16);
const vec3 KY = vec3(0.07, 0.34, 1.35);
const vec3 KI = vec3(0.22, 0.3, 0.55);

float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

// A smooth sample of a sim field. p is in cells.
vec4 fetchLin(highp sampler2D t, vec2 p) {
  vec2 q = p - 0.5, i = floor(q), f = q - i;
  ivec2 c = ivec2(i);
  ivec2 m = ivec2(NN - 1.0);
  vec4 a = texelFetch(t, clamp(c, ivec2(0), m), 0), b = texelFetch(t, clamp(c + ivec2(1, 0), ivec2(0), m), 0);
  vec4 d = texelFetch(t, clamp(c + ivec2(0, 1), ivec2(0), m), 0), e = texelFetch(t, clamp(c + ivec2(1, 1), ivec2(0), m), 0);
  return mix(mix(a, b, f.x), mix(d, e, f.x), f.y);
}
// A cubic B-spline from four bilinear reads, when float textures filter.
vec4 field(highp sampler2D t, vec2 p) {
  if (uLin < 0.5) return fetchLin(t, p);
  vec2 q = p - 0.5, i = floor(q), f = q - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 h0 = (i - 1.0 + w1 / g0 + 0.5) / NN, h1 = (i + 1.0 + w3 / g1 + 0.5) / NN;
  return g0.y * (g0.x * texture(t, h0) + g1.x * texture(t, vec2(h1.x, h0.y)))
       + g1.y * (g0.x * texture(t, vec2(h0.x, h1.y)) + g1.x * texture(t, h1));
}

// The window over the bench, seen in wet paper and in the beads.
// d is a reflected ray; soft widens the edge for a rough film.
float windowLight(vec3 d, float soft) {
  if (d.z <= 0.0) return 0.0;
  vec2 p = d.xy / d.z - vec2(-0.08, -0.07);
  vec2 hs = vec2(0.2, 0.15);
  vec2 e = abs(p) - hs;
  float box = 1.0 - smoothstep(-soft, soft, max(e.x, e.y));
  // Two glazing bars cross the window.
  float bars = 1.0 - 0.75 * (1.0 - smoothstep(0.0, 0.006 + soft * 0.3, abs(p.x))) * step(max(e.x, e.y), 0.0);
  bars *= 1.0 - 0.75 * (1.0 - smoothstep(0.0, 0.006 + soft * 0.3, abs(p.y))) * step(max(e.x, e.y), 0.0);
  return box * bars;
}

// The key light's pool on the bench, brightest at the upper left.
float pool(vec2 px) {
  vec2 d = (px - (uC + vec2(-0.55, -0.6) * uRp)) / (uRp * 2.6);
  return 0.42 + 0.78 * exp(-dot(d, d));
}

struct Paper { vec3 col; vec3 n; vec3 ns; float wet; float W; };

// The paper's colour and surface at a pixel, without the sheen.
Paper paperAt(vec2 px) {
  float half_ = uRp * NN * 0.5 / RC;
  vec2 q = (px - uC + half_) / (2.0 * half_);
  // Fibre map: formation, fibre height, and its slope for the tooth.
  float texel = 1.0 / ${FIBRE}.0;
  vec4 m = texture(uMap, q);
  float hx = texture(uMap, q + vec2(texel, 0.0)).g - texture(uMap, q - vec2(texel, 0.0)).g;
  float hy = texture(uMap, q + vec2(0.0, texel)).g - texture(uMap, q - vec2(0.0, texel)).g;
  // Water and dye run along fibres, so edges fray below the grid's scale.
  vec2 warp = (vec2(vnoise(q * 70.0), vnoise(q * 70.0 + 17.0)) - 0.5) * 2.4 + vec2(hx, hy) * 3.5;
  vec2 cell = q * NN + warp;
  vec4 A = field(uA, cell), D = max(field(uB, cell) + field(uH, cell), vec4(0.0));
  float fib = m.g, form = m.r;
  float W = A.x;
  // The front runs ahead along raised fibres, so its edge feathers.
  float wet = smoothstep(0.01, 0.22, W + 0.08 * (fib - 0.5) + 0.04 * (form - 0.5));
  // Cockle: wet paper swells into soft waves; some stay once dry.
  float ck = vnoise(q * 9.0 + 3.1) * 0.65 + vnoise(q * 21.0) * 0.35;
  float swell = 0.75 * wet + 0.3 * smoothstep(0.05, 0.4, A.y);
  vec2 dck = vec2(vnoise(q * 9.0 + vec2(3.15, 3.1)) - vnoise(q * 9.0 + vec2(3.05, 3.1)), vnoise(q * 9.0 + vec2(3.1, 3.15)) - vnoise(q * 9.0 + vec2(3.1, 3.05))) * 10.0;
  // Water fills the tooth, so a wet sheet is smoother.
  float tooth = 3.2 * (1.0 - 0.7 * wet);
  vec3 n = normalize(vec3(-vec2(hx, hy) * tooth - dck * swell * 0.05, 1.0));
  // The water film's surface: the cockle and a trace of the fibres.
  vec3 ns = normalize(vec3(-vec2(hx, hy) * 0.1 - dck * swell * 0.05, 1.0));
  // Paper white: a slight warmth, the cloud of the formation, the fibres.
  vec3 alb = vec3(0.86, 0.85, 0.83) * (0.95 + 0.1 * form) * (0.95 + 0.1 * fib);
  // Dyes: fibres take more dye than the gaps between them.
  float take = 0.8 + 0.4 * fib;
  vec3 od = (D.x * KV + D.y * KM + D.z * KC + D.w * KY) * 92.0 * take * (1.0 + 0.3 * wet);
  od += A.w * KI * 0.38;
  vec3 col = alb * exp(-od);
  // Wet paper turns translucent: the dark slate shows through, cool and grey.
  col *= mix(vec3(1.0), vec3(0.56, 0.59, 0.64), wet);
  // A thin film at the front holds a darker meniscus line.
  float rim = smoothstep(0.015, 0.06, W) * (1.0 - smoothstep(0.07, 0.24, W));
  col *= 1.0 - 0.1 * rim;
  // Raking light on the surface, normalised so flat paper reads 1.
  float lit = max(dot(n, normalize(L)), 0.0) / normalize(L).z;
  col *= lit;
  return Paper(col, n, ns, wet, W);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float r = length(px - uC);
  float edgePx = uDpr;
  float lightK = pool(px);
  // The bench: dark slate with a fine grain, lit by the same lamp.
  vec3 slate = vec3(0.022, 0.024, 0.028) * (0.85 + 0.3 * vnoise(px / uDpr * 0.9) * vnoise(px / uDpr * 0.07 + 7.0));
  // The paper's shadow: a soft fall to the lower right.
  float sd = length(px - uC - vec2(3.0, 5.0) * uDpr) - uRp;
  slate *= 1.0 - 0.55 * (1.0 - smoothstep(-2.0 * uDpr, 18.0 * uDpr, sd));
  vec3 col = slate * lightK;
  // The cut edge is a little ragged.
  float half_ = uRp * NN * 0.5 / RC;
  vec2 qe = (px - uC + half_) / (2.0 * half_);
  float fuzz = (texture(uMap, qe).b - 0.5) * 1.6 * uDpr;
  float inPaper = 1.0 - smoothstep(-edgePx, edgePx, r - uRp + fuzz);
  if (inPaper > 0.0) {
    Paper P = paperAt(px);
    vec3 pc = P.col * lightK;
    // Sheen: the window in the damp film, broken by cockle and fibres.
    float H = uRp * 2.5;
    // The camera looks down from over the centre; V runs from it to the pixel.
    vec3 V = normalize(vec3(px - uC, -H));
    vec3 R = reflect(V, P.ns);
    float gloss = smoothstep(0.3, 0.95, P.W);
    float sheen = windowLight(R, 0.045 + 0.08 * (1.0 - gloss)) * uWin;
    pc += vec3(0.95, 0.97, 1.0) * sheen * (0.03 + 0.34 * gloss) * P.wet;
    // Dry paper keeps a faint broad lustre.
    pc += vec3(0.02) * windowLight(R, 0.2) * (1.0 - P.wet);
    // The lit edge catches a hairline of light.
    float edgeLit = smoothstep(2.5 * uDpr, 0.0, abs(r - uRp + 1.0 * uDpr)) * max(0.0, dot(normalize(px - uC), normalize(L.xy)));
    pc += vec3(0.25) * edgeLit;

    // Water beads: spherical caps that magnify the paper and hold a window.
    for (int k = 0; k < ${MAX_BEADS}; k++) {
      if (k >= uBeadN) break;
      vec4 b = uBead[k];
      if (b.w <= 0.0) continue;
      vec2 d = (px - b.xy) / b.z;
      float dd = dot(d, d);
      // A caustic: the bead focuses the lamp to the lower right.
      vec2 cd = (px - b.xy - normalize(-L.xy) * b.z * 0.38) / (b.z * 0.42);
      pc += vec3(1.0, 0.98, 0.92) * exp(-dot(cd, cd) * 2.0) * 0.35 * b.w * lightK;
      if (dd >= 1.0) continue;
      // Cap height is 0.42 of its radius on damp paper.
      float hgt = 0.42;
      float rs = (1.0 + hgt * hgt) / (2.0 * hgt);
      vec3 nb = normalize(vec3(d / rs * vec2(1.0), sqrt(max(0.0, 1.0 - dd / (rs * rs)))));
      // The lens shows the paper near its centre, larger.
      // Near its rim the lens bends sight far out, so the rings crowd there.
      Paper Q = paperAt(px - nb.xy * b.z * (0.5 + 1.1 * dd));
      vec3 under = Q.col * lightK * 1.04;
      float fres = 0.02 + 0.98 * pow(1.0 - clamp(nb.z, 0.0, 1.0), 5.0);
      vec3 Rb = reflect(V, nb);
      vec3 refl = vec3(0.95, 0.97, 1.0) * windowLight(Rb, 0.03) * 2.4 + vec3(0.01);
      vec3 bc = mix(under, refl, fres);
      bc += vec3(1.0) * windowLight(Rb, 0.02) * 0.7;
      // A dark ring at the contact line, where the film bends light away.
      float ring = smoothstep(0.55, 0.97, sqrt(dd));
      bc *= 1.0 - 0.6 * ring * ring;
      // Light through the dome gathers on its shadow side.
      vec2 cg = d - normalize(-L.xy) * 0.45;
      bc += vec3(1.0, 0.98, 0.94) * exp(-dot(cg, cg) * 9.0) * 0.25;
      float a = (1.0 - smoothstep(0.92, 1.0, sqrt(dd))) * b.w;
      pc = mix(pc, bc, a);
    }
    col = mix(col, pc, inPaper);
  }
  // A soft vignette keeps the eye on the sheet.
  vec2 vq = px / uRes - 0.5;
  col *= 1.0 - 0.35 * dot(vq, vq);
  // Filmic tone curve, then sRGB with a dither.
  vec3 x = col * 1.12;
  vec3 t = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  vec3 s = pow(t, vec3(1.0 / 2.2));
  s += (hash(px + 0.37) - 0.5) / 255.0;
  o = vec4(s, 1.0);
}`;

export async function makeView(gl) {
  const lin = !!gl.getExtension('OES_texture_float_linear');
  const P = await linked(gl, { view: program(gl, TRI_VS, VIEW_FS) });
  const vao = gl.createVertexArray();
  const map = gl.createTexture();
  const beads = new Float32Array(MAX_BEADS * 4);
  let w = 1, h = 1;
  return {
    lin,
    setMap(data) {
      gl.bindTexture(gl.TEXTURE_2D, map);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, FIBRE, FIBRE, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
    },
    resize(W, H) { w = W; h = H; },
    // c and rp are in device pixels; list holds beads as [x, y, radius, alpha].
    draw(A, B, C, { c, rp, dpr, list, win = 1 }) {
      const p = P.view;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(p.p);
      const filt = lin ? gl.LINEAR : gl.NEAREST;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      gl.uniform1i(p.u.uA, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      gl.uniform1i(p.u.uB, 1);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, C);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      gl.uniform1i(p.u.uH, 3);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, map);
      gl.uniform1i(p.u.uMap, 2);
      gl.uniform2f(p.u.uRes, w, h);
      gl.uniform2f(p.u.uC, c[0], c[1]);
      gl.uniform1f(p.u.uRp, rp);
      gl.uniform1f(p.u.uDpr, dpr);
      gl.uniform1f(p.u.uLin, lin ? 1 : 0);
      gl.uniform1f(p.u.uWin, win);
      beads.fill(0);
      const bn = Math.min(MAX_BEADS, list.length);
      for (let i = 0; i < bn; i++) beads.set(list[i], i * 4);
      gl.uniform4fv(p.u.uBead, beads);
      gl.uniform1i(p.u.uBeadN, bn);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
