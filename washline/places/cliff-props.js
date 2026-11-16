// Cliff props: textured turf and cliff, the dry-stone wall, posts and pulleys,
// grass and sea pinks in the wind, the far headlands and the lighthouse.
// Every material gets the fog sea and the air from cliff-air.js.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { col } from './kit.js';
import { airify } from './cliff-air.js';
import { grass } from './cliff-grass.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const TEX = new URL('../tex/', import.meta.url).href;
const loader = new THREE.TextureLoader();

// A CC0 set: colour, normal, and AO with roughness packed in one map.
function pbr(name, channel, extra) {
  const t = (k) => {
    const x = loader.load(`${TEX}${name}_${k}.jpg`);
    x.wrapS = x.wrapT = THREE.RepeatWrapping;
    x.anisotropy = 8;
    x.channel = channel;
    return x;
  };
  const map = t('diff'), arm = t('arm');
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, normalMap: t('nor'), roughnessMap: arm, aoMap: arm, roughness: 1, ...extra });
}

// Triangles that face up get turf; steep ones get rock.
// UV channel 0 maps the turf from above, channel 1 the rock from the side.
function splitByslope(g, upY, turfK, rockK) {
  const p = g.attributes.position, n = p.count;
  const uv = new Float32Array(n * 2), uv1 = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    uv[i * 2] = x / turfK; uv[i * 2 + 1] = z / turfK;
    uv1[i * 2] = (x + 0.6 * z) / rockK; uv1[i * 2 + 1] = y / rockK;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  g.computeVertexNormals();
  const idx = g.index.array, nr = g.attributes.normal, turf = [], rock = [];
  for (let t = 0; t < idx.length; t += 3) {
    const ny = (nr.getY(idx[t]) + nr.getY(idx[t + 1]) + nr.getY(idx[t + 2])) / 3;
    (ny > upY ? turf : rock).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  g.setIndex(new THREE.BufferAttribute(new Uint32Array([...turf, ...rock]), 1));
  g.clearGroups();
  g.addGroup(0, turf.length, 0);
  g.addGroup(turf.length, rock.length, 1);
  return g;
}

// Grass and flowers bend with the wind; the bend grows toward the tip.
// Low sun shines through the blades and lights them from behind.
function windify(mat, key) {
  const w = { uWind: { value: new THREE.Vector3() }, uTrans: { value: new THREE.Vector3() } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, w);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT; uniform vec3 uWind; varying float vTip;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float k = clamp(position.y, 0.0, 1.0);
          k *= k;
          vTip = k;
          vec3 ip = instanceMatrix[3].xyz;
          float hgt = length(instanceMatrix[1].xyz);
          // Gusts roll across the turf; a fast flutter rides on them.
          float g = 0.55 + 0.45 * sin(uT * 1.3 - ip.z * 0.35 + ip.x * 0.2) * sin(uT * 0.47 + ip.x * 0.11);
          g += 0.12 * sin(uT * 7.0 + ip.x * 3.1 + ip.z * 2.3);
          vec3 lw = inverse(mat3(instanceMatrix)) * (uWind * g * hgt);
          transformed += lw * k;
          transformed.y -= length(lw) * k * 0.35;
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTrans; varying float vTip;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.45 + 0.55 * sqrt(max(vTip, 0.0));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uTrans * vTip * diffuseColor.rgb;');
  };
  mat.customProgramCacheKey = () => key;
  return w;
}

// One instanced mesh from a list of {p, s, r, c}.
function instance(group, geo, mat, items, cast = true) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  items.forEach((it, i) => {
    q.setFromEuler(e.set(...it.r));
    m.setMatrixAt(i, mx.compose(p.set(...it.p), q, s.set(...it.s)));
    if (it.c) m.setColorAt(i, it.c);
  });
  m.castShadow = cast;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

/* ---------- the headland under the eye ---------- */
export function terrain(group, u, heightAt, aoAt) {
  const g = new THREE.PlaneGeometry(160, 120, 320, 240);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i) - 30;
    p.setY(i, heightAt(x, z));
    p.setZ(i, z);
  }
  // Baked shade where the turf meets the wall and the posts.
  const shade = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = aoAt(p.getX(i), p.getZ(i)); shade.set([k, k, k], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(shade, 3));
  splitByslope(g, 0.6, 2.2, 7);
  const turf = airify(pbr('grass_ground', 0, { color: col([0.78, 0.07, 135]), vertexColors: true }), u);
  const rock = airify(pbr('seaside_rock', 1, { color: col([0.82, 0.01, 250]), vertexColors: true }), u);
  const land = new THREE.Mesh(g, [turf, rock]);
  land.receiveShadow = true;
  group.add(land);
  return { turf, rock };
}

/* ---------- the dry-stone wall ---------- */
// Three stone shapes: a jittered ball pushed toward a box.
function stoneGeos(R) {
  return [0, 1, 2].map(() => {
    let g = new THREE.IcosahedronGeometry(0.5, 2);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      // Push each axis out toward the box, then roughen the surface.
      const box = (a) => Math.sign(a) * Math.pow(Math.abs(a) * 2, 0.45) / 2;
      v.set(box(v.x), box(v.y), box(v.z)).multiplyScalar(0.9 + 0.16 * R());
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    g = g.toNonIndexed();
    // Box UVs: each face takes the two axes it does not face.
    const q = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(q.count * 2);
    for (let t = 0; t < q.count; t += 3) {
      const nx = Math.abs(n.getX(t) + n.getX(t + 1) + n.getX(t + 2));
      const ny = Math.abs(n.getY(t) + n.getY(t + 1) + n.getY(t + 2));
      const nz = Math.abs(n.getZ(t) + n.getZ(t + 1) + n.getZ(t + 2));
      for (let k = t; k < t + 3; k++) {
        const [a, b] = nx > ny && nx > nz ? [q.getZ(k), q.getY(k)] : ny > nz ? [q.getX(k), q.getZ(k)] : [q.getX(k), q.getY(k)];
        uv[k * 2] = a * 0.7 + 0.37 * t; uv[k * 2 + 1] = b * 0.7;
      }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  });
}

export function wall(group, u, R, heightAt, { from, to }) {
  const dx = to[0] - from[0], dz = to[1] - from[1], L = Math.hypot(dx, dz);
  const ux = dx / L, uz = dz / L, nx = -uz, nz = ux, yaw = Math.atan2(-uz, ux);
  const geos = stoneGeos(R), lists = [[], [], []];
  const tint = () => col([0.86 + 0.12 * R(), 0.012, 230 + 40 * R()]);
  const at = (s, off) => [from[0] + ux * s + nx * off, from[1] + uz * s + nz * off];
  // Courses of face stones on both sides; the wall leans in as it rises.
  let y = 0;
  for (let k = 0; y < 0.92; k++) {
    const ch = 0.13 + 0.07 * R() - k * 0.008;
    const half = 0.38 - 0.13 * (y / 0.95);
    for (const side of [-1, 1]) {
      let s = (k % 2) * 0.18 * R();
      while (s < L) {
        const len = 0.24 + 0.3 * R();
        const dep = 0.2 + 0.1 * R();
        const [x, z] = at(s + len / 2, side * (half - dep / 2));
        lists[Math.floor(R() * 3)].push({
          p: [x, heightAt(x, z) + y + ch / 2, z],
          s: [len * 1.04, ch * 1.12, dep],
          r: [(R() - 0.5) * 0.12, yaw + (R() - 0.5) * 0.14, side * 0.12 + (R() - 0.5) * 0.1],
          // The lowest courses sit in the grass and get less sky.
          c: tint().multiplyScalar(0.62 + 0.38 * Math.min(1, y / 0.45)),
        });
        s += len;
      }
    }
    // Hearting fills the gap between the two faces.
    for (let s = 0; s < L; s += 0.5) {
      const [x, z] = at(s + 0.25, 0);
      lists[Math.floor(R() * 3)].push({ p: [x, heightAt(x, z) + y + ch / 2, z], s: [0.5, ch, half * 1.2], r: [0, yaw, 0], c: tint() });
    }
    y += ch;
  }
  // Coping: slabs stood on edge across the top.
  for (let s = 0.05; s < L;) {
    const th = 0.07 + 0.07 * R();
    const [x, z] = at(s + th / 2, 0);
    const h = 0.26 + 0.12 * R();
    lists[Math.floor(R() * 3)].push({
      p: [x, heightAt(x, z) + y + h / 2 - 0.04, z],
      s: [th, h, 0.46 + 0.1 * R()],
      r: [(R() - 0.5) * 0.08, yaw + (R() - 0.5) * 0.08, (R() - 0.5) * 0.22],
      c: tint(),
    });
    s += th + 0.005;
  }
  // The scan is dark; the wall stone is a paler grey.
  const mat = airify(pbr('lichen_rock', 0, { color: new THREE.Color(3.4, 3.4, 3.5), aoMapIntensity: 0.6 }), u);
  geos.forEach((g, i) => instance(group, g, mat, lists[i]));
  return mat;
}

/* ---------- posts, pulley blocks and the gate ---------- */
function postGeo(R, h, r0, r1) {
  let g = new THREE.CylinderGeometry(r0, r1, h, 9, 8);
  const p = g.attributes.position, uv = g.attributes.uv;
  // A split-wood post: uneven around, and a little warped along its length.
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)), y = p.getY(i);
    const k = 1 + 0.07 * Math.sin(a * 3 + 1.3) + 0.04 * Math.sin(a * 5 + y * 2) + 0.03 * (R() - 0.5);
    p.setX(i, p.getX(i) * k + 0.012 * Math.sin(y * 1.7));
    p.setZ(i, p.getZ(i) * k);
    uv.setXY(i, uv.getX(i) * 0.55, uv.getY(i) * h * 0.9);
  }
  g.computeVertexNormals();
  return g;
}

// A sawn square post: slightly out of true, its corners worn round.
function squarePostGeo(R, h, w) {
  const g = new THREE.BoxGeometry(w, h, w, 3, 12, 3);
  const p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // Corners pull in a little, so the edges read as worn.
    const corner = Math.abs(x) > w * 0.45 && Math.abs(z) > w * 0.45 ? 0.88 : 1;
    p.setXYZ(i, x * corner + 0.01 * Math.sin(y * 1.3), y, z * corner + 0.006 * Math.sin(y * 2.1 + 1));
    // Side faces run the grain up the post.
    if (Math.abs(n.getY(i)) < 0.5) uv.setXY(i, uv.getX(i) * w * 3, uv.getY(i) * h * 0.8);
  }
  g.computeVertexNormals();
  return g;
}

// A pulley block: a grooved wheel between two cheek plates, on a strap to the post.
// The wheel's rim ring comes from cloth.js; this adds its body.
function pulleyBlock(group, steel, galv, c, toPost) {
  const at = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(c[0] + x, c[1] + y, c[2] + z);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  const disc = new THREE.CylinderGeometry(0.056, 0.056, 0.014, 28).rotateX(Math.PI / 2);
  at(disc, galv, 0, 0, 0);
  at(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 12).rotateX(Math.PI / 2), steel, 0, 0, 0);
  // The cheeks are taller than the wheel and meet at the top.
  for (const z of [-0.016, 0.016]) at(new THREE.BoxGeometry(0.05, 0.15, 0.005), steel, 0, 0.03, z);
  at(new THREE.BoxGeometry(0.05, 0.012, 0.04), steel, 0, 0.108, 0);
  // A flat strap runs from the block's top to a bolt in the post.
  const len = Math.abs(toPost);
  at(new THREE.BoxGeometry(len, 0.03, 0.008), steel, toPost / 2, 0.1, 0);
  at(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8).rotateZ(Math.PI / 2), galv, toPost, 0.1, 0);
}

export function posts(group, u, R, { a, b }, gate) {
  const wood = airify(pbr('rough_wood', 0, { color: col([0.86, 0.012, 80]) }), u);
  const steel = airify(new THREE.MeshStandardMaterial({ color: col([0.34, 0.01, 60]), roughness: 0.6, metalness: 0.6 }), u);
  const galv = airify(new THREE.MeshStandardMaterial({ color: col([0.72, 0.008, 240]), roughness: 0.35, metalness: 0.85 }), u);
  const add = (geo, mat, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.z = rz;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };
  // The near post is sawn and square; the far one is an old split fence post.
  const hA = a[1] + 0.4, hB = b[1] + 0.32, wA = 0.11;
  add(squarePostGeo(R, hA, wA), wood, a[0] - 0.13, hA / 2 - 0.02, a[2]);
  add(postGeo(R, hB, 0.075, 0.09), wood, b[0] + 0.12, hB / 2 - 0.02, b[2], -0.06);
  // A sloped tin cap keeps the rain off the near post's end grain.
  add(new THREE.BoxGeometry(0.15, 0.008, 0.15), galv, a[0] - 0.13, hA - 0.015, a[2], 0.12);
  pulleyBlock(group, steel, galv, [a[0], a[1] + 0.065, a[2]], -0.13 + wA / 2);
  pulleyBlock(group, steel, galv, [b[0], b[1] + 0.065, b[2]], 0.12 - 0.06);
  // A five-bar field gate stands open at the wall's far end.
  const gt = new THREE.Group();
  gt.position.set(...gate.p); gt.rotation.y = gate.ry;
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  for (const x of [-1.3, 1.3]) { const m = new THREE.Mesh(box(0.09, 1.15, 0.09), wood); m.position.set(x, 0, 0); gt.add(m); }
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(box(2.6, 0.075, 0.035), wood); m.position.set(0, -0.45 + i * 0.24, 0); gt.add(m); }
  const brace = new THREE.Mesh(box(2.75, 0.07, 0.03), wood);
  brace.rotation.z = Math.atan2(0.95, 2.6); brace.position.z = 0.03; gt.add(brace);
  gt.traverse(o => { o.castShadow = o.receiveShadow = true; });
  group.add(gt);
  return wood;
}

/* ---------- grass and sea pinks ---------- */
// The grass lives in cliff-grass.js.
// A thrift flower: a thin stem and a round pink head, in vertex colours.
function pinkGeo() {
  const stem = new THREE.CylinderGeometry(0.02, 0.025, 1, 4, 1, true).translate(0, 0.5, 0).toNonIndexed();
  const head = new THREE.IcosahedronGeometry(0.16, 1).scale(1, 0.8, 1).translate(0, 1, 0);
  head.deleteAttribute('uv'); stem.deleteAttribute('uv');
  const parts = [[stem, col([0.48, 0.07, 135])], [head, col([0.74, 0.12, 350])]];
  const pos = [], nrm = [], cl = [];
  for (const [g, c] of parts) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      cl.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  return g;
}

export function meadow(group, u, R, heightAt, edgeZ, wallAt, aoAt) {
  const gw = grass(group, u, R, { heightAt, edgeZ, wallAt, aoAt });

  // Thrift clumps crowd the lip and the foot of the wall.
  const heads = [], cushions = [];
  const clump = (x, z) => {
    const y = heightAt(x, z);
    cushions.push({ p: [x, y, z], s: [0.14 + 0.1 * R(), 0.06, 0.14 + 0.1 * R()], r: [0, R() * 6, 0], c: col([0.4, 0.06, 140]) });
    for (let k = 0, n = 5 + Math.floor(R() * 10); k < n; k++) {
      const hx = x + (R() - 0.5) * 0.22, hz = z + (R() - 0.5) * 0.22, h = 0.1 + 0.12 * R();
      heads.push({ p: [hx, heightAt(hx, hz), hz], s: [0.16, h, 0.16], r: [(R() - 0.5) * 0.3, R() * 6, (R() - 0.5) * 0.3], c: col([0.85 + 0.15 * R(), 0.02, 350]) });
    }
  };
  for (let i = 0; i < 150; i++) { const x = (R() - 0.5) * 34; clump(x, edgeZ(x) + 0.5 + 4 * R() * R()); }
  for (let i = 0; i < 60; i++) { const x = -2.6 - 11 * R(); clump(x, -0.9 + (x + 2.5) * -0.34 + 0.55 + 0.3 * R()); }
  const pm = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8 });
  const pw = windify(pm, 'cliff-pinks');
  airify(pm, u);
  instance(group, pinkGeo(), pm, heads, false);
  const cg = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  instance(group, cg, airify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), u), cushions, false);
  return [gw, pw];
}

/* ---------- far headlands ---------- */
// A flat-topped headland with sea cliffs, on a noisy outline.
// Returns the mesh and its height above the sea at a local point.
export function headland(group, mats, R, { x, z, w, d, h, sea, seg = [220, 140] }) {
  const s1 = R() * 10, s2 = R() * 10, s3 = R() * 10;
  const hAt = (lx, lz) => {
    const a = Math.atan2(lz / d, lx / w), r = Math.hypot(lx / w, lz / d);
    // A ragged outline: coves, points and small bites out of the cliff.
    const edge = 1 + 0.13 * Math.sin(3 * a + s1) + 0.07 * Math.sin(7 * a + s2) + 0.035 * Math.sin(15 * a + s3)
      + 0.018 * Math.sin(31 * a + s2) + 0.01 * Math.sin(57 * a + s1);
    const q = r / edge;
    const top = h * (0.8 + 0.2 * (1 - q * q)) + h * 0.05 * Math.sin(lx / 37 + s1) * Math.sin(lz / 29 + s2)
      + h * 0.02 * Math.sin(lx / 9 + s3) * Math.sin(lz / 11);
    // Sheer faces fall straight to the sea.
    return -6 + (top + 6) * sm(1.0, 0.975, q);
  };
  const g = new THREE.PlaneGeometry(w * 2.6, d * 2.6, ...seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, hAt(p.getX(i), p.getZ(i)));
  // The turf and rock materials read a shade colour; out here it is plain white.
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3).fill(1), 3));
  splitByslope(g, 0.55, 14, 22);
  const m = new THREE.Mesh(g, mats);
  m.position.set(x, sea, z);
  group.add(m);
  return (wx, wz) => sea + hAt(wx - x, wz - z);
}

/* ---------- the lighthouse ---------- */
// A white tapered tower, a gallery, the lantern and a dark red cap.
export function lighthouse(group, u, base, at) {
  const paint = (c, extra = {}) => airify(new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.7, ...extra }), u);
  const prof = [[5.8, 0], [5.6, 1.5], [4.6, 20], [4.3, 27]].map(([r, y]) => new THREE.Vector2(r, y));
  const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(at[0], base + y, at[1]); group.add(m); return m; };
  add(new THREE.LatheGeometry(prof, 24), paint([0.93, 0.01, 90]), 0);
  add(new THREE.CylinderGeometry(5.6, 5.6, 0.7, 24), paint([0.25, 0.01, 60]), 27.3);
  add(new THREE.TorusGeometry(5.5, 0.09, 4, 32).rotateX(Math.PI / 2), paint([0.25, 0.01, 60]), 28.5);
  const lantern = add(new THREE.CylinderGeometry(3.2, 3.2, 4, 16), paint([0.2, 0.01, 60], { emissive: col([0.9, 0.1, 85]), emissiveIntensity: 2 }), 29.7);
  add(new THREE.SphereGeometry(3.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint([0.36, 0.12, 25]), 31.6);
  // A black band at the gallery foot makes the tower read from far off.
  add(new THREE.CylinderGeometry(4.36, 4.45, 2.2, 24, 1, true), paint([0.2, 0.01, 60]), 25.6);
  // The keeper's cottage sits beside the tower, toward the land.
  add(new THREE.BoxGeometry(16, 5.5, 7), paint([0.9, 0.01, 90]), 2.6).position.x += 15;
  const roof = add(new THREE.CylinderGeometry(4.6, 4.6, 16.4, 3), paint([0.32, 0.03, 40]), 6.4);
  roof.position.x += 15; roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.85);
  return lantern;
}
