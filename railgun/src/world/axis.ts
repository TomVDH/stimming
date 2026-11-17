// Load order: setup runs first.
import '../setup.ts';
import * as THREE from 'three';
import { state } from '../state.ts';
import { rad } from '../setup.ts';

/* ---------- the gun's axis ---------- */
// One unit is one metre. The trunnion sits 245 m over the origin.
// LIFT: the plinth's height over the sand; 0 sets it on the sand.
// The barrel climbs at 6 degrees toward negative z.
// Station 0 is the trunnion; station 1 is the muzzle, 900 m on.
export const LIFT = 0, BERM_R = 660;
// The barrel runs 1046 m from the trunnion.
// RISE lifts the trunnion and the whole mount over the old 215 m.
export const RISE = 20;
export const ELEV = rad(6), L = 1046, TRUN_Y = 215 + RISE + LIFT;
export const AX = new THREE.Vector3(0, Math.sin(ELEV), -Math.cos(ELEV));
export const AX_UP = new THREE.Vector3(0, Math.cos(ELEV), Math.sin(ELEV));
export const A0 = new THREE.Vector3(0, TRUN_Y, 0);
export const axisAt = (s: number, out: THREE.Vector3) => out.copy(A0).addScaledVector(AX, L * s);
// The bore starts behind the trunnion.
export const BREECH = -0.25;
// The rock ends its fall 40 km out, low over the horizon.
// The bolt takes seconds to reach it.
export const DA = 40000;
export const yUp = new THREE.Vector3(0, 1, 0);
// The fall ends at END0; it starts FALL metres back along AWAY0.
export const END0 = new THREE.Vector3(Math.sin(rad(1)) * Math.cos(ELEV), Math.sin(ELEV), -Math.cos(rad(1)) * Math.cos(ELEV)).multiplyScalar(DA).add(A0);
export const AWAY0 = new THREE.Vector3(-12500, 12000, -3500).normalize();
export const FALL = 17680;
// A point on the barrel: a metres along, x across, u up.
// SY and CY hold the mount's yaw, left of negative z.
state.SE = Math.sin(ELEV); state.CE = Math.cos(ELEV); state.SY = 0; state.CY = 1;
export const barrelPt = (a: number, x: number, u: number, out: THREE.Vector3) => { const z = -a * state.CE + u * state.SE; return out.set(x * state.CY + z * state.SY, TRUN_Y + a * state.SE + u * state.CE, z * state.CY - x * state.SY); };
export const MUZZLE = axisAt(1, new THREE.Vector3());
