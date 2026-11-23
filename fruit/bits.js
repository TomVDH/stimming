// Fruit bits: arils, sacs and seeds that fall out of a flicked piece.
// Each bit is a juice bead (the same optics as the cut faces), shaped as a teardrop.
// They fall, bounce with friction, roll, push each other apart and off the fruit, then rest.
import * as THREE from 'three';
import { beadMesh } from './half.js';

const MAX = 90;

// A teardrop: a sphere drawn out at one end.
function teardrop() {
  const g = new THREE.SphereGeometry(1, 18, 12);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i), k = 1 - 0.38 * Math.max(y, 0) ** 2;
    P.setXYZ(i, P.getX(i) * k, y * (y > 0 ? 1.15 : 1), P.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

export function makeBits(U, F, onBounce = null) {
  const cfg = F.bits;
  if (!cfg) return { mesh: null, spawn() {}, step() {}, clear() {}, get busy() { return false; }, dispose() {} };
  const R = Math.random;
  const proto = Array.from({ length: MAX }, () => ({ p: [0, -99, 0], ph: 0, s: cfg.s, col: cfg.color(R), sig: cfg.sig, seed: cfg.seed }));
  const mesh = beadMesh(U, proto, { seedCol: cfg.seedCol, scale: cfg.scale ?? 12, wet: cfg.wet ?? 1.2, geo: teardrop() });
  mesh.count = 0;
  const bits = [];
  // The bit's own size for contact: its widest half-axis.
  const rad = Math.max(...cfg.s);
  const M = new THREE.Matrix4(), S = new THREE.Vector3(), dq = new THREE.Quaternion();
  const d = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  let moving = false;
  return {
    mesh,
    get busy() { return moving; },
    // n bits from a disc of radius r round O, facing N, thrown along dir.
    spawn(O, N, r, dir, n) {
      t1.set(0, 1, 0).cross(N);
      if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
      t1.normalize();
      t2.crossVectors(N, t1);
      for (let i = 0; i < n; i++) {
        // Past the limit the oldest bit is reused.
        const b = bits.length < MAX ? { slot: bits.length } : bits.shift();
        const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * r;
        b.p = O.clone().addScaledVector(t1, Math.cos(a) * rr).addScaledVector(t2, Math.sin(a) * rr).addScaledVector(N, 0.03);
        b.v = N.clone().multiplyScalar(0.6 + R() * 1.1).addScaledVector(dir, 0.8 + R() * 1.2);
        b.v.y += 0.9 + R() * 1.3;
        b.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6));
        b.w = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(22);
        b.k = 0.88 + R() * 0.24;
        b.rest = false;
        b.hit = 0;
        bits.push(b);
      }
      // Slots follow the order in the list.
      bits.forEach((b, i) => { b.slot = i; });
      moving = true;
    },
    // spheres: [{ c, r }] the fruit's pieces, to bounce off.
    step(dt, floorY, spheres) {
      if (!bits.length) { mesh.count = 0; return; }
      const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = Math.min(dt, 0.05) / n;
      moving = false;
      for (let s = 0; s < n; s++) {
        for (const b of bits) {
          if (b.rest) continue;
          b.v.y -= 9.8 * h;
          b.v.multiplyScalar(Math.exp(-h * 0.4));
          b.p.addScaledVector(b.v, h);
          const wl = b.w.length();
          if (wl > 1e-4) { dq.setFromAxisAngle(d.copy(b.w).divideScalar(wl), wl * h); b.q.premultiply(dq); }
          // The floor: a bounce that loses most of its height, and friction that starts a roll.
          const lo = floorY + rad * 0.7 * b.k;
          if (b.p.y < lo) {
            b.p.y = lo;
            if (b.v.y < 0) {
              if (b.v.y < -1.2 && performance.now() - b.hit > 120) { b.hit = performance.now(); onBounce?.(-b.v.y); }
              b.v.y *= -0.3;
            }
            b.v.x *= Math.exp(-h * 6); b.v.z *= Math.exp(-h * 6);
            // Rolling: the spin follows the slide.
            d.set(b.v.z, 0, -b.v.x).divideScalar(rad * b.k);
            b.w.lerp(d, Math.min(1, h * 12));
          }
          // The fruit's pieces push a bit out.
          for (const sp of spheres) {
            d.subVectors(b.p, sp.c);
            const l = d.length(), m = sp.r + rad * b.k;
            if (l < m && l > 1e-5) {
              d.divideScalar(l);
              b.p.addScaledVector(d, m - l);
              const vn = b.v.dot(d);
              if (vn < 0) b.v.addScaledVector(d, -1.4 * vn);
            }
          }
        }
        // Bits push each other apart.
        for (let i = 0; i < bits.length; i++) for (let j = i + 1; j < bits.length; j++) {
          const a = bits[i], c = bits[j];
          if (a.rest && c.rest) continue;
          d.subVectors(c.p, a.p);
          const l = d.length(), m = rad * (a.k + c.k) * 0.85;
          if (l < m && l > 1e-5) {
            d.divideScalar(l);
            const push = (m - l) * 0.5;
            a.p.addScaledVector(d, -push); c.p.addScaledVector(d, push);
            const vr = c.v.clone().sub(a.v).dot(d);
            if (vr < 0) { a.v.addScaledVector(d, vr * 0.6); c.v.addScaledVector(d, -vr * 0.6); a.rest = c.rest = false; }
          }
        }
      }
      for (const b of bits) {
        // A bit that has stopped on the floor rests until something moves it.
        const onFloor = b.p.y < floorY + rad * 0.7 * b.k + 0.002;
        if (!b.rest && onFloor && b.v.lengthSq() < 0.004 && Math.abs(b.v.y) < 0.05) { b.rest = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
        if (!b.rest) moving = true;
        S.set(cfg.s[0] * b.k, cfg.s[1] * b.k, cfg.s[2] * b.k);
        M.compose(b.p, b.q, S);
        mesh.setMatrixAt(b.slot, M);
      }
      mesh.count = bits.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
    clear() { bits.length = 0; mesh.count = 0; moving = false; },
    dispose() { mesh.geometry.dispose(); mesh.material.dispose(); },
  };
}
