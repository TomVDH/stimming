// Wave machine: the three.js scene. A torsion wave machine on a black lab bench.
// The wire runs along +x from the near rod; rods lie along z at rest.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { M } from './sim.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const N = M.n, HALF = M.len / 2, SPAN = (N - 1) * M.gap;
const RIB = 4;                 // ribbon sections per rod gap

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
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0, 0);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
  const disposables = [];
  const keep = x => (disposables.push(x), x);

  // A dim room gives the chrome and the brass something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = keep(new RoomEnvironment());
  const env = keep(pmrem.fromScene(room, 0.04).texture);
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.07;

  /* ---------- light ---------- */
  // One warm lamp hangs behind the middle; its pool fades at the ends.
  const key = new THREE.SpotLight(new THREE.Color(1.0, 0.8, 0.58), 7.5, 0, 0.62, 1, 2);
  key.position.set(0.9, 1.55, -0.62);
  key.target.position.set(0.82, 0, 0.12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.8;
  key.shadow.camera.far = 4;
  key.shadow.bias = -0.0001;
  key.shadow.normalBias = 0.002;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  // Haze in the lamp's beam: a faint additive cone.
  const beamLen = key.position.distanceTo(key.target.position) * 1.05;
  const beamGeo = keep(new THREE.CylinderGeometry(0.03, Math.tan(key.angle) * beamLen * 0.82, beamLen, 40, 1, true).translate(0, -beamLen / 2, 0));
  const beamMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uLen: { value: beamLen }, uA: { value: 0.05 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH;
      uniform float uLen;
      void main() {
        vH = -position.y / uLen;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; varying float vH; uniform float uA;
      void main() {
        // Thick in the middle of the beam, thin at its edge.
        float f = pow(abs(dot(normalize(vN), normalize(vV))), 4.0);
        float a = uA * f * smoothstep(0.0, 0.25, vH) * (1.0 - smoothstep(0.55, 1.0, vH));
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.52) * a, 1.0);
      }`,
  }));
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.copy(key.position);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), key.target.position.clone().sub(key.position).normalize());
  beam.renderOrder = 2;
  scene.add(beam);
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.45, 0.48, 0.56), new THREE.Color(0.03, 0.025, 0.02), 0.22);
  scene.add(hemi);
  // A cool rim from the front right draws the near rod ends.
  const fill = new THREE.DirectionalLight(new THREE.Color(0.6, 0.7, 1.0), 0.28);
  fill.position.set(2.4, 0.9, 2.2);
  scene.add(fill);

  /* ---------- bench ---------- */
  // Black epoxy lab bench: a soft sheen and faint wipe marks.
  const benchMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.012, 0.012, 0.013), roughness: 0.42, metalness: 0 }));
  benchMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vB;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvB = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vB;' + NOISE)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + 0.16 * (vn(vB * vec2(3.0, 9.0)) - 0.5) + 0.1 * vn(vB * 40.0), 0.2, 0.9);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.85 + 0.3 * vn(vB * 1.7);`);
  };
  const bench = new THREE.Mesh(keep(new THREE.PlaneGeometry(14, 14)), benchMat);
  bench.rotation.x = -Math.PI / 2;
  bench.position.set(SPAN / 2, 0, 0);
  bench.receiveShadow = true;
  scene.add(bench);

  /* ---------- frame ---------- */
  // Dark anodised rail, posts and end stands.
  const anod = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.03, 0.03, 0.032), metalness: 0.6, roughness: 0.48 }));
  const steelDark = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.2, 0.2, 0.21), metalness: 1, roughness: 0.38 }));
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const railH = 0.028;
  box(SPAN + 0.2, railH, 0.05, anod, SPAN / 2, railH / 2, 0);
  // Feet under the rail ends.
  box(0.05, 0.008, 0.2, anod, -0.06, 0.004, 0);
  box(0.05, 0.008, 0.2, anod, SPAN + 0.06, 0.004, 0);
  // Posts hold the wire in small bearings.
  const postX = [-0.03];
  for (let i = 16; i < N - 8; i += 16) postX.push((i - 0.5) * M.gap);
  for (const x of postX) {
    box(0.006, M.wireY - railH - 0.004, 0.012, anod, x, railH + (M.wireY - railH - 0.004) / 2, 0);
    box(0.01, 0.014, 0.016, steelDark, x, M.wireY, 0);
  }
  // The far stand and its clamp, which holds the last rod.
  const fx = SPAN;
  box(0.03, M.wireY + 0.02, 0.05, anod, fx + 0.03, (M.wireY + 0.02) / 2 + railH / 2, 0);
  box(0.026, 0.032, 0.05, steelDark, fx, M.wireY, 0);
  box(0.012, 0.012, 0.012, steelDark, fx, M.wireY + 0.024, 0);

  /* ---------- rods and weights ---------- */
  const chrome = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.78, 0.79, 0.8), metalness: 1, roughness: 0.2 }));
  const brass = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.86, 0.6, 0.28), metalness: 1, roughness: 0.3 }));
  const rodGeo = keep(new THREE.CylinderGeometry(M.rod, M.rod, M.len, 10).rotateX(Math.PI / 2));
  const capGeo = keep(new THREE.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2));
  const rods = new THREE.InstancedMesh(rodGeo, chrome, N);
  const caps = new THREE.InstancedMesh(capGeo, brass, N * 2);
  rods.castShadow = caps.castShadow = true;
  rods.receiveShadow = caps.receiveShadow = true;
  rods.frustumCulled = caps.frustumCulled = false;
  rods.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(rods, caps);
  // A held rod glows a little warmer: the answer within one frame.
  const tint = new Float32Array(N * 3).fill(1);
  rods.instanceColor = new THREE.InstancedBufferAttribute(tint, 3);
  rods.instanceColor.setUsage(THREE.DynamicDrawUsage);

  /* ---------- wire ---------- */
  // A flat steel band. Its twist shows in the moving highlight.
  const ribN = (N - 1) * RIB + 1 + 2;
  const ribPos = new Float32Array(ribN * 2 * 3), ribNor = new Float32Array(ribN * 2 * 3);
  const ribIdx = [];
  for (let s = 0; s < ribN - 1; s++) {
    const a = s * 2, b = a + 1, c = a + 2, d = a + 3;
    ribIdx.push(a, c, b, b, c, d);
  }
  const ribGeo = keep(new THREE.BufferGeometry());
  ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3).setUsage(THREE.DynamicDrawUsage));
  ribGeo.setAttribute('normal', new THREE.BufferAttribute(ribNor, 3).setUsage(THREE.DynamicDrawUsage));
  ribGeo.setIndex(ribIdx);
  const wireMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.7, 0.7, 0.72), metalness: 1, roughness: 0.22, side: THREE.DoubleSide }));
  const wire = new THREE.Mesh(ribGeo, wireMat);
  wire.frustumCulled = false;
  wire.castShadow = true;
  scene.add(wire);
  const BAND = 0.0022;

  function writeWire(th) {
    let v = 0;
    const put = (x, a) => {
      // The band's width lies across the rod: along y at rest.
      const c = Math.cos(a), s = Math.sin(a);
      const wy = c * BAND, wz = -s * BAND;
      const ny = s, nz = c;
      ribPos[v] = x; ribPos[v + 1] = M.wireY - wy; ribPos[v + 2] = -wz;
      ribPos[v + 3] = x; ribPos[v + 4] = M.wireY + wy; ribPos[v + 5] = wz;
      ribNor[v] = 0; ribNor[v + 1] = ny; ribNor[v + 2] = nz;
      ribNor[v + 3] = 0; ribNor[v + 4] = ny; ribNor[v + 5] = nz;
      v += 6;
    };
    put(-0.03, th[0]);
    for (let i = 0; i < N - 1; i++) {
      for (let k = 0; k < RIB; k++) put((i + k / RIB) * M.gap, th[i] + (th[i + 1] - th[i]) * (k / RIB));
    }
    put(SPAN, 0);
    put(SPAN + 0.02, 0);
    ribGeo.attributes.position.needsUpdate = true;
    ribGeo.attributes.normal.needsUpdate = true;
  }

  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), ax = new THREE.Vector3(1, 0, 0);
  const pos = new THREE.Vector3(), scl = new THREE.Vector3(1, 1, 1), one = new THREE.Vector3(1, 1, 1);
  let capR = 0.006, capL = 0.022;
  function setWeights(w) {
    capR = 0.0042 + 0.0036 * w;
    capL = 0.014 + 0.018 * w;
  }
  setWeights(0.5);

  function writeRods(L, held) {
    for (let i = 0; i < N; i++) {
      const a = L.th[i];
      q.setFromAxisAngle(ax, -a);
      pos.set(i * M.gap, M.wireY, 0);
      mtx.compose(pos, q, one);
      rods.setMatrixAt(i, mtx);
      const cy = Math.sin(a), cz = Math.cos(a), r = HALF - capL / 2;
      scl.set(capR, capR, capL);
      pos.set(i * M.gap, M.wireY + cy * r, cz * r);
      mtx.compose(pos, q, scl);
      caps.setMatrixAt(i * 2, mtx);
      pos.set(i * M.gap, M.wireY - cy * r, -cz * r);
      mtx.compose(pos, q, scl);
      caps.setMatrixAt(i * 2 + 1, mtx);
      const t = i === held ? 1.35 : 1;
      tint[i * 3] = t; tint[i * 3 + 1] = t * 0.97; tint[i * 3 + 2] = t * 0.9;
    }
    rods.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    rods.instanceColor.needsUpdate = true;
  }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.2, 0.3, 0.94);
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
        c *= 1.0 - 0.55 * smoothstep(0.35, 1.15, length(q));
        c += (h(vUv * 913.0) - 0.5) * 0.012;
        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }`,
  });
  composer.addPass(grade);

  /* ---------- shot ---------- */
  const look = new THREE.Vector3();
  let aspect = 1;
  // Wide: a high three-quarter view from the near end, front left.
  // Tall: the line runs away up the frame.
  function frame(w, h, cov = 0) {
    aspect = w / h;
    const tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 50 : 26;
    if (tall) {
      camera.position.set(-0.95, 1.12, 0.2);
      look.set(0.86, 0.02, 0);
    } else {
      camera.position.set(-0.62, 1.12, 1.72);
      look.set(0.8, 0.1, -0.04);
    }
    // Pull back a little on a narrow wide stage.
    const back = tall ? 1 : clamp(1.75 / aspect, 1, 1.35);
    camera.position.sub(look).multiplyScalar(back).add(look);
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
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), sp = new THREE.Vector3();
  const toScreen = (x, y, z) => { sp.set(x, y, z).project(camera); return [(sp.x + 1) / 2, (1 - sp.y) / 2]; };
  // The rod nearest the pointer on screen, and the pointer's distance in pixels.
  function pickRod(L, nx, ny, w, h) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < N - 1; i++) {
      const a = L.th[i], y = Math.sin(a) * HALF, z = Math.cos(a) * HALF;
      const [x0, y0] = toScreen(i * M.gap, M.wireY + y, z);
      const [x1, y1] = toScreen(i * M.gap, M.wireY - y, -z);
      const ex = (x1 - x0) * w, ey = (y1 - y0) * h, px = (nx - x0) * w, py = (ny - y0) * h;
      const t = clamp((px * ex + py * ey) / (ex * ex + ey * ey + 1e-9));
      const d = Math.hypot(px - ex * t, py - ey * t);
      if (d < bd) { bd = d; best = i; }
    }
    return { i: best, d: bd };
  }
  // The pointer's angle about the wire, on the turning plane of rod i.
  function angleAt(i, nx, ny) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    plane.constant = -i * M.gap;
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return Math.atan2(hit.y - M.wireY, hit.z);
  }
  // Screen place of rod i's near end, 0 to 1, for a test script.
  const tipAt = (L, i, f = 0.9) => toScreen(i * M.gap, M.wireY + Math.sin(L.th[i]) * HALF * f, Math.cos(L.th[i]) * HALF * f);
  // Screen x of a point along the line, 0 to 1, for sound pan.
  const screenX = u => toScreen(u * SPAN, M.wireY, 0)[0];

  /* ---------- sync ---------- */
  function update(L, held = -1) {
    writeRods(L, held);
    writeWire(L.th);
  }
  function render(grain = 0) {
    grade.uniforms.uSeed.value = grain;
    composer.render();
  }
  async function warm(L) { update(L); await renderer.compileAsync(scene, camera); }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    rods.dispose(); caps.dispose();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, scene, camera, frame, resize, pickRod, angleAt, screenX, tipAt, setWeights, update, render, warm, dispose };
}
