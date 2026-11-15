// Cliff flyby: now and then a pair of jets crosses the far sky above the fog.
// A nod to Strangereal: a lead and a wingman, wingtip lights, short vapour trails.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { col } from './kit.js';
import { airify } from './cliff-air.js';

const SPEED = 230;
const SPAN = 1800;

// A fighter: fuselage, delta wing, twin fins. About 15 m long; the nose is +z.
function jetGeometry() {
  const body = new THREE.BoxGeometry(1.1, 1.0, 15);
  const wing = new THREE.Shape([new THREE.Vector2(0, 3.5), new THREE.Vector2(-5.5, -5.5), new THREE.Vector2(5.5, -5.5)]);
  const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.2, bevelEnabled: false }).rotateX(Math.PI / 2);
  const fins = [-1, 1].map(k => new THREE.BoxGeometry(0.15, 2.4, 2.6).rotateZ(k * 0.3).translate(k * 1.0, 1.3, -6));
  return mergeGeometries([body, wg, ...fins].map(g => g.toNonIndexed()));
}

// A vapour trail: a strip that faces the eye and widens as it ages.
function trailMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uP: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(1, 0, 0) }, uL: { value: 0 }, uA: { value: 0 }, uCol: { value: new THREE.Vector3(1, 1, 1) } },
    transparent: true, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `
      uniform vec3 uP, uD; uniform float uL;
      varying float vT, vS;
      void main() {
        vT = position.x; vS = position.y;
        vec3 side = normalize(cross(uD, normalize(cameraPosition - uP)));
        vec3 w = uP - uD * (position.x * uL) + side * position.y * (1.2 + 5.0 * position.x);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uA; uniform vec3 uCol;
      varying float vT, vS;
      void main() {
        float a = uA * pow(max(1.0 - vT, 0.0), 1.6) * (1.0 - smoothstep(0.1, 1.0, abs(vS))) * smoothstep(0.0, 0.02, vT);
        gl_FragColor = vec4(uCol, a);
      }`,
  });
}

export function flyby(group, u, R) {
  const skin = airify(new THREE.MeshStandardMaterial({ color: col([0.45, 0.012, 250]), roughness: 0.45, metalness: 0.35 }), u);
  const geo = jetGeometry();
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false });
  const dot = new THREE.SphereGeometry(0.45, 6, 4);
  const strip = new THREE.PlaneGeometry(1, 2, 24, 1).translate(0.5, 0, 0);
  const jets = [0, 1].map(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, skin));
    // Red on the left wingtip, green on the right, a white strobe on the tail.
    const red = new THREE.Mesh(dot, glow(8, 0.4, 0.3)); red.position.set(5.5, 0, -5.4);
    const grn = new THREE.Mesh(dot, glow(0.3, 7, 1.5)); grn.position.set(-5.5, 0, -5.4);
    const strobe = new THREE.Mesh(dot, glow(14, 14, 14)); strobe.position.set(0, 2.6, -6.6);
    g.add(red, grn, strobe);
    g.visible = false;
    group.add(g);
    const trail = new THREE.Mesh(strip, trailMat());
    trail.frustumCulled = false;
    trail.visible = false;
    group.add(trail);
    return { g, strobe, trail };
  });

  // The first pair comes soon after the page opens; then every minute or two.
  let next = 18, pass = null;
  const D = new THREE.Vector3(), P = new THREE.Vector3(), tip = new THREE.Vector3();
  const show = (v) => jets.forEach(j => { j.g.visible = v; j.trail.visible = v; });

  return {
    tick(t, sun) {
      if (!pass) {
        if (t < next) return;
        const dir = R() < 0.5 ? 1 : -1;
        pass = { t0: t, dir, z: -1500 - 400 * R(), y: 130 + 80 * R() };
        show(true);
      }
      const s = (t - pass.t0) * SPEED;
      if (s > 2 * SPAN || t < pass.t0) {
        pass = null;
        next = t + 60 + 80 * R();
        show(false);
        return;
      }
      D.set(pass.dir, 0, 0);
      // Sunlit vapour by day, faint grey before the sun is up.
      const up = Math.min(1, Math.max(0, (sun.dir.y + 0.02) / 0.06));
      jets.forEach((j, i) => {
        // The wingman flies behind, a little higher and further out.
        const lag = i * 45;
        P.set(-pass.dir * SPAN + pass.dir * (s - lag), pass.y + i * 5 + 6 * Math.sin(s / 420), pass.z - i * 35);
        j.g.position.copy(P);
        j.g.lookAt(tip.copy(P).add(D));
        j.g.rotateZ(pass.dir * 0.12 * Math.sin(s / 420 + 1));
        j.strobe.visible = ((t * 1.1 + i * 0.4) % 1) < 0.06;
        const m = j.trail.material.uniforms;
        m.uP.value.copy(P).addScaledVector(D, -7);
        m.uD.value.copy(D);
        m.uL.value = Math.min(Math.max(s - lag, 0), 700);
        m.uA.value = 0.18 + 0.32 * up;
        m.uCol.value.set(0.9, 0.95, 1.1).multiplyScalar(0.6 + 1.4 * up).add(tip.copy(sun.col).multiplyScalar(0.8 * up));
      });
    },
  };
}
