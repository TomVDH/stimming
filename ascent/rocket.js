// Ascent vehicle: the shared rocket, its probe, and Ascent's own effects.
// Effects: flames, the trail, vapour at max-q, ice at staging.
// The page places rk.root each frame in a camera-centred world, in metres.
import * as THREE from 'three';
import { EV } from './flight.js';
import { makeProbe } from './probe.js';
import { makeRocket, makeFlame, flamePair, FLAME_C } from '../shared/rocket.js';

const K2_NOISE = /* glsl */`
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}`;

export function makeVehicle(scene, size = 'medium') {
  const rk = makeRocket({ size, detail: 'near' });
  const d = rk.dims, M = rk.M;
  // k scales effects to the rocket's width; Medium is 1.
  const k = d.W / 3.7;
  const rocket = rk.root, lower = rk.lower, upper = rk.upper, halves = rk.halves, cores = rk.cores;
  scene.add(rocket);

  // The probe rides under the fairing; after it parts, it owns the frame.
  const probe = makeProbe();
  probe.group.scale.setScalar(Math.min(1, d.rf / 2.4));
  probe.group.position.y = d.payload;
  rk.body.add(probe.group);

  /* ---------- flames: a tail from the side, a disc down the jet ---------- */
  const tail1 = makeFlame(), disc1 = makeFlame({ mode: 'disc' }), tail2 = makeFlame(), disc2 = makeFlame({ mode: 'disc' });
  const flames = [tail1, disc1, tail2, disc2];
  scene.add(...flames);
  const engineLight = new THREE.PointLight(0xffaa66, 0, 160, 1.6);
  scene.add(engineLight);

  /* ---------- vapour on the hull at max-q ---------- */
  const AIR = { uTime: { value: 0 }, uLightC: { value: new THREE.Color(1, 1, 1) }, uAmb: { value: new THREE.Color(0.2, 0.25, 0.35) }, uSunW: { value: new THREE.Vector3(0, 1, 0) }, uAmt: { value: 0 } };
  const vapour = new THREE.Group();
  // Two shells hug the first stage's upper half.
  for (const [r, y0, y1] of [[d.r + 0.12 * k, 0.22 * d.s1Top, 0.88 * d.s1Top], [d.r + 0.27 * k, 0.43 * d.s1Top, 0.89 * d.s1Top]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, y1 - y0, 48, 1, true).translate(0, (y0 + y1) / 2, 0), new THREE.ShaderMaterial({
      uniforms: AIR, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      vertexShader: /* glsl */`varying vec3 vL, vN, vW; varying vec2 vUv;
        void main() { vL = position; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
      uniform float uTime, uAmt; uniform vec3 uLightC, uAmb, uSunW;
      varying vec3 vL, vN, vW; varying vec2 vUv;
      ${K2_NOISE}
      void main() {
        float face = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
        // Streaks race down the hull.
        float ang = atan(vL.z, vL.x);
        float s = k2noise(vec2(ang * 9.0, vL.y * 0.35 + uTime * 9.0)) * 0.65 + k2noise(vec2(ang * 23.0, vL.y * 0.9 + uTime * 17.0)) * 0.35;
        float a = smoothstep(0.45, 0.85, s) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y) * pow(face, 0.6) * 0.32 * uAmt;
        vec3 c = mix(uAmb, uLightC, 0.55 + 0.45 * dot(normalize(vN), uSunW));
        gl_FragColor = vec4(c, a);
      }`,
    }));
    m.renderOrder = 5;
    vapour.add(m);
  }
  lower.add(vapour);

  /* ---------- trail: soft puffs down the axis ---------- */
  const PUFFS = 80;
  const TR = { uBase: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3() }, uSunW: AIR.uSunW, uLightC: AIR.uLightC, uAmb: AIR.uAmb, uTime: AIR.uTime, uAmt: { value: 0 }, uGrow: { value: 1 } };
  const trailGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(2, 2));
  {
    const a = new Float32Array(PUFFS * 3);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < PUFFS; i++) { const s = 14 * k * Math.pow(300, i / (PUFFS - 1)); a.set([s, 2.2 * k + s * 0.05, rnd()], i * 3); }
    trailGeo.setAttribute('iPuff', new THREE.InstancedBufferAttribute(a, 3));
    trailGeo.instanceCount = PUFFS;
  }
  const trail = new THREE.Mesh(trailGeo, new THREE.ShaderMaterial({
    uniforms: TR, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: /* glsl */`attribute vec3 iPuff; uniform vec3 uBase, uAxis; uniform float uGrow; varying vec2 vQ; varying float vS, vD;
      void main() {
        vec3 c = uBase + uAxis * iPuff.x;
        vec3 rt = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vQ = position.xy; vS = iPuff.z; vD = iPuff.x;
        float size = iPuff.y + iPuff.x * 0.05 * (uGrow - 1.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(c + (rt * position.x + up * position.y) * size, 1.0);
      }`,
    fragmentShader: /* glsl */`uniform vec3 uSunW, uLightC, uAmb; uniform float uTime, uAmt; varying vec2 vQ; varying float vS, vD;
      ${K2_NOISE}
      void main() {
        float r = length(vQ);
        float n = k2noise(vQ * 3.0 + vS * 40.0 + vec2(0.0, uTime * 0.3)) * 0.6 + k2noise(vQ * 7.0 + vS * 17.0) * 0.4;
        float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.5) * 0.08 * uAmt;
        float lit = 0.5 + 0.5 * dot(normalize(vec3(vQ, 0.4)), normalize(vec3(0.0, 0.0, 1.0) + uSunW * 0.6));
        vec3 c = mix(uAmb, uLightC, lit) + vec3(1.0, 0.5, 0.2) * 3.0 * exp(-vD / 22.0);
        gl_FragColor = vec4(c, a);
      }`,
  }));
  trail.frustumCulled = false;
  trail.renderOrder = 4;
  scene.add(trail);

  /* ---------- ice flakes at staging ---------- */
  const FLAKES = 260;
  const flakeGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(FLAKES * 3), v = new Float32Array(FLAKES * 4);
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < FLAKES; i++) {
      const a = rnd() * Math.PI * 2, r = d.r + rnd() * 0.4 * k;
      p.set([Math.cos(a) * r, d.interTop - 0.5 * k + rnd() * 1.5 * k, Math.sin(a) * r], i * 3);
      v.set([Math.cos(a) * (0.3 + rnd()), -1.5 - rnd() * 4, Math.sin(a) * (0.3 + rnd()), rnd()], i * 4);
    }
    flakeGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    flakeGeo.setAttribute('vel', new THREE.BufferAttribute(v, 4));
  }
  const FL = { uT: { value: 0 }, uScale: { value: 400 }, uLit: { value: 1 } };
  const flakes = new THREE.Points(flakeGeo, new THREE.ShaderMaterial({
    uniforms: FL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: /* glsl */`attribute vec4 vel; uniform float uT, uScale; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position + vel.xyz * uT, 1.0);
        vA = 0.5 + 0.5 * sin(uT * (6.0 + vel.w * 9.0) + vel.w * 40.0);
        gl_PointSize = clamp(uScale * (0.02 + 0.025 * vel.w) / -mv.z, 1.0, 10.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`uniform float uLit; varying float vA;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float d = length(q);
        float a = exp(-d * d * 6.0) + 0.6 * exp(-abs(q.x) * 18.0) * exp(-abs(q.y) * 2.0) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * a * (0.4 + 1.6 * vA) * uLit, 1.0);
      }`,
  }));
  flakes.frustumCulled = false;
  upper.add(flakes);

  const tmp = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();

  // Places the stages, side cores, fairing and probe for time t.
  function pose(t) {
    // Heavy: the side cores fall away first, outward and back.
    const dc = t - EV.cores;
    cores.forEach((c, i) => {
      const s = i === 0 ? -1 : 1;
      if (dc <= 0) { c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.visible = true; return; }
      c.visible = dc < 30;
      c.position.set(s * (0.8 * dc + 0.4 * dc * dc), -(1.0 * dc + 1.2 * dc * dc), 0);
      c.rotation.set(0, 0, s * 0.02 * dc * dc);
    });
    // Staging: the spent stage falls back, drifts and turns.
    const ds = t - EV.sep;
    lower.visible = ds < 45;
    if (ds > 0) {
      const back = 1.2 * ds + 0.5 * 2.2 * ds * ds;
      lower.position.set(0.25 * ds, -back, 0.12 * ds);
      lower.rotation.set(0.006 * ds * ds, 0, 0.015 * ds);
    } else { lower.position.set(0, 0, 0); lower.rotation.set(0, 0, 0); }
    // The fairing halves swing out on their hinges, then fall away.
    const df = t - EV.fairing;
    halves.forEach((h, i) => {
      const s = i === 0 ? -1 : 1;
      if (df <= 0) { h.position.set(-s * d.rf, d.upperTop, 0); h.rotation.set(0, 0, 0); h.visible = true; return; }
      h.visible = df < 40;
      h.rotation.set(0, 0, s * Math.min(df * 0.9, 1.4) + s * df * 0.05);
      h.position.set(-s * (d.rf + df * 1.6), d.upperTop - 0.5 * 3.0 * df * df, 0.1 * df);
    });
    // The probe pushes off; the spent stage backs away and turns aside.
    const dp = t - EV.probeSep;
    if (dp > 0) {
      upper.position.set(0.04 * dp, -(0.35 * dp + 0.5 * 0.3 * dp * dp), -0.03 * dp);
      upper.rotation.set(Math.min(0.0015 * dp * dp, 0.9), 0, Math.min(0.0008 * dp * dp, 0.5));
      upper.visible = dp < 140;
    } else { upper.position.set(0, 0, 0); upper.rotation.set(0, 0, 0); upper.visible = true; }
    probe.deploy((t - EV.deploy) / (EV.deployEnd - EV.deploy));
    // Out in the dark the probe turns slowly on its long axis.
    probe.group.rotation.set(0, 0.035 * Math.max(0, t - EV.deployEnd), 0);
  }

  // Poses the effects for flight state f at time t.
  // light: sunlight colour at the rocket; eye: the camera in this world.
  // gain keeps the flame's screen brightness as exposure changes.
  function update(f, t, light, sunW, eye, gain = 1) {
    const axis = tmp.set(0, -1, 0).applyQuaternion(rocket.quaternion);
    rocket.updateMatrixWorld(true);
    // First stage flame: wider and softer as the air thins.
    p1.set(0, -0.2, 0).applyMatrix4(lower.matrixWorld);
    const F1 = tail1.userData.U;
    tail1.visible = f.thrust1 > 0;
    F1.uFlame.value.set(p1.x, p1.y, p1.z, f.thrust1 * gain);
    F1.uAxis.value.copy(axis);
    F1.uSpread.value = THREE.MathUtils.smoothstep(f.h, 4, 55);
    F1.uSize.value = (8 + 10 * F1.uSpread.value) * k;
    F1.uLen.value = 7;
    F1.uTime.value = t;
    flamePair(tail1, disc1, eye);
    // Upper stage flame: a faint vacuum plume.
    p2.set(0, d.nozzle2 - 0.1, 0).applyMatrix4(upper.matrixWorld);
    const F2 = tail2.userData.U;
    tail2.visible = f.thrust2 > 0;
    F2.uFlame.value.set(p2.x, p2.y, p2.z, f.thrust2 * 0.07 * gain);
    F2.uAxis.value.copy(axis);
    F2.uSize.value = 1.3 * k; F2.uSpread.value = 0.25; F2.uLen.value = 4;
    F2.uFlameC.value.setRGB(0.55, 0.62, 1.0).lerp(FLAME_C, 0.35);
    F2.uTime.value = t;
    flamePair(tail2, disc2, eye);
    // The bell glows after each burn and cools over half a minute.
    const since = f.thrust2 > 0 ? 0 : Math.min(t > EV.tliEnd ? t - EV.tliEnd : t > EV.seco ? t - EV.seco : 99, 99);
    M.vac.emissiveIntensity = f.thrust2 > 0 ? 2.5 : t > EV.ign2 ? 2.5 * Math.exp(-since / 12) : 0;
    // The engine light follows whichever engine burns.
    if (f.thrust1 > 0) { engineLight.position.copy(p1); engineLight.intensity = 900 * f.thrust1 * gain * k * k; }
    else if (f.thrust2 > 0) { engineLight.position.copy(p2); engineLight.intensity = 260 * f.thrust2 * gain * k * k; }
    else engineLight.intensity = 0;
    // Air effects: vapour at max-q, a trail while the first stage burns.
    AIR.uTime.value = t;
    AIR.uSunW.value.copy(sunW);
    AIR.uLightC.value.setRGB(light[0], light[1], light[2]).multiplyScalar(1.3);
    // Unlit trail takes the dim blue of the dawn sky.
    AIR.uAmb.value.setRGB(0.05, 0.07, 0.12).multiplyScalar(0.3 + 0.7 * Math.min(1, f.rho * 3));
    AIR.uAmt.value = f.q > 0.25 ? (f.q - 0.25) / 0.75 : 0;
    vapour.visible = AIR.uAmt.value > 0;
    trail.visible = f.thrust1 > 0;
    TR.uBase.value.copy(p1);
    TR.uAxis.value.copy(axis);
    TR.uAmt.value = f.thrust1 * Math.min(1, 0.3 + f.rho * 3);
    // Thin air lets the plume balloon: puffs grow with height.
    TR.uGrow.value = 1 + Math.max(0, f.h - 20) / 6;
    const ds = t - EV.sep;
    flakes.visible = ds > 0 && ds < 14;
    FL.uT.value = Math.max(ds, 0);
    FL.uLit.value = 0.35 * Math.min(1, (light[0] + light[1] + light[2]) / 1.5);
  }

  // Removes every part from the scene and frees the GPU memory.
  function dispose() {
    for (const o of [rocket, trail, engineLight, ...flames]) {
      scene.remove(o);
      o.traverse(m => { m.geometry?.dispose(); if (m.material && !m.material.map) m.material.dispose?.(); });
    }
  }

  return { rocket, lower, upper, probe: probe.group, dims: d, pose, update, M, engineLight, dispose, flame: tail1.userData.U };
}
