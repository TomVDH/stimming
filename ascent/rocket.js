// Ascent rocket: two stages, a fairing in halves, flames, trail, vapour and ice.
// Metres along y from the first stage's engine plane; radius 1.85 m.
// The group lives in a camera-centred world; the page places it each frame.
import * as THREE from 'three';
import { EV } from './flight.js';
import { makeProbe } from './probe.js';

const K2_NOISE = /* glsl */`
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}`;

/* ---------- hull paint ---------- */
function hullTexture(kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 512, 1024);
  g.strokeStyle = 'rgba(40,40,50,0.22)'; g.lineWidth = 2;
  for (let y = 0; y < 1024; y += kind === 'upper' ? 128 : 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let x = 0; x < 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  g.fillStyle = '#16161c';
  if (kind === 'upper') {
    // The roll pattern: black and white quarters around the fairing base.
    for (let i = 0; i < 4; i += 2) g.fillRect(i * 128, 40, 128, 220);
    for (let i = 1; i < 4; i += 2) g.fillRect(i * 128, 260, 128, 220);
  } else {
    g.fillRect(100, 0, 14, 1024);
    g.fillRect(0, 900, 512, 18); g.fillRect(0, 940, 512, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const lathe = (pts, seg = 64, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, p0, pl);
const ring = (r, y0, y1, n = 24) => Array.from({ length: n + 1 }, (_, i) => [r, y0 + (y1 - y0) * i / n]);
function bell(r0, r1, len) {
  const pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([r0 + (r1 - r0) * Math.sqrt(t), -len * t]); }
  return lathe(pts, 32);
}

/* ---------- flame: a tail seen from the side, a disc seen end-on ---------- */
const FLAME_C = new THREE.Color(1.0, 0.55, 0.22);
function makeFlame(mode) {
  const U = {
    uMode: { value: mode }, uFade: { value: 1 },
    uFlame: { value: new THREE.Vector4() }, uFlameC: { value: FLAME_C.clone() }, uAxis: { value: new THREE.Vector3(0, -1, 0) },
    uSize: { value: 9 }, uFlick: { value: 1 }, uSpread: { value: 0 }, uTime: { value: 0 }, uLen: { value: 6 },
  };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`
    uniform vec4 uFlame; uniform vec3 uAxis; uniform float uSize, uSpread, uLen, uMode;
    varying vec2 vQ;
    void main() {
      vQ = position.xy;
      if (uMode > 0.5) {
        // End-on: a round glow just past the nozzle, facing the eye.
        vec3 c0 = uFlame.xyz + uAxis * uSize * 1.2;
        vec3 Vc = normalize(cameraPosition - c0);
        vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0) + uAxis * 0.01, Vc)), up = cross(Vc, rt);
        float rad = uSize * (1.1 + 2.4 * uSpread);
        gl_Position = projectionMatrix * viewMatrix * vec4(c0 + (rt * position.x + up * position.y) * rad, 1.0);
        return;
      }
      vec3 V = normalize(cameraPosition - uFlame.xyz);
      vec3 ax = normalize(uAxis - dot(uAxis, V) * V + vec3(0.0, 1e-4, 0.0));
      vec3 sd = normalize(cross(ax, V));
      float along = position.y < 0.0 ? 0.5 : uLen;
      vec3 P = uFlame.xyz + sd * position.x * uSize * (0.7 + 2.2 * uSpread) + ax * position.y * uSize * along;
      gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
    }`,
    fragmentShader: /* glsl */`
    uniform vec4 uFlame; uniform vec3 uFlameC; uniform float uFlick, uSpread, uTime, uMode, uFade;
    varying vec2 vQ;
    ${K2_NOISE}
    void main() {
      float t = uTime;
      vec3 c;
      if (uMode > 0.5) {
        // A white core, a Mach ring in thick air, a ragged glow.
        float r = length(vQ), a = atan(vQ.y, vQ.x);
        float nz = k2noise(vec2(a * 4.0 + 7.0, r * 6.0 - t * 20.0)) * 0.6 + k2noise(vec2(a * 9.0, r * 14.0 - t * 35.0)) * 0.4;
        float ring = exp(-pow((r - 0.16) / 0.04, 2.0)) * (1.0 - uSpread) * 4.0;
        float glow = exp(-r * mix(6.0, 3.0, uSpread)) * (0.4 + 1.0 * nz);
        vec3 hotc = mix(vec3(1.0, 0.9, 0.7), uFlameC, smoothstep(0.05, 0.5, r));
        c = vec3(1.0, 0.96, 0.9) * exp(-r * r * 90.0) * 14.0 + hotc * glow * 1.6 + vec3(1.0, 0.92, 0.8) * ring;
        c *= smoothstep(1.0, 0.65, r);
      } else {
        float y = max(vQ.y, 0.0);
        float x = vQ.x + (k2noise(vec2(y * 5.0 - t * 9.0, 1.7)) - 0.5) * 0.3 * y;
        float wide = mix(1.0, 3.0, uSpread);
        float core = exp(-(x * x * 40.0 * wide * wide + vQ.y * vQ.y * (vQ.y < 0.0 ? 80.0 : 22.0)));
        float breath = 1.0 + 0.18 * (k2noise(vec2(t * 11.0, 3.1)) - 0.5);
        float spread = 0.05 + y * (0.18 + 0.5 * uSpread);
        float tail = exp(-x * x * wide * wide / (spread * spread * 4.0 + 1e-3) * 0.2) * exp(-y * mix(2.4, 1.3, uSpread) / breath) * step(-0.15, vQ.y);
        float eddy = k2noise(vec2(x * 7.0, y * 16.0 - t * 34.0)) * 0.6 + k2noise(vec2(x * 15.0, y * 31.0 - t * 52.0)) * 0.4;
        tail *= mix(1.0, 0.45 + 1.1 * eddy, smoothstep(0.05, 0.3, y));
        float jw = 0.16 + 0.06 * y;
        float n = (y - 0.03) / 0.5 * 4.0, i = floor(n), u = fract(n) * 2.0 - 1.0;
        float rhomb = 1.0 - abs(u) - abs(x) / (jw * (1.0 - 0.1 * i));
        float knots = smoothstep(0.0, 0.45, rhomb) * exp(-i * 0.4) * step(0.0, n) * step(n, 4.0);
        knots *= (1.0 - uSpread) * (0.8 + 0.4 * k2noise(vec2(t * 23.0, i)));
        float jet = exp(-x * x / (jw * jw)) * exp(-y * 4.0) * mix(1.0, 0.5 + 0.5 * abs(u), (1.0 - uSpread) * step(0.0, n) * step(n, 4.0));
        vec3 hot = mix(vec3(1.0, 0.92, 0.75), uFlameC, smoothstep(0.0, 0.35, y));
        hot = mix(hot, uFlameC * vec3(1.0, 0.5, 0.35), smoothstep(0.35, 0.9, y));
        float win = smoothstep(1.0, 0.55, abs(vQ.x)) * smoothstep(1.0, 0.6, vQ.y) * smoothstep(-1.0, -0.7, vQ.y);
        c = (vec3(1.0, 0.96, 0.9) * core * 12.0 + hot * tail * 0.7 * uFlick + vec3(1.0, 0.6, 0.3) * jet * 0.5 + vec3(1.0, 0.95, 0.85) * knots * 14.0) * win;
      }
      gl_FragColor = vec4(c * uFade * min(uFlame.w, 1.5), 0.0);
    }`,
  }));
  m.frustumCulled = false;
  m.renderOrder = 7;
  m.userData.U = U;
  return m;
}

export function makeRocket(scene) {
  const TEX = { lower: hullTexture('lower'), upper: hullTexture('upper') };
  const M = {
    lower: new THREE.MeshPhysicalMaterial({ map: TEX.lower, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    upper: new THREE.MeshPhysicalMaterial({ map: TEX.upper, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide }),
    black: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.62, metalness: 0.15, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8a7462, roughness: 0.32, metalness: 0.95, side: THREE.DoubleSide }),
    fin: new THREE.MeshStandardMaterial({ color: 0x34363c, roughness: 0.5, metalness: 0.5 }),
    // The vacuum bell glows dull red after a burn.
    vac: new THREE.MeshStandardMaterial({ color: 0x8a7462, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide, emissive: 0xff3a10, emissiveIntensity: 0 }),
  };
  const add = (geo, mat, parent) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const rocket = new THREE.Group();
  const lower = new THREE.Group(), upper = new THREE.Group();
  rocket.add(lower, upper);
  scene.add(rocket);

  // The first stage: tank, skirt, interstage, five engines, four fins.
  add(lathe([[1.6, 0.0], [1.85, 0.6], ...ring(1.85, 0.6, 37)]), M.lower, lower);
  add(lathe(ring(1.86, 37, 41, 4)), M.black, lower);
  add(new THREE.CircleGeometry(1.6, 32).rotateX(Math.PI / 2), M.black, lower);
  for (let i = 0; i < 5; i++) {
    const b = add(bell(0.32, 0.55, 1.6), M.metal, lower);
    if (i < 4) b.position.set(Math.cos(i * Math.PI / 2 + Math.PI / 4) * 1.05, 0, Math.sin(i * Math.PI / 2 + Math.PI / 4) * 1.05);
  }
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.5, 0.3), new THREE.Vector2(1.5, 2.1), new THREE.Vector2(0, 4.6)]);
    const g = new THREE.ExtrudeGeometry(f, { depth: 0.12, bevelEnabled: false }).translate(1.8, 0.6, -0.06);
    add(g, M.fin, lower).rotation.y = i * Math.PI / 2 + Math.PI / 4;
  }
  // The upper stage, its vacuum bell and the fairing halves.
  add(lathe(ring(1.85, 41, 50, 12)), M.lower, upper);
  add(new THREE.CircleGeometry(1.85, 32).rotateX(Math.PI / 2).translate(0, 41, 0), M.black, upper);
  const vac = add(bell(0.5, 1.45, 3.4), M.vac, upper);
  vac.position.y = 40.8;
  // The probe rides under the fairing; after it parts, it owns the frame.
  const probe = makeProbe();
  probe.group.position.y = 51.3;
  rocket.add(probe.group);
  add(new THREE.CylinderGeometry(1.5, 1.85, 1.2, 24).translate(0, 50.6, 0), M.black, upper);
  const fp = [[1.85, 49.6], [2.45, 50.6], ...ring(2.45, 50.6, 60, 8)];
  for (let i = 1; i <= 14; i++) { const t = i / 14; fp.push([2.45 * Math.sqrt(1 - t * t) + 0.02, 60 + 8 * t]); }
  const halves = [0, 1].map(k => {
    const pivot = new THREE.Group();
    // Each half hinges at its outer base edge.
    const hx = k === 0 ? 2.45 : -2.45;
    pivot.position.set(hx, 50.6, 0);
    const geo = lathe(fp, 32, k === 0 ? 0 : Math.PI, Math.PI).translate(-hx, -50.6, 0);
    add(geo, M.upper, pivot);
    upper.add(pivot);
    return pivot;
  });

  /* ---------- flames ---------- */
  const tail1 = makeFlame(0), disc1 = makeFlame(1), tail2 = makeFlame(0), disc2 = makeFlame(1);
  scene.add(tail1, disc1, tail2, disc2);
  const engineLight = new THREE.PointLight(0xffaa66, 0, 160, 1.6);
  scene.add(engineLight);

  /* ---------- vapour on the hull at max-q ---------- */
  const AIR = { uTime: { value: 0 }, uLightC: { value: new THREE.Color(1, 1, 1) }, uAmb: { value: new THREE.Color(0.2, 0.25, 0.35) }, uSunW: { value: new THREE.Vector3(0, 1, 0) }, uAmt: { value: 0 } };
  const vapour = new THREE.Group();
  for (const [r, y0, y1] of [[1.97, 8, 32.5], [2.12, 16, 32.8]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, y1 - y0, 48, 1, true).translate(0, (y0 + y1) / 2, 0), new THREE.ShaderMaterial({
      uniforms: AIR, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      vertexShader: /* glsl */`varying vec3 vL, vN, vW; varying vec2 vUv;
        void main() { vL = position; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
      uniform float uTime, uAmt; uniform vec3 uLightC, uAmb, uSunW;
      varying vec3 vL, vN, vW; varying vec2 vUv;
      ${K2_NOISE}
      void main() {
        float face = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
        // Streaks race down the hull.
        float ang = atan(vL.z, vL.x);
        float s = k2noise(vec2(ang * 9.0, vL.y * 0.35 + uTime * 9.0)) * 0.65 + k2noise(vec2(ang * 23.0, vL.y * 0.9 + uTime * 17.0)) * 0.35;
        float a = smoothstep(0.45, 0.85, s) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y) * pow(face, 0.6) * 0.32 * uAmt;
        vec3 c = mix(uAmb, uLightC, 0.55 + 0.45 * dot(normalize(vN), uSunW));
        gl_FragColor = vec4(c, a);
      }`,
    }));
    m.renderOrder = 5;
    vapour.add(m);
  }
  lower.add(vapour);

  /* ---------- trail: soft puffs down the axis ---------- */
  const PUFFS = 80;
  const TR = { uBase: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3() }, uSunW: AIR.uSunW, uLightC: AIR.uLightC, uAmb: AIR.uAmb, uTime: AIR.uTime, uAmt: { value: 0 }, uGrow: { value: 1 } };
  const trailGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(2, 2));
  {
    const a = new Float32Array(PUFFS * 3);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < PUFFS; i++) { const d = 14 * Math.pow(300, i / (PUFFS - 1)); a.set([d, 2.2 + d * 0.05, rnd()], i * 3); }
    trailGeo.setAttribute('iPuff', new THREE.InstancedBufferAttribute(a, 3));
    trailGeo.instanceCount = PUFFS;
  }
  const trail = new THREE.Mesh(trailGeo, new THREE.ShaderMaterial({
    uniforms: TR, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: /* glsl */`attribute vec3 iPuff; uniform vec3 uBase, uAxis; uniform float uGrow; varying vec2 vQ; varying float vS, vD;
      void main() {
        vec3 c = uBase + uAxis * iPuff.x;
        vec3 rt = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vQ = position.xy; vS = iPuff.z; vD = iPuff.x;
        float size = 2.2 + iPuff.x * 0.05 * uGrow;
        gl_Position = projectionMatrix * viewMatrix * vec4(c + (rt * position.x + up * position.y) * size, 1.0);
      }`,
    fragmentShader: /* glsl */`uniform vec3 uSunW, uLightC, uAmb; uniform float uTime, uAmt; varying vec2 vQ; varying float vS, vD;
      ${K2_NOISE}
      void main() {
        float r = length(vQ);
        float n = k2noise(vQ * 3.0 + vS * 40.0 + vec2(0.0, uTime * 0.3)) * 0.6 + k2noise(vQ * 7.0 + vS * 17.0) * 0.4;
        float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.5) * 0.08 * uAmt;
        float lit = 0.5 + 0.5 * dot(normalize(vec3(vQ, 0.4)), normalize(vec3(0.0, 0.0, 1.0) + uSunW * 0.6));
        vec3 c = mix(uAmb, uLightC, lit) + vec3(1.0, 0.5, 0.2) * 3.0 * exp(-vD / 22.0);
        gl_FragColor = vec4(c, a);
      }`,
  }));
  trail.frustumCulled = false;
  trail.renderOrder = 4;
  scene.add(trail);

  /* ---------- ice flakes at staging ---------- */
  const FLAKES = 260;
  const flakeGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(FLAKES * 3), v = new Float32Array(FLAKES * 4);
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < FLAKES; i++) {
      const a = rnd() * Math.PI * 2, r = 1.9 + rnd() * 0.4;
      p.set([Math.cos(a) * r, 40.5 + rnd() * 1.5, Math.sin(a) * r], i * 3);
      v.set([Math.cos(a) * (0.3 + rnd()), -1.5 - rnd() * 4, Math.sin(a) * (0.3 + rnd()), rnd()], i * 4);
    }
    flakeGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    flakeGeo.setAttribute('vel', new THREE.BufferAttribute(v, 4));
  }
  const FL = { uT: { value: 0 }, uScale: { value: 400 }, uLit: { value: 1 } };
  const flakes = new THREE.Points(flakeGeo, new THREE.ShaderMaterial({
    uniforms: FL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: /* glsl */`attribute vec4 vel; uniform float uT, uScale; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position + vel.xyz * uT, 1.0);
        vA = 0.5 + 0.5 * sin(uT * (6.0 + vel.w * 9.0) + vel.w * 40.0);
        gl_PointSize = clamp(uScale * (0.02 + 0.025 * vel.w) / -mv.z, 1.0, 10.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`uniform float uLit; varying float vA;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float d = length(q);
        float a = exp(-d * d * 6.0) + 0.6 * exp(-abs(q.x) * 18.0) * exp(-abs(q.y) * 2.0) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * a * (0.4 + 1.6 * vA) * uLit, 1.0);
      }`,
  }));
  flakes.frustumCulled = false;
  upper.add(flakes);

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
  // Copies a flame's numbers to its end-on twin; each fades by view angle.
  function pair(tail, disc, camPos) {
    const T = tail.userData.U, D = disc.userData.U;
    for (const k of ['uFlame', 'uFlameC', 'uAxis']) D[k].value.copy(T[k].value);
    for (const k of ['uSize', 'uSpread', 'uTime']) D[k].value = T[k].value;
    // The disc shows only to an eye well upstream, looking down the jet.
    const v = tmp2.copy(camPos).sub(tmp3.set(T.uFlame.value.x, T.uFlame.value.y, T.uFlame.value.z));
    const up = -v.dot(T.uAxis.value), e = Math.max(0, up) / (v.length() || 1);
    const k = THREE.MathUtils.smoothstep(e, 0.7, 0.9) * THREE.MathUtils.smoothstep(up, 6, 12);
    T.uFade.value = 1 - k;
    D.uFade.value = k;
    disc.visible = tail.visible;
  }

  // Places the stages, fairing and probe for time t.
  function pose(t) {
    // Staging: the spent stage falls back, drifts and turns.
    const ds = t - EV.sep;
    lower.visible = ds < 45;
    if (ds > 0) {
      const back = 1.2 * ds + 0.5 * 2.2 * ds * ds;
      lower.position.set(0.25 * ds, -back, 0.12 * ds);
      lower.rotation.set(0.006 * ds * ds, 0, 0.015 * ds);
    } else { lower.position.set(0, 0, 0); lower.rotation.set(0, 0, 0); }
    // The fairing halves swing out on their hinges, then fall away.
    const df = t - EV.fairing;
    halves.forEach((h, k) => {
      const s = k === 0 ? -1 : 1;
      if (df <= 0) { h.position.set(s * -2.45, 50.6, 0); h.rotation.set(0, 0, 0); h.visible = true; return; }
      h.visible = df < 40;
      h.rotation.set(0, 0, s * Math.min(df * 0.9, 1.4) + s * df * 0.05);
      h.position.set(-s * (2.45 + df * 1.6), 50.6 - 0.5 * 3.0 * df * df, 0.1 * df);
    });
    // The probe pushes off; the spent stage backs away and turns aside.
    const dp = t - EV.probeSep;
    if (dp > 0) {
      upper.position.set(0.04 * dp, -(0.35 * dp + 0.5 * 0.3 * dp * dp), -0.03 * dp);
      upper.rotation.set(Math.min(0.0015 * dp * dp, 0.9), 0, Math.min(0.0008 * dp * dp, 0.5));
      upper.visible = dp < 140;
    } else { upper.position.set(0, 0, 0); upper.rotation.set(0, 0, 0); upper.visible = true; }
    probe.deploy((t - EV.deploy) / (EV.deployEnd - EV.deploy));
    // Out in the dark the probe turns slowly on its long axis.
    const dc = Math.max(0, t - EV.deployEnd);
    probe.group.rotation.set(0, 0.035 * dc, 0);
  }

  // Poses the effects for flight state f at time t.
  // light: sunlight colour at the rocket; camPos: the eye in this world.
  function update(f, t, light, sunW, camPos, gain = 1) {
    const axis = tmp.set(0, -1, 0).applyQuaternion(rocket.quaternion);
    rocket.updateMatrixWorld(true);
    // First stage flame: wider and softer as the air thins.
    const p1 = tmp2.set(0, -0.6, 0).applyMatrix4(lower.matrixWorld);
    const F1 = tail1.userData.U;
    tail1.visible = f.thrust1 > 0;
    F1.uFlame.value.set(p1.x, p1.y, p1.z, f.thrust1 * gain);
    F1.uAxis.value.copy(axis);
    F1.uSpread.value = THREE.MathUtils.smoothstep(f.h, 4, 55);
    F1.uSize.value = 8 + 10 * F1.uSpread.value;
    F1.uLen.value = 7;
    F1.uTime.value = t;
    pair(tail1, disc1, camPos);
    // Upper stage flame: a faint, wide vacuum plume.
    const p2 = new THREE.Vector3(0, 37.3, 0).applyMatrix4(upper.matrixWorld);
    const F2 = tail2.userData.U;
    tail2.visible = f.thrust2 > 0;
    F2.uFlame.value.set(p2.x, p2.y, p2.z, f.thrust2 * 0.07 * gain);
    F2.uAxis.value.copy(axis);
    F2.uSize.value = 1.3; F2.uSpread.value = 0.25; F2.uLen.value = 4;
    F2.uFlameC.value.setRGB(0.55, 0.62, 1.0).lerp(FLAME_C, 0.35);
    F2.uTime.value = t;
    pair(tail2, disc2, camPos);
    // The bell glows after each burn and cools over half a minute.
    const since = f.thrust2 > 0 ? 0 : Math.min(t > EV.tliEnd ? t - EV.tliEnd : t > EV.seco ? t - EV.seco : 99, 99);
    M.vac.emissiveIntensity = f.thrust2 > 0 ? 2.5 : t > EV.ign2 ? 2.5 * Math.exp(-since / 12) : 0;
    // The engine light follows whichever engine burns.
    if (f.thrust1 > 0) { engineLight.position.copy(p1); engineLight.intensity = 900 * f.thrust1 * gain; }
    else if (f.thrust2 > 0) { engineLight.position.copy(p2); engineLight.intensity = 260 * f.thrust2 * gain; }
    else engineLight.intensity = 0;
    // Air effects: vapour at max-q, a trail while the first stage burns.
    AIR.uTime.value = t;
    AIR.uSunW.value.copy(sunW);
    AIR.uLightC.value.setRGB(light[0], light[1], light[2]).multiplyScalar(1.3);
    // Unlit trail takes the dim blue of the dawn sky.
    AIR.uAmb.value.setRGB(0.05, 0.07, 0.12).multiplyScalar(0.3 + 0.7 * Math.min(1, f.rho * 3));
    AIR.uAmt.value = f.q > 0.25 ? (f.q - 0.25) / 0.75 : 0;
    vapour.visible = AIR.uAmt.value > 0;
    trail.visible = f.thrust1 > 0;
    TR.uBase.value.copy(p1);
    TR.uAxis.value.copy(axis);
    TR.uAmt.value = f.thrust1 * Math.min(1, 0.3 + f.rho * 3);
    // Thin air lets the plume balloon: puffs grow with height.
    TR.uGrow.value = 1 + Math.max(0, f.h - 20) / 6;
    const ds = t - EV.sep;
    flakes.visible = ds > 0 && ds < 14;
    FL.uT.value = Math.max(ds, 0);
    FL.uLit.value = 0.35 * Math.min(1, (light[0] + light[1] + light[2]) / 1.5);
  }

  return { rocket, lower, upper, probe: probe.group, pose, update, M, engineLight };
}
