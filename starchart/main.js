// Solar loop: a star's edge at a vast scale, graded like film.
// Loops rise and drain; giant prominences stand over the limb.
// A tap flares a region or lifts a prominence off; a drag turns the sun.
// Plan: docs/plans/starchart.md. Toy doc: docs/toys/starchart.md.
import { initPage, whenVisible, pageReady, buildSteps, later, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { R, BCRIT, SPIN_UP, STARS, streamPath, NR, promPhase, bodySize, BODIES, magAxis, SPIN, SPIN_PERIOD, makeSun, strands, startFlare, stepFlares, MAX_FLARES, makeSite, flarePace, flareView, flareCurve, ARCADE, startEruption, stepProms, promApex, LIT_GAIN } from './sun.js';
import { makeRender } from './render.js';
import { makeSound } from './sound.js';
import { makeChart } from './chart.js';
import { glyph } from './glyphs.js';
import { HOLD, CUE, RARE, EGGS, makeCarrington, carrington, CARR_END, makeDimming, dimming, DIM_END, SOUTH, makeVoice, stepVoice, makeSunshine, sunshine, SHIP_END, makeBlueDot, blueDot, DOT_END, DOT_FAR, makePrimes, primes, PULSES, PRIME_END, makeProbe, probe, stepProbe, PROBE_END, makeNotYet, notYet, stepNotYet, NY_PEAK, NY_END } from './eggs.js';
import { makeRail } from './rail.js';
import { makeClock } from './clock.js';
import { makeSStars, YEAR_S } from './sstars.js';
import { makeCard, CARD_STYLES } from './card.js';
import { makeArticle, loadArticles } from './article.js';
import { cardLines } from './facts.js';

// Dev shows always on this toy (Tom, 2026-11-24): the address gains ?dev before the bar reads it.
if (!new URLSearchParams(location.search).has('dev')) {
  const u = new URL(location.href);
  u.searchParams.set('dev', '');
  history.replaceState(history.state, '', u);
}
mark('libs');

const ID = 'starchart';
// The toy was solarloop until 2026-11-24: its saved settings move to the new id once.
try {
  const was = 'stimming.solarloop.', now = `stimming.${ID}.`;
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(was) && localStorage.getItem(now + k.slice(was.length)) == null) localStorage.setItem(now + k.slice(was.length), localStorage.getItem(k));
  }
} catch { /* private mode */ }
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- state ---------- */
const savedStar = store.get('star');
const savedAct = Number(store.get('activity'));
const st = {
  star: STARS[savedStar] ? savedStar : 'sun',
  activity: savedAct >= 0 && savedAct <= 100 && store.get('activity') !== null ? savedAct : 60,
  // The ambient clock: it runs while the toy drifts and stops asleep.
  time: 34,
  pitch: 0, yaw: 0,
  // The pulsar's own clock: a voice egg runs it faster.
  spin: 34,
  // The star's own turn, in star seconds; the rate below sets its pace.
  turn: 34 * SPIN_UP,
  next: 0,
};
/* ---------- turn speed: real time, or x5 to x100 of each star's own base (Tom, 2026-11-24) ---------- */
// At 10x one turn takes 60 to 120 s; a longer true period takes longer.
const TURN_S = [60, 120], TURN_P = [0.22, 5e4];
// The S stars' clock: one year in 1.5 s, so S2 laps in about 24 s.
const S2_DAYS = 16.05 * 365.25, S_RATE = 365.25 * 86400 / YEAR_S;
// Vela's true spin, in s; the toy shows it in SPIN_PERIOD.
const VELA_S = 0.0893;
/**
 * The clock that a star shows, or null when nothing on it keeps time.
 * kind: rot, orb, s2 or spin; days: the true period; fit: the rate at 10x.
 */
function clockOf(key) {
  const B = STARS[key];
  if (key === 'sgra') return { kind: 's2', days: S2_DAYS, fit: S_RATE };
  if (B.ns) { const s = B.ns.real ?? VELA_S; return { kind: 'spin', days: s / 86400, fit: s / spinOf(B) }; }
  // A tidally locked pair turns once per orbit.
  const days = B.day || B.shells?.orbit || B.beat?.days || 0;
  if (!days) return null;
  const f = clamp(Math.log(days / TURN_P[0]) / Math.log(TURN_P[1] / TURN_P[0]));
  const kind = B.day && !B.bin && !B.pair ? 'rot' : 'orb';
  return { kind, days, fit: days * 86400 / (TURN_S[0] + f * (TURN_S[1] - TURN_S[0])) };
}
// id, bar label, times the star's base; real time has none. Unknown stored speeds fall back to x10.
const RATES = [['real', 'Real time', 0], ['x5', '×5', 5], ['x10', '×10', 10], ['x25', '×25', 25], ['x100', '×100', 100]];
const savedRate = RATES.find(r => r[0] === store.get('rate'));
const turn = { pick: savedRate ? savedRate[0] : 'x10', lr: 0, vr: 0, of: '' };
// Activity in words (Tom, 2026-11-24): each step and the strength it sets, 0 to 100.
const ACT_STEPS = [['quiet', 'Quiet', 25], ['active', 'Active', 60], ['stormy', 'Stormy', 95]];
// The nearest step to a stored strength.
const actStep = a => ACT_STEPS.reduce((b, x) => Math.abs(x[2] - a) < Math.abs(b[2] - a) ? x : b)[0];
// Settings > Motion: Calm slows the drift and draws it at half the frame rate.
const calmMotion = () => gv('motion', 'lively') === 'calm';
// The turn button: a circular arrow, then the rate in words (Tom, 2026-11-24).
const rateText = () => RATES.find(r => r[0] === turn.pick)[1];
const TURN_ICON = '<svg class="sl-turn" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 3.8v3.4h-3.4"/></svg>';
const rateLabel = () => `${TURN_ICON}<span>${rateText()}</span>`;
// The log of a star's rate at 10x; 4 when the star keeps no time.
const fitLog = key => Math.log10(clockOf(key)?.fit ?? 1e4);
const rateLog = key => {
  const k = RATES.find(r => r[0] === turn.pick)[2];
  return k ? fitLog(key) + Math.log10(k / 10) : 0;
};
const sun = makeSun();
// The star on screen: it trails st.star through the switch dip.
let shown = st.star;
// The switch dip: the frame darkens, the star swaps, the light returns.
let dip = null;
// Down 0.4 s and up 1.1 s: a little longer, so the choir crossfade has room (Tom, 2026-11-24).
const DIP_DOWN = 0.4, DIP_UP = 1.1;
// The dip's light, from 1 down to full black and back (Tom, 2026-11-24).
const dipLight = () => {
  if (!dip) return 1;
  const k = dip.t < DIP_DOWN ? 1 - dip.t / DIP_DOWN : (dip.t - DIP_DOWN) / DIP_UP;
  return ease(clamp(k));
};
// The star card waits for a switch to end, then this long after the light returns (Tom, 2026-11-24).
const CARD_AFTER_DIP = 1750;
// The time before which the card waits, from performance.now().
let cardAfter = 0;
// A new star starts calm: no flare or eruption carries over, unseen, and keeps the toy awake.
function clearActivity() {
  sun.flares.length = 0;
  for (const p of sun.proms) { p.erupt = -1; p.lit = 0; }
  for (const rg of sun.regions) { rg.lastFlare = -1e9; rg.lit = 0; }
}
// Steps the dip; the star swaps at the dark point. True while it runs.
function stepDip(dt) {
  if (shown !== st.star && !dip) {
    // Reduced motion and the first frame swap at once.
    if (calm || !started) { shown = st.star; clearActivity(); applyView(); return false; }
    dip = { t: 0 };
  }
  if (!dip) return false;
  // A new pick on the way up turns back down from the same light.
  if (shown !== st.star && dip.t > DIP_DOWN) dip.t = DIP_DOWN * (1 - (dip.t - DIP_DOWN) / DIP_UP);
  dip.t += dt;
  if (dip.t >= DIP_DOWN && shown !== st.star) { shown = st.star; clearActivity(); toQuarter(); }
  if (dip.t >= DIP_DOWN + DIP_UP) {
    dip = null;
    cardAfter = performance.now() + CARD_AFTER_DIP;
    setTimeout(arrive, CARD_AFTER_DIP + 20);
  }
  return true;
}
// At the switch's dark point the camera stands on the new star's quarter cut,
// then glides out to the full star, where the card plays (Tom, 2026-11-24).
// The eye takes the quarter cut's light at once, as the frame is black.
// Glides to the full star; the card waits until 2 s after rest.
// The glide is slow and methodical: a set time on an even S-curve (Tom, 2026-11-24).
const GLIDE_MS = 6500;
function glideIn() {
  springTo(NOTCH);
  cam.glide = { from: cam.z, t0: performance.now() };
  restAt = 0;
}
// Steps the glide: no jolt at either end, an even pace between.
function stepGlide() {
  const { from, t0 } = cam.glide, k = clamp((performance.now() - t0) / GLIDE_MS);
  const s = k * k * k * (k * (6 * k - 15) + 10), ds = 30 * k * k * (k - 1) * (k - 1);
  cam.z = cam.aim = from + (cam.to - from) * s;
  // The followers take over at this speed if a hand zoom interrupts.
  cam.v = cam.va = (cam.to - from) * ds / (GLIDE_MS / 1000);
  if (k >= 1) { cam.z = cam.aim = cam.to; cam.v = cam.va = 0; cam.moving = false; }
}
function toQuarter() {
  Object.assign(cam, { z: 0, aim: 0, to: 0, v: 0, va: 0, moving: false, from: 0, arrived: false });
  Object.assign(eye, { real: realAt(0), far: farAt(0), vr: 0, vf: 0 });
  applyView();
  glideIn();
}
// The fluid probe (spike stimming-8gez): Fire's fluid as the haze round a prominence, only with ?fluid.
const FLUID = new URLSearchParams(location.search).has('fluid');
// The fluid's run: its clock and the prominence it lives on, or null.
let fluidRun = null;
function startFluid(p) {
  fluidRun = { t: 0, dt: 0, owner: p, first: true, mode: cam.mode };
}
// The prominence nearest the middle of the stage that stands in view.
function promInView() {
  let best = null, bd = Infinity;
  for (const p of sun.proms) {
    const v = toView(p.c.map(x => x * (R + p.h * 0.5)));
    const [x, y] = toCss(v);
    if (x < 0 || x > cssW || y < 0 || y > cssH) continue;
    const d = Math.hypot(x - cssW / 2, y - cssH / 2);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

let gl = null, ren = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, started = false, lastInput = 0, drifting = 1;
// True while the last frame moved by input or an event; idle work waits on it.
let busy = false;

/* ---------- the view: a telescope, so an orthographic projection ---------- */
const view = { cx: 0, cy: R, hw: 280, hh: 175, W: 1, H: 1, asp: 1.6 };
// Three framings on one zoom axis: the long lens on the bottom left limb, the wide dome, the full star.
// z is 0 on the long lens, 1 on the wide view, 2 on the full star.
// Past 2 the full view pulls back: z 6 is 32 times farther (Tom, 2026-11-24).
// The pull-back moves about as fast per step as the views before it.
const VIEWS = ['long', 'wide', 'full'];
const Z_MAX = 6;
const fit = { long: { cx: 0, cy: 0, hw: 280, psi: 0 }, longH: { cx: 0, cy: 0, hw: 280 }, wide: { cx: 0, cy: R, hw: 520 }, full: { cx: 0, cy: 0, hw: 1100 } };
// Every visit opens far out and glides in to the full star (Tom, 2026-11-24).
const z0 = Z_MAX;
// The zoom rides two critically damped followers: aim follows to, z follows aim.
// Every input sets to; the camera never overshoots and never jolts.
const cam = {
  z: z0, aim: z0, to: z0,
  // Where the current move began.
  from: z0,
  // The followers' speeds, and true while they move.
  v: 0, va: 0, moving: false,
  // The opening's or a switch's glide in, or false; its card waits for rest.
  glide: false,
  // True while a magnet's quick catch runs.
  snap: false,
  // The nearest stop names the framing.
  get mode() { return VIEWS[Math.min(2, Math.round(this.z))]; },
};
const ease = t => t * t * (3 - 2 * t);
// How much of a framing is in the current view, from 0 to 1; the weights add to 1.
const weight = name => {
  const z = Math.min(cam.z, 2), i = VIEWS.indexOf(name);
  if (i === 0) return 1 - ease(clamp(z));
  if (i === 2) return ease(clamp(z - 1));
  return z <= 1 ? ease(clamp(z)) : 1 - ease(clamp(z - 1));
};
// How far the full view pulls back at z.
const pullBack = z => 2 ** (Math.max(0, z - 2) * 1.25);
// How far out the view is: 0 on the full star, 1 at x32.
const farAt = z => ease(clamp((z - 2) / 4));
// Real light: 0 up close, where the star is masked; full by x16.
const realAt = z => ease(clamp((z - 1.2) / 4));
// Far out the drag no longer turns the star; the mouse sways the lens instead.
const canTurn = () => cam.mode !== 'long' && farAt(cam.z) < 0.5;
// A pull-back as words: x5.7, x32.
const pullText = z => { const k = pullBack(z); return `×${k < 9.95 ? k.toFixed(1) : Math.round(k)}`; };
function fitView(w, h, top = 0, bottom = 0) {
  const asp = w / h;
  const narrow = asp < 0.8;
  view.asp = asp;
  // Wide enough that the limb reads as a dome and the prominences tower.
  const hw = narrow ? 260 : asp < 1.2 ? 380 : 520;
  const hh = hw / asp;
  // The wide view looks at the west limb from the side (Tom, 2026-11-24).
  // The limb stands upright about a third of the way in from the left.
  const xb = (narrow ? 0.3 : 0.34) * w;
  fit.wide = { cx: R + hw - xb * 2 * hw / w, cy: -(bottom - top) * hh / h, hw };
  // The long lens: the old quarter cut, mirrored onto the west side (Tom, 2026-11-24).
  // The star fills the frame; its limb arcs from the foot's middle to the right side's middle.
  // A fifth wider than before, so the cut reads as a curve (Tom, 2026-11-25: too tight).
  const hwL = narrow ? 180 : asp < 1.2 ? 250 : 335;
  const hhL = hwL / asp;
  // On a tall phone the corner cut is too steep; a fixed angle keeps the arc low.
  const psi = Math.PI - (narrow ? 0.6 : Math.atan2(hhL, hwL));
  const nx = Math.sin(psi), ny = Math.cos(psi);
  // The limb stands a quarter of the frame in from its edge, along psi.
  const d = 0.5 * (hwL * Math.abs(nx) + hhL * Math.abs(ny));
  fit.long = { cx: (R - d) * nx, cy: (R - d) * ny - (bottom - top) * hhL / h, hw: hwL };
  // A black hole's long lens: the shadow's west edge at the equator, where the disc crosses it.
  // The edge stands two fifths in from the left, as on the wide view.
  fit.longH = { cx: R + 0.2 * hwL, cy: -(bottom - top) * hhL / h, hw: hwL };
  // The full star: the whole disk, its prominences and some sky round it.
  const free2 = Math.max(0.4 * h, h - top - bottom);
  // Pulled back, so the corona has room to stretch out.
  const hhF = narrow ? 1.45 * R / asp : 1.6 * R * h / free2;
  const hwF = hhF * asp;
  fit.full = { cx: 0, cy: -(bottom - top) * hhF / h, hw: hwF };
  applyView();
}
// The stops as frame numbers: log width, then the centre over the width.
// Past the full star only the width grows, so the centre holds.
function stops() {
  return Array.from({ length: Z_MAX + 1 }, (_, i) => {
    // A black hole's full view stands farther back, so its whole disc fits.
    const f = i === 0 && STARS[shown].hole ? fit.longH : fit[VIEWS[Math.min(2, i)]], hw = f.hw * pullBack(i) * (i >= 2 ? STARS[shown].reach : 1);
    return [Math.log(hw), f.cx / f.hw, f.cy / f.hw];
  });
}
// A monotone cubic (Fritsch and Carlson): smooth through every stop, never past one.
// The camera keeps its speed through a stop, so no stop is a detent.
function pchip(ys, z) {
  const n = ys.length - 1, i = Math.min(n - 1, Math.floor(z)), t = z - i;
  const d = ys.slice(1).map((y, k) => y - ys[k]);
  // The end stops are left and reached at rest, so the long lens never snaps away (Tom, 2026-11-24).
  const m = k => {
    if (k === 0 || k === n) return 0;
    const a = d[k - 1], b = d[k];
    return a * b <= 0 ? 0 : 2 * a * b / (a + b);
  };
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * m(i) + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * m(i + 1);
}
// Places the view at cam.z on the curve through the stops.
function applyView() {
  const P = stops(), z = clamp(cam.z, 0, Z_MAX);
  view.hw = Math.exp(pchip(P.map(p => p[0]), z));
  view.cx = pchip(P.map(p => p[1]), z) * view.hw;
  view.cy = pchip(P.map(p => p[2]), z) * view.hw;
  view.hh = view.hw / view.asp;
  // An oblate star: the view stretches its equator across the screen.
  const ob = 1 + STARS[shown].oblate;
  view.cx /= ob; view.hw /= ob;
  // The camera sways gently on the quarter cut, half as much on the half view, not at all from the full star out.
  view.cx += drift.x * view.hw;
  view.cy += drift.y * view.hw;
  setRot();
}
// The camera's sway (Tom, 2026-11-24): a slow drift of the view, as a share of its half width.
const drift = { x: 0, y: 0, t: 0 };
// Its size at the quarter cut; it halves by the half view and fades out by the full star.
const DRIFT_A = 0.006;
const driftWeight = z => z <= 1 ? 1 - 0.5 * ease(clamp(z)) : 0.5 * (1 - ease(clamp(z - 1)));
// Steps the sway with the drift clock; true while it moves.
function stepDrift(dt) {
  const a = calm ? 0 : DRIFT_A * driftWeight(cam.z);
  if (a <= 0 && !drift.x && !drift.y) return false;
  drift.t += dt * drifting;
  const T = drift.t * 2 * Math.PI;
  drift.x = a * (0.6 * Math.sin(T / 13.7) + 0.4 * Math.sin(T / 7.9 + 1.3));
  drift.y = a * (0.6 * Math.sin(T / 11.3 + 0.7) + 0.4 * Math.sin(T / 6.1 + 2.1));
  applyView();
  return drifting > 0 && a > 0;
}
// L jumps to the next stop in Tom's order: long lens, full star, wide dome, then back.
function toggleLens() {
  springTo(cam.to < 0.5 ? 2 : cam.to > 1.5 ? 1 : 0);
}
// The wheel, a pinch and the - and = keys move the zoom by dz.
// Magnet notches: a pause near a stop settles the zoom on it (Tom, 2026-11-24).
// All three show on the rail: the full star's large, the quarter's and the half's small (Tom, 2026-11-24).
const NOTCH = 2, NOTCH_REACH = 0.4, MAGNETS = [0, 1, NOTCH];
// A magnet catches 0.16 s after the input pauses, and settles in half the time (Tom: snappier).
// Sticky stops (Tom, 2026-11-24): the full star on the way in, the half view both ways.
// A gesture that crosses one stops there; a later, separate gesture goes on.
// Each entry: the stop, then the travel that it catches (-1 in, +1 out).
const STICKY = [[NOTCH, -1], [1, -1], [1, 1]];
// A pause of GAP ms ends a gesture; PUSH is the travel that leaves the stop.
const GAP = 220, PUSH = 0.25;
// A hand gesture leads the view by one stop at most: four wheel ticks.
// A fling cannot run the target to the end, so the view stops near the hand.
const LEAD = 1;
const stick = { at: null, dir: 0, armed: false, push: 0, last: 0 };
let settle = 0;
function zoomBy(dz) {
  if (chart?.isOpen || !dz) return;
  const now = performance.now(), fresh = now - stick.last > GAP, dir = Math.sign(dz);
  stick.last = now;
  if (stick.at === cam.to && stick.dir === dir) {
    // Trackpad momentum from the catching gesture stays absorbed.
    if (fresh) stick.armed = true;
    if (!stick.armed || (stick.push += Math.abs(dz)) < PUSH) return;
    dz = dir * stick.push;
  } else {
    const hit = STICKY.find(([n, d]) => d === dir && (cam.to - n) * d < 0 && (cam.to + dz - n) * d >= 0);
    if (hit) {
      Object.assign(stick, { at: hit[0], dir, armed: false, push: 0 });
      return springTo(hit[0]);
    }
  }
  stick.at = null;
  // A lead that is already longer, from L or the rail, stays.
  const lead = Math.max(LEAD, Math.abs(cam.to - cam.z));
  springTo(clamp(cam.to + dz, cam.z - lead, cam.z + lead));
  clearTimeout(settle);
  settle = setTimeout(() => {
    // A magnet pulls ahead, so it never undoes an inward step.
    // The full star also pulls back a small overshoot on the way out.
    const m = MAGNETS.find(n => Math.abs(cam.to - n) < NOTCH_REACH && ((n - cam.to) * dz >= 0 || (n === NOTCH && dz > 0)));
    if (m != null && cam.to !== m) { springTo(m); cam.snap = true; }
  }, 160);
}
// Every zoom input sets the target here; the followers carry the view.
function springTo(z) {
  z = clamp(z, 0, Z_MAX);
  // A glide-in ends at any new target, and so does a magnet's quick catch.
  cam.glide = false;
  cam.snap = false;
  // A move away from the full star fades the star card.
  if (z !== NOTCH) card?.fade();
  // A new move starts: note where it began, and let its arrival play the card again.
  if (!cam.moving) { cam.from = cam.z; cam.arrived = false; }
  cam.to = z;
  // A turn back drops the hidden follower's speed; the view's own speed stays, so it eases round.
  if ((z - cam.aim) * cam.va < 0) cam.va = 0;
  // Reduced motion and the first frame jump straight to the target.
  if (!started || calm) {
    cam.z = cam.aim = z; cam.v = cam.va = 0; cam.moving = false;
    applyView();
    readHover();
    arrive();
  } else cam.moving = true;
  rail?.show(cam.z, cam.to);
  poke();
}
// One critically damped step toward x (the SmoothDamp integral); T is its time constant.
// Firm: the step never passes X.
function follow(x, X, v, T, dt, firm = false) {
  const w = 2 / T, k = w * dt, e = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
  const c = x - X;
  // Faster than w|c| toward X runs past it; firm caps the speed there.
  if (firm && c * (v + w * c) < 0) v = -w * c;
  const tmp = (v + w * c) * dt;
  const nx = X + (c + tmp) * e, nv = (v - w * tmp) * e;
  // A long frame can still step past X; firm lands on it.
  if (firm && (X - x) * (nx - X) > 0) return [X, 0];
  return [nx, nv];
}
// Each follower's time constant at Zoom weight 1; the house weight 2 settles a stop in about 3.5 s.
const ZOOM_T = 0.35;
// Zooming in is slower and heavier than zooming out (Tom, 2026-11-24).
const ZOOM_IN = 1.4;
// Steps both followers; true while the zoom moves.
// Steps the two followers toward the target.
function stepFollow(dt) {
  const T = ZOOM_T * gv('zoomWeight', 2) * (cam.to < cam.z ? ZOOM_IN : 1) * (cam.snap ? 0.5 : 1);
  [cam.aim, cam.va] = follow(cam.aim, cam.to, cam.va, T, dt, true);
  [cam.z, cam.v] = follow(cam.z, cam.aim, cam.v, T, dt, true);
  cam.z = clamp(cam.z, 0, Z_MAX);
  if (Math.abs(cam.to - cam.z) < 2e-4 && Math.abs(cam.v) < 2e-3 && Math.abs(cam.va) < 2e-3) {
    cam.z = cam.aim = cam.to; cam.v = cam.va = 0; cam.moving = false;
  }
}
function stepZoom(dt) {
  if (!cam.moving) return false;
  if (cam.glide) stepGlide(); else stepFollow(dt);
  arrive();
  applyView();
  rail.show(cam.z, cam.to);
  return true;
}
const mul = (A, B) => A.map(row => [0, 1, 2].map(c => row[0] * B[0][c] + row[1] * B[1][c] + row[2] * B[2][c]));
// Rotation, star frame to view frame: a pitch about x after a yaw about y.
let M = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// The camera's own turn (the drag), without the star's spin: far things hang in it.
let CAM = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function setRot() {
  const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch), cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
  const rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];
  const ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const TP = mul(rx, ry);
  CAM = TP;
  // The star turns on its own axis at its true rate, sped up.
  const B = STARS[shown];
  let S = B.day ? axisTurn(B.grav, 2 * Math.PI * ((st.turn / (B.day * 86400)) % 1)) : null;
  // A pulsar in true physics turns whole with its spin, so taps, flares and field ride the crust.
  if (pulsarTurns(B)) S = axisTurn(SPIN, 2 * Math.PI * st.spin / spinOf(B));
  M = S ? mul(TP, S) : TP;
  // A binary's orbit tilts toward the eye, so its disc shows its face; the eclipses stay partial.
  if (B.bin?.tilt) {
    const c = Math.cos(B.bin.tilt), s = Math.sin(B.bin.tilt);
    M = mul(TP, S ? mul([[1, 0, 0], [0, c, -s], [0, s, c]], S) : [[1, 0, 0], [0, c, -s], [0, s, c]]);
  }
}
// True for the pulsar: its whole body turns in M.
const pulsarTurns = B => !!B.ns;
// One turn on screen, in s: the Vela pulsar's is slowed; a magnetar's is true.
function spinOf(B) { return B.ns?.spin ?? SPIN_PERIOD; }
// The magnetic axis in the star's frame: fixed on the body, which turns in M.
const magNow = () => magAxis(0);
// A turn by angle a about the axis u (Rodrigues).
function axisTurn(u, a) {
  const l = Math.hypot(u[0], u[1], u[2]), x = u[0] / l, y = u[1] / l, z = u[2] / l;
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
}
// A point in the camera's frame to the view, without the star's spin.
const camView = p => [0, 1, 2].map(r => CAM[r][0] * p[0] + CAM[r][1] * p[1] + CAM[r][2] * p[2]);
const toView = p => [0, 1, 2].map(r => M[r][0] * p[0] + M[r][1] * p[1] + M[r][2] * p[2]);
// A view point to stage CSS pixels, y down.
// The pulsar bends its own light: a point psi round the star shows at angle a on screen,
// with cos a = 1 - (1 - cos psi)(1 - u) (Beloborodov 2002), as the shader draws its crust.
// The bent point keeps its distance; z is negative only where the light cannot reach the eye.
function bendV(v) {
  const B = STARS[shown];
  if (!pulsarTurns(B)) return v;
  const rho = Math.hypot(v[0], v[1], v[2]), q = Math.hypot(v[0], v[1]);
  if (rho < 1e-6 || q < 1e-9) return v;
  const ca = 1 - (1 - v[2] / rho) * (1 - B.ns.u);
  const k = rho * Math.sqrt(Math.max(0, 1 - ca * ca)) / q;
  return [v[0] * k, v[1] * k, ca * rho];
}
const toCss = v0 => { const v = bendV(v0); return [((v[0] - view.cx) / view.hw * 0.5 + 0.5) * cssW, (0.5 - (v[1] - view.cy) / view.hh * 0.5) * cssH]; };
// The sun hides a point behind it.
const hidden = v0 => { const v = bendV(v0); return Math.hypot(v[0], v[1]) < R && v[2] < 0; };
// The point a region shows: its centre on the near side, its loop tops behind the limb.
function regionPoint(rg) {
  const c = toView(rg.c.map(x => x * R));
  if (!hidden(c)) return { v: c, front: true };
  return { v: toView(rg.c.map(x => x * (R + rg.span[1] * 0.9))), front: false };
}

if (new URLSearchParams(location.search).has('qa')) globalThis.__solar = { st, sun, view, cam, toggleLens, flare: i => flareAt(sun.regions[i ?? 0]), erupt: i => eruptAt(sun.proms[i ?? 0]), get loop() { return { raf, timer, drifting } }, get zoom() { return [cam.z, cam.to]; }, get rate() { return [turn.pick, 10 ** turn.lr]; }, place: z => { cam.z = z; applyView(); return { ...view }; }, get ui() { return ui; }, snap: () => { draw(); const px = new Uint8Array(view.W * view.H * 4); gl.readPixels(0, 0, view.W, view.H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; }, get shown() { return [shown, dip?.t ?? -1]; }, get egg() { return egg; }, get rung() { return D.rung; }, get sound() { return { state: soundState, rest: snd.rest, gains: snd.restGains, ac: kit.ac?.state }; }, get frameTime() { return D.frameTime; }, get load() { return performance.getEntriesByType('mark').filter(m => m.name.startsWith('stim:')).map(m => [m.name, Math.round(m.startTime)]); } };

/* ---------- dev: post effect knobs, 1 is the house default ---------- */
// id, group, label, min, max, default.
// id, group, label, min, max, default, reach, hint.
// reach stretches the range above 1, so a subtle effect shows at the top; 1 stays the house look.
const FX = [
  ['fxExpo', 'Post', 'Exposure', 0.3, 2, 1, 1, 'Overall brightness, before the tone curve.'],
  ['fxBloom', 'Post', 'Bloom', 0, 3, 1, 6, 'The soft glow bright light spills into its surroundings.'],
  ['fxRays', 'Post', 'Light rays', 0, 3, 1, 2, 'Shafts of light streaming out from the star.'],
  ['fxHal', 'Post', 'Halation', 0, 3, 1, 1, 'The red glow film gives round bright light.'],
  ['fxSplit', 'Post', 'Colour split', 0, 4, 1, 3, 'Red and blue fringes toward the frame\'s edge, as a lens splits colour.'],
  ['fxShimmer', 'Post', 'Heat shimmer', 0, 4, 1, 3, 'Hot air above the limb bends what lies behind it. Stars only.'],
  ['fxDirt', 'Post', 'Lens dirt', 0, 4, 1, 4, 'Smudges on the glass that catch the star\'s light.'],
  ['fxRoll', 'Post', 'Highlight roll-off', 0, 2, 1, 1, 'The brightest parts fade to warm white, as on film.'],
  ['fxVig', 'Post', 'Vignette', 0, 2, 1, 1, 'The frame darkens toward its corners.'],
  ['fxGrain', 'Post', 'Grain', 0, 5, 1, 1, 'Film grain, even over the whole frame, still while the toy sleeps.'],
  ['fxVol', 'Volume', 'Haze density', 0, 4, 1, 2, 'How thick the haze and dust round the star are.'],
  ['fxVolLight', 'Volume', 'Haze light', 0, 4, 1, 1, 'How much starlight the haze scatters.'],
  ['fxCorona', 'Volume', 'Corona (full view)', 0, 4, 1, 1, 'The star\'s outer atmosphere, seen on the full view.'],
  ['fxDenoise', 'Volume', 'Haze denoise', 0, 1.1, 1, 1, 'Blends a live march with past frames at rest, so its speckle settles: Beta Lyrae\'s gas and the pulsar\'s beams. The baked haze needs none.'],
  ['fxBend', 'Volume', 'Corona bend', 0, 3, 1, 3, 'How much the corona\'s streamers curve on the full view.'],
  // The black holes and the quasar have their own volume; the star rows above grey out there.
  ['fxHCloud', 'Black hole', 'Cloud density', 0, 4, 1, 2, 'How thick the cloud layer round a black hole\'s disc is.'],
  ['fxHCLight', 'Black hole', 'Cloud light', 0, 4, 1, 2, 'How brightly the clouds glow with the disc\'s light.'],
  ['fxHDisc', 'Black hole', 'Disc light', 0, 3, 1, 2, 'The flat disc under the clouds, and its photon ring.'],
  ['fxHTorus', 'Black hole', 'Dusty torus', 0, 3, 1, 2, 'The quasar\'s ring of dust round its disc.'],
  ['fxHBlr', 'Black hole', 'Broad-line clouds', 0, 3, 1, 2, 'The quasar\'s bright clumps that orbit above and below its disc.'],
  ['fxHWinds', 'Black hole', 'Winds', 0, 3, 1, 2, 'The gas the quasar\'s disc blows off its faces.'],
  ['fxHJet', 'Black hole', 'Jet', 0, 3, 1, 2, 'The quasar\'s jet along its spin axis.'],
  ['fxOrb', 'Flare', 'Orb', 0, 3, 1, 1, 'The soft round glow of the lens flare.'],
  ['fxStreak', 'Flare', 'Streak', 0, 3, 1, 1, 'The thin horizontal anamorphic streak.'],
  ['fxGhost', 'Flare', 'Ghosts', 0, 3, 1, 1, 'The rimmed discs a bright light throws across the frame.'],
  ['fxReal', 'Real light', 'Exposure lift', 0, 2, 1, 1, 'How much brighter the star burns as you zoom out.'],
  ['fxGlare', 'Real light', 'Glare', 0, 3, 1, 1, 'The glare that spreads past the star\'s edge when far out.'],
];
// The grade rows: a tone curve, a sun-glare look, and three sliders.
const TONES = [['0', 'Film'], ['1', 'ACES'], ['2', 'AgX']];
const LOOKS = [['0', 'None'], ['1', 'Furnace'], ['2', 'Viewing glass'], ['3', 'Bleach'], ['4', 'Gold haze']];
const GRADE = [['fxContrast', 'Contrast', 0.3, 2, 1], ['fxSat', 'Saturation', 0, 2, 1], ['fxWarm', 'Warmth', -1, 1, 0]];
const gradeRows = () => [
  { type: 'choice', id: 'fxTone', group: 'Grade', label: 'Tone map', value: '1', options: TONES.map(([value, label]) => ({ value, label })), persist: true, onPick: () => poke() },
  { type: 'choice', id: 'fxLook', group: 'Grade', label: 'Look', value: '0', display: 'stepper', options: LOOKS.map(([value, label]) => ({ value, label })), persist: true, onPick: () => poke() },
  ...GRADE.map(([id, label, min, max, value]) => ({ type: 'slider', id, group: 'Grade', label, min, max, step: 0.05, value, persist: true, onInput: () => poke() })),
  { type: 'button', id: 'gradeReset', group: 'Grade', label: 'Defaults', text: 'Reset', onClick: () => {
    ui.setting?.('fxTone')?.set('1', true); ui.setting?.('fxLook')?.set('0', true);
    for (const [id, , , , d] of GRADE) ui.setting?.(id)?.set(d, true);
    poke();
  } },
];
const gv = (id, d) => ui?.setting?.(id)?.value ?? d;
// A knob's value: its Dev row, else the default.
// The Dev rows that act on the object in view; the others grey out.
let devKind = '';
// The haze is baked, so only a live march (a binary's gas, a pulsar's beams) needs Haze denoise.
function devRows(star) {
  const hole = star.hole;
  const k = hole ? (hole.qso ? 'qso' : 'hole') : star.bin || star.ns ? 'live' : 'star';
  if (k === devKind || !ui?.setting) return;
  devKind = k;
  const on = (ids, yes) => { for (const id of ids) { const h = ui.setting(id); if (h) h.disabled = !yes; } };
  on(['fxVol', 'fxVolLight', 'fxCorona', 'fxBend'], !hole);
  on(['fxDenoise'], k === 'live');
  on(['fxHCloud', 'fxHCLight', 'fxHDisc'], k !== 'star');
  on(['fxHTorus', 'fxHBlr', 'fxHWinds', 'fxHJet'], k === 'qso');
}
const fxv = id => {
  const [, , , , , d, reach] = FX.find(f => f[0] === id);
  const v = ui?.setting?.(id)?.value ?? d;
  return v <= 1 ? v : 1 + (v - 1) * reach;
};

/* ---------- bar ---------- */
// The stars in pick order: main sequence by class, brown dwarfs, life stages.
// Keys 1 to 0 pick the first ten; [ and ] step through all of them.
const PICKS = [
  ['zetaoph', 'Zeta Ophiuchi', 'oklch(0.7 0.16 275)'], ['regulus', 'Regulus', 'oklch(0.82 0.09 245)'],
  ['vega', 'Vega', 'oklch(0.94 0.02 250)'], ['sirius', 'Sirius', 'oklch(0.9 0.04 250)'],
  ['procyon', 'Procyon', 'oklch(0.9 0.07 90)'], ['sun', 'Sun', 'oklch(0.82 0.15 80)'],
  ['epseri', 'Epsilon Eridani', 'oklch(0.7 0.17 50)'], ['proxima', 'Proxima', 'oklch(0.62 0.19 35)'],
  ['luhman', 'Luhman 16', 'oklch(0.5 0.12 10)'], ['wise', 'WISE 0855', 'oklch(0.4 0.04 10)'],
  ['ttauri', 'T Tauri', 'oklch(0.72 0.15 60)'], ['fomalhaut', 'Fomalhaut', 'oklch(0.93 0.03 240)'], ['arcturus', 'Arcturus', 'oklch(0.7 0.15 50)'], ['polaris', 'Polaris', 'oklch(0.92 0.06 95)'],
  ['betalyr', 'Beta Lyrae', 'oklch(0.84 0.08 240)'], ['s5hvs1', 'S5-HVS1', 'oklch(0.9 0.05 245)'],
  ['rigel', 'Rigel', 'oklch(0.8 0.1 240)'], ['mira', 'Mira', 'oklch(0.62 0.19 30)'], ['betelgeuse', 'Betelgeuse', 'oklch(0.68 0.18 45)'], ['rlep', 'R Leporis', 'oklch(0.52 0.2 25)'],
  ['vycma', 'VY CMa', 'oklch(0.5 0.17 28)'], ['st218', 'Stephenson 2-18', 'oklch(0.42 0.15 25)'], ['wohg64', 'WOH G64', 'oklch(0.66 0.15 55)'], ['quasi', 'Quasi-star', 'oklch(0.6 0.19 35)'], ['wr140', 'WR 140', 'oklch(0.84 0.07 255)'], ['vfts352', 'VFTS 352', 'oklch(0.76 0.13 270)'], ['xxtri', 'XX Trianguli', 'oklch(0.7 0.15 55)'], ['epsaur', 'Epsilon Aurigae', 'oklch(0.9 0.07 90)'], ['mothra', 'Mothra', 'oklch(0.86 0.12 85)'], ['earendel', 'Earendel', 'oklch(0.85 0.08 250)'], ['powehi', 'Pōwehi', 'oklch(0.72 0.16 55)'], ['gargantua', 'Gargantua', 'oklch(0.82 0.11 70)'], ['wr124', 'WR 124', 'oklch(0.78 0.12 270)'],
  ['siriusb', 'Sirius B', 'oklch(0.88 0.06 210)'],
  ['neutron', 'Pulsar', 'oklch(0.72 0.15 270)'], ['magnetar', 'SGR 1806-20', 'oklch(0.74 0.14 295)'], ['crab', 'Crab Nebula', 'oklch(0.72 0.14 40)'], ['ring', 'Ring Nebula', 'oklch(0.8 0.11 175)'], ['tzo', 'Thorne–Żytkow', 'oklch(0.58 0.17 35)'], ['cygx1', 'Cygnus X-1', 'oklch(0.78 0.1 255)'],
  ['sgra', 'Sagittarius A*', 'oklch(0.75 0.15 60)'], ['qso', '3C 273', 'oklch(0.86 0.06 260)'],
].map(([value, name, colour]) => ({ value, name, colour, rsun: STARS[value].rsun }));
const DIGITS = '1234567890';
// The bar's label: the star with its swatch.
// The star button: the star's own tray icon in its colour, then its name (Tom, 2026-11-24: no square).
const starLabel = () => {
  const p = PICKS.find(x => x.value === st.star);
  return glyph(p.value).replace('<svg class="sl-glyph"', `<svg class="sl-glyph sl-bar-glyph" style="color: color-mix(in oklch, ${p.colour}, white 25%)"`) + `<span>${p.name}</span>`;
};
// i shows the card in any view; again, while the card stands, the article; again, it shuts.
// The star whose card the user opened with i; its own card then stays back.
let handCard = null;
function infoPress() {
  try {
    if (article.isOpen()) article.close();
    else if (card.isOpen()) {
      const p = PICKS.find(x => x.value === st.star);
      if (!p) return;
      article.open(st.star, cardLines(st.star, p.name));
      // The card goes at once, so a quick second i shows no ghost under the article (Tom, 2026-11-25).
      card.clear();
    } else {
      // A card opened by hand stops the star's own card from playing over it (Tom, 2026-11-25).
      handCard = st.star;
      showCard(true);
    }
  } catch (err) {
    // A broken fact never blocks the keys; the card and the article shut.
    card.clear(); article.close();
    console.warn('Star Chart: info', err);
  }
}
const zoomText = z => z > 2.02 ? `full ${pullText(z)}` : VIEWS[Math.round(z)];
function pickStar(v) {
  if (!STARS[v] || v === st.star) return;
  st.star = v;
  egg?.stop?.();
  egg = null;
  store.set('star', v);
  handCard = null;
  article.close();
  // The old star's card leaves at once; the new one waits for the switch's light.
  // Reduced motion swaps at once, so its card need not wait.
  card.clear();
  cardAfter = calm || !started ? 0 : Infinity;
  // With no dip the new star opens on the whole star at once; else the dip's dark point moves the camera.
  if (calm || !started) springTo(NOTCH);
  applyView();
  setLabel(labels.star, starLabel());
  barTint();
  chart?.sync();
  poke();
}
// The bar's accent follows the picked star, lifted so dark text on it keeps 4.5:1.
function barTint() {
  const el = (stage.closest('.stim-frame') || stage.parentElement).querySelector('.sg-ui');
  if (!el) return;
  const [, L, C, H] = PICKS.find(x => x.value === st.star).colour.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)/);
  el.style.setProperty('--sc-acc', `oklch(${Math.max(+L, 0.8)} ${Math.min(+C, 0.14)} ${H})`);
  el.style.setProperty('--acc-ink', 'var(--sc-acc)');
  el.style.setProperty('--acc-img', 'linear-gradient(var(--sc-acc), var(--sc-acc))');
  el.style.setProperty('--acc-fill', 'linear-gradient(var(--sc-acc), var(--sc-acc))');
  el.style.setProperty('--acc-on', 'var(--bg)');
  // The first colour lands at once; later picks ease.
  requestAnimationFrame(() => el.classList.add('sc-ease'));
}
const ui = initPage({ id: ID, bar: {
  // The bar holds only the star (Tom, 2026-11-24); Space and L stay as keys.
  // The bar holds the star, the turn and the info card (Tom, 2026-11-24).
  actions: [
    { verb: 'star', label: starLabel(), onPress: () => chart?.toggle() },
    { verb: 'turn', label: rateLabel(), key: 'T', onPress: () => cycleRate() },
    { verb: 'info', label: 'Info', key: 'I', onPress: () => infoPress() },
  ],
  // Settings in three groups (Tom, 2026-11-24): the star, the picture, the sound.
  settings: [
    // Activity in words: each step sets the loops, spots and flares' strength.
    { type: 'choice', id: 'activityStep', group: 'Star', label: 'Activity', value: actStep(st.activity),
      options: ACT_STEPS.map(([value, label]) => ({ value, label })),
      onPick: v => { st.activity = ACT_STEPS.find(a => a[0] === v)[2]; store.set('activity', st.activity); poke(); } },
    // The volumes' size: a quarter, half or the full frame (Tom, 2026-11-24).
    { type: 'choice', id: 'volDetail', group: 'Picture', label: 'Volume detail', hint: 'The haze, corona and cloud volumes: a quarter, half or the full frame size.', value: 'std', persist: true,
      options: [{ value: 'low', label: 'Low' }, { value: 'std', label: 'Standard' }, { value: 'high', label: 'High' }], onPick: () => resize(true) },
    // The black holes and the quasar draw at this share of the frame (Tom, 2026-11-24: start at 75).
    { type: 'choice', id: 'holeRes', group: 'Picture', label: 'Black hole detail', hint: 'The black holes and the quasar: half, three quarters or the full frame size. Full draws straight to the frame.', value: '75', persist: true,
      options: [{ value: '50', label: '50%' }, { value: '75', label: '75%' }, { value: '100', label: '100%' }], onPick: () => resize(true) },
    // Calm slows the drift and halves its frame rate (Tom, 2026-11-24).
    { type: 'choice', id: 'motion', group: 'Picture', label: 'Motion', hint: 'Calm slows the surface, loops and prominences, and draws the drift at 15 frames a second.', value: 'lively', persist: true,
      options: [{ value: 'lively', label: 'Lively' }, { value: 'calm', label: 'Calm' }], onPick: () => poke() },
    { type: 'toggle', id: 'sndHum', group: 'Sound', label: 'Choir', value: true, persist: true, onToggle: () => mixSound() },
    { type: 'slider', id: 'sndHumLvl', group: 'Sound', label: 'Choir level', min: 0, max: 2, step: 0.05, value: 1, persist: true, onInput: () => mixSound() },
    { type: 'toggle', id: 'sndRumble', group: 'Sound', label: 'Space rumble', value: true, persist: true, onToggle: () => mixSound() },
    { type: 'slider', id: 'sndRumbleLvl', group: 'Sound', label: 'Rumble level', min: 0, max: 2, step: 0.05, value: 1, persist: true, onInput: () => mixSound() },
  ],
  quality: true,
  // Tuning for the people who build the toy; the Dev button always shows here.
  dev: [
    ...FX.map(([id, group, label, min, max, value, , hint]) => ({ type: 'slider', id, group, label, hint, min, max, step: 0.05, value, persist: true, onInput: () => poke() })),
    { type: 'button', id: 'fxReset', group: 'Post', label: 'Defaults', text: 'Reset', onClick: () => { for (const [id, , , , , d] of FX) ui.setting?.(id)?.set(d, true); poke(); } },
    ...gradeRows(),
    // Weight 2 is the house zoom: heavy, about 3.5 s a stop (Tom, 2026-11-24).
    // Frames (Tom, 2026-11-24): a frame cap, frame blending and motion blur.
    { type: 'choice', id: 'fpsCap', group: 'Frames', label: 'Frame cap', hint: 'Frames a second while the star moves; Unlimited follows the screen.', value: '0', persist: true, options: [['0', 'Unlimited'], ['60', '60'], ['30', '30'], ['24', '24']].map(([value, label]) => ({ value, label })), onPick: () => poke() },
    { type: 'slider', id: 'frameBlend', group: 'Frames', label: 'Frame blending', hint: 'How much of the last frame stays in the new one; 0 is off.', min: 0, max: 0.9, step: 0.05, value: 0, persist: true, onInput: () => poke() },
    { type: 'slider', id: 'motionBlur', group: 'Frames', label: 'Motion blur', hint: 'The shutter: a share of the camera move between frames. 0 is off.', min: 0, max: 1, step: 0.05, value: 0, persist: true, onInput: () => poke() },
    { type: 'slider', id: 'zoomWeight', group: 'Zoom', label: 'Zoom weight', hint: 'How heavy the zoom feels: each step settles over about 1.75 s times this.', min: 0.3, max: 3, step: 0.05, value: 2, persist: true },
    { type: 'choice', id: 'cardStyle', group: 'Card', label: 'Card style', hint: 'How the star card looks when the zoom settles on the full star.', value: 'intro', options: CARD_STYLES.map(([value, label]) => ({ value, label })), persist: true, onPick: () => replayCard() },
    { type: 'button', id: 'cardShow', group: 'Card', label: 'Star card', hint: 'Plays the star card now, at any zoom.', text: 'Show', onClick: () => showCard() },
    // The choir and rumble switches and levels live in Settings (Tom, 2026-11-24).
    ...[['sndFxLvl', 'Interaction level']].map(([id, label]) => ({ type: 'slider', id, group: 'Sound', label, min: 0, max: 2, step: 0.05, value: 1, persist: true, onInput: () => mixSound() })),
    ...[['sndBlast', 'Tap: brass blast'], ['sndGlow', 'Tap: glow chord'], ['sndLift', 'Prominence lift'], ['sndDim', 'Egg: Great Dimming'], ['sndPrime', 'Egg: primes'], ['sndProbe', 'Egg: probe beacon'], ['sndTick', 'Egg: neutrino ticks']].map(([id, label]) => ({ type: 'toggle', id, group: 'Sound', label, value: true, persist: true })),
  ],
  keys: [['click', 'flare'], ['drag', 'turn'], ['L', 'long, wide or full view']],
  help: [
    ['click', 'Flare a region or lift a prominence'],
    ['drag', 'Turn the star'],
    ['scroll', 'Zoom'],
    ['L', 'Next view'],
    ['S', 'Star chart'],
    ['1', 'Main sequence and brown dwarfs, 1 to 0'],
    ['[', 'Previous or next star, [ and ]'],
    ['T', 'Turn speed'],
    ['I', 'Star card; again for the article'],
  ],
} });
// Star Chart plays by default (Tom, 2026-11-25); a stored mute holds.
try { if (localStorage.getItem(`stimming.${ID}.sound`) === null) sound.set(true); } catch (err) { /* storage is optional */ }
// The Bar v2 chips hold the labels; Bar v3 follows them.
const chipLabel = words => [...document.querySelectorAll('.s2-chip .s2-label')].find(l => l.textContent.trim() === words) || null;
const labels = { star: chipLabel(PICKS.find(x => x.value === st.star).name), rate: chipLabel(rateText()) };
// The turn button steps through the speeds; the star eases to the new one.
function cycleRate() {
  const i = RATES.findIndex(r => r[0] === turn.pick);
  turn.pick = RATES[(i + 1) % RATES.length][0];
  store.set('rate', turn.pick);
  setLabel(labels.rate, rateLabel());
  showClock();
  poke();
}
function setLabel(el, html) { if (el && el.innerHTML !== html) el.innerHTML = html; }
const chart = makeChart({
  frame: stage.closest('.stim-frame') || stage.parentElement,
  focusBack: stage,
  stars: PICKS,
  get: () => st.star,
  onPick: pickStar,
  cover: () => ui.cover?.() || { top: 58, bottom: 56 },
  onOpen: on => { if (on) { rail.hide(); card.clear(); clock.hide(); } },
});
// Each bar draw sets the toy's accent again, so the star's colour follows it.
(stage.closest('.stim-frame') || stage.parentElement).addEventListener('stim:bar', barTint);
// The time clock: the star's own period, rate and elapsed time, for a while (Tom, 2026-11-24).
const clock = makeClock({
  frame: stage.closest('.stim-frame') || stage.parentElement,
  cover: () => ui.cover?.() || { top: 58, bottom: 56 },
});
// The S stars' years since this visit began.
let sYears = 0;
// The S stars show only while the card or the article stands (Tom, 2026-11-25).
// sVis fades in over 0.8 s and out over 3 s; at 0 the S stars do no work at all.
let sVis = 0;
const S_IN = 0.8, S_OUT = 3;
// Steps the fade; true while it moves.
function stepSVis(dt) {
  const want = shown === 'sgra' && (card.isOpen() || article.isOpen()) ? 1 : 0;
  if (sVis === want) return false;
  // Reduced motion shows or hides them at once.
  sVis = calm ? want : want > sVis ? Math.min(1, sVis + dt / S_IN) : Math.max(0, sVis - dt / S_OUT);
  return sVis !== want;
}
// What the clock reads now: the shown star's clock, rate, time and phase.
function clockRead() {
  const c = clockOf(shown);
  if (!c) return null;
  const P = c.days * 86400;
  if (c.kind === 'spin') { const t = st.spin * c.fit; return { ...c, rate: c.fit, t, phase: t / P % 1 }; }
  // The readout shows the picked rate, not the eased one, so its text holds still.
  const rate = 10 ** rateLog(shown);
  if (c.kind === 's2') { const t = sYears * 365.25 * 86400; return { ...c, rate, t, phase: t / P % 1 }; }
  return { ...c, rate, t: st.turn, phase: st.turn / P % 1 };
}
// Reduced motion stops the turn, so the clock has nothing to count.
function showClock() { if (!calm) clock.show(shown, clockRead()); }
const rail = makeRail({
  frame: stage.closest('.stim-frame') || stage.parentElement,
  mid: NOTCH,
  notches: [0, 1],
  max: Z_MAX,
  text: zoomText,
  cover: () => ui.cover?.() || { top: 58, bottom: 56 },
  onPick: z => springTo(z),
});
// The star card: the star's name and facts type on, then fade (Tom, 2026-11-24).
// It shows only on the full star: zoomed out to it, glided there by a pick, or opened there.
const card = makeCard({ stage });
// The article: the second i opens it over the card (Tom, 2026-11-24).
const article = makeArticle({ stage });
later(loadArticles);
let cardStar = null;
// The card plays once the view is within a hair of the full star, once per arrival (Tom, 2026-11-24).
// A heavy zoom creeps for seconds at the end; the card need not wait for the creep.
const ARRIVE_NEAR = 0.02;
// A glide-in's card plays this long after the view rests, in ms (Tom, 2026-11-24).
const CARD_REST = 2000;
// The view counts as at rest within this zoom distance and speed.
const REST_NEAR = 0.004, REST_V = 0.01;
let restAt = 0;
function arrive() {
  if (!started || cam.to !== NOTCH || cam.arrived || performance.now() < cardAfter) return;
  if (Math.abs(cam.z - NOTCH) > (cam.glide ? REST_NEAR : ARRIVE_NEAR)) return;
  if (cam.glide) {
    if (Math.abs(cam.v) + Math.abs(cam.va) > REST_V) return;
    if (!restAt) { restAt = performance.now(); setTimeout(arrive, CARD_REST + 20); }
    if (performance.now() < restAt + CARD_REST) return;
  }
  if (cam.from > NOTCH - 0.05 && cardStar === st.star) return;
  // An open article holds the card back; the card would stand over it.
  if (article.isOpen()) return;
  cam.arrived = true;
  // A card opened by hand, or one still standing, is never replaced.
  if (handCard === st.star || card.isOpen()) return;
  showCard();
}
// Plays the star card; Dev calls it at any zoom (Tom, 2026-11-24).
// Our Sun stands beside the object at their true ratio; the Sun's own card has none.
function showCard(again = false) {
  cardStar = st.star;
  const pick = PICKS.find(x => x.value === st.star);
  if (!pick) return;
  try {
    // A black hole's rsun is its horizon's radius.
    const rsun = STARS[st.star]?.rsun;
    const sun = st.star === 'sun' || !(rsun > 0) ? null : { k: rsun };
    card.show(cardLines(st.star, pick.name), gv('cardStyle', 'intro'), sun, again);
  } catch (err) {
    card.clear();
    console.warn('Star Chart: card', err);
    return;
  }
  showClock();
}
// A new card style plays at once when the view rests on the full star.
function replayCard() {
  if (cam.to !== NOTCH || cam.moving) return;
  cardStar = null;
  handCard = null;
  cam.arrived = false;
  arrive();
}
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.defaultPrevented || chart.isOpen) return;
  if (e.target.closest?.('input, textarea, select, .s2-sheet, .sg-sheet')) return;
  const i = DIGITS.indexOf(e.key);
  // Left and Right step the star while its chip has focus.
  const onChip = labels.star && e.target === labels.star.closest('button');
  const step = e.key === ']' || (onChip && e.key === 'ArrowRight') ? 1 : e.key === '[' || (onChip && e.key === 'ArrowLeft') ? -1 : 0;
  if (i >= 0) pickStar(PICKS[i].value);
  else if (e.key === 's' || e.key === 'S') chart.open(true);
  else if (e.key === ' ') flareNext();
  else if (e.key === 'l' || e.key === 'L') toggleLens();
  // i shows the card in any view; again, while the card stands, the article; again, it shuts.
  else if (e.key === 'i' || e.key === 'I') infoPress();
  else if (e.key === 'Escape' && article.isOpen()) article.close();
  else if (step) {
    const at = PICKS.findIndex(x => x.value === st.star);
    pickStar(PICKS[(at + step + PICKS.length) % PICKS.length].value);
  } else return;
  e.preventDefault();
});
// A slow machine compiles for many seconds; the intro holds for it.
const introDone = playIntro({ ready: pageReady(15000) });
// Any key is a gesture here: I, L, S and the zoom keys wake the sound too.
const kit = audioKit({ sleepMs: 3000 });
const snd = makeSound(kit, id => ui?.setting?.(id)?.value);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// The S stars round Sagittarius A*: a 2D layer just above the GL canvas.
const sst = makeSStars(canvas);
// ?rung=N pins the ladder for QA: no watch, no memory.
const PIN = new URLSearchParams(location.search).get('rung');
const pinned = PIN !== null && PIN !== '';
// Each new rung is stored, so this device's next visit starts there.
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 3, settle: 2, onChange: (lv, rung) => { if (!pinned) store.set('rung', rung); resize(true); } });
// Steps the ladder down to n before the first frame.
const seedRung = n => { for (let i = 0; i < n && D.rung < n; i++) D.drop(); };
const savedRung = store.get('rung');
seedRung(clamp(Math.round(Number(pinned ? PIN : savedRung) || 0), 0, 3));
// Fast frames at a stored rung lower the next visit's rung by one; never live.
let fastT = 0, eased = false;

let sizeKey = '';
function resize(force = false) {
  if (!gl || !ren) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  // Settings > Volume detail sets the volumes' size; a slow machine still steps it down one more.
  const shift = Math.min(3, ({ low: 2, std: 1, high: 0 }[gv('volDetail', 'std')] ?? 1) + (D.rung >= 1 ? 1 : 0));
  // Black hole detail; a slow machine steps it down one more, to half at the least.
  const HS = [0.5, 0.75, 1];
  const hs = HS[Math.max(0, HS.indexOf(Number(gv('holeRes', '75')) / 100) - (D.rung >= 1 ? 1 : 0))] ?? 0.75;
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0, D.rung, shift, hs].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  view.W = Math.round(cssW * dpr); view.H = Math.round(cssH * dpr);
  ren.resize(view.W, view.H, shift, hs);
  fitView(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- acts ---------- */
function flareAt(rg) {
  if (!rg) return;
  const fl = startFlare(sun, rg, st.time, calm ? 0.7 : 1);
  // Eight flares already run: this tap waits, silent.
  if (!fl) return;
  const p = regionPoint(rg);
  snd.flare(clamp(toCss(p.v)[0] / cssW * 2 - 1, -1, 1), st.star, fl.k);
  poke();
}
// Space flares each region in view in turn.
function flareNext() {
  if (!canTap()) return;
  const seen = sun.regions.filter(rg => {
    if (!near(rg.c)) return false;
    const [x, y] = toCss(regionPoint(rg).v);
    return x > 0 && x < cssW && y > 0 && y < cssH;
  });
  const list = seen.length ? seen : sun.regions.filter(rg => near(rg.c));
  for (let i = 0; i < list.length; i++) {
    const rg = list[(st.next + i) % list.length];
    if (sun.flares.some(f => f.rg === rg && f.t < 12)) continue;
    st.next = (st.next + i + 1) % list.length;
    flareAt(rg);
    return;
  }
}
// A tap on a giant prominence lifts it off into space.
function eruptAt(p) {
  if (!p || p.erupt >= 0) return;
  startEruption(p);
  if (FLUID && fluidRun?.owner !== p) startFluid(p);
  snd.rise(clamp(toCss(toView(promApex(p)))[0] / cssW * 2 - 1, -1, 1), st.star, calm ? 0.7 : 1);
  poke();
}
// The target under a stage point: a region or a prominence, and its distance.
// Only the near side answers the hand: the visible disk and its rim (Tom, 2026-11-23).
const near = u => bendV(toView(u))[2] >= 0;
// Taps answer only from the full star inward; far out the star is too small (Tom, 2026-11-24).
// A black hole has no regions to flare.
// Taps answer from the full star inward, and during a glide in to it, so the first tap counts.
const canTap = () => (cam.z <= NOTCH + 0.05 || (cam.glide && cam.to <= NOTCH)) && !STARS[shown].hole;
function pickAt(x, y) {
  let best = null, bd = Infinity, prom = false;
  if (!canTap()) return { t: best, prom, d: bd };
  for (const rg of sun.regions) {
    if (!near(rg.c)) continue;
    const [px, py] = toCss(regionPoint(rg).v);
    const d = Math.hypot(px - x, py - y);
    if (d < bd) { bd = d; best = rg; prom = false; }
  }
  // A star with no prominences shows none, so none answers the hand.
  for (const p of STARS[shown].prom > 0 ? sun.proms : []) {
    const v = toView(promApex(p));
    if (!near(p.c) || p.erupt >= 0) continue;
    const [px, py] = toCss(v);
    // A prominence is large: it wins a tap anywhere near its body.
    const d = Math.hypot(px - x, py - y) * 0.6;
    if (d < bd) { bd = d; best = p; prom = true; }
  }
  return { t: best, prom, d: bd };
}
// A target counts as under the hand within this many CSS pixels.
const reach = () => {
  const r = Math.max(56, 0.1 * Math.min(cssW, cssH));
  // Mid-glide the star is small: the reach shrinks with it, to 0.4 of its radius on screen.
  return cam.z > NOTCH ? Math.min(r, 0.4 * R / view.hw * cssW / 2) : r;
};
// The point of the near disk under a stage point, in the star's frame, or null.
function diskAt(x, y) {
  if (!canTap()) return null;
  const vx = view.cx + (x / cssW * 2 - 1) * view.hw, vy = view.cy + (1 - y / cssH * 2) * view.hh;
  const rr = (vx * vx + vy * vy) / (R * R);
  if (rr >= 0.985) return null;
  let v = [vx / R, vy / R, Math.sqrt(1 - rr)];
  // On the pulsar the tap undoes the bend: the screen angle a gives the point psi round.
  const B = STARS[shown];
  if (pulsarTurns(B)) {
    const cpsi = 1 - (1 - Math.sqrt(1 - rr)) / (1 - B.ns.u), q = Math.sqrt(rr), sp = Math.sqrt(Math.max(0, 1 - cpsi * cpsi));
    v = [vx / R / q * sp, vy / R / q * sp, cpsi];
  }
  // M is a rotation, so its transpose takes the view frame back to the star's.
  return [0, 1, 2].map(c => M[0][c] * v[0] + M[1][c] * v[1] + M[2][c] * v[2]);
}
// A tap near a region or a prominence answers there.
// Anywhere else on the near disk, a flare starts where the hand is (Tom, 2026-11-24).
function flareNear(x, y) {
  const { t, prom, d } = pickAt(x, y);
  if (t && d < reach()) { if (prom) eruptAt(t); else flareAt(t); return; }
  const s = diskAt(x, y);
  // The eye's direction in the star's frame: M's third row.
  // From the wide view out to the full star, the site grows to 2.2 times, so its arcade reads (Tom, 2026-11-25).
  if (s) flareAt(makeSite(s, [M[2][0], M[2][1], M[2][2]], 1 + 1.2 * clamp(cam.z - 1)));
}

/* ---------- hover: the cursor reads the region under it ---------- */
// The mouse over the stage, or null; touch and pen never hover.
let hoverAt = null, cursor = '';
// From the frame loop it only updates: a target turning under a still mouse is not input.
function readHover(fromFrame = false) {
  let c = 'default';
  if (pointer.drag && canTurn()) c = 'grabbing';
  else if (hoverAt && pointer.id === null && (pickAt(hoverAt[0], hoverAt[1]).d < reach() || diskAt(hoverAt[0], hoverAt[1]))) c = 'pointer';
  else if (canTurn()) c = 'grab';
  if (c !== cursor) { cursor = c; stage.style.cursor = c; }
  const near = c === 'pointer' ? pickAt(hoverAt[0], hoverAt[1]) : null;
  const t = near && near.d < reach() ? near.t : null;
  if (t !== aimed) { aimed = t; if (!fromFrame) poke(); }
}
// The target the mouse points at; it glows a little.
let aimed = null;
// The target a press holds; it charges with light until release.
let pressed = null;
// Eases each target's light toward its aim; true while any still moves.
function stepLit(dt) {
  let moving = false;
  const k = 1 - Math.exp(-dt / 0.22);
  for (const o of [...sun.regions, ...sun.proms]) {
    const to = o === pressed ? 1 + 3 * (1 - Math.exp(-(performance.now() - pointer.t0) / 500)) : o === aimed ? 1 : 0;
    const l = o.lit || 0;
    if (Math.abs(to - l) < 0.003) { o.lit = to; continue; }
    o.lit = l + (to - l) * k;
    moving = true;
  }
  return moving;
}

/* ---------- eggs: a long hold on a star plays its real famous event ---------- */
// The egg in play, or null. Its clock t reaches 0 at the end of the hold.
let egg = null;
// The pulsar's sound: the last flash counted, and true while the voice egg spins it up.
let lastFlash = null, spinning = false;
// A view point under the stage point x, y, as a unit vector in the star's frame.
function surfaceAt(x, y) {
  let vx = view.cx + (x / cssW * 2 - 1) * view.hw, vy = view.cy + (1 - y / cssH * 2) * view.hh;
  // A point off the disk moves in onto it.
  const r = Math.hypot(vx, vy), lim = 0.9 * R;
  if (r > lim) { vx *= lim / r; vy *= lim / r; }
  const v = [vx, vy, Math.sqrt(Math.max(0, R * R - vx * vx - vy * vy))];
  return [0, 1, 2].map(c => (M[0][c] * v[0] + M[1][c] * v[1] + M[2][c] * v[2]) / R);
}
// Mercury's transit: its x and y in star units, and whether it stands on the disk.
function mercury() {
  const by = fit.long.cy, cw = Math.sqrt(Math.max(0, R * R - by * by)), span = 2 * cw + 60;
  const bx = ((st.time * 1.5) % span) - span / 2;
  return { x: bx, y: by, on: STARS[st.star].long === 'mercury' && Math.hypot(bx, by) < R };
}
// A star point in CSS pixels.
const cssAt = (x, y) => [((x - view.cx) / view.hw * 0.5 + 0.5) * cssW, (0.5 - (y - view.cy) / view.hh * 0.5) * cssH];
// A hold this near Mercury, in CSS pixels, plays the ship instead of Carrington.
const MERCURY_REACH = 70;
function startEgg(x, y, rare = false) {
  let kind = EGGS[st.star];
  // Far out, the Sun's hold plays the pale blue dot.
  if (kind === 'carrington' && farAt(cam.z) > DOT_FAR) { egg = makeBlueDot(); return true; }
  if (kind === 'probe') { egg = makeProbe(); return true; }
  const m = mercury();
  if (kind === 'carrington' && m.on) {
    const [mx, my] = cssAt(m.x, m.y);
    if (rare ? Math.random() < 0.5 : Math.hypot(mx - x, my - y) < MERCURY_REACH) kind = 'sunshine';
  }
  if (kind === 'sunshine') {
    egg = makeSunshine(m.x);
    // The beacon starts with the cue and runs to the ship's end.
    egg.stop = snd.beacon?.(clamp(cssAt(m.x, m.y)[0] / cssW * 2 - 1, -1, 1), SHIP_END + HOLD - CUE) || null;
    return true;
  }
  // The star turns during the hold: the flash lands under the finger.
  const now = st.time, turnNow = st.turn;
  st.time += HOLD - CUE;
  st.turn += (HOLD - CUE) * 10 ** turn.lr;
  setRot();
  const c = surfaceAt(x, y);
  st.time = now; st.turn = turnNow;
  setRot();
  if (kind === 'carrington') egg = makeCarrington(c);
  else if (kind === 'dimming') egg = makeDimming();
  else if (kind === 'voice') egg = makeVoice();
  else if (kind === 'primes') egg = makePrimes();
  return !!egg;
}
// One step of the egg's clock; a hold let go early runs it back out.
function stepEgg(dt, holding) {
  if (!egg) return;
  if (egg.kind === 'voice') {
    egg.t += dt;
    // Reduced motion: the spin rises only four times.
    stepVoice(egg, dt, holding, SPIN_PERIOD, calm ? 4 : Infinity);
    if (egg.done) egg = null;
    return;
  }
  if (egg.t < 0 && !holding && !egg.rare) {
    egg.t -= dt * 2;
    if (egg.t <= CUE - HOLD) { egg.stop?.(); egg = null; }
    return;
  }
  egg.t += dt;
  if (egg.kind === 'carrington') {
    if (egg.t >= 0 && !egg.fired) {
      egg.fired = true;
      const fl = startFlare(sun, egg.rg, st.time, calm ? 1.1 : 1.6);
      snd.flare(clamp(toCss(toView(egg.rg.c.map(x => x * R)))[0] / cssW * 2 - 1, -1, 1), st.star, 1);
    }
    if (egg.t >= CARR_END) egg = null;
  } else if (egg.kind === 'dimming') {
    if (egg.t >= 0 && !egg.fired) { egg.fired = true; snd.dim(st.star); }
    if (egg.t >= DIM_END) egg = null;
  } else if (egg.kind === 'sunshine') {
    if (egg.t >= SHIP_END) { egg.stop?.(); egg = null; }
  } else if (egg.kind === 'bluedot') {
    if (egg.t >= DOT_END) egg = null;
  } else if (egg.kind === 'primes') {
    // Each pulse sounds one soft note; each group of pulses its own note.
    while (egg.next < PULSES.length && egg.t >= PULSES[egg.next][0]) snd.prime?.(st.star, PULSES[egg.next++][1]);
    if (egg.t >= PRIME_END) egg = null;
  } else if (egg.kind === 'probe') {
    // The beacon pips on each blink, its pitch shifted down with the light.
    if (stepProbe(egg, dt) && egg.t > 0) snd.pip?.(880 * probe(egg).g, probe(egg).g * probe(egg).w);
    if (egg.t >= PROBE_END) egg = null;
  } else if (egg.kind === 'notyet') {
    if (stepNotYet(egg, dt)) snd.tick?.(0.4 + 0.6 * notYet(egg).light);
    if (egg.t >= NY_PEAK && !egg.fired) { egg.fired = true; snd.flare(0, st.star, 1); }
    if (egg.t >= NY_END) egg = null;
  }
}
// The egg's uniforms. Carrington: two spots, two kernels, each a view point and a weight.
// The dimming: south in the view frame and the veil, then the cool patch.
function eggFrame(out, dim) {
  out.fill(0); dim.fill(0);
  if (egg?.kind === 'carrington') {
    const c = carrington(egg);
    [...c.spots, ...c.kernels].forEach(([p, w], k) => out.set([...toView(p), calm ? w * 0.7 : w], k * 4));
  } else if (egg?.kind === 'dimming' || egg?.kind === 'notyet') {
    const d = egg.kind === 'dimming' ? dimming(egg) : notYet(egg);
    dim.set([...toView(SOUTH), d.veil, d.cool, 0, 0, 0]);
  }
}

/* ---------- frame state for the renderer ---------- */
const frameState = {
  view: new Float32Array(4), rot: new Float32Array(9), toSun: new Float32Array(9),
  regs: new Float32Array(4 * NR), spots: new Float32Array(4 * NR), sway: new Float32Array(2), fl: new Float32Array(4 * MAX_FLARES), flB: new Float32Array(4 * MAX_FLARES),
  sat: new Float32Array(4 * MAX_FLARES), time: 0, band: null, count: 0, data: null, bloomLevels: 5, frameNo: 0, sc: 1,
  centre: new Float32Array(2), bodyA: new Float32Array(4), bodyB: new Float32Array(4), bodyK: new Float32Array(2), ship: new Float32Array(4), ship2: new Float32Array(4), dot: new Float32Array(4), probe: new Float32Array(4), probe2: new Float32Array(4), shimmer: 0, lens: 0,
  beam: new Float32Array(4), yso: new Float32Array(4), lump: new Float32Array(4), beat: new Float32Array(4), cam: new Float32Array(4), film: new Float32Array(4), volDens: 1, volLight: 0.4, full: 0, corona: 0, bend: 1, far: 0, off: 1,
  fx1: new Float32Array(4), fx2: new Float32Array(4), fx3: new Float32Array(4), fx4: new Float32Array(4), fx5: new Float32Array(4),
  egg: new Float32Array(16), dim: new Float32Array(8),
  hole: new Float32Array(4), holeSky: new Float32Array(2), holeF: new Float32Array(2), holeV: new Float32Array(4), holeQ: new Float32Array(4),
  ring: new Float32Array(4), ring2: new Float32Array(4), ring3: new Float32Array(4), shell: new Float32Array(4), pair: new Float32Array(4), pair2: new Float32Array(4), bow: new Float32Array(4), bowC: new Float32Array(3), camM: new Float32Array(9), lh: new Float32Array(4), pulse: -1, quake: new Float32Array(4), flashW: 1, nsBend: new Float32Array(2), ns: new Float32Array(4), nsU: new Float32Array(4), nsV: new Float32Array(4),
  bin: new Float32Array(4), binD: new Float32Array(4), binN: new Float32Array(4), gas: new Float32Array(4), path: new Float32Array(48),
};
// The view on the last frame: motion blur maps each pixel to where it stood then.
const was = { cx: 0, cy: 0, hw: 1, hh: 1, ok: false };
// The move map for a frame with no blur: each pixel stays where it is.
const NO_MOVE = [1, 1, 0, 0];
function makeFrame() {
  const f = frameState;
  // Dev frame blending and motion blur (Tom, 2026-11-24); both off by default.
  // At 0 an option is off: no post data, so no pass, and no move worked out (Tom, 2026-11-25).
  const blur = Number(gv('motionBlur', 0)), blend = Number(gv('frameBlend', 0));
  if (blur > 0) {
    // The first blurred frame has no last view: it starts with none.
    if (!was.ok) Object.assign(was, { cx: view.cx, cy: view.cy, hw: view.hw, hh: view.hh, ok: true });
    const mv = [view.hw / was.hw, view.hh / was.hh, (view.cx - view.hw - was.cx) / (2 * was.hw) + 0.5, (view.cy - view.hh - was.cy) / (2 * was.hh) + 0.5];
    Object.assign(was, { cx: view.cx, cy: view.cy, hw: view.hw, hh: view.hh });
    f.post = { blur, blend, mv };
  } else {
    was.ok = false;
    f.post = blend > 0 ? { blur: 0, blend, mv: NO_MOVE } : null;
  }
  f.view.set([view.cx, view.cy, view.hw, view.hh]);
  setRot();
  // Column-major: the rot columns are M's columns; toSun is M transposed.
  f.rot.set([M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2], M[2][2]]);
  f.toSun.set([M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]]);
  const act = st.activity / 100;
  sun.regions.forEach((rg, k) => {
    const fl = sun.flares.find(q => q.rg === rg);
    const boost = fl ? 1 + 1.2 * Math.exp(-fl.t / 6) : 1;
    f.regs.set([...toView(rg.c), (0.45 + 0.75 * act) * boost * (1 + LIT_GAIN * (rg.lit || 0))], k * 4);
  });
  f.fl.fill(0); f.flB.fill(0); f.sat.fill(0);
  sun.flares.forEach((fl, k) => {
    const fv = flareView(fl, shown);
    // How directly the flare faces the eye: 0 at the limb, 1 at the disk's middle.
    fl.face = clamp(toView(fl.rg.c)[2]);
    f.fl.set([...toView(fv.c), 0], k * 4);
    f.flB.set([fv.bubble[0], fv.bubble[1], fv.bubble[2], 0], k * 4);
    // The saturated core shows where the kernel is in view; behind the limb, the arcade top shines.
    let v = toView(fv.c.map(x => x * (R + fv.kernel[0])));
    // A face-on core stands against the bright disk, so it burns harder (Tom, 2026-11-24).
    let S = fv.kernel[1] * (1 + 1.2 * fl.face);
    if (hidden(v)) { v = toView(fv.c.map(x => x * (R + fl.rg.span[1] * 0.8))); S *= hidden(v) ? 0 : 0.45; }
    // The core sits where the bent light shows it.
    const vb = bendV(v);
    const sx = ((vb[0] - view.cx) / view.hw * 0.5 + 0.5) * view.W;
    const sy = ((vb[1] - view.cy) / view.hh * 0.5 + 0.5) * view.H;
    f.sat.set([sx, sy, calm ? S * 0.6 : S, 0], k * 4);
  });
  f.time = st.time;
  const star = STARS[shown];
  f.band = star;
  // Sunspots: Activity opens each region's spots in turn and grows them.
  sun.regions.forEach((rg, k) => {
    const open = ease(clamp((act * 1.2 - rg.spot) / 0.25));
    f.spots.set([...toView(rg.e), star.spots * open * (0.4 + 0.6 * act)], k * 4);
  });
  // A black hole: the trace replaces the disk; no loops, haze, corona or glare.
  const hole = star.hole;
  devRows(star);
  f.count = hole ? 0 : strands(sun, st.time, { star: shown, activity: act, spin: pulsarTurns(STARS[shown]) ? 0 : st.spin }, ren.data);
  const hd = fxv('fxHDisc');
  f.hole.set(hole ? [1, hole.tilt, hole.light * hd, hole.heat] : [0, 0, 0, 0]);
  f.holeSky.set([2 * view.hh / view.H * BCRIT / R, hole ? hole.stars : 0]);
  f.holeF.set([hole ? 1 : 0, hole ? hole.stars : 0]);
  // The volumetric layer over a hole's disc, and a quasar's torus, clouds and winds.
  const hv = hole?.vol, hq = hole?.qso;
  // The clouds take the disc's light too, so Disc light divides out of theirs.
  f.holeV.set(hv ? [1, hv.dens * fxv('fxHCloud'), hv.light * fxv('fxHCLight') / Math.max(hd, 1e-3), hq ? 40 : 18] : [0, 0, 0, 0]);
  f.holeQ.set(hq ? [1, hq.torus * fxv('fxHTorus'), hq.clouds * fxv('fxHBlr'), hq.winds * fxv('fxHWinds')] : [0, 0, 0, 0]);
  f.jet = star.jet * (hole ? fxv('fxHJet') : 1);
  // A giant ring system drifts slowly across the star, so its bands sweep the disk.
  const rg = star.ring;
  if (rg) {
    // The rings hang in space: the camera's turn carries their centre and their tilt.
    // Rings round the star stay centred on it; a companion's drift slowly across.
    const sway = rg.outer ? 0 : 1;
    const c = camView([rg.cx + 7 * sway * Math.sin(st.time * 0.03), rg.cy + 2 * sway * Math.cos(st.time * 0.021), 0]);
    // The ring plane in 3D: its normal leans so the rings draw at the axis ratio, then the drag turns it.
    // On screen the ellipse's major axis lies across the normal; its minor ratio is the normal's depth.
    const sq = Math.sqrt(1 - rg.ratio * rg.ratio);
    const nrm = camView([-Math.sin(rg.angle) * sq, Math.cos(rg.angle) * sq, rg.ratio]);
    const nl = Math.hypot(nrm[0], nrm[1]) || 1e-6;
    const ex = nrm[1] / nl, ey = -nrm[0] / nl;
    // The half whose in-plane direction leans toward the eye is the near half; its sign rides the ratio.
    const w = [nrm[1] * 0 - nrm[2] * ey, nrm[2] * ex - nrm[0] * 0, nrm[0] * ey - nrm[1] * ex];
    // Positive when the half above the major axis leans away: that half is the far one.
    const side = -Math.sign((w[0] * -ey + w[1] * ex) * w[2]) || 1;
    f.ring.set([rg.tau, c[0], c[1], Math.max(Math.abs(nrm[2]), 0.02) * side]);
    f.ring2.set([Math.atan2(ey, ex), rg.glow, rg.inner ?? 0, rg.outer ?? 0]);
    // Fomalhaut's belt by default: its dust cloud, a thin belt, clumps.
    f.ring3.set([rg.cloud ?? 1, rg.width ?? 0.1, rg.clump ?? 0.9, 0]);
  } else { f.ring.fill(0); f.ring2.fill(0); f.ring3.fill(0); }
  // A runaway: its bow shock or wake, in the view's frame.
  const bw = star.bow;
  // The heading turns with the camera, so the arc or the wake keeps its place round the star.
  if (bw) {
    const h = camView([Math.cos(bw.heading), Math.sin(bw.heading), 0]);
    f.bow.set([1, Math.atan2(h[1], h[0]), bw.size, bw.kind]); f.bowC.set(bw.col);
  } else { f.bow.fill(0); f.bowC.fill(0); }
  // WR 140's dust shells: one per orbit, counted on the star's own clock.
  const sh = star.shells;
  f.shell.set(sh ? [sh.light, sh.gap, st.turn / (sh.orbit * 86400), 0] : [0, 0, 0, 0]);
  // A partner star holds still in the star's frame: a contact twin is tidally locked.
  const pr = star.pair;
  f.pair.set(pr ? [...toView(pr.at), 1] : [0, 0, 0, 0]);
  f.pair2.set(pr ? [pr.size, pr.neck, pr.cool, 0] : [0, 0, 0, 0]);
  // The camera's turn, column-major and transposed: the shaders take view points back into it.
  f.camM.set([CAM[0][0], CAM[0][1], CAM[0][2], CAM[1][0], CAM[1][1], CAM[1][2], CAM[2][0], CAM[2][1], CAM[2][2]]);
  // A binary: the donor turns once per orbit, so its partner holds still in the star's frame.
  // The stream follows the path gravity traced from L1; the gas lives in the volume pass.
  const bn = star.bin;
  if (bn) {
    const c = toView([bn.a, 0, 0]);
    f.bin.set([c[0], c[1], c[2], 1]);
    f.binD.set([bn.rd, bn.th, bn.jet, bn.light]);
    f.binN.set([...toView([0, 1, 0]), 0]);
    f.gas.set([1, 2.5 * bn.light * fxv('fxVolLight'), 3 * bn.heat, 4.5 * bn.heat]);
    streamPath(bn).forEach((q, k) => f.path.set([...toView(q.slice(0, 3)), q[3]], k * 4));
  } else { f.bin.fill(0); f.binD.fill(0); f.binN.fill(0); f.gas.fill(0); }
  f.data = ren.data;
  f.bloomLevels = D.rung >= 2 ? 3 : 5;
  // The slowest rung marches the haze and the light rays in fewer steps.
  f.march = D.rung >= 3 ? 0.56 : 1;
  f.frameNo = calm ? 0 : frameNo;
  f.sc = Math.max(1, view.H / 900);
  // The detail ladder can drop the resolution mid-zoom; the grain follows CSS pixels.
  f.dpr = view.H / Math.max(1, cssH);
  // The switch dip fades the whole frame, glare, stars and grain too.
  f.dip = dipLight();
  // The haze's history weight: it holds while the view rests and lets go while it moves (Tom, 2026-11-24).
  // A new star on screen starts it afresh.
  const move = Math.abs(cam.z - hold.z) * 10 + (Math.abs(st.yaw - hold.yaw) + Math.abs(st.pitch - hold.pitch)) * 20;
  // Dev Haze denoise scales the history; 1.1 reaches 0.935, 0 turns it off.
  f.volHold = shown === hold.star ? 0.85 * fxv('fxDenoise') * Math.exp(-move * 40) : 0;
  Object.assign(hold, { z: cam.z, yaw: st.yaw, pitch: st.pitch, star: shown });
  // The sun's centre on the screen, in 0 to 1: the light rays aim at it.
  f.centre.set([0.5 - view.cx / view.hw * 0.5, 0.5 - view.cy / view.hh * 0.5]);
  // Mercury at true size, in transit on the long lens; nothing beside the limb.
  const ppm = view.H / (2 * view.hh);
  const px = (x, y) => [((x - view.cx) / view.hw * 0.5 + 0.5) * view.W, ((y - view.cy) / view.hh * 0.5 + 0.5) * view.H];
  const w = fit.wide, wh = w.hw / view.asp;
  const rA = bodySize(star, star.wide) * 0.5;
  let ex = w.cx + w.hw * 0.42, ey = R + (w.cy + wh - R) * 0.24;
  // A body too big for the sky hangs in the top right corner, cut by the frame.
  if (rA > 0.12 * wh) { ex = w.cx + w.hw * 0.72 + rA * 0.45; ey = w.cy + wh * 0.5 + rA * 0.35; }
  const [ax, ay] = px(ex, ey);
  f.bodyA.set([ax, ay, rA * ppm, star.wide === 'none' ? 0 : 1 - weight('long')]);
  const L = fit.long;
  // The transit runs level across the disk, east to west with the star's turn (Tom, 2026-11-24).
  // Its chord passes through the long lens frame, a little south of the equator.
  const by = L.cy, cw = Math.sqrt(Math.max(0, R * R - by * by)), span = 2 * cw + 60;
  const bx = ((st.time * 1.5) % span) - span / 2;
  const [qx, qy] = px(bx, by);
  const on = star.long === 'none' ? 0 : Math.min(1, Math.max(0, (R - Math.hypot(bx, by)) / 6));
  // The transit shows on the long lens and on the full star.
  f.bodyB.set([qx, qy, bodySize(star, star.long) * 0.5 * ppm, (1 - weight('wide')) * on]);
  f.bodyK.set([BODIES[star.wide].kind, BODIES[star.long].kind]);
  // The Sun's egg: the ship in transit, a little north of Mercury's chord.
  // It draws larger than true, so it reads; never smaller than 5 CSS pixels.
  if (egg?.kind === 'sunshine') {
    const sh = sunshine(egg), [sx, sy] = px(sh.x, by + 22);
    const size = Math.max(bodySize(star, star.long) * 0.5 * ppm * 1.8, 5 * view.H / cssH);
    f.ship.set([sx, sy, size, sh.w * (1 - weight('wide'))]);
    f.ship2.set([sh.heading, sh.tilt, sh.glint, 0]);
  } else f.ship.fill(0);
  // The pale blue dot: a ray of scattered light beside the star, one pale blue pixel in it.
  // The dot stands a fifth of the frame off the star, across the ray's line.
  if (egg?.kind === 'bluedot') {
    const b = blueDot(egg), [ox, oy] = px(0, 0), H = view.H, a = -0.36;
    const nx = -Math.sin(a), ny = Math.cos(a), dx = Math.cos(a), dy = Math.sin(a);
    f.dot.set([ox + nx * 0.2 * H + dx * 0.16 * H, oy + ny * 0.2 * H + dy * 0.16 * H, b.ray, b.dot]);
  } else f.dot.fill(0);
  // The probe at the horizon: its place and size in pixels, its weight; its redshift and blink.
  if (egg?.kind === 'probe') {
    const p = probe(egg), [x, y] = px(R * p.s * Math.cos(p.a), R * p.s * Math.sin(p.a));
    const blink = calm ? 0.5 : Math.exp(-((((egg.ph % 1) - 0.08) / 0.05) ** 2));
    f.probe.set([x, y, 2.6 * view.H / cssH, p.w]);
    f.probe2.set([p.g, blink, 0, 0]);
  } else f.probe.fill(0);
  // The pulsar's magnetic axis, in the view frame.
  if (star.beam) f.beam.set([...toView(magNow()), star.beam]); else f.beam.fill(0);
  // The pulsar is the lighthouse on true physics (Tom, 2026-11-24): the striped wind, no torus or jets.
  const ns = star.ns;
  // The spin's in-plane axes, as magAxis builds them, so the sheet's phase follows the caps.
  if (ns) {
    const u0 = [SPIN[1], -SPIN[0], 0], ul = Math.hypot(u0[0], u0[1]), u = [u0[0] / ul, u0[1] / ul, 0];
    const v = [SPIN[1] * u[2] - SPIN[2] * u[1], SPIN[2] * u[0] - SPIN[0] * u[2], SPIN[0] * u[1] - SPIN[1] * u[0]];
    f.ns.set([1, ns.u, ns.wind, ns.rl]);
    // The body's turn already carries u and v, so the sheet needs no phase of its own.
    f.nsU.set([...toView(u), 0]);
    f.nsV.set([...toView(v), Math.acos(SPIN[2])]);
  } else { f.ns.fill(0); f.nsU.fill(0); f.nsV.fill(0); }
  // A magnetar's giant flare, every gap s on its own clock; the first comes 8 s after a pick.
  const qk = star.quake;
  if (qk) {
    if (quakeOf !== shown) { quakeOf = shown; quakeFrom = st.time; }
    const t = ((st.time - quakeFrom - 8) % qk.gap + qk.gap) % qk.gap;
    // The flash rises in 0.15 s and dies in under a second, as the 2004 spike did.
    const flash = t < 0.15 ? t / 0.15 : Math.exp(-(t - 0.15) / 0.35);
    const ring = Math.exp(-t / 2) * (1 - Math.exp(-t / 0.1));
    // The tail beats with the spin: the hot spot turns toward the eye and away.
    const beat = 0.5 + 0.5 * Math.cos(2 * Math.PI * st.spin / spinOf(star));
    const tail = 0.6 * Math.exp(-t / 30) * beat * beat * clamp((t - 1) / 2);
    const k = qk.light * (calm ? 0.35 : 1);
    f.quake.set([flash * k, 1 + 3.5 * (1 - Math.exp(-t / 1.5)), ring * k, tail * k]);
  } else { f.quake.fill(0); quakeOf = ''; }
  // Every pulsar flash, near or far, keeps under 2.5 flashes a second: fast spins blend to a glow.
  const flashRate = (egg?.kind === 'voice' ? egg.rate : 1) / spinOf(star);
  f.flashW = star.beam ? 1 - 0.8 * clamp((flashRate - 1.5) / 1) : 1;
  // The lighthouse (Tom, 2026-11-24): the beams light dust in the volume, and the pulse strobes far out.
  // A strobe faster than 2.5 flashes a second blends to a steady glow: no photosensitive flicker.
  if (ns && star.beam) {
    const m = toView(magNow());
    const rate = (egg?.kind === 'voice' ? egg.rate : 1) / spinOf(star);
    const steady = clamp((rate - 1.5) / 1);
    // About a tenth of a second wide, so each flash lands on several frames.
    const hit = Math.exp(-(1 - Math.abs(m[2])) / 0.01);
    f.lh.set([...m, ns.beam * (calm ? 0.6 : 1)]);
    f.pulse = (hit * (1 - steady) + 0.2 * steady) * (calm ? 0.35 : 1);
  } else { f.lh.fill(0); f.pulse = -1; }
  // A young star's disk and jets turn with the star.
  const ya = Math.hypot(star.yso[0], star.yso[1], star.yso[2]);
  f.yso.set([...toView(star.yso.slice(0, 3).map(x => x / ya)), star.yso[3]]);
  f.lump.set([star.lump[0], star.lump[1], churn, star.lump[3]]);
  // A pulsing star beats on its own clock: the light rises fast and fades slowly.
  // Mira's radius peaks near phase 0.4, after its light.
  const bt = star.beat;
  if (bt) {
    const ph = st.turn / (bt.days * 86400) % 1 * 2 * Math.PI;
    f.beat.set([bt.swell * Math.cos(ph - 0.8 * Math.PI), bt.light * Math.cos(ph + 0.6 * Math.sin(ph)), 0, 1]);
  } else f.beat.fill(0);
  // The haze layers slide with the pan; gravity bends light round a neutron star.
  // Past the full star the view pulls back; the eye's light values trail the zoom.
  const far = eye.far;
  f.far = far;
  // The pulsar bends its own light in the disk pass, so the final pass shifts nothing.
  f.cam.set([st.yaw, st.pitch, 0, far]);
  f.nsBend.set([pulsarTurns(star) ? 1 : 0, star.ns?.u ?? 0]);
  f.sway.set([sway.x, sway.y]);
  // Real light (Tom, 2026-11-24): up close the star is masked so the corona shows.
  // Pulled back, the exposure rises and the disk outshines what lies round it.
  const real = eye.real;
  const lift = 2 ** (2.2 * real * fxv('fxReal'));
  // Off-disk light keeps a quarter of its look against the lifted disk; far off it fades.
  f.off = (1 - 0.75 * real) / lift * (1 - 0.8 * far);
  f.glare = hole ? 0 : real * fxv('fxGlare');
  f.lift = lift;
  // Film: fine grain, no weave, faint lens dirt, no flicker: a vista, not a feed.
  // w: the star's dust, which keeps the haze over its disk.
  // A binary's gas crosses the donor's face, so the volume shows over the disk.
  f.film.set([0.018, 0, 0.35, star.bin ? 1 : star.dust]);
  // The volume: denser on the long lens and round the dusty giants; lit by the star.
  f.volDens = (1.3 + 0.6 * weight('long')) * (1 + 0.3 * star.dust) * fxv('fxVol');
  f.volDens *= (1 - 0.95 * far) * (hole ? 0 : 1) * (star.bin ? 0.3 : 1);
  f.volLight = 1.3 * star.disk[0] / (1 + star.dust) * fxv('fxVolLight') * f.off;
  // The 3D corona shows in the full view; its light follows the star's own corona.
  f.corona = hole ? 0 : weight('full') * fxv('fxCorona') * star.disk[3] * 6 * f.off;
  f.bend = fxv('fxBend');
  f.fx1.set([fxv('fxBloom'), fxv('fxRays'), fxv('fxSplit'), fxv('fxHal')]);
  f.fx2.set([fxv('fxStreak'), fxv('fxDirt'), fxv('fxRoll'), fxv('fxVig')]);
  // Vega's primes egg pulses the exposure.
  if (egg?.kind === 'primes') f.lift *= 1 + (calm ? 0.25 : 0.45) * primes(egg);
  // Betelgeuse's supernova whites the frame out, then rewinds.
  if (egg?.kind === 'notyet') f.lift *= 1 + (calm ? 2 : 16) * notYet(egg).light;
  f.fx3.set([fxv('fxGrain'), fxv('fxExpo'), fxv('fxShimmer'), f.lift]);
  f.fx4.set([Number(gv('fxTone', '1')), Number(gv('fxLook', '0')), gv('fxContrast', 1), gv('fxSat', 1)]);
  f.fx5.set([gv('fxWarm', 0), fxv('fxOrb'), fxv('fxGhost'), f.glare]);
  eggFrame(f.egg, f.dim);
  f.fluid = fluidRun ? fluidFrame(fluidRun) : null;
  // The binary's gas and the lighthouse dim with the light round the disk as the view pulls back.
  // The full star keeps the look Tom approved: the scale is 1 there and below 1 farther out.
  const offRel = clamp(f.off / 0.79);
  if (star.bin) { f.gas[1] *= offRel; f.gas[2] *= offRel; f.gas[3] *= offRel; }
  f.lh[3] *= offRel;
  f.lens = weight('long');
  // The full view's half exposure is for a bright disk; a black hole keeps its light.
  f.full = hole ? 0 : weight('full');
  // Heat haze is a star's; a black hole and the quasar take none (Tom, 2026-11-24).
  f.shimmer = calm || hole ? 0 : 2.2 * view.W / cssW;
  return f;
}
// The magnetar's flare clock: the star it runs for, and when it started.
let quakeOf = '', quakeFrom = 0;
// The view the card and the article last stood in.
let infoView = '';
function draw() {
  if (!ren) return;
  ren.frame(makeFrame());
  // The card and the article stand in the open sky of the view in hand.
  const iv = cam.z > NOTCH + 0.3 ? 'far' : cam.mode;
  if (iv !== infoView) { infoView = iv; card.setView(iv); article.setView(iv); }
  // Hidden S stars cost nothing: draw only clears the layer once, then returns at once.
  sst.draw({ on: shown === 'sgra' && sVis > 0, light: dipLight() * sVis, view, w: cssW, h: cssH, dpr: view.H / Math.max(1, cssH), R, cam: camView, rot: M, tilt: STARS[shown].hole?.tilt ?? 0, far: farAt(cam.z) });
}

// The fluid's step and draw for this frame: the box stands under the prominence, radial up.
// Its guide follows the prominence's own size, growing as the threads do in an eruption.
function fluidFrame(r) {
  const p = r.owner;
  const { c, e, f: g } = p;
  const t = r.t;
  const ph = promPhase(p);
  const lifting = p.erupt >= 0 && p.erupt < 17;
  const guide = new Float32Array([p.type === 'arch' ? 1 : 2, p.len / 2, p.h * (1 + ph.grow), 28]);
  const out = {
    step: { dt: r.dt, t, reset: r.first, warm: r.first ? 150 : 0, emit: ph.fade, lift: lifting ? 6 + 10 * p.erupt : 0, guide },
    view: frameState.view, toSun: frameState.toSun,
    box: new Float32Array([...e, ...c, ...g]),
    boxT: new Float32Array([e[0], c[0], g[0], e[1], c[1], g[1], e[2], c[2], g[2]]),
    origin: new Float32Array(c.map(x => x * R)),
    gain: 0.024 * STARS[shown].prom,
  };
  r.first = false;
  r.dt = 0;
  return out;
}

/* ---------- frame loop ---------- */
// Lively while a flare runs or a drag turns the sun; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  // A Dev frame cap: frames land on an even grid, so 24 and 30 look steady.
  // An early frame does nothing but wait for the next screen refresh.
  const period = 1000 / (Number(gv('fpsCap', '0')) || Infinity);
  if (period < Infinity) {
    if (now < pace - 3) { raf = requestAnimationFrame(frame); return; }
    pace = now - pace > period ? now + period : pace + period;
  }
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    drifting = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    st.time += dt * drifting * (calmMotion() ? 0.4 : 1);
    const turning = stepTurn(dt);
    clock.tick(shown, clockRead());
    st.spin += dt * (egg?.kind === 'voice' ? egg.rate : drifting);
    const zooming = stepZoom(dt);
    stepDrift(dt);
    const swaying = stepSway(dt);
    const settling = stepTurnBack(dt);
    const adapting = stepEye(dt);
    stepFlares(sun, dt * flarePace(STARS[shown]) * (calm ? 0.8 : 1));
    stepProms(sun, dt * (calm ? 0.8 : 1));
    // The S stars follow Turn; each visit starts their clock again.
    // The S stars step only while they show; the clock's years go on regardless.
    if (shown === 'sgra') { const k = dt * drifting * 10 ** (turn.lr - fitLog('sgra')); if (sVis > 0) sst.step(k); sYears += k / YEAR_S; } else { sst.reset(); sYears = 0; }
    const sFading = stepSVis(dt);
    if (FLUID) {
      // A new framing may show another prominence: the fluid moves to it.
      if (!fluidRun || fluidRun.mode !== cam.mode) { const p = promInView(); if (p) startFluid(p); }
      if (fluidRun) {
        fluidRun.dt = Math.min(dt, 1 / 30) * (calm ? 0.8 : 1) * Math.max(drifting, fluidRun.owner.erupt >= 0 ? 1 : 0);
        fluidRun.t += fluidRun.dt;
      }
    }
    // The star turns under a still mouse.
    if (hoverAt) readHover(true);
    const glowing = stepLit(dt);
    const dipping = stepDip(dt);
    // A still press past the cue starts the star's egg under it.
    const holding = pointer.id !== null && !pointer.drag;
    if (holding && !egg && !pointer.egg && (t0 - pointer.t0) / 1000 >= CUE && startEgg(pointer.x0, pointer.y0)) pointer.egg = true;
    // A second hold during the Dimming plays a supernova that rewinds: not yet.
    if (holding && egg?.kind === 'dimming' && egg.t > 0 && !pointer.egg && (t0 - pointer.t0) / 1000 >= CUE) { egg = makeNotYet(dimming(egg)); pointer.egg = true; }
    // Now and then an egg comes on its own, near the middle of the view.
    if (!egg && !calm && drifting > 0 && EGGS[st.star] && Math.random() < dt / RARE) {
      if (startEgg(cssW * (0.3 + 0.4 * Math.random()), cssH * (0.3 + 0.4 * Math.random()), true)) egg.rare = true;
    }
    stepEgg(dt, holding && pointer.egg);
    // The pulsar pings as a beam crosses the eye: st.spin mod 1.6 passes 1.2.
    // The sound guards itself above 2.5 flashes a second; a missing call does nothing.
    if (STARS[shown].beam) {
      const k = Math.floor((st.spin - 1.2) / spinOf(STARS[shown]));
      if (lastFlash !== null && k > lastFlash) snd.ping?.(clamp(-view.cx / view.hw, -1, 1), shown);
      lastFlash = k;
    } else lastFlash = null;
    // The voice egg's fast spin hums; one call with 0 ends it.
    const voice = egg?.kind === 'voice';
    if (voice) snd.spin?.(egg.rate / SPIN_PERIOD, shown); else if (spinning) snd.spin?.(0, shown);
    spinning = voice;
    draw();
    // Only back-to-back lively frames count: drift runs at 30 fps by design, and so does a Dev cap.
    if (!pinned && busy && !period) {
      D.frame(dt);
      if (!eased && D.rung > 0) {
        fastT = D.frameTime < 1 / 55 ? fastT + dt : 0;
        if (fastT > 20) { store.set('rung', D.rung - 1); eased = true; }
      }
    }
    frameNo++;
    lively = zooming || turning || swaying || settling || adapting || dipping || glowing || sFading || !!egg || holding || sun.flares.length > 0 || sun.proms.some(p => p.erupt >= 0) || pointer.drag;
    busy = lively;
    // A cut voice waits for input; the loop never restarts it.
    if (drifting > 0) { mixSound(); if (soundState !== 'cut') snd.hum(shown); }
    again = lively || drifting > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    // An idle loop just stops; the sound keeps its own clock.
    if (again) schedule(lively ? 0 : t0 + (calmMotion() ? 66 : 33) - performance.now());
  }
}
// The next frame time on the Dev cap's grid.
let pace = 0;
// One frame at most is ever pending, so loops never stack.
function schedule(delay = 0) {
  if (raf || timer || !visible || !gl || !started) return;
  if (delay > 4) timer = setTimeout(() => { timer = 0; schedule(); }, delay - 2);
  else raf = requestAnimationFrame(frame);
}
// The Dev toggles turn the hum and the rumble on and off.
// Closeness for the mix: 1 on the long lens, 0 on the full star, below 0 zoomed out.
const nearness = () => Math.log(fit.full.hw / view.hw) / Math.log(fit.full.hw / fit.long.hw);
// The eased turn rate goes along, so Beta Lyrae's swell keeps time with its orbit (Tom, 2026-11-24).
function mixSound() { snd.mixLayers(ui?.setting?.('sndHum')?.value ?? true, ui?.setting?.('sndRumble')?.value ?? true, nearness(), 10 ** turn.lr); }
function poke() {
  hear();
  lastInput = performance.now();
  if (!raf && !timer) last = performance.now();
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!started) { draw(); return; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- sound idle ---------- */
// Left alone, the choir rests at 28 s and the sound stops at 90 s (Tom, 2026-11-25).
// A mouse move counts here, so the sound idles apart from the frame loop.
// ?idle=0.1 scales the three times for QA.
const IDLE_K = Number(new URLSearchParams(location.search).get('idle')) || 1;
const REST_AT = 28 * IDLE_K, CUT_AT = 90 * IDLE_K, CUT_FADE = 4 * IDLE_K;
// The stage: awake, rest, fade or cut.
let heardAt = performance.now(), soundT = 0, soundState = 'awake';
// Input or a mouse move: the sound comes back from where it is.
function hear() {
  heardAt = performance.now();
  if (!started || !visible) return;
  const was = soundState;
  soundState = 'awake';
  if (was === 'fade') snd.unfade();
  // The page has had a gesture, so the context may resume without a new one.
  if (was === 'cut' && sound.on && kit.ac?.state === 'suspended' && navigator.userActivation?.hasBeenActive !== false) kit.wake();
  if (was !== 'awake') { snd.stir(); clearTimeout(soundT); soundT = 0; }
  // With the loop asleep, the voice starts or extends here.
  if (sound.on && !raf && !timer && !calm) { mixSound(); snd.hum(shown); }
  if (!soundT) soundT = setTimeout(soundTick, REST_AT * 1000);
}
// One timer: it checks the idle time and arms itself for the next stage.
function soundTick() {
  soundT = 0;
  if (!visible || !sound.on || soundState === 'cut') return;
  const idle = (performance.now() - heardAt) / 1000;
  let next = REST_AT;
  if (idle >= CUT_AT) {
    soundState = 'cut';
    snd.quiet();
    kit.rest(() => !raf && !timer && !snd.busy);
    return;
  }
  if (idle >= CUT_AT - CUT_FADE) {
    if (soundState !== 'fade') { snd.fade(CUT_AT - idle); soundState = 'fade'; }
    next = CUT_AT;
  } else if (idle >= REST_AT) {
    if (soundState === 'awake') { snd.settle(); soundState = 'rest'; }
    next = CUT_AT - CUT_FADE;
  }
  soundT = setTimeout(soundTick, (next - idle) * 1000 + 20);
}

/* ---------- pointer: tap flares, drag turns ---------- */
// A press becomes a drag after 8 px; otherwise a tap.
const pointer = { id: null, x0: 0, y0: 0, x: 0, y: 0, at: 0, t0: 0, drag: false, egg: false, p0: 0, w0: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ren || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  const now = performance.now();
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, x, y, at: now, t0: now, drag: false, egg: false, p0: st.pitch, w0: st.yaw });
  pressed = pickAt(x, y).t;
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  const now = performance.now();
  pointer.x = x; pointer.y = y; pointer.at = now;
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) { pointer.drag = true; pressed = null; readHover(); }
  if (!pointer.drag) return;
  // The surface follows the hand, like a ball rolled under it.
  const k = 0.75 / Math.max(320, cssH);
  // The long lens holds still; far out the mouse sways the lens instead.
  if (!canTurn()) return;
  st.pitch = clamp(pointer.p0 + (y - pointer.y0) * k, -0.32, 0.32);
  st.yaw = clamp(pointer.w0 + (x - pointer.x0) * k, -0.32, 0.32);
  setRot();
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  // A press that started an egg is not a tap.
  const tap = e.type === 'pointerup' && !pointer.drag && !pointer.egg;
  pointer.id = null; pointer.drag = false; pressed = null;
  if (tap) flareNear(pointer.x, pointer.y);
  readHover();
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  hoverAt = e.target === canvas || e.target === stage ? local(e) : null;
  readHover();
  if (farAt(cam.z) > 0) poke(); else hear();
});
stage.addEventListener('pointerleave', () => { hoverAt = null; readHover(); poke(); });

// The view as it stood on the last frame, for the haze's history weight.
const hold = { z: 0, yaw: 0, pitch: 0, star: null };

/* ---------- the star's turn ---------- */
// Advances the star's own turn at its eased rate; true while the rate still eases.
// Reduced motion jumps to the new rate.
// The giant cells' churn phase (Tom, 2026-11-24).
let churn = 0;
function stepTurn(dt) {
  const target = rateLog(shown);
  let easing = false;
  // A new star takes its own rate at once, behind the switch's black.
  if (calm || turn.of !== shown) { turn.lr = target; turn.vr = 0; turn.of = shown; }
  else if (Math.abs(turn.lr - target) > 1e-4 || Math.abs(turn.vr) > 1e-4) {
    [turn.lr, turn.vr] = follow(turn.lr, target, turn.vr, 0.35, dt);
    easing = true;
  } else { turn.lr = target; turn.vr = 0; }
  st.turn += dt * drifting * 10 ** turn.lr;
  // A giant's cells churn with Turn: a lobe lives about 40 s at 10x.
  churn += dt * drifting * 0.025 * 10 ** (turn.lr - fitLog(shown)) * STARS[shown].lump[2];
  return easing;
}

/* ---------- turn back: a released star eases home ---------- */
// After a drag the star turns back to its home angle over about 3 s (Tom, 2026-11-24).
const back = { vp: 0, vy: 0 };
const BACK_T = 0.9;
// Steps the return; true while the star still turns.
function stepTurnBack(dt) {
  if (pointer.drag || (st.pitch === 0 && st.yaw === 0)) return false;
  if (calm) { st.pitch = st.yaw = 0; back.vp = back.vy = 0; setRot(); return false; }
  [st.pitch, back.vp] = follow(st.pitch, 0, back.vp, BACK_T, dt);
  [st.yaw, back.vy] = follow(st.yaw, 0, back.vy, BACK_T, dt);
  if (Math.abs(st.pitch) + Math.abs(st.yaw) + Math.abs(back.vp) + Math.abs(back.vy) < 1e-4) { st.pitch = st.yaw = 0; back.vp = back.vy = 0; }
  setRot();
  return true;
}

/* ---------- the eye: light adapts late to the zoom ---------- */
// Zooming in from far, the glare and flare overpower for a moment, then the exposure settles (Tom, 2026-11-24).
const eye = { real: 0, far: 0, vr: 0, vf: 0 };
// Each value's time constant: it lingers bright on the way in and adapts faster on the way out.
const EYE_IN = 0.6, EYE_OUT = 0.2;
// Steps the eye; true while it adapts.
function stepEye(dt) {
  const real = realAt(cam.z), far = farAt(cam.z);
  if (calm || !started) { Object.assign(eye, { real, far, vr: 0, vf: 0 }); return false; }
  [eye.real, eye.vr] = follow(eye.real, real, eye.vr, real < eye.real ? EYE_IN : EYE_OUT, dt);
  [eye.far, eye.vf] = follow(eye.far, far, eye.vf, far < eye.far ? EYE_IN : EYE_OUT, dt);
  const still = Math.abs(real - eye.real) + Math.abs(far - eye.far) + Math.abs(eye.vr) + Math.abs(eye.vf) < 1e-4;
  if (still) Object.assign(eye, { real, far, vr: 0, vf: 0 });
  return !still;
}

/* ---------- sway: far out the mouse gently nudges the lens ---------- */
// A slow, critically damped follow: no overshoot, about 2 s to settle (Tom, 2026-11-24).
const sway = { x: 0, y: 0, vx: 0, vy: 0 };
const SWAY_T = 0.9;
// Steps the follow; true while it moves.
// A lensed far star sways from the full view on: its full view is already far out (Tom, 2026-11-24).
function stepSway(dt) {
  const lensed = STARS[shown]?.bow?.kind === 2;
  const on = calm ? 0 : lensed ? Math.max(farAt(cam.z), clamp(cam.z - NOTCH + 1, 0, 1)) : farAt(cam.z);
  const tx = hoverAt && on ? (hoverAt[0] / cssW * 2 - 1) * on : 0;
  const ty = hoverAt && on ? (1 - hoverAt[1] / cssH * 2) * on : 0;
  [sway.x, sway.vx] = follow(sway.x, tx, sway.vx, SWAY_T, dt);
  [sway.y, sway.vy] = follow(sway.y, ty, sway.vy, SWAY_T, dt);
  const still = Math.abs(tx - sway.x) + Math.abs(ty - sway.y) + Math.abs(sway.vx) + Math.abs(sway.vy) < 1e-4;
  if (still) { sway.x = tx; sway.y = ty; sway.vx = sway.vy = 0; }
  return !still;
}
// Zoom through every view: the wheel, a two-finger pinch, the - and = keys.
stage.addEventListener('wheel', e => {
  e.preventDefault();
  // Line and page scrolls, as from some mice, count as pixels.
  const px = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
  zoomBy(clamp(e.deltaY * px, -120, 120) * 0.0025);
}, { passive: false });
const touches = new Map();
let pinch0 = 0;
const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
stage.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  touches.set(e.pointerId, local(e));
  // A second finger ends the tap and the turn.
  if (touches.size === 2) { pinch0 = spread(); pointer.drag = true; pressed = null; }
});
stage.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  touches.set(e.pointerId, local(e));
  if (touches.size !== 2 || !pinch0) return;
  const d = spread();
  zoomBy(Math.log2(pinch0 / Math.max(d, 1)));
  pinch0 = d;
});
['pointerup', 'pointercancel'].forEach(t => stage.addEventListener(t, e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; }));
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return;
  if (e.key === '-' || e.key === '_') zoomBy(0.25);
  else if (e.key === '=' || e.key === '+') zoomBy(-0.25);
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); soundTick(); }
  else { halt(); pointer.id = null; pointer.drag = false; pressed = null; snd.quiet(); clearTimeout(soundT); soundT = 0; }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) { soundState = 'cut'; poke(); } else { snd.quiet(); clearTimeout(soundT); soundT = 0; } });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  // The renderer compiles the disk pass for the star on screen first.
  ren = await makeRender(gl, { fluid: FLUID, star: st.star, step: built });
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; ren = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
// The load line: programs, three bakes, the first star's pass, the first frame.
// The intro names each step above the line as it starts.
const firstName = st.star === 'sun' ? 'the Sun' : PICKS.find(x => x.value === st.star)?.name || 'the star';
const built = buildSteps(6, ['Compiling shaders', 'Baking the haze', 'Baking the black holes', 'Baking the quasar', `Compiling ${firstName}`, 'Drawing the first frame']);
try {
  await setup();
  // The first frame is a picture: loops at every stage of their lives.
  resize(true);
  draw();
  gl.finish();
  // No stored rung: a second, timed frame guesses where this machine starts.
  if (!pinned && savedRung === null) {
    const t0 = performance.now();
    draw();
    gl.finish();
    const ms = performance.now() - t0;
    seedRung(ms > 150 ? 2 : ms > 60 ? 1 : 0);
  }
  built();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  poke();
  // Once the intro has gone, the view glides in from far out; the card plays when it settles.
  setTimeout(glideIn, 400);
  // The other stars' disk passes compile in idle time, nearest in the list first.
  // They start after the glide in and wait while the star moves, so no compile hitches it.
  const at = PICKS.findIndex(x => x.value === st.star);
  const order = PICKS.map((x, i) => [x.value, Math.min(Math.abs(i - at), PICKS.length - Math.abs(i - at))]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  setTimeout(() => ren?.warm?.(order, () => busy || !visible), 400 + GLIDE_MS);
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
