// Ship launch spray: dense white spray and drops thrown where the hull hits the water.
// Kinds follow Ponlai's Spray.ts (github.com/HuberyLL/ponlai, MIT): drops draw as streaks
// whose opacity keeps their cross-section; dense spray is white from every side with a
// forward lobe toward the sun. The mist that hangs after lives in mist.js.
import * as THREE from 'three';

export const MAX_SPRAY = 7000;
const G = 9.81;

/** The particle store: flat arrays, reused slots. */
export function makeSpray() {
  const n = MAX_SPRAY;
  return {
    n: 0, seed: 7,
    p: new Float32Array(n * 3), v: new Float32Array(n * 3),
    age: new Float32Array(n), life: new Float32Array(n), size: new Float32Array(n), kind: new Uint8Array(n),
  };
}
const rnd = S => ((S.seed = (S.seed * 16807) % 2147483647) / 2147483647);

/**
 * Throws k particles from a point with a base velocity and a spread.
 * kind 0 is a drop, 1 is dense spray.
 */
export function emit(S, k, x, y, z, vx, vy, vz, spread, kind, size) {
  for (let i = 0; i < k; i++) {
    if (S.n >= MAX_SPRAY) return;
    const j = S.n++, j3 = j * 3;
    const r = () => (rnd(S) - 0.5) * 2;
    S.p[j3] = x + r() * 0.6; S.p[j3 + 1] = y; S.p[j3 + 2] = z + r() * 0.3;
    const sp = 0.65 + 0.7 * rnd(S);
    S.v[j3] = vx * sp + r() * spread; S.v[j3 + 1] = vy * sp + r() * spread * 0.6; S.v[j3 + 2] = vz * sp + r() * spread;
    S.age[j] = 0;
    S.kind[j] = kind;
    S.size[j] = size * (0.6 + 0.8 * rnd(S));
    S.life[j] = kind ? 1.3 + 1.2 * rnd(S) : 2.5 + 1.5 * rnd(S);
  }
}

/** Moves every particle; drops fall ballistic, spray slows in the air. */
export function stepSpray(S, dt, wind = 0) {
  let w = 0;
  for (let i = 0; i < S.n; i++) {
    const i3 = i * 3;
    const k = S.kind[i];
    // Drag: a drop keeps its speed; a spray cloud is stopped by the air.
    const drag = k ? 1.6 : 0.12;
    const f = Math.exp(-drag * dt);
    S.v[i3] = S.v[i3] * f + (1 - f) * wind;
    S.v[i3 + 1] = S.v[i3 + 1] * f - G * dt * (k ? 0.55 : 1);
    S.v[i3 + 2] *= f;
    S.p[i3] += S.v[i3] * dt; S.p[i3 + 1] += S.v[i3 + 1] * dt; S.p[i3 + 2] += S.v[i3 + 2] * dt;
    S.age[i] += dt;
    // Spray swells as it slows and spreads.
    if (k) S.size[i] *= 1 + dt * 0.4;
    const gone = S.age[i] > S.life[i] || S.p[i3 + 1] < -0.3;
    if (!gone) {
      if (w !== i) {
        const w3 = w * 3;
        S.p[w3] = S.p[i3]; S.p[w3 + 1] = S.p[i3 + 1]; S.p[w3 + 2] = S.p[i3 + 2];
        S.v[w3] = S.v[i3]; S.v[w3 + 1] = S.v[i3 + 1]; S.v[w3 + 2] = S.v[i3 + 2];
        S.age[w] = S.age[i]; S.life[w] = S.life[i]; S.size[w] = S.size[i]; S.kind[w] = S.kind[i];
      }
      w++;
    }
  }
  S.n = w;
}

const VS = /* glsl */`
attribute vec3 aP, aV;
attribute vec4 aK;
uniform vec2 uRes;
uniform float uShutter;
varying vec2 vQ;
varying vec4 vK;
varying vec3 vW;
void main() {
  vK = aK;
  // aK: x size (m), y life fraction, z kind, w seed.
  vec4 c0 = projectionMatrix * viewMatrix * vec4(aP, 1.0);
  vec2 q = position.xy;
  vQ = q;
  vec3 wp = aP;
  if (aK.z < 0.5) {
    // A drop: a streak along its screen motion over the shutter.
    vec4 c1 = projectionMatrix * viewMatrix * vec4(aP - aV * uShutter, 1.0);
    vec2 s0 = c0.xy / c0.w * uRes * 0.5, s1 = c1.xy / c1.w * uRes * 0.5;
    vec2 d = s0 - s1;
    float len = length(d);
    vec2 dir = len > 0.01 ? d / len : vec2(0.0, 1.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    float wpx = max(1.2, aK.x * uRes.y / c0.w);
    vec2 s = mix(s1, s0, q.y * 0.5 + 0.5) + nrm * q.x * wpx * 0.5 + dir * q.y * wpx * 0.5;
    gl_Position = vec4(s / (uRes * 0.5) * c0.w, c0.z, c0.w);
  } else {
    // Dense spray: a soft round cloud facing the eye.
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    wp = aP + (right * q.x + up * q.y) * aK.x;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
  vW = wp;
}`;
const FS = /* glsl */`
uniform vec3 uSun, uSunCol, uSky, uCam, uFog;
uniform float uFogD;
uniform sampler2D tFoam;
varying vec2 vQ;
varying vec4 vK;
varying vec3 vW;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.0796; }
void main() {
  vec3 rd = normalize(vW - uCam);
  float fade = smoothstep(1.0, 0.7, vK.y) * smoothstep(0.0, 0.04, vK.y);
  float cs = dot(rd, uSun);
  float a;
  vec3 col;
  if (vK.z < 0.5) {
    // A drop refracts the sky and glints when the sun is behind it.
    float r = abs(vQ.x);
    a = smoothstep(1.0, 0.3, r) * 0.55 * fade;
    col = uSky * 0.9 + uSunCol * (0.08 + 1.6 * hg(cs, 0.75) * 12.566 * 0.12);
  } else {
    // Dense spray: white, torn into strands by the foam pattern as it ages.
    float r = length(vQ);
    vec4 P = texture2D(tFoam, vQ * 0.22 + vK.w * vec2(3.7, 5.3));
    float body = smoothstep(1.0, 0.2, r);
    float tear = smoothstep(0.25 + 0.5 * vK.y, 0.55 + 0.4 * vK.y, P.r * 0.8 + body * 0.45);
    a = body * tear * fade * mix(0.8, 0.2, vK.y);
    // The thick core stays in its own shade; thin edges glow with the low sun.
    float ph = mix(hg(cs, 0.6), hg(cs, -0.2), 0.3) * 12.566;
    float thin = 1.0 - body * (0.55 + 0.45 * P.r);
    col = uSky * (0.42 + 0.25 * thin) + uSunCol * (0.05 + 0.32 * ph * (0.25 + thin));
  }
  float dist = length(vW - uCam);
  col = mix(col, uFog, 1.0 - exp(-uFogD * uFogD * dist * dist));
  gl_FragColor = vec4(col * a, a);
}`;

/** The draw: one instanced quad per particle. */
export function sprayMesh() {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPRAY * 3), 3);
  const aV = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPRAY * 3), 3);
  const aK = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPRAY * 4), 4);
  for (const a of [aP, aV, aK]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aP', aP); g.setAttribute('aV', aV); g.setAttribute('aK', aK);
  g.instanceCount = 0;
  const U = {
    uRes: { value: new THREE.Vector2(1, 1) }, uShutter: { value: 0.04 },
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uSky: { value: new THREE.Color(0.5, 0.55, 0.62) },
    uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogD: { value: 0 }, tFoam: { value: null },
  };
  // Premultiplied over: spray whitens what is behind it.
  const mat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  /** Copies the store into the attributes. */
  function upload(S) {
    const P = aP.array, V = aV.array, K = aK.array;
    for (let i = 0; i < S.n; i++) {
      const i3 = i * 3, i4 = i * 4;
      P[i3] = S.p[i3]; P[i3 + 1] = S.p[i3 + 1]; P[i3 + 2] = S.p[i3 + 2];
      V[i3] = S.v[i3]; V[i3 + 1] = S.v[i3 + 1]; V[i3 + 2] = S.v[i3 + 2];
      K[i4] = S.size[i]; K[i4 + 1] = S.age[i] / S.life[i]; K[i4 + 2] = S.kind[i]; K[i4 + 3] = (i * 0.618) % 1;
    }
    g.instanceCount = S.n;
    aP.needsUpdate = aV.needsUpdate = aK.needsUpdate = true;
    if (S.n) { aP.addUpdateRange(0, S.n * 3); aV.addUpdateRange(0, S.n * 3); aK.addUpdateRange(0, S.n * 4); }
  }
  return { mesh, U, upload };
}
