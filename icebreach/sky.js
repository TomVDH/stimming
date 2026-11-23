// Ice breach sky: polar night, a low moon, stars, haze on the horizon; far pressure ridges.
import * as THREE from 'three';

const VS = 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }';
export const SKY_GLSL = /* glsl */`
  uniform vec3 uMoon;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  vec3 skyCol(vec3 d) {
    float h = max(d.y, 0.0);
    float mu = max(dot(d, uMoon), 0.0);
    // Deep blue above, a pale cold band at the horizon.
    vec3 zen = vec3(0.004, 0.009, 0.026), hor = vec3(0.045, 0.07, 0.11);
    vec3 c = mix(hor, zen, pow(h, 0.38));
    float side = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), normalize(uMoon.xz));
    c += vec3(0.42, 0.52, 0.7) * (0.09 * side * exp(-h * 14.0) + 0.16 * pow(mu, 18.0) + 0.5 * pow(mu, 300.0));
    c = mix(c, vec3(0.03, 0.045, 0.07), smoothstep(0.0, -0.04, d.y));
    return c;
  }`;
const FS = /* glsl */`
  ${SKY_GLSL}
  uniform float uStars;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 c = skyCol(d);
    // Stars: one per cell at most, dimmer near the horizon haze.
    vec2 sp = vec2(atan(d.z, d.x) * 380.0, d.y * 380.0);
    vec2 cell = floor(sp), f = fract(sp) - 0.5;
    float r = h21(cell);
    vec2 o = vec2(h21(cell + 3.1), h21(cell + 7.7)) - 0.5;
    float star = step(0.985, r) * smoothstep(0.09, 0.0, length(f - o * 0.6)) * (0.4 + 3.0 * pow(h21(cell + 1.3), 6.0));
    c += vec3(0.75, 0.82, 1.0) * star * uStars * smoothstep(0.0, 0.08, d.y);
    // The moon: a small bright disc with darker seas.
    float mu = dot(d, uMoon);
    float disc = smoothstep(0.99996, 0.99999, mu);
    if (disc > 0.0) {
      vec3 t = normalize(cross(uMoon, vec3(0.0, 1.0, 0.0))), b = cross(t, uMoon);
      vec2 q = vec2(dot(d, t), dot(d, b)) * 420.0;
      float sea = smoothstep(0.4, 0.7, h21(floor(q * 0.6)) * 0.5 + h21(floor(q * 1.3 + 2.0)) * 0.5);
      c = mix(c, vec3(2.2, 2.3, 2.5) * (1.0 - 0.28 * sea), disc);
    }
    gl_FragColor = vec4(c, 1.0);
  }`;

export function makeSky(moon) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMoon: { value: moon }, uStars: { value: 1 } }, vertexShader: VS, fragmentShader: FS,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  mesh.renderOrder = -1;
  return mesh;
}

/** Far pressure ridges: jumbled blocks along arcs on the horizon. */
export function makeRidges(mat) {
  const N = 900, geo = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(geo, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Three ridges: near left, far right, a long low one across the back.
  const arcs = [[-0.9, -0.35, 520, 4.2], [-0.15, 0.55, 980, 5.5], [-1.2, 0.9, 1900, 7.0]];
  let k = 0;
  for (const [a0, a1, d, hgt] of arcs) {
    const n = Math.floor(N / arcs.length);
    for (let i = 0; i < n && k < N; i++, k++) {
      const a = a0 + (a1 - a0) * r();
      const dd = d * (0.95 + 0.1 * r());
      // A ridge rises and falls along its length.
      const swell = 0.5 + 0.5 * Math.sin(a * 23 + d) * Math.sin(a * 7.3);
      p.set(Math.sin(a) * dd, -0.5, -Math.cos(a) * dd + 110);
      const w = 2 + 5 * r();
      s.set(w, hgt * (0.3 + 0.9 * swell) * (0.4 + r()), 1.5 + 3 * r());
      e.set((r() - 0.5) * 1.2, r() * 3.14, (r() - 0.5) * 1.2);
      m.compose(p, q.setFromEuler(e), s);
      inst.setMatrixAt(k, m);
    }
  }
  inst.count = k;
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}
