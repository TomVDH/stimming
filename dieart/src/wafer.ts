// Procedural multi-layer 3D VLSI microchip wafer generator using instanced beveled geometry.

import * as THREE from 'three';
import {
  createMetalMaterial,
  createSramGratingMaterial,
  createSubstrateMaterial,
  METAL_PRESETS,
  type SharedOpticsUniforms,
} from './materials.ts';
import { buildDoodleInstance, DOODLE_SPECS, type DoodleInstance } from './doodles.ts';

interface BoxTransform {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rz?: number;
}

interface PocketCandidate {
  x: number;
  y: number;
  zone: string;
}

export interface WaferDie {
  root: THREE.Group;
  doodles: DoodleInstance[];
  seed: number;
  dispose(): void;
}

// Deterministic mulberry32 PRNG for reproducible seeded chips.
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reusable chamfered/beveled unit prism ([-0.5..0.5] in X/Y, [0..1] in Z).
// Chamfered top edges catch Brightfield speculars, ignite in Darkfield, and sculpt DIC relief!
function createBeveledUnitBox(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const r = 0.42;
  s.moveTo(-r, -r);
  s.lineTo(r, -r);
  s.lineTo(r, r);
  s.lineTo(-r, r);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  // Shift Z so bottom sits at z = 0 and top sits at z = 1.0
  geo.translate(0, 0, 0.14);
  geo.computeVertexNormals();
  return geo;
}

function buildInstancedLayer(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  items: BoxTransform[]
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  const dummy = new THREE.Object3D();
  items.forEach((it, idx) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, 0, it.rz ?? 0);
    dummy.scale.set(it.sx, it.sy, it.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  });
  if (items.length === 0) {
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(0, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

// Octagonal 3D spiral inductor geometry (classic RF analog chip landmark).
function buildOctagonalSpiral(
  cx: number,
  cy: number,
  z: number,
  outerRadius: number,
  turns: number,
  traceW: number,
  height: number,
  out: BoxTransform[]
) {
  const step = (outerRadius * 0.62) / turns;
  const segsPerTurn = 8;
  const totalSegs = turns * segsPerTurn;
  let prevX = 0;
  let prevY = 0;

  for (let i = 0; i <= totalSegs; i++) {
    const frac = i / totalSegs;
    const rad = outerRadius - frac * turns * step;
    const angle = (i / segsPerTurn) * Math.PI * 2 + Math.PI / 8;
    const px = cx + Math.cos(angle) * rad;
    const py = cy + Math.sin(angle) * rad;
    if (i > 0) {
      const dx = px - prevX;
      const dy = py - prevY;
      const len = Math.hypot(dx, dy) + traceW * 0.45;
      out.push({
        x: (prevX + px) * 0.5,
        y: (prevY + py) * 0.5,
        z,
        sx: len,
        sy: traceW,
        sz: height,
        rz: Math.atan2(dy, dx),
      });
    }
    prevX = px;
    prevY = py;
  }
  // Center tap & outer lead-out
  out.push({ x: cx, y: cy, z: z - 0.14, sx: traceW * 1.4, sy: traceW * 1.4, sz: height + 0.14 });
  out.push({ x: cx + outerRadius * 0.52, y: cy, z: z - 0.14, sx: outerRadius * 1.05, sy: traceW * 0.85, sz: 0.08 });
}

// Curved 3D gold wirebond loop arcing from a perimeter bond pad outward to the dark package finger.
function buildWirebondGeo(padX: number, padY: number, dirX: number, dirY: number, len: number): THREE.TubeGeometry {
  const p0 = new THREE.Vector3(padX, padY, 0.92);
  const p1 = new THREE.Vector3(padX + dirX * len * 0.24, padY + dirY * len * 0.24, 2.25);
  const p2 = new THREE.Vector3(padX + dirX * len * 0.68, padY + dirY * len * 0.68, 1.55);
  const p3 = new THREE.Vector3(padX + dirX * len, padY + dirY * len, 0.18);
  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
  return new THREE.TubeGeometry(curve, 14, 0.13, 6, false);
}

export function buildWaferDie(optics: SharedOpticsUniforms, seed: number): WaferDie {
  const rng = createRng(seed);
  const root = new THREE.Group();
  const disposables: { dispose(): void }[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  // Seeded quadrant orientation (rotate by 0/90/180/270 deg + optional X flip) so each New die feels distinct.
  const qRot = Math.floor(rng() * 4) * (Math.PI * 0.5);
  const flipX = rng() > 0.5 ? -1 : 1;
  const cosQ = Math.cos(qRot);
  const sinQ = Math.sin(qRot);
  const mapXY = (x: number, y: number): [number, number] => {
    const fx = x * flipX;
    return [fx * cosQ - y * sinQ, fx * sinQ + y * cosQ];
  };

  // 1. Silicon substrate + ceramic carrier plane
  const subGeo = trackGeo(new THREE.PlaneGeometry(176, 176, 1, 1));
  const subMat = trackMat(createSubstrateMaterial(optics, rng() * 100));
  const subMesh = new THREE.Mesh(subGeo, subMat);
  subMesh.position.z = 0;
  root.add(subMesh);

  // Reusable beveled unit box & materials for each VLSI metal stack layer
  const boxGeo = trackGeo(createBeveledUnitBox());
  const polyMat = trackMat(createMetalMaterial(optics, METAL_PRESETS.poly, { layerZ: 0.22 }));
  const m1Mat = trackMat(createMetalMaterial(optics, METAL_PRESETS.m1, { layerZ: 0.28 }));
  const m2Mat = trackMat(createMetalMaterial(optics, METAL_PRESETS.m2Copper, { layerZ: 0.42 }));
  const m3Mat = trackMat(createMetalMaterial(optics, METAL_PRESETS.m3Gold, { layerZ: 0.62 }));
  const m4Mat = trackMat(createMetalMaterial(optics, METAL_PRESETS.m4Al, { layerZ: 0.84 }));
  const viaMat = trackMat(createMetalMaterial(optics, METAL_PRESETS.via, { layerZ: 0.52 }));
  const wireMat = trackMat(createMetalMaterial(optics, METAL_PRESETS.wirebond, { layerZ: 1.05 }));
  const sramMat = trackMat(createSramGratingMaterial(optics));

  const polyBoxes: BoxTransform[] = [];
  const m1Boxes: BoxTransform[] = [];
  const m2Boxes: BoxTransform[] = [];
  const m3Boxes: BoxTransform[] = [];
  const m4Boxes: BoxTransform[] = [];
  const viaBoxes: BoxTransform[] = [];

  // 2. Choose 10 non-overlapping doodle hiding pockets FIRST so surrounding routing respects their micro-courtyards.
  const baseCandidates: PocketCandidate[] = [
    { x: -37.5, y: 37.5,  zone: 'NW Cache Margin' },
    { x: -13.0, y: 39.5,  zone: 'North Clock Bay' },
    { x: 14.5,  y: 40.0,  zone: 'NE Inductor Deck' },
    { x: 40.5,  y: 26.5,  zone: 'RF Tank Corner' },
    { x: -40.5, y: 6.5,   zone: 'West I/O Corridor' },
    { x: -17.5, y: 8.5,   zone: 'ALU Courtyard' },
    { x: 6.5,   y: 5.5,   zone: 'Core Crossbar' },
    { x: 38.5,  y: -5.5,  zone: 'East Bus Alcove' },
    { x: -36.5, y: -25.5, zone: 'SW Logic Terrace' },
    { x: -9.5,  y: -27.5, zone: 'South Dummy Fill' },
    { x: 16.5,  y: -15.5, zone: 'SE Cache Rim' },
    { x: 37.5,  y: -38.5, zone: 'SE Pad Corner' },
    { x: -24.0, y: -41.0, zone: 'South Seal Margin' },
    { x: 4.5,   y: -40.5, zone: 'Lower Test Strip' },
  ];

  // Shuffle candidates deterministically and apply slight jitter + quadrant orientation
  const shuffled = [...baseCandidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const doodles: DoodleInstance[] = [];
  const pockets: { x: number; y: number; r: number }[] = [];

  DOODLE_SPECS.forEach((spec, idx) => {
    const cand = shuffled[idx % shuffled.length];
    const [mx, my] = mapXY(
      cand.x + (rng() - 0.5) * 3.4,
      cand.y + (rng() - 0.5) * 3.4
    );
    // Keep doodles upright or cleanly rotated in 90-degree mask steps (mostly upright for easy readability)
    const rotChoices = [0, 0, 0, Math.PI * 0.5, -Math.PI * 0.5];
    const rot = rotChoices[Math.floor(rng() * rotChoices.length)];
    const inst = buildDoodleInstance(spec, optics, new THREE.Vector2(mx, my), rot, cand.zone);
    root.add(inst.group);
    doodles.push(inst);
    pockets.push({ x: mx, y: my, r: 3.35 });
    // Dispose doodle geometries & materials cleanly on regenerate
    disposables.push(inst.material, inst.ringMaterial);
    inst.group.traverse(obj => {
      if (obj instanceof THREE.Mesh && obj.geometry) disposables.push(obj.geometry);
    });
  });

  const hitsPocket = (x: number, y: number, pad = 0): boolean => {
    for (const pk of pockets) {
      const dx = x - pk.x;
      const dy = y - pk.y;
      const lim = pk.r + pad;
      if (dx * dx + dy * dy < lim * lim) return true;
    }
    return false;
  };

  // 3. Double Die Seal Ring + Laser Alignment Fiducials
  const sealR = 53.2;
  const sealW = 0.72;
  m4Boxes.push(
    { x: 0, y: sealR, z: 0.65, sx: sealR * 2 + sealW, sy: sealW, sz: 0.22 },
    { x: 0, y: -sealR, z: 0.65, sx: sealR * 2 + sealW, sy: sealW, sz: 0.22 },
    { x: sealR, y: 0, z: 0.65, sx: sealW, sy: sealR * 2 + sealW, sz: 0.22 },
    { x: -sealR, y: 0, z: 0.65, sx: sealW, sy: sealR * 2 + sealW, sz: 0.22 }
  );
  const innerSeal = 51.9;
  m3Boxes.push(
    { x: 0, y: innerSeal, z: 0.50, sx: innerSeal * 2, sy: 0.34, sz: 0.14 },
    { x: 0, y: -innerSeal, z: 0.50, sx: innerSeal * 2, sy: 0.34, sz: 0.14 },
    { x: innerSeal, y: 0, z: 0.50, sx: 0.34, sy: innerSeal * 2, sz: 0.14 },
    { x: -innerSeal, y: 0, z: 0.50, sx: 0.34, sy: innerSeal * 2, sz: 0.14 }
  );
  // Corner optical alignment crosshairs
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const cx = sx * 48.2;
      const cy = sy * 48.2;
      m4Boxes.push(
        { x: cx, y: cy, z: 0.74, sx: 2.6, sy: 0.28, sz: 0.16 },
        { x: cx, y: cy, z: 0.74, sx: 0.28, sy: 2.6, sz: 0.16 }
      );
      m2Boxes.push({ x: cx, y: cy, z: 0.36, sx: 1.5, sy: 1.5, sz: 0.12 });
    }
  }

  // 4. Perimeter Bond Pads (56 total, 14 per side) + Curved 3D Gold Wirebond Loops
  const padsPerSide = 14;
  const padRing = 49.4;
  const padSpan = 42.5;
  const wireGeos: THREE.BufferGeometry[] = [];

  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < padsPerSide; i++) {
      const t = (i / (padsPerSide - 1)) * 2 - 1;
      const along = t * padSpan;
      let px = 0;
      let py = 0;
      let dx = 0;
      let dy = 0;
      if (side === 0) { px = along; py = padRing; dx = 0; dy = 1; }
      else if (side === 1) { px = along; py = -padRing; dx = 0; dy = -1; }
      else if (side === 2) { px = padRing; py = along; dx = 1; dy = 0; }
      else { px = -padRing; py = along; dx = -1; dy = 0; }

      // Outer Al-Cu pad + inner gold bonding target + ESD clamp trace inward
      m4Boxes.push({ x: px, y: py, z: 0.66, sx: 3.3, sy: 3.3, sz: 0.22 });
      m3Boxes.push({ x: px, y: py, z: 0.85, sx: 2.15, sy: 2.15, sz: 0.08 });
      // Lead-in bus toward core
      m2Boxes.push({
        x: px - dx * 2.8,
        y: py - dy * 2.8,
        z: 0.36,
        sx: dx !== 0 ? 3.2 : 0.72,
        sy: dy !== 0 ? 3.2 : 0.72,
        sz: 0.12,
      });
      // Package ceramic landing finger outside die
      m3Boxes.push({
        x: px + dx * 12.6,
        y: py + dy * 12.6,
        z: 0.06,
        sx: dx !== 0 ? 4.4 : 1.75,
        sy: dy !== 0 ? 4.4 : 1.75,
        sz: 0.14,
      });

      const fanAngle = t * 0.22;
      const wdx = dx !== 0 ? dx : Math.sin(fanAngle);
      const wdy = dy !== 0 ? dy : Math.sin(fanAngle);
      const wireLen = 11.4 + Math.abs(t) * 1.8;
      const wg = trackGeo(buildWirebondGeo(px, py, wdx, wdy, wireLen));
      wireGeos.push(wg);
    }
  }
  for (const wg of wireGeos) {
    root.add(new THREE.Mesh(wg, wireMat));
  }

  // 5. Two Large Iridescent SRAM / L2 Cache Bitcell Macro Banks
  const sramZones = [
    { cx: -24.5, cy: 23.0, w: 23.0, h: 17.5 },
    { cx: 23.5,  cy: -24.5, w: 23.5, h: 17.0 },
  ];
  for (const sz of sramZones) {
    const [cx, cy] = mapXY(sz.cx, sz.cy);
    const w = Math.abs(cosQ) > 0.5 ? sz.w : sz.h;
    const h = Math.abs(cosQ) > 0.5 ? sz.h : sz.w;

    const slabGeo = trackGeo(new THREE.BoxGeometry(w, h, 0.22));
    const slab = new THREE.Mesh(slabGeo, sramMat);
    slab.position.set(cx, cy, 0.13);
    root.add(slab);

    // Metallic frame + center sense-amplifier column & row decoder strips
    m2Boxes.push(
      { x: cx, y: cy + h * 0.5 + 0.35, z: 0.34, sx: w + 1.2, sy: 0.55, sz: 0.14 },
      { x: cx, y: cy - h * 0.5 - 0.35, z: 0.34, sx: w + 1.2, sy: 0.55, sz: 0.14 },
      { x: cx + w * 0.5 + 0.35, y: cy, z: 0.34, sx: 0.55, sy: h + 1.2, sz: 0.14 },
      { x: cx - w * 0.5 - 0.35, y: cy, z: 0.34, sx: 0.55, sy: h + 1.2, sz: 0.14 }
    );
    // Sense-amp spine
    m3Boxes.push({ x: cx, y: cy, z: 0.48, sx: 1.15, sy: h - 0.6, sz: 0.16 });
    m3Boxes.push({ x: cx, y: cy, z: 0.48, sx: w - 0.6, sy: 0.95, sz: 0.16 });
    // Decoder vias along the perimeter
    for (let k = -4; k <= 4; k++) {
      viaBoxes.push({ x: cx + (k / 4) * (w * 0.44), y: cy, z: 0.44, sx: 0.38, sy: 0.38, sz: 0.26 });
    }
  }

  // 6. RF Analog Zone: Octagonal 3D Copper Spiral Inductors + MOM Capacitor Finger Arrays
  const spiralCenters: [number, number, number][] = [
    [26.5, 29.0, 6.2],
    [26.5, 13.5, 5.4],
    [12.5, 24.5, 4.9],
    [36.5, 10.0, 4.2],
  ];
  for (const [sx, sy, sr] of spiralCenters) {
    const [cx, cy] = mapXY(sx, sy);
    if (hitsPocket(cx, cy, sr * 0.65)) continue;
    buildOctagonalSpiral(cx, cy, 0.56, sr, 4, 0.52, 0.16, m3Boxes);
    // Guard ring around each inductor
    const gr = sr + 1.1;
    m1Boxes.push(
      { x: cx, y: cy + gr, z: 0.22, sx: gr * 2, sy: 0.26, sz: 0.10 },
      { x: cx, y: cy - gr, z: 0.22, sx: gr * 2, sy: 0.26, sz: 0.10 },
      { x: cx + gr, y: cy, z: 0.22, sx: 0.26, sy: gr * 2, sz: 0.10 },
      { x: cx - gr, y: cy, z: 0.22, sx: 0.26, sy: gr * 2, sz: 0.10 }
    );
  }

  // Interdigitated MOM finger capacitor bank near RF zone
  {
    const [cx, cy] = mapXY(22.0, 1.5);
    if (!hitsPocket(cx, cy, 3.2)) {
      for (let i = -7; i <= 7; i++) {
        m2Boxes.push({ x: cx + i * 0.72, y: cy, z: 0.38, sx: 0.26, sy: 6.4, sz: 0.12 });
      }
      m3Boxes.push(
        { x: cx, y: cy + 3.45, z: 0.54, sx: 11.2, sy: 0.55, sz: 0.14 },
        { x: cx, y: cy - 3.45, z: 0.54, sx: 11.2, sy: 0.55, sz: 0.14 }
      );
    }
  }

  // 7. ALU & Random Logic Sea-of-Gates (Standard cell rows + Manhattan M1/M2 routing)
  const logicRegions = [
    { x0: -41, x1: -2, y0: -14, y1: 11 },
    { x0: -32, x1: 6,  y0: -40, y1: -16 },
    { x0: -6,  x1: 11, y0: 14,  y1: 37 },
  ];

  for (const reg of logicRegions) {
    // Polysilicon gate stripes & M1 horizontal cell rows
    for (let y = reg.y0; y <= reg.y1; y += 2.2) {
      let x = reg.x0 + rng() * 1.4;
      while (x < reg.x1 - 2.0) {
        const segLen = 1.8 + rng() * 5.6;
        const [wx, wy] = mapXY(x + segLen * 0.5, y);
        const horiz = Math.abs(cosQ) > 0.5;
        if (!hitsPocket(wx, wy, segLen * 0.38)) {
          if (rng() > 0.38) {
            m1Boxes.push({
              x: wx,
              y: wy,
              z: 0.22,
              sx: horiz ? segLen : 0.42,
              sy: horiz ? 0.42 : segLen,
              sz: 0.10,
            });
          } else {
            polyBoxes.push({
              x: wx,
              y: wy,
              z: 0.16,
              sx: horiz ? segLen : 0.34,
              sy: horiz ? 0.34 : segLen,
              sz: 0.08,
            });
          }
          // Vertical tap via
          if (rng() > 0.62) {
            viaBoxes.push({ x: wx, y: wy, z: 0.28, sx: 0.32, sy: 0.32, sz: 0.20 });
          }
        }
        x += segLen + 0.9 + rng() * 2.1;
      }
    }

    // M2 orthogonal vertical copper interconnect buses
    for (let x = reg.x0 + 1.0; x <= reg.x1; x += 2.8) {
      let y = reg.y0 + rng() * 1.8;
      while (y < reg.y1 - 2.0) {
        const segLen = 2.6 + rng() * 7.8;
        const [wx, wy] = mapXY(x, y + segLen * 0.5);
        const horiz = Math.abs(cosQ) <= 0.5;
        if (!hitsPocket(wx, wy, segLen * 0.36)) {
          m2Boxes.push({
            x: wx,
            y: wy,
            z: 0.38,
            sx: horiz ? segLen : 0.46,
            sy: horiz ? 0.46 : segLen,
            sz: 0.12,
          });
          if (rng() > 0.58) {
            viaBoxes.push({ x: wx, y: wy, z: 0.44, sx: 0.34, sy: 0.34, sz: 0.22 });
          }
        }
        y += segLen + 1.4 + rng() * 2.8;
      }
    }
  }

  // 8. Elevated M3/M4 Global Clock H-Tree & Power Grid (gives gorgeous 3D depth & focus separation!)
  const powerRails = [-36, -24, -12, 0, 12, 24, 36];
  for (const coord of powerRails) {
    // Segmented along X so buses gracefully bridge around doodle pockets
    for (let seg = -42; seg < 42; seg += 7) {
      const cx = seg + 3.5;
      const cy = coord;
      if (!hitsPocket(cx, cy, 3.6)) {
        m4Boxes.push({ x: cx, y: cy, z: 0.78, sx: 6.95, sy: 0.62, sz: 0.14 });
        if (Math.abs(seg) % 14 === 0) {
          viaBoxes.push({ x: cx, y: cy, z: 0.52, sx: 0.44, sy: 0.44, sz: 0.30 });
        }
      }
      if (!hitsPocket(cy, cx, 3.6) && Math.abs(coord) <= 24) {
        m3Boxes.push({ x: cy, y: cx, z: 0.58, sx: 0.52, sy: 6.95, sz: 0.13 });
      }
    }
  }

  // 9. CMP Dummy Metal-Fill Courtyards (subtle staggered micro-tiles filling open silicon, carved around doodles)
  const fillStep = 2.6;
  for (let gx = -44; gx <= 44; gx += fillStep) {
    for (let gy = -44; gy <= 44; gy += fillStep) {
      // Skip SRAM slabs and doodle pockets
      let inSram = false;
      for (const sz of sramZones) {
        const [scx, scy] = mapXY(sz.cx, sz.cy);
        const w = Math.abs(cosQ) > 0.5 ? sz.w : sz.h;
        const h = Math.abs(cosQ) > 0.5 ? sz.h : sz.w;
        if (Math.abs(gx - scx) < w * 0.54 && Math.abs(gy - scy) < h * 0.54) {
          inSram = true;
          break;
        }
      }
      if (inSram || hitsPocket(gx, gy, 0.8)) continue;
      // Sparse deterministic density so chip breathes and stays fast
      if (rng() > 0.34) continue;
      const jx = gx + (((Math.round(gy) & 1) === 0) ? 0.35 : -0.35);
      const jy = gy;
      const szTile = 0.72 + rng() * 0.34;
      if (rng() > 0.45) {
        polyBoxes.push({ x: jx, y: jy, z: 0.14, sx: szTile, sy: szTile, sz: 0.06 });
      } else {
        m1Boxes.push({ x: jx, y: jy, z: 0.21, sx: szTile * 0.85, sy: szTile * 0.85, sz: 0.08 });
      }
    }
  }

  // Assemble all instanced layers into the wafer root
  root.add(
    buildInstancedLayer(boxGeo, polyMat, polyBoxes),
    buildInstancedLayer(boxGeo, m1Mat, m1Boxes),
    buildInstancedLayer(boxGeo, m2Mat, m2Boxes),
    buildInstancedLayer(boxGeo, m3Mat, m3Boxes),
    buildInstancedLayer(boxGeo, m4Mat, m4Boxes),
    buildInstancedLayer(boxGeo, viaMat, viaBoxes)
  );

  return {
    root,
    doodles,
    seed,
    dispose() {
      root.traverse(obj => {
        if (obj instanceof THREE.InstancedMesh) {
          obj.dispose();
        }
      });
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
