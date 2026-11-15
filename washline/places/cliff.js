// Cliff: a grassy headland at dawn above a bay full of sea fog.
// Grey blockout: terrain, cliff edge, sea, posts, wall, far headlands, lighthouse.
// The camera looks east (-z) over the line; the sun rises behind the washing.
import * as THREE from 'three';
import { rng, col } from './kit.js';

const LINE_Z = 0;
const SEA = -60;
const EYE = [0, 1.3, 9];
const EYE_PHONE = [0, 1.3, 17];

// The cliff edge wanders across the headland, about 16 m past the line.
const edgeZ = x => -16 + 3 * Math.sin(x / 9) + 1.6 * Math.sin(x / 4.3 + 1);
// Headland height: a gentle rise of turf, then a steep fall to the sea.
function heightAt(x, z) {
  const turf = 0.35 * Math.sin(x / 7) * Math.sin(z / 9) + 0.25 * Math.sin(x / 3.1 + z / 4.7) - 0.02 * Math.max(0, z - 5);
  const past = edgeZ(x) - z;
  if (past <= 0) return turf;
  // A rounded lip, then a near-vertical face down to the sea.
  return turf - Math.min(-SEA, past * past * 1.8 + past * 6);
}

export default {
  id: 'cliff',
  name: 'Cliff',
  anchors: { a: [-3.5, 2.05, LINE_Z], b: [3.5, 1.95, LINE_Z] },
  windDir: [0.25, 0.97],
  // Left end: the sun 4° under the sea; right end: 3° up behind the washing.
  sun: { front: [0.06, -0.07, -0.996], back: [0.06, 0.052, -0.997] },
  sky: { zen: [0.42, 0.09, 255], hor: [0.84, 0.07, 55], haze: [0.78, 0.05, 60], clouds: 0, warm: 1 },
  amb: { hi: [0.75, 0.04, 250], lo: [0.5, 0.04, 120] },
  cord: [0.05, 0.05, 0.05],
  hangFrom: 0.5,
  start: 3,
  fog: [600, 12000],
  fill: 1.3,
  wash: [
    { w: 1.4, h: 1.1, c: [0.95, 0.01, 90] },
    { w: 0.75, h: 1.0, c: [0.55, 0.1, 250] },
    { w: 0.9, h: 0.65, c: [0.75, 0.1, 30] },
    { w: 0.6, h: 0.45, c: [0.85, 0.08, 95] },
  ],
  palette: [[0.95, 0.01, 90], [0.55, 0.1, 250], [0.75, 0.1, 30], [0.85, 0.08, 95], [0.6, 0.08, 150], [0.4, 0.03, 250]],

  // Under the line, so the washing stands against the dawn sky.
  frame(cam, aspect) {
    const phone = aspect < 1, eye = phone ? EYE_PHONE : EYE;
    cam.fov = phone ? 64 : 38;
    cam.near = 0.1;
    cam.far = 20000;
    cam.aspect = aspect;
    cam.position.set(...eye);
    cam.lookAt(0, eye[1] + (phone ? 4 : 7), -200);
    cam.updateProjectionMatrix();
  },

  build(scene) {
    const R = rng(29);
    const group = new THREE.Group();
    scene.add(group);
    const grey = (L, rough = 0.95) => new THREE.MeshStandardMaterial({ color: col([L, 0.005, 250]), roughness: rough });

    /* ---------- the headland ---------- */
    // A dense grid near the edge carries the lip and the face.
    const g = new THREE.PlaneGeometry(160, 120, 320, 240);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) - 30;
      p.setY(i, heightAt(x, z));
      p.setZ(i, z);
    }
    g.computeVertexNormals();
    const land = new THREE.Mesh(g, grey(0.62));
    land.castShadow = land.receiveShadow = true;
    group.add(land);

    /* ---------- the sea ---------- */
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(30000, 20000), grey(0.4, 0.3));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, SEA, -9000);
    group.add(sea);

    /* ---------- posts, pulleys, the wall ---------- */
    const wood = grey(0.45);
    const [ax, ay, az] = this.anchors.a, [bx, by, bz] = this.anchors.b;
    const postA = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, ay + 0.35, 10), wood);
    postA.position.set(ax - 0.1, (ay + 0.35) / 2, az); postA.castShadow = true; group.add(postA);
    // The far post leans a little, as old fence posts do.
    const postB = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, by + 0.3, 10), wood);
    postB.position.set(bx + 0.1, (by + 0.3) / 2, bz); postB.rotation.z = -0.06; postB.castShadow = true; group.add(postB);
    // A dry-stone wall runs from behind the near post off to the left.
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.1, 0.7), grey(0.55));
    wall.position.set(-8.25, 0.5, 1.0); wall.rotation.y = 0.33; wall.castShadow = wall.receiveShadow = true;
    group.add(wall);
    // A field gate stands open at the wall's end.
    const gate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.06), wood);
    gate.position.set(-15, 0.65, 4.6); gate.rotation.y = -0.9; gate.castShadow = true; group.add(gate);

    /* ---------- far headlands and the lighthouse ---------- */
    // Each rises out of the sea; the fog will bury their feet.
    const head = (x, z, w, h, d, L) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), grey(L));
      m.scale.set(w, h, d); m.position.set(x, SEA - 4, z);
      group.add(m);
      return m;
    };
    head(-420, -1500, 420, 70, 240, 0.5);
    head(700, -3200, 1100, 120, 500, 0.55);
    head(-1800, -7000, 2600, 220, 900, 0.6);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 5.5, 26, 16), grey(0.92));
    tower.position.set(-470, SEA + 65 + 13, -1500);
    group.add(tower);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 4, 12), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: col([0.9, 0.1, 85]), emissiveIntensity: 2 }));
    lantern.position.set(-470, SEA + 65 + 28, -1500);
    group.add(lantern);
    return group;
  },
};
