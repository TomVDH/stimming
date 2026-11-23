// Ice breach materials: snow and sea ice, the black hull, the open water.
import * as THREE from 'three';

// Shared uniforms: the flood, the crack front, the clock, the moon.
export const U = {
  uFront: { value: 0 }, uT: { value: 1.24 }, uTop: { value: 0.25 }, uTime: { value: 0 },
  tFlood: { value: null }, uFloodMin: { value: new THREE.Vector2() }, uFloodSize: { value: new THREE.Vector2(1, 1) },
  uMoonCol: { value: new THREE.Color(0.77, 0.82, 1.0) },
  uWet: { value: 0 }, uWetT: { value: 0 }, uFreeze: { value: 0 }, uSurge: { value: 0 },
  uRing: { value: new THREE.Vector4(0, 0, -100, 0) },
};

export const NOISE = /* glsl */`
float ih(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ih(i), ih(i + vec2(1, 0)), f.x), mix(ih(i + vec2(0, 1)), ih(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 3.7) * 0.28 + vn(p * 4.3 + 9.1) * 0.17; }
`;

// Sastrugi: wind-cut ridges, long across the wind.
const SNOW_H = /* glsl */`
float snowH(vec2 p) {
  vec2 q = vec2(p.x * 0.8 + p.y * 0.6, -p.x * 0.6 + p.y * 0.8);
  float a = fbm(q * vec2(0.09, 0.55));
  float b = fbm(q * vec2(0.4, 1.6) + 5.0);
  return a * 0.08 + b * 0.015 + vn(p * 7.0) * 0.003;
}`;

/**
 * Snow over sea ice. batched picks the slab layout (aKind, aCrack, aHome);
 * otherwise the mesh is the flat floe top.
 */
export function iceMaterial(batched) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        ${batched ? 'attribute float aKind;\nattribute vec3 aCrack;\nattribute vec2 aHome;' : ''}
        varying float vKind; varying vec3 vCrack; varying vec2 vHome; varying vec3 vFrame; varying vec3 vTX; varying vec3 vTZ;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${batched ? 'vKind = aKind; vCrack = aCrack; vHome = aHome;' : 'vKind = 0.0; vCrack = vec3(0.0, 0.0, 999.0); vHome = position.xz;'}
        {
        #ifdef USE_BATCHING
          mat3 ibM = mat3(batchingMatrix);
          vFrame = (batchingMatrix * vec4(position, 1.0)).xyz;
        #else
          mat3 ibM = mat3(1.0);
          vFrame = (modelMatrix * vec4(position, 1.0)).xyz;
          vFrame.xz = position.xz;
        #endif
        vTX = normalize(normalMatrix * (ibM * vec3(1, 0, 0)));
        vTZ = normalize(normalMatrix * (ibM * vec3(0, 0, 1)));
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vKind; varying vec3 vCrack; varying vec2 vHome; varying vec3 vFrame; varying vec3 vTX; varying vec3 vTZ;
        uniform float uFront, uT, uTop, uTime;
        uniform sampler2D tFlood; uniform vec2 uFloodMin, uFloodSize;
        uniform vec3 uMoonCol;
        ${NOISE}
        ${SNOW_H}
        float gWater, gCrack, gGlint;
        vec2 gFlow;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // The flood: depth over the floe top, from the grid.
        vec4 fl = texture2D(tFlood, (vFrame.xz - uFloodMin) / uFloodSize);
        float wTop = uTop + fl.r * 0.6 - 0.004;
        gWater = vKind < 0.5 ? smoothstep(0.0, 0.012, wTop - vFrame.y) : 0.0;
        // A wet stain stays where water ran; frozen slush greys it.
        float stain = vKind < 0.5 ? fl.g : 0.0;
        gFlow = fl.ba * 2.0 - 1.0;
        vec3 c;
        if (vKind < 0.5) {
          float h = snowH(vHome);
          vec3 snow = mix(vec3(0.8, 0.82, 0.86), vec3(0.92, 0.93, 0.95), smoothstep(0.02, 0.08, h));
          // Wind-packed patches are bluer and smoother; drifts are brighter.
          snow *= mix(1.0, 0.88, smoothstep(0.5, 0.75, fbm(vHome * 0.05 + 11.0)));
          snow *= 0.94 + 0.12 * fbm(vHome * vec2(0.012, 0.03) + 3.0);
          c = snow;
          // The crack line: dark and blue where sea water seeps up.
          float d = vCrack.x * vCrack.y;
          gCrack = smoothstep(0.08, 0.0, d) * step(vCrack.z, uFront);
          c = mix(c, vec3(0.05, 0.09, 0.13), gCrack * 0.85);
          c = mix(c, c * vec3(0.55, 0.6, 0.66), stain);
          c = mix(c, vec3(0.006, 0.009, 0.013), gWater);
        } else if (vKind < 1.5) {
          // Cut face: dense blue ice, brine layers, a snow cap, a darker wet foot.
          float y = vCrack.y;
          float layer = fbm(vec2(vHome.x + vHome.y, y * 9.0) * vec2(0.6, 1.0));
          vec3 ice = mix(vec3(0.13, 0.36, 0.48), vec3(0.42, 0.66, 0.74), layer);
          ice = mix(ice, vec3(0.07, 0.2, 0.24), smoothstep(0.45, 0.0, y));
          c = mix(ice, vec3(0.86, 0.9, 0.96), smoothstep(uT - 0.27, uT - 0.21, y));
          gCrack = 0.0;
        } else {
          // Under face: algae brown on old ice.
          c = mix(vec3(0.16, 0.13, 0.08), vec3(0.08, 0.12, 0.13), fbm(vHome * 0.4));
          gCrack = 0.0;
        }
        diffuseColor.rgb = c;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = vKind < 0.5 ? mix(0.88, 0.06, gWater) : vKind < 1.5 ? 0.3 : 0.5;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (vKind < 0.5) {
          // The sastrugi bend the snow's normal; still water lies flat.
          vec2 p = vHome;
          float e = 0.12, h0 = snowH(p);
          vec2 g = vec2(snowH(p + vec2(e, 0.0)) - h0, snowH(p + vec2(0.0, e)) - h0) / e;
          g *= 1.0 - gWater;
          // Ripples run on the flood where it flows.
          float rip = vn(vFrame.xz * 3.0 - gFlow * uTime * 4.0) - 0.5;
          g += gWater * vec2(rip, -rip) * 0.25 * clamp(length(gFlow) * 3.0, 0.1, 1.0);
          normal = normalize(normal - vTX * g.x - vTZ * g.y);
        }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        // Glints: a few snow crystals catch the moon like mirrors.
        if (vKind < 0.5 && gWater < 0.5) {
          vec2 cell = floor(vHome * 22.0);
          float r = ih(cell);
          if (r > 0.93) {
            vec3 nr = normalize(normal + (vec3(ih(cell + 1.3), ih(cell + 2.9), ih(cell + 7.1)) - 0.5) * 1.3);
            vec3 L = directionalLights[0].direction, V = normalize(vViewPosition);
            float sp = pow(max(dot(reflect(V, nr), L), 0.0), 900.0);
            reflectedLight.directSpecular += uMoonCol * sp * 60.0 * (1.0 - gCrack);
          }
        }
        // Backlit cut faces glow blue through the ice.
        if (vKind > 0.5 && vKind < 1.5) {
          vec3 L = directionalLights[0].direction, V = normalize(vViewPosition);
          float tr = pow(max(dot(V, -L) * 0.5 + 0.5, 0.0), 3.0);
          reflectedLight.indirectDiffuse += vec3(0.1, 0.35, 0.45) * uMoonCol * tr * 0.18;
        }`);
  };
  return m;
}

/** The hull: black anechoic tiles, wet from the sea, water running off as it rises. */
export function hullMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5, envMapIntensity: 3 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vL; varying vec3 vW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = position; vW = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vL; varying vec3 vW;
        uniform float uWet, uWetT, uTime;
        uniform vec3 uMoonCol;
        ${NOISE}
        float gWet;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Tiles: rows along the hull, worn and patched.
        float ang = atan(vL.z, vL.y);
        vec2 t = vec2(vL.x / 0.9, ang * 6.75 / 0.9);
        vec2 f = abs(fract(t) - 0.5);
        float seam = smoothstep(0.47, 0.5, max(f.x, f.y));
        float worn = step(0.9, ih(floor(t)));
        vec3 c = vec3(0.028, 0.03, 0.034) * (0.75 + 0.5 * ih(floor(t * 0.5)));
        c = mix(c, vec3(0.05, 0.048, 0.045), worn * 0.6);
        c *= 1.0 - 0.45 * seam;
        // Streaks of water run down after the sea lets go.
        float run = vn(vec2(vL.x * 3.0 + ang * 9.0, vW.y * 0.6 + uWetT * 1.6));
        gWet = uWet * (0.55 + 0.45 * smoothstep(0.35, 0.7, run));
        c *= 1.0 - 0.4 * gWet;
        diffuseColor.rgb = c;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.55, 0.12, gWet);`);
  };
  return m;
}

/** Open water in the hole: black, the sky in it, rings from the breach, new ice over time. */
export function waterMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.04, envMapIntensity: 1.4 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vP;
        uniform float uTime, uFreeze, uSurge;
        uniform vec4 uRing;
        ${NOISE}
        float gFrost;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // New ice: grey nilas spreading from small pancakes.
        float pan = fbm(vP * 0.7) * 0.7 + vn(vP * 3.0) * 0.3;
        gFrost = smoothstep(1.0 - uFreeze * 1.1, 1.05 - uFreeze * 1.1, pan);
        diffuseColor.rgb = mix(vec3(0.0), vec3(0.32, 0.37, 0.44), gFrost);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.05, 0.6, gFrost);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // Rings run out from the breach and fade; a slow swell stays.
        float r = length(vP - uRing.xy), age = uTime - uRing.z;
        float ring = sin(r * 2.2 - age * 6.5) * exp(-abs(r - age * 3.0) * 0.25) * exp(-age * 0.25) * uRing.w;
        float ch = (vn(vP * 1.3 + uTime * 0.4) - 0.5) * 0.06 + (vn(vP * 4.0 - uTime * 0.7) - 0.5) * 0.04 * (0.3 + uSurge);
        vec2 g = vec2(ring + ch, ch - ring * 0.5) * (1.0 - gFrost);
        normal = normalize(normal - mat3(viewMatrix) * vec3(g.x, 0.0, g.y) * 0.7);`);
  };
  return m;
}
