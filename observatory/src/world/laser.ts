// Load order: world/woods runs first.
import './woods.ts';
import { AdditiveBlending, CylinderGeometry, MathUtils, Mesh, ShaderMaterial, Vector3 } from 'three';
import { HAZE_H } from '../sky/haze.ts';
import type { AltAz } from '../core/sky.ts';
import { scene } from '../setup.ts';

/* ---------- the aiming laser: a thin green beam into the sky ---------- */
const DEG = MathUtils.DEG2RAD;
// The beam stops short of the star shell.
const LENGTH = 3800;
// The beam shows by the haze it lights.
// The low haze makes it solid near the dome; thin high air keeps a trace.
// Gains on the low haze and the high air; heights in metres.
const LOW_K = 2.2, HIGH_K = 0.5, HIGH_H = 600;

// Unit vector for an altitude and azimuth: -Z is north, +X is east.
export function altAzDir(a: AltAz, out = new Vector3()): Vector3 {
  const c = Math.cos(a.alt * DEG);
  return out.set(c * Math.sin(a.az * DEG), Math.sin(a.alt * DEG), -c * Math.cos(a.az * DEG));
}

export type Laser = { mesh: Mesh; aim(from: Vector3, a: AltAz): void; level(k: number): void; visible: boolean };

export function buildLaser(): Laser {
  // A unit cylinder that grows along +Y from its foot.
  // It is 0.5 m wide, so it shows from the rise 300 m away.
  const geo = new CylinderGeometry(0.25, 0.25, 1, 6, 1, true).translate(0, 0.5, 0);
  const mat = new ShaderMaterial({
    // uK fades the beam in after the opening.
    uniforms: { uFoot: { value: 0 }, uK: { value: 1 } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: /* glsl */`varying float vY; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
    uniform float uFoot, uK;
    varying float vY;
    void main() {
      float up = max(vY - uFoot, 0.0);
      float k = ${LOW_K.toFixed(1)} * exp(-up / ${HAZE_H.toFixed(1)}) + ${HIGH_K.toFixed(2)} * exp(-up / ${HIGH_H.toFixed(1)});
      gl_FragColor = vec4(vec3(0.03, 1.0, 0.12) * k * uK, 1.0);
    }`,
  });
  const mesh = new Mesh(geo, mat);
  // The beam draws after the opaque scene.
  mesh.renderOrder = 1;
  mesh.scale.set(1, LENGTH, 1);
  const dir = new Vector3(), up = new Vector3(0, 1, 0);
  return {
    mesh,
    aim(from, a) {
      mesh.position.copy(from);
      mat.uniforms.uFoot.value = from.y;
      mesh.quaternion.setFromUnitVectors(up, altAzDir(a, dir));
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
