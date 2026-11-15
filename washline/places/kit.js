// Place kit: small helpers that the newer place modules share.
import * as THREE from 'three';
import { oklchLinear } from '../../shared/stim.js';

// A small seeded random, so a place is the same every visit.
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// OKLCH as a CSS string for canvas, and as a linear THREE colour.
export const ok = ([L, C, h], a = 1) => `oklch(${L} ${C} ${h} / ${a})`;
export const col = ([L, C, h]) => new THREE.Color().setRGB(...oklchLinear(L, C, h).map(v => Math.max(0, v)));
export const rgb = c => [c.r, c.g, c.b];
export const pick = (R, a) => a[Math.floor(R() * a.length)];

// One instanced mesh per part; each item has a position, a scale, an angle and a colour.
export function inst(group, geo, mat, items, shadow = true) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  items.forEach((it, i) => {
    q.setFromEuler(e.set(...(it.r || [0, 0, 0])));
    m.setMatrixAt(i, mx.compose(p.set(...it.p), q, s.set(...(it.s || [1, 1, 1]))));
    if (it.c) m.setColorAt(i, it.c);
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// A plain material that takes instance colours.
export const paint = (rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: metal });

// A canvas texture in sRGB, with anisotropy and optional repeat.
export function canvasTex(w, h, draw, repeat = false) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// A quad from four corners, with UVs that repeat by metres.
export function quad(a, b, c, d, uScale = 1, vScale = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  const w = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / uScale;
  const h = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / vScale;
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, w, 0, 0, h, w, h], 2));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  g.computeVertexNormals();
  return g;
}
