// East Van: the Toy-town scene, built in three.js from lot.js.
// Static parts are painted and merged: one draw call for all of them.
// A part with dyn moves on a hinge. A part with sw is a light switch.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gsap } from 'gsap';
import { reduced } from '../shared/stim.js';
import { COL, PARTS, WIRES, POKES } from './lot.js';
import { lin, lift, lerp, paint, PAINT, glowMat, beamGeo } from './kit.js';
import { buildLife } from './life.js';

/* ---------- geometry from parts ---------- */
const roofEave = q => { const hw = q.s[0] / 2 + q.over, slope = q.s[1] / (q.s[0] / 2); return { hw, slope, y: q.p[1] + q.s[1] - slope * hw }; };
function geomsOf(q) {
  const out = [];
  const add = (g, x, y, z) => { out.push(g.translate(x, y, z)); };
  if (q.t === 'box') add(new THREE.BoxGeometry(...q.s), ...q.p);
  else if (q.t === 'cyl') { const g = new THREE.CylinderGeometry(q.r, q.r, q.h, 12); if (q.ax === 'z') g.rotateX(Math.PI / 2); add(g, ...q.p); }
  else if (q.t === 'blob') add(new THREE.IcosahedronGeometry(q.r, 1), ...q.p);
  else if (q.t === 'beam') out.push(beamGeo(q.a, q.b, q.w));
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
  }
  return out.map(g => paint(g, q.k === 'lid' ? lift(COL[q.c], 0.05) : COL[q.c]));
}

/* ---------- how each mover moves, and how its poke runs ---------- */
// k runs 0 to 1. h is the hinge.
const MOVES = {
  lidA: (g, k) => { g.rotation.x = -1.9 * k; },
  lidB: (g, k) => { g.rotation.x = -1.9 * k; },
  door: (g, k) => { g.rotation.y = -1.35 * k; },
  gate: (g, k) => { g.rotation.y = 1.25 * k; },
  bluebox: (g, k, h) => { g.position.y = h[1] + 0.55 * k; g.rotation.z = 0.28 * Math.sin(k * 9.4); },
  van: (g, k) => { g.position.y = 0.16 * k; g.rotation.z = 0.03 * Math.sin(k * 12); },
};
const OFF = new THREE.Color(0.11, 0.16, 0.5);

export function buildTown(skyTexture) {
  const scene = new THREE.Scene();
  scene.background = skyTexture;
  const hemi = new THREE.HemisphereLight(lin([0.74, 0.08, 285]), lin([0.62, 0.07, 60]), 2.5);
  const sun = new THREE.DirectionalLight(lin([0.93, 0.09, 62]), 3.3);
  sun.position.set(-15, 11, 21); sun.target.position.set(0, 2, -1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
  scene.add(hemi, sun, sun.target);

  // Sort the parts: static paint, ground, crown, flowers, glow, switches, movers.
  const bins = { paint: [], ground: [], crown: [], flower: [], glow: [] }, sw = {}, mv = {};
  for (const q of PARTS) {
    const geos = geomsOf(q);
    if (q.dyn) {
      const m = mv[q.dyn] ||= { hinge: q.hinge, paint: [], glow: [], sw: {} };
      for (const g of geos) g.translate(-q.hinge[0], -q.hinge[1], -q.hinge[2]);
      (q.sw ? (m.sw[q.sw] ||= []) : q.glow ? m.glow : m.paint).push(...geos);
    }
    if (q.sw) { sw[q.sw] ||= { on: !!q.on, gain: q.gain || 1.5, k: q.on ? 1 : 0, geos: [], mat: null }; if (!q.dyn) sw[q.sw].geos.push(...geos); }
    if (q.dyn || q.sw) continue;
    const bin = q.glow ? 'glow' : q.k === 'ground' || q.k === 'plinth' ? 'ground' : q.k === 'crown' ? 'crown' : q.k === 'flower' ? 'flower' : 'paint';
    bins[bin].push(...geos);
  }
  // Wires are thin tubes, cut where the plinth ends.
  for (const w of WIRES) {
    const ta = (-7.5 - w.a[0]) / (w.b[0] - w.a[0]), tb = (7.5 - w.a[0]) / (w.b[0] - w.a[0]);
    const t0 = Math.max(0, Math.min(ta, tb)), t1 = Math.min(1, Math.max(ta, tb)), pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = lerp(t0, t1, i / 12);
      pts.push(new THREE.Vector3(lerp(w.a[0], w.b[0], t), lerp(w.a[1], w.b[1], t) - w.sag * 4 * t * (1 - t), lerp(w.a[2], w.b[2], t)));
    }
    bins.paint.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.024, 5), COL.wire));
  }
  const mesh = (geos, mat, cast, receive = true) => { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = cast; m.receiveShadow = receive; return m; };
  const glow = glowMat();
  const flowers = mesh(bins.flower, PAINT, false);
  // The crown turns about the foot of the trunk.
  const crown = mesh(bins.crown, PAINT, true);
  crown.geometry.translate(5, -0.15, -6.1); crown.position.set(-5, 0.15, 6.1);
  scene.add(mesh(bins.paint, PAINT, true), mesh(bins.ground, PAINT, false), mesh(bins.glow, glow, false, false), crown, flowers);
  for (const s of Object.values(sw)) s.mat = glowMat(s.gain);
  for (const id in sw) if (sw[id].geos.length) scene.add(mesh(sw[id].geos, sw[id].mat, false, false));
  for (const id in mv) {
    const m = mv[id], g = m.group = new THREE.Group();
    g.position.set(...m.hinge); m.k = 0; m.open = false;
    if (m.paint.length) g.add(mesh(m.paint, PAINT, true));
    if (m.glow.length) g.add(mesh(m.glow, glow, false, false));
    for (const s in m.sw) g.add(mesh(m.sw[s], sw[s].mat, false, false));
    scene.add(g);
  }

  // Lamps that light the scene: each follows a switch or a mover.
  const lamps = [];
  const lamp = (light, power, of) => { scene.add(light); lamps.push({ light, power, of }); return light; };
  lamp(new THREE.PointLight(lin([0.9, 0.13, 75]), 0, 11, 2), 16, () => sw.light.k).position.set(2.78, 3.35, -0.7);
  lamp(new THREE.PointLight(lin([0.88, 0.13, 68]), 0, 9, 2), 14, () => Math.max(0, mv.door.k)).position.set(1.8, 2.6, -0.7);
  lamp(new THREE.PointLight(lin([0.9, 0.11, 70]), 0, 8, 2), 7, () => sw.string.k).position.set(0, 3.4, 1.3);
  const street = lamp(new THREE.SpotLight(lin([0.86, 0.14, 65]), 0, 20, 1.05, 0.8, 2), 420, () => sw.street.k);
  street.position.set(3.9, 7.4, 8.25); street.target.position.set(3.6, 0, 6.6); scene.add(street.target);
  lamp(new THREE.PointLight(lin([0.95, 0.08, 90]), 0, 7, 2), 9, () => sw.van.k).position.set(0.3, 0.9, 8.5);

  /* ---------- pokes ---------- */
  const still = () => reduced();
  const flip = (id, flicker) => () => {
    const s = sw[id];
    s.on = !s.on;
    gsap.killTweensOf(s);
    if (s.on && flicker && !still()) gsap.timeline().to(s, { k: 0.8, duration: 0.05 }).to(s, { k: 0.1, duration: 0.09 }).to(s, { k: 0.9, duration: 0.05 }).to(s, { k: 0.25, duration: 0.12 }).to(s, { k: 1, duration: 0.25 });
    else gsap.to(s, { k: s.on ? 1 : 0, duration: still() ? 0 : 0.25, ease: 'power2.out' });
  };
  const swing = (id, open, close) => () => {
    const m = mv[id];
    m.open = !m.open;
    gsap.to(m, { k: m.open ? 1 : 0, ...(m.open ? open : close), ...(still() ? { duration: 0 } : {}) });
  };
  const pulse = (id, up, hold, down, ease) => () => {
    const m = mv[id];
    gsap.killTweensOf(m);
    if (still()) gsap.timeline().set(m, { k: 1 }).set(m, { k: 0 }, 0.5);
    else gsap.timeline().to(m, { k: 1, duration: up, ease: 'power2.out' }).to(m, { k: 0, duration: down, ease }, '+=' + hold);
  };
  const vanLights = flip('van'), vanBounce = pulse('van', 0.09, 0, 1.3, 'elastic.out(1, 0.28)');
  const fire = {
    light: flip('light'), string: flip('string'), street: flip('street', true),
    wFront: flip('wFront'), wAttic: flip('wAttic'), wE1: flip('wE1'), wE2: flip('wE2'), wW1: flip('wW1'), wW2: flip('wW2'),
    door: swing('door', { duration: 0.7, ease: 'back.out(1.6)' }, { duration: 0.45, ease: 'power2.in' }),
    gate: swing('gate', { duration: 0.9, ease: 'elastic.out(1, 0.5)' }, { duration: 0.5, ease: 'power2.in' }),
    lidA: pulse('lidA', 0.2, 0.25, 0.6, 'bounce.out'), lidB: pulse('lidB', 0.2, 0.25, 0.6, 'bounce.out'),
    bluebox: pulse('bluebox', 0.18, 0, 0.55, 'bounce.out'),
    van: () => { vanLights(); vanBounce(); },
  };
  const pokes = POKES.map(q => ({ id: q.id, pos: new THREE.Vector3(...q.at), r: q.r, fire: fire[q.id] }));
  const life = buildLife(scene, crown, pokes);

  const on = new THREE.Color();
  return {
    scene, pokes,
    // The lens leaves these out of the ink line.
    noInk: [flowers, ...life.noInk],
    update(t, dt) {
      for (const s of Object.values(sw)) {
        s.mat.color.lerpColors(OFF, on.setScalar(s.gain), s.k);
        // The glow mask follows the switch: off is no glow.
        s.mat.opacity = 1 - 0.5 * Math.min(1, s.k);
      }
      for (const id in mv) MOVES[id](mv[id].group, mv[id].k, mv[id].hinge);
      for (const l of lamps) l.light.intensity = l.power * l.of();
      life.update(t, dt);
    },
  };
}
