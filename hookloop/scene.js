// Hook and loop: the three.js scene. A macro close-up of one strap on a dark desk.
// Loop pile and hook field are shell layers; fibres are instanced tubes bent in the shader.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { STRAP, at, stretchOf, SPRING_T } from './strap.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// Colours are linear RGB.
export const COL = {
  hook: [0.62, 0.035, 0.018],
  loop: [0.74, 0.68, 0.6],
  desk: [0.018, 0.016, 0.015],
  key: [1.0, 0.8, 0.6],
};
const PILE_LAYERS = 14, HOOK_LAYERS = 8;
const MAXF = 1400;

// GLSL helpers shared by the shell materials.
const NOISE = /* glsl */`
  float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 h2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y);
  }
`;

export function createScene(canvas, { onLost } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0, 0);
  const camera = new THREE.PerspectiveCamera(28, 1, 5, 2000);
  const disposables = [];
  const keep = x => (disposables.push(x), x);

  /* ---------- light ---------- */
  // A low warm key rakes the pile from behind on the left.
  const key = new THREE.SpotLight(new THREE.Color(...COL.key), 2.0e5, 0, 0.62, 1.0, 2);
  key.position.set(-150, 95, -120);
  key.target.position.set(15, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 120;
  key.shadow.camera.far = 420;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 6;
  key.shadow.blurSamples = 12;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.46, 0.42, 0.4), new THREE.Color(0.06, 0.04, 0.03), 0.8);
  scene.add(hemi);
  // A cool fill from the front right keeps the near edge.
  const fill = new THREE.DirectionalLight(new THREE.Color(0.7, 0.76, 1.0), 0.3);
  fill.position.set(120, 60, 140);
  scene.add(fill);
  const keyView = { value: new THREE.Vector3(0, 0, 1) };

  /* ---------- desk ---------- */
  const deskMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(...COL.desk), roughness: 0.86, metalness: 0 }));
  deskMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vDesk;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDesk = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vDesk;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.85 + 0.3 * vn(vDesk * 0.05) + 0.08 * vn(vDesk * 1.7);`);
  };
  const desk = new THREE.Mesh(keep(new THREE.PlaneGeometry(1600, 1600)), deskMat);
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  /* ---------- light through nylon ---------- */
  // Thin red nylon glows where the key comes through it.
  const glow = (strength, tint) => sh => {
    sh.uniforms.uKeyView = keyView;
    sh.uniforms.uGlow = { value: strength };
    sh.uniforms.uTint = { value: new THREE.Vector3(...tint) };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uKeyView; uniform float uGlow; uniform vec3 uTint;')
      .replace('#include <opaque_fragment>', `
        {
          vec3 vd = normalize(-vViewPosition);
          float back = pow(max(dot(-vd, uKeyView), 0.0), 3.0);
          float through = max(dot(-normal, uKeyView), 0.0) * 0.7 + 0.3;
          outgoingLight += uTint * diffuseColor.rgb * uGlow * (0.15 + back * 2.4) * through;
        }
        #include <opaque_fragment>`);
  };

  /* ---------- loop tape ---------- */
  const LL = STRAP.L + 22, W = STRAP.W;
  const loopX = (STRAP.L - LL) / 2 + 4;
  const baseGeo = keep(new THREE.BoxGeometry(LL, STRAP.base, W + 0.4));
  const baseMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(...COL.loop).multiplyScalar(0.55), roughness: 0.95 }));
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(loopX, STRAP.base / 2, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);
  // The pile: layers of one plane, each cut by a clump and strand pattern.
  const pileGeo = keep(shellPlane(LL, W, PILE_LAYERS));
  const pileMat = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(...COL.loop), roughness: 0.82, side: THREE.DoubleSide }));
  // Light off the red underside tints the pile under an open flap.
  const bounce = { value: new THREE.Vector2(1e4, 0) };
  pileMat.onBeforeCompile = sh => {
    sh.uniforms.uBounce = bounce;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLayer; varying float vLayer; varying vec2 vXZ;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLayer = aLayer;
        vXZ = position.xz;
        transformed.y += aLayer * ${STRAP.pile.toFixed(3)};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLayer; varying vec2 vXZ; uniform vec2 uBounce;' + NOISE)
      .replace('#include <opaque_fragment>', `
        {
          float bx = vXZ.x - uBounce.x;
          float b = step(0.0, bx) * exp(-bx / 28.0) * smoothstep(0.0, 6.0, bx) * uBounce.y;
          outgoingLight += vec3(0.14, 0.012, 0.008) * b * diffuseColor.rgb * vLayer;
        }
        #include <opaque_fragment>`)
      .replace('#include <alphatest_fragment>', `
        {
          // Clumps of loops about a millimetre across, with curly strands.
          vec2 p = vXZ;
          float clump = vn(p * 0.9) * 0.6 + vn(p * 2.3 + 7.0) * 0.4;
          vec2 q = p * 3.1 + vec2(vn(p * 1.3) * 3.0, vn(p * 1.3 + 4.0) * 3.0) + vLayer * 1.7;
          float strand = abs(sin(q.x * 3.1 + sin(q.y * 2.7) * 2.2));
          float fine = vn(p * 11.0 + vLayer * 3.0);
          float dens = clump * 1.15 - vLayer * 0.85 + (1.0 - strand) * 0.32 + fine * 0.22;
          // The edges thin out like a selvedge.
          float edge = smoothstep(${(W / 2).toFixed(2)}, ${(W / 2 - 1.2).toFixed(2)}, abs(p.y));
          if (dens * edge < 0.42 && vLayer > 0.01) discard;
          float ao = 0.45 + 0.75 * smoothstep(0.0, 1.0, vLayer);
          diffuseColor.rgb *= ao * (0.86 + 0.28 * fine);
        }`);
  };
  const pile = new THREE.Mesh(pileGeo, pileMat);
  pile.position.set(loopX, STRAP.base, 0);
  pile.receiveShadow = true;
  scene.add(pile);

  /* ---------- hook tape ---------- */
  const tape = tapeGeometry();
  keep(tape.geo);
  const tapeMat = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...COL.hook), roughness: 0.82, sheen: 0.4, sheenColor: new THREE.Color(1, 0.45, 0.35), sheenRoughness: 0.5 }));
  tapeMat.onBeforeCompile = sh => {
    glow(0.9, [1.6, 0.6, 0.45])(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aFace; varying vec3 vFace;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFace = aFace;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFace;' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // Top: a woven back. Bottom: the hook base, darker. Edges: cut weave.
          vec2 uv = vFace.yz;
          float wx = sin(uv.x * 9.4) * 0.5 + 0.5, wz = sin(uv.y * 9.4 + step(0.5, fract(uv.x * 1.5)) * 3.14) * 0.5 + 0.5;
          float weave = mix(wx, wz, step(0.5, fract(uv.x * 1.5 + uv.y * 1.5)));
          float top = step(vFace.x, 0.5);
          float bot = step(0.5, vFace.x) * step(vFace.x, 1.5);
          diffuseColor.rgb *= mix(1.0, 0.78 + 0.3 * weave, top);
          diffuseColor.rgb *= mix(1.0, 0.55 + 0.2 * vn(uv * 6.0), bot);
        }`);
  };
  const tapeMesh = new THREE.Mesh(tape.geo, tapeMat);
  tapeMesh.castShadow = true;
  tapeMesh.receiveShadow = true;
  tapeMesh.frustumCulled = false;
  scene.add(tapeMesh);
  // The hook field: layers under the tape, each cut to hook sections.
  const field = fieldGeometry();
  keep(field.geo);
  const fieldMat = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...COL.hook).multiplyScalar(1.2), roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide }));
  fieldMat.onBeforeCompile = sh => {
    glow(1.2, [1.8, 0.7, 0.5])(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aFace; varying vec3 vFace;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vFace = aFace;
        transformed += normal * aFace.x * ${STRAP.hookH.toFixed(3)};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFace;' + NOISE)
      .replace('#include <alphatest_fragment>', `
        {
          // Rows of hooks: a stem, then a crook that leans toward the tab.
          float t = vFace.x;
          vec2 uv = vFace.yz * vec2(1.0 / 0.5, 1.0 / 0.48);
          vec2 cell = floor(uv);
          vec2 jit = h2(cell) - 0.5;
          vec2 f = fract(uv) - 0.5 - jit * 0.3;
          float lean = smoothstep(0.55, 1.0, t) * 0.55 * (0.8 + 0.4 * hh(cell + 3.0));
          float r = mix(0.2, 0.15, t);
          float d = length((f - vec2(lean, 0.0)) * vec2(1.0, 1.25));
          float crook = smoothstep(0.82, 0.95, t) * step(abs(f.y), 0.12) * step(0.0, f.x) * step(f.x, lean + 0.1);
          if (d > r && crook < 0.5) discard;
          diffuseColor.rgb *= 0.65 + 0.5 * t;
        }`);
  };
  const fieldMesh = new THREE.Mesh(field.geo, fieldMat);
  fieldMesh.frustumCulled = false;
  scene.add(fieldMesh);

  /* ---------- fibres ---------- */
  // Each visible site draws one loop (pale) and one hook (red).
  const inst = {
    A: new THREE.InstancedBufferAttribute(new Float32Array(MAXF * 3), 3),
    B: new THREE.InstancedBufferAttribute(new Float32Array(MAXF * 3), 3),
    R: new THREE.InstancedBufferAttribute(new Float32Array(MAXF * 4), 4),
    P: new THREE.InstancedBufferAttribute(new Float32Array(MAXF * 4), 4),
  };
  for (const a of Object.values(inst)) a.setUsage(THREE.DynamicDrawUsage);
  const loopGeo = keep(tubeGeometry(22, 5));
  const hookGeo = keep(tubeGeometry(14, 6));
  for (const g of [loopGeo, hookGeo]) { g.setAttribute('aA', inst.A); g.setAttribute('aB', inst.B); g.setAttribute('aR', inst.R); g.setAttribute('aP', inst.P); }
  const FIBRE_HEAD = /* glsl */`
    attribute vec3 aTube; attribute vec3 aA; attribute vec3 aB; attribute vec4 aR; attribute vec4 aP;
    varying float vFade;
  `;
  // Loop: from one foot up round the hook and back down to the other foot.
  const LOOP_CURVE = /* glsl */`
    vec3 curve(float u) {
      float side = u < 0.5 ? -1.0 : 1.0;
      float v = u < 0.5 ? u * 2.0 : (1.0 - u) * 2.0;
      float seed = aP.z;
      vec3 spread = vec3(0.13 + 0.06 * seed, 0.0, 0.05 * (seed - 0.5));
      vec3 foot = aA + spread * side;
      vec3 apex = aB;
      if (aP.x > 0.5) {
        // Snapped: the loop whips back down into the pile.
        float t = aP.y;
        float wob = exp(-t / 0.045) * cos(t * 75.0 + seed * 6.0);
        // It overshoots, rings, then sinks below the pile top.
        float sink = smoothstep(0.05, 0.28, t);
        apex = aA + vec3((seed - 0.5) * 0.3 * (1.0 + wob), mix(0.35, -0.1, sink) + aP.w * wob * 1.1, (seed - 0.5) * 0.2);
        apex.y = max(apex.y, aA.y + 0.05);
      }
      vec3 p = mix(foot, apex, v);
      vec3 d = apex - foot;
      vec3 side3 = normalize(cross(d + vec3(0.0, 0.0, 1e-4), vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
      // A slack loop bows out; a taut one runs straight.
      float bow = 0.1 * (1.0 - aP.w) + 0.05;
      p += side3 * side * sin(PI * v) * bow;
      // The top wraps round the hook.
      p += vec3(0.0, 0.0, 0.03 * side) * smoothstep(0.85, 1.0, v);
      return p;
    }
  `;
  // Hook: a stem down from the tape, then a crook toward the tab.
  const HOOK_CURVE = /* glsl */`
    vec3 curve(float u) {
      vec3 R = aR.xyz;
      vec2 n2 = vec2(cos(aR.w), sin(aR.w));
      vec3 N = vec3(n2, 0.0);
      vec3 T = vec3(-n2.y, n2.x, 0.0);
      float stem = ${(STRAP.hookH * 0.55).toFixed(3)};
      float rc = 0.16;
      // A taut loop opens the crook a little; a snapped hook shivers.
      float ang = mix(3.6, 2.6, aP.w * step(aP.x, 0.5));
      float shiver = aP.x > 0.5 ? exp(-aP.y / 0.06) * sin(aP.y * 140.0) * 0.12 : 0.0;
      if (u < 0.55) return R + N * (u / 0.55) * stem + T * shiver * (u / 0.55) * (u / 0.55);
      float ph = (u - 0.55) / 0.45 * ang;
      vec3 C = R + N * stem + T * (rc + shiver);
      return C + (-T * cos(ph) + N * sin(ph)) * rc;
    }
  `;
  const fibreBody = (radius) => /* glsl */`
    float u = aTube.x;
    vec3 P0 = curve(u);
    vec3 P1 = curve(min(u + 0.02, 1.0));
    vec3 Pm = curve(max(u - 0.02, 0.0));
    vec3 Tg = normalize(P1 - Pm + vec3(1e-5));
    vec3 ref = abs(Tg.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 Nn = normalize(cross(Tg, ref));
    vec3 Bn = cross(Tg, Nn);
    vec3 dir = Nn * cos(aTube.y) + Bn * sin(aTube.y);
    // Springing fibres fade as they settle back.
    vFade = aP.x > 0.5 ? 1.0 - smoothstep(${(SPRING_T * 0.3).toFixed(3)}, ${(SPRING_T * 0.7).toFixed(3)}, aP.y) : 1.0;
    float r = ${radius} * (aTube.z > 0.5 ? 0.9 : 1.0);
  `;
  const fibreMat = (color, radius, curveSrc, extra) => {
    const m = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...color), roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.25, transparent: true }));
    m.onBeforeCompile = sh => {
      extra?.(sh);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + FIBRE_HEAD + curveSrc)
        .replace('#include <beginnormal_vertex>', fibreBody(radius) + '\nvec3 objectNormal = dir;')
        .replace('#include <begin_vertex>', 'vec3 transformed = P0 + dir * r;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vFade;')
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= vFade;');
    };
    return m;
  };
  const loopMat = fibreMat([0.9, 0.86, 0.8], '0.07', LOOP_CURVE);
  const hookMat = fibreMat([0.8, 0.05, 0.02], '0.1', HOOK_CURVE, glow(1.4, [1.8, 0.6, 0.45]));
  const loops = new THREE.InstancedMesh(loopGeo, loopMat, MAXF);
  const hooks = new THREE.InstancedMesh(hookGeo, hookMat, MAXF);
  for (const m of [loops, hooks]) { m.frustumCulled = false; m.count = 0; scene.add(m); }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Macro focus: the desk plane gives depth; blur grows away from the peel line.
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, uSeed: { value: 0 }, uAspect: { value: 1 },
      uInvVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uFocus: { value: 150 },
      uBlur: { value: 1 }, uPx: { value: new THREE.Vector2(1 / 1280, 1 / 800) },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uSeed; uniform float uAspect; uniform mat4 uInvVP; uniform vec3 uCam;
      uniform float uFocus; uniform float uBlur; uniform vec2 uPx; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      float depthAt(vec2 uv) {
        vec4 w = uInvVP * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
        vec3 dir = normalize(w.xyz / w.w - uCam);
        float t = dir.y < -1e-3 ? (1.5 - uCam.y) / dir.y : 2000.0;
        return min(t, 2000.0);
      }
      void main() {
        float d = depthAt(vUv);
        float coc = clamp(abs(1.0 / d - 1.0 / uFocus) * uFocus * 6.5 - 0.15, 0.0, 1.0) * uBlur;
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        if (coc > 0.01) {
          vec3 acc = c; float wsum = 1.0;
          float rad = coc * 7.0;
          for (int i = 0; i < 16; i++) {
            float fi = float(i) + 0.5;
            float a = fi * 2.39996;
            vec2 o = vec2(cos(a), sin(a)) * sqrt(fi / 16.0) * rad * uPx;
            acc += texture2D(tDiffuse, vUv + o).rgb;
            wsum += 1.0;
          }
          c = acc / wsum;
        }
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        c *= 1.0 - 0.55 * smoothstep(0.35, 1.15, length(q));
        c += (h(vUv * 913.0) - 0.5) * 0.008;
        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }`,
  });
  composer.addPass(grade);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.45, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- shot ---------- */
  const look = new THREE.Vector3();
  let aspect = 1, cover = 0, dims = [1, 1], blurBase = 1, blurAspect = 1;
  const invVP = new THREE.Matrix4();
  // Low three-quarter view: the tab end is near, the stitched end runs off.
  function frame(w, h, cov = 0) {
    dims = [w, h];
    aspect = w / h;
    cover = cov;
    const tall = aspect < 0.9;
    camera.aspect = aspect;
    camera.fov = tall ? 34 : 24;
    const az = tall ? 1.42 : 0.72, elev = tall ? 0.5 : 0.4;
    const needW = tall ? 50 : 92;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(needW / 2 / (t * aspect), 60 / (2 * t)) * (tall ? 1.0 : 1.0);
    // The bar takes the foot: aim lower so the strap sits in the free area.
    look.set(tall ? 48 : 34, 3 - cover * 24, tall ? 0 : 2);
    camera.position.set(look.x + Math.sin(az) * Math.cos(elev) * dist, look.y + Math.sin(elev) * dist, look.z + Math.cos(az) * Math.cos(elev) * dist);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    upright.setFromNormalAndCoplanarPoint(new THREE.Vector3(Math.sin(az), 0, Math.cos(az)), tabPt);
    camera.updateMatrixWorld();
    grade.uniforms.uAspect.value = aspect;
    // A tall view looks along the strap: less blur keeps the near end readable.
    blurAspect = tall ? 0.45 : 1;
    grade.uniforms.uBlur.value = blurBase * blurAspect;
    invVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    grade.uniforms.uInvVP.value.copy(invVP);
    grade.uniforms.uCam.value.copy(camera.position);
  }

  function resize(w, h, dpr, { bloomScale = 0.5, samples = 4, shadow = 2048, blur = 1 } = {}) {
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
    grade.uniforms.uPx.value.set(1 / w, 1 / h);
    blurBase = blur;
    grade.uniforms.uBlur.value = blur * blurAspect;
    if (key.shadow.mapSize.x !== shadow) {
      key.shadow.mapSize.set(shadow, shadow);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    }
  }

  // Pointer rays: onto the strap top, or onto the upright plane of the strap.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const top = new THREE.Plane(new THREE.Vector3(0, 1, 0), -STRAP.home);
  // The drag plane stands upright through the tab and faces the camera.
  const upright = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const tabPt = new THREE.Vector3(STRAP.x0 + STRAP.L, STRAP.home, 0);
  function pickTop(nx, ny) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(top, hit) ? { x: hit.x, z: hit.z } : null;
  }
  function pickUpright(nx, ny) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(upright, hit) ? { x: hit.x, y: hit.y } : null;
  }
  // Screen position of a world point, in 0..1.
  const sp = new THREE.Vector3();
  function toScreen(x, y, z) {
    sp.set(x, y, z).project(camera);
    return [(sp.x + 1) / 2, (1 - sp.y) / 2];
  }

  /* ---------- sync ---------- */
  const Q = [0, 0, 0, 0];
  let focus = 150;
  function update(st, dt = 0) {
    writeTape(st, tape);
    tape.geo.attributes.position.needsUpdate = true;
    tape.geo.attributes.normal.needsUpdate = true;
    writeField(st, field);
    field.geo.attributes.position.needsUpdate = true;
    field.geo.attributes.normal.needsUpdate = true;
    // Fibres: sites in the peel zone, and sites that spring back.
    const si = st.sites, S = STRAP;
    let k = 0;
    const A = inst.A.array, B = inst.B.array, R = inst.R.array, P = inst.P.array;
    for (let j = 0; j < si.n && k < MAXF; j++) {
      const s = si.state[j];
      if (s === 2) continue;
      const i = st.nodeOf(si.s[j]);
      let e = 0;
      if (s === 0) {
        const i1 = Math.min(st.n - 1, i + 1);
        if (st.y[i] < S.home + 0.03 && st.y[i1] < S.home + 0.03) continue;
        e = stretchOf(st, j);
        if (e < -0.35) continue;
      }
      at(st, si.s[j], Q);
      const nx = -Q[2], ny = -Q[3];
      const rx = Q[0] + nx * S.back / 2, ry = Q[1] + ny * S.back / 2;
      const stem = S.hookH * 0.55 + 0.16;
      const ax = S.x0 + si.s[j], ay = S.pileTop - 0.35, z = si.z[j];
      A[k * 3] = ax; A[k * 3 + 1] = ay; A[k * 3 + 2] = z;
      B[k * 3] = rx + nx * stem; B[k * 3 + 1] = ry + ny * stem; B[k * 3 + 2] = z;
      R[k * 4] = rx; R[k * 4 + 1] = ry; R[k * 4 + 2] = z; R[k * 4 + 3] = Math.atan2(ny, nx);
      const brk = si.brk[j];
      P[k * 4] = s; P[k * 4 + 1] = si.t[j]; P[k * 4 + 2] = si.seed[j];
      P[k * 4 + 3] = s === 0 ? clamp(e / Math.max(0.3, brk)) : clamp(si.amp[j] / 3.5, 0.2, 1) * (st.calm ? 0 : 1);
      k++;
    }
    loops.count = hooks.count = k;
    for (const a of Object.values(inst)) { a.needsUpdate = true; a.addUpdateRange?.(0, k * a.itemSize); }
    // Focus follows the peel line, eased.
    const fx = S.x0 + st.front;
    bounce.value.set(fx - loopX, clamp(st.loose * 6) * (st.y[st.n - 1] > S.home + 3 ? 1 : 0.4));
    sp.set(fx, 2, 0);
    const fd = sp.distanceTo(camera.position);
    focus += (fd - focus) * (dt ? 1 - Math.exp(-dt / 0.25) : 1);
    grade.uniforms.uFocus.value = focus;
  }

  function render(grain = 0) {
    grade.uniforms.uSeed.value = grain;
    // The glow needs the key's direction in view space.
    keyView.value.copy(key.position).sub(key.target.position).normalize().transformDirection(camera.matrixWorldInverse);
    composer.render();
  }
  async function warm() { await renderer.compileAsync(scene, camera); }
  function dispose() {
    for (const d of disposables) d.dispose?.();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }
  return { renderer, scene, camera, frame, resize, pickTop, pickUpright, toScreen, update, render, warm, dispose };
}

/* ---------- geometry ---------- */
// A plane of shell layers: aLayer runs 0 at the backing to 1 at the pile top.
function shellPlane(lx, lz, layers) {
  const pos = [], lay = [], nrm = [], idx = [];
  for (let l = 0; l < layers; l++) {
    const t = l / (layers - 1), b = pos.length / 3;
    for (const [x, z] of [[-lx / 2, -lz / 2], [lx / 2, -lz / 2], [lx / 2, lz / 2], [-lx / 2, lz / 2]]) {
      pos.push(x, 0, z); nrm.push(0, 1, 0); lay.push(t);
    }
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aLayer', new THREE.Float32BufferAttribute(lay, 1));
  g.setIndex(idx);
  return g;
}

// The hook tape: per node, eight vertices for top, bottom and both edges.
// aFace: x is the face (0 top, 1 bottom, 2 edge), y the length, z the width.
function tapeGeometry() {
  const n = Math.round(STRAP.L / STRAP.ds) + 1;
  const V = n * 8 + 8;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(V * 3), nrm = new Float32Array(V * 3), face = new Float32Array(V * 3), idx = [];
  const W = STRAP.W / 2;
  for (let i = 0; i < n; i++) {
    const s = i * STRAP.ds;
    // top -W, top +W, bottom -W, bottom +W, edge-: top, bottom, edge+: top, bottom
    const f = [[0, s, -W], [0, s, W], [1, s, -W], [1, s, W], [2, s, 0], [2, s, 0.55], [2, s, 0], [2, s, 0.55]];
    for (let c = 0; c < 8; c++) face.set(f[c], (i * 8 + c) * 3);
    if (i < n - 1) {
      const a = i * 8, b = a + 8;
      idx.push(a, a + 1, b, a + 1, b + 1, b);              // top
      idx.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3);  // bottom
      idx.push(a + 4, b + 4, a + 5, a + 5, b + 4, b + 5);  // edge -z
      idx.push(a + 6, a + 7, b + 6, a + 7, b + 7, b + 6);  // edge +z
    }
  }
  // Two end caps.
  const c0 = n * 8;
  for (let c = 0; c < 8; c++) face.set([2, 0, 0], (c0 + c) * 3);
  idx.push(c0, c0 + 1, c0 + 2, c0 + 1, c0 + 3, c0 + 2);
  idx.push(c0 + 4, c0 + 6, c0 + 5, c0 + 5, c0 + 6, c0 + 7);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aFace', new THREE.BufferAttribute(face, 3));
  g.setIndex(idx);
  return { geo: g, n };
}

// Tangent frame of node i: unit tangent and up normal in the x-y plane.
function frameAt(st, i, out) {
  const a = Math.max(0, i - 1), b = Math.min(st.n - 1, i + 1);
  let tx = st.x[b] - st.x[a], ty = st.y[b] - st.y[a];
  const l = Math.hypot(tx, ty) || 1;
  tx /= l; ty /= l;
  out[0] = tx; out[1] = ty; out[2] = -ty; out[3] = tx;
}

const F = [0, 0, 0, 0];
function writeTape(st, tape) {
  const { n } = tape, pos = tape.geo.attributes.position.array, nrm = tape.geo.attributes.normal.array;
  const W = STRAP.W / 2, hb = STRAP.back / 2;
  const put = (v, x, y, z, nx, ny, nz) => { pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; nrm[v * 3] = nx; nrm[v * 3 + 1] = ny; nrm[v * 3 + 2] = nz; };
  for (let i = 0; i < n; i++) {
    frameAt(st, i, F);
    const x = st.x[i], y = st.y[i], ux = F[2] * hb, uy = F[3] * hb;
    const v = i * 8;
    put(v, x + ux, y + uy, -W, F[2], F[3], 0);
    put(v + 1, x + ux, y + uy, W, F[2], F[3], 0);
    put(v + 2, x - ux, y - uy, -W, -F[2], -F[3], 0);
    put(v + 3, x - ux, y - uy, W, -F[2], -F[3], 0);
    put(v + 4, x + ux, y + uy, -W, 0, 0, -1);
    put(v + 5, x - ux, y - uy, -W, 0, 0, -1);
    put(v + 6, x + ux, y + uy, W, 0, 0, 1);
    put(v + 7, x - ux, y - uy, W, 0, 0, 1);
  }
  // Caps at the stitch end and the tab end.
  const c0 = n * 8;
  for (const [k, i, sgn] of [[0, 0, -1], [4, n - 1, 1]]) {
    frameAt(st, i, F);
    const x = st.x[i], y = st.y[i], ux = F[2] * hb, uy = F[3] * hb;
    const nx = F[0] * sgn, ny = F[1] * sgn;
    put(c0 + k, x + ux, y + uy, -W, nx, ny, 0);
    put(c0 + k + 1, x + ux, y + uy, W, nx, ny, 0);
    put(c0 + k + 2, x - ux, y - uy, -W, nx, ny, 0);
    put(c0 + k + 3, x - ux, y - uy, W, nx, ny, 0);
  }
}

// The hook field: the tape's underside, repeated per layer, with no tab.
function fieldGeometry() {
  const n = Math.round((STRAP.L - STRAP.tab) / STRAP.ds) + 1;
  const L = HOOK_LAYERS;
  const g = new THREE.BufferGeometry();
  const V = n * 2 * L;
  const pos = new Float32Array(V * 3), nrm = new Float32Array(V * 3), face = new Float32Array(V * 3), idx = [];
  const W = STRAP.W / 2 - 0.3;
  for (let l = 0; l < L; l++) {
    const t = (l + 0.5) / L;
    for (let i = 0; i < n; i++) {
      const v = (l * n + i) * 2;
      face.set([t, i * STRAP.ds, -W], v * 3);
      face.set([t, i * STRAP.ds, W], v * 3 + 3);
      if (i < n - 1) idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aFace', new THREE.BufferAttribute(face, 3));
  g.setIndex(idx);
  return { geo: g, n, L };
}
function writeField(st, field) {
  const { n, L } = field, pos = field.geo.attributes.position.array, nrm = field.geo.attributes.normal.array;
  const W = STRAP.W / 2 - 0.3, hb = STRAP.back / 2;
  for (let i = 0; i < n; i++) {
    frameAt(st, i, F);
    const x = st.x[i] - F[2] * hb, y = st.y[i] - F[3] * hb;
    for (let l = 0; l < L; l++) {
      const v = (l * n + i) * 2;
      for (let c = 0; c < 2; c++) {
        const o = (v + c) * 3;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = c ? W : -W;
        nrm[o] = -F[2]; nrm[o + 1] = -F[3]; nrm[o + 2] = 0;
      }
    }
  }
}

// A tube along u: aTube.x is u, aTube.y the angle round the tube.
function tubeGeometry(segs, sides) {
  const pos = [], tube = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    for (let k = 0; k < sides; k++) {
      tube.push(i / segs, (k / sides) * Math.PI * 2, 0);
      pos.push(0, 0, 0);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < sides; k++) {
      const a = i * sides + k, b = i * sides + ((k + 1) % sides), c = a + sides, d = b + sides;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTube', new THREE.Float32BufferAttribute(tube, 3));
  g.setIndex(idx);
  return g;
}
