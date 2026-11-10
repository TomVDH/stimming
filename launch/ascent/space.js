// Act 2 backdrop: the air, the Earth, the Moon, the Sun, planets and stars.
// One full-screen pass in kilometres, from the Earth's centre.
// The air is single scatter on the GPU, so it holds at every height.
import * as THREE from 'three';

export const NOISE = /* glsl */`
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// Octaves finer than the pixel footprint fade to their mean.
float fbm3(vec3 p, float fp, int oct) {
  float s = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 9; i++) {
    if (i >= oct) break;
    s += a * mix(0.5, vn3(p * f), 1.0 - smoothstep(0.25, 0.5, f * fp));
    f *= 2.03; a *= 0.5;
  }
  return s / (1.0 - a * 2.0 + 1e-4);
}`;

export function makeSpace() {
  const U = {
    uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uEye: { value: new THREE.Vector3(0, 6371.4, 0) }, uSun: { value: new THREE.Vector3(1, 0, 0) },
    uSite: { value: new THREE.Vector3(0, 1, 0) }, uEast: { value: new THREE.Vector3(1, 0, 0) },
    uMoon: { value: new THREE.Vector4(0, 0, 0, 0) },
    uPlanet: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uMilky: { value: new THREE.Vector3(0.3, 0.8, -0.5).normalize() },
    uSunE: { value: 20 }, uTime: { value: 0 }, uCosmos: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
    precision highp float;
    uniform mat4 uProjInv, uCamWorld;
    uniform vec3 uEye, uSun, uSite, uEast, uMilky;
    uniform vec4 uMoon, uPlanet[3];
    uniform float uSunE, uTime, uCosmos;
    varying vec2 vUv;
    const float R = 6371.0, RA = 6471.0, PI = 3.14159265;
    const vec3 BR = vec3(5.802e-3, 13.558e-3, 33.1e-3);
    const float BMS = 3.996e-3, BME = 4.44e-3, G = 0.76;
    const vec3 BO = vec3(0.65e-3, 1.881e-3, 0.085e-3);
    ${NOISE}
    vec2 sph(vec3 o, vec3 d, float r) {
      float b = dot(o, d), c = dot(o, o) - r * r, h = b * b - c;
      if (h < 0.0) return vec2(-1.0, -2.0);
      h = sqrt(h);
      return vec2(-b - h, -b + h);
    }
    vec2 sph(vec3 o, vec3 d, vec3 c, float r) { return sph(o - c, d, r); }
    vec3 dens(float h) { return vec3(exp(-h / 8.0), exp(-h / 1.2), max(0.0, 1.0 - abs(h - 25.0) / 15.0)); }
    vec3 extOf(vec3 od) { return BR * od.x + BME * od.y + BO * od.z; }
    // Sunlight that reaches p; the Earth's shadow has a soft edge.
    vec3 sunT(vec3 p) {
      float r = length(p), b = dot(p, uSun);
      float rmin = b < 0.0 ? sqrt(max(0.0, r * r - b * b)) : r;
      float vis = smoothstep(-2.0, 2.0, rmin - R);
      if (vis <= 0.0) return vec3(0.0);
      float tt = max(sph(p, uSun, RA).y, 0.0), ds = tt / 6.0;
      vec3 od = vec3(0.0);
      for (int i = 0; i < 6; i++) { vec3 q = p + uSun * (float(i) + 0.5) * ds; od += dens(max(length(q) - R, 0.0)) * ds; }
      return vis * exp(-extOf(od));
    }
    // Light scattered toward the eye, and what passes, along o + d t.
    void air(vec3 o, vec3 d, float tMax, out vec3 L, out vec3 T) {
      L = vec3(0.0); T = vec3(1.0);
      vec2 ta = sph(o, d, RA);
      if (ta.y < 0.0) return;
      float t0 = max(ta.x, 0.0), t1 = min(ta.y, tMax);
      if (t1 <= t0) return;
      float mu = dot(d, uSun);
      float pR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
      float pM = 3.0 / (8.0 * PI) * ((1.0 - G * G) * (1.0 + mu * mu)) / ((2.0 + G * G) * pow(1.0 + G * G - 2.0 * G * mu, 1.5));
      // Samples crowd near the eye, where the air changes fastest.
      bool inside = length(o) < RA;
      float span = t1 - t0;
      vec3 od = vec3(0.0);
      const int N = 18;
      for (int i = 0; i < N; i++) {
        float s0 = float(i) / float(N), s1 = float(i + 1) / float(N);
        float a = inside ? s0 * s0 : s0, b = inside ? s1 * s1 : s1;
        float ds = (b - a) * span;
        vec3 p = o + d * (t0 + 0.5 * (a + b) * span);
        float h = max(length(p) - R, 0.0);
        vec3 dn = dens(h);
        vec3 tv = exp(-extOf(od) - extOf(dn) * ds * 0.5);
        L += tv * sunT(p) * (BR * dn.x * pR + BMS * dn.y * pM) * ds;
        od += dn * ds;
      }
      T = exp(-extOf(od));
      L *= uSunE;
    }
    // The Earth's surface radiance at P. fp is the pixel footprint in km.
    vec3 earth(vec3 P, vec3 d, float fp) {
      vec3 n = normalize(P);
      float c = fbm3(n * 2.3 + 4.0, fp / R * 2.3, 7);
      float det = fbm3(P / 22.0, fp / 22.0, 8);
      float fine = fbm3(P / 2.5, fp / 2.5, 6);
      // Near the pad, land lies west and the sea east.
      float near = dot(n, uSite);
      float coast = dot(n, -uEast) * R / 14.0 + 0.3 + (det - 0.5) * 2.2 + (c - 0.5) * 2.0;
      float lf = mix(c - 0.535, coast * 0.05, smoothstep(0.97, 0.995, near));
      float land = smoothstep(-0.015, 0.015, lf);
      vec3 lc = mix(vec3(0.03, 0.07, 0.025), vec3(0.11, 0.12, 0.06), smoothstep(0.4, 0.75, det + (c - 0.55) * 2.0 + (fine - 0.5) * 0.6));
      vec3 alb = mix(vec3(0.008, 0.028, 0.07), lc, land);
      float cl = fbm3(n * 4.0 + vec3(1.7, 0.0, 3.1), fp / R * 4.0, 6) * 0.55 + fbm3(P / 34.0, fp / 34.0, 8) * 0.45;
      float cov = smoothstep(0.54, 0.7, cl);
      float mu = dot(n, uSun);
      vec3 sc = sunT(P + n * 0.05);
      vec3 col = alb * max(mu, 0.0);
      vec3 h = normalize(uSun - d);
      col += pow(max(dot(n, h), 0.0), 300.0) * 30.0 * (1.0 - land) * (1.0 - cov) * step(0.0, mu);
      col = mix(col, vec3(0.92, 0.94, 0.98) * max(mu * (0.75 + 0.5 * cl), 0.0), cov);
      col *= sc * uSunE / PI;
      // Twilight: the lit sky above still lights the ground a little.
      col += alb * uSunE * 0.004 * smoothstep(-0.2, 0.05, mu) * vec3(0.5, 0.65, 1.0);
      // Towns glow where the sun is gone.
      // Towns: clusters some 10 km wide, made of fine points of light.
      float city = smoothstep(0.68, 0.85, vn3(P / 7.0 + 5.0)) * land * (1.0 - cov);
      float dots = step(0.86, vn3(P / 0.09)) * (0.4 + vn3(P / 0.03));
      float town = city * mix(dots, 0.1, smoothstep(0.03, 0.2, fp));
      col += vec3(1.0, 0.62, 0.3) * town * 0.012 * (1.0 - smoothstep(0.0, 0.2, dot(sc, vec3(0.33))));
      return col;
    }
    vec3 moon(vec3 P, vec3 d, float fp) {
      vec3 n = normalize(P - uMoon.xyz);
      float mare = smoothstep(0.48, 0.58, fbm3(n * 2.1 + 9.0, fp / uMoon.w * 2.1, 5));
      float cr = fbm3(n * 14.0, fp / uMoon.w * 14.0, 6);
      float alb = mix(0.16, 0.08, mare) * (0.75 + 0.5 * cr);
      float mu0 = dot(n, uSun), mu = max(dot(n, -d), 1e-3);
      // Lommel-Seeliger keeps the Moon flat-lit, not a ball.
      return vec3(alb * (mu0 > 0.0 ? 2.0 * mu0 / (mu0 + mu) : 0.0) * uSunE / PI);
    }
    vec3 stars(vec3 d, float px) {
      vec3 acc = vec3(0.0);
      for (int l = 0; l < 2; l++) {
        float K = l == 0 ? 70.0 : 170.0;
        vec3 g = d * K, c = floor(g), f = fract(g);
        float h = h31(c + float(l) * 31.7);
        if (h > 0.93) {
          vec3 sp = 0.2 + 0.6 * vec3(h31(c + 3.1), h31(c + 5.7), h31(c + 8.3));
          float dd = length(f - sp) / K, sz = px * 0.7;
          float b = pow(h31(c + 11.0), 6.0) * (l == 0 ? 3.0 : 1.0) + 0.04;
          acc += mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.7), h31(c + 2.0)) * b * exp(-dd * dd / (sz * sz)) * 1.6 * (1.0 + 1.5 * uCosmos);
        }
      }
      // The Milky Way: a narrow core, a wide glow, a bright bulge, dust lanes.
      float lat = dot(d, uMilky);
      float core = exp(-lat * lat / 0.012), wide = exp(-lat * lat / 0.1);
      vec3 gc = normalize(cross(uMilky, vec3(0.3, 0.1, 0.9)));
      float bulge = exp(-(1.0 - dot(d, gc)) * 5.0);
      vec3 w = d * 16.0 + vec3(fbm3(d * 5.0, px * 5.0, 4), fbm3(d * 5.0 + 7.0, px * 5.0, 4), 0.0) * 1.5;
      float cloud = fbm3(w, px * 16.0, 7);
      float dust = smoothstep(0.48, 0.66, fbm3(d * 13.0 + 2.0, px * 13.0, 7)) * core;
      float glow = (core * 0.7 + wide * 0.22 + bulge * core * 2.2) * (0.35 + 0.9 * smoothstep(0.3, 0.75, cloud)) * (1.0 - 0.85 * dust);
      vec3 mwc = mix(vec3(0.55, 0.62, 0.85), vec3(1.0, 0.86, 0.66), bulge);
      acc += mwc * glow * 0.012 * (1.0 + 7.0 * uCosmos);
      // A dense field of faint stars crowds the band.
      vec3 g3 = d * 420.0, c3 = floor(g3), f3 = fract(g3);
      float h3 = h31(c3 + 77.0);
      if (h3 > 0.985 - 0.2 * wide) {
        vec3 sp = 0.2 + 0.6 * vec3(h31(c3 + 1.3), h31(c3 + 4.1), h31(c3 + 6.7));
        float dd = length(f3 - sp) / 420.0, sz = px * 0.6;
        acc += vec3(0.85, 0.88, 1.0) * 0.12 * (0.3 + 0.7 * uCosmos) * exp(-dd * dd / (sz * sz));
      }
      return acc;
    }
    void main() {
      vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      vec3 d = normalize(mat3(uCamWorld) * (v.xyz / v.w));
      float px = max(length(fwidth(d)), 1e-5) * 0.7;
      vec3 col = stars(d, px);
      for (int i = 0; i < 3; i++) {
        if (uPlanet[i].w <= 0.0) continue;
        float a = acos(clamp(dot(d, normalize(uPlanet[i].xyz)), -1.0, 1.0)), s = px * 1.1;
        vec3 pc = i == 0 ? vec3(1.0, 0.96, 0.9) : i == 1 ? vec3(1.0, 0.86, 0.66) : vec3(1.0, 0.55, 0.35);
        col += pc * uPlanet[i].w * exp(-a * a / (s * s));
      }
      float sa = acos(clamp(dot(d, uSun), -1.0, 1.0));
      col += uSunE * (smoothstep(0.0047 + px, 0.0047, sa) * 3.0 + 0.05 * exp(-sa / 0.03));
      float tm = uMoon.w > 0.0 ? sph(uEye, d, uMoon.xyz, uMoon.w).x : -1.0;
      if (tm > 0.0) col = moon(uEye + d * tm, d, px * tm);
      float te = sph(uEye, d, R).x;
      bool hitE = te > 0.0 && (tm < 0.0 || te < tm);
      if (hitE) col = earth(uEye + d * te, d, px * te);
      vec3 L, T;
      air(uEye, d, hitE ? te : 1e9, L, T);
      col = col * T + L;
      // Far away the limb is thinner than a pixel: a halo keeps it seen.
      float de = length(uEye);
      float b = -dot(uEye, d);
      if (b > 0.0 && de > 30000.0) {
        float hgt = length(uEye + d * b) - R;
        float w = px * de * 1.5;
        float lit = smoothstep(-0.3, 0.4, dot(normalize(uEye + d * b), uSun));
        col += vec3(0.25, 0.5, 1.0) * exp(-max(hgt, 0.0) / w) * lit * 0.8 * (hitE ? 0.5 : 1.0) * smoothstep(30000.0, 80000.0, de);
      }
      gl_FragColor = vec4(clamp(col, 0.0, 48.0), 1.0);
    }`,
  });
  return { mat, U };
}
