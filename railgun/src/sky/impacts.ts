// Load order: sky/air runs first.
import './air.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';

/* ---------- the ship's impacts: light on the horizon and the cloud bases ---------- */
// uImp: each hulk's impact site and its flash level.
// Only the sky dome and the clouds read it.
// The plain and the gun stay dark at night.
export const IMP_U = {
  uImp: { value: Array.from({ length: 5 }, () => new THREE.Vector4()) },
  uImpC: { value: new THREE.Vector3(...linFit(0.86, 0.09, 55)) },
  // uImpCK: the cloud light's gain, 0 only for a QA check.
  uImpCK: { value: 1 },
};
export const IMP_GLSL = /* glsl */`
uniform vec4 uImp[5];
uniform vec3 uImpC;
uniform float uImpCK;
// A tight glow sits over each site.
// A wide band runs along the horizon.
// The wide band reaches a phone's narrow frame.
vec3 impSky(vec3 dir) {
  float hl = length(dir.xz), s = 0.0;
  if (hl < 1e-3) return vec3(0.0);
  vec2 dh = dir.xz / hl;
  float up = max(dir.y, 0.0);
  for (int i = 0; i < 5; i++) {
    float w = uImp[i].w;
    if (w < 0.001) continue;
    float az = acos(clamp(dot(dh, normalize(uImp[i].xz - cameraPosition.xz)), -1.0, 1.0));
    s += w * (2.5 * exp(-az / 0.08) * exp(-up / 0.03) + 0.5 * exp(-az / 0.5) * exp(-up / 0.08));
  }
  // A bright day sky needs a stronger flash to show.
  return uImpC * s * mix(3.0, 1.0, uStars) * smoothstep(-0.03, 0.0, dir.y);
}
`;
