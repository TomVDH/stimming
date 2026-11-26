import * as THREE from 'three';
import type { BillDef, EllipseZone, RectZone } from './bills.ts';

export interface SharedLook {
  uTime: { value: number };
  uBackDir: { value: THREE.Vector3 };
  uExposure: { value: number };
  uRelief: { value: number };
  uFoil: { value: number };
  uTrans: { value: number };
  uGrain: { value: number };
}

export interface BillUniforms {
  [uniform: string]: THREE.IUniform<unknown>;
  uFront: { value: THREE.Texture };
  uBack: { value: THREE.Texture };
  uSize: { value: THREE.Vector2 };
  // x: camber X, y: cup Y, z: saddle twist, w: ripple.
  uBend: { value: THREE.Vector4 };
  // x: flutter amp, y: phase, z: spatial freq, w: background dim factor.
  uFlutter: { value: THREE.Vector4 };
  // x: crinkle wear (0..1), y: center wallet fold (-1..1), z: corner curl, w: seed.
  uCrinkle: { value: THREE.Vector4 };
  uTint: { value: THREE.Vector3 };
  uSecF0: { value: THREE.Vector4 };
  uSecF1: { value: THREE.Vector4 };
  uSecF2: { value: THREE.Vector4 };
  uSecFK: { value: THREE.Vector4 };
  uSecB0: { value: THREE.Vector4 };
  uSecB1: { value: THREE.Vector4 };
  uSecB2: { value: THREE.Vector4 };
  uSecBK: { value: THREE.Vector4 };
  uWinF0: { value: THREE.Vector4 };
  uWinF1: { value: THREE.Vector4 };
  uWinB0: { value: THREE.Vector4 };
  uWinB1: { value: THREE.Vector4 };
  uWaterF: { value: THREE.Vector4 };
  uWaterB: { value: THREE.Vector4 };
  // x: polymer flag, y: foil hue phase, z: foil gain, w: note relief scale.
  uMat: { value: THREE.Vector4 };
  uTexel: { value: THREE.Vector2 };
  uIsHero: { value: number };
  // Shared scene uniforms.
  uTime: { value: number };
  uBackDir: { value: THREE.Vector3 };
  uExposure: { value: number };
  uRelief: { value: number };
  uFoil: { value: number };
  uTrans: { value: number };
  uGrain: { value: number };
}

export function createSharedLook(): SharedLook {
  return {
    uTime: { value: 0 },
    uBackDir: { value: new THREE.Vector3(-0.08, 0.22, -0.97).normalize() },
    uExposure: { value: 1.14 },
    uRelief: { value: 0.92 },
    uFoil: { value: 1.18 },
    uTrans: { value: 1.55 },
    uGrain: { value: 0.92 },
  };
}

const VERT = /* glsl */ `
precision highp float;

uniform sampler2D uFront;
uniform sampler2D uBack;
uniform vec2 uSize;
uniform vec4 uBend;
uniform vec4 uFlutter;
uniform vec4 uCrinkle;
uniform vec4 uWinF0;
uniform vec4 uWinF1;
uniform vec4 uMat;
uniform float uIsHero;
uniform float uRelief;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldN;
varying vec3 vWorldT;
varying vec3 vWorldB;
varying float vCrease;

float inEllipseV(vec2 uv, vec4 e) {
  if (e.z <= 0.001 || e.w <= 0.001) return 0.0;
  vec2 d = (uv - e.xy) / e.zw;
  return 1.0 - smoothstep(0.82, 1.02, length(d));
}

// Smooth absolute value avoids zero-gradient kinks along wallet fold lines.
float sabs(float x, float eps) {
  return sqrt(x * x + eps * eps);
}

// Evaluates cloth bend, aero flutter, wallet folds, corner curls, and faceted crinkles.
float sheetZ(float nx, float ny, out float dzdnx, out float dzdny) {
  float bx = uBend.x;
  float by = uBend.y;
  float tw = uBend.z;
  float rp = uBend.w;

  float amp = uFlutter.x;
  float ph  = uFlutter.y;
  float frq = uFlutter.z;

  float z = bx * (nx * nx - 0.3333)
          + by * (ny * ny - 0.3333)
          + tw * nx * ny
          + rp * sin(nx * 2.4 + 0.6) * cos(ny * 1.8);

  float dnx = 2.0 * bx * nx + tw * ny + rp * 2.4 * cos(nx * 2.4 + 0.6) * cos(ny * 1.8);
  float dny = 2.0 * by * ny + tw * nx - rp * 1.8 * sin(nx * 2.4 + 0.6) * sin(ny * 1.8);

  // Aero flutter ripples strongest toward trailing edges.
  float edgeEnv = 0.20 + 0.80 * (nx * nx);
  float dEdgeEnv = 1.60 * nx;
  float waveArg = nx * frq + ny * 1.15 + ph;
  float sw = sin(waveArg);
  float cw = cos(waveArg);

  z += amp * edgeEnv * sw;
  dnx += amp * (dEdgeEnv * sw + edgeEnv * frq * cw);
  dny += amp * edgeEnv * 1.15 * cw;

  // Crumpled paper geometry: center wallet V-fold, quarter fold, dog-ears, and faceted rumples.
  float crk = uCrinkle.x;
  float fold = uCrinkle.y;
  float curl = uCrinkle.z;
  float sd = uCrinkle.w;

  if (abs(fold) > 0.002) {
    float ax = sabs(nx, 0.075);
    z += fold * (ax - 0.5);
    dnx += fold * (nx / ax);

    float ay = sabs(ny, 0.11);
    float qFold = fold * 0.38 * sin(sd * 2.1);
    z += qFold * (ay - 0.5);
    dny += qFold * (ny / ay);
  }

  if (abs(curl) > 0.002) {
    // Dog-eared opposite corners curl crisply off the plane.
    float c1 = max(0.0, nx + ny - 1.05);
    float c2 = max(0.0, -nx - ny - 1.05);
    z += curl * (c1 * c1 - c2 * c2 * 0.8);
    dnx += curl * (2.0 * c1 + 1.6 * c2);
    dny += curl * (2.0 * c1 + 1.6 * c2);
  }

  if (crk > 0.01) {
    // Ridged diagonal crumple waves give worn cash unmistakable rumpled facets.
    float p1 = nx * 4.3 + ny * 2.9 + sd;
    float p2 = nx * 6.8 - ny * 5.2 + sd * 1.7;
    float p3 = nx * 2.9 - ny * 4.1 + sd * 2.9;

    float s1 = sin(p1); float c1 = cos(p1);
    float s2 = sin(p2); float c2 = cos(p2);
    float s3 = sin(p3); float c3 = cos(p3);

    float r1 = sabs(s1, 0.14);
    float r2 = sabs(s2, 0.16);
    float k1 = crk * 0.088;
    float k2 = crk * 0.052;
    float k3 = crk * 0.044;

    z += k1 * (r1 - 0.62) + k2 * (r2 - 0.62) + k3 * s3;
    dnx += k1 * (s1 * c1 / r1) * 4.3 + k2 * (s2 * c2 / r2) * 6.8 + k3 * c3 * 2.9;
    dny += k1 * (s1 * c1 / r1) * 2.9 - k2 * (s2 * c2 / r2) * 5.2 - k3 * c3 * 4.1;
  }

  dzdnx = dnx;
  dzdny = dny;
  return z;
}

void main() {
  vUv = uv;
  float nx = uv.x * 2.0 - 1.0;
  float ny = uv.y * 2.0 - 1.0;

  float dzdnx = 0.0;
  float dzdny = 0.0;
  float z = sheetZ(nx, ny, dzdnx, dzdny);

  float bendE = min(0.36, abs(uBend.x) * 0.45 + abs(uBend.y) * 0.45 + abs(uFlutter.x) * 0.8 + abs(uCrinkle.y) * 0.35 + uCrinkle.x * 0.16);
  vec3 pos = vec3(
    position.x * (1.0 - bendE * 0.16),
    position.y * (1.0 - bendE * 0.12),
    position.z + z
  );

  float dzdx = dzdnx * (2.0 / max(0.01, uSize.x));
  float dzdy = dzdny * (2.0 / max(0.01, uSize.y));

  vec3 localT = normalize(vec3(1.0, 0.0, dzdx));
  vec3 localB = normalize(vec3(0.0, 1.0, dzdy));
  vec3 localN = normalize(cross(localT, localB));

  // Physical intaglio micro-displacement lifts engraved ink and portraits on the hero mesh.
  if (uIsHero > 0.5 && uRelief > 0.01) {
    vec3 fTex = texture2D(uFront, uv).rgb;
    vec3 bTex = texture2D(uBack, vec2(1.0 - uv.x, uv.y)).rgb;
    float fInk = clamp(1.0 - dot(fTex, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    float bInk = clamp(1.0 - dot(bTex, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    float win = max(inEllipseV(uv, uWinF0), inEllipseV(uv, uWinF1));
    float edgeFade = smoothstep(0.0, 0.025, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    float emboss = (fInk - bInk) * (1.0 - win * 0.85) * edgeFade;
    pos += localN * (emboss * 0.014 * uMat.w * uRelief);
  }

  mat3 m3 = mat3(modelMatrix);
  vWorldT = normalize(m3 * localT);
  vWorldB = normalize(m3 * localB);
  vWorldN = normalize(m3 * localN);

  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  vCrease = clamp(abs(dzdx) + abs(dzdy), 0.0, 2.0);

  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
precision highp float;

const float PI = 3.14159265359;

uniform sampler2D uFront;
uniform sampler2D uBack;
uniform vec4 uFlutter;
uniform vec4 uCrinkle;
uniform vec3 uTint;
uniform vec4 uSecF0;
uniform vec4 uSecF1;
uniform vec4 uSecF2;
uniform vec4 uSecFK;
uniform vec4 uSecB0;
uniform vec4 uSecB1;
uniform vec4 uSecB2;
uniform vec4 uSecBK;
uniform vec4 uWinF0;
uniform vec4 uWinF1;
uniform vec4 uWinB0;
uniform vec4 uWinB1;
uniform vec4 uWaterF;
uniform vec4 uWaterB;
uniform vec4 uMat;
uniform vec2 uTexel;
uniform float uIsHero;

uniform float uTime;
uniform vec3 uBackDir;
uniform float uExposure;
uniform float uRelief;
uniform float uFoil;
uniform float uTrans;
uniform float uGrain;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldN;
varying vec3 vWorldT;
varying vec3 vWorldB;
varying float vCrease;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// Fine anisotropic cotton-rag fibers plus mottled paper pulp for backlit translucency.
vec2 paperFibers(vec2 uv) {
  float f1 = vnoise(uv * vec2(260.0, 140.0));
  float f2 = vnoise(uv * vec2(580.0, 320.0) + 19.4);
  float f3 = vnoise(uv * vec2(160.0, 520.0) + 53.1);
  float fine = (f1 * 0.34 + f2 * 0.42 + f3 * 0.24) - 0.5;
  float pulp = (vnoise(uv * vec2(36.0, 22.0) + 7.3) * 0.58
              + vnoise(uv * vec2(84.0, 52.0) + 3.1) * 0.42) - 0.5;
  return vec2(fine, pulp);
}

// Cellular Voronoi facets create crisp micro-crumple creases on worn paper bills.
// Returns (facet slope height, sharp crease edge strength).
vec2 crinkleFacets(vec2 uv, float seed) {
  vec2 p = uv * vec2(8.5, 5.2) + vec2(seed * 1.7, seed * 0.9);
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  vec2 bestG = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bestG = r;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  float edge = sqrt(d2) - sqrt(d1);
  float creaseLine = 1.0 - smoothstep(0.015, 0.14, edge);
  float height = sqrt(d1) * 0.7 + dot(bestG, vec2(0.22, -0.18));
  return vec2(height, creaseLine);
}

float inRect(vec2 uv, vec4 r) {
  if (r.z <= r.x || r.w <= r.y) return 0.0;
  vec2 d0 = smoothstep(r.xy - 0.008, r.xy + 0.012, uv);
  vec2 d1 = 1.0 - smoothstep(r.zw - 0.012, r.zw + 0.008, uv);
  return d0.x * d0.y * d1.x * d1.y;
}

float inEllipse(vec2 uv, vec4 e) {
  if (e.z <= 0.001 || e.w <= 0.001) return 0.0;
  vec2 d = (uv - e.xy) / e.zw;
  return 1.0 - smoothstep(0.86, 1.03, length(d));
}

vec3 srgbToLinear(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}

vec3 agxDefaultContrastApprox(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return + 15.5 * x4 * x2
         - 40.14 * x4 * x
         + 31.96 * x4
         - 6.868 * x2 * x
         + 0.4298 * x2
         + 0.1191 * x
         - 0.00232;
}

vec3 agxDisplay(vec3 col) {
  const mat3 agxMat = mat3(
    0.842479062253094, 0.0423282422610123, 0.0423756549057051,
    0.0784335999999992, 0.878468636469772, 0.0784336,
    0.0792237451477643, 0.0791661274605434, 0.879142973793104
  );
  const mat3 agxInv = mat3(
    1.19687900512017, -0.0528968517574562, -0.0529716355144438,
    -0.0980208811401368, 1.15190312990417, -0.0980434501171241,
    -0.0990297440797205, -0.0989611768448433, 1.15107367264116
  );
  col = max(col, vec3(1e-6));
  col = agxMat * col;
  col = clamp((log2(col) + 12.47393) / 16.5, 0.0, 1.0);
  col = agxDefaultContrastApprox(col);
  col = agxInv * col;
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, 1.08);
  return clamp(col, 0.0, 1.0);
}

float D_GGX(float ndh, float rough) {
  float a = rough * rough;
  float a2 = a * a;
  float d = (ndh * ndh) * (a2 - 1.0) + 1.0;
  return a2 / max(PI * d * d, 1e-5);
}

float G_Smith(float ndv, float ndl, float rough) {
  float r = rough + 1.0;
  float k = (r * r) / 8.0;
  float gv = ndv / (ndv * (1.0 - k) + k);
  float gl = ndl / (ndl * (1.0 - k) + k);
  return gv * gl;
}

vec3 F_Schlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Sky environment matches the cobalt zenith, coral clouds, and warm golden sun.
vec3 studioEnv(vec3 R, float rough) {
  float sharp = mix(28.0, 2.2, rough);
  vec3 sunMir = normalize(vec3(uBackDir.x, uBackDir.y, -uBackDir.z));
  float sSun = pow(max(dot(R, sunMir), 0.0), sharp * 0.7);
  vec3 skyTop = normalize(vec3(0.35, 0.80, 0.48));
  float sTop = pow(max(dot(R, skyTop), 0.0), sharp);
  vec3 warmBounce = normalize(vec3(-0.45, -0.35, 0.82));
  float sBounce = pow(max(dot(R, warmBounce), 0.0), sharp * 0.5);

  vec3 amb = mix(vec3(0.18, 0.11, 0.18), vec3(0.08, 0.14, 0.34), R.y * 0.5 + 0.5);
  return amb
    + vec3(1.45, 1.02, 0.54) * sSun * 0.90
    + vec3(0.86, 0.92, 1.08) * sTop * 0.55
    + vec3(0.95, 0.58, 0.46) * sBounce * 0.35;
}

vec3 thinFilm(float phase) {
  return 0.52 + 0.48 * cos(6.28318 * (phase + vec3(0.0, 0.33, 0.67)));
}

vec3 shiftHue(vec3 col, float angle) {
  const vec3 k = vec3(0.57735);
  float c = cos(angle);
  return col * c + cross(k, col) * sin(angle) + k * dot(k, col) * (1.0 - c);
}

float sampleInk(bool front, vec2 uv) {
  vec3 c = front ? texture2D(uFront, uv).rgb : texture2D(uBack, uv).rgb;
  return clamp(1.0 - dot(c, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
}

// Evaluates PBR diffuse, GGX specular, cotton fiber sheen, and strong backlit paper SSS.
vec3 evalPaperLight(
  vec3 L, vec3 radiance, vec3 N, vec3 N0, vec3 V,
  vec3 albedo, vec3 F0, float metalness, float rough,
  vec3 sssTint, float sssThick, float sssGain, float polymer, float cottonSheen
) {
  float ndv = max(dot(N, V), 0.001);
  float ndl = max(dot(N, L), 0.0);

  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float vdh = max(dot(V, H), 0.0);

  vec3 F = F_Schlick(vdh, F0);
  float D = D_GGX(ndh, rough);
  float G = G_Smith(ndv, max(ndl, 0.001), rough);
  vec3 spec = (D * G * F) / max(4.0 * ndv * max(ndl, 0.001), 0.001);

  vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);
  float wrap = mix(0.16, 0.03, polymer);
  float diffNdl = clamp((dot(N, L) + wrap) / (1.0 + wrap), 0.0, 1.0);
  vec3 diff = (kD * albedo / PI) * diffNdl;

  float sheen = pow(1.0 - ndh, 4.0) * ndl * cottonSheen * 0.18;

  // Physical thin-sheet backlit transmission: diffuse back-hemisphere + forward Mie scattering.
  float backFace = clamp(dot(-N0, L), 0.0, 1.0);
  vec3 Hback = normalize(L + N0 * mix(0.45, 0.24, polymer));
  float forwardLobe = pow(clamp(dot(V, -Hback), 0.0, 1.0), mix(2.1, 4.0, polymer));
  vec3 absorb = exp(-sssThick * vec3(0.22, 0.54, 1.18));
  float transFactor = (forwardLobe * 1.45 + backFace * 0.92) * sssGain * (1.0 - metalness);
  vec3 sss = sssTint * absorb * transFactor;

  return (diff + vec3(sheen) + spec * ndl + sss) * radiance;
}

vec4 securityWeights(vec2 uv, vec4 r0, vec4 r1, vec4 r2, vec4 kinds) {
  vec4 w = vec4(0.0);
  float m0 = inRect(uv, r0);
  float m1 = inRect(uv, r1);
  float m2 = inRect(uv, r2);

  if (kinds.x > 0.5 && kinds.x < 1.5) w.x = max(w.x, m0);
  else if (kinds.x < 2.5 && kinds.x > 1.5) w.y = max(w.y, m0);
  else if (kinds.x < 3.5 && kinds.x > 2.5) w.z = max(w.z, m0);
  else if (kinds.x > 3.5) w.w = max(w.w, m0);

  if (kinds.y > 0.5 && kinds.y < 1.5) w.x = max(w.x, m1);
  else if (kinds.y < 2.5 && kinds.y > 1.5) w.y = max(w.y, m1);
  else if (kinds.y < 3.5 && kinds.y > 2.5) w.z = max(w.z, m1);
  else if (kinds.y > 3.5) w.w = max(w.w, m1);

  if (kinds.z > 0.5 && kinds.z < 1.5) w.x = max(w.x, m2);
  else if (kinds.z < 2.5 && kinds.z > 1.5) w.y = max(w.y, m2);
  else if (kinds.z < 3.5 && kinds.z > 2.5) w.z = max(w.z, m2);
  else if (kinds.z > 3.5) w.w = max(w.w, m2);

  return w;
}

void main() {
  bool front = gl_FrontFacing;
  vec2 baseUv = front ? vUv : vec2(1.0 - vUv.x, vUv.y);

  vec3 T = normalize(vWorldT) * (front ? 1.0 : -1.0);
  vec3 B = normalize(vWorldB);
  vec3 N0 = normalize(vWorldN) * (front ? 1.0 : -1.0);
  vec3 V = normalize(cameraPosition - vWorldPos);

  float polymer = uMat.x;
  float foilHue = uMat.y;
  float foilGain = uMat.z * uFoil;
  float noteRelief = uMat.w * uRelief;
  float crinkleAmt = uCrinkle.x;
  float crinkleSeed = uCrinkle.w;

  vec4 w0 = front ? uWinF0 : uWinB0;
  vec4 w1 = front ? uWinF1 : uWinB1;
  float inMainWin = inEllipse(baseUv, w0);
  float inCameoWin = inEllipse(baseUv, w1);
  float inAnyWin = max(inMainWin, inCameoWin);

  // Parallax relief gives raised intaglio strokes tangible depth when tilted.
  vec2 uv = baseUv;
  if (uIsHero > 0.5 && noteRelief > 0.02 && inAnyWin < 0.85) {
    vec3 vTs = vec3(dot(V, T), dot(V, B), max(0.32, dot(V, N0)));
    vec2 pDir = (vTs.xy / vTs.z) * (0.0038 * noteRelief * (1.0 - inAnyWin));
    float h = sampleInk(front, uv);
    uv -= pDir * (h - 0.35) * 0.45;
    h = sampleInk(front, uv);
    uv -= pDir * (h - 0.35) * 0.35;
    h = sampleInk(front, uv);
    uv -= pDir * (h - 0.35) * 0.25;
    uv = clamp(uv, vec2(0.001), vec2(0.999));
  }
  vec2 oppUv = vec2(1.0 - uv.x, uv.y);

  vec3 texSrgb = front ? texture2D(uFront, uv).rgb : texture2D(uBack, uv).rgb;
  vec3 oppSrgb = front ? texture2D(uBack, oppUv).rgb : texture2D(uFront, oppUv).rgb;
  vec3 albedo = srgbToLinear(texSrgb);
  vec3 oppAlbedo = srgbToLinear(oppSrgb);
  albedo = pow(max(albedo, vec3(0.0001)), vec3(1.03));

  float mc = dot(texSrgb, vec3(0.299, 0.587, 0.114));
  float inkAmount = clamp(1.0 - mc, 0.0, 1.0);
  float inkSat = max(texSrgb.r, max(texSrgb.g, texSrgb.b)) - min(texSrgb.r, min(texSrgb.g, texSrgb.b));

  // Clear polymer cutouts isolate dark backdrop voids inside Mark's windows.
  float darkVoid = (1.0 - smoothstep(0.19, 0.31, mc)) * (1.0 - smoothstep(0.07, 0.17, inkSat));
  float isClearMain = inMainWin * darkVoid;
  float isClearCameo = inCameoWin * (1.0 - smoothstep(0.20, 0.36, mc)) * (1.0 - smoothstep(0.08, 0.18, inkSat));
  float isClearGlass = max(isClearMain, isClearCameo * 0.78);
  float isFrostedCameo = inCameoWin * (1.0 - isClearCameo);

  // Dual-scale intaglio relief: 1-texel hairline Scharr plus 2.6-texel macro emboss gradient.
  vec2 du1 = vec2(uTexel.x, 0.0);
  vec2 dv1 = vec2(0.0, uTexel.y);
  float tl = sampleInk(front, uv - du1 + dv1);
  float tc = sampleInk(front, uv + dv1);
  float tr = sampleInk(front, uv + du1 + dv1);
  float ml = sampleInk(front, uv - du1);
  float mr = sampleInk(front, uv + du1);
  float bl = sampleInk(front, uv - du1 - dv1);
  float bc = sampleInk(front, uv - dv1);
  float br = sampleInk(front, uv + du1 - dv1);

  float fineX = ((tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl)) * 0.25;
  float fineY = ((tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br)) * 0.25;

  vec2 du2 = vec2(uTexel.x * 2.6, 0.0);
  vec2 dv2 = vec2(0.0, uTexel.y * 2.6);
  float broadX = (sampleInk(front, uv + du2) - sampleInk(front, uv - du2)) * 0.5;
  float broadY = (sampleInk(front, uv + dv2) - sampleInk(front, uv - dv2)) * 0.5;

  float reliefX = fineX * 0.72 + broadX * 0.58;
  float reliefY = fineY * 0.72 + broadY * 0.58;

  float lap = inkAmount - 0.25 * (tc + bc + ml + mr);
  albedo *= clamp(1.0 - lap * (0.20 + 0.24 * uIsHero), 0.84, 1.18);

  float ridgeSlope = length(vec2(reliefX, reliefY));
  float inkAO = 1.0 - clamp(ridgeSlope * 0.28 * noteRelief * (1.0 - isClearGlass), 0.0, 0.24);

  // Micro-crinkle Voronoi facets add crisp paper folds and faint worn-ink crease lines.
  float crkNx = 0.0;
  float crkNy = 0.0;
  float creaseWear = 0.0;
  if (crinkleAmt > 0.04 && isClearGlass < 0.8) {
    vec2 cf0 = crinkleFacets(vUv, crinkleSeed);
    float cfX = crinkleFacets(vUv + vec2(0.006, 0.0), crinkleSeed).x;
    float cfY = crinkleFacets(vUv + vec2(0.0, 0.006), crinkleSeed).x;
    float foldLine = 1.0 - smoothstep(0.0, 0.028, abs(vUv.x - 0.5));
    float cScale = crinkleAmt * (1.0 - polymer * 0.45);
    crkNx = (cfX - cf0.x) * 16.0 * cScale;
    crkNy = (cfY - cf0.x) * 16.0 * cScale;
    creaseWear = (cf0.y * 0.55 + foldLine * abs(uCrinkle.y) * 1.4) * cScale;
    // Creased ink wears lightly toward pale cotton fibers along sharp folds.
    albedo = mix(albedo, mix(albedo, uTint * 0.85, 0.35), clamp(creaseWear * 0.24 * (1.0 - polymer), 0.0, 0.22));
  }

  float grainScale = (1.0 - polymer * 0.88) * uGrain;
  vec2 fib0 = paperFibers(uv);
  float f1 = paperFibers(uv + vec2(0.0017, 0.0)).x;
  float f2 = paperFibers(uv + vec2(0.0, 0.0017)).x;

  float inkBump = (0.34 + 0.46 * uIsHero) * noteRelief * (1.0 - isClearGlass);
  float fiberAmt = (0.20 + 0.18 * uIsHero) * grainScale;

  albedo *= (1.0 + fib0.x * 0.048 * grainScale * (1.0 - inkAmount * 0.55)) * inkAO;

  vec3 N = normalize(
    N0
    - T * (reliefX * inkBump + (f1 - fib0.x) * fiberAmt + crkNx * 0.42)
    - B * (reliefY * inkBump + (f2 - fib0.x) * fiberAmt + crkNy * 0.42)
  );

  float ndv = max(dot(N, V), 0.001);
  float fres = pow(1.0 - ndv, 4.0);

  // Classify security zones: x hologram, y metallic foil, z OVI ink, w security thread.
  vec4 secW = front
    ? securityWeights(uv, uSecF0, uSecF1, uSecF2, uSecFK)
    : securityWeights(uv, uSecB0, uSecB1, uSecB2, uSecBK);

  float printedInk = smoothstep(0.14, 0.40, inkAmount + inkSat * 1.45) * (1.0 - isClearGlass);
  float brightFoil = smoothstep(0.08, 0.34, inkSat * 1.35 + (1.0 - abs(mc - 0.52) * 1.5)) * (1.0 - isClearGlass);

  float holoK   = clamp(secW.x * max(printedInk, brightFoil * 0.85) * foilGain, 0.0, 1.0);
  float metalK  = clamp(secW.y * max(printedInk, brightFoil * 0.90) * foilGain, 0.0, 1.0);
  float oviK    = clamp(secW.z * printedInk * foilGain, 0.0, 1.0);
  float threadK = clamp(secW.w * smoothstep(0.18, 0.48, inkAmount + inkSat * 1.2) * foilGain, 0.0, 1.0);

  if (holoK > 0.01 || threadK > 0.01) {
    float gFreq = mix(220.0, 340.0, threadK);
    float groove = sin((uv.x * 0.8 + uv.y * 0.6) * gFreq + dot(T, V) * 9.0);
    N = normalize(N + (T * 0.06 + B * 0.04) * groove * max(holoK, threadK));
  }

  vec3 surfAlbedo = albedo;
  if (oviK > 0.01) {
    float shiftAngle = (1.0 - ndv) * 2.25 + dot(T, V) * 0.72;
    vec3 shifted = shiftHue(surfAlbedo, shiftAngle);
    surfAlbedo = mix(surfAlbedo, shifted * 1.20, oviK * 0.84);
  }

  float baseRough = mix(0.88, 0.34, polymer);
  float inkRough = mix(baseRough, 0.46, inkAmount * (1.0 - polymer * 0.55));
  float rough = clamp(inkRough + fib0.x * 0.06 * grainScale, 0.22, 0.95);
  rough = mix(rough, 0.26, oviK * 0.72);
  rough = mix(rough, 0.18, metalK * 0.86);
  rough = mix(rough, 0.15, max(holoK, threadK) * 0.90);

  float metalness = clamp(metalK * 0.86 + holoK * 0.88 + threadK * 0.92 + oviK * 0.36, 0.0, 0.94);

  vec3 dielecF0 = vec3(mix(0.028, 0.046, polymer));
  vec3 goldTint = mix(vec3(0.98, 0.80, 0.38), clamp(albedo * 1.65 + 0.18, 0.2, 1.0), 0.55);
  vec3 holoSpecPhase = thinFilm(
    dot(N, V) * 2.8 + dot(T, V) * 2.3 + dot(B, V) * 1.2 + uv.x * 1.8 + uv.y * 0.9 + foilHue * 0.25
  );
  vec3 threadSpec = mix(vec3(0.82, 0.90, 0.99), thinFilm(dot(T, V) * 3.2 + uv.y * 4.5 + foilHue), 0.64);

  vec3 metalF0 = goldTint;
  if (holoK > metalK) metalF0 = mix(vec3(0.86), holoSpecPhase, 0.78);
  if (threadK > max(holoK, metalK)) metalF0 = threadSpec;
  if (oviK > max(metalK, max(holoK, threadK))) metalF0 = mix(vec3(0.75), surfAlbedo * 1.45, 0.65);

  vec3 F0 = mix(dielecF0, metalF0, metalness);

  // Backlit paper translucency: thin watermarks, mottled cotton pulp, and reverse ink bleed.
  vec4 waterRect = front ? uWaterF : uWaterB;
  float inWatermark = inRect(uv, waterRect) * (1.0 - polymer * 0.68);
  float oppLum = dot(oppAlbedo, vec3(0.299, 0.587, 0.114));
  float oppInk = clamp(1.0 - oppLum, 0.0, 1.0);

  float baseThick = mix(0.56, 0.20, inWatermark) + fib0.y * 0.22 * grainScale - creaseWear * 0.08;
  float sssThick = clamp(baseThick + inkAmount * 0.52 + oppInk * 1.05, 0.14, 1.80);
  // Dark ink on the reverse face casts a real backlit shadow through the glowing cotton fibers.
  vec3 bleedMask = mix(vec3(1.0), oppAlbedo * 0.78 + vec3(0.06), 0.78 + 0.20 * inWatermark);
  vec3 sssTint = mix(surfAlbedo, uTint * vec3(1.05, 0.97, 0.86), 0.52) * bleedMask;

  // Bills passing near the backlit sun core glow noticeably brighter and warmer.
  float sunAlign = exp(-length(vWorldPos.xy - vec2(-0.5, 0.8)) * 0.16);
  float sssGain = uTrans * mix(0.95, 0.26, polymer) * (1.0 + 0.65 * inWatermark) * (0.76 + 0.62 * sunAlign) * (1.0 - isClearGlass);
  float cottonSheen = (1.0 - polymer) * (1.0 - metalness) * (1.0 - isClearGlass);

  // True backlit scene rig: strong golden sun behind the bills + soft sky bounce in front.
  // No cursor-following highlight; tilting a bill naturally sweeps it through the scene lights.
  vec3 Lback  = normalize(uBackDir);
  vec3 Lsky   = normalize(vec3(0.42, 0.64, 0.64));
  vec3 Lwarm  = normalize(vec3(-0.58, -0.18, 0.79));

  vec3 Cback = vec3(4.20, 3.25, 2.05);
  vec3 Csky  = vec3(1.38, 1.42, 1.54);
  vec3 Cwarm = vec3(0.62, 0.56, 0.68);

  vec3 Lo = vec3(0.0);
  Lo += evalPaperLight(Lback, Cback, N, N0, V, surfAlbedo, F0, metalness, rough, sssTint, sssThick, sssGain * 1.75, polymer, cottonSheen);
  Lo += evalPaperLight(Lsky,  Csky,  N, N0, V, surfAlbedo, F0, metalness, rough, sssTint, sssThick, sssGain * 0.38, polymer, cottonSheen);
  Lo += evalPaperLight(Lwarm, Cwarm, N, N0, V, surfAlbedo, F0, metalness, rough, sssTint, sssThick, sssGain * 0.25, polymer, cottonSheen);

  vec3 R = reflect(-V, N);
  vec3 envSpec = studioEnv(R, rough);
  vec3 envDiff = mix(vec3(0.11, 0.085, 0.145), vec3(0.16, 0.17, 0.23), N.y * 0.5 + 0.5);
  vec3 Fenv = F_Schlick(ndv, F0);
  Lo += (vec3(1.0) - Fenv) * (1.0 - metalness) * surfAlbedo * envDiff
      + envSpec * Fenv * mix(1.0 - rough * 0.52, 1.25, metalness);

  // Diffraction rainbow flash on holograms and windowed threads from scene sky & sun.
  if (holoK > 0.01 || threadK > 0.01) {
    vec3 Hsky = normalize(Lsky + V);
    vec3 Hwarm = normalize(Lwarm + V);
    vec3 HsunMir = normalize(vec3(-Lback.x, Lback.y, abs(Lback.z)) + V);
    float dSpec = pow(max(dot(N, Hsky), 0.0), 22.0) * 1.10
                + pow(max(dot(N, Hwarm), 0.0), 16.0) * 0.72
                + pow(max(dot(N, HsunMir), 0.0), 18.0) * 0.85
                + fres * 0.42;
    float grating = 0.62 + 0.38 * sin((uv.x * 16.0 - uv.y * 11.0) + dot(T, V) * 15.0);
    Lo += holoSpecPhase * dSpec * grating * (holoK * 1.05 + threadK * 0.90);
  }

  // Rolling Spark specular highlight on OVI colour-shifting numerals.
  if (oviK > 0.01) {
    float sparkBand = pow(max(dot(N, normalize(Lsky + V)), 0.0), 18.0) * 0.82
                    + pow(max(dot(N, normalize(Lwarm + V)), 0.0), 14.0) * 0.52;
    Lo += shiftHue(vec3(0.92, 0.78, 0.54), (1.0 - ndv) * 2.5 + foilHue) * sparkBand * oviK * 0.62;
  }

  // Glossy optical polymer clearcoat and clear see-through window Fresnel reflection.
  if (polymer > 0.5) {
    vec3 R0 = reflect(-V, N0);
    vec3 winEnv = studioEnv(R0, mix(0.13, 0.06, isClearGlass));
    float ccF = F_Schlick(ndv, vec3(0.055)).r;
    float ccSky = D_GGX(max(dot(N0, normalize(Lsky + V)), 0.0), 0.13) * 0.024;
    vec3 glassGlint = (Csky * ccSky + winEnv * mix(0.45, 1.45, isClearGlass)) * ccF;
    Lo = mix(Lo + glassGlint, glassGlint + vec3(0.08, 0.09, 0.13) * (0.32 + fres * 0.82) + thinFilm(ndv * 3.0) * fres * 0.14, isClearGlass);
  }

  // Warm backlit rim glow lights up cut paper edges against the sky.
  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float cutBevel = 1.0 - smoothstep(0.0, 0.011, edge);
  Lo += mix(uTint, vec3(1.0, 0.84, 0.52), 0.58) * cutBevel * (0.14 + 0.30 * fres);

  float creaseAO = 1.0 - clamp(vCrease * 0.10 + creaseWear * 0.11, 0.0, 0.26);
  vec3 col = Lo * creaseAO * uExposure * uFlutter.w;
  col = agxDisplay(col);

  // Crystal-clear transparency on Mark's polymer windows; soft optical diffusion on backlit cotton.
  float alpha = 1.0;
  if (polymer > 0.5) {
    float winAlpha = clamp(0.09 + fres * 0.56, 0.09, 0.72);
    alpha = mix(alpha, winAlpha, isClearGlass);
    alpha = mix(alpha, 0.80 + fres * 0.15, isFrostedCameo * 0.65);
  } else {
    float backLit = clamp(dot(-N0, Lback) * 0.7 + 0.3, 0.0, 1.0);
    float thinCotton = (0.32 + 0.68 * inWatermark) * (1.0 - inkAmount) * (1.0 - oppInk) * backLit;
    alpha = 1.0 - thinCotton * 0.12 * clamp(uTrans * 0.65, 0.0, 1.25);
  }

  gl_FragColor = vec4(col, alpha);
}
`;

function rectVec4(r: RectZone): THREE.Vector4 {
  return new THREE.Vector4(r[0], r[1], r[2], r[3]);
}

function ellVec4(e: EllipseZone): THREE.Vector4 {
  return new THREE.Vector4(e[0], e[1], e[2], e[3]);
}

export function applyBillUniforms(u: BillUniforms, def: BillDef, front: THREE.Texture, back: THREE.Texture, width: number, height: number) {
  u.uFront.value = front;
  u.uBack.value = back;
  u.uSize.value.set(width, height);
  u.uTint.value.set(def.tint[0], def.tint[1], def.tint[2]);

  u.uSecF0.value.set(...def.secFront[0].rect);
  u.uSecF1.value.set(...def.secFront[1].rect);
  u.uSecF2.value.set(...def.secFront[2].rect);
  u.uSecFK.value.set(def.secFront[0].kind, def.secFront[1].kind, def.secFront[2].kind, 0);

  u.uSecB0.value.set(...def.secBack[0].rect);
  u.uSecB1.value.set(...def.secBack[1].rect);
  u.uSecB2.value.set(...def.secBack[2].rect);
  u.uSecBK.value.set(def.secBack[0].kind, def.secBack[1].kind, def.secBack[2].kind, 0);

  u.uWinF0.value.set(...def.windowsFront[0]);
  u.uWinF1.value.set(...def.windowsFront[1]);
  u.uWinB0.value.set(...def.windowsBack[0]);
  u.uWinB1.value.set(...def.windowsBack[1]);

  u.uWaterF.value.set(...def.watermarkFront);
  u.uWaterB.value.set(...def.watermarkBack);
  u.uMat.value.set(def.polymer ? 1 : 0, def.foilHue, def.foilGain, def.relief);

  const img = front.image as { width?: number; height?: number } | undefined;
  u.uTexel.value.set(1 / (img?.width || 1400), 1 / (img?.height || 760));
}

export function createBillMaterial(
  def: BillDef,
  front: THREE.Texture,
  back: THREE.Texture,
  shared: SharedLook,
  width: number,
  height: number,
  isHero: boolean,
): THREE.ShaderMaterial {
  const img = front.image as { width?: number; height?: number } | undefined;
  const tw = img?.width || 1400;
  const th = img?.height || 760;

  const uniforms: BillUniforms = {
    uFront: { value: front },
    uBack: { value: back },
    uSize: { value: new THREE.Vector2(width, height) },
    uBend: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFlutter: { value: new THREE.Vector4(0, 0, 4.2, 1.0) },
    uCrinkle: { value: new THREE.Vector4(0, 0, 0, 1.0) },
    uTint: { value: new THREE.Vector3(def.tint[0], def.tint[1], def.tint[2]) },
    uSecF0: { value: rectVec4(def.secFront[0].rect) },
    uSecF1: { value: rectVec4(def.secFront[1].rect) },
    uSecF2: { value: rectVec4(def.secFront[2].rect) },
    uSecFK: { value: new THREE.Vector4(def.secFront[0].kind, def.secFront[1].kind, def.secFront[2].kind, 0) },
    uSecB0: { value: rectVec4(def.secBack[0].rect) },
    uSecB1: { value: rectVec4(def.secBack[1].rect) },
    uSecB2: { value: rectVec4(def.secBack[2].rect) },
    uSecBK: { value: new THREE.Vector4(def.secBack[0].kind, def.secBack[1].kind, def.secBack[2].kind, 0) },
    uWinF0: { value: ellVec4(def.windowsFront[0]) },
    uWinF1: { value: ellVec4(def.windowsFront[1]) },
    uWinB0: { value: ellVec4(def.windowsBack[0]) },
    uWinB1: { value: ellVec4(def.windowsBack[1]) },
    uWaterF: { value: rectVec4(def.watermarkFront) },
    uWaterB: { value: rectVec4(def.watermarkBack) },
    uMat: { value: new THREE.Vector4(def.polymer ? 1 : 0, def.foilHue, def.foilGain, def.relief) },
    uTexel: { value: new THREE.Vector2(1 / tw, 1 / th) },
    uIsHero: { value: isHero ? 1 : 0 },
    uTime: shared.uTime,
    uBackDir: shared.uBackDir,
    uExposure: shared.uExposure,
    uRelief: shared.uRelief,
    uFoil: shared.uFoil,
    uTrans: shared.uTrans,
    uGrain: shared.uGrain,
  };

  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
  });
}
