// East Van: the lens. It turns the lit scene into the Toy-town picture.
// Passes: normals and depth, colour, ambient occlusion, bloom, composite, lens.
// The composite draws the ink line. The lens pass blurs by depth and grades.
import * as THREE from 'three';
import { linFit } from '../shared/stim.js';
import { GRADE } from '../shared/grade.js';

const VERT = 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const COMMON = /* glsl */`
  uniform sampler2D tDepth, tNrm;
  uniform float uNear, uFar;
  varying vec2 vUv;
  float rawZ(vec2 uv) { return texture2D(tDepth, uv).x; }
  float linZ(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
  vec3 nrm(vec2 uv) { return texture2D(tNrm, uv).xyz * 2.0 - 1.0; }
  // Interleaved gradient noise: one value per pixel, no pattern.
  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

// Ambient occlusion at half size: 14 taps in the hemisphere over the surface.
const AO = COMMON + /* glsl */`
  uniform mat4 uProj, uProjInv;
  vec3 vpos(vec2 uv) { vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, rawZ(uv) * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
  void main() {
    if (rawZ(vUv) > 0.9999) { gl_FragColor = vec4(1.0); return; }
    vec3 P = vpos(vUv), N = normalize(nrm(vUv));
    vec3 up = abs(N.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 T = normalize(cross(up, N)), B = cross(N, T);
    float rnd = ign(gl_FragCoord.xy), occ = 0.0;
    const float R = 0.75;
    for (int i = 0; i < 14; i++) {
      float fi = float(i), a = (fi + rnd) * 2.39996, r = sqrt((fi + 0.5) / 14.0);
      vec3 d = T * cos(a) * r + B * sin(a) * r + N * sqrt(max(0.0, 1.0 - r * r));
      vec3 S = P + d * R * mix(0.2, 1.0, fract(fi * 0.618 + rnd));
      vec4 q = uProj * vec4(S, 1.0);
      float sz = vpos(q.xy / q.w * 0.5 + 0.5).z;
      // A tap counts when the scene stands in front of it, and near it.
      occ += step(S.z + 0.04, sz) * smoothstep(0.0, 1.0, R / max(abs(P.z - sz), 0.0001));
    }
    gl_FragColor = vec4(1.0 - occ / 14.0);
  }`;

// Bloom source: only the pixels that carry the glow mask.
const EXTRACT = /* glsl */`
  uniform sampler2D tCol; uniform vec2 uTexel; varying vec2 vUv;
  void main() {
    vec3 sum = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec4 c = texture2D(tCol, vUv + uTexel * vec2(i < 2 ? -1.0 : 1.0, mod(float(i), 2.0) < 0.5 ? -1.0 : 1.0));
      sum += c.rgb * (1.0 - c.a) * 2.0;
    }
    gl_FragColor = vec4(sum * 0.25, 1.0);
  }`;
const BLUR = /* glsl */`
  uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
    c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;
    c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.07;
    gl_FragColor = vec4(c, 1.0);
  }`;

// Composite: occlusion, the ink line, bloom. Output stays linear.
const COMP = COMMON + /* glsl */`
  uniform sampler2D tCol, tAO, tBloom;
  uniform vec2 uRes; uniform float uDpr, uBloom, uAO; uniform vec3 uInk, uShade;
  // An edge is a step in depth or a turn in the normal.
  float edge(vec2 uv) {
    vec2 o = 0.9 * uDpr / uRes, ox = vec2(o.x, 0.0), oy = vec2(0.0, o.y);
    float d0 = linZ(rawZ(uv));
    float lap = abs(linZ(rawZ(uv - ox)) + linZ(rawZ(uv + ox)) - 2.0 * d0) + abs(linZ(rawZ(uv - oy)) + linZ(rawZ(uv + oy)) - 2.0 * d0);
    vec3 n0 = nrm(uv);
    float turn = 4.0 - dot(n0, nrm(uv - ox)) - dot(n0, nrm(uv + ox)) - dot(n0, nrm(uv - oy)) - dot(n0, nrm(uv + oy));
    return max(smoothstep(0.014, 0.05, lap), smoothstep(0.3, 0.8, turn));
  }
  void main() {
    vec4 c = texture2D(tCol, vUv);
    float glow = clamp((1.0 - c.a) * 2.0, 0.0, 1.0);
    // Four taps smooth the half-size occlusion.
    vec2 h = 2.0 / uRes;
    float ao = 0.25 * (texture2D(tAO, vUv + h * vec2(-1.0, -1.0)).r + texture2D(tAO, vUv + h * vec2(1.0, -1.0)).r + texture2D(tAO, vUv + h * vec2(-1.0, 1.0)).r + texture2D(tAO, vUv + h * vec2(1.0, 1.0)).r);
    ao = mix(1.0, ao, uAO * (1.0 - glow));
    vec3 col = c.rgb * mix(uShade, vec3(1.0), ao);
    col = mix(col, uInk, edge(vUv) * (1.0 - 0.5 * glow));
    col += texture2D(tBloom, vUv).rgb * uBloom;
    gl_FragColor = vec4(col, 1.0);
  }`;

// Lens: a disc blur that grows away from the focus depth, then the grade.
const LENS = COMMON + /* glsl */`
  uniform sampler2D tComp;
  uniform vec2 uRes; uniform float uFocus, uBand, uRange, uBlur;
  ${GRADE}
  float coc(vec2 uv) {
    float d = rawZ(uv);
    return d > 0.9999 ? 0.0 : smoothstep(uBand, uBand + uRange, abs(linZ(d) - uFocus));
  }
  vec3 shoulder(vec3 c) { vec3 t = max(c - 0.8, 0.0); return min(c, 0.8) + 0.2 * (1.0 - exp(-t / 0.2)); }
  void main() {
    vec3 acc = texture2D(tComp, vUv).rgb;
    float sum = 1.0, rot = ign(gl_FragCoord.xy) * 6.2832;
    for (int i = 0; i < 16; i++) {
      float fi = float(i), r = sqrt((fi + 0.5) / 16.0) * uBlur, a = fi * 2.39996 + rot;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes;
      // A tap reaches this pixel only when its own blur is that wide.
      float w = smoothstep(r - 1.0, r + 1.0, coc(uv) * uBlur);
      acc += texture2D(tComp, uv).rgb * w; sum += w;
    }
    vec3 col = gdGrade(acc / sum, vUv, uRes.x / uRes.y, gl_FragCoord.xy, vec3(0.0), 0.22, 0.55, 0.03);
    gl_FragColor = vec4(pow(clamp(shoulder(col), 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
  }`;

export function createLens(renderer) {
  renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;
  const half = THREE.HalfFloatType;
  const rtCol = new THREE.WebGLRenderTarget(1, 1, { type: half, samples: 4 });
  const rtNrm = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
  const rtAO = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const rtB0 = new THREE.WebGLRenderTarget(1, 1, { type: half, depthBuffer: false }), rtB1 = rtB0.clone();
  const rtComp = new THREE.WebGLRenderTarget(1, 1, { type: half, depthBuffer: false });
  const depth = { tDepth: { value: rtNrm.depthTexture }, tNrm: { value: rtNrm.texture }, uNear: { value: 1 }, uFar: { value: 100 } };
  const res = { value: new THREE.Vector2(1, 1) }, dpr = { value: 1 };
  const pass = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const ao = pass(AO, { ...depth, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() } });
  const extract = pass(EXTRACT, { tCol: { value: rtCol.texture }, uTexel: { value: new THREE.Vector2() } });
  const blur = pass(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
  const comp = pass(COMP, {
    ...depth, tCol: { value: rtCol.texture }, tAO: { value: rtAO.texture }, tBloom: { value: rtB0.texture }, uRes: res, uDpr: dpr,
    uBloom: { value: 0.9 }, uAO: { value: 0.85 },
    uInk: { value: new THREE.Color().setRGB(...linFit(0.22, 0.06, 275)) }, uShade: { value: new THREE.Color().setRGB(...linFit(0.5, 0.09, 290)) },
  });
  const lens = pass(LENS, { ...depth, tComp: { value: rtComp.texture }, uRes: res, uFocus: { value: 50 }, uBand: { value: 5 }, uRange: { value: 14 }, uBlur: { value: 6 } });
  const tri = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)), ao);
  tri.frustumCulled = false;
  const quad = new THREE.Scene().add(tri), quadCam = new THREE.Camera();
  const normalMat = new THREE.MeshNormalMaterial(), flatNormal = new THREE.Color().setRGB(0.5, 0.5, 1), black = new THREE.Color(0, 0, 0);
  const draw = (mat, target) => { tri.material = mat; renderer.setRenderTarget(target); renderer.render(quad, quadCam); };
  let bw = 1, bh = 1;

  return {
    uniforms: { comp: comp.uniforms, lens: lens.uniforms },
    resize(W, H, ratio) {
      rtCol.setSize(W, H); rtNrm.setSize(W, H); rtComp.setSize(W, H);
      rtAO.setSize(Math.ceil(W / 2), Math.ceil(H / 2));
      bw = Math.ceil(W / 4); bh = Math.ceil(H / 4);
      rtB0.setSize(bw, bh); rtB1.setSize(bw, bh);
      res.value.set(W, H); dpr.value = ratio;
      extract.uniforms.uTexel.value.set(2 / W, 2 / H);
      lens.uniforms.uBlur.value = 5.5 * ratio;
    },
    // focus is the distance from the camera to the sharp plane.
    // noInk objects stay out of the depth pass: no line, no occlusion.
    render(scene, camera, focus, noInk = []) {
      renderer.info.reset();
      depth.uNear.value = camera.near; depth.uFar.value = camera.far;
      const bg = scene.background;
      scene.background = null; scene.overrideMaterial = normalMat;
      for (const o of noInk) o.visible = false;
      renderer.setRenderTarget(rtNrm); renderer.setClearColor(flatNormal, 1); renderer.clear();
      renderer.render(scene, camera);
      scene.background = bg; scene.overrideMaterial = null;
      for (const o of noInk) o.visible = true;
      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(rtCol); renderer.setClearColor(black, 1); renderer.clear();
      renderer.render(scene, camera);
      ao.uniforms.uProj.value.copy(camera.projectionMatrix); ao.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
      draw(ao, rtAO);
      draw(extract, rtB0);
      // Two rounds of blur: a tight core, then a wide halo.
      for (const k of [1, 2.6]) {
        blur.uniforms.tSrc.value = rtB0.texture; blur.uniforms.uDir.value.set(k / bw, 0); draw(blur, rtB1);
        blur.uniforms.tSrc.value = rtB1.texture; blur.uniforms.uDir.value.set(0, k / bh); draw(blur, rtB0);
      }
      draw(comp, rtComp);
      lens.uniforms.uFocus.value = focus;
      draw(lens, null);
    },
  };
}
