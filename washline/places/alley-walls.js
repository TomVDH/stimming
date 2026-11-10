// Alley walls: roofs, chimneys, drainpipes, cables, balconies, grilles and ivy.
// It reads the houses and window spots that alley.js gives it.
import * as THREE from 'three';

// One instanced mesh per part; each item has a position, a scale and an angle.
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

// Curved tiles in pale grey; each roof tints it with its own terracotta.
function tileTexture() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 64, 128);
  // Each channel is lit on one flank and shaded on the other.
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#8a8a8a'); gr.addColorStop(0.35, '#f0f0f0'); gr.addColorStop(0.7, '#c4c4c4'); gr.addColorStop(1, '#7a7a7a');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  // Courses overlap every few tiles down the slope.
  for (let y = 0; y < 128; y += 32) {
    g.fillStyle = 'rgba(40,30,25,0.35)'; g.fillRect(0, y, 64, 3);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, y + 3, 64, 2);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function walls(group, R, { W, LINE_Z, houses, spots, lin }) {
  /* ---------- roofs and chimneys ---------- */
  // Each roof slopes up from the eave to a ridge inside the house.
  const tiles = tileTexture(), chim = [], caps = [];
  for (const h of houses) {
    const out = -h.side, xe = h.xf + out * 0.55, xr = h.xf - out * 3.6, ye = h.ht + 0.12, yr = h.ht + 1.9;
    const z0 = h.z0 - 0.05, z1 = h.z1 + 0.05, slope = Math.hypot(xr - xe, yr - ye);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([xe, ye, z0, xe, ye, z1, xr, yr, z0, xr, yr, z1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, (z1 - z0) / 0.26, 0, 0, slope / 1.1, (z1 - z0) / 0.26, slope / 1.1], 2));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      map: tiles, color: lin([0.68 + R() * 0.1, 0.1 + R() * 0.04, 38 + R() * 14]), roughness: 0.85, side: THREE.DoubleSide,
    }));
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    if (R() < 0.4) {
      const cz = h.z0 + 0.6 + R() * (h.z1 - h.z0 - 1.2), cx = h.xf - out * (1.6 + R() * 1.2);
      chim.push({ p: [cx, h.ht + 1.6, cz], s: [0.55, 1.6, 0.55], c: lin([0.86, 0.03, 85]) });
      caps.push({ p: [cx, h.ht + 2.45, cz], s: [0.75, 0.08, 0.75] });
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const paint = r => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: r });
  inst(group, box, paint(0.9), chim);
  inst(group, box, new THREE.MeshStandardMaterial({ color: lin([0.58, 0.1, 42]), roughness: 0.85 }), caps);

  /* ---------- drainpipes ---------- */
  // A pipe runs down one corner of most houses, held by small clips.
  const pipes = [], clips = [];
  for (const h of houses) {
    if (R() < 0.3) continue;
    const out = -h.side, z = R() < 0.5 ? h.z0 + 0.14 : h.z1 - 0.14, x = h.xf + out * 0.08;
    const c = R() < 0.6 ? lin([0.58, 0.1, 45]) : lin([0.55, 0.01, 250]);
    pipes.push({ p: [x, h.ht / 2, z], s: [1, h.ht, 1], c });
    for (let y = 1.2; y < h.ht; y += 1.6) clips.push({ p: [x - out * 0.04, y, z], s: [0.1, 0.03, 0.03] });
  }
  inst(group, new THREE.CylinderGeometry(0.045, 0.045, 1, 8), paint(0.6), pipes);
  inst(group, box, new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.5 }), clips, false);

  /* ---------- cables ---------- */
  // Power cables loop along each facade and a few cross the street.
  const pts = [];
  const sagLine = (a, b, sag, n = 16) => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      for (const t of [t0, t1]) pts.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t);
    }
  };
  for (const side of [-1, 1]) {
    const row = houses.filter(h => h.side === side).sort((a, b) => b.z1 - a.z1);
    let prev = null;
    for (const h of row) {
      const p = [h.xf - side * 0.07, 3.9 + R() * 0.3, h.z1 - 0.2];
      if (prev) sagLine(prev, p, 0.12 + R() * 0.12);
      prev = [h.xf - side * 0.07, 3.9 + R() * 0.3, h.z0 + 0.2];
      sagLine(p, prev, 0.08);
    }
  }
  for (let i = 0; i < 6; i++) {
    let z = 8 - R() * 50;
    if (Math.abs(z - LINE_Z) < 1.8) z -= 3;
    const y = 5.4 + R() * 2.2;
    sagLine([-W, y, z], [W, y + (R() - 0.5) * 0.6, z + (R() - 0.5) * 2], 0.25 + R() * 0.2, 20);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x1b1918 })));

  /* ---------- balconies and grilles ---------- */
  // Iron balconies on some upper windows; iron bars on low ones.
  const slabs = [], iron = [], ledges = [];
  for (const sp of spots) {
    if (sp.kind !== 'win' || sp.z < -60 || sp.z > 14) continue;
    const out = -sp.side;
    if (sp.y > 4 && R() < 0.24 && !(Math.abs(sp.z - LINE_Z) < 1.8 && sp.y > 6.5)) {
      const fy = sp.y - sp.h / 2 - 0.05, bw = sp.w + 0.7, d = 0.55;
      slabs.push({ p: [sp.x + out * d / 2, fy, sp.z], s: [d, 0.09, bw] });
      for (const k of [-0.3, 0.3]) slabs.push({ p: [sp.x + out * 0.12, fy - 0.12, sp.z + k * bw], s: [0.24, 0.16, 0.1] });
      // The rail: a top bar, a bottom bar and close-set bars between.
      const top = fy + 0.95, xr = sp.x + out * (d - 0.03);
      iron.push({ p: [xr, top, sp.z], s: [0.035, 0.035, bw] });
      iron.push({ p: [xr, fy + 0.12, sp.z], s: [0.02, 0.02, bw] });
      for (let z = -bw / 2 + 0.03; z <= bw / 2; z += 0.11) iron.push({ p: [xr, fy + 0.53, sp.z + z], s: [0.014, 0.82, 0.014] });
      for (const k of [-1, 1]) {
        iron.push({ p: [sp.x + out * d / 2, top, sp.z + (k * bw) / 2], s: [d, 0.035, 0.035] });
        for (let x = 0.08; x < d; x += 0.11) iron.push({ p: [sp.x + out * x, fy + 0.53, sp.z + (k * bw) / 2], s: [0.014, 0.82, 0.014] });
      }
      ledges.push({ kind: 'ledge', side: sp.side, x: sp.x + out * (d * 0.55), y: fy + 0.05, z: sp.z, w: bw - 0.3 });
    } else if (sp.y < 3) {
      const xg = sp.x + out * 0.11;
      for (let z = -sp.w / 2 + 0.06; z < sp.w / 2; z += sp.w / 6) iron.push({ p: [xg, sp.y, sp.z + z], s: [0.018, sp.h + 0.12, 0.018] });
      for (const y of [-0.3, 0.3]) iron.push({ p: [xg, sp.y + y * sp.h, sp.z], s: [0.018, 0.025, sp.w + 0.06] });
    }
  }
  spots.push(...ledges);
  inst(group, box, new THREE.MeshStandardMaterial({ color: lin([0.84, 0.03, 80]), roughness: 0.9 }), slabs);
  inst(group, box, new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.45, metalness: 0.5 }), iron);

  /* ---------- ivy ---------- */
  // Ivy climbs from the street in loose patches on some walls.
  const ivy = [];
  for (const h of houses) {
    if (h.z1 < -55 || h.z0 > 14 || R() > 0.32) continue;
    const out = -h.side, cz = h.z0 + 0.5 + R() * (h.z1 - h.z0 - 1), top = 2.4 + R() * 4.5, wid = 0.6 + R() * 1.2;
    for (let i = 0; i < 90; i++) {
      const t = Math.pow(R(), 0.7), y = 0.4 + t * top, sp = wid * (1 - 0.6 * t);
      ivy.push({ p: [h.xf + out * (0.05 + R() * 0.16), y, cz + (R() - 0.5) * sp * 2], s: [0.13, 0.11, 0.13].map(v => v * (0.6 + R() * 0.8)),
        c: lin([0.36 + R() * 0.12, 0.09 + R() * 0.03, 130 + R() * 20]) });
    }
  }
  inst(group, new THREE.IcosahedronGeometry(1, 0), paint(0.8), ivy);
}
