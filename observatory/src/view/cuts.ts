// Load order: world/hero runs first.
import '../world/hero.ts';
import { Box3, MathUtils, Matrix4, Ray, Texture, Vector3 } from 'three';
import { reduced } from '../../../shared/stim.js';
import { MIRROR_PUSH, cutOf, lens, makeLocks, skipSeq, startSeq, stepSeq, type Cut, type Lift, type Seq, type Shot } from '../core/sequence.ts';
import { AXES_UP, D_OFF, targetPose, TUBE_SHIFT } from '../core/clearance.ts';
import type { Phase } from '../core/machine.ts';
import type { Dome } from '../world/observatory.ts';
import type { Star } from '../core/catalog.ts';
import type { AltAz } from '../core/sky.ts';
import { azDelta } from '../core/dome.ts';
import { setStarLift, sky } from '../sky/stars.ts';
import { camera, renderer } from '../setup.ts';
import { CLEAR, hillHeight } from '../world/hill.ts';
import { complex } from '../world/complex.ts';
import { hero, heroSlitAz, type HeroOf } from '../world/hero.ts';
import { altAzDir, laser } from '../world/laser.ts';
import { applyCamera, applyShot } from './camera.ts';
import { cutFocus, cutGrain, cutMist } from '../post/chain.ts';

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
// inside: the eye stands inside the drum, on the observing floor.
// aperture: the blur at infinity, a share of the frame's height.
// The focus lies on the look point, on the moving part.
type Point = [number, number, number];
type Plan = { eye: Point; look: Point; tall?: Point; inside?: boolean; aperture: number };
const PLANS: Record<Exclude<Shot, 'glass' | 'mirror'>, Plan> = {
  // a. Low and close on the slit's right: the dome looms, its crown on the stars.
  // The locked camera holds while the cupola turns and the leaves slowly part.
  edge: { eye: [2.7, 0.8, -0.25], look: [0.3, 0.15, 0.62], aperture: 0.008 },
  // b. Dead centre from the front, at eye height, on a long lens.
  // The open slit stands between the dome's shoulders.
  // The lower shutter drops and the slit opens on the tube.
  // The eye stays on the summit, so the lens is 17 degrees.
  slit: { eye: [3.6, 0, -0.3], look: [0.6, 0, 0.4], aperture: 0.006 },
  // c. Inside, low, behind the mount, left of the slit.
  // The pier and mount stand dark on the right.
  // The wall lamp lights them red.
  // The tube lifts on a diagonal toward the slit and its stars.
  // The ring beam's curve runs along the foot of the frame.
  // A portrait frame aims at the tube's middle.
  lift: { eye: [-0.55, -0.45, -0.42], look: [0.35, 0, 0.24], tall: [0.25, -0.05, 0.14], inside: true, aperture: 0.012 },
  // d. Low and far on the slit's right, a narrow lens.
  // The dome's plates fill the left and the middle.
  // The open slit stands on the right, the tube rising inside it.
  // A portrait frame aims at the dew shield.
  roll: { eye: [6, 0.6, -0.8], look: [0.7, 0.25, 0.4], tall: [0.72, 0, 0.3], aperture: 0.01 },
};
// The edge shot locks up to this many degrees ahead of the slit.
// The slit then turns through the frame, not out of it.
const EDGE_LEAD = 4.5;
// The big dome's floor lies a third of a radius under the centre.
// Its lift shot stands higher, behind the fork, on the tube's middle.
const BIG_LIFT: Plan = { eye: [-0.55, -0.45, -0.2], look: [0.2, 0, 0.5], tall: [0.15, 0, 0.45], inside: true, aperture: 0.012 };
// A shot's plan in the dome the cuts show.
const planOf = (shot: Exclude<Shot, 'glass' | 'mirror'>): Plan => (shot === 'lift' && dome.big ? BIG_LIFT : PLANS[shot]);
// The eye turns about the cupola by these steps to clear a building.
const TURNS = [0, 20, -20, 40, -40, 60, -60, 90, -90];
// The eye moves in by these shares when a building blocks it.
const NEAR = [1, 0.8, 0.65];
// The eye stays over the bare summit, inside the trees' clearing.
const EYE_R = CLEAR - 6;
// A building's box grows by this many metres.
// A thin mast near the eye then blocks it too.
const BOX_PAD = 0.6;
// Reduced motion: one still shot, then one crossfade to the wide shot.
const STILL_S = 2.6, FADE_S = 1.2;
// After the last cut, a quick dip to black leads to the wide shot.
// The last cut fades down in DIP_DOWN seconds.
// The wide shot fades up in DIP_UP seconds.
const DIP_DOWN = 0.35, DIP_UP = 0.45;
// The cuts show on a 2.39:1 film frame, between letterbox bars.
// A stage wider than the film shows no bars.
const FILM = 2.39;
// The film frame's share of the stage height.
const band = (aspect: number): number => Math.min(1, aspect / FILM);
// The film frame's aspect: each shot is framed for it.
const filmAspect = (aspect: number): number => Math.max(aspect, FILM);
// The render lens that puts a film lens of fov degrees in the band.
const renderFov = (fov: number, aspect: number): number =>
  2 * Math.atan(Math.tan(fov * DEG / 2) / band(aspect)) / DEG;

const ease = (k: number): number => k * k * (3 - 2 * k);

// A locked camera in world space.
// aim: the point it looks at.
// fov: its vertical lens in degrees.
// glass: the glass shot's eye distance, in metres.
// Its eye follows the glass's place of rest each frame.
// focus: metres from the eye to the sharp plane.
type Framed = { eye: Vector3; aim: Vector3; fov: number; focus: number; aperture: number; glass?: { dist: number }; mirror?: boolean };

const centre = new Vector3();
const ray = new Ray();
const tmp = new Vector3();
const UP = new Vector3(0, 1, 0);
// The cupola's radius in metres, set at the pick.
let R = 1;
// The dome the cuts show, set at the pick.
// The hero model stands in only for the main dome.
let dome: Dome = complex.main;
// The hero's telescope, when the cuts show the main dome.
// The chosen dome's close model; null for a dome without one.
let heroNow: HeroOf | null = hero.of(complex.main);
const heroScope = () => heroNow?.scope ?? null;
const heroReady = (): boolean => !!heroNow?.ready;

// Inside the dome, the eye keeps clear of the hero's fixed parts.
// The values come from world/hero.ts and world/hero-scope.ts.
// They are in dome units, in the main dome's own frame.
// floor: the floor's height. wall: the inner wall's radius.
// keep: [x, z, radius] of each part to clear.
type Room = { floor: number; wall: number; keep: [number, number, number][] };
// The classic drum: the pier, the ladder, the red work lamp.
const CLASSIC: Room = { floor: 1.8, wall: 2.84, keep: [[0, 0.42, 0.6], [-0.99, 2.11, 0.5], [0.94, 2.58, 0.4]] };
// The big dome: the reflector's fork, the red work lamp.
const BIG: Room = { floor: 1.71, wall: 3.15, keep: [[0, 0, 0.9], [1.09, 2.99, 0.4]] };
const local = new Vector3();
// True when an inside eye clears the wall, floor and parts.
function clearInside(eye: Vector3): boolean {
  const room = dome.big ? BIG : CLASSIC;
  dome.root.worldToLocal(local.copy(eye));
  if (Math.hypot(local.x, local.z) > room.wall - 0.25 || local.y < room.floor + 0.15) return false;
  return room.keep.every(([x, z, r]) => Math.hypot(local.x - x, local.z - z) > r);
}

// The boxes of everything in the complex that can stand before the dome.
// They are set at the pick.
let boxes: Box3[] = [];
function setBoxes(): void {
  boxes = complex.root.children.filter(o => o !== dome.root)
    .map(o => new Box3().setFromObject(o).expandByScalar(BOX_PAD));
}
// True when a box stands between a point and the eye.
function hidden(from: Vector3, eye: Vector3): boolean {
  ray.set(from, tmp.copy(eye).sub(from).normalize());
  const far = eye.distanceTo(from);
  return boxes.some(b => { const hit = ray.intersectBox(b, tmp); return hit !== null && hit.distanceTo(from) < far; });
}
// The sight lines cross the frame at these shares of its half width.
// A thin mast near the eye then falls on one of them.
const ACROSS = [0, -0.45, 0.45, -0.9, 0.9];
const side = new Vector3(), off = new Vector3();
// True when a box stands anywhere across the middle of the frame.
// halfW: the frame's half width over its distance, from the lens.
function blocked(look: Vector3, eye: Vector3, halfW: number): boolean {
  side.subVectors(eye, look).cross(UP).normalize().multiplyScalar(halfW * eye.distanceTo(look));
  return ACROSS.some(k => hidden(off.copy(look).addScaledVector(side, k), eye));
}

// A point of the slit's frame in world space.
// a: the frame's azimuth in radians.
function slitPoint(p: Point, a: number, out: Vector3): Vector3 {
  const [f, r, u] = p;
  return out.copy(centre).add(tmp.set((Math.sin(a) * f + Math.cos(a) * r) * R, u * R, (-Math.cos(a) * f + Math.sin(a) * r) * R));
}

// The slit's azimuth in degrees, read from the posed cupola.
// The cuts frame the hero's slit, which turns past the light model's.
const slitNow = (): number => heroSlitAz(dome);

// Places the eye of one cut so nothing blocks the dome.
// az: the slit's azimuth in degrees.
// aspect: the frame's width over its height.
// The look point turns with the slit, not with the eye.
function place(cut: Cut, az: number, aspect: number): Framed {
  if (cut.shot === 'glass' || cut.shot === 'mirror') return placeGlass(cut, aspect);
  const plan = planOf(cut.shot);
  const look = slitPoint(plan.look, az * DEG, new Vector3());
  const { fov, tall } = lens(cut.fov, aspect);
  const aim = tall && plan.tall ? slitPoint(plan.tall, az * DEG, new Vector3()) : look;
  const eye = new Vector3();
  const halfW = Math.tan(fov * DEG / 2) * aspect;
  for (const near of NEAR) {
    for (const turn of TURNS) {
      slitPoint(plan.eye, (az + turn) * DEG, eye);
      eye.lerp(look, 1 - near);
      if (Math.hypot(eye.x, eye.z) > EYE_R) continue;
      if (eye.y < hillHeight(eye.x, eye.z) + 0.8) continue;
      if (plan.inside && !clearInside(eye)) continue;
      if (blocked(look, eye, halfW)) continue;
      return { eye, aim, fov, focus: eye.distanceTo(look), aperture: plan.aperture };
    }
  }
  // No clear eye: the nearest eye of the plan as it stands.
  slitPoint(plan.eye, az * DEG, eye).lerp(look, 1 - NEAR[NEAR.length - 1]);
  return { eye, aim, fov, focus: eye.distanceTo(look), aperture: plan.aperture };
}

// These shots stand inside the dome, so they take no mist.
const INDOOR = new Set<Shot>(['lift', 'glass', 'mirror']);

/* ---------- the glass shot: locked on the glass's place of rest ---------- */
// Copied from world/hero-scope.ts, in dome units.
// The site's latitude in degrees.
const LAT = 51;
// The glass's face, along the tube from the declination axis.
const GLASS_Z = 2.27;
// The glass's diameter.
const GLASS_D = 0.276;
// The glass fills this share of a landscape frame's height.
const GLASS_FILL = 0.6;
// It fills this share of a portrait frame's width.
const GLASS_FILL_TALL = 0.7;
// The eye sits this many degrees under the tube's axis.
// The glass then mirrors the sky, not the ground.
const GLASS_UNDER = 4 * DEG;
// The glass shot's depth of field: a shallow focus on the glass.
const GLASS_APERTURE = 0.016;
// The picked star shines this much brighter in the glass.
const TARGET_K = 1.5;
const gm = new Matrix4(), gr = new Matrix4();
const gp = new Vector3(), ga = new Vector3(), gu = new Vector3();

// The glass's centre, axis and up in world space.
// alt and az: the tube's pose in degrees.
// The maths follow the mount in world/hero-scope.ts.
// The real model never moves for it.
function glassAt(alt: number, az: number): void {
  // The big dome's reflector gives its own pose.
  const sc = heroScope();
  if (sc?.restGlass) { sc.restGlass(alt, az, gp, ga, gu); return; }
  // The joint angles come from core/clearance.ts, as the hero's do.
  const p = targetPose(alt, az, 0);
  gm.makeTranslation(0, dome.turnY + AXES_UP, 0)
    .multiply(gr.makeRotationX(LAT * DEG - Math.PI / 2))
    .multiply(gr.makeRotationY(p.ra))
    .multiply(gr.makeRotationX(p.dec))
    .multiply(gr.makeTranslation(D_OFF, 0, TUBE_SHIFT))
    .premultiply(dome.root.matrixWorld);
  gp.set(0, 0, GLASS_Z).applyMatrix4(gm);
  ga.set(0, 0, 1).transformDirection(gm);
  // Up lies across the axis, toward the sky.
  gu.set(0, 1, 0).addScaledVector(ga, -ga.y).normalize();
}

// The glass shot's lens and eye distance, fixed at its first frame.
// A landscape frame holds the glass at GLASS_FILL of its height.
// A portrait frame holds it at GLASS_FILL_TALL of its width.
function placeGlass(cut: Cut, aspect: number): Framed {
  // The reflector frames its front ring; the refractor, its glass.
  const d = heroScope()?.aperture ?? GLASS_D * dome.root.scale.x;
  const dist = d / GLASS_FILL / 2 / Math.tan(cut.fov * DEG / 2);
  const fov = aspect < 1 ? 2 * Math.atan(d / GLASS_FILL_TALL / aspect / 2 / dist) / DEG : cut.fov;
  return { eye: new Vector3(), aim: new Vector3(), fov, focus: dist, aperture: GLASS_APERTURE, glass: { dist }, mirror: cut.shot === 'mirror' };
}

// Puts the glass shot's eye before the glass's place of rest.
// At rest the tube stands at its goal altitude.
// Its azimuth is the one it has now.
// So the eye turns with the tube and the dome.
// The glass rises into the frame and stops at its centre.
function glassEye(s: Framed, v: View): void {
  glassAt(v.restAlt, v.tubeAz);
  const d = s.glass!.dist;
  s.eye.copy(gp).addScaledVector(ga, d * Math.cos(GLASS_UNDER)).addScaledVector(gu, -d * Math.sin(GLASS_UNDER));
  s.aim.copy(gp);
}

/* ---------- the mirror shot: the disk wipe onto the reflector's primary ---------- */
// Tom, 2026-11-23: the secondary's white disk crests over the camera as a wipe.
// The push starts on the glass shot's framing and lasts MIRROR_PUSH.
// The lens widens to the mirror cut's lens.
// The primary then fills MIRROR_FILL of the band's height.
const MIRROR_FILL = 0.95;
// A shallow focus: the passing disk goes soft, the primary stays sharp.
const MIRROR_APERTURE = 0.03;
// The focus pulls from the disk to the primary over this share of the push.
const PULL_A = 0.3, PULL_B = 0.7;
const smooth = (a: number, b: number, x: number): number => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
// t: seconds in the shot.
// The eye keeps off the axis, midway between the housing and the ring.
// It turns from under the axis to between two vanes before it reaches them.
function mirrorEye(s: Framed, v: View, t: number): void {
  const sc = heroScope();
  if (!sc?.restGlass || sc.mirrorR === undefined || sc.secR === undefined || sc.aperture === undefined || sc.frontDist === undefined) { glassEye(s, v); return; }
  sc.restGlass(v.restAlt, v.tubeAz, gp, ga, gu);
  const k = ease(Math.min(1, t / MIRROR_PUSH));
  const fov0 = cutOf('glass').fov, fov1 = cutOf('mirror').fov;
  s.fov = fov0 + (fov1 - fov0) * k;
  const d0 = sc.aperture / GLASS_FILL / 2 / Math.tan(fov0 * DEG / 2);
  const d1 = sc.mirrorR / MIRROR_FILL / Math.tan(fov1 * DEG / 2);
  const d = d0 + (d1 - d0) * k;
  const o = Math.max(d * Math.tan(GLASS_UNDER), (sc.secR + sc.aperture / 2) / 2);
  const turn = Math.min(1, k * 2) * Math.PI / 4;
  side.crossVectors(ga, gu);
  off.copy(gu).multiplyScalar(-Math.cos(turn)).addScaledVector(side, Math.sin(turn));
  s.eye.copy(gp).addScaledVector(ga, d).addScaledVector(off, o);
  s.aim.copy(gp);
  // The focus starts on the disk at the tube's front, then pulls to the primary.
  const toMirror = s.eye.distanceTo(gp), toDisk = Math.max(0.3, d - sc.frontDist);
  s.focus = toDisk + (toMirror - toDisk) * smooth(PULL_A, PULL_B, k);
  s.aperture = MIRROR_APERTURE;
}

// Tom, 2026-11-23: realistic stars in the mirror.
// The stars keep their true size; the mirror shot draws them LIFT_GAIN times as bright.
const LIFT_GAIN = 1.5;
let lifted = false;
function starLift(on: boolean): void {
  if (on === lifted) return;
  lifted = on;
  setStarLift(1, on ? LIFT_GAIN : 1);
}

/* ---------- the overlay: letterbox bars and the crossfade still ---------- */
const bars = [0, 1].map(i => {
  const b = document.createElement('div');
  b.style.cssText = `position:absolute;left:0;right:0;${i ? 'bottom' : 'top'}:0;height:0;background:#000;pointer-events:none;display:none`;
  return b;
});
const still = document.createElement('canvas');
still.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
// The dip's black lies over the frame and the bars.
const dip = document.createElement('div');
dip.style.cssText = 'position:absolute;inset:0;background:#000;pointer-events:none;display:none';

/* ---------- frame blending: each beat fades in over the one before ---------- */
// Tom, 2026-11-23: blend the 30 fps beats, so the motion runs smoother.
// Two canvases hold the last two beats.
// The older one lies over the frame and fades out until the next beat.
// A hard cut never blends: the new shot shows at once.
const beats = [0, 1].map(() => {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
  return c;
});
// beatN: the beats kept since the last drop.
// beatShot: the newest beat's shot. blending: the older beat shows.
let beatN = 0, beatShot: Shot | null = null, blending = false;
// Keeps the frame just rendered; the beat before it goes on top.
function keepBeat(shot: Shot): void {
  const c = renderer.domElement, now = beats[beatN % 2], prev = beats[(beatN + 1) % 2];
  if (now.width !== c.width || now.height !== c.height) { now.width = c.width; now.height = c.height; }
  now.getContext('2d')!.drawImage(c, 0, 0);
  now.style.display = 'none';
  blending = beatN > 0 && shot === beatShot && prev.width === c.width && prev.height === c.height;
  prev.style.display = blending ? 'block' : 'none';
  prev.style.opacity = '1';
  beatShot = shot;
  beatN++;
}
function dropBeats(): void {
  for (const b of beats) b.style.display = 'none';
  beatN = 0; beatShot = null; blending = false;
}
renderer.domElement.after(...beats, still, ...bars, dip);

// k: 0 clear, 1 black.
function black(k: number): void {
  dip.style.display = k > 0 ? 'block' : 'none';
  dip.style.opacity = String(k);
}

// The cuts hide the beam; the wide shot shows it.
function beam(on: boolean): void { laser.mesh.visible = on; }

// The bars follow the stage's aspect, so a resize keeps the film frame.
function showBars(on: boolean, opacity = 1): void {
  const h = `${(1 - band(camera.aspect)) / 2 * 100}%`;
  for (const b of bars) { b.style.display = on ? 'block' : 'none'; b.style.opacity = String(opacity); b.style.height = h; }
}

/* ---------- the player ---------- */
// The loop hands the cuts the tube and its lift each frame.
// restAlt: the altitude the tube lifts to.
// shutter: the shutter's travel, 1 when open.
// cupAz and cupGoal: the cupola's azimuth and the azimuth it turns to.
export type View = Lift & { tubeAlt: number; tubeAz: number; restAlt: number; shutter: number; cupAz: number; cupGoal: number };
// A skip asks the loop for a frame through this hook.
let redraw: () => void = () => {};
// mode: 'off', 'cuts' (hard cuts), 'dip' (the dip to black).
// Reduced motion: 'wait', 'still', then 'fade'.
// 'wait' keeps the wide shot while the tube lifts.
let mode: 'off' | 'cuts' | 'dip' | 'wait' | 'still' | 'fade' = 'off';
let seq: Seq = startSeq('open', { altLeft: 0, altEta: 0 });
// The tube as the loop last reported it.
let view: View = { altLeft: 0, altEta: 0, tubeAlt: 0, tubeAz: 0, restAlt: 0, shutter: 0, cupAz: 0, cupGoal: 0 };
let stillT = 0, fadeT = 0, grab = false;
// The time in the dip.
// dipWide is true once the black hides the change to the wide shot.
let dipT = 0, dipWide = false;
// Seconds since the pick, for the dip into the first shot.
// The wide shot fades down in DIP_DOWN.
// The first shot fades up in DIP_UP.
let inT = 0;
// The shot the last frame rendered, or null for the wide shot.
let rendered: Shot | null = null;
// The shot the dip holds.
let lastShot: Shot = 'glass';
// The locked cameras: each cut sets its own on its first frame.
// The cupola can turn after the pick.
// So each cut frames the slit where it stands at the cut.
// The aspect is fixed then too: a resize keeps the aim and the lens.
const locks = makeLocks(cut => place(cut, slitNow() + (cut.shot === 'edge' ? edgeLead() : 0), filmAspect(camera.aspect)));
// The edge lock's lead: half the turn to come, toward the star.
function edgeLead(): number {
  const d = azDelta(view.cupAz, view.cupGoal);
  return Math.sign(d) * Math.min(Math.abs(d) / 2, EDGE_LEAD);
}

// The hero model shows in the close shots only.
// The wide shot keeps the light model, so nothing changes there.
// held: QA keeps the hero in outside the cuts.
let heroOn = false, held = false;
// The model the close shots use, chosen at the start.
// It changes only at a hard cut, so no locked shot swaps its model.
// A hero that gets ready late joins at the next cut.
let useHero = false, cutShot: Shot | null = null;
// The hero laser's mouth, reused each frame.
const mouthAt = new Vector3();
function swap(on: boolean): void {
  if (on !== heroOn) {
    heroOn = on;
    heroNow?.show(on);
    dome.show(!on);
  }
  if (on) heroNow?.follow(dome);
}

// The catalog waits here until the hero's glass can take it.
// The glass bakes its star map once, in about 30 ms.
// That happens while the wide shot shows.
// Each dome's model takes the catalog once.
let stars: readonly Star[] | null = null;
const fed = new WeakSet<object>();
// Hands the glass its stars once.
// It hands it the sky's turn while the hero shows.
function feedGlass(show: boolean): void {
  const sc = heroScope();
  if (!sc) return;
  if (stars && !fed.has(sc)) {
    sc.setStars(stars);
    fed.add(sc);
    // The star map goes to the GPU now, not in the glass shot.
    // Before the hero's warm-up, the warm-up uploads it.
    const u = (renderer.properties.get(sc.glass.material) as { uniforms?: Record<string, { value: unknown }> }).uniforms;
    const map = u?.uStars?.value;
    if (map instanceof Texture) renderer.initTexture(map);
  }
  if (show && sky.points) sc.setSky(sky.points.matrix);
}

function toWide(): void {
  mode = 'off';
  starLift(false);
  dropBeats();
  cutFocus(null);
  cutGrain(0);
  cutMist(true);
  showBars(false);
  black(0);
  still.style.display = 'none';
  beam(true);
  applyCamera(camera.aspect);
}

// Steps the dip: the last cut fades down, the wide shot fades up.
function stepDip(dt: number): void {
  dipT += dt;
  // The black and the grain change in frame(), on the film beat.
  if (dipT < DIP_DOWN) return;
  if (!dipWide) {
    // The frame is black now, so the change to the wide shot does not show.
    dipWide = true;
    dropBeats();
    showBars(false);
    beam(true);
    applyCamera(camera.aspect);
    // This frame shows full black.
    black(1);
    cutFocus(null);
    cutGrain(0);
    cutMist(true);
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
    // The wide shot still shows while it fades to black.
    if (mode === 'cuts') return inT < DIP_DOWN ? null : seq.shot;
    if (mode === 'dip') return dipWide ? null : lastShot;
    return mode === 'still' ? 'glass' : null;
  },
  // Seconds since the pick.
  get time(): number { return seq.total; },
  // True while the picture runs on the film beat.
  // That is the shots and the dip down.
  get film(): boolean { return mode === 'cuts' || (mode === 'dip' && !dipWide); },
  // The loop hands over the catalog once it loads.
  setStars(s: readonly Star[]): void { stars = s; },
  // Starts the sequence.
  // phase: the machine's phase after the pick.
  // An open shutter starts with the lift shot.
  // v: the tube and its lift.
  // target: the picked star.
  // d: the dome the cuts show; the main dome by default.
  start(phase: Phase, v: View, target: AltAz, d: Dome = complex.main): void {
    // The old dome's model goes before the dome changes.
    swap(false);
    dome = d;
    heroNow = hero.of(d);
    d.root.updateMatrixWorld(true);
    d.cupola.getWorldPosition(centre);
    R = DOME_R1 * d.root.scale.x;
    setBoxes();
    view = v;
    // The reflector adds the mirror shot.
    seq = startSeq(phase, v, heroReady() && !!heroScope()?.restGlass);
    // Reduced motion waits in the wide shot until the tube rests.
    mode = reduced() ? 'wait' : 'cuts';
    stillT = 0;
    inT = 0;
    locks.clear();
    useHero = heroReady();
    cutShot = null;
    heroScope()?.setTarget(altAzDir(target), TARGET_K);
  },
  // A tap or Esc: straight to the wide shot.
  skip(): void {
    // A skip in the dip lands on the wide shot at once.
    if (mode === 'cuts' || mode === 'dip' || mode === 'wait') { seq = skipSeq(seq); toWide(); }
    else if (mode === 'still') startFade();
    else return;
    redraw();
  },
  // The loop sets this hook: it marks the frame dirty and wakes.
  onSkip(fn: () => void): void { redraw = fn; },
  // v: the tube and its lift now.
  step(dt: number, v: View): void {
    if (mode === 'off') return;
    view = v;
    if (mode === 'cuts') {
      inT += dt;
      seq = stepSeq(seq, dt, v);
      if (seq.done) {
        lastShot = seq.shot;
        mode = 'dip';
        dipT = 0; dipWide = false;
        stepDip(0);
      }
    } else if (mode === 'dip') stepDip(dt);
    else if (mode === 'wait') {
      // The still shows the settled glass in the open slit.
      if (v.altLeft <= 0 && v.shutter >= 1) { mode = 'still'; stillT = 0; }
    } else if (mode === 'still') {
      stillT += dt;
      if (stillT >= STILL_S) startFade();
    } else if (mode === 'fade' && !grab) {
      fadeT += dt;
      const k = Math.min(1, fadeT / FADE_S);
      still.style.opacity = String(1 - ease(k));
      showBars(true, 1 - ease(k));
      if (k >= 1) toWide();
    }
  },
  // Sets the camera for the current shot. The loop calls it before each render.
  frame(): void {
    // A pick dips to black first.
    // The wide shot fades down, then the first shot comes up.
    const inDown = mode === 'cuts' && inT < DIP_DOWN;
    const close = (mode === 'cuts' && !inDown) || mode === 'still' || (mode === 'dip' && !dipWide) || (mode === 'fade' && grab);
    // The dip holds the last cut until the frame is black.
    // The reduced-motion still is the glass shot.
    const shot: Shot = mode === 'cuts' ? seq.shot : mode === 'dip' ? lastShot : 'glass';
    // A new cut is a hard cut, so the model may change there.
    // The choice waits for the cut's first close frame, after the dip.
    if (close && mode === 'cuts' && shot !== cutShot) { cutShot = shot; useHero = heroReady(); }
    // The swap happens in the frame that changes the shot.
    swap(close ? useHero : held && heroReady());
    feedGlass(close ? useHero : held);
    // The close shots come after a pick, so the beam leaves the hero's laser.
    const sc = heroScope();
    if (close && heroOn && sc) laser.foot(sc.laserMouth(mouthAt));
    rendered = close ? shot : null;
    if (!close) {
      starLift(false);
      cutFocus(null);
      cutGrain(0);
      cutMist(true);
      if (inDown) black((inT / DIP_DOWN) ** 2);
      return;
    }
    const s = locks.of(cutOf(shot));
    // Only the mirror shot lifts the stars.
    starLift(!!s.mirror);
    if (s.mirror) mirrorEye(s, view, mode === 'cuts' ? seq.t : MIRROR_PUSH);
    else if (s.glass) glassEye(s, view);
    // The projection follows the canvas, so a resize never stretches the frame.
    // The film lens fills the band between the bars.
    applyShot(camera.aspect, s.eye, s.aim, renderFov(s.fov, camera.aspect));
    cutFocus(s);
    cutMist(!INDOOR.has(shot));
    // The dip fades down to black, and the cuts' grain eases back.
    if (mode === 'dip') { const k = Math.min(1, dipT / DIP_DOWN); black(k * k); cutGrain(1 - k); }
    else cutGrain(1);
    // The first shot fades up from the black.
    // The camera and the hero swapped under it.
    if (mode === 'cuts' && inT < DIP_DOWN + DIP_UP + 0.1) black((1 - Math.min(1, (inT - DIP_DOWN) / DIP_UP)) ** 2);
    beam(false);
    showBars(true);
  },
  // Fades the older beat as the next comes due.
  // k: the share of the beat gone, 0 to 1.
  blend(k: number): void {
    if (blending) beats[beatN % 2].style.opacity = String(Math.max(0, 1 - k));
  },
  // QA: keeps the hero model in outside the cuts, for stills.
  // The beam hides as in the close shots.
  hold(on: boolean): void { held = on; beam(!on); },
  // Copies the last close frame onto the still, then shows the wide shot under it.
  afterRender(): void {
    // A film beat is kept for the blend.
    const film = mode === 'cuts' || (mode === 'dip' && !dipWide);
    if (rendered && film && !reduced()) keepBeat(rendered);
    else if (beatN) dropBeats();
    if (!grab) return;
    grab = false;
    const c = renderer.domElement;
    still.width = c.width; still.height = c.height;
    still.getContext('2d')!.drawImage(c, 0, 0);
    still.style.opacity = '1';
    still.style.display = 'block';
    beam(true);
    applyCamera(camera.aspect);
  },
};

/* ---------- the Dev camera, ?dev ---------- */
// The Dev rows edit the shot that shows, live.
// eye and look are in the slit's frame, in cupola radii: f, r, u.
// The glass shot takes only its lens.
export type CamKey = 'ex' | 'ey' | 'ez' | 'lx' | 'ly' | 'lz' | 'fov' | 'blur';
export const camDev = {
  // The values of a shot, for the rows.
  get(shot: Shot): Partial<Record<CamKey, number>> {
    const fov = cutOf(shot).fov;
    if (shot === 'glass' || shot === 'mirror') return { fov };
    const p = planOf(shot);
    return { ex: p.eye[0], ey: p.eye[1], ez: p.eye[2], lx: p.look[0], ly: p.look[1], lz: p.look[2], fov, blur: p.aperture };
  },
  // Sets one value; the shot re-locks its camera on the next frame.
  set(shot: Shot, key: CamKey, v: number): void {
    if (key === 'fov') cutOf(shot).fov = v;
    else if (shot !== 'glass' && shot !== 'mirror') {
      const p = planOf(shot);
      if (key === 'blur') p.aperture = v;
      else (key[0] === 'e' ? p.eye : p.look)['xyz'.indexOf(key[1])] = v;
    } else return;
    locks.clear();
  },
  // The shot's lines for PLANS and CUTS, to paste into the code.
  line(shot: Shot): string {
    const r = (n: number): number => Math.round(n * 1000) / 1000;
    const pt = (a: Point): string => `[${a.map(r).join(', ')}]`;
    const c = cutOf(shot);
    const cut = `{ shot: '${shot}', fov: ${r(c.fov)}, phase: '${c.phase}' },`;
    if (shot === 'glass' || shot === 'mirror') return cut;
    const p = planOf(shot);
    const tall = p.tall ? `, tall: ${pt(p.tall)}` : '';
    const inside = p.inside ? ', inside: true' : '';
    return `${shot}: { eye: ${pt(p.eye)}, look: ${pt(p.look)}${tall}${inside}, aperture: ${r(p.aperture)} },\n${cut}`;
  },
};

// Esc during the cuts goes straight to the wide shot.
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cuts.showing) cuts.skip(); });
