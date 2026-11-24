// Superconductor track: the three.js scene. A magnet ring on a dark lab bench.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TRACK, TOP, PUCK, pose, frost } from './sim.js';
import { createVapour } from './vapour.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const TAU = Math.PI * 2;

// One cool lamp hangs over the bench, up and to the left.
export const LAMP = new THREE.Vector3(-0.42, 0.95, -0.12);
const LAMP_COL = new THREE.Color(0.93, 0.96, 1.0);
const ROOM = new THREE.Color(0.006, 0.007, 0.01);

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
  scene.background = ROOM;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 20);
  const disposables = [];
  const keep = x => (disposables.push(x), x);

  /* ---------- room reflections ---------- */
  // A dark room with one bright lamp panel: the nickel and the film reflect it.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.012, 0.013, 0.018);
  const panelMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6.3, 6.8), side: THREE.DoubleSide }));
  const panel = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.9, 0.5)), panelMat);
  panel.position.copy(LAMP).normalize().multiplyScalar(3);
  panel.lookAt(0, 0, 0);
  room.add(panel);
  // A faint strip of far wall light, for a long soft glint on the steel.
  const stripMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.035, 0.042, 0.06), side: THREE.DoubleSide }));
  const strip = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 0.5)), stripMat);
  strip.position.set(0, 0.6, -3.5);
  room.add(strip);
  const envRT = pmrem.fromScene(room, 0.02);
  keep(envRT);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.3;
  pmrem.dispose();

  /* ---------- light ---------- */
  const lamp = new THREE.SpotLight(LAMP_COL, 5.5, 0, 0.44, 0.9, 2);
  lamp.position.copy(LAMP);
  lamp.target.position.set(0.02, 0, 0.04);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.camera.near = 0.3;
  lamp.shadow.camera.far = 2.4;
  lamp.shadow.bias = -0.00012;
  lamp.shadow.normalBias = 0.0015;
  lamp.shadow.radius = 3;
  scene.add(lamp, lamp.target);
  // A cold fill from behind edges the puck and the fog.
  const back = new THREE.DirectionalLight(new THREE.Color(0.45, 0.62, 1.0), 0.35);
  back.position.set(0.5, 0.4, -1);
  scene.add(back);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.2, 0.24, 0.34), new THREE.Color(0.02, 0.02, 0.025), 0.12));

  /* ---------- bench ---------- */
  // Black epoxy resin: a soft sheen, smudges and fine wear.
  const benchMat = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.012, 0.013, 0.016), roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.35 }));
  benchMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vB;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvB = vec3(position.x, 0.0, -position.y);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vB;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.85 + 0.3 * vn(vB * 7.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          // Wipe marks and a fine wear of long scratches.
          float smudge = vn(vB * 5.0 + 3.0) * 0.6 + vn(vB * 17.0) * 0.4;
          float scr = smoothstep(0.9, 0.97, vn(vB * vec3(90.0, 1.0, 3.0) + 2.0));
          roughnessFactor = clamp(0.42 + 0.3 * smudge - scr * 0.12, 0.08, 1.0);
        }`);
  };
  const bench = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 6)), benchMat);
  bench.rotation.x = -Math.PI / 2;
  bench.receiveShadow = true;
  scene.add(bench);

  /* ---------- track ---------- */
  // A low ring base of black anodised aluminium.
  const ringProfile = (r0, r1, y0, y1, b) => [
    new THREE.Vector2(r0, y0), new THREE.Vector2(r0, y1 - b), new THREE.Vector2(r0 + b, y1),
    new THREE.Vector2(r1 - b, y1), new THREE.Vector2(r1, y1 - b), new THREE.Vector2(r1, y0),
  ];
  const baseMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.018, 0.019, 0.022), metalness: 0.4, roughness: 0.62 }));
  const baseG = keep(new THREE.LatheGeometry(ringProfile(TRACK.r - TRACK.baseW / 2, TRACK.r + TRACK.baseW / 2, 0, TRACK.base, 0.0012).reverse(), 160));
  const base = new THREE.Mesh(baseG, baseMat);
  base.castShadow = true; base.receiveShadow = true;
  scene.add(base);
  // The steel strip between the magnet rows.
  const steelMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.42, 0.42, 0.43), metalness: 1, roughness: 0.42 }));
  const steelG = keep(new THREE.LatheGeometry(ringProfile(TRACK.r - 0.002, TRACK.r + 0.002, TRACK.base, TOP - 0.0006, 0.0004).reverse(), 200));
  const steel = new THREE.Mesh(steelG, steelMat);
  steel.receiveShadow = true;
  scene.add(steel);
  // Nickel-plated magnet blocks, two rows; each block has its own small tilt and shine.
  const PER = 56, MW = (TRACK.width - 0.004) / 2;
  const nickelMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.74, 0.72, 0.68), metalness: 1, roughness: 0.24 }));
  nickelMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vN; varying float vSeed;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vN = position; vSeed = instanceMatrix[3].x * 37.0 + instanceMatrix[3].z * 91.0;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vN; varying float vSeed;' + NOISE)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        // Plating: a faint lengthwise polish.
        roughnessFactor = clamp(0.26 + 0.06 * vn(vN * vec3(80.0, 2.0, 2.0) + vSeed), 0.05, 1.0);`);
  };
  const magG = keep(new RoundedBoxGeometry(1, 1, 1, 2, 0.08));
  // The block length leaves a hairline joint between blocks.
  const blockLen = r => TAU * r / PER - 0.0005;
  const mags = new THREE.InstancedMesh(magG, nickelMat, PER * 2);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  let k = 0;
  for (const side of [-1, 1]) {
    const r = TRACK.r + side * (0.002 + MW / 2);
    for (let i = 0; i < PER; i++) {
      const a = (i + (side > 0 ? 0.5 : 0)) / PER * TAU;
      q4.setFromAxisAngle(Y, -a + Math.PI / 2);
      m4.compose(v3.set(Math.cos(a) * r, TRACK.base + TRACK.mag / 2, Math.sin(a) * r), q4, s3.set(blockLen(r), TRACK.mag, MW - 0.0003));
      mags.setMatrixAt(k++, m4);
    }
  }
  mags.castShadow = true; mags.receiveShadow = true;
  scene.add(mags);

  /* ---------- puck ---------- */
  // A disc with a rounded rim; the frost lives in its shader.
  const R = PUCK.r, T = PUCK.t;
  const prof = [new THREE.Vector2(0, -T / 2)];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + i / 12 * Math.PI;
    prof.push(new THREE.Vector2(R - T / 2 + Math.cos(a) * T / 2, Math.sin(a) * T / 2));
  }
  prof.push(new THREE.Vector2(R * 0.7, T / 2), new THREE.Vector2(R * 0.35, T / 2), new THREE.Vector2(0, T / 2));
  const puckG = keep(new THREE.LatheGeometry(prof, 128));
  const frostU = { value: 1 }, wetU = { value: 0 };
  const puckMat = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.035, 0.036, 0.042), metalness: 0.15, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 }));
  puckMat.onBeforeCompile = sh => {
    sh.uniforms.uFrost = frostU; sh.uniforms.uWet = wetU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP; uniform float uFrost;' + NOISE)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vP = position;
        {
          // Rime grows out from the rim in ragged feathers.
          float rr = length(position.xz);
          float rim = smoothstep(${(R - T).toFixed(4)}, ${R.toFixed(4)}, rr);
          float n = vn(position * 900.0) * 0.7 + vn(position * 2600.0) * 0.3;
          transformed += vec3(position.x / max(rr, 1e-4), 0.0, position.z / max(rr, 1e-4)) * rim * n * 0.0013 * uFrost;
          transformed.y += sign(position.y) * n * 0.0006 * uFrost * (0.4 + rim);
        }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vP; uniform float uFrost; uniform float uWet; float vCov = 0.0;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // Frost: thick on the rim, patchy on the face, thinning with warmth.
          float rr = length(vP.xz) / ${R.toFixed(4)};
          float n = vn(vP * 300.0) * 0.55 + vn(vP * 1100.0) * 0.3 + vn(vP * 3500.0) * 0.15;
          float bias = 0.55 * smoothstep(0.72, 0.98, rr) - 0.1;
          // Thick crust in drifts, and a thin dusting of rime between them.
          float crust = smoothstep(0.0, 0.2, uFrost * 0.95 - (1.0 - n) * 1.35 + bias - (1.0 - uFrost) * 0.3);
          float dust = smoothstep(0.1, 0.7, uFrost * (0.5 + 0.5 * vn(vP * 650.0) + 0.15 * vn(vP * 2000.0)) - (1.0 - n) * 0.25);
          vCov = max(crust, dust * 0.62);
          // Under the frost: the film over the dark disc, a faint gold of the coat.
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.05, 0.035), smoothstep(0.4, 0.9, vn(vP * 140.0)) * 0.5);
          vec3 ice = mix(vec3(0.42, 0.47, 0.54), vec3(0.74, 0.77, 0.82), n);
          diffuseColor.rgb = mix(diffuseColor.rgb, ice, vCov);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          // The film crinkles; a wet film is glassy.
          float cr = vn(vP * vec3(420.0, 60.0, 420.0));
          roughnessFactor = mix(0.16 + 0.22 * cr, 0.06, uWet);
          roughnessFactor = mix(roughnessFactor, 0.85, vCov);
        }`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.clearcoat *= 1.0 - vCov;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // Glints: a few ice facets catch the lamp as the puck moves.
          vec3 cell = floor(vP * 2400.0);
          float g = hh(cell + 3.1);
          float face = hh(cell + floor(dot(normalize(vViewPosition), vec3(0.7, 0.5, 0.3)) * 24.0));
          totalEmissiveRadiance += vec3(0.9, 0.95, 1.0) * vCov * step(0.985, g) * step(0.7, face) * 2.4;
        }`);
  };
  const puck = new THREE.Mesh(puckG, puckMat);
  puck.castShadow = true; puck.receiveShadow = true;
  scene.add(puck);

  /* ---------- pour ---------- */
  // A thin stream of liquid nitrogen falls from above the frame.
  const streamU = { uT: { value: 0 }, uOn: { value: 0 } };
  const streamMat = keep(new THREE.ShaderMaterial({
    uniforms: streamU,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uT; uniform float uOn; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      float h1(float x) { return fract(sin(x * 91.7) * 43758.5); }
      void main() {
        // A glassy rope: bright edges, a clear core, ripples that run down.
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float rip = 0.6 + 0.4 * sin(vUv.y * 180.0 + uT * 40.0) * sin(vUv.y * 67.0 - uT * 23.0 + vUv.x * 6.28);
        float a = (0.18 + 0.82 * f) * rip * uOn;
        gl_FragColor = vec4(vec3(0.85, 0.92, 1.0) * (0.6 + 1.6 * f), a);
      }`,
    transparent: true, depthWrite: false,
  }));
  const streamG = keep(new THREE.CylinderGeometry(0.0022, 0.0034, 1, 14, 1, true).translate(0, 0.5, 0));
  const stream = new THREE.Mesh(streamG, streamMat);
  stream.visible = false;
  stream.renderOrder = 2;
  scene.add(stream);
  // Beads of liquid nitrogen: clear, glassy, small.
  const beadMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.55, 0.6, 0.66), roughness: 0.04, metalness: 0.4, envMapIntensity: 2.2 }));
  const beads = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 10, 8)), beadMat, 48);
  beads.count = 0;
  beads.frustumCulled = false;
  scene.add(beads);

  /* ---------- fog ---------- */
  const vapour = createVapour(renderer, { lamp: LAMP, lampCol: LAMP_COL, keep });

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(vapour.pass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.55, 0.86);
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
  const look = new THREE.Vector3();
  // The camera stands in front of the ring, 28 degrees over the bench.
  function frame(w, h, cov = 0) {
    const aspect = w / h;
    const tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 34 : 30;
    // A tall frame looks down more steeply, so the ring fills more of it.
    const el = (tall ? 46 : 22) * Math.PI / 180;
    // Stand back until the ring and the puck's overhang fit the width.
    const span = tall ? 0.45 : 0.46;
    const hf = Math.tan(camera.fov * Math.PI / 360);
    const dist = Math.max(span / 2 / (hf * Math.min(aspect, 1.7)) * (tall ? 1.0 : 1.08), tall ? 0.6 : 0.5);
    look.set(0, 0.006, tall ? 0.01 : 0.018);
    camera.position.set(look.x, look.y + Math.sin(el) * dist, look.z + Math.cos(el) * dist);
    camera.lookAt(look);
    camera.setViewOffset(w, h, 0, (cov * h) / 2, w, h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    grade.uniforms.uAspect.value = aspect;
  }

  function resize(w, h, dpr, { bloomScale = 0.5, samples = 4, shadow = 2048, fogScale = 0.5 } = {}) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    // renderTarget1 holds the scene with MSAA; the passes use the plain one.
    const ms = composer.renderTarget1, plain = composer.renderTarget2;
    if (ms.samples !== samples) { ms.samples = samples; ms.dispose(); }
    if (plain.samples !== 0) { plain.samples = 0; plain.dispose(); }
    bloom.setSize(Math.round(w * dpr * bloomScale), Math.round(h * dpr * bloomScale));
    vapour.resize(Math.round(w * dpr * fogScale), Math.round(h * dpr * fogScale));
    if (lamp.shadow.mapSize.x !== shadow) {
      lamp.shadow.mapSize.set(shadow, shadow);
      lamp.shadow.map?.dispose();
      lamp.shadow.map = null;
    }
  }

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  // The pointer on the level plane at height y.
  function pick(nx, ny, y) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    plane.constant = -y;
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  const sp = new THREE.Vector3();
  function toScreen(x, y, z) {
    sp.set(x, y, z).project(camera);
    return [(sp.x + 1) / 2, (1 - sp.y) / 2];
  }
  // Metres per stage pixel at a point.
  function mPerPx(x, y, z, hpx) {
    const d = camera.position.distanceTo(sp.set(x, y, z));
    return d * 2 * Math.tan(camera.fov * Math.PI / 360) / hpx;
  }
  // The camera's level view direction, for tilt from a sideways drag.
  const fwd = new THREE.Vector3();
  function viewDir() { camera.getWorldDirection(fwd); fwd.y = 0; return fwd.normalize(); }

  /* ---------- sync ---------- */
  const frameQ = new THREE.Quaternion(), tilt = new THREE.Quaternion(), e3 = new THREE.Euler();
  const basis = new THREE.Matrix4(), tg = new THREE.Vector3(), rd = new THREE.Vector3(), zl = new THREE.Vector3();
  function update(s, dt = 0) {
    const p = pose(s);
    // The puck's frame: x along the loop, y up, z toward the ring's centre.
    tg.set(-p.n, 0, p.c); rd.set(-p.c, 0, -p.n);
    basis.makeBasis(tg, Y, zl.copy(rd));
    frameQ.setFromRotationMatrix(basis);
    tilt.setFromEuler(e3.set(s.rx, 0, s.rz, 'XYZ'));
    puck.quaternion.copy(frameQ).multiply(tilt);
    puck.position.set(p.x, p.y, p.z);
    const f = frost(s);
    frostU.value = f;
    // The film stays wet a while after the frost melts, then dries.
    wetU.value = clamp((1 - f) * 1.4) * (s.warm < 1 ? 1 : 0.8);

    const P = s.pour;
    const on = P ? clamp(P.t / 0.12) * clamp((P.dur - P.t) / 0.15 + 0.2) : 0;
    stream.visible = on > 0.01;
    if (stream.visible) {
      // The stream falls from above the frame; its foot shrinks as it ends.
      const top = 0.7, end = P.t > P.dur ? p.y + PUCK.t / 2 + (P.t - P.dur) * 2.5 : p.y + PUCK.t / 2;
      const foot = Math.min(end, top);
      const fall = Math.max(0, top - Math.max(foot, top - P.t * 6));
      stream.position.set(p.x + 0.004, top - fall, p.z);
      stream.scale.set(1, Math.max(fall, 0.001), 1);
      streamU.uOn.value = on;
      streamU.uT.value = P.t;
    }
    let n = 0;
    for (const b of s.beads) {
      m4.compose(v3.set(b.x, b.y, b.z), q4.identity(), s3.setScalar(b.r));
      beads.setMatrixAt(n++, m4);
    }
    beads.count = n;
    beads.instanceMatrix.needsUpdate = true;
    vapour.follow(s, p, dt);
  }
  function render(t = 0) {
    grade.uniforms.uSeed.value = t % 100;
    vapour.prepare(scene, camera);
    // The passes swap the buffers an odd number of times a frame.
    // The scene must start in the MSAA target, so swap back when needed.
    if (composer.readBuffer !== composer.renderTarget1) composer.swapBuffers();
    composer.render();
  }
  async function warm(s) {
    update(s);
    await renderer.compileAsync(scene, camera);
    vapour.warm(scene, camera);
  }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    vapour.dispose();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, scene, camera, vapour, frame, resize, pick, toScreen, mPerPx, viewDir, update, render, warm, dispose, puck };
}
