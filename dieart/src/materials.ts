// Optical silicon shaders: physical SiO2 thin-film interference, anisotropic SRAM grating diffraction,
// beveled metallic relief, and 4 metallurgical microscope modes (Brightfield, Darkfield, DIC, UV).

import * as THREE from 'three';

export type IlluminationMode = 'brightfield' | 'darkfield' | 'dic' | 'uv';

export const MODE_INDEX: Record<IlluminationMode, number> = {
  brightfield: 0,
  darkfield: 1,
  dic: 2,
  uv: 3,
};

export interface SharedOpticsUniforms {
  uTime: { value: number };
  uModeWeights: { value: THREE.Vector4 }; // (brightfield, darkfield, dic, uv)
  uLightDir: { value: THREE.Vector3 };
  uFocusZ: { value: number };
  uDofStrength: { value: number };
  uFilmShift: { value: number };
  uExposure: { value: number };
  uScanOrigin: { value: THREE.Vector2 };
  uScanRadius: { value: number };
  uScanStrength: { value: number };
}

export function createSharedOptics(): SharedOpticsUniforms {
  return {
    uTime: { value: 0 },
    uModeWeights: { value: new THREE.Vector4(1, 0, 0, 0) },
    uLightDir: { value: new THREE.Vector3(0.24, 0.34, 0.91).normalize() },
    uFocusZ: { value: 0.44 },
    uDofStrength: { value: 1.0 },
    uFilmShift: { value: 0.0 },
    uExposure: { value: 1.05 },
    uScanOrigin: { value: new THREE.Vector2(0, 0) },
    uScanRadius: { value: 0 },
    uScanStrength: { value: 0 },
  };
}

// Shared GLSL physical helpers: thin-film Airy interference, Michel-Levy DIC ramp, scan wave, focus halo.
const COMMON_GLSL = /* glsl */ `
  uniform float uTime;
  uniform vec4 uModeWeights;
  uniform vec3 uLightDir;
  uniform float uFocusZ;
  uniform float uDofStrength;
  uniform float uFilmShift;
  uniform float uExposure;
  uniform vec2 uScanOrigin;
  uniform float uScanRadius;
  uniform float uScanStrength;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Physical thin-film interference for SiO2 (n ~ 1.46) at R/G/B wavelengths (nm).
  vec3 thinFilmRGB(float thicknessNm, float cosTheta) {
    float nFilm = 1.46;
    float sinT2 = max(0.0, 1.0 - cosTheta * cosTheta);
    float cosFilm = sqrt(max(0.08, 1.0 - sinT2 / (nFilm * nFilm)));
    float opd = 2.0 * nFilm * thicknessNm * cosFilm;
    vec3 lambda = vec3(635.0, 532.0, 455.0);
    vec3 phase = (6.2831853 * opd) / lambda + vec3(0.0, 0.4, 0.9);
    return 0.5 + 0.5 * cos(phase);
  }

  // Michel-Levy Nomarski DIC false-relief color ramp.
  vec3 dicPalette(float t) {
    vec3 a = vec3(0.46, 0.44, 0.52);
    vec3 b = vec3(0.42, 0.38, 0.42);
    vec3 c = vec3(1.0, 0.96, 0.92);
    vec3 d = vec3(0.08, 0.34, 0.64);
    return clamp(a + b * cos(6.2831853 * (c * t + d)), 0.0, 1.0);
  }

  // Circular interference scan pulse expanding across the die.
  vec3 scanPulse(vec2 worldXY) {
    if (uScanStrength <= 0.001) return vec3(0.0);
    float dist = length(worldXY - uScanOrigin);
    float band = exp(-pow((dist - uScanRadius) * 0.42, 2.0));
    float ring = exp(-pow((dist - uScanRadius + 1.4) * 0.9, 2.0)) * 0.55;
    float wave = (band + ring) * uScanStrength;
    vec3 col = mix(vec3(0.32, 0.92, 1.0), vec3(1.0, 0.84, 0.38), clamp(band, 0.0, 1.0));
    return col * wave * 0.85;
  }

  // Optical depth-of-field contrast damping when a layer sits far from uFocusZ.
  float focusSharpness(float zVal) {
    float dz = abs(zVal - uFocusZ);
    return 1.0 / (1.0 + dz * dz * 3.6 * uDofStrength);
  }
`;

// 1. Silicon substrate + SiO2 thin-film dielectric wafer bed.
export function createSubstrateMaterial(optics: SharedOpticsUniforms, filmSeed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...optics,
      uSeed: { value: filmSeed },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      uniform float uSeed;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vec2 p = vWorldPos.xy;
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uLightDir);
        vec3 H = normalize(L + V);

        float ndv = clamp(dot(N, V), 0.05, 1.0);
        float ndh = clamp(dot(N, H), 0.0, 1.0);

        // Die active region vs outer ceramic package / scribe street
        float edgeMax = max(abs(p.x), abs(p.y));
        float inDie = 1.0 - smoothstep(53.4, 54.0, edgeMax);
        float inScribe = smoothstep(53.4, 54.0, edgeMax) * (1.0 - smoothstep(58.5, 59.3, edgeMax));
        float inPackage = smoothstep(58.5, 59.3, edgeMax);

        // Subtle stepped thin-film thickness across functional chip quadrants
        float macroField = vnoise(p * 0.045 + uSeed) * 180.0 + vnoise(p * 0.18 + uSeed * 2.1) * 42.0;
        float fineStep = floor(vnoise(p * 0.35 + uSeed * 0.7) * 5.0) * 26.0;
        float thickness = 310.0 + macroField + fineStep + uFilmShift * 260.0;

        // Micro-lithography sub-grid etched into substrate oxide
        vec2 gridA = abs(fract(p * 1.25) - 0.5);
        vec2 gridB = abs(fract(p * 0.25) - 0.5);
        float microLine = 1.0 - smoothstep(0.45, 0.49, max(gridA.x, gridA.y));
        float macroTrench = smoothstep(0.475, 0.495, max(gridB.x, gridB.y));

        // Slight normal perturbation along oxide trenches for Darkfield & DIC catch
        vec2 trenchSlope = vec2(
          smoothstep(0.46, 0.495, gridB.x) * sign(fract(p.x * 0.25) - 0.5),
          smoothstep(0.46, 0.495, gridB.y) * sign(fract(p.y * 0.25) - 0.5)
        );
        vec3 Nm = normalize(vec3(trenchSlope * 0.36, 1.0));

        vec3 film = thinFilmRGB(thickness + macroTrench * 68.0, ndv);
        float spec = pow(clamp(dot(Nm, H), 0.0, 1.0), 44.0);

        // Mode 0: Brightfield (rich sapphire / emerald / violet SiO2 interference)
        vec3 baseSi = mix(vec3(0.055, 0.085, 0.145), vec3(0.11, 0.23, 0.31), film.g);
        baseSi = mix(baseSi, vec3(0.24, 0.13, 0.32), film.r * 0.48);
        baseSi = mix(baseSi, vec3(0.09, 0.30, 0.27), film.b * 0.34);
        baseSi *= (0.86 + 0.14 * microLine);
        baseSi += film * spec * 0.34;
        baseSi += vec3(0.06, 0.12, 0.16) * macroTrench * 0.45;

        // Scribe street: raw crystalline brushed grey silicon
        float grain = vnoise(p * 3.8);
        vec3 scribeCol = vec3(0.14, 0.155, 0.18) * (0.85 + 0.25 * grain) + vec3(0.18) * pow(ndh, 28.0);
        // Dark matte ceramic chip package beyond the die
        vec3 pkgCol = vec3(0.032, 0.035, 0.044) * (0.9 + 0.2 * vnoise(p * 1.7));

        vec3 brightCol = baseSi * inDie + scribeCol * inScribe + pkgCol * inPackage;

        // Mode 1: Darkfield (velvet obsidian ground, only trenches & crystalline defects catch oblique rim light)
        float edgeScatter = macroTrench * 0.72 + (1.0 - microLine) * 0.08;
        float scribeEdge = smoothstep(53.1, 53.7, edgeMax) * (1.0 - smoothstep(53.9, 54.5, edgeMax));
        vec3 darkCol = vec3(0.008, 0.011, 0.018) * inDie + vec3(0.004, 0.005, 0.007) * (inScribe + inPackage);
        darkCol += (film * 0.7 + vec3(0.35, 0.78, 0.95)) * edgeScatter * 0.32 * inDie;
        darkCol += vec3(0.75, 0.88, 1.0) * scribeEdge * 1.15;

        // Mode 2: Nomarski DIC (luminous mother-of-pearl / bronze-teal interference contrast)
        float shear = dot(Nm.xy, normalize(vec2(0.76, 0.65)));
        vec3 dicCol = dicPalette(0.42 + thickness * 0.00075 + shear * 0.52) * 0.54;
        dicCol *= (0.92 + 0.14 * microLine);
        dicCol = dicCol * inDie + vec3(0.24, 0.22, 0.26) * inScribe + pkgCol * inPackage;

        // Mode 3: UV 365nm (fluorescing passivation oxide + deep ultraviolet darkfield base)
        vec3 uvBase = mix(vec3(0.03, 0.04, 0.12), vec3(0.09, 0.24, 0.42), film.b * 0.7 + film.g * 0.3);
        uvBase += vec3(0.16, 0.68, 0.82) * macroTrench * 0.42;
        uvBase += vec3(0.32, 0.14, 0.68) * spec * 0.55;
        vec3 uvCol = uvBase * inDie + vec3(0.04, 0.03, 0.08) * inScribe + vec3(0.012, 0.01, 0.025) * inPackage;

        vec3 col =
          brightCol * uModeWeights.x +
          darkCol   * uModeWeights.y +
          dicCol    * uModeWeights.z +
          uvCol     * uModeWeights.w;

        // Gentle focus softness on substrate when user focuses up on M3/M4
        float sharp = focusSharpness(vWorldPos.z);
        col = mix(col * 0.84, col, 0.55 + 0.45 * sharp);

        // Scan radar ripple
        col += scanPulse(p) * (0.35 + 0.65 * inDie);

        gl_FragColor = vec4(col * uExposure, 1.0);
      }
    `,
  });
}

// 2. Anisotropic Bragg Diffraction Grating material for SRAM / L2 Cache bitcell arrays.
export function createSramGratingMaterial(optics: SharedOpticsUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...optics,
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;

      void main() {
        vec2 p = vWorldPos.xy;
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uLightDir);
        vec3 H = normalize(L + V);

        // High-density bitcell rows & columns
        float row = sin(p.y * 19.0);
        float colCell = sin(p.x * 11.0);
        float subBank = smoothstep(0.46, 0.495, abs(fract(vUv.x * 4.0) - 0.5))
                      + smoothstep(0.47, 0.495, abs(fract(vUv.y * 8.0) - 0.5));
        float cellMask = (0.65 + 0.35 * smoothstep(-0.2, 0.6, row)) * (0.78 + 0.22 * smoothstep(-0.3, 0.6, colCell));

        // Grating diffraction vector driven by view + oblique lamp angle
        float gratingOrder = dot(L.xy + V.xy, vec2(1.0, 0.38)) * 520.0 + p.x * 9.5 + p.y * 4.2 + uFilmShift * 340.0;
        vec3 irid = thinFilmRGB(380.0 + gratingOrder * 0.45, clamp(dot(N, V), 0.1, 1.0));
        float anisoSpec = pow(max(0.0, 1.0 - abs(dot(H, vec3(0.0, 1.0, 0.0)))), 18.0) * pow(max(0.0, dot(N, H)), 6.0);

        float edgeWall = 1.0 - clamp(N.z, 0.0, 1.0);

        // Brightfield: jewel-like opal diffraction shimmer across memory rows
        vec3 bright = mix(vec3(0.08, 0.17, 0.24), irid * 0.88 + vec3(0.08, 0.16, 0.20), 0.68) * cellMask;
        bright += irid * anisoSpec * 0.95;
        bright = mix(bright, vec3(0.72, 0.58, 0.36), clamp(subBank, 0.0, 1.0) * 0.55);

        // Darkfield: dramatic spectral grating flare along bitcell ridges
        vec3 dark = vec3(0.015, 0.02, 0.03) + irid * (anisoSpec * 1.4 + abs(row) * 0.22 + edgeWall * 1.6);
        dark += vec3(0.95, 0.82, 0.52) * clamp(subBank, 0.0, 1.0) * 0.45;

        // DIC: luminous iridescent stepped rows
        vec3 dic = dicPalette(0.25 + row * 0.18 + colCell * 0.08 + uFilmShift * 0.4) * (0.72 + 0.28 * cellMask);
        dic += vec3(0.25) * anisoSpec;

        // UV: electric cyan/magenta cache fluorescence
        vec3 uv = mix(vec3(0.04, 0.12, 0.28), vec3(0.18, 0.86, 0.92), cellMask * 0.65)
                + vec3(0.72, 0.22, 0.96) * anisoSpec * 0.95
                + vec3(0.95, 0.72, 0.28) * clamp(subBank, 0.0, 1.0) * 0.35;

        vec3 col =
          bright * uModeWeights.x +
          dark   * uModeWeights.y +
          dic    * uModeWeights.z +
          uv     * uModeWeights.w;

        float sharp = focusSharpness(vWorldPos.z);
        col = mix(col * 0.82, col, 0.5 + 0.5 * sharp);
        col += scanPulse(p) * 0.7;

        gl_FragColor = vec4(col * uExposure, 1.0);
      }
    `,
  });
}

export interface MetalPreset {
  baseColor: THREE.Color;
  rimColor: THREE.Color;
  uvColor: THREE.Color;
  roughness: number;
  filmTint: number;
  darkfieldBoost: number;
}

export const METAL_PRESETS: Record<string, MetalPreset> = {
  poly: {
    baseColor: new THREE.Color(0x5a738d),
    rimColor: new THREE.Color(0x56d8ff),
    uvColor: new THREE.Color(0x45c8ff),
    roughness: 0.36,
    filmTint: 0.42,
    darkfieldBoost: 1.35,
  },
  m1: {
    baseColor: new THREE.Color(0x7ca6b8),
    rimColor: new THREE.Color(0x6fffe0),
    uvColor: new THREE.Color(0x52f2d2),
    roughness: 0.28,
    filmTint: 0.32,
    darkfieldBoost: 1.45,
  },
  m2Copper: {
    baseColor: new THREE.Color(0xd98a5f),
    rimColor: new THREE.Color(0xffb473),
    uvColor: new THREE.Color(0xff9f45),
    roughness: 0.22,
    filmTint: 0.22,
    darkfieldBoost: 1.55,
  },
  m3Gold: {
    baseColor: new THREE.Color(0xecc269),
    rimColor: new THREE.Color(0xffe796),
    uvColor: new THREE.Color(0xffd75e),
    roughness: 0.18,
    filmTint: 0.18,
    darkfieldBoost: 1.65,
  },
  m4Al: {
    baseColor: new THREE.Color(0xc9d6e4),
    rimColor: new THREE.Color(0xb8e6ff),
    uvColor: new THREE.Color(0x9be2ff),
    roughness: 0.16,
    filmTint: 0.26,
    darkfieldBoost: 1.6,
  },
  wirebond: {
    baseColor: new THREE.Color(0xf6cf74),
    rimColor: new THREE.Color(0xfff0b2),
    uvColor: new THREE.Color(0xffdf7a),
    roughness: 0.12,
    filmTint: 0.1,
    darkfieldBoost: 1.85,
  },
  via: {
    baseColor: new THREE.Color(0xdbe8f2),
    rimColor: new THREE.Color(0x8ff8ff),
    uvColor: new THREE.Color(0x75f4ff),
    roughness: 0.2,
    filmTint: 0.24,
    darkfieldBoost: 1.7,
  },
};

// 3. Etched Metallic & Doodle ShaderMaterial (automatically supports InstancedMesh and regular Mesh).
export function createMetalMaterial(
  optics: SharedOpticsUniforms,
  preset: MetalPreset,
  extra?: { highlight?: number; layerZ?: number }
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...optics,
      uBaseColor: { value: preset.baseColor.clone() },
      uRimColor: { value: preset.rimColor.clone() },
      uUvColor: { value: preset.uvColor.clone() },
      uRoughness: { value: preset.roughness },
      uFilmTint: { value: preset.filmTint },
      uDarkBoost: { value: preset.darkfieldBoost },
      uHighlight: { value: extra?.highlight ?? 0.0 },
      uLayerZ: { value: extra?.layerZ ?? -1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vec4 localPos = vec4(position, 1.0);
        vec3 localNorm = normal;
        #ifdef USE_INSTANCING
          localPos = instanceMatrix * localPos;
          localNorm = mat3(instanceMatrix) * localNorm;
        #endif
        vec4 wp = modelMatrix * localPos;
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * localNorm);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      uniform vec3 uBaseColor;
      uniform vec3 uRimColor;
      uniform vec3 uUvColor;
      uniform float uRoughness;
      uniform float uFilmTint;
      uniform float uDarkBoost;
      uniform float uHighlight;
      uniform float uLayerZ;

      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uLightDir);
        vec3 H = normalize(L + V);

        float ndl = clamp(dot(N, L), 0.0, 1.0);
        float ndv = clamp(dot(N, V), 0.04, 1.0);
        float ndh = clamp(dot(N, H), 0.0, 1.0);

        // Bevel / etch wall detector: flat tops have N.z ~ 1, beveled etch walls have N.z < 0.88
        float bevel = smoothstep(0.96, 0.25, abs(N.z));
        float fresnel = pow(1.0 - ndv, 3.0);

        // Fine brushed micro-metal patina
        float micro = vnoise(vWorldPos.xy * 6.5) * 0.1 + 0.95;

        // Thin-film oxide over-coat iridescence
        float filmThick = 240.0 + vWorldPos.z * 260.0 + vnoise(vWorldPos.xy * 0.12) * 90.0 + uFilmShift * 220.0;
        vec3 irid = thinFilmRGB(filmThick, ndv);

        float shininess = mix(96.0, 18.0, uRoughness);
        float spec = pow(ndh, shininess);
        float broadSpec = pow(ndh, 12.0);

        // Mode 0: Brightfield metallic microscopy
        vec3 metalTint = mix(uBaseColor, uBaseColor * (0.72 + 0.52 * irid), uFilmTint);
        vec3 bright = metalTint * (0.28 + 0.72 * ndl) * micro;
        bright += mix(uBaseColor, vec3(1.0), 0.55) * (spec * 0.95 + broadSpec * 0.22);
        bright += uRimColor * fresnel * 0.24;
        // Subtle bevel shading to separate stacked layers cleanly
        bright *= mix(1.0, 0.62 + 0.58 * max(0.0, dot(N.xy, L.xy) * 0.5 + 0.5), bevel);

        // Mode 1: Darkfield — flat tops drop into obsidian while beveled edges blaze with oblique rim fire!
        vec3 darkTop = uBaseColor * (0.045 + 0.04 * broadSpec);
        float rimCatch = bevel * (0.55 + 0.95 * max(0.0, dot(normalize(N.xy + vec2(1e-4)), normalize(L.xy + vec2(1e-4))) * 0.5 + 0.5));
        vec3 darkEdge = mix(uRimColor, irid * 1.15, 0.35) * (rimCatch + fresnel * 0.45) * uDarkBoost;
        vec3 dark = darkTop + darkEdge + uRimColor * spec * bevel * 0.9;

        // Mode 2: Nomarski DIC — directional slope relief through Michel-Levy interference
        float shear = dot(N.xy, normalize(vec2(0.76, 0.65)));
        vec3 dicTint = dicPalette(0.54 + vWorldPos.z * 0.36 + shear * 0.72 + uFilmShift * 0.25);
        vec3 dic = mix(dicTint, uBaseColor, 0.22) * (0.62 + 0.48 * ndl) + vec3(0.45) * spec * 0.65;
        dic += vec3(0.32) * max(0.0, shear) * bevel;
        dic -= vec3(0.18) * max(0.0, -shear) * bevel;

        // Mode 3: UV 365nm — dark crisp metal interiors with bright golden/cyan fluorescent edges
        vec3 uv = uBaseColor * 0.22 + uUvColor * (0.26 * ndl + bevel * 0.95 + spec * 0.85 + fresnel * 0.42);

        vec3 col =
          bright * uModeWeights.x +
          dark   * uModeWeights.y +
          dic    * uModeWeights.z +
          uv     * uModeWeights.w;

        // Depth-of-field contrast response for stacked metal layers
        float layerHeight = uLayerZ >= 0.0 ? uLayerZ : vWorldPos.z;
        float sharp = focusSharpness(layerHeight);
        col = mix(col * 0.74, col, 0.45 + 0.55 * sharp);

        // Scan pulse & found/hover resonance highlight
        col += scanPulse(vWorldPos.xy) * (0.45 + 0.55 * bevel);
        if (uHighlight > 0.001) {
          float pulse = 0.78 + 0.22 * sin(uTime * 3.6);
          col += mix(uRimColor, vec3(1.0, 0.90, 0.54), 0.6) * uHighlight * (0.35 + 0.85 * bevel + 0.4 * pulse);
        }

        gl_FragColor = vec4(col * uExposure, 1.0);
      }
    `,
  });
}

// 4. Translucent glowing verification ring shown around found doodles.
export function createFoundRingMaterial(optics: SharedOpticsUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      ...optics,
      uOpacity: { value: 0.0 },
      uPulse: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uPulse;
      varying vec2 vUv;
      void main() {
        if (uOpacity <= 0.002) discard;
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);

        // Crisp segmented precision reticle ring
        float ring = smoothstep(0.055, 0.012, abs(r - 0.84));
        float ticks = smoothstep(0.25, 0.65, cos(ang * 4.0 + uTime * 0.55));
        float burst = smoothstep(0.14, 0.0, abs(r - (0.35 + uPulse * 0.65))) * (1.0 - uPulse);

        vec3 col = mix(vec3(0.45, 0.95, 1.0), vec3(1.0, 0.86, 0.46), 0.65);
        float alpha = (ring * (0.38 + 0.62 * ticks) + burst * 1.15) * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}
