// Traffic wave sim: the Intelligent Driver Model on a ring road.
// The ring is 230 m round, as in the 2008 ring-road experiment.
// Cars never pass, so each car's leader is the next car in the list.

export const L = 230;
export const RADIUS = L / (2 * Math.PI);
export const MAX_CARS = 32;
// The model's terms. A stop jam at 22 cars slows cars for about 30 s.
export const P = { v0: 14, T: 0.6, s0: 1.3, a: 1.6, b: 1.6 };
const SUB = 1 / 120;
// The tap: a hard stop, then a short hold before the driver moves off.
const STOP_DECEL = 7, HOLD_AFTER = 0.7;
// Brake lights come on under this deceleration, and when a car stands.
const LAMP_DECEL = -0.85, LAMP_STAND = 0.4;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = x => ((x % L) + L) % L;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// A small seeded random, so every run starts the same.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The steady speed for a gap: s*(v) / sqrt(1 - (v/v0)^4) equals the gap.
export function steadySpeed(gap) {
  let lo = 0, hi = P.v0;
  for (let k = 0; k < 50; k++) {
    const m = (lo + hi) / 2;
    const s = (P.s0 + m * P.T) / Math.sqrt(1 - (m / P.v0) ** 4);
    if (s < gap) lo = m; else hi = m;
  }
  return lo;
}

export function makeSim(count = 22) {
  const rand = rng(93);
  let cars = [];
  let t = 0, nextId = 0;
  // The tween of Even out: positions ease to an even spread.
  let even = null;
  // Brake lights that came on since the last read, for the sound.
  const events = [];

  function makeCar(pos, v) {
    const r = rand();
    return {
      id: nextId++, pos, v, acc: 0,
      len: 4.1 + 0.6 * rand(),
      // Each driver keeps a slightly own gap and pull.
      T: P.T * (0.94 + 0.12 * rand()), a: P.a * (0.92 + 0.16 * rand()),
      paint: Math.floor(r * 997) % 9,
      lamp: 0, braking: false, stop: 0, held: false,
      // 0 to 1 as a car joins; 1 to 0 as it leaves.
      fade: 1, leaving: false,
    };
  }

  function spread(n) {
    const gap = L / n;
    const v = steadySpeed(gap - 4.4);
    cars = [];
    for (let i = 0; i < n; i++) cars.push(makeCar(i * gap, v));
  }
  spread(count);

  const gapOf = (c, lead) => wrap(lead.pos - c.pos) - lead.len;

  // One substep of the model.
  function sub(dt, noise) {
    const n = cars.length;
    for (let i = 0; i < n; i++) {
      const c = cars[i], lead = cars[(i + 1) % n];
      const s = n === 1 ? L - c.len : gapOf(c, lead);
      const dv = c.v - lead.v;
      const ss = P.s0 + Math.max(0, c.v * c.T + c.v * dv / (2 * Math.sqrt(c.a * P.b)));
      let a = c.a * (1 - (c.v / P.v0) ** 4 - (ss / Math.max(0.2, s)) ** 2);
      // A small wander of the foot; dense rings jam by themselves from it.
      a += noise * (rand() - 0.5);
      if (c.held || c.stop > 0) a = Math.min(a, c.v > 0.01 ? -STOP_DECEL : -c.v / dt);
      c.acc = clamp(a, -9, 3);
    }
    for (const c of cars) {
      c.v = Math.max(0, c.v + c.acc * dt);
      c.pos = wrap(c.pos + c.v * dt);
      // The hold counts down only once the car stands.
      if (c.stop > 0 && c.v < 0.05) c.stop = Math.max(0, c.stop - dt);
    }
    // Two cars never overlap, even after a hard stop.
    for (let i = 0; i < n; i++) {
      const c = cars[i], lead = cars[(i + 1) % n];
      const s = gapOf(c, lead);
      if (n > 1 && s < 0.4) { c.pos = wrap(lead.pos - lead.len - 0.4); c.v = Math.min(c.v, lead.v); }
    }
  }

  function step(dt) {
    if (dt <= 0) return;
    if (even) {
      even.t += dt;
      const k = ease(clamp(even.t / even.dur, 0, 1));
      for (const c of cars) {
        const e = even.of.get(c.id);
        c.pos = wrap(e.from + even.v * even.t + e.d * k);
        c.v = even.v; c.acc = 0;
      }
      t += dt;
      if (even.t >= even.dur) even = null;
    } else {
      const steps = Math.ceil(dt / SUB - 1e-6), h = dt / steps;
      // Noise grows with the crowd: none to speak of below 24 cars.
      const noise = 0.08 + 0.5 * clamp((cars.length - 23) / 6, 0, 1);
      for (let k = 0; k < steps; k++) sub(h, noise);
      t += dt;
    }
    // Joins and leaves fade over 0.6 s.
    for (const c of cars) c.fade = clamp(c.fade + (c.leaving ? -dt : dt) / 0.6, 0, 1);
    cars = cars.filter(c => !(c.leaving && c.fade <= 0));
    // Brake lights: on at once, off over a moment.
    for (const c of cars) {
      const on = c.held || c.stop > 0 || c.acc < LAMP_DECEL || c.v < LAMP_STAND;
      if (on && !c.braking) events.push({ id: c.id, pos: c.pos, hard: clamp(-c.acc / 6, 0, 1), v: c.v });
      c.braking = on;
      c.lamp = on ? 1 : Math.max(0, c.lamp - dt / 0.18);
    }
  }

  // Brakes one car: a hard stop and a short hold. held keeps it stopped.
  function brake(id, held = false) {
    const c = cars.find(q => q.id === id);
    if (!c || c.leaving) return null;
    if (even) even = null;
    c.stop = HOLD_AFTER;
    c.held = held;
    return c;
  }
  // A tap keeps the short hold; a long hold ends soon after the release.
  function release(id, wasHeld = false) {
    const c = cars.find(q => q.id === id);
    if (!c) return;
    c.held = false;
    if (wasHeld) c.stop = Math.min(c.stop, HOLD_AFTER * 0.5);
  }

  // Sets the number of cars: new cars join in the widest gaps.
  function setCount(n) {
    n = clamp(Math.round(n), 1, MAX_CARS);
    const live = () => cars.filter(c => !c.leaving);
    while (live().length < n) {
      const list = cars;
      let best = -1, bestGap = -1;
      for (let i = 0; i < list.length; i++) {
        const g = gapOf(list[i], list[(i + 1) % list.length]);
        if (g > bestGap) { bestGap = g; best = i; }
      }
      const back = list[best], lead = list[(best + 1) % list.length];
      const c = makeCar(0, 0);
      // The new car takes the middle of the gap and its follower's speed.
      c.pos = wrap(back.pos + (bestGap - c.len) / 2 + c.len);
      c.v = Math.min(back.v, lead.v);
      c.fade = 0;
      list.splice(best + 1, 0, c);
    }
    let surplus = live().length - n;
    while (surplus-- > 0) {
      // The car with the most room behind it leaves: no gap slams shut.
      const list = live();
      let pick = list[0], room = -1;
      list.forEach((c, i) => {
        const back = list[(i - 1 + list.length) % list.length];
        const r = gapOf(back, c);
        if (r > room) { room = r; pick = c; }
      });
      pick.leaving = true;
      // A leaving car no longer holds up the car behind.
      pick.len = 0.01;
    }
  }

  // Even out: every car eases to an even spread at the steady speed.
  function evenOut(dur = 1.6) {
    const list = cars.filter(c => !c.leaving);
    cars = list;
    const n = cars.length, gap = L / n;
    const v = steadySpeed(gap - 4.4);
    const of = new Map();
    // The spread keeps the mean place, so the cars move least.
    const p0 = cars[0].pos;
    let shift = 0;
    cars.forEach((c, i) => { shift += wrapSigned(c.pos - (p0 + i * gap)); });
    shift /= n;
    cars.forEach((c, i) => {
      c.stop = 0; c.held = false;
      of.set(c.id, { from: c.pos, d: wrapSigned(p0 + shift + i * gap - c.pos) });
    });
    even = { t: 0, dur, v, of };
  }
  const wrapSigned = x => { const w = wrap(x); return w > L / 2 ? w - L : w; };

  return {
    get cars() { return cars; },
    get t() { return t; },
    get evening() { return !!even; },
    // Cars with lit brake lights.
    get jammed() { return cars.reduce((k, c) => k + (c.lamp > 0 ? 1 : 0), 0); },
    get count() { return cars.filter(c => !c.leaving).length; },
    step, brake, release, setCount, evenOut,
    takeEvents() { return events.splice(0); },
  };
}
