// The railgun's storms at true scale: Window seat's storm cells, in kilometres.
// The storm lab imports this file; the toy adopts it once Tom approves the look.
// Shapes, billows and light follow window/shader.js (setTower, towerShape, the tower march).
// Noise: window/noise3d.js, the same 64-cubed volume with mip levels.

// Each storm, as Window seat's cells: where it stands, its kind, its size and its wind.
// at: bearing in degrees, turning left from negative z about the landscape eye.
// range: km from the eye. r: cell size in km. top: cloud top in km. base: cloud base in km.
// wind: the anvil's bearing in degrees, in the same frame as at.
// kind: 'cb' mature cumulonimbus, 'tcu' towering cumulus, 'multi' multicell cluster,
//   'old' decaying cell, 'line' squall line, 'super' supercell.
// v: anvil size (0 for none), lean, turret spread, decay; as Window seat's cellKind().
export const STORMS = [
  { name: 'Storm tower', kind: 'cb', at: -14, range: 85, r: 18, top: 14.5, base: 1.8, wind: 40, seed: 11.3, v: [1.3, 0.6, 1, 0] },
  { name: 'Towering cumulus', kind: 'tcu', at: 8, range: 62, r: 9, top: 9, base: 1.6, wind: 30, seed: 47.1, v: [0, 0.3, 0.8, 0] },
  { name: 'Squall line', kind: 'line', at: 28, range: 95, r: 20, top: 12.5, base: 1.5, wind: 75, seed: 23.9, v: [0.9, 0.5, 1.8, 0] },
  { name: 'Supercell', kind: 'super', at: 52, range: 200, r: 34, top: 17, base: 1.5, wind: 20, seed: 71.7, v: [1.8, 0.5, 1, 0] },
];
export const KINDS = { cb: 'Storm tower', tcu: 'Towering cumulus', multi: 'Multicell', old: 'Dying storm', line: 'Squall line', super: 'Supercell' };
// Each kind's starting numbers, for a new storm in the lab.
export const KIND_V = { cb: [1.1, 0.6, 1, 0], tcu: [0, 0.3, 0.8, 0], multi: [0.6, 0.5, 1.7, 0], old: [1.6, 1, 1, 0.7], line: [0.9, 0.5, 1.8, 0], super: [1.8, 0.5, 1, 0] };
const KIND_ID = { cb: 0, tcu: 1, multi: 2, old: 3, line: 4, super: 5 };
// The look knobs: billow size, fine detail, softness, density.
export const LOOK = [1, 1, 1, 1];

// The landscape eye, in metres, as ranges.js has it.
export const EYE = [1670, 1990];
const rad = d => d * Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// One storm's frame, as setTower builds it, plus its bounding cylinder and card.
// The card, the cylinder and the shape all come from these numbers.
// Distances are km; the centre is in metres, on the flat world.
export function stormGeom(s) {
  const v = s.v, rc = s.r * 0.36, base = s.base, anv = v[0] > 0 ? 1 : 0;
  const len = s.r * 1.35 * anv * v[0] + 0.3, r1 = rc * (0.8 + 0.45 * anv);
  const r2 = clamp(rc * 0.7 + len * 0.42, r1 - len * 0.8, r1 + len * 0.8);
  const lean = rc * 0.4 * v[1], spread = v[2];
  // A squall line strings its cells along a line across the wind.
  const line = s.kind === 'line' ? rc * 2.6 : 0;
  const amp = rc * 0.4;
  // The bound: a cylinder round the core, the foot, the line and the whole anvil fan.
  const foot = rc * 2.5 * Math.max(1, spread * 0.9) + line;
  const back = Math.max(r1 + line, foot) + lean, fwd = Math.max(len + r2 + line * 0.5, foot - lean);
  const ax = [Math.cos(rad(s.wind)), Math.sin(rad(s.wind))];
  const off = lean + 0.5 * (fwd - back);
  const R = 0.5 * (fwd + back) + amp * 0.5 + 0.8;
  const topY = s.top + rc * 0.6 + amp + 1.0;
  const cx = EYE[0] - Math.sin(rad(s.at)) * s.range * 1000, cz = EYE[1] - Math.cos(rad(s.at)) * s.range * 1000;
  return {
    centre: [cx, 0, cz],
    // Shape inputs for the shader: a = (r, top, seed, base), b = (wind x, wind z, kind, line).
    a: [s.r, s.top, s.seed, base], b: [ax[0], ax[1], KIND_ID[s.kind] ?? 0, line], v: [...v],
    // The bound, in km from the centre: offset x, z along the wind, radius, top.
    bound: [ax[0] * off, ax[1] * off, R, topY],
    // The card: half width and top, in metres.
    card: [R * 1000, topY * 1000],
  };
}

// Window seat's storm cell, in km. p is relative to the storm's centre on the ground.
// The host declares: sampler3D uStormVol (Window seat's noise, with mips), float uCloudC, vec4 uLook.
export const CELL_GLSL = /* glsl */`
float csmax(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float csmin(float a, float b, float k) { return -csmax(-a, -b, k); }
float chash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 chash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float sdUnevenCapsule(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = (r1 - r2) / h, a = sqrt(1.0 - b * b), k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}
// The current storm cell, set once per storm, as Window seat's setTower.
vec2 gAx; vec3 gSeed;
float gRc, gBase, gTop, gLen, gR1, gR2, gLean, gOver, gAmp, gTile, gAnv, gHasAnv, gSpread, gDecay, gLine;
vec4 gTur[4];
// a = (r, top, seed, base), b = (wind x, wind z, kind, line), v = (anvil, lean, spread, decay).
void setTower(vec4 a, vec4 b, vec4 v) {
  gRc = a.x * 0.36;
  gBase = a.w;
  gHasAnv = step(0.01, v.x);
  gSpread = v.z; gDecay = v.w;
  gTop = a.y;
  gAnv = gHasAnv;
  gLen = a.x * 1.35 * gAnv * v.x + 0.3;
  gAx = normalize(b.xy);
  gLine = b.w;
  gLean = gRc * 0.4 * v.y;
  gR1 = gRc * (0.8 + 0.45 * gAnv);
  gR2 = clamp(gRc * 0.7 + gLen * 0.42, gR1 - gLen * 0.8, gR1 + gLen * 0.8);
  // A supercell's overshoot stands taller and wider.
  float sup = step(4.5, b.z);
  gOver = gRc * mix(0.45, 0.7, sup) * gHasAnv * (0.8 + 0.2 * sin(uCloudC * 0.05 + a.z)) * (1.0 - v.w);
  gAmp = gRc * 0.4 * uLook.x;
  gTile = clamp(gRc * 1.6, 5.0, 11.0);
  gSeed = vec3(a.z * 0.71, a.z * 0.37, a.z * 0.53);
  vec2 across = vec2(-gAx.y, gAx.x);
  // The core turret feeds the anvil; three side turrets stand lower round it.
  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    vec2 h = chash22(vec2(a.z * 1.37 + fj * 7.1, fj * 3.3 + 1.0));
    float ang = h.x * 6.2832, off = j == 0 ? 0.0 : gRc * (0.4 + 0.4 * h.y) * gSpread;
    float rad = j == 0 ? gRc * 0.8 : gRc * (0.4 + 0.22 * chash12(h * 9.1));
    float top = mix(gBase + 3.0, gTop - 3.2, 0.2 + 0.8 * chash12(h + 4.2));
    // In a multicell cluster the side turrets climb nearly as high as the core.
    top = mix(top, gTop - 0.8 - 1.6 * chash12(h + 8.3), clamp(gSpread - 1.0, 0.0, 1.0));
    top = j == 0 ? gTop - 0.4 : top;
    vec2 at = vec2(cos(ang), sin(ang)) * off;
    // A squall line strings its cells along a line across the wind.
    if (gLine > 0.0) { at = across * gLine * (fj / 1.5 - 1.0) + gAx * (h.y - 0.5) * gRc * 0.5; rad = gRc * (0.6 + 0.2 * chash12(h * 3.7)); }
    gTur[j] = vec4(at, rad, top);
  }
}
// The tower's shape without billows: about the depth inside, in km.
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
    col = csmax(col, r - length(vec2(length(q - tu.xy), dy * 1.25)), gRc * 0.3);
  }
  // The foot: a broad, low swell; it narrows as it climbs.
  // Lobes break its outline from a circle.
  float lobe = 1.0 + 0.28 * sin(3.0 * atan(q.y, q.x) + gSeed.x) + 0.15 * sin(5.0 * atan(q.y, q.x) - gSeed.y);
  float fr = gRc * mix(2.4, 0.9, smoothstep(gBase + 0.5, gBase + 4.5, y)) * lobe * mix(1.0, gSpread, 0.5);
  vec2 across = vec2(-gAx.y, gAx.x);
  // A squall line's foot runs the length of the line.
  float fd = gLine > 0.0 ? length(vec2(dot(q, gAx), max(abs(dot(q, across)) - gLine, 0.0))) : length(q);
  col = csmax(col, min(fr - fd, (gBase + 4.5 - y) * 0.8), gRc * 0.5);
  // The base is flat.
  col = csmin(col, (y - gBase) * 2.0, 0.3);
  // The anvil: a fan that widens downwind, flat on top, thin at its rim.
  vec2 a = p.xz - gAx * gLean;
  vec2 uv = vec2(dot(a, across), dot(a, gAx));
  // A squall line's anvil spreads along the whole line.
  uv.x = sign(uv.x) * max(abs(uv.x) - gLine, 0.0);
  float k = clamp(uv.y / gLen, 0.0, 1.0);
  // Upwind, the anvil only rounds over the core and thins fast.
  float ku = clamp(-uv.y / gR1, 0.0, 1.0);
  float top = gTop + 0.2 - 0.5 * k * k - 0.8 * ku * ku;
  float bot = top - mix(3.0, 0.25, pow(k, 0.7)) * (0.4 + 0.6 * gAnv) * (1.0 - 0.85 * ku * ku);
  float an = csmin(-sdUnevenCapsule(uv, gR1, gR2, gLen), csmin(top - y, y - bot, 0.3), 0.8);
  // A towering cumulus never grows one.
  an -= (1.0 - gHasAnv) * 20.0;
  // The overshooting top: a squat dome rooted on the core turret's head.
  float ov = gOver - length(vec3(q.x, (y - gTop + 0.4 + gOver * 0.2) * 1.35, q.y));
  aw = smoothstep(-0.6, 0.6, an - col) * smoothstep(0.6, -0.6, ov - max(col, an));
  return csmax(csmax(col, an, 0.9), ov, 1.0);
}
// Cauliflower billows: round Worley lumps at three sizes in one fetch.
// Each tower turns and shifts its sample; the lumps rise slowly, so the tops boil.
float billow(vec3 p, float lod, float aw) {
  p.xz -= gAx * dot(p.xz, gAx) * 0.6 * aw;
  vec3 r = vec3(p.x * 0.8 - p.z * 0.6, p.y - uCloudC * 0.012, p.x * 0.6 + p.z * 0.8) + gSeed;
  vec4 m = textureLod(uStormVol, r / gTile, lod);
  return m.g * 0.55 + m.b * 0.3 + m.a * 0.15 - 0.48;
}
// Small lumps on the big ones, at an odd scale and angle.
float billowFine(vec3 p, float lod, float aw) {
  p.xz -= gAx * dot(p.xz, gAx) * 0.7 * aw;
  vec3 r = vec3(p.x * 0.47 + p.z * 0.88, p.y * 1.1 - uCloudC * 0.02, p.z * 0.47 - p.x * 0.88) - gSeed.zxy;
  vec4 m = textureLod(uStormVol, r / (gTile * 0.29), lod);
  return m.g * 0.6 + m.b * 0.4 - 0.48;
}
// Billow size: full on the column, small on the anvil's top.
float billowAmp(float y, float aw) {
  return gAmp * mix(1.0, mix(0.45, 0.18, smoothstep(gTop - 0.9, gTop + 0.1, y)), aw);
}
// Density for light taps: the shape with the big lumps only.
float towerLightDens(vec3 p, float lod) {
  float aw, sh = towerShape(p, aw), A = billowAmp(p.y, aw);
  if (sh < -A * 0.45 - 0.5) return 0.0;
  return smoothstep(0.0, 0.5, sh + A * billow(p, lod, aw));
}
// Rain: a grey curtain from the base to the ground, under the core.
// Streaks run down: the noise stretches tall, so the shaft hangs in strands.
float rainAt(vec3 p) {
  if (p.y > gBase || p.y < 0.0) return 0.0;
  vec2 across = vec2(-gAx.y, gAx.x);
  vec2 q = p.xz - gAx * (gRc * 0.3 + (gBase - p.y) * 0.25);
  float rr = gLine > 0.0 ? length(vec2(dot(q, gAx), max(abs(dot(q, across)) - gLine, 0.0))) : length(q);
  float core = smoothstep(gRc * 0.95, gRc * 0.3, rr);
  if (core < 0.01) return 0.0;
  float str = textureLod(uStormVol, vec3(q * 0.45, p.y * 0.04 - uCloudC * 0.01) + gSeed * 0.11, 1.0).r;
  return 0.22 * core * smoothstep(0.35, 0.65, str) * smoothstep(0.0, 0.4, p.y) * smoothstep(gBase, gBase - 0.3, p.y) * (1.0 - 0.5 * gDecay);
}`;

// The march through one storm, in km: Window seat's tower march, step for step.
// The host defines, before this chunk:
//   vec3 cellSun(vec3 Pw)   the sunlight at world point Pw (metres);
//   vec3 cellDome()         Window seat's sky dome light (zenith, sun side, far side);
//   vec3 cellTwi()          the sky's glow low on the sun's side;
//   vec3 cellExtra(vec3 Pw, float open)  any other light, such as the rock's fire;
//   vec3 Ls                 the key light's direction; float uStars, 0 day to 1 night;
//   vec4 uFl[4], uFlR       lightning: place in metres and level, reach in metres.
// It returns the colour and, in alpha, the cover; Phit is the first cloud (metres).
// Flash holds the lightning apart; the host adds it after the air, as Window seat does.
export const CELL_MARCH = /* glsl */`
float cellHg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }
float cellPhase(float mu) { return mix(cellHg(mu, 0.72), cellHg(mu, -0.2), 0.35); }
const vec3 FLASH_C = vec3(0.64, 0.72, 1.0);
// tMax: the nearest land on the ray, in km.
// pixK: a pixel's width at one km, in km; it sets the noise's level of detail.
vec4 marchCell(vec3 ro, vec3 rd, vec3 C, vec4 bound, float tMax, float pixK, float jit, out vec3 Phit, out vec3 Flash) {
  // The bounding cylinder, in km from the storm's centre.
  vec3 o = (ro - C) / 1000.0;
  vec2 oc = o.xz - bound.xy;
  float A2 = dot(rd.xz, rd.xz), B = dot(oc, rd.xz), C2 = dot(oc, oc) - bound.z * bound.z, D = B * B - A2 * C2;
  Phit = C;
  Flash = vec3(0.0);
  if (D <= 0.0 || A2 < 1e-9) return vec4(0.0);
  D = sqrt(D);
  float t0 = max((-B - D) / A2, 0.0), t1 = (-B + D) / A2;
  // The ray leaves through the top or the ground.
  if (rd.y > 1e-5) t1 = min(t1, (bound.w - o.y) / rd.y);
  if (rd.y < -1e-5) t1 = min(t1, -o.y / rd.y);
  // Land in front hides the rest of the storm.
  t1 = min(t1, tMax);
  if (t1 <= t0) return vec4(0.0);
  float mu = dot(rd, Ls), phase = cellPhase(mu);
  vec3 dome = cellDome(), twi = cellTwi();
  // Far flashes punch through the haze, so distant storms still flicker.
  float fBoost = 1.0 + clamp(t0 / 120.0, 0.0, 1.5);
  // Steps grow with distance, as a pixel's footprint does; Softness stretches them.
  float st = 0.3 * clamp(t0 / 70.0, 0.75, 2.2);
  float t = t0 + st * jit;
  vec3 col = vec3(0.0);
  float Tc = 1.0, tIn = -1.0;
  for (int k = 0; k < 96; k++) {
    if (t > t1) break;
    vec3 p = o + rd * t;
    float dn = 0.0, open = 1.0, sh = -1.0, aw = 0.0;
    float rain = rainAt(p);
    if (p.y >= gBase - 1.0) {
      sh = towerShape(p, aw);
      float A = billowAmp(p.y, aw);
      // Far outside the shape, even the biggest lump cannot reach: skip ahead.
      float gap = -sh - A * 0.45 - 0.5;
      if (gap > 0.0 && rain < 0.001) { t += max(gap * 0.8, st); continue; }
      if (gap <= 0.0) {
        float lod = clamp(log2(t * pixK / (gTile / 64.0)) + 0.5, 0.0, 6.0);
        float fb = sh + A * billow(p, lod, aw);
        float lodF = clamp(log2(t * pixK / (gTile * 0.29 / 64.0)) + 0.5, 0.0, 6.0);
        fb += A * (0.4 + 0.5 * aw) * billowFine(p, lodF, aw) * uLook.y;
        // The anvil is ice: far out, it frays to a veil.
        float far = aw * smoothstep(0.0, gLen + gR2, dot(p.xz, gAx));
        fb -= far * 0.6;
        // A decaying column frays and thins below its anvil.
        float dc = gDecay * (1.0 - aw);
        fb -= dc * A * 0.5;
        dn = smoothstep(0.0, (0.3 + 0.9 * dc) * uLook.z, fb) * (1.0 - 0.7 * far) * (1.0 - 0.5 * dc) * uLook.w;
        // Sky light falls from above; folds and the base see little.
        // Creases sit deep in the base shape; lump crowns stand out of it.
        float crease = clamp(0.7 - 1.4 * sh / max(A, 0.1), 0.15, 1.2);
        open = exp(-0.45 * max(fb, 0.0)) * crease;
        vec2 radl = normalize(p.xz - gAx * gLean + 1e-4);
        open *= 1.0 - 0.75 * towerLightDens(p + vec3(radl.x * 0.4, 0.3, radl.y * 0.4), lod + 1.0);
      }
    }
    float d = dn + rain;
    if (d < 0.004) { t += st; continue; }
    vec3 Pw = C + p * 1000.0;
    if (tIn < 0.0) { tIn = t; Phit = Pw; }
    float h01 = clamp((p.y - gBase) / (gTop - gBase), 0.0, 1.0);
    // Light toward the sun: a lumpy tap near, a smooth tap far.
    float aw2;
    float od = towerLightDens(p + Ls * 0.5, 2.0) * 0.8 + smoothstep(-0.3, 0.6, towerShape(p + Ls * 2.2, aw2)) * 1.8;
    // Beer's law for the direct beam; light scattered many times spreads evenly.
    float Tl = exp(-3.0 * od), Tm = 0.3 * exp(-0.6 * od);
    // Powder: thin edges that face away from the light stay dark.
    float powder = mix(1.0, 1.0 - exp(-5.0 * d), 0.5 * (1.0 - max(mu, 0.0)));
    vec3 S = cellSun(Pw) * (Tl * phase + Tm * 0.7) * powder;
    float sky = (0.2 + 0.8 * h01) * (0.25 + 0.75 * open);
    S += dome * 1.5 * sky;
    // The glow round the sun lights the side that faces it.
    S += twi * 0.3 * Tl * (0.3 + 0.25 * phase) * open;
    S *= mix(1.0, 0.45, uStars);
    // Rain is grey: the sky's brightness, little of its hue, darker under the cloud.
    if (rain > dn) S = mix(S, vec3(dot(dome, vec3(0.3, 0.5, 0.2))) * 0.5, 0.7);
    S += cellExtra(Pw, open);
    float al = 1.0 - exp(-7.0 * d * st);
    col += Tc * S * al;
    // Lightning: a soft ball of light inside the cloud, brightest deep in.
    for (int i = 0; i < 4; i++) {
      if (uFl[i].w < 0.001) continue;
      float fd = length(Pw - uFl[i].xyz) / 1000.0, r2 = uFlR[i] / 1000.0;
      Flash += Tc * al * FLASH_C * uFl[i].w * (1.8 * exp(-fd * fd / (r2 * r2)) + 0.5 * exp(-fd / (2.2 * r2))) * (1.0 - 0.6 * clamp(open, 0.0, 1.0)) * fBoost;
    }
    Tc *= 1.0 - al;
    if (Tc < 0.03) break;
    t += st;
  }
  float a = 1.0 - Tc;
  return vec4(a > 0.004 ? col / a : vec3(0.0), a);
}`;
