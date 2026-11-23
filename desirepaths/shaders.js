// Desire paths shaders: four small programs, so a D3D11 driver links each fast.
// STAMP draws footprints into the deposit target, added in.
// WEAR adds the deposit to the wear field and heals the rest.
// LAWN lights the turf, the worn earth and the flags.
// FINAL tones the frame.

const HEAD = `#version 300 es
precision highp float;
`;

const NOISE = `
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// Gradient noise, -1 to 1: broad shapes with no grid in them.
float gn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 a = hash2(i) * 2.0 - 1.0, b = hash2(i + vec2(1, 0)) * 2.0 - 1.0;
  vec2 c = hash2(i + vec2(0, 1)) * 2.0 - 1.0, d = hash2(i + vec2(1, 1)) * 2.0 - 1.0;
  return 1.6 * mix(mix(dot(a, f), dot(b, f - vec2(1, 0)), u.x), mix(dot(c, f - vec2(0, 1)), dot(d, f - vec2(1, 1)), u.x), u.y);
}
`;

// The planner's two paths, 1.8 m wide, crossing at right angles.
// The numbers match PATHS in lawn.js.
const PAVED = `
const float PH_Y = -1.7, PV_X = 2.4, P_HALF = 0.9;
// Distance inside the paving: positive on the flags, negative on the turf.
float pavedD(vec2 p) { return max(P_HALF - abs(p.y - PH_Y), P_HALF - abs(p.x - PV_X)); }
`;

/* ---------- STAMP ---------- */
export const STAMP_VS = `${HEAD}
layout(location = 0) in vec4 aP;
layout(location = 1) in vec4 aQ;
// The field's lower-left corner and size, in metres.
uniform vec4 uField;
out vec2 vL;
out vec4 vQ;
out vec2 vDir;
void main() {
  vec2 c = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0 - 1.0;
  // The quad holds the sole and its brushed halo.
  float R = 0.3 * aQ.x;
  vec2 d = vec2(cos(aP.z), sin(aP.z));
  vec2 w = aP.xy + (vec2(d.y, -d.x) * c.x + d * c.y) * R;
  vL = c * R;
  vQ = vec4(aP.w, aQ.yzw);
  vDir = d;
  gl_Position = vec4((w - uField.xy) / uField.zw * 2.0 - 1.0, 0.0, 1.0);
}`;

export const STAMP_FS = `${HEAD}
in vec2 vL;
in vec4 vQ;
in vec2 vDir;
out vec4 o;
void main() {
  // x runs across the foot, y along it, heel to toe.
  float t = vL.y / 0.135;
  // A sole: 7 cm wide at the heel, 10 cm at the ball, a waist between.
  float hw = mix(0.034, 0.05, smoothstep(-0.55, 0.35, t)) * (1.0 - 0.18 * exp(-pow((t + 0.15) / 0.25, 2.0)));
  float e = length(vec2(vL.x / hw, t));
  float core = 1.0 - smoothstep(0.72, 1.05, e);
  // The heel and the ball press hardest.
  core *= 0.7 + 0.3 * (exp(-pow((t + 0.68) / 0.25, 2.0)) + exp(-pow((t - 0.4) / 0.3, 2.0)));
  // The halo: blades the shoe brushes aside.
  float halo = exp(-dot(vL, vL) / (0.15 * 0.15)) * vQ.y;
  float w = vQ.x;
  o = vec4(core * w, halo * w, vDir * (core + halo) * w);
}`;

/* ---------- WEAR ---------- */
// R: wear (0 green, 0.35 yellow, 0.6 to 1 bare, 1.2 packed hard).
// G: flattening, the floor of the lean. BA: lean, its direction times its amount.
export const WEAR_FS = `${HEAD}
in vec2 vUv;
uniform sampler2D uField, uDep;
uniform vec4 uField4;
// uDt: seconds for the spring back. uHeal: seconds of slow healing.
uniform float uDt, uHeal, uGain, uRegrow;
out vec4 o;
${PAVED}
void main() {
  vec4 f = texture(uField, vUv);
  vec4 d = texture(uDep, vUv);
  vec2 p = uField4.xy + vUv * uField4.zw;
  float W = f.r, F = f.g;
  // The lean is stored as an axis, at twice its angle.
  // So walks there and back add up and never cancel.
  vec2 v = f.ba;
  float L = length(v);
  vec2 ax = L > 1e-4 ? v / L : vec2(1.0, 0.0);
  // The bend springs back to the flattening in about 5 s.
  float tau = uRegrow > 0.5 ? 0.35 : 5.0;
  L = F + max(L - F, 0.0) * exp(-uDt / tau);
  // A print lays the blades along the walk.
  float push = clamp(d.r * 0.9 + d.g * 0.45, 0.0, 1.0);
  float dl = length(d.ba);
  if (dl > 1e-4) {
    float th = 2.0 * atan(d.a, d.b);
    vec2 m = mix(ax, vec2(cos(th), sin(th)), clamp(push * 1.3, 0.0, 1.0));
    if (dot(m, m) > 1e-6) ax = normalize(m);
  }
  L += (0.95 - L) * push;
  // Many passes flatten the turf for good, then wear it through.
  // The wear takes a blurred deposit: soil and roots share the load.
  vec2 tx = 1.0 / vec2(textureSize(uDep, 0));
  float kb = d.r * 0.2;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785;
    kb += 0.06 * texture(uDep, vUv + vec2(cos(a), sin(a)) * tx * 2.5).r + 0.04 * texture(uDep, vUv + vec2(cos(a + 0.39), sin(a + 0.39)) * tx * 5.0).r;
  }
  float k = kb * uGain;
  F += k * 0.35 * (1.0 - F);
  W += k * 0.05 * smoothstep(0.2, 0.75, F) * clamp((1.3 - W) / 1.3, 0.0, 1.0);
  // Healing: bare earth greens slowest; flat turf stands once green.
  W = max(0.0, W - uHeal / 600.0 * (W > 0.6 ? 0.6 : 1.0));
  float gate = uRegrow > 0.5 ? 1.0 : 1.0 - smoothstep(0.15, 0.4, W);
  F = max(0.0, F - uHeal / 240.0 * gate);
  L = clamp(max(L, F), 0.0, 0.95);
  // The flags take no wear.
  if (pavedD(p) > 0.0) { W = 0.0; F = 0.0; L = 0.0; }
  o = vec4(W, F, ax * L);
}`;

/* ---------- LAWN ---------- */
export const LAWN_FS = `${HEAD}
in vec2 vUv;
uniform sampler2D uField;
uniform vec4 uField4, uView;
uniform vec3 uSun, uSunC, uSkyC;
uniform float uPx, uT, uWind, uCloud;
out vec4 o;
${NOISE}
${PAVED}

vec4 field(vec2 p) { return texture(uField, (p - uField4.xy) / uField4.zw); }
// The mown stripes: 0.9 m wide, the blades lean up or down the lawn.
vec2 mown(vec2 p) { float s = mod(floor((p.x + 0.45) / 0.9), 2.0); return vec2(0.0, s > 0.5 ? 0.3 : -0.3); }
// Turf height in metres: about 6 cm standing, lower when flat, a trough when worn.
float hAt(vec2 p) {
  vec4 f = field(p);
  // Height takes only the flattening: a passing bend leaves no step.
  float lean = max(f.g, 0.3);
  float bare = smoothstep(0.55, 1.0, f.r);
  float h = 0.06 * (1.0 - 0.72 * lean) * (1.0 - bare) - 0.015 * smoothstep(0.5, 1.2, f.r);
  return pavedD(p) > 0.0 ? -0.012 : h;
}
// The turf alone, for the slope: the step at the flags has its own light.
float hTurf(vec2 p) {
  vec4 f = field(p);
  return -0.015 * smoothstep(0.5, 1.2, f.r) + 0.06 * (1.0 - 0.72 * max(f.g, 0.3)) * (1.0 - smoothstep(0.55, 1.0, f.r));
}

void main() {
  vec2 p = uView.xy + vUv * uView.zw;
  vec4 f = field(p);
  float W = f.r;
  vec2 sunH = normalize(uSun.xy);
  float tanE = uSun.z / length(uSun.xy);

  // The sun: a short march over the turf heights toward it.
  // Turf is porous: the test is soft, and a shadow lets some sun through.
  float h0 = hAt(p), occ = 0.0;
  for (int i = 1; i <= 6; i++) {
    float t = float(i) * 0.026;
    float hh = hAt(p + sunH * t);
    occ = max(occ, smoothstep(0.005, 0.03, hh - h0 - t * tanE));
  }
  float lit = 1.0 - 0.6 * occ;
  // The cloud shadows drift over at the wind's pace.
  float cl = gn(p * 0.035 + vec2(uCloud, uCloud * 0.35)) * 0.7 + gn(p * 0.09 + vec2(uCloud * 1.6, 3.0)) * 0.3;
  float cloud = mix(1.0, 0.45, smoothstep(0.08, 0.42, cl));
  // The slope of the ground: a worn trough tilts to and from the sun.
  // The turf is soft: its slope reads at about a third of the step.
  float e = 0.05;
  vec3 n = normalize(vec3(vec2(hTurf(p - vec2(e, 0)) - hTurf(p + vec2(e, 0)), hTurf(p - vec2(0, e)) - hTurf(p + vec2(0, e))) * 0.35, 2.0 * e));
  if (pavedD(p) > 0.0) n = vec3(0, 0, 1);
  float sunK = max(dot(n, uSun), 0.0) / uSun.z * lit * cloud;

  vec3 col;
  float pd = pavedD(p);
  // A ragged turf edge hangs a few cm over the flags.
  float rag = (vn(p * 70.0) - 0.4) * 0.03 + gn(p * 9.0) * 0.008;
  if (pd - rag > 0.0) {
    /* ---- the flags ---- */
    vec2 g = (p - vec2(PV_X - P_HALF, PH_Y - P_HALF)) / 0.6;
    vec2 cell = floor(g), fr = fract(g);
    float tone = hash(cell);
    float j = min(min(fr.x, 1.0 - fr.x), min(fr.y, 1.0 - fr.y)) * 0.6;
    float joint = 1.0 - smoothstep(0.003, 0.003 + uPx * 0.8, j);
    float grit = vn(p * 160.0) * 0.6 + vn(p * 45.0) * 0.4;
    vec3 alb = vec3(0.29, 0.28, 0.26) * (0.86 + 0.16 * tone) * (0.9 + 0.2 * grit);
    alb *= 1.0 - 0.06 * smoothstep(0.3, 0.8, gn(p * 1.3 + cell));
    // Moss lives in some joints.
    vec3 jc = mix(vec3(0.05, 0.05, 0.045), vec3(0.06, 0.09, 0.03), step(0.55, vn(p * 6.0)));
    alb = mix(alb, jc, joint);
    // Earth tracked out of a worn line onto the flags.
    float mud = 0.0;
    // Look just past the nearest paving edge, along each axis.
    for (int k = 0; k < 4; k++) {
      vec2 ax = k == 0 ? vec2(-1, 0) : k == 1 ? vec2(1, 0) : k == 2 ? vec2(0, -1) : vec2(0, 1);
      mud = max(mud, smoothstep(0.55, 1.0, field(p + ax * (pd + 0.05)).r));
    }
    alb = mix(alb, vec3(0.3, 0.24, 0.17), mud * exp(-pd / 0.22) * (0.35 + 0.4 * vn(p * 30.0)));
    col = alb * (uSunC * sunK + uSkyC);
  } else {
    /* ---- the turf ---- */
    // The lean: its amount from the floor or the vector, its way from the vector.
    float vl = length(f.ba);
    float L = max(vl, f.g);
    vec2 base = mown(p);
    // The stored axis takes the mown stripe's sense.
    float ta = 0.5 * atan(f.a, f.b);
    vec2 ld = vec2(cos(ta), sin(ta));
    if (dot(ld, base) < 0.0) ld = -ld;
    vec2 v = vl > 1e-4 || f.g > 0.0 ? ld * L : vec2(0.0);
    // Wind: standing blades sway; flat ones do not.
    float wv = gn(p * 0.45 - vec2(uWind * 0.9, uWind * 0.3)) * 0.6 + gn(p * 1.4 - vec2(uWind * 1.8, 0.0)) * 0.4;
    vec2 lv0 = base * (1.0 - L) + v;
    vec2 wnd = vec2(0.13, 0.05) * wv * (1.0 - L);
    float lean = clamp(length(lv0 + wnd), 0.0, 0.95);

    // Blade grain: dots seen tip on when standing, streaks when laid down.
    // The grain ignores the wind, so the gusts move only the sheen.
    float l0 = length(lv0);
    vec2 gd = l0 > 1e-4 ? lv0 / l0 : vec2(0.0, 1.0);
    vec2 q = vec2(dot(p, vec2(gd.y, -gd.x)), dot(p, gd));
    float cw = max(0.004, uPx * 0.8);
    float grain = vn(vec2(q.x / cw, q.y / (cw * (1.0 + 7.0 * smoothstep(0.3, 0.9, l0)))));
    float grain2 = vn(vec2(q.x / (cw * 2.1), q.y / (cw * 2.1 * (1.0 + 5.0 * smoothstep(0.3, 0.9, l0)))) + 7.0);
    float g = grain * 0.6 + grain2 * 0.4;
    // Standing turf shows deep gaps between the tips.
    float depth = mix(0.5 + 0.62 * g, 0.74 + 0.42 * g, smoothstep(0.2, 0.85, lean));

    // The sward: a mix of grasses, darker patches, a few clover rafts.
    float pch = gn(p * 0.6) * 0.6 + gn(p * 2.3 + 4.0) * 0.4;
    vec3 green = mix(vec3(0.05, 0.13, 0.025), vec3(0.085, 0.16, 0.03), 0.5 + 0.5 * pch);
    float clover = smoothstep(0.3, 0.7, gn(p * 1.7 + 11.0)) * 0.35;
    green = mix(green, vec3(0.045, 0.12, 0.04), clover);
    // Dry, yellower grasses in drifts.
    green = mix(green, vec3(0.1, 0.15, 0.035), smoothstep(0.1, 0.7, gn(p * 0.35 + 23.0)) * 0.5);
    // Worn turf yellows, then thins to earth with tufts that hold on.
    float yel = smoothstep(0.22, 0.55, W + (vn(p * 22.0) - 0.5) * 0.12);
    vec3 straw = mix(vec3(0.15, 0.14, 0.055), vec3(0.21, 0.18, 0.075), vn(p * 40.0));
    vec3 grass = mix(green, straw, yel);
    float tuft = vn(p * 26.0) * 0.65 + vn(p * 70.0) * 0.35;
    float bare = smoothstep(0.5, 0.95, W + (tuft - 0.5) * 0.45);

    // Kajiya-Kay: a blade's sheen peaks across the half vector.
    // Trodden blades lie both ways along the walk: light both senses.
    vec3 H = normalize(uSun + vec3(0, 0, 1));
    float sheen = 0.0, face = 0.0;
    for (int k = 0; k < 2; k++) {
      vec2 lk = base * (1.0 - L) + (k == 0 ? v : -v) + wnd;
      float le = clamp(length(lk), 0.0, 0.95);
      vec2 dk = le > 1e-4 ? lk / le : vec2(0.0, 1.0);
      vec3 T = normalize(vec3(dk * le, sqrt(max(1.0 - le * le, 0.0))));
      float th = dot(T, H);
      sheen += 0.5 * pow(sqrt(max(1.0 - th * th, 0.0)), 14.0);
      face += 0.5 * (0.62 + 0.38 * dot(normalize(vec3(dk * le * 0.8, 1.0)), uSun) / uSun.z * 0.42);
    }
    vec3 gcol = grass * depth * (uSunC * sunK * face + uSkyC * mix(0.55, 1.0, lean)) + uSunC * sunK * sheen * (0.02 + 0.05 * lean) * mix(vec3(0.75, 0.95, 0.6), vec3(1.0, 0.9, 0.65), yel);

    // The bare earth: packed, pale, scuffed along the walk.
    float pack = smoothstep(0.85, 1.2, W);
    float scuff = vn(vec2(q.x / 0.01, q.y / 0.06)) * 0.5 + vn(p * 90.0) * 0.5;
    // Loose dust lies pale at the edges; the trodden middle packs darker.
    float mott = gn(p * 6.0) * 0.5 + gn(p * 17.0) * 0.5;
    vec3 soil = mix(vec3(0.15, 0.12, 0.085), vec3(0.12, 0.095, 0.07), pack) * (0.85 + 0.25 * scuff) * (0.92 + 0.12 * mott);
    // Small stones show where the soil is worn hard.
    float st = hash(floor(p * 55.0));
    soil = mix(soil, vec3(0.4, 0.38, 0.34), step(0.93, st) * pack * 0.8);
    vec3 scol = soil * (uSunC * sunK + uSkyC * 0.9);
    col = mix(gcol, scol, bare);
  }
  o = vec4(col, 1.0);
}`;

/* ---------- FINAL ---------- */
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
  c *= uExpo * (1.0 - 0.22 * dot(q, q));
  c = pow(aces(c), vec3(1.0 / 2.2));
  // Fine grain, and a dither against bands.
  c += (hash(gl_FragCoord.xy + uFrame * 17.0) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;
