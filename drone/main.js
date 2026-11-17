// Drone: a faux drone sim over a dusk field. The module index.html loads.
// Flight: flight.js. Airframe: airframe.js. Input: input.js. Sound: sound.js. Onboard feed: feed.js.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, FogExp2, Mesh, SphereGeometry, ShaderMaterial, BackSide,
  PMREMGenerator, HemisphereLight, DirectionalLight, PlaneGeometry, MeshStandardMaterial, CanvasTexture,
  RepeatWrapping, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap, CircleGeometry, InstancedMesh,
  ConeGeometry, CylinderGeometry, Object3D, Vector3, BoxGeometry, MeshBasicMaterial, BufferGeometry,
  Float32BufferAttribute, Sprite, SpriteMaterial, AdditiveBlending, Group, DoubleSide
} from 'three';
import { initPage, whenVisible, reduced, stage as mark, pageReady, pixelRatio, onQuality, audioKit } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { airframe } from './airframe.js';
import { createSim, P as FLIGHT } from './flight.js';
import { createInput } from './input.js';
import { createRotorSound } from './sound.js';
import { createFeed } from './feed.js';
import { createWash } from './wash.js';

mark('libs');
const stageEl = document.getElementById('stage');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const DEG = Math.PI / 180;
const touch = matchMedia('(pointer: coarse)').matches;
// Loop state comes first: setup calls wake().
let running = false, visible = true, last = 0, idle = 0, first = true;
playIntro({ ready: pageReady(9000) });
mark('build');

/* ---------- bar ---------- */
const VIEWS = [{ value: 'chase', label: 'Chase' }, { value: 'gimbal', label: 'Gimbal' }, { value: 'pilot', label: 'Pilot' }];
const act = { mode() {}, view() {}, cycle() {}, reset() {}, wind() {} };
const help = touch ? [
  ['drag', 'Left half: climb, sink and turn'],
  ['drag', 'Right half: fly forward, back and to the sides'],
  // The shell draws scroll as a pinch on touch.
  ['scroll', 'Zoom the view']
] : [
  ['drag', 'Fly forward, back and to the sides'],
  ['right-drag', 'Climb, sink and turn'],
  ['W', 'Climb; from the ground it starts the motors'],
  ['S', 'Sink'],
  ['A', 'Turn left'],
  ['D', 'Turn right'],
  ['↑', 'Fly forward'],
  ['↓', 'Fly back'],
  ['←', 'Fly left'],
  ['→', 'Fly right'],
  ['shift', 'Hold for fine control'],
  ['scroll', 'Zoom the view'],
  ['gamepad', 'Left stick climbs and turns; right stick flies']
];
const ui = initPage({ id: 'drone', signal: true, bar: {
  choice: { label: 'Mode', value: 'position', options: [
    { value: 'position', label: 'Position', key: '1' },
    { value: 'angle', label: 'Angle', key: '2' },
    { value: 'acro', label: 'Acro', key: '3' }
  ], onPick: v => act.mode(v) },
  actions: [
    { verb: 'view', label: 'View', key: 'V', onPress: () => act.cycle() },
    { verb: 'reset', key: 'R', onPress: () => act.reset() }
  ],
  slider: { label: 'Wind', min: 0, max: 1, step: .01, value: reduced() ? 0 : .4, onInput: v => act.wind(v) },
  settings: [
    { type: 'choice', id: 'view', label: 'View', value: 'chase', persist: true, options: VIEWS, onPick: v => act.view(v) }
  ],
  keys: touch ? [['drag', 'left: climb · turn'], ['drag', 'right: fly']] : [['drag', 'fly'], ['right-drag', 'climb · turn'], ['WASD', 'climb · turn'], ['arrows', 'fly']],
  help,
  quality: true,
  reset: () => act.reset()
} });

/* ---------- renderer ---------- */
const canvas = document.createElement('canvas');
stageEl.prepend(canvas);
let renderer;
try {
  renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  stageEl.querySelector('.fail').hidden = false;
  ui?.hideControls();
  mark('first-frame');
  throw e;
}
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  const fail = stageEl.querySelector('.fail');
  fail.textContent = 'The graphics context was lost. Reload the page to fly again.';
  fail.hidden = false;
  running = false;
});

const scene = new Scene();
const camera = new PerspectiveCamera(60, 1, .05, 5000);

// Seeded random, so the world is the same on every load.
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- sky, haze and sun ---------- */
const FOG = new Color('#bfa99c');
scene.fog = new FogExp2(FOG, .0045);
const sunEl = 7 * DEG, sunAz = 200 * DEG;
// The sun sits low in the west, a little south.
const sunDir = new Vector3(Math.cos(sunEl) * Math.cos(sunAz), Math.sin(sunEl), -Math.cos(sunEl) * Math.sin(sunAz)).normalize();

function skyMesh() {
  return new Mesh(new SphereGeometry(2400, 48, 24), new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false,
    uniforms: {
      zenith: { value: new Color('#4c5c7e') }, horizon: { value: FOG.clone() }, warm: { value: new Color('#f0a26a') },
      haze: { value: new Color('#9f938e') }, sunCol: { value: new Color('#ffb070') }, sunDir: { value: sunDir }
    },
    vertexShader: `varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 zenith, horizon, warm, haze, sunCol, sunDir; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float toward = pow(max(dot(normalize(d.xz + 1e-5), normalize(sunDir.xz)), 0.0), 3.0);
        vec3 col = mix(mix(horizon, warm, toward * .85), zenith, pow(clamp(d.y, 0.0, 1.0), .45));
        col = mix(col, haze, smoothstep(.01, -.06, d.y));
        float s = max(dot(d, sunDir), 0.0);
        col += sunCol * (pow(s, 1400.0) * 22.0 + pow(s, 60.0) * .4 + pow(s, 6.0) * .14);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
}
const sky = skyMesh();
sky.renderOrder = -1;
scene.add(sky);
// Reflections come from the sky itself.
{
  const pm = new PMREMGenerator(renderer), env = new Scene();
  env.add(skyMesh());
  scene.environment = pm.fromScene(env, .04, 1, 5000).texture;
  scene.environmentIntensity = .7;
  env.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  pm.dispose();
}
scene.add(new HemisphereLight('#c3cde0', '#5a4c3c', 1.1));
const sun = new DirectionalLight('#ffc794', 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 });
sun.shadow.bias = -.0004;
sun.shadow.normalBias = .02;
scene.add(sun, sun.target);

/* ---------- textures ---------- */
function tex(n, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  draw(c.getContext('2d'), n);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
  return t;
}
const grass = tex(512, (x, n) => {
  x.fillStyle = '#4a5432'; x.fillRect(0, 0, n, n);
  const pal = ['#3c4a28', '#56603a', '#5f5a36', '#6b6a40', '#44502c', '#2f3b22', '#585c34'];
  for (let i = 0; i < 9000; i++) {
    const px = rnd() * n, py = rnd() * n, a = -Math.PI / 2 + (rnd() - .5) * .9, l = 3 + rnd() * 7;
    x.strokeStyle = pal[i % pal.length]; x.lineWidth = .8 + rnd() * 1.4; x.globalAlpha = .55 + rnd() * .45;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
}, true);
// Broad light and dark patches over the field, in grey.
const patches = tex(256, (x, n) => {
  const img = x.createImageData(n, n), g = [];
  for (let i = 0; i < 64; i++) g.push(rnd());
  const at = (i, j) => g[(i & 7) * 8 + (j & 7)];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let v = 0, amp = .55, f = 8 / n;
    for (let o = 0; o < 3; o++) {
      const u = i * f, w = j * f, iu = Math.floor(u), iw = Math.floor(w), fu = u - iu, fw = w - iw;
      const su = fu * fu * (3 - 2 * fu), sw = fw * fw * (3 - 2 * fw);
      const a = at(iu, iw) + (at(iu + 1, iw) - at(iu, iw)) * su, b = at(iu, iw + 1) + (at(iu + 1, iw + 1) - at(iu, iw + 1)) * su;
      v += (a + (b - a) * sw) * amp; amp *= .5; f *= 2;
    }
    const k = (j * n + i) * 4, c = Math.round(clamp(v / .96, 0, 1) * 255);
    img.data[k] = img.data[k + 1] = img.data[k + 2] = c; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
}, true);
const glowTex = tex(128, (x, n) => {
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, n, n);
});

/* ---------- ground and far hills ---------- */
grass.repeat.set(500, 500);
const groundMat = new MeshStandardMaterial({ map: grass, roughness: 1, metalness: 0 });
groundMat.onBeforeCompile = sh => {
  sh.uniforms.patchMap = { value: patches };
  sh.vertexShader = 'varying vec2 vWxz;\n' + sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvWxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
  sh.fragmentShader = 'uniform sampler2D patchMap; varying vec2 vWxz;\n' + sh.fragmentShader.replace('#include <map_fragment>',
    `#include <map_fragment>
    float pv = texture2D(patchMap, vWxz / 700.0).r * .6 + texture2D(patchMap, vWxz / 90.0 + .31).r * .4;
    diffuseColor.rgb *= mix(vec3(.6, .64, .55), vec3(1.3, 1.2, 1.02), pv);
    diffuseColor.rgb *= mix(.82, 1.0, smoothstep(16.0, 24.0, length(vWxz)));`);
};
const ground = new Mesh(new PlaneGeometry(5000, 5000), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Two hazy ridgelines, untouched by the fog.
function ridge(rad, base, amp, col, s0) {
  const pos = [], N = 180;
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, h = base + amp * (.5 + .3 * Math.sin(a * 3 + s0) + .2 * Math.sin(a * 7.3 + s0 * 2) + .12 * Math.sin(a * 17 + s0));
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    pos.push(x, -20, z, x, h, z);
  }
  const g = new BufferGeometry(), idx = [];
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  for (let i = 0; i < N; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  g.setIndex(idx);
  return new Mesh(g, new MeshBasicMaterial({ color: col, fog: false, side: DoubleSide }));
}
scene.add(ridge(1700, 30, 90, '#a6a2a8', 1.3), ridge(1250, 10, 60, '#8a8f9f', 4.1));

/* ---------- landing pad, with four small lamps ---------- */
const padTex = tex(512, (x, n) => {
  x.fillStyle = '#2c2d2f'; x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(255,255,255,${rnd() * .05})`; x.fillRect(rnd() * n, rnd() * n, 2, 2); }
  x.strokeStyle = 'rgba(236,232,222,.85)'; x.lineWidth = 10;
  x.beginPath(); x.arc(n / 2, n / 2, n * .42, 0, Math.PI * 2); x.stroke();
  x.fillStyle = 'rgba(236,232,222,.88)';
  const w = n * .07, hh = n * .36, sp = n * .13;
  x.fillRect(n / 2 - sp - w / 2, n / 2 - hh / 2, w, hh); x.fillRect(n / 2 + sp - w / 2, n / 2 - hh / 2, w, hh);
  x.fillRect(n / 2 - sp, n / 2 - w / 2, sp * 2, w);
});
const pad = new Mesh(new CircleGeometry(3, 64), new MeshStandardMaterial({ map: padTex, roughness: .9, transparent: true,
  polygonOffset: true, polygonOffsetFactor: -2 }));
pad.rotation.x = -Math.PI / 2;
pad.position.y = .003;
pad.receiveShadow = true;
scene.add(pad);

const warmGlow = new SpriteMaterial({ map: glowTex, color: '#ffc27a', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: .55 });
const bulbM = new MeshBasicMaterial({ color: new Color('#ffd9a0').multiplyScalar(2.2) });
const postM = new MeshStandardMaterial({ color: '#2a2b2d', roughness: .6, metalness: .4 });
function lamp(x, z, h, glow) {
  const g = new Group();
  const post = new Mesh(new CylinderGeometry(.03 * h, .045 * h, h, 8), postM);
  post.position.y = h / 2; post.castShadow = true;
  const bulb = new Mesh(new SphereGeometry(.05 * Math.max(1, h / 2), 10, 8), bulbM);
  bulb.position.y = h;
  const sp = new Sprite(warmGlow);
  sp.scale.setScalar(glow); sp.position.y = h;
  g.add(post, bulb, sp);
  g.position.set(x, 0, z);
  scene.add(g);
}
for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; lamp(Math.cos(a) * 3.5, Math.sin(a) * 3.5, .4, .9); }

/* ---------- obstacles: lamp poles, a container, a windsock, trees ---------- */
const obstacles = [], boxes = [];
for (const [x, z] of [[-14, -6], [16, -22], [-9, 24], [26, 10], [-30, -30], [6, -40]]) {
  lamp(x, z, 7, 3.2);
  obstacles.push({ x, z, r: .14, h: 7.2 });
}
const corrugate = tex(256, (x, n) => {
  x.fillStyle = '#7f3727'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < n; i += 8) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i, 0, 3, n); x.fillStyle = 'rgba(255,220,200,.07)'; x.fillRect(i + 4, 0, 2, n); }
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(60,30,20,${rnd() * .25})`; x.fillRect(rnd() * n, rnd() * n, 3 + rnd() * 9, 2 + rnd() * 5); }
}, true);
corrugate.repeat.set(3, 1);
{
  const b = { x: -16, z: -12, hx: 3.03, hz: 1.22, h: 2.59 };
  const box = new Mesh(new BoxGeometry(b.hx * 2, b.h, b.hz * 2), new MeshStandardMaterial({ map: corrugate, roughness: .75, metalness: .35 }));
  box.position.set(b.x, b.h / 2, b.z);
  box.castShadow = box.receiveShadow = true;
  scene.add(box);
  boxes.push(b);
}
const sockTex = tex(128, (x, n) => {
  for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? '#f2efe8' : '#e8642c'; x.fillRect(0, i * n / 5, n, n / 5); }
});
const sock = new Group();
{
  const pole = new Mesh(new CylinderGeometry(.04, .05, 5, 8), postM);
  pole.position.y = 2.5; pole.castShadow = true;
  const cone = new Mesh(new ConeGeometry(.24, 1.4, 16, 1, true), new MeshStandardMaterial({ map: sockTex, side: DoubleSide, roughness: .9 }));
  // The cone's mouth sits at the pole; its tail points downwind.
  cone.rotation.z = -Math.PI / 2;
  cone.position.x = .7;
  cone.castShadow = true;
  sock.add(cone);
  sock.position.set(9, 4.9, 7);
  const base = new Group();
  base.add(pole);
  base.position.set(9, 0, 7);
  scene.add(base, sock);
  obstacles.push({ x: 9, z: 7, r: .1, h: 5 });
}
// Trees: hedgerows and loose clumps, kept clear of the pad.
{
  const spots = [];
  const lines = [[-60, -80, 120, -70], [-120, 40, -40, 140], [50, 30, 170, 60], [-200, -150, -90, -220], [90, -150, 220, -120]];
  for (const [x0, z0, x1, z1] of lines) {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 5);
    for (let i = 0; i < n; i++) spots.push([x0 + (x1 - x0) * i / n + (rnd() - .5) * 3, z0 + (z1 - z0) * i / n + (rnd() - .5) * 3]);
  }
  for (let k = 0; k < 14; k++) {
    const a = rnd() * Math.PI * 2, d = 45 + rnd() * 300, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    for (let i = 0; i < 6 + rnd() * 10; i++) spots.push([cx + (rnd() - .5) * 18, cz + (rnd() - .5) * 18]);
  }
  const keep = spots.filter(([x, z]) => Math.hypot(x, z) > 30);
  const crown = new InstancedMesh(new ConeGeometry(1, 1, 7), new MeshStandardMaterial({ color: '#33402a', roughness: 1, flatShading: true }), keep.length);
  const trunk = new InstancedMesh(new CylinderGeometry(.6, 1, 1, 6), new MeshStandardMaterial({ color: '#3b3127', roughness: 1 }), keep.length);
  const o = new Object3D(), tint = new Color();
  keep.forEach(([x, z], i) => {
    const h = 7 + rnd() * 9, r = 1.6 + rnd() * 1.6, th = h * .28;
    o.position.set(x, th + (h - th) / 2, z); o.scale.set(r, h - th, r); o.rotation.y = rnd() * 6; o.updateMatrix();
    crown.setMatrixAt(i, o.matrix);
    crown.setColorAt(i, tint.setHSL(.24 + rnd() * .06, .25 + rnd() * .12, .55 + rnd() * .3));
    o.position.set(x, th / 2, z); o.scale.set(.22, th, .22); o.updateMatrix();
    trunk.setMatrixAt(i, o.matrix);
    obstacles.push({ x, z, r: r * .7, h });
  });
  crown.castShadow = trunk.castShadow = true;
  crown.receiveShadow = true;
  scene.add(crown, trunk);
}

/* ---------- the craft and its sim ---------- */
const craft = airframe({ livery: 'indigo', tone: 'b', det: 2 });
scene.add(craft);
const U = craft.userData;
const groundAt = (x, z) => {
  for (const b of boxes) if (Math.abs(x - b.x) < b.hx && Math.abs(z - b.z) < b.hz) return b.h;
  return 0;
};
const sim = createSim({
  rotors: U.props.map(p => ({ x: p.userData.at.x, y: p.userData.at.y, z: p.userData.at.z, dir: p.userData.dir })),
  contacts: U.contacts.map(c => [c.x, c.y, c.z]),
  feet: 4, obstacles, boxes, ground: groundAt
});
const S = sim.s;
const START_YAW = Math.PI / 2;
sim.reset(0, 0, START_YAW);

// Downwash: dust and grass ripples under the craft near the ground.
const wash = createWash(scene, reduced);
const SOCK = { x: 9, z: 7 };

/* ---------- input ---------- */
const input = createInput(canvas, { cyc: document.getElementById('s-cyc'), col: document.getElementById('s-col') }, {
  wake: () => wake(),
  // Pad buttons: bumpers step the mode, Y steps the view, Start resets.
  pad(b) {
    const modes = ['position', 'angle', 'acro'];
    if (b === 4 || b === 5) ui?.choice?.set(modes[(modes.indexOf(S.mode) + (b === 5 ? 1 : 2)) % 3], true);
    else if (b === 3) act.cycle();
    else if (b === 9) act.reset();
  }
});

/* ---------- sound ---------- */
const kit = audioKit({ gain: .6 });
const rotorSound = createRotorSound(kit, U.props.length);

/* ---------- cameras ---------- */
const cam = { mode: 'chase', dist: 4.5, gPitch: -12 * DEG, zoom: 1, yaw: START_YAW, pos: new Vector3(), look: new Vector3(), fr: 0, fp: 0 };
const PILOT = new Vector3(3, 1.7, 9);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const k = Math.sign(e.deltaY);
  if (cam.mode === 'chase') cam.dist = clamp(cam.dist * (1 + k * .12), 2.5, 16);
  else if (cam.mode === 'gimbal') cam.gPitch = clamp(cam.gPitch - k * 4 * DEG, -70 * DEG, 10 * DEG);
  else cam.zoom = clamp(cam.zoom * (1 - k * .12), .4, 3);
  wake();
}, { passive: false });

const v3 = new Vector3(), fwd = new Vector3();
function snapCam() {
  cam.yaw = S.euler ? S.euler.yaw : START_YAW;
  fwd.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  cam.pos.copy(craft.position).addScaledVector(fwd, -cam.dist);
  cam.pos.y += 1 + cam.dist * .18;
  cam.look.copy(craft.position);
}
function updateCam(dt) {
  const e = S.euler || { yaw: START_YAW, roll: 0, pitch: 0 };
  let dy = e.yaw - cam.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  if (cam.mode === 'chase') {
    cam.yaw += dy * (1 - Math.exp(-dt * 3));
    fwd.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    v3.copy(craft.position).addScaledVector(fwd, -cam.dist);
    v3.y += .9 + cam.dist * .18;
    cam.pos.lerp(v3, 1 - Math.exp(-dt * 5));
    cam.pos.y = Math.max(cam.pos.y, groundAt(cam.pos.x, cam.pos.z) + .4);
    v3.copy(craft.position).addScaledVector(fwd, 1.2);
    v3.y += .25;
    cam.look.lerp(v3, 1 - Math.exp(-dt * 10));
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
    camera.fov = 60;
  } else if (cam.mode === 'gimbal') {
    // A three-axis gimbal in the nose: it follows yaw smoothly.
    // It cancels roll and pitch with a short lag, so hard moves tilt the picture briefly.
    cam.yaw += dy * (1 - Math.exp(-dt * 6));
    const k = 1 - Math.exp(-dt / .2);
    cam.fr += (e.roll - cam.fr) * k;
    cam.fp += (e.pitch - cam.fp) * k;
    // Past its stops, about 50 degrees, the picture goes with the craft.
    const stop = clamp((Math.abs(e.roll) - 50 * DEG) / (25 * DEG), 0, 1);
    // The motors shake the frame a hair.
    const buzz = reduced() || !S.armed ? 0 : .0011 * clamp(hud.load, 0, 1.6);
    const jr = buzz * (Math.sin(lastT * 91) + Math.sin(lastT * 137)), jp = buzz * Math.sin(lastT * 113);
    camera.position.copy(U.camera).add(v3.set(.07, -.035, 0));
    craft.localToWorld(camera.position);
    camera.rotation.set(cam.gPitch + (e.pitch - cam.fp) * .5 + jp, cam.yaw - Math.PI / 2,
      -((e.roll - cam.fr) * .5 + e.roll * stop) + jr, 'YXZ');
    camera.fov = 72;
  } else {
    // The tracking camera stands by the pad and keeps the craft framed.
    cam.look.lerp(craft.position, 1 - Math.exp(-dt * 6));
    camera.position.copy(PILOT);
    camera.lookAt(cam.look);
    const d = PILOT.distanceTo(cam.look);
    camera.fov = clamp(2 * Math.atan(4.5 / (d * cam.zoom)) / DEG, 6, 62);
  }
  camera.updateProjectionMatrix();
}

/* ---------- the onboard feed's marks ---------- */
const feed = createFeed(renderer);
// The HUD shows filtered values, as a flight display does.
const hud = { v: new Vector3(), kmh: 0, agl: 0, vs: 0, acc: 0, load: 0, lost: 0 };
let lastT = 0;
function hudStep(dt) {
  const m = sim.telemetry(), k = 1 - Math.exp(-dt / .12);
  hud.v.lerp(v3.set(S.v[0], S.v[1], S.v[2]), k);
  const kmh = m.ground * 3.6;
  hud.acc += ((kmh - hud.kmh) / Math.max(dt, 1e-3) - hud.acc) * (1 - Math.exp(-dt / .4));
  hud.kmh += (kmh - hud.kmh) * k;
  hud.agl += (Math.max(0, m.agl) - hud.agl) * k;
  hud.vs += (m.vs - hud.vs) * k;
  hud.load = m.load;
  // A crash takes the picture away in half a second.
  hud.lost += ((S.crashed ? 1 : 0) - hud.lost) * (1 - Math.exp(-dt / .25));
}
const proj = new Vector3();
const PAD = new Vector3(0, 0, 0);
const MODE_TAG = { position: 'POS', angle: 'ANG', acro: 'ACRO' };
let recT = 0;
function marks(x, W, H) {
  const m = sim.telemetry(), fs = clamp(H * .025, 12, 17);
  // Every mark and word is burned in through the blue channel.
  // The feed shader whitens it, rims it and shades its edges.
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = x.fillStyle = '#00f';
  x.lineWidth = 1.4;
  x.lineCap = 'square';
  x.lineJoin = 'round';
  x.font = `500 ${fs}px Gabarito, sans-serif`;
  x.letterSpacing = `${.45 * fs}px`;
  x.textBaseline = 'middle';
  // Letter spacing trails the last glyph; centred and right text shift back.
  const text = (s, px, py) => {
    const tr = x.textAlign === 'center' ? .225 * fs : x.textAlign === 'right' ? .45 * fs : 0;
    x.fillText(s, px + tr, py);
  };
  // A world direction, by azimuth and elevation, on the picture; null when behind.
  const at = (az, el) => {
    proj.set(Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az)).multiplyScalar(800).add(camera.position).project(camera);
    return proj.z < 1 ? [(proj.x * .5 + .5) * W, (.5 - proj.y * .5) * H] : null;
  };
  const ix = W * .06, iy = H * .08, L = Math.min(W, H) * .05, cx = W / 2, cy = H / 2;

  // The frame: corner marks and the boresight cross.
  x.beginPath();
  for (const [px, py, sx, sy] of [[ix, iy, 1, 1], [W - ix, iy, -1, 1], [ix, H - iy, 1, -1], [W - ix, H - iy, -1, -1]]) {
    x.moveTo(px, py + sy * L); x.lineTo(px, py); x.lineTo(px + sx * L, py);
  }
  x.moveTo(cx - 12, cy); x.lineTo(cx - 5, cy); x.moveTo(cx + 5, cy); x.lineTo(cx + 12, cy);
  x.moveTo(cx, cy - 12); x.lineTo(cx, cy - 5); x.moveTo(cx, cy + 5); x.lineTo(cx, cy + 12);
  x.stroke();

  // Heading tape: 60 degrees each side of the nose.
  x.textAlign = 'center';
  // The tape sits a row below the corner labels, clear of them.
  const tapeY = iy + fs * 3, span = Math.min(W * .18, 230);
  x.beginPath();
  for (let d = Math.ceil((m.hdg - 60) / 10) * 10; d <= m.hdg + 60; d += 10) {
    const px = cx + (d - m.hdg) / 60 * span, big = d % 30 === 0;
    x.moveTo(px, tapeY); x.lineTo(px, tapeY + (big ? 9 : 5));
    if (big) {
      const n = ((d % 360) + 360) % 360;
      text({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[n] ?? String(n / 10), px, tapeY + 9 + fs * .8);
    }
  }
  x.moveTo(cx, tapeY - 3); x.lineTo(cx - 5, tapeY - 10); x.moveTo(cx, tapeY - 3); x.lineTo(cx + 5, tapeY - 10);
  x.stroke();

  // Horizon and pitch ladder, fixed to the world: they roll and pitch with the picture.
  const h0 = at(cam.yaw, 0), hl = at(cam.yaw + .08, 0), hr = at(cam.yaw - .08, 0);
  let ang = 0;
  if (h0 && hl && hr) {
    const ux = hr[0] - hl[0], uy = hr[1] - hl[1], ul = Math.hypot(ux, uy) || 1, u = [ux / ul, uy / ul];
    ang = Math.atan2(u[1], u[0]);
    const seg = (c, a0, a1) => { x.moveTo(c[0] + u[0] * a0, c[1] + u[1] * a0); x.lineTo(c[0] + u[0] * a1, c[1] + u[1] * a1); };
    const inView = c => Math.hypot(c[0] - cx, c[1] - cy) < H * .34;
    x.beginPath();
    if (Math.abs(h0[1] - cy) < H * .45) { seg(h0, -W * .26, -W * .06); seg(h0, W * .06, W * .26); }
    x.stroke();
    const w1 = Math.min(W * .045, 60), w2 = w1 * 2.1;
    for (let el = -30; el <= 30; el += 5) {
      if (el === 0) continue;
      const c = at(cam.yaw, el * DEG);
      if (!c || !inView(c)) continue;
      const big = el % 10 === 0, ww = big ? w2 : w1 * 1.6;
      // Rungs above the horizon are solid; rungs below are dashed.
      x.setLineDash(el < 0 ? [6, 5] : []);
      x.beginPath();
      seg(c, -ww, -w1 * .9); seg(c, w1 * .9, ww);
      // End ticks point toward the horizon.
      const n = [u[1] * Math.sign(el) * 6, -u[0] * Math.sign(el) * 6];
      for (const s of [-ww, ww]) { const p = [c[0] + u[0] * s, c[1] + u[1] * s]; x.moveTo(p[0], p[1]); x.lineTo(p[0] + n[0], p[1] + n[1]); }
      x.stroke();
      if (big) {
        x.save();
        x.translate(c[0] - u[0] * (ww + 16), c[1] - u[1] * (ww + 16));
        x.rotate(ang);
        x.textAlign = 'center';
        text(String(Math.abs(el)), 0, 0);
        x.restore();
      }
    }
    x.setLineDash([]);
  }

  // Waterline: where the nose points, banked with the craft.
  const e = S.euler || { roll: 0, pitch: 0, yaw: 0 };
  const nose = at(e.yaw, e.pitch);
  if (nose) {
    x.save();
    x.translate(clamp(nose[0], W * .3, W * .7), clamp(nose[1], H * .2, H * .8));
    x.rotate(ang + e.roll);
    x.beginPath();
    x.moveTo(-46, 0); x.lineTo(-18, 0); x.lineTo(-10, 8); x.lineTo(0, 0); x.lineTo(10, 8); x.lineTo(18, 0); x.lineTo(46, 0);
    x.stroke();
    x.restore();
  }

  // Velocity vector: where the craft is going, not where it points.
  const sp = hud.v.length();
  if (sp > .6) {
    proj.copy(hud.v).multiplyScalar(800 / sp).add(camera.position).project(camera);
    if (proj.z < 1) {
      let px = (proj.x * .5 + .5) * W, py = (.5 - proj.y * .5) * H;
      // Off the picture, the marker waits at the edge, dashed.
      const off = px < W * .28 || px > W * .72 || py < H * .16 || py > H * .82;
      px = clamp(px, W * .28, W * .72); py = clamp(py, H * .16, H * .82);
      const r = 9;
      x.setLineDash(off ? [3, 3] : []);
      x.beginPath();
      x.arc(px, py, r, 0, Math.PI * 2);
      x.moveTo(px - r, py); x.lineTo(px - r - 14, py);
      x.moveTo(px + r, py); x.lineTo(px + r + 14, py);
      x.moveTo(px, py - r); x.lineTo(px, py - r - 9);
      x.stroke();
      x.setLineDash([]);
    }
  }

  // Speed tape on the left, altitude tape on the right.
  // side -1 puts the ticks and numbers outward to the left.
  // trend: the value three seconds on, drawn as a bar from the box.
  function tape(tx, side, value, step, every, range, fmt, sub, trend) {
    const th = H * .44, y0 = cy - th / 2, k = th / (2 * range), bw = fs * 4.6, bh = fs * 1.9;
    x.beginPath();
    x.moveTo(tx, y0); x.lineTo(tx, y0 + th);
    x.textAlign = side < 0 ? 'right' : 'left';
    for (let i = Math.ceil((value - range) / step); i * step <= value + range; i++) {
      const v = i * step, y = cy - (v - value) * k;
      if (v < 0 || Math.abs(y - cy) < bh * .7) continue;
      const big = i % every === 0;
      x.moveTo(tx, y); x.lineTo(tx + side * (big ? 12 : 6), y);
      if (big) text(fmt(v), tx + side * 18, y);
    }
    // The trend bar runs along the inner side of the tape.
    const ty = clamp(cy - (trend - value) * k, y0, y0 + th);
    if (Math.abs(ty - cy) > bh * .55) {
      const tb = tx - side * 3, from = cy + Math.sign(ty - cy) * bh * .55;
      x.moveTo(tb, from); x.lineTo(tb, ty);
      x.moveTo(tb - 4, ty); x.lineTo(tb + 4, ty);
    }
    // The value box sits on the inner side and points at the tape.
    const bx = tx - side * 6, inner = bx - side * bw;
    x.moveTo(bx, cy); x.lineTo(bx - side * 8, cy - bh / 2); x.lineTo(inner, cy - bh / 2);
    x.lineTo(inner, cy + bh / 2); x.lineTo(bx - side * 8, cy + bh / 2); x.closePath();
    x.stroke();
    x.textAlign = 'center';
    // The live value reads larger and heavier than the scale.
    x.font = `700 ${fs * 1.2}px Gabarito, sans-serif`;
    text(fmt(value), (bx - side * 8 + inner) / 2, cy);
    x.font = `500 ${fs}px Gabarito, sans-serif`;
    if (sub) text(sub, (bx - side * 8 + inner) / 2, cy + bh * 1.2);
  }
  const vs = Math.abs(hud.vs) < .05 ? 0 : hud.vs;
  tape(W * .2, -1, hud.kmh, 5, 2, 25, v => String(Math.round(v)), 'KM/H', hud.kmh + hud.acc * 3);
  tape(W * .8, 1, hud.agl, 1, 5, 10, v => v.toFixed(Math.abs(v - Math.round(v)) < .05 ? 0 : 1),
    `${vs >= 0 ? '+' : ''}${vs.toFixed(1)} M/S`, hud.agl + hud.vs * 3);

  // Corner lines and the state.
  const top = iy + fs * 1.4, bot = H - Math.max(H * .17, 96);
  x.textAlign = 'left';
  text(`CAM 1   GIMBAL ${Math.round(cam.gPitch / DEG)}°`, ix + L * .4, top);
  x.textAlign = 'right';
  const tt = Math.floor(recT), tc = [Math.floor(tt / 3600), Math.floor(tt / 60) % 60, tt % 60].map(v => String(v).padStart(2, '0')).join(':');
  text(`REC ${tc}`, W - ix - L * .4, top);
  if (Math.floor(recT * 2) % 2 === 0) { x.beginPath(); x.arc(W - ix - L * .4 - x.measureText(`REC ${tc}`).width - fs * .7, top, fs * .3, 0, Math.PI * 2); x.fill(); }
  x.textAlign = 'center';
  PAD.y = craft.position.y;
  text(`HOME ${craft.position.distanceTo(PAD).toFixed(0)} M   ${MODE_TAG[S.mode]}   ${S.crashed ? 'SIGNAL LOST' : S.armed ? 'ARMED' : 'SAFE'}`, cx, bot + fs * 1.5);
  x.letterSpacing = '0px';
  x.globalCompositeOperation = 'source-over';
}

/* ---------- bar actions ---------- */
function place() {
  craft.position.set(S.p[0], S.p[1], S.p[2]);
  craft.quaternion.set(S.q[0], S.q[1], S.q[2], S.q[3]);
  craft.updateMatrixWorld();
}
function setView(v) {
  cam.mode = v;
  if (v === 'chase') snapCam();
  if (v === 'gimbal') feed.cold();
  wake();
}
let crashedAt = 0;
act.mode = v => { S.mode = v; wake(); };
act.view = v => setView(v);
act.cycle = () => {
  const i = VIEWS.findIndex(o => o.value === cam.mode), next = VIEWS[(i + 1) % VIEWS.length].value;
  const row = ui?.setting('view');
  if (row) row.set(next, true); else setView(next);
};
act.reset = () => { sim.reset(0, 0, START_YAW); crashedAt = 0; place(); snapCam(); wake(); };
act.wind = v => { FLIGHT.wind = v * 8; S.windOn = v > .01; wake(); };
act.wind(ui?.slider?.value ?? (reduced() ? 0 : .4));
const saved = ui?.setting('view')?.value;
if (saved && VIEWS.some(o => o.value === saved)) cam.mode = saved;

/* ---------- per frame ---------- */
place();
snapCam();
const sprite = U.sprites;
const listener = new Vector3();
function look(dt, t) {
  // Props: the eye reads a slow spin; past that, a blur disc.
  let avg = 0;
  const rps = U.props.map((p, i) => {
    const r = Math.sqrt(S.f[i]) * FLIGHT.rpmMax / 60;
    avg += r / U.props.length;
    p.rotation.y += p.userData.dir * Math.min(r, 9) * Math.PI * 2 * dt;
    return r;
  });
  U.carbon.opacity = clamp(1.15 - avg / 45, .16, 1);
  U.discM.opacity = clamp((avg - 10) / 60, 0, .16);
  const lit = S.armed ? 1 : .35;
  sprite.core.opacity = .85 * lit; sprite.bloom.opacity = .12 * lit; sprite.flare.opacity = .1 * lit;
  // Front strobes: a double blink every 1.2 s.
  const ph = t % 1.2;
  sprite.strobe.opacity = S.armed && (ph < .05 || (ph > .14 && ph < .19)) ? 1 : 0;

  const g = groundAt(S.p[0], S.p[2]), agl = S.p[1] - g;
  const m = sim.telemetry();
  // Cloud puffs size in metres; this turns metres at one metre into pixels.
  const pxScale = renderer.domElement.height / 2 / Math.tan(camera.fov * DEG / 2);
  const I = wash.update(dt, t, { x: S.p[0], z: S.p[2], ground: g, agl, load: m.load, armed: S.armed, wind: S.wind }, pxScale);

  // The windsock points downwind and lifts with speed.
  // A craft close by blows it away from itself.
  const dx = SOCK.x - S.p[0], dz = SOCK.z - S.p[2], dd = Math.hypot(dx, dz) || 1;
  const push = 9 * I * clamp(1 - dd / 8, 0, 1) * clamp(1 - (S.p[1] - 5) / 6, 0, 1);
  const w = [S.wind[0] + dx / dd * push, 0, S.wind[2] + dz / dd * push], ws = Math.hypot(w[0], w[2]);
  const flap = reduced() ? 0 : (.04 + .05 * clamp(push / 6, 0, 1)) * Math.sin(t * (7 + push * 2));
  sock.rotation.set(0, Math.atan2(-w[2], w[0]), -(1 - clamp(ws / 6, 0, 1)) * 1.1 + flap);

  sun.position.copy(craft.position).addScaledVector(sunDir, 70);
  sun.target.position.copy(craft.position);
  sky.position.copy(camera.position);

  // The listener stands at the camera; the gimbal's mic rides the craft.
  listener.copy(camera.position);
  const d = listener.distanceTo(craft.position);
  v3.copy(craft.position).sub(listener).normalize();
  const closing = -(S.v[0] * v3.x + S.v[1] * v3.y + S.v[2] * v3.z);
  proj.copy(craft.position).project(camera);
  rotorSound.update({ rps, load: m.load, dist: d, pan: proj.z < 1 ? proj.x : 0, closing, onboard: cam.mode === 'gimbal',
    near: clamp(1 - agl / 3, 0, 1) }, dt, t);
}

let W = 1, H = 1, dpr = 1;
function resize() {
  W = Math.max(1, stageEl.clientWidth); H = Math.max(1, stageEl.clientHeight);
  dpr = pixelRatio(W, H);
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  wake();
}
new ResizeObserver(resize).observe(stageEl);
onQuality(resize);

function frame(now) {
  if (!running) return;
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  try {
    Object.assign(S.input, input.read(dt));
    sim.step(dt);
    if (S.crashed && !crashedAt) crashedAt = t;
    // A lost craft returns to the pad after three seconds.
    if (crashedAt && t - crashedAt > 3) act.reset();
    place();
    look(dt, t);
    hudStep(dt);
    lastT = t;
    updateCam(dt);
    if (cam.mode === 'gimbal') recT += dt;
  } finally {
    // The feed sizes its target on first use, then on each resize.
    if (cam.mode === 'gimbal') feed.size(W, H, dpr);
    if (cam.mode === 'gimbal') feed.render(scene, camera, marks, reduced(), hud.lost);
    else renderer.render(scene, camera);
  }
  if (first) { first = false; canvas.classList.add('on'); mark('first-frame'); }
  // Asleep: on the ground, disarmed and untouched for 30 s.
  const busy = S.armed || !S.landed || input.busy() || rotorSound.on || wash.alive;
  idle = busy ? 0 : idle + dt;
  if (idle > 30) { running = false; return; }
  requestAnimationFrame(frame);
}
function wake() {
  idle = 0;
  if (running || !visible) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}
whenVisible(stageEl, v => {
  visible = v;
  if (v) wake();
  else { running = false; input.releaseAll(); rotorSound.stop(); }
});
resize();
wake();
