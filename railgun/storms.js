// The railgun's storms: the table, the noise, the shapes and the march.
// The toy and the storm lab both import this file.
// Shapes follow Window seat's storm cells, drawn inside each storm's card.

// Each storm: bearing in degrees, range, base height, half width, height, form.
// Bearings turn left from negative z, about the landscape eye, as the ranges do.
// Forms: 1 storm tower, 2 towering cumulus, 3 squall line, 4 dying storm, 5 supercell.
// Bases sit two to four kilometres up, as storm bases do; rain falls to the plain.
// Heights match this world's ranges, whose far crests reach 30 to 50 km.
// The nearer storms stand in front of the ranges; the supercell's foot sinks behind the curve.
export const STORMS = [
  [-14, 85000, 2500, 13000, 30000, 1],
  [8, 135000, 2800, 10000, 22000, 2],
  [28, 95000, 2200, 14000, 26000, 3],
  [52, 200000, 3500, 36000, 62000, 5],
];
export const FORMS = ['', 'Storm tower', 'Towering cumulus', 'Squall line', 'Dying storm', 'Supercell'];
// A storm past this range draws in the Giants band, behind the towers.
export const GIANT_RANGE = 180000;
// The look knobs: billow size, ragged edges, anvil reach, body density.
export const STORM_K = [1, 1, 1, 1];

// The baked noise: R Perlin-Worley, G fine Worley, B Worley; it tiles.
// volAt returns one texel of the volume at p in [0, 1]^3.
export const VOL_NOISE = /* glsl */`
vec3 vh3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
// Inverted Worley noise; it tiles at f cells.
float vworley(vec3 uv, float f) {
  vec3 id = floor(uv * f), p = fract(uv * f);
  float md = 9.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 d = o + vh3(mod(id + o, f)) * 0.8 + 0.1 - p;
    md = min(md, dot(d, d));
  }
  return clamp(1.0 - sqrt(md), 0.0, 1.0);
}
float vgrad(vec3 i, vec3 w, vec3 o, float f) { return dot(vh3(mod(i + o, f)) * 2.0 - 1.0, w - o); }
// Gradient noise; it tiles at f cells.
float vperlin(vec3 uv, float f) {
  vec3 p = uv * f, i = floor(p), w = fract(p);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(vgrad(i, w, vec3(0, 0, 0), f), vgrad(i, w, vec3(1, 0, 0), f), u.x), mix(vgrad(i, w, vec3(0, 1, 0), f), vgrad(i, w, vec3(1, 1, 0), f), u.x), u.y),
             mix(mix(vgrad(i, w, vec3(0, 0, 1), f), vgrad(i, w, vec3(1, 0, 1), f), u.x), mix(vgrad(i, w, vec3(0, 1, 1), f), vgrad(i, w, vec3(1, 1, 1), f), u.x), u.y), u.z);
}
vec4 volAt(vec3 p) {
  float pf = clamp(0.5 + 0.8 * (vperlin(p, 4.0) + 0.5 * vperlin(p, 8.0) + 0.25 * vperlin(p, 16.0)), 0.0, 1.0);
  float wf = vworley(p, 4.0) * 0.625 + vworley(p, 8.0) * 0.25 + vworley(p, 16.0) * 0.125;
  float fine = vworley(p, 6.0) * 0.625 + vworley(p, 12.0) * 0.25 + vworley(p, 24.0) * 0.125;
  return vec4(wf + pf * (1.0 - wf), fine, wf, 1.0);
}`;

// The storm's shape and density, in storm units: a fourteenth of its height.
// The host declares: sampler3D uVol, float uCloudC, vec4 uStormK.
export const STORM_GLSL = /* glsl */`
float hsh(float n, float sd) { return fract(sin(n * 91.7 + sd * 13.13) * 43758.5453); }
float smax(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float smin(float a, float b, float k) { return -smax(-a, -b, k); }
// The storm, set once per pixel.
// sRc core radius, sTop top, sLen anvil reach, sR1 and sR2 anvil widths.
// sLine: half the length of a squall line, across the wind; 0 for one cell.
// sShelf: the shelf cloud at a squall line's foot. sBand: a supercell's banding.
// sRag: how ragged the edges are. sAmp: billow size.
// sGround: the ground under the storm, in storm units below its base (negative).
// sRain: how hard it rains under the core.
float sRc, sTop, sLen, sR1, sR2, sLean, sOver, sAnv, sTile, sSeed, sLine, sShelf, sBand, sRag, sAmp, sGround, sRain;
vec2 sAx;
vec4 sTur[5];
void setStorm(float sd, float form) {
  sSeed = sd;
  sRc = 3.4 * mix(0.8, 1.2, hsh(1.0, sd));
  sTop = 13.0;
  sAnv = step(0.33, hsh(2.0, sd));
  sLen = mix(5.0, 10.0, hsh(3.0, sd));
  sLine = 0.0; sShelf = 0.0; sBand = 0.0; sRag = 0.25; sAmp = 1.0; sRain = mix(0.6, 1.0, hsh(8.0, sd));
  // One wind for every storm: anvils run the same way.
  sAx = normalize(vec2(0.8, -0.6) + (vec2(hsh(4.0, sd), hsh(5.0, sd)) - 0.5) * 0.3);
  sLean = sRc * 0.18;
  float turTop = 1.0, turSpread = 1.0, turR = 1.0;
  if (form > 1.5 && form < 2.5) {
    // Towering cumulus: young, no anvil, a cauliflower crown of tight turrets.
    sAnv = 0.0; sTop = mix(8.5, 11.0, hsh(6.0, sd)); sAmp = 1.35; turSpread = 0.7; turTop = 1.1; sRain = 0.25;
  } else if (form > 2.5 && form < 3.5) {
    // Squall line: cells in a row across the wind, one long anvil, a shelf at the foot.
    sAnv = 1.0; sLine = sRc * mix(2.4, 3.4, hsh(7.0, sd)); sShelf = 1.0; sTop = 11.5; sLen = mix(4.0, 6.5, hsh(3.0, sd));
  } else if (form > 3.5 && form < 4.5) {
    // Dying storm: a thin, ragged column under a wide anvil that drifts on.
    sAnv = 1.0; sLen = mix(9.0, 13.0, hsh(3.0, sd)); sRag = 1.0; turR = 0.62; turTop = 0.8; sLean = sRc * 0.5; sRain = 0.45;
  } else if (form > 4.5) {
    // Supercell: one fat banded column, a big overshoot, a broad anvil.
    sAnv = 1.0; sRc *= 1.25; sLen = mix(9.0, 12.0, hsh(3.0, sd)); sBand = 1.0; turSpread = 0.55; sAmp = 0.85;
  }
  sAnv *= uStormK.z > 0.01 ? 1.0 : 0.0;
  sLen *= uStormK.z;
  sR1 = sRc * 1.25 + sLine;
  sR2 = clamp(sRc * 0.7 + sLen * 0.42 + sLine, sR1 - sLen * 0.8, sR1 + sLen * 0.8);
  sOver = sRc * 0.45 * sAnv * (form > 4.5 ? 1.5 : 1.0) * (0.8 + 0.2 * sin(uCloudC * 0.05 + sd));
  sTile = clamp(sRc * 1.6, 5.0, 11.0);
  sRag *= uStormK.y;
  sAmp *= uStormK.x;
  vec2 across = vec2(-sAx.y, sAx.x);
  for (int j = 0; j < 5; j++) {
    float fj = float(j);
    float ang = hsh(fj + 7.0, sd) * 6.2832, off = j == 0 ? 0.0 : sRc * (0.4 + 0.4 * hsh(fj + 11.0, sd)) * turSpread;
    float rad = (j == 0 ? sRc * 0.8 : sRc * (0.4 + 0.22 * hsh(fj + 13.0, sd))) * turR;
    float top = j == 0 ? sTop - 0.4 : mix(3.0, sTop - 3.2, 0.2 + 0.8 * hsh(fj + 17.0, sd)) * turTop;
    vec2 at = vec2(cos(ang), sin(ang)) * off;
    // A squall line strings its cells along the line, each nearly as tall as the next.
    if (sLine > 0.0) { at = across * sLine * (fj / 2.0 - 1.0) + sAx * (hsh(fj + 19.0, sd) - 0.5) * sRc * 0.6; rad = sRc * (0.62 + 0.2 * hsh(fj + 13.0, sd)); top = sTop - 0.4 - 2.2 * hsh(fj + 17.0, sd); }
    sTur[j] = vec4(at, rad, min(top, sTop - 0.4));
  }
}
// The storm's shape without billows: about the depth inside.
// aw gives the anvil's share of the point, from 0 to 1.
float shape(vec3 p, out float aw) {
  float y = p.y, hk = clamp(y / sTop, 0.0, 1.0);
  vec2 q = p.xz - sAx * sLean * hk * hk;
  vec2 across = vec2(-sAx.y, sAx.x);
  float col = -1e3;
  for (int j = 0; j < 5; j++) {
    vec4 tu = sTur[j];
    float r = tu.z * (1.0 + 0.12 * (1.0 - hk));
    float dy = y - clamp(y, -1.0, tu.w - r);
    col = smax(col, r - length(vec2(length(q - tu.xy), dy * 1.25)), sRc * 0.3);
  }
  // A broad foot that narrows as the column rises out of it.
  float an_ = atan(q.y, q.x);
  float lobe = 1.0 + 0.28 * sin(3.0 * an_ + sSeed) + 0.15 * sin(5.0 * an_ - sSeed * 1.3);
  float fr = sRc * mix(1.5, 0.9, smoothstep(0.5, 4.5, y)) * mix(1.0, lobe, 0.6);
  // A supercell's lower column turns: bands of cloud stack like plates.
  fr *= 1.0 + sBand * 0.14 * sin(y * 3.1 + an_ * 1.0 + sSeed) * (1.0 - smoothstep(2.0, 6.0, y));
  // A squall line's foot runs the whole length of the line.
  float fl = sLine > 0.0 ? sRc * 1.1 - length(vec2(dot(q, sAx), max(abs(dot(q, across)) - sLine, 0.0))) : fr - length(q);
  col = smax(col, min(fl, (4.5 - y) * 0.8), sRc * 0.5);
  // The base is flat.
  col = smin(col, y * 2.0, 0.3);
  // The shelf: a low wedge that runs out ahead of the line, thin at its lip.
  if (sShelf > 0.0) {
    float ahead = -dot(q, sAx), along = abs(dot(q, across));
    float lip = sRc * 2.2, k = clamp(ahead / lip, 0.0, 1.0);
    float sh = min(min(ahead + sRc * 0.6, lip - ahead), min(sLine + sRc - along, min(y + 0.2, 1.6 - 1.2 * k - y)));
    col = smax(col, sh, 0.6);
  }
  // The anvil: a fan that widens downwind, flat on top, thin at its rim.
  vec2 a = p.xz - sAx * sLean;
  vec2 uv = vec2(dot(a, across), dot(a, sAx));
  float k = clamp(uv.y / sLen, 0.0, 1.0), ku = clamp(-uv.y / sR1, 0.0, 1.0);
  float top = sTop + 0.2 - 0.5 * k * k - 0.8 * ku * ku;
  float bot = top - mix(3.0, 0.25, pow(k, 0.7)) * (1.0 - 0.85 * ku * ku);
  float fan = min(mix(sR1, sR2, k) - abs(uv.x), min(uv.y + sR1, sLen + sR2 * 0.4 - uv.y));
  float an = smin(fan, smin(top - y, y - bot, 0.3), 0.8) - (1.0 - sAnv) * 20.0;
  // The overshooting top: a squat dome on the core's head.
  float ov = sOver - length(vec3(q.x, (y - sTop + 0.4 + sOver * 0.2) * 1.35, q.y));
  aw = smoothstep(-0.6, 0.6, an - col);
  return smax(smax(col, an, 0.9), ov, 1.0);
}
// Cauliflower billows from the baked volume; the lumps rise slowly.
float billow(vec3 p, float aw, bool fine) {
  p.xz -= sAx * dot(p.xz, sAx) * 0.6 * aw;
  vec3 r = vec3(p.x * 0.8 - p.z * 0.6, p.y - uCloudC * 0.006, p.x * 0.6 + p.z * 0.8) + sSeed * 0.37;
  // Worley lumps, as Window seat's: round cauliflower heads, not smooth swells.
  vec4 m = texture(uVol, r / sTile);
  float b = m.b * 0.75 + m.g * 0.25 - 0.47;
  if (fine) b = b * 0.72 + (texture(uVol, r / (sTile * 0.31) + 0.5).g - 0.5) * 0.28;
  return b;
}
// Rain: grey curtains from the base to the ground, under the core and the line.
// Streaks run down: the noise stretches tall, so the shafts hang in strands.
float rainAt(vec3 p) {
  if (p.y > 0.4 || p.y < sGround || sRain < 0.01) return 0.0;
  vec2 across = vec2(-sAx.y, sAx.x);
  // The rain leans a little downwind as it falls.
  vec2 q = p.xz - sAx * (p.y - 0.4) * 0.25;
  float rr = sLine > 0.0 ? length(vec2(dot(q, sAx), max(abs(dot(q, across)) - sLine, 0.0))) : length(q - sAx * sRc * 0.25);
  float core = smoothstep(sRc * 1.0, sRc * 0.35, rr);
  if (core < 0.01) return 0.0;
  vec3 r = vec3(q.x * 1.6, p.y * 0.18 - uCloudC * 0.02, q.y * 1.6) + sSeed * 0.11;
  float str = texture(uVol, r / sTile).r;
  // The curtain thins near the ground and fades at the base's edge.
  return sRain * 0.35 * core * smoothstep(0.42, 0.7, str) * smoothstep(sGround, sGround + 1.5, p.y) * smoothstep(0.4, 0.0, p.y);
}
// gap: how far outside the billowed shell p lies, for empty-space skipping.
float dens(vec3 p, bool fine, out float gap) {
  float aw, sh = shape(p, aw), A = sRc * 0.4 * mix(1.0, 0.35, aw) * sAmp;
  gap = -sh - A * 1.1 - 0.5 - sRag * A * 0.4;
  // Under the base the march walks through the rain at a steady stride.
  if (p.y < 0.4 && p.y > sGround) { float rn = rainAt(p); gap = min(gap, 0.0); if (gap < 0.0 && sh < -A * 1.1) return rn * uStormK.w; }
  if (gap > 0.0) return 0.0;
  float v = sh + A * 2.2 * billow(p, aw, fine);
  // Ragged edges: fine noise tears the outer shell into wisps.
  if (fine && sRag > 0.01) {
    vec3 r = vec3(p.x * 0.6 + p.z * 0.8, p.y * 1.4 - uCloudC * 0.01, p.z * 0.6 - p.x * 0.8) - sSeed * 0.21;
    v -= sRag * A * 0.9 * texture(uVol, r / (sTile * 0.18)).g * (1.0 - smoothstep(0.0, A * 1.5, v));
  }
  // A wide ramp feathers the outer billows into the sky.
  return smoothstep(0.0, 0.6, v) * uStormK.w;
}
float densL(vec3 p) { float g; return dens(p, false, g); }
// The storm's reach from its centre, in storm units, for the bounding cylinder.
float stormReach() { return max(sLen + sR2, sRc * 2.4 + sLine) + (sShelf > 0.0 ? sRc * 2.4 : 0.0) + 2.0; }
// The host sets the ground under the base, in metres, with the storm's height.
void setGround(float base, float H) { sGround = -base / (H / 14.0); }`;

// The march through one storm; the host supplies the light.
// The host defines, before this chunk:
//   vec3 stormSun(vec3 P)  the sunlight at world point P;
//   vec3 stormSky(float h) the sky light at height share h;
//   vec3 stormFlash(vec3 P) the in-cloud lightning at P, in Window seat's FLASH_C;
//   vec3 stormExtra(vec3 P, float powder, float Tl2) any other light, such as the rock's fire;
//   vec3 Ls, the key light's direction; float uStars, 0 day to 1 night.
// It returns the colour and, in alpha, the cover; Phit is the first cloud.
// Flash holds the lightning apart: the host adds it after the air, as Window seat does.
export const STORM_MARCH = /* glsl */`
vec4 marchStorm(vec3 ro, vec3 rd, vec3 C, float H, float t0, float t1, float jit, out vec3 Phit, out vec3 Flash) {
  float U = H / 14.0;
  // Steps: short inside the cloud, long leaps through the empty bound.
  float dt = (t1 - t0) / 48.0;
  float mu = dot(rd, Ls);
  float ph = 0.5 * (1.0 - 0.36) / pow(1.0 + 0.36 - 1.2 * mu, 1.5) + 0.5 * (1.0 - 0.04) / pow(1.0 + 0.04 + 0.4 * mu, 1.5);
  // A low sun rakes the towers: lit faces glow, the far side goes deep.
  float low = 1.0 - smoothstep(0.05, 0.4, Ls.y);
  vec3 col = vec3(0.0);
  Flash = vec3(0.0);
  float Tc = 1.0, t = t0 + dt * jit;
  Phit = C + vec3(0.0, 0.5 * H, 0.0);
  bool hit = false;
  for (int i = 0; i < 64; i++) {
    if (t > t1) break;
    vec3 P = ro + rd * t;
    vec3 p = (P - C) / U;
    if (p.y > sTop + 3.0 && rd.y > 0.0) break;
    float gap, d = dens(p, true, gap);
    if (d < 0.003) { t += max(dt, gap * U * 0.8); continue; }
    if (!hit) { Phit = P; hit = true; }
    // One tap toward the light gives the self shadow; a longer one darkens the far side.
    float Tl = exp(-3.2 * densL(p + Ls * 1.2));
    float Tl2 = exp(-1.6 * densL(p + Ls * 3.5));
    float h01 = clamp(p.y / sTop, 0.0, 1.0);
    vec3 sunC = stormSun(P);
    // Powder: thin edges facing the sun catch the most light.
    float powder = 1.0 - exp(-4.0 * d);
    // Light scattered many times fills the shaded side, so it never goes cold and flat.
    vec3 S = sunC * Tl * Tl2 * min(ph, 1.6) * mix(0.95, 1.45, low) * mix(1.0, powder, 0.35)
           + sunC * 0.32 * (0.35 + 0.65 * Tl2)
           + stormSky(h01) * (0.4 + 0.45 * h01) * (0.6 + 0.4 * Tl2);
    S *= mix(1.0, 0.45, uStars);
    // The base is flat and dark: the whole storm stands between it and the sky.
    // Rain under it is darker still, grey with little of the sky's hue.
    S *= p.y < 0.0 ? 0.32 : mix(0.45, 1.0, smoothstep(0.0, 2.5, p.y));
    S += stormExtra(P, powder, Tl2);
    // Thick body: the column is opaque a few kilometres in.
    float al = 1.0 - exp(-5.0 * d * dt / U);
    col += Tc * S * al;
    Flash += Tc * stormFlash(P) * (0.4 + 0.6 * d) * al;
    Tc *= 1.0 - al;
    if (Tc < 0.03) break;
    t += dt;
  }
  float a = 1.0 - Tc;
  return vec4(a > 0.004 ? col / a : vec3(0.0), a);
}
// The ray's span inside a storm's bounding cylinder; x > y when it misses.
vec2 stormSpan(vec3 ro, vec3 rd, vec3 C, float H) {
  float Rb = stormReach() * H / 14.0;
  vec2 oc = ro.xz - C.xz;
  float A2 = dot(rd.xz, rd.xz), B = dot(oc, rd.xz), C2 = dot(oc, oc) - Rb * Rb, D = B * B - A2 * C2;
  if (D <= 0.0 || A2 < 1e-9) return vec2(1.0, 0.0);
  D = sqrt(D);
  return vec2(max((-B - D) / A2, 0.0), (-B + D) / A2);
}`;
