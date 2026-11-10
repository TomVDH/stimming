// Alley dressing, Valldemossa: flower pots, lanterns, bunting and a market.
// It reads the facade windows and doors that alley.js gives it.
import * as THREE from 'three';

const FLOWER = [[0.58, 0.2, 25], [0.7, 0.16, 0], [0.55, 0.22, 340], [0.95, 0.01, 90], [0.68, 0.17, 40]];
const LEAF = [[0.48, 0.11, 140], [0.42, 0.1, 135], [0.52, 0.12, 128]];
const FLAG = [[0.6, 0.2, 28], [0.85, 0.16, 92], [0.55, 0.15, 255], [0.62, 0.15, 150], [0.95, 0.01, 90], [0.7, 0.17, 50]];
const STRIPE = [[0.58, 0.19, 27], [0.55, 0.12, 155], [0.55, 0.13, 250], [0.82, 0.15, 90]];
const FRUIT = [[0.72, 0.18, 55], [0.9, 0.17, 100], [0.58, 0.2, 30], [0.6, 0.15, 135], [0.35, 0.1, 320]];
const POT = [[0.58, 0.1, 45], [0.62, 0.11, 50], [0.55, 0.09, 40]];
const GLAZE = [[0.55, 0.12, 250], [0.6, 0.11, 160], [0.82, 0.14, 92], [0.9, 0.02, 90]];

// One instanced mesh per part; each item has a position, a scale and a colour.
function inst(group, geo, mat, items, shadow = true) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  items.forEach((it, i) => {
    q.setFromEuler(e.set(...(it.r || [0, 0, 0])));
    m.setMatrixAt(i, mx.compose(p.set(...it.p), q, s.set(...(it.s || [1, 1, 1]))));
    if (it.c) m.setColorAt(i, it.c);
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export function dress(group, R, { W, LINE_Z, spots, lin }) {
  const pick = a => a[Math.floor(R() * a.length)];
  const pots = [], leaves = [], flowers = [];

  // A potted geranium: a terracotta pot, a ball of leaves, a crown of flowers.
  function plant(x, y, z, k = 1, trail = false) {
    pots.push({ p: [x, y, z], s: [k, k, k], c: lin(pick(POT)) });
    const lr = (0.11 + R() * 0.06) * k, ly = y + 0.08 * k + lr * 0.6;
    leaves.push({ p: [x, trail ? ly - lr * 0.5 : ly, z], s: [lr, trail ? lr * 1.8 : lr, lr], c: lin(pick(LEAF)) });
    const fc = lin(pick(FLOWER));
    for (let i = 0, n = 4 + Math.floor(R() * 5); i < n; i++) {
      const a = R() * Math.PI * 2, u = 0.3 + R() * 0.6;
      flowers.push({ p: [x + Math.cos(a) * lr * u, ly + lr * (0.55 + R() * 0.4), z + Math.sin(a) * lr * u], s: [0.035, 0.03, 0.035].map(v => v * k), c: fc });
    }
  }

  for (const sp of spots) {
    // The street side of the wall is toward x = 0.
    const out = -sp.side;
    if (sp.kind === 'door') {
      // Doors gather pots on the step and hung on the wall around them.
      for (let i = 0, n = 2 + Math.floor(R() * 4); i < n; i++) {
        const dz = (R() < 0.5 ? -1 : 1) * (0.7 + R() * 0.6);
        plant(sp.x + out * (0.2 + R() * 0.2), 0.07, sp.z + dz, 1.2 + R() * 0.6);
      }
      for (let i = 0, n = 3 + Math.floor(R() * 6); i < n; i++) {
        const dz = (R() < 0.5 ? -1 : 1) * (0.75 + R() * 0.8);
        plant(sp.x + out * 0.13, 1.1 + R() * 1.7, sp.z + dz, 0.85, R() < 0.4);
      }
    } else if (sp.kind === 'ledge') {
      // Balcony floors carry a row of pots.
      for (let i = 0, n = 2 + Math.floor(R() * 3); i < n; i++) plant(sp.x, sp.y, sp.z + (i / Math.max(1, n - 1) - 0.5) * sp.w, 0.9, R() < 0.4);
    } else if (sp.y > 3 && R() < 0.45) {
      // A row of pots stands on the sill.
      const sill = sp.y - sp.h / 2 - 0.02;
      for (let i = 0, n = 1 + Math.floor(R() * 3); i < n; i++) {
        plant(sp.x + out * 0.14, sill, sp.z + (i - (n - 1) / 2) * 0.28, 0.8, R() < 0.5);
      }
    }
  }

  const potGeo = new THREE.CylinderGeometry(0.1, 0.075, 0.14, 10).translate(0, 0.07, 0);
  const ball = new THREE.IcosahedronGeometry(1, 1);
  const white = c => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: c });
  inst(group, potGeo, white(0.9), pots);
  inst(group, ball, white(0.85), leaves);
  inst(group, new THREE.IcosahedronGeometry(1, 0), white(0.7), flowers, false);

  /* ---------- window relief ---------- */
  // Near windows get stone surrounds, deep sills and real open shutters.
  const stone = [], shutters = [], plaques = [], blooms = [], vine = [];
  for (const sp of spots) {
    if (sp.z < -40 || sp.z > 14) continue;
    const out = -sp.side, x = sp.x;
    const pale = lin([0.84, 0.04, 80]);
    if (sp.kind === 'win') {
      stone.push({ p: [x + out * 0.03, sp.y + sp.h / 2 + 0.1, sp.z], s: [0.08, 0.16, sp.w + 0.36], c: pale });
      stone.push({ p: [x + out * 0.08, sp.y - sp.h / 2 - 0.07, sp.z], s: [0.18, 0.08, sp.w + 0.3], c: pale });
      for (const k of [-1, 1]) stone.push({ p: [x + out * 0.025, sp.y, sp.z + k * (sp.w / 2 + 0.08)], s: [0.06, sp.h, 0.14], c: pale });
      if (sp.mode === 1) {
        // Each leaf swings out from its hinge, almost back to the wall.
        for (const k of [-1, 1]) {
          const a = (0.25 + R() * 0.35) * k * sp.side;
          const hz = sp.z + k * (sp.w / 2 + 0.16), lw = sp.w / 2;
          shutters.push({ p: [x + out * (0.04 + Math.sin(Math.abs(a)) * lw / 2), sp.y, hz + k * Math.cos(a) * lw / 2], s: [0.035, sp.h, lw], r: [0, a, 0], c: lin(sp.shut) });
        }
      }
    } else if (sp.kind === 'door') {
      // A painted tile plaque of the town's saint sits beside some doors.
      if (R() < 0.5) plaques.push({ p: [x + out * 0.02, 2.1, sp.z + (R() < 0.5 ? -1 : 1) * 0.95], s: [0.03, 0.42, 0.32], r: [0, sp.side < 0 ? Math.PI / 2 : -Math.PI / 2, 0] });
      // Bougainvillea climbs some door jambs and spills over the top.
      if (R() < 0.45) {
        const bz = sp.z + (R() < 0.5 ? -1 : 1) * (0.8 + R() * 0.4);
        for (let i = 0; i < 26; i++) {
          const t = R(), y = 0.3 + t * (3.4 + R() * 1.2), spread = 0.15 + t * 0.6;
          const at = [x + out * (0.08 + R() * 0.18), y, bz + (R() - 0.5) * spread * 2];
          vine.push({ p: at, s: [0.16, 0.13, 0.16].map(v => v * (0.6 + R() * 0.7)), c: lin(pick(LEAF)) });
          if (t > 0.35 && R() < 0.75) blooms.push({ p: [at[0] + out * 0.06, at[1] + (R() - 0.5) * 0.1, at[2] + (R() - 0.5) * 0.12], s: [0.11, 0.09, 0.11].map(v => v * (0.6 + R() * 0.6)), c: lin([0.55 + R() * 0.08, 0.22, 345 + R() * 12]) });
        }
      }
    }
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  inst(group, unit, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), stone);
  inst(group, unit, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), shutters);
  inst(group, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), vine);
  inst(group, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), blooms, false);
  // The plaque: blue and white tiles inside a yellow frame.
  const pc = document.createElement('canvas'); pc.width = 64; pc.height = 96;
  const pg = pc.getContext('2d');
  pg.fillStyle = 'oklch(0.82 0.14 92)'; pg.fillRect(0, 0, 64, 96);
  pg.fillStyle = 'oklch(0.96 0.01 240)'; pg.fillRect(6, 6, 52, 84);
  pg.fillStyle = 'oklch(0.45 0.14 260)';
  pg.beginPath(); pg.arc(32, 30, 11, 0, Math.PI * 2); pg.fill();
  pg.fillRect(20, 42, 24, 36);
  pg.strokeStyle = 'oklch(0.7 0.06 250)';
  for (let i = 6; i < 58; i += 13) { pg.beginPath(); pg.moveTo(i, 6); pg.lineTo(i, 90); pg.stroke(); }
  for (let j = 6; j < 90; j += 14) { pg.beginPath(); pg.moveTo(6, j); pg.lineTo(58, j); pg.stroke(); }
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  inst(group, unit, new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.3 }), plaques, false);

  /* ---------- lanterns ---------- */
  // Iron wall lanterns on arms; the glass glows warm.
  const iron = [], glass = [];
  for (const side of [-1, 1]) {
    for (let z = 2 - R() * 3; z > -45; z -= 6 + R() * 4) {
      if (Math.abs(z - LINE_Z) < 1.2) continue;
      const x = side * W, out = -side, y = 3.3 + R() * 0.4;
      iron.push({ p: [x + out * 0.2, y + 0.18, z], s: [0.4, 0.03, 0.03] });
      iron.push({ p: [x + out * 0.38, y + 0.05, z], s: [0.2, 0.05, 0.2] });
      iron.push({ p: [x + out * 0.38, y - 0.24, z], s: [0.16, 0.04, 0.16] });
      glass.push({ p: [x + out * 0.38, y - 0.1, z], s: [0.14, 0.24, 0.14] });
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  inst(group, box, new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.5, metalness: 0.5 }), iron);
  inst(group, box, new THREE.MeshStandardMaterial({ color: lin([0.9, 0.1, 80]), emissive: lin([0.85, 0.13, 70]), emissiveIntensity: 2.2, roughness: 0.3 }), glass, false);

  /* ---------- bunting ---------- */
  // Strings of pennants cross the street, tilted a little by the wind.
  const pos = [], col = [], strand = [];
  const ROWS = [[4.5, 9.8], [-3.5, 6.4], [-9, 7.3], [-16, 6.1], [-26, 7.6], [-40, 6.6]];
  for (const [z0, y0] of ROWS) {
    const za = z0 + (R() - 0.5) * 1.5, zb = z0 + (R() - 0.5) * 1.5, yb = y0 + (R() - 0.5) * 0.6, sag = 0.3 + R() * 0.25;
    const at = t => [-W + 2 * W * t, y0 + (yb - y0) * t - sag * 4 * t * (1 - t), za + (zb - za) * t];
    const N = 40;
    for (let i = 0; i < N; i++) strand.push(...at(i / N), ...at((i + 1) / N));
    for (let t = 0.03; t < 0.97; t += 0.3 / (2 * W)) {
      const a = at(t), b = at(Math.min(1, t + 0.2 / (2 * W))), tilt = 0.15 + R() * 0.25;
      const tip = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.27 * Math.cos(tilt), (a[2] + b[2]) / 2 - 0.27 * Math.sin(tilt)];
      pos.push(...a, ...b, ...tip);
      const c = lin(pick(FLAG));
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    }
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bg.computeVertexNormals();
  const flags = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
  flags.castShadow = flags.receiveShadow = true;
  group.add(flags);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(strand, 3));
  group.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0x2a2622 })));

  /* ---------- market ---------- */
  // Stalls line both walls; a narrow walk stays open in the middle.
  const wood = [], cloth = [], crates = [], fruit = [], wares = [], poles = [];
  const awn = [];
  for (const side of [-1, 1]) {
    for (let z = 5 + R() * 2; z > -26; ) {
      const len = 1.5 + R() * 0.9, zc = z - len / 2, out = -side, D = 0.85;
      const xi = side * W + out * D / 2;
      // A table under a cloth that falls to the ground.
      wood.push({ p: [xi, 0.78, zc], s: [D, 0.05, len] });
      cloth.push({ p: [side * W + out * (D - 0.02), 0.4, zc], s: [0.02, 0.76, len], c: lin(pick(STRIPE)) });
      // Goods: crates of fruit, or glazed pots and bowls.
      const fruitStall = R() < 0.6;
      for (let k = 0, n = Math.floor(len / 0.5); k < n; k++) {
        const cz = zc - len / 2 + 0.25 + k * (len - 0.5) / Math.max(1, n - 1);
        if (fruitStall) {
          const fx = side * W + out * (D * 0.5);
          crates.push({ p: [fx, 0.86, cz], s: [0.55, 0.12, 0.42] });
          const fc = pick(FRUIT);
          for (let u = 0; u < 4; u++) for (let v = 0; v < 3; v++) {
            fruit.push({ p: [fx - 0.2 + u * 0.13 + (R() - 0.5) * 0.03, 0.95 + R() * 0.03, cz - 0.13 + v * 0.13], s: [0.055, 0.055, 0.055], c: lin([fc[0] + (R() - 0.5) * 0.06, fc[1], fc[2] + (R() - 0.5) * 10]) });
          }
        } else {
          const r = 0.06 + R() * 0.07, h = 0.08 + R() * 0.25;
          wares.push({ p: [side * W + out * (0.25 + R() * 0.45), 0.8 + h / 2, cz], s: [r, h, r], c: lin(pick(GLAZE)) });
        }
      }
      // A striped awning slopes from the wall over the table.
      const stripe = pick(STRIPE);
      awn.push({ side, zc, len, stripe });
      poles.push({ p: [side * W + out * 1.1, 0.98, zc - len / 2 + 0.04], s: [0.04, 1.96, 0.04] });
      poles.push({ p: [side * W + out * 1.1, 0.98, zc + len / 2 - 0.04], s: [0.04, 1.96, 0.04] });
      z -= len + 0.4 + R() * 1.4;
    }
  }
  inst(group, box, new THREE.MeshStandardMaterial({ color: lin([0.5, 0.06, 60]), roughness: 0.8 }), wood);
  inst(group, box, white(0.95), cloth);
  inst(group, box, new THREE.MeshStandardMaterial({ color: lin([0.62, 0.07, 75]), roughness: 0.9 }), crates);
  inst(group, ball, white(0.6), fruit, false);
  inst(group, new THREE.CylinderGeometry(1, 0.8, 1, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }), wares);
  inst(group, box, new THREE.MeshStandardMaterial({ color: lin([0.4, 0.04, 60]), roughness: 0.8 }), poles);

  // Each awning is a slanted plane with a stripe texture and a scalloped edge.
  const texOf = new Map();
  const tex = s => {
    const key = s.join();
    if (texOf.has(key)) return texOf.get(key);
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = 'oklch(0.95 0.01 90)'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = `oklch(${s[0]} ${s[1]} ${s[2]})`;
    for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 16, 64);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    texOf.set(key, t);
    return t;
  };
  for (const a of awn) {
    const out = -a.side, x0 = a.side * W, x1 = x0 + out * 1.15, z0 = a.zc - a.len / 2, z1 = a.zc + a.len / 2;
    // A slope from the wall at 2.75 m to 1.95 m, then a front flap.
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      x0, 2.75, z0, x0, 2.75, z1, x1, 1.95, z0, x1, 1.95, z1, x1, 1.72, z0, x1, 1.72, z1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, a.len, 1, 0, 0.25, a.len, 0.25, 0, 0, a.len, 0], 2));
    g.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]);
    g.computeVertexNormals();
    const t = tex(a.stripe);
    t.wrapS = THREE.RepeatWrapping;
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.85 }));
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
}

/* ---------- backdrop ---------- */
// The Tramuntana ridges, a bell tower with a green spire, cypresses.
export function backdrop(group, R, lin) {
  // Each ridge is a filled profile; farther ridges are paler and higher.
  const RIDGES = [[-300, 70, [0.52, 0.06, 135]], [-520, 140, [0.62, 0.05, 200]], [-800, 230, [0.72, 0.04, 230]]];
  for (const [z, top, c] of RIDGES) {
    const sh = new THREE.Shape(), w = 2400, ph = R() * 9;
    sh.moveTo(-w / 2, -40);
    for (let i = 0; i <= 160; i++) {
      const x = -w / 2 + (w * i) / 160, u = x / 180;
      const y = top * (0.55 + 0.25 * Math.sin(u + ph) + 0.12 * Math.sin(u * 2.7 + ph * 2) + 0.06 * Math.sin(u * 7.3 + ph));
      sh.lineTo(x, y);
    }
    sh.lineTo(w / 2, -40);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: lin(c), roughness: 1 }));
    m.position.z = z;
    group.add(m);
  }
  // A square stone tower, an open belfry and a glazed green spire.
  const T = new THREE.Group(), st = new THREE.MeshStandardMaterial({ color: lin([0.72, 0.07, 70]), roughness: 0.9 });
  const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = m.receiveShadow = true; T.add(m); };
  add(new THREE.BoxGeometry(6, 34, 6), st, 17);
  add(new THREE.BoxGeometry(6.6, 0.6, 6.6), st, 34.3);
  add(new THREE.CylinderGeometry(2.6, 2.9, 5, 8), st, 37);
  for (let k = 0; k < 4; k++) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x14120f }));
    o.position.set(Math.sin((k * Math.PI) / 2) * 2.85, 37, Math.cos((k * Math.PI) / 2) * 2.85);
    o.rotation.y = (k * Math.PI) / 2;
    T.add(o);
  }
  add(new THREE.ConeGeometry(3.1, 9, 8), new THREE.MeshStandardMaterial({ color: lin([0.58, 0.11, 170]), roughness: 0.35, metalness: 0.1 }), 44);
  add(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ color: lin([0.8, 0.12, 90]), roughness: 0.3, metalness: 0.6 }), 48.8);
  T.position.set(1.5, 0, -165);
  group.add(T);
  // Cypresses stand dark above the far roofs.
  const cy = [];
  for (let i = 0; i < 14; i++) {
    const h = 10 + R() * 9;
    cy.push({ p: [(R() < 0.5 ? -1 : 1) * (8 + R() * 30), h / 2 + 2, -120 - R() * 90], s: [1.3 + R() * 0.6, h, 1.3 + R() * 0.6], c: lin([0.36 + R() * 0.05, 0.06, 145]) });
  }
  inst(group, new THREE.ConeGeometry(1, 1, 7).scale(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), cy);
}
