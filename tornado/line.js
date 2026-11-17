// Tornado alley: the power line along the road, and what a tornado does to it.
// The CPU part keeps each pole's lean, each span's break and the spark events.
// The GLSL part draws the poles, the wires and the sparks into the scene pass.
import { at, KNOB } from './funnel.js';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/* ---------- the line ---------- */
// The poles stand 9 m right of the road's centre, 55 m apart, the first in view 30 m out.
// Two more stand behind the eye, so the near span runs past the camera, overhead and out of frame.
// main.js ROAD_X is 3.4 m; the GLSL takes the same numbers.
export const POLE_X = 3.4 + 9.0, POLE_Z0 = -80, POLE_GAP = 55, POLES = 52;
// The wires' rest height at the cross-arm, in metres.
const WIRE_Y = 9.2;
// Gravity, m/s².
const G = 9.8;
// Spark events at once: the GLSL holds four.
export const MAX_ARCS = 4;
// The cascade's time from one pole to the next, in seconds.
const CASC_STEP = 0.11;

/* ---------- state ---------- */
export function lineState() {
  const L = {
    // Each pole's lean in radians: positive leans toward +x, across the road.
    lean: new Float32Array(POLES), vel: new Float32Array(POLES), down: new Uint8Array(POLES),
    // Each span: break time (-1e4 when whole), wire mask, break place, its end's landing time.
    span: new Float32Array(POLES * 4).fill(0),
    // The spark events: place, start time, strength, seed, kind.
    arcs: [],
    // Faults the line can still take: the recloser opens after a few, then the line is dead.
    charge: 4,
    // The next fault may come no sooner than this time.
    quiet: 0,
    // The cascade: from the first fault, each pole toward the eye shorts in turn.
    casc: { i0: -1, t0: -1e4, k: 0 },
    // The wires' two swing phases: the wind's slow swing, and a near tornado's faster one.
    // They sum here, so a change of speed never jumps the phase.
    ph: [0, 0],
    // The packed uniforms.
    uPole: new Float32Array(POLES), uSpan: new Float32Array(POLES * 4),
    uArc: new Float32Array(MAX_ARCS * 4), uArcK: new Float32Array(MAX_ARCS * 4),
    uFoot: new Float32Array(16), uCasc: new Float32Array(4), uSwayPh: new Float32Array(2),
  };
  lineReset(L);
  return L;
}
// Mends the line: every pole stands, every wire is whole, the line is live.
export function lineReset(L) {
  L.lean.fill(0); L.vel.fill(0); L.down.fill(0); L.arcs.length = 0; L.charge = 4; L.quiet = 0;
  L.casc.i0 = -1; L.casc.t0 = -1e4;
  for (let i = 0; i < POLES; i++) L.span[i * 4] = -1e4;
}

/* ---------- the tornado's wind ---------- */
// The wind speed, m/s, at distance d from a tornado's axis: a Rankine vortex.
function windAt(t, d) {
  const r = Math.max(8, at('r0', t.f) * KNOB.width), v = at('vmax', t.f) * (1 - clamp(t.rope)) * clamp(t.dust * 1.5);
  // Past the core the wind falls as 1/d, and dies out past the dust.
  const R = dustR(t), edge = clamp((1.6 * R - d) / (0.6 * R));
  return (d < r ? v * d / r : v * r / d) * edge;
}
// The dust's ground radius, m: funnel.js debrisR() at the ground.
const dustR = t => { const r0 = at('r0', t.f) * KNOB.width; return r0 * (2.2 + (1.18 - 2.2) * t.f / 5) + 20; };

// A fault: an arc at a world point, with sparks. kind 0 is in the air, 1 on the ground.
function fault(L, simT, x, y, z, k, kind) {
  if (L.charge < 1 || simT < L.quiet) return;
  L.charge -= 1;
  L.quiet = simT + 0.6 + 1.4 * Math.random();
  L.arcs.push({ x, y, z, t0: simT, k: clamp(k, 0.25, 1), seed: Math.random() * 100, kind });
  if (L.arcs.length > MAX_ARCS) L.arcs.shift();
  // A fault in the air sends a short down the line toward the eye, one at a time.
  const i0 = Math.round((-z - POLE_Z0) / POLE_GAP);
  if (kind === 0 && i0 > 0 && simT - L.casc.t0 > CASC_STEP * (L.casc.i0 + 1) + 4) Object.assign(L.casc, { i0, t0: simT, k: clamp(k, 0.4, 1) });
}

// One step of the line: wind loads, leans, falls, breaks and faults.
export function lineStep(L, tors, dt, simT, wind = 0.85, storm = 0.85) {
  // The swing's speed follows the wind and the storm; a near strong tornado drives it harder.
  let nearF = 0;
  for (const t of tors) nearF = Math.max(nearF, t.f / 5 * clamp(1 - (Math.abs(t.x - POLE_X) - dustR(t)) / 1500) * clamp(t.dust * 2));
  L.ph[0] = (L.ph[0] + dt * (0.55 + 0.6 * wind * (0.5 + 0.5 * storm))) % 6283.2;
  L.ph[1] = (L.ph[1] + dt * (1.4 + 1.1 * nearF)) % 6283.2;
  // The recloser closes again slowly: one fault back every 20 s.
  L.charge = Math.min(4, L.charge + dt / 20);
  // Old events leave after their sparks cool.
  while (L.arcs.length && simT - L.arcs[0].t0 > 3.5) L.arcs.shift();
  for (let i = 0; i < POLES; i++) {
    const pz = -(POLE_Z0 + POLE_GAP * i);
    // The strongest wind at this pole, and its sign across the road.
    let v = 0, sx = 0, F = 0;
    for (const t of tors) {
      const dx = POLE_X - t.x, dz = pz - t.z, d = Math.hypot(dx, dz);
      const w = windAt(t, d);
      if (w > v) {
        // The vortex turns anticlockwise from above; its travel adds to the side it moves toward.
        v = w; F = t.f;
        sx = Math.sign(-dz / Math.max(d, 1) * w + 6) || 1;
      }
    }
    const span = i * 4;
    // Wind past 40 m/s leans a pole; past 58 m/s it goes over.
    if (!L.down[i]) {
      const want = clamp((v - 40) / 30) * 0.55 * sx;
      if (Math.abs(want) > Math.abs(L.lean[i])) L.lean[i] += (want - L.lean[i]) * (1 - Math.exp(-dt / 0.7));
      if (v > 58 && Math.abs(L.lean[i]) > 0.3) { L.down[i] = 1; L.vel[i] = 0.2 * Math.sign(L.lean[i]); }
    } else if (L.down[i] === 1) {
      // A falling pole topples about its foot: about 2 s from a lean to the ground.
      const s = Math.sign(L.lean[i]);
      L.vel[i] += s * 1.6 * Math.sin(Math.abs(L.lean[i])) * dt;
      L.lean[i] += L.vel[i] * dt;
      if (Math.abs(L.lean[i]) >= 1.47) {
        L.lean[i] = 1.47 * s; L.vel[i] = 0; L.down[i] = 2;
        // The wires short as the cross-arm hits the ground.
        fault(L, simT, POLE_X + 9 * s, 0.4, pz, F / 5, 1);
      }
    }
    // A span breaks where the wind is strong or a pole at its end leans hard.
    if (i < POLES - 1 && L.span[span] < -1e3) {
      const hard = Math.max(Math.abs(L.lean[i]), Math.abs(L.lean[i + 1]));
      if (hard > 0.3 || v > 52) {
        const mask = 1 + Math.floor(hash(i + simT) * 7);
        const u = 0.3 + 0.4 * hash(i * 7.3 + simT);
        L.span[span] = simT; L.span[span + 1] = mask; L.span[span + 2] = u; L.span[span + 3] = -1;
        fault(L, simT, POLE_X, WIRE_Y, pz - POLE_GAP * u, F / 5, 0);
      }
    }
    // A broken end lands about 1.4 s later and arcs on the ground once.
    if (L.span[span] > -1e3 && L.span[span + 3] < 0 && simT - L.span[span] > Math.sqrt(2 * WIRE_Y / G)) {
      L.span[span + 3] = simT;
      if (hash(i * 3.1) < 0.6) fault(L, simT, POLE_X, 0.3, pz - POLE_GAP * L.span[span + 2] * 0.6, F / 5 * 0.7, 1);
    }
  }
  // Dust at the wires makes them slap: an arc with no damage, now and then.
  for (const t of tors) {
    if (t.f < 0 || t.dust < 0.5 || t.rope > 1) continue;
    const near = Math.abs(t.x - POLE_X) - dustR(t);
    const along = -t.z - POLE_Z0;
    if (near > 0 || along < 0 || along > POLE_GAP * POLES) continue;
    if (Math.random() < dt * 0.5) {
      // The arc stands at the dust's edge, toward the eye.
      const r = dustR(t), dz = Math.sqrt(Math.max(r * r - (t.x - POLE_X) ** 2, 0));
      fault(L, simT, POLE_X, WIRE_Y, t.z + dz * 0.9, 0.3 + 0.7 * t.f / 5, 0);
    }
  }
}

// Packs the line's state and the tornadoes' feet for the scene pass.
export function lineUniforms(L, tors) {
  L.uPole.set(L.lean);
  L.uSpan.set(L.span);
  L.uArc.fill(0); L.uArcK.fill(0);
  L.arcs.forEach((a, i) => {
    L.uArc.set([a.x, a.y, a.z, a.t0], i * 4);
    L.uArcK.set([a.k, a.seed, a.kind, 1], i * 4);
  });
  L.uSwayPh.set(L.ph);
  L.uCasc.set([L.casc.i0, L.casc.t0, CASC_STEP, L.casc.k]);
  L.uFoot.fill(0);
  tors.slice(0, 4).forEach((t, i) => L.uFoot.set([t.x, t.z, dustR(t), 0.01 + t.f / 5 * (1 - clamp(t.rope - 1)) * clamp(t.dust * 2)], i * 4));
}

/* ---------- GLSL ---------- */
// The scene pass's line: it reads main.js's ROAD_X, proj(), depthOf(), hazed(), sunCover(), shadeK(), gust(), th() and segD().
export const LINE_GLSL = /* glsl */`
/* ---------- the power line ---------- */
uniform vec4 uPole[${POLES / 4}], uSpan[${POLES}], uArc[${MAX_ARCS}], uArcK[${MAX_ARCS}];
// Each tornado's foot in world metres, its dust radius, and F over 5 (0 when off).
uniform vec4 uFoot[4];
// The cascade: its first pole, start time, time per pole and strength.
uniform vec4 uCasc;
// The wires' swing phases, summed on the CPU: the wind's, and a near tornado's.
uniform vec2 uSwayPh;
const float POLE_X = ROAD_X + 9.0, POLE_Z0 = ${POLE_Z0}.0, POLE_GAP = ${POLE_GAP}.0;
const int POLES = ${POLES};
// No line stands true: each pole has its own small lean, about 2 degrees, and now and then 4.
float poleRest(int i) { float h = th(vec2(float(i), 11.3)); return (h - 0.5) * 0.07 * (th(vec2(float(i), 2.7)) > 0.83 ? 2.2 : 1.0); }
// Each pole's lean in radians: its own rest lean plus what the wind did to it.
float poleLean(int i) { return i < 0 || i >= POLES ? 0.0 : uPole[i >> 2][i & 3] + poleRest(i); }
// Each pole's tilt along the line, and its cross-arm's roll, in radians.
float poleTilt(int i) { return (th(vec2(float(i), 5.9)) - 0.5) * 0.06; }
float armRoll(int i) { return i < 0 || i >= POLES ? 0.0 : (th(vec2(float(i), 8.4)) - 0.5) * 0.07; }

/* ---------- objects and the funnels ---------- */
// Objects on the plain gather in two layers: behind a funnel, or in front of it.
// envScene lays gOB under the storm pass's picture and gOF over it.
vec4 gOB, gOF;
// Each funnel's cover on this pixel's column, and its depth.
float gFC[4], gFZ[4];
void objInit(vec2 s) {
  gOB = vec4(0.0); gOF = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    gFC[i] = 0.0; gFZ[i] = 1e9;
    vec4 f = uFoot[i];
    if (f.w <= 0.0) continue;
    vec3 P = vec3(f.x, 0.0, f.y);
    float z = depthOf(P);
    if (z < 50.0) continue;
    float hw = f.z * 1.25 / z * uFoc, cx = proj(P).x;
    gFC[i] = 1.0 - smoothstep(hw * 0.8, hw * 1.1, abs(s.x - cx));
    gFZ[i] = z;
  }
}
// How far behind a funnel a thing z metres off stands, 0 to 1.
float behindF(float z) {
  float w = 0.0;
  for (int i = 0; i < 4; i++) w = max(w, gFC[i] * smoothstep(gFZ[i] - 40.0, gFZ[i] + 40.0, z));
  return w;
}
// Lays a lit shape z metres off into its layer. k is coverage.
void put(vec3 col, float k, float z) {
  k = clamp(k, 0.0, 1.0);
  if (k <= 0.0) return;
  float b = behindF(z) * k, f = k - b;
  gOB = gOB * (1.0 - b) + vec4(col, 1.0) * b;
  gOF = gOF * (1.0 - f) + vec4(col, 1.0) * f;
}

/* ---------- the wires' sway ---------- */
// The sway's size at a world point, in metres, and how near a tornado is, 0 to 1.
// The wind and the storm give a slow swing; a near tornado makes it grow fast.
float swayAmp(vec2 xz, out float nearK) {
  float a = (0.03 + 0.45 * uWind * uWind) * (0.5 + 0.5 * uStorm) * (0.6 + 0.8 * gust(xz));
  nearK = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 f = uFoot[i];
    if (f.w <= 0.0) continue;
    // Its inflow reaches well past its dust: a kilometre or two for a big one.
    float d = max(length(xz - f.xy) - f.z, 0.0) / (300.0 + f.z);
    float k = f.w / (1.0 + d * d);
    nearK = max(nearK, k);
  }
  return a + 2.5 * nearK;
}
// One wire's offset from its rest line: across (x) and up (y), in metres.
// u runs 0 to 1 along span i; wire j is 0, 1 or 2.
// Two slow modes; their phases sum on the CPU, so a new speed never jumps.
vec2 swayAt(int i, int j, float u, float z) {
  float nearK;
  float a = swayAmp(vec2(POLE_X, z), nearK);
  float ph = th(vec2(float(i), float(j) * 0.37 + 2.1)) * 6.2832, ph2 = th(vec2(float(i) + 0.5, 7.7)) * 6.2832;
  float m1 = sin(3.14159 * u), m2 = sin(6.28318 * u);
  // A steady blow across the line, and the swing about it.
  float blow = 0.45 * WDIR.x * (0.3 + 0.7 * uWind);
  float p1 = uSwayPh.x, p2 = uSwayPh.y;
  float x = a * m1 * (blow + 0.55 * sin(p1 + ph)) + a * nearK * 0.5 * m2 * sin(p2 + ph2);
  float y = a * m1 * 0.35 * sin(p1 * 0.8 + ph2) + a * (0.12 + 0.4 * nearK) * m2 * sin(p2 * 0.85 + ph);
  return vec2(x, y);
}
// The wire's point at u along span i, as an offset in x and a height, in metres.
// It takes the poles' leans, the sag, the sway, and a broken half falling and whipping.
// A missing piece of wire returns a height below -50.
vec2 wireAt(int i, int j, float u, float z) {
  float ox = float(j - 1) * 1.1, wy = j == 1 ? 9.9 : 9.2;
  float la = poleLean(i), lb = poleLean(i + 1);
  // Each end hangs where its leaning pole holds it.
  // A rolled cross-arm lifts one outer wire and drops the other.
  vec2 A = vec2(ox * cos(la) + wy * sin(la) - ox, wy * cos(la) - ox * sin(la) + ox * armRoll(i));
  vec2 B = vec2(ox * cos(lb) + wy * sin(lb) - ox, wy * cos(lb) - ox * sin(lb) + ox * armRoll(i + 1));
  vec2 w = mix(A, B, u) - vec2(0.0, 0.8 * 4.0 * u * (1.0 - u)) + swayAt(i, j, u, z);
  vec4 sp = uSpan[i];
  float ts = uT - sp.x;
  if (sp.x < -1e3 || ts < 0.0 || mod(floor(sp.y / pow(2.0, float(j))), 2.0) < 0.5) return w;
  // A broken wire: each half hangs from its own pole.
  bool fromA = u < sp.z;
  float Lh = (fromA ? sp.z : 1.0 - sp.z) * POLE_GAP, s = (fromA ? u : 1.0 - u) * POLE_GAP;
  vec2 E = fromA ? A : B;
  // The free end falls freely until it lands; the wire keeps its length.
  float drop = min(4.9 * ts * ts, E.y);
  float reach = sqrt(max(Lh * Lh - drop * drop, 0.0));
  // Once down, the wire settles into a slope from the pole to the ground.
  float land = sqrt(2.0 * max(E.y, 0.1) / 9.8), settle = smoothstep(0.0, 1.6, ts - land);
  if (s > (ts > land ? Lh : reach)) return vec2(0.0, -99.0);
  float yFall = E.y - drop * clamp(s / max(reach, 0.5), 0.0, 1.0);
  float y = mix(yFall, max(E.y * (1.0 - s / (E.y * 1.3 + 2.0)), 0.0), settle);
  // A whip runs from the free end back toward the pole and dies away.
  float wk = exp(-ts / 1.4) * (s / Lh);
  float whip = sin(s * 0.35 - ts * 9.0) * wk;
  return vec2(E.x + whip * 1.6 + swayAt(i, j, u, z).x * 0.3, max(y + whip * 0.8, 0.0));
}
/* ---------- the line's materials ---------- */
// The sky and ground a shiny part reflects in direction R, in world space.
// Low down the bright horizon glows; higher up the deck's dark slate; below, the lit field.
vec3 lineEnv(vec3 R) {
  if (R.y >= 0.0) return mix(hazeCol(R) * 1.05, uAmb * 0.07, smoothstep(0.0, 0.18, R.y));
  return vec3(0.26, 0.19, 0.09) * (uSunCol * 0.45 + uAmb * 0.5) * (0.6 + 0.4 * exp(R.y * 6.0));
}
// The GGX lobe at roughness r for a cosine nh between normal and half vector.
float ggx(float nh, float r) { float a = r * r, a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }
// One conductor's colour: weathered stranded aluminium, a cylinder along T, seen along V.
// A thin wire is sub-pixel: the pixel sees the mean over its visible half.
// The sun's highlight is a line along the wire where the cylinder's best normal meets the half vector.
vec3 wireShade(vec3 P, vec3 T, vec3 V) {
  vec3 F0 = vec3(0.62, 0.63, 0.64);
  float r = 0.42;
  // The normal that faces the eye, and the side normal round the wire.
  vec3 Nv = normalize(V - T * dot(V, T)), B = cross(T, Nv);
  vec3 c = vec3(0.0);
  // Four normals across the visible half, each with its reflection of the sky or field.
  for (int k = 0; k < 4; k++) {
    float a = (float(k) - 1.5) * 0.6;
    vec3 N = Nv * cos(a) + B * sin(a);
    float nv = max(dot(N, V), 0.05);
    vec2 ab = envBRDF(r, nv);
    c += lineEnv(reflect(-V, N)) * (F0 * ab.x + ab.y) * 0.25;
  }
  // The sun: the cylinder always holds a normal in the plane across T; its best one sets the highlight.
  vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), H = normalize(L + V);
  float th2 = dot(T, H);
  float nh = sqrt(max(1.0 - th2 * th2, 0.0));
  vec3 Nh = normalize(H - T * th2);
  float nl = max(dot(Nh, L), 0.0), nv = max(dot(Nh, V), 0.05);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(V, H), 0.0), 5.0);
  float sun = 1.0 - sunCover(P * 0.001);
  // The cylinder's width spreads the lobe: the highlight is a thin line, not a dot.
  c += uSunCol * sun * F * ggx(nh, r) * nl / (4.0 * nv + 0.4) * 0.35;
  // Dust and oxide on the strands: a little diffuse grey.
  return c + vec3(0.05) * (uSunCol * 0.3 * sun * max(dot(Nv, L), 0.0) + uAmb * 0.45);
}
// Weathered creosoted wood on a round post with axis A, at across-coordinate x (-1 to 1).
// h is the height up the pole: the foot sits in the shade of the crop and the ditch.
vec3 woodShade(vec3 P, vec3 A, vec3 V, float x, float h, float grain) {
  vec3 Nv = normalize(V - A * dot(V, A)), B = normalize(cross(A, Nv));
  vec3 N = Nv * sqrt(max(1.0 - x * x, 0.0)) + B * x;
  vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), H = normalize(L + V);
  float sun = 1.0 - sunCover(P * 0.001);
  // Creosote dark brown, weathered grey where the grain stands up.
  vec3 alb = mix(vec3(0.11, 0.08, 0.055), vec3(0.2, 0.18, 0.15), 0.35 + 0.4 * grain);
  // The foot: the crop and the ditch hide sky and sun; it brightens toward the top.
  float ao = mix(0.45, 1.0, smoothstep(0.3, 2.5, h));
  float nl = max(dot(N, L), 0.0);
  // A sky fill from above, stronger on the side toward the open sky.
  vec3 diff = alb * (uSunCol * 1.1 * sun * nl * ao + uAmb * (0.5 + 0.15 * N.y) * ao);
  vec3 spec = uSunCol * sun * 0.04 * ggx(max(dot(N, H), 0.0), 0.75) * nl + lineEnv(reflect(-V, N)) * 0.02;
  return diff + spec;
}
// Coverage of a segment a to b of half width w at pixel size px; sx returns the signed side, -1 to 1.
// A part thinner than a pixel covers only its share: no aliasing and no crawl.
float segCover(vec2 s, vec2 a, vec2 b, float w, float px, out float sx, out float u) {
  vec2 ab = b - a;
  u = clamp(dot(s - a, ab) / max(dot(ab, ab), 1e-12), 0.0, 1.0);
  vec2 q = s - a - ab * u;
  float d = length(q);
  sx = clamp(sign(ab.x * q.y - ab.y * q.x) * d / max(w, 1e-6), -1.0, 1.0);
  float fw = max(w, px * 0.5);
  return clamp((fw - d) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * w / px);
}

// The wires: for each screen column, the place along the line where each wire crosses.
// The wire's slope on screen sets its true distance from the pixel, so a slanted wire keeps its weight.
void wires(vec2 s, vec3 rd, float px) {
  float sn = sin(uYaw), cs = cos(uYaw), k = s.x / uFoc;
  float den = k * cs - sn;
  if (abs(den) < 1e-5) return;
  for (int j = 0; j < 3; j++) {
    float wx = POLE_X + float(j - 1) * 1.1, dx = 0.0;
    vec2 w = vec2(0.0);
    float zz = 0.0, wz = 0.0, L = 0.0;
    int i = 0;
    bool hit = true;
    // The plane at rest, then the plane moved by the sway found there.
    for (int it = 0; it < 2; it++) {
      float x = wx + dx;
      wz = -x * (cs + k * sn) / den;
      zz = depthOf(vec3(x, 0.0, wz));
      L = -wz - POLE_Z0;
      if (zz < 1.0 || L < 0.0 || L > POLE_GAP * float(POLES - 1)) { hit = false; break; }
      i = int(L / POLE_GAP);
      w = wireAt(i, j, fract(L / POLE_GAP), wz);
      dx = w.x;
    }
    if (!hit || w.y < -50.0) continue;
    float sy = (w.y - CAMH) / zz * uFoc;
    // The wire is 2 cm thick; its radius on screen.
    float rad = 0.01 / zz * uFoc;
    if (abs(s.y - sy) > 40.0 * px + rad * 6.0) continue;
    // The wire's tangent from a step along it: its slope on screen and its direction in the world.
    float du = 0.4 / POLE_GAP, u0 = fract(L / POLE_GAP), u1 = min(u0 + du, 0.999);
    vec2 w1 = wireAt(i, j, u1, wz - (u1 - u0) * POLE_GAP);
    if (w1.y < -50.0) w1 = w;
    vec3 P0 = vec3(wx + w.x, w.y, wz), P1 = vec3(wx + w1.x, w1.y, wz - (u1 - u0) * POLE_GAP);
    vec2 s0 = proj(P0), s1 = proj(P1);
    vec2 sd = s1 - s0;
    float m = abs(sd.x) > 1e-7 ? sd.y / sd.x : 1e3;
    float dist = abs(s.y - sy) / sqrt(1.0 + m * m);
    float a = clamp((max(rad, px * 0.5) - dist) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * rad / px);
    // A wire under the wheat's ears hides in the field.
    a *= smoothstep(0.7, 1.1, w.y);
    if (a <= 0.0) continue;
    vec3 T = normalize(P1 - P0), V = normalize(vec3(0.0, CAMH, 0.0) - P0);
    put(hazed(wireShade(P0, T, V), rd, zz), a, zz);
  }
}
// The poles: each a round wooden post with its cross-arm and three glass insulators.
void linePoles(vec2 s, vec3 rd, float px) {
  for (int i = 0; i < POLES; i++) {
    vec3 P = vec3(POLE_X, 0.0, -(POLE_Z0 + POLE_GAP * float(i)));
    float z = depthOf(P);
    // A pole behind the eye holds its wires but does not draw.
    if (z < 2.0) continue;
    vec2 b = proj(P);
    if (abs(s.x - b.x) > 12.0 / z * uFoc + px) continue;
    float l = poleLean(i), sl = sin(l), cl = cos(l);
    vec3 A = normalize(vec3(sl, cl, poleTilt(i))), X = normalize(vec3(cl, -sl, 0.0) + A * armRoll(i));
    vec3 V = normalize(vec3(0.0, CAMH, 0.0) - (P + A * 5.0));
    float m = uFoc / z;
    // The post: it thins a little toward its top.
    vec2 tp = proj(P + A * 10.0);
    float u, sx;
    float k = segCover(s, b, tp, 0.15 * m, px, sx, u);
    if (k > 0.0) {
      float grain = vn(vec2(sx * 3.0 + float(i) * 7.0, u * 40.0)) * (1.0 - smoothstep(0.003, 0.02, px / m));
      put(hazed(woodShade(P + A * u * 10.0, A, V, sx, u * 10.0, grain), rd, z), k, z);
    }
    // The cross-arm: a sawn beam across the line, lit on its top and its face.
    vec3 C0 = P + A * 9.15 - X * 1.25, C1 = P + A * 9.15 + X * 1.25;
    float ka = segCover(s, proj(C0), proj(C1), 0.06 * m, px, sx, u);
    if (ka > 0.0) {
      put(hazed(woodShade(mix(C0, C1, u), X, V, sx * 0.6, 9.0, 0.5), rd, z), ka, z);
    }
    // The insulators: glazed porcelain bells under each wire, with a small glint where they catch the sky.
    for (int j = 0; j < 3; j++) {
      vec3 I = j == 1 ? P + A * 9.85 + X * 0.12 : P + A * 9.2 + X * (float(j - 1) * 1.1);
      vec2 ic = proj(I);
      float ir = 0.08 * m, ih = 0.1 * m;
      vec2 q = (s - ic) / vec2(ir, ih);
      float ki = clamp((1.0 - length(q)) * min(ir, ih) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * ir / px);
      if (ki <= 0.0) continue;
      // The bell's normal from its outline: the glaze reflects the sky up top and the field below.
      vec3 N = normalize(V * sqrt(max(1.0 - dot(q, q), 0.0)) + X * q.x + A * q.y);
      vec2 ab = envBRDF(0.08, max(dot(N, V), 0.05));
      vec3 Lh = normalize(normalize(uSun + vec3(0.0, 1e-3, 0.0)) + V);
      float sun = 1.0 - sunCover(I * 0.001);
      vec3 Ls = normalize(uSun + vec3(0.0, 1e-3, 0.0));
      vec3 glaze = vec3(0.4, 0.38, 0.35) * (uSunCol * 0.9 * sun * max(dot(N, Ls), 0.0) + uAmb * (0.45 + 0.2 * N.y));
      glaze += lineEnv(reflect(-V, N)) * (0.04 * ab.x + ab.y) + uSunCol * sun * ggx(max(dot(N, Lh), 0.0), 0.12) * 0.002;
      put(hazed(glaze, rd, z), ki, z);
    }
  }
}

/* ---------- sparks ---------- */
// A shower of n sparks thrown from P, t seconds ago: they fall, bounce once and cool.
vec3 shower(vec2 s, float px, vec3 P, float t, float seed, int n, float gain) {
  vec3 add = vec3(0.0);
  for (int i = 0; i < 22; i++) {
    if (i >= n) break;
    float fi = float(i);
    vec3 h = vec3(th(vec2(seed, fi)), th(vec2(fi, seed + 1.3)), th(vec2(seed + fi, 4.1)));
    float life = 0.8 + 1.8 * h.z;
    float ts = t - 0.03 * fi * h.x;
    if (ts < 0.0 || ts > life) continue;
    float ang = h.x * 6.2832, sp = 2.0 + 7.0 * h.y;
    vec3 v = vec3(cos(ang) * sp, (h.z - 0.3) * 6.0, sin(ang) * sp) + vec3(WDIR.x, 0.0, WDIR.y) * 3.0 * uWind;
    // One bounce: the hit time on the ground, then a slower hop.
    float tg = (v.y + sqrt(v.y * v.y + 19.6 * P.y)) / 9.8;
    vec3 q, q0;
    for (int k = 0; k < 2; k++) {
      float tt = max(ts - float(k) * 0.035, 0.0);
      vec3 r;
      if (tt < tg) r = P + v * tt + vec3(0.0, -4.9 * tt * tt, 0.0);
      else {
        vec3 G = P + vec3(v.x, 0.0, v.z) * tg;
        float vy = (9.8 * tg - v.y) * 0.3, tb = tt - tg;
        r = G + vec3(v.x * 0.35, 0.0, v.z * 0.35) * tb + vec3(0.0, max(vy * tb - 4.9 * tb * tb, 0.0), 0.0);
      }
      if (k == 0) q = r; else q0 = r;
    }
    float u, d = segD(s, proj(q0), proj(q), u);
    float age = ts / life;
    // White hot for a moment, then orange, then a dull red.
    vec3 hot = mix(vec3(1.0, 0.8, 0.5), vec3(1.0, 0.32, 0.05), smoothstep(0.02, 0.3, age)) * (1.0 - age) * (1.0 - age);
    add += hot * 1.5 * gain * exp(-pow(d / (px * 0.7), 2.0));
  }
  return add;
}
// The light of every arc now: its glow on the screen and its flash on the air.
// A fault arcs in two or three hard pulses, then its sparks fall.
// The cascade then pops pole by pole toward the eye.
// It returns light to add; dustA is the storm pass's cover here, which the flash lights.
vec3 sparks(vec2 s, float px, float dustA) {
  vec3 add = vec3(0.0);
  for (int e = 0; e < ${MAX_ARCS}; e++) {
    vec4 A = uArc[e], K = uArcK[e];
    if (K.w <= 0.0) continue;
    float t = uT - A.w;
    if (t < 0.0 || t > 3.5) continue;
    vec3 P = A.xyz;
    float z = depthOf(P);
    if (z < 2.0) continue;
    vec2 c = proj(P);
    float m = z / uFoc;
    // The screen distance to the arc, in metres at its depth.
    float dm = length(s - c) * m;
    // Hard pulses: the arc strikes, drops and strikes again.
    float seed = K.y;
    float pulse = 0.0;
    for (int p = 0; p < 3; p++) {
      float tp = t - float(p) * (0.09 + 0.12 * th(vec2(seed, float(p))));
      pulse += exp(-max(tp, 0.0) * 22.0) * step(0.0, tp) * (1.0 - 0.3 * float(p));
    }
    // The arc's blue-white light, and the flash on the dust and the air round it.
    vec3 arcC = vec3(0.75, 0.88, 1.25);
    // The flash lights dusty air more than clear air.
    float near = 1.0 / (1.0 + dm * dm / 9.0) + (0.12 + 0.25 * dustA) / (1.0 + dm * dm / 900.0) + 0.03 * dustA * exp(-dm / 400.0);
    add += arcC * pulse * K.x * near * 8.0;
    // The arc's bolt: a jagged line about 3 m long, new each pulse.
    if (pulse > 0.05 && dm < 6.0) {
      float fl = floor(t * 30.0);
      vec2 a = c, b = proj(P + vec3((th(vec2(seed, fl)) - 0.5) * 3.0, -1.5 - 2.0 * th(vec2(fl, seed)) * (1.0 - K.z), (th(vec2(fl + 3.0, seed)) - 0.5) * 3.0));
      vec2 mid = mix(a, b, 0.5) + vec2(th(vec2(seed + fl, 1.0)) - 0.5, th(vec2(seed, fl + 1.0)) - 0.5) * 1.5 / m;
      float u, d = min(segD(s, a, mid, u), segD(s, mid, b, u));
      add += arcC * 30.0 * pulse * exp(-pow(d / (px * 0.9), 2.0));
    }
    // The sparks: molten bits thrown out, falling, bouncing once and cooling.
    if (dm < 40.0) add += shower(s, px, P, t, seed, 22, K.x);
  }
  // The cascade: a short pops at each pole's cross-arm, in turn, toward the eye.
  float tc = uT - uCasc.y;
  if (uCasc.x > 0.0 && tc > 0.0) {
    // The front's pole now, and the two poles behind it that still glow or drip.
    float front = uCasc.x - floor(tc / uCasc.z);
    for (int k = 0; k < 6; k++) {
      float fi = front + float(k) - 1.0;
      if (fi < 0.0 || fi > uCasc.x) continue;
      float hs = th(vec2(fi, uCasc.y));
      // Now and then a pole holds: no short there.
      if (hs < 0.15) continue;
      float tp = tc - (uCasc.x - fi) * uCasc.z - 0.03 * hs;
      if (tp < 0.0 || tp > 0.55) continue;
      int i = int(fi);
      float l = poleLean(i);
      vec3 P = vec3(POLE_X + 9.2 * sin(l) + (hs - 0.5) * 2.0, 9.2 * cos(l), -(POLE_Z0 + POLE_GAP * fi));
      float z = depthOf(P);
      if (z < 2.0) continue;
      float dm = length(s - proj(P)) * z / uFoc;
      float pulse = exp(-tp * 30.0) + 0.5 * exp(-max(tp - 0.05, 0.0) * 40.0) * step(0.05, tp);
      vec3 arcC = vec3(0.75, 0.88, 1.25);
      add += arcC * pulse * uCasc.w * (1.0 / (1.0 + dm * dm / 2.0) + (0.06 + 0.2 * dustA) / (1.0 + dm * dm / 400.0)) * 6.0;
      // Its drip fades out before the front leaves it behind.
      if (dm < 25.0) add += shower(s, px, P, tp, fi * 7.3 + uCasc.y, 7, uCasc.w * 0.7 * (1.0 - tp / 0.55));
    }
  }
  return add;
}
`;
