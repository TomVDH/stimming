// Load order: input runs first.
import './input.ts';
import { reduced, whenVisible } from '../../shared/stim.js';
import type { AltAz } from './core/sky.ts';
import {
  atRest, azDelta, clampAim, makeAxis, makeShutter, shutterAtRest, stepAxis, stepShutter,
  type Axis, type Limits, type Shutter,
} from './core/dome.ts';
import { Vector3 } from 'three';
import { camHooks, camera, renderer, stageEl, ui } from './setup.ts';
import { renderPost } from './post/chain.ts';
import { TUBE_PARK_ALT, TUBE_REST_ALT, type Dome } from './world/observatory.ts';
import { complex } from './world/complex.ts';
import { altAzDir, laser } from './world/laser.ts';
import { trackingLamp } from './world/lamp.ts';
import { lights } from './world/lights.ts';
import { LIFT_AT, TUBE_CLEAR_ALT, makeMachine } from './core/machine.ts';
import { pickStar } from './core/pick.ts';
import { CUT_FPS, cadence, lightGoal, lightLevel } from './core/sequence.ts';
import { WIDE, applyCamera, eyeAt, type View } from './view/camera.ts';
import { camDev, cuts, type CamKey } from './view/cuts.ts';
import type { Shot } from './core/sequence.ts';
import { hero } from './world/hero.ts';
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
// The ?dev shot replay builds a fresh machine, so this is let.
let machine = makeMachine({ az: REST_AZ });
// The small domes start 1.5 s and 3 s after the leader.
// In aim the leader is the beam; after a pick it is the main dome's cupola.
// They rest shut, open that long after a pick, and shut that long after aim.
// They are as heavy as the main dome, and slower still.
// ax: the cupola's axis.
// sh: the shutter, which takes as long as the main one.
// alt: the tube's altitude, parked low as the main tube.
type Turn = { dome: Dome; ax: Axis; lim: Limits; delay: number; sh: Shutter; alt: Axis };
const turns: Turn[] = [
  { dome: complex.small[0], ax: makeAxis(REST_AZ), lim: { cap: 1.6, accel: 0.45, wrap: true }, delay: 1.5, sh: makeShutter(0), alt: makeAxis(TUBE_PARK_ALT) },
  { dome: complex.small[1], ax: makeAxis(REST_AZ), lim: { cap: 1.3, accel: 0.4, wrap: true }, delay: 3, sh: makeShutter(0), alt: makeAxis(TUBE_PARK_ALT) },
];
// A small tube lifts and lowers slower than the main tube.
const SMALL_TUBE: Limits = { cap: 1.2, accel: 0.4, wrap: false };
// The small shutters want open after a pick.
// Each dome reads the wish as it was its delay ago.
// The histories keep one entry older than the longest delay.
const KEEP_MS = Math.max(...turns.map(d => d.delay)) * 1000;
const wishes: { t: number; open: boolean }[] = [{ t: -Infinity, open: false }];
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
// True while the shared intro shows.
// Once it is gone, the loop stops looking.
let intro = document.querySelector('.intro') !== null;
// True once a frame shows the night look after the opening.
let nightSet = false;
// The cuts' film beat.
const film = { acc: 1 / CUT_FPS };
let raf = 0, lastT = 0, lastInput = -Infinity, visible = true, dirty = true, frames = 0;
// Draws so far, for QA: a slow track draws every few seconds.
let draws = 0;

// The aim azimuth as it was some seconds ago.
function azAgo(now: number, s: number): number {
  for (let i = seen.length - 1; i >= 0; i--) if (seen[i].t <= now - s * 1000) return seen[i].az;
  return seen[0].az;
}
// The small shutters' wish as it was some seconds ago.
function wishAgo(now: number, s: number): boolean {
  for (let i = wishes.length - 1; i >= 0; i--) if (wishes[i].t <= now - s * 1000) return wishes[i].open;
  return wishes[0].open;
}
// The leader's azimuth: the beam in aim, the main cupola after a pick.
const leaderAz = () => (machine.phase === 'aim' && aimed ? aim.az : machine.cupolaAz);
// A small shutter still has a way to go.
const shutting = () => turns.some(d => !shutterAtRest(d.sh) || d.sh.p !== (wishes[wishes.length - 1].open ? 1 : 0));
const turning = () => machine.moving || shutting()
  || turns.some(d => !atRest(d.ax) || !atRest(d.alt) || azDelta(d.ax.pos, leaderAz()) !== 0);
// The cuts, the crossfade or the lights still need frames.
const showing = () => cuts.busy || light !== lightGoal(machine.phase);
const awake = () => !opening.done || turning() || skyMoving() || showing() || performance.now() - lastInput < SLEEP;
// Where the target stands now.
const targetPos = (s: Star): AltAz => toAltAz(s.ra, s.dec, lst(clock.skyMs(), LON), LAT);
// What the pick sequence reads: the tube and its lift.
const liftView = () => ({
  altLeft: machine.altLeft(), altEta: machine.altEta(), tubeAlt: machine.tubeAlt, tubeAz: machine.tubeAz,
  restAlt: machine.target ? targetPos(machine.target).alt : machine.tubeAlt, shutter: machine.shutter01,
  cupAz: machine.cupolaAz, cupGoal: machine.target ? targetPos(machine.target).az : machine.cupolaAz,
});
const skyMoving = () => clock.easing() || clock.speed > 1;

// The laser's mouth, reused each frame.
const mouth = new Vector3();
function pose(): void {
  skyAt(clock.skyMs());
  for (const d of turns) {
    d.dome.setCupola(d.ax.pos);
    // The models never see a tube under its park.
    d.dome.setTube({ alt: Math.max(TUBE_PARK_ALT, d.alt.pos), az: d.ax.pos });
    d.dome.setShutter(d.sh.value);
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
  // After a pick it leaves the laser on the tube.
  const free = m.phase === 'aim' || m.phase === 'lost';
  laser.aim(free ? complex.main.slitTop : complex.main.laserMouth(mouth), free ? aim : { alt: m.tubeAlt, az: m.tubeAz });
}

export function draw(): void {
  pose();
  // A close shot sets the camera after the pose, so it can frame the tube.
  cuts.frame();
  renderPost();
  cuts.afterRender();
  dirty = false;
  draws++;
}

function tick(now: number): void {
  raf = 0;
  if (!visible) { lastT = 0; return; }
  // A pause stops the loop; the resume frame steps by 0.
  if (paused) { lastT = 0; return; }
  frames++;
  // A long gap, such as a background tab, counts as 0.1 s.
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
  lastT = now;
  // Input times come from the same clock.
  const t = performance.now();
  // The opening starts when the shared intro ends.
  // The shell removes the .intro element then.
  if (intro) intro = document.querySelector('.intro') !== null;
  if (!opening.done && !intro) {
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
  cuts.step(dt, liftView());
  if (cuts.busy) dirty = true;
  if (pauseBtn) pauseBtn.hidden = !cuts.showing;
  camRows();
  const lv = lightLevel(machine.phase, light, dt);
  if (lv !== light) { light = lv; dirty = true; }
  // The small shutters follow the main dome after their delays.
  const want = machine.phase !== 'aim';
  if (want !== wishes[wishes.length - 1].open) {
    wishes.push({ t, open: want });
    // Keep one wish older than the longest delay.
    while (wishes.length > 1 && wishes[1].t <= t - KEEP_MS) wishes.shift();
  }
  for (const d of turns) {
    const open = wishAgo(t, d.delay);
    // The shutter stays open until the tube clears it.
    const goal = open || d.alt.pos >= TUBE_CLEAR_ALT ? 1 : 0;
    if (!shutterAtRest(d.sh) || d.sh.p !== goal) {
      // A shutter that turns back mid-way runs down first.
      stepShutter(d.sh, goal, dt);
      dirty = true;
    }
    // The tube lifts from the half-open shutter, and parks low in aim.
    const lift = open && d.sh.value >= LIFT_AT ? TUBE_REST_ALT : TUBE_PARK_ALT;
    if (!atRest(d.alt) || d.alt.pos !== lift) {
      stepAxis(d.alt, lift, dt, SMALL_TUBE);
      dirty = true;
    }
  }
  // A slow track draws every few seconds, not every frame.
  if (machine.phase === 'track' && t - lastTrackDraw > TRACK_REDRAW_MS) dirty = true;
  if (dirty) lastTrackDraw = t;
  // The small domes follow the leader.
  const lead = leaderAz();
  if (lead !== seen[seen.length - 1].az) {
    seen.push({ t, az: lead });
    while (seen.length > 1 && seen[1].t <= t - KEEP_MS) seen.shift();
  }
  for (const d of turns) {
    const target = azAgo(t, d.delay);
    if (atRest(d.ax) && azDelta(d.ax.pos, target) === 0) continue;
    stepAxis(d.ax, target, dt, d.lim);
    dirty = true;
  }
  // The cuts render on a 30 fps beat.
  // The machine, the clock and the cuts stepped above, on real time.
  if (dirty) {
    // Outside the cuts the beat stands primed.
    // So a cut's first frame renders at once.
    if (!cuts.film) { film.acc = 1 / CUT_FPS; draw(); }
    else if (cadence(film, dt)) draw();
  }
  // Between beats, the older beat fades out over the newer one.
  if (cuts.film) cuts.blend(film.acc * CUT_FPS);
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
    while (seen.length > 1 && seen[1].t <= lastInput - KEEP_MS) seen.shift();
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
  // The ?dev shot replay starts again from this state.
  if (from === 'aim' || from === 'lost') pickStart = { az: machine.cupolaAz, shutter: machine.shutter01, star: s };
  machine.pick(s);
  // An open shutter plays only the slew cuts.
  if (from === 'aim' || from === 'lost') cuts.start(machine.phase, liftView(), targetPos(s));
  lastInput = performance.now();
  dirty = true;
  wake();
}
function skipOpening(): void {
  if (opening.skip()) wake();
}
onEsc(() => { if (opening.locked) skipOpening(); });
// A skip by tap or Esc draws the wide shot on the next frame.
// A skip also ends a pause.
cuts.onSkip(() => { setPaused(false); dirty = true; wake(); });

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
// The hero's glass takes the catalog too.
void skyReady.then(() => { cuts.setStars(sky.stars); draw(); });

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
// minAlt: the lowest altitude in degrees a star may stand at.
function brightOnScreen(n: number, minAlt = 8): { star: Star; x: number; y: number; alt: number; az: number }[] {
  const out: { star: Star; x: number; y: number; alt: number; az: number }[] = [];
  const r = stageEl.getBoundingClientRect();
  for (const s of sky.stars) {
    if (!s.hip || s.mag > 3) continue;
    const p = starScreen(s.hip);
    if (p && p.alt > minAlt && p.x > r.left + 20 && p.x < r.right - 20 && p.y > r.top + 20 && p.y < r.bottom - 20) out.push({ star: s, ...p });
  }
  return out.sort((x, y) => x.star.mag - y.star.mag).slice(0, n);
}

// The brightest catalog star of the southern sky now.
// It stands at azimuth 100 to 260 and altitude 35 to 70.
function brightestSouth(): Star | null {
  let best: Star | null = null;
  for (const s of sky.stars) {
    if (!s.hip || (best && s.mag >= best.mag)) continue;
    const p = targetPos(s);
    if (p.az >= 100 && p.az <= 260 && p.alt >= 35 && p.alt <= 70) best = s;
  }
  return best;
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
    // The shutter is shut once its bounce at the stop ends.
    // The tube parks too.
    // So the replay lifts as far as the first run.
    if (machine.shutter01 > 0 || !shutterAtRest(machine.shutter) || machine.altLeft() > 0) { setTimeout(replay, 100); return; }
    shutting = false;
    if (star) play(star);
  };
  reviewTap = () => {
    if (!star) return false;
    if (!shutting) { shutting = true; machine.shut(); dirty = true; wake(); replay(); }
    return true;
  };
  // The first pick waits for the hero, so the first cut shows it.
  // The wait ends after HERO_WAIT_MS anyway.
  const HERO_WAIT_MS = 8000, REVIEW_ALT = 35, t0 = performance.now();
  const first = (): void => {
    if (!hero.ready && performance.now() - t0 < HERO_WAIT_MS) { setTimeout(first, 100); return; }
    // A tap before the first pick keeps its own star.
    // With no bright star on screen, the review takes the south's brightest.
    // The review's star stands at least REVIEW_ALT high, so the tube's lift reads.
    star = machine.target ?? brightOnScreen(1, REVIEW_ALT)[0]?.star ?? brightestSouth();
    if (star && !machine.target) play(star);
  };
  void skyReady.then(() => setTimeout(first, 1000));
}
if (REVIEW) review();

/* ---------- the dev pause, ?dev ---------- */
// A button in the middle of the stage pauses the cuts.
// It shows only with ?dev, and only while the cuts show.
// The pause freezes the machine and the cuts, so the shot holds.
let paused = false;
const DEV = new URLSearchParams(location.search).has('dev');
const pauseBtn = DEV ? document.createElement('button') : null;
function setPaused(on: boolean): void {
  if (paused === on) return;
  paused = on;
  if (pauseBtn) {
    pauseBtn.textContent = on ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(on));
  }
  syncStrip();
  if (!on) wake();
}

/* ---------- the shot replay, ?dev ---------- */
// The state at the last pick from rest: cupola, shutter, star.
let pickStart: { az: number; shutter: number; star: Star } | null = null;
// The fast-forward steps at this rate and stops after REPLAY_MAX_S.
const REPLAY_DT = 1 / 60, REPLAY_MAX_S = 60;
// Replays the cuts from one shot's start.
// A fresh machine at the pick's state picks the same star again.
// The machine and the cuts then run unseen to the shot.
// The small domes and the sky do not take part.
// A pause holds: the shot's first frame shows, and Play runs it.
function replayShot(shot: Shot): void {
  if (!pickStart) return;
  const { az, shutter, star } = pickStart, held = paused;
  cuts.skip();
  machine = makeMachine({ az, shutter01: shutter });
  pick(star);
  for (let i = 0; i < REPLAY_MAX_S / REPLAY_DT && cuts.shot !== shot; i++) {
    const tp = targetPos(star);
    machine.step(REPLAY_DT, { targetAlt: tp.alt, targetAz: tp.az, trails: false });
    cuts.step(REPLAY_DT, liftView());
  }
  setPaused(held);
  camShot = null;
  camRows();
  dirty = true;
  draw();
  wake();
}

/* ---------- the Dev camera rows, ?dev ---------- */
// The rows edit the shot that shows, and the frame redraws at once.
// A new shot sets the rows to its values.
let camShot: Shot | null = null;
const CAM_KEYS: CamKey[] = ['ex', 'ey', 'ez', 'lx', 'ly', 'lz', 'fov', 'blur'];
function camRows(): void {
  const shot = cuts.showing ? cuts.shot : null;
  if (!DEV || shot === camShot) return;
  camShot = shot;
  if (!shot) return;
  ui.setting('cam-shot')?.set(shot);
  syncStrip();
  const v = camDev.get(shot);
  for (const k of CAM_KEYS) {
    const h = ui.setting(`cam-${k}`);
    if (!h) continue;
    // The glass shot takes only its lens.
    h.disabled = v[k] === undefined;
    if (v[k] !== undefined) h.set(v[k]);
  }
}
camHooks.set = (key, v) => {
  if (!camShot) return;
  camDev.set(camShot, key as CamKey, v);
  draw();
};
// A pick in the Shot row replays the cuts from that shot's start.
camHooks.shot = (shot) => replayShot(shot as Shot);
camHooks.copy = () => {
  if (!camShot) return;
  const text = camDev.line(camShot);
  console.info(text);
  void navigator.clipboard?.writeText(text).catch(() => {});
};
if (pauseBtn) {
  pauseBtn.type = 'button';
  pauseBtn.className = 'cut-pause';
  pauseBtn.textContent = 'Pause';
  pauseBtn.setAttribute('aria-pressed', 'false');
  pauseBtn.hidden = true;
  // The stage takes a press as a tap, and a tap skips the cuts.
  pauseBtn.addEventListener('pointerdown', e => e.stopPropagation());
  pauseBtn.addEventListener('pointerup', e => e.stopPropagation());
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  stageEl.append(pauseBtn);
}

/* ---------- DEV COMPOSITING STRIP: temporary, strip with .dev-shots in index.html ---------- */
// A row over the bar: previous, shots 1 to 5, next, replay, pause.
// A shot button replays the cuts from that shot's start.
const SHOTS: Shot[] = ['edge', 'slit', 'lift', 'roll', 'glass', 'mirror'];
// The shot the strip last showed or replayed.
let stripShot: Shot = 'edge';
const strip = DEV ? document.createElement('div') : null;
const stripBtns: HTMLButtonElement[] = [];
let stripPause: HTMLButtonElement | null = null;
function syncStrip(): void {
  if (!strip) return;
  if (camShot) stripShot = camShot;
  stripBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(SHOTS[i] === stripShot && camShot !== null)));
  if (stripPause) stripPause.textContent = paused ? 'Play' : 'Pause';
}
if (strip) {
  strip.className = 'dev-shots';
  const add = (text: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', fn);
    strip.append(b);
    return b;
  };
  const go = (shot: Shot): void => { stripShot = shot; replayShot(shot); };
  const step = (d: number): void => go(SHOTS[(SHOTS.indexOf(stripShot) + d + SHOTS.length) % SHOTS.length]);
  add('◀', () => step(-1));
  SHOTS.forEach((s, i) => stripBtns.push(add(String(i + 1), () => go(s))));
  add('▶', () => step(1));
  add('Replay', () => go(stripShot));
  stripPause = add('Pause', () => setPaused(!paused));
  stageEl.append(strip);
  syncStrip();
}

// Test hooks for QA scripts.
declare global { interface Window { __qa?: Record<string, unknown> } }
window.__qa = {
  get running() { return raf !== 0; },
  get frames() { return frames; },
  get draws() { return draws; },
  // Dome 0 is the main dome, read from the machine.
  // vel: the cupola's speed on screen.
  get domes() {
    return [{ pos: machine.cupolaAz, vel: machine.axes.cupola.vel, open: machine.shutter01 },
      ...turns.map(d => ({ pos: d.ax.pos, vel: d.ax.vel, open: d.sh.value }))];
  },
  // The main dome's axes and shutter: the load's speed, the drive's speed.
  get motion() {
    const a = machine.axes;
    const ax = (x: Axis) => ({ pos: x.pos, vel: x.vel, dvel: x.dvel });
    return { cupola: ax(a.cupola), alt: ax(a.alt), az: ax(a.az), shutter: { ...machine.shutter }, moving: machine.moving };
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
  shutter(i: number, k: number) { if (i > 0) Object.assign(turns[i - 1].sh, makeShutter(k)); draw(); },
  get restAz() { return REST_AZ; },
  get light() { return light; },
  // The sequence: the shot that shows, its time, and true while it owns the camera.
  get cut() { return { shot: cuts.shot, t: cuts.time, busy: cuts.busy }; },
  skipCuts() { cuts.skip(); },
  // QA: the hero model outside the cuts, for stills.
  // false puts the light model back.
  hero(on: boolean) { cuts.hold(on); draw(); },
  // The hero's triangles, draw calls and build time.
  get heroStats() { return hero.stats(); },
  // The shader programs on the GPU: no cut may add one.
  get programs() { return renderer.info.programs?.length ?? 0; },
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
