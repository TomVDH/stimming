// East Van postcards: Vancouver Specials on East 12th. One card, the first snow.
// The houses stand on the north side and face south (+z).
// The viewer stands across the street, on a front step.
import { THREE, V, M, col, rng, tex, std, glow, ico, WARM } from '../kit.js';

const lampCol = col(0.84, 0.13, 68);
// G: the brick floor. U: the stucco floor. ZF: the upper front wall.
// BF: the brick front, under the balcony rail. FZ: the front fence line.
const G = 2.6, U = 2.6, RISE = 1.1, W = 8, D = 11, ZF = -6.2, BF = ZF + 1.2, FZ = -0.55, EAVE = G + U, ZC = ZF - D / 2;
// The roof snow follows the slope; it reaches past the eave.
const TH = Math.atan2(RISE, W / 2), LS = Math.hypot(RISE, W / 2) + 0.7;
const PX = 5, PZ = 2.2, LAMP = [PX, 7.9, 4.4];

export const cards = [
  { cap: 'East 12th · 9:10 pm · Snow', hour: 21.6,
    cam: { pos: [2.2, 2.2, 15], yaw: 0, pitch: 0, up: 31, down: 18, minHalf: 0.37 },
    // No moon: the cloud glows and the snow returns it.
    sun: [-0.3, 0.8, 0.5], sunCol: col(0.8, 0.04, 285), sunI: 0.3, hemi: [col(0.62, 0.06, 275), col(0.5, 0.04, 262), 0.95],
    fog: col(0.27, 0.04, 15), fogD: 0.013,
    sky: { cloudA: 0.95, cov: 0.16, cloud: col(0.22, 0.035, 5), cloudLit: col(0.34, 0.05, 30), hazeA: 0.9, hazeK: 5, disc: 0, stars: 0, sunCol: col(0.6, 0.08, 50, 0.2) },
    exposure: 1.15, lamp: 170, porch: 4, spill: 8, string: 5, win: 1.7, tv: 1.1,
    snow: 0.9, rainLamp: LAMP, wind: 0.2, smoke: 0.3, smokeCol: col(0.62, 0.03, 40),
    shadow: { at: [2, 0, -2], r: 28 },
    bloom: [0.5, 0.7, 0.95], grade: { con: 1.08, sat: 1.06, vig: 0.48, grain: 0.07, lift: [0.004, 0.008, 0.03] } },
];

export function build(k) {
  const { box, put, at, limb, win, gableHouse, fence, cart, car, pole, wire, tree } = k;
  const R = rng(31), pick = a => a[Math.floor(R() * a.length)];
  const snow = std(0.93, 0.015, 250, { roughness: 1 }), snowG = std(0.93, 0.015, 250, { roughness: 1, noCast: true });
  const roadS = std(0.85, 0.02, 255, { roughness: 1, noCast: true }), walkS = std(0.89, 0.018, 252, { roughness: 1, noCast: true });
  const track = std(0.58, 0.02, 262, { roughness: 0.7, noCast: true }), dent = std(0.7, 0.03, 262, { roughness: 1, noCast: true });
  const bare = std(0.5, 0.06, 135, { roughness: 1, noCast: true });
  // Brick: a running bond, tinted by the material colour.
  const brickTex = tex(64, 32, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(0, 0, w, 2); g.fillRect(0, h / 2, w, 2); g.fillRect(0, 0, 2, h / 2); g.fillRect(w / 2, h / 2, 2, h / 2);
  }, { rx: 16, ry: 10 });
  const bricks = [std(0.45, 0.11, 35, { map: brickTex }), std(0.7, 0.07, 80, { map: brickTex }), std(0.6, 0.015, 250, { map: brickTex }), std(0.36, 0.06, 40, { map: brickTex })];
  const stuccos = [M.stucco, std(0.84, 0.04, 150), std(0.84, 0.045, 40), std(0.82, 0.035, 235), std(0.87, 0.05, 95)];
  const garage = std(0.85, 0.01, 90), stone = std(0.82, 0.02, 90), scarf = std(0.55, 0.2, 28), carrot = std(0.72, 0.17, 55);
  const bulb = glow(0.86, 0.13, 72), lampHead = glow(0.84, 0.13, 68);
  // The kitchen window of one house has its own switch.
  const nook = M.winLit.clone();

  /* ----- one Vancouver Special ----- */
  // x: the lot centre. mir mirrors the plan. lite: no balusters, for far rows.
  function special(x, { mir = 1, brick, stucco, slider = 'winDim', pic = 'winDim', low = 'winDim', hall = 'winDim', west = 'winDim', front = 'wall', lions = false, porch = false, lite = false }) {
    at(x, 0, 0, () => {
      gableHouse({ x: 0, zf: ZF, w: W, d: D, base: G, wall: U, rise: RISE, body: stucco, found: stucco, ov: 0.6 });
      for (const s of [-1, 1]) box(snow, LS, 0.14, D + 1, s * (Math.cos(TH) * LS / 2 + Math.sin(TH) * 0.15), EAVE + RISE - Math.sin(TH) * LS / 2 + Math.cos(TH) * 0.15 + 0.09, ZC, 0, 0, -s * TH);
      box(snow, 0.24, 0.12, D + 1.04, 0, EAVE + RISE + 0.31, ZC);
      // The brick front projects; the balcony lies on its top.
      box(brick, W, G, 1.2, 0, G / 2, ZF + 0.6);
      box('trim', W + 0.16, 0.1, 1.28, 0, G + 0.05, ZF + 0.64);
      box(snow, W - 0.1, 0.1, 1.0, 0, G + 0.15, ZF + 0.62);
      // The iron rail carries a line of snow.
      box('iron', W, 0.04, 0.04, 0, G + 1.05, BF); box(snow, W + 0.06, 0.06, 0.1, 0, G + 1.09, BF);
      for (const s of [-1, 1]) box('iron', 0.04, 0.04, 1.2, s * W / 2, G + 1.05, ZF + 0.6);
      if (!lite) {
        for (let bx = -W / 2; bx <= W / 2 + 0.01; bx += 0.2) box('iron', 0.025, 0.93, 0.025, bx, G + 0.565, BF);
        for (const s of [-1, 1]) for (const dz of [0.3, 0.6, 0.9]) box('iron', 0.025, 0.93, 0.025, s * W / 2, G + 0.565, ZF + dz);
      }
      // Upstairs: a sliding glass door and a picture window.
      win(slider, 2.4, 2.0, -mir * 1.9, G + 1.1, ZF + 0.03); box('trim', 0.07, 2.0, 0.09, -mir * 1.9, G + 1.1, ZF + 0.04);
      win(pic, 2.2, 1.4, mir * 1.9, G + 1.5, ZF + 0.03);
      for (const s of [-1, 1]) win(s < 0 ? west : 'winDim', 1.0, 1.2, s * (W / 2 + 0.01), G + 1.4, ZF - 3, true);
      // Downstairs: the door, its side light, a window, the garage door.
      const dx = mir * 2.7, gx = -mir * 2.3;
      box('door', 0.95, 2.05, 0.06, dx, 1.07, BF + 0.03); box(snow, 1.3, 0.12, 0.5, dx, 0.06, BF + 0.25);
      box('trim', 1.17, 0.1, 0.1, dx, 2.15, BF + 0.04);
      for (const s of [-1, 1]) box('trim', 0.1, 2.1, 0.1, dx + s * 0.53, 1.05, BF + 0.04);
      box(hall, 0.3, 1.5, 0.04, mir * 1.9, 1.3, BF + 0.02);
      win(low, 1.5, 1.0, mir * 0.3, 1.6, BF + 0.03);
      box(garage, 2.5, 2.1, 0.06, gx, 1.05, BF + 0.03); box('trim', 2.7, 0.1, 0.1, gx, 2.15, BF + 0.04);
      for (const y of [0.55, 1.07, 1.6]) box('iron', 2.5, 0.025, 0.1, gx, y, BF + 0.03);
      if (porch) put(bulb, new THREE.SphereGeometry(0.07, 10, 8), dx, 2.33, BF + 0.12);
      // The chimney stands on the slope above the garage.
      box('brick', 0.6, 1.8, 0.6, -mir * 2.6, EAVE + 1.1, ZF - 4); box('conc', 0.72, 0.1, 0.72, -mir * 2.6, EAVE + 2.05, ZF - 4);
      box(snow, 0.66, 0.08, 0.66, -mir * 2.6, EAVE + 2.13, ZF - 4);
      // The front line leaves gaps for the driveway and the path.
      for (const [a, b] of front ? [[-4.9, -3.75], [-0.85, 2.05], [3.35, 4.9]] : []) {
        const cx = mir * (a + b) / 2, len = b - a;
        if (front === 'wall') { box(stucco, len, 0.42, 0.2, cx, 0.21, FZ); box(snow, len + 0.04, 0.08, 0.26, cx, 0.45, FZ); }
        else if (front === 'hedge') { box('bush', len, 0.9, 0.6, cx, 0.45, FZ); box(snow, len + 0.06, 0.1, 0.66, cx, 0.94, FZ); }
        else fence(mir * a, FZ, mir * b, FZ, 0.9);
      }
      // Two stone lions guard the gate.
      if (lions) for (const u of [2.05, 3.35]) {
        const px = mir * u;
        box(stucco, 0.38, 0.95, 0.38, px, 0.475, FZ); box('trim', 0.46, 0.06, 0.46, px, 0.98, FZ);
        box(stone, 0.2, 0.3, 0.3, px, 1.16, FZ - 0.02); put(stone, ico(0.11, 0.12, 0.11), px, 1.37, FZ + 0.1);
        put(snow, ico(0.1, 0.045, 0.1), px, 1.5, FZ + 0.09); box(snow, 0.18, 0.05, 0.2, px, 1.33, FZ - 0.08);
      }
    });
  }
  // The four subject houses, west to east. The second one is the hero.
  special(-10, { mir: -1, brick: bricks[2], stucco: stuccos[2], slider: 'winDim', pic: 'winLit', low: 'winLit', hall: 'winLit', front: 'hedge', porch: true });
  special(0, { mir: 1, brick: bricks[0], stucco: stuccos[0], slider: 'winLit', pic: 'winTV', hall: 'winLit', front: 'wall', lions: true, porch: true });
  special(10, { mir: -1, brick: bricks[1], stucco: stuccos[1], pic: 'winLit', low: nook, west: 'winLit', front: 'link' });
  special(20, { mir: 1, brick: bricks[3], stucco: stuccos[3], slider: 'winLit', front: 'wall' });
  // Plain rows run off to both sides.
  {
    const lit = () => (R() < 0.45 ? 'winLit' : 'winDim');
    for (let i = 0; i < 9; i++) for (const x of [-20 - i * 10, 30 + i * 10])
      special(x, { mir: R() < 0.5 ? 1 : -1, brick: pick(bricks), stucco: pick(stuccos), slider: lit(), pic: lit(), low: lit(), front: pick(['wall', 'hedge', 'link', null]), lite: true });
    // Tall firs stand behind the roofs; snow sits on their tops.
    for (let i = 0; i < 12; i++) {
      const x = -44 + i * 8 + R() * 4, z = -22 - R() * 9, h = 12 + R() * 8, r = 2.2 + R();
      put('fir', new THREE.ConeGeometry(r, h, 7), x, 2 + h / 2, z); put('bark', new THREE.CylinderGeometry(0.25, 0.3, 2.4, 6), x, 1.2, z);
      put(snow, new THREE.ConeGeometry(r * 0.47 + 0.1, h * 0.44, 7), x, 2.15 + h * 0.78, z);
    }
  }
  k.smoke(-2.6, EAVE + 2.2, ZF - 4);

  /* ----- ground: snow on all of it ----- */
  box(snowG, 700, 0.2, 264, 0, -0.1, -129);
  box(snowG, 700, 0.2, 60, 0, -0.1, 44);
  box(roadS, 700, 0.1, 11.2, 0, -0.2, 8.5);
  box(walkS, 700, 0.04, 1.5, 0, 0.005, 0.45);
  for (const z of [3.0, 14.0]) box(snowG, 700, 0.19, 0.3, 0, -0.045, z);
  // Two cars went by: four tyre tracks show the road.
  // The tracks wander a little; each runs in two-metre pieces.
  for (const [z, ph] of [[5.3, 0], [6.8, 0], [9.2, 2], [10.7, 2]]) for (let x = -60; x < 60; x += 2) box(track, 2.05, 0.03, 0.3, x + 1, -0.14, z + Math.sin(x * 0.07 + ph) * 0.35, 0, -Math.cos(x * 0.07 + ph) * 0.0245);
  // The plough left a lumpy bank along each curb.
  {
    const P = rng(44);
    for (let i = 0; i < 160; i++) { const x = -40 + P() * 80, far = i % 3 === 0, r = 0.25 + P() * 0.4; put(snowG, ico(r * 1.8, r * 0.7, r, 1), x, -0.05, far ? 13.6 + P() * 0.4 : 3.35 + P() * 0.35, 0, P() * 0.4); }
  }
  // The hero driveway has two tracks, from the garage to the curb.
  for (const s of [-1, 1]) box(track, 0.26, 0.012, 7.6, -2.3 + s * 0.72, 0.05, -0.9);
  // One neighbour has cleared the path to the door.
  box('conc', 1.0, 0.03, 4.4, 7.3, 0.02, -2.52);
  for (const s of [-1, 1]) box(snow, 0.25, 0.12, 4.4, 7.3 + s * 0.62, 0.06, -2.52);

  // A line of footprints from x0, z0 to x1, z1, at height y.
  const prints = (x0, z0, x1, z1, y) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, ry = Math.atan2(ux, uz);
    for (let d = 0.2, i = 0; d < len; d += 0.36, i++) {
      const s = i % 2 ? 0.09 : -0.09;
      box(dent, 0.11, 0.012, 0.26, x0 + ux * d + uz * s, y, z0 + uz * d - ux * s, 0, ry + (R() - 0.5) * 0.2);
    }
  };
  // From the hero door, through the gate, across the street to the viewer.
  prints(2.7, BF + 0.6, 2.7, -0.3, 0.016); prints(2.7, -0.3, 2.6, 1.2, 0.041); prints(2.6, 1.2, 2.5, 2.8, 0.016);
  prints(2.4, 3.2, 1.7, 13.9, -0.134);
  // Someone walked the whole sidewalk.
  prints(-40, 0.3, 40, 0.6, 0.041);

  /* ----- the snowman and its makers' marks ----- */
  at(0.6, 0, -2.5, () => {
    put(snow, ico(0.44, 0.4, 0.44, 2), 0, 0.36, 0); put(snow, ico(0.31, 0.29, 0.31, 2), 0, 0.93, 0); put(snow, ico(0.21, 0.21, 0.21, 2), 0, 1.36, 0);
    put(carrot, new THREE.ConeGeometry(0.035, 0.2, 6).rotateX(Math.PI / 2), 0, 1.37, 0.28);
    for (const s of [-1, 1]) {
      put('iron', ico(0.025, 0.025, 0.025, 0), s * 0.08, 1.43, 0.185);
      limb('bark', V(s * 0.26, 1.0, 0), V(s * 0.75, 1.3, 0.1), 0.022, 0.012, 5);
    }
    for (const [y, z] of [[0.83, 0.3], [0.95, 0.315], [1.06, 0.285]]) put('iron', ico(0.028, 0.028, 0.028, 0), 0, y, z);
    put(scarf, new THREE.CylinderGeometry(0.2, 0.23, 0.08, 10), 0, 1.18, 0); box(scarf, 0.09, 0.32, 0.04, 0.14, 1.02, 0.27, 0.15, 0, -0.1);
  }, 0.25);
  prints(2.5, -2.0, 1.4, -2.4, 0.016);
  for (let i = 0; i < 16; i++) { const a = R() * 6.2832, r = 0.7 + R() * 0.7; box(dent, 0.11, 0.012, 0.26, 0.6 + Math.cos(a) * r, 0.016, -2.5 + Math.sin(a) * r, 0, R() * 6.2832); }
  // Each rolled ball leaves a strip of bare lawn.
  box(bare, 0.42, 0.002, 2.6, -0.2, 0.011, -3.4, 0, 1.2); box(bare, 0.34, 0.002, 2.0, 1.5, 0.011, -1.6, 0, -0.5);

  /* ----- cars and carts under snow ----- */
  // A parked car, with snow on its roof, hood and trunk.
  const snowCar = (m, x, z, ry, y) => at(x, y, z, () => {
    car(m, 0, 0);
    box(snow, 2.44, 0.1, 1.62, -0.2, 1.53, 0); box(snow, 1.08, 0.07, 1.7, 1.58, 0.96, 0); box(snow, 0.7, 0.07, 1.7, -1.78, 0.96, 0);
  }, ry);
  snowCar(std(0.5, 0.13, 255, { roughness: 0.5 }), -2.3, -2.6, Math.PI / 2, 0);
  snowCar(std(0.45, 0.12, 25, { roughness: 0.5 }), 7.7, 4.05, 0, -0.15);
  for (const [m, x] of [['binK', 4.55], ['binG', 5.25]]) { cart(m, x, -4.6); box(snow, 0.54, 0.07, 0.6, x, 1.07, -4.6); }

  /* ----- pole, lamp, wires, trees ----- */
  const PW = -41, PE = 51;
  for (const x of [PW, PX, PE]) { pole(x, PZ); box(snow, 0.18, 0.08, 2.44, x, 10.05, PZ); }
  put('steel', new THREE.CylinderGeometry(0.3, 0.3, 0.85, 10), PX - 0.44, 7.3, PZ);
  // The lamp arm reaches south, over the road.
  box('steel', 0.07, 0.07, 2.3, PX, 7.9, 3.3, -0.1); box('steel', 0.3, 0.1, 0.62, PX, 8.03, LAMP[2]);
  box(lampHead, 0.22, 0.03, 0.44, PX, 7.97, LAMP[2] + 0.02); box(snow, 0.32, 0.05, 0.64, PX, 8.1, LAMP[2]);
  for (const [dz, y, sag, r] of [[-1, 10.15, 0.45, 0.018], [0, 10.62, 0.45, 0.018], [1, 10.15, 0.45, 0.018], [0.18, 8.9, 0.55, 0.018], [0.2, 6.9, 0.7, 0.02], [0.22, 6.2, 0.9, 0.022]]) {
    wire(V(PW, y, PZ + dz), V(PX, y, PZ + dz), sag, r); wire(V(PX, y, PZ + dz), V(PE, y, PZ + dz), sag, r);
  }
  // Service drops run to two gables.
  wire(V(PX, 6.9, PZ), V(3, EAVE + 0.1, ZF + 0.3), 0.35, 0.02, 0.03); wire(V(PX, 6.9, PZ), V(7.2, EAVE + 0.1, ZF + 0.3), 0.3, 0.02, 0.03);
  // Bare street trees stand at the lot lines.
  tree(-4.8, 2.1, 7, { hero: true, bare: true });
  for (const [x, seed] of [[14, 8], [-15, 9], [-25, 10], [-35, 11], [24, 12], [34, 13]]) tree(x, 2.1, seed, { bare: true });

  /* ----- lights ----- */
  // Coloured bulbs hang in swags from one balcony rail.
  const BULBS = [col(0.65, 0.22, 28), col(0.8, 0.17, 85), col(0.7, 0.19, 145), col(0.62, 0.16, 250), col(0.65, 0.22, 340)];
  const sA = [], sB = [];
  for (let i = 0; i < 34; i++) { const u = i / 33; (i % 2 ? sB : sA).push(V(10 - W / 2 + u * W, G + 0.98 - Math.abs(Math.sin(u * Math.PI * 6)) * 0.14, BF + 0.06)); }
  const strA = k.bulbs(sA, BULBS, 0.05), strB = k.bulbs(sB, [BULBS[2], BULBS[4], BULBS[0], BULBS[3], BULBS[1]], 0.05);
  // The street lamp: the one local light that casts shadows.
  const lamp = new THREE.SpotLight(lampCol, 0, 36, 1.15, 0.9, 1.7);
  lamp.position.set(...LAMP);
  lamp.target.position.set(PX - 0.6, 0, 2.6);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.002;
  // Two porch glows, and the light that spills onto the hero balcony.
  const porchA = new THREE.PointLight(WARM, 0, 7, 2), porchB = new THREE.PointLight(WARM, 0, 7, 2), spill = new THREE.PointLight(WARM, 0, 6, 2);
  porchA.position.set(2.7, 2.2, BF + 0.7); porchB.position.set(-12.7, 2.2, BF + 0.7); spill.position.set(-1.9, G + 1.3, ZF + 0.8);
  k.group.add(lamp, lamp.target, porchA, porchB, spill);

  k.onCard(c => {
    lamp.intensity = c.lamp; porchA.intensity = porchB.intensity = c.porch; spill.intensity = c.spill;
    lampHead.color.copy(lampCol).multiplyScalar(0.3 + c.lamp * 0.05);
    bulb.color.copy(WARM).multiplyScalar(c.porch ? 6 : 0.4);
  });
  k.onFrame((t, c) => {
    // The two halves of the string trade places, slowly.
    const s = 0.5 + 0.5 * Math.sin(t * 0.7);
    strA.material.color.setScalar(c.string * (0.25 + 0.75 * s)); strB.material.color.setScalar(c.string * (1 - 0.75 * s));
    // The kitchen light goes off for a while, once per loop.
    nook.emissiveIntensity = t % 40 < 27 ? c.win : 0.05;
  });
}
