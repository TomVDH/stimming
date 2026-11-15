// Beach: a Greek island cove. The line runs from a whitewashed hut
// to a weathered post on the pebbles; the sea lies behind, toward -z.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { WATER } from '../../shared/water.js';
import { rng, ok, col, inst, paint, canvasTex } from './kit.js';
import { dressBeach } from './beach-dress.js';

const HX = -4.5;
const SHORE = -3.5;
const LINE_Z = 0;
const EYE = [-0.3, 2.95, 10];
const EYE_PHONE = [-0.3, 3.0, 12.5];
const BLUE = [0.5, 0.15, 250];

// Pebbles: rounded greys and creams on coarse sand.
function pebbleTex(R) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = ok([0.74, 0.03, 75]); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = R() * 256, y = R() * 256, r = 2 + R() * 6, L = 0.55 + R() * 0.35;
      g.fillStyle = ok([L, 0.015 + R() * 0.03, 60 + R() * 40]);
      g.beginPath(); g.ellipse(x, y, r, r * (0.6 + R() * 0.4), R() * 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = ok([Math.min(0.97, L + 0.12), 0.01, 80], 0.6);
      g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); g.fill();
    }
  }, true);
}

// A rock: a fine sphere pushed about by layered noise.
// Vertex colours lay limestone strata and darker cracks.
function rock(R, s) {
  // Shared vertices give smooth normals; the raw icosahedron shades flat.
  const raw = new THREE.IcosahedronGeometry(1, s[1] > 10 ? 5 : s[1] > 3 ? 4 : 3);
  raw.deleteAttribute('normal'); raw.deleteAttribute('uv');
  const g = mergeVertices(raw);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new Float32Array(p.count * 3);
  const a = R() * 9, b = R() * 9, k = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.22 * Math.sin(v.x * 2.1 + a) * Math.cos(v.z * 1.9 + b) + 0.12 * Math.sin(v.x * 5.3 + v.y * 4.1 + a)
      + 0.06 * Math.sin(v.z * 11 + v.y * 9 + b) + 0.035 * Math.sin(v.x * 23 + v.z * 19 + a)
      + 0.018 * Math.sin(v.x * 47 - v.y * 41 + b) + 0.01 * Math.sin(v.z * 89 + v.x * 71 + a);
    const x = v.x * n * s[0], z = v.z * n * s[2];
    let y = Math.max(v.y * n, -0.3) * s[1];
    // Strata step the faces a little.
    y += 0.04 * s[1] * Math.sin(y * 2.4 + a);
    p.setXYZ(i, x, y, z);
    const crack = 0.5 + 0.5 * Math.sin(v.x * 17 + v.y * 13 + b) * Math.sin(v.z * 15 - v.y * 11 + a);
    const L = 0.6 + 0.07 * Math.sin(y * 1.7 + a) - 0.12 * Math.pow(crack, 6) - 0.08 * Math.max(0, -v.y);
    k.copy(col([L, 0.035, 62 + 10 * Math.sin(y * 0.7 + b)]));
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

// The sea: shallows by the shore, deep blue beyond, a glitter path to the sun.
function sea() {
  const u = {
    uT: { value: 0 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3(1, 1, 1) },
    uZen: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() }, uHaze: { value: new THREE.Vector3() },
    uFocal: { value: 800 }, uB: { value: 0 },
    uShallow: { value: new THREE.Vector3(...rgbOf([0.72, 0.12, 190])) }, uDeep: { value: new THREE.Vector3(...rgbOf([0.36, 0.11, 245])) },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      uniform float uT, uFocal, uB; uniform vec3 uSun, uSunCol, uZen, uHor, uHaze, uShallow, uDeep;
      ${WATER}
      vec3 skyAt(vec3 r) { return mix(uHor, uZen, pow(clamp(r.y, 0.0, 1.0), 0.45)) + uSunCol * 0.25 * pow(max(dot(r, uSun), 0.0), 40.0); }
      void main() {
        vec3 d = normalize(vW - cameraPosition);
        float dist = length(vW - cameraPosition), sig2;
        float foot = wtFoot(dist, -d.y, uFocal);
        // Distance from the shore sets the depth colour.
        float off = ${SHORE.toFixed(2)} - vW.z;
        vec2 slope = wtWaves(vW.xz, uT, foot, 0.01, mix(0.05, 0.13, smoothstep(2.0, 40.0, off)), 0.5, sig2);
        vec3 n = wtNormal(slope), r = reflect(d, n); r.y = abs(r.y);
        float F = wtFresnel(d, n);
        vec3 body = mix(uShallow, uDeep, smoothstep(1.0, 45.0, off));
        // Pebbles show through the first metres of water.
        body = mix(vec3(0.55, 0.52, 0.46), body, smoothstep(0.2, 3.5, off));
        vec3 c = mix(body * (0.55 + 0.45 * max(uSun.y, 0.2)), skyAt(r), F);
        c += uSunCol * wtGlint(r, uSun, sig2, 0.03) * F * 1.4;
        // A lacy line of foam washes up and back on the shore.
        float wash = 0.5 + 0.5 * sin(uT * 0.9 + vW.x * 0.35);
        float foam = smoothstep(0.9, 0.0, abs(off - 0.5 - wash * 1.2)) * (0.55 + 0.45 * wtH(floor(vW.xz * 9.0)));
        c = mix(c, vec3(0.95), foam * 0.8 * smoothstep(0.0, 0.4, off));
        c = mix(c, uHaze, 1.0 - exp(-dist / 1600.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 3000), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.04, SHORE - 1500 + 0.5);
  mesh.receiveShadow = false;
  return { mesh, u };
}
const rgbOf = c => { const k = col(c); return [k.r, k.g, k.b]; };

export default {
  id: 'beach',
  name: 'Beach',
  anchors: { a: [HX + 0.12, 2.45, LINE_Z], b: [3.8, 2.25, LINE_Z] },
  windDir: [0.2, 0.98],
  // Behind the viewer and high; then low over the sea.
  sun: { front: [0.4, 0.75, 0.52], back: [-0.05, 0.06, -0.998] },
  sky: { zen: [0.5, 0.15, 252], hor: [0.88, 0.06, 80], haze: [0.84, 0.05, 85], clouds: 0.12 },
  amb: { hi: [0.85, 0.04, 240], lo: [0.75, 0.04, 75] },
  cord: [0.06, 0.05, 0.045],
  hangFrom: 0.4,
  start: 3,
  fog: [60, 2500],
  fill: 1.6,
  wash: [
    { w: 1.5, h: 1.1, c: [0.96, 0.01, 90] },
    { w: 0.8, h: 0.95, c: [0.55, 0.15, 250] },
    { w: 0.9, h: 0.65, c: [0.85, 0.12, 95] },
    { w: 0.6, h: 0.45, c: [0.65, 0.16, 30] },
  ],
  palette: [[0.96, 0.01, 90], [0.55, 0.15, 250], [0.85, 0.12, 95], [0.65, 0.16, 30], [0.7, 0.12, 190], [0.75, 0.12, 340], [0.6, 0.1, 150]],

  // A level view over the line to the sea and the sun.
  frame(cam, aspect) {
    const phone = aspect < 1, eye = phone ? EYE_PHONE : EYE;
    cam.fov = phone ? 60 : 40;
    cam.aspect = aspect;
    cam.position.set(...eye);
    cam.lookAt(0, eye[1] - (phone ? 1.6 : 1.4), -30);
    cam.updateProjectionMatrix();
  },

  build(scene, look) {
    const R = rng(5);
    const group = new THREE.Group();
    scene.add(group);

    /* ---------- the beach ---------- */
    const pt = pebbleTex(R);
    pt.repeat.set(30, 10);
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.95 }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0, SHORE + 20 - 0.5);
    beach.receiveShadow = true;
    group.add(beach);
    const { mesh: water, u } = sea();
    group.add(water);

    /* ---------- the hut ---------- */
    // A whitewashed cube, a blue door and shutters, a flat roof with a parapet.
    const lime = col([0.96, 0.01, 90]), blue = col(BLUE);
    const B = [];
    const hut = { x0: HX - 4.2, x1: HX, z0: -2.4, z1: 2.4, h: 3.0 };
    B.push({ p: [(hut.x0 + hut.x1) / 2, hut.h / 2, 0], s: [hut.x1 - hut.x0, hut.h, hut.z1 - hut.z0], c: lime });
    B.push({ p: [(hut.x0 + hut.x1) / 2, hut.h + 0.2, hut.z0 + 0.08], s: [hut.x1 - hut.x0, 0.4, 0.16], c: lime });
    B.push({ p: [(hut.x0 + hut.x1) / 2, hut.h + 0.2, hut.z1 - 0.08], s: [hut.x1 - hut.x0, 0.4, 0.16], c: lime });
    B.push({ p: [hut.x1 - 0.08, hut.h + 0.2, 0], s: [0.16, 0.4, hut.z1 - hut.z0], c: lime });
    // The door and a window face the camera; a small window faces the line.
    B.push({ p: [HX - 1.2, 1.05, hut.z1 + 0.03], s: [0.95, 2.1, 0.06], c: blue });
    B.push({ p: [HX - 1.2, 2.18, hut.z1 + 0.06], s: [1.15, 0.1, 0.12], c: lime });
    B.push({ p: [HX - 3.0, 1.55, hut.z1 + 0.03], s: [0.8, 0.9, 0.06], c: col([0.2, 0.02, 250]) });
    for (const k of [-1, 1]) B.push({ p: [HX - 3.0 + k * 0.62, 1.55, hut.z1 + 0.08], s: [0.42, 0.95, 0.04], r: [0, k * 0.25, 0], c: blue });
    B.push({ p: [HX + 0.03, 1.7, -1.2], s: [0.06, 0.6, 0.6], c: blue });
    // A clay chimney pot and a blue bench by the door.
    B.push({ p: [HX - 3.4, hut.h + 0.5, -1.4], s: [0.45, 1.0, 0.45], c: lime });
    B.push({ p: [HX - 3.4, hut.h + 1.05, -1.4], s: [0.55, 0.1, 0.55], c: col([0.6, 0.11, 45]) });
    B.push({ p: [HX - 2.6, 0.45, hut.z1 + 0.35], s: [1.3, 0.06, 0.4], c: blue });
    for (const dx of [-0.55, 0.55]) B.push({ p: [HX - 2.6 + dx, 0.22, hut.z1 + 0.35], s: [0.06, 0.44, 0.35], c: blue });
    // A slate terrace with whitewashed joints before the door.
    const slate = canvasTex(128, 128, (g) => {
      g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = ok([0.45 + R() * 0.12, 0.02, 60 + R() * 40]);
        g.beginPath(); g.ellipse(R() * 128, R() * 128, 14 + R() * 10, 10 + R() * 8, R() * 3, 0, Math.PI * 2); g.fill();
      }
    }, true);
    slate.repeat.set(2, 1);
    const terrace = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: slate, roughness: 0.9 }));
    terrace.rotation.x = -Math.PI / 2; terrace.position.set(HX - 1.8, 0.02, hut.z1 + 1.5);
    terrace.receiveShadow = true;
    group.add(terrace);

    /* ---------- the post ---------- */
    // A weathered timber post with stones piled at its foot.
    const [px, py, pz] = this.anchors.b;
    const C = [{ p: [px + 0.08, py / 2 + 0.05, pz], s: [0.09, py + 0.3, 0.09], c: col([0.55, 0.03, 70]) }];

    /* ---------- headlands ---------- */
    // Rock spurs reach out on both sides; scrub clings to their tops.
    const stone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    const scrub = [];
    const spur = (x0, z0, x1, z1, h0, h1, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), h = h0 + (h1 - h0) * t * (0.7 + R() * 0.5);
        const s = [h * (0.9 + R() * 0.5), h, h * (0.9 + R() * 0.6)];
        const m = new THREE.Mesh(rock(R, s), stone);
        m.position.set(x0 + (x1 - x0) * t + (R() - 0.5) * 4, -0.3, z0 + (z1 - z0) * t + (R() - 0.5) * 4);
        m.rotation.y = R() * 6;
        m.castShadow = m.receiveShadow = true;
        group.add(m);
        for (let k = 0; k < 6 + h; k++) {
          const a = R() * Math.PI * 2, u = R() * 0.6;
          scrub.push({ p: [m.position.x + Math.cos(a) * s[0] * u, h * (0.75 + R() * 0.15), m.position.z + Math.sin(a) * s[2] * u], s: [1, 0.6, 1].map(v => v * (0.6 + R() * 1.2)), c: col([0.45 + R() * 0.1, 0.07, 115 + R() * 20]) });
        }
      }
    };
    spur(-17, -3, -42, -80, 5, 26, 14);
    spur(18, -2, 48, -95, 3, 22, 14);
    // Boulders scatter along the water's edge.
    for (let i = 0; i < 9; i++) {
      const s = [0.5 + R(), 0.4 + R() * 0.6, 0.5 + R()];
      const m = new THREE.Mesh(rock(R, s), stone);
      m.position.set((R() < 0.5 ? -1 : 1) * (8 + R() * 8), -0.1, SHORE + (R() - 0.6) * 4);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
    inst(group, new THREE.IcosahedronGeometry(1, 0), paint(0.95), scrub);
    inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.9), B);
    inst(group, new THREE.CylinderGeometry(1, 1.15, 1, 7), paint(0.95), C);

    dressBeach(group, R, { HX, SHORE, LINE_Z, hut, look, anchors: this.anchors });

    // The sea moves with the toy's clock and the sun.
    group.userData.tick = (t, sun, cam, viewH, sky) => {
      u.uT.value = t;
      u.uSun.value.copy(sun.dir); u.uSunCol.value.copy(sun.col); u.uB.value = sun.b;
      u.uZen.value.copy(sky.zen); u.uHor.value.copy(sky.hor); u.uHaze.value.copy(sky.haze);
      u.uFocal.value = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    };
    return group;
  },
};
