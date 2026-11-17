// Load order: world/dusk runs first.
import '../world/dusk.ts';
import { MathUtils, Raycaster, Vector3 } from 'three';
import type { Object3D } from 'three';
import { reduced } from '../../../shared/stim.js';
import { CUTS, cutAt, cutsTotal, lens, makeLocks, startAt, type Cut, type Shot } from '../core/sequence.ts';
import type { Phase } from '../core/machine.ts';
import { camera, renderer } from '../setup.ts';
import { hillHeight } from '../world/hill.ts';
import { complex } from '../world/complex.ts';
import { laser } from '../world/laser.ts';
import { applyCamera, applyShot } from './camera.ts';

/* ---------- the pick sequence: locked cuts of the main dome ---------- */
// A pick from rest cuts to close shots of the main dome.
// Hard cuts join the shots.
// After the last shot, a quick dip to black leads to the wide shot.
// Each cut is a locked camera: one eye, one aim, one lens.
// Only the machine moves in the frame.

const DEG = MathUtils.DEG2RAD;
// The cupola's radius at size 1, from world/observatory.ts.
const DOME_R1 = 3.3;

// One shot in the slit's frame, in units of the cupola radius.
// f: out of the slit, level.
// r: to the slit's right.
// u: up.
// The origin is the cupola's centre.
// eye: the camera.
// look: the point it aims at.
// tall: the point a portrait frame aims at, when it differs.
type Point = [number, number, number];
type Plan = { eye: Point; look: Point; tall?: Point };
const PLANS: Record<Shot, Plan> = {
  // Low on the slit's left, tight on the leaves' seam.
  // The dome's rim cuts the frame on a diagonal, with sky above.
  edge: { eye: [2.2, -0.7, 0.1], look: [0.72, -0.05, 0.72] },
  // Low and straight on: the whole dome, the slit up its middle.
  slit: { eye: [5, 0, -0.6], look: [0.5, 0, 0.5] },
  // The same axis, closer: the slit's foot on the ledge.
  // The turn slides the slit and its leaf over the fixed stone.
  // A portrait frame holds one slit edge and the stone beside it.
  gear: { eye: [3.4, 0, -0.8], look: [1, 0, 0], tall: [1, 0.22, 0] },
  // Low on the slit's right, long lens: the tube's mouth.
  // A portrait frame holds the mouth at its centre.
  roll: { eye: [6, 0.6, -0.8], look: [0.7, 0.25, 0.6], tall: [0.7, 0.05, 0.55] },
};
// The eye turns about the cupola by these steps to clear a building.
const TURNS = [0, 20, -20, 40, -40, 60, -60, 90, -90];
// The eye moves in by these shares when a building blocks it.
const NEAR = [1, 0.8, 0.65];
// The eye stays inside the clearing; the trees start at about 45 m.
const EYE_R = 42;
// Reduced motion: one still shot, then one crossfade to the wide shot.
const STILL_S = 2.6, FADE_S = 1.2;
// Reduced motion holds the slit shot.
const STILL_CUT: Cut = CUTS.find(c => c.shot === 'slit')!;
// After the last cut, a quick dip to black leads to the wide shot.
// The last cut fades down in DIP_DOWN seconds.
// The wide shot fades up in DIP_UP seconds.
const DIP_DOWN = 0.35, DIP_UP = 0.45;
const LAST_CUT: Cut = CUTS[CUTS.length - 1];
// The letterbox bars, as a share of the stage height.
const BAR = 0.055;
// The beam is 0.5 m wide to show from the rise; close up it is 5 cm.
const BEAM_CLOSE = 0.1;

const ease = (k: number): number => k * k * (3 - 2 * k);

// A locked camera in world space.
// aim: the point it looks at.
// fov: its vertical lens in degrees.
type Framed = { eye: Vector3; aim: Vector3; fov: number };

const centre = new Vector3();
const ray = new Raycaster();
const tmp = new Vector3();
// The cupola's radius in metres, set at the pick.
let R = 1;

// Everything in the complex that can stand between the eye and the dome.
const blockers = (): Object3D[] => complex.root.children.filter(o => o !== complex.main.root);

// A point of the slit's frame in world space.
// a: the frame's azimuth in radians.
function slitPoint(p: Point, a: number, out: Vector3): Vector3 {
  const [f, r, u] = p;
  return out.copy(centre).add(tmp.set((Math.sin(a) * f + Math.cos(a) * r) * R, u * R, (-Math.cos(a) * f + Math.sin(a) * r) * R));
}

// The slit's azimuth in degrees, read from the posed cupola.
const slitNow = (): number => -complex.main.cupola.rotation.y / DEG;

// Places the eye of one cut so nothing blocks the dome.
// az: the slit's azimuth in degrees.
// aspect: the frame's width over its height.
// The look point turns with the slit, not with the eye.
function place(cut: Cut, az: number, aspect: number): Framed {
  const plan = PLANS[cut.shot];
  const look = slitPoint(plan.look, az * DEG, new Vector3());
  const { fov, tall } = lens(cut.fov, aspect);
  const aim = tall && plan.tall ? slitPoint(plan.tall, az * DEG, new Vector3()) : look;
  const eye = new Vector3();
  for (const near of NEAR) {
    for (const turn of TURNS) {
      slitPoint(plan.eye, (az + turn) * DEG, eye);
      eye.lerp(look, 1 - near);
      if (Math.hypot(eye.x, eye.z) > EYE_R) continue;
      if (eye.y < hillHeight(eye.x, eye.z) + 0.8) continue;
      ray.set(look, tmp.copy(eye).sub(look).normalize());
      ray.far = eye.distanceTo(look);
      if (ray.intersectObjects(blockers(), true).length) continue;
      return { eye, aim, fov };
    }
  }
  // No clear eye: the nearest eye of the plan as it stands.
  slitPoint(plan.eye, az * DEG, eye).lerp(look, 1 - NEAR[NEAR.length - 1]);
  return { eye, aim, fov };
}

/* ---------- the overlay: letterbox bars and the crossfade still ---------- */
const bars = [0, 1].map(i => {
  const b = document.createElement('div');
  b.style.cssText = `position:absolute;left:0;right:0;${i ? 'bottom' : 'top'}:0;height:${BAR * 100}%;background:#000;pointer-events:none;display:none`;
  return b;
});
const still = document.createElement('canvas');
still.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
// The dip's black lies over the frame and the bars.
const dip = document.createElement('div');
dip.style.cssText = 'position:absolute;inset:0;background:#000;pointer-events:none;display:none';
renderer.domElement.after(still, ...bars, dip);

// k: 0 clear, 1 black.
function black(k: number): void {
  dip.style.display = k > 0 ? 'block' : 'none';
  dip.style.opacity = String(k);
}

function beam(k: number): void { laser.mesh.scale.x = laser.mesh.scale.z = k; }

function showBars(on: boolean, opacity = 1): void {
  for (const b of bars) { b.style.display = on ? 'block' : 'none'; b.style.opacity = String(opacity); }
}

/* ---------- the player ---------- */
// A skip asks the loop for a frame through this hook.
let redraw: () => void = () => {};
let t = 0;
// mode: 'off', 'cuts' (hard cuts), 'dip' (the dip to black).
// Reduced motion: 'still', then 'fade' (the crossfade).
let mode: 'off' | 'cuts' | 'dip' | 'still' | 'fade' = 'off';
let fadeT = 0, grab = false;
// The time in the dip.
// dipWide is true once the black hides the change to the wide shot.
let dipT = 0, dipWide = false;
// The locked cameras: each cut sets its own on its first frame.
// The cupola can turn after the pick.
// So each cut frames the slit where it stands at the cut.
// The aspect is fixed then too: a resize keeps the aim and the lens.
const locks = makeLocks(cut => place(cut, slitNow(), camera.aspect));

function toWide(): void {
  mode = 'off';
  showBars(false);
  black(0);
  still.style.display = 'none';
  beam(1);
  applyCamera(camera.aspect);
}

// Steps the dip: the last cut fades down, the wide shot fades up.
function stepDip(dt: number): void {
  dipT += dt;
  if (dipT < DIP_DOWN) { const k = dipT / DIP_DOWN; black(k * k); return; }
  if (!dipWide) {
    // The frame is black now, so the change to the wide shot does not show.
    dipWide = true;
    showBars(false);
    beam(1);
    applyCamera(camera.aspect);
    // This frame shows full black.
    black(1);
    return;
  }
  const k = Math.min(1, (dipT - DIP_DOWN) / DIP_UP);
  black((1 - k) * (1 - k));
  if (k >= 1) toWide();
}

function startFade(): void {
  mode = 'fade';
  fadeT = 0;
  // The next render is the last close frame; it goes onto the still.
  grab = true;
}

export const cuts = {
  // True while the cuts, the dip or the crossfade run.
  get busy(): boolean { return mode !== 'off'; },
  // True while a close shot or the dip shows; a tap or Esc then skips.
  get showing(): boolean { return mode === 'cuts' || mode === 'dip' || mode === 'still'; },
  get shot(): Shot | null {
    if (mode === 'cuts') return cutAt(t)?.shot ?? null;
    if (mode === 'dip') return dipWide ? null : LAST_CUT.shot;
    return mode === 'still' ? STILL_CUT.shot : null;
  },
  get time(): number { return t; },
  // Starts the sequence.
  // phase: the machine's phase after the pick.
  // An open shutter plays only the slew cuts.
  start(phase: Phase): void {
    const main = complex.main;
    main.root.updateMatrixWorld(true);
    main.cupola.getWorldPosition(centre);
    R = DOME_R1 * main.root.scale.x;
    mode = reduced() ? 'still' : 'cuts';
    t = mode === 'cuts' ? startAt(phase) : 0;
    locks.clear();
  },
  // A tap or Esc: straight to the wide shot.
  skip(): void {
    // A skip in the dip lands on the wide shot at once.
    if (mode === 'cuts' || mode === 'dip') toWide();
    else if (mode === 'still') startFade();
    else return;
    redraw();
  },
  // The loop sets this hook: it marks the frame dirty and wakes.
  onSkip(fn: () => void): void { redraw = fn; },
  step(dt: number): void {
    if (mode === 'off') return;
    t += dt;
    if (mode === 'cuts' && t >= cutsTotal) {
      mode = 'dip';
      dipT = 0; dipWide = false;
      stepDip(t - cutsTotal);
    } else if (mode === 'dip') stepDip(dt);
    else if (mode === 'still' && t >= STILL_S) startFade();
    else if (mode === 'fade' && !grab) {
      fadeT += dt;
      const k = Math.min(1, fadeT / FADE_S);
      still.style.opacity = String(1 - ease(k));
      showBars(true, 1 - ease(k));
      if (k >= 1) toWide();
    }
  },
  // Sets the camera for the current shot. The loop calls it before each render.
  frame(): void {
    if (mode === 'off' || (mode === 'fade' && !grab) || (mode === 'dip' && dipWide)) return;
    // The dip holds the last cut until the frame is black.
    const s = mode === 'cuts' ? locks.at(t) : locks.of(mode === 'dip' ? LAST_CUT : STILL_CUT);
    if (!s) return;
    // The projection follows the canvas, so a resize never stretches the frame.
    applyShot(camera.aspect, s.eye, s.aim, s.fov);
    beam(BEAM_CLOSE);
    showBars(true);
  },
  // Copies the last close frame onto the still, then shows the wide shot under it.
  afterRender(): void {
    if (!grab) return;
    grab = false;
    const c = renderer.domElement;
    still.width = c.width; still.height = c.height;
    still.getContext('2d')!.drawImage(c, 0, 0);
    still.style.opacity = '1';
    still.style.display = 'block';
    beam(1);
    applyCamera(camera.aspect);
  },
};

// Esc during the cuts goes straight to the wide shot.
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cuts.showing) cuts.skip(); });
