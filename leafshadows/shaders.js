// Leaf shadows shaders: five small programs, so a D3D11 driver links each fast.
// LEAF draws leaves and sticks into a transmittance mask, multiplied in.
// BLUR spreads a mask by the sun's disc at that layer's distance.
// BAKE writes the plaster's height and tone once per size.
// WALL lights the plaster; FINAL tones the frame.

const HEAD = `#version 300 es
precision highp float;
`;

const NOISE = `
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
`;

export const LEAF_VS = `${HEAD}
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;
uniform vec4 uBr[24];
// The mask's lower-left corner and size, in metres.
uniform vec4 uView;
uniform float uPt, uPf, uPad;
out vec2 vL;
out vec4 vS;
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
void main() {
  vec4 br = uBr[int(aB.z)];
  float s = aB.w, A = br.w;
  // A twig bobs about its base, faster than the branch.
  // The phase comes from the base, so a shoot's stem and leaves move as one.
  float st = fract(sin(dot(aB.xy, vec2(127.1, 311.7))) * 43758.5453);
  float th = A * (0.09 * sin(uPt * (0.8 + 0.4 * st) + st * 31.0) + 0.035 * sin(uPt * 2.3 + st * 17.0));
  // A main stem is rigid: only its branch moves it.
  if (aC.x > 0.5) th *= aC.w;
  vec2 base = rot(aA.xy - aB.xy, th) + aB.xy;
  base = rot(base - br.xy, br.z) + br.xy;
  float ang = aA.w + th + br.z, len = aA.z, hw, bend;
  if (aC.x < 0.5) {
    // Flutter: a leaf twists, and turns edge-on to let the sun through.
    // A cap keeps the crown's cover in a strong wind.
    float fl = aC.w * min(A, 1.1);
    ang += fl * 0.35 * sin(uPf * (0.8 + 0.5 * fract(s * 7.1)) + s * 53.0);
    float flip = fl * 0.85 * sin(uPf * (1.05 + 0.6 * fract(s * 13.7)) + s * 91.0);
    float wsc = max(0.2, abs(cos(flip)));
    hw = 0.5 * aC.y * len * wsc;
    bend = aC.z * len * wsc;
  } else {
    hw = aC.y;
    bend = aC.z;
  }
  vec2 c = vec2(gl_VertexID & 1, gl_VertexID >> 1);
  float u = mix(-uPad - hw, len + uPad + hw, c.x);
  float v = mix(-1.0, 1.0, c.y) * (max(hw, bend) + abs(bend) + uPad);
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 p = base + dir * u + vec2(-dir.y, dir.x) * v;
  vL = vec2(u, v);
  vS = vec4(len, hw, aC.x, bend);
  gl_Position = vec4((p - uView.xy) / uView.zw * 2.0 - 1.0, 0.0, 1.0);
}`;

export const LEAF_FS = `${HEAD}
in vec2 vL;
in vec4 vS;
// The edge width in metres: a pixel, or the near layer's penumbra.
uniform float uAA;
uniform vec3 uTau;
out vec4 o;
void main() {
  float len = vS.x, hw = vS.y, u = vL.x, v = vL.y;
  if (vS.z < 0.5) {
    // An ovate blade with a drawn-out tip, on a short stalk.
    float bt = (u / len - 0.18) / 0.82;
    float vb = v - vS.w * bt * bt;
    float w = (bt > 0.0 && bt < 1.0) ? hw * pow(bt, 0.55) * pow(1.0 - bt, 0.9) / 0.381 : 0.0;
    float blade = 1.0 - smoothstep(-uAA, uAA, abs(vb) - w);
    float ps = 0.0011;
    float pet = (1.0 - smoothstep(-uAA, uAA, abs(v) - ps)) * min(1.0, 2.0 * ps / uAA) * step(0.0, u) * step(u, len * 0.2);
    float cov = max(blade, pet);
    o = vec4(mix(vec3(1.0), uTau, cov), 1.0);
  } else {
    // A stick tapers from base to tip and has round ends.
    float r = mix(hw, vS.w, clamp(u / len, 0.0, 1.0));
    float d = length(vec2(u - clamp(u, 0.0, len), v)) - r;
    float cov = (1.0 - smoothstep(-uAA, uAA, d)) * min(1.0, 2.0 * r / uAA);
    o = vec4(vec3(1.0 - cov), 1.0);
  }
}`;

// The sun's disc on the wall, an ellipse, with limb darkening.
// Equal-area taps on a golden-angle spiral.
export const BLUR_FS = `${HEAD}
in vec2 vUv;
uniform sampler2D uSrc, uPrev;
uniform vec2 uMaj, uMin;
uniform int uN;
uniform float uPrevK;
out vec4 o;
void main() {
  vec3 acc = vec3(0.0);
  float ws = 0.0;
  for (int i = 0; i < 64; i++) {
    if (i >= uN) break;
    float r = sqrt((float(i) + 0.5) / float(uN)), a = float(i) * 2.39996323;
    vec2 d = uMaj * (r * cos(a)) + uMin * (r * sin(a));
    float w = 1.0 - 0.6 * (1.0 - sqrt(max(0.0, 1.0 - r * r)));
    acc += texture(uSrc, vUv + d).rgb * w;
    ws += w;
  }
  vec3 T = acc / ws;
  // The layer nearer the sun dims what reaches this one.
  if (uPrevK > 0.5) T *= texture(uPrev, vUv).rgb;
  o = vec4(T, 1.0);
}`;

// The lime plaster: height in red (about a millimetre), tone in green.
export const BAKE_FS = `${HEAD}
in vec2 vUv;
uniform vec4 uWall;
uniform float uPxM;
out vec4 o;
${NOISE}
// Gradient noise, -1 to 1: no grid shows in broad strokes.
vec2 g2(vec2 i) { float a = hash(i) * 6.2831853; return vec2(cos(a), sin(a)); }
float gn(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(g2(i), f), b = dot(g2(i + vec2(1, 0)), f - vec2(1, 0));
  float c = dot(g2(i + vec2(0, 1)), f - vec2(0, 1)), d = dot(g2(i + vec2(1, 1)), f - vec2(1, 1));
  return 1.4 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// An octave fades out before it is finer than a pixel.
float oct(vec2 p, float f, float k) { return vn(p * f + k) * (1.0 - smoothstep(0.25, 0.55, f * uPxM)); }
void main() {
  // The offset keeps every octave's lattice off the view's centre line.
  vec2 p = uWall.xy + vUv * uWall.zw + vec2(13.37, 7.21);
  float grain = 0.45 * oct(p, 420.0, 1.0) + 0.3 * oct(p, 800.0, 7.0) + 0.25 * oct(p, 190.0, 3.0);
  // Trowel strokes: broad swirls, each with a soft raised edge.
  vec2 q = p * 2.2 + 0.9 * vec2(gn(p * 0.9), gn(p * 0.9 + 9.0));
  float sw = gn(q * vec2(1.0, 1.8));
  float edge = 1.0 - smoothstep(0.0, 0.22, abs(sw));
  float h = 0.35 * grain + 0.35 * edge + 0.25 * smoothstep(-0.6, 0.8, sw) + 0.15 * gn(p * 22.0 + 5.0);
  // A few small pits in the lime.
  float pit = smoothstep(0.9, 0.985, vn(p * 180.0 + 31.0)) * (1.0 - smoothstep(0.25, 0.55, 180.0 * uPxM));
  h -= 0.35 * pit;
  float tone = 0.5 + 0.3 * gn(p * 1.5 + 5.0) + 0.12 * gn(p * 8.0 + 1.0) - 0.2 * pit;
  o = vec4(h, tone, 0.0, 1.0);
}`;

export const WALL_FS = `${HEAD}
in vec2 vUv;
uniform sampler2D uBake, uT, uNear;
// The view and the masks, each as lower-left corner and size in metres.
uniform vec4 uWall, uMask;
uniform vec3 uSun, uSunC, uSkyC, uBounce;
uniform float uPxM, uBump;
// The hand: x, y, presence, angle; its splay and its edge width.
uniform vec4 uHand;
uniform float uSplay, uHandSoft;
out vec4 o;
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
float cap(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// An open hand, fingers up, palm to the wall; the forearm runs down.
float hand(vec2 p) {
  vec2 q = abs(p - vec2(0.0, 0.004)) - vec2(0.034, 0.036);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.016;
  float sp = uSplay;
  vec4 fx = vec4(-0.033, -0.011, 0.011, 0.032);
  vec4 fy = vec4(0.044, 0.05, 0.048, 0.04);
  vec4 fl = vec4(0.072, 0.083, 0.077, 0.06);
  vec4 fa = vec4(-0.16, -0.05, 0.05, 0.17) * sp;
  for (int i = 0; i < 4; i++) {
    vec2 a = vec2(fx[i], fy[i]);
    vec2 b = a + vec2(sin(fa[i]), cos(fa[i])) * fl[i];
    d = smin(d, cap(p, a, b, 0.0108, 0.0088), 0.01);
  }
  vec2 ta = vec2(-0.03, -0.02), tb = ta + rot(vec2(-0.048, 0.042), 0.3 * sp - 0.1);
  d = smin(d, cap(p, ta, tb, 0.0155, 0.0115), 0.016);
  d = smin(d, cap(p, vec2(0.0, -0.045), vec2(0.0, -2.5), 0.03, 0.07), 0.025);
  return d;
}
void main() {
  vec2 p = uWall.xy + vUv * uWall.zw;
  ivec2 ip = ivec2(gl_FragCoord.xy), mx = textureSize(uBake, 0) - 1;
  vec2 hb = texelFetch(uBake, ip, 0).rg;
  float hl = texelFetch(uBake, clamp(ip - ivec2(1, 0), ivec2(0), mx), 0).r;
  float hr = texelFetch(uBake, clamp(ip + ivec2(1, 0), ivec2(0), mx), 0).r;
  float hd = texelFetch(uBake, clamp(ip - ivec2(0, 1), ivec2(0), mx), 0).r;
  float hu = texelFetch(uBake, clamp(ip + ivec2(0, 1), ivec2(0), mx), 0).r;
  // Height is in millimetres; a pixel is uPxM metres.
  float k = uBump * 0.0005 / uPxM;
  vec3 n = normalize(vec3((hl - hr) * k, (hd - hu) * k, 1.0));

  vec2 mu = (p - uMask.xy) / uMask.zw;
  vec3 T = texture(uT, mu).rgb * texture(uNear, mu).rgb;
  // The hand's shadow; light through the skin at its edge glows red.
  // The hand draws 1.4 times life size, so it reads among the leaves.
  float hc = (1.0 - smoothstep(-uHandSoft, uHandSoft, 1.4 * hand(rot(p - uHand.xy, -uHand.w) / 1.4))) * uHand.z;
  T *= mix(vec3(1.0), vec3(0.03, 0.008, 0.004) * (1.0 - hc), hc);

  float ndl = max(dot(n, uSun), 0.0) / uSun.z;
  float ao = clamp(0.85 + 0.5 * (hb.r - 0.35), 0.55, 1.1);
  vec3 alb = vec3(0.72, 0.62, 0.49) * (0.88 + 0.24 * hb.g);
  vec3 light = uSunC * T * ndl + (uSkyC * (0.6 + 0.4 * n.z) + uBounce * (1.0 - vUv.y)) * ao;
  o = vec4(alb * light, 1.0);
}`;

export const FINAL_FS = `${HEAD}
in vec2 vUv;
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame;
out vec4 o;
${NOISE}
vec3 aces(vec3 x) { return clamp(x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  vec2 q = vUv - 0.5;
  q.x *= uAsp;
  c *= uExpo * (1.0 - 0.28 * dot(q, q));
  c = pow(aces(c), vec3(1.0 / 2.2));
  // Fine grain, and a dither against bands in the soft gradients.
  c += (hash(gl_FragCoord.xy + uFrame * 17.0) - 0.5) * 0.014;
  o = vec4(c, 1.0);
}`;
