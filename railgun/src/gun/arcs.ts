// @ts-nocheck
// Load order: fx/burst runs first.
import '../fx/burst.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { camera, rnd, scene } from '../setup.ts';
import { AX, BERM_R, L, LIFT, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { BAND } from '../clouds/bands.ts';
import { BRAKE_PORTS, halfH, halfW, noise3 } from './gun.ts';
import { starMat } from '../fx/burst.ts';
import { chaos, over, rage, ventT } from '../play/charge.ts';

/* ---------- arcs: lightning over the barrel ---------- */
// Ten arcs at most, twenty segments each, as camera-facing ribbons.
// The CPU rewrites every point each drawn frame, so the arcs flicker.
const ARC_N = 16, ARC_SEG = 20, ARC_PTS = ARC_SEG + 1;
const arcGeo = new THREE.BufferGeometry();
{
  const n = ARC_N * ARC_SEG, pos = new Float32Array(n * 12), idx = [];
  for (let i = 0; i < n; i++) {
    const b = i * 4;
    pos.set([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], i * 12);
    idx.push(b, b + 2, b + 3, b, b + 3, b + 1);
  }
  arcGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  arcGeo.setIndex(idx);
  for (const name of ['aP0', 'aP1']) {
    const a = new THREE.BufferAttribute(new Float32Array(n * 12), 3);
    a.setUsage(THREE.DynamicDrawUsage);
    arcGeo.setAttribute(name, a);
  }
  const k = new THREE.BufferAttribute(new Float32Array(n * 8), 2);
  k.setUsage(THREE.DynamicDrawUsage);
  arcGeo.setAttribute('aK', k);
}
const arcMat = new THREE.ShaderMaterial({
  uniforms: { uRes: starMat.uniforms.uRes, uDpr: starMat.uniforms.uDpr, uArcC: { value: new THREE.Vector3(...linFit(0.88, 0.12, 278)) }, uArcW: { value: 1 } },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`
  attribute vec3 aP0, aP1;
  attribute vec2 aK;
  uniform vec2 uRes;
  uniform float uDpr, uArcW;
  varying float vY, vA, vSeed;
  void main() {
    if (aK.x < 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    // Depth is about a metre coarse at three kilometres.
    // The arc steps 12 m toward the eye, so the barrel skin never hides it.
    vec3 q0 = aP0 + normalize(cameraPosition - aP0) * 12.0, q1 = aP1 + normalize(cameraPosition - aP1) * 12.0;
    vec4 c0 = projectionMatrix * viewMatrix * vec4(q0, 1.0);
    vec4 c1 = projectionMatrix * viewMatrix * vec4(q1, 1.0);
    vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uRes;
    d = length(d) > 1e-3 ? normalize(d) : vec2(0.0, 1.0);
    // The ribbon is 8 px to each side.
    // The core sits in the middle.
    // The ribbon grows with the charge: 2.5 px to 5 px to each side.
    float W = 5.0 * uDpr * uArcW;
    vec4 c = position.x < 0.5 ? c0 : c1;
    c.xy += vec2(-d.y, d.x) * position.y * W / (0.5 * uRes) * c.w;
    vY = position.y * W; vA = aK.x; vSeed = aK.y;
    gl_Position = c;
  }`,
  fragmentShader: /* glsl */`
  uniform float uDpr, uArcW;
  uniform vec3 uArcC;
  varying float vY, vA, vSeed;
  void main() {
    float y = abs(vY), w = 0.9 * uDpr * uArcW, W = 5.0 * uDpr * uArcW;
    float core = exp(-y * y / (w * w) * 0.9);
    float halo = 0.22 * exp(-y * y / (W * W) * 2.5);
    gl_FragColor = vec4(mix(uArcC, vec3(1.0), 0.6 * core) * (core * 9.0 + halo * 3.0) * vA, 0.0);
  }`,
});
const arcs = new THREE.Mesh(arcGeo, arcMat);
arcs.frustumCulled = false;
arcs.renderOrder = BAND.sparks;
scene.add(arcs);
// Each live arc: two ends, birth, life, bow, seed.
const arcList = Array.from({ length: ARC_N }, () => ({ on: false, a: new THREE.Vector3(), b: new THREE.Vector3(), t0: 0, life: 0.1, bowV: new THREE.Vector3(), seed: 0, k: 1 }));
const arcP = Array.from({ length: ARC_PTS }, () => new THREE.Vector3());
const tmpC = new THREE.Vector3();
// The top of the plinth and its berm at r metres from the mount.
const plinthY = r => r < 396 ? 34 + LIFT : r < 456 ? 22 + LIFT : r < BERM_R ? LIFT * (BERM_R - r) / (BERM_R - 456) : 0;
// A point on the apron, just outside the plinth.
function rimPt(out, y, far = 0.2) {
  const th = rnd() * Math.PI * 2, k = 470 * (1.02 + rnd() * far);
  out.set(Math.sin(th) * k, y, Math.cos(th) * k);
  return th;
}
// The barrel's side and up at station a, as the gun turns.
// Returns the side, +1 or -1, that faces the eye.
export const arcSide = new THREE.Vector3(), arcUp = new THREE.Vector3(), arcO = new THREE.Vector3();
export function arcFrame(a) {
  barrelPt(a, 0, 0, arcO);
  barrelPt(a, 1, 0, arcSide).sub(arcO);
  barrelPt(a, 0, 1, arcUp).sub(arcO);
  return arcSide.dot(tmpC.subVectors(camera.position, arcO)) >= 0 ? 1 : -1;
}
// mode 'vent' drops a strike straight down from the barrel.
// mode 'corona' throws a streamer from the brake into the air.
export function spawnArc(st, mode = '') {
  const arc = arcList.find(x => !x.on);
  if (!arc) return;
  const a = st * L, hw = halfW(a) + 1.5, hh = halfH(a);
  const kind = rnd();
  arc.life = 0.08 + rnd() * 0.1;
  if (mode === 'vent' || (over > 0.05 && kind < 0.3 * over)) {
    // A far strike: from the barrel out across the plain.
    const vent = mode === 'vent';
    barrelPt(a, (rnd() - 0.5) * hw, -hh, arc.a);
    const sr = vent ? 20 + rnd() * 140 : 300 + rnd() * 700, sth = rnd() * Math.PI * 2;
    arc.b.set(arc.a.x + Math.sin(sth) * sr, 0, arc.a.z + Math.cos(sth) * sr);
    const rr = Math.hypot(arc.b.x, arc.b.z);
    arc.b.y = plinthY(rr);
    arc.bowV.set((rnd() - 0.5) * (vent ? 60 : 300), (vent ? 10 : 80) + rnd() * (vent ? 40 : 200), (rnd() - 0.5) * (vent ? 60 : 300));
    arc.life = vent ? 0.25 + rnd() * 0.2 : 0.2 + rnd() * 0.15;
  } else if (chaos > 0.6 && kind < 0.22 + 0.25 * rage) {
    // Strike: from the barrel down to the plinth under it.
    barrelPt(a, (rnd() - 0.5) * hw, -hh, arc.a);
    const sr = 60 + rnd() * 140, sth = rnd() * Math.PI * 2;
    arc.b.set(arc.a.x + Math.sin(sth) * sr, 0, arc.a.z + Math.cos(sth) * sr);
    const rr = Math.hypot(arc.b.x, arc.b.z);
    arc.b.y = plinthY(rr);
    arc.bowV.set((rnd() - 0.5) * 120, 40 + rnd() * 90, (rnd() - 0.5) * 120);
    arc.life = 0.15 + rnd() * 0.15;
  } else if (mode === 'corona') {
    // Corona: a streamer from a brake port out into the open air.
    // It reaches out and up, so it reads against the sky.
    const sd = arcFrame(L), port = BRAKE_PORTS[Math.floor(rnd() * BRAKE_PORTS.length)];
    barrelPt(port, sd * 24, (rnd() - 0.3) * 20, arc.a);
    const reach = 60 + 200 * rnd() * (0.4 + 0.6 * chaos);
    arc.b.copy(arc.a).addScaledVector(arcSide, sd * reach * (0.3 + 0.7 * rnd())).addScaledVector(arcUp, reach * (0.2 + 0.8 * rnd())).addScaledVector(AX, reach * rnd());
    arc.bowV.copy(arcUp).multiplyScalar(0.2 * reach * rnd()).addScaledVector(arcSide, sd * 0.2 * reach * rnd());
    arc.life = 0.12 + rnd() * 0.16;
  } else if (chaos > 0.4 && kind < 0.45) {
    // Crown: a tall crescent over the barrel's back, against the sky.
    arcFrame(a);
    barrelPt(a, -hw, hh * 0.6, arc.a);
    barrelPt(a + (rnd() - 0.5) * 60, hw, hh * 0.6, arc.b);
    arc.bowV.copy(arcUp).multiplyScalar(hh + 60 + rnd() * 160 * chaos);
  } else if (chaos > 0.25 && kind < 0.7) {
    // Crawler: a long arc along the slot on the flank that faces the eye.
    const len = 80 + rnd() * 180, sd = arcFrame(a);
    barrelPt(a, sd * hw, (rnd() - 0.5) * 12, arc.a);
    barrelPt(Math.min(a + len, L), sd * (halfW(Math.min(a + len, L)) + 1.5), (rnd() - 0.5) * 12, arc.b);
    arc.bowV.copy(arcSide).multiplyScalar(sd * (20 + rnd() * 40)).addScaledVector(arcUp, (rnd() - 0.3) * 40);
  } else {
    // Crackle: a short arc across the slot, on the near flank.
    const da = (rnd() - 0.5) * 30, sd = arcFrame(a);
    barrelPt(a, sd * hw, hh * (0.5 + 0.4 * rnd()), arc.a);
    barrelPt(a + da, sd * hw, -hh * (0.5 + 0.4 * rnd()), arc.b);
    arc.bowV.copy(arcSide).multiplyScalar(sd * (24 + rnd() * 36));
  }
  // Size and strength follow the charge: small, faint sparks first.
  const sz = mode === 'vent' ? 1 : 0.35 + 0.65 * Math.min(1, U.uCharge.value);
  arc.k = mode === 'vent' ? 1 : 0.3 + 0.7 * sz;
  if (sz < 1) { tmpC.addVectors(arc.a, arc.b).multiplyScalar(0.5); arc.a.lerp(tmpC, 1 - sz); arc.b.lerp(tmpC, 1 - sz); arc.bowV.multiplyScalar(sz); }
  arc.on = true; arc.t0 = state.simT; arc.seed = rnd() * 100;
  state.click(arc);
}
// Rebuild every live arc's points each frame.
// A bowed line with two octaves of jitter.
export function updateArcs() {
  const p0 = arcGeo.attributes.aP0, p1 = arcGeo.attributes.aP1, kk = arcGeo.attributes.aK;
  arcMat.uniforms.uArcW.value = 0.5 + 0.5 * Math.min(1, U.uCharge.value + (state.simT - ventT < 1 ? 1 : 0));
  let any = false, best = 0;
  for (let i = 0; i < ARC_N; i++) {
    const arc = arcList[i], base = i * ARC_SEG * 4;
    const age = state.simT - arc.t0;
    if (arc.on && age > arc.life) arc.on = false;
    if (!arc.on) { for (let j = 0; j < ARC_SEG * 4; j++) kk.setXY(base + j, 0, 0); continue; }
    any = true;
    const span = arc.a.distanceTo(arc.b);
    // Alpha flickers over the life; the first frame is the brightest.
    // Early arcs are small and faint; they grow with the charge.
    const al = arc.k * (1 - age / arc.life) * (0.6 + 0.4 * Math.abs(Math.sin(arc.seed + state.simT * 97)));
    // The brightest arc lights the gun.
    const lum = al * (0.6 + span / 300);
    if (lum > best) { best = lum; U.uArcL.value.set((arc.a.x + arc.b.x) / 2 + arc.bowV.x, (arc.a.y + arc.b.y) / 2 + arc.bowV.y, (arc.a.z + arc.b.z) / 2 + arc.bowV.z, lum); }
    for (let k = 0; k < ARC_PTS; k++) {
      const f = k / ARC_SEG, env = Math.sin(Math.PI * f);
      const q = arcP[k].lerpVectors(arc.a, arc.b, f);
      q.addScaledVector(arc.bowV, env);
      const j1 = span * 0.10 * env, j2 = span * 0.04 * env;
      q.x += j1 * noise3(arc.seed, k * 0.9, state.simT * 40) + j2 * noise3(arc.seed + 7, k * 2.3, state.simT * 60);
      q.y += j1 * noise3(arc.seed + 3, k * 0.9, state.simT * 40) + j2 * noise3(arc.seed + 11, k * 2.3, state.simT * 60);
      q.z += j1 * noise3(arc.seed + 5, k * 0.9, state.simT * 40) + j2 * noise3(arc.seed + 13, k * 2.3, state.simT * 60);
    }
    for (let sgm = 0; sgm < ARC_SEG; sgm++) {
      const a = arcP[sgm], b = arcP[sgm + 1];
      for (let v = 0; v < 4; v++) {
        const vi = base + sgm * 4 + v;
        p0.setXYZ(vi, a.x, a.y, a.z);
        p1.setXYZ(vi, b.x, b.y, b.z);
        kk.setXY(vi, al, arc.seed);
      }
    }
  }
  p0.needsUpdate = p1.needsUpdate = kk.needsUpdate = true;
  arcs.visible = any;
  // The arc light strobes harder at rage.
  if (!best) U.uArcL.value.w = 0; else U.uArcL.value.w *= 1 + 2.5 * rage;
}
export const arcsAlive = () => arcList.some(a => a.on);
/* ---------- end arcs ---------- */
