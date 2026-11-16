// Calaeno's plumes: the Railgun rock's smoke train, with its shading whole.
// Source: railgun/index.html, "trail: a raymarched smoke train".
// Kept word for word: the density, the march, the sun-shadow march, the phase, the fire.
// Cut: the plasma sheath, the blast light, the soot ball, chain segments.
// Changed: the march starts at the proxy, so a far eye keeps float precision.
import * as THREE from 'three';
import { linFit } from '../shared/stim.js';
import { AIR, AIR_U } from './air.js';

/* ---------- vol: a tiled 3D billow noise, baked on the GPU ---------- */
// R holds Perlin-Worley billows; G holds fine Worley for erosion.
// One quad draws each slice of the volume, once, at load.
export function bakeVol(renderer, N = 96) {
  const rt = new THREE.WebGL3DRenderTarget(N, N, N, { depthBuffer: false });
  rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
  rt.texture.wrapS = rt.texture.wrapT = rt.texture.wrapR = THREE.RepeatWrapping;
  const bake = new THREE.ShaderMaterial({
    uniforms: { uZ: { value: 0 } }, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`varying vec2 vUv; uniform float uZ;
    vec3 h3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
      return fract(sin(p) * 43758.5453123);
    }
    // Inverted Worley noise; it tiles at f cells.
    float worley(vec3 uv, float f) {
      vec3 id = floor(uv * f), p = fract(uv * f);
      float md = 9.0;
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
        vec3 o = vec3(float(x), float(y), float(z));
        vec3 d = o + h3(mod(id + o, f)) * 0.8 + 0.1 - p;
        md = min(md, dot(d, d));
      }
      return clamp(1.0 - sqrt(md), 0.0, 1.0);
    }
    float grad(vec3 i, vec3 w, vec3 o, float f) { return dot(h3(mod(i + o, f)) * 2.0 - 1.0, w - o); }
    // Gradient noise; it tiles at f cells.
    float perlin(vec3 uv, float f) {
      vec3 p = uv * f, i = floor(p), w = fract(p);
      vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
      return mix(mix(mix(grad(i, w, vec3(0, 0, 0), f), grad(i, w, vec3(1, 0, 0), f), u.x), mix(grad(i, w, vec3(0, 1, 0), f), grad(i, w, vec3(1, 1, 0), f), u.x), u.y),
                 mix(mix(grad(i, w, vec3(0, 0, 1), f), grad(i, w, vec3(1, 0, 1), f), u.x), mix(grad(i, w, vec3(0, 1, 1), f), grad(i, w, vec3(1, 1, 1), f), u.x), u.y), u.z);
    }
    void main() {
      vec3 p = vec3(vUv, uZ);
      float pf = clamp(0.5 + 0.8 * (perlin(p, 4.0) + 0.5 * perlin(p, 8.0) + 0.25 * perlin(p, 16.0)), 0.0, 1.0);
      float wf = worley(p, 4.0) * 0.625 + worley(p, 8.0) * 0.25 + worley(p, 16.0) * 0.125;
      float fine = worley(p, 6.0) * 0.625 + worley(p, 12.0) * 0.25 + worley(p, 24.0) * 0.125;
      gl_FragColor = vec4(wf + pf * (1.0 - wf), fine, wf, 1.0);
    }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bake);
  const flat = new THREE.Camera();
  for (let z = 0; z < N; z++) {
    bake.uniforms.uZ.value = (z + 0.5) / N;
    renderer.setRenderTarget(rt, z);
    renderer.render(quad, flat);
  }
  renderer.setRenderTarget(null);
  bake.dispose(); quad.geometry.dispose();
  return rt.texture;
}

/* ---------- trail: a raymarched smoke train behind one engine bank ---------- */
// A cone runs from the head along away.
// u counts local radii along the cone; the noise keeps one scale.
const GEO = new THREE.CylinderGeometry(1, 1, 1, 20, 1);

const VERT = /* glsl */`
uniform vec3 uHead, uAway, uSide, uUpv;
uniform float uRad, uLen, uK;
varying vec3 vP;
void main() {
  // The proxy is the cone, padded by half its radius.
  float x = mix(-1.6 * uRad, uLen, position.y + 0.5);
  float r = 1.6 * (1.05 * uRad + uK * max(x, 0.0));
  vP = uHead + uAway * x + (uSide * position.x + uUpv * position.z) * r;
  gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
}`;

const FRAG = /* glsl */`precision highp sampler3D;
// The noise has no mipmaps: level 0 always.
#define texture(s, p) textureLod(s, p, 0.0)
varying vec3 vP;
uniform sampler3D uVol;
uniform vec3 uHead, uAway, uSide, uUpv, uHot, uFireC, uEmberC, uSoot, uAsh;
uniform float uRad, uLen, uK, uBurn, uTrail, uFlow, uTaper;
uniform int uSteps, uLSteps;
${AIR}
float c01(float x) { return clamp(x, 0.0, 1.0); }
float rmp(float x, float a, float b) { return c01((x - a) / (b - a)); }
// The smoke's density at q, a point measured from the head.
// g: metres along, radii along, local radius, radial place.
float trail(vec3 q, bool fine, out vec4 g, out float e) {
  float r0 = 1.05 * uRad;
  float x = dot(q, uAway);
  float rr = r0 + uK * max(x, 0.0);
  float u = x > 0.0 ? log(1.0 + uK * x / r0) / uK : x / r0;
  vec2 v = vec2(dot(q, uSide), dot(q, uUpv)) / rr;
  // Wind shear bends the old smoke off its line.
  // A little curl, and a steady lean downwind as the smoke ages.
  v -= smoothstep(1.0, 9.0, u) * 0.45 * vec2(0.26 * sin(u * 0.83 + 1.3) + 0.16 * sin(u * 0.31), 0.22 * sin(u * 0.61 + 4.0) + 0.14 * cos(u * 0.27 + 2.0));
  v -= smoothstep(1.0, 20.0, u) * vec2(0.35, -0.08);
  float rv = length(v);
  g = vec4(x, u, rr, rv); e = 0.0;
  if (rv > 1.0 || u < -0.7) return 0.0;
  // Coverage: a full core, a ragged rim, thinner with age.
  float cov = (1.0 - smoothstep(0.3, 1.0, rv)) * mix(1.0, 0.62, smoothstep(2.0, 16.0, u)) * smoothstep(-0.6, 0.8, u) * (1.0 - smoothstep(0.55, 1.0, x / uLen));
  if (cov < 0.002) return 0.0;
  // A skew along u hides the tile repeat.
  // uFlow carries the billows down the train, out of the engine.
  vec3 p = vec3(u - uFlow, v.x + 0.37 * u, v.y + 0.19 * u) * 0.36;
  float d = c01(rmp(texture(uVol, p).r, 1.0 - cov, 1.0) * 3.0);
  if (fine && d > 0.0) {
    // Fine cells carve the rim into small lobes.
    e = texture(uVol, p * 3.1 + vec3(uTime * 0.017, 0.0, 0.0)).g;
    // Old smoke frays into wisps toward the tail's end.
    d = rmp(d, (1.0 - e) * mix(0.55, 0.85, smoothstep(0.35, 1.0, x / uLen)), 1.0);
  }
  return d;
}
float hg(float c, float k) { return (1.0 - k * k) / pow(1.0 + k * k - 2.0 * k * c, 1.5); }
void main() {
  // The march starts at the proxy: a far eye loses float precision.
  vec3 rd = normalize(vP - cameraPosition), o = vP - uHead;
  float R = uRad;
  float xo = dot(o, uAway), da = dot(rd, uAway);
  vec3 op = o - uAway * xo, dp = rd - uAway * da;
  // The ray meets the padded cone at the roots of a quadratic.
  float kp = 1.56 * uK, m = 1.65 * R + kp * xo, n = kp * da;
  float A = dot(dp, dp) - n * n, B = dot(op, dp) - m * n, C = dot(op, op) - m * m;
  if (abs(A) < 1e-6) A = 1e-6;
  float disc = B * B - A * C;
  if (disc <= 0.0) discard;
  float sq = sqrt(disc);
  float t0 = (-B - sq) / A, t1 = A > 0.0 ? (-B + sq) / A : 1e9;
  // A negative radius marks the mirror cone.
  if (m + n * t0 < 0.0) discard;
  // The cone ends in front of the head and at its far tip.
  float xa = -1.6 * R, xb = uLen;
  if (abs(da) > 1e-5) {
    float s0 = (xa - xo) / da, s1 = (xb - xo) / da;
    t0 = max(t0, min(s0, s1)); t1 = min(t1, max(s0, s1));
  } else if (xo < xa || xo > xb) discard;
  t0 = max(t0, -length(vP - cameraPosition));
  if (t1 <= t0) discard;
  float dt = (t1 - t0) / float(uSteps);
  // Each pixel starts its march at its own offset.
  float t = t0 + dt * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float cs = dot(rd, uSun);
  float ph = 0.5 * hg(cs, 0.6) + 0.5 * hg(cs, -0.2);
  float T = 1.0, wsum = 0.0, tsum = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 96; i++) {
    if (i >= uSteps || T < 0.02) break;
    vec3 q = o + rd * t;
    vec4 g; float e;
    float d = trail(q, true, g, e);
    float x = g.x, rr = g.z;
    if (d > 0.0) {
      // Old smoke is thinner than young smoke.
      // It also thins with distance: a contrail tapers to clear air.
      float kap = 11.0 * mix(1.0, 0.38, smoothstep(3.0, 22.0, g.y)) * uTrail * exp(-max(x, 0.0) / uTaper);
      // A short march toward the sun finds the shadow.
      float tl = 0.0, ls = 0.13 * rr;
      vec3 ql = q;
      for (int j = 0; j < 6; j++) {
        if (j >= uLSteps) break;
        ql += uSun * ls;
        vec4 g2; float e2;
        tl += trail(ql, false, g2, e2) * kap / g2.z * ls;
        ls *= 1.8;
      }
      // The second term stands in for light that scatters many times.
      vec3 Ls = uSunC * (exp(-tl) * 0.8 + exp(-tl * 0.18) * 0.2) * ph * 1.25;
      float hgt = c01(0.5 + 0.5 * (q.y - uAway.y * x) / rr);
      vec3 La = mix(uHorC, uZenC, hgt) * 0.3 * (1.0 - 0.6 * d);
      vec3 S = mix(uSoot, uAsh, smoothstep(0.3, 8.0, g.y)) * (Ls + La);
      // Fire lives in the core, close behind the engine.
      float heat = c01(d * (1.0 - smoothstep(0.15, 0.95, g.w)) * exp(-max(x, 0.0) / (4.5 * R)) * uBurn * (0.6 + 0.9 * e));
      vec3 fire = mix(uEmberC * 2.0, uFireC * 5.0, smoothstep(0.08, 0.4, heat));
      fire = mix(fire, uHot * 9.0, smoothstep(0.45, 0.9, heat));
      S += fire * smoothstep(0.02, 0.3, heat);
      float a = 1.0 - exp(-d * kap / rr * dt);
      col += T * S * a;
      wsum += T * a; tsum += T * a * t;
      T *= 1.0 - a;
    }
    t += dt;
  }
  float al = 1.0 - T;
  if (al < 0.002 && max(col.r, col.b) < 0.002) discard;
  // The air acts once, at the smoke's mean depth.
  vec3 Pm = vP + rd * (wsum > 0.0 ? tsum / wsum : 0.5 * (t0 + t1));
  gl_FragColor = vec4(caAir(col, Pm, al), al);
}`;

// One train: rad at the head, k metres wider per metre, len metres long.
// burn is the rock's core fire, 0 to 1; a propeller's contrail has none.
// taper is the length, in metres, over which the smoke thins to a third.
export function makeTrail(vol, { rad, k, len, burn = 0, taper = 1e9 }) {
  const u = {
    ...AIR_U,
    uVol: { value: vol },
    uHead: { value: new THREE.Vector3() }, uAway: { value: new THREE.Vector3(0, 0, 1) },
    uSide: { value: new THREE.Vector3(1, 0, 0) }, uUpv: { value: new THREE.Vector3(0, 1, 0) },
    uRad: { value: rad }, uK: { value: k }, uLen: { value: len },
    uBurn: { value: burn }, uTrail: { value: 1 }, uFlow: { value: 0 }, uTaper: { value: taper },
    uSteps: { value: 72 }, uLSteps: { value: 4 },
    // The rock's own fire and ash; the fire stays off.
    uHot: { value: new THREE.Vector3(...linFit(0.95, 0.06, 80)) }, uFireC: { value: new THREE.Vector3(...linFit(0.7, 0.18, 45)) }, uEmberC: { value: new THREE.Vector3(...linFit(0.55, 0.18, 35)) },
    // A contrail is ice: near white from the first metre.
    uSoot: { value: new THREE.Vector3(...linFit(0.84, 0.008, 250)) }, uAsh: { value: new THREE.Vector3(...linFit(0.93, 0.012, 80)) },
  };
  const mesh = new THREE.Mesh(GEO, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: VERT, fragmentShader: FRAG,
  }));
  mesh.frustumCulled = false;
  const r0 = 1.05 * rad;
  return {
    mesh, u, rad, k, len,
    // Lays the train: head at pos, streaming along away.
    lay(pos, away) {
      u.uHead.value.copy(pos); u.uAway.value.copy(away).normalize();
      u.uSide.value.set(0, 1, 0).cross(u.uAway.value).negate().normalize();
      u.uUpv.value.crossVectors(u.uSide.value, u.uAway.value);
    },
    // How much of a ray from eye along dir this train covers, 0 to 1.
    cover(eye, dir) {
      const w = u.uAway.value, rx = eye.x - u.uHead.value.x, ry = eye.y - u.uHead.value.y, rz = eye.z - u.uHead.value.z;
      const b = dir.dot(w), d = dir.x * rx + dir.y * ry + dir.z * rz, e = w.x * rx + w.y * ry + w.z * rz;
      const den = 1 - b * b;
      if (den < 1e-6) return 0;
      const t = (b * e - d) / den, x = (e - b * d) / den;
      if (t <= 0 || x < 0 || x > len) return 0;
      const dx = rx + dir.x * t - w.x * x, dy = ry + dir.y * t - w.y * x, dz = rz + dir.z * t - w.z * x;
      return 1 - THREE.MathUtils.smoothstep(Math.hypot(dx, dy, dz) / (r0 + k * x), 0.45, 1.0);
    },
  };
}
