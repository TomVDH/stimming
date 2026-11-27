// Ten handcrafted 3D beveled silicon mask doodles etched across M1-M4 metal layers.

import * as THREE from 'three';
import {
  createFoundRingMaterial,
  createMetalMaterial,
  METAL_PRESETS,
  type SharedOpticsUniforms,
} from './materials.ts';

export interface DoodleSpec {
  id: string;
  name: string;
  layer: 'M1 · Poly' | 'M2 · Copper' | 'M3 · Gold' | 'M4 · Al-Cu';
  layerShort: 'M1' | 'M2' | 'M3' | 'M4';
  layerZ: number;
  microns: number;
  preset: keyof typeof METAL_PRESETS;
  scale: number;
  build: () => THREE.BufferGeometry[];
}

export interface DoodleInstance {
  spec: DoodleSpec;
  group: THREE.Group;
  material: THREE.ShaderMaterial;
  ringMaterial: THREE.ShaderMaterial;
  worldPos: THREE.Vector3;
  hitRadius: number;
  zone: string;
  found: boolean;
  foundAt: number;
  hoverAmount: number;
  highlight: number;
}

const EXTRUDE_FINE: THREE.ExtrudeGeometryOptions = {
  depth: 0.095,
  bevelEnabled: true,
  bevelThickness: 0.024,
  bevelSize: 0.022,
  bevelSegments: 2,
  curveSegments: 14,
};

function shapeFromPts(pts: [number, number][]): THREE.Shape {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

function extrude(shape: THREE.Shape, depthScale = 1): THREE.BufferGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    ...EXTRUDE_FINE,
    depth: (EXTRUDE_FINE.depth ?? 0.095) * depthScale,
  });
}

function rectGeo(x: number, y: number, w: number, h: number, depthScale = 1): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(x, y);
  s.lineTo(x + w, y);
  s.lineTo(x + w, y + h);
  s.lineTo(x, y + h);
  s.closePath();
  return extrude(s, depthScale);
}

function ringShape(cx: number, cy: number, outerR: number, innerR: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(cx, cy, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(cx, cy, innerR, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

function circleShape(cx: number, cy: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}

// Helper for Manhattan step-lithography pixel art (like classic 1980s polysilicon chip art)
function buildPixelBitmap(rows: string[], cell = 0.19): THREE.BufferGeometry[] {
  const geos: THREE.BufferGeometry[] = [];
  const h = rows.length;
  const w = rows[0].length;
  const ox = -(w * cell) / 2;
  const oy = -(h * cell) / 2;
  for (let r = 0; r < h; r++) {
    let runStart = -1;
    for (let c = 0; c <= w; c++) {
      const filled = c < w && rows[r][c] === '#';
      if (filled && runStart === -1) {
        runStart = c;
      } else if (!filled && runStart !== -1) {
        const len = c - runStart;
        const x = ox + runStart * cell;
        const y = oy + (h - 1 - r) * cell;
        geos.push(rectGeo(x + 0.008, y + 0.008, len * cell - 0.016, cell - 0.016, 0.92));
        runStart = -1;
      }
    }
  }
  return geos;
}

// 1. Rubber Duck Debugger
function buildDuck(): THREE.BufferGeometry[] {
  const body = new THREE.Shape();
  body.moveTo(-0.88, -0.18);
  body.bezierCurveTo(-0.92, -0.58, -0.35, -0.68, 0.22, -0.64);
  body.bezierCurveTo(0.75, -0.6, 0.98, -0.28, 0.95, 0.12);
  body.bezierCurveTo(0.92, 0.34, 0.66, 0.22, 0.56, 0.24);
  body.bezierCurveTo(0.45, 0.27, 0.28, 0.42, 0.24, 0.64);
  body.bezierCurveTo(0.20, 0.95, -0.26, 1.02, -0.48, 0.80);
  body.bezierCurveTo(-0.62, 0.66, -0.58, 0.44, -0.55, 0.34);
  body.lineTo(-0.88, 0.32);
  body.lineTo(-0.96, 0.20);
  body.lineTo(-0.62, 0.14);
  body.bezierCurveTo(-0.62, 0.02, -0.84, -0.02, -0.88, -0.18);
  const eye = new THREE.Path();
  eye.absarc(-0.28, 0.62, 0.085, 0, Math.PI * 2, true);
  body.holes.push(eye);

  const wing = new THREE.Shape();
  wing.moveTo(-0.18, -0.08);
  wing.bezierCurveTo(0.18, -0.02, 0.52, -0.16, 0.56, -0.34);
  wing.bezierCurveTo(0.32, -0.46, -0.12, -0.42, -0.18, -0.08);
  const wingGeo = extrude(wing, 1.45);
  wingGeo.translate(0, 0, 0.04);

  const ripple1 = rectGeo(-0.78, -0.86, 1.56, 0.08, 0.65);
  const ripple2 = rectGeo(-0.52, -1.04, 1.04, 0.07, 0.55);

  return [extrude(body, 1.0), wingGeo, ripple1, ripple2];
}

// 2. Sleeping Wafer Cat
function buildCat(): THREE.BufferGeometry[] {
  const body = new THREE.Shape();
  body.moveTo(-0.85, -0.42);
  body.bezierCurveTo(-0.94, 0.18, -0.45, 0.58, 0.18, 0.52);
  body.bezierCurveTo(0.76, 0.46, 0.98, 0.02, 0.86, -0.42);
  body.bezierCurveTo(0.74, -0.66, -0.70, -0.66, -0.85, -0.42);

  const head = new THREE.Shape();
  head.moveTo(-0.78, -0.02);
  head.lineTo(-0.86, 0.54);
  head.lineTo(-0.54, 0.34);
  head.lineTo(-0.24, 0.34);
  head.lineTo(0.02, 0.58);
  head.lineTo(-0.02, -0.02);
  head.bezierCurveTo(-0.06, -0.34, -0.74, -0.34, -0.78, -0.02);
  const eyeL = new THREE.Path();
  eyeL.absarc(-0.56, 0.08, 0.055, 0, Math.PI * 2, true);
  const eyeR = new THREE.Path();
  eyeR.absarc(-0.24, 0.08, 0.055, 0, Math.PI * 2, true);
  head.holes.push(eyeL, eyeR);
  const headGeo = extrude(head, 1.35);
  headGeo.translate(0, 0, 0.03);

  // Sweeping tail trace
  const tail = new THREE.Shape();
  tail.moveTo(0.74, -0.36);
  tail.bezierCurveTo(1.16, -0.22, 1.18, 0.46, 0.72, 0.68);
  tail.bezierCurveTo(0.56, 0.75, 0.48, 0.60, 0.62, 0.52);
  tail.bezierCurveTo(0.95, 0.34, 0.94, -0.10, 0.68, -0.22);
  tail.closePath();

  return [extrude(body, 0.95), headGeo, extrude(tail, 0.85)];
}

// 3. Sub-Micron Rocket
function buildRocket(): THREE.BufferGeometry[] {
  const hull = new THREE.Shape();
  hull.moveTo(0, 1.12);
  hull.bezierCurveTo(0.36, 0.64, 0.42, 0.02, 0.32, -0.62);
  hull.lineTo(-0.32, -0.62);
  hull.bezierCurveTo(-0.42, 0.02, -0.36, 0.64, 0, 1.12);
  const port = new THREE.Path();
  port.absarc(0, 0.24, 0.16, 0, Math.PI * 2, true);
  hull.holes.push(port);

  const finL = shapeFromPts([[-0.34, -0.18], [-0.74, -0.66], [-0.66, -0.84], [-0.28, -0.58]]);
  const finR = shapeFromPts([[0.34, -0.18], [0.74, -0.66], [0.66, -0.84], [0.28, -0.58]]);
  const flame = shapeFromPts([[-0.18, -0.72], [0, -1.16], [0.18, -0.72], [0, -0.86]]);
  const ring = extrude(ringShape(0, 0.24, 0.22, 0.15), 1.35);
  ring.translate(0, 0, 0.03);

  return [extrude(hull, 1.1), extrude(finL, 0.85), extrude(finR, 0.85), extrude(flame, 0.7), ring];
}

// 4. 8-Bit Invader (step-litho polysilicon)
function buildInvader(): THREE.BufferGeometry[] {
  return buildPixelBitmap([
    '..#.....#..',
    '...#...#...',
    '..#######..',
    '.##.###.##.',
    '###########',
    '#.#######.#',
    '#.#.....#.#',
    '...##.##...',
  ], 0.19);
}

// 5. Tapeout Coffee Mug
function buildMug(): THREE.BufferGeometry[] {
  const cup = shapeFromPts([
    [-0.58, 0.42],
    [0.44, 0.42],
    [0.38, -0.76],
    [-0.52, -0.76],
  ]);
  const handle = new THREE.Shape();
  handle.absarc(0.46, -0.14, 0.36, -Math.PI * 0.5, Math.PI * 0.5, false);
  handle.absarc(0.46, -0.14, 0.20, Math.PI * 0.5, -Math.PI * 0.5, true);
  handle.closePath();

  const steam = (ox: number) => {
    const s = new THREE.Shape();
    s.moveTo(ox - 0.05, 0.58);
    s.bezierCurveTo(ox - 0.16, 0.78, ox + 0.14, 0.90, ox - 0.02, 1.12);
    s.lineTo(ox + 0.07, 1.09);
    s.bezierCurveTo(ox + 0.22, 0.88, ox - 0.08, 0.76, ox + 0.04, 0.58);
    s.closePath();
    return extrude(s, 0.72);
  };
  const saucer = rectGeo(-0.78, -0.94, 1.44, 0.11, 0.8);

  return [extrude(cup, 1.05), extrude(handle, 0.9), saucer, steam(-0.32), steam(-0.06), steam(0.20)];
}

// 6. Flanders Flyer (delicate bicycle)
function buildBike(): THREE.BufferGeometry[] {
  const wheelL = extrude(ringShape(-0.68, -0.26, 0.44, 0.33), 0.95);
  const wheelR = extrude(ringShape(0.68, -0.26, 0.44, 0.33), 0.95);
  const hubL = extrude(circleShape(-0.68, -0.26, 0.09), 1.25);
  const hubR = extrude(circleShape(0.68, -0.26, 0.09), 1.25);

  const bar = (x1: number, y1: number, x2: number, y2: number, w = 0.085) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * (w * 0.5);
    const ny = (dx / len) * (w * 0.5);
    return extrude(
      shapeFromPts([
        [x1 + nx, y1 + ny],
        [x2 + nx, y2 + ny],
        [x2 - nx, y2 - ny],
        [x1 - nx, y1 - ny],
      ]),
      1.15
    );
  };

  return [
    wheelL,
    wheelR,
    hubL,
    hubR,
    bar(-0.68, -0.26, -0.08, -0.26), // chainstay
    bar(-0.68, -0.26, -0.28, 0.36),  // seatstay
    bar(-0.08, -0.26, -0.30, 0.50),  // seat tube
    bar(-0.28, 0.36, 0.42, 0.38),    // top tube
    bar(-0.08, -0.26, 0.42, 0.38),   // down tube
    bar(0.68, -0.26, 0.38, 0.56),    // fork
    bar(0.30, 0.56, 0.62, 0.62, 0.09), // handlebar
    bar(-0.48, 0.52, -0.14, 0.52, 0.11), // saddle
  ];
}

// 7. Ringed Planet (Saturn)
function buildSaturn(): THREE.BufferGeometry[] {
  const globe = extrude(circleShape(0, 0, 0.54), 1.35);

  // Tilted elliptical ring with gap
  const ring = new THREE.Shape();
  const segs = 36;
  const tilt = 0.36;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const rot = (x: number, y: number): [number, number] => [x * ct - y * st, x * st + y * ct];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const [rx, ry] = rot(Math.cos(a) * 1.16, Math.sin(a) * 0.36);
    if (i === 0) ring.moveTo(rx, ry);
    else ring.lineTo(rx, ry);
  }
  const hole = new THREE.Path();
  for (let i = segs; i >= 0; i--) {
    const a = (i / segs) * Math.PI * 2;
    const [rx, ry] = rot(Math.cos(a) * 0.78, Math.sin(a) * 0.21);
    if (i === segs) hole.moveTo(rx, ry);
    else hole.lineTo(rx, ry);
  }
  ring.holes.push(hole);
  const ringGeo = extrude(ring, 0.78);
  ringGeo.translate(0, 0, 0.04);

  const moon = extrude(circleShape(0.86, 0.64, 0.13), 1.0);
  return [globe, ringGeo, moon];
}

// 8. Silicon Gambit (Chess Knight)
function buildKnight(): THREE.BufferGeometry[] {
  const silhouette = new THREE.Shape();
  silhouette.moveTo(-0.56, -0.78);
  silhouette.lineTo(0.58, -0.78);
  silhouette.lineTo(0.46, -0.52);
  silhouette.bezierCurveTo(0.56, -0.05, 0.48, 0.54, 0.14, 0.88);
  silhouette.lineTo(0.06, 1.06);
  silhouette.lineTo(-0.14, 0.86);
  silhouette.lineTo(-0.34, 0.98);
  silhouette.lineTo(-0.32, 0.72);
  silhouette.lineTo(-0.74, 0.34);
  silhouette.lineTo(-0.62, 0.12);
  silhouette.lineTo(-0.24, 0.22);
  silhouette.bezierCurveTo(-0.08, 0.06, -0.26, -0.28, -0.48, -0.52);
  silhouette.closePath();
  const eye = new THREE.Path();
  eye.absarc(-0.26, 0.56, 0.065, 0, Math.PI * 2, true);
  silhouette.holes.push(eye);

  const base = rectGeo(-0.70, -1.02, 1.40, 0.20, 1.25);
  return [extrude(silhouette, 1.05), base];
}

// 9. Legacy Silicon Dinosaur (Manhattan step-lithography)
function buildDino(): THREE.BufferGeometry[] {
  return buildPixelBitmap([
    '......#####',
    '.....##.###',
    '.....######',
    '.....###...',
    '.....#####.',
    '#...####...',
    '##.######..',
    '########.#.',
    '.#######...',
    '..#####....',
    '...#..#....',
    '...##.##...',
  ], 0.17);
}

// 10. Mask Compass Rose
function buildCompass(): THREE.BufferGeometry[] {
  const ring = extrude(ringShape(0, 0, 0.92, 0.78), 0.82);
  const star = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI * 0.5;
    const r = i % 2 === 0 ? 1.08 : 0.28;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const starGeo = extrude(star, 1.15);
  starGeo.translate(0, 0, 0.02);

  const diag = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI * 0.25;
    const r = i % 2 === 0 ? 0.66 : 0.18;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) diag.moveTo(x, y);
    else diag.lineTo(x, y);
  }
  diag.closePath();

  const center = extrude(circleShape(0, 0, 0.14), 1.45);
  return [ring, extrude(diag, 0.85), starGeo, center];
}

export const DOODLE_SPECS: DoodleSpec[] = [
  { id: 'duck',    name: 'Rubber Duck',       layer: 'M3 · Gold',   layerShort: 'M3', layerZ: 0.62, microns: 38, preset: 'm3Gold',   scale: 1.08, build: buildDuck },
  { id: 'cat',     name: 'Wafer Cat',         layer: 'M2 · Copper', layerShort: 'M2', layerZ: 0.42, microns: 44, preset: 'm2Copper', scale: 1.10, build: buildCat },
  { id: 'rocket',  name: 'Sub-Micron Launch', layer: 'M3 · Gold',   layerShort: 'M3', layerZ: 0.62, microns: 52, preset: 'm3Gold',   scale: 1.06, build: buildRocket },
  { id: 'invader', name: '8-Bit Mask',        layer: 'M1 · Poly',   layerShort: 'M1', layerZ: 0.22, microns: 26, preset: 'm1',       scale: 1.00, build: buildInvader },
  { id: 'mug',     name: 'Tapeout Fuel',      layer: 'M2 · Copper', layerShort: 'M2', layerZ: 0.42, microns: 34, preset: 'm2Copper', scale: 1.04, build: buildMug },
  { id: 'bike',    name: 'Flanders Flyer',    layer: 'M3 · Gold',   layerShort: 'M3', layerZ: 0.62, microns: 48, preset: 'm3Gold',   scale: 1.12, build: buildBike },
  { id: 'saturn',  name: 'Deep Space Litho',  layer: 'M4 · Al-Cu',  layerShort: 'M4', layerZ: 0.84, microns: 56, preset: 'm4Al',     scale: 1.12, build: buildSaturn },
  { id: 'knight',  name: 'Silicon Gambit',    layer: 'M4 · Al-Cu',  layerShort: 'M4', layerZ: 0.84, microns: 42, preset: 'm4Al',     scale: 1.04, build: buildKnight },
  { id: 'dino',    name: 'Legacy Silicon',    layer: 'M1 · Poly',   layerShort: 'M1', layerZ: 0.22, microns: 36, preset: 'poly',     scale: 1.04, build: buildDino },
  { id: 'compass', name: 'Mask Compass',      layer: 'M2 · Copper', layerShort: 'M2', layerZ: 0.42, microns: 46, preset: 'm2Copper', scale: 1.06, build: buildCompass },
];

export function buildDoodleInstance(
  spec: DoodleSpec,
  optics: SharedOpticsUniforms,
  pos: THREE.Vector2,
  rotationZ: number,
  zone: string
): DoodleInstance {
  const group = new THREE.Group();
  group.position.set(pos.x, pos.y, spec.layerZ);
  group.rotation.z = rotationZ;
  group.scale.setScalar(spec.scale);

  const mat = createMetalMaterial(optics, METAL_PRESETS[spec.preset], {
    layerZ: spec.layerZ,
  });

  const geos = spec.build();
  for (const geo of geos) {
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  }

  // Subtle etched corner alignment L-brackets so the doodle looks authentically framed on the mask
  const bracketSize = 1.48;
  const bLen = 0.24;
  const bW = 0.045;
  const cornerSigns: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sy] of cornerSigns) {
    const hBar = rectGeo(
      sx * bracketSize - (sx > 0 ? bLen : 0),
      sy * bracketSize - (sy > 0 ? bW : 0),
      bLen,
      bW,
      0.35
    );
    const vBar = rectGeo(
      sx * bracketSize - (sx > 0 ? bW : 0),
      sy * bracketSize - (sy > 0 ? bLen : 0),
      bW,
      bLen,
      0.35
    );
    group.add(new THREE.Mesh(hBar, mat));
    group.add(new THREE.Mesh(vBar, mat));
  }

  // Verification halo ring (invisible until found)
  const ringMat = createFoundRingMaterial(optics);
  const ringPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8), ringMat);
  ringPlane.position.z = 0.16;
  group.add(ringPlane);

  return {
    spec,
    group,
    material: mat,
    ringMaterial: ringMat,
    worldPos: new THREE.Vector3(pos.x, pos.y, spec.layerZ),
    hitRadius: 1.95 * spec.scale,
    zone,
    found: false,
    foundAt: -1,
    hoverAmount: 0,
    highlight: 0,
  };
}
