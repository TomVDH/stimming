// East Van lane life: bins by the garages, blackberry brambles on the fences,
// a cherry in bloom and a big chestnut, a hoop on a garage, a parked car,
// a neighbour's line of washing, crows on the wires and crows in the air.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { col, rgb, pick, inst, paint } from './kit.js';

const BINS = [[0.5, 0.14, 255], [0.45, 0.12, 145], [0.22, 0.01, 250]];
const WASH = [[0.95, 0.01, 90], [0.5, 0.1, 250], [0.62, 0.15, 28], [0.8, 0.1, 95], [0.6, 0.1, 150], [0.75, 0.1, 340]];

// A crow: body, head, beak and tail, about half a metre long.
function crowGeo() {
  const body = new THREE.SphereGeometry(1, 10, 8).scale(0.11, 0.1, 0.22);
  const head = new THREE.SphereGeometry(0.065, 8, 6).translate(0, 0.07, 0.2);
  const beak = new THREE.ConeGeometry(0.025, 0.09, 6).rotateX(Math.PI / 2).translate(0, 0.06, 0.29);
  const tail = new THREE.BoxGeometry(0.08, 0.02, 0.18).translate(0, -0.02, -0.26);
  return mergeGeometries([body, head, beak, tail].map(g => g.toNonIndexed()));
}

export function laneLife(group, R, { LANE, LINE_Z, lots, wires, look }) {
  const B = [], C = [], O = [], blooms = [];

  /* ---------- bins, brambles, a hoop, a car ---------- */
  for (const lot of lots) {
    if (lot.z < -95) continue;
    const edge = lot.side * LANE;
    // Carts stand in a row at the lane edge.
    if (R() < 0.7) for (let k = 0; k < 1 + Math.floor(R() * 3); k++) {
      const x = edge + lot.side * 0.55, z = lot.z + 3 - k * 0.75;
      if (lot.ours && Math.abs(z - LINE_Z) < 3) continue;
      B.push({ p: [x, 0.5, z], s: [0.6, 1.0, 0.7], r: [0, (R() - 0.5) * 0.3, 0], c: col(pick(R, BINS)) });
      B.push({ p: [x, 1.02, z], s: [0.66, 0.06, 0.76], c: col([0.2, 0.01, 250]) });
    }
    // Brambles push through the fences.
    if (!lot.garage && R() < 0.7) for (let k = 0; k < 22; k++) {
      const z = lot.z - 4.5 + R() * 9, y = 0.3 + R() * 1.6;
      O.push({ p: [edge + lot.side * (0.15 + R() * 0.5), y, z], s: [0.35, 0.3, 0.35].map(v => v * (0.6 + R() * 0.8)), c: col([0.36 + R() * 0.08, 0.09, 140]) });
      if (R() < 0.3) blooms.push({ p: [edge + lot.side * 0.1, y, z], s: [0.04, 0.04, 0.04], c: col([0.2, 0.06, 330]) });
    }
  }
  // A basketball hoop over a garage door.
  const hoopLot = lots.find(l => l.garage && l.side > 0 && l.z < -15);
  if (hoopLot) {
    const x = hoopLot.side * LANE + hoopLot.side * 0.25;
    B.push({ p: [x - hoopLot.side * 0.05, 3.3, hoopLot.z], s: [0.04, 0.9, 1.2], c: col([0.95, 0.01, 90]) });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 6, 16), new THREE.MeshStandardMaterial({ color: col([0.62, 0.18, 40]) }));
    rim.rotation.x = Math.PI / 2; rim.position.set(x - hoopLot.side * 0.3, 3.05, hoopLot.z); group.add(rim);
  }
  // An old hatchback parked down the lane.
  B.push({ p: [-1.5, 0.75, -48], s: [1.7, 0.85, 4.1], c: col([0.55, 0.08, 150]) });
  B.push({ p: [-1.5, 1.4, -48.4], s: [1.5, 0.6, 2.2], c: col([0.25, 0.02, 240]) });
  for (const [dx, dz] of [[-0.85, -1.3], [0.85, -1.3], [-0.85, 1.3], [0.85, 1.3]]) C.push({ p: [-1.5 + dx, 0.3, -48 + dz], s: [0.3, 0.2, 0.3], r: [0, 0, Math.PI / 2], c: col([0.15, 0.01, 250]) });

  /* ---------- puddles ---------- */
  // Rainwater in the dips holds the sky, brighter at a glancing view.
  const pu = { uHor: { value: new THREE.Vector3(0.8, 0.8, 0.85) }, uZen: { value: new THREE.Vector3(0.3, 0.4, 0.7) }, uSun: { value: new THREE.Vector3(0, 1, 0) } };
  const puddleMat = new THREE.ShaderMaterial({
    uniforms: pu, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `varying vec3 vW; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec2 vUv; uniform vec3 uHor, uZen, uSun;
      void main() {
        vec3 V = normalize(vW - cameraPosition), r = reflect(V, vec3(0.0, 1.0, 0.0));
        vec3 sky = mix(uHor, uZen, pow(max(r.y, 0.0), 0.5)) + vec3(1.0, 0.85, 0.6) * pow(max(dot(r, uSun), 0.0), 200.0) * 4.0;
        float F = 0.02 + 0.98 * pow(1.0 - max(-V.y, 0.0), 5.0);
        float edge = smoothstep(0.5, 0.36, length(vUv - 0.5));
        gl_FragColor = vec4(mix(vec3(0.04, 0.04, 0.045), sky * 0.72, F), edge * 0.9);
      }`,
  });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), puddleMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((R() - 0.5) * (LANE * 1.4), 0.018, -3 - R() * 40);
    m.scale.set(1.2 + R() * 1.8, 0.6 + R() * 1.0, 1);
    m.renderOrder = 2;
    group.add(m);
  }

  /* ---------- garage murals, lamps, hedges ---------- */
  // Murals on the garage ends that face us: suns, waves, ridges, a crow. No words.
  const mural = k => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const g = cv.getContext('2d');
    const hue = [20, 200, 300, 140][k % 4];
    g.fillStyle = `oklch(0.62 0.14 ${hue})`; g.fillRect(0, 0, 256, 128);
    g.fillStyle = `oklch(0.85 0.15 ${(hue + 70) % 360})`; g.beginPath(); g.arc(70 + k * 40, 50, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = `oklch(0.4 0.1 ${(hue + 180) % 360})`;
    g.beginPath(); g.moveTo(0, 128); for (let x = 0; x <= 256; x += 32) g.lineTo(x, 80 - ((x * 7 + k * 13) % 40)); g.lineTo(256, 128); g.fill();
    g.strokeStyle = `oklch(0.95 0.05 ${hue})`; g.lineWidth = 6;
    for (let y = 96; y < 128; y += 12) { g.beginPath(); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + Math.sin(x / 14 + k) * 4); g.stroke(); }
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(190, 40, 18, 8, -0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(176, 38); g.lineTo(150, 26); g.lineTo(186, 34); g.fill();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  };
  const murals = [0, 1, 2, 3].map(mural);
  const lamps = [];
  lots.forEach((lot, i) => {
    if (lot.z < -95 || lot.ours) return;
    const edge = lot.side * LANE;
    if (lot.garage) {
      if (R() < 0.45) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(6, lot.garage.h), murals[i % 4]);
        m.position.set(lot.garage.x, lot.garage.h / 2, lot.z + lot.garage.w / 2 + 0.02);
        group.add(m);
      }
      lamps.push({ p: [edge + lot.side * 0.36, 2.35, lot.z + 1.2], s: [0.14, 0.18, 0.14] });
    } else if (R() < 0.45) {
      // A tall cedar hedge behind the fence.
      for (let z = lot.z - 4.6; z < lot.z + 4.6; z += 0.55) {
        const h = 2.4 + R() * 0.8;
        O.push({ p: [edge + lot.side * 1.0, h * 0.5, z], s: [0.55, h * 0.55, 0.5], c: col([0.3 + R() * 0.04, 0.07, 150]) });
      }
    }
  });
  inst(group, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: col([0.9, 0.08, 80]), emissive: col([0.85, 0.12, 75]), emissiveIntensity: 1.2 }), lamps, false);

  /* ---------- sneakers on the wire ---------- */
  // A pair of sneakers hangs by their laces from the phone cable.
  const cable = wires.perches[9];
  if (cable) {
    const hang = cable.getPoint(0.35);
    for (const [dx, c] of [[-0.12, [0.95, 0.01, 90]], [0.12, [0.6, 0.18, 28]]]) {
      B.push({ p: [hang.x + dx, hang.y - 0.55, hang.z], s: [0.11, 0.1, 0.28], r: [0.3 * Math.sign(dx), 0, 0.2], c: col(c) });
      C.push({ p: [hang.x + dx * 0.5, hang.y - 0.25, hang.z], s: [0.004, 0.5, 0.004], r: [0, 0, -dx], c: col([0.9, 0.01, 90]) });
    }
  }

  /* ---------- trees ---------- */
  // A cherry in full bloom over a fence; a big chestnut further down.
  const tree = (x, z, h, r, c, n, pink) => {
    C.push({ p: [x, h * 0.35, z], s: [0.22, h * 0.7, 0.22], c: col([0.3, 0.03, 40]) });
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, u = Math.sqrt(R());
      O.push({ p: [x + Math.cos(a) * r * u, h * 0.72 + (R() - 0.3) * r * 0.9, z + Math.sin(a) * r * u], s: [0.9, 0.75, 0.9].map(v => v * r * (0.3 + R() * 0.3)),
        c: col(pink ? [0.84 + R() * 0.06, 0.07 + R() * 0.03, 350] : [0.42 + R() * 0.08, 0.1, 135]) });
    }
  };
  tree(-LANE - 6, -22, 6.5, 2.4, null, 40, true);
  tree(LANE + 9, -36, 15, 6, null, 60, false);
  tree(-LANE - 12, -70, 13, 5, null, 50, false);
  tree(LANE + 6, 14, 9, 3.5, null, 40, true);

  /* ---------- a neighbour's washing ---------- */
  // Down the lane, another line runs from a porch to a pole, full of washing.
  {
    const z = -30, x0 = -LANE - 5, x1 = LANE + 0.6, y = 4.2;
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x0, y, z), new THREE.Vector3((x0 + x1) / 2, y - 0.25, z), new THREE.Vector3(x1, y, z)]), 12, 0.012, 4);
    group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x151515 })));
    for (let x = x0 + 0.5; x < x1 - 0.6; ) {
      const w = 0.4 + R() * 0.7, h = 0.4 + R() * 0.6, c = pick(R, WASH);
      const at = new THREE.Matrix4().compose(new THREE.Vector3(x + w / 2, y - 0.2 - h / 2, z + (R() - 0.5) * 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (R() - 0.5) * 0.4, 0)), new THREE.Vector3(1, 1, 1));
      look.addStatic(new THREE.PlaneGeometry(w, h), { alb: rgb(col(c)), tr: rgb(col([Math.min(0.95, c[0] + 0.05), c[1] * 1.4, c[2]])) }, { size: [w, h], at });
      x += w + 0.12 + R() * 0.3;
    }
  }

  /* ---------- crows ---------- */
  const crow = crowGeo(), black = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.45, metalness: 0.2 });
  const sitting = [];
  for (let i = 0; i < 9 && wires.perches.length; i++) {
    const curve = wires.perches[Math.floor(R() * wires.perches.length)], p = curve.getPoint(0.12 + R() * 0.76);
    sitting.push({ p: [p.x, p.y + 0.11, p.z], r: [0, (R() < 0.5 ? 1 : -1) * Math.PI / 2 + (R() - 0.5) * 0.6, 0] });
  }
  inst(group, crow, black, sitting);
  // A few crows row across the sky, wings beating.
  const fliers = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(crow, black));
    const wings = [-1, 1].map(k => {
      const pivot = new THREE.Group();
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 0.16), black);
      w.position.x = k * 0.22; pivot.add(w); g.add(pivot);
      return { pivot, k };
    });
    group.add(g);
    fliers.push({ g, wings, y: 9 + R() * 8, z: -10 - R() * 50, sp: (2.5 + R() * 2) * (R() < 0.5 ? 1 : -1), ph: R() * 40 });
  }

  inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.7), B);
  inst(group, new THREE.CylinderGeometry(1, 1, 1, 10), paint(0.8), C);
  inst(group, new THREE.IcosahedronGeometry(1, 1), paint(0.9), O);
  inst(group, new THREE.IcosahedronGeometry(1, 0), paint(0.6), blooms, false);

  return {
    tick(t, sun, cam, sky) {
      if (sky) { pu.uHor.value.copy(sky.hor); pu.uZen.value.copy(sky.zen); }
      if (sun) pu.uSun.value.copy(sun.dir);
      for (const f of fliers) {
        const x = ((t + f.ph) * f.sp) % 80 - Math.sign(f.sp) * 40;
        f.g.position.set(x, f.y + Math.sin(t * 0.7 + f.ph), f.z);
        f.g.rotation.y = f.sp > 0 ? Math.PI / 2 : -Math.PI / 2;
        for (const w of f.wings) w.pivot.rotation.z = w.k * 0.6 * Math.sin(t * 9 + f.ph);
      }
    },
  };
}
