// The cut lab, ?lab: Tom frames the cuts himself (stimming-j2rw).
// It adds a clay look, a free camera and a contact sheet to the ?dev tools.
import { BackSide, DoubleSide, Material, Mesh, MeshBasicMaterial, MeshMatcapMaterial, Vector3 } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Shot } from '../core/sequence.ts';
import type { Scope } from '../core/selector.ts';
import { camera, renderer, scene, stageEl } from '../setup.ts';
import { cutFocus, postBypass } from '../post/chain.ts';
import { camDev } from './cuts.ts';

// What the lab needs from the loop.
export type LabApi = {
  // Replays the cuts from a shot's start, paused, in a telescope's dome.
  replay(shot: Shot, scope: Scope): void;
  setPaused(on: boolean): void;
  draw(): void;
  readonly scope: Scope;
  // The shot that shows, or null for the wide shot.
  readonly shot: Shot | null;
};

/* ---------- the clay look: flat grey shapes, no post ---------- */
// Clay is lit by a fixed gradient, so night lights do not darken it.
const CLAY = new MeshMatcapMaterial({ color: 0xc4c2bc, fog: false });
const CLAY_IN = new MeshMatcapMaterial({ color: 0xc4c2bc, fog: false, side: BackSide });
const CLAY_BOTH = new MeshMatcapMaterial({ color: 0xc4c2bc, fog: false, side: DoubleSide });
// The ground takes a darker clay, so the buildings read against it.
const GROUND = new MeshMatcapMaterial({ color: 0x5c5a56, fog: false, side: DoubleSide });
// See-through parts and leaf cards draw nothing in clay.
const NONE = new MeshBasicMaterial({ visible: false });
// A mesh wider than this many metres counts as ground.
const GROUND_R = 150;
const kept = new WeakMap<Mesh, Material | Material[]>();
let clay = false;

// The clay stand-in for one material.
function clayOf(mesh: Mesh, m: Material): Material {
  // Shader parts (sky, far hills, tree impostors) keep their own look.
  if (m.type === 'ShaderMaterial' || m.type === 'RawShaderMaterial') return m;
  if (m.transparent || m.alphaTest > 0) return NONE;
  const g = mesh.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  if ((g.boundingSphere?.radius ?? 0) > GROUND_R) return GROUND;
  return m.side === BackSide ? CLAY_IN : m.side === DoubleSide ? CLAY_BOTH : CLAY;
}

// Puts clay on every mesh, or the kept materials back.
// The close models build late, so each draw in clay runs it again.
function applyClay(): void {
  scene.traverse(o => {
    if (!(o as Mesh).isMesh) return;
    const mesh = o as Mesh;
    if (clay) {
      if (kept.has(mesh)) return;
      kept.set(mesh, mesh.material);
      const m = mesh.material;
      mesh.material = Array.isArray(m) ? m.map(x => clayOf(mesh, x)) : clayOf(mesh, m);
    } else if (kept.has(mesh)) {
      mesh.material = kept.get(mesh)!;
      kept.delete(mesh);
    }
  });
}

/* ---------- the free camera: orbit and dolly, then Copy plan ---------- */
// The controls load with the lab only, so the toy never fetches them.
let controls: OrbitControls;
let free = false;
const freeEye = new Vector3();

/* ---------- the panel ---------- */
const SHOTS: Shot[] = ['edge', 'slit', 'lift', 'roll', 'glass', 'mirror'];
const panel = document.createElement('div');
panel.className = 'cut-lab';
const sheet = document.createElement('div');
sheet.className = 'cut-sheet';
sheet.hidden = true;
const note = document.createElement('span');
note.className = 'cut-note';

export async function initLab(api: LabApi): Promise<void> {
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.zoomSpeed = 0.6;
  const btn = (text: string, title: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.title = title;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', fn);
    panel.append(b);
    return b;
  };
  const say = (text: string): void => { note.textContent = text; };
  const press = (b: HTMLButtonElement, on: boolean): void => b.setAttribute('aria-pressed', String(on));

  const clayBtn = btn('Clay', 'Clay look, no post (C)', () => setClay(!clay));
  const freeBtn = btn('Free', 'Free camera: drag to orbit, right-drag to pan, wheel to dolly (F)', () => setFree(!free));
  btn('Copy plan', 'Copy the shot lines for this framing (P)', copyPlan);
  const sheetBtn = btn('Sheet', 'Contact sheet of every shot (K)', () => toggleSheet());
  const scopeBtns = (['refractor', 'reflector'] as Scope[]).map(s =>
    btn(s === 'refractor' ? 'Classic' : 'Keck', `The ${s}'s dome`, () => { void buildSheet(s); }));
  panel.append(note);
  stageEl.append(panel, sheet);
  const syncScope = (): void => scopeBtns.forEach((b, i) => press(b, (i ? 'reflector' : 'refractor') === api.scope));

  function setClay(on: boolean): void {
    clay = on;
    applyClay();
    postBypass(on);
    press(clayBtn, on);
    api.draw();
  }

  function setFree(on: boolean): void {
    const shot = api.shot;
    if (on && !shot) { say('Play a shot first'); return; }
    free = on;
    press(freeBtn, on);
    controls.enabled = on;
    if (on) {
      api.setPaused(true);
      // The orbit starts on the shot's own eye and aim.
      const f = camDev.framed(shot!);
      freeEye.copy(f.eye);
      controls.target.copy(f.aim);
      camera.position.copy(freeEye);
      controls.update();
      say(`Free on ${shot}`);
    } else say('');
    api.draw();
  }

  function copyPlan(): void {
    const shot = api.shot;
    if (!shot) { say('Play a shot first'); return; }
    // The free camera's framing becomes the shot's plan.
    if (free && !camDev.aim(shot, freeEye, controls.target)) { say('The glass shots follow the glass'); return; }
    const text = camDev.line(shot);
    console.info(text);
    void navigator.clipboard?.writeText(text).then(() => say(`Copied ${shot}`), () => say('Copy failed: see the console'));
  }

  /* ---------- the contact sheet ---------- */
  function toggleSheet(): void {
    if (sheet.hidden) void buildSheet(api.scope);
    else { sheet.hidden = true; press(sheetBtn, false); }
  }
  // One still per shot: the shot's first frame, replayed in the dome.
  async function buildSheet(scope: Scope): Promise<void> {
    if (free) setFree(false);
    // Paused, each replay holds its shot's first frame.
    api.setPaused(true);
    sheet.hidden = false;
    press(sheetBtn, true);
    sheet.replaceChildren();
    const shots = scope === 'reflector' ? SHOTS : SHOTS.slice(0, 5);
    for (const shot of shots) {
      api.replay(shot, scope);
      syncScope();
      // The frame just drawn is still on the canvas.
      const c = renderer.domElement, band = Math.min(1, c.width / c.height / 2.39);
      const sh = c.height * band, sy = (c.height - sh) / 2;
      const t = document.createElement('canvas');
      t.width = 480; t.height = Math.round(480 * sh / c.width);
      t.getContext('2d')!.drawImage(c, 0, sy, c.width, sh, 0, 0, t.width, t.height);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cut-cell';
      cell.append(t, Object.assign(document.createElement('span'), { textContent: `${SHOTS.indexOf(shot) + 1} ${shot}` }));
      cell.addEventListener('pointerdown', e => e.stopPropagation());
      // A still opens its shot and plays it.
      cell.addEventListener('click', () => {
        sheet.hidden = true;
        press(sheetBtn, false);
        api.replay(shot, scope);
        api.setPaused(false);
      });
      sheet.append(cell);
      // The page stays live between the stills.
      await new Promise(r => setTimeout(r, 0));
    }
    say(`${scope === 'reflector' ? 'Keck' : 'Classic'} dome`);
  }

  // The free camera eats its own pointer, so the stage takes no tap.
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel'] as const)
    renderer.domElement.addEventListener(ev, e => { if (free) e.stopPropagation(); });
  controls.addEventListener('change', () => { freeEye.copy(camera.position); api.draw(); });

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest?.('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'c') setClay(!clay);
    else if (k === 'f') setFree(!free);
    else if (k === 'p') copyPlan();
    else if (k === 'k') toggleSheet();
    else return;
    e.preventDefault();
  });
  syncScope();
}

// The loop calls this after the cuts set the camera, before the render.
export function labFrame(): void {
  if (clay) applyClay();
  if (!free) return;
  camera.position.copy(freeEye);
  camera.lookAt(controls.target);
  camera.updateMatrixWorld();
  cutFocus(null);
}
