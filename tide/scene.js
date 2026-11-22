// Glowing tide renderer: raw WebGL2.
// Passes: stir map (decay and splats), reflection at half size, scene, bloom, grade.
// Each program stays small, so D3D11 links it fast.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { NW, CAM_H } from './waves.js';

const HEAD = `#version 300 es
precision highp float;
`;

/* ---------- K1: accumulation and decay (after trails/, via doubleslit/) ---------- */
// The stir map fades by exp(-dt/tau) and takes new splats in the same pass.
// The epsilon floor lets half floats reach zero.
const STIR = `${HEAD}
uniform sampler2D uSrc;
uniform float uK, uEps;
uniform int uN;
uniform vec4 uS[16];
uniform float uE[16];
in vec2 vUv;
out vec4 o;
void main() {
  float s = max(texture(uSrc, vUv).r * uK - uEps, 0.0);
  vec2 p = gl_FragCoord.xy;
  for (int i = 0; i < 16; i++) {
    if (i >= uN) break;
    vec2 d = (p - uS[i].xy) / uS[i].zw;
    s += uE[i] * exp(-2.0 * dot(d, d));
  }
  o = vec4(min(s, 4.0), 0.0, 0.0, 1.0);
}`;
/* ---------- end K1 ---------- */

// The beach, the sky and the wave faces: shared by the reflection and scene passes.
const COMMON = `${HEAD}
#define NW ${NW}
uniform vec4 uCam;
uniform vec2 uRes;
uniform float uTime, uShore;
uniform vec4 uWA[NW];
uniform vec4 uWB[NW];
uniform int uN;
const float H = ${CAM_H.toFixed(2)};
// The glow of the dinoflagellates, about 475 nm.
const vec3 GLOW = vec3(0.02, 0.36, 1.0);

float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 hash3(vec2 p) { vec3 q = fract(p.xyx * vec3(0.1031, 0.103, 0.0973)); q += dot(q, q.yxz + 33.33); return fract((q.xxy + q.yzz) * q.zyx); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// Churning foam: three octaves that roll with the water.
float foam(vec2 p) {
  float a = vnoise(p) * 0.55 + vnoise(p * 2.3 + 7.1) * 0.3 + vnoise(p * 5.1 - 3.7) * 0.15;
  return smoothstep(0.28, 0.82, a);
}

vec3 camRay(vec2 frag) {
  vec2 s = frag / uRes * 2.0 - 1.0;
  float c = cos(uCam.y), si = sin(uCam.y);
  return normalize(vec3(s.x * uCam.z, -si + s.y * uCam.w * c, c + s.y * uCam.w * si));
}

// The night sky: no moon, a grey-blue dome, a dim warm band low down.
vec3 sky(vec3 d) {
  float e = max(d.y, 0.0);
  vec3 c = mix(vec3(0.0075, 0.0108, 0.0195), vec3(0.002, 0.0031, 0.0078), pow(e, 0.45));
  c += vec3(0.0075, 0.005, 0.0028) * exp(-e * 45.0);
  // Faint stars on a grid of directions.
  vec2 g = vec2(atan(d.x, d.z), e) * vec2(260.0, 260.0);
  vec2 id = floor(g), f = fract(g) - 0.5;
  vec3 h = hash3(id);
  float star = step(0.986, h.z) * exp(-dot(f - (h.xy - 0.5) * 0.6, f - (h.xy - 0.5) * 0.6) * 90.0);
  c += vec3(0.8, 0.85, 1.0) * star * (0.02 + 0.08 * h.x * h.x) * smoothstep(0.02, 0.12, e);
  return c;
}

// The crest line bends and leans a little along the beach.
float bend(float x, float s) { return 0.8 * sin(x * 0.1 + s * 6.283) + 0.45 * sin(x * 0.043 + s * 17.0) + 0.2 * sin(x * 0.27 + s * 3.0) + 0.06 * x; }
float shoreZ(float x) { return uShore + 0.35 * sin(x * 0.09 + 1.3) + 0.2 * sin(x * 0.23); }

struct W { float zc; float h; float k; float b; float tl; float g; };
W wave(int i, float x) {
  vec4 A = uWA[i], B = uWB[i];
  W w;
  w.zc = A.x + bend(x, B.y);
  // The break peels along the crest from x0 at 5 m/s.
  w.tl = A.w < 0.0 ? -1.0 : A.w - sqrt((x - B.x) * (x - B.x) + 1.5) / 5.0;
  w.b = smoothstep(0.0, 0.35, w.tl);
  float env = 0.72 + 0.28 * sin(x * 0.13 + B.y * 9.0) * sin(x * 0.051 + B.y * 4.0);
  w.h = env * mix(A.y, A.z, smoothstep(0.25, 2.5, w.tl));
  w.k = mix(B.z, 1.3, w.b);
  // The lip flashes at the break; the bore keeps a lower glow.
  w.g = w.b * (0.32 + 1.1 * exp(-max(w.tl, 0.0) / 1.2));
  return w;
}

// The ray meets wave i's face, a plane that leans with slope k.
// Returns the distance, or -1 for a miss.
float face(int i, vec3 ro, vec3 rd, out W w, out float y) {
  float t = (uWA[i].x - ro.z) / max(rd.z, 1e-3);
  for (int j = 0; j < 2; j++) {
    w = wave(i, ro.x + rd.x * t);
    float den = rd.z - w.k * rd.y;
    if (den < 1e-3) return -1.0;
    t = (w.zc - w.k * w.h - ro.z + w.k * ro.y) / den;
  }
  w = wave(i, ro.x + rd.x * t);
  y = ro.y + rd.y * t;
  return t > 0.0 && y >= 0.0 && y <= w.h ? t : -1.0;
}

// A wave face: water that mirrors the sky, the glowing lip, the churning bore.
vec3 faceCol(W w, float x, float y, vec3 rd) {
  float f = clamp(y / max(w.h, 1e-3), 0.0, 1.0);
  vec3 n = normalize(vec3(0.0, w.k, -1.0));
  vec3 r = reflect(rd, n);
  r.y = abs(r.y);
  float F = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  // The trough is darker: the face hides more sky there.
  vec3 c = vec3(0.0011, 0.002, 0.0027) + sky(r) * F * (0.45 + 0.55 * f);
  float lip = exp(-pow((1.0 - f) / 0.13, 2.0));
  // Falling water: streaks run down the face.
  float churn = foam(vec2(x * 1.7, y * 2.2 - uTime * 1.1 + w.zc * 0.7));
  // The foot of the bore churns hardest.
  float foot = exp(-f / 0.18) * smoothstep(0.3, 1.5, w.tl);
  float g = w.g * (lip * 1.35 * (0.6 + 0.4 * churn) + churn * smoothstep(0.0, 1.4, w.tl) * 0.3 + foot * (0.25 + 0.5 * churn));
  // The round top of a swell fades into the sea behind it.
  vec3 back = vec3(0.0011, 0.002, 0.0027) + sky(reflect(rd, vec3(0, 1, 0))) * (0.02 + 0.98 * pow(1.0 - max(-rd.y, 0.0), 5.0));
  // Far swells and unbroken faces lean toward the sea's own tone.
  float lean = max(smoothstep(0.7, 1.0, f) * 0.85, 0.45 + 0.55 * smoothstep(22.0, 55.0, w.zc));
  c = mix(c, back, lean * (1.0 - w.b));
  // An unbroken crest about to fall shows a thin early shimmer.
  g += (1.0 - w.b) * lip * 0.03 * smoothstep(1.6, 0.8, w.k) * foam(vec2(x * 0.6, w.zc));
  return c + GLOW * g;
}

// Spray above a fresh break: soft glow the ray passes through.
float spray(W w, float x, float y) {
  if (w.tl <= 0.0) return 0.0;
  float d = (y - w.h) / (0.22 * w.h + 0.05);
  return w.b * exp(-w.tl / 0.7) * exp(-d * d) * step(0.0, d + 0.4) * (0.3 + 0.7 * foam(vec2(x * 2.4, y * 5.0 - uTime * 2.0)));
}

// Traces the surf: the first wave face, and any spray in front of it.
// Returns the face colour in rgb and the hit distance in a (0 for none).
vec4 surf(vec3 ro, vec3 rd, out vec3 glow) {
  glow = vec3(0.0);
  for (int i = 0; i < NW; i++) {
    if (i >= uN) break;
    // Far swells are too low to hide the sea; the plane draws them.
    if (uWB[i].w > 0.0 || uWA[i].x > 46.0) continue;
    W w; float y;
    float t = face(i, ro, rd, w, y);
    if (t > 0.0) return vec4(faceCol(w, ro.x + rd.x * t, y, rd), t);
    // A miss above the crest may still pass through spray.
    if (w.tl > 0.0) {
      float tc = (w.zc - ro.z) / max(rd.z, 1e-3);
      float yc = ro.y + rd.y * tc;
      if (tc > 0.0) glow += GLOW * spray(w, ro.x + rd.x * tc, yc) * 0.35;
    }
  }
  return vec4(0.0);
}
`;

// The reflection pass: the beach mirrors the sky and the glowing surf.
const REFL = `${COMMON}
out vec4 o;
void main() {
  vec3 rd = camRay(gl_FragCoord.xy);
  if (rd.y > -0.002) { o = vec4(0.0); return; }
  float t = H / -rd.y;
  vec3 p = vec3(0.0, H, 0.0) + rd * t;
  bool sea = p.z > shoreZ(p.x);
  // Ripples tilt the sea; the wet sand is near flat.
  vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * (p.xz * vec2(0.8, 1.7)) + vec2(0.0, uTime * 0.25);
  float a = (sea ? 0.035 : 0.008) / (1.0 + t * 0.04);
  vec2 q2 = q * 2.7 + 3.1;
  vec2 gr = vec2(vnoise(q + vec2(0.07, 0.0)) - vnoise(q - vec2(0.07, 0.0)), vnoise(q + vec2(0.0, 0.07)) - vnoise(q - vec2(0.0, 0.07)));
  gr += 0.5 * vec2(vnoise(q2 + vec2(0.07, 0.0)) - vnoise(q2 - vec2(0.07, 0.0)), vnoise(q2 + vec2(0.0, 0.07)) - vnoise(q2 - vec2(0.0, 0.07)));
  // Tilts along z stretch each reflection down the screen.
  vec3 n = normalize(vec3(-gr.x * a * 3.0, 1.0, -gr.y * a * 11.0));
  vec3 r = reflect(rd, n);
  r.y = abs(r.y);
  vec3 glow;
  vec4 s = surf(p + n * 0.01, r, glow);
  vec3 c = (s.a > 0.0 ? s.rgb : sky(r)) + glow;
  o = vec4(c, 1.0);
}`;

// The scene pass: sky, surf, sea and sand; the stir map lights them.
const SCENE = `${COMMON}
uniform sampler2D uStir, uRefl;
uniform float uWet;
in vec2 vUv;
out vec4 o;

// Point sparks in a grain grid, lit where the stir map is strong.
// Few grains light; each blinks on its own clock and has its own size.
float sparks(vec2 q, float s, float pxw, float cell) {
  vec2 g = q / cell, id = floor(g), f = fract(g) - 0.5;
  vec3 h = hash3(id);
  vec3 h2 = hash3(id + 71.3);
  vec2 off = (h.xy - 0.5) * 0.75;
  float r0 = 0.07 + 0.09 * h2.x;
  float r = max(r0, pxw / cell * 0.6);
  float d = length(f - off);
  float lit = smoothstep(h.z, h.z + 0.08, s * 0.32);
  float fl = pow(0.5 + 0.5 * sin(uTime * (2.0 + 7.0 * h2.y) + h2.z * 40.0), 6.0);
  return lit * exp(-d * d / (r * r)) * min(1.0, r0 * r0 / (r * r)) * (0.25 + 2.2 * fl) * (0.6 + 1.4 * h2.x);
}

float fresnel(float c) { return 0.02 + 0.98 * pow(1.0 - c, 5.0); }

void main() {
  vec3 rd = camRay(gl_FragCoord.xy);
  vec3 ro = vec3(0.0, H, 0.0);
  float stir = texture(uStir, vUv).r;
  vec3 glow;
  vec4 s = surf(ro, rd, glow);
  vec3 c;
  if (s.a > 0.0) {
    vec3 hp = ro + rd * s.a;
    float sw = foam(vec2(hp.x * 2.0 + uTime * 0.2, hp.y * 3.0 - uTime * 0.6));
    c = s.rgb + GLOW * stir * (0.06 + 0.3 * sw);
  } else if (rd.y > -0.0005) {
    c = sky(rd);
  } else {
    float t = H / -rd.y;
    vec3 p = ro + rd * t;
    float zs = shoreZ(p.x);
    // Nine taps, long down the screen, soften the half-size reflection.
    vec3 refl = vec3(0.0);
    for (int k = -4; k <= 4; k++) {
      float fk = float(k);
      vec2 o = vec2((fk - 4.0 * floor(fk / 4.0) - 1.5) * 1.2, fk * 2.6) / uRes;
      refl += texture(uRefl, vUv + o).rgb * exp(-fk * fk / 10.0);
    }
    refl /= 5.27;
    float F = fresnel(-rd.y);
    // Metres per pixel on the ground, stretched by the slant.
    float pxw = t * 2.0 * uCam.w / uRes.y / max(-rd.y, 0.04);
    // Glow of the surf on the plane: trails behind bores, lace on the swash.
    float g = 0.0, film = 0.0;
    for (int i = 0; i < NW; i++) {
      if (i >= uN) break;
      W w = wave(i, p.x);
      float e = uWB[i].w;
      if (e > 0.0) {
        // Swash: a thin sheet from its front up to the shore.
        float d = p.z - w.zc;
        if (d > 0.0 && p.z < zs + 0.6) {
          film = max(film, smoothstep(0.0, 0.25, d));
          float lace = exp(-d / 0.16) * (0.4 + 0.6 * foam(vec2(p.x * 3.0, p.z * 6.0 + uTime)));
          float sheet = exp(-d / 1.1) * foam(vec2(p.x * 2.2, p.z * 4.5 - uTime * 0.4)) * 0.12;
          g += e * (lace * 0.7 + sheet);
        }
      } else if (w.tl > 0.0) {
        // The foam a bore leaves behind fades as the flash dies.
        float d = p.z - w.zc;
        if (d > 0.0) g += w.b * exp(-d / 2.6) * foam(vec2(p.x * 1.1, p.z * 1.8 - uTime * 0.3)) * (0.3 + 0.7 * exp(-w.tl / 3.0)) * 0.3;
        // A short apron of foam runs ahead of the bore's foot.
        float a = p.z - (w.zc - w.k * w.h);
        if (a < 0.0) g += w.g * exp(a / 0.35) * (0.3 + 0.7 * foam(vec2(p.x * 2.0, p.z * 4.0 - uTime))) * 0.35;
      }
    }
    if (p.z > zs) {
      // The sea: near black, the reflection on top.
      c = vec3(0.0011, 0.002, 0.0027) + refl * F;
      // Stirred water glows in swirls, not in a flat patch.
      float sw = foam(vec2(p.x * 2.2 + uTime * 0.15, p.z * 3.0 - uTime * 0.2));
      c += GLOW * (stir * (0.08 + 0.32 * sw) + sparks(p.xz, stir, pxw, 0.06) * min(stir, 1.5) * 1.6);
    } else {
      // The sand: dark, wetter toward the water, a mirror where the swash lies.
      float wet = smoothstep(zs - uWet, zs - 0.4, p.z);
      float grain = 0.8 + 0.4 * vnoise(p.xz * 24.0);
      vec3 sand = vec3(0.012, 0.0104, 0.0086) * grain * (1.0 - 0.55 * max(wet, film));
      // Wet sand gives a dim, broken mirror; the swash sheet a clean one.
      float gloss = mix(0.06 + 0.4 * wet * (0.6 + 0.4 * vnoise(p.xz * 3.0)), 0.9, film);
      c = sand + refl * F * gloss;
      // Footprint sparks: points on the sand, no wide glow.
      c += GLOW * (stir * 0.025 + (sparks(p.xz, stir, pxw, 0.045) + sparks(p.xz + 0.013, stir * 0.7, pxw, 0.028)) * min(stir, 1.6) * 2.2);
    }
    c += GLOW * g;
    // Haze softens the far sea into the horizon.
    c = mix(c, sky(vec3(rd.x, 0.004, rd.z)), 1.0 - exp(-t / 160.0));
  }
  o = vec4(c + glow, 1.0);
}`;

// The grade: bloom, filmic curve, vignette, grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 v = vUv - 0.5;
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  // The curve acts on the brightest channel, so the blue keeps its hue.
  float m = max(max(c.r, c.g), max(c.b, 1e-5));
  c *= film(vec3(m)).x / m;
  // The hottest glow goes toward white, as a sensor clips.
  c = mix(c, vec3(max(c.b, c.g)), smoothstep(0.8, 1.0, m) * 0.2);
  c *= 1.0 - 0.45 * dot(v, v);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

export async function makeScene(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    stir: program(gl, TRI_VS, STIR),
    refl: program(gl, TRI_VS, REFL),
    scene: program(gl, TRI_VS, SCENE),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  let stirA = null, stirB = null, refl = null, hdr = null, W = 0, H = 0, SW = 0, SH = 0, RW = 0, RH = 0;

  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    SW = Math.max(2, Math.ceil(W / 2)); SH = Math.max(2, Math.ceil(H / 2));
    RW = SW; RH = SH;
    [stirA, stirB, refl, hdr].forEach(t => free(gl, t));
    stirA = target(gl, SW, SH, { clear: true, check: true });
    stirB = target(gl, SW, SH, { clear: true });
    refl = target(gl, RW, RH);
    hdr = target(gl, W, H);
  }

  // Splats come in device pixels of the canvas; the map is half size.
  const S = new Float32Array(64), E = new Float32Array(16);
  function stir(dt, tau, splats) {
    const p = P.stir;
    gl.disable(gl.BLEND);
    gl.useProgram(p.p);
    bind(gl, p, 'uSrc', 0, stirA);
    gl.uniform1f(p.u.uK, Math.exp(-dt / tau));
    gl.uniform1f(p.u.uEps, 0.01 * dt);
    const n = Math.min(16, splats.length);
    for (let i = 0; i < n; i++) {
      const s = splats[i];
      S.set([s.x / 2, s.y / 2, Math.max(1.5, s.rx / 2), Math.max(1.2, s.ry / 2)], i * 4);
      E[i] = s.e;
    }
    gl.uniform1i(p.u.uN, n);
    gl.uniform4fv(p.u.uS, S);
    gl.uniform1fv(p.u.uE, E);
    tri(gl, stirB, empty);
    [stirA, stirB] = [stirB, stirA];
  }

  function clearStir() {
    for (const t of [stirA, stirB]) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  }

  function common(p, v, res) {
    gl.uniform4f(p.u.uCam, CAM_H, v.pitch, v.tanX, v.tanY);
    gl.uniform2f(p.u.uRes, res[0], res[1]);
    gl.uniform1f(p.u.uTime, v.time);
    gl.uniform1f(p.u.uShore, v.shore);
    gl.uniform4fv(p.u.uWA, v.UA);
    gl.uniform4fv(p.u.uWB, v.UB);
    gl.uniform1i(p.u.uN, v.n);
  }

  // v: camera, clock, shore and the packed waves.
  function frame(v, { frameNo = 0, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    const r = P.refl;
    gl.useProgram(r.p);
    common(r, v, [RW, RH]);
    tri(gl, refl, empty);
    const c = P.scene;
    gl.useProgram(c.p);
    common(c, v, [W, H]);
    gl.uniform1f(c.u.uWet, v.wet);
    bind(gl, c, 'uStir', 0, stirA);
    bind(gl, c, 'uRefl', 1, refl);
    tri(gl, hdr, empty);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.45, cap: 6, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.4);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, stir, clearStir, frame };
}
