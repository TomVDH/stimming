// Strangereal city: bands of towers that rise with distance, windows by shader,
// sodium streets below, far ridges, and red lights on the tallest roofs.
import * as THREE from 'three';
import { col } from './kit.js';

// Each band: near and far distance, height range, width range, count.
// Heights put each skyline a little higher in angle than the one before.
const BANDS = [
  [250, 900, 30, 140, 18, 40, 260],
  [1200, 2000, 60, 185, 20, 45, 360],
  [2200, 3200, 90, 260, 25, 55, 380],
  [3500, 5000, 140, 400, 30, 60, 380],
  [5500, 8000, 220, 700, 30, 70, 340],
];

const HAZE = /* glsl */ `
  // Haze is warm and thick near the ground, a dark blue higher up.
  vec3 hazeAt(vec3 w, float H, out float amt) {
    float dist = length(w - cameraPosition), up = clamp((w.y + H) / 500.0, 0.0, 1.0);
    amt = 1.0 - exp(-dist / 3000.0 * mix(1.1, 0.8, up));
    // A little afterglow warms the low haze; most of it stays blue.
    return mix(mix(uHaze, uHor, 0.75), mix(uHaze, uHor, 0.35), up);
  }
  float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`;

export function cityBands(group, R, { H }) {
  const u = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3(1, 1, 1) },
    uHor: { value: new THREE.Vector3() }, uHaze: { value: new THREE.Vector3() }, uFocal: { value: 1500 }, uT: { value: 0 },
  };

  /* ---------- towers ---------- */
  const mats = [], seeds = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tops = [];
  for (const [z0, z1, h0, h1, w0, w1, n] of BANDS) {
    for (let i = 0; i < n; i++) {
      const z = -(z0 + R() * (z1 - z0)), spread = -z * 0.2 + 100;
      const x = (R() - 0.5) * 2 * spread, h = h0 + Math.pow(R(), 1.6) * (h1 - h0), w = w0 + R() * (w1 - w0), d = w0 + R() * (w1 - w0);
      m4.compose(p.set(x, -H, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 0.3), s.set(w, h, d));
      mats.push(m4.clone()); seeds.push(R());
      // Some towers carry a spire; the tallest carry a red light.
      if (h > 200 && R() < 0.2) { m4.compose(p.set(x, -H + h, z), q, s.set(w * 0.12, h * 0.15, d * 0.12)); mats.push(m4.clone()); seeds.push(-1); }
      if (h > 180 && R() < 0.35) tops.push(x, -H + h + (h > 200 ? 4 : 1), z, R() * 6);
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      varying vec3 vW, vN; varying float vSeed;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        vec4 w = m * vec4(position, 1.0);
        vW = w.xyz; vN = normalize(mat3(m) * normal); vSeed = aSeed;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW, vN; varying float vSeed;
      uniform vec3 uSunDir, uSunCol, uHor, uHaze; uniform float uFocal, uT;
      ${HAZE}
      void main() {
        vec3 n = normalize(vN);
        float up = vW.y + ${H.toFixed(1)};
        // A dark facade that the low sun warms where it faces it.
        vec3 base = vec3(0.03, 0.035, 0.055) + uSunCol * 0.02 * max(dot(n, uSunDir), 0.0);
        float glow = 0.0; vec3 wc = vec3(1.0, 0.72, 0.42);
        if (abs(n.y) < 0.5 && vSeed >= 0.0) {
          float along = abs(n.x) > 0.5 ? vW.z : vW.x;
          vec2 g = vec2(along / 3.2, up / 3.6), cell = floor(g), f = fract(g);
          float win = step(0.3, f.x) * step(f.x, 0.7) * step(0.35, f.y) * step(f.y, 0.75);
          float frac = 0.04 + 0.16 * fract(vSeed * 7.13);
          float lit = step(hh(cell + vSeed * 91.7), frac);
          wc = mix(wc, vec3(0.72, 0.84, 1.0), step(0.72, hh(cell * 1.31 + vSeed)));
          // Past a pixel per window, the windows blend to their mean glow.
          float foot = length(vW - cameraPosition) / uFocal;
          glow = mix(frac * 0.16, win * lit, smoothstep(1.6, 0.5, foot));
        }
        if (n.y > 0.5) base *= 0.6;
        float amt; vec3 hz = hazeAt(vW, ${H.toFixed(1)}, amt);
        vec3 c = mix(base, hz, amt) + wc * glow * 1.7 * (1.0 - 0.65 * amt);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }), mats.length);
  mats.forEach((m, i) => mesh.setMatrixAt(i, m));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from(seeds), 1));
  mesh.frustumCulled = false;
  group.add(mesh);

  /* ---------- streets ---------- */
  // The ground glows in a sodium grid under the haze.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30000, 16000), new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      uniform vec3 uHor, uHaze; uniform float uFocal;
      ${HAZE}
      void main() {
        vec2 g = vW.xz / 110.0, f = abs(fract(g) - 0.5);
        float foot = length(vW - cameraPosition) / uFocal;
        float street = smoothstep(0.47, 0.5, max(f.x, f.y));
        street = mix(0.18, street, smoothstep(30.0, 6.0, foot));
        vec3 c = vec3(0.03, 0.03, 0.035) + vec3(1.0, 0.55, 0.2) * street * 0.9;
        float amt; vec3 hz = hazeAt(vW, ${H.toFixed(1)}, amt);
        gl_FragColor = vec4(mix(c, hz, amt) + vec3(1.0, 0.55, 0.2) * street * 0.3 * (1.0 - amt), 1.0);
      }`,
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -H, -8000);
  group.add(ground);

  /* ---------- ridges ---------- */
  // Dark ridges close the far end of the plain.
  for (const [z, top, L, ph] of [[-11000, 900, 0.3, 1], [-14000, 1400, 0.36, 4]]) {
    const sh = new THREE.Shape(), w = 40000;
    sh.moveTo(-w / 2, -H - 50);
    for (let i = 0; i <= 120; i++) {
      const x = -w / 2 + (w * i) / 120, k = x / 2500;
      sh.lineTo(x, -H + top * (0.45 + 0.3 * Math.sin(k + ph) + 0.15 * Math.sin(k * 2.7 + ph * 2) + 0.08 * Math.sin(k * 7.1)));
    }
    sh.lineTo(w / 2, -H - 50);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col([L, 0.05, 268]), fog: false }));
    m.position.z = z;
    group.add(m);
  }

  /* ---------- aviation lights ---------- */
  const lg = new THREE.BufferGeometry();
  const pos = [], ph = [];
  for (let i = 0; i < tops.length; i += 4) { pos.push(tops[i], tops[i + 1], tops[i + 2]); ph.push(tops[i + 3]); }
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  lg.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1));
  const lights = new THREE.Points(lg, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `attribute float aPh; varying float vA; uniform float uT;
      void main() { vA = step(0.55, fract(uT * 0.5 + aPh)); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 3.0; }`,
    fragmentShader: /* glsl */ `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.12, 0.05) * vA * smoothstep(0.5, 0.1, d) * 2.0, 1.0); }`,
  }));
  lights.frustumCulled = false;
  group.add(lights);

  return {
    tick(t, sun, cam, viewH, sky) {
      u.uT.value = t;
      u.uSunDir.value.copy(sun.dir); u.uSunCol.value.copy(sun.col);
      u.uHor.value.copy(sky.hor); u.uHaze.value.copy(sky.haze);
      u.uFocal.value = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    },
  };
}
