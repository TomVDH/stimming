// Load order: input runs first.
import './input.ts';
import { whenVisible } from '../../shared/stim.js';
import type { AltAz } from './core/sky.ts';
import { azDelta, clampAim, stepAxis } from './core/dome.ts';
import { camera, renderer, scene, stageEl } from './setup.ts';
import { TUBE_PARK_ALT, TUBE_REST_ALT, type Dome } from './world/observatory.ts';
import { complex } from './world/complex.ts';
import { altAzDir, laser } from './world/laser.ts';
import { trackingLamp } from './world/lamp.ts';
import { makeMachine } from './core/machine.ts';
import { pickStar } from './core/pick.ts';
import { applyCamera, type View } from './view/camera.ts';
import { onAim, onTap } from './input.ts';
import { makeClock } from './core/clock.ts';
import { sky, skyAt, skyReady, starAltAz, LAT, LON } from './sky/stars.ts';
import { lst, toAltAz } from './core/sky.ts';
import type { Star } from './core/catalog.ts';

/* ---------- frame loop: it runs while a dome turns or input is fresh ---------- */
// The loop sleeps 60 s after the last input.
const SLEEP = 60000;

// The beam's aim; every dome turns after its azimuth.
const aim: AltAz = { alt: 16, az: 172 };
// The machine owns the main dome: cupola, tube and shutter. It starts shut.
const machine = makeMachine({ az: aim.az });
// The small domes start 1.5 s and 3 s after the leader, and turn slower.
// In aim the leader is the beam; after a pick it is the main dome's cupola.
type Turn = { dome: Dome; pos: number; vel: number; cap: number; accel: number; delay: number; open: number };
const turns: Turn[] = [
  { dome: complex.small[0], pos: aim.az, vel: 0, cap: 2.5, accel: 1.2, delay: 1.5, open: 1 },
  { dome: complex.small[1], pos: aim.az, vel: 0, cap: 2, accel: 1, delay: 3, open: 1 },
];
// Recent leader azimuths, so a late dome can read the leader of 3 s ago.
const seen: { t: number; az: number }[] = [{ t: -Infinity, az: aim.az }];
// While tracking, the loop redraws this often, so the tube creeps with the sky.
const TRACK_REDRAW_MS = 3000;
let lastTrackDraw = 0;
// The sky clock: real time at speed 1. At speed 1 the sky moves 0.004 degrees a second,
// so it never keeps the loop awake; only a wake catch-up or a faster speed does.
const clock = makeClock(Date.now);
let raf = 0, lastT = 0, lastInput = -Infinity, visible = true, dirty = true, frames = 0;

// The aim azimuth as it was some seconds ago.
function azAgo(now: number, s: number): number {
  for (let i = seen.length - 1; i >= 0; i--) if (seen[i].t <= now - s * 1000) return seen[i].az;
  return seen[0].az;
}
// The leader's azimuth: the beam in aim, the main cupola after a pick.
const leaderAz = () => (machine.phase === 'aim' ? aim.az : machine.cupolaAz);
const turning = () => machine.moving || turns.some(d => d.vel !== 0 || azDelta(d.pos, leaderAz()) !== 0);
// Where the target stands now.
const targetPos = (s: Star): AltAz => toAltAz(s.ra, s.dec, lst(clock.skyMs(), LON), LAT);
const skyMoving = () => clock.easing() || clock.speed > 1;

function pose(): void {
  skyAt(clock.skyMs());
  for (const d of turns) {
    d.dome.setCupola(d.pos);
    // A shut dome parks its tube low, under the shutter.
    d.dome.setTube({ alt: d.open >= 1 ? TUBE_REST_ALT : TUBE_PARK_ALT, az: d.pos });
    d.dome.setShutter(d.open);
  }
  const m = machine;
  complex.main.setCupola(m.cupolaAz);
  complex.main.setTube({ alt: m.tubeAlt, az: m.tubeAz });
  complex.main.setShutter(m.shutter01);
  trackingLamp.set(m.tracking);
  // The beam follows the pointer in aim; after a pick it follows the tube.
  laser.aim(complex.main.slitTop, m.phase === 'aim' || m.phase === 'lost' ? aim : { alt: m.tubeAlt, az: m.tubeAz });
}

export function draw(): void {
  pose();
  renderer.render(scene, camera);
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
  clock.step(dt);
  if (skyMoving()) dirty = true;
  // The machine reads the sky as it is now.
  const tp = machine.target ? targetPos(machine.target) : { alt: 0, az: 0 };
  const before = machine.phase;
  machine.step(dt, { targetAlt: tp.alt, targetAz: tp.az, trails: clock.trails(), aimAz: aim.az });
  if (machine.moving || machine.phase !== before) dirty = true;
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
  if (turning() || skyMoving() || machine.phase === 'open' || performance.now() - lastInput < SLEEP) raf = requestAnimationFrame(tick);
  else lastT = 0;
}

export function wake(): void {
  // After a sleep, the sky eases from the old time to the real time.
  clock.wake();
  if (!raf && visible) raf = requestAnimationFrame(tick);
}

function input(a: AltAz): void {
  const c = clampAim(a);
  aim.alt = c.alt; aim.az = c.az;
  lastInput = performance.now();
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

// A tap picks the brightest star within 3 degrees of the tap. An empty patch changes nothing.
function tap(a: AltAz): void {
  const s = pickStar(sky.stars, a, lst(clock.skyMs(), LON), LAT);
  if (!s) return;
  machine.pick(s);
  lastInput = performance.now();
  dirty = true;
  wake();
}
onTap(tap);

// A hidden page stops the loop at once.
whenVisible(stageEl, (vis: boolean) => {
  visible = vis;
  if (!vis) { cancelAnimationFrame(raf); raf = 0; lastT = 0; return; }
  clock.wake();
  draw();
  if (turning() || skyMoving() || machine.phase === 'open' || performance.now() - lastInput < SLEEP) wake();
});

// The catalog arrives after the first frame: draw the stars in.
void skyReady.then(() => draw());

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
  onScreen(n = 8) {
    const out: { hip: number; mag: number; x: number; y: number; alt: number; az: number }[] = [];
    const r = stageEl.getBoundingClientRect();
    for (const s of sky.stars) {
      if (!s.hip || s.mag > 3) continue;
      const p = (window.__qa!.starScreen as (h: number) => { x: number; y: number; alt: number; az: number } | null)(s.hip);
      if (p && p.alt > 8 && p.x > r.left + 20 && p.x < r.right - 20 && p.y > r.top + 20 && p.y < r.bottom - 20) out.push({ hip: s.hip, mag: s.mag, ...p });
    }
    return out.sort((x, y) => x.mag - y.mag).slice(0, n);
  },
  // A star's place on the canvas in CSS pixels, or null when it stands behind the camera.
  starScreen(hip: number) {
    const p = starAltAz(hip, clock.skyMs());
    if (!p) return null;
    const v = altAzDir(p).multiplyScalar(1000).add(camera.position).project(camera);
    if (v.z > 1) return null;
    const r = stageEl.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, alt: p.alt, az: p.az };
  },
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
  shutter(i: number, k: number) { if (i > 0) turns[i - 1].open = k; draw(); },
};
