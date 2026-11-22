// The telescope simulator: the great refractor's eyepiece, or the 1 m reflector's camera.
// The loop runs while input is recent, or a measurement or exposure runs.
// Then it sleeps.
import { loadStars } from '../core/catalog.ts';
import { lst, shellDir } from '../core/sky.ts';
import type { Vec3 } from '../core/sky.ts';
import { bodiesNear, catalogBodies, galLat, setCatalog, type Body } from './field.ts';
import {
  ALT_MAX, ALT_MIN, BIG, EYEPIECES, EYE_LIMIT, LAT, LON, SMALL, airmass, clampPose, diffraction, dirOf,
  extinction, flux, gather, magnification, seeingAt, shellFrame, shellToPose, skyRows, toShell, trueField,
  type Eyepiece, type Frame, type Pose, type Scope,
} from './optics.ts';
import { Renderer, STRIDE } from './render.ts';
import { Run, classFromTeff, cosmology, isFound } from './spectrum.ts';
import { drawSpectrum, rows } from './panel.ts';
import { FILTERS, PIXEL_ARCSEC, PIXEL_RAD, SENSOR_H, SENSOR_W, darkRate, defocusArcsec, hfrAt, rig, stepRig } from './rig.ts';
import { frameOS, initOS, log, type Info } from './os.ts';

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
// The spectrograph's S/N after 1 s grows with this power of the light.
// A true square root would finish bright stars in one frame.
const SPEC_POW = 0.25;
const SPEC_GAIN = 4;
// The measurement stops here, so the loop can sleep.
const SNR_CAP = 300;
// The camera stops looping after this long without input, in ms.
const CAMERA_IDLE = 10 * 60 * 1000;
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
const stretchIn = $<HTMLInputElement>('stretch');
const readout = $<HTMLElement>('readout');
const targetName = $<HTMLElement>('target-name');
const targetInfo = $<HTMLElement>('target-info');
const specCanvas = $<HTMLCanvasElement>('spectrum');
const specInfo = $<HTMLElement>('spec-info');
const compList = $<HTMLElement>('composition');

/* ---------- state ---------- */
type Mode = 'eye' | 'camera';
let mode: Mode = 'eye';
let scope: Scope = SMALL;
let eyepiece: Eyepiece = EYEPIECES[0];
let pose: Pose = clampPose(40, 180);
// With tracking, the aim holds still on the sky in shell axes.
let aim: Vec3 = { x: 1, y: 0, z: 0 };
let renderer: Renderer | null = null;
let data = new Float32Array(STRIDE * 4096);
// The bodies drawn last frame, in CSS px, for picks.
let shown: { b: Body; x: number; y: number }[] = [];
// The camera's detected stars, in CSS px.
let detected: { b: Body; x: number; y: number }[] = [];
let selected: Body | null = null;
let run: Run | null = null;
let lastInput = 0;
let raf = 0;
let lastT = 0;
let lastDraw = 0;
let lastPanel = 0;
// Camera: time into the current sub, subs in the stack, pending stack work.
let subClock = 0;
let subs = 0;
let restack: 'none' | 'reset' | 'reframe' = 'reset';
let hfrNow = 0;
let stats = { mean: 0, med: 0, sd: 0, max: 0, hist: [] as number[] };
// Seeing: tip-tilt in px and a slow breath of the disc.
let jx = 0, jy = 0, breath = 0;

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

// The camera's fit scale in device px per radian.
function fitScale(W: number, H: number): { s: number; rw: number; rh: number } {
  const sf = scope.field, aspect = sf.w / sf.h;
  const rw = Math.min(W * 0.98, H * 0.98 * aspect), rh = rw / aspect;
  return { s: rw / 2 / Math.tan((sf.w / 2) * RAD), rw, rh };
}

// Where the field sits on the canvas, in device px.
function layout(lstDeg: number): Layout {
  const W = renderer!.w, H = renderer!.h;
  const cx = W / 2, cy = H / 2;
  if (mode === 'eye') {
    const radius = 0.46 * Math.min(W, H), half = trueField(eyepiece) / 2;
    const fr = shellFrame(pose, lstDeg);
    return { cx, cy, radius, scale: radius / Math.tan(half * RAD), rect: [0, 0, W, H], cull: half * 1.15 + 0.02, centre: fr.f, fr };
  }
  const fit = fitScale(W, H);
  const scale = fit.s * rig.zoom;
  const rect: [number, number, number, number] = [cx - fit.rw / 2, cy - fit.rh / 2, cx + fit.rw / 2, cy + fit.rh / 2];
  const fr = skyFrame(aim);
  const tw = Math.tan((scope.field.w / 2) * RAD) / rig.zoom, th = Math.tan((scope.field.h / 2) * RAD) / rig.zoom;
  const centre = norm({
    x: fr.f.x + rig.panX * fr.r.x + rig.panY * fr.u.x,
    y: fr.f.y + rig.panX * fr.r.y + rig.panY * fr.u.y,
    z: fr.f.z + rig.panX * fr.r.z + rig.panY * fr.u.z,
  });
  return {
    cx: cx - rig.panX * scale, cy: cy + rig.panY * scale, scale, radius: fit.rw / 2, rect,
    cull: Math.atan(Math.hypot(tw, th)) / RAD * 1.1 + 0.03, centre, fr,
  };
}

// Device px per sensor pixel.
const kOf = (L: Layout): number => L.scale * PIXEL_RAD;

// Keeps the crop inside the sensor.
function clampPan(): void {
  const tw = Math.tan((scope.field.w / 2) * RAD), th = Math.tan((scope.field.h / 2) * RAD);
  const mx = tw * (1 - 1 / rig.zoom), my = th * (1 - 1 / rig.zoom);
  rig.panX = Math.max(-mx, Math.min(mx, rig.panX));
  rig.panY = Math.max(-my, Math.min(my, rig.panY));
}

// The seeing disc's FWHM in arcsec at the tube's altitude.
const fwhm = (): number => Math.hypot(seeingAt(Number(seeingIn.value), pose.alt), diffraction(scope));

const tracking = (): boolean => (mode === 'eye' ? trackIn.checked : rig.tracking);

/* ---------- pointing ---------- */
const skyMs = (): number => Date.now();

function rowsNow(): number[] {
  return skyRows(lst(skyMs(), LON), LAT);
}

// Moves the tube to a pose; with tracking, the aim follows.
function setPose(alt: number, az: number): void {
  pose = clampPose(alt, az);
  aim = toShell(dirOf(pose.alt, pose.az), rowsNow());
  restack = 'reset';
  wake(true);
}

const nudge = (dAlt: number, dAz: number): void => setPose(pose.alt + dAlt, pose.az + dAz);

// Points the camera's aim at d, if the mount can reach it.
function aimAt(d: Vec3): boolean {
  const p = shellToPose(d, rowsNow());
  if (p.alt < ALT_MIN || p.alt > ALT_MAX) return false;
  aim = d;
  pose = p;
  return true;
}

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
  const rd = raDec(d);
  log(`Slewing to ${label}: RA ${fmtRa(rd.ra)}, Dec ${fmtDec(rd.dec)} (${ang.toFixed(1)}°)`);
  wake(true);
  return true;
}

// The aim's RA and Dec, for the readout.
function raDec(s: Vec3): { ra: number; dec: number } {
  return { ra: ((Math.atan2(-s.y, s.x) / RAD) % 360 + 360) % 360, dec: Math.asin(Math.max(-1, Math.min(1, s.z))) / RAD };
}

// Moves the camera's mount: slews, jogs and the sky's drift.
function moveMount(dt: number, rows: number[]): boolean {
  if (rig.slew) {
    const s = rig.slew;
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
  if (rig.jog.n || rig.jog.e) {
    const fr = skyFrame(aim);
    const d = dt * RAD;
    // East is left in the image, so east is minus image right.
    const next = norm({
      x: aim.x + (fr.u.x * rig.jog.n - fr.r.x * rig.jog.e) * d,
      y: aim.y + (fr.u.y * rig.jog.n - fr.r.y * rig.jog.e) * d,
      z: aim.z + (fr.u.z * rig.jog.n - fr.r.z * rig.jog.e) * d,
    });
    if (!aimAt(next)) {
      rig.jog.n = rig.jog.e = 0;
      log(`Mount limit: altitude stays between ${ALT_MIN}° and ${ALT_MAX}°`, 'w');
    }
    return true;
  }
  return false;
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

// Sky glow per device px per second, from the sky's surface brightness.
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

// Fills the body instances for this frame and returns how many.
function build(L: Layout): number {
  const fr = L.fr;
  const ext = extinction(pose.alt);
  const seeing = fwhm() * (mode === 'eye' ? 1 + 0.12 * breath : 1.1);
  const alpha = Math.max(mode === 'eye' ? 0.8 : 0.9, (seeing * ARCSEC * L.scale) / 1.0196);
  const limit = mode === 'eye' ? EYE_LIMIT + 0.6 : scope.limit;
  const spikes = scope.spikeAxes > 0;
  const light = gather(scope);
  const camera = mode === 'camera';
  // The faintest light worth a quad.
  // The eye has a fixed floor; the camera uses a share of the sky.
  const floor = camera ? skyGlow(L) * light * 0.02 : 2e-4;
  const defocus = camera ? defocusArcsec() * ARCSEC * L.scale : 0;
  const dpr = window.devicePixelRatio || 1;
  const near = bodiesNear(L.centre, L.cull, scope.id === 'big');
  // Sky electrons per sensor pixel per second, through the filter.
  const w = FILTERS[rig.filter];
  const skyS = flux(scope.sky) * PIXEL_ARCSEC * PIXEL_ARCSEC * light * (w[0] + w[1] + w[2]) * EGAIN;
  const [x0, y0, x1, y1] = L.rect;
  let n = 0;
  shown = [];
  detected = [];
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
    const F = flux(mag) * light;
    const [r, g, bl] = b.rgb;
    let half: number;
    if (b.galaxy === 'none') {
      const spike = spikes ? Math.min(L.radius * 0.25, 0.25 * Math.pow(F, 0.4)) : 0;
      half = Math.min(600, Math.max(3, reach(alpha, F, floor), spike * 4, defocus + 3));
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
      half = Math.min(500, re * 7 / Math.max(0.3, b.q));
      if (px + half < x0 || px - half > x1 || py + half < y0 || py - half > y1) continue;
      push([px, py, half, 1, r, g, bl, F, re, b.q, b.pa, b.galaxy === 'spiral' ? 1 : 0]);
    }
    const inside = camera
      ? px > x0 && px < x1 && py > y0 && py < y1
      : Math.hypot(px - L.cx, py - L.cy) < L.radius;
    if (!inside) continue;
    shown.push({ b, x: px / dpr, y: py / dpr });
    if (camera && snrOf(F, b.rgb, skyS) > 6) detected.push({ b, x: px / dpr, y: py / dpr });
  }
  return n;
}

function frame(t: number): void {
  raf = 0;
  if (!renderer) return;
  const lively = t - lastInput < 1200;
  const camera = mode === 'camera';
  const moving = camera && (!!rig.slew || !!rig.jog.n || !!rig.jog.e || !rig.tracking);
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
  const k = kOf(L);
  renderer.bodies(data, n, {
    u_beta: BETA,
    u_spikes: scope.spikeAxes > 0 ? 0.008 : 0,
    u_spikeAxes: Math.max(1, scope.spikeAxes),
    u_halo: camera ? 0.015 : 0.06,
    u_defocus: camera ? defocusArcsec() * ARCSEC * L.scale : 0,
    u_obstr: OBSTRUCTION,
  });
  if (!camera) {
    // The dark-adapted eye barely sees the sky glow.
    renderer.eye({
      ...common, u_bg: common.u_bg.map((v) => v * 0.3), u_mw: common.u_mw * 0.5,
      u_radius: L.radius, u_gain: 2.2, u_glare: 0.04, u_ca: 1.6,
      u_grain: still ? 0 : 0.007, u_time: t / 1000,
    });
  } else {
    const exp = rig.exposure;
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
      renderer.stack({
        ...common, u_mix: mix, u_noise: noiseK, u_exp: exp, u_egain: EGAIN, u_read: READ, u_full: FULL,
        u_seed: random() * 100, u_filter: FILTERS[rig.filter], u_dark: darkRate(), u_hot: 300 * Math.pow(2, (rig.sensorTemp + 10) / 6),
        u_amp: 0.6 * Math.pow(2, (rig.sensorTemp + 10) / 6), u_k: k,
        u_origin: [L.cx - (SENSOR_W / 2) * k, L.cy - (SENSOR_H / 2) * k], u_sensor: [SENSOR_W, SENSOR_H],
      });
    }
    // The stretch: sky level and noise per screen pixel.
    const w = FILTERS[rig.filter];
    const area = 1 / (k * k);
    const skyE = glow * (w[0] + w[1] + w[2]) * (1 + 2.2 * 0.45 * Math.exp(-b / 8)) * exp * EGAIN + darkRate() * exp * area;
    const sub = k >= 1 ? Math.sqrt(skyE / area + READ * READ) * area : Math.sqrt(skyE + area * READ * READ);
    const sigma = sub / Math.sqrt(rig.liveStack ? Math.max(1, subs) : 1);
    const black = Math.max(0, skyE - 2 * sigma), soft = Math.max(1e-6, sigma * Number(stretchIn.value));
    const white = FULL * area;
    renderer.camera({ ...common, u_rect: L.rect, u_black: black, u_soft: soft, u_white: white });
    if (fresh && t - lastPanel > 150) readStats(L, black, soft, white, area);
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
  const exposing = camera && (rig.looping || rig.autofocus) && t - lastInput < CAMERA_IDLE;
  const ambient = !camera && !still && t - lastInput < 60000;
  if (camera && rig.looping && t - lastInput >= CAMERA_IDLE) {
    rig.looping = false;
    log('Exposures paused after 10 minutes without input', 'w');
  }
  if (lively || integrating || exposing || ambient || moving) raf = requestAnimationFrame(frame);
}

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
  const sorted = [...adu].sort((a, b) => a - b);
  const mean = adu.reduce((a, b) => a + b, 0) / adu.length;
  const sd = Math.sqrt(adu.reduce((a, b) => a + (b - mean) ** 2, 0) / adu.length);
  stats = { mean, med: sorted[sorted.length >> 1], sd, max: sorted[sorted.length - 1], hist };
}

function wake(input = false): void {
  if (input) lastInput = performance.now();
  if (!raf && !document.hidden && renderer) {
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }
}

/* ---------- the HUD ---------- */
// A round scale-bar length for a span of pixels.
function niceBar(arcsecPerCss: number): { px: number; label: string } {
  const steps = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600];
  for (const s of steps) {
    if (s / arcsecPerCss >= 60) return { px: s / arcsecPerCss, label: s >= 60 ? `${s / 60}′` : `${s}″` };
  }
  return { px: 600 / arcsecPerCss, label: '10′' };
}

function drawHud(L: Layout): void {
  const dpr = window.devicePixelRatio || 1;
  const W = stage.clientWidth, H = stage.clientHeight;
  if (hud.width !== Math.round(W * dpr) || hud.height !== Math.round(H * dpr)) {
    hud.width = Math.round(W * dpr);
    hud.height = Math.round(H * dpr);
  }
  const g = hud.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  if (mode === 'camera') {
    const [x0, y0, x1, y1] = L.rect.map((v) => v / dpr);
    g.save();
    g.beginPath();
    g.rect(x0, y0, x1 - x0, y1 - y0);
    g.clip();
    const cx = L.cx / dpr, cy = L.cy / dpr;
    if (rig.overlay.cross) {
      g.strokeStyle = 'rgba(230, 80, 70, 0.55)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x0, cy + 0.5); g.lineTo(x1, cy + 0.5);
      g.moveTo(cx + 0.5, y0); g.lineTo(cx + 0.5, y1);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, 24, 0, Math.PI * 2);
      g.stroke();
    }
    if (rig.overlay.stars) {
      g.strokeStyle = 'rgba(92, 194, 122, 0.8)';
      g.fillStyle = 'rgba(92, 194, 122, 0.9)';
      g.font = '10px Consolas, monospace';
      const r = Math.max(4, (hfrNow * 2 * kOf(L)) / dpr);
      const showNum = kOf(L) / dpr >= 0.5;
      for (const d of detected.slice(0, 400)) {
        g.beginPath();
        g.arc(d.x, d.y, r, 0, Math.PI * 2);
        g.stroke();
        if (showNum) g.fillText(hfrNow.toFixed(2), d.x + r + 2, d.y + 3);
      }
    }
    if (rig.overlay.labels) {
      g.fillStyle = 'rgba(232, 180, 106, 0.9)';
      g.font = '11px "Segoe UI", system-ui, sans-serif';
      const named = detected.filter((d) => d.b.catalog || d.b.galaxy !== 'none').sort((a, b) => a.b.mag - b.b.mag).slice(0, 40);
      for (const d of named) g.fillText(`${d.b.name}  ${d.b.mag.toFixed(1)}`, d.x + 8, d.y - 6);
    }
    if (selected) {
      const s = shown.find((v) => v.b === selected);
      if (s) {
        g.strokeStyle = 'rgba(232, 180, 106, 0.95)';
        g.lineWidth = 1;
        g.strokeRect(s.x - 12, s.y - 12, 24, 24);
      }
    }
    g.restore();
    // The compass: north up, east left.
    g.fillStyle = 'rgba(220, 223, 228, 0.8)';
    g.strokeStyle = 'rgba(220, 223, 228, 0.8)';
    g.font = '11px "Segoe UI", system-ui, sans-serif';
    const ox = x0 + 26, oy = y0 + 34;
    g.beginPath();
    g.moveTo(ox, oy); g.lineTo(ox, oy - 20);
    g.moveTo(ox, oy); g.lineTo(ox - 20, oy);
    g.stroke();
    g.fillText('N', ox - 3, oy - 24);
    g.fillText('E', ox - 32, oy + 4);
    // The scale bar.
    const bar = niceBar(1 / (L.scale * ARCSEC) * dpr);
    g.fillRect(x0 + 14, y1 - 16, bar.px, 2);
    g.fillText(bar.label, x0 + 14, y1 - 22);
    if (rig.slew || rig.autofocus) {
      g.font = '600 12px "Segoe UI", system-ui, sans-serif';
      g.fillStyle = rig.slew ? 'rgba(224, 166, 74, 0.95)' : 'rgba(90, 162, 230, 0.95)';
      g.textAlign = 'center';
      g.fillText(rig.slew ? 'SLEWING' : 'AUTOFOCUS', (x0 + x1) / 2, y0 + 20);
      g.textAlign = 'left';
    }
    return;
  }
  if (selected) {
    const s = shown.find((v) => v.b === selected);
    if (s) {
      g.strokeStyle = 'rgba(255, 210, 140, 0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(s.x, s.y, 11, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

/* ---------- the panels ---------- */
const fmtRa = (ra: number): string => {
  const h = ra / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = Math.round(((h - hh) * 60 - mm) * 60) % 60;
  return `${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
};
const fmtDec = (dec: number): string => {
  const a = Math.abs(dec), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60) % 60;
  return `${dec < 0 ? '−' : '+'}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${String(s).padStart(2, '0')}″`;
};
const fmtLst = (lstDeg: number): string => {
  const h = lstDeg / 15;
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
};

function panel(L: Layout, lstDeg: number, inView: boolean): void {
  const rd = raDec(aim);
  if (mode === 'eye') {
    readout.textContent = [
      `RA ${fmtRa(rd.ra)}  Dec ${fmtDec(rd.dec)}`,
      `Alt ${pose.alt.toFixed(1)}°  Az ${pose.az.toFixed(1)}°  Air mass ${airmass(pose.alt).toFixed(2)}`,
      `Field ${trueField(eyepiece).toFixed(2)}° · ${Math.round(magnification(eyepiece))}×  Seeing ${fwhm().toFixed(1)}″  ${shown.length} in view`,
      `LST ${fmtLst(lstDeg)}  ${new Date(skyMs()).toLocaleTimeString()}`,
    ].join('\n');
    altIn.value = pose.alt.toFixed(1);
    azIn.value = pose.az.toFixed(1);
  } else {
    const k = kOf(L), dpr = window.devicePixelRatio || 1;
    const pct = (k / dpr) * 100;
    const state = rig.slew ? 'Slewing' : rig.jog.n || rig.jog.e ? 'Jogging' : rig.autofocus ? 'Autofocus'
      : !rig.looping ? 'Idle' : `Exposing ${subClock.toFixed(1)} / ${rig.exposure} s · ${rig.filter}`;
    const info: Info = {
      ra: fmtRa(rd.ra), dec: fmtDec(rd.dec), alt: `${pose.alt.toFixed(2)}°`, az: `${pose.az.toFixed(2)}°`,
      lst: fmtLst(lstDeg), air: airmass(pose.alt).toFixed(3),
      state, progress: rig.looping ? Math.min(1, subClock / rig.exposure) : 0, subs,
      scale: `${PIXEL_ARCSEC.toFixed(3)}″/px`,
      zoom: `${rig.zoom <= 1.001 ? 'Fit ' : ''}${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`,
      mean: stats.mean.toFixed(0), med: stats.med.toFixed(0), sd: stats.sd.toFixed(1), max: stats.max.toFixed(0),
      hfr: hfrNow.toFixed(2), stars: String(detected.length), hist: stats.hist,
    };
    frameOS(info);
    stage.classList.toggle('pan', rig.zoom > 1.001);
  }
  // The target card and the spectrograph.
  if (!selected) {
    targetName.textContent = 'No target';
    targetInfo.textContent = mode === 'camera' ? 'Click a star or a galaxy in the image.' : 'Tap a star or a galaxy in the view.';
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
  } else {
    // A redshift needs a line from the galaxy itself, not from our air.
    const own = found.filter((f) => isFound(f) && f.el !== 'O₂');
    if (own.length) {
      const err = (0.02 * (1 + b.redshift)) / run.snr;
      const z = Math.max(0, b.redshift + zDraw * err * 0.5);
      const c = cosmology(z);
      const best = [...own].sort((p, q) => q.depth / q.sigma - p.depth / p.sigma)[0];
      const ago = c.lookback < 1 ? `${Math.round(c.lookback * 1000)} million` : `${c.lookback.toFixed(1)} billion`;
      lines.push(`Redshift z = ${z.toFixed(z < 0.1 ? 4 : 3)} ± ${err.toFixed(z < 0.1 ? 4 : 3)}, from ${best.id}`);
      lines.push(`Its light left ${ago} years ago · ${Math.round(c.distance).toLocaleString()} Mpc`);
    } else lines.push('Redshift: no galaxy line yet');
  }
  specInfo.textContent = lines.join('\n');
  compList.replaceChildren(...rows(found).map((r) => {
    const li = document.createElement('li');
    li.className = r.found ? 'found' : '';
    const bar = document.createElement('span');
    bar.className = 'bar2';
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
  run = b ? new Run({ teff: b.teff, galaxy: b.galaxy, redshift: b.redshift }, SPEC_GAIN * Math.pow(flux(b.mag + extinction(pose.alt)) * gather(scope), SPEC_POW)) : null;
  if (b && mode === 'camera') log(`Target: ${b.name}, mag ${b.mag.toFixed(1)}`);
  lastPanel = 0;
  wake(true);
}

// The body nearest a point in CSS px, weighted toward bright ones.
function pickAt(x: number, y: number): Body | null {
  let best: Body | null = null, score = Infinity;
  for (const s of shown) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d > 24) continue;
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

// Zooms by f, keeping the sky under (ax, ay) in device px still.
function zoomAt(f: number, ax?: number, ay?: number): void {
  if (!renderer) return;
  const L = lastLayout();
  const fit = fitScale(renderer.w, renderer.h);
  const one = (window.devicePixelRatio || 1) / (fit.s * PIXEL_RAD);
  const next = Math.max(1, Math.min(one * 4, rig.zoom * f));
  const x = ax ?? renderer.w / 2, y = ay ?? renderer.h / 2;
  const sx = rig.panX + (x - renderer.w / 2) / L.scale;
  const sy = rig.panY - (y - renderer.h / 2) / L.scale;
  rig.zoom = next;
  const s = fit.s * next;
  rig.panX = sx - (x - renderer.w / 2) / s;
  rig.panY = sy + (y - renderer.h / 2) / s;
  clampPan();
  restack = restack === 'reset' ? 'reset' : 'reframe';
  wake(true);
}

function zoomTo(z: number): void {
  if (!renderer) return;
  zoomAt(z / rig.zoom);
}

/* ---------- Go To ---------- */
const named = new Map<string, Body>();

// Reads "16 00 00 +60 00", "16:00:00 +60:00:00" or "240 60".
function parseCoords(text: string): Vec3 | null {
  const t = text.replace(/[hms°′″'":]/g, ' ').replace(/−/g, '-').trim().split(/\s+/);
  if (t.length === 2 && t.every((v) => /^[+-]?\d+(\.\d+)?$/.test(v))) return shellDir(Number(t[0]), Number(t[1]));
  const i = t.findIndex((v, n) => n > 0 && /^[+-]/.test(v));
  if (i < 1) return null;
  const ra = t.slice(0, i).map(Number), dec = t.slice(i).map((v) => Math.abs(Number(v)));
  if ([...ra, ...dec].some((v) => Number.isNaN(v))) return null;
  const raDeg = 15 * ((ra[0] ?? 0) + (ra[1] ?? 0) / 60 + (ra[2] ?? 0) / 3600);
  const sign = t[i].startsWith('-') ? -1 : 1;
  const decDeg = sign * ((dec[0] ?? 0) + (dec[1] ?? 0) / 60 + (dec[2] ?? 0) / 3600);
  return shellDir(raDeg, decDeg);
}

function gotoText(text: string): boolean {
  if (!text) return false;
  const b = named.get(text.toLowerCase()) ?? shown.find((s) => s.b.name.toLowerCase() === text.toLowerCase())?.b;
  if (b) return slewTo({ x: b.x, y: b.y, z: b.z }, b.name);
  const d = parseCoords(text);
  return d ? slewTo(d, 'coordinates') : false;
}

/* ---------- input ---------- */
// The great refractor takes an eyepiece; the 1 m reflector takes a camera.
function setScope(s: Scope): void {
  scope = s;
  mode = s.id === 'small' ? 'eye' : 'camera';
  document.body.dataset.mode = mode;
  restack = 'reset';
  if (mode === 'camera') {
    rig.zoom = 1;
    rig.panX = rig.panY = 0;
    log('Connected: mount, camera, filter wheel, focuser, guider');
  }
  // The new aperture changes the spectrograph's speed.
  if (selected) select(selected);
  requestAnimationFrame(() => resize());
  wake(true);
}

for (const el of document.querySelectorAll<HTMLInputElement>('input[name="scope"]')) {
  el.addEventListener('change', () => setScope(el.value === 'big' ? BIG : SMALL));
}
altIn.addEventListener('input', () => setPose(Number(altIn.value), pose.az));
azIn.addEventListener('input', () => setPose(pose.alt, Number(azIn.value)));
eyepieceIn.addEventListener('change', () => {
  eyepiece = EYEPIECES[Number(eyepieceIn.value)] ?? EYEPIECES[0];
  wake(true);
});
for (const el of [seeingIn, trackIn]) {
  el.addEventListener('change', () => {
    restack = 'reset';
    wake(true);
  });
}
stretchIn.addEventListener('input', () => wake(true));
const eyeStep = 0.25;
$<HTMLButtonElement>('left').addEventListener('click', () => nudge(0, -eyeStep));
$<HTMLButtonElement>('right').addEventListener('click', () => nudge(0, eyeStep));
$<HTMLButtonElement>('up').addEventListener('click', () => nudge(eyeStep, 0));
$<HTMLButtonElement>('down').addEventListener('click', () => nudge(-eyeStep, 0));
$<HTMLButtonElement>('centre').addEventListener('click', () => {
  if (!selected) return;
  aim = { x: selected.x, y: selected.y, z: selected.z };
  pose = shellToPose(aim, rowsNow());
  setPose(pose.alt, pose.az);
});

stage.addEventListener('keydown', (e) => {
  if (mode === 'camera') {
    if (e.key === '+' || e.key === '=') zoomAt(1.5);
    else if (e.key === '-') zoomAt(1 / 1.5);
    else if (e.key === 'f' || e.key === 'F') zoomTo(1);
    else if (e.key === '1') hooks.oneToOne();
    else if (e.key.startsWith('Arrow')) {
      // Arrows nudge the mount by a tenth of the view.
      // Shift makes the nudge a fiftieth.
      const L = lastLayout();
      const d = ((renderer!.w / L.scale) / (e.shiftKey ? 50 : 10));
      const n = e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0;
      const east = e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0;
      const fr = skyFrame(aim);
      if (aimAt(norm({ x: aim.x + fr.u.x * n - fr.r.x * east, y: aim.y + fr.u.y * n - fr.r.y * east, z: aim.z + fr.u.z * n - fr.r.z * east }))) restack = 'reset';
      wake(true);
    } else return;
    e.preventDefault();
    return;
  }
  const k = e.shiftKey ? eyeStep / 10 : eyeStep;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [0, -k], ArrowRight: [0, k], ArrowUp: [k, 0], ArrowDown: [-k, 0],
  };
  const m = moves[e.key];
  if (!m) return;
  e.preventDefault();
  nudge(m[0], m[1]);
});

// Eyepiece: a drag moves the sky, a tap picks.
// Camera: a drag pans the crop, a click picks, a double-click slews there.
let drag: { x: number; y: number; x0: number; y0: number; t0: number; moved: boolean } | null = null;
stage.addEventListener('pointerdown', (e) => {
  stage.focus();
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || !renderer) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
  drag.moved = true;
  const dpr = window.devicePixelRatio || 1;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  const L = lastLayout();
  if (mode === 'camera') {
    if (rig.zoom <= 1.001) return;
    rig.panX -= (dx * dpr) / L.scale;
    rig.panY += (dy * dpr) / L.scale;
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
  if (drag && !drag.moved && performance.now() - drag.t0 < 400) {
    const r = stage.getBoundingClientRect();
    const b = pickAt(e.clientX - r.left, e.clientY - r.top);
    if (b && b !== selected) select(b);
  }
  drag = null;
});
const endDrag = (): void => { drag = null; };
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('lostpointercapture', endDrag);
stage.addEventListener('dblclick', (e) => {
  if (mode !== 'camera' || !renderer) return;
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const L = lastLayout();
  const X = ((e.clientX - r.left) * dpr - L.cx) / L.scale, Y = -((e.clientY - r.top) * dpr - L.cy) / L.scale;
  const fr = L.fr;
  slewTo(norm({ x: fr.f.x + X * fr.r.x + Y * fr.u.x, y: fr.f.y + X * fr.r.y + Y * fr.u.y, z: fr.f.z + X * fr.r.z + Y * fr.u.z }), 'the clicked point');
  // The slew re-centres; the view returns to the middle of the sensor.
  rig.panX = rig.panY = 0;
});
stage.addEventListener('wheel', (e) => {
  if (mode !== 'camera') return;
  e.preventDefault();
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  zoomAt(Math.pow(1.0015, -e.deltaY), (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
}, { passive: false });

function resize(): void {
  if (!renderer) return;
  const dpr = window.devicePixelRatio || 1;
  renderer.resize(Math.round(stage.clientWidth * dpr), Math.round(stage.clientHeight * dpr));
  clampPan();
  restack = 'reset';
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

const hooks = {
  wake: (): void => wake(true),
  restack: (kind: 'reset' | 'reframe'): void => {
    restack = kind === 'reset' || restack === 'reset' ? 'reset' : 'reframe';
    wake(true);
  },
  zoomBy: (f: number): void => zoomAt(f),
  fit: (): void => {
    rig.panX = rig.panY = 0;
    zoomTo(1);
  },
  oneToOne: (): void => {
    if (!renderer) return;
    const fit = fitScale(renderer.w, renderer.h);
    zoomTo((window.devicePixelRatio || 1) / (fit.s * PIXEL_RAD));
  },
  goto: gotoText,
  slewToSelected: (): boolean => (selected ? slewTo({ x: selected.x, y: selected.y, z: selected.z }, selected.name) : false),
  measure: (pos: number): number => hfrAt(pos, fwhm()),
};

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
  rig,
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
  for (const b of catalogBodies()) if (!/^(HIP|HYG) /.test(b.name)) named.set(b.name.toLowerCase(), b);
  initOS(hooks, [...new Set(catalogBodies().filter((b) => !/^(HIP|HYG) /.test(b.name)).map((b) => b.name))].sort());
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
