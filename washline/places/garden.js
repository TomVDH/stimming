// Garden: a Flemish back garden behind a row of brick houses.
// The house backs face +x along x = HX; plots sit side by side along z.
// The pulley runs from an upstairs window out to a pole by the shed.
import * as THREE from 'three';
import { rng, ok, col, pick, inst, paint, canvasTex, quad } from './kit.js';
import { dressGarden } from './garden-dress.js';
import { houseRelief } from './garden-walls.js';
import { gardenLife } from './garden-life.js';

const HX = -4.5;
const PLOT = 5.6;
const EX = 9;
const LINE_Z = 0;
const EYE = [-0.2, 3.9, 11.5];
const EYE_PHONE = [-0.2, 4.0, 15.5];

const BRICK = [[0.48, 0.1, 35], [0.44, 0.09, 30], [0.52, 0.1, 40], [0.42, 0.06, 45], [0.66, 0.08, 75]];
const FRAME = [[0.95, 0.01, 90], [0.3, 0.02, 250], [0.38, 0.05, 50], [0.95, 0.01, 90]];
const PPM = 40;

// A rear facade: brick bond, bluestone sills, windows with roll shutters.
function facade(len, ht, R, ours) {
  const brick = R() < 0.85 ? pick(R, BRICK) : [0.9, 0.01, 90];
  const painted = brick[0] > 0.85;
  const frame = pick(R, FRAME);
  const tex = canvasTex(Math.ceil(len * PPM), Math.ceil(ht * PPM), (g, X, Y) => {
    g.fillStyle = ok(painted ? brick : [brick[0] + 0.12, 0.02, 80]); g.fillRect(0, 0, X, Y);
    if (!painted) {
      // Stretcher bond: half-offset courses of small bricks.
      const bh = 0.065 * PPM, bw = 0.21 * PPM;
      for (let y = 0, r = 0; y < Y; y += bh, r++) {
        for (let x = (r % 2 ? -bw / 2 : 0); x < X; x += bw) {
          g.fillStyle = ok([brick[0] + (R() - 0.5) * 0.08, brick[1] * (0.8 + R() * 0.4), brick[2] + (R() - 0.5) * 10]);
          g.fillRect(x + 0.6, y + 0.6, bw - 1.2, bh - 1.2);
        }
      }
    }
    // Soot and rain darken the wall toward the top and the ground.
    const gr = g.createLinearGradient(0, 0, 0, Y);
    gr.addColorStop(0, ok([0.25, 0.02, 60], 0.25)); gr.addColorStop(0.3, ok([0.25, 0.02, 60], 0));
    gr.addColorStop(0.85, ok([0.25, 0.02, 60], 0)); gr.addColorStop(1, ok([0.25, 0.02, 60], 0.3));
    g.fillStyle = gr; g.fillRect(0, 0, X, Y);
    const win = (cx, cy, w, h, shutter, door) => {
      // cx is metres from the facade's centre.
      const x = (len / 2 + cx - w / 2) * PPM, y = Y - (cy + h / 2) * PPM, pw = w * PPM, ph = h * PPM;
      g.fillStyle = ok(frame); g.fillRect(x - 3, y - 3, pw + 6, ph + 6);
      g.fillStyle = ok([0.22, 0.02, 240]); g.fillRect(x + 2, y + 2, pw - 4, ph - 4);
      // A pale sky glints in the upper panes.
      const gl = g.createLinearGradient(0, y, 0, y + ph);
      gl.addColorStop(0, ok([0.6, 0.04, 230], 0.5)); gl.addColorStop(0.6, ok([0.3, 0.02, 240], 0));
      g.fillStyle = gl; g.fillRect(x + 2, y + 2, pw - 4, ph - 4);
      g.fillStyle = ok(frame);
      g.fillRect(x + pw / 2 - 2, y, 4, ph);
      if (!door) g.fillRect(x, y + ph * 0.3, pw, 3);
      if (shutter > 0) {
        // The roll shutter hangs down from its box over the glass.
        g.fillStyle = ok([0.78, 0.02, 80]); g.fillRect(x - 3, y - 0.2 * PPM, pw + 6, 0.2 * PPM);
        g.fillStyle = ok([0.7, 0.02, 80]); g.fillRect(x, y, pw, ph * shutter);
        g.fillStyle = ok([0.55, 0.02, 80]);
        for (let k = 0; k < ph * shutter; k += 0.05 * PPM) g.fillRect(x, y + k, pw, 1);
      }
      // A bluestone sill sits under each window.
      if (!door) { g.fillStyle = ok([0.36, 0.02, 250]); g.fillRect(x - 0.06 * PPM, y + ph + 3, pw + 0.12 * PPM, 0.06 * PPM); }
    };
    const sh = () => (R() < 0.35 ? 0.2 + R() * 0.6 : 0);
    if (ours) {
      win(0.9, 4.0, 1.0, 1.4, 0, false);
      win(-1.4, 1.15, 0.95, 2.2, 0, true);
      win(1.2, 1.4, 1.3, 1.2, 0, false);
    } else {
      win(-len / 4, 4.0, 1.0, 1.4, sh(), false);
      win(len / 4, 4.0, 1.0, 1.4, sh(), false);
      win(-len / 4, 1.15, 0.95, 2.2, 0, true);
      win(len / 4, 1.4, 1.4, 1.2, sh(), false);
    }
  });
  // The canvas centre maps to the plot centre.
  return { tex, brick, painted };
}

// Small facades for extensions: brick or render and one wide glass door.
function extFace(len, ht, brick, R) {
  return canvasTex(Math.ceil(len * PPM), Math.ceil(ht * PPM), (g, X, Y) => {
    g.fillStyle = ok(R() < 0.5 ? [0.92, 0.01, 90] : [brick[0] + 0.03, brick[1], brick[2]]); g.fillRect(0, 0, X, Y);
    const w = Math.min(len - 0.6, 2.4) * PPM, h = 2.1 * PPM, x = (X - w) / 2;
    g.fillStyle = ok([0.3, 0.02, 250]); g.fillRect(x - 3, Y - h - 3, w + 6, h + 3);
    g.fillStyle = ok([0.24, 0.02, 240]); g.fillRect(x, Y - h, w, h);
    g.fillStyle = ok([0.3, 0.02, 250]); g.fillRect(x + w / 2 - 2, Y - h, 4, h);
    g.fillStyle = ok([0.2, 0.01, 250]); g.fillRect(0, 0, X, 0.12 * PPM);
  });
}

// Lawn: mown grass with faint stripes and clover.
function lawnTex(R) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = ok([0.55, 0.12, 135]); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = ok([0.45 + R() * 0.2, 0.1 + R() * 0.05, 125 + R() * 25], 0.6);
      g.fillRect(R() * 256, R() * 256, 1.5, 3 + R() * 3);
    }
    for (let x = 0; x < 256; x += 64) { g.fillStyle = ok([0.62, 0.11, 130], 0.18); g.fillRect(x, 0, 32, 256); }
  }, true);
}
// Terrace: square concrete slabs with dark joints.
function paveTex(R) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = ok([0.45, 0.01, 80]); g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = ok([0.66 + R() * 0.06, 0.01, 80]);
      g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
    }
  }, true);
}

export default {
  id: 'garden',
  name: 'Garden',
  anchors: { a: [HX + 0.12, 3.45, LINE_Z], b: [3.9, 2.55, LINE_Z] },
  windDir: [0.25, 0.97],
  // Behind the viewer and high; then low at the far end of the row.
  sun: { front: [0.35, 0.8, 0.5], back: [0.12, 0.05, -0.99] },
  sky: { zen: [0.56, 0.1, 245], hor: [0.86, 0.04, 85], haze: [0.82, 0.03, 90], clouds: 0.55 },
  amb: { hi: [0.82, 0.03, 240], lo: [0.62, 0.05, 130] },
  // The cord is linear RGB, as in the Alley.
  cord: [0.05, 0.05, 0.055],
  hangFrom: 0.4,
  start: 3,
  fog: [40, 900],
  fill: 1.9,
  wash: [
    { w: 1.6, h: 1.2, c: [0.95, 0.01, 90] },
    { w: 0.75, h: 1.0, c: [0.55, 0.09, 255] },
    { w: 0.9, h: 0.6, c: [0.78, 0.08, 20] },
    { w: 0.6, h: 0.45, c: [0.85, 0.1, 95] },
  ],
  palette: [[0.95, 0.01, 90], [0.55, 0.09, 255], [0.78, 0.08, 20], [0.85, 0.1, 95], [0.6, 0.1, 150], [0.5, 0.12, 25], [0.82, 0.04, 230]],

  // A level view across the gardens toward the end of the row.
  frame(cam, aspect) {
    const phone = aspect < 1, eye = phone ? EYE_PHONE : EYE;
    cam.fov = phone ? 60 : 40;
    cam.aspect = aspect;
    cam.position.set(...eye);
    cam.lookAt(0, eye[1] - (phone ? 3.6 : 2.4), -25);
    cam.updateProjectionMatrix();
  },

  build(scene, look) {
    const R = rng(11);
    const group = new THREE.Group();
    scene.add(group);
    const tiles = canvasTex(64, 128, (g) => {
      // Clay pantiles in rows; each roof tints them.
      const gr = g.createLinearGradient(0, 0, 64, 0);
      gr.addColorStop(0, '#7d7d7d'); gr.addColorStop(0.4, '#e6e6e6'); gr.addColorStop(1, '#6a6a6a');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
      for (let y = 0; y < 128; y += 32) { g.fillStyle = 'rgba(20,15,10,0.45)'; g.fillRect(0, y, 64, 4); }
    }, true);
    const boxes = [], sills = [], chims = [], copings = [];
    const plots = [];
    for (let k = -13; k <= 3; k++) {
      const zc = k * PLOT, z0 = zc - PLOT / 2, z1 = zc + PLOT / 2, ours = k === 0;
      const eave = 6.0 + R() * 1.3;
      const { tex, brick } = facade(PLOT, eave, R, ours);
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const side = new THREE.MeshStandardMaterial({ color: col([brick[0] - 0.05, brick[1], brick[2]]), roughness: 0.95 });
      const house = new THREE.Mesh(new THREE.BoxGeometry(9, eave, PLOT), [face, side, side, side, side, side]);
      house.position.set(HX - 4.5, eave / 2, zc);
      house.castShadow = house.receiveShadow = true;
      group.add(house);
      // The roof rises from the gutter toward the street side.
      const tint = R() < 0.6 ? [0.32 + R() * 0.06, 0.03, 40] : [0.42 + R() * 0.06, 0.1, 35];
      const roof = new THREE.Mesh(quad([HX + 0.35, eave + 0.05, z1], [HX + 0.35, eave + 0.05, z0], [HX - 4.4, eave + 3.5, z1], [HX - 4.4, eave + 3.5, z0], 0.26, 1.1),
        new THREE.MeshStandardMaterial({ map: tiles, color: col(tint), roughness: 0.8, side: THREE.DoubleSide }));
      roof.castShadow = roof.receiveShadow = true;
      group.add(roof);
      copings.push({ p: [HX + 0.2, eave, zc], s: [0.35, 0.14, PLOT], c: col([0.4, 0.01, 250]) });
      if (R() < 0.5) chims.push({ p: [HX - 4.2, eave + 4, z0 + 0.4], s: [0.7, 1.6, 0.6], c: col([brick[0] - 0.04, brick[1], brick[2]]) });
      // Bluestone sills stand out from the wall.
      for (const wz of ours ? [0.9, 1.2] : [-PLOT / 4, PLOT / 4]) sills.push({ p: [HX + 0.06, ours && wz === 1.2 ? 0.75 : 3.25, zc - wz], s: [0.12, 0.06, 1.15] });
      // Many houses grow a single-storey kitchen extension.
      let ext = 0;
      // Plots between the camera and the line stay low.
      if (!ours && k < 0 && R() < 0.55) {
        ext = 2.6 + R() * 1.4;
        const ew = PLOT - 0.3, eh = 3.0;
        const ef = new THREE.MeshStandardMaterial({ map: extFace(ew, eh, brick, R), roughness: 0.9 });
        const eb = new THREE.Mesh(new THREE.BoxGeometry(ext, eh, ew), [ef, side, side, side, side, side]);
        eb.position.set(HX + ext / 2, eh / 2, zc);
        eb.castShadow = eb.receiveShadow = true;
        group.add(eb);
        copings.push({ p: [HX + ext / 2, eh + 0.05, zc], s: [ext + 0.1, 0.1, ew + 0.1], c: col([0.25, 0.01, 250]) });
        copings.push({ p: [HX + ext + 0.02, eh - 0.02, zc], s: [0.08, 0.14, ew + 0.1], c: col([0.7, 0.01, 250]) });
      }
      plots.push({ k, zc, z0, z1, ours, ext, eave, brick });
    }
    inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.9), copings);
    inst(group, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: col([0.38, 0.02, 250]), roughness: 0.7 }), sills);
    inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.9), chims);

    /* ---------- ground ---------- */
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(EX - HX + 1, 120), new THREE.MeshStandardMaterial({ map: lawnTex(R), roughness: 0.95 }));
    lawn.material.map.repeat.set((EX - HX + 1) / 3, 40);
    lawn.rotation.x = -Math.PI / 2; lawn.position.set((EX + HX) / 2, 0, -40);
    lawn.receiveShadow = true;
    group.add(lawn);
    const pave = paveTex(R);
    pave.repeat.set(1, 1);
    for (const p of plots) {
      const x0 = HX + p.ext, depth = 2.6 + R() * 1.2;
      const m = new THREE.Mesh(quad([x0, 0.02, p.z1 - 0.1], [x0 + depth, 0.02, p.z1 - 0.1], [x0, 0.02, p.z0 + 0.1], [x0 + depth, 0.02, p.z0 + 0.1], 1.2, 1.2),
        new THREE.MeshStandardMaterial({ map: pave, roughness: 0.9 }));
      m.receiveShadow = true;
      group.add(m);
      p.terrace = x0 + depth;
    }
    // Beyond the back walls: a strip of field, then the next street's backs.
    const far = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1400), new THREE.MeshStandardMaterial({ color: col([0.55, 0.08, 130]), roughness: 1 }));
    far.rotation.x = -Math.PI / 2; far.position.set(0, -0.03, -400);
    group.add(far);

    /* ---------- walls, fences and hedges ---------- */
    const walls = [], planks = [], hedge = [];
    for (const p of plots) {
      const z = p.z0;
      // The camera stands past these dividers; they have none.
      if (p.k >= 2) continue;
      // A brick wall runs out from the house, then a fence or a hedge.
      // The wall nearest the camera stays low, so our terrace shows.
      const wh = p.k === 1 ? 0.9 : 1.9;
      walls.push({ p: [HX + 2, wh / 2, z], s: [4, wh, 0.22], c: col([0.46 + R() * 0.05, 0.09, 35]) });
      walls.push({ p: [HX + 2, wh + 0.03, z], s: [4.05, 0.08, 0.3], c: col([0.4, 0.01, 250]) });
      const kind = R();
      if (p.k === 0) {
        const L = 0.4;
        for (let x = HX + 4.2; x < EX; x += 0.42) hedge.push({ p: [x, 0.45, z], s: [0.36, 0.48, 0.35], c: col([L + R() * 0.06, 0.1, 140]) });
      } else if (p.k === 1) {
        // A low picket fence keeps our lawn in view.
        for (let x = HX + 4.1; x < EX; x += 0.16) planks.push({ p: [x, 0.5, z], s: [0.08, 1.0, 0.025], c: col([0.92, 0.01, 90]) });
        planks.push({ p: [(HX + 4 + EX) / 2, 0.75, z], s: [EX - HX - 4, 0.06, 0.03], c: col([0.92, 0.01, 90]) });
      } else if (kind < 0.45) {
        const fh = 0.9 + R() * 0.4;
        planks.push({ p: [(HX + 4 + EX) / 2, fh / 2, z], s: [EX - HX - 4, fh, 0.04], c: col([0.42 + R() * 0.1, 0.06, 55]) });
        for (let x = HX + 4.9; x < EX; x += 1.8) planks.push({ p: [x, fh / 2 + 0.05, z], s: [0.09, fh + 0.1, 0.09], c: col([0.36, 0.05, 55]) });
      } else {
        // Our back hedge stays low, so the next gardens show.
        const L = 0.36 + R() * 0.1, top = p.k === 0 ? 0.85 : 0.9 + R() * 0.6;
        for (let x = HX + 4.2; x < EX; x += 0.42) {
          hedge.push({ p: [x, top * 0.5, z], s: [0.36, top * 0.55, 0.35], c: col([L, 0.1, 140]) });
          hedge.push({ p: [x + 0.2, top * (0.75 + R() * 0.25), z + (R() - 0.5) * 0.2], s: [0.3, 0.3, 0.32], c: col([L + 0.05, 0.11, 135]) });
        }
      }
    }
    // The back wall closes every garden.
    walls.push({ p: [EX + 0.1, 1.05, -30], s: [0.25, 2.1, 100], c: col([0.45, 0.08, 35]) });
    const box = new THREE.BoxGeometry(1, 1, 1);
    inst(group, box, paint(0.95), walls);
    inst(group, box, paint(0.9), planks);
    inst(group, new THREE.IcosahedronGeometry(1, 1), paint(0.9), hedge);

    const ctx = { HX, EX, PLOT, LINE_Z, plots, look, anchors: this.anchors };
    // Each pass draws from its own seed, so one never reshuffles another.
    houseRelief(group, rng(21), ctx);
    gardenLife(group, rng(31), ctx);
    dressGarden(group, R, ctx);
    return group;
  },
};
