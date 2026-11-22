// Pea pod: the three.js scene. A dark table, one low warm key light,
// a pod of two shell valves rebuilt per frame, and instanced peas.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { POD, profile, bumps, openAt, centre } from './pod.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
// Colours are linear RGB.
export const COL = {
  pod: [0.16, 0.36, 0.045],
  podDeep: [0.07, 0.19, 0.02],
  seam: [0.5, 0.62, 0.22],
  lining: [0.44, 0.56, 0.19],
  pea: [0.2, 0.46, 0.05],
  table: [0.05, 0.036, 0.026],
  key: [1.0, 0.78, 0.55],
};

// The shell grid: NU slices along the pod, NV points round each half.
const NU = 72, NV = 15;
const MAXPEAS = 96;

export function createScene(canvas, { onLost } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0, 0);
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 400);
  const disposables = [];
  const keep = x => (disposables.push(x), x);
  const rig = new THREE.Group();
  scene.add(rig);

  /* ---------- light ---------- */
  // The key is low and behind on the left: the pod glows at its edges.
  const key = new THREE.SpotLight(new THREE.Color(...COL.key), 9000, 0, 0.3, 1, 2);
  key.position.set(-30, 27, -34);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 20;
  key.shadow.camera.far = 90;
  key.shadow.bias = -0.0004;
  // A wide blur: the key is a big soft window, not a point.
  key.shadow.radius = 9;
  key.shadow.blurSamples = 16;
  key.shadow.normalBias = 0.02;
  rig.add(key, key.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.32, 0.42, 0.62), new THREE.Color(0.06, 0.04, 0.03), 0.8);
  rig.add(hemi);
  // A cool back fill from the right keeps the far side of each pea.
  const rim = new THREE.DirectionalLight(new THREE.Color(0.55, 0.68, 1.0), 0.5);
  rim.position.set(24, 14, -20);
  rig.add(rim, rim.target);
  const keyDir = new THREE.Vector3();
  const keyView = { value: new THREE.Vector3(0, 0, 1) };

  /* ---------- table ---------- */
  const tableTex = keep(woodTexture());
  tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping;
  tableTex.colorSpace = THREE.SRGBColorSpace;
  const TILE = 48;
  tableTex.repeat.set(400 / TILE, 160 / TILE);
  const tableMat = keep(new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.78, metalness: 0 }));
  const table = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, 160)), tableMat);
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  /* ---------- materials ---------- */
  // Light through thin green tissue: a soft glow when it faces the key.
  const glow = (strength, tint) => shader => {
    shader.uniforms.uKeyView = keyView;
    shader.uniforms.uGlow = { value: strength };
    shader.uniforms.uTint = { value: new THREE.Vector3(...tint) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uKeyView; uniform float uGlow; uniform vec3 uTint;')
      .replace('#include <opaque_fragment>', `
        {
          vec3 vd = normalize(-vViewPosition);
          float back = pow(max(dot(-vd, uKeyView), 0.0), 3.0);
          float thin = 1.0 - abs(dot(normal, vd));
          float through = max(dot(-normal, uKeyView), 0.0) * 0.6 + 0.4;
          outgoingLight += uTint * diffuseColor.rgb * uGlow * (0.25 + back * 2.2) * (0.35 + thin) * through;
        }
        #include <opaque_fragment>`);
  };
  const skinMat = keep(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.42,
    sheen: 0.5, sheenColor: new THREE.Color(0.55, 0.7, 0.5), sheenRoughness: 0.6, side: THREE.DoubleSide,
  }));
  skinMat.onBeforeCompile = glow(0.9, [1.4, 1.6, 0.5]);
  const liningMat = keep(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18, side: THREE.DoubleSide,
  }));
  liningMat.onBeforeCompile = glow(0.55, [1.2, 1.3, 0.8]);
  const calyxMat = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.08, 0.2, 0.03), roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0.5, 0.65, 0.45), side: THREE.DoubleSide }));
  calyxMat.onBeforeCompile = glow(0.7, [1.3, 1.6, 0.5]);

  /* ---------- peas ---------- */
  const peaGeo = keep(new THREE.SphereGeometry(1, 36, 24));
  const peaMat = keep(new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.25, sheenColor: new THREE.Color(0.7, 0.85, 0.6) }));
  peaMat.onBeforeCompile = shader => {
    glow(0.75, [1.3, 1.5, 0.45])(shader);
    // The hilum: the scar where the stalk held the pea. It shows the roll.
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float h = dot(normalize(vLocal), vec3(0.0, 0.0, 1.0));
          float scar = smoothstep(0.972, 0.985, h);
          float ring = smoothstep(0.955, 0.972, h) * (1.0 - scar);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.45, 1.4, 0.9) + 0.02, ring * 0.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.8, 0.72, 0.5), scar * 0.8);
        }`);
  };
  const peas = new THREE.InstancedMesh(peaGeo, peaMat, MAXPEAS);
  peas.castShadow = true;
  peas.receiveShadow = true;
  peas.count = 0;
  peas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXPEAS * 3), 3);
  scene.add(peas);

  /* ---------- juice mist ---------- */
  const DMAX = 128;
  const dPos = new THREE.BufferAttribute(new Float32Array(DMAX * 3), 3);
  const dAlpha = new THREE.BufferAttribute(new Float32Array(DMAX), 1);
  const dGeo = keep(new THREE.BufferGeometry());
  dGeo.setAttribute('position', dPos);
  dGeo.setAttribute('aAlpha', dAlpha);
  const dMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 400 }, uCol: { value: new THREE.Vector3(1.6, 1.7, 1.1) } },
    vertexShader: /* glsl */`
      attribute float aAlpha; varying float vA; uniform float uScale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.5, uScale * 0.05 / -mv.z);
        vA = aAlpha;
      }`,
    fragmentShader: /* glsl */`
      varying float vA; uniform vec3 uCol;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(uCol * a, a);
      }`,
  }));
  const drops = new THREE.Points(dGeo, dMat);
  drops.frustumCulled = false;
  scene.add(drops);

  /* ---------- pods ---------- */
  const podViews = new Map();
  function podView(pod) {
    let v = podViews.get(pod);
    if (v) return v;
    const group = new THREE.Group();
    const valves = [-1, 1].map(s => {
      const geo = valveGeometry();
      const m = new THREE.Mesh(geo, [skinMat, liningMat]);
      m.castShadow = true; m.receiveShadow = true;
      m.frustumCulled = false;
      m.userData.side = s;
      group.add(m);
      return m;
    });
    const calyx = calyxMesh(calyxMat);
    group.add(calyx);
    scene.add(group);
    v = { group, valves, calyx, key: '' };
    podViews.set(pod, v);
    return v;
  }
  function dropPod(pod) {
    const v = podViews.get(pod);
    if (!v) return;
    scene.remove(v.group);
    for (const m of v.valves) m.geometry.dispose();
    v.calyx.traverse(o => o.geometry?.dispose());
    podViews.delete(pod);
  }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSeed: { value: 0 }, uAspect: { value: 1 }, uFade: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uSeed; uniform float uAspect; uniform float uFade; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        c *= 1.0 - 0.5 * smoothstep(0.3, 1.1, length(q));
        c += (h(vUv * 913.0) - 0.5) * 0.01;
        gl_FragColor = vec4(max(c, 0.0) * uFade, 1.0);
      }`,
  });
  // The grade resolves the multisampled scene; bloom then reads a plain target.
  composer.addPass(grade);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- shot ---------- */
  const look = new THREE.Vector3();
  let aspect = 1, viewX = 0, cover = 0, tall = false, dims = [1, 1];
  // Fit the pod and the ground round it, clear of the bar at the foot.
  function frame(w, h, cov = 0) {
    dims = [w, h];
    aspect = w / h;
    cover = cov;
    tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 34 : 26;
    const elev = tall ? 1.02 : 0.9, az = -0.16;
    // Width of table to show, and depth, at the pod.
    const needW = tall ? POD.L * 1.4 : POD.L * 2.7;
    const needH = tall ? 13 : 12.5;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const free = 1 - cover;
    const dW = needW / 2 / (t * aspect);
    const dH = needH * Math.sin(elev) / 2 / (t * free);
    const dist = Math.max(dW, dH);
    // The bar takes the foot: aim lower so the pod sits mid free area.
    const shift = cover * t * dist;
    look.set(viewX, 0.5, shift / Math.sin(elev) * 0.9);
    camera.position.set(
      viewX + Math.sin(az) * Math.cos(elev) * dist,
      Math.sin(elev) * dist,
      look.z + Math.cos(az) * Math.cos(elev) * dist,
    );
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    grade.uniforms.uAspect.value = aspect;
    dMat.uniforms.uScale.value = h * renderer.getPixelRatio() / (2 * t);
  }
  function setView(x) {
    if (x === viewX) return;
    viewX = x;
    frame(dims[0], dims[1], cover);
    rig.position.x = x;
    key.target.position.set(0, 0, 0);
    table.position.x = x;
    tableTex.offset.x = x / TILE;
  }

  function resize(w, h, dpr, { bloomScale = 0.5, samples = 4, shadow = 2048 } = {}) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    // Only the scene target is multisampled: bloom on it draws black on some GPUs.
    if (composer.readBuffer.samples !== samples) {
      composer.readBuffer.samples = samples;
      composer.readBuffer.dispose();
    }
    composer.writeBuffer.samples = 0;
    bloom.resolution.set(w * dpr * bloomScale, h * dpr * bloomScale);
    bloom.setSize(Math.round(w * dpr * bloomScale), Math.round(h * dpr * bloomScale));
    if (key.shadow.mapSize.x !== shadow) {
      key.shadow.mapSize.set(shadow, shadow);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    }
  }

  // The pointer's hit on the table.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6), hit = new THREE.Vector3();
  function pick(nx, ny) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(ground, hit) ? { x: hit.x, z: hit.z } : null;
  }
  // Screen position of a world point, in 0..1.
  const sp = new THREE.Vector3();
  function toScreen(x, y, z) {
    sp.set(x, y, z).project(camera);
    return [(sp.x + 1) / 2, (1 - sp.y) / 2];
  }

  /* ---------- sync ---------- */
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
  const cTmp = [0, 0, 0, 0];
  function update(world) {
    setView(world.view);
    // Pods.
    for (const pod of [...podViews.keys()]) if (!world.pods.includes(pod)) dropPod(pod);
    for (const pod of world.pods) {
      const v = podView(pod);
      buildValves(pod, v);
      placeCalyx(pod, v.calyx);
    }
    // Peas: those still in a pod, then the loose ones.
    let n = 0;
    const put = (x, y, z, r, q, sq, hue) => {
      if (n >= MAXPEAS) return;
      ps.set(x, y, z);
      qt.set(q[0], q[1], q[2], q[3]);
      sc.set(r, r * sq, r);
      m4.compose(ps, qt, sc);
      peas.setMatrixAt(n, m4);
      const k = 0.82 + hue * 0.3;
      col.setRGB(COL.pea[0] * k * (1.05 - hue * 0.1), COL.pea[1] * k, COL.pea[2] * (0.7 + hue * 0.8));
      peas.setColorAt(n, col);
      n++;
    };
    for (const pod of world.pods) {
      // Peas stay hidden inside the pod until the seam opens.
      if (!pod.split) continue;
      for (const p of pod.peas) {
        if (p.out) continue;
        centre(pod, p.u, cTmp);
        const R = POD.R * profile(p.u);
        // Peas hide inside the pod until the seam opens.
        const y = R * 1.0 + pod.drop + 0.03 * Math.sin(p.hue * 9);
        put(cTmp[0], y, cTmp[1], p.r, p.q, 0.95, p.hue);
      }
    }
    for (const p of world.peas) put(p.x, p.y, p.z, p.r, p.q, p.sq, p.hue);
    peas.count = n;
    peas.instanceMatrix.needsUpdate = true;
    peas.instanceColor.needsUpdate = true;
    // Mist.
    let d = 0;
    for (const m of world.drops) {
      if (d >= DMAX) break;
      dPos.array[d * 3] = m.x; dPos.array[d * 3 + 1] = m.y; dPos.array[d * 3 + 2] = m.z;
      const k = m.age / m.life;
      dAlpha.array[d] = (1 - k) * Math.min(1, m.age * 30) * (m.s / 0.05);
      d++;
    }
    dGeo.setDrawRange(0, d);
    dPos.needsUpdate = true; dAlpha.needsUpdate = true;
  }

  function render(grain = 0, fade = 1) {
    grade.uniforms.uSeed.value = grain;
    grade.uniforms.uFade.value = fade;
    // The glow needs the key's direction in view space.
    keyDir.copy(key.position).sub(key.target.position).normalize().transformDirection(camera.matrixWorldInverse);
    keyView.value.copy(keyDir);
    composer.render();
  }
  async function warm() { await renderer.compileAsync(scene, camera); }
  function dispose() {
    for (const p of [...podViews.keys()]) dropPod(p);
    for (const d of disposables) d.dispose?.();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, scene, camera, frame, resize, pick, toScreen, update, render, warm, dispose, bloom };
}

/* ---------- the valve shell ---------- */
// One buffer per valve: outer skin, inner lining, and the two cut rims.
function valveGeometry() {
  const nOut = NU * NV, nRim = NU * 2;
  const total = nOut * 2 + nRim * 2;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  const idx = [];
  const grid = (base, flip) => {
    for (let i = 0; i < NU - 1; i++) for (let j = 0; j < NV - 1; j++) {
      const a = base + i * NV + j, b = a + NV, c = a + 1, d = b + 1;
      if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
  };
  grid(0, false);
  const skinCount = idx.length;
  grid(nOut, true);
  // Rims: two rows each (outer edge, inner edge) along the pod.
  for (let r = 0; r < 2; r++) {
    const base = nOut * 2 + r * nRim;
    for (let i = 0; i < NU - 1; i++) {
      const a = base + i * 2, b = a + 2, c = a + 1, d = b + 1;
      if (r) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  }
  geo.setIndex(idx);
  geo.addGroup(0, skinCount, 0);
  geo.addGroup(skinCount, idx.length - skinCount, 1);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  return geo;
}

const lift = new Float32Array(NU);
const cBuf = new Float32Array(NU * 4);
const ry = new Float32Array(NU), ryT = new Float32Array(NU), rz = new Float32Array(NU), r0 = new Float32Array(NU), pale = new Float32Array(NU);
const cTmp2 = [0, 0, 0, 0];
const PHI = Array.from({ length: NV }, (_, j) => -Math.PI / 2 + (Math.PI * j) / (NV - 1));

function buildValves(pod, v) {
  // A key of the inputs skips the rebuild when nothing moved.
  const k = [pod.pinch, pod.drop, pod.open[0].a, pod.open[1].a, pod.twist, pod.curl, pod.cL, pod.cR, pod.press].map(x => x.toFixed(4)).join();
  if (k === v.key) return;
  v.key = k;
  const R = POD.R;
  const g0 = pod.du;
  for (let i = 0; i < NU; i++) {
    const u = i / (NU - 1);
    centre(pod, u, cTmp2);
    cBuf[i * 4] = cTmp2[0]; cBuf[i * 4 + 1] = cTmp2[1]; cBuf[i * 4 + 2] = cTmp2[2]; cBuf[i * 4 + 3] = cTmp2[3];
    const pr = profile(u);
    const b = bumps(pod, u);
    const r = R * pr * (0.86 + 0.16 * Math.min(1.2, b));
    // The squeeze pinches the sides and pushes the seam up.
    const d = (u - g0) * POD.L / 1.7;
    const g = Math.exp(-d * d) * clamp(pod.pinch, -0.3, 1.3);
    const swell = 1 + 0.05 * clamp(pod.pinch) * (1 - Math.exp(-d * d));
    r0[i] = r;
    // The thumb presses the seam down; the sides bulge out.
    rz[i] = r * 0.9 * (1 + 0.2 * g) * swell;
    ry[i] = r * swell;
    ryT[i] = r * (1 - 0.42 * g) * swell;
    // The seam pales under strain, most near the dent.
    pale[i] = pod.split ? 0 : clamp(pod.press) ** 2 * (0.4 + 0.6 * Math.exp(-d * d * 0.3));
  }
  for (const m of v.valves) {
    const s = m.userData.side;
    const o = pod.open[s > 0 ? 1 : 0];
    const S = m.userData.S ||= new Float32Array(NU * NV * 4);
    // First pass: the section points before the lift.
    for (let i = 0; i < NU; i++) {
      const u = i / (NU - 1);
      const op = openAt(pod, u);
      const a = (o.a + pod.twist * (2 * u - 1) * s * 0.9) * op;
      const ca = Math.cos(a), sa = Math.sin(a);
      let low = 0;
      for (let j = 0; j < NV; j++) {
        const ph = PHI[j];
        // A keel runs along each seam.
        const keel = r0[i] * 0.09 * (Math.exp(-(((ph - Math.PI / 2) / 0.28) ** 2)) + 0.6 * Math.exp(-(((ph + Math.PI / 2) / 0.3) ** 2)));
        const za = s * (rz[i] + keel * 0.2) * Math.cos(ph);
        const yb = ry[i] + ((ph > 0 ? ryT[i] : ry[i]) + keel) * Math.sin(ph);
        const A = s > 0 ? za * ca + yb * sa : za * ca - yb * sa;
        const B = s > 0 ? -za * sa + yb * ca : za * sa + yb * ca;
        const q = (i * NV + j) * 4;
        S[q] = A; S[q + 1] = B; S[q + 2] = Math.cos(ph); S[q + 3] = Math.sin(ph);
        low = Math.min(low, B);
      }
      lift[i] = -low;
    }
    m.userData.lift = Float32Array.from(lift);
  }
  // Both valves share the hinge, so the lift is the larger of the two, smoothed.
  const L0 = v.valves[0].userData.lift, L1 = v.valves[1].userData.lift;
  for (let i = 0; i < NU; i++) lift[i] = Math.max(L0[i], L1[i]);
  for (let pass = 0; pass < 6; pass++) for (let i = 1; i < NU - 1; i++) lift[i] = Math.max(lift[i], (lift[i - 1] + lift[i + 1]) / 2 * 0.98);

  for (const m of v.valves) writeValve(pod, m, v);
}

function writeValve(pod, m, v) {
  const s = m.userData.side;
  const o = pod.open[s > 0 ? 1 : 0];
  const geo = m.geometry;
  const S = m.userData.S;
  const P = geo.attributes.position.array, C = geo.attributes.color.array;
  const nOut = NU * NV;
  const wall = POD.wall;
  for (let i = 0; i < NU; i++) {
    const u = i / (NU - 1);
    const op = openAt(pod, u);
    const a = (o.a + pod.twist * (2 * u - 1) * s * 0.9) * op;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cx = cBuf[i * 4], cz = cBuf[i * 4 + 1], nx = cBuf[i * 4 + 2], nz = cBuf[i * 4 + 3];
    const up = lift[i] + pod.drop + pod.curl * (2 * u - 1) ** 2 * op;
    const t = Math.min(wall, r0[i] * 0.45);
    for (let j = 0; j < NV; j++) {
      const q = (i * NV + j) * 4;
      const A = S[q], B = S[q + 1];
      // The lining sits a wall's width inside the skin.
      const zi = s * (rz[i] - t) * S[q + 2], yi = ry[i] + ((S[q + 3] > 0 ? ryT[i] : ry[i]) - t) * S[q + 3];
      const Ai = s > 0 ? zi * ca + yi * sa : zi * ca - yi * sa;
      const Bi = s > 0 ? -zi * sa + yi * ca : zi * sa + yi * ca;
      const po = (i * NV + j) * 3, pi = (nOut + i * NV + j) * 3;
      P[po] = cx + nx * A; P[po + 1] = B + up; P[po + 2] = cz + nz * A;
      P[pi] = cx + nx * Ai; P[pi + 1] = Bi + up; P[pi + 2] = cz + nz * Ai;
      // Skin: deeper green toward the back seam, pale at the front seam.
      const ph = PHI[j];
      const front = Math.exp(-(((ph - Math.PI / 2) / 0.22) ** 2));
      const back = 0.5 - 0.5 * Math.sin(ph);
      for (let c = 0; c < 3; c++) {
        let col = lerp(COL.pod[c], COL.podDeep[c], back * 0.55);
        col = lerp(col, COL.seam[c], front * (0.35 + 0.65 * pale[i]));
        C[po + c] = col;
        C[pi + c] = COL.lining[c] * (0.85 + 0.15 * S[q + 2]);
      }
    }
  }
  // Rims join skin to lining along both edges of the valve.
  for (let r = 0; r < 2; r++) {
    const j = r ? NV - 1 : 0;
    const base = (nOut * 2 + r * NU * 2) * 3;
    for (let i = 0; i < NU; i++) {
      const so = (i * NV + j) * 3, si = (nOut + i * NV + j) * 3;
      const d = base + i * 6;
      for (let c = 0; c < 3; c++) {
        P[d + c] = P[so + c]; P[d + 3 + c] = P[si + c];
        C[d + c] = COL.lining[c] * 1.1; C[d + 3 + c] = COL.lining[c] * 1.1;
      }
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  geo.computeVertexNormals();
}

/* ---------- calyx and stalk ---------- */
// Five sepals hug the stem end; a short stalk curls away.
function calyxMesh(mat) {
  const g = new THREE.Group();
  const sepal = new THREE.SphereGeometry(1, 14, 8);
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(sepal, mat);
    const a = (i / 5) * Math.PI * 2 + 0.3;
    m.scale.set(0.95, 0.045, 0.2);
    // Each sepal lies along the pod and leans out a little.
    const holder = new THREE.Group();
    holder.rotation.x = a;
    m.position.set(0.62, 0.3, 0);
    m.rotation.z = -0.32;
    holder.add(m);
    m.castShadow = true;
    g.add(holder);
  }
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0, 0), new THREE.Vector3(-0.6, 0.05, 0.05), new THREE.Vector3(-1.3, 0.25, 0.25), new THREE.Vector3(-1.75, 0.5, 0.55),
  ]);
  const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.075, 8, false), mat);
  stalk.castShadow = true;
  g.add(stalk);
  return g;
}
function placeCalyx(pod, c) {
  centre(pod, 0.02, cTmp2);
  c.position.set(cTmp2[0], POD.R * 0.32 + pod.drop, cTmp2[1]);
  // The calyx points along the pod, from the stem end.
  c.rotation.set(0, -Math.atan2(cTmp2[3], -cTmp2[2]) + Math.PI / 2, 0);
}

/* ---------- table ---------- */
// Dark oiled wood with a faint grain along the pan.
function woodTexture() {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#382b22';
  g.fillRect(0, 0, W, H);
  let seed = 9;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Broad soft bands, then fine streaks.
  for (let i = 0; i < 40; i++) {
    const y = rnd() * H, h = 8 + rnd() * 50;
    g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${0.06 + rnd() * 0.08})` : `rgba(90,70,55,${0.04 + rnd() * 0.06})`;
    g.fillRect(0, y, W, h);
  }
  for (let i = 0; i < 900; i++) {
    const y = rnd() * H, x = rnd() * W, len = 60 + rnd() * 500;
    g.strokeStyle = rnd() < 0.6 ? `rgba(0,0,0,${0.05 + rnd() * 0.12})` : `rgba(120,95,70,${0.03 + rnd() * 0.06})`;
    g.lineWidth = 0.5 + rnd() * 1.5;
    g.beginPath();
    g.moveTo(x, y);
    const wob = (rnd() - 0.5) * 6;
    g.bezierCurveTo(x + len / 3, y + wob, x + (2 * len) / 3, y - wob, x + len, y + wob * 0.5);
    g.stroke();
    // Wrap the streak so the texture tiles.
    if (x + len > W) { g.save(); g.translate(-W, 0); g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len / 3, y + wob, x + (2 * len) / 3, y - wob, x + len, y + wob * 0.5); g.stroke(); g.restore(); }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}
