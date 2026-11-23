// Geoboard: the three.js scene. A plywood board of steel nails on a dark desk.
// Sim (x, y, z) maps to world (x, z, y): y runs toward the viewer.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { B, PEGS, K, sample, envAt } from './board.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// Band colours, linear RGB: the body, and the pale tint of stretched rubber.
export const BANDS = {
  red: { body: [0.62, 0.028, 0.03], pale: [0.95, 0.34, 0.3] },
  amber: { body: [0.92, 0.42, 0.018], pale: [1.0, 0.78, 0.4] },
  blue: { body: [0.025, 0.11, 0.62], pale: [0.38, 0.55, 1.0] },
  green: { body: [0.06, 0.42, 0.05], pale: [0.5, 0.88, 0.42] },
};
const MAXS = 1400, SIDES = 8, MAXR = 40;

const NOISE = /* glsl */`
  float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y);
  }
`;

export function createScene(canvas, { onLost } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0, 0);
  const camera = new THREE.PerspectiveCamera(26, 1, 20, 3000);
  const disposables = [];
  const keep = x => (disposables.push(x), x);

  // A dim room gives the steel and the rubber something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = keep(new RoomEnvironment());
  const env = keep(pmrem.fromScene(room, 0.04).texture);
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.22;

  /* ---------- light ---------- */
  // One warm key from the back left throws long nail shadows forward.
  const key = new THREE.SpotLight(new THREE.Color(1.0, 0.84, 0.66), 7.0e5, 0, 0.46, 0.85, 2);
  key.position.set(-190, 430, -230);
  key.target.position.set(10, 0, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 300;
  key.shadow.camera.far = 800;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.25;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.5, 0.5, 0.56), new THREE.Color(0.05, 0.04, 0.03), 0.42);
  scene.add(hemi);
  // A cool rim from the front right lifts the near edge of the board.
  const fill = new THREE.DirectionalLight(new THREE.Color(0.62, 0.72, 1.0), 0.32);
  fill.position.set(220, 120, 260);
  scene.add(fill);
  const keyView = { value: new THREE.Vector3(0, 0, 1) };

  /* ---------- desk ---------- */
  const deskMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.016, 0.014, 0.013), roughness: 0.9 }));
  deskMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vDesk;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDesk = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vDesk;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.82 + 0.3 * vn(vDesk * 0.03) + 0.06 * vn(vDesk * 1.3);`);
  };
  const desk = new THREE.Mesh(keep(new THREE.PlaneGeometry(4000, 4000)), deskMat);
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -B.thick;
  desk.receiveShadow = true;
  scene.add(desk);

  /* ---------- board ---------- */
  const boardGeo = keep(new RoundedBoxGeometry(B.size, B.thick, B.size, 3, B.radius));
  const boardMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.66, 0.47, 0.29), roughness: 0.62 }));
  boardMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBP; varying vec3 vBN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBP = position; vBN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBP; varying vec3 vBN;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 p = vBP.xz;
          // Birch face: soft long grain, a few flecks.
          float warp = vn(p * vec2(0.012, 0.05)) * 9.0 + vn(p * 0.1) * 1.5;
          float grain = sin((p.y + warp) * 1.35) * 0.5 + 0.5;
          float fine = vn(vec2(p.x * 0.04, p.y * 1.1));
          float face = 0.9 + 0.1 * grain + 0.06 * (fine - 0.5) - 0.07 * smoothstep(0.82, 0.96, vn(p * 0.09 + 3.0));
          // Ply edges: thin layers with dark glue lines.
          float y = vBP.y + ${(B.thick / 2).toFixed(2)};
          float ply = fract(y / 2.0);
          float plies = (0.86 + 0.12 * step(0.5, fract(y / 4.0))) * (1.0 - 0.45 * smoothstep(0.08, 0.0, abs(ply - 0.5) - 0.42));
          float top = smoothstep(0.6, 0.9, vBN.y);
          diffuseColor.rgb *= mix(plies * (0.94 + 0.06 * vn(p * 0.05 + y * 0.2)), face, top);
          // A faint dark ring where each nail enters the wood.
          vec2 g = clamp(floor(p / ${B.gap.toFixed(1)} + 0.5), -2.0, 2.0) * ${B.gap.toFixed(1)};
          float d = length(p - g);
          diffuseColor.rgb *= 1.0 - top * 0.42 * exp(-d * d / 7.0);
        }`);
  };
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.y = -B.thick / 2;
  board.castShadow = true;
  board.receiveShadow = true;
  scene.add(board);

  /* ---------- nails ---------- */
  const steel = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.6, 0.6, 0.62), metalness: 1, roughness: 0.34 }));
  const headMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.4, 0.4, 0.41), metalness: 1, roughness: 0.44 }));
  const shaftGeo = keep(new THREE.CylinderGeometry(B.pegR, B.pegR, B.pegH + 1, 14).translate(0, (B.pegH - 1) / 2, 0));
  // A flat head with a slight dome and a soft lip.
  const headGeo = keep(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(B.headR - 0.2, 0), new THREE.Vector2(B.headR, 0.25),
    new THREE.Vector2(B.headR, B.headH * 0.75), new THREE.Vector2(B.headR - 0.5, B.headH), new THREE.Vector2(0, B.headH + 0.18),
  ], 28).translate(0, B.pegH, 0));
  const shafts = new THREE.InstancedMesh(shaftGeo, steel, PEGS.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, PEGS.length);
  const mtx = new THREE.Matrix4();
  PEGS.forEach((p, i) => {
    // Hand-driven nails lean a hair.
    const lean = new THREE.Euler(Math.sin(i * 12.9) * 0.012, 0, Math.cos(i * 7.3) * 0.012);
    mtx.makeRotationFromEuler(lean).setPosition(p.x, 0, p.y);
    shafts.setMatrixAt(i, mtx);
    heads.setMatrixAt(i, mtx);
  });
  for (const m of [shafts, heads]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }

  /* ---------- finger ---------- */
  // A soft shade on the board under the finger shows where it holds.
  const shadeMat = keep(new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.0, 0.0, uA * exp(-d * d * 3.5) * (1.0 - smoothstep(0.85, 1.0, d))); }',
    transparent: true, depthWrite: false,
  }));
  const shade = new THREE.Mesh(keep(new THREE.PlaneGeometry(44, 44)), shadeMat);
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.15;
  shade.renderOrder = 1;
  scene.add(shade);

  /* ---------- bands ---------- */
  // Rubber is a little translucent: the key glows through a thin strip.
  const bandMeshes = [], ghosts = [];
  function bandMat(col) {
    const m = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...col.body), roughness: 0.48, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color(...col.pale), clearcoat: 0.15, clearcoatRoughness: 0.5 }));
    m.onBeforeCompile = sh => {
      sh.uniforms.uKeyView = keyView;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uKeyView;')
        .replace('#include <opaque_fragment>', `
          {
            vec3 vd = normalize(-vViewPosition);
            float back = pow(max(dot(-vd, uKeyView), 0.0), 3.0);
            outgoingLight += diffuseColor.rgb * (0.05 + back * 0.6) * (max(dot(-normal, uKeyView), 0.0) * 0.6 + 0.4);
          }
          #include <opaque_fragment>`);
    };
    return m;
  }
  function tubeGeo() {
    const g = new THREE.BufferGeometry();
    const V = (MAXS + 1) * SIDES;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(V * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const idx = new Uint32Array(MAXS * SIDES * 6);
    let o = 0;
    for (let i = 0; i < MAXS; i++) for (let k = 0; k < SIDES; k++) {
      const a = i * SIDES + k, b = i * SIDES + (k + 1) % SIDES, c = a + SIDES, d = b + SIDES;
      idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    return keep(g);
  }
  // The blur of a ringing run: a soft ribbon, densest at its edges.
  const ghostMat = col => keep(new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(...col.body).lerp(new THREE.Color(...col.pale), 0.15) }, uA: { value: 0.5 } },
    vertexShader: 'attribute float aV; attribute float aE; varying float vV; varying float vE; void main() { vV = aV; vE = aE; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vV; varying float vE;
      void main() {
        float v = abs(vV);
        float a = uA * vE * (0.06 + 0.94 * v * v * v) * smoothstep(1.0, 0.86, v);
        gl_FragColor = vec4(uCol, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  function ghostGeo() {
    const g = new THREE.BufferGeometry();
    const V = MAXR * (K + 1) * 2;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aV', new THREE.BufferAttribute(new Float32Array(V), 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aE', new THREE.BufferAttribute(new Float32Array(V), 1).setUsage(THREE.DynamicDrawUsage));
    const idx = new Uint32Array(MAXR * K * 6);
    let o = 0;
    for (let r = 0; r < MAXR; r++) for (let k = 0; k < K; k++) {
      const a = (r * (K + 1) + k) * 2;
      idx[o++] = a; idx[o++] = a + 2; idx[o++] = a + 1; idx[o++] = a + 1; idx[o++] = a + 2; idx[o++] = a + 3;
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    return keep(g);
  }
  const colTmp = new THREE.Color();
  function addBand(b) {
    const col = BANDS[b.col];
    const mesh = new THREE.Mesh(tubeGeo(), bandMat(col));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    const ghost = new THREE.Mesh(ghostGeo(), ghostMat(col));
    ghost.frustumCulled = false;
    ghost.renderOrder = 2;
    scene.add(ghost);
    bandMeshes[b.i] = { mesh, col, sig: '' };
    ghosts[b.i] = ghost;
  }

  const SP = { x: new Float32Array(MAXS), y: new Float32Array(MAXS), z: new Float32Array(MAXS), run: new Int16Array(MAXS) };
  // Rounded corners of the strip section: cos and sin, pushed toward a square.
  const SEC = Array.from({ length: SIDES }, (_, k) => {
    const a = (k + 0.5) / SIDES * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    return [Math.sign(c) * Math.abs(c) ** 0.6, Math.sign(s) * Math.abs(s) ** 0.6, c, s];
  });
  function writeBand(bd, b, vis) {
    const bm = bandMeshes[b.i];
    const n = Math.min(MAXS, sample(bd, b, SP, vis));
    const g = bm.mesh.geometry, P = g.attributes.position.array, N = g.attributes.normal.array;
    const ht = b.h / 2, tt = b.t / 2;
    for (let i = 0; i <= n; i++) {
      const j = i % n, jp = (j - 1 + n) % n, jn = (j + 1) % n;
      // Tangent in world axes: sim y is world z, sim z is world y.
      let tx = SP.x[jn] - SP.x[jp], ty = SP.z[jn] - SP.z[jp], tz = SP.y[jn] - SP.y[jp];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      // Side normal lies flat; the up normal follows the slope of the run.
      let sx = tz, sz = -tx;
      const sl = Math.hypot(sx, sz) || 1;
      sx /= sl; sz /= sl;
      const ux = ty * sz, uy = tz * sx - tx * sz, uz = -ty * sx;
      const cx = SP.x[j], cy = SP.z[j], cz = SP.y[j];
      for (let k = 0; k < SIDES; k++) {
        const [qc, qs, nc, ns] = SEC[k], o = (i * SIDES + k) * 3;
        P[o] = cx + sx * qc * tt + ux * qs * ht;
        P[o + 1] = cy + uy * qs * ht;
        P[o + 2] = cz + sz * qc * tt + uz * qs * ht;
        const nx = sx * nc / tt + ux * ns / ht, ny = uy * ns / ht, nz = sz * nc / tt + uz * ns / ht, nl = Math.hypot(nx, ny, nz) || 1;
        N[o] = nx / nl; N[o + 1] = ny / nl; N[o + 2] = nz / nl;
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.position.addUpdateRange?.(0, (n + 1) * SIDES * 3);
    g.attributes.normal.addUpdateRange?.(0, (n + 1) * SIDES * 3);
    g.setDrawRange(0, n * SIDES * 6);
    // Stretched rubber thins and turns paler.
    const pale = clamp((b.lam - 1.2) / 7) * 0.55;
    bm.mesh.material.color.setRGB(...bm.col.body).lerp(colTmp.setRGB(...bm.col.pale), pale);
  }
  function writeGhost(b, vis) {
    const gm = ghosts[b.i], g = gm.geometry, P = g.attributes.position.array, V = g.attributes.aV.array, E = g.attributes.aE.array;
    let r = 0, peak = 0;
    for (const run of b.runs) {
      const v = b.vib.get(run.key);
      if (!v || !v.act || r >= MAXR) continue;
      const nx = -(run.y1 - run.y0) / (run.l || 1), ny = (run.x1 - run.x0) / (run.l || 1);
      for (let k = 0; k <= K; k++) {
        const s = k / K, e = envAt(v, s) * vis + b.t * 0.5;
        peak = Math.max(peak, e);
        const x = run.x0 + (run.x1 - run.x0) * s, y = run.y0 + (run.y1 - run.y0) * s, z = run.a.z + (run.c.z - run.a.z) * s;
        const fade = clamp((envAt(v, s) * vis) / 0.6);
        for (let side = 0; side < 2; side++) {
          const o = (r * (K + 1) + k) * 2 + side, sg = side ? 1 : -1;
          P[o * 3] = x + nx * e * sg; P[o * 3 + 1] = z + 0.05; P[o * 3 + 2] = y + ny * e * sg;
          V[o] = sg; E[o] = fade;
        }
      }
      r++;
    }
    for (const a of ['position', 'aV', 'aE']) g.attributes[a].needsUpdate = true;
    g.setDrawRange(0, r * K * 6);
    gm.visible = r > 0;
  }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.3, 0.93);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // Grade after the output pass: vignette and fine grain in display space.
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
  const look = new THREE.Vector3();
  let aspect = 1;
  // A high three-quarter view from the front, a little to the right.
  function frame(w, h, cov = 0) {
    aspect = w / h;
    const tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 34 : 25;
    const elev = tall ? 1.12 : 0.98, az = tall ? 0.06 : 0.16;
    const R = B.size * 0.62;
    const tv = Math.tan(camera.fov * Math.PI / 360), th = tv * aspect;
    // Fit the board in the area the bar leaves free.
    const free = 1 - cov;
    const dist = Math.max(R / (tv * free * 0.94), R / (th * 0.92)) * (tall ? 0.9 : 1.04);
    look.set(0, 0, 4 + cov * 0.0);
    camera.position.set(Math.sin(az) * Math.cos(elev) * dist, Math.sin(elev) * dist, Math.cos(az) * Math.cos(elev) * dist);
    camera.lookAt(look);
    // Shift the picture up by the share the bar covers.
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
    if (composer.readBuffer.samples !== samples) {
      composer.readBuffer.samples = samples;
      composer.readBuffer.dispose();
    }
    composer.writeBuffer.samples = 0;
    bloom.setSize(Math.round(w * dpr * bloomScale), Math.round(h * dpr * bloomScale));
    if (key.shadow.mapSize.x !== shadow) {
      key.shadow.mapSize.set(shadow, shadow);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    }
  }

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  // The pointer on a level plane at height z, in sim coordinates.
  function pick(nx, ny, z = 0) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    plane.constant = -z;
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.z } : null;
  }
  const sp = new THREE.Vector3();
  // Screen position of a sim point, 0..1.
  function toScreen(x, y, z) {
    sp.set(x, z, y).project(camera);
    return [(sp.x + 1) / 2, (1 - sp.y) / 2];
  }

  /* ---------- sync ---------- */
  function update(bd, vis = 1) {
    lastVis = vis;
    const held = bd.bands.find(b => b.hand);
    shadeMat.uniforms.uA.value += ((held ? 0.42 : 0) - shadeMat.uniforms.uA.value) * 0.35;
    if (held) shade.position.set(held.hand.x + 10, 0.15, held.hand.y + 9);
    for (const b of bd.bands) {
      if (!bandMeshes[b.i]) addBand(b);
      writeBand(bd, b, vis);
      writeGhost(b, vis);
      ghosts[b.i].material.uniforms.uA.value = bd.calm ? 0.25 : 0.55;
    }
  }
  function render(grain = 0) {
    grade.uniforms.uSeed.value = grain;
    keyView.value.copy(key.position).sub(key.target.position).normalize().transformDirection(camera.matrixWorldInverse);
    composer.render();
  }
  async function warm(bd) { update(bd); await renderer.compileAsync(scene, camera); }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  // The same samples the mesh draws, for hit tests.
  let lastVis = 1;
  const sampleBand = (bd, b, out) => sample(bd, b, out, lastVis);
  return { renderer, scene, camera, frame, resize, pick, toScreen, sampleBand, update, render, warm, dispose };
}
