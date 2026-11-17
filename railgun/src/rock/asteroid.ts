// Load order: world/shadows runs first.
import '../world/shadows.ts';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { linFit } from '../../../shared/stim.js';
import { makeTally } from '../../salvo.js';
import { SIZES, clamp, opts, rnd, scene } from '../setup.ts';
import { A0, AWAY0, END0, FALL, yUp } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { noise3 } from '../gun/gun.ts';
import { placeFrags } from './fragments.ts';
import { draw } from '../view/render.ts';

/* ---------- asteroid: a displaced ball with a hot face ---------- */
// One shape per size bakes at load: long, lumpy or cratered.
export function bakeRock(detail: number, sd: number, kind: 'long' | 'lumpy' | 'cratered') {
  // Merged vertices give smooth normals; the icosahedron comes unindexed.
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail));
  const p = g.attributes.position, v = new THREE.Vector3();
  const dir = () => new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
  const dents = Array.from({ length: 6 }, dir);
  // Flat cuts shear the ball into a few broad faces.
  const cuts = Array.from({ length: 3 }, () => [dir(), 0.8 + 0.12 * rnd()] as [THREE.Vector3, number]);
  const craters = kind === 'cratered' ? Array.from({ length: 11 }, () => [dir(), 0.12 + 0.28 * rnd()] as [THREE.Vector3, number]) : [];
  const o = sd * 10, amp = kind === 'lumpy' ? 0.34 : 0.22;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let r = 1 + amp * (noise3(v.x * 1.3 + o, v.y * 1.3, v.z * 1.3) * 0.6 + noise3(v.x * 2.9, v.y * 2.9 + o, v.z * 2.9) * 0.3 + noise3(v.x * 6.1, v.y * 6.1, v.z * 6.1 + o) * 0.1);
    // Folded noise raises sharp crests.
    r += 0.07 * Math.pow(1 - Math.abs(noise3(v.x * 4.3 + o, v.y * 4.3, v.z * 4.3)), 3);
    for (const d of dents) r -= 0.12 * THREE.MathUtils.smoothstep(0.35 - Math.acos(clamp(v.dot(d), -1, 1)), 0, 0.35);
    // A crater: a bowl inside a raised rim.
    for (const [d, cr] of craters) {
      const a = Math.acos(clamp(v.dot(d), -1, 1)) / cr;
      if (a < 1.6) r += (a < 1 ? -0.09 * (1 - a * a) : 0) + 0.035 * Math.exp(-(((a - 1) / 0.2) ** 2));
    }
    for (const [n, k] of cuts) { const dn = v.dot(n); if (dn > 0.4) r = Math.max(0.55, Math.min(r, k / dn)); }
    const e = kind === 'long' ? [1.5, 0.78, 0.82] : [1, 1, 1];
    p.setXYZ(i, v.x * r * e[0], v.y * r * e[1], v.z * r * e[2]);
  }
  g.computeVertexNormals();
  g.userData.kind = kind;
  return g;
}
const ROCKS = { boulder: bakeRock(5, 1, 'long'), mountain: bakeRock(5, 2, 'lumpy'), moon: bakeRock(5, 3, 'cratered'), aerosmith: bakeRock(6, 7, 'cratered') };
export const AST_ROCK = linFit(0.30, 0.015, 60), WHITE = linFit(0.95, 0.06, 80), EMBER = linFit(0.55, 0.18, 35);
export const astMat = new THREE.ShaderMaterial({
  uniforms: {
    ...U, uBurn: { value: 0.3 }, uToPlanet: { value: new THREE.Vector3(0, -1, 0) }, uCracks: { value: 1 }, uEvil: { value: 0 }, uRockAir: { value: 3 },
    // Crater spots: xyz the hit's direction in rock space, w the hit time; w < 0 is off.
    uCrater: { value: [new THREE.Vector4(0, 0, 0, -1), new THREE.Vector4(0, 0, 0, -1)] },
    uRock: { value: new THREE.Vector3(...AST_ROCK) }, uWhite: { value: new THREE.Vector3(...WHITE) }, uEmber: { value: new THREE.Vector3(...EMBER) },
  },
  vertexShader: /* glsl */`
  varying vec3 vP, vN, vO;
  void main() {
    vO = position; vN = normalize(mat3(modelMatrix) * normal);
    vP = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vP, vN, vO;
  uniform float uBurn, uCracks, uTime, uEvil, uRockAir;
  uniform vec3 uToPlanet, uRock, uWhite, uEmber;
  uniform vec4 uCrater[2];
  ${HEAD}
  ${AIR}
  void main() {
    vec3 N = normalize(vN), V = normalize(cameraPosition - vP);
    float n = k3fbm(vO * 6.0);
    // The hot face leads the rock down its track.
    float lead = dot(N, uToPlanet);
    float hot = smoothstep(-0.25, 0.65, lead) * uBurn;
    // Soot coats the wake side.
    vec3 alb = uRock * (0.35 + 1.0 * n) * mix(0.3, 1.0, smoothstep(-0.7, 0.1, lead));
    // The sun wraps a little past the terminator.
    float sl = max(dot(N, uSun) * 0.88 + 0.12, 0.0);
    vec3 col = alb * (ambient(N) + sunAt(vP.y) * sl);
    col += uAstC * hot * (0.35 + 0.9 * n) * 2.0;
    col += uWhite * pow(max(lead, 0.0), 9.0) * uBurn * (0.5 + n) * 4.5;
    float limb = pow(1.0 - abs(dot(N, V)), 3.0) * hot;
    col += uWhite * limb * 1.5;
    // Ember cracks: a thin band of the noise, flickering.
    float cr = smoothstep(0.55, 0.62, n) * (1.0 - smoothstep(0.62, 0.70, n));
    float flick = 0.92 + 0.08 * sin(uTime * 3.0 + n * 40.0);
    col += uEmber * cr * (0.3 + hot) * uBurn * flick * 5.0 * uCracks;
    // Craters: a white-hot pit where a round struck, cooling to dull red over 20 s.
    for (int i = 0; i < 2; i++) {
      vec4 C = uCrater[i];
      if (C.w < 0.0) continue;
      float age = uTime - C.w, d = dot(normalize(vO), C.xyz) + 0.02 * (n - 0.5);
      float pit = smoothstep(0.955, 0.985, d), rim = smoothstep(0.93, 0.955, d) * (1.0 - pit);
      float glow = max(0.0, 1.0 - age / 20.0) * (0.35 + 2.6 * exp(-age / 4.0));
      // A scorched ring frames the pit.
      col *= 1.0 - 0.6 * rim;
      col += mix(uEmber * 1.6, uWhite * 2.0, exp(-age / 1.2)) * pit * glow * (0.6 + 0.8 * n);
    }
    // Aerosmith: near-black basalt split by wide, slow-breathing red fissures.
    if (uEvil > 0.5) {
      col *= 0.4;
      float fis = smoothstep(0.5, 0.58, n) * (1.0 - smoothstep(0.64, 0.76, n));
      col += vec3(1.0, 0.18, 0.05) * fis * (0.6 + 0.4 * sin(uTime * 0.7 + n * 12.0)) * 3.5;
    }
    // The plain's low dust, then the shared air, so a body this size sits deep in the air.
    col = aerial(k2haze(col, vP), vP);
    // Extra air on the rock: far out, blue scatters away and the sky fills in.
    // The rock reddens and pales with distance and sharpens as it nears.
    vec3 Tr = exp(-BETA_R * uAir * (uRockAir - 1.0) * airDepth(vP));
    col = col * Tr + k2skyB(-V, 0.0) * (1.0 - Tr);
    gl_FragColor = vec4(col, 1.0);
  }`,
});
export const astMesh = new THREE.Mesh(ROCKS[opts.size], astMat);
astMesh.frustumCulled = false;
scene.add(astMesh);
// The rock's place in the sky, its size curve and its state.
// state: approach, hold, entry (reserved), shatter, gone.
// away: the trail's direction; side and upv span its section.
// jolt: a crater's shove; tally: the damage the salvo rounds have done.
// strike and struck: the rock's last fall; see rock/strike.
export type AstState = 'approach' | 'hold' | 'entry' | 'strike' | 'struck' | 'shatter' | 'gone';
export interface Ast {
  jolt: THREE.Vector3; tally: ReturnType<typeof makeTally>; s: number; state: AstState; shape: number; holdT: number; th: number; R: number;
  pos: THREE.Vector3; end: THREE.Vector3; turn: number; next: number; away: THREE.Vector3; side: THREE.Vector3; upv: THREE.Vector3; spin: THREE.Vector3;
  // The hit's sim time; play/shot sets it.
  hitAt?: number;
}
export const ast: Ast = { jolt: new THREE.Vector3(), tally: makeTally(), s: 0.25, state: 'approach', shape: 0, holdT: 0, th: 0, R: 1, pos: new THREE.Vector3(), end: END0.clone(), turn: 0, next: 0, away: AWAY0.clone(), side: new THREE.Vector3(), upv: new THREE.Vector3(), spin: new THREE.Vector3(0.3, 1, 0.2).normalize() };
// Where the rock is at fall fraction s.
export const astAt = (s: number, out: THREE.Vector3) => out.copy(ast.end).addScaledVector(ast.away, FALL * (1 - s));
export function astSize() {
  ast.R = SIZES[opts.size].R;
  astMesh.geometry = ROCKS[opts.size];
  astMat.uniforms.uEvil.value = opts.size === 'aerosmith' ? 1 : 0;
  astMesh.scale.setScalar(ast.R);
  if (ast.state !== 'shatter' && ast.state !== 'gone') astMat.uniforms.uBurn.value = 0.5 + 0.5 * ast.s;
}
export function placeAst() {
  astAt(ast.s, ast.pos).add(ast.jolt);
  astMesh.position.copy(ast.pos);
  U.uAstG.value.set(ast.pos.x, ast.pos.z);
  placeFrags();
  // The hot face looks down the track, a little toward the planet.
  astMat.uniforms.uToPlanet.value.copy(A0).sub(ast.pos).normalize().multiplyScalar(0.35).addScaledVector(ast.away, -0.65).normalize();
}
function trailBasis() {
  ast.side.set(0, 1, 0).cross(ast.away).negate().normalize();
  ast.upv.crossVectors(ast.side, ast.away);
}
trailBasis();
// Each rock's path turns a little about the gun.
export function turnPath(turn: number) {
  ast.turn = turn;
  ast.end.copy(END0).sub(A0).applyAxisAngle(yUp, turn).add(A0);
  ast.away.copy(AWAY0).applyAxisAngle(yUp, turn);
  trailBasis();
}
// The size comes first.
// The fragments measure their gaps in radii.
export function retune() { astSize(); placeAst(); draw(); }
