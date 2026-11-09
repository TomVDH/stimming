// Raid: a blacked-out city at night, seen from a rooftop, under heavy anti-aircraft fire.
// Tracers are moving emitters; the tube's afterglow draws their streaks.
import * as THREE from 'three';
import { rng, lerp, smooth, makeAir, fogify, buildSky, buildStars, Emitters, lambert, FOG_GLSL } from './atmos.js';

const R = rng(1991);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const G = 9.8;
// Drag constant for small-calibre rounds, per second.
const K = 0.32;

/* ---------- smoke puffs ---------- */
// Flak bursts and flare trails leave soft grey puffs that grow and fade.
class Puffs {
  constructor(max, air) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.val = new Float32Array(max * 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aVal', new THREE.BufferAttribute(this.val, 2).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...air, uViewH: { value: 800 } },
      vertexShader: /* glsl */`
        attribute vec2 aVal;
        uniform float uViewH;
        varying float vA, vT;
        ${FOG_GLSL}
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          // World radius to pixels.
          gl_PointSize = clamp(aVal.x * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z, 1.0, 256.0);
          vA = aVal.y;
          vT = exp(-fogDepth(cameraPosition, position));
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uFogCol;
        varying float vA, vT;
        void main() {
          vec2 d = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot(d, d);
          if (r2 > 1.0) discard;
          float a = vA * exp(-r2 * 2.5) * vT;
          // Smoke reads a little darker than the lit haze behind it.
          gl_FragColor = vec4(uFogCol * 0.55, a);
        }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    this.list = [];
  }
  add(p, r0, r1, life) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ p: p.clone(), r0, r1, life, age: 0, drift: V((R() - 0.5) * 2, 0.6 + R(), (R() - 0.5) * 2) });
  }
  update(dt) {
    this.list = this.list.filter(f => (f.age += dt) < f.life);
    this.list.forEach((f, i) => {
      const u = f.age / f.life;
      f.p.addScaledVector(f.drift, dt);
      this.pos[i * 3] = f.p.x; this.pos[i * 3 + 1] = f.p.y; this.pos[i * 3 + 2] = f.p.z;
      this.val[i * 2] = lerp(f.r0, f.r1, 1 - (1 - u) ** 3);
      this.val[i * 2 + 1] = 0.55 * smooth(0, 0.05, u) * (1 - u);
    });
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aVal.needsUpdate = true;
    g.setDrawRange(0, this.list.length);
  }
}

/* ---------- searchlights ---------- */
function buildSearch(air) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...air, uLen: { value: 3200 } },
    vertexShader: /* glsl */`
      varying vec3 vW, vL, vN;
      void main() {
        vL = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uLen;
      varying vec3 vW, vL, vN;
      ${FOG_GLSL}
      void main() {
        float along = clamp(vL.y / uLen, 0.0, 1.0);
        vec3 Vd = normalize(cameraPosition - vW);
        float edge = abs(dot(normalize(vN), Vd));
        float haze = uFog.x * exp(-uFog.y * abs(vW.y)) + uFog.z * exp(-uFog.w * abs(vW.y)) * 40.0;
        float T = exp(-fogDepth(cameraPosition, vW));
        float v = edge / (0.12 + along * 5.0) * (1.0 - smoothstep(0.6, 1.0, along)) * haze * 600.0 * T;
        gl_FragColor = vec4(vec3(v), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const geo = new THREE.CylinderGeometry(70, 0.8, 3200, 24, 1, true).translate(0, 1600, 0);
  return () => {
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    return m;
  };
}

/* ---------- scene ---------- */
export function buildRaid() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.2, 9000);
  const air = makeAir();
  // Smoke haze hangs over the city; fires light it from below.
  air.uFog.value.set(0.0007, 0.02, 0.00011, 1 / 900);
  air.uFogCol.value.setScalar(1.7);
  air.uFogGlow.value.set(0.05, 1.3, 0.7);
  air.uSky.value.set(2.4, 0.45, 2.6, 0.18);

  scene.add(new THREE.HemisphereLight(new THREE.Color(1, 1, 1), new THREE.Color(0.15, 0.15, 0.15), 9));
  scene.add(buildSky(air));
  const stars = buildStars(air, R);
  scene.add(stars);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000).rotateX(-Math.PI / 2), lambert(0.2));
  scene.add(ground);

  /* the rooftop under the viewer */
  const roofY = 23;
  const concrete = lambert(0.42);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 22), concrete);
  roof.position.set(0, roofY - 0.5, 6);
  scene.add(roof);
  const bldg = new THREE.Mesh(new THREE.BoxGeometry(30, roofY - 1, 22), lambert(0.35));
  bldg.position.set(0, (roofY - 1) / 2, 6);
  scene.add(bldg);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(30, 1.1, 0.3), concrete);
  parapet.position.set(0, roofY + 0.55, -4.85);
  scene.add(parapet);
  for (const x of [-15, 15]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 22), concrete);
    side.position.set(x, roofY + 0.55, 6);
    scene.add(side);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 18), lambert(0.6));
  tank.position.set(7, roofY + 1.4, -2.5);
  scene.add(tank);
  for (const [x, z] of [[6.3, -1.8], [7.7, -1.8], [6.3, -3.2], [7.7, -3.2]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), lambert(0.3));
    leg.position.set(x, roofY + 0.3, z);
    scene.add(leg);
  }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, 0.9), new THREE.MeshLambertMaterial({ color: new THREE.Color(0.7, 0.7, 0.7), side: THREE.DoubleSide }));
  dish.position.set(-5, roofY + 1.6, -4.4);
  dish.rotation.x = -1.1;
  scene.add(dish);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 6, 6), lambert(0.5));
  mast.position.set(-9, roofY + 3, -3);
  scene.add(mast);

  /* the city */
  const N = 2600;
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), lambert(0.4), N);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
  const roofs = [];
  for (let i = 0; i < N; i++) {
    const x = (R() - 0.5) * 8000, z = -300 - Math.pow(R(), 0.75) * 5600;
    // Towers cluster round the old centre.
    const core = Math.exp(-((x / 1400) ** 2) - (((z + 2700) / 1300) ** 2));
    const h = 10 + R() * R() * 45 + core * R() * 110 + (R() < 0.012 ? 110 + R() * 90 : 0);
    const w = 14 + R() * 30, d = 14 + R() * 30;
    q.setFromAxisAngle(up, (R() - 0.5) * 0.3);
    mtx.compose(V(x, 0, z), q, V(w, h, d));
    blocks.setMatrixAt(i, mtx);
    blocks.setColorAt(i, new THREE.Color().setScalar(0.75 + R() * 0.5));
    roofs.push(V(x, h, z));
  }
  scene.add(blocks);
  // Domes and a tall broadcast tower.
  for (let i = 0; i < 9; i++) {
    const r = 10 + R() * 18, x = (R() - 0.5) * 3000, z = -1500 - R() * 2800;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0.55));
    dome.position.set(x, 20 + R() * 10, z);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dome.position.y, 20).translate(0, dome.position.y / 2, 0), lambert(0.45));
    drum.position.set(x, 0, z);
    scene.add(dome, drum);
  }
  const towerTop = V(520, 230, -2900);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 9, 230, 10).translate(0, 115, 0), lambert(0.5));
  tower.position.set(towerTop.x, 0, towerTop.z);
  const pod = new THREE.Mesh(new THREE.SphereGeometry(14, 14, 10), lambert(0.5));
  pod.position.set(towerTop.x, 170, towerTop.z);
  scene.add(tower, pod);

  // Blackout: few lamps and windows still burn.
  const lamps = Array.from({ length: 140 }, () => {
    const r = roofs[Math.floor(R() * N)];
    return { p: V(r.x + (R() - 0.5) * 20, R() < 0.5 ? 5 : r.y * R(), r.z + 14), I: R() < 0.25 ? 300 + R() * 500 : 20 + R() * 80, s: 1.4 };
  });

  /* guns */
  const pick = () => roofs[Math.floor(R() * N)];
  // Gun sites sit in the half of the city in front of the roof.
  const front = () => { for (;;) { const r = pick(); if (Math.abs(r.x) < -r.z * 0.75 && r.z < -1200) return r; } };
  const guns = Array.from({ length: 18 }, () => {
    const r = front();
    return {
      p: V(r.x, r.y + 2, r.z), az: R() * Math.PI * 2, el: 0.75 + R() * 0.55, ph: R() * 50,
      rate: 8 + R() * 9, v: 850 + R() * 180, on: R() < 0.7, timer: R() * 3, acc: 0, sweep: 0.15 + R() * 0.35,
    };
  });
  const flak = Array.from({ length: 6 }, () => ({ p: front().clone().add(V(0, 3, 0)), timer: R() * 2, az: R() * 6.28, el: 0.9 + R() * 0.4 }));
  const rounds = [];
  const MAXR = 1700;
  const flashes = [];
  const puffs = new Puffs(260, air);
  scene.add(puffs.points);

  /* flares, blasts, fires: lights from fixed pools so shaders never recompile */
  const flareLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 0, 0, 2); scene.add(l); return l; });
  const blastLight = new THREE.PointLight(0xffffff, 0, 0, 2);
  scene.add(blastLight);
  const fireLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffffff, 0, 0, 2); scene.add(l); return l; });
  const flares = [];
  const fires = [0, 1, 2].map(() => ({ p: pick().clone(), I: 1800 + R() * 1500, ph: R() * 10, smoke: 0 }));
  const blast = { t: -10, p: V(0, 0, 0) };
  let nextFlare = 4, nextBlast = 6;

  const makeSearch = buildSearch(air);
  const searches = Array.from({ length: 4 }, () => {
    const m = makeSearch();
    const r = pick();
    m.position.set(r.x, r.y + 1, r.z);
    scene.add(m);
    return { m, az: R() * 6.28, ph: R() * 10, sp: 0.06 + R() * 0.08 };
  });

  const emit = new Emitters(2300, air);
  scene.add(emit.points);
  const ir = new THREE.SpotLight(0xffffff, 0, 0, 0.3, 0.8, 2);
  scene.add(ir, ir.target);

  const eye = V(0, roofY + 1.7, 0);
  camera.position.copy(eye);
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), fwd = V(0, 0, 0);

  // Position of a round t seconds after it left the muzzle.
  const at = (r, t, out) => {
    const k = (1 - Math.exp(-K * t)) / K;
    return out.copy(r.p0).addScaledVector(r.v, k).add(tmp2.set(0, -0.5 * G * t * t, 0));
  };

  function update(t, dt, { irOn }) {
    air.uFogTime.value = t;
    emit.begin();
    dt = Math.min(dt, 0.05);

    // Light guns hose bursts, sweeping their aim; each round is a tracer.
    for (const g of guns) {
      g.timer -= dt;
      if (g.timer <= 0) { g.on = !g.on; g.timer = g.on ? 1.2 + R() * 3.5 : 0.6 + R() * 3.5; }
      if (!g.on) continue;
      g.acc += g.rate * dt;
      const az = g.az + g.sweep * Math.sin(t * 0.4 + g.ph), el = g.el + 0.18 * Math.sin(t * 0.31 + g.ph * 2);
      while (g.acc >= 1 && rounds.length < MAXR) {
        g.acc -= 1;
        const dir = V(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
        dir.x += (R() - 0.5) * 0.02; dir.y += (R() - 0.5) * 0.02; dir.z += (R() - 0.5) * 0.02;
        rounds.push({ p0: g.p.clone(), v: dir.normalize().multiplyScalar(g.v), t0: t - R() * dt, burn: 3.6 + R() * 1.4, pop: R() < 0.3 });
      }
      // Muzzle flash, mostly hidden behind nearer blocks.
      emit.add(g.p, 5000 * (0.5 + 0.5 * Math.sin(t * 90 + g.ph)), 2.4);
    }
    for (let i = rounds.length - 1; i >= 0; i--) {
      const r = rounds[i], age = t - r.t0;
      if (age > r.burn) {
        // Some rounds self-destruct in a small flash at burnout.
        if (r.pop) flashes.push({ p: at(r, r.burn, V(0, 0, 0)), t0: t, I: 7000, life: 0.09, s: 2.6 });
        rounds.splice(i, 1);
        continue;
      }
      // The tracer brightens off the muzzle, then gutters out.
      const I = 2800 * smooth(0, 0.08, age) * (1 - smooth(r.burn - 0.5, r.burn, age));
      emit.add(at(r, age, tmp), I, 1.8);
    }

    // Heavy flak: unseen shells burst high and hang a puff in the sky.
    for (const f of flak) {
      f.timer -= dt;
      if (f.timer > 0) continue;
      f.timer = 1.1 + R() * 2.2;
      const az = f.az + (R() - 0.5) * 0.8, el = f.el + (R() - 0.5) * 0.3, s = 1600 + R() * 1500;
      const p = f.p.clone().add(V(Math.cos(el) * Math.sin(az) * s, Math.sin(el) * s, -Math.cos(el) * Math.cos(az) * s));
      flashes.push({ p, t0: t + 2 + R(), I: 26000, life: 0.14, s: 4.5, puff: true });
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i], a = t - f.t0;
      if (a < 0) continue;
      if (a > f.life) {
        flashes.splice(i, 1);
        continue;
      }
      if (f.puff && !f.puffed) { puffs.add(f.p, 3, 26, 22 + R() * 10); f.puffed = true; }
      emit.add(f.p, f.I * (1 - a / f.life), f.s);
    }

    // Parachute flares drift down and light the city white.
    if (t > nextFlare && flares.length < 2) {
      nextFlare = t + 14 + R() * 10;
      flares.push({ p: V((R() - 0.5) * 2600, 750 + R() * 300, -1600 - R() * 2000), t0: t, ph: R() * 6, trail: 0 });
    }
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i], a = t - f.t0;
      if (a > 42) { flares.splice(i, 1); continue; }
      f.p.y -= 4.2 * dt;
      f.p.x += Math.sin(t * 0.7 + f.ph) * 1.4 * dt;
      const k = smooth(0, 1.5, a) * (1 - smooth(38, 42, a)) * (0.88 + 0.12 * Math.sin(t * 23 + f.ph) * Math.sin(t * 7.1));
      emit.add(f.p, 30000 * k, 3.4);
      if ((f.trail += dt) > 0.6) { puffs.add(f.p.clone().add(V(0, 8, 0)), 2, 9, 26); f.trail = 0; }
    }
    flareLights.forEach((l, i) => {
      const f = flares[i];
      if (!f) { l.intensity = 0; return; }
      l.position.copy(f.p);
      const a = t - f.t0;
      l.intensity = 9e6 * smooth(0, 1.5, a) * (1 - smooth(38, 42, a));
    });

    // A blast on the ground every so often; it leaves a fire burning.
    if (t > nextBlast) {
      nextBlast = t + 8 + R() * 9;
      blast.t = t;
      blast.p.copy(pick()).setY(4);
      const f = fires[Math.floor(R() * fires.length)];
      f.p.copy(blast.p); f.I = 1800 + R() * 2000;
    }
    const ba = t - blast.t;
    if (ba >= 0 && ba < 2) {
      emit.add(blast.p.clone().add(V(0, 12 + ba * 20, 0)), 30000 * Math.exp(-ba * 3.5), 7 * (1 + ba));
      blastLight.position.copy(blast.p).add(V(0, 30, 0));
      blastLight.intensity = 3e6 * Math.exp(-ba * 4);
    } else blastLight.intensity = 0;
    fires.forEach((f, i) => {
      const fl = 0.75 + 0.25 * Math.sin(t * 9 + f.ph) * Math.sin(t * 3.7 + f.ph * 2);
      emit.add(tmp.copy(f.p).add(V(0, 6, 0)), f.I * fl, 3.2);
      fireLights[i].position.copy(f.p).add(V(0, 10, 0));
      fireLights[i].intensity = 2.5e4 * fl;
      if ((f.smoke += dt) > 0.9) { puffs.add(f.p.clone().add(V((R() - 0.5) * 10, 20, 0)), 6, 40, 30); f.smoke = 0; }
    });

    // Searchlights sweep the smoke.
    for (const s of searches) {
      s.m.rotation.set(0.25 + 0.2 * Math.sin(t * s.sp * 1.7 + s.ph), s.az + Math.sin(t * s.sp + s.ph) * 1.2, 0.15 * Math.sin(t * s.sp * 0.8));
    }

    for (const L of lamps) emit.add(L.p, L.I, L.s);
    if ((t % 1.5) < 0.6) emit.add(towerTop, 900, 2);

    puffs.update(dt);

    camera.getWorldDirection(fwd);
    ir.position.copy(camera.position);
    ir.target.position.copy(camera.position).addScaledVector(fwd, 20);
    ir.intensity = irOn ? 120000 : 0;
    emit.end();
  }

  function setPx(px) {
    emit.mat.uniforms.uPx.value = px;
    stars.material.uniforms.uPx.value = px;
  }
  function pre(r, cam, target) { puffs.mat.uniforms.uViewH.value = target.height; }

  fogify(scene, air);
  return { scene, camera, eye, update, setPx, pre, air, look: { yaw: [-1.5, 1.5], pitch: [-0.4, 1.1], start: 0.08 }, expo: 1.6 };
}
