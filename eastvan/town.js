// East Van: one Toy-town diorama, built in three.js from zone files.
// Static parts are painted and merged: one draw call for all of them.
// A part with dyn moves on a hinge. A part with sw is a light switch.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gsap } from 'gsap';
import { reduced, quality } from '../shared/stim.js';
import { COL } from './lot.js';
import { lin, lift, lerp, paint, PAINT, glowMat, beamGeo } from './kit.js';


/* ---------- geometry from parts ---------- */
const roofEave = q => { const hw = q.s[0] / 2 + q.over, slope = q.s[1] / (q.s[0] / 2); return { hw, slope, y: q.p[1] + q.s[1] - slope * hw }; };
function geomsOf(q) {
  const out = [];
  const add = (g, x, y, z) => { out.push(g.translate(x, y, z)); };
  if (q.t === 'box') add(new THREE.BoxGeometry(...q.s), ...q.p);
  else if (q.t === 'cyl') {
    const g = new THREE.CylinderGeometry(q.r, q.r, q.h, q.r > 0.6 ? 20 : 12);
    if (q.ax === 'z') g.rotateX(Math.PI / 2); else if (q.ax === 'x') g.rotateZ(Math.PI / 2);
    add(g, ...q.p);
  } else if (q.t === 'ring') add(new THREE.TorusGeometry(q.r, q.tube, 6, 20).rotateX(Math.PI / 2), ...q.p);
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
      const u = lerp(q.a, q.b, i / Math.max(1, q.n - 1)), d = q.d || q.w;
      if (q.ax === 'z') add(new THREE.BoxGeometry(d, q.h, q.w), q.at, q.y + q.h / 2, u); else add(new THREE.BoxGeometry(q.w, q.h, d), u, q.y + q.h / 2, q.at);
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

// A switch that is off shows its colour through this dark tint.
const OFF = new THREE.Color(0.11, 0.16, 0.5);

// zones: plain data files, front to back. life: adds the creatures, or null.
export function buildTown(skyTexture, zones, life = null) {
  const all = key => zones.flatMap(z => z[key] || []);
  const PARTS = all('PARTS'), WIRES = all('WIRES'), POKES = all('POKES'), LAMPS = all('LAMPS');
  const MOVES = Object.assign({}, ...zones.map(z => z.MOVES)), ACTS = Object.assign({}, ...zones.map(z => z.ACTS));
  const scene = new THREE.Scene();
  scene.background = skyTexture;
  const hemi = new THREE.HemisphereLight(lin([0.74, 0.08, 285]), lin([0.62, 0.07, 60]), 2.5);
  const sun = new THREE.DirectionalLight(lin([0.93, 0.09, 62]), 3.3);
  sun.position.set(-15, 11, 12); sun.target.position.set(0, 2, -10);
  // The shadow covers the whole plinth, so High doubles the map.
  const size = quality() === 'high' ? 4096 : 2048;
  sun.castShadow = true; sun.shadow.mapSize.set(size, size);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 20, bottom: -20, near: 1, far: 80 });
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
  // An empty bin makes no mesh.
  const mesh = (geos, mat, cast, receive = true) => {
    if (!geos.length) return null;
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = cast; m.receiveShadow = receive;
    return m;
  };
  const glow = glowMat();
  const flowers = mesh(bins.flower, PAINT, false);
  // The crown turns about its pivot: the foot of the trunk.
  const crown = mesh(bins.crown, PAINT, true), pivot = PARTS.find(q => q.k === 'crown')?.pivot;
  if (crown && pivot) { crown.geometry.translate(-pivot[0], -pivot[1], -pivot[2]); crown.position.set(...pivot); }
  for (const m of [mesh(bins.paint, PAINT, true), mesh(bins.ground, PAINT, false), mesh(bins.glow, glow, false, false), crown, flowers]) if (m) scene.add(m);
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
  const lamps = LAMPS.map(l => {
    const light = l.to ? new THREE.SpotLight(lin(l.col), 0, l.range, 1.05, 0.8, 2) : new THREE.PointLight(lin(l.col), 0, l.range, 2);
    light.position.set(...l.at);
    if (l.to) { light.target.position.set(...l.to); scene.add(light.target); }
    scene.add(light);
    const [kind, id] = l.of.split(':'), src = kind === 'sw' ? sw[id] : mv[id];
    return { light, power: l.power, src };
  });

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
  // A poke runs its steps from ACTS. With none, it flips its own switch.
  const step = ([kind, id, ...rest]) => (kind === 'flip' ? flip(id, rest[0]) : kind === 'swing' ? swing(id, ...rest) : pulse(id, ...rest));
  const pokes = POKES.map(q => {
    const steps = (ACTS[q.id] || [['flip', q.id]]).map(step);
    return { id: q.id, pos: new THREE.Vector3(...q.at), r: q.r, fire: () => { for (const f of steps) f(); } };
  });
  const alive = life ? life(scene, crown, pokes) : { noInk: [], update() {} };

  const on = new THREE.Color();
  return {
    scene, pokes,
    // The lens leaves these out of the ink line.
    noInk: [flowers, ...alive.noInk].filter(Boolean),
    update(t, dt) {
      for (const s of Object.values(sw)) {
        s.mat.color.lerpColors(OFF, on.setScalar(s.gain), s.k);
        // The glow mask follows the switch: off is no glow.
        s.mat.opacity = 1 - 0.5 * Math.min(1, s.k);
      }
      for (const id in mv) MOVES[id](mv[id].group, mv[id].k, mv[id].hinge);
      for (const l of lamps) l.light.intensity = l.power * Math.max(0, Math.min(1, l.src.k));
      alive.update(t, dt);
    },
  };
}
