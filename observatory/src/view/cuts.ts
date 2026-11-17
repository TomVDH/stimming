// Load order: world/lights runs first.
import '../world/lights.ts';
import { MathUtils, Raycaster, Vector3 } from 'three';
import type { Object3D } from 'three';
import { reduced } from '../../../shared/stim.js';
import { CUTS, cutAt, cutsTotal, type Shot } from '../core/sequence.ts';
import { camera, renderer } from '../setup.ts';
import { hillHeight } from '../world/hill.ts';
import { complex } from '../world/complex.ts';
import { laser } from '../world/laser.ts';
import { applyCamera, applyShot } from './camera.ts';

/* ---------- the pick sequence: close long-lens cuts of the main dome ---------- */
// A pick from rest cuts to close shots while the shutter opens and the tube rolls.
// Hard cuts between shots; after the last one, back to the wide shot.
// The machine runs on underneath; the cuts change only the camera.

const DEG = MathUtils.DEG2RAD;
// The cupola's radius at size 1, from world/observatory.ts.
const DOME_R1 = 3.3;
// The tube's front end, in the tube's local units.
const TUBE_TIP = new Vector3(0, 0, -2.3);

// One shot in the slit's frame, in units of the cupola radius.
// f: out of the slit, level; r: to the slit's right; u: up. Origin: the cupola's centre.
// look: the point it frames, or 'tip' for the tube's front end.
// drift: how far the eye moves inside the cut. fov: start and end, vertical degrees.
type Plan = {
  eye: [number, number, number];
  look: [number, number, number] | 'tip';
  drift: [number, number, number];
  fov: [number, number];
};
const C55 = Math.cos(55 * DEG), S55 = Math.sin(55 * DEG);
const C50 = Math.cos(50 * DEG), S50 = Math.sin(50 * DEG);
// The edge look sits left of centre: seen from the right, the gap shows there.
const PLANS: Record<Shot, Plan> = {
  // Tight on the slit edge where the two leaves part.
  edge: { eye: [4.2, 1.4, -0.6], look: [C55, -0.12, S55], drift: [0, 0.18, 0.06], fov: [20, 9] },
  // The whole slit, straight on.
  slit: { eye: [6, -0.5, -0.55], look: [C50 * 0.9, 0, S50 * 0.9], drift: [-0.25, -0.12, 0], fov: [28, 12] },
  // Low and to the side on the rim at the slit's foot, where the cupola meets the drum.
  gear: { eye: [2.4, 2.6, -0.8], look: [0.97, 0.25, 0.12], drift: [0, -0.2, 0.03], fov: [20, 10] },
  // Low in the slit's plane: the tube's mouth, and the sky through the slit's top.
  roll: { eye: [2.8, 0, -0.9], look: 'tip', drift: [0, 0.12, 0.04], fov: [24, 10] },
};
// The eye turns about the cupola by these steps to clear a building.
const TURNS = [0, 20, -20, 40, -40, 60, -60, 90, -90];
const NEAR = [1, 0.8, 0.65];
// The eye stays inside the clearing; the trees start at about 45 m.
const EYE_R = 42;
// Reduced motion: one still shot, then one crossfade to the wide shot.
const STILL_S = 2.6, FADE_S = 1.2;
// The letterbox bars, as a share of the stage height.
const BAR = 0.055;
// The beam is 0.5 m wide to show from the rise; close up it is 5 cm.
const BEAM_CLOSE = 0.1;
// A portrait lens is at most this much wider than the landscape lens.
const PORTRAIT_MAX = 1.5;

const ease = (k: number): number => k * k * (3 - 2 * k);

type Framed = { eye: Vector3; f: Vector3; r: Vector3; plan: Plan };

const centre = new Vector3();
const ray = new Raycaster();
const tmp = new Vector3(), tmp2 = new Vector3();

// Everything in the complex that can stand between the eye and the dome.
const blockers = (): Object3D[] => complex.root.children.filter(o => o !== complex.main.root);

// Places the eye of one shot so nothing blocks the dome.
function frame(plan: Plan, az: number, R: number): Framed {
  const f = new Vector3(), r = new Vector3();
  const look = plan.look === 'tip' ? new Vector3(0.6 * R, 0.5 * R, 0) : new Vector3(plan.look[0] * R, plan.look[2] * R, 0);
  let best: Framed | null = null;
  for (const near of NEAR) {
    for (const turn of TURNS) {
      const a = (az + turn) * DEG;
      f.set(Math.sin(a), 0, -Math.cos(a));
      r.set(Math.cos(a), 0, Math.sin(a));
      const [ef, er, eu] = plan.eye;
      const eye = centre.clone().addScaledVector(f, ef * R * near).addScaledVector(r, er * R).add(tmp.set(0, eu * R, 0));
      if (Math.hypot(eye.x, eye.z) > EYE_R) continue;
      if (eye.y < hillHeight(eye.x, eye.z) + 0.8) continue;
      // The look point turns with the slit, not with the eye.
      const sa = az * DEG;
      const target = tmp2.copy(centre).addScaledVector(tmp.set(Math.sin(sa), 0, -Math.cos(sa)), look.x).add(tmp.set(0, look.y, 0));
      const dist = eye.distanceTo(target);
      ray.set(target, tmp.copy(eye).sub(target).normalize());
      ray.far = dist;
      if (ray.intersectObjects(blockers(), true).length) continue;
      best = { eye, f: f.clone(), r: r.clone(), plan };
      break;
    }
    if (best) break;
  }
  if (best) return best;
  // No clear eye: the nearest eye straight out of the slit.
  const a = az * DEG;
  f.set(Math.sin(a), 0, -Math.cos(a));
  r.set(Math.cos(a), 0, Math.sin(a));
  const eye = centre.clone().addScaledVector(f, plan.eye[0] * R * NEAR[NEAR.length - 1]).add(tmp.set(0, plan.eye[2] * R, 0));
  return { eye, f, r, plan };
}

/* ---------- the overlay: letterbox bars and the crossfade still ---------- */
const bars = [0, 1].map(i => {
  const b = document.createElement('div');
  b.style.cssText = `position:absolute;left:0;right:0;${i ? 'bottom' : 'top'}:0;height:${BAR * 100}%;background:#000;pointer-events:none;display:none`;
  return b;
});
const still = document.createElement('canvas');
still.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
renderer.domElement.after(still, ...bars);

function beam(k: number): void { laser.mesh.scale.x = laser.mesh.scale.z = k; }

function showBars(on: boolean, opacity = 1): void {
  for (const b of bars) { b.style.display = on ? 'block' : 'none'; b.style.opacity = String(opacity); }
}

/* ---------- the player ---------- */
// A skip asks the loop for a frame through this hook.
let redraw: () => void = () => {};
let t = 0;
// mode: 'off', 'cuts' (hard cuts), 'still' (reduced motion), 'fade' (the crossfade).
let mode: 'off' | 'cuts' | 'still' | 'fade' = 'off';
let fadeT = 0, grab = false;
let shots: Partial<Record<Shot, Framed>> = {};
let slitAz = 0, R = 1;
const eye = new Vector3(), look = new Vector3(), tip = new Vector3();

function toWide(): void {
  mode = 'off';
  showBars(false);
  still.style.display = 'none';
  beam(1);
  applyCamera(camera.aspect);
}

function startFade(): void {
  mode = 'fade';
  fadeT = 0;
  // The next render is the last close frame; it goes onto the still.
  grab = true;
}

export const cuts = {
  // True while the sequence owns the camera or the crossfade runs.
  get busy(): boolean { return mode !== 'off'; },
  // True while a close shot shows; a tap or Esc then skips.
  get showing(): boolean { return mode === 'cuts' || mode === 'still'; },
  get shot(): Shot | null { return mode === 'cuts' ? cutAt(t)?.shot ?? null : mode === 'still' ? 'slit' : null; },
  get time(): number { return t; },
  // Starts the sequence; az is the slit's azimuth at the pick.
  start(az: number): void {
    slitAz = az;
    const main = complex.main;
    main.root.updateMatrixWorld(true);
    main.cupola.getWorldPosition(centre);
    R = DOME_R1 * main.root.scale.x;
    shots = {};
    for (const c of CUTS) shots[c.shot] = frame(PLANS[c.shot], slitAz, R);
    t = 0;
    mode = reduced() ? 'still' : 'cuts';
  },
  // A tap or Esc: straight to the wide shot.
  skip(): void {
    if (mode === 'cuts') toWide();
    else if (mode === 'still') startFade();
    else return;
    redraw();
  },
  // The loop sets this hook: it marks the frame dirty and wakes.
  onSkip(fn: () => void): void { redraw = fn; },
  step(dt: number): void {
    if (mode === 'off') return;
    t += dt;
    if (mode === 'cuts' && t >= cutsTotal) toWide();
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
    if (mode === 'off' || (mode === 'fade' && !grab)) return;
    const cut = mode === 'cuts' ? cutAt(t) : null;
    const shot: Shot = cut ? cut.shot : 'slit';
    const s = shots[shot];
    if (!s) return;
    const p = s.plan;
    // Reduced motion holds the end of the shot: no zoom, no drift.
    const k = cut ? Math.min(1, (t - cut.at) / cut.dur) : 1;
    const dk = cut ? k : 0;
    eye.copy(s.eye).addScaledVector(s.f, p.drift[0] * R * dk).addScaledVector(s.r, p.drift[1] * R * dk);
    eye.y += p.drift[2] * R * dk;
    if (p.look === 'tip') {
      look.copy(complex.main.tube.localToWorld(tip.copy(TUBE_TIP)));
    } else {
      const a = slitAz * DEG;
      look.copy(centre).add(tmp.set(Math.sin(a) * p.look[0] * R, p.look[2] * R, -Math.cos(a) * p.look[0] * R))
        .addScaledVector(tmp2.set(Math.cos(a), 0, Math.sin(a)), p.look[1] * R);
    }
    // A portrait frame takes a wider lens, so the subject still fits across.
    const tall = camera.aspect < 1 ? Math.min(PORTRAIT_MAX, 1 / Math.sqrt(camera.aspect)) : 1;
    const fov = MathUtils.lerp(p.fov[0], p.fov[1], cut ? ease(k) : 1) * tall;
    applyShot(camera.aspect, eye, look, fov);
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
