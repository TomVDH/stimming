// Load order: clouds/lightning runs first.
import './lightning.ts';
import * as THREE from 'three';
import { state } from '../state.ts';
import { camera, renderer, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { PLANET_R } from '../world/ground.ts';
import { FS_U, farBake } from '../world/farcountry.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from './bands.ts';
import { STORM_GLSL, STORM_MARCH } from '../../storms.js';
import { CLOUD_U, giants, tower } from './clouds.ts';
import { STORM_SPOTS, stormAt, stormFl } from './lightning.ts';
import { STORM_HOST } from './probe.ts';
import LAYER from './layer.glsl';

/* ---------- the cloud pass: one march for the clouds, with true depth ---------- */
// One full-screen march at reduced resolution finds each cloud at its true distance.
// It writes the cloud's light and, in a second target, the first cloud's distance.
// Its composite writes that depth, so the scene sorts against the clouds per pixel.
// It holds the heap layer and the storms; their segments join front to back by distance.
// The march's share of the screen's resolution; Dev knobs may change it.
let passRes = 0.5;
state.cloudPass = false;
// Two targets: light with cover in alpha, and the first cloud's distance in km.
const rt = new THREE.WebGLRenderTarget(2, 2, { count: 2, type: THREE.HalfFloatType, depthBuffer: false });
// Depth must not blend across a cloud's edge into the empty sky.
rt.textures[1].minFilter = rt.textures[1].magFilter = THREE.NearestFilter;
export const LAYER_U = {
  uLyInv: { value: new THREE.Matrix4() }, uFarOn: { value: 0 },
  // The cover threshold: higher leaves more open sky.
  uLayerCut: { value: 0.86 },
  // How hard the heaps' silhouettes are: smaller is crisper.
  uLayerEdge: { value: 0.04 },
  // The marched heap layer: off, since the card heaps draw the layer (Tom's hybrid).
  uLayerOn: { value: 0 },
  // The layer's wind, in m/s: it slides slowly across the sky.
  uLayerWind: { value: new THREE.Vector2(10, 4) },
  // Each storm: centre x, base on the curved ground, centre z, height.
  uSt: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
  // Each storm: seed, form, on, base over its own ground.
  uStF: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
};
// three's own prefix compiles as GLSL ES 3.0 and declares output 0; output 1 is declared here.
const passMat = new THREE.ShaderMaterial({
  uniforms: { ...U, ...CLOUD_U, ...FS_U, ...LAYER_U }, depthTest: false, depthWrite: false,
  vertexShader: /* glsl */`out vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
  fragmentShader: /* glsl */`precision highp sampler3D;
  layout(location = 1) out highp vec4 gDepthOut;
  uniform sampler3D uVol;
  uniform float uCloudC, uLayerCut, uLayerEdge, uFarOn, uLayerOn;
  uniform vec2 uLayerWind, uBakeSize;
  uniform mat4 uLyInv, uRefVP;
  uniform sampler2D uFarG;
  uniform vec4 uFl[4];
  uniform vec4 uFlR;
  uniform vec4 uStormK;
  uniform float uStormSoft;
  uniform vec4 uSt[4], uStF[4];
  in vec2 vN;
  ${HEAD}
  ${AIR}
  ${STORM_GLSL}
  ${STORM_HOST}
  ${STORM_MARCH}
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
    float tEnd = rangeDist(rd);
    // Each segment: premultiplied light and cover, and the distance of its first cloud.
    vec4 sc[5]; float sd[5]; int n = 0;
    vec4 r = uLayerOn > 0.5 ? lyMarch(ro, rd, tEnd) : vec4(0.0, 0.0, 0.0, 1.0);
    float aL = 1.0 - r.a;
    // The same air as the ranges and the cards, at the first cloud.
    if (aL > 0.002) { sc[n] = vec4(aerial(r.rgb / aL, ro + rd * gLyT) * aL, aL); sd[n] = gLyT; n++; }
    Ls = uSunD.y > -0.12 ? uSunD : uSun;
    float jit = fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
    for (int i = 0; i < 4; i++) {
      if (uStF[i].z < 0.5) continue;
      vec3 C = uSt[i].xyz; float H = uSt[i].w;
      setStorm(uStF[i].x, uStF[i].y);
      setGround(uStF[i].w, H);
      // A range in front cuts the storm where the two really cross.
      vec2 sp = stormSpan(ro, rd, C, H);
      sp.y = min(sp.y, tEnd);
      if (sp.y <= sp.x) continue;
      gHitSh = -1.0; gRockSh = -1.0;
      vec3 Phit, Flash;
      vec4 m = marchStorm(ro, rd, C, H, sp.x, sp.y, jit, Phit, Flash);
      if (m.a < 0.004) continue;
      // Far flashes and the blast, the bolt and the rock land after the air.
      vec3 col = aerial(m.rgb, Phit) + Flash / m.a * 0.85;
      sc[n] = vec4(col * m.a, m.a); sd[n] = length(Phit - ro); n++;
    }
    // Near segments first.
    for (int i = 1; i < 5; i++) {
      if (i >= n) break;
      for (int j = i; j > 0; j--) {
        if (sd[j - 1] <= sd[j]) break;
        vec4 tc = sc[j]; sc[j] = sc[j - 1]; sc[j - 1] = tc;
        float td = sd[j]; sd[j] = sd[j - 1]; sd[j - 1] = td;
      }
    }
    // Front to back: each segment shows through what lies in front of it.
    vec3 col = vec3(0.0);
    float T = 1.0, dep = 0.0;
    for (int i = 0; i < 5; i++) {
      if (i >= n) break;
      col += T * sc[i].rgb;
      if (dep == 0.0 && sc[i].a > 0.3) dep = sd[i];
      T *= 1.0 - sc[i].a;
    }
    if (dep == 0.0 && n > 0) dep = sd[0];
    gDepthOut = vec4(dep / 1000.0, 0.0, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0 - T);
  }`,
});
const passScene = new THREE.Scene();
const tri = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
{ const m = new THREE.Mesh(tri, passMat); m.frustumCulled = false; passScene.add(m); }

// The composite: the light over the scene, at each cloud's own depth.
// uFirm: how much the composite firms the cover into a card-like silhouette. uBlur: the tent filter's share.
const COMP_U = { tCol: { value: rt.textures[0] }, tDep: { value: rt.textures[1] }, uInv: { value: new THREE.Matrix4() }, uVPc: { value: new THREE.Matrix4() }, uFirm: { value: 0 }, uBlur: { value: 1 } };
const COMP_FS = (depthOnly: boolean) => /* glsl */`uniform sampler2D tCol, tDep; uniform mat4 uInv, uVPc; uniform float uFirm, uBlur; varying vec2 vUv;
void main() {
  // A small tent filter softens the march's grain at reduced resolution.
  vec2 px = 1.0 / vec2(textureSize(tCol, 0));
  vec4 c0 = texture2D(tCol, vUv);
  vec4 c = (texture2D(tCol, vUv + vec2(px.x, 0.0)) + texture2D(tCol, vUv - vec2(px.x, 0.0)) + texture2D(tCol, vUv + vec2(0.0, px.y)) + texture2D(tCol, vUv - vec2(0.0, px.y))) * 0.25;
  c = mix(c0, c0 * 0.4 + c * 0.6, uBlur);
  // Firming: thin cover thins away and solid cover turns opaque, as a card's edge does.
  if (uFirm > 0.0 && c.a > 1e-4) { float a2 = mix(c.a, smoothstep(0.12, 0.55, c.a), uFirm); c *= a2 / c.a; }
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

// The Dev row Cloud volumes: the pass marches the storms; the heap and middle cards stay.
// Dev knobs for the silhouette: resolution, edge, firming and blur.
export function setPassLook(o: { res?: number; edge?: number; firm?: number; blur?: number; layer?: boolean }) {
  if (o.layer != null) LAYER_U.uLayerOn.value = o.layer ? 1 : 0;
  if (o.res != null) passRes = o.res;
  if (o.edge != null) LAYER_U.uLayerEdge.value = o.edge;
  if (o.firm != null) COMP_U.uFirm.value = o.firm;
  if (o.blur != null) COMP_U.uBlur.value = o.blur;
}
export function setCloudPass(on: boolean) {
  state.cloudPass = on;
  // The storms march in the pass; their cards hide.
  tower.visible = !on;
  giants.visible = !on;
  // Flashes sit inside the marched towers' narrower cores.
  if (on) stormFl.vol = true;
  comp.visible = compDepth.visible = on;
  state.shaftOcc = null;
}
const vp = new THREE.Matrix4(), clear = new THREE.Color(), sp = new THREE.Vector3();
// Runs once a frame, before the composer.
export function drawCloudPass() {
  if (!state.cloudPass) return;
  const w = Math.max(1, Math.round(renderer.domElement.width * passRes)), h = Math.max(1, Math.round(renderer.domElement.height * passRes));
  if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
  camera.updateMatrixWorld();
  vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  LAYER_U.uLyInv.value.copy(vp).invert();
  COMP_U.uInv.value.copy(LAYER_U.uLyInv.value);
  COMP_U.uVPc.value.copy(vp);
  LAYER_U.uFarOn.value = farBake.on && FS_U.uFarG.value ? 1 : 0;
  // The storms drift as their cards did; each base sits on the curved ground.
  STORM_SPOTS.forEach((c, i) => {
    if (i > 3) return;
    const P = stormAt(c, state.simT, sp), dx = P.x - camera.position.x, dz = P.z - camera.position.z;
    LAYER_U.uSt.value[i].set(P.x, c.base - (dx * dx + dz * dz) / (2 * PLANET_R), P.z, c.H);
    LAYER_U.uStF.value[i].set(c.sd, c.kind, 1, c.base);
  });
  const ca = renderer.getClearAlpha();
  renderer.getClearColor(clear);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(rt);
  renderer.clear();
  renderer.render(passScene, camera);
  renderer.setRenderTarget(null);
  renderer.setClearColor(clear, ca);
}
