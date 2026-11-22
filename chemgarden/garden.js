// Chemical garden: the growth model of the towers. Pure logic, no three.js.
// Units are tank units: the tank floor is at y = 0, the tank is TANK.w wide.
// A tower grows from one seed. Each tower holds tubes; a tube can branch.

export const TANK = { w: 1.6, h: 1.0, d: 0.5, bed: 0.035, surface: 0.9 };
// The salts, in bar order. Index i is the salt id in the shader.
export const SALTS = ['copper', 'cobalt', 'nickel', 'iron'];

// Habit per salt.
// r: tube radius; v: climb speed per second; wob: wobble; buoy: pull to vertical.
// beat: bead cycles per second; branch: chance of a branch at each pop.
// tubes: first tubes from the bulb; len: the length a tube may reach.
// bead: bead size against the tube; seed: seed crystal radius.
const HABIT = {
  copper: { r: 0.0072, v: 0.07, wob: 10, buoy: 7, beat: 0.55, branch: 0.2, tubes: [1, 2], len: [0.9, 1.5], bead: 1.75, seed: 0.016, kink: 0.32 },
  cobalt: { r: 0.0052, v: 0.085, wob: 15, buoy: 5, beat: 0.8, branch: 0.38, tubes: [2, 3], len: [0.6, 1.3], bead: 1.6, seed: 0.014, kink: 0.42 },
  nickel: { r: 0.0042, v: 0.1, wob: 6, buoy: 10, beat: 0.45, branch: 0.12, tubes: [1, 3], len: [0.9, 1.5], bead: 1.5, seed: 0.013, kink: 0.24 },
  iron: { r: 0.0105, v: 0.045, wob: 18, buoy: 3.2, beat: 1.0, branch: 0.5, tubes: [3, 5], len: [0.14, 0.42], bead: 1.9, seed: 0.019, kink: 0.6 },
};

// A tower crumbles in this many seconds, top first.
const CRUMBLE = 1.2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// A small seeded random source, so the first garden is the same each load.
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Garden {
  /** @param {{ rand?: () => number, budget?: number }} [o] */
  constructor({ rand = Math.random, budget = 7000 } = {}) {
    this.rand = rand;
    this.budget = budget;
    this.towers = [];
    this.time = 0;
    // Strength of the water glass, 0 (weak) to 1 (strong).
    this.strength = 0.5;
    this.events = [];
    this.nextId = 1;
  }

  r(a, b) { return a + this.rand() * (b - a); }

  // Drops one seed at the surface. It sinks, lands and grows.
  drop(salt, x, z, { now = false } = {}) {
    const H = HABIT[SALTS[salt]], m = 0.05;
    x = clamp(x, -TANK.w / 2 + m, TANK.w / 2 - m);
    z = clamp(z, -TANK.d / 2 + m, TANK.d / 2 - m);
    const seedR = H.seed * this.r(0.75, 1.2);
    const t = {
      id: this.nextId++, salt, H, x, z, y: TANK.surface, vy: 0,
      seedR, rot: [this.r(0, TAU), this.r(0, TAU), this.r(0, TAU)], spin: [this.r(-3, 3), this.r(-3, 3), this.r(-3, 3)],
      drift: this.r(-0.02, 0.02), phase: 'fall', bulbR: 0, bulbT: 0, bulbDur: this.r(0.9, 1.5),
      tubes: [], dying: -1, born: this.time, hash: this.rand(),
    };
    this.towers.push(t);
    if (now) this.land(t, false);
    else this.events.push({ type: 'enter', x, z, salt });
    return t;
  }

  land(t, loud = true) {
    t.y = TANK.bed + t.seedR * 0.6;
    t.phase = 'bulb';
    t.bulbT = 0;
    if (loud) this.events.push({ type: 'land', x: t.x, y: t.y, z: t.z, salt: t.salt, r: t.seedR });
  }

  // Strength scales width up and speed down.
  get widthK() { return lerp(0.62, 1.55, this.strength); }
  get speedK() { return lerp(1.55, 0.62, this.strength); }

  // A new tube starts at p and heads along dir.
  tube(t, p, dir, r, gen) {
    const H = t.H;
    const tb = {
      pts: [{ x: p.x, y: p.y, z: p.z, r, b: this.time }],
      tip: { x: p.x, y: p.y, z: p.z }, dir: norm(dir), r, gen,
      state: 'grow', s: 0, len: this.r(H.len[0], H.len[1]) * (gen ? 0.55 : 1),
      press: this.r(0, 0.6), surge: 1.6, beadR: 0, beadT: 0, beadDur: 0,
      ph: [this.r(0, TAU), this.r(0, TAU), this.r(0, TAU), this.r(0, TAU)],
      fq: [this.r(28, 46), this.r(60, 95)], spread: 0,
    };
    t.tubes.push(tb);
    return tb;
  }

  // The bulb bursts: the first tubes jet up from its top.
  burstBulb(t) {
    const H = t.H, n = Math.round(this.r(H.tubes[0], H.tubes[1] + 0.99) - 0.49);
    const top = { x: t.x, y: t.y + t.bulbR * 0.8, z: t.z };
    for (let i = 0; i < Math.max(1, n); i++) {
      const a = this.r(0, TAU), tilt = n > 1 ? this.r(0.15, 0.55) : this.r(0, 0.2);
      const dir = [Math.cos(a) * tilt, 1, Math.sin(a) * tilt];
      this.tube(t, top, dir, H.r * this.widthK * this.r(0.85, 1.2), 0);
    }
    t.phase = 'grow';
    this.events.push({ type: 'pop', x: top.x, y: top.y, z: top.z, salt: t.salt, r: t.bulbR, big: true });
  }

  // One step of the whole garden.
  step(dt) {
    this.time += dt;
    let rate = 0;
    for (const t of this.towers) {
      if (t.dying >= 0) { t.dying += dt; continue; }
      if (t.phase === 'fall') {
        // A crystal sinks through thick liquid: it reaches a slow terminal speed.
        t.vy = lerp(t.vy, 0.55, 1 - Math.exp(-dt * 5));
        t.y -= t.vy * dt;
        t.x += t.drift * dt;
        for (let k = 0; k < 3; k++) t.rot[k] += t.spin[k] * dt;
        if (t.y <= TANK.bed + t.seedR * 0.6) this.land(t);
        rate += 0.15;
        continue;
      }
      if (t.phase === 'bulb') {
        t.bulbT += dt;
        const k = clamp(t.bulbT / t.bulbDur);
        // The skin swells fast, then slows as it nears the burst.
        t.bulbR = t.seedR * lerp(1.05, 2.3 * this.widthK ** 0.5, 1 - (1 - k) ** 2);
        rate += 0.3;
        if (k >= 1) this.burstBulb(t);
        continue;
      }
      if (t.phase !== 'grow') continue;
      let live = false;
      for (let i = 0; i < t.tubes.length; i++) {
        const tb = t.tubes[i];
        if (tb.state === 'done') continue;
        live = true;
        rate += this.grow(t, tb, dt);
      }
      if (!live) t.phase = 'done';
    }
    // Crumbled towers leave.
    this.towers = this.towers.filter(t => t.dying < 0 || t.dying < t.delay + CRUMBLE + 0.05);
    this.trim();
    this.rate = rate;
    return rate > 0 || this.towers.some(t => t.dying >= 0);
  }

  // One tube tip: climb in pulses, swell a bead, pop, kink, maybe branch.
  grow(t, tb, dt) {
    const H = t.H, w = TANK.w / 2 - 0.03, d = TANK.d / 2 - 0.03;
    if (tb.state === 'bead') {
      tb.beadT += dt;
      const k = clamp(tb.beadT / tb.beadDur);
      tb.beadR = tb.r * lerp(1, H.bead * Math.sqrt(this.widthK), k * k * (3 - 2 * k));
      if (k >= 1) this.pop(t, tb);
      return 0.4;
    }
    tb.surge *= Math.exp(-dt / 0.45);
    const v = H.v * this.speedK * (0.35 + tb.surge) * (tb.state === 'spread' ? 0.5 : 1);
    const ds = v * dt;
    tb.s += ds;
    const p = tb.tip, dir = tb.dir;
    if (tb.state === 'spread') {
      // Under the surface the tip creeps sideways and stops.
      tb.spread -= ds;
      p.x += dir[0] * ds; p.z += dir[2] * ds;
      p.y = TANK.surface - tb.r * 1.1;
      if (tb.spread <= 0 || Math.abs(p.x) > w || Math.abs(p.z) > d) this.finish(tb);
    } else {
      // Wobble: two waves along the tube, set per tube.
      const s = tb.s, f = tb.fq, ph = tb.ph;
      const lx = Math.sin(s * f[0] + ph[0]) + 0.55 * Math.sin(s * f[1] + ph[1]);
      const lz = Math.cos(s * f[0] * 1.17 + ph[2]) + 0.55 * Math.sin(s * f[1] * 0.83 + ph[3]);
      const wob = H.wob * ds * (this.calm ? 0.4 : 1), up = H.buoy * ds * (0.6 + tb.gen * 0.15);
      dir[0] += lx * wob * 0.5; dir[2] += lz * wob * 0.5; dir[1] += up;
      // The walls push the tip back in.
      if (Math.abs(p.x) > w - 0.04) dir[0] -= Math.sign(p.x) * ds * 60;
      if (Math.abs(p.z) > d - 0.04) dir[2] -= Math.sign(p.z) * ds * 60;
      // A tube never turns down.
      dir[1] = Math.max(dir[1], 0.12);
      norm(dir, dir);
      p.x += dir[0] * ds; p.y += dir[1] * ds; p.z += dir[2] * ds;
      tb.press += dt * H.beat * (0.7 + 0.6 * this.rand()) * this.speedK;
      if (p.y >= TANK.surface - tb.r * 1.3) {
        p.y = TANK.surface - tb.r * 1.1;
        tb.state = 'spread';
        tb.spread = this.r(0.015, 0.06);
        const h = Math.hypot(dir[0], dir[2]);
        const a = h > 0.05 ? Math.atan2(dir[2], dir[0]) : this.r(0, TAU);
        tb.dir = [Math.cos(a), 0, Math.sin(a)];
        this.events.push({ type: 'surface', x: p.x, y: p.y, z: p.z, salt: t.salt, r: tb.r });
      } else if (tb.s >= tb.len) {
        this.finish(tb);
      } else if (tb.press >= 1) {
        tb.state = 'bead';
        tb.beadT = 0;
        tb.beadDur = this.r(0.35, 0.9) / this.speedK;
      }
    }
    // A new joint once the tip is a segment away from the last one.
    const last = tb.pts[tb.pts.length - 1];
    const seg = clamp(tb.r * 3, 0.012, 0.03);
    if (dist(last, p) >= seg) tb.pts.push({ x: p.x, y: p.y, z: p.z, r: tb.r, b: this.time });
    return v * 10;
  }

  // The bead bursts: a puff, a kink, a thinner tube, and maybe a branch.
  pop(t, tb) {
    const H = t.H, p = tb.tip;
    this.events.push({ type: 'pop', x: p.x, y: p.y, z: p.z, salt: t.salt, r: tb.beadR });
    // The bead leaves a knot in the wall.
    tb.pts.push({ x: p.x, y: p.y, z: p.z, r: tb.beadR * 0.82, b: this.time });
    tb.state = 'grow';
    tb.press = 0;
    tb.surge = this.r(1.8, 3);
    tb.beadR = 0;
    const rMin = H.r * this.widthK * 0.45;
    tb.r = Math.max(rMin, tb.r * this.r(0.8, 0.97));
    kink(tb.dir, H.kink * this.r(0.4, 1), this.rand);
    // Branches thin out by generation; a tower holds at most 14 tubes.
    if (tb.gen < 3 && t.tubes.length < 14 && this.rand() < H.branch * 0.55 ** tb.gen) {
      const dir = tb.dir.slice();
      kink(dir, H.kink * 1.6 + 0.35, this.rand);
      this.tube(t, { x: p.x, y: p.y, z: p.z }, dir, tb.r * this.r(0.7, 0.9), tb.gen + 1);
    }
  }

  // A stopped tube keeps its tip as the last joint.
  finish(tb) {
    const p = tb.tip, last = tb.pts[tb.pts.length - 1];
    if (dist(last, p) > 1e-4) tb.pts.push({ x: p.x, y: p.y, z: p.z, r: tb.r, b: this.time });
    tb.state = 'done';
    tb.beadR = 0;
  }

  // Over the joint budget, the oldest grown tower crumbles.
  trim() {
    let n = 0;
    for (const t of this.towers) for (const tb of t.tubes) n += tb.pts.length + 2;
    if (n <= this.budget) return;
    const old = this.towers.find(t => t.dying < 0 && t.phase === 'done') || this.towers.find(t => t.dying < 0);
    if (old) this.crumble(old, 0);
  }

  // A crumbling tower counts seconds in dying; it waits delay seconds first.
  crumble(t, delay) {
    t.dying = 0;
    t.delay = delay;
    this.events.push({ type: 'crumble', x: t.x, y: t.y, z: t.z, salt: t.salt, delay });
  }

  // Clear: every tower crumbles, top first, in a short ripple across the tank.
  clear() {
    for (const t of this.towers) if (t.dying < 0) this.crumble(t, (t.x / TANK.w + 0.5) * 0.4);
  }

  // How far a tower has crumbled at height y: 1 stands, 0 is gone.
  keep(t, y) {
    if (t.dying < 0) return 1;
    const q = clamp((t.dying - t.delay) / CRUMBLE);
    return clamp(1 - (q * 1.5 - 0.5 * (1 - y / TANK.surface)) * 2);
  }

  get busy() { return this.towers.some(t => t.dying >= 0 || t.phase !== 'done'); }

  // Grows the garden to rest at once: the first frame.
  settle(maxT = 90, dt = 1 / 30) {
    for (let k = 0; k < maxT / dt && this.busy; k++) this.step(dt);
    this.events.length = 0;
  }

  // Visits every capsule: two ends, two radii, two birth times.
  // fn(ax, ay, az, ar, bx, by, bz, br, salt, ba, bb, hash)
  capsules(fn) {
    for (const t of this.towers) {
      if (t.phase === 'fall') continue;
      const hy = t.y + t.bulbR * 0.15;
      const kb = this.keep(t, hy);
      if (t.bulbR > 0 && kb > 0) fn(t.x, t.y, t.z, t.bulbR * kb, t.x, hy, t.z, t.bulbR * 0.86 * kb, t.salt, t.born, t.born, t.hash);
      for (const tb of t.tubes) {
        const P = tb.pts;
        for (let i = 0; i < P.length; i++) {
          const a = P[i], b = i + 1 < P.length ? P[i + 1] : tb.state === 'done' ? null : { ...tb.tip, r: tb.r, b: this.time };
          if (!b) break;
          const ka = this.keep(t, a.y), kc = this.keep(t, b.y);
          if (ka <= 0 && kc <= 0) continue;
          fn(a.x, a.y, a.z, a.r * ka, b.x, b.y, b.z, b.r * kc, t.salt, a.b, b.b, t.hash);
        }
        if (tb.state === 'bead' && tb.beadR > 0) {
          const p = tb.tip, k = this.keep(t, p.y);
          fn(p.x, p.y, p.z, tb.beadR * k, p.x, p.y + tb.beadR * 0.25, p.z, tb.beadR * 0.9 * k, t.salt, this.time, this.time, t.hash);
        }
      }
    }
  }
}

function norm(v, out = v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  out[0] = v[0] / l; out[1] = v[1] / l; out[2] = v[2] / l;
  return out;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
// Turns dir by angle a toward a random side.
function kink(dir, a, rand) {
  const s = rand() * TAU;
  dir[0] += Math.cos(s) * Math.tan(Math.min(a, 1.2));
  dir[2] += Math.sin(s) * Math.tan(Math.min(a, 1.2));
  norm(dir, dir);
}
