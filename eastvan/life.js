// East Van: the living things on the lot.
// A crow, a cat, a lawn flamingo, cherry petals and chimney smoke.
// Each one adds its own poke to the list.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gsap } from 'gsap';
import { reduced } from '../shared/stim.js';
import { COL, PARTS, CROW } from './lot.js';
import { lin, lift, lerp, paint, PAINT, beamGeo } from './kit.js';

const rand = (a, b) => a + Math.random() * (b - a);
const part = (geo, c, x = 0, y = 0, z = 0) => paint(geo.translate(x, y, z), c);
const body = (geos, cast = true) => { const m = new THREE.Mesh(mergeGeometries(geos), PAINT); m.castShadow = cast; return m; };

export function buildLife(scene, crown, pokes) {
  const still = () => reduced(), updates = [], noInk = [];
  const poke = (id, pos, r, fire) => pokes.push({ id, pos, r, fire });

  /* ---------- crow: sits on the top wire, flies a loop ---------- */
  {
    const HOME = new THREE.Vector3(...CROW.home), s = { u: 0, hop: 0, flying: false }, next = new THREE.Vector3();
    // The loop: out to the left, up, and back from behind.
    const at = (u, out) => {
      const a = Math.sin(Math.PI * u), b = Math.sin(2 * Math.PI * u);
      return out.set(HOME.x - 4.2 * a * a, HOME.y + 2.4 * a + 0.8 * b + 0.5 * Math.sin(Math.PI * s.hop), HOME.z + 2 * b);
    };
    const crow = new THREE.Group(), grey = [0.5, 0.03, 270];
    crow.add(body([
      part(new THREE.IcosahedronGeometry(0.17, 1).scale(0.95, 1.05, 1.5), COL.crow, 0, 0.2, 0),
      part(new THREE.IcosahedronGeometry(0.105, 1), COL.crow, 0, 0.4, 0.2),
      part(new THREE.ConeGeometry(0.045, 0.2, 5).rotateX(Math.PI / 2), grey, 0, 0.39, 0.37),
      part(new THREE.BoxGeometry(0.14, 0.03, 0.3).rotateX(0.35), COL.crow, 0, 0.14, -0.34),
    ]));
    const wing = side => { const m = body([part(new THREE.BoxGeometry(0.42, 0.025, 0.24), COL.crow, side * 0.21, 0, 0)]); m.position.set(side * 0.1, 0.27, 0); crow.add(m); return m; };
    const wingL = wing(-1), wingR = wing(1);
    scene.add(crow);
    poke('crow', crow.position, 0.7, () => {
      if (s.flying) return;
      s.flying = true;
      const done = () => { s.flying = false; s.u = 0; s.hop = 0; };
      if (still()) gsap.fromTo(s, { hop: 0 }, { hop: 1, duration: 0.5, ease: 'none', onComplete: done });
      else gsap.fromTo(s, { u: 0 }, { u: 1, duration: 3.6, ease: 'sine.inOut', onComplete: done });
    });
    updates.push(t => {
      at(s.u, crow.position);
      const air = s.flying && !still() ? Math.min(1, Math.sin(Math.PI * s.u) * 6) : 0;
      if (air > 0) {
        at(Math.min(1, s.u + 0.01), next);
        crow.rotation.y = lerp(0.5, Math.atan2(next.x - crow.position.x, next.z - crow.position.z), air);
      } else crow.rotation.y = 0.5;
      // Folded wings hang down the body. In the air they beat.
      const beat = lerp(-1.45, Math.sin(t * 20) * 0.9, air);
      wingL.rotation.z = -beat; wingR.rotation.z = beat;
    });
  }

  /* ---------- cat: sits on the porch roof, jumps and spins ---------- */
  {
    const fur = [0.72, 0.14, 62], dark = [0.55, 0.13, 50], s = { y: 0, spin: 0, squash: 1 };
    const cat = new THREE.Group(), base = new THREE.Vector3(-2.3, 4.31, 0.6);
    cat.add(body([
      part(new THREE.IcosahedronGeometry(0.2, 1).scale(0.8, 1, 0.95), fur, 0, 0.2, 0),
      part(new THREE.IcosahedronGeometry(0.13, 1), fur, 0, 0.47, 0.06),
      part(new THREE.ConeGeometry(0.045, 0.11, 4), dark, -0.07, 0.61, 0.05), part(new THREE.ConeGeometry(0.045, 0.11, 4), dark, 0.07, 0.61, 0.05),
      part(new THREE.BoxGeometry(0.07, 0.08, 0.1), fur, -0.07, 0.04, 0.15), part(new THREE.BoxGeometry(0.07, 0.08, 0.1), fur, 0.07, 0.04, 0.15),
    ]));
    const tail = body([part(beamGeo([0, 0, 0], [0, 0.22, -0.26], 0.045), dark)]);
    tail.position.set(0, 0.06, -0.14);
    cat.add(tail);
    cat.position.copy(base);
    scene.add(cat);
    poke('cat', cat.position, 0.5, () => {
      gsap.killTweensOf(s);
      if (still()) { gsap.fromTo(s, { squash: 0.8 }, { squash: 1, duration: 0.3 }); return; }
      gsap.timeline()
        .to(s, { squash: 0.75, duration: 0.08 })
        .to(s, { y: 0.75, squash: 1.1, duration: 0.3, ease: 'power2.out' })
        .to(s, { y: 0, duration: 0.3, ease: 'power2.in' })
        .to(s, { squash: 0.8, duration: 0.06 }).to(s, { squash: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
      gsap.fromTo(s, { spin: 0 }, { spin: Math.PI * 2, duration: 0.6, delay: 0.08, ease: 'power1.inOut' });
    });
    updates.push(t => {
      cat.position.y = base.y + s.y;
      cat.rotation.y = 0.4 + s.spin;
      cat.scale.set(1 / Math.sqrt(s.squash), s.squash, 1 / Math.sqrt(s.squash));
      tail.rotation.y = still() ? 0 : Math.sin(t * 2.2) * 0.6;
    });
  }

  /* ---------- flamingo: a lawn ornament that wobbles ---------- */
  {
    const pink = [0.76, 0.15, 5], s = { tip: 0 };
    const bird = body([
      part(beamGeo([0, 0, 0], [0, 0.55, 0], 0.03), lift(pink, -0.15)),
      part(new THREE.IcosahedronGeometry(0.17, 1).scale(0.7, 0.75, 1.3), pink, 0, 0.68, 0),
      part(beamGeo([0, 0.74, 0.16], [0, 1.06, 0.3], 0.05), pink), part(beamGeo([0, 1.06, 0.3], [0, 1.16, 0.2], 0.05), pink),
      part(new THREE.IcosahedronGeometry(0.07, 1), pink, 0, 1.17, 0.2),
      part(new THREE.ConeGeometry(0.03, 0.14, 4).rotateX(2.2), [0.25, 0.02, 270], 0, 1.12, 0.29),
    ]);
    bird.position.set(-4.7, 0.2, 2.3); bird.rotation.y = 0.5;
    scene.add(bird);
    poke('flamingo', new THREE.Vector3(-4.7, 0.85, 2.3), 0.55, () => {
      gsap.killTweensOf(s);
      gsap.fromTo(s, { tip: 0.55 }, { tip: 0, duration: still() ? 0.3 : 1.8, ease: still() ? 'none' : 'elastic.out(1, 0.18)' });
    });
    updates.push(() => { bird.rotation.z = s.tip; });
  }

  /* ---------- cherry petals: a slow drift, and a burst from the tree ---------- */
  {
    const N = 220, list = Array.from({ length: N }, () => ({ on: false })), dummy = new THREE.Object3D(), s = { shake: 0 };
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.075), new THREE.MeshLambertMaterial({ color: lin(lift(COL.blossom, 0.06)), side: THREE.DoubleSide }), N);
    mesh.frustumCulled = false;
    dummy.scale.setScalar(0); dummy.updateMatrix();
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, dummy.matrix);
    scene.add(mesh); noInk.push(mesh);
    const blobs = PARTS.filter(q => q.k === 'crown');
    // The ground under a point. Off the plinth there is none.
    const floor = (x, z) => (Math.abs(x) > 7 || z > 10 || z < -28.5 ? -99 : z < 4 ? 0.21 : z < 6.8 ? 0.16 : 0.01);
    function emit(push) {
      const p = list.find(q => !q.on);
      if (!p) return;
      const b = blobs[Math.floor(Math.random() * blobs.length)], a = rand(0, 6.283), e = rand(-0.9, 0.5), r = b.r * rand(0.7, 1);
      Object.assign(p, {
        on: true, land: 0, x: b.p[0] + Math.cos(a) * Math.cos(e) * r, y: b.p[1] + Math.sin(e) * r, z: b.p[2] + Math.sin(a) * Math.cos(e) * r,
        vx: Math.cos(a) * push, vy: push * rand(0, 0.8), vz: Math.sin(a) * push, a: rand(0, 6.283), spin: rand(2, 6), rx: rand(0, 6.283), rz: rand(0, 6.283),
      });
    }
    poke('tree', new THREE.Vector3(-5, 4.9, 6.1), 1.9, () => {
      if (still()) {
        // No motion: the petals just lie under the tree.
        for (let i = 0; i < 30; i++) { const p = list.find(q => !q.on); if (p) Object.assign(p, { on: true, land: rand(8, 14), x: rand(-6.9, -2.5), z: rand(4.2, 8.8), a: rand(0, 6.283) }); }
        return;
      }
      for (let i = 0; i < 70; i++) emit(rand(0.6, 2.2));
      gsap.fromTo(s, { shake: 1 }, { shake: 0, duration: 1, ease: 'power2.out' });
    });
    let next = 1, busy = false;
    updates.push((t, dt) => {
      crown.rotation.z = still() ? 0 : Math.sin(t * 0.9) * 0.012 + s.shake * Math.sin(t * 30) * 0.035;
      if (!still() && (next -= dt) < 0) { next = rand(0.5, 1.4); emit(0); }
      if (!busy && !list.some(p => p.on)) return;
      busy = false;
      list.forEach((p, i) => {
        if (!p.on) return;
        busy = true;
        let k = 1;
        if (p.land) {
          // A landed petal lies flat, then shrinks away.
          p.land -= dt; k = Math.min(1, p.land);
          if (p.land <= 0) p.on = false;
          dummy.position.set(p.x, floor(p.x, p.z) + 0.015, p.z); dummy.rotation.set(-Math.PI / 2, 0, p.a);
        } else {
          p.vy = Math.max(-0.95, p.vy - 2.6 * dt); p.vx *= 1 - 1.5 * dt; p.vz *= 1 - 1.5 * dt;
          p.x += (p.vx + 0.3 + Math.sin(t * 2.5 + p.a) * 0.5) * dt; p.z += (p.vz + Math.cos(t * 2.1 + p.a) * 0.3) * dt; p.y += p.vy * dt;
          p.rx += p.spin * dt; p.rz += p.spin * 0.6 * dt;
          const f = floor(p.x, p.z);
          if (p.y <= f + 0.02 && p.y > f - 0.3) p.land = rand(10, 18);
          else if (p.y < -5) p.on = false;
          dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.a, p.rz);
        }
        dummy.scale.setScalar(p.on ? k : 0); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  /* ---------- chimney smoke: round puffs that rise and shrink ---------- */
  {
    const N = 14, list = Array.from({ length: N }, () => ({ on: false })), dummy = new THREE.Object3D(), top = [-1.9, 8.2, -6.5];
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshLambertMaterial({ color: lin([0.88, 0.012, 285]), flatShading: true }), N);
    mesh.frustumCulled = false;
    dummy.scale.setScalar(0); dummy.updateMatrix();
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, dummy.matrix);
    scene.add(mesh);
    const emit = (delay = 0) => { const p = list.find(q => !q.on); if (p) Object.assign(p, { on: true, age: -delay, life: rand(2.4, 3.1), a: rand(0, 6.283), size: rand(0.7, 1.15) }); };
    poke('chimney', new THREE.Vector3(top[0], 7.7, top[2]), 0.75, () => { for (let i = 0; i < 5; i++) emit(i * 0.16); });
    let next = 2, busy = false;
    updates.push((t, dt) => {
      if (!still() && (next -= dt) < 0) { next = rand(2.6, 4.2); emit(); }
      if (!busy && !list.some(p => p.on)) return;
      busy = false;
      list.forEach((p, i) => {
        if (!p.on) return;
        busy = true;
        p.age += dt;
        const u = Math.max(0, p.age) / p.life;
        if (u >= 1) p.on = false;
        // With reduced motion a puff stays over the chimney.
        const rise = still() ? 0.4 : 1;
        dummy.position.set(top[0] + (0.9 * u * u * 2.6 + Math.sin(p.a + u * 5) * 0.12) * rise, top[1] + 2.9 * u * (1 - 0.25 * u) * rise, top[2] + Math.cos(p.a + u * 4) * 0.12);
        dummy.rotation.set(p.a, u * 2 + p.a, 0);
        dummy.scale.setScalar(p.on && p.age > 0 ? p.size * Math.sin(Math.PI * Math.pow(u, 0.55)) * (0.55 + 0.6 * u) : 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  /* ---------- basketball: lies in the lane, flies to the hoop ---------- */
  {
    const rest = [1.7, 0.18, -24.3], rim = [3.5, 2.95, -22.88], s = { x: rest[0], y: rest[1], z: rest[2], roll: 0, busy: false };
    const ball = body([part(new THREE.IcosahedronGeometry(0.13, 1), COL.ball)]);
    scene.add(ball);
    poke('ball', ball.position, 0.45, () => {
      if (s.busy) return;
      s.busy = true;
      const done = () => { s.busy = false; };
      if (still()) { gsap.timeline({ onComplete: done }).to(s, { y: 0.6, duration: 0.2 }).to(s, { y: rest[1], duration: 0.2 }); return; }
      // Up to the rim, down through it, then two bounces back home.
      gsap.timeline({ onComplete: done })
        .to(s, { x: rim[0], z: rim[2], duration: 0.9, ease: 'none' }, 0)
        .to(s, { y: 4.5, duration: 0.45, ease: 'power2.out' }, 0).to(s, { y: rim[1], duration: 0.45, ease: 'power2.in' }, 0.45)
        .to(s, { y: rest[1], duration: 0.38, ease: 'power2.in' }, 0.9)
        .to(s, { x: rest[0], z: rest[2], duration: 1.1, ease: 'power1.out' }, 1.28)
        .to(s, { y: 1.2, duration: 0.25, ease: 'power2.out' }, 1.28).to(s, { y: rest[1], duration: 0.25, ease: 'power2.in' }, 1.53)
        .to(s, { y: 0.55, duration: 0.17, ease: 'power2.out' }, 1.78).to(s, { y: rest[1], duration: 0.17, ease: 'power2.in' }, 1.95)
        .to(s, { roll: '+=9', duration: 2.4, ease: 'power1.out' }, 0);
    });
    updates.push(() => { ball.position.set(s.x, s.y, s.z); ball.rotation.set(s.roll, 0, s.roll * 0.6); });
  }

  return { noInk, update(t, dt) { for (const f of updates) f(t, dt); } };
}
