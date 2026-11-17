// Tornado alley: vehicles on the road, as a scene.
// A pickup flees the storm toward the eye and races past; then two storm chasers rush in from behind.
// The CPU part runs the scene's timing; the GLSL part ray-traces each vehicle as lit boxes and wheels.

/* ---------- the scene ---------- */
// The road's centre, as main.js ROAD_X; lanes are 3.7 m wide, traffic keeps right.
const ROAD_X = 3.4, LANE = 1.85;
export const MAX_VEH = 3;
// Vehicle kinds: a pickup, a wagon with roof gear, a van with an instrument rack.
const PICKUP = 0, WAGON = 1, VAN = 2;

export function trafficState() {
  return { veh: [], auto: false, autoAt: -1, u: new Float32Array(MAX_VEH * 4), uB: new Float32Array(MAX_VEH * 4) };
}
// Starts the scene at simT: the pickup first, the chasers when it has passed the eye.
export function trafficRun(T, simT) {
  T.veh.length = 0;
  // The pickup: 1.1 km out on the eye's lane, heading for the eye at 34 m/s.
  const vp = 34, z0 = -1100;
  T.veh.push({ kind: PICKUP, x: ROAD_X - LANE, z0, dir: 1, v: vp, t0: simT, seed: Math.random() });
  // The chasers: 3 s after the pickup passes, from behind the eye, close together at 31 m/s.
  const tc = simT - z0 / vp + 3;
  T.veh.push({ kind: WAGON, x: ROAD_X + LANE, z0: 70, dir: -1, v: 31, t0: tc, seed: Math.random() });
  T.veh.push({ kind: VAN, x: ROAD_X + LANE, z0: 92, dir: -1, v: 31, t0: tc, seed: Math.random() });
}
// One step: the scene runs once by itself, 8 s after the first tornado's dust is up.
export function trafficStep(T, tors, simT) {
  if (!T.auto && T.autoAt < 0 && tors.some(t => t.dust > 0.9)) T.autoAt = simT + 8;
  if (!T.auto && T.autoAt >= 0 && simT >= T.autoAt) { T.auto = true; trafficRun(T, simT); }
  // A vehicle leaves once it is past the eye or lost in the haze.
  T.veh = T.veh.filter(v => { const z = v.z0 + v.dir * v.v * Math.max(simT - v.t0, 0); return v.dir > 0 ? z < 80 : z > -7000; });
}
// True while any vehicle still drives: the page keeps its loop.
export const trafficBusy = T => T.veh.length > 0;
// Packs each vehicle for the scene pass: x, z, signed speed, kind; then alive, seed, age.
export function trafficUniforms(T, simT) {
  T.u.fill(0); T.uB.fill(0);
  T.veh.slice(0, MAX_VEH).forEach((v, i) => {
    const age = simT - v.t0;
    const z = v.z0 + v.dir * v.v * Math.max(age, 0);
    T.u.set([v.x, z, v.dir * v.v, v.kind], i * 4);
    T.uB.set([age >= 0 ? 1 : 0, v.seed, Math.max(age, 0), 0], i * 4);
  });
}

/* ---------- GLSL ---------- */
// It reads main.js's CAMH, uFoc, toWorld(), proj(), depthOf(), sunCover(), hazed(), th(), vn(),
// line.js's put(), lineEnv() and ggx(), and road.js's envBRDF().
export const TRAFFIC_GLSL = /* glsl */`
/* ---------- vehicles ---------- */
// Each vehicle: x, z in world metres, signed speed (+ toward the eye), kind; then alive, seed, age.
uniform vec4 uVeh[${MAX_VEH}], uVehB[${MAX_VEH}];
// The lamps' glow, added after the storm pass's picture.
vec3 gVehGlow = vec3(0.0);
// A ray against a box: the near hit's distance and normal.
bool vBox(vec3 ro, vec3 rd, vec3 lo, vec3 hi, inout float t, inout vec3 n, inout int id, int myId) {
  vec3 inv = 1.0 / rd, a = (lo - ro) * inv, b = (hi - ro) * inv;
  vec3 mn = min(a, b), mx = max(a, b);
  float tn = max(max(mn.x, mn.y), mn.z), tf = min(min(mx.x, mx.y), mx.z);
  if (tf < max(tn, 0.0) || tn >= t || tn < 0.0) return false;
  t = tn; id = myId;
  n = tn == mn.x ? vec3(-sign(rd.x), 0.0, 0.0) : tn == mn.y ? vec3(0.0, -sign(rd.y), 0.0) : vec3(0.0, 0.0, -sign(rd.z));
  return true;
}
// A ray against a wheel: a cylinder across the vehicle, at height and place c (y, z), radius r, half width w at x.
bool vWheel(vec3 ro, vec3 rd, vec2 c, float r, float x, float w, inout float t, inout vec3 n, inout int id) {
  vec2 o = ro.yz - c, d = rd.yz;
  float A = dot(d, d), B = dot(o, d), C = dot(o, o) - r * r, D = B * B - A * C;
  if (D < 0.0 || A < 1e-8) return false;
  float tn = (-B - sqrt(D)) / A;
  if (tn < 0.0 || tn >= t) return false;
  float hx = ro.x + rd.x * tn;
  if (abs(hx - x) > w) {
    // The tyre's side face: a disc at x +- w.
    float tx = (x - sign(rd.x) * w - ro.x) / rd.x;
    vec2 q = ro.yz + rd.yz * tx - c;
    if (tx < 0.0 || tx >= t || dot(q, q) > r * r) return false;
    t = tx; n = vec3(-sign(rd.x), 0.0, 0.0); id = 9; return true;
  }
  t = tn; n = vec3(0.0, normalize(o + d * tn)); id = 9;
  return true;
}
// The vehicle's parts, in its own frame: x across (right), y up, z forward. Returns the hit part's id.
// ids: 1 body paint, 2 cabin (glass above the belt line), 3 roof gear, 4 amber bar, 9 tyre.
int vHit(int kind, vec3 ro, vec3 rd, out float t, out vec3 n) {
  t = 1e9; n = vec3(0.0, 1.0, 0.0);
  int id = 0;
  if (kind == 0) {
    vBox(ro, rd, vec3(-1.0, 0.45, -2.8), vec3(1.0, 1.05, 2.8), t, n, id, 1);
    vBox(ro, rd, vec3(-0.95, 1.05, -0.4), vec3(0.95, 1.85, 1.15), t, n, id, 2);
    // The bed's tailgate and sides stand a little proud of the body.
    vBox(ro, rd, vec3(-1.0, 1.05, -2.8), vec3(1.0, 1.25, -0.45), t, n, id, 1);
  } else if (kind == 1) {
    vBox(ro, rd, vec3(-0.95, 0.45, -2.45), vec3(0.95, 1.05, 2.45), t, n, id, 1);
    vBox(ro, rd, vec3(-0.88, 1.05, -2.25), vec3(0.88, 1.7, 1.0), t, n, id, 2);
    vBox(ro, rd, vec3(-0.7, 1.7, -1.9), vec3(0.7, 1.84, 0.5), t, n, id, 3);
    vBox(ro, rd, vec3(-0.03, 1.84, -1.75), vec3(0.03, 2.7, -1.69), t, n, id, 3);
    vBox(ro, rd, vec3(-0.18, 2.62, -1.82), vec3(0.18, 2.7, -1.62), t, n, id, 3);
    vBox(ro, rd, vec3(-0.6, 1.84, 0.35), vec3(0.6, 1.95, 0.55), t, n, id, 4);
  } else {
    vBox(ro, rd, vec3(-1.0, 0.4, -2.75), vec3(1.0, 2.2, 1.9), t, n, id, 2);
    vBox(ro, rd, vec3(-0.95, 0.4, 1.9), vec3(0.95, 1.15, 2.75), t, n, id, 1);
    vBox(ro, rd, vec3(-0.85, 2.2, -2.3), vec3(0.85, 2.36, 1.2), t, n, id, 3);
    vBox(ro, rd, vec3(-0.04, 2.36, -1.6), vec3(0.04, 3.3, -1.52), t, n, id, 3);
    vBox(ro, rd, vec3(-0.35, 3.25, -1.62), vec3(0.35, 3.3, -1.5), t, n, id, 3);
    vBox(ro, rd, vec3(0.3, 2.36, -0.6), vec3(0.7, 2.6, 0.2), t, n, id, 3);
    vBox(ro, rd, vec3(-0.65, 2.36, 1.0), vec3(0.65, 2.47, 1.18), t, n, id, 4);
  }
  float L = kind == 0 ? 5.6 : kind == 1 ? 4.9 : 5.5, W = kind == 2 ? 2.0 : kind == 0 ? 2.0 : 1.9, r = kind == 0 ? 0.42 : 0.38;
  for (int k = 0; k < 4; k++) {
    float wz = (k < 2 ? 1.0 : -1.0) * (L * 0.5 - 0.95), wx = (k % 2 == 0 ? 1.0 : -1.0) * (W * 0.5 - 0.1);
    vWheel(ro, rd, vec2(r, wz), r, wx, 0.14, t, n, id);
  }
  return t < 1e8 ? id : 0;
}
// The colour of a hit, in world space. N is the world normal; y the local height of the hit.
vec3 vShade(int id, int kind, vec3 P, vec3 N, vec3 V, float y, float seed) {
  float sun = 1.0 - sunCover(P * 0.001);
  vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), H = normalize(L + V);
  float nl = max(dot(N, L), 0.0), nv = max(dot(N, V), 0.05);
  // Paint: a faded white pickup, a dark green wagon, a white van; clear-coated, so it holds the sky.
  vec3 paint = kind == 0 ? vec3(0.55, 0.54, 0.5) : kind == 1 ? vec3(0.06, 0.1, 0.08) : vec3(0.62, 0.62, 0.6);
  float rough = 0.3, f0 = 0.04;
  vec3 alb = paint;
  bool glass = id == 2 && y > (kind == 2 ? 1.3 : 1.25) && abs(N.y) < 0.5;
  if (glass) { alb = vec3(0.015); rough = 0.05; }
  if (id == 2 && !glass) alb = paint;
  if (id == 3) { alb = vec3(0.05); rough = 0.5; }
  if (id == 9) { alb = vec3(0.025); rough = 0.85; }
  // The lower body takes road grime.
  if (id == 1 || id == 2) alb = mix(alb, vec3(0.14, 0.11, 0.08), smoothstep(0.8, 0.45, y) * 0.6);
  vec2 ab = envBRDF(rough, nv);
  vec3 c = alb * (uSunCol * 0.9 * sun * nl + uAmb * (0.45 + 0.25 * N.y));
  c += lineEnv(reflect(-V, N)) * (f0 * ab.x + ab.y) * (glass ? 0.8 : 1.0);
  c += uSunCol * sun * ggx(max(dot(N, H), 0.0), rough) * nl * 0.05;
  return c;
}
// A lamp's glow: a point of light at P facing along dir, of colour col.
void vLamp(vec2 s, vec3 P, vec3 dir, vec3 col, float px) {
  float z = depthOf(P);
  if (z < 0.5) return;
  vec3 toEye = normalize(vec3(0.0, CAMH, 0.0) - P);
  float face = pow(max(dot(dir, toEye), 0.0), 3.0);
  if (face <= 0.0) return;
  // A hot core as wide as the lamp, and a bloom a few pixels round it: the lens's, not the air's.
  float d = length(s - proj(P)), dp = d / px;
  float core = exp(-pow(d / (px * 0.9 + 0.09 / z * uFoc), 2.0));
  gVehGlow += col * face * (core * 5.0 + 0.5 * exp(-dp / 5.0) + 0.05 * exp(-dp / 30.0));
}
// One vehicle, ray-traced at three moments in the shutter, each at its own spot in the pixel:
// its motion blurs by its speed, and its edges are smooth.
// near picks the pass: far vehicles draw before the line, near ones after it.
void vehicle(int i, vec2 s, vec3 rd, float px, bool near) {
  vec4 a = uVeh[i], b = uVehB[i];
  if (b.x <= 0.0) return;
  int kind = int(a.w + 0.5);
  float dir = sign(a.z), spd = abs(a.z), age = b.z, seed = b.y;
  vec3 C = vec3(a.x, 0.0, a.y);
  float z = depthOf(C + vec3(0.0, 1.0, 0.0));
  if (z < 0.3) return;
  vec3 f = vec3(0.0, 0.0, dir), rt = vec3(-dir, 0.0, 0.0);
  // The lamps: headlights ahead, tail lights behind; the chasers' amber bar too.
  // Their glow reaches past the vehicle's screen box, so they come first, once per frame.
  if (!near) {
    float L2 = kind == 0 ? 2.8 : kind == 1 ? 2.45 : 2.75, hy = kind == 2 ? 0.95 : 0.85;
    for (int k = 0; k < 2; k++) {
      float sx = k == 0 ? -0.72 : 0.72;
      vLamp(s, C + rt * sx + vec3(0.0, hy, 0.0) + f * L2, f, vec3(1.0, 0.9, 0.75), px);
      vLamp(s, C + rt * sx + vec3(0.0, hy + 0.1, 0.0) - f * L2, -f, vec3(0.9, 0.06, 0.03) * 0.5, px);
      if (kind != 0) {
        // The amber bar flashes left and right in turn.
        float on = step(0.5, fract(uT * 1.6 + (sx > 0.0 ? 0.5 : 0.0)));
        vec3 Pb = C + rt * sx * 0.62 + vec3(0.0, kind == 1 ? 1.9 : 2.42, 0.0) + f * (kind == 1 ? 0.45 : 1.09);
        vLamp(s, Pb, normalize(vec3(0.0, 0.2, 0.0) - f), vec3(1.0, 0.45, 0.05) * on * 0.8, px);
        vLamp(s, Pb, normalize(vec3(0.0, 0.2, 0.0) + f), vec3(1.0, 0.45, 0.05) * on * 0.8, px);
      }
    }
  }
  if ((z > 60.0) == near) return;
  // The screen box: nothing to do outside it.
  vec2 c0 = proj(C + vec3(0.0, 1.2, 0.0));
  float R = (4.0 + spd * 0.02) / z * uFoc;
  if (z > 2.0 && (abs(s.x - c0.x) > R || abs(s.y - c0.y) > R)) return;
  vec3 eye = vec3(0.0, CAMH, 0.0);
  // The body rolls and pitches a little on its springs.
  float roll = 0.012 * sin(age * 2.3 + seed * 6.0) + 0.006 * sin(age * 5.1), pitch = 0.006 * sin(age * 3.1 + seed * 3.0);
  // A short contact shadow under the vehicle, on the road.
  {
    float tg = CAMH / max(-rd.y, 1e-4);
    vec3 G = eye + rd * tg - C;
    vec2 q = vec2(dot(G, rt), dot(G, f)) / vec2(kind == 1 ? 1.15 : 1.25, kind == 1 ? 2.65 : 3.0);
    float k = (1.0 - smoothstep(0.55, 1.0, length(q))) * 0.55;
    if (rd.y < 0.0 && k > 0.0) put(vec3(0.004), k, depthOf(C));
  }
  // The dust and spray it throws: puffs that grow and thin behind it.
  for (int k = 0; k < 8; k++) {
    float fk = float(k), back = (kind == 0 ? 3.2 : 2.8) + fk * (2.0 + spd * 0.06);
    vec3 Pp = C - f * back + vec3(0.0, 0.45 + 0.22 * fk, 0.0) + vec3(WDIR.x, 0.0, WDIR.y) * fk * 0.5;
    float zp = depthOf(Pp);
    if (zp < 0.5) continue;
    float rp = (0.7 + 0.42 * fk) / zp * uFoc;
    vec2 q = (s - proj(Pp)) / rp;
    float d = length(q);
    if (d > 1.0) continue;
    float n = vn(q * 2.3 + vec2(fk * 3.1 + age * 0.7, seed * 9.0));
    float al = (kind == 0 ? 0.32 : 0.18) * (1.0 - fk / 8.0) * smoothstep(1.0, 0.25, d) * (0.55 + 0.6 * n) * smoothstep(0.0, 6.0, spd);
    vec3 dust = mix(vec3(0.3, 0.25, 0.19), vec3(0.4), 0.3) * (uSunCol * 0.4 * (1.0 - sunCover(Pp * 0.001)) + uAmb * 0.6);
    put(hazed(dust, rd, zp), al, zp);
  }
  // Three shutter samples, each a different moment and a different spot in the pixel.
  float jit = th(gl_FragCoord.xy + fract(uT * 3.7) * 61.0);
  vec3 acc = vec3(0.0);
  float cov = 0.0, zHit = z;
  for (int k = 0; k < 3; k++) {
    float fk = (float(k) + jit) / 3.0;
    vec2 so = s + (vec2(fract(fk * 1.618 + 0.3), fract(fk * 2.414 + 0.7)) - 0.5) * px;
    vec3 rw = toWorld(normalize(vec3(so, -uFoc)));
    // The shutter is open 1/40 s: the vehicle moves within it.
    vec3 Ck = C + f * spd * (fk - 0.5) / 40.0;
    vec3 o = eye - Ck;
    // Into the vehicle's frame, with its roll about f and its pitch about rt.
    vec3 lo = vec3(dot(o, rt), o.y, dot(o, f)), ld = vec3(dot(rw, rt), rw.y, dot(rw, f));
    lo.xy = mat2(cos(roll), sin(roll), -sin(roll), cos(roll)) * (lo.xy - vec2(0.0, 0.8)) + vec2(0.0, 0.8);
    ld.xy = mat2(cos(roll), sin(roll), -sin(roll), cos(roll)) * ld.xy;
    lo.yz = mat2(cos(pitch), sin(pitch), -sin(pitch), cos(pitch)) * (lo.yz - vec2(0.8, 0.0)) + vec2(0.8, 0.0);
    ld.yz = mat2(cos(pitch), sin(pitch), -sin(pitch), cos(pitch)) * ld.yz;
    float t;
    vec3 n;
    int id = vHit(kind, lo, ld, t, n);
    if (id == 0) continue;
    vec3 hl = lo + ld * t;
    vec3 N = normalize(rt * n.x + vec3(0.0, n.y, 0.0) + f * n.z);
    vec3 P = Ck + rt * hl.x + vec3(0.0, hl.y, 0.0) + f * hl.z;
    vec3 col = vShade(id, kind, P, N, -rw, hl.y, seed);
    // The amber bar flashes, left and right in turn.
    if (id == 4) col = vec3(1.0, 0.45, 0.05) * (0.2 + 7.0 * step(0.5, fract(uT * 1.6 + (hl.x > 0.0 ? 0.5 : 0.0))));
    acc += col;
    cov += 1.0;
    zHit = depthOf(P);
  }
  if (cov > 0.0) put(hazed(acc / cov, rd, zHit), cov / 3.0, zHit);
}
// Every vehicle in one pass: far ones before the line, near ones after it.
void traffic(vec2 s, vec3 rd, float px, bool near) {
  for (int i = 0; i < ${MAX_VEH}; i++) vehicle(i, s, rd, px, near);
}
`;
