// The telescope simulator: drive the tube, look through the eyepiece or the camera.
// The loop runs while input is recent or a measurement runs.
// Then it sleeps.
import { loadStars } from '../core/catalog.ts';
import { lst, shellDir } from '../core/sky.ts';
import { bodiesNear, catalogBodies, galLat, setCatalog, MAG_GEN, type Body } from './field.ts';
import {
  DIFFRACTION, EYEPIECES, EYE_LIMIT, LAT, LON, airmass, clampPose, dirOf, extinction, flux,
  magnification, seeingAt, sensorField, shellFrame, shellToPose, skyRows, toShell, trueField,
  type Eyepiece, type Pose,
} from './optics.ts';
import { Renderer, STRIDE } from './render.ts';
import { Run, classFromTeff } from './spectrum.ts';
import { drawHistogram, drawSpectrum, rows } from './panel.ts';
import type { Vec3 } from '../core/sky.ts';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`sim: missing #${id}`);
  return el as T;
};

const RAD = Math.PI / 180;
const ARCSEC = RAD / 3600;
// The Moffat power for the seeing profile.
const BETA = 3;
// Electrons per light unit per second, for the camera.
const EGAIN = 4000;
const READ = 3;
const FULL = 20000;
// The spectrograph's S/N after 1 s grows with this power of the light.
// A true square root would finish bright stars in one frame.
const SPEC_POW = 0.25;
const SPEC_GAIN = 4;
// The measurement stops here, so the loop can sleep.
const SNR_CAP = 300;
// Sky brightness in magnitudes per square arcsec: a dark rural site.
const SKY_MAG = 21;
// Arrow keys move the tube this far in degrees; Shift divides by ten.
const STEP = 1;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- elements ---------- */
const view = $<HTMLCanvasElement>('view');
const hud = $<HTMLCanvasElement>('hud');
const stage = $<HTMLElement>('stage');
const failLine = $<HTMLElement>('fail');
const statusLine = $<HTMLElement>('status');
const altIn = $<HTMLInputElement>('alt');
const azIn = $<HTMLInputElement>('az');
const eyepieceIn = $<HTMLSelectElement>('eyepiece');
const seeingIn = $<HTMLSelectElement>('seeing');
const trackIn = $<HTMLInputElement>('track');
const expIn = $<HTMLSelectElement>('exposure');
const stretchIn = $<HTMLInputElement>('stretch');
const colourIn = $<HTMLInputElement>('colour');
const spikesIn = $<HTMLInputElement>('spikes');
const readout = $<HTMLElement>('readout');
const camBar = $<HTMLElement>('cambar');
const camText = $<HTMLElement>('camtext');
const camFill = $<HTMLElement>('camfill');
const targetName = $<HTMLElement>('target-name');
const targetInfo = $<HTMLElement>('target-info');
const specCanvas = $<HTMLCanvasElement>('spectrum');
const specInfo = $<HTMLElement>('spec-info');
const compList = $<HTMLElement>('composition');
const histCanvas = $<HTMLCanvasElement>('histogram');
const histBox = $<HTMLElement>('histbox');

/* ---------- state ---------- */
type Mode = 'eye' | 'camera';
let mode: Mode = 'eye';
let eyepiece: Eyepiece = EYEPIECES[0];
let pose: Pose = clampPose(40, 180);
// With tracking, the aim holds still on the sky in shell axes.
let aim: Vec3 = { x: 1, y: 0, z: 0 };
let renderer: Renderer | null = null;
let data = new Float32Array(STRIDE * 4096);
// The bodies drawn last frame, in CSS px, for picks.
let shown: { b: Body; x: number; y: number }[] = [];
let selected: Body | null = null;
let run: Run | null = null;
let lastInput = 0;
let raf = 0;
let lastT = 0;
let lastDraw = 0;
let lastPanel = 0;
// Camera: time into the current sub, subs in the stack, a reset request.
let subClock = 0;
let subs = 0;
let restack = true;
// Seeing: tip-tilt in px and a slow breath of the disc.
let jx = 0, jy = 0, breath = 0;
let histValues: number[] = [];

const random = Math.random;
const gauss = (): number => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(6.2831853 * random());

/* ---------- geometry ---------- */
type Layout = { cx: number; cy: number; scale: number; radius: number; rect: [number, number, number, number]; cull: number };

// Where the field sits on the canvas, in device px.
function layout(): Layout {
  const W = renderer!.w, H = renderer!.h;
  const cx = W / 2, cy = H / 2;
  if (mode === 'eye') {
    const radius = 0.46 * Math.min(W, H), half = trueField(eyepiece) / 2;
    return { cx, cy, radius, scale: radius / Math.tan(half * RAD), rect: [0, 0, W, H], cull: half * 1.15 + 0.02 };
  }
  const sf = sensorField(), aspect = sf.w / sf.h;
  const rw = Math.min(W * 0.97, H * 0.97 * aspect), rh = rw / aspect;
  const rect: [number, number, number, number] = [cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2];
  return { cx, cy, radius: rw / 2, scale: rw / 2 / Math.tan((sf.w / 2) * RAD), rect, cull: Math.hypot(sf.w, sf.h) / 2 * 1.05 };
}

// The seeing disc's FWHM in arcsec at the tube's altitude.
const fwhm = (): number => Math.hypot(seeingAt(Number(seeingIn.value), pose.alt), DIFFRACTION);

/* ---------- pointing ---------- */
const skyMs = (): number => Date.now();

function rowsNow(): number[] {
  return skyRows(lst(skyMs(), LON), LAT);
}

// Moves the tube to a pose; with tracking, the aim follows.
function setPose(alt: number, az: number): void {
  pose = clampPose(alt, az);
  aim = toShell(dirOf(pose.alt, pose.az), rowsNow());
  restack = true;
  wake(true);
}

const nudge = (dAlt: number, dAz: number): void => setPose(pose.alt + dAlt, pose.az + dAz);

// The aim's RA and Dec, for the readout.
function raDec(s: Vec3): { ra: number; dec: number } {
  return { ra: ((Math.atan2(-s.y, s.x) / RAD) % 360 + 360) % 360, dec: Math.asin(Math.max(-1, Math.min(1, s.z))) / RAD };
}

/* ---------- the frame ---------- */
// The radius in px where a star's light falls below a floor.
// The terms match body.frag.glsl.
function reach(a: number, F: number): number {
  const floor = 2e-4;
  const core = a * Math.sqrt(Math.max(0, Math.cbrt(((BETA - 1) / (Math.PI * a * a)) * F / floor) - 1));
  const k = 0.01 / (Math.PI * 16 * a * a);
  const wing = 4 * a * Math.sqrt(Math.max(0, Math.pow((k * F) / floor, 2 / 3) - 1));
  return Math.max(core, wing) * 1.15;
}

// Fills the body instances for this frame and returns how many.
function build(L: Layout, lstDeg: number): number {
  const fr = shellFrame(pose, lstDeg);
  const ext = extinction(pose.alt);
  const seeing = fwhm() * (mode === 'eye' ? 1 + 0.12 * breath : 1.1);
  const alpha = Math.max(mode === 'eye' ? 0.8 : 0.9, (seeing * ARCSEC * L.scale) / 1.0196);
  const limit = mode === 'eye' ? EYE_LIMIT + 0.6 : MAG_GEN;
  const spikes = mode === 'camera' && spikesIn.checked;
  const dpr = window.devicePixelRatio || 1;
  const near = bodiesNear(fr.f, L.cull);
  let n = 0;
  shown = [];
  const push = (vals: number[]): void => {
    if (n * STRIDE + STRIDE > data.length) {
      const next = new Float32Array(data.length * 2);
      next.set(data);
      data = next;
    }
    data.set(vals, n * STRIDE);
    n++;
  };
  for (const b of near) {
    const z = b.x * fr.f.x + b.y * fr.f.y + b.z * fr.f.z;
    if (z <= 0) continue;
    const X = (b.x * fr.r.x + b.y * fr.r.y + b.z * fr.r.z) / z;
    const Y = (b.x * fr.u.x + b.y * fr.u.y + b.z * fr.u.z) / z;
    const px = L.cx + X * L.scale + jx, py = L.cy - Y * L.scale + jy;
    const mag = b.mag + ext;
    if (mag > limit) continue;
    const F = flux(mag);
    const [r, g, bl] = b.rgb;
    if (b.galaxy === 'none') {
      const spike = spikes ? Math.min(L.radius * 0.25, 1.2 * Math.pow(F, 0.4)) : 0;
      const half = Math.min(600, Math.max(3, reach(alpha, F), spike * 4));
      push([px, py, half, 0, r, g, bl, F, alpha, half, spike, 0]);
      // Bright stars throw a faint ghost ring, mirrored through the field centre.
      if (F > 400) {
        const gx = L.cx - (px - L.cx) * 0.6, gy = L.cy - (py - L.cy) * 0.6;
        const rad = L.radius * 0.09;
        push([gx, gy, rad * 1.6, 2, 0.7, 1.0, 0.75, F * 0.0006, rad, rad * 0.18, 0, 0]);
      }
    } else {
      const re = Math.hypot(b.re * ARCSEC * L.scale, alpha);
      push([px, py, Math.min(500, re * 7 / Math.max(0.3, b.q)), 1, r, g, bl, F, re, b.q, b.pa, b.galaxy === 'spiral' ? 1 : 0]);
    }
    const inside = mode === 'eye'
      ? Math.hypot(px - L.cx, py - L.cy) < L.radius
      : px > L.rect[0] && px < L.rect[2] && py > L.rect[1] && py < L.rect[3];
    if (inside) shown.push({ b, x: px / dpr, y: py / dpr });
  }
  return n;
}

// Sky glow per device px per second, from the sky's surface brightness.
function skyGlow(L: Layout): number {
  const arcsecPerPx = 1 / (L.scale * ARCSEC);
  return flux(SKY_MAG) * arcsecPerPx * arcsecPerPx;
}

function frame(t: number): void {
  raf = 0;
  if (!renderer) return;
  const lively = t - lastInput < 1200;
  // Ambient frames run at 30 fps.
  if (!lively && t - lastDraw < 1000 / 30 - 2) {
    raf = requestAnimationFrame(frame);
    return;
  }
  // Exposures and the spectrograph run on the wall clock.
  // Slow frames do not slow them.
  const wall = Math.min(2, lastT ? (t - lastT) / 1000 : 0);
  lastT = t;
  lastDraw = t;
  const still = reduced.matches;
  const lstDeg = lst(skyMs(), LON);
  const rows = skyRows(lstDeg, LAT);
  if (trackIn.checked) pose = shellToPose(aim, rows);
  else aim = toShell(dirOf(pose.alt, pose.az), rows);
  const L = layout();
  const seeingPx = (fwhm() * ARCSEC * L.scale);
  if (mode === 'eye' && !still) {
    // Tip-tilt wanders like a damped random walk.
    jx += (gauss() * 0.3 - jx * 0.2) * seeingPx * 0.5;
    jy += (gauss() * 0.3 - jy * 0.2) * seeingPx * 0.5;
    breath += (gauss() * 0.4 - breath * 0.1) * 0.3;
  } else {
    jx = jy = breath = 0;
  }
  const n = build(L, lstDeg);
  const fr = shellFrame(pose, lstDeg);
  const glow = skyGlow(L);
  const b = Math.abs(galLat(fr.f));
  const common = {
    u_center: [L.cx, L.cy], u_scale: L.scale,
    u_r: [fr.r.x, fr.r.y, fr.r.z], u_u: [fr.u.x, fr.u.y, fr.u.z], u_f: [fr.f.x, fr.f.y, fr.f.z],
    u_bg: [glow * 0.97, glow, glow * 1.03], u_mw: glow * 2.2,
  };
  renderer.bodies(data, n, {
    u_beta: BETA,
    u_spikes: mode === 'camera' && spikesIn.checked ? 0.008 : 0,
    u_halo: mode === 'eye' ? 0.06 : 0.015,
  });
  if (mode === 'eye') {
    // The dark-adapted eye barely sees the sky glow.
    renderer.eye({
      ...common, u_bg: common.u_bg.map((v) => v * 0.3), u_mw: common.u_mw * 0.5,
      u_radius: L.radius, u_gain: 2.2, u_glare: 0.04, u_ca: 1.6,
      u_grain: still ? 0 : 0.007, u_time: t / 1000,
    });
  } else {
    const exp = Number(expIn.value);
    subClock += wall;
    let fresh = false;
    if (restack) {
      subs = 0;
      subClock = 0;
      restack = false;
      fresh = true;
    } else if (subClock >= exp) {
      subClock = 0;
      fresh = true;
    }
    if (fresh) {
      subs = Math.min(subs + 1, 999);
      renderer.stack({
        ...common, u_mix: 1 / subs, u_exp: exp, u_egain: EGAIN, u_read: READ, u_full: FULL,
        u_seed: random() * 100, u_colour: colourIn.checked ? 1 : 0, u_hot: 400, u_amp: 1.5,
      });
    }
    const skyE = (glow * (1 + 2.2 * 0.45 * Math.exp(-b / 8))) * exp * EGAIN;
    const sigma = Math.sqrt(skyE + READ * READ) / Math.sqrt(Math.max(1, subs));
    const black = Math.max(0, skyE - 2 * sigma), soft = sigma * Number(stretchIn.value);
    renderer.camera({ ...common, u_rect: L.rect, u_black: black, u_soft: soft, u_white: FULL });
    if (fresh && t - lastPanel > 150) {
      const s = renderer.sample(L.rect);
      const k = Math.asinh((FULL - black) / soft);
      histValues = [];
      for (let i = 0; i < s.length; i += 4) histValues.push(Math.asinh(Math.max(0, (s[i] + s[i + 1] + s[i + 2]) / 3 - black) / soft) / k);
    }
    camFill.style.width = `${Math.min(100, (subClock / exp) * 100)}%`;
  }
  // The spectrograph needs the target in the field.
  const inView = !!selected && shown.some((s) => s.b === selected);
  if (run && inView && run.snr < SNR_CAP) run.step(wall, random);
  drawHud(L);
  if (t - lastPanel > 150) {
    lastPanel = t;
    panel(L, lstDeg, inView);
  }
  const integrating = !!run && inView && run.snr < SNR_CAP;
  const exposing = mode === 'camera' && t - lastInput < 60000;
  const ambient = mode === 'eye' && !still && t - lastInput < 60000;
  if (lively || integrating || exposing || ambient) raf = requestAnimationFrame(frame);
}

function wake(input = false): void {
  if (input) lastInput = performance.now();
  if (!raf && !document.hidden && renderer) {
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }
}

/* ---------- the HUD ---------- */
function drawHud(L: Layout): void {
  const dpr = window.devicePixelRatio || 1;
  const W = stage.clientWidth, H = stage.clientHeight;
  if (hud.width !== Math.round(W * dpr)) {
    hud.width = Math.round(W * dpr);
    hud.height = Math.round(H * dpr);
  }
  const g = hud.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const cx = L.cx / dpr, cy = L.cy / dpr;
  if (mode === 'camera') {
    // A software reticle: a centre ring and ticks.
    g.strokeStyle = 'rgba(120, 220, 160, 0.55)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, 18, 0, Math.PI * 2);
    g.moveTo(cx - 40, cy); g.lineTo(cx - 24, cy);
    g.moveTo(cx + 24, cy); g.lineTo(cx + 40, cy);
    g.moveTo(cx, cy - 40); g.lineTo(cx, cy - 24);
    g.moveTo(cx, cy + 24); g.lineTo(cx, cy + 40);
    g.stroke();
    // A scale bar of five arcmin.
    const bar = (5 / 60) * RAD * L.scale / dpr;
    const x0 = L.rect[0] / dpr + 14, y0 = L.rect[3] / dpr - 14;
    g.fillStyle = 'rgba(200, 230, 210, 0.85)';
    g.fillRect(x0, y0, bar, 2);
    g.font = '11px system-ui, sans-serif';
    g.fillText("5′", x0, y0 - 5);
  }
  if (selected) {
    const s = shown.find((v) => v.b === selected);
    if (s) {
      g.strokeStyle = mode === 'eye' ? 'rgba(255, 210, 140, 0.35)' : 'rgba(255, 210, 140, 0.8)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(s.x, s.y, 11, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

/* ---------- the panel ---------- */
const fmtRa = (ra: number): string => {
  const h = ra / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = Math.round(((h - hh) * 60 - mm) * 60);
  return `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
};
const fmtDec = (dec: number): string => {
  const a = Math.abs(dec), d = Math.floor(a), m = Math.round((a - d) * 60);
  return `${dec < 0 ? '−' : '+'}${d}° ${String(m).padStart(2, '0')}′`;
};

function panel(L: Layout, lstDeg: number, inView: boolean): void {
  const rd = raDec(aim);
  const field = mode === 'eye'
    ? `${trueField(eyepiece).toFixed(2)}° · ${Math.round(magnification(eyepiece))}×`
    : `${sensorField().w.toFixed(2)}° × ${sensorField().h.toFixed(2)}°`;
  const h = lstDeg / 15;
  readout.textContent = [
    `RA ${fmtRa(rd.ra)}  Dec ${fmtDec(rd.dec)}`,
    `Alt ${pose.alt.toFixed(1)}°  Az ${pose.az.toFixed(1)}°  Air mass ${airmass(pose.alt).toFixed(2)}`,
    `Field ${field}  Seeing ${fwhm().toFixed(1)}″  ${shown.length} in view`,
    `LST ${Math.floor(h)}h ${String(Math.floor((h % 1) * 60)).padStart(2, '0')}m  ${new Date(skyMs()).toLocaleTimeString()}`,
  ].join('\n');
  altIn.value = pose.alt.toFixed(1);
  azIn.value = pose.az.toFixed(1);
  camBar.hidden = mode !== 'camera';
  histBox.hidden = mode !== 'camera';
  if (mode === 'camera') {
    camText.textContent = `● LIVE  ${expIn.value} s × ${subs}  ${colourIn.checked ? 'Colour' : 'Mono'}  ${(1 / (L.scale * ARCSEC) * (window.devicePixelRatio || 1)).toFixed(2)}″/px`;
    drawHistogram(histCanvas, histValues);
  }
  // The target card and the spectrograph.
  if (!selected) {
    targetName.textContent = 'No target';
    targetInfo.textContent = 'Tap a star or a galaxy in the view.';
    specInfo.textContent = '';
    compList.replaceChildren();
    drawSpectrum(specCanvas, null, []);
    return;
  }
  const b = selected;
  targetName.textContent = b.name;
  const kind = b.galaxy === 'none' ? `Star · ${b.spect}` : `${b.galaxy === 'spiral' ? 'Spiral' : 'Elliptical'} galaxy`;
  targetInfo.textContent = `${kind} · mag ${b.mag.toFixed(1)}${b.catalog ? ' · catalog' : ' · field'}${inView ? '' : ' · out of view'}`;
  if (!run) return;
  const found = run.lines();
  drawSpectrum(specCanvas, run, found);
  const lines: string[] = [`${run.time.toFixed(1)} s · S/N ${Math.round(run.snr)}${run.snr >= SNR_CAP ? ' · done' : inView ? '' : ' · paused'}`];
  if (b.galaxy === 'none') {
    const te = run.teff();
    if (te && run.snr > 4) lines.push(`Colour temperature ${Math.round(te.T / 50) * 50} ± ${Math.round(te.err / 10) * 10} K · class ≈ ${classFromTeff(te.T)}`);
  } else if (run.snr > 6) {
    const err = 0.02 / run.snr;
    const z = b.redshift + zDraw * err * 0.5;
    lines.push(`Redshift z = ${z.toFixed(4)} ± ${err.toFixed(4)} · ${Math.round((z * 299792) / 70)} Mpc`);
  }
  specInfo.textContent = lines.join('\n');
  compList.replaceChildren(...rows(found).map((r) => {
    const li = document.createElement('li');
    li.className = r.found ? 'found' : '';
    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.style.setProperty('--w', `${Math.min(100, r.depth * 140).toFixed(0)}%`);
    const name = document.createElement('span');
    name.textContent = r.label;
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = r.found ? 'found' : '…';
    li.append(name, bar, v);
    return li;
  }));
}

/* ---------- picking ---------- */
// One error draw per run, so the redshift settles as the noise falls.
let zDraw = 0;

function select(b: Body | null): void {
  selected = b;
  zDraw = gauss();
  run = b ? new Run({ teff: b.teff, galaxy: b.galaxy, redshift: b.redshift }, SPEC_GAIN * Math.pow(flux(b.mag + extinction(pose.alt)), SPEC_POW)) : null;
  lastPanel = 0;
  wake(true);
}

// The body nearest a point in CSS px, weighted toward bright ones.
function pickAt(x: number, y: number): Body | null {
  let best: Body | null = null, score = Infinity;
  for (const s of shown) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d > 28) continue;
    const sc = d + s.b.mag * 1.5;
    if (sc < score) {
      score = sc;
      best = s.b;
    }
  }
  return best;
}

/* ---------- input ---------- */
function setMode(m: Mode): void {
  mode = m;
  document.body.dataset.mode = m;
  restack = true;
  wake(true);
}

for (const el of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
  el.addEventListener('change', () => setMode(el.value === 'camera' ? 'camera' : 'eye'));
}
altIn.addEventListener('input', () => setPose(Number(altIn.value), pose.az));
azIn.addEventListener('input', () => setPose(pose.alt, Number(azIn.value)));
eyepieceIn.addEventListener('change', () => {
  eyepiece = EYEPIECES[Number(eyepieceIn.value)] ?? EYEPIECES[0];
  wake(true);
});
for (const el of [seeingIn, expIn, colourIn, spikesIn, trackIn]) {
  el.addEventListener('change', () => {
    restack = true;
    wake(true);
  });
}
stretchIn.addEventListener('input', () => wake(true));
$<HTMLButtonElement>('restack').addEventListener('click', () => {
  restack = true;
  wake(true);
});
$<HTMLButtonElement>('left').addEventListener('click', () => nudge(0, -STEP));
$<HTMLButtonElement>('right').addEventListener('click', () => nudge(0, STEP));
$<HTMLButtonElement>('up').addEventListener('click', () => nudge(STEP, 0));
$<HTMLButtonElement>('down').addEventListener('click', () => nudge(-STEP, 0));
$<HTMLButtonElement>('centre').addEventListener('click', () => {
  if (!selected) return;
  aim = { x: selected.x, y: selected.y, z: selected.z };
  pose = shellToPose(aim, rowsNow());
  setPose(pose.alt, pose.az);
});

// Arrow keys nudge the tube; Shift makes the step a tenth.
stage.addEventListener('keydown', (e) => {
  const k = e.shiftKey ? STEP / 10 : STEP;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [0, -k], ArrowRight: [0, k], ArrowUp: [k, 0], ArrowDown: [-k, 0],
  };
  const m = moves[e.key];
  if (!m) return;
  e.preventDefault();
  nudge(m[0], m[1]);
});

// A drag moves the sky under the pointer; a tap picks a target.
let drag: { x: number; y: number; x0: number; y0: number; t0: number; moved: boolean } | null = null;
stage.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || !renderer) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
  drag.moved = true;
  const L = layout();
  const dpr = window.devicePixelRatio || 1;
  // Degrees per CSS px at the field centre.
  const perPx = dpr / L.scale / RAD;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  // Azimuth steps widen toward the zenith by one over cos(alt).
  const cosAlt = Math.max(0.2, Math.cos(pose.alt * RAD));
  setPose(pose.alt + dy * perPx, pose.az - (dx * perPx) / cosAlt);
});
stage.addEventListener('pointerup', (e) => {
  if (drag && !drag.moved && performance.now() - drag.t0 < 400) {
    const r = stage.getBoundingClientRect();
    const b = pickAt(e.clientX - r.left, e.clientY - r.top);
    if (b) select(b);
  }
  drag = null;
});
const endDrag = (): void => { drag = null; };
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('lostpointercapture', endDrag);

function resize(): void {
  if (!renderer) return;
  const dpr = window.devicePixelRatio || 1;
  renderer.resize(Math.round(stage.clientWidth * dpr), Math.round(stage.clientHeight * dpr));
  restack = true;
  wake(true);
}
new ResizeObserver(resize).observe(stage);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else wake(true);
});
view.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  cancelAnimationFrame(raf);
  raf = 0;
  renderer = null;
  failLine.hidden = false;
  failLine.textContent = 'The view lost its graphics. Reload the page to start again.';
});
window.addEventListener('pagehide', (e) => {
  if (!e.persisted) renderer?.dispose();
});

// The brightest star the tube can reach now: the first target.
function brightest(): Body | null {
  const rows = rowsNow();
  let best: Body | null = null;
  for (const b of catalogBodies()) {
    if (best && b.mag >= best.mag) continue;
    const p = shellToPose(b, rows);
    if (p.alt < 25 || p.alt > 80) continue;
    best = b;
  }
  return best;
}

// QA hooks: read the view, aim by RA and Dec, pick by name.
(window as unknown as { __sim: unknown }).__sim = {
  shown: () => shown.map((s) => ({ name: s.b.name, galaxy: s.b.galaxy, mag: s.b.mag, x: s.x, y: s.y })),
  goto: (ra: number, dec: number): void => {
    const p = shellToPose(shellDir(ra, dec), rowsNow());
    setPose(p.alt, p.az);
  },
  pick: (name: string): boolean => {
    const s = shown.find((v) => v.b.name === name);
    if (s) select(s.b);
    return !!s;
  },
};

async function boot(): Promise<void> {
  try {
    renderer = new Renderer(view);
  } catch (err) {
    console.error(err);
    failLine.hidden = false;
    failLine.textContent = 'This simulator needs WebGL 2 with float render targets.';
    statusLine.hidden = true;
    return;
  }
  const stars = await loadStars(new URL('../../stars.bin', import.meta.url).href);
  setCatalog(stars);
  statusLine.hidden = true;
  const b = brightest();
  if (b) {
    aim = { x: b.x, y: b.y, z: b.z };
    pose = shellToPose(aim, rowsNow());
  }
  resize();
  if (b) select(b);
}

boot().catch((err: unknown) => {
  console.error(err);
  failLine.hidden = false;
  failLine.textContent = 'Telescope simulator could not start.';
});
