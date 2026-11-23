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
const SNOW = 500;

// The look of each kind, by SPECIES.kind: margin lobes, tentacles, arms.
// tents: count, length share [min, span], width in pixels, colour.
const LOOK = [
  // Moon jelly: a fine short fringe, eight notches, pale blue.
  { lobes: 8, lobeD: 0.04, lobeP: 24, tents: [128, 0.28, 0.4, 1.0, [0.38, 0.6, 0.85]], arm: [0.2, [0.37, 0.54, 0.75]] },
  // Sea nettle: 32 lappets, 24 long rust tentacles, long cream arms.
  { lobes: 32, lobeD: 0.05, lobeP: 6, tents: [24, 0.75, 0.25, 2.2, [0.85, 0.26, 0.08]], arm: [0.15, [0.75, 0.55, 0.32]] },
  // Purple-striped jelly: 8 dark tentacles, long pink frilled arms.
  { lobes: 32, lobeD: 0.04, lobeP: 6, tents: [8, 0.8, 0.2, 1.7, [0.5, 0.24, 0.6]], arm: [0.26, [0.7, 0.34, 0.78]] },
  // Egg-yolk jelly: 16 lobes, bunches of fine pale tentacles.
  { lobes: 16, lobeD: 0.06, lobeP: 4, tents: [96, 0.45, 0.55, 1.0, [0.62, 0.58, 0.4]], arm: [0.22, [0.85, 0.62, 0.25]] },
];
// The starfield's colours: soft, like stars of mixed heat.
const PAL = [[0.6, 0.85, 1.0], [1.0, 0.6, 0.82], [0.78, 0.62, 1.0], [1.0, 0.8, 0.5], [0.6, 1.0, 0.86], [0.92, 0.95, 1.0]];

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
        vec3 deep = vec3(0.0002, 0.0012, 0.007);
        vec3 lit = vec3(0.004, 0.028, 0.15);
        vec3 col = mix(deep, lit, pow(ly, 2.3));
        col += vec3(0.003, 0.022, 0.1) * exp(-dot(q - vec2(0.0, 0.62), q - vec2(0.0, 0.62)) * 2.2);
        // Light shafts fan down from the lamps over the drum.
        vec2 s = q - vec2(0.0, 1.9);
        float ang = atan(s.x, -s.y);
        float sh = vn(vec2(ang * 13.0 + uTime * 0.04, uTime * 0.025)) * vn(vec2(ang * 29.0 - uTime * 0.03, 3.1 + uTime * 0.02));
        col += vec3(0.005, 0.032, 0.13) * sh * sh * 1.6 * smoothstep(-0.7, 0.9, q.y) * (1.0 - smoothstep(0.85, 1.0, r));
        // The drum wall between the back rim and the glass: curved, darker.
        float wall = smoothstep(uBackK - 0.02, uBackK + 0.05, r);
        float wl = clamp((r - uBackK) / (1.0 - uBackK), 0.0, 1.0);
        vec3 side = col * (0.42 + 0.25 * wl);
        // The wall catches lamp light in soft vertical streaks.
        float ap = atan(q.x, q.y);
        side += vec3(0.002, 0.014, 0.06) * vn(vec2(ap * 9.0, wl * 2.0)) * pow(ly, 2.5);
        col = mix(col, side, wall);
        // A faint bright seam where the back meets the wall.
        col += vec3(0.004, 0.02, 0.08) * exp(-pow((r - uBackK) / 0.005, 2.0)) * pow(ly, 1.8);
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
    uniform float uA, uRho, uFlat, uSize, uC, uWave, uLobes, uLobeD, uLobeP;
    varying vec3 vN, vV, vW;
    varying vec2 vUV;
    vec3 shape(float u, float ang) {
      // The margin closes first: a wave runs out along the bell.
      float th = u * uA + uWave * sin(u * 3.14159) * 0.06;
      float r = uRho * sin(th);
      // Notches or lappets cut the margin; each kind has its own count.
      r *= 1.0 - uLobeD * smoothstep(0.86, 1.0, u) * pow(abs(cos(ang * uLobes * 0.5)), uLobeP);
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
    uniform float uFog0, uC, uGlow, uKind;
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
      float lamp = lampAt(vW);
      float far = exp(-max(0.0, length(vV) - uFog0) * 0.2);
      float speck = vn(q * 38.0) * 0.25 + 0.75;
      float marg = smoothstep(0.9, 1.0, u);
      // Sixteen radial bands, centred on the canals.
      float k = fract(ang / 6.28318 * 16.0 + 0.5) - 0.5;
      if (uKind > 0.5) {
        vec3 col;
        if (uKind < 1.5) {
          // Sea nettle: amber jelly, thick at the top, rust bands and lappets.
          vec3 amber = vec3(1.0, 0.46, 0.12);
          float band = exp(-pow(k / 0.13, 2.0)) * smoothstep(0.12, 0.5, u);
          col = amber * (0.1 + 0.75 * rim) * speck * (1.0 - 0.4 * band);
          col += amber * 0.2 * exp(-u * u / 0.09) * (0.4 + 0.6 * f);
          col += vec3(0.7, 0.16, 0.04) * (0.12 * band * f + 0.35 * marg);
          col += vec3(1.0, 0.7, 0.4) * 0.12 * vn(q * 9.0) * smoothstep(0.7, 0.2, u) * f;
        } else if (uKind < 2.5) {
          // Purple-striped jelly: pale jelly, sixteen purple stripes from a ring.
          vec3 pale = vec3(0.8, 0.74, 1.0);
          float stripe = exp(-pow(k / (0.04 + 0.12 * u), 2.0)) * smoothstep(0.08, 0.3, u);
          float ring = exp(-pow((u - 0.14) / 0.05, 2.0));
          col = pale * (0.05 + 0.6 * rim) * speck;
          col += vec3(0.6, 0.16, 0.95) * (stripe * (0.3 + 0.35 * f) + ring * 0.4 * f + marg * 0.35);
        } else {
          // Egg-yolk jelly: clear white jelly round a yellow centre.
          vec3 pale = vec3(0.82, 0.84, 0.95);
          float yolk = smoothstep(0.5, 0.28, u + 0.05 * vn(q * 6.0));
          col = pale * (0.04 + 0.62 * rim) * speck;
          col += vec3(1.0, 0.62, 0.1) * yolk * (0.3 + 0.4 * f) * (0.8 + 0.2 * vn(q * 20.0));
          col += pale * (0.05 * exp(-pow(k / 0.08, 2.0)) * smoothstep(0.5, 0.7, u) + 0.25 * marg);
        }
        gl_FragColor = vec4(col * lamp * far * uGlow, 1.0);
        return;
      }
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
      float canal = exp(-pow(k * 6.28318 / 16.0 * u / 0.008, 2.0)) * smoothstep(0.42, 0.62, u);
      float ringc = exp(-pow((u - 0.93) / 0.012, 2.0));
      // The sense organs: eight bright dots in the notches.
      float rho = exp(-pow((u - 0.985) / 0.012, 2.0)) * pow(abs(cos(ang * 4.0)), 60.0);
      marg = smoothstep(0.95, 1.0, u);
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
  const SEG = 22;
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
      attribute vec4 aT, aK;
      uniform vec2 uRes;
      uniform float uW, uTime, uFog0;
      varying float vA, vSide;
      varying vec3 vCol;
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
        float want = uW * aK.w * mix(1.0, 0.4, s);
        vCol = aK.rgb;
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
      varying vec3 vCol;
      void main() {
        float a = vA * (1.0 - vSide * vSide * 0.6) * uGlow;
        gl_FragColor = vec4(vCol * a, 1.0);
      }`,
  }));
  const armMat = keep(new THREE.ShaderMaterial({
    uniforms: { ...U, uTex: { value: null }, uGlow: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec2 aS;
      attribute vec4 aT, aK;
      uniform float uTime, uFog0;
      varying float vA, vS;
      varying vec2 vQ;
      varying vec3 vCol;
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
        vCol = aK.rgb;
      }`,
    fragmentShader: /* glsl */`
      uniform float uGlow;
      varying float vA, vS;
      varying vec2 vQ;
      varying vec3 vCol;
      ${NOISE}
      void main() {
        // Ruffled edges: the cut wanders, and folded edges glow brighter.
        float edge = 0.72 + 0.28 * sin(vQ.y * 2.3) * vn(vec2(vQ.y * 0.7, 1.0));
        float x = abs(vQ.x);
        if (x > edge) discard;
        float fold = smoothstep(edge - 0.25, edge, x);
        float mid = exp(-x * x / 0.02) * 0.6;
        float a = vA * (0.18 + 0.8 * fold + mid) * (0.75 + 0.25 * vn(vQ * vec2(6.0, 1.5)));
        gl_FragColor = vec4(vCol * a * uGlow, 1.0);
      }`,
  }));
  /* ---------- the starfield ---------- */
  // Small jellies as quads turned to the screen, the bell drawn per pixel.
  // aA: position and size. aB: axis and contraction. aC: colour and seed.
  const smallMat = keep(new THREE.ShaderMaterial({
    uniforms: { ...U, uGlow: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec2 aQ;
      attribute vec4 aA, aB, aC;
      uniform vec2 uRes;
      uniform float uFog0;
      varying vec2 vL;
      varying float vFs, vC, vA, vSeed, vRp;
      varying vec3 vCol;
      ${LIGHT}
      void main() {
        mat4 vp = projectionMatrix * viewMatrix;
        vec4 c0 = vp * vec4(aA.xyz, 1.0);
        vec4 c1 = vp * vec4(aA.xyz + aB.xyz * aA.w, 1.0);
        vec2 h = 0.5 * uRes;
        vec2 s0 = c0.xy / c0.w * h, s1 = c1.xy / c1.w * h;
        float rpx = aA.w * projectionMatrix[0][0] * h.x / c0.w;
        // Below a pixel and a half the bell fades rather than shrinks.
        float rp = max(rpx, 1.5);
        vec2 up = s1 - s0;
        float ul = length(up);
        vFs = clamp(ul / max(rpx, 1e-3), 0.0, 1.0);
        vec2 dir = ul > 1e-3 ? up / ul : vec2(0.0, 1.0);
        vec2 side = vec2(dir.y, -dir.x);
        vL = vec2(aQ.x * 1.4, mix(-3.4, 1.4, aQ.y * 0.5 + 0.5));
        vec2 p = s0 + (side * vL.x + dir * vL.y) * rp;
        gl_Position = vec4(p / h * c0.w, c0.z, c0.w);
        float far = exp(-max(0.0, c0.w - uFog0) * 0.2);
        vA = far * lampAt(aA.xyz) * min(1.0, rpx / 1.5);
        vC = aB.w; vCol = aC.rgb; vSeed = aC.w; vRp = rp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uGlow, uTime;
      varying vec2 vL;
      varying float vFs, vC, vA, vSeed, vRp;
      varying vec3 vCol;
      void main() {
        // Side on, the bell is a dome; from above, a disc.
        float w = 1.0 - 0.22 * vC, hgt = 0.8 - 0.2 * vC;
        float hv = mix(w, hgt, vFs), hb = mix(w, 0.07, vFs);
        vec2 L = vL;
        float e = length(vec2(L.x / w, L.y / (L.y > 0.0 ? hv : hb)));
        float bell = smoothstep(1.12, 0.9, e);
        float glow = bell * (0.1 + 0.9 * pow(min(e, 1.0), 5.0)) + exp(-pow((e - 1.0) / 0.16, 2.0)) * 0.35;
        glow += exp(-dot(L, L) / 0.06) * 0.3 * (1.0 - vFs);
        // Four tentacles trail below a side-on bell, each a pixel wide.
        // Lines in pixels keep a small bell from a haze of fine stripes.
        float tent = 0.0, tl = 3.0 * vFs, ty = -L.y;
        if (ty > 0.0 && tl > 0.05) {
          float x = L.x / w + 0.07 * ty * sin(ty * 2.6 + uTime * 1.7 + vSeed * 40.0);
          float dpx = abs(fract(x / 0.4) - 0.5) * 0.4 * w * vRp;
          float line = exp(-dpx * dpx / 0.3) * step(abs(x), 0.8);
          tent = line * (1.0 - smoothstep(0.0, tl, ty)) * 0.5;
        }
        // The closing bell flares: the twinkle of the field.
        float a = (glow * (0.6 + 0.9 * vC) + tent) * vA * uGlow;
        gl_FragColor = vec4(vCol * a, 1.0);
      }`,
  }));
  let smallGeo = null, sA = null, sB = null;
  function buildSmall(tank) {
    const s = tank.small, n = s.n;
    smallGeo = keep(new THREE.InstancedBufferGeometry());
    smallGeo.setAttribute('aQ', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
    smallGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    smallGeo.setIndex([0, 1, 2, 0, 2, 3]);
    sA = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    sB = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    sA.setUsage(THREE.DynamicDrawUsage); sB.setUsage(THREE.DynamicDrawUsage);
    const c = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const p = PAL[Math.floor(s.seed[i] * 997) % PAL.length], v = 0.6 + 0.4 * ((s.seed[i] * 7919) % 1);
      c[i * 4] = p[0] * v; c[i * 4 + 1] = p[1] * v; c[i * 4 + 2] = p[2] * v; c[i * 4 + 3] = s.seed[i];
    }
    smallGeo.setAttribute('aA', sA);
    smallGeo.setAttribute('aB', sB);
    smallGeo.setAttribute('aC', new THREE.InstancedBufferAttribute(c, 4));
    smallGeo.instanceCount = n;
    const m = new THREE.Mesh(smallGeo, smallMat);
    m.frustumCulled = false;
    m.renderOrder = -1;
    scene.add(m);
  }
  function syncSmall(tank) {
    const s = tank.small, a = sA.array, b = sB.array;
    for (let i = 0; i < s.n; i++) {
      const o = i * 3, q = i * 4;
      a[q] = s.P[o]; a[q + 1] = s.P[o + 1]; a[q + 2] = s.P[o + 2]; a[q + 3] = s.size[i];
      b[q] = s.A[o]; b[q + 1] = s.A[o + 1]; b[q + 2] = s.A[o + 2]; b[q + 3] = s.c[i];
    }
    sA.needsUpdate = sB.needsUpdate = true;
  }

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
    // aK holds the colour and the width.
    const t = [], tk = [];
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    tank.jellies.forEach((jl, j) => {
      const [n, l0, l1, w, col] = LOOK[jl.kind].tents;
      // Egg-yolk tentacles hang in sixteen bunches; the rest spread evenly.
      const bunch = jl.kind === 3;
      for (let k = 0; k < n; k++) {
        const g = bunch ? (Math.floor(k / (n / 16)) + 0.5 + (rnd() - 0.5) * 0.35) : (k + rnd() * 0.6) / n * T.G;
        const v = 0.75 + 0.25 * rnd();
        t.push(j * CHAINS, g % T.G, l0 + l1 * (jl.kind === 0 ? rnd() * rnd() : rnd()), rnd());
        tk.push(col[0] * v, col[1] * v, col[2] * v, w);
      }
    });
    tentGeo.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(t), 4));
    tentGeo.setAttribute('aK', new THREE.InstancedBufferAttribute(new Float32Array(tk), 4));
    tentGeo.instanceCount = t.length / 4;
    const a = [], ak = [];
    tank.jellies.forEach((jl, j) => {
      const [w, col] = LOOK[jl.kind].arm;
      for (let k = 0; k < T.A; k++) {
        a.push(j * CHAINS + T.G + k, 0, w * jl.size, rnd());
        ak.push(...col, 1);
      }
    });
    armGeo.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(a), 4));
    armGeo.setAttribute('aK', new THREE.InstancedBufferAttribute(new Float32Array(ak), 4));
    armGeo.instanceCount = a.length / 4;
    tents = new THREE.Mesh(tentGeo, tentMat);
    arms = new THREE.Mesh(armGeo, armMat);
    tents.frustumCulled = arms.frustumCulled = false;
    scene.add(arms, tents);
    for (const j of tank.jellies) {
      const L = LOOK[j.kind];
      const m = keep(new THREE.ShaderMaterial({
        uniforms: {
          ...U, uA: { value: 1 }, uRho: { value: 1 }, uFlat: { value: 0.6 }, uSize: { value: j.size }, uC: { value: 0 }, uWave: { value: 0 }, uGlow: { value: 1 },
          uKind: { value: j.kind }, uLobes: { value: L.lobes }, uLobeD: { value: L.lobeD }, uLobeP: { value: L.lobeP },
        },
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
        vec3 wall = vec3(0.0028, 0.0032, 0.0048) + vec3(0.002, 0.009, 0.04) * exp(-(r - 1.0) * 4.5) * (0.5 + 0.5 * ly);
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
    if (!tents) { build(tank); buildSmall(tank); }
    pack(tank, texData);
    tex.needsUpdate = true;
    syncSmall(tank);
    tentMat.uniforms.uGlow.value = armMat.uniforms.uGlow.value = smallMat.uniforms.uGlow.value = glow;
    tank.jellies.forEach((j, i) => {
      const b = bellShape(j.c), m = bells[i];
      const u = m.material.uniforms;
      u.uA.value = b.a; u.uRho.value = b.rho; u.uFlat.value = b.flat * j.S.dome; u.uC.value = j.c; u.uGlow.value = glow;
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
