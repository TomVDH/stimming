// Alley: a pulley line crosses a narrow street between two windows.
// The camera looks down the street from a first-floor window.
// The street runs along z; the walls face each other at x = ±W.
import * as THREE from 'three';
import { oklchLinear } from '../../shared/stim.js';

const W = 2.6;
const LINE_Z = 0;
const EYE = [0.45, 4.6, 12];

// A small seeded random, so the street is the same every visit.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLASTER = [
  [0.78, 0.07, 70], [0.7, 0.09, 45], [0.82, 0.05, 85], [0.74, 0.06, 30],
  [0.8, 0.08, 95], [0.69, 0.04, 60], [0.76, 0.05, 20], [0.72, 0.03, 230],
];
const SHUTTER = [[0.48, 0.07, 160], [0.45, 0.06, 200], [0.42, 0.05, 50], [0.5, 0.06, 140], [0.4, 0.03, 250]];
const ok = ([L, C, h], a = 1) => `oklch(${L} ${C} ${h} / ${a})`;
const PPM = 28;

// One canvas per facade: plaster, grime, floors, windows and shutters.
function facade(len, ht, R, anchorWin) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(len * PPM); cv.height = Math.ceil(ht * PPM);
  const g = cv.getContext('2d'), X = cv.width, Y = cv.height;
  const base = PLASTER[Math.floor(R() * PLASTER.length)];
  g.fillStyle = ok(base); g.fillRect(0, 0, X, Y);
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
  // A cornice line at the roof.
  g.fillStyle = ok([base[0] - 0.12, base[1], base[2]]); g.fillRect(0, 0, X, 0.25 * PPM);
  g.fillStyle = ok([base[0] + 0.06, base[1] * 0.5, base[2]]); g.fillRect(0, 0.25 * PPM, X, 0.08 * PPM);
  const shut = SHUTTER[Math.floor(R() * SHUTTER.length)];
  const bays = Math.max(1, Math.round(len / 2.3)), bw = len / bays;
  const win = (cx, cy, w, h, mode) => {
    const x = (cx - w / 2) * PPM, y = Y - (cy + h / 2) * PPM, pw = w * PPM, ph = h * PPM;
    // A stone surround, a dark pane, a sill.
    g.fillStyle = ok([base[0] + 0.07, base[1] * 0.4, base[2]]);
    g.fillRect(x - 0.1 * PPM, y - 0.1 * PPM, pw + 0.2 * PPM, ph + 0.18 * PPM);
    g.fillStyle = ok([0.2, 0.015, 250]); g.fillRect(x, y, pw, ph);
    g.fillStyle = ok([0.32, 0.02, 250]); g.fillRect(x + pw * 0.48, y, pw * 0.04, ph);
    g.fillStyle = ok([base[0] - 0.2, base[1], base[2]], 0.5); g.fillRect(x, y + ph + 0.08 * PPM, pw, 0.1 * PPM);
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
      g.fillStyle = ok([0.24, 0.02, 50]);
      g.fillRect((cx - 0.55) * PPM, Y - 2.6 * PPM, 1.1 * PPM, 2.6 * PPM);
      g.beginPath(); g.arc(cx * PPM, Y - 2.6 * PPM, 0.55 * PPM, Math.PI, 0); g.fill();
    } else win(cx, 1.9, 0.8, 1.2, R() < 0.5 ? 0 : 2);
    for (let fy = 4.2; fy + 1.6 < ht - 0.6; fy += 3.1) {
      if (anchorWin && Math.abs(fy + 0.8 - anchorWin.y) < 1.6 && Math.abs(cx - anchorWin.u) < bw * 0.6) continue;
      win(cx, fy + 0.8, 0.9, 1.6, R() < 0.35 ? 0 : R() < 0.6 ? 1 : 2);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { tex: t, base };
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

const lin = ([L, C, h]) => new THREE.Color().setRGB(...oklchLinear(L, C, h).map(v => Math.max(0, v)));

export default {
  id: 'alley',
  name: 'Alley',
  anchors: { a: [-W + 0.14, 8.3, LINE_Z], b: [W - 0.14, 8.05, LINE_Z] },
  windDir: [0.25, 0.97],
  // Directions to the sun: behind the viewer, then low down the street.
  sun: { front: [0.5, 0.72, 0.48], back: [0.05, 0.25, -0.97] },
  sky: { zen: [0.5, 0.13, 250], hor: [0.88, 0.05, 75], haze: [0.84, 0.04, 70] },
  amb: { hi: [0.8, 0.03, 240], lo: [0.6, 0.04, 60] },
  cord: [0.08, 0.075, 0.07],
  peg: [0.55, 0.38, 0.22],
  // The wardrobe: sizes in metres, colours in OKLCH.
  wash: [
    { w: 1.5, h: 1.15, c: [0.95, 0.01, 90] },
    { w: 0.7, h: 1.05, c: [0.62, 0.15, 30] },
    { w: 0.9, h: 0.75, c: [0.82, 0.12, 88] },
    { w: 0.6, h: 0.45, c: [0.7, 0.09, 235] },
  ],

  frame(cam, aspect) {
    const span = 5.0, d = EYE[2] - LINE_Z;
    const f = aspect < 1 ? 0.86 : aspect < 1.3 ? 0.7 : 0.56;
    const tanH = span / f / (2 * d);
    const tanV = Math.min(Math.tan(THREE.MathUtils.degToRad(36)), tanH / aspect);
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanV));
    cam.aspect = aspect;
    // The line sits in the top half of the frame.
    const elev = Math.atan2(8.2 - EYE[1], d);
    const pitch = elev - Math.atan(0.42 * tanV);
    cam.position.set(...EYE);
    cam.lookAt(0.15, EYE[1] + Math.tan(pitch) * d, LINE_Z);
    cam.updateProjectionMatrix();
    // The line spans this many metres of the view, for drag scale.
    return d;
  },

  build(scene) {
    const R = rng(7);
    const group = new THREE.Group();
    scene.add(group);
    const slabs = [], rails = [];
    // Buildings line both sides, from behind the camera to far down the street.
    for (const side of [-1, 1]) {
      let z = 26;
      while (z > -120) {
        const len = 6 + R() * 6, ht = 12 + R() * 9, set = R() * 0.22;
        const zc = z - len / 2, xf = side * (W + set);
        // The anchor walls need a free bay for the explicit window.
        const holds = zc + len / 2 > LINE_Z && zc - len / 2 < LINE_Z;
        const u = side < 0 ? z - LINE_Z + 0.75 : LINE_Z - 0.75 - (z - len);
        const { tex, base } = facade(len, ht, R, holds ? { y: 8.3 - 0.75, u } : null);
        const plain = new THREE.MeshStandardMaterial({ color: lin([base[0] - 0.08, base[1], base[2]]), roughness: 0.95 });
        const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
        const mats = side < 0 ? [face, plain, plain, plain, plain, plain] : [plain, face, plain, plain, plain, plain];
        const box = new THREE.Mesh(new THREE.BoxGeometry(8, ht, len), mats);
        box.position.set(xf + side * 4, ht / 2, zc);
        box.castShadow = box.receiveShadow = true;
        group.add(box);
        // A cornice ledge casts a line of shadow.
        addBox(slabs, xf - side * 0.12, ht - 0.35, zc, 0.26, 0.16, len);
        // Some floors carry a balcony.
        for (let fy = 4.2; fy + 1.6 < ht - 0.6; fy += 3.1) {
          if (R() < 0.18 && !(holds && Math.abs(fy - 7.5) < 1.6)) {
            const bz = zc + (R() - 0.5) * (len - 2);
            addBox(slabs, xf - side * 0.35, fy - 0.05, bz, 0.7, 0.1, 1.5);
            addBox(rails, xf - side * 0.68, fy + 0.45, bz, 0.025, 0.9, 1.5);
          }
        }
        z -= len;
      }
    }
    instanced(slabs, new THREE.MeshStandardMaterial({ color: lin([0.78, 0.02, 80]), roughness: 0.9 }), group);
    instanced(rails, new THREE.MeshStandardMaterial({ color: lin([0.22, 0.01, 250]), roughness: 0.6, metalness: 0.4 }), group);

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
    g.fillStyle = ok([0.55, 0.02, 70]); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      g.fillStyle = ok([0.5 + R() * 0.12, 0.02, 60 + R() * 30]);
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
    // A far ridge closes the end of the street in haze.
    const ridge = new THREE.Mesh(new THREE.PlaneGeometry(900, 60), new THREE.MeshStandardMaterial({ color: lin([0.55, 0.05, 120]), roughness: 1 }));
    ridge.position.set(0, 4, -520);
    group.add(ridge);

    // Neighbours' lines further down the street hang still.
    const cord = new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.8 });
    for (const lz of [-17, -31, -48, -70]) {
      const ly = 6.5 + R() * 4.5;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2 * W, 4), cord);
      c.rotation.z = Math.PI / 2; c.position.set(0, ly, lz);
      group.add(c);
      let x = -W + 0.3;
      while (x < W - 0.6) {
        const w = 0.4 + R() * 0.9, h = 0.4 + R() * 0.8;
        const col = [0.6 + R() * 0.35, R() * 0.13, R() * 360];
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          new THREE.MeshStandardMaterial({ color: lin(col), roughness: 0.95, side: THREE.DoubleSide }));
        p.position.set(x + w / 2, ly - h / 2 - 0.02, lz + (R() - 0.5) * 0.1);
        p.rotation.y = (R() - 0.5) * 0.5;
        p.castShadow = true;
        group.add(p);
        x += w + 0.08 + R() * 0.3;
      }
    }
    return group;
  },
};
