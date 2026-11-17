// Load order: none.
// The module builds nothing until a caller asks.
import {
  BufferAttribute, BufferGeometry, ClampToEdgeWrapping, Color, DataTexture, DataUtils, HalfFloatType,
  LinearFilter, Matrix3, Matrix4, MeshStandardMaterial, RGBAFormat, RepeatWrapping, Vector3, Vector4,
} from 'three';
import type { Material, Texture } from 'three';
import type { Star } from '../core/catalog.ts';
import { SKY_GLSL, skyU } from '../sky/haze.ts';

/* ---------- the objective glass: tonight's stars, bent by the lens ---------- */
// The hero scope's objective reflects the real catalog stars.
// A baked sky map holds the stars by right ascension and declination.
// The glass reflects the view ray and turns it into that frame.

const RAD = Math.PI / 180;
// The sky map's size: 2048 by 1024 texels, about 0.18 degrees each.
const ENV_W = 2048, ENV_H = 1024;
// The glass reflects this share face on: a coated crown glass.
const F0 = 0.05;
// At a grazing angle it reflects up to this share.
const F_MAX = 0.3;

// Copied from sky/stars.ts, tint: a blackbody tint from B-V.
// Unknown colour is white.
function tint(ci: number, out: Color): Color {
  if (Number.isNaN(ci)) return out.setRGB(1, 1, 1);
  const bv = Math.max(-0.4, Math.min(2, ci));
  const t = (4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  return out.setRGB(c(r), c(g), c(b));
}

/* ---------- the star map ---------- */
// Bakes the catalog into an equirect map.
// u is right ascension, v is declination.
// Each star is a soft core.
// Bright stars add a faint halo.
// A core's peak times F0 is its brightness on the glass.
// The brightest few just reach the bloom threshold of 2.
// Faint stars stay visible as a fine dust.
export function buildStarEnv(stars: readonly Star[]): Texture {
  const W = ENV_W, H = ENV_H;
  const acc = new Float32Array(W * H * 3);
  const seen = new Uint8Array(W * H);
  const hit: number[] = [];
  const c = new Color();
  // The Gaussian splits into a row part and a column part.
  const wx = new Float32Array(W);
  // Adds one round Gaussian dot of width sg texels.
  const dot = (u: number, v: number, cd: number, sg: number, peak: number): void => {
    const ry = Math.ceil(2.6 * sg), rx = Math.min(W / 2, Math.ceil((2.6 * sg) / cd));
    const y0 = Math.max(0, Math.floor(v - ry)), y1 = Math.min(H - 1, Math.floor(v + ry));
    const x0 = Math.floor(u - rx), nx = Math.floor(u + rx) - x0 + 1;
    const inv = 1 / (2 * sg * sg);
    for (let i = 0; i < nx; i++) {
      const dx = (x0 + i + 0.5 - u) * cd;
      wx[i] = Math.exp(-dx * dx * inv);
    }
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - v, wy = Math.exp(-dy * dy * inv) * peak, row = y * W;
      for (let i = 0; i < nx; i++) {
        const w = wx[i] * wy;
        if (w < 0.03 * peak) continue;
        const p = row + (((x0 + i) % W) + W) % W;
        acc[p * 3] += c.r * w;
        acc[p * 3 + 1] += c.g * w;
        acc[p * 3 + 2] += c.b * w;
        if (!seen[p]) { seen[p] = 1; hit.push(p); }
      }
    }
  };
  for (const s of stars) {
    // 0 at magnitude 6.5, 1 at Sirius, as in sky/stars.ts.
    const k = Math.max(0, Math.min(1, (6.5 - s.mag) / 7.9));
    // A steep ladder: a few bright stars, many mid, a fine dust.
    const peak = (0.06 + 2.0 * Math.pow(k, 2.0)) / F0;
    // The core's width in texels.
    const sg = 0.9 + 1.4 * k;
    tint(s.ci, c);
    const u = ((((s.ra % 360) + 360) % 360) / 360) * W, v = ((s.dec + 90) / 180) * H;
    // Near the poles a texel spans less sky, so the dot widens.
    const cd = Math.max(Math.cos(s.dec * RAD), 0.02);
    dot(u, v, cd, sg, peak);
    // Stars brighter than about magnitude 3.3 wear a faint halo.
    if (k > 0.4) dot(u, v, cd, sg * 3, peak * 0.05);
  }
  // Half floats: zero bits are zero, so only lit texels convert.
  const data = new Uint16Array(W * H * 4);
  for (const p of hit) {
    data[p * 4] = DataUtils.toHalfFloat(acc[p * 3]);
    data[p * 4 + 1] = DataUtils.toHalfFloat(acc[p * 3 + 1]);
    data[p * 4 + 2] = DataUtils.toHalfFloat(acc[p * 3 + 2]);
  }
  const t = new DataTexture(data, W, H, RGBAFormat, HalfFloatType);
  t.wrapS = RepeatWrapping;
  t.wrapT = ClampToEdgeWrapping;
  // No mipmaps: the seam at right ascension zero stays clean.
  t.magFilter = t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/* ---------- the lens's shape ---------- */
// All lengths are in the glass mesh's own frame.
// The optical axis is +Z, through x = y = 0.
// radius: the glass's radius.
// edge: the rim's plane on the axis.
// a, b: the slope law, sin(tilt) = a r + b r^3.
// r runs from 0 at the centre to 1 at the rim.
// A low a lets the field slide fast across the centre.
// A high b crowds the sky into the rim.
// vignette: the outer share of the radius that darkens.
// A hood darkens a lens's rim the same way.
export type LensShape = { radius: number; edge: number; a: number; b: number; vignette?: number };

const slope = (L: LensShape, r: number): number => L.a * r + L.b * r * r * r;

// The front face with a short rim behind it.
// The normals follow the face's slope, so a close view shades smooth.
export function lensGeometry(L: LensShape, rim: number, segs = 128, rings = 24): BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  // The face's height over the rim plane at each ring.
  // The sum runs in from the rim.
  const zs: number[] = new Array(rings + 1).fill(0);
  const rAt = (j: number): number => Math.sqrt(j / rings);
  for (let j = rings - 1; j >= 0; j--) {
    const r0 = rAt(j), r1 = rAt(j + 1), s = slope(L, (r0 + r1) / 2);
    zs[j] = zs[j + 1] + L.radius * (r1 - r0) * (s / Math.sqrt(1 - s * s));
  }
  const n = new Vector3();
  const vert = (x: number, y: number, z: number, nx: number, ny: number, nz: number): void => {
    pos.push(x, y, z);
    n.set(nx, ny, nz).normalize();
    nor.push(n.x, n.y, n.z);
    uv.push(x / (2 * L.radius) + 0.5, y / (2 * L.radius) + 0.5);
  };
  // The face: rings out from the vertex.
  // Rings crowd toward the rim, where the face bends most.
  for (let j = 0; j <= rings; j++) {
    const r = rAt(j), s = slope(L, r);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      vert(c * r * L.radius, sn * r * L.radius, L.edge + zs[j], c * s, sn * s, Math.sqrt(1 - s * s));
    }
  }
  const row = segs + 1;
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segs; i++) {
      const a = j * row + i, b = a + 1, cc = a + row, d = cc + 1;
      // The first ring is a fan from the vertex.
      idx.push(a, cc, d);
      if (j > 0) idx.push(a, d, b);
    }
  }
  // The rim: a band round the edge, facing out.
  const base = pos.length / 3;
  for (const z of [L.edge, L.edge - rim]) {
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2, x = L.radius * Math.cos(a), y = L.radius * Math.sin(a);
      vert(x, y, z, x, y, 0);
    }
  }
  for (let i = 0; i < segs; i++) {
    const a = base + i, b = a + 1, cc = a + row, d = cc + 1;
    idx.push(a, cc, b, b, cc, d);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

/* ---------- the glass material ---------- */
export type Glass = {
  material: Material;
  // m: the sky matrix from sky/stars.ts, catalog frame to world.
  setSky(m: Matrix4 | Matrix3): void;
  // dirWorld: the target star's direction.
  // k = 0 adds no boost.
  setTarget(dirWorld: Vector3, k: number): void;
  // The slit seen from the glass: azimuth and half width, in degrees.
  setSlit(azDeg: number, halfWidthDeg: number, on: boolean): void;
  // null leaves a dark coated glass with no stars.
  setEnv(env: Texture | null): void;
};

const f = (v: number): string => v.toFixed(5);

// The inner face: the same law, turned over, steeper and off centre.
// Its field is smaller and upside down.
// It slides the other way when the tube turns.
const INNER = { a: 0.16, b: 0.3, off: [0.2, -0.12], gain: 0.5 };
// Toward the rim the stars smear along the rim into short arcs.
// SMEAR is the arc's half length at the rim, in radii.
const SMEAR = 0.035;
// The colours part toward the rim by this share of the slope.
const CHROMA = 0.022;

// lens defaults to a unit glass.
export function makeGlassMaterial(env: Texture | null, lens: LensShape = { radius: 1, edge: 0, a: 0.1, b: 0.4 }): Glass {
  // A tiny black map stands in until the stars arrive.
  const none = new DataTexture(new Uint16Array(4), 1, 1, RGBAFormat, HalfFloatType);
  none.needsUpdate = true;
  const U = {
    uStars: { value: (env ?? none) as Texture },
    uHasStars: { value: env ? 1 : 0 },
    uSky: { value: new Matrix3() },
    uTarget: { value: new Vector3(0, 1, 0) },
    uTargetK: { value: 0 },
    uSlit: { value: new Vector4(0, 0, 0, 0) },
  };
  // The glass's body is near black and glossy.
  // Lamps still leave small sharp highlights on it.
  const m = new MeshStandardMaterial({ color: 0x050607, metalness: 0, roughness: 0.04 });
  const vig = lens.vignette ?? 0.12;
  const decl = /* glsl */`#include <common>
    varying vec3 vGlassP, vGlassW, vGlassX, vGlassY, vGlassZ;`;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, skyU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', decl).replace('#include <project_vertex>', /* glsl */`#include <project_vertex>
      vGlassP = transformed;
      vGlassW = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vGlassX = normalize(mat3(modelMatrix)[0]);
      vGlassY = normalize(mat3(modelMatrix)[1]);
      vGlassZ = normalize(mat3(modelMatrix)[2]);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', /* glsl */`${decl}
      uniform sampler2D uStars;
      uniform float uHasStars, uTargetK;
      uniform mat3 uSky;
      uniform vec3 uTarget;
      uniform vec4 uSlit;
      ${SKY_GLSL}
      // A face normal in the lens frame at lens point q.
      // q has length 1 at the rim.
      // k scales the slope.
      // A negative k turns the face over.
      vec3 faceN(vec2 q, float a, float b, float k) {
        float r = length(q);
        vec2 d = r > 1e-5 ? q / r : vec2(0.0);
        float s = clamp(k * (a * r + b * r * r * r), -0.97, 0.97);
        return vec3(d * s, sqrt(1.0 - s * s));
      }
      vec3 toWorld(vec3 n) { return normalize(n.x * vGlassX + n.y * vGlassY + n.z * vGlassZ); }
      // The dome's dark inside: below the horizon, and past the slit.
      float openSky(vec3 r) {
        // Low sky fades out, as air dims it near the horizon.
        float o = smoothstep(-0.02, 0.2, r.y);
        if (uSlit.z > 0.5) {
          vec3 across = vec3(cos(uSlit.x), 0.0, sin(uSlit.x)), fwd = vec3(sin(uSlit.x), 0.0, -cos(uSlit.x));
          // The slit's edge is soft over about 3 degrees.
          o *= smoothstep(uSlit.y + 0.026, uSlit.y - 0.026, abs(asin(clamp(dot(r, across), -1.0, 1.0))));
          // The slit runs 20 degrees past the zenith.
          o *= smoothstep(1.93, 1.9, atan(r.y, dot(r, fwd)));
        }
        return o;
      }
      // The stars in a world direction.
      // fade dims them where the map is shrunk below a texel.
      vec3 starsAt(vec3 r, float fade) {
        vec3 e = transpose(uSky) * r;
        vec2 st = vec2(atan(-e.y, e.x) / 6.2831853 + 1.0, asin(clamp(e.z, -1.0, 1.0)) / 3.1415927 + 0.5);
        vec3 s = texture2D(uStars, st).rgb * (uHasStars * fade);
        // The target star reads brightest.
        return s * (1.0 + uTargetK * exp(-(1.0 - dot(r, uTarget)) * 12000.0));
      }
      // The stars in a world direction, where the dome is open.
      vec3 seen(vec3 r, float fade) { return starsAt(r, fade) * openSky(r); }
      // The night sky's glow gives the reflected field a faint base.
      vec3 glow(vec3 r) { return skyColor(r) * 25.0 * openSky(r); }`)
      .replace('#include <lights_fragment_maps>', /* glsl */`#include <lights_fragment_maps>
      {
        vec3 V = normalize(vGlassW - cameraPosition);
        vec2 q = vGlassP.xy / ${f(lens.radius)};
        float rr = length(q);
        vec3 nG = toWorld(faceN(q, ${f(lens.a)}, ${f(lens.b)}, 1.0));
        vec3 rG = reflect(V, nG);
        // Where the map shrinks below a texel, the stars fade.
        // So they do not sparkle.
        float fade = clamp(0.0046 / max(length(fwidth(rG)), 1e-6), 0.15, 1.0);
        // Five samples along the rim's line draw each star as an arc.
        // The arc and the colour spread grow toward the rim.
        vec2 tng = rr > 1e-5 ? vec2(-q.y, q.x) / rr : vec2(1.0, 0.0);
        float arc = ${f(SMEAR)} * rr * rr * rr;
        float ch = ${f(CHROMA)} * rr * rr;
        vec3 field = vec3(0.0);
        for (int i = 0; i < 5; i++) {
          vec2 qi = q + tng * arc * (float(i) - 2.0) * 0.5;
          field.r += seen(reflect(V, toWorld(faceN(qi, ${f(lens.a)}, ${f(lens.b)}, 1.0 + ch))), fade).r;
          field.g += seen(reflect(V, toWorld(faceN(qi, ${f(lens.a)}, ${f(lens.b)}, 1.0))), fade).g;
          field.b += seen(reflect(V, toWorld(faceN(qi, ${f(lens.a)}, ${f(lens.b)}, 1.0 - ch))), fade).b;
        }
        field *= 0.2;
        // The inner face's field: smaller, upside down, off centre.
        vec3 rI = reflect(V, toWorld(faceN(q - vec2(${f(INNER.off[0])}, ${f(INNER.off[1])}), ${f(INNER.a)}, ${f(INNER.b)}, -1.0)));
        vec3 inner = seen(rI, fade) + glow(rI);
        // A faint ghost sits a little off the main field.
        vec3 ghost = seen(reflect(V, normalize(nG + 0.025 * vGlassX - 0.018 * vGlassY)), fade);
        // Fresnel: the glass reflects more at a slant.
        float cv = clamp(dot(nG, -V), 0.0, 1.0);
        float F = ${f(F0)} + ${f(F_MAX - F0)} * pow(1.0 - cv, 5.0);
        // The coating tints the reflection: magenta face on, green at a slant.
        vec3 coat = mix(vec3(0.62, 1.0, 0.72), vec3(1.0, 0.62, 0.95), smoothstep(0.3, 0.95, cv));
        // A hood's soft shadow darkens the outer rim.
        float hood = smoothstep(1.0, ${f(1 - vig)}, rr);
        vec3 refl = mix(vec3(1.0), coat, 0.35) * field + coat * glow(rG) + vec3(1.0, 0.78, 0.55) * ${f(INNER.gain)} * inner + 0.08 * ghost;
        reflectedLight.indirectSpecular += hood * F * refl;
        // The body: a deep blue-black, a little lighter toward the top.
        vec2 upL = vec2(vGlassX.y, vGlassY.y);
        float top = dot(q, upL / max(length(upL), 1e-4));
        reflectedLight.indirectSpecular += vec3(0.0016, 0.0022, 0.0046) * (0.75 + 0.5 * top);
        // A faint cool sheen of sky lies on the upper glass.
        reflectedLight.indirectSpecular += hood * vec3(0.006, 0.01, 0.02) * smoothstep(0.0, 1.0, top) * rr * rr;
        // The coating shows as two soft crescents near the rim.
        // Green where the view slants, magenta where it meets the face.
        float band = smoothstep(0.68, 0.92, rr) * smoothstep(1.0, 0.94, rr);
        reflectedLight.indirectSpecular += band * 0.075 * (vec3(0.1, 0.42, 0.2) * smoothstep(0.93, 0.8, cv) + vec3(0.4, 0.1, 0.34) * smoothstep(0.86, 0.97, cv));
      }`);
  };
  m.customProgramCacheKey = () => `hero-glass|${f(lens.radius)}|${f(lens.a)}|${f(lens.b)}|${f(vig)}`;
  return {
    material: m,
    setSky(s) {
      if (s instanceof Matrix4) U.uSky.value.setFromMatrix4(s);
      else U.uSky.value.copy(s);
    },
    setTarget(dir, k) {
      U.uTarget.value.copy(dir).normalize();
      U.uTargetK.value = k;
    },
    setSlit(azDeg, halfWidthDeg, on) {
      U.uSlit.value.set(azDeg * RAD, halfWidthDeg * RAD, on ? 1 : 0, 0);
    },
    setEnv(e) {
      U.uStars.value = e ?? none;
      U.uHasStars.value = e ? 1 : 0;
    },
  };
}
