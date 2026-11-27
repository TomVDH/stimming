// Fruit juice: droplets thrown by the slice, in the fruit's own colour.
// Each drop is a turbid bead, stretched along its flight, flattened where it lands.
import * as THREE from 'three';
import { LIGHT, BEAD } from './glsl.js';

const MAX = 120;

const VERT = /* glsl */`
uniform vec3 uKeyDir, uRimDir;
varying vec3 vP, vEye, vKey, vRim, vW, vN;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  mat4 im = inverse(m);
  vP = position;
  vEye = (im * vec4(cameraPosition, 1.0)).xyz;
  vKey = normalize(mat3(im) * uKeyDir);
  vRim = normalize(mat3(im) * uRimDir);
  vec4 wp = m * vec4(position, 1.0);
  vW = wp.xyz;
  vec3 s2 = vec3(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz), dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz));
  vN = normalize(mat3(m) * (position / s2));
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */`
${LIGHT}
${BEAD}
uniform vec3 uTint;
varying vec3 vP, vEye, vKey, vRim, vW, vN;
void main() {
  vec3 p = normalize(vP);
  vec3 v = normalize(vEye - vP);
  vec3 n = normalize(vN);
  vec3 vw = normalize(cameraPosition - vW);
  vec3 tint = uTint;
  vec3 sigma = (vec3(1.0) - tint) * 2.4;
  float chord = max(2.0 * dot(p, v), 0.0);
  vec3 sk = beadScatter(p, v, vKey, sigma, 0.6, chord);
  vec3 sr = beadScatter(p, v, vRim, sigma, 0.6, chord);
  float fw = 0.5 + 1.5 * pow(max(dot(-vw, uRimDir), 0.0), 2.0);
  vec3 col = tint * (uKeyCol * sk * 1.6 + uRimCol * sr * fw + hemi(n) * 0.3);
  col += tint * 0.35 * (1.0 - exp(-sigma * chord * 0.6)) + tint * uRimCol * 0.12;
  vec3 h = normalize(uKeyDir + vw);
  col += uKeyCol * smoothstep(0.86, 0.9, pow(max(dot(n, h), 0.0), 18.0)) * 1.4;
  col += uRimCol * tint * pow(1.0 - max(dot(n, vw), 0.0), 3.0) * 0.15;
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeJuice(L) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.ShaderMaterial({ uniforms: { ...L, uTint: { value: new THREE.Vector3(0.42, 0.88, 0.08) } }, vertexShader: VERT, fragmentShader: FRAG }), MAX);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const drops = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3();
  const O = new THREE.Vector3();
  return {
    mesh,
    get busy() { return drops.length > 0; },
    setTint(c) { mesh.material.uniforms.uTint.value.set(...c); },
    // A burst from the cut plane; dir is the swipe's sign on screen.
    burst(root, dir, k = 1) {
      root.updateMatrixWorld();
      O.setFromMatrixPosition(root.matrixWorld);
      const n = Math.round(70 * k);
      for (let i = 0; i < n && drops.length < MAX; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.6;
        const p = new THREE.Vector3(O.x + (Math.random() - 0.5) * 0.04, O.y + Math.cos(a) * r, O.z + Math.sin(a) * r * 0.8);
        // Most juice flies up and out toward the eye; a little along the swipe.
        const v = new THREE.Vector3((Math.random() - 0.5) * 2.2 + dir * 0.6, 1.2 + Math.random() * 2.4, 0.6 + Math.random() * 2.6).multiplyScalar(k);
        drops.push({ p, v, r: 0.012 + Math.pow(Math.random(), 3) * 0.045, life: 0, flat: 0 });
      }
    },
    // Juice from a cut face: n drops from a disc at O, of radius rad, facing N.
    squirt(O, N, rad, n, speed = 1) {
      const S = new THREE.Vector3(), T = new THREE.Vector3();
      S.set(0, 1, 0).cross(N);
      if (S.lengthSq() < 1e-4) S.set(1, 0, 0);
      S.normalize();
      T.crossVectors(N, S);
      for (let i = 0; i < n && drops.length < MAX; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * rad;
        const p = O.clone().addScaledVector(S, Math.cos(a) * r).addScaledVector(T, Math.sin(a) * r).addScaledVector(N, 0.01);
        const v = N.clone().multiplyScalar((0.4 + Math.random() * 1.4) * speed);
        v.y += (0.3 + Math.random() * 1.2) * speed;
        v.x += (Math.random() - 0.5) * 0.8 * speed;
        v.z += (Math.random() - 0.5) * 0.8 * speed;
        drops.push({ p, v, r: 0.008 + Math.pow(Math.random(), 3) * 0.03, life: 0, flat: 0 });
      }
    },
    // onLand(p, r) hears each drop that reaches the floor; the puddle takes it in.
    step(dt, floorY, onLand = null) {
      if (!drops.length) { mesh.count = 0; return; }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life += dt;
        if (d.flat > 0) {
          // A landed drop spreads, then shrinks away.
          d.flat = Math.min(1, d.flat + dt * 6);
          d.r *= Math.exp(-dt * 1.6);
          // A landed drop joins the puddle; it shows only a moment as a bead.
          if (d.flat > 0.9 || d.r < 0.004) drops.splice(i, 1);
          continue;
        }
        d.v.y -= 9.8 * dt;
        d.v.multiplyScalar(Math.exp(-dt * 0.3));
        d.p.addScaledVector(d.v, dt);
        if (d.p.y < floorY + d.r * 0.3) { d.p.y = floorY + d.r * 0.25; d.flat = 0.01; d.v.set(0, 0, 0); onLand?.(d.p, d.r); }
        if (d.p.length() > 30) drops.splice(i, 1);
      }
      drops.forEach((d, i) => {
        if (d.flat > 0) {
          Q.identity();
          S.set(d.r * (1 + 0.6 * d.flat), d.r * (1 - 0.75 * d.flat), d.r * (1 + 0.6 * d.flat));
        } else {
          // Stretch along the flight, by speed; keep the volume.
          const sp = d.v.length();
          const st = 1 + Math.min(1.6, sp * 0.12);
          D.copy(d.v).normalize();
          Q.setFromUnitVectors(Y, D);
          S.set(d.r / Math.sqrt(st), d.r * st, d.r / Math.sqrt(st));
        }
        M.compose(d.p, Q, S);
        mesh.setMatrixAt(i, M);
      });
      mesh.count = drops.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
    clear() { drops.length = 0; mesh.count = 0; },
  };
}
