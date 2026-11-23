// Wheat storm shaders. Small programs, so D3D11 links each fast.
// World: metres; x right, y up, z ahead. The eye stands at (0, CAMH, 0).
// A screen point maps to the ray (X, Y, 1); the horizon is Y = 0.
import { OUTPUT } from '../shared/output.js';

const HEAD = `#version 300 es
precision highp float;
precision highp sampler3D;
`;

// The lens, the eye and the depth range, shared by every pass.
const VIEW = `
uniform float uTanW, uVy, uHz;
const float CAMH = 4.0;
const float NEAR = 0.3, FAR = 60000.0;
// The canopy: the heads stand over this plane.
const float CANOPY = 0.72;
// The low evening sun, from the left and a little behind, 9 degrees up.
const vec3 SUN = vec3(-0.8442, 0.1564, -0.5126);
const vec3 SUNC = vec3(1.0, 0.56, 0.27);
vec3 rayOf(vec2 uv) { return vec3((uv.x * 2.0 - 1.0) * uTanW, (uv.y - uHz) * uVy, 1.0); }
float depthOf(float z) { return 0.5 + 0.5 * ((FAR + NEAR) / (FAR - NEAR) - 2.0 * FAR * NEAR / ((FAR - NEAR) * z)); }
vec4 clipOf(vec3 p) {
  vec3 r = p - vec3(0.0, CAMH, 0.0);
  float a = (FAR + NEAR) / (FAR - NEAR), b = -2.0 * FAR * NEAR / (FAR - NEAR);
  return vec4(r.x / uTanW, 2.0 * r.y / uVy + (2.0 * uHz - 1.0) * r.z, a * r.z + b, r.z);
}
`;

const NOISE = `
float h1(float n) { return fract(sin(n * 0.1031 + 7.13) * 43758.5453); }
float h2(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
`;

// The wind over the field. Both the canopy and the heads read it.
// The gust field rolls downwind; each lightning strike adds a ring of outflow.
const WIND = `
uniform float uPhase, uWind, uT;
// Gust fronts: xy the strike point, z the ring's radius, w its strength.
uniform vec4 uFront[4];
// The wind blows toward the eye and to the left.
const vec2 WD = vec2(-0.3871, -0.9220);
const vec2 WC = vec2(0.9220, -0.3871);
// The gust field, 0 to 1. Gust patches run long across the wind.
float gustAt(vec2 p) {
  float a = dot(p, WD) - uPhase, c = dot(p, WC);
  return 0.55 * vn2(vec2(a * 0.07, c * 0.02)) + 0.3 * vn2(vec2(a * 0.18, c * 0.065) + 17.0) + 0.15 * vn2(vec2(a * 0.45, c * 0.2) + 41.0);
}
// The heads' lean in metres (xy), and how far the stalks bend (z, 0 to 1).
vec3 lean(vec2 p) {
  float g0 = gustAt(p);
  // The wind a moment ago: behind a gust the stalks swing back.
  float g1 = gustAt(p + WD * 3.5);
  float k = smoothstep(0.36, 0.7, g0);
  float m = uWind * (0.035 + 0.3 * k) - uWind * 0.14 * max(g1 - g0, 0.0);
  vec2 L = WD * m;
  // The sheen: bent heads show pale; heads swinging back show dark.
  float sh = m;
  for (int i = 0; i < 4; i++) {
    vec4 f = uFront[i];
    if (f.w <= 0.0) continue;
    vec2 d = p - f.xy;
    float r = length(d) + 0.01;
    // The front is ragged: it runs ahead in tongues and lags in bays.
    float b = f.z * (1.0 + 0.24 * (vn2(p * 0.06 + f.xy) - 0.5)) + 4.0 * (vn2(p * 0.35) - 0.5) - r;
    // A sharp front, then the stalks spring back past upright and wave.
    float pr = smoothstep(-2.5, 0.8, b) * exp(-max(b, 0.0) / 11.0) * cos(max(b, 0.0) * 0.29);
    L += d / r * f.w * pr;
    // The swing back shows darker, but less than the crest shows pale.
    sh += f.w * (pr > 0.0 ? pr : 0.45 * pr);
  }
  float n = length(L);
  L *= min(1.0, 0.8 / max(n, 1e-4));
  return vec3(L, clamp(sh / 0.45, -0.45, 1.0));
}
`;

// The strike's light on the field: a vertical channel over the strike point.
const BOLT_LIGHT = `
uniform vec4 uBolt;
uniform vec3 uBoltC;
uniform float uFlash;
// The channel's light at p, and the direction to it.
float boltAt(vec3 p, out vec3 dir) {
  vec2 d = uBolt.xz - p.xz;
  float r = length(d) + 0.5;
  // The brightest part of the channel stands about as high as it is far.
  dir = normalize(vec3(d.x, clamp(r, 20.0, 600.0) - p.y, d.y));
  // A line source fades as one over the distance; the near pool is brightest.
  return uBolt.w * 14.0 / (r + 14.0);
}
`;

/* ---------- pass 1: the storm deck, at half size ---------- */
export const CLOUD_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler3D uNoise;
uniform float uDrift, uFrame;
// The top of the strike's channel, inside the cloud, and its light.
uniform vec4 uBoltTop;
uniform vec3 uBoltC;
${VIEW}
const float BASE = 900.0, TOP = 3200.0, LOW = 360.0;
// The deck: billows hang under a ragged base; it ends far ahead.
float deck(vec3 p) {
  vec3 q = p + vec3(uDrift, 0.0, uDrift * 0.35);
  // Rolls run across the view, as under a gust front's shelf.
  vec2 big = texture(uNoise, q * vec3(1.0 / 9000.0, 1.0 / 2400.0, 1.0 / 3200.0)).rg;
  vec2 mid = texture(uNoise, q * vec3(1.0 / 2800.0, 1.0 / 1200.0, 1.0 / 1150.0) + 0.31).rg;
  vec2 fine = texture(uNoise, q / 420.0 + 0.71).rg;
  float bill = big.g * 0.6 + mid.g * 0.3 + fine.g * 0.1;
  float n = big.r * 0.55 + mid.r * 0.3 + fine.r * 0.15;
  // The base sinks under each billow.
  float hb = BASE - 600.0 * smoothstep(0.3, 0.85, bill) - 100.0 * n;
  float d = smoothstep(hb - 20.0, hb + 130.0, p.y + 140.0 * (fine.r - 0.5)) * smoothstep(TOP, TOP - 1200.0, p.y);
  // The far edge wanders; past it lies clear evening sky.
  float edge = smoothstep(27000.0, 19000.0, p.z + 7000.0 * (texture(uNoise, vec3(p.x / 7000.0, 0.13, 0.37)).r - 0.5));
  // The storm's core lies to the right; toward the sun the deck thins.
  float core = 0.7 + 0.6 * smoothstep(-9000.0, 9000.0, p.x + 0.25 * p.z);
  return clamp(d * edge * core * (0.35 + 1.2 * n) - 0.1, 0.0, 1.0);
}
float deckLite(vec3 p) {
  vec2 big = texture(uNoise, (p + vec3(uDrift, 0.0, uDrift * 0.35)) * vec3(1.0 / 9000.0, 1.0 / 2400.0, 1.0 / 3200.0)).rg;
  float hb = BASE - 600.0 * smoothstep(0.3, 0.85, big.g * 0.85 + 0.05);
  return clamp(smoothstep(hb - 40.0, hb + 220.0, p.y) * (0.35 + 1.2 * big.r) - 0.1, 0.0, 1.0);
}
const float SIG = 0.006;
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the key, Beer plus a multiple-scatter lobe,
// the powder term, an ambient floor, and a Henyey-Greenstein phase times 4 pi.
const float ABSORB = 2.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0, G_HG = 0.55;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
float lightT(vec3 p) {
  // Three taps toward the sun; the far tap stands for the rest of the deck.
  float sum = deckLite(p + SUN * 70.0) * 70.0 + deckLite(p + SUN * 220.0) * 150.0 + deckLite(p + SUN * 600.0) * 380.0;
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
  vec3 rd = normalize(rayOf(vUv));
  if (rd.y < 0.004) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float t0 = (LOW - CAMH) / rd.y, t1 = min((TOP - CAMH) / rd.y, t0 + 7000.0);
  if (t0 > 60000.0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  const int N = 44;
  float dt = (t1 - t0) / float(N);
  // White noise, turned each frame; the blur hides it.
  // Interleaved gradient noise stripes at half size, so it is not used here.
  float j = fract(fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) + uFrame * 0.618034);
  float t = t0 + dt * j;
  float T = 1.0;
  vec3 S = vec3(0.0);
  // The eye looks away from the sun, so the deck scatters back to it.
  float ph = hg(dot(rd, SUN), G_HG) * 12.56637;
  for (int i = 0; i < N; i++) {
    vec3 p = rd * t + vec3(0.0, CAMH, 0.0);
    t += dt;
    float d = deck(p);
    if (d < 0.004) continue;
    // Deep in the deck the low sun does not reach.
    float hb = p.y - LOW;
    vec3 Li = SUNC * 1.1 * lightT(p) * ph * exp(-hb / 260.0);
    // Sky from above, and the gold field's bounce from below.
    Li += vec3(0.02, 0.026, 0.05) + vec3(0.07, 0.036, 0.014) * exp(-hb / 400.0);
    // Far off the air lies between: the deck pales to the haze.
    Li = mix(Li, vec3(0.16, 0.15, 0.17), 1.0 - exp(-t / 16000.0));
    // The strike lights the cloud from within.
    float bq = length(p - uBoltTop.xyz);
    Li += uBoltC * uBoltTop.w * (3.0 * exp(-bq / 380.0) + 0.3 * exp(-bq / 2600.0));
    float al = 1.0 - exp(-d * SIG * dt);
    S += T * al * Li;
    T *= 1.0 - al;
    if (T < 0.01) break;
  }
  o = vec4(S, T);
}`;

// A three-tap blur along one axis: it hides the march dither, as in Fire.
export const BLUR_FS = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uStep;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 s = uStep / vec2(textureSize(uSrc, 0));
  o = texture(uSrc, vUv) * 0.5 + (texture(uSrc, vUv + s) + texture(uSrc, vUv - s)) * 0.25;
}`;

/* ---------- pass 2: the sky and the far canopy ---------- */
export const FIELD_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uCloud;
uniform float uPxM;
${VIEW}
${NOISE}
${WIND}
${BOLT_LIGHT}
// The sky behind the deck: clear evening air, bright low down.
vec3 skyBg(vec3 d) {
  float e = max(d.y, 0.0);
  vec3 low = vec3(1.0, 0.6, 0.3) * 0.85, mid = vec3(0.55, 0.48, 0.42) * 0.45, top = vec3(0.1, 0.16, 0.32) * 0.4;
  vec3 c = mix(low, mid, smoothstep(0.0, 0.04, e));
  c = mix(c, top, smoothstep(0.05, 0.3, e));
  // Brighter toward the sun's side of the frame.
  return c * (1.0 + 0.35 * clamp(-d.x * 2.0, -1.0, 1.0));
}
void main() {
  vec3 rd = rayOf(vUv);
  vec3 dir = normalize(rd);
  if (rd.y >= -0.0006) {
    vec4 c = texture(uCloud, vUv);
    vec3 col = skyBg(dir) * c.a + c.rgb;
    // The strike lights the air round it.
    col += uBoltC * uFlash * 0.05;
    o = vec4(col, 1.0);
    gl_FragDepth = 1.0;
    return;
  }
  float t = (CAMH - CANOPY) / -rd.y;
  vec3 p = vec3(0.0, CAMH, 0.0) + rd * t;
  vec3 lw = lean(p.xz);
  // The heads' pattern moves with the heads.
  vec2 q = p.xz - lw.xy * 0.7;
  // A pixel's footprint: across the view, and along it.
  float fx = t * uPxM, fz = fx * t / (CAMH - CANOPY);
  float grain = mix(0.5, vn2(vec2(q.x * 24.0, q.y * 24.0)), 1.0 - smoothstep(0.02, 0.06, max(fx, fz * 0.25)));
  float clump = mix(0.5, vn2(q * 2.4 + 3.0), 1.0 - smoothstep(0.15, 0.5, max(fx, fz * 0.25)));
  float patchy = vn2(p.xz * 0.045) * 0.7 + vn2(p.xz * 0.012 + 9.0) * 0.3;
  vec3 alb = mix(vec3(0.36, 0.14, 0.028), vec3(0.62, 0.31, 0.075), smoothstep(0.25, 0.75, patchy));
  alb *= 0.75 + 0.35 * grain + 0.15 * (clump - 0.5);
  // A bent head shows its pale side to the eye.
  alb = mix(alb, vec3(0.8, 0.62, 0.36), 0.55 * max(lw.z, 0.0));
  // Close by the eye sees between the heads, into the stand's shade.
  float open = mix(0.22, 1.0, smoothstep(9.0, 60.0, t));
  // Past about 4 km the field lies in the deck's shadow.
  float sunT = 1.0 - smoothstep(3800.0, 5200.0, t);
  vec3 col = alb * (SUNC * 1.7 * max(0.42 + 1.1 * lw.z, 0.15) * sunT * open + vec3(0.12, 0.13, 0.17) * 0.9 * open);
  vec3 bd;
  float bl = boltAt(p, bd);
  col += alb * uBoltC * (bl * (0.4 + 0.6 * max(lw.z, 0.0)) + uFlash * 0.3);
  // The air: the storm's blue-grey haze far off.
  float fog = 1.0 - exp(-t / 2600.0);
  col = mix(col, vec3(0.32, 0.3, 0.33) * 0.6 + uBoltC * uFlash * 0.08, fog);
  o = vec4(col, 1.0);
  gl_FragDepth = depthOf(t);
}`;

/* ---------- pass 3: the near heads, instanced ---------- */
// One instance: a stalk, a head and its awns, in one strip of 28 vertices.
export const HEAD_VS = `#version 300 es
precision highp float;
in vec4 aP;
in vec4 aQ;
uniform float uPxM;
${VIEW}
${NOISE}
${WIND}
${BOLT_LIGHT}
out vec3 vSide;
out vec3 vView;
out vec3 vAlb;
out vec3 vBd;
out float vU;
out float vK;
out float vThin;
out float vAo;
out float vBl;
out float vBend;
out float vPart;
out float vF;
void main() {
  int id = gl_VertexID;
  int part; float f; float side;
  if (id < 8) { part = 0; f = float(id / 2) / 3.0; side = float(id & 1); }
  else if (id == 8) { part = 0; f = 1.0; side = 1.0; }
  else if (id == 9) { part = 1; f = 0.0; side = 0.0; }
  else if (id < 22) { int k = id - 10; part = 1; f = float(k / 2) / 5.0; side = float(k & 1); }
  else if (id == 22) { part = 1; f = 1.0; side = 1.0; }
  else if (id == 23) { part = 2; f = 0.0; side = 0.0; }
  else { int k = id - 24; part = 2; f = float(k / 2); side = float(k & 1); }

  vec3 base = vec3(aP.x, 0.0, aP.y);
  float H = aQ.x, hl = 0.075 + 0.03 * aP.w;
  float Hs = H - hl;
  vec3 lw = lean(base.xz);
  // Each stalk flutters a little on its own.
  vec2 L = lw.xy * (Hs / 0.85) + WC * 0.012 * sin(uT * (5.0 + 3.0 * aP.z) + aP.z * 40.0) * (0.3 + abs(lw.z));
  float LL = dot(L, L) / (Hs * Hs);
  // The stalk bends like a cantilever; it keeps its length.
  float s0 = clamp((CANOPY - 0.32) / Hs, 0.0, 0.9);
  vec3 P, ax;
  float r, k = 1.0, thin;
  vec3 top = base + vec3(L.x, Hs * (1.0 - 0.45 * LL), L.y);
  vec3 tan0 = normalize(vec3(L.x * 1.5, Hs * (1.0 - 0.9 * LL), L.y * 1.5));
  // The head nods a little, mostly downwind.
  vec2 nd = normalize(WD * 0.8 + vec2(aQ.z, aQ.w) - 0.5) * (0.12 + 0.3 * aQ.z);
  vec3 hax = normalize(tan0 + vec3(nd.x, -0.05, nd.y));
  if (part == 0) {
    float s = mix(s0, 1.0, f);
    float fs = s * s * (3.0 - s) * 0.5, dfs = (6.0 * s - 3.0 * s * s) * 0.5;
    P = base + vec3(L.x * fs, Hs * s * (1.0 - 0.45 * LL * s), L.y * fs);
    ax = normalize(vec3(L.x * dfs, Hs, L.y * dfs));
    r = 0.0019; thin = 0.15;
  } else if (part == 1) {
    P = top + hax * hl * f;
    ax = hax;
    // A spindle: kernels swell the middle, the tip narrows.
    r = 0.002 + 0.0074 * sin(3.14159 * pow(max(f * 0.9 + 0.05, 0.0), 0.7));
    thin = 0.35;
  } else {
    // The awns: a pale fringe that fans out past the tip.
    P = top + hax * hl * (0.85 + 0.6 * f);
    ax = hax;
    r = 0.007 + 0.005 * f;
    k = 0.28;
    thin = 0.9;
  }
  vec3 cam = vec3(0.0, CAMH, 0.0);
  vec3 V = normalize(P - cam);
  vec3 S = normalize(cross(ax, V));
  // A head thinner than a pixel draws a pixel wide, at its true coverage.
  float mpp = (P.z) * uPxM;
  float w = max(r, 0.55 * mpp);
  k *= r / w;
  // Far heads fade into the canopy they stand on.
  k *= 1.0 - smoothstep(44.0, 60.0, P.z);
  P += S * w * (side * 2.0 - 1.0);
  gl_Position = clipOf(P);
  vSide = S;
  vView = -V;
  vU = side * 2.0 - 1.0;
  vK = k;
  vThin = thin;
  // The stand shades the low stalk; heads stand in the light.
  vAo = smoothstep(CANOPY - 0.32, CANOPY + 0.18, P.y);
  // Ripeness: patches of field, and each stalk a little on its own.
  float rp = vn2(base.xz * 0.045) * 0.7 + vn2(base.xz * 0.012 + 9.0) * 0.3 + 0.25 * (aQ.y - 0.5);
  vec3 ripe = mix(vec3(0.36, 0.14, 0.028), vec3(0.64, 0.33, 0.085), smoothstep(0.2, 0.8, rp));
  vAlb = part == 2 ? mix(ripe, vec3(0.78, 0.6, 0.34), 0.45) : part == 0 ? ripe * vec3(0.6, 0.62, 0.45) : ripe;
  vBl = boltAt(P, vBd);
  vBend = lw.z;
  vPart = float(part);
  vF = f;
}`;

export const HEAD_FS = `${HEAD}
in vec3 vSide;
in vec3 vView;
in vec3 vAlb;
in vec3 vBd;
in float vU;
in float vK;
in float vThin;
in float vAo;
in float vBl;
in float vBend;
in float vPart;
in float vF;
out vec4 o;
uniform float uMsaa;
${VIEW}
uniform vec3 uBoltC;
uniform float uFlash;
void main() {
  float u = clamp(vU, -1.0, 1.0);
  vec3 N = normalize(vSide * u + vView * sqrt(max(1.0 - u * u, 0.0)));
  // The side toward the sun takes the light; the far side goes dark.
  float lam = clamp(dot(N, SUN) * 0.6 + 0.45, 0.0, 1.0);
  vec3 alb = mix(vAlb, vec3(0.8, 0.64, 0.38), 0.4 * max(vBend, 0.0));
  // Spikelets in rows: the head is a stack of small bright scales.
  alb *= vPart > 0.5 && vPart < 1.5 ? 0.8 + 0.3 * sin(vF * 56.0 + vU * 1.6) : 1.0;
  vec3 col = alb * SUNC * 1.85 * lam * mix(0.2, 1.0, vAo) * (0.62 + 0.9 * vBend);
  col += alb * vec3(0.12, 0.13, 0.17) * mix(0.35, 1.0, vAo);
  // The strike: its near side lit, its thin parts glow when it stands behind.
  float bl = clamp(dot(N, vBd) * 0.5 + 0.5, 0.0, 1.0);
  float through = pow(max(dot(-vView, vBd), 0.0), 2.0) * vThin * (0.4 + 0.9 * abs(u));
  col += alb * uBoltC * (vBl * (0.3 + 0.9 * bl + 2.2 * through) + uFlash * 0.3) * mix(0.4, 1.0, vAo);
  // Round edges: alpha to coverage gives the soft rim.
  float a = vK * (1.0 - smoothstep(0.7, 1.0, abs(vU)));
  if (uMsaa < 0.5 && a < 0.4) discard;
  o = vec4(col, uMsaa < 0.5 ? 1.0 : a);
}`;

/* ---------- pass 4: the lightning channel ---------- */
// Each segment is a quad in screen space, so the channel keeps its width.
export const BOLT_VS = `#version 300 es
precision highp float;
in vec3 aA;
in vec3 aB;
in vec4 aW;
uniform vec2 uView;
uniform float uWidth, uGrow, uMain;
${VIEW}
out float vU;
out float vI;
void main() {
  vec4 ca = clipOf(aA), cb = clipOf(aB);
  vec2 sa = ca.xy / ca.w * 0.5 * uView, sb = cb.xy / cb.w * 0.5 * uView;
  vec2 d = sb - sa;
  float l = max(length(d), 1e-3);
  vec2 n = vec2(-d.y, d.x) / l;
  // aW: x the side, y the end, z the order along the path, w the brightness.
  vec4 c = aW.y > 0.5 ? cb : ca;
  // Branches carry less current: they are thinner and fainter.
  float w = uWidth * mix(0.45, 1.0, aW.w);
  // The ends overlap a little, so joints stay round.
  vec2 sp = (aW.y > 0.5 ? sb : sa) + n * w * (aW.x * 2.0 - 1.0) + d / l * w * 0.5 * (aW.y * 2.0 - 1.0);
  gl_Position = vec4(sp / (0.5 * uView) * c.w, c.z, c.w);
  vU = aW.x * 2.0 - 1.0;
  // The leader grows down; a restrike runs the main channel only.
  float on = step(aW.z, uGrow) * mix(1.0, step(0.99, aW.w), uMain);
  vI = on * aW.w;
}`;

export const BOLT_FS = `${HEAD}
in float vU;
in float vI;
out vec4 o;
uniform vec3 uCol;
uniform float uSharp;
void main() {
  float k = exp(-vU * vU * uSharp);
  o = vec4(uCol * k * vI, 0.0);
}`;

/* ---------- pass 5: grade and out ---------- */
export const FINAL_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame;
${OUTPUT}
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  // A soft vignette, a little wider than tall.
  vec2 v = (vUv - 0.5) * vec2(uAsp, 1.0) / max(uAsp, 1.0);
  c *= 1.0 - 0.55 * smoothstep(0.25, 0.95, dot(v, v) * 1.6);
  // Storm light: the shadows lean blue, the highlights stay warm.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c * vec3(0.9, 0.95, 1.12), c, smoothstep(0.02, 0.4, l));
  o = vec4(ouFilmAces(c, uExpo, gl_FragCoord.xy + uFrame * 7.0), 1.0);
}`;
