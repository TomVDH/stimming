// Load order: world/complex runs first.
import './complex.ts';
import { BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';
import { scene } from '../setup.ts';
import { CLEAR, EYE_H, RISE, TOP, hillHeight } from './hill.ts';
import { roadDist } from './complex.ts';

/* ---------- the woods: dark conifers over the hill, in one draw call ---------- */
// Trees stand on a jittered 7 m grid in the land the camera sees.
const STEP = 7;
const AREA = { x0: -760, x1: 760, z0: -330, z1: 760 };
// No trees within this distance of the camera's foot, the clearing or the road.
const EYE_GAP = 75, CLEAR_GAP = 6, ROAD_GAP = 6;
// The hilltop is bare above this height, so the treetops stay under the complex.
const TREELINE = TOP - 17;

// Every tree this near the complex stays: the close cuts look out over them.
const NEAR_KEEP = 250;
// The view's half-width in degrees either side of south, with a margin.
const HALF_VIEW = 60;
// The trim tests from 10 m over the eye, so a taller Dev eye still sees woods.
const TEST_EYE_H = EYE_H + 10;
// The canopy hides what is behind it from this height over the ground.
const CANOPY = 6;
// The test stops this far short of the tree, so its own neighbours do not hide it.
const SELF_GAP = 15;

// True when the eye can see a tree top over the land and the canopy.
// The camera faces south (+Z) from the rise.
function seen(x: number, z: number, top: number): boolean {
  if (Math.hypot(x, z) < NEAR_KEEP) return true;
  const ex = RISE.x, ez = RISE.z, ey = hillHeight(ex, ez) + TEST_EYE_H;
  const dx = x - ex, dz = z - ez, d = Math.hypot(dx, dz);
  if (Math.abs(Math.atan2(dx, dz)) * 180 / Math.PI > HALF_VIEW) return false;
  // March the sight line every 8 m; the clearing has no canopy.
  for (let s = EYE_GAP; s < d - SELF_GAP; s += 8) {
    const k = s / d, px = ex + dx * k, pz = ez + dz * k;
    const roof = hillHeight(px, pz) + (Math.hypot(px, pz) < CLEAR + CLEAR_GAP ? 0 : CANOPY);
    if (ey + (top - ey) * k < roof) return false;
  }
  return true;
}

// A seeded generator, so the woods stand the same on every load.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A number from 0 to 1 for a place.
function hash(x: number, z: number): number {
  const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// One crown: three stacked tiers of branches, 1 m tall and 1 m in radius.
// Each tier's rim has six branch tips with gaps between them.
// aShade darkens the gaps under the branches; tips and tops stay lit.
const TIERS: [number, number, number][] = [[0, 0.52, 1], [0.3, 0.78, 0.74], [0.56, 1, 0.46]];
const TIPS = 6;
function crownGeometry(): BufferGeometry {
  const p: number[] = [], shade: number[] = [];
  const rim = (y0: number, r: number, k: number): [number, number, number, number] => {
    const a = (k / (TIPS * 2)) * Math.PI * 2, tip = k % 2 === 0;
    // Tips reach out and droop; the gaps sit in and higher.
    const rr = tip ? r : r * 0.6, y = tip ? y0 - 0.03 : y0 + 0.06;
    return [Math.cos(a) * rr, y, -Math.sin(a) * rr, tip ? 0.8 : 0.3];
  };
  for (const [y0, y1, r] of TIERS) {
    for (let k = 0; k < TIPS * 2; k++) {
      const a = rim(y0, r, k), b = rim(y0, r, k + 1);
      // Counter-clockwise from outside: rim point, next rim point, apex.
      p.push(a[0], a[1], a[2], b[0], b[1], b[2], 0, y1, 0);
      shade.push(a[3], b[3], 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setAttribute('aShade', new Float32BufferAttribute(shade, 1));
  // Flat faces read as separate boughs.
  g.computeVertexNormals();
  return g;
}

// Woods-only haze over the shared haze: its strength and its distance in metres.
// Far rows fade more, so the hillside reads in layers.
const LAYER_K = 0.5, LAYER_D = 350;

// Lambert with extra terms: crown shade, a dark base, a cool top, layer haze.
function crownMaterial(): MeshLambertMaterial {
  const m = new MeshLambertMaterial({ color: 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aShade;\nvarying float vShade;\nvarying float vTreeH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShade = aShade;\nvTreeH = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vShade;\nvarying float vTreeH;')
      // The lower crown lies in the shade of the trees round it.
      // Starlight from the sky catches the top, a little cooler.
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= vShade * mix(0.3, 1.25, vTreeH);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.9, 1.0, 1.18), vTreeH * vTreeH);`)
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, ${LAYER_K.toFixed(2)} * (1.0 - exp(-length(vHazeP - cameraPosition) / ${LAYER_D.toFixed(1)})));`);
  };
  return m;
}

export function buildWoods(): InstancedMesh {
  const rand = rng(51);
  const spots: [number, number, number][] = [];
  for (let z = AREA.z0; z < AREA.z1; z += STEP) {
    for (let x = AREA.x0; x < AREA.x1; x += STEP) {
      const tx = x + (rand() - 0.5) * STEP * 0.9, tz = z + (rand() - 0.5) * STEP * 0.9;
      // The clearing's edge is ragged.
      if (Math.hypot(tx, tz) < CLEAR + CLEAR_GAP + rand() * 8) continue;
      if (Math.hypot(tx - RISE.x, tz - RISE.z) < EYE_GAP) continue;
      if (Math.hypot(tx, tz) < 200 && hillHeight(tx, tz) > TREELINE - rand() * 4) continue;
      if (roadDist(tx, tz) < ROAD_GAP + rand() * 2) continue;
      const r = rand();
      // Trees the camera never sees are left out.
      if (!seen(tx, tz, hillHeight(tx, tz) + 13 + 8 * r)) continue;
      spots.push([tx, tz, r]);
    }
  }
  const trees = new InstancedMesh(crownGeometry(), crownMaterial(), spots.length);
  const o = new Object3D(), c = new Color();
  spots.forEach(([x, z, r], i) => {
    // A second number per tree, from its place, keeps the trim unchanged.
    const q = hash(x, z), q2 = hash(z, x);
    const h = (12 + 8 * r) * (0.82 + 0.26 * q);
    // The crown starts 1 m up; a trunk does not show at this range.
    o.position.set(x, hillHeight(x, z) + 1, z);
    // Some crowns are slim spires, some are broad.
    const w = h * (0.3 + 0.12 * q2);
    o.scale.set(w, h, w * (0.9 + 0.2 * q));
    o.rotation.set((q - 0.5) * 0.06, r * 6.28, (q2 - 0.5) * 0.06);
    o.updateMatrix();
    trees.setMatrixAt(i, o.matrix);
    // Spruce green; some trees bluer, some darker, a few brown.
    const k = 0.75 + 0.5 * q;
    if (q2 > 0.93) c.setRGB(0.05 * k, 0.045 * k, 0.03 * k);
    else c.setRGB((0.026 + 0.012 * r) * k, (0.05 + 0.018 * q2) * k, (0.036 + 0.02 * q2) * k);
    trees.setColorAt(i, c);
  });
  return trees;
}

export const woods = buildWoods();
scene.add(woods);
