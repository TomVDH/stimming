// East Van: the Toy-town scene, built in three.js from lot.js.
// Static parts merge by colour, so one colour is one draw call.
// Parts with dyn move: they sit in a group at their hinge.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gsap } from 'gsap';
import { reduced, linFit } from '../shared/stim.js';
import { COL, PARTS, WIRES, CROW, POKES } from './lot.js';

const lin = c => new THREE.Color().setRGB(...linFit(c[0], c[1], c[2]));
const lift = (c, d) => [Math.min(1, Math.max(0, c[0] + d)), c[1], c[2]];
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- state and pokes ---------- */
export const state = { lightOn: false, light: 0, crowU: 0, flying: false, hop: 0, doorOpen: false, door: 0, lidA: 0, lidB: 0 };
export { POKES };
const HOME = new THREE.Vector3(...CROW.home);
// The crow's loop: out to the left, up, and back from behind.
function crowAt(u, out) {
  const s = Math.sin(Math.PI * u), s2 = Math.sin(2 * Math.PI * u);
  return out.set(HOME.x - 4.2 * s * s, HOME.y + 2.4 * s + 0.8 * s2 + 0.5 * Math.sin(Math.PI * state.hop), HOME.z + 2 * s2);
}
export function poke(id) {
  const still = reduced();
  if (id === 'light') {
    state.lightOn = !state.lightOn;
    gsap.to(state, { light: state.lightOn ? 1 : 0, duration: still ? 0 : 0.3, ease: 'power2.out' });
  } else if (id === 'door') {
    state.doorOpen = !state.doorOpen;
    gsap.to(state, { door: state.doorOpen ? 1 : 0, duration: still ? 0 : state.doorOpen ? 0.7 : 0.45, ease: state.doorOpen ? 'back.out(1.6)' : 'power2.in' });
  } else if (id === 'crow') {
    if (state.flying) return;
    state.flying = true;
    const done = () => { state.flying = false; state.crowU = 0; state.hop = 0; };
    if (still) gsap.fromTo(state, { hop: 0 }, { hop: 1, duration: 0.5, ease: 'none', onComplete: done });
    else gsap.fromTo(state, { crowU: 0 }, { crowU: 1, duration: 3.6, ease: 'sine.inOut', onComplete: done });
  } else {
    gsap.killTweensOf(state, id);
    if (still) gsap.timeline().set(state, { [id]: 1 }).set(state, { [id]: 0 }, 0.5);
    else gsap.timeline().to(state, { [id]: 1, duration: 0.2, ease: 'power2.out' }).to(state, { [id]: 0, duration: 0.6, ease: 'bounce.out' }, '+=0.25');
  }
}

/* ---------- geometry from parts ---------- */
const roofEave = q => { const hw = q.s[0] / 2 + q.over, slope = q.s[1] / (q.s[0] / 2); return { hw, slope, y: q.p[1] + q.s[1] - slope * hw }; };
const Z = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3(), quat = new THREE.Quaternion();
function geomsOf(q) {
  const out = [];
  const add = (g, x, y, z) => { g.translate(x, y, z); out.push(g.index ? g.toNonIndexed() : g); };
  if (q.t === 'box') add(new THREE.BoxGeometry(...q.s), ...q.p);
  else if (q.t === 'cyl') add(new THREE.CylinderGeometry(q.r, q.r, q.h, 10), ...q.p);
  else if (q.t === 'blob') add(new THREE.IcosahedronGeometry(q.r, 1), ...q.p);
  else if (q.t === 'prism') {
    const sh = new THREE.Shape(), w = q.s[0] / 2;
    sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(0, q.s[1]); sh.closePath();
    add(new THREE.ExtrudeGeometry(sh, { depth: q.s[2], bevelEnabled: false }), q.p[0], q.p[1], q.p[2] - q.s[2] / 2);
  } else if (q.t === 'roof') {
    // Each side is a run of courses. Each course lifts its lower edge.
    const e = roofEave(q), a = Math.atan(e.slope), len = Math.hypot(e.hw, e.slope * e.hw) + 0.05, top = q.p[1] + q.s[1];
    const n = q.courses || 1, tilt = n > 1 ? 0.045 : 0, run = len / n;
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const mid = (i + 0.5) * run, lap = n > 1 ? 0.08 : 0;
      const cx = q.p[0] + s * (Math.cos(a) * mid + Math.sin(a) * q.th / 2), cy = top - Math.sin(a) * mid + Math.cos(a) * q.th / 2;
      add(new THREE.BoxGeometry(run + lap, q.th, q.s[2]).rotateZ(-s * (a - tilt)), cx, cy, q.p[2]);
    }
  } else if (q.t === 'pickets') {
    for (let i = 0; i < q.n; i++) {
      const u = lerp(q.a, q.b, i / Math.max(1, q.n - 1)), g = new THREE.BoxGeometry(q.w, q.h, q.w);
      if (q.ax === 'z') add(g, q.at, q.y + q.h / 2, u); else add(g, u, q.y + q.h / 2, q.at);
    }
  } else if (q.t === 'boards') {
    // The lower edge of each board stands out from the wall.
    const n = Math.round((q.y1 - q.y0) / q.h), mid = (q.a + q.b) / 2, lean = 0.14;
    for (let i = 0; i < n; i++) {
      const y = q.y0 + (i + 0.5) * q.h, w = (q.b - q.a) * (q.tri ? 1 - (i + 0.5) / n : 1) + 0.04;
      if (q.face === 'z') add(new THREE.BoxGeometry(w, q.h, 0.03).rotateX(-q.out * lean), mid, y, q.at + q.out * 0.03);
      else add(new THREE.BoxGeometry(0.03, q.h, w).rotateZ(q.out * lean), q.at + q.out * 0.03, y, mid);
    }
  } else if (q.t === 'beam') {
    dir.set(q.b[0] - q.a[0], q.b[1] - q.a[1], q.b[2] - q.a[2]);
    const g = new THREE.BoxGeometry(q.w, q.w, dir.length());
    g.applyQuaternion(quat.setFromUnitVectors(Z, dir.clone().normalize()));
    add(g, (q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2, (q.a[2] + q.b[2]) / 2);
  }
  return out;
}

// Lit parts carry a glow mask in alpha: the lens blooms them.
// NoBlending writes that alpha as it is.
const glowMat = (c, gain = 1.5) => new THREE.MeshBasicMaterial({ color: lin(c).multiplyScalar(gain), transparent: true, opacity: 0.5, blending: THREE.NoBlending });
const paintMat = c => new THREE.MeshLambertMaterial({ color: lin(c), flatShading: true });

export function buildTown(skyTexture) {
  const scene = new THREE.Scene();
  scene.background = skyTexture;
  const hemi = new THREE.HemisphereLight(lin([0.74, 0.08, 285]), lin([0.62, 0.07, 60]), 2.5);
  const sun = new THREE.DirectionalLight(lin([0.93, 0.09, 62]), 3.3);
  sun.position.set(-15, 11, 21); sun.target.position.set(0, 2, -1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
  const lampPart = PARTS.find(q => q.id === 'lamp');
  const bulb = new THREE.PointLight(lin([0.9, 0.13, 75]), 0, 11, 2);
  bulb.position.set(lampPart.p[0], lampPart.p[1] - 0.1, lampPart.p[2] + 0.7);
  // The open door throws the hall light onto the porch.
  const hall = new THREE.PointLight(lin([0.88, 0.13, 68]), 0, 9, 2);
  hall.position.set(1.8, 2.6, -0.7);
  scene.add(hemi, sun, sun.target, bulb, hall);

  // Sort every part into a bucket: one per colour, per moving group.
  const buckets = new Map(), movers = {}, crowns = [];
  let lampMat;
  for (const q of PARTS) {
    const lit = (q.k === 'pane' && q.lit) || q.k === 'lamp', flat = q.k === 'ground' || q.k === 'plinth';
    const key = (q.dyn || '') + '|' + q.c + (lit ? '*' : '') + (flat ? '_' : '') + (q.k === 'crown' ? '^' : '') + (q.k === 'lamp' ? '!' : '');
    if (!buckets.has(key)) buckets.set(key, { q, lit, flat, geos: [] });
    const geos = geomsOf(q);
    if (q.dyn) for (const g of geos) g.translate(-q.hinge[0], -q.hinge[1], -q.hinge[2]);
    buckets.get(key).geos.push(...geos);
  }
  for (const { q, lit, flat, geos } of buckets.values()) {
    const mat = q.k === 'lamp' ? glowMat(COL[q.c], 1) : lit ? glowMat(COL[q.c]) : paintMat(q.k === 'lid' ? lift(COL[q.c], 0.05) : COL[q.c]);
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = !lit && !flat; m.receiveShadow = !lit;
    if (q.k === 'lamp') lampMat = mat;
    if (q.dyn) {
      if (!movers[q.dyn]) { movers[q.dyn] = new THREE.Group(); movers[q.dyn].position.set(...q.hinge); scene.add(movers[q.dyn]); }
      movers[q.dyn].add(m);
      continue;
    }
    if (q.k === 'crown') {
      // The crown turns about the foot of the trunk.
      m.geometry.translate(5, -0.15, -6.1); m.position.set(-5, 0.15, 6.1);
      crowns.push(m);
    }
    scene.add(m);
  }

  // Wires are thin tubes, cut where the plinth ends.
  const tubes = WIRES.map(w => {
    const ta = (-7.5 - w.a[0]) / (w.b[0] - w.a[0]), tb = (7.5 - w.a[0]) / (w.b[0] - w.a[0]);
    const t0 = Math.max(0, Math.min(ta, tb)), t1 = Math.min(1, Math.max(ta, tb)), pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = lerp(t0, t1, i / 12);
      pts.push(new THREE.Vector3(lerp(w.a[0], w.b[0], t), lerp(w.a[1], w.b[1], t) - w.sag * 4 * t * (1 - t), lerp(w.a[2], w.b[2], t)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.024, 5);
  });
  scene.add(new THREE.Mesh(mergeGeometries(tubes), new THREE.MeshLambertMaterial({ color: lin(COL.wire) })));

  // The crow: a body, a head, a beak, a tail and two wings.
  const crow = new THREE.Group(), black = paintMat(COL.crow);
  const piece = (geo, x, y, z, mat = black) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; crow.add(m); return m; };
  piece(new THREE.IcosahedronGeometry(0.17, 1).scale(0.95, 1.05, 1.5), 0, 0.2, 0);
  piece(new THREE.IcosahedronGeometry(0.105, 1), 0, 0.4, 0.2);
  piece(new THREE.ConeGeometry(0.045, 0.2, 5).rotateX(Math.PI / 2), 0, 0.39, 0.37, paintMat([0.5, 0.03, 270]));
  piece(new THREE.BoxGeometry(0.14, 0.03, 0.3).rotateX(0.35), 0, 0.14, -0.34);
  const wingGeo = new THREE.BoxGeometry(0.42, 0.025, 0.24);
  const wingL = piece(wingGeo.clone().translate(-0.21, 0, 0), -0.1, 0.27, 0), wingR = piece(wingGeo.clone().translate(0.21, 0, 0), 0.1, 0.27, 0);
  scene.add(crow);

  const dim = lin(lift(COL.lamp, -0.4)), bright = lin([0.99, 0.08, 92]).multiplyScalar(2.2), next = new THREE.Vector3(), p = new THREE.Vector3();
  return {
    scene,
    // Where a poke target is now, in the world.
    at: q => (q.id === 'crow' ? crow.position : p.set(...q.at)),
    update(t) {
      lampMat.color.lerpColors(dim, bright, state.light);
      // The glow mask follows the lamp: off is no glow.
      lampMat.opacity = 1 - 0.5 * state.light;
      bulb.intensity = 16 * state.light;
      hall.intensity = 14 * Math.max(0, state.door);
      movers.lidA.rotation.x = -1.9 * state.lidA;
      movers.lidB.rotation.x = -1.9 * state.lidB;
      movers.door.rotation.y = -1.35 * state.door;
      const sway = reduced() ? 0 : Math.sin(t * 0.9) * 0.012;
      for (const m of crowns) m.rotation.z = sway;
      crowAt(state.crowU, crow.position);
      const air = state.flying && !reduced() ? Math.min(1, Math.sin(Math.PI * state.crowU) * 6) : 0;
      if (air > 0) {
        crowAt(Math.min(1, state.crowU + 0.01), next);
        crow.rotation.y = lerp(0.5, Math.atan2(next.x - crow.position.x, next.z - crow.position.z), air);
      } else crow.rotation.y = 0.5;
      // Folded wings hang down the body. In the air they beat.
      const beat = lerp(-1.45, Math.sin(t * 20) * 0.9, air);
      wingL.rotation.z = -beat; wingR.rotation.z = beat;
    },
  };
}
