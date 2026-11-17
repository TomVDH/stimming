// Tornado alley: the damage field. Each ground point keeps the peak wind a tornado gave it, until Clear.
// The CPU part fills a 50 m grid near each working tornado and uploads the changed rows.
// Sites (a barn, a bin, a sign) keep their own exact peak, the time it rose, and its direction.
// The GLSL part reads the grid: dmgAt(xz) returns the peak in m/s and its direction.
// Debris: a failing thing throws pieces that spiral up into the nearest funnel, fly out and fall back.
import { at, KNOB } from './funnel.js';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

/* ---------- the tornado's wind ---------- */
// The dust's ground radius, m: funnel.js debrisR() at the ground; line.js uses the same.
export const dustR = t => { const r0 = at('r0', t.f) * KNOB.width; return r0 * (2.2 + (1.18 - 2.2) * t.f / 5) + 20; };
// The wind speed, m/s, at distance d from a tornado's axis: a Rankine vortex, as line.js windAt().
export function windAt(t, d) {
  const r = Math.max(8, at('r0', t.f) * KNOB.width), v = at('vmax', t.f) * (1 - clamp(t.rope)) * clamp(t.dust * 1.5);
  // Past the core the wind falls as 1/d, and dies out past the dust.
  const R = dustR(t), edge = clamp((1.6 * R - d) / (0.6 * R));
  return (d < r ? v * d / r : v * r / d) * edge;
}
// The wind's direction at a point: it turns anticlockwise seen from above, and spirals in.
// Returns the unit direction in x and z.
export function windDir(dx, dz, d) {
  const tx = dz / d, tz = -dx / d;
  const x = tx - 0.35 * dx / d, z = tz - 0.35 * dz / d, n = Math.hypot(x, z) || 1;
  return [x / n, z / n];
}

// The wind now at (x, z) from every tornado, as a vector in m/s.
export function windNow(tors, x, z) {
  let wx = 0, wz = 0;
  for (const t of tors) {
    if (t.dust <= 0.05) continue;
    const dx = x - t.x, dz = z - t.z, d = Math.max(Math.hypot(dx, dz), 1);
    if (d > 1.6 * dustR(t)) continue;
    const v = windAt(t, d), [ux, uz] = windDir(dx, dz, d);
    wx += v * ux; wz += v * uz;
  }
  return [wx, wz];
}

/* ---------- the grid ---------- */
// 512 cells of 50 m each way: x from -12.8 to 12.8 km, z from -25.6 km to the eye.
export const DMG_N = 512, DMG_X0 = -12800, DMG_Z0 = -25600, DMG_CELL = 50;
// Debris throws in the air at once, and how long one lasts, in seconds.
export const MAX_DEB = 6;
const DEB_LIFE = 16;

export function damageState() {
  const D = {
    // RGBA8 per cell: peak wind over 128 m/s, its direction x and z as 0.5 +- 0.5, and a spare byte.
    px: new Uint8Array(DMG_N * DMG_N * 4),
    // The rows changed since the last upload.
    lo: DMG_N, hi: -1,
    tex: null, gl: null,
    // Sites: { x, z, peak, dx, dz, t } each.
    sites: [],
    // Debris throws: { x, z, t, k, seed } each, and their packed uniforms.
    deb: [], uDeb: new Float32Array(MAX_DEB * 4), uDebB: new Float32Array(MAX_DEB * 4),
  };
  damageReset(D);
  return D;
}
// Mends everything: the grid holds no wind, every site its rest.
export function damageReset(D) {
  for (let i = 0; i < D.px.length; i += 4) { D.px[i] = 0; D.px[i + 1] = 128; D.px[i + 2] = 128; D.px[i + 3] = 0; }
  D.lo = 0; D.hi = DMG_N - 1;
  for (const s of D.sites) Object.assign(s, { peak: 0, dx: 0, dz: 0, t: -1e4 });
  if (D.deb) D.deb.length = 0;
}
// A throw of debris from (x, z) at time t; k from 0 to 1 sets how much.
export function debrisThrow(D, x, z, t, k) {
  D.deb.push({ x, z, t, k, seed: Math.random() * 100 });
  if (D.deb.length > MAX_DEB) D.deb.shift();
}
// Packs the throws still in the air: place and start time and seed; then how much.
export function debrisUniforms(D, simT) {
  D.deb = D.deb.filter(d => simT - d.t < DEB_LIFE);
  D.uDeb.fill(0); D.uDebB.fill(0);
  D.deb.forEach((d, i) => { D.uDeb.set([d.x, d.z, d.t, d.seed], i * 4); D.uDebB[i * 4] = d.k; });
}
// Adds a site at (x, z); returns it, so its owner can read its peak.
export function damageSite(D, x, z) {
  const s = { x, z, peak: 0, dx: 0, dz: 0, t: -1e4 };
  D.sites.push(s);
  return s;
}
// One step: every working tornado raises the peak in its reach.
export function damageStep(D, tors, simT) {
  for (const t of tors) {
    if (t.dust <= 0.05 || t.rope >= 1) continue;
    const R = 1.6 * dustR(t);
    const i0 = Math.max(0, Math.floor((t.x - R - DMG_X0) / DMG_CELL)), i1 = Math.min(DMG_N - 1, Math.ceil((t.x + R - DMG_X0) / DMG_CELL));
    const j0 = Math.max(0, Math.floor((t.z - R - DMG_Z0) / DMG_CELL)), j1 = Math.min(DMG_N - 1, Math.ceil((t.z + R - DMG_Z0) / DMG_CELL));
    if (i1 < i0 || j1 < j0) continue;
    let touched = false;
    for (let j = j0; j <= j1; j++) {
      const dz = DMG_Z0 + (j + 0.5) * DMG_CELL - t.z;
      for (let i = i0; i <= i1; i++) {
        const dx = DMG_X0 + (i + 0.5) * DMG_CELL - t.x, d = Math.hypot(dx, dz);
        if (d > R) continue;
        const v = Math.min(127, windAt(t, Math.max(d, 1)));
        const k = (j * DMG_N + i) * 4;
        if (v * 2 <= D.px[k] + 0.5) continue;
        const [wx, wz] = windDir(dx, dz, Math.max(d, 1));
        D.px[k] = Math.round(v * 2); D.px[k + 1] = Math.round(127.5 + 127 * wx); D.px[k + 2] = Math.round(127.5 + 127 * wz);
        touched = true;
      }
    }
    if (touched) { D.lo = Math.min(D.lo, j0); D.hi = Math.max(D.hi, j1); }
    for (const s of D.sites) {
      const dx = s.x - t.x, dz = s.z - t.z, d = Math.hypot(dx, dz);
      if (d > R) continue;
      const v = windAt(t, Math.max(d, 1));
      if (v <= s.peak) continue;
      const [wx, wz] = windDir(dx, dz, Math.max(d, 1));
      Object.assign(s, { peak: v, dx: wx, dz: wz, t: simT });
    }
  }
}
// The grid's texture: made on first use, then only the changed rows go up.
export function damageTex(D, gl) {
  if (!D.tex) {
    D.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, D.tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, DMG_N, DMG_N);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    D.lo = 0; D.hi = DMG_N - 1;
  }
  if (D.hi >= D.lo) {
    gl.bindTexture(gl.TEXTURE_2D, D.tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, D.lo, DMG_N, D.hi - D.lo + 1, gl.RGBA, gl.UNSIGNED_BYTE, D.px, D.lo * DMG_N * 4);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    D.lo = DMG_N; D.hi = -1;
  }
  return D.tex;
}

/* ---------- GLSL ---------- */
export const DAMAGE_GLSL = /* glsl */`
/* ---------- the damage field ---------- */
uniform sampler2D tDmg;
// The peak wind at a ground point in m/s, and the direction it blew (x, z).
vec3 dmgAt(vec2 xz) {
  vec2 uv = (xz - vec2(${DMG_X0}.0, ${DMG_Z0}.0)) / ${DMG_N * DMG_CELL}.0;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec3(0.0);
  vec4 d = texture(tDmg, uv);
  return vec3(d.r * 127.5, d.gb * 2.0 - 1.0);
}
/* ---------- debris ---------- */
// Each throw: place x, z, start time, seed; then how much, 0 to 1.
uniform vec4 uDeb[${MAX_DEB}], uDebB[${MAX_DEB}];
// Every throw's pieces: boards and tin, spiralling up into the funnel, flung out, falling back.
// It reads line.js's uFoot[] for each tornado's foot and dust radius.
void debris(vec2 s, vec3 rd, float px) {
  for (int e = 0; e < ${MAX_DEB}; e++) {
    vec4 a = uDeb[e];
    float amt = uDebB[e].x, age = uT - a.z;
    if (amt <= 0.0 || age < 0.0 || age > ${DEB_LIFE}.0) continue;
    // The nearest tornado takes the pieces; with none they blow downwind.
    vec2 S = a.xy, C = S + WDIR * 60.0;
    float rc = 25.0, best = 1e9;
    for (int i = 0; i < 4; i++) {
      vec4 f = uFoot[i];
      float d = length(f.xy - S);
      if (f.w > 0.0 && d < best) { best = d; C = f.xy; rc = max(f.z * 0.3, 30.0); }
    }
    // A screen box round the whole flight, from the yard to the funnel and up.
    vec2 Mc = (S + C) * 0.5;
    vec3 M = vec3(Mc.x, 0.0, Mc.y);
    float zm = depthOf(M);
    if (zm < 80.0) continue;
    float mm = uFoc / zm;
    if (length(s - proj(M + vec3(0.0, 120.0, 0.0))) > (length(S - C) * 0.5 + rc + 320.0) * mm * 1.4) continue;
    vec2 d0 = S - C;
    float r0 = max(length(d0), 1.0), th0 = atan(d0.y, d0.x);
    float sun = 1.0 - sunCover(vec3(C.x, 0.0, C.y) * 0.001);
    for (int i = 0; i < 40; i++) {
      if (float(i) > 8.0 + 32.0 * amt) break;
      float fi = float(i);
      vec4 h = vec4(th(vec2(a.w, fi)), th(vec2(fi, a.w + 1.0)), th(vec2(a.w + 2.0, fi * 1.7)), th(vec2(fi * 2.3, a.w + 3.0)));
      float tau = age - h.x * 2.5;
      if (tau < 0.0) continue;
      // Up and in: the piece rides the inflow to the funnel and climbs it.
      float TA = 3.0 + 4.0 * h.y, ka = smoothstep(0.0, 1.0, clamp(tau / TA, 0.0, 1.0));
      float r = mix(r0, rc * (0.8 + 0.6 * h.z), ka), yTop = 40.0 + 220.0 * h.y * h.y;
      float y = yTop * ka;
      float ang = th0 - (0.25 + 0.5 * h.w) * tau * (1.0 + 2.0 * ka);
      // Out and down: flung from the funnel, it falls at its own slow pace, a sheet slower than a board.
      if (tau > TA) {
        float tb = tau - TA;
        r += (15.0 + 25.0 * h.z) * tb;
        y = yTop - (8.0 + 14.0 * h.z) * max(tb - 0.6, 0.0);
      }
      if (y <= 0.0) continue;
      vec3 P = vec3(C.x + r * cos(ang), y, C.y + r * sin(ang));
      float zp = depthOf(P);
      if (zp < 20.0) continue;
      // Each piece is a tumbling shard: a short bar that turns as it flies.
      float rr = (0.3 + 1.6 * h.z * h.z) * uFoc / zp;
      vec2 c = proj(P);
      if (length(s - c) > rr + 2.0 * px) continue;
      float spin = uT * (2.0 + 5.0 * h.y) + fi;
      vec2 ax = vec2(cos(spin), sin(spin) * (0.3 + 0.7 * h.x)) * rr;
      float sx, u;
      float k = segCover(s, c - ax, c + ax, rr * 0.22, px, sx, u);
      if (k <= 0.0) continue;
      // Tin tumbles and flashes as it turns to the light; torn boards show pale wood.
      float glint = h.w > 0.5 ? pow(max(sin(uT * (6.0 + 8.0 * h.x) + fi), 0.0), 6.0) : 0.0;
      vec3 col = mix(vec3(0.2, 0.16, 0.12), vec3(0.45, 0.46, 0.47) * (1.0 + 3.0 * glint), step(0.5, h.w)) * (uSunCol * 0.4 * sun + uAmb * 0.6);
      put(hazed(col, rd, zp), k * 0.9, zp);
    }
  }
}
`;
