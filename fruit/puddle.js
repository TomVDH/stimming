// Fruit puddle: juice that lands on the floor pools, spreads and settles.
// A float texture holds the juice over the floor: R its depth, GBA its colour times its depth.
// Each landed drop is a splat. Juice flows from deep to shallow while it is thicker than a
// thin film, so the edge stops and holds, as a real puddle's does. Colours mix as volumes.
// A mirror camera renders the scene upside down for the puddle's reflection.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const N = 320;
// The floor area the puddle covers, in world units: x, z of one corner, then its size.
export const RECT = new THREE.Vector4(-3.2, -2.6, 6.4, 5.2);
const MAXS = 256;

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// One step of flow: each texel trades juice with its four neighbours.
const FLOW = /* glsl */`
uniform sampler2D tPrev;
uniform float uTx, uFilm, uKeep;
varying vec2 vUv;
// Juice moves only where it is deeper than a thin film: the edge holds.
float mob(float a, float b) { return smoothstep(uFilm, uFilm * 3.0, max(a, b)); }
void main() {
  vec4 c = texture2D(tPrev, vUv);
  vec4 sum = vec4(0.0);
  vec2 o[4];
  o[0] = vec2(uTx, 0.0); o[1] = vec2(-uTx, 0.0); o[2] = vec2(0.0, uTx); o[3] = vec2(0.0, -uTx);
  for (int i = 0; i < 4; i++) {
    vec4 n = texture2D(tPrev, vUv + o[i]);
    sum += (n - c) * mob(c.r, n.r);
  }
  gl_FragColor = (c + sum * 0.2) * uKeep;
}`;

// A splat: a soft round dab of juice, added in.
const SPLAT_V = /* glsl */`
attribute vec2 aUv;
attribute float aSize;
attribute vec4 aJuice;
varying vec4 vJuice;
void main() {
  vJuice = aJuice;
  gl_PointSize = aSize;
  gl_Position = vec4(aUv * 2.0 - 1.0, 0.0, 1.0);
}`;
const SPLAT_F = /* glsl */`
varying vec4 vJuice;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float k = exp(-dot(q, q) * 3.0);
  gl_FragColor = vJuice * k;
}`;

export function makePuddle(renderer) {
  const opt = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let a = new THREE.WebGLRenderTarget(N, N, opt), b = new THREE.WebGLRenderTarget(N, N, opt);
  const flowM = new THREE.ShaderMaterial({ uniforms: { tPrev: { value: null }, uTx: { value: 1 / N }, uFilm: { value: 0.0011 }, uKeep: { value: 1 } }, vertexShader: VERT, fragmentShader: FLOW, depthTest: false, depthWrite: false });
  const flowQ = new FullScreenQuad(flowM);
  // The splats waiting for the next step.
  const sg = new THREE.BufferGeometry();
  const sUv = new Float32Array(MAXS * 2), sSize = new Float32Array(MAXS), sJuice = new Float32Array(MAXS * 4);
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXS * 3), 3));
  sg.setAttribute('aUv', new THREE.BufferAttribute(sUv, 2));
  sg.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  sg.setAttribute('aJuice', new THREE.BufferAttribute(sJuice, 4));
  // Plain one-plus-one blending: the alpha channel holds colour, not coverage.
  const sm = new THREE.ShaderMaterial({ vertexShader: SPLAT_V, fragmentShader: SPLAT_F, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false, transparent: true });
  const pts = new THREE.Points(sg, sm);
  pts.frustumCulled = false;
  const sScene = new THREE.Scene();
  sScene.add(pts);
  const sCam = new THREE.Camera();
  let ns = 0, flowT = 0, fade = 0, juicy = false;

  function clearAll() {
    const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const t of [a, b]) { renderer.setRenderTarget(t); renderer.clear(); }
    renderer.setClearColor(cc, ca);
    renderer.setRenderTarget(null);
  }
  clearAll();

  return {
    get texture() { return a.texture; },
    // Is there juice on the floor; is it still moving.
    get juicy() { return juicy; },
    get busy() { return ns > 0 || flowT > 0 || fade > 0; },
    // A drop lands at world x, z: r its radius, c its colour.
    splat(x, z, r, c) {
      if (ns >= MAXS) return;
      const u = (x - RECT.x) / RECT.z, v = (z - RECT.y) / RECT.w;
      if (u < 0 || u > 1 || v < 0 || v > 1) return;
      const depth = 0.007 + r * 0.5;
      sUv.set([u, v], ns * 2);
      // The dab is a few times the drop's own width.
      sSize[ns] = Math.max(3, (r * 6 / RECT.z) * N);
      sJuice.set([depth, c[0] * depth, c[1] * depth, c[2] * depth], ns * 4);
      ns++;
      juicy = true;
      // Juice keeps flowing a few seconds after the last drop.
      flowT = 6;
    },
    // The fruit changes: the old juice drains away.
    wipe() { if (juicy) fade = 0.8; },
    step(dt) {
      if (ns > 0) {
        sg.setDrawRange(0, ns);
        for (const k of ['aUv', 'aSize', 'aJuice']) sg.attributes[k].needsUpdate = true;
        renderer.setRenderTarget(a);
        renderer.autoClear = false;
        renderer.render(sScene, sCam);
        renderer.autoClear = true;
        ns = 0;
      }
      if (flowT > 0 || fade > 0) {
        flowT = Math.max(0, flowT - dt);
        fade = Math.max(0, fade - dt);
        flowM.uniforms.uKeep.value = fade > 0 ? Math.exp(-dt * 6) : 1;
        // Two flow steps a frame, ping-ponged.
        for (let i = 0; i < 2; i++) {
          flowM.uniforms.tPrev.value = a.texture;
          renderer.setRenderTarget(b);
          flowQ.render(renderer);
          [a, b] = [b, a];
        }
        if (fade > 0 && fade <= dt + 1e-4) { clearAll(); juicy = false; }
      }
      renderer.setRenderTarget(null);
    },
    // For tests: the deepest juice and how many texels hold any.
    probe() {
      const buf = new Uint16Array(N * N * 4);
      renderer.readRenderTargetPixels(a, 0, 0, N, N, buf);
      let mx = 0, cnt = 0;
      for (let i = 0; i < N * N; i++) { const h = THREE.DataUtils.fromHalfFloat(buf[i * 4]); if (h > mx) mx = h; if (h > 0.0005) cnt++; }
      return { mx, cnt };
    },
    dispose() { a.dispose(); b.dispose(); flowM.dispose(); sm.dispose(); sg.dispose(); },
  };
}

// The mirror: the scene seen from below the floor, for the puddle's reflection.
export function makeMirror(renderer) {
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const cam = new THREE.PerspectiveCamera();
  const tm = new THREE.Matrix4();
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  return {
    texture: rt.texture,
    matrix: tm,
    resize(w, h) { rt.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1)); },
    // Render the scene mirrored in the plane y = fy, hiding the floor itself.
    render(scene, camera, fy, aim, hide) {
      cam.copy(camera);
      p.copy(camera.position);
      p.y = 2 * fy - p.y;
      t.copy(aim);
      t.y = 2 * fy - t.y;
      cam.position.copy(p);
      cam.up.set(0, -1, 0);
      cam.lookAt(t);
      cam.updateMatrixWorld();
      cam.projectionMatrix.copy(camera.projectionMatrix);
      tm.copy(bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      for (const o of hide) o.visible = false;
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.setRenderTarget(null);
      for (const o of hide) o.visible = true;
    },
    dispose() { rt.dispose(); },
  };
}
