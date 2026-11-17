// Downwash: the rotors' air hits the ground and spreads out.
// Dust clouds roll out low, grow and thin; rings ripple through the grass under the craft.
import {
  BufferGeometry, BufferAttribute, Points, CanvasTexture, Mesh, CircleGeometry, ShaderMaterial, Color,
  UniformsLib, UniformsUtils
} from 'three';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const N = 260;
// The wash fades out by this height above the ground, in metres.
export const WASH_TOP = 4.5;

// A cloud puff: soft blobs, lit from above, with ragged edges.
// Red holds the light; alpha holds the density.
function cloudTex() {
  const n = 128, c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d');
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), .7) * n * .22;
    const px = n / 2 + Math.cos(a) * d, py = n / 2 + Math.sin(a) * d * .8, rad = n * (.12 + r() * .14);
    // Each blob is brighter on its upper side.
    const g = x.createRadialGradient(px, py - rad * .35, rad * .1, px, py, rad);
    g.addColorStop(0, 'rgba(255,0,0,.34)');
    g.addColorStop(.6, 'rgba(150,0,0,.16)');
    g.addColorStop(1, 'rgba(90,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill();
  }
  // Ragged edges: specks of density eaten away.
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    const px = r() * n, py = r() * n, d = Math.hypot(px - n / 2, py - n / 2) / (n / 2);
    x.fillStyle = `rgba(0,0,0,${.12 + .5 * d * r()})`;
    x.beginPath(); x.arc(px, py, 2 + r() * 6, 0, Math.PI * 2); x.fill();
  }
  const t = new CanvasTexture(c);
  return t;
}

/**
 * @param {import('three').Scene} scene
 * @param {() => boolean} reduced
 * @param {{ x: number, z: number, r: number }} [pad] The landing pad: no grass to press there.
 */
export function createWash(scene, reduced, pad = { x: 0, z: 0, r: 3 }) {
  // Clouds: one puff per slot, recycled in a ring.
  const pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N), rot = new Float32Array(N);
  const tintA = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const age = new Float32Array(N).fill(1e9), life = new Float32Array(N), a0 = new Float32Array(N);
  const s0 = new Float32Array(N), spin = new Float32Array(N);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new BufferAttribute(alpha, 1));
  geo.setAttribute('aRot', new BufferAttribute(rot, 1));
  geo.setAttribute('aTint', new BufferAttribute(tintA, 3));
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: UniformsUtils.merge([UniformsLib.fog, { map: { value: null }, uScale: { value: 500 } }]),
    vertexShader: `attribute float aSize, aAlpha, aRot; attribute vec3 aTint;
      uniform float uScale;
      varying float vAlpha, vRot; varying vec3 vTint;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        // World size to pixels at this depth.
        gl_PointSize = aSize * uScale / max(0.1, -mvPosition.z);
        vAlpha = aAlpha; vRot = aRot; vTint = aTint;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D map;
      varying float vAlpha, vRot; varying vec3 vTint;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float c = cos(vRot), s = sin(vRot);
        p = mat2(c, -s, s, c) * p + 0.5;
        vec4 t = texture2D(map, p);
        float a = t.a * vAlpha;
        if (a < 0.003) discard;
        // Lit tops, shaded undersides.
        gl_FragColor = vec4(vTint * (0.62 + 0.55 * t.r), a);
        #include <fog_fragment>
      }`
  });
  mat.uniforms.map.value = cloudTex();
  const clouds = new Points(geo, mat);
  clouds.frustumCulled = false;
  scene.add(clouds);
  const tints = [new Color('#c4b196'), new Color('#ab9f86'), new Color('#b8ab90')];
  let head = 0, alive = 0, carry = 0;

  // The ground patch: grass pressed flat in gusts that the wash carries outward.
  // Noise, not rings: each gust is a warped patch, so no two look alike.
  const ring = new Mesh(new CircleGeometry(1, 64), new ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: UniformsUtils.merge([UniformsLib.fog, { uT: { value: 0 }, uI: { value: 0 }, uPad: { value: [pad.x, pad.z, pad.r] } }]),
    vertexShader: `varying vec2 vP, vW;
      #include <fog_pars_vertex>
      void main() {
        vP = position.xy;
        vW = (modelMatrix * vec4(position, 1.0)).xz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uT, uI; uniform vec3 uPad; varying vec2 vP, vW;
      #include <fog_pars_fragment>
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + 1.0), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * n2(p); p = p * 2.03 + 17.0; a *= 0.5; }
        return v;
      }
      void main() {
        float d = length(vP);
        // The noise rides outward from the craft, at the wash's speed.
        vec2 out_ = vP / max(d, 1e-3);
        vec2 q = vW - out_ * uT * 2.4;
        // A slow warp breaks up any regular front.
        q += vec2(fbm(vW * 0.7 + uT * 0.21), fbm(vW * 0.7 - uT * 0.17)) * 1.8;
        float g = fbm(q * 1.3);
        // Fine streaks stretched along the flow.
        float s = n2(vec2(dot(vW, vec2(-out_.y, out_.x)) * 6.0, d * 1.5 - uT * 3.0));
        float flat_ = smoothstep(0.42, 0.78, g * 0.8 + s * 0.3);
        float edge = smoothstep(1.0, 0.4, d) * smoothstep(0.0, 0.15, d);
        // Pressed grass shows its pale underside; standing grass stays dark.
        vec3 c = mix(vec3(0.07, 0.08, 0.05), vec3(0.62, 0.6, 0.47), flat_);
        float a = edge * uI * (0.08 + 0.34 * flat_);
        // No grass on the pad.
        a *= smoothstep(uPad.z, uPad.z + 0.3, distance(vW, uPad.xy));
        gl_FragColor = vec4(c, a);
        #include <fog_fragment>
      }`
  }));
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 1;
  scene.add(ring);

  return {
    get alive() { return alive > 0; },
    /**
     * @param {number} dt
     * @param {number} t
     * @param {{ x: number, z: number, ground: number, agl: number, load: number, armed: boolean, wind: number[] }} s
     * @param {number} pxScale Pixels per metre at one metre: half the buffer height over tan of half the fov.
     * @returns {number} The wash strength, 0 to about 1.5.
     */
    update(dt, t, s, pxScale) {
      // Idle rotors on the ground move no air worth seeing.
      // The wash starts above about 30 percent of hover thrust.
      const lift = s.armed ? clamp((s.load - .3) / .7, 0, 1.5) : 0;
      const I = lift * clamp(1 - s.agl / WASH_TOP, 0, 1);
      mat.uniforms.uScale.value = pxScale;
      // The pressed grass: none on a roof.
      ring.position.set(s.x, s.ground + .025, s.z);
      ring.scale.setScalar(1.6 + s.agl * 1.1 + I * 1.2);
      ring.material.uniforms.uT.value = reduced() ? 0 : t;
      ring.material.uniforms.uI.value += (I - ring.material.uniforms.uI.value) * (1 - Math.exp(-dt * 6));
      ring.visible = ring.material.uniforms.uI.value > .01 && s.ground < .05;

      // New clouds: more, and faster, the lower and harder the rotors blow.
      carry += I * (reduced() ? 50 : 120) * dt;
      while (carry >= 1) {
        carry--;
        const i = head;
        head = (head + 1) % N;
        const a = Math.random() * Math.PI * 2, r0 = .4 + Math.random() * (.8 + s.agl * .3);
        const sp = (1.6 + Math.random() * 2.8) * I * (1 - .4 * s.agl / WASH_TOP);
        pos[i * 3] = s.x + Math.cos(a) * r0; pos[i * 3 + 1] = s.ground + .15 + Math.random() * .2; pos[i * 3 + 2] = s.z + Math.sin(a) * r0;
        vel[i * 3] = Math.cos(a) * sp + s.wind[0] * .3; vel[i * 3 + 1] = .12 + Math.random() * .4 * I; vel[i * 3 + 2] = Math.sin(a) * sp + s.wind[2] * .3;
        age[i] = 0; life[i] = 1.6 + Math.random() * 1.3; a0[i] = .35 + Math.random() * .3;
        s0[i] = .6 + Math.random() * .5; rot[i] = Math.random() * 6.283; spin[i] = (Math.random() - .5) * 1.2;
        const c = tints[i % 3];
        tintA[i * 3] = c.r; tintA[i * 3 + 1] = c.g; tintA[i * 3 + 2] = c.b;
      }
      // Old clouds slow, swell, drift with the wind and thin out.
      alive = 0;
      const drag = Math.exp(-dt * 1.2);
      for (let i = 0; i < N; i++) {
        if (age[i] > life[i]) { alpha[i] = 0; continue; }
        alive++;
        age[i] += dt;
        const k = i * 3;
        vel[k] = vel[k] * drag + s.wind[0] * (1 - drag) * .6;
        vel[k + 1] = vel[k + 1] * drag;
        vel[k + 2] = vel[k + 2] * drag + s.wind[2] * (1 - drag) * .6;
        pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
        const u = age[i] / life[i];
        size[i] = s0[i] * (1 + 2.2 * Math.sqrt(u));
        rot[i] += spin[i] * dt;
        alpha[i] = a0[i] * Math.min(1, u * 6) * Math.pow(1 - u, 1.3);
      }
      for (const n of ['position', 'aSize', 'aAlpha', 'aRot', 'aTint']) geo.attributes[n].needsUpdate = true;
      clouds.visible = alive > 0;
      return I;
    }
  };
}
