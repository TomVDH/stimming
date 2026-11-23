// The telescope simulator: two telescopes, two ways of seeing.
// The great refractor: an eye at the eyepiece, with all the glass's flaws.
// The 1 m reflector: its software on a monitor in a dark room.
// The loop runs while input is recent, or a measurement or exposure runs.
import { loadStars } from '../core/catalog.ts';
import { lst, shellDir } from '../core/sky.ts';
import type { Vec3 } from '../core/sky.ts';
import { bodiesNear, catalogBodies, galLat, setCatalog, type Body } from './field.ts';
import {
  ALT_MAX, ALT_MIN, BIG, EYEPIECES, EYE_LIMIT, FOCAL_MM, LAT, LON, SMALL, airmass, clampPose, diffraction, dirOf,
  extinction, flux, gather, seeingAt, shellFrame, shellToPose, skyRows, toShell, trueField,
  type Eyepiece, type Frame, type Pose, type Scope,
} from './optics.ts';
import { Renderer, STRIDE } from './render.ts';
import { BINS, Run, classFromTeff, cosmology, isFound, model } from './spectrum.ts';
import { FILTERS, TINTS, PIXEL_ARCSEC, PIXEL_RAD, SENSOR_H, SENSOR_W, darkRate, defocusArcsec, guideRms, hfrAt, rig, stepRig, type Filter } from './rig.ts';
import { IMG, SH, SW, Screen, TIP_COLS, af, fitV, log, logText, type Target } from './ui.ts';
import { ADVICE, FILTER_SAYS, eyeTip, programTip, wrap, type Ctx, type EyeCtx } from './tips.ts';

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
// A magnitude 20 star gives about 35 e- per s.
const EGAIN = 59000;
const READ = 3;
const FULL = 50000;
// Electrons per ADU: the full well fills the 16-bit range.
const E_PER_ADU = 0.76;
const BIAS = 500;
// The secondary's shadow across the 1 m's pupil.
const OBSTRUCTION = 0.34;
// An achromat brings red and blue to one focus, green to another.
// The gap is about f / 2000, in mm.
const SECONDARY_SPECTRUM = FOCAL_MM / 2000;
// The spectrograph's S/N after 1 s grows with this power of the light.
// A true square root would finish bright stars in one frame.
const SPEC_POW = 0.25;
const SPEC_GAIN = 4;
// The measurement stops here, so the loop can sleep.
const SNR_CAP = 300;
// The camera stops looping after this long without input, in ms.
const CAMERA_IDLE = 10 * 60 * 1000;
// The grating's atlas: temperatures from 2400 K to 40000 K.
const ATLAS_ROWS = 64, ATLAS_COLS = 256, T_LO = 2400, T_HI = 40000;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- elements ---------- */
const view = $<HTMLCanvasElement>('view');
const stage = $<HTMLElement>('stage');
const failLine = $<HTMLElement>('fail');
const statusLine = $<HTMLElement>('status');
const screen = new Screen();

/* ---------- the toy's frame ---------- */
// ?embed: the toy opens the simulator in a frame after its cuts.
// ra and dec: the picked star, in degrees.
// t: the toy's sky time in ms.
const params = new URLSearchParams(location.search);
const EMBED = params.has('embed');
const START_RA = Number(params.get('ra')), START_DEC = Number(params.get('dec'));
const START_T = Number(params.get('t'));
// The frame loads during the cuts and draws nothing until the toy says go.
let held = EMBED;
if (EMBED) document.documentElement.classList.add('embed');
// Tells the toy that the view closes or is ready.
const toToy = (msg: 'close' | 'ready'): void => {
  if (EMBED && parent !== window) parent.postMessage({ obsSim: msg }, location.origin);
};
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.source !== parent) return;
  const d = e.data as { obsSim?: string } | null;
  if (d?.obsSim !== 'go') return;
  held = false;
  stage.focus();
  wake(true);
});

/* ---------- state ---------- */
type Mode = 'eye' | 'camera';
let mode: Mode = 'eye';
let scope: Scope = SMALL;
let eyepiece: Eyepiece = EYEPIECES[0];
// The eyepiece holds the grating instead of plain glass.
let grating = false;
// The refractor's focus, mm from best focus for green light.
let eyeFocus = 0;
// The clock drive keeps the refractor on the sky.
let drive = true;
let pose: Pose = clampPose(40, 180);
// With tracking, the aim holds still on the sky in shell axes.
let aim: Vec3 = { x: 1, y: 0, z: 0 };
let renderer: Renderer | null = null;
let data = new Float32Array(STRIDE * 4096);
// The bodies drawn last frame: CSS px, or monitor px for the camera.
let shown: { b: Body; x: number; y: number }[] = [];
let detected: [number, number][] = [];
let selected: Body | null = null;
let run: Run | null = null;
let lastInput = 0;
let raf = 0;
let lastT = 0;
let lastDraw = 0;
let lastPanel = 0;
let uiDirty = true;
// Camera: time into the current sub, subs in the stack, pending stack work.
let subClock = 0;
let subs = 0;
let restack: 'none' | 'reset' | 'reframe' = 'reset';
let hfrNow = 0;
let stats = { mean: 0, med: 0, sd: 0, max: 0, hist: [] as number[] };
// Seeing drifts on its own through the night, in arcsec at the zenith.
let seeingZ = 2.2;
// Seeing: tip-tilt in px and a slow breath of the disc.
let jx = 0, jy = 0, breath = 0;
let targets: (Target & { dir: Vec3 })[] = [];
// The monitor's glass on the canvas, in device px.
let glass: [number, number, number, number] = [0, 0, 1, 1];
// Tips: on or off, the region under the pointer, and since when.
let tipsOn = true;
let tipId: string | null = null;
let tipSince = 0;
let tipTimer = 0;
// A click opens a tip even with tips off.
let tipPinned = false;
// A tip shows after the pointer rests this long, in ms.
const TIP_DWELL = 450;
// The advisor: when each condition last spoke, and if it cleared since.
const advised = new Map<string, { said: number; cleared: boolean }>();
let lastAdvice = 0;
// A condition speaks again only after it clears for this long, in ms.
const ADVICE_REST = 45000;

const random = Math.random;
const gauss = (): number => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(6.2831853 * random());
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/* ---------- geometry ---------- */
type Layout = {
  cx: number; cy: number; scale: number; radius: number;
  rect: [number, number, number, number]; cull: number; centre: Vec3; fr: Frame;
};

// The camera's frame: north up, east left.
// A derotated Cassegrain camera sees the sky this way.
function skyFrame(f: Vec3): Frame {
  const r = norm({ x: -f.y, y: f.x, z: 0 });
  const u = norm({ x: -f.z * f.x, y: -f.z * f.y, z: 1 - f.z * f.z });
  return { r, u, f };
}

// The camera image at fit: its scale in px per radian, and its size.
function fitScale(): { s: number; rw: number; rh: number } {
  const sf = scope.field, aspect = sf.w / sf.h;
  const rw = Math.min(IMG.w, IMG.h * aspect), rh = rw / aspect;
  return { s: rw / 2 / Math.tan((sf.w / 2) * RAD), rw, rh };
}

const eyeField = (): number => trueField(grating ? EYEPIECES[2] : eyepiece);

// Where the field sits in the work target, in its px.
function layout(lstDeg: number): Layout {
  const W = renderer!.w, H = renderer!.h;
  if (mode === 'eye') {
    // The field sits a little high, clear of the eyepiece case.
    const radius = 0.43 * Math.min(W, H), half = eyeField() / 2;
    const fr = shellFrame(pose, lstDeg);
    return { cx: W / 2, cy: H * 0.46, radius, scale: radius / Math.tan(half * RAD), rect: [0, 0, W, H], cull: half * 1.15 + 0.02, centre: fr.f, fr };
  }
  const fit = fitScale();
  const scale = fit.s * rig.zoom;
  const mx = IMG.x + IMG.w / 2, my = IMG.y + IMG.h / 2;
  const rect: [number, number, number, number] = [mx - fit.rw / 2, my - fit.rh / 2, mx + fit.rw / 2, my + fit.rh / 2];
  const fr = skyFrame(aim);
  const tw = Math.tan((scope.field.w / 2) * RAD) / rig.zoom, th = Math.tan((scope.field.h / 2) * RAD) / rig.zoom;
  const centre = norm({
    x: fr.f.x + rig.panX * fr.r.x + rig.panY * fr.u.x,
    y: fr.f.y + rig.panX * fr.r.y + rig.panY * fr.u.y,
    z: fr.f.z + rig.panX * fr.r.z + rig.panY * fr.u.z,
  });
  return {
    cx: mx - rig.panX * scale, cy: my + rig.panY * scale, scale, radius: fit.rw / 2, rect,
    cull: Math.atan(Math.hypot(tw, th)) / RAD * 1.1 + 0.03, centre, fr,
  };
}

// Work px per sensor pixel.
const kOf = (L: Layout): number => L.scale * PIXEL_RAD;

// Keeps the crop inside the sensor.
function clampPan(): void {
  const tw = Math.tan((scope.field.w / 2) * RAD), th = Math.tan((scope.field.h / 2) * RAD);
  const mx = tw * (1 - 1 / rig.zoom), my = th * (1 - 1 / rig.zoom);
  rig.panX = Math.max(-mx, Math.min(mx, rig.panX));
  rig.panY = Math.max(-my, Math.min(my, rig.panY));
}

// The seeing disc's FWHM in arcsec at the tube's altitude.
const fwhm = (): number => Math.hypot(seeingAt(seeingZ, pose.alt), diffraction(scope));

const tracking = (): boolean => (mode === 'eye' ? drive : rig.tracking);

/* ---------- pointing ---------- */
// In the toy's frame, the sky keeps the toy's time.
const skyLead = Number.isFinite(START_T) && START_T > 0 ? START_T - Date.now() : 0;
const skyMs = (): number => Date.now() + skyLead;

function rowsNow(): number[] {
  return skyRows(lst(skyMs(), LON), LAT);
}

// Moves the refractor to a pose; with the drive on, the aim follows.
function setPose(alt: number, az: number): void {
  pose = clampPose(alt, az);
  aim = toShell(dirOf(pose.alt, pose.az), rowsNow());
  wake(true);
}

const nudge = (dAlt: number, dAz: number): void => setPose(pose.alt + dAlt, pose.az + dAz);

// Points the 1 m at d, if the mount can reach it.
function aimAt(d: Vec3): boolean {
  const p = shellToPose(d, rowsNow());
  if (p.alt < ALT_MIN || p.alt > ALT_MAX) return false;
  aim = d;
  pose = p;
  return true;
}

// The aim's RA and Dec.
function raDec(s: Vec3): { ra: number; dec: number } {
  return { ra: ((Math.atan2(-s.y, s.x) / RAD) % 360 + 360) % 360, dec: Math.asin(Math.max(-1, Math.min(1, s.z))) / RAD };
}

const fmtRa = (ra: number): string => {
  const h = ra / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = Math.round(((h - hh) * 60 - mm) * 60) % 60;
  return `${String(hh).padStart(2, '0')}h${String(mm).padStart(2, '0')}m${String(ss).padStart(2, '0')}s`;
};
const fmtDec = (dec: number): string => {
  const a = Math.abs(dec), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60) % 60;
  return `${dec < 0 ? '−' : '+'}${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`;
};
const fmtLst = (lstDeg: number): string => {
  const h = lstDeg / 15;
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
};

// Starts an eased slew; the mount turns at 2 degrees a second.
function slewTo(d: Vec3, label: string): boolean {
  const p = shellToPose(d, rowsNow());
  if (p.alt < ALT_MIN) {
    log(`${label} is below the mount's ${ALT_MIN}° limit (alt ${p.alt.toFixed(1)}°)`, 'w');
    return false;
  }
  const ang = Math.acos(Math.max(-1, Math.min(1, dot(aim, d)))) / RAD;
  rig.jog.n = rig.jog.e = 0;
  rig.slew = { from: aim, to: d, t: 0, dur: Math.min(40, 1.5 + ang / 2) };
  rig.panX = rig.panY = 0;
  const rd = raDec(d);
  log(`Slewing to ${label}: RA ${fmtRa(rd.ra)} Dec ${fmtDec(rd.dec)} (${ang.toFixed(1)}°)`);
  wake(true);
  return true;
}

// Moves the 1 m's mount through a slew.
function moveMount(dt: number, rows: number[]): boolean {
  const s = rig.slew;
  if (!s) return false;
  s.t += dt;
  const k = Math.min(1, s.t / s.dur), e = k * k * (3 - 2 * k);
  const ang = Math.acos(Math.max(-1, Math.min(1, dot(s.from, s.to))));
  if (ang < 1e-9) aim = s.to;
  else {
    const a = Math.sin((1 - e) * ang) / Math.sin(ang), b = Math.sin(e * ang) / Math.sin(ang);
    aim = norm({ x: a * s.from.x + b * s.to.x, y: a * s.from.y + b * s.to.y, z: a * s.from.z + b * s.to.z });
  }
  pose = shellToPose(aim, rows);
  if (k >= 1) {
    rig.slew = null;
    log('Slew complete. Settled.', 'ok');
    restack = 'reset';
  }
  return true;
}

/* ---------- the frame ---------- */
// The radius in px where a star's light falls below a floor.
// The terms match body.frag.glsl.
function reach(a: number, F: number, floor: number): number {
  const core = a * Math.sqrt(Math.max(0, Math.cbrt(((BETA - 1) / (Math.PI * a * a)) * F / floor) - 1));
  const k = 0.01 / (Math.PI * 16 * a * a);
  const wing = 4 * a * Math.sqrt(Math.max(0, Math.pow((k * F) / floor, 2 / 3) - 1));
  return Math.max(core, wing) * 1.15;
}

// Sky glow per work px per second, from the sky's surface brightness.
function skyGlow(L: Layout): number {
  const arcsecPerPx = 1 / (L.scale * ARCSEC);
  return flux(scope.sky) * arcsecPerPx * arcsecPerPx;
}

// A star's detection S/N in the stack, against the sky under it.
function snrOf(F: number, rgb: [number, number, number], skyS: number): number {
  const w = FILTERS[rig.filter];
  const exp = rig.exposure;
  const S = (rgb[0] * w[0] + rgb[1] * w[1] + rgb[2] * w[2]) * F * EGAIN * exp;
  const npix = Math.PI * (2 * Math.max(1, hfrNow)) ** 2;
  const noise = Math.sqrt(S + npix * ((skyS + darkRate()) * exp + READ * READ));
  return (S / noise) * Math.sqrt(rig.liveStack ? Math.max(1, subs) : 1);
}

// The refractor's defocus for green light, in work px, signed.
function eyeDefocus(L: Layout, mm: number): number {
  return (mm / 24 / FOCAL_MM) * L.scale;
}

// The grating's atlas row for a temperature, 0 to 1.
const atlasRow = (T: number): number =>
  (Math.max(0, Math.min(ATLAS_ROWS - 1, ((Math.log(T) - Math.log(T_LO)) / (Math.log(T_HI) - Math.log(T_LO))) * (ATLAS_ROWS - 1))) + 0.5) / ATLAS_ROWS;

// Fills the body instances for this frame and returns how many.
function build(L: Layout): number {
  const fr = L.fr;
  const ext = extinction(pose.alt);
  const camera = mode === 'camera';
  const seeing = fwhm() * (camera ? 1.1 : 1 + 0.12 * breath);
  const alpha = Math.max(camera ? 0.9 : 0.8, (seeing * ARCSEC * L.scale) / 1.0196);
  const limit = camera ? scope.limit : EYE_LIMIT + 0.6;
  const spikes = scope.spikeAxes > 0;
  const light = gather(scope);
  // The faintest light worth a quad.
  // The eye has a fixed floor.
  // The camera uses a share of the sky.
  const floor = camera ? skyGlow(L) * light * 0.02 : 2e-4;
  const blur = camera ? defocusArcsec() * ARCSEC * L.scale : Math.abs(eyeDefocus(L, eyeFocus)) + Math.abs(eyeDefocus(L, SECONDARY_SPECTRUM)) * 1.2;
  const toCss = camera ? 1 : 1 / (window.devicePixelRatio || 1);
  const near = bodiesNear(L.centre, L.cull, scope.id === 'big');
  // Sky electrons per sensor pixel per second, through the filter.
  const w = FILTERS[rig.filter];
  const skyS = flux(scope.sky) * PIXEL_ARCSEC * PIXEL_ARCSEC * light * (w[0] + w[1] + w[2]) * EGAIN;
  const [x0, y0, x1, y1] = L.rect;
  let n = 0;
  shown = [];
  detected = [];
  const spectra: { px: number; py: number; F: number; T: number }[] = [];
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
    let F = flux(mag) * light;
    const [r, g, bl] = b.rgb;
    if (b.galaxy === 'none') {
      // The grating sends about half the light into the first order.
      if (grating && !camera) {
        spectra.push({ px, py, F: F * 0.5, T: b.teff });
        F *= 0.4;
      }
      const spike = spikes ? Math.min(L.radius * 0.25, 0.25 * Math.pow(F, 0.4)) : 0;
      const half = Math.min(600, Math.max(3, reach(alpha, F, floor), spike * 4, blur + 3 * alpha));
      if (px + half < x0 || px - half > x1 || py + half < y0 || py - half > y1) continue;
      push([px, py, half, 0, r, g, bl, F, alpha, half, spike, 0]);
      // Bright stars throw a faint ghost ring, mirrored through the optical axis.
      if (F > 400) {
        const gx = L.cx - (px - L.cx) * 0.6, gy = L.cy - (py - L.cy) * 0.6;
        const rad = L.radius * 0.09;
        push([gx, gy, rad * 1.6, 2, 0.7, 1.0, 0.75, F * 0.0006, rad, rad * 0.18, 0, 0]);
      }
    } else {
      const re = Math.hypot(b.re * ARCSEC * L.scale, alpha);
      const half = Math.min(500, re * 7 / Math.max(0.3, b.q));
      if (px + half < x0 || px - half > x1 || py + half < y0 || py - half > y1) continue;
      push([px, py, half, 1, r, g, bl, F, re, b.q, b.pa, b.galaxy === 'spiral' ? 1 : 0]);
    }
    const inside = camera
      ? px > x0 && px < x1 && py > y0 && py < y1
      : Math.hypot(px - L.cx, py - L.cy) < L.radius;
    if (!inside) continue;
    shown.push({ b, x: px * toCss, y: py * toCss });
    if (camera && snrOf(F, b.rgb, skyS) > 6) detected.push([px, py]);
  }
  // The brightest stars' spectra: the grating spreads each one to its right.
  spectra.sort((a, b) => b.F - a.F);
  const len = L.radius * 0.5, gap = L.radius * 0.12;
  for (const s of spectra.slice(0, 160)) {
    push([s.px, s.py, 1, 3, 1, 1, 1, s.F, len, Math.max(0.9, alpha * 0.9), gap, atlasRow(s.T)]);
  }
  return n;
}

function frame(t: number): void {
  raf = 0;
  if (!renderer) return;
  const lively = t - lastInput < 1200;
  const camera = mode === 'camera';
  const moving = camera && (!!rig.slew || !rig.tracking);
  // Ambient frames run at 30 fps.
  // A camera that only waits for its sub runs at 4 fps.
  const pace = camera && !moving && !lively ? 250 : 1000 / 30;
  if (!lively && !moving && t - lastDraw < pace - 2) {
    raf = requestAnimationFrame(frame);
    return;
  }
  // Exposures and the spectrograph run on the wall clock.
  // Slow frames do not slow them.
  const wall = Math.min(2, lastT ? (t - lastT) / 1000 : 0);
  lastT = t;
  lastDraw = t;
  const still = reduced.matches;
  // The air steadies and stirs through the night.
  // A random walk, scaled by the root of time.
  // It drifts back to 2.2 arcsec over about a minute.
  seeingZ = Math.max(1.2, Math.min(4, seeingZ + gauss() * 0.12 * Math.sqrt(wall) - (seeingZ - 2.2) * 0.02 * wall));
  const lstDeg = lst(skyMs(), LON);
  const rows = skyRows(lstDeg, LAT);
  let moved = false;
  if (camera) {
    stepRig(wall);
    moved = moveMount(wall, rows);
  }
  if (tracking()) pose = shellToPose(aim, rows);
  else aim = toShell(dirOf(pose.alt, pose.az), rows);
  const L = layout(lstDeg);
  if (!camera && !still) {
    const seeingPx = fwhm() * ARCSEC * L.scale;
    // Tip-tilt wanders like a damped random walk.
    jx += (gauss() * 0.3 - jx * 0.2) * seeingPx * 0.5;
    jy += (gauss() * 0.3 - jy * 0.2) * seeingPx * 0.5;
    breath += (gauss() * 0.4 - breath * 0.1) * 0.3;
  } else if (camera) {
    // The guide error moves the stars: east is left, north is up.
    jx = -rig.errRA * ARCSEC * L.scale;
    jy = rig.errDec * ARCSEC * L.scale;
    breath = 0;
  } else jx = jy = breath = 0;
  const n = build(L);
  const glow = skyGlow(L) * gather(scope);
  const b = Math.abs(galLat(L.centre));
  const common = {
    u_center: [L.cx, L.cy], u_scale: L.scale,
    u_r: [L.fr.r.x, L.fr.r.y, L.fr.r.z], u_u: [L.fr.u.x, L.fr.u.y, L.fr.u.z], u_f: [L.fr.f.x, L.fr.f.y, L.fr.f.z],
    u_bg: [glow * 0.97, glow, glow * 1.03], u_mw: glow * 2.2,
  };
  renderer.bodies(data, n, {
    u_beta: BETA,
    u_spikes: scope.spikeAxes > 0 ? 0.008 : 0,
    u_spikeAxes: Math.max(1, scope.spikeAxes),
    u_halo: camera ? 0.015 : 0.02,
    u_defocus: camera ? defocusArcsec() * ARCSEC * L.scale : eyeDefocus(L, eyeFocus),
    u_obstr: camera ? OBSTRUCTION : 0,
    // Mirrors bring every colour to one focus; the achromat does not.
    u_chroma: camera ? 0 : eyeDefocus(L, SECONDARY_SPECTRUM),
    u_axis: [L.cx, L.cy], u_field: L.radius, u_coma: camera ? 0 : 1,
  });
  if (!camera) {
    // The dark-adapted eye barely sees the sky glow.
    renderer.eye({
      ...common, u_bg: common.u_bg.map((v) => v * 0.3), u_mw: common.u_mw * 0.5,
      u_radius: L.radius, u_gain: 2.2, u_glare: 0.04, u_ca: 2.2, u_dist: 0.05,
      u_grain: still ? 0 : 0.007, u_time: t / 1000,
    });
  } else {
    cameraFrame(t, L, common, wall, moved, b);
  }
  const inView = !!selected && shown.some((s) => s.b === selected);
  if (run && inView && run.snr < SNR_CAP) run.step(wall, random);
  if (camera) {
    const tick = t - lastPanel > 150;
    if (tick) {
      lastPanel = t;
      if (t - lastTargets > 5000) refreshTargets();
      advise(t, lstDeg);
    }
    const fresh = tick || uiDirty || lively || moved;
    if (fresh) drawScreen(L, lstDeg, inView);
    renderer.ui(fresh ? screen.canvas : null);
    uiDirty = false;
    renderer.monitor({ u_rect: glass, u_radius: 0, u_bezel: 0, u_room: 0, u_night: screen.night ? 1 : 0 });
  }
  const integrating = !!run && inView && run.snr < SNR_CAP;
  const exposing = camera && (rig.looping || rig.autofocus) && t - lastInput < CAMERA_IDLE;
  const ambient = !camera && !still && t - lastInput < 60000;
  if (camera && rig.looping && t - lastInput >= CAMERA_IDLE) {
    rig.looping = false;
    log('Exposures paused after 10 minutes without input', 'w');
  }
  if (lively || integrating || exposing || ambient || moving) raf = requestAnimationFrame(frame);
}

// The camera's stack and stretch, onto the virtual monitor.
function cameraFrame(t: number, L: Layout, common: Record<string, number | number[]>, wall: number, moved: boolean, b: number): void {
  const r = renderer!;
  const exp = rig.exposure;
  const k = kOf(L);
  const live = moved || !rig.tracking;
  let fresh = false, mix = 1, noiseK = 1;
  if (restack === 'reset' || live) {
    subs = 1;
    subClock = 0;
    fresh = true;
  } else if (restack === 'reframe') {
    // One sub stands in for the whole stack.
    // Its noise falls by the root of the sub count.
    fresh = true;
    noiseK = rig.liveStack ? 1 / Math.sqrt(Math.max(1, subs)) : 1;
  } else if (rig.looping && !rig.autofocus) {
    subClock += wall;
    if (subClock >= exp) {
      subClock = 0;
      subs = rig.liveStack ? Math.min(subs + 1, 999) : 1;
      mix = 1 / subs;
      fresh = true;
      hfrNow = hfrAt(rig.focus, fwhm());
      log(`Exposure ${exp} s ${rig.filter} · HFR ${hfrNow.toFixed(2)} px · ${detected.length} stars · stack ${subs}`);
    }
  }
  restack = 'none';
  if (!hfrNow) hfrNow = hfrAt(rig.focus, fwhm());
  if (fresh) {
    r.stack({
      ...common, u_mix: mix, u_noise: noiseK, u_exp: exp, u_egain: EGAIN, u_read: READ, u_full: FULL,
      u_seed: random() * 100, u_filter: FILTERS[rig.filter], u_dark: darkRate(), u_hot: 300 * Math.pow(2, (rig.sensorTemp + 10) / 6),
      u_amp: 0.6 * Math.pow(2, (rig.sensorTemp + 10) / 6), u_k: k,
      u_origin: [L.cx - (SENSOR_W / 2) * k, L.cy - (SENSOR_H / 2) * k], u_sensor: [SENSOR_W, SENSOR_H],
    });
  }
  // The stretch: sky level and noise per work pixel.
  const w = FILTERS[rig.filter];
  const area = 1 / (k * k);
  const skyE = (common.u_bg as number[])[1] * (w[0] + w[1] + w[2]) * (1 + 2.2 * 0.45 * Math.exp(-b / 8)) * exp * EGAIN + darkRate() * exp * area;
  const sub = k >= 1 ? Math.sqrt(skyE / area + READ * READ) * area : Math.sqrt(skyE + area * READ * READ);
  const sigma = sub / Math.sqrt(rig.liveStack ? Math.max(1, subs) : 1);
  const black = Math.max(0, skyE - 2 * sigma), soft = Math.max(1e-6, sigma * 4);
  const white = FULL * area;
  r.camera({ ...common, u_rect: L.rect, u_black: black, u_soft: soft, u_white: white, u_tint: TINTS[rig.filter] });
  if (fresh && t - lastStats > 150) {
    lastStats = t;
    readStats(L, black, soft, white, area);
  }
}
let lastStats = 0;

// Reads the stack back: statistics in ADU and the stretched histogram.
function readStats(L: Layout, black: number, soft: number, white: number, area: number): void {
  const s = renderer!.sample(L.rect);
  const adu: number[] = [];
  const hist: number[] = [];
  const top = Math.asinh((white - black) / soft);
  for (let i = 0; i < s.length; i += 4) {
    const e = s[i];
    adu.push(Math.min(65535, BIAS + e / area / E_PER_ADU));
    hist.push(Math.asinh(Math.max(0, e - black) / soft) / top);
  }
  const sorted = [...adu].sort((a, c) => a - c);
  const mean = adu.reduce((a, c) => a + c, 0) / adu.length;
  const sd = Math.sqrt(adu.reduce((a, c) => a + (c - mean) ** 2, 0) / adu.length);
  stats = { mean, med: sorted[sorted.length >> 1], sd, max: sorted[sorted.length - 1], hist };
}

function wake(input = false): void {
  if (input) lastInput = performance.now();
  if (!raf && !document.hidden && renderer && !held) {
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }
}

/* ---------- the control software ---------- */
// A round scale-bar length, in monitor px.
function niceBar(arcsecPerPx: number): { px: number; label: string } {
  for (const s of [1, 2, 5, 10, 20, 30, 60, 120, 300, 600]) {
    if (s / arcsecPerPx >= 70) return { px: s / arcsecPerPx, label: s >= 60 ? `${s / 60}′` : `${s}″` };
  }
  return { px: 600 / arcsecPerPx, label: '10′' };
}

// The 1 m's state, as the tips read it.
function tipCtx(lstDeg: number): Ctx {
  const rd = raDec(aim);
  const haH = ((((lstDeg - rd.ra) / 15) % 24) + 36) % 24 - 12;
  return {
    alt: pose.alt, air: airmass(pose.alt), ha: haH, lst: fmtLst(lstDeg), fwhm: fwhm(),
    hfr: hfrNow || hfrAt(rig.focus, fwhm(), false), hfrBest: hfrAt(rig.best, fwhm(), false), focus: rig.focus,
    tracking: rig.tracking, slewing: !!rig.slew, guiding: rig.guiding, rms: guideRms()[2],
    exposure: rig.exposure, filter: rig.filter, subs, looping: rig.looping, max: stats.max,
    temp: rig.sensorTemp, coolerSet: rig.coolerSet, coolerPower: rig.coolerPower,
    night: screen.night, tipsOn,
    sel: selected ? { name: selected.name, galaxy: selected.galaxy !== 'none', snr: run ? run.snr : 0 } : null,
  };
}

// The advisor reads the state once a second.
// Each condition says one TIP line, then rests.
function advise(t: number, lstDeg: number): void {
  if (!tipsOn || t - lastAdvice < 1000) return;
  lastAdvice = t;
  const c = tipCtx(lstDeg);
  for (const a of ADVICE) {
    const st = advised.get(a.id) ?? { said: -Infinity, cleared: true };
    advised.set(a.id, st);
    if (!a.when(c)) { st.cleared = true; continue; }
    // A condition that never cleared stays quiet.
    if (!st.cleared || t - st.said < ADVICE_REST) continue;
    log(a.say(c), 'tip');
    st.said = t;
    st.cleared = false;
    uiDirty = true;
    // One tip a second at most.
    return;
  }
}

function drawScreen(L: Layout, lstDeg: number, inView: boolean): void {
  const rd = raDec(aim);
  const pct = kOf(L) * 100;
  const now = new Date();
  const p2 = (v: number): string => String(v).padStart(2, '0');
  const box = selected ? shown.find((s) => s.b === selected) : undefined;
  let sel = null;
  if (selected) {
    const found = run ? run.lines() : [];
    // Each line fits the 32 columns of the program's box.
    const lines: string[] = run ? [`T+${run.time.toFixed(0)}s  S/N ${Math.round(run.snr)}${run.snr >= SNR_CAP ? '  DONE' : inView ? '' : '  OUT OF VIEW'}`] : [];
    if (run && selected.galaxy === 'none') {
      const te = run.teff();
      if (te && run.snr > 4) lines.push(`TEFF ${Math.round(te.T / 50) * 50}±${Math.round(te.err / 10) * 10} K  CLASS ${classFromTeff(te.T)}`);
    } else if (run) {
      // A redshift needs a line from the galaxy itself, not from our air.
      const own = found.filter((f) => isFound(f) && f.el !== 'O₂');
      if (own.length) {
        const err = (0.02 * (1 + selected.redshift)) / run.snr;
        const z = Math.max(0, selected.redshift + zDraw * err * 0.5);
        const c = cosmology(z);
        const best = [...own].sort((p, q) => q.depth / q.sigma - p.depth / p.sigma)[0];
        const ago = c.lookback < 1 ? `${Math.round(c.lookback * 1000)} Myr` : `${c.lookback.toFixed(1)} Gyr`;
        lines.push(`z ${z.toFixed(z < 0.1 ? 4 : 3)}±${err.toFixed(z < 0.1 ? 4 : 3)} ${best.id}`);
        lines.push(`LOOKBACK ${ago}  D ${Math.round(c.distance)} Mpc`);
      } else lines.push('NO GALAXY LINE YET');
    }
    const kind = selected.galaxy === 'none' ? `Star · ${selected.spect}` : `${selected.galaxy === 'spiral' ? 'Spiral' : 'Elliptical'} galaxy`;
    sel = { name: selected.name, info: `${kind} · mag ${selected.mag.toFixed(1)}`, run, found, lines };
  }
  // The help window shows once the pointer rests on one region.
  let tip = null;
  if ((tipsOn || tipPinned) && tipId && performance.now() - tipSince >= TIP_DWELL) {
    const tp = programTip(tipId, tipCtx(lstDeg));
    if (tp) tip = { title: tp.title, lines: wrap(tp.text, TIP_COLS), tries: tp.try ? wrap(`Try: ${tp.try}`, TIP_COLS) : [], at: screen.hover };
  }
  const state = rig.slew ? 'Slewing' : rig.autofocus ? 'Autofocus running' : !rig.looping ? 'Idle'
    : `Exposing ${subClock.toFixed(1)} / ${rig.exposure} s · ${rig.filter}`;
  // The hour angle: how far the target has turned past the meridian.
  const haH = ((((lstDeg - rd.ra) / 15) % 24) + 36) % 24 - 12;
  const ha = `${haH < 0 ? '-' : '+'}${p2(Math.floor(Math.abs(haH)))}:${p2(Math.floor((Math.abs(haH) % 1) * 60))}`;
  screen.draw({
    clock: `${p2(now.getUTCHours())}:${p2(now.getUTCMinutes())}:${p2(now.getUTCSeconds())}`, lst: fmtLst(lstDeg), ha,
    seeing: `${fwhm().toFixed(1)}"`, time: performance.now() / 1000, still: reduced.matches,
    ra: fmtRa(rd.ra), dec: fmtDec(rd.dec), alt: `${pose.alt.toFixed(1)}°`, az: `${pose.az.toFixed(1)}°`, air: airmass(pose.alt).toFixed(2),
    state, progress: rig.looping ? Math.min(1, subClock / rig.exposure) : 0, subs,
    temp: `${rig.sensorTemp >= 0 ? '+' : '−'}${Math.abs(rig.sensorTemp).toFixed(1)}°`,
    zoom: `${rig.zoom <= 1.001 ? 'Fit ' : ''}${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`,
    stars: detected.length, hfr: hfrNow, stats, targets,
    centre: [L.cx, L.cy], detected, box: box ? [box.x, box.y] : null,
    bar: niceBar(1 / (L.scale * ARCSEC)), banner: rig.slew ? 'SLEWING' : rig.autofocus ? 'AUTOFOCUS' : '',
    sel, tip, tipsOn,
  }, actions);
}

// Bright named stars and deep fields the mount can reach now.
const DEEP_FIELDS = [
  { name: 'Draco deep field', ra: 240, dec: 60 },
  { name: 'Lockman Hole', ra: 161.25, dec: 57.5 },
  { name: 'Boötes deep field', ra: 218, dec: 34.5 },
  { name: 'Pegasus field', ra: 345, dec: 20 },
];
let lastTargets = -1e9;

function refreshTargets(): void {
  lastTargets = performance.now();
  const rows = rowsNow();
  const up = (d: Vec3): number => shellToPose(d, rows).alt;
  const stars = catalogBodies()
    .filter((s) => s.catalog && /^[A-Z][a-z]/.test(s.name) && s.mag < 2.5)
    .map((s) => ({ s, alt: up(s) }))
    .filter((v) => v.alt > 25 && v.alt < 85)
    .sort((a, c) => a.s.mag - c.s.mag)
    .slice(0, 4)
    .map((v) => ({ name: v.s.name, note: `mag ${v.s.mag.toFixed(1)} · alt ${Math.round(v.alt)}°`, dir: { x: v.s.x, y: v.s.y, z: v.s.z } }));
  const deep = DEEP_FIELDS.map((f) => ({ f, d: shellDir(f.ra, f.dec) }))
    .map((v) => ({ ...v, alt: up(v.d) }))
    .filter((v) => v.alt > 25)
    .slice(0, 3)
    .map((v) => ({ name: v.f.name, note: `alt ${Math.round(v.alt)}°`, dir: v.d }));
  targets = [...stars, ...deep];
}

async function autofocus(): Promise<void> {
  if (rig.autofocus) return;
  rig.autofocus = true;
  const wasLooping = rig.looping;
  rig.looping = false;
  af.points = [];
  af.fit = null;
  const start = Math.round(rig.focus);
  log(`Autofocus: 9 points around ${start.toLocaleString()}, 60 steps apart`);
  for (let i = -4; i <= 4; i++) {
    rig.focus = start + i * 60;
    restack = 'reset';
    wake(true);
    await new Promise((r) => setTimeout(r, 700));
    const h = hfrAt(rig.focus, fwhm());
    af.points.push([rig.focus, h]);
    log(`AF ${i + 5}/9  ${rig.focus.toLocaleString()}  HFR ${h.toFixed(2)} px`);
  }
  af.fit = fitV(af.points);
  if (af.fit && af.fit.b > start - 600 && af.fit.b < start + 600) {
    rig.focus = Math.round(af.fit.b);
    log(`Autofocus done: ${rig.focus.toLocaleString()}, HFR ${Math.sqrt(af.fit.c).toFixed(2)} px`, 'ok');
  } else {
    rig.focus = start;
    log('Autofocus failed: no clear minimum; focuser back at the start', 'w');
  }
  restack = 'reset';
  rig.autofocus = false;
  rig.looping = wasLooping;
  wake(true);
}

const EXPOSURES = [2, 5, 10, 30, 60];
// One focuser click, in steps of 1 µm.
const FOCUS_STEP = 25;
// The cooler's set points in °C.
const COOLER_SETS = [-25, -20, -15, -10, -5, 0];
const actions = {
  fit: (): void => { rig.panX = rig.panY = 0; zoomTo(1); },
  one: (): void => zoomTo(1 / (fitScale().s * PIXEL_RAD)),
  zoom: (f: number): void => zoomAt(f),
  goto: (i: number): void => {
    const t = targets[i];
    if (t) slewTo(t.dir, t.name);
  },
  startStop: (): void => {
    rig.looping = !rig.looping;
    log(rig.looping ? `Exposures started: ${rig.exposure} s, ${rig.filter}` : 'Exposures stopped');
  },
  exposure: (dir: number): void => {
    const i = Math.max(0, Math.min(EXPOSURES.length - 1, EXPOSURES.indexOf(rig.exposure) + dir));
    if (EXPOSURES[i] === rig.exposure) return;
    rig.exposure = EXPOSURES[i];
    log(`Exposure set to ${rig.exposure} s`);
    restack = 'reset';
  },
  filter: (f: Filter): void => {
    if (f === rig.filter) return;
    log(`Filter ${f}: ${FILTER_SAYS[f]}`);
    rig.filter = f;
    restack = 'reset';
  },
  reset: (): void => {
    log('Stack reset');
    restack = 'reset';
  },
  autofocus: (): void => void autofocus(),
  guide: (): void => {
    rig.guiding = !rig.guiding;
    log(rig.guiding ? 'Guiding started' : 'Guiding stopped: the mount runs open loop', rig.guiding ? 'ok' : 'w');
  },
  night: (): void => { screen.night = !screen.night; },
  stars: (): void => { rig.overlay.stars = !rig.overlay.stars; },
  slewSelected: (): void => {
    if (selected) slewTo({ x: selected.x, y: selected.y, z: selected.z }, selected.name);
    else log('Slew: click a target in the image first', 'w');
  },
  track: (): void => {
    if (rig.slew) { log('Tracking: the mount is slewing; it tracks when it arrives', 'w'); return; }
    rig.tracking = !rig.tracking;
    log(rig.tracking ? 'Tracking: sidereal' : 'Tracking stopped: the sky drifts west', rig.tracking ? 'ok' : 'w');
    restack = 'reset';
  },
  cooler: (dir: number): void => {
    const i = Math.max(0, Math.min(COOLER_SETS.length - 1, COOLER_SETS.indexOf(rig.coolerSet) + dir));
    if (COOLER_SETS[i] === rig.coolerSet) return;
    rig.coolerSet = COOLER_SETS[i];
    log(`Cooler set point: ${rig.coolerSet} °C`);
  },
  // One click moves the focuser 25 steps, a fortieth of a millimetre.
  focusStep: (dir: number): void => {
    if (rig.autofocus) return;
    rig.focus += dir * FOCUS_STEP;
    hfrNow = hfrAt(rig.focus, fwhm());
    log(`Focuser ${dir < 0 ? 'in' : 'out'} to ${Math.round(rig.focus).toLocaleString('en')}: stars ${hfrNow.toFixed(2)} px`);
    restack = 'reset';
  },
  tips: (): void => {
    tipsOn = !tipsOn;
    log(tipsOn ? 'Tips on' : 'Tips off');
  },
};

/* ---------- picking ---------- */
// One error draw per run, so the redshift settles as the noise falls.
let zDraw = 0;

function select(b: Body | null): void {
  selected = b;
  zDraw = gauss();
  run = b ? new Run({ teff: b.teff, galaxy: b.galaxy, redshift: b.redshift }, SPEC_GAIN * Math.pow(flux(b.mag + extinction(pose.alt)) * gather(scope), SPEC_POW)) : null;
  if (b) log(`Target: ${b.name}, mag ${b.mag.toFixed(1)}`);
  wake(true);
}

// The body nearest a point, weighted toward bright ones.
function pickAt(x: number, y: number): Body | null {
  let best: Body | null = null, score = Infinity;
  for (const s of shown) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d > 20) continue;
    const sc = d + s.b.mag * 1.5;
    if (sc < score) {
      score = sc;
      best = s.b;
    }
  }
  return best;
}

/* ---------- the camera's view: zoom and pan ---------- */
function lastLayout(): Layout {
  return layout(lst(skyMs(), LON));
}

// Zooms by f, keeping the sky under (ax, ay) in monitor px still.
function zoomAt(f: number, ax?: number, ay?: number): void {
  if (!renderer) return;
  const L = lastLayout();
  const fit = fitScale();
  const one = 1 / (fit.s * PIXEL_RAD);
  const next = Math.max(1, Math.min(one * 4, rig.zoom * f));
  const mx = IMG.x + IMG.w / 2, my = IMG.y + IMG.h / 2;
  const x = ax ?? mx, y = ay ?? my;
  const sx = rig.panX + (x - mx) / L.scale;
  const sy = rig.panY - (y - my) / L.scale;
  rig.zoom = next;
  const s = fit.s * next;
  rig.panX = sx - (x - mx) / s;
  rig.panY = sy + (y - my) / s;
  clampPan();
  restack = restack === 'reset' ? 'reset' : 'reframe';
  wake(true);
}

const zoomTo = (z: number): void => zoomAt(z / rig.zoom);

/* ---------- input ---------- */
// The page's px to the monitor's px; null off the glass.
function toMonitor(e: { clientX: number; clientY: number }): [number, number] | null {
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
  const [x0, y0, x1, y1] = glass;
  if (x < x0 || x > x1 || y < y0 || y > y1) return null;
  return [((x - x0) / (x1 - x0)) * SW, ((y - y0) / (y1 - y0)) * SH];
}

function setScope(s: Scope): void {
  scope = s;
  mode = s.id === 'small' ? 'eye' : 'camera';
  document.body.dataset.mode = mode;
  restack = 'reset';
  if (mode === 'camera') {
    rig.zoom = 1;
    rig.panX = rig.panY = 0;
    log('Connected: mount, camera, filter wheel, focuser, guider', 'ok');
    refreshTargets();
  } else select(null);
  resize();
  wake(true);
}

for (const el of document.querySelectorAll<HTMLInputElement>('input[name="scope"]')) {
  el.addEventListener('change', () => setScope(el.value === 'big' ? BIG : SMALL));
}

// The eyepiece case: four eyepieces and the grating.
const caseButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-ep]')];
for (const btn of caseButtons) {
  btn.addEventListener('click', () => {
    const v = btn.dataset.ep!;
    grating = v === 'grating';
    if (!grating) eyepiece = EYEPIECES[Number(v)] ?? EYEPIECES[0];
    for (const o of caseButtons) o.setAttribute('aria-pressed', String(o === btn));
    wake(true);
  });
}
const driveBtn = $<HTMLButtonElement>('drive');
driveBtn.addEventListener('click', () => {
  drive = !drive;
  driveBtn.setAttribute('aria-pressed', String(drive));
  wake(true);
});

/* ---------- tooltips on the page ---------- */
const tipEl = $<HTMLDivElement>('tip');
let pageTip: HTMLElement | null = null;
let pageTimer = 0;
const eyeCtx = (): EyeCtx => ({ fwhm: fwhm(), dec: raDec(aim).dec, drive });

function showPageTip(el: HTMLElement): void {
  const t = tipsOn ? eyeTip(el.dataset.tip ?? '', eyeCtx()) : null;
  if (!t) return;
  const b = document.createElement('b');
  b.textContent = t.title;
  const p = document.createElement('span');
  p.textContent = t.text;
  tipEl.replaceChildren(b, p);
  if (t.try) {
    const em = document.createElement('em');
    em.textContent = t.try;
    tipEl.append(em);
  }
  tipEl.hidden = false;
  // Above the control, inside the window.
  const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const y = r.top - h - 10 >= 8 ? r.top - h - 10 : r.bottom + 10;
  tipEl.style.left = `${Math.round(x)}px`;
  tipEl.style.top = `${Math.round(y)}px`;
  el.setAttribute('aria-describedby', 'tip');
  pageTip = el;
}

function hidePageTip(): void {
  clearTimeout(pageTimer);
  tipEl.hidden = true;
  pageTip?.removeAttribute('aria-describedby');
  pageTip = null;
}

for (const el of document.querySelectorAll<HTMLElement>('[data-tip]')) {
  el.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(pageTimer);
    pageTimer = window.setTimeout(() => showPageTip(el), TIP_DWELL);
  });
  el.addEventListener('pointerleave', hidePageTip);
  // Keyboard focus shows the tip at once.
  el.addEventListener('focusin', () => { if (el.querySelector(':focus-visible') || el.matches(':focus-visible')) showPageTip(el); });
  el.addEventListener('focusout', hidePageTip);
  // A click changes the state, so the open tip reads it again.
  el.addEventListener('click', () => { if (pageTip === el) showPageTip(el); });
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePageTip(); });

stage.addEventListener('keydown', (e) => {
  if (mode === 'camera') {
    // The program's keys, as its function-key bar shows them.
    const fkeys: Record<string, () => void> = {
      F1: actions.tips, F2: actions.slewSelected, F3: actions.startStop, F6: actions.autofocus, F8: actions.guide, F9: actions.night,
      F4: () => {
        const fs: Filter[] = ['L', 'R', 'G', 'B', 'Hα'];
        actions.filter(fs[(fs.indexOf(rig.filter) + 1) % fs.length]);
      },
    };
    if (fkeys[e.key]) fkeys[e.key]();
    else if (/^[1-6]$/.test(e.key)) actions.goto(Number(e.key) - 1);
    else if (e.key === '+' || e.key === '=') zoomAt(1.5);
    else if (e.key === '-') zoomAt(1 / 1.5);
    else if (e.key === 'f' || e.key === 'F') actions.fit();
    else if (e.key === 'z' || e.key === 'Z') actions.one();
    else if (e.key === ' ') actions.startStop();
    else if (e.key === 't' || e.key === 'T') actions.track();
    else if (e.key === 'h' || e.key === 'H') actions.tips();
    else if (e.key === '[') actions.focusStep(-1);
    else if (e.key === ']') actions.focusStep(1);
    else if (e.key.startsWith('Arrow')) {
      // Arrows nudge the mount by a tenth of the view.
      // Shift makes the nudge a fiftieth.
      const L = lastLayout();
      const d = (IMG.w / L.scale) / (e.shiftKey ? 50 : 10);
      const n = e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0;
      const east = e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0;
      const fr = skyFrame(aim);
      if (aimAt(norm({ x: aim.x + fr.u.x * n - fr.r.x * east, y: aim.y + fr.u.y * n - fr.r.y * east, z: aim.z + fr.u.z * n - fr.r.z * east }))) restack = 'reset';
    } else return;
    e.preventDefault();
    uiDirty = true;
    wake(true);
    return;
  }
  const k = e.shiftKey ? 0.025 : 0.25;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [0, -k], ArrowRight: [0, k], ArrowUp: [k, 0], ArrowDown: [-k, 0],
  };
  const m = moves[e.key];
  if (!m) return;
  e.preventDefault();
  nudge(m[0], m[1]);
});

// Eyepiece: a drag moves the tube, the wheel turns the focus knob.
// Monitor: the software's buttons, then the image: drag pans, click picks, double-click slews.
let drag: { x: number; y: number; x0: number; y0: number; t0: number; moved: boolean; act: (() => void) | null } | null = null;
stage.addEventListener('pointerdown', (e) => {
  stage.focus();
  tipSince = performance.now();
  let act: (() => void) | null = null;
  if (mode === 'camera') {
    const m = toMonitor(e);
    act = m ? screen.hitAt(m[0], m[1]) : null;
  }
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, act };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (mode === 'camera') {
    const m = toMonitor(e) ?? [-1, -1];
    if (m[0] !== screen.hover[0] || m[1] !== screen.hover[1]) {
      screen.hover = m;
      const id = screen.tipAt(m[0], m[1]);
      if (id !== tipId) {
        tipId = id;
        tipPinned = false;
        tipSince = performance.now();
        clearTimeout(tipTimer);
        if (id && tipsOn) tipTimer = window.setTimeout(() => { uiDirty = true; wake(true); }, TIP_DWELL + 20);
      }
      uiDirty = true;
      wake(true);
    }
  }
  if (!drag || !renderer || drag.act) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
  drag.moved = true;
  const dpr = window.devicePixelRatio || 1;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  const L = lastLayout();
  if (mode === 'camera') {
    if (rig.zoom <= 1.001) return;
    // Monitor px per page px.
    const k = SW / ((glass[2] - glass[0]) / dpr);
    rig.panX -= (dx * k) / L.scale;
    rig.panY += (dy * k) / L.scale;
    clampPan();
    restack = restack === 'reset' ? 'reset' : 'reframe';
    wake(true);
    return;
  }
  // Degrees per CSS px at the field centre.
  const perPx = dpr / L.scale / RAD;
  // Azimuth steps widen toward the zenith by one over cos(alt).
  const cosAlt = Math.max(0.2, Math.cos(pose.alt * RAD));
  setPose(pose.alt + dy * perPx, pose.az - (dx * perPx) / cosAlt);
});
stage.addEventListener('pointerup', (e) => {
  if (drag && mode === 'camera') {
    const m = toMonitor(e);
    if (drag.act) {
      if (m && screen.hitAt(m[0], m[1]) === drag.act) drag.act();
      uiDirty = true;
      wake(true);
    } else if (!drag.moved && performance.now() - drag.t0 < 400 && m && screen.inImage(m[0], m[1])) {
      const b = pickAt(m[0], m[1]);
      if (b && b !== selected) select(b);
    } else if (!drag.moved && m && screen.tipAt(m[0], m[1])) {
      // A click on a readout opens its tip at once.
      tipId = screen.tipAt(m[0], m[1]);
      tipSince = performance.now() - TIP_DWELL;
      tipPinned = true;
      uiDirty = true;
      wake(true);
    }
  }
  drag = null;
});
const endDrag = (): void => { drag = null; };
stage.addEventListener('pointerleave', () => {
  if (mode !== 'camera') return;
  screen.hover = [-1, -1];
  tipId = null;
  uiDirty = true;
  wake(true);
});
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('lostpointercapture', endDrag);
stage.addEventListener('dblclick', (e) => {
  if (mode !== 'camera' || !renderer) return;
  const m = toMonitor(e);
  if (!m || !screen.inImage(m[0], m[1])) return;
  const L = lastLayout();
  const X = (m[0] - L.cx) / L.scale, Y = -(m[1] - L.cy) / L.scale;
  const fr = L.fr;
  slewTo(norm({ x: fr.f.x + X * fr.r.x + Y * fr.u.x, y: fr.f.y + X * fr.r.y + Y * fr.u.y, z: fr.f.z + X * fr.r.z + Y * fr.u.z }), 'the clicked point');
});
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (mode === 'eye') {
    // The focus knob: one notch moves the drawtube about a millimetre.
    eyeFocus = Math.max(-40, Math.min(40, eyeFocus + e.deltaY * 0.012));
    wake(true);
    return;
  }
  const m = toMonitor(e);
  if (m && screen.inImage(m[0], m[1])) zoomAt(Math.pow(1.0015, -e.deltaY), m[0], m[1]);
}, { passive: false });

function resize(): void {
  if (!renderer) return;
  const dpr = window.devicePixelRatio || 1;
  const cw = Math.round(stage.clientWidth * dpr), ch = Math.round(stage.clientHeight * dpr);
  if (mode === 'eye') renderer.resize(cw, ch, cw, ch);
  else {
    renderer.resize(cw, ch, SW, SH);
    // The panel fills the view; black bars take up any difference in shape.
    const w = Math.min(cw, ch * (SW / SH)), h = w * (SH / SW);
    const x0 = (cw - w) / 2, y0 = (ch - h) / 2;
    glass = [x0, y0, x0 + w, y0 + h];
  }
  clampPan();
  restack = 'reset';
  uiDirty = true;
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

// The grating's atlas: one model spectrum per row of temperature.
function buildAtlas(): Uint8Array {
  const out = new Uint8Array(ATLAS_ROWS * ATLAS_COLS);
  for (let row = 0; row < ATLAS_ROWS; row++) {
    const T = Math.exp(Math.log(T_LO) + (row / (ATLAS_ROWS - 1)) * (Math.log(T_HI) - Math.log(T_LO)));
    const s = model({ teff: T, galaxy: 'none', redshift: 0 });
    for (let c = 0; c < ATLAS_COLS; c++) out[row * ATLAS_COLS + c] = Math.round(255 * s[Math.round((c / (ATLAS_COLS - 1)) * (BINS - 1))]);
  }
  return out;
}

// The brightest star the tube can reach now: the first view.
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

// QA hooks: read the view, aim, pick a target, switch telescopes.
(window as unknown as { __sim: unknown }).__sim = {
  shown: () => shown.map((s) => ({ name: s.b.name, galaxy: s.b.galaxy, mag: s.b.mag, x: s.x, y: s.y })),
  goto: (ra: number, dec: number): void => {
    if (mode === 'camera') {
      if (aimAt(shellDir(ra, dec))) restack = 'reset';
      wake(true);
      return;
    }
    const p = shellToPose(shellDir(ra, dec), rowsNow());
    setPose(p.alt, p.az);
  },
  scope: (id: 'small' | 'big'): void => {
    const el = document.querySelector<HTMLInputElement>(`input[name="scope"][value="${id}"]`);
    if (el) el.checked = true;
    setScope(id === 'big' ? BIG : SMALL);
  },
  pick: (name: string): boolean => {
    const s = shown.find((v) => v.b.name === name);
    if (s) select(s.b);
    return !!s;
  },
  focus: (mm: number): void => { eyeFocus = mm; wake(true); },
  rig,
  // The program's buttons, its tips and its log.
  actions,
  tipAt: (x: number, y: number): string | null => screen.tipAt(x, y),
  tip: (id: string): ReturnType<typeof programTip> => programTip(id, tipCtx(lst(skyMs(), LON))),
  get glass() { return glass; },
  get log() { return logText(); },
  get tipsOn() { return tipsOn; },
  get state() { return { subs, hfr: hfrNow, stats, eyepiece: eyepiece.mm, grating, drive, eyeFocus, pose, zoom: rig.zoom, selected: selected?.name ?? null, targets: targets.map((t) => t.name) }; },
};

async function boot(): Promise<void> {
  try {
    renderer = new Renderer(view);
  } catch (err) {
    console.error(err);
    failLine.hidden = false;
    // A missing feature and a shader fault need different words.
    const msg = err instanceof Error ? err.message : '';
    failLine.textContent = msg === 'webgl2' || msg === 'float targets'
      ? 'This simulator needs WebGL 2 with float render targets.'
      : 'Telescope simulator could not start.';
    statusLine.hidden = true;
    return;
  }
  const stars = await loadStars(new URL('../../stars.bin', import.meta.url).href);
  setCatalog(stars);
  renderer.setAtlas(buildAtlas(), ATLAS_COLS, ATLAS_ROWS);
  statusLine.hidden = true;
  // The toy's picked star comes first; else the brightest star up.
  const b = Number.isFinite(START_RA) && Number.isFinite(START_DEC) ? shellDir(START_RA, START_DEC) : brightest();
  if (b) {
    aim = { x: b.x, y: b.y, z: b.z };
    pose = shellToPose(aim, rowsNow());
  }
  // The toy names the telescope it looks through.
  if (params.get('scope') === 'big') {
    const el = document.querySelector<HTMLInputElement>('input[name="scope"][value="big"]');
    if (el) el.checked = true;
    setScope(BIG);
  }
  resize();
  toToy('ready');
}

// Esc in the frame, or the back button, returns to the dome.
if (EMBED) {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    toToy('close');
  });
  document.getElementById('back')?.addEventListener('click', () => toToy('close'));
}

boot().catch((err: unknown) => {
  console.error(err);
  failLine.hidden = false;
  failLine.textContent = 'Telescope simulator could not start.';
});
