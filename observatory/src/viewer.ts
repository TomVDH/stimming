// Load order: setup runs first, so the renderer and the shell are up.
import './setup.ts';
import { renderer, stageEl, onLeave, disposeTree } from './setup.ts';
import { Box3, Color, DirectionalLight, HemisphereLight, InstancedMesh, Matrix4, Mesh, Object3D, PerspectiveCamera, PMREMGenerator, Scene, Vector3 } from 'three';
import { clashReport, flipPose, targetPose, TriIndex, type Pose, type Tri } from './core/clearance.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHeroScope } from './world/hero-scope.ts';
import { stage } from '../../shared/stim.js';
import { booted } from './setup.ts';

/* ---------- telescope viewer ---------- */
// A workbench page.
// It shares the observatory's scope model.

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

const scope = buildHeroScope(1);
scene.add(scope.root);
onLeave(() => disposeTree(scope.root));

const cam = new PerspectiveCamera(40, 1, 0.1, 500);
const controls = new OrbitControls(cam, renderer.domElement);
// Orbit and zoom redraw only when they change the view.
// The idle page does no per-frame work.
controls.addEventListener('change', () => draw());

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

// A flip over the pole runs one frame at a time, then stops.
let flipping = false;
const flipTick = (): void => {
  const busy = scope.step(performance.now());
  draw();
  if (busy) requestAnimationFrame(flipTick);
  else flipping = false;
};
// Each tube change redraws the model.
// A change that starts a flip starts the frame loop too.
const setTube = (): void => {
  const started = scope.setTube(Number(alt.value), Number(az.value));
  if (started && !flipping) {
    flipping = true;
    requestAnimationFrame(flipTick);
  }
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
// The hour angle and the declination change, so the gears turn.
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

/* ---------- clearance check: ?clearance prints one report, the same every run ---------- */
// The meshes under the RA joint move. Every other mesh stays fixed.
function clearanceParts(): { moving: (Mesh | InstancedMesh)[]; fixed: (Mesh | InstancedMesh)[] } {
  const moving: (Mesh | InstancedMesh)[] = [], fixed: (Mesh | InstancedMesh)[] = [];
  scope.root.traverse((o) => {
    if (!(o instanceof Mesh || o instanceof InstancedMesh)) return;
    let inRa = false;
    for (let p: Object3D | null = o; p; p = p.parent) if (p === scope.parts.ra) { inRa = true; break; }
    (inRa ? moving : fixed).push(o);
  });
  return { moving, fixed };
}

// Every triangle of a mesh in world space; instanced meshes give one set per copy.
const tmpM = new Matrix4(), instM = new Matrix4();
function worldTris(o: Mesh | InstancedMesh): Tri[] {
  o.updateWorldMatrix(true, false);
  const g = o.geometry;
  const pos = g.attributes.position.array as ArrayLike<number>;
  const idx = g.index ? g.index.array : null;
  const n = idx ? idx.length : pos.length / 3;
  const copies = o instanceof InstancedMesh ? o.count : 1;
  const out: Tri[] = [];
  for (let c = 0; c < copies; c++) {
    if (o instanceof InstancedMesh) { o.getMatrixAt(c, instM); tmpM.multiplyMatrices(o.matrixWorld, instM); } else tmpM.copy(o.matrixWorld);
    const e = tmpM.elements;
    const put = (i: number, t: Tri, off: number): void => {
      const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
      t[off] = e[0] * x + e[4] * y + e[8] * z + e[12];
      t[off + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      t[off + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    };
    for (let k = 0; k < n; k += 3) {
      const t = new Float64Array(9);
      put(idx ? idx[k] : k, t, 0);
      put(idx ? idx[k + 1] : k + 1, t, 3);
      put(idx ? idx[k + 2] : k + 2, t, 6);
      out.push(t);
    }
  }
  return out;
}

// The clashes of the head at one pose: triangle pairs, the deepest, and the moving meshes hit.
function clearanceAt(pose: Pose, parts: { moving: (Mesh | InstancedMesh)[]; fixed: (Mesh | InstancedMesh)[] }) {
  scope.parts.ra.rotation.y = pose.ra;
  scope.parts.dec.rotation.x = pose.dec;
  scope.root.updateMatrixWorld(true);
  // owner[t]: the fixed mesh that triangle t of the index belongs to.
  const owner: number[] = [];
  const fixedTris: Tri[] = [];
  parts.fixed.forEach((o, i) => {
    for (const t of worldTris(o)) { fixedTris.push(t); owner.push(i); }
  });
  const index = new TriIndex(fixedTris);
  let pairs = 0, depth = 0;
  let at: [number, number, number] | null = null;
  const meshes: string[] = [];
  for (let i = 0; i < parts.moving.length; i++) {
    const o = parts.moving[i];
    const r = clashReport(index, worldTris(o));
    if (r.pairs) {
      pairs += r.pairs;
      const partners = [...new Set(r.partners.map((t) => owner[t]))].sort((x, y) => x - y);
      meshes.push(`m${i}:${colour(o)}>f${partners.join(',f')}`);
    }
    if (r.depth > depth) { depth = r.depth; at = r.at; }
  }
  return { pairs, depth, at, meshes };
}

// A mesh's material colour as hex.
function colour(o: Mesh | InstancedMesh): string {
  const mat = o.material as { color?: Color };
  return mat.color ? mat.color.getHexString() : '?';
}

// The fixed pose list: the sky every 15 degrees in altitude and 30 in azimuth, then four flips.
function clearancePoses(): { label: string; pose: Pose }[] {
  const out: { label: string; pose: Pose }[] = [];
  for (let alt = 0; alt <= 90; alt += 15)
    for (let az = 0; az < 360; az += 30) out.push({ label: `sky ${alt}/${az}`, pose: targetPose(alt, az, 0) });
  for (const alt of [30, 45, 60, 75]) {
    const a = targetPose(alt, 90, 0), b = targetPose(alt, 270, a.ra);
    for (let i = 0; i <= 10; i++) out.push({ label: `flip ${alt} ${i / 10}`, pose: flipPose(a, b, i / 10) });
  }
  return out;
}

function runClearance(): void {
  const parts = clearanceParts();
  const lines: string[] = [];
  let total = 0;
  for (const { label, pose } of clearancePoses()) {
    const r = clearanceAt(pose, parts);
    total += r.pairs;
    if (r.pairs) lines.push(`${label}: ${r.pairs} pairs, depth ${(r.depth * 1000).toFixed(2)} mm, at ${JSON.stringify(r.at?.map((v) => +v.toFixed(3)))}, meshes ${r.meshes.join(' ')}`);
  }
  // Both pier sides at every sky pose: east is side +1, west is side -1.
  const sides: string[] = [];
  for (let alt = 0; alt <= 90; alt += 15) {
    for (let az = 0; az < 360; az += 30) {
      const e = clearanceAt(targetPose(alt, az, 0, 1), parts).pairs;
      const w = clearanceAt(targetPose(alt, az, 0, -1), parts).pairs;
      sides.push(`side ${alt}/${az}: east ${e}, west ${w}, rule ${targetPose(alt, az, 0).side > 0 ? 'east' : 'west'}`);
    }
  }
  // The meshes the ids name, with their size and place at the rest pose.
  clearanceAt(targetPose(45, 0, 0), parts);
  const legend = (list: (Mesh | InstancedMesh)[], tag: string): string[] => list.map((o, i) => {
    const b = new Box3().setFromObject(o);
    const r = (v: Vector3) => `[${v.toArray().map((n) => n.toFixed(2)).join(',')}]`;
    return `${tag}${i}: ${colour(o)} ${o instanceof InstancedMesh ? `x${o.count} ` : ''}${r(b.min)}..${r(b.max)}`;
  });
  // The drives turn with the joints: two direct moves, read back from the groups.
  // The rest target due north reads as hour angle -180, so the rest pose rides east.
  // Both targets lie east too, so neither move flips.
  const drive = (alt: number, az: number): string => {
    scope.setTube(alt, az);
    const { ra, dec, worm, knob } = scope.parts;
    return `${alt}/${az}: ra ${ra.rotation.y.toFixed(3)}, dec ${dec.rotation.x.toFixed(3)}, worm ${worm.rotation.x.toFixed(3)}, knob ${knob.rotation.z.toFixed(3)}`;
  };
  const drives = [`drive ${drive(30, 120)}`, `drive ${drive(40, 150)}`];
  // An instance with a mirrored matrix renders inside out.
  const mirrored: string[] = [];
  const mm = new Matrix4();
  scope.root.traverse((o) => {
    if (!(o instanceof InstancedMesh)) return;
    let n = 0;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mm); if (mm.determinant() < 0) n++; }
    if (n) mirrored.push(`mirrored: ${colour(o)} ${n} of ${o.count} instances`);
  });
  const report = [
    `clearance: ${parts.moving.length} moving, ${parts.fixed.length} fixed meshes`,
    ...lines, `total pairs: ${total}`, ...drives, `mirrored instance sets: ${mirrored.length}`, ...mirrored,
    ...sides, ...legend(parts.fixed, 'f'), ...legend(parts.moving, 'm'),
  ].join('\n');
  console.info(report);
  const pre = document.createElement('pre');
  pre.id = 'clearance';
  pre.textContent = report;
  document.body.append(pre);
}
if (new URLSearchParams(location.search).has('clearance')) runClearance();
