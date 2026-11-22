// @ts-check
// Shared GLSL and JS: cloud light.
// The cloud phase, and light shafts under clouds.
// Paste CLOUDS into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// Phase, for any cloud march:
//   float ph = clPhase(dot(rd, sun));    // isotropic is 1; toward the sun about 14
//
// Light shafts: a dust veil in the low air, under cloud shade.
// The look is common; each toy gives its own occlusion source.
// A source returns vec2(lit, depth): the ray's lit share, 0 to 1,
// and its length in the veil, in metres.
//   vec2 sh = <the toy's source>(...);
//   c = clShaftLook(c, rd, sh, sun, glowC, k);
// k is the strength: clShaftGate() in JS times the toy's gain.
// glowC is the sun's glow colour on the sky.
// sun is the unit direction to the sun.
//
// Two sources:
//   Analytic: the toy computes vec2(lit, depth) itself (Railgun: ellipsoids, a trail).
//   A baked density field: paste CLOUD_FIELD_SHAFTS after CLOUDS.
//     The host defines float clDensity(vec3 p) before it.
//     vec2 sh = clShaftsField(ro, rd, tMax, base, top, sun, ext, reach, jit);
//     The units are the host's. Scale sh.y to metres for clShaftLook.
// Sources: Railgun (the shaft look), Window seat and Railgun (the phase).

export const CLOUDS = /* glsl */`
// Henyey-Greenstein phase, not normalised: isotropic is 1.
float clHg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }
// A strong forward lobe gives the silver lining; a soft back lobe.
float clPhase(float mu) { return mix(clHg(mu, 0.72), clHg(mu, -0.2), 0.35); }
// The ray's length in the veil from t0 to t1.
// The veil is even from the ground to height top.
float clVeil(vec3 ro, vec3 rd, float t0, float t1, float top) {
  if (rd.y > 1e-5) t1 = min(t1, (top - ro.y) / rd.y);
  return max(t1 - t0, 0.0);
}
// Shadow bands dim the sky; lit dust adds a sunward glow.
// sh: the ray's lit share and its veil depth in metres.
// k: the strength.
vec3 clShaftLook(vec3 c, vec3 rd, vec2 sh, vec3 sun, vec3 glowC, float k) {
  if (k < 0.001) return c;
  float cs = dot(rd, sun), g = 0.62;
  float ph = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cs, 1.5) * 0.08 + 0.05;
  // The bands stay off the horizon.
  // Low shadows pile up there.
  float dk = 1.1 * (1.0 - sh.x) * smoothstep(0.015, 0.07, rd.y);
  // A long path through lit dust stops adding light.
  float lit = 1.0 - exp(-sh.y * sh.x / 40000.0);
  // Shade loses the warm sunlight first: it turns cool, then dim.
  float s = min(dk * k, 0.85);
  return mix(c, c * vec3(0.5, 0.58, 0.74), s) + glowC * ph * lit * 0.4 * k;
}
`;

export const CLOUD_FIELD_SHAFTS = /* glsl */`
// The veil is the air under a cloud deck.
// The deck runs from base to top.
// Points along the view ray test the deck toward the sun.
// ext: extinction per unit density per unit length.
// reach: the longest sun path through the deck.
// With it, a low sun is not all shade.
// jit: 0 to 1, a per-pixel offset that hides the step bands.
// It returns the ray's lit share and its veil depth.
// The units are the host's.
vec2 clShaftsField(vec3 ro, vec3 rd, float tMax, float base, float top, vec3 sun, float ext, float reach, float jit) {
  float L = clVeil(ro, rd, 0.0, tMax, base);
  // A sun under the deck's horizon lights it from below: no shade.
  if (L <= 0.0 || sun.y < 0.01) return vec2(1.0, L);
  const int N = 12;
  float ds = L / float(N), lit = 0.0;
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * (ds * (float(i) + jit));
    float ta = (base - p.y) / sun.y, tb = min((top - p.y) / sun.y, ta + reach);
    float dl = (tb - ta) * 0.25, od = 0.0;
    for (int j = 0; j < 4; j++) od += clDensity(p + sun * (ta + dl * (float(j) + 0.5)));
    lit += exp(-od * dl * ext);
  }
  return vec2(lit / float(N), L);
}
`;

const sstep = (/** @type {number} */ x, /** @type {number} */ a, /** @type {number} */ b) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * The shafts' timing: they need a low sun, at dawn and late day only.
 * Multiply by the toy's gain for clShaftLook's k.
 * @param {number} sunUp the sun direction's y, -1 to 1
 * @param {number} [night] 0 by day, 1 at full night
 * @returns {number} 0 to 1
 */
export function clShaftGate(sunUp, night = 0) {
  return sstep(sunUp, -0.06, 0.0) * (1 - sstep(sunUp, 0.3, 0.55)) * (1 - night);
}
