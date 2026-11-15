// Phaeton targets: each kind builds its meshes and plans its own break.
// The first kind is the light bulb.
import * as THREE from 'three';
import { rng, lathe, seedSurface, shellShards } from './fracture.js';
import { solve, pile, pack, NEVER, ROW, DEBRIS_GLSL, DEBRIS_POSE, DEBRIS_NORMAL, DEBRIS_BEGIN } from './debris.js';
import { TABLE, BORE, SPEED, MAT, col } from './rig.js';

/**
 * Makes a three.js material move its vertices by the piece texture.
 * @param {THREE.Material} mat
 * @param {Record<string, { value: any }>} uniforms uPieces, uT and uLead.
 * @param {boolean} [normals] False for a material with no lighting.
 * @param {(shader: any) => void} [more] Further shader edits.
 */
export function debrisMaterial(mat, uniforms, normals = true, more = null) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${DEBRIS_GLSL}`)
      .replace('#include <begin_vertex>', (normals ? '' : DEBRIS_POSE) + DEBRIS_BEGIN);
    if (normals) sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', DEBRIS_POSE + DEBRIS_NORMAL);
    more?.(sh);
  };
  mat.customProgramCacheKey = () => `phaeton-debris-${normals}-${more ? 'more' : 'plain'}`;
  return mat;
}

/* ---------- the light bulb ---------- */
const R = 0.04, NECK = -0.07;
// The glass outline, from the crown down to the cap: [radius, y] from the globe's centre.
const OUTLINE = (() => {
  const p = [];
  for (let i = 0; i <= 22; i++) { const a = (i / 22) * 2.25; p.push([R * Math.sin(a), R * Math.cos(a)]); }
  p.push([0.0268, -0.031], [0.0232, -0.0365], [0.0203, -0.042], [0.0182, -0.048], [0.0169, -0.055], [0.0163, -0.0625], [0.0161, NECK]);
  return p;
})();
// Crack fronts run from the entry and from the exit at this speed.
const CRACK = 320;

// Glass breaks in long slivers that point at the hole.
// Seeds sit on rings round the entry and the exit: close along a ring, far between rings.
function bulbSeeds(surf, rand) {
  const seeds = [], PER = 26;
  for (const side of [-1, 1]) {
    seeds.push([side * R, 0, 0]);
    for (let ring = 0, phi = 0.085; phi < 1.5; ring++, phi *= 1.95) {
      for (let j = 0; j < PER; j++) {
        const a = phi * (0.9 + 0.2 * rand()), psi = ((j + 0.5 * rand() - 0.25) / PER) * Math.PI * 2;
        const p = [side * R * Math.cos(a), R * Math.sin(a) * Math.cos(psi), R * Math.sin(a) * Math.sin(psi)];
        // Under this height the outline leaves the sphere for the neck.
        if (p[1] > -0.022) seeds.push(p);
      }
    }
  }
  // The neck breaks in plain plates.
  for (const p of seedSurface(surf, 260, rand)) if (p[1] < -0.026 && seeds.length < 300) seeds.push(p);
  return seeds;
}

/**
 * The plan of one bulb's break: a piece record for each shard.
 * @param {{ c: number[], n: number[], r: number }[]} shards Shards in world space.
 * @param {number} x The globe centre's x.
 * @param {number} tHit The shot time when the slug enters.
 * @param {() => number} rand
 */
function burstBulb(shards, x, tHit, rand) {
  const tExit = tHit + 2 * R / SPEED;
  const pieces = shards.map(sh => {
    const rx = sh.c[0] - x, ry = sh.c[1] - BORE, rz = sh.c[2];
    const p = { p0: sh.c, r: sh.r, t0: NEVER, v: [0, 0, 0], k: 30, axis: [1, 0, 0], turn: 0 };
    // The glass at the cap stays in the socket.
    if (ry < NECK + 0.012) return p;
    const dE = Math.hypot(rx + R, ry, rz), dX = Math.hypot(rx - R, ry, rz);
    p.t0 = Math.min(tHit + dE / CRACK, tExit + dX / CRACK);
    const rl = Math.hypot(ry, rz) || 1, radY = ry / rl, radZ = rz / rl;
    const wE = Math.exp(-((dE / 0.021) ** 2)), wX = Math.exp(-((dX / 0.026) ** 2));
    // Small shards fly faster and stop sooner.
    const small = Math.min(2.2, Math.max(0.6, Math.sqrt(0.011 / sh.r)));
    const out = 16 + 42 * rand(), back = (20 + 45 * rand()) * wE, cone = (50 + 130 * rand()) * wX, along = 4 + 12 * rand();
    p.v = [
      (sh.n[0] * out - 0.75 * back + 0.85 * cone + along) * small,
      (sh.n[1] * out + radY * (0.5 * back + 0.42 * cone) + 1.5 * rand()) * small,
      (sh.n[2] * out + radZ * (0.5 * back + 0.42 * cone)) * small,
    ];
    // The drag sets how far the push carries: near shards hang, the cone flies on.
    p.k = Math.hypot(...p.v) / (0.1 + 0.3 * rand() + 0.5 * wX * rand());
    // A shard comes to rest flat: its normal turns up or down.
    const up = rand() < 0.5 ? 1 : -1;
    const ax = [-sh.n[2] * up, 0, sh.n[0] * up];
    const al = Math.hypot(ax[0], ax[2]);
    p.axis = al > 1e-4 ? [ax[0] / al, 0, ax[2] / al] : [1, 0, 0];
    p.turn = Math.acos(Math.max(-1, Math.min(1, sh.n[1] * up))) + Math.PI * 2 * Math.round((1 + 5 * rand()) * small * small);
    return p;
  });
  const lift = p => 0.0012 + p.r * 0.1;
  for (const p of pieces) solve(p, TABLE, lift(p));
  pile(pieces, TABLE, lift, 0.0012);
  return pieces;
}

// The glass dust of one bulb: where each grain starts and how it leaves.
function dustBulb(x, tHit, rand, count) {
  const p0 = new Float32Array(count * 3), v = new Float32Array(count * 3), tk = new Float32Array(count * 4);
  const tExit = tHit + 2 * R / SPEED;
  for (let i = 0; i < count; i++) {
    // Most dust leaves through the exit; some sprays back from the entry.
    const exit = rand() < 0.72, a = rand() * Math.PI * 2, spread = (exit ? 0.5 : 0.9) * Math.sqrt(rand());
    const speed = (exit ? 40 + 150 * rand() * rand() : 12 + 50 * rand() * rand()), dir = exit ? 1 : -1;
    const ring = 0.004 + 0.008 * rand();
    p0.set([x + dir * R, BORE + Math.cos(a) * ring, Math.sin(a) * ring], i * 3);
    v.set([dir * speed * Math.cos(spread * 0.9), speed * Math.sin(spread) * Math.cos(a), speed * Math.sin(spread) * Math.sin(a)], i * 3);
    // Release time, drag, grain size in metres, a seed for the twinkle.
    tk.set([(exit ? tExit : tHit) + rand() * 1.2e-4, 60 + 240 * rand(), 0.0004 + 0.0011 * rand() * rand(), rand()], i * 4);
  }
  return { p0, v, tk };
}

const DUST_VS = /* glsl */`
uniform float uT, uScale;
attribute vec3 aV;
attribute vec4 aTk;
varying float vSeed, vOn;
void main() {
  float tau = uT - aTk.x;
  vOn = step(0.0, tau);
  tau = max(tau, 0.0);
  vec3 p = position + aV * (1.0 - exp(-aTk.y * tau)) / aTk.y;
  // Dust is light: it falls slower than the shards.
  p.y -= 0.5 * 9.81 * (0.35 + 0.5 * aTk.w) * tau * tau;
  bool over = p.x > ${TABLE.x0.toFixed(2)} && p.x < ${TABLE.x1.toFixed(2)} && abs(p.z) < ${TABLE.z.toFixed(2)};
  if (over) p.y = max(p.y, 0.0012);
  vSeed = aTk.w + dot(p, vec3(31.0, 17.0, 23.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.5, aTk.z * uScale / -mv.z);
}`;
const DUST_FS = /* glsl */`
uniform vec3 uLight;
varying float vSeed, vOn;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  if (vOn < 0.5 || dot(q, q) > 0.25) discard;
  // A grain glints when a facet lines up; the phase moves with the grain.
  float glint = pow(fract(vSeed), 10.0) * 14.0;
  gl_FragColor = vec4(uLight * (0.25 + glint), 1.0);
}`;

/**
 * The whole row of bulbs: one glass mesh, one dust cloud, a filament per bulb.
 * @param {THREE.Scene} scene
 * @param {number[]} slots The x of each bulb.
 * @param {{ uT: { value: number }, uLead: { value: number } }} clock The shared shot clock uniforms.
 */
export function makeBulbs(scene, slots, clock) {
  const group = new THREE.Group();
  scene.add(group);
  const uniforms = { uPieces: { value: null }, uT: clock.uT, uLead: clock.uLead };
  const shine = { uGlint: { value: 0 }, uRimCol: { value: new THREE.Color(1, 1, 1) } };
  // Glass on black: reflections only, added to what lies behind.
  // The flash also runs inside the glass: it leaves at the broken edges and at grazing angles.
  const glass = debrisMaterial(new THREE.MeshStandardMaterial({
    color: 0x000000, roughness: 0.015, metalness: 0, envMapIntensity: 2.2,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }), uniforms, true, sh => {
    Object.assign(sh.uniforms, shine);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWall;')
      .replace('#include <project_vertex>', 'vWall = aWall;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWall;\nuniform float uGlint;\nuniform vec3 uRimCol;')
      .replace('#include <opaque_fragment>', `
        float graze = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 4.0);
        outgoingLight += uGlint * (mix(vec3(1.0), uRimCol, 0.6) * graze * 0.4 + vec3(0.6) * vWall);
        #include <opaque_fragment>`);
  });
  // The same glass writes depth only, so the lens blur sees it.
  // It sits in the transparent list, so it can draw after the glass.
  const stamp = debrisMaterial(new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true }), uniforms, false);
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uT: clock.uT, uScale: { value: 1000 }, uLight: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, blending: THREE.AdditiveBlending,
  });
  const fila = slots.map(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) }));
  const lamps = [], halos = [];
  // A soft halo, so a lit bulb reads from the far end of the bench.
  const haloMap = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  // The fixed parts: cap, socket, stem, filament.
  const capProfile = [];
  for (let i = 0; i <= 14; i++) capProfile.push(new THREE.Vector2(0.0158 + (i % 2 ? 0.0012 : 0), -0.028 * (i / 14)));
  capProfile.push(new THREE.Vector2(0.006, -0.032), new THREE.Vector2(0, -0.033));
  // A lathe wants its outline from the foot up, or its normals point in.
  capProfile.reverse();
  const capGeo = new THREE.LatheGeometry(capProfile, 32), socketGeo = new THREE.CylinderGeometry(0.021, 0.019, 0.036, 32);
  const stemGeo = new THREE.CylinderGeometry(0.0028, 0.0062, 0.05, 12), wireGeo = new THREE.CylinderGeometry(0.0004, 0.0004, 0.024, 6);
  const coil = [];
  for (let i = 0; i <= 90; i++) { const t = i / 90; coil.push(new THREE.Vector3((t - 0.5) * 0.026, 0.0016 * Math.cos(t * 56), 0.0016 * Math.sin(t * 56))); }
  const coilGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 180, 0.00045, 5);
  const stemGlass = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  slots.forEach((x, i) => {
    const add = (geo, mat, y, z = 0, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, BORE + y, z); m.castShadow = shadow; group.add(m); return m; };
    add(capGeo, MAT.brass, NECK);
    add(socketGeo, MAT.black, NECK - 0.045);
    add(stemGeo, stemGlass, NECK + 0.027, 0, false);
    for (const s of [-1, 1]) { const w = add(wireGeo, MAT.chrome, -0.012, 0, false); w.position.x += s * 0.009; w.rotation.z = s * 0.35; }
    add(coilGeo, fila[i], 0, 0, false);
    const lamp = new THREE.PointLight(col(0.85, 0.11, 70), 0, 0.9, 2);
    lamp.position.set(x, BORE, 0);
    group.add(lamp);
    lamps.push(lamp);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.position.set(x, BORE, 0);
    halo.scale.setScalar(0.085);
    group.add(halo);
    halos.push(halo.material);
  });
  const surf = lathe(OUTLINE, 56);
  let glassMesh = null, stampMesh = null, dust = null, hits = [];

  /** Breaks every bulb anew: fresh seeds, fresh shards. tHit holds each bulb's entry time. */
  function build(seed, tHit) {
    for (const m of [glassMesh, dust]) { m?.geometry.dispose(); }
    uniforms.uPieces.value?.dispose();
    if (glassMesh) group.remove(glassMesh, stampMesh, dust);
    const pos = [], nor = [], pid = [], wall = [], all = [], dP = [], dV = [], dT = [];
    slots.forEach((x, i) => {
      const rand = rng(seed + i * 977);
      const sh = shellShards(surf, bulbSeeds(surf, rand), 0.0012), base = all.length;
      for (let j = 0; j < sh.position.length; j += 3) pos.push(sh.position[j] + x, sh.position[j + 1] + BORE, sh.position[j + 2]);
      for (const n of sh.normal) nor.push(n);
      for (const id of sh.piece) pid.push(id + base);
      for (const w of sh.wall) wall.push(w);
      const world = sh.pieces.map(p => ({ ...p, c: [p.c[0] + x, p.c[1] + BORE, p.c[2]] }));
      all.push(...burstBulb(world, x, tHit[i], rand));
      const d = dustBulb(x, tHit[i], rand, 420);
      dP.push(d.p0); dV.push(d.v); dT.push(d.tk);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('aPiece', new THREE.Float32BufferAttribute(pid, 1));
    geo.setAttribute('aWall', new THREE.Float32BufferAttribute(wall, 1));
    const tex = new THREE.DataTexture(pack(all), ROW, all.length, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    uniforms.uPieces.value = tex;
    glassMesh = new THREE.Mesh(geo, glass);
    stampMesh = new THREE.Mesh(geo, stamp);
    // The stamp draws last, so the glass and the dust never hide behind it.
    stampMesh.renderOrder = 5;
    const join = (parts, n) => { const out = new Float32Array(parts.reduce((s, a) => s + a.length, 0)); let o = 0; for (const a of parts) { out.set(a, o); o += a.length; } return new THREE.BufferAttribute(out, n); };
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', join(dP, 3));
    dGeo.setAttribute('aV', join(dV, 3));
    dGeo.setAttribute('aTk', join(dT, 4));
    dust = new THREE.Points(dGeo, dustMat);
    dust.renderOrder = 1;
    for (const m of [glassMesh, stampMesh, dust]) { m.frustumCulled = false; group.add(m); }
    hits = tHit.slice();
    return { shards: all.length, triangles: pos.length / 9 };
  }

  /**
   * Sets what the clock does not: the filaments and the dust light.
   * @param {number} T The shot time; under zero before the shot.
   * @param {number} lit The flash level.
   * @param {number} dim The modelling light level.
   * @param {number} scale Pixels per metre at one metre from the lens.
   * @param {number} far 0 in a close photo, 1 in the wide shot: the halos show only from far.
   * @param {number} hue The rim hue in degrees.
   */
  function update(T, lit, dim, scale, far, hue) {
    shine.uGlint.value = lit + 0.04 * dim;
    shine.uRimCol.value.copy(col(0.8, 0.14, hue));
    slots.forEach((_, i) => {
      const tau = T - hits[i];
      // The filament flares in the air, then dies.
      const glow = tau < 0 ? 1 : (1 + 0.7 * (1 - Math.exp(-tau / 4e-5))) * Math.exp(-tau / 0.0028);
      fila[i].color.setRGB(5 * glow, 2 * glow, 0.5 * glow);
      lamps[i].intensity = 0.4 * glow;
      const h = Math.min(glow, 1.3) * (0.12 + 0.88 * far);
      halos[i].color.setRGB(1.5 * h, 0.62 * h, 0.17 * h);
    });
    dustMat.uniforms.uScale.value = scale;
    dustMat.uniforms.uLight.value.setScalar(0.04 + 2.2 * lit + 0.05 * dim);
  }
  return { group, build, update, radius: R };
}
