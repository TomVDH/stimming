// Load order: world/complex runs first.
import './complex.ts';
import { Color, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { complex } from './complex.ts';
import { disposeTree, onLeave } from '../setup.ts';

/* ---------- the tracking lamp: a small amber light on the main dome's drum ---------- */
// The drum has a 3.2 m radius; the door faces the camera. The lamp sits right of the door.
// Linear colours; on crosses the bloom threshold.
const OFF = new Color(0.02, 0.012, 0.006), ON = new Color(5, 2, 0.4);

const mat = new MeshBasicMaterial({ color: OFF.clone() });
const bulb = new Mesh(new SphereGeometry(0.1, 12, 8), mat);
bulb.position.set(1.05, 2.3, -3.25);
complex.main.root.add(bulb);
onLeave(() => disposeTree(bulb));

export const trackingLamp = {
  set(on: boolean): void { mat.color.copy(on ? ON : OFF); },
};
