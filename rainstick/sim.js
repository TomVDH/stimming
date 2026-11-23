// Rain stick physics, in the tube's own frame.
// x runs along the axis; y runs across it.
// Units are bead radii; one unit is about 4 mm.

/** The tube: inner half length and inner radius. */
export const TUBE = { half: 60, R: 6.5 };
/** The pin radius. */
export const PIN_R = 0.42;
/** The largest bead count the arrays hold. */
export const MAX_BEADS = 420;

// One sub-step: 1/240 s.
const H = 1 / 240;
// A bead never moves more than this per sub-step, so it cannot pass a pin.
const STEP_MAX = 0.6;
const VMAX = STEP_MAX / H;
const RESTITUTION = 0.42, WALL_E = 0.25, FRICTION = 0.3;
// A pin contact faster than this makes a hit.
const HIT_MIN = 9;
// Golden angle: each pin turns this far round the helix.
const GOLD = 0.3819660112501051;
const PIN_DX = 1.8;
const CELL = 2;

/**
 * Builds the bead and pin state.
 * @param {number} n The first bead count.
 * @param {() => number} rand A random source in [0, 1).
 */
export function makeSim(n, rand = Math.random) {
  const { half, R } = TUBE;
  // Pins sit on a helix seen side on: x steps, y follows the cosine.
  const pinX = [], pinY = [];
  const x0 = -half + 8;
  for (let i = 0; x0 + i * PIN_DX < half - 8; i++) {
    pinX.push(x0 + i * PIN_DX);
    pinY.push(0.8 * R * Math.cos(i * GOLD * Math.PI * 2));
  }
  const pins = { n: pinX.length, x: Float32Array.from(pinX), y: Float32Array.from(pinY), x0, dx: PIN_DX };

  const b = {
    n: 0,
    x: new Float32Array(MAX_BEADS), y: new Float32Array(MAX_BEADS),
    px: new Float32Array(MAX_BEADS), py: new Float32Array(MAX_BEADS),
    vx: new Float32Array(MAX_BEADS), vy: new Float32Array(MAX_BEADS),
    r: new Float32Array(MAX_BEADS), tint: new Float32Array(MAX_BEADS),
  };
  // Per bead: the pin it struck this sub-step, with its normal and speed.
  const hitPin = new Int32Array(MAX_BEADS), hitNx = new Float32Array(MAX_BEADS), hitNy = new Float32Array(MAX_BEADS), hitV = new Float32Array(MAX_BEADS);
  const wallV = new Float32Array(MAX_BEADS);

  // The bead grid: a head per cell and a next per bead.
  const cols = Math.ceil((2 * half) / CELL) + 2, rows = Math.ceil((2 * R) / CELL) + 2;
  const head = new Int32Array(cols * rows), next = new Int32Array(MAX_BEADS);

  const sim = {
    pins, beads: b,
    /** The bead count the sim moves toward. */
    want: n,
    /** Seconds since the last motion; the loop sleeps past 0.5. */
    still: 0,
    /** Hits since the last read: pin index, speed and x, three numbers each. */
    hits: [],
    /** Tube wall knocks since the last read: speed and x, two numbers each. */
    knocks: [],
  };

  // A new bead: a random radius and glass tint, placed at x, y.
  function add(x, y) {
    if (b.n >= MAX_BEADS) return;
    const i = b.n++;
    b.r[i] = 0.8 + rand() * 0.2;
    b.tint[i] = rand();
    b.x[i] = b.px[i] = x; b.y[i] = b.py[i] = y;
    b.vx[i] = 0; b.vy[i] = 0;
  }

  // A pile at one end: rows of beads packed back from the cap.
  sim.fill = (count, end) => {
    b.n = 0;
    const lane = Math.floor((2 * R) / 2.05);
    for (let k = 0; k < count; k++) {
      const col = Math.floor(k / lane), row = k % lane;
      const x = end * (half - 1.1 - col * 1.85);
      const y = -R + 1.1 + row * 2.05 + (col % 2) * 0.6;
      add(x, Math.min(R - 1.1, y));
    }
    sim.want = count;
  };

  // Count change: new beads drop in at the low end, removed ones leave the pile.
  function adjust(gx) {
    const low = gx >= 0 ? 1 : -1;
    if (b.n < sim.want) {
      add(low * (half - 1.2 - rand() * 6), (rand() * 2 - 1) * (R - 1.2));
    } else if (b.n > sim.want) {
      // The slowest bead nearest the low end leaves.
      let best = -1, score = Infinity;
      for (let i = 0; i < b.n; i++) {
        const s = Math.hypot(b.vx[i], b.vy[i]) * 4 + (half - low * b.x[i]);
        if (s < score) { score = s; best = i; }
      }
      const j = --b.n;
      for (const a of [b.x, b.y, b.px, b.py, b.vx, b.vy, b.r, b.tint]) a[best] = a[j];
    }
  }

  // Throws the beads against gravity: a jolt along the tube.
  sim.shake = (gx, gy, k = 1) => {
    const sx = gx >= 0 ? -1 : 1, sy = gy >= 0 ? -1 : 1;
    for (let i = 0; i < b.n; i++) {
      b.vx[i] += sx * k * (28 + rand() * 46);
      b.vy[i] += sy * k * rand() * 34 + (rand() - 0.5) * 20 * k;
    }
    sim.still = 0;
  };

  /**
   * One frame of physics, in fixed sub-steps.
   * @param {number} dt Seconds to advance.
   * @param {{ gx: number, gy: number, w: number, a: number }} f Gravity and spin in the tube frame.
   * @returns {number} The fastest bead speed this frame.
   */
  sim.advance = (dt, f) => {
    let top = 0;
    sim.acc = Math.min(0.1, (sim.acc || 0) + dt);
    while (sim.acc >= H) {
      sim.acc -= H;
      if (b.n !== sim.want) adjust(f.gx);
      top = Math.max(top, step(f));
    }
    sim.still = top < 5 && !sim.hits.length ? sim.still + dt : 0;
    return top;
  };

  function step({ gx, gy, w, a }) {
    const n = b.n, w2 = w * w;
    // Predict: gravity, then the spin terms of the turning frame.
    for (let i = 0; i < n; i++) {
      const x = b.x[i], y = b.y[i];
      let vx = b.vx[i], vy = b.vy[i];
      vx += (gx + 2 * w * vy + a * y + w2 * x) * H;
      vy += (gy - 2 * w * vx - a * x + w2 * y) * H;
      vx *= 0.9995; vy *= 0.9995;
      const s = Math.hypot(vx, vy);
      if (s > VMAX) { vx *= VMAX / s; vy *= VMAX / s; }
      b.vx[i] = vx; b.vy[i] = vy;
      b.px[i] = x; b.py[i] = y;
      b.x[i] = x + vx * H; b.y[i] = y + vy * H;
      hitPin[i] = -1; hitV[i] = 0; wallV[i] = 0;
    }

    // The grid holds the predicted places.
    head.fill(-1);
    for (let i = 0; i < n; i++) {
      const c = cellOf(b.x[i], b.y[i]);
      next[i] = head[c]; head[c] = i;
    }

    for (let it = 0; it < 3; it++) {
      // Bead against bead: each pair moves apart by its overlap.
      for (let i = 0; i < n; i++) {
        const xi = b.x[i], yi = b.y[i], ri = b.r[i];
        const cx = Math.floor((xi + half) / CELL) + 1, cy = Math.floor((yi + R) / CELL) + 1;
        for (let oy = -1; oy <= 1; oy++) {
          const ry = cy + oy;
          if (ry < 0 || ry >= rows) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const rx = cx + ox;
            if (rx < 0 || rx >= cols) continue;
            for (let j = head[ry * cols + rx]; j >= 0; j = next[j]) {
              if (j <= i) continue;
              const dx = b.x[j] - b.x[i], dy = b.y[j] - b.y[i];
              const rr = ri + b.r[j], d2 = dx * dx + dy * dy;
              if (d2 >= rr * rr || d2 < 1e-9) continue;
              const d = Math.sqrt(d2), push = ((rr - d) / d) * 0.5;
              b.x[i] -= dx * push; b.y[i] -= dy * push;
              b.x[j] += dx * push; b.y[j] += dy * push;
            }
          }
        }
      }
      // Bead against pin, wall and cap.
      for (let i = 0; i < n; i++) {
        const r = b.r[i];
        const k = Math.round((b.x[i] - pins.x0) / pins.dx);
        for (let p = Math.max(0, k - 2), e = Math.min(pins.n - 1, k + 2); p <= e; p++) {
          const dx = b.x[i] - pins.x[p], dy = b.y[i] - pins.y[p];
          const rr = r + PIN_R, d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 < 1e-9) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          b.x[i] = pins.x[p] + nx * rr; b.y[i] = pins.y[p] + ny * rr;
          // The first contact keeps the speed of the strike.
          const vn = -(b.vx[i] * nx + b.vy[i] * ny);
          if (it === 0 && vn > hitV[i]) { hitPin[i] = p; hitNx[i] = nx; hitNy[i] = ny; hitV[i] = vn; }
        }
        const lim = R - r;
        if (b.y[i] > lim) { b.y[i] = lim; if (it === 0) wallV[i] = Math.max(0, b.vy[i]); }
        else if (b.y[i] < -lim) { b.y[i] = -lim; if (it === 0) wallV[i] = -Math.min(0, b.vy[i]); }
        const end = half - r;
        if (b.x[i] > end) b.x[i] = end; else if (b.x[i] < -end) b.x[i] = -end;
      }
    }

    // Velocity from the move, then bounce and friction at each contact.
    let top = 0;
    for (let i = 0; i < n; i++) {
      let vx = (b.x[i] - b.px[i]) / H, vy = (b.y[i] - b.py[i]) / H;
      const p = hitPin[i];
      if (p >= 0) {
        const nx = hitNx[i], ny = hitNy[i], hit = hitV[i];
        const vn = vx * nx + vy * ny;
        const tx = -ny, ty = nx;
        let vt = vx * tx + vy * ty;
        const dvn = Math.max(0, RESTITUTION * hit - vn);
        // Coulomb friction: the tangent loses at most mu times the normal change.
        const cut = Math.min(Math.abs(vt), FRICTION * (dvn + hit));
        vt -= Math.sign(vt) * cut;
        const vnew = vn + dvn;
        vx = nx * vnew + tx * vt; vy = ny * vnew + ty * vt;
        if (hit > HIT_MIN) sim.hits.push(p, hit, pins.x[p]);
      }
      const wv = wallV[i];
      if (wv > 0) {
        const s = b.y[i] > 0 ? -1 : 1;
        vy = s * WALL_E * wv;
        const cut = Math.min(Math.abs(vx), FRICTION * 0.5 * wv * (1 + WALL_E));
        vx -= Math.sign(vx) * cut;
        if (wv > HIT_MIN * 1.6) sim.knocks.push(wv, b.x[i]);
      }
      b.vx[i] = vx; b.vy[i] = vy;
      const s = vx * vx + vy * vy;
      if (s > top) top = s;
    }
    return Math.sqrt(top);
  }

  function cellOf(x, y) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((x + half) / CELL) + 1));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((y + R) / CELL) + 1));
    return cy * cols + cx;
  }

  sim.fill(n, -1);
  return sim;
}
