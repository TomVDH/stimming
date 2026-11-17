// Load order: sky/air runs first.
import './air.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import IMP_GLSL from './impacts.glsl';
export { IMP_GLSL };

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
