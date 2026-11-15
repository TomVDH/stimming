// East Van: a Grandview back lane at golden hour, looking west.
// The line runs from a laneway house's balcony across the lane to a power pole.
// The lane runs along z; the ground drops west to the False Creek Flats,
// where the lit EAST VAN cross stands, with downtown and the mountains beyond.
import * as THREE from 'three';
import { rng, ok, col, pick, inst, paint, canvasTex, quad } from './kit.js';
import { laneWires } from './eastvan-wires.js';
import { farView } from './eastvan-far.js';
import { laneLife } from './eastvan-life.js';

const LANE = 3.2;
const LINE_Z = 0;
const EYE = [0.6, 3.0, 13];
const EYE_PHONE = [0.4, 3.2, 17];
// The lane stays level, then drops toward the flats.
const groundY = z => (z > -95 ? 0 : Math.max(-30, -0.085 * (-95 - z)));

const SIDING = [[0.55, 0.08, 200], [0.74, 0.11, 90], [0.45, 0.1, 25], [0.6, 0.05, 150], [0.82, 0.03, 90], [0.5, 0.06, 250]];
const GARAGE = [[0.55, 0.04, 150], [0.6, 0.02, 250], [0.48, 0.07, 30], [0.72, 0.03, 80], [0.5, 0.05, 200]];

// Clapboard: horizontal boards that catch a little light on each lap.
function siding(R) {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y + 6, 64, 2); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y, 64, 1); }
  }, true);
}

export default {
  id: 'eastvan',
  name: 'East Van',
  anchors: { a: [-3.65, 3.3, LINE_Z], b: [3.62, 3.05, LINE_Z] },
  windDir: [0.3, 0.95],
  // Behind the viewer in the east; then low in the west, over downtown.
  sun: { front: [0.25, 0.6, 0.76], back: [-0.12, 0.07, -0.99] },
  sky: { zen: [0.56, 0.1, 248], hor: [0.86, 0.05, 70], haze: [0.8, 0.04, 80], clouds: 0.42, warm: 0.9 },
  amb: { hi: [0.8, 0.04, 240], lo: [0.55, 0.05, 130] },
  cord: [0.05, 0.05, 0.05],
  hangFrom: 0.5,
  start: 3,
  fog: [120, 16000],
  fill: 1.5,
  wash: [
    { w: 1.4, h: 1.1, c: [0.95, 0.01, 90] },
    { w: 0.75, h: 1.0, c: [0.45, 0.08, 250] },
    { w: 0.9, h: 0.65, c: [0.62, 0.15, 28] },
    { w: 0.6, h: 0.45, c: [0.8, 0.1, 95] },
  ],
  palette: [[0.95, 0.01, 90], [0.45, 0.08, 250], [0.62, 0.15, 28], [0.8, 0.1, 95], [0.55, 0.1, 150], [0.3, 0.02, 260], [0.7, 0.12, 340]],

  // From the lane at line height, looking west down it.
  frame(cam, aspect) {
    const phone = aspect < 1, eye = phone ? EYE_PHONE : EYE;
    cam.fov = phone ? 62 : 42;
    cam.near = 0.1;
    cam.far = 20000;
    cam.aspect = aspect;
    cam.position.set(...eye);
    cam.lookAt(-0.3, eye[1] - (phone ? 1.0 : 0.2), -60);
    cam.updateProjectionMatrix();
  },

  build(scene, look) {
    const R = rng(13);
    const group = new THREE.Group();
    scene.add(group);
    const B = [], C = [], glass = [], lamps = [];

    /* ---------- the ground ---------- */
    // A patched asphalt lane, grass verges, then the slope down to the flats.
    const asphalt = canvasTex(256, 256, (g) => {
      g.fillStyle = ok([0.42, 0.01, 250]); g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) { g.fillStyle = ok([0.32 + R() * 0.12, 0.01, 250], 0.7); g.fillRect(R() * 256, R() * 256, 20 + R() * 70, 14 + R() * 50); }
      for (let i = 0; i < 3000; i++) { g.fillStyle = ok([0.3 + R() * 0.35, 0.01, 60], 0.6); g.fillRect(R() * 256, R() * 256, 1.5, 1.5); }
      g.strokeStyle = ok([0.25, 0.01, 250], 0.8); g.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) { g.beginPath(); let x = R() * 256, y = R() * 256; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 40; y += R() * 30; g.lineTo(x, y); } g.stroke(); }
    }, true);
    asphalt.repeat.set(1, 18);
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 2, 120), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 }));
    lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.01, -35);
    lane.receiveShadow = true;
    group.add(lane);
    const grass = new THREE.MeshStandardMaterial({ color: col([0.5, 0.1, 135]), roughness: 1 });
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 120), grass);
      m.rotation.x = -Math.PI / 2; m.position.set(sx * (LANE + 30), 0, -35);
      m.receiveShadow = true;
      group.add(m);
    }
    // The hillside down to the flats.
    const hill = new THREE.Mesh(quad([-200, 0, -95], [200, 0, -95], [-200, -30, -448], [200, -30, -448]), new THREE.MeshStandardMaterial({ color: col([0.45, 0.08, 135]), roughness: 1, side: THREE.DoubleSide }));
    hill.receiveShadow = true;
    group.add(hill);

    /* ---------- our laneway house ---------- */
    // A dark-clad laneway house; its balcony holds the near pulley.
    const clad = canvasTex(64, 64, (g) => {
      g.fillStyle = '#3a3c40'; g.fillRect(0, 0, 64, 64);
      for (let x = 0; x < 64; x += 6) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 1, 64); }
    }, true);
    clad.repeat.set(3, 2);
    const lh = new THREE.Mesh(new THREE.BoxGeometry(7, 6.2, 8), new THREE.MeshStandardMaterial({ map: clad, roughness: 0.8 }));
    lh.position.set(-LANE - 1.2 - 3.5, 3.1, LINE_Z - 1.5);
    lh.castShadow = lh.receiveShadow = true;
    group.add(lh);
    const hx = -LANE - 1.2;
    B.push({ p: [hx + 0.5, 2.9, LINE_Z + 0.8], s: [1.1, 0.12, 3.6], c: col([0.7, 0.01, 250]) });
    glass.push({ p: [hx + 1.02, 3.42, LINE_Z + 0.8], s: [0.03, 0.95, 3.6] });
    B.push({ p: [hx + 0.02, 1.2, LINE_Z - 2.6], s: [0.06, 2.3, 1.0], c: col([0.62, 0.12, 60]) });
    glass.push({ p: [hx + 0.02, 4.5, LINE_Z - 3.2], s: [0.05, 1.3, 2.2] });
    glass.push({ p: [hx + 0.02, 3.55, LINE_Z + 1.1], s: [0.05, 2.0, 1.6] });
    lamps.push({ p: [hx + 0.12, 2.6, LINE_Z - 2.0], s: [0.12, 0.16, 0.12] });
    // The end facing the camera: a door, windows and a warm lit pane.
    const ez = LINE_Z - 1.5 + 4.02;
    B.push({ p: [hx - 1.6, 1.1, ez], s: [0.95, 2.2, 0.06], c: col([0.62, 0.12, 60]) });
    glass.push({ p: [hx - 4.6, 1.6, ez], s: [1.8, 1.3, 0.06] });
    glass.push({ p: [hx - 3.2, 4.4, ez], s: [3.6, 1.4, 0.06] });
    lamps.push({ p: [hx - 5.2, 4.4, ez + 0.01], s: [1.0, 1.1, 0.02] });
    B.push({ p: [hx - 3.5, 6.25, ez - 4], s: [7.4, 0.12, 8.4], c: col([0.25, 0.01, 250]) });
    for (let k = 0; k < 4; k++) B.push({ p: [hx + 0.55, 0.3 + k * 0.7, LINE_Z + 2.4 - k * 0.0], s: [1.0, 0.06, 0.28], c: col([0.55, 0.04, 60]) });

    /* ---------- lots along the lane ---------- */
    const sid = siding(R);
    const lots = [];
    for (const side of [-1, 1]) {
      for (let z = 22; z > -95; z -= 10) {
        // Our own lot holds the laneway house.
        if (side < 0 && z < 8 && z > -12) { lots.push({ side, z: z - 5, ours: true }); continue; }
        const zc = z - 5, lot = { side, z: zc };
        const edge = side * LANE;
        // A garage at the lane, or a fence with a gate.
        if (R() < 0.6) {
          const gw = 5.5 + R() * 1, gd = 6, gh = 2.6 + R() * 0.4, gx = edge + side * (0.3 + gd / 2);
          const c = col(pick(R, GARAGE));
          const m = new THREE.Mesh(new THREE.BoxGeometry(gd, gh, gw), new THREE.MeshStandardMaterial({ map: sid, color: c, roughness: 0.9 }));
          m.position.set(gx, gh / 2, zc); m.castShadow = m.receiveShadow = true; group.add(m);
          // A roll-up door faces the lane under a small gable or a flat edge.
          B.push({ p: [edge + side * 0.27, 1.05, zc], s: [0.05, 2.1, gw * 0.7], c: col([0.82, 0.01, 90]) });
          if (R() < 0.6) {
            const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, gw * 0.62, gd + 0.4, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: col([0.32, 0.02, 40]), roughness: 0.9, flatShading: true }));
            roof.position.set(gx, gh + gw * 0.18, zc); roof.scale.set(1, 0.55, 1); roof.castShadow = true; group.add(roof);
          } else B.push({ p: [gx, gh + 0.06, zc], s: [gd + 0.3, 0.12, gw + 0.3], c: col([0.3, 0.01, 250]) });
          lot.garage = { x: gx, w: gw, h: gh };
        } else {
          const fc = col([0.5 + R() * 0.15, 0.04, 60]);
          for (let k = 0; k < 10; k++) B.push({ p: [edge + side * 0.4, 0.9, zc - 4.5 + k * 1.0], s: [0.06, 1.8, 0.95], c: fc });
          B.push({ p: [edge + side * 0.4, 1.83, zc], s: [0.08, 0.06, 10], c: fc });
        }
        // The house: an old Edwardian with a gable, or a boxy Vancouver Special.
        const hd = 11 + R() * 3, hw = 7 + R() * 1.5, hxc = side * (LANE + 16 + hd / 2 + R() * 3);
        if (R() < 0.55) {
          const wall = 6 + R() * 0.8;
          const m = new THREE.Mesh(new THREE.BoxGeometry(hd, wall, hw), new THREE.MeshStandardMaterial({ map: sid, color: col(pick(R, SIDING)), roughness: 0.85 }));
          m.position.set(hxc, wall / 2, zc); m.castShadow = m.receiveShadow = true; group.add(m);
          // The steep gable faces the lane; the ridge runs front to back.
          const g = new THREE.CylinderGeometry(0.01, hw * 0.72, hd + 0.6, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
          const roof = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col([0.3, 0.02, 30]), roughness: 0.9, flatShading: true }));
          roof.position.set(hxc, wall + hw * 0.22, zc); roof.scale.set(1, 1.1, 1); roof.castShadow = true; group.add(roof);
          // A back porch with stairs down to the yard.
          const px = hxc - side * (hd / 2 + 1.2);
          B.push({ p: [px, 2.7, zc + 1.2], s: [2.4, 0.15, 3], c: col([0.9, 0.01, 90]) });
          for (let k = 0; k < 6; k++) B.push({ p: [px - side * (0.9 + k * 0.3), 2.3 - k * 0.42, zc + 3.2], s: [0.3, 0.06, 1.0], c: col([0.6, 0.04, 60]) });
          for (const dz of [-0.2, 2.6]) C.push({ p: [px - side * 1.1, 1.35, zc + dz], s: [0.07, 2.7, 0.07], c: col([0.9, 0.01, 90]) });
          for (const wy of [2.0, 4.6]) for (const dz of [-1.6, 1.4]) glass.push({ p: [hxc - side * (hd / 2 + 0.03), wy, zc + dz], s: [0.06, 1.3, 0.9] });
        } else {
          const m = new THREE.Mesh(new THREE.BoxGeometry(hd, 5.8, hw + 1), new THREE.MeshStandardMaterial({ color: col(R() < 0.6 ? [0.88, 0.02, 85] : [0.78, 0.03, 70]), roughness: 0.95 }));
          m.position.set(hxc, 2.9, zc); m.castShadow = m.receiveShadow = true; group.add(m);
          B.push({ p: [hxc, 5.95, zc], s: [hd + 0.8, 0.3, hw + 1.8], c: col([0.3, 0.02, 40]) });
          B.push({ p: [hxc - side * (hd / 2 + 0.6), 3.0, zc], s: [1.2, 0.12, hw * 0.8], c: col([0.7, 0.01, 250]) });
          for (const dz of [-2, 0.5]) glass.push({ p: [hxc - side * (hd / 2 + 0.03), 4.2, zc + dz], s: [0.06, 1.1, 2.0] });
        }
        lot.house = { x: hxc, d: hd };
        lots.push(lot);
      }
    }
    // Rows of houses step down the hill toward the flats.
    for (let z = -100; z > -420; z -= 9) {
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
        const y = groundY(z), x = side * (LANE + 8 + k * 26 + R() * 6), h = 6 + R() * 2;
        B.push({ p: [x, y + h / 2, z], s: [11, h, 7.5], c: col(R() < 0.5 ? pick(R, SIDING) : [0.86, 0.02, 85]) });
        B.push({ p: [x, y + h + 1.1, z], s: [11.5, 2.2, 6], r: [0.5, 0, 0], c: col([0.3, 0.02, 30]) });
      }
    }

    inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.85), B);
    inst(group, new THREE.CylinderGeometry(1, 1, 1, 8), paint(0.8), C);
    inst(group, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: col([0.2, 0.02, 240]), roughness: 0.15, metalness: 0.3 }), glass, false);
    inst(group, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: col([0.9, 0.08, 80]), emissive: col([0.85, 0.12, 75]), emissiveIntensity: 1.6 }), lamps, false);

    const wires = laneWires(group, rng(17), { LANE, LINE_Z, lots, anchors: this.anchors, groundY });
    const far = farView(group, rng(19), { groundY });
    const life = laneLife(group, rng(23), { LANE, LINE_Z, lots, wires, look });

    group.userData.tick = (t, sun, cam) => { wires.tick(t); far.tick(t, sun, cam); life.tick(t); };
    return group;
  },
};
