// Load order: world/complex runs first.
import './complex.ts';
import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { complex } from './complex.ts';

/* ---------- the tracking lamp: a small amber light on the main dome's drum ---------- */
// The drum has a 3.2 m radius; the door faces the camera. The lamp sits right of the door.
const OFF = 0x2b1d12, ON = 0xffa63d;

const mat = new MeshBasicMaterial({ color: OFF });
const bulb = new Mesh(new SphereGeometry(0.1, 12, 8), mat);
bulb.position.set(1.05, 2.3, -3.25);
complex.main.root.add(bulb);

export const trackingLamp = {
  set(on: boolean): void { mat.color.setHex(on ? ON : OFF); },
};
