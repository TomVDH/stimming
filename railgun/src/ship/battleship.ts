// Load order: rock/asteroid runs first.
import '../rock/asteroid.ts';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { linFit, reduced } from '../../../shared/stim.js';
import { HULL, makeShip, ARRIVE, driftDeg, hulkAt, VACUUM, sunlit, SHIP_ALT } from '../../ship.js';
import { state } from '../state.ts';
import { camera, clamp, rad, rnd, scene } from '../setup.ts';
import { A0, END0, yUp } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { SEAM } from '../gun/gun.ts';
import { ast, astMat, astMesh } from '../rock/asteroid.ts';
import { PU, smoke } from '../rock/trail.ts';
import type { makeTrain } from '../rock/trail.ts';
import { frags } from '../rock/fragments.ts';
import type { makeFragTrail } from '../rock/fragments.ts';
import { starMat } from '../fx/burst.ts';
import { LINGER } from './hulks.ts';

/* ---------- the ship: a battleship in orbit ---------- */
// Hull frame: x runs stern to prow.
// y runs up and z runs to starboard.
// Hull units are HULL's metres.
// Each hulk merges its boxes into one mesh, pivoted at its centre.
const SHIP_DIST = 150000;
// The ship draws 1.2 times HULL.
// It spans 5 degrees.
// The hull frame keeps HULL's units, so the joints still match.
export const SHIP_SCALE = 1.2;
// The station sits on the rock's hold bearing, high in orbit.
const SHIP_EL = rad(36);
// The orbit climbs 8 degrees to the left through the station.
const SHIP_CLIMB = rad(8);
// The rise starts 60 degrees back along the orbit, low right.
const SHIP_RISE = rad(60);
// A Reset or a load starts the rise 20 s in.
// The ship then shows at once.
const SHIP_HEAD = 20;
// The deck tips 18 degrees toward the eye.
// Its top edges show.
const SHIP_TIP = rad(18);
// The aim aids see the rock's disc, moved to 150 km.
export const SHIP_AIM_R = 3750;
const SHIP_HULL = linFit(0.42, 0.012, 245), SHIP_RUST = linFit(0.56, 0.065, 45), SHIP_GROOVE = linFit(0.2, 0.008, 245), SHIP_BELL = linFit(0.24, 0.008, 250), SHIP_DARK = linFit(0.1, 0.005, 250);
// A box: x0 to x1, y0 to y1, half width hz.
const sbox = (x0: number, x1: number, y0: number, y1: number, hz: number) => new THREE.BoxGeometry(x1 - x0, y1 - y0, 2 * hz).translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
// f moves each vertex.
// A box has vertices at its corners only.
function shapeG<G extends THREE.BufferGeometry>(g: G, f: (v: THREE.Vector3) => void) {
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { f(v.fromBufferAttribute(p, i)); p.setXYZ(i, v.x, v.y, v.z); }
  return g;
}
// aHull: the point in the hull frame.
// aShip: albedo, then 1 for a dark recess.
// aTop is the part's top height.
// Its wall lip catches the sun.
function shipPart(g: THREE.BufferGeometry, col: number[], recess: number) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const p = g.attributes.position, a = new Float32Array(p.count * 4);
  let top = -1e9;
  for (let i = 0; i < p.count; i++) { a.set([...col, recess], i * 4); top = Math.max(top, p.getY(i)); }
  g.setAttribute('aHull', p.clone());
  g.setAttribute('aShip', new THREE.Float32BufferAttribute(a, 4));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(p.count).fill(top), 1));
  return g;
}
function buildHulk(id: string) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, col = SHIP_HULL, recess = 0) => parts.push(shipPart(g, col, recess));
  // A hull block in strakes: lower hull, recessed rust band, upper hull.
  // A dark groove cuts the upper hull.
  // Each ledge catches the sun.
  const block = (x0: number, x1: number, y0: number, y1: number, hz: number, f: (v: THREE.Vector3) => void = () => {}) => {
    const g0 = y1 - 260;
    for (const [a, b, c, d] of [[y0, -150, SHIP_HULL, 0], [-150, 30, SHIP_RUST, 60], [30, g0, SHIP_HULL, 0], [g0, g0 + 70, SHIP_GROOVE, 70], [g0 + 70, y1, SHIP_HULL, 0]] satisfies [number, number, number[], number][]) add(shapeG(sbox(x0, x1, a, b, hz - d), f), c);
  };
  // A turret: a sloped house and twin barrels to the prow.
  // dn -1 hangs it under the hull.
  const turret = (x: number, y: number, dn = 1) => {
    const top = y + 170 * dn;
    add(shapeG(sbox(x - 220, x + 220, Math.min(y - 20 * dn, top), Math.max(y - 20 * dn, top), 200), v => { if ((v.y - y) * dn > 100) { v.x = x + (v.x - x) * 0.7; v.z *= 0.8; } }));
    for (const s of [-1, 1]) add(sbox(x + 120, x + 860, Math.min(y + 70 * dn, y + 120 * dn), Math.max(y + 70 * dn, y + 120 * dn), 25).translate(0, 0, s * 130));
  };
  if (id === 'prow') {
    // Two jaws taper to a split point.
    add(shapeG(sbox(2440, 5500, 60, 450, 360), v => { if (v.x > 5000) { v.y = v.y > 200 ? 340 : 230; v.z *= 0.3; } }));
    add(shapeG(sbox(2440, 5200, -450, -60, 340), v => { if (v.x > 5000) { v.y = v.y > -200 ? -230 : -330; v.z *= 0.3; } }));
    // A dark slot fills the split's root.
    // Its faces meet the jaws.
    add(shapeG(sbox(2440, 4300, -60, 60, 300), v => { if (v.x > 4000) v.y = v.y > 0 ? 163 : -175; }), SHIP_DARK, 1);
  } else if (id === 'fore') {
    // The bow end slopes down to the jaws.
    block(150, 2440, -620, 580, 450, v => { if (v.x > 2400) v.y += v.y > 500 ? -110 : v.y < -600 ? 120 : 0; });
    // Stepped plates on the spine.
    add(sbox(300, 1500, 560, 660, 340));
    add(sbox(450, 1300, 640, 730, 250));
    turret(1950, 580);
    turret(1000, 730);
    // The keel fin: its front edge rakes back.
    add(shapeG(sbox(150, 2200, -1050, -600, 70), v => { if (v.x > 2000 && v.y < -800) v.x = 900; }));
  } else if (id === 'mid') {
    block(-2520, 150, -700, 650, 500);
    add(sbox(-1300, 0, 630, 730, 380));
    add(sbox(-1150, -200, 710, 800, 280));
    turret(-650, 800);
    add(shapeG(sbox(-2300, 150, -1050, -680, 70), v => { if (v.x < -2000 && v.y < -800) v.x = -1700; }));
  } else if (id === 'drive') {
    // The tallest block.
    // Its top front edge is cut back.
    block(-5500, -2520, -900, 950, 620, v => { if (v.x > -2600 && v.y > 900) v.x = -2950; });
    add(sbox(-5200, -3300, 930, 1010, 460));
    // Four dark engine bells flare from the stern face.
    for (const y of [-645, -215, 215, 645]) add(new THREE.CylinderGeometry(165, 110, 420, 12).rotateZ(Math.PI / 2).translate(-5690, y, 0), SHIP_BELL);
    turret(-3700, -900, -1);
  } else {
    // The tower sweeps back.
    // A dark bridge slit runs under its cap.
    add(shapeG(sbox(-2300, -1380, 630, 1010, 200), v => { if (v.y > 1000) v.x += v.x > -1800 ? -290 : -110; }));
    add(sbox(-2420, -1690, 1000, 1160, 140), SHIP_DARK, 1);
    // The cap juts forward over the slit.
    add(shapeG(sbox(-2470, -1620, 1150, 1230, 210), v => { if (v.y > 1200) v.x += v.x > -2000 ? -80 : -25; }));
    // A mast stands on the cap.
    add(sbox(-2250, -2190, 1210, 1420, 30));
  }
  return mergeGeometries(parts);
}
// The gun's flat faces, lit by sunlight above the air.
// uWound.x: the wound's joint, in hull units.
// uWound.y is the bend in radians.
// uWound.z is the smoulder, 0 to 1.
// uEntry.xyz: the hulk's heading in the world.
// uEntry.w: the hulk's entry, 0 to 1.
// uCtr: the hulk's centre in the world, then its radius.
// Each hulk's material owns uEntry, uCtr and uLit.
// It shares every other uniform.
export const shipMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uWound: { value: new THREE.Vector4(0, 0, 0, 0) }, uEntry: { value: new THREE.Vector4(0, 0, 0, 0) }, uCtr: { value: new THREE.Vector4(0, 0, 0, 1) }, uLit: { value: 1 } },
  vertexShader: /* glsl */`
  attribute vec3 aHull; attribute vec4 aShip; attribute float aTop;
  uniform vec4 uWound;
  varying vec3 vP, vH; varying vec4 vS; varying float vTop;
  void main() {
    vec3 p = position, h = aHull;
    float top = aTop;
    // The hull aft of the wound's joint bends down about the joint.
    if (uWound.y > 0.0 && h.x < uWound.x) {
      vec2 d = h.xy - vec2(uWound.x, 0.0);
      float c = cos(uWound.y), s = sin(uWound.y);
      vec2 dh = vec2(c * d.x - s * d.y, s * d.x + c * d.y) - d;
      p.xy += dh; h.xy += dh; top += dh.y;
    }
    vH = h; vS = aShip; vTop = top;
    vP = (modelMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vP, vH; varying vec4 vS; varying float vTop;
  uniform vec4 uWound, uEntry, uCtr;
  uniform float uLit, uTime;
  ${HEAD}
  ${AIR}
  ${SEAM}
  // The sun above the air: amber low, white high, pale below.
  vec3 shipSun() {
    float h = uSunD.y;
    vec3 c = mix(vec3(1.6, 0.72, 0.3), vec3(1.9, 1.8, 1.65), smoothstep(0.05, 0.6, h));
    return mix(vec3(0.5, 0.55, 0.65), c, smoothstep(-0.12, 0.0, h)) * uLit;
  }
  void main() {
    // Flat faces from the screen derivatives, in the world and the hull.
    vec3 N = normalize(cross(dFdx(vP), dFdy(vP)));
    vec3 Nh = normalize(cross(dFdx(vH), dFdy(vH)));
    vec3 V = normalize(cameraPosition - vP);
    float wall = step(abs(Nh.y), 0.5), open = 1.0 - vS.w;
    float top = smoothstep(0.55, 0.95, Nh.y);
    vec3 alb = vS.rgb * (0.8 + 0.4 * k3fbm(vH * 0.0013));
    // Each plate takes its own tone.
    alb *= 0.84 + 0.32 * k3hash(floor(vH / vec3(260.0, 150.0, 160.0)));
    // The paint fades in broad patches.
    alb = mix(vec3(dot(alb, vec3(0.3, 0.59, 0.11))), alb, 0.35 + 0.65 * k3fbm(vH * 0.0021 + 5.0));
    // Panel joints: frames every 260 m, strake and deck lines.
    float joint = max(seam(vH.x, 260.0, 5.0), max(wall * seam(vH.y, 150.0, 3.0), top * seam(vH.z, 160.0, 4.0)));
    alb *= 1.0 - 0.55 * joint;
    // The belly is darker than the flanks.
    alb *= mix(0.4, 1.0, smoothstep(-1000.0, 400.0, vH.y));
    vec3 sun = shipSun();
    // The raked light is warm, not a saturated orange.
    vec3 warm = mix(sun, vec3(dot(sun, vec3(0.3, 0.59, 0.11))), 0.5);
    float nl = max(dot(N, uSunD), 0.0), back = smoothstep(-0.5, 0.6, dot(uSunD, -V));
    // Top faces catch the low sun at a graze.
    // That gives a metal sheen.
    float graze = pow(1.0 - max(dot(N, V), 0.0), 2.0) * back;
    float sheen = top * graze * 0.32 * (0.6 + 0.5 * k3fbm(vH * 0.004 + 11.0)) * (1.0 - 0.7 * joint);
    // Each wall's top lip catches the sun as a thin, crisp line.
    float lip = wall * (1.0 - smoothstep(0.0, max(8.0, fwidth(vH.y)), vTop - vH.y)) * back * 0.24;
    // The planet's glow fills the flanks.
    // The belly sees less of it.
    vec3 amb = mix(uHorC, uZenC, 0.5) * mix(0.15, 0.5, smoothstep(-0.6, 0.6, Nh.y));
    vec3 col = (alb * (amb + sun * nl) + warm * (sheen + lip)) * open;
    // The wound's joint smoulders dull red in patches.
    float sm = uWound.z * (1.0 - smoothstep(30.0, 200.0, abs(vH.x - uWound.x)));
    col += vec3(0.9, 0.09, 0.02) * 1.5 * sm * (0.15 + 0.85 * smoothstep(0.3, 0.7, k3fbm(vH * 0.008)));
    // In the air, plasma lights the face that leads the fall.
    if (uEntry.w > 0.0) {
      float lead = max(dot(N, uEntry.xyz), 0.0);
      // fwd is -1 at the hulk's back.
      // It is 1 at the nose.
      float fwd = clamp(dot(vP - uCtr.xyz, uEntry.xyz) / uCtr.w, -1.0, 1.0);
      float fl = 0.7 + 0.6 * k3fbm(vH * 0.004 + vec3(0.0, 0.0, uTime * 0.9));
      // The plate edges stay dark, so the hull still reads.
      float edge = 1.0 - 0.7 * joint;
      float glow = uEntry.w * lead * lead * smoothstep(-0.4, 0.5, fwd) * fl * edge;
      // Only a small zone at the nose goes white.
      float hot = uEntry.w * pow(lead, 4.0) * smoothstep(0.55, 0.95, fwd) * fl;
      col += vec3(1.0, 0.3, 0.06) * 1.2 * glow + vec3(1.0, 0.8, 0.55) * 1.2 * hot;
    }
    // A high sun's bright sky washes the ship toward a ghost.
    vec3 dir = normalize(vP - cameraPosition);
    float day = smoothstep(0.2, 0.8, uSunD.y);
    col = mix(aerial(col, vP), k2skyB(dir, 0.0), 0.5 * day);
    // The cirrus hangs nine kilometres up, in front of the ship.
    // Two blends give the ice's colour and cover.
    float cs = dot(dir, uSunD);
    vec3 w0 = wisps(dir, vec3(0.0), cs);
    float a = clamp(1.0 - (wisps(dir, vec3(1.0), cs).g - w0.g), 0.0, 1.0);
    vec3 wc = w0 / max(a, 1e-3);
    // A hulk under the cirrus has no ice in front of it.
    a *= smoothstep(8000.0, 10000.0, vP.y);
    // Over the dark hull a thin streak still reads as in front.
    gl_FragColor = vec4(col * (1.0 - min(1.0, 1.35 * a)) + wc * min(1.0, 1.35 * a), 1.0);
  }`,
});
export const shipMeshes = HULL.sections.map(sec => {
  const g = buildHulk(sec.id);
  g.computeBoundingBox();
  const c = g.boundingBox!.getCenter(new THREE.Vector3());
  g.translate(-c.x, -c.y, -c.z);
  g.computeBoundingSphere();
  const mat = new THREE.ShaderMaterial({ uniforms: { ...shipMat.uniforms, uEntry: { value: new THREE.Vector4() }, uCtr: { value: new THREE.Vector4(0, 0, 0, 1) }, uLit: { value: 1 } }, vertexShader: shipMat.vertexShader, fragmentShader: shipMat.fragmentShader });
  const m = new THREE.Mesh(g, mat);
  m.scale.setScalar(SHIP_SCALE);
  // Cracks: the hulk's broken joints, in the hull frame.
  // The tower breaks at its foot on the mid deck.
  const cracks = HULL.joints.filter(j => j === sec.x0 || j === sec.x1).map(j => new THREE.Vector3(j, 0, 0));
  if (!cracks.length) cracks.push(new THREE.Vector3((sec.x0 + sec.x1) / 2, 630, 0));
  m.userData = { id: sec.id, c, cracks };
  m.visible = false;
  scene.add(m);
  return m;
});
// S points to the station.
// T runs along the orbit.
const SHIP_S = new THREE.Vector3(), SHIP_T = new THREE.Vector3();
{
  const b = new THREE.Vector3(END0.x - A0.x, 0, END0.z - A0.z).normalize();
  SHIP_S.copy(b).multiplyScalar(Math.cos(SHIP_EL)).setY(Math.sin(SHIP_EL));
  const left = new THREE.Vector3().crossVectors(yUp, SHIP_S).normalize();
  const up = new THREE.Vector3().crossVectors(SHIP_S, left);
  SHIP_T.copy(left).multiplyScalar(Math.cos(SHIP_CLIMB)).addScaledVector(up, Math.sin(SHIP_CLIMB));
}
// A hulk: one section's fall, from its break to its landing.
export interface Hulk {
  id: string;
  fallT: number;
  dist: number;
  bearing: number;
  rumbleDelay: number;
  breakAt: number | null;
  landedAt: number | null;
  // The impact step sets these two at the landing.
  domed?: boolean;
  rumbleAt?: number;
}
// A failing joint: its hull x, its time, its flash place.
export interface JointFx { joint: number; t: number; done: boolean; P: THREE.Vector3 }
// The hit's effects: start, place, kill or wound, and the joints.
export interface HitFx { t0: number; P: THREE.Vector3; kill: boolean; joints: JointFx[] }
// One hulk's breakup kick: direction, pop, coast speed, tumble axis.
export interface HulkGo { dir: THREE.Vector3; pop: number; v: number; axis: THREE.Vector3 }
// The ship: arrive, station, wounded, breakup, falling or gone.
export interface Ship {
  state: string;
  t0: number;
  wound: { joint: number; t0: number } | null;
  hulks: Hulk[];
  seed: number;
  // The hit sets fx; a kill sets go.
  fx?: HitFx;
  go?: HulkGo[];
}
// A hulk's fall state at an age, from ship.js.
export type HulkState = ReturnType<typeof hulkAt>;
// The rock mode keeps a parked ship.
// That ship never steps.
export let ship: Ship = makeShip(1, 0);
export const shipP = new THREE.Vector3(), shipD = new THREE.Vector3(), shipF = new THREE.Vector3(), shipY = new THREE.Vector3(), shipZ = new THREE.Vector3();
export const shipQ = new THREE.Quaternion(), shipM = new THREE.Matrix4(), shipE0 = new THREE.Vector3(), shipE1 = new THREE.Vector3();
// A wound sinks the ship 3 degrees in 8 s.
const SINK = rad(3), SINK_T = 8;
// The drift swings the ship at most 3 degrees each way.
const DRIFT_MAX = 3;
// The orbit angle at time t.
// It eases up, then drifts.
export function shipArc(t: number) {
  const age = t - ship.t0;
  const sink = ship.wound ? SINK * THREE.MathUtils.smootherstep(t - ship.wound.t0, 0, SINK_T) : 0;
  if (age < ARRIVE) return -SHIP_RISE * Math.pow(1 - Math.max(0, age) / ARRIVE, 3) - sink;
  return rad(DRIFT_MAX * Math.sin(driftDeg(age - ARRIVE) / DRIFT_MAX)) - sink;
}
// The ship's centre at time t.
export function shipAt(t: number, out: THREE.Vector3) {
  const a = shipArc(t);
  return out.copy(SHIP_S).multiplyScalar(Math.cos(a)).addScaledVector(SHIP_T, Math.sin(a)).multiplyScalar(SHIP_DIST).add(A0);
}
// The ship's centre P, turn Q and prow F at time t.
export function shipPose(t: number, P: THREE.Vector3, Q: THREE.Quaternion, F: THREE.Vector3) {
  const a = shipArc(t);
  shipAt(t, P);
  shipD.copy(P).sub(A0).normalize();
  // The prow leads along the orbit.
  F.copy(SHIP_S).multiplyScalar(-Math.sin(a)).addScaledVector(SHIP_T, Math.cos(a));
  // Screen up is square to the prow and the line of sight.
  shipY.crossVectors(F, shipD).normalize();
  if (shipY.y < 0) shipY.negate();
  // The deck tips toward the gun.
  shipY.multiplyScalar(Math.cos(SHIP_TIP)).addScaledVector(shipD, -Math.sin(SHIP_TIP));
  shipZ.crossVectors(F, shipY);
  Q.setFromRotationMatrix(shipM.makeBasis(F, shipY, shipZ));
}
// The bolt aims at the mid hull's centre.
export const SHIP_MID: THREE.Vector3 = shipMeshes[HULL.sections.findIndex(s => s.id === 'mid')].userData.c;
const aimQ = new THREE.Quaternion(), aimF = new THREE.Vector3(), aimV = new THREE.Vector3();
// The aim point at time t.
export function shipAim(t: number, out: THREE.Vector3) {
  shipPose(t, out, aimQ, aimF);
  return out.add(aimV.copy(SHIP_MID).multiplyScalar(SHIP_SCALE).applyQuaternion(aimQ));
}
const hulkQ = new THREE.Quaternion(), hulkPP = new THREE.Vector3(), hulkPF = new THREE.Vector3(), hulkPQ = new THREE.Quaternion(), hulkS = new THREE.Vector3();
// Hulk i's drift off its joint at time t, in metres.
// The joint's kick throws it out.
// Then it coasts.
export function hulkDrift(i: number, t: number) {
  const h = ship.hulks[i], go = ship.go && ship.go[i];
  if (!go || h.breakAt === null || t <= h.breakAt) return 0;
  const age = t - h.breakAt;
  return go.pop * (1 - Math.exp(-age / 0.7)) + go.v * age;
}
// Bearing 0 looks down the landscape lens.
// A plus bearing turns right, so the prow falls left.
const SITE_YAW = rad(24.5);
// Hulk i's impact site on the plain, about the landscape eye.
export function hulkSite(i: number, out: THREE.Vector3) {
  const h = ship.hulks[i], th = SITE_YAW - h.bearing;
  return out.set(1670 - Math.sin(th) * h.dist, 0, 1990 - Math.cos(th) * h.dist);
}
// The ground track runs ahead of the drop, so the fall arcs.
// Both start at rest.
// The fall grows out of the breakup drift.
const GLIDE = 0.6;
// The ground ease for a fall fraction f.
export const glideOf = (f: number) => f + GLIDE * f * (1 - f);
// Hulk i's centre at time t.
// It drifts off its joint.
// Then it falls to its site, eased by f.
// It reads only the clock.
// A jump gives the same pose.
export function hulkPos(i: number, t: number, out: THREE.Vector3) {
  const h = ship.hulks[i], go = ship.go && ship.go[i];
  shipPose(t, hulkPP, hulkPQ, hulkPF);
  out.copy(shipMeshes[i].userData.c).multiplyScalar(SHIP_SCALE);
  if (go) out.addScaledVector(go.dir, hulkDrift(i, t));
  out.applyQuaternion(hulkPQ).add(hulkPP);
  if (h.breakAt === null || t <= h.breakAt) return out;
  const f = hulkAt(h, t - h.breakAt).f, g = glideOf(f);
  hulkSite(i, hulkS);
  out.x += (hulkS.x - out.x) * g;
  out.z += (hulkS.z - out.z) * g;
  out.y += (hulkS.y - out.y) * f;
  return out;
}
// Hulk i's turn at time t.
// It takes the ship's turn, then a tumble.
// Reduced motion keeps the ship's turn.
export function hulkTurn(i: number, t: number, out: THREE.Quaternion) {
  const h = ship.hulks[i], go = ship.go && ship.go[i];
  shipPose(t, hulkPP, out, hulkPF);
  if (go && h.breakAt !== null && t > h.breakAt && !reduced()) out.multiply(hulkQ.setFromAxisAngle(go.axis, hulkAt(h, t - h.breakAt).tumble));
  return out;
}
const hulkH = new THREE.Vector3();
// Hulk i's heading at time t, a unit vector.
function hulkHead(i: number, t: number, out: THREE.Vector3) {
  hulkPos(i, t, out);
  return out.sub(hulkPos(i, t - 0.25, hulkH)).normalize();
}
// Each hulk has a raymarched streak.
// The prow and the tower also have a cheap ribbon.
// cheap is true while the ribbon stands in for the train.
// One hulk's streak: the train, its uniforms, an optional ribbon.
export interface ShipTrain { m: ReturnType<typeof makeTrain>; pu: Record<string, THREE.IUniform>; rib: ReturnType<typeof makeFragTrail> | null; cheap: boolean }
export const shipTrains: ShipTrain[] = [];
// The streak runs back to the entry point, 60 km at most.
const STREAK_MAX = 60000;
// A streak's head radius, as a share of its hulk's bounding radius.
export const STREAK_R = 0.5;
const trA = new THREE.Vector3(), trE = new THREE.Vector3();
// Point hulk i's streak.
// a is the hulk's hulkAt state, or null before the break.
// on is above zero only with a hulk state, so later reads use a!.
function placeTrain(i: number, a: HulkState | null) {
  const tr = shipTrains[i];
  if (!tr) return;
  const h = ship.hulks[i], m = shipMeshes[i];
  // A landed streak holds its landing pose.
  // It lingers for LINGER seconds.
  const tl = a && a.landed ? h.breakAt! + h.fallT : state.simT, late = state.simT - tl;
  const on = !a ? 0 : a.landed ? (late < LINGER ? 1 : 0) : a.entry;
  // Rungs 2 and 3 give the prow and the tower a ribbon.
  tr.cheap = !!tr.rib && state.rung >= 2;
  tr.m.visible = on > 0.01 && !tr.cheap;
  if (tr.rib) tr.rib.visible = on > 0.01 && tr.cheap;
  if (on <= 0.01) return;
  const age = tl - h.breakAt!, R = STREAK_R * m.geometry.boundingSphere!.radius * SHIP_SCALE;
  // The tail follows the last few seconds of the fall.
  hulkPos(i, tl - clamp(age - VACUUM, 0.25, 8), trA).sub(m.position).normalize();
  const len = Math.min(STREAK_MAX, m.position.distanceTo(hulkPos(i, h.breakAt! + VACUUM, trE))) + R;
  // The fade runs from the ground up.
  const fade = THREE.MathUtils.smootherstep(late, 0, LINGER);
  if (tr.cheap) {
    const u = tr.rib!.material.uniforms;
    u.uP.value.copy(m.position); u.uAway.value.copy(trA);
    u.uSide.value.set(0, 1, 0).cross(trA);
    if (u.uSide.value.lengthSq() < 1e-6) u.uSide.value.set(1, 0, 0);
    u.uSide.value.normalize();
    u.uR.value = 0.5 * R; u.uLen.value = len; u.uOn.value = on;
    u.uLift.value.set(1.25 * fade - 0.25, a!.landed ? 1 : 0, Math.exp(-late / 1.2));
    u.uRes.value.copy(starMat.uniforms.uRes.value); u.uDpr.value = starMat.uniforms.uDpr.value;
    return;
  }
  const u = tr.pu;
  u.uAstP.value.copy(m.position); u.uAway.value.copy(trA);
  u.uSide.value.set(0, 1, 0).cross(trA).negate();
  if (u.uSide.value.lengthSq() < 1e-6) u.uSide.value.set(1, 0, 0);
  u.uSide.value.normalize();
  u.uUpv.value.crossVectors(u.uSide.value, trA);
  u.uAstRad.value = R; u.uLen.value = len; u.uTrail.value = on;
  // The floor climbs from behind the head to the tail's end.
  u.uLift.value.set(len * (1.25 * fade - 0.25), a!.landed ? 1 : 0);
  // The fire builds as the hulk speeds up.
  // It dies in a second or two after the landing.
  u.uBurn.value = on * (0.35 + 0.4 * THREE.MathUtils.smoothstep(a!.f, 0.05, 0.5)) * Math.exp(-late / 1.2);
  // The smoke holds still in the world as the hulk runs on.
  u.uFlow.value = len / (1.05 * R) + 0.012 * state.simT;
}
export function placeShip() {
  shipPose(state.simT, shipP, shipQ, shipF);
  const sunDeg = THREE.MathUtils.radToDeg(U.uSunE.value);
  shipMeshes.forEach((m, i) => {
    const h = ship.hulks[i], a = h.breakAt !== null && state.simT > h.breakAt ? hulkAt(h, state.simT - h.breakAt) : null;
    hulkPos(i, state.simT, m.position);
    hulkTurn(i, state.simT, m.quaternion);
    // A landed hulk hides.
    m.visible = !(a && a.landed);
    const u = m.material.uniforms;
    // A falling hulk sinks into the earth's shadow.
    u.uLit.value = sunlit(SHIP_ALT * (1 - (a ? a.f : 0)), sunDeg);
    if (a && a.entry > 0) {
      hulkHead(i, state.simT, trE);
      u.uEntry.value.set(trE.x, trE.y, trE.z, a.entry);
      u.uCtr.value.set(m.position.x, m.position.y, m.position.z, m.geometry.boundingSphere!.radius * SHIP_SCALE);
    } else u.uEntry.value.set(0, 0, 0, 0);
    placeTrain(i, a);
  });
}
// A new ship starts its rise, head seconds in.
export function newShip(head = SHIP_HEAD) {
  ship = makeShip(1 + Math.floor(rnd() * 1e6), state.simT - head);
  rockAway();
  for (const m of shipMeshes) m.visible = true;
  placeShip();
}
export function shipOff() {
  for (const m of shipMeshes) m.visible = false;
  for (const t of shipTrains) { t.m.visible = false; if (t.rib) t.rib.visible = false; }
}
// The hull's angular length from the eye, in degrees.
export function shipTh() {
  if (state.tgtKind !== 'ship') return 0;
  shipE0.copy(shipP).addScaledVector(shipF, HULL.len * SHIP_SCALE / 2).sub(camera.position);
  shipE1.copy(shipP).addScaledVector(shipF, -HULL.len * SHIP_SCALE / 2).sub(camera.position);
  return THREE.MathUtils.radToDeg(shipE0.angleTo(shipE1));
}
// The ship takes the sky.
// The rock, pieces and smoke leave.
function rockAway() {
  ast.state = 'gone';
  astMesh.visible = false;
  smoke.visible = false;
  PU.uTrail.value = 0;
  astMat.uniforms.uBurn.value = 0;
  for (const f of frags) { f.on = false; f.m.visible = false; f.trail.visible = false; f.mini.m.visible = false; f.glow.visible = false; }
}
