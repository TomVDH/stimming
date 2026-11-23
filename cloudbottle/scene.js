// Cloud in a bottle renderer: raw WebGL2.
// Passes: fog at half size, bench, scene, bloom, grade.
// Each program stays small, so D3D11 links it fast.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { GRADE } from '../shared/grade.js';
import { JUG, PROFILE, NOISE_N, makeNoise } from './jug.js';
import { ATLAS, fluidPrograms, makeFluid } from './fluid.js';

const HEAD = `#version 300 es
precision highp float;
precision highp sampler3D;
`;

// The jug, stopper, hose and bulb as signed distances, in metres.
// The bench is y = 0. The jug axis is x = z = 0.
const COMMON = `${HEAD}
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform vec3 uLens;
uniform vec4 uStop;
uniform vec4 uBulb;
uniform vec3 uHose[13];
uniform vec3 uKey;
${PROFILE}
const vec3 BULB = vec3(${JUG.BULB.map(v => v.toFixed(4)).join(', ')});
in vec2 vUv;
out vec4 o;

vec3 camRay(vec2 uv) {
  vec2 s = uv * 2.0 - 1.0;
  s.y -= uLens.z;
  return normalize(uCamRot * vec3(s.x * uLens.x, s.y * uLens.y, -1.0));
}
float jugOuter(vec3 p) { return jug2(vec2(length(p.xz), p.y)); }
// The glass shell, open at the mouth.
float jugShell(vec3 p) {
  vec2 q = vec2(length(p.xz), p.y);
  float d = jug2(q);
  float s = abs(d + TH * 0.5) - TH * 0.5;
  float hole = max(q.x - (RN - TH), BODY + 0.06 - q.y);
  return max(s, -hole);
}
// The stopper: a rubber cone, lifted and tilted when it pops.
vec3 stopLocal(vec3 p) {
  p -= vec3(0.0, TOP + 0.002 + uStop.x, 0.0);
  float cx = cos(uStop.y), sx = sin(uStop.y), cz = cos(uStop.z), sz = sin(uStop.z);
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  p.xy = mat2(cz, -sz, sz, cz) * p.xy;
  return p;
}
float sdStopper(vec3 p) {
  p = stopLocal(p);
  const float h = 0.0175, r1 = RN - TH, r2 = RN + 0.0035;
  vec2 q = vec2(length(p.xz), p.y);
  vec2 k1 = vec2(r2, h), k2 = vec2(r2 - r1, 2.0 * h);
  vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);
  vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb))) - 0.0012;
}
float sdCap(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}
float sdHose(vec3 p) {
  float d = 1e3;
  for (int i = 0; i < 12; i++) d = min(d, sdCap(p, uHose[i], uHose[i + 1], 0.0042));
  return d;
}
// The bulb: a squashed rubber egg with a nozzle and a valve tail.
float sdBulb(vec3 p) {
  vec3 r = uBulb.xyz;
  vec3 q = p - vec3(BULB.x, r.y, BULB.z);
  float k0 = length(q / r), k1 = length(q / (r * r));
  float e = k0 * (k0 - 1.0) / max(k1, 1e-5);
  float nz = sdCap(q, vec3(r.x * 0.8, 0.0, 0.0), vec3(r.x + 0.022, 0.002, 0.0), 0.0068);
  float tl = sdCap(q, vec3(-r.x * 0.8, 0.0, 0.0), vec3(-r.x - 0.014, 0.001, 0.0), 0.0072);
  return smin(smin(e, nz, 0.012), tl, 0.01);
}
// The opaque parts: x distance, y part id (2 stopper, 3 hose, 4 bulb).
vec2 opaque(vec3 p) {
  vec2 h = vec2(sdStopper(p), 2.0);
  float d = sdHose(p); if (d < h.x) h = vec2(d, 3.0);
  d = sdBulb(p); if (d < h.x) h = vec2(d, 4.0);
  return h;
}
// The dark room seen in glass and rubber: a cool softbox at the key, a warm strip at the right.
vec3 env(vec3 d) {
  vec3 c = vec3(0.004, 0.0045, 0.006);
  vec3 a = normalize(vec3(d.x, d.y * 0.4, d.z)), k = normalize(vec3(uKey.x, uKey.y * 0.4, uKey.z));
  c += vec3(4.2, 4.5, 5.0) * smoothstep(0.955, 0.985, dot(a, k)) * smoothstep(-0.2, 0.25, d.y);
  vec3 rr = normalize(vec3(0.95, 0.0, -0.3));
  vec3 b = normalize(vec3(d.x, d.y * 0.25, d.z));
  c += vec3(1.1, 0.72, 0.42) * smoothstep(0.985, 0.996, dot(b, rr)) * smoothstep(-0.1, 0.1, d.y) * smoothstep(0.75, 0.3, d.y);
  c += vec3(0.012, 0.012, 0.014) * smoothstep(-0.1, 0.0, -d.y);
  return c;
}
`;

/* ---------- fog: the cloud in the jug and the wisp at the mouth ---------- */
const FOG = `${COMMON}
${ATLAS}
uniform sampler3D uNoise;
uniform sampler2D tDye, tVel;
uniform vec2 uRes;
uniform float uFog, uForm, uT, uPlume, uPlumeT, uFrame;
const float SIG = 11.0;
float dens(vec3 p, out float plume) {
  plume = 0.0;
  float d = 0.0;
  float m = jugInner(p);
  if (m < 0.0 && p.y > WATER) {
    // Fire's split: the fluid grid gives the body, fine noise cuts its edges.
    vec3 c = (p - BMIN) / CELL;
    float body = S(tDye, c).r;
    // The flow carries the fine noise, so the edges streak with it.
    vec3 q = p - S(tVel, c).xyz * 0.12 + vec3(0.0, -uT * 0.003, 0.0);
    float fine = texture(uNoise, q * 9.5).r;
    float b = sqrt(max(body - 0.18, 0.0) / 1.9);
    // Formation: the densest nuclei light first, then the whole jug fills.
    float th = 1.15 - uForm * 1.0;
    float cover = smoothstep(th, th + 0.28, b + 0.12 + (fine - 0.5) * 0.3);
    float ero = smoothstep(0.15, 0.6, fine * 0.55 + min(body, 1.0) * 0.45);
    d = uFog * cover * body * (0.45 + 0.75 * ero) * smoothstep(0.0, 0.0015, -m);
  }
  if (uPlume > 0.0 && p.y > TOP - 0.01) {
    // The wisp rises out of the mouth, spreads and thins.
    float h = p.y - TOP;
    vec3 c = vec3(0.012 * sin(h * 40.0 + uPlumeT * 3.0), 0.0, 0.006 * cos(h * 30.0));
    float w = 0.014 + h * 0.55;
    float rr = length(p.xz - c.xz);
    float front = smoothstep(uPlumeT * 0.22 + 0.01, uPlumeT * 0.22 - 0.03, h);
    float n = texture(uNoise, (p - vec3(0.0, uPlumeT * 0.06, 0.0)) * 6.0).g;
    plume = uPlume * smoothstep(w, w * 0.2, rr) * front * smoothstep(0.17, 0.0, h) * (0.3 + n);
    d += plume;
  }
  return d;
}
// The light taps read the fluid grid alone.
float densLite(vec3 p) {
  if (jugInner(p) > 0.0 || p.y < WATER) return 0.0;
  return uFog * S(tDye, (p - BMIN) / CELL).r * smoothstep(0.0, 0.3, uForm);
}
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the key, Beer plus a multiple-scatter lobe,
// the powder term, an ambient floor, and a Henyey-Greenstein phase times 4 pi.
const float ABSORB = 2.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0, G_HG = 0.55;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
float lightT(vec3 p) {
  // Three taps along the key; a far tap stands for the rest of the jug.
  float sum = densLite(p + uKey * 0.012) * 0.012 + densLite(p + uKey * 0.032) * 0.02 + densLite(p + uKey * 0.07) * 0.04;
  float tau = sum * SIG * ABSORB * 0.5;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER);
  return clamp(fin + AMBIENT, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  // The bounds: the jug and the space over its mouth.
  float a = dot(rd.xz, rd.xz), b = dot(ro.xz, rd.xz), cc = dot(ro.xz, ro.xz) - R * R;
  float disc = b * b - a * cc;
  if (disc <= 0.0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float sq = sqrt(disc);
  float t0 = (-b - sq) / a, t1 = (-b + sq) / a;
  t0 = max(t0, 0.0);
  if (t1 <= t0 || (uFog <= 0.0 && uPlume <= 0.0)) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  const int N = 36;
  float dt = (t1 - t0) / float(N);
  // Interleaved gradient noise, turned each frame; the blur hides it.
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618034);
  float t = t0 + dt * j;
  float T = 1.0;
  vec3 acc = vec3(0.0);
  // The view and the key: the camera looks into the light, so the fog backlights.
  float ph = hg(dot(-rd, uKey) * -1.0, G_HG) * 12.56637;
  vec3 key = vec3(1.4, 1.45, 1.53);
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * t;
    t += dt;
    if (p.y < WATER || p.y > TOP + 0.17) continue;
    float pl;
    float d = dens(p, pl);
    if (d < 0.003) continue;
    // Fire's detail term: simplex-like grain on the density.
    d *= 0.85 + 0.35 * (texture(uNoise, p * 21.0 + vec3(0.0, -uT * 0.01, 0.0)).r * 2.0 - 1.0);
    vec3 Li = key * lightT(p) * ph;
    // A faint warm fill from the right strip, a cool room floor.
    Li += vec3(0.05, 0.034, 0.022) * (0.5 + 0.5 * p.x / R) + vec3(0.012, 0.014, 0.018);
    float al = 1.0 - exp(-max(d, 0.0) * SIG * dt);
    acc += T * al * Li;
    T *= 1.0 - al;
    if (T < 0.01) break;
  }
  o = vec4(acc, T);
}`;

// A three-tap blur along one axis: it hides the march dither, as in Fire.
const BLUR = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uStep;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 s = uStep / vec2(textureSize(uSrc, 0));
  o = texture(uSrc, vUv) * 0.5 + (texture(uSrc, vUv + s) + texture(uSrc, vUv - s)) * 0.25;
}`;

/* ---------- bench: the black lab bench, the backdrop, the shadows ---------- */
const BENCH = `${COMMON}
uniform float uFog;
const float SIG = 11.0;
float jugR(float y) {
  if (y < BODY) return R;
  float e = clamp((y - BODY) / SH, 0.0, 1.0);
  return max(R * sqrt(1.0 - e * e), RN);
}
// Soft shadow from the rubber parts.
float softShadow(vec3 p, vec3 l) {
  float s = 1.0, t = 0.006;
  for (int i = 0; i < 28; i++) {
    float h = opaque(p + l * t).x;
    s = min(s, 10.0 * h / t);
    t += clamp(h, 0.004, 0.05);
    if (s < 0.01 || t > 0.6) break;
  }
  return clamp(s, 0.0, 1.0);
}
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  vec3 c;
  float tb = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  vec3 p = ro + rd * tb;
  if (tb < 1e8 && p.z > -1.2) {
    vec3 l = uKey;
    // The key is a spot: a soft pool round the jug.
    float spot = smoothstep(0.6, 0.02, length((p.xz - vec2(-0.08, 0.04)) * vec2(0.75, 1.1)));
    float sh = softShadow(p, l);
    // The jug's shadow: glass and water pass most light, fog blocks it.
    vec2 lh = normalize(l.xz);
    float along = -dot(p.xz, lh);
    float side = abs(p.x * lh.y - p.z * lh.x);
    float yAt = along / max(length(l.xz), 0.1) * l.y;
    float jr = jugR(yAt);
    float caus = 0.0;
    if (along > 0.0 && yAt < TOP && side < jr + 0.012) {
      float u = side / jr;
      float chord = 2.0 * sqrt(max(jr * jr - side * side, 0.0));
      // Fog scatters much of the light on forward, so its shadow stays soft.
      float fogT = 0.22 + 0.78 * exp(-SIG * uFog * 0.4 * chord);
      float edge = smoothstep(0.82, 1.0, u) * (1.0 - smoothstep(1.0, 1.05, u));
      float tr = u < 1.0 ? (0.82 - 0.55 * edge) * fogT : 1.0;
      // A bright line just outside the wall, and the focus of the water.
      caus += smoothstep(1.06, 1.0, u) * smoothstep(0.97, 1.01, u) * 0.9 * fogT;
      caus += yAt < WATER + 0.01 ? exp(-u * u * 20.0) * 2.2 * fogT : 0.0;
      sh *= tr;
    }
    float ndl = max(l.y, 0.0);
    vec3 alb = vec3(0.014, 0.0145, 0.017);
    c = alb * vec3(3.6, 3.75, 4.0) * ndl * spot * (sh + caus);
    // Epoxy sheen: the key's long streak on the bench.
    vec3 h = normalize(l - rd);
    c += vec3(0.6, 0.63, 0.7) * pow(max(h.y, 0.0), 180.0) * spot * sh * 0.5;
    // Contact shadow round the base, and under the bulb.
    float rj = length(p.xz);
    float ao = mix(0.25, 1.0, smoothstep(0.0, 0.03, rj - R));
    vec2 bq = (p.xz - BULB.xz) / vec2(uBulb.x * 1.4, uBulb.z * 1.4);
    ao *= mix(0.35, 1.0, smoothstep(0.6, 1.3, length(bq)));
    c *= ao;
    // The fog lights the bench round the jug a little.
    c += vec3(0.05, 0.052, 0.056) * uFog * exp(-max(rj - R, 0.0) * 18.0) * smoothstep(R - 0.02, R, rj);
    c += env(reflect(rd, vec3(0.0, 1.0, 0.0))) * 0.03;
    // The bench edge falls into the dark.
    c = mix(vec3(0.0035, 0.0038, 0.0048) * 0.4, c, smoothstep(-1.1, -0.3, p.z));
  } else {
    // The black backdrop, a faint spill from the key.
    float v = smoothstep(-0.2, 0.3, rd.y);
    c = vec3(0.0035, 0.0038, 0.0048) * (1.0 - 0.6 * v);
    c += vec3(0.01, 0.011, 0.014) * smoothstep(0.6, 0.98, dot(rd, normalize(uKey + vec3(0.0, -0.3, 0.0))));
  }
  o = vec4(c, 1.0);
}`;

/* ---------- scene: glass, water, rubber, then the fog ---------- */
const SCENE = `${COMMON}
uniform sampler2D uBench, uFogTex;
uniform vec2 uRes;
vec3 nJug(vec3 p) {
  vec2 e = vec2(0.0006, 0.0);
  return normalize(vec3(jugOuter(p + e.xyy) - jugOuter(p - e.xyy), jugOuter(p + e.yxy) - jugOuter(p - e.yxy), jugOuter(p + e.yyx) - jugOuter(p - e.yyx)));
}
vec3 nOpq(vec3 p) {
  vec2 e = vec2(0.0005, -0.0005);
  return normalize(e.xyy * opaque(p + e.xyy).x + e.yyx * opaque(p + e.yyx).x + e.yxy * opaque(p + e.yxy).x + e.xxx * opaque(p + e.xxx).x);
}
float fres(float c, float f0) { float k = 1.0 - c; return f0 + (1.0 - f0) * k * k * k * k * k; }
// Rubber: matte red-brown, amber latex, or the dark bulb.
vec3 rubber(vec3 p, vec3 rd, float id) {
  vec3 n = nOpq(p);
  vec3 alb = id < 2.5 ? vec3(0.16, 0.045, 0.035) : id < 3.5 ? vec3(0.62, 0.27, 0.07) : vec3(0.15, 0.035, 0.03);
  float wrap = id > 2.5 && id < 3.5 ? 0.45 : 0.15;
  float ndl = max((dot(n, uKey) + wrap) / (1.0 + wrap), 0.0);
  float ao = clamp(0.4 + 0.6 * (opaque(p + n * 0.006).x / 0.006), 0.25, 1.0);
  vec3 key = vec3(3.6, 3.75, 4.0) * 0.55;
  vec3 c = alb * key * ndl;
  c += alb * vec3(0.9, 0.6, 0.38) * 0.25 * max(dot(n, normalize(vec3(0.95, 0.1, -0.3))), 0.0);
  c += alb * 0.03 * ao;
  vec3 h = normalize(uKey - rd);
  float sp = pow(max(dot(n, h), 0.0), id > 2.5 && id < 3.5 ? 90.0 : 40.0);
  c += vec3(0.5) * sp * (id > 2.5 && id < 3.5 ? 0.6 : 0.25);
  float f = fres(max(dot(-rd, n), 0.0), 0.035);
  c += env(reflect(rd, n)) * f * 0.5;
  return c * ao;
}
// The glass tint over a path through one wall.
vec3 tint(float c) { return exp(-vec3(18.0, 9.0, 13.0) * TH / max(c, 0.06)); }
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  vec3 bench = texture(uBench, vUv).rgb;
  vec4 fog = texture(uFogTex, vUv);
  float t = 0.4, hit = 0.0;
  vec3 p;
  for (int i = 0; i < 96; i++) {
    p = ro + rd * t;
    float dj = jugShell(p);
    vec2 h = opaque(p);
    float d = min(dj, h.x);
    if (d < 0.0002) { hit = dj < h.x ? 1.0 : h.y; break; }
    t += d;
    if (t > 3.0) break;
  }
  vec3 c = bench;
  if (hit > 1.5) {
    c = rubber(p, rd, hit);
    // Only the wisp over the mouth lies in front of the rubber.
    if (p.y > TOP) c = c * fog.a + fog.rgb;
  } else if (hit > 0.5) {
    vec3 n1 = nJug(p);
    float c1 = max(dot(-rd, n1), 0.0);
    float F1 = fres(c1, 0.04);
    vec3 refl = env(reflect(rd, n1));
    // Through the air inside, to the back wall, the water or the stopper.
    vec3 q = p + rd * TH * 2.5, dir = rd;
    vec3 behind = vec3(0.0), extra = vec3(0.0);
    float through = 1.0;
    // A ray through the side wall below the line starts in the water.
    bool water = q.y < WATER;
    vec2 off = vec2(0.0);
    float tq = 0.0;
    float tw = !water && dir.y < 0.0 ? (q.y - WATER) / -dir.y : 1e9;
    for (int i = 0; i < 56; i++) {
      float m = jugInner(q);
      if (m > 0.0) break;
      float so = sdStopper(q);
      if (so < 0.0004) { behind = rubber(q, dir, 2.0) * 0.8; through = 0.0; break; }
      if (!water && dir.y < 0.0 && q.y < WATER + 0.0005) {
        // The water face: a glint, a bright meniscus, then a bend down.
        water = true;
        vec3 wn = vec3(0.0, 1.0, 0.0);
        float cw = max(-dir.y, 0.0);
        float Fw = fres(cw, 0.02);
        extra += env(reflect(dir, wn)) * Fw * through;
        extra += vec3(2.4, 2.5, 2.7) * pow(max(dot(reflect(dir, wn), uKey), 0.0), 300.0) * through;
        float rin = R - TH - length(q.xz);
        extra += vec3(0.35, 0.38, 0.42) * smoothstep(0.003, 0.0, rin) * through;
        through *= 1.0 - Fw;
        vec3 nd = refract(dir, wn, 1.0 / 1.333);
        off += (nd.xy - dir.xy) * 0.06;
        dir = nd;
        // Lit water scatters a little cyan.
        extra += vec3(0.006, 0.014, 0.016) * through;
      }
      float stp = clamp(max(-m, min(so, 0.02)), 0.0015, 0.02);
      // Never step past the water face: land on it.
      if (!water && tq < tw) stp = min(stp, tw - tq + 0.0001);
      q += dir * stp;
      tq += stp;
    }
    if (through > 0.0) {
      vec3 n2 = nJug(q);
      float c2 = abs(dot(dir, n2));
      float F2 = fres(c2, 0.04);
      vec2 uv2 = vUv + off;
      vec3 back = texture(uBench, uv2).rgb;
      behind = back * (1.0 - F2) * tint(c2) * (water ? vec3(0.5, 0.72, 0.76) : vec3(1.0)) + env(reflect(dir, -n2)) * F2 * 0.7;
    }
    vec3 inside = (behind * through + extra);
    inside = inside * fog.a + fog.rgb;
    // Light caught in the wall glows along the thick, grazing edges.
    float edge = pow(1.0 - c1, 4.0);
    c = inside * (1.0 - F1) * tint(c1) + refl * F1 + vec3(0.05, 0.055, 0.06) * edge * (0.4 + 0.6 * max(dot(n1, uKey), 0.0));
  } else {
    c = c * fog.a + fog.rgb;
  }
  o = vec4(c, 1.0);
}`;

/* ---------- grade: bloom, tone, vignette, grain ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK;
uniform vec2 uRes;
in vec2 vUv;
out vec4 o;
${GRADE}
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c = film(c * 1.1);
  c *= gdVignette(vUv, uRes.x / uRes.y, 0.45, 0.35);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (gdHash(gl_FragCoord.xy + vec2(uFrame * 37.0, uFrame * 91.0)) - 0.5) * 0.014;
  o = vec4(c, 1.0);
}`;

export async function makeScene(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    fog: program(gl, TRI_VS, FOG),
    blur: program(gl, TRI_VS, BLUR),
    bench: program(gl, TRI_VS, BENCH),
    scene: program(gl, TRI_VS, SCENE),
    final: program(gl, TRI_VS, FINAL),
    ...fluidPrograms(gl),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  const noise = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, noise);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RG8, NOISE_N, NOISE_N, NOISE_N, 0, gl.RG, gl.UNSIGNED_BYTE, makeNoise());
  for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, k, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_3D, null);
  const fluid = makeFluid(gl, P, empty, noise);

  let fogT = null, fogB = null, benchT = null, hdr = null, W = 0, H = 0, FW = 0, FH = 0, fogScale = 2;
  function resize(w, h, half = 2) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    fogScale = half;
    FW = Math.max(2, Math.ceil(W / half)); FH = Math.max(2, Math.ceil(H / half));
    [fogT, fogB, benchT, hdr].forEach(t => free(gl, t));
    fogT = target(gl, FW, FH, { check: true });
    fogB = target(gl, FW, FH);
    benchT = target(gl, W, H);
    hdr = target(gl, W, H);
  }

  function common(p, v) {
    gl.uniform3fv(p.u.uCamPos, v.cam.pos);
    gl.uniformMatrix3fv(p.u.uCamRot, false, v.cam.rot);
    gl.uniform3fv(p.u.uLens, v.cam.lens);
    gl.uniform4fv(p.u.uStop, v.stop);
    gl.uniform4fv(p.u.uBulb, v.bulb);
    gl.uniform3fv(p.u.uHose, v.hose);
    gl.uniform3fv(p.u.uKey, v.key);
  }

  // v: camera, parts, fog state. Draws one frame to the screen.
  function frame(v, { frameNo = 0, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    const f = P.fog;
    gl.useProgram(f.p);
    common(f, v);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(f.u.uNoise, 0);
    gl.uniform2f(f.u.uRes, FW, FH);
    const g = v.fog;
    bind(gl, f, 'tDye', 1, fluid.dye());
    bind(gl, f, 'tVel', 2, fluid.vel());
    gl.uniform1f(f.u.uFog, g.dens);
    gl.uniform1f(f.u.uForm, g.form);
    gl.uniform1f(f.u.uT, g.t);
    gl.uniform1f(f.u.uPlume, g.plume);
    gl.uniform1f(f.u.uPlumeT, g.plumeT);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    tri(gl, fogT, empty);
    gl.bindTexture(gl.TEXTURE_3D, null);
    const bl = P.blur;
    gl.useProgram(bl.p);
    bind(gl, bl, 'uSrc', 0, fogT);
    gl.uniform2f(bl.u.uStep, 1, 0);
    tri(gl, fogB, empty);
    bind(gl, bl, 'uSrc', 0, fogB);
    gl.uniform2f(bl.u.uStep, 0, 1);
    tri(gl, fogT, empty);
    const b = P.bench;
    gl.useProgram(b.p);
    common(b, v);
    gl.uniform1f(b.u.uFog, g.dens * Math.min(1, g.form * 1.5));
    tri(gl, benchT, empty);
    const s = P.scene;
    gl.useProgram(s.p);
    common(s, v);
    bind(gl, s, 'uBench', 0, benchT);
    bind(gl, s, 'uFogTex', 1, fogT);
    gl.uniform2f(s.u.uRes, W, H);
    tri(gl, hdr, empty);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.7, cap: 6, levels: bloomLevels });
    const fp = P.final;
    gl.useProgram(fp.p);
    bind(gl, fp, 'uHdr', 0, hdr);
    bind(gl, fp, 'uBloom', 1, bt);
    gl.uniform1f(fp.u.uBloomK, 0.35);
    gl.uniform1f(fp.u.uFrame, frameNo % 64);
    gl.uniform2f(fp.u.uRes, W, H);
    tri(gl, null, empty);
  }

  // One fluid time step; see makeFluid for the fields.
  return { resize, frame, sim: s => fluid.step(s) };
}
