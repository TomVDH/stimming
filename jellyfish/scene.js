// Jellyfish tank: the three.js scene. A round window onto a blue-lit drum.
// The drum axis is world z; the camera looks down it from the front.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { T, CHAINS, bellShape, pack } from './sim.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const FOV = 30;
const SNOW = 900;

const NOISE = /* glsl */`
  float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y);
  }
`;
// Light in the drum: brighter near the top, where the lamps hang.
const LIGHT = /* glsl */`
  float lampAt(vec3 w) {
    float top = smoothstep(-6.5, 6.0, w.y);
    float cone = exp(-w.x * w.x / 40.0);
    return 0.42 + 0.75 * top * top + 0.3 * cone * top;
  }
`;
// The flow profile, as in sim.js flowAt().
const FLOW = /* glsl */`
  float prof(float r) {
    return (0.25 + 0.75 * smoothstep(0.0, ${T.R.toFixed(1)}, r)) * (1.0 - 0.6 * smoothstep(${(T.R * 0.9).toFixed(2)}, ${(T.R * 1.05).toFixed(2)}, r));
  }
`;

export function createScene(canvas, { onLost } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0, 0);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 5, 80);
  const disposables = [];
  const keep = x => (disposables.push(x), x);
  const view = { w: 1, h: 1, dpr: 1, cx: 0, cy: 0, rad: 1, D: 30 };

  // Shared uniforms: time, flow time, the window in device pixels.
  const U = {
    uTime: { value: 0 }, uFlowT: { value: 0 },
    uCenter: { value: new THREE.Vector2() }, uRad: { value: 1 }, uBackK: { value: 0.8 },
    uRes: { value: new THREE.Vector2(1, 1) }, uFog0: { value: 25 },
    uTaps: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
  };

  /* ---------- water ---------- */
  // A full-screen triangle behind everything: the drum's water and walls.
  const triGeo = keep(new THREE.BufferGeometry());
  triGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const waterMat = keep(new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`void main() { gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec2 uCenter; uniform float uRad, uTime, uBackK;
      ${NOISE}
      void main() {
        vec2 q = (gl_FragCoord.xy - uCenter) / uRad;
        float r = length(q);
        // The back wall: blue at the top under the lamps, near black below.
        float ly = clamp(q.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 deep = vec3(0.0004, 0.0025, 0.016);
        vec3 lit = vec3(0.01, 0.065, 0.32);
        vec3 col = mix(deep, lit, pow(ly, 2.3));
        col += vec3(0.006, 0.045, 0.2) * exp(-dot(q - vec2(0.0, 0.62), q - vec2(0.0, 0.62)) * 2.2);
        // Light shafts fan down from the lamps over the drum.
        vec2 s = q - vec2(0.0, 1.9);
        float ang = atan(s.x, -s.y);
        float sh = vn(vec2(ang * 13.0 + uTime * 0.04, uTime * 0.025)) * vn(vec2(ang * 29.0 - uTime * 0.03, 3.1 + uTime * 0.02));
        col += vec3(0.01, 0.06, 0.24) * sh * sh * 1.6 * smoothstep(-0.7, 0.9, q.y) * (1.0 - smoothstep(0.85, 1.0, r));
        // The drum wall between the back rim and the glass: curved, darker.
        float wall = smoothstep(uBackK - 0.02, uBackK + 0.05, r);
        float wl = clamp((r - uBackK) / (1.0 - uBackK), 0.0, 1.0);
        vec3 side = col * (0.42 + 0.25 * wl);
        // The wall catches lamp light in soft vertical streaks.
        float ap = atan(q.x, q.y);
        side += vec3(0.002, 0.014, 0.06) * vn(vec2(ap * 9.0, wl * 2.0)) * pow(ly, 2.5);
        col = mix(col, side, wall);
        // A faint bright seam where the back meets the wall.
        col += vec3(0.006, 0.03, 0.12) * exp(-pow((r - uBackK) / 0.005, 2.0)) * pow(ly, 1.8);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  const water = new THREE.Mesh(triGeo, waterMat);
  water.frustumCulled = false;
  water.renderOrder = -10;
  scene.add(water);

  /* ---------- marine snow ---------- */
  // Specks ride the current; a tap's ring shoves them aside.
  const snowGeo = keep(new THREE.BufferGeometry());
  {
    const a = new Float32Array(SNOW * 4);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < SNOW; i++) {
      a[i * 4] = Math.sqrt(rnd()) * (T.R - 0.2);
      a[i * 4 + 1] = rnd() * Math.PI * 2;
      a[i * 4 + 2] = T.zBack + 0.2 + rnd() * (T.zFront - T.zBack - 0.4);
      a[i * 4 + 3] = rnd();
    }
    snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SNOW * 3), 3));
    snowGeo.setAttribute('aP', new THREE.Float32BufferAttribute(a, 4));
  }
  const snowMat = keep(new THREE.ShaderMaterial({
    uniforms: { ...U, uPx: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aP;
      uniform float uTime, uFlowT, uPx, uFog0;
      uniform vec4 uTaps[4];
      varying float vA;
      ${FLOW}
      ${LIGHT}
      void main() {
        float r = aP.x;
        float th = aP.y - prof(r) / max(r, 0.3) * uFlowT;
        vec3 p = vec3(cos(th) * r, sin(th) * r, aP.z);
        // A slow wobble of each speck.
        p += 0.12 * vec3(sin(uTime * 0.3 + aP.w * 40.0), cos(uTime * 0.23 + aP.w * 31.0), sin(uTime * 0.17 + aP.w * 17.0));
        for (int i = 0; i < 4; i++) {
          vec4 t = uTaps[i];
          if (t.w <= 0.0) continue;
          vec3 d = p - vec3(t.xy, ${T.zFront.toFixed(1)});
          float l = length(d) + 1e-3;
          float front = t.z * ${T.wave.toFixed(1)};
          float passed = smoothstep(0.0, 1.2, front - l);
          float fade = exp(-max(0.0, t.z - l / ${T.wave.toFixed(1)}) / 1.4);
          p += d / l * passed * fade * t.w * 0.5 * exp(-l / 5.0);
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float far = exp(-max(0.0, -mv.z - uFog0) * 0.22);
        gl_PointSize = uPx * (0.9 + 1.6 * fract(aP.w * 7.3)) * 26.0 / -mv.z;
        vA = (0.16 + 0.3 * fract(aP.w * 13.1)) * far * lampAt(p);
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = exp(-dot(c, c) * 14.0) * vA;
        gl_FragColor = vec4(vec3(0.42, 0.66, 1.0) * a, 1.0);
      }`,
  }));
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  /* ---------- bells ---------- */
  // A lathe grid in (u, angle); the vertex shader shapes it for each stroke.
  const RINGS = 28, SEGS = 72;
  const bellGeo = keep(new THREE.BufferGeometry());
  {
    const uv = [], idx = [];
    for (let i = 0; i <= RINGS; i++) for (let k = 0; k <= SEGS; k++) uv.push(Math.pow(i / RINGS, 0.85), (k / SEGS) * Math.PI * 2);
    for (let i = 0; i < RINGS; i++) for (let k = 0; k < SEGS; k++) {
      const a = i * (SEGS + 1) + k, b = a + SEGS + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    bellGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(uv.length / 2 * 3), 3));
    bellGeo.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
    bellGeo.setIndex(idx);
  }
  const bellVS = /* glsl */`
    attribute vec2 aUV;
    uniform float uA, uRho, uFlat, uSize, uC, uWave;
    varying vec3 vN, vV, vW;
    varying vec2 vUV;
    vec3 shape(float u, float ang) {
      // The margin closes first: a wave runs out along the bell.
      float th = u * uA + uWave * sin(u * 3.14159) * 0.06;
      float r = uRho * sin(th);
      // Eight shallow notches on the margin hold the sense organs.
      r *= 1.0 - 0.04 * smoothstep(0.86, 1.0, u) * pow(abs(cos(ang * 4.0)), 24.0);
      float y = uRho * (cos(th) - cos(uA)) * uFlat;
      return vec3(cos(ang) * r, y, sin(ang) * r) * uSize;
    }
    void main() {
      float u = max(aUV.x, 0.002), ang = aUV.y;
      vec3 p = shape(u, ang);
      vec3 du = shape(min(u + 0.01, 1.0), ang) - shape(max(u - 0.01, 0.0), ang);
      vec3 da = shape(u, ang + 0.02) - shape(u, ang - 0.02);
      vec3 n = normalize(cross(da, du));
      vec4 w = modelMatrix * vec4(p, 1.0);
      vec4 mv = viewMatrix * w;
      vN = normalize(normalMatrix * n);
      vV = -mv.xyz;
      vW = w.xyz;
      vUV = vec2(aUV.x, ang);
      gl_Position = projectionMatrix * mv;
    }`;
  const bellFS = /* glsl */`
    uniform float uFog0, uC, uGlow;
    varying vec3 vN, vV, vW;
    varying vec2 vUV;
    ${NOISE}
    ${LIGHT}
    void main() {
      vec3 N = normalize(vN), V = normalize(vV);
      float f = abs(dot(N, V));
      float u = vUV.x, ang = vUV.y;
      vec2 q = vec2(cos(ang), sin(ang)) * u;
      // Thin clear jelly shows most where the eye grazes it.
      float rim = pow(1.0 - f, 2.6);
      // Four gonad horseshoes, open toward the centre.
      float gon = 0.0;
      for (int i = 0; i < 4; i++) {
        float a = 0.7854 + 1.5708 * float(i);
        vec2 c = vec2(cos(a), sin(a)) * 0.36;
        vec2 d = q - c;
        float ring = exp(-pow((length(d) - 0.13) / 0.035, 2.0));
        float open = smoothstep(-0.75, -0.2, dot(normalize(d + 1e-4), -normalize(c)) * -1.0);
        gon += ring * (0.35 + 0.65 * open);
      }
      // Sixteen radial canals and the ring canal near the margin.
      float k = fract(ang / 6.28318 * 16.0 + 0.5) - 0.5;
      float canal = exp(-pow(k * 6.28318 / 16.0 * u / 0.008, 2.0)) * smoothstep(0.42, 0.62, u);
      float ringc = exp(-pow((u - 0.93) / 0.012, 2.0));
      // The sense organs: eight bright dots in the notches.
      float rho = exp(-pow((u - 0.985) / 0.012, 2.0)) * pow(abs(cos(ang * 4.0)), 60.0);
      float marg = smoothstep(0.95, 1.0, u);
      float speck = vn(q * 38.0) * 0.25 + 0.75;
      float lamp = lampAt(vW);
      float far = exp(-max(0.0, length(vV) - uFog0) * 0.2);
      vec3 jelly = vec3(0.3, 0.56, 1.0);
      vec3 col = jelly * (0.03 + 0.75 * rim) * speck;
      col += vec3(0.6, 0.68, 1.0) * gon * (0.24 + 0.36 * f);
      col += jelly * (0.09 * canal + 0.22 * ringc + 0.3 * marg) + vec3(0.8, 0.9, 1.0) * rho * 0.9;
      col *= lamp * far * uGlow;
      gl_FragColor = vec4(col, 1.0);
    }`;

  /* ---------- tentacles and oral arms ---------- */
  // Chain points live in a float texture: one row per chain.
  let J = 0, tex = null, texData = null;
  const PER = 128, SEG = 22;
  function ribbonGeo(seg) {
    const g = new THREE.InstancedBufferGeometry();
    const a = [], idx = [];
    for (let i = 0; i <= seg; i++) a.push(i / seg, -1, i / seg, 1);
    for (let i = 0; i < seg; i++) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    g.setAttribute('aS', new THREE.Float32BufferAttribute(a, 2));
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((seg + 1) * 6), 3));
    g.setIndex(idx);
    return g;
  }
  const CHAIN = /* glsl */`
    uniform sampler2D uTex;
    vec3 pt(float row, float s) {
      float x = s * ${(T.N - 1).toFixed(1)};
      float i0 = floor(x), f = x - i0;
      vec3 a = texelFetch(uTex, ivec2(int(i0), int(row)), 0).xyz;
      vec3 b = texelFetch(uTex, ivec2(int(min(i0 + 1.0, ${(T.N - 1).toFixed(1)})), int(row)), 0).xyz;
      return mix(a, b, f);
    }
  `;
  const tentMat = keep(new THREE.ShaderMaterial({
    uniforms: { ...U, uTex: { value: null }, uW: { value: 1 }, uGlow: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec2 aS;
      attribute vec4 aT;
      uniform vec2 uRes;
      uniform float uW, uTime, uFog0;
      varying float vA, vSide;
      ${CHAIN}
      ${LIGHT}
      vec3 tent(float s) {
        float g0 = floor(aT.y), w = aT.y - g0, g1 = mod(g0 + 1.0, ${T.G.toFixed(1)});
        return mix(pt(aT.x + g0, s), pt(aT.x + g1, s), w);
      }
      void main() {
        float s = aS.x * aT.z;
        vec3 P = tent(s), P2 = tent(min(s + 0.03, 1.0)) + (s > 0.97 ? P - tent(s - 0.03) : vec3(0.0));
        vec3 tg = normalize(P2 - P + 1e-5);
        // Each tentacle curls a little on its own beat.
        vec3 side = normalize(cross(tg, vec3(0.0, 0.0, 1.0)) + 1e-5);
        P += side * sin(s * 14.0 + aT.w * 50.0 + uTime * (1.2 + aT.w)) * 0.035 * s;
        vec4 c0 = projectionMatrix * viewMatrix * vec4(P, 1.0);
        vec4 c1 = projectionMatrix * viewMatrix * vec4(P + tg * 0.05, 1.0);
        vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uRes;
        d = length(d) > 1e-4 ? normalize(d) : vec2(1.0, 0.0);
        // Under one device pixel the ribbon fades rather than thins.
        float want = uW * mix(1.0, 0.4, s);
        float wpx = max(want, 1.0);
        c0.xy += vec2(-d.y, d.x) * aS.y * wpx / uRes * c0.w;
        gl_Position = c0;
        float far = exp(-max(0.0, c0.w - uFog0) * 0.2);
        vA = pow(1.0 - s, 0.8) * (want / wpx) * far * lampAt(P) * (0.6 + 0.4 * fract(aT.w * 9.1));
        vSide = aS.y;
      }`,
    fragmentShader: /* glsl */`
      uniform float uGlow;
      varying float vA, vSide;
      void main() {
        float a = vA * (1.0 - vSide * vSide * 0.6) * uGlow;
        gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * a * 0.85, 1.0);
      }`,
  }));
  const armMat = keep(new THREE.ShaderMaterial({
    uniforms: { ...U, uTex: { value: null }, uGlow: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec2 aS;
      attribute vec4 aT;
      uniform float uTime, uFog0;
      varying float vA, vS;
      varying vec2 vQ;
      ${CHAIN}
      ${LIGHT}
      void main() {
        float s = aS.x;
        vec3 P = pt(aT.x, s);
        vec3 tg = normalize(pt(aT.x, min(s + 0.04, 1.0)) - pt(aT.x, max(s - 0.04, 0.0)) + 1e-5);
        vec3 eye = normalize(cameraPosition - P);
        vec3 side = normalize(cross(tg, eye) + 1e-5);
        // A frilled curtain: it folds as it twists down its length.
        float twist = 0.55 + 0.45 * abs(sin(s * 7.0 + aT.w * 20.0 + uTime * 0.4));
        float wid = aT.z * mix(0.55, 1.0, sin(min(s * 4.0, 1.5708))) * mix(1.0, 0.25, s * s) * twist;
        P += side * aS.y * wid;
        vec4 mv = viewMatrix * vec4(P, 1.0);
        gl_Position = projectionMatrix * mv;
        float far = exp(-max(0.0, -mv.z - uFog0) * 0.2);
        vA = far * lampAt(P) * smoothstep(1.0, 0.75, s);
        vS = s; vQ = vec2(aS.y, s * 30.0 + aT.w * 10.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uGlow;
      varying float vA, vS;
      varying vec2 vQ;
      ${NOISE}
      void main() {
        // Ruffled edges: the cut wanders, and folded edges glow brighter.
        float edge = 0.72 + 0.28 * sin(vQ.y * 2.3) * vn(vec2(vQ.y * 0.7, 1.0));
        float x = abs(vQ.x);
        if (x > edge) discard;
        float fold = smoothstep(edge - 0.25, edge, x);
        float mid = exp(-x * x / 0.02) * 0.6;
        float a = vA * (0.18 + 0.8 * fold + mid) * (0.75 + 0.25 * vn(vQ * vec2(6.0, 1.5)));
        gl_FragColor = vec4(vec3(0.5, 0.72, 1.0) * a * 0.75 * uGlow, 1.0);
      }`,
  }));
  const tentGeo = keep(ribbonGeo(SEG));
  const armGeo = keep(ribbonGeo(26));
  let tents = null, arms = null;
  const bells = [];

  function build(tank) {
    J = tank.jellies.length;
    texData = new Float32Array(T.N * J * CHAINS * 4);
    tex = keep(new THREE.DataTexture(texData, T.N, J * CHAINS, THREE.RGBAFormat, THREE.FloatType));
    tex.minFilter = tex.magFilter = THREE.NearestFilter;
    tentMat.uniforms.uTex.value = tex;
    armMat.uniforms.uTex.value = tex;
    // Tentacle instances: the jelly's first row, a place round the rim, a length, a seed.
    const t = new Float32Array(J * PER * 4);
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let j = 0; j < J; j++) for (let k = 0; k < PER; k++) {
      const o = (j * PER + k) * 4;
      t[o] = j * CHAINS; t[o + 1] = ((k + rnd() * 0.6) / PER) * T.G % T.G; t[o + 2] = 0.28 + 0.4 * rnd() * rnd(); t[o + 3] = rnd();
    }
    tentGeo.setAttribute('aT', new THREE.InstancedBufferAttribute(t, 4));
    tentGeo.instanceCount = J * PER;
    const a = new Float32Array(J * T.A * 4);
    for (let j = 0; j < J; j++) for (let k = 0; k < T.A; k++) {
      const o = (j * T.A + k) * 4;
      a[o] = j * CHAINS + T.G + k; a[o + 1] = 0; a[o + 2] = 0.2 * tank.jellies[j].size; a[o + 3] = rnd();
    }
    armGeo.setAttribute('aT', new THREE.InstancedBufferAttribute(a, 4));
    armGeo.instanceCount = J * T.A;
    tents = new THREE.Mesh(tentGeo, tentMat);
    arms = new THREE.Mesh(armGeo, armMat);
    tents.frustumCulled = arms.frustumCulled = false;
    scene.add(arms, tents);
    for (const j of tank.jellies) {
      const m = keep(new THREE.ShaderMaterial({
        uniforms: { ...U, uA: { value: 1 }, uRho: { value: 1 }, uFlat: { value: 0.6 }, uSize: { value: j.size }, uC: { value: 0 }, uWave: { value: 0 }, uGlow: { value: 1 } },
        vertexShader: bellVS, fragmentShader: bellFS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      const mesh = new THREE.Mesh(bellGeo, m);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      bells.push(mesh);
    }
  }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.16);
  composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, ...U, uSeed: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform vec2 uRes, uCenter;
      uniform float uRad, uSeed;
      uniform vec4 uTaps[4];
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      void main() {
        vec2 px = vUv * uRes;
        vec2 q = (px - uCenter) / uRad;
        float r = length(q);
        // A tap: a soft ring runs out over the glass and bends the view.
        vec2 off = vec2(0.0);
        float lift = 0.0, spot = 0.0;
        for (int i = 0; i < 4; i++) {
          vec4 t = uTaps[i];
          if (t.w <= 0.0) continue;
          vec2 d = q - t.xy;
          float l = length(d) + 1e-4;
          float x = l - t.z * ${(T.wave / T.R).toFixed(3)};
          float env = exp(-x * x / 0.006) * exp(-t.z * 1.5) * t.w;
          off += d / l * sin(x * 70.0) * env;
          lift += env * (0.5 + 0.5 * sin(x * 70.0));
          spot += exp(-l * l / 0.0015) * exp(-t.z * 9.0) * t.w;
        }
        vec3 col = texture2D(tDiffuse, vUv + off * 0.004 * uRad / uRes).rgb;
        col += vec3(0.02, 0.07, 0.2) * lift * 0.35 + vec3(0.25, 0.4, 0.7) * spot * 0.25;
        col *= mix(1.0, 0.78, smoothstep(0.55, 1.0, r));
        // The gallery wall round the window, with the tank's blue spill.
        float aa = 1.5 / uRad;
        float inside = smoothstep(1.0 + aa, 1.0 - aa, r);
        float ly = clamp(q.y * 0.35 + 0.5, 0.0, 1.0);
        vec3 wall = vec3(0.0028, 0.0032, 0.0048) + vec3(0.003, 0.014, 0.06) * exp(-(r - 1.0) * 4.5) * (0.5 + 0.5 * ly);
        // A dark seal hugs the glass, then the wall.
        wall *= smoothstep(1.0, 1.045, r) * 0.85 + 0.15;
        col = mix(wall, col, inside);
        // The acrylic edge catches the lamps along its upper left.
        vec2 qd = q / max(r, 1e-4);
        float hi = exp(-pow((r - 0.992) / 0.0045, 2.0)) * (0.15 + 0.85 * smoothstep(0.1, 1.0, dot(qd, normalize(vec2(-0.45, 0.9)))));
        col += vec3(0.3, 0.5, 0.9) * hi * 0.22;
        // A broad faint sheen on the glass.
        col += vec3(0.004, 0.008, 0.016) * smoothstep(0.3, 0.0, abs(q.x + q.y * 0.6 + 0.35)) * inside;
        col += (hash(px) - 0.5) * 0.006;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  // ShaderPass clones its uniforms; point them back at the shared ones.
  for (const k in U) grade.uniforms[k] = U[k];
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  /* ---------- layout ---------- */
  // The window sits in the free part of the stage; the drum fills it.
  function frame(w, h, cover = 0) {
    const free = h - cover;
    const rad = Math.min(w * 0.47, free * 0.46);
    view.cx = w / 2; view.cy = free / 2; view.rad = rad;
    const tv = Math.tan((FOV / 2) * Math.PI / 180);
    view.D = T.zFront + T.R * (h / 2) / (tv * rad);
    camera.aspect = w / h;
    camera.position.set(0, 0, view.D);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(w, h, 0, cover / 2, w, h);
    camera.near = view.D - T.zFront - 1; camera.far = view.D + 12;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const d = view.dpr;
    U.uCenter.value.set(view.cx * d, (h - view.cy) * d);
    U.uRad.value = rad * d;
    U.uRes.value.set(w * d, h * d);
    U.uBackK.value = (view.D - T.zFront) / (view.D - T.zBack);
    U.uFog0.value = view.D - T.zFront;
    snowMat.uniforms.uPx.value = d * (h / 800) * (view.D / 28);
    tentMat.uniforms.uW.value = 1.0 * d * clamp(rad / 360, 0.6, 1.4);
  }

  function resize(w, h, dpr, { bloomScale = 0.5 } = {}) {
    view.w = w; view.h = h; view.dpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.setSize(Math.round(w * dpr * bloomScale), Math.round(h * dpr * bloomScale));
  }

  /* ---------- picking ---------- */
  // A stage point to the glass: window units and world x, y.
  function toGlass(px, py) {
    const qx = (px - view.cx) / view.rad, qy = -(py - view.cy) / view.rad;
    return { qx, qy, r: Math.hypot(qx, qy), x: qx * T.R, y: qy * T.R };
  }
  const sp = new THREE.Vector3();
  // A world point to stage pixels.
  function toStage(x, y, z) {
    sp.set(x, y, z).project(camera);
    return [(sp.x + 1) / 2 * view.w, (1 - sp.y) / 2 * view.h];
  }

  /* ---------- sync ---------- */
  const M = new THREE.Matrix4();
  function update(tank, glow = 1) {
    if (!tents) build(tank);
    pack(tank, texData);
    tex.needsUpdate = true;
    tentMat.uniforms.uGlow.value = armMat.uniforms.uGlow.value = glow;
    tank.jellies.forEach((j, i) => {
      const b = bellShape(j.c), m = bells[i];
      const u = m.material.uniforms;
      u.uA.value = b.a; u.uRho.value = b.rho; u.uFlat.value = b.flat; u.uC.value = j.c; u.uGlow.value = glow;
      u.uWave.value = Math.sin((j.phase % 1) * Math.PI * 2) * Math.min(1, j.c * 2);
      const e1 = j.e1, a = j.ax, e2 = j.e2;
      M.set(e1[0], a[0], e2[0], j.p[0], e1[1], a[1], e2[1], j.p[1], e1[2], a[2], e2[2], j.p[2], 0, 0, 0, 1);
      m.matrix.copy(M);
      m.matrixWorld.copy(M);
    });
    // The newest four taps drive the ripple and the snow.
    for (let i = 0; i < 4; i++) {
      const tp = tank.taps[tank.taps.length - 1 - i], v = U.uTaps.value[i];
      if (tp) v.set(tp.x / T.R, tp.y / T.R, tank.t - tp.t0, tp.k); else v.set(0, 0, 0, 0);
    }
    U.uFlowT.value = tank.flowT;
  }
  function render(time, seed = 0) {
    U.uTime.value = time;
    grade.uniforms.uSeed.value = seed;
    // Snow reads tap positions in world units, the grade in window units.
    for (let i = 0; i < 4; i++) {
      const v = U.uTaps.value[i];
      snowTaps[i].set(v.x * T.R, v.y * T.R, v.z, v.w);
    }
    composer.render();
  }
  const snowTaps = [0, 1, 2, 3].map(() => new THREE.Vector4());
  snowMat.uniforms.uTaps = { value: snowTaps };

  async function warm(tank) { update(tank); await renderer.compileAsync(scene, camera); }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, camera, view, frame, resize, toGlass, toStage, update, render, warm, dispose };
}
