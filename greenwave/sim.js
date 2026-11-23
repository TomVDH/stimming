// Green wave sim: one one-way avenue, three lanes, ten signalled crossings.
// Cars run the Intelligent Driver Model in their lane and stop for red.
// Each signal runs the same cycle, shifted by the offset times its place in the row.
// Metres; the avenue runs away from the camera along -z.

export const LANES = 3;
export const LANE_W = 3.3;
export const CROSSINGS = 10;
export const SPACING = 150;
// The first stop line, and where cars enter and leave.
export const Z0 = -60, Z_IN = 120, Z_OUT = Z0 - SPACING * (CROSSINGS - 1) - 260;
export const CROSS_W = 14;
// The signal cycle: avenue green, amber, then red while the side street runs.
export const CYCLE = 60, GREEN = 32, AMBER = 3;
// The speed the wave is timed for: 50 km/h.
export const V_WAVE = 13.9;
// Two seconds more than the travel time: a platoon pulls away from a stop.
export const IDEAL = (SPACING / V_WAVE + 2) % CYCLE;
export const MAX_CARS = 420, MAX_SIDE = 80;
const P = { T: 1.2, s0: 2.0, a: 1.6, b: 2.4 };
const SUB = 1 / 60;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Stop line of crossing i.
export const stopZ = i => Z0 - i * SPACING;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function makeSim() {
  const rand = rng(375);
  // Each lane: cars sorted front first (most negative z first).
  const lanes = Array.from({ length: LANES }, () => []);
  const side = [];
  let t = 0, nextId = 0, offset = IDEAL, flow = 0.55;
  const gates = Array.from({ length: LANES }, () => ({ acc: rand() }));
  const sideGates = Array.from({ length: CROSSINGS }, () => ({ acc: rand(), dir: rand() < 0.5 ? 1 : -1 }));
  const events = [];

  // The avenue's light at crossing i at time tt: 0 green, 1 amber, 2 red.
  function light(i, tt = t) {
    const ph = (((tt - i * offset) % CYCLE) + CYCLE) % CYCLE;
    return ph < GREEN ? 0 : ph < GREEN + AMBER ? 1 : 2;
  }
  // The side street runs while the avenue is red, after one second all-red.
  function sideLight(i, tt = t) {
    const ph = (((tt - i * offset) % CYCLE) + CYCLE) % CYCLE;
    return ph >= GREEN + AMBER + 1 && ph < CYCLE - AMBER - 1 ? 0 : ph >= CYCLE - AMBER - 1 && ph < CYCLE - 1 ? 1 : 2;
  }

  function makeCar(lane, z, v) {
    return {
      id: nextId++, lane, z, v, acc: 0,
      len: 4.2 + 0.7 * rand(),
      T: P.T * (0.9 + 0.2 * rand()), a: P.a * (0.85 + 0.3 * rand()),
      // Drivers aim a little over or under the limit.
      v0: V_WAVE * (0.96 + 0.1 * rand()),
      paint: Math.floor(rand() * 9), lamp: 0, braking: false, stop: 0, held: false, fade: 0, go: -1,
    };
  }

  // The next red stop line ahead of a car, as a gap; amber stops only a car that can stop.
  function stopGap(c) {
    for (let i = 0; i < CROSSINGS; i++) {
      const zs = stopZ(i);
      const d = c.z - c.len / 2 - zs;
      if (d < -0.5) continue;
      if (d > 220) return 1e9;
      const L = light(i);
      if (L === 0) {
        // A car that committed on amber keeps going.
        c.go = -1;
        continue;
      }
      if (L === 1) {
        if (c.go === i) continue;
        // On amber: stop if a firm brake does it, else go through.
        if (c.v * c.v / (2 * 3.4) < d) return d;
        c.go = i;
        continue;
      }
      if (c.go === i && d < 6) continue;
      return d;
    }
    return 1e9;
  }

  function sub(dt) {
    for (const lane of lanes) {
      for (let k = 0; k < lane.length; k++) {
        const c = lane[k], lead = lane[k - 1];
        let s = 1e9, vl = c.v;
        if (lead) { s = c.z - lead.z - (c.len + lead.len) / 2; vl = lead.v; }
        const sg = stopGap(c);
        let dv = c.v - vl;
        if (sg < s) { s = sg; dv = c.v; }
        const ss = P.s0 + Math.max(0, c.v * c.T + c.v * dv / (2 * Math.sqrt(c.a * P.b)));
        let a = c.a * (1 - (c.v / c.v0) ** 4 - (s < 1e8 ? (ss / Math.max(0.3, s)) ** 2 : 0));
        if (c.held || c.stop > 0) a = Math.min(a, c.v > 0.01 ? -7 : -c.v / dt);
        c.acc = clamp(a, -8, c.a);
      }
      for (const c of lane) {
        c.v = Math.max(0, c.v + c.acc * dt);
        c.z -= c.v * dt;
        if (c.stop > 0 && c.v < 0.05 && !c.held) c.stop -= dt / 0.8;
        const want = c.acc < -1.0 || c.v < 0.6 ? 1 : 0;
        if (want && !c.braking) events.push({ type: 'brake', id: c.id, z: c.z, lane: c.lane, hard: clamp(-c.acc / 6, 0, 1) });
        c.braking = !!want;
        c.lamp = want ? Math.min(1, c.lamp + dt / 0.06) : Math.max(0, c.lamp - dt / 0.2);
        c.fade = Math.min(1, c.fade + dt / 0.6);
      }
      while (lane.length && lane[0].z < Z_OUT) lane.shift();
    }
    // New cars come in at the camera end, in loose bunches.
    for (let l = 0; l < LANES; l++) {
      const g = gates[l], lane = lanes[l];
      g.acc += (0.12 + 0.36 * flow) * (0.8 + 0.4 * Math.sin(t * 0.21 + l * 2.1)) * dt;
      if (g.acc < 1) continue;
      const back = lane[lane.length - 1];
      if (back && back.z > Z_IN - back.len - 10) continue;
      g.acc = Math.min(g.acc - 1, 2);
      if (lanes.reduce((k, x) => k + x.length, 0) >= MAX_CARS) continue;
      lane.push(makeCar(l, Z_IN, back ? Math.min(back.v + 1, V_WAVE) : V_WAVE));
    }
    // Side-street cars: they cross when their light is green, for life in the picture.
    for (let i = 0; i < CROSSINGS; i++) {
      const g = sideGates[i];
      g.acc += 0.06 * dt * (0.5 + flow);
      if (g.acc >= 1 && side.length < MAX_SIDE) {
        g.acc -= 1;
        const dir = rand() < 0.5 ? 1 : -1;
        side.push({ id: nextId++, i, dir, x: -dir * 140, v: 11, len: 4.4, paint: Math.floor(rand() * 9), lamp: 0, fade: 0 });
      }
    }
    const kerb = LANES * LANE_W / 2 + 3;
    for (const c of side) {
      const L = sideLight(c.i);
      // Distance from the car's front to its stop line.
      const front = c.x + c.dir * c.len / 2, stopX = -c.dir * (kerb + 1), d = c.dir * (stopX - front);
      let s = 1e9;
      for (const o of side) if (o !== c && o.i === c.i && o.dir === c.dir && c.dir * (o.x - c.x) > 0) s = Math.min(s, c.dir * (o.x - c.x) - (o.len + c.len) / 2);
      if (L !== 0 && d > -0.5 && d < 120 && !(L === 1 && c.v * c.v / 6.8 > d)) s = Math.min(s, d);
      const ss = P.s0 + c.v * 1.2;
      const a = 1.6 * (1 - (c.v / 11) ** 4 - (s < 1e8 ? (ss / Math.max(0.3, s)) ** 2 : 0));
      c.v = Math.max(0, c.v + clamp(a, -8, 1.6) * dt);
      c.x += c.dir * c.v * dt;
      c.lamp = a < -1 || c.v < 0.6 ? Math.min(1, c.lamp + dt / 0.06) : Math.max(0, c.lamp - dt / 0.2);
      c.fade = Math.min(1, c.fade + dt / 0.6);
    }
    for (let k = side.length - 1; k >= 0; k--) if (Math.abs(side[k].x) > 150) side.splice(k, 1);
    t += dt;
  }

  // A first picture: the avenue already full of traffic.
  for (let k = 0; k < 240 * 60; k++) sub(SUB);
  events.length = 0;

  return {
    lanes, side,
    get t() { return t; },
    get offset() { return offset; },
    set offset(v) { offset = clamp(v, 0, CYCLE); },
    get flow() { return flow; },
    set flow(v) { flow = clamp(v, 0, 1); },
    light, sideLight,
    *cars() { for (const l of lanes) yield* l; },
    get stopped() { let n = 0; for (const l of lanes) for (const c of l) if (c.v < 1) n++; return n; },
    step(dt) { let left = dt; while (left > 1e-6) { const h = Math.min(SUB, left); sub(h); left -= h; } },
    brake(id, held) {
      for (const l of lanes) for (const c of l) if (c.id === id) { c.stop = 1; c.held = !!held; return c; }
      return null;
    },
    release(id) { for (const l of lanes) for (const c of l) if (c.id === id) { c.held = false; c.stop = Math.max(c.stop, 0.01); } },
    takeEvents() { return events.splice(0); },
  };
}
