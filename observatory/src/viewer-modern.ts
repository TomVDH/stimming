// Load order: setup runs first, so the renderer and the shell are up.
import './setup.ts';
import { renderer, stageEl, onLeave, disposeTree } from './setup.ts';
import { Box3, Color, DirectionalLight, HemisphereLight, PerspectiveCamera, PMREMGenerator, Scene, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildModernScope } from './world/modern-scope.ts';
import { stage } from '../../shared/stim.js';
import { booted } from './setup.ts';

/* ---------- modern telescope viewer ---------- */
// A workbench page.
// It shows the modern scope model alone, beside the hero refractor's viewer.

const DEG = Math.PI / 180;
// The tube rests at this altitude when the page opens.
const REST_ALT = 45;

const scene = new Scene();
scene.background = new Color(0x0b0d12);
// Metal parts reflect this room, so they do not read black.
scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new HemisphereLight(0xbfd2ff, 0x1a1a1e, 1.4));
const key = new DirectionalLight(0xfff4e0, 2.2);
key.position.set(-30, 40, 30);
scene.add(key);

const scope = buildModernScope(1);
scene.add(scope.root);
onLeave(() => disposeTree(scope.root));

const cam = new PerspectiveCamera(40, 1, 0.1, 500);
const controls = new OrbitControls(cam, renderer.domElement);
// Orbit and zoom redraw only when they change the view.
// The idle page does no per-frame work.
controls.addEventListener('change', () => draw());

// The mirrors render what they see inside this call.
function draw(): void {
  renderer.render(scene, cam);
}

// Frames the model from the front-right, at its own centre.
function frame(): void {
  const box = new Box3().setFromObject(scope.root);
  const centre = box.getCenter(new Vector3());
  const span = box.getSize(new Vector3()).length();
  controls.target.copy(centre);
  cam.position.copy(centre).add(new Vector3(0.6, 0.35, 1).normalize().multiplyScalar(span * 1.3));
  cam.near = span / 100;
  cam.far = span * 20;
  cam.updateProjectionMatrix();
  // Aims the camera at the new target.
  controls.update();
}

/* ---------- tube controls ---------- */
const panel = document.createElement('div');
panel.className = 'scope-ui';
const row = (label: string, id: string, min: number, max: number, value: number): HTMLInputElement => {
  const wrap = document.createElement('label');
  wrap.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  input.id = id;
  const out = document.createElement('output');
  out.textContent = `${value}°`;
  input.addEventListener('input', () => { out.textContent = `${input.value}°`; });
  wrap.append(input, out);
  panel.append(wrap);
  return input;
};
const alt = row('Tube altitude', 'scope-alt', 0, 90, REST_ALT);
const az = row('Tube azimuth', 'scope-az', 0, 360, 0);
const turnWrap = document.createElement('label');
const turn = document.createElement('input');
turn.type = 'checkbox';
turn.id = 'scope-turn';
turnWrap.append(turn, ' Turn');
panel.append(turnWrap);
const sweepWrap = document.createElement('label');
const sweep = document.createElement('input');
sweep.type = 'checkbox';
sweep.id = 'scope-sweep';
sweepWrap.append(sweep, ' Sweep azimuth');
panel.append(sweepWrap);
document.body.append(panel);

// Each tube change redraws the model.
const setTube = (): void => {
  scope.setTube(Number(alt.value), Number(az.value));
  draw();
};
alt.addEventListener('input', setTube);
az.addEventListener('input', setTube);

// The turn runs only while the box is ticked.
// Reduced motion leaves it off.
let spin = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tick = (t: number): void => {
  if (!turn.checked) { spin = 0; return; }
  scope.root.rotation.y = (t / 1000) * 0.4;
  draw();
  spin = requestAnimationFrame(tick);
};
turn.addEventListener('change', () => {
  if (turn.checked && !reduced) spin = requestAnimationFrame(tick);
  if (!turn.checked) cancelAnimationFrame(spin);
});

// The sweep turns the azimuth at a fixed altitude.
// One turn takes about nine seconds.
let sweepStart = 0, sweepRaf = 0;
const sweepTick = (t: number): void => {
  if (!sweep.checked) return;
  const deg = ((t - sweepStart) / 1000) * 40;
  az.value = String(Math.round(deg % 360));
  az.dispatchEvent(new Event('input'));
  sweepRaf = requestAnimationFrame(sweepTick);
};
sweep.addEventListener('change', () => {
  cancelAnimationFrame(sweepRaf);
  if (!sweep.checked || reduced) return;
  // The sweep resumes from the azimuth the slider shows.
  sweepStart = performance.now() - (Number(az.value) / 40) * 1000;
  sweepRaf = requestAnimationFrame(sweepTick);
});

/* ---------- covers and fans ---------- */
// Two toggles: the mirror covers, and the cell's fans.
const check = (label: string, id: string): HTMLInputElement => {
  const wrap = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.id = id;
  wrap.append(box, label);
  panel.append(wrap);
  return box;
};
const covers = check(' Covers closed', 'scope-covers');
const fans = check(' Fans', 'scope-fans');

// The loop runs only while the scope reports motion.
// Reduced motion snaps the covers and keeps the fans still.
let animRaf = 0, last = 0;
const animate = (t: number): void => {
  const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
  last = t;
  const more = scope.step(dt);
  draw();
  animRaf = more ? requestAnimationFrame(animate) : 0;
  if (!more) last = 0;
};
const wake = (): void => {
  if (!animRaf) animRaf = requestAnimationFrame(animate);
};
covers.addEventListener('change', () => {
  scope.setCovers(!covers.checked);
  if (reduced) {
    scope.step(60);
    draw();
  } else wake();
});
fans.addEventListener('change', () => {
  scope.setFans(fans.checked && !reduced);
  wake();
});

/* ---------- size and first frame ---------- */
function resize(): void {
  const w = stageEl.clientWidth || 1;
  const h = stageEl.clientHeight || 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
  draw();
}
new ResizeObserver(resize).observe(stageEl);

scope.setTube(REST_ALT, 0);
frame();
resize();
stage('first-frame');
booted();
