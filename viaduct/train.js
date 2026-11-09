// Train shape for every scene: hulls, consist layout, plough and lamp places.
// Each scene keeps its own hull material, lights and lamp sprites.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const LENS = { loco: 20, 'loco-b': 20, car: 24, box: 16, hopper: 14 };
const DARK = [0.025, 0.025, 0.027], BODY = [0.15, 0.15, 0.155], STEEL = [0.2, 0.2, 0.21];

function paint(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}
function attrs(g, col, kind) {
  g = g.index ? g.toNonIndexed() : g;
  g.deleteAttribute('uv'); g.clearGroups();
  paint(g, col);
  g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(kind), 1));
  return g;
}
// aTop is 1 on faces that point up, so a scene can cake snow there.
function top(g) {
  const nr = g.attributes.normal.array, a = new Float32Array(g.attributes.position.count);
  for (let i = 0; i < a.length; i++) a[i] = nr[i * 3 + 1] > 0.7 ? 1 : 0;
  g.setAttribute('aTop', new THREE.BufferAttribute(a, 1));
  return g;
}

// The plough: a low wedge under the nose, pointed forward.
function plough(len) {
  const z0 = len / 2 - 0.4, z1 = len / 2 + 1.4, w = 1.7, y0 = 0.25, y1 = 1.55;
  const P = {
    bl: [-w, y0, z0], br: [w, y0, z0], tl: [-w, y1, z0], tr: [w, y1, z0],
    fb: [0, y0, z1], ft: [0, y1 - 0.5, z1 - 0.3],
  };
  const tri = [
    ['bl', 'fb', 'tl'], ['tl', 'fb', 'ft'], ['br', 'tr', 'fb'], ['tr', 'ft', 'fb'],
    ['tl', 'ft', 'tr'], ['bl', 'br', 'fb'], ['bl', 'tl', 'tr'], ['bl', 'tr', 'br'],
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat().flatMap(k => P[k]), 3));
  g.computeVertexNormals();
  return g;
}

// One vehicle body: a chamfered box on bogies, built along +z.
function hull(kind, withPlough) {
  const len = LENS[kind], loco = kind === 'loco', cab = kind === 'loco-b';
  const h = loco || cab ? 3.4 : kind === 'box' ? 4.4 : kind === 'hopper' ? 3.2 : 3.7;
  const ch = loco || cab ? 0.55 : kind === 'box' ? 0.4 : 0.8, x = 1.65, y0 = 1.1, y1 = y0 + h;
  const shape = new THREE.Shape([[-x + 0.2, y0], [x - 0.2, y0], [x, y0 + 0.2], [x, y1 - ch], [x - ch, y1], [-x + ch, y1], [-x, y1 - ch], [-x, y0 + 0.2]].map(([a, b]) => new THREE.Vector2(a, b)));
  let g = new THREE.ExtrudeGeometry(shape, { depth: len, steps: loco ? 24 : 1, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  if (loco) {
    // The nose rakes down to a wedge over its last 6.5 m.
    const p = g.attributes.position, zN = len / 2 - 6.5;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      if (z <= zN) continue;
      const t = (z - zN) / 6.5, y = p.getY(i);
      if (y > 2.2) p.setY(i, 2.2 + (y - 2.2) * (1 - 0.72 * t));
      p.setX(i, p.getX(i) * (1 - 0.08 * t));
    }
    g.computeVertexNormals();
  }
  if (kind === 'hopper') {
    // The hopper ends slope in by 1.5 m at the top.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      if (Math.abs(z) < len / 2 - 1e-3) continue;
      p.setZ(i, Math.sign(z) * (len / 2 - 1.5 * (p.getY(i) - y0) / h));
    }
    g.computeVertexNormals();
  }
  const bits = [attrs(g, BODY, loco || cab ? 1 : 0)];
  for (const z of [-len / 2 + 3.6, len / 2 - 3.6]) bits.push(attrs(new THREE.BoxGeometry(2.7, 1.0, 3.2).translate(0, 0.55, z), DARK, 0));
  // A low roof block breaks the long top line.
  const rl = len * (loco ? 0.45 : 0.8);
  bits.push(attrs(new THREE.BoxGeometry(2.0, 0.35, rl).translate(0, y1 + 0.17, loco ? -len * 0.18 : 0), DARK, 0));
  if (withPlough) bits.push(attrs(plough(len), STEEL, 0));
  return top(mergeGeometries(bits));
}

// consist lists vehicle kinds from the nose; gap is the coupling space.
export function makeTrain({ consist, gap = 1.0, plough: withPlough = false }) {
  const cache = new Map(), parts = [];
  let o = 0;
  consist.forEach((kind, i) => {
    const len = LENS[kind], key = kind + (withPlough && i === 0 ? '+plough' : '');
    if (!cache.has(key)) cache.set(key, hull(kind, withPlough && i === 0));
    parts.push({ kind, len, geo: cache.get(key), off: o + len / 2 });
    o += len + gap;
  });
  const span = o - gap;
  // path(s, side) gives { x, z, yaw } at track place s, side metres across.
  function lay(s, dir, path, cb) {
    parts.forEach((p, i) => {
      const c = path(s - dir * p.off);
      cb(i, c.x, c.z, c.yaw + (dir < 0 ? Math.PI : 0));
    });
  }
  // Plan places of the head centre, the head pair and the tail pair.
  function lamps(s, dir, path) {
    const xz = c => ({ x: c.x, z: c.z });
    return {
      head: xz(path(s + dir * 0.2)),
      heads: [xz(path(s + dir * 0.15, -0.9)), xz(path(s + dir * 0.15, 0.9))],
      tails: [xz(path(s - dir * (span + 0.1), -0.9)), xz(path(s - dir * (span + 0.1), 0.9))],
    };
  }
  return { parts, span, lay, lamps };
}
