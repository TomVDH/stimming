// Phaeton debris: plain maths, no three.js.
// Every pose is a pure function of the shot time T, so time runs both ways.
// poseAt() and DEBRIS_GLSL hold the same maths; a change in one goes in both.

export const G = 9.81;
// Bounce: the speed kept upward, and the speed kept along the table.
export const BOUNCE = 0.3, SKID = 0.5, GRIP = 0.6;
// A piece that never lands gets this contact time.
export const NEVER = 1e6;
// One piece takes this many texels: one row of the piece texture.
export const ROW = 5;

/**
 * @typedef {object} Piece
 * @property {number[]} p0 The centre before release.
 * @property {number} t0 The release time on the shot clock.
 * @property {number[]} v The launch velocity.
 * @property {number} k The drag on the launch velocity, per second.
 * @property {number[]} axis The spin axis, unit length.
 * @property {number} turn The whole spin angle, from release to rest.
 * @property {number} [h] The rest height of the centre.
 * @property {number} [t1] The first contact time after release.
 * @property {number} [u1] The speed downward at the first contact.
 * @property {number[]} [v1] The x and z velocity at the first contact.
 * @property {number} [rest] The time after release when the piece lies still.
 */

// The launch push fades with drag; gravity acts in full.
const flightY = (p, tau) => p.p0[1] + p.v[1] * (1 - Math.exp(-p.k * tau)) / p.k - 0.5 * G * tau * tau;

/**
 * Finds the contact with the table and the time of rest. Run it once per shot.
 * @param {Piece} p
 * @param {{ x0: number, x1: number, z: number, y: number }} table
 * @param {number} lift The centre height of a piece that lies on the table.
 */
export function solve(p, table, lift = 0) {
  p.h = table.y + lift;
  p.t1 = NEVER; p.u1 = 0; p.v1 = [0, 0]; p.rest = 2.5;
  if (!(p.t0 < NEVER) || p.p0[1] <= p.h) return p;
  // The piece is above the table at lo and under it at hi.
  let lo = 0, hi = 0.05;
  while (flightY(p, hi) > p.h && hi < 60) { lo = hi; hi *= 2; }
  for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (flightY(p, m) > p.h) lo = m; else hi = m; }
  const t1 = hi, e = Math.exp(-p.k * t1), reach = (1 - e) / p.k;
  const x = p.p0[0] + p.v[0] * reach, z = p.p0[2] + p.v[2] * reach;
  // A piece that passes the table edge falls into the dark.
  if (x < table.x0 || x > table.x1 || Math.abs(z) > table.z) return p;
  p.t1 = t1;
  p.u1 = Math.max(0, G * t1 - p.v[1] * e);
  p.v1 = [p.v[0] * e, p.v[2] * e];
  const slide = Math.hypot(p.v1[0], p.v1[1]) * SKID * SKID / (GRIP * G);
  p.rest = t1 + 2 * p.u1 * (BOUNCE + BOUNCE * BOUNCE) / G + slide;
  return p;
}

/**
 * The pose of a piece at shot time T: the JS twin of dbPose in DEBRIS_GLSL.
 * @param {Piece} p A piece after solve().
 * @param {number} T
 * @returns {{ pos: number[], angle: number }}
 */
export function poseAt(p, T) {
  const tau = T - p.t0;
  if (!(tau > 0)) return { pos: [...p.p0], angle: 0 };
  const tm = Math.min(tau, p.t1), reach = (1 - Math.exp(-p.k * tm)) / p.k;
  let x = p.p0[0] + p.v[0] * reach, z = p.p0[2] + p.v[2] * reach;
  let y = p.p0[1] + p.v[1] * reach - 0.5 * G * tm * tm;
  let s = tau - p.t1;
  if (s >= 0) {
    // Two bounces, each a closed arc, then a slide to a dead stop.
    let uk = p.u1, hv = 1;
    y = p.h;
    for (let i = 0; i < 2; i++) {
      uk *= BOUNCE; hv *= SKID;
      const d = 2 * uk / G, a = Math.min(Math.max(s, 0), d);
      if (s >= 0) y = p.h + uk * a - 0.5 * G * a * a;
      x += p.v1[0] * hv * a; z += p.v1[1] * hv * a;
      s -= d;
    }
    const vs = Math.hypot(p.v1[0], p.v1[1]) * hv;
    if (vs > 1e-6) {
      const b = Math.min(Math.max(s, 0), vs / (GRIP * G)), run = vs * b - 0.5 * GRIP * G * b * b;
      x += p.v1[0] * hv / vs * run; z += p.v1[1] * hv / vs * run;
    }
  }
  const q = Math.min(tau / p.rest, 1);
  return { pos: [x, y, z], angle: p.turn * (1 - (1 - q) * (1 - q)) };
}

/**
 * Lifts pieces that land on other pieces, so a pile has layers.
 * Run it after solve(); it runs solve() again for each lifted piece.
 * @param {(Piece & { r: number })[]} pieces
 * @param {{ x0: number, x1: number, z: number, y: number }} table
 * @param {(p: Piece) => number} lift The rest height of one piece above the table.
 * @param {number} step The height of one layer.
 */
export function pile(pieces, table, lift, step) {
  const down = pieces.filter(p => p.t1 < NEVER).sort((a, b) => a.rest - b.rest), spots = [];
  for (const p of down) {
    const end = poseAt(p, p.t0 + p.rest + 1).pos;
    let layer = 0;
    for (const s of spots) if (Math.hypot(s[0] - end[0], s[1] - end[2]) < (s[2] + p.r) * 0.6) layer = Math.max(layer, s[3] + 1);
    spots.push([end[0], end[2], p.r, layer]);
    if (layer) solve(p, table, lift(p) + layer * step);
  }
}

/**
 * Packs pieces into the float texture the vertex shader reads.
 * @param {Piece[]} pieces Pieces after solve().
 * @param {Float32Array} [out]
 * @returns {Float32Array} ROW texels of RGBA per piece.
 */
export function pack(pieces, out = new Float32Array(pieces.length * ROW * 4)) {
  pieces.forEach((p, i) => {
    out.set([
      p.p0[0], p.p0[1], p.p0[2], p.t0,
      p.v[0], p.v[1], p.v[2], p.k,
      p.axis[0], p.axis[1], p.axis[2], p.turn,
      p.t1, p.u1, p.h, p.rest,
      p.v1[0], p.v1[1], 0, 0,
    ], i * ROW * 4);
  });
  return out;
}

// The vertex-shader twin of poseAt(). The page gives uPieces and uT.
export const DEBRIS_GLSL = /* glsl */`
uniform highp sampler2D uPieces;
uniform float uT;
uniform float uLead;
attribute float aPiece;
attribute float aWall;
const float DB_G = ${G}, DB_E = ${BOUNCE.toFixed(3)}, DB_F = ${SKID.toFixed(3)}, DB_MU = ${GRIP.toFixed(3)};
vec3 dbTurn(vec3 p, vec3 ax, float a) {
  float s = sin(a), c = cos(a);
  return p * c + cross(ax, p) * s + ax * dot(ax, p) * (1.0 - c);
}
// The centre, the spin axis, the angle and the time since release of one piece.
void dbPose(float id, out vec3 c0, out vec3 pos, out vec3 ax, out float ang, out float tau) {
  int row = int(id + 0.5);
  vec4 A = texelFetch(uPieces, ivec2(0, row), 0), B = texelFetch(uPieces, ivec2(1, row), 0);
  vec4 C = texelFetch(uPieces, ivec2(2, row), 0), D = texelFetch(uPieces, ivec2(3, row), 0);
  vec4 E = texelFetch(uPieces, ivec2(4, row), 0);
  c0 = A.xyz; ax = C.xyz; tau = uT - A.w;
  pos = c0; ang = 0.0;
  if (tau <= 0.0) return;
  float t1 = D.x, tm = min(tau, t1), reach = (1.0 - exp(-B.w * tm)) / B.w;
  pos = c0 + B.xyz * reach;
  pos.y -= 0.5 * DB_G * tm * tm;
  float s = tau - t1;
  if (s >= 0.0) {
    float uk = D.y, hv = 1.0;
    pos.y = D.z;
    for (int i = 0; i < 2; i++) {
      uk *= DB_E; hv *= DB_F;
      float d = 2.0 * uk / DB_G, a = clamp(s, 0.0, d);
      if (s >= 0.0) pos.y = D.z + uk * a - 0.5 * DB_G * a * a;
      pos.xz += E.xy * hv * a;
      s -= d;
    }
    float vs = length(E.xy) * hv;
    if (vs > 1e-6) {
      float b = clamp(s, 0.0, vs / (DB_MU * DB_G));
      pos.xz += E.xy * hv / vs * (vs * b - 0.5 * DB_MU * DB_G * b * b);
    }
  }
  float q = min(tau / D.w, 1.0);
  ang = C.w * (1.0 - (1.0 - q) * (1.0 - q));
}
`;

// Chunks for a three.js material: the pose, then the normal, then the position.
// A wall shows only once its crack runs; uLead is that head start in seconds.
export const DEBRIS_POSE = /* glsl */`
vec3 dbC0, dbPos, dbAx; float dbAng, dbTau;
dbPose(aPiece, dbC0, dbPos, dbAx, dbAng, dbTau);
`;
export const DEBRIS_NORMAL = /* glsl */`
vec3 objectNormal = dbTurn(normal, dbAx, dbAng);
`;
export const DEBRIS_BEGIN = /* glsl */`
vec3 transformed = dbPos + dbTurn(position - dbC0, dbAx, dbAng);
if (aWall > 0.5 && dbTau < -uLead) transformed = vec3(0.0, -1e4, 0.0);
`;
