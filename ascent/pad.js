// Ascent pad: the ground round the pad, the deck, the tower, the floodlights.
// The steam is a volume pass: ascent/steam.js.
// Layout follows Ten seconds (docs/plans/ascent-launch.md, section 4).
// Metres; the pad frame's origin is the deck's centre; x east, y up, z north.
// From the pad, U points to Ten seconds' tripod (west-north-west); V runs along the shore.
import * as THREE from 'three';

export const PAD_U = new THREE.Vector3(-0.970, 0, 0.242).normalize();
export const PAD_V = new THREE.Vector3(0.242, 0, 0.970).normalize();

// The ground's plan: water and its albedo at a point q (metres along U, along V).
// Shared with the backdrop, so the near ground and the far Earth agree.
export const PAD_GROUND = /* glsl */`
float pgHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float pgNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pgHash(i), pgHash(i + vec2(1, 0)), u.x), mix(pgHash(i + vec2(0, 1)), pgHash(i + vec2(1, 1)), u.x), u.y);
}
float pgFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * pgNoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
// x: water (0 or 1, soft), y: reed cover, z: land kind (0 mud, 1 scrub).
vec3 pgPlan(vec2 q) {
  float s = q.x + (pgFbm(q * 0.004) - 0.5) * 60.0, a = q.y;
  float water = 0.0, reed = 0.0, scrub = 0.0;
  if (s < 0.0) {
    // East of the shore: flat scrub and fields, a few ponds.
    scrub = 1.0;
    water = smoothstep(0.72, 0.76, pgFbm(q * 0.0025 + 3.0)) * smoothstep(-300.0, -900.0, s);
  } else if (s < 140.0) {
    // The lagoon in front of the pad.
    water = smoothstep(0.0, 8.0, s);
  } else if (s < 2600.0) {
    // The flats: mud and shallow pools.
    // Pools are long and thin, laid out along the shore.
    water = smoothstep(0.66, 0.69, pgFbm(q * vec2(0.012, 0.004) + 7.0) * 0.8 + pgNoise(q * 0.03) * 0.2);
    reed = smoothstep(2200.0, 2600.0, s) * 0.6;
  } else {
    // The marsh: reeds cut by five meandering channels.
    reed = 1.0;
    for (int k = 0; k < 5; k++) {
      float c = k == 0 ? 2300.0 : k == 1 ? 2680.0 : k == 2 ? 2920.0 : k == 3 ? 3100.0 : 3275.0;
      float w = k == 0 ? 34.0 : k == 1 ? 24.0 : k == 2 ? 16.0 : k == 3 ? 12.0 : 8.0;
      float m = s - c - 60.0 * sin(a / 260.0 + float(k) * 1.7) - 25.0 * sin(a / 90.0 + float(k));
      water = max(water, smoothstep(w, w * 0.6, abs(m)));
    }
  }
  return vec3(water, reed * (1.0 - water), scrub);
}
vec3 pgAlbedo(vec2 q, vec3 plan) {
  float n = pgFbm(q * 0.05), m = pgFbm(q * 0.6);
  vec3 mud = mix(vec3(0.045, 0.034, 0.028), vec3(0.075, 0.058, 0.045), n);
  vec3 scrub = mix(vec3(0.03, 0.035, 0.022), vec3(0.065, 0.06, 0.04), pgFbm(q * 0.01));
  vec3 reed = mix(vec3(0.07, 0.065, 0.035), vec3(0.13, 0.11, 0.06), m);
  vec3 c = mix(mud, scrub, plan.z);
  return mix(c, reed, plan.y);
}
`;

// Deck paint: weathered concrete, a scorch round the mount, joints and markings.
function deckTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#5c5b56'; g.fillRect(0, 0, 1024, 1024);
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2500; i++) {
    const v = Math.floor(70 + rnd() * 40);
    g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.25)`;
    g.fillRect(rnd() * 1024, rnd() * 1024, 2 + rnd() * 30, 2 + rnd() * 30);
  }
  g.strokeStyle = 'rgba(20,20,20,0.5)'; g.lineWidth = 2;
  for (let x = 0; x <= 1024; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(1024, x); g.stroke(); }
  // Soot fans out from the mount along the trench.
  const sc = g.createRadialGradient(512, 512, 30, 512, 512, 420);
  sc.addColorStop(0, 'rgba(8,7,6,0.95)'); sc.addColorStop(0.5, 'rgba(15,12,10,0.6)'); sc.addColorStop(1, 'rgba(20,18,16,0)');
  g.fillStyle = sc; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = 'rgba(200,170,40,0.55)';
  for (let i = 0; i < 4; i++) { g.save(); g.translate(512, 512); g.rotate(i * Math.PI / 2); g.fillRect(-380, -6, 120, 12); g.restore(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function makePad(scene) {
  const group = new THREE.Group();
  scene.add(group);

  /* ---------- the ground: one wide disc, faded to the backdrop at its rim ---------- */
  const GU = {
    uFlame: { value: new THREE.Vector4() }, uFlameC: { value: new THREE.Color(1.0, 0.55, 0.22) },
    uSky: { value: new THREE.Color(0.02, 0.03, 0.06) }, uSun: { value: new THREE.Color(0, 0, 0) }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uLamps: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uPad: { value: new THREE.Vector3() }, uU: { value: PAD_U }, uV: { value: PAD_V },
    uTime: { value: 0 }, uFade: { value: 6000 },
  };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9000, 96).rotateX(-Math.PI / 2).translate(0, -1.6, 0), new THREE.ShaderMaterial({
    uniforms: GU, transparent: true, depthWrite: true,
    vertexShader: /* glsl */`varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
    uniform vec4 uFlame, uLamps[4]; uniform vec3 uFlameC, uSky, uSun, uSunDir, uPad, uU, uV; uniform float uTime, uFade;
    varying vec3 vP;
    ${PAD_GROUND}
    void main() {
      vec3 rel = vP - uPad;
      vec2 q = vec2(dot(rel, uU), dot(rel, uV));
      vec3 plan = pgPlan(q);
      vec3 alb = pgAlbedo(q, plan);
      // The compound: a square of dark gravel round the deck, and an access road.
      vec2 bq = abs(q) - vec2(70.0) + (pgNoise(q * 0.08) - 0.5) * 14.0;
      float box = length(max(bq, 0.0)) + min(max(bq.x, bq.y), 0.0);
      float road = smoothstep(5.0, 3.5, abs(q.y + 0.03 * q.x)) * step(q.x, -60.0) * step(-1400.0, q.x);
      float apron = max(smoothstep(4.0, -4.0, box), road);
      vec3 grav = mix(vec3(0.04, 0.038, 0.034), vec3(0.06, 0.056, 0.05), pgNoise(q * 0.4) * 0.3 + pgNoise(q * 3.0) * 0.7);
      // Soot spreads from the trench mouths over the gravel.
      grav *= 1.0 - 0.7 * smoothstep(60.0, 0.0, abs(q.x)) * smoothstep(110.0, 30.0, abs(q.y));
      alb = mix(alb, grav, apron);
      float water = plan.x * (1.0 - apron);
      vec3 V = normalize(cameraPosition - vP);
      vec3 N = vec3(0.0, 1.0, 0.0);
      // Light: the flame, the floodlights, the sky, the sun.
      vec3 Lf = uFlame.xyz - vP; float df = length(Lf);
      vec3 flame = uFlameC * uFlame.w * 5.0e4 / (df * df + 400.0) * max(dot(N, Lf / df), 0.0);
      vec3 lamps = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        vec3 Ll = uLamps[i].xyz - vP; float dl = length(Ll);
        lamps += vec3(1.0, 0.68, 0.34) * uLamps[i].w * 3000.0 / (dl * dl + 900.0) * max(dot(N, Ll / dl), 0.0);
      }
      vec3 diffuse = alb * (flame + lamps + uSky * 3.0 + uSun * max(uSunDir.y, 0.0) * 6.0);
      // Water: dark, with the sky and a bright smear of each light in it.
      vec2 rip = vec2(pgNoise(q * 0.15 + uTime * 0.3), pgNoise(q * 0.15 + 9.0 - uTime * 0.2)) - 0.5;
      vec3 Nw = normalize(vec3(rip.x * 0.08, 1.0, rip.y * 0.08));
      vec3 R = reflect(-V, Nw);
      float fres = 0.02 + 0.98 * pow(1.0 - max(dot(V, Nw), 0.0), 5.0);
      vec3 refl = uSky * 3.5 * (0.5 + 0.8 * R.y);
      vec3 fm = vec3(uFlame.x, -uFlame.y - 3.2, uFlame.z) - vP;
      refl += uFlameC * uFlame.w * 60.0 * pow(max(dot(R, normalize(fm)), 0.0), 900.0);
      refl += uFlameC * uFlame.w * 1.2 * pow(max(dot(R, normalize(fm)), 0.0), 30.0);
      for (int i = 0; i < 4; i++) {
        vec3 lm = vec3(uLamps[i].x, -uLamps[i].y - 3.2, uLamps[i].z) - vP;
        refl += vec3(1.0, 0.68, 0.34) * uLamps[i].w * 6.0 * pow(max(dot(R, normalize(lm)), 0.0), 600.0);
      }
      vec3 c = mix(diffuse, refl * (0.3 + fres) + alb * 0.2 * (flame + lamps), water);
      // Haze thickens with distance; the rim fades to the far Earth.
      float d = length(cameraPosition - vP);
      c = mix(c, uSky * 1.5, 1.0 - exp(-d / 9000.0));
      float a = 1.0 - smoothstep(uFade * 0.7, uFade, d);
      gl_FragColor = vec4(c, a);
    }`,
  }));
  ground.renderOrder = -10;
  group.add(ground);

  /* ---------- the deck and its flame trench ---------- */
  const concrete = new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.95 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.55, metalness: 0.6 });
  const add = (geo, mat, parent = group) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  add(new THREE.BoxGeometry(70, 4, 70).translate(0, -2, 0), concrete);
  // The trench runs along V and opens at both edges of the deck.
  const trench = add(new THREE.BoxGeometry(12, 0.2, 72).translate(0, 0.02, 0), dark);
  trench.lookAt(PAD_V.clone());
  // A ring of the mount under the rocket.
  add(new THREE.CylinderGeometry(4.2, 4.6, 1.6, 32).translate(0, 0.8, 0), steel);

  /* ---------- the tower: a steel lattice beside the rocket ---------- */
  const TOWER_H = 70, TW = 6, LEV = 6;
  const towerAt = PAD_U.clone().multiplyScalar(-8).addScaledVector(PAD_V, 12);
  const tower = new THREE.Group();
  tower.position.copy(towerAt);
  group.add(tower);
  const beams = [];
  const beam = (a, b, w) => beams.push([a, b, w]);
  const c4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * TW / 2, z * TW / 2]);
  for (let i = 0; i < 4; i++) beam([c4[i][0], 0, c4[i][1]], [c4[i][0], TOWER_H, c4[i][1]], 0.45);
  for (let y = LEV; y <= TOWER_H; y += LEV) {
    for (let i = 0; i < 4; i++) {
      const a = c4[i], b = c4[(i + 1) % 4];
      beam([a[0], y, a[1]], [b[0], y, b[1]], 0.25);
      beam([a[0], y - LEV, a[1]], [b[0], y, b[1]], 0.16);
      beam([b[0], y - LEV, b[1]], [a[0], y, a[1]], 0.16);
    }
  }
  // Swing arms, swung away from the rocket.
  for (const y of [22, 44, 58]) beam([0, y, 0], [-6 + y * 0.02, y, 8], 0.5);
  // The lightning mast on top.
  beam([0, TOWER_H, 0], [0, TOWER_H + 14, 0], 0.2);
  const ib = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, beams.length);
  const m4 = new THREE.Matrix4(), qv = new THREE.Quaternion(), A = new THREE.Vector3(), B = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  beams.forEach(([a, b, w], i) => {
    A.set(...a); B.set(...b);
    const len = A.distanceTo(B);
    qv.setFromUnitVectors(Y, B.clone().sub(A).normalize());
    m4.compose(A.clone().add(B).multiplyScalar(0.5), qv, new THREE.Vector3(w, len, w));
    ib.setMatrixAt(i, m4);
  });
  ib.castShadow = ib.receiveShadow = true;
  tower.add(ib);
  // Red obstruction lamps blink at the top.
  const redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.4, 0.2), toneMapped: false });
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), redMat);
  red.position.set(0, TOWER_H + 14.4, 0);
  tower.add(red);

  /* ---------- floodlights on four masts ---------- */
  const lamps = [], lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.3), toneMapped: false });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const p = new THREE.Vector3(Math.cos(a) * 165, 0, Math.sin(a) * 165);
    add(new THREE.CylinderGeometry(0.5, 0.8, 42, 8).translate(p.x, 21 - 1.6, p.z), steel);
    const head = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 1.2), lampMat);
    head.position.set(p.x, 41.5, p.z);
    head.lookAt(0, 0, 0);
    group.add(head);
    lamps.push(new THREE.Vector3(p.x, 41.5, p.z));
  }
  // Two spotlights light the rocket and the tower; the ground gets all four in its shader.
  const spots = [0, 2].map(i => {
    const s = new THREE.SpotLight(0xffb070, 0, 900, 0.5, 0.6, 1.2);
    s.position.copy(lamps[i]);
    group.add(s, s.target);
    return s;
  });

  const tmp = new THREE.Vector3();
  // Places the pad in the camera-centred world and lights it.
  // at: the deck centre in this world. flame: the flame's world point and strength.
  function update(t, at, flame, sky, sunC, sunDir, show) {
    group.visible = show;
    if (!show) return;
    group.position.copy(at);
    group.updateMatrixWorld(true);
    GU.uPad.value.copy(at);
    GU.uFlame.value.copy(flame);
    GU.uSky.value.copy(sky);
    GU.uSun.value.copy(sunC);
    GU.uSunDir.value.copy(sunDir);
    GU.uTime.value = t;
    // The floodlights stay on; they dim a little as the flame takes over.
    lamps.forEach((p, i) => GU.uLamps.value[i].set(p.x + at.x, p.y + at.y, p.z + at.z, 1));
    spots.forEach(s => { s.intensity = 420; s.target.position.copy(tmp.set(0, 30, 0)); });
    redMat.color.setRGB(Math.sin(t * 3.0) > 0.2 ? 8 : 0.4, 0.3, 0.15);
  }
  return { group, update, lamps: GU.uLamps.value };
}
