// Shared rocket: one model in three sizes, and its flame.
// Ascent flies it near; Ten seconds sees it far. Needs list: docs/plans/ascent-launch.md.
//
//   const rk = makeRocket({ size: 'medium', detail: 'near' });
//   scene.add(rk.root);
//
// Units are metres. +y runs up the body; the origin is the active stage's nozzle exit.
// rk.lower is the first stage, rk.upper the upper stage, rk.cores the side cores (Heavy).
// rk.halves are the fairing halves; each pivots on its outer base edge.
// rk.dims gives heights and radii for mounts and effects; see DIMS below.
// rk.setStage(n): 0 whole, 1 side cores gone, 2 first stage gone.
//
// Far detail: few triangles, three draw calls, paint by vertex colour, no textures.
// A toy may light it with its own GLSL: light = { head, fn, uniforms }.
// fn defines vec3 rocketLight(vec3 paint, vec3 N, vec3 P); N and P are in world space.
// Near detail uses three.js physical materials (rk.M) and casts shadows.
//
// makeFlame({ mode, uniforms }) gives Ten seconds' flame quad as is.
// mode 'tail' is the side view; 'disc' is the view down the jet (Ascent).
// Pass your own uniform objects to share them; the flame never sets them.
// flamePair(tail, disc, eye) fades the two by view angle.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// L: core length; W: core width. Heavy adds two side cores at 0.92 L.
export const SIZES = {
  small: { L: 32, W: 2.2, cores: false, flare: 1.0, engines: 3 },
  medium: { L: 55, W: 3.7, cores: false, flare: 1.3, engines: 5 },
  heavy: { L: 62, W: 3.7, cores: true, flare: 1.3, engines: 5 },
};

// Heights as a share of L, from the first stage's nozzle exit.
function dimsOf(s) {
  const { L, W } = s, r = W / 2;
  const bell = Math.max(1, 0.03 * L);
  return {
    L, W, r,
    ru: r * 0.85,
    rf: r * s.flare,
    bell,
    s1Top: 0.62 * L,
    interTop: 0.70 * L,
    upperTop: 0.84 * L,
    payload: 0.86 * L,
    fairTop: 1.12 * L,
    nozzle2: 0.64 * L,
    coreTop: 0.92 * L,
  };
}

const ring = (r, y0, y1, n) => Array.from({ length: n + 1 }, (_, i) => [r, y0 + (y1 - y0) * i / n]);
const latheOf = (pts, seg, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, p0, pl);
function bellGeo(r0, r1, len, seg) {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([r0 + (r1 - r0) * Math.sqrt(t), -len * t]); }
  return latheOf(pts, seg);
}
// The fairing profile: a flare off the upper tank, a barrel, an ogive.
function fairingPts(d) {
  const p = [[d.ru, d.upperTop], [d.rf, d.upperTop + 0.015 * d.L], ...ring(d.rf, d.upperTop + 0.015 * d.L, 0.98 * d.L, 6)];
  for (let i = 1; i <= 12; i++) { const t = i / 12; p.push([d.rf * Math.sqrt(1 - t * t) + 0.01 * d.r, 0.98 * d.L + (d.fairTop - 0.98 * d.L) * t]); }
  return p;
}

/* ---------- hull paint, near detail ---------- */
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

/* ---------- far detail: paint by height ---------- */
const PAINT = { light: [0.75, 0.75, 0.72], dark: [0.08, 0.08, 0.09], metal: [0.35, 0.3, 0.26] };
// Paints a geometry one colour, with soot near its base.
function paint(geo, rgb, sootTop = 0) {
  const pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = sootTop > 0 ? Math.min(1, Math.max(0, pos.getY(i) / sootTop)) : 1;
    const k = 0.35 + 0.65 * s;
    col[i * 3] = rgb[0] * k; col[i * 3 + 1] = rgb[1] * k; col[i * 3 + 2] = rgb[2] * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const flat = g => (g.index ? g.toNonIndexed() : g);

export function makeRocket({ size = 'medium', detail = 'near', light = null, layers = [] } = {}) {
  const S = SIZES[size] ?? SIZES.medium, d = dimsOf(S);
  const near = detail === 'near', seg = near ? 64 : 12;
  const root = new THREE.Group(), body = new THREE.Group();
  const lower = new THREE.Group(), upper = new THREE.Group();
  root.add(body);
  body.add(lower, upper);
  const meshes = [];
  const enable = m => { layers.forEach(l => m.layers.enable(l)); meshes.push(m); return m; };

  /* the geometry, part by part, as [geometry, kind] */
  const lowerParts = [], upperParts = [], coreParts = [];
  lowerParts.push([latheOf([[d.r * 0.86, d.bell], [d.r, d.bell + 0.012 * d.L], ...ring(d.r, d.bell + 0.012 * d.L, d.s1Top, near ? 24 : 2)], seg), 'lower']);
  lowerParts.push([latheOf([[d.r * 1.005, d.s1Top], [d.r * 1.005, d.interTop - 0.01 * d.L], [d.ru, d.interTop]], seg), 'black']);
  lowerParts.push([new THREE.CircleGeometry(d.r * 0.86, seg).rotateX(Math.PI / 2).translate(0, d.bell, 0), 'black']);
  // Engines: one in the centre, the rest in a ring.
  const eb = S.engines === 3 ? 0.3 : 0.17;
  for (let i = 0; i < S.engines; i++) {
    const g = bellGeo(d.r * eb * 0.55, d.r * eb, d.bell, near ? 32 : 8).translate(0, d.bell, 0);
    if (i > 0 || S.engines === 3) {
      const n = S.engines === 3 ? 3 : S.engines - 1, a = (i - (S.engines === 3 ? 0 : 1)) / n * Math.PI * 2 + Math.PI / 4;
      g.translate(Math.cos(a) * d.r * 0.56, 0, Math.sin(a) * d.r * 0.56);
    }
    lowerParts.push([g, 'metal']);
  }
  if (near) {
    // Four small fins at the base.
    const fw = d.r * 0.8, fh = d.L * 0.08;
    for (let i = 0; i < 4; i++) {
      const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(fw, fh * 0.07), new THREE.Vector2(fw, fh * 0.45), new THREE.Vector2(0, fh)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.065 * d.r, bevelEnabled: false }).translate(d.r * 0.97, d.bell + 0.01 * d.L, -0.032 * d.r);
      g.rotateY(i * Math.PI / 2 + Math.PI / 4);
      lowerParts.push([g, 'fin']);
    }
  }
  upperParts.push([latheOf(ring(d.ru, d.interTop, d.upperTop, near ? 12 : 1), seg), 'lower']);
  upperParts.push([new THREE.CircleGeometry(d.ru, seg).rotateX(Math.PI / 2).translate(0, d.interTop, 0), 'black']);
  // The vacuum bell hangs inside the interstage until staging.
  upperParts.push([bellGeo(d.ru * 0.27, d.ru * 0.78, d.interTop - d.nozzle2, near ? 32 : 8).translate(0, d.interTop, 0), 'vac']);
  upperParts.push([new THREE.CylinderGeometry(d.ru * 0.8, d.ru, d.payload - d.upperTop, seg).translate(0, (d.payload + d.upperTop) / 2, 0), 'black']);
  if (S.cores) {
    // Side cores touch the core; each ends in its own nose.
    for (const sx of [-1, 1]) {
      const pts = [[d.r * 0.86, d.bell], [d.r, d.bell + 0.012 * d.L], ...ring(d.r, d.bell + 0.012 * d.L, 0.8 * d.L, near ? 20 : 2)];
      for (let i = 1; i <= 8; i++) { const t = i / 8; pts.push([d.r * Math.sqrt(1 - t * t) + 0.01, 0.8 * d.L + (d.coreTop - 0.8 * d.L) * t]); }
      coreParts.push([latheOf(pts, seg).translate(sx * d.W, 0, 0), 'lower', sx]);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        coreParts.push([bellGeo(d.r * 0.17, d.r * 0.3, d.bell, near ? 24 : 8).translate(sx * d.W + Math.cos(a) * d.r * 0.5, d.bell, Math.sin(a) * d.r * 0.5), 'metal', sx]);
      }
    }
  }

  /* materials */
  let M = null;
  const halves = [], cores = [];
  if (near) {
    const TEX = { lower: hullTexture('lower'), upper: hullTexture('upper') };
    M = {
      lower: new THREE.MeshPhysicalMaterial({ map: TEX.lower, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
      upper: new THREE.MeshPhysicalMaterial({ map: TEX.upper, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide }),
      black: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.62, metalness: 0.15, side: THREE.DoubleSide }),
      metal: new THREE.MeshStandardMaterial({ color: 0x8a7462, roughness: 0.32, metalness: 0.95, side: THREE.DoubleSide }),
      fin: new THREE.MeshStandardMaterial({ color: 0x34363c, roughness: 0.5, metalness: 0.5 }),
      // The vacuum bell glows dull red after a burn: set emissiveIntensity.
      vac: new THREE.MeshStandardMaterial({ color: 0x8a7462, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide, emissive: 0xff3a10, emissiveIntensity: 0 }),
    };
    const add = (geo, kind, parent) => {
      const m = enable(new THREE.Mesh(geo, M[kind]));
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    lowerParts.forEach(([g, k]) => add(g, k, lower));
    upperParts.forEach(([g, k]) => add(g, k, upper));
    for (const sx of [-1, 1]) {
      if (!S.cores) break;
      const c = new THREE.Group();
      coreParts.filter(p => p[2] === sx).forEach(([g, k]) => add(g, k, c));
      lower.add(c); cores.push(c);
    }
    for (const k of [0, 1]) {
      const pivot = new THREE.Group(), hx = k === 0 ? d.rf : -d.rf;
      pivot.position.set(hx, d.upperTop, 0);
      add(latheOf(fairingPts(d), 32, k === 0 ? 0 : Math.PI, Math.PI).translate(-hx, -d.upperTop, 0), 'upper', pivot);
      upper.add(pivot);
      halves.push(pivot);
    }
  } else {
    // Far detail: merge each body into one painted mesh.
    const tone = { lower: PAINT.light, upper: PAINT.light, black: PAINT.dark, metal: PAINT.metal, fin: PAINT.dark, vac: PAINT.metal };
    const merged = parts => mergeGeometries(parts.map(([g, k]) => paint(flat(g), tone[k], k === 'lower' ? 0.08 * d.L : 0)));
    let mat;
    if (light) {
      mat = new THREE.ShaderMaterial({
        uniforms: light.uniforms ?? {}, vertexColors: true,
        vertexShader: /* glsl */`varying vec3 vN, vP, vC;
          void main() { vC = color; vN = normalize(mat3(modelMatrix) * normal); vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`,
        fragmentShader: `varying vec3 vN, vP, vC;\n${light.head ?? ''}\n${light.fn}\nvoid main() { gl_FragColor = vec4(rocketLight(vC, normalize(vN), vP), 1.0); }`,
      });
    } else mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1 });
    lower.add(enable(new THREE.Mesh(merged(lowerParts), mat)));
    upper.add(enable(new THREE.Mesh(merged([...upperParts, [latheOf(fairingPts(d), seg), 'upper']]), mat)));
    if (S.cores) {
      const c = new THREE.Group();
      c.add(enable(new THREE.Mesh(merged(coreParts), mat)));
      lower.add(c); cores.push(c);
    }
  }

  function setStage(n, { hide = true } = {}) {
    cores.forEach(c => { c.visible = !(hide && n >= 1); });
    lower.visible = !(hide && n >= 2);
    // Past staging, the upper stage's nozzle sits at the origin.
    body.position.y = n >= 2 ? -d.nozzle2 : 0;
  }

  return { root, body, lower, upper, cores, halves, dims: d, size: S, M, meshes, setStage, enableLayer: l => meshes.forEach(m => m.layers.enable(l)) };
}

/* ---------- flame: Ten seconds' quad, plus a view down the jet ---------- */
const K2_NOISE = /* glsl */`
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}`;
export const FLAME_C = new THREE.Color(1.0, 0.55, 0.22);

export function makeFlame({ mode = 'tail', uniforms = {} } = {}) {
  const U = {
    uMode: { value: mode === 'disc' ? 1 : 0 }, uFade: { value: 1 }, uLen: { value: 6 },
    uFlame: { value: new THREE.Vector4() }, uFlameC: { value: FLAME_C.clone() }, uAxis: { value: new THREE.Vector3(0, -1, 0) },
    uSize: { value: 9 }, uFlick: { value: 1 }, uSpread: { value: 0 }, uTime: { value: 0 },
    ...uniforms,
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
        // Down the jet: a round glow just past the nozzle, facing the eye.
        vec3 c0 = uFlame.xyz + uAxis * uSize * 1.2;
        vec3 Vc = normalize(cameraPosition - c0);
        vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0) + uAxis * 0.01, Vc)), up = cross(Vc, rt);
        float rad = uSize * (1.1 + 2.4 * uSpread);
        gl_Position = projectionMatrix * viewMatrix * vec4(c0 + (rt * position.x + up * position.y) * rad, 1.0);
        return;
      }
      vec3 V = normalize(cameraPosition - uFlame.xyz);
      // The tail points down the exhaust, turned to face the eye.
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
        // y below 0 is the nozzle; y above 0 runs down the tail.
        float y = max(vQ.y, 0.0);
        float x = vQ.x + (k2noise(vec2(y * 5.0 - t * 9.0, 1.7)) - 0.5) * 0.3 * y;
        float wide = mix(1.0, 3.0, uSpread);
        float core = exp(-(x * x * 40.0 * wide * wide + vQ.y * vQ.y * (vQ.y < 0.0 ? 80.0 : 22.0)));
        float breath = 1.0 + 0.18 * (k2noise(vec2(t * 11.0, 3.1)) - 0.5);
        float spread = 0.05 + y * (0.18 + 0.5 * uSpread);
        float tail = exp(-x * x * wide * wide / (spread * spread * 4.0 + 1e-3) * 0.2) * exp(-y * mix(2.4, 1.3, uSpread) / breath) * step(-0.15, vQ.y);
        // Eddies run down the tail and break it into tongues.
        float eddy = k2noise(vec2(x * 7.0, y * 16.0 - t * 34.0)) * 0.6 + k2noise(vec2(x * 15.0, y * 31.0 - t * 52.0)) * 0.4;
        tail *= mix(1.0, 0.45 + 1.1 * eddy, smoothstep(0.05, 0.3, y));
        // Shock diamonds: bright knots in the jet, low in thick air only.
        float jw = 0.16 + 0.06 * y;
        float n = (y - 0.03) / 0.5 * 4.0, i = floor(n), u = fract(n) * 2.0 - 1.0;
        float rhomb = 1.0 - abs(u) - abs(x) / (jw * (1.0 - 0.1 * i));
        float knots = smoothstep(0.0, 0.45, rhomb) * exp(-i * 0.4) * step(0.0, n) * step(n, 4.0);
        knots *= (1.0 - uSpread) * (0.8 + 0.4 * k2noise(vec2(t * 23.0, i)));
        float jet = exp(-x * x / (jw * jw)) * exp(-y * 4.0) * mix(1.0, 0.5 + 0.5 * abs(u), (1.0 - uSpread) * step(0.0, n) * step(n, 4.0));
        vec3 hot = mix(vec3(1.0, 0.92, 0.75), uFlameC, smoothstep(0.0, 0.35, y));
        hot = mix(hot, uFlameC * vec3(1.0, 0.5, 0.35), smoothstep(0.35, 0.9, y));
        // Every edge of the quad fades to black, so no square outline shows.
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

const fv = new THREE.Vector3(), fe = new THREE.Vector3();
// Fades a tail and its disc by the eye's place along the jet.
// The disc shows only to an eye well upstream, looking down the jet.
export function flamePair(tail, disc, eye) {
  const T = tail.userData.U, D = disc.userData.U;
  for (const k of ['uFlame', 'uFlameC', 'uAxis']) D[k].value.copy(T[k].value);
  for (const k of ['uSize', 'uSpread', 'uTime']) D[k].value = T[k].value;
  const v = fv.copy(eye).sub(fe.set(T.uFlame.value.x, T.uFlame.value.y, T.uFlame.value.z));
  const up = -v.dot(T.uAxis.value), e = Math.max(0, up) / (v.length() || 1);
  const k = THREE.MathUtils.smoothstep(e, 0.7, 0.9) * THREE.MathUtils.smoothstep(up, 6, 12);
  T.uFade.value = 1 - k;
  D.uFade.value = k;
  disc.visible = tail.visible;
}
