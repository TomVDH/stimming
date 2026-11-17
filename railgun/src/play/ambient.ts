// Load order: view/render runs first.
import '../view/render.ts';
import * as THREE from 'three';
import { reduced, linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { camera, clamp, rad, renderer, rnd, scene, ui } from '../setup.ts';
import { FALL } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { IMP_U } from '../sky/impacts.ts';
import { BAND } from '../clouds/bands.ts';
import { farBake } from '../world/farcountry.ts';
import { gun } from '../gun/gun.ts';
import { ast, astMesh } from '../rock/asteroid.ts';
import { puff } from '../fx/dust.ts';
import { starMat } from '../fx/burst.ts';
import { charge, dustP, dustV } from './charge.ts';
import { makeFlare } from '../fx/flares.ts';
import { flare } from '../fx/bowshock.ts';
import { BOLT_SEG, boltMat, makeBoltGeo } from '../fx/bolt.ts';
import { ionGeo, ionMat, ionPuffGeo, ionPuffs, matCopy, tracers } from '../fx/ion.ts';
import { glint, makeGlint } from '../fx/glints.ts';
import type { Glint } from '../fx/glints.ts';
import type { Flare } from '../fx/flares.ts';
import type { TracerSet } from '../fx/ion.ts';
import { domeAlive, domeVols, flashOf, shipDomes, shipRumbles } from '../ship/hulks.ts';
import { chunks } from '../fx/volumes.ts';
import { rounds, tgtCanHit, tgtLead } from './shot.ts';
import { fill, resetToy, spin } from './reset.ts';
import { lastInput } from '../loop.ts';
import { kit } from '../sound/kit.ts';
import { shipRumble } from '../sound/ship.ts';

/* ---------- ambient: events nobody fires ---------- */
// A watcher needs no input: the scene plays small events on its own.
// The director holds off while the player charges or a shot flies.
// Shooting stars stay out for now (Tom, 2026-11-16); the Dev test still plays one.
// The far guns (war, bolt) stay out too (Tom); the Dev test still fires them.
const AMB_KINDS: AmbKind[] = ['sat', 'flak', 'shed'];
// Every event: its start, its length, and whether it belongs to a kill's aftermath.
interface AmbBase { t0: number; dur: number; after?: boolean }
// A far gun's round: site, notch, range, power, flight time, aim.
export interface AmbBolt extends AmbBase {
  kind: 'bolt';
  site: THREE.Vector3;
  notch: THREE.Vector3;
  D: number;
  siteD: number;
  c: number;
  T: number;
  flash: number;
  dir: THREE.Vector3;
  L: number;
  aimed: boolean;
}
// A late chunk's fall, flash and dust dome.
export interface AmbLand extends AmbBase {
  kind: 'land';
  site: THREE.Vector3;
  dir: THREE.Vector3;
  D: number;
  S: number;
  domed: boolean;
}
// One smouldering spot: its source, place, start time and flicker seed.
interface EmberSite { ref: Chunk | AmbLand | null; P: THREE.Vector3; t: number; seed: number }
// The embers where the pieces lie; test marks the Dev test's own spots.
export interface AmbEmbers extends AmbBase { kind: 'embers'; sites: EmberSite[]; acc: number; test?: boolean }
// A satellite: start and end rays, shadow entry, strength.
export interface AmbSat extends AmbBase { kind: 'sat'; d0: THREE.Vector3; d1: THREE.Vector3; shade: number; k: number }
// Orbital flak: the patch's centre and its pops.
export interface AmbFlak extends AmbBase { kind: 'flak'; c: THREE.Vector3; pops: { t: number; k: number; off: THREE.Vector3 }[] }
// A lump shed from the rock: its side and strength.
export interface AmbShed extends AmbBase { kind: 'shed'; side: THREE.Vector3; k: number }
// A shooting star: its meteor, start, direction, run and strength.
export interface AmbStar extends AmbBase { kind: 'star'; m: Meteor; p0: THREE.Vector3; dir: THREE.Vector3; run: number; k: number }
export type AmbEvent = AmbBolt | AmbLand | AmbEmbers | AmbSat | AmbFlak | AmbShed | AmbStar;
// 'war' starts a ripple of far bolts; it is no event of its own.
export type AmbKind = AmbEvent['kind'] | 'war';
// A late rumble: its due time and its strength.
interface DueRumble { at: number; k: number }
// The director: live events, next start, idle clock, due rumbles, last hit, far-gun wait.
export interface Amb { live: AmbEvent[]; next: number; deadSince: number | null; due: DueRumble[]; hit: number; farNext: number }
// A trailed chunk, as fx/volumes keeps it.
type Chunk = typeof chunks[number];
// farNext: the far guns wait 150 to 300 s between attempts.
export const amb: Amb = { live: [], next: 20, deadSince: null, due: [], hit: -1e6, farNext: 0 };
/* A meteor: a streak from its tail to a hot round head.
   The tail tapers, cools and fades; the head stays white-hot. */
function makeMeteor(hot: number[], cool: number[]) {
  const g = new THREE.PlaneGeometry(1, 2, 24, 1).translate(0.5, 0, 0);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: {
      uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uW: { value: 10 }, uGain: { value: 0 },
      uHot: { value: new THREE.Vector3(...hot) }, uCool: { value: new THREE.Vector3(...cool) },
      uRes: starMat.uniforms.uRes, uDpr: starMat.uniforms.uDpr,
    },
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`uniform vec3 uA, uB; uniform float uW, uDpr; uniform vec2 uRes;
    varying vec2 vUv; varying float vLen, vW;
    void main() {
      vec4 c0 = projectionMatrix * viewMatrix * vec4(uA, 1.0), c1 = projectionMatrix * viewMatrix * vec4(uB, 1.0);
      vec2 s0 = c0.xy / c0.w * 0.5 * uRes, s1 = c1.xy / c1.w * 0.5 * uRes, d = s1 - s0;
      float len = length(d);
      vec2 dir = len > 1e-3 ? d / len : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
      // The head's width in pixels, with a floor so a far meteor still shows.
      float ppm = 0.5 * uRes.y * projectionMatrix[1][1] / max(c1.w, 1.0);
      float w = max(uW * ppm, 1.6 * uDpr);
      // The quad runs from the tail to two head widths past the head.
      float x = position.x, along = x * (len + 2.0 * w), side = position.y * 2.0 * w;
      vec4 c = mix(c0, c1, clamp(along / max(len, 1e-3), 0.0, 1.0));
      gl_Position = vec4((s0 + dir * along + nrm * side) / (0.5 * uRes) * c.w, c.z, c.w);
      vUv = vec2(along, side); vLen = len; vW = w;
    }`,
    fragmentShader: /* glsl */`uniform float uGain; uniform vec3 uHot, uCool;
    varying vec2 vUv; varying float vLen, vW;
    void main() {
      // u runs from 0 at the tail to 1 at the head.
      float L = max(vLen, 1.0), u = clamp(vUv.x / L, 0.0, 1.0);
      // The head: a round white-hot glow.
      float r = length(vec2(vUv.x - L, vUv.y)) / vW, head = exp(-r * r * 2.2);
      // The tail narrows and dims toward its end.
      // A floor of most of a pixel keeps the far tail from breaking up.
      float hw = max(vW * mix(0.12, 0.5, u), 0.8), y = vUv.y / hw;
      float tail = exp(-y * y * 2.0) * u * u * step(vUv.x, L);
      float a = max(tail, head);
      vec3 col = mix(uCool, uHot, clamp(u * u + head, 0.0, 1.0));
      gl_FragColor = vec4(col * a * uGain, 0.0);
    }`,
  }));
  m.frustumCulled = false; m.renderOrder = BAND.lights; m.visible = false;
  scene.add(m);
  return m;
}
// Draw a meteor from tail A to head B; w is the head's width in metres.
type Meteor = ReturnType<typeof makeMeteor>;
function meteor(m: Meteor, A: THREE.Vector3, B: THREE.Vector3, w: number, gain: number) {
  const g = reduced() ? gain * 0.5 : gain;
  m.visible = g > 0.002;
  const u = m.material.uniforms;
  u.uA.value.copy(A); u.uB.value.copy(B); u.uW.value = w; u.uGain.value = g;
}
// Two shooting stars: a pair can cross at once.
const ambStars = [0, 1].map(() => makeMeteor(linFit(0.97, 0.03, 240), linFit(0.7, 0.1, 160)));
const ambA = new THREE.Vector3(), ambB = new THREE.Vector3();
// A late chunk's fall to the plain: a hot head, a cooling orange tail.
const ambFall = makeMeteor(linFit(0.95, 0.06, 80), linFit(0.62, 0.16, 40)), ambFallHead = makeFlare(linFit(0.9, 0.12, 62));
// The satellite: a point of sunlight on a dark sky.
const ambSat = makeFlare(linFit(0.95, 0.02, 90));
// A far gun's round: the main shot's ribbon, ion line and contrail.
// The parts share the main programs; a far bolt builds a set when none is free.
// Four sets at most: a battery's ripple fires up to four rounds.
// A far gun's own ion uniforms: ends, glow clock, trail scale.
type FarOwn = { uA: THREE.IUniform<THREE.Vector3>; uB: THREE.IUniform<THREE.Vector3>; uI: THREE.IUniform<THREE.Vector3>; uK: THREE.IUniform<number> };
// A far gun's set: the tracer meshes, their uniforms, two glows, its round.
interface FarGun extends Omit<TracerSet, 'round'> {
  own: FarOwn;
  pOwn: FarOwn & { uAer: THREE.IUniform<number> };
  glow: Flare;
  flash: Flare;
  e?: AmbBolt | null;
}
const farGuns: FarGun[] = [];
const farP = new THREE.Vector3(), farQ = new THREE.Vector3();
function makeFarGun() {
  const own = { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uI: { value: new THREE.Vector3() }, uK: { value: 1 } };
  // The puffs keep their own power and take the shared aerial perspective.
  const pOwn = { ...own, uI: { value: new THREE.Vector3() }, uAer: { value: 1 } };
  const g = {
    bolt: new THREE.Mesh(makeBoltGeo(), matCopy(boltMat, { uCore: { value: 3 }, uGain: { value: 8 }, uWide: { value: 110 } })),
    line: new THREE.Mesh(ionGeo, matCopy(ionMat, own)), puffs: new THREE.Mesh(ionPuffGeo, matCopy(ionPuffs.material, pOwn)), own, pOwn,
  } as FarGun;
  for (const k of ['bolt', 'line', 'puffs'] as const) { g[k].frustumCulled = false; g[k].renderOrder = tracers[0][k].renderOrder; g[k].visible = false; scene.add(g[k]); }
  // A warm glow round the head, and the muzzle's glow in its notch.
  // The ridges mask the muzzle's glow, so it shows only in the gap.
  g.glow = makeFlare(FAR_WARM); g.flash = makeFlare(FAR_WARM);
  g.flash.material.depthTest = true;
  return g;
}
// The far rounds' warm light: the muzzle, the glow and the clouds.
const FAR_WARM = linFit(0.82, 0.13, 58);
// A round draws in its launch's distance band, so nearer layers cover it.
function farBand(g: FarGun, e: AmbBolt) {
  const b = e.siteD > 100000 ? BAND.deep : BAND.far;
  g.flash.renderOrder = b; g.puffs.renderOrder = b + 0.01; g.line.renderOrder = b + 0.02; g.bolt.renderOrder = b + 0.03; g.glow.renderOrder = b + 0.04;
}
// A far round keeps the main shot's clock and path.
// It rides the rails 0.3 s, then crosses in T: fast out, slowing.
const farReach = (e: AmbBolt, a: number) => 1 - Math.pow(1 - clamp((a - 0.3) / e.T, 0, 1), 2.6);
const farAt = (e: AmbBolt, a: number, out: THREE.Vector3) => out.copy(e.site).addScaledVector(e.dir, e.L * farReach(e, a));
// Another gun fires at the falling rock from site and misses.
// t0 is its rail start: the horizon flash is its muzzle.
// c is its power: a weak round takes 11.5 s to cross, a full one 8.5.
function farShot(q: FarPlace, t0: number, flash: number): AmbBolt {
  const c = 0.5 + 0.5 * rnd();
  return { kind: 'bolt', t0, dur: 0.3 + 11.5 + 12, site: q.site.clone(), notch: q.notch.clone(), D: q.D, siteD: q.D, c, T: THREE.MathUtils.lerp(11.5, 8.5, c), flash, dir: new THREE.Vector3(), L: 1, aimed: false };
}
// The far guns stand in the gaps between the ranges (Tom: "come from between the mountains").
// farGaps() reads the skyline from the ranges' geometry bake.
// Without a bake, three fixed places stand in: screen x and distance.
const FAR_PIECES = [{ sx: -0.8, D: 96000 }, { sx: -0.45, D: 80000 }, { sx: 0.74, D: 104000 }];
// A far gun's place: screen x, range, site on the plain, notch crest.
export interface FarPlace { sx: number; D: number; site: THREE.Vector3; notch: THREE.Vector3 }
const farGapsAt: { bakes: number; list: FarPlace[] | null } = { bakes: -1, list: null };
// The three deepest notches in the near skyline on screen.
// Each gives a site 6 km behind the notch and the notch's crest point.
export function farGaps() {
  const B = farBake, f = B.bufs[B.front];
  if (!f.ok || !B.on) return null;
  if (farGapsAt.bakes === B.bakes) return farGapsAt.list;
  const w = f.g.width, h = f.g.height, px = new Uint16Array(w * h * 4);
  renderer.readRenderTargetPixels(f.g, 0, 0, w, h, px);
  const H = THREE.DataUtils.fromHalfFloat, v = new THREE.Vector4(), d = new THREE.Vector3(), cols = [];
  // The near skyline: the top of the ranges within 150 km.
  // The back ranges stand behind the gaps, so they do not count.
  const near = (x: number, y: number) => { const j = (y * w + x) * 4, g = H(px[j]); return g >= 0 && (g + H(px[j + 1])) * 512 < 150000; };
  for (let x = 2; x < w; x += 4) {
    let y = h - 1;
    while (y >= 0 && !near(x, y)) y--;
    const yy = Math.max(y, 0), i = (yy * w + x) * 4;
    v.set((x + 0.5) / w * 2 - 1, (yy + 0.5) / h * 2 - 1, 1, 1).applyMatrix4(f.inv);
    d.set(v.x / v.w, v.y / v.w, v.z / v.w).normalize();
    const sx = ambSP.copy(camera.position).addScaledVector(d, 1e5).project(camera).x;
    // A column with no range is an open horizon: deepest of all.
    const hit = y < 0 ? -1 : (H(px[i]) + H(px[i + 1])) * 512;
    cols.push({ sx, el: y < 0 ? -0.05 : Math.asin(d.y), hit, d: d.clone() });
  }
  // Our own gun hides the notches behind it: skip its span on screen.
  const box = new THREE.Box3().setFromObject(gun), cn = new THREE.Vector3();
  let g0 = 9, g1 = -9;
  for (let i = 0; i < 8; i++) {
    cn.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
    g0 = Math.min(g0, cn.x); g1 = Math.max(g1, cn.x);
  }
  // A notch: the lowest crest with higher crests on both sides.
  const gaps = [];
  for (let k = 0; k < cols.length; k++) {
    const c = cols[k];
    if (Math.abs(c.sx) > 0.85 || (c.sx > g0 - 0.05 && c.sx < g1 + 0.05)) continue;
    let l = -1, r = -1;
    for (const o of cols) if (Math.abs(o.sx - c.sx) < 0.12) { if (o.sx < c.sx) l = Math.max(l, o.el); else if (o.sx > c.sx) r = Math.max(r, o.el); }
    if (cols.some(o => Math.abs(o.sx - c.sx) < 0.03 && o.el < c.el)) continue;
    const depth = Math.min(l, r) - c.el;
    if (depth > 0.001) gaps.push({ c, depth });
  }
  gaps.sort((a, b) => b.depth - a.depth);
  // Too few notches: the lowest stretches of skyline fill the three places.
  const low = cols.filter(c => Math.abs(c.sx) <= 0.85 && !(c.sx > g0 - 0.05 && c.sx < g1 + 0.05)).sort((a, b) => a.el - b.el);
  for (const c of low) gaps.push({ c, depth: 0 });
  const list: FarPlace[] = [];
  for (const g of gaps) {
    if (list.length >= 3 || list.some(q => Math.abs(q.sx - g.c.sx) < 0.2)) continue;
    const flat = ambA.set(g.c.d.x, 0, g.c.d.z).normalize(), D = (g.c.hit > 0 ? g.c.hit : 84000) + 6000;
    const notch = g.c.hit > 0 ? f.eye.clone().addScaledVector(g.c.d, g.c.hit) : camera.position.clone().addScaledVector(flat, D).setY(0);
    list.push({ sx: g.c.sx, D, site: camera.position.clone().addScaledVector(flat, D).setY(0), notch });
  }
  farGapsAt.bakes = B.bakes; farGapsAt.list = list.length ? list : null;
  return farGapsAt.list;
}
// The far guns' places: the gaps, or the fixed stand-ins.
export function farPlaces() {
  return farGaps() || FAR_PIECES.map(q => {
    const site = camera.position.clone().addScaledVector(ambFlat(q.sx, ambA), q.D).setY(0);
    return { sx: q.sx, D: q.D, site, notch: site.clone() };
  });
}
// The place farthest across the frame from the rock: its round crosses the sky.
function farPiece() {
  const rx = ambSP.copy(ast.pos).project(camera).x;
  return farPlaces().reduce((a, b) => (Math.abs(b.sx - rx) > Math.abs(a.sx - rx) ? b : a));
}
// The far rounds' light on the clouds: place and strength.
const farLit = new THREE.Vector4();
// The bolt light's own colour; far rounds light the clouds warm instead.
const BOLT_C = U.uBoltC.value.clone(), FAR_C = new THREE.Vector3(...FAR_WARM);
// The main round's light wins; a far round lights the clouds only without it.
export function farLight() {
  const far = U.uBolt.value.w < 0.001 && farLit.w > 0.001;
  if (far) U.uBolt.value.copy(farLit);
  U.uBoltC.value.copy(far ? FAR_C : BOLT_C);
}
// At its rail start the round leads the rock, as the main gun does.
// The aim point sits beside the rock as the eye sees it: a near miss.
// It returns false when there is no rock to shoot.
function farAim(e: AmbBolt) {
  if (!(state.tgtKind === 'rock' && tgtCanHit() && astMesh.visible)) return false;
  const lead = tgtLead(e.T, new THREE.Vector3()), to = farP.copy(lead).sub(e.site).normalize();
  const off = farQ.crossVectors(to, ambB.copy(lead).sub(camera.position)).normalize();
  lead.addScaledVector(off, (rnd() < 0.5 ? -1 : 1) * ast.R * (1.6 + 1.9 * rnd())).sub(e.site);
  e.L = lead.length();
  e.dir.copy(lead).normalize();
  // The trail's scale follows the nearer of the gun and the rock.
  e.D = Math.min(e.D, ast.pos.distanceTo(camera.position));
  return (e.aimed = true);
}
// Orbital flak: pinprick pops high in a dark sky.
const ambFlak = Array.from({ length: 6 }, () => makeFlare(linFit(0.96, 0.03, 220)));
// Embers where chunks lie on the plain.
const ambEmbers = Array.from({ length: 8 }, () => makeFlare(linFit(0.6, 0.17, 35)));
// The shed lump: a hot head and a short glowing tail.
const ambShed = makeFlare(linFit(0.88, 0.14, 55)), ambShedTail = makeGlint(linFit(0.8, 0.15, 50));
// The smoke train hides what lies behind it.
// It returns 1 in the clear sky, 0 behind the train.
const ambS0 = new THREE.Vector3(), ambS1 = new THREE.Vector3(), ambSP = new THREE.Vector3();
function ambClear(p: THREE.Vector3) {
  if (state.tgtKind !== 'rock') return 1;
  ambSP.copy(p).project(camera);
  ambS0.copy(ast.pos).project(camera);
  // The train runs about nine falls long.
  // Its far end may pass behind the eye; a shorter span then stands in.
  for (const f of [9, 4, 1.5]) { ambS1.copy(ast.pos).addScaledVector(ast.away, FALL * f).project(camera); if (ambS1.z < 1) break; }
  const hw = state.size.w / 2, hh = state.size.h / 2;
  const ax = ambS0.x * hw, ay = ambS0.y * hh, bx = ambS1.x * hw - ax, by = ambS1.y * hh - ay;
  const px = ambSP.x * hw - ax, py = ambSP.y * hh - ay;
  const t = clamp((px * bx + py * by) / Math.max(bx * bx + by * by, 1), 0, 1);
  return THREE.MathUtils.smoothstep(Math.hypot(px - t * bx, py - t * by), 45, 95);
}
// A streak from A along dir for L metres.
// glint() centres its streak on its point, so this passes the midpoint.
const ambMid = new THREE.Vector3();
function ambSeg(m: Glint, A: THREE.Vector3, dir: THREE.Vector3, L: number, wid: number, gain: number) {
  glint(m, ambMid.copy(A).addScaledVector(dir, L / 2), dir, L / 2, wid, gain);
}
// The shared air's transmittance from the eye to P, as one grey value.
// It follows aerialFrom() in the AIR chunk: Rayleigh and the dusty Mie.
// Additive glows scale by it, so they fade with distance like the ranges.
function ambT(P: THREE.Vector3) {
  const c = camera.position, hit = c.distanceTo(P), yc = Math.max(c.y, 0), yp = Math.max(P.y, 0), dy = yp - yc;
  const avg = (h: number) => (Math.abs(dy) < 1 ? Math.exp(-yc / h) : (Math.exp(-yc / h) - Math.exp(-yp / h)) * h / dy);
  const k = U.uAirK.value, aR = avg(8000) * k.x, aM = avg(Math.max(k.z, 100)) * k.y, m = 1.1e-5 * aM;
  return 0.2126 * Math.exp(-(5.8e-6 * aR + m) * hit) + 0.7152 * Math.exp(-(13.5e-6 * aR + m) * hit) + 0.0722 * Math.exp(-(33.1e-6 * aR + m) * hit);
}
// Metres per pixel at distance D, for the live lens.
const ambPx = (D: number) => D * Math.tan(rad(camera.fov / 2)) / (state.size.h / 2);
// A direction through screen point (sx, sy), each -1 to 1.
function ambRay(sx: number, sy: number, out: THREE.Vector3) {
  camera.updateMatrixWorld(true);
  return out.set(sx, sy, 0.5).unproject(camera).sub(camera.position).normalize();
}
// The hero moments stay clean: no event starts under them.
const ambQuiet = () => !!state.press || !!charge || !!state.shot || rounds.length > 0 || !!spin || !!fill || !!state.strike || !!state.blastFx;
// The kinds that suit this hour.
function ambKinds() {
  return AMB_KINDS.filter(k => {
    if (k === 'star') return U.uStars.value > 0.15;
    // A satellite shows in a dark sky, alone.
    if (k === 'sat') return U.uStars.value > 0.5 && !amb.live.some(e => e.kind === 'sat');
    // Each of these runs alone.
    if (amb.live.some(e => e.kind === k)) return false;
    // The far guns shoot only at a falling rock, and seldom.
    if (k === 'war' || k === 'bolt') return state.tgtKind === 'rock' && tgtCanHit() && astMesh.visible && state.simT > amb.farNext && !amb.live.some(e => e.kind === 'bolt');
    if (k === 'flak') return U.uStars.value > 0.5;
    // Only a falling rock sheds.
    if (k === 'shed') return state.tgtKind === 'rock' && ast.state === 'approach' && astMesh.visible;
    return true;
  });
}
// After a kill: late landings, then embers where pieces lie.
// The debris hail fills the sky; there is no re-entry rain.
function ambAfter(t0: number) {
  amb.live = amb.live.filter(e => !e.after);
  const n = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) amb.live.push(ambLanding(t0 + 55 + 100 * rnd()));
  // The chunks' landing sites smoulder for four minutes.
  amb.live.push({ kind: 'embers', after: true, t0: t0 + 6, dur: 240, sites: [], acc: 0 });
}
// A horizontal direction through screen x, sx from -1 to 1.
function ambFlat(sx: number, out: THREE.Vector3) {
  for (let i = 0; i < 20; i++) {
    ambRay(sx, 0, out);
    out.y = 0;
    if (out.lengthSq() > 1e-6) break;
  }
  return out.normalize();
}
// One late chunk: a 2.5 s fall, a flash, a dust dome, a late rumble.
function ambLanding(t0: number): AmbLand {
  for (let i = 0; i < 20; i++) {
    ambRay((rnd() * 2 - 1) * 0.75, 0, ambA);
    ambA.y = 0;
    if (ambA.lengthSq() > 1e-6) break;
  }
  ambA.normalize();
  const D = 18000 + 30000 * rnd(), site = camera.position.clone().addScaledVector(ambA, D).setY(0);
  // It comes down steep, along the rock's old line.
  const dir = ast.away.clone().negate().add(new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).multiplyScalar(0.4)).setY(-1.2).normalize();
  return { kind: 'land', after: true, t0, dur: 2.5 + 62, site, dir, D, S: 3000 + 2500 * rnd(), domed: false };
}
// Start one event of this kind.
export function ambStart(kind: AmbKind) {
  if (kind === 'war') {
    // The far guns fire in turn, one round each; all miss.
    // Each muzzle flash lights the horizon.
    const order = farPlaces().sort(() => rnd() - 0.5);
    let t = state.simT;
    for (const q of order) {
      amb.live.push(farShot(q, t, 1.2 + 1.0 * rnd()));
      t += 4 + 5 * rnd();
    }
    // The rumble comes late and low.
    amb.due.push({ at: state.simT + 20 + 40 * rnd(), k: 0.25 });
    return;
  }
  if (kind === 'sat') {
    // A satellite crosses slowly, lit by a sun below the horizon.
    // It fades as it runs into the planet's shadow.
    const L = rnd() < 0.5 ? -1 : 1, y0 = 0.35 + 0.5 * rnd(), y1 = 0.35 + 0.5 * rnd();
    const d0 = ambRay(-1.15 * L, y0, new THREE.Vector3()), d1 = ambRay(1.15 * L, y1, new THREE.Vector3());
    const dur = 70 + 40 * rnd();
    amb.live.push({ kind, t0: state.simT, dur, d0, d1, shade: rnd() < 0.6 ? 0.45 + 0.4 * rnd() : 2, k: 0.7 + 0.5 * rnd() });
    return;
  }
  if (kind === 'embers') { amb.live.push({ kind, after: true, t0: state.simT, dur: 240, sites: [], acc: 0, test: true }); return; }
  if (kind === 'bolt') {
    // One far gun fires from behind the ranges and misses the rock.
    const q = farPiece(), D = q.D;
    amb.live.push(farShot(q, state.simT, 0.9));
    // The crack arrives late and faint; a long wait is cut to half a minute.
    amb.due.push({ at: state.simT + Math.min(30, D / 343), k: 0.1 });
    return;
  }
  if (kind === 'flak') {
    // A far fleet fights in orbit: five to nine pops in one patch of sky.
    const c = camera.position.clone().addScaledVector(ambRay((rnd() * 2 - 1) * 0.7, 0.45 + 0.4 * rnd(), ambA), 300000);
    const pops = Array.from({ length: 5 + Math.floor(rnd() * 5) }, () => ({
      t: 4 * rnd(), k: 0.5 + 0.8 * rnd(), off: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(18000),
    }));
    amb.live.push({ kind, t0: state.simT, dur: 5, c, pops });
    return;
  }
  if (kind === 'shed') {
    // A lump breaks off the hot face and peels away.
    const side = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
    side.addScaledVector(ast.away, -side.dot(ast.away)).normalize();
    amb.live.push({ kind, t0: state.simT, dur: 6, side, k: 0.7 + 0.5 * rnd() });
    return;
  }
  if (kind === 'land') { amb.live.push(ambLanding(state.simT)); return; }
  if (kind === 'star') {
    // A short streak with a fading head, high in the sky.
    // Now and then a second one follows close behind.
    const pair = rnd() < 0.25;
    for (let j = 0; j < (pair ? 2 : 1); j++) {
      const m = ambStars.find(g => !amb.live.some(e => (e as AmbStar).m === g));
      if (!m) return;
      const sx = (rnd() * 2 - 1) * 0.85, sy = 0.15 + 0.7 * rnd(), D = 90000;
      const p0 = camera.position.clone().addScaledVector(ambRay(sx, sy, ambA), D);
      // The streak falls at a slant, left or right.
      const dir = new THREE.Vector3((rnd() < 0.5 ? -1 : 1) * (0.6 + 0.6 * rnd()), -(0.4 + 0.5 * rnd()), (rnd() * 2 - 1) * 0.4).normalize();
      amb.live.push({ kind, m, t0: state.simT + j * (0.2 + 0.5 * rnd()), dur: 0.6 + 0.5 * rnd(), p0, dir, run: 10000 + 12000 * rnd(), k: 0.6 + 0.6 * rnd() });
    }
  }
}
// The director: one event every 12 to 40 s, busier as the rock nears.
export function stepAmbient(dt: number) {
  const on = ui.setting('ambient')?.value !== false;
  const rate = +(ui.setting('ambrate')?.value ?? 1);
  for (let i = amb.live.length - 1; i >= 0; i--) if (state.simT - amb.live[i].t0 > amb.live[i].dur) amb.live.splice(i, 1);
  // Late rumbles play only with sound on.
  const ac = kit.live();
  for (let i = amb.due.length - 1; i >= 0; i--) {
    const r = amb.due[i], late = state.simT - r.at;
    if (late < 0) continue;
    amb.due.splice(i, 1);
    if (late < 6 && ac && !spin && !fill) { const h = shipRumble(ac, r.k); if (h) shipRumbles.push(h); }
  }
  // A kill starts the aftermath; a strike or a reset ends it.
  const hw = U.uHitP.value.w;
  if (state.blastFx && hw !== amb.hit && hw > state.simT - 1 && state.tgtKind === 'rock' && !state.strike && !spin && !fill) ambAfter(hw);
  amb.hit = hw;
  if (spin || fill || state.strike) amb.live = amb.live.filter(e => !e.after);
  for (const e of amb.live) {
    if (reduced()) break;
    if (e.kind === 'embers') stepEmbers(e, dt);
  }
  // A dead rock with nobody at the gun: the toy resets itself.
  // It waits for the aftermath to end.
  if (state.tgtKind === 'rock' && !tgtCanHit() && !spin && !fill && !state.strike && !amb.live.some(e => e.after)) {
    amb.deadSince ??= state.simT;
    if (state.simT - amb.deadSince > 75 && performance.now() - lastInput > 45000) { amb.deadSince = null; resetToy(true); }
  } else amb.deadSince = null;
  if (!on || rate <= 0 || reduced()) return;
  if (ambQuiet()) { amb.next = Math.max(amb.next, state.simT + 6); return; }
  if (state.simT < amb.next) return;
  const near = state.tgtKind === 'rock' && tgtCanHit() ? clamp(ast.s, 0, 1) : 0.5;
  amb.next = state.simT + THREE.MathUtils.lerp(40, 12, near) * (0.7 + 0.6 * rnd()) / rate;
  if (amb.live.filter(e => !e.after).length >= 2) return;
  const ks = ambKinds();
  if (!ks.length) return;
  const k = ks[Math.floor(rnd() * ks.length)];
  if (k === 'war' || k === 'bolt') amb.farNext = state.simT + 150 + 150 * rnd();
  ambStart(k);
}
// The events write their light after the domes clear uImp.
export function drawAmbient() {
  for (const g of [...ambStars, ambFall, ambFallHead, ambSat, ...ambFlak, ...ambEmbers, ambShed, ambShedTail]) g.visible = false;
  farLit.w = 0;
  // A set whose round has ended goes back to the pool.
  for (const g of farGuns) { g.bolt.visible = g.line.visible = g.puffs.visible = g.glow.visible = g.flash.visible = false; if (g.e && !amb.live.includes(g.e)) g.e = null; }
  const L = IMP_U.uImp.value;
  for (const e of amb.live) {
    const a = state.simT - e.t0;
    if (a < 0) continue;
    if (e.kind === 'bolt') {
      if (!drawFarBolt(e, a)) continue;
      // The muzzle flash lights the horizon behind the ranges.
      const slot = [...L].reverse().find(v => v.w < 0.001);
      if (slot) slot.set(e.site.x, e.site.y, e.site.z, e.flash * flashOf(a));
    } else if (e.kind === 'flak') {
      let n = 0;
      for (const q of e.pops) {
        const pa = a - q.t;
        if (pa < 0 || pa > 0.6 || n >= ambFlak.length) continue;
        ambB.copy(e.c).add(q.off);
        flare(ambFlak[n++], ambB, 4 * ambPx(300000) * (1 + 2 * pa), 1.4 * q.k * Math.exp(-pa / 0.12) * U.uStars.value * ambClear(ambB) * ambT(ambB));
      }
    } else if (e.kind === 'embers') {
      // drawEmbers reads no age; the extra argument does nothing.
      (drawEmbers as (e: AmbEmbers, a: number) => void)(e, a);
    } else if (e.kind === 'shed') {
      drawShed(e, a);
    } else if (e.kind === 'land') {
      drawLanding(e, a);
    } else if (e.kind === 'sat') {
      // The eye's lens never moves, so screen rays hold their place.
      const u = a / e.dur, D = 400000;
      ambA.lerpVectors(e.d0, e.d1, u).normalize();
      ambB.copy(camera.position).addScaledVector(ambA, D);
      const lit = 1 - THREE.MathUtils.smoothstep(u, e.shade, e.shade + 0.05);
      const fade = THREE.MathUtils.smoothstep(u, 0, 0.04) * (1 - THREE.MathUtils.smoothstep(u, 0.96, 1));
      flare(ambSat, ambB, 5 * ambPx(D), 0.55 * e.k * lit * fade * U.uStars.value * ambClear(ambB) * ambT(ambB));
    } else if (e.kind === 'star') {
      // The head runs ahead; the tail thins behind it.
      const u = clamp(a / e.dur, 0, 1), head = e.run * u, tail = Math.max(0, head - 0.45 * e.run);
      ambB.copy(e.p0).addScaledVector(e.dir, tail);
      const fade = Math.sin(Math.PI * u) ** 0.7;
      ambA.copy(e.p0).addScaledVector(e.dir, head);
      meteor(e.m, ambB, ambA, 70, 3.2 * e.k * fade * U.uStars.value * ambClear(ambA) * ambT(ambA));
    }
  }
}
// The far round: the ribbon at the head, the ion line, the contrail.
// The trail scales with distance, so it reads like the main shot's.
function drawFarBolt(e: AmbBolt, a: number) {
  // A round with no rock to shoot never fires.
  if (!e.aimed && !farAim(e)) { e.dur = 0; return false; }
  let g = farGuns.find(f => f.e === e) || farGuns.find(f => !f.e);
  if (!g) { if (farGuns.length >= 4) return true; g = makeFarGun(); farGuns.push(g); }
  if (g.e !== e) farBand(g, e);
  g.e = e;
  const K = e.D / 6000;
  // The muzzle's glow fills its notch; the air between dims it.
  flare(g.flash, e.notch, 5000, 1.4 * e.flash * flashOf(a) * ambT(e.notch));
  // The ribbon: the main shot's streak and shock diamonds.
  // Its light dies away before it reaches the rock, as the main shot's does.
  const tail = 0.55 + 0.03 * e.T, land = 0.3 + e.T;
  // The air between the eye and the head dims the glow.
  const T = ambT(farAt(e, a, farP));
  const fade = (1 - THREE.MathUtils.smoothstep(a, land, land + 0.3)) * (1 - THREE.MathUtils.smoothstep(farReach(e, a), 0.84, 0.97)) * ambClear(farP) * T;
  g.bolt.visible = fade > 0.002;
  // The head lights the clouds near it, warm; the brightest round wins.
  const lw = a > 0.3 ? 0.12 * e.c * fade : 0;
  farAt(e, a, farP);
  if (lw > farLit.w) farLit.set(farP.x, farP.y, farP.z, lw);
  // A soft warm glow round the head: the lit air it passes.
  flare(g.glow, farP, 4000, 0.6 * e.c * fade);
  if (g.bolt.visible) {
    g.bolt.material.uniforms.uWide.value = 40 * K;
    const geo = g.bolt.geometry, p0 = geo.attributes.aP0, p1 = geo.attributes.aP1, kk = geo.attributes.aK;
    for (let k = 0; k < BOLT_SEG; k++) {
      const ta = a - tail * (1 - k / BOLT_SEG), tb = a - tail * (1 - (k + 1) / BOLT_SEG);
      farAt(e, ta, farP); farAt(e, tb, farQ);
      const lag = (a - tb) / tail;
      // Inside the barrel the slug is hidden.
      const b = tb < 0.3 ? 0 : Math.exp(-lag * 4.5) * (1 + 0.45 * Math.cos(lag * 44) * Math.exp(-lag * 3)) * 1.3 * fade;
      const taper = 0.12 + 0.88 * Math.exp(-lag * 2.6);
      for (let v = 0; v < 4; v++) {
        const vi = k * 4 + v;
        p0.setXYZ(vi, farP.x, farP.y, farP.z); p1.setXYZ(vi, farQ.x, farQ.y, farQ.z); kk.setXY(vi, b, taper);
      }
    }
    p0.needsUpdate = p1.needsUpdate = kk.needsUpdate = true;
  }
  // The ion line glows behind the head and cools to a contrail.
  const o = g.own;
  const ia = a - 0.3;
  o.uA.value.copy(e.site); o.uB.value.copy(e.site).addScaledVector(e.dir, e.L); o.uK.value = K;
  // The ion glow's power k is 0.6 + 0.4 z; z here scales k by the air.
  o.uI.value.set(ia, e.T, ((0.6 + 0.4 * e.c) * T - 0.6) / 0.4);
  g.pOwn.uI.value.set(ia, e.T, e.c);
  g.line.visible = ia > 0 && ia < e.T + 1.5;
  g.puffs.visible = ia > 0.15;
  return true;
}
// A late landing: the fall, then the flash and the dome.
function drawLanding(e: AmbLand, a: number) {
  const FALL_T = 2.5;
  if (a < FALL_T) {
    const u = a / FALL_T, run = 26000, head = run * (u - 1), tail = head - 9000;
    ambB.copy(e.site).addScaledVector(e.dir, tail);
    ambA.copy(e.site).addScaledVector(e.dir, head);
    const T = ambT(ambA);
    meteor(ambFall, ambB, ambA, 110, 2.0 * Math.min(1, u * 4) * T);
    flare(ambFallHead, ambA, 8 * ambPx(e.D), 1.2 * Math.min(1, u * 4) * T);
    return;
  }
  if (e.domed) return;
  e.domed = true;
  // A free dome slot: one no live dome holds.
  const i = domeVols.findIndex((m, j) => !shipDomes.some(d => d.i === j && domeAlive(d)));
  if (i >= 0) shipDomes.push({ m: domeVols[i], t0: state.simT, i, P: e.site.clone(), S: e.S });
  // Sound runs at 343 m/s; a long wait is cut to half a minute.
  amb.due.push({ at: state.simT + Math.min(30, e.D / 343), k: 0.6 });
}
// The sites: the landed chunks, the late landings, or a test spot.
function emberSites(e: AmbEmbers) {
  for (const ch of chunks) if (ch.landP && !e.sites.some(s => s.ref === ch)) e.sites.push({ ref: ch, P: ch.landP.clone().setY(4), t: state.simT, seed: rnd() });
  for (const l of amb.live) if (l.kind === 'land' && l.domed && !e.sites.some(s => s.ref === l)) e.sites.push({ ref: l, P: l.site.clone().setY(4), t: state.simT, seed: rnd() });
  if (e.test && !e.sites.length) for (let i = 0; i < 4; i++) {
    const P = camera.position.clone().addScaledVector(ambFlat((rnd() * 2 - 1) * 0.6, ambA), 4000 + 8000 * rnd()).setY(4);
    e.sites.push({ ref: null, P, t: state.simT, seed: rnd() });
  }
  if (e.sites.length > ambEmbers.length) e.sites.length = ambEmbers.length;
}
// A thin thread of smoke rises from each ember.
function stepEmbers(e: AmbEmbers, dt: number) {
  if (state.simT < e.t0) return;
  emberSites(e);
  e.acc += dt / 1.5;
  for (; e.acc >= 1; e.acc--) for (const st of e.sites) {
    if (state.simT - st.t > 180) continue;
    dustP.copy(st.P).setY(6);
    dustV.set(1 + rnd(), 2.5 + rnd(), 0.4);
    puff(dustP, dustV, 16, 6 + 4 * rnd());
  }
}
// Each ember flickers and cools over two minutes; night shows it best.
function drawEmbers(e: AmbEmbers) {
  const night = 0.2 + 0.8 * U.uStars.value;
  e.sites.forEach((st, i) => {
    const age = state.simT - st.t, sd = st.seed * 40;
    const fl = 0.75 + 0.15 * Math.sin(state.simT * 3.1 + sd) + 0.1 * Math.sin(state.simT * 7.3 + 2 * sd);
    const g = 0.6 * Math.exp(-age / 120) * Math.min(1, age / 2) * fl * night * ambT(st.P);
    flare(ambEmbers[i], st.P, 5 * ambPx(st.P.distanceTo(camera.position)), g);
  });
}
// The lump peels off the side and lags back up the train.
function drawShed(e: AmbShed, a: number) {
  if (!tgtCanHit() || !astMesh.visible) return;
  const R = ast.R, u = a / e.dur;
  ambB.copy(ast.pos).addScaledVector(e.side, R * (1.1 + 1.2 * a)).addScaledVector(ast.away, R * 0.3 * a * a);
  const hot = e.k * (1 - u) * (1.2 + 2.5 * Math.exp(-a / 0.4)) * ambT(ambB);
  flare(ambShed, ambB, R * 0.9 * (1 - 0.5 * u), 1.5 * hot);
  ambSeg(ambShedTail, ambB, ast.away, R * (0.6 + 0.5 * a), R * 0.12, 1.2 * e.k * (1 - u) * ambT(ambB));
}
