// Glowworm cave: the grotto's shape, the glowworm colonies and the boat's path.
// One signed-distance cave runs in JS and in GLSL, so the worms sit on the rock.
// World: metres, y up, the water plane at y = 0. The grotto's long axis runs along z.

/* ---------- noise: an integer hash, identical in JS and GLSL ---------- */
const M1 = 0x8da6b343, M2 = 0xd8163841, M3 = 0xcb1ab31f, M4 = 0x2c1b3c6d, M5 = 0x297a2d39;
function hash3(x, y, z) {
  let h = (Math.imul(x, M1) ^ Math.imul(y, M2) ^ Math.imul(z, M3)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, M4) >>> 0;
  h ^= h >>> 12; h = Math.imul(h, M5) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967295;
}
const sm = f => f * f * (3 - 2 * f);
const lerp = (a, b, t) => a + (b - a) * t;
export function vn3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
  const a = lerp(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx), b = lerp(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx);
  const c = lerp(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx), d = lerp(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx);
  return lerp(lerp(a, b, fy), lerp(c, d, fy), fz);
}
export function vn2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = sm(x - ix), fz = sm(z - iz);
  return lerp(lerp(hash3(ix, 17, iz), hash3(ix + 1, 17, iz), fx), lerp(hash3(ix, 17, iz + 1), hash3(ix + 1, 17, iz + 1), fx), fz);
}

const NOISE_GLSL = /* glsl */`
float hash3(ivec3 i) {
  uint h = (uint(i.x) * ${M1 >>> 0}u) ^ (uint(i.y) * ${M2 >>> 0}u) ^ (uint(i.z) * ${M3 >>> 0}u);
  h ^= h >> 15u; h *= ${M4 >>> 0}u;
  h ^= h >> 12u; h *= ${M5 >>> 0}u;
  h ^= h >> 15u;
  return float(h) / 4294967295.0;
}
float vn3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash3(i), hash3(i + ivec3(1, 0, 0)), f.x), b = mix(hash3(i + ivec3(0, 1, 0)), hash3(i + ivec3(1, 1, 0)), f.x);
  float c = mix(hash3(i + ivec3(0, 0, 1)), hash3(i + ivec3(1, 0, 1)), f.x), d = mix(hash3(i + ivec3(0, 1, 1)), hash3(i + ivec3(1, 1, 1)), f.x);
  return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}
float vn2(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash3(ivec3(i.x, 17, i.y)), hash3(ivec3(i.x + 1, 17, i.y)), f.x);
  float b = mix(hash3(ivec3(i.x, 17, i.y + 1)), hash3(ivec3(i.x + 1, 17, i.y + 1)), f.x);
  return mix(a, b, f.y);
}
`;

/* ---------- the grotto ---------- */
// A low dome, a passage out at the far end, relief, and drapes off the roof.
// Positive values are air; the value is near the distance to rock.
export const CAVE = {
  // The dome: an ellipsoid's inside. Its top is 4 m over the water.
  c: [0, -0.8, 2], r: [11, 4.8, 19],
  // The boat's loop: an ellipse round the dome's middle.
  path: { rx: 4.5, rz: 9, z0: 1 },
};
// The passage bends left past the far curtain and out of sight.
const tunnelX = z => 2.5 + 3.5 * Math.sin(Math.max(0, z - 8) * 0.12);

export function sdf(x, y, z) {
  const [cx, cy, cz] = CAVE.c, [rx, ry, rz] = CAVE.r;
  const qx = (x - cx) / rx, qy = (y - cy) / ry, qz = (z - cz) / rz;
  const k0 = Math.hypot(qx, qy, qz), k1 = Math.hypot(qx / rx, qy / ry, qz / rz);
  let air = -(k0 * (k0 - 1) / k1);
  // The passage leaves the far end and bends out of sight.
  const tx = (x - tunnelX(z)) / 3.0, ty = y / 3.4;
  const tun = Math.min((1 - Math.hypot(tx, ty)) * 2.8, z - 6, 46 - z);
  air = Math.max(air, tun);
  // Relief: domes and hollows in the roof, bulges on the walls.
  air += 0.75 * (vn3(x * 0.33, y * 0.33, z * 0.33) - 0.5) + 0.35 * (vn3(x * 0.9 + 11, y * 0.9 + 11, z * 0.9 + 11) - 0.5);
  // Curtains of flowstone hang from the roof.
  return Math.min(air, curtains(x, y, z) * 0.85);
}

// Each curtain follows a wavy line in plan, between u0 and u1 along its axis.
// Its fringe of stalactites hangs down to about bot metres over the water.
// Curtains inside the boat's loop end near 3 m up, over the boat's head.
const CURTAINS = [
  { ax: 'z', c: -8.6, a: 0.8, f: 0.4, ph: 0.3, u0: -8, u1: 8, bot: 1.3 },
  { ax: 'z', c: 9.2, a: 0.6, f: 0.5, ph: 1.0, u0: -6, u1: 9, bot: 1.5 },
  { ax: 'x', c: 10.4, a: 0.7, f: 0.45, ph: 0.2, u0: -7, u1: 0.4, bot: 1.9 },
  { ax: 'x', c: -9.6, a: 0.5, f: 0.6, ph: 2.0, u0: -4, u1: 6, bot: 1.8 },
  { ax: 'x', c: 2.2, a: 1.0, f: 0.3, ph: 0.6, u0: -3.2, u1: 3.2, bot: 3.1 },
  { ax: 'z', c: -1.8, a: 1.0, f: 0.3, ph: 1.4, u0: -4.5, u1: 4.5, bot: 2.9 },
  { ax: 'z', c: 5.6, a: 0.5, f: 0.35, ph: 0.0, u0: 9.5, u1: 15, bot: 2.7 },
];
function curtain(x, y, z, C, i) {
  const u = C.ax === 'z' ? z : x, v = C.ax === 'z' ? x : z;
  const arg = u * C.f + C.ph;
  const off = v - (C.c + C.a * Math.sin(arg));
  const perp = Math.abs(off) / Math.sqrt(1 + (C.a * C.f * Math.cos(arg)) ** 2);
  const du = Math.max(C.u0 - u, u - C.u1, 0);
  const e = Math.min(1, Math.max(0, Math.min(u - C.u0, C.u1 - u) / 1.6));
  const bottom = C.bot + 0.4 * vn2(u * 1.7 + i * 13, i * 7) + 0.22 * vn2(u * 4 + i * 5, i * 3 + 50) + 1.4 * (1 - e) * (1 - e);
  // Flowstone thickens toward the roof.
  const th = 0.09 + 0.07 * Math.min(2, Math.max(0, y - bottom));
  return Math.max(Math.hypot(perp, du) - th, bottom - y);
}
export function curtains(x, y, z) {
  let d = 1e9;
  CURTAINS.forEach((C, i) => { d = Math.min(d, curtain(x, y, z, C, i)); });
  return d;
}

export const CAVE_GLSL = /* glsl */`
${NOISE_GLSL}
const vec3 CAVE_C = vec3(${CAVE.c.join(', ')});
const vec3 CAVE_R = vec3(${CAVE.r.join(', ')});
float tunnelX(float z) { return 2.5 + 3.5 * sin(max(0.0, z - 8.0) * 0.12); }
float curtain(vec3 p, float ax, float c, float a, float f, float ph, float u0, float u1, float bot, float i) {
  float u = ax > 0.5 ? p.z : p.x, v = ax > 0.5 ? p.x : p.z;
  float arg = u * f + ph;
  float off = v - (c + a * sin(arg));
  float perp = abs(off) / sqrt(1.0 + (a * f * cos(arg)) * (a * f * cos(arg)));
  float du = max(max(u0 - u, u - u1), 0.0);
  float e = clamp(min(u - u0, u1 - u) / 1.6, 0.0, 1.0);
  float bottom = bot + 0.4 * vn2(vec2(u * 1.7 + i * 13.0, i * 7.0)) + 0.22 * vn2(vec2(u * 4.0 + i * 5.0, i * 3.0 + 50.0)) + 1.4 * (1.0 - e) * (1.0 - e);
  float th = 0.09 + 0.07 * clamp(p.y - bottom, 0.0, 2.0);
  return max(length(vec2(perp, du)) - th, bottom - p.y);
}
float curtains(vec3 p) {
  float d = 1e9;
${CURTAINS.map((C, i) => `  d = min(d, curtain(p, ${C.ax === 'z' ? '1.0' : '0.0'}, ${C.c.toFixed(2)}, ${C.a.toFixed(2)}, ${C.f.toFixed(2)}, ${C.ph.toFixed(2)}, ${C.u0.toFixed(2)}, ${C.u1.toFixed(2)}, ${C.bot.toFixed(2)}, ${i}.0));`).join('\n')}
  return d;
}
float cave(vec3 p) {
  vec3 q = (p - CAVE_C) / CAVE_R;
  float k0 = length(q), k1 = length(q / CAVE_R);
  float air = -(k0 * (k0 - 1.0) / k1);
  vec2 tq = vec2((p.x - tunnelX(p.z)) / 3.0, p.y / 3.4);
  float tun = min(min((1.0 - length(tq)) * 2.8, p.z - 6.0), 46.0 - p.z);
  air = max(air, tun);
  air += 0.75 * (vn3(p * 0.33) - 0.5) + 0.35 * (vn3(p * 0.9 + 11.0) - 0.5);
  return min(air, curtains(p) * 0.85);
}
`;

/* ---------- colonies ---------- */
// The worms live in bands along the roof, as in the Waitomo photos.
// Each band: a centre line, its sway, its width and its weight.
const BANDS = [
  { axis: 'z', c: -3.0, a: 2.2, f: 0.21, ph: 0.7, w: 1.5, k: 1 },
  { axis: 'z', c: 5.5, a: 1.6, f: 0.17, ph: 2.1, w: 1.3, k: 0.85 },
  { axis: 'x', c: 9.0, a: 1.8, f: 0.25, ph: 0.0, w: 1.4, k: 0.9 },
  { axis: 't', c: 0, a: 0, f: 0, ph: 0, w: 1.6, k: 1 },
];
// The band weight at a point on the roof plan, 0 to 1. wide widens every band.
export function band(x, z, wide = 1) {
  let b = 0;
  for (const B of BANDS) {
    let d;
    if (B.axis === 'z') d = x - (B.c + B.a * Math.sin(z * B.f + B.ph));
    else if (B.axis === 'x') d = z - (B.c + B.a * Math.sin(x * B.f + B.ph));
    else d = z > 9 ? x - tunnelX(z) : 99;
    const w = B.w * wide;
    b = Math.max(b, B.k * Math.exp(-(d * d) / (w * w)));
  }
  return b;
}
export const BAND_GLSL = /* glsl */`
float bandAt(vec2 p, float wide) {
  float b = 0.0, d, w;
${BANDS.map(B => {
  const d = B.axis === 'z' ? `p.x - (${B.c.toFixed(2)} + ${B.a.toFixed(2)} * sin(p.y * ${B.f.toFixed(3)} + ${B.ph.toFixed(2)}))`
    : B.axis === 'x' ? `p.y - (${B.c.toFixed(2)} + ${B.a.toFixed(2)} * sin(p.x * ${B.f.toFixed(3)} + ${B.ph.toFixed(2)}))`
      : `p.y > 9.0 ? p.x - tunnelX(p.y) : 99.0`;
  return `  d = ${d}; w = ${B.w.toFixed(2)} * wide; b = max(b, ${B.k.toFixed(2)} * exp(-(d * d) / (w * w)));`;
}).join('\n')}
  return b;
}
`;

// A seeded generator, so every visit sees the same cave.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normal(x, y, z) {
  const e = 0.02;
  const nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

// Marches up from just over the water to the first rock overhead.
function roofAbove(x, z) {
  let y = 0.3;
  if (sdf(x, y, z) < 0.05) return null;
  for (let i = 0; i < 90 && y < 7; i++) {
    const d = sdf(x, y, z);
    if (d < 0.003) return y;
    y += Math.max(d * 0.6, 0.004);
  }
  return null;
}

// The worms and their threads.
// Worm: x, y, z, brightness | seed, band, 0, 0.
// Thread: top x, y, z, length | worm brightness, seed, kind 0, worm seed.
export function makeColony({ count = 11000, threadsPer = 7, seed = 351 } = {}) {
  const r = rng(seed);
  const worms = new Float32Array(count * 8);
  const threads = [];
  let n = 0, tries = 0;
  while (n < count && tries < count * 40) {
    tries++;
    // A few tries go up the passage, so its roof glows too.
    let x, z;
    if (r() < 0.07) { z = 9 + r() * 16; x = tunnelX(z) + (r() * 2 - 1) * 1.6; }
    else { x = (r() * 2 - 1) * 11; z = -17 + r() * 38; }
    const B = band(x, z);
    const clump = vn2(x * 0.9 + 40, z * 0.9 + 40);
    const p = Math.min(1, (0.05 + 0.95 * B) * (0.45 + 1.1 * clump));
    // Curtain fringes carry dense colonies, so a curtain hit always stays.
    const q = Math.min(1, p + 0.3);
    if (r() > q) continue;
    const y = roofAbove(x, z);
    if (y === null || y < 1.1) continue;
    if (curtains(x, y, z) > 0.03 && r() > p / q) continue;
    const nrm = normal(x, y, z);
    // Threads need a face that looks down.
    if (nrm[1] > -0.25) continue;
    // Brightness: log-normal, so a few worms shine well above the rest.
    const g = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * Math.cos(6.2832 * r());
    const bright = Math.exp(g * 0.8) * (0.55 + 0.45 * B);
    const s = r();
    const wx = x + nrm[0] * 0.012, wy = y + nrm[1] * 0.012, wz = z + nrm[2] * 0.012;
    worms.set([wx, wy, wz, bright, s, B, 0, 0], n * 8);
    // The threads hang from the worm's silk tube, a few centimetres either side.
    const m = Math.max(2, Math.round(threadsPer * (0.6 + 0.8 * r())));
    const ang = r() * 6.2832;
    for (let k = 0; k < m; k++) {
      const u = (r() * 2 - 1) * 0.035, v = (r() * 2 - 1) * 0.012;
      const tx = wx + Math.cos(ang) * u - Math.sin(ang) * v, tz = wz + Math.sin(ang) * u + Math.cos(ang) * v;
      const len = 0.04 + 0.38 * Math.pow(r(), 1.6);
      threads.push(tx, wy - 0.004, tz, len, bright, r(), 0, s);
    }
    n++;
  }
  return { worms: worms.subarray(0, n * 8), wormCount: n, threads: new Float32Array(threads), threadCount: threads.length / 8 };
}

/* ---------- the boat ---------- */
// The boat drifts round an ellipse. s is the path angle.
export function boatAt(s) {
  const { rx, rz, z0 } = CAVE.path;
  const x = rx * Math.cos(s), z = z0 + rz * Math.sin(s);
  const tx = -rx * Math.sin(s), tz = rz * Math.cos(s);
  return { x, z, heading: Math.atan2(tx, tz), speedPerS: Math.hypot(tx, tz) };
}

/* ---------- picking ---------- */
// Casts a ray from the eye. Returns the first rock or water hit.
export function cast(eye, dir, tmax = 60) {
  const tw = dir[1] < -1e-4 ? eye[1] / -dir[1] : Infinity;
  let t = 0.02;
  for (let i = 0; i < 160 && t < Math.min(tw, tmax); i++) {
    const p = [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
    const d = sdf(p[0], p[1], p[2]);
    if (d < 0.004) return { kind: 'rock', t, p };
    t += Math.max(d * 0.6, 0.004);
  }
  if (tw < tmax) return { kind: 'water', t: tw, p: [eye[0] + dir[0] * tw, 0, eye[2] + dir[2] * tw] };
  return null;
}
