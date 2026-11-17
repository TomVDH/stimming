// Load order: input runs first.
import './input.ts';
import { whenVisible } from '../../shared/stim.js';
import type { AltAz } from './core/sky.ts';
import { azDelta, clampAim, stepAxis } from './core/dome.ts';
import { camera, renderer, scene, stageEl } from './setup.ts';
import { TUBE_PARK_ALT, TUBE_REST_ALT, type Dome } from './world/observatory.ts';
import { complex } from './world/complex.ts';
import { laser } from './world/laser.ts';
import { applyCamera, type View } from './view/camera.ts';
import { onAim, onTap } from './input.ts';
import { makeClock } from './core/clock.ts';
import { skyAt, skyReady, starAltAz, LAT } from './sky/stars.ts';
import { lst } from './core/sky.ts';

/* ---------- frame loop: it runs while a dome turns or input is fresh ---------- */
// The loop sleeps 60 s after the last input.
const SLEEP = 60000;

// The beam's aim; every dome turns after its azimuth.
const aim: AltAz = { alt: 16, az: 172 };
// The main dome starts at once at 3 degrees a second.
// The small domes start 1.5 s and 3 s later, and turn slower.
type Turn = { dome: Dome; pos: number; vel: number; cap: number; accel: number; delay: number; open: number };
const turns: Turn[] = [
  { dome: complex.main, pos: aim.az, vel: 0, cap: 3, accel: 1.5, delay: 0, open: 1 },
  { dome: complex.small[0], pos: aim.az, vel: 0, cap: 2.5, accel: 1.2, delay: 1.5, open: 1 },
  { dome: complex.small[1], pos: aim.az, vel: 0, cap: 2, accel: 1, delay: 3, open: 1 },
];
// Recent aim azimuths, so a late dome can read the aim of 3 s ago.
const seen: { t: number; az: number }[] = [{ t: -Infinity, az: aim.az }];
// The sky clock: real time at speed 1. At speed 1 the sky moves 0.004 degrees a second,
// so it never keeps the loop awake; only a wake catch-up or a faster speed does.
const clock = makeClock(Date.now);
let raf = 0, lastT = 0, lastInput = -Infinity, visible = true, dirty = true, frames = 0;

// The aim azimuth as it was some seconds ago.
function azAgo(now: number, s: number): number {
  for (let i = seen.length - 1; i >= 0; i--) if (seen[i].t <= now - s * 1000) return seen[i].az;
  return seen[0].az;
}
const turning = () => turns.some(d => d.vel !== 0 || azDelta(d.pos, aim.az) !== 0);
const skyMoving = () => clock.easing() || clock.speed > 1;

function pose(): void {
  skyAt(clock.skyMs());
  for (const d of turns) {
    d.dome.setCupola(d.pos);
    // A shut dome parks its tube low, under the shutter.
    d.dome.setTube({ alt: d.open >= 1 ? TUBE_REST_ALT : TUBE_PARK_ALT, az: d.pos });
    d.dome.setShutter(d.open);
  }
  laser.aim(complex.main.slitTop, aim);
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
  for (const d of turns) {
    const target = azAgo(t, d.delay);
    if (d.vel === 0 && azDelta(d.pos, target) === 0) continue;
    const s = stepAxis(d.pos, target, d.vel, dt, d.cap, d.accel, true);
    d.pos = s.pos; d.vel = s.vel;
    dirty = true;
  }
  if (dirty) draw();
  if (turning() || skyMoving() || performance.now() - lastInput < SLEEP) raf = requestAnimationFrame(tick);
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
  seen.push({ t: lastInput, az: aim.az });
  // Keep one sample older than the longest delay.
  while (seen.length > 1 && seen[1].t <= lastInput - 3000) seen.shift();
  dirty = true;
  wake();
}
onAim(input);
// A later task picks a star on a tap; for now a tap aims.
onTap(input);

// A hidden page stops the loop at once.
whenVisible(stageEl, (vis: boolean) => {
  visible = vis;
  if (!vis) { cancelAnimationFrame(raf); raf = 0; lastT = 0; return; }
  clock.wake();
  draw();
  if (turning() || skyMoving() || performance.now() - lastInput < SLEEP) wake();
});

// The catalog arrives after the first frame: draw the stars in.
void skyReady.then(() => draw());

// Test hooks for QA scripts.
declare global { interface Window { __qa?: Record<string, unknown> } }
window.__qa = {
  get running() { return raf !== 0; },
  get frames() { return frames; },
  get domes() { return turns.map(d => ({ pos: d.pos, vel: d.vel, open: d.open })); },
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
  shutter(i: number, k: number) { turns[i].open = k; draw(); },
};
