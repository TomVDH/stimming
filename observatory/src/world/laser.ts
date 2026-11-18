// Load order: world/woods runs first.
import './woods.ts';
// The ribbon and its shimmer are copied from railgun/src/gun/laser.ts.
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, MathUtils, Mesh, ShaderMaterial, Vector2, Vector3 } from 'three';
import { reduced } from '../../../shared/stim.js';
import { HAZE_H } from '../sky/haze.ts';
import type { AltAz } from '../core/sky.ts';
import { disposeTree, onLeave, scene } from '../setup.ts';

/* ---------- the aiming laser: a thin green beam into the sky ---------- */
const DEG = MathUtils.DEG2RAD;
// The beam stops short of the star shell.
const LENGTH = 3800;
// A 532 nm laser in linear sRGB, clipped into the gamut.
const GREEN = '0.0, 1.0, 0.06';
// The beam shows by the haze it lights.
// The low haze makes it solid near the dome.
// Thin high air keeps a trace.
// Core gains on the low haze and the high air.
// HIGH_H is the high air's scale height in metres.
const CORE_LOW = 0.28, CORE_HIGH = 0.17, HIGH_H = 600;
// The soft scatter glow shows only in the low haze.
const GLOW_LOW = 0.07;
// Widths across the beam in CSS pixels, full width at half peak.
// The far widths hold from the rise.
// The near widths hold in the close shots.
const CORE_FAR = 1.5, CORE_NEAR = 2.5, GLOW_FAR = 5, GLOW_NEAR = 9;
// Eye distances in metres for the near widths and the far widths.
const NEAR_D = 50, FAR_D = 200;
// The far beam dims by e every FADE metres.
const FADE = 1800;
// The beam fades in over its first half metre out of the slit.
const START = 0.5;
// Dust in the low haze makes the beam shimmer in moving knots.
const SHIMMER = 0.1;
// The ribbon is this many glow widths across.
const SPAN = 3;

// Unit vector for an altitude and azimuth: -Z is north, +X is east.
export function altAzDir(a: AltAz, out = new Vector3()): Vector3 {
  const c = Math.cos(a.alt * DEG);
  return out.set(c * Math.sin(a.az * DEG), Math.sin(a.alt * DEG), -c * Math.cos(a.az * DEG));
}

export type Laser = { mesh: Mesh; aim(from: Vector3, a: AltAz): void; foot(p: Vector3): void; level(k: number): void; visible: boolean };

const f = (x: number): string => x.toFixed(4);

export function buildLaser(): Laser {
  // A ribbon a few pixels wide, built in screen space.
  // aE: 0 at the foot, 1 at the end.
  // aS: the side, -1 or 1.
  const geo = new BufferGeometry()
    .setAttribute('position', new BufferAttribute(new Float32Array(12), 3))
    .setAttribute('aE', new BufferAttribute(new Float32Array([0, 0, 1, 1]), 1))
    .setAttribute('aS', new BufferAttribute(new Float32Array([-1, 1, -1, 1]), 1))
    .setIndex([0, 2, 1, 1, 2, 3]);
  const mat = new ShaderMaterial({
    // uK fades the beam in after the opening.
    // uRes is the canvas in CSS pixels.
    // uT moves the shimmer.
    uniforms: { uFoot: { value: 0 }, uK: { value: 1 }, uRes: { value: new Vector2(1, 1) }, uT: { value: 0 } },
    transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending,
    vertexShader: /* glsl */`
    attribute float aE, aS;
    uniform vec2 uRes;
    // The values across the ribbon carry a factor of w.
    // The fragment divides by vW, so the axis stays straight at any depth.
    varying float vE, vX, vH, vN, vW;
    varying vec3 vP;
    void main() {
      // The mesh's matrix holds the foot and the beam along its Y axis.
      vec3 A = modelMatrix[3].xyz, B = A + modelMatrix[1].xyz;
      vec4 a = viewMatrix * vec4(A, 1.0), b = viewMatrix * vec4(B, 1.0);
      // Only the part in front of the eye draws.
      const float ZN = -0.2;
      if (a.z > ZN && b.z > ZN) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
      float cut = (a.z - ZN) / (a.z - b.z);
      float e0 = a.z > ZN ? cut : 0.0, e1 = b.z > ZN ? cut : 1.0;
      vec4 pa = projectionMatrix * mix(a, b, e0), pb = projectionMatrix * mix(a, b, e1);
      vE = mix(e0, e1, aE);
      vec4 v = mix(a, b, vE);
      vP = mix(A, B, vE);
      vec2 d = (pb.xy / pb.w - pa.xy / pa.w) * uRes;
      d = dot(d, d) > 1e-8 ? normalize(d) : vec2(1.0, 0.0);
      float near_ = 1.0 - smoothstep(${f(NEAR_D)}, ${f(FAR_D)}, length(v.xyz));
      float hw = ${f(SPAN / 2)} * mix(${f(GLOW_FAR)}, ${f(GLOW_NEAR)}, near_);
      vec4 p = projectionMatrix * v;
      vW = p.w; vX = aS * hw * p.w; vH = hw * p.w; vN = near_ * p.w;
      // The ribbon's width holds in pixels at any range.
      p.xy += vec2(-d.y, d.x) * aS * hw * 2.0 / uRes * p.w;
      gl_Position = p;
    }`,
    fragmentShader: /* glsl */`
    uniform float uFoot, uK, uT;
    varying float vE, vX, vH, vN, vW;
    varying vec3 vP;
    void main() {
      // x: pixels from the beam's axis.
      // q: the same as a share of the ribbon's half width.
      float x = vX / vW, q = x / (vH / vW), near_ = vN / vW;
      // Gaussian sigmas from the widths at half peak.
      float sc = mix(${f(CORE_FAR)}, ${f(CORE_NEAR)}, near_) / 2.3548;
      float sg = mix(${f(GLOW_FAR)}, ${f(GLOW_NEAR)}, near_) / 2.3548;
      float core = exp(-0.5 * x * x / (sc * sc));
      // The window takes the glow to zero at the ribbon's edge.
      float glow = exp(-0.5 * x * x / (sg * sg)) * max(1.0 - q * q, 0.0);
      float up = max(vP.y - uFoot, 0.0), s = vE * ${f(LENGTH)};
      float low = exp(-up / ${f(HAZE_H)}), high = exp(-up / ${f(HIGH_H)});
      // Railgun's shimmer, in knots along the beam.
      float sh = 1.0 + ${f(SHIMMER)} * low * sin(uT * 31.0 + s * 9.0) * sin(uT * 17.0 - s * 3.4);
      float k = (${f(CORE_LOW)} * low + ${f(CORE_HIGH)} * high) * core + ${f(GLOW_LOW)} * low * glow;
      // The far beam dims with range and ends soft.
      k *= exp(-s / ${f(FADE)}) * (1.0 - smoothstep(0.55, 1.0, vE)) * smoothstep(0.0, ${f(START)}, s);
      gl_FragColor = vec4(vec3(${GREEN}) * k * sh * uK, 1.0);
    }`,
  });
  const mesh = new Mesh(geo, mat);
  // The shader places the ribbon, so the bounds mean nothing.
  mesh.frustumCulled = false;
  // The beam draws after the opaque scene.
  mesh.renderOrder = 1;
  mesh.scale.set(1, LENGTH, 1);
  // Each drawn frame reads the canvas size and the shimmer time.
  // The idle page draws no frames, so the shimmer rests.
  // Reduced motion holds the shimmer still.
  mesh.onBeforeRender = (r) => {
    r.getSize(mat.uniforms.uRes.value);
    if (!reduced()) mat.uniforms.uT.value = (performance.now() / 1000) % 1000;
  };
  const dir = new Vector3(), up = new Vector3(0, 1, 0);
  return {
    mesh,
    aim(from, a) {
      mesh.position.copy(from);
      mat.uniforms.uFoot.value = from.y;
      mesh.quaternion.setFromUnitVectors(up, altAzDir(a, dir));
    },
    // Moves the foot and keeps the direction.
    foot(p) {
      mesh.position.copy(p);
      mat.uniforms.uFoot.value = p.y;
    },
    // 0 hides the beam.
    // 1 shows it in full.
    level(k) {
      mat.uniforms.uK.value = k;
      mesh.visible = k > 0;
    },
    get visible() { return mesh.visible; },
    set visible(v: boolean) { mesh.visible = v; },
  };
}

export const laser = buildLaser();
scene.add(laser.mesh);
onLeave(() => disposeTree(laser.mesh));
