// Strangereal furball: jets turn on looping paths kilometres out, trailing
// contrails; missiles chase and mostly burn out; flares fall; now and then
// a hit flashes, leaves a smoke puff and drops burning debris.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { col } from './kit.js';

// Three furballs wheel high above the city, kilometres out.
const BALLS = [
  { c: [-2600, 2300, -7200], r: 1600, n: 8 },
  { c: [2900, 3300, -9400], r: 1900, n: 8 },
  { c: [300, 1600, -5600], r: 1200, n: 6 },
];
const MAX_TRAILS = 96, PTS = 96, STEP = 0.13;
const KINDS = {
  contrail: { life: 10, w: 7, spread: 4, col: [1, 1, 1], a: 0.92 },
  missile: { life: 9, w: 5, spread: 5, col: [1, 1, 1], a: 0.95 },
  flare: { life: 5, w: 3, spread: 4, col: [1, 1, 1], a: 0.7 },
  debris: { life: 11, w: 8, spread: 6, col: [0.22, 0.21, 0.22], a: 0.85 },
};

// A fighter: fuselage, delta wing, twin fins. About 15 m long.
function jetGeometry() {
  // Drawn at three times scale, so a jet reads kilometres away.
  const body = new THREE.BoxGeometry(1.1, 1.0, 15);
  const wing = new THREE.Shape([new THREE.Vector2(0, 3.5), new THREE.Vector2(-5.5, -5.5), new THREE.Vector2(5.5, -5.5)]);
  const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.2, bevelEnabled: false }).rotateX(Math.PI / 2);
  const fins = [-1, 1].map(k => new THREE.BoxGeometry(0.15, 2.4, 2.6).rotateZ(k * 0.3).translate(k * 1.0, 1.3, -6));
  return mergeGeometries([body, wg, ...fins].map(g => g.toNonIndexed())).scale(3, 3, 3);
}

export function furball(group, R, { H }) {
  /* ---------- jets ---------- */
  const jets = [];
  BALLS.forEach((b, bi) => {
    for (let i = 0; i < b.n; i++) {
      // Each jet flies a tilted, wandering loop: no two share a plane.
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 1.6, R() * 6.3, (R() - 0.5) * 1.6));
      jets.push({
        ball: bi, a1: b.r * (0.45 + R() * 0.6), a2: b.r * (0.2 + R() * 0.35), w1: (0.16 + R() * 0.12) * (R() < 0.5 ? -1 : 1), w2: 0.37 + R() * 0.5,
        w3: 0.05 + R() * 0.06, p1: R() * 6.3, p2: R() * 6.3, p3: R() * 6.3, tilt,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), dead: 0, trail: -1, next: 0,
      });
    }
  });
  const pathAt = (j, t, out) => {
    const b = BALLS[j.ball].c, a = j.w1 * t + j.p1, c = j.w2 * t + j.p2;
    // An ellipse with a faster wobble, tilted, its centre drifting slowly.
    out.set(j.a1 * Math.cos(a) + j.a2 * Math.cos(c), j.a2 * 0.6 * Math.sin(c * 1.3), j.a1 * 0.55 * Math.sin(a) + j.a2 * 0.4 * Math.sin(c)).applyQuaternion(j.tilt);
    return out.add(new THREE.Vector3(b[0] + 600 * Math.sin(j.w3 * t + j.p3), b[1] + 250 * Math.sin(j.w3 * 1.7 * t), b[2] + 500 * Math.cos(j.w3 * t + j.p3)));
  };
  const jetMesh = new THREE.InstancedMesh(jetGeometry(), new THREE.MeshStandardMaterial({ color: col([0.45, 0.02, 250]), roughness: 0.45, metalness: 0.5 }), jets.length);
  jetMesh.frustumCulled = false;
  group.add(jetMesh);

  /* ---------- trails ---------- */
  // Each trail is a ring of points; the ribbon faces the camera.
  const T = Array.from({ length: MAX_TRAILS }, () => ({ on: false, kind: null, n: 0, head: 0, last: -1, p: new Float32Array(PTS * 3), t: new Float32Array(PTS) }));
  const newTrail = kind => {
    const i = T.findIndex(x => !x.on);
    if (i < 0) return -1;
    Object.assign(T[i], { on: true, kind, n: 0, head: 0, last: -1, end: Infinity });
    return i;
  };
  const feed = (i, v, t) => {
    const tr = T[i];
    if (t - tr.last < STEP) { const k = ((tr.head - 1 + PTS) % PTS) * 3; tr.p[k] = v.x; tr.p[k + 1] = v.y; tr.p[k + 2] = v.z; return; }
    const k = tr.head * 3;
    tr.p[k] = v.x; tr.p[k + 1] = v.y; tr.p[k + 2] = v.z; tr.t[tr.head] = t;
    tr.head = (tr.head + 1) % PTS; tr.n = Math.min(PTS, tr.n + 1); tr.last = t;
  };
  const NV = MAX_TRAILS * PTS * 2;
  const rPos = new Float32Array(NV * 3), rCol = new Float32Array(NV * 4);
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(rPos, 3).setUsage(THREE.DynamicDrawUsage));
  rg.setAttribute('aCol', new THREE.BufferAttribute(rCol, 4).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let m = 0; m < MAX_TRAILS; m++) for (let i = 0; i < PTS - 1; i++) { const a = (m * PTS + i) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  rg.setIndex(idx);
  const ribbons = new THREE.Mesh(rg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `attribute vec4 aCol; varying vec4 vC; void main() { vC = aCol; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec4 vC; void main() { if (vC.a < 0.003) discard; gl_FragColor = vC; }`,
  }));
  ribbons.frustumCulled = false;
  ribbons.renderOrder = 5;
  group.add(ribbons);

  /* ---------- sprites ---------- */
  // Glows add light; smoke puffs cover. Sizes are in pixels.
  const sprites = (max, additive) => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3), size = new Float32Array(max), c = new Float32Array(max * 4);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(c, 4).setUsage(THREE.DynamicDrawUsage));
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */ `attribute float aSize; attribute vec4 aCol; varying vec4 vC;
        void main() { vC = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize; }`,
      fragmentShader: /* glsl */ `varying vec4 vC; void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0, k = ${additive ? 'exp(-d * d * 3.0)' : 'smoothstep(1.0, 0.35, d)'};
        gl_FragColor = vec4(vC.rgb * ${additive ? 'vC.a * k' : '1.0'}, ${additive ? '1.0' : 'vC.a * k'}); }`,
    }));
    pts.frustumCulled = false;
    pts.renderOrder = additive ? 7 : 6;
    group.add(pts);
    let n = 0;
    return {
      reset() { n = 0; },
      add(v, px, r, gr, b, a) {
        if (n >= max) return;
        pos[n * 3] = v.x; pos[n * 3 + 1] = v.y; pos[n * 3 + 2] = v.z; size[n] = px;
        c[n * 4] = r; c[n * 4 + 1] = gr; c[n * 4 + 2] = b; c[n * 4 + 3] = a; n++;
      },
      flush() {
        g.setDrawRange(0, n);
        for (const k of ['position', 'aSize', 'aCol']) g.attributes[k].needsUpdate = true;
      },
    };
  };
  const glow = sprites(256, true), smoke = sprites(64, false);

  /* ---------- weapons ---------- */
  const missiles = [], flares = [], debris = [], puffs = [], flashes = [];
  let nextShot = 2, last = null;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const alive = bi => jets.filter(j => j.ball === bi && !j.dead);
  function shoot(t) {
    const bi = Math.floor(R() * BALLS.length), pool = alive(bi);
    if (pool.length < 2) return;
    const s = pool[Math.floor(R() * pool.length)];
    let tg = pool[Math.floor(R() * pool.length)];
    if (tg === s) tg = pool[(pool.indexOf(s) + 1) % pool.length];
    const v = s.vel.clone().normalize().multiplyScalar(400);
    missiles.push({ pos: s.pos.clone(), vel: v, target: tg, born: t, kill: R() < 0.13, trail: newTrail('missile') });
    // The target pops flares as it breaks away.
    for (let k = 0; k < 6; k++) {
      flares.push({ pos: tg.pos.clone(), vel: tg.vel.clone().multiplyScalar(0.25).add(tmp.set((R() - 0.5) * 120, 10 + R() * 30, (R() - 0.5) * 120)), born: t + k * 0.12, trail: -1 });
    }
  }
  function burst(m, t) {
    const tg = m.target;
    tg.dead = t;
    flashes.push({ pos: tg.pos.clone(), born: t });
    puffs.push({ pos: tg.pos.clone(), born: t });
    for (let k = 0; k < 5; k++) {
      debris.push({ pos: tg.pos.clone(), vel: tg.vel.clone().multiplyScalar(0.4).add(tmp.set((R() - 0.5) * 160, R() * 80, (R() - 0.5) * 160)), born: t, trail: newTrail('debris') });
    }
    if (tg.trail >= 0) { T[tg.trail].end = t; tg.trail = -1; }
  }

  /* ---------- per frame ---------- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), look = new THREE.Matrix4(), upV = new THREE.Vector3(0, 1, 0);
  return {
    tick(t, sun, cam, viewH) {
      const dt = last == null ? 0 : Math.min(0.1, Math.max(0, t - last));
      last = t;
      const focal = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
      const px = (v, metres) => (metres * focal) / Math.max(1, v.distanceTo(cam.position));
      glow.reset(); smoke.reset();

      // Jets fly their paths; a dead jet returns after a while.
      jets.forEach((j, i) => {
        if (j.dead && t - j.dead > 9) j.dead = 0;
        pathAt(j, t, j.pos); pathAt(j, t + 0.05, tmp);
        j.vel.subVectors(tmp, j.pos).multiplyScalar(20);
        if (j.dead) { jetMesh.setMatrixAt(i, m4.makeScale(0, 0, 0)); return; }
        look.lookAt(j.pos, tmp2.copy(j.pos).sub(j.vel), upV);
        q.setFromRotationMatrix(look).multiply(new THREE.Quaternion().setFromEuler(e.set(0, 0, 0.6 * Math.sin(t * j.w1 * 2 + j.p2))));
        jetMesh.setMatrixAt(i, m4.compose(j.pos, q, one));
        if (j.trail < 0) j.trail = newTrail('contrail');
        if (j.trail >= 0) feed(j.trail, tmp2.copy(j.pos).addScaledVector(j.vel, -0.04), t);
        glow.add(tmp2, 2.2, 1.0, 0.55, 0.25, 0.9);
        // Navigation lights: red port, green starboard, a white strobe.
        glow.add(tmp.set(-16, 0, -15).applyQuaternion(q).add(j.pos), 2, 1.0, 0.1, 0.05, 1);
        glow.add(tmp.set(16, 0, -15).applyQuaternion(q).add(j.pos), 2, 0.1, 1.0, 0.3, 1);
        if ((t * 1.1 + j.p1) % 1 < 0.08) glow.add(tmp.set(0, 4, -18).applyQuaternion(q).add(j.pos), 3.5, 1, 1, 1, 1.4);
      });
      jetMesh.instanceMatrix.needsUpdate = true;

      // Missiles steer toward their target, then burn out.
      if (t > nextShot) { shoot(t); nextShot = t + 2 + R() * 1.5; }
      for (let k = missiles.length - 1; k >= 0; k--) {
        const m = missiles[k], age = t - m.born;
        if (!m.target.dead) {
          tmp.subVectors(m.target.pos, m.pos).normalize().multiplyScalar(680);
          m.vel.lerp(tmp, Math.min(1, 2.2 * dt));
        }
        m.pos.addScaledVector(m.vel, dt);
        if (m.trail >= 0) feed(m.trail, m.pos, t);
        glow.add(m.pos, 3, 1.0, 0.95, 0.8, 1.0);
        if (m.kill && !m.target.dead && m.pos.distanceTo(m.target.pos) < 40) { burst(m, t); m.done = true; }
        if (m.done || age > 4.5) { if (m.trail >= 0) T[m.trail].end = t; missiles.splice(k, 1); }
      }
      // Flares fall in bright arcs that slow in the air.
      for (let k = flares.length - 1; k >= 0; k--) {
        const f = flares[k], age = t - f.born;
        if (age < 0) continue;
        if (f.trail < 0 && age < 0.2) f.trail = newTrail('flare');
        f.vel.multiplyScalar(1 - 0.6 * dt); f.vel.y -= 14 * dt;
        f.pos.addScaledVector(f.vel, dt);
        if (f.trail >= 0) feed(f.trail, f.pos, t);
        const a = Math.max(0, 1 - age / 3);
        glow.add(f.pos, 3 + 3 * a * (0.7 + 0.3 * Math.sin(t * 40 + k)), 1.0, 0.6, 0.25, a);
        if (age > 3) { if (f.trail >= 0) T[f.trail].end = t; flares.splice(k, 1); }
      }
      // Debris falls burning and smoking.
      for (let k = debris.length - 1; k >= 0; k--) {
        const d = debris[k], age = t - d.born;
        d.vel.multiplyScalar(1 - 0.3 * dt); d.vel.y -= 9.8 * dt;
        d.pos.addScaledVector(d.vel, dt);
        if (d.trail >= 0) feed(d.trail, d.pos, t);
        glow.add(d.pos, 3 + 2 * Math.sin(t * 30 + k), 1.0, 0.45, 0.12, Math.max(0, 1 - age / 7));
        if (age > 7 || d.pos.y < -H) { if (d.trail >= 0) T[d.trail].end = t; debris.splice(k, 1); }
      }
      // A flash, then a smoke puff that spreads and fades.
      for (let k = flashes.length - 1; k >= 0; k--) {
        const age = t - flashes[k].born, a = Math.max(0, 1 - age / 0.5);
        glow.add(flashes[k].pos, Math.max(4, px(flashes[k].pos, 220) * (0.6 + age)), 1.0, 0.85, 0.6, a * 1.6);
        if (age > 0.5) flashes.splice(k, 1);
      }
      for (let k = puffs.length - 1; k >= 0; k--) {
        const age = t - puffs[k].born, a = 0.65 * Math.max(0, 1 - age / 12);
        smoke.add(puffs[k].pos, Math.max(3, px(puffs[k].pos, 40 + age * 18)), 0.32, 0.31, 0.32, a);
        if (age > 12) puffs.splice(k, 1);
      }
      glow.flush(); smoke.flush();

      // Build every trail's ribbon, facing the camera and fading with age.
      const cp = cam.position;
      for (let m = 0; m < MAX_TRAILS; m++) {
        const tr = T[m], kind = tr.on ? KINDS[tr.kind] : null;
        if (tr.on && t - tr.end > kind.life) tr.on = false;
        for (let i = 0; i < PTS; i++) {
          const v = (m * PTS + i) * 2;
          if (!tr.on || i >= tr.n) { rCol[v * 4 + 3] = 0; rCol[v * 4 + 7] = 0; continue; }
          // i counts back from the newest point.
          const at = (tr.head - 1 - i + PTS * 2) % PTS, nb = (tr.head - 1 - Math.min(tr.n - 1, i + 1) + PTS * 2) % PTS, pb = (tr.head - 1 - Math.max(0, i - 1) + PTS * 2) % PTS;
          const x = tr.p[at * 3], y = tr.p[at * 3 + 1], z = tr.p[at * 3 + 2];
          const tx = tr.p[pb * 3] - tr.p[nb * 3], ty = tr.p[pb * 3 + 1] - tr.p[nb * 3 + 1], tz = tr.p[pb * 3 + 2] - tr.p[nb * 3 + 2];
          const vx = cp.x - x, vy = cp.y - y, vz = cp.z - z, dist = Math.hypot(vx, vy, vz);
          let sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
          const age = t - tr.t[at];
          const hw = Math.max(kind.w + kind.spread * age, (1.3 * dist) / focal) / 2, sl = Math.hypot(sx, sy, sz) || 1;
          sx *= hw / sl; sy *= hw / sl; sz *= hw / sl;
          rPos.set([x + sx, y + sy, z + sz, x - sx, y - sy, z - sz], v * 3);
          const a = kind.a * Math.pow(Math.max(0, 1 - age / kind.life), 1.5) * Math.min(1, i / 2);
          // Trails are white in the sun; their side away from it takes the sky's blue.
          let c = kind.col;
          if (tr.kind !== 'debris') {
            const lit = 0.5 + 0.5 * Math.max(-1, Math.min(1, (sx * sun.dir.x + sy * sun.dir.y + sz * sun.dir.z) / (hw || 1)));
            c = [0.78 + 0.22 * lit, 0.86 + 0.14 * lit, 1.0];
          }
          rCol.set([c[0], c[1], c[2], a, c[0], c[1], c[2], a], v * 4);
        }
      }
      rg.attributes.position.needsUpdate = true;
      rg.attributes.aCol.needsUpdate = true;
    },
  };
}
