import * as THREE from 'three';
import type { BillDef, EllipseZone, RectZone } from './bills.ts';

export interface SharedLook {
  uTime: { value: number };
  uBackDir: { value: THREE.Vector3 };
  uShadowMap: { value: THREE.Texture | null };
  uShadowMatrix: { value: THREE.Matrix4 };
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
  uMaskFront: { value: THREE.Texture };
  uMaskBack: { value: THREE.Texture };
  uSize: { value: THREE.Vector2 };
  // x: camber X, y: cup Y, z: saddle twist, w: ripple.
  uBend: { value: THREE.Vector4 };
  // x: flutter amp, y: phase, z: spatial freq, w: background dim factor.
  uFlutter: { value: THREE.Vector4 };
  // x: crease wear (0..1), y: clean center wallet fold (-1..1), z: corner curl, w: crease seed.
  uCrinkle: { value: THREE.Vector4 };
  uOpacity: { value: number };
  uTint: { value: THREE.Vector3 };
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
  uTime: { value: number };
  uBackDir: { value: THREE.Vector3 };
  uShadowMap: { value: THREE.Texture | null };
  uShadowMatrix: { value: THREE.Matrix4 };
  uExposure: { value: number };
  uRelief: { value: number };
  uFoil: { value: number };
  uTrans: { value: number };
  uGrain: { value: number };
}

export function createSharedLook(): SharedLook {
  return {
    uTime: { value: 0 },
    uBackDir: { value: new THREE.Vector3(-0.10, 0.16, -0.98).normalize() },
    uShadowMap: { value: null },
    uShadowMatrix: { value: new THREE.Matrix4() },
    uExposure: { value: 0.94 },
    uRelief: { value: 0.82 },
    uFoil: { value: 1.05 },
    uTrans: { value: 0.65 },
    uGrain: { value: 0.85 },
  };
}

const SHEET_DEFORM_GLSL = /* glsl */ `
float sabs(float x, float eps) {
  return sqrt(x * x + eps * eps);
}

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

  float edgeEnv = 0.20 + 0.80 * (nx * nx);
  float dEdgeEnv = 1.60 * nx;
  float waveArg = nx * frq + ny * 1.15 + ph;
  float sw = sin(waveArg);
  float cw = cos(waveArg);

  z += amp * edgeEnv * sw;
  dnx += amp * (dEdgeEnv * sw + edgeEnv * frq * cw);
  dny += amp * edgeEnv * 1.15 * cw;

  // Clean straight wallet fold and corner dog-ear.
  float fold = uCrinkle.y;
  float curl = uCrinkle.z;
  float sd = uCrinkle.w;

  if (abs(fold) > 0.002) {
    float ax = sabs(nx, 0.045);
    z += fold * (ax - 0.48);
    dnx += fold * (nx / ax);

    float qWeight = smoothstep(0.32, 0.58, abs(fold)) * sin(sd * 2.1);
    if (abs(qWeight) > 0.02) {
      float uFold = nx * 0.35 + ny * 0.94;
      float au = sabs(uFold, 0.065);
      float qAmp = fold * 0.36 * qWeight;
      z += qAmp * (au - 0.44);
      dnx += qAmp * (uFold / au) * 0.35;
      dny += qAmp * (uFold / au) * 0.94;
    }
  }

  if (abs(curl) > 0.002) {
    float c1 = max(0.0, nx + ny - 1.18);
    float c2 = max(0.0, -nx - ny - 1.18);
    z += curl * (c1 * c1 - c2 * c2 * 0.75);
    dnx += curl * (2.0 * c1 + 1.5 * c2);
    dny += curl * (2.0 * c1 + 1.5 * c2);
  }

  dzdnx = dnx;
  dzdny = dny;
  return z;
}
`;

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

${SHEET_DEFORM_GLSL}

void main() {
  vUv = uv;
  float nx = uv.x * 2.0 - 1.0;
  float ny = uv.y * 2.0 - 1.0;

  float dzdnx = 0.0;
  float dzdny = 0.0;
  float z = sheetZ(nx, ny, dzdnx, dzdny);

  float bendE = min(0.32, abs(uBend.x) * 0.45 + abs(uBend.y) * 0.45 + abs(uFlutter.x) * 0.8 + abs(uCrinkle.y) * 0.34);
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

  if (uIsHero > 0.5 && uRelief > 0.01) {
    vec3 fTex = texture2D(uFront, uv).rgb;
    vec3 bTex = texture2D(uBack, vec2(1.0 - uv.x, uv.y)).rgb;
    float fInk = clamp(1.0 - dot(fTex, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    float bInk = clamp(1.0 - dot(bTex, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    float win = max(inEllipseV(uv, uWinF0), inEllipseV(uv, uWinF1));
    float edgeFade = smoothstep(0.0, 0.025, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    float emboss = (fInk - bInk) * (1.0 - win * 0.85) * edgeFade;
    pos += localN * (emboss * 0.012 * uMat.w * uRelief);
  }

  mat3 m3 = mat3(modelMatrix);
  vWorldT = normalize(m3 * localT);
  vWorldB = normalize(m3 * localB);
  vWorldN = normalize(m3 * localN);

  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  vCrease = clamp(abs(dzdx) + abs(dzdy), 0.0, 1.8);

  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const DEPTH_VERT = /* glsl */ `
precision highp float;

uniform vec2 uSize;
uniform vec4 uBend;
uniform vec4 uFlutter;
uniform vec4 uCrinkle;

varying vec2 vUv;

${SHEET_DEFORM_GLSL}

void main() {
  vUv = uv;
  float nx = uv.x * 2.0 - 1.0;
  float ny = uv.y * 2.0 - 1.0;

  float dzdnx = 0.0;
  float dzdny = 0.0;
  float z = sheetZ(nx, ny, dzdnx, dzdny);

  float bendE = min(0.32, abs(uBend.x) * 0.45 + abs(uBend.y) * 0.45 + abs(uFlutter.x) * 0.8 + abs(uCrinkle.y) * 0.34);
  vec3 pos = vec3(
    position.x * (1.0 - bendE * 0.16),
    position.y * (1.0 - bendE * 0.12),
    position.z + z
  );

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const DEPTH_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uFront;
uniform sampler2D uBack;
uniform vec4 uWinF0;
uniform vec4 uWinF1;
uniform vec4 uWinB0;
uniform vec4 uWinB1;
uniform vec4 uMat;
uniform float uOpacity;

varying vec2 vUv;

float inEllipseD(vec2 uv, vec4 e) {
  if (e.z <= 0.001 || e.w <= 0.001) return 0.0;
  vec2 d = (uv - e.xy) / e.zw;
  return 1.0 - smoothstep(0.86, 1.03, length(d));
}

void main() {
  if (uOpacity < 0.25) discard;
  if (uMat.x > 0.5) {
    bool front = gl_FrontFacing;
    vec2 uv = front ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec4 w0 = front ? uWinF0 : uWinB0;
    vec4 w1 = front ? uWinF1 : uWinB1;
    float inWin = max(inEllipseD(uv, w0), inEllipseD(uv, w1) * 0.75);
    if (inWin > 0.5) {
      vec3 c = front ? texture2D(uFront, uv).rgb : texture2D(uBack, uv).rgb;
      float mc = dot(c, vec3(0.299, 0.587, 0.114));
      float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
      if (mc < 0.26 && sat < 0.14) discard;
    }
  }
  gl_FragColor = vec4(1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;

const float PI = 3.14159265359;

uniform sampler2D uFront;
uniform sampler2D uBack;
uniform sampler2D uMaskFront;
uniform sampler2D uMaskBack;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform vec4 uFlutter;
uniform vec4 uCrinkle;
uniform float uOpacity;
uniform vec3 uTint;
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

vec2 paperFibers(vec2 uv) {
  float f1 = vnoise(uv * vec2(260.0, 140.0));
  float f2 = vnoise(uv * vec2(580.0, 320.0) + 19.4);
  float f3 = vnoise(uv * vec2(160.0, 520.0) + 53.1);
  float fine = (f1 * 0.34 + f2 * 0.42 + f3 * 0.24) - 0.5;
  float pulp = (vnoise(uv * vec2(34.0, 20.0) + 7.3) * 0.58
              + vnoise(uv * vec2(80.0, 48.0) + 3.1) * 0.42) - 0.5;
  return vec2(fine, pulp);
}

float sampleShadow(vec3 worldPos, vec3 N0) {
  if (uIsHero > 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(worldPos + N0 * 0.045, 1.0);
  vec3 proj = sc.xyz / max(sc.w, 0.0001);
  if (proj.x < 0.01 || proj.x > 0.99 || proj.y < 0.01 || proj.y > 0.99 || proj.z > 0.999) {
    return 1.0;
  }
  float curD = proj.z - 0.0045;
  float texel = 2.2 / 1024.0;
  float lit = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 off = vec2(float(x), float(y)) * texel;
      float mapD = texture2D(uShadowMap, proj.xy + off).r;
      lit += curD <= mapD ? 1.0 : 0.0;
    }
  }
  return mix(0.28, 1.0, lit / 9.0);
}

float inRect(vec2 uv, vec4 r) {
  if (r.z <= r.x || r.w <= r.y) return 0.0;
  vec2 d0 = smoothstep(r.xy - 0.004, r.xy + 0.006, uv);
  vec2 d1 = 1.0 - smoothstep(r.zw - 0.006, r.zw + 0.004, uv);
  return d0.x * d0.y * d1.x * d1.y;
}

float inEllipse(vec2 uv, vec4 e) {
  if (e.z <= 0.001 || e.w <= 0.001) return 0.0;
  vec2 d = (uv - e.xy) / e.zw;
  return 1.0 - smoothstep(0.86, 1.03, length(d));
}

vec3 srgbToLinear(vec3 c) {
  vec3 cc = max(c, vec3(0.0));
  vec3 lo = cc / 12.92;
  vec3 hi = pow((cc + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), cc));
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
  col = mix(vec3(luma), col, 1.06);
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

vec3 studioEnv(vec3 R, float rough) {
  float sharp = mix(32.0, 2.4, rough);
  vec3 boxTop = normalize(vec3(0.45, 0.76, 0.47));
  float sTop = pow(max(dot(R, boxTop), 0.0), sharp);
  vec3 boxSide = normalize(vec3(-0.68, 0.34, 0.65));
  float sSide = pow(max(dot(R, boxSide), 0.0), sharp * 0.7);
  vec3 boxBack = normalize(vec3(uBackDir.x, uBackDir.y, -uBackDir.z));
  float sBack = pow(max(dot(R, boxBack), 0.0), sharp * 0.65);

  vec3 amb = mix(vec3(0.024, 0.024, 0.032), vec3(0.068, 0.066, 0.078), R.y * 0.5 + 0.5);
  return amb
    + vec3(0.95, 0.88, 0.78) * sTop * 0.75
    + vec3(0.68, 0.76, 0.92) * sSide * 0.45
    + vec3(1.05, 0.86, 0.66) * sBack * 0.65;
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

vec3 evalPaperLight(
  vec3 L, vec3 radiance, vec3 N, vec3 N0, vec3 V,
  vec3 albedo, vec3 F0, float metalness, float rough,
  vec3 sssTint, float sssThick, float sssGain, float polymer, float cottonSheen,
  float shadowVis
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
  float wrap = mix(0.06, 0.02, polymer);
  float diffNdl = clamp((dot(N, L) + wrap) / (1.0 + wrap), 0.0, 1.0);
  vec3 diff = (kD * albedo / PI) * diffNdl;

  float sheen = pow(clamp(1.0 - ndh, 0.0, 1.0), 4.0) * ndl * cottonSheen * 0.12;

  // Tilt-responsive backlit transmission: modest at flat rest, blooms strongly when tilted into elevated backlight.
  float backFace = clamp(dot(-N0, L), 0.0, 1.0);
  float backPeak = pow(backFace, 3.6);
  vec3 Hback = normalize(L + N0 * mix(0.46, 0.24, polymer));
  float forwardLobe = pow(clamp(dot(V, -Hback), 0.0, 1.0), mix(3.4, 5.2, polymer));
  vec3 absorb = exp(-sssThick * vec3(0.28, 0.64, 1.24));
  float transFactor = (forwardLobe * 0.95 + backPeak * 0.72) * sssGain * (1.0 - metalness);
  vec3 sss = sssTint * absorb * transFactor;

  return ((diff + vec3(sheen) + spec * ndl) * shadowVis + sss * mix(0.45, 1.0, shadowVis)) * radiance;
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

  vec4 w0 = front ? uWinF0 : uWinB0;
  vec4 w1 = front ? uWinF1 : uWinB1;
  float inMainWin = inEllipse(baseUv, w0);
  float inCameoWin = inEllipse(baseUv, w1);
  float inAnyWin = max(inMainWin, inCameoWin);

  vec2 uv = baseUv;
  if (uIsHero > 0.5 && noteRelief > 0.02 && inAnyWin < 0.85) {
    vec3 vTs = vec3(dot(V, T), dot(V, B), max(0.32, dot(V, N0)));
    vec2 pDir = (vTs.xy / vTs.z) * (0.0034 * noteRelief * (1.0 - inAnyWin));
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
  // Pixel-exact traced security mask: R = hologram/thread, G = gold/copper foil, B = traced glyphs.
  vec3 secMask = front ? texture2D(uMaskFront, uv).rgb : texture2D(uMaskBack, uv).rgb;

  vec3 albedo = srgbToLinear(texSrgb);
  vec3 oppAlbedo = srgbToLinear(oppSrgb);
  albedo = pow(max(albedo, vec3(0.0001)), vec3(1.05));

  float mc = dot(texSrgb, vec3(0.299, 0.587, 0.114));
  float inkAmount = clamp(1.0 - mc, 0.0, 1.0);
  float inkSat = max(texSrgb.r, max(texSrgb.g, texSrgb.b)) - min(texSrgb.r, min(texSrgb.g, texSrgb.b));

  // Clear polymer window cutout + luminous perimeter bevel.
  float darkVoid = (1.0 - smoothstep(0.18, 0.31, mc)) * (1.0 - smoothstep(0.07, 0.17, inkSat));
  float isClearMain = inMainWin * darkVoid;
  float isClearCameo = inCameoWin * (1.0 - smoothstep(0.20, 0.36, mc)) * (1.0 - smoothstep(0.08, 0.18, inkSat));
  float isClearGlass = max(isClearMain, isClearCameo * 0.80);
  float isFrostedCameo = inCameoWin * (1.0 - isClearCameo);
  float winEdgeBevel = smoothstep(0.08, 0.45, isClearGlass) * (1.0 - smoothstep(0.45, 0.88, isClearGlass));

  // Dual-scale intaglio relief gradient.
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

  vec2 du2 = vec2(uTexel.x * 2.5, 0.0);
  vec2 dv2 = vec2(0.0, uTexel.y * 2.5);
  float broadX = (sampleInk(front, uv + du2) - sampleInk(front, uv - du2)) * 0.5;
  float broadY = (sampleInk(front, uv + dv2) - sampleInk(front, uv - dv2)) * 0.5;

  float reliefX = fineX * 0.72 + broadX * 0.55;
  float reliefY = fineY * 0.72 + broadY * 0.55;

  float lap = inkAmount - 0.25 * (tc + bc + ml + mr);
  albedo *= clamp(1.0 - lap * (0.20 + 0.24 * uIsHero), 0.84, 1.18);

  float ridgeSlope = length(vec2(reliefX, reliefY));
  float inkAO = 1.0 - clamp(ridgeSlope * 0.26 * noteRelief * (1.0 - isClearGlass), 0.0, 0.22);

  float foldLine = (1.0 - smoothstep(0.0, 0.018, abs(vUv.x - 0.5))) * clamp(abs(uCrinkle.y) * 1.4, 0.0, 1.0);
  albedo = mix(albedo, mix(albedo, uTint * 0.92, 0.32), foldLine * 0.22 * (1.0 - polymer));

  float grainScale = (1.0 - polymer * 0.88) * uGrain;
  vec2 fib0 = paperFibers(uv);
  float f1 = paperFibers(uv + vec2(0.0017, 0.0)).x;
  float f2 = paperFibers(uv + vec2(0.0, 0.0017)).x;

  float inkBump = (0.34 + 0.44 * uIsHero) * noteRelief * (1.0 - isClearGlass);
  float fiberAmt = (0.18 + 0.18 * uIsHero) * grainScale;

  albedo *= (1.0 + fib0.x * 0.044 * grainScale * (1.0 - inkAmount * 0.55)) * inkAO;

  vec3 N = normalize(
    N0
    - T * (reliefX * inkBump + (f1 - fib0.x) * fiberAmt)
    - B * (reliefY * inkBump + (f2 - fib0.x) * fiberAmt)
  );

  float ndv = max(dot(N, V), 0.001);
  float fres = pow(clamp(1.0 - ndv, 0.0, 1.0), 4.0);

  // Pixel-exact security masks from traced mask textures (zero background bleed).
  float opaque = 1.0 - isClearGlass;
  float holoK  = clamp(secMask.r * foilGain * opaque, 0.0, 1.0);
  float metalK = clamp(secMask.g * foilGain * opaque, 0.0, 1.0);
  float glyphK = clamp(secMask.b * foilGain * opaque, 0.0, 1.0);

  // Subtle angle-dependent holographic OVI colour shift on traced numbers and letters.
  vec3 surfAlbedo = albedo;
  if (glyphK > 0.01) {
    float shiftAngle = (1.0 - ndv) * 2.1 + dot(T, V) * 0.72;
    vec3 shifted = shiftHue(surfAlbedo, shiftAngle);
    surfAlbedo = mix(surfAlbedo, shifted * 1.14, glyphK * 0.72);
  }

  float baseRough = mix(0.89, 0.34, polymer);
  float inkRough = mix(baseRough, 0.46, inkAmount * (1.0 - polymer * 0.55));
  float rough = clamp(inkRough + fib0.x * 0.05 * grainScale, 0.22, 0.95);
  rough = mix(rough, 0.21, glyphK * 0.80);
  rough = mix(rough, 0.17, metalK * 0.84);
  rough = mix(rough, 0.15, holoK * 0.86);

  float metalness = clamp(metalK * 0.58 + holoK * 0.52 + glyphK * 0.38, 0.0, 0.66);

  vec3 dielecF0 = vec3(mix(0.028, 0.046, polymer));
  vec3 goldTint = mix(vec3(1.0, 0.80, 0.36), clamp(albedo * 1.55 + 0.18, 0.25, 1.0), 0.48);
  float holoAngle = dot(N0, V) * 2.5 + dot(T, V) * 2.3 + dot(B, V) * 1.1 + uv.x * 1.6 + uv.y * 0.8 + foilHue * 0.25;
  vec3 holoSpecPhase = thinFilm(holoAngle);
  vec3 glyphIrid = thinFilm(dot(N0, V) * 2.2 + dot(T, V) * 1.9 + uv.x * 1.2 + foilHue * 0.4);

  vec3 metalF0 = goldTint;
  if (holoK > metalK) metalF0 = mix(vec3(0.88), holoSpecPhase, 0.78);
  if (glyphK > max(holoK, metalK)) metalF0 = mix(surfAlbedo * 1.35 + 0.12, glyphIrid, 0.52);

  vec3 F0 = mix(dielecF0, metalF0, metalness);

  // Backlit paper subsurface scattering and reverse ink bleed-through.
  vec4 waterRect = front ? uWaterF : uWaterB;
  float inWatermark = inRect(uv, waterRect) * (1.0 - polymer * 0.68);
  float oppLum = dot(oppAlbedo, vec3(0.299, 0.587, 0.114));
  float oppInk = clamp(1.0 - oppLum, 0.0, 1.0);

  float baseThick = mix(0.66, 0.28, inWatermark) + fib0.y * 0.22 * grainScale;
  float sssThick = clamp(baseThick + inkAmount * 0.58 + oppInk * 1.10, 0.18, 1.85);
  vec3 bleedMask = mix(vec3(1.0), oppAlbedo * 0.76 + vec3(0.06), 0.78 + 0.18 * inWatermark);
  vec3 sssTint = mix(surfAlbedo, uTint * vec3(1.04, 0.96, 0.86), 0.44) * bleedMask;

  float sssGain = uTrans * mix(0.46, 0.14, polymer) * (1.0 + 0.52 * inWatermark) * opaque;
  float cottonSheen = (1.0 - polymer) * (1.0 - metalness) * opaque;

  float shadowVis = sampleShadow(vWorldPos, N0);

  // Elevated backlight direction makes vertical pitching clearly modulate paper & window translucency.
  vec3 Lback = normalize(vec3(uBackDir.x, uBackDir.y + 0.36, uBackDir.z));
  vec3 Lkey  = normalize(vec3(4.8, 6.4, 7.8));
  vec3 Lfill = normalize(vec3(-0.68, -0.22, 0.70));

  // Tilt alignment peaks sharply when the note is pitched vertically into the elevated backlight.
  float tiltBack = smoothstep(0.68, 0.985, dot(-N0, Lback));
  float tiltSss = sssGain * (0.34 + 1.45 * tiltBack);

  vec3 Cback = vec3(1.58, 1.30, 0.94);
  vec3 Ckey  = vec3(1.22, 1.19, 1.15);
  vec3 Cfill = vec3(0.22, 0.24, 0.30);

  vec3 Lo = vec3(0.0);
  Lo += evalPaperLight(Lback, Cback, N, N0, V, surfAlbedo, F0, metalness, rough, sssTint, sssThick, tiltSss * 1.55, polymer, cottonSheen, 1.0);
  Lo += evalPaperLight(Lkey,  Ckey,  N, N0, V, surfAlbedo, F0, metalness, rough, sssTint, sssThick, sssGain * 0.16, polymer, cottonSheen, shadowVis);
  Lo += evalPaperLight(Lfill, Cfill, N, N0, V, surfAlbedo, F0, metalness, rough, sssTint, sssThick, sssGain * 0.10, polymer, cottonSheen, mix(0.65, 1.0, shadowVis));

  vec3 R = reflect(-V, N);
  vec3 envSpec = studioEnv(R, rough);
  vec3 envDiff = mix(vec3(0.036, 0.035, 0.048), vec3(0.068, 0.068, 0.082), N.y * 0.5 + 0.5);
  vec3 Fenv = F_Schlick(ndv, F0);
  Lo += (vec3(1.0) - Fenv) * (1.0 - metalness) * surfAlbedo * envDiff * mix(0.55, 1.0, shadowVis)
      + envSpec * Fenv * mix(1.0 - rough * 0.55, 1.35, metalness) * mix(0.52, 1.0, shadowVis);

  // Silky holographic diffraction shimmer on traced kinegrams and security threads.
  if (holoK > 0.01) {
    vec3 Hkey = normalize(Lkey + V);
    vec3 HsunMir = normalize(vec3(-Lback.x, Lback.y, abs(Lback.z)) + V);
    float dSpec = pow(max(dot(N0, Hkey), 0.0), 20.0) * 0.95 * shadowVis
                + pow(max(dot(N0, HsunMir), 0.0), 14.0) * 0.68
                + fres * 0.36;
    float silkBand = 0.68 + 0.32 * sin((uv.x * 14.0 - uv.y * 9.0) + dot(T, V) * 10.0);
    Lo += holoSpecPhase * dSpec * silkBand * holoK * 0.86;
  }

  // Crisp holographic / OVI metallic sheen strictly tracing the actual letters and numerals.
  if (glyphK > 0.01) {
    vec3 Hkey = normalize(Lkey + V);
    vec3 HsunMir = normalize(vec3(-Lback.x, Lback.y, abs(Lback.z)) + V);
    float gSpec = pow(max(dot(N0, Hkey), 0.0), 18.0) * 0.85 * shadowVis
                + pow(max(dot(N0, HsunMir), 0.0), 14.0) * 0.48
                + fres * 0.34;
    Lo += glyphIrid * gSpec * glyphK * 0.68;
  }

  // Optical polymer clearcoat + sweeping glimmer across Mark's clear see-through windows.
  float winGlimmer = 0.0;
  if (polymer > 0.5) {
    vec3 R0 = reflect(-V, N0);
    vec3 winEnv = studioEnv(R0, mix(0.13, 0.04, isClearGlass));
    float ccF = F_Schlick(ndv, vec3(0.058)).r;
    float ccKey = D_GGX(max(dot(N0, normalize(Lkey + V)), 0.0), 0.10) * 0.028 * shadowVis;

    float sweepCoord = (uv.x * 2.8 + uv.y * 1.9) - dot(T, V) * 2.4 - dot(B, V) * 1.4;
    float sSw = sin(sweepCoord * 2.6);
    float sweepBand = exp(-(sSw * sSw) * 26.0);
    winGlimmer = sweepBand * (0.45 + 0.55 * fres) + pow(max(dot(N0, normalize(Lkey + V)), 0.0), 32.0) * 1.35;
    vec3 winIrid = mix(vec3(0.98, 0.96, 0.92), thinFilm(ndv * 2.8 + sweepCoord * 0.45), 0.48);

    vec3 glassGlint = (Ckey * ccKey + winEnv * mix(0.42, 1.55, isClearGlass)) * ccF;
    vec3 winFilm = glassGlint
      + vec3(0.04, 0.05, 0.07) * (0.22 + fres * 0.75)
      + winIrid * winGlimmer * (0.58 + 0.52 * fres);
    Lo = mix(Lo + glassGlint, winFilm, isClearGlass);
    Lo += winIrid * winEdgeBevel * (0.42 + 0.72 * fres);
  }

  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float cutBevel = 1.0 - smoothstep(0.0, 0.010, edge);
  Lo += mix(uTint, vec3(1.0, 0.88, 0.68), 0.42) * cutBevel * (0.07 + 0.18 * fres);

  float creaseAO = 1.0 - clamp(vCrease * 0.12 + foldLine * 0.14, 0.0, 0.30);
  vec3 col = Lo * creaseAO * uExposure * uFlutter.w;
  col = agxDisplay(col);

  // Tilt-responsive translucency: grounded at flat rest, clears up when tilted into the backlight.
  float alpha = 1.0;
  if (polymer > 0.5) {
    // Smoked polymer window sits ~0.38 opaque at rest, opens to ~0.12 when tilted into light,
    // and reflects bright frosted glare at grazing tilt angles.
    float baseWinAlpha = mix(0.42, 0.12, tiltBack);
    float winAlpha = clamp(baseWinAlpha + fres * 0.48 + winGlimmer * 0.28, 0.12, 0.88);
    alpha = mix(alpha, winAlpha, isClearGlass);
    alpha = mix(alpha, mix(0.88, 0.72, tiltBack) + fres * 0.14, isFrostedCameo * 0.70);
  } else {
    // Cotton stays solid at rest and reveals subtle optical translucency when pitched into light.
    float thinCotton = (0.18 + 0.82 * inWatermark) * (1.0 - inkAmount) * (1.0 - oppInk) * tiltBack;
    alpha = 1.0 - thinCotton * 0.13 * clamp(uTrans, 0.0, 1.3);
  }

  gl_FragColor = vec4(col, alpha * uOpacity);
}
`;

function rectVec4(r: RectZone): THREE.Vector4 {
  return new THREE.Vector4(r[0], r[1], r[2], r[3]);
}

function ellVec4(e: EllipseZone): THREE.Vector4 {
  return new THREE.Vector4(e[0], e[1], e[2], e[3]);
}

export function applyBillUniforms(
  u: BillUniforms,
  def: BillDef,
  front: THREE.Texture,
  back: THREE.Texture,
  maskFront: THREE.Texture,
  maskBack: THREE.Texture,
  width: number,
  height: number,
) {
  u.uFront.value = front;
  u.uBack.value = back;
  u.uMaskFront.value = maskFront;
  u.uMaskBack.value = maskBack;
  u.uSize.value.set(width, height);
  u.uTint.value.set(def.tint[0], def.tint[1], def.tint[2]);

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
  maskFront: THREE.Texture,
  maskBack: THREE.Texture,
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
    uMaskFront: { value: maskFront },
    uMaskBack: { value: maskBack },
    uSize: { value: new THREE.Vector2(width, height) },
    uBend: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFlutter: { value: new THREE.Vector4(0, 0, 4.2, 1.0) },
    uCrinkle: { value: new THREE.Vector4(0, 0, 0, 1.0) },
    uOpacity: { value: 1.0 },
    uTint: { value: new THREE.Vector3(def.tint[0], def.tint[1], def.tint[2]) },
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
    uShadowMap: shared.uShadowMap,
    uShadowMatrix: shared.uShadowMatrix,
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

export function createShadowDepthMaterial(u: BillUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: DEPTH_VERT,
    fragmentShader: DEPTH_FRAG,
    uniforms: {
      uFront: u.uFront,
      uBack: u.uBack,
      uSize: u.uSize,
      uBend: u.uBend,
      uFlutter: u.uFlutter,
      uCrinkle: u.uCrinkle,
      uWinF0: u.uWinF0,
      uWinF1: u.uWinF1,
      uWinB0: u.uWinB0,
      uWinB1: u.uWinB1,
      uMat: u.uMat,
      uOpacity: u.uOpacity,
    },
    side: THREE.DoubleSide,
    colorWrite: false,
    depthWrite: true,
    depthTest: true,
  });
}
