// The railgun's far ranges: the table and the height in GLSL.
// The toy and the range lab both import this file.

// The landscape eye: x and z, in metres.
export const EYE = [1670, 1990];
// The point at bearing th and distance d; bearings turn left from negative z.
export const polar = (th, d) => [EYE[0] - Math.sin(th) * d, EYE[1] - Math.cos(th) * d];
const rad = d => d * Math.PI / 180;
// Each range: angle, range, arc radius, crest, span and opening, in degrees and metres.
// An optional seventh value is its form: 1 a mesa line, 2 a lone cone, 3 a knife ridge,
// 4 a spire field, 5 a line of tilted slabs.
// A spire field's arc radius is its radius; it takes no span or opening.
// The Dev row Forms turns every form back into a crescent.
// A cone's arc radius is its base radius; it takes no span or opening.
export const RANGES = [
  // Tom's pick, layered sierra (2026-11-16): four even layers, low and realistic.
  // Each layer is three arcs; each range is about six times as wide as tall.
  // True scale (Tom, option A): crests 2.6 to 9 km; the far layers sink behind the curve.
  // Foothills, about 50 km out: a ridge stands in front of every far gun.
  [47.3, 98000, 46000, 3100, 167, 228],
  [29.5, 98000, 50000, 2600, 165, 233],
  [-10.2, 97000, 42000, 2900, 156, 283],
  // The main range, about 90 km out.
  [48, 157000, 65500, 6000, 185, 222],
  [6.1, 153000, 69000, 5400, 191, 275],
  [-10.2, 151000, 57500, 6300, 172, 274],
  // The high range, about 130 km out.
  [37.9, 206000, 77000, 8000, 201, 229],
  [-3.6, 213000, 80500, 8600, 191, 283],
  // Far peaks, about 180 km out, deep in the haze.
  [55, 269000, 88500, 9000, 187, 215],
  [23.4, 282000, 96000, 9000, 195, 240],
  [-15.3, 258000, 84500, 8800, 156, 292],
];
// Each form's bearing from its centre to the landscape eye, for the cone's seam.
const rangeFace = m => { const c = polar(rad(m[0]), m[1]); return Math.atan2(EYE[1] - c[1], EYE[0] - c[0]); };
// uRg per range: centre x, z, arc radius, crest.
export const rangeRg = () => RANGES.map(m => { const c = polar(rad(m[0]), m[1]); return [c[0], c[1], m[2], m[3]]; });
// uRa per range: the arc's start, span and phase in radians, then the form.
export const rangeRa = () => RANGES.map((m, i) => [m[6] === 2 ? rangeFace(m) : rad(m[5]) + Math.PI - rad(m[4]) / 2, rad(m[4]), 1.7 * i + 0.4, m[6] || 0]);
// The march's ceiling, in metres: every crest stays under it.
export const RANGE_CEIL = 95000;
// The table holds 12 ranges at most; the shader skips empty slots.
export const RANGE_MAX = 12;
// uRg and uRa for any table, in the same form as rangeRg and rangeRa.
export const rangeUniforms = (table = RANGES) => ({
  rg: table.map(m => { const c = polar(rad(m[0]), m[1]); return [c[0], c[1], m[2], m[3]]; }),
  ra: table.map((m, i) => { const c = polar(rad(m[0]), m[1]); return [m[6] === 2 ? Math.atan2(EYE[1] - c[1], EYE[0] - c[0]) : rad(m[5]) + Math.PI - rad(m[4]) / 2, rad(m[4]), 1.7 * i + 0.4, m[6] || 0]; }),
});
// The landscape's knobs: the shader reads them from uLand, in this order.
// A change to any of them needs a new bake in the toy.
export const LAND = {
  // The tallest crest stays under the march's ceiling (RANGE_CEIL) up to 1.1.
  height: { value: 1, min: 0.5, max: 1.1, step: 0.01, label: 'Height', group: 'Shape' },
  width: { value: 1, min: 0.6, max: 1.6, step: 0.01, label: 'Width', group: 'Shape' },
  blend: { value: 0.18, min: 0, max: 0.4, step: 0.01, label: 'Blend', group: 'Shape' },
  round: { value: 0.1, min: 0, max: 0.3, step: 0.01, label: 'Crest round', group: 'Shape' },
  wander: { value: 0.08, min: 0, max: 0.2, step: 0.005, label: 'Spine wander', group: 'Shape' },
  peakScale: { value: 1, min: 0.3, max: 3, step: 0.05, label: 'Peak spacing', group: 'Peaks' },
  peakContrast: { value: 0.6, min: 0, max: 1, step: 0.01, label: 'Peak contrast', group: 'Peaks' },
  folds: { value: 0.4, min: 0, max: 1, step: 0.01, label: 'Folds', group: 'Peaks' },
  bands: { value: 0.16, min: 0, max: 0.6, step: 0.01, label: 'Ridge bands', group: 'Peaks' },
  spireDensity: { value: 0.67, min: 0.1, max: 1, step: 0.01, label: 'Density', group: 'Spires' },
  spireWidth: { value: 1, min: 0.4, max: 2, step: 0.05, label: 'Girth', group: 'Spires' },
  spireHeight: { value: 1, min: 0.3, max: 1.6, step: 0.05, label: 'Height', group: 'Spires' },
  slabPeriod: { value: 1.3, min: 0.5, max: 3, step: 0.05, label: 'Spacing', group: 'Slabs' },
  slabRise: { value: 0.82, min: 0.4, max: 0.95, step: 0.01, label: 'Dip slope', group: 'Slabs' },
};
export const LAND_KEYS = Object.keys(LAND);
// uLand's values in LAND_KEYS order; o overrides the defaults.
export const landValues = (o = {}) => Float32Array.from(LAND_KEYS.map(k => o[k] ?? LAND[k].value));
const LAND_DEFS = LAND_KEYS.map((k, i) => `#define L_${k.replace(/[A-Z]/g, c => '_' + c).toUpperCase()} uLand[${i}]`).join('\n');
// The value noise the height needs; the toy declares the same in its K2 block.
export const K2_BASE = /* glsl */`
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}`;
// The height: rangeH, farHN and farH, with their noises.
// It needs k2noise declared before it.
export const RANGE_GLSL = /* glsl */`
uniform vec4 uRg[${RANGE_MAX}], uRa[${RANGE_MAX}];
uniform float uLand[${LAND_KEYS.length}];
${LAND_DEFS}
uniform float uEro, uBump, uForms;
// Sharp ridges in [0, 1]: lines of 1 with a narrow V between.
// n octaves, three at most; fewer keep the march from missing fine teeth.
float ridge2(vec2 p, int n) {
  float s = 0.0, a = 0.5, w = 1.0;
  for (int i = 0; i < 3; i++) {
    if (i >= n) break;
    float n = 1.0 - abs(k2noise(p) * 2.0 - 1.0);
    // Each octave is strongest high on the ridge above it.
    s += a * n * n * w; w = clamp(n * 1.6, 0.0, 1.0);
    p = p * 2.11 + vec2(13.7, 5.3); a *= 0.5;
  }
  return s / (n >= 3 ? 0.875 : n == 2 ? 0.75 : 0.5);
}
// Three smooth octaves: rounded folds, no knife-edge crests.
float fbm3(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * k2noise(p); p = p * 2.07 + vec2(17.1, 9.2); a *= 0.5; }
  return s / 0.875;
}
// A smooth max: two ranges that overlap fill the saddle between them.
float smax(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / max(k, 1e-3);
  return max(a, b) + 0.25 * h * h * k;
}
// A spire field: tall tapered needles on a low mound.
// v is the distance from the centre over the field's radius.
float spires(vec2 q, float R, float H, float ph, float v) {
  // The massif: a rocky swell the needles rise out of.
  float h = 0.24 * H * pow(1.0 - v, 1.6) * (0.8 + 0.4 * k2noise(q / (0.2 * R) + ph));
  float g = 0.28 * R, th = 1.0 - L_SPIRE_DENSITY;
  vec2 c0 = floor(q / g);
  for (int j = 0; j < 9; j++) {
    vec2 c = c0 + vec2(float(j % 3) - 1.0, float(j / 3) - 1.0);
    float k1 = k2hash(c + ph), k2 = k2hash(c + ph + 17.3), k3 = k2hash(c + ph + 41.9);
    // About two cells in three hold a needle.
    if (k3 < th) continue;
    vec2 at = (c + 0.2 + 0.6 * vec2(k1, k2)) * g;
    float fall = clamp(1.0 - length(at) / R, 0.0, 1.0);
    if (fall <= 0.0) continue;
    float rr = g * mix(0.2, 0.42, k1) * L_SPIRE_WIDTH;
    // A rounded tip keeps the needle smooth.
    float d = sqrt(dot(q - at, q - at) + 0.0025 * rr * rr) / rr;
    if (d >= 1.0) continue;
    float hh = H * L_SPIRE_HEIGHT * mix(0.3, 1.0, (k3 - th) / max(1.0 - th, 1e-3)) * sqrt(fall);
    // A slim shaft on a flared foot.
    float sh = 0.7 * pow(1.0 - d, 1.9) + 0.3 * pow(1.0 - d, 0.7);
    h = smax(h, hh * sh, 0.2 * hh);
  }
  return h;
}
// The ranges' height over the flat plain at p, in metres.
// near is 1 inside any range's broad band, where the march must step short.
float rangeH(vec2 p, out float near) {
  float h = 0.0;
  near = 0.0;
  for (int i = 0; i < ${RANGE_MAX}; i++) {
    // An empty slot has no crest.
    if (uRg[i].w <= 0.0) continue;
    // With the forms off, the cone hides and every range is a crescent.
    float kind = uForms < 0.5 ? 0.0 : uRa[i].w;
    if (uForms < 0.5 && uRa[i].w > 1.5 && uRa[i].w < 2.5) continue;
    vec2 q = p - uRg[i].xy;
    float Rc = uRg[i].z, r = length(q), off = r - Rc, ph = uRa[i].z, hr, v, arc, mid, crest;
    if (kind > 3.5 && kind < 4.5) {
      v = r / Rc;
      if (v >= 1.0) continue;
      near = 1.0;
      hr = spires(q, Rc, uRg[i].w, ph, v);
      arc = atan(q.y, q.x) * 0.5 * Rc; off = r;
      // Erosion only scores the needles lightly.
      mid = 0.3; crest = 0.0;
    } else if (kind > 1.5 && kind < 2.5) {
      // A lone cone: concave flanks, a blunt top and a crater.
      v = r / Rc;
      if (v >= 1.0) continue;
      near = 1.0;
      float prof = min(pow(1.0 - v, 2.1), 0.93);
      prof -= 0.1 * smoothstep(0.035, 0.012, v);
      // Old flows leave lobes on the skirt.
      prof *= 0.88 + 0.24 * fbm3(q / (0.35 * Rc) + ph);
      hr = uRg[i].w * prof;
      // The angle turns from the eye, so the noise's seam lies behind the cone.
      float a = mod(atan(q.y, q.x) - uRa[i].x + 3.14159265, 6.2831853) - 3.14159265;
      arc = a * 0.5 * Rc; off = r;
      mid = smoothstep(0.1, 0.3, v) * (1.0 - smoothstep(0.75, 1.0, v));
      crest = 0.0;
    } else {
      if (abs(off) > 0.75 * Rc) continue;
      float u = mod(atan(q.y, q.x) - uRa[i].x, 6.2831853) / uRa[i].y;
      if (u > 1.0) continue;
      bool mesa = kind > 0.5 && kind < 1.5, knife = kind > 2.5 && kind < 3.5, slab = kind > 4.5;
      bool isMain = !mesa && !knife && !slab;
      // The range tapers to both ends; its crest rolls in peaks and saddles.
      // A mesa line keeps its tops level to near its ends.
      float t = pow(sin(3.14159265 * u), mesa ? 0.25 : 0.8);
      // A power on the crest wave sharpens the peaks and widens the saddles.
      float cw = 0.6 + 0.22 * sin(u * 5.0 + ph) + 0.12 * sin(u * 11.0 + 2.0 * ph) + 0.06 * sin(u * 23.0 + 3.0 * ph);
      float arc0 = u * uRa[i].y * Rc;
      if (isMain) {
        // Real ranges: peaks of uneven height at uneven spacing, not a regular wave.
        // The spacing is a few kilometres plus a share of the crest's height.
        float pk = smoothstep(0.25, 0.85, fbm3(vec2(arc0 / ((0.55 * uRg[i].w + 6000.0) * L_PEAK_SCALE), ph * 1.3)));
        cw = mix(cw, 0.3 + 0.7 * pk, L_PEAK_CONTRAST);
        // The spine wanders across the band, so the crest line is not a true arc.
        off += Rc * L_WANDER * (fbm3(vec2(arc0 / 40000.0, ph)) - 0.5);
      }
      float hc = uRg[i].w * t * (mesa || slab ? 1.0 : pow(cw, 1.7) * 1.35);
      // Inner face: a steep scarp. Outer face: a long apron.
      // A mesa and a knife stand narrow on both sides.
      v = abs(off) / (Rc * (mesa ? 0.16 : knife ? 0.15 : slab ? 0.22 : off < 0.0 ? 0.1 : 0.32) * (0.3 + t) * L_WIDTH);
      if (v >= 1.0) continue;
      near = 1.0;
      arc = arc0;
      float prof;
      if (mesa) {
        // A level top, a sheer cliff, then a talus skirt.
        prof = 1.0 - 0.75 * smoothstep(0.42, 0.56, v) - 0.25 * smoothstep(0.56, 1.0, v);
        // Gaps cut the line into buttes.
        prof *= smoothstep(0.47, 0.53, fbm3(vec2(arc / (3.0 * uRg[i].w), 0.5) + ph));
      } else if (slab) {
        // Tilted beds: each slab climbs a long dip slope, then drops at a sheer scarp.
        float s = fract(arc / (L_SLAB_PERIOD * uRg[i].w) + 0.35 * fbm3(vec2(arc / 20000.0, ph)));
        float plate = smoothstep(0.0, L_SLAB_RISE, s) * (1.0 - smoothstep(L_SLAB_RISE + 0.02, min(L_SLAB_RISE + 0.16, 0.995), s));
        prof = (0.3 + 0.7 * plate) * (1.0 - smoothstep(0.35, 1.0, v));
      } else if (knife) {
        // Hollow flanks meet in a thin edge.
        prof = pow(1.0 - v, 1.6);
      } else {
        // A rounded profile: the crest swells, then falls away in long slopes.
        // The crest rounds over, so it reads smooth, not as a crease.
        float e = max(L_ROUND, 1e-3);
        float rv = (sqrt(v * v + e * e) - e) / (sqrt(1.0 + e * e) - e);
        prof = off < 0.0 ? 1.0 - pow(rv, 1.25) : pow(1.0 - rv, 1.5) * (1.0 + 0.4 * rv);
        // A line of foothills rolls along the outer apron.
        if (off > 0.0) prof += 0.28 * exp(-pow((v - 0.55) / 0.16, 2.0)) * (0.6 + 0.4 * sin(u * 41.0 + ph));
      }
      // Flows follow the crescent: parallel ridgelines wander along the arc,
      // and soft folds run stretched along it, kilometres long.
      float sv = sign(off) * v;
      float bands = 0.5 + 0.5 * sin(sv * 15.7 + 3.0 * fbm3(vec2(arc / 30000.0, sv * 1.5) + ph));
      float folds = fbm3(vec2(arc / 9000.0, sv * 4.0) + ph * 3.1);
      // The folds take a gentle ridge: firm spurs, no knife edges.
      folds = mix(folds, 1.0 - abs(2.0 * folds - 1.0), 0.45);
      hr = hc * prof * (mesa || slab ? 1.0 : 0.78 + L_BANDS * bands + L_FOLDS * (folds - 0.5));
      if (mesa) {
        // Hard beds weather into ledges: the cliff steps down in benches.
        float st = hr / (0.22 * uRg[i].w);
        hr = mix(hr, 0.22 * uRg[i].w * (floor(st) + smoothstep(0.55, 1.0, fract(st))), 0.7);
      }
      mid = smoothstep(0.02, 0.3, v) * (1.0 - smoothstep(0.75, 1.0, v));
      // A knife's crest saws hardest; a mesa's top stays level.
      crest = (1.0 - smoothstep(0.0, 0.25, v)) * (mesa || slab ? 0.0 : knife ? 0.2 : 0.1);
    }
    if (uEro > 0.0 && hr > 0.02 * uRg[i].w) {
      // Erosion: spurs run down each face, gullies cut between them.
      // The noise stretches along the fall line, so every cut runs downhill.
      // The spacing follows the crest: big ranges carve wide gullies.
      float sc = 0.16 * uRg[i].w * (kind > 0.5 && kind < 1.5 ? 2.0 : 1.0);
      vec2 eq = vec2(arc, off * 0.3) / sc + ph * 7.0;
      // A slow warp bends the cuts and lets them branch.
      eq += 0.7 * vec2(k2noise(eq * 0.35), k2noise(eq * 0.35 + 9.1)) - 0.35;
      float sp = ridge2(eq, 3);
      // Crags break the crest line into teeth and notches; a knife's teeth sit close.
      float cs = kind > 2.5 ? 0.18 : 0.3;
      float cr = crest > 0.0 ? ridge2(vec2(arc / (cs * uRg[i].w), off / (0.8 * uRg[i].w)) + ph * 3.0, 2) : 0.0;
      // The noise's narrow lines are the cuts; the broad ground between stands as spurs.
      // The carving is deepest on the mid slopes, light at the crest and the toe.
      hr *= 1.0 - uEro * (0.42 * mid * sp + crest * cr);
    }
    hr *= L_HEIGHT;
    h = smax(h, hr, L_BLEND * max(h, hr));
  }
  return h;
}
// Ridged erosion: sharp spurs and deep gullies, a few kilometres across.
float ridged(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { float n = 1.0 - abs(k2noise(p) * 2.0 - 1.0); s += a * n * n; p = p * 2.13 + vec2(13.7, 5.3); a *= 0.5; }
  return s;
}
float farHN(vec2 p, out float near) {
  float h = rangeH(p, near);
  return h > 1.0 ? h : 0.0;
}
float farH(vec2 p) { float n; return farHN(p, n); }`;
