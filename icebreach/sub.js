// Ice breach sub: the Akula from Buoy Business (havoc lab/ocean/assets/akula.glb).
// Frame: x along the hull, bow at +x; y up from the hull axis; z to starboard.
// The load follows havoc's src/view/aqua/life.js: bow to +x, 110 m long, the black core on the axis.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/** Measures of the loaded hull, in metres in the sub frame. */
export const SUB = { R: 6.75, crown: 6.75, roof: 11, sailX: 0, sailW: 2, sailTop: 11, mastTop: 13 };

// The top heightfield: the highest hull point over each x, z cell.
const HX0 = -70, HX1 = 50, HZ = 9, HC = 0.25;
const HNX = Math.round((HX1 - HX0) / HC), HNZ = Math.round((2 * HZ) / HC);
const top = new Float32Array(HNX * HNZ).fill(-99);

function bake(root) {
  const pos = [], mast = [];
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) {
      const tri = a.slice(i, i + 9);
      // Masts reach over the sail roof; they retract on their own.
      const hy = Math.max(tri[1], tri[4], tri[7]), cx = (tri[0] + tri[3] + tri[6]) / 3;
      (hy > SUB.roof + 0.3 && Math.abs(cx - SUB.sailX) < 30 ? mast : pos).push(...tri);
    }
    g.dispose();
  });
  // Creased normals: soft over the low-poly facets, hard at real edges.
  const geo = arr => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return toCreasedNormals(g, Math.PI / 4.5);
  };
  return { hull: geo(pos), masts: geo(mast) };
}

// Rasterises each triangle's points into the top heightfield.
function fillTop(geo) {
  const a = geo.attributes.position.array, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i < a.length; i += 9) {
    A.fromArray(a, i); B.fromArray(a, i + 3); C.fromArray(a, i + 6);
    const n = Math.min(60, Math.ceil(Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A)) / (HC * 0.7)));
    for (let u = 0; u <= n; u++) for (let w = 0; w <= n - u; w++) {
      const s = u / n, t = w / n, r = 1 - s - t;
      const x = A.x * r + B.x * s + C.x * t, y = A.y * r + B.y * s + C.y * t, z = A.z * r + B.z * s + C.z * t;
      const ix = Math.floor((x - HX0) / HC), iz = Math.floor((z + HZ) / HC);
      if (ix < 0 || iz < 0 || ix >= HNX || iz >= HNZ) continue;
      const k = iz * HNX + ix;
      if (y > top[k]) top[k] = y;
    }
  }
}

/** Loads the Akula; returns the hull and mast geometry in the sub frame. */
export async function loadSub(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const propNode = root.getObjectByName('prop');
  // The bow faces away from the prop; turn it to +x.
  root.rotation.y = Math.PI / 2;
  root.updateMatrixWorld(true);
  if (propNode && new THREE.Vector3().setFromMatrixPosition(propNode.matrixWorld).x > 0) { root.rotation.y = -Math.PI / 2; root.updateMatrixWorld(true); }
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  const k = 110 / size.x;
  // The black core, the one untextured part, marks the hull axis and radius.
  let core = null;
  root.traverse(o => { if (o.isMesh && !o.material.map) core = o; });
  const cb = new THREE.Box3().setFromObject(core), cc = cb.getCenter(new THREE.Vector3());
  root.scale.multiplyScalar(k);
  root.position.set(-cc.x * k, -cc.y * k, -cc.z * k);
  root.updateMatrixWorld(true);
  SUB.R = ((cb.max.z - cb.min.z) / 2 / 0.85) * k;
  // The sail: hull points that stand well above the hull, near the middle.
  const v = new THREE.Vector3(), sail = [];
  let crown = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld);
      if (v.y > SUB.R * 1.2 && Math.abs(v.x) < 40) sail.push(v.clone());
      if (Math.abs(v.z) < 1 && v.y < SUB.R * 1.15) crown = Math.max(crown, v.y);
    }
  });
  sail.sort((a, b) => a.y - b.y);
  SUB.crown = crown || SUB.R;
  SUB.sailX = sail.reduce((s, p) => s + p.x, 0) / sail.length;
  // The roof: the first gap in the sail's heights; only masts stand above it.
  const sy = sail.map(p => p.y);
  const gap = sy.findIndex((y, i) => i + 1 < sy.length && y > SUB.R * 1.5 && sy[i + 1] - y > 0.6);
  SUB.roof = (gap >= 0 ? sy[gap] : sy[Math.floor(sy.length * 0.8)]) + 0.1;
  SUB.sailTop = SUB.roof;
  SUB.mastTop = sy[sy.length - 1];
  SUB.sailW = Math.max(...sail.filter(p => p.y < SUB.roof - 1).map(p => Math.abs(p.z)));
  const g = bake(root);
  fillTop(g.hull);
  root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); } });
  return g;
}

function topAt(x, z) {
  const fx = (x - HX0) / HC - 0.5, fz = (z + HZ) / HC - 0.5;
  const ix = Math.floor(fx), iz = Math.floor(fz);
  if (ix < 0 || iz < 0 || ix >= HNX - 1 || iz >= HNZ - 1) return -99;
  const tx = fx - ix, tz = fz - iz, k = iz * HNX + ix;
  const a = top[k], b = top[k + 1], c = top[k + HNX], d = top[k + HNX + 1];
  // A cell at the hull's edge with an empty neighbour takes the nearest full one.
  if (a < -90 || b < -90 || c < -90 || d < -90) {
    const m = Math.max(a, b, c, d);
    return m > -90 && Math.min(tx, 1 - tx, tz, 1 - tz) > 0.35 ? m : -99;
  }
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

/**
 * Signed distance from the hull's top surface, with the outward normal.
 * p is in the sub frame. Writes n; returns the distance (negative inside).
 */
export function subSDF(px, py, pz, n) {
  const h = topAt(px, pz);
  if (h < -90 || py < h - 4) { n.set(0, 1, 0); return 99; }
  const e = 0.3;
  const gx = (topAt(px + e, pz) - topAt(px - e, pz)) / (2 * e), gz = (topAt(px, pz + e) - topAt(px, pz - e)) / (2 * e);
  // A cliff off the edge of the field reads as a steep wall.
  const sx = Math.max(-40, Math.min(40, gx)), sz = Math.max(-40, Math.min(40, gz));
  n.set(-sx, 1, -sz).normalize();
  return (py - h) * n.y;
}
