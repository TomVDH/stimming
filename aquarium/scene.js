// Aquarium scene: the tank, its light, plants, fish and flakes.
// Units are centimetres. The front glass is the plane z = GLASS.
import * as THREE from 'three';

export const SURF = 40, GLASS = 20, BACK = -20;
// Direction toward the lamp: high, a little right and back.
const LDIR = new THREE.Vector3(0.3, 1, -0.12).normalize();

// The sand floor: low at the glass, high at the back, with soft mounds.
export function sandH(x, z, clumps = []) {
  let h = 2.6 + ((GLASS - z) / (GLASS - BACK)) * 7.5 + 0.9 * Math.sin(x * 0.07 + 1) * Math.sin(z * 0.13 + 0.4);
  for (const c of clumps) h += c.mound * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / (2 * c.r * c.r));
  return h;
}

/* ---------- GLSL: light in the water ---------- */
const WATER = /* glsl */`
uniform float uTime;
uniform float uLamp;
uniform vec4 uClump[3];
uniform vec4 uShadow[80];
uniform int uShadows;
const float SURF = ${SURF.toFixed(1)};
const float GLASS = ${GLASS.toFixed(1)};
const vec3 LDIR = vec3(${LDIR.x.toFixed(4)}, ${LDIR.y.toFixed(4)}, ${LDIR.z.toFixed(4)});

float sandH(vec2 p) {
  float h = 2.6 + (GLASS - p.y) / 40.0 * 7.5 + 0.9 * sin(p.x * 0.07 + 1.0) * sin(p.y * 0.13 + 0.4);
  for (int i = 0; i < 3; i++) {
    vec2 d = p - uClump[i].xy;
    h += uClump[i].w * exp(-dot(d, d) / (2.0 * uClump[i].z * uClump[i].z));
  }
  return h;
}
float sq(float x) { return x * x; }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
// A caustic web: light focuses where two drifting cells meet.
float causticAt(vec2 p, float t) {
  p += 0.3 * vec2(sin(p.y * 1.7 + t), cos(p.x * 1.5 - t * 0.7));
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = 0.5 + 0.42 * sin(t * 0.9 + 6.2831 * hash2(i + g));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return exp(-(d2 - d1) * 12.0) * 1.1;
}
// The caustic on a point: traced up the light ray to the surface.
float caust(vec3 P) {
  vec2 q = P.xz + LDIR.xz / LDIR.y * (SURF - P.y);
  float depth = SURF - P.y;
  // Lines focus a few centimetres down, then blur.
  float c = causticAt(q * 0.34, uTime * 0.55);
  c += 0.5 * causticAt(q * 0.21 + 7.3, uTime * 0.4 + 2.0);
  return c * smoothstep(0.5, 7.0, depth) * (0.55 + 0.45 * exp(-depth * 0.03));
}
// Soft shade from the fish above: each blob lies along the light ray.
float fishShade(vec3 P) {
  float s = 0.0;
  for (int i = 0; i < 80; i++) {
    if (i >= uShadows) break;
    vec4 f = uShadow[i];
    float up = f.y - P.y;
    if (up <= 0.0) continue;
    vec2 q = f.xz - LDIR.xz / LDIR.y * up - P.xz;
    float r = f.w * (0.3 + up * 0.05);
    s += exp(-dot(q, q) / (r * r)) * 0.55 / (1.0 + up * 0.06);
  }
  return clamp(s, 0.0, 0.75);
}
// The lamp is a bar over the tank: light thins with depth and to the sides.
float lampAt(vec3 P) {
  return 1.45 * uLamp * exp(-(SURF - P.y) * 0.017) * (0.45 + 0.55 * exp(-P.x * P.x / 5000.0));
}
// The colour that the water scatters toward the eye.
vec3 waterTint(float y) {
  return mix(vec3(0.004, 0.024, 0.03), vec3(0.03, 0.13, 0.13), smoothstep(0.0, SURF, y)) * (0.18 + 0.82 * uLamp);
}
// Path length in water: from the front glass to the point.
float waterPath(vec3 P) {
  vec3 d = P - cameraPosition;
  float f = (GLASS - cameraPosition.z) / d.z;
  return length(d) * (1.0 - clamp(f, 0.0, 1.0));
}
// Red goes first, then green: far things turn blue-green.
vec3 inWater(vec3 col, vec3 P) {
  float s = waterPath(P);
  vec3 T = exp(-s * vec3(0.034, 0.011, 0.0095));
  return col * T + waterTint(P.y) * (1.0 - exp(-s * 0.03));
}
// A mirrored point sits above the surface; the ray through the glass above it is air.
bool throughAir(vec3 P) {
  vec3 d = P - cameraPosition;
  float yf = cameraPosition.y + d.y * (GLASS - cameraPosition.z) / d.z;
  return yf > SURF;
}
`;

const common = () => ({
  uTime: { value: 0 },
  uLamp: { value: 0.85 },
  uClump: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
  uShadow: { value: Array.from({ length: 80 }, () => new THREE.Vector4()) },
  uShadows: { value: 0 },
});

/* ---------- back glass: the backdrop and the room ---------- */
const BACK_VS = /* glsl */`
varying vec3 vP;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BACK_FS = /* glsl */`
${WATER}
varying vec3 vP;
// The backdrop: a frosted sheet lit from behind, brightest in the middle.
vec3 backdrop(vec3 P) {
  float g = exp(-sq((P.y - 26.0) / 16.0)) * (0.55 + 0.45 * exp(-P.x * P.x / 9000.0));
  return vec3(0.05, 0.2, 0.2) * g * (0.15 + 0.85 * uLamp) + vec3(0.004, 0.012, 0.014);
}
void main() {
  vec3 col;
  if (vP.y < SURF) col = inWater(backdrop(vP), vP);
  else if (!throughAir(vP)) {
    // The surface mirrors the backdrop.
    vec3 M = vec3(vP.x, 2.0 * SURF - vP.y, vP.z);
    col = inWater(backdrop(M), vP) * 0.85;
  } else {
    // The room above the tank: dark, with lamp spill on the wall.
    float glow = exp(-sq((vP.y - 56.0) / 9.0)) * exp(-vP.x * vP.x / 6000.0);
    col = vec3(0.0025, 0.003, 0.0035) + vec3(0.016, 0.014, 0.011) * glow * uLamp;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- sand ---------- */
const SAND_VS = /* glsl */`
${WATER}
varying vec3 vP;
void main() {
  vec3 p = position;
  p.y = sandH(p.xz);
  vP = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const SAND_FS = /* glsl */`
${WATER}
varying vec3 vP;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 e = vec2(0.3, 0.0);
  vec3 n = normalize(vec3(sandH(vP.xz - e.xy) - sandH(vP.xz + e.xy), 2.0 * e.x, sandH(vP.xz - e.yx) - sandH(vP.xz + e.yx)));
  // Grains: a fine speckle of light and dark.
  float g = h21(floor(vP.xz * 9.0)) * 0.6 + h21(floor(vP.xz * 23.0)) * 0.4;
  vec3 alb = mix(vec3(0.2, 0.14, 0.085), vec3(0.34, 0.26, 0.17), g);
  alb *= 0.85 + 0.15 * h21(floor(vP.xz * 2.3));
  // Roots shade the sand at the foot of each clump.
  float ao = 1.0;
  for (int i = 0; i < 3; i++) {
    vec2 d = vP.xz - uClump[i].xy;
    ao *= 1.0 - 0.55 * exp(-dot(d, d) / (uClump[i].z * uClump[i].z * 1.4));
  }
  float L = lampAt(vP) * (1.0 - fishShade(vP));
  vec3 col = alb * (0.08 + 0.9 * max(dot(n, LDIR), 0.0) * L * ao);
  col += alb * vec3(1.0, 0.97, 0.85) * caust(vP) * L * 3.6 * ao;
  col += alb * waterTint(vP.y) * 0.8;
  gl_FragColor = vec4(inWater(col, vP), 1.0);
}`;

/* ---------- the substrate against the front glass ---------- */
const FRONT_VS = /* glsl */`
${WATER}
varying vec3 vP;
void main() {
  vec3 p = position;
  p.y = p.y > 0.5 ? sandH(vec2(p.x, GLASS - 0.4)) : -6.0;
  vP = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FRONT_FS = /* glsl */`
${WATER}
varying vec3 vP;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float top = sandH(vec2(vP.x, GLASS - 0.4));
  float d = top - vP.y;
  // Grains pressed on the glass; deeper layers are darker.
  float g = h21(floor(vP.xy * vec2(7.0, 9.0))) * 0.6 + h21(floor(vP.xy * vec2(19.0, 23.0))) * 0.4;
  vec3 alb = mix(vec3(0.16, 0.11, 0.07), vec3(0.3, 0.23, 0.15), g) * mix(1.0, 0.35, smoothstep(0.3, 2.5, d));
  float L = lampAt(vec3(vP.x, top, GLASS));
  vec3 col = alb * (0.05 + 0.35 * L * exp(-d * 0.9));
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- plants: ribbon leaves and a low carpet ---------- */
const PLANT_VS = /* glsl */`
${WATER}
uniform float uMirror;
uniform float uSway;
attribute vec3 iRoot;
attribute vec4 iShape;
attribute float iTint;
varying vec3 vP;
varying vec3 vN;
varying vec2 vUv;
varying float vTint;
void main() {
  float u = position.y, v = position.x;
  float h = iShape.x, w = iShape.y, lean = iShape.z, ph = iShape.w;
  // The current sways each leaf; the tip moves most.
  float sway = sin(uTime * 0.55 + ph + u * 1.7) * (0.65 + 0.35 * sin(uTime * 0.21 + ph * 2.0)) * uSway;
  float bend = (lean + sway * 0.22) * u;
  float az = ph * 6.2831;
  vec3 out1 = vec3(cos(az), 0.0, sin(az) * 0.5);
  vec3 c = iRoot + out1 * h * u * sin(bend) * 0.9 + vec3(0.0, h * u * cos(bend * 0.6), 0.0);
  // A long leaf lies along the surface at its tip.
  c.y = min(c.y, SURF - 0.35 - 0.15 * v);
  // The ribbon twists along its length.
  float tw = ph * 9.0 + u * 2.2 + sway * 0.4;
  vec3 across = vec3(cos(tw), 0.0, sin(tw));
  float taper = 1.0 - smoothstep(0.82, 1.0, u) * 0.85;
  vec3 p = c + across * v * w * taper;
  vN = vec3(-sin(tw), 0.25, cos(tw));
  if (uMirror > 0.5) { p.y = 2.0 * SURF - p.y; vN.y = -vN.y; }
  vP = p;
  vUv = vec2(u, v);
  vTint = iTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const PLANT_FS = /* glsl */`
${WATER}
uniform float uMirror;
varying vec3 vP;
varying vec3 vN;
varying vec2 vUv;
varying float vTint;
void main() {
  if (uMirror > 0.5 && throughAir(vP)) discard;
  vec3 Q = vP;
  if (uMirror > 0.5) Q.y = 2.0 * SURF - Q.y;
  vec3 n = normalize(vN);
  vec3 V = normalize(cameraPosition - vP);
  if (dot(n, V) < 0.0) n = -n;
  // Young tips are lighter; the base is deep green.
  vec3 alb = mix(vec3(0.02, 0.07, 0.015), vec3(0.12, 0.34, 0.05), smoothstep(0.0, 0.9, vUv.x));
  alb = mix(alb, alb * vec3(1.25, 1.1, 0.6), vTint);
  // The midrib catches a little more light.
  alb *= 0.85 + 0.25 * exp(-vUv.y * vUv.y * 40.0);
  float L = lampAt(Q);
  float diff = abs(dot(n, LDIR));
  // Leaves are thin: light from above shines through them.
  vec3 col = alb * (0.06 + (0.35 * diff + 0.55) * L);
  col += alb * vec3(0.9, 1.1, 0.5) * caust(Q) * L * 0.9;
  col += alb * waterTint(Q.y) * 1.2;
  // Tips near the lamp glow through.
  col += alb * vec3(0.7, 1.0, 0.35) * L * 0.7 * vUv.x * vUv.x;
  col = inWater(col, vP);
  if (uMirror > 0.5) col *= 0.7;
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- fish ---------- */
const FISH_VS = /* glsl */`
${WATER}
uniform float uMirror;
attribute vec3 iPos;
attribute vec4 iDir;
attribute vec4 iSwim;
attribute vec2 iBody;
varying vec3 vP;
varying vec3 vN;
varying vec3 vL;
varying float vSp;
varying float vFin;
void main() {
  // Local frame: x runs to the snout at +0.5, y is up, z is the side.
  vec3 l = position;
  float hk = iSwim.z;
  l.y *= hk;
  float t = clamp(0.5 - l.x, 0.0, 1.3);
  // The body wave grows toward the tail; the head swings a little against it.
  float wave = iSwim.y * (0.04 + t * t * 0.9) * sin(iSwim.x - t * 4.2);
  wave += iBody.x * (t - 0.35) * (t - 0.35) * 1.4;
  l.z += wave;
  vec3 f = normalize(iDir.xyz);
  vec3 r = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(r, f);
  float cr = cos(iDir.w), sr = sin(iDir.w);
  vec3 r2 = r * cr + up * sr, up2 = up * cr - r * sr;
  float s = iSwim.w;
  vec3 p = iPos + (f * l.x + up2 * l.y + r2 * l.z) * s;
  vec3 n = normal;
  n.y /= hk;
  vN = normalize(f * n.x + up2 * n.y + r2 * n.z);
  if (uMirror > 0.5) { p.y = 2.0 * SURF - p.y; vN.y = -vN.y; }
  vP = p;
  vL = vec3(position.x, position.y, position.z);
  vSp = iBody.y;
  vFin = uv.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FISH_FS = /* glsl */`
${WATER}
uniform float uMirror;
varying vec3 vP;
varying vec3 vN;
varying vec3 vL;
varying float vSp;
varying float vFin;
const float PI = 3.14159;
void main() {
  if (uMirror > 0.5 && throughAir(vP)) discard;
  vec3 Q = vP;
  if (uMirror > 0.5) Q.y = 2.0 * SURF - Q.y;
  vec3 n = normalize(vN);
  vec3 V = normalize(cameraPosition - vP);
  float facing = dot(n, V);
  if (facing < 0.0) { n = -n; facing = -facing; }
  float x = vL.x, y = vL.y;
  // yv: -1 at the belly, +1 at the back, on the body tube.
  float yv = clamp(y / 0.13, -1.0, 1.0);
  int sp = int(vSp + 0.5);
  vec3 alb;
  float silver = 0.0, glow = 0.0, alpha = 1.0, trans = 0.0;
  vec3 glowCol = vec3(0.0);
  if (vFin > 0.5) {
    // Fins are clear, with a tint by species.
    alpha = 0.42;
    alb = sp == 0 ? vec3(0.45, 0.42, 0.4) : sp == 1 ? vec3(1.0, 0.35, 0.1) : vec3(0.85, 0.8, 0.55);
    if (sp == 0 && x < -0.5) alb = vec3(0.7, 0.12, 0.08);
    // The lemon tetra's anal fin: lemon yellow at the front, black at the edge.
    if (sp == 2 && y < -0.08 && x > -0.32) {
      float edge = smoothstep(0.03, 0.0, abs(y + 0.17 + (x - 0.04) * 0.15));
      alb = mix(vec3(1.0, 0.82, 0.05), vec3(0.02), edge);
      alpha = 0.85;
    }
    if (sp == 2 && y > 0.12) { alb = mix(vec3(0.95, 0.8, 0.1), vec3(0.03), smoothstep(0.17, 0.22, y)); alpha = 0.8; }
    trans = 0.6;
  } else if (sp == 0) {
    // Cardinal: olive back, an electric stripe nose to tail, red below.
    float stripe = smoothstep(0.02, 0.12, yv) * (1.0 - smoothstep(0.34, 0.44, yv)) * smoothstep(-0.38, -0.28, x) * (1.0 - smoothstep(0.36, 0.42, x));
    float red = (1.0 - smoothstep(-0.12, 0.05, yv)) * smoothstep(-0.48, -0.4, x) * (1.0 - smoothstep(0.26, 0.36, x));
    alb = mix(vec3(0.16, 0.15, 0.09), vec3(0.06, 0.05, 0.03), smoothstep(0.4, 0.9, yv));
    alb = mix(alb, vec3(0.75, 0.68, 0.6), (1.0 - smoothstep(-0.9, -0.5, yv)) * smoothstep(0.1, 0.25, x));
    alb = mix(alb, vec3(0.82, 0.05, 0.04), red);
    // The stripe is structural colour: it turns from green-blue to violet with the angle.
    vec3 iri = mix(vec3(0.05, 0.85, 0.9), vec3(0.25, 0.3, 1.0), 1.0 - facing);
    alb = mix(alb, iri * 0.5, stripe);
    glow = stripe;
    glowCol = iri;
    silver = 0.3;
  } else if (sp == 1) {
    // Ember: glowing orange, a darker back, a clear belly.
    alb = mix(vec3(1.0, 0.28, 0.03), vec3(0.7, 0.13, 0.03), smoothstep(0.3, 0.9, yv));
    alb = mix(alb, vec3(1.0, 0.6, 0.35), (1.0 - smoothstep(-0.95, -0.5, yv)) * 0.5);
    trans = 0.8;
    silver = 0.15;
  } else {
    // Lemon: pale and glassy, faintly yellow, with a silver sheen.
    alb = mix(vec3(0.86, 0.8, 0.46), vec3(0.55, 0.5, 0.26), smoothstep(0.4, 1.0, yv));
    // A faint yellow wash along the flank.
    alb = mix(alb, vec3(0.95, 0.78, 0.2), 0.35 * smoothstep(-0.6, 0.0, yv) * (1.0 - smoothstep(0.3, 0.7, yv)));
    trans = 0.6;
    silver = 0.45;
  }
  // The eye: dark pupil, a ring; the lemon's eye is red above.
  if (vFin < 0.5) {
    vec2 e = vec2(x - 0.36, y - 0.02);
    float d = length(e * vec2(1.0, 0.9));
    float ring = smoothstep(0.05, 0.043, d);
    vec3 iris = sp == 2 ? mix(vec3(0.75, 0.7, 0.5), vec3(0.9, 0.05, 0.04), step(0.0, e.y)) : sp == 1 ? vec3(0.9, 0.3, 0.1) : vec3(0.65, 0.65, 0.6);
    alb = mix(alb, iris, ring);
    alb = mix(alb, vec3(0.01), smoothstep(0.03, 0.024, d));
    silver = mix(silver, 0.9, ring);
  }
  float L = lampAt(Q);
  float top = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = alb * (0.08 + L * (0.25 + 0.75 * max(dot(n, LDIR), 0.0)));
  col += alb * caust(Q) * L * 1.4 * smoothstep(0.2, 0.9, top);
  col += alb * waterTint(Q.y) * (1.0 + top);
  // Light through the thin body.
  col += alb * alb * trans * L * 0.45;
  // Guanine sheen: a flash when the flank meets the light.
  vec3 H = normalize(LDIR + V);
  col += vec3(0.9, 0.95, 1.0) * silver * L * pow(max(dot(n, H), 0.0), 24.0) * 1.2;
  col += glowCol * glow * L * (0.6 + 1.2 * pow(facing, 2.0));
  col = inWater(col, vP);
  if (uMirror > 0.5) col *= 0.72;
  gl_FragColor = vec4(col, alpha);
}`;

/* ---------- surface seen from below ---------- */
const SURF_VS = /* glsl */`
varying vec3 vP;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SURF_FS = /* glsl */`
${WATER}
uniform vec4 uRip[8];
uniform float uShiver;
varying vec3 vP;
// Ripple height: slow swell from the filter, rings from drops and knocks.
float rip(vec2 p) {
  float h = 0.05 * sin(p.x * 0.35 + uTime * 1.3) * sin(p.y * 0.5 - uTime * 0.9);
  h += 0.03 * sin(p.x * 0.9 - p.y * 0.4 + uTime * 2.1);
  for (int i = 0; i < 8; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.0) continue;
    float age = uTime - r.z;
    float d = length(p - r.xy);
    float front = age * 14.0;
    h += r.w * exp(-age * 1.3) * sin((d - front) * 2.2) * exp(-sq((d - front) * 0.35)) / (1.0 + d * 0.15);
  }
  h += uShiver * 0.12 * sin(p.x * 3.1 + uTime * 40.0) * sin(p.y * 2.7 - uTime * 33.0);
  return h;
}
void main() {
  if (throughAir(vP + vec3(0.0, -0.01, 0.0))) discard;
  vec2 e = vec2(0.15, 0.0);
  vec3 n = normalize(vec3(rip(vP.xz - e.xy) - rip(vP.xz + e.xy), 2.0 * e.x, rip(vP.xz - e.yx) - rip(vP.xz + e.yx)));
  vec3 V = normalize(vP - cameraPosition);
  float ci = dot(V, n);
  // Past the critical angle the surface is a mirror; steep ripples let lamp light through.
  float through = smoothstep(0.5, 0.75, ci);
  float tilt = 1.0 - n.y;
  vec3 col = waterTint(SURF) * (1.3 + 14.0 * tilt) + vec3(0.9, 0.95, 0.85) * uLamp * through * 2.0;
  // The meniscus at the front glass is a bright line.
  col += vec3(0.5, 0.6, 0.55) * uLamp * exp(-(GLASS - vP.z) * 2.5);
  float a = 0.28 + 0.5 * through + clamp(tilt * 20.0, 0.0, 0.4);
  gl_FragColor = vec4(inWater(col, vP), clamp(a, 0.0, 1.0));
}`;

/* ---------- light shafts: slices of lit water ---------- */
const SHAFT_VS = /* glsl */`
varying vec3 vP;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SHAFT_FS = /* glsl */`
${WATER}
uniform float uK;
varying vec3 vP;
float shaft(vec3 P) {
  vec2 q = P.xz + LDIR.xz / LDIR.y * (SURF - P.y);
  float s = sin(q.x * 0.19 + 1.4 * sin(q.y * 0.11 + uTime * 0.11)) + 0.7 * sin(q.x * 0.41 - uTime * 0.13 + q.y * 0.07) + 0.8 * sin(q.x * 0.083 + uTime * 0.05);
  return smoothstep(1.0, 2.4, s);
}
void main() {
  if (vP.y > SURF || vP.y < sandH(vP.xz)) discard;
  float depth = SURF - vP.y;
  float k = shaft(vP) * exp(-depth * 0.045) * smoothstep(0.0, 1.5, depth) * lampAt(vP);
  vec3 col = vec3(0.55, 0.85, 0.75) * k * uK;
  gl_FragColor = vec4(inWater(col, vP) - waterTint(vP.y) * (1.0 - exp(-waterPath(vP) * 0.03)), 1.0);
}`;

/* ---------- points: flakes, motes and pearls ---------- */
const PT_VS = /* glsl */`
${WATER}
uniform float uPx;
attribute vec4 aData;
varying vec3 vP;
varying vec4 vD;
void main() {
  vec4 mv = viewMatrix * vec4(position, 1.0);
  vP = position;
  vD = aData;
  gl_PointSize = aData.y * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const PT_FS = /* glsl */`
${WATER}
varying vec3 vP;
varying vec4 vD;
float h11(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float kind = vD.x, seed = vD.z, a = vD.w;
  float L = lampAt(vP);
  vec3 col;
  float alpha;
  if (kind < 0.5) {
    // A flake: a torn polygon in one of three food colours.
    float ang = atan(c.y, c.x), r = length(c);
    float edge = 0.62 + 0.3 * h11(floor((ang + 3.1416) * 1.3) + seed * 17.0);
    if (r > edge) discard;
    vec3 alb = h11(seed) < 0.45 ? vec3(0.7, 0.22, 0.08) : h11(seed + 3.0) < 0.6 ? vec3(0.62, 0.48, 0.24) : vec3(0.28, 0.45, 0.12);
    col = alb * (0.15 + 1.1 * L) + alb * caust(vP) * L;
    alpha = a;
  } else if (kind < 1.5) {
    // A mote: a speck that lights up in the shafts.
    float r = length(c);
    if (r > 1.0) discard;
    col = vec3(0.6, 0.8, 0.7) * (0.25 + 1.4 * caust(vP)) * L * (1.0 - r);
    alpha = a * (1.0 - r);
  } else {
    // A pearl of oxygen: a bright rim and a glint.
    float r = length(c);
    if (r > 1.0) discard;
    float rim = smoothstep(0.55, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
    float glint = exp(-dot(c - vec2(-0.3, 0.35), c - vec2(-0.3, 0.35)) * 30.0);
    col = vec3(0.8, 0.95, 0.95) * (rim * 0.9 + glint * 3.0) * (0.3 + L);
    alpha = a * clamp(rim + glint, 0.0, 1.0);
  }
  gl_FragColor = vec4(inWater(col, vP), alpha);
}`;

/* ---------- geometry ---------- */
// One tetra body: an elliptic tube with a forked tail and three fins.
function fishGeometry() {
  const U = [0, 0.08, 0.22, 0.4, 0.55, 0.7, 0.82, 0.91, 0.97, 1];
  const H = [0.034, 0.045, 0.085, 0.125, 0.135, 0.128, 0.105, 0.075, 0.042, 0.004];
  const half = u => { for (let i = 1; i < U.length; i++) if (u <= U[i]) { const k = (u - U[i - 1]) / (U[i] - U[i - 1]); return H[i - 1] + (H[i] - H[i - 1]) * k; } return 0; };
  const pos = [], nor = [], uv = [], idx = [];
  const NU = 22, NV = 14;
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, x = u - 0.5, h = half(u), w = h * 0.42;
    for (let j = 0; j <= NV; j++) {
      const a = (j / NV) * Math.PI * 2, cy = Math.cos(a), sz = Math.sin(a);
      // The belly sits a little lower than the back.
      pos.push(x, h * cy - 0.012 * (1 - u), w * sz);
      const n = [0, cy / Math.max(h, 1e-3), sz / Math.max(w, 1e-3)], l = Math.hypot(...n);
      nor.push(n[0] / l, n[1] / l, n[2] / l);
      uv.push(0, 0);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const a = i * (NV + 1) + j, b = a + NV + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // Flat fins: uv.y = 1 marks fin. Both faces share the vertices.
  const fin = pts => {
    const base = pos.length / 3;
    pts.forEach(([x, y]) => { pos.push(x, y, 0); nor.push(0, 0, 1); uv.push(0, 1); });
    for (let k = 1; k < pts.length - 1; k++) idx.push(base, base + k, base + k + 1);
  };
  // The tail: two lobes and a notch.
  fin([[-0.47, 0.03], [-0.47, -0.03], [-0.62, -0.01], [-0.8, -0.19], [-0.71, 0], [-0.8, 0.19], [-0.62, 0.01]]);
  // Dorsal fin, anal fin and a small adipose.
  fin([[0.02, 0.12], [-0.1, 0.125], [-0.11, 0.27], [-0.02, 0.21]]);
  fin([[0.04, -0.1], [-0.28, -0.07], [-0.3, -0.13], [0.01, -0.21]]);
  fin([[-0.3, 0.07], [-0.36, 0.06], [-0.37, 0.11]]);
  const g = new THREE.InstancedBufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// A ribbon: x across (-0.5 to 0.5), y along (0 to 1).
function ribbonGeometry(segs) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) pos.push(-0.5, i / segs, 0, 0.5, i / segs, 0);
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.InstancedBufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

const inst = (g, name, n, size) => {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size);
  a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute(name, a);
  return a;
};

/* ---------- the scene ---------- */
export function buildScene({ maxFish, maxPoints }) {
  const scene = new THREE.Scene();
  const U = common();
  const mat = (vs, fs, extra = {}, opts = {}) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { ...U, ...extra }, ...opts });

  // Back glass and room: one wide plane behind the tank.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(900, 140), mat(BACK_VS, BACK_FS));
  back.position.set(0, 50, BACK - 0.5);
  scene.add(back);

  // Sand: a grid lifted by sandH in the shader.
  const sandG = new THREE.PlaneGeometry(420, GLASS - BACK + 4, 210, 24);
  sandG.rotateX(-Math.PI / 2);
  sandG.translate(0, 0, (GLASS + BACK) / 2 - 1);
  const sand = new THREE.Mesh(sandG, mat(SAND_VS, SAND_FS));
  sand.frustumCulled = false;
  scene.add(sand);
  const frontG = new THREE.PlaneGeometry(420, 1, 210, 1);
  frontG.translate(0, 0.5, GLASS - 0.4);
  const front = new THREE.Mesh(frontG, mat(FRONT_VS, FRONT_FS));
  front.frustumCulled = false;
  scene.add(front);

  // Plants: one ribbon set for tall leaves, one for the carpet; each has a mirror twin.
  const plantMats = [0, 1].map(m => mat(PLANT_VS, PLANT_FS, { uMirror: { value: m }, uSway: { value: 1 } }, { side: THREE.DoubleSide }));
  const plantSet = (segs, max) => {
    const g = ribbonGeometry(segs);
    const a = { root: inst(g, 'iRoot', max, 3), shape: inst(g, 'iShape', max, 4), tint: inst(g, 'iTint', max, 1) };
    g.instanceCount = 0;
    const meshes = plantMats.map(m => { const me = new THREE.Mesh(g, m); me.frustumCulled = false; scene.add(me); return me; });
    return { g, a, meshes };
  };
  const tall = plantSet(14, 160), carpet = plantSet(3, 2600);
  carpet.meshes[1].visible = false;

  // Fish: one instanced body for all three species, and its mirror twin.
  const fishG = fishGeometry();
  const fa = { pos: inst(fishG, 'iPos', maxFish, 3), dir: inst(fishG, 'iDir', maxFish, 4), swim: inst(fishG, 'iSwim', maxFish, 4), body: inst(fishG, 'iBody', maxFish, 2) };
  fishG.instanceCount = 0;
  const fishMats = [0, 1].map(m => mat(FISH_VS, FISH_FS, { uMirror: { value: m } }, { side: THREE.DoubleSide, transparent: true }));
  fishMats.forEach(m => { const me = new THREE.Mesh(fishG, m); me.frustumCulled = false; scene.add(me); });

  // Shafts: vertical slices parallel to the glass, added on top.
  const shaftMat = mat(SHAFT_VS, SHAFT_FS, { uK: { value: 0.09 } }, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const shafts = [];
  const SL = 12;
  for (let i = 0; i < SL; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(420, SURF), shaftMat);
    m.position.set(0, SURF / 2, BACK + 1.5 + (i + 0.5) * ((GLASS - BACK - 2) / SL));
    m.renderOrder = 2;
    scene.add(m);
    shafts.push(m);
  }

  // The surface, from below: drawn after everything it veils.
  const surfG = new THREE.PlaneGeometry(420, GLASS - BACK);
  surfG.rotateX(Math.PI / 2);
  surfG.translate(0, SURF, (GLASS + BACK) / 2);
  const ripples = Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -100, 0));
  const surfMat = mat(SURF_VS, SURF_FS, { uRip: { value: ripples }, uShiver: { value: 0 } }, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const surf = new THREE.Mesh(surfG, surfMat);
  surf.renderOrder = 3;
  scene.add(surf);

  // Points: flakes, motes and pearls share one buffer.
  const ptG = new THREE.BufferGeometry();
  const ptPos = new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const ptData = new THREE.BufferAttribute(new Float32Array(maxPoints * 4), 4).setUsage(THREE.DynamicDrawUsage);
  ptG.setAttribute('position', ptPos);
  ptG.setAttribute('aData', ptData);
  ptG.setDrawRange(0, 0);
  const ptMat = mat(PT_VS, PT_FS, { uPx: { value: 500 } }, { transparent: true, depthWrite: false });
  const points = new THREE.Points(ptG, ptMat);
  points.frustumCulled = false;
  points.renderOrder = 1;
  scene.add(points);

  const all = [back.material, sand.material, front.material, ...plantMats, ...fishMats, shaftMat, surfMat, ptMat];
  return {
    scene, U, fishG, fa, tall, carpet, shafts, ripples, surfMat, shaftMat, ptG, ptPos, ptData, ptMat, plantMats,
    // Shared uniforms: every material holds the same objects.
    set(time, lamp) { U.uTime.value = time; U.uLamp.value = lamp; },
    dispose() { all.forEach(m => m.dispose()); scene.traverse(o => o.geometry?.dispose()); },
  };
}
