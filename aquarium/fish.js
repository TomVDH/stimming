// Aquarium fish: three schools of tetras, food and fear.
// Pure state; the page draws it. Units are cm and seconds.
import { SURF, GLASS, BACK } from './scene.js';

// len: body length; hk: body depth factor; cruise: cm/s; band: preferred depth.
// Cardinals keep low, embers in the middle, lemons high (as in a real tank).
export const SPECIES = [
  { name: 'cardinal', len: 4.3, hk: 1.0, cruise: 4.2, band: [9, 22], share: 26, reach: 9 },
  { name: 'ember', len: 2.7, hk: 1.12, cruise: 3.8, band: [15, 29], share: 16, reach: 7 },
  { name: 'lemon', len: 4.7, hk: 1.5, cruise: 3.4, band: [19, 33], share: 9, reach: 11 },
];
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const len3 = v => Math.hypot(v[0], v[1], v[2]);

export function makeTank() {
  const T = {
    fish: [], flakes: [], schools: SPECIES.map(() => ({ home: [0, 20, 0], t: 0 })),
    halfW: () => 40, floor: () => 4, clumps: [],
    fear: 0, knock: null, events: [],
  };
  return T;
}

// Fills the tank with schools sized to the view; keeps fish that still fit.
export function populate(T, scale) {
  const want = SPECIES.map(s => Math.max(s === SPECIES[2] ? 4 : 6, Math.round(s.share * scale)));
  const keep = [];
  SPECIES.forEach((s, si) => {
    const mine = T.fish.filter(f => f.sp === si).slice(0, want[si]);
    const sc = T.schools[si];
    sc.home = [rnd(-0.4, 0.4) * T.halfW(0), (s.band[0] + s.band[1]) / 2, rnd(-8, 8)];
    while (mine.length < want[si]) {
      const p = [sc.home[0] + rnd(-8, 8), sc.home[1] + rnd(-4, 4), sc.home[2] + rnd(-6, 6)];
      const a = rnd(0, TAU);
      mine.push({
        sp: si, p, v: [Math.cos(a) * s.cruise, 0, Math.sin(a) * s.cruise * 0.5], dir: [Math.cos(a), 0, Math.sin(a)],
        s: s.len * rnd(0.88, 1.1), phase: rnd(0, TAU), amp: 0.2, roll: 0, curve: 0,
        fear: 0, startle: -1, startleK: 0, burst: rnd(0, 1.5), boost: 0, full: rnd(0, 0.3),
        target: null, notice: -1, nip: 0, quirk: rnd(0.8, 1.2),
      });
    }
    keep.push(...mine);
  });
  T.fish = keep;
}

/* ---------- food ---------- */
// A pinch: flakes land on the surface around x, z, spread, then sink.
export function feed(T, x, z, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * 2.6;
    T.flakes.push({
      p: [x + Math.cos(a) * r, SURF - 0.15, clamp(z + Math.sin(a) * r, BACK + 2, GLASS - 2)],
      v: [Math.cos(a) * rnd(0.5, 2), 0, Math.sin(a) * rnd(0.5, 2)],
      state: 0, float: rnd(1.5, 7), t: 0, seed: Math.random(), size: rnd(0.5, 0.85), sink: rnd(0.7, 1.4),
      wob: rnd(0, TAU), takers: 0, gone: 0,
    });
  }
  T.events.push({ type: 'patter', x, n });
  // Fish near the drop see it at once; the rest notice the rush.
  T.fish.forEach(f => {
    const d = Math.hypot(f.p[0] - x, f.p[2] - z, (f.p[1] - SURF) * 0.7);
    if (f.notice < 0) f.notice = 0.15 + d * 0.025 + rnd(0, 0.5);
  });
}

/* ---------- the knock ---------- */
// A knock on the front glass at (x, y). Near fish startle first; the wave spreads.
export function knock(T, x, y, soft = false) {
  T.knock = [x, y, GLASS];
  T.fish.forEach(f => {
    const d = Math.hypot(f.p[0] - x, f.p[1] - y, GLASS - f.p[2]);
    const k = clamp(1.35 - d / 70, 0.3, 1) * (soft ? 0.5 : 1);
    // The startle runs through the school at about 70 cm/s.
    const at = 0.02 + d / 70 + rnd(0, 0.05);
    if (f.startle < 0 || at < f.startle) { f.startle = at; f.startleK = k; }
  });
  // Calm again, each school comes back to the front glass to look.
  T.schools.forEach((sc, si) => {
    const S = SPECIES[si];
    sc.home = [x * 0.5 + rnd(-8, 8), (S.band[0] + S.band[1]) / 2, GLASS - rnd(6, 9)];
    sc.t = rnd(10, 14);
  });
  T.events.push({ type: 'knock', x, y });
}

// Steers fish, moves food. Returns true while something is in flight.
export function stepTank(T, dt, { soft = false } = {}) {
  if (dt <= 0) return busy(T);
  const fish = T.fish, N = fish.length;
  const halfW = T.halfW;
  const speedK = soft ? 0.55 : 1;

  /* food */
  for (const fl of T.flakes) {
    fl.t += dt;
    if (fl.gone) { fl.gone += dt; continue; }
    if (fl.state === 0) {
      // Floating: it spreads, then soaks and sinks.
      fl.v[0] *= Math.exp(-dt * 0.8); fl.v[2] *= Math.exp(-dt * 0.8);
      fl.p[0] += fl.v[0] * dt; fl.p[2] = clamp(fl.p[2] + fl.v[2] * dt, BACK + 1, GLASS - 1);
      if (fl.t > fl.float) { fl.state = 1; T.events.push({ type: 'sink' }); }
    } else if (fl.state === 1) {
      // Sinking: a flake flutters as it falls.
      fl.wob += dt * 2.4;
      fl.p[0] += Math.sin(fl.wob) * 0.9 * dt;
      fl.p[2] = clamp(fl.p[2] + Math.cos(fl.wob * 0.7) * 0.5 * dt, BACK + 1, GLASS - 1);
      fl.p[1] -= fl.sink * dt * (0.75 + 0.25 * Math.sin(fl.wob * 2));
      const fl0 = T.floor(fl.p[0], fl.p[2]) + 0.15;
      if (fl.p[1] <= fl0) { fl.p[1] = fl0; fl.state = 2; fl.t = 0; }
    } else if (fl.t > 40) fl.gone = 1e-3;
    const w = halfW(fl.p[2]) + 4;
    fl.p[0] = clamp(fl.p[0], -w, w);
  }
  T.flakes = T.flakes.filter(fl => !fl.gone || fl.gone < 1.2);
  const live = T.flakes.filter(fl => !fl.gone);

  /* fish */
  const acc = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    const f = fish[i], S = SPECIES[f.sp], sc = T.schools[f.sp];
    acc[0] = acc[1] = acc[2] = 0;

    // The startle: a C-start, then a dash away from the glass.
    if (f.startle >= 0) {
      f.startle -= dt;
      if (f.startle < 0) {
        f.startle = -1;
        const k = f.startleK;
        f.fear = Math.max(f.fear, k);
        const K = T.knock || [0, 20, GLASS];
        // Away from the knuckle: mostly sideways and back, a little down.
        let away = [f.p[0] - K[0], (f.p[1] - K[1]) * 0.5 - 2, (f.p[2] - K[2]) * 0.45 - 3];
        const l = len3(away) || 1;
        away = away.map(c => c / l);
        const burst = (26 + 18 * k) * speedK;
        f.v = away.map(c => c * burst);
        f.curve = (Math.random() < 0.5 ? -1 : 1) * 0.55 * k * speedK;
        f.boost = 0;
        if (f.target) { f.target.takers = Math.max(0, f.target.takers - 1); f.target = null; }
        if (k > 0.6) T.events.push({ type: 'dart', x: f.p[0] });
      }
    }

    // Neighbours: flock with your own species, keep clear of all.
    let cnt = 0;
    const al = [0, 0, 0], co = [0, 0, 0], se = [0, 0, 0];
    const R = S.reach * (1 + f.fear * 0.6), R2 = R * R, sep = S.len * (1.1 - f.fear * 0.35);
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const g = fish[j];
      const dx = g.p[0] - f.p[0], dy = g.p[1] - f.p[1], dz = g.p[2] - f.p[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      const sepR = g.sp === f.sp ? sep : (S.len + SPECIES[g.sp].len) * 1.1;
      if (d2 < sepR * sepR && d2 > 1e-6) {
        const d = Math.sqrt(d2), k = (sepR - d) / (sepR * d);
        se[0] -= dx * k; se[1] -= dy * k; se[2] -= dz * k;
      }
      if (g.sp !== f.sp || d2 > R2) continue;
      cnt++;
      al[0] += g.v[0]; al[1] += g.v[1]; al[2] += g.v[2];
      co[0] += dx; co[1] += dy; co[2] += dz;
      // Fear spreads: a calm fish catches some of a frightened neighbour's fear.
      if (g.fear > f.fear + 0.2 && f.startle < 0) f.fear += (g.fear - f.fear) * Math.min(1, dt * 0.8);
    }
    const tight = 1 + f.fear * 2.2;
    if (cnt) {
      acc[0] += (al[0] / cnt - f.v[0]) * 0.9 + co[0] / cnt * 0.35 * tight;
      acc[1] += (al[1] / cnt - f.v[1]) * 0.9 + co[1] / cnt * 0.35 * tight;
      acc[2] += (al[2] / cnt - f.v[2]) * 0.9 + co[2] / cnt * 0.35 * tight;
    }
    acc[0] += se[0] * 9; acc[1] += se[1] * 9; acc[2] += se[2] * 9;

    // Food: a fish that has noticed picks the nearest flake it can reach.
    if (f.notice >= 0) {
      f.notice -= dt;
      if (f.notice < 0 && !live.length) f.notice = -1;
    }
    const hungry = f.full < 1 && f.fear < 0.35;
    if (hungry && f.notice < 0 && live.length && (!f.target || f.target.gone)) {
      let best = null, bd = 1e9;
      for (const fl of live) {
        if (fl.takers > 1 || (fl.state === 2 && soft)) continue;
        // Food on the sand is only worth it close by.
        const d = Math.hypot(fl.p[0] - f.p[0], fl.p[1] - f.p[1], fl.p[2] - f.p[2]) * (fl.state === 2 ? 2.5 : 1);
        if (d < bd) { bd = d; best = fl; }
      }
      if (best && bd < (best.state === 2 ? 30 : 70)) { f.target = best; best.takers++; }
    }
    if (f.target && (f.target.gone || f.fear > 0.35 || f.full >= 1)) { f.target.takers = Math.max(0, f.target.takers - 1); f.target = null; }
    let desired = S.cruise * f.quirk;
    if (f.target) {
      const fl = f.target, mouth = f.s * 0.45;
      const tx = fl.p[0] - (f.p[0] + f.dir[0] * mouth), ty = fl.p[1] - (f.p[1] + f.dir[1] * mouth), tz = fl.p[2] - (f.p[2] + f.dir[2] * mouth);
      const d = Math.hypot(tx, ty, tz);
      if (d < 0.6 + f.s * 0.08) {
        // A nip: the flake goes, the head jerks, the fish is a little fuller.
        fl.gone = 1e-3;
        f.target = null;
        f.nip = 0.18;
        f.curve += (Math.random() < 0.5 ? -1 : 1) * 0.2;
        f.full += 0.13;
        T.events.push({ type: 'nip', x: fl.p[0], y: fl.p[1], z: fl.p[2], top: fl.state === 0 });
      } else {
        desired = (d < 4 ? 6 + d * 2 : 13) * speedK;
        acc[0] += (tx / d * desired - f.v[0]) * 3.2;
        acc[1] += (ty / d * desired - f.v[1]) * 3.2;
        acc[2] += (tz / d * desired - f.v[2]) * 3.2;
      }
    }
    f.full = Math.max(0, f.full - dt * 0.004);

    // Home: each school drifts about the tank; afraid, it hides low at the back.
    const fear = f.fear;
    // The hiding place lies across the tank from the knuckle.
    const K = T.knock;
    const side = K ? (K[0] > f.p[0] ? -1 : 1) : 0;
    const hx = fear > 0.3 ? clamp(f.p[0] + side * 12, -halfW(BACK + 6) * 0.8, halfW(BACK + 6) * 0.8) : sc.home[0];
    const hy = fear > 0.3 ? S.band[0] + 2 : sc.home[1];
    const hz = fear > 0.3 ? BACK + 6 : sc.home[2];
    const hk = f.target ? 0.02 : 0.05 + fear * 0.25;
    acc[0] += (hx - f.p[0]) * hk; acc[1] += (hy - f.p[1]) * hk * 1.5; acc[2] += (hz - f.p[2]) * hk;

    // Walls: the glass, the sides of the view, the sand and the surface.
    const w = halfW(f.p[2]) - f.s * 0.6, lo = T.floor(f.p[0], f.p[2]) + 1.6, hi = f.target ? SURF - 0.35 : SURF - 2.5;
    const wall = (gap, k) => (gap < 6 ? (6 - gap) * (6 - gap) * k : 0);
    acc[0] += wall(w - f.p[0], -0.9) + wall(f.p[0] + w, 0.9);
    acc[1] += wall(f.p[1] - lo, 1.2) + wall(hi - f.p[1], -1.2);
    acc[2] += wall(f.p[2] - (BACK + 2), 0.9) + wall(GLASS - 3 - f.p[2], -0.9);
    // Plant clumps: fish weave round the stems.
    for (const c of T.clumps) {
      const dx = f.p[0] - c.x, dz = f.p[2] - c.z, d = Math.hypot(dx, dz), r = c.r * 1.1;
      if (d < r && f.p[1] < c.top) { const k = (r - d) / r * 18; acc[0] += dx / (d || 1) * k; acc[2] += dz / (d || 1) * k; }
    }

    // Burst and coast: tetras swim in short pushes.
    f.burst -= dt;
    if (f.burst < 0) { f.burst = rnd(0.5, 2.2); f.boost = rnd(0.25, 0.45); }
    f.boost = Math.max(0, f.boost - dt);
    const push = f.boost > 0 ? 1.7 : 0.85;
    // Afraid: fast nervous darts that slow as the fear fades.
    desired *= push * (1 + fear * 1.4);
    const sp = len3(f.v) || 1e-3;
    const gain = f.target ? 0 : 1.4;
    acc[0] += (f.v[0] / sp * desired - f.v[0]) * gain;
    acc[1] += (f.v[1] / sp * desired - f.v[1]) * gain - f.v[1] * 0.8;
    acc[2] += (f.v[2] / sp * desired - f.v[2]) * gain;
    // A cap on steering keeps turns smooth.
    const am = len3(acc), cap = (f.target ? 90 : 40) * (1 + fear) * speedK;
    if (am > cap) { acc[0] *= cap / am; acc[1] *= cap / am; acc[2] *= cap / am; }
    f.v[0] += acc[0] * dt; f.v[1] += acc[1] * dt; f.v[2] += acc[2] * dt;
    const vmax = (f.startle < 0 && fear > 0.5 ? 46 : 20) * speedK;
    const v = len3(f.v);
    if (v > vmax) f.v = f.v.map(c => c * vmax / v);
    // Tetras keep level: climbs and dives stay shallow.
    f.v[1] = clamp(f.v[1], -v * 0.55, v * 0.55);
    f.p[0] += f.v[0] * dt; f.p[1] += f.v[1] * dt; f.p[2] += f.v[2] * dt;
    f.p[1] = clamp(f.p[1], lo - 0.8, SURF - 0.3);
    f.p[2] = clamp(f.p[2], BACK + 1, GLASS - 1.5);

    // Heading follows velocity; a slow fish keeps its heading.
    const vs = len3(f.v);
    if (vs > 0.3) {
      const k = 1 - Math.exp(-dt * (4 + vs * 0.6));
      const nd = f.v.map(c => c / vs);
      for (let a = 0; a < 3; a++) f.dir[a] += (nd[a] - f.dir[a]) * k;
      const dl = len3(f.dir);
      f.dir = f.dir.map(c => c / dl);
    }
    // Tetras climb at a slant, never straight up.
    const hl = Math.hypot(f.dir[0], f.dir[2]);
    if (hl < 0.9) {
      const k = hl > 1e-3 ? 0.9 / hl : 0;
      f.dir = [k ? f.dir[0] * k : 0.9, Math.sign(f.dir[1]) * 0.436, k ? f.dir[2] * k : 0];
    }
    // Bank a little into turns.
    const turn = f.dir[0] * acc[2] - f.dir[2] * acc[0];
    f.roll += (clamp(-turn * 0.003, -0.3, 0.3) - f.roll) * Math.min(1, dt * 4);

    // Tail: the beat follows speed and push.
    const thrust = clamp((vs / (S.cruise * 1.5)) * (f.boost > 0 ? 1.3 : 0.7), 0.15, 2.5);
    f.phase = (f.phase + dt * TAU * (2.2 + thrust * 3.2)) % (TAU * 64);
    f.amp += (clamp(0.1 + thrust * 0.12, 0.08, 0.34) - f.amp) * Math.min(1, dt * 6);
    f.curve *= Math.exp(-dt * 7);
    f.nip = Math.max(0, f.nip - dt);
    f.fear = Math.max(0, f.fear - dt * (f.fear > 0.5 ? 0.12 : 0.2));
  }

  // Schools wander slowly; after a scare they come forward again.
  T.schools.forEach((sc, si) => {
    const S = SPECIES[si];
    sc.t -= dt;
    if (sc.t < 0) {
      sc.t = rnd(6, 14);
      const w = T.halfW(0) * 0.7;
      sc.home = [rnd(-w, w), rnd(S.band[0], S.band[1]), rnd(-6, GLASS - 8)];
    }
  });
  return busy(T);
}

// In flight: food in the water, or a fish still afraid.
// Flakes on the sand do not count: they rot at the ambient pace.
export function busy(T) {
  return T.flakes.some(fl => fl.state < 2) || T.fish.some(f => f.fear > 0.05 || f.startle >= 0 || (f.target && f.target.state < 2));
}
