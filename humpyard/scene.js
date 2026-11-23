// Hump yard scene: three.js 0.170. Night, fog, floodlight masts in sodium light.
// The tracks, the hump bank, sleepers and rails are built once from the yard.
// Wagons are instanced per type; sparks are additive points.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GAUGE, TRACKS, MASTER, GROUP, BUFFER_Z, FAN_END, heightAt, poseAt, distAtZ } from './yard.js';
import { TYPES, LOCO_LEN } from './sim.js';

export const MAX_WAGONS = 64;
const MAX_SPARKS = 900;
// One hue per sorting track, round the wheel.
export const TRACK_HUE = Array.from({ length: TRACKS }, (_, k) => new THREE.Color().setHSL((k / TRACKS + 0.02) % 1, 0.85, 0.55));

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// A box with a flat vertex colour, placed at its centre.
function box(w, h, d, x, y, z, shade = 1) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  return tint(g, shade);
}
function cyl(r, len, x, y, z, axis = 'z', shade = 1, seg = 18) {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1).toNonIndexed();
  if (axis === 'z') g.rotateX(Math.PI / 2); else if (axis === 'x') g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, shade);
}
function tint(g, shade) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(shade);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.deleteAttribute('uv');
  return g;
}

// The running gear under every wagon: frame, two bogies, wheels, buffers.
function underframe(len, extra = []) {
  const parts = [box(2.7, 0.32, len, 0, 1.12, 0, 0.14)];
  for (const s of [-1, 1]) {
    const bz = s * (len / 2 - 2.4);
    parts.push(box(2.3, 0.5, 2.7, 0, 0.62, bz, 0.07));
    for (const w of [-0.9, 0.9]) parts.push(cyl(0.46, 0.14, -0.72, 0.46, bz + w, 'x', 0.1, 14), cyl(0.46, 0.14, 0.72, 0.46, bz + w, 'x', 0.1, 14));
    for (const x of [-0.88, 0.88]) parts.push(cyl(0.2, 0.5, x, 1.12, s * (len / 2 + 0.2), 'z', 0.2, 10));
  }
  return mergeGeometries([...parts, ...extra]);
}
// Wagon geometry along +z, centred; white parts take the instance colour.
function wagonGeometry(type) {
  const L = type.len;
  if (type.id === 'van') {
    const body = [box(2.94, 2.7, L - 0.5, 0, 2.65, 0, 1)];
    // Ribs down the sides and a pale curved roof.
    for (let k = -3; k <= 3; k++) body.push(box(3.02, 2.6, 0.16, 0, 2.65, k * (L - 1) / 7, 0.8));
    body.push(cyl(1.6, L - 0.6, 0, 3.32, 0, 'z', 0.55, 24).scale(0.94, 0.42, 1).translate(0, 2.25, 0));
    return underframe(L, body);
  }
  if (type.id === 'hopper') {
    const body = [box(2.9, 1.7, L - 0.8, 0, 2.55, 0, 1), box(2.3, 1.0, L - 2.2, 0, 1.55, 0, 0.85)];
    for (let k = -2; k <= 2; k++) body.push(box(2.98, 1.8, 0.14, 0, 2.55, k * (L - 1.4) / 5, 0.75));
    // An open top: a dark load inside the rim.
    body.push(box(2.6, 0.08, L - 1.2, 0, 3.38, 0, 0.05));
    return underframe(L, body);
  }
  if (type.id === 'tank') {
    const body = [cyl(1.42, L - 1.4, 0, 2.75, 0, 'z', 1, 24), box(1.0, 0.3, 1.0, 0, 4.25, 0, 0.6), box(0.9, 0.06, L - 2, 0, 4.2, 0, 0.2)];
    for (const s of [-1, 1]) body.push(cyl(1.42, 0.3, 0, 2.75, s * (L / 2 - 0.7), 'z', 0.8, 24));
    return underframe(L, body);
  }
  // A flat with one long box container.
  const body = [box(2.6, 0.2, L - 0.2, 0, 1.38, 0, 0.18), box(2.44, 2.59, 12.19, 0, 2.78, -1.2, 1)];
  for (let k = -5; k <= 5; k++) body.push(box(2.5, 2.5, 0.08, 0, 2.78, -1.2 + k * 1.1, 0.82));
  return underframe(L, body);
}
function locoGeometry() {
  const L = LOCO_LEN;
  const hood = [box(2.1, 2.2, 8.4, 0, 2.4, -2.4, 1), box(2.9, 2.9, 3.2, 0, 2.75, 3.6, 1), box(2.9, 0.18, 3.4, 0, 4.25, 3.6, 0.3)];
  // Cab windows: dark bands.
  hood.push(box(2.96, 0.8, 2.8, 0, 3.4, 3.6, 0.04));
  // Stripes of hazard paint on the ends.
  hood.push(box(2.92, 0.5, 0.1, 0, 1.6, -L / 2 + 0.15, 0.2), box(2.92, 0.5, 0.1, 0, 1.6, L / 2 - 0.15, 0.2));
  return underframe(L, hood);
}

// A smooth strip that follows a segment: across, a list of [offset, height above the rail] pairs.
function strip(seg, across, { from = 0, to = seg.len, step = 1, ground = null } = {}) {
  const pos = [], idx = [], P = new Float32Array(6);
  const m = across.length;
  let rows = 0;
  for (let d = from; d <= to + 1e-6; d += step) {
    poseAt(seg, Math.min(d, to), P);
    const nx = -P[5], nz = P[3], nl = Math.hypot(nx, nz) || 1;
    for (const [o, h] of across) {
      const y = ground && h === 'g' ? 0 : P[1] + h;
      pos.push(P[0] + nx / nl * o, y, P[2] + nz / nl * o);
    }
    rows++;
  }
  for (let r = 0; r + 1 < rows; r++) for (let j = 0; j + 1 < m; j++) {
    const a = r * m + j, b = a + 1, c = a + m, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Ballast: speckled stone in a small canvas, tiled.
function ballastTexture(rand, base) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 5200; k++) {
    const v = 40 + Math.floor(rand() * 80);
    x.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
    x.globalAlpha = 0.35 + rand() * 0.5;
    x.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2.5, 1 + rand() * 2.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A soft round glow for lamp heads.
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildScene(yard, { shadows = true } = {}) {
  const rand = rng(52);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060b);
  scene.fog = new THREE.FogExp2(0x070910, 0.0034);
  const disposables = [];
  const keep = (...xs) => { disposables.push(...xs); return xs[0]; };

  // Moonlight and the sky's dim blue from above.
  scene.add(new THREE.HemisphereLight(0x3a4a70, 0x0c0a08, 0.55));
  const moon = new THREE.DirectionalLight(0x8090c0, 0.18);
  moon.position.set(-80, 120, 60);
  scene.add(moon);

  // The ground: dark cinder and weeds, far wider than the view.
  const groundTex = keep(ballastTexture(rand, '#22201c'));
  groundTex.repeat.set(90, 110);
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1200, 1500)), keep(new THREE.MeshStandardMaterial({ color: 0x24221e, map: groundTex, roughness: 1 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, -260);
  ground.receiveShadow = true;
  scene.add(ground);

  // The bank and the ballast bed under every segment.
  const bedTex = keep(ballastTexture(rand, '#4a4640'));
  bedTex.repeat.set(1, 1);
  const bedMat = keep(new THREE.MeshStandardMaterial({ color: 0x8a8378, map: bedTex, roughness: 0.95 }));
  const beds = [];
  for (const s of yard.segs) {
    const far = s.track != null ? distAtZ(s, BUFFER_Z - 12) : s.len;
    const g = strip(s, [[-5.5, 'g'], [-2.1, -0.32], [2.1, -0.32], [5.5, 'g']], { to: far, step: 2, ground: true });
    // The bed's world texture coordinates, so the stone tiles evenly.
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 3.2; uv[i * 2 + 1] = p.getZ(i) / 3.2; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    beds.push(g);
  }
  const bed = new THREE.Mesh(keep(mergeGeometries(beds)), bedMat);
  bed.receiveShadow = true;
  scene.add(bed);
  beds.forEach(g => g.dispose());

  // Sleepers: concrete, every 0.65 m.
  const sleeperPts = [], P = new Float32Array(6);
  for (const s of yard.segs) {
    const far = s.track != null ? distAtZ(s, BUFFER_Z - 4) : s.len;
    for (let d = 0.3; d < far; d += 0.65) { poseAt(s, d, P); sleeperPts.push([P[0], P[1], P[2], Math.atan2(P[3], P[5])]); }
  }
  const sleepers = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(2.6, 0.16, 0.27)), keep(new THREE.MeshStandardMaterial({ color: 0x6d6a64, roughness: 0.9 })), sleeperPts.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
  sleeperPts.forEach(([x, y, z, yaw], i) => { Q.setFromAxisAngle(UP, yaw); M.compose(V.set(x, y - 0.24, z), Q, S1); sleepers.setMatrixAt(i, M); });
  sleepers.receiveShadow = true;
  scene.add(sleepers);

  // Rails: one mesh per segment, so a set route can glow.
  const railMat = () => keep(new THREE.MeshStandardMaterial({ color: 0x8d8f94, metalness: 0.85, roughness: 0.32, emissive: 0xffa040, emissiveIntensity: 0 }));
  const rails = yard.segs.map(s => {
    const far = s.track != null ? distAtZ(s, BUFFER_Z - 2) : s.len;
    const parts = [];
    for (const side of [-1, 1]) {
      const o = side * GAUGE / 2;
      parts.push(strip(s, [[o - 0.04, -0.15], [o - 0.036, 0], [o + 0.036, 0], [o + 0.04, -0.15]], { to: far, step: 1 }));
    }
    const m = new THREE.Mesh(keep(mergeGeometries(parts)), railMat());
    parts.forEach(g => g.dispose());
    m.castShadow = false;
    scene.add(m);
    return m;
  });

  // Retarders: heavy beams along both rails, yellow-capped.
  const retParts = [];
  const retarder = (s, z0, z1) => {
    const a = distAtZ(s, z0), b = distAtZ(s, z1);
    for (const o of [-0.9, -0.55, 0.55, 0.9]) retParts.push(strip(s, [[o - 0.09, -0.2], [o - 0.09, 0.12], [o + 0.09, 0.12], [o + 0.09, -0.2]], { from: a, to: b, step: 1 }));
  };
  retarder(yard.lead, MASTER[0], MASTER[1]);
  for (const l of yard.leaves) retarder(l, GROUP[0], GROUP[1]);
  const ret = new THREE.Mesh(keep(mergeGeometries(retParts)), keep(new THREE.MeshStandardMaterial({ color: 0x9a7a20, metalness: 0.5, roughness: 0.55 })));
  retParts.forEach(g => g.dispose());
  scene.add(ret);

  // Buffer stops: a steel frame and a red lamp at the far end of each track.
  const bufParts = [];
  for (const l of yard.leaves) {
    poseAt(l, distAtZ(l, BUFFER_Z), P);
    bufParts.push(box(2.4, 0.5, 0.5, P[0], P[1] + 1.0, P[2], 1), box(0.3, 1.2, 2.0, P[0] - 0.8, P[1] + 0.5, P[2] - 1, 1), box(0.3, 1.2, 2.0, P[0] + 0.8, P[1] + 0.5, P[2] - 1, 1));
  }
  const bufs = new THREE.Mesh(keep(mergeGeometries(bufParts)), keep(new THREE.MeshStandardMaterial({ color: 0x7a1d14, roughness: 0.7, vertexColors: true })));
  bufParts.forEach(g => g.dispose());
  scene.add(bufs);

  // Lamps: small bright spheres with a glow sprite each.
  const glowTex = keep(glowTexture());
  const lampGeo = keep(new THREE.SphereGeometry(0.16, 10, 8));
  function lamp(x, y, z, color, k = 1, size = 2.2) {
    const mat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(4 * k), toneMapped: false }));
    const m = new THREE.Mesh(lampGeo, mat);
    m.position.set(x, y, z);
    const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(color).multiplyScalar(k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true })));
    sp.scale.setScalar(size);
    m.add(sp);
    scene.add(m);
    return { mesh: m, sprite: sp, set(c, kk = 1) { mat.color.set(c).multiplyScalar(4 * kk); sp.material.color.set(c).multiplyScalar(kk); } };
  }
  for (const l of yard.leaves) { poseAt(l, distAtZ(l, BUFFER_Z), P); lamp(P[0], P[1] + 1.5, P[2] + 0.3, 0xff2010, 0.8, 1.6); }

  // Each sorting track's head: a post with its hue, so cuts show where they belong.
  const heads = yard.leaves.map((l, k) => {
    poseAt(l, distAtZ(l, FAN_END - 4), P);
    const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6)), keep(new THREE.MeshStandardMaterial({ color: 0x333333 })));
    post.position.set(P[0] + 2.3, P[1] + 1.1, P[2]);
    scene.add(post);
    return lamp(P[0] + 2.3, P[1] + 2.3, P[2], TRACK_HUE[k], 0.7, 2.4);
  });

  // Switch lamps: one per switch, white toward the branch it is set for.
  const swLamps = yard.switches.map(sw => {
    const y = heightAt(sw.z);
    return [lamp(sw.x - 1.9, y + 0.6, sw.z + 3, 0xffffff, 0.2, 1.4), lamp(sw.x + 1.9, y + 0.6, sw.z + 3, 0xffffff, 0.2, 1.4)];
  });

  // The hump signal at the crest, beside the lead.
  const sigPost = new THREE.Mesh(keep(new THREE.BoxGeometry(0.25, 6, 0.25)), keep(new THREE.MeshStandardMaterial({ color: 0x2a2a2a })));
  sigPost.position.set(-3.4, heightAt(4) + 3, 4);
  scene.add(sigPost);
  const signal = lamp(-3.4, heightAt(4) + 6.1, 4, 0x30ff70, 1, 3.5);

  // Floodlight masts in sodium light; the first one throws shadows over the hump.
  const masts = [[-30, -30], [28, -120], [-30, -215], [30, -300], [-78, 20]];
  const spots = [];
  masts.forEach(([x, z], i) => {
    const H = 30;
    const pole = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.35, 0.55, H, 8)), keep(new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6 })));
    pole.position.set(x, H / 2, z);
    scene.add(pole);
    const head = new THREE.Mesh(keep(new THREE.BoxGeometry(5, 1.4, 1.2)), keep(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb060, emissiveIntensity: 3 })));
    head.position.set(x, H + 0.4, z);
    head.lookAt(x * 0.2, 0, z - 30);
    scene.add(head);
    const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0xffb070).multiplyScalar(0.9), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    glow.scale.setScalar(10);
    glow.position.set(x, H + 0.4, z);
    scene.add(glow);
    const sp = new THREE.SpotLight(0xffb468, 3200, 240, 0.9, 0.7, 1.6);
    sp.position.set(x, H, z);
    sp.target.position.set(x * 0.15, 0, z - 40);
    if (i === 0 && shadows) {
      sp.castShadow = true;
      sp.shadow.mapSize.set(2048, 2048);
      sp.shadow.camera.near = 8; sp.shadow.camera.far = 160;
      sp.shadow.bias = -0.0004;
      sp.shadow.normalBias = 0.04;
    }
    scene.add(sp, sp.target);
    spots.push(sp);
  });

  // Wagons: one instanced mesh per type, white parts take each wagon's paint.
  const wagonMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.25 }));
  const fleets = TYPES.map(ty => {
    const m = new THREE.InstancedMesh(keep(wagonGeometry(ty)), wagonMat, MAX_WAGONS);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WAGONS * 3), 3);
    m.count = 0;
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });
  const loco = new THREE.Mesh(keep(locoGeometry()), keep(new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xe0a020, roughness: 0.5, metalness: 0.2 })));
  loco.castShadow = true;
  loco.visible = false;
  scene.add(loco);
  const locoLamps = [lamp(0, 0, 0, 0xfff0d0, 1.2, 3), lamp(0, 0, 0, 0xfff0d0, 1.2, 3)];
  // Destination plates on each wagon's back end, lit in the track's hue.
  const plates = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1.1, 0.7)), keep(new THREE.MeshBasicMaterial({ toneMapped: false })), MAX_WAGONS);
  plates.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WAGONS * 3), 3);
  plates.count = 0;
  plates.frustumCulled = false;
  scene.add(plates);

  // Sparks: additive points, each with a life.
  const sparkGeo = keep(new THREE.BufferGeometry());
  const sp = new Float32Array(MAX_SPARKS * 3), sl = new Float32Array(MAX_SPARKS);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute('life', new THREE.BufferAttribute(sl, 1));
  const sparkMat = keep(new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 1 } },
    vertexShader: `attribute float life; uniform float uPx; varying float vL;
      void main() { vL = life; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (2.0 + 7.0 * life) * 40.0 / -mv.z; }`,
    fragmentShader: `varying float vL;
      void main() { vec2 q = gl_PointCoord - 0.5; float d = dot(q, q); if (d > 0.25 || vL <= 0.0) discard;
        vec3 c = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.85, 0.55), vL);
        gl_FragColor = vec4(c * 6.0 * vL * (1.0 - d * 4.0), 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  // A flicker of orange where the master retarder grips.
  const gripLight = new THREE.PointLight(0xff7a30, 0, 26, 1.8);
  gripLight.position.set(0, heightAt(-24) + 0.6, -24);
  scene.add(gripLight);

  return {
    scene, fleets, loco, locoLamps, plates, sparks, sparkMat, sp, sl, rails, heads, swLamps, signal, gripLight, spots,
    dispose() {
      for (const d of disposables) d.dispose?.();
      scene.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    },
  };
}
