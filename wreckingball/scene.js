// Wrecking ball: the three.js scene. A brick wall in a dusty yard at dusk.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, BALL } from './sim.js';
import { createDust } from './dust.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// The sun is low at the wall's far end, a little to the ball's side.
export const SUN = new THREE.Vector3(-0.42, 0.3, -1).normalize();
const SUN_COL = new THREE.Color(1.0, 0.72, 0.46);
const HAZE = new THREE.Color(0.16, 0.1, 0.085);

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
  scene.fog = new THREE.FogExp2(HAZE, 0.034);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  const disposables = [];
  const keep = x => (disposables.push(x), x);

  /* ---------- sky ---------- */
  // Dusk: deep blue overhead, a warm band low down, the glow round the sun.
  const skyMat = keep(new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN }, uHaze: { value: HAZE } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uSun; uniform vec3 uHaze; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 top = vec3(0.018, 0.032, 0.085), mid = vec3(0.1, 0.085, 0.12), low = vec3(0.55, 0.27, 0.13);
        // The warm band is strongest on the sun's side of the sky.
        float side = 0.35 + 0.65 * max(dot(normalize(d.xz + 1e-4), normalize(uSun.xz)), 0.0);
        vec3 c = mix(mid, top, smoothstep(0.0, 0.5, h));
        c = mix(c, low, exp(-max(h, 0.0) * 11.0) * side);
        float s = max(dot(d, uSun), 0.0);
        c += vec3(1.0, 0.55, 0.26) * (pow(s, 6.0) * 0.5 + pow(s, 60.0) * 1.2) * smoothstep(-0.1, 0.12, h);
        c += vec3(1.2, 0.75, 0.45) * smoothstep(0.9993, 0.9997, s) * 12.0;
        c = mix(c, uHaze, smoothstep(0.03, -0.02, h));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(300, 32, 16)), skyMat);
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---------- light ---------- */
  const sun = new THREE.DirectionalLight(SUN_COL, 3.6);
  sun.position.copy(SUN).multiplyScalar(14);
  sun.target.position.set(0.4, 0, 0.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -4.5; sc.right = 4.5; sc.top = 4.5; sc.bottom = -4.5; sc.near = 2; sc.far = 30;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.012;
  sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);
  // Sky fill from above and a dim bounce off the dirt.
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.34, 0.4, 0.62), new THREE.Color(0.16, 0.11, 0.08), 0.75));

  /* ---------- ground ---------- */
  const groundMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.15, 0.115, 0.09), roughness: 0.96 }));
  groundMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vG;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvG = vec3(position.x, 0.0, -position.y);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vG;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 p = vG;
          // Packed dirt: broad patches, grit, a few pale stones.
          float big = vn(p * 0.6) * 0.6 + vn(p * 2.1) * 0.4;
          float grit = vn(p * 38.0) * 0.6 + vn(p * 110.0) * 0.4;
          float stone = smoothstep(0.82, 0.9, vn(p * 14.0 + 7.0)) * vn(p * 3.0);
          diffuseColor.rgb *= 0.7 + 0.45 * big + 0.22 * (grit - 0.5);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.27, 0.24), stone * 0.35);
          // Brick dust lies red round the wall's foot.
          float foot = exp(-abs(p.x - 0.05) * 3.0) * smoothstep(${(W.len / 2 + 0.6).toFixed(2)}, ${(W.len / 2 - 0.4).toFixed(2)}, abs(p.z));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.15, 0.09), foot * 0.35 * (0.6 + 0.4 * grit));
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = 0.9 + 0.1 * vn(vG * 30.0);`);
  };
  const groundG = keep(new THREE.PlaneGeometry(160, 160, 1, 1));
  const groundM = new THREE.Mesh(groundG, groundMat);
  groundM.rotation.x = -Math.PI / 2;
  groundM.receiveShadow = true;
  scene.add(groundM);

  /* ---------- bricks ---------- */
  const N = 240;
  const brickMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 }));
  brickMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vB; varying vec3 vBN; varying float vSeed;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vB = position; vBN = normal;
        vSeed = instanceMatrix[3].x * 3.7 + instanceMatrix[3].z * 11.3;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vB; varying vec3 vBN; varying float vSeed;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 p = vB * 40.0 + vSeed;
          // Fired clay: a mottled face, sand grains, small pits, a darker kiss of fire.
          float m = vn(p * 0.5) * 0.6 + vn(p * 1.7) * 0.4;
          float sand = vn(p * 9.0);
          float pit = smoothstep(0.8, 0.9, vn(p * 3.2 + 4.0));
          diffuseColor.rgb *= 0.78 + 0.36 * m + 0.14 * (sand - 0.5);
          diffuseColor.rgb *= 1.0 - 0.45 * pit;
          float kiss = smoothstep(0.55, 0.85, vn(vB * 9.0 + vSeed * 0.3));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.45, 0.32, 0.3), kiss * 0.55);
          // Worn arrises read a little paler.
          vec3 a = abs(vB) / vec3(${(W.bl / 2).toFixed(4)}, ${(W.bh / 2).toFixed(4)}, ${(W.bw / 2).toFixed(4)});
          float edge = smoothstep(0.9, 1.0, max(max(min(a.x, a.y), min(a.y, a.z)), min(a.x, a.z)));
          diffuseColor.rgb *= 1.0 + edge * 0.25;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = 0.82 + 0.16 * vn(vB * 300.0 + vSeed);`);
  };
  const fullG = keep(new RoundedBoxGeometry(W.bl, W.bh, W.bw, 2, 0.005));
  const halfG = keep(new RoundedBoxGeometry(W.mx / 2 - W.joint, W.bh, W.bw, 2, 0.005));
  const fulls = new THREE.InstancedMesh(fullG, brickMat, N);
  const halves = new THREE.InstancedMesh(halfG, brickMat, 32);
  const mortarMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.5, 0.47, 0.42), roughness: 0.97 }));
  mortarMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vM;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvM = (instanceMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vM;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.75 + 0.3 * vn(vM * 160.0) + 0.1 * vn(vM * 600.0);`);
  };
  const mortarG = keep(new THREE.BoxGeometry(1, 1, 1));
  const mortar = new THREE.InstancedMesh(mortarG, mortarMat, N * 2);
  for (const m of [fulls, halves, mortar]) {
    m.castShadow = true; m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    scene.add(m);
  }
  // Each brick keeps its own clay: a few tones of red and orange.
  const brickCol = (seed) => {
    const t = (Math.sin(seed * 91.7) * 0.5 + 0.5), u = Math.sin(seed * 37.1) * 0.5 + 0.5;
    const c = new THREE.Color().setRGB(0.44 + 0.12 * t, 0.15 + 0.06 * u, 0.085 + 0.03 * t, THREE.SRGBColorSpace);
    // One brick in nine fired darker, one in twelve paler.
    if (u > 0.89) c.multiplyScalar(0.62);
    else if (t > 0.92) c.lerp(new THREE.Color(0.55, 0.32, 0.22), 0.5);
    return c;
  };
  let painted = false;

  /* ---------- ball ---------- */
  // A pear of cast steel: round below, a neck and a lug on top.
  const steelMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.2, 0.19, 0.18), metalness: 0.85, roughness: 0.5 }));
  steelMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vS;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vS;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // Scuffs and rust: bright scratches from the work, rust in the hollows.
          float scr = smoothstep(0.62, 0.7, vn(vS * vec3(60.0, 6.0, 60.0))) * 0.6 + smoothstep(0.7, 0.78, vn(vS * vec3(9.0, 80.0, 9.0) + 3.0)) * 0.5;
          float rust = smoothstep(0.45, 0.75, vn(vS * 7.0 + 11.0)) * (0.5 + 0.5 * vn(vS * 40.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.1, 0.05), rust * 0.7);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.57), clamp(scr, 0.0, 1.0) * (1.0 - rust));
          vRust = rust;
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.42, 0.92, vRust);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.85, 0.15, vRust);')
      .replace('void main() {', 'float vRust = 0.0;\nvoid main() {');
  };
  const R = BALL.r;
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI * 0.72;
    prof.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R));
  }
  // The neck tapers to a flat crown.
  const last = prof[prof.length - 1];
  for (let i = 1; i <= 8; i++) {
    const u = i / 8;
    prof.push(new THREE.Vector2(THREE.MathUtils.lerp(last.x, R * 0.42, u) - Math.sin(u * Math.PI) * 0.01, last.y + u * R * 0.55));
  }
  prof.push(new THREE.Vector2(R * 0.36, last.y + R * 0.58), new THREE.Vector2(0, last.y + R * 0.6));
  const ballG = keep(new THREE.LatheGeometry(prof, 40));
  const ballTop = last.y + R * 0.6;
  const ball = new THREE.Group();
  const body = new THREE.Mesh(ballG, steelMat);
  body.castShadow = true; body.receiveShadow = true;
  ball.add(body);
  // The lug: a thick plate with a pin hole, cast on the crown.
  const lugG = keep(new THREE.BoxGeometry(0.05, 0.13, 0.15));
  const lug = new THREE.Mesh(lugG, steelMat);
  lug.position.y = ballTop + 0.05;
  lug.castShadow = true;
  ball.add(lug);
  const pinG = keep(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 14).rotateX(Math.PI / 2).rotateY(Math.PI / 2));
  const pin = new THREE.Mesh(pinG, steelMat);
  pin.position.y = ballTop + 0.07;
  ball.add(pin);
  scene.add(ball);

  /* ---------- chain and rope ---------- */
  // A short lead of heavy links joins the ball to the wire rope.
  const LINKS = 7, LINK = 0.105;
  const linkG = keep(new THREE.TorusGeometry(0.036, 0.0115, 8, 18).scale(1, 1.55, 1));
  const chainMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.22, 0.2, 0.18), metalness: 0.9, roughness: 0.45 }));
  const links = new THREE.InstancedMesh(linkG, chainMat, LINKS);
  links.castShadow = true;
  links.frustumCulled = false;
  scene.add(links);
  // A swivel block where the chain meets the rope.
  const swivelG = keep(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 14));
  const swivel = new THREE.Mesh(swivelG, chainMat);
  swivel.castShadow = true;
  scene.add(swivel);
  const ropeMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.12, 0.12, 0.12), metalness: 0.7, roughness: 0.4 }));
  const ropeG = keep(new THREE.CylinderGeometry(0.011, 0.011, 1, 6).translate(0, 0.5, 0));
  const rope = new THREE.Mesh(ropeG, ropeMat);
  rope.castShadow = true;
  scene.add(rope);

  /* ---------- dust ---------- */
  const dust = createDust(renderer, { sun: SUN, sunCol: SUN_COL, keep });

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  composer.addPass(dust.pass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.5, 0.82);
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
        c *= 1.0 - 0.45 * smoothstep(0.45, 1.25, length(q));
        c += (h(vUv * 913.0) - 0.5) * 0.014;
        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }`,
  });
  composer.addPass(grade);

  /* ---------- shot ---------- */
  const look = new THREE.Vector3();
  let aspect = 1, shakeX = 0, shakeY = 0;
  const base = new THREE.Vector3();
  // The camera stands at the ball's side, a little above, off the wall's face.
  function frame(w, h, cov = 0) {
    aspect = w / h;
    const tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 44 : 34;
    // A tall frame looks more along the swing, so the pull fits the width.
    const az = tall ? 1.22 : 0.72, el = tall ? 0.15 : 0.13;
    const dist = tall ? 10.5 : 5.9;
    look.set(tall ? -1.3 : -0.75, tall ? 1.4 : 0.95, tall ? 0.2 : 0.3);
    base.set(look.x - Math.sin(az) * Math.cos(el) * dist, look.y + Math.sin(el) * dist, look.z + Math.cos(az) * Math.cos(el) * dist);
    camera.position.copy(base);
    camera.lookAt(look);
    camera.setViewOffset(w, h, 0, (cov * h) / 2, w, h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    grade.uniforms.uAspect.value = aspect;
  }

  function resize(w, h, dpr, { bloomScale = 0.5, samples = 4, shadow = 2048, dustScale = 0.5 } = {}) {
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
    dust.resize(Math.round(w * dpr * dustScale), Math.round(h * dpr * dustScale));
    if (sun.shadow.mapSize.x !== shadow) {
      sun.shadow.mapSize.set(shadow, shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
  }

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const swingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -BALL.pivot[2]);
  // The pointer on the ball's swing plane.
  function pick(nx, ny) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(swingPlane, hit) ? { x: hit.x, y: hit.y } : null;
  }
  const sp = new THREE.Vector3();
  function toScreen(x, y, z) {
    sp.set(x, y, z).project(camera);
    return [(sp.x + 1) / 2, (1 - sp.y) / 2];
  }
  // The ball's radius on screen, in stage pixels.
  function ballPx(b, hpx) {
    const d = camera.position.distanceTo(sp.set(b.x, b.y, b.z));
    return (R / d) / Math.tan(camera.fov * Math.PI / 360) * hpx / 2;
  }

  /* ---------- sync ---------- */
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), o3 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  function update(sim) {
    let nf = 0, nh = 0, nm = 0;
    for (const p of sim.bricks) {
      q4.set(p.qx, p.qy, p.qz, p.qw);
      // The brick body sits above its bed joint, clear of its head joint.
      o3.set(p.half ? -W.joint / 2 : -W.joint / 2, W.joint / 2, 0).applyQuaternion(q4);
      m4.compose(v3.set(p.x + o3.x, p.y + o3.y, p.z + o3.z), q4, s3.set(1, 1, 1));
      if (p.half) { halves.setMatrixAt(nh, m4); if (!painted) halves.setColorAt(nh, brickCol(p.seed * 100 + p.i)); nh++; }
      else { fulls.setMatrixAt(nf, m4); if (!painted) fulls.setColorAt(nf, brickCol(p.seed * 100 + p.i)); nf++; }
      // Loose bricks keep ragged scraps of their mortar.
      const keepBed = p.st === 0 ? 1 : 0.2 + 0.4 * ((p.seed * 7.13) % 1);
      const keepHead = p.end ? 0 : p.st === 0 ? 1 : (p.seed > 0.5 ? 0.6 : 0);
      o3.set(0, -p.hy + W.joint / 2, 0).applyQuaternion(q4);
      m4.compose(v3.set(p.x + o3.x, p.y + o3.y, p.z + o3.z), q4, s3.set((p.hx * 2 - 0.004) * keepBed, W.joint * (p.st === 0 ? 1 : 0.6), W.bw * 0.94 * (p.st === 0 ? 1 : 0.6)));
      mortar.setMatrixAt(nm++, m4);
      o3.set(p.hx - W.joint / 2, W.joint / 2, 0).applyQuaternion(q4);
      m4.compose(v3.set(p.x + o3.x, p.y + o3.y, p.z + o3.z), q4, s3.set(W.joint * (keepHead ? 1 : 0.001), W.bh * Math.max(keepHead, 0.001), W.bw * 0.94));
      mortar.setMatrixAt(nm++, m4);
    }
    fulls.count = nf; halves.count = nh; mortar.count = nm;
    for (const m of [fulls, halves, mortar]) m.instanceMatrix.needsUpdate = true;
    if (!painted) { fulls.instanceColor.needsUpdate = true; halves.instanceColor.needsUpdate = true; painted = true; }

    // The ball hangs along its rope; the chain lead runs up from the lug.
    const b = sim.ball, [px, py, pz] = BALL.pivot;
    dir.set(px - b.x, py - b.y, pz - b.z).normalize();
    q4.setFromUnitVectors(up, dir);
    ball.position.set(b.x, b.y, b.z);
    ball.quaternion.copy(q4);
    const top = v3.set(b.x, b.y, b.z).addScaledVector(dir, ballTop + 0.07);
    for (let i = 0; i < LINKS; i++) {
      // Links alternate a quarter turn, each through the last.
      const c = o3.copy(top).addScaledVector(dir, LINK * (i + 0.5) - 0.01);
      const tw = new THREE.Quaternion().setFromAxisAngle(up, i % 2 ? Math.PI / 2 : 0.08);
      m4.compose(c, q4.clone().multiply(tw), s3.set(1, 1, 1));
      links.setMatrixAt(i, m4);
    }
    links.instanceMatrix.needsUpdate = true;
    const sw = top.clone().addScaledVector(dir, LINK * LINKS + 0.06);
    swivel.position.copy(sw);
    swivel.quaternion.copy(q4);
    const ropeLen = Math.hypot(px - sw.x, py - sw.y, pz - sw.z);
    rope.position.copy(sw).addScaledVector(dir, 0.08);
    rope.quaternion.copy(q4);
    rope.scale.set(1, ropeLen - 0.08, 1);

    // The impact shakes the camera a little.
    const k = sim.shake * sim.shake * (sim.calm ? 0 : 1);
    shakeX = Math.sin(sim.t * 61) * 0.025 * k; shakeY = Math.sin(sim.t * 47 + 1) * 0.02 * k;
    camera.position.set(base.x + shakeX, base.y + shakeY, base.z);
  }
  function render(t = 0) {
    grade.uniforms.uSeed.value = t % 100;
    dust.prepare(scene, camera, t);
    composer.render();
  }
  async function warm(sim) {
    update(sim);
    await renderer.compileAsync(scene, camera);
    dust.warm(scene, camera);
  }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    dust.dispose();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, scene, camera, dust, frame, resize, pick, toScreen, ballPx, update, render, warm, dispose };
}
