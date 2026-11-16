// Calaeno, her two sisters and their escort: one builder, one material.
// One unit is one metre. x is the right wing, y is up, negative z is the nose.
// Calaeno's plan follows Tom's top view (2026-11-15), at 2 metres per pixel.
// Alcyone and Merope are proposals in the same family.
// Every craft stands tall: raised wings, fins, pylons and domes on struts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AIR, AIR_U } from './air.js';

/* ---------- builders ---------- */
const flip = pts => pts.map(([x, z]) => [-x, z]);
const both = list => list.flatMap(([x, ...r]) => [[x, ...r], [-x, ...r]]);
// A flat panel from a planform outline, t metres thick, centred on y.
// The bevel thins the edges, as on a wing.
function panel(pts, t, y = 0) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))), {
    depth: t * 0.4, bevelEnabled: true, bevelThickness: t * 0.3, bevelSize: t * 0.9, bevelOffset: -t * 0.9, bevelSegments: 2, steps: 1,
  });
  // The outline's y turns to z; the depth turns to negative y.
  g.rotateX(Math.PI / 2);
  g.translate(0, y + t * 0.2, 0);
  g.deleteAttribute('uv');
  return g;
}
// Both halves of a wing from its right outline. The root stands at height y.
// dih raises the tips: radians of dihedral about the root.
function wing(pts, t, y = 0, dih = 0) {
  const x0 = Math.min(...pts.map(p => p[0]));
  return [1, -1].map(side => {
    const g = panel(pts.map(([x, z]) => [side * (x - x0), z]), t);
    g.rotateZ(side * dih);
    return g.translate(side * x0, y, 0);
  });
}
// The height of a wing's skin at span x, for what hangs from it.
const wingY = (x, x0, y, dih) => y + (Math.abs(x) - x0) * Math.tan(dih);
// A body of elliptical sections. Each station: z, half width, half height.
function loft(st, seg = 16) {
  const pos = [], idx = [];
  for (const [z, w, h] of st) for (let i = 0; i < seg; i++) {
    const a = i / seg * Math.PI * 2;
    pos.push(Math.cos(a) * w, Math.sin(a) * h, z);
  }
  for (let s = 0; s < st.length - 1; s++) for (let i = 0; i < seg; i++) {
    const a = s * seg + i, b = s * seg + (i + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}
const at = (g, x, y, z) => g.translate(x, y, z);
// A fin: a panel stood on edge. Its outline is height, then z.
// cant leans it outward, in radians; a negative height hangs it under.
function fin(pts, t, x, y, cant = 0) {
  const g = panel(pts, t);
  g.rotateZ(Math.PI / 2 - Math.sign(x) * cant);
  return at(g, x, y, 0);
}
// A plain block: a pylon, a strut, a deck house.
function block(sx, sy, sz, x, y, z) {
  const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
  g.deleteAttribute('uv');
  return at(g, x, y, z);
}
// A dish or dome: a squashed ball at x, y, z.
function dome(x, y, z, r, h) {
  const g = new THREE.SphereGeometry(1, 28, 14).toNonIndexed();
  g.deleteAttribute('uv');
  g.scale(r, h, r);
  return at(g, x, y, z);
}
// The half width of a loft at z, for the shade test.
function widthAt(st, z) {
  for (let i = 1; i < st.length; i++) if (z <= st[i][0]) {
    const [z0, w0] = st[i - 1], [z1, w1] = st[i];
    return z < z0 ? 0 : w0 + (w1 - w0) * (z - z0) / (z1 - z0);
  }
  return 0;
}
function inside(poly, x, z) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/* ---------- the three craft ---------- */
// Each build returns: parts (geometries), engines (x, y, z at the propeller),
// lamps, outlines and bodies for the shade test, and discs that cast the sun rays.
const NACELLE = [[-190, 1, 1], [-160, 14, 13], [-30, 14, 13], [-4, 7, 7]];
const RED = [9, 0.5, 0.3], GREEN = [0.4, 8, 1.2], WHITE = [9, 9, 9];
const strobe = (x, y, z, ph, c = WHITE, size = 6) => [x, y, z, size, ...c, 1.7, ph, 0.05];
const tips = (x, y, z) => [[-x, y, z, 5, ...RED, 1, 0, 1], [x, y, z, 5, ...GREEN, 1, 0, 1]];
// A pusher engine under a wing: a nacelle on a pylon, 34 m below the skin.
function engine(parts, x, skin, z) {
  parts.push(at(loft(NACELLE, 10), x, skin - 34, z), block(8, 34, 96, x, skin - 15, z - 96));
  return [x, skin - 34, z];
}

// Calaeno: tandem wings, three bodies, a dish on struts, twelve engines. 3860 m across.
function calaeno() {
  const DIH = 0.085, FY = 46, FDIH = 0.03;
  const MAIN = [[150, -255], [300, -260], [1850, 330], [1930, 404], [1920, 460], [520, 180], [210, 275], [150, 262]];
  const FRONT = [[120, -270], [896, -396], [960, -250], [940, -240], [908, -318], [200, -70]];
  const HULL = [[-530, 1, 1], [-500, 14, 14], [-420, 26, 26], [-330, 46, 40], [-250, 96, 58], [-100, 128, 70], [100, 118, 66], [200, 80, 52], [300, 44, 36], [480, 16, 14], [572, 1, 1]];
  const RIG = [[-430, 1, 1], [-400, 22, 22], [-330, 24, 26], [-100, 28, 30], [250, 32, 34], [450, 18, 18], [582, 1, 1]];
  const POD = [[110, 1, 1], [135, 10, 10], [380, 10, 10], [412, 1, 1]];
  const mainY = x => wingY(x, 150, 0, DIH), frontY = x => wingY(x, 120, FY, FDIH);
  const tipY = mainY(1925);
  const parts = [
    ...wing(MAIN, 46, 0, DIH), ...wing(FRONT, 26, FY, FDIH),
    loft(HULL, 20),
    // A gondola under the hull, and a spine fin over its tail.
    at(loft([[-220, 1, 1], [-180, 30, 18], [60, 36, 22], [180, 14, 10], [202, 1, 1]], 12), 0, -70, 0),
    fin([[0, 250], [0, 560], [210, 600], [210, 470]], 12, 0, 30),
    // The dish stands over the hull on two struts.
    dome(0, 158, -130, 126, 17), block(12, 96, 70, 46, 108, -130), block(12, 96, 70, -46, 108, -130),
  ];
  for (const s of [1, -1]) {
    // Each outrigger body carries a tall fin and a keel fin at its tail.
    parts.push(at(loft(RIG), s * 450, mainY(450), 0));
    parts.push(fin([[0, 360], [0, 590], [240, 640], [240, 520]], 12, s * 450, mainY(450) + 20, 0.22));
    parts.push(fin([[0, 400], [0, 570], [-90, 590], [-90, 480]], 10, s * 450, mainY(450) - 20, 0));
    parts.push(at(loft(POD, 10), s * 1620, mainY(1620), 0));
    // Winglets: up at the main tips, down at the front tips.
    parts.push(fin([[0, 330], [0, 470], [170, 520], [170, 440]], 10, s * 1925, tipY, 0.3));
    parts.push(fin([[0, -390], [0, -250], [-110, -215], [-110, -300]], 8, s * 930, frontY(930), -0.3));
  }
  const engines = [
    ...both([[330, 30], [640, -110]]).map(([x, z]) => engine(parts, x, frontY(x), z)),
    ...both([[240, 350], [760, 304], [1076, 360], [1400, 410]]).map(([x, z]) => engine(parts, x, mainY(x), z)),
  ];
  return {
    span: 3860, spread: 1400, parts, engines,
    outlines: [MAIN, flip(MAIN), FRONT, flip(FRONT)], bodies: [[HULL, 0], [RIG, 450], [RIG, -450]], discs: [[0, -130, 126]],
    lamps: [
      ...tips(1975, tipY + 160, 480),
      // Strobes on the fin tops, the dish and the gondola.
      strobe(0, 240, 590, 0), strobe(-505, mainY(450) + 255, 600, 0.12, WHITE, 5), strobe(505, mainY(450) + 255, 600, 0.24, WHITE, 5),
      strobe(0, 178, -130, 0.4, WHITE, 5), strobe(0, -92, 0, 0.6, RED),
    ],
    casters: [[0, 0, 0, 300, 70], [0, 158, -130, 126, 20], ...both([[560, 40, 30, 300, 40], [1150, 90, 190, 300, 40], [1680, 130, 370, 220, 40], [520, 60, -260, 280, 40]])],
  };
}

// Alcyone: a crescent wing on two hulls, under an arch of a tail. 3920 m across.
function alcyone() {
  const DIH = 0.11, CY = 10;
  const HULL = [[-720, 1, 1], [-680, 24, 22], [-560, 44, 40], [-200, 62, 56], [150, 60, 54], [420, 36, 34], [560, 12, 12], [582, 1, 1]];
  const OUTER = [[520, -200], [1300, 60], [1900, 520], [1960, 640], [1880, 680], [1300, 330], [520, 150]];
  const CENTRE = [[-520, -200], [0, -120], [520, -200], [520, 150], [0, 200], [-520, 150]];
  const FORE = [[-540, -540], [0, -600], [540, -540], [540, -450], [0, -505], [-540, -450]];
  const POD = [[-260, 1, 1], [-200, 44, 34], [60, 64, 46], [240, 32, 24], [302, 1, 1]];
  const skin = x => (Math.abs(x) < 520 ? CY : wingY(x, 520, CY, DIH));
  const tipY = skin(1940);
  const parts = [
    panel(CENTRE, 44, CY), ...wing(OUTER, 40, CY, DIH), panel(FORE, 20, 6),
    // The centre pod carries a dish on two struts.
    at(loft(POD, 16), 0, 24, 0),
    dome(0, 166, -20, 96, 15), block(11, 90, 60, 36, 118, -20), block(11, 90, 60, -36, 118, -20),
    // The tail plane bridges the two fin tops: an arch 320 m high.
    panel([[-570, 545], [570, 545], [650, 652], [-650, 652]], 18, 322),
  ];
  for (const s of [1, -1]) {
    parts.push(at(loft(HULL, 18), s * 520, 0, 0));
    // A tall fin and a keel fin on each hull.
    parts.push(fin([[0, 360], [0, 590], [300, 660], [300, 540]], 14, s * 520, 24, 0));
    parts.push(fin([[0, 300], [0, 520], [-120, 540], [-120, 400]], 10, s * 520, -24, 0));
    parts.push(fin([[0, 520], [0, 690], [200, 760], [200, 650]], 10, s * 1940, tipY, 0.25));
  }
  const engines = both([[200, 211], [820, 249], [1080, 309], [1340, 384], [1600, 541]]).map(([x, z]) => engine(parts, x, skin(x), z));
  return {
    span: 3920, spread: 1650, parts, engines,
    outlines: [CENTRE, OUTER, flip(OUTER), FORE, [[-570, 545], [570, 545], [650, 652], [-650, 652]]], bodies: [[HULL, 520], [HULL, -520], [POD, 0]], discs: [[0, -20, 96]],
    lamps: [
      ...tips(1990, tipY + 190, 720),
      strobe(-520, 335, 640, 0), strobe(520, 335, 640, 0.2), strobe(0, 186, -20, 0.4, WHITE, 5), strobe(0, -30, 0, 0.6, RED),
    ],
    casters: [[0, 166, -20, 96, 20], [0, 322, 600, 560, 30], ...both([[520, 0, -100, 260, 60], [300, 10, 40, 300, 40], [950, 60, 170, 330, 40], [1500, 120, 400, 300, 40]]), [0, 6, -520, 300, 30]],
  };
}

// Merope: a low wing and a high wing joined at their tips round one long hull. 3100 m across.
function merope() {
  const LOW = -20, HIGH = 170;
  const FRONT = [[60, -480], [1500, 80], [1500, 180], [60, -330]];
  const REAR = [[60, 520], [1500, 110], [1500, 215], [60, 690]];
  const HULL = [[-900, 1, 1], [-860, 18, 18], [-700, 46, 40], [-300, 70, 56], [300, 72, 56], [650, 44, 36], [820, 12, 12], [852, 1, 1]];
  const TIP = [[-30, 1, 1], [10, 22, 20], [240, 22, 20], [302, 1, 1]];
  const parts = [
    ...wing(FRONT, 30, LOW), ...wing(REAR, 30, HIGH),
    loft(HULL, 20),
    // The hull's fin carries the high wing's root.
    fin([[0, 430], [0, 720], [200, 760], [200, 560]], 14, 0, 30),
    dome(0, 0, 60, 112, 70),
  ];
  for (const s of [1, -1]) {
    // A tip plate joins the two wings: a fin 190 m tall.
    parts.push(fin([[0, 90], [0, 225], [190, 235], [190, 100]], 12, s * 1500, LOW, 0));
    parts.push(at(loft(TIP, 12), s * 1500, LOW, 0), at(loft(TIP, 12), s * 1500, HIGH, 0));
  }
  const engines = [
    ...both([[300, 632], [600, 534], [900, 436], [1200, 338]]).map(([x, z]) => engine(parts, x, HIGH, z)),
    ...both([[450, -162], [900, -3]]).map(([x, z]) => engine(parts, x, LOW, z)),
  ];
  return {
    span: 3100, spread: 1250, parts, engines,
    outlines: [FRONT, flip(FRONT), REAR, flip(REAR)], bodies: [[HULL, 0]], discs: [[0, 60, 112]],
    lamps: [...tips(1500, HIGH + 24, 300), strobe(0, 236, 740, 0), strobe(0, -72, 60, 0.6, RED), strobe(0, -10, -900, 0.3, WHITE, 5)],
    casters: [[0, 0, -200, 260, 70], [0, 0, 400, 260, 70], ...both([[450, LOW, -280, 260, 40], [1000, LOW, -60, 280, 40], [450, HIGH, 520, 260, 40], [1000, HIGH, 320, 280, 40], [1500, 75, 150, 160, 110]])],
  };
}

export const CRAFT = { alcyone, calaeno, merope };

/* ---------- the escort: a delta dart, 58 m long ---------- */
const E_WING = [[2.4, -9], [20, 15], [20, 19.5], [2.4, 18]];
const E_TAIL = [[2, 19], [9.5, 27], [9.5, 30], [2, 26.5]];
const E_HULL = [[-30, 0.2, 0.2], [-24, 1.5, 1.3], [-8, 2.6, 2.2], [14, 2.9, 2.3], [26, 2.3, 1.9], [28, 0.3, 0.3]];
const E_FIN = [[0, 14], [0, 26], [7.5, 29], [7.5, 23]];
const escortGeometry = () => mergeGeometries([
  ...wing(E_WING, 1.1, 0, 0.05), ...wing(E_TAIL, 0.7), loft(E_HULL, 12),
  fin(E_FIN, 0.5, 2.4, 1, 0.42), fin(E_FIN, 0.5, -2.4, 1, 0.42),
]);

/* ---------- material ---------- */
const VERT = /* glsl */`
varying vec3 vWP, vWN, vL, vLN;
void main() {
  vL = position; vLN = normal;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWP = w.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */`
varying vec3 vWP, vWN, vL, vLN;
uniform vec3 uPaint, uAccent;
uniform float uMark;
${AIR}
void main() {
  vec3 N = normalize(vWN), V = normalize(cameraPosition - vWP);
  if (!gl_FrontFacing) N = -N;
  // The escort has a hot nose; a big craft is one pale grey.
  vec3 alb = uMark > 0.5 ? uPaint : mix(uPaint, uAccent, step(vL.z, -19.0));
  // The belly sees the sea; the back sees the sky.
  vec3 amb = mix(uHorC * 0.22, uZenC * 0.3 + uHorC * 0.3, smoothstep(-1.0, 1.0, N.y));
  vec3 col = alb * (amb + uSunC * max(dot(N, uSun), 0.0));
  // Against the sun, the edges catch a thin line of light.
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  float back = pow(max(dot(-V, uSun), 0.0), 6.0);
  col += uSunC * fr * (0.02 + 0.45 * back);
  vec3 H = normalize(uSun + V);
  col += uSunC * 0.3 * pow(max(dot(N, H), 0.0), 60.0);
  // By night, rows of lit windows run down the flanks of the bodies.
  if (uMark > 0.5 && uNight > 0.0) {
    float side = smoothstep(0.75, 0.35, abs(vLN.y)) * step(0.35, abs(vLN.x));
    // One row, just over each body's waist; the fins stay dark.
    float row = step(0.5, fract(vL.z / 18.0)) * step(abs(vL.y - 8.0), 3.5);
    col += vec3(1.6, 1.05, 0.5) * uNight * side * row;
  }
  gl_FragColor = vec4(caAir(col, vWP, 1.0), 1.0);
}`;
const lin = (r, g, b) => ({ value: new THREE.Vector3(r, g, b) });
function craftMaterial(mark) {
  return new THREE.ShaderMaterial({
    uniforms: { ...AIR_U, uPaint: lin(0.4, 0.42, 0.45), uAccent: lin(0.85, 0.16, 0.03), uMark: { value: mark } },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    // Transparent for the draw order: the craft draws after the contrails.
    transparent: true, depthWrite: true,
  });
}

/* ---------- propellers: two rows that turn against each other ---------- */
// Each propeller is one disc behind its nacelle; the shader draws its blades.
// aHub holds the disc's centre and its turn: 1 or -1.
const PROP_R = 62;
function propGeometry(engines) {
  return mergeGeometries(engines.map(([x, y, z], i) => {
    const g = at(new THREE.CircleGeometry(PROP_R, 32), x, y, z + 4);
    const n = g.attributes.position.count, hub = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) hub.set([x, y, i % 2 ? -1 : 1], v * 3);
    g.setAttribute('aHub', new THREE.BufferAttribute(hub, 3));
    return g;
  }));
}
function propMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...AIR_U },
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`
    attribute vec3 aHub;
    varying vec3 vWP, vHub;
    varying vec2 vQ;
    void main() {
      vQ = (position.xy - aHub.xy) / ${PROP_R.toFixed(1)};
      vHub = aHub;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWP = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
    fragmentShader: /* glsl */`
    varying vec3 vWP, vHub;
    varying vec2 vQ;
    ${AIR}
    // A scimitar blade's half chord at radius r, in disc radii.
    // It is widest past mid span and rounds off at the tip.
    float chord(float r) { return 0.058 * (0.45 + 1.7 * r * (1.25 - r)) * smoothstep(1.0, 0.86, r); }
    // One row of six blades. turn is 1 or -1; a is the angle at this pixel.
    // Six taps trail each blade with a short smear of motion.
    float row(float a, float r, float turn, float t) {
      // The blades curve back toward their tips.
      float base = a - turn * (t + 0.75 * r * r);
      float w = chord(r) * 6.0 / (6.2832 * max(r, 0.05));
      float acc = 0.0;
      for (int i = 0; i < 6; i++) {
        float d = abs(fract((base + turn * float(i) * 0.03) * 6.0 / 6.2832) - 0.5);
        acc += smoothstep(0.5 - w - 0.015, 0.5 - w + 0.015, d) * (1.0 - 0.16 * float(i));
      }
      return min(acc / 2.6, 1.0);
    }
    void main() {
      float r = length(vQ), a = atan(vQ.y, vQ.x);
      if (r > 1.0) discard;
      // Each engine starts at its own angle.
      float t = uTime * 2.4 + vHub.x * 0.017;
      float span = smoothstep(0.13, 0.17, r);
      float front = row(a, r, vHub.z, t) * span, rear = row(a + 0.5, r, -vHub.z, t * 0.86) * span;
      float hub = smoothstep(0.16, 0.13, r);
      // A faint disc of blur, the rear row, the front row, then the spinner.
      float al = 0.05 * smoothstep(1.0, 0.92, r);
      al = al + (1.0 - al) * 0.8 * rear;
      al = al + (1.0 - al) * 0.95 * front;
      al = max(al, hub);
      // Graphite blades with pale tips; the front row sits in more light.
      vec3 paint = mix(vec3(0.03, 0.032, 0.038), vec3(0.5, 0.46, 0.3), smoothstep(0.86, 0.9, r) * (1.0 - hub));
      paint *= mix(0.6, 1.0, front);
      // The spinner is a pale cone with a soft glint.
      paint = mix(paint, vec3(0.3, 0.31, 0.33) * (0.6 + 0.8 * smoothstep(0.14, 0.0, length(vQ - vec2(-0.04, 0.05)))), hub);
      // Each blade flashes as it turns through the sun's side.
      float glint = pow(max(cos(a - 2.2), 0.0), 10.0) * front;
      vec3 col = paint * (uHorC * 0.5 + uZenC * 0.4 + uSunC * (0.05 + 0.5 * glint));
      gl_FragColor = vec4(caAir(col, vWP, 1.0) * al, al);
    }`,
  });
}

/* ---------- lamps: tip lamps and strobes ---------- */
// Each lamp: x, y, z, size, r, g, b, period in seconds, phase, share lit.
function lamps(list, uPx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap(l => l.slice(0, 3)), 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(list.map(l => l[3]), 1));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(list.flatMap(l => l.slice(4, 7)), 3));
  g.setAttribute('aBlink', new THREE.Float32BufferAttribute(list.flatMap(l => l.slice(7, 10)), 3));
  const m = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { ...AIR_U, uPx },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
    attribute float aSize; attribute vec3 aCol, aBlink;
    uniform float uPx, uTime, uNight;
    varying vec3 vCol;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      // A steady lamp has a full share; a strobe is lit for its share.
      float on = aBlink.z >= 1.0 ? 1.0 : step(fract(uTime / aBlink.x + aBlink.y), aBlink.z);
      vCol = aCol * on;
      gl_Position = projectionMatrix * viewMatrix * w;
      // By night a lamp reads larger.
      gl_PointSize = aSize * uPx * (1.0 + 0.6 * uNight);
    }`,
    fragmentShader: /* glsl */`
    varying vec3 vCol;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      gl_FragColor = vec4(vCol * exp(-d * d * 5.0) * smoothstep(1.0, 0.7, d), 1.0);
    }`,
  }));
  m.frustumCulled = false;
  return m;
}

// One big craft from its build: the mesh, the propellers, the lamps.
// heads holds each engine's propeller hub: a contrail starts there.
export function makeCraft(build, uPx) {
  const spec = build();
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(mergeGeometries(spec.parts), craftMaterial(1));
  const props = new THREE.Mesh(propGeometry(spec.engines), propMaterial());
  mesh.frustumCulled = props.frustumCulled = false;
  const lights = lamps(spec.lamps, uPx);
  group.add(mesh, props, lights);
  return {
    group, mesh, props, lights, span: spec.span, spread: spec.spread, casters: spec.casters,
    heads: spec.engines.map(([x, y, z]) => new THREE.Vector3(x, y, z + 4)),
    // True where the craft blocks a ray through local x, z.
    shade(x, z) {
      if (spec.bodies.some(([st, bx]) => Math.abs(x - bx) < widthAt(st, z))) return true;
      if (spec.discs.some(([dx, dz, r]) => Math.hypot(x - dx, z - dz) < r)) return true;
      return spec.outlines.some(pts => inside(pts, x, z));
    },
  };
}

// The escorts share one geometry and one material.
let escGeo = null, escMat = null;
export function makeEscort(uPx) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(escGeo ??= escortGeometry(), escMat ??= craftMaterial(0));
  mesh.frustumCulled = false;
  const lights = lamps([
    [-20, 0, 19, 3, ...RED, 1, 0, 1], [20, 0, 19, 3, ...GREEN, 1, 0, 1],
    [0, -2.5, 4, 4, ...WHITE, 1.1, 0.4, 0.07],
  ], uPx);
  group.add(mesh, lights);
  return { group, mesh, lights, head: new THREE.Vector3(0, 0, 30) };
}
