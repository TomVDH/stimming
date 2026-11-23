// Hurricane eye renderer: raw WebGL2.
// Passes: cloud march at half size, blur, world, glass drops, cockpit, bloom, grade.
// Each program stays small, so D3D11 links it fast.
// Units: km in the world, metres in the cockpit.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { CLOUDS } from '../shared/clouds.js';
import { GLASS_RAIN } from '../shared/glassrain.js';
import { OUTPUT } from '../shared/output.js';
import { GRADE } from '../shared/grade.js';

const HEAD = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 o;
`;

// The storm: a cone of cloud round the eye, a cloud floor in the eye.
const WORLD = `${HEAD}
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform vec3 uLens;
uniform vec4 uShape;
uniform vec3 uSun;
uniform float uT;
uniform sampler3D uNoise;
const vec3 SUN_L = vec3(4.3, 4.05, 3.7);
const vec3 SKY_L = vec3(0.5, 0.68, 1.05);
const vec3 HAZE_L = vec3(0.62, 0.74, 0.95);
${CLOUDS}
vec3 camRay(vec2 uv) {
  vec2 s = uv * 2.0 - 1.0;
  return normalize(uCamRot * vec3(s.x * uLens.x, s.y * uLens.y, -1.0));
}
// The smooth face radius at a height: the wall leans out as it climbs.
float smoothR(float y) { return uShape.x + uShape.y * y; }
// The real face: steep tiers, then a step out, and lobes round the eye.
// track.js faceR() copies this on the CPU; change both together.
float faceR(vec3 p, float a) {
  const float TIER = 1.7;
  // The tiers wander up and down round the eye, so no ring is level.
  float yw = p.y + 0.7 * sin(a * 3.0 + 0.4) + 0.4 * sin(a * 7.0 + 2.1);
  float f = yw / TIER, fi = floor(f);
  float hq = (fi + smoothstep(0.72, 1.0, f - fi)) * TIER;
  float r = uShape.x + uShape.y * (p.y + (hq - yw) * 0.65);
  // Buttresses and bays round the eye, leaning as they climb.
  return r + 0.85 * sin(a * 5.0 + 1.3 + p.y * 0.12) + 0.45 * sin(a * 11.0 - 0.7 - p.y * 0.25) + 0.25 * sin(a * 23.0 + p.y * 0.4);
}
// Cauliflower: rounded lumps on lumps push a cloud's surface out.
// Inverted Worley peaks at each cell's point, so each cell is one bulge.
// track.js lumps() copies this on the CPU; change both together.
float lumps(vec3 p, bool lite) {
  // Some stretches tower in heaps; others lie smooth under a veil.
  float rough = 0.45 + 0.9 * texture(uNoise, p / 23.0 + 0.13).r;
  float s = (texture(uNoise, p / 7.0).g - 0.35) * 1.3 * rough + (texture(uNoise, p / 4.4 + 0.31).b - 0.4) * 0.6;
  if (!lite) s += (texture(uNoise, p / 2.2 + 0.67).a - 0.45) * 0.26 * rough;
  return s;
}
// Wall density per km. m is the depth below the lumpy surface, in km.
float wallDens(vec3 p, float r, float a, bool lite, out float m) {
  float d = r - faceR(p, a);
  m = -1.0;
  if (d < -1.6) return 0.0;
  float top = uShape.z - 0.05 * max(d, 0.0);
  m = min(d, top - p.y) + lumps(p, lite);
  if (m < 0.0) return 0.0;
  return smoothstep(0.0, 0.1, m) * 8.0;
}
float wallDens(vec3 p, float r, float a, bool lite) { float m; return wallDens(p, r, a, lite, m); }
// The cloud floor in the eye: heaped cloud turned into a spiral by the wind.
float floorDens(vec3 p, float r, float a, bool lite) {
  if (p.y < 0.45 || p.y > 2.9) return 0.0;
  float sw = a + 1.7 * log(max(r, 0.3) / uShape.w) + uT * 0.004;
  vec2 q = vec2(cos(sw), sin(sw)) * r;
  vec4 n = texture(uNoise, vec3(q.x / 11.0, 0.2, q.y / 11.0));
  float foot = smoothstep(-4.0, 0.0, r - smoothR(1.2));
  float cov = n.r * 0.9 + n.g * 0.4 - 0.72 + 0.3 * foot;
  if (cov < -0.3) return 0.0;
  // Each heap rises with its cover; lumps round its top and sides.
  float top = 0.9 + 1.6 * clamp(cov + 0.15, 0.0, 1.0);
  float m = min(top - p.y, p.y - 0.7) * 0.6 + cov * 0.9 - 0.18 + lumps(p * 1.6, lite) * 0.55;
  if (m < 0.0) return 0.0;
  return smoothstep(0.0, 0.08, m) * 5.0;
}
// The ray's length inside the smooth wall, from s = 0 to sMax.
// Inside means r over the face radius: g(s) = A s^2 + B s + C > 0.
float wallLen(vec3 p, vec3 l, float sMax) {
  float k = uShape.y, R = smoothR(p.y);
  float A = l.x * l.x + l.z * l.z - k * k * l.y * l.y;
  float B = 2.0 * (p.x * l.x + p.z * l.z - k * l.y * R);
  float C = p.x * p.x + p.z * p.z - R * R;
  if (abs(A) < 1e-6) A = 1e-6;
  float disc = B * B - 4.0 * A * C;
  if (disc < 0.0) return A > 0.0 ? sMax : 0.0;
  float sq = sqrt(disc);
  float s1 = (-B - sq) / (2.0 * A), s2 = (-B + sq) / (2.0 * A);
  if (s1 > s2) { float tt = s1; s1 = s2; s2 = tt; }
  float inner = max(0.0, min(s2, sMax) - max(s1, 0.0));
  return A > 0.0 ? sMax - inner : inner;
}
// The sun's path in the smooth wall from p, up to the wall top.
float sunLen(vec3 p) { return wallLen(p, uSun, max((uShape.z + 0.4 - p.y) / uSun.y, 0.0)); }
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// Beer, the multiple-scatter lobe, the powder term.
// The ambient floor becomes sky light that fades with depth: a storm is not a puff.
const float ABSORB = 1.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0;
float k3(float tau) {
  tau *= ABSORB;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  return mix(base, base * powder, POWDER);
}
/* ---------- end K3 lighting ---------- */
`;

/* ---------- march: the wall, the cloud floor, the haze ---------- */
const MARCH = `${WORLD}
uniform int uSteps;
uniform float uFrame;
uniform vec4 uFlash;
float densLite(vec3 p) {
  float r = length(p.xz), a = atan(p.z, p.x);
  return wallDens(p, r, a, true) + floorDens(p, r, a, true);
}
// Safe distances from p to the wall (x) and to the cloud floor (y), in km.
// The lumps reach at most 1.8 km out from the face.
vec2 gap(vec3 p) {
  float r = length(p.xz), a = atan(p.z, p.x);
  float d = r - faceR(p, a), gw;
  if (d < -2.0) gw = -d - 1.8;
  else gw = max(-(min(d, uShape.z - 0.05 * max(d, 0.0) - p.y) + lumps(p, true)) - 0.2, 0.0) * 0.7;
  float gf;
  if (p.y > 2.9 || p.y < 0.45) gf = max(p.y - 2.9, 0.45 - p.y);
  else {
    // The floor's cover in this column; an empty column is safe for a short hop.
    float sw = a + 1.7 * log(max(r, 0.3) / uShape.w) + uT * 0.004;
    vec2 q = vec2(cos(sw), sin(sw)) * r;
    vec4 n = texture(uNoise, vec3(q.x / 11.0, 0.2, q.y / 11.0));
    float cov = n.r * 0.9 + n.g * 0.4 - 0.72 + 0.3 * smoothstep(-4.0, 0.0, r - smoothR(1.2));
    // Over a heap, the gap is the height above its lumpy top.
    float top = 0.9 + 1.6 * clamp(cov + 0.15, 0.0, 1.0);
    gf = cov < -0.35 ? 0.3 : max(p.y - top - 0.7, 0.0);
  }
  return vec2(gw, gf);
}
vec3 lightAt(vec3 p, float r, float wall, float ph) {
  float tau = 4.5 * sunLen(p);
  tau += densLite(p + uSun * 0.07) * 0.07 + densLite(p + uSun * 0.25) * 0.18 + densLite(p + uSun * 0.7) * 0.45;
  // The shortest way out of the wall: in to the eye, or up to the top.
  float open = wall > 0.0 ? min(max(r - smoothR(p.y), 0.0), max(uShape.z - p.y, 0.0)) : 0.0;
  // Deep in the wall, rain shafts and denser masses dim the grey light.
  float mass = 1.0;
  if (wall > 0.0) {
    float n1 = texture(uNoise, p / 2.6 + vec3(0.0, uT * 0.01, 0.0)).r, n2 = texture(uNoise, p / 0.55 + 0.4).g;
    // Only deep inside: the face itself stays evenly lit.
    mass = mix(1.0, (0.3 + 1.1 * n1) * (0.25 + 1.6 * n2 * n2), smoothstep(0.15, 0.7, open));
  }
  // Sky light fades toward the cloud's base: crowns are bright, feet grey.
  float crown = 0.55 + 0.45 * smoothstep(0.5, 4.0, p.y);
  // Light deep in cloud has scattered many times: it turns grey.
  vec3 sky = mix(SKY_L, vec3(0.7, 0.74, 0.78), smoothstep(0.0, 0.5, open));
  vec3 L = SUN_L * k3(tau) * ph + sky * AMBIENT * crown * mass * exp(-0.6 * open);
  vec3 fd = p - uFlash.xyz;
  float f2 = dot(fd, fd);
  L += vec3(0.8, 0.85, 1.0) * uFlash.w * exp(-sqrt(f2) * 1.1) / (0.04 + f2);
  return L;
}
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  float tSea = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;
  float tTop = rd.y > 1e-4 ? (uShape.z + 1.2 - ro.y) / rd.y : 1e9;
  float tEnd = min(min(tSea, tTop), 110.0);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618034);
  float ph = clPhase(dot(rd, uSun));
  float T = 1.0, t = 0.0;
  vec3 S = vec3(0.0);
  for (int i = 0; i < uSteps; i++) {
    if (t >= tEnd || T < 0.01) break;
    vec3 p = ro + rd * t;
    // Empty air: skip by a safe distance to the nearest cloud.
    vec2 gg = gap(p);
    float g = min(gg.x, gg.y);
    // Near the floor only, long steps do: its heaps are big and far.
    float base = gg.x > 0.3 ? 0.08 + 0.03 * t : 0.035 + 0.015 * t;
    bool air = g > base;
    float dt = air ? g : base;
    dt = min(dt, tEnd - t);
    if (!air) {
      vec3 q = ro + rd * (t + dt * j);
      float r = length(q.xz), a = atan(q.z, q.x);
      float wm;
      float w = wallDens(q, r, a, false, wm);
      // Deep in the wall the cloud is torn into parcels that race past.
      if (wm > 0.3) w *= mix(1.0, 0.5 + 1.1 * texture(uNoise, q / 0.5 + vec3(uT * 0.02, 0.0, 0.0)).r, smoothstep(0.3, 0.8, wm));
      float s = w + floorDens(q, r, a, false);
      if (s > 0.002) {
        float al = 1.0 - exp(-s * dt);
        S += T * al * lightAt(q, r, w, ph);
        T *= 1.0 - al;
      }
    }
    // Humid air between the walls: a thin blue haze.
    float ah = 1.0 - exp(-0.011 * dt);
    S += T * ah * HAZE_L;
    T *= 1.0 - ah;
    t += dt;
  }
  // Out of steps: the ray goes on to the smooth wall, which is opaque.
  if (T > 0.01 && t < tEnd) {
    vec3 p = ro + rd * t;
    float lw = wallLen(p, rd, tEnd - t);
    float th = tEnd - t - lw;
    if (lw > 0.05) {
      vec3 h = p + rd * th;
      float k = exp(-0.011 * th);
      S += T * (1.0 - k) * HAZE_L;
      S += T * k * lightAt(h, length(h.xz), 1.0, ph);
      T = 0.0;
    }
  }
  o = vec4(S, T);
}`;

// A five-tap blur along one axis: it hides the march dither.
const BLUR = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uStep;
void main() {
  vec2 s = uStep / vec2(textureSize(uSrc, 0));
  o = texture(uSrc, vUv) * 0.4 + (texture(uSrc, vUv + s) + texture(uSrc, vUv - s)) * 0.24
    + (texture(uSrc, vUv + 2.0 * s) + texture(uSrc, vUv - 2.0 * s)) * 0.06;
}`;

/* ---------- world: sky, sea, the cloud over them, rain in the air ---------- */
const SCENE = `${WORLD}
uniform sampler2D uCloud;
uniform float uTime, uRain, uWind, uPix, uFlashK;
uniform vec2 uFoe, uAsp;
float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
vec3 sky(vec3 d) {
  float e = max(d.y, 0.0);
  vec3 c = mix(vec3(0.42, 0.55, 0.76), vec3(0.02, 0.07, 0.32), pow(e, 0.4));
  float mu = dot(d, uSun);
  c += vec3(1.0, 0.9, 0.76) * (0.3 * pow(max(mu, 0.0), 14.0) + 0.06 * pow(max(mu, 0.0), 3.0));
  return c + vec3(80.0) * smoothstep(0.99985, 0.99994, mu);
}
float fd(float L, float fl) { return smoothstep(0.25, 0.08, fl / L); }
// One noise tile holds about four cells: m / 4L gives cells of size L.
float vn2(vec2 m) { return texture(uNoise, vec3(m, 0.37)).r; }
// The sea under the storm: confused swell, wind streaks, the shadows of cloud.
vec3 sea(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  vec2 m = p.xz * 1000.0;
  float fl = t * 1000.0 * uPix / max(-rd.y, 0.06);
  float r = length(p.xz);
  vec2 rh = p.xz / max(r, 1e-3), tg = vec2(-rh.y, rh.x);
  // The wind runs round the eye and spirals in; it peaks under the wall.
  vec2 wd = normalize(tg * 0.94 - rh * 0.34);
  float w = mix(0.12, 1.0, smoothstep(uShape.x * 0.55, uShape.x, r)) * uWind;
  // Swell from every side: four long trains.
  vec2 s = vec2(0.0);
  float hgt = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ang = fi * 1.9 + 0.4;
    vec2 dir = vec2(cos(ang), sin(ang));
    float L = 160.0 + 70.0 * fi, k = 6.2832 / L, amp = (0.02 + 0.0012 * uWind) / k * fd(L, fl);
    // Each train breaks into short crests, so no grid shows.
    amp *= 0.4 + 1.2 * vn2(m / (L * 12.0) + fi * 0.37);
    float ph = dot(m, dir) * k - uTime * sqrt(9.81 * k) + fi * 2.1;
    hgt += sin(ph) * amp * k;
    s += dir * cos(ph) * amp * k;
  }
  vec3 n = normalize(vec3(-s.x, 1.0, -s.y));
  vec3 v = -rd;
  float nv = max(dot(n, v), 0.05);
  float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 rr = reflect(rd, n); rr.y = abs(rr.y);
  // Shade from the wall and from the cloud floor over the point.
  float lit = exp(-4.5 * sunLen(p));
  vec3 q = p + uSun * (1.4 / uSun.y);
  float rq = length(q.xz);
  lit *= exp(-0.9 * floorDens(q, rq, atan(q.z, q.x), true));
  vec3 E = SUN_L * lit * max(dot(n, uSun), 0.0) + SKY_L * 0.6;
  vec3 body = vec3(0.0025, 0.011, 0.02) * E;
  vec3 col = mix(body, sky(rr) * mix(0.35, 1.0, lit), fres);
  // Foam: long streaks down the wind, whitecaps on the crests.
  float al = dot(m, wd), ac = dot(m, vec2(-wd.y, wd.x));
  float st = vn2(vec2(al / 3600.0, ac / 220.0) + 0.3) * 0.65 + vn2(vec2(al / 1200.0, ac / 72.0) + 5.1) * 0.35;
  float gale = smoothstep(18.0, 45.0, w);
  float streak = mix(0.25 * gale, smoothstep(0.62 - 0.22 * gale, 0.86, st), fd(30.0, fl)) * (0.15 + 0.85 * gale);
  float cap = smoothstep(0.75 - 0.1 * gale, 0.95, vn2(m / 240.0 + 3.3) * 0.6 + hgt * 0.3 + 0.2) * fd(40.0, fl);
  float foam = clamp(streak * 0.9 + cap * (0.2 + 0.5 * gale), 0.0, 0.85);
  return mix(col, vec3(0.8, 0.84, 0.88) * E * 0.16, foam);
}
// Rain rushing past: streaks fly out from the point the plane flies to.
float rush(vec2 uv, float amt) {
  if (amt <= 0.0) return 0.0;
  vec2 s = (uv - uFoe) * uAsp;
  float rad = length(s), ang = atan(s.y, s.x) / 6.2832 + 0.5;
  float w = 0.0;
  for (int k = 0; k < 2; k++) {
    float cells = k == 0 ? 150.0 : 260.0;
    float ci = floor(ang * cells), h = h11(ci + float(k) * 17.0);
    if (h > amt * 0.22) continue;
    float u = fract(log(rad + 0.02) * 1.3 - uTime * (2.2 + 1.6 * h) + h * 9.0);
    float across = abs(fract(ang * cells) - 0.5);
    w += smoothstep(0.0, 0.03, u) * smoothstep(0.14, 0.05, u) * smoothstep(0.1, 0.0, across) * (0.3 + 0.4 * h);
  }
  return w * smoothstep(0.25, 0.8, rad);
}
void main() {
  vec3 rd = camRay(vUv);
  vec4 cl = texture(uCloud, vUv);
  vec3 bg = rd.y < -1e-4 ? sea(uCamPos, rd, -uCamPos.y / rd.y) : sky(rd);
  vec3 col = bg * cl.a + cl.rgb;
  // Rain in the air is lit by the grey light round the plane.
  col += vec3(0.6, 0.65, 0.72) * (0.05 + uFlashK * 2.0) * rush(vUv, uRain);
  o = vec4(col, 1.0);
}`;

/* ---------- the cockpit: shared by the drops pass and the cockpit pass ---------- */
// Aircraft space in metres: the eye at the origin, x right, y up, -z ahead.
const PIT = `${HEAD}
uniform mat3 uHeadRot;
uniform vec3 uLens, uSunA;
uniform vec2 uShake;
// The windscreen leans back: z = Z0 + RAKE y.
const float Z0 = -0.8, RAKE = 0.45, SIDE = -0.64, RSIDE = 1.44;
const float YB = -0.23, YT = 0.3;
vec3 pitRay(vec2 uv) {
  vec2 s = uv * 2.0 - 1.0 + uShake;
  return normalize(uHeadRot * vec3(s.x * uLens.x, s.y * uLens.y, -1.0));
}
// The glass the ray meets: 0 none, 1 front, 2 left side, 3 right side.
// q is the point on the pane in pane coordinates; t its distance.
int glassHit(vec3 d, out vec2 q, out float t) {
  q = vec2(0.0); t = 1e9;
  float den = d.z - RAKE * d.y;
  if (den < -1e-4) {
    float tf = Z0 / den;
    vec3 h = d * tf;
    if (h.y > YB && h.y < YT && h.x > SIDE + 0.02 && h.x < RSIDE - 0.02) { q = h.xy; t = tf; return 1; }
  }
  if (d.x < -1e-4) {
    float ts = SIDE / d.x;
    vec3 h = d * ts;
    if (h.y > YB + 0.05 && h.y < YT - 0.03 && h.z > Z0 + RAKE * h.y && h.z < 0.05) { q = vec2(-h.z, h.y); t = ts; return 2; }
  }
  if (d.x > 1e-4) {
    float ts = RSIDE / d.x;
    vec3 h = d * ts;
    if (h.y > YB + 0.05 && h.y < YT - 0.03 && h.z > Z0 + RAKE * h.y && h.z < 0.05) { q = vec2(-h.z, h.y); t = ts; return 3; }
  }
  return 0;
}
// The frame on a pane: posts, rims and the side window's slider post.
float frameOn(int g, vec2 q) {
  if (g == 1) {
    float post = min(min(abs(q.x - SIDE - 0.05), abs(q.x - 0.39)), abs(q.x - RSIDE + 0.05));
    float rim = min(q.y - YB, YT - q.y);
    return 1.0 - smoothstep(0.028, 0.034, min(post, rim + 0.012));
  }
  float zl = q.x, rim = min(min(q.y - YB - 0.05, YT - 0.03 - q.y), min(zl - 0.0, -(Z0 + RAKE * q.y) - zl));
  float post = abs(zl - 0.36);
  return 1.0 - smoothstep(0.026, 0.032, min(rim + 0.01, post));
}
// The wiper on the front panes: pivot, arm angle from vertical, length.
vec2 pivotOf(float x) { return x < 0.39 ? vec2(-0.12, YB - 0.02) : vec2(0.88, YB - 0.02); }
`;

/* ---------- drops on the glass: lens offsets at half size ---------- */
const DROPS = `${PIT}
${GLASS_RAIN}
uniform float uWet, uFlow, uDryT;
uniform vec4 uWipe;
// Seconds since the blade last swept angle psi.
float sinceWipe(float psi) {
  float q = (psi - uWipe.z) / uWipe.w;
  if (abs(q) > 1.0) return 99.0;
  float b1 = asin(q), b2 = 3.14159 - b1, P = uWipe.x;
  float l1 = b1 + 6.28318 * floor((P - b1) / 6.28318);
  float l2 = b2 + 6.28318 * floor((P - b2) / 6.28318);
  return (P - max(l1, l2)) / uWipe.y + uDryT;
}
void main() {
  vec3 d = pitRay(vUv);
  vec2 q; float t;
  int g = glassHit(d, q, t);
  o = vec4(0.0);
  if (g == 0 || uWet <= 0.001) return;
  float wet = uWet;
  float age = 99.0;
  if (g == 1) {
    vec2 pv = pivotOf(q.x), rq = q - pv;
    float len = length(rq);
    if (len < 0.53 && len > 0.06) age = sinceWipe(atan(rq.x, rq.y));
  }
  // New drops land as the blade passes: the swept arc fills again.
  float fill = clamp(age / 0.9, 0.0, 1.0);
  vec2 off = vec2(0.0);
  float rim = 0.0, spec = 0.0, cover = 0.0, clear = 0.0;
  vec3 L = normalize(vec3(0.3, 0.7, 0.6));
  vec2 m = g == 1 ? vec2(0.12, 1.0) : vec2(g == 2 ? 1.0 : -1.0, 0.2);
  grBeads(q * 0.7 + float(g) * 3.1, wet, 0.6, fill, L, off, rim, spec, cover);
  grRuns(q + float(g) * 1.7, normalize(m), uFlow, wet * min(fill * 1.5, 1.0), 2.5, 0.0, L, off, rim, spec, cover, clear);
  // A sheet of water wobbles the whole view in heavy rain.
  float sheet = wet * fill * 0.004 * (grN(q * 9.0 + vec2(0.0, -uFlow * 3.0)) - 0.5);
  off += vec2(sheet, sheet * 0.7);
  o = vec4(off / (t * 2.0 * uLens.y), rim, spec);
}`;

/* ---------- cockpit: the frame, the glareshield, the glass over the world ---------- */
const COCKPIT = `${PIT}
uniform sampler2D uWorld, uDrops;
uniform vec3 uCabin, uSunL;
uniform vec4 uWipeNow;
uniform float uAsp;
// Is the sun's ray from a point inside the cockpit let in by the glass?
float sunIn(vec3 p) {
  vec3 l = uSunA;
  if (l.y < -0.05) return 0.0;
  float den = l.z - RAKE * l.y;
  if (den < -1e-4) {
    float s = (Z0 + RAKE * p.y - p.z) / den;
    vec3 h = p + l * s;
    if (s > 0.0 && h.y > YB && h.y < YT && h.x > SIDE && h.x < RSIDE) return 1.0;
  }
  if (l.x < -1e-4) {
    vec3 h = p + l * ((SIDE - p.x) / l.x);
    if (h.y > YB && h.y < YT && h.z < 0.05) return 1.0;
  }
  if (l.x > 1e-4) {
    vec3 h = p + l * ((RSIDE - p.x) / l.x);
    if (h.y > YB && h.y < YT && h.z < 0.05) return 1.0;
  }
  return 0.0;
}
// A matte surface lit by the window light and any sun that gets in.
vec3 matte(vec3 p, vec3 n, float alb) {
  float face = 0.35 + 0.65 * max(dot(n, normalize(vec3(0.0, 0.3, -1.0))), 0.0);
  vec3 E = uCabin * face + uSunL * max(dot(n, uSunA), 0.0) * sunIn(p + n * 0.01);
  return E * alb;
}
// The inside of the cockpit where no glass is: shield, panel, roof, walls.
vec3 inside(vec3 d) {
  float t = 1e9; vec3 n = vec3(0.0, 1.0, 0.0); float alb = 0.05; int id = 0;
  if (d.y < -1e-4) {
    float s = YB / d.y; vec3 h = d * s;
    if (h.z < -0.5 && s < t) { t = s; n = vec3(0.0, 1.0, 0.0); alb = 0.02; id = 1; }
  }
  if (d.z < -1e-4) {
    float s = -0.5 / d.z; vec3 h = d * s;
    if (h.y < YB && s < t) { t = s; n = vec3(0.0, 0.0, 1.0); alb = 0.035; id = 2; }
  }
  if (d.y > 1e-4) { float s = 0.37 / d.y; if (s < t) { t = s; n = vec3(0.0, -1.0, 0.0); alb = 0.09; id = 3; } }
  if (d.x < -1e-4) { float s = (SIDE - 0.02) / d.x; if (s < t) { t = s; n = vec3(1.0, 0.0, 0.0); alb = 0.06; id = 4; } }
  if (d.x > 1e-4) { float s = (RSIDE + 0.02) / d.x; if (s < t) { t = s; n = vec3(-1.0, 0.0, 0.0); alb = 0.06; id = 4; } }
  if (d.z > 1e-4) { float s = 0.6 / d.z; if (s < t) { t = s; n = vec3(0.0, 0.0, -1.0); alb = 0.04; id = 4; } }
  vec3 p = d * t;
  vec3 c = matte(p, n, alb);
  if (id == 2) {
    // Dim screens in the panel: plain glowing panes, no symbols.
    vec2 g = vec2(p.x, p.y);
    // Four screens across the panel, at the pilots' knees.
    vec2 cell = vec2(fract((g.x + 0.5) / 0.46), (g.y + 0.5) / 0.22);
    float scr = step(0.1, cell.x) * step(cell.x, 0.9) * step(0.1, cell.y) * step(cell.y, 0.9) * step(-0.5, g.x) * step(g.x, 1.34);
    c += vec3(0.012, 0.03, 0.04) * scr;
  }
  if (id == 1) {
    // The shield's edge catches the window light.
    c += uCabin * 0.05 * smoothstep(-0.62, -0.55, p.z);
  }
  return c;
}
void main() {
  vec3 d = pitRay(vUv);
  vec2 q; float t;
  int g = glassHit(d, q, t);
  vec3 c;
  if (g == 0) { o = vec4(inside(d), 1.0); return; }
  vec3 p = d * t;
  // The frame round the glass: painted metal, lit as the inside is.
  float fr = frameOn(g, q);
  vec4 dr = texture(uDrops, vUv);
  vec2 uv = vUv + vec2(dr.x / uAsp, dr.y);
  vec3 out1 = texture(uWorld, clamp(uv, 0.001, 0.999)).rgb;
  // A drop's rim reads dark; its cap catches the window light.
  c = out1 * (1.0 - 0.8 * dr.z) * vec3(0.93, 0.97, 0.95) + (uCabin * 1.6 + uSunL * 0.15) * dr.w * 0.6;
  // A faint veil: light scattered by the glass and its film of water.
  c += uCabin * 0.015;
  if (g == 1) {
    // The wiper arm and blade, smeared over the angle it swept this frame.
    vec2 pv = pivotOf(q.x), rq = q - pv;
    float len = length(rq), ang = atan(rq.x, rq.y);
    float a0 = min(uWipeNow.x, uWipeNow.y), a1 = max(uWipeNow.x, uWipeNow.y);
    float da = max(a0 - ang, ang - a1);
    float arc = max(da, 0.0) * len;
    float wide = max((a1 - a0) * len, 0.006);
    // The arm tapers from the pivot; the blade is a thin strip on its outer part.
    float half_ = mix(0.009, 0.005, len / 0.52);
    float blade = (1.0 - smoothstep(half_, half_ + 0.003, arc)) * step(0.05, len) * step(len, 0.52) * min(1.0, 0.01 / wide);
    c = mix(c, matte(p, vec3(0.0, 0.0, 1.0), 0.03), blade);
  }
  vec3 nrm = g == 1 ? normalize(vec3(0.0, -RAKE, 1.0)) : vec3(g == 2 ? 1.0 : -1.0, 0.0, 0.0);
  c = mix(c, matte(p, nrm, 0.07), fr);
  o = vec4(c, 1.0);
}`;

/* ---------- grade: bloom, tone, vignette, grain, the fade ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK, uExposure, uFade, uFlashK;
uniform vec2 uRes;
${GRADE}
${OUTPUT}
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c += vec3(0.7, 0.78, 1.0) * uFlashK * 0.25;
  c = mix(c, vec3(0.05, 0.055, 0.06), uFade);
  c = ouAcesFit(c * uExposure / 0.6);
  c *= gdVignette(vUv, uRes.x / uRes.y, 0.4, 0.4);
  o = vec4(ouDither(ouSrgb(c), gl_FragCoord.xy + uFrame * 7.0), 1.0);
}`;

// noise: the baked volume from noise.js, shared with the CPU copy of the wall.
export async function makeScene(gl, noiseData) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const t0 = performance.now();
  const P = await linked(gl, {
    march: program(gl, TRI_VS, MARCH),
    blur: program(gl, TRI_VS, BLUR),
    scene: program(gl, TRI_VS, SCENE),
    drops: program(gl, TRI_VS, DROPS),
    pit: program(gl, TRI_VS, COCKPIT),
    final: program(gl, TRI_VS, FINAL),
  });
  const linkMs = performance.now() - t0;
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  const N = Math.round(Math.cbrt(noiseData.length / 4));
  const noise = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, noise);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseData);
  for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, k, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_3D, null);

  let cloudA = null, cloudB = null, world = null, drops = null, hdr = null;
  let W = 0, H = 0, CW = 0, CH = 0, DW = 0, DH = 0;
  function resize(w, h, cloudDiv = 2) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    CW = Math.max(2, Math.ceil(W / cloudDiv)); CH = Math.max(2, Math.ceil(H / cloudDiv));
    DW = Math.max(2, Math.ceil(W / 2)); DH = Math.max(2, Math.ceil(H / 2));
    [cloudA, cloudB, world, drops, hdr].forEach(t => free(gl, t));
    cloudA = target(gl, CW, CH, { check: true });
    cloudB = target(gl, CW, CH);
    world = target(gl, W, H);
    drops = target(gl, DW, DH);
    hdr = target(gl, W, H);
  }

  function worldU(p, v) {
    gl.uniform3fv(p.u.uCamPos, v.camPos);
    gl.uniformMatrix3fv(p.u.uCamRot, false, v.camRot);
    gl.uniform3fv(p.u.uLens, v.lens);
    gl.uniform4fv(p.u.uShape, v.shape);
    gl.uniform3fv(p.u.uSun, v.sun);
    gl.uniform1f(p.u.uT, v.t);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(p.u.uNoise, 0);
  }
  function pitU(p, v) {
    gl.uniformMatrix3fv(p.u.uHeadRot, false, v.headRot);
    gl.uniform3fv(p.u.uLens, v.lens);
    gl.uniform3fv(p.u.uSunA, v.sunA);
    gl.uniform2fv(p.u.uShake, v.shake);
  }

  // v: the view and the weather. Draws one frame to the screen.
  function frame(v, { frameNo = 0, steps = 110, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    const m = P.march;
    gl.useProgram(m.p);
    worldU(m, v);
    gl.uniform1i(m.u.uSteps, steps);
    gl.uniform1f(m.u.uFrame, frameNo % 64);
    gl.uniform4fv(m.u.uFlash, v.flash);
    tri(gl, cloudA, empty);
    const bl = P.blur;
    gl.useProgram(bl.p);
    bind(gl, bl, 'uSrc', 0, cloudA);
    gl.uniform2f(bl.u.uStep, 1, 0);
    tri(gl, cloudB, empty);
    bind(gl, bl, 'uSrc', 0, cloudB);
    gl.uniform2f(bl.u.uStep, 0, 1);
    tri(gl, cloudA, empty);

    const s = P.scene;
    gl.useProgram(s.p);
    worldU(s, v);
    bind(gl, s, 'uCloud', 1, cloudA);
    gl.uniform1f(s.u.uTime, v.time);
    gl.uniform1f(s.u.uRain, v.rain);
    gl.uniform1f(s.u.uWind, v.wind);
    gl.uniform1f(s.u.uPix, 2 * v.lens[1] / H);
    gl.uniform1f(s.u.uFlashK, v.flashK);
    gl.uniform2fv(s.u.uFoe, v.foe);
    gl.uniform2f(s.u.uAsp, W / H, 1);
    tri(gl, world, empty);

    const d = P.drops;
    gl.useProgram(d.p);
    pitU(d, v);
    gl.uniform1f(d.u.uWet, v.wet);
    gl.uniform1f(d.u.uFlow, v.flow);
    gl.uniform1f(d.u.uDryT, v.dryT);
    gl.uniform4fv(d.u.uWipe, v.wipe);
    tri(gl, drops, empty);

    const c = P.pit;
    gl.useProgram(c.p);
    pitU(c, v);
    bind(gl, c, 'uWorld', 0, world);
    bind(gl, c, 'uDrops', 1, drops);
    gl.uniform3fv(c.u.uCabin, v.cabin);
    gl.uniform3fv(c.u.uSunL, v.sunL);
    gl.uniform4fv(c.u.uWipeNow, v.wipeNow);
    gl.uniform1f(c.u.uAsp, W / H);
    tri(gl, hdr, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.2, cap: 8, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.22);
    gl.uniform1f(f.u.uExposure, v.exposure);
    gl.uniform1f(f.u.uFade, v.fade);
    gl.uniform1f(f.u.uFlashK, v.flashK);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    gl.uniform2f(f.u.uRes, W, H);
    tri(gl, null, empty);
  }

  return { resize, frame, linkMs };
}
