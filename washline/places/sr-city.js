// Strangereal city: bands of towers that rise with distance, shaded for an
// anime day: sky-lit roofs, sunlit and shadow faces, glass that holds the sky,
// pale blue aerial perspective, smoke columns, red lights on the tallest roofs.
import * as THREE from 'three';
import { col } from './kit.js';

// Each band: near and far distance, height range, width range, count.
// Heights put each skyline a little higher in angle than the one before.
const BANDS = [
  [250, 900, 30, 140, 18, 40, 380],
  [1200, 2000, 60, 185, 20, 45, 560],
  [2200, 3200, 90, 260, 25, 55, 620],
  [3500, 5000, 140, 400, 30, 60, 620],
  [5500, 8000, 220, 700, 30, 70, 700],
  // Megastructures: dark slabs a kilometre high on the far plain.
  [9000, 12500, 500, 1300, 80, 220, 110],
];

const HAZE = /* glsl */ `
  // Aerial perspective: far towers fade to the horizon's pale cyan,
  // and toward the azure the higher they stand.
  vec3 hazeAt(vec3 w, float H, out float amt) {
    float dist = length(w - cameraPosition), up = clamp((w.y + H) / 2500.0, 0.0, 1.0);
    amt = 1.0 - exp(-dist / 14000.0 * mix(1.0, 0.6, up));
    return mix(vec3(0.36, 0.52, 0.78), vec3(0.24, 0.42, 0.85), up);
  }
  float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`;

export function cityBands(group, R, { H }) {
  const u = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3(1, 1, 1) },
    uHor: { value: new THREE.Vector3() }, uHaze: { value: new THREE.Vector3() }, uFocal: { value: 1500 }, uT: { value: 0 },
    uHazeLo: { value: new THREE.Vector3(0.62, 0.84, 1.0) }, uHazeHi: { value: new THREE.Vector3(0.12, 0.42, 1.0) },
  };

  /* ---------- towers ---------- */
  const mats = [], seeds = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tops = [];
  for (const [z0, z1, h0, h1, w0, w1, n] of BANDS) {
    for (let i = 0; i < n; i++) {
      // The city spreads wide, past both edges of the frame.
      const z = -(z0 + R() * (z1 - z0)), spread = -z * 0.42 + 160;
      const x = (R() - 0.5) * 2 * spread, h = h0 + Math.pow(R(), 1.6) * (h1 - h0), w = w0 + R() * (w1 - w0), d = w0 + R() * (w1 - w0);
      m4.compose(p.set(x, -H, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 0.3), s.set(w, h, d));
      mats.push(m4.clone()); seeds.push(R());
      // Megastructures step back in tiers and carry rows of red lights.
      if (h > 700) {
        for (let k = 1; k <= 2; k++) { m4.compose(p.set(x, -H + h * (1 + 0.12 * (k - 1)), z), q, s.set(w * (1 - 0.3 * k), h * 0.12, d * (1 - 0.3 * k))); mats.push(m4.clone()); seeds.push(R()); }
        for (let k = 0; k < 4; k++) tops.push(x + (k - 1.5) * w * 0.25, -H + h * 0.4 + k * h * 0.15, z + d / 2 + 2, R() * 6);
      }
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
      uniform vec3 uSunDir, uSunCol, uHazeLo, uHazeHi; uniform float uFocal, uT;
      ${HAZE}
      void main() {
        vec3 n = normalize(vN);
        float up = vW.y + ${H.toFixed(1)};
        float seed = max(vSeed, 0.0);
        // Concrete and glass in cool greys; each tower its own tone.
        vec3 alb = mix(vec3(0.34, 0.38, 0.46), vec3(0.52, 0.55, 0.62), fract(seed * 13.1));
        float sun = max(dot(n, uSunDir), 0.0), sky = 0.5 + 0.5 * n.y;
        // Deep blue shade, sky fill from above, hard sunlight on the faces that meet it.
        vec3 shade = vec3(0.02, 0.045, 0.13) + vec3(0.12, 0.24, 0.55) * sky * 0.4;
        vec3 c = alb * (shade + uSunCol * 0.7 * sun);
        // The street canyons swallow the light near the ground.
        c *= mix(0.35, 1.0, smoothstep(0.0, 220.0, up));
        if (abs(n.y) < 0.5 && vSeed >= 0.0) {
          float along = abs(n.x) > 0.5 ? vW.z : vW.x;
          vec2 g = vec2(along / 3.2, up / 3.6), cell = floor(g), f = fract(g);
          float win = step(0.12, f.x) * step(f.x, 0.88) * step(0.18, f.y) * step(f.y, 0.86);
          // Glass holds the sky: lighter blue panes, some dark, some catching sun.
          vec3 glass = mix(vec3(0.015, 0.03, 0.08), vec3(0.08, 0.16, 0.34), hh(cell + seed * 37.0)) * (0.6 + 0.6 * sky);
          glass += uSunCol * 0.5 * sun * step(0.86, hh(cell * 1.7 + seed));
          float foot = length(vW - cameraPosition) / uFocal;
          float res = smoothstep(1.4, 0.45, foot);
          c = mix(c, mix(c * 0.8 + glass * 0.2, glass, win), mix(0.5, 1.0, res) * 0.8);
          // Floor lines band the facades.
          c *= 1.0 - 0.18 * step(0.93, f.y) * res;
        }
        if (n.y > 0.5) c = alb * (vec3(0.3, 0.45, 0.8) * 0.6 + uSunCol * 0.4 * max(uSunDir.y, 0.0));
        float amt; vec3 hz = hazeAt(vW, ${H.toFixed(1)}, amt);
        gl_FragColor = vec4(mix(c, hz, amt), 1.0);
      }`,
  }), mats.length);
  mats.forEach((m, i) => mesh.setMatrixAt(i, m));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from(seeds), 1));
  mesh.frustumCulled = false;
  group.add(mesh);

  /* ---------- streets ---------- */
  // The ground glows in a sodium grid under the haze.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 20000), new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      uniform vec3 uHazeLo, uHazeHi;
      ${HAZE}
      void main() { float amt; vec3 hz = hazeAt(vW, ${H.toFixed(1)}, amt); gl_FragColor = vec4(mix(vec3(0.05, 0.08, 0.16), hz, amt), 1.0); }`,
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -H, -8000);
  group.add(ground);

  /* ---------- smoke columns ---------- */
  // Fires burn on the far plain; their smoke leans away on the wind.
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform float uT; uniform vec3 uHazeLo;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + 1.0), f.x), f.y); }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 7.7; a *= 0.5; } return s; }
      void main() {
        float y = vUv.y, cx = 0.3 + 0.45 * y * y, w = 0.03 + 0.22 * pow(y, 0.8);
        float n = fbm(vec2(vUv.x * 5.0, y * 6.0 - uT * 0.06));
        float d = smoothstep(1.0, 0.2, abs(vUv.x - cx) / w + (n - 0.5) * 0.9) * smoothstep(1.0, 0.55, y);
        // Daylit smoke: brown-grey, lighter where the sun finds its billows.
        vec3 c = mix(vec3(0.16, 0.15, 0.16), vec3(0.42, 0.42, 0.46), n) * mix(vec3(1.0), uHazeLo, 0.25 * y);
        // The fire lights the foot of the column from below.
        c += vec3(1.0, 0.42, 0.12) * 2.2 * pow(1.0 - y, 14.0) * (0.6 + 0.4 * sin(uT * 3.0 + vUv.x * 20.0));
        gl_FragColor = vec4(c, d * 0.72);
      }`,
  });
  for (const [x, z, sz] of [[-1500, -7000, 1], [2300, -9500, 1.3], [-500, -11800, 1.6]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(900 * sz, 2400 * sz), smokeMat);
    m.position.set(x, -H + 1300 * sz, z);
    m.renderOrder = 3;
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
