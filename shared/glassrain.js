// Shared GLSL: rain on a window pane, and pane fog.
// Window seat's drops grew from Train Ride's; this module holds the one version.
// Paste GLASS_RAIN into a fragment shader. It brings its own hashes and noise.
// p is a point on the pane in metres, or close to it.
//
// Use:
//   vec2 off; float rim, spec, cover, clear;
//   grBeads(p, wet, strip, off, rim, spec, cover);
//   grRuns(p, m, flow, wet, off, rim, spec, cover, clear);
//   Sample the view behind at the pixel plus off; darken by rim; add light by spec.
// m is the run direction on the pane: straight down at rest, aft with speed.
// flow is the run distance in pane units; integrate it on the CPU.

export const GLASS_RAIN = /* glsl */`
float grH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 grH2(vec2 p) { return vec2(grH(p), grH(p + 17.17)); }
float grN(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(grH(i), grH(i + vec2(1, 0)), u.x), mix(grH(i + vec2(0, 1)), grH(i + vec2(1, 1)), u.x), u.y);
}
float grFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * grN(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

// Still beads: one per cell, by chance.
// xy is the spot inside the drop, z its radius, w its weight.
vec4 grBead(vec2 p, float sc, float dens, float seed) {
  vec2 g = p * sc, i = floor(g), f = fract(g);
  if (grH(i + seed) > dens) return vec4(0.0);
  vec2 o = 0.25 + 0.5 * grH2(i + seed * 3.0);
  float r = 0.06 + 0.14 * grH(i + seed + 5.0);
  vec2 dv = (f - o) / r;
  if (dot(dv, dv) > 1.0) return vec4(0.0);
  return vec4(dv, r / sc, 1.0);
}
// Running drops: lanes along m, small fast heads with thin trails.
// trail returns the clear track the head wipes through fog.
vec4 grRun(vec2 p, vec2 m, float flow, float Wc, float keep, float seed, float tl0, out float trail) {
  trail = 0.0;
  vec2 ax = vec2(-m.y, m.x);
  float u = dot(p, ax), v = dot(p, m);
  float col = floor(u / Wc);
  float h = grH(vec2(col, seed));
  if (h > keep) return vec4(0.0);
  // Gusts make each run wander across its lane.
  float fu = (fract(u / Wc) - 0.5) * Wc + sin(v * 60.0 + h * 40.0) * 0.0015 + (h - 0.5) * Wc * 0.4;
  float sp = 0.6 + 0.8 * grH(vec2(col, seed + 7.0));
  float head = mod(flow * sp + h * 17.0, 1.6) - 0.8;
  float dv = v - head;
  float hr = 0.0016 + 0.0016 * h;
  vec2 q = vec2(fu / hr, dv / (hr * 1.6));
  if (dot(q, q) < 1.0) return vec4(ax * q.x + m * q.y, hr * 1.2, 1.0);
  float tl = tl0 * (0.1 + 0.12 * h);
  if (dv < 0.0 && dv > -tl * 2.0) trail = smoothstep(1.0, 0.5, abs(fu) / hr) * (1.0 + dv / (tl * 2.0));
  // Behind the head, a thin thread breaks into small beads.
  if (dv < 0.0 && dv > -tl) {
    float age = -dv / tl;
    float cell = v * 260.0 + h * 9.0;
    vec2 tb = vec2(fu / 0.0008, (fract(cell) - 0.5) * 2.4);
    if (grH(vec2(col, floor(cell))) > 0.55 && dot(tb, tb) < 1.0) return vec4(ax * tb.x + m * tb.y, 0.0008, 0.7);
    float tw = 0.0008 * (1.0 - 0.6 * age);
    if (abs(fu) < tw) return vec4(ax * (fu / tw), tw, 0.8 * (1.0 - age));
  }
  return vec4(0.0);
}
// A drop acts as a lens: it flips the view behind it, and its edge reads dark.
// L is the light direction for the small highlight.
void grLens(vec4 b, float k, vec3 L, inout vec2 off, inout float rim, inout float spec, inout float cover) {
  if (b.w <= 0.0) return;
  k *= b.w;
  float dd = dot(b.xy, b.xy), h = sqrt(max(1.0 - dd, 0.0));
  off -= b.xy / max(h, 0.2) * b.z * 4.0 * k;
  rim = max(rim, k * smoothstep(0.45, 0.98, dd));
  cover = max(cover, k * (1.0 - dd));
  vec3 N = normalize(vec3(b.xy, h * 1.4));
  spec = max(spec, k * pow(max(dot(N, L), 0.0), 60.0));
}
// Beads: three sizes; strip thins the two larger ones at speed.
void grBeads(vec2 p, float wet, float strip, vec3 L, inout vec2 off, inout float rim, inout float spec, inout float cover) {
  if (wet <= 0.001) return;
  grLens(grBead(p + 0.37, 60.0, 0.22 * wet * strip, 2.0), wet, L, off, rim, spec, cover);
  grLens(grBead(p + 0.71, 160.0, 0.26 * wet * strip, 3.0), wet, L, off, rim, spec, cover);
  grLens(grBead(p + 0.13, 380.0, 0.35 * wet, 6.0), wet, L, off, rim, spec, cover);
}
// Runs: two lane sets; tl0 scales the trail length.
void grRuns(vec2 p, vec2 m, float flow, float wet, float tl0, vec3 L, inout vec2 off, inout float rim, inout float spec, inout float cover, inout float clear) {
  if (wet <= 0.001) return;
  float t1, t2;
  grLens(grRun(p, m, flow, 0.01, 0.8 * wet, 4.0, tl0, t1), wet, L, off, rim, spec, cover);
  grLens(grRun(p * 1.3 + 0.2, m, flow, 0.01, 0.7 * wet, 5.0, tl0, t2), wet, L, off, rim, spec, cover);
  clear = max(clear, max(t1, t2) * wet);
}
// Pane fog: a mottled base, a cold rim near the frame, and patches that grow with time.
// edge is the signed distance to the frame, negative inside; grow runs 0 to 1.
float grFog(vec2 p, float base, float edge, float grow) {
  float fog = base * (0.8 + 0.35 * grFbm(p * 6.0));
  fog += 0.22 * smoothstep(-0.07, 0.0, edge) * (0.6 + 0.6 * grN(p * 30.0));
  if (grow > 0.001) {
    float field = grFbm(p * 3.2 + 11.0) * 0.75 + grFbm(p * 9.0 + 3.0) * 0.25;
    field += 0.42 * smoothstep(-0.16, 0.0, edge);
    float thr = mix(1.3, 0.6, grow) + (grN(p * 46.0) - 0.5) * 0.06;
    fog += 0.8 * smoothstep(thr, thr + 0.16, field) * (0.85 + 0.3 * grN(p * 18.0));
  }
  return fog;
}
`;
