// Tornado alley: the damage field. Each ground point keeps the peak wind a tornado gave it, until Clear.
// The CPU part fills a 50 m grid near each working tornado and uploads the changed rows.
// Sites (a barn, a bin, a sign) keep their own exact peak, the time it rose, and its direction.
// The GLSL part reads the grid: dmgAt(xz) returns the peak in m/s and its direction.
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
function windDir(dx, dz, d) {
  const tx = dz / d, tz = -dx / d;
  const x = tx - 0.35 * dx / d, z = tz - 0.35 * dz / d, n = Math.hypot(x, z) || 1;
  return [x / n, z / n];
}

/* ---------- the grid ---------- */
// 512 cells of 50 m each way: x from -12.8 to 12.8 km, z from -25.6 km to the eye.
export const DMG_N = 512, DMG_X0 = -12800, DMG_Z0 = -25600, DMG_CELL = 50;

export function damageState() {
  const D = {
    // RGBA8 per cell: peak wind over 128 m/s, its direction x and z as 0.5 +- 0.5, and a spare byte.
    px: new Uint8Array(DMG_N * DMG_N * 4),
    // The rows changed since the last upload.
    lo: DMG_N, hi: -1,
    tex: null, gl: null,
    // Sites: { x, z, peak, dx, dz, t } each.
    sites: [],
  };
  damageReset(D);
  return D;
}
// Mends everything: the grid holds no wind, every site its rest.
export function damageReset(D) {
  for (let i = 0; i < D.px.length; i += 4) { D.px[i] = 0; D.px[i + 1] = 128; D.px[i + 2] = 128; D.px[i + 3] = 0; }
  D.lo = 0; D.hi = DMG_N - 1;
  for (const s of D.sites) Object.assign(s, { peak: 0, dx: 0, dz: 0, t: -1e4 });
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
`;
