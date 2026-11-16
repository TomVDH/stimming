// Terrarium garden: moss, ferns, stones and wood on three.js.
// It draws into a picture on the toy's own WebGL context; the jar shader reads it through the glass.
// It draws only when something changes. One unit is about 20 cm.
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

/* ---------- small tools ---------- */
// A seeded random, so every load grows the same garden.
function seeded(s) {
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.03 + 5, y * 2.03) * 0.3 + vnoise(x * 4.1 + 9, y * 4.1) * 0.2;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- the bed: sloped back to front, with two mounds ---------- */
const BED_R = 0.585, SLAB = 0.07, DRAIN = 0.15, CHAR = 0.175;
// Height of the soil top. The back stands higher than the front, as in a built terrarium.
export const bedH = (x, z) => 0.26 - 0.09 * (z / 0.55) + 0.06 * Math.exp(-(((x + 0.22) ** 2 + (z + 0.12) ** 2)) * 14) + 0.045 * Math.exp(-(((x - 0.26) ** 2 + (z - 0.12) ** 2)) * 20) + 0.01 * (fbm(x * 9, z * 9) - 0.5);
// Cushion moss sits on the two mounds.
const cushion = (x, z) => Math.max(Math.exp(-(((x + 0.22) ** 2 + (z + 0.12) ** 2)) * 18), Math.exp(-(((x - 0.26) ** 2 + (z - 0.12) ** 2)) * 26));
// Fern crowns: [x, z, reach, base fronds, extra fronds with growth, start yaw].
const CROWNS = [[-0.12, -0.12, 0.24, 4, 4, 0.3], [0.0, -0.33, 0.2, 3, 3, 1.4], [-0.32, 0.22, 0.13, 2, 3, 2.2]];
// Which crowns each planting shows: Fern, Moss, Bog.
const SHOWN = [[0, 1, 2], [2], []];
const PAIRS = 24, SEGS = 18;

/**
 * Builds the garden on an existing WebGL2 context.
 * @param {HTMLCanvasElement} canvas
 * @param {WebGL2RenderingContext} gl
 * @param {{ fov: number, eye: (asp: number) => number[], aim: number[], lamp: number[] }} view
 */
export function createGarden(canvas, gl, view) {
  const rnd = seeded(7);
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 0);
  // Variance shadows take a blur radius, so the grow light casts soft shadows.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate = true;
  RectAreaLightUniformsLib.init();
  // The picture: linear light with alpha for cover, four samples for clean edges.
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.05, 40);
  const LAMP = new THREE.Vector3(...view.lamp);
  // The cone reaches the front of the bed; its edge falls on the glass.
  const spot = new THREE.SpotLight(0xffffff, 14, 0, 0.95, 1, 2);
  spot.position.copy(LAMP);
  spot.target.position.set(0, 0.3, 0.05);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0002;
  spot.shadow.normalBias = 0.008;
  spot.shadow.radius = 14;
  spot.shadow.blurSamples = 16;
  const rect = new THREE.RectAreaLight(0xffffff, 18, 1.4, 0.08);
  rect.position.copy(LAMP);
  rect.lookAt(0, 0.3, 0);
  // The room's soft light from the viewer's side keeps the front of the bed readable.
  const fill = new THREE.DirectionalLight(0xdfe8d8, 0.35);
  fill.position.set(0.3, 1.2, 3);
  scene.add(spot, spot.target, rect, fill, new THREE.HemisphereLight(0x2b4636, 0x040604, 0.9));

  // Wet caps and leaves reflect a small dark room: the lamp bar and two soft panels.
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x020403);
    const glow = c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.08), glow(new THREE.Color(8, 7.4, 6.8)));
    b.position.copy(LAMP); b.rotation.x = Math.PI / 2;
    env.add(b);
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.0), glow(new THREE.Color(0.35, 0.38, 0.36)));
      p.position.set(sx * 2.6, 1.2, 1.6); p.rotation.y = -sx * Math.PI / 2;
      env.add(p);
    }
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.02).texture;
    pm.dispose();
  }

  /* ---------- substrate: drainage stones, charcoal, soil ---------- */
  function scatter(geo, mat, n, y0, y1, rIn, size, colour) {
    const m = new THREE.InstancedMesh(geo, mat, n), o = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rIn * rIn + rnd() * (BED_R * BED_R - rIn * rIn)) - size * 0.6;
      o.position.set(Math.cos(a) * r, y0 + rnd() * (y1 - y0), Math.sin(a) * r);
      o.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      const s = size * (0.6 + rnd() * 0.6);
      o.scale.set(s * (0.8 + rnd() * 0.5), s * (0.6 + rnd() * 0.4), s * (0.8 + rnd() * 0.5));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, colour(c));
    }
    m.receiveShadow = true;
    return m;
  }
  scene.add(scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 2400, SLAB + 0.012, DRAIN, 0.4, 0.02,
    c => c.setHSL(0.08 + rnd() * 0.05, 0.12 + rnd() * 0.1, 0.12 + rnd() * 0.22)));
  scene.add(scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 1500, DRAIN + 0.004, CHAR, 0.42, 0.012,
    c => c.setHSL(0.1, 0.05, 0.02 + rnd() * 0.03)));
  // The soil: a sloped top on a polar grid, and a wall at the glass.
  const soil = (() => {
    const rings = 80, segs = 220, pos = [], col = [], idx = [], c = new THREE.Color();
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
      const r = BED_R * i / rings, a = j / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, bedH(x, z), z);
      c.setHSL(0.07, 0.45, 0.035 + 0.03 * fbm(x * 30, z * 30));
      col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    m.receiveShadow = true;
    return m;
  })();
  const wallG = new THREE.CylinderGeometry(BED_R, BED_R, 1, 220, 1, true);
  {
    const p = wallG.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) > 0 ? bedH(x, z) : CHAR); }
    wallG.computeVertexNormals();
  }
  scene.add(soil, new THREE.Mesh(wallG, new THREE.MeshStandardMaterial({ color: 0x150c06, roughness: 1 })));

  /* ---------- hardscape: a craggy stone and a branch ---------- */
  const rockG = new THREE.IcosahedronGeometry(1, 5);
  {
    const p = rockG.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      v.multiplyScalar(1 + 0.28 * (fbm(v.x * 2.2 + v.y, v.z * 2.2 - v.y) - 0.5) + 0.1 * (vnoise(v.x * 9 + v.z, v.y * 9) - 0.5));
      // Flat strata planes make the stone craggy.
      v.y = Math.round(v.y * 7) / 7 * 0.35 + v.y * 0.65;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    rockG.computeVertexNormals();
  }
  const rock = new THREE.Mesh(rockG, new THREE.MeshStandardMaterial({ color: 0x4a4d48, roughness: 0.9 }));
  rock.scale.set(0.15, 0.13, 0.12);
  rock.position.set(0.2, bedH(0.2, -0.24) + 0.05, -0.24);
  rock.rotation.y = 0.6;
  rock.castShadow = rock.receiveShadow = true;
  const branchCurve = new THREE.CatmullRomCurve3([[-0.56, 0, 0.12], [-0.42, 0.04, 0.08], [-0.28, 0.1, 0.0], [-0.16, 0.17, -0.06], [-0.08, 0.2, -0.04]].map(([x, dy, z]) => new THREE.Vector3(x, bedH(x, z) + dy - 0.01, z)));
  const branch = new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 60, 0.018, 10), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.95 }));
  branch.castShadow = branch.receiveShadow = true;
  scene.add(rock, branch);
  scene.updateMatrixWorld(true);

  /* ---------- moss: instanced strands ---------- */
  // uLift raises the cushions; uBog turns the moss to red-gold sphagnum.
  // uCover is the share of strands that grow: moss creeps as the jar grows.
  const U = { uWake: { value: 0 }, uLift: { value: 0 }, uBog: { value: 0 }, uCover: { value: 0.6 }, uLampCol: { value: new THREE.Color(1.2, 1.1, 1.0) }, uLampDirV: { value: new THREE.Vector3() } };
  // One moss shoot, height 1: a thin stem and nine small leaves round it in a spiral.
  // A leaf's place comes from its attributes, so the shader can fold it.
  // aShoot: kind (0 stem, 1 leaf), height on the stem, turn round it, length.
  // aLeaf: place along the leaf (0 base, 1 tip), then side (-1 to 1).
  const strandG = (() => {
    const pos = [], shoot = [], leaf = [], idx = [];
    const vert = (x, y, z, k, h, phi, L, l, sd) => { pos.push(x, y, z); shoot.push(k, h, phi, L); leaf.push(l, sd); return pos.length / 3 - 1; };
    // The stem: two crossed thin cards.
    for (const plane of [0, 1]) {
      const v = [];
      for (let r = 0; r < 3; r++) {
        const t = r / 2, w = 0.06 * (1 - 0.5 * t);
        v.push(plane ? vert(-w, t, 0, 0, t, 0, 0, t, 0) : vert(0, t, -w, 0, t, 0, 0, t, 0));
        v.push(plane ? vert(w, t, 0, 0, t, 0, 0, t, 0) : vert(0, t, w, 0, t, 0, 0, t, 0));
      }
      for (let r = 0; r < 2; r++) { const a = v[r * 2], b = v[r * 2 + 1], c = v[r * 2 + 2], d = v[r * 2 + 3]; idx.push(a, b, c, b, d, c); }
    }
    // The leaves: a diamond each, longest low on the stem, small at the tip.
    const N = 9;
    for (let i = 0; i < N; i++) {
      const h = 0.12 + 0.86 * i / (N - 1), phi = i * 2.39996, L = 0.62 * (1 - 0.55 * h);
      const a = vert(0, h, 0, 1, h, phi, L, 0, 0), b = vert(0, h, 0, 1, h, phi, L, 0.45, -1);
      const c = vert(0, h, 0, 1, h, phi, L, 1, 0), d = vert(0, h, 0, 1, h, phi, L, 0.45, 1);
      idx.push(a, b, c, a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setAttribute('aShoot', new THREE.Float32BufferAttribute(shoot, 4));
    g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(leaf, 2));
    g.setIndex(idx);
    return g;
  })();
  // PBR moss: sheen gives the velvet glow at grazing angles; clearcoat is the wet film.
  const mossMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.75, side: THREE.DoubleSide, envMapIntensity: 0.1,
    sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.16, 0.34, 0.06), clearcoat: 0.03, clearcoatRoughness: 0.4,
  });
  mossMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        uniform float uWake, uLift, uCover;
        attribute vec2 aMoss, aLeaf;
        attribute vec4 aShoot;
        varying float vT, vTip, vLeaf;`)
      .replace('#include <beginnormal_vertex>', `
        // Dry moss presses its leaves to the stem; wet moss spreads them wide.
        float mh = aShoot.y, phi = aShoot.z, mL = aShoot.w;
        vec3 md = vec3(cos(phi), 0.0, sin(phi)), mw = vec3(-sin(phi), 0.0, cos(phi));
        float th = mix(0.2, 1.05, uWake) * (1.0 - 0.3 * mh);
        vec3 lv = vec3(0.0, cos(th), 0.0) + md * sin(th);
        vec3 mossPos = aShoot.x < 0.5 ? position : vec3(0.0, mh, 0.0) + lv * mL * aLeaf.x + mw * aLeaf.y * 0.2 * mL * mix(0.55, 1.0, uWake);
        vec3 ln = normalize(cross(mw, lv));
        if (ln.y < 0.0) ln = -ln;
        // Leaves keep some of the carpet's soft upward light.
        vec3 objectNormal = aShoot.x < 0.5 ? vec3(0.0, 1.0, 0.0) : normalize(mix(vec3(0.0, 1.0, 0.0), ln, 0.3));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = mossPos;
        float t = mossPos.y, hs = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
        // A shoot ranked past the cover has not grown yet.
        transformed *= step(aMoss.x, uCover);
        // Cushion shoots stand taller in the Moss planting.
        transformed.y *= 1.0 + uLift * aMoss.y;
        // Dry shoots slump a little; each leans its own way.
        transformed.y *= mix(0.85, 1.0, uWake);
        transformed.x += (hs - 0.5) * 2.4 * t * t * (1.3 - 0.4 * uWake);
        vT = t;
        vTip = aShoot.x * aLeaf.x;
        vLeaf = aShoot.x;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uWake, uBog;
        uniform vec3 uLampCol, uLampDirV;
        varying float vT, vTip, vLeaf;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Leaf tips are paler and fresher; the stem is darker and warmer.
        diffuseColor.rgb *= mix(vec3(0.55, 0.45, 0.3), vec3(1.0 + 0.2 * vTip), vLeaf);
        // Sphagnum: green at the heart, flushed red and pink at the tips.
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.ggg * vec3(0.6, 0.9, 0.35), diffuseColor.ggg * vec3(1.5, 0.45, 0.4), smoothstep(0.3, 0.9, vT)), uBog);
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1));
        diffuseColor.rgb = mix(mix(vec3(lum), diffuseColor.rgb, 0.5) * vec3(0.9, 0.85, 0.42), diffuseColor.rgb, uWake);
        // The shoot's base sits in the shade of its neighbours.
        diffuseColor.rgb *= mix(0.25, 1.0, vT);
        // Wet moss is fuller and brighter.
        diffuseColor.rgb *= 1.0 + 0.2 * uWake;`)
      // Wet leaf tips hold a film of water and shine.
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.85, 0.4, uWake * vTip);')
      .replace('#include <opaque_fragment>', `
        // The grow light glows through the thin leaves from behind.
        float mb = pow(max(dot(normalize(-vViewPosition), uLampDirV), 0.0), 3.0);
        outgoingLight += diffuseColor.rgb * vec3(1.0, 1.2, 0.5) * uLampCol * mb * vLeaf * vT * (0.25 + 0.4 * uWake);
        // A leaf smaller than a pixel must not flare: its light has a ceiling.
        outgoingLight = min(outgoingLight, vec3(0.9));
        #include <opaque_fragment>`);
  };
  const MOSS_N = 120000;
  const moss = (() => {
    const m = new THREE.InstancedMesh(strandG, mossMat, MOSS_N), o = new THREE.Object3D(), c = new THREE.Color();
    // Per strand: x its growth rank, y its cushion share.
    const rank = new Float32Array(MOSS_N * 2);
    const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
    const sources = [
      { mesh: soil, share: 0.86, test: () => true },
      { mesh: rock, share: 0.1, test: (p, n) => n.y > 0.45 },
      { mesh: branch, share: 0.04, test: (p, n) => n.y > 0.6 },
    ].map(s => ({ ...s, sampler: new MeshSurfaceSampler(s.mesh).build(), nm: new THREE.Matrix3().getNormalMatrix(s.mesh.matrixWorld) }));
    let i = 0, tries = 0;
    while (i < MOSS_N && tries < MOSS_N * 20) {
      tries++;
      const r = rnd(), s = r < sources[0].share ? sources[0] : r < sources[0].share + sources[1].share ? sources[1] : sources[2];
      s.sampler.sample(pos, nrm);
      pos.applyMatrix4(s.mesh.matrixWorld);
      nrm.applyMatrix3(s.nm).normalize();
      if (!s.test(pos, nrm)) continue;
      const cu = s.mesh === soil ? cushion(pos.x, pos.z) : 0.3;
      // Moss keeps to its patches: a noise map decides where it grows.
      const patch = fbm(pos.x * 5 + 4, pos.z * 5) * 0.7 + vnoise(pos.x * 19, pos.z * 19) * 0.3;
      if (s.mesh === soil && patch < 0.34 - cu * 0.8 && rnd() > 0.04) continue;
      // Moss grows in tufts: a small noise lifts some shoots and sinks the hollows between.
      const tuft = fbm(pos.x * 34 + 7, pos.z * 34), patchC = fbm(pos.x * 7 + 2, pos.z * 7 + 9);
      const h = (cu > 0.35 ? 0.03 + 0.006 * rnd() + 0.015 * cu : 0.014 + 0.006 * rnd()) * (0.6 + 0.8 * tuft);
      const w = 0.0075 + 0.003 * rnd();
      // Cushion strands fan out from the mound's centre, so the cushion reads as a dome.
      if (cu > 0.35) { const cx = pos.x < 0 ? -0.22 : 0.26, cz = pos.x < 0 ? -0.12 : 0.12; nrm.add(new THREE.Vector3((pos.x - cx) * 4, 0.6, (pos.z - cz) * 4)).normalize(); }
      nrm.lerp(up, s.mesh === soil ? 0.2 : 0.5).add(new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).multiplyScalar(0.25)).normalize();
      q.setFromUnitVectors(up, nrm);
      o.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(up, rnd() * Math.PI * 2));
      o.position.copy(pos);
      o.scale.set(w, h, w);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // Two kinds: cushion moss bright and yellow-green, sheet moss darker.
      // Colour comes in patches: fresh yellow-green on the tufts, deep green in the hollows.
      // Each shoot varies only a little, so the carpet reads as a surface, not as grain.
      if (cu > 0.35) c.setHSL(0.215 + 0.04 * patchC + 0.01 * rnd(), 0.72, 0.24 + 0.2 * tuft + 0.03 * rnd());
      else c.setHSL(0.25 + 0.06 * patchC + 0.01 * rnd(), 0.62, 0.15 + 0.16 * tuft + 0.03 * rnd());
      m.setColorAt(i, c);
      // Cushions grow first; sheet moss creeps out from the patches' hearts.
      rank[i * 2] = Math.min(0.999, rnd() * 0.6 + (1 - patch) * 0.4 - cu * 0.5);
      rank[i * 2 + 1] = Math.min(1, cu);
      i++;
    }
    m.count = i;
    strandG.setAttribute('aMoss', new THREE.InstancedBufferAttribute(rank, 2));
    m.receiveShadow = true;
    m.frustumCulled = false;
    return m;
  })();
  scene.add(moss);

  // Spore capsules on red stalks, standing out of the cushions.
  const spores = (() => {
    const n = 90;
    const stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.1, 1, 5, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x8a2a14, roughness: 0.5 }), n);
    const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a12, roughness: 0.35 }), n);
    const o = new THREE.Object3D();
    let k = 0;
    for (let t = 0; t < n * 30 && k < n; t++) {
      const x = (rnd() - 0.5) * 1.1, z = (rnd() - 0.5) * 1.1;
      if (x * x + z * z > 0.25 || cushion(x, z) < 0.5) continue;
      const h = 0.035 + 0.025 * rnd(), lean = (rnd() - 0.5) * 0.5;
      o.position.set(x, bedH(x, z) + 0.02, z);
      o.rotation.set(lean, rnd() * 6, (rnd() - 0.5) * 0.4);
      o.scale.set(0.007, h, 0.007);
      o.updateMatrix();
      stalks.setMatrixAt(k, o.matrix);
      o.position.copy(new THREE.Vector3(0, 1, 0).applyMatrix4(o.matrix));
      o.scale.set(0.004, 0.007, 0.004);
      o.updateMatrix();
      caps.setMatrixAt(k, o.matrix);
      k++;
    }
    stalks.count = caps.count = k;
    stalks.castShadow = caps.castShadow = true;
    const g = new THREE.Group();
    g.add(stalks, caps);
    return g;
  })();
  scene.add(spores);

  /* ---------- ferns: fronds of instanced leaflets on rule-grown rachises ---------- */
  // A leaflet: a lobed blade along +X, lying in the XY plane.
  // A leaflet split into pinnules: lobes along a midrib, longest near the base.
  // u runs base to tip; v runs across, 0.5 on the midrib.
  const LOBES = 9;
  const halfW = x => 0.2 * Math.sin(Math.PI * Math.min(1, x * 1.1)) * (1 - 0.35 * x) + 0.015;
  const lobeAt = i => { const x0 = 0.04 + 0.9 * i / LOBES; return { x0, xt: x0 + 0.62 / LOBES, w: halfW(x0 + 0.3 / LOBES) }; };
  const pinnaG = (() => {
    const s = new THREE.Shape(), top = [];
    for (let i = 0; i < LOBES; i++) {
      const { x0, xt, w } = lobeAt(i);
      // Each lobe: in to the sinus near the midrib, out round its blunt tip.
      top.push([x0, w * 0.32], [x0 + 0.18 / LOBES, w * 0.85], [xt - 0.1 / LOBES, w * 1.02], [xt, w * 0.78], [xt + 0.12 / LOBES, w * 0.4]);
    }
    top.push([0.99, 0.012], [1, 0]);
    s.moveTo(0, 0);
    for (const [x, y] of top) s.lineTo(x, y);
    for (let k = top.length - 2; k >= 0; k--) s.lineTo(top[k][0], -top[k][1]);
    const g = new THREE.ShapeGeometry(s, 4);
    // UVs: u along the leaflet, v across it.
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k), p.getY(k) / 0.46 + 0.5);
    return g;
  })();
  // The leaflet's surface maps, drawn once: colour, normal and roughness.
  // The roughness map's red holds the veins; its blue holds the spore dots.
  const pinnaMaps = (() => {
    const W = 512, H = 256, height = new Float32Array(W * H), vein = new Float32Array(W * H), sori = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, dy = (v - 0.5) * 0.46, ay = Math.abs(dy), k = y * W + x;
      // The midrib: a raised ridge down the middle.
      const mid = Math.exp(-((ay / 0.006) ** 2));
      let lat = 0, dome = 0, dot = 0;
      for (let i = 0; i < LOBES; i++) {
        const { x0, xt, w } = lobeAt(i);
        // A side vein runs from the midrib out to its lobe's tip.
        const ax = x0 + 0.05 / LOBES, bx = xt - 0.06 / LOBES, by = w * 0.9;
        const t = Math.min(1, Math.max(0, ((u - ax) * (bx - ax) + ay * by) / ((bx - ax) ** 2 + by * by)));
        const dd = Math.hypot(u - ax - (bx - ax) * t, ay - by * t);
        lat = Math.max(lat, Math.exp(-((dd / 0.0035) ** 2)) * (1 - 0.6 * t));
        dome = Math.max(dome, Math.exp(-((dd / (0.03 + 0.02 * w * 5)) ** 2)));
        // Spore dots sit in two rows, either side of each side vein.
        for (const f of [0.35, 0.6]) {
          const sx = ax + (bx - ax) * f, sy = by * f;
          for (const o of [-1, 1]) dot = Math.max(dot, Math.exp(-((Math.hypot(u - sx - o * 0.008, ay - sy + o * 0.006) / 0.006) ** 2)));
        }
      }
      vein[k] = Math.max(mid, lat);
      height[k] = 0.6 * mid - 0.5 * lat + 0.5 * dome;
      sori[k] = dot;
    }
    const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const albedo = canvas(), normal = canvas(), rough = canvas();
    const ia = albedo.getContext('2d').createImageData(W, H), inn = normal.getContext('2d').createImageData(W, H), ir = rough.getContext('2d').createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x, o = k * 4, v = y / H, edge = Math.abs(v - 0.5) * 2;
      // Colour: deep green, paler along the veins, a little yellow toward the rim.
      const ve = vein[k], n = vnoise(x * 0.09, y * 0.09) * 0.08;
      ia.data[o] = 255 * Math.min(1, 0.09 + 0.1 * ve + 0.05 * edge + n * 0.3);
      ia.data[o + 1] = 255 * Math.min(1, 0.26 + 0.16 * ve + 0.03 * edge + n);
      ia.data[o + 2] = 255 * Math.min(1, 0.05 + 0.05 * ve);
      ia.data[o + 3] = 255;
      // Normal from the height field's slope, in tangent space.
      const hx = height[y * W + Math.min(W - 1, x + 1)] - height[y * W + Math.max(0, x - 1)];
      const hy = height[Math.min(H - 1, y + 1) * W + x] - height[Math.max(0, y - 1) * W + x];
      const nx = -hx * 3, ny = -hy * 3, l = Math.hypot(nx, ny, 1);
      inn.data[o] = 127.5 * (nx / l + 1); inn.data[o + 1] = 127.5 * (ny / l + 1); inn.data[o + 2] = 127.5 * (1 / l + 1); inn.data[o + 3] = 255;
      // Roughness: the waxy blade is smooth; the veins are rougher.
      ir.data[o] = 255 * ve; ir.data[o + 1] = 255 * (0.52 + 0.2 * ve); ir.data[o + 2] = 255 * sori[k]; ir.data[o + 3] = 255;
    }
    albedo.getContext('2d').putImageData(ia, 0, 0); normal.getContext('2d').putImageData(inn, 0, 0); rough.getContext('2d').putImageData(ir, 0, 0);
    const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; return t; };
    return { map: tex(albedo, true), normalMap: tex(normal, false), roughnessMap: tex(rough, false) };
  })();
  // PBR: colour, normal and roughness maps, a faint sheen of leaf hairs,
  // and a clearcoat that thickens into a water film when wet.
  const frondMat = new THREE.MeshPhysicalMaterial({
    ...pinnaMaps, roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8), side: THREE.DoubleSide,
    // A leaf reflects far less than the default; full strength turns the lamp's glint white.
    specularIntensity: 0.06, specularColor: new THREE.Color(0.85, 1.0, 0.8),
    sheen: 0.12, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.3, 0.45, 0.22), clearcoat: 0.05, clearcoatRoughness: 0.35, envMapIntensity: 0.25,
  });
  frondMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aOld;\nvarying float vOld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOld = aOld;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uLampCol, uLampDirV;\nuniform float uWake;\nvarying float vOld;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 leafMarks = texture2D(roughnessMap, vRoughnessMapUv).rgb;
        // The underside is paler; old fronds carry brown spore dots there.
        if (!gl_FrontFacing) {
          diffuseColor.rgb *= vec3(1.25, 1.3, 1.1);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.11, 0.04), leafMarks.b * smoothstep(0.4, 0.8, vOld));
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (!gl_FrontFacing) roughnessFactor = min(1.0, roughnessFactor + 0.3);')
      .replace('#include <opaque_fragment>', `
        // Light through the leaf from the lamp behind; the veins block some.
        float back = pow(max(dot(normalize(-vViewPosition), uLampDirV), 0.0), 3.0);
        outgoingLight += diffuseColor.rgb * vec3(1.1, 1.25, 0.6) * uLampCol * back * (0.3 + 0.35 * uWake) * (1.0 - 0.55 * leafMarks.r);
        #include <opaque_fragment>`);
  };
  const MAXF = CROWNS.reduce((a, c) => a + c[3] + c[4], 0);
  const pinnae = new THREE.InstancedMesh(pinnaG, frondMat, MAXF * PAIRS * 2);
  const pinnaOld = new THREE.InstancedBufferAttribute(new Float32Array(MAXF * PAIRS * 2), 1);
  pinnaG.setAttribute('aOld', pinnaOld);
  const rachis = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), new THREE.MeshPhysicalMaterial({ color: 0x5a6e2c, roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0.5, 0.6, 0.3) }), MAXF * SEGS);
  pinnae.castShadow = rachis.castShadow = pinnae.receiveShadow = true;
  pinnae.frustumCulled = rachis.frustumCulled = false;
  pinnae.setColorAt(0, new THREE.Color());
  scene.add(pinnae, rachis);
  // The spine in its own plane: up from the crown, over, and curled at the tip when dry.
  function spine(s, R, curl, lift) {
    const span = 2.99 + (5.7 - 2.99) * curl, th = 3.29 - s * span;
    const rad = R * (1 - 0.82 * curl * ss(0.3, 1, s));
    return [R + rad * Math.cos(th), (0.15 * R + rad * Math.sin(th)) * lift];
  }
  function buildFerns() {
    const o = new THREE.Object3D(), c = new THREE.Color(), m = new THREE.Matrix4();
    const P = new THREE.Vector3(), T = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    const { wake, grow, plants } = st;
    let pi = 0, ri = 0;
    for (const ci of SHOWN[plants]) {
      const [cx, cz, R, n0, nx, yaw0] = CROWNS[ci], n = n0 + nx * grow, base = new THREE.Vector3(cx, bedH(cx, cz) - 0.005, cz);
      const sway = st.sway[ci] || 0;
      for (let j = 0; j < 8 && j < n; j++) {
        const young = j / Math.max(n - 1, 1), g = Math.min(1, Math.max(0, n - j));
        const Rj = R * (1.05 - 0.35 * young) * (0.85 + 0.2 * hash2(j, ci)) * (0.35 + 0.65 * g);
        const curl = Math.min(1, Math.max(0, 0.5 + 0.45 * young + 0.5 * (1 - g) - 1.1 * wake));
        const lift = 1.25 + 0.5 * young + 0.2 * wake, yaw = yaw0 + j * 2.39996;
        const out = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)), side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
        // A poke sways the whole fern from its crown.
        const at = s => { const [u, v] = spine(s, Rj, curl, lift); const p = base.clone().addScaledVector(out, u); p.y += v; p.x += sway * v; return p; };
        // The rachis: short cylinder segments along the spine.
        for (let k = 0; k < SEGS; k++) {
          const a = at(k / SEGS), b = at((k + 1) / SEGS), d = b.clone().sub(a), len = d.length();
          o.position.copy(a);
          o.quaternion.setFromUnitVectors(UP, d.normalize());
          const r = 0.0035 * (1 - 0.6 * k / SEGS) * (0.6 + 0.4 * g);
          o.scale.set(r, len, r);
          o.updateMatrix();
          rachis.setMatrixAt(ri++, o.matrix);
        }
        // Leaflets in pairs, longest at mid-frond, sweeping toward the tip.
        for (let k = 0; k < PAIRS; k++) {
          const s = 0.16 + 0.84 * (k + 0.5) / PAIRS;
          P.copy(at(s));
          T.copy(at(Math.min(1, s + 0.01))).sub(at(Math.max(0, s - 0.01))).normalize();
          const L = Math.max(0.002, 0.55 * Rj * Math.pow(Math.max(Math.sin(Math.PI * (s - 0.16) / 0.84), 0), 0.8) * (1 - 0.75 * curl * ss(0.25, 0.9, s)));
          const fold = curl * ss(0.2, 0.9, s);
          for (const sd of [-1, 1]) {
            X.copy(side).multiplyScalar(sd * Math.cos(0.45 + fold)).addScaledVector(T, Math.sin(0.45 + fold)).normalize();
            Z.crossVectors(X, T).normalize();
            if (Z.y < 0) Z.negate();
            Y.crossVectors(Z, X).normalize();
            m.makeBasis(X.clone().multiplyScalar(L), Y.clone().multiplyScalar(L), Z);
            m.setPosition(P);
            pinnae.setMatrixAt(pi, m);
            // Old fronds are deep green; young ones paler; dry ones dull.
            // The maps carry the green; this tints it. Dry fronds dull, young ones pale.
            // Each frond has its own green, a little bluer or yellower than its neighbours.
            const tint = hash2(j + 3, ci + 11) - 0.5;
            c.setRGB((0.8 + 0.2 * wake + 0.15 * young) * (1 + 0.25 * tint), 0.75 + 0.25 * wake + 0.12 * young, (0.55 + 0.35 * wake) * (1 - 0.3 * tint));
            pinnae.setColorAt(pi, c);
            pinnaOld.setX(pi, 1 - young);
            pi++;
          }
        }
      }
    }
    pinnae.count = pi;
    pinnaOld.needsUpdate = true;
    rachis.count = ri;
    pinnae.instanceMatrix.needsUpdate = rachis.instanceMatrix.needsUpdate = true;
    if (pinnae.instanceColor) pinnae.instanceColor.needsUpdate = true;
  }

  /* ---------- mushrooms: wet caps glisten ---------- */
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0x7a4a22, roughness: 0.55, clearcoat: 0, clearcoatRoughness: 0.1 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a8, roughness: 0.7 });
  const capG = new THREE.LatheGeometry([0, 0.3, 0.7, 0.95, 1.0, 0.92, 0.6, 0].map((r, i) => new THREE.Vector2(r, [0.55, 0.53, 0.42, 0.22, 0.05, -0.02, 0.0, 0.02][i])), 32);
  const shrooms = new THREE.Group();
  for (const [x, z, h, r] of [[0.27, 0.2, 0.1, 0.045], [0.33, 0.13, 0.07, 0.034], [0.21, 0.26, 0.055, 0.028]]) {
    const y = bedH(x, z) - 0.01;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.24, h, 10).translate(0, h / 2, 0), stemMat);
    stem.position.set(x, y, z);
    const cap = new THREE.Mesh(capG, capMat);
    cap.scale.setScalar(r);
    cap.position.set(x, y + h, z);
    stem.castShadow = cap.castShadow = true;
    shrooms.add(stem, cap);
  }
  scene.add(shrooms);

  /* ---------- bog: pitcher plants ---------- */
  // Each pitcher is an open tube that flares, green at the foot and red at the lip.
  const bog = new THREE.Group();
  {
    const prof = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(0.06 + 0.32 * Math.pow(t, 1.6) + (t > 0.92 ? 0.06 : 0), t)); }
    const g = new THREE.LatheGeometry(prof, 20);
    const col = [], p = g.attributes.position, c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const t = p.getY(i); c.setHSL(0.27 - 0.27 * ss(0.4, 0.9, t), 0.65, 0.26 + 0.12 * t); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.DoubleSide });
    for (const [x, z, h, lean] of [[-0.12, -0.1, 0.42, 0.1], [0.06, -0.24, 0.36, -0.08], [-0.24, 0.1, 0.3, 0.14], [0.16, 0.0, 0.26, -0.12], [-0.02, 0.16, 0.22, 0.05]]) {
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, bedH(x, z) - 0.01, z);
      m.scale.set(0.1, h, 0.1);
      m.rotation.set(lean, x * 9, -lean * 0.6);
      m.castShadow = m.receiveShadow = true;
      bog.add(m);
    }
  }
  scene.add(bog);

  /* ---------- state ---------- */
  // plants: 0 Fern, 1 Moss, 2 Bog. lamp: the grow light's linear colour.
  const st = { wake: 0, grow: 0, plants: 0, lamp: [1, 0.93, 0.86], sway: [0, 0, 0] };
  let dirty = true, fernsDirty = true, w = 0, h = 0;
  function set(next) {
    for (const [k, v] of Object.entries(next)) {
      const same = Array.isArray(v) ? v.every((x, i) => Math.abs(x - st[k][i]) < 1e-4) : Math.abs(v - st[k]) < 1e-4;
      if (same) continue;
      st[k] = Array.isArray(v) ? v.slice() : v;
      dirty = true;
      if (k !== 'lamp') fernsDirty = true;
    }
  }
  const lampDir = new THREE.Vector3();
  // Draws the garden into its picture if anything changed. Leaves the context clean.
  function render(W, H) {
    // The picture holds at most 2.2 million pixels; the glass and the fog hide the rest.
    if (W !== w || H !== h) { w = W; h = H; const k = Math.min(1, Math.sqrt(2.2e6 / (w * h))); rt.setSize(Math.round(w * k), Math.round(h * k)); dirty = true; }
    if (!dirty) return;
    dirty = false;
    renderer.resetState();
    const asp = w / h;
    camera.aspect = asp;
    camera.position.set(...view.eye(asp));
    camera.lookAt(view.aim[0], view.aim[1], view.aim[2]);
    camera.updateProjectionMatrix();
    if (fernsDirty) { buildFerns(); fernsDirty = false; }
    const { wake, plants, lamp } = st;
    U.uWake.value = wake;
    U.uLift.value = plants === 1 ? 0.7 : 0;
    U.uBog.value = plants === 2 ? 1 : 0;
    U.uCover.value = 0.55 + 0.45 * st.grow;
    shrooms.visible = plants !== 2;
    bog.visible = plants === 2;
    spores.visible = plants !== 2;
    // The Light slider sets the grow light's colour and strength.
    const k = Math.max(...lamp), col = new THREE.Color(lamp[0] / k, lamp[1] / k, lamp[2] / k);
    spot.color.copy(col); spot.intensity = 9 * k;
    rect.color.copy(col); rect.intensity = 12 * k;
    U.uLampCol.value.copy(col).multiplyScalar(0.8 * k);
    capMat.clearcoat = 0.05 + 0.95 * wake;
    frondMat.clearcoat = 0.05 + 0.12 * wake;
    mossMat.clearcoat = 0.03 + 0.12 * wake;
    mossMat.sheen = 0.6 - 0.2 * wake;
    capMat.roughness = 0.55 - 0.35 * wake;
    camera.updateMatrixWorld();
    lampDir.copy(LAMP).sub(new THREE.Vector3(0, 0.4, 0)).normalize().transformDirection(camera.matrixWorldInverse);
    U.uLampDirV.value.copy(lampDir);
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.resetState();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  }
  // The crowns on show, with the point a tap aims at.
  const crowns = () => SHOWN[st.plants].map(ci => { const [x, z, R] = CROWNS[ci]; return { i: ci, at: [x, bedH(x, z) + R * 1.1, z] }; });
  return {
    set, render, crowns,
    // QA reaches the materials and lights here.
    debug: { frondMat, mossMat, spot, rect, U, redraw: () => { dirty = true; } },
    texture: () => renderer.properties.get(rt.texture).__webglTexture || null,
    get busy() { return dirty; },
  };
}
