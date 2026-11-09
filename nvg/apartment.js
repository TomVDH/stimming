// Apartment at 3 a.m.: a living room lit by a street lamp through half-open blinds.
// Fabrics, paint and leaves are bright in the near infrared; plastics are dark.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, smooth, makeAir, fogify, Emitters, lambert } from './atmos.js';

const R = rng(2718);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Room: x from -3 to 3, z from 0.6 to -6.4, ceiling at 2.6 m.
const W = 3, Z0 = 0.6, Z1 = -6.4, H = 2.6;
// Window in the left wall.
const WIN = { z0: -4.3, z1: -2.5, y0: 0.9, y1: 2.2 };
// The blinds: slat pitch and how much of each pitch a slat covers.
const SLAT = { pitch: 0.045, cover: 0.72 };

function box(w, h, d, mat, x, y, z, round = 0) {
  const g = round ? new RoundedBoxGeometry(w, h, d, 3, round) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

// Plank floor and a faint rug pattern: dyes mostly vanish in the infrared.
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
const floorTex = () => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = 'rgb(110,110,110)';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 4; j++) {
      const v = 95 + R() * 40;
      g.fillStyle = `rgb(${v},${v},${v})`;
      // Staggered planks wrap round the tile edge.
      const y = ((j + (i % 2) * 0.5) * h / 3) % h - h / 3;
      g.fillRect(i * 64, y, 63, h / 3 - 1);
    }
    g.fillStyle = 'rgb(40,40,40)';
    g.fillRect(i * 64 + 63, 0, 1, h);
  }
  // Grain streaks along each plank.
  for (let k = 0; k < 900; k++) {
    const v = 80 + R() * 70;
    g.fillStyle = `rgba(${v},${v},${v},0.25)`;
    g.fillRect(R() * w, R() * h, 1, 10 + R() * 40);
  }
}, [4, 4]);
const rugTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = 'rgb(150,150,150)';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgb(132,132,132)';
  g.lineWidth = 10;
  g.strokeRect(14, 14, w - 28, h - 28);
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(w / 2, 40 + i * 30); g.lineTo(w - 40 - i * 10, h / 2); g.lineTo(w / 2, h - 40 - i * 30); g.lineTo(40 + i * 10, h / 2); g.closePath();
    g.strokeStyle = i % 2 ? 'rgb(140,140,140)' : 'rgb(160,160,160)';
    g.lineWidth = 6;
    g.stroke();
  }
});

/* ---------- dust in the light shaft ---------- */
// A mote shines only where the lamp's ray reaches it between the slats.
function buildDust(air, lamp, n = 1600) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([-W + R() * 2 * W, R() * H, Z1 + R() * (Z0 - Z1)], i * 3);
    seed[i] = R() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: air.uFogTime, uLamp: { value: lamp.clone() }, uPx: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uPx;
      uniform vec3 uLamp;
      varying float vI;
      void main() {
        // Motes drift on slow air currents.
        vec3 p = position + vec3(sin(uTime * 0.07 + aSeed) * 0.25, sin(uTime * 0.05 + aSeed * 1.7) * 0.18, cos(uTime * 0.06 + aSeed * 2.3) * 0.25);
        vec3 d = p - uLamp;
        float t = (${(-W).toFixed(1)} - uLamp.x) / d.x;
        vec3 hit = uLamp + d * t;
        float inWin = step(${WIN.z0.toFixed(2)}, hit.z) * step(hit.z, ${WIN.z1.toFixed(2)}) * step(${WIN.y0.toFixed(2)}, hit.y) * step(hit.y, ${WIN.y1.toFixed(2)});
        float gap = step(${SLAT.cover.toFixed(2)}, fract((hit.y - ${WIN.y0.toFixed(2)}) / ${SLAT.pitch.toFixed(3)}));
        float lit = inWin * gap * step(0.0, t) * step(t, 1.0);
        // Forward scatter: motes glow brightest looking into the light.
        vec3 toCam = normalize(cameraPosition - p);
        float fwd = 0.35 + 1.6 * pow(max(dot(normalize(-d), toCam), 0.0), 3.0);
        vI = lit * fwd * 160.0 * (0.5 + 0.5 * fract(aSeed * 7.3));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 1.8 * uPx;
      }`,
    fragmentShader: /* glsl */`
      varying float vI;
      void main() {
        vec2 d = gl_PointCoord * 2.0 - 1.0;
        gl_FragColor = vec4(vec3(vI * exp(-dot(d, d) * 3.0)), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

/* ---------- the cat ---------- */
function buildCat() {
  const fur = lambert(0.52), g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 4, 10), fur);
  body.position.set(0, 0.17, 0);
  body.rotation.x = -0.35;
  body.scale.set(1.15, 1, 0.95);
  g.add(body);
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), fur);
  haunch.position.set(0, 0.11, 0.06);
  haunch.scale.set(1.1, 0.8, 1.05);
  g.add(haunch);
  const head = new THREE.Group();
  head.position.set(0, 0.36, -0.07);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), fur);
  skull.scale.set(1.08, 0.95, 1);
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), fur);
  muzzle.position.set(0, -0.02, -0.06);
  head.add(muzzle);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 6), fur);
    ear.position.set(s * 0.045, 0.07, 0.0);
    ear.rotation.z = -s * 0.25;
    head.add(ear);
  }
  g.add(head);
  // The tail curls round the paws and its tip flicks.
  const tail = new THREE.Group();
  tail.position.set(0.06, 0.03, 0.12);
  const segs = [];
  let parent = tail;
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.035, 3, 6), fur);
    m.rotation.z = Math.PI / 2;
    m.position.x = 0.028;
    seg.add(m);
    seg.position.x = i ? 0.05 : 0;
    parent.add(seg);
    segs.push(seg);
    parent = seg;
  }
  g.add(tail);
  return { g, head, segs, eyes: [V(-0.028, 0.012, -0.068), V(0.028, 0.012, -0.068)] };
}

/* ---------- scene ---------- */
export function buildApartment() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  const air = makeAir();
  // Still indoor air: no fog to speak of.
  air.uFog.value.set(0.0, 1, 0.00002, 0.5);
  air.uFogCol.value.setScalar(1.0);

  const walls = lambert(0.74), ceil = lambert(0.7), wood = lambert(0.36), dark = lambert(0.08), fabric = lambert(0.62);
  scene.add(new THREE.HemisphereLight(new THREE.Color(1, 1, 1), new THREE.Color(0.5, 0.5, 0.5), 2.4));

  /* shell */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, Z0 - Z1), new THREE.MeshLambertMaterial({ color: new THREE.Color(0.9, 0.9, 0.9), map: floorTex() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (Z0 + Z1) / 2);
  scene.add(floor);
  // The shell overlaps at every seam, so light enters only by the window.
  const D = Z0 - Z1;
  scene.add(box(2 * W + 1, 0.3, D + 1, ceil, 0, H + 0.15, (Z0 + Z1) / 2));
  scene.add(box(0.3, H + 0.6, D + 1, walls, W + 0.15, H / 2, (Z0 + Z1) / 2));
  scene.add(box(2 * W + 1, H + 0.6, 0.3, walls, 0, H / 2, Z1 - 0.15));
  scene.add(box(2 * W + 1, H + 0.6, 0.3, walls, 0, H / 2, Z0 + 0.15));
  // The left wall wraps round the window opening.
  const lx = -W - 0.15;
  scene.add(box(0.3, H + 0.6, Z0 - WIN.z1 + 0.5, walls, lx, H / 2, (Z0 + 0.5 + WIN.z1) / 2));
  scene.add(box(0.3, H + 0.6, WIN.z0 - Z1 + 0.5, walls, lx, H / 2, (WIN.z0 + Z1 - 0.5) / 2));
  scene.add(box(0.3, WIN.y0 + 0.3, WIN.z1 - WIN.z0 + 0.02, walls, lx, (WIN.y0 - 0.3) / 2, (WIN.z0 + WIN.z1) / 2));
  scene.add(box(0.3, H + 0.3 - WIN.y1, WIN.z1 - WIN.z0 + 0.02, walls, lx, (H + 0.3 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2));
  scene.add(box(0.22, 0.04, WIN.z1 - WIN.z0 + 0.1, lambert(0.7), -W + 0.05, WIN.y0, (WIN.z0 + WIN.z1) / 2));
  // Skirting boards.
  scene.add(box(0.02, 0.09, D, lambert(0.8), W - 0.01, 0.045, (Z0 + Z1) / 2));
  scene.add(box(2 * W, 0.09, 0.02, lambert(0.8), 0, 0.045, Z1 + 0.01));

  // Blinds: tilted slats with gaps that let the lamp through.
  const slatM = lambert(0.8);
  const slats = new THREE.Group();
  for (let y = WIN.y0; y < WIN.y1; y += SLAT.pitch) {
    const s = box(0.012, SLAT.pitch * SLAT.cover, WIN.z1 - WIN.z0, slatM, -W + 0.03, y + SLAT.pitch * SLAT.cover / 2, (WIN.z0 + WIN.z1) / 2);
    s.rotation.z = 0.35;
    slats.add(s);
  }
  for (const z of [WIN.z0 + 0.25, WIN.z1 - 0.25]) slats.add(box(0.006, WIN.y1 - WIN.y0, 0.006, slatM, -W + 0.05, (WIN.y0 + WIN.y1) / 2, z));
  scene.add(slats);
  // Outside: a night street glow and the lamp head itself.
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(5) }));
  outside.position.set(-14, 3, -3.4);
  outside.rotation.y = Math.PI / 2;
  scene.add(outside);
  const lampPos = V(-7.5, 4.6, -3.0);
  const street = new THREE.SpotLight(0xffffff, 9000, 0, 0.62, 0.35, 2);
  street.position.copy(lampPos);
  street.target.position.set(0.5, 0, -3.6);
  street.castShadow = true;
  street.shadow.mapSize.set(2048, 2048);
  street.shadow.bias = -0.0004;
  street.shadow.normalBias = 0.01;
  street.shadow.camera.near = 2;
  street.shadow.camera.far = 20;
  scene.add(street, street.target);

  /* furniture */
  const sofa = new THREE.Group();
  sofa.add(box(0.95, 0.42, 2.3, fabric, 0, 0.21, 0, 0.06));
  sofa.add(box(0.25, 0.82, 2.3, fabric, 0.36, 0.41, 0, 0.08));
  for (const z of [-1.18, 1.18]) sofa.add(box(0.95, 0.62, 0.22, fabric, 0, 0.31, z, 0.08));
  for (const z of [-0.54, 0.54]) sofa.add(box(0.72, 0.16, 1.04, lambert(0.66), -0.08, 0.5, z, 0.06));
  const throwB = box(0.6, 0.05, 0.7, lambert(0.82), -0.05, 0.6, 0.6, 0.02);
  throwB.rotation.set(0.1, 0.3, 0.05);
  sofa.add(throwB);
  sofa.position.set(W - 0.55, 0, -3.3);
  scene.add(sofa);

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.7), new THREE.MeshLambertMaterial({ color: new THREE.Color(0.95, 0.95, 0.95), map: rugTex() }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.6, 0.006, -3.3);
  scene.add(rug);

  const table = new THREE.Group();
  table.add(box(1.1, 0.04, 0.6, wood, 0, 0.42, 0, 0.01));
  for (const [x, z] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) table.add(box(0.04, 0.4, 0.04, wood, x, 0.2, z));
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.095, 14), lambert(0.78));
  mug.position.set(-0.2, 0.49, 0.08);
  table.add(mug);
  table.add(box(0.05, 0.018, 0.17, dark, 0.18, 0.45, -0.05));
  const mag = box(0.21, 0.006, 0.28, lambert(0.7), 0.28, 0.443, 0.12);
  mag.rotation.y = 0.3;
  table.add(mag);
  table.rotation.y = Math.PI / 2;
  table.position.set(0.9, 0, -3.3);
  scene.add(table);

  // TV wall: low cabinet, black screen, a clock.
  scene.add(box(1.9, 0.48, 0.42, lambert(0.32), 0.4, 0.24, Z1 + 0.25, 0.01));
  scene.add(box(1.45, 0.84, 0.05, dark, 0.4, 1.08, Z1 + 0.06, 0.01));
  const clockC = document.createElement('canvas');
  clockC.width = 128; clockC.height = 48;
  const clockT = new THREE.CanvasTexture(clockC);
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.05), new THREE.MeshBasicMaterial({ map: clockT, color: new THREE.Color(1, 1, 1).multiplyScalar(22) }));
  clock.position.set(-0.3, 0.52, Z1 + 0.3);
  scene.add(clock, box(0.17, 0.07, 0.06, dark, -0.3, 0.515, Z1 + 0.33));
  function drawClock(t) {
    const g = clockC.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 48);
    g.fillStyle = '#fff'; g.font = 'bold 38px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const m = 12 + Math.floor(t / 60);
    g.fillText(`03${Math.floor(t * 2) % 2 ? ':' : ' '}${String(m % 60).padStart(2, '0')}`, 64, 26);
    clockT.needsUpdate = true;
  }

  // Bookshelf on the right of the TV wall, books in rows.
  const shelf = new THREE.Group();
  const sw = 0.9, sh = 2.0, sd = 0.32;
  shelf.add(box(0.03, sh, sd, wood, -sw / 2, sh / 2, 0), box(0.03, sh, sd, wood, sw / 2, sh / 2, 0), box(sw, 0.03, sd, wood, 0, sh, 0));
  for (let k = 0; k < 5; k++) {
    const y = 0.05 + k * 0.42;
    shelf.add(box(sw, 0.025, sd, wood, 0, y, 0));
    let x = -sw / 2 + 0.03;
    while (x < sw / 2 - 0.08 && k < 4) {
      const bw = 0.02 + R() * 0.04, bh = 0.2 + R() * 0.12;
      if (R() < 0.1) { x += 0.06; continue; }
      const b = box(bw, bh, 0.2 + R() * 0.06, lambert(0.2 + R() * 0.55), x + bw / 2, y + 0.013 + bh / 2, 0.02);
      b.rotation.z = R() < 0.08 ? 0.25 : 0;
      shelf.add(b);
      x += bw + 0.003;
    }
  }
  shelf.position.set(2.2, 0, Z1 + 0.2);
  scene.add(shelf);
  // A pet camera on top of the shelf lights the room in infrared.
  const petCam = V(2.2, 2.08, Z1 + 0.3);
  scene.add(box(0.08, 0.08, 0.07, lambert(0.75), petCam.x, petCam.y, petCam.z, 0.02));
  const camIR = new THREE.SpotLight(0xffffff, 260, 0, 0.9, 0.9, 2);
  camIR.position.copy(petCam).add(V(0, 0, 0.05));
  camIR.target.position.set(-0.5, 0.3, -2);
  scene.add(camIR, camIR.target);

  // Monstera in a pot: leaves glow, as chlorophyll reflects the infrared.
  const plant = new THREE.Group();
  plant.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.34, 16).translate(0, 0.17, 0), lambert(0.45)));
  const leafM = new THREE.MeshLambertMaterial({ color: new THREE.Color(0.88, 0.88, 0.88), side: THREE.DoubleSide });
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.16, 0.04, 0.2, 0.22, 0, 0.32);
  leafShape.bezierCurveTo(-0.2, 0.22, -0.16, 0.04, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 8);
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + R() * 0.4, lift = 0.5 + R() * 0.7, out = 0.12 + R() * 0.22;
    const stemTop = V(Math.cos(a) * out, 0.34 + lift, Math.sin(a) * out);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, stemTop.length(), 5), lambert(0.6));
    stem.position.copy(stemTop).multiplyScalar(0.5).setY(0.34 + lift / 2);
    stem.lookAt(V(stemTop.x, 0.34 + lift, stemTop.z));
    stem.rotateX(Math.PI / 2);
    plant.add(stem);
    const leaf = new THREE.Mesh(leafGeo, leafM);
    leaf.position.copy(stemTop);
    leaf.rotation.set(-0.9 - R() * 0.5, -a + Math.PI / 2, (R() - 0.5) * 0.6);
    leaf.scale.setScalar(0.9 + R() * 0.7);
    plant.add(leaf);
    leaves.push({ leaf, base: leaf.rotation.x, ph: R() * 6 });
  }
  plant.position.set(-2.45, 0, Z1 + 0.5);
  scene.add(plant);

  // Picture frames: dark glass in pale frames.
  for (const [z, w, h] of [[-1.2, 0.5, 0.7], [-2.0, 0.4, 0.4]]) {
    scene.add(box(0.03, h + 0.06, w + 0.06, lambert(0.8), W - 0.02, 1.55, z));
    scene.add(box(0.035, h, w, lambert(0.18), W - 0.02, 1.55, z));
  }

  // A door on the right wall leaks hallway light at the floor.
  scene.add(box(0.05, 2.05, 0.9, lambert(0.7), W - 0.03, 1.035, -5.4));
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(60) }));
  crack.rotation.y = -Math.PI / 2;
  crack.position.set(W - 0.065, 0.006, -5.4);
  scene.add(crack);
  const hall = new THREE.PointLight(0xffffff, 3.5, 0, 2);
  hall.position.set(W - 0.12, 0.03, -5.4);
  scene.add(hall);

  // Ceiling fan turning slowly.
  const fan = new THREE.Group();
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8).translate(0, 0.15, 0), lambert(0.6)));
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.1, 16), lambert(0.6)));
  const blades = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = box(0.55, 0.012, 0.12, lambert(0.55), 0.36, -0.02, 0);
    const piv = new THREE.Group();
    piv.rotation.y = (i / 5) * Math.PI * 2;
    b.rotation.x = 0.12;
    piv.add(b);
    blades.add(piv);
  }
  fan.add(blades);
  fan.position.set(0.4, H - 0.32, -3.3);
  scene.add(fan);

  const cat = buildCat();
  cat.g.position.set(0.3, 0.006, -3.0);
  cat.g.rotation.y = 0.5;
  scene.add(cat.g);

  const dust = buildDust(air, lampPos);
  scene.add(dust);
  const emit = new Emitters(48, air);
  scene.add(emit.points);

  // IR illuminator on the goggle.
  const ir = new THREE.SpotLight(0xffffff, 0, 0, 0.32, 0.8, 2);
  scene.add(ir, ir.target);

  scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  outside.castShadow = false; crack.castShadow = false; clock.castShadow = false;

  const eye = V(1.7, 1.55, 0.25);
  camera.position.copy(eye);
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), fwd = V(0, 0, 0);
  let lastMin = -1;

  function update(t, dt, { irOn }) {
    air.uFogTime.value = t;
    emit.begin();
    blades.rotation.y = t * 2.6;
    const sec = Math.floor(t * 2);
    if (sec !== lastMin) { drawClock(t); lastMin = sec; }

    // The street lamp itself, seen between the slats.
    emit.add(lampPos, 22000, 3);
    // Standby LED on the TV; router lights; a smoke alarm blink.
    emit.add(V(0.95, 0.68, Z1 + 0.09), 380, 1.4);
    for (let k = 0; k < 4; k++) emit.add(V(1.95 + k * 0.03, 1.28, Z1 + 0.37), Math.sin(t * (3 + k * 1.7) + k) > 0.2 ? 60 : 12, 1.2);
    if ((t % 6) < 0.08) emit.add(V(-0.6, H - 0.03, -2.0), 900, 1.6);
    // The pet camera's ring of IR LEDs.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      emit.add(tmp.set(petCam.x + Math.cos(a) * 0.022, petCam.y + Math.sin(a) * 0.022, petCam.z + 0.04), 1600, 1.4);
    }

    // The cat watches the room, then the viewer; its tail flicks.
    const look = smooth(-0.2, 0.3, Math.sin(t * 0.21) + 0.3 * Math.sin(t * 0.57));
    cat.g.updateMatrixWorld();
    const toCam = tmp2.copy(camera.position);
    cat.g.worldToLocal(toCam);
    const yawTo = Math.atan2(-toCam.x, -toCam.z);
    cat.head.rotation.y = (-0.9 + 0.3 * Math.sin(t * 0.13)) * (1 - look) + yawTo * look;
    cat.head.rotation.x = -0.15 + 0.08 * Math.sin(t * 0.3) * (1 - look);
    cat.segs.forEach((s, i) => {
      s.rotation.y = i === 0 ? -1.9 : -0.32 + (i > 5 ? 0.35 * Math.sin(t * 2.4 + i * 0.6) * (0.4 + 0.6 * smooth(0.6, 1, Math.sin(t * 0.33))) : 0);
    });
    // Eyeshine: the tapetum throws the illuminator straight back.
    cat.head.updateMatrixWorld();
    camera.getWorldDirection(fwd);
    for (const e of cat.eyes) {
      const p = cat.head.localToWorld(tmp.copy(e));
      const facing = cat.head.localToWorld(tmp2.set(0, 0, -1)).sub(cat.head.getWorldPosition(V(0, 0, 0))).normalize();
      const toEye = V(0, 0, 0).subVectors(camera.position, p).normalize();
      const f = Math.pow(Math.max(0, facing.dot(toEye)), 6);
      const inBeam = smooth(0.93, 0.985, fwd.dot(toEye.clone().negate()));
      emit.add(p, (irOn ? 16000 * inBeam : 0) * f + 30 * f, 1.5);
    }

    leaves.forEach(l => { l.leaf.rotation.x = l.base + 0.03 * Math.sin(t * 0.7 + l.ph); });

    ir.position.copy(camera.position);
    ir.target.position.copy(camera.position).addScaledVector(fwd, 5);
    ir.intensity = irOn ? 160 : 0;
    emit.end();
  }

  function setPx(px) {
    emit.mat.uniforms.uPx.value = px;
    dust.material.uniforms.uPx.value = px;
  }

  fogify(scene, air);
  return { scene, camera, eye, update, setPx, air, look: { yaw: [-1.2, 1.5], pitch: [-0.7, 0.45], start: -0.12, yaw0: 0.3 }, expo: 1.4, focus: 3, shadows: true };
}
