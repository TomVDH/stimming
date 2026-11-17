// Load order: world/observatory runs first.
import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { DRUM_H, PIVOT_Y, TUBE_BACK, TUBE_FRONT, TUBE_R } from './observatory.ts';

/* ---------- the hero telescope ---------- */
// STUB: the light model's plain tube.
// The controller swaps in the real hero scope.
// Origin, axes and units match buildDome(size) in world/observatory.ts.
// setTube takes the altitude and the azimuth in degrees, as Dome.setTube does.

export type HeroScope = { root: Group; glass: Mesh; setTube(alt: number, az: number): void };

const DEG = Math.PI / 180;

export function buildHeroScope(size: number): HeroScope {
  const root = new Group();
  root.scale.setScalar(size);
  const dark = new MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.6 });
  const steel = new MeshStandardMaterial({ color: 0xa8b0b8, metalness: 0.3, roughness: 0.42 });
  // The fork turns in azimuth on the pier's cap.
  const fork = new Group();
  fork.position.y = DRUM_H;
  root.add(fork);
  const base = new Mesh(new CylinderGeometry(0.7, 0.7, 0.2, 24), dark);
  base.position.y = 0.1;
  fork.add(base);
  for (const s of [-1, 1]) {
    const arm = new Mesh(new BoxGeometry(0.16, PIVOT_Y + 0.2, 0.4), dark);
    arm.position.set(s * 0.62, 0.2 + (PIVOT_Y + 0.2) / 2 - 0.1, 0);
    fork.add(arm);
  }
  // The tube points along local -Z at altitude zero.
  const tube = new Group();
  tube.position.y = PIVOT_Y;
  fork.add(tube);
  const body = new Mesh(new CylinderGeometry(TUBE_R, TUBE_R, TUBE_FRONT + TUBE_BACK, 24), steel);
  body.rotation.x = -Math.PI / 2;
  body.position.z = -(TUBE_FRONT - TUBE_BACK) / 2;
  tube.add(body);
  // The objective glass closes the tube's front.
  const glass = new Mesh(new CircleGeometry(TUBE_R * 0.92, 32), new MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.08 }));
  glass.position.z = -TUBE_FRONT - 0.002;
  glass.rotation.y = Math.PI;
  tube.add(glass);
  return {
    root,
    glass,
    setTube(alt, az) {
      fork.rotation.y = -az * DEG;
      tube.rotation.x = alt * DEG;
    },
  };
}
