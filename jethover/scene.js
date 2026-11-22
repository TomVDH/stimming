// Jet hover scene: the sky, the pad, the craft and its lights.
// Units are metres. The pad centre is the origin; y points up.
import * as THREE from 'three';

// The last light lies behind the craft, low in the west (-z).
export const SUN = new THREE.Vector3(0.18, -0.05, -1).normalize();
export const PAD_R = 15;

/* ---------- GLSL: the sky, shared by the dome and the pad ---------- */
export const SKY = /* glsl */`
const vec3 SUN = vec3(${SUN.x.toFixed(4)}, ${SUN.y.toFixed(4)}, ${SUN.z.toFixed(4)});
float h11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float vn1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h11(i), h11(i + 1.0), f); }
// Blue hour: a deep zenith, a cold band, the last warm light toward the sun.
vec3 skyCol(vec3 d) {
  float el = d.y;
  vec2 sx = normalize(SUN.xz);
  float ca = dot(normalize(d.xz + 1e-5), sx) * 0.5 + 0.5;
  float up = clamp(el, 0.0, 1.0);
  vec3 c = mix(vec3(0.020, 0.036, 0.080), vec3(0.004, 0.008, 0.026), pow(up, 0.5));
  c += vec3(0.42, 0.15, 0.045) * exp(-max(el, 0.0) / 0.045) * pow(ca, 5.0);
  c += vec3(0.07, 0.04, 0.07) * exp(-max(el, 0.0) / 0.16) * pow(ca, 2.0);
  c += vec3(0.012, 0.02, 0.04) * exp(-max(el, 0.0) / 0.07);
  return c;
}
// The haze colour at the horizon in a direction.
vec3 hazeCol(vec3 d) { return skyCol(normalize(vec3(d.x, 0.006, d.z))) * 0.7; }
`;

/* ---------- sky dome: gradient, far ridge, far lights ---------- */
const SKY_VS = /* glsl */`
varying vec3 vD;
void main() {
  vD = position;
  vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FS = /* glsl */`
${SKY}
varying vec3 vD;
void main() {
  vec3 d = normalize(vD);
  float az = atan(d.x, -d.z), el = d.y;
  vec3 c = skyCol(d);
  // A low far ridge, a little lighter than the ground for the haze.
  float ridge = 0.008 + 0.007 * vn1(az * 5.0 + 3.0) + 0.003 * vn1(az * 21.0);
  float px = max(fwidth(el), 1e-5);
  float on = smoothstep(px, -px, el - ridge);
  c = mix(c, hazeCol(d) * 0.42, on);
  // Far lights on the plain: a sparse row at the ridge foot.
  float cell = az / 0.0045, ci = floor(cell);
  float has = step(0.62, h11(ci + 7.0));
  float lx = (fract(cell) - 0.5 - (h11(ci + 3.0) - 0.5) * 0.6) * 0.0045;
  float ly = el - (0.0006 + h11(ci + 11.0) * 0.0022);
  float pa = max(fwidth(az), 1e-5);
  float dot2 = (lx * lx) / (pa * pa) + (ly * ly) / (px * px);
  vec3 lc = mix(vec3(1.0, 0.62, 0.28), vec3(0.85, 0.9, 1.0), step(0.7, h11(ci + 5.0)));
  c += lc * has * exp(-dot2 * 0.9) * (1.5 + 3.0 * h11(ci + 9.0));
  gl_FragColor = vec4(c, 1.0);
}`;

/* ---------- the pad: damp concrete, glow pools, wet reflections ---------- */
const PAD_VS = /* glsl */`
varying vec3 vP;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const PAD_FS = /* glsl */`
${SKY}
uniform vec4 uHot[3];
uniform vec4 uNoz[3];
uniform vec3 uHotCol;
uniform float uPadR;
varying vec3 vP;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 p = vP.xz;
  float r = length(p);
  vec3 V = vP - cameraPosition;
  float dist = length(V);
  V /= dist;
  float pad = smoothstep(uPadR + 0.3, uPadR - 0.3, r);
  // Slabs: joints every five metres, softened with distance.
  vec2 g = abs(fract(p / 5.0 + 0.5) - 0.5) * 5.0;
  float jw = max(0.03, dist * 0.0016);
  float joint = (1.0 - smoothstep(0.0, jw, min(g.x, g.y))) * pad;
  float grain = vn(p * 3.1) * 0.5 + vn(p * 0.7) * 0.5;
  vec3 alb = mix(vec3(0.05, 0.05, 0.045) * (0.7 + 0.6 * vn(p * 0.4)), vec3(0.17, 0.165, 0.155) * (0.85 + 0.3 * grain), pad);
  alb *= 1.0 - 0.55 * joint;
  // Scorch and soot under the nozzles.
  float soot = 0.0;
  for (int i = 0; i < 2; i++) soot += exp(-dot(p - uHot[i].xz, p - uHot[i].xz) / 2.4);
  alb *= 1.0 - 0.6 * clamp(soot, 0.0, 1.0) * pad;
  // Light: the sky above, then the nozzles and the hot pools.
  vec3 E = vec3(0.020, 0.028, 0.055) + vec3(0.04, 0.02, 0.012) * 0.5;
  vec3 hot = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    vec3 L = uNoz[i].xyz - vP;
    float d2 = dot(L, L);
    E += uHotCol * uNoz[i].w * (L.y / sqrt(d2)) / d2;
    vec2 q = p - uHot[i].xz;
    float q2 = dot(q, q);
    hot += uHotCol * uHot[i].w * (exp(-q2 / 0.5) * 2.2 + 0.5 / (1.0 + q2 / 2.0));
  }
  vec3 c = alb * E + hot * (0.35 + 0.65 * pad) * (0.25 + alb * 4.0);
  // Damp patches: a mirror for the sky and the plumes.
  float wet = smoothstep(0.3, 0.9, vn(p * 0.18 + 4.0) * 0.75 + vn(p * 0.9) * 0.25) * pad;
  float cosv = max(-V.y, 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
  vec3 R = reflect(V, vec3(0, 1, 0));
  vec3 refl = skyCol(R) * fres * (0.6 + 0.4 * wet);
  // Each plume mirrors as a soft streak toward the eye.
  for (int i = 0; i < 2; i++) {
    vec3 a = uHot[i].xyz;
    vec2 rd = normalize(R.xz + 1e-5);
    vec2 to = a.xz - p;
    float along = max(dot(to, rd), 0.0);
    float side = length(to - rd * along);
    float hgt = along * R.y / max(length(R.xz), 1e-3);
    float span = uNoz[i].y;
    float w = 0.35 + 0.25 * along * (1.0 - wet);
    float m = exp(-side * side / (w * w)) * smoothstep(span + 0.5, span * 0.6, hgt);
    refl += uHotCol * uHot[i].w * m * (0.3 + 1.6 * wet) * (0.15 + fres);
  }
  c += refl;
  // Haze thickens with distance toward the horizon colour.
  float f = 1.0 - exp(-dist * 0.0016);
  c = mix(c, hazeCol(V), f);
  gl_FragColor = vec4(c, 1.0);
}`;

/* ---------- the craft ---------- */
// The nozzle throat: hot petals round a white-hot centre.
const GLOW_VS = /* glsl */`
varying vec2 vQ;
void main() {
  vQ = position.xz / ${(0.4 * 0.97).toFixed(3)};
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const GLOW_FS = /* glsl */`
uniform float uGlow;
varying vec2 vQ;
void main() {
  float r = length(vQ), a = atan(vQ.y, vQ.x);
  float pet = 0.75 + 0.25 * cos(a * 14.0);
  vec3 c = mix(vec3(1.0, 0.3, 0.06), vec3(1.0, 0.78, 0.45), smoothstep(0.85, 0.2, r));
  c *= (0.6 + 2.4 * exp(-r * r * 3.0)) * mix(pet, 1.0, smoothstep(0.7, 0.4, r));
  gl_FragColor = vec4(c * uGlow, 1.0);
}`;
// A loft through superellipse rings: [x, half width, top, bottom, centre y].
function loft(rings, seg = 28, n = 2.6) {
  const pos = [], idx = [];
  for (const [x, w, ht, hb, yc] of rings) {
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const z = w * Math.sign(c) * Math.abs(c) ** (2 / n);
      const y = yc + (s >= 0 ? ht : hb) * Math.sign(s) * Math.abs(s) ** (2 / n);
      pos.push(x, y, z);
    }
  }
  const row = seg + 1;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * row + j, b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// A flat plate from a planform in (x, z), with a soft bevel.
function plate(pts, thick, y = 0) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.4, bevelSize: 0.07, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(Math.PI / 2);
  g.translate(0, y + thick / 2, 0);
  return g;
}

// Nozzle and lift-fan places in the craft's frame.
export const NOZ = [new THREE.Vector3(-3.25, -1.62, 0.8), new THREE.Vector3(-3.25, -1.62, -0.8)];
export const FAN = new THREE.Vector3(2.1, -0.78, 0);
export const NOZ_R = 0.4;

export function buildCraft(env) {
  const grp = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.48, metalness: 0.3, envMap: env, envMapIntensity: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.7, metalness: 0.2, envMap: env, envMapIntensity: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.06, metalness: 0.9, envMap: env, envMapIntensity: 1.6 });
  const body = loft([
    [7.2, 0.01, 0.01, 0.01, 0.02],
    [6.4, 0.24, 0.22, 0.2, 0.04],
    [5.2, 0.55, 0.45, 0.42, 0.08],
    [3.8, 0.85, 0.62, 0.55, 0.12],
    [2.4, 1.25, 0.66, 0.66, 0.1],
    [1.0, 1.62, 0.66, 0.74, 0.06],
    [-1.0, 1.72, 0.6, 0.76, 0.04],
    [-3.0, 1.66, 0.52, 0.74, 0.02],
    [-5.0, 1.42, 0.44, 0.62, 0.02],
    [-6.6, 1.18, 0.36, 0.46, 0.04],
    [-7.0, 0.95, 0.28, 0.34, 0.06],
    [-7.05, 0.01, 0.01, 0.01, 0.06],
  ]);
  grp.add(new THREE.Mesh(body, paint));
  // The canopy: a low dark bubble.
  const canopy = loft([
    [5.0, 0.01, 0.01, 0.01, 0.42],
    [4.3, 0.36, 0.3, 0.05, 0.48],
    [3.2, 0.52, 0.5, 0.05, 0.5],
    [2.0, 0.5, 0.42, 0.05, 0.5],
    [1.0, 0.3, 0.18, 0.05, 0.5],
    [0.6, 0.01, 0.01, 0.01, 0.5],
  ], 20, 2.2);
  grp.add(new THREE.Mesh(canopy, glass));
  // The wing: one delta plate through the body.
  grp.add(new THREE.Mesh(plate([[1.9, 1.2], [-3.3, 5.7], [-4.5, 5.7], [-5.4, 1.4], [-5.4, -1.4], [-4.5, -5.7], [-3.3, -5.7], [1.9, -1.2]], 0.12, -0.1), paint));
  // Tailplanes.
  grp.add(new THREE.Mesh(plate([[-5.0, 1.0], [-6.5, 3.3], [-7.25, 3.3], [-7.3, 1.0], [-7.3, -1.0], [-7.25, -3.3], [-6.5, -3.3], [-5.0, -1.0]], 0.08, 0.0), paint));
  // Two canted fins.
  for (const side of [1, -1]) {
    const s = new THREE.Shape([[-3.7, 0], [-5.9, 2.4], [-6.75, 2.4], [-7.05, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2 });
    g.translate(0, 0, -0.04);
    const m = new THREE.Mesh(g, paint);
    m.position.set(0, 0.3, side * 1.0);
    m.rotation.x = side * 0.36;
    grp.add(m);
  }
  // Intakes: dark mouths beside the canopy.
  for (const side of [1, -1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.5), dark);
    m.position.set(2.45, 0.02, side * 1.22);
    m.rotation.y = side * -0.32;
    grp.add(m);
  }
  // The swivel nozzles: short ducts bent straight down.
  const duct = new THREE.CylinderGeometry(NOZ_R * 1.12, NOZ_R * 1.3, 0.9, 28, 1, true);
  const petals = new THREE.CylinderGeometry(NOZ_R, NOZ_R * 1.1, 0.4, 28, 1, true);
  const glowU = { uGlow: { value: 1 } };
  const glowMat = new THREE.ShaderMaterial({ vertexShader: GLOW_VS, fragmentShader: GLOW_FS, uniforms: glowU, side: THREE.DoubleSide });
  const mouth = new THREE.CircleGeometry(NOZ_R * 0.97, 32);
  mouth.rotateX(Math.PI / 2);
  for (const n of NOZ) {
    const d = new THREE.Mesh(duct, dark);
    d.position.set(n.x, n.y + 0.62, n.z);
    grp.add(d);
    const p = new THREE.Mesh(petals, dark);
    p.position.set(n.x, n.y + 0.2, n.z);
    grp.add(p);
    // The hot throat: seen from below it glows through the petals.
    const g = new THREE.Mesh(mouth, glowMat);
    g.position.set(n.x, n.y + 0.3, n.z);
    grp.add(g);
  }
  // Gear: a nose leg and two mains, plain and dark.
  const leg = new THREE.CylinderGeometry(0.07, 0.07, 1.4, 10);
  const wheel = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 18);
  wheel.rotateX(Math.PI / 2);
  for (const [x, z, h] of [[4.3, 0, 1.25], [-1.5, 1.35, 1.35], [-1.5, -1.35, 1.35]]) {
    const l = new THREE.Mesh(leg, dark);
    l.scale.y = h / 1.4;
    l.position.set(x, -0.5 - h / 2, z);
    grp.add(l);
    const w = new THREE.Mesh(wheel, dark);
    w.position.set(x, -0.5 - h, z);
    grp.add(w);
  }
  // Wingtip lights: red to port, green to starboard.
  const dot = new THREE.SphereGeometry(0.045, 8, 6);
  for (const [z, col] of [[-5.72, 0xff2a1a], [5.72, 0x2aff6a]]) {
    const m = new THREE.Mesh(dot, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2) }));
    m.position.set(-3.9, -0.04, z);
    grp.add(m);
  }
  // The lift-fan door stands open behind the canopy.
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.0), paint);
  door.position.set(0.3, 1.05, 0);
  door.rotation.z = -1.05;
  grp.add(door);
  return { grp, glowU, mats: [paint, dark, glass, glowMat] };
}

/* ---------- the whole scene ---------- */
export function buildScene(renderer) {
  const scene = new THREE.Scene();
  const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // The environment for the craft: the same sky over a dark ground.
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), skyMat));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: 0x07080a }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1;
  envScene.add(floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
  pmrem.dispose();

  const padU = {
    uHot: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uNoz: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uHotCol: { value: new THREE.Color(1.0, 0.42, 0.12) },
    uPadR: { value: PAD_R },
  };
  const padMat = new THREE.ShaderMaterial({ vertexShader: PAD_VS, fragmentShader: PAD_FS, uniforms: padU, fog: false, extensions: { derivatives: true } });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), padMat);
  pad.rotation.x = -Math.PI / 2;
  scene.add(pad);

  const craft = buildCraft(env);
  scene.add(craft.grp);

  // Light: the sky dome, a cool rim from the last light, warm light from below.
  const hemi = new THREE.HemisphereLight(0x3a4d78, 0x0c0b0a, 0.95);
  scene.add(hemi);
  const rim = new THREE.DirectionalLight(0xffb48a, 1.4);
  rim.position.set(SUN.x * 30, 4, SUN.z * 30);
  scene.add(rim);
  const lamps = [0, 1, 2].map(() => {
    const l = new THREE.PointLight(0xff7a30, 0, 30, 2);
    scene.add(l);
    return l;
  });
  return { scene, sky, skyMat, env, pad, padU, craft, lamps, hemi, rim };
}
