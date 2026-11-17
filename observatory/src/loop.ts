// Load order: input runs first.
import './input.ts';
import { reduced, whenVisible } from '../../shared/stim.js';
import type { AltAz } from './core/sky.ts';
import { azDelta, clampAim, stepAxis } from './core/dome.ts';
import { Vector3 } from 'three';
import { camera, renderer, stageEl } from './setup.ts';
import { renderPost } from './post/chain.ts';
import { TUBE_PARK_ALT, TUBE_REST_ALT, type Dome } from './world/observatory.ts';
import { complex } from './world/complex.ts';
import { altAzDir, laser } from './world/laser.ts';
import { trackingLamp } from './world/lamp.ts';
import { lights } from './world/lights.ts';
import { makeMachine } from './core/machine.ts';
import { pickStar } from './core/pick.ts';
import { lightGoal, lightLevel } from './core/sequence.ts';
import { WIDE, applyCamera, eyeAt, type View } from './view/camera.ts';
import { cuts } from './view/cuts.ts';
import { onAim, onEsc, onTap } from './input.ts';
import { makeClock } from './core/clock.ts';
import { driveClock, makeOpening } from './core/opening.ts';
import { setDusk } from './world/dusk.ts';
import { sky, skyAt, skyReady, starAltAz, LAT, LON } from './sky/stars.ts';
import { lst, toAltAz } from './core/sky.ts';
import type { Star } from './core/catalog.ts';

/* ---------- frame loop: it runs while a dome turns or input is fresh ---------- */
// The loop sleeps 60 s after the last input.
const SLEEP = 60000;

// The beam's aim; every dome turns after its azimuth.
const aim: AltAz = { alt: 16, az: 172 };
// At rest the main dome's shut slit faces the camera.
const mainAt = complex.main.root.getWorldPosition(new Vector3());
const eye = eyeAt(WIDE);
const REST_AZ = (Math.atan2(eye.x - mainAt.x, -(eye.z - mainAt.z)) * 180 / Math.PI + 360) % 360;
// The cupola turns after the beam only once the pointer has moved.
let aimed = false;
// The machine owns the main dome: cupola, tube and shutter. It starts shut.
const machine = makeMachine({ az: REST_AZ });
// The small domes start 1.5 s and 3 s after the leader, and turn slower.
// In aim the leader is the beam; after a pick it is the main dome's cupola.
// They rest shut, open that long after a pick, and shut that long after aim.
// p: shutter progress, 0 to 1; open: the eased shutter.
type Turn = { dome: Dome; pos: number; vel: number; cap: number; accel: number; delay: number; p: number; open: number };
const turns: Turn[] = [
  { dome: complex.small[0], pos: REST_AZ, vel: 0, cap: 2.5, accel: 1.2, delay: 1.5, p: 0, open: 0 },
  { dome: complex.small[1], pos: REST_AZ, vel: 0, cap: 2, accel: 1, delay: 3, p: 0, open: 0 },
];
// A small shutter takes as long as the main one.
const SHUTTER_S = 4;
const ease = (k: number): number => k * k * (3 - 2 * k);
// The small shutters want open after a pick; the time the wish changed.
let wantOpen = false, wantT = 0;
// The complex lights: 1 full, 0.35 dim, 0 off.
let light = 1;
// Recent leader azimuths, so a late dome can read the leader of 3 s ago.
const seen: { t: number; az: number }[] = [{ t: -Infinity, az: REST_AZ }];
// While tracking, the loop redraws this often, so the tube creeps with the sky.
const TRACK_REDRAW_MS = 3000;
let lastTrackDraw = 0;
// The sky clock: real time at speed 1. At speed 1 the sky moves 0.004 degrees a second,
// so it never keeps the loop awake; only a wake catch-up or a faster speed does.
const clock = makeClock(Date.now);
// The review switch, ?cuts: it plays the pick sequence for Tom.
// The page reads it once, at boot.
const REVIEW = new URLSearchParams(location.search).has('cuts');
// The opening: dusk into night before play.
// Reduced motion and the review switch open at night.
const opening = makeOpening(reduced() || REVIEW);
// The sky starts behind real time and runs fast to catch up.
if (!opening.done) driveClock(opening, clock);
// True once a frame shows the night look after the opening.
let nightSet = false;
let raf = 0, lastT = 0, lastInput = -Infinity, visible = true, dirty = true, frames = 0;

// The aim azimuth as it was some seconds ago.
function azAgo(now: number, s: number): number {
  for (let i = seen.length - 1; i >= 0; i--) if (seen[i].t <= now - s * 1000) return seen[i].az;
  return seen[0].az;
}
// The leader's azimuth: the beam in aim, the main cupola after a pick.
const leaderAz = () => (machine.phase === 'aim' && aimed ? aim.az : machine.cupolaAz);
// A small shutter still has a way to go.
const shutting = () => turns.some(d => d.p !== (wantOpen ? 1 : 0));
const turning = () => machine.moving || shutting() || turns.some(d => d.vel !== 0 || azDelta(d.pos, leaderAz()) !== 0);
// The cuts, the crossfade or the lights still need frames.
const showing = () => cuts.busy || light !== lightGoal(machine.phase);
const awake = () => !opening.done || turning() || skyMoving() || showing() || performance.now() - lastInput < SLEEP;
// Where the target stands now.
const targetPos = (s: Star): AltAz => toAltAz(s.ra, s.dec, lst(clock.skyMs(), LON), LAT);
const skyMoving = () => clock.easing() || clock.speed > 1;

function pose(): void {
  skyAt(clock.skyMs());
  for (const d of turns) {
    d.dome.setCupola(d.pos);
    // A shut dome parks its tube low, under the shutter.
    d.dome.setTube({ alt: TUBE_PARK_ALT + (TUBE_REST_ALT - TUBE_PARK_ALT) * d.open, az: d.pos });
    d.dome.setShutter(d.open);
  }
  const m = machine;
  complex.main.setCupola(m.cupolaAz);
  complex.main.setTube({ alt: m.tubeAlt, az: m.tubeAz });
  complex.main.setShutter(m.shutter01);
  trackingLamp.set(m.tracking);
  // The dusk sets the look each frame until night shows once.
  if (!nightSet) {
    setDusk(opening.dusk(), opening.magLimit());
    laser.level(opening.beam());
    nightSet = opening.done;
  }
  // At dusk each lamp comes on alone.
  lights.set(light, opening.done ? undefined : opening.lamp);
  // The beam follows the pointer in aim; after a pick it follows the tube.
  laser.aim(complex.main.slitTop, m.phase === 'aim' || m.phase === 'lost' ? aim : { alt: m.tubeAlt, az: m.tubeAz });
}

export function draw(): void {
  pose();
  // A close shot sets the camera after the pose, so it can frame the tube.
  cuts.frame();
  renderPost();
  cuts.afterRender();
  dirty = false;
}

function tick(now: number): void {
  raf = 0;
  if (!visible) { lastT = 0; return; }
  frames++;
  // A long gap, such as a background tab, counts as 0.1 s.
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
  lastT = now;
  // Input times come from the same clock.
  const t = performance.now();
  if (!opening.done) {
    opening.step(dt);
    driveClock(opening, clock);
    dirty = true;
  }
  clock.step(dt);
  if (skyMoving()) dirty = true;
  // The machine reads the sky as it is now.
  const tp = machine.target ? targetPos(machine.target) : { alt: 0, az: 0 };
  const before = machine.phase;
  machine.step(dt, { targetAlt: tp.alt, targetAz: tp.az, trails: clock.trails(), aimAz: aimed ? aim.az : undefined });
  if (machine.moving || machine.phase !== before) dirty = true;
  cuts.step(dt);
  if (cuts.busy) dirty = true;
  const lv = lightLevel(machine.phase, light, dt);
  if (lv !== light) { light = lv; dirty = true; }
  // The small shutters follow the main dome after their delays.
  const want = machine.phase !== 'aim';
  if (want !== wantOpen) { wantOpen = want; wantT = t; }
  for (const d of turns) {
    const goal = wantOpen ? 1 : 0;
    if (d.p === goal || t - wantT < d.delay * 1000) continue;
    d.p = wantOpen ? Math.min(1, d.p + dt / SHUTTER_S) : Math.max(0, d.p - dt / SHUTTER_S);
    d.open = ease(d.p);
    dirty = true;
  }
  // A slow track draws every few seconds, not every frame.
  if (machine.phase === 'track' && t - lastTrackDraw > TRACK_REDRAW_MS) dirty = true;
  if (dirty) lastTrackDraw = t;
  // The small domes follow the leader.
  const lead = leaderAz();
  if (lead !== seen[seen.length - 1].az) {
    seen.push({ t, az: lead });
    while (seen.length > 1 && seen[1].t <= t - 3000) seen.shift();
  }
  for (const d of turns) {
    const target = azAgo(t, d.delay);
    if (d.vel === 0 && azDelta(d.pos, target) === 0) continue;
    const s = stepAxis(d.pos, target, d.vel, dt, d.cap, d.accel, true);
    d.pos = s.pos; d.vel = s.vel;
    dirty = true;
  }
  if (dirty) draw();
  if (awake()) raf = requestAnimationFrame(tick);
  else lastT = 0;
}

export function wake(): void {
  // After a sleep, the sky eases from the old time to the real time.
  clock.wake();
  if (!raf && visible) raf = requestAnimationFrame(tick);
}

function input(a: AltAz): void {
  // The beam stays off until night.
  if (opening.locked) return;
  lastInput = performance.now();
  // A close shot's camera gives no true aim; the pointer waits for the wide shot.
  if (cuts.busy) { wake(); return; }
  const c = clampAim(a);
  aim.alt = c.alt; aim.az = c.az;
  aimed = true;
  // A lost machine goes back to aim; a picked star keeps its tracking while the pointer moves.
  if (machine.phase === 'lost') machine.release();
  if (machine.phase === 'aim') {
    seen.push({ t: lastInput, az: aim.az });
    // Keep one sample older than the longest delay.
    while (seen.length > 1 && seen[1].t <= lastInput - 3000) seen.shift();
  }
  dirty = true;
  wake();
}
onAim(input);

// The ?cuts review takes a tap after the cuts; it gives true then.
let reviewTap = (): boolean => false;

// A tap picks the brightest star within 3 degrees of the tap. An empty patch changes nothing.
// A tap during the cuts skips to the wide shot and picks nothing.
function tap(a: AltAz): void {
  // A tap at dusk skips to night.
  if (opening.locked) { skipOpening(); return; }
  if (cuts.showing) { lastInput = performance.now(); cuts.skip(); return; }
  if (cuts.busy) return;
  if (reviewTap()) return;
  const s = pickStar(sky.stars, a, lst(clock.skyMs(), LON), LAT);
  if (s) pick(s);
}
onTap(tap);
// A pick from rest or lost plays the cuts; a re-pick only slews.
function pick(s: Star): void {
  const from = machine.phase;
  machine.pick(s);
  // An open shutter plays only the slew cuts.
  if (from === 'aim' || from === 'lost') cuts.start(machine.phase);
  lastInput = performance.now();
  dirty = true;
  wake();
}
function skipOpening(): void {
  if (opening.skip()) wake();
}
onEsc(() => { if (opening.locked) skipOpening(); });
// A skip by tap or Esc draws the wide shot on the next frame.
cuts.onSkip(() => { dirty = true; wake(); });

// A hidden page stops the loop at once.
whenVisible(stageEl, (vis: boolean) => {
  visible = vis;
  if (!vis) { cancelAnimationFrame(raf); raf = 0; lastT = 0; return; }
  // The opening pauses while hidden, but the sky keeps real time.
  // The first frame back shows the sky at its true lag.
  if (!opening.done) driveClock(opening, clock);
  else clock.wake();
  draw();
  if (awake()) wake();
});

// The catalog arrives after the first frame: draw the stars in.
void skyReady.then(() => draw());

// A star's place on the canvas in CSS pixels, or null when it stands behind the camera.
function starScreen(hip: number): { x: number; y: number; alt: number; az: number } | null {
  const p = starAltAz(hip, clock.skyMs());
  if (!p) return null;
  const v = altAzDir(p).multiplyScalar(1000).add(camera.position).project(camera);
  if (v.z > 1) return null;
  const r = stageEl.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, alt: p.alt, az: p.az };
}
// The brightest catalog stars that stand on the canvas now, above 8 degrees.
function brightOnScreen(n: number): { star: Star; x: number; y: number; alt: number; az: number }[] {
  const out: { star: Star; x: number; y: number; alt: number; az: number }[] = [];
  const r = stageEl.getBoundingClientRect();
  for (const s of sky.stars) {
    if (!s.hip || s.mag > 3) continue;
    const p = starScreen(s.hip);
    if (p && p.alt > 8 && p.x > r.left + 20 && p.x < r.right - 20 && p.y > r.top + 20 && p.y < r.bottom - 20) out.push({ star: s, ...p });
  }
  return out.sort((x, y) => x.star.mag - y.star.mag).slice(0, n);
}

/* ---------- the review switch, ?cuts ---------- */
// Tom sees the cuts on the live site with it.
// About 1 s in, it picks the brightest star on screen, as a tap would.
// After the cuts, a tap anywhere shuts the dome.
// Once the shutter is shut, the cuts play again on the same star.
function review(): void {
  let star: Star | null = null, shutting = false;
  // As a tap on the star: the beam aims at it, then the pick.
  const play = (s: Star): void => { input(targetPos(s)); pick(s); };
  const replay = (): void => {
    if (machine.shutter01 > 0) { setTimeout(replay, 100); return; }
    shutting = false;
    if (star) play(star);
  };
  reviewTap = () => {
    if (!star) return false;
    if (!shutting) { shutting = true; machine.shut(); dirty = true; wake(); replay(); }
    return true;
  };
  void skyReady.then(() => setTimeout(() => {
    // A tap before the first pick keeps its own star.
    star = machine.target ?? brightOnScreen(1)[0]?.star ?? null;
    if (star && !machine.target) play(star);
  }, 1000));
}
if (REVIEW) review();

// Test hooks for QA scripts.
declare global { interface Window { __qa?: Record<string, unknown> } }
window.__qa = {
  get running() { return raf !== 0; },
  get frames() { return frames; },
  // Dome 0 is the main dome, read from the machine.
  get domes() {
    return [{ pos: machine.cupolaAz, vel: machine.moving ? 1 : 0, open: machine.shutter01 },
      ...turns.map(d => ({ pos: d.pos, vel: d.vel, open: d.open }))];
  },
  get phase() { return machine.phase; },
  get target() { return machine.target ? (machine.target.name || `HIP ${machine.target.hip}`) : null; },
  get targetHip() { return machine.target?.hip ?? null; },
  get tracking() { return machine.tracking; },
  get tube() { return { alt: machine.tubeAlt, az: machine.tubeAz }; },
  get shutter01() { return machine.shutter01; },
  // The brightest catalog stars that stand on the canvas now.
  onScreen(n = 8) { return brightOnScreen(n).map(({ star, ...p }) => ({ hip: star.hip, mag: star.mag, ...p })); },
  starScreen,
  get aim() { return { ...aim }; },
  get skyMs() { return clock.skyMs(); },
  // A star's alt and az at a sky time, read back through the sky matrix.
  starAltAz(hip: number, ms: number = clock.skyMs()) { return starAltAz(hip, ms); },
  lst(ms: number = clock.skyMs()) { return lst(ms, 0); },
  lat: LAT,
  skyReady,
  // A test view; a resize restores the default.
  look(v: View) { const c = renderer.domElement; applyCamera(c.width / c.height, v); draw(); },
  // Dome i: 0 main, 1 east, 2 roof.
  shutter(i: number, k: number) { if (i > 0) { turns[i - 1].p = k; turns[i - 1].open = ease(k); } draw(); },
  get restAz() { return REST_AZ; },
  get light() { return light; },
  // The sequence: the shot that shows, its time, and true while it owns the camera.
  get cut() { return { shot: cuts.shot, t: cuts.time, busy: cuts.busy }; },
  skipCuts() { cuts.skip(); },
  // The opening's time and state.
  get opening() {
    const o = opening;
    return { t: o.t, locked: o.locked, done: o.done, skipping: o.skipping, sunAlt: o.sunAlt(), mag: o.magLimit(), speed: clock.speed };
  },
  // Puts the opening at a time.
  // The opening then runs on from there.
  seekOpening(s: number) {
    opening.seek(s);
    nightSet = false;
    driveClock(opening, clock);
    draw();
    wake();
  },
};
