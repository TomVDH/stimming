// Load order: world/complex runs first.
import './complex.ts';
import { Color, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { complex } from './complex.ts';
import { BIG_DOOR_K, BIG_WALL_R } from './observatory.ts';
import { disposeTree, onLeave } from '../setup.ts';

/* ---------- the tracking lamp: a small amber light on the main dome's wall ---------- */
// The door faces the camera.
// The lamp sits right of the door.
// Linear colours.
// ON crosses the bloom threshold.
const OFF = new Color(0.02, 0.012, 0.006), ON = new Color(5, 2, 0.4);

const mat = new MeshBasicMaterial({ color: OFF.clone() });
const bulb = new Mesh(new SphereGeometry(0.1, 12, 8), mat);
// The classic drum has a 3.2 radius; the big dome's lamp sits on its base.
const big = complex.main.big, k = big ? BIG_DOOR_K : 1;
bulb.position.set(1.05 * k, 2.3 * k, big ? -BIG_WALL_R - 0.03 : -3.25);
bulb.scale.setScalar(k);
complex.main.root.add(bulb);
onLeave(() => disposeTree(bulb));

export const trackingLamp = {
  set(on: boolean): void { mat.color.copy(on ? ON : OFF); },
};
