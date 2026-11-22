// The telescope simulator: drive the tube, look through the eyepiece.
// The view draws on input only; an idle page runs no frame loop.
import { loadStars, type Star } from '../core/catalog.ts';
import { lst } from '../core/sky.ts';
import {
  EYEPIECES, LON, altAzOf, clampPose, eyeXY, frameOf, magnification, dirOf, starAlpha,
  starRGB, starRadius, trueField, type Eyepiece, type Pose,
} from './optics.ts';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`sim: missing #${id}`);
  return el as T;
};

const eye = $<HTMLCanvasElement>('eye');
const ctx = eye.getContext('2d');
const altIn = $<HTMLInputElement>('alt');
const azIn = $<HTMLInputElement>('az');
const eyepieceIn = $<HTMLSelectElement>('eyepiece');
const fovOut = $<HTMLElement>('fov');
const magOut = $<HTMLElement>('mag');
const altOut = $<HTMLElement>('alt-out');
const azOut = $<HTMLElement>('az-out');
const skyOut = $<HTMLElement>('sky');
const countOut = $<HTMLElement>('count');
const failLine = $<HTMLElement>('fail');
const statusLine = $<HTMLElement>('status');

const TAU = Math.PI * 2;
// The field stop's rim, in CSS pixels from the canvas edge.
const RIM = 6;
// Arrow keys move the tube this far in degrees; Shift divides by ten.
const STEP = 1;

let stars: Star[] = [];
let pose: Pose = clampPose(40, 180);
let eyepiece: Eyepiece = EYEPIECES[0];
// The sky's time in ms; set at load and by Now.
let skyMs = Date.now();
let dpr = 1;
let size = 0;

// A star in view, in CSS pixels from the canvas corner.
type Hit = { x: number; y: number; mag: number; rgb: [number, number, number]; label: string };

function sizeCanvas(): void {
  dpr = window.devicePixelRatio || 1;
  size = Math.round(eye.clientWidth);
  eye.width = Math.round(size * dpr);
  eye.height = Math.round(size * dpr);
}

// Shows the pose in the inputs and the readouts.
function syncReadouts(hits: number): void {
  altIn.value = pose.alt.toFixed(1);
  azIn.value = pose.az.toFixed(1);
  altOut.textContent = `${pose.alt.toFixed(1)}°`;
  azOut.textContent = `${pose.az.toFixed(1)}°`;
  fovOut.textContent = `${trueField(eyepiece).toFixed(2)}°`;
  magOut.textContent = `${Math.round(magnification(eyepiece))}×`;
  const hours = lst(skyMs, LON) / 15;
  const h = Math.floor(hours), m = Math.floor((hours - h) * 60);
  skyOut.textContent = `${new Date(skyMs).toLocaleString()} · LST ${h}h ${String(m).padStart(2, '0')}m`;
  countOut.textContent = `${hits} stars in view`;
}

// Draws the eyepiece: the stars inside the field stop, a reticle, the rim.
function draw(): void {
  if (!ctx || !size) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const c = size / 2, R = c - RIM;
  // Half the true field, in degrees: the field stop's radius.
  const half = trueField(eyepiece) / 2;
  const fr = frameOf(pose);
  const L = lst(skyMs, LON);
  const hits: Hit[] = [];
  for (const s of stars) {
    const aa = altAzOf(s, L);
    if (aa.alt < 0) continue;
    const p = eyeXY(dirOf(aa.alt, aa.az), fr, half);
    if (!p) continue;
    const px = p.x, py = p.y;
    if (px * px + py * py > 1.05 * 1.05) continue;
    hits.push({ x: c + px * R, y: c - py * R, mag: s.mag, rgb: starRGB(s.ci), label: s.name || s.bayer });
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.clip();
  for (const h of hits) {
    const [r, g, b] = h.rgb;
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${starAlpha(h.mag)})`;
    ctx.beginPath();
    ctx.arc(h.x, h.y, starRadius(h.mag), 0, TAU);
    ctx.fill();
  }
  // Named stars get a label when they are bright enough.
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(190, 210, 230, 0.8)';
  for (const h of hits) {
    if (!h.label || h.mag > 3.5) continue;
    ctx.fillText(h.label, h.x + 6, h.y - 4);
  }
  // Reticle: a crosshair with a gap at the centre.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(c - R, c); ctx.lineTo(c - 8, c);
  ctx.moveTo(c + 8, c); ctx.lineTo(c + R, c);
  ctx.moveTo(c, c - R); ctx.lineTo(c, c - 8);
  ctx.moveTo(c, c + 8); ctx.lineTo(c, c + R);
  ctx.stroke();
  ctx.restore();

  // The rim of the field stop.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.stroke();
  syncReadouts(hits.length);
}

// Moves the tube to a pose, then redraws.
function setPose(alt: number, az: number): void {
  pose = clampPose(alt, az);
  draw();
}

function nudge(dAlt: number, dAz: number): void {
  setPose(pose.alt + dAlt, pose.az + dAz);
}

// Controls: sliders, nudge buttons, the eyepiece, Now.
altIn.addEventListener('input', () => setPose(Number(altIn.value), pose.az));
azIn.addEventListener('input', () => setPose(pose.alt, Number(azIn.value)));
eyepieceIn.addEventListener('change', () => {
  eyepiece = EYEPIECES[Number(eyepieceIn.value)] ?? EYEPIECES[0];
  draw();
});
$<HTMLButtonElement>('left').addEventListener('click', () => nudge(0, -STEP));
$<HTMLButtonElement>('right').addEventListener('click', () => nudge(0, STEP));
$<HTMLButtonElement>('up').addEventListener('click', () => nudge(STEP, 0));
$<HTMLButtonElement>('down').addEventListener('click', () => nudge(-STEP, 0));
$<HTMLButtonElement>('now').addEventListener('click', () => {
  skyMs = Date.now();
  draw();
});

// Arrow keys nudge the tube; Shift makes the step a tenth.
eye.addEventListener('keydown', (e) => {
  const k = e.shiftKey ? STEP / 10 : STEP;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [0, -k], ArrowRight: [0, k], ArrowUp: [k, 0], ArrowDown: [-k, 0],
  };
  const m = moves[e.key];
  if (!m) return;
  e.preventDefault();
  nudge(m[0], m[1]);
});

// Dragging the eyepiece moves the sky under the pointer.
let drag: { x: number; y: number } | null = null;
eye.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  eye.setPointerCapture(e.pointerId);
});
eye.addEventListener('pointermove', (e) => {
  if (!drag) return;
  // Degrees per CSS pixel at the field stop's rim.
  const perPx = (trueField(eyepiece) / 2) / (size / 2 - RIM);
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag = { x: e.clientX, y: e.clientY };
  // Azimuth steps widen toward the zenith by one over cos(alt).
  const cosAlt = Math.max(0.2, Math.cos(pose.alt * Math.PI / 180));
  setPose(pose.alt + dy * perPx, pose.az - (dx * perPx) / cosAlt);
});
const endDrag = (): void => { drag = null; };
eye.addEventListener('pointerup', endDrag);
eye.addEventListener('pointercancel', endDrag);
eye.addEventListener('lostpointercapture', endDrag);

window.addEventListener('resize', () => {
  sizeCanvas();
  draw();
});

// The brightest star the tube can reach at the sky's time.
// The first view then holds a star, as after a pick.
function brightestPose(): Pose | null {
  const L = lst(skyMs, LON);
  let best: Pose | null = null, mag = Infinity;
  for (const s of stars) {
    if (s.mag >= mag) continue;
    const aa = altAzOf(s, L);
    if (aa.alt < 20 || aa.alt > 80) continue;
    best = aa;
    mag = s.mag;
  }
  return best;
}

// Starts the catalog and the first frame.
async function boot(): Promise<void> {
  sizeCanvas();
  stars = await loadStars(new URL('../../stars.bin', import.meta.url).href);
  statusLine.hidden = true;
  const p = brightestPose();
  if (p) pose = clampPose(p.alt, p.az);
  draw();
}

boot().catch((err: unknown) => {
  console.error(err);
  failLine.hidden = false;
  failLine.textContent = 'Telescope simulator could not start.';
});
