// Pass: a lone viaduct spans a deep gorge under a wall of moonlit peaks.

import * as THREE from 'three';

// Seeded random keeps the shapes the same on every load.
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function build() {
const rand = mulberry(11);


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, 1, 10, 20000);

// Moon light comes from the upper left, a little toward the camera.
const LIGHT = new THREE.Vector3(-0.62, 0.5, 0.6).normalize();
// The train sits left of centre and heads right.
const TRAIN_X0 = -70, TRAIN_X1 = -12, DECK_TOP = 1.3;

/* ---------- K2: haze ---------- */
// Distance haze, plus a low band that hides the mountain feet.
const K2_HAZE = {
  uHazeC: { value: new THREE.Color(0.02, 0.028, 0.062) },
  uHazeLow: { value: new THREE.Color(0.042, 0.056, 0.11) },
  uHazeD: { value: 0.0001 },
  uHazeH: { value: 150 },
};
const K2_HAZE_GLSL = /* glsl */`
uniform vec3 uHazeC, uHazeLow;
uniform float uHazeD, uHazeH;
vec3 k2Haze(vec3 col, vec3 wp, vec3 cam) {
  float d = length(wp - cam);
  float far = 1.0 - exp(-d * uHazeD);
  float low = exp(-max(wp.y, 0.0) / uHazeH) * smoothstep(800.0, 2600.0, d);
  float m = clamp(far * 0.85 + low * 0.9, 0.0, 1.0);
  return mix(col, mix(uHazeC, uHazeLow, low), m);
}`;
/* ---------- end K2 ---------- */

// Flat planes lit by the moon: brighter toward each crest, snow light on the edge.
function litMaterial(o) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      ...K2_HAZE,
      uL: { value: LIGHT },
      uShadow: { value: new THREE.Color(...o.shadow) },
      uLit: { value: new THREE.Color(...o.lit) },
      uSnow: { value: new THREE.Color(...(o.snow || [0, 0, 0])) },
      uFoot: { value: o.foot ?? -400 },
      uHazeK: { value: o.hazeK ?? 1 },
    },
    vertexShader: /* glsl */`
      attribute float aTop;
      varying vec3 vW; varying float vTop;
      void main() { vTop = aTop; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${K2_HAZE_GLSL}
      uniform vec3 uL, uShadow, uLit, uSnow;
      uniform float uFoot, uHazeK;
      varying vec3 vW; varying float vTop;
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (dot(n, cameraPosition - vW) < 0.0) n = -n;
        float diff = max(dot(n, uL), 0.0);
        // Each face brightens toward its crest.
        float up = smoothstep(uFoot, vTop, vW.y);
        vec3 col = uShadow + uLit * diff * mix(0.35, 1.15, up);
        // Snow is only light on the crest and on faces that look up.
        float crest = smoothstep(vTop - 70.0, vTop, vW.y);
        col += uSnow * (crest * 0.8 + smoothstep(0.45, 0.85, n.y) * 0.5) * (0.25 + diff);
        gl_FragColor = vec4(mix(col, k2Haze(col, vW, cameraPosition), uHazeK), 1.0);
      }`,
  });
}

// Geometry from a list of triangles, each vertex tagged with its crest height.
function tris(list) {
  const pos = [], top = [];
  for (const [a, b, c, t] of list) { pos.push(...a, ...b, ...c); top.push(t, t, t); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
  return g;
}

// A wedge: one long ramp up to a crest corner, then a steep cliff back down.
// dir 1 rises to the right; dir -1 mirrors it. Both planes lean back from the foot.
function wedge(x0, z, ramp, cliff, yLow, yCrest, yNext, dir, foot) {
  const dz = 560, X = x => x0 + dir * x;
  const L = [X(0), yLow, z], C = [X(ramp), yCrest, z], N = [X(ramp + cliff), yNext, z];
  const fL = [X(-60), foot, z + dz], fC = [X(ramp + 40), foot, z + dz], fN = [X(ramp + cliff + 120), foot, z + dz];
  const t = yCrest;
  return [[L, C, fC, t], [L, fC, fL, t], [C, N, fN, t], [C, fN, fC, t]];
}

/* Mountain wall: a sawtooth row of lit ramps and dark cliffs, a hazier row behind. */
const FOOT = -420;
const near = [], back = [];
function row(list, x0, x1, z, crest, dirs) {
  // Lay wedges left to right; each next ramp starts at the previous cliff foot.
  let x = x0, i = 0, yLow = crest * 0.66;
  while (x < x1) {
    const dir = dirs[i % dirs.length], ramp = 420 * (0.6 + rand() * 0.8), cliff = 45 + rand() * 40;
    const yC = crest * (0.9 + rand() * 0.2), yN = crest * (0.6 + rand() * 0.12);
    // Each wedge sits a little behind the last, so its ramp starts behind the cliff.
    const zz = z - i * 40;
    if (dir > 0) list.push(...wedge(x, zz, ramp, cliff, yLow, yC, yN, 1, FOOT));
    else list.push(...wedge(x + ramp + cliff, zz, ramp, cliff, yN, yC, yLow, -1, FOOT));
    x += ramp + cliff - 30; yLow = yN; i++;
  }
}
row(near, -1500, 1500, -2600, 310, [1, 1, 1, -1, 1, 1, 1, -1]);
row(back, -1900, 1900, -3500, 430, [1, 1, -1, 1, 1]);
scene.add(new THREE.Mesh(tris(near), litMaterial({ shadow: [0.004, 0.006, 0.016], lit: [0.1, 0.115, 0.21], snow: [0.05, 0.06, 0.09], foot: FOOT })));
scene.add(new THREE.Mesh(tris(back), litMaterial({ shadow: [0.012, 0.016, 0.034], lit: [0.045, 0.054, 0.1], snow: [0.03, 0.035, 0.055], foot: FOOT })));

/* Gorge flanks: near-black cross-sections, extruded away from camera. */
const FRONT = 40;
function flank(pts, side) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  // A thin slab: only the silhouette shows, so no inner wall catches the mist.
  const g = new THREE.ExtrudeGeometry(shape, { depth: 30, bevelEnabled: false });
  g.translate(0, 0, FRONT - 30);
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(300), 1));
  const m = new THREE.Mesh(g, litMaterial({ shadow: [0.0022, 0.0028, 0.0055], lit: [0.004, 0.005, 0.009], foot: -900, hazeK: 0.06 }));
  scene.add(m);
  // A faint moonlit rim along the crest line, fading outward and down.
  const ridge = pts.filter(p => p[1] >= 0 && Math.abs(p[0]) < 2900);
  ridge.sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]));
  const pos = [], col = [];
  for (let i = 0; i < ridge.length - 1; i++) {
    const [ax, ay] = ridge[i], [bx, by] = ridge[i + 1];
    const ka = 1 - i / ridge.length, kb = 1 - (i + 1) / ridge.length, rim = side < 0 ? 0.11 : 0.07;
    const q = [[ax, ay + 0.6], [bx, by + 0.6], [bx, by - 7], [ax, ay - 7]];
    const c = [rim * ka, rim * kb, 0, 0];
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k][0], q[k][1], FRONT + 0.6); col.push(c[k] * 0.55, c[k] * 0.68, c[k]); }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
}
flank([[-200, 3], [-165, -95], [-48, -300], [-10, -540], [-10, -1400], [-3000, -1400], [-3000, 330], [-1250, 230], [-640, 118], [-380, 48]], -1);
flank([[200, 3], [372, 62], [720, 150], [1300, 262], [3000, 330], [3000, -1400], [10, -1400], [10, -540], [52, -300], [170, -95]], 1);

/* Viaduct: one long, almost straight deck on slender piers. */
const stone = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.006, 0.007, 0.012) });
const deck = new THREE.Mesh(new THREE.BoxGeometry(440, 2.6, 5), stone);
scene.add(deck);
// A thin moonlit line on the deck top edge.
const edge = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.1, 0.17) }));
edge.position.set(0, DECK_TOP - 0.25, 2.55); scene.add(edge);
const wallY = x => { // Inner wall height at |x|, from the flank outline.
  const p = [[200, 3], [170, -95], [52, -300], [10, -540]], ax = Math.abs(x);
  for (let i = 0; i < p.length - 1; i++) if (ax <= p[i][0] && ax >= p[i + 1][0]) return p[i][1] + (p[i + 1][1] - p[i][1]) * (p[i][0] - ax) / (p[i][0] - p[i + 1][0]);
  return -540;
};
for (const x of [-150, -90, -30, 30, 90, 150]) {
  const foot = wallY(x) - 40, len = -1.3 - foot;
  const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, len, 2.4), stone);
  p.position.set(x, -1.3 - len / 2, 0); scene.add(p);
}

// Train: dark cars, one warm window line, a headlight and a soft cone.
const body = new THREE.MeshBasicMaterial({ color: 0x040507 });
const win = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.48, 0.1) });
for (let c = 0; c < 3; c++) {
  const x0 = TRAIN_X0 + c * 19.6, len = 18.6;
  const car = new THREE.Mesh(new THREE.BoxGeometry(len, 3.2, 3.4), body);
  car.position.set(x0 + len / 2, DECK_TOP + 1.7, 0); scene.add(car);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(len - 2.2, 0.9), win);
  strip.position.set(x0 + len / 2, DECK_TOP + 2.1, 1.75); scene.add(strip);
}
const HEAD = new THREE.Vector3(TRAIN_X1 + 0.4, DECK_TOP + 1.6, 1.2);
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(3.2, 3.0, 2.6), blending: THREE.AdditiveBlending, depthWrite: false }));
flare.position.copy(HEAD); flare.scale.set(11, 11, 1); scene.add(flare);
const CONE_LEN = 300;
const coneGeo = new THREE.ConeGeometry(15, CONE_LEN, 40, 1, true); coneGeo.translate(0, -CONE_LEN / 2, 0);
const cone = new THREE.Mesh(coneGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uLen: { value: CONE_LEN } },
  vertexShader: /* glsl */`
    varying float vT; varying vec3 vN, vV;
    uniform float uLen;
    void main() {
      vT = -position.y / uLen;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    varying float vT; varying vec3 vN, vV;
    void main() {
      float edge = pow(abs(dot(vN, vV)), 1.4);
      float a = pow(1.0 - vT, 2.0) * smoothstep(0.0, 0.04, vT) * edge * 0.62;
      gl_FragColor = vec4(vec3(1.0, 0.9, 0.76) * a, a);
    }`,
}));
// The beam lands as a faint glow on the right flank, by the deck end.
const spill = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(0.13, 0.12, 0.1), blending: THREE.AdditiveBlending, depthWrite: false }));
spill.position.set(206, 2, FRONT + 1); spill.scale.set(110, 60, 1); scene.add(spill);
cone.position.copy(HEAD);
cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, -0.035, 0.02).normalize());
scene.add(cone);

/* Gorge mist: a cool veil behind the piers and one in front of their feet. */
function mist(z, yTop, yFull, alpha, warm) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(700, 1500), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTop: { value: yTop }, uFull: { value: yFull }, uA: { value: alpha }, uWarm: { value: warm }, uTx: { value: (TRAIN_X0 + TRAIN_X1) / 2 } },
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTop, uFull, uA, uWarm, uTx;
      varying vec3 vW;
      void main() {
        float a = smoothstep(uTop, uFull, vW.y) * uA;
        vec3 col = vec3(0.034, 0.046, 0.094);
        // One faint warm band under the train.
        float band = exp(-pow((vW.y + 34.0) / 26.0, 2.0)) * exp(-pow((vW.x - uTx) / 150.0, 2.0)) * uWarm;
        col += vec3(1.0, 0.56, 0.26) * band * 0.08;
        gl_FragColor = vec4(col, max(a, band * 0.4));
      }`,
  }));
  m.position.set(0, -700, z); return m;
}
scene.add(mist(-120, 20, -260, 0.92, 1), mist(18, -50, -380, 0.7, 0));

/* ---------- K2: sky ---------- */
// Dome: gradient, horizon glow, stars, a small moon and two thin cloud bands.
const MOON = new THREE.Vector3(0, 0, -1);
const skyU = {
  uMoon: { value: MOON }, uZen: { value: new THREE.Color(0.0015, 0.0025, 0.009) }, uHor: { value: K2_HAZE.uHazeLow.value },
  uRes: { value: new THREE.Vector2(1, 1) }, uPxRad: { value: 1000 },
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: /* glsl */`
    varying vec3 vD;
    void main() { vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: /* glsl */`
    uniform vec3 uMoon, uZen, uHor; uniform vec2 uRes; uniform float uPxRad;
    varying vec3 vD;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    void main() {
      vec3 d = normalize(vD);
      vec2 sc = gl_FragCoord.xy / uRes;
      float h = max(d.y, 0.0);
      vec3 col = mix(uHor, uZen, pow(smoothstep(0.0, 0.3, h), 0.7));
      // Stars: one pixel and a half wide at any lens.
      vec3 cell = floor(d * 900.0); float s = hash(cell);
      float star = step(0.9975, s) * (0.4 + 0.6 * (s - 0.9975) / 0.0025);
      float r = length(d - normalize((cell + 0.5) / 900.0)) * uPxRad;
      col += vec3(0.75, 0.8, 1.0) * star * smoothstep(1.4, 0.3, r) * smoothstep(0.03, 0.2, h) * 0.9;
      // Moon: a small disc and a modest halo.
      float th2 = 2.0 * (1.0 - dot(d, uMoon));
      float pr = 4.5 / uPxRad;
      col += vec3(1.0, 0.98, 0.94) * 0.86 * smoothstep(pr * pr * 1.3, pr * pr * 0.7, th2);
      col += vec3(0.5, 0.58, 0.9) * (0.07 * exp(-th2 / (pr * pr * 6.0)) + 0.015 * exp(-th2 / (pr * pr * 90.0)));
      // Two long, thin, faint cloud bands.
      float b1 = exp(-pow((sc.y - 0.905) / 0.007, 2.0)) * smoothstep(0.42, 0.52, sc.x) * smoothstep(1.02, 0.9, sc.x);
      float b2 = exp(-pow((sc.y - 0.81) / 0.009, 2.0)) * smoothstep(0.0, 0.08, sc.x) * smoothstep(0.5, 0.4, sc.x);
      col += vec3(0.06, 0.075, 0.14) * (b1 * 0.35 + b2 * 0.5);
      gl_FragColor = vec4(col, 1.0);
    }`,
}));
scene.add(sky);
/* ---------- end K2 ---------- */

/* ---------- K2: precipitation ---------- */
// Snow: a very light placeholder of points around the viaduct.
const SNOW_N = 900, snowPos = new Float32Array(SNOW_N * 3);
for (let i = 0; i < SNOW_N; i++) { snowPos[i * 3] = (rand() - 0.5) * 500; snowPos[i * 3 + 1] = -200 + rand() * 360; snowPos[i * 3 + 2] = -100 + rand() * 130; }
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uAmount: { value: 0.12 }, uPx: { value: 1.5 } },
  vertexShader: /* glsl */`
    uniform float uPx;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uPx; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: /* glsl */`
    uniform float uAmount;
    void main() { float a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5)) * uAmount; gl_FragColor = vec4(vec3(0.6, 0.66, 0.85) * a, a); }`,
}));
scene.add(snow);
/* ---------- end K2 ---------- */

// Framing: square to the viaduct, from far back. Portrait backs off further.
function frame(w, h, dpr) {
  const aspect = w / h;
  skyU.uRes.value.set(w * dpr, h * dpr);
  camera.aspect = aspect;
  // The deck spans a set share of the width, at a set height on screen.
  const wide = aspect >= 1;
  const D = wide ? 1500 : 4200, span = wide ? 0.54 : 0.9, deckNdc = wide ? -0.17 : -0.12;
  const halfW = 220 / span, halfH = halfW / aspect;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH / D));
  camera.position.set(0, -deckNdc * halfH, FRONT + D);
  camera.lookAt(0, -deckNdc * halfH, 0);
  camera.updateProjectionMatrix();
  skyU.uPxRad.value = h * dpr / THREE.MathUtils.degToRad(camera.fov);
  snow.material.uniforms.uPx.value = 1.4 * dpr;
  // The moon sits at a set point on screen, upper left.
  const ndc = wide ? [-0.66, 0.86] : [-0.5, 0.8];
  MOON.copy(new THREE.Vector3(ndc[0], ndc[1], 0.5).unproject(camera).sub(camera.position).normalize());
}

  // Dispose frees every geometry, material and texture this scene made.
  function dispose() {
    scene.traverse(o => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { for (const v of Object.values(m.uniforms || {})) v.value?.isTexture && v.value.dispose(); m.map?.dispose(); m.dispose(); }
    });
  }

return { scene, camera, frame, dispose, post: { bloom: [0.55, 0.45, 0.9], tint: [0.004, 0.006, 0.014], vig: 0.45, vigIn: 0.45, grain: 0.03 } };
}
