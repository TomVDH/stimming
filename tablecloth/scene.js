// Tablecloth yank: the three.js scene. A set table under a pendant lamp at night.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TOP, TABLE, CLOTH } from './shapes.js';
import { DIMS, planOf, block, BLOCK_N, BY0, LEGS, LEG_R } from './sim.js';
import { makeTableware, liquidMats } from './ware.js';
import { createFire, FIRE_LIGHT } from './fire.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const LAMP = new THREE.Vector3(0.05, 2.05, 0.02);
const HAZE = new THREE.Color(0.011, 0.008, 0.007);

const NOISE = /* glsl */`
  float hh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vn(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hh(i), hh(i + vec3(1, 0, 0)), f.x), mix(hh(i + vec3(0, 1, 0)), hh(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hh(i + vec3(0, 0, 1)), hh(i + vec3(1, 0, 1)), f.x), mix(hh(i + vec3(0, 1, 1)), hh(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

export function createScene(canvas, { onLost } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  scene.background = HAZE.clone();
  scene.fog = new THREE.FogExp2(HAZE, 0.22);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
  const disposables = [];
  const keep = x => (disposables.push(x), x);

  /* ---------- environment ---------- */
  // A dark room with the lamp's hot disc above: the reflections in glass and steel.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const roomMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP;
      void main() {
        vec3 d = normalize(vP);
        // Warm dark walls, a darker floor, a soft glow round the lamp above.
        vec3 c = mix(vec3(0.02, 0.014, 0.011), vec3(0.05, 0.035, 0.026), smoothstep(-0.3, 0.4, d.y));
        c += vec3(1.0, 0.68, 0.38) * pow(max(d.y, 0.0), 6.0) * 0.6;
        c += vec3(1.0, 0.8, 0.58) * smoothstep(0.985, 0.995, d.y) * 14.0;
        // The lamp shade's white inside: a broad ring round the bulb.
        c += vec3(0.9, 0.78, 0.62) * smoothstep(0.9, 0.95, d.y) * (1.0 - smoothstep(0.975, 0.985, d.y)) * 0.15;
        // The window at the far end: a tall cool pane with bars.
        vec3 wd = normalize(vec3(-1.0, 0.12, 0.0));
        float wx = dot(d, normalize(cross(wd, vec3(0.0, 1.0, 0.0)))), wy = d.y - 0.12;
        float pane = step(abs(wx), 0.16) * step(abs(wy), 0.26) * step(0.0, dot(d, wd));
        float bars = step(0.012, abs(wx)) * step(0.012, abs(wy - 0.04));
        c += vec3(0.32, 0.42, 0.6) * pane * bars * 0.45;
        // A pale wall to one side lifts the steel's edges.
        c += vec3(0.03, 0.028, 0.025) * smoothstep(0.6, 0.95, dot(d, normalize(vec3(0.3, 0.1, 1.0))));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), roomMat));
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  disposables.push(envRT, roomMat);
  envScene.children[0].geometry.dispose();

  /* ---------- light ---------- */
  // The pendant lamp: a warm cone straight down onto the table.
  const lamp = new THREE.SpotLight(new THREE.Color(1.0, 0.86, 0.7), 4.2, 0, 0.72, 0.8, 2);
  lamp.position.copy(LAMP);
  lamp.target.position.set(0.05, 0, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.camera.near = 0.4; lamp.shadow.camera.far = 3.2;
  lamp.shadow.bias = -0.00012;
  lamp.shadow.normalBias = 0.006;
  lamp.shadow.radius = 3;
  scene.add(lamp, lamp.target);
  // The candle: small, warm, flickering, no shadow.
  const candle = new THREE.PointLight(new THREE.Color(1.0, 0.6, 0.28), 0.22, 0, 2);
  scene.add(candle);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.1, 0.09, 0.1), new THREE.Color(0.05, 0.035, 0.025), 0.12));

  /* ---------- floor ---------- */
  const floorMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.13, 0.085, 0.055), roughness: 0.5, envMapIntensity: 0.25 }));
  floorMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vF;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvF = vec3(position.x, 0.0, -position.y);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vF;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // Oak boards along x, 14 cm wide, butted at random lengths.
          float row = floor(vF.z / 0.14);
          float off = hh(vec3(row, 3.0, 1.0)) * 2.0;
          float col = floor((vF.x + off) / 1.6);
          float id = hh(vec3(row, col, 7.0));
          vec2 q = vec2(fract((vF.x + off) / 1.6) * 1.6, fract(vF.z / 0.14) * 0.14);
          float seam = 1.0 - smoothstep(0.0, 0.0025, min(q.y, 0.14 - q.y)) * smoothstep(0.0, 0.003, min(q.x, 1.6 - q.x));
          float grain = vn(vec3(vF.x * 3.0, vF.z * 90.0 + id * 40.0, id * 9.0)) * 0.6 + vn(vec3(vF.x * 0.7, vF.z * 30.0, id)) * 0.4;
          diffuseColor.rgb *= (0.75 + 0.45 * id) * (0.8 + 0.35 * grain);
          diffuseColor.rgb *= 1.0 - 0.55 * seam;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = 0.38 + 0.25 * vn(vF * vec3(2.0, 1.0, 40.0));`);
  };
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(30, 30)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------- the far wall ---------- */
  // A painted wall with a wainscot and a tall window on the night outside.
  const WALL_X = -2.3;
  const wallMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.055, 0.06, 0.052), roughness: 0.85, envMapIntensity: 0.3 }));
  wallMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWl;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWl = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWl;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float y = vWl.y, z = vWl.z;
          // Wainscot panels below a rail at 0.92 m; a skirting board at the floor.
          float below = step(y, 0.92);
          float pz = fract(z / 0.62), py = (y - 0.14) / 0.68;
          float frame = max(step(abs(pz - 0.5), 0.47) < 0.5 ? 1.0 : 0.0, (py < 0.04 || py > 0.96) ? 1.0 : 0.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.05, 0.035), below);
          diffuseColor.rgb *= 1.0 - 0.35 * below * frame * step(0.14, y);
          diffuseColor.rgb *= 1.0 - 0.5 * smoothstep(0.012, 0.0, abs(y - 0.92));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.025, 0.018), step(y, 0.12));
          diffuseColor.rgb *= 0.9 + 0.1 * vn(vWl * 6.0);
        }`);
  };
  const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(10, 3.2)), wallMat);
  wall.rotation.y = Math.PI / 2;
  wall.position.set(WALL_X, 1.6, 0);
  wall.receiveShadow = true;
  scene.add(wall);
  // The window: night sky, a low moon glow, glazing bars.
  const winMat = keep(new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
    vertexShader: `varying vec2 vU;
      #include <fog_pars_vertex>
      void main() { vU = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vU;
      #include <fog_pars_fragment>
      void main() {
        vec2 q = vU;
        vec3 sky = mix(vec3(0.02, 0.03, 0.06), vec3(0.06, 0.08, 0.14), q.y);
        sky += vec3(0.25, 0.3, 0.42) * exp(-length((q - vec2(0.7, 0.75)) * vec2(1.0, 0.6)) * 9.0) * 0.6;
        // Bars: two lights wide, four high, and a frame.
        vec2 g = abs(fract(q * vec2(2.0, 4.0)) - 0.5);
        float bar = step(0.47, max(g.x, g.y)) + step(0.97, max(abs(q.x - 0.5), abs(q.y - 0.5)) * 2.0);
        vec3 c = mix(sky, vec3(0.012, 0.01, 0.008), clamp(bar, 0.0, 1.0));
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
      }`,
  }));
  const win = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.0, 1.9)), winMat);
  win.rotation.y = Math.PI / 2;
  win.position.set(WALL_X + 0.003, 1.45, -0.55);
  scene.add(win);
  // Moonlight through the window: a faint cool key from the far end.
  const moon = new THREE.DirectionalLight(new THREE.Color(0.5, 0.6, 0.85), 0.05);
  moon.position.set(WALL_X, 1.9, -0.55);
  moon.target.position.set(0.6, 0.6, 0.3);
  scene.add(moon, moon.target);

  /* ---------- table ---------- */
  const walnut = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.2, 0.1, 0.055), roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.25, envMapIntensity: 0.7 }));
  walnut.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // Walnut: long rings along x, a darker figure, fine pores.
          float r = vn(vec3(vW.x * 1.5, vW.y * 30.0, vW.z * 26.0)) * 3.0 + vW.z * 14.0;
          float ring = smoothstep(0.35, 0.65, abs(fract(r) - 0.5) * 2.0);
          float fig = vn(vW * vec3(4.0, 8.0, 9.0));
          diffuseColor.rgb *= 0.78 + 0.3 * ring + 0.22 * fig;
          diffuseColor.rgb *= 0.92 + 0.08 * vn(vW * vec3(400.0, 400.0, 30.0));
        }`);
  };
  // The drawn top sits a hair inside the cloth's block, so its edge never shows through.
  const tableG = keep(new RoundedBoxGeometry(TABLE.hx * 2 - 0.006, TABLE.th - 0.004, TABLE.hz * 2 - 0.006, 4, TABLE.re - 0.003));
  const top = new THREE.Mesh(tableG, walnut);
  top.position.set(0, TOP - TABLE.th / 2 - 0.002, 0);
  top.castShadow = true; top.receiveShadow = true;
  scene.add(top);
  // The apron and four tapered legs.
  const apronG = keep(new THREE.BoxGeometry(1, 1, 1));
  for (const [sx, sz, w, d] of [[0, TABLE.hz - 0.06, TABLE.hx * 2 - 0.16, 0.024], [0, -TABLE.hz + 0.06, TABLE.hx * 2 - 0.16, 0.024], [TABLE.hx - 0.06, 0, 0.024, TABLE.hz * 2 - 0.16], [-TABLE.hx + 0.06, 0, 0.024, TABLE.hz * 2 - 0.16]]) {
    const m = new THREE.Mesh(apronG, walnut);
    m.position.set(sx, TOP - TABLE.th - 0.05, sz);
    m.scale.set(w, 0.1, d);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }
  // Turned legs: a square post under the apron, then a vase, a ring and a taper to a pad foot.
  const LEG = [[0, 0], [0.019, 0], [0.021, 0.008], [0.017, 0.018], [0.016, 0.06], [0.019, 0.2], [0.024, 0.36], [0.025, 0.42],
    [0.021, 0.45], [0.027, 0.47], [0.028, 0.485], [0.021, 0.5], [0.02, 0.53], [0.026, 0.555], [0.026, 0.565], [0, 0.565]];
  const legG = keep(new THREE.LatheGeometry(LEG.map(([r, y]) => new THREE.Vector2(r, y)), 28));
  const postH = TOP - TABLE.th - 0.56;
  const postG = keep(new RoundedBoxGeometry(0.046, postH, 0.046, 2, 0.004).translate(0, 0.56 + postH / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (const g of [legG, postG]) {
      const m = new THREE.Mesh(g, walnut);
      m.position.set(sx * (TABLE.hx - 0.07), 0, sz * (TABLE.hz - 0.07));
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
    }
  }
  // A bead runs under the apron.
  const beadG = keep(new THREE.CylinderGeometry(0.006, 0.006, 1, 10).rotateZ(Math.PI / 2));
  for (const [sx, sz, len, rot] of [[0, TABLE.hz - 0.06 + 0.012, TABLE.hx * 2 - 0.16, 0], [0, -TABLE.hz + 0.06 - 0.012, TABLE.hx * 2 - 0.16, 0], [TABLE.hx - 0.06 + 0.012, 0, TABLE.hz * 2 - 0.16, 1], [-TABLE.hx + 0.06 - 0.012, 0, TABLE.hz * 2 - 0.16, 1]]) {
    const m = new THREE.Mesh(beadG, walnut);
    m.position.set(sx, TOP - TABLE.th - 0.098, sz);
    m.scale.set(len, 1, 1);
    if (rot) m.rotation.y = Math.PI / 2;
    m.castShadow = true;
    scene.add(m);
  }

  /* ---------- cloth ---------- */
  // The drawn cloth is the sim grid upsampled three times by Catmull-Rom.
  // Its fine points are then pushed out of the table, so the edge stays covered.
  const { NX, NZ, NP } = DIMS;
  const UP = 3, FX = (NX - 1) * UP + 1, FZ = (NZ - 1) * UP + 1, FP = FX * FZ;
  const clothG = keep(new THREE.BufferGeometry());
  const cpos = new Float32Array(FP * 3), cuv = new Float32Array(FP * 2);
  for (let i = 0; i < FX; i++) for (let j = 0; j < FZ; j++) { const k = i * FZ + j; cuv[k * 2] = i / (FX - 1); cuv[k * 2 + 1] = j / (FZ - 1); }
  const cidx = new Uint32Array((FX - 1) * (FZ - 1) * 6);
  for (let i = 0, n = 0; i + 1 < FX; i++) for (let j = 0; j + 1 < FZ; j++) {
    const a = i * FZ + j, b = (i + 1) * FZ + j, c = (i + 1) * FZ + j + 1, d = i * FZ + j + 1;
    cidx[n++] = a; cidx[n++] = d; cidx[n++] = b; cidx[n++] = b; cidx[n++] = d; cidx[n++] = c;
  }
  clothG.setIndex(new THREE.BufferAttribute(cidx, 1));
  clothG.setAttribute('position', new THREE.BufferAttribute(cpos, 3).setUsage(THREE.DynamicDrawUsage));
  clothG.setAttribute('uv', new THREE.BufferAttribute(cuv, 2));
  // Burn per fine vertex: x spent fuel, y a live flame, z scorch from heat.
  const cburn = new Float32Array(FP * 3);
  clothG.setAttribute('aBurn', new THREE.BufferAttribute(cburn, 3).setUsage(THREE.DynamicDrawUsage));
  const pburn = new Float32Array(NP * 3);
  let burnDrawn = false;
  function burnAttr(cl) {
    for (let p = 0; p < NP; p++) {
      const lit = cl.heat[p] >= 1 && cl.fuel[p] > 0 && !cl.cut[p];
      pburn[p * 3] = cl.cut[p] ? 1.3 : 1 - cl.fuel[p];
      pburn[p * 3 + 1] = lit ? 1 : 0;
      pburn[p * 3 + 2] = Math.min(1, cl.heat[p]);
    }
    // Bilinear over each sim cell: holes and char edges follow the grid smoothly.
    for (let i = 0; i < FX; i++) {
      const fi = i / UP, i0 = Math.min(NX - 2, Math.floor(fi)), ti = fi - i0;
      for (let j = 0; j < FZ; j++) {
        const fj = j / UP, j0 = Math.min(NZ - 2, Math.floor(fj)), tj = fj - j0;
        const a = (i0 * NZ + j0) * 3, b = ((i0 + 1) * NZ + j0) * 3, c = ((i0 + 1) * NZ + j0 + 1) * 3, d = (i0 * NZ + j0 + 1) * 3;
        const o = (i * FZ + j) * 3;
        for (let k = 0; k < 3; k++) cburn[o + k] = (pburn[a + k] * (1 - ti) + pburn[b + k] * ti) * (1 - tj) + (pburn[d + k] * (1 - ti) + pburn[c + k] * ti) * tj;
      }
    }
    clothG.attributes.aBurn.needsUpdate = true;
  }
  // Catmull-Rom weights for the three steps inside a cell.
  const CRW = [0, 1, 2].map(s => {
    const t = s / UP, t2 = t * t, t3 = t2 * t;
    return [(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2];
  });
  const END = [0, 0, 1, 0];
  const mid = new Float32Array(NX * FZ * 3);
  function refine(P) {
    // Along z first, for every sim column.
    for (let i = 0; i < NX; i++) for (let j = 0; j < FZ; j++) {
      const c = Math.min(NZ - 2, Math.floor(j / UP)), s = j - c * UP, w = s === UP ? END : CRW[s];
      const o = (i * FZ + j) * 3;
      let x = 0, y = 0, z = 0;
      for (let q = 0; q < 4; q++) {
        const jj = Math.max(0, Math.min(NZ - 1, c - 1 + q)), k = (i * NZ + jj) * 3;
        x += P[k] * w[q]; y += P[k + 1] * w[q]; z += P[k + 2] * w[q];
      }
      mid[o] = x; mid[o + 1] = y; mid[o + 2] = z;
    }
    // Then along x.
    for (let i = 0; i < FX; i++) {
      const c = Math.min(NX - 2, Math.floor(i / UP)), s = i - c * UP, w = s === UP ? END : CRW[s];
      for (let j = 0; j < FZ; j++) {
        let x = 0, y = 0, z = 0;
        for (let q = 0; q < 4; q++) {
          const ii = Math.max(0, Math.min(NX - 1, c - 1 + q)), k = (ii * FZ + j) * 3;
          x += mid[k] * w[q]; y += mid[k + 1] * w[q]; z += mid[k + 2] * w[q];
        }
        // A point inside the table moves out to its skin.
        if (y < TOP + 0.02 && y > BY0 - 0.05 && Math.abs(x) < TABLE.hx + 0.03 && Math.abs(z) < TABLE.hz + 0.03) {
          const d = block(x, y, z) - 0.004;
          if (d < 0) { x -= BLOCK_N[0] * d; y -= BLOCK_N[1] * d; z -= BLOCK_N[2] * d; }
        }
        if (y < BY0) for (const [lx, lz] of LEGS) {
          const ex = x - lx, ez = z - lz, R = LEG_R + 0.002, e = Math.hypot(ex, ez);
          if (e < R) { x = lx + ex / (e || 1e-9) * R; z = lz + ez / (e || 1e-9) * R; }
        }
        if (y < 0.003) y = 0.003;
        const o = (i * FZ + j) * 3;
        cpos[o] = x; cpos[o + 1] = y; cpos[o + 2] = z;
      }
    }
  }
  const clothMat = keep(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.91, 0.91, 0.92), roughness: 0.72, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(1, 0.99, 0.97),
    side: THREE.DoubleSide, envMapIntensity: 0.5,
  }));
  const fireU = { uT: { value: 0 } };
  clothMat.onBeforeCompile = sh => {
    sh.uniforms.uT = fireU.uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vC; attribute vec3 aBurn; varying vec3 vB;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvB = aBurn; vC = uv * vec2(' + CLOTH.w.toFixed(2) + ', ' + CLOTH.d.toFixed(2) + ');');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vC; varying vec3 vB; uniform float uT;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 e = min(vC, vec2(${CLOTH.w.toFixed(2)}, ${CLOTH.d.toFixed(2)}) - vC);
          float edge = min(e.x, e.y);
          // The hem: a doubled band at the edge reads a touch deeper, with a stitch line.
          diffuseColor.rgb *= 1.0 - 0.07 * (1.0 - smoothstep(0.012, 0.016, edge));
          float st = step(0.5, fract((vC.x + vC.y) * 260.0)) * smoothstep(0.0012, 0.0, abs(edge - 0.018));
          diffuseColor.rgb *= 1.0 - 0.12 * st;
          // Fine weave: warp and weft threads.
          vec2 th = abs(fract(vC * vec2(1400.0)) - 0.5);
          diffuseColor.rgb *= 0.965 + 0.035 * vn(vec3(vC * 900.0, 1.0)) + 0.02 * smoothstep(0.2, 0.5, min(th.x, th.y));
          // Fire: heat browns the linen, the flame chars it black, and it burns through.
          // Noise makes the burnt edge ragged.
          float nb = vn(vec3(vC * 55.0, 2.0)) * 0.6 + vn(vec3(vC * 170.0, 5.0)) * 0.4;
          float burnt = vB.x + (nb - 0.5) * 0.4;
          if (burnt > 0.9) discard;
          float scorch = clamp(vB.z * 0.7 + vB.x * 2.5, 0.0, 1.0) * (0.7 + 0.6 * nb);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.22, 0.11), smoothstep(0.1, 0.7, scorch) * 0.85);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.016, 0.014), smoothstep(0.3, 0.62, burnt));
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          vec2 e = min(vC, vec2(${CLOTH.w.toFixed(2)}, ${CLOTH.d.toFixed(2)}) - vC);
          float edge = min(e.x, e.y);
          // Damask: satin figures in a matte ground, seen only in the sheen.
          vec2 q = vC * 26.0;
          float fig = smoothstep(0.25, 0.4, sin(q.x) * sin(q.y) + 0.45 * sin((q.x + q.y) * 0.5));
          float band = smoothstep(0.0, 0.002, abs(edge - 0.075) - 0.004) * smoothstep(0.0, 0.002, abs(edge - 0.09) - 0.002);
          roughnessFactor = mix(0.48, 0.82, fig * band);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // The burning edge glows; embers creep through the char behind it.
          float nb = vn(vec3(vC * 55.0, 2.0)) * 0.6 + vn(vec3(vC * 170.0, 5.0)) * 0.4;
          float burnt = vB.x + (nb - 0.5) * 0.4;
          float rim = smoothstep(0.6, 0.82, burnt) * (1.0 - smoothstep(0.84, 0.9, burnt));
          float flick = 0.7 + 0.3 * vn(vec3(vC * 30.0, uT * 6.0));
          float ember = smoothstep(0.55, 0.85, vn(vec3(vC * 90.0, uT * 0.8))) * smoothstep(0.45, 0.7, burnt);
          float live = clamp(vB.y * 1.5, 0.0, 1.0);
          totalEmissiveRadiance += vec3(1.0, 0.36, 0.07) * (rim * 9.0 + ember * 2.5) * flick * max(live, 0.25 * step(0.4, burnt));
        }`);
  };
  const cloth = new THREE.Mesh(clothG, clothMat);
  cloth.castShadow = true; cloth.receiveShadow = true;
  cloth.frustumCulled = false;
  scene.add(cloth);

  /* ---------- tableware ---------- */
  const ware = makeTableware(keep);
  const pieces = [];
  const flameMat = ware.flameMat;
  scene.add(ware.flame);
  const liq = new Map();
  function pieceMesh(b) {
    const g = ware.make(b.kind, b.c);
    scene.add(g.root);
    if (b.liq) {
      const L = liquidMats(b.kind, keep);
      scene.add(L.body, L.cap);
      liq.set(b, L);
    }
    return g;
  }

  /* ---------- shards, chips, drops, puddles ---------- */
  const shardCache = new Map();
  function shardMesh(s) {
    const plan = planOf(s.owner)[s.plan];
    let m = shardCache.get(s);
    if (m) return m;
    const pts = plan.prof.map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, Math.max(3, Math.round(plan.dphi / (Math.PI * 2) * 40)), plan.phi0, plan.dphi);
    g.translate(-plan.c[0], -plan.c[1], -plan.c[2]);
    m = new THREE.Mesh(g, s.sub === 'plate' ? ware.chinaShard : ware.glassShard);
    m.castShadow = s.sub === 'plate';
    m.renderOrder = 3;
    scene.add(m);
    shardCache.set(s, m);
    return m;
  }
  const chipG = keep(new THREE.BufferGeometry());
  chipG.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.6, 0.55, 0, 0.45, -0.6, 0, 0.35]), 3));
  chipG.computeVertexNormals();
  const chipsGlass = new THREE.InstancedMesh(chipG, ware.glassShard, 160);
  const chipsChina = new THREE.InstancedMesh(chipG, ware.chinaShard, 80);
  for (const m of [chipsGlass, chipsChina]) { m.frustumCulled = false; m.count = 0; m.renderOrder = 3; scene.add(m); }
  const dropG = keep(new THREE.IcosahedronGeometry(1, 1));
  const dropsWine = new THREE.InstancedMesh(dropG, ware.wineDrop, 220);
  const dropsWater = new THREE.InstancedMesh(dropG, ware.waterDrop, 220);
  for (const m of [dropsWine, dropsWater]) { m.frustumCulled = false; m.count = 0; scene.add(m); }
  // Embers of burning wax: small, hot, for the bloom to take.
  const emberMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 2.4, 0.5) }));
  const embersM = new THREE.InstancedMesh(dropG, emberMat, 32);
  embersM.frustumCulled = false; embersM.count = 0;
  scene.add(embersM);
  // Ash: a black flake where the cloth burnt through, lying where that patch fell.
  const ashG = keep(new THREE.CircleGeometry(0.017, 5).rotateX(-Math.PI / 2));
  const ashMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.018, 0.016, 0.014), roughness: 0.95, side: THREE.DoubleSide }));
  const ashM = new THREE.InstancedMesh(ashG, ashMat, NP);
  ashM.frustumCulled = false; ashM.count = 0; ashM.receiveShadow = true;
  scene.add(ashM);
  const ashQ = new THREE.Quaternion(), ashE = new THREE.Euler();
  function ash(cl) {
    const P = cl.P, m4 = new THREE.Matrix4(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let n = 0;
    for (let p = 0; p < NP; p++) {
      if (!cl.cut[p]) continue;
      // Each flake keeps its own tilt and size from its index.
      ashE.set((p * 0.37 % 1 - 0.5) * 0.5, p * 2.39, (p * 0.71 % 1 - 0.5) * 0.5);
      ashQ.setFromEuler(ashE);
      // A flake lies off its particle, so the grid does not show.
      const jx = ((p * 0.7548) % 1 - 0.5) * 0.035, jz = ((p * 0.5698) % 1 - 0.5) * 0.035;
      m4.compose(v.set(P[p * 3] + jx, Math.max(0.0025, P[p * 3 + 1]), P[p * 3 + 2] + jz), ashQ, sc.set(0.5 + (p * 0.53 % 1) * 0.7, 1, 0.4 + (p * 0.29 % 1) * 0.8));
      ashM.setMatrixAt(n++, m4);
    }
    ashM.count = n;
    ashM.instanceMatrix.needsUpdate = true;
  }
  const puddleG = keep(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2));
  const puddles = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(puddleG, ware.puddleMat(i));
    m.visible = false; m.renderOrder = 1;
    scene.add(m);
    puddles.push(m);
  }

  /* ---------- post ---------- */
  // The scene's depth goes to a texture: the fire's march stops at surfaces.
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(1, 1) });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const fire = createFire(renderer, camera, LAMP);
  composer.addPass(fire.pass);
  // The fire's own light: warm, low, flickering, no shadow.
  const fireLight = new THREE.PointLight(FIRE_LIGHT.clone(), 0, 0, 2);
  scene.add(fireLight);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSeed: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSeed; uniform float uAspect; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        c *= 1.0 - 0.5 * smoothstep(0.4, 1.2, length(q));
        c += (h(vUv * 913.0) - 0.5) * 0.012;
        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }`,
  });
  composer.addPass(grade);

  /* ---------- shot ---------- */
  // Low at the table's pull-end corner, looking back along it.
  const look = new THREE.Vector3(), base = new THREE.Vector3();
  let aspect = 1;
  function frame(w, h, cov = 0) {
    aspect = w / h;
    const tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 50 : 40;
    const az = tall ? 0.42 : 0.5, el = tall ? 0.5 : 0.47, dist = tall ? 3.6 : 2.45;
    look.set(tall ? 0.4 : 0.42, tall ? 0.46 : 0.52, 0.0);
    base.set(look.x + Math.cos(az) * Math.cos(el) * dist, look.y + Math.sin(el) * dist, look.z + Math.sin(az) * Math.cos(el) * dist);
    camera.position.copy(base);
    camera.lookAt(look);
    camera.setViewOffset(w, h, 0, (cov * h) / 2, w, h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    grade.uniforms.uAspect.value = aspect;
  }
  function resize(w, h, dpr, { bloomScale = 0.5, samples = 4, shadow = 2048 } = {}) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    if (composer.readBuffer.samples !== samples) { composer.readBuffer.samples = samples; composer.readBuffer.dispose(); }
    composer.writeBuffer.samples = 0;
    bloom.setSize(Math.round(w * dpr * bloomScale), Math.round(h * dpr * bloomScale));
    if (lamp.shadow.mapSize.x !== shadow) { lamp.shadow.mapSize.set(shadow, shadow); lamp.shadow.map?.dispose(); lamp.shadow.map = null; }
  }

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const pullPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  // The pointer on the pull plane: the upright plane down the table's middle.
  function pick(nx, ny) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(pullPlane, hit) ? { x: hit.x, y: hit.y } : null;
  }
  const sp = new THREE.Vector3();
  function toScreen(x, y, z) {
    sp.set(x, y, z).project(camera);
    return [(sp.x + 1) / 2, (1 - sp.y) / 2];
  }
  // The nearest hem particle to a screen point, in stage pixels.
  function nearHem(sim, nx, ny, w, h) {
    const P = sim.cloth.P;
    let best = 1e9;
    for (let i = NX - 9; i < NX; i++) for (let j = 0; j < NZ; j += 1) {
      const k = (i * NZ + j) * 3;
      if (i < NX - 1 && P[k + 1] > TOP - 0.02 && P[k] < TABLE.hx) continue;
      const [sx, sy] = toScreen(P[k], P[k + 1], P[k + 2]);
      best = Math.min(best, Math.hypot((sx - nx) * w, (sy - ny) * h));
    }
    return best;
  }

  /* ---------- sync ---------- */
  const tmpQ = new THREE.Quaternion();
  let painted = false, clothDrawn = false;
  function update(sim, t) {
    if (!pieces.length) for (const b of sim.bodies) pieces.push(pieceMesh(b));
    // Cloth.
    // The cloth mesh rebuilds only when the cloth moved.
    if (sim.cloth.awake || sim.reset || !clothDrawn) {
      refine(sim.cloth.P);
      clothG.attributes.position.needsUpdate = true;
      clothG.computeVertexNormals();
      clothDrawn = true;
    }
    // Pieces and their liquid.
    sim.bodies.forEach((b, i) => {
      const g = pieces[i];
      g.root.visible = !b.gone && b.scale > 0.001;
      g.root.position.set(b.x, b.y, b.z);
      g.root.quaternion.set(b.qx, b.qy, b.qz, b.qw);
      g.root.scale.setScalar(Math.max(b.scale, 0.001));
      g.root.updateMatrixWorld();
      const L = liq.get(b);
      if (L) L.sync(b, g.root);
    });
    // The candle flame.
    const st = sim.bodies.find(b => b.kind === 'stick');
    const F = sim.flame, gi = sim.bodies.indexOf(st), sg = pieces[gi];
    const tip = sg.tip.getWorldPosition(sp);
    const fa = sim.flick ?? 1, flick = 1 - fa * (0.1 - 0.1 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1.0) - 0.05 * Math.sin(t * 31.0));
    const alive = st.gone ? 0 : 1 - F.out;
    ware.flame.position.copy(tip);
    ware.flame.visible = alive > 0.01;
    flameMat.uniforms.uT.value = t * (sim.flick ?? 1);
    flameMat.uniforms.uLean.value = F.lean;
    flameMat.uniforms.uLife.value = alive;
    candle.position.copy(tip).y += 0.02;
    candle.intensity = 0.22 * flick * alive;
    // Shards and chips.
    for (const s of sim.shards) {
      const m = shardMesh(s);
      m.visible = s.fade > 0.01;
      m.position.set(s.x, s.y, s.z);
      m.quaternion.set(s.qx, s.qy, s.qz, s.qw);
      m.scale.setScalar(Math.max(0.001, s.fade));
    }
    for (const [s, m] of shardCache) if (!sim.shards.includes(s)) { scene.remove(m); m.geometry.dispose(); shardCache.delete(s); }
    let ng = 0, nc = 0;
    const m4 = new THREE.Matrix4(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const g of sim.glitter) {
      e.set(g.rx, g.ry, 0);
      tmpQ.setFromEuler(e);
      m4.compose(v.set(g.x, g.y, g.z), tmpQ, sc.setScalar(g.s * g.fade));
      if (g.sub === 'plate') { if (nc < 80) chipsChina.setMatrixAt(nc++, m4); } else if (ng < 160) chipsGlass.setMatrixAt(ng++, m4);
    }
    chipsGlass.count = ng; chipsChina.count = nc;
    chipsGlass.instanceMatrix.needsUpdate = true; chipsChina.instanceMatrix.needsUpdate = true;
    let nw = 0, nv = 0;
    tmpQ.identity();
    for (const d of sim.drops) {
      m4.compose(v.set(d.x, d.y, d.z), tmpQ, sc.set(d.s, d.s * 1.3, d.s));
      if (d.kind === 'wine') dropsWine.setMatrixAt(nw++, m4); else dropsWater.setMatrixAt(nv++, m4);
    }
    dropsWine.count = nw; dropsWater.count = nv;
    let ne = 0;
    for (const e of sim.embers) { if (ne >= 32) break; m4.compose(v.set(e.x, e.y, e.z), tmpQ, sc.setScalar(e.s * Math.min(1, e.life * 2))); embersM.setMatrixAt(ne++, m4); }
    embersM.count = ne;
    embersM.instanceMatrix.needsUpdate = true;
    dropsWine.instanceMatrix.needsUpdate = true; dropsWater.instanceMatrix.needsUpdate = true;
    puddles.forEach((m, i) => {
      const p = sim.puddles[i];
      m.visible = !!p && p.fade > 0.01;
      if (!p) return;
      m.position.set(p.x, p.y + 0.0006, p.z);
      m.scale.setScalar(Math.max(0.001, p.r));
      ware.setPuddle(m.material, p);
    });
    fireTick(sim, t);
    painted = true;
  }
  /* ---------- fire ---------- */
  let lastT = 0, smokeLeft = 0;
  function fireTick(sim, t) {
    const dt = Math.min(1 / 20, Math.max(0, t - lastT));
    lastT = t;
    const cl = sim.cloth;
    fireU.uT.value = t;
    const burning = sim.burning > 0 || sim.fireT > 0;
    if (burning || cl.fuel[0] < 1 || burnDrawn) {
      // The burn marks change only while something burns or heals.
      if (burning || sim.reset || burnDrawn) { burnAttr(cl); ash(cl); }
      burnDrawn = burning || !!sim.reset;
    }
    if (burning) smokeLeft = 4;
    else if (smokeLeft > 0) smokeLeft -= dt;
    const on = burning || smokeLeft > 0 || !!(sim.reset && fire.live && smokeLeft > -1);
    if (!on) { fire.stop(); fire.pass.enabled = false; fireLight.intensity = 0; return; }
    fire.pass.enabled = true;
    // Each burning particle gives heat while its flame is full and smoke as it chars.
    const P = cl.P;
    let x0 = 9, y0 = 9, z0 = 9, x1 = -9, y1 = -9, z1 = -9, n = 0;
    if (!sim.reset) for (let p = 0; p < NP; p++) {
      if (cl.cut[p] || cl.heat[p] < 1 || cl.fuel[p] <= 0) continue;
      const life = 1 - cl.fuel[p], k = p * 3;
      const flame = Math.min(1, life * 8) * (1 - Math.max(0, (life - 0.8) / 0.2));
      fire.emit(P[k], P[k + 1] + 0.01, P[k + 2], 0.5 * flame + 0.6 * Math.max(0, life - 0.4), 0.85 * flame);
      x0 = Math.min(x0, P[k]); y0 = Math.min(y0, P[k + 1]); z0 = Math.min(z0, P[k + 2]);
      x1 = Math.max(x1, P[k]); y1 = Math.max(y1, P[k + 1]); z1 = Math.max(z1, P[k + 2]);
      n++;
    }
    if (n) { box.x0 = x0; box.y0 = y0; box.z0 = z0; box.x1 = x1; box.y1 = y1; box.z1 = z1; }
    // The march covers the fire and the air round it; smoke drifts wide.
    fire.bounds(box.x0 - 0.8, 0, box.z0 - 0.8, box.x1 + 0.8, 2, box.z1 + 0.8);
    fire.step(dt || 1 / 60, sim.reset ? 1 : 0);
    // The light sits in the flames and swells with them.
    const fl = 0.8 + 0.2 * Math.sin(t * 17.3) * Math.sin(t * 7.1 + 1.3) + 0.1 * Math.sin(t * 41.0);
    fireLight.position.set(sim.fireC[0], sim.fireC[1] + 0.3, sim.fireC[2]);
    const target = sim.reset ? 0 : Math.min(5, Math.sqrt(sim.burning) * 0.2) * fl;
    fireLight.intensity += (target - fireLight.intensity) * Math.min(1, dt * 8);
  }
  const box = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };
  function render(t = 0) {
    grade.uniforms.uSeed.value = t % 100;
    composer.render();
  }
  async function warm(sim) {
    update(sim, 0);
    await renderer.compileAsync(scene, camera);
  }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    for (const m of shardCache.values()) m.geometry.dispose();
    ware.dispose();
    pmrem.dispose();
    composer.dispose?.();
    fire.dispose();
    rt.depthTexture?.dispose();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, scene, camera, fire, frame, resize, pick, toScreen, nearHem, update, render, warm, dispose, get painted() { return painted; } };
}
