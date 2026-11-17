// Load order: input runs first.
import './input.ts';
import { whenVisible } from '../../shared/stim.js';
import type { AltAz } from './core/sky.ts';
import { azDelta, clampAim, stepAxis } from './core/dome.ts';
import { camera, renderer, scene, stageEl } from './setup.ts';
import { obs, TUBE_REST_ALT } from './world/observatory.ts';
import { laser } from './world/laser.ts';
import { applyCamera, type View } from './view/camera.ts';
import { onAim, onTap } from './input.ts';

/* ---------- frame loop: it runs while the cupola turns or input is fresh ---------- */
// The cupola turns at 3 degrees a second at most and eases in and out.
const CUP_CAP = 3, CUP_ACCEL = 1.5;
// The loop sleeps 60 s after the last input.
const SLEEP = 60000;

// The beam's aim; the cupola turns after its azimuth.
const aim: AltAz = { alt: 40, az: 165 };
const cup = { pos: aim.az, vel: 0 };
let raf = 0, lastT = 0, lastInput = -Infinity, visible = true, dirty = true, frames = 0;

const turning = () => cup.vel !== 0 || azDelta(cup.pos, aim.az) !== 0;

function pose(): void {
  obs.setCupola(cup.pos);
  // The tube rides in the slit at a rest altitude.
  obs.setTube({ alt: TUBE_REST_ALT, az: cup.pos });
  laser.aim(obs.slitTop, aim);
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
  if (turning()) {
    const s = stepAxis(cup.pos, aim.az, cup.vel, dt, CUP_CAP, CUP_ACCEL, true);
    cup.pos = s.pos; cup.vel = s.vel;
    dirty = true;
  }
  if (dirty) draw();
  if (turning() || performance.now() - lastInput < SLEEP) raf = requestAnimationFrame(tick);
  else lastT = 0;
}

export function wake(): void {
  if (!raf && visible) raf = requestAnimationFrame(tick);
}

function input(a: AltAz): void {
  const c = clampAim(a);
  aim.alt = c.alt; aim.az = c.az;
  lastInput = performance.now();
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
  draw();
  if (turning() || performance.now() - lastInput < SLEEP) wake();
});

// Test hooks for QA scripts.
declare global { interface Window { __qa?: Record<string, unknown> } }
window.__qa = {
  get running() { return raf !== 0; },
  get frames() { return frames; },
  get cupola() { return { ...cup }; },
  get aim() { return { ...aim }; },
  // A test view; a resize restores the default.
  look(v: View) { const c = renderer.domElement; applyCamera(c.width / c.height, v); draw(); },
  shutter(k: number) { obs.setShutter(k); draw(); },
};
