// Downwash: the rotors' air hits the ground and spreads out.
// Dust flies out low and fast; rings ripple through the grass under the craft.
import {
  BufferGeometry, BufferAttribute, Points, PointsMaterial, CanvasTexture, SRGBColorSpace,
  Mesh, CircleGeometry, ShaderMaterial, Color
} from 'three';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const N = 900;
// The wash fades out by this height above the ground, in metres.
export const WASH_TOP = 4.5;

function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * @param {import('three').Scene} scene
 * @param {() => boolean} reduced
 */
export function createWash(scene, reduced) {
  // Dust: one particle per slot, recycled in a ring.
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), vel = new Float32Array(N * 3);
  const age = new Float32Array(N).fill(1e9), life = new Float32Array(N), a0 = new Float32Array(N);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 4));
  const dust = new Points(geo, new PointsMaterial({ size: .32, map: softDot(), vertexColors: true, transparent: true,
    depthWrite: false, sizeAttenuation: true }));
  dust.frustumCulled = false;
  scene.add(dust);
  const tint = [new Color('#cdb99c'), new Color('#9c9a6e'), new Color('#b8a988')];
  let head = 0, alive = 0, carry = 0;

  // The ground ring: pressed grass, with ripples running outward.
  const ring = new Mesh(new CircleGeometry(1, 64), new ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: { uT: { value: 0 }, uI: { value: 0 }, fogColor: { value: new Color() }, fogDensity: { value: 0 }, fogNear: { value: 1 }, fogFar: { value: 2 } },
    vertexShader: `varying vec2 vP;
      #include <fog_pars_vertex>
      void main() {
        vP = position.xy;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uT, uI; varying vec2 vP;
      #include <fog_pars_fragment>
      void main() {
        float d = length(vP);
        // Dark where the grass lies flat, pale at the crests of the ripples.
        float rip = 0.5 + 0.5 * sin(d * 22.0 - uT * 11.0);
        float edge = smoothstep(1.0, 0.55, d) * smoothstep(0.0, 0.2, d);
        vec3 c = mix(vec3(0.08, 0.09, 0.05), vec3(0.75, 0.7, 0.58), rip * 0.55);
        gl_FragColor = vec4(c, edge * uI * (0.22 + 0.2 * rip));
        #include <fog_fragment>
      }`
  }));
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 1;
  scene.add(ring);
  // The ring shares the scene's fog.
  ring.material.onBeforeRender = (r, s) => {
    const u = ring.material.uniforms;
    if (s.fog) { u.fogColor.value.copy(s.fog.color); u.fogDensity.value = s.fog.density ?? 0; }
  };

  return {
    get alive() { return alive > 0; },
    /**
     * @param {number} dt
     * @param {number} t
     * @param {{ x: number, z: number, ground: number, agl: number, load: number, armed: boolean, wind: number[] }} s
     * @returns {number} The wash strength, 0 to about 1.5.
     */
    update(dt, t, s) {
      const I = s.armed ? clamp(s.load, 0, 1.5) * clamp(1 - s.agl / WASH_TOP, 0, 1) : 0;
      // The ring.
      ring.position.set(s.x, s.ground + .025, s.z);
      ring.scale.setScalar(1.6 + s.agl * 1.1 + I * 1.2);
      ring.material.uniforms.uT.value = reduced() ? 0 : t;
      ring.material.uniforms.uI.value += (I - ring.material.uniforms.uI.value) * (1 - Math.exp(-dt * 6));
      ring.visible = ring.material.uniforms.uI.value > .01;

      // New dust: more of it, and faster, the lower and harder the rotors blow.
      carry += I * (reduced() ? 220 : 520) * dt;
      while (carry >= 1) {
        carry--;
        const i = head;
        head = (head + 1) % N;
        const a = Math.random() * Math.PI * 2, r0 = .3 + Math.random() * (.5 + s.agl * .35);
        const sp = (2.5 + Math.random() * 5) * I;
        pos[i * 3] = s.x + Math.cos(a) * r0; pos[i * 3 + 1] = s.ground + .05 + Math.random() * .15; pos[i * 3 + 2] = s.z + Math.sin(a) * r0;
        vel[i * 3] = Math.cos(a) * sp + s.wind[0] * .4; vel[i * 3 + 1] = .3 + Math.random() * 1.1 * I; vel[i * 3 + 2] = Math.sin(a) * sp + s.wind[2] * .4;
        age[i] = 0; life[i] = .7 + Math.random() * 1.1; a0[i] = .12 + Math.random() * .22;
        const c = tint[i % 3];
        col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b;
      }
      // Old dust slows, sinks and fades.
      alive = 0;
      const drag = Math.exp(-dt * 1.8);
      for (let i = 0; i < N; i++) {
        if (age[i] > life[i]) { col[i * 4 + 3] = 0; continue; }
        alive++;
        age[i] += dt;
        const k = i * 3;
        vel[k] = vel[k] * drag + s.wind[0] * (1 - drag) * .5;
        vel[k + 1] = vel[k + 1] * drag - .9 * dt;
        vel[k + 2] = vel[k + 2] * drag + s.wind[2] * (1 - drag) * .5;
        pos[k] += vel[k] * dt; pos[k + 1] = Math.max(s.ground + .02, pos[k + 1] + vel[k + 1] * dt); pos[k + 2] += vel[k + 2] * dt;
        const u = age[i] / life[i];
        col[i * 4 + 3] = a0[i] * Math.min(1, u * 8) * Math.pow(1 - u, 1.5);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      dust.visible = alive > 0;
      return I;
    }
  };
}
