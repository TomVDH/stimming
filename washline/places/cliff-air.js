// Cliff air: the dawn sky, high cirrus, the fog sea and the lighthouse beam.
// One scattering model lights them all, so far things fade into their sky.
// Units: metres. Scene y = 0 is the turf; the sea lies at y = -60.
import * as THREE from 'three';
import { ATMO } from './sr-atmo.js';

const R_EARTH = 6.371e6;

// The fog sea fills the bay; its top swells between y = -33 and y = -7.
export const AIR = /* glsl */ `
  uniform vec3 uSunDir; uniform float uE, uT, uH;
  ${ATMO.replace(/\bdepth\(/g, 'odDepth(').replace('BM = vec3(3.2e-5)', 'BM = vec3(2.1e-5)')}
  const float SEA_Y = -60.0, TOP_Y = -20.0, SWELL = 13.0, TOP_MAX = -7.0;
  float cnH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float cnN(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(cnH(i), cnH(i + vec2(1, 0)), f.x), mix(cnH(i + vec2(0, 1)), cnH(i + 1.0), f.x), f.y);
  }
  float hgPhase(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * PI_A * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
  // The fog top: long low swells that drift with the wind.
  // Far away the finest octave drops out, so the top does not shimmer.
  float fogTop(vec2 xz, float far) {
    vec2 q = xz / 380.0 + uT * vec2(0.006, 0.002);
    float f = 0.42 * cnN(q) + 0.25 * cnN(q * 2.3 + 5.1);
    // Billows ride on the swells; far away they average out.
    f += mix(0.2 * cnN(q * 3.4 + 9.7) + 0.13 * cnN(q * 7.9 + 2.3), 0.165, far);
    return TOP_Y + SWELL * (2.0 * f - 1.0);
  }
  // Light and transmittance of the fog sea along a ray, up to distance tEnd.
  vec4 fogSea(vec3 ro, vec3 rd, float tEnd) {
    if (rd.y > -1e-4) return vec4(0.0, 0.0, 0.0, 1.0);
    float t = max(0.0, (TOP_MAX + 1.0 - ro.y) / rd.y);
    float t1 = min(tEnd, (SEA_Y - ro.y) / rd.y);
    if (t >= t1) return vec4(0.0, 0.0, 0.0, 1.0);
    // Fog droplets throw sunlight forward: the fog glows toward the sun.
    float c = dot(rd, uSunDir);
    vec3 sun = uE * sunAt(uSunDir, 40.0) * (0.5 * hgPhase(c, 0.55) + 0.5 / (4.0 * PI_A));
    // Sky light on the fog: the zenith and the horizon on both sides.
    vec3 a0, a1, a2, Ta;
    vec3 sh = normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + 1e-5);
    scatter(40.0, vec3(0.0, 1.0, 0.0), -1.0, uSunDir, uE, a0, Ta);
    scatter(40.0, normalize(sh + vec3(0.0, 0.15, 0.0)), -1.0, uSunDir, uE, a1, Ta);
    scatter(40.0, normalize(-sh + vec3(0.0, 0.15, 0.0)), -1.0, uSunDir, uE, a2, Ta);
    vec3 amb = 0.4 * a0 + 0.3 * a1 + 0.3 * a2;
    // Light bounces many times in fog: it comes out paler and brighter.
    amb = mix(amb, vec3(dot(amb, vec3(0.2126, 0.7152, 0.0722))), 0.55) * 3.0;
    vec2 sunH = sh.xz * 70.0;
    float rise = 70.0 * uSunDir.y / max(length(uSunDir.xz), 1e-3);
    vec3 inS = vec3(0.0);
    float T = 1.0;
    t += cnH(gl_FragCoord.xy) * 4.0;
    for (int i = 0; i < 40; i++) {
      if (t > t1 || T < 0.01) break;
      vec3 p = ro + rd * t;
      float top = fogTop(p.xz, smoothstep(2000.0, 9000.0, t));
      float dIn = top - p.y;
      // Above the local top: skip down toward it in one long step.
      if (dIn < -1.0) { t += clamp(-dIn / -rd.y * 0.7, 2.0, 600.0); continue; }
      float dt = clamp(2.0 + 0.006 * t, 2.0, 60.0);
      float n = cnN(p.xz / 45.0 + vec2(uT * 0.02, p.y / 18.0));
      float sig = 0.022 * smoothstep(-2.0, 14.0, dIn) * (0.45 + 0.55 * n);
      // Swell crests catch more sky than the troughs.
      float crest = 0.3 + 0.7 * smoothstep(TOP_Y - SWELL, TOP_MAX, top);
      // Only the top skin sees the low sun; the sky lights deeper fog.
      float d0 = max(dIn, 0.0);
      // A swell between this point and the low sun casts a shadow.
      float block = fogTop(p.xz + sunH, 1.0) - (p.y + rise);
      float lit = exp(-d0 * 0.16) * exp(-max(block, 0.0) * 0.25);
      vec3 L = sun * lit * 0.8 + amb * crest * (0.35 + 0.65 * exp(-d0 * 0.06));
      float a = 1.0 - exp(-sig * dt);
      inS += T * a * L;
      T *= 1.0 - a;
      t += dt;
    }
    return vec4(inS, T);
  }
  // Everything between the eye and a point: fog sea first, then the air.
  vec3 airApply(vec3 c, vec3 w) {
    vec3 v = w - cameraPosition;
    float L = length(v);
    vec3 rd = v / L, inS, T;
    vec4 f = fogSea(cameraPosition, rd, L);
    c = c * f.a + f.rgb;
    scatter(cameraPosition.y + uH, rd, L, uSunDir, uE, inS, T);
    return c * T + inS;
  }
`;

export function airUniforms(H) {
  return { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uE: { value: 18 }, uT: { value: 0 }, uH: { value: H } };
}

// A standard material gets the fog sea and the air instead of three's fog.
export function airify(mat, u) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAirW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vAirW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vAirW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vAirW;\n${AIR}`)
      .replace('#include <fog_fragment>', 'gl_FragColor.rgb = airApply(gl_FragColor.rgb, vAirW);');
  };
  mat.customProgramCacheKey = () => 'cliff-air';
  return mat;
}

// The sky dome: scattering, the sun disc and a few streaks of high cirrus.
export function cliffSky(group, u) {
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vD;
      ${AIR}
      float cirrus(vec2 p) {
        vec2 q = mat2(0.94, -0.34, 0.34, 0.94) * p / vec2(16000.0, 3800.0) + uT * vec2(0.0006, 0.0);
        q.x += 0.4 * cnN(q * 1.7 + 3.0);
        float f = 0.5 * cnN(q) + 0.25 * cnN(q * 2.1 + 1.3) + 0.15 * cnN(q * 4.6 + 7.1) + 0.1 * cnN(q * vec2(9.0, 22.0));
        return smoothstep(0.64, 0.9, f) * (0.35 + 0.65 * cnN(q * vec2(3.0, 18.0)));
      }
      void main() {
        vec3 d = normalize(vD), inS, T;
        float h0 = cameraPosition.y + uH;
        scatter(h0, d, -1.0, uSunDir, uE, inS, T);
        float cs = dot(d, uSunDir);
        vec3 col = inS + uE * 6.0 * sunAt(uSunDir, h0) * smoothstep(0.99985, 0.99992, cs) * T;
        if (d.y > 0.004) {
          // The cirrus deck lies 7 km up.
          const float HC = 7000.0;
          float Lc = (HC - h0) / d.y;
          float D = Lc * length(d.xz);
          // Toward the sun the deck is nearer the dawn line: the sun stands higher there.
          float k = dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz + 1e-5));
          vec3 s2 = normalize(vec3(uSunDir.x, uSunDir.y + D / ${R_EARTH.toFixed(1)} * k, uSunDir.z));
          vec3 lit = uE * sunAt(s2, HC) * (0.6 * hgPhase(cs, 0.6) + 0.4 / (4.0 * PI_A)) + inS * 0.5;
          vec3 inC, Tc;
          scatter(h0, d, Lc, uSunDir, uE, inC, Tc);
          float a = cirrus(cameraPosition.xz + d.xz * Lc) * 0.28 * smoothstep(0.004, 0.06, d.y);
          col = mix(col, lit * Tc + inC, a);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(28000, 64, 32), mat);
  dome.renderOrder = -9;
  dome.frustumCulled = false;
  group.add(dome);
  return dome;
}

// Two lighthouse beams turn about the lantern; they fade along their length.
export function beams(group, pos, len = 1100, end = 40) {
  const u = { uK: { value: 1 }, uLen: { value: len } };
  const g = new THREE.CylinderGeometry(end, 0.8, len, 32, 1, true);
  g.translate(0, len / 2, 0);
  g.rotateZ(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: /* glsl */ `
      varying float vA; varying vec3 vN, vV;
      void main() {
        vA = position.x;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying vec3 vN, vV; uniform float uK, uLen;
      void main() {
        float a = clamp(vA / uLen, 0.0, 1.0);
        // The beam is brightest along its axis and near the lantern.
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 2.0);
        float k = uK * core * exp(-a * 3.5) * (1.0 - a);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * k, 1.0);
      }`,
  });
  const turn = new THREE.Group();
  turn.position.set(...pos);
  for (const r of [0, Math.PI]) { const m = new THREE.Mesh(g, mat); m.rotation.y = r; m.frustumCulled = false; turn.add(m); }
  group.add(turn);
  return { turn, u };
}
