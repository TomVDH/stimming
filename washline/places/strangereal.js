// Strangereal: a tower roof at blue hour, seen through a long lens.
// The line runs from a stair bulkhead to an antenna mast at the far parapet.
// Beyond it the city stacks in bands toward the horizon; furballs turn far off.
// The roof deck is y = 0; the street lies 140 m below.
import * as THREE from 'three';
import { rng, ok, col, inst, paint, canvasTex } from './kit.js';
import { cityBands } from './sr-city.js';
import { furball } from './sr-furball.js';
import { atmoDome } from './sr-atmo.js';

const H = 140;
const LINE_Z = -3;
const PARAPET = -6;
const EYE = [0.1, 2.15, 24];
const EYE_PHONE = [0.1, 2.3, 26];

export default {
  id: 'strangereal',
  name: 'Strangereal',
  anchors: { a: [-3.38, 2.3, LINE_Z], b: [3.6, 2.2, LINE_Z] },
  windDir: [0.3, 0.95],
  // Dusk light from behind the viewer; then the afterglow behind the city.
  // Back: the sun sits five degrees under the horizon: blue hour.
  sun: { front: [-0.35, 0.05, 0.94], back: [0.12, -0.087, -0.99] },
  sky: { zen: [0.24, 0.09, 266], hor: [0.5, 0.07, 290], haze: [0.3, 0.06, 268], clouds: 0, warm: 0.25 },
  amb: { hi: [0.55, 0.06, 260], lo: [0.35, 0.04, 280] },
  cord: [0.03, 0.03, 0.035],
  hangFrom: 0.4,
  start: 3,
  fog: [200, 30000],
  fill: 1.8,
  wash: [
    { w: 1.2, h: 0.9, c: [0.95, 0.01, 90] },
    { w: 0.75, h: 0.95, c: [0.6, 0.15, 25] },
    { w: 0.85, h: 0.65, c: [0.5, 0.12, 250] },
    { w: 0.6, h: 0.45, c: [0.85, 0.12, 95] },
  ],
  palette: [[0.95, 0.01, 90], [0.6, 0.15, 25], [0.5, 0.12, 250], [0.85, 0.12, 95], [0.3, 0.02, 260], [0.7, 0.12, 330], [0.65, 0.12, 160]],

  // A level long lens; the city fills the band around the horizon.
  frame(cam, aspect) {
    const phone = aspect < 1, eye = phone ? EYE_PHONE : EYE;
    cam.fov = phone ? 34 : 15;
    cam.near = 0.5;
    cam.far = 30000;
    cam.aspect = aspect;
    cam.position.set(...eye);
    cam.lookAt(0, eye[1] - 0.45, -400);
    cam.updateProjectionMatrix();
  },

  build(scene, look) {
    const R = rng(23);
    const group = new THREE.Group();
    scene.add(group);
    const B = [], C = [], lamps = [];

    /* ---------- the roof ---------- */
    // Gravel over the membrane, a parapet at the edge.
    const gravel = canvasTex(256, 256, (g) => {
      g.fillStyle = ok([0.6, 0.01, 260]); g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5000; i++) { g.fillStyle = ok([0.45 + R() * 0.35, 0.01, 260]); g.fillRect(R() * 256, R() * 256, 1.5, 1.5); }
    }, true);
    gravel.repeat.set(30, 25);
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), new THREE.MeshStandardMaterial({ map: gravel, roughness: 1 }));
    deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0, PARAPET + 25);
    deck.receiveShadow = true;
    group.add(deck);
    const concrete = col([0.6, 0.01, 260]);
    B.push({ p: [0, 0.55, PARAPET], s: [60, 1.1, 0.3], c: concrete });
    B.push({ p: [0, 1.13, PARAPET], s: [60, 0.06, 0.45], c: col([0.7, 0.01, 260]) });
    // The facade falls away below the parapet.
    B.push({ p: [0, -H / 2, PARAPET - 0.2], s: [60, H, 0.4], c: col([0.25, 0.02, 260]) });

    // The stair bulkhead holds the near pulley; a lamp burns over its door.
    B.push({ p: [-5.5, 1.5, -2.5], s: [4.2, 3.0, 5], c: col([0.58, 0.01, 260]) });
    B.push({ p: [-5.5, 3.06, -2.5], s: [4.4, 0.12, 5.2], c: col([0.35, 0.01, 260]) });
    B.push({ p: [-5.0, 1.05, 0.02], s: [1.0, 2.1, 0.06], c: col([0.3, 0.03, 240]) });
    B.push({ p: [-5.0, 2.45, 0.1], s: [0.22, 0.12, 0.18], c: col([0.2, 0.01, 260]) });
    lamps.push({ p: [-5.0, 2.36, 0.12], s: [0.18, 0.06, 0.14] });
    for (const x of [-6.6, -4.2]) C.push({ p: [x, 3.6, -3.6], s: [0.12, 1.1, 0.12], c: col([0.5, 0.01, 260]) });

    // The antenna mast: a steel pole, cross-arms, guy wires, a red light.
    const [mx, , mz] = this.anchors.b;
    C.push({ p: [mx + 0.12, 4.5, mz], s: [0.09, 9, 0.09], c: col([0.55, 0.01, 260]) });
    for (const [y, w] of [[2.35, 0.6], [6.2, 1.4], [7.4, 1.0], [8.4, 0.7]]) B.push({ p: [mx + 0.12, y, mz], s: [w, 0.05, 0.05], c: col([0.55, 0.01, 260]) });
    for (const k of [-1, 1]) for (const y of [6.2, 7.4]) C.push({ p: [mx + 0.12 + k * 0.5, y + 0.35, mz], s: [0.02, 0.7, 0.02], c: col([0.7, 0.01, 260]) });
    const guys = [];
    for (const [gx, gz] of [[mx - 3, mz + 3], [mx + 3, mz + 3], [mx + 2, mz - 2.5]]) guys.push(mx + 0.12, 8.6, mz, gx, 0, gz);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(guys, 3));
    group.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x3a3d44 })));
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2010, emissiveIntensity: 4 }));
    red.position.set(mx + 0.12, 9.1, mz);
    group.add(red);

    // Water tanks on stands, condenser units, dishes and a cable tray.
    for (const [x, z] of [[11, -1], [14.5, 2.5]]) {
      C.push({ p: [x, 3.8, z], s: [1.6, 3.2, 1.6], c: col([0.5, 0.03, 240]) });
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) C.push({ p: [x + dx, 1.1, z + dz], s: [0.08, 2.2, 0.08], c: col([0.4, 0.01, 260]) });
    }
    for (let i = 0; i < 9; i++) {
      const x = (R() - 0.5) * 34, z = 4 + R() * 16;
      if (Math.abs(x) < 3.5 && z > 14) continue;
      B.push({ p: [x, 0.55, z], s: [1.2, 1.1, 1.0], c: col([0.7, 0.01, 250]) });
      C.push({ p: [x, 1.12, z], s: [0.42, 0.04, 0.42], c: col([0.15, 0.01, 260]) });
    }
    for (const [x, z] of [[-11, -3], [8, 7]]) {
      C.push({ p: [x, 0.7, z], s: [0.05, 1.4, 0.05], c: col([0.5, 0.01, 260]) });
      B.push({ p: [x, 1.5, z - 0.1], s: [0.06, 0.9, 0.9], r: [0.5, 0.4, 0], c: col([0.88, 0.01, 250]) });
    }
    B.push({ p: [-1.5, 0.12, 9], s: [24, 0.18, 0.4], c: col([0.45, 0.01, 260]) });

    inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.85), B);
    inst(group, new THREE.CylinderGeometry(1, 1, 1, 12), paint(0.7, 0.2), C);
    inst(group, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: col([0.9, 0.08, 80]), emissive: col([0.85, 0.12, 75]), emissiveIntensity: 2 }), lamps, false);

    /* ---------- the city and the sky war ---------- */
    // One scattering model lights the sky, the city and its haze.
    const dome = atmoDome(group, H);
    const city = cityBands(group, rng(31), { H, PARAPET });
    const war = furball(group, rng(41), { H });

    group.userData.tick = (t, sun, cam, viewH, sky) => {
      // The mast light blinks once a second.
      red.material.emissiveIntensity = (t % 1.2) < 0.25 ? 6 : 0.2;
      dome.tick(sun.dir, cam);
      city.tick(t, sun, cam, viewH, sky);
      war.tick(t, sun, cam, viewH, sky);
    };
    return group;
  },
};
