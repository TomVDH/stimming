// Alley: a pulley line crosses a narrow street between two windows.
// The camera looks down the street from a first-floor window.
// The street runs along z; the walls face each other at x = ±W.
import * as THREE from 'three';
import { oklchLinear } from '../../shared/stim.js';
import { dress, backdrop } from './alley-dress.js';
import { walls } from './alley-walls.js';

const W = 2.6;
const LINE_Z = 0;
// The camera hangs level with the line, up the street from it.
const EYE = [0.2, 7.5, 11];

// A small seeded random, so the street is the same every visit.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Valldemossa: honey limestone, some ochre render, green shutters.
const STONE = [[0.76, 0.08, 72], [0.71, 0.075, 64], [0.79, 0.07, 80], [0.68, 0.07, 58]];
const PLASTER = [[0.8, 0.08, 78], [0.84, 0.05, 85], [0.76, 0.08, 60]];
const SHUTTER = [[0.47, 0.09, 155], [0.43, 0.08, 160], [0.5, 0.08, 150], [0.45, 0.07, 165], [0.42, 0.05, 55]];
const ok = ([L, C, h], a = 1) => `oklch(${L} ${C} ${h} / ${a})`;
// Pixels per metre; near facades get more.
let PPM = 28;

// One canvas per facade: plaster, grime, floors, windows and shutters.
function facade(len, ht, R, anchorWin) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(len * PPM); cv.height = Math.ceil(ht * PPM);
  const g = cv.getContext('2d'), X = cv.width, Y = cv.height;
  const stone = R() < 0.72;
  const base = stone ? STONE[Math.floor(R() * STONE.length)] : PLASTER[Math.floor(R() * PLASTER.length)];
  g.fillStyle = ok(base); g.fillRect(0, 0, X, Y);
  // Coursed limestone: rows of blocks with pale mortar between them.
  if (stone) {
    for (let y = 0; y < Y; y += 0.3 * PPM) {
      for (let x = -R() * 0.5 * PPM; x < X; ) {
        const bw = (0.35 + R() * 0.55) * PPM;
        g.fillStyle = ok([base[0] + (R() - 0.5) * 0.09, base[1] * (0.7 + R() * 0.6), base[2] + (R() - 0.5) * 16]);
        g.fillRect(x + 1, y + 1, bw - 2, 0.3 * PPM - 2);
        x += bw;
      }
    }
  }
  // Blotches of damp and sun-bleach.
  for (let i = 0; i < 60; i++) {
    const r = (0.4 + R() * 2.2) * PPM;
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    const d = R() < 0.5 ? [base[0] - 0.08, base[1], base[2]] : [base[0] + 0.05, base[1] * 0.6, base[2]];
    gr.addColorStop(0, ok(d, 0.35)); gr.addColorStop(1, ok(d, 0));
    g.save(); g.translate(R() * X, R() * Y); g.scale(1, 0.6 + R()); g.fillStyle = gr;
    g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
  }
  // Grime rises from the street.
  const gb = g.createLinearGradient(0, Y, 0, Y - 2.4 * PPM);
  gb.addColorStop(0, ok([0.35, 0.03, 60], 0.55)); gb.addColorStop(1, ok([0.35, 0.03, 60], 0));
  g.fillStyle = gb; g.fillRect(0, Y - 2.4 * PPM, X, 2.4 * PPM);
  // A plinth of big dark blocks runs along the street.
  for (let x = -R() * 0.4 * PPM; x < X; ) {
    const bw = (0.6 + R() * 0.5) * PPM;
    for (let r = 0; r < 2; r++) {
      g.fillStyle = ok([base[0] - 0.1 + (R() - 0.5) * 0.05, base[1] * 0.8, base[2] - 6]);
      g.fillRect(x + 1, Y - (r + 1) * 0.36 * PPM + 1, bw - 2, 0.36 * PPM - 2);
    }
    x += bw;
  }
  // Quoins: long and short pale blocks bond the corners.
  for (let y = 0, k = 0; y < Y - 0.72 * PPM; y += 0.34 * PPM, k++) {
    const qw = (k % 2 ? 0.32 : 0.6) * PPM;
    g.fillStyle = ok([Math.min(0.9, base[0] + 0.07), base[1] * 0.6, base[2] + 4]);
    g.fillRect(1, y + 1, qw - 2, 0.34 * PPM - 2);
    g.fillRect(X - qw + 1, y + 1, qw - 2, 0.34 * PPM - 2);
  }
  const shut = SHUTTER[Math.floor(R() * SHUTTER.length)];
  const wins = [];
  const bays = Math.max(1, Math.round(len / 2.3)), bw = len / bays;
  const win = (cx, cy, w, h, mode) => {
    const x = (cx - w / 2) * PPM, y = Y - (cy + h / 2) * PPM, pw = w * PPM, ph = h * PPM;
    wins.push({ u: cx, y: cy, w, h, kind: 'win', mode, shut });
    // A stone surround, a dark pane, a sill.
    g.fillStyle = ok([base[0] + 0.07, base[1] * 0.4, base[2]]);
    g.fillRect(x - 0.1 * PPM, y - 0.1 * PPM, pw + 0.2 * PPM, ph + 0.18 * PPM);
    g.fillStyle = ok([0.2, 0.015, 250]); g.fillRect(x, y, pw, ph);
    g.fillStyle = ok([0.32, 0.02, 250]); g.fillRect(x + pw * 0.48, y, pw * 0.04, ph);
    g.fillStyle = ok([base[0] - 0.2, base[1], base[2]], 0.5); g.fillRect(x, y + ph + 0.08 * PPM, pw, 0.1 * PPM);
    // Rain off the sill leaves a soft dark streak below it.
    const sk = g.createLinearGradient(0, y + ph, 0, y + ph + 1.3 * PPM);
    sk.addColorStop(0, ok([base[0] - 0.2, base[1], base[2]], 0.28)); sk.addColorStop(1, ok([base[0] - 0.2, base[1], base[2]], 0));
    g.fillStyle = sk; g.fillRect(x + pw * 0.1, y + ph + 0.18 * PPM, pw * 0.8, 1.3 * PPM);
    if (mode === 0) {
      // Closed shutters with louvre lines.
      g.fillStyle = ok(shut); g.fillRect(x, y, pw, ph);
      g.fillStyle = ok([shut[0] - 0.12, shut[1], shut[2]]);
      for (let k = 0; k < ph; k += 0.09 * PPM) g.fillRect(x, y + k, pw, 0.025 * PPM);
      g.fillRect(x + pw / 2 - 1, y, 2, ph);
    } else if (mode === 1) {
      // Open shutters fold back against the wall.
      for (const sx of [x - pw / 2 - 0.12 * PPM, x + pw + 0.12 * PPM]) {
        g.fillStyle = ok(shut); g.fillRect(sx, y, pw / 2, ph);
        g.fillStyle = ok([shut[0] - 0.12, shut[1], shut[2]]);
        for (let k = 0; k < ph; k += 0.09 * PPM) g.fillRect(sx, y + k, pw / 2, 0.025 * PPM);
      }
    }
  };
  // The ground floor has doors and shop arches; the floors above have windows.
  for (let b = 0; b < bays; b++) {
    const cx = (b + 0.5) * bw;
    if (R() < 0.4) {
      // An arched doorway: stone voussoirs, then a plank door.
      const ax = cx * PPM, ay = Y - 2.3 * PPM, rr = 0.6 * PPM;
      for (let k = 0; k < 9; k++) {
        const a0 = Math.PI + (k * Math.PI) / 9, a1 = a0 + Math.PI / 9 - 0.03;
        g.fillStyle = ok([Math.min(0.9, base[0] + 0.05 + (R() - 0.5) * 0.04), base[1] * 0.6, base[2]]);
        g.beginPath(); g.arc(ax, ay, rr + 0.28 * PPM, a0, a1); g.arc(ax, ay, rr, a1, a0, true); g.fill();
      }
      const wood = R() < 0.6 ? shut : [0.4, 0.06, 55];
      g.fillStyle = ok(wood);
      g.fillRect(ax - rr, ay, 2 * rr, 2.3 * PPM);
      g.beginPath(); g.arc(ax, ay, rr, Math.PI, 0); g.fill();
      g.fillStyle = ok([wood[0] - 0.1, wood[1], wood[2]]);
      for (let k = -rr + 0.13 * PPM; k < rr; k += 0.15 * PPM) g.fillRect(ax + k, ay - rr * 0.8, 1.5, 2.3 * PPM + rr * 0.8);
      g.fillRect(ax - 1, ay - rr, 2, 2.3 * PPM + rr);
      g.fillStyle = ok([0.75, 0.1, 85]); g.fillRect(ax + 0.12 * PPM, ay + 1.1 * PPM, 0.06 * PPM, 0.06 * PPM);
      wins.push({ u: cx, y: 1.5, w: 1.2, h: 3.1, kind: 'door' });
    } else win(cx, 1.9, 0.8, 1.2, R() < 0.5 ? 0 : 2);
    for (let fy = 4.2; fy + 1.6 < ht - 0.6; fy += 3.1) {
      if (anchorWin && Math.abs(fy + 0.8 - anchorWin.y) < 1.6 && Math.abs(cx - anchorWin.u) < bw * 0.6) continue;
      win(cx, fy + 0.8, 0.9, 1.6, R() < 0.35 ? 0 : R() < 0.6 ? 1 : 2);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { tex: t, base, wins };
}

// Balconies and window frames add relief that catches the sun.
function addBox(list, x, y, z, sx, sy, sz) { list.push([x, y, z, sx, sy, sz]); }
function instanced(list, mat, scene) {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((b, i) => m.setMatrixAt(i, mx.compose(p.set(b[0], b[1], b[2]), q, s.set(b[3], b[4], b[5]))));
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  return m;
}

const rgb = c => [c.r, c.g, c.b];
const lin = ([L, C, h]) => new THREE.Color().setRGB(...oklchLinear(L, C, h).map(v => Math.max(0, v)));

export default {
  id: 'alley',
  name: 'Alley',
  anchors: { a: [-W + 0.14, 8.3, LINE_Z], b: [W - 0.14, 8.05, LINE_Z] },
  windDir: [0.25, 0.97],
  // Directions to the sun: behind the viewer, then low at the street's end.
  sun: { front: [0.5, 0.72, 0.48], back: [-0.025, 0.044, -0.999] },
  sky: { zen: [0.5, 0.13, 250], hor: [0.88, 0.05, 75], haze: [0.84, 0.04, 70] },
  amb: { hi: [0.8, 0.03, 240], lo: [0.6, 0.04, 60] },
  cord: [0.08, 0.075, 0.07],
  peg: [0.55, 0.38, 0.22],
  // The wardrobe: sizes in metres, colours in OKLCH.
  hangFrom: 0.3,
  fog: [60, 1500],
  wash: [
    { w: 1.5, h: 1.15, c: [0.95, 0.01, 90] },
    { w: 0.7, h: 0.95, c: [0.62, 0.15, 30] },
    { w: 0.9, h: 0.7, c: [0.82, 0.12, 88] },
    { w: 0.6, h: 0.45, c: [0.7, 0.09, 235] },
  ],

  // A level view down the street; the line crosses the frame.
  frame(cam, aspect) {
    cam.fov = aspect < 1 ? 62 : 44;
    cam.aspect = aspect;
    cam.position.set(...EYE);
    cam.lookAt(0, EYE[1] - (aspect < 1 ? 1.6 : 0.4), -20);
    cam.updateProjectionMatrix();
  },

  build(scene, look) {
    const R = rng(7);
    const group = new THREE.Group();
    scene.add(group);
    const slabs = [], rails = [], spots = [], eaves = [], ribs = [], houses = [];
    // Buildings line both sides, from behind the camera to far down the street.
    for (const side of [-1, 1]) {
      let z = 26;
      while (z > -120) {
        const len = 5 + R() * 6, ht = 9.6 + R() * 3.8, set = R() * 0.3;
        const zc = z - len / 2, xf = side * (W + set);
        // The anchor walls need a free bay for the explicit window.
        const holds = zc + len / 2 > LINE_Z && zc - len / 2 < LINE_Z;
        const u = side < 0 ? z - LINE_Z + 0.75 : LINE_Z - 0.75 - (z - len);
        PPM = Math.abs(zc) < 30 ? 64 : 28;
        const { tex, base, wins } = facade(len, ht, R, holds ? { y: 8.3 - 0.75, u } : null);
        // Facade windows and doors in world space, for the dressing.
        for (const w of wins) spots.push({ ...w, side, x: xf, z: side < 0 ? z - w.u : z - len + w.u });
        const plain = new THREE.MeshStandardMaterial({ color: lin([base[0] - 0.08, base[1], base[2]]), roughness: 0.95 });
        const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
        const mats = side < 0 ? [face, plain, plain, plain, plain, plain] : [plain, face, plain, plain, plain, plain];
        const box = new THREE.Mesh(new THREE.BoxGeometry(8, ht, len), mats);
        box.position.set(xf + side * 4, ht / 2, zc);
        box.castShadow = box.receiveShadow = true;
        group.add(box);
        // A stone corbel course, then terracotta eaves over the street.
        addBox(slabs, xf - side * 0.12, ht - 0.12, zc, 0.24, 0.14, len);
        addBox(eaves, xf - side * 0.3, ht + 0.06, zc, 0.62, 0.1, len + 0.1);
        if (Math.abs(zc) < 45) for (let tz = zc - len / 2 + 0.1; tz < zc + len / 2; tz += 0.22) ribs.push([xf - side * 0.3, ht + 0.12, tz]);
        houses.push({ side, xf, z0: z - len, z1: z, ht, base, holds });
        z -= len;
      }
    }
    instanced(slabs, new THREE.MeshStandardMaterial({ color: lin([0.78, 0.02, 80]), roughness: 0.9 }), group);
    const terra = new THREE.MeshStandardMaterial({ color: lin([0.56, 0.11, 42]), roughness: 0.85 });
    instanced(eaves, terra, group);
    // Rounded tile ends ribbed along the eaves.
    const rib = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.085, 0.64, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), terra, ribs.length);
    const rm = new THREE.Matrix4();
    ribs.forEach((r, i) => rib.setMatrixAt(i, rm.makeTranslation(r[0], r[1], r[2])));
    rib.castShadow = rib.receiveShadow = true;
    group.add(rib);

    // The windows that hold the pulleys: frame, dark pane, open shutters.
    const frame = new THREE.MeshStandardMaterial({ color: lin([0.9, 0.02, 85]), roughness: 0.8 });
    const pane = new THREE.MeshStandardMaterial({ color: lin([0.16, 0.015, 250]), roughness: 0.3 });
    const shut = new THREE.MeshStandardMaterial({ color: lin([0.47, 0.08, 165]), roughness: 0.85 });
    for (const [side, y] of [[-1, 8.3], [1, 8.05]]) {
      const x = side * W, zc = LINE_Z - 0.75 * side * side;
      const win = new THREE.Group();
      const add = (m, sx, sy, sz, px, py, pz) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
        b.position.set(px, py, pz); b.castShadow = b.receiveShadow = true; win.add(b);
      };
      add(frame, 0.06, 1.75, 1.05, 0, 0, 0);
      add(pane, 0.07, 1.55, 0.85, 0, 0, 0);
      add(frame, 0.22, 0.08, 1.2, -side * 0.08, -0.9, 0);
      add(shut, 0.04, 1.6, 0.45, -side * 0.03, 0, 0.78);
      add(shut, 0.04, 1.6, 0.45, -side * 0.03, 0, -0.78);
      win.position.set(x, y - 0.75, zc);
      group.add(win);
      // An iron bracket holds the pulley out from the wall.
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.025), new THREE.MeshStandardMaterial({ color: 0x2c2d30, roughness: 0.5, metalness: 0.6 }));
      arm.position.set(x - side * 0.08, y + 0.065, LINE_Z);
      arm.castShadow = true;
      group.add(arm);
    }

    // Cobbles: a long street floor with a worn centre.
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = ok([0.62, 0.03, 70]); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      g.fillStyle = ok([0.6 + R() * 0.12, 0.03, 60 + R() * 30]);
      g.beginPath(); g.ellipse(i * 16 + 8 + (j % 2) * 8, j * 16 + 8, 7, 6.5, 0, 0, Math.PI * 2); g.fill();
    }
    const ct = new THREE.CanvasTexture(cv);
    ct.colorSpace = THREE.SRGBColorSpace; ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(5, 160); ct.anisotropy = 8;
    const street = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 160), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.85 }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, 0, -50);
    street.receiveShadow = true;
    group.add(street);
    const land = new THREE.Mesh(new THREE.PlaneGeometry(800, 600), new THREE.MeshStandardMaterial({ color: lin([0.6, 0.04, 80]), roughness: 1 }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.02, -400);
    group.add(land);
    backdrop(group, R, lin);

    // Neighbours' lines further down the street hang still.
    const cord = new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.8 });
    for (const lz of [-17, -31, -48, -70]) {
      const ly = 5.8 + R() * 3;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2 * W, 4), cord);
      c.rotation.z = Math.PI / 2; c.position.set(0, ly, lz);
      group.add(c);
      let x = -W + 0.3;
      while (x < W - 0.6) {
        const w = 0.4 + R() * 0.9, h = 0.4 + R() * 0.8;
        const col = [0.6 + R() * 0.35, R() * 0.13, R() * 360];
        // Each piece glows like the line's own washing.
        const at = new THREE.Matrix4().compose(new THREE.Vector3(x + w / 2, ly - h / 2 - 0.02, lz + (R() - 0.5) * 0.1),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (R() - 0.5) * 0.5, 0)), new THREE.Vector3(1, 1, 1));
        look.addStatic(new THREE.PlaneGeometry(w, h), { alb: rgb(lin(col)), tr: rgb(lin([Math.min(0.95, col[0] + 0.05), col[1] * 1.4, col[2]])) }, { size: [w, h], at });
        x += w + 0.08 + R() * 0.3;
      }
    }
    walls(group, R, { W, LINE_Z, houses, spots, lin });
    dress(group, R, { W, LINE_Z, spots, lin, look });
    return group;
  },
};
