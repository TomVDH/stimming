// Water wheel shaders. Each program stays small for a fast link on D3D11.
// World units are metres; uXf maps world to clip space.

const HEAD = `#version 300 es
precision highp float;
`;

// The sky and the static layer: masonry, flumes and hills from a 2D canvas.
export const BASE = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uStatic;
uniform vec2 uSunUv, uAsp;
uniform vec3 uSunCol, uSkyCol, uLowCol;
void main() {
  vec2 d = (vUv - uSunUv) * uAsp;
  float r = length(d);
  // Warm near the sun and the horizon, dusk blue above.
  float up = clamp((vUv.y - uSunUv.y + 0.15) * 1.6, 0.0, 1.0);
  vec3 sky = mix(uLowCol, uSkyCol, smoothstep(0.0, 1.0, up));
  sky += uSunCol * (0.7 * exp(-r * 7.0) + 0.16 * exp(-r * 2.0));
  // The disc sits behind thin cloud: a hot core with a soft edge.
  sky += uSunCol * 7.0 * smoothstep(0.034, 0.018, r);
  // Thin cloud bands catch the light near the sun.
  float band = sin(vUv.y * 38.0 + sin(vUv.x * 5.0) * 1.3) * 0.5 + 0.5;
  sky *= 1.0 + 0.12 * band * exp(-r * 2.5);
  vec4 s = texture(uStatic, vUv);
  vec3 lin = pow(s.rgb, vec3(2.2));
  // A soft veil of sun haze lies over the far layers.
  vec3 col = mix(sky, lin, s.a) + uSunCol * 0.05 * exp(-r * 3.0) * s.a;
  o = vec4(col, 1.0);
}`;

export const WHEEL_VS = `${HEAD}
uniform vec2 uC;
uniform float uR;
uniform vec4 uXf;
out vec2 vW;
void main() {
  const vec2 Q[6] = vec2[6](vec2(0.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0), vec2(0.0, 1.0));
  vec2 c = Q[gl_VertexID];
  vW = uC + (c * 2.0 - 1.0) * (uR + 0.08);
  gl_Position = vec4(vW * uXf.xy + uXf.zw, 0.0, 1.0);
}`;

// One wheel: shrouds, buckets with their water, arms and hub.
export const WHEEL_FS = `${HEAD}
in vec2 vW;
out vec4 o;
uniform vec2 uC, uSun;
uniform float uR, uD, uN, uArms, uAng, uDir, uWet, uPx;
uniform float uLevel[48];
uniform vec3 uSunCol, uSkyCol;
const float TAU = 6.2831853;

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
// Into the wheel's own frame: angles from the top, clockwise.
vec2 local(vec2 p) {
  float c = cos(uAng), s = sin(uAng);
  return vec2(p.x * c - p.y * s, p.y * c + p.x * s);
}
float sdWheel(vec2 p) {
  vec2 q = local(p);
  float r = length(q), th = atan(q.x, q.y);
  float R = uR, D = uD, t = 0.06 * R;
  float d = abs(r - (R - t * 0.5)) - t * 0.5;
  d = min(d, abs(r - (R - D + t * 0.5)) - t * 0.5);
  // Bucket boards lean back against the turn.
  float st = TAU / uN, lean = uDir * 0.45 * st;
  float k = floor((th + lean * 0.5) / st + 0.5);
  for (int i = -1; i <= 1; i++) {
    float a0 = (k + float(i)) * st, a1 = a0 - lean;
    d = min(d, seg(q, (R - D) * vec2(sin(a0), cos(a0)), (R - 0.01) * vec2(sin(a1), cos(a1))) - 0.018 * R);
  }
  float as = TAU / uArms, ka = floor(th / as + 0.5) * as;
  vec2 ad = vec2(sin(ka), cos(ka));
  float along = dot(q, ad), across = abs(q.x * ad.y - q.y * ad.x);
  d = min(d, max(across - 0.045 * R, max(0.1 * R - along, along - (R - D + 0.01))));
  // The hub: an octagon round an iron axle.
  float oa = atan(q.x, q.y), oc = cos(TAU / 16.0) / cos(mod(oa, TAU / 8.0) - TAU / 16.0);
  d = min(d, r - 0.17 * R * oc);
  return d;
}
void main() {
  vec2 p = vW - uC;
  float r = length(p), px = uPx;
  if (r > uR + px * 2.0) discard;
  float e = px;
  float d = sdWheel(p);
  vec2 n = normalize(vec2(sdWheel(p + vec2(e, 0.0)) - sdWheel(p - vec2(e, 0.0)), sdWheel(p + vec2(0.0, e)) - sdWheel(p - vec2(0.0, e))) + 1e-6);
  vec2 toSun = normalize(uSun - vW);
  vec3 wood = mix(vec3(0.085, 0.045, 0.025), vec3(0.05, 0.028, 0.017), uWet);

  // The back shroud fills the bucket band; water sits in it.
  vec2 q = local(p);
  float R = uR, D = uD, st = TAU / uN;
  float band = smoothstep(R - D - px, R - D + px, r) * smoothstep(R + px, R - px, r);
  float tt = clamp((r - R + D) / D, 0.0, 1.0);
  float th = atan(q.x, q.y) + uDir * 0.45 * st * tt;
  int kb = int(mod(floor(th / st), uN));
  float lvl = uLevel[kb];
  float wet = smoothstep(lvl + px, lvl - px, vW.y);
  vec3 back = wood * 0.32 + uSkyCol * 0.012;
  float deep = clamp((lvl - vW.y) / D, 0.0, 1.0);
  // Backlit water glows: bright under its line, darker deep down.
  vec3 water = mix(vec3(0.3, 0.4, 0.4) + uSunCol * 0.42, vec3(0.08, 0.13, 0.13) + uSunCol * 0.16, deep);
  water += uSunCol * 1.2 * smoothstep(2.5 * px, 0.0, lvl - vW.y);
  vec3 col = mix(back, water, wet * band);

  float a = smoothstep(px, -px, d);
  // Edges that face the sun take a thin warm rim.
  float edge = smoothstep(-2.5 * px, 0.0, d);
  float facing = max(0.0, dot(n, toSun));
  vec3 lit = wood * (0.5 + 0.3 * max(0.0, n.y));
  lit += uSunCol * edge * pow(facing, 3.0) * (0.3 + uWet * 0.5);
  lit += uSkyCol * edge * 0.6 * max(0.0, n.y);
  // Wet wood shows a thin highlight along the rim.
  lit += uSunCol * uWet * 0.35 * pow(facing, 16.0) * edge;
  col = mix(col, lit, a);
  float alpha = max(a, band);
  o = vec4(col * alpha, alpha);
}`;

// Water particles as soft splats into the density field.
export const SPLAT_VS = `${HEAD}
layout(location = 0) in vec4 aP;
uniform vec4 uXf;
uniform float uSize;
out float vFoam, vK;
void main() {
  vFoam = aP.z; vK = aP.w;
  gl_Position = vec4(aP.xy * uXf.xy + uXf.zw, 0.0, 1.0);
  gl_PointSize = uSize * (0.6 + 0.4 * aP.w);
}`;
export const SPLAT_FS = `${HEAD}
in float vFoam, vK;
out vec4 o;
uniform vec3 uTint;
uniform float uMode;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float g = exp(-dot(c, c) * 4.0);
  if (uMode > 0.5) { o = vec4(uTint * g * vK, 0.0); return; }
  o = vec4(g, g * vFoam, 0.0, 0.0);
}`;

// The water: density to a body with an edge, refraction and backlight.
export const WATER = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene, uDens;
uniform vec2 uTexel, uSunUv, uAsp;
uniform vec3 uSunCol, uSkyCol;
void main() {
  vec3 bg = texture(uScene, vUv).rgb;
  vec4 D = texture(uDens, vUv);
  float d = D.r;
  float a = smoothstep(0.28, 0.62, d);
  if (a < 0.002) { o = vec4(bg, 1.0); return; }
  vec2 g = vec2(texture(uDens, vUv + vec2(uTexel.x, 0.0)).r - texture(uDens, vUv - vec2(uTexel.x, 0.0)).r,
                texture(uDens, vUv + vec2(0.0, uTexel.y)).r - texture(uDens, vUv - vec2(0.0, uTexel.y)).r);
  // The outward normal points down the density slope.
  vec2 n = -g / (length(g) + 0.25);
  float th = 1.0 - exp(-d * 0.45);
  vec3 refr = texture(uScene, vUv - n * 0.007 * a).rgb;
  vec3 col = refr * mix(vec3(0.9, 0.97, 1.0), vec3(0.32, 0.5, 0.52), th);
  vec2 ds = (uSunUv - vUv) * uAsp;
  vec2 toSun = normalize(ds);
  float rim = a * (1.0 - smoothstep(0.5, 1.1, d));
  float facing = max(0.0, dot(normalize(n + 1e-5), toSun));
  // Backlit water: the body scatters the sun forward, the sun-side edge burns.
  float near = exp(-length(ds) * 2.2);
  col += uSunCol * th * (0.05 + 0.5 * near);
  col += uSunCol * rim * (0.08 + 0.9 * pow(facing, 3.0));
  col += uSkyCol * 0.5 * rim * max(0.0, n.y);
  float foam = clamp(D.g / max(d, 1e-3), 0.0, 1.0);
  col = mix(col, uSunCol * 0.3 + vec3(0.5, 0.52, 0.52), foam * 0.75);
  o = vec4(mix(bg, col, a), 1.0);
}`;

// Sun shafts: the bright sky smeared toward the sun, so the arms cut rays.
export const RAYS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uSunUv, uAsp;
void main() {
  vec2 dv = (uSunUv - vUv) / 32.0;
  vec2 uv = vUv;
  vec3 s = vec3(0.0);
  float w = 1.0;
  for (int i = 0; i < 32; i++) {
    // Only light near the sun casts a shaft.
    float near = exp(-length((uv - uSunUv) * uAsp) * 6.0);
    s += max(texture(uSrc, uv).rgb - 0.6, 0.0) * near * w;
    w *= 0.93;
    uv += dv;
  }
  o = vec4(s / 32.0, 1.0);
}`;

// The grade: filmic curve, bloom, vignette and grain.
export const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom, uRays;
uniform float uExpo, uBloomK, uFrame, uRaysK;
uniform vec2 uRes;
vec3 film(vec3 x) {
  x *= uExpo;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK + texture(uRays, vUv).rgb * uRaysK;
  c = film(c);
  vec2 v = vUv - 0.5;
  c *= 1.0 - 0.38 * dot(v, v) * 1.6;
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 13.1) - 0.5) * 0.022;
  o = vec4(c, 1.0);
}`;
