// Jet hover scene: the sky, the far ranges, the apron, the craft and its lights.
// Units are metres. The pad centre is the origin; y points up.
// three.js 0.186 WebGPU; every shader is TSL.
import * as THREE from 'three/webgpu';
import { HOURS } from '../shared/daytime.js';
import {
  Fn, vec2, vec3, float, uniform, positionWorld, positionLocal, positionWorldDirection, cameraPosition,
  normalize, mix, smoothstep, exp, max, min, abs, fract, floor, sin, cos, dot, atan, fwidth, mx_noise_float, reflect, texture,
} from 'three/tsl';

// The dusk sun lies behind the craft, low in the west (-z).
export const SUN = new THREE.Vector3(0.18, -0.05, -1).normalize();

/* ---------- four times of day ---------- */
// Each key sets the sky, the ranges, the apron light, the lights, the grade and the gas.
// sun: the key light's direction; at night it is the moon.
// zen, hor, low: the sky from zenith to the horizon. glow, wide, halo: light round the sun.
// flank, crest: a range's foot and top. lights: far lights. E, sunE: apron sky and sun light.
// pGain, pTint, pHaze: the photo plate's grade: exposure, colour, haze.
const TOD = {
  dawn: {
    sun: [-0.12, 0.03, -1], zen: [0.025, 0.04, 0.085], hor: [0.09, 0.08, 0.1], low: [0.04, 0.045, 0.07],
    glow: [0.5, 0.22, 0.08], glowW: 0.03, wide: [0.08, 0.05, 0.06], halo: 0.9, stars: 0,
    flank: [0.015, 0.018, 0.03], crest: [0.06, 0.045, 0.05], lights: 0.35,
    E: [0.06, 0.065, 0.09], sunE: [2.0, 1.2, 0.7], haze: 0.0045,
    hemiSky: [0.54, 0.56, 0.69], hemiGround: [0.13, 0.11, 0.11], hemiI: 1.1, rimCol: [1.0, 0.72, 0.56], rimI: 2.0,
    expo: 0.85, key: [0.95, 0.92, 1.0], pull: 0.25, smoke: [0.1, 0.1, 0.13], plume: 0.9,
    pGain: 0.9, pTint: [1.15, 0.95, 0.9], pHaze: 0.35,
  },
  day: {
    sun: [-0.45, 0.62, -0.65], zen: [0.22, 0.32, 0.5], hor: [0.62, 0.56, 0.48], low: [0.1, 0.09, 0.07],
    glow: [0.25, 0.2, 0.12], glowW: 0.08, wide: [0.15, 0.12, 0.08], halo: 0, stars: 0,
    flank: [0.18, 0.17, 0.17], crest: [0.32, 0.29, 0.26], lights: 0,
    E: [0.55, 0.6, 0.7], sunE: [1.6, 1.45, 1.2], haze: 0.004,
    hemiSky: [0.72, 0.77, 0.85], hemiGround: [0.35, 0.31, 0.28], hemiI: 1.4, rimCol: [1.0, 0.94, 0.86], rimI: 3.0,
    expo: 0.75, key: [1.04, 0.99, 0.9], pull: 0.22, smoke: [0.5, 0.49, 0.47], plume: 0.75,
    pGain: 2.2, pTint: [1.2, 1.1, 0.95], pHaze: 0.55,
  },
  dusk: {
    sun: [0.18, -0.05, -1], zen: [0.003, 0.006, 0.02], hor: [0.016, 0.026, 0.052], low: [0.012, 0.02, 0.036],
    glow: [0.16, 0.06, 0.02], glowW: 0.02, wide: [0.03, 0.026, 0.04], halo: 0, stars: 0,
    flank: [0.006, 0.008, 0.014], crest: [0.03, 0.022, 0.03], lights: 1,
    E: [0.02, 0.028, 0.052], sunE: [0, 0, 0], haze: 0.0026,
    hemiSky: [0.23, 0.3, 0.47], hemiGround: [0.05, 0.04, 0.04], hemiI: 0.95, rimCol: [1.0, 0.71, 0.54], rimI: 1.4,
    expo: 0.9, key: [0.8, 0.9, 1.06], pull: 0.3, smoke: [0.035, 0.05, 0.09], plume: 1,
    pGain: 0.3, pTint: [0.85, 0.9, 1.05], pHaze: 0.3,
  },
  night: {
    sun: [0.5, 0.45, -0.75], zen: [0.001, 0.0015, 0.004], hor: [0.006, 0.008, 0.014], low: [0.006, 0.007, 0.01],
    glow: [0.02, 0.014, 0.01], glowW: 0.03, wide: [0.004, 0.005, 0.008], halo: 0, stars: 1,
    flank: [0.002, 0.0025, 0.004], crest: [0.006, 0.007, 0.011], lights: 1.6,
    E: [0.006, 0.008, 0.014], sunE: [0.03, 0.035, 0.05], haze: 0.0022,
    hemiSky: [0.11, 0.15, 0.25], hemiGround: [0.02, 0.02, 0.02], hemiI: 0.5, rimCol: [0.62, 0.7, 0.88], rimI: 0.6,
    expo: 1.0, key: [0.75, 0.88, 1.1], pull: 0.4, smoke: [0.01, 0.014, 0.024], plume: 1.1,
    pGain: 0.06, pTint: [0.7, 0.8, 1.1], pHaze: 0.1,
  },
};
export const TIMES = /** @type {const} */ (['dawn', 'day', 'dusk', 'night']);
const KEYS = TIMES.map(n => ({ h: HOURS[n], ...TOD[n] }));
const v3 = a => new THREE.Vector3(...a);
const c3 = a => new THREE.Color(...a);
// The shaders read these; tod() writes them.
const T = {
  sun: uniform(SUN.clone()), zen: uniform(c3(TOD.dusk.zen)), hor: uniform(c3(TOD.dusk.hor)), low: uniform(c3(TOD.dusk.low)),
  glow: uniform(c3(TOD.dusk.glow)), glowW: uniform(TOD.dusk.glowW), wide: uniform(c3(TOD.dusk.wide)), halo: uniform(0), stars: uniform(0),
  flank: uniform(c3(TOD.dusk.flank)), crest: uniform(c3(TOD.dusk.crest)), lights: uniform(1),
  E: uniform(c3(TOD.dusk.E)), sunE: uniform(c3(TOD.dusk.sunE)),
  pGain: uniform(TOD.dusk.pGain), pTint: uniform(c3(TOD.dusk.pTint)), pHaze: uniform(TOD.dusk.pHaze),
};
// Blends the two keys round the hour, on the 24-hour circle.
export function blendTod(hour) {
  let i = KEYS.length - 1;
  for (let k = 0; k < KEYS.length; k++) if (KEYS[k].h <= hour) i = k;
  const a = KEYS[i], b = KEYS[(i + 1) % KEYS.length];
  const span = (b.h - a.h + 24) % 24 || 24;
  const t = ((hour - a.h + 24) % 24) / span;
  const f = t * t * (3 - 2 * t);
  const out = {};
  for (const k of Object.keys(a)) {
    const x = a[k], y = b[k];
    out[k] = Array.isArray(x) ? x.map((v, j) => v + (y[j] - v) * f) : x + (y - x) * f;
  }
  return out;
}
// The apron: wet concrete slabs round the pad, out to this radius.
export const APRON_R = 260;

/* ---------- the sky, shared by the background and the apron ---------- */
const h11 = p => fract(sin(p.mul(127.1)).mul(43758.5453));
const h21 = p => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));
const n2 = p => mx_noise_float(p).mul(0.5).add(0.5);

// The sky: a zenith over a horizon, a warm band toward the sun, stars at night.
export const skyCol = Fn(([d]) => {
  const el = d.y;
  const ca = dot(normalize(d.xz.add(1e-5)), normalize(T.sun.xz.add(1e-5))).mul(0.5).add(0.5);
  const e0 = max(el, 0.0);
  const c = mix(T.hor, T.zen, e0.clamp(0.0, 1.0).sqrt()).toVar();
  // A thin band toward the sun under a wide glow.
  c.addAssign(T.glow.mul(exp(e0.div(T.glowW).negate())).mul(ca.pow(6.0)));
  c.addAssign(T.wide.mul(exp(e0.div(-0.12))).mul(ca.pow(2.0)));
  c.addAssign(T.low.mul(exp(e0.div(-0.06))));
  // A halo round a sun below the ranges.
  const cs = dot(d, T.sun);
  c.addAssign(T.glow.mul(exp(float(1.0).sub(cs).mul(-300.0)).mul(2.0).add(exp(float(1.0).sub(cs).mul(-30.0)).mul(0.5))).mul(T.halo));
  // Stars: one point in a few cells, faint near the horizon.
  const sc = vec2(atan(d.x, d.z.negate()), el).mul(900.0);
  const ci = floor(sc), fp = fract(sc).sub(0.5);
  const star = smoothstep(0.99, 0.993, h21(ci)).mul(exp(dot(fp, fp).mul(-30.0))).mul(h21(ci.add(3.0)).mul(0.5).add(0.1));
  c.addAssign(vec3(0.8, 0.85, 1.0).mul(star).mul(T.stars).mul(smoothstep(0.02, 0.12, el)));
  return c;
});
// The haze colour at the horizon in a direction.
export const hazeCol = Fn(([d]) => skyCol(normalize(vec3(d.x, 0.004, d.z))).mul(0.78));

// A ridge line along the azimuth, 0 to 1: broad masses, a few crests, fine wear.
// mesa flattens the tops into tables, as wind-cut desert rock.
const ridge = (az, f, seed, mesa) => {
  const a = n2(vec2(az.mul(f), seed));
  const b = float(1.0).sub(abs(mx_noise_float(vec2(az.mul(f * 3.1), seed + 7.1))));
  const c = n2(vec2(az.mul(f * 11.0), seed + 3.3));
  const mass = mesa ? smoothstep(0.42, 0.58, a) : a;
  return mass.mul(0.8).add(b.mul(b).mul(0.14)).add(c.mul(0.06));
};

// Far country: three ranges at true scale, each sunk in its own depth of haze.
// [distance m, base height m, relief m, frequency per radian, seed, haze per km, mesa]
const RANGES = [
  [18000, 250, 700, 7, 1.7, 0.19, false],
  [7000, 20, 240, 16, 9.3, 0.17, true],
  [2600, 4, 30, 34, 4.1, 0.17, false],
];
/* ---------- the photo plate: a real range behind the drawn country ---------- */
// Cadiz Wilderness, BLM California (Bob Wick), public domain; 200 mm at blue hour.
// The sky is masked out; alpha holds the land.
let plateLoaded;
// The first frame waits for the plate, 8 s at most.
export const plateReady = new Promise(res => { plateLoaded = res; setTimeout(res, 8000); });
const plateTex = new THREE.TextureLoader().load(new URL('./plate.webp', import.meta.url).href, () => plateLoaded(), undefined, () => plateLoaded());
plateTex.colorSpace = THREE.SRGBColorSpace;
plateTex.anisotropy = 8;
// The plate spans 19 degrees, about twice the photo's own field, centred where the lens looks.
const P_W = (19 * Math.PI) / 180, P_H = (P_W * 818) / 3840;
const P_AZ = (-2.6 * Math.PI) / 180, P_EL = -0.0006;

// Eye height, metres: the camera stands as a person on the apron.
export const EYE = 1.7;
export const farCountry = Fn(([d]) => {
  const az = atan(d.x, d.z.negate());
  const el = d.y;
  const px = max(fwidth(el), 1e-6);
  const c = skyCol(d).toVar();
  const hz = hazeCol(d);
  // The plain below the ranges: dark, and the haze takes it at the horizon.
  const plainOn = float(1.0).sub(smoothstep(px.negate(), px, el));
  c.assign(mix(c, hz.mul(0.9), plainOn));
  // Where the plate lies, the drawn ranges give way; its side edges fade.
  const pu = az.sub(P_AZ - P_W / 2).div(P_W), pv = el.sub(P_EL).div(P_H);
  const inPlate = smoothstep(0.0, 0.07, pu).mul(smoothstep(0.0, 0.07, float(1.0).sub(pu)));
  for (const [D, base, amp, f, seed, k, mesa] of RANGES) {
    // Earth curvature sinks a far range a little.
    const top = ridge(az, f, seed, mesa).mul(amp).add(base).sub(EYE).div(D).sub(D / 12.74e6);
    const on = float(1.0).sub(smoothstep(px.negate(), px, el.sub(top))).mul(float(1.0).sub(inPlate));
    const haze = 1 - Math.exp((-D / 1000) * k);
    // The flank darkens toward its foot; the crest takes the last light.
    const flank = smoothstep(top.sub(0.004), top, el);
    const col = mix(T.flank, T.crest, flank).mul(1 - haze).add(hz.mul(haze));
    c.assign(mix(c, col, on));
  }
  // The plate: the photo graded for the hour and sunk in the haze.
  const ps = texture(plateTex, vec2(pu, pv));
  const pOn = ps.a.mul(inPlate).mul(smoothstep(-0.002, 0.0, pv)).mul(float(1.0).sub(smoothstep(1.0, 1.002, pv)));
  const pCol = mix(ps.rgb.mul(T.pTint).mul(T.pGain), hz, T.pHaze);
  c.assign(mix(c, pCol, pOn));
  // Far lights at the foot of the near range: a sparse row of sodium and white.
  const cell = az.div(0.0035), ci = floor(cell);
  const has = smoothstep(0.66, 0.67, h11(ci.add(7.0)));
  const lx = fract(cell).sub(0.5).sub(h11(ci.add(3.0)).sub(0.5).mul(0.6)).mul(0.0035);
  const ly = el.sub(h11(ci.add(11.0)).mul(2.2).add(0.6).sub(EYE).div(2600));
  const pa = max(fwidth(az), 1e-6);
  const dd = lx.mul(lx).div(pa.mul(pa)).add(ly.mul(ly).div(px.mul(px)));
  const lc = mix(vec3(1.0, 0.6, 0.26), vec3(0.85, 0.9, 1.0), smoothstep(0.69, 0.71, h11(ci.add(5.0))));
  c.addAssign(lc.mul(has).mul(exp(dd.mul(-0.8))).mul(h11(ci.add(9.0)).mul(2.5).add(1.2)).mul(T.lights));
  return c;
});

/* ---------- the apron: wet concrete, glow pools, a mirror of the far country ---------- */
function apronMaterial(U) {
  const m = new THREE.MeshBasicNodeMaterial({ fog: false });
  m.colorNode = Fn(() => {
    const P = positionWorld;
    const p = P.xz;
    const r = p.length();
    const Vr = P.sub(cameraPosition);
    const dist = Vr.length();
    const V = Vr.div(dist);
    const apron = float(1.0).sub(smoothstep(APRON_R - 20, APRON_R, r));
    // Slabs: joints every five metres; they fade where a pixel spans a slab.
    const g = abs(fract(p.div(5.0).add(0.5)).sub(0.5)).mul(5.0);
    const fw = fwidth(p);
    const jw = max(fw.x.add(fw.y), 0.02);
    const joint = float(1.0).sub(smoothstep(0.0, jw, min(g.x, g.y))).mul(apron).mul(float(1.0).sub(smoothstep(0.4, 1.6, jw)));
    const grain = n2(p.mul(3.1)).mul(0.5).add(n2(p.mul(0.7)).mul(0.5));
    const slab = h21(floor(p.div(5.0))).mul(0.25).add(0.85);
    const alb = mix(vec3(0.045, 0.045, 0.04).mul(n2(p.mul(0.05)).mul(0.6).add(0.7)), vec3(0.15, 0.148, 0.14).mul(grain.mul(0.3).add(0.85)).mul(slab), apron).toVar();
    alb.mulAssign(float(1.0).sub(joint.mul(0.55)));
    // Scorch and soot under the nozzles.
    const soot = float(0.0).toVar();
    for (let i = 0; i < 2; i++) { const q = p.sub(U.hot[i].xz); soot.addAssign(exp(dot(q, q).div(-2.4))); }
    alb.mulAssign(float(1.0).sub(soot.clamp(0.0, 1.0).mul(0.6).mul(apron)));
    // Light: the sky above, then the nozzles and the hot pools.
    const E = T.E.add(T.sunE.mul(max(T.sun.y, 0.0))).toVar();
    const hot = vec3(0.0).toVar();
    for (let i = 0; i < 3; i++) {
      const L = U.noz[i].xyz.sub(P);
      const d2 = dot(L, L);
      E.addAssign(U.hotCol.mul(U.noz[i].w).mul(L.y.div(d2.sqrt())).div(d2));
      const q = p.sub(U.hot[i].xz);
      const q2 = dot(q, q);
      hot.addAssign(U.hotCol.mul(U.hot[i].w).mul(exp(q2.div(-0.5)).mul(2.2).add(float(0.5).div(q2.div(2.0).add(1.0)))));
    }
    const c = alb.mul(E).add(hot.mul(apron.mul(0.65).add(0.35)).mul(alb.mul(4.0).add(0.25))).toVar();
    // Damp patches: a mirror for the far country and the plumes.
    const wet = smoothstep(0.55, 0.85, n2(p.mul(0.03).add(4.0)).mul(0.6).add(n2(p.mul(0.3)).mul(0.25)).add(n2(p.mul(1.7)).mul(0.15))).mul(apron);
    const cosv = max(V.y.negate(), 0.0);
    const fres = float(1.0).sub(cosv).pow(5.0).mul(0.98).add(0.02);
    const R = reflect(V, vec3(0, 1, 0));
    // Rough concrete blurs the mirror; wet patches keep it sharp.
    const refl = farCountry(normalize(R.add(vec3(0, float(0.006).mul(float(1.0).sub(wet)), 0)))).mul(fres).mul(wet.mul(0.75).add(0.12)).toVar();
    // Each plume mirrors as a soft streak toward the eye.
    for (let i = 0; i < 2; i++) {
      const a = U.hot[i].xyz;
      const rd = normalize(R.xz.add(1e-5));
      const to = a.xz.sub(p);
      const along = max(dot(to, rd), 0.0);
      const side = to.sub(rd.mul(along)).length();
      const hgt = along.mul(R.y).div(max(R.xz.length(), 1e-3));
      const span = U.noz[i].y;
      const w = along.mul(float(1.0).sub(wet)).mul(0.02).add(0.35);
      const mk = exp(side.mul(side).div(w.mul(w)).negate()).mul(float(1.0).sub(smoothstep(span.mul(0.6), span.add(0.5), hgt)));
      refl.addAssign(U.hotCol.mul(U.hot[i].w).mul(mk).mul(wet.mul(1.6).add(0.3)).mul(fres.add(0.15)));
    }
    c.addAssign(refl);
    // Haze thickens with distance toward the horizon colour.
    const f = float(1.0).sub(exp(dist.mul(U.haze).negate()));
    return mix(c, hazeCol(V), f);
  })();
  return m;
}

/* ---------- the craft ---------- */
// A loft through superellipse rings: [x, half width, top, bottom, centre y].
function loft(rings, seg = 28, n = 2.6) {
  const pos = [], idx = [];
  for (const [x, w, ht, hb, yc] of rings) {
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const z = w * Math.sign(c) * Math.abs(c) ** (2 / n);
      const y = yc + (s >= 0 ? ht : hb) * Math.sign(s) * Math.abs(s) ** (2 / n);
      pos.push(x, y, z);
    }
  }
  const row = seg + 1;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * row + j, b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// A flat plate from a planform in (x, z), with a soft bevel.
function plate(pts, thick, y = 0) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.4, bevelSize: 0.07, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(Math.PI / 2);
  g.translate(0, y + thick / 2, 0);
  return g;
}

// Nozzle and lift-fan places in the craft's frame.
export const NOZ = [new THREE.Vector3(-3.25, -1.62, 0.8), new THREE.Vector3(-3.25, -1.62, -0.8)];
export const FAN = new THREE.Vector3(2.1, -0.78, 0);
export const NOZ_R = 0.4;

export function buildCraft() {
  const grp = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.48, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.7, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.06, metalness: 0.9 });
  const body = loft([
    [7.2, 0.01, 0.01, 0.01, 0.02],
    [6.4, 0.24, 0.22, 0.2, 0.04],
    [5.2, 0.55, 0.45, 0.42, 0.08],
    [3.8, 0.85, 0.62, 0.55, 0.12],
    [2.4, 1.25, 0.66, 0.66, 0.1],
    [1.0, 1.62, 0.66, 0.74, 0.06],
    [-1.0, 1.72, 0.6, 0.76, 0.04],
    [-3.0, 1.66, 0.52, 0.74, 0.02],
    [-5.0, 1.42, 0.44, 0.62, 0.02],
    [-6.6, 1.18, 0.36, 0.46, 0.04],
    [-7.0, 0.95, 0.28, 0.34, 0.06],
    [-7.05, 0.01, 0.01, 0.01, 0.06],
  ]);
  grp.add(new THREE.Mesh(body, paint));
  // The canopy: a low dark bubble.
  const canopy = loft([
    [5.0, 0.01, 0.01, 0.01, 0.42],
    [4.3, 0.36, 0.3, 0.05, 0.48],
    [3.2, 0.52, 0.5, 0.05, 0.5],
    [2.0, 0.5, 0.42, 0.05, 0.5],
    [1.0, 0.3, 0.18, 0.05, 0.5],
    [0.6, 0.01, 0.01, 0.01, 0.5],
  ], 20, 2.2);
  grp.add(new THREE.Mesh(canopy, glass));
  // The wing: one delta plate through the body.
  grp.add(new THREE.Mesh(plate([[1.9, 1.2], [-3.3, 5.7], [-4.5, 5.7], [-5.4, 1.4], [-5.4, -1.4], [-4.5, -5.7], [-3.3, -5.7], [1.9, -1.2]], 0.12, -0.1), paint));
  // Tailplanes.
  grp.add(new THREE.Mesh(plate([[-5.0, 1.0], [-6.5, 3.3], [-7.25, 3.3], [-7.3, 1.0], [-7.3, -1.0], [-7.25, -3.3], [-6.5, -3.3], [-5.0, -1.0]], 0.08, 0.0), paint));
  // Two canted fins.
  for (const side of [1, -1]) {
    const s = new THREE.Shape([[-3.7, 0], [-5.9, 2.4], [-6.75, 2.4], [-7.05, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2 });
    g.translate(0, 0, -0.04);
    const m = new THREE.Mesh(g, paint);
    m.position.set(0, 0.3, side * 1.0);
    m.rotation.x = side * 0.36;
    grp.add(m);
  }
  // Intakes: dark mouths beside the canopy.
  for (const side of [1, -1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.5), dark);
    m.position.set(2.45, 0.02, side * 1.22);
    m.rotation.y = side * -0.32;
    grp.add(m);
  }
  // The swivel nozzles: short ducts bent straight down.
  const duct = new THREE.CylinderGeometry(NOZ_R * 1.12, NOZ_R * 1.3, 0.9, 28, 1, true);
  const petals = new THREE.CylinderGeometry(NOZ_R, NOZ_R * 1.1, 0.4, 28, 1, true);
  // The hot throat: petals glow round a white-hot centre.
  const uGlow = uniform(1.0);
  const glowMat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, fog: false });
  glowMat.colorNode = Fn(() => {
    const q = positionLocal.xz.div(NOZ_R * 0.97);
    const r = q.length(), a = atan(q.y, q.x);
    const pet = cos(a.mul(14.0)).mul(0.25).add(0.75);
    const c = mix(vec3(1.0, 0.3, 0.06), vec3(1.0, 0.78, 0.45), float(1.0).sub(smoothstep(0.2, 0.85, r)));
    return c.mul(exp(r.mul(r).mul(-3.0)).mul(2.4).add(0.6)).mul(mix(pet, 1.0, float(1.0).sub(smoothstep(0.4, 0.7, r)))).mul(uGlow);
  })();
  const mouth = new THREE.CircleGeometry(NOZ_R * 0.97, 32);
  mouth.rotateX(Math.PI / 2);
  for (const n of NOZ) {
    const d = new THREE.Mesh(duct, dark);
    d.position.set(n.x, n.y + 0.62, n.z);
    grp.add(d);
    const p = new THREE.Mesh(petals, dark);
    p.position.set(n.x, n.y + 0.2, n.z);
    grp.add(p);
    const g = new THREE.Mesh(mouth, glowMat);
    g.position.set(n.x, n.y + 0.3, n.z);
    grp.add(g);
  }
  // Gear: a nose leg and two mains, plain and dark.
  const leg = new THREE.CylinderGeometry(0.07, 0.07, 1.4, 10);
  const wheel = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 18);
  wheel.rotateX(Math.PI / 2);
  for (const [x, z, h] of [[4.3, 0, 1.25], [-1.5, 1.35, 1.35], [-1.5, -1.35, 1.35]]) {
    const l = new THREE.Mesh(leg, dark);
    l.scale.y = h / 1.4;
    l.position.set(x, -0.5 - h / 2, z);
    grp.add(l);
    const w = new THREE.Mesh(wheel, dark);
    w.position.set(x, -0.5 - h, z);
    grp.add(w);
  }
  // Wingtip lights: red to port, green to starboard.
  const dot3 = new THREE.SphereGeometry(0.06, 8, 6);
  for (const [z, col] of [[-5.72, 0xff2a1a], [5.72, 0x2aff6a]]) {
    const m = new THREE.Mesh(dot3, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.0), fog: false }));
    m.position.set(-3.9, -0.04, z);
    grp.add(m);
  }
  // The lift-fan door stands open behind the canopy.
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.0), paint);
  door.position.set(0.3, 1.05, 0);
  door.rotation.z = -1.05;
  grp.add(door);
  return { grp, uGlow };
}

/* ---------- the whole scene ---------- */
export function buildScene() {
  const scene = new THREE.Scene();
  scene.backgroundNode = farCountry(positionWorldDirection);
  const U = {
    hot: [0, 1, 2].map(() => uniform(new THREE.Vector4())),
    noz: [0, 1, 2].map(() => uniform(new THREE.Vector4())),
    hotCol: uniform(new THREE.Color(1.0, 0.42, 0.12)),
    haze: uniform(0.0026),
  };
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), apronMaterial(U));
  apron.rotation.x = -Math.PI / 2;
  scene.add(apron);

  const craft = buildCraft();
  scene.add(craft.grp);

  // Light: the sky dome, a cool rim from the last light, warm light from below.
  const hemi = new THREE.HemisphereLight(0x3a4d78, 0x0c0b0a, 0.95);
  scene.add(hemi);
  const rim = new THREE.DirectionalLight(0xffb48a, 1.4);
  rim.position.set(SUN.x * 30, 4, SUN.z * 30);
  scene.add(rim);
  const lamps = [0, 1, 2].map(() => {
    const l = new THREE.PointLight(0xff7a30, 0, 30, 2);
    scene.add(l);
    return l;
  });
  // Sets the sky, the light and the haze for an hour; returns the blend for main.
  const tod = hour => {
    const k = blendTod(hour);
    const sun = v3(k.sun).normalize();
    T.sun.value.copy(sun);
    for (const n of ['zen', 'hor', 'low', 'glow', 'wide', 'flank', 'crest', 'E', 'sunE', 'pTint']) T[n].value.setRGB(...k[n]);
    T.pGain.value = k.pGain; T.pHaze.value = k.pHaze;
    T.glowW.value = k.glowW; T.halo.value = k.halo; T.stars.value = k.stars; T.lights.value = k.lights;
    U.haze.value = k.haze;
    // Light colours are sRGB, as the hex values were.
    hemi.color.setRGB(...k.hemiSky, THREE.SRGBColorSpace); hemi.groundColor.setRGB(...k.hemiGround, THREE.SRGBColorSpace);
    hemi.intensity = k.hemiI;
    rim.color.setRGB(...k.rimCol, THREE.SRGBColorSpace); rim.intensity = k.rimI;
    rim.position.set(sun.x * 30, Math.max(sun.y * 30, 4), sun.z * 30);
    return k;
  };
  return { scene, apron, U, craft, lamps, hemi, rim, tod };
}
