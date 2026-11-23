// Volcano sim: pressure, bombs, spatter, ash puffs, lightning and the pressure ring.
// Units are metres and seconds. The sim knows nothing of three.js.
import { height, normalAt, RIM_H } from './terrain.js';

export const G = 9.81;
export const C_SOUND = 343;
// The mountain stands at true scale: lengths grow by L, speeds by its root.
const L = 3.5, V = Math.sqrt(L);
export const VENT = [0, RIM_H - 20, 0];
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// A normal sample, for the spread of bomb angles.
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

export function makeWorld({ maxSparks = 4000, maxPuffs = 700 } = {}) {
  return {
    t: 0, maxSparks, maxPuffs, scale: 1,
    sparks: [], puffs: [], bolts: [], rings: [], emitters: [], events: [],
    pressure: 0, charging: false,
    heat: 0.2, flash: 0, glare: 0, tremor: 0, wind: 0.45,
    steamT: 0, soft: false,
  };
}

/* ---------- triggers ---------- */
export function charge(W, on) { W.charging = on; }

// The blast: size runs from 0.1 (a tap) to 1 (a full hold).
export function blast(W, size) {
  const s = Math.max(0.1, Math.min(1, size));
  const soft = W.soft ? 0.6 : 1;
  W.pressure = 0; W.charging = false;
  W.flash = Math.max(W.flash, (0.45 + 0.55 * s) * soft);
  W.glare = Math.max(W.glare, (0.5 + 0.5 * s) * soft);
  W.heat = Math.max(W.heat, 1 + s);
  // Bombs: big clasts on wide ballistic arcs.
  const nb = Math.round((10 + 90 * s) * W.scale * soft);
  for (let i = 0; i < nb; i++) {
    const th = Math.min(0.9, Math.abs(gauss()) * (0.26 + 0.1 * s)), az = rnd(0, Math.PI * 2);
    const v = (34 + 58 * s) * V * rnd(0.5, 1.05);
    // A bomb's skin cools slowly in flight; it fades fast only once it lands.
    addSpark(W, {
      kind: 1, v: [Math.sin(th) * Math.cos(az) * v, Math.cos(th) * v, Math.sin(th) * Math.sin(az) * v],
      T: rnd(0.85, 1), tau: 45, tauRest: rnd(7, 22), size: rnd(5, 11), drag: rnd(0.0003, 0.0008),
    });
  }
  // The fountain and the column run as emitters over time.
  W.emitters.push({ kind: 'fountain', age: 0, dur: 1.5 + 9 * s, rate: (140 + 380 * s) * W.scale * soft, s, acc: 0 });
  W.emitters.push({ kind: 'ash', age: 0, dur: 3 + 18 * s, rate: 7 + 26 * s, s, acc: 0 });
  // A column over a third of full size makes lightning.
  if (s > 0.35) {
    const n = Math.round(1 + 5 * (s - 0.35) / 0.65);
    for (let i = 0; i < n; i++) W.emitters.push({ kind: 'bolt', age: 0, at: rnd(1.2, 2.5 + 9 * s), dur: 13, s });
  }
  W.rings.push({ age: 0, amp: 0.3 + 0.7 * s, hit: false });
  W.events.push({ type: 'blast', size: s, x: VENT[0], y: VENT[1], z: VENT[2] });
}

function addSpark(W, o) {
  if (W.sparks.length >= W.maxSparks) return;
  const p = o.p || [VENT[0] + rnd(-8, 8) * L, VENT[1] + rnd(0, 6) * L, VENT[2] + rnd(-8, 8) * L];
  W.sparks.push({
    x: p[0], y: p[1], z: p[2], vx: o.v[0], vy: o.v[1], vz: o.v[2],
    px: p[0], py: p[1], pz: p[2],
    kind: o.kind, T: o.T, tau: o.tau, tauRest: o.tauRest || o.tau, size: o.size, drag: o.drag,
    state: 0, age: 0, landed: false,
    // A bomb keeps its recent path, so its trail curves and fades.
    trail: o.kind === 1 ? [] : null, trailT: 0,
  });
}

function addPuff(W, o) {
  if (W.puffs.length >= W.maxPuffs) {
    // The oldest steam gives way to new ash.
    const i = W.puffs.findIndex(p => p.kind === 1);
    if (i < 0 || o.kind === 1) return;
    W.puffs.splice(i, 1);
  }
  W.puffs.push({
    x: o.p[0], y: o.p[1], z: o.p[2], vx: o.v[0], vy: o.v[1], vz: o.v[2],
    r: o.r, r0: o.r, age: 0, life: o.life, kind: o.kind, lift: o.lift,
    hot: o.hot, dens: o.dens, rot: rnd(0, Math.PI * 2), spin: rnd(-0.08, 0.08), seed: Math.random(),
  });
}

/* ---------- the bolt ---------- */
// A jagged path by midpoint displacement, with one or two branches.
function boltPath(a, b, depth, rough) {
  let pts = [a, b];
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      const L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      next.push([(p[0] + q[0]) / 2 + rnd(-1, 1) * L * rough, (p[1] + q[1]) / 2 + rnd(-1, 1) * L * rough * 0.6, (p[2] + q[2]) / 2 + rnd(-1, 1) * L * rough], q);
    }
    pts = next;
  }
  return pts;
}
function spawnBolt(W, s) {
  // The bolt lives in the lower column, where charge separates.
  const cand = W.puffs.filter(p => p.kind === 0 && p.y > VENT[1] + 150 * L && p.y < VENT[1] + 1300 * L);
  if (!cand.length) return;
  const A = cand[(Math.random() * cand.length) | 0];
  const a = [A.x + rnd(-0.4, 0.4) * A.r, A.y, A.z + rnd(-0.3, 0.3) * A.r];
  let b;
  if (Math.random() < 0.45) b = [VENT[0] + rnd(-60, 60) * L, VENT[1] + rnd(10, 60) * L, VENT[2] + rnd(-40, 40) * L];
  else { const B = cand[(Math.random() * cand.length) | 0]; b = [B.x + rnd(-150, 150) * L, B.y + rnd(-200, 120) * L, B.z + rnd(-80, 80) * L]; }
  const segs = [];
  const main = boltPath(a, b, 4, 0.22);
  for (let i = 1; i < main.length; i++) segs.push([main[i - 1], main[i], 1]);
  const nb = 1 + (Math.random() < 0.6 ? 1 : 0);
  for (let k = 0; k < nb; k++) {
    const i0 = 2 + ((Math.random() * (main.length - 5)) | 0), o = main[i0];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * rnd(0.25, 0.45);
    const e = [o[0] + rnd(-1, 1) * L, o[1] - rnd(0.2, 0.8) * L, o[2] + rnd(-0.5, 0.5) * L];
    const br = boltPath(o, e, 3, 0.25);
    for (let i = 1; i < br.length; i++) segs.push([br[i - 1], br[i], 0.45]);
  }
  // Return strokes: two or three pulses in a third of a second.
  const strokes = [0, rnd(0.05, 0.09)];
  if (Math.random() < 0.6) strokes.push(rnd(0.14, 0.24));
  const mid = main[main.length >> 1];
  W.bolts.push({ segs, strokes, age: 0, life: 0.5, glow: 0, x: mid[0], y: mid[1], z: mid[2], s });
  W.events.push({ type: 'bolt', x: mid[0], y: mid[1], z: mid[2], s });
}

/* ---------- step ---------- */
// dt is the sim step. ambient is 0 when ambient motion sleeps.
export function step(W, dt, { ambient = 1 } = {}) {
  W.t += dt;
  const soft = W.soft;
  // Pressure builds over 2.5 s while the hold lasts.
  if (W.charging) W.pressure = Math.min(1, W.pressure + dt / 2.5);
  let fount = 0;
  // Emitters.
  for (let i = W.emitters.length - 1; i >= 0; i--) {
    const e = W.emitters[i];
    e.age += dt;
    const k = Math.max(0, 1 - e.age / e.dur);
    if (e.kind === 'fountain') {
      // The fountain peaks at once, then sinks.
      const rate = e.rate * k * k;
      fount += k * (0.4 + 0.6 * e.s);
      e.acc += rate * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        const th = Math.abs(gauss()) * 0.2, az = rnd(0, Math.PI * 2);
        const v = (22 + 62 * e.s) * V * (0.45 + 0.55 * k) * rnd(0.55, 1.05);
        addSpark(W, {
          kind: 0, v: [Math.sin(th) * Math.cos(az) * v, Math.cos(th) * v, Math.sin(th) * Math.sin(az) * v],
          T: rnd(0.75, 1), tau: rnd(0.8, 2.6), size: rnd(1.8, 4.4), drag: rnd(0.0008, 0.002),
        });
      }
    } else if (e.kind === 'ash') {
      e.acc += e.rate * (0.25 + 0.75 * k) * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        const v = (35 + 75 * e.s) * V * (0.5 + 0.5 * k) * rnd(0.7, 1.1);
        addPuff(W, {
          kind: 0, p: [VENT[0] + rnd(-12, 12) * L, VENT[1] + rnd(0, 20) * L, VENT[2] + rnd(-12, 12) * L],
          v: [rnd(-9, 9) * V, v, rnd(-9, 9) * V], r: rnd(22, 40) * L * (0.7 + 0.5 * e.s),
          life: rnd(80, 140) * V, lift: (12 + 26 * e.s) * V * rnd(0.7, 1.2), hot: 0.7 + 0.3 * k, dens: rnd(0.8, 1.1),
        });
      }
    } else if (e.kind === 'bolt') {
      if (e.at != null && e.age >= e.at) { e.at = null; spawnBolt(W, e.s); e.age = e.dur; }
    }
    if (e.age >= e.dur) W.emitters.splice(i, 1);
  }
  // The vent glow eases toward its target; the hold makes it pulse.
  const pulse = W.charging ? 0.12 * Math.sin(W.t * 11) * W.pressure : 0;
  const target = 0.2 + 0.75 * W.pressure + pulse + fount * 1.3;
  W.heat += (target - W.heat) * (1 - Math.exp(-dt * (target > W.heat ? 6 : 0.9)));
  W.flash *= Math.exp(-dt / 0.12);
  W.glare *= Math.exp(-dt / 0.9);
  W.tremor = soft ? 0 : Math.max(W.pressure * (W.charging ? 1 : 0), W.tremor * Math.exp(-dt / 0.4));
  // The crater steams; the hold thickens it.
  W.steamT -= dt * ambient * (0.5 + 3 * W.pressure);
  if (W.steamT < 0 && (ambient > 0 || W.charging)) {
    W.steamT = rnd(0.5, 1.4);
    addPuff(W, {
      kind: 1, p: [VENT[0] + rnd(-30, 30) * L, VENT[1] + rnd(10, 25) * L, VENT[2] + rnd(-25, 25) * L],
      v: [rnd(-1, 1) * V, (rnd(3, 6) + 10 * W.pressure) * V, rnd(-1, 1) * V], r: rnd(9, 16) * L,
      life: rnd(18, 30) * V, lift: (rnd(4, 7) + 10 * W.pressure) * V, hot: 0.08 + 0.3 * W.pressure, dens: rnd(0.4, 0.55) + 0.35 * W.pressure,
    });
  }
  stepSparks(W, dt);
  stepPuffs(W, dt);
  // Bolts fade after their strokes.
  for (let i = W.bolts.length - 1; i >= 0; i--) {
    const b = W.bolts[i];
    b.age += dt;
    b.glow = b.strokes.reduce((g, t0) => g + (b.age >= t0 ? Math.exp(-(b.age - t0) / 0.045) : 0), 0);
    if (b.age > b.life) W.bolts.splice(i, 1);
  }
  for (let i = W.rings.length - 1; i >= 0; i--) {
    W.rings[i].age += dt;
    if (W.rings[i].age * C_SOUND > 3200) W.rings.splice(i, 1);
  }
}

function stepSparks(W, dt) {
  const S = W.sparks;
  for (let i = S.length - 1; i >= 0; i--) {
    const p = S[i];
    p.age += dt;
    p.T *= Math.exp(-dt / p.tau);
    p.px = p.x; p.py = p.y; p.pz = p.z;
    if (p.state === 0) {
      const sp = Math.hypot(p.vx, p.vy, p.vz), k = p.drag * sp;
      p.vx -= p.vx * k * dt; p.vz -= p.vz * k * dt;
      p.vy -= (G + p.vy * k) * dt;
      if (p.trail) {
        p.trailT -= dt;
        if (p.trailT <= 0) { p.trailT = 0.07; p.trail.unshift([p.x, p.y, p.z]); if (p.trail.length > 7) p.trail.pop(); }
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const h = height(p.x, p.z);
      if (p.y < h) {
        // Spatter dies on landing; a bomb bounces.
        if (p.kind === 0) { S[i] = S[S.length - 1]; S.pop(); continue; }
        const n = normalAt(p.x, p.z, 3);
        const vn = p.vx * n[0] + p.vy * n[1] + p.vz * n[2];
        const speed = Math.hypot(p.vx, p.vy, p.vz);
        if (!p.landed && speed > 6) W.events.push({ type: 'land', x: p.x, y: h, z: p.z, e: Math.min(1, speed * p.size / 300) });
        p.landed = true;
        p.tau = p.tauRest;
        p.y = h + 0.05;
        // Normal part bounces at 0.35; the tangent part keeps 0.7.
        p.vx = (p.vx - vn * n[0]) * 0.7 - vn * n[0] * 0.35;
        p.vy = (p.vy - vn * n[1]) * 0.7 - vn * n[1] * 0.35;
        p.vz = (p.vz - vn * n[2]) * 0.7 - vn * n[2] * 0.35;
        if (Math.abs(vn) * 0.35 < 4) { p.state = 1; p.trail = null; p.rollT = 0; }
        // A hard bounce breaks off a few sparks.
        if (speed > 25 && W.sparks.length < W.maxSparks - 4) {
          for (let j = 0; j < 3; j++) addSpark(W, { kind: 0, p: [p.x, p.y + 0.5, p.z], v: [p.vx * 0.5 + rnd(-6, 6), rnd(3, 9), p.vz * 0.5 + rnd(-6, 6)], T: p.T * 0.9, tau: rnd(0.4, 1), size: 0.8, drag: 0.01 });
        }
      }
    } else if (p.state === 1) {
      // Rolling: gravity along the slope, with friction.
      const n = normalAt(p.x, p.z, 3);
      const gx = -G * n[0] * n[1], gz = -G * n[2] * n[1];
      const slope = Math.sqrt(1 - n[1] * n[1]);
      p.vx += gx * dt; p.vz += gz * dt;
      const sp = Math.hypot(p.vx, p.vz);
      const fr = (4.2 + 0.12 * sp) * dt;
      if (sp > fr) { p.vx -= (p.vx / sp) * fr; p.vz -= (p.vz / sp) * fr; } else { p.vx = 0; p.vz = 0; }
      p.x += p.vx * dt; p.z += p.vz * dt;
      p.y = height(p.x, p.z) + 0.6;
      p.vy = 0;
      // A block stops on gentle ground, or after a long roll.
      p.rollT += dt;
      if ((sp < 0.8 && slope < 0.42) || p.rollT > 14) p.state = 2;
    }
    // A cold spark goes.
    if (p.T < 0.02 || p.age > 90) { S[i] = S[S.length - 1]; S.pop(); }
  }
}

function stepPuffs(W, dt) {
  const P = W.puffs, wind = W.wind;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.age += dt;
    if (p.age > p.life) { P.splice(i, 1); continue; }
    const hgt = p.y - VENT[1];
    // Wind grows with height and blows toward the left of the shot.
    const wx = -wind * V * (3 + 28 * smooth(-100 * L, 1200 * L, hgt)), wz = -wind * V * 4 * smooth(0, 1200 * L, hgt);
    // Buoyant rise fades with height; ash spreads at its own level.
    const lift = p.lift * Math.exp(-Math.max(0, hgt) / ((p.kind ? 500 : 650) * L));
    const kv = p.kind ? 0.5 : 0.35, kh = p.kind ? 0.35 : 0.18;
    p.vy += (lift - p.vy) * (1 - Math.exp(-dt * kv));
    p.vx += (wx - p.vx) * (1 - Math.exp(-dt * kh));
    p.vz += (wz - p.vz) * (1 - Math.exp(-dt * kh));
    // Slow churn, so puffs do not move as one block.
    const c = W.t * 0.13 + p.seed * 40;
    p.x += (p.vx + Math.sin(c) * 1.8 * V) * dt;
    p.y += p.vy * dt;
    p.z += (p.vz + Math.cos(c * 1.3) * 1.8 * V) * dt;
    // Entrainment: the puff grows with its speed through the air.
    const rel = Math.hypot(p.vx - wx, p.vy, p.vz - wz);
    p.r = Math.min((p.kind ? 90 : 280) * L, p.r + (0.07 * rel + (p.kind ? 1.6 : 1.5) * V) * dt);
    p.rot += p.spin * dt;
    p.hot *= Math.exp(-dt / 2.5);
  }
}

// True while anything moves that the eye follows at full rate.
export function busy(W) {
  if (W.charging || W.emitters.length || W.bolts.length || W.rings.length || W.flash > 0.01) return true;
  // A bomb at rest only cools; the drifting rate draws it.
  for (const s of W.sparks) if (s.state === 0 || (s.state === 1 && s.T > 0.05)) return true;
  return false;
}

// Clears everything but the idle glow.
export function clear(W) {
  W.sparks.length = 0; W.puffs.length = 0; W.bolts.length = 0; W.rings.length = 0;
  W.emitters.length = 0; W.events.length = 0;
  W.pressure = 0; W.charging = false; W.flash = 0; W.glare = 0; W.tremor = 0; W.heat = 0.2;
}
