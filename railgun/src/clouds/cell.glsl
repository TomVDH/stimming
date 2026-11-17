// The storm field's shapes: Window seat's storm towers, one per cell, in kilometres.
// clouds/field.ts builds the cells; the same numbers give the shapes and the bounds.
// The host declares uVol, uCloudC, CELL_N and the cell arrays below.
// uCa: centre x and z in metres, core radius and top in km.
// uCb: seed, anvil bearing in radians, anvil reach and base in km.
// uCc: anvil share, turret spread, decay, lean in km.
// uCd: anvil half widths at the core and the rim in km, age, growth.
// uCe: the bound: centre x and z and radius in metres, on.
uniform vec4 uCa[CELL_N], uCb[CELL_N], uCc[CELL_N], uCd[CELL_N], uCe[CELL_N];

float cHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 cHash2(vec2 p) { return vec2(cHash(p), cHash(p + 19.19)); }
float smax(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float smin(float a, float b, float k) { return -smax(-a, -b, k); }
// A 2D capsule: radius r1 at the origin, r2 at (0, h).
float sdUnevenCapsule(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = (r1 - r2) / h, a = sqrt(1.0 - b * b), k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}

// The current cell, set once per ray before its march.
// gC: the centre in metres. gRc: core radius. gBase, gTop: base and top.
// gLen: anvil reach downwind. gAx: the downwind bearing.
// gR1, gR2: anvil half widths at the core and at the rim.
// gLean: core drift downwind at the top. gOver: overshoot dome radius.
// gAmp: billow size. gTile: billow noise tile. gGrow: density as the cell forms.
// gAnv: how far the anvil has spread. gSpread: turret spread. gDecay: column thinning.
vec2 gC, gAx; vec3 gSeed;
float gRc, gBase, gTop, gLen, gR1, gR2, gLean, gOver, gAmp, gTile, gGrow, gAnv, gHasAnv, gSpread, gDecay;
vec4 gTur[4];
void setCell(int i) {
  vec4 a = uCa[i], b = uCb[i], c = uCc[i], d = uCd[i];
  gC = a.xy; gRc = a.z; gTop = a.w;
  gAx = vec2(cos(b.y), sin(b.y)); gLen = b.z; gBase = b.w;
  gAnv = c.x; gSpread = c.y; gDecay = c.z; gLean = c.w;
  gR1 = d.x; gR2 = d.y; gGrow = d.w;
  float s = d.z;
  gHasAnv = step(0.01, gAnv);
  gSeed = vec3(b.x * 0.71, b.x * 0.37, b.x * 0.53);
  // The overshooting top heaves slowly up and down.
  gOver = gRc * 0.45 * smoothstep(0.5, 1.0, s) * (0.8 + 0.2 * sin(uCloudC * 0.05 + b.x)) * gHasAnv * (1.0 - gDecay);
  gAmp = gRc * 0.4;
  gTile = clamp(gRc * 1.6, 5.0, 11.0);
  // The core turret feeds the anvil; three side turrets stand lower round it.
  // A young cell is narrow; it fattens as it climbs.
  float wide = 0.55 + 0.45 * smoothstep(0.0, 0.6, s);
  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    vec2 h = cHash2(vec2(b.x * 1.37 + fj * 7.1, fj * 3.3 + 1.0));
    float ang = h.x * 6.2832, off = j == 0 ? 0.0 : gRc * (0.4 + 0.4 * h.y) * gSpread;
    float rad = j == 0 ? gRc * 0.8 : gRc * (0.4 + 0.22 * cHash(h * 9.1));
    float top = mix(gBase + 3.0, gTop - 3.2, 0.2 + 0.8 * cHash(h + 4.2));
    // In a multicell cluster the side turrets climb nearly as high as the core.
    top = mix(top, gTop - 0.8 - 1.6 * cHash(h + 8.3), clamp(gSpread - 1.0, 0.0, 1.0));
    top = j == 0 ? gTop - 0.4 : mix(gBase + 1.5, top, smoothstep(0.0, 0.8, s));
    gTur[j] = vec4(vec2(cos(ang), sin(ang)) * off * wide, rad * wide, top);
  }
}

// The cell's shape without billows: about the depth inside, in km.
// p is in km from the cell's centre; p.y is the height over the curved ground.
// aw gives the anvil's share of the point, from 0 to 1.
float towerShape(vec3 p, out float aw) {
  float y = p.y;
  float hk = clamp((y - gBase) / (gTop - gBase), 0.0, 1.0);
  // The core leans downwind as it climbs.
  vec2 q = p.xz - gAx * gLean * hk * hk;
  float col = -1e3;
  for (int j = 0; j < 4; j++) {
    vec4 tu = gTur[j];
    // Each turret is a capsule: a near-straight body and a domed head.
    float r = tu.z * (1.0 + 0.12 * (1.0 - hk));
    float dy = y - clamp(y, gBase - 1.0, tu.w - r);
    col = smax(col, r - length(vec2(length(q - tu.xy), dy * 1.25)), gRc * 0.3);
  }
  // The foot: a broad, low swell that narrows as the column rises out of it.
  float lobe = 1.0 + 0.28 * sin(3.0 * atan(q.y, q.x) + gSeed.x) + 0.15 * sin(5.0 * atan(q.y, q.x) - gSeed.y);
  float fr = gRc * mix(2.4, 0.9, smoothstep(gBase + 0.5, gBase + 4.5, y)) * gGrow * lobe * mix(1.0, gSpread, 0.5);
  col = smax(col, min(fr - length(q), (gBase + 4.5 - y) * 0.8), gRc * 0.5);
  // The base is flat.
  col = smin(col, (y - gBase) * 2.0, 0.3);
  // The anvil: a fan that widens downwind, flat on top, thin at its rim.
  vec2 a = p.xz - gAx * gLean;
  vec2 uv = vec2(dot(a, vec2(-gAx.y, gAx.x)), dot(a, gAx));
  float k = clamp(uv.y / gLen, 0.0, 1.0);
  // Upwind, the anvil only rounds over the core and thins fast.
  float ku = clamp(-uv.y / gR1, 0.0, 1.0);
  float top = gTop + 0.2 - 0.5 * k * k - 0.8 * ku * ku;
  float bot = top - mix(3.0, 0.25, pow(k, 0.7)) * (0.4 + 0.6 * gAnv) * (1.0 - 0.85 * ku * ku);
  float an = smin(-sdUnevenCapsule(uv, gR1, gR2, gLen), smin(top - y, y - bot, 0.3), 0.8);
  // A young cell has no anvil yet; a towering cumulus never grows one.
  an -= (1.0 - gAnv) * 4.0 + (1.0 - gHasAnv) * 20.0;
  // The overshooting top: a squat dome on the core turret's head.
  float ov = gOver - length(vec3(q.x, (y - gTop + 0.4 + gOver * 0.2) * 1.35, q.y));
  // The overshoot boils like the column, so it takes full billows.
  aw = smoothstep(-0.6, 0.6, an - col) * smoothstep(0.6, -0.6, ov - max(col, an));
  return smax(smax(col, an, 0.9), ov, 1.0);
}
// Cauliflower billows from the baked volume; the lumps rise slowly.
// The anvil stretches them downwind into ice streaks.
float billow(vec3 p, float aw) {
  p.xz -= gAx * dot(p.xz, gAx) * 0.6 * aw;
  vec3 r = vec3(p.x * 0.8 - p.z * 0.6, p.y - uCloudC * 0.012, p.x * 0.6 + p.z * 0.8) + gSeed;
  vec4 m = texture(uVol, r / gTile);
  return m.b * 0.75 + m.g * 0.25 - 0.47;
}
// Small lumps on the big ones, at an odd scale and angle.
float billowFine(vec3 p, float aw) {
  p.xz -= gAx * dot(p.xz, gAx) * 0.7 * aw;
  vec3 r = vec3(p.x * 0.47 + p.z * 0.88, p.y * 1.1 - uCloudC * 0.02, p.z * 0.47 - p.x * 0.88) - gSeed.zxy;
  return texture(uVol, r / (gTile * 0.29)).g - 0.5;
}
// Billow size: full on the column, small on the anvil's top.
float billowAmp(float y, float aw) {
  return gAmp * mix(1.0, mix(0.45, 0.18, smoothstep(gTop - 0.9, gTop + 0.1, y)), aw);
}
// Density for light taps: the shape with the big lumps only.
float towerLightDens(vec3 p) {
  float aw, sh = towerShape(p, aw), A = billowAmp(p.y, aw);
  if (sh < -A * 1.3 - 0.5) return 0.0;
  return smoothstep(0.0, 0.5, sh + A * 2.2 * billow(p, aw));
}
// The bare shape toward a light, smooth: the far light tap.
// The storm host's shade taps call it, with p in km.
float shapeTap(vec3 p) { float aw; return smoothstep(-0.3, 0.6, towerShape(p, aw)); }
