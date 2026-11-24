// Jet hover effects: the plume ribbons and the post chain.
// three.js 0.186 WebGPU; every shader is TSL.
import * as THREE from 'three/webgpu';
import {
  Fn, vec2, vec3, vec4, float, uniform, uv, pass, screenUV, screenCoordinate, mx_noise_float, renderOutput,
  mix, smoothstep, exp, abs, floor, max, min, dot, fract, sin, perspectiveDepthToViewZ, cameraNear, cameraFar,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';

const n2 = p => mx_noise_float(p).mul(0.5).add(0.5);

/* ---------- plume ribbons: view-facing strips along each nozzle axis ---------- */
// The CPU lays each strip toward the eye; uv x runs across in core radii, uv y is metres down the jet.
const SEG = 56;
function plumeMaterial(U) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  m.colorNode = Fn(() => {
    const q = uv();
    const t = q.y, xn = q.x, thr = U.thr;
    const edge = float(1.0).sub(smoothstep(0.7, 1.0, abs(xn).div(U.wide)));
    const flow = t.mul(1.2).sub(U.time.mul(thr.mul(9.0).add(5.0)));
    const tb = n2(vec2(xn.mul(1.6).add(U.seed), flow)).mul(0.6).add(n2(vec2(xn.mul(3.7).sub(U.seed), flow.mul(2.2))).mul(0.4));
    const flame = thr.mul(3.6).add(1.6);
    const along = exp(t.div(flame).negate());
    const core = exp(xn.mul(xn).mul(-2.6));
    const body = exp(xn.mul(xn).mul(-1.1)).mul(tb.mul(0.9).add(0.55));
    // Shock diamonds: rhombs along the axis, each dimmer than the last.
    const r = U.r.mul(t.mul(U.spread).add(1.0));
    const S = r.mul(2.0).mul(thr.mul(0.55).add(0.7));
    const k = t.div(S).sub(0.55), kc = floor(k.add(0.5)), f = k.sub(kc);
    const dsh = float(1.0).sub(abs(f).mul(2.6)).sub(abs(xn).mul(2.3));
    const dia = smoothstep(0.0, 0.7, dsh).mul(smoothstep(-0.51, -0.49, kc)).mul(exp(max(kc, 0.0).mul(thr.mul(0.4).sub(0.85))))
      .mul(smoothstep(0.1, 0.55, thr)).mul(tb.mul(0.5).add(0.75));
    const mouth = exp(t.mul(-3.2)).mul(core);
    // Hot yellow at the throat, orange, then violet blue down the jet.
    const cBody = mix(mix(vec3(1.0, 0.36, 0.1), vec3(0.75, 0.22, 0.5), smoothstep(0.3, 1.4, t)), vec3(0.3, 0.26, 0.95), smoothstep(1.2, 3.2, t));
    const col = vec3(1.0, 0.55, 0.2).mul(mouth).mul(thr.mul(1.4).add(0.8))
      .add(cBody.mul(body).mul(along).mul(thr.mul(1.3).add(0.45)))
      .add(vec3(1.0, 0.55, 0.28).mul(dia).mul(thr.mul(1.9).add(0.55)))
      .add(vec3(1.0, 0.32, 0.08).mul(exp(xn.mul(xn).mul(-0.1))).mul(0.05).mul(thr.add(0.3)).mul(exp(t.div(flame.mul(1.6)).negate())));
    // The cold lift-fan jet shows only as a faint grey sheet.
    const cold = vec3(0.05, 0.06, 0.08).mul(body).mul(thr.mul(0.7).add(0.3)).mul(0.25);
    // The cone's tail feathers out: a long fade, broken by the flow noise.
    const fz = U.len.mul(U.feather).max(0.3);
    const tail = float(1.0).sub(smoothstep(U.len.sub(fz), U.len, t.add(tb.sub(0.5).mul(fz).mul(0.8))));
    return mix(col, cold, U.cold).mul(edge).mul(U.gain).mul(tail.mul(tail));
  })();
  return m;
}

export function makePlumes(count) {
  const plumes = [];
  const side = new THREE.Vector3(), P = new THREE.Vector3(), V = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const U = {
      len: uniform(4), r: uniform(0.4), spread: uniform(0.11), wide: uniform(4.5), feather: uniform(0.5),
      thr: uniform(0.5), time: uniform(0), seed: uniform(i * 17.3), cold: uniform(0), gain: uniform(1),
    };
    const geo = new THREE.BufferGeometry();
    const pos = new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3);
    const tuv = new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 2), 2);
    pos.setUsage(THREE.DynamicDrawUsage); tuv.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pos);
    geo.setAttribute('uv', tuv);
    const idx = [];
    for (let s = 0; s < SEG; s++) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, plumeMaterial(U));
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    // Lays the strip from the nozzle n along axis a, facing the eye.
    const lay = (n, a, len, eye) => {
      U.len.value = len;
      for (let s = 0; s <= SEG; s++) {
        const t = (s / SEG) * len;
        P.copy(n).addScaledVector(a, t);
        side.crossVectors(a, V.copy(eye).sub(P).normalize()).normalize();
        const w = U.r.value * (1 + t * U.spread.value) * U.wide.value;
        for (let e = 0; e < 2; e++) {
          const sg = e ? 1 : -1, k = s * 2 + e;
          pos.setXYZ(k, P.x + side.x * w * sg, P.y + side.y * w * sg, P.z + side.z * w * sg);
          tuv.setXY(k, sg * U.wide.value, t);
        }
      }
      pos.needsUpdate = true; tuv.needsUpdate = true;
    };
    plumes.push({ mesh, U, lay });
  }
  return plumes;
}

/* ---------- post: heat bend, the gas over the scene, bloom, the grade ---------- */
// sceneZ is the scene's view z at a pixel; the gas volume uses it to hide behind the craft.
export function makePost({ renderer, scene, camera, volScene, heatScene, planeScene }) {
  const pipe = new THREE.RenderPipeline(renderer);
  pipe.outputColorTransform = false;
  const scenePass = pass(scene, camera);
  const depth = scenePass.getTextureNode('depth');
  const sceneZ = () => perspectiveDepthToViewZ(depth.sample(screenUV).x, cameraNear, cameraFar);
  const volPass = pass(volScene, camera);
  volPass.setResolutionScale(0.5);
  const heatPass = pass(heatScene, camera);
  heatPass.setResolutionScale(0.5);
  // The 2D heat plane draws at full size, so its filaments stay sharp.
  const planePass = pass(planeScene, camera);
  const U = {
    res: uniform(new THREE.Vector2(1, 1)), amp: uniform(1), bend: uniform(45), time: uniform(0),
    vol: uniform(0.32), seed: uniform(0), grain: uniform(1), asp: uniform(1.6), cap: uniform(3), tap: uniform(3), occ: uniform(0.6),
    heatBlur: uniform(1.5), gasBlur: uniform(1.0), bendT: uniform(12),
    // Dev view: the 2D plane's heat in red.
    viewHeat: uniform(0),
    key: uniform(new THREE.Color(0.8, 0.9, 1.06)), pull: uniform(0.3),
  };
  // The heat sum is blurred before its slope is taken.
  // The march dithers each pixel; a raw slope bends the frame pixel by pixel.
  const heat = gaussianBlur(heatPass, U.heatBlur, 4).getTextureNode();
  const plane = gaussianBlur(planePass, U.heatBlur, 2).getTextureNode();
  const blurred = gaussianBlur(volPass, U.gasBlur, 3);
  // The hot gas bends the frame along the gradient of its summed shimmer.
  const bentUV = Fn(() => {
    // The gradient taps widen with the zoom, so the bend stays smooth.
    const px = vec2(U.tap).div(U.res);
    const hx = heat.sample(screenUV.add(vec2(px.x, 0.0))).r.sub(heat.sample(screenUV.sub(vec2(px.x, 0.0))).r);
    const hy = heat.sample(screenUV.add(vec2(0.0, px.y))).r.sub(heat.sample(screenUV.sub(vec2(0.0, px.y))).r);
    // The 2D heat plane bends the frame along its own slope.
    const tx = plane.sample(screenUV.add(vec2(px.x, 0.0))).r.sub(plane.sample(screenUV.sub(vec2(px.x, 0.0))).r);
    const ty = plane.sample(screenUV.add(vec2(0.0, px.y))).r.sub(plane.sample(screenUV.sub(vec2(0.0, px.y))).r);
    const off = vec2(hx, hy).mul(U.bend).add(vec2(tx, ty).mul(U.bendT)).mul(U.amp).toVar();
    // A long path through hot gas must not tear the frame: the bend caps at cap px.
    off.mulAssign(min(1.0, U.amp.mul(U.cap).div(max(off.length(), 1e-4))));
    return screenUV.add(off.div(U.res));
  })();
  const sceneCol = scenePass.getTextureNode().sample(bentUV);
  const gasCol = blurred.getTextureNode().sample(bentUV).mul(U.vol);
  // Smoke dims the scene behind it; the lit gas then adds over.
  // Five taps soften the volume's dither in the smoke sum.
  const sumAt = Fn(() => {
    const d = vec2(2.5).div(U.res);
    return heat.sample(screenUV).b.mul(0.4)
      .add(heat.sample(screenUV.add(vec2(d.x, 0.0))).b.mul(0.15)).add(heat.sample(screenUV.sub(vec2(d.x, 0.0))).b.mul(0.15))
      .add(heat.sample(screenUV.add(vec2(0.0, d.y))).b.mul(0.15)).add(heat.sample(screenUV.sub(vec2(0.0, d.y))).b.mul(0.15));
  })();
  const behind = exp(sumAt.mul(U.occ).negate());
  const view = vec3(plane.sample(screenUV).r.mul(3.0).mul(U.viewHeat), 0.0, 0.0);
  const lit = vec4(sceneCol.rgb.mul(behind).add(gasCol.rgb).add(view), 1.0);
  const glow = bloom(lit, 0.55, 0.6, 0.85);
  const tone = renderOutput(lit.add(glow));
  // The Villeneuve grade: colour falls toward one cool key; highs go to cream.
  pipe.outputNode = Fn(() => {
    const c = tone.rgb;
    const l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    const keyed = mix(c, vec3(l).mul(mix(U.key, vec3(1.0, 0.97, 0.9), smoothstep(0.5, 1.0, l).mul(0.7))), U.pull);
    const q = screenUV.sub(0.5).mul(vec2(U.asp, 1.0));
    const vig = float(1.0).sub(dot(q, q).mul(0.42));
    const g = fract(sin(dot(screenCoordinate.xy.add(U.seed), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5);
    const out = keyed.mul(vig).add(g.mul(0.018).mul(U.grain).mul(keyed.add(0.15)));
    // Milky blacks: the print never reaches full black.
    return vec4(out.mul(0.985).add(vec3(0.008, 0.01, 0.014)), 1.0);
  })();
  return { pipe, U, sceneZ, glow, volPass, heatPass, planePass };
}
