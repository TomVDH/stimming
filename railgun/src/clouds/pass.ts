// Load order: clouds/lightning runs first.
import './lightning.ts';
import * as THREE from 'three';
import { state } from '../state.ts';
import { camera, renderer, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { FS_U, farBake } from '../world/farcountry.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from './bands.ts';
import { CLOUD_U, heaps } from './clouds.ts';
import { setDeck } from './lightning.ts';
import LAYER from './layer.glsl';

/* ---------- the cloud pass: one march for the clouds, with true depth ---------- */
// One full-screen march at reduced resolution finds each cloud at its true distance.
// It writes the cloud's light and, in a second target, the first cloud's distance.
// Its composite writes that depth, so the scene sorts against the clouds per pixel.
// Step 1 holds the heap layer; the storms join the same march next.
const PASS_RES = 0.5;
state.cloudPass = false;
// Two targets: light with cover in alpha, and the first cloud's distance in km.
const rt = new THREE.WebGLRenderTarget(2, 2, { count: 2, type: THREE.HalfFloatType, depthBuffer: false });
// Depth must not blend across a cloud's edge into the empty sky.
rt.textures[1].minFilter = rt.textures[1].magFilter = THREE.NearestFilter;
export const LAYER_U = {
  uLyInv: { value: new THREE.Matrix4() }, uFarOn: { value: 0 },
  // The cover threshold: higher leaves more open sky.
  uLayerCut: { value: 0.86 },
  // The layer's wind, in m/s: it slides slowly across the sky.
  uLayerWind: { value: new THREE.Vector2(10, 4) },
};
// three's own prefix compiles as GLSL ES 3.0 and declares output 0; output 1 is declared here.
const passMat = new THREE.ShaderMaterial({
  uniforms: { ...U, ...CLOUD_U, ...FS_U, ...LAYER_U }, depthTest: false, depthWrite: false,
  vertexShader: /* glsl */`out vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
  fragmentShader: /* glsl */`precision highp sampler3D;
  layout(location = 1) out highp vec4 gDepthOut;
  uniform sampler3D uVol;
  uniform float uCloudC, uLayerCut, uFarOn;
  uniform vec2 uLayerWind, uBakeSize;
  uniform mat4 uLyInv, uRefVP;
  uniform sampler2D uFarG;
  in vec2 vN;
  ${HEAD}
  ${AIR}
  // The sunlight at P, as the storms take it.
  // A cloud up high sees the sun after the ground has lost it: its horizon dips.
  // The sun's height at P itself: points toward the sun see it higher.
  vec3 layerSun(vec3 P, float h) {
    float el = asin(clamp(uSunD.y + dot(uSunD.xz, P.xz - cameraPosition.xz) / 6.0e6, -1.0, 1.0)), dip = sqrt(2.0 * max(h, 0.0) / 6.0e6);
    float litTop = smoothstep(-dip - 0.006, -dip + 0.006, el) * (1.0 - smoothstep(-0.026, 0.026, el));
    // Light that grazes the planet arrives deep red.
    return mix(uSunC, uCloudSun, smoothstep(1500.0, 11000.0, h)) + uGlowC * vec3(1.0, 0.5, 0.28) * 1.6 * litTop;
  }
  vec3 layerSky() { return uZenC * 0.5 + uHorC * 0.5 + uCloudAmb * 0.5; }
  ${LAYER}
  // The distance to the ranges, from the far bake; far away without it.
  float rangeDist(vec3 rd) {
    if (uFarOn < 0.5) return 1e9;
    vec4 c = uRefVP * vec4(rd, 1.0);
    if (c.w <= 0.0) return 1e9;
    ivec2 i = ivec2((c.xy / c.w * 0.5 + 0.5) * uBakeSize), hi = ivec2(uBakeSize) - 1;
    vec4 g = texelFetch(uFarG, clamp(i, ivec2(0), hi), 0);
    return g.x < 0.0 ? 1e9 : (g.x + g.y) * 512.0;
  }
  void main() {
    vec4 w = uLyInv * vec4(vN, 1.0, 1.0);
    vec3 ro = cameraPosition, rd = normalize(w.xyz / w.w - ro);
    vec4 r = lyMarch(ro, rd, rangeDist(rd));
    float al = 1.0 - r.a;
    gDepthOut = vec4(max(gLyT, 0.0) / 1000.0, 0.0, 0.0, 1.0);
    if (al < 0.002) { gl_FragColor = vec4(0.0); return; }
    // The same air as the ranges and the cards, at the first cloud.
    vec3 c = aerial(r.rgb / al, ro + rd * max(gLyT, 0.0));
    gl_FragColor = vec4(c * al, al);
  }`,
});
const passScene = new THREE.Scene();
const tri = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
{ const m = new THREE.Mesh(tri, passMat); m.frustumCulled = false; passScene.add(m); }

// The composite: the light over the scene, at each cloud's own depth.
const COMP_U = { tCol: { value: rt.textures[0] }, tDep: { value: rt.textures[1] }, uInv: { value: new THREE.Matrix4() }, uVPc: { value: new THREE.Matrix4() } };
const COMP_FS = (depthOnly: boolean) => /* glsl */`uniform sampler2D tCol, tDep; uniform mat4 uInv, uVPc; varying vec2 vUv;
void main() {
  // A small tent filter softens the march's grain at half resolution.
  vec2 px = 1.0 / vec2(textureSize(tCol, 0));
  vec4 c = texture2D(tCol, vUv) * 0.4;
  c += (texture2D(tCol, vUv + vec2(px.x, 0.0)) + texture2D(tCol, vUv - vec2(px.x, 0.0)) + texture2D(tCol, vUv + vec2(0.0, px.y)) + texture2D(tCol, vUv - vec2(0.0, px.y))) * 0.15;
  // Only solid cloud hides what lies behind it; thin edges let it show.
  if (c.a < ${depthOnly ? '0.5' : '0.004'}) discard;
  vec4 w = uInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(w.xyz / w.w - cameraPosition);
  vec4 cp = uVPc * vec4(cameraPosition + rd * texture2D(tDep, vUv).r * 1000.0, 1.0);
  gl_FragDepth = clamp(cp.z / cp.w * 0.5 + 0.5, 0.0, 1.0);
  gl_FragColor = c;
}`;
const COMP_VS = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
// The light: premultiplied, tested against the scene's depth.
const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: COMP_U, vertexShader: COMP_VS, fragmentShader: COMP_FS(false),
  transparent: true, depthWrite: false, depthTest: true,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
}));
// The depth: solid cloud writes it, so what draws later sorts against the clouds.
const compDepth = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: COMP_U, vertexShader: COMP_VS, fragmentShader: COMP_FS(true),
  transparent: true, colorWrite: false, depthWrite: true, depthTest: true,
}));
for (const [m, o] of [[comp, BAND.cloud], [compDepth, BAND.cloud + 0.001]] as const) { m.frustumCulled = false; m.renderOrder = o; m.visible = false; scene.add(m); }

// The Dev row Cloud volumes: the pass replaces the heap and middle cards.
export function setCloudPass(on: boolean) {
  state.cloudPass = on;
  heaps.visible = !on;
  setDeck(U.uDeck.value);
  comp.visible = compDepth.visible = on;
  state.shaftOcc = null;
}
const vp = new THREE.Matrix4(), clear = new THREE.Color();
// Runs once a frame, before the composer.
export function drawCloudPass() {
  if (!state.cloudPass) return;
  const w = Math.max(1, Math.round(renderer.domElement.width * PASS_RES)), h = Math.max(1, Math.round(renderer.domElement.height * PASS_RES));
  if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
  camera.updateMatrixWorld();
  vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  LAYER_U.uLyInv.value.copy(vp).invert();
  COMP_U.uInv.value.copy(LAYER_U.uLyInv.value);
  COMP_U.uVPc.value.copy(vp);
  LAYER_U.uFarOn.value = farBake.on && FS_U.uFarG.value ? 1 : 0;
  const ca = renderer.getClearAlpha();
  renderer.getClearColor(clear);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(rt);
  renderer.clear();
  renderer.render(passScene, camera);
  renderer.setRenderTarget(null);
  renderer.setClearColor(clear, ca);
}
