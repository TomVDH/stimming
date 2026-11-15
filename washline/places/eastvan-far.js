// East Van far view: the False Creek Flats with a rail yard, the lit EAST VAN
// cross on its pole, downtown's towers lighting up, and the North Shore
// mountains with snow on the far peaks.
import * as THREE from 'three';
import { col, pick, inst, paint, canvasTex } from './kit.js';

const FLATS = -30;

// A ridge line as a filled shape, shaded by height: forest, rock, then snow.
function range(x0, x1, z, peaks, base, snow, R) {
  const sh = new THREE.Shape(), n = 220, w = x1 - x0;
  sh.moveTo(x0, FLATS - 20);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (w * i) / n;
    let y = base * (0.55 + 0.2 * Math.sin(x / 1300 + z) + 0.1 * Math.sin(x / 470 + 2 * z));
    for (const [px, ph, pw] of peaks) y = Math.max(y, ph * (1 - Math.abs(x - px) / pw) * (0.9 + 0.1 * Math.sin(x / 90)));
    y += 18 * Math.sin(x / 61) * Math.sin(x / 23);
    sh.lineTo(x, FLATS + y);
  }
  sh.lineTo(x1, FLATS - 20);
  const g = new THREE.ShapeGeometry(sh);
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  const forest = col([0.28, 0.05, 215]), rock = col([0.42, 0.02, 250]), white = col([0.95, 0.01, 250]);
  const k = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const h = p.getY(i) - FLATS;
    k.copy(forest).lerp(rock, Math.min(1, Math.max(0, (h - 700) / 400)));
    if (snow && h > snow + 60 * Math.sin(p.getX(i) / 40)) k.copy(white);
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  m.position.z = z;
  return m;
}

export function farView(group, R) {
  /* ---------- the flats and the rail yard ---------- */
  const flats = new THREE.Mesh(new THREE.PlaneGeometry(16000, 7000), new THREE.MeshStandardMaterial({ color: col([0.42, 0.03, 120]), roughness: 1 }));
  flats.rotation.x = -Math.PI / 2; flats.position.set(0, FLATS, -3900);
  group.add(flats);
  const cars = [], sheds = [];
  for (let row = 0; row < 22; row++) {
    const x = -260 + row * 23 + (R() - 0.5) * 4;
    for (let z = -880; z > -1250; z -= 17 + R() * 3) {
      if (R() < 0.25) continue;
      const kind = R();
      const c = kind < 0.35 ? [0.42, 0.1, 40] : kind < 0.6 ? [0.5, 0.12, 250] : kind < 0.8 ? [0.85, 0.01, 90] : [0.4, 0.04, 60];
      cars.push({ p: [x, FLATS + 2.2, z], s: [3, 4.2, 16], c: col(c) });
    }
  }
  for (let i = 0; i < 14; i++) sheds.push({ p: [(R() - 0.5) * 1400, FLATS + 5, -1400 - R() * 900], s: [60 + R() * 80, 10, 30 + R() * 40], c: col([0.62, 0.02, 250]) });
  inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.8), cars);
  inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.9), sheds);

  /* ---------- the cross ---------- */
  // EAST reads down, VAN reads across; they share the A. Lit white.
  const letters = canvasTex(320, 512, (g, W) => {
    g.clearRect(0, 0, 320, 512);
    g.fillStyle = '#ffffff';
    g.font = '900 104px Gabarito, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    ['E', 'A', 'S', 'T'].forEach((ch, i) => g.fillText(ch, W / 2, 64 + i * 118));
    g.fillText('V', W / 2 - 108, 64 + 118);
    g.fillText('N', W / 2 + 108, 64 + 118);
  });
  const crossMat = new THREE.MeshBasicMaterial({ map: letters, transparent: true, color: new THREE.Color(3.2, 3.1, 2.9), toneMapped: false, fog: false, side: THREE.DoubleSide, depthWrite: false });
  const cross = new THREE.Group();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 25.6), crossMat);
  sign.position.y = 20 + 12.8;
  cross.add(sign);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 20, 10), new THREE.MeshStandardMaterial({ color: col([0.35, 0.01, 250]), roughness: 0.6 }));
  pole.position.y = 10;
  cross.add(pole);
  // Nearer and larger than life, so it stands clear over the vista.
  cross.position.set(-30, FLATS, -600);
  cross.scale.setScalar(2.0);
  group.add(cross);

  /* ---------- downtown ---------- */
  // Towers off to the north-west; their windows light as the sun goes.
  const winTex = canvasTex(64, 128, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 128; y += 4) for (let x = 0; x < 64; x += 4) {
      if (Math.random() < 0.3) { g.fillStyle = Math.random() < 0.7 ? '#ffd9a0' : '#d8e6ff'; g.fillRect(x + 1, y + 1, 2, 2); }
    }
  }, true);
  const towerMat = new THREE.MeshStandardMaterial({ color: col([0.4, 0.03, 250]), roughness: 0.35, metalness: 0.4, emissiveMap: winTex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.5 });
  const towers = [];
  for (let i = 0; i < 140; i++) {
    const x = -600 + Math.pow(R(), 0.8) * 1500, z = -3000 - R() * 900, h = 40 + Math.pow(R(), 2.2) * 170 + (R() < 0.05 ? 60 : 0), w = 18 + R() * 26;
    towers.push({ p: [x, FLATS + h / 2, z], s: [w, h, w * (0.7 + R() * 0.6)] });
  }
  const tm = inst(group, new THREE.BoxGeometry(1, 1, 1), towerMat, towers, false);

  /* ---------- the guideway ---------- */
  // An elevated concrete guideway crosses the flats on columns; a train runs on it.
  const GZ = -690, GY = FLATS + 9;
  const deck = [];
  for (let x = -1400; x <= 1400; x += 32) deck.push({ p: [x, FLATS + 4.3, GZ], s: [1.6, 8.6, 1.6] });
  deck.push({ p: [0, GY, GZ], s: [2800, 1.2, 8], c: col([0.7, 0.01, 250]) });
  deck.push({ p: [0, GY + 0.9, GZ - 3.6], s: [2800, 0.8, 0.3], c: col([0.66, 0.01, 250]) });
  deck.push({ p: [0, GY + 0.9, GZ + 3.6], s: [2800, 0.8, 0.3], c: col([0.66, 0.01, 250]) });
  for (const d of deck) d.c ||= col([0.68, 0.01, 250]);
  inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.9), deck);
  const train = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: col([0.93, 0.01, 250]), roughness: 0.4 });
  const band = new THREE.MeshStandardMaterial({ color: col([0.4, 0.12, 255]), roughness: 0.4 });
  const win = new THREE.MeshStandardMaterial({ color: col([0.2, 0.02, 240]), roughness: 0.1, emissive: col([0.8, 0.06, 90]), emissiveIntensity: 0.3 });
  for (let k = 0; k < 4; k++) {
    const x = k * 17.6;
    const car = new THREE.Mesh(new THREE.BoxGeometry(17, 3.2, 2.7), body); car.position.set(x, 2.2, 0); train.add(car);
    const st = new THREE.Mesh(new THREE.BoxGeometry(17.02, 0.35, 2.72), band); st.position.set(x, 1.0, 0); train.add(st);
    const wn = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.9, 2.74), win); wn.position.set(x, 2.5, 0); train.add(wn);
  }
  train.position.set(0, GY + 0.6, GZ - 1.6);
  group.add(train);

  /* ---------- the dome by the water ---------- */
  // A silver geodesic dome stands where the flats meet the end of False Creek.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 260), new THREE.MeshStandardMaterial({ color: col([0.4, 0.05, 230]), roughness: 0.08, metalness: 0.6 }));
  water.rotation.x = -Math.PI / 2; water.position.set(-650, FLATS + 0.05, -2650);
  group.add(water);
  const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(24, 2), new THREE.MeshStandardMaterial({ color: col([0.85, 0.01, 250]), roughness: 0.25, metalness: 0.8, flatShading: true }));
  dome.position.set(-380, FLATS + 26, -2480);
  group.add(dome);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 6, 16), new THREE.MeshStandardMaterial({ color: col([0.7, 0.01, 250]), roughness: 0.8 }));
  base.position.set(-380, FLATS + 3, -2480);
  group.add(base);

  /* ---------- the north shore ---------- */
  group.add(range(-6000, 16000, -7000, [[2200, 1180, 1800], [6200, 1300, 2200], [-1800, 980, 1500]], 820, 0, R));
  group.add(range(-4000, 18000, -10500, [[3800, 1640, 900], [4700, 1620, 800], [9000, 1700, 2000], [-600, 1450, 1600]], 1050, 1300, R));

  return {
    tick(t, sun) {
      // The train shuttles across the flats, a little over 20 m/s.
      train.position.x = ((t * 22) % 3200) - 1600;
      win.emissiveIntensity = 0.1 + 1.0 * (1 - Math.min(1, Math.max(0, (sun.dir.y + 0.02) / 0.25)));
      // Downtown lights rise as the sun sinks.
      towerMat.emissiveIntensity = 0.15 + 1.4 * (1 - Math.min(1, Math.max(0, (sun.dir.y + 0.02) / 0.25)));
    },
  };
}
