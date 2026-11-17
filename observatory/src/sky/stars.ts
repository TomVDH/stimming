// Load order: world/laser runs first.
import '../world/laser.ts';
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import { scene } from '../setup.ts';

/* ---------- placeholder stars: random points on a far shell ---------- */
// The catalog replaces these in a later task.
const COUNT = 3000, RADIUS = 4000;

// The blockout sky is a flat dark grey.
scene.background = new Color(0x1a1c21);

const p = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  // An even spread: uniform height, uniform angle.
  const y = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
  p.set([RADIUS * r * Math.cos(t), RADIUS * y, RADIUS * r * Math.sin(t)], i * 3);
}
const geo = new BufferGeometry();
geo.setAttribute('position', new BufferAttribute(p, 3));
export const stars = new Points(geo, new PointsMaterial({ color: 0xd8d8d8, size: 1.5, sizeAttenuation: false }));
scene.add(stars);
