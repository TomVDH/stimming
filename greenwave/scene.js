// Green wave scene: three.js 0.170. A wet avenue at night, lit windows on both sides.
// Light carries it: signals, street lamps and tail lights, each doubled on the wet road
// as a long streak toward the camera.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANES, LANE_W, CROSSINGS, SPACING, Z0, Z_IN, Z_OUT, CROSS_W, MAX_CARS, MAX_SIDE, stopZ } from './sim.js';

const HALF = LANES * LANE_W / 2;
const WALK = 4.5;
// A parking lane and a row of trees' worth of room before the buildings.
const SETBACK = 9;
export const MAX_STREAKS = (MAX_CARS + MAX_SIDE) * 2 + CROSSINGS * LANES + 200;
const PAINT = [0x6a6c70, 0x1a1b1e, 0xb8b9bb, 0x1d2c4a, 0x6a1410, 0x24382c, 0x5a4e3a, 0x2a4660, 0x3a3a3e].map(c => new THREE.Color(c));

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// A facade sheet: 16 x 16 window bays, about half lit, mostly warm.
function facadeTextures(rand) {
  const n = 16, px = 32;
  const make = () => { const c = document.createElement('canvas'); c.width = c.height = n * px; return c; };
  const base = make(), glow = make();
  const b = base.getContext('2d'), g = glow.getContext('2d');
  b.fillStyle = '#1b1c1f'; b.fillRect(0, 0, n * px, n * px);
  g.fillStyle = '#000'; g.fillRect(0, 0, n * px, n * px);
  for (let y = 0; y < n; y++) {
    // A floor slab between storeys.
    b.fillStyle = '#26272a'; b.fillRect(0, y * px, n * px, 3);
    // Some floors are offices, lit end to end; others are homes, lit here and there.
    const office = rand() < 0.18, share = office ? 0.9 : 0.42;
    for (let x = 0; x < n; x++) {
      const X = x * px + 7, Y = y * px + 8, W = px - 14, H = px - 13;
      b.fillStyle = '#0a0b0d'; b.fillRect(X, Y, W, H);
      if (rand() > share) continue;
      const warm = office ? rand() < 0.2 : rand() < 0.82;
      const k = 0.4 + rand() * 0.6;
      g.fillStyle = warm ? `rgba(255,${185 + rand() * 45 | 0},${105 + rand() * 50 | 0},${k})` : `rgba(${185 + rand() * 40 | 0},215,255,${k * 0.85})`;
      g.fillRect(X, Y, W, H);
      if (rand() < 0.35) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(X, Y, W, H * (0.2 + rand() * 0.5)); }
    }
  }
  const tex = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  return { map: tex(base), glow: tex(glow) };
}

// Buildings along one side: boxes with world-scaled window coordinates.
function buildings(rand, side) {
  const parts = [];
  const x0 = side * (HALF + WALK + SETBACK);
  for (let i = -1; i < CROSSINGS + 2; i++) {
    const za = i === -1 ? Z_IN + 80 : stopZ(i) - CROSS_W - 2, zb = i >= CROSSINGS ? Z_OUT - 400 : stopZ(i + 1) + 4;
    let z = za;
    while (z > zb + 8) {
      const w = Math.min(z - zb, 14 + rand() * 26), d = 18 + rand() * 10, h = 10 + rand() * 12 + rand() * rand() * 30;
      const g = new THREE.BoxGeometry(d, h, w - 0.6);
      const uv = g.attributes.uv, pos = g.attributes.position;
      for (let v = 0; v < uv.count; v++) {
        const face = Math.floor(v / 4);
        // Faces 2 and 3 are the roof and the floor: they map to one dark bay corner.
        if (face === 2 || face === 3) { uv.setXY(v, 0.01, 0.01); continue; }
        const along = face < 2 ? pos.getZ(v) : pos.getX(v);
        uv.setXY(v, (along + z) / 2.6 / 16, (pos.getY(v) + h / 2) / 3.2 / 16);
      }
      g.translate(x0 + side * d / 2, h / 2, z - w / 2);
      parts.push(g);
      z -= w;
    }
  }
  return mergeGeometries(parts);
}

// Flat additive light on the road: a long streak or a round pool, per instance colour.
function decals(max, round) {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  // The near edge of a streak sits at the light; it runs out toward +z.
  if (!round) g.translate(0, 0, 0.5);
  const m = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; varying vec3 vC; varying float vD;
      void main() { vUv = uv; vC = instanceColor; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: round
      ? `varying vec2 vUv; varying vec3 vC; varying float vD;
        void main() { float r = length(vUv - 0.5) * 2.0; float a = exp(-r * r * 3.2) * smoothstep(1.0, 0.7, r); gl_FragColor = vec4(vC * a * exp(-vD * 0.0012), 1.0); }`
      : `varying vec2 vUv; varying vec3 vC; varying float vD;
        void main() { float across = clamp(1.0 - abs(vUv.x - 0.5) * 2.0, 0.0, 1.0); float along = clamp(vUv.y, 0.0, 1.0);
          float a = pow(across, 1.6) * pow(along, 1.4) * smoothstep(0.0, 0.08, 1.0 - along);
          gl_FragColor = vec4(vC * a * exp(-vD * 0.0012), 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  const mesh = new THREE.InstancedMesh(g, m, max);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return mesh;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// A car body along +z: lower body, glasshouse, dark wheels.
function carGeometry() {
  const tint = (g, k) => { const n = g.attributes.position.count; g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(k), 3)); g.deleteAttribute('uv'); return g; };
  const parts = [
    tint(new THREE.BoxGeometry(1.8, 0.7, 4.4).toNonIndexed().translate(0, 0.62, 0), 1),
    tint(new THREE.BoxGeometry(1.6, 0.55, 2.3).toNonIndexed().translate(0, 1.22, -0.15), 0.12),
    tint(new THREE.BoxGeometry(1.62, 0.06, 2.0).toNonIndexed().translate(0, 1.51, -0.15), 1),
  ];
  for (const z of [-1.4, 1.4]) parts.push(tint(new THREE.BoxGeometry(1.86, 0.6, 0.7).toNonIndexed().translate(0, 0.32, z), 0.05));
  return mergeGeometries(parts);
}

export function buildScene() {
  const rand = rng(375);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.FogExp2(0x0a0d16, 0.0016);
  scene.add(new THREE.HemisphereLight(0x34425e, 0x0a0806, 0.5));
  const moon = new THREE.DirectionalLight(0x7e8cb8, 0.25);
  moon.position.set(-60, 120, 80);
  scene.add(moon);

  // The road: dark and wet, a broad sheen from the sky.
  const road = new THREE.Mesh(new THREE.PlaneGeometry((HALF + WALK + SETBACK) * 2 + 2, Z_IN - Z_OUT + 900), new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.22, metalness: 0.2 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, (Z_IN + Z_OUT) / 2 - 200);
  scene.add(road);
  // Side streets across at each crossing, and the pavements.
  const flats = [];
  for (let i = 0; i < CROSSINGS; i++) flats.push(new THREE.BoxGeometry(400, 0.02, CROSS_W).translate(0, -0.01, stopZ(i) - CROSS_W / 2 - 2));
  const streets = new THREE.Mesh(mergeGeometries(flats), road.material);
  scene.add(streets);
  const walks = [];
  for (const s of [-1, 1]) for (let i = -1; i < CROSSINGS; i++) {
    const za = i === -1 ? Z_IN + 300 : stopZ(i) - CROSS_W - 2, zb = i === CROSSINGS - 1 ? Z_OUT - 400 : stopZ(i + 1) + 2;
    walks.push(new THREE.BoxGeometry(WALK, 0.16, za - zb).translate(s * (HALF + WALK / 2), 0.08, (za + zb) / 2));
  }
  scene.add(new THREE.Mesh(mergeGeometries(walks), new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.6 })));

  // Paint: lane dashes, stop lines, zebra crossings.
  const paint = [];
  for (let l = 1; l < LANES; l++) {
    const x = -HALF + l * LANE_W;
    for (let z = Z_IN + 200; z > Z_OUT - 300; z -= 12) {
      if ([...Array(CROSSINGS).keys()].some(i => z < stopZ(i) + 6 && z > stopZ(i) - CROSS_W - 4)) continue;
      paint.push(new THREE.BoxGeometry(0.15, 0.02, 3).translate(x, 0.012, z));
    }
  }
  for (let i = 0; i < CROSSINGS; i++) {
    paint.push(new THREE.BoxGeometry(HALF * 2, 0.02, 0.45).translate(0, 0.012, stopZ(i) + 0.3));
    for (let k = 0; k < 9; k++) paint.push(new THREE.BoxGeometry(0.6, 0.02, 3.2).translate(-HALF + 0.5 + k * HALF * 2 / 8.6, 0.012, stopZ(i) - 2.2));
  }
  scene.add(new THREE.Mesh(mergeGeometries(paint), new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.5 })));

  // City blocks with lit windows.
  const fac = facadeTextures(rand);
  const facMat = new THREE.MeshStandardMaterial({ map: fac.map, emissiveMap: fac.glow, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.8 });
  scene.add(new THREE.Mesh(buildings(rand, -1), facMat), new THREE.Mesh(buildings(rand, 1), facMat));

  const glowTex = glowTexture();
  const glowMat = c => new THREE.SpriteMaterial({ map: glowTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true });
  const streaks = decals(MAX_STREAKS, false), pools = decals(400, true);
  scene.add(streaks, pools);
  const still = [];
  // Street lamps on both kerbs, every 40 m, white LED.
  const poleGeo = [], lampSprites = [];
  for (const s of [-1, 1]) for (let z = Z_IN + 40; z > Z_OUT - 200; z -= 40) {
    const x = s * (HALF + 0.8);
    poleGeo.push(new THREE.CylinderGeometry(0.1, 0.14, 9, 6).translate(x, 4.5, z), new THREE.BoxGeometry(2.4, 0.12, 0.3).translate(x - s * 1.1, 9, z));
    const sp = new THREE.Sprite(glowMat(new THREE.Color(0xdde6ff).multiplyScalar(0.55)));
    sp.scale.setScalar(1.5);
    sp.position.set(x - s * 2.1, 8.9, z);
    scene.add(sp);
    lampSprites.push(sp);
    still.push({ pool: true, x: x - s * 2.4, z, w: 9, c: new THREE.Color(0.09, 0.09, 0.1) });
    still.push({ x: x - s * 2.1, z, w: 1.1, len: 34, c: new THREE.Color(0.32, 0.35, 0.42) });
  }
  scene.add(new THREE.Mesh(mergeGeometries(poleGeo), new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5 })));

  // Signals: a mast arm over the avenue at each crossing, one head per lane, facing the traffic.
  const heads = [];
  const armGeo = [];
  const housing = new THREE.BoxGeometry(0.42, 1.25, 0.32);
  const lampGeo = new THREE.CircleGeometry(0.13, 14);
  const signals = [];
  for (let i = 0; i < CROSSINGS; i++) {
    const z = stopZ(i) - CROSS_W - 2.5, xp = HALF + 1.4;
    armGeo.push(new THREE.CylinderGeometry(0.16, 0.2, 7.2, 8).translate(xp, 3.6, z), new THREE.BoxGeometry(xp + HALF - 1, 0.18, 0.18).translate((xp - HALF + 1) / 2, 6.9, z));
    const mats = [0xff2a10, 0xffa000, 0x30ff80].map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    const sig = { i, mats, sprites: [], lamps: [] };
    for (let l = 0; l < LANES; l++) {
      const x = -HALF + (l + 0.5) * LANE_W;
      const h = new THREE.Mesh(housing, new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 }));
      h.position.set(x, 6.15, z + 0.1);
      scene.add(h);
      [0.38, 0, -0.38].forEach((dy, k) => {
        const m = new THREE.Mesh(lampGeo, mats[k]);
        m.position.set(x, 6.15 + dy, z + 0.27);
        scene.add(m);
        sig.lamps.push(m);
      });
      const sp = new THREE.Sprite(glowMat(new THREE.Color(1, 1, 1)));
      sp.scale.setScalar(2.6);
      sp.position.set(x, 6.15, z + 0.4);
      scene.add(sp);
      sig.sprites.push(sp);
      heads.push({ i, x, z });
    }
    signals.push(sig);
  }
  scene.add(new THREE.Mesh(mergeGeometries(armGeo), new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.5 })));

  // Cars: instanced bodies; lamps are small bright quads on the back.
  const cars = new THREE.InstancedMesh(carGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.4 }), MAX_CARS + MAX_SIDE);
  cars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array((MAX_CARS + MAX_SIDE) * 3), 3);
  cars.count = 0;
  cars.frustumCulled = false;
  scene.add(cars);
  const lampQuad = new THREE.PlaneGeometry(0.34, 0.16);
  const tails = new THREE.InstancedMesh(lampQuad, new THREE.MeshBasicMaterial({ toneMapped: false }), (MAX_CARS + MAX_SIDE) * 2);
  tails.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array((MAX_CARS + MAX_SIDE) * 6), 3);
  tails.count = 0;
  tails.frustumCulled = false;
  scene.add(tails);

  return { scene, cars, tails, streaks, pools, still, signals, PAINT, HALF };
}
