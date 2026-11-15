// East Van postcards: Trout Lake at dawn. One card.
// The viewer stands on the south shore and looks north.
// The lawn is y = 0. The water lies at WATER.
import { THREE, V, UP, M, col, rng, lerp, hash, tex, std, ico, ni, mergeGeometries, personGeo } from '../kit.js';

const WATER = -0.45, DECK = -0.1, DX = 4;
// The beach is a tilted disc: its top falls to the north.
const sandTop = z => 0.02 + (z - 0.9) * 0.055;
// The shore, anticlockwise from the south: x, z.
const SHORE = [[5, 0], [16, -1.5], [20, -8], [19, -18], [17, -30], [17, -42], [24, -52], [38, -62], [50, -82], [55, -110], [54, -145], [46, -180], [30, -200],
  [5, -207], [-20, -203], [-42, -185], [-52, -150], [-55, -110], [-52, -80], [-44, -52], [-30, -32], [-17, -22], [-8.5, -15], [-7.5, -8], [-5, -1.5]];
// The walk: from A on the sand to the dock foot, then out to the dock head.
const AX = 12, AZ = -3.4, BZ = -2.8, CZ = -22.9, SPEED = 1.1, HOLD = 16;
const LA = Math.hypot(DX - AX, BZ - AZ), LT = LA + BZ - CZ, T1 = LT / SPEED, PER = 2 * T1 + HOLD + 5, YA = Math.atan2(DX - AX, BZ - AZ);
// Each goose trails the leader by this angle.
const GA = [0, 0.33, 0.62, 1.05, 1.36];

export const cards = [
  { cap: 'Trout Lake · 6:50 am · Mist', hour: 6.8,
    cam: { pos: [0.6, 1.5, 7.6], yaw: 0, pitch: 0, up: 15, down: 10, minHalf: 0.3, downMax: 18 },
    // The sun stands low in the east, a little north.
    sun: [0.86, 0.17, -0.3], sunCol: col(0.88, 0.11, 55), sunI: 3, hemi: [col(0.8, 0.05, 290), col(0.62, 0.06, 60), 1],
    fog: col(0.84, 0.055, 45), fogD: 0.0042,
    sky: { cloudA: 0.3, cov: 0.58, cloud: col(0.72, 0.06, 330), cloudLit: col(0.96, 0.09, 55), hazeA: 0.9, hazeK: 10, disc: 1, sunCol: col(0.93, 0.12, 60, 5) },
    exposure: 1, wet: true, rain: 0, wind: 0.05, smoke: 0, flock: 26, flockDir: -1, flockCol: col(0.3, 0.03, 310),
    mtn: [col(0.74, 0.055, 320), col(0.64, 0.065, 300)], ski: false,
    shadow: { at: [1, 0, -5], r: 24 },
    bloom: [0.4, 0.8, 0.9], tilt: [0.42, 0.2, 0.8], grade: { con: 1.04, sat: 1.1, vig: 0.3, grain: 0.05, lift: [0.03, 0.012, 0.015], gain: [1, 0.985, 0.97] } },
];

// A goose as three geometries: body, dark, pale. It faces +z.
// mode: 'swim' floats, 'stand' has legs, 'graze' lowers the neck.
function goose(mode) {
  const by = mode === 'swim' ? 0.1 : 0.4;
  const a = V(0, by + 0.06, 0.24), b = mode === 'graze' ? V(0, 0.12, 0.52) : V(0, by + 0.44, 0.31);
  const d = V(0, 0, 0).subVectors(b, a), len = d.length();
  const neck = ni(new THREE.CylinderGeometry(0.035, 0.05, len, 5)).translate(0, len / 2, 0)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())).translate(a.x, a.y, a.z);
  const dark = [neck, ico(0.055, 0.05, 0.085).translate(0, b.y + 0.02, b.z + 0.05), ni(new THREE.ConeGeometry(0.022, 0.07, 4)).rotateX(Math.PI / 2).translate(0, b.y + 0.01, b.z + 0.15),
    ico(0.09, 0.05, 0.12).translate(0, by + 0.05, -0.32)];
  if (mode !== 'swim') for (const s of [-1, 1]) dark.push(ni(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 4)).translate(s * 0.06, 0.14, -0.02));
  // The pale parts: breast, under-tail, chinstrap.
  const pale = [ico(0.125, 0.12, 0.14).translate(0, by - 0.02, 0.17), ico(0.1, 0.07, 0.1).translate(0, by - 0.03, -0.27), ni(new THREE.BoxGeometry(0.115, 0.04, 0.05)).translate(0, b.y, b.z + 0.035)];
  return [ico(0.17, 0.15, 0.33).translate(0, by, 0), mergeGeometries(dark), mergeGeometries(pale)];
}

export function build(k) {
  const { box, put, limb } = k;
  const sand = std(0.78, 0.05, 80, { roughness: 1, noCast: true }), mud = std(0.4, 0.04, 75, { roughness: 1, noCast: true });
  const willowM = std(0.6, 0.11, 112, { flatShading: true }), willowD = std(0.48, 0.09, 125, { flatShading: true }), reedM = std(0.62, 0.1, 100, { flatShading: true });
  const crowns = [std(0.34, 0.07, 145, { flatShading: true }), std(0.42, 0.09, 115, { flatShading: true }), std(0.5, 0.13, 65, { flatShading: true }), std(0.3, 0.05, 165, { flatShading: true })];
  const gBody = std(0.47, 0.04, 70), gDark = std(0.16, 0.01, 270), gPale = std(0.84, 0.02, 85);

  /* ----- the shore line and the land ----- */
  const RING = new THREE.CatmullRomCurve3(SHORE.map(([x, z]) => V(x, 0, z)), true).getPoints(180).slice(0, 180);
  // NX, NZ: the outward normal at each shore point.
  const NX = [], NZ = [];
  RING.forEach((p, i) => {
    const a = RING[(i + 179) % 180], b = RING[(i + 1) % 180], l = Math.hypot(b.x - a.x, b.z - a.z);
    NX.push(-(b.z - a.z) / l); NZ.push((b.x - a.x) / l);
  });
  // A slab of land with a lake-shaped hole. off widens the hole.
  const v2 = (x, y) => new THREE.Vector2(x, y);
  const land = (m, off, top) => {
    const sh = new THREE.Shape([v2(-360, -80), v2(360, -80), v2(360, 440), v2(-360, 440)]);
    sh.holes.push(new THREE.Path(RING.map((p, i) => v2(p.x + NX[i] * off, -(p.z + NZ[i] * off)))));
    put(m, new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }).rotateX(-Math.PI / 2), 0, top - 0.5, 0);
  };
  land('lawn', 0.9, 0);
  land(mud, 0, -0.25);
  // The water mirrors the scene. A plain lake bed lies just below it.
  box(std(0.2, 0.03, 230, { noCast: true }), 124, 0.5, 216, 0, -0.75, -103);
  k.wetRoad(124, 216, 0, WATER, -103, col(0.24, 0.04, 215));
  // The beach dips under the water near z = -7.6.
  put(sand, new THREE.CylinderGeometry(1, 1, 0.3, 40).scale(13, 1, 6.5), 5.5, sandTop(-3.9) - 0.15, -3.9, -Math.atan(0.055));
  box('gravel', 160, 0.04, 2.2, 0, 0.012, 4);
  // Pebbles and a few feathers lie on the wet sand.
  {
    const P = rng(29), peb = std(0.42, 0.02, 60, { flatShading: true });
    for (let i = 0; i < 60; i++) { const x = -4 + P() * 12, z = -1 - P() * 5.5, r = 0.03 + P() * 0.06; put(peb, ico(r, r * 0.6, r, 0), x, sandTop(z) + r * 0.3, z); }
    for (let i = 0; i < 8; i++) { const x = -3 + P() * 8, z = -1.5 - P() * 4; box('trim', 0.03, 0.01, 0.16, x, sandTop(z) + 0.01, z, 0, P() * 3); }
  }
  k.litter(70, R => [-9 + R() * 16, 0.045, 1 + R() * 4.6], 6);
  // Reeds stand on the mud of the near shores.
  {
    const R = rng(17);
    for (let i = 0; i < 180; i++) {
      const p = RING[i];
      if (p.z < -50 || (p.x > -6 && p.x < 16.5)) continue;
      for (let j = 0; j < 3; j++) { const h = 0.9 + R() * 0.8; put(reedM, new THREE.ConeGeometry(0.045, h, 4), p.x + NX[i] * 0.45 + (R() - 0.5) * 1.6, -0.25 + h / 2, p.z + NZ[i] * 0.45 + (R() - 0.5) * 1.6); }
    }
  }

  /* ----- the dock: a walk and a wider head ----- */
  box('deck', 1.8, 0.12, 19.1, DX, DECK - 0.06, -12.05); box('deck', 4.6, 0.12, 2.6, DX, DECK - 0.06, CZ);
  for (const s of [-1, 1]) {
    box('wood', 0.1, 0.1, 19.1, DX + s * 0.85, DECK + 0.05, -12.05);
    for (let z = -4; z > -21; z -= 4.3) put('pole', new THREE.CylinderGeometry(0.09, 0.09, 1.5, 6), DX + s * 0.99, -0.5, z);
    for (const z of [CZ - 1.2, CZ + 1.2]) put('pole', new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), DX + s * 2.2, -0.45, z);
  }

  /* ----- the bench: its back faces the viewer ----- */
  const BX = -2.6;
  box('wood', 1.6, 0.06, 0.45, BX, 0.46, 1.9); box('wood', 1.6, 0.34, 0.05, BX, 0.8, 2.15);
  for (const s of [-1, 1]) { box('iron', 0.06, 0.46, 0.42, BX + s * 0.7, 0.23, 1.9); box('iron', 0.05, 0.55, 0.05, BX + s * 0.7, 0.7, 2.15); }
  const crow = k.crow();
  crow.obj.position.set(BX - 0.35, 0.97, 2.15);

  /* ----- trees ----- */
  // A weeping willow: a dome, and strands that hang round it.
  const willow = (x, z, s, seed, lean = 0) => {
    const R = rng(seed), cx = x + lean * 2 * s, fork = V(cx, 4.2 * s, z);
    limb('bark', V(x, -0.3, z), fork, 0.45 * s, 0.28 * s);
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + R(), r = i ? 2.2 * s : 0, b = (1.8 + R() * 0.8) * s; put(willowM, ico(b, b * 0.6, b), cx + Math.cos(a) * r, (6.6 + R() * 1.2) * s, z + Math.sin(a) * r); }
    // Thin strands hang from the dome edge almost to the ground.
    for (let i = 0; i < 220; i++) {
      const a = R() * 6.2832, r = (2.4 + R() * 2.2) * s, len = (1.4 + R() * 3.4) * s * (r / (4.6 * s) + 0.25);
      if (i % 20 === 0) limb('bark', fork, V(cx + Math.cos(a) * r * 0.7, 6.6 * s, z + Math.sin(a) * r * 0.7), 0.15 * s, 0.05 * s);
      put(i % 3 ? willowM : willowD, ico(0.07 * s, len, 0.07 * s, 0), cx + Math.cos(a) * r, 6.5 * s - len * 0.85, z + Math.sin(a) * r);
    }
  };
  // The west willow leans over the water and frames the left edge.
  willow(-13, -26, 1.2, 3, 1); willow(20.5, -38, 1, 4, -0.6);
  willow(-33, -31, 0.9, 5, 0.5); willow(42, -62, 0.9, 6, -0.5); willow(-57.5, -96, 1, 7, 0.5); willow(58, -122, 1, 8, -0.5);
  // A ring of big park trees: two rows behind the far shores.
  {
    const R = rng(64);
    for (let i = 0; i < 180; i += 2) {
      const p = RING[i];
      if (p.z > -44) continue;
      for (let row = 0; row < 2; row++) {
        const o = row ? 18 + R() * 22 : 4 + R() * 9, x = p.x + NX[i] * o + (R() - 0.5) * 4, z = p.z + NZ[i] * o, h = (13 + R() * 11) * (row ? 1.25 : 1);
        if (R() < 0.42) {
          // A tall fir: three stacked cones.
          const H = h * 1.3;
          for (let j = 0; j < 3; j++) put('fir', new THREE.ConeGeometry(H * (0.2 - j * 0.045), H * (0.5 - j * 0.1), 7), x, 1.5 + H * (0.3 + j * 0.24), z);
          put('bark', new THREE.CylinderGeometry(0.3, 0.4, 2, 6), x, 1, z);
          continue;
        }
        const m = crowns[Math.floor(R() * 4)], r = h * 0.22;
        put('bark', new THREE.CylinderGeometry(0.3, 0.45, h * 0.5, 6), x, h * 0.25, z);
        // A crown of four to six blobs, wider than tall.
        for (let j = 0, n = 4 + Math.floor(R() * 3); j < n; j++) { const a = R() * 6.28, d = j ? r * (0.7 + R() * 0.5) : 0, b = r * (0.65 + R() * 0.45); put(m, ico(b, b * 0.85, b), x + Math.cos(a) * d, h * (0.58 + R() * 0.28), z + Math.sin(a) * d); }
      }
    }
  }

  /* ----- geese ----- */
  // Four geese stand on the sand.
  for (const [mode, x, z, ry] of [['stand', -0.2, -3.2, 2.6], ['graze', 1.2, -4.3, -0.8], ['stand', -1.6, -4.6, 1.2], ['graze', 0.4, -5.6, 0.4]]) {
    const g = goose(mode), y = sandTop(z);
    put(gBody, g[0], x, y, z, 0, ry); put(gDark, g[1], x, y, z, 0, ry); put(gPale, g[2], x, y, z, 0, ry);
  }
  // Five geese glide in a line. Each one drags a faint wake.
  const swimG = mergeGeometries(goose('swim'), true);
  const wakeG = new THREE.PlaneGeometry(2.2, 4).rotateX(-Math.PI / 2).translate(0, 0.012, -2.3);
  const wakeM = new THREE.MeshBasicMaterial({ color: col(0.95, 0.05, 60), transparent: true, opacity: 0.4, depthWrite: false, fog: false, map: tex(64, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = gr; g.lineWidth = 3;
    g.beginPath(); g.moveTo(4, 0); g.lineTo(w / 2, h); g.lineTo(w - 4, 0); g.stroke();
  }) });
  const geese = GA.map(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(swimG, [gBody, gDark, gPale]), new THREE.Mesh(wakeG, wakeM));
    k.group.add(g);
    return g;
  });
  // A fish rises now and then: one ring spreads and fades.
  const ringM = new THREE.MeshBasicMaterial({ color: col(0.95, 0.05, 60), transparent: true, opacity: 0, depthWrite: false, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 48).rotateX(-Math.PI / 2), ringM);
  k.group.add(ring);

  /* ----- mist: soft sheets that stand low over the water ----- */
  const mistA = tex(512, 128, (g, w, h) => {
    const R = rng(31);
    for (let i = 0; i < 60; i++) {
      const x = R() * w, y = h * (0.45 + R() * 0.5), rx = 30 + R() * 70, sy = (8 + R() * 16) / rx;
      // Each puff is drawn three times, so the texture tiles along x.
      for (const dx of [-w, 0, w]) {
        const gr = g.createRadialGradient(x + dx, y / sy, 0, x + dx, y / sy, rx);
        gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.scale(1, sy); g.fillStyle = gr; g.fillRect(x + dx - rx, y / sy - rx, rx * 2, rx * 2); g.restore();
      }
    }
  });
  mistA.wrapT = THREE.ClampToEdgeWrapping;
  const mistB = mistA.clone();
  mistB.needsUpdate = true;
  const mistCol = col(0.95, 0.045, 60);
  // Each sheet: z, height, width, opacity.
  [[-27, 2.4, 80, 0.5], [-50, 3.5, 120, 0.55], [-82, 4.5, 170, 0.6], [-122, 6, 230, 0.6], [-165, 7, 290, 0.55], [-199, 8, 330, 0.5]].forEach(([z, hh, w, a], i) => {
    const g = new THREE.PlaneGeometry(w, hh), uv = g.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setX(j, uv.getX(j) * w / 48 + i * 0.37);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: i % 2 ? mistB : mistA, color: mistCol, transparent: true, opacity: a, depthWrite: false, fog: false }));
    m.position.set(0, WATER + hh / 2 - 0.05, z);
    k.group.add(m);
  });

  /* ----- the dog walker ----- */
  const walker = new THREE.Group(), coatM = std(0.36, 0.08, 30), hatM = std(0.8, 0.14, 85), dogM = std(0.7, 0.11, 75);
  // Three poses: two strides and one at rest.
  const pose = o => {
    const g = personGeo(1.72, o), grp = new THREE.Group();
    grp.add(new THREE.Mesh(g.coat, coatM), new THREE.Mesh(g.legs, M.iron), new THREE.Mesh(g.skin, M.skin));
    walker.add(grp);
    return grp;
  };
  const stepA = pose({ stride: 0.45 }), stepB = pose({ stride: -0.45 }), rest = pose({});
  walker.add(new THREE.Mesh(ico(0.13, 0.09, 0.13).translate(0, 1.7, 0), hatM));
  const dog = new THREE.Group(), tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22).translate(0, 0, -0.11), dogM);
  dog.rotation.order = 'YXZ';
  dog.add(new THREE.Mesh(mergeGeometries([
    ni(new THREE.BoxGeometry(0.2, 0.22, 0.56)).translate(0, 0.37, 0), ni(new THREE.BoxGeometry(0.16, 0.16, 0.2)).translate(0, 0.52, 0.34), ni(new THREE.BoxGeometry(0.09, 0.08, 0.12)).translate(0, 0.49, 0.48),
    ...[-0.07, 0.07].flatMap(x => [-0.2, 0.2].map(z => ni(new THREE.BoxGeometry(0.055, 0.27, 0.055)).translate(x, 0.135, z))),
  ]), dogM), tail);
  tail.position.set(0, 0.46, -0.28);
  tail.rotation.x = 0.6;
  for (const o of [walker, dog]) { o.traverse(c => { if (c.isMesh) c.castShadow = true; }); k.group.add(o); }

  k.onFrame(t => {
    // The walker goes out to the dock head, waits, and comes back.
    const u = t % PER, out = u < T1, hold = !out && u < T1 + HOLD;
    const s = out ? u * SPEED : hold ? LT : Math.max(0, LT - (u - T1 - HOLD) * SPEED);
    const walk = !hold && s > 0, ph = Math.floor(t * 1.9) % 2, f = Math.min(1, s / LA);
    const yaw = (s < LA ? YA : Math.PI) + (out || hold ? 0 : Math.PI), sn = Math.sin(yaw), cs = Math.cos(yaw);
    const x = lerp(AX, DX, f), z = s < LA ? lerp(AZ, BZ, f) : BZ - (s - LA), y = s < LA ? sandTop(z) : DECK;
    walker.position.set(x, y, z);
    walker.rotation.y = yaw;
    stepA.visible = walk && ph === 0; stepB.visible = walk && ph === 1; rest.visible = !walk;
    // The dog trots at the walker's right, then sits.
    dog.position.set(x + cs * 0.55 + sn * 0.5, y + (walk ? Math.abs(Math.sin(t * 9)) * 0.03 : -0.03), z - sn * 0.55 + cs * 0.5);
    dog.rotation.set(walk ? 0 : -0.5, yaw, 0);
    tail.rotation.y = Math.sin(t * 11) * 0.6;
    // The geese follow one slow oval.
    for (let i = 0; i < geese.length; i++) {
      const a = t * 0.04 - GA[i];
      geese[i].position.set(-3 + Math.cos(a) * 11, WATER, -36 + Math.sin(a) * 4.5);
      geese[i].rotation.y = Math.atan2(-Math.sin(a) * 11, Math.cos(a) * 4.5);
    }
    const n = Math.floor(t / 9), q = t / 9 - n;
    ring.position.set(-6 + hash(n) * 6, WATER + 0.015, -11 - hash(n + 7) * 15);
    ring.scale.setScalar(0.3 + q * 4.4);
    ringM.opacity = 0.4 * Math.max(0, 1 - q * 2.5);
    mistA.offset.x = t * 0.0035; mistB.offset.x = -t * 0.0022;
    crow.pose(t, 'idle', 2.5);
  });
}
