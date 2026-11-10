// East Van postcards: the corner store. One card, at night.
// The store stands on the north-west corner of two quiet streets.
// The viewer stands in the road, to the south-east.
import { THREE, V, col, rng, hash, tex, signTex, std, glow, ico, WARM, M } from '../kit.js';

const lampCol = col(0.84, 0.13, 68);
export const cards = [
  { cap: 'Corner store · 9:40 pm · Clear', hour: 21.5,
    cam: { pos: [3.4, 1.5, 9.6], yaw: 34, pitch: 0, up: 30, down: 15, minHalf: 0.4 },
    // The moon stands behind the viewer, so both fronts take its light.
    sun: [0.45, 0.6, 0.65], sunCol: col(0.75, 0.05, 250), sunI: 0.5, hemi: [col(0.4, 0.07, 262), col(0.22, 0.03, 275), 0.9],
    fog: col(0.17, 0.05, 268), fogD: 0.007,
    sky: { cloudA: 0.1, cov: 0.55, cloud: col(0.16, 0.03, 265), cloudLit: col(0.26, 0.04, 280), hazeA: 0.6, hazeK: 9, disc: 0, stars: 1, sunCol: col(0.8, 0.04, 250, 0.3) },
    exposure: 1.15, shop: 80, fill: 10, lamp: 320, win: 1.3, tv: 1.0, glow: 0.05,
    leaves: 14, wind: 0.2, smoke: 0.2, smokeCol: col(0.45, 0.03, 262),
    mtn: [col(0.13, 0.04, 262), col(0.1, 0.035, 265)], ski: true,
    shadow: { at: [-9, 0, -8], r: 26 },
    bloom: [0.55, 0.65, 1.0], grade: { con: 1.08, sat: 1.1, vig: 0.42, grain: 0.07, lift: [0, 0.008, 0.03] } },
];

export function build(k) {
  const { box, put, win, at, gableHouse, fence, car, pole, wire, tree } = k;
  // RW: half the road width. H1: the height of the shop floor.
  const RW = 4.2, H1 = 3.6, TILT = 0.35;
  const green = std(0.38, 0.08, 160), red = std(0.55, 0.2, 28), leafM = std(0.7, 0.18, 58, { flatShading: true });
  const lampHead = glow(0.84, 0.13, 68);
  // The shop walls cast no shadow: the shop light stands inside them.
  const wall = M.h5.clone();
  wall.userData.noCast = true;
  const awn = std(1, 0, 0, { map: tex(64, 8, (g, w, h) => { g.fillStyle = '#efe3c4'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f6d50'; g.fillRect(0, 0, w / 2, h); }, { rx: 9 }) });
  // One pane shows the shelves: rows of small coloured packs.
  const shelfMat = std(0.2, 0.03, 250, { roughness: 0.25, emissive: WARM, noCast: true, emissiveMap: tex(256, 256, (g, w, h) => {
    const R = rng(5), hue = ['#e2483a', '#f2c230', '#3f8f5c', '#3d6fc4', '#f08a2c', '#f4efe2'];
    g.fillStyle = '#ffd9a0'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 5; r++) {
      const y = 44 + r * 46;
      g.fillStyle = '#6b4a2a'; g.fillRect(0, y, w, 5);
      for (let x = 6; x < w - 14;) { const bw = 9 + R() * 12, bh = 16 + R() * 20; g.fillStyle = hue[Math.floor(R() * 6)]; g.fillRect(x, y - bh, bw, bh); x += bw + 2; }
    }
  }) });
  // A sign face that glows on its own. The name is invented.
  const lit = (map, s = 1.5) => { const m = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(s, s, s) }); m.userData.noCast = true; return m; };
  const signMat = lit(tex(1024, 192, (g, w) => {
    g.fillStyle = '#f6e7b4'; g.fillRect(0, 0, w, 192);
    g.fillStyle = '#b3261e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 104px ui-monospace, monospace'; g.fillText('LUCKY HERON', w / 2, 78);
    g.font = '700 44px ui-monospace, monospace'; g.fillText('G R O C E R Y', w / 2, 160);
  }));
  const bladeMat = lit(signTex('GROCERY', { w: 256, h: 128, bg: '#b3261e', fg: '#f6e7b4', font: '700 50px ui-monospace, monospace' }));
  const neon = glow(1, 0, 0, 2.2), neonOn = neon.color.clone();
  neon.map = signTex('OPEN', { w: 256, h: 96, bg: '#1a0505', fg: '#ff5a48', font: '700 76px ui-monospace, monospace' });

  /* ----- ground: two streets cross ----- */
  box('road', 700, 0.1, 8.6, 0, -0.2, 0);
  for (const s of [-1, 1]) box('road', 8.6, 0.1, 346, 0, -0.2, s * 177.3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box('lawn', 346, 0.2, 346, sx * 177.2, -0.1, sz * 177.2);
    box('walk', 346, 0.04, 2.8, sx * 177.2, 0.005, sz * 5.6);
    // The turn keeps the joints across the walk.
    put('walk', new THREE.BoxGeometry(343.2, 0.04, 2.8), sx * 5.6, 0.005, sz * 178.6, 0, Math.PI / 2);
    box('curb', 346, 0.19, 0.18, sx * 177.2, -0.055, sz * RW); box('curb', 0.18, 0.19, 346, sx * RW, -0.055, sz * 177.2);
  }
  // The traffic circle: a concrete ring, soil, bushes and one small tree.
  put('conc', new THREE.CylinderGeometry(1.9, 1.9, 0.4, 20), 0, -0.05, 0);
  put('soil', new THREE.CylinderGeometry(1.7, 1.7, 0.1, 20), 0, 0.13, 0);
  {
    const R = rng(8);
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + R(), r = 0.5 + R() * 0.8, s = 0.3 + R() * 0.2; put('bush', ico(s, s * 0.7, s), Math.cos(a) * r, 0.18 + s * 0.5, Math.sin(a) * r); }
  }
  // The tree stands east of centre, clear of the view to the store.
  put('bark', new THREE.CylinderGeometry(0.05, 0.08, 2.1, 6), 0.7, 1.2, -0.4);
  for (const [x, y, z, s] of [[0.7, 2.6, -0.4, 0.8], [1.1, 2.2, -0.1, 0.5], [0.35, 2.25, -0.7, 0.55]]) put(leafM, ico(s, s * 0.8, s), x, y, z);

  /* ----- the store ----- */
  // The shop floor has a clipped corner; the floor above stays square.
  box(wall, 8.5, H1, 9, -12.75, H1 / 2, -11.5); box(wall, 1.5, H1, 7.5, -7.75, H1 / 2, -12.25);
  box('h5', 10, 3.1, 9, -12, H1 + 1.55, -11.5);
  box('trim', 10.1, 0.14, 9.1, -12, H1, -11.5); box('trim', 10.5, 0.3, 9.5, -12, 6.85, -11.5);
  box('brick', 0.6, 1.8, 0.6, -15, 7.75, -9); box('conc', 0.72, 0.1, 0.72, -15, 8.7, -9);
  k.smoke(-15, 8.78, -9);
  // A shop front of width w: riser, mullion, header, piers, awning. The wall is z = 0.
  const front = w => {
    box(green, w, 0.6, 0.12, 0, 0.3, 0.04); box('trim', 0.2, 2.2, 0.14, 0, 1.7, 0.05); box('trim', w + 0.4, 0.2, 0.14, 0, 2.9, 0.05);
    for (const s of [-1, 1]) box('trim', 0.3, 3.5, 0.14, s * (w / 2 + 0.05), 1.75, 0.05);
    box(awn, w + 0.4, 0.05, 1.48, 0, 3.1, 0.65, 0.494); box(awn, w + 0.4, 0.24, 0.03, 0, 2.66, 1.3);
  };
  // The south front: the shelf pane, a lit pane, the box sign, the neon.
  at(-11.2, 0, -7, () => {
    front(5);
    put(shelfMat, new THREE.PlaneGeometry(2.3, 2.2), 1.25, 1.7, 0.055); box('winLit', 2.3, 2.2, 0.05, -1.25, 1.7, 0.03);
    box('iron', 4.7, 0.95, 0.14, 0, 3.98, 0.1); put(signMat, new THREE.PlaneGeometry(4.6, 0.85), 0, 3.98, 0.18);
    box(neon, 0.9, 0.34, 0.03, -1.7, 2.3, 0.08);
  });
  // The east front.
  at(-7, 0, -10.6, () => {
    front(3.8);
    for (const s of [-1, 1]) box('winLit', 1.7, 2.2, 0.05, s * 0.95, 1.7, 0.03);
  }, Math.PI / 2);
  // The clipped corner: the open door, its transom and two piers.
  at(-7.75, 0, -7.75, () => {
    box(wall, 2.12, H1, 1, 0, H1 / 2, -0.5);
    box('winLit', 1, 2.25, 0.05, 0, 1.15, 0.03); box('winLit', 1, 0.45, 0.05, 0, 2.65, 0.03);
    box('trim', 1.2, 0.1, 0.14, 0, 2.35, 0.05); box('trim', 2.12, 0.65, 0.14, 0, 3.2, 0.05);
    for (const s of [-1, 1]) box('trim', 0.56, 2.9, 0.14, s * 0.78, 1.45, 0.05);
    box('door', 0.9, 2.1, 0.05, 0.62, 1.08, 0.5, 0, -1.3);
  }, Math.PI / 4);
  // The family lives upstairs.
  win('winTV', 1, 1.5, -10.2, 5.3, -6.97); win('winDim', 1, 1.5, -12.9, 5.3, -6.97); win('winLit', 1, 1.5, -15.6, 5.3, -6.97);
  win('winDim', 1, 1.5, -6.97, 5.3, -10.4, true); win('winLit', 1, 1.5, -6.97, 5.3, -13.6, true);
  // A small sign projects from the east wall, near the corner.
  box('iron', 1, 0.56, 0.12, -6.5, 4.05, -8.65);
  put(bladeMat, new THREE.PlaneGeometry(0.92, 0.46), -6.5, 4.05, -8.58); put(bladeMat, new THREE.PlaneGeometry(0.92, 0.46), -6.5, 4.05, -8.72, 0, Math.PI);

  /* ----- the sidewalk in front ----- */
  // A tilted stand with crates of fruit; buckets of cut flowers before it.
  {
    const R = rng(14), sn = Math.sin(TILT), cs = Math.cos(TILT);
    const fruit = [std(0.72, 0.17, 60), red, std(0.7, 0.17, 130), 'bagY'], bloom = [std(0.72, 0.17, 350), 'bagY', 'trim', red];
    box('wood', 1.6, 0.68, 0.7, -9.95, 0.365, -6.45); box('wood', 1.75, 0.05, 0.9, -9.95, 0.85, -6.42, TILT);
    for (let i = 0; i < 8; i++) {
      const x = -10.55 + (i % 4) * 0.4, s = i < 4 ? -0.21 : 0.21, y = 0.925 - s * sn, z = -6.42 + s * cs;
      box('wood', 0.36, 0.1, 0.36, x, y, z, TILT);
      for (let j = 0; j < 5; j++) put(fruit[(i + (i > 3 ? 1 : 0)) % 4], ico(0.065, 0.065, 0.065, 0), x + (R() - 0.5) * 0.22, y + 0.075, z + (R() - 0.5) * 0.22);
    }
    for (let i = 0; i < 4; i++) {
      const x = -10.7 + i * 0.5, z = -5.75 + (i % 2) * 0.12;
      put('steel', new THREE.CylinderGeometry(0.15, 0.11, 0.32, 8), x, 0.185, z); put('kale', new THREE.ConeGeometry(0.16, 0.3, 6), x, 0.48, z, Math.PI);
      put(bloom[i], ico(0.19, 0.12, 0.19, 0), x, 0.68, z);
    }
  }
  // A bench under the lit pane. The cat sits on it.
  box('wood', 1.6, 0.06, 0.42, -12.45, 0.47, -6.55); box('wood', 1.6, 0.2, 0.04, -12.45, 0.84, -6.78);
  for (const s of [-1, 1]) { box('wood', 0.06, 0.42, 0.4, -12.45 + s * 0.7, 0.235, -6.55); box('wood', 0.05, 0.5, 0.04, -12.45 + s * 0.7, 0.72, -6.78); }
  const cat = std(0.66, 0.15, 55);
  box(cat, 0.2, 0.26, 0.26, -12.1, 0.63, -6.55); box(cat, 0.17, 0.14, 0.15, -12.1, 0.83, -6.48);
  for (const s of [-1, 1]) put(cat, new THREE.ConeGeometry(0.035, 0.08, 4), -12.1 + s * 0.05, 0.94, -6.48);
  // The tail turns about its root.
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.05).translate(0.16, 0, 0), cat);
  tail.position.set(-12, 0.525, -6.62);
  tail.castShadow = true;
  // The ice chest, the pay phone and the notice board, along the west wall.
  box('trim', 1.2, 0.8, 0.6, -14.6, 0.425, -6.68); box('binB', 1.26, 0.08, 0.66, -14.6, 0.865, -6.68);
  box('steel', 0.44, 0.66, 0.24, -15.7, 1.45, -6.88); box('binK', 0.3, 0.4, 0.06, -15.7, 1.42, -6.74);
  box(glow(0.75, 0.12, 240, 1.4), 0.44, 0.1, 0.26, -15.7, 1.83, -6.87);
  box('wood', 0.9, 0.7, 0.04, -16.45, 1.5, -6.98);
  for (let i = 0; i < 6; i++) box(i % 3 ? 'trim' : 'bagY', 0.15, 0.2, 0.01, -16.72 + (i % 3) * 0.27, 1.64 - Math.floor(i / 3) * 0.28, -6.953, 0, 0, (i % 2 ? 1 : -1) * 0.08);
  // Two newspaper boxes and the hydrant, at the east curb.
  for (const [z, m] of [[-8.5, red], [-9.15, 'binB']]) { box(m, 0.45, 0.6, 0.42, -4.75, 0.85, z); box('iron', 0.1, 0.53, 0.1, -4.75, 0.29, z); }
  put(red, new THREE.CylinderGeometry(0.11, 0.13, 0.6, 8), -4.6, 0.325, -6.4); put(red, ico(0.12, 0.1, 0.12), -4.6, 0.65, -6.4); box(red, 0.38, 0.1, 0.1, -4.6, 0.45, -6.4);
  // The stop sign faces the junction; two street-name blades sit above it.
  at(-6.85, 0, -4.6, () => {
    const oct = r => new THREE.CylinderGeometry(r, r, 0.02, 8).rotateY(Math.PI / 8).rotateX(Math.PI / 2);
    put('steel', new THREE.CylinderGeometry(0.03, 0.03, 3.3, 6), 0, 1.65, 0);
    put('trim', oct(0.42), 0, 2.5, 0.04); put(red, oct(0.38), 0, 2.5, 0.055);
    box(green, 0.8, 0.15, 0.02, 0, 3.05, 0, 0, Math.PI / 4); box(green, 0.8, 0.15, 0.02, 0, 3.22, 0, 0, -Math.PI / 4);
  }, Math.PI / 4);

  /* ----- pole, lamp, wires ----- */
  const PX = -5.1, PZ = -4.8, LAMP = V(PX + 1.8, 8.3, PZ + 1.8);
  pole(PX, PZ); pole(-50, PZ); pole(42, PZ); pole(PX, -50, 10.6, 'x'); pole(PX, 42, 10.6, 'x');
  // The lamp arm reaches over the junction.
  at(PX, 0, PZ, () => {
    box('steel', 0.07, 0.07, 2.5, 0, 8.25, 1.25, -0.1); box('steel', 0.3, 0.1, 0.62, 0, 8.42, 2.55); box(lampHead, 0.22, 0.03, 0.44, 0, 8.36, 2.57);
  }, Math.PI / 4);
  let perch;
  for (const [d, y, sag, r] of [[-1, 10.15, 0.45, 0.018], [0, 10.62, 0.45, 0.018], [1, 10.15, 0.45, 0.018], [0.2, 7.7, 0.65, 0.02]]) {
    const w = wire(V(PX, y, PZ + d), V(-50, y, PZ + d), sag, r);
    wire(V(PX, y, PZ + d), V(42, y, PZ + d), sag, r);
    if (y === 7.7) perch = w;
  }
  for (const [y, sag] of [[9.1, 0.5], [6.6, 0.8]]) { wire(V(PX + 0.2, y, PZ), V(PX + 0.2, y, -50), sag); wire(V(PX + 0.2, y, PZ), V(PX + 0.2, y, 42), sag); }
  wire(V(PX, 7.7, PZ), V(-7.6, 6.3, -6.98), 0.25, 0.02, 0.03);
  // A bike leans on the pole: bp places each part in the leaned plane.
  {
    const bikeM = std(0.72, 0.13, 195), LEAN = -0.2, cl = Math.cos(LEAN), sl = Math.sin(LEAN);
    const bp = (m, g, x, y, rz = 0) => put(m, g, x, y * cl, y * sl, LEAN, 0, rz);
    at(PX - 0.05, 0.03, PZ + 0.33, () => {
      for (const s of [-1, 1]) bp('binK', new THREE.TorusGeometry(0.32, 0.022, 6, 18), s * 0.52, 0.34);
      for (const [w, h, d, x, y, rz] of [[0.03, 0.6, 0.03, -0.06, 0.58, 0.2], [0.52, 0.03, 0.03, 0.15, 0.82, 0], [0.64, 0.03, 0.03, 0.21, 0.55, 0.85], [0.62, 0.025, 0.025, -0.31, 0.57, 0.84], [0.03, 0.6, 0.03, 0.47, 0.63, 0.18], [0.03, 0.03, 0.46, 0.41, 0.93, 0]]) bp(bikeM, new THREE.BoxGeometry(w, h, d), x, y, rz);
      bp('binK', new THREE.BoxGeometry(0.24, 0.04, 0.1), -0.13, 0.9);
    });
  }

  /* ----- the other corners and the rows ----- */
  // A gabled house with a porch. Its front wall is at x, z; ry turns it.
  const house = (x, z, ry, body, glass) => at(x, 0, z, () => {
    gableHouse({ x: 0, zf: 0, w: 7, d: 9, base: 1, wall: 3, rise: 3, body });
    box('deck', 7, 0.14, 1.6, 0, 0.93, 0.8); box('roof', 7.3, 0.12, 1.95, 0, 3.62, 0.9, 0.2);
    for (const px of [-3.35, -1, 1, 3.35]) box('trim', 0.15, 2.5, 0.15, px, 2.25, 1.5);
    for (let i = 1; i <= 4; i++) { const h = 1 - i * 0.2; box('deck', 1.4, h, 0.29, 0, h / 2, 1.6 + (i - 0.5) * 0.29); }
    box('door', 0.95, 2.05, 0.06, 0, 2.02, 0.03);
    win(glass, 1.1, 1.5, -2, 2.6, 0.03); win('winDim', 1.1, 1.5, 2, 2.6, 0.03); win('winDim', 1, 1.1, 0, 5.1, 0.03);
  }, ry);
  {
    const R = rng(33), keys = ['h1', 'h2', 'h3', 'h4', 'h6', 'purple', 'body'];
    const any = () => keys[Math.floor(R() * 7)], glim = () => (R() < 0.45 ? 'winLit' : 'winDim');
    for (let i = 0; i < 8; i++) {
      house(-22.5 - i * 10, -10, 0, any(), glim()); house(22.5 + i * 10, -10, 0, any(), glim());
      house(-10, -23 - i * 10, Math.PI / 2, any(), glim()); house(10, -23 - i * 10, -Math.PI / 2, any(), glim());
    }
    house(12.5, -10, 0, 'h3', 'winLit'); house(-12.5, 10, Math.PI, 'h2', 'winDim'); house(12.5, 10, Math.PI, 'h4', 'winLit');
    // Tall firs stand behind the store roof.
    for (let i = 0; i < 6; i++) {
      const x = -42 + i * 4 + R() * 2, z = -28 - R() * 12, h = 14 + R() * 8;
      put('fir', new THREE.ConeGeometry(2.2 + R(), h, 7), x, 2 + h / 2, z); put('bark', new THREE.CylinderGeometry(0.25, 0.3, 2.4, 6), x, 1.2, z);
    }
  }
  fence(-26.3, -7.3, -23.3, -7.3); fence(-21.7, -7.3, -18.3, -7.3); fence(-18.3, -7.3, -18.3, -10);
  fence(7.3, -7.3, 11.7, -7.3); fence(7.3, -7.3, 7.3, -19);
  car(std(0.45, 0.12, 25, { roughness: 0.5 }), -21.5, -3.2, 0, -0.15); car(std(0.78, 0.01, 250, { roughness: 0.5 }), -3.2, -18.5, Math.PI / 2, -0.15); car('binB', 3.2, -10.5, Math.PI / 2, -0.15);
  // Street trees. The one on the south-west corner frames the left side.
  tree(-9, 5.2, 11, { hero: true });
  tree(-21, -5, 12); tree(-34, -5.1, 13); tree(-47, -5, 14); tree(-5, -24, 15); tree(-5.1, -40, 16); tree(5, -14, 17); tree(5.1, -31, 18); tree(-24, 5.1, 19);
  // Leaf litter: both gutters, then the walk before the store.
  k.litter(260, R => [-34 + R() * 38, -0.14, 4.1 - R() * R() * 3.2]);
  k.litter(160, R => [-40 + R() * 35.5, -0.14, -4.1 + R() * R() * 1.5], 4);
  k.litter(60, R => [-16 + R() * 11.5, 0.03, -6.6 + R() * 2.2], 5);
  // A few leaves fall through the lamp light, onto the road.
  k.fall(14, R => [-4 + R() * 4.5, 4 + R() * 4, -4 + R() * 4.5], -0.13);

  /* ----- lights ----- */
  // The shop light: one shadowed cone, out through the door and the panes.
  const shop = new THREE.SpotLight(WARM, 0, 32, 1.1, 0.3, 1.3);
  shop.position.set(-9.4, 2.1, -9.4);
  shop.target.position.set(-6.5, 0, -5.3);
  shop.castShadow = true;
  shop.shadow.mapSize.set(2048, 2048);
  shop.shadow.bias = -0.002;
  // Two small glows wash the walk under the awnings.
  const fillS = new THREE.PointLight(WARM, 0, 9, 2), fillE = new THREE.PointLight(WARM, 0, 9, 2);
  fillS.position.set(-12.45, 1.6, -6.7); fillE.position.set(-6.7, 1.6, -10.6);
  const lamp = new THREE.SpotLight(lampCol, 0, 34, 1.25, 0.9, 1.7);
  lamp.position.copy(LAMP);
  lamp.target.position.set(PX + 2.6, 0, PZ + 2.6);
  // Moths circle the box sign.
  const MOTHS = 7, mp = new Float32Array(MOTHS * 3), mAttr = new THREE.BufferAttribute(mp, 3);
  const moths = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', mAttr), new THREE.PointsMaterial({ color: col(0.95, 0.06, 85, 1.5), size: 2.5, sizeAttenuation: false }));
  moths.frustumCulled = false;
  k.group.add(shop, shop.target, fillS, fillE, lamp, lamp.target, tail, moths);

  // The crow sleeps on the low cable, west of the pole.
  const crow = k.crow(), CU = 0.09, CK = 4 * CU * (1 - CU);
  const cx = PX + (-50 - PX) * CU, cy = 7.7 - perch.sag * CK + 0.02, cz = PZ + 0.2;
  k.onCard(c => {
    shop.intensity = c.shop; fillS.intensity = fillE.intensity = c.fill; lamp.intensity = c.lamp;
    lampHead.color.copy(lampCol).multiplyScalar(0.3 + c.lamp * 0.03);
    shelfMat.emissiveIntensity = c.win;
  });
  k.onFrame(t => {
    // The neon drops out for a moment, now and then.
    neon.color.copy(neonOn).multiplyScalar(t % 9 < 0.8 && hash(Math.floor(t * 19)) < 0.5 ? 0.12 : 1);
    // The tail lies still, then flicks.
    const q = Math.max(0, Math.sin(t * 0.8)) ** 8;
    tail.rotation.set(0, Math.sin(t * 7) * 0.5 * q, 0.1 + 0.6 * q);
    for (let i = 0; i < MOTHS; i++) {
      const a = t * (0.9 + i * 0.21) + i * 2.4, r = 0.5 + 0.3 * Math.sin(t * 0.6 + i * 1.3);
      mp[i * 3] = -11.2 + Math.cos(a) * r * (1 + (i % 3)); mp[i * 3 + 1] = 4 + Math.sin(a * 1.7 + i) * 0.4; mp[i * 3 + 2] = -6.45 + Math.sin(a) * 0.25;
    }
    mAttr.needsUpdate = true;
    // The crow follows the sway of its wire.
    const s = CK * perch.amp * Math.sin(t * 1.3 + perch.ph);
    crow.obj.position.set(cx + perch.n1.x * s, cy + CK * perch.amp * 0.35 * Math.sin(t * 0.9 + perch.ph * 1.7), cz + perch.n1.z * s);
    crow.pose(t, 'idle', 0.4);
  });
}
