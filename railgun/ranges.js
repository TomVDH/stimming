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
  [10, 202000, 81000, 30000, 140, 10], [42, 169000, 57000, 28000, 150, 200], [-12, 148000, 42000, 18500, 130, 60, 3],
  [27, 115000, 29000, 12800, 150, 150],
  // Tilted slabs hold the left edge: long dip slopes, sheer scarps.
  [57, 94000, 21000, 9300, 135, 250, 5],
  // Low mesas leave one gentle gap right of the middle.
  [3, 81000, 16000, 3600, 110, 300, 1],
  // This range holds the right edge of the view.
  // A field of spires holds the right edge, against the sun.
  [-12, 118000, 19000, 13000, 0, 0, 4],
  // A lone volcano rises far off in the gap, over the mesas.
  [1.5, 175000, 22000, 16000, 0, 0, 2],
];
// Each form's bearing from its centre to the landscape eye, for the cone's seam.
const rangeFace = m => { const c = polar(rad(m[0]), m[1]); return Math.atan2(EYE[1] - c[1], EYE[0] - c[0]); };
// uRg per range: centre x, z, arc radius, crest.
export const rangeRg = () => RANGES.map(m => { const c = polar(rad(m[0]), m[1]); return [c[0], c[1], m[2], m[3]]; });
// uRa per range: the arc's start, span and phase in radians, then the form.
export const rangeRa = () => RANGES.map((m, i) => [m[6] === 2 ? rangeFace(m) : rad(m[5]) + Math.PI - rad(m[4]) / 2, rad(m[4]), 1.7 * i + 0.4, m[6] || 0]);
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
uniform vec4 uRg[${RANGES.length}], uRa[${RANGES.length}];
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
  float g = 0.28 * R;
  vec2 c0 = floor(q / g);
  for (int j = 0; j < 9; j++) {
    vec2 c = c0 + vec2(float(j % 3) - 1.0, float(j / 3) - 1.0);
    float k1 = k2hash(c + ph), k2 = k2hash(c + ph + 17.3), k3 = k2hash(c + ph + 41.9);
    // About two cells in three hold a needle.
    if (k3 < 0.33) continue;
    vec2 at = (c + 0.2 + 0.6 * vec2(k1, k2)) * g;
    float fall = clamp(1.0 - length(at) / R, 0.0, 1.0);
    if (fall <= 0.0) continue;
    float rr = g * mix(0.2, 0.42, k1);
    // A rounded tip keeps the needle smooth.
    float d = sqrt(dot(q - at, q - at) + 0.0025 * rr * rr) / rr;
    if (d >= 1.0) continue;
    float hh = H * mix(0.3, 1.0, (k3 - 0.33) / 0.67) * sqrt(fall);
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
  for (int i = 0; i < ${RANGES.length}; i++) {
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
        float pk = smoothstep(0.25, 0.85, fbm3(vec2(arc0 / (0.55 * uRg[i].w + 6000.0), ph * 1.3)));
        cw = mix(cw, 0.3 + 0.7 * pk, 0.75);
        // The spine wanders across the band, so the crest line is not a true arc.
        off += Rc * 0.05 * (fbm3(vec2(arc0 / 40000.0, ph)) - 0.5);
      }
      float hc = uRg[i].w * t * (mesa || slab ? 1.0 : pow(cw, 1.7) * 1.35);
      // Inner face: a steep scarp. Outer face: a long apron.
      // A mesa and a knife stand narrow on both sides.
      v = abs(off) / (Rc * (mesa ? 0.16 : knife ? 0.15 : slab ? 0.22 : off < 0.0 ? 0.1 : 0.32) * (0.3 + t));
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
        float s = fract(arc / (1.3 * uRg[i].w) + 0.35 * fbm3(vec2(arc / 20000.0, ph)));
        float plate = smoothstep(0.0, 0.82, s) * (1.0 - smoothstep(0.84, 0.98, s));
        prof = (0.3 + 0.7 * plate) * (1.0 - smoothstep(0.35, 1.0, v));
      } else if (knife) {
        // Hollow flanks meet in a thin edge.
        prof = pow(1.0 - v, 1.6);
      } else {
        // A rounded profile: the crest swells, then falls away in long slopes.
        // The crest rounds over, so it reads smooth, not as a crease.
        float rv = (sqrt(v * v + 0.0064) - 0.08) / (sqrt(1.0064) - 0.08);
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
      hr = hc * prof * (mesa || slab ? 1.0 : 0.78 + 0.18 * bands + 0.36 * (folds - 0.5));
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
    h = smax(h, hr, 0.12 * max(h, hr));
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
