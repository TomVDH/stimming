// Forge steel: one bar of square stock, its heat, its scale and its shape.
// 48 samples run from the tip (0) to the tongs (N - 1).
import * as THREE from 'three';
import { ringInto, loftIndex, RING } from './smithy.js';
import { HEAT, NOISE } from './shaders.js';

export const N = 48;
export const L0 = 0.5;
const A0 = 0.0125, R0 = 0.0024;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Heat rates, in toy time: about three times real.
const K_RAD = 4.2e-12, K_AIR = 0.005, ALPHA = 4e-5, K_FIRE = 0.42, K_ANVIL = 0.05;
// A vapour film slows the quench above 450 degrees C.
const K_WATER_HOT = 0.6, K_WATER = 2.2;

export function makeSteel() {
  const T = new Float32Array(N), S = new Float32Array(N);
  const a = new Float32Array(N), b = new Float32Array(N), len = new Float32Array(N);
  // Per sample: x from the tongs (negative toward the tip).
  const X = new Float32Array(N);
  // Per-sample exposure, set by the scene each step: fire, anvil, water.
  const fire = new Float32Array(N), onAnvil = new Float32Array(N), wet = new Float32Array(N);
  const st = { steam: 0, maxT: 20, shapeDirty: true, heatDirty: true };

  function reset(hot = false) {
    for (let i = 0; i < N; i++) {
      a[i] = A0; b[i] = A0; len[i] = L0 / (N - 1);
      const x = i * L0 / (N - 1);
      T[i] = hot ? 20 + 1080 * (x < 0.07 ? 1 : Math.exp(-(x - 0.07) / 0.08)) : 20;
      S[i] = hot ? 0.45 : 0.25;
    }
    st.shapeDirty = st.heatDirty = true;
    layout();
  }
  function layout() {
    X[N - 1] = 0;
    for (let i = N - 2; i >= 0; i--) X[i] = X[i + 1] - len[i];
  }
  const length = () => -X[0];

  // One step of the heat field. coal: the fire's core in degrees C.
  const dT = new Float32Array(N);
  function step(dt, coal) {
    let steam = 0, mx = 20;
    for (let i = 0; i < N; i++) {
      const t = T[i], tk = t + 273;
      // Conduction along the bar; the samples are uneven once drawn out.
      const dxl = i > 0 ? len[i - 1] : len[0], dxr = i < N - 1 ? len[i] : len[N - 2];
      const tl = i > 0 ? T[i - 1] : t, tr = i < N - 1 ? T[i + 1] : t;
      const lap = ((tl - t) / dxl + (tr - t) / dxr) / ((dxl + dxr) / 2);
      // Thin steel heats and cools faster: rates scale with the section.
      const thin = A0 * A0 / Math.max(a[i] * b[i], 2e-5) * 0.5 + 0.5;
      let d = ALPHA * lap;
      d -= (K_RAD * (tk ** 4 - 293 ** 4) + K_AIR * (t - 20)) * thin;
      if (fire[i] > 0) d += fire[i] * K_FIRE * (coal - t) * thin;
      if (onAnvil[i] > 0) d -= onAnvil[i] * K_ANVIL * (t - 60) * thin;
      if (wet[i] > 0) {
        const k = (t > 450 ? K_WATER_HOT : K_WATER) * wet[i] * thin;
        const q = k * (t - 22);
        d -= q;
        steam += Math.max(0, q) * sstep(95, 160, t);
      }
      dT[i] = d;
    }
    for (let i = 0; i < N; i++) {
      T[i] = Math.max(20, T[i] + dT[i] * dt);
      mx = Math.max(mx, T[i]);
      // Scale grows on hot steel.
      S[i] = Math.min(1, S[i] + dt * 0.1 * sstep(720, 1150, T[i]));
    }
    st.steam = steam / N;
    st.maxT = mx;
    st.heatDirty = true;
  }

  // A blow at sample position x0 (metres from the tongs, negative).
  // strength: the hammer's weight factor. Returns heat, scale shed and softness.
  function blow(x0, strength) {
    let shed = 0, heat = 0, soft = 0, wsum = 0;
    const oldA = Float32Array.from(a), oldB = Float32Array.from(b);
    for (let i = 0; i < N; i++) {
      const g = Math.exp(-(((X[i] - x0) / 0.024) ** 2));
      if (g < 0.01) continue;
      const sf = sstep(480, 1180, T[i]) ** 1.4;
      const strain = 0.15 * strength * sf * g;
      b[i] = Math.max(0.003, b[i] * (1 - strain));
      // A third of the volume spreads the bar; the rest draws it out.
      a[i] = Math.min(0.034, a[i] * (1 + 0.4 * strain));
      const sh = S[i] * (0.35 + 0.5 * sf) * g;
      S[i] -= sh; shed += sh;
      heat += T[i] * g; soft += sf * g; wsum += g;
    }
    // Volume holds: each segment lengthens by the loss of section.
    for (let i = 0; i < N - 1; i++) {
      const o = (oldA[i] * oldB[i] + oldA[i + 1] * oldB[i + 1]);
      const n = (a[i] * b[i] + a[i + 1] * b[i + 1]);
      len[i] *= o / n;
    }
    layout();
    st.shapeDirty = true;
    return { heat: wsum ? heat / wsum : 20, shed, soft: wsum ? soft / wsum : 0 };
  }
  // Scale pops off in the quench.
  function shedAll(k) { for (let i = 0; i < N; i++) S[i] *= 1 - k * wet[i]; }

  // The hottest sample near x0, within reach r.
  function near(x0) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < N; i++) { const d = Math.abs(X[i] - x0); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  /* ---------- the mesh ---------- */
  const NS = N + 1;
  const pos = new Float32Array((NS * RING + 2) * 3);
  const aT = new Float32Array(NS * RING + 2), aS = new Float32Array(NS * RING + 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  geo.setIndex(loftIndex(NS));
  const U = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ color: 0x55575b, metalness: 0.6, roughness: 0.42 });
  mat.onBeforeCompile = s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = 'attribute float aT, aS;\nvarying float vT, vS;\nvarying vec3 vOP;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vT = aT; vS = aS; vOP = position;`);
    s.fragmentShader = `varying float vT, vS;\nvarying vec3 vOP;\n${HEAT}\n${NOISE}\n` + s.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
      // Scale: a dark crust in patches; bare steel shows between them.
      float m = vn3(vOP * vec3(60.0, 380.0, 380.0)) * 0.65 + vn3(vOP * vec3(210.0, 900.0, 900.0)) * 0.35;
      float crust = smoothstep(1.0 - vS - 0.08, 1.0 - vS + 0.08, m);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.043, 0.042), crust);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.85, crust);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, 0.15, crust);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // Scale glows a little duller than the steel under it.
      totalEmissiveRadiance = heatRGB(vT - crust * 45.0) * (1.0 - 0.3 * crust);`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.frustumCulled = false;

  const sec = { c: [0, 0, 0], u: [0, 0, 1], v: [0, 1, 0], a: A0, b: A0, r: R0 };
  // Rebuilds what changed: the rings, and the heat and scale per vertex.
  function upload() {
    if (st.shapeDirty) {
      let o = 0;
      for (let k = 0; k < NS; k++) {
        // Ring 0 is a small cap just past the tip.
        const i = Math.max(0, k - 1);
        const cap = k === 0;
        sec.a = a[i] * (cap ? 0.8 : 1); sec.b = b[i] * (cap ? 0.8 : 1);
        sec.r = Math.min(R0 + (A0 - b[i]) * 0.3, sec.a, sec.b);
        // The bottom face stays on one line, so the anvil carries it.
        sec.c[0] = X[i] - (cap ? 0.0025 : 0); sec.c[1] = b[i] - A0 + (cap ? b[i] * 0.2 : 0);
        o = ringInto(pos, o, sec);
      }
      pos.set([X[0] - 0.003, b[0] - A0, 0], o); pos.set([0.0, 0, 0], o + 3);
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      st.shapeDirty = false;
    }
    if (st.heatDirty) {
      for (let k = 0; k < NS; k++) {
        const i = Math.max(0, k - 1);
        aT.fill(T[i], k * RING, (k + 1) * RING);
        aS.fill(S[i], k * RING, (k + 1) * RING);
      }
      aT[NS * RING] = T[0]; aT[NS * RING + 1] = T[N - 1];
      aS[NS * RING] = S[0]; aS[NS * RING + 1] = S[N - 1];
      geo.attributes.aT.needsUpdate = true;
      geo.attributes.aS.needsUpdate = true;
      st.heatDirty = false;
    }
  }

  reset(true);
  return { T, S, a, b, len, X, fire, onAnvil, wet, st, mesh, mat, U, reset, step, blow, shedAll, near, length, upload };
}
