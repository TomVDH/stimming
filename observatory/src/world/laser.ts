// Load order: world/woods runs first.
import './woods.ts';
import { CylinderGeometry, MathUtils, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { AltAz } from '../core/sky.ts';
import { scene } from '../setup.ts';

/* ---------- the aiming laser: a thin green beam into the sky ---------- */
const DEG = MathUtils.DEG2RAD;
// The beam stops short of the star shell.
const LENGTH = 3800;

// Unit vector for an altitude and azimuth: -Z is north, +X is east.
export function altAzDir(a: AltAz, out = new Vector3()): Vector3 {
  const c = Math.cos(a.alt * DEG);
  return out.set(c * Math.sin(a.az * DEG), Math.sin(a.alt * DEG), -c * Math.cos(a.az * DEG));
}

export type Laser = { mesh: Mesh; aim(from: Vector3, a: AltAz): void; visible: boolean };

export function buildLaser(): Laser {
  // A unit cylinder that grows along +Y from its foot.
  // It is 0.5 m wide, so it shows from the rise 300 m away.
  const geo = new CylinderGeometry(0.25, 0.25, 1, 6, 1, true).translate(0, 0.5, 0);
  const mesh = new Mesh(geo, new MeshBasicMaterial({ color: 0x33ff66 }));
  mesh.scale.set(1, LENGTH, 1);
  const dir = new Vector3(), up = new Vector3(0, 1, 0);
  return {
    mesh,
    aim(from, a) {
      mesh.position.copy(from);
      mesh.quaternion.setFromUnitVectors(up, altAzDir(a, dir));
    },
    get visible() { return mesh.visible; },
    set visible(v: boolean) { mesh.visible = v; },
  };
}

export const laser = buildLaser();
scene.add(laser.mesh);
