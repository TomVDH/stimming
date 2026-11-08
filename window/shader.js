// Window seat shaders: two passes on one full-screen quad.
// Pass 1 draws the outside into its own buffer, only behind the glass.
// Pass 2 draws the cabin, the frame and the panes; the glass samples pass 1.

export const QUAD_VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const W2 = v => `vec2(${v[0].toFixed(4)}, ${v[1].toFixed(4)})`;

// Noise, the window shape and the sky lookup, for both passes.
const common = ({ ALT, WIN }) => `
const float R = 6371.0, H = ${ALT.toFixed(1)};
const float PI = 3.14159265;
uniform vec3 uEye; uniform vec2 uBank;
uniform sampler2D uSkyL, uSkyT; uniform vec2 uSunAz; uniform float uHorEl;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { return vec2(hash12(p), hash12(p + 19.19)); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p, int n) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { if (i >= n) break; s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

// A rounded box: the shape of the window.
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
const vec2 OUTB = ${W2(WIN.out)}, INB = ${W2(WIN.inn)};
const float ROUT = ${WIN.rOut.toFixed(4)}, RIN = ${WIN.rIn.toFixed(4)}, DEPTH = ${WIN.depth.toFixed(4)}, SLOT = ${WIN.slot.toFixed(4)};
// The recess narrows from the rim to the pane.
float sdRecess(vec2 p, float z) { float k = clamp(z / DEPTH, 0.0, 1.0); return sdBox(p, mix(OUTB, INB, k), mix(ROUT, RIN, k)); }
// The ray's point on the plane at depth z, in window metres.
vec2 at(vec3 da, float z) { return (uEye + da * ((z - uEye.z) / da.z)).xy; }
// Outside rays turn with the bank of the plane.
vec3 toWorld(vec3 da) { return vec3(da.x, da.y * uBank.x - da.z * uBank.y, da.y * uBank.y + da.z * uBank.x); }

// The baked sky table: azimuth from the light, then elevation.
// Rows crowd near the eye's horizon, as in sky.js.
vec2 skyUV(vec3 d) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  vec2 h = d.xz; float lh = length(h);
  float ph = lh > 1e-5 ? acos(clamp(dot(h / lh, uSunAz), -1.0, 1.0)) : 0.0;
  float v = el >= uHorEl ? 0.5 + 0.5 * sqrt((el - uHorEl) / (0.5 * PI - uHorEl)) : 0.5 - 0.5 * sqrt((uHorEl - el) / (0.5 * PI + uHorEl));
  return vec2(ph / PI, v);
}
`;

/* ---------- pass 1: the outside ---------- */
export const outsideFS = ({ ALT, WIN, MAXCELL, MAXFL }) => `#version 300 es
precision highp float;
${common({ ALT, WIN })}
uniform vec2 uRes, uOutRes; uniform float uTime, uTowns, uFocal, uCover, uFlash, uCirrus;
uniform int uDeckSteps, uTowSteps, uTowOct; uniform float uTowStep;
uniform vec2 uCam;
uniform vec3 uF, uR, uU;
uniform vec3 uAmb, uSun, uSunL, uFloor;
uniform vec3 uWing[4], uLet[4], uWingN, uLetN, uTip; uniform float uStrobe;
uniform vec4 uTw[${MAXCELL}]; uniform vec4 uTwB[${MAXCELL}]; uniform vec4 uTwC[${MAXCELL}]; uniform int uNTw;
uniform vec4 uFl[${MAXFL}];
out vec4 o;

// A ray from the eye hits the sphere at height hl, from above.
float hitLayer(vec3 d, float hl) {
  float b = (R + H) * d.y, c = (H - hl) * (2.0 * R + H + hl), disc = b * b - c;
  return (disc < 0.0 || b > 0.0) ? -1.0 : -b - sqrt(disc);
}
// Both crossings of the shell at height hl, near then far; -1 on a miss.
vec2 shell(vec3 d, float hl) {
  float b = (R + H) * d.y, c = (H - hl) * (2.0 * R + H + hl), disc = b * b - c;
  if (disc < 0.0 || b > 0.0) return vec2(-1.0);
  float q = sqrt(disc);
  return vec2(-b - q, -b + q);
}
// The point's height above the ground, t km along the ray.
float heightAt(vec3 d, float t) { return length(vec3(0.0, R + H, 0.0) + d * t) - R; }

// Sky light along a ray, from the baked table.
vec3 skyL(vec3 d) { return texture(uSkyL, skyUV(d)).rgb + uFloor; }

// Towns: one site per 16 km cell, with a size and a street angle.
// x: town density, y: street angle of the strongest site.
// z: the town light spread wide, as the haze scatters it.
vec3 towns(vec2 w) {
  vec2 g = w / 16.0, i = floor(g);
  float T = 0.0, best = 0.0, ang = 0.0, wide = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 c = i + vec2(x, y);
    vec2 site = (c + 0.15 + 0.7 * hash22(c)) * 16.0;
    float sz = pow(hash12(c + 11.3), 2.6) * uTowns;
    float r = 1.0 + 6.5 * sz;
    vec2 q = w - site;
    float v = (0.3 + sz) * exp(-dot(q, q) / (r * r));
    T += v;
    wide += (0.15 + sz) * sz * exp(-dot(q, q) / (r * r * 6.0));
    if (v > best) { best = v; ang = hash12(c + 2.7) * 3.1416; }
  }
  // Ragged edges: towns spill along valleys, not in discs.
  T *= 0.45 + 1.1 * fbm(w / 2.2, 3);
  return vec3(T, ang, wide);
}

// One lamp per cell, at a random spot, lit with chance p.
float lamps(vec2 w, float s, float p, float fw, float seed, out float hue) {
  vec2 gp = w / s, id = floor(gp), f = fract(gp);
  hue = hash12(id + seed + 9.3);
  float on = step(hash12(id + seed), p);
  vec2 at = 0.2 + 0.6 * hash22(id + seed + 3.1);
  float r = max(0.08, fw / s * 0.7);
  vec2 q = f - at;
  float b = 0.012 / (r * r) * exp(-dot(q, q) / (r * r)) * on * (0.5 + hash12(id + seed + 5.5));
  // Far away, lamps blend into their average glow.
  return mix(p * 0.04, b, smoothstep(0.9, 0.25, fw / s));
}

vec3 ground(vec2 w, float fw) {
  vec3 sodium = vec3(1.0, 0.5, 0.16), led = vec3(0.8, 0.88, 1.0);
  // Fields: a patchwork that catches the sky light.
  vec2 fp = floor(vec2(w.x * 1.7 + w.y * 0.4, w.y * 2.4 - w.x * 0.3));
  float parcel = 0.45 + 0.9 * hash12(fp);
  vec3 g = uAmb * 0.005 * parcel * (0.7 + 0.6 * fbm(w / 9.0, 3));
  g += uSunL * 0.004 * parcel * max(uSun.y, 0.0);
  vec3 tw = towns(w);
  float T = tw.x;
  // The light dome: haze over each town glows from the streets below.
  g += vec3(1.0, 0.55, 0.24) * tw.z * 0.03;
  float dense = smoothstep(0.08, 0.5, T);
  // The town glow: warm haze over the roofs.
  g += sodium * T * 0.035;
  float hue;
  // Lamps gather in blocks, with dark gaps for parks and yards.
  float blocks = smoothstep(0.2, 0.8, vnoise(w / 0.45));
  float a = lamps(w, 0.13, dense * (0.25 + 0.65 * blocks), fw, 0.0, hue);
  g += mix(sodium, led, step(0.9, hue)) * a;
  // Highways: long white lines between towns, with a few lamps out in the dark.
  vec2 hw = w / 22.0 + 0.9 * vec2(vnoise(w / 30.0), vnoise(w / 30.0 + 7.3));
  float ridge = abs(vnoise(hw) - 0.5);
  float hwW = max(0.02, fw * 0.6) / 22.0;
  float road = exp(-ridge * ridge / (hwW * hwW * 4.0)) * 0.012 / max(0.02, fw * 0.6) * (0.5 + 0.5 * vnoise(w / 3.0));
  g += mix(led, sodium, 0.5) * road * 0.18;
  float rural = lamps(w, 0.9, 0.08 * uTowns, fw, 41.0, hue);
  g += sodium * rural * 0.6;
  return g;
}

// Lightning lights the cloud around each flash from inside.
vec3 flashAt(vec2 w, float dens) {
  float f = 0.0;
  for (int i = 0; i < ${MAXFL}; i++) {
    vec4 l = uFl[i];
    if (l.z <= 0.0) continue;
    vec2 q = w - l.xy;
    f += l.z * exp(-dot(q, q) / (l.w * l.w));
  }
  return vec3(0.72, 0.74, 1.0) * f * (0.1 + dens * 1.5);
}

// The deck at a map point. x: cover, y: top height in km, z: lumps.
// Far away, lod drops the fine detail that would only alias.
vec3 deckAt(vec2 w, float lod) {
  float n = fbm(w / 22.0 + vec2(uTime * 0.004, 0.0), 4 - int(lod * 2.0));
  float c = smoothstep(uCover, uCover + 0.22, n);
  float l = mix(vnoise(w / 3.0) + 0.5 * vnoise(w / 1.3), 0.75, lod);
  return vec3(c, 1.75 + c * (0.45 + 0.8 * l), l);
}
const float DECK_LO = 1.4, DECK_HI = 3.3, SIG = 3.0;
// The cloud deck as a volume: a march through the slab.
// It returns the light it scatters and, in alpha, what it lets through.
vec4 deck(vec3 d) {
  vec2 top = shell(d, DECK_HI), bot = shell(d, DECK_LO);
  if (top.x < 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = top.x, t1 = bot.x > 0.0 ? bot.x : top.y;
  t1 = min(t1, t0 + 140.0);
  int N = uDeckSteps;
  // Steps stay short; a long grazing path ends in one closing step.
  float ds = min((t1 - t0) / float(N), 2.5);
  // A fixed jitter per pixel breaks the step bands into fine grain.
  float t = t0 + ds * fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
  // Town light under the deck, sampled at both ends of the segment.
  vec2 wa = uCam + d.xz * t0, wb = uCam + d.xz * t1;
  float ua = towns(wa).z, ub = towns(wb).z;
  vec2 sx = normalize(uSun.xz + 1e-5) * 0.5;
  // Forward scatter makes a silver lining toward the light.
  float mu = max(dot(d, uSun), 0.0);
  float phase = 0.6 + 1.6 * pow(mu, 6.0) + 2.5 * pow(mu, 60.0);
  // A low sun reaches only the tops that face it.
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.1);
  vec3 col = vec3(0.0), last = vec3(0.0);
  float Tc = 1.0, lastC = 0.0;
  for (int i = 0; i < 32; i++) {
    if (i >= N) break;
    float y = heightAt(d, t);
    vec2 w = uCam + d.xz * t;
    float lod = smoothstep(25.0, 90.0, t);
    vec3 dk = deckAt(w, lod);
    float c = dk.x, tp = dk.y, base = 1.6 - 0.15 * c;
    float dens = c * smoothstep(base, base + 0.25, y) * smoothstep(tp, tp - 0.35, y);
    if (dens > 0.002) {
      float h01 = clamp((y - base) / max(tp - base, 0.1), 0.0, 1.0);
      // Lumps that face the light catch it; the depth above shades the rest.
      float slope = lod < 1.0 ? (vnoise((w + sx) / 3.0) + 0.5 * vnoise((w + sx) / 1.3)) - dk.z : 0.0;
      float lit = clamp(0.5 - slope * 4.0 * (1.0 - lod), 0.0, 1.0);
      float Tl = exp(-SIG * 0.6 * max(tp - y, 0.0));
      vec3 S = uSunL * 0.07 * sunK * Tl * (0.25 + 0.75 * lit * lit) * phase;
      S += uAmb * 0.024 * (0.35 + 0.65 * h01) * (0.7 + 0.5 * lit);
      // Streets light the base from below, orange through the haze.
      float town = mix(ua, ub, float(i) / float(N));
      S += vec3(1.0, 0.5, 0.2) * town * 0.05 * exp(-SIG * 1.6 * max(y - base, 0.0));
      S += flashAt(w, 1.0) * 0.6 * (0.4 + 0.6 * h01);
      float a = 1.0 - exp(-SIG * dens * ds);
      col += Tc * S * a;
      Tc *= 1.0 - a;
      last = S;
      if (Tc < 0.02) break;
    }
    lastC = c;
    t += ds;
  }
  // The rest of a long path takes the last cover and light.
  if (Tc >= 0.02 && t < t1) {
    float a = 1.0 - exp(-SIG * lastC * 0.5 * (t1 - t));
    col += Tc * last * a;
    Tc *= 1.0 - a;
  }
  return vec4(col, Tc);
}

// Cirrus: thin streaks high above, at 12.5 km, lit by the sun or moon.
// The streaks scatter the same light as the sky behind them, a little more.
vec4 cirrus(vec3 d, vec3 sk) {
  if (uCirrus <= 0.0) return vec4(0.0);
  float b = (R + H) * d.y, c = (R + H) * (R + H) - (R + 12.5) * (R + 12.5);
  float t = -b + sqrt(b * b - c);
  vec2 w = uCam + d.xz * t;
  // Wind stretches the streaks along one bearing.
  vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * w;
  float n = fbm(vec2(q.x / 30.0, q.y / 4.0) + vec2(uTime * 0.002, 0.0), 5);
  float a = smoothstep(0.52, 0.78, n) * uCirrus * 0.45;
  // Far streaks fade into the horizon glow.
  a *= exp(-t / 320.0);
  float mu = max(dot(d, uSun), 0.0);
  vec3 col = sk * 1.25 + uAmb * 0.008 + uSunL * 0.05 * (0.4 + 3.0 * pow(mu, 10.0));
  return vec4(col, a);
}

// skyA turns 1 where the ray reaches open sky, 0 where it hits ground.
vec3 outside(vec3 d, float focal1, out float skyA) {
  vec2 uv = skyUV(d);
  vec3 L = texture(uSkyL, uv).rgb, T = texture(uSkyT, uv).rgb;
  float tg = hitLayer(d, 0.0);
  if (tg < 0.0) {
    skyA = 1.0;
    // A tight glow round the sun, finer than the table holds.
    float ang = acos(clamp(dot(d, uSun), -1.0, 1.0));
    vec3 sk = L + uFloor + uSunL * 0.03 * exp(-ang * 22.0);
    // The tops of a far deck rise above the ground's horizon.
    vec4 cl = deck(d);
    skyA = cl.a;
    sk = sk * cl.a + cl.rgb;
    vec4 ci = cirrus(d, sk);
    skyA *= 1.0 - ci.a;
    return mix(sk, ci.rgb, ci.a);
  }
  skyA = 0.0;
  vec2 w = uCam + (vec3(0.0, R + H, 0.0) + d * tg).xz;
  // Ground footprint of one pixel, in km, grows at grazing angles.
  float fw = tg / focal1 / max(-d.y, 0.03);
  vec3 g = ground(w, fw);

  vec4 cl = deck(d);
  g = g * cl.a + cl.rgb;

  // The air between: the baked view ray dims the ground and adds its glow.
  return g * T + L + uFloor * 0.5;
}

// 3D value noise, for the billows of the storm towers.
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm3(vec3 p, int n) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { if (i >= n) break; s += a * vnoise3(p); p = p * 2.07 + 13.7; a *= 0.5; } return s; }

// Storm towers: true volumes, a column under a sheared anvil.
// uTw: centre xz on the map, radius, top height, all in km.
// uTwB: seed, strength, anvil bearing, town glow under the cell.
// uTwC: flash xyz on the map, flash level.
// The column radius, the anvil radius and the top height.
vec3 towerSize(vec4 a, vec4 b) { return vec3(a.z * 0.36 * (0.55 + 0.45 * b.y), a.z * 1.0 * b.y, a.w); }

// A safe distance to the tower's outer bound, in km; it allows for the billows.
// It follows the column's taper and the anvil's slab, so empty space is skipped.
float towerBound(vec3 p, vec3 sz, vec2 sh) {
  float y = p.y, top = sz.z;
  float rc = sz.x * (0.62 + 0.45 * smoothstep(2.0, 6.5, y) - 0.2 * smoothstep(6.5, top, y));
  float dc = max(length(p.xz) - rc - sz.x * 0.36 - 1.8, max(1.8 - y, y - top - 1.4));
  float ra = length(p.xz - sh * smoothstep(top - 4.0, top, y));
  float k = clamp(ra / max(sz.y, 0.1), 0.0, 1.0);
  float lo = top - 3.4 + 2.6 * k, hi = top + 0.25 - 1.0 * k * k;
  float da = max(ra - sz.y * 1.36 - 1.9, max(lo - 1.3 - y, y - hi - 0.6));
  return min(dc, da);
}

// oct 0 gives the smooth shape alone, for cheap light taps.
float towerDens(vec3 p, vec4 b, vec3 sz, vec2 sh, int oct) {
  float y = p.y, top = sz.z;
  float bl = oct > 0 ? fbm3(vec3(p.x, p.y * 1.25, p.z) / 1.6 + b.x, oct) - 0.5 : 0.0;
  // The column: narrow at the base, bulging mid-height, cauliflower billows.
  float rc = sz.x * (0.62 + 0.45 * smoothstep(2.0, 6.5, y) - 0.2 * smoothstep(6.5, top, y));
  float big = oct > 0 ? vnoise3(p / 4.5 + b.x * 0.37) - 0.5 : 0.0;
  float col = smoothstep(0.0, 0.7, rc - length(p.xz) + bl * 3.4 + big * sz.x * 0.7);
  // The overshooting top domes over the core.
  float cap = top + 0.8 * exp(-dot(p.xz, p.xz) / (sz.x * sz.x * 0.5));
  col *= smoothstep(cap + 0.2, cap - 0.6, y + bl * 0.8);
  // The anvil: a slab sheared downwind, thick at the core, thin at its rim.
  // Its underside sags in lumps; its rim frays.
  float ra = length(p.xz - sh * smoothstep(top - 4.0, top, y));
  float k = clamp(ra / max(sz.y, 0.1), 0.0, 1.0);
  float lo = top - 3.4 + 2.6 * k, hi = top + 0.25 - 1.0 * k * k;
  // Broad lobes break the anvil's rim from a circle.
  float lobe = vnoise(p.xz / (sz.y * 0.35 + 1.0) + b.x) - 0.5;
  float anv = smoothstep(0.0, 1.5, sz.y * (1.0 + lobe * 0.7) - ra + bl * 3.5) * smoothstep(lo - 0.4, lo + 0.4, y + bl * 1.6) * smoothstep(hi + 0.2, hi - 0.3, y + bl * 0.5);
  return max(col, anv) * smoothstep(1.8, 3.0, y) * b.y;
}

// Each tower marches only inside its bounding cylinder.
// tEnd stops the march where the ray meets the ground.
vec3 towers(vec3 d, float tEnd, vec3 c, inout float skyA) {
  // Far towers melt into the haze along their own bearing.
  float he = uHorEl - 0.004;
  vec2 hz = normalize(d.xz + 1e-5);
  vec3 haze = skyL(vec3(hz.x * cos(he), sin(he), hz.y * cos(he))) * 0.9;
  vec2 dh = d.xz;
  float a2 = max(dot(dh, dh), 1e-6);
  float mu = max(dot(d, uSun), 0.0);
  float phase = 0.55 + 1.4 * pow(mu, 5.0) + 2.0 * pow(mu, 40.0);
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.1);
  float jit = fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
  for (int i = 0; i < ${MAXCELL}; i++) {
    if (i >= uNTw) break;
    vec4 a = uTw[i], b = uTwB[i], f = uTwC[i];
    vec3 sz = towerSize(a, b);
    vec2 sh = vec2(cos(b.z), sin(b.z)) * a.z * 0.55 * b.y;
    // The ray against a cylinder round both column and anvil.
    vec2 Cb = a.xy - uCam + sh * 0.5;
    float Rb = max(sz.x * 1.45 + 1.8, sz.y * 1.36 + 1.9) + length(sh) * 0.5 + 0.5;
    float bq = dot(dh, Cb), cq = dot(Cb, Cb) - Rb * Rb, disc = bq * bq - a2 * cq;
    if (disc <= 0.0) continue;
    float sq = sqrt(disc);
    float t0 = max((bq - sq) / a2, 0.0), t1 = min((bq + sq) / a2, tEnd);
    if (t1 <= t0) continue;
    vec3 pf = vec3(f.x - a.x, f.y, f.z - a.y);
    vec3 col = vec3(0.0);
    float Tc = 1.0, t = t0 + uTowStep * jit, tIn = -1.0;
    for (int k = 0; k < 96; k++) {
      if (k >= uTowSteps || t > t1) break;
      vec2 w = uCam + dh * t;
      vec3 p = vec3(w.x - a.x, heightAt(d, t), w.y - a.y);
      // Outside the bound, skip ahead by the safe distance.
      float bd = towerBound(p, sz, sh);
      if (bd > 0.0) { t += max(bd, uTowStep); continue; }
      float dn = towerDens(p, b, sz, sh, uTowOct);
      // Empty space near the cloud takes longer steps.
      if (dn <= 0.003) { t += uTowStep * 1.5; continue; }
      {
        if (tIn < 0.0) tIn = t;
        // One smooth tap toward the light gives its shadow inside the cloud.
        float Tl = exp(-2.9 * towerDens(p + uSun * 1.2, b, sz, sh, 0));
        float h01 = clamp((p.y - 2.0) / (sz.z - 2.0), 0.0, 1.0);
        vec3 S = uSunL * 0.08 * sunK * Tl * phase;
        S += uAmb * 0.026 * (0.3 + 0.7 * h01) * (0.4 + 0.6 * Tl);
        // Streets under the cell light its base orange.
        S += vec3(1.0, 0.5, 0.2) * b.w * 0.05 * exp(-(p.y - 2.0) / 1.5);
        // Lightning lights the volume from inside.
        vec3 q = p - pf;
        S += vec3(0.72, 0.74, 1.0) * f.w * 1.6 * exp(-length(q) / 1.8);
        float al = 1.0 - exp(-2.6 * dn * uTowStep);
        col += Tc * S * al;
        Tc *= 1.0 - al;
        if (Tc < 0.05) break;
      }
      t += uTowStep;
    }
    if (tIn < 0.0) continue;
    float fog = 1.0 - exp(-tIn / 160.0);
    col = col * (1.0 - fog) + haze * (1.0 - Tc) * fog;
    c = c * Tc + col;
    skyA *= Tc;
  }
  return c;
}

// A ray hits a flat convex quad: the wing or its winglet.
// Returns the hit distance, or -1; uv gives chord and span from 0 to 1.
float quad(vec3 d, vec3 v[4], vec3 n, out vec2 uv) {
  float dn = dot(d, n);
  if (abs(dn) < 1e-4) return -1.0;
  float t = dot(v[0], n) / dn;
  if (t <= 0.0) return -1.0;
  vec3 p = d * t;
  // Inside a convex quad, every edge test has the same sign.
  float s0 = 0.0;
  for (int i = 0; i < 4; i++) {
    vec3 e = v[(i + 1) % 4] - v[i];
    float s = dot(cross(e, p - v[i]), n);
    if (i == 0) s0 = s;
    else if (s * s0 < 0.0) return -1.0;
  }
  // Span runs root to tip; chord runs leading to trailing edge.
  vec3 le = v[1] - v[0];
  float sp = clamp(dot(p - v[0], le) / dot(le, le), 0.0, 1.0);
  vec3 a = mix(v[0], v[1], sp), b = mix(v[3], v[2], sp);
  uv = vec2(clamp(dot(p - a, b - a) / dot(b - a, b - a), 0.0, 1.0), sp);
  return t;
}
// The wing is painted grey; its top mirrors the sky at a grazing angle.
// uv.x runs leading to trailing edge; uv.y runs root to tip.
vec3 wingCol(vec3 d, vec3 n, vec2 uv, float t, float E, float strobe) {
  // A satin finish blurs the mirror toward the horizon glow.
  vec3 r = reflect(d, n);
  vec3 env = skyL(normalize(vec3(r.x, max(r.y, -0.02) * 0.45, r.z)));
  // Grey paint keeps half the sky's colour.
  env = mix(vec3(dot(env, vec3(0.3, 0.5, 0.2))), env, 0.5);
  float fres = 0.05 + 0.6 * pow(1.0 - abs(dot(d, n)), 4.0);
  // Diffuse light from the whole sky dome on grey paint.
  vec3 c = uAmb * 0.03 * (0.85 + 0.3 * uv.y);
  c += env * fres * 0.9;
  // Panel joints run chordwise; spars and the flap seam run spanwise.
  float sp = uv.y * 15.0;
  c *= 1.0 - 0.25 * smoothstep(0.03, 0.0, abs(fract(sp) - 0.5) - 0.47);
  c *= 1.0 - 0.3 * smoothstep(0.008, 0.0, abs(uv.x - 0.24));
  c *= 1.0 - 0.5 * smoothstep(0.01, 0.0, abs(uv.x - 0.7));
  c *= 0.92 + 0.16 * vnoise(vec2(uv.x * 8.0, uv.y * 60.0));
  // The leading edge is round, so it catches a bright line of sky.
  c += env * 1.4 * smoothstep(0.045, 0.0, uv.x);
  // The trailing edge thins to a dark line.
  c *= 1.0 - 0.6 * smoothstep(0.95, 1.0, uv.x);
  // The cabin windows throw warm pools on the wing near the root.
  float row = smoothstep(0.1, 0.02, uv.y) * smoothstep(0.0, 0.015, uv.y);
  float pane = smoothstep(0.3, 0.12, abs(fract(uv.x * 14.0) - 0.5));
  c += vec3(1.0, 0.72, 0.42) * 0.01 * row * pane;
  // The nav light and the strobe light the wing near the tip.
  vec3 tp = d * t - uTip;
  c += vec3(1.0, 0.08, 0.05) * exp(-dot(tp, tp) / 0.8) * 0.02 + vec3(0.9, 0.95, 1.0) * exp(-dot(tp, tp) / 4.0) * strobe * 0.3;
  c += vec3(0.72, 0.74, 1.0) * E * 0.25;
  return c;
}

void main() {
  // Pass 1 pixels map onto full-size screen pixels.
  vec2 px = gl_FragCoord.xy * uRes / uOutRes;
  vec3 da = normalize(uF * uFocal + uR * (px.x - uRes.x * 0.5) + uU * (px.y - uRes.y * 0.5));
  // Only rays that can reach the pane pay for the outside.
  if (da.z <= 0.0 || sdBox(at(da, DEPTH), INB, RIN) > 0.012) { o = vec4(0.0); return; }
  vec3 d = toWorld(da);
  float E = 0.004 + uFlash * 0.07;
  float skyA;
  vec3 c = outside(d, uFocal * uOutRes.x / uRes.x, skyA);
  float tg = hitLayer(d, 0.0);
  c = towers(d, tg > 0.0 ? tg : 1e4, c, skyA);
  vec2 uv, uv2;
  float tw = quad(d, uWing, uWingN, uv);
  if (tw > 0.0) { c = wingCol(d, uWingN, uv, tw, E, uStrobe); skyA = 0.0; }
  float tl = quad(d, uLet, uLetN, uv2);
  if (tl > 0.0 && (tw < 0.0 || tl < tw)) { c = wingCol(d, uLetN, uv2.yx, tl, E, uStrobe) * 0.8; skyA = 0.0; }
  o = vec4(c, skyA);
}`;

/* ---------- pass 2: cabin, frame and glass ---------- */
export const cabinFS = ({ ALT, WIN }) => `#version 300 es
precision highp float;
${common({ ALT, WIN })}
uniform vec2 uRes; uniform float uTime, uDpr, uFocal, uShade, uFlash;
uniform vec3 uF, uR, uU;
uniform int uSteps;
uniform sampler2D uOut;
uniform vec3 uGlow, uSun, uDisc, uTint, uTip; uniform float uSunR, uSquash, uMoon, uStars, uStrobe;
uniform vec4 uFlr[4]; uniform vec3 uFlrC[4];
out vec4 o;

// Stars hold still; they fade toward the horizon glow.
vec3 stars(vec3 d) {
  vec2 sp = vec2(atan(d.x, d.z) * 160.0, d.y * 160.0);
  vec2 si = floor(sp), sf = fract(sp) - 0.5;
  float st = step(0.985, hash12(si)) * exp(-dot(sf, sf) * 40.0) * smoothstep(0.02, 0.3, d.y - uHorEl);
  return vec3(0.8, 0.85, 1.0) * st * (0.2 + hash12(si + 3.0)) * 0.12 * uStars;
}

// The sun or moon disc, dimmed and reddened by the air along the ray.
vec3 disc(vec3 d) {
  if (dot(d, uSun) < cos(uSunR * 10.0)) return vec3(0.0);
  vec3 e = normalize(cross(vec3(0.0, 1.0, 0.0), uSun)), n = cross(uSun, e);
  // Refraction squashes the disc near the horizon.
  vec2 q = vec2(dot(d, e), dot(d, n) / uSquash) / uSunR;
  float r = length(q);
  float aa = 1.2 / (uFocal * uSunR);
  float body = smoothstep(1.0 + aa, 1.0 - aa, r);
  float mu = sqrt(max(0.0, 1.0 - r * r));
  vec3 c;
  if (uMoon > 0.5) {
    // Faint maria, and a soft halo of ice haze.
    float maria = smoothstep(0.42, 0.62, fbm(q * 1.6 + 4.0, 4)) * 0.3 + 0.08 * vnoise(q * 9.0);
    c = uDisc * (1.0 - maria) * (0.88 + 0.12 * mu) * body;
    c += uDisc * 0.035 * exp(-max(r - 1.0, 0.0) * 0.9) * (1.0 - body);
  } else {
    // Limb darkening: the edge of the sun looks dimmer and redder.
    c = uDisc * vec3(1.0 - 0.5 * (1.0 - mu), 1.0 - 0.62 * (1.0 - mu), 1.0 - 0.75 * (1.0 - mu)) * body;
  }
  return c * texture(uSkyT, skyUV(d)).rgb;
}

vec3 glass(vec3 da, vec2 px) {
  vec4 out1 = texture(uOut, px / uRes);
  vec3 view = out1.rgb;
  vec3 d = toWorld(da);
  // Point sources draw at full size; pass 1 says where sky shows.
  if (out1.a > 0.001) view += out1.a * (stars(d) + disc(d));
  // The red nav light: a hot core and a soft halo.
  float ang = acos(clamp(dot(d, normalize(uTip)), -1.0, 1.0)) * uFocal / uDpr;
  view += vec3(1.0, 0.06, 0.04) * (exp(-ang * ang / 3.0) * 1.5 + exp(-ang / 14.0) * 0.05);
  view += vec3(0.9, 0.95, 1.0) * uStrobe * (exp(-ang * ang / 5.0) * 4.0 + exp(-ang / 40.0) * 0.12);
  return view;
}

// Lens flare, after Buoy Business (see Beach walker): haze, orb,
// an anamorphic streak and warm ghosts on the line through the centre.
// uFlr: source xy in pixels, gain times cover, size. uFlrC: colour.
vec3 flare(vec2 px, vec3 base) {
  const vec3 ORANGE = vec3(1.0, 0.42, 0.1);
  vec2 uv = px / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 add = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 f = uFlr[i];
    if (f.z <= 0.0) continue;
    vec3 col = uFlrC[i];
    vec2 sp = f.xy / uRes;
    vec2 d = (uv - sp) / f.w;
    float ax = d.x * aspect, ay = d.y;
    // A wide veil of haze and a soft orb, squashed sideways.
    float r = length(vec2(ax * 0.6, ay));
    vec3 a = col * (0.025 * exp(-r * 1.5) + 0.08 * exp(-r * 5.0) + 0.4 * exp(-r * 22.0));
    // The streak grows with its source, in three nested bands.
    float line = 0.9 * exp(-abs(ay) * 34.0) + 0.3 * exp(-abs(ay) * 9.0) + 0.07 * exp(-abs(ay) * 2.6);
    a += mix(col, vec3(0.85, 0.8, 1.0), 0.25) * line * exp(-abs(ax) / (0.3 * f.w));
    // Ghosts sit on the line from the source through the frame centre.
    vec2 toC = vec2(0.5) - sp;
    for (int k = 0; k < 4; k++) {
      vec3 gs = k == 0 ? vec3(0.7, 0.05, 0.9) : k == 1 ? vec3(1.4, 0.09, 0.6) : k == 2 ? vec3(2.2, 0.15, 0.4) : vec3(-0.45, 0.03, 0.5);
      vec2 g = (uv - (sp + toC * gs.x)) * vec2(aspect, 1.0);
      float gr = length(g) / (gs.y * f.w);
      a += mix(col, col * ORANGE, 0.4) * exp(-gr * gr) * gs.z * 0.12;
    }
    add += a * f.z;
  }
  // Screen blend: the flare washes the frame instead of clipping it.
  vec3 c = 1.0 - (1.0 - base) * (1.0 - min(add, 1.0));
  // The lens darkens toward the corners.
  vec2 vq = (uv - 0.5) * vec2(aspect, 1.0);
  return c * mix(1.0, 0.6, smoothstep(0.3, 1.0, length(vq)));
}

void main() {
  vec2 px = gl_FragCoord.xy;
  // The camera ray, in the cabin frame.
  vec3 da = normalize(uF * uFocal + uR * (px.x - uRes.x * 0.5) + uU * (px.y - uRes.y * 0.5));
  float E = 0.004 + uFlash * 0.07;
  vec3 eCol = mix(vec3(1.0, 0.86, 0.72), vec3(0.75, 0.8, 1.0), clamp(uFlash * 3.0, 0.0, 1.0));
  // Warm cabin light, low and dim, for a night flight.
  vec3 cabin = vec3(0.016, 0.012, 0.0095);
  vec3 outGlow = uGlow * 0.014 + eCol * E;
  float alb = 0.5;
  // Cabin light falls from above and a little aft.
  vec3 Lc = normalize(vec3(-0.3, 0.85, -0.45));

  vec2 p0 = da.z > 0.0 ? at(da, 0.0) : vec2(9.0);
  float sOut = sdBox(p0, OUTB, ROUT);
  // Wall: curved plastic panels, lit from above and by the window.
  float wy = p0.y;
  vec3 wall = alb * cabin * (0.55 + 0.6 * smoothstep(-0.6, 0.5, wy)) * (0.85 + 0.15 * vnoise(p0 * 900.0));
  // A seam between two wall panels gives the plane its slant.
  wall *= 1.0 - 0.35 * smoothstep(0.004, 0.0, abs(p0.x - 0.36));
  wall += alb * outGlow * 0.8 * exp(-max(sOut, 0.0) / 0.07);
  // A soft shadow rings the rim of the recess.
  wall *= 1.0 - 0.4 * exp(-max(sOut, 0.0) / 0.012);
  vec3 c = wall;

  if (da.z > 0.0 && sOut < 0.01) {
    // March the recess from the rim to the pane.
    float z0 = 0.0, hit = -1.0;
    for (int i = 1; i <= 32; i++) {
      if (i > uSteps) break;
      float z = DEPTH * float(i) / float(uSteps);
      if (sdRecess(at(da, z), z) > 0.0) { hit = z; break; }
      z0 = z;
    }
    if (hit > 0.0) {
      for (int k = 0; k < 5; k++) { float m = 0.5 * (z0 + hit); if (sdRecess(at(da, m), m) > 0.0) hit = m; else z0 = m; }
    }
    // The shade slides in its slot, just behind the rim.
    vec2 pS = at(da, SLOT);
    float lipY = INB.y + 0.02 - uShade * (2.0 * INB.y + 0.04);
    bool inSlot = sdRecess(pS, SLOT) < 0.0;
    bool onShade = uShade > 0.001 && inSlot && pS.y > lipY && (hit < 0.0 || hit > SLOT);
    vec3 inner;
    if (onShade) {
      float above = pS.y - lipY;
      vec3 sh = alb * 1.2 * (cabin * (0.5 + 0.7 * smoothstep(-0.2, 0.2, pS.y)) + eCol * E * 0.12);
      // Its lip: a dark groove, then a lit edge.
      sh *= 1.0 - 0.55 * smoothstep(0.012, 0.0, above) * smoothstep(0.0, 0.003, above);
      sh += alb * smoothstep(0.003, 0.0, abs(above - 0.0015)) * (cabin * 1.6 + eCol * E * 0.8);
      inner = sh;
    } else if (hit > 0.0) {
      // Bezel: the tunnel wall faces into the hole and toward the cabin.
      vec2 ph = at(da, hit);
      float k = hit / DEPTH;
      vec2 e = vec2(0.002, 0.0);
      vec2 g2 = normalize(vec2(sdRecess(ph + e.xy, hit) - sdRecess(ph - e.xy, hit), sdRecess(ph + e.yx, hit) - sdRecess(ph - e.yx, hit)) + 1e-6);
      float slope = (OUTB.x - INB.x) / DEPTH;
      vec3 n = normalize(vec3(-g2, -slope));
      float diff = max(dot(n, Lc), 0.0);
      // Sky light through the glass falls on the sill and lower walls.
      float sky = (0.35 + 0.65 * max(-g2.y, 0.0)) * pow(k, 1.5);
      inner = alb * (cabin * (0.25 + 1.3 * diff) + outGlow * 1.6 * sky);
      // A crisp rim where the slope meets the wall.
      inner += alb * cabin * 1.4 * smoothstep(0.004, 0.0, hit) * (0.3 + diff);
    } else {
      // Glass: the outside, with frost and the breather hole on the pane.
      vec2 pG = at(da, DEPTH);
      vec3 view = glass(da, px);
      float edge = -sdBox(pG, INB, RIN);
      float fr = fbm(pG * 520.0, 4) * 0.7 + fbm(pG * 80.0, 3) * 0.5;
      float frost = smoothstep(0.03, 0.0, edge) * smoothstep(-0.03, -0.15, pG.y) * smoothstep(0.62, 0.8, fr + 6.0 * (0.03 - edge));
      view += eCol * frost * (0.003 + E * 0.35);
      // A faint reflection of the lit cabin in the glass.
      view += vec3(0.0018, 0.0015, 0.0012) * smoothstep(0.2, -0.15, pG.x + pG.y * 0.5);
      float bh = length(pG - vec2(0.0, -INB.y * 0.72));
      view = mix(view, vec3(0.0), smoothstep(0.0028, 0.0018, bh) * 0.85);
      // The shade's lip casts a short shadow down the glass.
      view *= 1.0 - 0.45 * smoothstep(lipY - 0.03, lipY, pG.y) * step(0.001, uShade);
      inner = view;
    }
    // Soften the step from wall to rim over about a pixel.
    float aa = fwidth(sOut) * 1.2;
    c = mix(wall, inner, smoothstep(aa, -aa, sOut));
  }
  // Each hour carries a small colour grade.
  c *= uTint;
  c = 1.0 - exp(-c * 3.2);
  c = flare(px, c);
  c += (hash12(px + fract(uTime * 7.13) * 911.0) - 0.5) * 0.006;
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // A soft S-curve for contrast, as in Beach walker's grade.
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);
  o = vec4(c, 1.0);
}`;
