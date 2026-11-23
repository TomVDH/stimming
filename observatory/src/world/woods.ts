// Load order: world/complex runs first.
import './complex.ts';
import {
  BufferGeometry, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, LinearFilter,
  LinearMipmapLinearFilter, Mesh, MeshLambertMaterial, Object3D, RepeatWrapping, SRGBColorSpace,
} from 'three';
import type { MeshStandardMaterial, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { buildSteps, stage } from '../../../shared/stim.js';
import { disposeTree, onLeave, renderer, scene } from '../setup.ts';
import { CLEAR, EYE_H, RISE, TREELINE, hillHeight, vnoise } from './hill.ts';
import { roadDist } from './complex.ts';
import { bakeImpostor } from './impostor.ts';

/* ---------- the woods: boreal spruce over the slopes, in two draw calls ---------- */
// Trees stand on a jittered 6 m grid.
// The grid covers the land the camera sees.
const STEP = 6;
const AREA = { x0: -760, x1: 760, z0: -620, z1: 760 };
// No tree stands inside these gaps, in metres.
// The gaps are round the eye's foot, the clearing and the road.
const EYE_GAP = 75, CLEAR_GAP = 6, ROAD_GAP = 6;
// The treeline is ragged by this many metres either way.
const TREELINE_JAG = 14;
// No tree stands on ground steeper than this slope, rise over run.
const MAX_SLOPE = 1.45;

// Every tree this near the complex stays.
// The close cuts look out over these trees.
const NEAR_KEEP = 250;
// The view's half-width in degrees either side of south.
// It covers the opening's pan, 26 degrees right of the wide view, with a margin.
const HALF_VIEW = 90;
// The trim tests from 10 m over the eye.
// A taller Dev eye then still sees woods.
const TEST_EYE_H = EYE_H + 10;
// The canopy starts this high over the ground.
// It hides what is behind it.
const CANOPY = 6;
// The test stops this far short of the tree.
// Then its own neighbours do not hide it.
const SELF_GAP = 15;

// True when the eye sees a tree top over land and canopy.
// The camera faces south (+Z) from the rise.
function seen(x: number, z: number, top: number): boolean {
  if (Math.hypot(x, z) < NEAR_KEEP) return true;
  const ex = RISE.x, ez = RISE.z, ey = hillHeight(ex, ez) + TEST_EYE_H;
  const dx = x - ex, dz = z - ez, d = Math.hypot(dx, dz);
  if (Math.abs(Math.atan2(dx, dz)) * 180 / Math.PI > HALF_VIEW) return false;
  // March the sight line every 8 m.
  // The clearing has no canopy.
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

/* ---------- the pine: Tom's model, 1 tall, its foot at the origin ---------- */
// "Pine Tree - PS1 Low Poly" by Wersaus33, CC BY 4.0.
// CREDITS.md holds the full credit.
const PINE_URL = new URL('../models/pine.glb', import.meta.url).href;
// The model's own alpha cut.
const PINE_CUT = 0.486;
// The bark fills the texture's top-left square, to u and v 0.523.
// The trunk's foot and top strips sit at v 0.52.
// One bound serves the vertex test and the bark recolour.
const BARK_UV = 0.53;
const isBark = (u: number, v: number) => u < BARK_UV && v < BARK_UV;
// The crown's reach is measured in this many height bands.
const BANDS = 10;

type Pine = { geo: BufferGeometry; map: Texture; R: number; mean: Color };

// The texture's empty texels take the colour of their neighbours.
// The mipmaps then blend no white into the branch edges.
function dilate(d: Uint8ClampedArray, w: number, h: number): void {
  let done = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) done[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  for (let grew = true; grew;) {
    grew = false;
    const next = done.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (done[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy, j = yy * w + xx;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h || !done[j]) continue;
            r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
          }
        }
        if (!n) continue;
        d[i * 4] = r / n; d[i * 4 + 1] = g / n; d[i * 4 + 2] = b / n;
        next[i] = 1;
        grew = true;
      }
    }
    done = next;
  }
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.min(c, 1) ** (1 / 2.4) - 0.055);
// The bark is darker and a little warmer than the branches.
const BARK = [0.7, 0.5, 0.45];

// The texture filters smoothly, with mipmaps.
// mean is the branches' mean linear colour.
function pineTexture(image: CanvasImageSource & { width: number; height: number }): { map: Texture; mean: Color } {
  const w = image.width, h = image.height;
  const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  dilate(img.data, w, h);
  const mean = new Color(0, 0, 0);
  let n = 0;
  // The branches fill the rows under the bark.
  // The bound scales by each side, so any texture aspect works.
  const barkRows = Math.ceil(BARK_UV * h), barkCols = Math.ceil(BARK_UV * w);
  for (let i = barkRows * w; i < w * h; i++) {
    if (img.data[i * 4 + 3] < 128) continue;
    mean.r += toLinear(img.data[i * 4] / 255);
    mean.g += toLinear(img.data[i * 4 + 1] / 255);
    mean.b += toLinear(img.data[i * 4 + 2] / 255);
    n++;
  }
  mean.multiplyScalar(1 / Math.max(n, 1));
  // The instance colour divides out the branches' mean colour.
  // The bark takes that mean colour, so it keeps the tree's tone.
  const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const meanL = lum(mean.r, mean.g, mean.b);
  for (let y = 0; y < barkRows; y++) {
    for (let x = 0; x < barkCols; x++) {
      const i = (y * w + x) * 4;
      const k = lum(toLinear(img.data[i] / 255), toLinear(img.data[i + 1] / 255), toLinear(img.data[i + 2] / 255)) / meanL;
      img.data[i] = toSrgb(mean.r * k * BARK[0]) * 255;
      img.data[i + 1] = toSrgb(mean.g * k * BARK[1]) * 255;
      img.data[i + 2] = toSrgb(mean.b * k * BARK[2]) * 255;
    }
  }
  const map = new DataTexture(new Uint8Array(img.data.buffer), w, h);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.generateMipmaps = true;
  map.minFilter = LinearMipmapLinearFilter;
  map.magFilter = LinearFilter;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return { map, mean };
}

// Bakes the model's node matrices into one geometry, 1 tall.
// The trunk's foot stands at the origin.
// +Y is up.
function pineGeometry(gltf: GLTF): BufferGeometry {
  gltf.scene.updateMatrixWorld(true);
  let mesh: Mesh | undefined;
  gltf.scene.traverse((o) => { if (o instanceof Mesh) mesh = o; });
  if (!mesh) throw new Error('pine.glb holds no mesh');
  const src = mesh.geometry as BufferGeometry;
  const g = new BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) g.setAttribute(k, src.getAttribute(k).clone());
  g.setIndex(src.getIndex()!.clone());
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingBox();
  const box = g.boundingBox!, pos = g.getAttribute('position'), uv = g.getAttribute('uv');
  // The trunk's centre line sets the axis.
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (!isBark(uv.getX(i), uv.getY(i))) continue;
    x0 = Math.min(x0, pos.getX(i)); x1 = Math.max(x1, pos.getX(i));
    z0 = Math.min(z0, pos.getZ(i)); z1 = Math.max(z1, pos.getZ(i));
  }
  const H = box.max.y - box.min.y;
  g.translate(-(x0 + x1) / 2, -box.min.y, -(z0 + z1) / 2);
  g.scale(1 / H, 1 / H, 1 / H);
  return g;
}

// Gives the pine its shading attributes.
// It returns the crown radius.
// aShade darkens the crown's inside, near the trunk.
// The normals point out of the crown.
// The crown then takes the light as one mass.
function shadePine(g: BufferGeometry): number {
  const pos = g.getAttribute('position'), nrm = g.getAttribute('normal'), uv = g.getAttribute('uv');
  const band = (y: number) => Math.min(BANDS - 1, Math.max(0, Math.floor(y * BANDS)));
  const reach = new Array<number>(BANDS).fill(0);
  for (let i = 0; i < pos.count; i++) {
    if (isBark(uv.getX(i), uv.getY(i))) continue;
    const b = band(pos.getY(i));
    reach[b] = Math.max(reach[b], Math.hypot(pos.getX(i), pos.getZ(i)));
  }
  const shade = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (isBark(uv.getX(i), uv.getY(i))) { shade[i] = 0.3; continue; }
    const env = Math.max(reach[band(y)], 0.02), k = Math.min(1, Math.hypot(x, z) / env);
    shade[i] = 0.3 + 0.7 * k;
    // The crown normal leans up, so starlight from the sky catches it.
    let vx = x / env, vy = 0.6, vz = z / env;
    const vl = Math.hypot(vx, vy, vz);
    vx /= vl; vy /= vl; vz /= vl;
    // A little of the card's own normal keeps the boughs apart.
    let ox = nrm.getX(i), oy = nrm.getY(i), oz = nrm.getZ(i);
    if (ox * vx + oy * vy + oz * vz < 0) { ox = -ox; oy = -oy; oz = -oz; }
    const nx = vx * 0.75 + ox * 0.25, ny = vy * 0.75 + oy * 0.25, nz = vz * 0.75 + oz * 0.25;
    const nl = Math.hypot(nx, ny, nz);
    nrm.setXYZ(i, nx / nl, ny / nl, nz / nl);
  }
  g.setAttribute('aShade', new Float32BufferAttribute(shade, 1));
  return Math.max(...reach);
}

async function loadPine(): Promise<Pine> {
  const gltf = await new GLTFLoader().loadAsync(PINE_URL);
  const geo = pineGeometry(gltf);
  const R = shadePine(geo);
  const src = (gltf.scene.getObjectByProperty('isMesh', true) as Mesh).material as MeshStandardMaterial;
  const { map, mean } = pineTexture(src.map!.image);
  src.map!.dispose();
  src.dispose();
  return { geo, map, R, mean };
}

/* ---------- the woods' look ---------- */
// The woods get their own haze over the shared haze.
// LAYER_K sets its strength.
// LAYER_D sets its distance in metres.
// Far rows fade more, so the hillside reads in layers.
const LAYER_K = 0.5, LAYER_D = 350;
// Each mip level raises the alpha by this much.
// Far branches then keep their mass and do not thin out.
const MIP_ALPHA = 0.25;

// The material is Lambert with extra terms.
// It adds crown shade, a dark base, a cool top, haze layers.
// It keeps the branch alpha whole at every mip level.
// card is true for the impostor cards, false for the near mesh.
function woodsMaterial(map: Texture, card: false): MeshLambertMaterial;
function woodsMaterial(map: Texture, card: true, normals: Texture): MeshLambertMaterial;
function woodsMaterial(map: Texture, card: boolean, normals?: Texture): MeshLambertMaterial {
  const m = new MeshLambertMaterial({
    color: 0xffffff, map, side: DoubleSide,
    alphaTest: card ? 0.5 : PINE_CUT, alphaToCoverage: true,
  });
  m.onBeforeCompile = (sh) => {
    if (normals) sh.uniforms.uNormals = { value: normals };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        ${card ? 'varying vec3 vIm0, vIm1, vIm2;' : 'attribute float aShade;'}
        varying float vShade;
        varying float vTreeH;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vShade = ${card ? '1.0' : 'aShade'};
        vTreeH = position.y;`)
      // The cards carry the instance's normal transform to the fragment.
      .replace('#include <defaultnormal_vertex>', card ? `#include <defaultnormal_vertex>
        mat3 cm = mat3(instanceMatrix);
        vIm0 = normalMatrix * (cm[0] / dot(cm[0], cm[0]));
        vIm1 = normalMatrix * (cm[1] / dot(cm[1], cm[1]));
        vIm2 = normalMatrix * (cm[2] / dot(cm[2], cm[2]));` : '#include <defaultnormal_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vShade;
        varying float vTreeH;
        ${card ? 'varying vec3 vIm0, vIm1, vIm2;\nuniform sampler2D uNormals;' : ''}
        float woodsLod(vec2 uv, vec2 size) {
          vec2 dx = dFdx(uv * size), dy = dFdy(uv * size);
          return 0.5 * log2(max(dot(dx, dx), dot(dy, dy)));
        }`)
      // The atlas is premultiplied, so the colour divides by alpha.
      .replace('#include <map_fragment>', `
        vec4 sampledDiffuseColor = texture2D(map, vMapUv);
        ${card ? 'sampledDiffuseColor.rgb /= max(sampledDiffuseColor.a, 1e-4);' : ''}
        sampledDiffuseColor.a *= 1.0 + max(0.0, woodsLod(vMapUv, vec2(textureSize(map, 0)))) * ${MIP_ALPHA.toFixed(2)};
        diffuseColor *= sampledDiffuseColor;`)
      // The lower crown lies in the shade of the trees round it.
      // Starlight from the sky catches the top, a little cooler.
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= vShade * mix(0.3, 1.25, vTreeH);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.9, 1.0, 1.18), vTreeH * vTreeH);`)
      // Both faces of a branch take the crown's outward normal.
      .replace('#include <normal_fragment_begin>', card ? `#include <normal_fragment_begin>
        {
          vec4 nt = texture2D(uNormals, vMapUv);
          vec3 nl = nt.rgb / max(nt.a, 1e-4) * 2.0 - 1.0;
          normal = normalize(mat3(vIm0, vIm1, vIm2) * nl);
        }` : `#include <normal_fragment_begin>
        normal = normalize(vNormal);`)
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        #ifdef USE_FOG
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, ${LAYER_K.toFixed(2)} * (1.0 - exp(-length(vHazeP - cameraPosition) / ${LAYER_D.toFixed(1)})));
        #endif`);
  };
  // The two kinds compile to different programs.
  m.customProgramCacheKey = () => (card ? 'woods-card' : 'woods-mesh');
  return m;
}

/* ---------- the woods: near trees as the mesh, far trees as cards ---------- */
// Trees this near the clearing are the full mesh.
// Close shots of the domes can frame them.
const MESH_SITE = 110;
// Trees this near the wide eye are the full mesh too.
const MESH_EYE = 150;

// dispose frees the meshes, the materials, the texture and the atlases.
export type Woods = { root: Group; near: InstancedMesh; far: InstancedMesh; bakeMs: number; dispose(): void };

export function buildWoods(pine: Pine): Woods {
  const rand = rng(51);
  const spots: [number, number, number][] = [];
  for (let z = AREA.z0; z < AREA.z1; z += STEP) {
    for (let x = AREA.x0; x < AREA.x1; x += STEP) {
      const tx = x + (rand() - 0.5) * STEP * 0.9, tz = z + (rand() - 0.5) * STEP * 0.9;
      // The clearing's edge is ragged.
      if (Math.hypot(tx, tz) < CLEAR + CLEAR_GAP + rand() * 8) continue;
      if (Math.hypot(tx - RISE.x, tz - RISE.z) < EYE_GAP) continue;
      const gh = hillHeight(tx, tz);
      // Rock and snow lie over the treeline; it climbs higher in the gullies.
      if (gh > TREELINE + (vnoise(tx / 40, tz / 40, 5) - 0.5) * 2 * TREELINE_JAG - rand() * 6) continue;
      // Cliffs and rock ribs stay bare.
      const sl = Math.hypot(hillHeight(tx + 2, tz) - hillHeight(tx - 2, tz), hillHeight(tx, tz + 2) - hillHeight(tx, tz - 2)) / 4;
      if (sl > MAX_SLOPE) continue;
      if (roadDist(tx, tz) < ROAD_GAP + rand() * 2) continue;
      const r = rand();
      // Trees the camera never sees are left out.
      if (!seen(tx, tz, hillHeight(tx, tz) + 13 + 8 * r)) continue;
      spots.push([tx, tz, r]);
    }
  }
  const isNear = ([x, z]: [number, number, number]) =>
    Math.hypot(x, z) < MESH_SITE || Math.hypot(x - RISE.x, z - RISE.z) < MESH_EYE;
  const nearSpots = spots.filter(isNear), farSpots = spots.filter(s => !isNear(s));
  const imp = bakeImpostor(renderer, pine.geo, pine.map, PINE_CUT, pine.R);
  const near = new InstancedMesh(pine.geo, woodsMaterial(pine.map, false), nearSpots.length);
  const far = new InstancedMesh(imp.cards, woodsMaterial(imp.albedo, true, imp.normal), farSpots.length);
  const o = new Object3D(), c = new Color();
  const place = (mesh: InstancedMesh, list: [number, number, number][]) => list.forEach(([x, z, r], i) => {
    // More numbers per tree, from its place, keep the trim unchanged.
    // q2 picks the tint and the brown trees.
    // qw sets the width alone, so brown trees are not always broad.
    const q = hash(x, z), q2 = hash(z, x), qw = hash(x * 1.618 + 31.4, z * 0.618 - 27.1);
    // The crown height h starts 1 m over the ground.
    const h = (12 + 8 * r) * (0.82 + 0.26 * q);
    o.position.set(x, hillHeight(x, z), z);
    // Boreal spruce: most crowns are slim spires.
    const w = h * (0.22 + 0.1 * qw) / pine.R;
    o.scale.set(w, h + 1, w * (0.9 + 0.2 * q));
    o.rotation.set((q - 0.5) * 0.06, r * 6.28, (q2 - 0.5) * 0.06);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    // Most trees are spruce green.
    // Some trees are bluer or darker.
    // A few trees are brown.
    const k = 0.75 + 0.5 * q;
    if (q2 > 0.93) c.setRGB(0.05 * k, 0.045 * k, 0.03 * k);
    else c.setRGB((0.026 + 0.012 * r) * k, (0.05 + 0.018 * q2) * k, (0.036 + 0.02 * q2) * k);
    // The texture's own colour divides out, so the tone stays the same.
    c.r /= pine.mean.r; c.g /= pine.mean.g; c.b /= pine.mean.b;
    mesh.setColorAt(i, c);
  });
  place(near, nearSpots);
  place(far, farSpots);
  const root = new Group();
  root.add(near, far);
  // The impostor frees its own atlases.
  const dispose = (): void => { disposeTree(root); imp.dispose(); };
  return { root, near, far, bakeMs: imp.ms, dispose };
}

// The page waits this long for the model.
const PINE_WAIT_MS = 5000;

// The model, or a rejection after PINE_WAIT_MS.
function pineInTime(): Promise<Pine> {
  let timer = 0;
  const late = new Promise<never>((_, no) => {
    timer = window.setTimeout(() => no(new Error(`pine.glb took over ${PINE_WAIT_MS} ms`)), PINE_WAIT_MS);
  });
  return Promise.race([loadPine(), late]).finally(() => clearTimeout(timer));
}

// The page's load line counts the model and the bake.
// A failed or slow model leaves the woods out.
// The page then starts without them.
async function grow(): Promise<Woods | null> {
  stage('build');
  const step = buildSteps(2);
  try {
    const pine = step(await pineInTime());
    return step(buildWoods(pine));
  } catch (err) {
    // A known warning: the page runs on without the woods.
    console.warn('Observatory: the woods are left out.', err);
    return null;
  }
}
// setup.ts started the star catalog, so it loads meanwhile.
export const woods = await grow();
if (woods) {
  scene.add(woods.root);
  onLeave(woods.dispose);
}
