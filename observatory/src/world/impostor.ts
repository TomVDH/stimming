// Load order: none.
// The module builds nothing until world/woods calls it.
import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, HalfFloatType, LinearFilter, LinearMipmapLinearFilter,
  Mesh, NearestFilter, NoBlending, OrthographicCamera, Scene, ShaderMaterial, UnsignedByteType, WebGLRenderTarget,
} from 'three';
import type { Texture, WebGLRenderer } from 'three';

/* ---------- the impostor bake: the pine on three crossed cards ---------- */
// A far tree is three upright cards that cross at the trunk.
// Each card shows the pine as seen straight on from its front.
// The bake draws those views once, at load, into two atlases.
// One atlas holds the colour.
// The other atlas holds the normals.

// The cards stand at these angles round the trunk, in degrees.
const CARD_DEG = [0, 60, 120];
// One atlas cell is this many pixels tall.
const CELL_H = 512;
// Each view has a clear gutter of at least this many texels.
// The mipmaps then keep the cells apart down to level 5.
const GUTTER = 32;
// A cell's width is a multiple of this.
// Each mip texel then stays inside one cell down to level 6.
const ALIGN = 64;

export type Impostor = {
  // The colour atlas, premultiplied by its alpha.
  albedo: Texture;
  // The normal atlas in the tree's own frame, premultiplied by its alpha.
  normal: Texture;
  // The three cards, 1 tall, with their atlas UVs.
  cards: BufferGeometry;
  // The bake time in milliseconds.
  ms: number;
  // Frees the two atlases and the cards.
  dispose(): void;
};

const VERT = /* glsl */`
attribute float aShade;
varying vec2 vUv;
varying vec3 vN;
varying float vShade;
void main() {
  vUv = uv;
  vN = normal;
  vShade = aShade;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// Mode 0 writes the shaded colour.
// Mode 1 writes the normal.
// Every kept texel has alpha 1 on a clear of 0.
// The colour is then premultiplied, so the mipmaps take no dark fringe.
const FRAG = /* glsl */`
uniform sampler2D map;
uniform float uCut;
uniform int uMode;
varying vec2 vUv;
varying vec3 vN;
varying float vShade;
void main() {
  vec4 t = texture2D(map, vUv);
  if (t.a < uCut) discard;
  gl_FragColor = uMode == 0 ? vec4(t.rgb * vShade, 1.0) : vec4(normalize(vN) * 0.5 + 0.5, 1.0);
}`;

// Copies a target texel for texel.
// The atlas then needs no depth buffer.
const COPY_VERT = /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const COPY_FRAG = /* glsl */`
uniform sampler2D src;
void main() { gl_FragColor = texelFetch(src, ivec2(gl_FragCoord.xy), 0); }`;

// The atlas layout in texels: view width, cell width, left gutter.
type Cells = { view: number; cell: number; gutter: number };

// The cards for a crown of radius R.
// Each card shows only the view inside its own atlas cell.
function cardGeometry(R: number, { view, cell, gutter }: Cells): BufferGeometry {
  const p: number[] = [], uv: number[] = [], n: number[] = [], idx: number[] = [];
  const atlasW = cell * CARD_DEG.length;
  CARD_DEG.forEach((deg, k) => {
    const a = deg * Math.PI / 180;
    // The card's right edge points along cross(up, its normal).
    const rx = Math.cos(a), rz = -Math.sin(a);
    const base = p.length / 3;
    for (const [s, t] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
      p.push(rx * s * R, t, rz * s * R);
      uv.push((k * cell + gutter + view * (s + 1) / 2) / atlasW, t);
      n.push(Math.sin(a), 0, Math.cos(a));
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new Float32BufferAttribute(n, 3));
  g.setIndex(idx);
  return g;
}

// Bakes the impostor of one tree.
// The tree is 1 tall, with its foot at the origin.
// The tree carries an aShade attribute.
// cut is the texture's alpha cut.
// R is the crown radius.
export function bakeImpostor(renderer: WebGLRenderer, tree: BufferGeometry, map: Texture, cut: number, R: number): Impostor {
  const t0 = performance.now();
  const W = Math.ceil(CELL_H * 2 * R), N = CARD_DEG.length;
  const C = Math.ceil((W + 2 * GUTTER) / ALIGN) * ALIGN, G = Math.floor((C - W) / 2);
  type Kind = typeof HalfFloatType | typeof UnsignedByteType;
  // The bake target has a depth buffer for the tree's own overlaps.
  const bakeTarget = (type: Kind) => new WebGLRenderTarget(C * N, CELL_H, {
    type, generateMipmaps: false, minFilter: NearestFilter, magFilter: NearestFilter,
  });
  // The atlas keeps no depth buffer.
  const atlas = (type: Kind) => new WebGLRenderTarget(C * N, CELL_H, {
    type, depthBuffer: false, generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter,
  });
  // Half floats keep the dark greens from banding.
  const albedo = atlas(HalfFloatType), normal = atlas(UnsignedByteType);
  const mat = new ShaderMaterial({
    uniforms: { map: { value: map }, uCut: { value: cut }, uMode: { value: 0 } },
    vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide,
  });
  const scene = new Scene();
  scene.add(new Mesh(tree, mat));
  // One triangle covers the whole target for the copy.
  const copyGeo = new BufferGeometry();
  copyGeo.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const copyMat = new ShaderMaterial({
    uniforms: { src: { value: null } }, vertexShader: COPY_VERT, fragmentShader: COPY_FRAG,
    blending: NoBlending, depthTest: false, depthWrite: false,
  });
  const copyScene = new Scene();
  const copyMesh = new Mesh(copyGeo, copyMat);
  copyMesh.frustumCulled = false;
  copyScene.add(copyMesh);
  // The view spans the crown's width and the tree's height.
  const cam = new OrthographicCamera(-R, R, 1, 0, 0.01, 4 * R + 2);
  const prevTarget = renderer.getRenderTarget(), prevColor = renderer.getClearColor(new Color());
  const prevAlpha = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  for (const [rt, mode, type] of [[albedo, 0, HalfFloatType], [normal, 1, UnsignedByteType]] as const) {
    const bake = bakeTarget(type);
    mat.uniforms.uMode.value = mode;
    renderer.setRenderTarget(bake);
    renderer.clear();
    CARD_DEG.forEach((deg, k) => {
      const a = deg * Math.PI / 180;
      // The camera looks at the card's front, level with the foot.
      cam.position.set(Math.sin(a) * (2 * R + 1), 0, Math.cos(a) * (2 * R + 1));
      cam.lookAt(0, 0, 0);
      // The view sits inside the cell, between its gutters.
      bake.viewport.set(k * C + G, 0, W, CELL_H);
      renderer.setRenderTarget(bake);
      renderer.render(scene, cam);
    });
    // The copy fills the whole atlas, gutters too.
    // The render then builds the atlas's mipmaps.
    copyMat.uniforms.src.value = bake.texture;
    renderer.setRenderTarget(rt);
    renderer.render(copyScene, cam);
    bake.dispose();
  }
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevColor, prevAlpha);
  renderer.autoClear = prevAuto;
  // The bake's own material and copy pass go now.
  // The tree's geometry belongs to world/woods.
  mat.dispose();
  copyMat.dispose();
  copyGeo.dispose();
  const cards = cardGeometry(R, { view: W, cell: C, gutter: G });
  const dispose = (): void => { albedo.dispose(); normal.dispose(); cards.dispose(); };
  return { albedo: albedo.texture, normal: normal.texture, cards, ms: performance.now() - t0, dispose };
}
